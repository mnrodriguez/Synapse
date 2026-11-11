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
