// Missions written by the language model are checked before they reach the board (L-6).
import { describe, expect, test } from 'bun:test';
import { sanitizeGeneratedContract, PROCEDURAL_CONTRACT_TEMPLATES } from '../src/services/aiService';
import { reasoningCeilingFor } from '../src/utils/training';

const loose = { maxReasoning: 100, maxParams: Number.MAX_SAFE_INTEGER };
const tier1 = PROCEDURAL_CONTRACT_TEMPLATES.tier1_micro;

describe('generated contracts', () => {
  test('rewards, sizes, durations and risk stay inside the tier ranges', () => {
    const c = sanitizeGeneratedContract({
      title: 'Exploit', rewardCredits: 1e12, requiredParams: 9e15, requiredMinReasoning: 999,
      durationSeconds: -5, suspicionRisk: 500
    }, 'tier1_micro', 'en', 'x', loose)!;
    expect(c.rewardCredits).toBeLessThanOrEqual(Math.max(...tier1.map(t => t.baseReward)) * 1.5);
    expect(c.requiredParams).toBeLessThanOrEqual(Math.max(...tier1.map(t => t.params)));
    expect(c.durationSeconds).toBeGreaterThanOrEqual(15);
    expect(c.suspicionRisk).toBeLessThanOrEqual(80);
  });

  test('the score asked for is always reachable by a model of the required size', () => {
    for (const tier of Object.keys(PROCEDURAL_CONTRACT_TEMPLATES) as (keyof typeof PROCEDURAL_CONTRACT_TEMPLATES)[]) {
      const c = sanitizeGeneratedContract({ requiredMinReasoning: 100, requiredParams: 1 }, tier, 'en', 'x', loose)!;
      expect(c.requiredMinReasoning).toBeLessThan(reasoningCeilingFor(c.requiredParams));
    }
  });

  test('the player constraints are respected', () => {
    const c = sanitizeGeneratedContract({ requiredMinReasoning: 90, requiredParams: 9e12 }, 'tier1_micro', 'en', 'x', { maxReasoning: 12, maxParams: 20_000_000 })!;
    expect(c.requiredMinReasoning).toBeLessThanOrEqual(12);
    expect(c.requiredParams).toBeLessThanOrEqual(Math.max(20_000_000, Math.min(...tier1.map(t => t.params))));
  });

  test('unknown topologies, data types, roles and non-https links are dropped', () => {
    const c = sanitizeGeneratedContract({
      requiredTopology: 'skynet', requiredDataTypes: ['relational_sql', 'mind_control'],
      requiredAgentRoles: ['researcher', 'wizard'], docsUrl: 'javascript:alert(1)'
    }, 'tier2_corporate', 'es', 'x', loose)!;
    expect(c.requiredTopology).toBeUndefined();
    expect(c.requiredDataTypes).toEqual(['relational_sql']);
    expect(c.requiredAgentRoles).toEqual(['researcher']);
    expect(c.docsUrl.startsWith('https://')).toBe(true);
    expect(c.title.length).toBeGreaterThan(0); // missing title falls back to a catalog text
  });

  test('anything that is not an object is rejected', () => {
    for (const bad of [null, 'mission', 42, ['a']]) expect(sanitizeGeneratedContract(bad, 'tier1_micro', 'en', 'x', loose)).toBeNull();
  });
});
