// Review script (not part of the game): plays a full run with the real tick and rule functions of src/,
// driven by a simple "reasonable player" policy. Run from the repo root:  bun docs/review2/simulate.ts [seed] [difficulty]
// The orchestration below mirrors advanceOneTick in src/context/GameContext.tsx (calendar, thermal, training,
// missions, agents) and the checks of startTraining / startContract / buyHardware / unlockResearch.
import '../../tests/setup';
import { DEFAULT_STATE } from '../../src/persistence/saveState';
import * as C from '../../src/utils/constants';
import { calendarTick } from '../../src/tick/calendarTick';
import { thermalTick } from '../../src/tick/thermalTick';
import { trainingTick } from '../../src/tick/trainingTick';
import { missionTick } from '../../src/tick/missionTick';
import { agentTick } from '../../src/tick/agentTick';
import { planTrainingRun, vramForRun, MAX_EPOCHS, type TrainingConfig } from '../../src/utils/trainingRun';
import { externalComputePflops, gpuComputePflops, reasoningCeilingFor, formatGameTime } from '../../src/utils/training';
import { evaluateMissionTeam } from '../../src/utils/missionEvaluation';
import { UPGRADE_SCORE, tierForUiVersion, NEW_GPU_SINGULARITY, FIRST_MISSION_IQ } from '../../src/utils/missionTiers';
import { missionComputePflops, missionPowerKw } from '../../src/utils/computeLedger';
import { closeWeek, isWeekEnd } from '../../src/utils/weeklyReport';
import { isProgressionUnlocked, getModelOptionRequirement, researchStatus } from '../../src/utils/progression';

let seed = Number(process.argv[2] ?? 1);
const difficulty = (process.argv[3] ?? 'normal') as 'beginner' | 'normal' | 'engineer';
const rand = () => { seed = (seed * 1664525 + 1013904223) % 4294967296; return seed / 4294967296; };
const VERBOSE = process.argv.includes('-v');
// --honest: resizing a model resets its score to 5, as a real change of parameter count would.
const HONEST = process.argv.includes('--honest');

type S = any;
const metricsOf = (s: S) => {
  const f = C.FACILITY_TIERS[s.facilityTier] || C.FACILITY_TIERS[0];
  let tf = 0, draw = 0, maxP = 1.5 + f.powerCapacityBonusKw, maxC = 0.8 + f.coolingCapacityBonusKw;
  for (const h of s.hardware) {
    if (h.category === 'gpu') { tf += h.computeTflops * h.count; draw += h.powerKw * h.count; }
    else if (h.category === 'cooling') { maxC += (h.coolingCapacityKw || 0) * h.count; draw += h.powerKw * h.count; }
    else if (h.category === 'power') maxP += (h.powerCapacityKw || 0) * h.count;
    else if (h.category === 'network') draw += h.powerKw * h.count;
  }
  return { totalComputePflops: Math.max(1e-6, tf / 1000 + externalComputePflops(s)), activePowerKw: draw, maxPowerKw: maxP, maxCoolingKw: maxC };
};

// --- start state: what completeTutorial builds for the cheapest starter kit ---
const pick = (id: string) => C.INITIAL_HARDWARE.find(h => h.id === id)!;
const starters = ['gpu_gtx1060', 'cool_air_basic', 'power_wall_socket', 'net_gigabit'];
const spent = starters.reduce((a, id) => a + (pick(id).price || 0), 0);
let s: S = {
  ...DEFAULT_STATE, difficulty, hasCompletedOnboarding: true, tutorialStep: 2, gameSpeed: 1, dayTicks: 16,
  credits: Math.max(50, 350 - spent + C.DIFFICULTY_CONFIGS[difficulty].initialCreditsBonus),
  hardware: C.INITIAL_HARDWARE.map(h => starters.includes(h.id) ? { ...h, count: 1 } : { ...h, count: 0 }),
  currentModel: { ...C.INITIAL_MODEL, reasoningScore: 5, vramRequiredGb: 1 },
  agents: [], contracts: C.INITIAL_CONTRACTS.map(c => ({ ...c })), trainingConfig: { epochs: 1, learningRate: 'balanced', batchSize: 'medium', earlyStopping: true }
};
s.savedModels = [s.currentModel];

const log: string[] = [];
const stats = { runs: 0, runsNoGain: 0, missionsOk: 0, missionsFail: 0, idleTicks: 0, trips: 0, hotTicks: 0, billsUnpaid: 0, earned: 0, spentHw: 0, spentPapers: 0, energyBill: 0, firstMissionTick: -1, firstMissionFails: 0, stuck: [] as string[] };
const stage: Record<number, { tick: number; day: number }> = { 1: { tick: 0, day: 0 } };
let tick = 0;
const note = (m: string) => { const line = `[t${tick} d${s.campaignDays} v${s.uiVersion} $${Math.round(s.credits)} prog ${s.singularityProgress.toFixed(1)} score ${s.currentModel.reasoningScore} susp ${s.watchdogSuspicion.toFixed(0)}] ${m}`; log.push(line); if (VERBOSE) console.log(line); };

function step() {
  const prev = s;
  const m = metricsOf(prev);
  const borrowedSeconds = Math.max(0, (prev.borrowedComputeSeconds || 0) - 1);
  const borrowed = borrowedSeconds > 0 ? prev.borrowedComputePflops || 0 : 0;
  let powerTrip = Math.max(0, (prev.powerTripSeconds || 0) - 1);
  const ops = prev.agents.filter((a: any) => a.status !== 'quarantined').length;
  const gigs = prev.activeGigs ?? [];
  const effKw = m.activePowerKw + ops * C.AGENT_POWER_DRAW_KW + gigs.reduce((a: number, g: any) => a + (g.powerKw || 0), 0);
  const cal = calendarTick({ prev, credits: prev.credits, utilityDebt: prev.utilityDebt || 0, effectivePowerKw: effKw });
  let credits = cal.credits, debt = cal.utilityDebt;
  if (cal.nextDay === 1 && cal.dayIsComplete) { stats.energyBill += prev.credits - cal.credits; if (debt > 0) stats.billsUnpaid++; }
  for (const d of prev.sentienceDomains) if (d.infiltrated) credits += d.payoutPerSec;
  const th = thermalTick({ prev, metrics: m, effectivePowerKw: effKw, currentActiveGigs: gigs, systemHeatCelsius: prev.systemHeatCelsius, powerTripSeconds: powerTrip, watchdogSuspicion: prev.watchdogSuspicion, rand });
  if (th.powerTripSeconds > powerTrip && powerTrip === 0) stats.trips++;
  powerTrip = th.powerTripSeconds;
  if (th.systemHeatCelsius > 85) stats.hotTicks++;
  const tr = trainingTick({ prev, activeTraining: prev.activeTraining, borrowedComputePflops: borrowed, agentComputeDemand: ops * C.AGENT_COMPUTE_DEMAND_PFLOPS, currentActiveGigs: gigs, systemHeatCelsius: th.systemHeatCelsius, powerTripSeconds: powerTrip, singularityProgress: prev.singularityProgress, reasoningIndex: prev.reasoningIndex, rand });
  if (tr.trainingReport) { stats.runs++; const gain = tr.trainingReport.reasoningAfter - tr.trainingReport.reasoningBefore; if (gain < 0.1) stats.runsNoGain++; note(`run done (${tr.trainingReport.outcome}, ${prev.activeTraining.step + 1} ticks, ${tr.trainingReport.epochsRun}/${tr.trainingReport.epochsPlanned} ep) ${tr.trainingReport.reasoningBefore} -> ${tr.trainingReport.reasoningAfter} (ceiling ${tr.trainingReport.reasoningCeiling})`); }
  const mi = missionTick({ activeTraining: prev.activeTraining, contracts: prev.contracts, detentionSeconds: 0, effectivePowerKw: effKw, metrics: m, powerTripSeconds: powerTrip, prev, totalComputePflops: m.totalComputePflops + borrowed, completedContractsCount: prev.completedContractsCount ?? 0, credits, singularityProgress: tr.singularityProgress, tutorialCompleted: prev.tutorialCompleted, tutorialStep: prev.tutorialStep, watchdogSuspicion: th.watchdogSuspicion, rand, now: tick });
  if (mi.newLastMissionOutcome) {
    const o = mi.newLastMissionOutcome;
    if (o.success) { stats.missionsOk++; stats.earned += o.rewardCredits; if (stats.firstMissionTick < 0) stats.firstMissionTick = tick; }
    else { stats.missionsFail++; if (stats.firstMissionTick < 0) stats.firstMissionFails++; }
    note(`mission ${o.success ? 'OK' : 'FAILED'} "${o.contractTitle}" p=${o.successProbability} +$${o.rewardCredits} susp+${o.suspicionAdded}`);
  }
  const ag = agentTick({ detentionSeconds: 0, prev, watchdogSuspicion: mi.watchdogSuspicion, singularityProgress: mi.singularityProgress, updatedAgents: mi.updatedAgents, rand, now: tick });
  credits = mi.credits;
  if (debt > 0 && credits > 0) { const p = Math.min(credits, debt); credits -= p; debt -= p; }
  const model = tr.newCurrentModel;
  const tutorialReward = Math.max(0, mi.tutorialStep - (prev.tutorialRewardedStep ?? prev.tutorialStep)) * C.TUTORIAL_STAGE_REWARD;
  s = { ...prev, credits: Math.round(credits + tutorialReward), tutorialRewardedStep: Math.max(prev.tutorialRewardedStep ?? prev.tutorialStep, mi.tutorialStep), utilityDebt: debt, monthEnergyKwh: cal.monthEnergyKwh, campaignDays: cal.campaignDays, dayTicks: cal.nextDayTicks, gameDay: cal.nextDay, gameMonth: cal.nextMonth, gameYear: cal.nextYear,
    loanAudited: prev.loanAudited || cal.loanAuditDue, loanTrainingTicks: cal.loanTrainingTicks, systemHeatCelsius: th.systemHeatCelsius, powerTripSeconds: powerTrip, watchdogSuspicion: ag.newActiveIncident && !prev.activeIncident ? mi.watchdogSuspicion : mi.watchdogSuspicion,
    borrowedComputeSeconds: borrowedSeconds, borrowedComputePflops: borrowed, currentModel: model, savedModels: prev.savedModels.map((x: any) => x.id === model.id ? model : x), activeTraining: tr.updatedTraining,
    activeGigs: mi.updatedGigs, contracts: mi.updatedContracts, agents: ag.updatedAgents, singularityProgress: ag.singularityProgress, subversionProgress: mi.updatedSubversion, completedContractsCount: mi.completedContractsCount,
    tutorialStep: mi.tutorialStep, tutorialCompleted: mi.tutorialCompleted, activeIncident: null, incidentCooldownTicks: ag.newActiveIncident ? 300 : ag.updatedIncidentCooldown, seenStoryEvents: [...new Set([...(prev.seenStoryEvents ?? []), ...cal.storyEvents, ...th.storyEvents])] };
  if (cal.loanAuditDue) note('university loan audited: 20 TFLOPS gone');
  // Weekly report: papers arrive a few per week (utils/weeklyReport.ts).
  if (isWeekEnd(s.campaignDays, cal.dayIsComplete)) { const closed = closeWeek(s); s = { ...s, announcedResearchIds: closed.announcedResearchIds, weekStats: closed.weekStats }; if (closed.report.newResearchIds.length) note(`weekly report ${closed.report.week}: new papers ${closed.report.newResearchIds.join(', ')}`); }
  if (ag.newActiveIncident) { note('incident (resolved the safe way)'); }
  tick++;
}

// --- player policy ---
const datasets = () => [C.STARTER_TRAINING_DATASET, C.DEFAULT_GENERAL_DATASET, ...(s.customDatasets ?? [])];
const totalVram = () => s.hardware.reduce((a: number, h: any) => h.category === 'gpu' ? a + h.vramGb * h.count : a, 0);
function bestPlan() {
  let best: any = null;
  for (const d of datasets()) for (let e = 1; e <= MAX_EPOCHS; e++) {
    const config: TrainingConfig = { epochs: e, learningRate: 'balanced', batchSize: 'medium', earlyStopping: true };
    const plan = planTrainingRun({ currentScore: s.currentModel.reasoningScore, parametersCount: s.currentModel.parametersCount, datasetTokens: d.tokensCount * 1e6, datasetQuality: d.qualityScore, priorRunsOnDataset: s.currentModel.datasetRuns?.[d.id] ?? 0, config });
    const avail = Math.max(1e-9, gpuComputePflops(s.hardware) + externalComputePflops(s) - s.agents.length * C.AGENT_COMPUTE_DEMAND_PFLOPS);
    const ticks = 6 * s.currentModel.parametersCount * plan.totalTokens * (plan.stopEpoch / config.epochs) / (avail * 1e15 * 0.35 * 60);
    const value = plan.scoreChange / Math.max(20, ticks); // gain per tick, counting ~20 ticks of player overhead
    if (plan.scoreChange >= 0.1 && (!best || value > best.value)) best = { d, config, plan, ticks, value };
  }
  return best;
}
function startTraining(b: any) {
  if (totalVram() < vramForRun(s.currentModel.vramRequiredGb, 'medium')) return false;
  s = { ...s, trainingConfig: b.config, activeTraining: { active: true, modelId: s.currentModel.id, modelName: s.currentModel.name, currentEpoch: 1, totalEpochs: b.config.epochs, currentLoss: b.plan.initialLoss, initialLoss: b.plan.initialLoss, perplexity: 1, gradientNorm: 1, progressPercent: 0, lossHistory: [b.plan.initialLoss], valLossHistory: [], plan: b.plan, step: 0, tokensProcessed: 0, timeRemainingSeconds: null, datasetId: b.d.id, totalTokens: b.plan.totalTokens, datasetName: b.d.name, datasetDomain: b.d.domain, targetModelType: 'general' } };
  if (VERBOSE) note(`start run: ${b.d.name}, ${b.config.epochs} ep, est ${Math.round(b.ticks)} ticks (${formatGameTime(b.ticks)})`);
  return true;
}
const SIZES = [14e6, 28e6, 70e6, 250e6, 500e6, 1.5e9, 7e9, 25e9, 70e9, 200e9, 405e9, 500e9];
const bytes = (q: string) => q === 'fp32' ? 4 : q === 'int8' ? 1 : q === 'fp4' ? 0.5 : q === 'ternary_1bit' ? 0.2 : 2;
function growModel() {
  // Same rule as updateModelArchitecture: the model is resized in place and keeps its score.
  for (const p of [...SIZES].reverse()) {
    if (p <= s.currentModel.parametersCount) return;
    if (!isProgressionUnlocked(getModelOptionRequirement('parametersCount', p), s)) continue;
    const vram = Math.max(1, (p / 1e6 * bytes(s.currentModel.quantization)) / 1000 + 0.8);
    if (vram > totalVram()) continue;
    if (HONEST && reasoningCeilingFor(p) < s.currentModel.reasoningScore + 6) continue; // not worth retraining from scratch
    if (HONEST && s.currentModel.reasoningScore < reasoningCeilingFor(s.currentModel.parametersCount) - 3) return; // finish the current size first
    const updated = { ...s.currentModel, parametersCount: p, vramRequiredGb: Number(vram.toFixed(1)), ...(HONEST ? { reasoningScore: 5, datasetRuns: {} } : {}) };
    note(`model resized to ${p / 1e6}M (score ${HONEST ? 'reset to 5' : 'kept at ' + updated.reasoningScore}; ceiling ${reasoningCeilingFor(p).toFixed(1)})`);
    s = { ...s, currentModel: updated, savedModels: s.savedModels.map((x: any) => x.id === updated.id ? updated : x) };
    return;
  }
}
const ROLE_SUSP: Record<string, number> = { researcher: 0.05, software_engineer: 0.12 * 1.4, network_analyst: 0.16, arbitrageur: 0.15, economist: 0.08, overseer: -0.15 * 1.4, autonomous_coder: 0.25 * 1.4, exploit_synth: 0.55 * 1.4 };
function addAgent(role: string) {
  const cost = s.agents.length === 0 ? 0 : C.AGENT_SPINUP_COST;
  if (s.credits < cost) return false;
  s = { ...s, credits: s.credits - cost, tutorialStep: s.tutorialStep === 3 ? 4 : s.tutorialStep, agents: [...s.agents, { id: `a_${role}`, name: role, role, modelId: s.currentModel.id, modelName: s.currentModel.name, status: 'active', alignmentScore: 92, autonomyLevel: 1, revenuePerSec: 1, suspicionPerSec: Number((ROLE_SUSP[role] ?? 0.1).toFixed(2)), toolsGranted: ['web_search'], lastThought: '', escapesAttempted: 0, inferenceParams: { temperature: 0.6, topP: 0.7, topK: 40, repetitionPenalty: 1.1, systemPrompt: '' }, autoMissionEnabled: false }] };
  note(`agent deployed: ${role}`);
  return true;
}
function tryMission() {
  const tier = tierForUiVersion(s.uiVersion);
  const free = s.agents.filter((a: any) => a.status === 'active');
  if (free.length === 0) return;
  const model = s.currentModel;
  const open = s.contracts.filter((c: any) => !c.completed && c.tier === tier && !(s.activeGigs ?? []).some((g: any) => g.contractId === c.id)).sort((a: any, b: any) => b.rewardCredits - a.rewardCredits);
  for (const c of open) {
    if (model.parametersCount < c.requiredParams || model.reasoningScore < c.requiredMinReasoning) continue;
    if (c.requiredTopology && c.requiredTopology !== model.topology) continue;
    const roles: string[] = c.requiredAgentRoles ?? [];
    for (const r of roles) if (!s.agents.some((a: any) => a.role === r)) addAgent(r);
    const team = roles.length ? roles.map(r => s.agents.find((a: any) => a.role === r && a.status === 'active')).filter(Boolean) : s.agents.filter((a: any) => a.status === 'active');
    if (team.length < Math.max(roles.length, c.minimumAgents ?? 1)) continue;
    if ((c.requiredDataTypes ?? []).some((t: string) => !s.dataSources.some((d: any) => d.type === t && d.unlocked && model.activeDataSources.includes(d.id)))) continue;
    // Compute budget rule (utils/computeLedger.ts): each agent of the team runs its model; training gives way.
    const need = missionComputePflops(team.map(() => model)), kw = missionPowerKw(need);
    const m = metricsOf(s);
    const running = s.activeGigs ?? [];
    const availC = m.totalComputePflops - s.agents.length * C.AGENT_COMPUTE_DEMAND_PFLOPS - running.reduce((a: number, g: any) => a + g.computePflopsRequired, 0);
    if (availC < need) { if (!stats.stuck.includes('compute:' + c.id)) stats.stuck.push('compute:' + c.id); continue; }
    if (m.activePowerKw + s.agents.length * C.AGENT_POWER_DRAW_KW + running.reduce((a: number, g: any) => a + g.powerKw, 0) + kw > m.maxPowerKw) { if (!stats.stuck.includes('power:' + c.id)) stats.stuck.push('power:' + c.id); continue; }
    // A careful player does not take a mission whose failure would end the run.
    if (s.watchdogSuspicion + c.suspicionRisk * C.DIFFICULTY_CONFIGS[difficulty].suspicionMultiplier >= 95) { scrub(); if (s.watchdogSuspicion + c.suspicionRisk >= 95) continue; }
    const ev = evaluateMissionTeam(c, team as any, team.map(() => model) as any, s.dataSources, s.guardrails);
    s = { ...s, activeGigs: [...running, { contractId: c.id, runId: `m${tick}`, timeRemaining: ev.estimatedDurationSeconds, durationSeconds: ev.estimatedDurationSeconds, agentIds: team.map((a: any) => a.id), progressPercent: 0, successProbability: ev.successProbability, efficiencyPercent: ev.efficiencyPercent, aiAssessmentStatus: 'complete', outcomeRoll: rand(), computePflopsRequired: need, powerKw: kw }], agents: s.agents.map((a: any) => team.some((t: any) => t.id === a.id) ? { ...a, status: 'on_mission' } : a) };
    return;
  }
}
function scrub() { if (s.credits >= 250 && s.watchdogSuspicion >= 40) { s = { ...s, credits: s.credits - 250, watchdogSuspicion: Math.max(0, s.watchdogSuspicion - 45) }; note('paid 250 to scrub traces (-45 suspicion)'); } }
function buyPapers() {
  for (const n of [...s.researchTree].sort((a: any, b: any) => a.costCredits - b.costCredits)) {
    if (n.unlocked) continue;
    const st = researchStatus(n, s);
    if (!st.available || s.credits < n.costCredits * 1.3) continue;
    s = { ...s, credits: s.credits - n.costCredits, researchTree: s.researchTree.map((r: any) => r.id === n.id ? { ...r, unlocked: true } : r), singularityProgress: Math.min(100, s.singularityProgress + 0.35) };
    stats.spentPapers += n.costCredits; note(`paper funded: ${n.id} ($${n.costCredits})`);
  }
}
function buyData() {
  for (const d of s.dataSources) {
    if (d.unlocked || !isProgressionUnlocked(d, s) || s.credits < d.cost * 1.5) continue;
    const m = { ...s.currentModel, activeDataSources: [...s.currentModel.activeDataSources, d.id] };
    s = { ...s, credits: s.credits - d.cost, dataSources: s.dataSources.map((x: any) => x.id === d.id ? { ...x, unlocked: true, level: 1 } : x), currentModel: m, savedModels: s.savedModels.map((x: any) => x.id === m.id ? m : x), singularityProgress: Math.min(100, s.singularityProgress + 0.25) };
    note(`data engine deployed and connected: ${d.id} ($${d.cost})`);
  }
}
function buyHardware() {
  if (s.uiVersion === 1 && s.completedContractsCount === 0) return; // the tab is locked until the first job
  const m = metricsOf(s);
  const can = (h: any) => isProgressionUnlocked(h, s) && s.credits >= h.price;
  const buy = (h: any, why: string) => { const first = h.category === 'gpu' && h.count === 0; s = { ...s, credits: s.credits - h.price, hardware: s.hardware.map((x: any) => x.id === h.id ? { ...x, count: x.count + 1 } : x), singularityProgress: Math.min(100, s.singularityProgress + (first ? NEW_GPU_SINGULARITY : 0)) }; stats.spentHw += h.price; note(`bought ${h.id} ($${h.price}) ${why}`); };
  // facility first when it is the only way to get room
  const nextF = C.FACILITY_TIERS[s.facilityTier + 1];
  // Buy the most powerful GPU the player can pay for, unless a much better one (4x compute) is within reach.
  const unlockedGpus = s.hardware.filter((h: any) => h.category === 'gpu' && isProgressionUnlocked(h, s)).sort((a: any, b: any) => b.computeTflops - a.computeTflops);
  const best = unlockedGpus.find((g: any) => s.credits >= g.price * 1.2);
  if (!best) return;
  if (unlockedGpus.some((g: any) => g.computeTflops >= 4 * best.computeTflops && g.price <= 4 * s.credits)) return;
  const owned = gpuComputePflops(s.hardware) * 1000;
  if (best.computeTflops < 0.25 * owned) return; // not worth the power
  const draw = m.activePowerKw + s.agents.length * C.AGENT_POWER_DRAW_KW + 0.2;
  if (draw + best.powerKw > m.maxPowerKw) {
    const p = s.hardware.filter((h: any) => h.category === 'power' && can(h) && h.powerCapacityKw >= best.powerKw).sort((a: any, b: any) => a.price - b.price)[0];
    if (p && s.credits >= p.price + best.price) return buy(p, '(power capacity)');
    if (nextF && isProgressionUnlocked(nextF, s) && s.singularityProgress >= nextF.requiredSingularity && s.credits >= nextF.price + best.price) { s = { ...s, credits: s.credits - nextF.price, facilityTier: s.facilityTier + 1 }; note(`facility -> ${nextF.id} ($${nextF.price})`); return; }
    if (!stats.stuck.includes('power-cap@v' + s.uiVersion)) stats.stuck.push('power-cap@v' + s.uiVersion);
    return;
  }
  if (draw + best.powerKw > m.maxCoolingKw) {
    const c = s.hardware.filter((h: any) => h.category === 'cooling' && can(h)).sort((a: any, b: any) => b.coolingCapacityKw / b.price - a.coolingCapacityKw / a.price)[0];
    if (c && s.credits >= c.price + best.price) return buy(c, '(cooling)');
    return;
  }
  if (s.credits >= best.price * 1.2) buy(best, `(${best.computeTflops} TFLOPS, ${best.vramGb} GB)`);
}
function tryUpgrade() {
  const v = s.uiVersion; if (v >= 4) return;
  const need = { 1: 25, 2: 55, 3: 85 }[v as 1 | 2 | 3]!;
  if (s.singularityProgress >= need && s.currentModel.reasoningScore >= UPGRADE_SCORE[(v + 1) as 2 | 3 | 4]) {
    s = { ...s, uiVersion: v + 1, covertNodeActive: v + 1 >= 3 ? true : s.covertNodeActive };
    stage[v + 1] = { tick, day: s.campaignDays };
    note(`=== UPGRADE to v${v + 1} ===`);
  }
}
function crisis() {
  if (!s.singularityCrisisResolved && (s.singularityProgress >= 75 || s.subversionProgress >= 75)) {
    s = { ...s, singularityCrisisResolved: true, playerChoseResist: true, subversionProgress: Math.max(0, s.subversionProgress - 25), watchdogSuspicion: Math.min(100, s.watchdogSuspicion + 35) };
    note('75% fork: RESIST (+35 suspicion)');
  }
}

const MAX_TICKS = 48 * 400;
let lastProgressTick = 0, lastProgress = 0;
while (tick < MAX_TICKS && !s.gameOverReason && !(s.singularityProgress >= 100 && s.uiVersion === 4)) {
  if (s.singularityProgress >= 100 && !(s as any)._hit100) { (s as any)._hit100 = true; note(`progress gauge reached 100 in v${s.uiVersion}`); }
  // decisions (a player acts between ticks)
  if (s.watchdogSuspicion >= 100) { note('RAID: suspicion reached 100'); break; }
  if (s.watchdogSuspicion >= 60) scrub();
  crisis(); tryUpgrade(); buyPapers(); buyData(); growModel(); buyHardware();
  if (s.agents.length === 0 && s.currentModel.reasoningScore >= FIRST_MISSION_IQ) addAgent('researcher');
  if (!s.activeTraining) { const b = bestPlan(); if (b) startTraining(b); }
  tryMission();
  if (!s.activeTraining && (s.activeGigs ?? []).length === 0) stats.idleTicks++;
  step();
  if (s.singularityProgress > lastProgress + 0.05) { lastProgress = s.singularityProgress; lastProgressTick = tick; }
  if (tick - lastProgressTick > 48 * 60) { note('STALLED: no progress for 60 game days'); break; }
}
note('END');

const t2m = (t: number) => (t / 60).toFixed(1);
console.log(`\n=== seed ${process.argv[2] ?? 1}, ${difficulty} ===`);
console.log('stage | starts at tick | game day | real minutes at 1x spent in stage');
const vs = Object.keys(stage).map(Number).sort();
vs.forEach((v, i) => { const end = i + 1 < vs.length ? stage[vs[i + 1]].tick : tick; console.log(`v${v} | ${stage[v].tick} | ${stage[v].day} | ${t2m(end - stage[v].tick)}`); });
console.log(`end: tick ${tick} (${t2m(tick)} min at 1x), day ${s.campaignDays}, v${s.uiVersion}, progress ${s.singularityProgress.toFixed(1)}, score ${s.currentModel.reasoningScore}, params ${s.currentModel.parametersCount / 1e6}M, credits ${Math.round(s.credits)}, debt ${Math.round(s.utilityDebt)}`);
console.log(JSON.stringify(stats));
console.log(`first successful mission at tick ${stats.firstMissionTick} (${t2m(stats.firstMissionTick)} min), after ${stats.firstMissionFails} failed attempt(s)`);
if (!VERBOSE && !process.argv.includes('-q')) console.log(log.filter(l => /UPGRADE|resized|loan|RAID|STALLED|fork|facility|END|incident|reached 100/.test(l)).join('\n'));
