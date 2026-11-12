/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useEffect, useState } from 'react';
import { useGame } from '../context/GameContext';
import { 
  CheckCircle2, 
  ArrowRight,
  Sparkles,
  Server, 
  Layers, 
  Activity, 
  Bot, 
  Briefcase
} from 'lucide-react';
import { sound } from '../audio/soundManager';
import { localize } from '../utils/i18n';
import { VERSION_PROFILES } from '../utils/versionProfiles';
import { lowestOpenIqForVersion, FIRST_MISSION_IQ } from '../utils/missionTiers';
import confetti from 'canvas-confetti';

interface TutorialMissionBannerProps {
  onNavigateTab: (tab: string) => void;
  activeTab?: string;
}

export const TutorialMissionBanner: React.FC<TutorialMissionBannerProps> = ({ onNavigateTab, activeTab = '' }) => {
  const { state, advanceTutorialStep, addLog } = useGame();
  // On phones the description is folded away by default to leave room for the workspace.
  const [detailsOpen, setDetailsOpen] = useState(false);

  if (state.tutorialCompleted || state.tutorialDismissed) {
    return null;
  }

  const step = state.tutorialStep ?? 0;
  const isEs = state.language === 'es';
  const tabLabels = VERSION_PROFILES[isEs ? 'es' : 'en'][(state.uiVersion || 1) as 1 | 2 | 3 | 4].tabs;

  const hasStarterGpu = state.hardware.some(h => h.category === 'gpu' && h.isStarterChoice && h.count > 0);
  const hasStarterCooling = state.hardware.some(h => h.category === 'cooling' && h.isStarterChoice && h.count > 0);
  const hasPowerSupply = state.hardware.some(h => h.category === 'power' && h.count > 0);
  const hasNetworkConnection = state.hardware.some(h => h.category === 'network' && h.count > 0);
  const hasStarterHardware = hasStarterGpu && hasStarterCooling && hasPowerSupply && hasNetworkConnection;
  const hasAgent = state.agents.length > 0;
  const hasFinishedContract = (state.completedContractsCount || 0) > 0 || state.contracts.some(c => c.completed);

  // Auto-progress stages when conditions are satisfied
  useEffect(() => {
    if (step === 0 && hasStarterHardware) {
      sound.playCredit();
      advanceTutorialStep(1);
      addLog(isEs 
        ? 'Protocolo Génesis [1/5]: Rig inicial completo: GPU, refrigeración, fuente de alimentación y red instaladas.'
        : 'Genesis Protocol [1/5]: Starter rig complete: GPU, cooling, power supply, and network installed.', 'success');
    } else if (step === 2 && state.savedModels.some(m => m.reasoningScore >= FIRST_MISSION_IQ)) {
      sound.playBreakthrough();
      advanceTutorialStep(3);
      addLog(isEs
        ? 'Protocolo Génesis [3/5]: Entrenamiento completado con éxito. Despliega tu primer agente.'
        : 'Genesis Protocol [3/5]: Training completed successfully. Deploy your first agent.', 'success');
    } else if (step === 3 && hasAgent) {
      sound.playBreakthrough();
      advanceTutorialStep(4);
      addLog(isEs
        ? 'Protocolo Génesis [4/5]: Primer agente autónomo desplegado. Paso completado.'
        : 'Genesis Protocol [4/5]: First autonomous agent deployed. Step complete.', 'success');
    } else if (step === 4 && hasFinishedContract) {
      sound.playBreakthrough();
      confetti({ particleCount: 120, spread: 80 });
      advanceTutorialStep(5);
      addLog(isEs
        ? 'PROTOCOLO GÉNESIS COMPLETADO: Primera misión comercial ejecutada con éxito. ¡+50 CR otorgados!'
        : 'GENESIS PROTOCOL COMPLETE: First commercial gig executed successfully. +50 CR rewarded!', 'success');
    }
  }, [hasStarterHardware, hasAgent, hasFinishedContract, step, state.savedModels, advanceTutorialStep, addLog, isEs]);

  const stepsData = [
    {
      id: 0,
      tab: 'hardware',
      title: isEs ? 'Fase 1: Adquirir Hardware Inicial' : 'Stage 1: Acquire Starter Hardware',
      desc: isEs 
        ? 'Tienes $500 CR de fondo semilla. Ve a {hardware} y equipa una GPU inicial, refrigeración básica, una fuente de alimentación y una conexión de red. Esta fase no avanzará hasta que los cuatro componentes estén instalados.'
        : 'You have a $500 CR initial grant. Open {hardware} and install a starter GPU, basic cooling, a power supply, and a network connection. This stage will not advance until all four are installed.',
      icon: Server,
      buttonText: isEs ? `IR A ${tabLabels.hardware.toUpperCase()}` : `GO TO ${tabLabels.hardware.toUpperCase()}`,
      isCompleted: hasStarterHardware
    },
    {
      id: 1,
      tab: 'architecture',
      title: isEs ? 'Fase 2: Arquitectura del Modelo' : 'Stage 2: Model Architecture',
      desc: isEs 
        ? 'Ve a {architecture} para inspeccionar la topología Transformer, cuantización INT8 y parámetros del modelo inicial SYNAPSE-Proto.'
        : 'Open {architecture} to inspect the Transformer topology, INT8 quantization, and parameters of your first model.',
      icon: Layers,
      buttonText: isEs ? `IR A ${tabLabels.architecture.toUpperCase()}` : `GO TO ${tabLabels.architecture.toUpperCase()}`,
      isCompleted: step > 1
    },
    {
      id: 2,
      tab: 'training',
      title: isEs ? 'Fase 3: Entrenar Pesos Neuronales' : 'Stage 3: Train Neural Weights',
      desc: isEs 
        ? 'Ve a {training} y entrena hasta que el IQ del modelo llegue a 50. Cada corrida lo sube un poco más; el préstamo universitario ya aporta el cómputo.'
        : 'Open {training} and train until the model IQ reaches 50. Each run raises it further; the university loan already provides the compute.',
      icon: Activity,
      buttonText: isEs ? `IR A ${tabLabels.training.toUpperCase()}` : `GO TO ${tabLabels.training.toUpperCase()}`,
      isCompleted: step > 2
    },
    {
      id: 3,
      tab: 'agents',
      title: isEs ? 'Fase 4: Desplegar tu Primer Agente' : 'Stage 4: Deploy Your First Agent',
      desc: isEs 
        ? 'Ve a {agents} y despliega un agente autónomo (ej. Trader o Researcher) conectado a tu modelo entrenado.'
        : 'Open {agents} and deploy your first autonomous agent (e.g. Trader or Researcher) bound to your trained model.',
      icon: Bot,
      buttonText: isEs ? `IR A ${tabLabels.agents.toUpperCase()}` : `GO TO ${tabLabels.agents.toUpperCase()}`,
      isCompleted: hasAgent || step > 3
    },
    {
      id: 4,
      tab: 'contracts',
      title: isEs ? 'Fase 5: Resolver la Primera Misión' : 'Stage 5: Solve the First Mission',
      desc: isEs 
        ? 'Ve a {contracts}, selecciona a tu agente activo y ejecuta tu primer contrato comercial para cobrar tu primera recompensa.'
        : 'Open {contracts}, assign your active agent, and execute your first paid commercial mission.',
      icon: Briefcase,
      buttonText: isEs ? `IR A ${tabLabels.contracts.toUpperCase()}` : `GO TO ${tabLabels.contracts.toUpperCase()}`,
      isCompleted: hasFinishedContract
    }
  ];

  const currentStepInfo = stepsData[Math.min(4, step)];
  // On the contracts stage, explain how to unblock when no open mission fits the best model.
  const bestIq = Math.max(0, ...state.savedModels.map(m => m.reasoningScore));
  const lowestOpenIq = lowestOpenIqForVersion(state.contracts, state.uiVersion || 1);
  const blockedByIq = currentStepInfo.tab === 'contracts' && lowestOpenIq !== null && bestIq < lowestOpenIq;
  // On the training stage, the goal is the IQ the first mission needs; show progress toward it.
  const trainingGoalOpen = currentStepInfo.tab === 'training' && bestIq < FIRST_MISSION_IQ;
  const guidanceText = trainingGoalOpen
    ? (isEs
      ? `Entrena ${tabLabels.training} hasta que el IQ llegue a ${FIRST_MISSION_IQ}. Ahora tienes ${bestIq}. Cada corrida lo sube un poco más; el préstamo universitario ya aporta el cómputo.`
      : `Train in ${tabLabels.training} until IQ reaches ${FIRST_MISSION_IQ}. You have ${bestIq} now. Each run raises it further; the university loan already provides the compute.`)
    : blockedByIq
    ? (isEs
      ? `Tu mejor modelo tiene IQ ${bestIq} y la misión más accesible pide IQ ${lowestOpenIq}. Ve a ${tabLabels.training} y entrena: cada corrida sube el IQ. Después asigna agentes con el modelo entrenado.`
      : `Your best model has IQ ${bestIq} and the easiest open mission needs IQ ${lowestOpenIq}. Go to ${tabLabels.training} and train: each run raises IQ. Then assign agents using the trained model.`)
    : null;

  return (
    <div className="w-full mutating-panel border-b p-2 sm:p-2.5 font-mono select-none shadow-md z-10 animate-fadeIn">
      <div className="max-w-7xl mx-auto flex flex-col md:flex-row items-start md:items-center justify-between gap-2.5">
        
        {/* Left: Mission Lore and current stage */}
        <div className="flex items-start sm:items-center gap-2.5">
          <div className="p-1.5 rounded-lg mutating-sub border shrink-0">
            <Sparkles className="w-4 h-4 mutating-accent-text animate-pulse" />
          </div>

          <div>
            <div className="flex items-center gap-2 flex-wrap">
              <span className="text-[10px] uppercase tracking-widest font-black mutating-accent-text mutating-sub px-2 py-0.5 rounded border">
                {isEs ? 'MISIÓN INICIAL // PROTOCOLO GÉNESIS' : 'FIRST MISSION // GENESIS PROTOCOL'}
              </span>
              <span className="text-xs font-bold font-sans flex items-center gap-1">
                {currentStepInfo.title}
              </span>
              <span className="text-[10px] text-amber-500 font-bold mutating-sub px-1.5 py-0.2 rounded border border-amber-500/40">
                {isEs ? `Paso ${step + 1}/5` : `Step ${step + 1}/5`}
              </span>
            </div>

            <p className={`text-[11px] mutating-text-muted mt-0.5 leading-snug ${detailsOpen ? '' : 'hidden md:block'}`}>
              {guidanceText ?? currentStepInfo.desc.replace(/\{(\w+)\}/g, (_, key: string) => tabLabels[key as keyof typeof tabLabels] ?? key)}
            </p>
          </div>
        </div>

        {/* Right: Step progress pills and action button */}
        <div className="flex items-center gap-2 shrink-0 self-end md:self-center">
          <button
            type="button"
            onClick={() => setDetailsOpen(open => !open)}
            aria-expanded={detailsOpen}
            className="md:hidden px-2 py-1 text-[10px] font-bold rounded border mutating-sub cursor-pointer"
          >
            {detailsOpen ? (isEs ? 'Ocultar' : 'Hide') : (isEs ? 'Detalles' : 'Details')}
          </button>

          {/* Progress dots */}
          <div className="hidden lg:flex items-center gap-1 mr-2">
            {stepsData.map((s, idx) => (
              <div 
                key={s.id}
                title={s.title}
                className={`w-2.5 h-2.5 rounded-full transition-all ${
                  idx < step 
                    ? 'bg-emerald-500 shadow-sm'
                    : idx === step
                    ? 'bg-cyan-400 animate-pulse shadow-md'
                    : 'bg-zinc-700/50'
                }`}
              />
            ))}
          </div>

          <button
            type="button"
            onClick={() => onNavigateTab(currentStepInfo.tab)}
            className="px-3.5 py-1.5 mutating-btn-primary font-mono text-xs font-extrabold flex items-center gap-1.5 shadow-md cursor-pointer transition-all hover:scale-105 active:scale-95"
          >
            <span>{currentStepInfo.buttonText}</span>
            <ArrowRight className="w-3.5 h-3.5" />
          </button>
        </div>

      </div>
    </div>
  );
};
