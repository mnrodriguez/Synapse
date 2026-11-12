/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React from 'react';
import { Mail, AlertTriangle, ShieldAlert } from 'lucide-react';
import { useGame } from '../context/GameContext';
import { localize } from '../utils/i18n';
import { storyEventText } from '../utils/storyEvents';

// One-time story dialog. The game stays paused until the player closes it.
export const StoryEventModal: React.FC = () => {
  const { state, dismissStoryEvent } = useGame();
  // The training report goes first; story dialogs wait behind it.
  if (state.lastTrainingReport) return null;
  const id = state.pendingStoryEvents?.[0];
  if (!id) return null;

  const ev = storyEventText(state.language, id);
  const remaining = (state.pendingStoryEvents?.length ?? 1) - 1;
  const Icon = ev.tone === 'danger' ? ShieldAlert : ev.tone === 'warning' ? AlertTriangle : Mail;
  const iconColor = ev.tone === 'danger' ? 'theme-danger-text' : ev.tone === 'warning' ? 'theme-warn-text' : 'mutating-accent-text';

  return (
    <div
      className="fixed inset-0 z-[1100] flex items-center justify-center p-3 bg-black/70 backdrop-blur-sm"
      role="dialog"
      aria-modal="true"
      aria-labelledby="story-event-title"
    >
      <div className="w-full max-w-md mutating-panel border rounded-lg p-5 shadow-xl space-y-4">
        <div className="flex items-start gap-3 border-b border-current/15 pb-3">
          <Icon className={`w-5 h-5 shrink-0 mt-0.5 ${iconColor}`} />
          <div className="min-w-0">
            <h3 id="story-event-title" className="font-bold text-sm mutating-accent-text">{ev.title}</h3>
            <p className="text-[11px] mutating-text-muted">{ev.sender}</p>
          </div>
        </div>

        <div className="space-y-2 text-sm leading-relaxed">
          {ev.body.map((line, i) => (
            <p key={i}>{line}</p>
          ))}
        </div>

        {ev.tip && (
          <p className="text-xs rounded border border-current/15 mutating-sub p-2 leading-snug">
            <strong>{localize(state.language, 'Qué hacer: ', 'What to do: ')}</strong>
            {ev.tip}
          </p>
        )}

        <button
          type="button"
          autoFocus
          onClick={() => dismissStoryEvent()}
          className="w-full py-2 rounded mutating-btn-primary font-bold text-xs cursor-pointer"
        >
          {ev.altAction
            ? localize(state.language, 'ACEPTAR', 'ACCEPT')
            : remaining > 0
              ? localize(state.language, `ENTENDIDO (${remaining} más)`, `GOT IT (${remaining} more)`)
              : localize(state.language, 'ENTENDIDO Y CONTINUAR', 'GOT IT, CONTINUE')}
        </button>
        {ev.altAction && (
          <button
            type="button"
            onClick={() => dismissStoryEvent(true)}
            className="w-full py-2 rounded border border-current/25 mutating-sub font-bold text-xs cursor-pointer"
          >
            {ev.altAction.label}
          </button>
        )}
      </div>
    </div>
  );
};
