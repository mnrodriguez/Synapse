/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React from 'react';
import { ShieldCheck, CheckCircle2, XCircle } from 'lucide-react';
import { useGame } from '../context/GameContext';
import { containmentAvailable, containmentChecklist } from '../utils/epilogue';
import { tr } from '../i18n';

// After the 75% fork the player can try to contain the swarm. Every condition is a real control.
export const ContainmentPanel: React.FC = () => {
  const { state, attemptContainment } = useGame();

  if (state.containmentAchieved) {
    return (
      <div className="p-2.5 rounded-lg border theme-success-border theme-success-soft">
        <span className="flex items-center gap-2 text-[11px] font-bold theme-success-text">
          <ShieldCheck className="w-4 h-4 theme-success-text" />
          {tr(state.language, 'containmentPanel.swarmContainedOperationRemainsUnder')}
        </span>
      </div>
    );
  }

  if (!containmentAvailable(state)) return null;

  const checks = containmentChecklist(state);
  const ready = checks.every(c => c.met);

  return (
    <div className="p-2.5 rounded-lg border theme-success-border theme-sub-bg space-y-2">
      <div className="flex items-center gap-2">
        <ShieldCheck className="w-4 h-4 theme-success-text" />
        <h4 className="text-[11px] font-bold theme-success-text">
          {tr(state.language, 'containmentPanel.containmentProtocol')}
        </h4>
      </div>
      <p className="text-[11px] mutating-text-muted leading-snug">
        {tr(state.language, 'containmentPanel.youCanStillStopSwarm')}
      </p>
      <ul className="space-y-1">
        {checks.map(c => (
          <li key={c.id} className="flex items-center gap-1.5 text-[11px]">
            {c.met
              ? <CheckCircle2 className="w-3.5 h-3.5 theme-success-text shrink-0" aria-label={tr(state.language, 'containmentPanel.met')} />
              : <XCircle className="w-3.5 h-3.5 theme-danger-text shrink-0" aria-label={tr(state.language, 'containmentPanel.missing')} />}
            <span className={c.met ? 'theme-text' : 'mutating-text-muted'}>{c.label}</span>
          </li>
        ))}
      </ul>
      <button
        type="button"
        onClick={() => attemptContainment()}
        disabled={!ready}
        className="w-full py-1.5 rounded theme-btn-success disabled:opacity-40 disabled:cursor-not-allowed text-white text-[11px] font-bold cursor-pointer"
      >
        {ready
          ? tr(state.language, 'containmentPanel.runContainment')
          : tr(state.language, 'containmentPanel.controlsMissing')}
      </button>
    </div>
  );
};
