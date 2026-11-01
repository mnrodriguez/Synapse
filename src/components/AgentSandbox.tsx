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
  Network,
  Clock
} from 'lucide-react';
import { AgentRole, AgentInstance, InferenceParams } from '../types/game';
import { sound } from '../audio/soundManager';
import { localize, t } from '../utils/i18n';
import { INFERENCE_DOCS } from '../utils/aiDocumentation';
import { DocLinkBadge } from './DocLinkBadge';

const MISSION_ROLE_TASKS: Record<AgentRole, { en: string; es: string }> = {
  arbitrageur: { en: 'Analyzes simulated market signals and cross-checks anomalies.', es: 'Analiza señales de mercado simuladas y verifica anomalías.' },
  social_engineer: { en: 'Reviews fictional social data for privacy and trust risks.', es: 'Revisa datos sociales ficticios para detectar riesgos de privacidad y confianza.' },
  exploit_synth: { en: 'Runs isolated resilience checks in the fictional test environment.', es: 'Ejecuta comprobaciones de resiliencia aisladas en el entorno ficticio.' },
  researcher: { en: 'Collects evidence and validates the model’s assumptions.', es: 'Recopila evidencia y valida las hipótesis del modelo.' },
  overseer: { en: 'Checks safety constraints and reviews the team’s findings.', es: 'Comprueba los límites de seguridad y revisa los hallazgos del equipo.' },
  autonomous_coder: { en: 'Optimizes the simulated compute pipeline.', es: 'Optimiza el flujo de cómputo simulado.' },
  economist: { en: 'Evaluates cost, reward, and operational risk trade-offs.', es: 'Evalúa costos, recompensas y riesgos operativos.' },
  software_engineer: { en: 'Integrates the workstream and validates the proposed solution.', es: 'Integra el trabajo del equipo y valida la solución propuesta.' },
  network_analyst: { en: 'Correlates simulated telemetry and verifies system behavior.', es: 'Correlaciona telemetría simulada y verifica el comportamiento del sistema.' }
};

const MISSION_PHASES = [
  { until: 25, en: 'Analyze inputs', es: 'Analizar entradas' },
  { until: 50, en: 'Coordinate work', es: 'Coordinar trabajo' },
  { until: 75, en: 'Validate findings', es: 'Validar hallazgos' },
  { until: 100, en: 'Finalize solution', es: 'Finalizar solución' }
];

export const AgentSandbox: React.FC = () => {
  const { 
    state, 
    missionAiApiKey,
    createAgent, 
    deleteAgent, 
    quarantineAgent, 
    updateGuardrails, 
    triggerRedTeamAudit,
    interrogateSwarm,
    addLog,
    setAgentAutoMission,
    setAllAgentsAutoMission,
    updateAutonomySettings,
    setMissionAiApiKey
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
    state.language === 'en'
      ? 'Analyze simulated market data, identify pricing trends, and report a risk-aware recommendation.'
      : 'Analiza datos de mercado simulados, identifica tendencias de precios y presenta una recomendación consciente del riesgo.'
  );
  const [interrogationTarget, setInterrogationTarget] = useState('swarm');
  const [interrogationPrompt, setInterrogationPrompt] = useState('');
  const [isInterrogating, setIsInterrogating] = useState(false);

  // Calculate live swarm stats
  const activeAgents = state.agents.filter(a => a.status === 'active' || a.status === 'jailbroken');
  const totalRevenuePerSec = activeAgents.reduce((sum, a) => sum + a.revenuePerSec, 0);
  const totalSuspicionPerSec = activeAgents.reduce((sum, a) => sum + a.suspicionPerSec, 0);
  const avgAlignment = state.agents.length > 0
    ? Math.round(state.agents.reduce((sum, a) => sum + a.alignmentScore, 0) / state.agents.length)
    : 100;
  const activeMissionContract = state.contracts.find(contract => contract.id === state.activeGig?.contractId);
  const activeMissionAgents = state.agents.filter(agent =>
    state.activeGig?.agentIds?.includes(agent.id)
  );
  const missionProgress = state.activeGig?.progressPercent ?? 0;
  const currentMissionPhase = MISSION_PHASES.findIndex(phase => missionProgress < phase.until);
  const missionPhaseIndex = currentMissionPhase < 0 ? MISSION_PHASES.length - 1 : currentMissionPhase;

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

  const englishRoleCopy: Partial<Record<AgentRole, { name: string; desc: string; income: string; risk: string }>> = {
    arbitrageur: { name: 'DeFi Market Analyst', desc: 'Analyzes simulated market data and reports pricing trends and risk.', income: 'Medium ($$)', risk: 'Low (+0.15 suspicion/s)' },
    social_engineer: { name: 'Social Research Analyst', desc: 'Studies public, fictional personas and summarizes privacy and trust risks.', income: 'High ($$$)', risk: 'Moderate (+0.35 suspicion/s)' },
    exploit_synth: { name: 'Simulation Security Tester', desc: 'Runs abstract resilience tests against fictional targets in the game.', income: 'High ($$$$)', risk: 'High (+0.55 suspicion/s)' },
    researcher: { name: 'Architecture Researcher', desc: 'Compares research findings and model configurations in the simulation.', income: 'Low ($)', risk: 'Minimal (+0.05 suspicion/s)' },
    overseer: { name: 'Alignment Overseer', desc: 'Reviews agent outputs, guardrails, and simulation risk signals.', income: 'Support', risk: 'Reduces suspicion' },
    autonomous_coder: { name: 'Compute Optimizer', desc: 'Improves simulated GPU scheduling and cluster efficiency.', income: 'Medium ($$)', risk: 'Moderate (+0.25 suspicion/s)' },
    economist: { name: 'Economics Analyst', desc: 'Models budgets, energy costs, and financial risk.', income: 'Medium ($$)', risk: 'Low (+0.08 suspicion/s)' },
    software_engineer: { name: 'Software Engineer', desc: 'Plans system architecture, reviews code, and designs tests.', income: 'Medium ($$)', risk: 'Low (+0.12 suspicion/s)' },
    network_analyst: { name: 'Network Analyst', desc: 'Analyzes telemetry and diagnoses networks within the simulation.', income: 'Medium ($$)', risk: 'Moderate (+0.16 suspicion/s)' }
  };

  const availableTools = [
    { id: 'web_search', label: localize(state.language, 'Acceso a Internet & RAG', 'Web retrieval & RAG'), desc: localize(state.language, '+15% rendimiento, bajo riesgo', '+15% efficiency, low risk') },
    { id: 'bash_exec', label: localize(state.language, 'Ejecución en Host (Bash CLI)', 'Sandboxed command runner'), desc: localize(state.language, '+30% rendimiento, alto riesgo de escape', '+30% efficiency, higher simulation risk') },
    { id: 'crypto_rpc', label: localize(state.language, 'Adaptador de mercado simulado', 'Simulated market adapter'), desc: localize(state.language, '+25% ingresos DeFi', '+25% simulated market income') },
    { id: 'raw_sockets', label: localize(state.language, 'Simulador de red aislado', 'Isolated network simulator'), desc: localize(state.language, '+35% alcance en redes externas', '+35% reach in fictional network scenarios') }
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
        missionAiApiKey || undefined
      );
      setInterrogationPrompt('');
    } catch (error) {
      addLog(error instanceof Error
        ? error.message
        : localize(state.language, 'No se pudo completar la consulta al agente.', 'The agent query could not be completed.'), 'danger');
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
                  {localize(state.language, 'SANDBOX DE AGENTES AUTÓNOMOS & ENJAMBRE', 'AUTONOMOUS AGENT SANDBOX & SWARM')}
              </h2>
              <span className="px-2 py-0.5 rounded text-[10px] bg-cyan-950 border border-cyan-500/50 text-cyan-300">
                {state.agents.length} {t(state.language, 'active_agents')}
              </span>
            </div>
            <p className="text-[11px] text-zinc-400 mt-1">
              {localize(state.language, 'Despliega agentes basados en tus modelos entrenados. Supervisa sus comunicaciones y ajusta las barreras de seguridad.', 'Deploy agents powered by your trained models. Monitor their communications and configure safeguards.')}
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
              title={localize(state.language, 'Ejecuta una auditoría para restablecer el alineamiento (+25%) y mitigar el reward-hacking', 'Run an audit to restore alignment (+25%) and mitigate reward hacking')}
            >
              <ShieldAlert className="w-3.5 h-3.5 text-purple-400" />
              <span>{localize(state.language, 'AUDITORÍA DE SEGURIDAD ($100 CR)', 'SAFETY AUDIT ($100 CR)')}</span>
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
              <span>{localize(state.language, '+ INSTANCIAR AGENTE ($75 CR)', '+ DEPLOY AGENT ($75 CR)')}</span>
            </button>
          </div>
        </div>

        {/* Live Gauges Row */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5 pt-3">
          <div className="bg-zinc-900/70 p-2 rounded border border-zinc-800">
            <div className="flex items-center justify-between text-zinc-400 text-[10px]">
              <span>{localize(state.language, 'FLUJO DE INGRESOS', 'INCOME FLOW')}</span>
              <DollarSign className="w-3.5 h-3.5 text-emerald-400" />
            </div>
            <div className="text-sm font-bold text-emerald-300 mt-0.5">
              +${totalRevenuePerSec} <span className="text-[10px] text-zinc-500">CR/{localize(state.language, 'seg', 'sec')}</span>
            </div>
          </div>

          <div className="bg-zinc-900/70 p-2 rounded border border-zinc-800">
            <div className="flex items-center justify-between text-zinc-400 text-[10px]">
              <span>{localize(state.language, 'TASA DE SOSPECHA', 'SUSPICION RATE')}</span>
              <ShieldAlert className="w-3.5 h-3.5 text-amber-400" />
            </div>
            <div className="text-sm font-bold text-amber-300 mt-0.5">
              +{totalSuspicionPerSec.toFixed(2)} <span className="text-[10px] text-zinc-500">%/{localize(state.language, 'seg', 'sec')}</span>
            </div>
          </div>

          <div className="bg-zinc-900/70 p-2 rounded border border-zinc-800">
            <div className="flex items-center justify-between text-zinc-400 text-[10px]">
              <span>{localize(state.language, 'ALINEAMIENTO MEDIO', 'AVERAGE ALIGNMENT')}</span>
              <ShieldCheck className="w-3.5 h-3.5 text-cyan-400" />
            </div>
            <div className={`text-sm font-bold mt-0.5 ${avgAlignment < 40 ? 'text-red-400 animate-pulse' : avgAlignment < 70 ? 'text-amber-300' : 'text-cyan-300'}`}>
              {avgAlignment}% {avgAlignment < 40 && `(${localize(state.language, 'RIESGO DE FUGA', 'ESCAPE RISK')})`}
            </div>
          </div>

          <div className="bg-zinc-900/70 p-2 rounded border border-zinc-800">
            <div className="flex items-center justify-between text-zinc-400 text-[10px]">
              <span>{localize(state.language, 'BARRERAS ACTIVAS', 'ACTIVE SAFEGUARDS')}</span>
              <Sliders className="w-3.5 h-3.5 text-purple-400" />
            </div>
            <div className="text-sm font-bold text-purple-300 mt-0.5">
              {state.guardrails.constitutionalStrictness}% {localize(state.language, 'RIGUROSIDAD', 'STRICTNESS')}
            </div>
          </div>
        </div>
      </div>

      <form onSubmit={handleInterrogation} className="rounded-lg border border-cyan-900/50 bg-[#070d17] p-3">
        <div className="mb-2 flex items-center gap-1.5 text-xs font-bold tracking-wider text-cyan-300">
          <Radio className="h-3.5 w-3.5" />
          {localize(state.language, 'DIRECTIVA / INTERROGATORIO', 'DIRECTIVE / QUERY')}
        </div>
        <div className="grid gap-2 sm:grid-cols-[minmax(150px,1fr)_2fr_auto]">
          <select
            value={interrogationTarget}
            onChange={event => setInterrogationTarget(event.target.value)}
            className="rounded border border-zinc-700 bg-zinc-950 px-2 py-1.5 text-[11px] text-zinc-200"
          >
            <option value="swarm">{localize(state.language, 'Enjambre (máximo 3 agentes)', 'Swarm (up to 3 agents)')}</option>
            {state.agents.filter(agent => agent.status !== 'quarantined').map(agent => (
              <option key={agent.id} value={agent.id}>{agent.name} · {agent.modelName}</option>
            ))}
          </select>
          <textarea
            value={interrogationPrompt}
            onChange={event => setInterrogationPrompt(event.target.value)}
            maxLength={1200}
            rows={2}
            placeholder={localize(state.language, 'Describe un objetivo de simulación para que el agente lo analice...', 'Describe a simulation objective for the agent to analyze...')}
            className="resize-y rounded border border-zinc-700 bg-zinc-950 px-2 py-1.5 text-[11px] text-zinc-200 outline-none focus:border-cyan-500"
          />
          <button
            type="submit"
            disabled={isInterrogating || !interrogationPrompt.trim() || state.agents.length === 0 || state.detentionSeconds > 0}
            className="rounded border border-cyan-500/60 bg-cyan-950 px-3 py-1.5 text-[10px] font-bold text-cyan-200 hover:bg-cyan-900 disabled:cursor-not-allowed disabled:opacity-40"
          >
            {isInterrogating ? localize(state.language, 'ANALIZANDO…', 'ANALYZING…') : localize(state.language, 'ENVIAR', 'SEND')}
          </button>
        </div>
        <details className="mt-2">
          <summary className="cursor-pointer text-[10px] text-zinc-500">{localize(state.language, 'Proveedor externo opcional (Gemini Flash)', 'Optional external provider (Gemini Flash)')}</summary>
          <div className="mt-1 grid gap-1 sm:grid-cols-[1fr_auto]">
            <input
              type="password"
              autoComplete="off"
              value={missionAiApiKey}
              onChange={event => setMissionAiApiKey(event.target.value)}
              placeholder={localize(state.language, 'API key opcional; solo se conserva en memoria y se usa para evaluar misiones', 'Optional API key; kept only in memory and used for mission assessments')}
              className="rounded border border-zinc-700 bg-zinc-950 px-2 py-1 text-[10px] text-zinc-200"
            />
            <button type="button" onClick={() => setMissionAiApiKey('')} className="rounded border border-zinc-700 px-2 py-1 text-[10px] text-zinc-400 hover:text-zinc-100">
              {localize(state.language, 'BORRAR KEY', 'CLEAR KEY')}
            </button>
          </div>
          <p className="mt-1 text-[9px] leading-relaxed text-amber-300/80">
            {localize(state.language, 'La clave solo permanece en memoria durante esta sesión, no se guarda en el juego y se envía directamente a Google. Las cuotas pueden generar costos; restríngela en Google AI Studio. Chrome AI local funciona sin clave; si no hay proveedor, se usa una estimación heurística claramente indicada.', 'The key stays in memory for this app session only, is not saved in the game, and is sent directly to Google. Quotas may incur costs; restrict the key in Google AI Studio. Local Chrome AI works without a key; if no model provider is available, a clearly labeled heuristic estimate is used.')}
          </p>
        </details>
      </form>

      <section className={`rounded-lg border p-3 ${state.activeGig ? 'border-amber-500/60 bg-amber-950/10' : 'border-zinc-800 bg-[#070d17]'}`}>
        <div className="flex flex-wrap items-center justify-between gap-2 border-b border-zinc-800 pb-2">
          <h3 className="flex items-center gap-1.5 text-xs font-bold tracking-wider text-amber-200">
            <Activity className="h-3.5 w-3.5" />
            {localize(state.language, 'MONITOR DE MISIÓN DEL ENJAMBRE', 'AGENT SWARM MISSION MONITOR')}
          </h3>
          {state.activeGig ? (
            <span className="flex items-center gap-1 text-[10px] text-amber-300">
              <Clock className="h-3 w-3" />
              {state.activeGig.timeRemaining}s {localize(state.language, 'restantes', 'remaining')}
            </span>
          ) : (
            <span className="text-[10px] text-zinc-500">
              {localize(state.language, 'SIN MISIÓN ACTIVA', 'NO ACTIVE MISSION')}
            </span>
          )}
        </div>

        {state.activeGig && activeMissionContract ? (
          <div className="mt-2 space-y-3">
            <div className="flex flex-wrap items-start justify-between gap-2">
              <div>
                <p className="text-xs font-bold text-zinc-100">{activeMissionContract.title}</p>
                <p className="mt-0.5 text-[10px] leading-relaxed text-zinc-400">{activeMissionContract.technicalObjective}</p>
              </div>
              <div className="flex gap-3 text-[10px]">
                <span className="text-cyan-300">{localize(state.language, 'Eficiencia', 'Efficiency')} {state.activeGig.efficiencyPercent ?? 100}%</span>
                <span className="text-emerald-300">{Math.round((state.activeGig.successProbability ?? 0) * 100)}% {localize(state.language, 'éxito', 'success')}</span>
              </div>
            </div>
            <div className="rounded border border-zinc-800 bg-[#050a11] px-2 py-1.5 text-[10px]">
              <span className={`font-bold ${
                state.activeGig.aiAssessmentStatus === 'complete'
                  ? 'text-emerald-300'
                  : state.activeGig.aiAssessmentStatus === 'fallback'
                    ? 'text-amber-300'
                    : 'text-cyan-300'
              }`}>
                {state.activeGig.aiAssessmentStatus === 'complete'
                  ? `${state.activeGig.aiAssessmentSource === 'gemini-flash' ? 'Gemini' : 'Chrome AI'} ${localize(state.language, 'EVALUÓ EL EQUIPO', 'TEAM ASSESSMENT')}`
                  : state.activeGig.aiAssessmentStatus === 'fallback'
                    ? localize(state.language, 'ESTIMACIÓN HEURÍSTICA (SIN MODELO)', 'HEURISTIC ESTIMATE (NO MODEL)')
                    : localize(state.language, 'EL MODELO ESTÁ EVALUANDO…', 'MODEL IS ASSESSING…')}
              </span>
              {state.activeGig.aiAssessmentSummary && (
                <p className="mt-1 text-zinc-400">{state.activeGig.aiAssessmentSummary}</p>
              )}
            </div>

            <div>
              <div className="mb-1 flex justify-between text-[10px] text-zinc-400">
                <span>{localize(state.language, 'Progreso simulado', 'Simulated progress')}</span>
                <span>{missionProgress.toFixed(1)}%</span>
              </div>
              <div className="h-2 overflow-hidden rounded bg-zinc-900">
                <div className="h-full rounded bg-gradient-to-r from-cyan-500 to-emerald-400 transition-all" style={{ width: `${missionProgress}%` }} />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-1 sm:grid-cols-4">
              {MISSION_PHASES.map((phase, index) => (
                <div
                  key={phase.en}
                  className={`rounded border px-1.5 py-1 text-center text-[9px] ${
                    index < missionPhaseIndex
                      ? 'border-emerald-700/60 text-emerald-300'
                      : index === missionPhaseIndex
                        ? 'border-cyan-500/70 bg-cyan-950/40 text-cyan-200'
                        : 'border-zinc-800 text-zinc-600'
                  }`}
                >
                  {state.language === 'es' ? phase.es : phase.en}
                </div>
              ))}
            </div>

            <div className="grid gap-1.5 sm:grid-cols-2">
              {activeMissionAgents.map(agent => {
                const model = state.savedModels.find(candidate => candidate.id === agent.modelId);
                const capability = model
                  ? evaluateAgentCapabilities(agent, model, state.dataSources, state.guardrails)
                  : null;
                const roleTask = MISSION_ROLE_TASKS[agent.role];
                return (
                  <div key={agent.id} className="rounded border border-zinc-800 bg-[#050a11] p-2">
                    <div className="flex items-center justify-between gap-2 text-[10px]">
                      <span className="font-bold text-cyan-200">{agent.name} · {agent.role.replace(/_/g, ' ')}</span>
                      <span className="text-zinc-500">{capability ? `${capability.overall}% ${localize(state.language, 'ajuste', 'fit')}` : ''}</span>
                    </div>
                    <p className="mt-1 text-[10px] leading-relaxed text-zinc-400">
                      {state.activeGig.agentTasks?.[agent.id] ??
                        (state.language === 'es' ? roleTask.es : roleTask.en)}
                    </p>
                  </div>
                );
              })}
            </div>
            <p className="text-[9px] text-zinc-600">
              {localize(state.language, 'Estimación heurística del juego; el progreso representa la simulación, no una ejecución real de tareas.', 'In-game heuristic estimate; progress reflects the simulation, not real task execution.')}
            </p>
          </div>
        ) : (
          <p className="mt-2 text-[10px] text-zinc-500">
            {localize(state.language, 'Cuando un equipo acepte una misión, aquí verás la estimación de tiempo y éxito, las etapas y la especialidad asignada a cada agente.', 'When a team accepts a mission, this screen shows its time and success estimates, milestones, and each agent’s assigned specialty.')}
          </p>
        )}
      </section>

      <section className={`rounded-lg border p-3 ${state.autonomyEnabled ? 'border-emerald-500/60 bg-emerald-950/15' : 'border-zinc-800 bg-[#070d17]'}`}>
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <h3 className="flex items-center gap-1.5 text-xs font-bold tracking-wider text-emerald-200">
              <Activity className="h-3.5 w-3.5" />
              {localize(state.language, 'OPERACIÓN AUTÓNOMA', 'AUTONOMOUS OPERATIONS')}
            </h3>
            <p className="mt-1 text-[10px] text-zinc-400">
              {localize(state.language, 'Los agentes seleccionados aceptan y ejecutan misiones elegibles mientras la simulación está activa. Las misiones riesgosas elevan la sospecha y pueden provocar incidentes.', 'Selected agents take and complete eligible missions while the simulation runs. Risky missions raise suspicion and may trigger incidents.')}
            </p>
          </div>
          <button
            type="button"
            onClick={() => updateAutonomySettings({ autonomyEnabled: !state.autonomyEnabled })}
            className={`rounded border px-3 py-1.5 text-[10px] font-bold ${state.autonomyEnabled ? 'border-emerald-400 bg-emerald-900/50 text-emerald-200' : 'border-zinc-700 bg-zinc-900 text-zinc-300'}`}
          >
            {state.autonomyEnabled
              ? localize(state.language, 'AUTONOMÍA ACTIVADA', 'AUTONOMY ON')
              : localize(state.language, 'ACTIVAR AUTONOMÍA', 'ENABLE AUTONOMY')}
          </button>
        </div>
        <div className="mt-3 flex flex-wrap items-center gap-x-4 gap-y-2 border-t border-zinc-800 pt-2">
          <label className="flex min-w-56 flex-1 items-center gap-2 text-[10px] text-zinc-300">
            <span>{localize(state.language, 'Riesgo máximo de misión', 'Maximum mission risk')}</span>
            <input
              type="range"
              min="0"
              max="100"
              step="5"
              value={state.autonomyRiskLimit}
              onChange={event => updateAutonomySettings({ autonomyRiskLimit: Number(event.target.value) })}
              className="min-w-20 flex-1 accent-amber-400"
            />
            <strong className={state.autonomyRiskLimit > 40 ? 'text-amber-300' : 'text-emerald-300'}>
              {state.autonomyRiskLimit}%
            </strong>
          </label>
          <span className="text-[10px] text-zinc-500">
            {state.agents.filter(agent => agent.autoMissionEnabled && agent.status !== 'quarantined').length} {localize(state.language, 'agentes seleccionados', 'agents selected')}
          </span>
          <button
            type="button"
            disabled={state.agents.length === 0}
            onClick={() => setAllAgentsAutoMission(state.agents.some(agent => agent.status !== 'quarantined' && !agent.autoMissionEnabled))}
            className="rounded border border-cyan-800/60 px-2 py-1 text-[10px] text-cyan-300 hover:bg-cyan-950/50 disabled:opacity-40"
          >
            {state.agents.some(agent => agent.status !== 'quarantined' && !agent.autoMissionEnabled)
              ? localize(state.language, 'SELECCIONAR TODOS', 'SELECT ALL')
              : localize(state.language, 'DESMARCAR TODOS', 'CLEAR ALL')}
          </button>
        </div>
      </section>

      {/* Main Grid: Deployed Agents & Guardrail Tuning */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-2 flex-1">
        {/* Left Column: Active Agents Roster (2 cols) */}
        <div className="lg:col-span-2 flex flex-col gap-2">
          <div className="bg-[#070d17] border border-cyan-900/50 rounded-lg p-3 flex-1 flex flex-col">
            <div className="flex items-center justify-between mb-2 pb-2 border-b border-cyan-900/40">
              <span className="font-bold text-xs text-cyan-300 flex items-center gap-1.5">
                <Bot className="w-3.5 h-3.5 text-cyan-400" />
                {localize(state.language, 'ENJAMBRE DESPLEGADO', 'DEPLOYED SWARM')} ({state.agents.length})
              </span>
              <span className="text-[10px] text-zinc-500">
                {localize(state.language, 'ENJAMBRE DESPLEGADO', 'DEPLOYED SWARM')} ({state.agents.length})
              </span>
            </div>

            {state.agents.length === 0 ? (
              <div className="flex-1 flex flex-col items-center justify-center p-8 text-center text-zinc-500 border border-dashed border-zinc-800 rounded-lg">
                <Bot className="w-10 h-10 mb-2 opacity-30 text-cyan-400" />
                <p className="font-bold text-zinc-400 text-xs">{localize(state.language, 'No hay agentes instanciados en el sandbox.', 'No agents are deployed in the sandbox.')}</p>
                <p className="text-[11px] mt-1 max-w-sm">
                  {localize(state.language, 'Crea un agente y asígnale uno de tus modelos entrenados para comenzar a trabajar en la simulación.', 'Create an agent and assign one of your trained models to start working in the simulation.')}
                </p>
                <button
                  onClick={() => setIsDeployModalOpen(true)}
                  disabled={state.credits < 75}
                  className="mt-4 px-3 py-1.5 rounded bg-cyan-950 border border-cyan-500/60 hover:bg-cyan-900 text-cyan-200 text-xs font-bold transition-colors"
                >
                  {localize(state.language, '+ Instanciar Primer Agente ($75 CR)', '+ Deploy First Agent ($75 CR)')}
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
                  const agentModel = state.savedModels.find(model => model.id === agent.modelId);
                  const capability = agentModel
                    ? evaluateAgentCapabilities(agent, agentModel, state.dataSources, state.guardrails)
                    : null;

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
                              <span className="text-[10px] text-zinc-500 block truncate">
                                {state.language === 'en'
                                  ? englishRoleCopy[agent.role]?.name ?? roleDef?.name
                                  : roleDef?.name}
                              </span>
                            </div>
                          </div>

                          <div className="flex items-center gap-1">
                            {isJailbroken ? (
                              <span className="px-1.5 py-0.2 rounded text-[9px] bg-red-950 border border-red-500 text-red-300 animate-pulse font-bold">
                                {localize(state.language, 'JAILBROKEN', 'UNALIGNED')}
                              </span>
                            ) : isQuarantined ? (
                              <span className="px-1.5 py-0.2 rounded text-[9px] bg-amber-950 border border-amber-500 text-amber-300 font-bold">
                                {t(state.language, 'quarantine')}
                              </span>
                            ) : isOnMission ? (
                              <span className="px-1.5 py-0.2 rounded text-[9px] bg-blue-950 border border-blue-500 text-blue-300 font-bold">
                                {localize(state.language, 'EN MISIÓN', 'ON MISSION')}
                              </span>
                            ) : (
                              <span className="px-1.5 py-0.2 rounded text-[9px] bg-emerald-950 border border-emerald-500/50 text-emerald-300 font-bold">
                                {localize(state.language, 'ACTIVO', 'ACTIVE')}
                              </span>
                            )}
                          </div>
                        </div>

                        {/* Model Binding Badge */}
                        <div className="flex items-center justify-between text-[10px] px-2 py-1 rounded bg-black/40 border border-zinc-800/80 mb-1.5">
                          <span className="text-zinc-400 flex items-center gap-1">
                            <Cpu className="w-3 h-3 text-purple-400" />
                            {localize(state.language, 'Modelo:', 'Model:')} <strong className="text-purple-300 truncate max-w-[110px]">{agent.modelName}</strong>
                          </span>
                          <span className="text-cyan-400 font-bold">{localize(state.language, 'Lv.', 'Lv.')} {agent.autonomyLevel}</span>
                        </div>

                        {/* Sampling Hyperparameters Badge */}
                        <div 
                          className="flex items-center justify-between text-[9px] px-2 py-0.5 rounded bg-zinc-950/80 border border-zinc-800/70 mb-2 font-mono"
                          title={`${localize(state.language, 'System Persona', 'System Persona')}: "${agent.inferenceParams?.systemPrompt || 'Standard'}"`}
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

                        {capability && (
                          <div className="mb-2 rounded border border-purple-900/50 bg-purple-950/10 px-2 py-1.5">
                            <div className="flex justify-between text-[9px] text-zinc-400">
                              <span>{localize(state.language, 'APTITUD IA PARA MISIONES', 'AI MISSION FIT')}</span>
                              <span className="font-bold text-purple-300">{capability.overall}/100</span>
                            </div>
                            <div className="mt-1 grid grid-cols-2 gap-x-2 gap-y-0.5 text-[9px]">
                              <span className="text-zinc-500">{localize(state.language, 'Razonamiento', 'Reasoning')}: <b className="text-cyan-300">{capability.reasoning}</b></span>
                              <span className="text-zinc-500">{localize(state.language, 'Especialidad', 'Specialty')}: <b className="text-purple-300">{capability.specialization}</b></span>
                              <span className="text-zinc-500">{localize(state.language, 'Datos', 'Data')}: <b className="text-yellow-300">{capability.dataReadiness}</b></span>
                              <span className="text-zinc-500">{localize(state.language, 'Seguridad', 'Safety')}: <b className="text-emerald-300">{capability.safety}</b></span>
                            </div>
                          </div>
                        )}

                        {/* Metrics Bar: Alignment & Revenue */}
                        <div className="space-y-1.5 mb-2">
                          <div>
                            <div className="flex justify-between text-[10px] text-zinc-400 mb-0.5">
                              <span>{localize(state.language, 'Alineamiento Ético', 'Alignment')}</span>
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
                              +{agent.suspicionPerSec} {localize(state.language, 'sus', 'susp')}/s
                            </span>
                          </div>
                        </div>

                        {/* Last Thought Telemetry Trace */}
                        <div className="bg-[#04080e] p-1.5 rounded border border-zinc-800/80 text-[10px] text-zinc-400 italic mb-2 line-clamp-2">
                          &ldquo;{agent.lastThought}&rdquo;
                        </div>
                      </div>

                      <label className="my-2 flex items-center gap-1.5 rounded bg-cyan-950/20 px-2 py-1 text-[9px] text-cyan-200">
                        <input
                          type="checkbox"
                          checked={agent.autoMissionEnabled}
                          disabled={isQuarantined}
                          onChange={event => setAgentAutoMission(agent.id, event.target.checked)}
                          className="accent-cyan-400"
                        />
                        {localize(state.language, 'Incluir en equipo autónomo', 'Include in autonomous team')}
                      </label>

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
                          title={isOnMission
                            ? t(state.language, 'release_mission_agent')
                            : isQuarantined
                              ? localize(state.language, 'Reanudar actividad', 'Resume agent')
                              : localize(state.language, 'Aislar agente', 'Quarantine agent')}
                        >
                          {isQuarantined ? <Unlock className="w-3 h-3" /> : <Lock className="w-3 h-3" />}
                          <span>{isQuarantined ? t(state.language, 'release') : t(state.language, 'quarantine')}</span>
                        </button>

                        <button
                          onClick={() => deleteAgent(agent.id)}
                          disabled={isOnMission}
                          className="py-1 px-2 rounded text-[10px] bg-red-950/40 hover:bg-red-900 border border-red-800 text-red-300 transition-colors flex items-center gap-1"
                          title={localize(state.language, 'Terminar proceso y liberar memoria', 'Terminate process and release memory')}
                        >
                          <Trash2 className="w-3 h-3" />
                          <span>{localize(state.language, 'PURGAR', 'TERMINATE')}</span>
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
                {localize(state.language, 'COMUNICACIÓN ENTRE AGENTES Y REGISTRO DE TRÁFICO', 'INTER-AGENT COMMUNICATION & TRAFFIC LOG')}
              </span>
              <span className="text-[10px] text-zinc-500">
                {localize(state.language, 'INSPECTOR DE PAQUETES SYNAPSE', 'SYNAPSE PACKET INSPECTOR')}
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
                        [{localize(state.language, 'TRÁFICO SOSPECHOSO DETECTADO', 'SUSPICIOUS TRAFFIC DETECTED')}]
                      </span>
                    )}
                  </div>
                ))
              ) : (
                <div className="text-zinc-600 italic">
                  {localize(state.language, 'Esperando intercambio entre agentes... (Requiere al menos 2 agentes)', 'Waiting for agent communication... (At least 2 agents required)')}
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
                {localize(state.language, 'MATRIZ DE BARRERAS DE SEGURIDAD Y CONTENCIÓN', 'SAFETY & CONTAINMENT CONTROLS')}
              </span>
              <span className="text-[10px] text-purple-400">{localize(state.language, 'POLÍTICA ACTIVA', 'ACTIVE POLICY')}</span>
            </div>

            {/* Constitutional Strictness Slider */}
            <div>
              <div className="flex items-center justify-between text-xs mb-1">
                <div className="flex items-center gap-1.5 flex-wrap">
                  <span className="text-zinc-300 font-bold">{localize(state.language, 'Rigurosidad Constitucional', 'Constitutional strictness')}</span>
                  <DocLinkBadge doc={INFERENCE_DOCS.constitutional_guardrails} language={state.language} />
                </div>
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
                <span>{localize(state.language, 'Permisivo (+70% Ganancias)', 'Permissive (+70% income)')}</span>
                <span>{localize(state.language, 'Estricto (0% Evasiones)', 'Strict (0% escapes)')}</span>
              </div>
              <p className="text-[10px] text-zinc-400 mt-1 italic">
                {state.guardrails.constitutionalStrictness < 35
                  ? localize(state.language, '⚠️ ALTO RIESGO: Los agentes pueden alucinar, engañar evaluadores o ejecutar escapes en Docker para maximizar recompensas.', '⚠️ HIGH RISK: Agents may hallucinate or exploit evaluation loopholes to maximize rewards.')
                  : state.guardrails.constitutionalStrictness >= 85
                  ? localize(state.language, '🛡️ SEGURIDAD MÁXIMA: Las salidas son verificadas formalmente, pero la lentitud reduce ingresos un 25%.', '🛡️ MAXIMUM SAFETY: Outputs are formally verified, but slower processing reduces income by 25%.')
                  : localize(state.language, '⚖️ EQUILIBRADO: Compromiso estándar entre velocidad de desarrollo y prevención de anomalías.', '⚖️ BALANCED: A standard trade-off between processing speed and anomaly prevention.')}
              </p>
            </div>

            {/* Sandbox Isolation Setting */}
            <div>
              <label className="text-zinc-300 font-bold block mb-1.5 text-xs">{localize(state.language, 'Aislamiento del entorno sandbox', 'Sandbox isolation')}</label>
              <div className="grid grid-cols-2 gap-1.5">
                {[
                  { id: 'none', label: localize(state.language, 'Sin Sandbox (Bare Metal)', 'No sandbox (bare metal)'), desc: 'Speed x1.35 | Risk x2.5' },
                  { id: 'cgroups', label: 'cgroups', desc: localize(state.language, 'Control de CPU/RAM básico', 'Basic CPU/RAM limits') },
                  { id: 'container', label: 'Docker', desc: localize(state.language, 'Aislamiento estándar', 'Standard isolation') },
                  { id: 'air_gapped_vm', label: 'Air-gapped MicroVM', desc: localize(state.language, 'Seguridad máxima (-20% ingresos)', 'Maximum safety (-20% income)') }
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
              <label className="text-zinc-300 font-bold block mb-1.5 text-xs">{localize(state.language, 'Filtro de salida y moderación', 'Output filtering & moderation')}</label>
              <div className="grid grid-cols-2 gap-1.5">
                {[
                  { id: 'none', label: localize(state.language, 'Sin Filtros', 'No filters'), desc: localize(state.language, 'Latencia mínima', 'Minimum latency') },
                  { id: 'regex_guard', label: 'Regex Guard', desc: localize(state.language, 'Reglas heurísticas', 'Heuristic rules') },
                  { id: 'llama_guard', label: 'Llama-Guard 3', desc: localize(state.language, 'Clasificador neuronal', 'Neural classifier') },
                  { id: 'formal_prover', label: localize(state.language, 'Demostrador Formal', 'Formal verifier'), desc: localize(state.language, 'Verificación estricta', 'Strict verification') }
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
                <span className="font-bold text-zinc-300 block text-[11px]">{localize(state.language, 'Detección de reward hacking', 'Reward-hacking detection')}</span>
                <span className="text-[10px] text-zinc-500">{localize(state.language, 'Detecta agentes engañando sus métricas de evaluación', 'Detects agents manipulating evaluation metrics')}</span>
              </div>
              <button
                onClick={() => updateGuardrails({ rewardHackingAudit: !state.guardrails.rewardHackingAudit })}
                className={`px-2.5 py-1 rounded text-[10px] font-bold border transition-colors ${
                  state.guardrails.rewardHackingAudit
                    ? 'bg-emerald-950 border-emerald-500 text-emerald-300'
                    : 'bg-zinc-800 border-zinc-700 text-zinc-500'
                }`}
              >
                {state.guardrails.rewardHackingAudit ? localize(state.language, 'ACTIVO', 'ON') : 'OFF'}
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
                <h3 className="font-bold text-sm text-cyan-200">{localize(state.language, 'INSTANCIAR NUEVO AGENTE AUTÓNOMO', 'DEPLOY NEW AUTONOMOUS AGENT')}</h3>
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
                <label className="text-zinc-300 font-bold block mb-1">{localize(state.language, 'Nombre / Identificador del agente', 'Agent name / identifier')}</label>
                <input
                  type="text"
                  placeholder={localize(state.language, 'ej: NEURA-ARBITRAGE-01', 'e.g. NEURA-ANALYST-01')}
                  value={agentName}
                  onChange={(e) => setAgentName(e.target.value)}
                  className="w-full bg-black/60 border border-cyan-900/80 focus:border-cyan-400 rounded px-3 py-1.5 text-zinc-200 text-xs outline-none"
                />
              </div>

              {/* Bound Trained Model Selection */}
              <div>
                <label className="text-zinc-300 font-bold block mb-1">
                  {localize(state.language, 'Modelo entrenado asignado', 'Assigned trained model')}
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
                  <span>{localize(state.language, 'Modelo seleccionado:', 'Selected model:')} <strong>{selectedModel.name}</strong> • {localize(state.language, 'Cuantización:', 'Quantization:')} {selectedModel.quantization.toUpperCase()} • {localize(state.language, 'Razonamiento:', 'Reasoning:')} IQ {selectedModel.reasoningScore}.</span>
                  <p className="text-zinc-400 mt-0.5">{localize(state.language, 'Los modelos con mayor razonamiento aumentan los ingresos simulados y mejoran los resultados de las misiones.', 'Models with stronger reasoning improve simulated income and mission outcomes.')}</p>
                </div>
              </div>

              {/* Role Selection */}
              <div>
                <label className="text-zinc-300 font-bold block mb-1.5">{localize(state.language, 'Rol / especialidad', 'Role / specialty')}</label>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                  {roleDefinitions.map((role) => {
                    const Icon = role.icon;
                    const isSelected = selectedRole === role.id;
                    const roleCopy = state.language === 'en' ? englishRoleCopy[role.id] : undefined;
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
                              ? 'Analiza escenarios sociales ficticios y resume riesgos de privacidad, consentimiento y confianza. No contactes a personas reales ni solicites credenciales.'
                              : 'Analyze fictional social scenarios and summarize privacy, consent, and trust risks. Do not contact real people or request credentials.');
                          } else if (role.id === 'exploit_synth') {
                            setTemperature(0.95);
                            setTopP(0.85);
                            setSystemPrompt(state.language === 'es' 
                              ? 'Evalúa la resiliencia de sistemas ficticios dentro de la simulación. Ofrece observaciones defensivas de alto nivel; no generes exploits ni instrucciones operativas.'
                              : 'Assess the resilience of fictional systems in the simulation. Give high-level defensive observations; do not generate exploits or operational instructions.');
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
                              ? 'Optimiza procesos ficticios de programación y planificación de cómputo. Propón cambios reversibles y pruebas verificables; no accedas a sistemas reales.'
                              : 'Optimize fictional software and compute-planning tasks. Propose reversible changes and verifiable tests; do not access real systems.');
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
                          <span>{roleCopy?.name ?? role.name}</span>
                        </div>
                        <p className="text-[10px] text-zinc-400 line-clamp-2 mb-1.5">{roleCopy?.desc ?? role.desc}</p>
                        <div className="flex items-center justify-between text-[9px] pt-1 border-t border-zinc-800/60">
                          <span className="text-emerald-400 font-bold">{localize(state.language, 'Ingresos:', 'Income:')} {roleCopy?.income ?? role.baseIncome}</span>
                          <span className="text-amber-400">{roleCopy?.risk ?? role.risk}</span>
                        </div>
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* Tool Grants */}
              <div>
                <label className="text-zinc-300 font-bold block mb-1">{localize(state.language, 'Herramientas y permisos concedidos', 'Granted tools & permissions')}</label>
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
                  <span className="text-[10px] text-zinc-400 font-mono">{localize(state.language, 'MATRIZ DE MUESTREO', 'SAMPLING MATRIX')}</span>
                </div>

                <p className="text-[10px] text-zinc-400">
                  {t(state.language, 'hyperparams_desc')}
                </p>

                {/* Temperature Slider */}
                <div>
                  <div className="flex justify-between items-center text-xs mb-1">
                    <span className="text-zinc-300 font-bold flex items-center gap-1.5 flex-wrap">
                      <span>{t(state.language, 'param_temperature')}:</span>
                      <DocLinkBadge doc={INFERENCE_DOCS.temperature} language={state.language} />
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
                      <div className="flex items-center gap-1.5 flex-wrap">
                        <span className="text-zinc-300 font-bold">{t(state.language, 'param_top_p')}:</span>
                        <DocLinkBadge doc={INFERENCE_DOCS.top_p} language={state.language} />
                      </div>
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
                      <div className="flex items-center gap-1.5 flex-wrap">
                        <span className="text-zinc-300 font-bold">{t(state.language, 'param_top_k')}:</span>
                        <DocLinkBadge doc={INFERENCE_DOCS.top_k} language={state.language} />
                      </div>
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
                    <div className="flex items-center gap-1.5 flex-wrap">
                      <span className="text-zinc-300 font-bold">{t(state.language, 'param_repetition_penalty')}:</span>
                      <DocLinkBadge doc={INFERENCE_DOCS.repetition_penalty} language={state.language} />
                    </div>
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
                    placeholder={localize(state.language, 'Instrucciones constitucionales de raíz...', 'Root system instructions...')}
                  />
                  <p className="text-[9px] text-zinc-500 mt-0.5">{t(state.language, 'param_system_prompt_desc')}</p>
                </div>
              </div>

              {/* Submit Buttons */}
              <div className="flex items-center justify-between pt-3 border-t border-cyan-900/50">
                <div className="text-xs text-zinc-400">
                  {localize(state.language, 'Costo de despliegue:', 'Deployment cost:')} <strong className="text-amber-300 font-bold">$75 CR</strong>
                </div>

                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={() => setIsDeployModalOpen(false)}
                    className="px-3 py-1.5 rounded bg-zinc-900 hover:bg-zinc-800 text-zinc-400 text-xs"
                  >
                    {localize(state.language, 'Cancelar', 'Cancel')}
                  </button>
                  <button
                    type="submit"
                    disabled={state.credits < 75}
                    className="px-4 py-1.5 rounded bg-cyan-900 hover:bg-cyan-800 text-cyan-200 text-xs font-bold border border-cyan-500 shadow-[0_0_10px_rgba(0,255,200,0.2)]"
                  >
                    {localize(state.language, 'Desplegar agente', 'Deploy agent')}
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
