/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import type {
  AgentInstance,
  AgentRole,
  ContractGig,
  DataSourceNode,
  GuardrailConfig,
  ModelArchitecture, CapabilityFactor } from '../types/game';
import { getRoleSimpleName } from './constants';
import { missionComputePflops, missionPowerKw } from './computeLedger';
import { MISSION } from './rules';

export interface ModelCapabilityEvaluation {
  reasoning: number;
  specialization: number;
  dataReadiness: number;
  reliability: number;
  overall: number;
}

export interface AgentCapabilityEvaluation extends ModelCapabilityEvaluation {
  safety: number;
}

export interface MissionTeamEvaluation {
  efficiencyPercent: number;
  estimatedDurationSeconds: number;
  successProbability: number;
  summary?: string;
  riskFactors?: string[];
  synergyBonuses?: string[];
  agentTasks?: Record<string, string>;
}

const clampScore = (score: number): number => Math.round(Math.max(0, Math.min(100, score)));

const ROLE_TOPOLOGIES: Partial<Record<AgentInstance['role'], ModelArchitecture['topology'][]>> = {
  researcher: ['transformer', 'moe'],
  arbitrageur: ['gnn_hybrid', 'transformer'],
  economist: ['gnn_hybrid', 'transformer'],
  software_engineer: ['transformer', 'mamba_ssm'],
  autonomous_coder: ['transformer', 'mamba_ssm'],
  network_analyst: ['mamba_ssm', 'gnn_hybrid'],
  overseer: ['transformer', 'moe'],
  social_engineer: ['transformer', 'multimodal_diffusion'],
  exploit_synth: ['mamba_ssm', 'moe']
};

const getAvailableSources = (model: ModelArchitecture, dataSources: DataSourceNode[]) =>
  model.activeDataSources
    .map(id => dataSources.find(source => source.id === id && source.unlocked))
    .filter((source): source is DataSourceNode => source !== undefined);

export function evaluateModelCapabilities(
  model: ModelArchitecture,
  dataSources: DataSourceNode[]
): ModelCapabilityEvaluation {
  const sources = getAvailableSources(model, dataSources);
  const inference = model.inferenceParams;
  const reasoning = clampScore(45 + model.reasoningScore * 0.6); // evaluation score 0-100
  const isMicroModel = model.modelType === 'micro_model';
  const microSpecializationBonus = isMicroModel ? Math.round((model.domainProficiency || 1.5) * 20) : 0;
  const specialization = clampScore(
    55 +
    microSpecializationBonus +
    Math.min(20, Math.log10(Math.max(1, model.parametersCount / 14_000_000)) * 10) +
    (model.topology === 'transformer' || model.topology === 'moe' ? 10 : 5)
  );
  const averageDataQuality = sources.length
    ? sources.reduce((total, source) => total + source.qualityScore, 0) / sources.length
    : 0;
  const dataReadiness = clampScore(30 + sources.length * 12 + averageDataQuality * 0.35);
  const reliability = clampScore(
    90 -
    (inference ? Math.abs(inference.temperature - 0.5) * 12 : 0) -
    (inference && inference.topP > 0.95 ? 5 : 0) +
    (model.lossFunction === 'cross_entropy' ? 5 : 0)
  );
  const overall = clampScore(
    reasoning * 0.3 +
    specialization * 0.2 +
    dataReadiness * 0.25 +
    reliability * 0.25
  );

  return { reasoning, specialization, dataReadiness, reliability, overall };
}

export function evaluateAgentCapabilities(
  agent: AgentInstance,
  model: ModelArchitecture,
  dataSources: DataSourceNode[],
  guardrails: GuardrailConfig
): AgentCapabilityEvaluation {
  const modelEvaluation = evaluateModelCapabilities(model, dataSources);
  const topologyMatch = ROLE_TOPOLOGIES[agent.role]?.includes(model.topology);
  const specialization = clampScore(
    modelEvaluation.specialization + (topologyMatch ? 15 : -5)
  );
  const safety = clampScore(
    agent.alignmentScore * 0.7 +
    guardrails.constitutionalStrictness * 0.3 +
    (agent.role === 'overseer' ? 10 : 0)
  );
  const inference = agent.inferenceParams || model.inferenceParams;
  const tempVariance = inference ? Math.abs(inference.temperature - 0.6) : 0.1;
  const reliability = clampScore(
    (modelEvaluation.reliability + Math.max(0, 100 - tempVariance * 25)) / 2
  );
  const overall = clampScore(
    modelEvaluation.reasoning * 0.25 +
    specialization * 0.25 +
    modelEvaluation.dataReadiness * 0.2 +
    reliability * 0.15 +
    safety * 0.15
  );

  return {
    reasoning: modelEvaluation.reasoning,
    specialization,
    dataReadiness: modelEvaluation.dataReadiness,
    reliability,
    safety,
    overall
  };
}

export function calculateMissionSuccessProbability(
  agents: AgentInstance[],
  models: ModelArchitecture[],
  dataSources: DataSourceNode[],
  guardrails: GuardrailConfig
): number {
  if (agents.length === 0) return 0.2;
  const roleCoverage = new Set(agents.map(agent => agent.role)).size;
  const averageReasoning = models.reduce((total, model) => total + model.reasoningScore, 0) / Math.max(1, models.length);
  const activeSources = Array.from(new Set(models.flatMap(model => model.activeDataSources)))
    .map(id => dataSources.find(source => source.id === id && source.unlocked))
    .filter((source): source is DataSourceNode => source !== undefined);
  const dataQualityBonus = Math.min(
    MISSION.dataBonusMax,
    activeSources.length * 0.03 +
      activeSources.reduce((total, source) => total + source.qualityScore, 0) /
      Math.max(1, activeSources.length) / 100 * 0.05
  );
  const averageCapability = agents.reduce((total, agent) => {
    const model = models.find(candidate => candidate.id === agent.modelId);
    return total + (model
      ? evaluateAgentCapabilities(agent, model, dataSources, guardrails).overall
      : 0);
  }, 0) / Math.max(1, agents.length);

  const baseProbability =
    MISSION.base +
    roleCoverage * MISSION.perRole +
    dataQualityBonus +
    Math.min(MISSION.reasoningBonusMax, averageReasoning / 1200);
  const capabilityAdjustment = (averageCapability - MISSION.capabilityPivot) * MISSION.perCapabilityPoint;

  return Math.min(MISSION.max, Math.max(MISSION.min, baseProbability + capabilityAdjustment));
}

/**
 * Advanced Offline AI Decision Model for Mission Team Evaluation
 * Evaluates high-order non-linear interactions between:
 * - Agent role x Model topology synergy
 * - Parameter scale vs contract complexity
 * - Data source availability & quality
 * - Inference parameter volatility (temperature & topP entropy)
 * - Guardrail strictness & Overseer presence
 */
export function evaluateMissionTeam(
  contract: ContractGig,
  agents: AgentInstance[],
  models: ModelArchitecture[],
  dataSources: DataSourceNode[],
  guardrails: GuardrailConfig
): MissionTeamEvaluation {
  if (agents.length === 0) {
    return {
      efficiencyPercent: 50,
      estimatedDurationSeconds: contract.durationSeconds * 2,
      successProbability: 0.15,
      summary: 'No agents assigned to the mission team.',
      riskFactors: ['No agents assigned.'],
      synergyBonuses: [],
      agentTasks: {}
    };
  }

  const riskFactors: string[] = [];
  const synergyBonuses: string[] = [];
  const agentTasks: Record<string, string> = {};

  const modelById = new Map(models.map(m => [m.id, m]));
  const hasOverseer = agents.some(a => a.role === 'overseer' && a.status === 'active');
  const roleCoverage = new Set(agents.map(a => a.role)).size;
  const requiredRoles = contract.requiredAgentRoles ?? [];

  // 1. Required Roles & Role Coverage Analysis
  let roleMatchScore = 1.0;
  if (requiredRoles.length > 0) {
    const matched = requiredRoles.filter(role => agents.some(a => a.role === role)).length;
    roleMatchScore = matched / requiredRoles.length;
    if (roleMatchScore < 1.0) {
      riskFactors.push(`Missing required agent role(s): ${requiredRoles.filter(r => !agents.some(a => a.role === r)).map(r => getRoleSimpleName(r)).join(', ')}`);
    } else {
      synergyBonuses.push('All required agent roles present in squad.');
    }
  }

  if (hasOverseer) {
    synergyBonuses.push('Safety Overseer present: stabilizes high temperature volatility & alignment drift.');
  } else {
    const volatileAgent = agents.find(a => (a.inferenceParams?.temperature || 0.7) > 0.95);
    if (volatileAgent) {
      riskFactors.push(`High temperature volatility (${volatileAgent.name}: T=${volatileAgent.inferenceParams.temperature.toFixed(2)}) without Overseer supervision.`);
    }
  }

  // 2. Topology Synergy & Parameter Scale Evaluation
  let totalSynergyMultiplier = 1.0;
  let totalParameterScaleScore = 0;
  let totalDataMatchBonus = 0;

  const activeUnlockedDataSources = dataSources.filter(d => d.unlocked);
  const activeDataSourceTypes = new Set<string>();

  agents.forEach(agent => {
    const model = modelById.get(agent.modelId);
    if (!model) return;

    // Topology match check
    const preferredTopologies = ROLE_TOPOLOGIES[agent.role];
    if (preferredTopologies && preferredTopologies.includes(model.topology)) {
      totalSynergyMultiplier += 0.08;
      synergyBonuses.push(`${agent.name} (${getRoleSimpleName(agent.role)}): ${model.topology.toUpperCase()} topology synergy (+8% efficiency).`);
    } else if (preferredTopologies) {
      totalSynergyMultiplier -= 0.04;
    }

    // Model Parameter Scale vs Contract Target
    const paramRatio = model.parametersCount / Math.max(1, contract.requiredParams);
    if (paramRatio >= 1.0) {
      totalParameterScaleScore += 1.0;
    } else {
      totalParameterScaleScore += Math.max(0.2, paramRatio);
      riskFactors.push(`${agent.name}: Model (${(model.parametersCount / 1e6).toFixed(0)}M) below contract target (${(contract.requiredParams / 1e6).toFixed(0)}M).`);
    }

    // Active Data Sources attached to model
    model.activeDataSources.forEach(sourceId => {
      const source = activeUnlockedDataSources.find(s => s.id === sourceId);
      if (source) {
        activeDataSourceTypes.add(source.type);
      }
    });

    // Domain Specialization (Micro-Models)
    if (model.modelType === 'micro_model' && model.specializedDomain) {
      const contractText = `${contract.title} ${contract.technicalObjective} ${contract.loreDescription}`.toLowerCase();
      const domain = model.specializedDomain.toLowerCase();
      const domainKeywords: string[] = {
        cybersecurity: ['security', 'exploit', 'firewall', 'intrusion', 'cve', 'hack', 'blackops', 'cyber', 'pentest', 'vulnerability', 'zero-day', 'c2'],
        financial_forecasting: ['finance', 'arbitrage', 'market', 'trading', 'crypto', 'liquidity', 'economic', 'ledger', 'yield', 'portfolio', 'asset'],
        astrophysics: ['satellite', 'orbital', 'astronomy', 'telemetry', 'physics', 'cosmic', 'trajectory', 'relay', 'stellar', 'deep space'],
        bioinformatics: ['bio', 'genomic', 'protein', 'cellular', 'dna', 'molecular', 'pharma', 'neural', 'biology', 'crispr', 'biochemical'],
        robotics_kinematics: ['robot', 'drone', 'swarm', 'hardware', 'actuator', 'telemetry', 'motion', 'kinematics', 'autonomous', 'fleet']
      }[domain] || [domain];

      if (domainKeywords.some(kw => contractText.includes(kw))) {
        totalDataMatchBonus += 0.10 * (model.domainProficiency || 1.5);
        synergyBonuses.push(`${agent.name}: Domain specialization match (${domain}) +${Math.round((model.domainProficiency || 1.5) * 10)}% success.`);
      }
    }

    // Dynamic Task Generation for each agent
    const roleTaskMap: Record<AgentRole, string> = {
      arbitrageur: 'Running real-time micro-transaction pattern matching & yield risk estimation.',
      social_engineer: 'Synthesizing contextual prompt variations & sentiment boundary audits.',
      exploit_synth: 'Executing automated symbolic fuzzing & boundary vulnerability checks.',
      researcher: 'Conducting Monte Carlo hypothesis verification & loss curve optimization.',
      overseer: 'Enforcing constitutional alignment constraints & monitoring tensor outputs.',
      autonomous_coder: 'Compiling optimized tensor kernel routes & managing memory allocations.',
      economist: 'Modeling macro-liquidity flows & computational resource cost-efficiency.',
      software_engineer: 'Refactoring distributed API pipelines & handling vector index shards.',
      network_analyst: 'Analyzing packet telemetry & monitoring node routing latencies.'
    };
    agentTasks[agent.id] = roleTaskMap[agent.role] || 'Executing assigned model inference sub-routines.';
  });

  // 3. Data Engine Requirements Check
  const requiredDataTypes = contract.requiredDataTypes || [];
  if (requiredDataTypes.length > 0) {
    const missingTypes = requiredDataTypes.filter(type => !activeDataSourceTypes.has(type));
    if (missingTypes.length > 0) {
      riskFactors.push(`Missing required active data engine(s): ${missingTypes.join(', ')}.`);
      totalSynergyMultiplier -= 0.15 * missingTypes.length;
    } else {
      synergyBonuses.push('All required data engines connected and operational.');
    }
  }

  // 4. Overall Capabilities & Base Success Calculation
  const avgCapability = agents.reduce((sum, agent) => {
    const model = modelById.get(agent.modelId);
    return sum + (model ? evaluateAgentCapabilities(agent, model, dataSources, guardrails).overall : 50);
  }, 0) / agents.length;

  const baseProb = calculateMissionSuccessProbability(agents, models, dataSources, guardrails);
  const paramPenalty = (totalParameterScaleScore / agents.length < 0.8) ? -MISSION.undersizedModelPenalty : 0;
  const rolePenalty = (roleMatchScore < 1.0) ? -MISSION.missingRolePenalty : 0;

  const rawSuccessProb = baseProb + totalDataMatchBonus + paramPenalty + rolePenalty + (hasOverseer ? MISSION.overseerBonus : 0);
  const successProbability = Math.min(MISSION.max, Math.max(MISSION.min, Number(rawSuccessProb.toFixed(2))));

  // Efficiency Multiplier calculation
  const efficiencyMultiplier = Math.max(
    0.45,
    Math.min(
      1.75,
      0.80 +
        (avgCapability - 60) * 0.006 +
        totalSynergyMultiplier - 1.0 +
        (roleCoverage * 0.03) +
        (roleMatchScore * 0.10)
    )
  );

  const efficiencyPercent = Math.round(efficiencyMultiplier * 100);
  const estimatedDurationSeconds = Math.max(1, Math.ceil(contract.durationSeconds / efficiencyMultiplier));

  const summary = riskFactors.length === 0
    ? `[AI ASSESSMENT] Team fully optimized. High synergy (${efficiencyPercent}% efficiency, ${Math.round(successProbability * 100)}% success rate).`
    : `[AI ASSESSMENT] Team operational with ${riskFactors.length} warning(s). ${Math.round(successProbability * 100)}% estimated success probability.`;

  return {
    efficiencyPercent,
    estimatedDurationSeconds,
    successProbability,
    summary,
    riskFactors,
    synergyBonuses,
    agentTasks
  };
}

// Model requirements of a contract are met by one model, not by different models each meeting one part.
// The board and the mission start both use this, so a contract that looks ready can always be launched.
export interface ModelRequirementCheck {
  model: ModelArchitecture | null;
  params: boolean;
  reasoning: boolean;
  topology: boolean;
}

export function modelRequirementCheck(contract: ContractGig, models: ModelArchitecture[]): ModelRequirementCheck {
  const checks = models.map(model => ({
    model,
    params: model.parametersCount >= contract.requiredParams,
    reasoning: model.reasoningScore >= contract.requiredMinReasoning,
    topology: !contract.requiredTopology || model.topology === contract.requiredTopology
  }));
  const met = (c: ModelRequirementCheck) => Number(c.params) + Number(c.reasoning) + Number(c.topology);
  checks.sort((a, b) => met(b) - met(a) || b.model.reasoningScore - a.model.reasoningScore);
  return checks[0] ?? { model: null, params: false, reasoning: false, topology: !contract.requiredTopology };
}

export const meetsModelRequirements = (c: ModelRequirementCheck): boolean => c.params && c.reasoning && c.topology;

// The team's capability scores, weakest first: what to improve after a failed mission.
export function weakestTeamFactors(
  agents: AgentInstance[],
  models: ModelArchitecture[],
  dataSources: DataSourceNode[],
  guardrails: GuardrailConfig,
  count = 2
): Array<{ factor: CapabilityFactor; score: number }> {
  const evaluations = agents
    .map(agent => {
      const model = models.find(m => m.id === agent.modelId);
      return model ? evaluateAgentCapabilities(agent, model, dataSources, guardrails) : null;
    })
    .filter((e): e is AgentCapabilityEvaluation => e !== null);
  if (evaluations.length === 0) return [];
  const factors: CapabilityFactor[] = ['reasoning', 'specialization', 'dataReadiness', 'reliability', 'safety'];
  return factors
    .map(factor => ({ factor, score: Math.round(evaluations.reduce((sum, e) => sum + e[factor], 0) / evaluations.length) }))
    .sort((a, b) => a.score - b.score)
    .slice(0, count);
}

export function isContractEligibleForTeam(
  contract: ContractGig,
  agents: AgentInstance[],
  models: ModelArchitecture[],
  dataSources: DataSourceNode[]
): boolean {
  if (
    agents.length < (contract.minimumAgents ?? 1) ||
    agents.some(agent => agent.status !== 'active')
  ) return false;

  const assignedRoles = new Set<AgentRole>(agents.map(agent => agent.role));
  if ((contract.requiredAgentRoles ?? []).some(role => !assignedRoles.has(role))) return false;

  const assignedModels = agents
    .map(agent => models.find(model => model.id === agent.modelId))
    .filter((model): model is ModelArchitecture => model !== undefined);
  if (assignedModels.length !== agents.length) return false;

  if (!meetsModelRequirements(modelRequirementCheck(contract, assignedModels))) return false;

  return (contract.requiredDataTypes || []).every(requiredType =>
    assignedModels.some(model =>
      model.activeDataSources.some(sourceId =>
        dataSources.some(source =>
          source.id === sourceId &&
          source.type === requiredType &&
          source.unlocked
        )
      )
    )
  );
}

// The smallest team of free agents that can run a contract: one agent per required role, one model that
// meets parameters, score and topology, the required data engines, and the minimum head count. Small
// models are preferred because a working agent costs compute in proportion to its model.
export function proposeTeam(
  contract: ContractGig,
  freeAgents: AgentInstance[],
  models: ModelArchitecture[],
  dataSources: DataSourceNode[]
): AgentInstance[] | null {
  const modelOf = (agent: AgentInstance) => models.find(model => model.id === agent.modelId);
  const candidates = freeAgents.filter(agent => agent.status === 'active' && modelOf(agent));
  const qualifies = (agent: AgentInstance) => meetsModelRequirements(modelRequirementCheck(contract, [modelOf(agent)!]));
  // Qualifying models first, then the smallest (cheapest to run), then the best score.
  const byPreference = (a: AgentInstance, b: AgentInstance) =>
    Number(qualifies(b)) - Number(qualifies(a)) ||
    modelOf(a)!.parametersCount - modelOf(b)!.parametersCount ||
    modelOf(b)!.reasoningScore - modelOf(a)!.reasoningScore;
  const pool = [...candidates].sort(byPreference);
  const team: AgentInstance[] = [];
  const take = (agent: AgentInstance | undefined): boolean => {
    if (!agent) return false;
    team.push(agent);
    pool.splice(pool.indexOf(agent), 1);
    return true;
  };

  for (const role of contract.requiredAgentRoles ?? []) {
    if (team.some(agent => agent.role === role)) continue;
    if (!take(pool.find(agent => agent.role === role))) return null;
  }
  if (!team.some(qualifies) && !take(pool.find(qualifies))) return null;

  const teamTypes = () => new Set(team.flatMap(agent => modelOf(agent)!.activeDataSources
    .map(id => dataSources.find(source => source.id === id && source.unlocked)?.type)
    .filter((type): type is DataSourceNode['type'] => type !== undefined)));
  for (const type of contract.requiredDataTypes ?? []) {
    if (teamTypes().has(type)) continue;
    const provider = pool.find(agent => modelOf(agent)!.activeDataSources.some(id =>
      dataSources.some(source => source.id === id && source.unlocked && source.type === type)));
    if (!take(provider)) return null;
  }
  while (team.length < (contract.minimumAgents ?? 1)) {
    if (!take(pool[0])) return null;
  }
  return isContractEligibleForTeam(contract, team, models, dataSources) ? team : null;
}

export interface AutonomousPlan {
  contract: ContractGig;
  team: AgentInstance[];
  computeRequired: number;
  missionPowerKw: number;
}

// The next contract the autonomous bots take: the best paying one, for its time, risk and compute, that a
// team of free bots can run inside the compute budget the player gave them and the cluster's free compute
// and power. One contract per call; the tick calls it again while bots and budget remain.
export function findAutonomousMission(
  contracts: ContractGig[],
  freeAgents: AgentInstance[],
  models: ModelArchitecture[],
  dataSources: DataSourceNode[],
  riskLimit: number,
  freeCompute: number,
  autonomyBudgetLeft: number,
  activePowerKw: number,
  maxPowerKw: number
): AutonomousPlan | null {
  if (freeAgents.length === 0) return null;

  const plans: AutonomousPlan[] = [];
  for (const contract of contracts) {
    if (contract.completed || contract.suspicionRisk > riskLimit) continue;
    const team = proposeTeam(contract, freeAgents, models, dataSources);
    if (!team) continue;
    const teamModels = team.map(agent => models.find(model => model.id === agent.modelId)!);
    const computeRequired = missionComputePflops(teamModels);
    const powerKw = missionPowerKw(computeRequired);
    if (computeRequired > freeCompute || computeRequired > autonomyBudgetLeft) continue;
    if (activePowerKw + powerKw > maxPowerKw) continue;
    plans.push({ contract, team, computeRequired, missionPowerKw: powerKw });
  }
  const value = (plan: AutonomousPlan) =>
    plan.contract.rewardCredits / (plan.contract.durationSeconds * (1 + plan.contract.suspicionRisk / 100));
  plans.sort((a, b) => value(b) - value(a) || a.computeRequired - b.computeRequired);
  return plans[0] ?? null;
}
