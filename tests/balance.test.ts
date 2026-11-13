// Game balance checks, run with `bun test`. They guard the calibration of the 0-100 evaluation score:
// every mission, upgrade and data tier must stay reachable, and the first run must stay short.
import { describe, expect, test } from 'bun:test';
import { INITIAL_CONTRACTS, DATASET_TIER_CONFIGS, STARTER_TRAINING_DATASET, INITIAL_MODEL, INITIAL_RESEARCH_NODES, INITIAL_HARDWARE, INITIAL_DATA_SOURCES, FACILITY_TIERS } from '../src/utils/constants';
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
import type { GameState, ModelArchitecture, ContractGig, AgentInstance, GuardrailConfig } from '../src/types/game';
import { formatGameTime, GAME_HOURS_PER_TICK } from '../src/utils/training';
import { modelRequirementCheck, meetsModelRequirements, weakestTeamFactors } from '../src/utils/missionEvaluation';
import { HARDWARE_SPEC_NOTES } from '../src/utils/hardwareSpecs';
import { planTrainingRun, lossAt, vramForRun, sanitizeTrainingConfig, DEFAULT_TRAINING_CONFIG, MAX_EPOCHS, runConfigFor } from '../src/utils/trainingRun';
import { buildEpilogue, canAttemptContainment, endingTitle, CONTAINMENT_MAX_SUBVERSION } from '../src/utils/epilogue';
import { agentChatter, AGENT_DIALOGUE_ROLES, STORY_LINES_FOR_TESTS, COVERT_LINES_FOR_TESTS } from '../src/utils/agentDialogues';
import { researchStatus, isProgressionUnlocked, unlockHint } from '../src/utils/progression';

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

describe('one clock, hardware notes and mission evaluation', () => {
  test('a tick is 30 game minutes for everything; 48 ticks are a day', () => {
    expect(formatGameTime(1)).toBe('30 min');
    expect(formatGameTime(7)).toBe('3 h 30 min');
    expect(formatGameTime(48)).toBe('1 d');
    expect(formatGameTime(48 * 7 + 4)).toBe('7 d 2 h');
    expect(GAME_HOURS_PER_TICK * 48).toBe(24);
  });

  const model = (id: string, params: number, score: number, topology = 'transformer') =>
    ({ id, name: id, parametersCount: params, reasoningScore: score, topology, activeDataSources: [] }) as unknown as ModelArchitecture;
  const contract = { requiredParams: 100e6, requiredMinReasoning: 30, requiredTopology: undefined } as unknown as ContractGig;

  test('model requirements must be met by one model, on the board and at launch', () => {
    const split = modelRequirementCheck(contract, [model('big', 200e6, 10), model('smart', 10e6, 40)]);
    expect(meetsModelRequirements(split)).toBe(false);
    const one = modelRequirementCheck(contract, [model('small', 10e6, 10), model('both', 200e6, 35)]);
    expect(meetsModelRequirements(one)).toBe(true);
    expect(one.model?.id).toBe('both');
  });

  test('a failed mission reports the weakest capabilities first', () => {
    const agent = { id: 'a', role: 'researcher', modelId: 'm', alignmentScore: 90, inferenceParams: { temperature: 0.6, topP: 0.9, maxTokens: 512 } } as unknown as AgentInstance;
    const factors = weakestTeamFactors([agent], [model('m', 50e6, 20)], [], { constitutionalStrictness: 80, sandboxIsolation: 'container', outputFiltering: 'none', rewardHackingAudit: true, redTeamingFrequencySec: 60 } as GuardrailConfig);
    expect(factors.length).toBe(2);
    expect(factors[0].score).toBeLessThanOrEqual(factors[1].score);
  });

  test('fictional and estimated hardware is labelled', () => {
    expect(HARDWARE_SPEC_NOTES.quantum_photonic_asic.source).toBe('fiction');
    expect(HARDWARE_SPEC_NOTES.tpu_v5p_pod.source).toBe('estimate');
    expect(HARDWARE_SPEC_NOTES.gpu_h100_sxm5.precision).toBe('BF16 tensor');
  });
});

describe('research opens by stage, not by date (L-5)', () => {
  const byId = new Map(INITIAL_RESEARCH_NODES.map(n => [n.id, n]));

  test('every paper can be funded inside its version, before the next upgrade', () => {
    for (const node of INITIAL_RESEARCH_NODES) {
      const next = node.requiredVersion < 4 ? UPGRADE_SCORE[(node.requiredVersion + 1) as 2 | 3 | 4] : 100;
      expect(`${node.id}:${node.requiredScore < next}`).toBe(`${node.id}:true`);
    }
  });

  test('a prerequisite never asks for a later stage than the paper that needs it', () => {
    for (const node of INITIAL_RESEARCH_NODES) {
      for (const pre of node.prerequisites.map(id => byId.get(id)!)) {
        expect(pre.requiredVersion).toBeLessThanOrEqual(node.requiredVersion);
        expect(pre.requiredScore).toBeLessThanOrEqual(node.requiredScore);
      }
    }
  });

  test('the status combines version, best score and prerequisites', () => {
    const lora = byId.get('res_lora_peft')!;
    const base = { uiVersion: 1, currentModel: { ...INITIAL_MODEL, reasoningScore: 5 }, savedModels: [], researchTree: INITIAL_RESEARCH_NODES };
    expect(researchStatus(lora, base).scoreMet).toBe(false);
    const trained = { ...base, savedModels: [{ ...INITIAL_MODEL, reasoningScore: 20 }] };
    expect(researchStatus(lora, trained).scoreMet).toBe(true);
    expect(researchStatus(lora, trained).prerequisitesMet).toBe(false); // BPE not funded yet
    const withBpe = { ...trained, researchTree: INITIAL_RESEARCH_NODES.map(n => n.id === 'res_bpe_tokenizer' ? { ...n, unlocked: true } : n) };
    expect(researchStatus(lora, withBpe).available).toBe(true);
    expect(researchStatus(byId.get('res_moe_architecture')!, withBpe).versionMet).toBe(false);
  });
});

describe('difficulty', () => {
  test('beginner runs keep the default learning rate and batch, but their own epochs and early stopping', () => {
    const chosen = { epochs: 5, learningRate: 'very_high', batchSize: 'large', earlyStopping: false };
    const beginner = runConfigFor({ difficulty: 'beginner', trainingConfig: chosen });
    expect(beginner).toEqual({ epochs: 5, learningRate: 'balanced', batchSize: 'medium', earlyStopping: false });
    expect(runConfigFor({ difficulty: 'normal', trainingConfig: chosen }).learningRate).toBe('very_high');
  });
});

describe('items open by stage, not by date', () => {
  const tree = INITIAL_RESEARCH_NODES;
  const at = (uiVersion: number, unlocked: string[] = []) => ({
    uiVersion, singularityProgress: 100,
    researchTree: tree.map(n => ({ ...n, unlocked: unlocked.includes(n.id) }))
  });

  test('every locked item names a paper that exists', () => {
    const ids = new Set(tree.map(n => n.id));
    const items = [...INITIAL_HARDWARE, ...INITIAL_DATA_SOURCES, ...FACILITY_TIERS];
    for (const item of items) if (item.requiredResearchId) expect(`${item.id}:${ids.has(item.requiredResearchId)}`).toBe(`${item.id}:true`);
  });

  test('an item opens with its paper, or one version after the paper without it', () => {
    const rtx = INITIAL_HARDWARE.find(h => h.id === 'gpu_rtx4090')!; // needs LoRA, a v1 paper
    expect(isProgressionUnlocked(rtx, at(1))).toBe(false);
    expect(isProgressionUnlocked(rtx, at(1, ['res_lora_peft']))).toBe(true);
    expect(isProgressionUnlocked(rtx, at(2))).toBe(true);
    expect(unlockHint(rtx, at(1), 'en')).toMatch(/or reach a later version/);
  });

  test('last-version papers have no fallback, and the progress requirement still applies', () => {
    const quantum = INITIAL_HARDWARE.find(h => h.id === 'quantum_photonic_asic')!;
    expect(isProgressionUnlocked(quantum, at(4))).toBe(false);
    expect(unlockHint(quantum, at(4), 'es')).not.toMatch(/versión posterior/);
    expect(isProgressionUnlocked(quantum, { ...at(4, ['res_speculative_compute']), singularityProgress: 0 })).toBe(false);
  });
});
