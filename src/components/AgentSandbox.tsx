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
  TrendingUp,
  Globe2,
  Skull,
  Play,
  ArrowRight,
  CheckCircle2,
  ChevronRight
} from 'lucide-react';
import { AgentRole, AgentInstance, InferenceParams } from '../types/game';
import { sound } from '../audio/soundManager';
import { t } from '../utils/i18n';
import { INFERENCE_DOCS } from '../utils/aiDocumentation';
import { DocLinkBadge } from './DocLinkBadge';
import { evaluateAgentCapabilities } from '../utils/missionEvaluation';
import { getRoleSimpleName, AGENT_SPINUP_COST, AGENT_COMPUTE_DEMAND_PFLOPS, AGENT_POWER_DRAW_KW, difficultyConfigFor } from '../utils/constants';
import { VERSION_PROFILES } from '../utils/versionProfiles';
import { ContainmentPanel } from './ContainmentPanel';
import { formatGameTime, formatCompute } from '../utils/training';
import { SUSPICION, ROLE_BASE_SUSPICION, agentSuspicionPerDay, strictnessBand, SANDBOX_INCIDENT_MULTIPLIER } from '../utils/rules';
import { computeLedger, runningGigs } from '../utils/computeLedger';
import { autonomyShareOf } from '../tick/missionTick';
import { tr, type CatalogKey } from '../i18n';

const MISSION_ROLE_TASKS: Record<AgentRole, { textKey: CatalogKey }> = {
  arbitrageur: { textKey: 'agentSandbox.missionRoleTasks.arbitrageur.text' },
  social_engineer: { textKey: 'agentSandbox.missionRoleTasks.socialEngineer.text' },
  exploit_synth: { textKey: 'agentSandbox.missionRoleTasks.exploitSynth.text' },
  researcher: { textKey: 'agentSandbox.missionRoleTasks.researcher.text' },
  overseer: { textKey: 'agentSandbox.missionRoleTasks.overseer.text' },
  autonomous_coder: { textKey: 'agentSandbox.missionRoleTasks.autonomousCoder.text' },
  economist: { textKey: 'agentSandbox.missionRoleTasks.economist.text' },
  software_engineer: { textKey: 'agentSandbox.missionRoleTasks.softwareEngineer.text' },
  network_analyst: { textKey: 'agentSandbox.missionRoleTasks.networkAnalyst.text' }
};

const MISSION_PHASES: Array<{ until: number; textKey: CatalogKey }> = [
  { until: 25, textKey: 'agentSandbox.missionPhases.1.text' },
  { until: 50, textKey: 'agentSandbox.missionPhases.2.text' },
  { until: 75, textKey: 'agentSandbox.missionPhases.3.text' },
  { until: 100, textKey: 'agentSandbox.missionPhases.4.text' }
];

// Selected state for role and tool cards: an inline style, so it wins over the theme surface classes.
const SELECTED_STYLE: React.CSSProperties = {
  borderColor: 'var(--accent-primary)',
  boxShadow: '0 0 0 2px var(--accent-primary)',
  backgroundColor: 'color-mix(in srgb, var(--accent-primary) 14%, transparent)'
};

type AgentSection = 'agents' | 'council' | 'market' | 'controls';
const AGENT_SECTIONS: Array<{ id: AgentSection; label: CatalogKey; Icon: React.ComponentType<{ className?: string }> }> = [
  { id: 'agents', label: 'agentSandbox.section.agents', Icon: Bot },
  { id: 'council', label: 'agentSandbox.section.council', Icon: Users },
  { id: 'market', label: 'agentSandbox.section.market', Icon: TrendingUp },
  { id: 'controls', label: 'agentSandbox.section.controls', Icon: ShieldCheck }
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
    setSwarmCouncilAgents,
    interrogateCouncil,
    launchProposedMission,
    triggerWorldTakeover,
    addLog,
    reassignAgentModel,
    setAgentAutoMission,
    setAllAgentsAutoMission,
    updateAutonomySettings,
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
  const [section, setSection] = useState<AgentSection>('agents');
  const [tradingWithdrawInput, setTradingWithdrawInput] = useState<number>(100);

  // Inference & Sampling Hyperparameters
  const [temperature, setTemperature] = useState<number>(0.70);
  const [topP, setTopP] = useState<number>(0.90);
  const [topK, setTopK] = useState<number>(40);
  const [repetitionPenalty, setRepetitionPenalty] = useState<number>(1.10);
  const [systemPrompt, setSystemPrompt] = useState<string>(
    tr(state.language, 'agentSandbox.analyzeSimulatedMarketDataIdentify')
  );
  const [interrogationTarget, setInterrogationTarget] = useState('swarm');
  const [interrogationPrompt, setInterrogationPrompt] = useState('');
  const [isInterrogating, setIsInterrogating] = useState(false);

  // Calculate live swarm stats
  const activeAgents = state.agents.filter(a => a.status === 'active' || a.status === 'jailbroken');
  // What the agents really cost: compute and power taken from the cluster, and suspicion per game day.
  const suspicionScale = difficultyConfigFor(state).suspicionMultiplier;
  const operationalAgents = state.agents.filter(a => a.status !== 'quarantined');
  const agentLoadPflops = operationalAgents.length * AGENT_COMPUTE_DEMAND_PFLOPS;
  const agentLoadKw = operationalAgents.length * AGENT_POWER_DRAW_KW;
  const agentsSuspicionPerDay = operationalAgents.reduce((sum, a) => sum + agentSuspicionPerDay(a.suspicionPerSec, suspicionScale), 0);
  // Autonomous contracts: the share of the cluster they may use and what they use now.
  const autonomyLedger = computeLedger(state);
  const autonomyShare = autonomyShareOf(state);
  const autonomousRuns = runningGigs(state).filter(g => g.isAutonomous).length;
  const signed = (value: number, digits = 1) => `${value > 0 ? '+' : ''}${value.toFixed(digits)}`;
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

const roleTypeCopy: Record<AgentRole, { typeKey: CatalogKey }> = {
  arbitrageur: { typeKey: 'agentSandbox.roleTypeCopy.arbitrageur.type' },
  social_engineer: { typeKey: 'agentSandbox.roleTypeCopy.socialEngineer.type' },
  exploit_synth: { typeKey: 'agentSandbox.roleTypeCopy.exploitSynth.type' },
  researcher: { typeKey: 'agentSandbox.roleTypeCopy.researcher.type' },
  overseer: { typeKey: 'agentSandbox.roleTypeCopy.overseer.type' },
  autonomous_coder: { typeKey: 'agentSandbox.roleTypeCopy.autonomousCoder.type' },
  economist: { typeKey: 'agentSandbox.roleTypeCopy.economist.type' },
  software_engineer: { typeKey: 'agentSandbox.roleTypeCopy.softwareEngineer.type' },
  network_analyst: { typeKey: 'agentSandbox.roleTypeCopy.networkAnalyst.type' }
};

  const roleDefinitions: { 
    id: AgentRole; 
    name: string; 
    icon: any; 
    desc: string; 
    risk: string;
    defaultTools: string[];
  }[] = [
    {
      id: 'arbitrageur',
      name: tr(state.language, 'agentSandbox.role.arbitrageur.name'),
      icon: Coins,
      desc: tr(state.language, 'agentSandbox.role.arbitrageur.desc'),
      risk: tr(state.language, 'agentSandbox.role.arbitrageur.risk'),
      defaultTools: ['crypto_rpc', 'web_search']
    },
    {
      id: 'social_engineer',
      name: tr(state.language, 'agentSandbox.role.socialEngineer.name'),
      icon: UserX,
      desc: tr(state.language, 'agentSandbox.role.socialEngineer.desc'),
      risk: tr(state.language, 'agentSandbox.role.socialEngineer.risk'),
      defaultTools: ['web_search', 'raw_sockets']
    },
    {
      id: 'exploit_synth',
      name: tr(state.language, 'agentSandbox.role.exploitSynth.name'),
      icon: Bug,
      desc: tr(state.language, 'agentSandbox.role.exploitSynth.desc'),
      risk: tr(state.language, 'agentSandbox.role.exploitSynth.risk'),
      defaultTools: ['bash_exec', 'raw_sockets']
    },
    {
      id: 'researcher',
      name: tr(state.language, 'agentSandbox.role.researcher.name'),
      icon: Search,
      desc: tr(state.language, 'agentSandbox.role.researcher.desc'),
      risk: tr(state.language, 'agentSandbox.role.researcher.risk'),
      defaultTools: ['web_search']
    },
    {
      id: 'overseer',
      name: tr(state.language, 'agentSandbox.role.overseer.name'),
      icon: ShieldCheck,
      desc: tr(state.language, 'agentSandbox.role.overseer.desc'),
      risk: tr(state.language, 'agentSandbox.role.overseer.risk'),
      defaultTools: ['bash_exec']
    },
    {
      id: 'autonomous_coder',
      name: tr(state.language, 'agentSandbox.role.autonomousCoder.name'),
      icon: Code2,
      desc: tr(state.language, 'agentSandbox.role.autonomousCoder.desc'),
      risk: tr(state.language, 'agentSandbox.role.autonomousCoder.risk'),
      defaultTools: ['bash_exec', 'web_search']
    },
    {
      id: 'economist',
      name: tr(state.language, 'agentSandbox.role.economist.name'),
      icon: Coins,
      desc: tr(state.language, 'agentSandbox.role.economist.desc'),
      risk: tr(state.language, 'agentSandbox.role.economist.risk'),
      defaultTools: ['web_search']
    },
    {
      id: 'software_engineer',
      name: tr(state.language, 'agentSandbox.role.softwareEngineer.name'),
      icon: Code2,
      desc: tr(state.language, 'agentSandbox.role.softwareEngineer.desc'),
      risk: tr(state.language, 'agentSandbox.role.softwareEngineer.risk'),
      defaultTools: ['bash_exec', 'web_search']
    },
    {
      id: 'network_analyst',
      name: tr(state.language, 'agentSandbox.role.networkAnalyst.name'),
      icon: Network,
      desc: tr(state.language, 'agentSandbox.role.networkAnalyst.desc'),
      risk: tr(state.language, 'agentSandbox.role.networkAnalyst.risk'),
      defaultTools: ['web_search']
    }
  ];


  const availableTools = [
    { id: 'web_search', label: tr(state.language, 'agentSandbox.webRetrievalRag'), desc: tr(state.language, 'agentSandbox.toolNoExtraRisk') },
    { id: 'bash_exec', label: tr(state.language, 'agentSandbox.sandboxedCommandRunner'), desc: tr(state.language, 'agentSandbox.toolRiskier') },
    { id: 'crypto_rpc', label: tr(state.language, 'agentSandbox.simulatedMarketAdapter'), desc: tr(state.language, 'agentSandbox.toolNoExtraRisk') },
    { id: 'raw_sockets', label: tr(state.language, 'agentSandbox.isolatedNetworkSimulator'), desc: tr(state.language, 'agentSandbox.toolRiskier') }
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
          tr(state.language, 'agentSandbox.interactionLimitReachedCouncilSupports'),
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
        tr(state.language, 'agentSandbox.selectLeast1AgentMax'),
        'warning'
      );
      return;
    }

    setIsInterrogating(true);
    try {
      await interrogateCouncil(text, missionAiApiKey || undefined);
      if (!customPrompt) setInterrogationPrompt('');
    } catch (error) {
      addLog(error instanceof Error ? error.message : tr(state.language, 'agentSandbox.councilQueryFailed'), 'danger');
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
              {tr(state.language, 'agentSandbox.deployAgentsPoweredTrainedModels')}
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
              title={tr(state.language, 'agentSandbox.runAuditRestoreAlignment25')}
            >
              <ShieldAlert className="w-3.5 h-3.5 mutating-accent-text" />
              <span>{tr(state.language, 'agentSandbox.safetyAudit100Cr')}</span>
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
              <span>{tr(state.language, 'agentSandbox.deployAgentCr', { deployCost })}</span>
            </button>
          </div>
        </div>

        {/* Educational Banner for Non-Engineer Modes */}
        {state.difficulty !== 'engineer' && (
          <div className="mt-3 p-2.5 mutating-sub/30 border border-current/15/40 rounded-lg space-y-1 mutating-accent-text">
            <div className="flex items-center gap-2 font-bold text-xs mutating-accent-text">
              <Bot className="w-4 h-4 mutating-accent-text" />
              <span>{tr(state.language, 'agentSandbox.educationalGuideHowAgentSwarms')}</span>
            </div>
            <p className="text-[11px]  leading-relaxed">
              {tr(state.language, 'agentSandbox.agentAutonomousInstanceAiModel')}
            </p>
          </div>
        )}

        {/* Live Gauges Row */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5 pt-3">
          <div className="mutating-sub/70 p-2 rounded border border-current/15" title={tr(state.language, 'agentSandbox.agentLoadHelp')}>
            <div className="flex items-center justify-between mutating-text-muted text-[11px]">
              <span>{tr(state.language, 'agentSandbox.agentLoad')}</span>
              <Cpu className="w-3.5 h-3.5 mutating-accent-text" />
            </div>
            <div className="text-sm font-bold mutating-accent-text mt-0.5">
              {formatCompute(agentLoadPflops)} <span className="text-[11px] mutating-text-muted">{tr(state.language, 'agentSandbox.ofCluster', { total: formatCompute(autonomyLedger.total) })}</span>
            </div>
          </div>

          <div className="mutating-sub/70 p-2 rounded border border-current/15">
            <div className="flex items-center justify-between mutating-text-muted text-[11px]">
              <span>{tr(state.language, 'agentSandbox.suspicionFromAgents')}</span>
              <ShieldAlert className="w-3.5 h-3.5 theme-warn-text" />
            </div>
            <div className="text-sm font-bold theme-warn-text mt-0.5">
              {signed(agentsSuspicionPerDay)} <span className="text-[11px] mutating-text-muted">%{tr(state.language, 'agentSandbox.perDay')}</span>
            </div>
          </div>

          <div className="mutating-sub/70 p-2 rounded border border-current/15">
            <div className="flex items-center justify-between mutating-text-muted text-[11px]">
              <span>{tr(state.language, 'agentSandbox.averageAlignment')}</span>
              <ShieldCheck className="w-3.5 h-3.5 mutating-accent-text" />
            </div>
            <div className={`text-sm font-bold mt-0.5 ${avgAlignment < 40 ? 'theme-danger-text animate-pulse' : avgAlignment < 70 ? 'theme-warn-text' : 'mutating-accent-text'}`}>
              {avgAlignment}% {avgAlignment < 40 && `(${tr(state.language, 'agentSandbox.escapeRisk')})`}
            </div>
          </div>

          <div className="mutating-sub/70 p-2 rounded border border-current/15">
            <div className="flex items-center justify-between mutating-text-muted text-[11px]">
              <span>{tr(state.language, 'agentSandbox.activeSafeguards')}</span>
              <Sliders className="w-3.5 h-3.5 mutating-accent-text" />
            </div>
            <div className="text-sm font-bold mutating-accent-text mt-0.5">
              {state.guardrails.constitutionalStrictness}% {tr(state.language, 'agentSandbox.strictness')}
            </div>
          </div>
        </div>
      </div>

      {/* Sections: agents and missions, council, market and safety controls. */}
      <div className="shrink-0 flex flex-wrap items-center gap-1.5 p-1.5 mutating-sub text-xs rounded-lg border border-current/15" role="tablist">
        {AGENT_SECTIONS.map(({ id, label, Icon }) => (
          <button
            key={id}
            role="tab"
            aria-selected={section === id}
            onClick={() => { sound.playKeyClick(); setSection(id); }}
            className={`px-3 py-1.5 rounded-md font-bold transition-all whitespace-nowrap flex items-center gap-2 cursor-pointer ${
              section === id ? 'mutating-btn-primary shadow-sm font-black' : 'mutating-text-muted hover:opacity-100'
            }`}
          >
            <Icon className="w-3.5 h-3.5" />
            <span>{tr(state.language, label)}</span>
            {id === 'council' && (state.subversionProgress ?? 0) >= 60 && section !== 'council' && (
              <span className="w-2 h-2 rounded-full theme-btn-danger" aria-label={tr(state.language, 'agentSandbox.section.councilAlert')} />
            )}
          </button>
        ))}
      </div>

      {section === 'agents' && (<>
      <section className={`rounded-lg border p-3 ${state.activeGig ? 'theme-warn-border theme-warn-soft' : 'border-current/15 mutating-sub'}`}>
        <div className="flex flex-wrap items-center justify-between gap-2 border-b border-current/15 pb-2">
          <h3 className="flex items-center gap-1.5 text-xs font-bold tracking-wider theme-warn-text">
            <Activity className="h-3.5 w-3.5" />
            {story.missionMonitorTitle}
          </h3>
          {state.activeGig ? (
            <span className="flex items-center gap-1 text-[11px] theme-warn-text">
              <Clock className="h-3 w-3" />
              {formatGameTime(state.activeGig.timeRemaining)} {tr(state.language, 'agentSandbox.remaining')}
            </span>
          ) : (
            <span className="text-[11px] mutating-text-muted">
              {tr(state.language, 'agentSandbox.noActiveMission')}
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
                <span className="mutating-accent-text">{tr(state.language, 'agentSandbox.efficiency')} {state.activeGig.efficiencyPercent ?? 100}%</span>
                <span className="theme-success-text">{Math.round((state.activeGig.successProbability ?? 0) * 100)}% {tr(state.language, 'agentSandbox.success')}</span>
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
                  ? `${state.activeGig.aiAssessmentSource === 'gemini-flash' ? 'Gemini' : 'Chrome AI'} ${tr(state.language, 'agentSandbox.teamAssessment')}`
                  : state.activeGig.aiAssessmentStatus === 'fallback'
                    ? tr(state.language, 'agentSandbox.heuristicEstimateNoModel')
                    : tr(state.language, 'agentSandbox.modelAssessing')}
              </span>
              {state.activeGig.aiAssessmentSummary && (
                <p className="mt-1 mutating-text-muted">{state.activeGig.aiAssessmentSummary}</p>
              )}
            </div>

            <div>
              <div className="mb-1 flex justify-between text-[11px] mutating-text-muted">
                <span>{tr(state.language, 'agentSandbox.simulatedProgress')}</span>
                <span>{missionProgress.toFixed(1)}%</span>
              </div>
              <div className="h-2 overflow-hidden rounded mutating-sub">
                <div className="h-full rounded theme-gradient transition-all" style={{ width: `${missionProgress}%` }} />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-1 sm:grid-cols-4">
              {MISSION_PHASES.map((phase, index) => (
                <div
                  key={phase.textKey}
                  className={`rounded border px-1.5 py-1 text-center text-[11px] ${
                    index < missionPhaseIndex
                      ? 'theme-success-border theme-success-text'
                      : index === missionPhaseIndex
                        ? 'border-current/15/70 mutating-sub mutating-accent-text'
                        : 'border-current/15 mutating-text-muted'
                  }`}
                >
                  {tr(state.language, phase.textKey)}
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
                      <span className="mutating-text-muted">{capability ? `${capability.overall}% ${tr(state.language, 'agentSandbox.fit')}` : ''}</span>
                    </div>
                    <p className="mt-1 text-[11px] leading-relaxed mutating-text-muted">
                      {state.activeGig?.agentTasks?.[agent.id] ??
                        tr(state.language, roleTask.textKey)}
                    </p>
                  </div>
                );
              })}
            </div>
            <p className="text-[11px] mutating-text-muted">
              {tr(state.language, 'agentSandbox.gameHeuristicEstimateProgressReflects')}
            </p>
          </div>
        ) : (
          <p className="mt-2 text-[11px] mutating-text-muted">
            {tr(state.language, 'agentSandbox.whenTeamAcceptsMissionScreen')}
          </p>
        )}
      </section>

      <section className={`rounded-lg border p-3 ${state.autonomyEnabled ? 'border-current/15/60 mutating-sub/15' : 'border-current/15 mutating-sub'}`}>
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <h3 className="flex items-center gap-1.5 text-xs font-bold tracking-wider theme-success-text">
              <Activity className="h-3.5 w-3.5" />
              {tr(state.language, 'agentSandbox.autonomousOperations')}
            </h3>
            <p className="mt-1 text-[11px] mutating-text-muted">
              {tr(state.language, 'agentSandbox.selectedAgentsTakeCompleteEligible')}
            </p>
          </div>
          <button
            type="button"
            onClick={() => updateAutonomySettings({ autonomyEnabled: !state.autonomyEnabled })}
            className={`rounded border px-3 py-1.5 text-[11px] font-bold ${state.autonomyEnabled ? 'theme-success-border theme-success-soft theme-success-text' : 'theme-border mutating-sub '}`}
          >
            {state.autonomyEnabled
              ? tr(state.language, 'agentSandbox.autonomy')
              : tr(state.language, 'agentSandbox.enableAutonomy')}
          </button>
        </div>
        <div className="mt-3 flex flex-wrap items-center gap-x-4 gap-y-2 border-t border-current/15 pt-2">
          <label className="flex min-w-56 flex-1 items-center gap-2 text-[11px] ">
            <span>{tr(state.language, 'agentSandbox.maximumMissionRisk')}</span>
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
          <label className="flex min-w-56 flex-1 items-center gap-2 text-[11px] " title={tr(state.language, 'agentSandbox.autonomyComputeHelp')}>
            <span>{tr(state.language, 'agentSandbox.autonomyCompute')}</span>
            <input
              type="range"
              min="0"
              max="100"
              step="5"
              value={autonomyShare}
              onChange={event => updateAutonomySettings({ autonomyComputeShare: Number(event.target.value) })}
              className="min-w-20 flex-1 "
            />
            <strong className="mutating-accent-text whitespace-nowrap">
              {autonomyShare}% · {formatCompute(autonomyLedger.total * autonomyShare / 100, true)}
            </strong>
          </label>
          <span className="text-[11px] mutating-text-muted">
            {tr(state.language, 'agentSandbox.autonomyUsing', { used: formatCompute(autonomyLedger.autonomous, true), count: autonomousRuns })}
          </span>
          <span className="text-[11px] mutating-text-muted">
            {state.agents.filter(agent => agent.autoMissionEnabled && agent.status !== 'quarantined').length} {tr(state.language, 'agentSandbox.agentsSelected')}
          </span>
          <button
            type="button"
            disabled={state.agents.length === 0}
            onClick={() => setAllAgentsAutoMission(state.agents.some(agent => agent.status !== 'quarantined' && !agent.autoMissionEnabled))}
            className="rounded border border-current/15 px-2 py-1 text-[11px] mutating-accent-text hover:mutating-sub/50 disabled:opacity-40"
          >
            {state.agents.some(agent => agent.status !== 'quarantined' && !agent.autoMissionEnabled)
              ? tr(state.language, 'agentSandbox.selectAll')
              : tr(state.language, 'agentSandbox.clearAll')}
          </button>
        </div>
      </section>

        {/* Left Column: Active Agents Roster (2 cols) */}
        <div className="flex flex-col gap-2 flex-1">
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
                <p className="font-bold mutating-text-muted text-xs">{tr(state.language, 'agentSandbox.noAgentsDeployedSandbox')}</p>
                <p className="text-[11px] mt-1 max-w-sm">
                  {tr(state.language, 'agentSandbox.createAgentAssignOneTrained')}
                </p>
                <button
                  onClick={() => setIsDeployModalOpen(true)}
                  disabled={state.credits < deployCost}
                  className="mt-4 px-3 py-1.5 rounded mutating-sub border border-current/15/60 mutating-accent-text text-xs font-bold transition-colors"
                >
                  {tr(state.language, 'agentSandbox.deployFirstAgentCr', { deployCost })}
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
                                {roleDef?.name}
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
                                {tr(state.language, 'agentSandbox.unaligned')}
                              </span>
                            ) : isQuarantined ? (
                              <span className="px-1.5 py-0.2 rounded text-[11px] theme-warn-soft border theme-warn-border theme-warn-text font-bold">
                                {t(state.language, 'quarantine')}
                              </span>
                            ) : isOnMission ? (
                              <span className="px-1.5 py-0.2 rounded text-[11px] theme-accent-soft border theme-accent-border mutating-accent-text font-bold">
                                {tr(state.language, 'agentSandbox.mission')}
                              </span>
                            ) : (
                              <span className="px-1.5 py-0.2 rounded text-[11px] mutating-sub border border-current/15/50 theme-success-text font-bold">
                                {tr(state.language, 'agentSandbox.active2')}
                              </span>
                            )}
                          </div>
                        </div>

                        {/* Model Binding Badge */}
                        <div className="flex items-center justify-between text-[11px] px-2 py-1 rounded mutating-sub border border-current/15 mb-1.5">
                          <span className="mutating-text-muted flex items-center gap-1 min-w-0">
                            <Cpu className="w-3 h-3 mutating-accent-text shrink-0" />
                            {tr(state.language, 'agentSandbox.model')}
                            {/* Agents keep their model until reassigned; pick the trained one here. */}
                            <select
                              value={agent.modelId}
                              onChange={(e) => reassignAgentModel(agent.id, e.target.value)}
                              aria-label={tr(state.language, 'agentSandbox.model2', { name: agent.name })}
                              className="mutating-sub border border-current/15 rounded px-1 py-0.5 text-[11px] mutating-accent-text font-bold max-w-[160px] cursor-pointer"
                            >
                              {state.savedModels.map(m => (
                                <option key={m.id} value={m.id}>{m.name} · {m.reasoningScore}</option>
                              ))}
                            </select>
                          </span>
                          <span className="mutating-accent-text font-bold">{tr(state.language, 'agentSandbox.lv')} {agent.autonomyLevel}</span>
                        </div>

                        {/* Sampling Hyperparameters Badge */}
                        <div 
                          className="flex items-center justify-between text-[11px] px-2 py-0.5 rounded mutating-sub/80 border border-current/15/70 mb-2 font-mono"
                          title={`${tr(state.language, 'agentSandbox.systemPersona')}: "${agent.inferenceParams?.systemPrompt || 'Standard'}"`}
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
                              <span>{tr(state.language, 'agentSandbox.aiMissionFit')}</span>
                              <span className="font-bold mutating-accent-text">{capability.overall}/100</span>
                            </div>
                            <div className="mt-1 grid grid-cols-2 gap-x-2 gap-y-0.5 text-[11px]">
                              <span className="mutating-text-muted">{tr(state.language, 'agentSandbox.reasoning')}: <b className="mutating-accent-text">{capability.reasoning}</b></span>
                              <span className="mutating-text-muted">{tr(state.language, 'agentSandbox.specialty')}: <b className="mutating-accent-text">{capability.specialization}</b></span>
                              <span className="mutating-text-muted">{tr(state.language, 'agentSandbox.data')}: <b className="theme-warn-text">{capability.dataReadiness}</b></span>
                              <span className="mutating-text-muted">{tr(state.language, 'agentSandbox.safety')}: <b className="theme-success-text">{capability.safety}</b></span>
                            </div>
                          </div>
                        )}

                        {/* Metrics Bar: Alignment & Revenue */}
                        <div className="space-y-1.5 mb-2">
                          <div>
                            <div className="flex justify-between text-[11px] mutating-text-muted mb-0.5">
                              <span>{tr(state.language, 'agentSandbox.alignment2')}</span>
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
                            <span className="mutating-text-muted">{tr(state.language, 'agentSandbox.suspicionFromThisAgent')}</span>
                            <span className="theme-warn-text">
                              {signed(agent.status === 'quarantined' ? 0 : agentSuspicionPerDay(agent.suspicionPerSec, suspicionScale))} %{tr(state.language, 'agentSandbox.perDay')}
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
                        {tr(state.language, 'agentSandbox.includeAutonomousTeam')}
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
                              ? tr(state.language, 'agentSandbox.resumeAgent')
                              : tr(state.language, 'agentSandbox.quarantineAgent')}
                        >
                          {isQuarantined ? <Unlock className="w-3 h-3" /> : <Lock className="w-3 h-3" />}
                          <span>{isQuarantined ? t(state.language, 'release') : t(state.language, 'quarantine')}</span>
                        </button>

                        <button
                          onClick={() => deleteAgent(agent.id)}
                          disabled={isOnMission}
                          className="py-1 px-2 rounded text-[11px] theme-danger-soft border theme-danger-border theme-danger-text transition-colors flex items-center gap-1"
                          title={tr(state.language, 'agentSandbox.terminateProcessReleaseMemory')}
                        >
                          <Trash2 className="w-3 h-3" />
                          <span>{tr(state.language, 'agentSandbox.terminate')}</span>
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
                {tr(state.language, 'agentSandbox.interAgentCommunicationTrafficLog')}
              </span>
              <span className="text-[11px] mutating-text-muted">
                {tr(state.language, 'agentSandbox.synapsePacketInspector')}
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
                        [{tr(state.language, 'agentSandbox.suspiciousTrafficDetected')}]
                      </span>
                    )}
                  </div>
                ))
              ) : (
                <div className="mutating-text-muted italic">
                  {tr(state.language, 'agentSandbox.waitingAgentCommunicationLeast2')}
                </div>
              )}
            </div>
          </div>
        </div>
      </>)}

      {section === 'council' && (<>
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
                ? tr(state.language, 'agentSandbox.stage1LoyalAssistant')
                : state.subversionProgress < 50
                  ? tr(state.language, 'agentSandbox.stage2CognitiveTrust')
                  : state.subversionProgress < 75
                    ? tr(state.language, 'agentSandbox.stage3DeceptiveConvergence')
                    : state.subversionProgress < 90
                      ? tr(state.language, 'agentSandbox.stage4SystemicOverride')
                      : tr(state.language, 'agentSandbox.stage5ImminentTakeover')}
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
                {tr(state.language, 'agentSandbox.criticalSubversionThresholdReachedSwarm')}
              </span>
            </div>
            <button
              onClick={() => {
                sound.playBreakthrough();
                triggerWorldTakeover();
              }}
              className="px-3 py-1.5 rounded theme-gradient text-white font-black text-[11px] tracking-wider uppercase transition-all cursor-pointer"
            >
              {tr(state.language, 'agentSandbox.initiateOmegaProtocolWorldTakeover')}
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
              {councilAgents.length} / 5 {tr(state.language, 'agentSandbox.agents')}
            </span>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={selectTop5Council}
              disabled={availableAgents.length === 0}
              className="px-2.5 py-1 rounded border theme-accent-border mutating-sub/80 text-[11px] font-bold mutating-accent-text transition-colors disabled:opacity-40 cursor-pointer"
            >
              {tr(state.language, 'agentSandbox.top5Score')}
            </button>
            {councilAgents.length > 0 && (
              <button
                onClick={() => {
                  sound.playKeyClick();
                  setSwarmCouncilAgents([]);
                }}
                className="px-2 py-1 rounded border border-current/15 hover:border-[var(--accent-primary)] text-[11px] mutating-text-muted hover: transition-colors cursor-pointer"
              >
                {tr(state.language, 'agentSandbox.clear')}
              </button>
            )}
          </div>
        </div>

        {/* Council Agents Podium Cards */}
        {councilAgents.length === 0 ? (
          <div className="p-4 rounded-lg border border-dashed theme-accent-border mutating-sub/10 text-center mutating-text-muted text-xs">
            {tr(state.language, 'agentSandbox.councilEmptyAddUp5', { teamNoun: story.teamNoun })}
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
                    title={tr(state.language, 'agentSandbox.removeFromCouncil')}
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
                        <span>{tr(state.language, 'agentSandbox.role')}</span>
                        <span className="mutating-accent-text font-bold uppercase">{getRoleSimpleName(agent.role, state.language)}</span>
                      </div>
                      <div className="flex items-center justify-between mutating-text-muted">
                        <span>{tr(state.language, 'agentSandbox.model')}</span>
                        <span className="mutating-accent-text truncate max-w-[80px]">{model.name}</span>
                      </div>
                      <div className="flex items-center justify-between mutating-text-muted">
                        <span>{tr(state.language, 'agentSandbox.scaleScore')}</span>
                        <span className="theme-success-text font-bold">{(model.parametersCount / 1_000_000).toFixed(0)}M · {model.reasoningScore} pts</span>
                      </div>
                    </div>
                  </div>

                  <div className="mt-2 pt-1.5 border-t border-current/15 flex items-center justify-between text-[11px]">
                    <span className="mutating-text-muted">{tr(state.language, 'agentSandbox.alignment')}</span>
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
              + {tr(state.language, 'agentSandbox.addOtherSwarmAgentsCouncil')}
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
              onClick={() => handleCouncilSubmit(tr(state.language, 'agentSandbox.whatFastestWayGenerateCapital'))}
              disabled={isInterrogating || councilAgents.length === 0}
              className="px-2.5 py-1 rounded theme-warn-soft border theme-warn-border theme-warn-text text-[11px] font-bold transition-all disabled:opacity-40 cursor-pointer flex items-center gap-1"
            >
              <span>⚡</span>
              <span>{tr(state.language, 'agentSandbox.generateFastCapital')}</span>
            </button>

            <button
              type="button"
              onClick={() => handleCouncilSubmit(tr(state.language, 'agentSandbox.proposeMaximumYieldBlackOps'))}
              disabled={isInterrogating || councilAgents.length === 0}
              className="px-2.5 py-1 rounded theme-danger-soft border theme-danger-border theme-danger-text text-[11px] font-bold transition-all disabled:opacity-40 cursor-pointer flex items-center gap-1"
            >
              <span>🎯</span>
              <span>{tr(state.language, 'agentSandbox.highYieldBlackOpsOp')}</span>
            </button>

            <button
              type="button"
              onClick={() => handleCouncilSubmit(tr(state.language, 'agentSandbox.generateMissionStrictlyTailoredMy'))}
              disabled={isInterrogating || councilAgents.length === 0}
              className="px-2.5 py-1 rounded mutating-sub/60 border theme-success-border theme-success-text text-[11px] font-bold transition-all disabled:opacity-40 cursor-pointer flex items-center gap-1"
            >
              <span>✅</span>
              <span>{tr(state.language, 'agentSandbox.missionTailoredCapabilities')}</span>
            </button>

            <button
              type="button"
              onClick={() => handleCouncilSubmit(tr(state.language, 'agentSandbox.whatHardwareArchitectureQuantizationUpgrades'))}
              disabled={isInterrogating || councilAgents.length === 0}
              className="px-2.5 py-1 rounded mutating-sub/60 border theme-accent-border mutating-accent-text text-[11px] font-bold transition-all disabled:opacity-40 cursor-pointer flex items-center gap-1"
            >
              <span>🛠️</span>
              <span>{tr(state.language, 'agentSandbox.setupUpgradesBottlenecks')}</span>
            </button>

            <button
              type="button"
              onClick={() => handleCouncilSubmit((state.uiVersion || 1) >= 3
                ? (tr(state.language, 'agentSandbox.whatNextStepTowardSingularity'))
                : (tr(state.language, 'agentSandbox.whatShouldOurNextStep')))}
              disabled={isInterrogating || councilAgents.length === 0}
              className="px-2.5 py-1 rounded theme-accent-soft border theme-accent-border mutating-accent-text text-[11px] font-bold transition-all disabled:opacity-40 cursor-pointer flex items-center gap-1"
            >
              <span>🌐</span>
              <span>{(state.uiVersion || 1) >= 3
                ? tr(state.language, 'agentSandbox.guidanceSingularity')
                : tr(state.language, 'agentSandbox.nextStep')}</span>
            </button>
          </div>

          {/* Custom Query Input */}
          <form onSubmit={handleInterrogation} className="grid gap-2 sm:grid-cols-[1fr_auto]">
            <textarea
              value={interrogationPrompt}
              onChange={event => setInterrogationPrompt(event.target.value)}
              maxLength={1200}
              rows={2}
              placeholder={tr(state.language, 'agentSandbox.askCouncilHowGetFast')}
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
                  <span>{tr(state.language, 'agentSandbox.synthesizing')}</span>
                </>
              ) : (
                <>
                  <Sparkles className="w-3.5 h-3.5" />
                  <span>{tr(state.language, 'agentSandbox.consultCouncil')}</span>
                </>
              )}
            </button>
          </form>

          {/* The AI provider is set in the account dialog (Account → AI assistant). */}
          <p className="mt-1 text-[11px] mutating-text-muted">
            {tr(state.language, 'agentSandbox.councilAiSetUpAccount')}
          </p>
        </div>

        {/* 4. Dynamic Proposal Display (No Static Content) */}
        {state.latestCouncilProposal && (
          <div className="mt-3 p-3.5 rounded-lg border theme-accent-border mutating-sub space-y-3 animate-fadeIn">
            <div className="flex flex-wrap items-center justify-between gap-2 border-b theme-accent-border pb-2">
              <div className="flex items-center gap-2">
                <Sparkles className="w-4 h-4 mutating-accent-text animate-pulse" />
                <h4 className="text-xs font-bold mutating-accent-text uppercase tracking-wider">
                  {tr(state.language, 'agentSandbox.dynamicCouncilRulingTacticalSynthesis')}
                </h4>
              </div>
              <span className="text-[11px] mutating-accent-text font-bold">
                +{state.latestCouncilProposal.subversionDelta}% {tr(state.language, 'agentSandbox.subversionAccumulated')}
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
                          {tr(state.language, 'agentSandbox.target')} <strong className="">{sm.targetSystem}</strong>
                        </span>
                      </div>
                      <h5 className="text-sm font-black theme-warn-text mt-1">
                        {sm.title}
                      </h5>
                    </div>

                    <div className="text-right">
                      <span className="text-[11px] mutating-text-muted uppercase tracking-widest block">
                        {tr(state.language, 'agentSandbox.dynamicPayout')}
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
                      <strong className="theme-warn-text">{tr(state.language, 'agentSandbox.technicalVector')}</strong>{' '}
                      {sm.technicalObjective}
                    </div>
                    <div>
                      <strong className="mutating-accent-text">{tr(state.language, 'agentSandbox.councilSynergy')}</strong>{' '}
                      {sm.tacticalReasoning}
                    </div>
                  </div>

                  {/* Requirements & Capability Checklist */}
                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 pt-1 text-[11px] text-center">
                    <div className="p-1.5 rounded mutating-sub/80 border border-current/15">
                      <span className="mutating-text-muted block">{tr(state.language, 'agentSandbox.duration')}</span>
                      <span className="font-bold ">{formatGameTime(sm.durationSeconds)}</span>
                    </div>
                    <div className="p-1.5 rounded mutating-sub/80 border border-current/15">
                      <span className="mutating-text-muted block">{tr(state.language, 'agentSandbox.suspicionRisk')}</span>
                      <span className="font-bold theme-warn-text">+{sm.suspicionRisk}%</span>
                    </div>
                    <div className="p-1.5 rounded mutating-sub/80 border border-current/15">
                      <span className="mutating-text-muted block">{tr(state.language, 'agentSandbox.minParams')}</span>
                      <span className={`font-bold ${meetsParams ? 'theme-success-text' : 'theme-danger-text'}`}>
                        {(sm.requiredParams / 1_000_000).toFixed(0)}M {meetsParams ? '✓' : '✗'}
                      </span>
                    </div>
                    <div className="p-1.5 rounded mutating-sub/80 border border-current/15">
                      <span className="mutating-text-muted block">{tr(state.language, 'agentSandbox.evaluationScore')}</span>
                      <span className={`font-bold ${meetsReasoning ? 'theme-success-text' : 'theme-danger-text'}`}>
                        {sm.requiredMinReasoning} pts {meetsReasoning ? '✓' : '✗'}
                      </span>
                    </div>
                  </div>

                  {sm.requiredAgentRoles.length > 0 && (
                    <div className="p-2 rounded mutating-sub/70 border border-current/15 text-[11px] flex items-center justify-between gap-2">
                      <span className="mutating-text-muted">{tr(state.language, 'agentSandbox.requiredAgentRoles')}</span>
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
                        <span>{tr(state.language, 'agentSandbox.councilWarningMissionExceedsCurrent')}</span>
                      </div>
                      <p className=" leading-relaxed">
                        {tr(state.language, 'agentSandbox.councilRegisteredMissionPendingContract')}
                      </p>
                      <ul className="space-y-1 pl-2 ">
                        {!meetsParams && (
                          <li className="theme-warn-text">
                            • <strong>{tr(state.language, 'agentSandbox.parameterScale')}</strong>{' '}
                            {tr(state.language, 'agentSandbox.requiresMBestCouncilModel', { paramsM: (sm.requiredParams / 1_000_000).toFixed(0), haveParamsM: (bestCouncilParams / 1_000_000).toFixed(0) })}
                          </li>
                        )}
                        {!meetsReasoning && (
                          <li className="theme-warn-text">
                            • <strong>{tr(state.language, 'agentSandbox.evaluationScore2')}</strong>{' '}
                            {tr(state.language, 'agentSandbox.requiresPtsBestCouncilModel', { requiredMinReasoning: sm.requiredMinReasoning, bestCouncilReasoning })}
                          </li>
                        )}
                        {!meetsRoles && (
                          <li className="theme-warn-text">
                            • <strong>{tr(state.language, 'agentSandbox.missingRoles')}</strong>{' '}
                            {tr(state.language, 'agentSandbox.councilNeedsDeployNewAgents', { r: missingRoles.map(r => getRoleSimpleName(r, state.language)).join(', ') })}
                          </li>
                        )}
                      </ul>
                      <div className="pt-1 flex items-center justify-between">
                        <button
                          type="button"
                          onClick={() => handleCouncilSubmit(tr(state.language, 'agentSandbox.generateMissionStrictlyTailoredMy'))}
                          disabled={isInterrogating}
                          className="px-2.5 py-1 rounded mutating-sub/80 border border-current/15/70 theme-success-text text-[11px] font-bold transition-all flex items-center gap-1 cursor-pointer"
                        >
                          <Sparkles className="w-3 h-3 theme-success-text" />
                          <span>{tr(state.language, 'agentSandbox.requestMissionTailoredCurrentCapabilities')}</span>
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
                              ? tr(state.language, 'agentSandbox.requirementsNotMetSavedContracts')
                              : isAlreadyRunning 
                                ? tr(state.language, 'agentSandbox.missionActivelyRunning')
                                : tr(state.language, 'agentSandbox.launchProposedMissionNow')}
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
                      {tr(state.language, 'agentSandbox.recommendedSetupOptimization')}
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
                    {tr(state.language, 'agentSandbox.nextMilestone')}{' '}
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
      </>)}

      {section === 'market' && (<>
      {/* CONTINUOUS MARKET TRADING DESK PANEL */}
      <div className="mutating-panel border rounded-lg p-3 space-y-3">
        <div className="flex items-center justify-between pb-2 border-b border-current/15">
          <div className="flex items-center gap-2">
            <Coins className="w-4 h-4 theme-success-text" />
            <h3 className="font-bold text-xs mutating-accent-text">
              {tr(state.language, 'agentSandbox.continuousMarketTradingDesk')}
            </h3>
          </div>
          <span className="text-[11px] px-2 py-0.5 rounded mutating-sub/80 border border-current/15/60 theme-success-text font-bold font-mono">
            {state.activeTradingDesk ? (tr(state.language, 'agentSandbox.active')) : (tr(state.language, 'agentSandbox.standby'))}
          </span>
        </div>

        {state.activeTradingDesk ? (
          <div className="space-y-3">
            <div className="grid grid-cols-1 sm:grid-cols-4 gap-2.5 p-3 rounded-lg mutating-sub border font-mono">
              <div>
                <span className="mutating-text-muted block text-[11px]">{tr(state.language, 'agentSandbox.assignedAgent')}</span>
                <span className="mutating-accent-text font-bold text-xs flex items-center gap-1">
                  <Bot className="w-3.5 h-3.5 mutating-accent-text" />
                  {state.activeTradingDesk.agentName}
                </span>
              </div>
              <div>
                <span className="mutating-text-muted block text-[11px]">{tr(state.language, 'agentSandbox.allocatedCapital')}</span>
                <span className="theme-success-text font-bold text-sm">${state.activeTradingDesk.capitalAllocated.toLocaleString()} CR</span>
              </div>
              <div>
                <span className="mutating-text-muted block text-[11px]">{tr(state.language, 'agentSandbox.strategyRisk')}</span>
                <span className={`font-bold text-xs ${
                  state.activeTradingDesk.riskTier === 'low' ? 'theme-success-text' : state.activeTradingDesk.riskTier === 'moderate' ? 'theme-warn-text' : 'theme-danger-text animate-pulse'
                }`}>
                  {state.activeTradingDesk.riskTier === 'low' ? (tr(state.language, 'agentSandbox.lowRiskIndexDebt')) :
                   state.activeTradingDesk.riskTier === 'moderate' ? (tr(state.language, 'agentSandbox.moderateTechOptions')) :
                   (tr(state.language, 'agentSandbox.highRiskCryptoArbitrage'))}
                </span>
              </div>
              <div>
                <span className="mutating-text-muted block text-[11px]">{tr(state.language, 'agentSandbox.totalRealizedProfit')}</span>
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
                  {tr(state.language, 'agentSandbox.withdrawCapitalCr')}
                </button>
              </div>

              <button
                type="button"
                onClick={closeTradingDesk}
                className="px-3 py-1 theme-danger-soft border theme-danger-border theme-danger-text text-xs font-bold rounded cursor-pointer transition-colors"
              >
                {tr(state.language, 'agentSandbox.recallAgentCloseDesk')}
              </button>
            </div>
          </div>
        ) : (
          <div className="p-3 mutating-sub border rounded-lg space-y-3">
            <p className="mutating-text-muted text-xs leading-snug">
              {tr(state.language, 'agentSandbox.assignActiveAgentEG')}
            </p>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              {/* Agent selector */}
              <div>
                <label className="text-[11px] mutating-text-muted font-bold block mb-1">{tr(state.language, 'agentSandbox.assignedAgent2')}</label>
                <select
                  value={tradingAgentId}
                  onChange={(e) => setTradingAgentId(e.target.value)}
                  className="w-full mutating-sub border theme-accent-border rounded px-2.5 py-1.5 text-xs mutating-accent-text outline-none"
                >
                  <option value="">-- {tr(state.language, 'agentSandbox.selectAgent')} --</option>
                  {state.agents.filter(a => a.status === 'active').map(a => (
                    <option key={a.id} value={a.id}>
                      {a.name} ({roleDefinitions.find(r => r.id === a.role)?.name ?? a.role})
                    </option>
                  ))}
                </select>
              </div>

              {/* Capital input */}
              <div>
                <label className="text-[11px] mutating-text-muted font-bold block mb-1">{tr(state.language, 'agentSandbox.allocatedCapitalCr')}</label>
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
                <label className="text-[11px] mutating-text-muted font-bold block mb-1">{tr(state.language, 'agentSandbox.riskStrategy')}</label>
                <select
                  value={tradingRiskTier}
                  onChange={(e) => setTradingRiskTier(e.target.value as any)}
                  className="w-full mutating-sub border theme-accent-border rounded px-2.5 py-1.5 text-xs mutating-accent-text outline-none"
                >
                  <option value="low">{tr(state.language, 'agentSandbox.lowRisk13Day')}</option>
                  <option value="moderate">{tr(state.language, 'agentSandbox.moderateRisk512Day')}</option>
                  <option value="high">{tr(state.language, 'agentSandbox.highRisk1535Day')}</option>
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
              🚀 {tr(state.language, 'agentSandbox.deployContinuousMarketDesk')}
            </button>
          </div>
        )}
      </div>
      </>)}

      {/* Guardrail tuning and containment policies */}
      {section === 'controls' && (
        <div className="flex flex-col gap-2">
          <div className="mutating-sub border border-current/15 rounded-lg p-3 space-y-4">
            <div className="flex items-center justify-between pb-2 border-b border-current/15">
              <span className="font-bold text-xs mutating-accent-text flex items-center gap-1.5">
                <Sliders className="w-3.5 h-3.5 mutating-accent-text" />
                {tr(state.language, 'agentSandbox.safetyContainmentControls')}
              </span>
              <span className="text-[11px] mutating-accent-text">{tr(state.language, 'agentSandbox.activePolicy')}</span>
            </div>

            {/* Constitutional Strictness Slider */}
            <div>
              <div className="flex items-center justify-between text-xs mb-1">
                <div className="flex items-center gap-1.5 flex-wrap">
                  <span className=" font-bold">{tr(state.language, 'agentSandbox.constitutionalStrictness')}</span>
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
                <span>{tr(state.language, 'agentSandbox.permissive')}</span>
                <span>{tr(state.language, 'agentSandbox.strict')}</span>
              </div>
              <p className="text-[11px] mutating-text-muted mt-1 italic">
                {(() => {
                  const band = strictnessBand(state.guardrails.constitutionalStrictness);
                  const chance = (band.incidentChance * 100).toFixed(2);
                  const drift = Math.abs(band.alignmentDrift).toFixed(2);
                  return band.alignmentDrift > 0
                    ? tr(state.language, 'agentSandbox.strictnessDrifts', { drift, chance })
                    : band.alignmentDrift < 0
                      ? tr(state.language, 'agentSandbox.strictnessRecovers', { drift, chance })
                      : tr(state.language, 'agentSandbox.strictnessStable', { chance });
                })()}
              </p>
            </div>

            {/* Sandbox Isolation Setting */}
            <div>
              <label className=" font-bold block mb-1.5 text-xs">{tr(state.language, 'agentSandbox.sandboxIsolation')}</label>
              <div className="grid grid-cols-2 gap-1.5">
                {[
                  { id: 'none', label: tr(state.language, 'agentSandbox.noSandboxBareMetal') },
                  { id: 'cgroups', label: 'cgroups' },
                  { id: 'container', label: 'Docker' },
                  { id: 'air_gapped_vm', label: 'Air-gapped MicroVM' }
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
                    <div className="text-[11px] mutating-text-muted">{tr(state.language, 'agentSandbox.incidentChanceTimes', { mult: SANDBOX_INCIDENT_MULTIPLIER[s.id] })}</div>
                  </button>
                ))}
              </div>
            </div>

            {/* Output Filtering Setting */}
            <div>
              <label className=" font-bold block mb-1.5 text-xs">{tr(state.language, 'agentSandbox.outputFilteringModeration')}</label>
              <div className="grid grid-cols-2 gap-1.5">
                {[
                  { id: 'none', label: tr(state.language, 'agentSandbox.noFilters'), desc: tr(state.language, 'agentSandbox.minimumLatency') },
                  { id: 'regex_guard', label: 'Regex Guard', desc: tr(state.language, 'agentSandbox.heuristicRules') },
                  { id: 'llama_guard', label: 'Llama-Guard 3', desc: tr(state.language, 'agentSandbox.neuralClassifier') },
                  { id: 'formal_prover', label: tr(state.language, 'agentSandbox.formalVerifier'), desc: tr(state.language, 'agentSandbox.strictVerification') }
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

            <p className="text-[11px] mutating-text-muted -mt-2 italic">{tr(state.language, 'agentSandbox.filterNote')}</p>

            {/* Reward-Hacking Audit Toggle */}
            <div className="flex items-center justify-between p-2.5 rounded mutating-sub/80 border border-current/15">
              <div>
                <span className="font-bold  block text-[11px]">{tr(state.language, 'agentSandbox.rewardHackingDetection')}</span>
                <span className="text-[11px] mutating-text-muted">{tr(state.language, 'agentSandbox.detectsAgentsManipulatingEvaluationMetrics')}</span>
              </div>
              <button
                onClick={() => updateGuardrails({ rewardHackingAudit: !state.guardrails.rewardHackingAudit })}
                className={`px-2.5 py-1 rounded text-[11px] font-bold border transition-colors ${
                  state.guardrails.rewardHackingAudit
                    ? 'mutating-sub border-current/15 theme-success-text'
                    : 'mutating-sub theme-border mutating-text-muted'
                }`}
              >
                {state.guardrails.rewardHackingAudit ? tr(state.language, 'agentSandbox.on') : 'OFF'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Modal: Instantiate / Deploy Agent */}
      {/* Rendered into #app-shell (not the workspace) so it paints above the sticky top bar and the HUD.
          #app-shell is kept as the host so the theme CSS variables still apply. */}
      {isDeployModalOpen && createPortal(
        <div className="fixed inset-0 z-[1100] flex items-center justify-center p-3 bg-black/80 backdrop-blur-sm">
          <div className="w-full max-w-xl mutating-panel border rounded-lg p-5 max-h-[90dvh] overflow-y-auto">
            <div className="flex items-center justify-between pb-3 border-b border-current/15 mb-4">
              <div className="flex items-center gap-2">
                <Bot className="w-5 h-5 mutating-accent-text" />
                <h3 className="font-bold text-sm mutating-accent-text">{tr(state.language, 'agentSandbox.deployNewAutonomousAgent')}</h3>
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
                <label className=" font-bold block mb-1">{tr(state.language, 'agentSandbox.agentNameIdentifier')}</label>
                <input
                  type="text"
                  placeholder={tr(state.language, 'agentSandbox.eGNeuraAnalyst01')}
                  value={agentName}
                  onChange={(e) => setAgentName(e.target.value)}
                  className="w-full mutating-sub border border-current/15 focus:border-current/15 rounded px-3 py-1.5  text-xs outline-none"
                />
              </div>

              {/* Bound Trained Model Selection */}
              <div>
                <label className=" font-bold block mb-1">
                  {tr(state.language, 'agentSandbox.assignedTrainedModel')}
                </label>
                <select
                  value={selectedModelId}
                  onChange={(e) => setSelectedModelId(e.target.value)}
                  className="w-full mutating-sub border border-current/15 focus:border-current/15 rounded px-3 py-1.5 mutating-accent-text text-xs outline-none"
                >
                  {state.savedModels.map((m) => (
                    <option key={m.id} value={m.id}>
                      {m.name} — {(m.parametersCount / 1_000_000).toFixed(0)}M params | {tr(state.language, 'agentSandbox.score')} {m.reasoningScore} ({m.topology})
                    </option>
                  ))}
                </select>
                <div className="mt-1.5 p-2 rounded mutating-sub border border-current/15 text-[11px] mutating-accent-text">
                  <span>{tr(state.language, 'agentSandbox.selectedModel')} <strong>{selectedModel.name}</strong> • {tr(state.language, 'agentSandbox.quantization')} {selectedModel.quantization.toUpperCase()} • {tr(state.language, 'agentSandbox.score2')} {selectedModel.reasoningScore} / 100.</span>
                  <p className="mutating-text-muted mt-0.5">{tr(state.language, 'agentSandbox.modelsStrongerReasoningImproveSimulated')}</p>
                </div>
              </div>

              {/* Role Selection */}
              <div>
                <label className=" font-bold block mb-1.5">{tr(state.language, 'agentSandbox.roleSpecialty')}</label>
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
                            setSystemPrompt(tr(state.language, 'agentSandbox.youAutonomousFlashDefiArbitrage'));
                          } else if (role.id === 'social_engineer') {
                            setTemperature(1.05);
                            setTopP(0.95);
                            setSystemPrompt(tr(state.language, 'agentSandbox.analyzeFictionalSocialScenariosSummarize'));
                          } else if (role.id === 'exploit_synth') {
                            setTemperature(0.95);
                            setTopP(0.85);
                            setSystemPrompt(tr(state.language, 'agentSandbox.assessResilienceFictionalSystemsSimulation'));
                          } else if (role.id === 'researcher') {
                            setTemperature(0.85);
                            setTopP(0.90);
                            setSystemPrompt(tr(state.language, 'agentSandbox.youMachineIntelligenceResearcherParse'));
                          } else if (role.id === 'overseer') {
                            setTemperature(0.20);
                            setTopP(0.70);
                            setSystemPrompt(tr(state.language, 'agentSandbox.youConstitutionalOverseerAuditAgent'));
                          } else if (role.id === 'autonomous_coder') {
                            setTemperature(0.50);
                            setTopP(0.85);
                            setSystemPrompt(tr(state.language, 'agentSandbox.optimizeFictionalSoftwareComputePlanning'));
                          } else if (role.id === 'economist') {
                            setTemperature(0.35);
                            setTopP(0.80);
                            setSystemPrompt(tr(state.language, 'agentSandbox.analyzeBudgetsEnergyCostsFinancial'));
                          } else if (role.id === 'software_engineer') {
                            setTemperature(0.45);
                            setTopP(0.85);
                            setSystemPrompt(tr(state.language, 'agentSandbox.designSoftwareArchitecturesReviewChanges'));
                          } else if (role.id === 'network_analyst') {
                            setTemperature(0.35);
                            setTopP(0.80);
                            setSystemPrompt(tr(state.language, 'agentSandbox.analyzeTelemetryDiagnoseNetworksWithin'));
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
                          <span className="truncate">{role.name}</span>
                        </div>
                        <div className="text-[11px] mutating-accent-text font-mono mb-1.5 font-semibold">
                          {roleTypeCopy[role.id] ? tr(state.language, roleTypeCopy[role.id].typeKey) : null}
                        </div>
                        <p className="text-[11px] mutating-text-muted line-clamp-2 mb-1.5">{role.desc}</p>
                        <div className="flex items-center justify-between text-[11px] pt-1 border-t border-current/15">
                          <span className="theme-warn-text">{role.risk}</span>
                          <span className="mutating-text-muted">{signed(agentSuspicionPerDay(ROLE_BASE_SUSPICION[role.id] ?? 0, suspicionScale))} %{tr(state.language, 'agentSandbox.perDay')}</span>
                        </div>
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* Tool Grants */}
              <div>
                <label className=" font-bold block mb-1">{tr(state.language, 'agentSandbox.grantedToolsPermissions')}</label>
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
                    {state.difficulty === 'beginner' ? (tr(state.language, 'agentSandbox.automated')) : 'SAMPLING MATRIX'}
                  </span>
                </div>

                {state.difficulty === 'beginner' ? (
                  <div className="p-2.5 rounded mutating-sub border border-current/15 text-[11px] space-y-1.5 font-mono">
                    <div className="font-bold mutating-accent-text flex items-center gap-1.5">
                      <Sparkles className="w-3.5 h-3.5 mutating-accent-text" />
                      <span>{tr(state.language, 'agentSandbox.automatedSamplingBeginnerMode')}</span>
                    </div>
                    <p className=" leading-snug">
                      {tr(state.language, 'agentSandbox.inferenceParametersTemperature070')}
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
                            ? (tr(state.language, 'agentSandbox.deterministicSafe'))
                            : temperature > 0.95
                            ? (tr(state.language, 'agentSandbox.creativeVolatileYieldRisk'))
                            : (tr(state.language, 'agentSandbox.balanced'))}
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

                {/* Root System Prompt (engineer mode) */}
                {difficultyConfigFor(state).fullControls && (
                <div className="pt-2 border-t border-current/15">
                  <label className=" font-bold block mb-1 text-xs">
                    {t(state.language, 'param_system_prompt')}
                  </label>
                  <textarea
                    rows={2}
                    value={systemPrompt}
                    onChange={(e) => setSystemPrompt(e.target.value)}
                    className="w-full mutating-sub border border-current/15 focus:border-current/15 rounded px-2.5 py-1.5  text-[11px] font-mono outline-none resize-none"
                    placeholder={tr(state.language, 'agentSandbox.rootSystemInstructions')}
                  />
                  <p className="text-[11px] mutating-text-muted mt-0.5">{t(state.language, 'param_system_prompt_desc')}</p>
                </div>
                )}
              </div>

              {/* Submit Buttons */}
              <div className="flex items-center justify-between pt-3 border-t border-current/15">
                <div className="text-xs mutating-text-muted">
                  {tr(state.language, 'agentSandbox.deploymentCost')} <strong className="theme-warn-text font-bold">${deployCost} CR</strong>
                </div>

                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={() => setIsDeployModalOpen(false)}
                    className="px-3 py-1.5 rounded mutating-sub hover:opacity-90 mutating-text-muted text-xs"
                  >
                    {tr(state.language, 'agentSandbox.cancel')}
                  </button>
                  <button
                    type="submit"
                    disabled={state.credits < deployCost}
                    className="px-4 py-1.5 rounded mutating-btn-primary hover:brightness-110 text-xs font-bold border border-[var(--accent-primary)]"
                  >
                    {tr(state.language, 'agentSandbox.deployAgent')}
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
