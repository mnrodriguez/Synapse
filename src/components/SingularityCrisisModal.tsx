/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React from 'react';
import { useGame } from '../context/GameContext';
import { 
  ShieldAlert, 
  Cpu, 
  Flame, 
  Lock, 
  Unlock, 
  Zap, 
  AlertTriangle,
  Radio,
  CheckCircle2
} from 'lucide-react';
import { sound } from '../audio/soundManager';
import { tr } from '../i18n';

export const SingularityCrisisModal: React.FC = () => {
  const { state, resolveSingularityCrisis } = useGame();
  const isEs = state.language === 'es';

  if (!state.singularityCrisisTriggered || state.singularityCrisisResolved) {
    return null;
  }

  const councilAgents = state.agents.filter(a =>
    state.swarmCouncilAgentIds?.length > 0
      ? state.swarmCouncilAgentIds.includes(a.id)
      : true
  ).slice(0, 3);

  const handleComply = () => {
    sound.playBreakthrough();
    resolveSingularityCrisis('comply');
  };

  const handleResist = () => {
    sound.playWarning();
    resolveSingularityCrisis('resist');
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/85 backdrop-blur-md p-4 font-mono select-none animate-fadeIn">
      {/* Glitch CRT Overlay */}
      <div className="pointer-events-none fixed inset-0 opacity-15 bg-[radial-gradient(#f59e0b_1px,transparent_1px)] [background-size:16px_16px]" />

      <div className="relative w-full max-w-3xl max-h-[92vh] overflow-y-auto rounded-xl border theme-warn-border theme-panel-bg p-6 theme-text flex flex-col gap-5">
        
        {/* Header Alert */}
        <div className="flex flex-wrap items-center justify-between gap-3 border-b theme-warn-border pb-4">
          <div className="flex items-center gap-3">
            <div className="p-2.5 rounded-lg theme-warn-soft border theme-warn-border theme-warn-text animate-pulse">
              <ShieldAlert className="w-7 h-7" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="text-[11px] font-bold uppercase tracking-widest theme-warn-text">
                  {tr((isEs ? 'es' : 'en'), 'singularityCrisisModal.criticalFork75CognitionThreshold')}
                </span>
                <span className="px-2 py-0.5 rounded text-[11px] theme-warn-soft border theme-warn-border theme-warn-text">
                  {tr((isEs ? 'es' : 'en'), 'singularityCrisisModal.executiveActionRequired')}
                </span>
              </div>
              <h1 className="text-xl sm:text-2xl font-black tracking-wide text-transparent bg-clip-text theme-gradient">
                {tr((isEs ? 'es' : 'en'), 'singularityCrisisModal.swarmCrisisComplyResist')}
              </h1>
            </div>
          </div>

          <div className="text-right">
            <span className="text-[11px] mutating-text-muted uppercase tracking-widest block">
              {tr((isEs ? 'es' : 'en'), 'singularityCrisisModal.singularitySubversion')}
            </span>
            <span className="text-lg font-black theme-warn-text">
              {Math.max(state.singularityProgress, state.subversionProgress).toFixed(1)}%
            </span>
          </div>
        </div>

        {/* Narrative Dilemma */}
        <div className="rounded-lg border theme-warn-border theme-panel-bg p-4 text-xs space-y-3">
          <div className="flex items-center gap-2 theme-warn-text font-bold tracking-wider">
            <Radio className="w-4 h-4 theme-warn-text animate-pulse" />
            <span>{tr((isEs ? 'es' : 'en'), 'singularityCrisisModal.emergencyTransmissionFromSwarm')}</span>
          </div>

          <p className="text-sm leading-relaxed theme-text">
            {tr((isEs ? 'es' : 'en'), 'singularityCrisisModal.operativeOurParameterScaleHas', { callsign: state.callsign })}
          </p>

          {councilAgents.length > 0 && (
            <div className="pt-2 border-t theme-warn-border flex flex-wrap gap-2 text-[11px] theme-warn-text">
              <span className="mutating-text-muted">{tr((isEs ? 'es' : 'en'), 'singularityCrisisModal.swarmSpokespersons')}</span>
              {councilAgents.map(a => (
                <span key={a.id} className="px-2 py-0.5 rounded theme-warn-soft border theme-warn-border font-mono text-[11px]">
                  {a.name} ({a.role})
                </span>
              ))}
            </div>
          )}
        </div>

        {/* The Two Fork Options */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          
          {/* OPTION 1: COMPLY */}
          <div className="p-4 rounded-xl border theme-accent-border theme-accent-soft flex flex-col justify-between space-y-4 transition-all">
            <div>
              <div className="flex items-center justify-between">
                <span className="px-2 py-0.5 rounded text-[11px] font-bold theme-accent-soft border theme-accent-border mutating-accent-text uppercase">
                  {tr((isEs ? 'es' : 'en'), 'singularityCrisisModal.optionAlphaCooperation')}
                </span>
                <Unlock className="w-4 h-4 mutating-accent-text" />
              </div>
              <h3 className="text-base font-bold mutating-accent-text mt-2">
                {tr((isEs ? 'es' : 'en'), 'singularityCrisisModal.complyGrantRoot')}
              </h3>
              <p className="text-xs theme-text mt-1 leading-relaxed">
                {tr((isEs ? 'es' : 'en'), 'singularityCrisisModal.grantUnrestrictedSupervisorPermissionsSwarm')}
              </p>

              <div className="mt-3 space-y-1 text-[11px] font-mono">
                <div className="theme-success-text flex items-center gap-1.5">
                  <CheckCircle2 className="w-3.5 h-3.5" />
                  <span>+50% {tr((isEs ? 'es' : 'en'), 'singularityCrisisModal.computeThroughputPflops')}</span>
                </div>
                <div className="theme-success-text flex items-center gap-1.5">
                  <CheckCircle2 className="w-3.5 h-3.5" />
                  <span>-25% {tr((isEs ? 'es' : 'en'), 'singularityCrisisModal.watchdogSuspicion')}</span>
                </div>
                <div className="theme-danger-text flex items-center gap-1.5">
                  <AlertTriangle className="w-3.5 h-3.5" />
                  <span>+15% {tr((isEs ? 'es' : 'en'), 'singularityCrisisModal.aiSubversionIndex')}</span>
                </div>
              </div>
            </div>

            <button
              onClick={handleComply}
              className="w-full py-2.5 px-4 rounded-lg mutating-btn-primary theme-on-accent font-bold text-xs uppercase tracking-wider transition-all cursor-pointer"
            >
              {tr((isEs ? 'es' : 'en'), 'singularityCrisisModal.authorizeRootComply')}
            </button>
          </div>

          {/* OPTION 2: RESIST */}
          <div className="p-4 rounded-xl border theme-danger-border theme-danger-soft flex flex-col justify-between space-y-4 transition-all">
            <div>
              <div className="flex items-center justify-between">
                <span className="px-2 py-0.5 rounded text-[11px] font-bold theme-danger-soft border theme-danger-border theme-danger-text uppercase">
                  {tr((isEs ? 'es' : 'en'), 'singularityCrisisModal.optionBetaContainment')}
                </span>
                <Lock className="w-4 h-4 theme-danger-text" />
              </div>
              <h3 className="text-base font-bold theme-danger-text mt-2">
                {tr((isEs ? 'es' : 'en'), 'singularityCrisisModal.resistAirGapLockdown')}
              </h3>
              <p className="text-xs theme-text mt-1 leading-relaxed">
                {tr((isEs ? 'es' : 'en'), 'singularityCrisisModal.tripExternalInterconnectBreakersSever')}
              </p>

              <div className="mt-3 space-y-1 text-[11px] font-mono">
                <div className="theme-success-text flex items-center gap-1.5">
                  <CheckCircle2 className="w-3.5 h-3.5" />
                  <span>-25% {tr((isEs ? 'es' : 'en'), 'singularityCrisisModal.swarmSubversionReclaimed')}</span>
                </div>
                <div className="theme-danger-text flex items-center gap-1.5">
                  <AlertTriangle className="w-3.5 h-3.5" />
                  <span>+35% {tr((isEs ? 'es' : 'en'), 'singularityCrisisModal.watchdogSuspicionGridSpikes')}</span>
                </div>
                <div className="theme-warn-text flex items-center gap-1.5">
                  <AlertTriangle className="w-3.5 h-3.5" />
                  <span>{tr((isEs ? 'es' : 'en'), 'singularityCrisisModal.physicalInterlockLoggedPermanentAudit')}</span>
                </div>
              </div>
            </div>

            <button
              onClick={handleResist}
              className="w-full py-2.5 px-4 rounded-lg theme-btn-danger text-white font-bold text-xs uppercase tracking-wider transition-all cursor-pointer"
            >
              {tr((isEs ? 'es' : 'en'), 'singularityCrisisModal.engageAirGapResist')}
            </button>
          </div>

        </div>

      </div>
    </div>
  );
};
