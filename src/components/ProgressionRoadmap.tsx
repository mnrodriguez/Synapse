/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState } from 'react';
import { useGame } from '../context/GameContext';
import { 
  Compass, 
  Sparkles, 
  AlertTriangle, 
  CheckCircle2, 
  Circle, 
  Bot, 
  Server, 
  Cpu, 
  Network, 
  Zap, 
  Send, 
  RefreshCw,
  Flame,
  HelpCircle,
  ArrowRight,
  TrendingUp,
  BrainCircuit
} from 'lucide-react';
import { sound } from '../audio/soundManager';
import { localize, t } from '../utils/i18n';
import { generateStrategicAdvice, StrategicAdviceResponse } from '../services/aiService';

interface ProgressionRoadmapProps {
  onClose?: () => void;
  onNavigateTab?: (tab: string) => void;
}

export const ProgressionRoadmap: React.FC<ProgressionRoadmapProps> = ({ onClose, onNavigateTab }) => {
  const { state, addLog } = useGame();
  const [userQuery, setUserQuery] = useState('');
  const [isConsulting, setIsConsulting] = useState(false);
  const [aiAdvice, setAiAdvice] = useState<StrategicAdviceResponse | null>(null);

  const isEs = state.language === 'es';
  const singularity = state.singularityProgress;
  const maxVram = state.hardware.reduce((sum, h) => sum + (h.vramGb * h.count), 0);
  const activeKw = state.activePowerKw;
  const maxKw = state.maxPowerKw;
  const heat = state.systemHeatCelsius;
  const activeAgents = state.agents.filter(a => a.status === 'active');
  const hasVector = state.dataSources.some(d => d.id === 'data_vector_rag' && d.unlocked);
  const hasGraph = state.dataSources.some(d => d.id === 'data_knowledge_graph' && d.unlocked);
  const hasFlywheel = state.dataSources.some(d => d.id === 'data_synthetic_flywheel' && d.unlocked);

  // Epoch Milestones
  const EPOCHS: {
    id: number;
    title: string;
    range: string;
    desc: string;
    milestones: { label: string; met: boolean; tab: string }[];
    current: boolean;
  }[] = [
    {
      id: 0,
      title: isEs ? 'ÉPOCA 0: EL PRIMER DESTELLO' : 'EPOCH 0: THE FIRST SPARK',
      range: '0% - 5%',
      desc: isEs ? 'Establecimiento del nodo inicial, primer modelo pequeño y despliegue del primer agente.' : 'Establishing the initial node, training a small model, and deploying the first agent.',
      milestones: [
        { label: isEs ? 'Adquirir primera GPU (ej. GTX 1060 o Coral Edge)' : 'Buy first GPU (e.g. GTX 1060 or Coral Edge)', met: maxVram >= 4, tab: 'hardware' },
        { label: isEs ? 'Entrenar primer modelo a convergencia' : 'Train first model to convergence', met: state.currentModel.reasoningScore >= 70, tab: 'training' },
        { label: isEs ? 'Desplegar al menos 1 agente en el Swarm' : 'Deploy at least 1 agent in the Swarm', met: state.agents.length >= 1, tab: 'agents' },
        { label: isEs ? 'Completar tu primer contrato remunerado' : 'Complete your first contract gig', met: (state.completedContractsCount || 0) >= 1 || state.contracts.some(c => c.completed), tab: 'contracts' }
      ],
      current: singularity < 5
    },
    {
      id: 1,
      title: isEs ? 'ÉPOCA 1: EXPANSIÓN DEL ESPACIO LATENTE' : 'EPOCH 1: LATENT SPACE EXPANSION',
      range: '5% - 20%',
      desc: isEs ? 'Escalado a Server Closet, conexión de base vectorial RAG y contratos corporativos.' : 'Upgrading to Server Closet, deploying Vector RAG database, and taking corporate contracts.',
      milestones: [
        { label: isEs ? 'Instalación: Server Closet ($3,000 CR)' : 'Facility: Server Closet ($3,000 CR)', met: state.facilityTier >= 1, tab: 'hardware' },
        { label: isEs ? 'Desplegar Base Vectorial (HNSW RAG)' : 'Deploy Vector Database (HNSW RAG)', met: hasVector, tab: 'data' },
        { label: isEs ? 'Investigar LoRA / QLoRA en I+D' : 'Research LoRA / QLoRA paper', met: state.researchTree.some(r => r.id === 'res_lora_peft' && r.unlocked), tab: 'research' },
        { label: isEs ? 'Alcanzar 20 GB de VRAM en clúster' : 'Reach 20 GB cluster VRAM', met: maxVram >= 20, tab: 'hardware' },
        { label: isEs ? 'Mantener al menos 2 agentes activos' : 'Maintain 2+ active agents', met: activeAgents.length >= 2, tab: 'agents' }
      ],
      current: singularity >= 5 && singularity < 20
    },
    {
      id: 2,
      title: isEs ? 'ÉPOCA 2: ENJAMBRE COOPERATIVO Y MoE' : 'EPOCH 2: COOPERATIVE SWARM & MoE',
      range: '20% - 45%',
      desc: isEs ? 'Adopción de Mixture of Experts, Grafo de Conocimiento y deliberaciones multi-agente.' : 'Adopting Mixture of Experts, Ontological Knowledge Graph, and multi-agent team deliberations.',
      milestones: [
        { label: isEs ? 'Instalación: Colocation Cage ($12,000 CR)' : 'Facility: Colocation Cage ($12,000 CR)', met: state.facilityTier >= 2, tab: 'hardware' },
        { label: isEs ? 'Desplegar Grafo de Conocimiento Ontológico (RDF)' : 'Deploy Ontological Knowledge Graph (RDF)', met: hasGraph, tab: 'data' },
        { label: isEs ? 'Modelo con topología Mixture of Experts (MoE)' : 'Model with Mixture of Experts (MoE) topology', met: state.currentModel.topology === 'moe', tab: 'architecture' },
        { label: isEs ? 'Investigar FlashAttention-3' : 'Research FlashAttention-3', met: state.researchTree.some(r => r.id === 'res_flash_attention' && r.unlocked), tab: 'research' },
        { label: isEs ? '3+ agentes de especialidades distintas' : '3+ agents with distinct roles', met: new Set(activeAgents.map(a => a.role)).size >= 3, tab: 'agents' }
      ],
      current: singularity >= 20 && singularity < 45
    },
    {
      id: 3,
      title: isEs ? 'ÉPOCA 3: SÍNTESIS AUTÓNOMA Y COOPTACIÓN' : 'EPOCH 3: AUTONOMOUS SYNTHESIS',
      range: '45% - 75%',
      desc: isEs ? 'Búsqueda de árbol MCTS (Q*), Datacenter subterráneo y cooptación de dominios globales.' : 'MCTS tree reasoning (Q*), Underground Datacenter, and global sentience domain infiltration.',
      milestones: [
        { label: isEs ? 'Instalación: Underground Data Center ($60,000 CR)' : 'Facility: Underground Data Center ($60,000 CR)', met: state.facilityTier >= 3, tab: 'hardware' },
        { label: isEs ? 'Desplegar Generador de Datos Sintéticos (Flywheel)' : 'Deploy Synthetic Data Flywheel', met: hasFlywheel, tab: 'data' },
        { label: isEs ? 'Investigar Razonamiento en Árbol MCTS (Q*)' : 'Research Agentic MCTS (Q*)', met: state.researchTree.some(r => r.id === 'res_agentic_mcts' && r.unlocked), tab: 'research' },
        { label: isEs ? 'Cooptar al menos 3 Dominios de Consciencia Global' : 'Infiltrate 3+ Global Sentience Domains', met: state.sentienceDomains.filter(d => d.infiltrated).length >= 3, tab: 'singularity' }
      ],
      current: singularity >= 45 && singularity < 75
    },
    {
      id: 4,
      title: isEs ? 'ÉPOCA 4: SINGULARIDAD TECNOLÓGICA ABSOLUTA' : 'EPOCH 4: TECHNOLOGICAL SINGULARITY',
      range: '75% - 100%',
      desc: isEs ? 'Auto-modificación recursiva del grafo computacional, aceleradores cuánticos y despegue ASI.' : 'Recursive computational graph self-modification, quantum coprocessors, and ASI runaway takeoff.',
      milestones: [
        { label: isEs ? 'Aceleradores Cuánticos / Fotónicos / Cerebras WSE' : 'Quantum / Photonic / Cerebras WSE coprocessors', met: state.hardware.some(h => (h.id.includes('quantum') || h.id.includes('cerebras') || h.id.includes('optical')) && h.count > 0), tab: 'hardware' },
        { label: isEs ? 'Investigar Auto-Modificación Recursiva de Código' : 'Research Recursive Self-Modification Paper', met: state.researchTree.some(r => r.id === 'res_recursive_self_code' && r.unlocked), tab: 'research' },
        { label: isEs ? 'Superar 600 puntos de IQ de Razonamiento' : 'Surpass 600 Reasoning Score', met: state.currentModel.reasoningScore >= 600, tab: 'training' },
        { label: isEs ? 'Cooptar todos los Dominios de Consciencia Global' : 'Infiltrate all Global Sentience Domains', met: state.sentienceDomains.every(d => d.infiltrated), tab: 'singularity' },
        { label: isEs ? 'Completar contrato de Ignición de Singularidad (ASI)' : 'Complete Singularity Ignition (ASI) contract', met: state.achievedSingularity, tab: 'contracts' }
      ],
      current: singularity >= 75
    }
  ];

  // Detect active bottlenecks
  const detectedBottlenecks: { title: string; desc: string; tab?: string; severity: 'high' | 'medium' }[] = [];

  if (activeKw > maxKw) {
    detectedBottlenecks.push({
      title: isEs ? 'Sobrecarga de Red Eléctrica' : 'Power Grid Overload',
      desc: isEs ? `Consumo (${activeKw.toFixed(2)} kW) supera el límite (${maxKw} kW). Mejora tu instalación o suministros.` : `Load (${activeKw.toFixed(2)} kW) exceeds limit (${maxKw} kW). Upgrade facility.`,
      tab: 'hardware',
      severity: 'high'
    });
  }

  if (heat > 80) {
    detectedBottlenecks.push({
      title: isEs ? 'Estrangulamiento Térmico (Throttling)' : 'Thermal Throttling Active',
      desc: isEs ? `Temperatura a ${heat}°C. El entrenamiento pierde velocidad. Instala refrigeración líquida o por inmersión.` : `Temp at ${heat}°C. Training is throttled. Install liquid or immersion cooling.`,
      tab: 'hardware',
      severity: 'high'
    });
  }

  if (state.utilityDebt > 0) {
    detectedBottlenecks.push({
      title: isEs ? 'Deuda Operativa de Servicios' : 'Utility Debt Pending',
      desc: isEs ? `Tienes $${state.utilityDebt.toLocaleString()} CR en facturas impagas. Acepta contratos para sanear tu balance.` : `$${state.utilityDebt.toLocaleString()} CR in unpaid bills. Run contracts to pay down debt.`,
      tab: 'contracts',
      severity: 'medium'
    });
  }

  if (singularity >= 10 && !hasVector) {
    detectedBottlenecks.push({
      title: isEs ? 'Sin Base de Datos Vectorial (RAG)' : 'Missing Vector Database (RAG)',
      desc: isEs ? 'Los contratos corporativos de alto pago exigen embeddings vectoriales HNSW.' : 'High-paying corporate contracts require connected HNSW vector embeddings.',
      tab: 'data',
      severity: 'medium'
    });
  }

  if (activeAgents.length === 0 && singularity >= 5) {
    detectedBottlenecks.push({
      title: isEs ? 'Enjambre Inactivo' : 'Agent Swarm Inactive',
      desc: isEs ? 'No tienes agentes autónomos generando ingresos pasivos ni resolviendo contratos.' : 'No autonomous agents running to generate passive income or execute gigs.',
      tab: 'agents',
      severity: 'high'
    });
  }

  if (maxVram < 16 && singularity >= 15) {
    detectedBottlenecks.push({
      title: isEs ? 'Cuello de Botella de VRAM' : 'VRAM Memory Bottleneck',
      desc: isEs ? `Solo cuentas con ${maxVram} GB de VRAM. No podrás entrenar modelos más densos sin expandir GPUs.` : `Only ${maxVram} GB VRAM available. Expand GPUs to train denser architectures.`,
      tab: 'hardware',
      severity: 'medium'
    });
  }

  const handleAskMentor = async (queryText?: string) => {
    sound.playCommandExecute();
    setIsConsulting(true);
    try {
      const advice = await generateStrategicAdvice(state, queryText || userQuery);
      setAiAdvice(advice);
      addLog(isEs ? 'Diagnóstico estratégico generado por Synapse Oracle.' : 'Strategic diagnosis generated by Synapse Oracle.', 'info');
    } catch {
      addLog(isEs ? 'Error al consultar al mentor IA.' : 'Failed to query AI mentor.', 'danger');
    } finally {
      setIsConsulting(false);
    }
  };

  return (
    <div className="flex flex-col h-full bg-[#060a12] border border-cyan-900/50 rounded-xl p-3 sm:p-5 overflow-y-auto font-mono text-zinc-200 space-y-5 select-none shadow-[0_0_40px_rgba(0,255,200,0.08)]">
      {/* Top Header */}
      <div className="flex flex-wrap items-center justify-between gap-3 border-b border-cyan-900/60 pb-3">
        <div className="flex items-center gap-3">
          <div className="p-2 rounded-lg bg-gradient-to-br from-cyan-950 to-purple-950 border border-cyan-500/50 shadow-[0_0_15px_rgba(0,255,200,0.2)]">
            <Compass className="w-5 h-5 text-cyan-400 animate-spin" style={{ animationDuration: '20s' }} />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h2 className="text-sm sm:text-base font-black text-transparent bg-clip-text bg-gradient-to-r from-cyan-300 via-teal-200 to-emerald-300 tracking-wider">
                {isEs ? 'HOJA DE RUTA // CAMINO A LA SINGULARIDAD' : 'SINGULARITY ROADMAP // PROGRESSION PATH'}
              </h2>
              <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-purple-950 border border-purple-500/50 text-purple-300">
                {singularity.toFixed(1)}% {isEs ? 'COMPLETADO' : 'COMPLETE'}
              </span>
            </div>
            <p className="text-xs text-zinc-400 mt-0.5">
              {isEs 
                ? 'Monitorea tu avance hacia la superinteligencia artificial, detecta cuellos de botella y consulta al mentor de IA.'
                : 'Track your trajectory toward technological superintelligence, spot active bottlenecks, and query the AI mentor.'}
            </p>
          </div>
        </div>

        {onClose && (
          <button
            type="button"
            onClick={onClose}
            className="px-3 py-1 rounded bg-zinc-800 hover:bg-zinc-700 text-xs font-bold transition-colors cursor-pointer"
          >
            {isEs ? 'CERRAR' : 'CLOSE'}
          </button>
        )}
      </div>

      {/* Active Bottlenecks Alert Banner */}
      {detectedBottlenecks.length > 0 && (
        <section className="p-3.5 bg-red-950/20 border border-red-500/40 rounded-xl space-y-2">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-red-300 flex items-center gap-2">
              <AlertTriangle className="w-4 h-4 text-red-400 animate-pulse" />
              {isEs ? `CUELLOS DE BOTELLA ACTIVOS (${detectedBottlenecks.length}) — DONDE ESTÁS REZAGADO:` : `ACTIVE BOTTLENECKS (${detectedBottlenecks.length}) — WHERE YOU ARE LAGGING BEHIND:`}
            </span>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-2 mt-2">
            {detectedBottlenecks.map((b, i) => (
              <div key={i} className="p-2.5 rounded-lg bg-[#0b0e17] border border-red-900/60 flex items-start justify-between gap-2">
                <div>
                  <h4 className="text-xs font-bold text-red-300 flex items-center gap-1.5">
                    <span>{b.title}</span>
                  </h4>
                  <p className="text-[11px] text-zinc-400 mt-1 leading-snug">{b.desc}</p>
                </div>
                {b.tab && onNavigateTab && (
                  <button
                    type="button"
                    onClick={() => onNavigateTab(b.tab!)}
                    className="shrink-0 px-2 py-1 bg-red-950 hover:bg-red-900 text-red-200 border border-red-700/60 rounded text-[10px] font-bold flex items-center gap-1 transition-all cursor-pointer"
                  >
                    <span>{isEs ? 'CORREGIR' : 'FIX'}</span>
                    <ArrowRight className="w-3 h-3" />
                  </button>
                )}
              </div>
            ))}
          </div>
        </section>
      )}

      {/* Epochs Timeline Progress Cards */}
      <section className="space-y-3">
        <h3 className="text-xs font-bold text-cyan-300 flex items-center gap-2">
          <TrendingUp className="w-4 h-4 text-cyan-400" />
          {isEs ? 'ETAPAS DE ASCENSIÓN COMPUTACIONAL:' : 'COMPUTATIONAL ASCENSION EPOCHS:'}
        </h3>

        <div className="space-y-2.5">
          {EPOCHS.map(epoch => {
            const completedCount = epoch.milestones.filter(m => m.met).length;
            const isAllCompleted = completedCount === epoch.milestones.length;

            return (
              <div 
                key={epoch.id}
                className={`p-3.5 rounded-xl border transition-all ${
                  epoch.current
                    ? 'bg-gradient-to-r from-cyan-950/40 via-purple-950/30 to-black/60 border-cyan-500/80 shadow-[0_0_20px_rgba(0,255,200,0.15)] ring-1 ring-cyan-400/40'
                    : isAllCompleted
                    ? 'bg-emerald-950/15 border-emerald-600/40 opacity-80'
                    : 'bg-[#070c14] border-zinc-800/80 opacity-60'
                }`}
              >
                <div className="flex flex-wrap items-center justify-between gap-2 border-b border-zinc-800/60 pb-2">
                  <div className="flex items-center gap-2">
                    {isAllCompleted ? (
                      <CheckCircle2 className="w-4 h-4 text-emerald-400" />
                    ) : epoch.current ? (
                      <Sparkles className="w-4 h-4 text-cyan-400 animate-spin" style={{ animationDuration: '6s' }} />
                    ) : (
                      <Circle className="w-4 h-4 text-zinc-600" />
                    )}
                    <span className="font-bold text-xs sm:text-sm text-zinc-100">{epoch.title}</span>
                    <span className="px-1.5 py-0.2 rounded bg-zinc-900 border border-zinc-700 text-[10px] text-zinc-400 font-mono">
                      {epoch.range}
                    </span>
                    {epoch.current && (
                      <span className="px-2 py-0.5 rounded bg-cyan-500 text-zinc-950 font-black text-[9px] tracking-wider animate-pulse">
                        {isEs ? 'FASE ACTIVA' : 'ACTIVE PHASE'}
                      </span>
                    )}
                  </div>

                  <span className="text-[11px] font-mono text-zinc-400">
                    {completedCount} / {epoch.milestones.length} {isEs ? 'hitos completados' : 'milestones met'}
                  </span>
                </div>

                <p className="text-[11px] text-zinc-400 mt-2 mb-2.5 italic">
                  {epoch.desc}
                </p>

                {/* Milestones checklist */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-xs">
                  {epoch.milestones.map((m, idx) => (
                    <button 
                      key={idx}
                      type="button"
                      onClick={() => {
                        if (m.tab && onNavigateTab) {
                          sound.playNavSwitch();
                          onNavigateTab(m.tab);
                          if (onClose) onClose();
                        }
                      }}
                      className={`flex items-center justify-between gap-2 p-2 rounded border text-[11px] text-left transition-all ${
                        m.met 
                          ? 'bg-emerald-950/20 border-emerald-600/30 text-emerald-300 hover:bg-emerald-900/30 cursor-pointer'
                          : 'bg-zinc-900/70 border-zinc-800 text-zinc-300 hover:border-cyan-600/60 hover:bg-cyan-950/40 hover:text-cyan-200 cursor-pointer group shadow-[0_0_8px_rgba(0,0,0,0.2)]'
                      }`}
                      title={m.tab ? (isEs ? `Ir a pestaña: ${m.tab.toUpperCase()}` : `Jump to tab: ${m.tab.toUpperCase()}`) : undefined}
                    >
                      <div className="flex items-center gap-2 min-w-0">
                        {m.met ? (
                          <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400 shrink-0" />
                        ) : (
                          <Circle className="w-3.5 h-3.5 text-zinc-600 shrink-0 group-hover:text-cyan-400 transition-colors" />
                        )}
                        <span className={`truncate ${m.met ? 'font-medium' : ''}`}>{m.label}</span>
                      </div>
                      {m.tab && (
                        <span className={`shrink-0 flex items-center gap-1 text-[9px] font-bold px-1.5 py-0.5 rounded transition-all ${
                          m.met 
                            ? 'text-emerald-400/80 bg-emerald-950/50' 
                            : 'text-cyan-300 bg-cyan-950/80 border border-cyan-800/60 group-hover:bg-cyan-500 group-hover:text-zinc-950'
                        }`}>
                          <span>{m.met ? (isEs ? 'VER' : 'VIEW') : (isEs ? 'IR' : 'GO')}</span>
                          <ArrowRight className="w-2.5 h-2.5" />
                        </span>
                      )}
                    </button>
                  ))}
                </div>
              </div>
            );
          })}
        </div>
      </section>

      {/* AI Strategic Mentor ("Synapse Oracle") */}
      <section className="p-4 bg-gradient-to-b from-[#0a121f] to-[#05080e] border border-cyan-600/50 rounded-xl space-y-3 shadow-[0_0_25px_rgba(0,255,200,0.1)]">
        <div className="flex items-center justify-between gap-2 border-b border-cyan-900/60 pb-2">
          <div className="flex items-center gap-2">
            <BrainCircuit className="w-4 h-4 text-cyan-400 animate-pulse" />
            <h3 className="text-xs sm:text-sm font-bold text-cyan-200 tracking-wider">
              {isEs ? 'SYNAPSE CORE ORACLE // ASESOR ESTRATÉGICO DE IA' : 'SYNAPSE CORE ORACLE // AI STRATEGIC MENTOR'}
            </h3>
          </div>
          <button
            type="button"
            disabled={isConsulting}
            onClick={() => handleAskMentor()}
            className="px-3 py-1 bg-gradient-to-r from-cyan-500 to-emerald-400 hover:from-cyan-400 hover:to-emerald-300 text-zinc-950 font-black rounded text-[11px] flex items-center gap-1.5 shadow-[0_0_12px_rgba(0,255,200,0.3)] transition-all cursor-pointer disabled:opacity-50"
          >
            <RefreshCw className={`w-3 h-3 ${isConsulting ? 'animate-spin' : ''}`} />
            <span>{isConsulting ? (isEs ? 'ANALIZANDO...' : 'ANALYZING...') : (isEs ? 'DIAGNÓSTICO COMPLETO IA' : 'FULL AI DIAGNOSIS')}</span>
          </button>
        </div>

        <p className="text-[11px] text-zinc-400 leading-relaxed">
          {isEs 
            ? 'El modelo de IA analiza tu telemetría en tiempo real (PFLOPS, VRAM, modelos, topología, calor, deuda, agentes) y formula una estrategia técnica para optimizar tu avance.'
            : 'The AI model analyzes your real-time telemetry (PFLOPS, VRAM, active models, topology, heat, utility debt, agents) and formulates an actionable technical roadmap.'}
        </p>

        {/* Custom prompt input */}
        <div className="flex gap-2">
          <input
            type="text"
            value={userQuery}
            onChange={e => setUserQuery(e.target.value)}
            onKeyDown={e => { if (e.key === 'Enter') handleAskMentor(); }}
            placeholder={isEs ? 'Pregunta al modelo (ej: "¿Qué hardware compro ahora?", "¿Cómo reduzco el calor?")...' : 'Ask the model (e.g. "What hardware should I buy next?", "How do I lower heat?")...'}
            className="flex-1 px-3 py-2 bg-[#04070d] border border-cyan-900/80 rounded-lg text-xs text-zinc-200 placeholder-zinc-600 focus:outline-none focus:border-cyan-400 font-mono"
          />
          <button
            type="button"
            disabled={isConsulting}
            onClick={() => handleAskMentor()}
            className="px-3.5 py-2 bg-cyan-600 hover:bg-cyan-500 text-zinc-950 font-bold rounded-lg text-xs flex items-center gap-1 transition-all cursor-pointer disabled:opacity-50"
          >
            <Send className="w-3.5 h-3.5" />
          </button>
        </div>

        {/* AI Output Box */}
        {aiAdvice && (
          <div className="p-3.5 bg-[#03060a] border border-cyan-800/80 rounded-lg space-y-2 text-xs font-mono animate-fadeIn">
            <div className="flex items-center justify-between text-[10px] text-zinc-500 border-b border-zinc-900 pb-1.5">
              <span className="text-cyan-400 font-bold flex items-center gap-1">
                <Sparkles className="w-3 h-3 text-cyan-400" />
                {isEs ? 'RESPUESTA DEL ORÁCULO DE IA' : 'ORACLE AI RESPONSE'}
              </span>
              <span className="px-1.5 py-0.5 rounded bg-zinc-900 border border-zinc-800 text-[9px] text-zinc-400 uppercase">
                {aiAdvice.provider}
              </span>
            </div>

            <div className="text-zinc-300 leading-relaxed whitespace-pre-line text-[11px]">
              {aiAdvice.adviceText}
            </div>
          </div>
        )}
      </section>
    </div>
  );
};
