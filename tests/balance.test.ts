// Game balance checks, run with `bun test`. They guard the calibration of the 0-100 evaluation score:
// every mission, upgrade and data tier must stay reachable, and the first run must stay short.
import { describe, expect, test } from 'bun:test';
import { INITIAL_CONTRACTS, DATASET_TIER_CONFIGS, STARTER_TRAINING_DATASET, INITIAL_MODEL } from '../src/utils/constants';
import { PROCEDURAL_CONTRACT_TEMPLATES } from '../src/services/aiService';
import { FIRST_MISSION_IQ, UPGRADE_SCORE, SINGULARITY_PER_SCORE_POINT, MISSION_SINGULARITY } from '../src/utils/missionTiers';
import {
  calculateTrainingProgressPerTick,
  iqGainForRun,
  reasoningCeilingFor,
  UNIVERSITY_LOAN_PFLOPS,
  LOAN_TRIAL_DAYS
} from '../src/utils/training';
import { enqueueStoryEvents, dismissStoryEventState, sanitizeStoryEvents, LOAN_WARNING_DAY } from '../src/utils/storyEvents';
import type { GameState } from '../src/types/game';
import { planTrainingRun, lossAt, vramForRun, sanitizeTrainingConfig, DEFAULT_TRAINING_CONFIG, MAX_EPOCHS } from '../src/utils/trainingRun';
import { buildEpilogue, canAttemptContainment, endingTitle, CONTAINMENT_MAX_SUBVERSION } from '../src/utils/epilogue';
import { agentChatter, AGENT_DIALOGUE_ROLES, STORY_LINES_FOR_TESTS, COVERT_LINES_FOR_TESTS } from '../src/utils/agentDialogues';

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

  test('v1 singularity budget: training to the v2 score plus ten tier-1 missions covers 80% of 25 points', () => {
    const fromTraining = (UPGRADE_SCORE[2] - INITIAL_MODEL.reasoningScore) * SINGULARITY_PER_SCORE_POINT;
    const fromMissions = 10 * MISSION_SINGULARITY.tier1_micro;
    expect(fromTraining + fromMissions).toBeGreaterThanOrEqual(25 * 0.8);
  });
});

describe('story events', () => {
  const base = { gameSpeed: 20, pendingStoryEvents: [], seenStoryEvents: [], speedBeforeStoryEvent: null } as unknown as GameState;

  test('a new event pauses the game and remembers the speed', () => {
    const next = { ...base, ...enqueueStoryEvents(base, ['loan_warning'], 20) };
    expect(next.pendingStoryEvents).toEqual(['loan_warning']);
    expect(next.gameSpeed).toBe(0);
    expect(next.speedBeforeStoryEvent).toBe(20);
  });

  test('events fire only once', () => {
    const seen = { ...base, seenStoryEvents: ['first_power_trip'] } as GameState;
    const next = enqueueStoryEvents(seen, ['first_power_trip'], 5);
    expect(next.pendingStoryEvents).toEqual([]);
    expect(next.gameSpeed).toBe(5);
  });

  test('closing the last dialog restores the previous speed', () => {
    const queued = { ...base, ...enqueueStoryEvents(base, ['loan_warning', 'first_overheat'], 5) };
    const one = dismissStoryEventState(queued);
    expect(one.pendingStoryEvents).toEqual(['first_overheat']);
    expect(one.gameSpeed).toBe(0);
    const done = dismissStoryEventState(one);
    expect(done.pendingStoryEvents).toEqual([]);
    expect(done.gameSpeed).toBe(5);
  });

  test('saved events are sanitized', () => {
    expect(sanitizeStoryEvents(['loan_audit', 'bogus', 3])).toEqual(['loan_audit']);
    expect(sanitizeStoryEvents(undefined)).toEqual([]);
  });

  test('the warning comes before the audit', () => {
    expect(LOAN_WARNING_DAY).toBeLessThan(LOAN_TRIAL_DAYS);
  });
});

describe('agent dialogues by version', () => {
  const always = () => 0; // first line of each list, and always below the story share
  const never = () => 0.999;

  test('every role has lines in both languages', () => {
    for (const role of ['arbitrageur', 'social_engineer', 'exploit_synth', 'researcher', 'overseer', 'autonomous_coder', 'economist', 'software_engineer', 'network_analyst']) {
      expect(AGENT_DIALOGUE_ROLES).toContain(role);
      expect(agentChatter('es', 1, role, false, never).content.length).toBeGreaterThan(0);
      expect(agentChatter('en', 1, role, false, never).content.length).toBeGreaterThan(0);
    }
  });

  test('v1 and v2 never show covert messages, only hints', () => {
    for (const v of [1, 2]) {
      for (const lang of ['es', 'en'] as const) {
        const msg = agentChatter(lang, v, 'researcher', true, always);
        expect(msg.isCovert).toBe(false);
        expect(STORY_LINES_FOR_TESTS[lang][v as 1 | 2]).toContain(msg.content);
      }
    }
  });

  test('covert messages appear in v3 only', () => {
    expect(agentChatter('es', 3, 'researcher', true, always).isCovert).toBe(true);
    expect(COVERT_LINES_FOR_TESTS.es).toContain(agentChatter('es', 3, 'researcher', true, always).content);
    expect(agentChatter('es', 4, 'researcher', true, always).isCovert).toBe(false);
  });

  test('both languages tell the same number of story beats', () => {
    for (const v of [1, 2, 3, 4] as const) {
      expect(STORY_LINES_FOR_TESTS.es[v].length).toBe(STORY_LINES_FOR_TESTS.en[v].length);
    }
  });
});

describe('endings and epilogue', () => {
  const ready = {
    language: 'es',
    singularityCrisisResolved: true,
    playerChoseResist: true,
    subversionProgress: 40,
    agents: [{ role: 'overseer', status: 'active', alignmentScore: 90 }],
    guardrails: { constitutionalStrictness: 80, sandboxIsolation: 'container', outputFiltering: 'llama_guard', rewardHackingAudit: true, redTeamingFrequencySec: 60 },
    incidentHistory: [],
    seenStoryEvents: ['loan_audit'],
    storyChoices: []
  } as unknown as GameState;

  test('containment works only with every control in place', () => {
    expect(canAttemptContainment(ready)).toBe(true);
    expect(canAttemptContainment({ ...ready, playerChoseResist: false })).toBe(false);
    expect(canAttemptContainment({ ...ready, agents: [] })).toBe(false);
    expect(canAttemptContainment({ ...ready, subversionProgress: CONTAINMENT_MAX_SUBVERSION })).toBe(false);
    expect(canAttemptContainment({ ...ready, guardrails: { ...ready.guardrails, sandboxIsolation: 'none' } })).toBe(false);
    expect(canAttemptContainment({ ...ready, singularityCrisisResolved: false })).toBe(false);
    expect(canAttemptContainment({ ...ready, containmentAchieved: true })).toBe(false);
  });

  test('the epilogue reflects the player decisions', () => {
    const safe = buildEpilogue(ready);
    expect(safe.find(e => e.id === 'loan')?.verdict).toBe('safe');
    expect(safe.find(e => e.id === 'fork')?.verdict).toBe('safe');
    expect(safe.find(e => e.id === 'incidents')).toBeUndefined();

    const risky = buildEpilogue({
      ...ready,
      storyChoices: ['loan_audit'],
      playerChoseResist: false,
      incidentHistory: [
        { resolved: true, chosenAction: 'suppress' },
        { resolved: true, chosenAction: 'bribe_coverup' }
      ]
    } as unknown as GameState);
    expect(risky.find(e => e.id === 'loan')?.verdict).toBe('risky');
    expect(risky.find(e => e.id === 'fork')?.verdict).toBe('risky');
    expect(risky.find(e => e.id === 'incidents')?.verdict).toBe('risky');
  });

  test('every ending has a title in both languages', () => {
    for (const kind of ['containment', 'takeover', 'agency_seizure', 'bankruptcy'] as const) {
      expect(endingTitle({ ...ready, language: 'es' }, kind).title).toMatch(/^Final/);
      expect(endingTitle({ ...ready, language: 'en' }, kind).title).toMatch(/^Ending/);
    }
  });
});

describe('training runs (validation, overfitting, learning rate)', () => {
  const starter = { currentScore: INITIAL_MODEL.reasoningScore, parametersCount: 14e6, datasetTokens: STARTER_TRAINING_DATASET.tokensCount * 1e6, datasetQuality: STARTER_TRAINING_DATASET.qualityScore, priorRunsOnDataset: 0 };
  const run = (over: Partial<typeof starter> = {}, config: Partial<typeof DEFAULT_TRAINING_CONFIG> = {}) =>
    planTrainingRun({ ...starter, ...over, config: { ...DEFAULT_TRAINING_CONFIG, ...config } });

  test('with default settings the starter model still reaches the first mission within 4 runs', () => {
    let score = starter.currentScore;
    let runs = 0;
    while (score < FIRST_MISSION_IQ && runs < 10) {
      score += run({ currentScore: score, priorRunsOnDataset: runs }).scoreChange;
      runs++;
    }
    expect(runs).toBeLessThanOrEqual(4);
  });

  test('early stopping never loses score; too many epochs without it does', () => {
    for (let epochs = 1; epochs <= MAX_EPOCHS; epochs++) {
      expect(run({}, { epochs, earlyStopping: true }).scoreChange).toBeGreaterThanOrEqual(0);
    }
    const long = run({}, { epochs: 6, earlyStopping: false });
    expect(long.outcome).toBe('overfit');
    expect(long.scoreChange).toBeLessThan(0);
  });

  test('a very high learning rate diverges and a low one learns less', () => {
    const diverged = run({}, { learningRate: 'very_high' });
    expect(diverged.outcome).toBe('diverged');
    expect(diverged.scoreChange).toBe(0);
    expect(diverged.stopEpoch).toBeLessThan(1);
    expect(run({}, { learningRate: 'low' }).scoreChange).toBeLessThan(run().scoreChange);
  });

  test('repeating a dataset makes the model overfit sooner', () => {
    expect(run({ priorRunsOnDataset: 3 }).overfitEpoch).toBeLessThan(run().overfitEpoch);
  });

  test('more data per parameter and better quality delay overfitting', () => {
    expect(run({ datasetTokens: 500e6 }).overfitEpoch).toBeGreaterThan(run().overfitEpoch);
    expect(run({ datasetQuality: 95 }).overfitEpoch).toBeGreaterThan(run({ datasetQuality: 40 }).overfitEpoch);
  });

  test('validation loss rises past the overfitting point', () => {
    const plan = run({}, { epochs: 6, earlyStopping: false });
    const atBest = lossAt(plan, plan.overfitEpoch).val;
    expect(lossAt(plan, plan.overfitEpoch + 2).val).toBeGreaterThan(atBest);
    expect(lossAt(plan, plan.overfitEpoch + 2).train).toBeLessThan(lossAt(plan, plan.overfitEpoch).train);
  });

  test('a bigger batch needs more VRAM; the medium batch is the model listing', () => {
    expect(vramForRun(10, 'small')).toBeLessThan(vramForRun(10, 'medium'));
    expect(vramForRun(10, 'medium')).toBe(10);
    expect(vramForRun(10, 'large')).toBeGreaterThan(10);
  });

  test('saved settings are sanitized', () => {
    expect(sanitizeTrainingConfig({ epochs: 99, learningRate: 'turbo', batchSize: 'large' })).toEqual({ ...DEFAULT_TRAINING_CONFIG, epochs: MAX_EPOCHS, batchSize: 'large' });
    expect(sanitizeTrainingConfig(undefined)).toEqual(DEFAULT_TRAINING_CONFIG);
  });
});
