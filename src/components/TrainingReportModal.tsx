/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React from 'react';
import { CheckCircle2 } from 'lucide-react';
import { useGame } from '../context/GameContext';
import { localize } from '../utils/i18n';
import { sound } from '../audio/soundManager';

// Shown once when a training run converges. The operative confirms it before continuing.
export const TrainingReportModal: React.FC = () => {
  const { state, dismissTrainingReport } = useGame();
  const report = state.lastTrainingReport;
  if (!report) return null;

  const delta = report.reasoningAfter - report.reasoningBefore;

  return (
    <div className="fixed inset-0 z-[1100] flex items-center justify-center p-3 bg-black/70 backdrop-blur-sm font-mono">
      <div className="w-full max-w-md mutating-panel border rounded-lg p-5 shadow-[0_0_30px_rgba(0,255,200,0.15)] space-y-4">
        <div className="flex items-center gap-2 border-b border-current/15 pb-3">
          <CheckCircle2 className="w-5 h-5 text-emerald-500" />
          <h3 className="font-bold text-sm mutating-accent-text">
            {localize(state.language, 'ENTRENAMIENTO COMPLETADO', 'TRAINING COMPLETE')}
          </h3>
        </div>

        <div className="space-y-2 text-xs">
          <div className="flex justify-between gap-3">
            <span className="mutating-text-muted">{localize(state.language, 'Modelo', 'Model')}</span>
            <span className="font-bold">{report.modelName}</span>
          </div>
          <div className="flex justify-between gap-3">
            <span className="mutating-text-muted">{localize(state.language, 'Dataset', 'Dataset')}</span>
            <span className="font-bold text-right">{report.datasetName}</span>
          </div>
          <div className="flex justify-between gap-3">
            <span className="mutating-text-muted">{localize(state.language, 'Tipo', 'Type')}</span>
            <span className="font-bold">{report.isMicroModel ? 'Micro-Model' : 'General'}</span>
          </div>
          <div className="flex justify-between gap-3">
            <span className="mutating-text-muted">{localize(state.language, 'Puntaje de evaluación', 'Evaluation score')}</span>
            <span className="font-bold">
              {report.reasoningBefore} → {report.reasoningAfter}
              <span className={delta > 0 ? 'text-emerald-500 ml-2' : 'mutating-text-muted ml-2'}>
                {delta > 0 ? `+${delta}` : '+0'}
              </span>
            </span>
          </div>
          <div className="flex justify-between gap-3">
            <span className="mutating-text-muted">{localize(state.language, 'Techo de este tamaño', 'Ceiling for this size')}</span>
            <span className="font-bold">{report.reasoningCeiling}</span>
          </div>
          {delta === 0 && (
            <p className="text-[11px] text-amber-500 leading-snug">
              {localize(
                state.language,
                'Sin mejora: el modelo está cerca del techo de su tamaño. Para subir más necesitas más parámetros (Arquitectura) o más datos.',
                'No gain: the model is near its size ceiling. To go further you need more parameters (Architecture) or more data.'
              )}
            </p>
          )}
          <div className="flex justify-between gap-3">
            <span className="mutating-text-muted">Loss final</span>
            <span className="font-bold">{report.finalLoss.toFixed(4)}</span>
          </div>
        </div>

        <button
          type="button"
          onClick={() => {
            sound.playKeyClick();
            dismissTrainingReport();
          }}
          className="w-full py-2 rounded mutating-btn-primary font-bold text-xs cursor-pointer"
        >
          {localize(state.language, 'CONFIRMAR', 'CONFIRM')}
        </button>
      </div>
    </div>
  );
};
