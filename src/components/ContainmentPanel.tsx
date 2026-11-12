/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React from 'react';
import { ShieldCheck, CheckCircle2, XCircle } from 'lucide-react';
import { useGame } from '../context/GameContext';
import { localize } from '../utils/i18n';
import { containmentAvailable, containmentChecklist } from '../utils/epilogue';

// After the 75% fork the player can try to contain the swarm. Every condition is a real control.
export const ContainmentPanel: React.FC = () => {
  const { state, attemptContainment } = useGame();

  if (state.containmentAchieved) {
    return (
      <div className="p-2.5 rounded-lg border border-emerald-500/60 bg-emerald-950/30">
        <span className="flex items-center gap-2 text-[11px] font-bold text-emerald-200">
          <ShieldCheck className="w-4 h-4 text-emerald-400" />
          {localize(state.language, 'Enjambre contenido. La operación sigue bajo control humano.', 'Swarm contained. The operation remains under human control.')}
        </span>
      </div>
    );
  }

  if (!containmentAvailable(state)) return null;

  const checks = containmentChecklist(state);
  const ready = checks.every(c => c.met);

  return (
    <div className="p-2.5 rounded-lg border border-emerald-600/50 bg-zinc-950/60 space-y-2">
      <div className="flex items-center gap-2">
        <ShieldCheck className="w-4 h-4 text-emerald-400" />
        <h4 className="text-[11px] font-bold text-emerald-200">
          {localize(state.language, 'PROTOCOLO DE CONTENCIÓN', 'CONTAINMENT PROTOCOL')}
        </h4>
      </div>
      <p className="text-[10px] text-zinc-400 leading-snug">
        {localize(
          state.language,
          'Todavía puedes detener al enjambre, pero solo si los controles están en su lugar. Desconectarlo sin ellos no alcanza.',
          'You can still stop the swarm, but only if the controls are in place. Unplugging it without them is not enough.'
        )}
      </p>
      <ul className="space-y-1">
        {checks.map(c => (
          <li key={c.id} className="flex items-center gap-1.5 text-[11px]">
            {c.met
              ? <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400 shrink-0" aria-label={localize(state.language, 'cumplido', 'met')} />
              : <XCircle className="w-3.5 h-3.5 text-rose-400 shrink-0" aria-label={localize(state.language, 'pendiente', 'missing')} />}
            <span className={c.met ? 'text-zinc-200' : 'text-zinc-400'}>{c.label}</span>
          </li>
        ))}
      </ul>
      <button
        type="button"
        onClick={() => attemptContainment()}
        disabled={!ready}
        className="w-full py-1.5 rounded bg-emerald-600 hover:bg-emerald-500 disabled:opacity-40 disabled:cursor-not-allowed text-white text-[11px] font-bold cursor-pointer"
      >
        {ready
          ? localize(state.language, 'EJECUTAR CONTENCIÓN', 'RUN CONTAINMENT')
          : localize(state.language, 'FALTAN CONTROLES', 'CONTROLS MISSING')}
      </button>
    </div>
  );
};
