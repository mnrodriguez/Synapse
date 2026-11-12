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
  AlertTriangle,
  HardDrive,
  Lock,
  Thermometer,
  Layers,
  Unplug
} from 'lucide-react';
import { sound } from '../audio/soundManager';
import { localize, t } from '../utils/i18n';
import { localizedHardware, localizedResearch } from '../utils/gameContentI18n';
import {
  AGENT_COMPUTE_DEMAND_PFLOPS,
  AGENT_POWER_DRAW_KW,
  DAYS_PER_GAME_MONTH,
  ELECTRICITY_RATE_PER_KWH,
  FACILITY_TIERS
} from '../utils/constants';
import { HARDWARE_DOCS } from '../utils/aiDocumentation';
import { DocLinkBadge } from './DocLinkBadge';
import { isProgressionUnlocked } from '../utils/progression';
import { VERSION_PROFILES } from '../utils/versionProfiles';
import { formatCompute, externalComputePflops, COVERT_NODE_PFLOPS, UNIVERSITY_LOAN_PFLOPS } from '../utils/training';

type HardwareMenuTab = 'compute' | 'thermal_power' | 'facility';

export const HardwareRack: React.FC = () => {
  const { state, buyHardware, upgradeFacility, attemptShadowCompute, attemptSeverCovertNode } = useGame();
  const lang = state.language === 'es' ? 'es' : 'en';
  const ver = state.uiVersion || 1;
  const p = VERSION_PROFILES[lang][ver];
  const [activeMenuTab, setActiveMenuTab] = useState<HardwareMenuTab>('compute');
  const [computeSubFilter, setComputeSubFilter] = useState<'all' | 'gpu' | 'network'>('all');
  const [thermalSubFilter, setThermalSubFilter] = useState<'all' | 'cooling' | 'power'>('all');

  const facility = FACILITY_TIERS[state.facilityTier] || FACILITY_TIERS[0];
  const nextFacility = FACILITY_TIERS[state.facilityTier + 1];
  const nextFacilityUnlocked = nextFacility ? isProgressionUnlocked(nextFacility, state) : false;
  const nextFacilityResearch = state.researchTree.find(node => node.id === nextFacility?.requiredResearchId);
  const estimatedMonthlyCost = state.activePowerKw * ELECTRICITY_RATE_PER_KWH * 720 + facility.monthlyLeaseCost;
  const shadowDetectionChance = Math.min(85, 15 + state.watchdogSuspicion * 0.6);
  
  const totalVramGb = state.hardware.reduce((sum, h) => 
    h.category === 'gpu' ? sum + (h.vramGb * h.count) : sum, 0
  );

  const activeComputeReservations =
    state.agents.filter(agent => agent.status !== 'quarantined').length * AGENT_COMPUTE_DEMAND_PFLOPS +
    ((state.activeGigs || (state.activeGig ? [state.activeGig] : [])).reduce((sum, g) => sum + (g.computePflopsRequired || 0), 0)) +
    (state.activeTraining ? state.totalComputePflops * 0.5 : 0);

  const handleMenuTabChange = (tab: HardwareMenuTab) => {
    sound.playNavSwitch();
    setActiveMenuTab(tab);
  };

  // Filter hardware based on current view
  const computeHardware = state.hardware.filter(h => {
    if (computeSubFilter === 'gpu') return h.category === 'gpu';
    if (computeSubFilter === 'network') return h.category === 'network';
    return h.category === 'gpu' || h.category === 'network';
  });

  const thermalPowerHardware = state.hardware.filter(h => {
    if (thermalSubFilter === 'cooling') return h.category === 'cooling';
    if (thermalSubFilter === 'power') return h.category === 'power';
    return h.category === 'cooling' || h.category === 'power';
  });

  return (
    <div className="flex flex-col h-full mutating-panel border rounded-xl p-3 sm:p-4 overflow-y-auto space-y-4 font-mono">
      {/* Header */}
      <div className="flex flex-wrap items-center justify-between gap-2 border-b border-current/10 pb-2">
        <div className="flex items-center gap-2">
          <Server className="w-4 h-4 mutating-accent-text" />
          <h2 className="text-sm font-bold mutating-accent-text tracking-wider">
            {t(state.language, 'rack_title')}
          </h2>
        </div>
        <div className="text-xs mutating-text-muted">
          {t(state.language, 'available_balance')}: <span className="text-emerald-500 font-bold">${state.credits.toLocaleString()} CR</span>
        </div>
      </div>

      {/* Expansive 3-Menu Segmented Navigation */}
      <div className="flex flex-wrap items-center gap-2 p-1.5 mutating-sub rounded-lg text-xs">
        <button
          onClick={() => handleMenuTabChange('compute')}
          className={`flex items-center gap-2 px-3 py-1.5 rounded-md text-xs font-bold transition-all cursor-pointer ${
            activeMenuTab === 'compute'
              ? 'mutating-btn-primary shadow-sm font-black'
              : 'mutating-text-muted hover:opacity-100'
          }`}
        >
          <Cpu className="w-3.5 h-3.5" />
          <span>{localize(state.language, '1. CÓMPUTO & RED', '1. COMPUTE & INTERCONNECT')}</span>
        </button>

        <button
          onClick={() => handleMenuTabChange('thermal_power')}
          className={`flex items-center gap-2 px-3 py-1.5 rounded-md text-xs font-bold transition-all cursor-pointer ${
            activeMenuTab === 'thermal_power'
              ? 'mutating-btn-primary shadow-sm font-black'
              : 'mutating-text-muted hover:opacity-100'
          }`}
        >
          <Zap className="w-3.5 h-3.5" />
          <span>{localize(state.language, '2. POTENCIA & TÉRMICA', '2. POWER & THERMAL')}</span>
        </button>

        <button
          onClick={() => handleMenuTabChange('facility')}
          className={`flex items-center gap-2 px-3 py-1.5 rounded-md text-xs font-bold transition-all cursor-pointer ${
            activeMenuTab === 'facility'
              ? 'mutating-btn-primary shadow-sm font-black'
              : 'mutating-text-muted hover:opacity-100'
          }`}
        >
          <HardDrive className="w-3.5 h-3.5" />
          <span>{localize(state.language, '3. DATACENTER & OPERACIONES', '3. DATACENTER & OPERATIONS')}</span>
        </button>
      </div>

      {/* VIEW 1: COMPUTE ACCELERATORS & INTERCONNECTS */}
      {activeMenuTab === 'compute' && (
        <div className="space-y-4">
          {/* Compute Telemetry Banner */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5 mutating-sub p-3 rounded-lg text-xs">
            <div>
              <span className="mutating-text-muted text-[11px] block">{t(state.language, 'compute_power')}</span>
              <span className="mutating-accent-text font-bold text-sm">{formatCompute(state.totalComputePflops)}</span>
            </div>
            <div>
              <span className="mutating-text-muted text-[11px] block">{localize(state.language, 'Memoria VRAM Total', 'Total Cluster VRAM')}</span>
              <span className="text-purple-500 font-bold text-sm">{totalVramGb.toFixed(1)} GB</span>
            </div>
            <div>
              <span className="mutating-text-muted text-[11px] block">{localize(state.language, 'Cómputo Reservado', 'Reserved Compute')}</span>
              <span className="text-amber-500 font-bold text-sm">{formatCompute(activeComputeReservations)}</span>
            </div>
            <div>
              <span className="mutating-text-muted text-[11px] block">{localize(state.language, 'Cómputo Disponible', 'Available Compute')}</span>
              <span className="text-emerald-500 font-bold text-sm">{formatCompute(Math.max(0, state.totalComputePflops - activeComputeReservations))}</span>
            </div>
          </div>

          {/* Sub-filter controls */}
          <div className="flex items-center justify-between gap-2">
            <div className="flex items-center gap-1.5">
              <button
                onClick={() => setComputeSubFilter('all')}
                className={`px-2.5 py-1 rounded text-[11px] font-bold transition-all cursor-pointer ${
                  computeSubFilter === 'all'
                    ? 'mutating-btn-primary shadow-sm'
                    : 'mutating-sub mutating-text-muted hover:opacity-100'
                }`}
              >
                {localize(state.language, 'Todos los Componentes', 'All Components')}
              </button>
              <button
                onClick={() => setComputeSubFilter('gpu')}
                className={`px-2.5 py-1 rounded text-[11px] font-bold transition-all cursor-pointer ${
                  computeSubFilter === 'gpu'
                    ? 'mutating-btn-primary shadow-sm'
                    : 'mutating-sub mutating-text-muted hover:opacity-100'
                }`}
              >
                {t(state.language, 'accelerator_gpu')}
              </button>
              <button
                onClick={() => setComputeSubFilter('network')}
                className={`px-2.5 py-1 rounded text-[11px] font-bold transition-all cursor-pointer ${
                  computeSubFilter === 'network'
                    ? 'mutating-btn-primary shadow-sm'
                    : 'mutating-sub mutating-text-muted hover:opacity-100'
                }`}
              >
                {t(state.language, 'interconnect')}
              </button>
            </div>
            <span className="text-[10px] mutating-text-muted">
              {computeHardware.length} {localize(state.language, 'dispositivos listados', 'devices listed')}
            </span>
          </div>

          {/* Compute Hardware Grid */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            {/* Clandestine / Covert Node Card (Mutates per UI version) */}
            <div className={`p-4 rounded-lg border-2 space-y-2 relative transition-all flex flex-col justify-between ${
              ver === 4
                ? 'bg-[#0a0003] border-rose-600/70 shadow-[0_0_20px_rgba(255,0,60,0.2)]'
                : ver === 3
                ? 'bg-[#050a14] border-cyan-500/60 shadow-[0_0_15px_rgba(0,240,255,0.15)]'
                : ver === 2
                ? 'bg-[#101426] border-purple-500/50 shadow-[0_0_15px_rgba(168,85,247,0.15)]'
                : 'mutating-card border-blue-400 shadow-md'
            }`}>
              <div className="space-y-2">
                <div className="flex justify-between items-center">
                  <span className={`font-bold text-xs ${ver === 4 ? 'text-rose-400' : ver === 3 ? 'text-cyan-300' : ver === 2 ? 'text-purple-400' : 'mutating-accent-text'}`}>
                    {p.covertTitle}
                  </span>
                  <span className={`text-[10px] px-2 py-0.5 rounded font-mono font-bold ${
                    ver === 4 
                      ? 'bg-rose-950/80 text-rose-300 border border-rose-500/60 animate-pulse'
                      : ver === 3 
                      ? 'bg-cyan-950/80 text-cyan-300 border border-cyan-500/60'
                      : ver === 2
                      ? 'bg-purple-950/80 text-purple-300 border border-purple-500/60'
                      : 'bg-blue-100 text-blue-700 border border-blue-300'
                  }`}>
                    {p.covertTag}
                  </span>
                </div>

                <div className="space-y-1 text-xs font-mono">
                  <div className="flex justify-between">
                    <span className="mutating-text-muted">{localize(state.language, 'Aporte de Cómputo:', 'Compute Added:')}</span>
                    <span className="font-bold text-emerald-500">+{formatCompute(ver >= 3 ? COVERT_NODE_PFLOPS : UNIVERSITY_LOAN_PFLOPS)}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="mutating-text-muted">{localize(state.language, 'Carga Eléctrica Local:', 'Local Power:')}</span>
                    <span className="text-emerald-500">0.00 kW ({localize(state.language, 'Remoto', 'Remote')})</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="mutating-text-muted">{localize(state.language, 'Riesgo de Rastreo:', 'Trace Risk:')}</span>
                    <span className={ver === 4 ? 'text-rose-400 font-bold' : ver === 3 ? 'text-amber-400' : 'text-emerald-500'}>
                      {p.covertRisk}
                    </span>
                  </div>
                </div>
              </div>

              <div className="pt-2 border-t border-current/15">
                {externalComputePflops(state) === 0 ? (
                  <div className="p-2 rounded mutating-sub text-center text-xs font-mono mutating-text-muted">
                    {localize(state.language, '[NODO EXTERNO DESCONECTADO]', '[EXTERNAL NODE DISCONNECTED]')}
                  </div>
                ) : (
                  <button
                    type="button"
                    onClick={attemptSeverCovertNode}
                    className={`w-full py-1.5 px-3 rounded font-mono text-[11px] font-bold flex items-center justify-center gap-1.5 transition-all cursor-pointer ${
                      ver === 4
                        ? 'bg-rose-950/90 hover:bg-rose-900 text-rose-300 border border-rose-600 shadow-[0_0_10px_rgba(255,0,60,0.4)]'
                        : ver === 1
                        ? 'bg-rose-100 hover:bg-rose-200 text-rose-700 border border-rose-300'
                        : 'bg-rose-950/40 hover:bg-rose-900/50 text-rose-400 border border-rose-500/40'
                    }`}
                  >
                    <Unplug className="w-3.5 h-3.5" />
                    <span>{p.severBtn}</span>
                  </button>
                )}
              </div>
            </div>

            {computeHardware.map(item => {
              const displayItem = localizedHardware(state.language, item);
              const canAfford = state.credits >= item.price;
              const isLocked = item.count === 0 && !isProgressionUnlocked(item, state);
              const researchNode = state.researchTree.find(node => node.id === item.requiredResearchId);
              const researchTitle = researchNode ? localizedResearch(state.language, researchNode).title : undefined;

              return (
                <div
                  key={item.id}
                  className={`p-3.5 rounded-lg border transition-all flex flex-col justify-between ${
                    isLocked
                      ? 'mutating-sub opacity-60'
                      : item.count > 0 
                      ? 'mutating-card border-blue-500/40 shadow-sm' 
                      : 'mutating-sub'
                  }`}
                >
                  <div>
                    <div className="flex items-start justify-between gap-2">
                      <div>
                        <div className="flex items-center gap-2 flex-wrap">
                          <h3 className="font-bold text-xs text-zinc-100 flex items-center gap-1.5">
                            {displayItem.name}
                          </h3>
                          {HARDWARE_DOCS[item.id] && (
                            <DocLinkBadge doc={HARDWARE_DOCS[item.id]} language={state.language} />
                          )}
                        </div>
                        <div className="flex items-center gap-2 mt-0.5">
                          <span className="text-[10px] text-cyan-400 font-mono">
                            {t(state.language, 'installed')}: <strong className="text-zinc-100">{item.count} {t(state.language, 'units')}</strong>
                          </span>
                          {isLocked && (
                            <span className="text-[9px] px-1.5 py-0.2 rounded bg-purple-950/60 border border-purple-500/40 text-purple-300 font-bold flex items-center gap-1">
                              <Lock className="w-2.5 h-2.5" />
                              {item.minSingularityRequired && item.minSingularityRequired > state.singularityProgress
                                ? `${item.minSingularityRequired}% ${t(state.language, 'singularity')}`
                                : `${researchTitle ?? localize(state.language, 'Tecnología futura', 'Future technology')} · ${item.availableAfterDays ?? '—'} ${localize(state.language, 'días', 'days')}`}
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
                      {displayItem.description}
                    </p>

                    {/* Specs Badges */}
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
                          {item.powerKw} kW {t(state.language, 'compute_consumption')}
                        </span>
                      )}
                      {item.interconnectGbps && (
                        <span className="px-2 py-0.5 rounded bg-blue-950/80 border border-blue-500/40 text-blue-300">
                          {item.interconnectGbps} Gbps {t(state.language, 'bus')}
                        </span>
                      )}
                    </div>
                  </div>

                  {/* Purchase Button */}
                  <div className="mt-3 pt-2 border-t border-zinc-800 flex items-center justify-end">
                    {isLocked ? (
                      <span className="py-1 px-2.5 rounded text-[11px] bg-zinc-900 text-zinc-500 border border-zinc-800 flex items-center gap-1">
                        <Lock className="w-3 h-3 text-purple-400" />
                        <span>
                          {item.minSingularityRequired && item.minSingularityRequired > state.singularityProgress
                            ? `${t(state.language, 'blocked')} (${item.minSingularityRequired}% ${t(state.language, 'singularity')})`
                            : localize(state.language, `Investiga ${researchTitle ?? 'la tecnología'} o espera al día ${item.availableAfterDays ?? '—'}`, `Research ${researchTitle ?? 'the technology'} or wait until day ${item.availableAfterDays ?? '—'}`)}
                        </span>
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
                        <span>{t(state.language, 'order_hardware')} (${item.price.toLocaleString()} CR)</span>
                      </button>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* VIEW 2: POWER & THERMAL INFRASTRUCTURE */}
      {activeMenuTab === 'thermal_power' && (
        <div className="space-y-4">
          {/* Thermal & Power Telemetry Banner */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5 bg-[#09111c] border border-yellow-900/50 p-3 rounded-lg text-xs">
            <div>
              <span className="text-zinc-400 text-[11px] block">{t(state.language, 'power_grid')}</span>
              <span className={`font-bold text-sm ${state.activePowerKw > state.maxPowerKw ? 'text-red-400' : 'text-yellow-300'}`}>
                {state.activePowerKw} / {state.maxPowerKw} kW
              </span>
            </div>
            <div>
              <span className="text-zinc-400 text-[11px] block">{t(state.language, 'cooling_capacity')}</span>
              <span className="text-emerald-400 font-bold text-sm">{state.maxCoolingKw} kW</span>
            </div>
            <div>
              <span className="text-zinc-400 text-[11px] block">{t(state.language, 'core_temperature')}</span>
              <span className={`font-bold text-sm ${state.systemHeatCelsius > 80 ? 'text-red-400' : 'text-zinc-100'}`}>
                {state.systemHeatCelsius}°C
              </span>
            </div>
            <div>
              <span className="text-zinc-400 text-[11px] block">{localize(state.language, 'Estado del Disyuntor', 'Circuit Breaker')}</span>
              <span className={`font-bold text-sm ${state.powerTripSeconds > 0 ? 'text-red-400 animate-pulse' : 'text-emerald-400'}`}>
                {state.powerTripSeconds > 0 ? `${state.powerTripSeconds}s (DISPARADO)` : 'NOMINAL (OK)'}
              </span>
            </div>
          </div>

          {/* Sub-filter controls */}
          <div className="flex items-center justify-between gap-2">
            <div className="flex items-center gap-1.5">
              <button
                onClick={() => setThermalSubFilter('all')}
                className={`px-2.5 py-1 rounded text-[11px] font-bold border transition-colors ${
                  thermalSubFilter === 'all'
                    ? 'bg-yellow-950/80 border-yellow-400 text-yellow-200'
                    : 'bg-zinc-900/60 border-zinc-800 text-zinc-400 hover:text-zinc-200'
                }`}
              >
                {localize(state.language, 'Toda la Infraestructura', 'All Infrastructure')}
              </button>
              <button
                onClick={() => setThermalSubFilter('cooling')}
                className={`px-2.5 py-1 rounded text-[11px] font-bold border transition-colors ${
                  thermalSubFilter === 'cooling'
                    ? 'bg-emerald-950/80 border-emerald-400 text-emerald-200'
                    : 'bg-zinc-900/60 border-zinc-800 text-zinc-400 hover:text-zinc-200'
                }`}
              >
                {t(state.language, 'cooling')}
              </button>
              <button
                onClick={() => setThermalSubFilter('power')}
                className={`px-2.5 py-1 rounded text-[11px] font-bold border transition-colors ${
                  thermalSubFilter === 'power'
                    ? 'bg-yellow-950/80 border-yellow-400 text-yellow-200'
                    : 'bg-zinc-900/60 border-zinc-800 text-zinc-400 hover:text-zinc-200'
                }`}
              >
                {t(state.language, 'power_supply')}
              </button>
            </div>
            <span className="text-[10px] text-zinc-400">
              {thermalPowerHardware.length} {localize(state.language, 'sistemas de soporte', 'support systems')}
            </span>
          </div>

          {/* Thermal & Power Hardware Grid */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            {thermalPowerHardware.map(item => {
              const displayItem = localizedHardware(state.language, item);
              const canAfford = state.credits >= item.price;
              const isLocked = item.count === 0 && !isProgressionUnlocked(item, state);
              const researchNode = state.researchTree.find(node => node.id === item.requiredResearchId);
              const researchTitle = researchNode ? localizedResearch(state.language, researchNode).title : undefined;

              return (
                <div
                  key={item.id}
                  className={`p-3.5 rounded-lg border transition-all flex flex-col justify-between ${
                    isLocked
                      ? 'mutating-sub opacity-60'
                      : item.count > 0 
                      ? 'mutating-card border-yellow-500/40 shadow-sm' 
                      : 'mutating-sub'
                  }`}
                >
                  <div>
                    <div className="flex items-start justify-between gap-2">
                      <div>
                        <div className="flex items-center gap-2 flex-wrap">
                          <h3 className="font-bold text-xs text-zinc-100 flex items-center gap-1.5">
                            {displayItem.name}
                          </h3>
                          {HARDWARE_DOCS[item.id] && (
                            <DocLinkBadge doc={HARDWARE_DOCS[item.id]} language={state.language} />
                          )}
                        </div>
                        <div className="flex items-center gap-2 mt-0.5">
                          <span className="text-[10px] text-yellow-400 font-mono">
                            {t(state.language, 'installed')}: <strong className="text-zinc-100">{item.count} {t(state.language, 'units')}</strong>
                          </span>
                          {isLocked && (
                            <span className="text-[9px] px-1.5 py-0.2 rounded bg-purple-950/60 border border-purple-500/40 text-purple-300 font-bold flex items-center gap-1">
                              <Lock className="w-2.5 h-2.5" />
                              {item.minSingularityRequired && item.minSingularityRequired > state.singularityProgress
                                ? `${item.minSingularityRequired}% ${t(state.language, 'singularity')}`
                                : `${researchTitle ?? localize(state.language, 'Tecnología futura', 'Future technology')} · ${item.availableAfterDays ?? '—'} ${localize(state.language, 'días', 'days')}`}
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
                      {displayItem.description}
                    </p>

                    {/* Specs Badges */}
                    <div className="flex flex-wrap gap-2 mt-2.5 text-[10px]">
                      {item.powerCapacityKw && (
                        <span className="px-2 py-0.5 rounded bg-yellow-950/80 border border-yellow-500/40 text-yellow-300">
                          +{item.powerCapacityKw} kW {t(state.language, 'power_capacity')}
                        </span>
                      )}
                      {item.coolingCapacityKw && (
                        <span className="px-2 py-0.5 rounded bg-emerald-950/80 border border-emerald-500/40 text-emerald-300">
                          +{item.coolingCapacityKw} kW {t(state.language, 'heat_dissipation')}
                        </span>
                      )}
                    </div>
                  </div>

                  {/* Purchase Button */}
                  <div className="mt-3 pt-2 border-t border-zinc-800 flex items-center justify-end">
                    {isLocked ? (
                      <span className="py-1 px-2.5 rounded text-[11px] bg-zinc-900 text-zinc-500 border border-zinc-800 flex items-center gap-1">
                        <Lock className="w-3 h-3 text-purple-400" />
                        <span>
                          {item.minSingularityRequired && item.minSingularityRequired > state.singularityProgress
                            ? `${t(state.language, 'blocked')} (${item.minSingularityRequired}% ${t(state.language, 'singularity')})`
                            : localize(state.language, `Investiga ${researchTitle ?? 'la tecnología'} o espera al día ${item.availableAfterDays ?? '—'}`, `Research ${researchTitle ?? 'the technology'} or wait until day ${item.availableAfterDays ?? '—'}`)}
                        </span>
                      </span>
                    ) : (
                      <button
                        onClick={() => buyHardware(item.id)}
                        disabled={!canAfford}
                        className={`py-1.5 px-3 rounded text-xs font-bold flex items-center gap-1.5 transition-all ${
                          canAfford
                            ? 'bg-yellow-500 hover:bg-yellow-400 text-zinc-950 cursor-pointer shadow-[0_0_10px_rgba(250,204,21,0.3)]'
                            : 'bg-zinc-800 text-zinc-500 cursor-not-allowed border border-zinc-700'
                        }`}
                      >
                        <ShoppingCart className="w-3.5 h-3.5" />
                        <span>{t(state.language, 'order_hardware')} (${item.price.toLocaleString()} CR)</span>
                      </button>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* VIEW 3: DATACENTER FACILITY & SHADOW OPERATIONS */}
      {activeMenuTab === 'facility' && (
        <div className="space-y-4">
          {/* Facility Tier Progression Card */}
          <div className="rounded-lg border border-purple-900/50 bg-purple-950/15 p-4 space-y-3">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-2 border-b border-purple-900/40">
              <div>
                <div className="flex items-center gap-2">
                  <HardDrive className="h-4 w-4 text-purple-300" />
                  <h3 className="text-sm font-bold text-purple-200">
                    {t(state.language, 'facility')}: {facility.name.toUpperCase()} (TIER {state.facilityTier})
                  </h3>
                </div>
                <p className="text-xs text-zinc-400 mt-1">
                  {localize(
                    state.language,
                    'Las instalaciones físicas determinan el espacio del rack, la acometida eléctrica y la capacidad térmica base.',
                    'Physical facilities determine rack footprint, utility grid interconnection, and baseline cooling headroom.'
                  )}
                </p>
              </div>

              {nextFacility ? (
                <div className="flex flex-col items-start sm:items-end gap-1.5">
                  <span className="text-[11px] text-purple-200">
                    {t(state.language, 'next_upgrade')}: <strong className="text-white">{nextFacility.name}</strong> (+{nextFacility.powerCapacityBonusKw} kW / +{nextFacility.coolingCapacityBonusKw} kW)
                  </span>
                  <button
                    type="button"
                    onClick={upgradeFacility}
                    disabled={
                      state.credits < nextFacility.price ||
                      state.singularityProgress < nextFacility.requiredSingularity ||
                      !nextFacilityUnlocked
                    }
                    className="rounded border border-purple-500 bg-purple-900/80 px-3 py-1.5 text-xs font-bold text-purple-100 hover:bg-purple-800 disabled:cursor-not-allowed disabled:opacity-40 transition-colors shadow-[0_0_10px_rgba(168,85,247,0.2)]"
                  >
                    {t(state.language, 'upgrade')} · ${nextFacility.price.toLocaleString()} CR
                    {nextFacility.requiredSingularity > 0 && ` · ${nextFacility.requiredSingularity}% SING.`}
                    {!nextFacilityUnlocked && ` · ${nextFacilityResearch ? localizedResearch(state.language, nextFacilityResearch).title : localize(state.language, 'Tecnología futura', 'Future technology')}`}
                  </button>
                </div>
              ) : (
                <span className="px-3 py-1 rounded bg-emerald-950/80 border border-emerald-500/50 text-xs font-bold text-emerald-300">
                  {t(state.language, 'max_tier')}
                </span>
              )}
            </div>

            {/* Billing and Electric Utility Metrics */}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 pt-2 text-xs">
              <div className="p-3 rounded bg-zinc-950/80 border border-purple-900/30">
                <span className="text-zinc-500 text-[10px] block">{t(state.language, 'monthly_rent')}</span>
                <span className="text-zinc-100 font-bold font-mono text-sm">${facility.monthlyLeaseCost.toLocaleString()} CR</span>
                <span className="text-[10px] text-zinc-500 block mt-0.5">{localize(state.language, 'Contrato de arrendamiento fijo', 'Fixed lease agreement')}</span>
              </div>

              <div className="p-3 rounded bg-zinc-950/80 border border-purple-900/30">
                <span className="text-zinc-500 text-[10px] block">{t(state.language, 'monthly_estimate')}</span>
                <span className="text-yellow-300 font-bold font-mono text-sm">${estimatedMonthlyCost.toFixed(2)} CR</span>
                <span className="text-[10px] text-zinc-500 block mt-0.5">${ELECTRICITY_RATE_PER_KWH.toFixed(2)}/kWh · {state.activePowerKw} kW</span>
              </div>

              <div className="p-3 rounded bg-zinc-950/80 border border-purple-900/30">
                <span className="text-zinc-500 text-[10px] block">{t(state.language, 'utility_debt')}</span>
                <span className={`font-bold font-mono text-sm ${state.utilityDebt > 0 ? 'text-rose-400' : 'text-emerald-400'}`}>
                  ${state.utilityDebt.toFixed(2)} CR
                </span>
                <span className="text-[10px] text-zinc-500 block mt-0.5">
                  {state.utilityDebt > 0 
                    ? localize(state.language, '¡Paga deudas para evitar cortes!', 'Repay debt to prevent blackouts!')
                    : localize(state.language, 'Cuenta al corriente', 'Account in good standing')}
                </span>
              </div>
            </div>

            {/* Billing cycle status */}
            <div className="pt-1">
              <div className="flex items-center justify-between text-[11px] text-zinc-400 mb-1">
                <span>{t(state.language, 'billing_cycle')}:</span>
                <span className="text-purple-300 font-mono">
                  {Math.floor((((state.gameDay || 1) - 1 + (state.dayTicks || 0) / 48) / DAYS_PER_GAME_MONTH) * 100)}% 
                  ({state.language === 'en' ? `Day ${state.gameDay || 1} of ${DAYS_PER_GAME_MONTH} · Month ${state.gameMonth || 1}` : `Día ${state.gameDay || 1} de ${DAYS_PER_GAME_MONTH} · Mes ${state.gameMonth || 1}`})
                </span>
              </div>
              <div className="h-1.5 w-full bg-zinc-800 rounded-full overflow-hidden">
                <div 
                  className="h-full bg-purple-500 transition-all duration-300"
                  style={{ width: `${Math.min(100, Math.floor((((state.gameDay || 1) - 1 + (state.dayTicks || 0) / 48) / DAYS_PER_GAME_MONTH) * 100))}%` }}
                />
              </div>
            </div>
          </div>

          {/* Shadow Compute Covert Operation Console */}
          <div className="rounded-lg border border-amber-900/60 bg-amber-950/15 p-4 space-y-3">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
              <div>
                <div className="flex items-center gap-2 text-sm font-bold text-amber-200">
                  <AlertTriangle className="h-4 w-4 text-amber-400" />
                  <span>{t(state.language, 'shadow_capacity')} · {t(state.language, 'fictional_event')}</span>
                </div>
                <p className="mt-1 text-xs text-zinc-400 leading-relaxed max-w-xl">
                  {t(state.language, 'shadow_compute_description')} Riesgo de detección: <strong className="text-amber-300">{shadowDetectionChance.toFixed(0)}%</strong>. 
                  {state.borrowedComputeSeconds > 0 && (
                    <span className="text-cyan-300 ml-1">
                      {t(state.language, 'temporary_capacity')}: {formatCompute(state.borrowedComputePflops)} · {state.borrowedComputeSeconds}s restantes.
                    </span>
                  )}
                  {state.detentionSeconds > 0 && (
                    <span className="text-rose-400 font-bold ml-1">
                      {t(state.language, 'operative_detained')} · {state.detentionSeconds}s de bloqueo.
                    </span>
                  )}
                </p>
              </div>

              <button
                type="button"
                onClick={attemptShadowCompute}
                disabled={state.detentionSeconds > 0 || state.borrowedComputeSeconds > 0}
                className="rounded border border-amber-500 bg-amber-900/80 px-4 py-2 text-xs font-bold text-amber-100 hover:bg-amber-800 disabled:cursor-not-allowed disabled:opacity-40 transition-colors shadow-[0_0_10px_rgba(245,158,11,0.2)] shrink-0"
              >
                {localize(state.language, 'EJECUTAR SECUESTRO DE CÓMPUTO', 'RUN SHADOW EXPLOIT')} · {shadowDetectionChance.toFixed(0)}% {t(state.language, 'risk')}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
