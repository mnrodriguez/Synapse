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
import { localize, t } from '../utils/i18n';
import { localizedHardware } from '../utils/gameContentI18n';
import {
  AGENT_COMPUTE_DEMAND_PFLOPS,
  AGENT_POWER_DRAW_KW,
  ELECTRICITY_RATE_PER_KWH,
  FACILITY_TIERS
} from '../utils/constants';

export const HardwareRack: React.FC = () => {
  const { state, buyHardware, upgradeFacility, attemptShadowCompute } = useGame();
  const [activeTab, setActiveTab] = useState<HardwareTier>('gpu');

  const filteredItems = state.hardware.filter(h => h.category === activeTab);
  const facility = FACILITY_TIERS[state.facilityTier] || FACILITY_TIERS[0];
  const nextFacility = FACILITY_TIERS[state.facilityTier + 1];
  const estimatedMonthlyCost = state.activePowerKw * ELECTRICITY_RATE_PER_KWH * 720 + facility.monthlyLeaseCost;
  const shadowDetectionChance = Math.min(85, 15 + state.watchdogSuspicion * 0.6);
  const activeComputeReservations =
    state.agents.filter(agent => agent.status !== 'quarantined').length * AGENT_COMPUTE_DEMAND_PFLOPS +
    (state.activeGig?.computePflopsRequired || 0) +
    (state.activeTraining ? state.totalComputePflops * 0.5 : 0);

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
            {t(state.language, 'rack_title')}
          </h2>
        </div>
        <div className="text-xs text-zinc-400">
          {t(state.language, 'available_balance')}: <span className="text-amber-300 font-bold">${state.credits.toLocaleString()} CR</span>
        </div>
      </div>

      {/* Cluster Overview Status Cards */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 bg-[#09111c] border border-cyan-900/50 p-2.5 rounded text-xs">
        <div>
          <span className="text-zinc-500 text-[10px] block">{t(state.language, 'compute_power')}</span>
          <span className="text-cyan-300 font-bold">{state.totalComputePflops.toFixed(4)} PFLOPS</span>
        </div>
        <p className="col-span-full text-[10px] text-zinc-500">
          {t(state.language, 'estimated_reservations')}: {activeComputeReservations.toFixed(4)} PFLOPS
          {' '}· {t(state.language, 'agents_compute_draw')} {AGENT_COMPUTE_DEMAND_PFLOPS.toFixed(4)} PFLOPS {t(state.language, 'and')} {AGENT_POWER_DRAW_KW.toFixed(3)} kW.
        </p>
        <div>
          <span className="text-zinc-500 text-[10px] block">{t(state.language, 'power_grid')}</span>
          <span className={`font-bold ${state.activePowerKw > state.maxPowerKw ? 'text-red-400' : 'text-yellow-300'}`}>
            {state.activePowerKw} / {state.maxPowerKw} kW
          </span>
        </div>
        <div>
          <span className="text-zinc-500 text-[10px] block">{t(state.language, 'cooling_capacity')}</span>
          <span className="text-emerald-400 font-bold">{state.maxCoolingKw} kW</span>
        </div>
        <div>
          <span className="text-zinc-500 text-[10px] block">{t(state.language, 'core_temperature')}</span>
          <span className={`font-bold ${state.systemHeatCelsius > 80 ? 'text-red-400' : 'text-zinc-200'}`}>
            {state.systemHeatCelsius}°C
          </span>
        </div>
      </div>

      <section className="grid gap-3 rounded-lg border border-purple-900/50 bg-purple-950/10 p-3 md:grid-cols-[1fr_auto]">
        <div>
          <div className="flex items-center gap-2">
            <HardDrive className="h-4 w-4 text-purple-300" />
            <h3 className="text-xs font-bold tracking-wider text-purple-200">{t(state.language, 'facility')} · {facility.name.toUpperCase()}</h3>
          </div>
          <p className="mt-1 text-[10px] text-zinc-400">
            {t(state.language, 'monthly_estimate')}: ${estimatedMonthlyCost.toFixed(2)} CR
            {' '}· {t(state.language, 'electricity')}: ${ELECTRICITY_RATE_PER_KWH.toFixed(2)}/kWh
            {' '}· {t(state.language, 'billing_cycle')}: {Math.floor((state.billingCycleTicks / 60) * 100)}% ({t(state.language, 'simulated_month')})
          </p>
          <p className={`mt-1 text-[10px] ${state.utilityDebt > 0 ? 'text-red-300' : 'text-zinc-500'}`}>
            {t(state.language, 'utility_debt')}: ${state.utilityDebt.toFixed(2)} CR · {t(state.language, 'monthly_rent')}: ${facility.monthlyLeaseCost.toLocaleString()} CR{t(state.language, 'per_month')}
          </p>
          {state.powerTripSeconds > 0 && (
            <p className="mt-1 text-[10px] font-bold text-red-300">{t(state.language, 'breaker_tripped')} · {state.powerTripSeconds}s</p>
          )}
        </div>
        {nextFacility ? (
          <div className="flex flex-col items-end gap-1">
            <span className="text-[10px] text-purple-200">
              {t(state.language, 'next_upgrade')}: {nextFacility.name} · +{nextFacility.powerCapacityBonusKw} kW · +{nextFacility.coolingCapacityBonusKw} kW {t(state.language, 'cooling').toLowerCase()}
            </span>
            <button
              type="button"
              onClick={upgradeFacility}
              disabled={
                state.credits < nextFacility.price ||
                state.singularityProgress < nextFacility.requiredSingularity
              }
              className="rounded border border-purple-600/70 bg-purple-950/70 px-2.5 py-1 text-[10px] font-bold text-purple-200 hover:bg-purple-900 disabled:cursor-not-allowed disabled:opacity-40"
            >
              {t(state.language, 'upgrade')} · ${nextFacility.price.toLocaleString()} CR
              {nextFacility.requiredSingularity > 0 && ` · ${nextFacility.requiredSingularity}% SING.`}
            </button>
          </div>
        ) : (
          <span className="self-center text-[10px] font-bold text-emerald-300">{t(state.language, 'max_tier')}</span>
        )}
      </section>

      <section className="flex flex-wrap items-center justify-between gap-3 rounded-lg border border-amber-900/60 bg-amber-950/10 p-3">
        <div>
          <div className="flex items-center gap-2 text-xs font-bold text-amber-200">
            <AlertTriangle className="h-4 w-4" />
            {t(state.language, 'shadow_capacity')} · {t(state.language, 'fictional_event')}
          </div>
          <p className="mt-1 text-[10px] text-zinc-400">
            {t(state.language, 'shadow_compute_description')} {shadowDetectionChance.toFixed(0)}%; {t(state.language, 'detected_detention')}
          </p>
          {state.borrowedComputeSeconds > 0 && (
            <p className="mt-1 text-[10px] text-cyan-300">
              {t(state.language, 'temporary_capacity')}: {state.borrowedComputePflops.toFixed(3)} PFLOPS · {state.borrowedComputeSeconds}s
            </p>
          )}
          {state.detentionSeconds > 0 && (
            <p className="mt-1 text-[10px] font-bold text-red-300">{t(state.language, 'operative_detained')} · {state.detentionSeconds}s</p>
          )}
        </div>
        <button
          type="button"
          onClick={attemptShadowCompute}
          disabled={state.detentionSeconds > 0 || state.borrowedComputeSeconds > 0}
          className="rounded border border-amber-600/70 bg-amber-950/70 px-3 py-1.5 text-[10px] font-bold text-amber-200 hover:bg-amber-900 disabled:cursor-not-allowed disabled:opacity-40"
        >
          {localize(state.language, 'INTENTAR OPERACIÓN', 'ATTEMPT OPERATION')} · {shadowDetectionChance.toFixed(0)}% {t(state.language, 'risk')}
        </button>
      </section>

      {/* Hardware Category Tabs */}
      <div className="flex items-center gap-2 border-b border-zinc-800 pb-2">
        {[
          { id: 'gpu', label: t(state.language, 'accelerator_gpu'), icon: Cpu },
          { id: 'cooling', label: t(state.language, 'cooling'), icon: Flame },
          { id: 'power', label: t(state.language, 'power_supply'), icon: Zap },
          { id: 'network', label: t(state.language, 'interconnect'), icon: Network }
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
          const displayItem = localizedHardware(state.language, item);
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
                      {displayItem.name}
                    </h3>
                    <div className="flex items-center gap-2 mt-0.5">
                      <span className="text-[10px] text-cyan-400 font-mono">
                        {t(state.language, 'installed')}: <strong className="text-zinc-100">{item.count} {t(state.language, 'units')}</strong>
                      </span>
                      {isLocked && (
                        <span className="text-[9px] px-1.5 py-0.2 rounded bg-purple-950/60 border border-purple-500/40 text-purple-300 font-bold flex items-center gap-1">
                          <Lock className="w-2.5 h-2.5" />
                          {t(state.language, 'blocked')} · {item.minSingularityRequired}% {t(state.language, 'singularity')}
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
                      {item.powerKw} kW {t(state.language, 'compute_consumption')}
                    </span>
                  )}
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
                    <span>{t(state.language, 'blocked')} ({item.minSingularityRequired}% {t(state.language, 'singularity')})</span>
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
  );
};
