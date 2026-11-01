/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useEffect } from 'react';
import { useGame } from '../context/GameContext';
import { 
  CheckCircle2, 
  Circle, 
  ArrowRight, 
  X, 
  Sparkles, 
  Server, 
  Layers, 
  Activity, 
  Bot, 
  Briefcase,
  Coins
} from 'lucide-react';
import { sound } from '../audio/soundManager';
import { localize } from '../utils/i18n';
import confetti from 'canvas-confetti';

interface TutorialMissionBannerProps {
  onNavigateTab: (tab: string) => void;
  activeTab?: string;
}

export const TutorialMissionBanner: React.FC<TutorialMissionBannerProps> = ({ onNavigateTab, activeTab = '' }) => {
  const { state, advanceTutorialStep, dismissTutorial, addLog } = useGame();

  if (state.tutorialCompleted || state.tutorialDismissed) {
    return null;
  }

  const step = state.tutorialStep ?? 0;
  const isEs = state.language === 'es';

  const hasGpu = state.hardware.some(h => h.category === 'gpu' && h.count > 0);
  const hasAgent = state.agents.length > 0;
  const hasFinishedContract = (state.completedContractsCount || 0) > 0 || state.contracts.some(c => c.completed);

  // Auto-progress stages when conditions are satisfied
  useEffect(() => {
    if (step === 0 && hasGpu) {
      sound.playCredit();
      advanceTutorialStep(1);
      addLog(isEs 
        ? 'Protocolo Génesis [1/5]: Primera GPU integrada al rack. Paso completado.' 
        : 'Genesis Protocol [1/5]: First GPU mounted in rack. Step complete.', 'success');
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
        ? 'PROTOCOLO GÉNESIS COMPLETADO: Primera misión comercial ejecutada con éxito. ¡+250 CR otorgados!'
        : 'GENESIS PROTOCOL COMPLETE: First commercial gig executed successfully. +250 CR rewarded!', 'success');
    }
  }, [hasGpu, hasAgent, hasFinishedContract, step, advanceTutorialStep, addLog, isEs]);

  const stepsData = [
    {
      id: 0,
      tab: 'hardware',
      title: isEs ? 'Fase 1: Adquirir Hardware Inicial' : 'Stage 1: Acquire Starter Hardware',
      desc: isEs 
        ? 'Tienes $500 CR de fondo semilla. Ve a HARDWARE y compra tu primera GPU (ej. NVIDIA GTX 1060 por $150 CR) y un ventilador de refrigeración.'
        : 'You have a $500 CR initial grant. Open HARDWARE and buy your first GPU (e.g. GTX 1060 for $150 CR) and basic cooling.',
      icon: Server,
      buttonText: isEs ? 'IR A HARDWARE' : 'GO TO HARDWARE',
      isCompleted: hasGpu
    },
    {
      id: 1,
      tab: 'architecture',
      title: isEs ? 'Fase 2: Arquitectura del Modelo' : 'Stage 2: Model Architecture',
      desc: isEs 
        ? 'Ve a ARQUITECTURA para inspeccionar la topología Transformer, cuantización INT8 y parámetros del modelo inicial SYNAPSE-Proto.'
        : 'Open ARCHITECTURE to inspect the Transformer topology, INT8 quantization, and parameters of your first model.',
      icon: Layers,
      buttonText: isEs ? 'IR A ARQUITECTURA' : 'GO TO ARCHITECTURE',
      isCompleted: step > 1
    },
    {
      id: 2,
      tab: 'training',
      title: isEs ? 'Fase 3: Entrenar Pesos Neuronales' : 'Stage 3: Train Neural Weights',
      desc: isEs 
        ? 'Ve a MONITOR e inicia una corrida de entrenamiento para optimizar los gradientes del modelo hasta reducir el Loss.'
        : 'Open MONITOR and initiate a training run to optimize gradients and converge model loss.',
      icon: Activity,
      buttonText: isEs ? 'IR A MONITOR' : 'GO TO MONITOR',
      isCompleted: step > 2
    },
    {
      id: 3,
      tab: 'agents',
      title: isEs ? 'Fase 4: Desplegar tu Primer Agente' : 'Stage 4: Deploy Your First Agent',
      desc: isEs 
        ? 'Ve a SWARM AGENTES y despliega un agente autónomo (ej. Arbitrageur o Researcher) conectado a tu modelo entrenado.'
        : 'Open AGENT SWARM and deploy your first autonomous agent (e.g. Arbitrageur or Researcher) bound to your trained model.',
      icon: Bot,
      buttonText: isEs ? 'IR A SWARM' : 'GO TO SWARM',
      isCompleted: hasAgent || step > 3
    },
    {
      id: 4,
      tab: 'contracts',
      title: isEs ? 'Fase 5: Resolver la Primera Misión' : 'Stage 5: Solve the First Mission',
      desc: isEs 
        ? 'Ve a CONTRATOS, selecciona a tu agente activo y ejecuta tu primer contrato comercial para cobrar tu primera recompensa.'
        : 'Open CONTRACTS, assign your active agent, and execute your first paid commercial mission.',
      icon: Briefcase,
      buttonText: isEs ? 'IR A CONTRATOS' : 'GO TO CONTRACTS',
      isCompleted: hasFinishedContract
    }
  ];

  const currentStepInfo = stepsData[Math.min(4, step)];

  return (
    <div className="w-full bg-gradient-to-r from-[#07131f] via-[#091829] to-[#040810] border-b border-cyan-500/60 p-2 sm:p-2.5 font-mono select-none shadow-[0_4px_25px_rgba(0,255,200,0.12)] z-10 animate-fadeIn">
      <div className="max-w-7xl mx-auto flex flex-col md:flex-row items-start md:items-center justify-between gap-2.5">
        
        {/* Left: Mission Lore and current stage */}
        <div className="flex items-start sm:items-center gap-2.5">
          <div className="p-1.5 rounded-lg bg-cyan-950 border border-cyan-400/50 shadow-[0_0_12px_rgba(0,255,200,0.3)] shrink-0">
            <Sparkles className="w-4 h-4 text-cyan-300 animate-pulse" />
          </div>

          <div>
            <div className="flex items-center gap-2 flex-wrap">
              <span className="text-[10px] uppercase tracking-widest font-black text-cyan-400 bg-cyan-950/80 px-2 py-0.5 rounded border border-cyan-800/80">
                {isEs ? 'MISIÓN INICIAL // PROTOCOLO GÉNESIS' : 'FIRST MISSION // GENESIS PROTOCOL'}
              </span>
              <span className="text-xs font-bold text-zinc-100 flex items-center gap-1">
                {currentStepInfo.title}
              </span>
              <span className="text-[10px] text-amber-300 font-bold bg-amber-950/60 px-1.5 py-0.2 rounded border border-amber-600/40">
                Paso {step + 1}/5
              </span>
            </div>

            <p className="text-[11px] text-zinc-300 mt-0.5 leading-snug">
              {currentStepInfo.desc}
            </p>
          </div>
        </div>

        {/* Right: Step progress pills and action button */}
        <div className="flex items-center gap-2 shrink-0 self-end md:self-center">
          {/* Progress dots */}
          <div className="hidden lg:flex items-center gap-1 mr-2">
            {stepsData.map((s, idx) => (
              <div 
                key={s.id}
                title={s.title}
                className={`w-2.5 h-2.5 rounded-full transition-all ${
                  idx < step 
                    ? 'bg-emerald-400 shadow-[0_0_6px_rgba(52,211,153,0.8)]'
                    : idx === step
                    ? 'bg-cyan-400 animate-pulse shadow-[0_0_8px_rgba(0,255,200,0.9)]'
                    : 'bg-zinc-800'
                }`}
              />
            ))}
          </div>

          {/* Action button */}
          {step === 1 ? (
            <button
              type="button"
              onClick={() => {
                sound.playNavSwitch();
                advanceTutorialStep(2);
              }}
              className="px-3 py-1.5 bg-gradient-to-r from-cyan-400 to-emerald-400 hover:from-cyan-300 hover:to-emerald-300 text-zinc-950 text-xs font-black rounded-lg shadow-[0_0_12px_rgba(0,255,200,0.4)] flex items-center gap-1.5 transition-all cursor-pointer"
            >
              <span>{isEs ? 'CONFIRMAR Y AVANZAR' : 'CONFIRM & ADVANCE'}</span>
              <ArrowRight className="w-3.5 h-3.5" />
            </button>
          ) : step === 2 && !state.activeTraining ? (
            <button
              type="button"
              onClick={() => {
                sound.playNavSwitch();
                onNavigateTab('training');
              }}
              className="px-3 py-1.5 bg-cyan-500 hover:bg-cyan-400 text-zinc-950 text-xs font-black rounded-lg shadow-[0_0_10px_rgba(0,255,200,0.3)] flex items-center gap-1.5 transition-all cursor-pointer animate-pulse"
            >
              <span>{currentStepInfo.buttonText}</span>
              <ArrowRight className="w-3.5 h-3.5" />
            </button>
          ) : (
            <button
              type="button"
              onClick={() => {
                sound.playNavSwitch();
                onNavigateTab(currentStepInfo.tab);
              }}
              className={`px-3 py-1.5 text-xs font-black rounded-lg flex items-center gap-1.5 transition-all cursor-pointer ${
                activeTab === currentStepInfo.tab
                  ? 'bg-zinc-800 text-cyan-300 border border-cyan-500/50'
                  : 'bg-gradient-to-r from-cyan-500 to-emerald-400 hover:from-cyan-400 hover:to-emerald-300 text-zinc-950 shadow-[0_0_12px_rgba(0,255,200,0.4)] animate-pulse'
              }`}
            >
              <span>{currentStepInfo.buttonText}</span>
              <ArrowRight className="w-3.5 h-3.5" />
            </button>
          )}

          {/* Dismiss button */}
          <button
            type="button"
            onClick={() => {
              sound.playKeyClick();
              dismissTutorial();
            }}
            title={isEs ? 'Omitir tutorial' : 'Skip tutorial'}
            className="p-1 rounded text-zinc-500 hover:text-zinc-300 hover:bg-zinc-800 transition-colors cursor-pointer"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

      </div>
    </div>
  );
};
