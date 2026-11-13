/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState } from 'react';
import { SlidersHorizontal, AlertTriangle, Info, Zap } from 'lucide-react';
import { useGame } from '../context/GameContext';
import { ELECTRICITY_RATE_PER_KWH } from '../utils/constants';
import { calculateTrainingProgressPerTick, gpuComputePflops, externalComputePflops, GAME_HOURS_PER_TICK, formatTrainingTime } from '../utils/training';
import {
  planTrainingRun,
  sanitizeTrainingConfig,
  vramForRun,
  BATCH_SIZES,
  LEARNING_RATES,
  MAX_EPOCHS,
  type LearningRatePreset,
  type BatchSizePreset
} from '../utils/trainingRun';
import { AGENT_COMPUTE_DEMAND_PFLOPS } from '../utils/constants';
import { tr } from '../i18n';

interface Props {
  datasetId: string;
  datasetTokensMillions: number;
  datasetQuality: number;
  totalVramGb: number;
}

// Settings of the next run and what they will cost, before launching it.
export const TrainingConfigPanel: React.FC<Props> = ({ datasetId, datasetTokensMillions, datasetQuality, totalVramGb }) => {
  const { state, setTrainingConfig } = useGame();
  const [open, setOpen] = useState(false);
  const lang = state.language;
  const config = sanitizeTrainingConfig(state.trainingConfig);
  const model = state.currentModel;
  const priorRuns = model.datasetRuns?.[datasetId] ?? 0;

  const plan = planTrainingRun({
    currentScore: model.reasoningScore,
    parametersCount: model.parametersCount,
    datasetTokens: datasetTokensMillions * 1_000_000,
    datasetQuality,
    priorRunsOnDataset: priorRuns,
    config
  });
  const perTick = BATCH_SIZES[config.batchSize].speed * calculateTrainingProgressPerTick({
    parametersCount: model.parametersCount,
    tokensCount: plan.totalTokens,
    gpuPflops: gpuComputePflops(state.hardware),
    borrowedPflops: state.borrowedComputePflops + externalComputePflops(state),
    agentComputeDemand: state.agents.filter(a => a.status !== 'quarantined').length * AGENT_COMPUTE_DEMAND_PFLOPS,
    reservedComputePflops: (state.activeGigs ?? []).reduce((sum, g) => sum + (g.computePflopsRequired || 0), 0),
    systemHeatCelsius: state.systemHeatCelsius
  });
  const fullTicks = perTick > 0 ? 100 / perTick : null;
  const gpuPowerKw = state.hardware.reduce((sum, h) => (h.category === 'gpu' ? sum + h.powerKw * h.count : sum), 0);
  const energyKwh = fullTicks === null ? null : gpuPowerKw * fullTicks * GAME_HOURS_PER_TICK;
  const runVram = vramForRun(model.vramRequiredGb, config.batchSize);

  const warnings: Array<{ tone: 'danger' | 'warn' | 'info'; text: string }> = [];
  if (runVram > totalVramGb) {
    warnings.push({ tone: 'danger', text: tr(lang, 'trainingConfigPanel.batchRunNeedsGbVram', { batchSize: BATCH_SIZES[config.batchSize].value, runVram, totalVramGb }) });
  }
  if (config.learningRate === 'very_high') {
    warnings.push({ tone: 'danger', text: tr(lang, 'trainingConfigPanel.learningRateTooHighLoss') });
  } else if (config.learningRate === 'low') {
    warnings.push({ tone: 'warn', text: tr(lang, 'trainingConfigPanel.lowLearningRateModelLearns') });
  }
  if (config.learningRate !== 'very_high' && config.epochs > plan.overfitEpoch) {
    warnings.push(config.earlyStopping
      ? { tone: 'info', text: tr(lang, 'trainingConfigPanel.validationShouldStartRisingAround', { overfitEpoch: plan.overfitEpoch.toFixed(1) }) }
      : { tone: 'danger', text: tr(lang, 'trainingConfigPanel.overfittingRiskValidationShouldRise', { overfitEpoch: plan.overfitEpoch.toFixed(1) }) });
  }
  if (priorRuns >= 2) {
    warnings.push({ tone: 'warn', text: tr(lang, 'trainingConfigPanel.modelAlreadyTrainedTimesDataset', { priorRuns }) });
  }

  const lrLabel: Record<LearningRatePreset, string> = {
    low: tr(lang, 'trainingConfigPanel.low'),
    balanced: tr(lang, 'trainingConfigPanel.balanced'),
    high: tr(lang, 'trainingConfigPanel.high'),
    very_high: tr(lang, 'trainingConfigPanel.veryHigh')
  };
  const summary = `${config.epochs} ${config.epochs === 1 ? tr(lang, 'trainingConfigPanel.epoch') : tr(lang, 'trainingConfigPanel.epochs')} · LR ${lrLabel[config.learningRate].toLowerCase()} · batch ${BATCH_SIZES[config.batchSize].value} · ${config.earlyStopping ? 'early stopping' : tr(lang, 'trainingConfigPanel.noEarlyStopping')}`;
  const segBtn = (active: boolean) =>
    `px-2 py-1 rounded text-[11px] font-bold border cursor-pointer ${active ? 'mutating-btn-primary' : 'theme-sub-bg theme-border mutating-text-muted'}`;

  return (
    <div className="p-3 rounded-lg border border-current/15 mutating-card space-y-3 text-xs">
      <button
        type="button"
        onClick={() => setOpen(o => !o)}
        aria-expanded={open}
        className="w-full flex flex-wrap items-center justify-between gap-2 text-left cursor-pointer"
      >
        <span className="flex items-center gap-2 font-bold">
          <SlidersHorizontal className="w-4 h-4 mutating-accent-text" />
          {tr(lang, 'trainingConfigPanel.runSettings')}
        </span>
        <span className="mutating-text-muted">{summary} · <span className="mutating-accent-text">{open ? tr(lang, 'trainingConfigPanel.hide') : tr(lang, 'trainingConfigPanel.adjust')}</span></span>
      </button>

      {open && (
        <div className="space-y-3">
          <label className="block space-y-1">
            <span className="font-bold">{tr(lang, 'trainingConfigPanel.epochs2')}: {config.epochs}</span>
            <input
              type="range"
              min={1}
              max={MAX_EPOCHS}
              value={config.epochs}
              onChange={e => setTrainingConfig({ epochs: Number(e.target.value) })}
              className="w-full"
            />
            <span className="block text-[11px] mutating-text-muted">
              {tr(lang, 'trainingConfigPanel.eachEpochGoesThroughWhole')}
            </span>
          </label>

          <div className="space-y-1">
            <span className="font-bold block">Learning rate</span>
            <div className="flex flex-wrap gap-1.5" role="radiogroup" aria-label="Learning rate">
              {(Object.keys(LEARNING_RATES) as LearningRatePreset[]).map(lr => (
                <button key={lr} type="button" role="radio" aria-checked={config.learningRate === lr} onClick={() => setTrainingConfig({ learningRate: lr })} className={segBtn(config.learningRate === lr)}>
                  {lrLabel[lr]} ({LEARNING_RATES[lr].value})
                </button>
              ))}
            </div>
            <span className="block text-[11px] mutating-text-muted">
              {tr(lang, 'trainingConfigPanel.sizeEachStepTooLow')}
            </span>
          </div>

          <div className="space-y-1">
            <span className="font-bold block">Batch size</span>
            <div className="flex flex-wrap gap-1.5" role="radiogroup" aria-label="Batch size">
              {(Object.keys(BATCH_SIZES) as BatchSizePreset[]).map(b => (
                <button key={b} type="button" role="radio" aria-checked={config.batchSize === b} onClick={() => setTrainingConfig({ batchSize: b })} className={segBtn(config.batchSize === b)}>
                  {BATCH_SIZES[b].value} · {vramForRun(model.vramRequiredGb, b)} GB
                </button>
              ))}
            </div>
            <span className="block text-[11px] mutating-text-muted">
              {tr(lang, 'trainingConfigPanel.biggerBatchFasterButUses')}
            </span>
          </div>

          <label className="flex items-start gap-2 cursor-pointer">
            <input type="checkbox" checked={config.earlyStopping} onChange={e => setTrainingConfig({ earlyStopping: e.target.checked })} className="mt-0.5" />
            <span>
              <span className="font-bold">Early stopping</span>
              <span className="block text-[11px] mutating-text-muted">
                {tr(lang, 'trainingConfigPanel.stopsRunWhenValidationLoss')}
              </span>
            </span>
          </label>
        </div>
      )}

      {/* Cost of the run before launching it */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
        <div className="p-2 rounded theme-sub-bg border theme-border">
          <span className="block text-[11px] mutating-text-muted">{tr(lang, 'trainingConfigPanel.maximumDuration')}</span>
          <span className="font-bold">{formatTrainingTime(fullTicks, lang)}</span>
        </div>
        <div className="p-2 rounded theme-sub-bg border theme-border">
          <span className="block text-[11px] mutating-text-muted">{tr(lang, 'trainingConfigPanel.gpuEnergy')}</span>
          <span className="font-bold flex items-center gap-1"><Zap className="w-3 h-3 theme-warn-text" />{energyKwh === null ? '—' : `${energyKwh.toFixed(2)} kWh`}</span>
        </div>
        <div className="p-2 rounded theme-sub-bg border theme-border">
          <span className="block text-[11px] mutating-text-muted">{tr(lang, 'trainingConfigPanel.powerCostAddedBill')}</span>
          <span className="font-bold">{energyKwh === null ? '—' : `$${(energyKwh * ELECTRICITY_RATE_PER_KWH).toFixed(2)} CR`}</span>
        </div>
      </div>
      <p className="text-[11px] mutating-text-muted">
        {tr(lang, 'trainingConfigPanel.dataMTokensQuality100', { datasetTokensMillions, datasetQuality, priorRuns })}
      </p>

      {warnings.length > 0 && (
        <ul className="space-y-1.5">
          {warnings.map((w, i) => {
            const Icon = w.tone === 'info' ? Info : AlertTriangle;
            const cls = w.tone === 'danger' ? 'theme-danger-text theme-danger-soft theme-danger-border' : w.tone === 'warn' ? 'theme-warn-text theme-warn-soft theme-warn-border' : 'mutating-accent-text theme-accent-soft theme-accent-border';
            return (
              <li key={i} className={`flex items-start gap-1.5 p-2 rounded border text-[11px] ${cls}`}>
                <Icon className="w-3.5 h-3.5 shrink-0 mt-0.5" aria-hidden="true" />
                <span>{w.text}</span>
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
};
