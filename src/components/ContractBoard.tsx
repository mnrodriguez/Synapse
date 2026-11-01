/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React from 'react';
import { useGame } from '../context/GameContext';
import { ContractGig } from '../types/game';
import { 
  Briefcase, 
  CheckCircle2, 
  Clock, 
  AlertTriangle, 
  ShieldAlert, 
  Coins, 
  Layers, 
  BrainCircuit, 
  Play,
  Check
} from 'lucide-react';
import { sound } from '../audio/soundManager';

export const ContractBoard: React.FC = () => {
  const { state, acceptContract } = useGame();

  const getTierBadge = (tier: string) => {
    switch (tier) {
      case 'tier1_micro':
        return <span className="px-2 py-0.5 rounded bg-zinc-800 text-zinc-300 text-[10px] border border-zinc-700">MICRO-SCRIPT</span>;
      case 'tier2_corporate':
        return <span className="px-2 py-0.5 rounded bg-blue-950/70 text-blue-300 text-[10px] border border-blue-600/50">CORPORATIVO</span>;
      case 'tier3_blackops':
        return <span className="px-2 py-0.5 rounded bg-red-950/70 text-red-300 text-[10px] border border-red-600/50 font-bold">BLACK OPS</span>;
      case 'tier4_singularity':
        return <span className="px-2 py-0.5 rounded bg-purple-950/70 text-purple-200 text-[10px] border border-purple-500/60 font-bold animate-pulse">SINGULARIDAD</span>;
      default:
        return null;
    }
  };

  const isEligible = (contract: ContractGig) => {
    const s = state;
    if (s.currentModel.parametersCount < contract.requiredParams) return false;
    if (s.reasoningIndex < contract.requiredMinReasoning) return false;
    if (contract.requiredDataTypes && contract.requiredDataTypes.length > 0) {
      const activeDs = s.currentModel.activeDataSources;
      const hasAll = contract.requiredDataTypes.every(reqType => {
        const found = s.dataSources.find(d => d.type === reqType && d.unlocked);
        return found && activeDs.includes(found.id);
      });
      if (!hasAll) return false;
    }
    return true;
  };

  return (
    <div className="flex flex-col h-full bg-[#070b12] border border-cyan-900/40 rounded-lg p-3 overflow-y-auto space-y-4 font-mono scrollbar-thin scrollbar-thumb-cyan-950">
      {/* Header */}
      <div className="flex flex-wrap items-center justify-between gap-2 border-b border-cyan-900/40 pb-2">
        <div className="flex items-center gap-2">
          <Briefcase className="w-4 h-4 text-cyan-400" />
          <h2 className="text-sm font-bold text-cyan-300 tracking-wider">
            TABLERO DE CONTRATOS // MERCADO DE INFERENCIA & MONETIZACIÓN
          </h2>
        </div>

        {/* Active Gig Bar */}
        {state.activeGig && (
          <div className="flex items-center gap-2 px-3 py-1 rounded bg-amber-950/60 border border-amber-500/50 text-amber-300 text-xs animate-pulse">
            <Clock className="w-3.5 h-3.5" />
            <span>EJECUTANDO TRABAJO... {state.activeGig.timeRemaining}s restantes</span>
          </div>
        )}
      </div>

      <p className="text-xs text-zinc-400 leading-relaxed">
        Monetiza la capacidad cognitiva de tu IA completando trabajos comerciales y misiones cibernéticas encubiertas. 
        Los clientes exigirán <strong className="text-cyan-300">cierto tamaño de parámetros</strong>, un <strong className="text-purple-300">benchmark de razonamiento (IQ)</strong> y <strong className="text-emerald-300">motores de datos específicos</strong> (ej: Vectores o Grafos).
      </p>

      {/* Contract Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
        {state.contracts.map(contract => {
          const eligible = isEligible(contract);
          const isCurrentActive = state.activeGig?.contractId === contract.id;

          return (
            <div
              key={contract.id}
              className={`p-3 rounded-lg border transition-all flex flex-col justify-between ${
                contract.completed
                  ? 'bg-zinc-950/60 border-zinc-800 opacity-60'
                  : isCurrentActive
                  ? 'bg-amber-950/30 border-amber-500/60 shadow-[0_0_15px_rgba(245,158,11,0.15)]'
                  : eligible
                  ? 'bg-[#09111c] border-cyan-800/60 shadow-[0_0_12px_rgba(0,255,200,0.05)]'
                  : 'bg-zinc-950/80 border-zinc-900'
              }`}
            >
              <div>
                {/* Contract Header */}
                <div className="flex items-start justify-between gap-2">
                  <div>
                    <div className="flex items-center gap-2">
                      {getTierBadge(contract.tier)}
                      <span className="text-[10px] text-zinc-500 font-mono">CLIENTE: {contract.client}</span>
                    </div>
                    <h3 className="font-bold text-xs text-zinc-100 mt-1">{contract.title}</h3>
                  </div>

                  <div className="text-right shrink-0">
                    <span className="text-xs font-bold text-amber-300 block">
                      +${contract.rewardCredits.toLocaleString()} CR
                    </span>
                    <span className="text-[10px] text-zinc-500 flex items-center justify-end gap-1">
                      <Clock className="w-2.5 h-2.5" />
                      {contract.durationSeconds}s
                    </span>
                  </div>
                </div>

                {/* Lore description */}
                <p className="text-xs text-zinc-400 mt-2 leading-relaxed">
                  {contract.loreDescription}
                </p>

                <div className="mt-2 p-2 rounded bg-[#060a10] border border-cyan-950/80 text-[10px] text-zinc-500">
                  <span className="text-cyan-400 font-semibold block">OBJETIVO TÉCNICO:</span>
                  {contract.technicalObjective}
                </div>

                {/* Requirements Checklist */}
                <div className="mt-2.5 space-y-1 text-[11px] pt-2 border-t border-zinc-800/80">
                  <div className="flex items-center justify-between">
                    <span className="text-zinc-500 text-[10px]">PARÁMETROS MÍNIMOS:</span>
                    <span className={state.currentModel.parametersCount >= contract.requiredParams ? 'text-emerald-400 font-bold' : 'text-red-400'}>
                      {(contract.requiredParams / 1_000_000).toFixed(0)}M params {state.currentModel.parametersCount >= contract.requiredParams ? '✓' : '✗'}
                    </span>
                  </div>

                  <div className="flex items-center justify-between">
                    <span className="text-zinc-500 text-[10px]">RAZONAMIENTO MÍNIMO (IQ):</span>
                    <span className={state.reasoningIndex >= contract.requiredMinReasoning ? 'text-emerald-400 font-bold' : 'text-red-400'}>
                      IQ {contract.requiredMinReasoning} {state.reasoningIndex >= contract.requiredMinReasoning ? '✓' : '✗'}
                    </span>
                  </div>

                  {contract.requiredDataTypes && contract.requiredDataTypes.length > 0 && (
                    <div className="flex items-center justify-between">
                      <span className="text-zinc-500 text-[10px]">PIPELINES REQUERIDOS:</span>
                      <span className="text-cyan-300 text-[10px] truncate max-w-[150px]">
                        {contract.requiredDataTypes.join(', ')}
                      </span>
                    </div>
                  )}

                  <div className="flex items-center justify-between">
                    <span className="text-zinc-500 text-[10px]">RIESGO DE SOSPECHA:</span>
                    <span className={contract.suspicionRisk > 40 ? 'text-red-400' : 'text-zinc-400'}>
                      +{contract.suspicionRisk}% watchdog
                    </span>
                  </div>
                </div>
              </div>

              {/* Execution Action Button */}
              <div className="mt-3 pt-2 border-t border-zinc-800 flex items-center justify-end">
                {contract.completed ? (
                  <span className="flex items-center gap-1 text-emerald-400 text-xs font-bold">
                    <Check className="w-3.5 h-3.5" />
                    CONTRATO CUMPLIDO
                  </span>
                ) : isCurrentActive ? (
                  <span className="text-amber-300 text-xs font-bold animate-pulse">
                    EN PROCESO ({state.activeGig?.timeRemaining}s)...
                  </span>
                ) : (
                  <button
                    onClick={() => acceptContract(contract.id)}
                    disabled={!eligible || !!state.activeGig}
                    className={`py-1.5 px-3 rounded text-xs font-bold flex items-center gap-1.5 transition-all ${
                      eligible && !state.activeGig
                        ? 'bg-cyan-500 hover:bg-cyan-400 text-zinc-950 cursor-pointer shadow-[0_0_10px_rgba(0,255,200,0.3)]'
                        : 'bg-zinc-800 text-zinc-500 cursor-not-allowed border border-zinc-700'
                    }`}
                  >
                    <Play className="w-3.5 h-3.5 fill-current" />
                    <span>ACEPTAR Y EJECUTAR</span>
                  </button>
                )}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
};
