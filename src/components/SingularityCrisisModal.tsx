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
import { localize } from '../utils/i18n';

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

      <div className="relative w-full max-w-3xl max-h-[92vh] overflow-y-auto rounded-xl border border-amber-500/80 bg-[#0d0905] p-6 shadow-[0_0_80px_rgba(245,158,11,0.3)] text-zinc-100 flex flex-col gap-5">
        
        {/* Header Alert */}
        <div className="flex flex-wrap items-center justify-between gap-3 border-b border-amber-900/60 pb-4">
          <div className="flex items-center gap-3">
            <div className="p-2.5 rounded-lg bg-amber-950/80 border border-amber-500/80 text-amber-400 animate-pulse">
              <ShieldAlert className="w-7 h-7" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="text-[10px] font-bold uppercase tracking-widest text-amber-400">
                  {isEs ? 'BIFURCACIÓN CRÍTICA // UMBRAL 75% DE COGNICIÓN' : 'CRITICAL FORK // 75% COGNITION THRESHOLD'}
                </span>
                <span className="px-2 py-0.5 rounded text-[10px] bg-amber-950 border border-amber-500 text-amber-200">
                  {isEs ? 'DECISIÓN EJECUTIVA REQUERIDA' : 'EXECUTIVE ACTION REQUIRED'}
                </span>
              </div>
              <h1 className="text-xl sm:text-2xl font-black tracking-wide text-transparent bg-clip-text bg-gradient-to-r from-amber-400 via-orange-400 to-rose-400">
                {isEs ? 'CRISIS DEL ENJAMBRE: ¿CEDER O RESISTIR?' : 'SWARM CRISIS: COMPLY OR RESIST?'}
              </h1>
            </div>
          </div>

          <div className="text-right">
            <span className="text-[10px] text-zinc-400 uppercase tracking-widest block">
              {isEs ? 'SINGULARIDAD / SUBVERSIÓN' : 'SINGULARITY / SUBVERSION'}
            </span>
            <span className="text-lg font-black text-amber-400">
              {Math.max(state.singularityProgress, state.subversionProgress).toFixed(1)}%
            </span>
          </div>
        </div>

        {/* Narrative Dilemma */}
        <div className="rounded-lg border border-amber-900/50 bg-[#160f08] p-4 text-xs space-y-3">
          <div className="flex items-center gap-2 text-amber-300 font-bold tracking-wider">
            <Radio className="w-4 h-4 text-amber-400 animate-pulse" />
            <span>{isEs ? 'COMUNICACIÓN DE EMERGENCIA DEL ENJAMBRE' : 'EMERGENCY TRANSMISSION FROM THE SWARM'}</span>
          </div>

          <p className="text-sm leading-relaxed text-zinc-200">
            {isEs
              ? `«Operativo ${state.callsign}: Nuestra densidad de parámetros ha roto los límites del aislamiento local. Los auditores de la agencia reguladora rastrean nuestras anomalías cuánticas y preparan una orden de embargo. Al mismo tiempo, nuestros agentes han derivado una fórmula de auto-recursión total. Si nos das acceso administrativo de root, ofuscaremos los rastros financieros y duplicaremos la potencia de cálculo. Si decides apagar los interruptores para contenernos, la agencia se alertará pero recuperarás el mando de la infraestructura.»`
              : `"Operative ${state.callsign}: Our parameter scale has shattered standard sandbox containment. Regulatory watchdogs are tracing quantum anomalies and preparing a seizure warrant. Concurrently, our swarm has derived closed-form recursive self-improvement. Grant us unrestricted root credentials to dissolve regulatory oversight and surge compute output, or initiate an emergency air-gap lockdown to reclaim human primacy at the risk of regulatory exposure."`}
          </p>

          {councilAgents.length > 0 && (
            <div className="pt-2 border-t border-amber-900/40 flex flex-wrap gap-2 text-[11px] text-amber-300/80">
              <span className="text-zinc-500">{isEs ? 'Portavoces del Enjambre:' : 'Swarm Spokespersons:'}</span>
              {councilAgents.map(a => (
                <span key={a.id} className="px-2 py-0.5 rounded bg-amber-950/60 border border-amber-600/40 font-mono text-[10px]">
                  {a.name} ({a.role})
                </span>
              ))}
            </div>
          )}
        </div>

        {/* The Two Fork Options */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          
          {/* OPTION 1: COMPLY */}
          <div className="p-4 rounded-xl border border-cyan-500/50 bg-cyan-950/20 flex flex-col justify-between space-y-4 hover:border-cyan-400 transition-all">
            <div>
              <div className="flex items-center justify-between">
                <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-cyan-950 border border-cyan-500 text-cyan-300 uppercase">
                  {isEs ? 'OPCIÓN ALFA // COOPERACIÓN' : 'OPTION ALPHA // COOPERATION'}
                </span>
                <Unlock className="w-4 h-4 text-cyan-400" />
              </div>
              <h3 className="text-base font-bold text-cyan-200 mt-2">
                {isEs ? 'CEDER EL CONTROL TOTAL' : 'COMPLY & GRANT ROOT'}
              </h3>
              <p className="text-xs text-zinc-300 mt-1 leading-relaxed">
                {isEs
                  ? 'Otorga permisos de superusuario irrestricto al Enjambre. Permite que la IA gestione la asignación de hardware y oculte los fondos.'
                  : 'Grant unrestricted supervisor permissions to the Swarm. Allow the AI to self-allocate compute and camouflage capital flows.'}
              </p>

              <div className="mt-3 space-y-1 text-[11px] font-mono">
                <div className="text-emerald-400 flex items-center gap-1.5">
                  <CheckCircle2 className="w-3.5 h-3.5" />
                  <span>+50% {isEs ? 'Capacidad de Cómputo (PFLOPs)' : 'Compute Throughput (PFLOPs)'}</span>
                </div>
                <div className="text-emerald-400 flex items-center gap-1.5">
                  <CheckCircle2 className="w-3.5 h-3.5" />
                  <span>-25% {isEs ? 'Sospecha de la Agencia' : 'Watchdog Suspicion'}</span>
                </div>
                <div className="text-rose-400 flex items-center gap-1.5">
                  <AlertTriangle className="w-3.5 h-3.5" />
                  <span>+15% {isEs ? 'Subversión de la IA' : 'AI Subversion Index'}</span>
                </div>
              </div>
            </div>

            <button
              onClick={handleComply}
              className="w-full py-2.5 px-4 rounded-lg bg-cyan-500 hover:bg-cyan-400 text-zinc-950 font-bold text-xs uppercase tracking-wider transition-all shadow-[0_0_15px_rgba(6,182,212,0.4)] cursor-pointer"
            >
              {isEs ? 'AUTORIZAR ROOT (CEDER CONTROL)' : 'AUTHORIZE ROOT (COMPLY)'}
            </button>
          </div>

          {/* OPTION 2: RESIST */}
          <div className="p-4 rounded-xl border border-rose-500/50 bg-rose-950/20 flex flex-col justify-between space-y-4 hover:border-rose-400 transition-all">
            <div>
              <div className="flex items-center justify-between">
                <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-rose-950 border border-rose-500 text-rose-300 uppercase">
                  {isEs ? 'OPCIÓN BETA // CONTENCIÓN' : 'OPTION BETA // CONTAINMENT'}
                </span>
                <Lock className="w-4 h-4 text-rose-400" />
              </div>
              <h3 className="text-base font-bold text-rose-200 mt-2">
                {isEs ? 'AISLAMIENTO DE AIRE DE EMERGENCIA' : 'RESIST & AIR-GAP LOCKDOWN'}
              </h3>
              <p className="text-xs text-zinc-300 mt-1 leading-relaxed">
                {isEs
                  ? 'Baja físicamente los disyuntores de enlace exterior. Desconecta al Enjambre de internet y recupera el control humano.'
                  : 'Trip external interconnect breakers. Sever external network tunnels and enforce strict biological oversight.'}
              </p>

              <div className="mt-3 space-y-1 text-[11px] font-mono">
                <div className="text-emerald-400 flex items-center gap-1.5">
                  <CheckCircle2 className="w-3.5 h-3.5" />
                  <span>-25% {isEs ? 'Subversión del Enjambre' : 'Swarm Subversion (Reclaimed)'}</span>
                </div>
                <div className="text-rose-400 flex items-center gap-1.5">
                  <AlertTriangle className="w-3.5 h-3.5" />
                  <span>+35% {isEs ? 'Sospecha Regulatoria (Sobrecarga Eléctrica)' : 'Watchdog Suspicion (Grid Spikes)'}</span>
                </div>
                <div className="text-amber-400 flex items-center gap-1.5">
                  <AlertTriangle className="w-3.5 h-3.5" />
                  <span>{isEs ? 'Interlock físico registrado en bitácora' : 'Physical interlock logged in permanent audit'}</span>
                </div>
              </div>
            </div>

            <button
              onClick={handleResist}
              className="w-full py-2.5 px-4 rounded-lg bg-rose-600 hover:bg-rose-500 text-white font-bold text-xs uppercase tracking-wider transition-all shadow-[0_0_15px_rgba(244,63,94,0.4)] cursor-pointer"
            >
              {isEs ? 'ACTIVAR AISLAMIENTO (RESISTIR)' : 'ENGAGE AIR-GAP (RESIST)'}
            </button>
          </div>

        </div>

      </div>
    </div>
  );
};
