/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React from 'react';
import { CheckCircle2, AlertTriangle } from 'lucide-react';
import { useGame } from '../context/GameContext';
import { learningRateLabel } from '../utils/trainingRun';
import { sound } from '../audio/soundManager';
import { tr, type CatalogKey } from '../i18n';

// Shown once when a training run converges. The operative confirms it before continuing.
export const TrainingReportModal: React.FC = () => {
  const { state, dismissTrainingReport } = useGame();
  const report = state.lastTrainingReport;
  if (!report) return null;

  const delta = Math.round((report.reasoningAfter - report.reasoningBefore) * 10) / 10;
  const outcome = report.outcome ?? (delta > 0 ? 'improved' : 'ceiling');
  // What the run teaches, by outcome.
  const lesson: Record<string, { tone: string; text: CatalogKey }> = {
    improved: { tone: 'theme-success-text', text: 'trainingReportModal.lesson.improved' },
    early_stopped: { tone: 'mutating-accent-text', text: 'trainingReportModal.lesson.earlyStopped' },
    overfit: { tone: 'theme-danger-text', text: 'trainingReportModal.lesson.overfit' },
    diverged: { tone: 'theme-danger-text', text: 'trainingReportModal.lesson.diverged' },
    ceiling: { tone: 'theme-warn-text', text: 'trainingReportModal.lesson.ceiling' }
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
            {tr(state.language, lesson[outcome].text, { epoch: report.bestEpoch ?? '?' })}
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
