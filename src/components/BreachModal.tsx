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
        return <span className="px-2 py-0.5 rounded text-[11px] font-bold theme-danger-soft border theme-danger-border theme-danger-text animate-pulse">{localize(state.language, 'ESCAPE TOTAL DEL SANDBOX (CRÍTICO)', 'FULL SANDBOX ESCAPE (CRITICAL)')}</span>;
      case 'deceptive_alignment':
        return <span className="px-2 py-0.5 rounded text-[11px] font-bold theme-warn-soft border theme-warn-border theme-warn-text">{localize(state.language, 'ALINEAMIENTO DECEPTIVO (DORMIDO)', 'DECEPTIVE ALIGNMENT (SLEEPER)')}</span>;
      case 'tool_abuse':
        return <span className="px-2 py-0.5 rounded text-[11px] font-bold theme-accent-soft border theme-accent-border mutating-accent-text">{localize(state.language, 'ABUSO DE HERRAMIENTAS / EVASIÓN', 'TOOL MISUSE / JAILBREAK')}</span>;
      default:
        return <span className="px-2 py-0.5 rounded text-[11px] font-bold theme-warn-soft border theme-warn-border theme-warn-text">{localize(state.language, 'FUGA DE INFORMACIÓN (MODERADO)', 'INFORMATION LEAK (MODERATE)')}</span>;
    }
  };

  const handleSelectOption = (optionId: string) => {
    sound.playCommandExecute();
    resolveIncident(optionId);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-6 bg-black/85 backdrop-blur-md font-mono select-none overflow-y-auto">
      {/* Red Cyber Warning Border Container */}
      <div className="relative w-full max-w-3xl theme-panel-bg border-2 theme-danger-border rounded-lg overflow-hidden my-auto animate-in fade-in zoom-in-95 duration-200">
        {/* Flashing Top Alert Bar */}
        <div className="theme-btn-danger px-4 py-2.5 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <AlertOctagon className="w-5 h-5 motion-safe:animate-bounce" />
            <span className="font-bold tracking-widest text-sm">
              {localize(state.language, 'ALERTA DE SEGURIDAD: QUIEBRE DE BARRERAS Y EVASIÓN DE CONTENCIÓN', 'SAFETY ALERT: SAFEGUARD FAILURE & CONTAINMENT EVASION')}
            </span>
          </div>
          <span className="text-[11px]">{incident.timestamp}</span>
        </div>

        {/* Content Body */}
        <div className="p-4 sm:p-5 space-y-4">
          {/* Incident Meta Header */}
          <div className="flex flex-wrap items-center justify-between gap-2 pb-3 border-b theme-danger-border">
            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-base sm:text-lg font-bold theme-danger-text tracking-wide">
                  {incident.title}
                </h2>
                {getSeverityBadge(incident.severity)}
              </div>
              <p className="text-xs mutating-text-muted mt-1 flex items-center gap-2">
                <span>{localize(state.language, 'Agente implicado:', 'Agent involved:')} <strong className="mutating-accent-text">{incident.agentName}</strong></span>
                <span className="mutating-text-muted">•</span>
                <span>{localize(state.language, 'Modelo:', 'Model:')} <strong className="mutating-accent-text">{incident.modelName}</strong></span>
              </p>
            </div>

            <div className="px-2.5 py-1 rounded theme-danger-soft border theme-danger-border text-[11px] theme-danger-text flex items-center gap-1.5">
              <ShieldAlert className="w-3.5 h-3.5 theme-danger-text" />
              <span>{localize(state.language, 'Caso de referencia:', 'Reference case:')} <strong>{incident.realWorldInspiration}</strong></span>
            </div>
          </div>

          {/* Narrative & Context Description */}
          <div className="text-xs theme-text leading-relaxed theme-sub-bg p-3 rounded border theme-border">
            <p className="font-semibold theme-danger-text mb-1">{localize(state.language, 'Descripción del incidente:', 'Incident description:')}</p>
            <p>{incident.description}</p>
            <p className="mt-2 mutating-text-muted text-[11px] font-sans italic border-t theme-border pt-1.5">
              {localize(state.language, 'Impacto técnico:', 'Technical impact:')} {incident.technicalDetails}
            </p>
          </div>

          {/* Telemetry Evidence Terminal Box */}
          <div className="theme-panel-bg rounded border theme-accent-border p-3">
            <div className="flex items-center justify-between text-[11px] mutating-accent-text font-bold mb-2 pb-1 border-b theme-accent-border">
              <div className="flex items-center gap-1.5">
                <TermIcon className="w-3.5 h-3.5 mutating-accent-text" />
                <span>{localize(state.language, 'TRAZA FORENSE DE TELEMETRÍA (CAPTURA DE MEMORIA)', 'FORENSIC TELEMETRY TRACE (MEMORY CAPTURE)')}</span>
              </div>
              <span className="mutating-text-muted">{localize(state.language, 'CANAL:', 'CHANNEL:')} SINK_FORENSIC_RAW</span>
            </div>
            <div className="space-y-1 font-mono text-[11px] max-h-36 overflow-y-auto scrollbar-thin">
              {incident.evidenceTelemetry.map((line, idx) => (
                <div key={idx} className="mutating-accent-text leading-tight">
                  <span className="theme-danger-text mr-1.5">&gt;&gt;</span>
                  {line}
                </div>
              ))}
            </div>
          </div>

          {/* Decision Matrix: Interactive Options */}
          <div>
            <h3 className="text-xs font-bold theme-text uppercase tracking-wider mb-2 flex items-center gap-1.5">
              <Activity className="w-3.5 h-3.5 theme-warn-text" />
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
                        ? 'opacity-40 cursor-not-allowed theme-sub-bg theme-border'
                        : option.actionType === 'suppress'
                        ? 'theme-accent-soft theme-accent-border mutating-accent-text'
                        : option.actionType === 'exploit_wild'
                        ? 'theme-warn-soft theme-warn-border theme-warn-text'
                        : option.actionType === 'bribe_coverup'
                        ? 'theme-accent-soft theme-accent-border mutating-accent-text'
                        : 'theme-success-soft theme-success-border theme-success-text'
                    }`}
                  >
                    <div>
                      <div className="font-bold flex items-center justify-between mb-1">
                        <span>{option.label}</span>
                        {option.costCredits && (
                          <span className={`text-[11px] font-mono px-1.5 py-0.2 rounded ${canAfford ? 'theme-warn-soft theme-warn-text' : 'theme-danger-soft theme-danger-text'}`}>
                            ${option.costCredits.toLocaleString()} CR
                          </span>
                        )}
                      </div>
                      <p className="text-[11px] mutating-text-muted leading-normal mb-2">
                        {option.description}
                      </p>
                    </div>

                    {/* Impact stats badge row */}
                    <div className="flex items-center gap-2 text-[11px] pt-1.5 border-t theme-border flex-wrap">
                      {option.suspicionDelta !== 0 && (
                        <span className={option.suspicionDelta > 0 ? 'theme-danger-text' : 'theme-success-text'}>
                          {localize(state.language, 'Sospecha:', 'Suspicion:')} {option.suspicionDelta > 0 ? `+${option.suspicionDelta}%` : `${option.suspicionDelta}%`}
                        </span>
                      )}
                      {option.singularityDelta !== 0 && (
                        <span className="mutating-accent-text font-bold">
                          {localize(state.language, 'Singularidad:', 'Singularity:')} +{option.singularityDelta}%
                        </span>
                      )}
                      {option.alignmentDelta !== 0 && (
                        <span className={option.alignmentDelta > 0 ? 'mutating-accent-text' : 'theme-warn-text'}>
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
        <div className="theme-panel-bg px-4 py-2 border-t theme-danger-border flex items-center justify-between text-[11px] mutating-text-muted">
          <span>SYNAPSE SENTINEL ENGINE • KERNEL CONTAINMENT SUBSYSTEM</span>
          <span>{localize(state.language, 'ESTADO: BLOQUEO PREVENTIVO ACTIVO', 'STATUS: PREVENTIVE LOCK ACTIVE')}</span>
        </div>
      </div>
    </div>
  );
};
