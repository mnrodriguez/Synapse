// Training work is estimated with the usual rule of thumb for dense transformers: about 6 FLOPs per
// parameter per training token. A run is complete when that work has been done.
//
// Time is measured in simulated training minutes, and one game tick is one simulated minute. At 1x
// speed a tick is one real second, so a starter run lasts about as long as its real hardware would need
// in minutes, and the speed controls scale playback. The covert node bonus is not part of this: only
// installed GPUs and temporary borrowed cluster capacity do the work.

// Share of peak FLOPS a small transformer sustains in practice (memory bound, data loading, optimizer).
export const TRAINING_EFFICIENCY = 0.35;
export const SIMULATED_SECONDS_PER_TICK = 60;

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
  return ((flopsPerSecond * SIMULATED_SECONDS_PER_TICK) / work) * 100;
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

// Training time in simulated minutes (one tick is one simulated minute). At 1x speed a tick is one real
// second, so the same number of minutes is also the real time the run takes at 1x.
export const formatTrainingTime = (ticks: number | null, language: 'en' | 'es' = 'en'): string => {
  if (ticks === null) return 'N/A';
  const minutes = Math.max(0, Math.round(ticks));
  const hours = Math.floor(minutes / 60);
  const rest = minutes % 60;
  const duration = hours > 0 ? `${hours} h ${rest} min` : `${minutes} min`;
  return language === 'es' ? `${duration} de entrenamiento` : `${duration} of training`;
};

// Reasoning ceiling of a model of this size. Calibrated against the game's own mission table, so a
// 14M model can reach the first missions but the top tiers need larger architectures, as in practice.
export const reasoningCeilingFor = (parametersCount: number): number =>
  Math.max(0, 115 * Math.log10(Math.max(1, parametersCount) / 1_000_000) - 51.8);

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
  return Math.floor(gap * 0.15 * dataFactor);
};

// Temporary university loan that gives the starter cluster extra compute. It counts toward training while
// the node is active, and stops counting if it is severed.
export const COVERT_LOAN_PFLOPS = 80;
export const covertLoanPflops = (s: { covertNodeActive?: boolean; covertNodeSevered?: boolean }): number =>
  s.covertNodeActive !== false && !s.covertNodeSevered ? COVERT_LOAN_PFLOPS : 0;

// The university loan is a one-week trial. At the end of it a usage audit runs, and access is revoked.
// Training fed by the loan for at least two in-game days counts as excessive use.
export const LOAN_TRIAL_DAYS = 7;
export const LOAN_MISUSE_TICKS = 96;
