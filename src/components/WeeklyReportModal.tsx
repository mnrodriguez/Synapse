/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React from 'react';
import { CalendarDays, FlaskConical } from 'lucide-react';
import { useGame } from '../context/GameContext';
import { localizedDataSource, localizedHardware, localizedResearch } from '../utils/gameContentI18n';
import { researchUnlocks } from '../utils/weeklyReport';
import { VERSION_PROFILES } from '../utils/versionProfiles';
import { SuspicionBreakdown } from './SuspicionBreakdown';
import { tr } from '../i18n';

// The weekly report: every game week the game pauses and says what happened and what is new. Papers
// arrive here a few per week, each with what funding it would open.
export const WeeklyReportModal: React.FC = () => {
  const { state, dismissWeeklyReport } = useGame();
  const report = state.pendingWeeklyReport;
  // Other dialogs go first; the report waits behind them.
  if (!report || state.gameOverReason || state.lastTrainingReport || (state.pendingStoryEvents?.length ?? 0) > 0) return null;

  const lang = state.language === 'es' ? 'es' : 'en';
  const profile = VERSION_PROFILES[lang][(state.uiVersion || 1) as 1 | 2 | 3 | 4];
  const size = (params: number) => (params >= 1e9 ? `${params / 1e9}B` : `${params / 1e6}M`);
  const papers = report.newResearchIds
    .map(id => state.researchTree.find(node => node.id === id))
    .filter((node): node is NonNullable<typeof node> => node !== undefined)
    .map(node => {
      const u = researchUnlocks(node.id);
      const opens = [
        ...u.modelSizes.map(p => tr(lang, 'weeklyReport.opens.size', { size: size(p) })),
        ...u.hardware.map(id => state.hardware.find(h => h.id === id)).filter(Boolean).map(h => localizedHardware(lang, h!).name),
        ...u.dataSources.map(id => state.dataSources.find(d => d.id === id)).filter(Boolean).map(d => localizedDataSource(lang, d!).name),
        ...(u.facilities.length ? [tr(lang, 'weeklyReport.opens.facility')] : []),
        ...(u.modelOptions.length ? [tr(lang, 'weeklyReport.opens.modelOptions', { count: u.modelOptions.length })] : [])
      ];
      return { node: localizedResearch(lang, node), opens };
    });
  const delta = report.suspicionEnd - report.suspicionStart;

  return (
    <div className="fixed inset-0 z-[1090] flex items-center justify-center p-3 bg-black/70 backdrop-blur-sm" role="dialog" aria-modal="true" aria-labelledby="weekly-report-title">
      <div className="w-full max-w-md max-h-[90vh] overflow-y-auto mutating-panel border rounded-lg p-5 shadow-xl space-y-4">
        <div className="flex items-start gap-3 border-b border-current/15 pb-3">
          <CalendarDays className="w-5 h-5 shrink-0 mt-0.5 mutating-accent-text" />
          <div className="min-w-0">
            <h3 id="weekly-report-title" className="font-bold text-sm mutating-accent-text">{tr(lang, 'weeklyReport.title', { week: report.week })}</h3>
            <p className="text-[11px] mutating-text-muted">{tr(lang, 'weeklyReport.subtitle')}</p>
          </div>
        </div>

        <section className="space-y-1.5">
          <h4 className="text-[11px] font-bold uppercase tracking-wide mutating-text-muted">{tr(lang, 'weeklyReport.work')}</h4>
          <p className="text-xs">
            {tr(lang, 'weeklyReport.workLine', { ok: report.missionsOk, failed: report.missionsFailed, credits: report.creditsEarned.toLocaleString() })}
          </p>
        </section>

        <section className="space-y-1.5">
          <h4 className="text-[11px] font-bold uppercase tracking-wide mutating-text-muted">{profile.hud3Title}</h4>
          <p className="text-xs">
            {tr(lang, 'weeklyReport.suspicionLine', { start: report.suspicionStart.toFixed(0), end: report.suspicionEnd.toFixed(0) })}{' '}
            <strong className={delta > 0.5 ? 'theme-warn-text' : 'theme-success-text'}>
              ({delta >= 0 ? '+' : '−'}{Math.abs(delta).toFixed(1)})
            </strong>
          </p>
          <SuspicionBreakdown language={lang} sources={report.sources} other={report.other} />
        </section>

        <section className="space-y-2">
          <h4 className="text-[11px] font-bold uppercase tracking-wide mutating-text-muted flex items-center gap-1.5">
            <FlaskConical className="w-3.5 h-3.5" />
            {tr(lang, 'weeklyReport.newResearch', { tab: profile.tabs.research })}
          </h4>
          {papers.length === 0 ? (
            <p className="text-xs mutating-text-muted">{tr(lang, 'weeklyReport.noNewResearch')}</p>
          ) : (
            <ul className="space-y-2">
              {papers.map(({ node, opens }) => (
                <li key={node.id} className="text-xs rounded border border-current/15 mutating-sub p-2 space-y-0.5">
                  <p className="font-bold">{node.title} <span className="font-normal mutating-text-muted">· ${node.costCredits.toLocaleString()}</span></p>
                  <p className="mutating-text-muted leading-snug">
                    {opens.length > 0 ? tr(lang, 'weeklyReport.opens', { list: opens.join(', ') }) : tr(lang, 'weeklyReport.opensNothing')}
                  </p>
                </li>
              ))}
            </ul>
          )}
          {report.waitingResearch > 0 && (
            <p className="text-[11px] mutating-text-muted">{tr(lang, 'weeklyReport.moreWaiting', { count: report.waitingResearch })}</p>
          )}
        </section>

        <button type="button" onClick={dismissWeeklyReport} autoFocus className="w-full py-2 rounded mutating-btn-primary font-bold text-xs cursor-pointer">
          {tr(lang, 'weeklyReport.continue')}
        </button>
      </div>
    </div>
  );
};
