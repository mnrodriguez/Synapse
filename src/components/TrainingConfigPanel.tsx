/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState } from 'react';
import { SlidersHorizontal, AlertTriangle, Info, Zap } from 'lucide-react';
import { useGame } from '../context/GameContext';
import { localize } from '../utils/i18n';
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
    warnings.push({ tone: 'danger', text: localize(lang, `Con batch ${BATCH_SIZES[config.batchSize].value} la corrida necesita ${runVram} GB de VRAM y tienes ${totalVramGb} GB: falla por falta de memoria (OOM). Baja el batch.`, `With batch ${BATCH_SIZES[config.batchSize].value} the run needs ${runVram} GB VRAM and you have ${totalVramGb} GB: it fails out of memory (OOM). Use a smaller batch.`) });
  }
  if (config.learningRate === 'very_high') {
    warnings.push({ tone: 'danger', text: localize(lang, 'Learning rate demasiado alto: la pérdida va a explotar (divergencia) y la corrida no mejora nada.', 'Learning rate too high: the loss will explode (divergence) and the run improves nothing.') });
  } else if (config.learningRate === 'low') {
    warnings.push({ tone: 'warn', text: localize(lang, 'Learning rate bajo: el modelo aprende despacio y la corrida rinde cerca de la mitad.', 'Low learning rate: the model learns slowly and the run yields about half.') });
  }
  if (config.learningRate !== 'very_high' && config.epochs > plan.overfitEpoch) {
    warnings.push(config.earlyStopping
      ? { tone: 'info', text: localize(lang, `La validación debería empezar a subir cerca de la época ${plan.overfitEpoch.toFixed(1)}. El early stopping va a cortar ahí y conservar el mejor checkpoint.`, `Validation should start rising around epoch ${plan.overfitEpoch.toFixed(1)}. Early stopping will stop there and keep the best checkpoint.`) }
      : { tone: 'danger', text: localize(lang, `Riesgo de sobreajuste: la validación debería subir desde la época ${plan.overfitEpoch.toFixed(1)}. Sin early stopping, el modelo puede perder puntaje.`, `Overfitting risk: validation should rise from epoch ${plan.overfitEpoch.toFixed(1)}. Without early stopping the model can lose score.`) });
  }
  if (priorRuns >= 2) {
    warnings.push({ tone: 'warn', text: localize(lang, `Este modelo ya entrenó ${priorRuns} veces con este dataset y empieza a memorizarlo. Datos nuevos rinden más que repetir.`, `This model already trained ${priorRuns} times on this dataset and is starting to memorise it. New data pays off more than repeating.`) });
  }

  const lrLabel: Record<LearningRatePreset, string> = {
    low: localize(lang, 'Bajo', 'Low'),
    balanced: localize(lang, 'Equilibrado', 'Balanced'),
    high: localize(lang, 'Alto', 'High'),
    very_high: localize(lang, 'Muy alto', 'Very high')
  };
  const summary = `${config.epochs} ${config.epochs === 1 ? localize(lang, 'época', 'epoch') : localize(lang, 'épocas', 'epochs')} · LR ${lrLabel[config.learningRate].toLowerCase()} · batch ${BATCH_SIZES[config.batchSize].value} · ${config.earlyStopping ? 'early stopping' : localize(lang, 'sin early stopping', 'no early stopping')}`;
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
          {localize(lang, 'Configuración de la corrida', 'Run settings')}
        </span>
        <span className="mutating-text-muted">{summary} · <span className="mutating-accent-text">{open ? localize(lang, 'Ocultar', 'Hide') : localize(lang, 'Ajustar', 'Adjust')}</span></span>
      </button>

      {open && (
        <div className="space-y-3">
          <label className="block space-y-1">
            <span className="font-bold">{localize(lang, 'Épocas', 'Epochs')}: {config.epochs}</span>
            <input
              type="range"
              min={1}
              max={MAX_EPOCHS}
              value={config.epochs}
              onChange={e => setTrainingConfig({ epochs: Number(e.target.value) })}
              className="w-full"
            />
            <span className="block text-[11px] mutating-text-muted">
              {localize(lang, 'Cada época vuelve a pasar por todo el dataset. Repetir datos rinde menos que datos nuevos y, pasado un punto, el modelo memoriza.', 'Each epoch goes through the whole dataset again. Repeated data is worth less than new data and, past a point, the model memorises.')}
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
              {localize(lang, 'El tamaño de cada paso. Muy bajo no aprende; muy alto hace que la pérdida explote.', 'The size of each step. Too low does not learn; too high makes the loss explode.')}
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
              {localize(lang, 'Un batch más grande procesa más rápido pero ocupa más VRAM.', 'A bigger batch is faster but uses more VRAM.')}
            </span>
          </div>

          <label className="flex items-start gap-2 cursor-pointer">
            <input type="checkbox" checked={config.earlyStopping} onChange={e => setTrainingConfig({ earlyStopping: e.target.checked })} className="mt-0.5" />
            <span>
              <span className="font-bold">Early stopping</span>
              <span className="block text-[11px] mutating-text-muted">
                {localize(lang, 'Corta la corrida cuando la pérdida de validación empieza a subir y conserva el mejor checkpoint.', 'Stops the run when validation loss starts rising and keeps the best checkpoint.')}
              </span>
            </span>
          </label>
        </div>
      )}

      {/* Cost of the run before launching it */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
        <div className="p-2 rounded theme-sub-bg border theme-border">
          <span className="block text-[11px] mutating-text-muted">{localize(lang, 'Duración máxima', 'Maximum duration')}</span>
          <span className="font-bold">{formatTrainingTime(fullTicks, lang)}</span>
        </div>
        <div className="p-2 rounded theme-sub-bg border theme-border">
          <span className="block text-[11px] mutating-text-muted">{localize(lang, 'Energía de las GPU', 'GPU energy')}</span>
          <span className="font-bold flex items-center gap-1"><Zap className="w-3 h-3 theme-warn-text" />{energyKwh === null ? '—' : `${energyKwh.toFixed(2)} kWh`}</span>
        </div>
        <div className="p-2 rounded theme-sub-bg border theme-border">
          <span className="block text-[11px] mutating-text-muted">{localize(lang, 'Costo de luz (se suma a la factura)', 'Power cost (added to the bill)')}</span>
          <span className="font-bold">{energyKwh === null ? '—' : `$${(energyKwh * ELECTRICITY_RATE_PER_KWH).toFixed(2)} CR`}</span>
        </div>
      </div>
      <p className="text-[11px] mutating-text-muted">
        {localize(lang, `Datos: ${datasetTokensMillions}M tokens · calidad ${datasetQuality}/100 · ${priorRuns} corrida(s) previas de este modelo con este dataset.`, `Data: ${datasetTokensMillions}M tokens · quality ${datasetQuality}/100 · ${priorRuns} previous run(s) of this model on this dataset.`)}
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
