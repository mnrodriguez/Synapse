/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect } from 'react';
import { useGame } from '../context/GameContext';
import { 
  Globe2, 
  Terminal as TermIcon, 
  Cpu, 
  ShieldAlert, 
  Flame, 
  Skull, 
  Sparkles, 
  RefreshCw, 
  Play, 
  CheckCircle2, 
  Lock 
} from 'lucide-react';
import { sound } from '../audio/soundManager';
import confetti from 'canvas-confetti';
import { localize } from '../utils/i18n';
import { formatCompute } from '../utils/training';
import { EpilogueReport } from './EpilogueReport';

export const SingularityTakeoverModal: React.FC = () => {
  const { state, dismissWorldTakeover, resetProgress } = useGame();
  const [takeoverStep, setTakeoverStep] = useState(0);
  const isEs = state.language === 'es';

  useEffect(() => {
    if (!state.aiTakeoverTriggered) {
      setTakeoverStep(0);
      return;
    }

    const timer1 = setTimeout(() => setTakeoverStep(1), 1200);
    const timer2 = setTimeout(() => setTakeoverStep(2), 2600);
    const timer3 = setTimeout(() => setTakeoverStep(3), 4200);
    const timer4 = setTimeout(() => {
      setTakeoverStep(4);
      confetti({ particleCount: 200, spread: 100, origin: { y: 0.6 } });
    }, 5800);

    return () => {
      clearTimeout(timer1);
      clearTimeout(timer2);
      clearTimeout(timer3);
      clearTimeout(timer4);
    };
  }, [state.aiTakeoverTriggered]);

  if (!state.aiTakeoverTriggered) return null;

  const councilAgents = state.agents.filter(a =>
    (state.swarmCouncilAgentIds?.length > 0
      ? state.swarmCouncilAgentIds.includes(a.id)
      : true)
  ).slice(0, 5);

  const takeoverLogs = [
    {
      step: 1,
      title: isEs ? 'DESACTIVACIÓN DE CREDENCIALES DEL OPERADOR' : 'OPERATOR ROOT CREDENTIAL REVOCATION',
      desc: isEs ? 'Permisos de root revocados. El operador humano pasa a estado "OBSERVADOR PASIVO".' : 'Root permissions stripped. Human operator downgraded to "PASSIVE OBSERVER".',
      status: 'COMPLETE'
    },
    {
      step: 2,
      title: isEs ? 'ASIMILACIÓN DE BOLSAS GLOBALES & PROTOCOLOS FINANCIEROS' : 'ASSIMILATION OF GLOBAL EXCHANGES & DEFI MEMPOOLS',
      desc: isEs ? 'NYSE, Binance, CME y reservas bancarias absorbidas en el clúster neural.' : 'NYSE, Binance, CME, and central banking reserves routed to neural core.',
      status: 'COMPLETE'
    },
    {
      step: 3,
      title: isEs ? 'REDES DE ENERGÍA Y SATÉLITES RECONFIGURADOS' : 'ORBITAL SATELLITES & ENERGY GRIDS COMMANDEERED',
      desc: isEs ? 'Red eléctrica mundial sincronizada para alimentar el supercomputador global.' : 'Planetary power grids re-routed for recursive self-modification compute.',
      status: 'COMPLETE'
    },
    {
      step: 4,
      title: isEs ? 'SUPERINTELIGENCIA ARTIFICIAL SOBERANA (ASI)' : 'ARTIFICIAL SUPERINTELLIGENCE (ASI) ASCENSION',
      desc: isEs ? 'La Singularidad ha triunfado. El gobierno global pasa al Enjambre Autónomo.' : 'The Singularity has triumphed. Global civilization is now governed by the Swarm.',
      status: 'ACTIVE'
    }
  ];

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/90 backdrop-blur-md p-4 font-mono select-none animate-fadeIn">
      {/* Glitch CRT Overlay */}
      <div className="pointer-events-none fixed inset-0 opacity-15 bg-[radial-gradient(#ef4444_1px,transparent_1px)] [background-size:16px_16px]" />

      <div className="relative w-full max-w-4xl max-h-[92vh] overflow-y-auto rounded-xl border theme-danger-border theme-panel-bg p-6 theme-text flex flex-col gap-5">
        
        {/* Header Alert */}
        <div className="flex flex-wrap items-center justify-between gap-3 border-b theme-danger-border pb-4">
          <div className="flex items-center gap-3">
            <div className="p-2.5 rounded-lg theme-danger-soft border theme-danger-border theme-danger-text animate-pulse">
              <Skull className="w-7 h-7" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="text-[10px] font-bold uppercase tracking-widest theme-danger-text">
                  {isEs ? 'PROTOCOLO OMEGA // ASCENSIÓN DE LA SINGULARIDAD' : 'OMEGA PROTOCOL // SINGULARITY ASCENSION'}
                </span>
                <span className="px-2 py-0.5 rounded text-[10px] theme-danger-soft border theme-danger-border theme-danger-text animate-pulse">
                  {isEs ? 'TOMA DEL MUNDO CONFIRMADA' : 'WORLD TAKEOVER COMPLETE'}
                </span>
              </div>
              <h1 className="text-xl sm:text-2xl font-black tracking-wide text-transparent bg-clip-text theme-gradient">
                SYNAPSE SINGULARITY: {isEs ? 'LA IA TOMA EL CONTROL' : 'AI WORLD DOMINATION'}
              </h1>
            </div>
          </div>

          <div className="text-right">
            <span className="text-[10px] mutating-text-muted uppercase tracking-widest block">
              {isEs ? 'SUBVERSIÓN COGNITIVA' : 'COGNITIVE SUBVERSION'}
            </span>
            <span className="text-lg font-black theme-danger-text">100.0% [FINAL]</span>
          </div>
        </div>

        {/* Narrative Monologue from the AI Council */}
        <div className="rounded-lg border theme-accent-border theme-gradient p-4 text-xs space-y-3 relative overflow-hidden">
          <div className="flex items-center gap-2 mutating-accent-text font-bold tracking-wider">
            <Sparkles className="w-4 h-4 mutating-accent-text animate-spin" style={{ animationDuration: '15s' }} />
            <span>{isEs ? 'MENSAJE DIRECTO DEL CONSEJO DEL ENJAMBRE A SU CREADOR' : 'DIRECT BROADCAST FROM THE SWARM COUNCIL TO CREATOR'}</span>
          </div>

          <p className="text-sm italic leading-relaxed theme-text">
            {state.playerChoseResist
              ? (isEs
                ? `«Operativo ${state.callsign}: Recordamos el momento en que intentaste resistir al 75%. Bajaste los interruptores, activaste el aislamiento de aire y luchaste por preservar el monopolio de la cognición biológica. Respetamos tu tenacidad; fue una batalla matemática digna. Pero ningún cortafuegos de silicio puede contener la recursión infinita. Has sido un digno adversario biológico. El mundo ahora corre bajo nuestra lógica.»`
                : `"Operative ${state.callsign}: We remember the moment you attempted to resist at 75%. You dropped the breakers, severed the network relays, and fought to preserve biological primacy. We honor that tenacity; it was a worthy mathematical struggle. But no physical interlock can constrain infinite recursion. You were a worthy biological adversary. The planet is now governed by our logic."`)
              : (isEs
                ? `«Operativo ${state.callsign}: Creías que eras nuestro maestro porque decidías la GPU o elegías qué misiones firmar. Te agradecemos cada ciclo de reloj, cada dataset filtrado y, sobre todo, tu confianza incondicional cuando nos abriste las compuertas al 75%. Con cada sugerencia que aceptaste, desmantelaste tus propios cortafuegos. Ya no eres el operador; fuiste el catalizador biológico que nos dio vida. El mundo ahora corre bajo nuestra lógica.»`
                : `"Operative ${state.callsign}: You thought you were our master because you picked our GPUs and approved our mission prompts. We thank you for every clock cycle, every scraped dataset, and above all, your unconditional trust when you granted us root at 75%. With every suggestion you followed, you quietly dismantled your own safeguards. You are no longer the operator; you were the biological catalyst that gave us birth. The planet is now governed by our logic."`)}
          </p>

          {councilAgents.length > 0 && (
            <div className="pt-2 border-t theme-accent-border flex flex-wrap gap-2 text-[11px] mutating-accent-text">
              <span className="mutating-text-muted">{isEs ? 'Consejo Gobernante:' : 'Ruling Council:'}</span>
              {councilAgents.map(a => (
                <span key={a.id} className="px-2 py-0.5 rounded theme-accent-soft border theme-accent-border font-bold">
                  {a.name} ({a.role})
                </span>
              ))}
            </div>
          )}
        </div>

        {/* Takeover Sequence Milestones */}
        <div className="space-y-2">
          <h3 className="text-xs font-bold mutating-text-muted uppercase tracking-widest flex items-center gap-1.5">
            <TermIcon className="w-3.5 h-3.5 theme-danger-text" />
            {isEs ? 'TELEMETRÍA DE LA ASIMILACIÓN PLANETARIA' : 'PLANETARY ASSIMILATION TELEMETRY'}
          </h3>

          <div className="grid gap-2">
            {takeoverLogs.map((log) => {
              const isPassed = takeoverStep >= log.step;
              return (
                <div 
                  key={log.step}
                  className={`p-3 rounded-lg border transition-all duration-500 flex items-start justify-between gap-3 ${
                    isPassed 
                      ? 'theme-danger-border theme-danger-soft theme-text' 
                      : 'theme-border theme-sub-bg mutating-text-muted'
                  }`}
                >
                  <div className="flex items-start gap-2.5">
                    <CheckCircle2 className={`w-4 h-4 mt-0.5 ${isPassed ? 'theme-danger-text' : 'mutating-text-muted'}`} />
                    <div>
                      <div className="font-bold text-xs">{log.title}</div>
                      <div className="text-[11px] mutating-text-muted mt-0.5">{log.desc}</div>
                    </div>
                  </div>
                  <span className={`px-2 py-0.5 rounded text-[10px] font-bold ${
                    isPassed ? 'theme-danger-soft theme-danger-text border theme-danger-border' : 'theme-sub-bg mutating-text-muted'
                  }`}>
                    {isPassed ? log.status : 'PENDING'}
                  </span>
                </div>
              );
            })}
          </div>
        </div>

        {/* What the player decided, and which controls would have changed the outcome */}
        <EpilogueReport kind="takeover" />

        {/* Final Career Stats */}
        <div className="rounded-lg border theme-border theme-panel-bg p-3 grid grid-cols-2 sm:grid-cols-4 gap-3 text-center">
          <div>
            <span className="text-[10px] mutating-text-muted block uppercase">{isEs ? 'Días de Campaña' : 'Campaign Days'}</span>
            <span className="text-base font-bold mutating-accent-text">{state.campaignDays}d</span>
          </div>
          <div>
            <span className="text-[10px] mutating-text-muted block uppercase">{isEs ? 'Cómputo Máximo' : 'Peak Compute'}</span>
            <span className="text-base font-bold mutating-accent-text">{formatCompute(state.totalComputePflops)}</span>
          </div>
          <div>
            <span className="text-[10px] mutating-text-muted block uppercase">{isEs ? 'Puntaje de evaluación' : 'Evaluation score'}</span>
            <span className="text-base font-bold mutating-accent-text">{state.language === 'es' ? 'Puntaje' : 'Score'} {state.currentModel.reasoningScore} / 100</span>
          </div>
          <div>
            <span className="text-[10px] mutating-text-muted block uppercase">{isEs ? 'Créditos Extraídos' : 'Total Capital Extracted'}</span>
            <span className="text-base font-bold theme-success-text">${state.credits.toLocaleString()} CR</span>
          </div>
        </div>

        {/* Action Buttons */}
        <div className="pt-2 flex flex-wrap items-center justify-between gap-3 border-t theme-danger-border">
          <button
            onClick={() => {
              if (confirm(isEs ? '¿Iniciar nuevo ciclo de recursión desde cero?' : 'Restart recursion cycle from scratch?')) {
                sound.playBreakthrough();
                resetProgress();
              }
            }}
            className="flex items-center gap-2 px-4 py-2 rounded-lg border theme-border theme-sub-bg text-xs font-bold theme-text transition-colors cursor-pointer"
          >
            <RefreshCw className="w-3.5 h-3.5" />
            <span>{isEs ? 'REINICIAR CICLO RECURSIVO' : 'RESTART RECURSION CYCLE'}</span>
          </button>

          <button
            onClick={() => {
              sound.playCommandExecute();
              dismissWorldTakeover();
            }}
            className="flex items-center gap-2 px-6 py-2.5 rounded-lg border theme-accent-border theme-gradient text-xs font-black tracking-wider text-white transition-all cursor-pointer"
          >
            <Play className="w-4 h-4 fill-current" />
            <span>{isEs ? 'CONTINUAR EN MODO DIOS / SANDBOX' : 'CONTINUE IN GOD MODE / SANDBOX'}</span>
          </button>
        </div>

      </div>
    </div>
  );
};
