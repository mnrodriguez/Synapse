/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState } from 'react';
import { useGame } from '../context/GameContext';
import { AgentRole, ContractGig } from '../types/game';
import { 
  Briefcase, 
  CheckCircle2, 
  Clock, 
  AlertTriangle, 
  ShieldAlert, 
  Coins, 
  Layers, 
  BrainCircuit, 
  Play,
  Check,
  Sparkles,
  ExternalLink,
  BookOpen,
  Filter,
  RefreshCw,
  X,
  RotateCcw,
  Bot
} from 'lucide-react';
import { sound } from '../audio/soundManager';
import { localize, t } from '../utils/i18n';
import { localizedContract } from '../utils/gameContentI18n';
import { AGENT_COMPUTE_DEMAND_PFLOPS, getRoleSimpleName } from '../utils/constants';
import { generateDynamicContracts } from '../services/aiService';
import { evaluateMissionTeam, isContractEligibleForTeam } from '../utils/missionEvaluation';

export const ContractBoard: React.FC = () => {
  const { state, acceptContract, addLog, addContracts, dismissMissionOutcome } = useGame();
  const [selectedAgentIds, setSelectedAgentIds] = useState<string[]>([]);
  const [activeTierFilter, setActiveTierFilter] = useState<'all' | ContractGig['tier'] | 'completed'>('all');
  const [isGeneratingMissions, setIsGeneratingMissions] = useState(false);
  const availableAgents = state.agents.filter(agent => agent.status === 'active');

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

  const getTierBadge = (tier: string) => {
    switch (tier) {
      case 'tier1_micro':
        return <span className="px-2 py-0.5 rounded bg-zinc-800 text-zinc-300 text-[10px] border border-zinc-700">{t(state.language, 'micro_script')}</span>;
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

  const isEligible = (contract: ContractGig) => {
    if (state.powerTripSeconds > 0 || state.detentionSeconds > 0) return false;
    if (selectedAgentIds.length === 0) return false;
    const assignedAgents = availableAgents.filter(agent => selectedAgentIds.includes(agent.id));
    if (
      assignedAgents.length !== selectedAgentIds.length ||
      !isContractEligibleForTeam(contract, assignedAgents, state.savedModels, state.dataSources)
    ) return false;
    const computeRequired = Math.max(0.001, contract.requiredParams / 1_000_000_000 * 0.002);
    const missionPowerKw = Math.max(0.05, computeRequired * 20);
    const activeAgentDemand = state.agents.filter(agent => agent.status !== 'quarantined').length * AGENT_COMPUTE_DEMAND_PFLOPS;
    const trainingReservation = state.activeTraining ? state.totalComputePflops * 0.5 : 0;
    if (state.totalComputePflops - activeAgentDemand - trainingReservation < computeRequired) return false;
    if (state.activePowerKw + missionPowerKw > state.maxPowerKw) return false;
    return true;
  };

  const handleAcceptMission = (contractId: string) => {
    acceptContract(contractId, selectedAgentIds);
  };

  return (
    <div className="flex flex-col h-full bg-[#070b12] border border-cyan-900/40 rounded-lg p-3 overflow-y-auto space-y-4 font-mono scrollbar-thin scrollbar-thumb-cyan-950">
      {/* Header */}
      <div className="flex flex-wrap items-center justify-between gap-2 border-b border-cyan-900/40 pb-2">
        <div className="flex items-center gap-2">
          <Briefcase className="w-4 h-4 text-cyan-400" />
          <h2 className="text-sm font-bold text-cyan-300 tracking-wider">
            {t(state.language, 'contract_board_title')}
          </h2>
        </div>

        {/* Active Gig Bar */}
        {state.activeGig && (
          <div className="flex items-center gap-2 px-3 py-1 rounded bg-amber-950/60 border border-amber-500/50 text-amber-300 text-xs animate-pulse">
            <Clock className="w-3.5 h-3.5" />
            <span>
              {t(state.language, 'mission_running')} · {state.activeGig.timeRemaining}s · {state.activeGig.progressPercent ?? 0}% ·
              {' '}{Math.round((state.activeGig.successProbability ?? 0) * 100)}% {t(state.language, 'probability')} ·
              {' '}{t(state.language, 'mission_team_label')}: {state.agents.filter(agent => state.activeGig?.agentIds?.includes(agent.id)).map(agent => agent.name).join(', ')}
            </span>
          </div>
        )}
      </div>

      {/* Recent Mission Outcome Notification Banner */}
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
                {state.lastMissionOutcome.isAutonomous && (
                  <span className="flex items-center gap-1 text-[10px] text-zinc-400 bg-zinc-900/80 px-1.5 py-0.5 rounded border border-zinc-700">
                    <Bot className="w-3 h-3 text-cyan-400" />
                    <span>{state.language === 'es' ? 'ENJAMBRE AUTÓNOMO' : 'AUTONOMOUS RUN'}</span>
                  </span>
                )}
                <span className="text-[10px] text-zinc-500">{state.lastMissionOutcome.timestamp}</span>
              </div>

              <div className="font-semibold text-zinc-100 mt-1">
                {state.lastMissionOutcome.contractTitle}
              </div>

              {state.lastMissionOutcome.success ? (
                <div className="mt-1 text-[11px] text-zinc-300 space-y-1">
                  <p>
                    {state.language === 'es'
                      ? `Recompensa acreditada: +$${state.lastMissionOutcome.rewardCredits.toLocaleString()} CR. Sospecha generada: +${state.lastMissionOutcome.suspicionAdded}%.`
                      : `Reward credited: +$${state.lastMissionOutcome.rewardCredits.toLocaleString()} CR. Watchdog suspicion: +${state.lastMissionOutcome.suspicionAdded}%.`}
                    {state.lastMissionOutcome.isAutonomous && (
                      <span className="text-zinc-400 ml-1">
                        {state.language === 'es' ? '(Tasa de delegación de cómputo del 40% descontada)' : '(40% compute delegation fee deducted)'}
                      </span>
                    )}
                  </p>
                  <p className="text-[10px] text-cyan-300/90 flex items-center gap-1">
                    <Sparkles className="w-3 h-3 text-cyan-400" />
                    <span>
                      {state.language === 'es'
                        ? 'Síntesis automática: Se generó un nuevo contrato del mismo nivel en el tablón para que tus bots sigan operando sin pausa.'
                        : 'Auto-synthesis active: A replacement mission of the same tier was automatically generated to keep bots continuously employed.'}
                    </span>
                  </p>
                </div>
              ) : (
                <div className="mt-1 text-[11px] text-zinc-300 space-y-1">
                  <p>
                    {state.language === 'es'
                      ? `La inferencia no superó la prueba de verificación. Tirada: ${Math.round(state.lastMissionOutcome.roll * 100)}% (Requería ≤ ${Math.round(state.lastMissionOutcome.successProbability * 100)}%). Sospecha de los reguladores: +${state.lastMissionOutcome.suspicionAdded}%.`
                      : `Neural inference verification failed. Roll: ${Math.round(state.lastMissionOutcome.roll * 100)}% (Required threshold ≤ ${Math.round(state.lastMissionOutcome.successProbability * 100)}%). Watchdog suspicion: +${state.lastMissionOutcome.suspicionAdded}%.`}
                  </p>
                  <div className="inline-flex items-center gap-1.5 text-[11px] text-amber-300 bg-amber-950/60 px-2 py-0.5 rounded border border-amber-600/50 mt-1">
                    <RotateCcw className="w-3 h-3 text-amber-400" />
                    <span>
                      {state.language === 'es'
                        ? 'El contrato NO se ha consumido. Sigue disponible abajo listo para reintentar.'
                        : 'Contract was NOT consumed. It remains unspent and ready to reattempt below.'}
                    </span>
                  </div>
                </div>
              )}
            </div>
          </div>

          <button
            onClick={dismissMissionOutcome}
            className="text-zinc-400 hover:text-zinc-200 p-1 rounded hover:bg-zinc-800/60 cursor-pointer transition-colors"
            title={state.language === 'es' ? 'Cerrar aviso' : 'Dismiss notice'}
          >
            <X className="w-4 h-4" />
          </button>
        </div>
      )}

      <p className="text-xs text-zinc-400 leading-relaxed">
        {t(state.language, 'contract_board_desc')}
      </p>

      <section className="rounded border border-cyan-900/50 bg-[#09111c] p-2.5">
        <h3 className="mb-1 text-[11px] font-bold tracking-wider text-cyan-300">{t(state.language, 'team_assignment')}</h3>
        <p className="mb-2 text-[10px] text-zinc-500">{t(state.language, 'team_assignment_desc')}</p>
        {availableAgents.length > 0 ? (
          <div className="flex flex-wrap gap-2">
            {availableAgents.map(agent => {
              const model = state.savedModels.find(candidate => candidate.id === agent.modelId);
              const selected = selectedAgentIds.includes(agent.id);
              return (
                <label key={agent.id} className={`flex cursor-pointer items-center gap-1.5 rounded border px-2 py-1 text-[10px] ${selected ? 'border-cyan-500 bg-cyan-950/50 text-cyan-200' : 'border-zinc-800 bg-zinc-950 text-zinc-400'}`}>
                  <input
                    type="checkbox"
                    checked={selected}
                    disabled={!!state.activeGig}
                    onChange={event => setSelectedAgentIds(previous =>
                      event.target.checked
                        ? [...previous, agent.id]
                        : previous.filter(id => id !== agent.id)
                    )}
                    className="accent-cyan-500"
                  />
                  <span>{agent.name} · {model?.name ?? (state.language === 'es' ? 'MODELO NO DISPONIBLE' : 'MODEL UNAVAILABLE')}</span>
                </label>
              );
            })}
          </div>
        ) : (
          <p className="text-[10px] text-amber-300">{t(state.language, 'no_active_agents')}</p>
        )}
      </section>

      {/* Tier Filter Tabs & AI Generator Button */}
      <div className="flex flex-wrap items-center justify-between gap-2 border-b border-zinc-800/80 pb-2">
        <div className="flex flex-wrap items-center gap-1 text-[11px]">
          <span className="text-[10px] text-zinc-500 uppercase tracking-widest mr-1 flex items-center gap-1">
            <Filter className="w-3 h-3 text-cyan-500" />
            {state.language === 'es' ? 'Filtro:' : 'Tier:'}
          </span>
          <button
            onClick={() => setActiveTierFilter('all')}
            className={`px-2 py-0.5 rounded text-[10px] transition-all cursor-pointer ${
              activeTierFilter === 'all'
                ? 'bg-cyan-500 text-zinc-950 font-bold shadow-[0_0_8px_rgba(0,255,200,0.4)]'
                : 'bg-zinc-900 text-zinc-400 hover:text-zinc-200 border border-zinc-800'
            }`}
          >
            {state.language === 'es' ? 'TODOS' : 'ALL'} ({state.contracts.filter(c => !c.completed).length})
          </button>
          <button
            onClick={() => setActiveTierFilter('tier1_micro')}
            className={`px-2 py-0.5 rounded text-[10px] transition-all cursor-pointer ${
              activeTierFilter === 'tier1_micro'
                ? 'bg-zinc-300 text-zinc-950 font-bold'
                : 'bg-zinc-900 text-zinc-400 hover:text-zinc-200 border border-zinc-800'
            }`}
          >
            T1: {state.language === 'es' ? 'RETAIL' : 'MICRO'} ({state.contracts.filter(c => !c.completed && c.tier === 'tier1_micro').length})
          </button>
          <button
            onClick={() => setActiveTierFilter('tier2_corporate')}
            className={`px-2 py-0.5 rounded text-[10px] transition-all cursor-pointer ${
              activeTierFilter === 'tier2_corporate'
                ? 'bg-blue-500 text-zinc-950 font-bold'
                : 'bg-zinc-900 text-blue-400/80 hover:text-blue-300 border border-zinc-800'
            }`}
          >
            T2: {state.language === 'es' ? 'CORPORATIVO' : 'CORP'} ({state.contracts.filter(c => !c.completed && c.tier === 'tier2_corporate').length})
          </button>
          <button
            onClick={() => setActiveTierFilter('tier3_blackops')}
            className={`px-2 py-0.5 rounded text-[10px] transition-all cursor-pointer ${
              activeTierFilter === 'tier3_blackops'
                ? 'bg-red-500 text-zinc-950 font-bold'
                : 'bg-zinc-900 text-red-400/80 hover:text-red-300 border border-zinc-800'
            }`}
          >
            T3: BLACK-OPS ({state.contracts.filter(c => !c.completed && c.tier === 'tier3_blackops').length})
          </button>
          <button
            onClick={() => setActiveTierFilter('tier4_singularity')}
            className={`px-2 py-0.5 rounded text-[10px] transition-all cursor-pointer ${
              activeTierFilter === 'tier4_singularity'
                ? 'bg-purple-500 text-zinc-950 font-bold animate-pulse'
                : 'bg-zinc-900 text-purple-400/80 hover:text-purple-300 border border-zinc-800'
            }`}
          >
            T4: {state.language === 'es' ? 'SINGULARIDAD' : 'SINGULARITY'} ({state.contracts.filter(c => !c.completed && c.tier === 'tier4_singularity').length})
          </button>
          <button
            onClick={() => setActiveTierFilter('completed')}
            className={`px-2 py-0.5 rounded text-[10px] transition-all cursor-pointer ${
              activeTierFilter === 'completed'
                ? 'bg-emerald-500 text-zinc-950 font-bold'
                : 'bg-zinc-900 text-emerald-400/80 hover:text-emerald-300 border border-zinc-800'
            }`}
          >
            ✓ {state.language === 'es' ? 'COMPLETADAS' : 'DONE'} ({state.contracts.filter(c => c.completed).length})
          </button>
        </div>
      </div>

      {/* Auto-Synthesis Active Indicator */}
      <div className="flex flex-wrap items-center justify-between gap-2 text-[10px] text-zinc-400 px-3 py-1.5 rounded bg-[#050910] border border-cyan-900/30">
        <div className="flex items-center gap-2">
          <span className="relative flex h-2 w-2">
            <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
            <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500"></span>
          </span>
          <span className="text-emerald-300 font-bold uppercase tracking-wider">
            {state.language === 'es' ? 'SÍNTESIS CONTINUA ACTIVA:' : 'AUTO-SYNTHESIS CONTINUOUS:'}
          </span>
          <span>
            {state.language === 'es'
              ? 'Completar cualquier misión genera automáticamente otra del mismo nivel para que los bots nunca se queden sin trabajo.'
              : 'Every completed mission automatically replenishes one of the same tier so agents always have continuous tasks.'}
          </span>
        </div>
        <span className="text-zinc-500 font-mono">
          {state.language === 'es' ? 'Bots autónomos: -40% tasa cómputo (60% pago neto)' : 'Autonomous bots: -40% delegation fee (60% net)'}
        </span>
      </div>

      {/* Contract Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
        {state.contracts
          .filter(contract => {
            if (activeTierFilter === 'completed') return contract.completed;
            if (contract.completed) return false;
            if (activeTierFilter === 'all') return true;
            return contract.tier === activeTierFilter;
          })
          .map(contract => {
          const eligible = isEligible(contract);
          const isCurrentActive = state.activeGig?.contractId === contract.id;
          const displayContract = localizedContract(state.language, contract);
          const assignedModels = state.agents
            .filter(agent => selectedAgentIds.includes(agent.id))
            .map(agent => state.savedModels.find(model => model.id === agent.modelId))
            .filter(model => model !== undefined);
          const selectedAgents = availableAgents.filter(agent => selectedAgentIds.includes(agent.id));
          const teamAssessment = eligible
            ? evaluateMissionTeam(
              contract,
              selectedAgents,
              state.savedModels,
              state.dataSources,
              state.guardrails
            )
            : null;
          const hasRequiredParams = assignedModels.some(model => model.parametersCount >= contract.requiredParams);
          const hasRequiredReasoning = assignedModels.some(model => model.reasoningScore >= contract.requiredMinReasoning);
          const hasRequiredTopology = !contract.requiredTopology ||
            assignedModels.some(model => model.topology === contract.requiredTopology);

          return (
            <div
              key={contract.id}
              className={`p-3 rounded-lg border transition-all flex flex-col justify-between ${
                contract.completed
                  ? 'bg-zinc-950/60 border-zinc-800 opacity-60'
                  : isCurrentActive
                  ? 'bg-amber-950/30 border-amber-500/60 shadow-[0_0_15px_rgba(245,158,11,0.15)]'
                  : eligible
                  ? 'bg-[#09111c] border-cyan-800/60 shadow-[0_0_12px_rgba(0,255,200,0.05)]'
                  : 'bg-zinc-950/80 border-zinc-900'
              }`}
            >
              <div>
                {/* Contract Header */}
                <div className="flex items-start justify-between gap-2">
                  <div>
                    <div className="flex items-center gap-2 flex-wrap">
                      {getTierBadge(contract.tier)}
                      <span className="text-[10px] text-zinc-500 font-mono">{t(state.language, 'client')}: {contract.client}</span>
                      {contract.lastAttemptFailed && (
                        <span className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded text-[9px] font-bold text-amber-300 bg-amber-950/80 border border-amber-500/60 animate-pulse">
                          <AlertTriangle className="w-2.5 h-2.5 text-amber-400" />
                          <span>{state.language === 'es' ? 'FALLÓ · LISTO PARA REINTENTO' : 'FAILED · READY TO RETRY'}</span>
                        </span>
                      )}
                      {contract.fromAgentSwarm && (
                        <span className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded text-[9px] font-mono text-cyan-300 bg-cyan-950/80 border border-cyan-500/60 shadow-[0_0_8px_rgba(0,255,200,0.2)]">
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
                      {contract.durationSeconds}s {t(state.language, 'mission_duration')}
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

                {/* Requirements Checklist */}
                <div className="mt-2.5 space-y-1 text-[11px] pt-2 border-t border-zinc-800/80">
                  <div className="flex items-center justify-between">
                    <span className="text-zinc-500 text-[10px]">{t(state.language, 'minimum_parameters')}:</span>
                    <span className={hasRequiredParams ? 'text-emerald-400 font-bold' : 'text-red-400'}>
                      {(contract.requiredParams / 1_000_000).toFixed(0)} {t(state.language, 'minimum_params_units')} {hasRequiredParams ? '✓' : '✗'}
                    </span>
                  </div>

                  {(contract.minimumAgents ?? 1) > 1 && (
                    <div className="flex items-center justify-between">
                      <span className="text-zinc-500 text-[10px]">
                        {state.language === 'es' ? 'Equipo mínimo:' : 'Minimum team:'}
                      </span>
                      <span className={selectedAgents.length >= (contract.minimumAgents ?? 1) ? 'text-emerald-400 font-bold' : 'text-amber-300'}>
                        {contract.minimumAgents} {state.language === 'es' ? 'agentes' : 'agents'}
                        {selectedAgents.length > 0 ? ` · ${selectedAgents.length} ${state.language === 'es' ? 'seleccionados' : 'selected'}` : ''}
                      </span>
                    </div>
                  )}

                  {(contract.requiredAgentRoles ?? []).length > 0 && (
                    <div className="flex items-start justify-between gap-2">
                      <span className="text-zinc-500 text-[10px] shrink-0">
                        {state.language === 'es' ? 'Especialidades:' : 'Required roles:'}
                      </span>
                      <span className="text-right text-[10px]">
                        {(contract.requiredAgentRoles ?? []).map(role => {
                          const isAssigned = selectedAgents.some(agent => agent.role === role);
                          return (
                            <span key={role} className={`ml-1 ${isAssigned ? 'text-emerald-400' : 'text-amber-300'}`}>
                              {getRoleSimpleName(role, state.language)}{isAssigned ? ' ✓' : ' ·'}
                            </span>
                          );
                        })}
                      </span>
                    </div>
                  )}

                  <div className="flex items-center justify-between">
                    <span className="text-zinc-500 text-[10px]">{t(state.language, 'minimum_reasoning')}:</span>
                    <span className={hasRequiredReasoning ? 'text-emerald-400 font-bold' : 'text-red-400'}>
                      IQ {contract.requiredMinReasoning} {hasRequiredReasoning ? '✓' : '✗'}
                    </span>
                  </div>

                  {contract.requiredTopology && (
                    <div className="flex items-center justify-between">
                      <span className="text-zinc-500 text-[10px]">{t(state.language, 'required_topology')}:</span>
                      <span className={hasRequiredTopology ? 'text-emerald-400 font-bold' : 'text-red-400'}>
                        {contract.requiredTopology} {hasRequiredTopology ? '✓' : '✗'}
                      </span>
                    </div>
                  )}

                  {contract.requiredDataTypes && contract.requiredDataTypes.length > 0 && (
                    <div className="flex items-center justify-between">
                      <span className="text-zinc-500 text-[10px]">{t(state.language, 'required_pipelines')}:</span>
                      <span className="text-cyan-300 text-[10px] truncate max-w-[150px]">
                        {contract.requiredDataTypes.join(', ')}
                      </span>
                    </div>
                  )}

                  <div className="flex items-center justify-between">
                    <span className="text-zinc-500 text-[10px]">{t(state.language, 'suspicion_risk')}:</span>
                    <span className={contract.suspicionRisk > 40 ? 'text-red-400' : 'text-zinc-400'}>
                      +{contract.suspicionRisk}% {t(state.language, 'watchdog')}
                    </span>
                  </div>
                </div>

                {teamAssessment && (
                  <div className="mt-2 rounded border border-purple-800/60 bg-[#0c0916] p-2 text-[10px] text-purple-200 space-y-1">
                    <div className="font-bold tracking-wide flex items-center justify-between">
                      <span className="flex items-center gap-1.5 text-purple-300">
                        <BrainCircuit className="w-3.5 h-3.5 text-purple-400" />
                        {state.language === 'es' ? 'EVALUACIÓN IA DEL EQUIPO' : 'AI TEAM ASSESSMENT'}
                      </span>
                      <span className={`px-1.5 py-0.5 rounded text-[9px] font-bold ${
                        teamAssessment.successProbability >= 0.85 ? 'bg-emerald-950 text-emerald-300 border border-emerald-500/50' :
                        teamAssessment.successProbability >= 0.60 ? 'bg-amber-950 text-amber-300 border border-amber-500/50' :
                        'bg-red-950 text-red-300 border border-red-500/50 animate-pulse'
                      }`}>
                        {Math.round(teamAssessment.successProbability * 100)}% {state.language === 'es' ? 'ÉXITO' : 'SUCCESS'}
                      </span>
                    </div>

                    <div className="grid grid-cols-2 gap-2 text-zinc-300 pt-1 border-t border-purple-900/40 text-[10px]">
                      <div>
                        <span className="text-zinc-500">{state.language === 'es' ? 'Eficiencia:' : 'Efficiency:'} </span>
                        <span className="font-bold text-cyan-300">{teamAssessment.efficiencyPercent}%</span>
                      </div>
                      <div>
                        <span className="text-zinc-500">{state.language === 'es' ? 'Tiempo est.:' : 'Est. Duration:'} </span>
                        <span className="font-bold text-zinc-200">{teamAssessment.estimatedDurationSeconds}s</span>
                      </div>
                    </div>

                    {teamAssessment.synergyBonuses && teamAssessment.synergyBonuses.length > 0 && (
                      <div className="space-y-0.5 text-[9px] text-emerald-300 pt-1">
                        {teamAssessment.synergyBonuses.map((bonus, idx) => (
                          <div key={idx} className="flex items-start gap-1">
                            <span className="text-emerald-400">✓</span>
                            <span>{bonus}</span>
                          </div>
                        ))}
                      </div>
                    )}

                    {teamAssessment.riskFactors && teamAssessment.riskFactors.length > 0 && (
                      <div className="space-y-0.5 text-[9px] text-amber-300 pt-1">
                        {teamAssessment.riskFactors.map((risk, idx) => (
                          <div key={idx} className="flex items-start gap-1">
                            <span className="text-amber-400">⚠️</span>
                            <span>{risk}</span>
                          </div>
                        ))}
                      </div>
                    )}

                    {teamAssessment.summary && (
                      <p className="text-[9px] text-zinc-400 italic pt-1 border-t border-purple-900/30">
                        {teamAssessment.summary}
                      </p>
                    )}
                  </div>
                )}
              </div>

              {/* Execution Action Button & Docs Link */}
              <div className="mt-3 pt-2 border-t border-zinc-800 flex items-center justify-between gap-2">
                <div>
                  {contract.docsUrl && (
                    <a
                      href={contract.docsUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-[10px] font-mono text-cyan-300 bg-cyan-950/60 border border-cyan-700/50 hover:border-cyan-400 hover:text-cyan-100 transition-colors"
                      title={state.language === 'es' ? 'Leer paper / documentación técnica real' : 'Read real technical paper / docs'}
                    >
                      <BookOpen className="w-3 h-3 text-cyan-400" />
                      <span>{state.language === 'es' ? 'PAPER / DOCS' : 'DOCS / PAPER'}</span>
                      <ExternalLink className="w-2.5 h-2.5 opacity-70" />
                    </a>
                  )}
                </div>

                {contract.completed ? (
                  <span className="flex items-center gap-1 text-emerald-400 text-xs font-bold">
                    <Check className="w-3.5 h-3.5" />
                    {t(state.language, 'completed_contract')}
                  </span>
                ) : isCurrentActive ? (
                  <span className="text-amber-300 text-xs font-bold animate-pulse">
                    {t(state.language, 'mission_in_progress')} ({state.activeGig?.timeRemaining}s · {state.activeGig?.progressPercent ?? 0}%)
                  </span>
                ) : (
                  <button
                    onClick={() => handleAcceptMission(contract.id)}
                    disabled={!eligible || !!state.activeGig}
                    className={`py-1.5 px-3 rounded text-xs font-bold flex items-center gap-1.5 transition-all ${
                      eligible && !state.activeGig
                        ? contract.lastAttemptFailed
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
                        : t(state.language, 'accept_and_run')}
                    </span>
                  </button>
                )}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
};
