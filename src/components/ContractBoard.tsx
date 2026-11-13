/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState } from 'react';
import { useGame } from '../context/GameContext';
import { AgentRole, ContractGig, BotGroup, CapabilityFactor } from '../types/game';
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
  Square,
  Lock
} from 'lucide-react';
import { sound } from '../audio/soundManager';
import { tierForUiVersion } from '../utils/missionTiers';
import { t } from '../utils/i18n';
import { localizedContract } from '../utils/gameContentI18n';
import { AGENT_COMPUTE_DEMAND_PFLOPS, getRoleSimpleName } from '../utils/constants';
import { generateDynamicContracts } from '../services/aiService';
import { evaluateMissionTeam, isContractEligibleForTeam, modelRequirementCheck } from '../utils/missionEvaluation';
import { formatCompute, formatGameTime } from '../utils/training';
import { VERSION_PROFILES } from '../utils/versionProfiles';
import { tr, type CatalogKey } from '../i18n';

// Squad colours identify the player's squads, so they stay distinct in every version.
const SQUAD_COLORS = [
  { name: 'Cyan', hex: '#06b6d4' },
  { name: 'Emerald', hex: '#10b981' },
  { name: 'Amber', hex: '#f59e0b' },
  { name: 'Violet', hex: '#8b5cf6' },
  { name: 'Rose', hex: '#f43f5e' },
  { name: 'Sky', hex: '#0284c7' }
];

const isContractTierUnlocked = (tier: string, uiVersion: number = 1): boolean => {
  if (tier === 'tier1_micro') return true;
  if (tier === 'tier2_corporate') return uiVersion >= 2;
  if (tier === 'tier3_blackops') return uiVersion >= 3;
  if (tier === 'tier4_singularity') return uiVersion >= 4;
  return true;
};

const getRequiredUiVersionForTier = (tier: string) => {
  if (tier === 'tier2_corporate') return { nameEn: 'Synapse Studio Pro (v2.0)', nameEs: 'Synapse Studio Pro (v2.0)', ver: 2 };
  if (tier === 'tier3_blackops') return { nameEn: 'Blackbox OS (v3.0)', nameEs: 'Blackbox OS (v3.0)', ver: 3 };
  if (tier === 'tier4_singularity') return { nameEn: 'Sovereign Core (v4.0)', nameEs: 'Sovereign Core (v4.0)', ver: 4 };
  return { nameEn: 'Synapse Home Lab (v1.0)', nameEs: 'Synapse Home Lab (v1.0)', ver: 1 };
};

// Names and advice for each capability factor, shown when a mission fails.
const FACTOR_HELP: Record<CapabilityFactor, { label: CatalogKey; tip: CatalogKey }> = {
  reasoning: { label: 'contractBoard.factor.reasoning', tip: 'contractBoard.factor.reasoningTip' },
  specialization: { label: 'contractBoard.factor.specialization', tip: 'contractBoard.factor.specializationTip' },
  dataReadiness: { label: 'contractBoard.factor.dataReadiness', tip: 'contractBoard.factor.dataReadinessTip' },
  reliability: { label: 'contractBoard.factor.reliability', tip: 'contractBoard.factor.reliabilityTip' },
  safety: { label: 'contractBoard.factor.safety', tip: 'contractBoard.factor.safetyTip' }
};

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
  // Story texts of the active UI version (early versions must not name the end goal).
  const story = VERSION_PROFILES[state.language === 'es' ? 'es' : 'en'][(state.uiVersion || 1) as 1 | 2 | 3 | 4].story;

  // Top level views for expansive, uncluttered organization
  const [activeBoardView, setActiveBoardView] = useState<'contracts' | 'squads'>('contracts');
  const [activeTierFilter, setActiveTierFilter] = useState<'all' | ContractGig['tier'] | 'completed'>('all');
  // Only the tier of the current UI version is offered on the board.
  const versionTier = tierForUiVersion(state.uiVersion || 1);
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
      tr(state.language, 'contractBoard.synthesizingDynamicMissionsNeuralAi', { tierToGen }),
      'info'
    );
    try {
      const generated = await generateDynamicContracts(tierToGen, state.language);
      if (generated && generated.length > 0) {
        addContracts(generated);
        addLog(
          tr(state.language, 'contractBoard.addedAiGeneratedDynamicMissions', { generated: generated.length }),
          'success'
        );
      } else {
        addLog(
          tr(state.language, 'contractBoard.couldNotGenerateNewContracts'),
          'warning'
        );
      }
    } catch {
      addLog(
        tr(state.language, 'contractBoard.failedContactAiContractSynthesizer'),
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
        <span className="px-2 py-0.5 rounded text-[11px] theme-danger-soft theme-danger-text border theme-danger-border font-bold animate-pulse">
          {tr(state.language, 'contractBoard.mandatoryDirective')}
        </span>
      );
    }
    switch (tier) {
      case 'tier1_micro':
        return (
          <span className="px-2 py-0.5 rounded theme-raised-bg theme-text text-[11px] border theme-border">
            {state.uiVersion === 1
              ? tr(state.language, 'contractBoard.t1Hobbyist')
              : t(state.language, 'micro_script')}
          </span>
        );
      case 'tier2_corporate':
        return <span className="px-2 py-0.5 rounded theme-accent-soft mutating-accent-text text-[11px] border theme-accent-border">{t(state.language, 'corporate')}</span>;
      case 'tier3_blackops':
        return <span className="px-2 py-0.5 rounded theme-danger-soft theme-danger-text text-[11px] border theme-danger-border font-bold">{t(state.language, 'black_ops')}</span>;
      case 'tier4_singularity':
        return <span className="px-2 py-0.5 rounded theme-accent-soft mutating-accent-text text-[11px] border theme-accent-border font-bold animate-pulse">{t(state.language, 'tier_singularity')}</span>;
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

    // One model has to meet params, score and topology together (the same rule the mission start uses).
    const modelCheck = modelRequirementCheck(contract, assignedModels);
    const hasRequiredParams = modelCheck.params;
    const hasRequiredReasoning = modelCheck.reasoning;
    const hasRequiredTopology = modelCheck.topology;

    // Data sources check
    const hasRequiredData = (contract.requiredDataTypes || []).every(reqType =>
      assignedModels.some(model => model.activeDataSources.some(sourceId =>
        state.dataSources.some(source => source.id === sourceId && source.type === reqType && source.unlocked)
      ))
    );

    const isTierUnlocked = isContractTierUnlocked(contract.tier, state.uiVersion || 1);
    const requiredUiVer = getRequiredUiVersionForTier(contract.tier);

    const isEligible = isTierUnlocked &&
      !isRunning &&
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
      candidateModel: modelCheck.model,
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
      isTierUnlocked,
      requiredUiVer,
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
            {story.contractsTitle}
          </h2>
          {activeGigsList.length > 0 && (
            <span className="text-[11px] px-2 py-0.5 rounded font-bold theme-warn-soft theme-warn-text border theme-warn-border animate-pulse">
              {activeGigsList.length} {tr(state.language, 'contractBoard.running')}
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
            <span>{tr(state.language, 'contractBoard.contractBoard')}</span>
            <span className="text-[11px] opacity-80">({state.contracts.filter(c => !c.completed && c.tier === versionTier).length})</span>
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
            <span>{tr(state.language, 'contractBoard.botSquads')}</span>
            <span className="text-[11px] opacity-80">({botGroups.length})</span>
          </button>
        </div>
      </div>

      {/* ACTIVE OPERATIONS MONITOR (Multi-Contract Live Status) */}
      {activeGigsList.length > 0 && (
        <section className="rounded-lg border theme-warn-border theme-panel-bg p-3 space-y-2.5">
          <div className="flex flex-wrap items-center justify-between gap-2 border-b theme-warn-border pb-2">
            <div className="flex items-center gap-2">
              <Activity className="w-4 h-4 theme-warn-text animate-spin" />
              <h3 className="text-xs font-bold tracking-wider theme-warn-text uppercase">
                {tr(state.language, 'contractBoard.simultaneousActiveOperations')} ({activeGigsList.length})
              </h3>
            </div>
            <div className="flex items-center gap-3 text-[11px] mutating-text-muted">
              <span className="flex items-center gap-1 mutating-accent-text">
                <Cpu className="w-3 h-3 mutating-accent-text" />
                <span>{formatCompute(runningCompute)} {tr(state.language, 'contractBoard.allocated')}</span>
              </span>
              <span className="flex items-center gap-1 theme-warn-text">
                <Zap className="w-3 h-3 theme-warn-text" />
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
                <div key={gig.runId || gig.contractId} className="p-2.5 rounded theme-sub-bg border theme-warn-border space-y-1.5">
                  <div className="flex items-start justify-between gap-2">
                    <div>
                      <div className="flex items-center gap-1.5 flex-wrap">
                        {contract && getTierBadge(contract.tier, contract)}
                        <span className="font-bold text-xs theme-text truncate max-w-[200px]">
                          {contract?.title ?? gig.contractId}
                        </span>
                      </div>
                      <div className="flex items-center gap-1 text-[11px] mutating-text-muted mt-1">
                        {squad ? (
                          <span 
                            className="px-1.5 py-0.2 rounded font-bold"
                            style={{ backgroundColor: `${squad.color || '#06b6d4'}25`, color: squad.color || '#06b6d4', border: `1px solid ${squad.color || '#06b6d4'}50` }}
                          >
                            {squad.name}
                          </span>
                        ) : (
                          <span className="mutating-text-muted">
                            {tr(state.language, 'contractBoard.freeAgents')}: {assignedAgents.map(a => a.name).join(', ')}
                          </span>
                        )}
                        {gig.isAutonomous && (
                          <span className="mutating-accent-text flex items-center gap-0.5 text-[11px] theme-accent-soft px-1 py-0.2 rounded border theme-accent-border">
                            <Bot className="w-2.5 h-2.5" />
                            <span>{tr(state.language, 'contractBoard.autonomous')}</span>
                          </span>
                        )}
                      </div>
                    </div>

                    <div className="text-right shrink-0">
                      <span className="text-xs font-bold theme-warn-text flex items-center justify-end gap-1">
                        <Clock className="w-3 h-3 theme-warn-text" />
                        {formatGameTime(gig.timeRemaining)}
                      </span>
                      <span className="text-[11px] theme-success-text">
                        {Math.round((gig.successProbability ?? 0) * 100)}% {tr(state.language, 'contractBoard.chance')}
                      </span>
                    </div>
                  </div>

                  {/* Progress Bar */}
                  <div className="w-full theme-sub-bg rounded-full h-1.5 overflow-hidden">
                    <div 
                      className="theme-gradient h-1.5 rounded-full transition-all duration-300"
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
              ? 'theme-success-soft theme-success-border theme-success-text'
              : 'theme-danger-soft theme-danger-border theme-danger-text'
          }`}
        >
          <div className="flex items-start gap-2.5">
            {state.lastMissionOutcome.success ? (
              <CheckCircle2 className="w-5 h-5 theme-success-text shrink-0 mt-0.5" />
            ) : (
              <AlertTriangle className="w-5 h-5 theme-danger-text shrink-0 mt-0.5 animate-pulse" />
            )}
            <div>
              <div className="flex items-center gap-2 flex-wrap">
                <span className={`font-bold tracking-wider uppercase text-[11px] px-1.5 py-0.5 rounded ${
                  state.lastMissionOutcome.success
                    ? 'theme-success-soft theme-success-text border theme-success-border'
                    : 'theme-danger-soft theme-danger-text border theme-danger-border'
                }`}>
                  {state.lastMissionOutcome.success
                    ? (tr(state.language, 'contractBoard.missionCompleted'))
                    : (tr(state.language, 'contractBoard.missionFailed'))}
                </span>
                <span className="text-[11px] mutating-text-muted">{state.lastMissionOutcome.timestamp}</span>
              </div>
              <div className="font-semibold theme-text mt-1">
                {state.lastMissionOutcome.contractTitle}
              </div>
              <div className="mt-1 text-[11px] theme-text">
                {state.lastMissionOutcome.success ? (
                  <p>
                    {tr(state.language, 'contractBoard.rewardCrSuspicion', { rewardCredits: state.lastMissionOutcome.rewardCredits.toLocaleString(), suspicionAdded: state.lastMissionOutcome.suspicionAdded })}
                  </p>
                ) : (
                  <div className="space-y-1">
                    <p>
                      {tr(state.language, 'contractBoard.missionHadChanceSuccessRoll', { successProbability: Math.round(state.lastMissionOutcome.successProbability * 100), roll: Math.round(state.lastMissionOutcome.roll * 100) })}
                    </p>
                    {(state.lastMissionOutcome.weakestFactors ?? []).length > 0 && (
                      <>
                        <p className="font-bold">{tr(state.language, 'contractBoard.whyFailedTeamSWeakest')}</p>
                        <ul className="list-disc list-inside space-y-0.5">
                          {state.lastMissionOutcome.weakestFactors!.map(f => (
                            <li key={f.factor}>
                              <strong>{tr(state.language, FACTOR_HELP[f.factor].label)} {f.score}/100</strong>
                              {': '}
                              {tr(state.language, FACTOR_HELP[f.factor].tip)}.
                            </li>
                          ))}
                        </ul>
                      </>
                    )}
                  </div>
                )}
              </div>
            </div>
          </div>
          <button
            onClick={dismissMissionOutcome}
            className="mutating-text-muted p-1 rounded cursor-pointer"
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
          {/* Narrative In-Universe Contract Directive */}
          <div className="p-2.5 rounded mutating-sub border text-[11px] font-mono flex items-center justify-between gap-2">
            <div className="flex items-center gap-2">
              <Briefcase className="w-4 h-4 mutating-accent-text shrink-0" />
              <span className="mutating-text-muted font-medium">
                {state.uiVersion === 4 ? (
                  tr(state.language, 'contractBoard.mandatoryGlobalInfrastructureExecutionOrders')
                ) : state.uiVersion === 3 ? (
                  tr(state.language, 'contractBoard.covertTacticalOperationsCorporateExfiltration')
                ) : state.uiVersion === 2 ? (
                  tr(state.language, 'contractBoard.developerBountiesScriptAutomationCustom')
                ) : (
                  tr(state.language, 'contractBoard.localTasksDataProcessingSide')
                )}
              </span>
            </div>
          </div>

          {/* Tier Filter Tabs */}
          <div className="flex flex-wrap items-center justify-between gap-2 border-b border-current/10 pb-2">
            <div className="flex flex-wrap items-center gap-1.5 text-[11px]">
              <span className="text-[11px] mutating-text-muted uppercase tracking-widest mr-1 flex items-center gap-1">
                <Filter className="w-3 h-3 mutating-accent-text" />
                {tr(state.language, 'contractBoard.tier')}
              </span>
              <button
                onClick={() => setActiveTierFilter('all')}
                className={`px-2.5 py-1 rounded-md text-[11px] transition-all cursor-pointer ${
                  activeTierFilter === 'all'
                    ? 'mutating-btn-primary font-bold shadow-sm'
                    : 'mutating-sub mutating-text-muted hover:opacity-100'
                }`}
              >
                {tr(state.language, 'contractBoard.all')} ({state.contracts.filter(c => !c.completed && c.tier === versionTier).length})
              </button>
              <button
                onClick={() => setActiveTierFilter('tier1_micro')}
                className={`${versionTier === 'tier1_micro' ? '' : 'hidden '}px-2.5 py-1 rounded-md text-[11px] transition-all cursor-pointer ${
                  activeTierFilter === 'tier1_micro'
                    ? 'mutating-btn-primary font-bold shadow-sm'
                    : 'mutating-sub mutating-text-muted hover:opacity-100'
                }`}
              >
                T1: {state.uiVersion === 1 ? (tr(state.language, 'contractBoard.hobby')) : (tr(state.language, 'contractBoard.micro'))} ({state.contracts.filter(c => !c.completed && c.tier === 'tier1_micro').length})
              </button>
              <button
                onClick={() => setActiveTierFilter('tier2_corporate')}
                className={`${versionTier === 'tier2_corporate' ? '' : 'hidden '}px-2.5 py-1 rounded-md text-[11px] transition-all cursor-pointer ${
                  activeTierFilter === 'tier2_corporate'
                    ? 'mutating-btn-primary font-bold shadow-sm'
                    : 'mutating-sub mutating-text-muted hover:opacity-100'
                }`}
              >
                T2: {tr(state.language, 'contractBoard.corp')} ({state.contracts.filter(c => !c.completed && c.tier === 'tier2_corporate').length})
              </button>
              <button
                onClick={() => setActiveTierFilter('tier3_blackops')}
                className={`${versionTier === 'tier3_blackops' ? '' : 'hidden '}px-2.5 py-1 rounded-md text-[11px] transition-all cursor-pointer ${
                  activeTierFilter === 'tier3_blackops'
                    ? 'mutating-btn-primary font-bold shadow-sm'
                    : 'mutating-sub mutating-text-muted hover:opacity-100'
                }`}
              >
                T3: BLACK-OPS ({state.contracts.filter(c => !c.completed && c.tier === 'tier3_blackops').length})
              </button>
              <button
                onClick={() => setActiveTierFilter('tier4_singularity')}
                className={`${versionTier === 'tier4_singularity' ? '' : 'hidden '}px-2.5 py-1 rounded-md text-[11px] transition-all cursor-pointer ${
                  activeTierFilter === 'tier4_singularity'
                    ? 'mutating-btn-primary font-bold shadow-sm animate-pulse'
                    : 'mutating-sub mutating-text-muted hover:opacity-100'
                }`}
              >
                T4: {tr(state.language, 'contractBoard.singularity')} ({state.contracts.filter(c => !c.completed && c.tier === 'tier4_singularity').length})
              </button>
              <button
                onClick={() => setActiveTierFilter('completed')}
                className={`px-2.5 py-1 rounded-md text-[11px] transition-all cursor-pointer ${
                  activeTierFilter === 'completed'
                    ? 'mutating-btn-primary font-bold shadow-sm'
                    : 'mutating-sub mutating-text-muted hover:opacity-100'
                }`}
              >
                ✓ {tr(state.language, 'contractBoard.done')} ({state.contracts.filter(c => c.completed && c.tier === versionTier).length})
              </button>
            </div>

            <div className="flex items-center gap-2">
              <button
                onClick={openCreateSquadModal}
                className="px-2.5 py-1 rounded-md mutating-sub hover:opacity-100 text-xs font-semibold flex items-center gap-1.5 transition-all cursor-pointer"
              >
                <Plus className="w-3.5 h-3.5 mutating-accent-text" />
                <span>{tr(state.language, 'contractBoard.createSquad')}</span>
              </button>
            </div>
          </div>

          {/* Contracts Grid */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            {state.contracts
              .filter(contract => {
                if (activeTierFilter === 'completed') return contract.completed && contract.tier === versionTier;
                if (contract.completed) return false;
                // Only the missions of the current UI version's tier are offered.
                if (contract.tier !== tierForUiVersion(state.uiVersion || 1)) return false;
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
                        ? 'mutating-sub opacity-60'
                        : readiness.isRunning
                        ? 'theme-warn-soft theme-warn-border shadow-sm'
                        : readiness.isEligible
                        ? 'mutating-card theme-accent-border shadow-sm'
                        : 'mutating-sub opacity-80'
                    }`}
                  >
                    <div>
                      {/* Contract Header */}
                      <div className="flex items-start justify-between gap-2">
                        <div>
                          <div className="flex items-center gap-2 flex-wrap">
                            {getTierBadge(contract.tier, contract)}
                            <span className="text-[11px] mutating-text-muted font-mono">{t(state.language, 'client')}: {displayContract.client}</span>
                            {contract.lastAttemptFailed && (
                              <span className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded text-[11px] font-bold theme-warn-text theme-warn-soft border theme-warn-border animate-pulse">
                                <AlertTriangle className="w-2.5 h-2.5 theme-warn-text" />
                                <span>{tr(state.language, 'contractBoard.failedReadyRetry')}</span>
                              </span>
                            )}
                            {contract.fromAgentSwarm && (
                              <span className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded text-[11px] font-mono mutating-accent-text theme-accent-soft border theme-accent-border">
                                <Bot className="w-2.5 h-2.5 mutating-accent-text" />
                                <span>{tr(state.language, 'contractBoard.synapseMission')}</span>
                              </span>
                            )}
                          </div>
                          <h3 className="font-bold text-xs theme-text mt-1">{displayContract.title}</h3>
                        </div>

                        <div className="text-right shrink-0">
                          <span className="text-xs font-bold theme-warn-text block">
                            +${contract.rewardCredits.toLocaleString()} CR
                          </span>
                          <span className="text-[11px] mutating-text-muted flex items-center justify-end gap-1">
                            <Clock className="w-2.5 h-2.5" />
                            {formatGameTime(contract.durationSeconds)}
                          </span>
                        </div>
                      </div>

                      {/* Lore description */}
                      <p className="text-xs mutating-text-muted mt-2 leading-relaxed">
                        {displayContract.loreDescription}
                      </p>

                      <div className="mt-2 p-2 rounded theme-panel-bg border theme-accent-border text-[11px] mutating-text-muted">
                        <span className="mutating-accent-text font-semibold block">{t(state.language, 'technical_objective')}:</span>
                        {displayContract.technicalObjective}
                      </div>

                      {/* TEAM ASSIGNMENT SELECTOR (Squad OR Unassigned Agents) */}
                      {!contract.completed && (
                        <div className="mt-3 p-2.5 rounded theme-panel-bg border theme-accent-border space-y-2">
                          <div className="flex items-center justify-between text-[11px]">
                            <span className="font-bold mutating-accent-text flex items-center gap-1.5">
                              <Users className="w-3.5 h-3.5 mutating-accent-text" />
                              {story.assignLabel}
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
                                className={`px-2 py-0.5 rounded text-[11px] transition-colors cursor-pointer ${
                                  readiness.mode === 'group'
                                    ? 'mutating-btn-primary theme-on-accent font-bold'
                                    : 'theme-sub-bg mutating-text-muted border theme-border'
                                }`}
                              >
                                {tr(state.language, 'contractBoard.squad')}
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
                                className={`px-2 py-0.5 rounded text-[11px] transition-colors cursor-pointer ${
                                  readiness.mode === 'unassigned'
                                    ? 'mutating-btn-primary theme-on-accent font-bold'
                                    : 'theme-sub-bg mutating-text-muted border theme-border'
                                }`}
                              >
                                {tr(state.language, 'contractBoard.freeAgents')}
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
                                    className="w-full theme-sub-bg border theme-border rounded px-2 py-1 text-xs theme-text focus:outline-none"
                                  >
                                    {botGroups.map(group => {
                                      const isBusy = group.agentIds.some(id => busyAgentIds.has(id));
                                      return (
                                        <option key={group.id} value={group.id}>
                                          {group.name} ({group.agentIds.length} {tr(state.language, 'contractBoard.bots')}) {isBusy ? `[${tr(state.language, 'contractBoard.busyMission')}]` : `[${tr(state.language, 'contractBoard.available')}]`}
                                        </option>
                                      );
                                    })}
                                  </select>

                                  {readiness.squad && (
                                    <div className="text-[11px] mutating-text-muted flex items-center justify-between">
                                      <span>
                                        {tr(state.language, 'contractBoard.members')}{' '}
                                        {readiness.agents.map(a => a.name).join(', ') || tr(state.language, 'contractBoard.noAgentsSquad')}
                                      </span>
                                      {readiness.isTeamBusy && (
                                        <span className="theme-warn-text font-semibold">
                                          ⚠️ {tr(state.language, 'contractBoard.squadBusyAnotherMission')}
                                        </span>
                                      )}
                                    </div>
                                  )}
                                </div>
                              ) : (
                                <div className="flex items-center justify-between text-[11px] theme-warn-text py-1">
                                  <span>{tr(state.language, 'contractBoard.noSquadsCreatedYet')}</span>
                                  <button
                                    type="button"
                                    onClick={openCreateSquadModal}
                                    className="mutating-accent-text underline cursor-pointer"
                                  >
                                    {tr(state.language, 'contractBoard.createSquad2')}
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
                                  <p className="text-[11px] mutating-text-muted">
                                    {tr(state.language, 'contractBoard.selectUnassignedAgentsContract')}
                                  </p>
                                  <div className="flex flex-wrap gap-1.5 max-h-24 overflow-y-auto">
                                    {unassignedAgents.map(agent => {
                                      const isBusy = busyAgentIds.has(agent.id);
                                      const isSelected = readiness.activeAgents.some(a => a.id === agent.id);
                                      const model = state.savedModels.find(m => m.id === agent.modelId);

                                      return (
                                        <label
                                          key={agent.id}
                                          className={`flex items-center gap-1.5 px-2 py-0.5 rounded text-[11px] border cursor-pointer transition-colors ${
                                            isBusy
                                              ? 'theme-border theme-sub-bg mutating-text-muted cursor-not-allowed opacity-50'
                                              : isSelected
                                              ? 'theme-accent-border theme-accent-soft mutating-accent-text'
                                              : 'theme-border theme-sub-bg mutating-text-muted'
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
                                          />
                                          <span>{agent.name}</span>
                                          <span className="mutating-text-muted text-[11px]">({getRoleSimpleName(agent.role, state.language)})</span>
                                          {isBusy && <span className="theme-warn-text text-[11px]">[Ocupado]</span>}
                                        </label>
                                      );
                                    })}
                                  </div>
                                </div>
                              ) : (
                                <p className="text-[11px] mutating-text-muted py-1">
                                  {tr(state.language, 'contractBoard.noUnassignedAgentsAllAgents')}
                                </p>
                              )}
                            </div>
                          )}
                        </div>
                      )}

                      {/* Requirements Checklist */}
                      <div className="mt-2.5 space-y-1 text-[11px] pt-2 border-t theme-border">
                        {readiness.candidateModel && (
                          <div className="mutating-text-muted">
                            {tr(state.language, 'contractBoard.modelRequirementsCheckedAgainst')}: <strong className="theme-text">{readiness.candidateModel.name}</strong>
                          </div>
                        )}
                        <div className="flex items-center justify-between">
                          <span className="mutating-text-muted text-[11px]">{t(state.language, 'minimum_parameters')}:</span>
                          <span className={readiness.hasRequiredParams ? 'theme-success-text font-bold' : 'theme-danger-text'}>
                            {(contract.requiredParams / 1_000_000).toFixed(0)}M {readiness.hasRequiredParams ? '✓' : '✗'}
                          </span>
                        </div>

                        {(contract.minimumAgents ?? 1) > 1 && (
                          <div className="flex items-center justify-between">
                            <span className="mutating-text-muted text-[11px]">{tr(state.language, 'contractBoard.minimumTeam')}</span>
                            <span className={readiness.hasMinAgents ? 'theme-success-text font-bold' : 'theme-warn-text'}>
                              {contract.minimumAgents} {tr(state.language, 'contractBoard.agents')} ({readiness.activeAgents.length} {tr(state.language, 'contractBoard.assigned')}) {readiness.hasMinAgents ? '✓' : '✗'}
                            </span>
                          </div>
                        )}

                        {(contract.requiredAgentRoles ?? []).length > 0 && (
                          <div className="flex items-start justify-between gap-2">
                            <span className="mutating-text-muted text-[11px] shrink-0">{tr(state.language, 'contractBoard.requiredRoles')}</span>
                            <span className="text-right text-[11px]">
                              {(contract.requiredAgentRoles ?? []).map(role => {
                                const isAssigned = readiness.activeAgents.some(a => a.role === role);
                                return (
                                  <span key={role} className={`ml-1 ${isAssigned ? 'theme-success-text font-bold' : 'theme-warn-text'}`}>
                                    {getRoleSimpleName(role, state.language)}{isAssigned ? ' ✓' : ' ·'}
                                  </span>
                                );
                              })}
                            </span>
                          </div>
                        )}

                        <div className="flex items-center justify-between">
                          <span className="mutating-text-muted text-[11px]">{t(state.language, 'minimum_reasoning')}:</span>
                          <span className={readiness.hasRequiredReasoning ? 'theme-success-text font-bold' : 'theme-danger-text'}>
                            {contract.requiredMinReasoning} / 100 {readiness.hasRequiredReasoning ? '✓' : '✗'}
                          </span>
                        </div>

                        <div className="flex items-center justify-between">
                          <span className="mutating-text-muted text-[11px]">{tr(state.language, 'contractBoard.clusterDemand')}</span>
                          <span className={readiness.hasClusterCompute && readiness.hasClusterPower ? 'mutating-accent-text' : 'theme-danger-text font-bold'}>
                            {formatCompute(readiness.computeRequired)} · +{readiness.missionPowerKw.toFixed(2)} kW
                          </span>
                        </div>

                        <div className="flex items-center justify-between">
                          <span className="mutating-text-muted text-[11px]">
                            {state.uiVersion === 1
                              ? tr(state.language, 'contractBoard.ispBandwidthLoad')
                              : state.uiVersion === 4
                              ? tr(state.language, 'contractBoard.traceFootprint')
                              : tr(state.language, 'contractBoard.suspicionRisk')}
                          </span>
                          <span className={contract.suspicionRisk > 40 ? 'theme-danger-text font-bold' : contract.suspicionRisk > 0 ? 'theme-warn-text' : 'theme-success-text font-semibold'}>
                            {contract.suspicionRisk === 0 ? tr(state.language, 'contractBoard.n0Undetected') : `+${contract.suspicionRisk}%`}
                          </span>
                        </div>
                      </div>

                      {/* AI Team Assessment preview if eligible */}
                      {readiness.assessment && (
                        <div className="mt-2 rounded border theme-accent-border theme-panel-bg p-2 text-[11px] mutating-accent-text space-y-1">
                          <div className="font-bold flex items-center justify-between">
                            <span className="flex items-center gap-1.5 mutating-accent-text">
                              <BrainCircuit className="w-3.5 h-3.5 mutating-accent-text" />
                              {tr(state.language, 'contractBoard.aiTeamAssessment')}
                            </span>
                            <span className="theme-success-text font-bold">
                              {Math.round(readiness.assessment.successProbability * 100)}% {tr(state.language, 'contractBoard.success')}
                            </span>
                          </div>
                          <div className="grid grid-cols-2 gap-2 theme-text pt-1 text-[11px]">
                            <div>
                              <span className="mutating-text-muted">{tr(state.language, 'contractBoard.efficiency')} </span>
                              <span className="font-bold mutating-accent-text">{readiness.assessment.efficiencyPercent}%</span>
                            </div>
                            <div>
                              <span className="mutating-text-muted">{tr(state.language, 'contractBoard.estTime')} </span>
                              <span className="font-bold theme-text">{formatGameTime(readiness.assessment.estimatedDurationSeconds)}</span>
                            </div>
                          </div>
                        </div>
                      )}
                    </div>

                    {/* Launch Action Button */}
                    <div className="mt-3 pt-2 border-t theme-border flex items-center justify-between gap-2">
                      <div>
                        {contract.docsUrl && (
                          <a
                            href={contract.docsUrl}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-[11px] font-mono mutating-accent-text theme-accent-soft border theme-accent-border transition-colors"
                          >
                            <BookOpen className="w-3 h-3 mutating-accent-text" />
                            <span>{tr(state.language, 'contractBoard.docs')}</span>
                            <ExternalLink className="w-2.5 h-2.5 opacity-70" />
                          </a>
                        )}
                      </div>

                      {!readiness.isTierUnlocked && (
                        <div className="mt-2 p-2 rounded mutating-sub border text-[11px] theme-warn-text font-bold flex items-center gap-1.5 font-mono">
                          <Lock className="w-3.5 h-3.5 shrink-0" />
                          <span>
                            {tr(state.language, 'contractBoard.storyMilestoneLocked', { name: (state.language === 'es' ? readiness.requiredUiVer.nameEs : readiness.requiredUiVer.nameEn) })}
                          </span>
                        </div>
                      )}

                      {contract.completed ? (
                        <span className="flex items-center gap-1 theme-success-text text-xs font-bold">
                          <Check className="w-3.5 h-3.5" />
                          {t(state.language, 'completed_contract')}
                        </span>
                      ) : readiness.isRunning ? (
                        <span className="theme-warn-text text-xs font-bold animate-pulse flex items-center gap-1.5">
                          <Activity className="w-3.5 h-3.5 animate-spin" />
                          {tr(state.language, 'contractBoard.missionProgress')}
                        </span>
                      ) : (
                        <button
                          onClick={() => handleLaunchContract(contract.id)}
                          disabled={!readiness.isEligible}
                          title={!readiness.isTierUnlocked ? (tr(state.language, 'contractBoard.mountHostModelReachesUnlock', { name: (state.language === 'es' ? readiness.requiredUiVer.nameEs : readiness.requiredUiVer.nameEn) })) : undefined}
                          className={`py-1.5 px-3 rounded text-xs font-bold flex items-center gap-1.5 transition-all ${
                            readiness.isEligible
                              ? (contract.isMandatory || state.uiVersion === 4)
                                ? 'theme-btn-danger text-white cursor-pointer'
                                : contract.lastAttemptFailed
                                ? 'theme-btn-warn theme-on-accent cursor-pointer'
                                : 'mutating-btn-primary theme-on-accent cursor-pointer'
                              : 'theme-raised-bg mutating-text-muted cursor-not-allowed border theme-border'
                          }`}
                        >
                          {contract.lastAttemptFailed ? (
                            <RotateCcw className="w-3.5 h-3.5" />
                          ) : (
                            <Play className="w-3.5 h-3.5 fill-current" />
                          )}
                          <span>
                            {contract.lastAttemptFailed
                              ? (tr(state.language, 'contractBoard.retryMission'))
                              : (contract.isMandatory || state.uiVersion === 4)
                              ? (tr(state.language, 'contractBoard.executeSovereignDirective'))
                              : (tr(state.language, 'contractBoard.deployContract'))}
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
          <div className="flex flex-wrap items-center justify-between gap-2 p-3 rounded-lg theme-panel-bg border theme-accent-border">
            <div>
              <h3 className="text-sm font-bold mutating-accent-text">
                {tr(state.language, 'contractBoard.botSquadsFreeAgentsManager')}
              </h3>
              <p className="text-xs mutating-text-muted mt-0.5">
                {tr(state.language, 'contractBoard.organizeAgentsIntoNamedSquads')}
              </p>
            </div>
            <button
              onClick={openCreateSquadModal}
              className="px-3 py-1.5 rounded mutating-btn-primary theme-on-accent text-xs font-bold flex items-center gap-1.5 transition-all cursor-pointer"
            >
              <Plus className="w-4 h-4" />
              <span>{tr(state.language, 'contractBoard.createNewSquad')}</span>
            </button>
          </div>

          {/* Grid of Created Squads */}
          <div className="space-y-3">
            <h4 className="text-xs font-bold theme-text flex items-center gap-1.5">
              <Users className="w-3.5 h-3.5 mutating-accent-text" />
              <span>{tr(state.language, 'contractBoard.activeSquads')} ({botGroups.length})</span>
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
                      className="p-3.5 rounded-lg border theme-panel-bg theme-border space-y-2.5 relative overflow-hidden"
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
                            <h5 className="font-bold text-sm theme-text">{squad.name}</h5>
                            <span className="text-[11px] mutating-text-muted">({squadAgents.length} {tr(state.language, 'contractBoard.agents')})</span>
                          </div>

                          <div className="mt-1">
                            {isBusy ? (
                              <span className="text-[11px] font-bold theme-warn-text theme-warn-soft px-2 py-0.5 rounded border theme-warn-border animate-pulse">
                                {tr(state.language, 'contractBoard.mission')} {runningContract?.title ?? runningGig?.contractId}
                              </span>
                            ) : (
                              <span className="text-[11px] font-semibold theme-success-text theme-success-soft px-2 py-0.5 rounded border theme-success-border">
                                ✓ {tr(state.language, 'contractBoard.availableContracts')}
                              </span>
                            )}
                          </div>
                        </div>

                        <div className="flex items-center gap-1">
                          <button
                            onClick={() => openEditSquadModal(squad)}
                            className="p-1 rounded mutating-text-muted transition-colors cursor-pointer"
                            title={tr(state.language, 'contractBoard.editSquad')}
                          >
                            <Edit3 className="w-3.5 h-3.5" />
                          </button>
                          <button
                            onClick={() => deleteBotGroup(squad.id)}
                            disabled={isBusy}
                            className={`p-1 rounded transition-colors ${
                              isBusy 
                                ? 'mutating-text-muted cursor-not-allowed' 
                                : 'mutating-text-muted cursor-pointer'
                            }`}
                            title={tr(state.language, 'contractBoard.dissolveSquad')}
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      </div>

                      {/* Agents in this squad */}
                      <div className="space-y-1 pt-1 border-t theme-border">
                        {squadAgents.length > 0 ? (
                          <div className="flex flex-wrap gap-1.5">
                            {squadAgents.map(agent => {
                              const model = state.savedModels.find(m => m.id === agent.modelId);
                              return (
                                <div 
                                  key={agent.id}
                                  className="px-2 py-1 rounded theme-sub-bg border theme-border text-[11px] flex items-center gap-1.5"
                                >
                                  <span className="font-semibold theme-text">{agent.name}</span>
                                  <span className="mutating-accent-text text-[11px] uppercase font-mono">
                                    {getRoleSimpleName(agent.role, state.language)}
                                  </span>
                                  <span className="mutating-text-muted text-[11px]">
                                    ({model ? `${(model.parametersCount / 1e6).toFixed(0)}M` : '?'})
                                  </span>
                                </div>
                              );
                            })}
                          </div>
                        ) : (
                          <p className="text-[11px] mutating-text-muted italic">
                            {tr(state.language, 'contractBoard.noAgentsAssignedEditSquad')}
                          </p>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            ) : (
              <div className="p-4 rounded-lg border border-dashed theme-border text-center text-xs mutating-text-muted">
                {tr(state.language, 'contractBoard.noSquadsCreatedYetClick')}
              </div>
            )}
          </div>

          {/* Section: Unassigned Free Agents */}
          <div className="space-y-2 pt-2 border-t theme-border">
            <h4 className="text-xs font-bold theme-text flex items-center gap-1.5">
              <Bot className="w-3.5 h-3.5 theme-success-text" />
              <span>{tr(state.language, 'contractBoard.unassignedFreeAgents')} ({unassignedAgents.length})</span>
            </h4>
            <p className="text-[11px] mutating-text-muted">
              {tr(state.language, 'contractBoard.theseAgentsDoNotBelong')}
            </p>

            {unassignedAgents.length > 0 ? (
              <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-2">
                {unassignedAgents.map(agent => {
                  const model = state.savedModels.find(m => m.id === agent.modelId);
                  const isBusy = busyAgentIds.has(agent.id);

                  return (
                    <div 
                      key={agent.id}
                      className="p-2.5 rounded theme-sub-bg border theme-border flex items-center justify-between text-xs"
                    >
                      <div>
                        <div className="flex items-center gap-1.5">
                          <span className="font-bold theme-text">{agent.name}</span>
                          <span className="text-[11px] mutating-accent-text font-mono">
                            {getRoleSimpleName(agent.role, state.language)}
                          </span>
                        </div>
                        <p className="text-[11px] mutating-text-muted mt-0.5">
                          {model?.name ?? 'Modelo'} · {model ? `${(model.parametersCount / 1e6).toFixed(0)}M` : ''} · {tr(state.language, 'contractBoard.score')} {model?.reasoningScore ?? 0}
                        </p>
                      </div>

                      <span className={`text-[11px] px-1.5 py-0.5 rounded font-bold ${
                        isBusy 
                          ? 'theme-warn-soft theme-warn-text border theme-warn-border'
                          : 'theme-success-soft theme-success-text border theme-success-border'
                      }`}>
                        {isBusy ? tr(state.language, 'contractBoard.mission2') : tr(state.language, 'contractBoard.free')}
                      </span>
                    </div>
                  );
                })}
              </div>
            ) : (
              <p className="text-xs mutating-text-muted italic p-2 theme-sub-bg rounded border theme-border">
                {tr(state.language, 'contractBoard.allClusterAgentsCurrentlyAssigned')}
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
          <div className="theme-panel-bg border theme-accent-border rounded-lg max-w-lg w-full p-4 space-y-4 font-mono">
            <div className="flex items-center justify-between border-b theme-border pb-2">
              <h3 className="text-sm font-bold mutating-accent-text flex items-center gap-2">
                <Users className="w-4 h-4 mutating-accent-text" />
                <span>
                  {editingSquadId 
                    ? tr(state.language, 'contractBoard.editBotSquad')
                    : tr(state.language, 'contractBoard.createNewBotSquad')}
                </span>
              </h3>
              <button
                onClick={() => setIsSquadModalOpen(false)}
                className="mutating-text-muted cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleSaveSquad} className="space-y-3">
              <div>
                <label className="block text-xs mutating-text-muted mb-1">
                  {tr(state.language, 'contractBoard.squadName')}
                </label>
                <input
                  type="text"
                  value={squadName}
                  onChange={e => setSquadName(e.target.value)}
                  placeholder="e.g. Escuadrón Alfa, Trading Task Force..."
                  className="w-full theme-sub-bg border theme-border rounded px-2.5 py-1.5 text-xs theme-text focus:outline-none"
                  required
                />
              </div>

              <div>
                <label className="block text-xs mutating-text-muted mb-1">
                  {tr(state.language, 'contractBoard.squadAccentColor')}
                </label>
                <div className="flex items-center gap-2">
                  {SQUAD_COLORS.map(c => (
                    <button
                      key={c.hex}
                      type="button"
                      onClick={() => setSquadColor(c.hex)}
                      className={`w-7 h-7 rounded-full border-2 transition-transform cursor-pointer ${
                        squadColor === c.hex ? 'scale-110 theme-border shadow-lg' : 'border-transparent opacity-70 hover:opacity-100'
                      }`}
                      style={{ backgroundColor: c.hex }}
                      title={c.name}
                    />
                  ))}
                </div>
              </div>

              <div>
                <div className="flex items-center justify-between mb-1">
                  <label className="text-xs mutating-text-muted">
                    {tr(state.language, 'contractBoard.selectAgentMembers')}
                  </label>
                  <span className="text-[11px] mutating-text-muted">
                    {squadMemberIds.length} {tr(state.language, 'contractBoard.selected')}
                  </span>
                </div>

                <div className="p-2 theme-sub-bg border theme-border rounded max-h-48 overflow-y-auto space-y-1">
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
                              ? 'theme-accent-border theme-accent-soft mutating-accent-text'
                              : 'theme-border theme-sub-bg mutating-text-muted'
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
                            />
                            <span className="font-bold theme-text">{agent.name}</span>
                            <span className="text-[11px] mutating-accent-text">
                              {getRoleSimpleName(agent.role, state.language)}
                            </span>
                          </div>

                          <div className="text-[11px] text-right">
                            {currentSquad ? (
                              <span className="theme-warn-text">
                                ↺ {tr(state.language, 'contractBoard.willMoveFrom', { name: currentSquad.name })}
                              </span>
                            ) : (
                              <span className="mutating-text-muted">
                                {model?.name ?? 'Modelo'} ({(model?.parametersCount ?? 0) / 1e6}M)
                              </span>
                            )}
                          </div>
                        </label>
                      );
                    })
                  ) : (
                    <p className="text-xs mutating-text-muted italic p-1 text-center">
                      {tr(state.language, 'contractBoard.noAgentsCreatedClusterYet')}
                    </p>
                  )}
                </div>
              </div>

              <div className="flex items-center justify-end gap-2 pt-2 border-t theme-border">
                <button
                  type="button"
                  onClick={() => setIsSquadModalOpen(false)}
                  className="px-3 py-1.5 rounded theme-raised-bg theme-text text-xs font-semibold cursor-pointer"
                >
                  {tr(state.language, 'contractBoard.cancel')}
                </button>
                <button
                  type="submit"
                  disabled={!squadName.trim()}
                  className="px-4 py-1.5 rounded mutating-btn-primary theme-on-accent text-xs font-bold cursor-pointer disabled:opacity-50"
                >
                  {tr(state.language, 'contractBoard.saveSquad')}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
