// Game balance checks, run with `bun test`. They guard the calibration of the 0-100 evaluation score:
// every mission, upgrade and data tier must stay reachable, and the first run must stay short.
import { describe, expect, test } from 'bun:test';
import { INITIAL_CONTRACTS, DATASET_TIER_CONFIGS, STARTER_TRAINING_DATASET, INITIAL_MODEL } from '../src/utils/constants';
import { PROCEDURAL_CONTRACT_TEMPLATES } from '../src/services/aiService';
import { FIRST_MISSION_IQ, UPGRADE_SCORE } from '../src/utils/missionTiers';
import {
  calculateTrainingProgressPerTick,
  iqGainForRun,
  reasoningCeilingFor,
  UNIVERSITY_LOAN_PFLOPS
} from '../src/utils/training';

const STARTER_GPU_PFLOPS = 0.0044; // GTX 1060

// Best score a model of this size reaches with compute-optimal data (20 tokens per parameter).
function reachableScore(params: number, start = INITIAL_MODEL.reasoningScore): number {
  let score = start;
  for (let run = 0; run < 1000; run++) {
    const gain = iqGainForRun({ currentIq: score, parametersCount: params, tokensCount: params * 20 });
    if (gain <= 0) break;
    score += gain;
  }
  return score;
}

function runsToReach(target: number, params: number, tokens: number, start: number): number {
  let score = start;
  let runs = 0;
  while (score < target && runs < 100) {
    const gain = iqGainForRun({ currentIq: score, parametersCount: params, tokensCount: tokens });
    if (gain <= 0) return Infinity;
    score += gain;
    runs++;
  }
  return runs;
}

describe('evaluation score scale', () => {
  test('ceilings stay within 0-100 and grow with model size', () => {
    const sizes = [7e6, 14e6, 100e6, 1e9, 25e9, 500e9];
    const ceilings = sizes.map(reasoningCeilingFor);
    ceilings.forEach(c => {
      expect(c).toBeGreaterThan(0);
      expect(c).toBeLessThan(100);
    });
    for (let i = 1; i < ceilings.length; i++) expect(ceilings[i]).toBeGreaterThan(ceilings[i - 1]);
  });

  test('training stops helping near the ceiling', () => {
    const params = 14e6;
    const nearCeiling = reasoningCeilingFor(params) - 0.3;
    expect(iqGainForRun({ currentIq: nearCeiling, parametersCount: params, tokensCount: params * 20 })).toBe(0);
  });
});

describe('missions are reachable', () => {
  test.each(INITIAL_CONTRACTS.map(c => [c.id, c.requiredParams, c.requiredMinReasoning] as const))(
    '%s',
    (_id, params, required) => {
      expect(required).toBeLessThanOrEqual(reachableScore(params));
    }
  );

  test('procedural mission templates', () => {
    for (const templates of Object.values(PROCEDURAL_CONTRACT_TEMPLATES)) {
      for (const t of templates) expect(t.reasoning).toBeLessThanOrEqual(reachableScore(t.params));
    }
  });

  test('data scraping tiers', () => {
    for (const tier of Object.values(DATASET_TIER_CONFIGS)) {
      expect(tier.minModelIQ).toBeLessThanOrEqual(reachableScore(tier.minModelParams));
    }
  });
});

describe('progression', () => {
  test('UI upgrades are reachable with the architecture of their stage', () => {
    expect(UPGRADE_SCORE[2]).toBeLessThanOrEqual(reachableScore(28e6));
    expect(UPGRADE_SCORE[3]).toBeLessThanOrEqual(reachableScore(250e6));
    expect(UPGRADE_SCORE[4]).toBeLessThanOrEqual(reachableScore(1e9));
  });

  test('the starter model reaches the first mission within 4 runs on the starter corpus', () => {
    const runs = runsToReach(FIRST_MISSION_IQ, 14e6, STARTER_TRAINING_DATASET.tokensCount * 1e6, INITIAL_MODEL.reasoningScore);
    expect(runs).toBeLessThanOrEqual(4);
  });

  test('a first run with the university loan lasts between 5 and 15 ticks', () => {
    const perTick = calculateTrainingProgressPerTick({
      parametersCount: 14e6,
      tokensCount: STARTER_TRAINING_DATASET.tokensCount * 1e6,
      gpuPflops: STARTER_GPU_PFLOPS,
      borrowedPflops: UNIVERSITY_LOAN_PFLOPS,
      agentComputeDemand: 0,
      reservedComputePflops: 0,
      systemHeatCelsius: 35
    });
    const ticks = 100 / perTick;
    expect(ticks).toBeGreaterThanOrEqual(5);
    expect(ticks).toBeLessThanOrEqual(15);
  });
});
