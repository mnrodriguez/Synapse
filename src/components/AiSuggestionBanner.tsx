/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React from 'react';
import { useGame } from '../context/GameContext';
import {
  Sparkles,
  ArrowRight,
  BrainCircuit,
  Zap,
  Flame,
  Bot,
  Play,
  Briefcase,
  CheckCircle2
} from 'lucide-react';

interface AiSuggestionBannerProps {
  activeTab: string;
  onNavigateTab?: (tab: string) => void;
}

export const AiSuggestionBanner: React.FC<AiSuggestionBannerProps> = ({ activeTab, onNavigateTab }) => {
  const { state } = useGame();
  const isEs = state.language === 'es';

  // Do not display on Engineer difficulty
  if (state.difficulty === 'engineer') return null;

  // Evaluate dynamic suggestion based on activeTab & state
  let icon = <Sparkles className="w-4 h-4 text-cyan-400 animate-spin" style={{ animationDuration: '6s' }} />;
  let suggestionTitle = isEs ? 'RECOMENDACIÓN DEL ORÁCULO IA' : 'AI ORACLE SUGGESTION';
  let suggestionText = '';
  let targetTab: string | undefined = undefined;
  let highlightBadge = isEs ? 'ACCIÓN PASO A PASO' : 'STEP-BY-STEP ACTION';

  const trainedModel = state.currentModel.reasoningScore >= 16 || state.savedModels.some(m => m.reasoningScore >= 16);
  const completedGig = state.completedContractsCount > 0 || state.contracts.some(c => c.completed);
  const hasAgent = state.agents.length > 0;
  const isTraining = Boolean(state.activeTraining);

  if (activeTab === 'architecture') {
    if (isTraining) {
      icon = <Play className="w-4 h-4 text-emerald-400 fill-current animate-pulse" />;
      suggestionTitle = isEs ? 'ENTRENAMIENTO EN CURSO' : 'TRAINING IN PROGRESS';
      suggestionText = isEs
        ? `Tus GPUs están ajustando pesos para [${state.activeTraining?.modelName}]. ¡Observa la convergencia de pérdida en la pestaña MONITOR!`
        : `GPUs are refining weights for [${state.activeTraining?.modelName}]. Observe loss convergence in the MONITOR tab!`;
      targetTab = 'training';
    } else {
      icon = <BrainCircuit className="w-4 h-4 text-cyan-400" />;
      suggestionTitle = isEs ? 'PASO 1: ENTRENAR MODELO INICIAL' : 'STEP 1: TRAIN INITIAL MODEL';
      suggestionText = isEs
        ? `Haz clic en 'INICIAR ENTRENAMIENTO' arriba a la derecha para procesar tu primer modelo [${state.currentModel.name}].`
        : `Click 'START TRAINING' at top-right to process your first model [${state.currentModel.name}].`;
    }
  } else if (activeTab === 'training') {
    if (isTraining) {
      suggestionText = isEs
        ? `Progreso de época: ${Math.floor(state.activeTraining?.progressPercent ?? 0)}%. Cada época reduce la pérdida (Loss) y aumenta el IQ de razonamiento.`
        : `Epoch progress: ${Math.floor(state.activeTraining?.progressPercent ?? 0)}%. Lower loss increases reasoning IQ score.`;
    } else if (trainedModel && !completedGig) {
      icon = <Briefcase className="w-4 h-4 text-amber-400" />;
      suggestionTitle = isEs ? 'PASO 2: ACEPTAR PRIMERA MISIÓN' : 'STEP 2: ACCEPT FIRST MISSION';
      suggestionText = isEs
        ? '¡Tu modelo ya está entrenado! Ve a la pestaña CONTRATOS para seleccionar tu agente y aceptar tu primera misión.'
        : 'Your model is trained! Go to CONTRACTS tab, select your agent, and accept your first mission.';
      targetTab = 'contracts';
    } else {
      suggestionText = isEs
        ? 'El monitor muestra la curva de pérdida de gradientes durante el preentrenamiento.'
        : 'The monitor displays gradient loss convergence during model pretraining.';
    }
  } else if (activeTab === 'contracts') {
    if (!hasAgent) {
      icon = <Bot className="w-4 h-4 text-purple-400" />;
      suggestionTitle = isEs ? 'ASIGNACIÓN DE EQUIPO' : 'TEAM ASSIGNMENT';
      suggestionText = isEs
        ? 'Asegúrate de tener un agente activo. Selecciona la casilla junto a tu agente arriba en "Asignación de Equipo".'
        : 'Ensure you have an active agent. Check the box next to your agent in Team Assignment above.';
    } else {
      icon = <Briefcase className="w-4 h-4 text-emerald-400" />;
      suggestionTitle = isEs ? 'ACEPTAR CONTRATO' : 'ACCEPT CONTRACT';
      suggestionText = isEs
        ? 'Revisa la Evaluación IA del Equipo y haz clic en "ACEPTAR MISIÓN" para ganar créditos.'
        : 'Review the AI Team Assessment and click "ACCEPT MISSION" to earn credits.';
    }
  } else if (activeTab === 'hardware') {
    if (state.systemHeatCelsius > 80) {
      icon = <Flame className="w-4 h-4 text-red-400 animate-bounce" />;
      suggestionTitle = isEs ? 'ALERTA TÉRMICA DE SOBRECALENTAMIENTO' : 'THERMAL OVERHEAT ALERT';
      suggestionText = isEs
        ? `Temperatura a ${state.systemHeatCelsius}°C. ¡Adquiere 'Heatpipes de Cobre' en Refrigeración para evitar pérdidas de velocidad!`
        : `Temp at ${state.systemHeatCelsius}°C. Purchase 'Copper Heatpipes' under Cooling to prevent thermal throttling!`;
    } else if (state.activePowerKw > state.maxPowerKw) {
      icon = <Zap className="w-4 h-4 text-amber-400 animate-pulse" />;
      suggestionTitle = isEs ? 'SOBRECARGA DE RED ELÉCTRICA' : 'POWER GRID OVERLOAD';
      suggestionText = isEs
        ? `Consumo de ${state.activePowerKw} kW supera la capacidad. Mejora tu instalación a Server Closet.`
        : `Load of ${state.activePowerKw} kW exceeds grid capacity. Upgrade facility to Server Closet.`;
    } else {
      suggestionText = isEs
        ? 'Expande tu clúster adquiriendo GPUs con mayor VRAM para soportar modelos más densos de 70M / 500M.'
        : 'Expand your cluster with higher VRAM GPUs to train larger 70M / 500M parameter models.';
    }
  } else if (activeTab === 'data') {
    suggestionText = isEs
      ? 'Desbloquea la Base Vectorial RAG ($450 CR) o el Grafo de Conocimiento para acceder a contratos corporativos de alto valor.'
      : 'Unlock the Vector Database RAG ($450 CR) or Knowledge Graph to take high-paying corporate contracts.';
  } else if (activeTab === 'agents') {
    if (!hasAgent) {
      icon = <Bot className="w-4 h-4 text-cyan-400" />;
      suggestionTitle = isEs ? 'INSTANCIAR PRIMER AGENTE' : 'DEPLOY FIRST AGENT';
      suggestionText = isEs
        ? 'Haz clic en "+ INSTANCIAR AGENTE" ($75 CR) para desplegar tu primer agente y generar ingresos pasivos continuos.'
        : 'Click "+ DEPLOY AGENT" ($75 CR) to deploy your first agent and earn passive income.';
    } else {
      suggestionText = isEs
        ? 'Mantén un agente "Supervisor de Seguridad" en tu enjambre para estabilizar el alineamiento y reducir la sospecha.'
        : 'Keep a "Safety Overseer" agent deployed in your swarm to stabilize alignment and reduce suspicion.';
    }
  } else {
    suggestionText = isEs
      ? 'Sigue la Hoja de Ruta para avanzar en la Singularidad Tecnológica.'
      : 'Follow the Singularity Roadmap to advance toward technological superintelligence.';
  }

  return (
    <div className="mx-2 mt-1.5 p-2.5 bg-[#080d19] border border-cyan-500/50 rounded-lg flex items-center justify-between gap-3 font-mono shadow-[0_0_20px_rgba(0,255,200,0.1)] text-xs text-zinc-200">
      <div className="flex items-center gap-2.5 min-w-0">
        <div className="p-1.5 rounded-lg bg-cyan-950 border border-cyan-500/50 shrink-0">
          {icon}
        </div>
        <div className="min-w-0">
          <div className="flex items-center gap-2">
            <span className="font-bold text-cyan-300 text-[11px] tracking-wider uppercase">{suggestionTitle}</span>
            <span className="px-1.5 py-0.2 rounded text-[9px] font-bold bg-purple-950 border border-purple-500/40 text-purple-300">
              {highlightBadge}
            </span>
          </div>
          <p className="text-[11px] text-zinc-300 truncate mt-0.5 leading-snug">
            {suggestionText}
          </p>
        </div>
      </div>

      {targetTab && onNavigateTab && (
        <button
          type="button"
          onClick={() => onNavigateTab(targetTab!)}
          className="shrink-0 px-2.5 py-1 bg-cyan-950 hover:bg-cyan-900 border border-cyan-500 text-cyan-200 rounded text-[10px] font-bold flex items-center gap-1 transition-all cursor-pointer shadow-[0_0_10px_rgba(0,255,200,0.2)]"
        >
          <span>{isEs ? 'IR AHORA' : 'GO NOW'}</span>
          <ArrowRight className="w-3 h-3 text-cyan-400" />
        </button>
      )}
    </div>
  );
};
