/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React from 'react';
import { CheckCircle2, AlertTriangle, MinusCircle } from 'lucide-react';
import { useGame } from '../context/GameContext';
import { buildEpilogue, endingTitle, type EndingKind } from '../utils/epilogue';
import { tr } from '../i18n';

// Shown in every ending: what the player decided and which control would have changed the outcome.
export const EpilogueReport: React.FC<{ kind: EndingKind; showTitle?: boolean }> = ({ kind, showTitle = true }) => {
  const { state } = useGame();
  const entries = buildEpilogue(state);
  const { title, summary } = endingTitle(state, kind);

  return (
    <section className="rounded-lg border theme-border theme-sub-bg p-3 space-y-3 text-left" aria-label={title}>
      {showTitle && (
        <div className="space-y-1">
          <h4 className="text-sm font-bold theme-text">{title}</h4>
          <p className="text-xs theme-text leading-relaxed">{summary}</p>
        </div>
      )}
      <h5 className="text-[11px] font-bold uppercase tracking-wide mutating-text-muted">
        {tr(state.language, 'epilogueReport.decisions')}
      </h5>
      <ul className="space-y-2">
        {entries.map(entry => {
          const Icon = entry.verdict === 'safe' ? CheckCircle2 : entry.verdict === 'risky' ? AlertTriangle : MinusCircle;
          const color = entry.verdict === 'safe' ? 'theme-success-text' : entry.verdict === 'risky' ? 'theme-warn-text' : 'mutating-text-muted';
          return (
            <li key={entry.id} className="flex gap-2 text-xs">
              <Icon className={`w-4 h-4 shrink-0 mt-0.5 ${color}`} aria-hidden="true" />
              <div className="space-y-0.5">
                <p className="font-bold theme-text">{entry.title}</p>
                <p className="theme-text">{entry.choice}</p>
                <p className="mutating-text-muted leading-snug">{entry.lesson}</p>
              </div>
            </li>
          );
        })}
      </ul>
    </section>
  );
};
