// Game content texts (hardware, data, research, contracts, domains, incidents) read from the catalog by id.
import { describe, expect, test } from 'bun:test';
import { en } from '../src/i18n/en';
import { es } from '../src/i18n/es';
import {
  INITIAL_CONTRACTS,
  INITIAL_DATA_SOURCES,
  INITIAL_HARDWARE,
  INITIAL_RESEARCH_NODES,
  REAL_WORLD_BREACH_TEMPLATES,
  SENTIENCE_DOMAINS
} from '../src/utils/constants';
import {
  localizedBreachIncident,
  localizedContract,
  localizedContractTitle,
  localizedHardware,
  localizedResearch
} from '../src/utils/gameContentI18n';
import type { BreachIncident } from '../src/types/game';

const incidentFrom = (i: number, overrides: Partial<BreachIncident> = {}): BreachIncident => ({
  ...REAL_WORLD_BREACH_TEMPLATES[i],
  id: 'incident_1',
  agentId: 'a',
  agentName: 'A',
  modelName: 'M',
  timestamp: '00:00:00',
  resolved: false,
  ...overrides
});

describe('game content texts', () => {
  test('every content key belongs to an existing item', () => {
    const ids: Record<string, Set<string>> = {
      hardware: new Set(INITIAL_HARDWARE.map(h => h.id)),
      dataSource: new Set(INITIAL_DATA_SOURCES.map(d => d.id)),
      research: new Set(INITIAL_RESEARCH_NODES.map(r => r.id)),
      contract: new Set(INITIAL_CONTRACTS.map(c => c.id)),
      domain: new Set(SENTIENCE_DOMAINS.map(d => d.id)),
      breach: new Set(REAL_WORLD_BREACH_TEMPLATES.map(t => t.templateId as string))
    };
    const orphans = Object.keys(en).filter(k => k.startsWith('content.')).filter(k => {
      const [, kind, id] = k.split('.');
      return !ids[kind]?.has(id);
    });
    expect(orphans).toEqual([]);
  });

  test('the English data is the catalog English, and Spanish replaces it by id', () => {
    const gpu = INITIAL_HARDWARE[0];
    expect(gpu.description).toBe(en[`content.hardware.${gpu.id}.description` as keyof typeof en]);
    expect(localizedHardware('es', gpu).description).toBe(es[`content.hardware.${gpu.id}.description` as keyof typeof es]);
    expect(localizedHardware('es', gpu).price).toBe(gpu.price);
    const node = INITIAL_RESEARCH_NODES[0];
    expect(localizedResearch('es', node).title).not.toBe(node.title);
  });

  test('a saved item with an old text shows the current one, in either language', () => {
    const contract = { ...INITIAL_CONTRACTS[0], title: 'Old saved title' };
    expect(localizedContract('en', contract).title).toBe(INITIAL_CONTRACTS[0].title);
    expect(localizedContractTitle('es', contract)).toBe(es[`content.contract.${contract.id}.title` as keyof typeof es]);
  });

  test('items created at runtime keep their own text', () => {
    const dynamic = { ...INITIAL_CONTRACTS[0], id: 'contract_dynamic_123', title: 'Council proposal' };
    expect(localizedContract('es', dynamic).title).toBe('Council proposal');
  });

  test('incidents are localized by template, including saves from before templateId', () => {
    const current = localizedBreachIncident('es', incidentFrom(0));
    expect(current.title).toBe(es['content.breach.taskrabbit.title']);
    expect(current.options[0].label).toBe(es['content.breach.taskrabbit.opt_suppress.label']);
    expect(current.options[0].costCredits).toBe(REAL_WORLD_BREACH_TEMPLATES[0].options[0].costCredits);
    const legacy = localizedBreachIncident('es', incidentFrom(1, { templateId: undefined }));
    expect(legacy.title).toBe(es['content.breach.sleeper_agent.title']);
    const unknown = incidentFrom(2, { templateId: undefined, title: 'Something else' });
    expect(localizedBreachIncident('es', unknown)).toEqual(unknown);
  });
});
