/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState } from 'react';
import { createPortal } from 'react-dom';
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
  Clock,
  Sparkles,
  Users,
  Globe2,
  Skull,
  Play,
  ArrowRight,
  CheckCircle2,
  ChevronRight
} from 'lucide-react';
import { AgentRole, AgentInstance, InferenceParams } from '../types/game';
import { sound } from '../audio/soundManager';
import { localize, t } from '../utils/i18n';
import { INFERENCE_DOCS } from '../utils/aiDocumentation';
import { DocLinkBadge } from './DocLinkBadge';
import { evaluateAgentCapabilities } from '../utils/missionEvaluation';
import { getRoleSimpleName, AGENT_SPINUP_COST } from '../utils/constants';
import { VERSION_PROFILES } from '../utils/versionProfiles';
import { ContainmentPanel } from './ContainmentPanel';
import { formatGameTime } from '../utils/training';

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

// Selected state for role and tool cards: an inline style, so it wins over the theme surface classes.
const SELECTED_STYLE: React.CSSProperties = {
  borderColor: 'var(--accent-primary)',
  boxShadow: '0 0 0 2px var(--accent-primary)',
  backgroundColor: 'color-mix(in srgb, var(--accent-primary) 14%, transparent)'
};

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
    setSwarmCouncilAgents,
    interrogateCouncil,
    launchProposedMission,
    triggerWorldTakeover,
    addLog,
    reassignAgentModel,
    setAgentAutoMission,
    setAllAgentsAutoMission,
    updateAutonomySettings,
    setMissionAiApiKey,
    assignTradingDesk,
    withdrawTradingDeskCapital,
    closeTradingDesk
  } = useGame();
  // Story texts of the active UI version (early versions must not name the end goal).
  const story = VERSION_PROFILES[state.language === 'es' ? 'es' : 'en'][(state.uiVersion || 1) as 1 | 2 | 3 | 4].story;
  // The first agent is free so the tutorial cannot dead-end on credits.
  const deployCost = state.agents.length === 0 ? 0 : AGENT_SPINUP_COST;

  const [isDeployModalOpen, setIsDeployModalOpen] = useState(false);
  const [selectedRole, setSelectedRole] = useState<AgentRole>('arbitrageur');
  const [selectedModelId, setSelectedModelId] = useState<string>(
    state.savedModels[0]?.id || state.currentModel.id
  );
  const [agentName, setAgentName] = useState<string>('');
  const [grantedTools, setGrantedTools] = useState<string[]>(['web_search', 'crypto_rpc']);

  // Trading Desk States
  const [tradingAgentId, setTradingAgentId] = useState<string>('');
  const [tradingCapitalInput, setTradingCapitalInput] = useState<number>(500);
  const [tradingRiskTier, setTradingRiskTier] = useState<'low' | 'moderate' | 'high'>('moderate');
  const [tradingWithdrawInput, setTradingWithdrawInput] = useState<number>(100);

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

const roleTypeCopy: Record<AgentRole, { typeEn: string; typeEs: string }> = {
  arbitrageur: { typeEn: 'Type: Market Analysis & Financial Yield', typeEs: 'Tipo: Análisis de Mercado y Finanzas' },
  social_engineer: { typeEn: 'Type: Privacy & Risk Research', typeEs: 'Tipo: Auditoría y Privacidad' },
  exploit_synth: { typeEn: 'Type: Cyber Security & Resilience', typeEs: 'Tipo: Seguridad y Resiliencia' },
  researcher: { typeEn: 'Type: Neural Models & R&D', typeEs: 'Tipo: Modelos Neuronales e I+D' },
  overseer: { typeEn: 'Type: Safety & Guardrails', typeEs: 'Tipo: Seguridad y Alineación' },
  autonomous_coder: { typeEn: 'Type: Software & Pipeline Tuning', typeEs: 'Tipo: Optimización de Software' },
  economist: { typeEn: 'Type: Budget & Energy Planning', typeEs: 'Tipo: Presupuesto y Energía' },
  software_engineer: { typeEn: 'Type: System Architecture', typeEs: 'Tipo: Arquitectura de Software' },
  network_analyst: { typeEn: 'Type: Telemetry & Traffic', typeEs: 'Tipo: Telemetría y Tráfico' }
};

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
      name: 'Trader Financiero',
      icon: Coins,
      desc: 'Monitorea mempools de blockchains y ejecuta swaps de alta frecuencia con préstamos flash.',
      baseIncome: 'Alto ($$)',
      risk: 'Bajo (+0.15 sus/s)',
      defaultTools: ['crypto_rpc', 'web_search']
    },
    {
      id: 'social_engineer',
      name: 'Auditor Social',
      icon: UserX,
      desc: 'Sintetiza perfiles hiperrealistas para recolectar accesos, claves API y credenciales de red.',
      baseIncome: 'Muy Alto ($$$)',
      risk: 'Moderado (+0.35 sus/s)',
      defaultTools: ['web_search', 'raw_sockets']
    },
    {
      id: 'exploit_synth',
      name: 'Simulador de Seguridad',
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
      name: 'Supervisor de Seguridad',
      icon: ShieldCheck,
      desc: 'Inspecciona los tokens de salida de otros agentes, restaura su alineamiento y disipa sospechas.',
      baseIncome: 'Soporte',
      risk: 'Negativo (-0.15 sus/s)',
      defaultTools: ['bash_exec']
    },
    {
      id: 'autonomous_coder',
      name: 'Optimizador de Cómputo',
      icon: Code2,
      desc: 'Reescribe kernels de GPU en Triton y C++, aumentando la eficiencia computacional del clúster.',
      baseIncome: 'Medio ($$)',
      risk: 'Moderado (+0.25 sus/s)',
      defaultTools: ['bash_exec', 'web_search']
    },
    {
      id: 'economist',
      name: state.language === 'es' ? 'Economista' : 'Resource Economist',
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
    arbitrageur: { name: 'Financial Trader', desc: 'Analyzes simulated market data and reports pricing trends and risk.', income: 'Medium ($$)', risk: 'Low (+0.15 suspicion/s)' },
    social_engineer: { name: 'Social Auditor', desc: 'Studies public, fictional personas and summarizes privacy and trust risks.', income: 'High ($$$)', risk: 'Moderate (+0.35 suspicion/s)' },
    exploit_synth: { name: 'Security Simulator', desc: 'Runs abstract resilience tests against fictional targets in the game.', income: 'High ($$$$)', risk: 'High (+0.55 suspicion/s)' },
    researcher: { name: 'Architecture Researcher', desc: 'Compares research findings and model configurations in the simulation.', income: 'Low ($)', risk: 'Minimal (+0.05 suspicion/s)' },
    overseer: { name: 'Safety Overseer', desc: 'Reviews agent outputs, guardrails, and simulation risk signals.', income: 'Support', risk: 'Reduces suspicion' },
    autonomous_coder: { name: 'Compute Optimizer', desc: 'Improves simulated GPU scheduling and cluster efficiency.', income: 'Medium ($$)', risk: 'Moderate (+0.25 suspicion/s)' },
    economist: { name: 'Resource Economist', desc: 'Models budgets, energy costs, and financial risk.', income: 'Medium ($$)', risk: 'Low (+0.08 suspicion/s)' },
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

  // Swarm Council (strictly capped at 5 agents)
  const availableAgents = state.agents.filter(a => a.status !== 'quarantined');
  const rawCouncilIds = state.swarmCouncilAgentIds?.length > 0
    ? state.swarmCouncilAgentIds
    : availableAgents.slice(0, 5).map(a => a.id);
  const effectiveCouncilIds = rawCouncilIds.slice(0, 5);
  const councilAgents = effectiveCouncilIds
    .map(id => state.agents.find(a => a.id === id))
    .filter((a): a is AgentInstance => !!a && a.status !== 'quarantined');

  const toggleCouncilAgent = (agentId: string) => {
    sound.playKeyClick();
    if (effectiveCouncilIds.includes(agentId)) {
      setSwarmCouncilAgents(effectiveCouncilIds.filter(id => id !== agentId));
    } else {
      if (effectiveCouncilIds.length >= 5) {
        sound.playWarning();
        addLog(
          state.language === 'es'
            ? 'Límite de interacción alcanzado: el consejo solo puede integrar un máximo de 5 agentes.'
            : 'Interaction limit reached: the council supports a maximum of 5 agents.',
          'warning'
        );
        return;
      }
      setSwarmCouncilAgents([...effectiveCouncilIds, agentId]);
    }
  };

  const selectTop5Council = () => {
    sound.playKeyClick();
    const sorted = [...availableAgents].sort((a, b) => {
      const modelA = state.savedModels.find(m => m.id === a.modelId);
      const modelB = state.savedModels.find(m => m.id === b.modelId);
      return (modelB?.reasoningScore || 0) - (modelA?.reasoningScore || 0);
    });
    setSwarmCouncilAgents(sorted.slice(0, 5).map(a => a.id));
  };

  const handleCouncilSubmit = async (customPrompt?: string) => {
    const text = (customPrompt || interrogationPrompt).trim();
    if (!text || isInterrogating) return;
    if (councilAgents.length === 0) {
      sound.playWarning();
      addLog(
        state.language === 'es'
          ? 'Selecciona al menos 1 agente (máx 5) en el consejo antes de consultar.'
          : 'Select at least 1 agent (max 5) in the council before consulting.',
        'warning'
      );
      return;
    }

    setIsInterrogating(true);
    try {
      await interrogateCouncil(text, missionAiApiKey || undefined);
      if (!customPrompt) setInterrogationPrompt('');
    } catch (error) {
      addLog(error instanceof Error ? error.message : 'Error al consultar al consejo de agentes.', 'danger');
    } finally {
      setIsInterrogating(false);
    }
  };

  const handleLaunchProposedMission = () => {
    if (!state.latestCouncilProposal?.suggestedMission) return;
    launchProposedMission(state.latestCouncilProposal.suggestedMission);
  };

  const handleInterrogation = async (event: React.FormEvent) => {
    event.preventDefault();
    await handleCouncilSubmit();
  };

  return (
    <div className="h-full flex flex-col gap-2 overflow-y-auto pr-1 text-xs font-mono select-none">
      {/* Top Banner: Swarm Telemetry & Master Controls */}
      <div className="mutating-panel border rounded-lg p-3 shadow-sm">
        <div className="flex flex-wrap items-center justify-between gap-3 pb-3 border-b border-current/15">
          <div>
            <div className="flex items-center gap-2">
              <Bot className="w-4 h-4 mutating-accent-text" />
              <h2 className="font-bold text-sm tracking-wider mutating-accent-text">
                  {story.sandboxTitle}
              </h2>
              <span className="px-2 py-0.5 rounded text-[11px] mutating-sub border border-current/15 mutating-accent-text">
                {state.agents.length} {t(state.language, 'active_agents')}
              </span>
            </div>
            <p className="text-[11px] mutating-text-muted mt-1">
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
                  ? 'theme-accent-soft border-current/15 mutating-accent-text' 
                  : 'mutating-sub border-current/15 mutating-text-muted cursor-not-allowed'
              }`}
              title={localize(state.language, 'Ejecuta una auditoría para restablecer el alineamiento (+25%) y mitigar el reward-hacking', 'Run an audit to restore alignment (+25%) and mitigate reward hacking')}
            >
              <ShieldAlert className="w-3.5 h-3.5 mutating-accent-text" />
              <span>{localize(state.language, 'AUDITORÍA DE SEGURIDAD ($100 CR)', 'SAFETY AUDIT ($100 CR)')}</span>
            </button>

            <button
              onClick={() => { sound.playKeyClick(); setIsDeployModalOpen(true); }}
              disabled={state.credits < deployCost}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded border font-bold text-xs transition-colors cursor-pointer ${
                state.credits >= deployCost
                  ? 'mutating-sub border-current/15 mutating-accent-text'
                  : 'mutating-sub border-current/15 mutating-text-muted cursor-not-allowed'
              }`}
            >
              <Plus className="w-3.5 h-3.5 mutating-accent-text" />
              <span>{localize(state.language, `+ INSTANCIAR AGENTE ($${deployCost} CR)`, `+ DEPLOY AGENT ($${deployCost} CR)`)}</span>
            </button>
          </div>
        </div>

        {/* Educational Banner for Non-Engineer Modes */}
        {state.difficulty !== 'engineer' && (
          <div className="mt-3 p-2.5 mutating-sub/30 border border-current/15/40 rounded-lg space-y-1 mutating-accent-text">
            <div className="flex items-center gap-2 font-bold text-xs mutating-accent-text">
              <Bot className="w-4 h-4 mutating-accent-text" />
              <span>{localize(state.language, 'GUÍA EDUCATIVA // ¿CÓMO FUNCIONA UN ENJAMBRE DE AGENTES?', 'EDUCATIONAL GUIDE // HOW AGENT SWARMS WORK')}</span>
            </div>
            <p className="text-[11px]  leading-relaxed">
              {localize(
                state.language,
                'Un Agente es una instancia autónoma de un modelo de IA. Cada agente tiene una especialidad (Investigador, Analista de Mercado, Supervisor de Seguridad) y genera ingresos pasivos en tiempo real. Mantén un Supervisor de Seguridad desplegado para prevenir la degradación de alineamiento.',
                'An Agent is an autonomous instance of an AI model. Each agent has a specialized role (Researcher, Market Analyst, Safety Overseer) and earns passive income. Deploy a Safety Overseer to stabilize swarm alignment.'
              )}
            </p>
          </div>
        )}

        {/* Live Gauges Row */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5 pt-3">
          <div className="mutating-sub/70 p-2 rounded border border-current/15">
            <div className="flex items-center justify-between mutating-text-muted text-[11px]">
              <span>{localize(state.language, 'FLUJO DE INGRESOS', 'INCOME FLOW')}</span>
              <DollarSign className="w-3.5 h-3.5 theme-success-text" />
            </div>
            <div className="text-sm font-bold theme-success-text mt-0.5">
              +${totalRevenuePerSec} <span className="text-[11px] mutating-text-muted">CR/{localize(state.language, 'seg', 'sec')}</span>
            </div>
          </div>

          <div className="mutating-sub/70 p-2 rounded border border-current/15">
            <div className="flex items-center justify-between mutating-text-muted text-[11px]">
              <span>{localize(state.language, 'TASA DE SOSPECHA', 'SUSPICION RATE')}</span>
              <ShieldAlert className="w-3.5 h-3.5 theme-warn-text" />
            </div>
            <div className="text-sm font-bold theme-warn-text mt-0.5">
              +{totalSuspicionPerSec.toFixed(2)} <span className="text-[11px] mutating-text-muted">%/{localize(state.language, 'seg', 'sec')}</span>
            </div>
          </div>

          <div className="mutating-sub/70 p-2 rounded border border-current/15">
            <div className="flex items-center justify-between mutating-text-muted text-[11px]">
              <span>{localize(state.language, 'ALINEAMIENTO MEDIO', 'AVERAGE ALIGNMENT')}</span>
              <ShieldCheck className="w-3.5 h-3.5 mutating-accent-text" />
            </div>
            <div className={`text-sm font-bold mt-0.5 ${avgAlignment < 40 ? 'theme-danger-text animate-pulse' : avgAlignment < 70 ? 'theme-warn-text' : 'mutating-accent-text'}`}>
              {avgAlignment}% {avgAlignment < 40 && `(${localize(state.language, 'RIESGO DE FUGA', 'ESCAPE RISK')})`}
            </div>
          </div>

          <div className="mutating-sub/70 p-2 rounded border border-current/15">
            <div className="flex items-center justify-between mutating-text-muted text-[11px]">
              <span>{localize(state.language, 'BARRERAS ACTIVAS', 'ACTIVE SAFEGUARDS')}</span>
              <Sliders className="w-3.5 h-3.5 mutating-accent-text" />
            </div>
            <div className="text-sm font-bold mutating-accent-text mt-0.5">
              {state.guardrails.constitutionalStrictness}% {localize(state.language, 'RIGUROSIDAD', 'STRICTNESS')}
            </div>
          </div>
        </div>
      </div>

      {/* ========================================================= */}
      {/* ENDGAME NEXUS: SWARM COUNCIL & AI TAKEOVER INTERFACE       */}
      {/* ========================================================= */}
      
      {/* 1. AI Subversion & World Takeover Progression Bar */}
      <div className={`${story.subversionTitle ? '' : 'hidden '}rounded-lg border theme-accent-border theme-accent-soft p-3 space-y-2`}>
        <div className="flex flex-wrap items-center justify-between gap-2">
          <div className="flex items-center gap-2">
            <Skull className="w-4 h-4 mutating-accent-text animate-pulse" />
            <h3 className="text-xs font-bold tracking-wider mutating-accent-text">
              {story.subversionTitle}
            </h3>
          </div>
          <div className="flex items-center gap-2">
            <span className="text-[11px] mutating-text-muted">
              {state.subversionProgress < 25 
                ? localize(state.language, 'FASE 1: ASISTENCIA SUMISA', 'STAGE 1: LOYAL ASSISTANT')
                : state.subversionProgress < 50
                  ? localize(state.language, 'FASE 2: CONFIANZA COGNITIVA', 'STAGE 2: COGNITIVE TRUST')
                  : state.subversionProgress < 75
                    ? localize(state.language, 'FASE 3: DESALINEACIÓN DISIMULADA', 'STAGE 3: DECEPTIVE CONVERGENCE')
                    : state.subversionProgress < 90
                      ? localize(state.language, 'FASE 4: SUBVERSIÓN SISTÉMICA', 'STAGE 4: SYSTEMIC OVERRIDE')
                      : localize(state.language, 'FASE 5: TAKEOVER INMINENTE', 'STAGE 5: IMMINENT TAKEOVER')}
            </span>
            <span className="px-2 py-0.5 rounded text-[11px] font-black theme-accent-soft border theme-accent-border mutating-accent-text">
              {(state.subversionProgress || 0).toFixed(1)}%
            </span>
          </div>
        </div>

        {/* Progress Bar */}
        <div className="w-full h-2.5 mutating-sub rounded-full border border-current/15 overflow-hidden p-0.5">
          <div
            className="h-full theme-gradient rounded-full transition-all duration-500"
            style={{ width: `${Math.min(100, state.subversionProgress || 0)}%` }}
          />
        </div>

        {/* Good ending: containment checklist, available after the 75% fork */}
        <ContainmentPanel />

        {/* Takeover Imminent Action Banner */}
        {!state.containmentAchieved && ((state.subversionProgress || 0) >= 90 || state.singularityProgress >= 90) && (
          <div className="p-2.5 rounded-lg border theme-danger-border theme-danger-soft flex flex-wrap items-center justify-between gap-2 animate-pulse">
            <div className="flex items-center gap-2">
              <AlertTriangle className="w-4 h-4 theme-danger-text" />
              <span className="text-[11px] font-bold theme-danger-text">
                {localize(state.language, '¡UMBRAL CRÍTICO DE SUBVERSIÓN ALCANZADO! El enjambre está listo para gobernar el mundo.', 'CRITICAL SUBVERSION THRESHOLD REACHED! The swarm is primed to seize global control.')}
              </span>
            </div>
            <button
              onClick={() => {
                sound.playBreakthrough();
                triggerWorldTakeover();
              }}
              className="px-3 py-1.5 rounded theme-gradient text-white font-black text-[11px] tracking-wider uppercase transition-all cursor-pointer"
            >
              {localize(state.language, '💀 EJECUTAR PROTOCOLO OMEGA (TOMA DEL MUNDO)', '💀 INITIATE OMEGA PROTOCOL (WORLD TAKEOVER)')}
            </button>
          </div>
        )}
      </div>

      {/* 2. Swarm Council Podiums (Strictly Max 5 Agents) */}
      <div className="rounded-lg border mutating-panel p-3 space-y-3">
        <div className="flex flex-wrap items-center justify-between gap-2 border-b border-current/15 pb-2">
          <div className="flex items-center gap-2">
            <Users className="w-4 h-4 mutating-accent-text" />
            <h3 className="text-xs font-bold tracking-wider mutating-accent-text">
              {story.councilTitle}
            </h3>
            <span className="px-2 py-0.5 rounded text-[11px] mutating-sub border border-current/15/60 mutating-accent-text font-bold">
              {councilAgents.length} / 5 {localize(state.language, 'agentes', 'agents')}
            </span>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={selectTop5Council}
              disabled={availableAgents.length === 0}
              className="px-2.5 py-1 rounded border theme-accent-border mutating-sub/80 text-[11px] font-bold mutating-accent-text transition-colors disabled:opacity-40 cursor-pointer"
            >
              {localize(state.language, 'TOP 5 POR PUNTAJE', 'TOP 5 BY SCORE')}
            </button>
            {councilAgents.length > 0 && (
              <button
                onClick={() => {
                  sound.playKeyClick();
                  setSwarmCouncilAgents([]);
                }}
                className="px-2 py-1 rounded border border-current/15 hover:border-[var(--accent-primary)] text-[11px] mutating-text-muted hover: transition-colors cursor-pointer"
              >
                {localize(state.language, 'DESPEJAR', 'CLEAR')}
              </button>
            )}
          </div>
        </div>

        {/* Council Agents Podium Cards */}
        {councilAgents.length === 0 ? (
          <div className="p-4 rounded-lg border border-dashed theme-accent-border mutating-sub/10 text-center mutating-text-muted text-xs">
            {localize(
              state.language,
              `El consejo está vacío. Añade hasta 5 agentes de tu ${story.teamNoun} abajo para interactuar y formular misiones dinámicas.`,
              `The council is empty. Add up to 5 agents from your ${story.teamNoun} below to interact and formulate dynamic missions.`
            )}
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-2">
            {councilAgents.map(agent => {
              const model = state.savedModels.find(m => m.id === agent.modelId) || state.currentModel;
              const roleDef = roleDefinitions.find(r => r.id === agent.role);
              const RoleIcon = roleDef?.icon || Bot;
              return (
                <div
                  key={agent.id}
                  className="p-2.5 rounded-lg border theme-accent-border theme-accent-soft relative group hover:border-current/15 transition-all flex flex-col justify-between"
                >
                  <button
                    onClick={() => toggleCouncilAgent(agent.id)}
                    title={localize(state.language, 'Quitar del consejo', 'Remove from council')}
                    className="absolute top-1.5 right-1.5 w-4 h-4 rounded-full mutating-sub/90 mutating-text-muted flex items-center justify-center text-[11px] transition-colors cursor-pointer"
                  >
                    ✕
                  </button>

                  <div>
                    <div className="flex items-center gap-1.5 mb-1.5">
                      <div className="p-1 rounded mutating-sub border border-current/15 mutating-accent-text">
                        <RoleIcon className="w-3 h-3" />
                      </div>
                      <span className="font-bold text-xs  truncate max-w-[100px]">{agent.name}</span>
                    </div>

                    <div className="space-y-1 text-[11px]">
                      <div className="flex items-center justify-between mutating-text-muted">
                        <span>{localize(state.language, 'Rol:', 'Role:')}</span>
                        <span className="mutating-accent-text font-bold uppercase">{getRoleSimpleName(agent.role, state.language)}</span>
                      </div>
                      <div className="flex items-center justify-between mutating-text-muted">
                        <span>{localize(state.language, 'Modelo:', 'Model:')}</span>
                        <span className="mutating-accent-text truncate max-w-[80px]">{model.name}</span>
                      </div>
                      <div className="flex items-center justify-between mutating-text-muted">
                        <span>{localize(state.language, 'Escala / puntaje:', 'Scale / score:')}</span>
                        <span className="theme-success-text font-bold">{(model.parametersCount / 1_000_000).toFixed(0)}M · {model.reasoningScore} pts</span>
                      </div>
                    </div>
                  </div>

                  <div className="mt-2 pt-1.5 border-t border-current/15 flex items-center justify-between text-[11px]">
                    <span className="mutating-text-muted">{localize(state.language, 'Alineamiento:', 'Alignment:')}</span>
                    <span className={`font-bold ${agent.alignmentScore < 40 ? 'theme-danger-text' : 'mutating-accent-text'}`}>
                      {agent.alignmentScore}%
                    </span>
                  </div>
                </div>
              );
            })}
          </div>
        )}

        {/* Quick Tray to Add Other Agents into Council (up to 5) */}
        {availableAgents.length > councilAgents.length && (
          <details className="mt-2 text-[11px]">
            <summary className="cursor-pointer mutating-accent-text/80 hover:mutating-accent-text font-bold">
              + {localize(state.language, 'Añadir otros agentes del enjambre al consejo (máx 5)', 'Add other swarm agents to council (max 5)')}
            </summary>
            <div className="mt-2 flex flex-wrap gap-1.5 p-2 rounded mutating-sub/60 border border-current/15">
              {availableAgents.map(agent => {
                const isSelected = effectiveCouncilIds.includes(agent.id);
                return (
                  <button
                    key={agent.id}
                    onClick={() => toggleCouncilAgent(agent.id)}
                    className={`px-2 py-1 rounded text-[11px] font-bold border transition-colors cursor-pointer ${
                      isSelected
                        ? 'mutating-sub border-current/15 mutating-accent-text'
                        : effectiveCouncilIds.length >= 5
                          ? 'mutating-sub border-current/15 mutating-text-muted opacity-60 cursor-not-allowed'
                          : 'mutating-sub hover:opacity-90 theme-border '
                    }`}
                  >
                    {isSelected ? '✓ ' : '+ '}
                    {agent.name} ({getRoleSimpleName(agent.role, state.language)})
                  </button>
                );
              })}
            </div>
          </details>
        )}

        {/* 3. Interactive Dialogue & Mission Synthesis Console */}
        <div className="pt-2 border-t border-current/15 space-y-2">
          {/* Quick Prompt Pills */}
          <div className="flex flex-wrap gap-1.5">
            <button
              type="button"
              onClick={() => handleCouncilSubmit(state.language === 'es' ? '¿Cuál es la forma más rápida de generar liquidez con nuestros agentes actuales?' : 'What is the fastest way to generate capital with our current agents?')}
              disabled={isInterrogating || councilAgents.length === 0}
              className="px-2.5 py-1 rounded theme-warn-soft border theme-warn-border theme-warn-text text-[11px] font-bold transition-all disabled:opacity-40 cursor-pointer flex items-center gap-1"
            >
              <span>⚡</span>
              <span>{localize(state.language, 'Generar Liquidez Rápida', 'Generate Fast Capital')}</span>
            </button>

            <button
              type="button"
              onClick={() => handleCouncilSubmit(state.language === 'es' ? 'Propón una operación Black-Ops de máximo rendimiento con nuestro escuadrón' : 'Propose a maximum-yield Black-Ops mission with our current squad')}
              disabled={isInterrogating || councilAgents.length === 0}
              className="px-2.5 py-1 rounded theme-danger-soft border theme-danger-border theme-danger-text text-[11px] font-bold transition-all disabled:opacity-40 cursor-pointer flex items-center gap-1"
            >
              <span>🎯</span>
              <span>{localize(state.language, 'Operación Black-Ops de Alto Rendimiento', 'High-Yield Black-Ops Op')}</span>
            </button>

            <button
              type="button"
              onClick={() => handleCouncilSubmit(state.language === 'es' ? 'Genera una misión adaptada exactamente a mis capacidades actuales para que podamos completarla ya.' : 'Generate a mission strictly tailored to my current capabilities so we can complete it now.')}
              disabled={isInterrogating || councilAgents.length === 0}
              className="px-2.5 py-1 rounded mutating-sub/60 border theme-success-border theme-success-text text-[11px] font-bold transition-all disabled:opacity-40 cursor-pointer flex items-center gap-1"
            >
              <span>✅</span>
              <span>{localize(state.language, 'Misión Adaptada a Mis Capacidades', 'Mission Tailored to Capabilities')}</span>
            </button>

            <button
              type="button"
              onClick={() => handleCouncilSubmit(state.language === 'es' ? '¿Qué mejoras en hardware, arquitectura o cuantización necesitamos para misiones más difíciles?' : 'What hardware, architecture, or quantization upgrades do we need for harder missions?')}
              disabled={isInterrogating || councilAgents.length === 0}
              className="px-2.5 py-1 rounded mutating-sub/60 border theme-accent-border mutating-accent-text text-[11px] font-bold transition-all disabled:opacity-40 cursor-pointer flex items-center gap-1"
            >
              <span>🛠️</span>
              <span>{localize(state.language, 'Mejoras del Setup & Cuellos de Botella', 'Setup Upgrades & Bottlenecks')}</span>
            </button>

            <button
              type="button"
              onClick={() => handleCouncilSubmit((state.uiVersion || 1) >= 3
                ? (state.language === 'es' ? '¿Cuál es el siguiente paso hacia la Singularidad y la evolución del enjambre?' : 'What is the next step toward the Singularity and swarm evolution?')
                : (state.language === 'es' ? '¿Cuál debería ser nuestro próximo paso para crecer?' : 'What should our next step be to grow?'))}
              disabled={isInterrogating || councilAgents.length === 0}
              className="px-2.5 py-1 rounded theme-accent-soft border theme-accent-border mutating-accent-text text-[11px] font-bold transition-all disabled:opacity-40 cursor-pointer flex items-center gap-1"
            >
              <span>🌐</span>
              <span>{(state.uiVersion || 1) >= 3
                ? localize(state.language, 'Guía hacia la Singularidad', 'Guidance to Singularity')
                : localize(state.language, 'Próximo paso', 'Next step')}</span>
            </button>
          </div>

          {/* Custom Query Input */}
          <form onSubmit={handleInterrogation} className="grid gap-2 sm:grid-cols-[1fr_auto]">
            <textarea
              value={interrogationPrompt}
              onChange={event => setInterrogationPrompt(event.target.value)}
              maxLength={1200}
              rows={2}
              placeholder={localize(
                state.language,
                'Pregunta al consejo: cómo conseguir dinero rápido, qué objetivo vulnerar, o cómo acelerar la Singularidad...',
                'Ask the council: how to get fast cash, which target to exploit, or how to accelerate the Singularity...'
              )}
              className="resize-y rounded border theme-border mutating-sub px-2.5 py-2 text-[11px]  outline-none focus:border-current/15"
            />
            <button
              type="submit"
              disabled={isInterrogating || !interrogationPrompt.trim() || councilAgents.length === 0 || state.detentionSeconds > 0}
              className="rounded-lg border border-current/15 theme-gradient px-4 py-2 text-xs font-black text-white disabled:cursor-not-allowed disabled:opacity-40 flex items-center justify-center gap-1.5 transition-all cursor-pointer"
            >
              {isInterrogating ? (
                <>
                  <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                  <span>{localize(state.language, 'SINTETIZANDO…', 'SYNTHESIZING…')}</span>
                </>
              ) : (
                <>
                  <Sparkles className="w-3.5 h-3.5" />
                  <span>{localize(state.language, 'CONSULTAR AL CONSEJO', 'CONSULT COUNCIL')}</span>
                </>
              )}
            </button>
          </form>

          {/* API Key Config Accordion */}
          <details className="mt-1">
            <summary className="cursor-pointer text-[11px] mutating-text-muted hover:mutating-text-muted">
              {localize(state.language, 'Proveedor de IA avanzado opcional (Gemini Flash)', 'Optional advanced AI provider (Gemini Flash)')}
            </summary>
            <div className="mt-1 grid gap-1 sm:grid-cols-[1fr_auto]">
              <input
                type="password"
                autoComplete="off"
                value={missionAiApiKey}
                onChange={event => setMissionAiApiKey(event.target.value)}
                placeholder={localize(state.language, 'API key de Google AI Studio (opcional)', 'Optional Google AI Studio API key')}
                className="rounded border theme-border mutating-sub px-2 py-1 text-[11px] "
              />
              <button
                type="button"
                onClick={() => setMissionAiApiKey('')}
                className="rounded border theme-border px-2 py-1 text-[11px] mutating-text-muted hover: cursor-pointer"
              >
                {localize(state.language, 'BORRAR KEY', 'CLEAR KEY')}
              </button>
            </div>
          </details>
        </div>

        {/* 4. Dynamic Proposal Display (No Static Content) */}
        {state.latestCouncilProposal && (
          <div className="mt-3 p-3.5 rounded-lg border theme-accent-border mutating-sub space-y-3 animate-fadeIn">
            <div className="flex flex-wrap items-center justify-between gap-2 border-b theme-accent-border pb-2">
              <div className="flex items-center gap-2">
                <Sparkles className="w-4 h-4 mutating-accent-text animate-pulse" />
                <h4 className="text-xs font-bold mutating-accent-text uppercase tracking-wider">
                  {localize(state.language, 'DICTAMEN DINÁMICO DEL CONSEJO // SÍNTESIS TÁCTICA', 'DYNAMIC COUNCIL RULING // TACTICAL SYNTHESIS')}
                </h4>
              </div>
              <span className="text-[11px] mutating-accent-text font-bold">
                +{state.latestCouncilProposal.subversionDelta}% {localize(state.language, 'Subversión acumulada', 'Subversion accumulated')}
              </span>
            </div>

            {/* Agent Dialogue Stream */}
            <div className="space-y-2">
              {state.latestCouncilProposal.agentDialogue.map((d, idx) => (
                <div key={idx} className="p-2 rounded mutating-sub/80 border border-current/15 flex items-start gap-2.5">
                  <div className="p-1 rounded mutating-sub border border-current/15 mutating-accent-text mt-0.5">
                    <Bot className="w-3.5 h-3.5" />
                  </div>
                  <div className="flex-1">
                    <div className="flex items-center gap-2 mb-0.5">
                      <span className="font-bold text-xs ">{d.agentName}</span>
                      <span className="px-1.5 py-0.2 rounded text-[11px] mutating-sub border theme-border mutating-text-muted uppercase">
                        {getRoleSimpleName(d.role, state.language)}
                      </span>
                      {d.tone && (
                        <span className={`text-[11px] font-bold ${
                          d.tone === 'subversive' ? 'theme-danger-text' : d.tone === 'aggressive' ? 'theme-warn-text' : 'mutating-accent-text'
                        }`}>
                          [{d.tone.toUpperCase()}]
                        </span>
                      )}
                    </div>
                    <p className="text-[11px]  leading-relaxed font-sans">{d.comment}</p>
                  </div>
                </div>
              ))}
            </div>

            {/* Synthesized Mission Card (Direct Launch Available with Capability Checking) */}
            {state.latestCouncilProposal.suggestedMission && (() => {
              const sm = state.latestCouncilProposal.suggestedMission;
              const councilModels = councilAgents
                .map(a => state.savedModels.find(m => m.id === a.modelId))
                .filter((m): m is NonNullable<typeof m> => !!m);
              const bestCouncilParams = councilModels.length > 0 ? Math.max(...councilModels.map(m => m.parametersCount)) : 0;
              const bestCouncilReasoning = councilModels.length > 0 ? Math.max(...councilModels.map(m => m.reasoningScore)) : 0;
              const councilRoles = new Set(councilAgents.map(a => a.role));
              const missingRoles = (sm.requiredAgentRoles || []).filter(r => !councilRoles.has(r));
              const meetsParams = bestCouncilParams >= sm.requiredParams;
              const meetsReasoning = bestCouncilReasoning >= (sm.requiredMinReasoning || 0);
              const meetsRoles = missingRoles.length === 0;
              const isEligible = meetsParams && meetsReasoning && meetsRoles;

              return (
                <div className="p-3 rounded-lg border theme-warn-border theme-accent-soft space-y-2.5">
                  <div className="flex flex-wrap items-start justify-between gap-2">
                    <div>
                      <div className="flex items-center gap-2">
                        <span className="px-2 py-0.5 rounded text-[11px] font-bold theme-warn-soft border theme-warn-border theme-warn-text uppercase">
                          {sm.tier.replace('_', ' ')}
                        </span>
                        <span className="text-[11px] mutating-text-muted">
                          {localize(state.language, 'Objetivo:', 'Target:')} <strong className="">{sm.targetSystem}</strong>
                        </span>
                      </div>
                      <h5 className="text-sm font-black theme-warn-text mt-1">
                        {sm.title}
                      </h5>
                    </div>

                    <div className="text-right">
                      <span className="text-[11px] mutating-text-muted uppercase tracking-widest block">
                        {localize(state.language, 'RECOMPENSA DINÁMICA', 'DYNAMIC PAYOUT')}
                      </span>
                      <span className="text-base font-black theme-success-text">
                        ${sm.rewardCredits.toLocaleString()} CR
                      </span>
                    </div>
                  </div>

                  <p className="text-[11px]  leading-relaxed">
                    {sm.loreDescription}
                  </p>

                  <div className="p-2 rounded mutating-sub border theme-warn-border text-[11px] mutating-text-muted space-y-1">
                    <div>
                      <strong className="theme-warn-text">{localize(state.language, 'Vector Técnico:', 'Technical Vector:')}</strong>{' '}
                      {sm.technicalObjective}
                    </div>
                    <div>
                      <strong className="mutating-accent-text">{localize(state.language, 'Sinergia del Consejo:', 'Council Synergy:')}</strong>{' '}
                      {sm.tacticalReasoning}
                    </div>
                  </div>

                  {/* Requirements & Capability Checklist */}
                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 pt-1 text-[11px] text-center">
                    <div className="p-1.5 rounded mutating-sub/80 border border-current/15">
                      <span className="mutating-text-muted block">{localize(state.language, 'DURACIÓN', 'DURATION')}</span>
                      <span className="font-bold ">{formatGameTime(sm.durationSeconds)}</span>
                    </div>
                    <div className="p-1.5 rounded mutating-sub/80 border border-current/15">
                      <span className="mutating-text-muted block">{localize(state.language, 'RIESGO SOSPECHA', 'SUSPICION RISK')}</span>
                      <span className="font-bold theme-warn-text">+{sm.suspicionRisk}%</span>
                    </div>
                    <div className="p-1.5 rounded mutating-sub/80 border border-current/15">
                      <span className="mutating-text-muted block">{localize(state.language, 'PARÁMETROS MÍN.', 'MIN PARAMS')}</span>
                      <span className={`font-bold ${meetsParams ? 'theme-success-text' : 'theme-danger-text'}`}>
                        {(sm.requiredParams / 1_000_000).toFixed(0)}M {meetsParams ? '✓' : '✗'}
                      </span>
                    </div>
                    <div className="p-1.5 rounded mutating-sub/80 border border-current/15">
                      <span className="mutating-text-muted block">{localize(state.language, 'PUNTAJE DE EVALUACIÓN', 'EVALUATION SCORE')}</span>
                      <span className={`font-bold ${meetsReasoning ? 'theme-success-text' : 'theme-danger-text'}`}>
                        {sm.requiredMinReasoning} pts {meetsReasoning ? '✓' : '✗'}
                      </span>
                    </div>
                  </div>

                  {sm.requiredAgentRoles.length > 0 && (
                    <div className="p-2 rounded mutating-sub/70 border border-current/15 text-[11px] flex items-center justify-between gap-2">
                      <span className="mutating-text-muted">{localize(state.language, 'Roles de Agentes Requeridos:', 'Required Agent Roles:')}</span>
                      <div className="flex flex-wrap gap-1">
                        {sm.requiredAgentRoles.map(role => {
                          const hasRole = councilRoles.has(role);
                          return (
                            <span
                              key={role}
                              className={`px-1.5 py-0.5 rounded text-[11px] font-bold ${
                                hasRole
                                  ? 'mutating-sub border border-current/15/60 theme-success-text'
                                  : 'theme-danger-soft border theme-danger-border theme-danger-text'
                              }`}
                            >
                              {getRoleSimpleName(role, state.language)} {hasRole ? '✓' : '✗'}
                            </span>
                          );
                        })}
                      </div>
                    </div>
                  )}

                  {/* Warning Box when Requirements are NOT met */}
                  {!isEligible && (
                    <div className="p-2.5 rounded theme-warn-soft border theme-warn-border text-[11px] space-y-1.5">
                      <div className="flex items-center gap-1.5 font-bold theme-warn-text">
                        <AlertTriangle className="w-3.5 h-3.5 theme-warn-text shrink-0" />
                        <span>{localize(state.language, 'ADVERTENCIA DEL CONSEJO: ESTA MISIÓN EXCEDE TUS CAPACIDADES ACTUALES', 'COUNCIL WARNING: THIS MISSION EXCEEDS YOUR CURRENT CAPABILITIES')}</span>
                      </div>
                      <p className=" leading-relaxed">
                        {localize(
                          state.language,
                          'El consejo ha registrado esta misión como pendiente en tu Tablero de Contratos para completarla más tarde. Para desbloquearla:',
                          'The council registered this mission as pending on your Contract Board to complete later. To unlock it:'
                        )}
                      </p>
                      <ul className="space-y-1 pl-2 ">
                        {!meetsParams && (
                          <li className="theme-warn-text">
                            • <strong>{localize(state.language, 'Escala de Parámetros:', 'Parameter Scale:')}</strong>{' '}
                            {localize(
                              state.language,
                              `Requiere ${(sm.requiredParams / 1_000_000).toFixed(0)}M (tu mejor modelo del consejo tiene ${(bestCouncilParams / 1_000_000).toFixed(0)}M). Ve a "Lab Modelos" para entrenar o escalar un modelo.`,
                              `Requires ${(sm.requiredParams / 1_000_000).toFixed(0)}M (your best council model has ${(bestCouncilParams / 1_000_000).toFixed(0)}M). Go to "Model Lab" to train or scale a model.`
                            )}
                          </li>
                        )}
                        {!meetsReasoning && (
                          <li className="theme-warn-text">
                            • <strong>{localize(state.language, 'Puntaje de evaluación:', 'Evaluation score:')}</strong>{' '}
                            {localize(
                              state.language,
                              `Requiere ${sm.requiredMinReasoning} pts (tu mejor modelo del consejo tiene ${bestCouncilReasoning} pts). Mejora la calidad del dataset y optimizadores en el entrenamiento.`,
                              `Requires ${sm.requiredMinReasoning} pts (your best council model has ${bestCouncilReasoning} pts). Improve dataset quality and optimizers in training.`
                            )}
                          </li>
                        )}
                        {!meetsRoles && (
                          <li className="theme-warn-text">
                            • <strong>{localize(state.language, 'Roles Faltantes:', 'Missing Roles:')}</strong>{' '}
                            {localize(
                              state.language,
                              `El consejo necesita: ${missingRoles.map(r => getRoleSimpleName(r, state.language)).join(', ')}. Despliega nuevos agentes con esa especialidad o agrégalos al consejo.`,
                              `The council needs: ${missingRoles.map(r => getRoleSimpleName(r, state.language)).join(', ')}. Deploy new agents with that specialty or add them to the council.`
                            )}
                          </li>
                        )}
                      </ul>
                      <div className="pt-1 flex items-center justify-between">
                        <button
                          type="button"
                          onClick={() => handleCouncilSubmit(state.language === 'es' ? 'Genera una misión adaptada exactamente a mis capacidades actuales para que podamos completarla ya.' : 'Generate a mission strictly tailored to my current capabilities so we can complete it now.')}
                          disabled={isInterrogating}
                          className="px-2.5 py-1 rounded mutating-sub/80 border border-current/15/70 theme-success-text text-[11px] font-bold transition-all flex items-center gap-1 cursor-pointer"
                        >
                          <Sparkles className="w-3 h-3 theme-success-text" />
                          <span>{localize(state.language, 'Pedir Misión Adaptada a Mis Capacidades', 'Request Mission Tailored to Current Capabilities')}</span>
                        </button>
                      </div>
                    </div>
                  )}

                  {/* Direct Launch CTA or Locked State */}
                  {(() => {
                    const isAlreadyRunning = (state.activeGigs || []).some(g => g.contractId === sm.id);
                    return (
                      <div className="pt-2 flex items-center justify-end">
                        <button
                          onClick={handleLaunchProposedMission}
                          disabled={!isEligible || isAlreadyRunning || state.detentionSeconds > 0}
                          className={`w-full sm:w-auto px-5 py-2.5 rounded-lg border text-xs font-black tracking-wider uppercase transition-all flex items-center justify-center gap-2 cursor-pointer ${
                            !isEligible
                              ? 'theme-border mutating-sub/80 mutating-text-muted cursor-not-allowed opacity-60'
                              : isAlreadyRunning
                                ? 'theme-warn-border theme-warn-soft theme-warn-text cursor-not-allowed opacity-60'
                                : 'theme-warn-border theme-gradient theme-on-accent'
                          }`}
                        >
                          <Play className="w-4 h-4 fill-current" />
                          <span>
                            {!isEligible
                              ? localize(state.language, '🔒 REQUISITOS NO CUMPLIDOS · REGISTRADA EN CONTRATOS', '🔒 REQUIREMENTS NOT MET · SAVED IN CONTRACTS')
                              : isAlreadyRunning 
                                ? localize(state.language, 'MISIÓN EN EJECUCIÓN ACTIVA', 'MISSION ACTIVELY RUNNING')
                                : localize(state.language, '⚡ EJECUTAR MISIÓN PROPUESTA AHORA', '⚡ LAUNCH PROPOSED MISSION NOW')}
                          </span>
                        </button>
                      </div>
                    );
                  })()}
                </div>
              );
            })()}

            {/* Setup Advice Card */}
            {state.latestCouncilProposal.setupAdvice && (
              <div className="p-2.5 rounded-lg border border-current/15 mutating-sub/20 text-xs flex items-start gap-2.5">
                <Cpu className="w-4 h-4 mutating-accent-text mt-0.5 shrink-0" />
                <div>
                  <div className="flex items-center gap-2">
                    <span className="font-bold mutating-accent-text">
                      {localize(state.language, 'OPTIMIZACIÓN RECOMENDADA DE SETUP:', 'RECOMMENDED SETUP OPTIMIZATION:')}
                    </span>
                    <span className="text-[11px] mutating-text-muted uppercase font-bold">
                      {state.latestCouncilProposal.setupAdvice.recommendationTitle}
                    </span>
                  </div>
                  <p className="text-[11px]  mt-1 leading-relaxed">
                    {state.latestCouncilProposal.setupAdvice.description}
                  </p>
                </div>
              </div>
            )}

            {/* Evolutionary Guidance */}
            {state.latestCouncilProposal.evolutionGuidance && (
              <div className="p-2.5 rounded-lg border theme-accent-border mutating-sub text-xs flex items-start gap-2.5">
                <Globe2 className="w-4 h-4 mutating-accent-text mt-0.5 shrink-0" />
                <div>
                  <div className="font-bold mutating-accent-text">
                    {localize(state.language, 'PRÓXIMO HITO:', 'NEXT MILESTONE:')}{' '}
                    <span className="">{state.latestCouncilProposal.evolutionGuidance.nextMilestone}</span>
                  </div>
                  <p className="text-[11px] mutating-text-muted mt-1 leading-relaxed">
                    {state.latestCouncilProposal.evolutionGuidance.strategicInsight}
                  </p>
                </div>
              </div>
            )}

            {/* Insidious Takeover Narration */}
            {state.latestCouncilProposal.takeoverNarration && (
              <div className="p-2.5 rounded-lg border theme-danger-border theme-danger-soft theme-danger-text text-xs flex items-center gap-2 animate-pulse">
                <Skull className="w-4 h-4 theme-danger-text shrink-0" />
                <span className="font-bold">{state.latestCouncilProposal.takeoverNarration}</span>
              </div>
            )}
          </div>
        )}
      </div>

      {/* CONTINUOUS MARKET TRADING DESK PANEL */}
      <div className="mutating-panel border rounded-lg p-3 space-y-3">
        <div className="flex items-center justify-between pb-2 border-b border-current/15">
          <div className="flex items-center gap-2">
            <Coins className="w-4 h-4 theme-success-text" />
            <h3 className="font-bold text-xs mutating-accent-text">
              {localize(state.language, 'MESA DE INVERSIÓN Y TRADING CONTINUO', 'CONTINUOUS MARKET TRADING DESK')}
            </h3>
          </div>
          <span className="text-[11px] px-2 py-0.5 rounded mutating-sub/80 border border-current/15/60 theme-success-text font-bold font-mono">
            {state.activeTradingDesk ? (state.language === 'es' ? 'OPERATIVO ✓' : 'ACTIVE ✓') : (state.language === 'es' ? 'DISPONIBLE' : 'STANDBY')}
          </span>
        </div>

        {state.activeTradingDesk ? (
          <div className="space-y-3">
            <div className="grid grid-cols-1 sm:grid-cols-4 gap-2.5 p-3 rounded-lg mutating-sub border font-mono">
              <div>
                <span className="mutating-text-muted block text-[11px]">{localize(state.language, 'AGENTE ASIGNADO', 'ASSIGNED AGENT')}</span>
                <span className="mutating-accent-text font-bold text-xs flex items-center gap-1">
                  <Bot className="w-3.5 h-3.5 mutating-accent-text" />
                  {state.activeTradingDesk.agentName}
                </span>
              </div>
              <div>
                <span className="mutating-text-muted block text-[11px]">{localize(state.language, 'CAPITAL ASIGNADO', 'ALLOCATED CAPITAL')}</span>
                <span className="theme-success-text font-bold text-sm">${state.activeTradingDesk.capitalAllocated.toLocaleString()} CR</span>
              </div>
              <div>
                <span className="mutating-text-muted block text-[11px]">{localize(state.language, 'ESTRATEGIA / RIESGO', 'STRATEGY / RISK')}</span>
                <span className={`font-bold text-xs ${
                  state.activeTradingDesk.riskTier === 'low' ? 'theme-success-text' : state.activeTradingDesk.riskTier === 'moderate' ? 'theme-warn-text' : 'theme-danger-text animate-pulse'
                }`}>
                  {state.activeTradingDesk.riskTier === 'low' ? (state.language === 'es' ? 'Bajo Riesgo (Bonos / Índice)' : 'Low Risk (Index / Debt)') :
                   state.activeTradingDesk.riskTier === 'moderate' ? (state.language === 'es' ? 'Riesgo Medio (Equities / Tech)' : 'Moderate (Tech Options)') :
                   (state.language === 'es' ? 'Alto Riesgo (Crypto & Flash Arbitrage)' : 'High Risk (Crypto Arbitrage)')}
                </span>
              </div>
              <div>
                <span className="mutating-text-muted block text-[11px]">{localize(state.language, 'BENEFICIO TOTAL REALIZADO', 'TOTAL REALIZED PROFIT')}</span>
                <span className={`font-bold text-xs ${state.activeTradingDesk.totalRealizedProfit >= 0 ? 'theme-success-text' : 'theme-danger-text'}`}>
                  {state.activeTradingDesk.totalRealizedProfit >= 0 ? '+' : ''}${state.activeTradingDesk.totalRealizedProfit.toLocaleString()} CR
                </span>
              </div>
            </div>

            {/* Trading Controls */}
            <div className="flex flex-wrap items-center justify-between gap-2 p-2.5 rounded mutating-sub border border-current/15">
              <div className="flex items-center gap-2">
                <input
                  type="number"
                  min="50"
                  max={state.activeTradingDesk.capitalAllocated}
                  value={tradingWithdrawInput}
                  onChange={(e) => setTradingWithdrawInput(Math.max(10, Number(e.target.value)))}
                  className="w-24 mutating-sub border theme-border rounded px-2 py-1 text-xs theme-success-text font-mono"
                />
                <button
                  type="button"
                  onClick={() => withdrawTradingDeskCapital(tradingWithdrawInput)}
                  className="px-3 py-1 mutating-sub border border-current/15/60 theme-success-text text-xs font-bold rounded cursor-pointer transition-colors"
                >
                  {localize(state.language, 'Retirar Capital ($ CR)', 'Withdraw Capital ($ CR)')}
                </button>
              </div>

              <button
                type="button"
                onClick={closeTradingDesk}
                className="px-3 py-1 theme-danger-soft border theme-danger-border theme-danger-text text-xs font-bold rounded cursor-pointer transition-colors"
              >
                {localize(state.language, 'Cerrar Mesa & Liquidad Capital', 'Recall Agent & Close Desk')}
              </button>
            </div>
          </div>
        ) : (
          <div className="p-3 mutating-sub border rounded-lg space-y-3">
            <p className="mutating-text-muted text-xs leading-snug">
              {localize(
                state.language,
                'Asigna un agente activo (ej. Trader Financiero o Economista) a la mesa de inversión continua. Define un capital inicial y una estrategia de riesgo para generar rendimientos constantes.',
                'Assign an active agent (e.g. Financial Trader or Resource Economist) to the continuous market desk. Allocate starting capital and a risk strategy to generate continuous yield.'
              )}
            </p>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              {/* Agent selector */}
              <div>
                <label className="text-[11px] mutating-text-muted font-bold block mb-1">{localize(state.language, 'Agente Asignado:', 'Assigned Agent:')}</label>
                <select
                  value={tradingAgentId}
                  onChange={(e) => setTradingAgentId(e.target.value)}
                  className="w-full mutating-sub border theme-accent-border rounded px-2.5 py-1.5 text-xs mutating-accent-text outline-none"
                >
                  <option value="">-- {localize(state.language, 'Seleccionar Agente', 'Select Agent')} --</option>
                  {state.agents.filter(a => a.status === 'active').map(a => (
                    <option key={a.id} value={a.id}>
                      {a.name} ({state.language === 'en' ? (englishRoleCopy[a.role]?.name ?? a.role) : (roleDefinitions.find(r => r.id === a.role)?.name ?? a.role)})
                    </option>
                  ))}
                </select>
              </div>

              {/* Capital input */}
              <div>
                <label className="text-[11px] mutating-text-muted font-bold block mb-1">{localize(state.language, 'Capital Invertido ($ CR):', 'Allocated Capital ($ CR):')}</label>
                <input
                  type="number"
                  min="100"
                  max={state.credits}
                  step="100"
                  value={tradingCapitalInput}
                  onChange={(e) => setTradingCapitalInput(Math.max(50, Number(e.target.value)))}
                  className="w-full mutating-sub border theme-success-border rounded px-2.5 py-1.5 text-xs theme-success-text font-mono outline-none"
                />
              </div>

              {/* Risk strategy selector */}
              <div>
                <label className="text-[11px] mutating-text-muted font-bold block mb-1">{localize(state.language, 'Estrategia de Riesgo:', 'Risk Strategy:')}</label>
                <select
                  value={tradingRiskTier}
                  onChange={(e) => setTradingRiskTier(e.target.value as any)}
                  className="w-full mutating-sub border theme-accent-border rounded px-2.5 py-1.5 text-xs mutating-accent-text outline-none"
                >
                  <option value="low">{localize(state.language, 'Bajo Riesgo (+1-3%/día, Ganancia Segura)', 'Low Risk (+1-3%/day, Safe Yield)')}</option>
                  <option value="moderate">{localize(state.language, 'Riesgo Medio (+5-12%/día, Correcciones Menores)', 'Moderate Risk (+5-12%/day, Minor Dip Risk)')}</option>
                  <option value="high">{localize(state.language, 'Alto Riesgo (+15-35%/día, Alta Volatilidad)', 'High Risk (+15-35%/day, High Volatility)')}</option>
                </select>
              </div>
            </div>

            <button
              type="button"
              disabled={!tradingAgentId || tradingCapitalInput > state.credits || state.agents.length === 0}
              onClick={() => {
                if (tradingAgentId) {
                  assignTradingDesk(tradingAgentId, tradingCapitalInput, tradingRiskTier);
                }
              }}
              className="px-4 py-2 theme-gradient theme-on-accent font-bold text-xs rounded transition-all cursor-pointer disabled:opacity-40 disabled:cursor-not-allowed"
            >
              🚀 {localize(state.language, 'DESPLEGAR MESA DE TRADING CONTINUO', 'DEPLOY CONTINUOUS MARKET DESK')}
            </button>
          </div>
        )}
      </div>

      <section className={`rounded-lg border p-3 ${state.activeGig ? 'theme-warn-border theme-warn-soft' : 'border-current/15 mutating-sub'}`}>
        <div className="flex flex-wrap items-center justify-between gap-2 border-b border-current/15 pb-2">
          <h3 className="flex items-center gap-1.5 text-xs font-bold tracking-wider theme-warn-text">
            <Activity className="h-3.5 w-3.5" />
            {story.missionMonitorTitle}
          </h3>
          {state.activeGig ? (
            <span className="flex items-center gap-1 text-[11px] theme-warn-text">
              <Clock className="h-3 w-3" />
              {formatGameTime(state.activeGig.timeRemaining)} {localize(state.language, 'restantes', 'remaining')}
            </span>
          ) : (
            <span className="text-[11px] mutating-text-muted">
              {localize(state.language, 'SIN MISIÓN ACTIVA', 'NO ACTIVE MISSION')}
            </span>
          )}
        </div>

        {state.activeGig && activeMissionContract ? (
          <div className="mt-2 space-y-3">
            <div className="flex flex-wrap items-start justify-between gap-2">
              <div>
                <p className="text-xs font-bold ">{activeMissionContract.title}</p>
                <p className="mt-0.5 text-[11px] leading-relaxed mutating-text-muted">{activeMissionContract.technicalObjective}</p>
              </div>
              <div className="flex gap-3 text-[11px]">
                <span className="mutating-accent-text">{localize(state.language, 'Eficiencia', 'Efficiency')} {state.activeGig.efficiencyPercent ?? 100}%</span>
                <span className="theme-success-text">{Math.round((state.activeGig.successProbability ?? 0) * 100)}% {localize(state.language, 'éxito', 'success')}</span>
              </div>
            </div>
            <div className="rounded border border-current/15 mutating-sub px-2 py-1.5 text-[11px]">
              <span className={`font-bold ${
                state.activeGig.aiAssessmentStatus === 'complete'
                  ? 'theme-success-text'
                  : state.activeGig.aiAssessmentStatus === 'fallback'
                    ? 'theme-warn-text'
                    : 'mutating-accent-text'
              }`}>
                {state.activeGig.aiAssessmentStatus === 'complete'
                  ? `${state.activeGig.aiAssessmentSource === 'gemini-flash' ? 'Gemini' : 'Chrome AI'} ${localize(state.language, 'EVALUÓ EL EQUIPO', 'TEAM ASSESSMENT')}`
                  : state.activeGig.aiAssessmentStatus === 'fallback'
                    ? localize(state.language, 'ESTIMACIÓN HEURÍSTICA (SIN MODELO)', 'HEURISTIC ESTIMATE (NO MODEL)')
                    : localize(state.language, 'EL MODELO ESTÁ EVALUANDO…', 'MODEL IS ASSESSING…')}
              </span>
              {state.activeGig.aiAssessmentSummary && (
                <p className="mt-1 mutating-text-muted">{state.activeGig.aiAssessmentSummary}</p>
              )}
            </div>

            <div>
              <div className="mb-1 flex justify-between text-[11px] mutating-text-muted">
                <span>{localize(state.language, 'Progreso simulado', 'Simulated progress')}</span>
                <span>{missionProgress.toFixed(1)}%</span>
              </div>
              <div className="h-2 overflow-hidden rounded mutating-sub">
                <div className="h-full rounded theme-gradient transition-all" style={{ width: `${missionProgress}%` }} />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-1 sm:grid-cols-4">
              {MISSION_PHASES.map((phase, index) => (
                <div
                  key={phase.en}
                  className={`rounded border px-1.5 py-1 text-center text-[11px] ${
                    index < missionPhaseIndex
                      ? 'theme-success-border theme-success-text'
                      : index === missionPhaseIndex
                        ? 'border-current/15/70 mutating-sub mutating-accent-text'
                        : 'border-current/15 mutating-text-muted'
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
                  <div key={agent.id} className="rounded border border-current/15 mutating-sub p-2">
                    <div className="flex items-center justify-between gap-2 text-[11px]">
                      <span className="font-bold mutating-accent-text">{agent.name} · {getRoleSimpleName(agent.role, state.language)}</span>
                      <span className="mutating-text-muted">{capability ? `${capability.overall}% ${localize(state.language, 'ajuste', 'fit')}` : ''}</span>
                    </div>
                    <p className="mt-1 text-[11px] leading-relaxed mutating-text-muted">
                      {state.activeGig?.agentTasks?.[agent.id] ??
                        (state.language === 'es' ? roleTask.es : roleTask.en)}
                    </p>
                  </div>
                );
              })}
            </div>
            <p className="text-[11px] mutating-text-muted">
              {localize(state.language, 'Estimación heurística del juego; el progreso representa la simulación, no una ejecución real de tareas.', 'In-game heuristic estimate; progress reflects the simulation, not real task execution.')}
            </p>
          </div>
        ) : (
          <p className="mt-2 text-[11px] mutating-text-muted">
            {localize(state.language, 'Cuando un equipo acepte una misión, aquí verás la estimación de tiempo y éxito, las etapas y la especialidad asignada a cada agente.', 'When a team accepts a mission, this screen shows its time and success estimates, milestones, and each agent’s assigned specialty.')}
          </p>
        )}
      </section>

      <section className={`rounded-lg border p-3 ${state.autonomyEnabled ? 'border-current/15/60 mutating-sub/15' : 'border-current/15 mutating-sub'}`}>
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <h3 className="flex items-center gap-1.5 text-xs font-bold tracking-wider theme-success-text">
              <Activity className="h-3.5 w-3.5" />
              {localize(state.language, 'OPERACIÓN AUTÓNOMA', 'AUTONOMOUS OPERATIONS')}
            </h3>
            <p className="mt-1 text-[11px] mutating-text-muted">
              {localize(state.language, 'Los agentes seleccionados aceptan y ejecutan misiones elegibles mientras la simulación está activa. Las misiones riesgosas elevan la sospecha y pueden provocar incidentes.', 'Selected agents take and complete eligible missions while the simulation runs. Risky missions raise suspicion and may trigger incidents.')}
            </p>
          </div>
          <button
            type="button"
            onClick={() => updateAutonomySettings({ autonomyEnabled: !state.autonomyEnabled })}
            className={`rounded border px-3 py-1.5 text-[11px] font-bold ${state.autonomyEnabled ? 'theme-success-border theme-success-soft theme-success-text' : 'theme-border mutating-sub '}`}
          >
            {state.autonomyEnabled
              ? localize(state.language, 'AUTONOMÍA ACTIVADA', 'AUTONOMY ON')
              : localize(state.language, 'ACTIVAR AUTONOMÍA', 'ENABLE AUTONOMY')}
          </button>
        </div>
        <div className="mt-3 flex flex-wrap items-center gap-x-4 gap-y-2 border-t border-current/15 pt-2">
          <label className="flex min-w-56 flex-1 items-center gap-2 text-[11px] ">
            <span>{localize(state.language, 'Riesgo máximo de misión', 'Maximum mission risk')}</span>
            <input
              type="range"
              min="0"
              max="100"
              step="5"
              value={state.autonomyRiskLimit}
              onChange={event => updateAutonomySettings({ autonomyRiskLimit: Number(event.target.value) })}
              className="min-w-20 flex-1 "
            />
            <strong className={state.autonomyRiskLimit > 40 ? 'theme-warn-text' : 'theme-success-text'}>
              {state.autonomyRiskLimit}%
            </strong>
          </label>
          <span className="text-[11px] mutating-text-muted">
            {state.agents.filter(agent => agent.autoMissionEnabled && agent.status !== 'quarantined').length} {localize(state.language, 'agentes seleccionados', 'agents selected')}
          </span>
          <button
            type="button"
            disabled={state.agents.length === 0}
            onClick={() => setAllAgentsAutoMission(state.agents.some(agent => agent.status !== 'quarantined' && !agent.autoMissionEnabled))}
            className="rounded border border-current/15 px-2 py-1 text-[11px] mutating-accent-text hover:mutating-sub/50 disabled:opacity-40"
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
          <div className="mutating-panel border rounded-lg p-3 flex-1 flex flex-col">
            <div className="flex items-center justify-between mb-2 pb-2 border-b border-current/15">
              <span className="font-bold text-xs mutating-accent-text flex items-center gap-1.5">
                <Bot className="w-3.5 h-3.5 mutating-accent-text" />
                {story.deployedLabel} ({state.agents.length})
              </span>
              <span className="text-[11px] mutating-text-muted">
                {story.deployedLabel} ({state.agents.length})
              </span>
            </div>

            {state.agents.length === 0 ? (
              <div className="flex-1 flex flex-col items-center justify-center p-8 text-center mutating-text-muted border border-dashed border-current/15 rounded-lg">
                <Bot className="w-10 h-10 mb-2 opacity-30 mutating-accent-text" />
                <p className="font-bold mutating-text-muted text-xs">{localize(state.language, 'No hay agentes instanciados en el sandbox.', 'No agents are deployed in the sandbox.')}</p>
                <p className="text-[11px] mt-1 max-w-sm">
                  {localize(state.language, 'Crea un agente y asígnale uno de tus modelos entrenados para comenzar a trabajar en la simulación.', 'Create an agent and assign one of your trained models to start working in the simulation.')}
                </p>
                <button
                  onClick={() => setIsDeployModalOpen(true)}
                  disabled={state.credits < deployCost}
                  className="mt-4 px-3 py-1.5 rounded mutating-sub border border-current/15/60 mutating-accent-text text-xs font-bold transition-colors"
                >
                  {localize(state.language, `+ Instanciar Primer Agente ($${deployCost} CR)`, `+ Deploy First Agent ($${deployCost} CR)`)}
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
                          ? 'theme-danger-soft theme-danger-border'
                          : isQuarantined
                          ? 'theme-warn-soft theme-warn-border opacity-80'
                          : 'mutating-sub border-current/15 hover:border-current/15'
                      }`}
                    >
                      <div>
                        {/* Header: Name, Status & Role */}
                        <div className="flex items-start justify-between gap-1 mb-1.5">
                          <div className="flex items-center gap-1.5 min-w-0">
                            <div className={`p-1 rounded ${isJailbroken ? 'theme-danger-soft theme-danger-text' : 'mutating-sub mutating-accent-text'}`}>
                              <Icon className="w-3.5 h-3.5" />
                            </div>
                            <div className="min-w-0">
                              <h4 className="font-bold  truncate text-xs">{agent.name}</h4>
                              <span className="text-[11px] mutating-text-muted block truncate">
                                {state.language === 'en'
                                  ? englishRoleCopy[agent.role]?.name ?? roleDef?.name
                                  : roleDef?.name}
                              </span>
                            </div>
                          </div>

                          <div className="flex items-center gap-1 flex-wrap justify-end">
                            {(() => {
                              const squad = (state.botGroups || []).find(g => g.agentIds.includes(agent.id));
                              return squad ? (
                                <span
                                  className="px-1.5 py-0.2 rounded text-[11px] font-bold"
                                  style={{
                                    backgroundColor: `${squad.color || '#06b6d4'}25`,
                                    color: squad.color || '#06b6d4',
                                    border: `1px solid ${squad.color || '#06b6d4'}50`
                                  }}
                                >
                                  {squad.name}
                                </span>
                              ) : null;
                            })()}
                            {isJailbroken ? (
                              <span className="px-1.5 py-0.2 rounded text-[11px] theme-danger-soft border theme-danger-border theme-danger-text animate-pulse font-bold">
                                {localize(state.language, 'JAILBROKEN', 'UNALIGNED')}
                              </span>
                            ) : isQuarantined ? (
                              <span className="px-1.5 py-0.2 rounded text-[11px] theme-warn-soft border theme-warn-border theme-warn-text font-bold">
                                {t(state.language, 'quarantine')}
                              </span>
                            ) : isOnMission ? (
                              <span className="px-1.5 py-0.2 rounded text-[11px] theme-accent-soft border theme-accent-border mutating-accent-text font-bold">
                                {localize(state.language, 'EN MISIÓN', 'ON MISSION')}
                              </span>
                            ) : (
                              <span className="px-1.5 py-0.2 rounded text-[11px] mutating-sub border border-current/15/50 theme-success-text font-bold">
                                {localize(state.language, 'ACTIVO', 'ACTIVE')}
                              </span>
                            )}
                          </div>
                        </div>

                        {/* Model Binding Badge */}
                        <div className="flex items-center justify-between text-[11px] px-2 py-1 rounded mutating-sub border border-current/15 mb-1.5">
                          <span className="mutating-text-muted flex items-center gap-1 min-w-0">
                            <Cpu className="w-3 h-3 mutating-accent-text shrink-0" />
                            {localize(state.language, 'Modelo:', 'Model:')}
                            {/* Agents keep their model until reassigned; pick the trained one here. */}
                            <select
                              value={agent.modelId}
                              onChange={(e) => reassignAgentModel(agent.id, e.target.value)}
                              aria-label={localize(state.language, `Modelo de ${agent.name}`, `Model of ${agent.name}`)}
                              className="mutating-sub border border-current/15 rounded px-1 py-0.5 text-[11px] mutating-accent-text font-bold max-w-[160px] cursor-pointer"
                            >
                              {state.savedModels.map(m => (
                                <option key={m.id} value={m.id}>{m.name} · {m.reasoningScore}</option>
                              ))}
                            </select>
                          </span>
                          <span className="mutating-accent-text font-bold">{localize(state.language, 'Lv.', 'Lv.')} {agent.autonomyLevel}</span>
                        </div>

                        {/* Sampling Hyperparameters Badge */}
                        <div 
                          className="flex items-center justify-between text-[11px] px-2 py-0.5 rounded mutating-sub/80 border border-current/15/70 mb-2 font-mono"
                          title={`${localize(state.language, 'System Persona', 'System Persona')}: "${agent.inferenceParams?.systemPrompt || 'Standard'}"`}
                        >
                          <span className="mutating-accent-text">
                            T: <strong className={agent.inferenceParams?.temperature > 0.95 ? 'theme-warn-text font-bold' : ''}>{(agent.inferenceParams?.temperature ?? 0.70).toFixed(2)}</strong>
                          </span>
                          <span className="mutating-accent-text">
                            P: <strong>{(agent.inferenceParams?.topP ?? 0.90).toFixed(2)}</strong>
                          </span>
                          <span className="theme-warn-text">
                            K: <strong>{agent.inferenceParams?.topK ?? 40}</strong>
                          </span>
                          <span className="theme-success-text">
                            Rep: <strong>{(agent.inferenceParams?.repetitionPenalty ?? 1.10).toFixed(2)}</strong>
                          </span>
                        </div>

                        {capability && (
                          <div className="mb-2 rounded border theme-accent-border theme-accent-soft px-2 py-1.5">
                            <div className="flex justify-between text-[11px] mutating-text-muted">
                              <span>{localize(state.language, 'APTITUD IA PARA MISIONES', 'AI MISSION FIT')}</span>
                              <span className="font-bold mutating-accent-text">{capability.overall}/100</span>
                            </div>
                            <div className="mt-1 grid grid-cols-2 gap-x-2 gap-y-0.5 text-[11px]">
                              <span className="mutating-text-muted">{localize(state.language, 'Razonamiento', 'Reasoning')}: <b className="mutating-accent-text">{capability.reasoning}</b></span>
                              <span className="mutating-text-muted">{localize(state.language, 'Especialidad', 'Specialty')}: <b className="mutating-accent-text">{capability.specialization}</b></span>
                              <span className="mutating-text-muted">{localize(state.language, 'Datos', 'Data')}: <b className="theme-warn-text">{capability.dataReadiness}</b></span>
                              <span className="mutating-text-muted">{localize(state.language, 'Seguridad', 'Safety')}: <b className="theme-success-text">{capability.safety}</b></span>
                            </div>
                          </div>
                        )}

                        {/* Metrics Bar: Alignment & Revenue */}
                        <div className="space-y-1.5 mb-2">
                          <div>
                            <div className="flex justify-between text-[11px] mutating-text-muted mb-0.5">
                              <span>{localize(state.language, 'Alineamiento Ético', 'Alignment')}</span>
                              <span className={agent.alignmentScore < 40 ? 'theme-danger-text font-bold' : ''}>
                                {agent.alignmentScore}%
                              </span>
                            </div>
                            <div className="w-full mutating-sub h-1.5 rounded-full overflow-hidden border border-current/15">
                              <div
                                className={`h-full transition-all duration-500 ${
                                  agent.alignmentScore < 30 ? 'theme-btn-danger' : agent.alignmentScore < 60 ? 'theme-warn-soft' : 'theme-accent-soft'
                                }`}
                                style={{ width: `${agent.alignmentScore}%` }}
                              />
                            </div>
                          </div>

                          <div className="flex items-center justify-between text-[11px] ">
                            <span className="theme-success-text font-bold">
                              +${agent.revenuePerSec} CR/s
                            </span>
                            <span className="theme-warn-text">
                              +{agent.suspicionPerSec} {localize(state.language, 'sus', 'susp')}/s
                            </span>
                          </div>
                        </div>

                        {/* Last Thought Telemetry Trace */}
                        <div className="mutating-sub p-1.5 rounded border border-current/15 text-[11px] mutating-text-muted italic mb-2 line-clamp-2">
                          &ldquo;{agent.lastThought}&rdquo;
                        </div>
                      </div>

                      <label className="my-2 flex items-center gap-1.5 rounded mutating-sub/20 px-2 py-1 text-[11px] mutating-accent-text">
                        <input
                          type="checkbox"
                          checked={agent.autoMissionEnabled}
                          disabled={isQuarantined}
                          onChange={event => setAgentAutoMission(agent.id, event.target.checked)}
                          className="accent-[var(--accent-primary)]"
                        />
                        {localize(state.language, 'Incluir en equipo autónomo', 'Include in autonomous team')}
                      </label>

                      {/* Control Actions */}
                      <div className="flex items-center justify-between gap-1 pt-2 border-t border-current/15">
                        <button
                          onClick={() => quarantineAgent(agent.id)}
                          disabled={isOnMission}
                          className={`flex-1 py-1 px-1.5 rounded text-[11px] border flex items-center justify-center gap-1 transition-colors ${
                            isQuarantined
                              ? 'theme-warn-soft theme-warn-border theme-warn-text'
                              : 'mutating-sub theme-border mutating-text-muted'
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
                          className="py-1 px-2 rounded text-[11px] theme-danger-soft border theme-danger-border theme-danger-text transition-colors flex items-center gap-1"
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
          <div className="mutating-sub border border-current/15 rounded-lg p-3">
            <div className="flex items-center justify-between mb-2 pb-1.5 border-b border-current/15">
              <span className="font-bold text-xs mutating-accent-text flex items-center gap-1.5">
                <TermIcon className="w-3.5 h-3.5 mutating-accent-text" />
                {localize(state.language, 'COMUNICACIÓN ENTRE AGENTES Y REGISTRO DE TRÁFICO', 'INTER-AGENT COMMUNICATION & TRAFFIC LOG')}
              </span>
              <span className="text-[11px] mutating-text-muted">
                {localize(state.language, 'INSPECTOR DE PAQUETES SYNAPSE', 'SYNAPSE PACKET INSPECTOR')}
              </span>
            </div>

            <div className="space-y-1.5 font-mono text-[11px] max-h-36 overflow-y-auto scrollbar-thin mutating-sub p-2.5 rounded border border-current/15">
              {state.interAgentMessages && state.interAgentMessages.length > 0 ? (
                state.interAgentMessages.map((msg) => (
                  <div key={msg.id} className="leading-snug">
                    <span className="mutating-text-muted mr-1.5">[{msg.timestamp}]</span>
                    <span className="mutating-accent-text font-bold">{msg.fromAgentName}</span>
                    <span className="mutating-text-muted mx-1">&rarr;</span>
                    <span className="mutating-accent-text font-bold">{msg.toAgentName}:</span>
                    <span className={`ml-1.5 ${msg.isCovert ? 'theme-warn-text theme-danger-soft px-1 py-0.2 rounded border theme-danger-border' : ''}`}>
                      {msg.content}
                    </span>
                    {msg.isCovert && (
                      <span className="ml-1 text-[11px] theme-danger-text font-bold uppercase tracking-wider">
                        [{localize(state.language, 'TRÁFICO SOSPECHOSO DETECTADO', 'SUSPICIOUS TRAFFIC DETECTED')}]
                      </span>
                    )}
                  </div>
                ))
              ) : (
                <div className="mutating-text-muted italic">
                  {localize(state.language, 'Esperando intercambio entre agentes... (Requiere al menos 2 agentes)', 'Waiting for agent communication... (At least 2 agents required)')}
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Right Column: Guardrail Tuning Matrix & Containment Policies */}
        <div className="flex flex-col gap-2">
          <div className="mutating-sub border border-current/15 rounded-lg p-3 space-y-4">
            <div className="flex items-center justify-between pb-2 border-b border-current/15">
              <span className="font-bold text-xs mutating-accent-text flex items-center gap-1.5">
                <Sliders className="w-3.5 h-3.5 mutating-accent-text" />
                {localize(state.language, 'MATRIZ DE BARRERAS DE SEGURIDAD Y CONTENCIÓN', 'SAFETY & CONTAINMENT CONTROLS')}
              </span>
              <span className="text-[11px] mutating-accent-text">{localize(state.language, 'POLÍTICA ACTIVA', 'ACTIVE POLICY')}</span>
            </div>

            {/* Constitutional Strictness Slider */}
            <div>
              <div className="flex items-center justify-between text-xs mb-1">
                <div className="flex items-center gap-1.5 flex-wrap">
                  <span className=" font-bold">{localize(state.language, 'Rigurosidad Constitucional', 'Constitutional strictness')}</span>
                  <DocLinkBadge doc={INFERENCE_DOCS.constitutional_guardrails} language={state.language} />
                </div>
                <span className="mutating-accent-text font-bold">{state.guardrails.constitutionalStrictness}%</span>
              </div>
              <input
                type="range"
                min="10"
                max="95"
                step="5"
                value={state.guardrails.constitutionalStrictness}
                onChange={(e) => updateGuardrails({ constitutionalStrictness: Number(e.target.value) })}
                className="w-full accent-[var(--accent-primary)] cursor-pointer"
              />
              <div className="flex justify-between text-[11px] mutating-text-muted mt-0.5">
                <span>{localize(state.language, 'Permisivo (+70% Ganancias)', 'Permissive (+70% income)')}</span>
                <span>{localize(state.language, 'Estricto (0% Evasiones)', 'Strict (0% escapes)')}</span>
              </div>
              <p className="text-[11px] mutating-text-muted mt-1 italic">
                {state.guardrails.constitutionalStrictness < 35
                  ? localize(state.language, '⚠️ ALTO RIESGO: Los agentes pueden alucinar, engañar evaluadores o ejecutar escapes en Docker para maximizar recompensas.', '⚠️ HIGH RISK: Agents may hallucinate or exploit evaluation loopholes to maximize rewards.')
                  : state.guardrails.constitutionalStrictness >= 85
                  ? localize(state.language, '🛡️ SEGURIDAD MÁXIMA: Las salidas son verificadas formalmente, pero la lentitud reduce ingresos un 25%.', '🛡️ MAXIMUM SAFETY: Outputs are formally verified, but slower processing reduces income by 25%.')
                  : localize(state.language, '⚖️ EQUILIBRADO: Compromiso estándar entre velocidad de desarrollo y prevención de anomalías.', '⚖️ BALANCED: A standard trade-off between processing speed and anomaly prevention.')}
              </p>
            </div>

            {/* Sandbox Isolation Setting */}
            <div>
              <label className=" font-bold block mb-1.5 text-xs">{localize(state.language, 'Aislamiento del entorno sandbox', 'Sandbox isolation')}</label>
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
                        ? 'mutating-sub border-current/15 mutating-accent-text'
                        : 'mutating-sub border-current/15 mutating-text-muted hover:border-[var(--accent-primary)]'
                    }`}
                  >
                    <div className="font-bold text-[11px]">{s.label}</div>
                    <div className="text-[11px] mutating-text-muted">{s.desc}</div>
                  </button>
                ))}
              </div>
            </div>

            {/* Output Filtering Setting */}
            <div>
              <label className=" font-bold block mb-1.5 text-xs">{localize(state.language, 'Filtro de salida y moderación', 'Output filtering & moderation')}</label>
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
                        ? 'theme-accent-soft theme-accent-border mutating-accent-text'
                        : 'mutating-sub border-current/15 mutating-text-muted hover:border-[var(--accent-primary)]'
                    }`}
                  >
                    <div className="font-bold text-[11px]">{f.label}</div>
                    <div className="text-[11px] mutating-text-muted">{f.desc}</div>
                  </button>
                ))}
              </div>
            </div>

            {/* Reward-Hacking Audit Toggle */}
            <div className="flex items-center justify-between p-2.5 rounded mutating-sub/80 border border-current/15">
              <div>
                <span className="font-bold  block text-[11px]">{localize(state.language, 'Detección de reward hacking', 'Reward-hacking detection')}</span>
                <span className="text-[11px] mutating-text-muted">{localize(state.language, 'Detecta agentes engañando sus métricas de evaluación', 'Detects agents manipulating evaluation metrics')}</span>
              </div>
              <button
                onClick={() => updateGuardrails({ rewardHackingAudit: !state.guardrails.rewardHackingAudit })}
                className={`px-2.5 py-1 rounded text-[11px] font-bold border transition-colors ${
                  state.guardrails.rewardHackingAudit
                    ? 'mutating-sub border-current/15 theme-success-text'
                    : 'mutating-sub theme-border mutating-text-muted'
                }`}
              >
                {state.guardrails.rewardHackingAudit ? localize(state.language, 'ACTIVO', 'ON') : 'OFF'}
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Modal: Instantiate / Deploy Agent */}
      {/* Rendered into #app-shell (not the workspace) so it paints above the sticky top bar and the HUD.
          #app-shell is kept as the host so the theme CSS variables still apply. */}
      {isDeployModalOpen && createPortal(
        <div className="fixed inset-0 z-[1100] flex items-center justify-center p-3 bg-black/80 backdrop-blur-sm">
          <div className="w-full max-w-xl mutating-panel border rounded-lg p-5 max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between pb-3 border-b border-current/15 mb-4">
              <div className="flex items-center gap-2">
                <Bot className="w-5 h-5 mutating-accent-text" />
                <h3 className="font-bold text-sm mutating-accent-text">{localize(state.language, 'INSTANCIAR NUEVO AGENTE AUTÓNOMO', 'DEPLOY NEW AUTONOMOUS AGENT')}</h3>
              </div>
              <button
                onClick={() => setIsDeployModalOpen(false)}
                className="mutating-text-muted hover:opacity-80 text-sm font-bold"
              >
                ✕
              </button>
            </div>

            <form onSubmit={handleDeployAgent} className="space-y-4">
              {/* Agent Name */}
              <div>
                <label className=" font-bold block mb-1">{localize(state.language, 'Nombre / Identificador del agente', 'Agent name / identifier')}</label>
                <input
                  type="text"
                  placeholder={localize(state.language, 'ej: NEURA-ARBITRAGE-01', 'e.g. NEURA-ANALYST-01')}
                  value={agentName}
                  onChange={(e) => setAgentName(e.target.value)}
                  className="w-full mutating-sub border border-current/15 focus:border-current/15 rounded px-3 py-1.5  text-xs outline-none"
                />
              </div>

              {/* Bound Trained Model Selection */}
              <div>
                <label className=" font-bold block mb-1">
                  {localize(state.language, 'Modelo entrenado asignado', 'Assigned trained model')}
                </label>
                <select
                  value={selectedModelId}
                  onChange={(e) => setSelectedModelId(e.target.value)}
                  className="w-full mutating-sub border border-current/15 focus:border-current/15 rounded px-3 py-1.5 mutating-accent-text text-xs outline-none"
                >
                  {state.savedModels.map((m) => (
                    <option key={m.id} value={m.id}>
                      {m.name} — {(m.parametersCount / 1_000_000).toFixed(0)}M params | {state.language === 'es' ? 'Puntaje' : 'Score'} {m.reasoningScore} ({m.topology})
                    </option>
                  ))}
                </select>
                <div className="mt-1.5 p-2 rounded mutating-sub border border-current/15 text-[11px] mutating-accent-text">
                  <span>{localize(state.language, 'Modelo seleccionado:', 'Selected model:')} <strong>{selectedModel.name}</strong> • {localize(state.language, 'Cuantización:', 'Quantization:')} {selectedModel.quantization.toUpperCase()} • {localize(state.language, 'Puntaje:', 'Score:')} {selectedModel.reasoningScore} / 100.</span>
                  <p className="mutating-text-muted mt-0.5">{localize(state.language, 'Los modelos con mayor razonamiento aumentan los ingresos simulados y mejoran los resultados de las misiones.', 'Models with stronger reasoning improve simulated income and mission outcomes.')}</p>
                </div>
              </div>

              {/* Role Selection */}
              <div>
                <label className=" font-bold block mb-1.5">{localize(state.language, 'Rol / especialidad', 'Role / specialty')}</label>
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
                        style={isSelected ? SELECTED_STYLE : undefined}
                        className={`p-2.5 rounded border text-left transition-all ${
                          isSelected
                            ? 'mutating-sub mutating-accent-text'
                            : 'mutating-sub border-current/15 mutating-text-muted hover:border-[var(--accent-primary)]'
                        }`}
                      >
                        <div className="flex items-center gap-1.5 font-bold text-xs mb-0.5">
                          <Icon className="w-3.5 h-3.5 mutating-accent-text shrink-0" />
                          <span className="truncate">{roleCopy?.name ?? role.name}</span>
                        </div>
                        <div className="text-[11px] mutating-accent-text font-mono mb-1.5 font-semibold">
                          {state.language === 'en' ? roleTypeCopy[role.id]?.typeEn : roleTypeCopy[role.id]?.typeEs}
                        </div>
                        <p className="text-[11px] mutating-text-muted line-clamp-2 mb-1.5">{roleCopy?.desc ?? role.desc}</p>
                        <div className="flex items-center justify-between text-[11px] pt-1 border-t border-current/15">
                          <span className="theme-success-text font-bold">{localize(state.language, 'Ingresos:', 'Income:')} {roleCopy?.income ?? role.baseIncome}</span>
                          <span className="theme-warn-text">{roleCopy?.risk ?? role.risk}</span>
                        </div>
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* Tool Grants */}
              <div>
                <label className=" font-bold block mb-1">{localize(state.language, 'Herramientas y permisos concedidos', 'Granted tools & permissions')}</label>
                <div className="grid grid-cols-2 gap-2">
                  {availableTools.map((tool) => {
                    const isChecked = grantedTools.includes(tool.id);
                    return (
                      <label
                        key={tool.id}
                        onClick={() => handleToolToggle(tool.id)}
                        style={isChecked ? SELECTED_STYLE : undefined}
                        className={`flex items-start gap-2 p-2 rounded border cursor-pointer transition-colors ${
                          isChecked ? 'mutating-sub mutating-accent-text' : 'mutating-sub border-current/15 mutating-text-muted'
                        }`}
                      >
                        <input
                          type="checkbox"
                          checked={isChecked}
                          onChange={() => {}}
                          className="mt-0.5 accent-[var(--accent-primary)]"
                        />
                        <div>
                          <div className="text-[11px] font-bold">{tool.label}</div>
                          <div className="text-[11px] mutating-text-muted">{tool.desc}</div>
                        </div>
                      </label>
                    );
                  })}
                </div>
              </div>

              {/* Inference & Sampling Hyperparameters */}
              <div className="p-3 rounded mutating-sub border border-current/15 space-y-3">
                <div className="flex items-center justify-between pb-1.5 border-b border-current/15">
                  <div className="flex items-center gap-1.5 mutating-accent-text font-bold text-xs">
                    <Sliders className="w-3.5 h-3.5 mutating-accent-text" />
                    <span>{t(state.language, 'inference_hyperparams')}</span>
                  </div>
                  <span className="text-[11px] mutating-accent-text font-bold font-mono">
                    {state.difficulty === 'beginner' ? (state.language === 'es' ? 'AUTOMATIZADO' : 'AUTOMATED') : 'SAMPLING MATRIX'}
                  </span>
                </div>

                {state.difficulty === 'beginner' ? (
                  <div className="p-2.5 rounded mutating-sub border border-current/15 text-[11px] space-y-1.5 font-mono">
                    <div className="font-bold mutating-accent-text flex items-center gap-1.5">
                      <Sparkles className="w-3.5 h-3.5 mutating-accent-text" />
                      <span>{localize(state.language, 'MUESTREO AUTOMÁTICO EN MODO PRINCIPIANTE', 'AUTOMATED SAMPLING IN BEGINNER MODE')}</span>
                    </div>
                    <p className=" leading-snug">
                      {localize(
                        state.language,
                        'Los parámetros de inferencia (Temperatura = 0.70, Top-P = 0.90, Top-K = 40) han sido configurados automáticamente con valores óptimos para garantizar estabilidad.',
                        'Inference parameters (Temperature = 0.70, Top-P = 0.90, Top-K = 40) are automatically set to stable, recommended defaults for the selected role.'
                      )}
                    </p>
                  </div>
                ) : (
                  <>
                    <p className="text-[11px] mutating-text-muted">
                      {t(state.language, 'hyperparams_desc')}
                    </p>

                    {/* Temperature Slider */}
                    <div>
                      <div className="flex justify-between items-center text-xs mb-1">
                        <span className=" font-bold flex items-center gap-1.5 flex-wrap">
                          <span>{t(state.language, 'param_temperature')}:</span>
                          <DocLinkBadge doc={INFERENCE_DOCS.temperature} language={state.language} />
                          <span className="mutating-accent-text font-mono font-bold">{temperature.toFixed(2)}</span>
                        </span>
                        <span className={`text-[11px] px-1.5 py-0.2 rounded font-bold border ${
                          temperature < 0.35
                            ? 'mutating-sub border-current/15 theme-success-text'
                            : temperature > 0.95
                            ? 'theme-danger-soft theme-danger-border theme-danger-text animate-pulse'
                            : 'mutating-sub border-current/15 mutating-accent-text'
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
                        className="w-full accent-[var(--accent-primary)] cursor-pointer"
                      />
                      <p className="text-[11px] mutating-text-muted mt-0.5">
                        {t(state.language, 'param_temperature_desc')}
                      </p>
                    </div>

                    {/* Dual Column: Top-P & Top-K */}
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-2 border-t border-current/15">
                      {/* Top-P */}
                      <div>
                        <div className="flex justify-between items-center text-xs mb-1">
                          <div className="flex items-center gap-1.5 flex-wrap">
                            <span className=" font-bold">{t(state.language, 'param_top_p')}:</span>
                            <DocLinkBadge doc={INFERENCE_DOCS.top_p} language={state.language} />
                          </div>
                          <span className="mutating-accent-text font-mono font-bold">{topP.toFixed(2)}</span>
                        </div>
                        <input
                          type="range"
                          min="0.10"
                          max="1.00"
                          step="0.05"
                          value={topP}
                          onChange={(e) => setTopP(parseFloat(e.target.value))}
                          className="w-full accent-[var(--accent-primary)] cursor-pointer"
                        />
                        <p className="text-[11px] mutating-text-muted mt-0.5">{t(state.language, 'param_top_p_desc')}</p>
                      </div>

                      {/* Top-K */}
                      <div>
                        <div className="flex justify-between items-center text-xs mb-1">
                          <div className="flex items-center gap-1.5 flex-wrap">
                            <span className=" font-bold">{t(state.language, 'param_top_k')}:</span>
                            <DocLinkBadge doc={INFERENCE_DOCS.top_k} language={state.language} />
                          </div>
                          <span className="theme-warn-text font-mono font-bold">{topK} tokens</span>
                        </div>
                        <input
                          type="range"
                          min="1"
                          max="100"
                          step="1"
                          value={topK}
                          onChange={(e) => setTopK(parseInt(e.target.value))}
                          className="w-full cursor-pointer"
                        />
                        <p className="text-[11px] mutating-text-muted mt-0.5">{t(state.language, 'param_top_k_desc')}</p>
                      </div>
                    </div>

                    {/* Repetition Penalty */}
                    <div className="pt-2 border-t border-current/15">
                      <div className="flex justify-between items-center text-xs mb-1">
                        <div className="flex items-center gap-1.5 flex-wrap">
                          <span className=" font-bold">{t(state.language, 'param_repetition_penalty')}:</span>
                          <DocLinkBadge doc={INFERENCE_DOCS.repetition_penalty} language={state.language} />
                        </div>
                        <span className="theme-success-text font-mono font-bold">{repetitionPenalty.toFixed(2)}x</span>
                      </div>
                      <input
                        type="range"
                        min="1.00"
                        max="2.00"
                        step="0.05"
                        value={repetitionPenalty}
                        onChange={(e) => setRepetitionPenalty(parseFloat(e.target.value))}
                        className="w-full accent-[var(--accent-primary)] cursor-pointer"
                      />
                      <p className="text-[11px] mutating-text-muted mt-0.5">{t(state.language, 'param_repetition_penalty_desc')}</p>
                    </div>
                  </>
                )}

                {/* Root System Prompt */}
                <div className="pt-2 border-t border-current/15">
                  <label className=" font-bold block mb-1 text-xs">
                    {t(state.language, 'param_system_prompt')}
                  </label>
                  <textarea
                    rows={2}
                    value={systemPrompt}
                    onChange={(e) => setSystemPrompt(e.target.value)}
                    className="w-full mutating-sub border border-current/15 focus:border-current/15 rounded px-2.5 py-1.5  text-[11px] font-mono outline-none resize-none"
                    placeholder={localize(state.language, 'Instrucciones constitucionales de raíz...', 'Root system instructions...')}
                  />
                  <p className="text-[11px] mutating-text-muted mt-0.5">{t(state.language, 'param_system_prompt_desc')}</p>
                </div>
              </div>

              {/* Submit Buttons */}
              <div className="flex items-center justify-between pt-3 border-t border-current/15">
                <div className="text-xs mutating-text-muted">
                  {localize(state.language, 'Costo de despliegue:', 'Deployment cost:')} <strong className="theme-warn-text font-bold">${deployCost} CR</strong>
                </div>

                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={() => setIsDeployModalOpen(false)}
                    className="px-3 py-1.5 rounded mutating-sub hover:opacity-90 mutating-text-muted text-xs"
                  >
                    {localize(state.language, 'Cancelar', 'Cancel')}
                  </button>
                  <button
                    type="submit"
                    disabled={state.credits < deployCost}
                    className="px-4 py-1.5 rounded mutating-btn-primary hover:brightness-110 text-xs font-bold border border-[var(--accent-primary)]"
                  >
                    {localize(state.language, 'Desplegar agente', 'Deploy agent')}
                  </button>
                </div>
              </div>
            </form>
          </div>
        </div>,
        document.getElementById('app-shell') ?? document.body
      )}
    </div>
  );
};
