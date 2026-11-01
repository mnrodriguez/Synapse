/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState } from 'react';
import { useGame } from '../context/GameContext';
import { ContractGig } from '../types/game';
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
  Check
} from 'lucide-react';
import { sound } from '../audio/soundManager';
import { localize, t } from '../utils/i18n';
import { AGENT_COMPUTE_DEMAND_PFLOPS } from '../utils/constants';

const ENGLISH_CONTRACT_COPY: Record<string, { title: string; lore: string; objective: string }> = {
  gig_spam_classifier: {
    title: 'Large-Scale Banking Phishing Classification',
    lore: 'A financial startup needs to filter millions of fraudulent emails. Your small model can identify common text patterns.',
    objective: 'Fine-tune a binary classifier with cross-entropy on a relational dataset.'
  },
  gig_captcha_ocr: {
    title: 'Complex CAPTCHA Recognition Benchmark',
    lore: 'A web-data research group is evaluating visual and text recognition in a controlled benchmark.',
    objective: 'Feature extraction and sequence recognition using INT8 quantization.'
  },
  gig_sentiment_arbitrage: {
    title: 'Cryptocurrency Social Sentiment Analysis',
    lore: 'Detect shifts in optimism and concern in public posts before market indicators respond.',
    objective: 'Stream processing with aggregations over relational databases.'
  },
  gig_legal_rag_audit: {
    title: 'Forensic Review of Corporate Contracts and Litigation',
    lore: 'Search millions of legal documents to identify relevant indemnity clauses for a client review.',
    objective: 'Dense vector indexing with cosine similarity and high-fidelity RAG retrieval.'
  },
  gig_drug_discovery: {
    title: 'Molecular Affinity Prediction for Oncology Research',
    lore: 'Map interactions between ligands and target proteins using an ontology graph of chemical compounds.',
    objective: 'Graph convolutional networks and causal inference over RDF triples.'
  },
  gig_deepfake_voice_bypass: {
    title: 'Consent-Based Voice Authentication Resilience Test',
    lore: 'A bank is testing its phone authentication controls using authorized synthetic voice samples.',
    objective: 'Low-latency, conditioned autoregressive audio modeling in a controlled test.'
  },
  gig_zeroday_synthesis: {
    title: 'Automated Security Testing for Critical Protocols',
    lore: 'Analyze a simulated router environment for memory-safety issues in an isolated research lab.',
    objective: 'Generate fuzz-test cases and verify results in a closed, non-deployable simulation.'
  },
  gig_satellite_neural_intercept: {
    title: 'LEO Satellite Signal Resilience Analysis',
    lore: 'Reconstruct noisy, simulated satellite telemetry using adaptive neural denoising.',
    objective: 'Hybrid state-space model with one-million-token sequence processing.'
  },
  gig_global_grid_rewiring: {
    title: 'Continental Power Grid Resilience Simulation',
    lore: 'Model how simulated substations could reroute power during a regional outage.',
    objective: 'Real-time distributed load-flow optimization with model-predictive control.'
  },
  gig_singularity_ascension: {
    title: 'Ignition of the Unlimited Intelligence Loop (ASI)',
    lore: 'The system reaches the final stage of the fictional technological-singularity campaign.',
    objective: 'Complete the simulated singularity sequence.'
  }
};

export const ContractBoard: React.FC = () => {
  const { state, acceptContract, deliberateMission, addLog } = useGame();
  const [selectedAgentIds, setSelectedAgentIds] = useState<string[]>([]);
  const availableAgents = state.agents.filter(agent => agent.status === 'active');

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
    const models = assignedAgents.map(agent =>
      state.savedModels.find(model => model.id === agent.modelId)
    ).filter(model => model !== undefined);
    if (models.length !== assignedAgents.length || assignedAgents.length !== selectedAgentIds.length) return false;
    if (!models.some(model =>
      model.parametersCount >= contract.requiredParams &&
      model.reasoningScore >= contract.requiredMinReasoning &&
      (!contract.requiredTopology || model.topology === contract.requiredTopology)
    )) return false;
    if (contract.requiredDataTypes && contract.requiredDataTypes.length > 0) {
      const hasAll = contract.requiredDataTypes.every(reqType =>
        models.some(model => model.activeDataSources.some(sourceId =>
          state.dataSources.some(source => source.id === sourceId && source.type === reqType && source.unlocked)
        ))
      );
      if (!hasAll) return false;
    }
    const computeRequired = Math.max(0.001, contract.requiredParams / 1_000_000_000 * 0.002);
    const missionPowerKw = Math.max(0.05, computeRequired * 20);
    const activeAgentDemand = state.agents.filter(agent => agent.status !== 'quarantined').length * AGENT_COMPUTE_DEMAND_PFLOPS;
    const trainingReservation = state.activeTraining ? state.totalComputePflops * 0.5 : 0;
    if (state.totalComputePflops - activeAgentDemand - trainingReservation < computeRequired) return false;
    if (state.activePowerKw + missionPowerKw > state.maxPowerKw) return false;
    return true;
  };

  const handleAcceptMission = (contractId: string) => {
    if (!acceptContract(contractId, selectedAgentIds)) return;
    if (selectedAgentIds.length > 1) {
      void deliberateMission(contractId, selectedAgentIds).catch(error => {
        addLog(error instanceof Error
          ? error.message
          : localize(state.language, 'La deliberación del equipo no pudo completarse.', 'The team discussion could not be completed.'), 'danger');
      });
    }
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

      {/* Contract Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
        {state.contracts.map(contract => {
          const eligible = isEligible(contract);
          const isCurrentActive = state.activeGig?.contractId === contract.id;
          const englishCopy = state.language === 'en' ? ENGLISH_CONTRACT_COPY[contract.id] : undefined;
          const assignedModels = state.agents
            .filter(agent => selectedAgentIds.includes(agent.id))
            .map(agent => state.savedModels.find(model => model.id === agent.modelId))
            .filter(model => model !== undefined);
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
                    <div className="flex items-center gap-2">
                      {getTierBadge(contract.tier)}
                      <span className="text-[10px] text-zinc-500 font-mono">{t(state.language, 'client')}: {contract.client}</span>
                    </div>
                    <h3 className="font-bold text-xs text-zinc-100 mt-1">{englishCopy?.title ?? contract.title}</h3>
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
                  {englishCopy?.lore ?? contract.loreDescription}
                </p>

                <div className="mt-2 p-2 rounded bg-[#060a10] border border-cyan-950/80 text-[10px] text-zinc-500">
                  <span className="text-cyan-400 font-semibold block">{t(state.language, 'technical_objective')}:</span>
                  {englishCopy?.objective ?? contract.technicalObjective}
                </div>

                {/* Requirements Checklist */}
                <div className="mt-2.5 space-y-1 text-[11px] pt-2 border-t border-zinc-800/80">
                  <div className="flex items-center justify-between">
                    <span className="text-zinc-500 text-[10px]">{t(state.language, 'minimum_parameters')}:</span>
                    <span className={hasRequiredParams ? 'text-emerald-400 font-bold' : 'text-red-400'}>
                      {(contract.requiredParams / 1_000_000).toFixed(0)} {t(state.language, 'minimum_params_units')} {hasRequiredParams ? '✓' : '✗'}
                    </span>
                  </div>

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
              </div>

              {/* Execution Action Button */}
              <div className="mt-3 pt-2 border-t border-zinc-800 flex items-center justify-end">
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
                        ? 'bg-cyan-500 hover:bg-cyan-400 text-zinc-950 cursor-pointer shadow-[0_0_10px_rgba(0,255,200,0.3)]'
                        : 'bg-zinc-800 text-zinc-500 cursor-not-allowed border border-zinc-700'
                    }`}
                  >
                    <Play className="w-3.5 h-3.5 fill-current" />
                    <span>{t(state.language, 'accept_and_run')}</span>
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
