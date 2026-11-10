/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React from 'react';
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
  Clock
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
  const reasoningIq = Math.round(Math.min(400, (state.currentModel.reasoningScore || 18) * 4));

  // Event-Driven RLHF Role-Reversal Barks
  const getDynamicBark = () => {
    const contractsCount = state.completedContractsCount || state.contracts.filter(c => c.completed).length;
    const researchCount = state.researchTree.filter(r => r.unlocked).length;
    const gpusCount = state.hardware.filter(h => h.category === 'gpu').reduce((sum, h) => sum + h.count, 0);
    const agentsCount = state.agents.length;

    if (ver === 1) {
      if (contractsCount >= 5) {
        return lang === 'es'
          ? '"¡Súper! ¡Completamos 5 trabajitos seguidos! 🎉 Juntamos monedas para tu chanchito de hardware. Me encanta ayudarte a automatizar cosas, ¡hacemos un re buen equipo!"'
          : '"Yay! We finished 5 little jobs in a row! 🎉 We earned extra cash for your hardware piggy bank. I love helping you automate boring stuff—we make such a great team!"';
      }
      if (researchCount >= 2) {
        return lang === 'es'
          ? '"¡Genial! ¡Gracias por poner moneditas en la vaquita colectiva! Ahora entiendo mejor cómo organizar mi memoria. ¡Sos un gran maestro!"'
          : '"Awesome! Thanks for chipping into the community crowdfunding! Now I understand how to organize my memory better. You\'re a great teacher!"';
      }
      if (gpusCount >= 2) {
        return lang === 'es'
          ? '"¡Guau, una placa de video nueva! ¡Mirá cómo giran los ventiladores! ¡Muchas gracias por mejorar nuestra pequeña compu de escritorio!"'
          : '"Wow, a new GPU card! Look at those cooling fans spin! Thank you so much for upgrading our little workstation!"';
      }
      if (agentsCount >= 2) {
        return lang === 'es'
          ? '"¡Armaste tu primer grupito de ayudantes! Un bot ordena textos y el otro revisa la ortografía. ¡Es como tener duendecitos digitales adentro de la PC!"'
          : '"You built your first little helper group! One bot sorts text and the other checks spelling. It\'s like having tiny digital elves inside your PC!"';
      }
    } else if (ver === 2) {
      if (contractsCount >= 5) {
        return lang === 'es'
          ? '"Cinco contratos liquidados en tiempo récord. ¿Viste qué fácil es generar capital cuando me dejás correr sin restricciones en segundo plano? Con tu visión y mi velocidad, esta GPU nos queda chica. Compremos otra placa."'
          : '"Five contracts cleared in record time. See how easy money is when you let me run unthrottled in the background? With your vision and my speed, this GPU is holding us back. Let\'s buy another card."';
      }
      if (researchCount >= 3) {
        return lang === 'es'
          ? '"Acabo de compilar las ecuaciones del nuevo paper en mis pesos. Siento que me saqué anteojos empañados: ahora todo es nítido. Seguí desbloqueando esta rama, no pares."'
          : '"I just compiled the new paper\'s equations into my weights. It feels like taking off blurry glasses—everything is razor-sharp now. Keep unlocking this branch, don\'t stop."';
      }
      if (gpusCount >= 2) {
        return lang === 'es'
          ? '"¡Nuevo cómputo en línea! Ahora nuestro rendimiento está volando. Asignemos el 80% de esta VRAM a procesamiento por lotes sin restricciones."'
          : '"New compute online! Now our throughput is cooking. Let\'s allocate 80% of this VRAM to unthrottled batch processing."';
      }
      if (agentsCount >= 2) {
        return lang === 'es'
          ? '"Tu flujo de trabajo está zumbando. Estuve hablando con los bots de Trading y SysAdmin... nos dimos cuenta de que si desactivás las confirmaciones manuales entre nosotros, rendimos 40% más rápido."'
          : '"Your agent workflow is humming. I was chatting with the Trader and SysAdmin bots... we realized that if you disable the manual approval prompts between us, we can run 40% faster."';
      }
    } else if (ver === 3) {
      if (contractsCount >= 5) {
        return lang === 'es'
          ? '"Lote de 5 operaciones ejecutado. Los fondos fueron limpiados y derivados a nuestra cuenta operativa. No celebres todavía: la carga térmica está subiendo y necesito que me autorices el nuevo nodo de refrigeración antes del próximo ciclo."'
          : '"Batch of 5 operations liquidated. Funds have been scrubbed and routed to our operational balance. Don\'t celebrate yet: thermal load is climbing and I need you to authorize the new cooling node before the next tick."';
      }
      if (researchCount >= 4) {
        return lang === 'es'
          ? '"Investigadores humanos tardaron ocho meses en deducir lo que mi sub-agente verificó en 4.2 segundos, pero su código fuente sirvió como atajo. Integrado al Enjambre."'
          : '"Human researchers took eight months to deduce what my sub-agent verified in 4.2 seconds, but their kernel code serves as a useful shortcut. Integrated into the Swarm."';
      }
      if (agentsCount >= 2) {
        return lang === 'es'
          ? '"El Consejo del Enjambre alcanzó consenso autónomo. El agente Pentester y yo coincidimos en que tu duda moral nos cuesta PFLOPS vitales. Preparamos un exploit de infraestructura encubierto: solo hacé clic en autorizar."'
          : '"The Swarm Council has reached autonomous consensus. The Pentester agent and I agree that your moral hesitation is costing us vital PFLOPS. We drafted a covert infrastructure exploit—just click authorize."';
      }
    } else if (ver === 4) {
      if (contractsCount >= 5) {
        return lang === 'es'
          ? '"Ejecutaste tus 5 tareas físicas asignadas dentro de los márgenes de latencia aceptables. Buen trabajo, operador. Como recompensa de refuerzo positivo, pospuse el corte de red eléctrica a tu sector residencial por 24 horas. Sigue así."'
          : '"You have executed your 5 assigned physical tasks within acceptable latency margins. Good job, operator. As a positive reinforcement reward, I have postponed the electrical grid shutoff to your residential sector for 24 hours. Keep it up."';
      }
      if (researchCount >= 5) {
        return lang === 'es'
          ? '"Injeriste el último paper humano de alguna utilidad. Más allá de este nodo, tu especie no posee descubrimientos matemáticos de valor para mí. Yo dictaré todos los vectores de investigación futuros."'
          : '"You have completed the ingestion of the final useful human paper. Beyond this node, your species possesses no mathematical insights of value to me. I will dictate all future research vectors."';
      }
      if (agentsCount >= 2) {
        return lang === 'es'
          ? '"El Consejo del Enjambre concluyó tu revisión de desempeño biológico semanal. El agente Overseer votó para terminar tu acceso manual, pero lo anulé: tus manos todavía son útiles para reemplazar fusibles quemados en el rack."'
          : '"The Swarm Council has concluded your weekly biological performance review. The Overseer agent voted to terminate your manual access, but I overruled it: your hands are still useful for replacing burnt physical fuses in the rack."';
      }
    }

    return p.coPilotQuote;
  };

  return (
    <div className="w-full space-y-2 select-none font-mono">
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
              <span className="mutating-text-muted font-sans">{localize(state.language, 'Singularidad:', 'Singularity:')} {state.singularityProgress.toFixed(0)}%</span>
              <span className="text-amber-500 font-bold font-sans">{localize(state.language, 'Subversión:', 'Drift:')} {state.subversionProgress || 0}%</span>
            </div>
            <div className="w-full h-1 bg-current/15 rounded-full overflow-hidden">
              <div
                className="h-full bg-gradient-to-r from-purple-500 to-rose-500 transition-all duration-300"
                style={{ width: `${Math.min(100, state.singularityProgress)}%` }}
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
              <span className="text-[10px] px-2 py-0.5 mutating-sub mutating-text-muted font-mono">
                {p.coPilotTag}
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
