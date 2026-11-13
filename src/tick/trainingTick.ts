/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import type { ActiveGig, GameState, ModelArchitecture } from '../types/game';
import { ELECTRICITY_RATE_PER_KWH } from '../utils/constants';
import {
  calculateTrainingProgressPerTick,
  estimateTrainingSeconds,
  gpuComputePflops,
  reasoningCeilingFor,
  externalComputePflops,
  GAME_HOURS_PER_TICK
} from '../utils/training';
import { planTrainingRun, lossAt, BATCH_SIZES, DEFAULT_TRAINING_CONFIG } from '../utils/trainingRun';
import { SINGULARITY_PER_SCORE_POINT } from '../utils/missionTiers';
import { localize } from '../utils/i18n';
import { effectCollector, type Random } from './effects';

export const DEFAULT_TRAINING_TOKENS = 50_000_000;

// One tick of the active training run: progress, loss curves, and the end of the run (score change,
// report, singularity progress) when it reaches its planned stopping epoch.
export interface TrainingInput {
  prev: GameState;
  activeTraining: GameState['activeTraining'];
  borrowedComputePflops: number;
  agentComputeDemand: number;
  currentActiveGigs: ActiveGig[];
  systemHeatCelsius: number;
  powerTripSeconds: number;
  singularityProgress: number;
  reasoningIndex: number;
  rand: Random;
}

export function trainingTick(input: TrainingInput) {
  const { prev, activeTraining, borrowedComputePflops, agentComputeDemand, currentActiveGigs, systemHeatCelsius, powerTripSeconds, rand } = input;
  let { singularityProgress, reasoningIndex } = input;
  const { effects, log: addLog, play } = effectCollector();
  // 5. Active Training Progress Tick
  let updatedTraining = activeTraining;
  let trainingReport: GameState['lastTrainingReport'] = null;
  let newCurrentModel = prev.currentModel;
  if (activeTraining && activeTraining.active) {
    // Step progress based on compute PFLOPS vs parameters
    const reservedForMissions = currentActiveGigs.reduce((sum, g) => sum + (g.computePflopsRequired || 0), 0);
    // Runs saved before run plans existed get the default plan.
    const plan = activeTraining.plan ?? planTrainingRun({
      currentScore: prev.currentModel.reasoningScore,
      parametersCount: prev.currentModel.parametersCount,
      datasetTokens: activeTraining.totalTokens ?? DEFAULT_TRAINING_TOKENS,
      datasetQuality: 70,
      priorRunsOnDataset: 0,
      config: DEFAULT_TRAINING_CONFIG
    });
    const progressPerTick = BATCH_SIZES[plan.config.batchSize].speed * calculateTrainingProgressPerTick({
      parametersCount: prev.currentModel.parametersCount,
      tokensCount: activeTraining.totalTokens ?? DEFAULT_TRAINING_TOKENS,
      gpuPflops: gpuComputePflops(prev.hardware),
      borrowedPflops: borrowedComputePflops + externalComputePflops(prev),
      agentComputeDemand,
      reservedComputePflops: reservedForMissions,
      systemHeatCelsius
    });
    const progressInc = powerTripSeconds > 0
      ? 0
      : progressPerTick;
    const pausedByBreaker = powerTripSeconds > 0;
    const newStep = activeTraining.step + (pausedByBreaker ? 0 : 1);
    const newProgress = Math.min(100, activeTraining.progressPercent + progressInc);
  
    // Training and validation loss follow the plan's curves, with a little noise
    // (more with a high learning rate).
    const epochNow = (newProgress / 100) * plan.config.epochs;
    const curve = lossAt(plan, epochNow);
    const jitter = (rand() - 0.5) * 0.03 * (plan.config.learningRate === 'high' ? 3 : 1);
    const newLoss = pausedByBreaker
      ? activeTraining.currentLoss
      : Math.max(0.018, curve.train + jitter);
    const newValLoss = pausedByBreaker
      ? (activeTraining.currentValLoss ?? newLoss)
      : Math.max(0.018, curve.val + jitter / 2);
    const newValHistory = pausedByBreaker
      ? (activeTraining.valLossHistory ?? [])
      : [...(activeTraining.valLossHistory ?? []).slice(-79), Number(newValLoss.toFixed(4))];
    const newPerplexity = Number(Math.exp(newLoss).toFixed(3));
    const newGradNorm = pausedByBreaker
      ? activeTraining.gradientNorm
      : Number((rand() * 0.8 + 0.2).toFixed(3));
  
    const newHistory = pausedByBreaker
      ? activeTraining.lossHistory
      : [...activeTraining.lossHistory.slice(-79), Number(newLoss.toFixed(4))];

    if (!pausedByBreaker) play('epochTick');

    // The run ends at the planned epoch: the full length, an early stop or a divergence.
    if (newProgress >= 100 || (!pausedByBreaker && epochNow >= plan.stopEpoch)) {
      if (plan.outcome === 'diverged' || plan.outcome === 'overfit') play('warning');
      else play('breakthrough');

      // Score change decided by the run plan: diminishing returns toward the size ceiling,
      // scaled by data, epochs, learning rate and quality. Overfitting without early stopping loses points.
      const bonusReasoning = plan.scoreChange;
      const upgradedModelReasoning = Math.max(0, Math.round((prev.currentModel.reasoningScore + bonusReasoning) * 10) / 10);
      const runDatasetId = activeTraining.datasetId || 'dataset_general_corpus';
      const gpuPowerKw = prev.hardware.reduce((sum, h) => h.category === 'gpu' ? sum + h.powerKw * h.count : sum, 0);
      const runHours = newStep * GAME_HOURS_PER_TICK;
      const energyKwh = Number((gpuPowerKw * runHours).toFixed(2));
    
      const isMicroModel = activeTraining.targetModelType === 'micro_model';
      const matchedDataset = prev.customDatasets.find(d => d.id === activeTraining.datasetId);
      const microProficiency = isMicroModel && matchedDataset ? 1.4 + (matchedDataset.tier * 0.3) : (isMicroModel ? 1.6 : 1.0);

      newCurrentModel = {
        ...prev.currentModel,
        reasoningScore: upgradedModelReasoning,
        modelType: isMicroModel ? 'micro_model' : 'general',
        specializedDomain: isMicroModel ? (activeTraining.datasetDomain || matchedDataset?.domain) : undefined,
        domainProficiency: microProficiency,
        trainedOnDatasetId: runDatasetId,
        datasetRuns: { ...(prev.currentModel.datasetRuns ?? {}), [runDatasetId]: (prev.currentModel.datasetRuns?.[runDatasetId] ?? 0) + 1 }
      };

      // Calculate singularity progress jump
      // Only real improvement moves the singularity: a run with no score gain adds nothing.
      const singInc = Math.min(3, Math.max(0, bonusReasoning) * SINGULARITY_PER_SCORE_POINT);
      singularityProgress = Math.min(100, singularityProgress + singInc);
      reasoningIndex = Math.max(reasoningIndex, upgradedModelReasoning);


      if (isMicroModel) {
        addLog(
          prev.language === 'en'
            ? `Micro-Model converged! [${newCurrentModel.name}] specialized in [${newCurrentModel.specializedDomain}] with a ${microProficiency.toFixed(1)}x domain reasoning multiplier.`
            : `¡El micro-modelo convergió! [${newCurrentModel.name}] se especializó en [${newCurrentModel.specializedDomain}] con un multiplicador de pericia de ${microProficiency.toFixed(1)}x.`,
          'success'
        );
      } else if (plan.outcome === 'diverged') {
        addLog(
          localize(prev.language,
            `[DIVERGENCIA] La pérdida de [${newCurrentModel.name}] explotó: el learning rate es demasiado alto. La corrida se cortó y el modelo conserva su puntaje (${upgradedModelReasoning}).`,
            `[DIVERGENCE] The loss of [${newCurrentModel.name}] exploded: the learning rate is too high. The run was stopped and the model keeps its score (${upgradedModelReasoning}).`),
          'danger'
        );
      } else if (plan.outcome === 'overfit') {
        addLog(
          localize(prev.language,
            `[SOBREAJUSTE] [${newCurrentModel.name}] memorizó el dataset: la pérdida de validación subió desde la época ${plan.overfitEpoch.toFixed(1)}. Puntaje ${bonusReasoning >= 0 ? '+' : ''}${bonusReasoning} (actual: ${upgradedModelReasoning}).`,
            `[OVERFITTING] [${newCurrentModel.name}] memorised the dataset: validation loss rose from epoch ${plan.overfitEpoch.toFixed(1)}. Score ${bonusReasoning >= 0 ? '+' : ''}${bonusReasoning} (now ${upgradedModelReasoning}).`),
          'warning'
        );
      } else {
        addLog(
          plan.outcome === 'early_stopped'
            ? localize(prev.language,
              `[EARLY STOPPING] La validación empezó a subir en la época ${plan.overfitEpoch.toFixed(1)}: la corrida se detuvo y conservó el mejor checkpoint. Puntaje +${bonusReasoning} (actual: ${upgradedModelReasoning}).`,
              `[EARLY STOPPING] Validation started rising at epoch ${plan.overfitEpoch.toFixed(1)}: the run stopped and kept the best checkpoint. Score +${bonusReasoning} (now ${upgradedModelReasoning}).`)
            : localize(prev.language,
              `¡Entrenamiento completo para [${newCurrentModel.name}]! Puntaje de evaluación +${bonusReasoning} (actual: ${upgradedModelReasoning}).`,
              `Training complete for [${newCurrentModel.name}]! Evaluation score +${bonusReasoning} (now ${upgradedModelReasoning}).`),
          'success'
        );
      }

      trainingReport = {
        modelName: newCurrentModel.name,
        datasetName: activeTraining.datasetName ?? 'General Corpus',
        isMicroModel,
        reasoningBefore: prev.currentModel.reasoningScore,
        reasoningAfter: upgradedModelReasoning,
        reasoningCeiling: Math.round(reasoningCeilingFor(prev.currentModel.parametersCount)),
        finalLoss: Number(newLoss.toFixed(4)),
        finalValLoss: Number(newValLoss.toFixed(4)),
        outcome: plan.outcome,
        epochsRun: Number(Math.min(plan.config.epochs, epochNow).toFixed(1)),
        epochsPlanned: plan.config.epochs,
        bestEpoch: Number(plan.bestEpoch.toFixed(1)),
        learningRate: plan.config.learningRate,
        energyKwh,
        energyCost: Number((energyKwh * ELECTRICITY_RATE_PER_KWH).toFixed(2))
      };
      updatedTraining = null; // finished
    } else {
      updatedTraining = {
        ...activeTraining,
        step: newStep,
        currentLoss: Number(newLoss.toFixed(4)),
        perplexity: newPerplexity,
        gradientNorm: newGradNorm,
        progressPercent: Number(newProgress.toFixed(1)),
        lossHistory: newHistory,
        valLossHistory: newValHistory,
        currentValLoss: Number(newValLoss.toFixed(4)),
        plan,
        tokensProcessed: activeTraining.tokensProcessed + (pausedByBreaker ? 0 : Math.floor((activeTraining.totalTokens ?? DEFAULT_TRAINING_TOKENS) * progressInc / 100)),
        currentEpoch: Math.min(plan.config.epochs, Math.floor(epochNow) + 1),
        timeRemainingSeconds: pausedByBreaker
          ? activeTraining.timeRemainingSeconds
          : estimateTrainingSeconds(100 - newProgress, progressInc)
      };
    }
  }


  return { updatedTraining, trainingReport, newCurrentModel: newCurrentModel as ModelArchitecture, singularityProgress, reasoningIndex, effects };
}
