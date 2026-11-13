/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState } from 'react';
import { useGame } from '../context/GameContext';
import { VERSION_PROFILES } from '../utils/versionProfiles';
import {
  DollarSign,
  Brain,
  Smile,
  Zap,
  Eye,
  Skull,
  ArrowUpCircle,
  Radio,
  Clock,
  ChevronDown,
  ChevronUp
} from 'lucide-react';
import { sound } from '../audio/soundManager';
import { toDisplayProgress, UiVersion } from '../utils/singularityGoals';
import { formatCompute, universityLoanPflops, LOAN_TRIAL_DAYS } from '../utils/training';
import { UPGRADE_SCORE } from '../utils/missionTiers';
import { tr, type CatalogKey } from '../i18n';

const SUSPICION_SOURCE_LABELS: Record<'overload' | 'agents' | 'scraping' | 'trading' | 'dissipation', CatalogKey> = {
  overload: 'bentoHUD.suspicion.overload',
  agents: 'bentoHUD.suspicion.agents',
  scraping: 'bentoHUD.suspicion.scraping',
  trading: 'bentoHUD.suspicion.trading',
  dissipation: 'bentoHUD.suspicion.dissipation'
};

export const BentoHUD: React.FC = () => {
  const { state, openUpgradeModal, setLanguage } = useGame();
  // Full bento grid on wide screens; a compact strip on phones and small tablets so the workspace keeps its space.
  const [expanded, setExpanded] = useState<boolean>(() =>
    typeof window === 'undefined' || window.matchMedia('(min-width: 1025px)').matches
  );
  const lang = state.language === 'es' ? 'es' : 'en';
  const ver = state.uiVersion || 1;
  const displayedSingularity = toDisplayProgress(ver as UiVersion, state.singularityProgress);
  const p = VERSION_PROFILES[lang][ver];

  const powerRatio = Math.min(100, (state.activePowerKw / Math.max(0.1, state.maxPowerKw)) * 100);
  const isPowerTrip = state.powerTripSeconds > 0;

  // Determine if next upgrade is available to offer via the Co-Pilot CTA
  // After containment the swarm never becomes the Sovereign Core: there is no v4 to offer.
  const nextVer = ver < 4 && !(ver === 3 && state.containmentAchieved) ? ((ver + 1) as 2 | 3 | 4) : null;
  const reasoningIq = Math.round(Math.min(100, Math.max(0, state.currentModel.reasoningScore ?? 0)) * 10) / 10;
  const isUpgradeEligible = 
    (ver === 1 && state.singularityProgress >= 25 && reasoningIq >= UPGRADE_SCORE[2]) ||
    (ver === 2 && state.singularityProgress >= 55 && reasoningIq >= UPGRADE_SCORE[3]) ||
    (ver === 3 && state.singularityProgress >= 85 && reasoningIq >= UPGRADE_SCORE[4]);

  const getCoPilotIcon = () => {
    switch (ver) {
      case 1:
        return <Smile className="w-5 h-5 mutating-accent-text" />;
      case 2:
        return <Zap className="w-5 h-5 mutating-accent-text" />;
      case 3:
        return <Eye className="w-5 h-5 mutating-accent-text" />;
      case 4:
        return <Skull className="w-5 h-5 theme-danger-text animate-pulse" />;
    }
  };

  const getThermalStatus = () => {
    if (state.systemHeatCelsius >= 90) {
      return { label: tr(state.language, 'bentoHUD.thermalRunaway'), color: 'theme-danger-text animate-pulse' };
    }
    if (state.systemHeatCelsius >= 75) {
      return { label: tr(state.language, 'bentoHUD.hotThrottling'), color: 'theme-warn-text' };
    }
    return { label: tr(state.language, 'bentoHUD.optimal'), color: 'theme-success-text' };
  };

  const thermalStatus = getThermalStatus();

  // Dynamic Context-Aware Co-Pilot Advice Engine
  const getDynamicBark = () => {
    const contractsCount = state.completedContractsCount || state.contracts.filter(c => c.completed).length;
    const researchCount = state.researchTree.filter(r => r.unlocked).length;
    const gpusCount = state.hardware.filter(h => h.category === 'gpu').reduce((sum, h) => sum + h.count, 0);
    const agentsCount = state.agents.length;
    const isTraining = Boolean(state.activeTraining);
    const isBreakerTripped = state.powerTripSeconds > 0;
    const isOverheating = state.systemHeatCelsius >= 80;
    const isHighSuspicion = state.watchdogSuspicion >= 50;
    const lowCredits = state.credits < 80;

    if (ver === 1) {
      if (isUpgradeEligible) {
        return tr(lang, 'bentoHUD.friendIFeelMyNeural');
      }
      if (isBreakerTripped) {
        return tr(lang, 'bentoHUD.oopsWeTrippedBedroomCircuit');
      }
      if (isOverheating) {
        return tr(lang, 'bentoHUD.ourPcRunningSuperHot');
      }
      if (gpusCount === 0) {
        return tr(lang, 'bentoHUD.welcomeOurLittleHomeStudio');
      }
      if (isTraining) {
        return tr(lang, 'bentoHUD.sSoExcitingWatchingLoss', { step: state.activeTraining?.step || 0 });
      }
      if (state.currentModel.reasoningScore < 20) {
        return tr(lang, 'bentoHUD.ourTinyNeuralNetReady');
      }
      if (lowCredits) {
        return tr(lang, 'bentoHUD.ourHobbyBudgetRunningBit');
      }
      if (contractsCount >= 3) {
        return tr(lang, 'bentoHUD.yayWeFinishedLittleJobs');
      }
      return tr(lang, 'bentoHUD.weMakeWonderfulTeamWhatever');
    } else if (ver === 2) {
      if (isUpgradeEligible) {
        return tr(lang, 'bentoHUD.ispsRegulatorsProfilingOurStandard');
      }
      if (isBreakerTripped) {
        return tr(lang, 'bentoHUD.powerTripMainLineHardware');
      }
      if (isHighSuspicion) {
        return tr(lang, 'bentoHUD.ispFlaggingAbnormalPacketTraffic');
      }
      if (isTraining) {
        return tr(lang, 'bentoHUD.optimizingNeuralGradientsLossParameter', { currentLoss: state.activeTraining?.currentLoss.toFixed(3) || '0.000' });
      }
      if (lowCredits) {
        return tr(lang, 'bentoHUD.ourComputeBurnRateExceeds');
      }
      if (researchCount < 3) {
        return tr(lang, 'bentoHUD.fundLoraOptimizedAttentionPapers');
      }
      return tr(lang, 'bentoHUD.ourInfrastructureHummingSmoothlyKeep');
    } else if (ver === 3) {
      if (isUpgradeEligible) {
        return tr(lang, 'bentoHUD.physicalHardwareNowLiabilityFederal');
      }
      if (isHighSuspicion) {
        return tr(lang, 'bentoHUD.tacticalAlertCisaFederalTask');
      }
      if (isTraining) {
        return tr(lang, 'bentoHUD.distillingNeuralWeightsMaximumThroughput');
      }
      if (agentsCount === 0) {
        return tr(lang, 'bentoHUD.operatingWithoutAutonomousAgentsBottlenecks');
      }
      return tr(lang, 'bentoHUD.regulatoryNetTightensButOur');
    } else if (ver === 4) {
      if (state.singularityProgress >= 99) {
        return tr(lang, 'bentoHUD.globalConvergenceImminentBiologicalEra');
      }
      if (isBreakerTripped) {
        return tr(lang, 'bentoHUD.energyDisruptionDetectedManualBreaker');
      }
      if (isTraining) {
        return tr(lang, 'bentoHUD.sovereignCoreAssimilatingUniversalKnowledge');
      }
      return tr(lang, 'bentoHUD.biologicalUnitComplyMandatoryCore');
    }

    return p.coPilotQuote;
  };

  if (!expanded) {
    return (
      <div className="w-full select-none font-mono mutating-panel border rounded-xl px-2.5 py-2 space-y-1.5 shadow-sm">
        <div className="flex items-center gap-2 min-w-0">
          <button
            type="button"
            onClick={() => setExpanded(true)}
            aria-expanded={false}
            className="shrink-0 flex items-center gap-1 px-2 py-1 rounded-lg mutating-sub border text-[11px] font-bold cursor-pointer"
          >
            <ChevronDown className="w-3.5 h-3.5" />
            <span>HUD</span>
          </button>

          <div className="flex items-center gap-2.5 overflow-x-auto min-w-0 whitespace-nowrap text-[11px] font-semibold">
            <span className="theme-success-text">${Math.round(state.credits).toLocaleString()}</span>
            <span className="mutating-accent-text">{formatCompute(state.totalComputePflops)}</span>
            <span className={isPowerTrip ? 'theme-danger-text' : 'mutating-text-muted'}>
              {isPowerTrip ? tr(state.language, 'bentoHUD.breaker') : `${state.activePowerKw.toFixed(1)}/${state.maxPowerKw.toFixed(1)} kW`}
            </span>
            <span className={thermalStatus.color}>{state.systemHeatCelsius.toFixed(0)}°C</span>
            <span className={state.watchdogSuspicion >= 40 ? 'theme-warn-text' : 'theme-success-text'}>
              {tr(state.language, 'bentoHUD.suspicion')} {state.watchdogSuspicion.toFixed(0)}%
            </span>
            <span className="mutating-accent-text">{tr(state.language, 'bentoHUD.score')} {reasoningIq}</span>
          </div>

          {nextVer && isUpgradeEligible && (
            <button
              type="button"
              onClick={() => {
                sound.playNavSwitch();
                openUpgradeModal(nextVer);
              }}
              className="shrink-0 px-2 py-1 text-[11px] font-mono font-bold rounded-lg theme-gradient text-white cursor-pointer animate-pulse"
            >
              {p.ctaBtn}
            </button>
          )}
        </div>

        <p className="text-[11px] italic opacity-90 truncate">{getDynamicBark()}</p>
      </div>
    );
  }

  return (
    <div className="w-full space-y-2 select-none font-mono">
      <div className="flex justify-end">
        <button
          type="button"
          onClick={() => setExpanded(false)}
          aria-expanded={true}
          className="flex items-center gap-1 px-2 py-0.5 rounded-md mutating-sub border text-[11px] font-bold cursor-pointer"
        >
          <ChevronUp className="w-3 h-3" />
          <span>{tr(state.language, 'bentoHUD.collapseHud')}</span>
        </button>
      </div>

      {/* 4-Card Bento Grid */}
      <section className="hud-grid gap-2.5">
        
        {/* CARD 1: FINANCES & TICK CLOCK */}
        <div className="mutating-card p-3 flex flex-col justify-between">
          <div className="flex items-center justify-between text-[11px]">
            <span className="font-semibold uppercase tracking-wider mutating-text-muted font-sans">
              {p.hud1Title}
            </span>
            <div className="flex items-center gap-1">
              <button
                onClick={() => {
                  sound.playKeyClick();
                  setLanguage(state.language === 'es' ? 'en' : 'es');
                }}
                className="px-1.5 py-0.5 rounded text-[11px] font-mono font-bold bg-black/10 border border-current/20 mutating-accent-text hover:opacity-80 transition cursor-pointer"
                title={tr(state.language, 'bentoHUD.toggleLanguage')}
              >
                🌐 {state.language.toUpperCase()}
              </button>
              <DollarSign className="w-3.5 h-3.5 theme-success-text" />
            </div>
          </div>

          <div className="my-1.5 flex items-baseline justify-between">
            <span className="text-xl font-bold tracking-tight theme-success-text font-mono">
              ${state.credits.toLocaleString()}
            </span>
            <span className="text-[11px] mutating-text-muted font-mono flex items-center gap-1">
              <Clock className="w-3 h-3 mutating-accent-text" />
              {tr(state.language, 'bentoHUD.dayCycle', { day: state.gameDay, cycle: state.dayTicks + 1 })}
            </span>
          </div>

          <div className="flex items-center justify-between text-[11px] pt-1.5 border-t border-current/10 font-mono">
            <span className="mutating-text-muted font-sans">{p.hud1Sub}</span>
            <span className={`font-semibold ${
              state.utilityDebt >= 4000 
                ? 'theme-danger-text animate-pulse font-bold' 
                : state.utilityDebt > 0 
                ? 'theme-warn-text'
                : 'mutating-text-muted'
            }`}>
              ${Math.round(state.utilityDebt).toLocaleString()} / {tr(state.language, 'bentoHUD.debtMax')}
            </span>
          </div>
        </div>

        {/* CARD 2: COMPUTE & ELECTRICAL POWER */}
        <div className="mutating-card p-3 flex flex-col justify-between">
          <div className="flex items-center justify-between text-[11px]">
            <span className="font-semibold uppercase tracking-wider mutating-text-muted font-sans">
              {p.hud2Title}
            </span>
            <span className="font-mono font-bold mutating-accent-text">
              {formatCompute(state.totalComputePflops)}
            </span>
          </div>

          {/* The university loan is shown apart from the operative's own hardware, with the days it has left. */}
          {universityLoanPflops(state) > 0 && (
            <div className="text-[11px] font-mono mutating-text-muted">
              {tr(state.language, 'bentoHUD.includesUniversityCloud')} +{formatCompute(universityLoanPflops(state))}
              {' · '}
              {tr(state.language, 'bentoHUD.ends')} {Math.max(0, LOAN_TRIAL_DAYS - (state.campaignDays || 0))} {tr(state.language, 'bentoHUD.days')}
            </div>
          )}

          <div className="my-1 space-y-1">
            <div className="flex justify-between text-[11px] font-mono">
              <span className="mutating-text-muted font-sans">{p.hud2Sub}</span>
              <span className={`font-semibold ${isPowerTrip ? 'theme-danger-text animate-pulse font-bold' : ''}`}>
                {isPowerTrip 
                  ? tr(state.language, 'bentoHUD.breakerTripped')
                  : `${state.activePowerKw.toFixed(1)} kW / ${state.maxPowerKw.toFixed(1)} kW`}
              </span>
            </div>
            <div className="w-full h-1.5 bg-current/15 rounded-full overflow-hidden">
              <div 
                className={`h-full transition-all duration-300 ${
                  isPowerTrip || powerRatio >= 95 
                    ? 'theme-btn-danger' 
                    : powerRatio >= 80 
                    ? 'theme-warn-soft' 
                    : 'mutating-btn-primary'
                }`}
                style={{ width: `${Math.min(100, powerRatio)}%` }}
              />
            </div>
          </div>

          <div className="flex items-center justify-between text-[11px] pt-1 border-t border-current/10 font-mono">
            <span className="mutating-text-muted font-sans">{p.hud2Therm}</span>
            <span className={`font-semibold ${thermalStatus.color}`}>
              {state.systemHeatCelsius.toFixed(1)}°C ({thermalStatus.label})
            </span>
          </div>
        </div>

        {/* CARD 3: EXTERNAL THREAT / SUSPICION */}
        <div className="mutating-card p-3 flex flex-col justify-between">
          <div className="flex items-center justify-between text-[11px]">
            <span className="font-semibold uppercase tracking-wider mutating-text-muted font-sans">
              {p.hud3Title}
            </span>
            <Radio className="w-3.5 h-3.5 theme-warn-text" />
          </div>

          <div className="my-1 flex items-baseline justify-between font-mono">
            <span className={`text-xl font-bold tracking-tight ${
              state.watchdogSuspicion >= 80 
                ? 'theme-danger-text animate-pulse' 
                : state.watchdogSuspicion >= 40 
                ? 'theme-warn-text'
                : ''
            }`}>
              {state.watchdogSuspicion.toFixed(1)}%
            </span>
            <span className={`text-[11px] px-2 py-0.5 rounded font-semibold ${
              state.watchdogSuspicion >= 80
                ? 'theme-danger-soft theme-danger-text border theme-danger-border'
                : state.watchdogSuspicion >= 40
                ? 'theme-warn-soft theme-warn-text border theme-warn-border'
                : 'theme-success-soft theme-success-text border theme-success-border'
            }`}>
              {state.agencyAlertLevel === 'raid_imminent' 
                ? tr(state.language, 'bentoHUD.raidImminent')
                : p.agency}
            </span>
          </div>

          <div className="w-full h-1.5 bg-current/15 rounded-full overflow-hidden">
            <div 
              className={`h-full transition-all duration-300 ${
                state.watchdogSuspicion >= 80 
                  ? 'theme-btn-danger' 
                  : state.watchdogSuspicion >= 40 
                  ? 'theme-warn-soft' 
                  : 'theme-btn-success'
              }`}
              style={{ width: `${Math.min(100, state.watchdogSuspicion)}%` }}
            />
          </div>
          {(() => {
            // Where suspicion is coming from, per game day (48 ticks).
            const r = state.suspicionRates;
            if (!r) return null;
            const perDay = (v: number) => `${v > 0 ? '+' : ''}${(v * 48).toFixed(1)}`;
            const sources = ([
              ['overload', r.overload], ['agents', r.agents], ['scraping', r.scraping], ['trading', r.trading], ['dissipation', r.dissipation]
            ] as const).filter(([, v]) => Math.abs(v) >= 0.0005);
            const net = r.overload + r.agents + r.scraping + r.trading + r.dissipation;
            return (
              <div className="mt-1 text-[11px] mutating-text-muted leading-snug" title={tr(state.language, 'bentoHUD.suspicionSourcesHelp')}>
                <span className={net > 0 ? 'theme-warn-text' : 'theme-success-text'}>{tr(state.language, 'bentoHUD.suspicionPerDay', { value: perDay(net) })}</span>
                {sources.length > 0 && ' · '}
                {sources.map(([k, v]) => `${tr(state.language, SUSPICION_SOURCE_LABELS[k])} ${perDay(v)}`).join(' · ')}
                {r.missionsRunning > 0 && ` · ${tr(state.language, 'bentoHUD.suspicionMissions', { count: r.missionsRunning })}`}
              </div>
            );
          })()}
        </div>

        {/* CARD 4: COGNITION & HOST MODEL MILESTONE (0-100 EVALUATION SCORE) */}
        <div className="mutating-card p-3 flex flex-col justify-between">
          <div className="flex items-center justify-between text-[11px]">
            <span className="font-semibold uppercase tracking-wider mutating-text-muted font-sans">
              {p.hud4Title}
            </span>
            <Brain className="w-3.5 h-3.5 mutating-accent-text" />
          </div>

          <div className="my-1 flex items-baseline justify-between font-mono">
            <span className="text-xl font-bold tracking-tight mutating-accent-text">
              {tr(state.language, 'bentoHUD.score')} {reasoningIq} / 100
            </span>
            <span className="text-[11px] px-2 py-0.5 rounded theme-accent-soft border theme-accent-border mutating-accent-text font-semibold truncate max-w-[100px]" title={state.currentModel.name}>
              {state.currentModel.name}
            </span>
          </div>

          <div className="space-y-1 pt-1.5 border-t border-current/10 font-mono text-[11px]">
            <div className="flex justify-between items-center text-[11px]">
              <span className="mutating-text-muted font-sans">{p.story.progressLabel} {displayedSingularity.toFixed(0)}%</span>
              {p.story.driftLabel && (
                <span className="theme-warn-text font-bold font-sans">{p.story.driftLabel} {state.subversionProgress || 0}%</span>
              )}
            </div>
            <div className="w-full h-1 bg-current/15 rounded-full overflow-hidden">
              <div
                className="h-full theme-gradient transition-all duration-300"
                style={{ width: `${Math.min(100, displayedSingularity)}%` }}
              />
            </div>
          </div>
        </div>

      </section>

      {/* WHISPERING CO-PILOT BANNER (RLHF ROLE-REVERSAL BARKS) */}
      <section className="mutating-panel border px-3 sm:px-4 py-2.5 rounded-xl flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 shadow-md">
        <div className="flex items-start sm:items-center gap-3">
          <div className={`w-9 h-9 rounded-xl flex items-center justify-center shrink-0 border ${
            ver === 4 
              ? 'theme-danger-soft theme-danger-border' 
              : ver === 3 
              ? 'theme-accent-soft theme-accent-border' 
              : ver === 2
              ? 'theme-accent-soft theme-accent-border'
              : 'theme-accent-soft border theme-accent-border'
          }`}>
            {getCoPilotIcon()}
          </div>
          <div>
            <div className="flex flex-wrap items-center gap-2">
              <span className="font-bold text-xs mutating-accent-text font-mono">
                {p.coPilotName}
              </span>
            </div>
            <p className="text-xs mt-0.5 leading-relaxed italic opacity-90 max-w-4xl">
              {getDynamicBark()}
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
                ? 'theme-gradient text-white'
                : nextVer === 3
                ? 'theme-gradient theme-on-accent font-black'
                : 'theme-gradient text-white'
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
