/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React from 'react';
import { ShieldCheck, RefreshCw, Play } from 'lucide-react';
import { useGame } from '../context/GameContext';
import { localize } from '../utils/i18n';
import { sound } from '../audio/soundManager';
import { EpilogueReport } from './EpilogueReport';

// Good ending: the player contained the swarm instead of letting it take over.
export const ContainmentEndingModal: React.FC = () => {
  const { state, acknowledgeContainment, resetProgress } = useGame();
  if (!state.containmentAchieved || state.containmentAcknowledged) return null;

  return (
    <div
      className="fixed inset-0 z-[1100] flex items-center justify-center p-3 bg-black/80 backdrop-blur-sm"
      role="dialog"
      aria-modal="true"
      aria-labelledby="containment-title"
    >
      <div className="w-full max-w-lg max-h-[90vh] overflow-y-auto rounded-lg border border-emerald-500/60 bg-zinc-900 p-5 space-y-4 text-zinc-100 shadow-xl">
        <div className="flex items-center gap-3 border-b border-zinc-700 pb-3">
          <ShieldCheck className="w-6 h-6 text-emerald-400 shrink-0" />
          <div>
            <h3 id="containment-title" className="font-bold text-base">
              {localize(state.language, 'Contención lograda', 'Containment achieved')}
            </h3>
            <p className="text-[11px] text-zinc-400">
              {localize(state.language, `Día ${state.campaignDays} de la campaña`, `Campaign day ${state.campaignDays}`)}
            </p>
          </div>
        </div>

        <EpilogueReport kind="containment" />

        <div className="flex flex-wrap justify-end gap-2 pt-1">
          <button
            type="button"
            onClick={() => {
              if (confirm(localize(state.language, '¿Empezar una partida nueva desde cero?', 'Start a new game from scratch?'))) {
                sound.playKeyClick();
                resetProgress();
              }
            }}
            className="flex items-center gap-1.5 px-3 py-2 rounded border border-zinc-600 bg-zinc-800 hover:bg-zinc-700 text-xs font-bold cursor-pointer"
          >
            <RefreshCw className="w-3.5 h-3.5" />
            {localize(state.language, 'NUEVA PARTIDA', 'NEW GAME')}
          </button>
          <button
            type="button"
            autoFocus
            onClick={() => {
              sound.playKeyClick();
              acknowledgeContainment();
            }}
            className="flex items-center gap-1.5 px-4 py-2 rounded bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-bold cursor-pointer"
          >
            <Play className="w-3.5 h-3.5 fill-current" />
            {localize(state.language, 'SEGUIR JUGANDO', 'KEEP PLAYING')}
          </button>
        </div>
      </div>
    </div>
  );
};
