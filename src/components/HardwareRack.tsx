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
import { t } from '../utils/i18n';
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
import { isProgressionUnlocked, unlockHint } from '../utils/progression';
import { VERSION_PROFILES } from '../utils/versionProfiles';
import { formatCompute, externalComputePflops, COVERT_NODE_PFLOPS, UNIVERSITY_LOAN_PFLOPS, formatGameTime, GAME_HOURS_PER_TICK } from '../utils/training';
import { computeLedger } from '../utils/computeLedger';
import { PHASE_SCALES, toDisplayProgress, type UiVersion } from '../utils/singularityGoals';
import { HARDWARE_SPEC_NOTES, specSourceLabel } from '../utils/hardwareSpecs';
import { tr } from '../i18n';

type HardwareMenuTab = 'compute' | 'thermal_power' | 'facility';

export const HardwareRack: React.FC = () => {
  const { state, buyHardware, upgradeFacility, attemptShadowCompute, attemptSeverCovertNode } = useGame();
  // Requirements are stored on the internal 0-100 scale; show them on the scale the HUD uses in this version.
  const uiVer = (state.uiVersion || 1) as UiVersion;
  const progressRequirement = (realRequired: number): string => {
    if (realRequired >= PHASE_SCALES[uiVer].realEnd) return tr(state.language, 'hardwareRack.nextVersion');
    const story = VERSION_PROFILES[state.language === 'es' ? 'es' : 'en'][uiVer].story;
    return `${Math.ceil(toDisplayProgress(uiVer, realRequired))}% ${story.progressShort}`;
  };
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
  // Bill at month end: energy already used this month plus the current draw for the hours left.
  const hoursLeftInMonth = Math.max(0, (DAYS_PER_GAME_MONTH - (state.gameDay || 1)) * 24 + (48 - (state.dayTicks || 0)) * GAME_HOURS_PER_TICK);
  const projectedMonthKwh = (state.monthEnergyKwh ?? 0) + state.activePowerKw * hoursLeftInMonth;
  const estimatedMonthlyCost = projectedMonthKwh * ELECTRICITY_RATE_PER_KWH + facility.monthlyLeaseCost;
  const shadowDetectionChance = Math.min(85, 15 + state.watchdogSuspicion * 0.6);
  
  const totalVramGb = state.hardware.reduce((sum, h) => 
    h.category === 'gpu' ? sum + (h.vramGb * h.count) : sum, 0
  );

  // Agents and running contracts; training takes what is left (utils/computeLedger.ts).
  const ledger = computeLedger(state);
  const activeComputeReservations = ledger.agents + ledger.missions;

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
          {t(state.language, 'available_balance')}: <span className="theme-success-text font-bold">${state.credits.toLocaleString()} CR</span>
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
          <span>{tr(state.language, 'hardwareRack.n1ComputeInterconnect')}</span>
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
          <span>{tr(state.language, 'hardwareRack.n2PowerThermal')}</span>
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
          <span>{tr(state.language, 'hardwareRack.n3DatacenterOperations')}</span>
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
              <span className="mutating-text-muted text-[11px] block">{tr(state.language, 'hardwareRack.totalClusterVram')}</span>
              <span className="mutating-accent-text font-bold text-sm">{totalVramGb.toFixed(1)} GB</span>
            </div>
            <div>
              <span className="mutating-text-muted text-[11px] block">{tr(state.language, 'hardwareRack.reservedCompute')}</span>
              <span className="theme-warn-text font-bold text-sm">{formatCompute(activeComputeReservations)}</span>
            </div>
            <div>
              <span className="mutating-text-muted text-[11px] block">{tr(state.language, 'hardwareRack.availableCompute')}</span>
              <span className="theme-success-text font-bold text-sm">{formatCompute(ledger.free)}</span>
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
                {tr(state.language, 'hardwareRack.allComponents')}
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
            <span className="text-[11px] mutating-text-muted">
              {computeHardware.length} {tr(state.language, 'hardwareRack.devicesListed')}
            </span>
          </div>

          {/* Compute Hardware Grid */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            {/* Clandestine / Covert Node Card (Mutates per UI version) */}
            <div className={`p-4 rounded-lg border-2 space-y-2 relative transition-all flex flex-col justify-between ${
              ver === 4
                ? 'theme-panel-bg theme-danger-border'
                : ver === 3
                ? 'theme-panel-bg theme-accent-border'
                : ver === 2
                ? 'theme-panel-bg theme-accent-border'
                : 'mutating-card theme-accent-border shadow-md'
            }`}>
              <div className="space-y-2">
                <div className="flex justify-between items-center">
                  <span className={`font-bold text-xs ${ver === 4 ? 'theme-danger-text' : ver === 3 ? 'mutating-accent-text' : ver === 2 ? 'mutating-accent-text' : 'mutating-accent-text'}`}>
                    {p.covertTitle}
                  </span>
                  <span className={`text-[11px] px-2 py-0.5 rounded font-mono font-bold ${
                    ver === 4 
                      ? 'theme-danger-soft theme-danger-text border theme-danger-border animate-pulse'
                      : ver === 3 
                      ? 'theme-accent-soft mutating-accent-text border theme-accent-border'
                      : ver === 2
                      ? 'theme-accent-soft mutating-accent-text border theme-accent-border'
                      : 'theme-accent-soft mutating-accent-text border theme-accent-border'
                  }`}>
                    {p.covertTag}
                  </span>
                </div>

                <div className="space-y-1 text-xs font-mono">
                  <div className="flex justify-between">
                    <span className="mutating-text-muted">{tr(state.language, 'hardwareRack.computeAdded')}</span>
                    <span className="font-bold theme-success-text">+{formatCompute(ver >= 3 ? COVERT_NODE_PFLOPS : UNIVERSITY_LOAN_PFLOPS)}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="mutating-text-muted">{tr(state.language, 'hardwareRack.localPower')}</span>
                    <span className="theme-success-text">0.00 kW ({tr(state.language, 'hardwareRack.remote')})</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="mutating-text-muted">{tr(state.language, 'hardwareRack.traceRisk')}</span>
                    <span className={ver === 4 ? 'theme-danger-text font-bold' : ver === 3 ? 'theme-warn-text' : 'theme-success-text'}>
                      {p.covertRisk}
                    </span>
                  </div>
                </div>
              </div>

              <div className="pt-2 border-t border-current/15">
                {externalComputePflops(state) === 0 ? (
                  <div className="p-2 rounded mutating-sub text-center text-xs font-mono mutating-text-muted">
                    {tr(state.language, 'hardwareRack.externalNodeDisconnected')}
                  </div>
                ) : (
                  <button
                    type="button"
                    onClick={attemptSeverCovertNode}
                    className={`w-full py-1.5 px-3 rounded font-mono text-[11px] font-bold flex items-center justify-center gap-1.5 transition-all cursor-pointer ${
                      ver === 4
                        ? 'theme-danger-soft theme-danger-text border theme-danger-border'
                        : ver === 1
                        ? 'theme-danger-soft theme-danger-text border theme-danger-border'
                        : 'theme-danger-soft theme-danger-text border theme-danger-border'
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
                      ? 'mutating-card theme-accent-border shadow-sm' 
                      : 'mutating-sub'
                  }`}
                >
                  <div>
                    <div className="flex items-start justify-between gap-2">
                      <div>
                        <div className="flex items-center gap-2 flex-wrap">
                          <h3 className="font-bold text-xs theme-text flex items-center gap-1.5">
                            {displayItem.name}
                          </h3>
                          {HARDWARE_DOCS[item.id] && (
                            <DocLinkBadge doc={HARDWARE_DOCS[item.id]} language={state.language} />
                          )}
                        </div>
                        <div className="flex items-center gap-2 mt-0.5">
                          <span className="text-[11px] mutating-accent-text font-mono">
                            {t(state.language, 'installed')}: <strong className="theme-text">{item.count} {t(state.language, 'units')}</strong>
                          </span>
                          {isLocked && (
                            <span className="text-[11px] px-1.5 py-0.2 rounded theme-accent-soft border theme-accent-border mutating-accent-text font-bold flex items-center gap-1">
                              <Lock className="w-2.5 h-2.5" />
                              {item.minSingularityRequired && item.minSingularityRequired > state.singularityProgress
                                ? `${progressRequirement(item.minSingularityRequired)}`
                                : researchTitle ?? tr(state.language, 'hardwareRack.futureTechnology')}
                            </span>
                          )}
                        </div>
                      </div>

                      <div className="text-right">
                        <span className="text-xs font-bold theme-warn-text block">
                          ${item.price.toLocaleString()} CR
                        </span>
                      </div>
                    </div>

                    <p className="text-xs mutating-text-muted mt-2 leading-relaxed">
                      {displayItem.description}
                    </p>

                    {/* Specs Badges */}
                    <div className="flex flex-wrap gap-2 mt-2.5 text-[11px]">
                      {item.computeTflops > 0 && (
                        <span className="px-2 py-0.5 rounded theme-accent-soft border theme-accent-border mutating-accent-text">
                          +{item.computeTflops} TFLOPS{HARDWARE_SPEC_NOTES[item.id]?.precision ? ` ${HARDWARE_SPEC_NOTES[item.id]?.precision}` : ''}
                        </span>
                      )}
                      {HARDWARE_SPEC_NOTES[item.id] && HARDWARE_SPEC_NOTES[item.id].source !== 'spec' && (
                        <span className={`px-2 py-0.5 rounded border font-bold ${HARDWARE_SPEC_NOTES[item.id].source === 'fiction' ? 'theme-danger-soft theme-danger-border theme-danger-text' : 'theme-warn-soft theme-warn-border theme-warn-text'}`}>
                          {specSourceLabel(state.language, HARDWARE_SPEC_NOTES[item.id].source)}
                        </span>
                      )}
                      {item.vramGb > 0 && (
                        <span className="px-2 py-0.5 rounded theme-accent-soft border theme-accent-border mutating-accent-text">
                          {item.vramGb} GB VRAM
                        </span>
                      )}
                      {item.powerKw > 0 && (
                        <span className="px-2 py-0.5 rounded theme-warn-soft border theme-warn-border theme-warn-text">
                          {item.powerKw} kW {t(state.language, 'compute_consumption')}
                        </span>
                      )}
                      {item.interconnectGbps && (
                        <span className="px-2 py-0.5 rounded theme-accent-soft border theme-accent-border mutating-accent-text">
                          {item.interconnectGbps} Gbps {t(state.language, 'bus')}
                        </span>
                      )}
                    </div>
                  </div>

                  {/* Purchase Button */}
                  <div className="mt-3 pt-2 border-t theme-border flex items-center justify-end">
                    {isLocked ? (
                      <span className="py-1 px-2.5 rounded text-[11px] theme-sub-bg mutating-text-muted border theme-border flex items-center gap-1">
                        <Lock className="w-3 h-3 mutating-accent-text" />
                        <span>
                          {item.minSingularityRequired && item.minSingularityRequired > state.singularityProgress
                            ? `${t(state.language, 'blocked')} (${progressRequirement(item.minSingularityRequired)})`
                            : unlockHint(item, state, state.language)}
                        </span>
                      </span>
                    ) : (
                      <button
                        onClick={() => buyHardware(item.id)}
                        disabled={!canAfford}
                        className={`py-1.5 px-3 rounded text-xs font-bold flex items-center gap-1.5 transition-all ${
                          canAfford
                            ? 'mutating-btn-primary theme-on-accent cursor-pointer'
                            : 'theme-raised-bg mutating-text-muted cursor-not-allowed border theme-border'
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
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5 theme-panel-bg border theme-warn-border p-3 rounded-lg text-xs">
            <div>
              <span className="mutating-text-muted text-[11px] block">{t(state.language, 'power_grid')}</span>
              <span className={`font-bold text-sm ${state.activePowerKw > state.maxPowerKw ? 'theme-danger-text' : 'theme-warn-text'}`}>
                {state.activePowerKw} / {state.maxPowerKw} kW
              </span>
            </div>
            <div>
              <span className="mutating-text-muted text-[11px] block">{t(state.language, 'cooling_capacity')}</span>
              <span className="theme-success-text font-bold text-sm">{state.maxCoolingKw} kW</span>
            </div>
            <div>
              <span className="mutating-text-muted text-[11px] block">{t(state.language, 'core_temperature')}</span>
              <span className={`font-bold text-sm ${state.systemHeatCelsius > 80 ? 'theme-danger-text' : 'theme-text'}`}>
                {state.systemHeatCelsius}°C
              </span>
            </div>
            <div>
              <span className="mutating-text-muted text-[11px] block">{tr(state.language, 'hardwareRack.circuitBreaker')}</span>
              <span className={`font-bold text-sm ${state.powerTripSeconds > 0 ? 'theme-danger-text animate-pulse' : 'theme-success-text'}`}>
                {state.powerTripSeconds > 0 ? `${formatGameTime(state.powerTripSeconds)} (${tr(state.language, 'hardwareRack.tripped')})` : 'NOMINAL (OK)'}
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
                    ? 'theme-warn-soft theme-warn-border theme-warn-text'
                    : 'theme-sub-bg theme-border mutating-text-muted'
                }`}
              >
                {tr(state.language, 'hardwareRack.allInfrastructure')}
              </button>
              <button
                onClick={() => setThermalSubFilter('cooling')}
                className={`px-2.5 py-1 rounded text-[11px] font-bold border transition-colors ${
                  thermalSubFilter === 'cooling'
                    ? 'theme-success-soft theme-success-border theme-success-text'
                    : 'theme-sub-bg theme-border mutating-text-muted'
                }`}
              >
                {t(state.language, 'cooling')}
              </button>
              <button
                onClick={() => setThermalSubFilter('power')}
                className={`px-2.5 py-1 rounded text-[11px] font-bold border transition-colors ${
                  thermalSubFilter === 'power'
                    ? 'theme-warn-soft theme-warn-border theme-warn-text'
                    : 'theme-sub-bg theme-border mutating-text-muted'
                }`}
              >
                {t(state.language, 'power_supply')}
              </button>
            </div>
            <span className="text-[11px] mutating-text-muted">
              {thermalPowerHardware.length} {tr(state.language, 'hardwareRack.supportSystems')}
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
                      ? 'mutating-card theme-warn-border shadow-sm' 
                      : 'mutating-sub'
                  }`}
                >
                  <div>
                    <div className="flex items-start justify-between gap-2">
                      <div>
                        <div className="flex items-center gap-2 flex-wrap">
                          <h3 className="font-bold text-xs theme-text flex items-center gap-1.5">
                            {displayItem.name}
                          </h3>
                          {HARDWARE_DOCS[item.id] && (
                            <DocLinkBadge doc={HARDWARE_DOCS[item.id]} language={state.language} />
                          )}
                        </div>
                        <div className="flex items-center gap-2 mt-0.5">
                          <span className="text-[11px] theme-warn-text font-mono">
                            {t(state.language, 'installed')}: <strong className="theme-text">{item.count} {t(state.language, 'units')}</strong>
                          </span>
                          {isLocked && (
                            <span className="text-[11px] px-1.5 py-0.2 rounded theme-accent-soft border theme-accent-border mutating-accent-text font-bold flex items-center gap-1">
                              <Lock className="w-2.5 h-2.5" />
                              {item.minSingularityRequired && item.minSingularityRequired > state.singularityProgress
                                ? `${progressRequirement(item.minSingularityRequired)}`
                                : researchTitle ?? tr(state.language, 'hardwareRack.futureTechnology')}
                            </span>
                          )}
                        </div>
                      </div>

                      <div className="text-right">
                        <span className="text-xs font-bold theme-warn-text block">
                          ${item.price.toLocaleString()} CR
                        </span>
                      </div>
                    </div>

                    <p className="text-xs mutating-text-muted mt-2 leading-relaxed">
                      {displayItem.description}
                    </p>

                    {/* Specs Badges */}
                    <div className="flex flex-wrap gap-2 mt-2.5 text-[11px]">
                      {item.powerCapacityKw && (
                        <span className="px-2 py-0.5 rounded theme-warn-soft border theme-warn-border theme-warn-text">
                          +{item.powerCapacityKw} kW {t(state.language, 'power_capacity')}
                        </span>
                      )}
                      {item.coolingCapacityKw && (
                        <span className="px-2 py-0.5 rounded theme-success-soft border theme-success-border theme-success-text">
                          +{item.coolingCapacityKw} kW {t(state.language, 'heat_dissipation')}
                        </span>
                      )}
                    </div>
                  </div>

                  {/* Purchase Button */}
                  <div className="mt-3 pt-2 border-t theme-border flex items-center justify-end">
                    {isLocked ? (
                      <span className="py-1 px-2.5 rounded text-[11px] theme-sub-bg mutating-text-muted border theme-border flex items-center gap-1">
                        <Lock className="w-3 h-3 mutating-accent-text" />
                        <span>
                          {item.minSingularityRequired && item.minSingularityRequired > state.singularityProgress
                            ? `${t(state.language, 'blocked')} (${progressRequirement(item.minSingularityRequired)})`
                            : unlockHint(item, state, state.language)}
                        </span>
                      </span>
                    ) : (
                      <button
                        onClick={() => buyHardware(item.id)}
                        disabled={!canAfford}
                        className={`py-1.5 px-3 rounded text-xs font-bold flex items-center gap-1.5 transition-all ${
                          canAfford
                            ? 'theme-btn-warn theme-on-accent cursor-pointer'
                            : 'theme-raised-bg mutating-text-muted cursor-not-allowed border theme-border'
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
          <div className="rounded-lg border theme-accent-border theme-accent-soft p-4 space-y-3">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-2 border-b theme-accent-border">
              <div>
                <div className="flex items-center gap-2">
                  <HardDrive className="h-4 w-4 mutating-accent-text" />
                  <h3 className="text-sm font-bold mutating-accent-text">
                    {t(state.language, 'facility')}: {facility.name.toUpperCase()} (TIER {state.facilityTier})
                  </h3>
                </div>
                <p className="text-xs mutating-text-muted mt-1">
                  {tr(state.language, 'hardwareRack.physicalFacilitiesDetermineRackFootprint')}
                </p>
              </div>

              {nextFacility ? (
                <div className="flex flex-col items-start sm:items-end gap-1.5">
                  <span className="text-[11px] mutating-accent-text">
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
                    className="rounded border theme-accent-border theme-accent-soft px-3 py-1.5 text-xs font-bold mutating-accent-text disabled:cursor-not-allowed disabled:opacity-40 transition-colors"
                  >
                    {t(state.language, 'upgrade')} · ${nextFacility.price.toLocaleString()} CR
                    {nextFacility.requiredSingularity > 0 && ` · ${progressRequirement(nextFacility.requiredSingularity)}`}
                    {!nextFacilityUnlocked && ` · ${nextFacilityResearch ? localizedResearch(state.language, nextFacilityResearch).title : tr(state.language, 'hardwareRack.futureTechnology')}`}
                  </button>
                </div>
              ) : (
                <span className="px-3 py-1 rounded theme-success-soft border theme-success-border text-xs font-bold theme-success-text">
                  {t(state.language, 'max_tier')}
                </span>
              )}
            </div>

            {/* Billing and Electric Utility Metrics */}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 pt-2 text-xs">
              <div className="p-3 rounded theme-sub-bg border theme-accent-border">
                <span className="mutating-text-muted text-[11px] block">{t(state.language, 'monthly_rent')}</span>
                <span className="theme-text font-bold font-mono text-sm">${facility.monthlyLeaseCost.toLocaleString()} CR</span>
                <span className="text-[11px] mutating-text-muted block mt-0.5">{tr(state.language, 'hardwareRack.fixedLeaseAgreement')}</span>
              </div>

              <div className="p-3 rounded theme-sub-bg border theme-accent-border">
                <span className="mutating-text-muted text-[11px] block">{t(state.language, 'monthly_estimate')}</span>
                <span className="theme-warn-text font-bold font-mono text-sm">${estimatedMonthlyCost.toFixed(2)} CR</span>
                <span className="text-[11px] mutating-text-muted block mt-0.5">{tr(state.language, 'hardwareRack.energyUsedSoFar', { kwh: Math.round(state.monthEnergyKwh ?? 0), rate: ELECTRICITY_RATE_PER_KWH.toFixed(2), kw: state.activePowerKw })}</span>
              </div>

              <div className="p-3 rounded theme-sub-bg border theme-accent-border">
                <span className="mutating-text-muted text-[11px] block">{t(state.language, 'utility_debt')}</span>
                <span className={`font-bold font-mono text-sm ${state.utilityDebt > 0 ? 'theme-danger-text' : 'theme-success-text'}`}>
                  ${state.utilityDebt.toFixed(2)} CR
                </span>
                <span className="text-[11px] mutating-text-muted block mt-0.5">
                  {state.utilityDebt > 0 
                    ? tr(state.language, 'hardwareRack.repayDebtPreventBlackouts')
                    : tr(state.language, 'hardwareRack.accountGoodStanding')}
                </span>
              </div>
            </div>

            {/* Billing cycle status */}
            <div className="pt-1">
              <div className="flex items-center justify-between text-[11px] mutating-text-muted mb-1">
                <span>{t(state.language, 'billing_cycle')}:</span>
                <span className="mutating-accent-text font-mono">
                  {Math.floor((((state.gameDay || 1) - 1 + (state.dayTicks || 0) / 48) / DAYS_PER_GAME_MONTH) * 100)}% 
                  ({tr(state.language, 'hardwareRack.dayMonth', { gameDay: state.gameDay || 1, daysPerMonth: DAYS_PER_GAME_MONTH, gameMonth: state.gameMonth || 1 })})
                </span>
              </div>
              <div className="h-1.5 w-full theme-raised-bg rounded-full overflow-hidden">
                <div 
                  className="h-full mutating-btn-primary transition-all duration-300"
                  style={{ width: `${Math.min(100, Math.floor((((state.gameDay || 1) - 1 + (state.dayTicks || 0) / 48) / DAYS_PER_GAME_MONTH) * 100))}%` }}
                />
              </div>
            </div>
          </div>

          {/* Shadow Compute Covert Operation Console */}
          <div className="rounded-lg border theme-warn-border theme-warn-soft p-4 space-y-3">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
              <div>
                <div className="flex items-center gap-2 text-sm font-bold theme-warn-text">
                  <AlertTriangle className="h-4 w-4 theme-warn-text" />
                  <span>{t(state.language, 'shadow_capacity')} · {t(state.language, 'fictional_event')}</span>
                </div>
                <p className="mt-1 text-xs mutating-text-muted leading-relaxed max-w-xl">
                  {t(state.language, 'shadow_compute_description')} <strong className="theme-warn-text">{shadowDetectionChance.toFixed(0)}%</strong>. 
                  {state.borrowedComputeSeconds > 0 && (
                    <span className="mutating-accent-text ml-1">
                      {t(state.language, 'temporary_capacity')}: {formatCompute(state.borrowedComputePflops)} · {formatGameTime(state.borrowedComputeSeconds)} {tr(state.language, 'hardwareRack.left')}.
                    </span>
                  )}
                  {state.detentionSeconds > 0 && (
                    <span className="theme-danger-text font-bold ml-1">
                      {t(state.language, 'operative_detained')} · {formatGameTime(state.detentionSeconds)} {tr(state.language, 'hardwareRack.blocked')}.
                    </span>
                  )}
                </p>
              </div>

              <button
                type="button"
                onClick={attemptShadowCompute}
                disabled={state.detentionSeconds > 0 || state.borrowedComputeSeconds > 0}
                className="rounded border theme-warn-border theme-warn-soft px-4 py-2 text-xs font-bold theme-warn-text disabled:cursor-not-allowed disabled:opacity-40 transition-colors shrink-0"
              >
                {tr(state.language, 'hardwareRack.runShadowExploit')} · {shadowDetectionChance.toFixed(0)}% {t(state.language, 'risk')}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
