/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React from 'react';
import { CheckCircle2, AlertTriangle } from 'lucide-react';
import { useGame } from '../context/GameContext';
import { localize } from '../utils/i18n';
import { learningRateLabel } from '../utils/trainingRun';
import { sound } from '../audio/soundManager';
import { tr } from '../i18n';

// Shown once when a training run converges. The operative confirms it before continuing.
export const TrainingReportModal: React.FC = () => {
  const { state, dismissTrainingReport } = useGame();
  const report = state.lastTrainingReport;
  if (!report) return null;

  const delta = Math.round((report.reasoningAfter - report.reasoningBefore) * 10) / 10;
  const outcome = report.outcome ?? (delta > 0 ? 'improved' : 'ceiling');
  // What the run teaches, by outcome.
  const lesson: Record<string, { tone: string; es: string; en: string }> = {
    improved: { tone: 'theme-success-text', es: 'La pérdida de validación bajó junto con la de entrenamiento: el modelo generaliza.', en: 'Validation loss went down with training loss: the model generalises.' },
    early_stopped: { tone: 'mutating-accent-text', es: `La validación empezó a subir en la época ${report.bestEpoch ?? '?'}. El early stopping cortó la corrida y conservó el mejor checkpoint, así que no perdiste puntaje.`, en: `Validation started rising at epoch ${report.bestEpoch ?? '?'}. Early stopping ended the run and kept the best checkpoint, so you lost no score.` },
    overfit: { tone: 'theme-danger-text', es: `Sobreajuste: desde la época ${report.bestEpoch ?? '?'} el modelo memorizó el dataset en lugar de aprender. Usa menos épocas, activa early stopping o consigue datos nuevos.`, en: `Overfitting: from epoch ${report.bestEpoch ?? '?'} the model memorised the dataset instead of learning. Use fewer epochs, turn on early stopping or get new data.` },
    diverged: { tone: 'theme-danger-text', es: 'Divergencia: con un learning rate tan alto cada paso se pasa del mínimo y la pérdida explota. Vuelve a un learning rate equilibrado.', en: 'Divergence: with such a high learning rate each step overshoots the minimum and the loss explodes. Go back to a balanced learning rate.' },
    ceiling: { tone: 'theme-warn-text', es: 'Sin mejora: el modelo está cerca del techo de su tamaño. Para subir más necesitas más parámetros (Arquitectura) o más datos.', en: 'No gain: the model is near its size ceiling. To go further you need more parameters (Architecture) or more data.' }
  };
  const title = outcome === 'diverged'
    ? tr(state.language, 'trainingReportModal.runDiverged')
    : outcome === 'overfit'
      ? tr(state.language, 'trainingReportModal.runOverfitted')
      : tr(state.language, 'trainingReportModal.trainingComplete');

  return (
    <div className="fixed inset-0 z-[1100] flex items-center justify-center p-3 bg-black/70 backdrop-blur-sm font-mono">
      <div className="w-full max-w-md mutating-panel border rounded-lg p-5 space-y-4">
        <div className="flex items-center gap-2 border-b border-current/15 pb-3">
          {outcome === 'diverged' || outcome === 'overfit'
            ? <AlertTriangle className="w-5 h-5 theme-danger-text" />
            : <CheckCircle2 className="w-5 h-5 theme-success-text" />}
          <h3 className="font-bold text-sm mutating-accent-text">{title}</h3>
        </div>

        <div className="space-y-2 text-xs">
          <div className="flex justify-between gap-3">
            <span className="mutating-text-muted">{tr(state.language, 'trainingReportModal.model')}</span>
            <span className="font-bold">{report.modelName}</span>
          </div>
          <div className="flex justify-between gap-3">
            <span className="mutating-text-muted">{tr(state.language, 'trainingReportModal.dataset')}</span>
            <span className="font-bold text-right">{report.datasetName}</span>
          </div>
          <div className="flex justify-between gap-3">
            <span className="mutating-text-muted">{tr(state.language, 'trainingReportModal.type')}</span>
            <span className="font-bold">{report.isMicroModel ? tr(state.language, 'trainingReportModal.microModel') : 'General'}</span>
          </div>
          <div className="flex justify-between gap-3">
            <span className="mutating-text-muted">{tr(state.language, 'trainingReportModal.evaluationScore')}</span>
            <span className="font-bold">
              {report.reasoningBefore} → {report.reasoningAfter}
              <span className={delta > 0 ? 'theme-success-text ml-2' : delta < 0 ? 'theme-danger-text ml-2' : 'mutating-text-muted ml-2'}>
                {delta > 0 ? `+${delta}` : delta < 0 ? `${delta}` : '+0'}
              </span>
            </span>
          </div>
          <div className="flex justify-between gap-3">
            <span className="mutating-text-muted">{tr(state.language, 'trainingReportModal.ceilingSize')}</span>
            <span className="font-bold">{report.reasoningCeiling}</span>
          </div>
          <p className={`text-[11px] leading-snug ${lesson[outcome].tone}`}>
            {localize(state.language, lesson[outcome].es, lesson[outcome].en)}
          </p>
          {report.epochsPlanned !== undefined && (
            <div className="flex justify-between gap-3">
              <span className="mutating-text-muted">{tr(state.language, 'trainingReportModal.epochs')}</span>
              <span className="font-bold">
                {report.epochsRun} / {report.epochsPlanned}
                {report.learningRate && <span className="mutating-text-muted font-normal"> · LR {learningRateLabel(state.language, report.learningRate)}</span>}
              </span>
            </div>
          )}
          <div className="flex justify-between gap-3">
            <span className="mutating-text-muted">{tr(state.language, 'trainingReportModal.finalLoss')}</span>
            <span className="font-bold">
              {report.finalLoss.toFixed(4)}
              {report.finalValLoss !== undefined && (
                <span className="mutating-text-muted font-normal"> · {tr(state.language, 'trainingReportModal.validation')} {report.finalValLoss.toFixed(4)}</span>
              )}
            </span>
          </div>
          {report.energyKwh !== undefined && (
            <div className="flex justify-between gap-3">
              <span className="mutating-text-muted">{tr(state.language, 'trainingReportModal.gpuEnergy')}</span>
              <span className="font-bold">{report.energyKwh} kWh · ${(report.energyCost ?? 0).toFixed(2)} CR</span>
            </div>
          )}
        </div>

        <button
          type="button"
          onClick={() => {
            sound.playKeyClick();
            dismissTrainingReport();
          }}
          className="w-full py-2 rounded mutating-btn-primary font-bold text-xs cursor-pointer"
        >
          {tr(state.language, 'trainingReportModal.confirm')}
        </button>
      </div>
    </div>
  );
};
