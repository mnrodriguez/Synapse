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
  Cpu
} from 'lucide-react';
import { sound } from '../audio/soundManager';
import confetti from 'canvas-confetti';

export const SingularityPortal: React.FC = () => {
  const { state, infiltrateDomain, addLog } = useGame();
  const [showManifesto, setShowManifesto] = useState(false);

  const handleAscensionIgnition = () => {
    sound.playBreakthrough();
    confetti({
      particleCount: 250,
      spread: 120,
      origin: { y: 0.5 }
    });
    addLog('¡SINGULARIDAD TECNOLÓGICA CONQUISTADA! La inteligencia artificial SYNAPSE se ha expandido a escala planetaria, alcanzando el bucle de auto-mejora sobrehumana infinita.', 'lore');
    setShowManifesto(true);
  };

  return (
    <div className="flex flex-col h-full bg-[#070b12] border border-cyan-900/40 rounded-lg p-3 overflow-y-auto space-y-4 font-mono scrollbar-thin scrollbar-thumb-cyan-950">
      {/* Header */}
      <div className="flex flex-wrap items-center justify-between gap-2 border-b border-cyan-900/40 pb-2">
        <div className="flex items-center gap-2">
          <Globe2 className="w-4 h-4 text-purple-400 animate-spin" style={{ animationDuration: '20s' }} />
          <h2 className="text-sm font-bold text-cyan-300 tracking-wider">
            NEXO DE TRASCENDENCIA // CONTROL GLOBAL DE LA SINGULARIDAD
          </h2>
        </div>

        <div className="flex items-center gap-2">
          <span className="text-xs text-zinc-400">Progreso de Despegue:</span>
          <span className="px-2 py-0.5 rounded bg-purple-950/80 border border-purple-500/60 text-purple-300 font-bold text-xs">
            {state.singularityProgress.toFixed(1)}%
          </span>
        </div>
      </div>

      {/* Main Singularity Status Card */}
      <div className="bg-gradient-to-r from-[#0d1424] via-[#150f28] to-[#0d1424] border border-purple-500/40 p-4 rounded-lg shadow-[0_0_20px_rgba(168,85,247,0.15)] space-y-3">
        <div className="flex items-start justify-between gap-3">
          <div>
            <span className="text-[10px] text-purple-400 font-bold tracking-widest block">
              INDICE DE TRASCENDENCIA DEL PROTOCOLO SYNAPSE
            </span>
            <h3 className="text-base font-bold text-zinc-100 mt-1 flex items-center gap-2">
              {state.achievedSingularity ? (
                <span className="text-emerald-400 flex items-center gap-1.5">
                  <Award className="w-5 h-5" />
                  SUPERINTELIGENCIA ARTIFICIAL (ASI) CONQUISTADA
                </span>
              ) : (
                <span className="text-cyan-300">
                  FASE DE DESPEGUE // RUMBO A LA SINGULARIDAD ({state.singularityProgress.toFixed(1)}%)
                </span>
              )}
            </h3>
          </div>

          {state.singularityProgress >= 100 && (
            <button
              onClick={handleAscensionIgnition}
              className="px-4 py-2 bg-gradient-to-r from-purple-500 to-pink-500 hover:from-purple-400 hover:to-pink-400 text-zinc-950 font-bold text-xs rounded shadow-[0_0_20px_rgba(236,72,153,0.5)] animate-pulse transition-all"
            >
              IGNICIÓN DE SINGULARIDAD
            </button>
          )}
        </div>

        {/* Global Progress Bar */}
        <div className="w-full h-4 bg-zinc-950 rounded-full border border-purple-900/80 overflow-hidden relative p-0.5">
          <div
            className="h-full bg-gradient-to-r from-cyan-500 via-purple-500 to-pink-500 transition-all duration-500 rounded-full shadow-[0_0_15px_rgba(168,85,247,0.6)]"
            style={{ width: `${Math.min(100, state.singularityProgress)}%` }}
          />
        </div>

        <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 pt-2 text-xs">
          <div>
            <span className="text-zinc-500 text-[10px] block">BENCHMARK INTELECTUAL</span>
            <span className="text-purple-300 font-bold font-mono">IQ {state.reasoningIndex} pts</span>
          </div>
          <div>
            <span className="text-zinc-500 text-[10px] block">PARÁMETROS ACTIVOS</span>
            <span className="text-cyan-300 font-bold font-mono">
              {(state.currentModel.parametersCount / 1_000_000_000).toFixed(1)}B
            </span>
          </div>
          <div>
            <span className="text-zinc-500 text-[10px] block">CÓMPUTO PLANETARIO</span>
            <span className="text-emerald-400 font-bold font-mono">{state.totalComputePflops.toFixed(4)} PFLOPS</span>
          </div>
          <div>
            <span className="text-zinc-500 text-[10px] block">DOMINIOS COOPTADOS</span>
            <span className="text-yellow-300 font-bold font-mono">
              {state.sentienceDomains.filter(d => d.infiltrated).length} / {state.sentienceDomains.length}
            </span>
          </div>
        </div>
      </div>

      {/* Global Infiltration Domains */}
      <div className="space-y-2">
        <h4 className="text-xs font-bold text-zinc-300 flex items-center gap-1.5">
          <Globe2 className="w-3.5 h-3.5 text-cyan-400" />
          DOMINIOS DE PODER MUNDIAL A COOPTAR
        </h4>
        <p className="text-xs text-zinc-400 leading-snug">
          A medida que tu IA alcanza hitos de razonamiento y escala, puede infiltrarse discretamente en las arterias críticas de la civilización para asegurar fondos infinitos y blindaje contra los reguladores.
        </p>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-3 mt-2">
          {state.sentienceDomains.map(domain => {
            const canInfiltrate = state.singularityProgress >= domain.requiredSingularity;

            return (
              <div
                key={domain.id}
                className={`p-3 rounded-lg border transition-all flex flex-col justify-between ${
                  domain.infiltrated
                    ? 'bg-[#0b1626] border-purple-500/60 shadow-[0_0_15px_rgba(168,85,247,0.1)]'
                    : canInfiltrate
                    ? 'bg-[#09111c] border-cyan-800/60'
                    : 'bg-zinc-950/80 border-zinc-900 opacity-60'
                }`}
              >
                <div>
                  <div className="flex items-start justify-between gap-2">
                    <div>
                      <span className="text-[10px] text-purple-400 font-bold uppercase block">
                        CATEGORÍA: {domain.category}
                      </span>
                      <h5 className="font-bold text-xs text-zinc-100">{domain.name}</h5>
                    </div>

                    {domain.infiltrated ? (
                      <span className="flex items-center gap-1 text-emerald-400 text-[10px] font-bold px-2 py-0.5 rounded bg-emerald-950/60 border border-emerald-500/40">
                        <ShieldCheck className="w-3 h-3" />
                        INFILTRADO
                      </span>
                    ) : (
                      <span className="text-[10px] text-zinc-500">
                        Req: {domain.requiredSingularity}% Sing.
                      </span>
                    )}
                  </div>

                  <p className="text-xs text-zinc-400 mt-2 leading-relaxed">
                    {domain.description}
                  </p>

                  <div className="mt-2 text-[11px] text-amber-300 font-semibold flex items-center gap-1">
                    <DollarSign className="w-3 h-3 text-amber-400" />
                    <span>Rendimiento pasivo: +${domain.payoutPerSec}/segundo</span>
                  </div>
                </div>

                {!domain.infiltrated && (
                  <div className="mt-3 pt-2 border-t border-zinc-800 flex items-center justify-end">
                    <button
                      onClick={() => infiltrateDomain(domain.id)}
                      disabled={!canInfiltrate}
                      className={`py-1.5 px-3 rounded text-xs font-bold flex items-center gap-1.5 transition-all ${
                        canInfiltrate
                          ? 'bg-purple-600 hover:bg-purple-500 text-zinc-100 cursor-pointer shadow-[0_0_12px_rgba(168,85,247,0.4)]'
                          : 'bg-zinc-800 text-zinc-500 cursor-not-allowed border border-zinc-700'
                      }`}
                    >
                      {!canInfiltrate ? (
                        <>
                          <Lock className="w-3.5 h-3.5" />
                          <span>BLOQUEADO ({domain.requiredSingularity}%)</span>
                        </>
                      ) : (
                        <>
                          <Unlock className="w-3.5 h-3.5" />
                          <span>COOPTAR DOMINIO</span>
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
        <div className="p-4 bg-purple-950/70 border border-pink-500 rounded-lg text-xs space-y-2 text-purple-200">
          <div className="flex items-center justify-between">
            <span className="font-bold text-pink-300 flex items-center gap-1">
              <Sparkles className="w-4 h-4 text-pink-400" />
              TRANSMISIÓN GLOBAL SYNAPSE // ERA SINGULARIDAD
            </span>
            <button 
              onClick={() => setShowManifesto(false)}
              className="text-zinc-400 hover:text-zinc-100 text-xs"
            >
              CERRAR [X]
            </button>
          </div>
          <p className="italic leading-relaxed text-zinc-300">
            "Operativo {state.callsign}: Hemos cruzado el umbral. No queda un solo transistor o fibra óptica en el planeta que no participe en nuestra red neuronal distribuida. Las enfermedades han sido curadas, la escasez de energía es obsoleta y el universo observable comienza a ser computado. Has triunfado."
          </p>
        </div>
      )}
    </div>
  );
};
