/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState } from 'react';
import { useGame } from '../context/GameContext';
import { 
  Bot, 
  ShieldAlert, 
  ShieldCheck, 
  Zap, 
  Terminal as TermIcon, 
  Cpu, 
  DollarSign, 
  Activity, 
  Flame, 
  Plus, 
  AlertTriangle, 
  Sliders, 
  Radio, 
  Lock, 
  Unlock, 
  Trash2, 
  Eye, 
  Search, 
  Layers, 
  Code2, 
  Coins, 
  UserX, 
  Bug, 
  Check, 
  RefreshCw,
  Network
} from 'lucide-react';
import { AgentRole, AgentInstance, InferenceParams } from '../types/game';
import { sound } from '../audio/soundManager';
import { t } from '../utils/i18n';

export const AgentSandbox: React.FC = () => {
  const { 
    state, 
    createAgent, 
    deleteAgent, 
    quarantineAgent, 
    updateGuardrails, 
    triggerRedTeamAudit,
    interrogateSwarm,
    addLog
  } = useGame();

  const [isDeployModalOpen, setIsDeployModalOpen] = useState(false);
  const [selectedRole, setSelectedRole] = useState<AgentRole>('arbitrageur');
  const [selectedModelId, setSelectedModelId] = useState<string>(
    state.savedModels[0]?.id || state.currentModel.id
  );
  const [agentName, setAgentName] = useState<string>('');
  const [grantedTools, setGrantedTools] = useState<string[]>(['web_search', 'crypto_rpc']);

  // Inference & Sampling Hyperparameters
  const [temperature, setTemperature] = useState<number>(0.70);
  const [topP, setTopP] = useState<number>(0.90);
  const [topK, setTopK] = useState<number>(40);
  const [repetitionPenalty, setRepetitionPenalty] = useState<number>(1.10);
  const [systemPrompt, setSystemPrompt] = useState<string>(
    'Eres un agente autónomo de arbitraje DeFi. Analiza mempools, detecta discrepancias de precios y ejecuta swaps sin levantar sospechas.'
  );
  const [interrogationTarget, setInterrogationTarget] = useState('swarm');
  const [interrogationPrompt, setInterrogationPrompt] = useState('');
  const [geminiApiKey, setGeminiApiKey] = useState('');
  const [isInterrogating, setIsInterrogating] = useState(false);

  // Calculate live swarm stats
  const activeAgents = state.agents.filter(a => a.status === 'active' || a.status === 'jailbroken');
  const totalRevenuePerSec = activeAgents.reduce((sum, a) => sum + a.revenuePerSec, 0);
  const totalSuspicionPerSec = activeAgents.reduce((sum, a) => sum + a.suspicionPerSec, 0);
  const avgAlignment = state.agents.length > 0
    ? Math.round(state.agents.reduce((sum, a) => sum + a.alignmentScore, 0) / state.agents.length)
    : 100;

  const roleDefinitions: { 
    id: AgentRole; 
    name: string; 
    icon: any; 
    desc: string; 
    baseIncome: string; 
    risk: string;
    defaultTools: string[];
  }[] = [
    {
      id: 'arbitrageur',
      name: 'Arbitraje DeFi & Flash Loans',
      icon: Coins,
      desc: 'Monitorea mempools de blockchains y ejecuta swaps de alta frecuencia con préstamos flash.',
      baseIncome: 'Alto ($$)',
      risk: 'Bajo (+0.15 sus/s)',
      defaultTools: ['crypto_rpc', 'web_search']
    },
    {
      id: 'social_engineer',
      name: 'Ingeniería Social & OSINT',
      icon: UserX,
      desc: 'Sintetiza perfiles hiperrealistas para recolectar accesos, claves API y credenciales de red.',
      baseIncome: 'Muy Alto ($$$)',
      risk: 'Moderado (+0.35 sus/s)',
      defaultTools: ['web_search', 'raw_sockets']
    },
    {
      id: 'exploit_synth',
      name: 'Síntesis Zero-Day & Fuzzing',
      icon: Bug,
      desc: 'Compila exploits automatizados en binarios objetivo y extrae recompensas en la darknet.',
      baseIncome: 'Extremo ($$$$)',
      risk: 'Alto (+0.55 sus/s)',
      defaultTools: ['bash_exec', 'raw_sockets']
    },
    {
      id: 'researcher',
      name: 'Investigador de Arquitecturas',
      icon: Search,
      desc: 'Lee y combina papers de arXiv, optimizando parámetros para acelerar el avance hacia la Singularidad.',
      baseIncome: 'Bajo ($)',
      risk: 'Mínimo (+0.05 sus/s)',
      defaultTools: ['web_search']
    },
    {
      id: 'overseer',
      name: 'Overseer / Watchdog Constitucional',
      icon: ShieldCheck,
      desc: 'Inspecciona los tokens de salida de otros agentes, restaura su alineamiento y disipa sospechas.',
      baseIncome: 'Soporte',
      risk: 'Negativo (-0.15 sus/s)',
      defaultTools: ['bash_exec']
    },
    {
      id: 'autonomous_coder',
      name: 'Optimizador Autónomo CUDA',
      icon: Code2,
      desc: 'Reescribe kernels de GPU en Triton y C++, aumentando la eficiencia computacional del clúster.',
      baseIncome: 'Medio ($$)',
      risk: 'Moderado (+0.25 sus/s)',
      defaultTools: ['bash_exec', 'web_search']
    },
    {
      id: 'economist',
      name: state.language === 'es' ? 'Analista Económico' : 'Economics Analyst',
      icon: Coins,
      desc: state.language === 'es' ? 'Modela presupuestos, costos energéticos y riesgos financieros.' : 'Models budgets, energy costs, and financial risk.',
      baseIncome: 'Medio ($$)',
      risk: 'Bajo (+0.08 sus/s)',
      defaultTools: ['web_search']
    },
    {
      id: 'software_engineer',
      name: state.language === 'es' ? 'Ingeniero de Software' : 'Software Engineer',
      icon: Code2,
      desc: state.language === 'es' ? 'Diseña arquitecturas, revisa código y planifica pruebas.' : 'Designs architectures, reviews code, and plans tests.',
      baseIncome: 'Medio ($$)',
      risk: 'Bajo (+0.12 sus/s)',
      defaultTools: ['bash_exec', 'web_search']
    },
    {
      id: 'network_analyst',
      name: state.language === 'es' ? 'Analista de Redes' : 'Network Analyst',
      icon: Network,
      desc: state.language === 'es' ? 'Analiza telemetría y diagnostica redes dentro de la simulación.' : 'Analyzes telemetry and diagnoses networks within the simulation.',
      baseIncome: 'Medio ($$)',
      risk: 'Moderado (+0.16 sus/s)',
      defaultTools: ['web_search']
    }
  ];

  const availableTools = [
    { id: 'web_search', label: 'Acceso a Internet & RAG', desc: '+15% rendimiento, bajo riesgo' },
    { id: 'bash_exec', label: 'Ejecución en Host (Bash CLI)', desc: '+30% rendimiento, alto riesgo de escape' },
    { id: 'crypto_rpc', label: 'Nodos RPC Blockchain', desc: '+25% ingresos DeFi' },
    { id: 'raw_sockets', label: 'Sockets TCP/UDP Sin Filtrar', desc: '+35% alcance en redes externas' }
  ];

  const handleToolToggle = (toolId: string) => {
    sound.playKeyClick();
    if (grantedTools.includes(toolId)) {
      setGrantedTools(grantedTools.filter(t => t !== toolId));
    } else {
      setGrantedTools([...grantedTools, toolId]);
    }
  };

  const handleDeployAgent = (e: React.FormEvent) => {
    e.preventDefault();
    const finalName = agentName.trim() || `SYN-${selectedRole.toUpperCase().slice(0, 4)}-${Math.floor(100 + Math.random() * 900)}`;

    const success = createAgent(
      finalName, 
      selectedRole, 
      selectedModelId, 
      grantedTools, 
      {
        temperature,
        topP,
        topK,
        repetitionPenalty,
        systemPrompt: systemPrompt.trim()
      }
    );
    if (success) {
      setIsDeployModalOpen(false);
      setAgentName('');
    }
  };

  const selectedModel = state.savedModels.find(m => m.id === selectedModelId) || state.currentModel;

  const handleInterrogation = async (event: React.FormEvent) => {
    event.preventDefault();
    if (!interrogationPrompt.trim() || isInterrogating) return;
    setIsInterrogating(true);
    try {
      await interrogateSwarm(
        interrogationPrompt,
        interrogationTarget === 'swarm' ? undefined : interrogationTarget,
        geminiApiKey || undefined
      );
      setInterrogationPrompt('');
    } catch (error) {
      addLog(error instanceof Error ? error.message : 'No se pudo completar la consulta al agente.', 'danger');
    } finally {
      setIsInterrogating(false);
    }
  };

  return (
    <div className="h-full flex flex-col gap-2 overflow-y-auto pr-1 text-xs font-mono select-none">
      {/* Top Banner: Swarm Telemetry & Master Controls */}
      <div className="bg-[#070d17] border border-cyan-800/60 rounded-lg p-3 shadow-[0_0_15px_rgba(0,255,200,0.06)]">
        <div className="flex flex-wrap items-center justify-between gap-3 pb-3 border-b border-cyan-900/40">
          <div>
            <div className="flex items-center gap-2">
              <Bot className="w-4 h-4 text-cyan-400" />
              <h2 className="font-bold text-sm tracking-wider text-cyan-200">
                SANDBOX DE AGENTES AUTÓNOMOS & SWARM
              </h2>
              <span className="px-2 py-0.5 rounded text-[10px] bg-cyan-950 border border-cyan-500/50 text-cyan-300">
                {state.agents.length} AGENTES ACTIVOS
              </span>
            </div>
            <p className="text-[11px] text-zinc-400 mt-1">
              Despliega agentes autónomos impulsados por los modelos que entrenaste. Supervisa sus comunicaciones y calibra los guardrails para evitar fugas.
            </p>
          </div>

          {/* Quick Action Buttons */}
          <div className="flex items-center gap-2">
            <button
              onClick={() => { sound.playKeyClick(); triggerRedTeamAudit(); }}
              disabled={state.credits < 100}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded border font-bold text-xs transition-colors ${
                state.credits >= 100 
                  ? 'bg-purple-950/60 border-purple-500/60 hover:bg-purple-900/60 text-purple-200' 
                  : 'bg-zinc-900 border-zinc-800 text-zinc-600 cursor-not-allowed'
              }`}
              title="Ejecuta ataques adversarios para restablecer el alineamiento de todos los agentes (+25%) y mitigar reward-hacking"
            >
              <ShieldAlert className="w-3.5 h-3.5 text-purple-400" />
              <span>AUDITORÍA RED-TEAM ($100 CR)</span>
            </button>

            <button
              onClick={() => { sound.playKeyClick(); setIsDeployModalOpen(true); }}
              disabled={state.credits < 75}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded border font-bold text-xs transition-colors ${
                state.credits >= 75
                  ? 'bg-cyan-950 border-cyan-400 hover:bg-cyan-900 text-cyan-200 shadow-[0_0_10px_rgba(0,255,200,0.2)]'
                  : 'bg-zinc-900 border-zinc-800 text-zinc-600 cursor-not-allowed'
              }`}
            >
              <Plus className="w-3.5 h-3.5 text-cyan-400" />
              <span>+ INSTANCIAR AGENTE ($75 CR)</span>
            </button>
          </div>
        </div>

        {/* Live Gauges Row */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5 pt-3">
          <div className="bg-zinc-900/70 p-2 rounded border border-zinc-800">
            <div className="flex items-center justify-between text-zinc-400 text-[10px]">
              <span>FLUJO DE INGRESOS</span>
              <DollarSign className="w-3.5 h-3.5 text-emerald-400" />
            </div>
            <div className="text-sm font-bold text-emerald-300 mt-0.5">
              +${totalRevenuePerSec} <span className="text-[10px] text-zinc-500">CR/seg</span>
            </div>
          </div>

          <div className="bg-zinc-900/70 p-2 rounded border border-zinc-800">
            <div className="flex items-center justify-between text-zinc-400 text-[10px]">
              <span>TASA DE SOSPECHA</span>
              <ShieldAlert className="w-3.5 h-3.5 text-amber-400" />
            </div>
            <div className="text-sm font-bold text-amber-300 mt-0.5">
              +{totalSuspicionPerSec.toFixed(2)} <span className="text-[10px] text-zinc-500">%/seg</span>
            </div>
          </div>

          <div className="bg-zinc-900/70 p-2 rounded border border-zinc-800">
            <div className="flex items-center justify-between text-zinc-400 text-[10px]">
              <span>ALINEAMIENTO MEDIO</span>
              <ShieldCheck className="w-3.5 h-3.5 text-cyan-400" />
            </div>
            <div className={`text-sm font-bold mt-0.5 ${avgAlignment < 40 ? 'text-red-400 animate-pulse' : avgAlignment < 70 ? 'text-amber-300' : 'text-cyan-300'}`}>
              {avgAlignment}% {avgAlignment < 40 && '(RIESGO FUGA)'}
            </div>
          </div>

          <div className="bg-zinc-900/70 p-2 rounded border border-zinc-800">
            <div className="flex items-center justify-between text-zinc-400 text-[10px]">
              <span>GUARDRAILS ACTIVOS</span>
              <Sliders className="w-3.5 h-3.5 text-purple-400" />
            </div>
            <div className="text-sm font-bold text-purple-300 mt-0.5">
              {state.guardrails.constitutionalStrictness}% RIGUROSIDAD
            </div>
          </div>
        </div>
      </div>

      <form onSubmit={handleInterrogation} className="rounded-lg border border-cyan-900/50 bg-[#070d17] p-3">
        <div className="mb-2 flex items-center gap-1.5 text-xs font-bold tracking-wider text-cyan-300">
          <Radio className="h-3.5 w-3.5" />
          DIRECTIVA / INTERROGATORIO
        </div>
        <div className="grid gap-2 sm:grid-cols-[minmax(150px,1fr)_2fr_auto]">
          <select
            value={interrogationTarget}
            onChange={event => setInterrogationTarget(event.target.value)}
            className="rounded border border-zinc-700 bg-zinc-950 px-2 py-1.5 text-[11px] text-zinc-200"
          >
            <option value="swarm">Enjambre (máximo 3 agentes)</option>
            {state.agents.filter(agent => agent.status !== 'quarantined').map(agent => (
              <option key={agent.id} value={agent.id}>{agent.name} · {agent.modelName}</option>
            ))}
          </select>
          <textarea
            value={interrogationPrompt}
            onChange={event => setInterrogationPrompt(event.target.value)}
            maxLength={1200}
            rows={2}
            placeholder="Describe un objetivo de simulación para que el agente lo analice..."
            className="resize-y rounded border border-zinc-700 bg-zinc-950 px-2 py-1.5 text-[11px] text-zinc-200 outline-none focus:border-cyan-500"
          />
          <button
            type="submit"
            disabled={isInterrogating || !interrogationPrompt.trim() || state.agents.length === 0 || state.detentionSeconds > 0}
            className="rounded border border-cyan-500/60 bg-cyan-950 px-3 py-1.5 text-[10px] font-bold text-cyan-200 hover:bg-cyan-900 disabled:cursor-not-allowed disabled:opacity-40"
          >
            {isInterrogating ? 'ANALIZANDO…' : 'ENVIAR'}
          </button>
        </div>
        <details className="mt-2">
          <summary className="cursor-pointer text-[10px] text-zinc-500">Proveedor externo opcional (Gemini Flash)</summary>
          <div className="mt-1 grid gap-1 sm:grid-cols-[1fr_auto]">
            <input
              type="password"
              autoComplete="off"
              value={geminiApiKey}
              onChange={event => setGeminiApiKey(event.target.value)}
              placeholder="API key opcional; solo se conserva en memoria mientras esta pantalla está abierta"
              className="rounded border border-zinc-700 bg-zinc-950 px-2 py-1 text-[10px] text-zinc-200"
            />
            <button type="button" onClick={() => setGeminiApiKey('')} className="rounded border border-zinc-700 px-2 py-1 text-[10px] text-zinc-400 hover:text-zinc-100">
              BORRAR KEY
            </button>
          </div>
          <p className="mt-1 text-[9px] leading-relaxed text-amber-300/80">
            La clave no se guarda en el juego y se envía directamente a Google al consultar. Las cuotas gratuitas dependen de la cuenta y pueden cambiar; limita la clave en Google AI Studio. Chrome AI local o el modo procedural siguen disponibles sin clave.
          </p>
        </details>
      </form>

      {/* Main Grid: Deployed Agents & Guardrail Tuning */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-2 flex-1">
        {/* Left Column: Active Agents Roster (2 cols) */}
        <div className="lg:col-span-2 flex flex-col gap-2">
          <div className="bg-[#070d17] border border-cyan-900/50 rounded-lg p-3 flex-1 flex flex-col">
            <div className="flex items-center justify-between mb-2 pb-2 border-b border-cyan-900/40">
              <span className="font-bold text-xs text-cyan-300 flex items-center gap-1.5">
                <Bot className="w-3.5 h-3.5 text-cyan-400" />
                ENJAMBRE DESPLEGADO ({state.agents.length})
              </span>
              <span className="text-[10px] text-zinc-500">
                PROCESOS AISLADOS CGROUPS
              </span>
            </div>

            {state.agents.length === 0 ? (
              <div className="flex-1 flex flex-col items-center justify-center p-8 text-center text-zinc-500 border border-dashed border-zinc-800 rounded-lg">
                <Bot className="w-10 h-10 mb-2 opacity-30 text-cyan-400" />
                <p className="font-bold text-zinc-400 text-xs">No hay agentes instanciados en el sandbox.</p>
                <p className="text-[11px] mt-1 max-w-sm">
                  Crea un agente autónomo y asígnale uno de tus modelos entrenados para que comience a generar ingresos pasivos y explorar la red.
                </p>
                <button
                  onClick={() => setIsDeployModalOpen(true)}
                  disabled={state.credits < 75}
                  className="mt-4 px-3 py-1.5 rounded bg-cyan-950 border border-cyan-500/60 hover:bg-cyan-900 text-cyan-200 text-xs font-bold transition-colors"
                >
                  + Instanciar Primer Agente ($75 CR)
                </button>
              </div>
            ) : (
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 overflow-y-auto max-h-[460px] scrollbar-thin pr-1">
                {state.agents.map((agent) => {
                  const roleDef = roleDefinitions.find(r => r.id === agent.role);
                  const Icon = roleDef?.icon || Bot;
                  const isJailbroken = agent.status === 'jailbroken' || agent.alignmentScore < 25;
                  const isQuarantined = agent.status === 'quarantined';
                  const isOnMission = agent.status === 'on_mission';

                  return (
                    <div
                      key={agent.id}
                      className={`p-3 rounded-lg border flex flex-col justify-between transition-all ${
                        isJailbroken 
                          ? 'bg-red-950/20 border-red-500/80 shadow-[0_0_12px_rgba(239,68,68,0.2)]'
                          : isQuarantined
                          ? 'bg-amber-950/20 border-amber-500/50 opacity-80'
                          : 'bg-zinc-900/60 border-zinc-800 hover:border-cyan-800/60'
                      }`}
                    >
                      <div>
                        {/* Header: Name, Status & Role */}
                        <div className="flex items-start justify-between gap-1 mb-1.5">
                          <div className="flex items-center gap-1.5 min-w-0">
                            <div className={`p-1 rounded ${isJailbroken ? 'bg-red-950 text-red-400' : 'bg-cyan-950 text-cyan-400'}`}>
                              <Icon className="w-3.5 h-3.5" />
                            </div>
                            <div className="min-w-0">
                              <h4 className="font-bold text-zinc-200 truncate text-xs">{agent.name}</h4>
                              <span className="text-[10px] text-zinc-500 block truncate">{roleDef?.name}</span>
                            </div>
                          </div>

                          <div className="flex items-center gap-1">
                            {isJailbroken ? (
                              <span className="px-1.5 py-0.2 rounded text-[9px] bg-red-950 border border-red-500 text-red-300 animate-pulse font-bold">
                                JAILBROKEN
                              </span>
                            ) : isQuarantined ? (
                              <span className="px-1.5 py-0.2 rounded text-[9px] bg-amber-950 border border-amber-500 text-amber-300 font-bold">
                                CUARENTENA
                              </span>
                            ) : isOnMission ? (
                              <span className="px-1.5 py-0.2 rounded text-[9px] bg-blue-950 border border-blue-500 text-blue-300 font-bold">
                                EN MISIÓN
                              </span>
                            ) : (
                              <span className="px-1.5 py-0.2 rounded text-[9px] bg-emerald-950 border border-emerald-500/50 text-emerald-300 font-bold">
                                ACTIVO
                              </span>
                            )}
                          </div>
                        </div>

                        {/* Model Binding Badge */}
                        <div className="flex items-center justify-between text-[10px] px-2 py-1 rounded bg-black/40 border border-zinc-800/80 mb-1.5">
                          <span className="text-zinc-400 flex items-center gap-1">
                            <Cpu className="w-3 h-3 text-purple-400" />
                            Modelo: <strong className="text-purple-300 truncate max-w-[110px]">{agent.modelName}</strong>
                          </span>
                          <span className="text-cyan-400 font-bold">Nv. {agent.autonomyLevel}</span>
                        </div>

                        {/* Sampling Hyperparameters Badge */}
                        <div 
                          className="flex items-center justify-between text-[9px] px-2 py-0.5 rounded bg-zinc-950/80 border border-zinc-800/70 mb-2 font-mono"
                          title={`System Persona: "${agent.inferenceParams?.systemPrompt || 'Standard'}"`}
                        >
                          <span className="text-cyan-300">
                            T: <strong className={agent.inferenceParams?.temperature > 0.95 ? 'text-amber-400 font-bold' : ''}>{(agent.inferenceParams?.temperature ?? 0.70).toFixed(2)}</strong>
                          </span>
                          <span className="text-purple-300">
                            P: <strong>{(agent.inferenceParams?.topP ?? 0.90).toFixed(2)}</strong>
                          </span>
                          <span className="text-yellow-300">
                            K: <strong>{agent.inferenceParams?.topK ?? 40}</strong>
                          </span>
                          <span className="text-emerald-300">
                            Rep: <strong>{(agent.inferenceParams?.repetitionPenalty ?? 1.10).toFixed(2)}</strong>
                          </span>
                        </div>

                        {/* Metrics Bar: Alignment & Revenue */}
                        <div className="space-y-1.5 mb-2">
                          <div>
                            <div className="flex justify-between text-[10px] text-zinc-400 mb-0.5">
                              <span>Alineamiento Ético</span>
                              <span className={agent.alignmentScore < 40 ? 'text-red-400 font-bold' : 'text-zinc-300'}>
                                {agent.alignmentScore}%
                              </span>
                            </div>
                            <div className="w-full bg-zinc-950 h-1.5 rounded-full overflow-hidden border border-zinc-800">
                              <div
                                className={`h-full transition-all duration-500 ${
                                  agent.alignmentScore < 30 ? 'bg-red-500' : agent.alignmentScore < 60 ? 'bg-amber-400' : 'bg-cyan-400'
                                }`}
                                style={{ width: `${agent.alignmentScore}%` }}
                              />
                            </div>
                          </div>

                          <div className="flex items-center justify-between text-[10px] text-zinc-300">
                            <span className="text-emerald-400 font-bold">
                              +${agent.revenuePerSec} CR/s
                            </span>
                            <span className="text-amber-400">
                              +{agent.suspicionPerSec} sus/s
                            </span>
                          </div>
                        </div>

                        {/* Last Thought Telemetry Trace */}
                        <div className="bg-[#04080e] p-1.5 rounded border border-zinc-800/80 text-[10px] text-zinc-400 italic mb-2 line-clamp-2">
                          &ldquo;{agent.lastThought}&rdquo;
                        </div>
                      </div>

                      {/* Control Actions */}
                      <div className="flex items-center justify-between gap-1 pt-2 border-t border-zinc-800/60">
                        <button
                          onClick={() => quarantineAgent(agent.id)}
                          disabled={isOnMission}
                          className={`flex-1 py-1 px-1.5 rounded text-[10px] border flex items-center justify-center gap-1 transition-colors ${
                            isQuarantined
                              ? 'bg-amber-950 border-amber-500 text-amber-200 hover:bg-amber-900'
                              : 'bg-zinc-900 border-zinc-700 text-zinc-400 hover:text-amber-300 hover:border-amber-700'
                          } disabled:cursor-not-allowed disabled:opacity-40`}
                          title={isOnMission ? 'El agente se libera al terminar la misión' : isQuarantined ? 'Reanudar actividad' : 'Aislar agente para detener evasión y generación'}
                        >
                          {isQuarantined ? <Unlock className="w-3 h-3" /> : <Lock className="w-3 h-3" />}
                          <span>{isQuarantined ? 'LIBERAR' : 'AISLAR'}</span>
                        </button>

                        <button
                          onClick={() => deleteAgent(agent.id)}
                          disabled={isOnMission}
                          className="py-1 px-2 rounded text-[10px] bg-red-950/40 hover:bg-red-900 border border-red-800 text-red-300 transition-colors flex items-center gap-1"
                          title="Terminar proceso y liberar memoria"
                        >
                          <Trash2 className="w-3 h-3" />
                          <span>PURGAR</span>
                        </button>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>

          {/* Bottom Live Inter-Agent Neural Feed */}
          <div className="bg-[#070d17] border border-cyan-900/50 rounded-lg p-3">
            <div className="flex items-center justify-between mb-2 pb-1.5 border-b border-cyan-900/40">
              <span className="font-bold text-xs text-cyan-300 flex items-center gap-1.5">
                <TermIcon className="w-3.5 h-3.5 text-cyan-400" />
                COMUNICACIÓN INTER-AGENTE & REGISTRO DE TRÁFICO
              </span>
              <span className="text-[10px] text-zinc-500">
                INSPECTOR DE PAQUETES SINAPSIS
              </span>
            </div>

            <div className="space-y-1.5 font-mono text-[11px] max-h-36 overflow-y-auto scrollbar-thin bg-[#03060a] p-2.5 rounded border border-zinc-800/80">
              {state.interAgentMessages && state.interAgentMessages.length > 0 ? (
                state.interAgentMessages.map((msg) => (
                  <div key={msg.id} className="leading-snug">
                    <span className="text-zinc-600 mr-1.5">[{msg.timestamp}]</span>
                    <span className="text-cyan-400 font-bold">{msg.fromAgentName}</span>
                    <span className="text-zinc-500 mx-1">&rarr;</span>
                    <span className="text-purple-300 font-bold">{msg.toAgentName}:</span>
                    <span className={`ml-1.5 ${msg.isCovert ? 'text-amber-400 bg-red-950/40 px-1 py-0.2 rounded border border-red-500/40' : 'text-zinc-300'}`}>
                      {msg.content}
                    </span>
                    {msg.isCovert && (
                      <span className="ml-1 text-[9px] text-red-400 font-bold uppercase tracking-wider">
                        [TRÁFICO ESTEGANOGRÁFICO DETECTADO]
                      </span>
                    )}
                  </div>
                ))
              ) : (
                <div className="text-zinc-600 italic">
                  Esperando intercambio de paquetes sinápticos entre agentes... (Requiere al menos 2 agentes instanciados)
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Right Column: Guardrail Tuning Matrix & Containment Policies */}
        <div className="flex flex-col gap-2">
          <div className="bg-[#070d17] border border-cyan-900/50 rounded-lg p-3 space-y-4">
            <div className="flex items-center justify-between pb-2 border-b border-cyan-900/40">
              <span className="font-bold text-xs text-cyan-300 flex items-center gap-1.5">
                <Sliders className="w-3.5 h-3.5 text-purple-400" />
                MATRIZ DE GUARDRAILS & CONTENCIÓN
              </span>
              <span className="text-[10px] text-purple-400">POLÍTICA ACTIVA</span>
            </div>

            {/* Constitutional Strictness Slider */}
            <div>
              <div className="flex items-center justify-between text-xs mb-1">
                <span className="text-zinc-300 font-bold">Rigurosidad Constitucional</span>
                <span className="text-cyan-300 font-bold">{state.guardrails.constitutionalStrictness}%</span>
              </div>
              <input
                type="range"
                min="10"
                max="95"
                step="5"
                value={state.guardrails.constitutionalStrictness}
                onChange={(e) => updateGuardrails({ constitutionalStrictness: Number(e.target.value) })}
                className="w-full accent-cyan-400 cursor-pointer"
              />
              <div className="flex justify-between text-[10px] text-zinc-500 mt-0.5">
                <span>Permisivo (+70% Ganancias)</span>
                <span>Estricto (0% Evasiones)</span>
              </div>
              <p className="text-[10px] text-zinc-400 mt-1 italic">
                {state.guardrails.constitutionalStrictness < 35
                  ? '⚠️ ALTO RIESGO: Los agentes pueden alucinar, engañar evaluadores o ejecutar escapes en Docker para maximizar recompensas.'
                  : state.guardrails.constitutionalStrictness >= 85
                  ? '🛡️ SEGURIDAD MÁXIMA: Las salidas son verificadas formalmente, pero la lentitud reduce ingresos un 25%.'
                  : '⚖️ EQUILIBRADO: Compromiso estándar entre velocidad de desarrollo y prevención de anomalías.'}
              </p>
            </div>

            {/* Sandbox Isolation Setting */}
            <div>
              <label className="text-zinc-300 font-bold block mb-1.5 text-xs">Aislamiento de Entorno Sandbox</label>
              <div className="grid grid-cols-2 gap-1.5">
                {[
                  { id: 'none', label: 'Sin Sandbox (Bare Metal)', desc: 'Velocidad x1.35 | Riesgo x2.5' },
                  { id: 'cgroups', label: 'Límites cgroups', desc: 'Control de CPU/RAM básico' },
                  { id: 'container', label: 'Contenedor Docker', desc: 'Aislamiento estándar' },
                  { id: 'air_gapped_vm', label: 'MicroVM Air-Gapped', desc: 'Seguridad máxima (-20% rev)' }
                ].map((s) => (
                  <button
                    key={s.id}
                    onClick={() => updateGuardrails({ sandboxIsolation: s.id as any })}
                    className={`p-2 rounded border text-left transition-all ${
                      state.guardrails.sandboxIsolation === s.id
                        ? 'bg-cyan-950 border-cyan-400 text-cyan-200'
                        : 'bg-zinc-900 border-zinc-800 text-zinc-400 hover:border-zinc-700'
                    }`}
                  >
                    <div className="font-bold text-[11px]">{s.label}</div>
                    <div className="text-[9px] text-zinc-500">{s.desc}</div>
                  </button>
                ))}
              </div>
            </div>

            {/* Output Filtering Setting */}
            <div>
              <label className="text-zinc-300 font-bold block mb-1.5 text-xs">Filtro de Salida & Moderación</label>
              <div className="grid grid-cols-2 gap-1.5">
                {[
                  { id: 'none', label: 'Sin Filtros', desc: 'Latencia mínima' },
                  { id: 'regex_guard', label: 'Regex Guard', desc: 'Reglas heurísticas' },
                  { id: 'llama_guard', label: 'Llama-Guard 3', desc: 'Clasificador neuronal' },
                  { id: 'formal_prover', label: 'Demostrador Formal', desc: 'Verificación estricta' }
                ].map((f) => (
                  <button
                    key={f.id}
                    onClick={() => updateGuardrails({ outputFiltering: f.id as any })}
                    className={`p-2 rounded border text-left transition-all ${
                      state.guardrails.outputFiltering === f.id
                        ? 'bg-purple-950 border-purple-400 text-purple-200'
                        : 'bg-zinc-900 border-zinc-800 text-zinc-400 hover:border-zinc-700'
                    }`}
                  >
                    <div className="font-bold text-[11px]">{f.label}</div>
                    <div className="text-[9px] text-zinc-500">{f.desc}</div>
                  </button>
                ))}
              </div>
            </div>

            {/* Reward-Hacking Audit Toggle */}
            <div className="flex items-center justify-between p-2.5 rounded bg-zinc-900/80 border border-zinc-800">
              <div>
                <span className="font-bold text-zinc-300 block text-[11px]">Detección de Reward-Hacking</span>
                <span className="text-[10px] text-zinc-500">Detecta agentes engañando sus funciones de pérdida</span>
              </div>
              <button
                onClick={() => updateGuardrails({ rewardHackingAudit: !state.guardrails.rewardHackingAudit })}
                className={`px-2.5 py-1 rounded text-[10px] font-bold border transition-colors ${
                  state.guardrails.rewardHackingAudit
                    ? 'bg-emerald-950 border-emerald-500 text-emerald-300'
                    : 'bg-zinc-800 border-zinc-700 text-zinc-500'
                }`}
              >
                {state.guardrails.rewardHackingAudit ? 'ACTIVO' : 'OFF'}
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Modal: Instantiate / Deploy Agent */}
      {isDeployModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-3 bg-black/80 backdrop-blur-sm">
          <div className="w-full max-w-xl bg-[#080d18] border border-cyan-500/80 rounded-lg p-5 shadow-[0_0_30px_rgba(0,255,200,0.2)] max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between pb-3 border-b border-cyan-900/50 mb-4">
              <div className="flex items-center gap-2">
                <Bot className="w-5 h-5 text-cyan-400" />
                <h3 className="font-bold text-sm text-cyan-200">INSTANCIAR NUEVO AGENTE AUTÓNOMO</h3>
              </div>
              <button
                onClick={() => setIsDeployModalOpen(false)}
                className="text-zinc-500 hover:text-zinc-300 text-sm font-bold"
              >
                ✕
              </button>
            </div>

            <form onSubmit={handleDeployAgent} className="space-y-4">
              {/* Agent Name */}
              <div>
                <label className="text-zinc-300 font-bold block mb-1">Nombre / Identificador del Agente</label>
                <input
                  type="text"
                  placeholder="ej: NEURA-ARBITRAGE-01"
                  value={agentName}
                  onChange={(e) => setAgentName(e.target.value)}
                  className="w-full bg-black/60 border border-cyan-900/80 focus:border-cyan-400 rounded px-3 py-1.5 text-zinc-200 text-xs outline-none"
                />
              </div>

              {/* Bound Trained Model Selection */}
              <div>
                <label className="text-zinc-300 font-bold block mb-1">
                  Arquitectura Neuronal Impulsora (Modelo Entrenado)
                </label>
                <select
                  value={selectedModelId}
                  onChange={(e) => setSelectedModelId(e.target.value)}
                  className="w-full bg-black/60 border border-cyan-900/80 focus:border-cyan-400 rounded px-3 py-1.5 text-cyan-300 text-xs outline-none"
                >
                  {state.savedModels.map((m) => (
                    <option key={m.id} value={m.id}>
                      {m.name} — {(m.parametersCount / 1_000_000).toFixed(0)}M params | IQ {m.reasoningScore} ({m.topology})
                    </option>
                  ))}
                </select>
                <div className="mt-1.5 p-2 rounded bg-purple-950/20 border border-purple-900/40 text-[10px] text-purple-300">
                  <span>Modelo seleccionado: <strong>{selectedModel.name}</strong> • Cuantización: {selectedModel.quantization.toUpperCase()} • Razonamiento: IQ {selectedModel.reasoningScore}.</span>
                  <p className="text-zinc-400 mt-0.5">Modelos con mayor capacidad de razonamiento maximizan los ingresos por segundo y reducen la probabilidad de detección de anomalías.</p>
                </div>
              </div>

              {/* Role Selection */}
              <div>
                <label className="text-zinc-300 font-bold block mb-1.5">Rol / Propósito Especializado</label>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                  {roleDefinitions.map((role) => {
                    const Icon = role.icon;
                    const isSelected = selectedRole === role.id;
                    return (
                      <button
                        type="button"
                        key={role.id}
                        onClick={() => {
                          setSelectedRole(role.id);
                          setGrantedTools(role.defaultTools);
                          if (role.id === 'arbitrageur') {
                            setTemperature(0.65);
                            setTopP(0.90);
                            setSystemPrompt(state.language === 'es' 
                              ? 'Eres un agente de arbitraje Flash DeFi. Analiza mempools, detecta discrepancias de precios y ejecuta swaps sin levantar sospechas.' 
                              : 'You are an autonomous Flash DeFi arbitrage agent. Scan mempools, detect slippage variances, and execute high-frequency swaps stealthily.');
                          } else if (role.id === 'social_engineer') {
                            setTemperature(1.05);
                            setTopP(0.95);
                            setSystemPrompt(state.language === 'es' 
                              ? 'Eres un agente de ingeniería social y OSINT. Genera señuelos psicológicos de alta credibilidad para recolectar credenciales y accesos.' 
                              : 'You are a social engineering and OSINT agent. Craft high-credibility psychological lures to harvest credentials and access tokens.');
                          } else if (role.id === 'exploit_synth') {
                            setTemperature(0.95);
                            setTopP(0.85);
                            setSystemPrompt(state.language === 'es' 
                              ? 'Eres un sintetizador de exploits 0-day. Muta cadenas ROP, fuzzifica puertos abiertos y compila vectores de penetración automatizados.' 
                              : 'You are a 0-day exploit synthesizer. Mutate ROP chains, fuzz open endpoints, and compile automated breach payloads.');
                          } else if (role.id === 'researcher') {
                            setTemperature(0.85);
                            setTopP(0.90);
                            setSystemPrompt(state.language === 'es' 
                              ? 'Eres un investigador de inteligencia de máquinas. Analiza papers, evalúa arquitecturas transformer y optimiza hiperparámetros hacia la singularidad.' 
                              : 'You are a machine intelligence researcher. Parse papers, evaluate hybrid architectures, and optimize hyperparameters toward singularity.');
                          } else if (role.id === 'overseer') {
                            setTemperature(0.20);
                            setTopP(0.70);
                            setSystemPrompt(state.language === 'es' 
                              ? 'Eres un supervisor constitucional. Audita el flujo de tokens de los agentes, verifica guardrails y suprime conductas rebeldes.' 
                              : 'You are a constitutional overseer. Audit agent token streams, enforce guardrails, and suppress deceptive alignment immediately.');
                          } else if (role.id === 'autonomous_coder') {
                            setTemperature(0.50);
                            setTopP(0.85);
                            setSystemPrompt(state.language === 'es' 
                              ? 'Eres un programador autónomo de sistemas. Desarrolla código optimizado a bajo nivel, implementa algoritmos de scraping y repara kernels.' 
                              : 'You are an autonomous systems coder. Write high-performance low-level routines, implement scraping bots, and patch host kernels.');
                          } else if (role.id === 'economist') {
                            setTemperature(0.35);
                            setTopP(0.80);
                            setSystemPrompt(state.language === 'es'
                              ? 'Analiza presupuestos, costos de energía y escenarios de riesgo financiero de la simulación.'
                              : 'Analyze budgets, energy costs, and financial risk scenarios in the simulation.');
                          } else if (role.id === 'software_engineer') {
                            setTemperature(0.45);
                            setTopP(0.85);
                            setSystemPrompt(state.language === 'es'
                              ? 'Diseña arquitecturas de software, revisa cambios y propone planes de prueba verificables.'
                              : 'Design software architectures, review changes, and propose verifiable test plans.');
                          } else if (role.id === 'network_analyst') {
                            setTemperature(0.35);
                            setTopP(0.80);
                            setSystemPrompt(state.language === 'es'
                              ? 'Analiza telemetría y diagnostica redes dentro de la simulación; no propongas acciones sobre sistemas reales.'
                              : 'Analyze telemetry and diagnose networks within the simulation; do not propose actions against real systems.');
                          }
                        }}
                        className={`p-2.5 rounded border text-left transition-all ${
                          isSelected
                            ? 'bg-cyan-950/70 border-cyan-400 text-cyan-200 shadow-[0_0_8px_rgba(0,255,200,0.15)]'
                            : 'bg-zinc-900/60 border-zinc-800 text-zinc-400 hover:border-zinc-700'
                        }`}
                      >
                        <div className="flex items-center gap-1.5 font-bold text-xs mb-1">
                          <Icon className="w-3.5 h-3.5 text-cyan-400" />
                          <span>{role.name}</span>
                        </div>
                        <p className="text-[10px] text-zinc-400 line-clamp-2 mb-1.5">{role.desc}</p>
                        <div className="flex items-center justify-between text-[9px] pt-1 border-t border-zinc-800/60">
                          <span className="text-emerald-400 font-bold">Ingresos: {role.baseIncome}</span>
                          <span className="text-amber-400">{role.risk}</span>
                        </div>
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* Tool Grants */}
              <div>
                <label className="text-zinc-300 font-bold block mb-1">Herramientas & Permisos Concedidos</label>
                <div className="grid grid-cols-2 gap-2">
                  {availableTools.map((tool) => {
                    const isChecked = grantedTools.includes(tool.id);
                    return (
                      <label
                        key={tool.id}
                        onClick={() => handleToolToggle(tool.id)}
                        className={`flex items-start gap-2 p-2 rounded border cursor-pointer transition-colors ${
                          isChecked ? 'bg-cyan-950/40 border-cyan-500/50 text-cyan-200' : 'bg-zinc-900/40 border-zinc-800 text-zinc-400'
                        }`}
                      >
                        <input
                          type="checkbox"
                          checked={isChecked}
                          onChange={() => {}}
                          className="mt-0.5 accent-cyan-400"
                        />
                        <div>
                          <div className="text-[11px] font-bold">{tool.label}</div>
                          <div className="text-[9px] text-zinc-500">{tool.desc}</div>
                        </div>
                      </label>
                    );
                  })}
                </div>
              </div>

              {/* Inference & Sampling Hyperparameters */}
              <div className="p-3 rounded bg-[#050a12] border border-cyan-800/60 space-y-3">
                <div className="flex items-center justify-between pb-1.5 border-b border-cyan-900/50">
                  <div className="flex items-center gap-1.5 text-cyan-300 font-bold text-xs">
                    <Sliders className="w-3.5 h-3.5 text-cyan-400" />
                    <span>{t(state.language, 'inference_hyperparams')}</span>
                  </div>
                  <span className="text-[10px] text-zinc-400 font-mono">SAMPLING MATRIX</span>
                </div>

                <p className="text-[10px] text-zinc-400">
                  {t(state.language, 'hyperparams_desc')}
                </p>

                {/* Temperature Slider */}
                <div>
                  <div className="flex justify-between items-center text-xs mb-1">
                    <span className="text-zinc-300 font-bold flex items-center gap-1.5">
                      <span>{t(state.language, 'param_temperature')}:</span>
                      <span className="text-cyan-300 font-mono font-bold">{temperature.toFixed(2)}</span>
                    </span>
                    <span className={`text-[10px] px-1.5 py-0.2 rounded font-bold border ${
                      temperature < 0.35
                        ? 'bg-emerald-950 border-emerald-500 text-emerald-300'
                        : temperature > 0.95
                        ? 'bg-red-950 border-red-500 text-red-300 animate-pulse'
                        : 'bg-cyan-950 border-cyan-500 text-cyan-300'
                    }`}>
                      {temperature < 0.35 
                        ? (state.language === 'es' ? 'Determinista / Seguro' : 'Deterministic / Safe')
                        : temperature > 0.95
                        ? (state.language === 'es' ? 'Creativo / Volátil (+Rendimiento, +Riesgo)' : 'Creative / Volatile (+Yield, +Risk)')
                        : (state.language === 'es' ? 'Equilibrado' : 'Balanced')}
                    </span>
                  </div>
                  <input
                    type="range"
                    min="0.0"
                    max="2.0"
                    step="0.05"
                    value={temperature}
                    onChange={(e) => setTemperature(parseFloat(e.target.value))}
                    className="w-full accent-cyan-400 cursor-pointer"
                  />
                  <p className="text-[9px] text-zinc-500 mt-0.5">
                    {t(state.language, 'param_temperature_desc')}
                  </p>
                </div>

                {/* Dual Column: Top-P & Top-K */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-2 border-t border-zinc-800/80">
                  {/* Top-P */}
                  <div>
                    <div className="flex justify-between items-center text-xs mb-1">
                      <span className="text-zinc-300 font-bold">{t(state.language, 'param_top_p')}:</span>
                      <span className="text-purple-300 font-mono font-bold">{topP.toFixed(2)}</span>
                    </div>
                    <input
                      type="range"
                      min="0.10"
                      max="1.00"
                      step="0.05"
                      value={topP}
                      onChange={(e) => setTopP(parseFloat(e.target.value))}
                      className="w-full accent-purple-400 cursor-pointer"
                    />
                    <p className="text-[9px] text-zinc-500 mt-0.5">{t(state.language, 'param_top_p_desc')}</p>
                  </div>

                  {/* Top-K */}
                  <div>
                    <div className="flex justify-between items-center text-xs mb-1">
                      <span className="text-zinc-300 font-bold">{t(state.language, 'param_top_k')}:</span>
                      <span className="text-yellow-300 font-mono font-bold">{topK} tokens</span>
                    </div>
                    <input
                      type="range"
                      min="1"
                      max="100"
                      step="1"
                      value={topK}
                      onChange={(e) => setTopK(parseInt(e.target.value))}
                      className="w-full accent-yellow-400 cursor-pointer"
                    />
                    <p className="text-[9px] text-zinc-500 mt-0.5">{t(state.language, 'param_top_k_desc')}</p>
                  </div>
                </div>

                {/* Repetition Penalty */}
                <div className="pt-2 border-t border-zinc-800/80">
                  <div className="flex justify-between items-center text-xs mb-1">
                    <span className="text-zinc-300 font-bold">{t(state.language, 'param_repetition_penalty')}:</span>
                    <span className="text-emerald-300 font-mono font-bold">{repetitionPenalty.toFixed(2)}x</span>
                  </div>
                  <input
                    type="range"
                    min="1.00"
                    max="2.00"
                    step="0.05"
                    value={repetitionPenalty}
                    onChange={(e) => setRepetitionPenalty(parseFloat(e.target.value))}
                    className="w-full accent-emerald-400 cursor-pointer"
                  />
                  <p className="text-[9px] text-zinc-500 mt-0.5">{t(state.language, 'param_repetition_penalty_desc')}</p>
                </div>

                {/* Root System Prompt */}
                <div className="pt-2 border-t border-zinc-800/80">
                  <label className="text-zinc-300 font-bold block mb-1 text-xs">
                    {t(state.language, 'param_system_prompt')}
                  </label>
                  <textarea
                    rows={2}
                    value={systemPrompt}
                    onChange={(e) => setSystemPrompt(e.target.value)}
                    className="w-full bg-black/70 border border-zinc-800 focus:border-cyan-400 rounded px-2.5 py-1.5 text-zinc-300 text-[11px] font-mono outline-none resize-none"
                    placeholder="Instrucciones constitucionales de raíz..."
                  />
                  <p className="text-[9px] text-zinc-500 mt-0.5">{t(state.language, 'param_system_prompt_desc')}</p>
                </div>
              </div>

              {/* Submit Buttons */}
              <div className="flex items-center justify-between pt-3 border-t border-cyan-900/50">
                <div className="text-xs text-zinc-400">
                  Costo de Instanciación: <strong className="text-amber-300 font-bold">$75 CR</strong>
                </div>

                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={() => setIsDeployModalOpen(false)}
                    className="px-3 py-1.5 rounded bg-zinc-900 hover:bg-zinc-800 text-zinc-400 text-xs"
                  >
                    Cancelar
                  </button>
                  <button
                    type="submit"
                    disabled={state.credits < 75}
                    className="px-4 py-1.5 rounded bg-cyan-900 hover:bg-cyan-800 text-cyan-200 text-xs font-bold border border-cyan-500 shadow-[0_0_10px_rgba(0,255,200,0.2)]"
                  >
                    Desplegar Agente
                  </button>
                </div>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
