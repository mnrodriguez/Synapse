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
  return (availableCompute * 100 * thermalThrottle) / (5 * trainingScale);
};

export const estimateTrainingSeconds = (
  remainingProgressPercent: number,
  progressPerTick: number
): number | null => progressPerTick > 0
  ? Math.ceil(remainingProgressPercent / progressPerTick)
  : null;

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
