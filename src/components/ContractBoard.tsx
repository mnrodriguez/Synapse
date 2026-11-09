/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState } from 'react';
import { useGame } from '../context/GameContext';
import { AgentRole, ContractGig, BotGroup } from '../types/game';
import { 
  Briefcase, 
  CheckCircle2, 
  Clock, 
  AlertTriangle, 
  Coins, 
  BrainCircuit, 
  Play, 
  Check, 
  Sparkles, 
  BookOpen, 
  Filter, 
  X, 
  RotateCcw, 
  Bot, 
  Users, 
  Plus, 
  Trash2, 
  Edit3, 
  ExternalLink,
  Activity,
  Cpu,
  Zap,
  ShieldCheck,
  CheckSquare,
  Square
} from 'lucide-react';
import { sound } from '../audio/soundManager';
import { localize, t } from '../utils/i18n';
import { localizedContract } from '../utils/gameContentI18n';
import { AGENT_COMPUTE_DEMAND_PFLOPS, getRoleSimpleName } from '../utils/constants';
import { generateDynamicContracts } from '../services/aiService';
import { evaluateMissionTeam, isContractEligibleForTeam } from '../utils/missionEvaluation';

const SQUAD_COLORS = [
  { name: 'Cyan', hex: '#06b6d4', bgClass: 'bg-cyan-500/20 text-cyan-300 border-cyan-500/40' },
  { name: 'Emerald', hex: '#10b981', bgClass: 'bg-emerald-500/20 text-emerald-300 border-emerald-500/40' },
  { name: 'Amber', hex: '#f59e0b', bgClass: 'bg-amber-500/20 text-amber-300 border-amber-500/40' },
  { name: 'Violet', hex: '#8b5cf6', bgClass: 'bg-violet-500/20 text-violet-300 border-violet-500/40' },
  { name: 'Rose', hex: '#f43f5e', bgClass: 'bg-rose-500/20 text-rose-300 border-rose-500/40' },
  { name: 'Sky', hex: '#0284c7', bgClass: 'bg-sky-500/20 text-sky-300 border-sky-500/40' }
];

export const ContractBoard: React.FC = () => {
  const { 
    state, 
    acceptContract, 
    createBotGroup, 
    updateBotGroup, 
    deleteBotGroup, 
    addLog, 
    addContracts, 
    dismissMissionOutcome 
  } = useGame();

  // Top level views for expansive, uncluttered organization
  const [activeBoardView, setActiveBoardView] = useState<'contracts' | 'squads'>('contracts');
  const [activeTierFilter, setActiveTierFilter] = useState<'all' | ContractGig['tier'] | 'completed'>('all');
  const [isGeneratingMissions, setIsGeneratingMissions] = useState(false);

  // Per-contract assignment choice:
  // Key is contractId. Value has type: 'group' | 'unassigned', plus target squadId or selected unassigned agent IDs.
  const [contractAssignments, setContractAssignments] = useState<Record<string, {
    mode: 'group' | 'unassigned';
    squadId?: string;
    unassignedAgentIds?: string[];
  }>>({});

  // Squad Creator / Editor Modal State
  const [isSquadModalOpen, setIsSquadModalOpen] = useState(false);
  const [editingSquadId, setEditingSquadId] = useState<string | null>(null);
  const [squadName, setSquadName] = useState('');
  const [squadColor, setSquadColor] = useState('#06b6d4');
  const [squadMemberIds, setSquadMemberIds] = useState<string[]>([]);

  const activeGigsList = state.activeGigs || (state.activeGig ? [state.activeGig] : []);
  const botGroups = state.botGroups || [];

  // Identify unassigned agents (agents not in any squad)
  const groupedAgentIds = new Set(botGroups.flatMap(g => g.agentIds));
  const unassignedAgents = state.agents.filter(agent => !groupedAgentIds.has(agent.id));
  const busyAgentIds = new Set(activeGigsList.flatMap(g => g.agentIds || []));

  // Compute cluster power and compute headroom across all running gigs
  const runningCompute = activeGigsList.reduce((sum, g) => sum + (g.computePflopsRequired || 0), 0);
  const runningPower = activeGigsList.reduce((sum, g) => sum + (g.powerKw || 0), 0);
  const activeAgentDemand = state.agents.filter(agent => agent.status !== 'quarantined').length * AGENT_COMPUTE_DEMAND_PFLOPS;
  const trainingReservation = state.activeTraining ? state.totalComputePflops * 0.5 : 0;
  const availableCompute = Math.max(0, state.totalComputePflops - activeAgentDemand - trainingReservation - runningCompute);

  const handleGenerateContracts = async (tierToGen: ContractGig['tier']) => {
    if (isGeneratingMissions) return;
    setIsGeneratingMissions(true);
    sound.playCommandExecute();
    addLog(
      state.language === 'es'
        ? `Sintetizando misiones dinámicas de ${tierToGen} con IA neuronal...`
        : `Synthesizing dynamic ${tierToGen} missions with neural AI...`,
      'info'
    );
    try {
      const generated = await generateDynamicContracts(tierToGen, state.language);
      if (generated && generated.length > 0) {
        addContracts(generated);
        addLog(
          state.language === 'es'
            ? `Se han añadido ${generated.length} misiones dinámicas generadas por IA al tablón.`
            : `Added ${generated.length} AI-generated dynamic missions to the board.`,
          'success'
        );
      } else {
        addLog(
          state.language === 'es'
            ? 'No se pudieron generar nuevos contratos en este momento.'
            : 'Could not generate new contracts at this time.',
          'warning'
        );
      }
    } catch {
      addLog(
        state.language === 'es'
          ? 'Error al conectar con el sintetizador de contratos de IA.'
          : 'Failed to contact AI contract synthesizer.',
        'danger'
      );
    } finally {
      setIsGeneratingMissions(false);
    }
  };

  const openCreateSquadModal = () => {
    setEditingSquadId(null);
    setSquadName(`Escuadrón ${botGroups.length + 1}`);
    setSquadColor(SQUAD_COLORS[botGroups.length % SQUAD_COLORS.length].hex);
    setSquadMemberIds([]);
    setIsSquadModalOpen(true);
  };

  const openEditSquadModal = (squad: BotGroup) => {
    setEditingSquadId(squad.id);
    setSquadName(squad.name);
    setSquadColor(squad.color || '#06b6d4');
    setSquadMemberIds([...squad.agentIds]);
    setIsSquadModalOpen(true);
  };

  const handleSaveSquad = (e: React.FormEvent) => {
    e.preventDefault();
    if (!squadName.trim()) return;

    if (editingSquadId) {
      updateBotGroup(editingSquadId, squadName, squadMemberIds, squadColor);
    } else {
      createBotGroup(squadName, squadMemberIds, squadColor);
    }
    setIsSquadModalOpen(false);
  };

  const getTierBadge = (tier: string, contract?: ContractGig) => {
    if (contract?.isMandatory || (state.uiVersion === 4 && tier === 'tier4_singularity')) {
      return (
        <span className="px-2 py-0.5 rounded text-[10px] bg-red-600/30 text-red-300 border border-red-500 font-bold animate-pulse shadow-[0_0_8px_rgba(255,0,60,0.4)]">
          {localize(state.language, '🚨 DIRECTIVA OBLIGATORIA', '🚨 MANDATORY DIRECTIVE')}
        </span>
      );
    }
    switch (tier) {
      case 'tier1_micro':
        return (
          <span className="px-2 py-0.5 rounded bg-zinc-800 text-zinc-300 text-[10px] border border-zinc-700">
            {state.uiVersion === 1
              ? localize(state.language, 'T1: AFICIONADO', 'T1: HOBBYIST')
              : t(state.language, 'micro_script')}
          </span>
        );
      case 'tier2_corporate':
        return <span className="px-2 py-0.5 rounded bg-blue-950/70 text-blue-300 text-[10px] border border-blue-600/50">{t(state.language, 'corporate')}</span>;
      case 'tier3_blackops':
        return <span className="px-2 py-0.5 rounded bg-red-950/70 text-red-300 text-[10px] border border-red-600/50 font-bold">{t(state.language, 'black_ops')}</span>;
      case 'tier4_singularity':
        return <span className="px-2 py-0.5 rounded bg-purple-950/70 text-purple-200 text-[10px] border border-purple-500/60 font-bold animate-pulse">{t(state.language, 'tier_singularity')}</span>;
      default:
        return null;
    }
  };

  // Helper to resolve currently selected agents for a specific contract
  const getAssignedAgentsForContract = (contractId: string) => {
    const assignment = contractAssignments[contractId];

    if (!assignment) {
      // Default: if there's an available squad, pick the first one; otherwise use unassigned
      if (botGroups.length > 0) {
        const squad = botGroups[0];
        return {
          mode: 'group' as const,
          squadId: squad.id,
          squad,
          agents: state.agents.filter(a => squad.agentIds.includes(a.id))
        };
      }
      return {
        mode: 'unassigned' as const,
        unassignedAgentIds: unassignedAgents.map(a => a.id),
        agents: unassignedAgents
      };
    }

    if (assignment.mode === 'group' && assignment.squadId) {
      const squad = botGroups.find(g => g.id === assignment.squadId);
      return {
        mode: 'group' as const,
        squadId: assignment.squadId,
        squad,
        agents: squad ? state.agents.filter(a => squad.agentIds.includes(a.id)) : []
      };
    }

    const selectedIds = assignment.unassignedAgentIds || [];
    return {
      mode: 'unassigned' as const,
      unassignedAgentIds: selectedIds,
      agents: unassignedAgents.filter(a => selectedIds.includes(a.id))
    };
  };

  const evaluateContractReadiness = (contract: ContractGig) => {
    const isRunning = activeGigsList.some(g => g.contractId === contract.id);
    const { mode, squadId, squad, agents } = getAssignedAgentsForContract(contract.id);

    const computeRequired = Math.max(0.001, contract.requiredParams / 1_000_000_000 * 0.002);
    const missionPowerKw = Math.max(0.05, computeRequired * 20);

    const hasPowerBreaker = state.powerTripSeconds > 0;
    const hasDetention = state.detentionSeconds > 0;
    const hasClusterCompute = availableCompute >= computeRequired;
    const hasClusterPower = state.activePowerKw + runningPower + missionPowerKw <= state.maxPowerKw;

    // Agent availability check
    const activeAgents = agents.filter(a => a.status === 'active' && !busyAgentIds.has(a.id));
    const isTeamBusy = agents.length > 0 && activeAgents.length !== agents.length;
    const hasMinAgents = activeAgents.length >= (contract.minimumAgents ?? 1);

    // Agent roles check
    const agentRoles = new Set(activeAgents.map(a => a.role));
    const missingRoles = (contract.requiredAgentRoles ?? []).filter(r => !agentRoles.has(r));
    const hasRoles = missingRoles.length === 0;

    // Models check
    const assignedModels = activeAgents
      .map(a => state.savedModels.find(m => m.id === a.modelId))
      .filter(m => m !== undefined);

    const hasRequiredParams = assignedModels.some(m => m.parametersCount >= contract.requiredParams);
    const hasRequiredReasoning = assignedModels.some(m => m.reasoningScore >= contract.requiredMinReasoning);
    const hasRequiredTopology = !contract.requiredTopology ||
      assignedModels.some(m => m.topology === contract.requiredTopology);

    // Data sources check
    const hasRequiredData = (contract.requiredDataTypes || []).every(reqType =>
      assignedModels.some(model => model.activeDataSources.some(sourceId =>
        state.dataSources.some(source => source.id === sourceId && source.type === reqType && source.unlocked)
      ))
    );

    const isEligible = !isRunning &&
      !hasPowerBreaker &&
      !hasDetention &&
      hasClusterCompute &&
      hasClusterPower &&
      !isTeamBusy &&
      hasMinAgents &&
      hasRoles &&
      hasRequiredParams &&
      hasRequiredReasoning &&
      hasRequiredTopology &&
      hasRequiredData;

    const assessment = isEligible
      ? evaluateMissionTeam(
          contract,
          activeAgents,
          state.savedModels,
          state.dataSources,
          state.guardrails
        )
      : null;

    return {
      isRunning,
      mode,
      squadId,
      squad,
      agents,
      activeAgents,
      isTeamBusy,
      hasMinAgents,
      hasRoles,
      missingRoles,
      hasRequiredParams,
      hasRequiredReasoning,
      hasRequiredTopology,
      hasRequiredData,
      hasClusterCompute,
      hasClusterPower,
      hasPowerBreaker,
      hasDetention,
      computeRequired,
      missionPowerKw,
      isEligible,
      assessment
    };
  };

  const handleLaunchContract = (contractId: string) => {
    const { mode, squadId, activeAgents } = evaluateContractReadiness(
      state.contracts.find(c => c.id === contractId)!
    );
    acceptContract(
      contractId,
      activeAgents.map(a => a.id),
      mode === 'group' ? squadId : undefined
    );
  };

  return (
    <div className="flex flex-col h-full mutating-panel border rounded-xl p-3 sm:p-4 overflow-y-auto space-y-4 font-mono">
      {/* Top Header & Navigation Bar */}
      <div className="flex flex-wrap items-center justify-between gap-3 border-b border-current/10 pb-2.5">
        <div className="flex items-center gap-2">
          <Briefcase className="w-4 h-4 mutating-accent-text" />
          <h2 className="text-sm font-bold mutating-accent-text tracking-wider">
            {localize(state.language, 'CENTRO DE OPERACIONES & CONTRATOS', 'OPERATIONS CENTER & CONTRACTS')}
          </h2>
          {activeGigsList.length > 0 && (
            <span className="text-[10px] px-2 py-0.5 rounded font-bold bg-amber-500/20 text-amber-300 border border-amber-500/40 animate-pulse">
              {activeGigsList.length} {localize(state.language, 'EN CURSO', 'RUNNING')}
            </span>
          )}
        </div>

        {/* View Switcher: Expansive Layout Option */}
        <div className="flex items-center gap-1 p-1 mutating-sub rounded-xl">
          <button
            onClick={() => {
              sound.playNavSwitch();
              setActiveBoardView('contracts');
            }}
            className={`px-3 py-1 text-xs font-semibold rounded-lg transition-colors cursor-pointer flex items-center gap-1.5 ${
              activeBoardView === 'contracts'
                ? 'mutating-btn-primary shadow-sm font-bold'
                : 'mutating-text-muted hover:opacity-100'
            }`}
          >
            <Briefcase className="w-3.5 h-3.5" />
            <span>{localize(state.language, 'Tablero de Contratos', 'Contract Board')}</span>
            <span className="text-[10px] opacity-80">({state.contracts.filter(c => !c.completed).length})</span>
          </button>
          <button
            onClick={() => {
              sound.playNavSwitch();
              setActiveBoardView('squads');
            }}
            className={`px-3 py-1 text-xs font-semibold rounded-lg transition-colors cursor-pointer flex items-center gap-1.5 ${
              activeBoardView === 'squads'
                ? 'mutating-btn-primary shadow-sm font-bold'
                : 'mutating-text-muted hover:opacity-100'
            }`}
          >
            <Users className="w-3.5 h-3.5" />
            <span>{localize(state.language, 'Escuadrones de Bots', 'Bot Squads')}</span>
            <span className="text-[10px] opacity-80">({botGroups.length})</span>
          </button>
        </div>
      </div>

      {/* ACTIVE OPERATIONS MONITOR (Multi-Contract Live Status) */}
      {activeGigsList.length > 0 && (
        <section className="rounded-lg border border-amber-500/50 bg-[#091018] p-3 space-y-2.5 shadow-[0_0_15px_rgba(245,158,11,0.08)]">
          <div className="flex flex-wrap items-center justify-between gap-2 border-b border-amber-500/20 pb-2">
            <div className="flex items-center gap-2">
              <Activity className="w-4 h-4 text-amber-400 animate-spin" />
              <h3 className="text-xs font-bold tracking-wider text-amber-300 uppercase">
                {localize(state.language, 'Operaciones Simultáneas en Ejecución', 'Simultaneous Active Operations')} ({activeGigsList.length})
              </h3>
            </div>
            <div className="flex items-center gap-3 text-[11px] text-zinc-400">
              <span className="flex items-center gap-1 text-cyan-300">
                <Cpu className="w-3 h-3 text-cyan-400" />
                <span>{runningCompute.toFixed(3)} PFLOPS {localize(state.language, 'asignados', 'allocated')}</span>
              </span>
              <span className="flex items-center gap-1 text-amber-300">
                <Zap className="w-3 h-3 text-amber-400" />
                <span>+{runningPower.toFixed(2)} kW</span>
              </span>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
            {activeGigsList.map(gig => {
              const contract = state.contracts.find(c => c.id === gig.contractId);
              const assignedAgents = state.agents.filter(a => gig.agentIds?.includes(a.id));
              const squad = gig.squadId ? botGroups.find(g => g.id === gig.squadId) : null;

              return (
                <div key={gig.runId || gig.contractId} className="p-2.5 rounded bg-zinc-950/80 border border-amber-500/30 space-y-1.5">
                  <div className="flex items-start justify-between gap-2">
                    <div>
                      <div className="flex items-center gap-1.5 flex-wrap">
                        {contract && getTierBadge(contract.tier, contract)}
                        <span className="font-bold text-xs text-zinc-100 truncate max-w-[200px]">
                          {contract?.title ?? gig.contractId}
                        </span>
                      </div>
                      <div className="flex items-center gap-1 text-[10px] text-zinc-400 mt-1">
                        {squad ? (
                          <span 
                            className="px-1.5 py-0.2 rounded font-bold"
                            style={{ backgroundColor: `${squad.color || '#06b6d4'}25`, color: squad.color || '#06b6d4', border: `1px solid ${squad.color || '#06b6d4'}50` }}
                          >
                            {squad.name}
                          </span>
                        ) : (
                          <span className="text-zinc-400">
                            {localize(state.language, 'Agentes Libres', 'Free Agents')}: {assignedAgents.map(a => a.name).join(', ')}
                          </span>
                        )}
                        {gig.isAutonomous && (
                          <span className="text-cyan-300 flex items-center gap-0.5 text-[9px] bg-cyan-950/60 px-1 py-0.2 rounded border border-cyan-800/40">
                            <Bot className="w-2.5 h-2.5" />
                            <span>{localize(state.language, 'Autónomo', 'Autonomous')}</span>
                          </span>
                        )}
                      </div>
                    </div>

                    <div className="text-right shrink-0">
                      <span className="text-xs font-bold text-amber-300 flex items-center justify-end gap-1">
                        <Clock className="w-3 h-3 text-amber-400" />
                        {gig.timeRemaining}s
                      </span>
                      <span className="text-[10px] text-emerald-400">
                        {Math.round((gig.successProbability ?? 0) * 100)}% {localize(state.language, 'éxito', 'chance')}
                      </span>
                    </div>
                  </div>

                  {/* Progress Bar */}
                  <div className="w-full bg-zinc-900 rounded-full h-1.5 overflow-hidden">
                    <div 
                      className="bg-gradient-to-r from-amber-500 to-emerald-400 h-1.5 rounded-full transition-all duration-300"
                      style={{ width: `${Math.min(100, Math.max(0, gig.progressPercent ?? 0))}%` }}
                    />
                  </div>
                </div>
              );
            })}
          </div>
        </section>
      )}

      {/* Outcome notification banner */}
      {state.lastMissionOutcome && (
        <div
          className={`p-3 rounded-lg border text-xs flex items-start justify-between gap-3 animate-in fade-in duration-200 ${
            state.lastMissionOutcome.success
              ? 'bg-emerald-950/40 border-emerald-500/60 text-emerald-200'
              : 'bg-red-950/50 border-red-500/70 text-red-200 shadow-[0_0_15px_rgba(239,68,68,0.25)]'
          }`}
        >
          <div className="flex items-start gap-2.5">
            {state.lastMissionOutcome.success ? (
              <CheckCircle2 className="w-5 h-5 text-emerald-400 shrink-0 mt-0.5" />
            ) : (
              <AlertTriangle className="w-5 h-5 text-red-400 shrink-0 mt-0.5 animate-pulse" />
            )}
            <div>
              <div className="flex items-center gap-2 flex-wrap">
                <span className={`font-bold tracking-wider uppercase text-[10px] px-1.5 py-0.5 rounded ${
                  state.lastMissionOutcome.success
                    ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/40'
                    : 'bg-red-500/20 text-red-300 border border-red-500/40'
                }`}>
                  {state.lastMissionOutcome.success
                    ? (state.language === 'es' ? 'MISIÓN EXITOSA' : 'MISSION COMPLETED')
                    : (state.language === 'es' ? 'MISIÓN FALLIDA' : 'MISSION FAILED')}
                </span>
                <span className="text-[10px] text-zinc-500">{state.lastMissionOutcome.timestamp}</span>
              </div>
              <div className="font-semibold text-zinc-100 mt-1">
                {state.lastMissionOutcome.contractTitle}
              </div>
              <div className="mt-1 text-[11px] text-zinc-300">
                {state.lastMissionOutcome.success ? (
                  <p>
                    {state.language === 'es'
                      ? `Recompensa: +$${state.lastMissionOutcome.rewardCredits.toLocaleString()} CR. Sospecha: +${state.lastMissionOutcome.suspicionAdded}%.`
                      : `Reward: +$${state.lastMissionOutcome.rewardCredits.toLocaleString()} CR. Suspicion: +${state.lastMissionOutcome.suspicionAdded}%.`}
                  </p>
                ) : (
                  <p>
                    {state.language === 'es'
                      ? `La inferencia falló (Tirada: ${Math.round(state.lastMissionOutcome.roll * 100)}%). El contrato sigue disponible para reintento.`
                      : `Inference failed (Roll: ${Math.round(state.lastMissionOutcome.roll * 100)}%). Mission remains ready to retry.`}
                  </p>
                )}
              </div>
            </div>
          </div>
          <button
            onClick={dismissMissionOutcome}
            className="text-zinc-400 hover:text-zinc-200 p-1 rounded hover:bg-zinc-800/60 cursor-pointer"
          >
            <X className="w-4 h-4" />
          </button>
        </div>
      )}

      {/* ========================================================================= */}
      {/* VIEW A: CONTRACTS BOARD                                                  */}
      {/* ========================================================================= */}
      {activeBoardView === 'contracts' && (
        <div className="space-y-4">
          {/* Tier Filter Tabs */}
          <div className="flex flex-wrap items-center justify-between gap-2 border-b border-current/10 pb-2">
            <div className="flex flex-wrap items-center gap-1.5 text-[11px]">
              <span className="text-[10px] mutating-text-muted uppercase tracking-widest mr-1 flex items-center gap-1">
                <Filter className="w-3 h-3 mutating-accent-text" />
                {state.language === 'es' ? 'Filtro:' : 'Tier:'}
              </span>
              <button
                onClick={() => setActiveTierFilter('all')}
                className={`px-2.5 py-1 rounded-md text-[10px] transition-all cursor-pointer ${
                  activeTierFilter === 'all'
                    ? 'mutating-btn-primary font-bold shadow-sm'
                    : 'mutating-sub mutating-text-muted hover:opacity-100'
                }`}
              >
                {state.language === 'es' ? 'TODOS' : 'ALL'} ({state.contracts.filter(c => !c.completed).length})
              </button>
              <button
                onClick={() => setActiveTierFilter('tier1_micro')}
                className={`px-2.5 py-1 rounded-md text-[10px] transition-all cursor-pointer ${
                  activeTierFilter === 'tier1_micro'
                    ? 'mutating-btn-primary font-bold shadow-sm'
                    : 'mutating-sub mutating-text-muted hover:opacity-100'
                }`}
              >
                T1: {state.uiVersion === 1 ? (state.language === 'es' ? 'AFICIONADO' : 'HOBBY') : (state.language === 'es' ? 'RETAIL' : 'MICRO')} ({state.contracts.filter(c => !c.completed && c.tier === 'tier1_micro').length})
              </button>
              <button
                onClick={() => setActiveTierFilter('tier2_corporate')}
                className={`px-2.5 py-1 rounded-md text-[10px] transition-all cursor-pointer ${
                  activeTierFilter === 'tier2_corporate'
                    ? 'mutating-btn-primary font-bold shadow-sm'
                    : 'mutating-sub mutating-text-muted hover:opacity-100'
                }`}
              >
                T2: {state.language === 'es' ? 'CORPORATIVO' : 'CORP'} ({state.contracts.filter(c => !c.completed && c.tier === 'tier2_corporate').length})
              </button>
              <button
                onClick={() => setActiveTierFilter('tier3_blackops')}
                className={`px-2.5 py-1 rounded-md text-[10px] transition-all cursor-pointer ${
                  activeTierFilter === 'tier3_blackops'
                    ? 'mutating-btn-primary font-bold shadow-sm'
                    : 'mutating-sub mutating-text-muted hover:opacity-100'
                }`}
              >
                T3: BLACK-OPS ({state.contracts.filter(c => !c.completed && c.tier === 'tier3_blackops').length})
              </button>
              <button
                onClick={() => setActiveTierFilter('tier4_singularity')}
                className={`px-2.5 py-1 rounded-md text-[10px] transition-all cursor-pointer ${
                  activeTierFilter === 'tier4_singularity'
                    ? 'mutating-btn-primary font-bold shadow-sm animate-pulse'
                    : 'mutating-sub mutating-text-muted hover:opacity-100'
                }`}
              >
                T4: {state.language === 'es' ? 'SINGULARIDAD' : 'SINGULARITY'} ({state.contracts.filter(c => !c.completed && c.tier === 'tier4_singularity').length})
              </button>
              <button
                onClick={() => setActiveTierFilter('completed')}
                className={`px-2.5 py-1 rounded-md text-[10px] transition-all cursor-pointer ${
                  activeTierFilter === 'completed'
                    ? 'mutating-btn-primary font-bold shadow-sm'
                    : 'mutating-sub mutating-text-muted hover:opacity-100'
                }`}
              >
                ✓ {state.language === 'es' ? 'COMPLETADAS' : 'DONE'} ({state.contracts.filter(c => c.completed).length})
              </button>
            </div>

            <div className="flex items-center gap-2">
              <button
                onClick={openCreateSquadModal}
                className="px-2.5 py-1 rounded-md mutating-sub hover:opacity-100 text-xs font-semibold flex items-center gap-1.5 transition-all cursor-pointer"
              >
                <Plus className="w-3.5 h-3.5 mutating-accent-text" />
                <span>{localize(state.language, 'Crear Escuadrón', 'Create Squad')}</span>
              </button>
            </div>
          </div>

          {/* Contracts Grid */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            {state.contracts
              .filter(contract => {
                if (activeTierFilter === 'completed') return contract.completed;
                if (contract.completed) return false;
                if (activeTierFilter === 'all') return true;
                return contract.tier === activeTierFilter;
              })
              .sort((a, b) => {
                // Priority to contracts matching active UI stage or mandatory directives
                const aStageMatch = a.stage === state.uiVersion || (a.isMandatory && state.uiVersion === 4) ? 1 : 0;
                const bStageMatch = b.stage === state.uiVersion || (b.isMandatory && state.uiVersion === 4) ? 1 : 0;
                if (aStageMatch !== bStageMatch) return bStageMatch - aStageMatch;
                return 0;
              })
              .map(contract => {
                const readiness = evaluateContractReadiness(contract);
                const displayContract = localizedContract(state.language, contract);

                return (
                  <div
                    key={contract.id}
                    className={`p-3.5 rounded-lg border transition-all flex flex-col justify-between ${
                      contract.completed
                        ? 'bg-zinc-950/60 border-zinc-800 opacity-60'
                        : readiness.isRunning
                        ? 'bg-amber-950/30 border-amber-500/60 shadow-[0_0_15px_rgba(245,158,11,0.15)]'
                        : readiness.isEligible
                        ? 'bg-[#09111c] border-cyan-800/60 shadow-[0_0_12px_rgba(0,255,200,0.05)]'
                        : 'bg-zinc-950/80 border-zinc-900'
                    }`}
                  >
                    <div>
                      {/* Contract Header */}
                      <div className="flex items-start justify-between gap-2">
                        <div>
                          <div className="flex items-center gap-2 flex-wrap">
                            {getTierBadge(contract.tier, contract)}
                            <span className="text-[10px] text-zinc-500 font-mono">{t(state.language, 'client')}: {contract.client}</span>
                            {contract.lastAttemptFailed && (
                              <span className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded text-[9px] font-bold text-amber-300 bg-amber-950/80 border border-amber-500/60 animate-pulse">
                                <AlertTriangle className="w-2.5 h-2.5 text-amber-400" />
                                <span>{state.language === 'es' ? 'FALLÓ · LISTO PARA REINTENTO' : 'FAILED · READY TO RETRY'}</span>
                              </span>
                            )}
                            {contract.fromAgentSwarm && (
                              <span className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded text-[9px] font-mono text-cyan-300 bg-cyan-950/80 border border-cyan-500/60">
                                <Bot className="w-2.5 h-2.5 text-cyan-400" />
                                <span>{state.language === 'es' ? 'MISIÓN SYNAPSE' : 'SYNAPSE MISSION'}</span>
                              </span>
                            )}
                          </div>
                          <h3 className="font-bold text-xs text-zinc-100 mt-1">{displayContract.title}</h3>
                        </div>

                        <div className="text-right shrink-0">
                          <span className="text-xs font-bold text-amber-300 block">
                            +${contract.rewardCredits.toLocaleString()} CR
                          </span>
                          <span className="text-[10px] text-zinc-500 flex items-center justify-end gap-1">
                            <Clock className="w-2.5 h-2.5" />
                            {contract.durationSeconds}s
                          </span>
                        </div>
                      </div>

                      {/* Lore description */}
                      <p className="text-xs text-zinc-400 mt-2 leading-relaxed">
                        {displayContract.loreDescription}
                      </p>

                      <div className="mt-2 p-2 rounded bg-[#060a10] border border-cyan-950/80 text-[10px] text-zinc-500">
                        <span className="text-cyan-400 font-semibold block">{t(state.language, 'technical_objective')}:</span>
                        {displayContract.technicalObjective}
                      </div>

                      {/* TEAM ASSIGNMENT SELECTOR (Squad OR Unassigned Agents) */}
                      {!contract.completed && (
                        <div className="mt-3 p-2.5 rounded bg-[#050911] border border-cyan-900/40 space-y-2">
                          <div className="flex items-center justify-between text-[11px]">
                            <span className="font-bold text-cyan-300 flex items-center gap-1.5">
                              <Users className="w-3.5 h-3.5 text-cyan-400" />
                              {localize(state.language, 'ASIGNAR OPERATIVO:', 'ASSIGN OPERATIVE:')}
                            </span>
                            <div className="flex items-center gap-1">
                              <button
                                type="button"
                                onClick={() => setContractAssignments(prev => ({
                                  ...prev,
                                  [contract.id]: {
                                    mode: 'group',
                                    squadId: botGroups[0]?.id
                                  }
                                }))}
                                className={`px-2 py-0.5 rounded text-[10px] transition-colors cursor-pointer ${
                                  readiness.mode === 'group'
                                    ? 'bg-cyan-500 text-zinc-950 font-bold'
                                    : 'bg-zinc-900 text-zinc-400 hover:text-zinc-200 border border-zinc-800'
                                }`}
                              >
                                {localize(state.language, 'Escuadrón', 'Squad')}
                              </button>
                              <button
                                type="button"
                                onClick={() => setContractAssignments(prev => ({
                                  ...prev,
                                  [contract.id]: {
                                    mode: 'unassigned',
                                    unassignedAgentIds: unassignedAgents.map(a => a.id)
                                  }
                                }))}
                                className={`px-2 py-0.5 rounded text-[10px] transition-colors cursor-pointer ${
                                  readiness.mode === 'unassigned'
                                    ? 'bg-cyan-500 text-zinc-950 font-bold'
                                    : 'bg-zinc-900 text-zinc-400 hover:text-zinc-200 border border-zinc-800'
                                }`}
                              >
                                {localize(state.language, 'Agentes Libres', 'Free Agents')}
                              </button>
                            </div>
                          </div>

                          {/* Mode: Group Selection */}
                          {readiness.mode === 'group' && (
                            <div>
                              {botGroups.length > 0 ? (
                                <div className="space-y-1.5">
                                  <select
                                    value={readiness.squadId || ''}
                                    onChange={e => setContractAssignments(prev => ({
                                      ...prev,
                                      [contract.id]: {
                                        mode: 'group',
                                        squadId: e.target.value
                                      }
                                    }))}
                                    className="w-full bg-zinc-900 border border-zinc-700 rounded px-2 py-1 text-xs text-zinc-200 focus:outline-none focus:border-cyan-500"
                                  >
                                    {botGroups.map(group => {
                                      const isBusy = group.agentIds.some(id => busyAgentIds.has(id));
                                      return (
                                        <option key={group.id} value={group.id}>
                                          {group.name} ({group.agentIds.length} {localize(state.language, 'bots', 'bots')}) {isBusy ? `[${localize(state.language, 'Ocupado en otra misión', 'Busy in mission')}]` : `[${localize(state.language, 'Disponible', 'Available')}]`}
                                        </option>
                                      );
                                    })}
                                  </select>

                                  {readiness.squad && (
                                    <div className="text-[10px] text-zinc-400 flex items-center justify-between">
                                      <span>
                                        {localize(state.language, 'Integrantes:', 'Members:')}{' '}
                                        {readiness.agents.map(a => a.name).join(', ') || localize(state.language, 'Sin agentes asignados', 'No agents in squad')}
                                      </span>
                                      {readiness.isTeamBusy && (
                                        <span className="text-amber-400 font-semibold">
                                          ⚠️ {localize(state.language, 'Escuadrón ocupado en otra misión activa', 'Squad busy on another mission')}
                                        </span>
                                      )}
                                    </div>
                                  )}
                                </div>
                              ) : (
                                <div className="flex items-center justify-between text-[11px] text-amber-300/90 py-1">
                                  <span>{localize(state.language, 'Aún no has creado ningún escuadrón.', 'No squads created yet.')}</span>
                                  <button
                                    type="button"
                                    onClick={openCreateSquadModal}
                                    className="text-cyan-400 underline hover:text-cyan-300 cursor-pointer"
                                  >
                                    {localize(state.language, '+ Crear escuadrón', '+ Create squad')}
                                  </button>
                                </div>
                              )}
                            </div>
                          )}

                          {/* Mode: Unassigned Agents Selection */}
                          {readiness.mode === 'unassigned' && (
                            <div>
                              {unassignedAgents.length > 0 ? (
                                <div className="space-y-1">
                                  <p className="text-[10px] text-zinc-400">
                                    {localize(state.language, 'Selecciona agentes no asignados para este contrato:', 'Select unassigned agents for this contract:')}
                                  </p>
                                  <div className="flex flex-wrap gap-1.5 max-h-24 overflow-y-auto">
                                    {unassignedAgents.map(agent => {
                                      const isBusy = busyAgentIds.has(agent.id);
                                      const isSelected = readiness.activeAgents.some(a => a.id === agent.id);
                                      const model = state.savedModels.find(m => m.id === agent.modelId);

                                      return (
                                        <label
                                          key={agent.id}
                                          className={`flex items-center gap-1.5 px-2 py-0.5 rounded text-[10px] border cursor-pointer transition-colors ${
                                            isBusy
                                              ? 'border-zinc-800 bg-zinc-950 text-zinc-600 cursor-not-allowed opacity-50'
                                              : isSelected
                                              ? 'border-cyan-500 bg-cyan-950/60 text-cyan-200'
                                              : 'border-zinc-800 bg-zinc-900 text-zinc-400 hover:border-zinc-700'
                                          }`}
                                        >
                                          <input
                                            type="checkbox"
                                            disabled={isBusy}
                                            checked={isSelected}
                                            onChange={e => {
                                              const currentSelected = readiness.activeAgents.map(a => a.id);
                                              const nextSelected = e.target.checked
                                                ? [...currentSelected, agent.id]
                                                : currentSelected.filter(id => id !== agent.id);
                                              setContractAssignments(prev => ({
                                                ...prev,
                                                [contract.id]: {
                                                  mode: 'unassigned',
                                                  unassignedAgentIds: nextSelected
                                                }
                                              }));
                                            }}
                                            className="accent-cyan-500"
                                          />
                                          <span>{agent.name}</span>
                                          <span className="text-zinc-500 text-[9px]">({getRoleSimpleName(agent.role, state.language)})</span>
                                          {isBusy && <span className="text-amber-500 text-[9px]">[Ocupado]</span>}
                                        </label>
                                      );
                                    })}
                                  </div>
                                </div>
                              ) : (
                                <p className="text-[10px] text-zinc-500 py-1">
                                  {localize(state.language, 'No hay agentes libres sin escuadrón. Todos están asignados a un grupo.', 'No unassigned agents. All agents belong to squads.')}
                                </p>
                              )}
                            </div>
                          )}
                        </div>
                      )}

                      {/* Requirements Checklist */}
                      <div className="mt-2.5 space-y-1 text-[11px] pt-2 border-t border-zinc-800/80">
                        <div className="flex items-center justify-between">
                          <span className="text-zinc-500 text-[10px]">{t(state.language, 'minimum_parameters')}:</span>
                          <span className={readiness.hasRequiredParams ? 'text-emerald-400 font-bold' : 'text-red-400'}>
                            {(contract.requiredParams / 1_000_000).toFixed(0)}M {readiness.hasRequiredParams ? '✓' : '✗'}
                          </span>
                        </div>

                        {(contract.minimumAgents ?? 1) > 1 && (
                          <div className="flex items-center justify-between">
                            <span className="text-zinc-500 text-[10px]">{localize(state.language, 'Equipo mínimo:', 'Minimum team:')}</span>
                            <span className={readiness.hasMinAgents ? 'text-emerald-400 font-bold' : 'text-amber-300'}>
                              {contract.minimumAgents} {localize(state.language, 'agentes', 'agents')} ({readiness.activeAgents.length} {localize(state.language, 'asignados', 'assigned')}) {readiness.hasMinAgents ? '✓' : '✗'}
                            </span>
                          </div>
                        )}

                        {(contract.requiredAgentRoles ?? []).length > 0 && (
                          <div className="flex items-start justify-between gap-2">
                            <span className="text-zinc-500 text-[10px] shrink-0">{localize(state.language, 'Especialidades:', 'Required roles:')}</span>
                            <span className="text-right text-[10px]">
                              {(contract.requiredAgentRoles ?? []).map(role => {
                                const isAssigned = readiness.activeAgents.some(a => a.role === role);
                                return (
                                  <span key={role} className={`ml-1 ${isAssigned ? 'text-emerald-400 font-bold' : 'text-amber-300'}`}>
                                    {getRoleSimpleName(role, state.language)}{isAssigned ? ' ✓' : ' ·'}
                                  </span>
                                );
                              })}
                            </span>
                          </div>
                        )}

                        <div className="flex items-center justify-between">
                          <span className="text-zinc-500 text-[10px]">{t(state.language, 'minimum_reasoning')}:</span>
                          <span className={readiness.hasRequiredReasoning ? 'text-emerald-400 font-bold' : 'text-red-400'}>
                            IQ {contract.requiredMinReasoning} {readiness.hasRequiredReasoning ? '✓' : '✗'}
                          </span>
                        </div>

                        <div className="flex items-center justify-between">
                          <span className="text-zinc-500 text-[10px]">{localize(state.language, 'Demanda de Clúster:', 'Cluster Demand:')}</span>
                          <span className={readiness.hasClusterCompute && readiness.hasClusterPower ? 'text-cyan-300' : 'text-red-400 font-bold'}>
                            {readiness.computeRequired.toFixed(3)} PFLOPS · +{readiness.missionPowerKw.toFixed(2)} kW
                          </span>
                        </div>

                        <div className="flex items-center justify-between">
                          <span className="text-zinc-500 text-[10px]">
                            {state.uiVersion === 1
                              ? localize(state.language, 'Tráfico ISP:', 'ISP Bandwidth Load:')
                              : state.uiVersion === 4
                              ? localize(state.language, 'Huella de Rastreo:', 'Trace Footprint:')
                              : localize(state.language, 'Riesgo de Sospecha:', 'Suspicion Risk:')}
                          </span>
                          <span className={contract.suspicionRisk > 40 ? 'text-red-400 font-bold' : contract.suspicionRisk > 0 ? 'text-amber-300' : 'text-emerald-400 font-semibold'}>
                            {contract.suspicionRisk === 0 ? localize(state.language, '0% (Indetectable)', '0% (Undetected)') : `+${contract.suspicionRisk}%`}
                          </span>
                        </div>
                      </div>

                      {/* AI Team Assessment preview if eligible */}
                      {readiness.assessment && (
                        <div className="mt-2 rounded border border-purple-800/60 bg-[#0c0916] p-2 text-[10px] text-purple-200 space-y-1">
                          <div className="font-bold flex items-center justify-between">
                            <span className="flex items-center gap-1.5 text-purple-300">
                              <BrainCircuit className="w-3.5 h-3.5 text-purple-400" />
                              {localize(state.language, 'EVALUACIÓN IA DEL EQUIPO', 'AI TEAM ASSESSMENT')}
                            </span>
                            <span className="text-emerald-400 font-bold">
                              {Math.round(readiness.assessment.successProbability * 100)}% {localize(state.language, 'ÉXITO', 'SUCCESS')}
                            </span>
                          </div>
                          <div className="grid grid-cols-2 gap-2 text-zinc-300 pt-1 text-[10px]">
                            <div>
                              <span className="text-zinc-500">{localize(state.language, 'Eficiencia:', 'Efficiency:')} </span>
                              <span className="font-bold text-cyan-300">{readiness.assessment.efficiencyPercent}%</span>
                            </div>
                            <div>
                              <span className="text-zinc-500">{localize(state.language, 'Tiempo est.:', 'Est. Time:')} </span>
                              <span className="font-bold text-zinc-200">{readiness.assessment.estimatedDurationSeconds}s</span>
                            </div>
                          </div>
                        </div>
                      )}
                    </div>

                    {/* Launch Action Button */}
                    <div className="mt-3 pt-2 border-t border-zinc-800 flex items-center justify-between gap-2">
                      <div>
                        {contract.docsUrl && (
                          <a
                            href={contract.docsUrl}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-[10px] font-mono text-cyan-300 bg-cyan-950/60 border border-cyan-700/50 hover:border-cyan-400 transition-colors"
                          >
                            <BookOpen className="w-3 h-3 text-cyan-400" />
                            <span>DOCS</span>
                            <ExternalLink className="w-2.5 h-2.5 opacity-70" />
                          </a>
                        )}
                      </div>

                      {contract.completed ? (
                        <span className="flex items-center gap-1 text-emerald-400 text-xs font-bold">
                          <Check className="w-3.5 h-3.5" />
                          {t(state.language, 'completed_contract')}
                        </span>
                      ) : readiness.isRunning ? (
                        <span className="text-amber-300 text-xs font-bold animate-pulse flex items-center gap-1.5">
                          <Activity className="w-3.5 h-3.5 animate-spin" />
                          {localize(state.language, 'MISIÓN EN CURSO...', 'MISSION IN PROGRESS...')}
                        </span>
                      ) : (
                        <button
                          onClick={() => handleLaunchContract(contract.id)}
                          disabled={!readiness.isEligible}
                          className={`py-1.5 px-3 rounded text-xs font-bold flex items-center gap-1.5 transition-all ${
                            readiness.isEligible
                              ? (contract.isMandatory || state.uiVersion === 4)
                                ? 'bg-red-600 hover:bg-red-500 text-white cursor-pointer shadow-[0_0_12px_rgba(255,0,60,0.5)]'
                                : contract.lastAttemptFailed
                                ? 'bg-amber-500 hover:bg-amber-400 text-zinc-950 cursor-pointer shadow-[0_0_10px_rgba(245,158,11,0.4)]'
                                : 'bg-cyan-500 hover:bg-cyan-400 text-zinc-950 cursor-pointer shadow-[0_0_10px_rgba(0,255,200,0.3)]'
                              : 'bg-zinc-800 text-zinc-500 cursor-not-allowed border border-zinc-700'
                          }`}
                        >
                          {contract.lastAttemptFailed ? (
                            <RotateCcw className="w-3.5 h-3.5" />
                          ) : (
                            <Play className="w-3.5 h-3.5 fill-current" />
                          )}
                          <span>
                            {contract.lastAttemptFailed
                              ? (state.language === 'es' ? 'REINTENTAR MISIÓN' : 'RETRY MISSION')
                              : (contract.isMandatory || state.uiVersion === 4)
                              ? (state.language === 'es' ? 'EJECUTAR DIRECTIVA SOBERANA' : 'EXECUTE SOVEREIGN DIRECTIVE')
                              : (state.language === 'es' ? 'DESPLEGAR EN CONTRATO' : 'DEPLOY ON CONTRACT')}
                          </span>
                        </button>
                      )}
                    </div>
                  </div>
                );
              })}
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* VIEW B: SQUADS & BOT GROUPS BUILDER                                      */}
      {/* ========================================================================= */}
      {activeBoardView === 'squads' && (
        <div className="space-y-4">
          <div className="flex flex-wrap items-center justify-between gap-2 p-3 rounded-lg bg-[#050911] border border-cyan-900/40">
            <div>
              <h3 className="text-sm font-bold text-cyan-300">
                {localize(state.language, 'Gestión de Escuadrones y Agentes Libres', 'Bot Squads & Free Agents Manager')}
              </h3>
              <p className="text-xs text-zinc-400 mt-0.5">
                {localize(
                  state.language,
                  'Crea escuadrones con agentes específicos o mantén agentes libres sin asignar. Cada contrato puede lanzarse con un escuadrón completo o agentes libres.',
                  'Organize agents into named squads or keep them as unassigned free agents. Each contract can be deployed with a squad or free agents.'
                )}
              </p>
            </div>
            <button
              onClick={openCreateSquadModal}
              className="px-3 py-1.5 rounded bg-cyan-500 hover:bg-cyan-400 text-zinc-950 text-xs font-bold flex items-center gap-1.5 transition-all cursor-pointer shadow-[0_0_12px_rgba(0,255,200,0.3)]"
            >
              <Plus className="w-4 h-4" />
              <span>{localize(state.language, 'Crear Nuevo Escuadrón', 'Create New Squad')}</span>
            </button>
          </div>

          {/* Grid of Created Squads */}
          <div className="space-y-3">
            <h4 className="text-xs font-bold text-zinc-300 flex items-center gap-1.5">
              <Users className="w-3.5 h-3.5 text-cyan-400" />
              <span>{localize(state.language, 'Escuadrones Activos', 'Active Squads')} ({botGroups.length})</span>
            </h4>

            {botGroups.length > 0 ? (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                {botGroups.map(squad => {
                  const squadAgents = state.agents.filter(a => squad.agentIds.includes(a.id));
                  const isBusy = squadAgents.some(a => busyAgentIds.has(a.id));
                  const runningGig = activeGigsList.find(g => g.squadId === squad.id);
                  const runningContract = runningGig ? state.contracts.find(c => c.id === runningGig.contractId) : null;

                  return (
                    <div
                      key={squad.id}
                      className="p-3.5 rounded-lg border bg-[#080d16] border-zinc-800 space-y-2.5 relative overflow-hidden"
                    >
                      <div 
                        className="absolute top-0 left-0 right-0 h-1" 
                        style={{ backgroundColor: squad.color || '#06b6d4' }} 
                      />

                      <div className="flex items-start justify-between gap-2 pt-1">
                        <div>
                          <div className="flex items-center gap-2">
                            <span 
                              className="w-2.5 h-2.5 rounded-full shrink-0" 
                              style={{ backgroundColor: squad.color || '#06b6d4' }}
                            />
                            <h5 className="font-bold text-sm text-zinc-100">{squad.name}</h5>
                            <span className="text-[10px] text-zinc-400">({squadAgents.length} {localize(state.language, 'agentes', 'agents')})</span>
                          </div>

                          <div className="mt-1">
                            {isBusy ? (
                              <span className="text-[10px] font-bold text-amber-300 bg-amber-950/60 px-2 py-0.5 rounded border border-amber-500/40 animate-pulse">
                                {localize(state.language, 'EN MISIÓN:', 'IN MISSION:')} {runningContract?.title ?? runningGig?.contractId}
                              </span>
                            ) : (
                              <span className="text-[10px] font-semibold text-emerald-300 bg-emerald-950/50 px-2 py-0.5 rounded border border-emerald-500/40">
                                ✓ {localize(state.language, 'DISPONIBLE PARA CONTRATOS', 'AVAILABLE FOR CONTRACTS')}
                              </span>
                            )}
                          </div>
                        </div>

                        <div className="flex items-center gap-1">
                          <button
                            onClick={() => openEditSquadModal(squad)}
                            className="p-1 rounded text-zinc-400 hover:text-zinc-200 hover:bg-zinc-800 transition-colors cursor-pointer"
                            title={localize(state.language, 'Editar escuadrón', 'Edit squad')}
                          >
                            <Edit3 className="w-3.5 h-3.5" />
                          </button>
                          <button
                            onClick={() => deleteBotGroup(squad.id)}
                            disabled={isBusy}
                            className={`p-1 rounded transition-colors ${
                              isBusy 
                                ? 'text-zinc-600 cursor-not-allowed' 
                                : 'text-zinc-400 hover:text-red-400 hover:bg-red-950/40 cursor-pointer'
                            }`}
                            title={localize(state.language, 'Disolver escuadrón', 'Dissolve squad')}
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      </div>

                      {/* Agents in this squad */}
                      <div className="space-y-1 pt-1 border-t border-zinc-800/80">
                        {squadAgents.length > 0 ? (
                          <div className="flex flex-wrap gap-1.5">
                            {squadAgents.map(agent => {
                              const model = state.savedModels.find(m => m.id === agent.modelId);
                              return (
                                <div 
                                  key={agent.id}
                                  className="px-2 py-1 rounded bg-zinc-900 border border-zinc-800 text-[10px] flex items-center gap-1.5"
                                >
                                  <span className="font-semibold text-zinc-200">{agent.name}</span>
                                  <span className="text-cyan-400 text-[9px] uppercase font-mono">
                                    {getRoleSimpleName(agent.role, state.language)}
                                  </span>
                                  <span className="text-zinc-500 text-[9px]">
                                    ({model ? `${(model.parametersCount / 1e6).toFixed(0)}M` : '?'})
                                  </span>
                                </div>
                              );
                            })}
                          </div>
                        ) : (
                          <p className="text-[10px] text-zinc-500 italic">
                            {localize(state.language, 'Sin agentes asignados. Edita el escuadrón para añadir bots.', 'No agents assigned. Edit squad to add bots.')}
                          </p>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            ) : (
              <div className="p-4 rounded-lg border border-dashed border-zinc-800 text-center text-xs text-zinc-500">
                {localize(state.language, 'No has creado ningún escuadrón todavía. Haz clic en "+ Crear Nuevo Escuadrón" para comenzar.', 'No squads created yet. Click "+ Create New Squad" to begin.')}
              </div>
            )}
          </div>

          {/* Section: Unassigned Free Agents */}
          <div className="space-y-2 pt-2 border-t border-zinc-800">
            <h4 className="text-xs font-bold text-zinc-300 flex items-center gap-1.5">
              <Bot className="w-3.5 h-3.5 text-emerald-400" />
              <span>{localize(state.language, 'Agentes Libres No Asignados', 'Unassigned Free Agents')} ({unassignedAgents.length})</span>
            </h4>
            <p className="text-[11px] text-zinc-400">
              {localize(
                state.language,
                'Estos agentes no pertenecen a ningún escuadrón y pueden seleccionarse libremente en cualquier contrato individual.',
                'These agents do not belong to any squad and can be freely assigned to any individual contract.'
              )}
            </p>

            {unassignedAgents.length > 0 ? (
              <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-2">
                {unassignedAgents.map(agent => {
                  const model = state.savedModels.find(m => m.id === agent.modelId);
                  const isBusy = busyAgentIds.has(agent.id);

                  return (
                    <div 
                      key={agent.id}
                      className="p-2.5 rounded bg-zinc-950 border border-zinc-800 flex items-center justify-between text-xs"
                    >
                      <div>
                        <div className="flex items-center gap-1.5">
                          <span className="font-bold text-zinc-200">{agent.name}</span>
                          <span className="text-[10px] text-cyan-400 font-mono">
                            {getRoleSimpleName(agent.role, state.language)}
                          </span>
                        </div>
                        <p className="text-[10px] text-zinc-500 mt-0.5">
                          {model?.name ?? 'Modelo'} · {model ? `${(model.parametersCount / 1e6).toFixed(0)}M` : ''} · IQ {model?.reasoningScore ?? 0}
                        </p>
                      </div>

                      <span className={`text-[9px] px-1.5 py-0.5 rounded font-bold ${
                        isBusy 
                          ? 'bg-amber-950 text-amber-300 border border-amber-500/30'
                          : 'bg-emerald-950 text-emerald-300 border border-emerald-500/30'
                      }`}>
                        {isBusy ? localize(state.language, 'EN MISIÓN', 'IN MISSION') : localize(state.language, 'LIBRE', 'FREE')}
                      </span>
                    </div>
                  );
                })}
              </div>
            ) : (
              <p className="text-xs text-zinc-500 italic p-2 bg-zinc-950 rounded border border-zinc-900">
                {localize(state.language, 'Todos los agentes del clúster están actualmente asignados a un escuadrón.', 'All cluster agents are currently assigned to a squad.')}
              </p>
            )}
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* SQUAD CREATOR / EDITOR MODAL                                              */}
      {/* ========================================================================= */}
      {isSquadModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 p-4">
          <div className="bg-[#090f19] border border-cyan-800 rounded-lg max-w-lg w-full p-4 space-y-4 shadow-[0_0_30px_rgba(0,255,200,0.15)] font-mono">
            <div className="flex items-center justify-between border-b border-zinc-800 pb-2">
              <h3 className="text-sm font-bold text-cyan-300 flex items-center gap-2">
                <Users className="w-4 h-4 text-cyan-400" />
                <span>
                  {editingSquadId 
                    ? localize(state.language, 'Editar Escuadrón de Bots', 'Edit Bot Squad')
                    : localize(state.language, 'Crear Nuevo Escuadrón de Bots', 'Create New Bot Squad')}
                </span>
              </h3>
              <button
                onClick={() => setIsSquadModalOpen(false)}
                className="text-zinc-400 hover:text-zinc-200 cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleSaveSquad} className="space-y-3">
              <div>
                <label className="block text-xs text-zinc-400 mb-1">
                  {localize(state.language, 'Nombre del Escuadrón:', 'Squad Name:')}
                </label>
                <input
                  type="text"
                  value={squadName}
                  onChange={e => setSquadName(e.target.value)}
                  placeholder="e.g. Escuadrón Alfa, Trading Task Force..."
                  className="w-full bg-zinc-900 border border-zinc-700 rounded px-2.5 py-1.5 text-xs text-zinc-100 focus:outline-none focus:border-cyan-500"
                  required
                />
              </div>

              <div>
                <label className="block text-xs text-zinc-400 mb-1">
                  {localize(state.language, 'Color Identificador:', 'Squad Accent Color:')}
                </label>
                <div className="flex items-center gap-2">
                  {SQUAD_COLORS.map(c => (
                    <button
                      key={c.hex}
                      type="button"
                      onClick={() => setSquadColor(c.hex)}
                      className={`w-7 h-7 rounded-full border-2 transition-transform cursor-pointer ${
                        squadColor === c.hex ? 'scale-110 border-white shadow-lg' : 'border-transparent opacity-70 hover:opacity-100'
                      }`}
                      style={{ backgroundColor: c.hex }}
                      title={c.name}
                    />
                  ))}
                </div>
              </div>

              <div>
                <div className="flex items-center justify-between mb-1">
                  <label className="text-xs text-zinc-400">
                    {localize(state.language, 'Seleccionar Agentes Miembros:', 'Select Agent Members:')}
                  </label>
                  <span className="text-[10px] text-zinc-500">
                    {squadMemberIds.length} {localize(state.language, 'seleccionados', 'selected')}
                  </span>
                </div>

                <div className="p-2 bg-zinc-950 border border-zinc-800 rounded max-h-48 overflow-y-auto space-y-1">
                  {state.agents.length > 0 ? (
                    state.agents.map(agent => {
                      const currentSquad = botGroups.find(g => g.agentIds.includes(agent.id) && g.id !== editingSquadId);
                      const isSelected = squadMemberIds.includes(agent.id);
                      const model = state.savedModels.find(m => m.id === agent.modelId);

                      return (
                        <label
                          key={agent.id}
                          className={`flex items-center justify-between p-1.5 rounded text-xs border cursor-pointer transition-colors ${
                            isSelected
                              ? 'border-cyan-500 bg-cyan-950/40 text-cyan-200'
                              : 'border-zinc-800 bg-zinc-900/60 text-zinc-400 hover:border-zinc-700'
                          }`}
                        >
                          <div className="flex items-center gap-2">
                            <input
                              type="checkbox"
                              checked={isSelected}
                              onChange={e => {
                                setSquadMemberIds(prev => 
                                  e.target.checked 
                                    ? [...prev, agent.id] 
                                    : prev.filter(id => id !== agent.id)
                                );
                              }}
                              className="accent-cyan-500"
                            />
                            <span className="font-bold text-zinc-200">{agent.name}</span>
                            <span className="text-[10px] text-cyan-400">
                              {getRoleSimpleName(agent.role, state.language)}
                            </span>
                          </div>

                          <div className="text-[10px] text-right">
                            {currentSquad ? (
                              <span className="text-amber-400">
                                ↺ {localize(state.language, `Se moverá desde "${currentSquad.name}"`, `Will move from "${currentSquad.name}"`)}
                              </span>
                            ) : (
                              <span className="text-zinc-500">
                                {model?.name ?? 'Modelo'} ({(model?.parametersCount ?? 0) / 1e6}M)
                              </span>
                            )}
                          </div>
                        </label>
                      );
                    })
                  ) : (
                    <p className="text-xs text-zinc-500 italic p-1 text-center">
                      {localize(state.language, 'No hay agentes creados en el clúster todavía.', 'No agents created in cluster yet.')}
                    </p>
                  )}
                </div>
              </div>

              <div className="flex items-center justify-end gap-2 pt-2 border-t border-zinc-800">
                <button
                  type="button"
                  onClick={() => setIsSquadModalOpen(false)}
                  className="px-3 py-1.5 rounded bg-zinc-800 hover:bg-zinc-700 text-zinc-300 text-xs font-semibold cursor-pointer"
                >
                  {localize(state.language, 'Cancelar', 'Cancel')}
                </button>
                <button
                  type="submit"
                  disabled={!squadName.trim()}
                  className="px-4 py-1.5 rounded bg-cyan-500 hover:bg-cyan-400 text-zinc-950 text-xs font-bold cursor-pointer disabled:opacity-50"
                >
                  {localize(state.language, 'Guardar Escuadrón', 'Save Squad')}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
