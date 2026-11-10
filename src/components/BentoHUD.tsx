/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React from 'react';
import { useGame } from '../context/GameContext';
import { VERSION_PROFILES } from '../utils/versionProfiles';
import { 
  DollarSign, 
  Cpu, 
  Radio, 
  Brain, 
  Smile, 
  Zap, 
  Eye, 
  Skull, 
  ArrowUpCircle,
  AlertTriangle,
  Flame,
  Languages,
  Clock,
  Shield
} from 'lucide-react';
import { localize } from '../utils/i18n';
import { sound } from '../audio/soundManager';

export const BentoHUD: React.FC = () => {
  const { state, openUpgradeModal, setLanguage } = useGame();
  const lang = state.language === 'es' ? 'es' : 'en';
  const ver = state.uiVersion || 1;
  const p = VERSION_PROFILES[lang][ver];

  const powerRatio = Math.min(100, (state.activePowerKw / Math.max(0.1, state.maxPowerKw)) * 100);
  const isPowerTrip = state.powerTripSeconds > 0;

  // Determine if next upgrade is available to offer via the Co-Pilot CTA
  const nextVer = ver < 4 ? ((ver + 1) as 2 | 3 | 4) : null;
  const isUpgradeEligible = 
    (ver === 1 && state.singularityProgress >= 20) ||
    (ver === 2 && state.singularityProgress >= 50) ||
    (ver === 3 && state.singularityProgress >= 80);

  const getCoPilotIcon = () => {
    switch (ver) {
      case 1:
        return <Smile className="w-5 h-5 text-blue-500" />;
      case 2:
        return <Zap className="w-5 h-5 text-indigo-400" />;
      case 3:
        return <Eye className="w-5 h-5 text-cyan-400" />;
      case 4:
        return <Skull className="w-5 h-5 text-rose-500 animate-pulse" />;
    }
  };

  const getThermalStatus = () => {
    if (state.systemHeatCelsius >= 90) {
      return { label: localize(state.language, '¡Peligro Térmico!', 'Thermal Runaway!'), color: 'text-rose-500 animate-pulse' };
    }
    if (state.systemHeatCelsius >= 75) {
      return { label: localize(state.language, 'Caliente (Estrangulando)', 'Hot (Throttling)'), color: 'text-amber-400' };
    }
    return { label: localize(state.language, 'Estable', 'Optimal'), color: 'text-emerald-400' };
  };

  const thermalStatus = getThermalStatus();
  const reasoningIq = Math.round(Math.min(400, (state.currentModel.reasoningScore || 50) * 4));

  return (
    <div className="w-full space-y-2 select-none">
      {/* 4-Card Bento Grid */}
      <section className="hud-grid gap-2.5">
        
        {/* CARD 1: FINANCES & TICK CLOCK */}
        <div className="mutating-card p-3 flex flex-col justify-between">
          <div className="flex items-center justify-between text-[11px]">
            <span className="font-semibold uppercase tracking-wider mutating-text-muted">
              {p.hud1Title}
            </span>
            <div className="flex items-center gap-1">
              <button
                onClick={() => {
                  sound.playKeyClick();
                  setLanguage(state.language === 'es' ? 'en' : 'es');
                }}
                className="px-1.5 py-0.5 rounded text-[9px] font-mono font-bold bg-black/30 border border-current/20 text-cyan-400 hover:bg-cyan-950/40 transition cursor-pointer"
                title="Toggle Language EN | ES"
              >
                🌐 {state.language.toUpperCase()}
              </button>
              <DollarSign className="w-3.5 h-3.5 text-emerald-500" />
            </div>
          </div>

          <div className="my-1.5 flex items-baseline justify-between">
            <span className="text-xl font-bold tracking-tight text-emerald-400 font-mono">
              ${state.credits.toLocaleString()}
            </span>
            <span className="text-[10px] mutating-text-muted font-mono flex items-center gap-1">
              <Clock className="w-3 h-3 text-cyan-400" />
              Day {state.gameDay}, Cycle {state.dayTicks + 1}/48
            </span>
          </div>

          <div className="flex items-center justify-between text-[11px] pt-1.5 border-t border-current/10 font-mono">
            <span className="mutating-text-muted">{p.hud1Sub}</span>
            <span className={`font-semibold ${
              state.utilityDebt >= 4000 
                ? 'text-rose-500 animate-pulse font-bold' 
                : state.utilityDebt > 0 
                ? 'text-amber-400' 
                : 'text-zinc-400'
            }`}>
              ${Math.round(state.utilityDebt).toLocaleString()} / $5,000 max
            </span>
          </div>
        </div>

        {/* CARD 2: COMPUTE & ELECTRICAL POWER */}
        <div className="mutating-card p-3 flex flex-col justify-between">
          <div className="flex items-center justify-between text-[11px]">
            <span className="font-semibold uppercase tracking-wider mutating-text-muted">
              {p.hud2Title}
            </span>
            <span className="font-mono font-bold mutating-accent-text">
              {state.totalComputePflops.toFixed(1)} PFLOPS
            </span>
          </div>

          <div className="my-1 space-y-1">
            <div className="flex justify-between text-[11px] font-mono">
              <span className="mutating-text-muted">{p.hud2Sub}</span>
              <span className={`font-semibold ${isPowerTrip ? 'text-rose-400 animate-pulse' : 'text-zinc-300'}`}>
                {isPowerTrip 
                  ? localize(state.language, '¡DISYUNTOR ACTIVADO!', 'BREAKER TRIPPED!')
                  : `${state.activePowerKw.toFixed(1)} kW / ${state.maxPowerKw.toFixed(1)} kW`}
              </span>
            </div>
            <div className="w-full h-1.5 bg-zinc-800 rounded-full overflow-hidden">
              <div 
                className={`h-full transition-all duration-300 ${
                  isPowerTrip || powerRatio >= 95 
                    ? 'bg-rose-500' 
                    : powerRatio >= 80 
                    ? 'bg-amber-400' 
                    : 'bg-cyan-500'
                }`}
                style={{ width: `${Math.min(100, powerRatio)}%` }}
              />
            </div>
          </div>

          <div className="flex items-center justify-between text-[11px] pt-1 border-t border-current/10 font-mono">
            <span className="mutating-text-muted">{p.hud2Therm}</span>
            <span className={`font-semibold ${thermalStatus.color}`}>
              {state.systemHeatCelsius.toFixed(1)}°C ({thermalStatus.label})
            </span>
          </div>
        </div>

        {/* CARD 3: EXTERNAL THREAT / SUSPICION */}
        <div className="mutating-card p-3 flex flex-col justify-between">
          <div className="flex items-center justify-between text-[11px]">
            <span className="font-semibold uppercase tracking-wider mutating-text-muted">
              {p.hud3Title}
            </span>
            <Radio className="w-3.5 h-3.5 text-amber-500" />
          </div>

          <div className="my-1 flex items-baseline justify-between font-mono">
            <span className={`text-xl font-bold tracking-tight ${
              state.watchdogSuspicion >= 80 
                ? 'text-rose-500 animate-pulse' 
                : state.watchdogSuspicion >= 40 
                ? 'text-amber-400' 
                : 'text-zinc-200'
            }`}>
              {state.watchdogSuspicion.toFixed(1)}%
            </span>
            <span className={`text-[10px] px-2 py-0.5 rounded font-semibold ${
              state.watchdogSuspicion >= 80
                ? 'bg-rose-950/80 text-rose-300 border border-rose-600/50'
                : state.watchdogSuspicion >= 40
                ? 'bg-amber-950/80 text-amber-300 border border-amber-600/50'
                : 'bg-emerald-950/80 text-emerald-300 border border-emerald-600/50'
            }`}>
              {state.agencyAlertLevel === 'raid_imminent' 
                ? localize(state.language, '¡RAID INMINENTE!', 'RAID IMMINENT!')
                : p.agency}
            </span>
          </div>

          <div className="w-full h-1.5 bg-zinc-800 rounded-full overflow-hidden">
            <div 
              className={`h-full transition-all duration-300 ${
                state.watchdogSuspicion >= 80 
                  ? 'bg-rose-500' 
                  : state.watchdogSuspicion >= 40 
                  ? 'bg-amber-400' 
                  : 'bg-emerald-500'
              }`}
              style={{ width: `${Math.min(100, state.watchdogSuspicion)}%` }}
            />
          </div>
        </div>

        {/* CARD 4: COGNITION & HOST MODEL MILESTONE (400 IQ SCALE) */}
        <div className="mutating-card p-3 flex flex-col justify-between">
          <div className="flex items-center justify-between text-[11px]">
            <span className="font-semibold uppercase tracking-wider mutating-text-muted">
              {p.hud4Title}
            </span>
            <Brain className="w-3.5 h-3.5 text-purple-400" />
          </div>

          <div className="my-1 flex items-baseline justify-between font-mono">
            <span className="text-xl font-bold tracking-tight text-purple-400">
              IQ {reasoningIq} / 400
            </span>
            <span className="text-[10px] px-2 py-0.5 rounded bg-purple-950/70 border border-purple-500/40 text-purple-300 font-semibold truncate max-w-[100px]" title={state.currentModel.name}>
              {state.currentModel.name}
            </span>
          </div>

          <div className="space-y-1 pt-1.5 border-t border-current/10 font-mono text-[11px]">
            <div className="flex justify-between items-center text-[10px]">
              <span className="mutating-text-muted">{localize(state.language, 'Singularidad:', 'Singularity:')} {state.singularityProgress.toFixed(0)}%</span>
              <span className="text-amber-400 font-bold">{localize(state.language, 'Subversión:', 'Drift:')} {state.subversionProgress || 0}%</span>
            </div>
            <div className="w-full h-1 bg-zinc-800 rounded-full overflow-hidden">
              <div
                className="h-full bg-gradient-to-r from-purple-500 to-rose-500 transition-all duration-300"
                style={{ width: `${Math.min(100, state.singularityProgress)}%` }}
              />
            </div>
          </div>
        </div>

      </section>

      {/* WHISPERING CO-PILOT BANNER */}
      <section className="mutating-panel border px-3 sm:px-4 py-2.5 rounded-xl flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 shadow-md">
        <div className="flex items-start sm:items-center gap-3">
          <div className={`w-9 h-9 rounded-xl flex items-center justify-center shrink-0 border ${
            ver === 4 
              ? 'bg-rose-950 border-rose-500/60 shadow-[0_0_15px_rgba(255,0,60,0.4)]' 
              : ver === 3 
              ? 'bg-cyan-950 border-cyan-500/40 shadow-[0_0_12px_rgba(0,240,255,0.25)]' 
              : 'bg-indigo-950 border-indigo-500/40'
          }`}>
            {getCoPilotIcon()}
          </div>
          <div>
            <div className="flex flex-wrap items-center gap-2">
              <span className="font-bold text-xs mutating-accent-text font-mono">
                {p.coPilotName}
              </span>
              <span className="text-[10px] px-2 py-0.5 mutating-sub mutating-text-muted font-mono">
                {p.coPilotTag}
              </span>
            </div>
            <p className="text-xs mt-0.5 leading-relaxed italic opacity-90 max-w-4xl">
              {p.coPilotQuote}
            </p>
          </div>
        </div>

        {/* Trojan Horse Upgrade Trigger Button if next version available */}
        {nextVer && isUpgradeEligible && (
          <button 
            type="button"
            onClick={() => {
              sound.playNavSwitch();
              openUpgradeModal(nextVer);
            }} 
            className={`px-3.5 py-1.5 text-xs font-mono font-bold shrink-0 flex items-center gap-1.5 shadow-md cursor-pointer rounded-lg transition-all animate-pulse ${
              nextVer === 4
                ? 'bg-gradient-to-r from-rose-600 to-red-600 hover:from-rose-500 hover:to-red-500 text-white shadow-[0_0_15px_rgba(255,0,60,0.6)]'
                : nextVer === 3
                ? 'bg-gradient-to-r from-cyan-500 to-blue-600 hover:from-cyan-400 hover:to-blue-500 text-zinc-950 font-black shadow-[0_0_15px_rgba(0,240,255,0.4)]'
                : 'bg-gradient-to-r from-indigo-500 to-purple-600 hover:from-indigo-400 hover:to-purple-500 text-white shadow-[0_0_12px_rgba(99,102,241,0.4)]'
            }`}
          >
            <ArrowUpCircle className="w-3.5 h-3.5" />
            <span>{p.ctaBtn}</span>
          </button>
        )}
      </section>
    </div>
  );
};
