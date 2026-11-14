// The cluster's compute budget: ledger, team proposal, cancelling a contract and autonomous contracts.
import './setup';
import { describe, expect, test } from 'bun:test';
import { DEFAULT_STATE, mergeGameState, SAVE_SCHEMA_VERSION } from '../src/persistence/saveState';
import { AGENT_COMPUTE_DEMAND_PFLOPS } from '../src/utils/constants';
import { COMPUTE } from '../src/utils/rules';
import { computeLedger, missionComputePflops, missionPowerKw, trainingSlowdown } from '../src/utils/computeLedger';
import { findAutonomousMission, proposeTeam } from '../src/utils/missionEvaluation';
import { cancelMissionState, missionTick, autonomyShareOf } from '../src/tick/missionTick';
import { trainingTick } from '../src/tick/trainingTick';
import { planTrainingRun, DEFAULT_TRAINING_CONFIG } from '../src/utils/trainingRun';
import type { ActiveGig, AgentInstance, ContractGig, GameState, ModelArchitecture, TrainingJob } from '../src/types/game';

const state = (over: Partial<GameState> = {}): GameState => ({ ...DEFAULT_STATE, ...over });
const gpu = (tflops: number) => DEFAULT_STATE.hardware.map(h => h.id === 'gpu_gtx1060' ? { ...h, count: 1, computeTflops: tflops } : { ...h, count: 0 });
const model = (id: string, params: number, score: number, over: Partial<ModelArchitecture> = {}): ModelArchitecture =>
  ({ ...DEFAULT_STATE.currentModel, id, name: id, parametersCount: params, reasoningScore: score, ...over });
const agent = (id: string, role: AgentInstance['role'], modelId: string, over: Partial<AgentInstance> = {}): AgentInstance =>
  ({ id, name: id, role, modelId, modelName: modelId, status: 'active', alignmentScore: 90, autonomyLevel: 1, revenuePerSec: 0, suspicionPerSec: 0, toolsGranted: [], lastThought: '', escapesAttempted: 0, inferenceParams: { temperature: 0.6, topP: 0.9, topK: 40, repetitionPenalty: 1.1, systemPrompt: '' }, autoMissionEnabled: true, ...over });
const contract = (id: string, over: Partial<ContractGig> = {}): ContractGig =>
  ({ ...DEFAULT_STATE.contracts.find(c => c.id === 'gig_v1_wiki_clean')!, id, title: id, requiredParams: 7_000_000, requiredMinReasoning: 10, suspicionRisk: 0, completed: false, ...over });
const gig = (over: Partial<ActiveGig> = {}): ActiveGig =>
  ({ contractId: 'c1', runId: 'r1', timeRemaining: 10, durationSeconds: 20, agentIds: ['a1'], progressPercent: 50, successProbability: 0.6, aiAssessmentStatus: 'complete', outcomeRoll: 0.1, computePflopsRequired: 0.001, powerKw: 0.05, ...over });
const base = { uiVersion: 1 as const, loanAudited: true };

describe('compute ledger', () => {
  test('a working agent costs compute in proportion to its model, with a floor', () => {
    expect(missionComputePflops([{ parametersCount: 14e6 }])).toBe(COMPUTE.missionAgentMinPflops);
    expect(missionComputePflops([{ parametersCount: 7e9 }])).toBeCloseTo(0.007, 6);
    expect(missionComputePflops([{ parametersCount: 14e6 }, { parametersCount: 7e9 }])).toBeCloseTo(0.0075, 6);
    expect(missionPowerKw(0.0001)).toBe(COMPUTE.missionMinKw);
  });

  test('agents and contracts take their share first; training gets what is left', () => {
    const s = state({ ...base, hardware: gpu(4.4), agents: [agent('a1', 'researcher', 'm'), agent('a2', 'researcher', 'm', { status: 'quarantined' })], activeGigs: [gig()], activeTraining: {} as TrainingJob });
    const l = computeLedger(s);
    expect(l.total).toBeCloseTo(0.0044, 6);
    expect(l.agents).toBeCloseTo(AGENT_COMPUTE_DEMAND_PFLOPS, 6); // the quarantined agent costs nothing
    expect(l.missions).toBeCloseTo(0.001, 6);
    expect(l.free).toBeCloseTo(0.0044 - 0.0002 - 0.001, 6);
    expect(l.training).toBeCloseTo(l.free, 9);
    expect(l.agents + l.missions + l.training).toBeCloseTo(l.total, 9);
    expect(computeLedger({ ...s, activeTraining: null }).training).toBe(0);
  });

  test('the parts never go negative and autonomous runs are counted apart', () => {
    const l = computeLedger(state({ ...base, hardware: gpu(1), agents: [], activeGigs: [gig({ computePflopsRequired: 0.002, isAutonomous: true }), gig({ runId: 'r2', computePflopsRequired: 0.003 })] }));
    expect(l.free).toBe(0);
    expect(l.used).toBeCloseTo(l.total, 9);
    expect(l.autonomous).toBeCloseTo(0.002, 9);
  });

  test('the university loan and temporary compute are part of the total', () => {
    expect(computeLedger(state({ uiVersion: 1, loanAudited: false, hardware: gpu(4.4), agents: [] })).total).toBeCloseTo(0.0244, 6);
    expect(computeLedger(state({ ...base, hardware: gpu(4.4), agents: [], borrowedComputePflops: 0.015, borrowedComputeSeconds: 5 })).total).toBeCloseTo(0.0194, 6);
    expect(computeLedger(state({ ...base, hardware: gpu(4.4), agents: [], borrowedComputePflops: 0.015, borrowedComputeSeconds: 0 })).total).toBeCloseTo(0.0044, 6);
  });

  test('a running contract slows the training run by its share of the compute', () => {
    const job = (): TrainingJob => {
      const plan = planTrainingRun({ currentScore: 5, parametersCount: 14e6, datasetTokens: 50e6, datasetQuality: 60, priorRunsOnDataset: 0, config: DEFAULT_TRAINING_CONFIG });
      return { active: true, modelId: 'm', modelName: 'm', currentEpoch: 1, totalEpochs: 1, currentLoss: 3, initialLoss: 3, perplexity: 20, gradientNorm: 1, progressPercent: 0, lossHistory: [3], valLossHistory: [3], plan, step: 0, tokensProcessed: 0, timeRemainingSeconds: null, totalTokens: plan.totalTokens } as TrainingJob;
    };
    const step = (gigs: ActiveGig[]) => trainingTick({ prev: state({ ...base, hardware: gpu(4.4), agents: [] }), activeTraining: job(), borrowedComputePflops: 0, agentComputeDemand: 0, currentActiveGigs: gigs, systemHeatCelsius: 40, powerTripSeconds: 0, singularityProgress: 0, reasoningIndex: 0, rand: () => 0.5 }).updatedTraining!.progressPercent;
    const alone = step([]);
    const withContract = step([gig({ computePflopsRequired: 0.0011 })]);
    expect(withContract).toBeLessThan(alone);
    expect(withContract / alone).toBeCloseTo(1 - 0.0011 / 0.0044, 1);
    const l = computeLedger(state({ ...base, hardware: gpu(4.4), agents: [], activeTraining: {} as TrainingJob }));
    expect(trainingSlowdown(l, 0.0011)).toBeCloseTo(0.25, 6);
  });
});

describe('team proposal', () => {
  const small = model('small', 14e6, 15);
  const big = model('big', 7e9, 40);
  const models = [small, big];

  test('takes one agent with the smallest model that qualifies', () => {
    const team = proposeTeam(contract('c'), [agent('b', 'researcher', 'big'), agent('s', 'researcher', 'small'), agent('s2', 'economist', 'small')], models, DEFAULT_STATE.dataSources);
    expect(team?.map(a => a.id)).toEqual(['s']);
  });

  test('covers the required roles and adds a qualifying model if the role agents lack one', () => {
    const c = contract('c', { requiredAgentRoles: ['arbitrageur', 'economist'], minimumAgents: 2, requiredParams: 1e9, requiredMinReasoning: 30 });
    const team = proposeTeam(c, [agent('arb', 'arbitrageur', 'small'), agent('eco', 'economist', 'small'), agent('res', 'researcher', 'big')], models, DEFAULT_STATE.dataSources);
    expect(team?.map(a => a.id).sort()).toEqual(['arb', 'eco', 'res']);
  });

  test('returns nothing when a role, a model or a free agent is missing', () => {
    expect(proposeTeam(contract('c', { requiredAgentRoles: ['overseer'] }), [agent('s', 'researcher', 'small')], models, DEFAULT_STATE.dataSources)).toBeNull();
    expect(proposeTeam(contract('c', { requiredMinReasoning: 90 }), [agent('s', 'researcher', 'small')], models, DEFAULT_STATE.dataSources)).toBeNull();
    expect(proposeTeam(contract('c'), [agent('s', 'researcher', 'small', { status: 'on_mission' })], models, DEFAULT_STATE.dataSources)).toBeNull();
  });
});

describe('cancelling a contract', () => {
  const c1 = contract('c1', { suspicionRisk: 40, rewardCredits: 500 });
  const running = state({ ...base, credits: 100, watchdogSuspicion: 10, activePowerKw: 0.5, contracts: [c1], agents: [agent('a1', 'researcher', 'm', { status: 'on_mission' }), agent('a2', 'researcher', 'm')], activeGigs: [gig({ progressPercent: 50 })] });

  test('frees the team and the compute, pays nothing, and the contract can be launched again', () => {
    const r = cancelMissionState(running, 'r1')!;
    expect(r.state.activeGigs).toEqual([]);
    expect(r.state.activeGig).toBeNull();
    expect(r.state.agents.map(a => a.status)).toEqual(['active', 'active']);
    expect(r.state.credits).toBe(100);
    expect(computeLedger(r.state).missions).toBe(0);
    expect(r.state.activePowerKw).toBeCloseTo(0.45, 6);
    const again = r.state.contracts.find(c => c.id === 'c1')!;
    expect(again.completed).toBe(false);
    expect(again.lastAttemptFailed ?? false).toBe(false);
    expect(again.failureCount ?? 0).toBe(0);
    expect(r.state.lastMissionOutcome).toBe(running.lastMissionOutcome);
  });

  test('costs suspicion: a quarter of the risk times the share of the run done', () => {
    expect(cancelMissionState(running, 'r1')!.suspicionAdded).toBe(5); // 40 × 0.25 × 0.5
    expect(cancelMissionState(running, 'r1')!.state.watchdogSuspicion).toBe(15);
    expect(cancelMissionState({ ...running, activeGigs: [gig({ progressPercent: 0 })] }, 'r1')!.suspicionAdded).toBe(0);
    expect(cancelMissionState({ ...running, difficulty: 'beginner' }, 'r1')!.suspicionAdded).toBe(3);
  });

  test('an unknown run changes nothing', () => {
    expect(cancelMissionState(running, 'nope')).toBeNull();
  });
});

describe('autonomous contracts', () => {
  const small = model('small', 14e6, 15);
  const contracts = [contract('c1', { rewardCredits: 300 }), contract('c2', { rewardCredits: 200 }), contract('c3', { rewardCredits: 100 })];
  const bots = [agent('a1', 'researcher', 'small'), agent('a2', 'researcher', 'small'), agent('a3', 'researcher', 'small'), agent('a4', 'researcher', 'small')];
  const tick = (prev: GameState) => {
    const total = computeLedger(prev).total;
    return missionTick({
      prev, activeTraining: null, contracts: prev.contracts, detentionSeconds: 0, effectivePowerKw: 0.3,
      metrics: { totalComputePflops: total, activePowerKw: 0.3, maxPowerKw: 10, maxCoolingKw: 10 }, powerTripSeconds: 0, totalComputePflops: total,
      completedContractsCount: 0, credits: 0, singularityProgress: 1, tutorialCompleted: true, tutorialStep: 5, watchdogSuspicion: 0, rand: () => 0.5, now: 1
    });
  };
  const start = (share: number, tflops = 10) => state({ ...base, hardware: gpu(tflops), savedModels: [small], contracts, agents: bots, autonomyEnabled: true, autonomyRiskLimit: 50, autonomyComputeShare: share, activeGigs: [] });
  const advance = (prev: GameState): GameState => { const r = tick(prev); return { ...prev, activeGigs: r.updatedGigs, agents: r.updatedAgents, contracts: r.updatedContracts }; };

  test('several contracts run in parallel, one new launch per tick, each with its own small team', () => {
    const one = advance(start(50));
    expect(one.activeGigs!.length).toBe(1);
    expect(one.activeGigs![0].agentIds).toEqual(['a1']);
    expect(one.activeGigs![0].contractId).toBe('c1'); // best paying first
    const two = advance(one);
    expect(two.activeGigs!.length).toBe(2);
    expect(new Set(two.activeGigs!.flatMap(g => g.agentIds)).size).toBe(2);
    expect(two.activeGigs!.every(g => g.isAutonomous)).toBe(true);
    expect(two.agents.filter(a => a.status === 'on_mission').length).toBe(2);
  });

  test('the bots stay inside the compute share the player gave them', () => {
    // 10 TFLOPS, 10 % = 1 TFLOPS: two contracts of 0.5 TFLOPS fit, a third does not.
    let s = start(10);
    for (let i = 0; i < 5; i++) s = advance(s);
    expect(s.activeGigs!.length).toBe(2);
    expect(computeLedger(s).autonomous).toBeLessThanOrEqual(computeLedger(s).total * 0.10 + 1e-12);
    expect(advance(start(0)).activeGigs!.length).toBe(0);
  });

  test('they never take more than the cluster has free', () => {
    // 1 TFLOPS in total; four agents on standby take 0.8, so 0.2 is free: no contract fits.
    expect(advance(start(100, 1)).activeGigs!.length).toBe(0);
    const plan = findAutonomousMission(contracts, bots, [small], DEFAULT_STATE.dataSources, 50, 0.0005, 0.0004, 0.3, 10);
    expect(plan).toBeNull(); // the budget left is smaller than the contract
  });

  test('the share has a default and is clamped', () => {
    expect(autonomyShareOf({ autonomyComputeShare: undefined as unknown as number })).toBe(COMPUTE.autonomyDefaultShare);
    expect(autonomyShareOf({ autonomyComputeShare: 250 })).toBe(100);
  });
});

describe('save schema 12', () => {
  test('older saves get the default autonomy share; bad values are clamped', () => {
    expect(SAVE_SCHEMA_VERSION).toBe(12);
    expect(mergeGameState({ saveSchemaVersion: 11 } as Partial<GameState>, DEFAULT_STATE).autonomyComputeShare).toBe(COMPUTE.autonomyDefaultShare);
    expect(mergeGameState({ autonomyComputeShare: 180 } as Partial<GameState>, DEFAULT_STATE).autonomyComputeShare).toBe(100);
    expect(mergeGameState({ autonomyComputeShare: 45 } as Partial<GameState>, DEFAULT_STATE).autonomyComputeShare).toBe(45);
  });
});
