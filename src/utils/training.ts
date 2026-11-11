export interface TrainingRateInput {
  parametersCount: number;
  totalComputePflops: number;
  agentComputeDemand: number;
  reservedComputePflops: number;
  systemHeatCelsius: number;
}

export const calculateTrainingProgressPerTick = ({
  parametersCount,
  totalComputePflops,
  agentComputeDemand,
  reservedComputePflops,
  systemHeatCelsius
}: TrainingRateInput): number => {
  const trainingScale = Math.sqrt(Math.max(1, parametersCount / 14_000_000));
  const thermalThrottle = systemHeatCelsius > 85 ? 0.4 : 1;
  const availableCompute = Math.max(0, totalComputePflops - agentComputeDemand - reservedComputePflops);
  // A run should take dozens of ticks on starter hardware, not one. Previously 40 PFLOPS converged in a single tick.
  return (availableCompute * 100 * thermalThrottle) / (2000 * trainingScale);
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
