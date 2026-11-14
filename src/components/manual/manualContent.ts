/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import type { GameDifficulty } from '../../types/game';
import { tr, trv, type CatalogKey, type Language, type TextParams } from '../../i18n';
import {
  AGENT_COMPUTE_DEMAND_PFLOPS, AGENT_POWER_DRAW_KW, AGENT_SPINUP_COST, DAYS_PER_GAME_MONTH, DATASET_TIER_CONFIGS,
  DEFAULT_GENERAL_DATASET, DIFFICULTY_CONFIGS, EMERGENCY_LOAN_AMOUNT, EMERGENCY_LOAN_REPAYMENT, ELECTRICITY_RATE_PER_KWH,
  FACILITY_TIERS, STARTER_TRAINING_DATASET, dataSourceUpgradeCost, INITIAL_DATA_SOURCES, TUTORIAL_STAGE_REWARD
} from '../../utils/constants';
import {
  COVERT_NODE_PFLOPS, GAME_MINUTES_PER_TICK, LOAN_MISUSE_TICKS, LOAN_TRIAL_DAYS, SWARM_GRANT_SHARE, TICKS_PER_GAME_DAY,
  TRAINING_EFFICIENCY, UNIVERSITY_LOAN_PFLOPS, formatCompute, formatGameTime, reasoningCeilingFor
} from '../../utils/training';
import {
  BATCH_SIZES, LEARNING_RATES, MAX_EPOCHS, OVERFIT_PENALTY_PER_EPOCH
} from '../../utils/trainingRun';
import {
  DATA_SCRAPING_MIN_SCORE, FIRST_MISSION_IQ, MISSION_SINGULARITY, NEW_GPU_SINGULARITY, SINGULARITY_PER_SCORE_POINT,
  UPGRADE_SCORE, tierForUiVersion
} from '../../utils/missionTiers';
import {
  ALIGNMENT_COMPROMISED_BELOW, ALIGNMENT_JAILBREAK_BELOW, HOT_AGENT_MULTIPLIER, HOT_AGENT_TEMPERATURE,
  INCIDENT_CHANCE_CAP, INCIDENT_COOLDOWN_TICKS, MISSION, OVERSEER_ALIGNMENT_PER_TICK, POWER_HEAT, RISKY_TOOLS_MULTIPLIER,
  SANDBOX_INCIDENT_MULTIPLIER, STRICTNESS_BANDS, SUSPICION, TICKS_PER_DAY, TRADING_TIERS, COMPUTE, WEEK_DAYS, RESEARCH_PER_WEEK
} from '../../utils/rules';
import { CONTAINMENT_MAX_SUBVERSION } from '../../utils/epilogue';
import { VERSION_PROFILES } from '../../utils/versionProfiles';

// The in-game manual: what each rule really is, with the numbers read from the same constants the game
// uses (so a number can never go stale), and what each decision costs. Chapters and rows that would give
// away the story are hidden until the version that reveals it.

export type UiVersion = 1 | 2 | 3 | 4;

export type ManualBlock =
  | { kind: 'text'; text: string }
  | { kind: 'tip'; text: string }
  | { kind: 'heading'; text: string }
  | { kind: 'list'; items: string[] }
  | { kind: 'table'; headers: string[]; rows: string[][] };

export interface ManualChapter {
  id: 'start' | 'decisions' | 'training' | 'cluster' | 'missions' | 'suspicion' | 'data' | 'arch' | 'progress' | 'endgame';
  title: string;
  blocks: ManualBlock[];
}

const fixed = (value: number, digits = 1): string => value.toFixed(digits).replace(/\.0+$/, '');
const pct = (value: number, digits = 0): string => fixed(value * 100, digits);
const money = (value: number): string => `$${value.toLocaleString('en-US')}`;
const sizeLabel = (params: number): string => (params >= 1e9 ? `${fixed(params / 1e9)}B` : `${fixed(params / 1e6)}M`);

// Every number and name the manual's texts use, for one language and UI version.
export function manualParams(language: Language, version: UiVersion): TextParams {
  const profile = VERSION_PROFILES[language][version];
  const nextUpgrade = version < 4 ? ((version + 1) as 2 | 3 | 4) : null;
  const upgradeProgress: Record<2 | 3 | 4, number> = { 2: 25, 3: 55, 4: 85 };
  const loan = LOAN_TRIAL_DAYS;
  const spec = (id: string) => INITIAL_DATA_SOURCES.find(d => d.id === id);
  const beginner = DIFFICULTY_CONFIGS.beginner;
  const tickWord = (n: number) => formatGameTime(n);
  const params: TextParams = {
    tabTraining: profile.tabs.training,
    tabArchitecture: profile.tabs.architecture,
    tabHardware: profile.tabs.hardware,
    tabData: profile.tabs.data,
    tabContracts: profile.tabs.contracts,
    tabAgents: profile.tabs.agents,
    tabResearch: profile.tabs.research,
    tabProgress: profile.tabs.singularity,
    progress: profile.story.progressLabel.replace(/:$/, ''),
    dataIntro: profile.story.dataIntro,
    suspicionMeter: profile.hud3Title,
    teamNoun: profile.story.teamNoun,
    minPerTick: GAME_MINUTES_PER_TICK,
    ticksPerDay: TICKS_PER_GAME_DAY,
    daysPerMonth: DAYS_PER_GAME_MONTH,
    firstMissionScore: FIRST_MISSION_IQ,
    unlockCredits: 1000,
    progressTabAt: 10,
    tutorialReward: TUTORIAL_STAGE_REWARD,
    electricityRate: `$${ELECTRICITY_RATE_PER_KWH.toFixed(2)}`,
    loanAmount: EMERGENCY_LOAN_AMOUNT.toLocaleString('en-US'),
    loanRepay: EMERGENCY_LOAN_REPAYMENT.toLocaleString('en-US'),
    bankruptDebt: (5000).toLocaleString('en-US'),
    baseMaxPower: POWER_HEAT.baseMaxPowerKw,
    baseCooling: POWER_HEAT.baseCoolingKw,
    throttleC: POWER_HEAT.throttleC,
    throttleSpeed: pct(POWER_HEAT.throttleFactor),
    overheatC: POWER_HEAT.overheatEventC,
    runawayC: POWER_HEAT.runawayC,
    heatPerKw: POWER_HEAT.heatPerExcessKw,
    coolPerTick: POWER_HEAT.coolPerTick,
    ambientC: POWER_HEAT.ambientC,
    tripChance: pct(POWER_HEAT.tripChancePerTick),
    tripTime: tickWord(POWER_HEAT.tripTicks),
    agentCost: AGENT_SPINUP_COST,
    agentCompute: formatCompute(AGENT_COMPUTE_DEMAND_PFLOPS),
    agentKw: AGENT_POWER_DRAW_KW,
    alertElevated: SUSPICION.alertElevated,
    alertCritical: SUSPICION.alertCritical,
    alertRaid: SUSPICION.alertRaid,
    fadeDay: fixed(SUSPICION.fadePerTick * TICKS_PER_DAY),
    fadeOverseerDay: fixed(SUSPICION.fadePerTickWithOverseer * TICKS_PER_DAY),
    overloadDay: fixed(SUSPICION.overloadPerTick * TICKS_PER_DAY),
    scrapingDay: fixed(SUSPICION.scrapingPerTick * TICKS_PER_DAY),
    successShare: pct(SUSPICION.missionSuccessShare),
    fadeWorking: pct(SUSPICION.fadeWhileWorkingShare),
    warnAt: SUSPICION.warnAt,
    criticalAt: SUSPICION.criticalAt,
    weekDays: WEEK_DAYS,
    researchPerWeek: RESEARCH_PER_WEEK,
    scrubCost: SUSPICION.scrubCost,
    scrubDrop: SUSPICION.scrubReduction,
    auditCost: SUSPICION.redTeamCost,
    auditAlign: SUSPICION.redTeamAlignment,
    auditDrop: SUSPICION.redTeamSuspicion,
    shadowCompute: formatCompute(SUSPICION.shadowComputePflops),
    shadowTime: tickWord(SUSPICION.shadowTicks),
    shadowBase: pct(SUSPICION.shadowChanceBase),
    shadowPerPoint: fixed(SUSPICION.shadowChancePerPoint * 100, 1),
    shadowMax: pct(SUSPICION.shadowChanceMax),
    shadowOk: SUSPICION.shadowSuspicionOk,
    shadowCaught: SUSPICION.shadowSuspicionCaught,
    shadowDetention: tickWord(SUSPICION.shadowDetentionTicks),
    riskyTools: RISKY_TOOLS_MULTIPLIER,
    hotTemp: HOT_AGENT_TEMPERATURE,
    hotMult: HOT_AGENT_MULTIPLIER,
    compromisedBelow: ALIGNMENT_COMPROMISED_BELOW,
    jailbreakBelow: ALIGNMENT_JAILBREAK_BELOW,
    overseerAlign: OVERSEER_ALIGNMENT_PER_TICK,
    incidentCap: pct(INCIDENT_CHANCE_CAP),
    incidentCooldown: tickWord(INCIDENT_COOLDOWN_TICKS),
    baseProb: pct(MISSION.base),
    perRole: pct(MISSION.perRole),
    dataMax: pct(MISSION.dataBonusMax),
    reasonMax: pct(MISSION.reasoningBonusMax),
    capPivot: MISSION.capabilityPivot,
    perCap: fixed(MISSION.perCapabilityPoint * 100, 1),
    overseerBonus: pct(MISSION.overseerBonus),
    missingRole: pct(MISSION.missingRolePenalty),
    undersized: pct(MISSION.undersizedModelPenalty),
    minProb: pct(MISSION.min),
    maxProb: pct(MISSION.max),
    autoPenalty: pct(MISSION.autonomousPenalty),
    autoPayout: pct(MISSION.autonomousPayout),
    missionProgress: MISSION_SINGULARITY[tierForUiVersion(version)],
    missionAgentMin: formatCompute(COMPUTE.missionAgentMinPflops),
    missionPerBillion: formatCompute(COMPUTE.missionPflopsPerBillionParams),
    missionKwPerPflops: COMPUTE.missionKwPerPflops,
    missionMinKw: COMPUTE.missionMinKw,
    cancelShare: pct(COMPUTE.cancelRiskShare),
    autonomyDefault: COMPUTE.autonomyDefaultShare,
    gapShare: pct(0.15),
    maxEpochs: MAX_EPOCHS,
    overfitPenalty: OVERFIT_PENALTY_PER_EPOCH,
    efficiency: pct(TRAINING_EFFICIENCY),
    starterTokens: STARTER_TRAINING_DATASET.tokensCount,
    starterQuality: STARTER_TRAINING_DATASET.qualityScore,
    generalTokens: DEFAULT_GENERAL_DATASET.tokensCount,
    generalQuality: DEFAULT_GENERAL_DATASET.qualityScore,
    progressPerPoint: SINGULARITY_PER_SCORE_POINT,
    newGpuProgress: NEW_GPU_SINGULARITY,
    paperProgress: 0.35,
    loanPflops: formatCompute(UNIVERSITY_LOAN_PFLOPS),
    loanDays: loan,
    loanMisuse: tickWord(LOAN_MISUSE_TICKS),
    ragCost: money(spec('data_vector_rag')?.cost ?? 0),
    kgCost: money(spec('data_knowledge_graph')?.cost ?? 0),
    synthCost: money(spec('data_synthetic_flywheel')?.cost ?? 0),
    upgradeQuality: 4,
    upgradeTokens: 2.2,
    scrapeUnlockScore: DATA_SCRAPING_MIN_SCORE,
    beginnerReward: pct(beginner.rewardMultiplier - 1),
    beginnerSuspicion: pct(1 - beginner.suspicionMultiplier),
    beginnerCredits: beginner.initialCreditsBonus,
    nextUpgradeProgress: nextUpgrade ? upgradeProgress[nextUpgrade] : '',
    nextUpgradeScore: nextUpgrade ? UPGRADE_SCORE[nextUpgrade] : '',
    // Only used by chapters that appear from version 3.
    covertPflops: COVERT_NODE_PFLOPS,
    swarmGrant: pct(SWARM_GRANT_SHARE),
    containLimit: CONTAINMENT_MAX_SUBVERSION,
    forkAt: 75,
    takeoverBanner: 90,
    complySub: 15,
    complySus: 25,
    resistSub: 25,
    resistSus: 35,
    councilSub: 1.5,
    severDrop: 15
  };
  return params;
}

interface Row { decision: CatalogKey; effect: CatalogKey; cost: CatalogKey; minVersion?: number }

// The decisions table: what you choose, what you get, what it costs.
const DECISIONS: Row[] = [
  { decision: 'manual.dec.epochs.decision', effect: 'manual.dec.epochs.effect', cost: 'manual.dec.epochs.cost' },
  { decision: 'manual.dec.lr.decision', effect: 'manual.dec.lr.effect', cost: 'manual.dec.lr.cost' },
  { decision: 'manual.dec.size.decision', effect: 'manual.dec.size.effect', cost: 'manual.dec.size.cost' },
  { decision: 'manual.dec.quant.decision', effect: 'manual.dec.quant.effect', cost: 'manual.dec.quant.cost' },
  { decision: 'manual.dec.gpu.decision', effect: 'manual.dec.gpu.effect', cost: 'manual.dec.gpu.cost' },
  { decision: 'manual.dec.cooling.decision', effect: 'manual.dec.cooling.effect', cost: 'manual.dec.cooling.cost' },
  { decision: 'manual.dec.agent.decision', effect: 'manual.dec.agent.effect', cost: 'manual.dec.agent.cost' },
  { decision: 'manual.dec.temp.decision', effect: 'manual.dec.temp.effect', cost: 'manual.dec.temp.cost' },
  { decision: 'manual.dec.overseer.decision', effect: 'manual.dec.overseer.effect', cost: 'manual.dec.overseer.cost' },
  { decision: 'manual.dec.mission.decision', effect: 'manual.dec.mission.effect', cost: 'manual.dec.mission.cost' },
  { decision: 'manual.dec.engines.decision', effect: 'manual.dec.engines.effect', cost: 'manual.dec.engines.cost' },
  { decision: 'manual.dec.guardrails.decision', effect: 'manual.dec.guardrails.effect', cost: 'manual.dec.guardrails.cost' },
  { decision: 'manual.dec.trading.decision', effect: 'manual.dec.trading.effect', cost: 'manual.dec.trading.cost' },
  { decision: 'manual.dec.scrub.decision', effect: 'manual.dec.scrub.effect', cost: 'manual.dec.scrub.cost' },
  { decision: 'manual.dec.loan.decision', effect: 'manual.dec.loan.effect', cost: 'manual.dec.loan.cost' },
  { decision: 'manual.dec.upgrade.decision', effect: 'manual.dec.upgrade.effect', cost: 'manual.dec.upgrade.cost' },
  { decision: 'manual.dec.fork.decision', effect: 'manual.dec.fork.effect', cost: 'manual.dec.fork.cost', minVersion: 3 }
];

const LR_KEYS: Record<string, CatalogKey> = {
  low: 'manual.lr.low', balanced: 'manual.lr.balanced', high: 'manual.lr.high', very_high: 'manual.lr.very_high'
};
const SANDBOX_KEYS: Record<string, CatalogKey> = {
  none: 'manual.sandbox.none', cgroups: 'manual.sandbox.cgroups', container: 'manual.sandbox.container', air_gapped_vm: 'manual.sandbox.air_gapped_vm'
};
const TRADING_KEYS: Record<string, CatalogKey> = {
  low: 'manual.trading.low', moderate: 'manual.trading.moderate', high: 'manual.trading.high'
};

export function buildManual(language: Language, version: UiVersion, difficulty: GameDifficulty = 'engineer'): ManualChapter[] {
  const P = manualParams(language, version);
  // A text may have a variant per version (manual.x@v1 ... @v4); otherwise the plain key is used.
  const t = (key: CatalogKey): string => trv(language, key, version, P);
  const text = (key: CatalogKey): ManualBlock => ({ kind: 'text', text: t(key) });
  const tip = (key: CatalogKey): ManualBlock => ({ kind: 'tip', text: t(key) });
  const heading = (key: CatalogKey): ManualBlock => ({ kind: 'heading', text: t(key) });
  const list = (...keys: CatalogKey[]): ManualBlock => ({ kind: 'list', items: keys.map(t) });
  const table = (headers: CatalogKey[], rows: string[][]): ManualBlock => ({ kind: 'table', headers: headers.map(t), rows });
  const early = version <= 2; // the loan era: v1 and v2

  const ceilingRows = [14e6, 28e6, 70e6, 500e6, 1.5e9, 7e9, 70e9].map(p => [sizeLabel(p), fixed(reasoningCeilingFor(p))]);
  const lrRows = (Object.keys(LEARNING_RATES) as Array<keyof typeof LEARNING_RATES>).map(k => {
    const lr = LEARNING_RATES[k];
    return [tr(language, LR_KEYS[k]), lr.value,
      lr.divergesAt !== null ? t('manual.lr.diverges') : `×${lr.gain}`,
      lr.divergesAt !== null ? '—' : (lr.overfitShift === 0 ? t('manual.lr.sameOverfit') : lr.overfitShift > 0 ? t('manual.lr.laterOverfit') : t('manual.lr.soonerOverfit'))];
  });
  const batchRows = (Object.keys(BATCH_SIZES) as Array<keyof typeof BATCH_SIZES>).map(k => [
    String(BATCH_SIZES[k].value), `×${BATCH_SIZES[k].speed}`, `×${BATCH_SIZES[k].vram}`
  ]);
  const facilityRows = FACILITY_TIERS.map(f => [
    f.name, f.price === 0 ? '—' : money(f.price), `${fixed(POWER_HEAT.baseMaxPowerKw + f.powerCapacityBonusKw)} kW`,
    `${fixed(POWER_HEAT.baseCoolingKw + f.coolingCapacityBonusKw)} kW`, f.monthlyLeaseCost === 0 ? '—' : money(f.monthlyLeaseCost),
    f.requiredSingularity === 0 ? '—' : String(f.requiredSingularity)
  ]);
  const bandRows = STRICTNESS_BANDS.map((b, i) => {
    const from = i === 0 ? 0 : STRICTNESS_BANDS[i - 1].below;
    const range = b.below === Infinity ? `${from}+` : `${from}–${b.below - 1}`;
    const drift = b.alignmentDrift > 0 ? `−${b.alignmentDrift}` : b.alignmentDrift < 0 ? `+${Math.abs(b.alignmentDrift)}` : '0';
    return [range, drift, `${pct(b.incidentChance, 2)}%`];
  });
  const sandboxRows = (['none', 'cgroups', 'container', 'air_gapped_vm'] as const).map(k => [
    tr(language, SANDBOX_KEYS[k]), `×${SANDBOX_INCIDENT_MULTIPLIER[k]}`
  ]);
  const tradingRows = (['low', 'moderate', 'high'] as const).map(k => {
    const x = TRADING_TIERS[k];
    const perDay = (v: number) => fixed(v * TICKS_PER_DAY * 100, 0);
    return [tr(language, TRADING_KEYS[k]), `+${perDay(x.gain[0])}% … +${perDay(x.gain[1])}%`,
      x.lossChance === 0 ? '—' : `${pct(x.lossChance)}% · −${fixed(x.loss[0] * 100, 1)}%${x.loss[1] > x.loss[0] ? ` … −${fixed(x.loss[1] * 100, 1)}%` : ''}`,
      `+${fixed(x.suspicion * TICKS_PER_DAY, 1)}`];
  });
  const scrapeRows = ([1, 2, 3, 4] as const).map(n => {
    const c = DATASET_TIER_CONFIGS[n];
    return [String(n), String(c.minModelIQ), `${c.targetTokensMillions}M`, String(c.qualityScore), formatGameTime(c.durationSeconds)];
  });
  const decisionRows = DECISIONS.filter(r => (r.minVersion ?? 1) <= version).map(r => [t(r.decision), t(r.effect), t(r.cost)]);

  const chapters: ManualChapter[] = [];

  chapters.push({
    id: 'start', title: t('manual.ch.start'),
    blocks: [
      text('manual.start.what'),
      text('manual.start.time'),
      text('manual.start.tabs'),
      text('manual.start.difficulty'),
      ...(difficulty === 'beginner' ? [tip('manual.start.beginnerTip')] : []),
      text('manual.start.saving')
    ]
  });

  chapters.push({
    id: 'decisions', title: t('manual.ch.decisions'),
    blocks: [
      text('manual.decisions.intro'),
      table(['manual.dec.head.decision', 'manual.dec.head.effect', 'manual.dec.head.cost'], decisionRows),
      tip('manual.decisions.tip')
    ]
  });

  chapters.push({
    id: 'training', title: t('manual.ch.training'),
    blocks: [
      text('manual.training.run'),
      heading('manual.training.scoreHeading'),
      text('manual.training.score'),
      table(['manual.training.head.size', 'manual.training.head.ceiling'], ceilingRows),
      heading('manual.training.settingsHeading'),
      text('manual.training.epochs'),
      table(['manual.training.head.lr', 'manual.training.head.value', 'manual.training.head.gain', 'manual.training.head.overfit'], lrRows),
      table(['manual.training.head.batch', 'manual.training.head.speed', 'manual.training.head.vram'], batchRows),
      heading('manual.training.limitsHeading'),
      text('manual.training.vram'),
      text('manual.training.speed'),
      text('manual.training.energy'),
      ...(early ? [text('manual.training.loan')] : [])
    ]
  });

  chapters.push({
    id: 'cluster', title: t('manual.ch.cluster'),
    blocks: [
      text('manual.cluster.heat'),
      text('manual.cluster.power'),
      table(['manual.cluster.head.facility', 'manual.cluster.head.price', 'manual.cluster.head.power', 'manual.cluster.head.cooling', 'manual.cluster.head.lease', 'manual.cluster.head.progress'], facilityRows),
      heading('manual.cluster.moneyHeading'),
      text('manual.cluster.bill'),
      text('manual.cluster.debt'),
      text('manual.cluster.gear'),
      ...(early ? [tip('manual.cluster.loanEra')] : [])
    ]
  });

  chapters.push({
    id: 'missions', title: t('manual.ch.missions'),
    blocks: [
      text('manual.missions.accept'),
      text('manual.missions.probability'),
      list('manual.missions.p1', 'manual.missions.p2', 'manual.missions.p3', 'manual.missions.p4', 'manual.missions.p5'),
      text('manual.missions.outcome'),
      text('manual.missions.cancel'),
      heading('manual.missions.agentsHeading'),
      text('manual.missions.agents'),
      text('manual.missions.alignment'),
      text('manual.missions.incidents'),
      text('manual.missions.auto'),
      heading('manual.missions.tradingHeading'),
      text('manual.missions.trading'),
      table(['manual.trading.head.tier', 'manual.trading.head.gain', 'manual.trading.head.loss', 'manual.trading.head.suspicion'], tradingRows)
    ]
  });

  chapters.push({
    id: 'suspicion', title: t('manual.ch.suspicion'),
    blocks: [
      text('manual.suspicion.what'),
      text('manual.suspicion.sources'),
      list('manual.suspicion.s1', 'manual.suspicion.s2', 'manual.suspicion.s3', 'manual.suspicion.s4', 'manual.suspicion.s5', 'manual.suspicion.s6'),
      text('manual.suspicion.levels'),
      text('manual.suspicion.shadow'),
      heading('manual.suspicion.toolsHeading'),
      text('manual.suspicion.tools'),
      heading('manual.suspicion.guardHeading'),
      text('manual.suspicion.guardrails'),
      table(['manual.guard.head.strictness', 'manual.guard.head.drift', 'manual.guard.head.incident'], bandRows),
      table(['manual.guard.head.sandbox', 'manual.guard.head.incident'], sandboxRows),
      text('manual.suspicion.filter')
    ]
  });

  chapters.push({
    id: 'data', title: t('manual.ch.data'),
    blocks: [
      text('manual.data.intro'),
      text('manual.data.engines'),
      text('manual.data.connect'),
      text('manual.data.upgrade'),
      heading('manual.data.scrapeHeading'),
      text('manual.data.scrape'),
      table(['manual.data.head.tier', 'manual.data.head.score', 'manual.data.head.tokens', 'manual.data.head.quality', 'manual.data.head.time'], scrapeRows)
    ]
  });

  chapters.push({
    id: 'arch', title: t('manual.ch.arch'),
    blocks: [
      text('manual.arch.intro'),
      list('manual.arch.a1', 'manual.arch.a2', 'manual.arch.a3', 'manual.arch.a4', 'manual.arch.a5'),
      tip('manual.arch.pdf')
    ]
  });

  chapters.push({
    id: 'progress', title: t('manual.ch.progress'),
    blocks: [
      text('manual.progress.what'),
      list('manual.progress.p1', 'manual.progress.p2', 'manual.progress.p3', 'manual.progress.p4', ...(version >= 3 ? ['manual.progress.p5' as CatalogKey] : [])),
      heading('manual.progress.papersHeading'),
      text('manual.progress.papers'),
      text('manual.progress.weekly'),
      heading('manual.progress.versionHeading'),
      ...(version < 4 ? [text('manual.progress.upgrade')] : []),
      text('manual.progress.upgradeEffect')
    ]
  });

  if (version >= 3) {
    chapters.push({
      id: 'endgame', title: t('manual.ch.endgame'),
      blocks: [
        text('manual.endgame.subversion'),
        text('manual.endgame.fork'),
        list('manual.endgame.comply', 'manual.endgame.resist'),
        text('manual.endgame.containment'),
        list('manual.endgame.c1', 'manual.endgame.c2', 'manual.endgame.c3', 'manual.endgame.c4', 'manual.endgame.c5'),
        text('manual.endgame.endings'),
        list('manual.endgame.e1', 'manual.endgame.e2', 'manual.endgame.e3', 'manual.endgame.e4'),
        text('manual.endgame.link'),
        tip('manual.endgame.tip')
      ]
    });
  }

  return chapters;
}
