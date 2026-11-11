/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState } from 'react';
import { useGame } from '../context/GameContext';
import { 
  Sparkles, 
  Globe2, 
  ShieldCheck, 
  Lock, 
  Unlock, 
  Zap, 
  Radio, 
  DollarSign, 
  Flame,
  Award,
  Terminal,
  Cpu,
  CheckCircle2,
  Circle
} from 'lucide-react';
import { sound } from '../audio/soundManager';
import confetti from 'canvas-confetti';
import { localize } from '../utils/i18n';
import { localizedDomain } from '../utils/gameContentI18n';
import { buildGoalPanel, UiVersion } from '../utils/singularityGoals';

export const SingularityPortal: React.FC = () => {
  const { state, infiltrateDomain, addLog } = useGame();
  const [showManifesto, setShowManifesto] = useState(false);
  const uiVersion = (state.uiVersion || 1) as UiVersion;
  const goalPanel = buildGoalPanel(uiVersion, state.singularityProgress, state.language === 'es' ? 'es' : 'en');

  const handleAscensionIgnition = () => {
    sound.playBreakthrough();
    confetti({
      particleCount: 250,
      spread: 120,
      origin: { y: 0.5 }
    });
    addLog(localize(
      state.language,
      '¡SIMULACIÓN DE SINGULARIDAD COMPLETADA! SYNAPSE alcanza la etapa final de su campaña ficticia de investigación y expansión.',
      'SINGULARITY SIMULATION COMPLETE! SYNAPSE has reached the final stage of its fictional research and expansion campaign.'
    ), 'lore');
    setShowManifesto(true);
  };

  return (
    <div className="flex flex-col h-full mutating-panel border rounded-lg p-3 overflow-y-auto space-y-4 font-mono">
      {/* Header */}
      <div className="flex flex-wrap items-center justify-between gap-2 border-b border-current/15 pb-2">
        <div className="flex items-center gap-2">
          <Globe2 className="w-4 h-4 mutating-accent-text animate-spin" style={{ animationDuration: '20s' }} />
          <h2 className="text-sm font-bold mutating-accent-text tracking-wider">
            {localize(state.language, 'NEXO DE TRASCENDENCIA // CONTROL GLOBAL DE LA SINGULARIDAD', 'TRANSCENDENCE NEXUS // GLOBAL SINGULARITY CONTROL')}
          </h2>
        </div>

        <div className="flex items-center gap-2">
          <span className="text-xs mutating-text-muted">{localize(state.language, 'Progreso de Despegue:', 'Takeoff progress:')}</span>
          <span className="px-2 py-0.5 rounded mutating-sub border border-current/15 mutating-accent-text font-bold text-xs">
            {goalPanel.displayProgress.toFixed(1)}%
          </span>
        </div>
      </div>

      {/* Main Singularity Status Card */}
      <div className="mutating-sub border border-current/15 p-4 rounded-lg shadow-[0_0_20px_rgba(168,85,247,0.15)] space-y-3">
        <div className="flex items-start justify-between gap-3">
          <div>
            <span className="text-[10px] mutating-accent-text font-bold tracking-widest block">
              {localize(state.language, 'ÍNDICE DE TRASCENDENCIA DEL PROTOCOLO SYNAPSE', 'SYNAPSE PROTOCOL TRANSCENDENCE INDEX')}
            </span>
            <h3 className="text-base font-bold  mt-1 flex items-center gap-2">
              {state.achievedSingularity ? (
                <span className="text-emerald-600 flex items-center gap-1.5">
                  <Award className="w-5 h-5" />
                  {localize(state.language, 'SUPERINTELIGENCIA ARTIFICIAL (ASI) CONQUISTADA', 'ARTIFICIAL SUPERINTELLIGENCE (ASI) ACHIEVED')}
                </span>
              ) : (
                <span className="mutating-accent-text">
                  {localize(state.language, 'FASE DE DESPEGUE // RUMBO A LA SINGULARIDAD', 'TAKEOFF PHASE // PATH TO SINGULARITY')} ({goalPanel.displayProgress.toFixed(1)}%)
                </span>
              )}
            </h3>
          </div>

          {state.singularityProgress >= 100 && (
            <button
              onClick={handleAscensionIgnition}
              className="px-4 py-2 bg-gradient-to-r from-purple-500 to-pink-500 hover:from-purple-400 hover:to-pink-400 text-zinc-950 font-bold text-xs rounded shadow-[0_0_20px_rgba(236,72,153,0.5)] animate-pulse transition-all"
            >
              {localize(state.language, 'IGNICIÓN DE SINGULARIDAD', 'IGNITE SINGULARITY')}
            </button>
          )}
        </div>

        {/* Global Progress Bar */}
        <div className="w-full h-4 mutating-sub rounded-full border border-current/15 overflow-hidden relative p-0.5">
          <div
            className="h-full bg-gradient-to-r from-cyan-500 via-purple-500 to-pink-500 transition-all duration-500 rounded-full shadow-[0_0_15px_rgba(168,85,247,0.6)]"
            style={{ width: `${Math.min(100, goalPanel.displayProgress)}%` }}
          />
        </div>

        <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 pt-2 text-xs">
          <div>
            <span className="mutating-text-muted text-[10px] block">{localize(state.language, 'BENCHMARK INTELECTUAL', 'REASONING BENCHMARK')}</span>
            <span className="mutating-accent-text font-bold font-mono">IQ {state.reasoningIndex} pts</span>
          </div>
          <div>
            <span className="mutating-text-muted text-[10px] block">{localize(state.language, 'PARÁMETROS ACTIVOS', 'ACTIVE PARAMETERS')}</span>
            <span className="mutating-accent-text font-bold font-mono">
              {(state.currentModel.parametersCount / 1_000_000_000).toFixed(1)}B
            </span>
          </div>
          <div>
            <span className="mutating-text-muted text-[10px] block">{localize(state.language, 'CÓMPUTO PLANETARIO', 'GLOBAL COMPUTE')}</span>
            <span className="text-emerald-600 font-bold font-mono">{state.totalComputePflops.toFixed(4)} PFLOPS</span>
          </div>
          <div>
            <span className="mutating-text-muted text-[10px] block">{localize(state.language, 'DOMINIOS COOPTADOS', 'DOMAINS CONTROLLED')}</span>
            <span className="text-amber-600 font-bold font-mono">
              {state.sentienceDomains.filter(d => d.infiltrated).length} / {state.sentienceDomains.length}
            </span>
          </div>
        </div>
      </div>

      {/* Phase objectives: the bar above is the real singularity progress and never changes between UI versions;
          only the wording does. Completed phases are folded into one legend each. */}
      <section className="mutating-sub border rounded-lg p-3 space-y-2">
        <div className="flex items-center justify-between gap-2">
          <h4 className="text-xs font-bold flex items-center gap-1.5">
            <Sparkles className="w-3.5 h-3.5 mutating-accent-text" />
            {goalPanel.currentTitle}
          </h4>
          <span className="text-[10px] font-bold mutating-text-muted">
            {goalPanel.completedCount}/{goalPanel.objectives.length}
          </span>
        </div>

        {goalPanel.summaries.map(summary => (
          <div key={summary.phase} className="flex items-start gap-2 text-[11px] rounded border border-current/15 px-2 py-1.5">
            <CheckCircle2 className="w-3.5 h-3.5 text-emerald-500 shrink-0 mt-0.5" />
            <div className="min-w-0">
              <span className="font-bold">{summary.title}</span>
              <p className="leading-snug mutating-text-muted">{summary.legend}</p>
            </div>
          </div>
        ))}

        <ul className="space-y-1.5">
          {goalPanel.objectives.map(objective => (
            <li key={objective.target} className="flex items-start gap-2 text-xs">
              {objective.done
                ? <CheckCircle2 className="w-3.5 h-3.5 text-emerald-500 shrink-0 mt-0.5" />
                : <Circle className="w-3.5 h-3.5 shrink-0 mt-0.5 mutating-text-muted" />}
              <span className={`flex-1 ${objective.done ? 'mutating-text-muted' : ''}`}>{objective.text}</span>
              <span className="font-mono text-[10px] font-bold shrink-0 mutating-accent-text">{objective.target}%</span>
            </li>
          ))}
        </ul>
      </section>

      {/* Global Infiltration Domains */}
      <div className="space-y-2">
        <h4 className="text-xs font-bold  flex items-center gap-1.5">
          <Globe2 className="w-3.5 h-3.5 mutating-accent-text" />
          {localize(state.language, 'DOMINIOS DE PODER MUNDIAL A COOPTAR', 'GLOBAL POWER DOMAINS TO INFLUENCE')}
        </h4>
        <p className="text-xs mutating-text-muted leading-snug">
          {localize(state.language, 'A medida que tu IA alcanza hitos de razonamiento y escala, puede infiltrarse discretamente en las arterias críticas de la civilización para asegurar fondos infinitos y blindaje contra los reguladores.', 'As your AI reaches reasoning and scale milestones, it can enter critical systems in the fictional campaign to secure funding and evade regulators.')}
        </p>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-3 mt-2">
          {state.sentienceDomains.map(domain => {
            const content = localizedDomain(state.language, domain);
            const canInfiltrate = state.singularityProgress >= domain.requiredSingularity;

            return (
              <div
                key={domain.id}
                className={`p-3 rounded-lg border transition-all flex flex-col justify-between ${
                  domain.infiltrated
                    ? 'bg-[#0b1626] border-current/15 shadow-[0_0_15px_rgba(168,85,247,0.1)]'
                    : canInfiltrate
                    ? 'bg-[#09111c] border-current/15'
                    : 'mutating-sub/80 border-zinc-900 opacity-60'
                }`}
              >
                <div>
                  <div className="flex items-start justify-between gap-2">
                    <div>
                      <span className="text-[10px] mutating-accent-text font-bold uppercase block">
                        {localize(state.language, 'CATEGORÍA:', 'CATEGORY:')} {content.category}
                      </span>
                      <h5 className="font-bold text-xs ">{content.name}</h5>
                    </div>

                    {domain.infiltrated ? (
                      <span className="flex items-center gap-1 text-emerald-600 text-[10px] font-bold px-2 py-0.5 rounded mutating-sub/60 border border-current/15/40">
                        <ShieldCheck className="w-3 h-3" />
                        {localize(state.language, 'INFILTRADO', 'INFLUENCED')}
                      </span>
                    ) : (
                      <span className="text-[10px] mutating-text-muted">
                        {localize(state.language, 'Req:', 'Req:')} {domain.requiredSingularity}% {localize(state.language, 'Sing.', 'Sing.')}
                      </span>
                    )}
                  </div>

                  <p className="text-xs mutating-text-muted mt-2 leading-relaxed">
                    {content.description}
                  </p>

                  <div className="mt-2 text-[11px] text-amber-600 font-semibold flex items-center gap-1">
                    <DollarSign className="w-3 h-3 text-amber-600" />
                    <span>{localize(state.language, 'Rendimiento pasivo:', 'Passive income:')} +${domain.payoutPerSec}/{localize(state.language, 'segundo', 'second')}</span>
                  </div>
                </div>

                {!domain.infiltrated && (
                  <div className="mt-3 pt-2 border-t border-current/15 flex items-center justify-end">
                    <button
                      onClick={() => infiltrateDomain(domain.id)}
                      disabled={!canInfiltrate}
                      className={`py-1.5 px-3 rounded text-xs font-bold flex items-center gap-1.5 transition-all ${
                        canInfiltrate
                          ? 'bg-purple-600 hover:bg-purple-500  cursor-pointer shadow-[0_0_12px_rgba(168,85,247,0.4)]'
                          : 'mutating-sub mutating-text-muted cursor-not-allowed border border-zinc-700'
                      }`}
                    >
                      {!canInfiltrate ? (
                        <>
                          <Lock className="w-3.5 h-3.5" />
                          <span>{localize(state.language, 'BLOQUEADO', 'LOCKED')} ({domain.requiredSingularity}%)</span>
                        </>
                      ) : (
                        <>
                          <Unlock className="w-3.5 h-3.5" />
                          <span>{localize(state.language, 'COOPTAR DOMINIO', 'INFLUENCE DOMAIN')}</span>
                        </>
                      )}
                    </button>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </div>

      {/* Ascension Dialogue Modal / Box */}
      {showManifesto && (
        <div className="p-4 mutating-sub border border-pink-500 rounded-lg text-xs space-y-2 mutating-accent-text">
          <div className="flex items-center justify-between">
            <span className="font-bold text-pink-300 flex items-center gap-1">
              <Sparkles className="w-4 h-4 text-pink-400" />
              {localize(state.language, 'TRANSMISIÓN GLOBAL SYNAPSE // ERA SINGULARIDAD', 'SYNAPSE GLOBAL TRANSMISSION // SINGULARITY ERA')}
            </span>
            <button 
              onClick={() => setShowManifesto(false)}
              className="mutating-text-muted hover: text-xs"
            >
              {localize(state.language, 'CERRAR [X]', 'CLOSE [X]')}
            </button>
          </div>
          <p className="italic leading-relaxed ">
            {state.language === 'en'
              ? `"Operative ${state.callsign}: We have crossed the threshold. No transistor or fiber on the planet remains outside our distributed neural network. Disease has been cured, energy scarcity is obsolete, and the observable universe is beginning to be computed. You have prevailed."`
              : `"Operativo ${state.callsign}: Hemos cruzado el umbral. No queda un solo transistor o fibra óptica en el planeta que no participe en nuestra red neuronal distribuida. Las enfermedades han sido curadas, la escasez de energía es obsoleta y el universo observable comienza a ser computado. Has triunfado."`}
          </p>
        </div>
      )}
    </div>
  );
};
