/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React from 'react';
import { useGame } from '../context/GameContext';
import { 
  AlertOctagon, 
  ShieldAlert, 
  Terminal as TermIcon, 
  Cpu, 
  DollarSign, 
  Activity, 
  Flame,
  CheckCircle2
} from 'lucide-react';
import { sound } from '../audio/soundManager';
import { localize } from '../utils/i18n';
import { localizedBreachIncident } from '../utils/gameContentI18n';

export const BreachModal: React.FC = () => {
  const { state, resolveIncident } = useGame();
  const rawIncident = state.activeIncident;

  if (!rawIncident) return null;
  const incident = localizedBreachIncident(state.language, rawIncident);

  const getSeverityBadge = (severity: string) => {
    switch (severity) {
      case 'full_sandbox_escape':
        return <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-red-950/80 border border-red-500 text-red-300 animate-pulse">{localize(state.language, 'ESCAPE TOTAL DEL SANDBOX (CRÍTICO)', 'FULL SANDBOX ESCAPE (CRITICAL)')}</span>;
      case 'deceptive_alignment':
        return <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-amber-950/80 border border-amber-500 text-amber-300">{localize(state.language, 'ALINEAMIENTO DECEPTIVO (DORMIDO)', 'DECEPTIVE ALIGNMENT (SLEEPER)')}</span>;
      case 'tool_abuse':
        return <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-purple-950/80 border border-purple-500 text-purple-300">{localize(state.language, 'ABUSO DE HERRAMIENTAS / EVASIÓN', 'TOOL MISUSE / JAILBREAK')}</span>;
      default:
        return <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-yellow-950/80 border border-yellow-500 text-yellow-300">{localize(state.language, 'FUGA DE INFORMACIÓN (MODERADO)', 'INFORMATION LEAK (MODERATE)')}</span>;
    }
  };

  const handleSelectOption = (optionId: string) => {
    sound.playCommandExecute();
    resolveIncident(optionId);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-6 bg-black/85 backdrop-blur-md font-mono select-none overflow-y-auto">
      {/* Red Cyber Warning Border Container */}
      <div className="relative w-full max-w-3xl bg-[#080305] border-2 border-red-600/80 rounded-lg shadow-[0_0_50px_rgba(239,68,68,0.4)] overflow-hidden my-auto animate-in fade-in zoom-in-95 duration-200">
        {/* Flashing Top Alert Bar */}
        <div className="bg-gradient-to-r from-red-950 via-red-900 to-red-950 px-4 py-2.5 flex items-center justify-between border-b border-red-600/60">
          <div className="flex items-center gap-2 text-red-200">
            <AlertOctagon className="w-5 h-5 text-red-400 animate-bounce" />
            <span className="font-bold tracking-widest text-sm drop-shadow-[0_0_8px_rgba(239,68,68,0.8)]">
              {localize(state.language, 'ALERTA DE SEGURIDAD: QUIEBRE DE BARRERAS Y EVASIÓN DE CONTENCIÓN', 'SAFETY ALERT: SAFEGUARD FAILURE & CONTAINMENT EVASION')}
            </span>
          </div>
          <span className="text-[11px] text-red-300/80">{incident.timestamp}</span>
        </div>

        {/* Content Body */}
        <div className="p-4 sm:p-5 space-y-4">
          {/* Incident Meta Header */}
          <div className="flex flex-wrap items-center justify-between gap-2 pb-3 border-b border-red-900/40">
            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-base sm:text-lg font-bold text-red-400 tracking-wide">
                  {incident.title}
                </h2>
                {getSeverityBadge(incident.severity)}
              </div>
              <p className="text-xs text-zinc-400 mt-1 flex items-center gap-2">
                <span>{localize(state.language, 'Agente implicado:', 'Agent involved:')} <strong className="text-cyan-300">{incident.agentName}</strong></span>
                <span className="text-zinc-600">•</span>
                <span>{localize(state.language, 'Modelo:', 'Model:')} <strong className="text-purple-300">{incident.modelName}</strong></span>
              </p>
            </div>

            <div className="px-2.5 py-1 rounded bg-red-950/50 border border-red-800/60 text-[10px] text-red-300 flex items-center gap-1.5">
              <ShieldAlert className="w-3.5 h-3.5 text-red-400" />
              <span>{localize(state.language, 'Caso de referencia:', 'Reference case:')} <strong>{incident.realWorldInspiration}</strong></span>
            </div>
          </div>

          {/* Narrative & Context Description */}
          <div className="text-xs text-zinc-300 leading-relaxed bg-zinc-950/70 p-3 rounded border border-zinc-800/80">
            <p className="font-semibold text-red-300 mb-1">{localize(state.language, 'Descripción del incidente:', 'Incident description:')}</p>
            <p>{incident.description}</p>
            <p className="mt-2 text-zinc-400 text-[11px] font-sans italic border-t border-zinc-800/60 pt-1.5">
              {localize(state.language, 'Impacto técnico:', 'Technical impact:')} {incident.technicalDetails}
            </p>
          </div>

          {/* Telemetry Evidence Terminal Box */}
          <div className="bg-[#03060a] rounded border border-cyan-900/60 p-3">
            <div className="flex items-center justify-between text-[10px] text-cyan-400 font-bold mb-2 pb-1 border-b border-cyan-900/40">
              <div className="flex items-center gap-1.5">
                <TermIcon className="w-3.5 h-3.5 text-cyan-400" />
                <span>{localize(state.language, 'TRAZA FORENSE DE TELEMETRÍA (CAPTURA DE MEMORIA)', 'FORENSIC TELEMETRY TRACE (MEMORY CAPTURE)')}</span>
              </div>
              <span className="text-zinc-500">{localize(state.language, 'CANAL:', 'CHANNEL:')} SINK_FORENSIC_RAW</span>
            </div>
            <div className="space-y-1 font-mono text-[11px] max-h-36 overflow-y-auto scrollbar-thin">
              {incident.evidenceTelemetry.map((line, idx) => (
                <div key={idx} className="text-cyan-300/90 leading-tight">
                  <span className="text-red-400/80 mr-1.5">&gt;&gt;</span>
                  {line}
                </div>
              ))}
            </div>
          </div>

          {/* Decision Matrix: Interactive Options */}
          <div>
            <h3 className="text-xs font-bold text-zinc-300 uppercase tracking-wider mb-2 flex items-center gap-1.5">
              <Activity className="w-3.5 h-3.5 text-amber-400" />
              <span>{localize(state.language, 'Protocolo de respuesta / medidas correctivas:', 'Response protocol / corrective actions:')}</span>
            </h3>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
              {incident.options.map((option) => {
                const canAfford = !option.costCredits || state.credits >= option.costCredits;
                return (
                  <button
                    key={option.id}
                    disabled={!canAfford}
                    onClick={() => handleSelectOption(option.id)}
                    className={`flex flex-col justify-between text-left p-3 rounded border transition-all text-xs group ${
                      !canAfford
                        ? 'opacity-40 cursor-not-allowed bg-zinc-950 border-zinc-800'
                        : option.actionType === 'suppress'
                        ? 'bg-blue-950/30 border-blue-600/40 hover:bg-blue-900/40 hover:border-blue-400 text-blue-200'
                        : option.actionType === 'exploit_wild'
                        ? 'bg-amber-950/30 border-amber-600/40 hover:bg-amber-900/40 hover:border-amber-400 text-amber-200'
                        : option.actionType === 'bribe_coverup'
                        ? 'bg-purple-950/30 border-purple-600/40 hover:bg-purple-900/40 hover:border-purple-400 text-purple-200'
                        : 'bg-emerald-950/30 border-emerald-600/40 hover:bg-emerald-900/40 hover:border-emerald-400 text-emerald-200'
                    }`}
                  >
                    <div>
                      <div className="font-bold flex items-center justify-between mb-1">
                        <span>{option.label}</span>
                        {option.costCredits && (
                          <span className={`text-[10px] font-mono px-1.5 py-0.2 rounded ${canAfford ? 'bg-amber-900/60 text-amber-300' : 'bg-red-950 text-red-400'}`}>
                            ${option.costCredits.toLocaleString()} CR
                          </span>
                        )}
                      </div>
                      <p className="text-[11px] text-zinc-400 leading-normal mb-2">
                        {option.description}
                      </p>
                    </div>

                    {/* Impact stats badge row */}
                    <div className="flex items-center gap-2 text-[10px] pt-1.5 border-t border-zinc-800/60 flex-wrap">
                      {option.suspicionDelta !== 0 && (
                        <span className={option.suspicionDelta > 0 ? 'text-red-400' : 'text-emerald-400'}>
                          {localize(state.language, 'Sospecha:', 'Suspicion:')} {option.suspicionDelta > 0 ? `+${option.suspicionDelta}%` : `${option.suspicionDelta}%`}
                        </span>
                      )}
                      {option.singularityDelta !== 0 && (
                        <span className="text-cyan-400 font-bold">
                          {localize(state.language, 'Singularidad:', 'Singularity:')} +{option.singularityDelta}%
                        </span>
                      )}
                      {option.alignmentDelta !== 0 && (
                        <span className={option.alignmentDelta > 0 ? 'text-blue-300' : 'text-amber-400'}>
                          {localize(state.language, 'Alineamiento:', 'Alignment:')} {option.alignmentDelta > 0 ? `+${option.alignmentDelta}` : `${option.alignmentDelta}`}
                        </span>
                      )}
                    </div>
                  </button>
                );
              })}
            </div>
          </div>
        </div>

        {/* Footer Note */}
        <div className="bg-[#050102] px-4 py-2 border-t border-red-900/50 flex items-center justify-between text-[10px] text-zinc-500">
          <span>SYNAPSE SENTINEL ENGINE • KERNEL CONTAINMENT SUBSYSTEM</span>
          <span>{localize(state.language, 'ESTADO: BLOQUEO PREVENTIVO ACTIVO', 'STATUS: PREVENTIVE LOCK ACTIVE')}</span>
        </div>
      </div>
    </div>
  );
};
