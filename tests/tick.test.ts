// Pure tick steps (src/tick/), run with `bun test`.
import { describe, expect, test } from 'bun:test';
import { DEFAULT_STATE } from '../src/persistence/saveState';
import { calendarTick } from '../src/tick/calendarTick';
import { thermalTick } from '../src/tick/thermalTick';
import { trainingTick } from '../src/tick/trainingTick';
import { scrapeTick } from '../src/tick/scrapeTick';
import { planTrainingRun, DEFAULT_TRAINING_CONFIG } from '../src/utils/trainingRun';
import { DAYS_PER_GAME_MONTH } from '../src/utils/constants';
import type { GameState, TrainingJob, ActiveGig, AgentInstance } from '../src/types/game';
import { missionTick } from '../src/tick/missionTick';
import { agentTick } from '../src/tick/agentTick';
import { tradingTick } from '../src/tick/tradingTick';

const state = (over: Partial<GameState> = {}): GameState => ({ ...DEFAULT_STATE, ...over });
const logs = (effects: { kind: string }[]) => effects.filter(e => e.kind === 'log').length;

describe('calendar tick', () => {
  test('half an hour passes; the 48th tick closes the day', () => {
    const mid = calendarTick({ prev: state({ dayTicks: 10, campaignDays: 2 }), credits: 100, utilityDebt: 0, effectivePowerKw: 0.5 });
    expect(mid.nextDayTicks).toBe(11);
    expect(mid.dayIsComplete).toBe(false);
    const end = calendarTick({ prev: state({ dayTicks: 47, campaignDays: 2, gameDay: 3 }), credits: 100, utilityDebt: 0, effectivePowerKw: 0.5 });
    expect(end.dayIsComplete).toBe(true);
    expect(end.campaignDays).toBe(3);
    expect(end.nextDay).toBe(4);
  });

  test('the month rolls over and the bill is paid, or becomes debt', () => {
    const prev = state({ dayTicks: 47, gameDay: DAYS_PER_GAME_MONTH, gameMonth: 3, campaignDays: 40, loanAudited: true });
    const paid = calendarTick({ prev, credits: 10_000, utilityDebt: 0, effectivePowerKw: 1 });
    expect(paid.nextMonth).toBe(4);
    expect(paid.credits).toBeLessThan(10_000);
    expect(paid.utilityDebt).toBe(0);
    const broke = calendarTick({ prev, credits: 0, utilityDebt: 0, effectivePowerKw: 1 });
    expect(broke.utilityDebt).toBeGreaterThan(0);
    expect(logs(broke.effects)).toBe(1);
  });

  test('the bill charges the energy used during the month, not the draw at its last half hour', () => {
    const end = { dayTicks: 47, gameDay: DAYS_PER_GAME_MONTH, gameMonth: 3, campaignDays: 40, loanAudited: true };
    // 300 kWh used this month; the GPUs are idle when the month closes.
    const idle = calendarTick({ prev: state({ ...end, monthEnergyKwh: 300 }), credits: 10_000, utilityDebt: 0, effectivePowerKw: 0 });
    const busyNow = calendarTick({ prev: state({ ...end, monthEnergyKwh: 0 }), credits: 10_000, utilityDebt: 0, effectivePowerKw: 5 });
    expect(10_000 - idle.credits).toBeGreaterThan(10_000 - busyNow.credits);
    expect(idle.monthEnergyKwh).toBe(0); // a new month starts from zero
    // Mid-month, each half hour adds power x 0.5 h.
    const mid = calendarTick({ prev: state({ dayTicks: 10, monthEnergyKwh: 12 }), credits: 0, utilityDebt: 0, effectivePowerKw: 2 });
    expect(mid.monthEnergyKwh).toBeCloseTo(13);
  });

  test('the university loan is audited at the end of its trial week', () => {
    const audit = calendarTick({ prev: state({ dayTicks: 47, campaignDays: 6, uiVersion: 1, loanAudited: false }), credits: 0, utilityDebt: 0, effectivePowerKw: 0 });
    expect(audit.loanAuditDue).toBe(true);
    expect(audit.storyEvents).toContain('loan_audit');
  });
});

describe('thermal tick', () => {
  const metrics = { maxCoolingKw: 1, maxPowerKw: 1.5 };
  test('excess power heats up; crossing 88 °C raises the first-overheat event', () => {
    const r = thermalTick({ prev: state({ systemHeatCelsius: 87 }), metrics, effectivePowerKw: 2, currentActiveGigs: [], systemHeatCelsius: 87, powerTripSeconds: 0, watchdogSuspicion: 0, rand: () => 1 });
    expect(r.systemHeatCelsius).toBeGreaterThan(88);
    expect(r.storyEvents).toContain('first_overheat');
  });

  test('an overloaded circuit can trip the breaker', () => {
    const r = thermalTick({ prev: state(), metrics, effectivePowerKw: 2, currentActiveGigs: [], systemHeatCelsius: 40, powerTripSeconds: 0, watchdogSuspicion: 0, rand: () => 0 });
    expect(r.powerTripSeconds).toBe(15);
    expect(r.storyEvents).toContain('first_power_trip');
    expect(r.watchdogSuspicion).toBeGreaterThan(0);
  });

  test('an idle, cool cluster calms the watchdog', () => {
    const r = thermalTick({ prev: state(), metrics, effectivePowerKw: 0.2, currentActiveGigs: [], systemHeatCelsius: 40, powerTripSeconds: 0, watchdogSuspicion: 10, rand: () => 1 });
    expect(r.watchdogSuspicion).toBeLessThan(10);
    expect(r.systemHeatCelsius).toBeLessThan(40);
  });
});

describe('training tick', () => {
  const model = { ...DEFAULT_STATE.currentModel, reasoningScore: 5, parametersCount: 14e6 };
  const plan = planTrainingRun({ currentScore: 5, parametersCount: 14e6, datasetTokens: 50e6, datasetQuality: 60, priorRunsOnDataset: 0, config: DEFAULT_TRAINING_CONFIG });
  const job = (progressPercent: number): TrainingJob => ({
    active: true, modelId: model.id, modelName: model.name, currentEpoch: 1, totalEpochs: 1, currentLoss: 4, initialLoss: 4,
    perplexity: 50, gradientNorm: 1, progressPercent, lossHistory: [4], step: 3, tokensProcessed: 0, timeRemainingSeconds: 5,
    totalTokens: plan.totalTokens, datasetId: 'dataset_starter_corpus', plan
  });
  const run = (j: TrainingJob, powerTripSeconds = 0) => trainingTick({
    prev: state({ currentModel: model, savedModels: [model], activeTraining: j }), activeTraining: j,
    borrowedComputePflops: 0, agentComputeDemand: 0, currentActiveGigs: [], systemHeatCelsius: 40, powerTripSeconds,
    singularityProgress: 1, reasoningIndex: 5, rand: () => 0.5
  });

  test('a running job advances and draws both curves', () => {
    const r = run(job(10));
    expect(r.updatedTraining?.progressPercent).toBeGreaterThan(10);
    expect(r.updatedTraining?.valLossHistory?.length).toBe(1);
    expect(r.trainingReport).toBeNull();
  });

  test('a tripped breaker pauses the run', () => {
    const r = run(job(10), 5);
    expect(r.updatedTraining?.progressPercent).toBe(10);
  });

  test('finishing applies the planned score change, the report and the singularity progress', () => {
    const r = run(job(99.99));
    expect(r.updatedTraining).toBeNull();
    expect(r.newCurrentModel.reasoningScore).toBeCloseTo(5 + plan.scoreChange, 1);
    expect(r.newCurrentModel.datasetRuns?.dataset_starter_corpus).toBe(1);
    expect(r.trainingReport?.outcome).toBe(plan.outcome);
    expect(r.singularityProgress).toBeGreaterThan(1);
  });
});

describe('scrape tick', () => {
  const scrapeJob = { domain: 'finance', domainLabel: 'Finanzas', tier: 1, progressPercent: 99.9, timeRemainingSeconds: 1, assignedModelId: 'm', assignedModelName: 'M' };
  test('finishing a job adds a dataset', () => {
    const prev = state({ activeScrapeJob: scrapeJob as GameState['activeScrapeJob'], customDatasets: [] });
    const r = scrapeTick({ prev, powerTripSeconds: 0, totalComputePflops: 1, now: 123 });
    expect(r.updatedScrapeJob).toBeNull();
    expect(r.updatedCustomDatasets.length).toBe(1);
    expect(r.updatedCustomDatasets[0].id).toBe('dataset_finance_123');
  });
  test('a tripped breaker pauses the job', () => {
    const prev = state({ activeScrapeJob: { ...scrapeJob, progressPercent: 50 } as GameState['activeScrapeJob'] });
    expect(scrapeTick({ prev, powerTripSeconds: 3, totalComputePflops: 1, now: 1 }).updatedScrapeJob?.progressPercent).toBe(50);
  });
});

describe('mission tick', () => {
  const contract = DEFAULT_STATE.contracts.find(c => c.id === 'gig_v1_wiki_clean')!;
  const agent = { ...({} as AgentInstance), id: 'a1', name: 'A1', role: 'researcher', modelId: DEFAULT_STATE.currentModel.id, modelName: 'm', status: 'on_mission', alignmentScore: 90, autonomyLevel: 1, revenuePerSec: 0, suspicionPerSec: 0, toolsGranted: [], lastThought: '', escapesAttempted: 0, inferenceParams: { temperature: 0.6, topP: 0.9, topK: 40, repetitionPenalty: 1.1, systemPrompt: '' }, autoMissionEnabled: false } as AgentInstance;
  const gig = (over: Partial<ActiveGig>): ActiveGig => ({ contractId: contract.id, runId: 'r', timeRemaining: 1, agentIds: ['a1'], successProbability: 0.6, aiAssessmentStatus: 'complete', outcomeRoll: 0.1, ...over });
  const run = (g: ActiveGig) => missionTick({
    prev: state({ activeGigs: [g], activeGig: g, agents: [agent] }), activeTraining: null, contracts: DEFAULT_STATE.contracts,
    detentionSeconds: 0, effectivePowerKw: 0.5, metrics: { totalComputePflops: 1, activePowerKw: 0.5, maxPowerKw: 10, maxCoolingKw: 10 },
    powerTripSeconds: 0, totalComputePflops: 1, completedContractsCount: 0, credits: 100, singularityProgress: 1,
    tutorialCompleted: true, tutorialStep: 5, watchdogSuspicion: 0, rand: () => 0.99, now: 1
  });

  test('a successful mission pays, counts and frees the team', () => {
    const r = run(gig({ outcomeRoll: 0.1 }));
    expect(r.credits).toBe(100 + contract.rewardCredits);
    expect(r.completedContractsCount).toBe(1);
    expect(r.newLastMissionOutcome?.success).toBe(true);
    expect(r.updatedAgents[0].status).toBe('active');
    expect(r.effects.some(e => e.kind === 'sound' && e.name === 'credit')).toBe(true);
  });

  test('a failed mission keeps the contract and explains why', () => {
    const r = run(gig({ outcomeRoll: 0.95 }));
    expect(r.credits).toBe(100);
    expect(r.newLastMissionOutcome?.success).toBe(false);
    expect(r.newLastMissionOutcome?.weakestFactors?.length).toBe(2);
    expect(r.updatedContracts.find(c => c.id === contract.id)?.lastAttemptFailed).toBe(true);
  });

  test('a mission waiting for its assessment does not count down', () => {
    const r = run(gig({ timeRemaining: 5, aiAssessmentStatus: 'pending' }));
    expect(r.updatedGigs[0].timeRemaining).toBe(5);
  });
});

describe('agent and trading ticks', () => {
  test('with no agents nothing happens but the incident cooldown runs down', () => {
    const r = agentTick({ prev: state({ agents: [], incidentCooldownTicks: 10 }), detentionSeconds: 0, watchdogSuspicion: 0, singularityProgress: 1, updatedAgents: [], rand: () => 0.99, now: 1 });
    expect(r.updatedAgents).toEqual([]);
    expect(r.updatedIncidentCooldown).toBe(9);
    expect(r.newActiveIncident).toBeFalsy();
  });

  test('without a trading desk there is nothing to trade', () => {
    const r = tradingTick({ prev: state({ activeTradingDesk: null }), detentionSeconds: 0, powerTripSeconds: 0, updatedAgents: [], watchdogSuspicion: 3, rand: () => 0.5 });
    expect(r.updatedTradingDesk).toBeNull();
    expect(r.watchdogSuspicion).toBe(3);
  });
});
