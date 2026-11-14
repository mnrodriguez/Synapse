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
import { getRoleSimpleName } from '../utils/constants';
import { computeLedger, missionComputePflops, missionPowerKw as missionPowerFor, trainingSlowdown } from '../utils/computeLedger';
import { COMPUTE } from '../utils/rules';
import { generateDynamicContracts } from '../services/aiService';
import { evaluateMissionTeam, isContractEligibleForTeam, modelRequirementCheck, proposeTeam } from '../utils/missionEvaluation';
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
  if (tier === 'tier2_corporate') return { name: 'Synapse Studio Pro (v2.0)', ver: 2 };
  if (tier === 'tier3_blackops') return { name: 'Blackbox OS (v3.0)', ver: 3 };
  if (tier === 'tier4_singularity') return { name: 'Sovereign Core (v4.0)', ver: 4 };
  return { name: 'Synapse Home Lab (v1.0)', ver: 1 };
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
    dismissMissionOutcome,
    cancelMission
  } = useGame();
  // Story texts of the active UI version (early versions must not name the end goal).
  const story = VERSION_PROFILES[state.language === 'es' ? 'es' : 'en'][(state.uiVersion || 1) as 1 | 2 | 3 | 4].story;

  // Top level views for expansive, uncluttered organization
  const [activeBoardView, setActiveBoardView] = useState<'contracts' | 'squads'>('contracts');
  const [missionView, setMissionView] = useState<'all' | 'completed'>('all');
  // Only the tier of the current UI version is offered on the board.
  const versionTier = tierForUiVersion(state.uiVersion || 1);
  const [isGeneratingMissions, setIsGeneratingMissions] = useState(false);
  // Run waiting for a second click on its cancel button.
  const [confirmCancelRunId, setConfirmCancelRunId] = useState<string | null>(null);

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

  // One compute budget for the whole cluster (utils/computeLedger.ts): agents and running contracts take
  // their share, training gets the rest and gives way to a new contract.
  const ledger = computeLedger(state, activeGigsList);
  const runningCompute = ledger.missions;
  const freeAgents = state.agents.filter(agent => agent.status === 'active' && !busyAgentIds.has(agent.id));

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
    setSquadName(tr(state.language, 'contractBoard.defaultSquadName', { n: botGroups.length + 1 }));
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

  // The only label a mission carries is the mandatory directive of the last version; tiers are not shown.
  const getMissionBadge = (contract?: ContractGig) => {
    if (!(contract?.isMandatory || (state.uiVersion === 4 && contract?.tier === 'tier4_singularity'))) return null;
    return (
      <span className="px-2 py-0.5 rounded text-[11px] theme-danger-soft theme-danger-text border theme-danger-border font-bold animate-pulse">
        {tr(state.language, 'contractBoard.mandatoryDirective')}
      </span>
    );
  };

  // Helper to resolve currently selected agents for a specific contract
  const getAssignedAgentsForContract = (contractId: string) => {
    const assignment = contractAssignments[contractId];

    const runningGig = activeGigsList.find(g => g.contractId === contractId);
    if (runningGig) {
      // While a contract runs, its card shows the team that is on it.
      const team = state.agents.filter(agent => runningGig.agentIds?.includes(agent.id));
      const squad = runningGig.squadId ? botGroups.find(g => g.id === runningGig.squadId) : undefined;
      return squad
        ? { mode: 'group' as const, squadId: squad.id, squad, agents: team }
        : { mode: 'unassigned' as const, unassignedAgentIds: team.map(agent => agent.id), agents: team };
    }

    if (!assignment) {
      // Default: the smallest free team that can run this contract, so several contracts can be launched
      // one after another without picking agents by hand. Agents outside squads first, then a free squad.
      const contract = state.contracts.find(c => c.id === contractId);
      const freeUnassigned = unassignedAgents.filter(a => freeAgents.includes(a));
      const proposal = contract ? proposeTeam(contract, freeUnassigned, state.savedModels, state.dataSources) : null;
      if (proposal) {
        return { mode: 'unassigned' as const, unassignedAgentIds: proposal.map(a => a.id), agents: proposal };
      }
      const freeSquads = botGroups.filter(g => g.agentIds.length > 0 && g.agentIds.every(id => freeAgents.some(a => a.id === id)));
      const squad = (contract && freeSquads.find(g => isContractEligibleForTeam(contract, state.agents.filter(a => g.agentIds.includes(a.id)), state.savedModels, state.dataSources)))
        ?? (freeUnassigned.length === 0 ? freeSquads[0] ?? botGroups[0] : undefined);
      if (squad) {
        return {
          mode: 'group' as const,
          squadId: squad.id,
          squad,
          agents: state.agents.filter(a => squad.agentIds.includes(a.id))
        };
      }
      // Nobody qualifies: show the free agents so the checklist says what is missing.
      return {
        mode: 'unassigned' as const,
        unassignedAgentIds: freeUnassigned.map(a => a.id),
        agents: freeUnassigned
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

    const hasPowerBreaker = state.powerTripSeconds > 0;
    const hasDetention = state.detentionSeconds > 0;

    // Agent availability check
    // A running contract is checked against the team that is on it.
    const activeAgents = isRunning ? agents : agents.filter(a => a.status === 'active' && !busyAgentIds.has(a.id));
    const isTeamBusy = !isRunning && agents.length > 0 && activeAgents.length !== agents.length;
    const hasMinAgents = activeAgents.length >= (contract.minimumAgents ?? 1);

    // Compute the team would use: each agent runs its own model. Without a team, the estimate is one
    // agent with the smallest model the contract accepts.
    const teamModels = activeAgents
      .map(a => state.savedModels.find(m => m.id === a.modelId))
      .filter((m): m is NonNullable<typeof m> => m !== undefined);
    const computeRequired = missionComputePflops(teamModels.length > 0 ? teamModels : [{ parametersCount: contract.requiredParams }]);
    const missionPowerKw = missionPowerFor(computeRequired);
    const hasClusterCompute = ledger.free >= computeRequired;
    // activePowerKw already counts the contracts that are running.
    const hasClusterPower = state.activePowerKw + missionPowerKw <= state.maxPowerKw;
    const slowdown = trainingSlowdown(ledger, computeRequired);

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

    // The one thing to fix first, in words, when the contract cannot be launched.
    const blockReason: string | null = isRunning || !isTierUnlocked ? null
      : hasPowerBreaker ? tr(state.language, 'contractBoard.block.breaker')
      : hasDetention ? tr(state.language, 'contractBoard.block.detained')
      : state.agents.length === 0 ? tr(state.language, 'contractBoard.block.noAgents')
      : isTeamBusy || (agents.length === 0 && freeAgents.length === 0) ? tr(state.language, 'contractBoard.block.teamBusy')
      : !hasMinAgents ? tr(state.language, 'contractBoard.block.minAgents', { count: contract.minimumAgents ?? 1 })
      : !hasRoles ? tr(state.language, 'contractBoard.block.roles', { roles: missingRoles.map(r => getRoleSimpleName(r, state.language)).join(', ') })
      : !(hasRequiredParams && hasRequiredReasoning && hasRequiredTopology) ? tr(state.language, 'contractBoard.block.model')
      : !hasRequiredData ? tr(state.language, 'contractBoard.block.data')
      : !hasClusterCompute ? tr(state.language, 'contractBoard.block.compute', { need: formatCompute(computeRequired), free: formatCompute(ledger.free) })
      : !hasClusterPower ? tr(state.language, 'contractBoard.block.power', { kw: missionPowerKw.toFixed(2) })
      : null;

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
      slowdown,
      blockReason,
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
                <span>{tr(state.language, 'contractBoard.computeInUse', { used: formatCompute(runningCompute), free: formatCompute(ledger.free) })}</span>
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
                        {getMissionBadge(contract)}
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

                  {/* Compute this run uses, and the cancel button (second click confirms) */}
                  {(() => {
                    const runId = gig.runId ?? gig.contractId;
                    const confirming = confirmCancelRunId === runId;
                    const cancelCost = ((contract?.suspicionRisk ?? 0) * COMPUTE.cancelRiskShare * Math.min(1, (gig.progressPercent ?? 0) / 100)).toFixed(1);
                    return (
                      <div className="flex items-center justify-between gap-2 text-[11px]">
                        <span className="mutating-text-muted flex items-center gap-1">
                          <Cpu className="w-3 h-3" />
                          {tr(state.language, 'contractBoard.runUses', { compute: formatCompute(gig.computePflopsRequired || 0) })}
                        </span>
                        <span className="flex items-center gap-1.5">
                          {confirming && (
                            <button
                              type="button"
                              onClick={() => setConfirmCancelRunId(null)}
                              className="px-2 py-0.5 rounded border theme-border mutating-text-muted cursor-pointer"
                            >
                              {tr(state.language, 'contractBoard.keepRunning')}
                            </button>
                          )}
                          <button
                            type="button"
                            onClick={() => {
                              if (confirming) { cancelMission(runId); setConfirmCancelRunId(null); }
                              else { sound.playKeyClick(); setConfirmCancelRunId(runId); }
                            }}
                            className={`px-2 py-0.5 rounded border font-bold cursor-pointer ${confirming ? 'theme-btn-danger text-white' : 'theme-danger-border theme-danger-text'}`}
                          >
                            {confirming
                              ? tr(state.language, 'contractBoard.confirmCancel', { suspicion: cancelCost })
                              : tr(state.language, 'contractBoard.cancelContract')}
                          </button>
                        </span>
                      </div>
                    );
                  })()}
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

          {/* Available / done. Mission tiers follow the UI version, so the player never picks one. */}
          <div className="flex flex-wrap items-center justify-between gap-2 border-b border-current/10 pb-2">
            <div className="flex flex-wrap items-center gap-1.5 text-[11px]">
              <button
                onClick={() => setMissionView('all')}
                className={`px-2.5 py-1 rounded-md text-[11px] transition-all cursor-pointer ${
                  missionView === 'all'
                    ? 'mutating-btn-primary font-bold shadow-sm'
                    : 'mutating-sub mutating-text-muted hover:opacity-100'
                }`}
              >
                {tr(state.language, 'contractBoard.all')} ({state.contracts.filter(c => !c.completed && c.tier === versionTier).length})
              </button>
              <button
                onClick={() => setMissionView('completed')}
                className={`px-2.5 py-1 rounded-md text-[11px] transition-all cursor-pointer ${
                  missionView === 'completed'
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
                if (missionView === 'completed') return contract.completed && contract.tier === versionTier;
                if (contract.completed) return false;
                // Only the missions of the current UI version's tier are offered.
                if (contract.tier !== tierForUiVersion(state.uiVersion || 1)) return false;
                return true;
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
                            {getMissionBadge(contract)}
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
                                          {isBusy && <span className="theme-warn-text text-[11px]">[{tr(state.language, 'contractBoard.busy')}]</span>}
                                        </label>
                                      );
                                    })}
                                  </div>
                                </div>
                              ) : (
                                <p className="text-[11px] mutating-text-muted py-1">
                                  {tr(state.language, state.agents.length === 0 ? 'contractBoard.block.noAgents' : 'contractBoard.noUnassignedAgentsAllAgents')}
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
                          <span className={readiness.hasClusterCompute ? 'mutating-accent-text' : 'theme-danger-text font-bold'}>
                            {tr(state.language, 'contractBoard.needsOfFree', { need: formatCompute(readiness.computeRequired), free: formatCompute(ledger.free) })} {readiness.hasClusterCompute ? '✓' : '✗'}
                          </span>
                        </div>
                        {state.activeTraining && readiness.hasClusterCompute && readiness.slowdown > 0.005 && (
                          <div className="theme-warn-text text-[11px]">
                            {tr(state.language, 'contractBoard.trainingWillSlow', { percent: Math.round(readiness.slowdown * 100) })}
                          </div>
                        )}

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
                            {tr(state.language, 'contractBoard.storyMilestoneLocked', { name: readiness.requiredUiVer.name })}
                          </span>
                        </div>
                      )}

                      {!contract.completed && readiness.blockReason && (
                        <div className="mt-2 text-[11px] theme-warn-text flex items-start gap-1.5">
                          <AlertTriangle className="w-3.5 h-3.5 shrink-0 mt-0.5" />
                          <span>{readiness.blockReason}</span>
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
                          title={!readiness.isTierUnlocked ? (tr(state.language, 'contractBoard.mountHostModelReachesUnlock', { name: readiness.requiredUiVer.name })) : undefined}
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
                          {model?.name ?? tr(state.language, 'contractBoard.modelFallback')} · {model ? `${(model.parametersCount / 1e6).toFixed(0)}M` : ''} · {tr(state.language, 'contractBoard.score')} {model?.reasoningScore ?? 0}
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
                  placeholder={tr(state.language, 'contractBoard.squadNamePlaceholder')}
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
                                {model?.name ?? tr(state.language, 'contractBoard.modelFallback')} ({(model?.parametersCount ?? 0) / 1e6}M)
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
