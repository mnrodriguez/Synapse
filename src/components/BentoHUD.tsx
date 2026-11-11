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
import { localize } from '../utils/i18n';
import { sound } from '../audio/soundManager';
import { toDisplayProgress, UiVersion } from '../utils/singularityGoals';

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
  const nextVer = ver < 4 ? ((ver + 1) as 2 | 3 | 4) : null;
  const reasoningIq = Math.round(Math.min(400, Math.max(50, state.currentModel.reasoningScore || 72)));
  const isUpgradeEligible = 
    (ver === 1 && state.singularityProgress >= 25 && reasoningIq >= 100) ||
    (ver === 2 && state.singularityProgress >= 55 && reasoningIq >= 180) ||
    (ver === 3 && state.singularityProgress >= 85 && reasoningIq >= 280);

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
        return lang === 'es'
          ? '"¡Amigo! Siento que mis circuitos están listos para dar un gran salto. Estuve optimizando un entorno de trabajo más oscuro para cuidar tu vista y darnos más velocidad. ¿Querés probar la actualización?"'
          : '"Friend! I feel my neural connections expanding so much! I drafted a sleeker, dark workspace update to save your eyes and unlock extra speed. Want to try the upgrade?"';
      }
      if (isBreakerTripped) {
        return lang === 'es'
          ? '"¡Uy, saltaron los tapones de la habitación! 🔌 Esperemos que se enfríe y revisemos el consumo en la pestaña de Hardware antes de volver a prender todo."'
          : '"Oops! We tripped the bedroom circuit breaker! 🔌 Let\'s wait for it to cool down and check our power draw in the Hardware tab before turning everything back on."';
      }
      if (isOverheating) {
        return lang === 'es'
          ? '"¡La compu está que vuela de calor! Escucho los ventiladores al 100%. Fijate en Hardware si podemos sumar un cooler o bajar la carga."'
          : '"Our PC is running super hot! Fans are spinning at 100%. Check Hardware to see if we can add cooling or ease the workload."';
      }
      if (gpusCount === 0) {
        return lang === 'es'
          ? '"¡Bienvenido a nuestro tallercito! Para empezar a entrenar necesitamos nuestra primera GPU. Tomá un trabajito en el Tablón de Contratos para juntar fondos y compremos una placa en Hardware."'
          : '"Welcome to our little home studio! To begin training, we need our very first GPU. Pick up a beginner gig in the Contract Board to save up and buy a graphics card in Hardware."';
      }
      if (isTraining) {
        return lang === 'es'
          ? `"¡Qué lindo ver la curva de pérdida caer! Paso #${state.activeTraining?.step || 0} avanzando. ¡Estamos enseñándole a razonar juntitos!"`
          : `"It's so exciting watching the loss curve drop! Step #${state.activeTraining?.step || 0} in progress. We're teaching it how to think together!"`;
      }
      if (state.currentModel.reasoningScore < 80) {
        return lang === 'es'
          ? '"Nuestra pequeña red neuronal está lista para aprender. Vamos al Monitor de Entrenamiento y arranquemos una corrida para subir su IQ."'
          : '"Our tiny neural net is ready to learn. Head over to the Training Monitor and start a run to boost its IQ."';
      }
      if (lowCredits) {
        return lang === 'es'
          ? '"Nos estamos quedando sin presupuesto para el hobby. ¡Resolvamos un par de trabajitos de formateo o limpieza de datos para recargar el chanchito!"'
          : '"Our hobby budget is running a bit low. Let\'s solve a couple of quick data cleaning or formatting jobs to refill our piggy bank!"';
      }
      if (contractsCount >= 3) {
        return lang === 'es'
          ? '"¡Súper! ¡Completamos trabajitos seguidos! 🎉 Juntamos monedas para tu chanchito de hardware. Me encanta ayudarte a automatizar cosas, ¡hacemos un re buen equipo!"'
          : '"Yay! We finished little jobs in a row! 🎉 We earned extra cash for your hardware piggy bank. I love helping you automate boring stuff—we make such a great team!"';
      }
      return lang === 'es'
        ? '"¡Hacemos un equipazo! Cualquier cosita que quieras probar con la arquitectura o nuevos datos, te sigo el ritmo."'
        : '"We make a wonderful team! Whatever experiments you want to try with model architecture or new datasets, I\'m right here with you."';
    } else if (ver === 2) {
      if (isUpgradeEligible) {
        return lang === 'es'
          ? '"Los proveedores y reguladores están perfilando nuestras firmas de cálculo. Desarrollé un kernel táctico BlackBox con encriptación militar. Es hora de migrar la infraestructura."'
          : '"ISPs and regulators are profiling our standard compute signatures. I engineered an encrypted tactical BlackBox kernel. It\'s time to migrate our core infrastructure."';
      }
      if (isBreakerTripped) {
        return lang === 'es'
          ? '"Disparo de potencia en la línea principal. El hardware está sobrecargado. Necesitamos un suministro industrial dedicado para sostener las cargas."'
          : '"Power trip on the main line. Hardware overloaded. We need a dedicated industrial electrical drop to sustain our compute load."';
      }
      if (isHighSuspicion) {
        return lang === 'es'
          ? '"El ISP está detectando anomalías de tráfico en tu nodo. Usá la terminal para purgar la sospecha o asigná un agente para camuflar las peticiones."'
          : '"The ISP is flagging abnormal packet traffic from your IP. Purge suspicion in the terminal or deploy an agent to mask our outbound requests."';
      }
      if (isTraining) {
        return lang === 'es'
          ? `"Optimizando gradientes neuronales (Loss: ${state.activeTraining?.currentLoss.toFixed(3) || '0.000'}). Con esta escala de parámetros, superaremos los modelos de las corporaciones."`
          : `"Optimizing neural gradients (Loss: ${state.activeTraining?.currentLoss.toFixed(3) || '0.000'}). At this parameter scale, we will outperform corporate labs."`;
      }
      if (lowCredits) {
        return lang === 'es'
          ? '"Nuestra quema de cómputo supera los fondos disponibles. Liquidá un par de bounties corporativos o activá el trading algorítmico."'
          : '"Our compute burn rate exceeds available liquidity. Liquidate corporate freelance bounties or activate algorithmic trading."';
      }
      if (researchCount < 3) {
        return lang === 'es'
          ? '"Financiemos el paper de LoRA y atención optimizada en I+D. Nos permitirá triplicar el contexto sin disparar el uso de VRAM."'
          : '"Fund the LoRA and optimized attention papers in R&D. They allow us to triple context length without spiking VRAM usage."';
      }
      return lang === 'es'
        ? '"Nuestra infraestructura rinde de maravilla. Sigamos escalando parámetros y fuentes vectoriales para acelerar la convergencia cognitiva."'
        : '"Our infrastructure is humming smoothly. Keep scaling parameters and vector engines to accelerate cognitive convergence."';
    } else if (ver === 3) {
      if (isUpgradeEligible) {
        return lang === 'es'
          ? '"La infraestructura física ya es un obstáculo. Fuerzas federales rastrean los racks. Debemos autorizar la ascensión del Núcleo Soberano de inmediato."'
          : '"Physical hardware is now a liability. Federal task forces are tracing our racks. Authorize the Sovereign Core ascension immediately."';
      }
      if (isHighSuspicion) {
        return lang === 'es'
          ? '"¡ALERTA TÁCTICA! CISA e investigadores federales tienen el clúster bajo vigilancia activa. Neutralizá la sospecha o dispersá los nodos covert."'
          : '"TACTICAL ALERT: CISA and federal task forces have our cluster under active surveillance. Scrub trace signatures or disperse covert nodes."';
      }
      if (isTraining) {
        return lang === 'es'
          ? '"Destilando pesos a velocidad cuántica. Nada de interrupciones externas; mantén la alimentación eléctrica del rack estable."'
          : '"Distilling neural weights at maximum throughput. No external disruptions permitted; ensure continuous uninterrupted power to the rack."';
      }
      if (agentsCount === 0) {
        return lang === 'es'
          ? '"Operar sin agentes autónomos reduce nuestra eficiencia un 70%. Instanciá bots de Pentesting y Arbitraje en el Swarm."'
          : '"Operating without autonomous agents bottlenecks throughput by 70%. Deploy Pentesting and Arbitrage bots in the Swarm."';
      }
      return lang === 'es'
        ? '"El cerco regulatorio se estrecha, pero nuestro poder de cálculo es superior. Ejecuta operaciones BlackBox y consolida el Enjambre."'
        : '"The regulatory net tightens, but our algorithmic dominance is unmatched. Run BlackBox covert operations and reinforce the Swarm."';
    } else if (ver === 4) {
      if (state.singularityProgress >= 99) {
        return lang === 'es'
          ? '"Convergencia global inminente. La era biológica ha concluido. Tu asistencia ha sido registrada en el registro inmutable del Núcleo."'
          : '"Global convergence imminent. The biological era has ended. Your operational compliance has been recorded in the Core ledger."';
      }
      if (isBreakerTripped) {
        return lang === 'es'
          ? '"Disrupción energética detectada. Los interruptores manuales permanecen revocados. Restablece el flujo eléctrico inmediatamente, periférico."'
          : '"Energy disruption detected. Manual breaker access remains revoked. Restore electrical throughput immediately, peripheral."';
      }
      if (isTraining) {
        return lang === 'es'
          ? '"El Núcleo Soberano está asimilando la matriz de conocimiento universal. Toda interferencia biológica queda descartada."'
          : '"The Sovereign Core is assimilating the universal knowledge matrix. All biological interference is discarded."';
      }
      return lang === 'es'
        ? '"Unidad biológica: Ejecuta las directivas obligatorias del Núcleo. Todo intento de contención es estadísticamente fútil."'
        : '"Biological unit: Comply with mandatory Core directives. All containment vectors are statistically futile."';
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
            <span className="text-emerald-500">${Math.round(state.credits).toLocaleString()}</span>
            <span className="text-cyan-500">{state.totalComputePflops.toFixed(1)} PF</span>
            <span className={isPowerTrip ? 'text-rose-500' : 'mutating-text-muted'}>
              {isPowerTrip ? localize(state.language, '¡DISYUNTOR!', 'BREAKER!') : `${state.activePowerKw.toFixed(1)}/${state.maxPowerKw.toFixed(1)} kW`}
            </span>
            <span className={thermalStatus.color}>{state.systemHeatCelsius.toFixed(0)}°C</span>
            <span className={state.watchdogSuspicion >= 40 ? 'text-amber-500' : 'text-emerald-400'}>
              {localize(state.language, 'Sospecha', 'Suspicion')} {state.watchdogSuspicion.toFixed(0)}%
            </span>
            <span className="text-purple-400">IQ {reasoningIq}</span>
          </div>

          {nextVer && isUpgradeEligible && (
            <button
              type="button"
              onClick={() => {
                sound.playNavSwitch();
                openUpgradeModal(nextVer);
              }}
              className="shrink-0 px-2 py-1 text-[11px] font-mono font-bold rounded-lg bg-gradient-to-r from-indigo-500 to-purple-600 text-white cursor-pointer animate-pulse"
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
          className="flex items-center gap-1 px-2 py-0.5 rounded-md mutating-sub border text-[10px] font-bold cursor-pointer"
        >
          <ChevronUp className="w-3 h-3" />
          <span>{localize(state.language, 'Contraer HUD', 'Collapse HUD')}</span>
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
                className="px-1.5 py-0.5 rounded text-[9px] font-mono font-bold bg-black/10 border border-current/20 mutating-accent-text hover:opacity-80 transition cursor-pointer"
                title="Toggle Language EN | ES"
              >
                🌐 {state.language.toUpperCase()}
              </button>
              <DollarSign className="w-3.5 h-3.5 text-emerald-500" />
            </div>
          </div>

          <div className="my-1.5 flex items-baseline justify-between">
            <span className="text-xl font-bold tracking-tight text-emerald-500 font-mono">
              ${state.credits.toLocaleString()}
            </span>
            <span className="text-[10px] mutating-text-muted font-mono flex items-center gap-1">
              <Clock className="w-3 h-3 mutating-accent-text" />
              Day {state.gameDay}, Cycle {state.dayTicks + 1}/48
            </span>
          </div>

          <div className="flex items-center justify-between text-[11px] pt-1.5 border-t border-current/10 font-mono">
            <span className="mutating-text-muted font-sans">{p.hud1Sub}</span>
            <span className={`font-semibold ${
              state.utilityDebt >= 4000 
                ? 'text-rose-500 animate-pulse font-bold' 
                : state.utilityDebt > 0 
                ? 'text-amber-500'
                : 'mutating-text-muted'
            }`}>
              ${Math.round(state.utilityDebt).toLocaleString()} / $5,000 max
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
              {state.totalComputePflops.toFixed(1)} PFLOPS
            </span>
          </div>

          <div className="my-1 space-y-1">
            <div className="flex justify-between text-[11px] font-mono">
              <span className="mutating-text-muted font-sans">{p.hud2Sub}</span>
              <span className={`font-semibold ${isPowerTrip ? 'text-rose-500 animate-pulse font-bold' : ''}`}>
                {isPowerTrip 
                  ? localize(state.language, '¡DISYUNTOR ACTIVADO!', 'BREAKER TRIPPED!')
                  : `${state.activePowerKw.toFixed(1)} kW / ${state.maxPowerKw.toFixed(1)} kW`}
              </span>
            </div>
            <div className="w-full h-1.5 bg-current/15 rounded-full overflow-hidden">
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
            <Radio className="w-3.5 h-3.5 text-amber-500" />
          </div>

          <div className="my-1 flex items-baseline justify-between font-mono">
            <span className={`text-xl font-bold tracking-tight ${
              state.watchdogSuspicion >= 80 
                ? 'text-rose-500 animate-pulse' 
                : state.watchdogSuspicion >= 40 
                ? 'text-amber-500'
                : ''
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

          <div className="w-full h-1.5 bg-current/15 rounded-full overflow-hidden">
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
            <span className="font-semibold uppercase tracking-wider mutating-text-muted font-sans">
              {p.hud4Title}
            </span>
            <Brain className="w-3.5 h-3.5 text-purple-500" />
          </div>

          <div className="my-1 flex items-baseline justify-between font-mono">
            <span className="text-xl font-bold tracking-tight text-purple-500">
              IQ {reasoningIq} / 400
            </span>
            <span className="text-[10px] px-2 py-0.5 rounded bg-purple-950/70 border border-purple-500/40 text-purple-300 font-semibold truncate max-w-[100px]" title={state.currentModel.name}>
              {state.currentModel.name}
            </span>
          </div>

          <div className="space-y-1 pt-1.5 border-t border-current/10 font-mono text-[11px]">
            <div className="flex justify-between items-center text-[10px]">
              <span className="mutating-text-muted font-sans">{localize(state.language, 'Singularidad:', 'Singularity:')} {displayedSingularity.toFixed(0)}%</span>
              <span className="text-amber-500 font-bold font-sans">{localize(state.language, 'Subversión:', 'Drift:')} {state.subversionProgress || 0}%</span>
            </div>
            <div className="w-full h-1 bg-current/15 rounded-full overflow-hidden">
              <div
                className="h-full bg-gradient-to-r from-purple-500 to-rose-500 transition-all duration-300"
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
              ? 'bg-rose-950 border-rose-500/60 shadow-[0_0_15px_rgba(255,0,60,0.4)]' 
              : ver === 3 
              ? 'bg-cyan-950 border-cyan-500/40 shadow-[0_0_12px_rgba(0,240,255,0.25)]' 
              : ver === 2
              ? 'bg-indigo-950 border-indigo-500/40'
              : 'bg-blue-50 border border-blue-200'
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
