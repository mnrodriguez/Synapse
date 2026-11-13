/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { iqGainForRun, reasoningCeilingFor } from './training';
import { tr, type CatalogKey, type Language } from '../i18n';

// What happens in one training run, decided when it starts. The run then plays the curves back and
// stops at the planned epoch. The rules follow what a real run teaches:
//  - Each epoch repeats the same data, and repeated data is worth less than new data.
//  - Validation loss starts rising once the model memorises its data (overfitting). That happens sooner
//    with few tokens per parameter, low-quality data, a high learning rate, or a dataset it already saw.
//  - Early stopping notices the rise, ends the run and keeps the best checkpoint.
//  - A learning rate that is too high makes the loss explode (divergence); one that is too low barely learns.
//  - A bigger batch is faster but needs more VRAM.

export type LearningRatePreset = 'low' | 'balanced' | 'high' | 'very_high';
export type BatchSizePreset = 'small' | 'medium' | 'large';

export interface TrainingConfig {
  epochs: number; // 1 to MAX_EPOCHS
  learningRate: LearningRatePreset;
  batchSize: BatchSizePreset;
  earlyStopping: boolean;
}

export const MAX_EPOCHS = 8;

// The defaults reproduce a plain single pass, the calibration the 0-100 scale was built on.
export const DEFAULT_TRAINING_CONFIG: TrainingConfig = {
  epochs: 1,
  learningRate: 'balanced',
  batchSize: 'medium',
  earlyStopping: true
};

export const LEARNING_RATES: Record<LearningRatePreset, { value: string; gain: number; overfitShift: number; divergesAt: number | null }> = {
  low: { value: '1e-5', gain: 0.55, overfitShift: 1, divergesAt: null },
  balanced: { value: '3e-4', gain: 1, overfitShift: 0, divergesAt: null },
  high: { value: '1e-3', gain: 1.1, overfitShift: -0.7, divergesAt: null },
  very_high: { value: '1e-2', gain: 0, overfitShift: 0, divergesAt: 0.4 }
};

export const BATCH_SIZES: Record<BatchSizePreset, { value: number; speed: number; vram: number }> = {
  // The medium batch is the model's listed VRAM; a small batch frees some memory when the GPU is tight.
  small: { value: 16, speed: 0.85, vram: 0.85 },
  medium: { value: 64, speed: 1, vram: 1 },
  large: { value: 256, speed: 1.2, vram: 1.35 }
};

export type RunOutcome = 'improved' | 'early_stopped' | 'overfit' | 'diverged' | 'ceiling';

export interface RunPlanInput {
  currentScore: number;
  parametersCount: number;
  datasetTokens: number; // tokens in one pass over the dataset
  datasetQuality: number; // 0-100
  priorRunsOnDataset: number; // completed runs of this model on this dataset
  config: TrainingConfig;
}

export interface RunPlan {
  config: TrainingConfig;
  overfitEpoch: number; // validation loss starts rising here
  bestEpoch: number; // checkpoint the model keeps
  stopEpoch: number; // where the run ends (early stop or divergence), <= config.epochs
  scoreChange: number; // can be negative when the run overfits without early stopping
  outcome: RunOutcome;
  totalTokens: number; // tokens processed if the run goes the full length
  initialLoss: number;
  floorLoss: number;
}

const clamp = (v: number, lo: number, hi: number) => Math.min(hi, Math.max(lo, v));

// Repeating data: the n-th pass is worth 0.75^(n-1) of a fresh one, so 1, 1.75, 2.31, 2.73... passes.
export const effectivePasses = (epochs: number): number => 4 * (1 - Math.pow(0.75, Math.max(0, epochs)));

export const qualityFactor = (quality: number): number => 0.85 + 0.3 * clamp(quality, 0, 100) / 100;

// Points lost per epoch trained past the overfitting point, without early stopping.
export const OVERFIT_PENALTY_PER_EPOCH = 1.2;

export function overfitEpochFor(input: Omit<RunPlanInput, 'currentScore'>): number {
  const tokensPerParam = input.datasetTokens / Math.max(1, input.parametersCount);
  const base = 1.5 + 1.5 * Math.log10(1 + tokensPerParam);
  const quality = (clamp(input.datasetQuality, 0, 100) - 60) / 40;
  const memorised = 0.6 * Math.max(0, input.priorRunsOnDataset);
  return clamp(base + quality - memorised + LEARNING_RATES[input.config.learningRate].overfitShift, 0.3, MAX_EPOCHS + 2);
}

function gainUpTo(input: RunPlanInput, epochs: number): number {
  const lr = LEARNING_RATES[input.config.learningRate];
  const base = iqGainForRun({
    currentIq: input.currentScore,
    parametersCount: input.parametersCount,
    tokensCount: input.datasetTokens * effectivePasses(epochs)
  });
  // Partial first epoch (an early stop inside epoch 1) only earns its share.
  const share = Math.min(1, epochs);
  return base * share * lr.gain * qualityFactor(input.datasetQuality);
}

const round1 = (v: number) => Math.round(v * 10) / 10;

export function planTrainingRun(input: RunPlanInput): RunPlan {
  const config = { ...input.config, epochs: clamp(Math.round(input.config.epochs), 1, MAX_EPOCHS) };
  const lr = LEARNING_RATES[config.learningRate];
  const overfitEpoch = overfitEpochFor({ ...input, config });
  const ceiling = reasoningCeilingFor(input.parametersCount);
  const gapRatio = clamp((ceiling - input.currentScore) / Math.max(1, ceiling), 0, 1);
  const initialLoss = round1(2.4 + 2.4 * gapRatio);
  const floorLoss = round1(0.6 + 1.6 * gapRatio);
  const base = { config, overfitEpoch, totalTokens: input.datasetTokens * config.epochs, initialLoss, floorLoss };

  if (lr.divergesAt !== null) {
    const stopEpoch = Math.min(config.epochs, lr.divergesAt * config.epochs + 0.2);
    return { ...base, bestEpoch: 0, stopEpoch, scoreChange: 0, outcome: 'diverged' };
  }

  if (config.epochs <= overfitEpoch) {
    const scoreChange = round1(gainUpTo(input, config.epochs));
    return { ...base, bestEpoch: config.epochs, stopEpoch: config.epochs, scoreChange, outcome: scoreChange < 0.1 ? 'ceiling' : 'improved' };
  }

  // The run goes past the point where validation loss turns up.
  const best = round1(gainUpTo(input, overfitEpoch));
  if (config.earlyStopping) {
    // Patience of half an epoch: the rise has to be visible before stopping.
    const stopEpoch = Math.min(config.epochs, overfitEpoch + 0.5);
    return { ...base, bestEpoch: overfitEpoch, stopEpoch, scoreChange: Math.max(0, best), outcome: 'early_stopped' };
  }
  const excess = config.epochs - overfitEpoch;
  const scoreChange = round1(best - OVERFIT_PENALTY_PER_EPOCH * excess);
  return { ...base, bestEpoch: overfitEpoch, stopEpoch: config.epochs, scoreChange, outcome: 'overfit' };
}

// Training and validation loss at a point of the run (epoch can be fractional).
export function lossAt(plan: RunPlan, epoch: number): { train: number; val: number } {
  const { initialLoss: l0, floorLoss: floor, overfitEpoch } = plan;
  const lr = LEARNING_RATES[plan.config.learningRate];
  const speed = plan.config.learningRate === 'low' ? 0.6 : plan.config.learningRate === 'high' ? 1.5 : 1.1;
  let train = floor + (l0 - floor) * Math.exp(-speed * 2.2 * epoch);
  let val = train + 0.08 + 0.45 * Math.pow(Math.max(0, epoch - overfitEpoch), 1.2);
  if (lr.divergesAt !== null) {
    const start = lr.divergesAt * plan.config.epochs;
    if (epoch > start) {
      train = train * Math.exp(4 * (epoch - start));
      val = train * 1.1;
    }
  }
  return { train: Number(train.toFixed(4)), val: Number(val.toFixed(4)) };
}

// VRAM a run needs: weights plus activations, which grow with the batch.
export const vramForRun = (modelVramGb: number, batch: BatchSizePreset): number =>
  Number((modelVramGb * BATCH_SIZES[batch].vram).toFixed(1));

export function sanitizeTrainingConfig(value: unknown): TrainingConfig {
  const v = (value && typeof value === 'object' ? value : {}) as Partial<TrainingConfig>;
  return {
    epochs: typeof v.epochs === 'number' && Number.isFinite(v.epochs) ? clamp(Math.round(v.epochs), 1, MAX_EPOCHS) : DEFAULT_TRAINING_CONFIG.epochs,
    learningRate: v.learningRate && v.learningRate in LEARNING_RATES ? v.learningRate : DEFAULT_TRAINING_CONFIG.learningRate,
    batchSize: v.batchSize && v.batchSize in BATCH_SIZES ? v.batchSize : DEFAULT_TRAINING_CONFIG.batchSize,
    earlyStopping: typeof v.earlyStopping === 'boolean' ? v.earlyStopping : DEFAULT_TRAINING_CONFIG.earlyStopping
  };
}

const LEARNING_RATE_LABELS: Record<LearningRatePreset, CatalogKey> = {
  low: 'trainingRun.lr.low',
  balanced: 'trainingRun.lr.balanced',
  high: 'trainingRun.lr.high',
  very_high: 'trainingRun.lr.veryHigh'
};

export const learningRateLabel = (language: Language, lr: LearningRatePreset): string => tr(language, LEARNING_RATE_LABELS[lr]);
