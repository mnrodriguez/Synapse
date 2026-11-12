/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React from 'react';
import { CheckCircle2, AlertTriangle, MinusCircle } from 'lucide-react';
import { useGame } from '../context/GameContext';
import { localize } from '../utils/i18n';
import { buildEpilogue, endingTitle, type EndingKind } from '../utils/epilogue';

// Shown in every ending: what the player decided and which control would have changed the outcome.
export const EpilogueReport: React.FC<{ kind: EndingKind; showTitle?: boolean }> = ({ kind, showTitle = true }) => {
  const { state } = useGame();
  const entries = buildEpilogue(state);
  const { title, summary } = endingTitle(state, kind);

  return (
    <section className="rounded-lg border border-zinc-700 bg-zinc-950/80 p-3 space-y-3 text-left" aria-label={title}>
      {showTitle && (
        <div className="space-y-1">
          <h4 className="text-sm font-bold text-zinc-100">{title}</h4>
          <p className="text-xs text-zinc-300 leading-relaxed">{summary}</p>
        </div>
      )}
      <h5 className="text-[11px] font-bold uppercase tracking-wide text-zinc-400">
        {localize(state.language, 'Tus decisiones', 'Your decisions')}
      </h5>
      <ul className="space-y-2">
        {entries.map(entry => {
          const Icon = entry.verdict === 'safe' ? CheckCircle2 : entry.verdict === 'risky' ? AlertTriangle : MinusCircle;
          const color = entry.verdict === 'safe' ? 'text-emerald-400' : entry.verdict === 'risky' ? 'text-amber-400' : 'text-zinc-400';
          return (
            <li key={entry.id} className="flex gap-2 text-xs">
              <Icon className={`w-4 h-4 shrink-0 mt-0.5 ${color}`} aria-hidden="true" />
              <div className="space-y-0.5">
                <p className="font-bold text-zinc-100">{entry.title}</p>
                <p className="text-zinc-300">{entry.choice}</p>
                <p className="text-zinc-400 leading-snug">{entry.lesson}</p>
              </div>
            </li>
          );
        })}
      </ul>
    </section>
  );
};
