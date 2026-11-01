/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState } from 'react';
import { useGame } from '../context/GameContext';
import { HardwareTier } from '../types/game';
import { 
  Server, 
  Cpu, 
  Flame, 
  Zap, 
  Network, 
  ShoppingCart, 
  ShieldCheck, 
  AlertTriangle,
  HardDrive,
  Lock
} from 'lucide-react';
import { sound } from '../audio/soundManager';

export const HardwareRack: React.FC = () => {
  const { state, buyHardware } = useGame();
  const [activeTab, setActiveTab] = useState<HardwareTier>('gpu');

  const filteredItems = state.hardware.filter(h => h.category === activeTab);

  const handleTabChange = (tab: HardwareTier) => {
    sound.playNavSwitch();
    setActiveTab(tab);
  };

  return (
    <div className="flex flex-col h-full bg-[#070b12] border border-cyan-900/40 rounded-lg p-3 overflow-y-auto space-y-4 font-mono scrollbar-thin scrollbar-thumb-cyan-950">
      {/* Header */}
      <div className="flex flex-wrap items-center justify-between gap-2 border-b border-cyan-900/40 pb-2">
        <div className="flex items-center gap-2">
          <Server className="w-4 h-4 text-cyan-400" />
          <h2 className="text-sm font-bold text-cyan-300 tracking-wider">
            RACK DE CLÚSTER // HARDWARE & INFRAESTRUCTURA
          </h2>
        </div>
        <div className="text-xs text-zinc-400">
          Saldo Disponible: <span className="text-amber-300 font-bold">${state.credits.toLocaleString()} CR</span>
        </div>
      </div>

      {/* Cluster Overview Status Cards */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 bg-[#09111c] border border-cyan-900/50 p-2.5 rounded text-xs">
        <div>
          <span className="text-zinc-500 text-[10px] block">POTENCIA DE CÓMPUTO</span>
          <span className="text-cyan-300 font-bold">{state.totalComputePflops.toFixed(4)} PFLOPS</span>
        </div>
        <div>
          <span className="text-zinc-500 text-[10px] block">RED ELÉCTRICA</span>
          <span className={`font-bold ${state.activePowerKw > state.maxPowerKw ? 'text-red-400' : 'text-yellow-300'}`}>
            {state.activePowerKw} / {state.maxPowerKw} kW
          </span>
        </div>
        <div>
          <span className="text-zinc-500 text-[10px] block">CAPACIDAD DE DISIPACIÓN</span>
          <span className="text-emerald-400 font-bold">{state.maxCoolingKw} kW</span>
        </div>
        <div>
          <span className="text-zinc-500 text-[10px] block">TEMPERATURA NÚCLEO</span>
          <span className={`font-bold ${state.systemHeatCelsius > 80 ? 'text-red-400' : 'text-zinc-200'}`}>
            {state.systemHeatCelsius}°C
          </span>
        </div>
      </div>

      {/* Hardware Category Tabs */}
      <div className="flex items-center gap-2 border-b border-zinc-800 pb-2">
        {[
          { id: 'gpu', label: 'ACELERADORES & GPUs', icon: Cpu },
          { id: 'cooling', label: 'REFRIGERACIÓN', icon: Flame },
          { id: 'power', label: 'SUMINISTRO ELÉCTRICO', icon: Zap },
          { id: 'network', label: 'INTERCONEXIÓN & BUS', icon: Network }
        ].map(tab => {
          const Icon = tab.icon;
          const isActive = activeTab === tab.id;
          return (
            <button
              key={tab.id}
              onClick={() => handleTabChange(tab.id as HardwareTier)}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded text-xs font-bold transition-all ${
                isActive
                  ? 'bg-cyan-950 border border-cyan-400 text-cyan-300 shadow-[0_0_10px_rgba(0,255,200,0.2)]'
                  : 'bg-zinc-900/60 border border-zinc-800 text-zinc-400 hover:text-zinc-200 hover:border-zinc-700'
              }`}
            >
              <Icon className="w-3.5 h-3.5" />
              <span className="hidden sm:inline">{tab.label}</span>
            </button>
          );
        })}
      </div>

      {/* Hardware List for Current Category */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
        {filteredItems.map(item => {
          const canAfford = state.credits >= item.price;
          const isLocked = item.minSingularityRequired !== undefined && item.minSingularityRequired > 0 && state.singularityProgress < item.minSingularityRequired;

          return (
            <div
              key={item.id}
              className={`p-3 rounded-lg border transition-all flex flex-col justify-between ${
                isLocked
                  ? 'bg-zinc-950/80 border-zinc-900 opacity-60'
                  : item.count > 0 
                  ? 'bg-[#09111c] border-cyan-800/60 shadow-[0_0_12px_rgba(0,255,200,0.04)]' 
                  : 'bg-zinc-950/70 border-zinc-800'
              }`}
            >
              <div>
                <div className="flex items-start justify-between gap-2">
                  <div>
                    <h3 className="font-bold text-xs text-zinc-100 flex items-center gap-1.5">
                      {item.name}
                    </h3>
                    <div className="flex items-center gap-2 mt-0.5">
                      <span className="text-[10px] text-cyan-400 font-mono">
                        EN CLÚSTER: <strong className="text-zinc-100">{item.count} unidades</strong>
                      </span>
                      {isLocked && (
                        <span className="text-[9px] px-1.5 py-0.2 rounded bg-purple-950/60 border border-purple-500/40 text-purple-300 font-bold flex items-center gap-1">
                          <Lock className="w-2.5 h-2.5" />
                          DESBLOQUEO EN {item.minSingularityRequired}% SING.
                        </span>
                      )}
                    </div>
                  </div>

                  <div className="text-right">
                    <span className="text-xs font-bold text-amber-300 block">
                      ${item.price.toLocaleString()} CR
                    </span>
                  </div>
                </div>

                <p className="text-xs text-zinc-400 mt-2 leading-relaxed">
                  {item.description}
                </p>

                {/* Technical Specs Tags */}
                <div className="flex flex-wrap gap-2 mt-2.5 text-[10px]">
                  {item.computeTflops > 0 && (
                    <span className="px-2 py-0.5 rounded bg-cyan-950/80 border border-cyan-500/40 text-cyan-300">
                      +{item.computeTflops} TFLOPS
                    </span>
                  )}
                  {item.vramGb > 0 && (
                    <span className="px-2 py-0.5 rounded bg-purple-950/80 border border-purple-500/40 text-purple-300">
                      {item.vramGb} GB VRAM
                    </span>
                  )}
                  {item.powerKw > 0 && (
                    <span className="px-2 py-0.5 rounded bg-yellow-950/80 border border-yellow-500/40 text-yellow-300">
                      {item.powerKw} kW consumo
                    </span>
                  )}
                  {item.powerCapacityKw && (
                    <span className="px-2 py-0.5 rounded bg-yellow-950/80 border border-yellow-500/40 text-yellow-300">
                      +{item.powerCapacityKw} kW capacidad
                    </span>
                  )}
                  {item.coolingCapacityKw && (
                    <span className="px-2 py-0.5 rounded bg-emerald-950/80 border border-emerald-500/40 text-emerald-300">
                      +{item.coolingCapacityKw} kW disipación
                    </span>
                  )}
                  {item.interconnectGbps && (
                    <span className="px-2 py-0.5 rounded bg-blue-950/80 border border-blue-500/40 text-blue-300">
                      {item.interconnectGbps} Gbps bus
                    </span>
                  )}
                </div>
              </div>

              {/* Purchase Button */}
              <div className="mt-3 pt-2 border-t border-zinc-800 flex items-center justify-end">
                {isLocked ? (
                  <span className="py-1 px-2.5 rounded text-[11px] bg-zinc-900 text-zinc-500 border border-zinc-800 flex items-center gap-1">
                    <Lock className="w-3 h-3 text-purple-400" />
                    <span>BLOQUEADO ({item.minSingularityRequired}% SING.)</span>
                  </span>
                ) : (
                  <button
                    onClick={() => buyHardware(item.id)}
                    disabled={!canAfford}
                    className={`py-1.5 px-3 rounded text-xs font-bold flex items-center gap-1.5 transition-all ${
                      canAfford
                        ? 'bg-cyan-500 hover:bg-cyan-400 text-zinc-950 cursor-pointer shadow-[0_0_10px_rgba(0,255,200,0.3)]'
                        : 'bg-zinc-800 text-zinc-500 cursor-not-allowed border border-zinc-700'
                    }`}
                  >
                    <ShoppingCart className="w-3.5 h-3.5" />
                    <span>ORDENAR HARDWARE (${item.price.toLocaleString()} CR)</span>
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
