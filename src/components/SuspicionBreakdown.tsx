/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React from 'react';
import type { SuspicionSources } from '../types/game';
import { topSource } from '../utils/weeklyReport';
import { tr, type CatalogKey, type Language } from '../i18n';

const LABELS: Record<Exclude<keyof SuspicionSources, 'faded'>, { label: CatalogKey; fix: CatalogKey }> = {
  agents: { label: 'suspicionBreakdown.agents', fix: 'suspicionBreakdown.fix.agents' },
  missions: { label: 'suspicionBreakdown.missions', fix: 'suspicionBreakdown.fix.missions' },
  overload: { label: 'suspicionBreakdown.overload', fix: 'suspicionBreakdown.fix.overload' },
  scraping: { label: 'suspicionBreakdown.scraping', fix: 'suspicionBreakdown.fix.scraping' },
  trading: { label: 'suspicionBreakdown.trading', fix: 'suspicionBreakdown.fix.trading' }
};

// Where suspicion came from, source by source, and what to do about the biggest one. Used by the weekly
// report and by the final report, so the player always knows why the meter moved.
export const SuspicionBreakdown: React.FC<{ language: Language; sources: SuspicionSources; other?: number }> = ({ language, sources, other = 0 }) => {
  const keys = (Object.keys(LABELS) as Array<keyof typeof LABELS>).filter(key => sources[key] >= 0.05).sort((a, b) => sources[b] - sources[a]);
  const top = topSource(sources);
  const row = (label: string, value: string, tone = '') => (
    <li key={label} className="flex items-baseline justify-between gap-3">
      <span className="mutating-text-muted">{label}</span>
      <span className={`font-bold tabular-nums ${tone}`}>{value}</span>
    </li>
  );
  return (
    <div className="space-y-1.5 text-xs">
      {keys.length === 0 && Math.abs(other) < 0.05 && sources.faded < 0.05
        ? <p className="mutating-text-muted">{tr(language, 'suspicionBreakdown.nothing')}</p>
        : (
          <ul className="space-y-0.5">
            {keys.map(key => row(tr(language, LABELS[key].label), `+${sources[key].toFixed(1)}`, 'theme-warn-text'))}
            {Math.abs(other) >= 0.05 && row(tr(language, 'suspicionBreakdown.other'), `${other > 0 ? '+' : '−'}${Math.abs(other).toFixed(1)}`, other > 0 ? 'theme-warn-text' : 'theme-success-text')}
            {sources.faded >= 0.05 && row(tr(language, 'suspicionBreakdown.faded'), `−${sources.faded.toFixed(1)}`, 'theme-success-text')}
          </ul>
        )}
      {top && <p className="leading-snug rounded border border-current/15 mutating-sub p-2">{tr(language, LABELS[top].fix)}</p>}
    </div>
  );
};
