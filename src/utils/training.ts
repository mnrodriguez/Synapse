// Training work is estimated with the usual rule of thumb for dense transformers: about 6 FLOPs per
// parameter per training token. A run is complete when that work has been done.
//
// One clock for the whole game: a tick is 30 game minutes (48 ticks per day), for the calendar,
// training, missions, data jobs and events alike. At 1x a tick is one real second.
//
// Training throughput is scaled to that clock: per tick, game hardware does the work a real GPU does in
// one minute (TRAINING_WORK_SECONDS_PER_TICK). Real FLOPs at a 30-minute tick would finish early runs
// instantly; with the scale a starter run takes a few game hours and bigger models take days. The covert
// node bonus is not part of this: only installed GPUs and temporary borrowed cluster capacity do the work.

// Share of peak FLOPS a small transformer sustains in practice (memory bound, data loading, optimizer).
export const TRAINING_EFFICIENCY = 0.35;
export const TRAINING_WORK_SECONDS_PER_TICK = 60;
export const GAME_MINUTES_PER_TICK = 30;
export const GAME_HOURS_PER_TICK = GAME_MINUTES_PER_TICK / 60;

export const trainingWorkFlops = (parametersCount: number, tokensCount: number): number =>
  6 * parametersCount * tokensCount;

// Peak FLOPS, in PFLOPS, contributed by installed GPUs only.
export const gpuComputePflops = (hardware: Array<{ category: string; computeTflops: number; count: number }>): number =>
  hardware.reduce((sum, item) => item.category === 'gpu' ? sum + (item.computeTflops * item.count) / 1000 : sum, 0);

export interface TrainingRateInput {
  parametersCount: number;
  tokensCount: number; // total training tokens of the run (not millions)
  gpuPflops: number;
  borrowedPflops: number;
  agentComputeDemand: number;
  reservedComputePflops: number;
  systemHeatCelsius: number;
}

// Percent of the run completed in one tick.
export const calculateTrainingProgressPerTick = ({
  parametersCount,
  tokensCount,
  gpuPflops,
  borrowedPflops,
  agentComputeDemand,
  reservedComputePflops,
  systemHeatCelsius
}: TrainingRateInput): number => {
  const thermalThrottle = systemHeatCelsius > 85 ? 0.4 : 1;
  const availableCompute = Math.max(0, gpuPflops + borrowedPflops - agentComputeDemand - reservedComputePflops);
  const flopsPerSecond = availableCompute * 1e15 * TRAINING_EFFICIENCY * thermalThrottle;
  const work = trainingWorkFlops(parametersCount, Math.max(1, tokensCount));
  if (work <= 0) return 0;
  return ((flopsPerSecond * TRAINING_WORK_SECONDS_PER_TICK) / work) * 100;
};

export const estimateTrainingSeconds = (
  remainingProgressPercent: number,
  progressPerTick: number
): number | null => progressPerTick > 0
  ? Math.ceil(remainingProgressPercent / progressPerTick)
  : null;

export const TICKS_PER_GAME_DAY = 48;

export interface TrainingDayPrediction {
  inGameDays: number;
  inGameDaysText: string;
  hardwareRuntimeText: string;
  summaryText: string;
}

export const estimateTrainingDays = (
  remainingProgressPercent: number,
  progressPerTick: number
): number | null => {
  if (progressPerTick <= 0) return null;
  const totalTicks = remainingProgressPercent / progressPerTick;
  return Number((totalTicks / TICKS_PER_GAME_DAY).toFixed(2));
};

export const formatTrainingDaysPrediction = (
  remainingProgressPercent: number,
  progressPerTick: number,
  gameSpeed: number = 1,
  language: 'en' | 'es' = 'en'
): TrainingDayPrediction | null => {
  if (progressPerTick <= 0) return null;
  const totalTicks = Math.ceil(remainingProgressPercent / progressPerTick);
  const inGameDays = totalTicks / TICKS_PER_GAME_DAY;

  const inGameDaysText = inGameDays < 0.1
    ? (language === 'es' ? '< 0.1 días' : '< 0.1 days')
    : inGameDays < 1
    ? (language === 'es' ? `${inGameDays.toFixed(1)} día` : `${inGameDays.toFixed(1)} day`)
    : (language === 'es' ? `${inGameDays.toFixed(1)} días` : `${inGameDays.toFixed(1)} days`);

  const speed = Math.max(1, gameSpeed);
  const hardwareRuntimeText = formatTrainingDuration(totalTicks / speed);

  const summaryText = language === 'es'
    ? `${inGameDaysText} (~${hardwareRuntimeText} con hardware actual)`
    : `${inGameDaysText} (~${hardwareRuntimeText} with current hardware)`;

  return {
    inGameDays,
    inGameDaysText,
    hardwareRuntimeText,
    summaryText
  };
};

export const formatTrainingDuration = (seconds: number): string => {
  if (seconds < 60) return `${Math.max(0.1, seconds).toFixed(seconds < 10 ? 1 : 0)}s`;

  const totalMinutes = Math.ceil(seconds / 60);
  if (totalMinutes < 60) return `${totalMinutes}m`;
  if (totalMinutes < 1440) {
    return `${Math.floor(totalMinutes / 60)}h ${totalMinutes % 60}m`;
  }

  const totalHours = Math.ceil(totalMinutes / 60);
  return `${Math.floor(totalHours / 24)}d ${totalHours % 24}h`;
};

// A number of ticks as game time: "30 min", "3 h 30 min", "2 d 4 h".
export const formatGameTime = (ticks: number): string => {
  const minutes = Math.max(0, Math.round(ticks)) * GAME_MINUTES_PER_TICK;
  if (minutes < 60) return `${minutes} min`;
  const hours = Math.floor(minutes / 60);
  const rest = minutes % 60;
  if (hours < 24) return rest ? `${hours} h ${rest} min` : `${hours} h`;
  const days = Math.floor(hours / 24);
  const restHours = hours % 24;
  return restHours ? `${days} d ${restHours} h` : `${days} d`;
};

// Training time in game time. At 1x a tick is one real second, so the tick count is also the real
// seconds the run takes at 1x.
export const formatTrainingTime = (ticks: number | null, language: 'en' | 'es' = 'en'): string => {
  if (ticks === null) return 'N/A';
  const duration = formatGameTime(Math.ceil(ticks));
  return language === 'es' ? `${duration} de juego` : `${duration} of game time`;
};

// Evaluation score: one scale from 0 to 100, the share of the game's evaluation suite a model solves.
// Ceiling by model size: 15 · log10(params / 1M) + 8 (14M → 25, 1B → 53, 500B → 93). 100 is never reached:
// it stands for saturating the suite. Missions and upgrades are calibrated so each stays reachable.
export const reasoningCeilingFor = (parametersCount: number): number =>
  Math.min(99, Math.max(0, 15 * Math.log10(Math.max(1, parametersCount) / 1_000_000) + 8));

// Converts a pre-0-100 save score (old "IQ" scale) to the evaluation score, capped by the model's ceiling.
export const migrateLegacyScore = (oldScore: number, parametersCount: number): number =>
  Math.round(Math.min(reasoningCeilingFor(parametersCount), Math.max(0, oldScore) / 4) * 10) / 10;

// Reasoning points gained by one completed run. Each run closes a fraction of the remaining gap to the
// ceiling (diminishing returns), and data helps less when the model is undertrained (few tokens per
// parameter). Near the ceiling the gain rounds to zero: more training no longer helps; the model is too small.
export const iqGainForRun = ({
  currentIq,
  parametersCount,
  tokensCount
}: {
  currentIq: number;
  parametersCount: number;
  tokensCount: number;
}): number => {
  const ceiling = reasoningCeilingFor(parametersCount);
  const gap = Math.max(0, ceiling - currentIq);
  const tokensPerParam = Math.max(0, tokensCount) / Math.max(1, parametersCount);
  const dataFactor = Math.min(1, 0.5 + 0.5 * Math.log10(1 + tokensPerParam) / Math.log10(21));
  // One decimal on the 0-100 scale; below 0.1 the run no longer improves the model.
  return Math.floor(gap * 0.15 * dataFactor * 10) / 10;
};

// External compute is not part of the operative's own hardware and comes in two story-specific forms:
//  - University loan (v1-v2): a student cloud quota for the first week. The audit at the end of the week
//    (or disconnecting it) ends it for good.
//  - Covert node (v3+): an illicit high-capacity link that appears with the v3 kernel and carries trace risk.
export const UNIVERSITY_LOAN_PFLOPS = 0.02; // 20 TFLOPS, about five starter GPUs
export const COVERT_NODE_PFLOPS = 80;

interface ExternalComputeState {
  uiVersion?: number;
  loanAudited?: boolean;
  covertNodeActive?: boolean;
  covertNodeSevered?: boolean;
}

export const universityLoanPflops = (s: ExternalComputeState): number =>
  (s.uiVersion ?? 1) <= 2 && !s.loanAudited ? UNIVERSITY_LOAN_PFLOPS : 0;

export const covertNodePflops = (s: ExternalComputeState): number =>
  (s.uiVersion ?? 1) >= 3 && s.covertNodeActive !== false && !s.covertNodeSevered ? COVERT_NODE_PFLOPS : 0;

export const externalComputePflops = (s: ExternalComputeState): number =>
  universityLoanPflops(s) + covertNodePflops(s);

// Compute shown with a unit that fits its size, so a starter GPU does not read as 0.0 PFLOPS.
export const formatCompute = (pflops: number, short = false): string => {
  const value = Math.max(0, pflops);
  if (value >= 1000) return `${(value / 1000).toFixed(2)}${short ? 'EF' : ' EFLOPS'}`;
  if (value >= 1) return `${value.toFixed(2)}${short ? 'PF' : ' PFLOPS'}`;
  return `${(value * 1000).toFixed(1)}${short ? 'TF' : ' TFLOPS'}`;
};

// The university loan is a one-week trial. At the end of it a usage audit runs, and access is revoked.
// Training fed by the loan for at least two in-game days counts as excessive use.
export const LOAN_TRIAL_DAYS = 7;
export const LOAN_MISUSE_TICKS = 96;
