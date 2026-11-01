import type {
  AgentInstance,
  AgentRole,
  ContractGig,
  DataSourceNode,
  GuardrailConfig,
  ModelArchitecture
} from '../types/game';
import { AGENT_COMPUTE_DEMAND_PFLOPS } from './constants';

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
}

const clampScore = (score: number): number => Math.round(Math.max(0, Math.min(100, score)));

const ROLE_TOPOLOGIES: Partial<Record<AgentInstance['role'], ModelArchitecture['topology'][]>> = {
  researcher: ['transformer', 'moe'],
  arbitrageur: ['gnn_hybrid', 'transformer'],
  economist: ['gnn_hybrid', 'transformer'],
  software_engineer: ['transformer', 'mamba_ssm'],
  autonomous_coder: ['transformer', 'mamba_ssm'],
  network_analyst: ['mamba_ssm', 'gnn_hybrid'],
  overseer: ['transformer', 'moe']
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
  const reasoning = clampScore(45 + model.reasoningScore * 0.3);
  const specialization = clampScore(
    55 +
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
  const specialization = clampScore(
    modelEvaluation.specialization +
    (ROLE_TOPOLOGIES[agent.role]?.includes(model.topology) ? 15 : -5)
  );
  const safety = clampScore(
    agent.alignmentScore * 0.7 +
    guardrails.constitutionalStrictness * 0.3 +
    (agent.role === 'overseer' ? 8 : 0)
  );
  const reliability = clampScore(
    (modelEvaluation.reliability +
      Math.max(0, 100 - Math.abs(agent.inferenceParams.temperature - 0.5) * 20)) / 2
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
  const roleCoverage = new Set(agents.map(agent => agent.role)).size;
  const averageReasoning = models.reduce((total, model) => total + model.reasoningScore, 0) / Math.max(1, models.length);
  const activeSources = Array.from(new Set(models.flatMap(model => model.activeDataSources)))
    .map(id => dataSources.find(source => source.id === id && source.unlocked))
    .filter((source): source is DataSourceNode => source !== undefined);
  const dataQualityBonus = Math.min(
    0.12,
    activeSources.length * 0.02 +
      activeSources.reduce((total, source) => total + source.qualityScore, 0) /
      Math.max(1, activeSources.length) / 100 * 0.04
  );
  const averageCapability = agents.reduce((total, agent) => {
    const model = models.find(candidate => candidate.id === agent.modelId);
    return total + (model
      ? evaluateAgentCapabilities(agent, model, dataSources, guardrails).overall
      : 0);
  }, 0) / Math.max(1, agents.length);
  const baseProbability =
    0.4 +
    roleCoverage * 0.06 +
    dataQualityBonus +
    Math.min(0.12, averageReasoning / 1000);
  const capabilityAdjustment = (averageCapability - 70) * 0.003;

  return Math.min(0.95, Math.max(0.25, baseProbability + capabilityAdjustment));
}

export function evaluateMissionTeam(
  contract: ContractGig,
  agents: AgentInstance[],
  models: ModelArchitecture[],
  dataSources: DataSourceNode[],
  guardrails: GuardrailConfig
): MissionTeamEvaluation {
  const averageCapability = agents.reduce((total, agent) => {
    const model = models.find(candidate => candidate.id === agent.modelId);
    return total + (model
      ? evaluateAgentCapabilities(agent, model, dataSources, guardrails).overall
      : 0);
  }, 0) / Math.max(1, agents.length);
  const roleCoverage = new Set(agents.map(agent => agent.role)).size;
  const requiredRoles = contract.requiredAgentRoles ?? [];
  const matchedRequiredRoles = requiredRoles.filter(role =>
    agents.some(agent => agent.role === role)
  ).length;
  const requiredRoleCoverage = requiredRoles.length
    ? matchedRequiredRoles / requiredRoles.length
    : 1;
  const efficiencyMultiplier = Math.max(0.65, Math.min(
    1.5,
    0.7 +
      averageCapability / 250 +
      Math.min(0.2, roleCoverage * 0.035) +
      requiredRoleCoverage * 0.12
  ));
  const baseSuccessProbability = calculateMissionSuccessProbability(
    agents,
    models,
    dataSources,
    guardrails
  );
  const successProbability = Math.max(
    0.25,
    Math.min(0.95, baseSuccessProbability + requiredRoleCoverage * 0.04)
  );

  return {
    efficiencyPercent: Math.round(efficiencyMultiplier * 100),
    estimatedDurationSeconds: Math.max(1, Math.ceil(contract.durationSeconds / efficiencyMultiplier)),
    successProbability
  };
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

  const hasQualifiedModel = assignedModels.some(model =>
    model.parametersCount >= contract.requiredParams &&
    model.reasoningScore >= contract.requiredMinReasoning &&
    (!contract.requiredTopology || model.topology === contract.requiredTopology)
  );
  if (!hasQualifiedModel) return false;

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

export function findAutonomousMission(
  contracts: ContractGig[],
  agents: AgentInstance[],
  models: ModelArchitecture[],
  dataSources: DataSourceNode[],
  riskLimit: number,
  availableCompute: number,
  activeAgentCount: number,
  trainingActive: boolean,
  activePowerKw: number,
  maxPowerKw: number
): { contract: ContractGig; computeRequired: number; missionPowerKw: number } | null {
  if (agents.length === 0) return null;

  const candidates = contracts
    .filter(contract =>
      !contract.completed &&
      contract.suspicionRisk <= riskLimit &&
      isContractEligibleForTeam(contract, agents, models, dataSources)
    )
    .sort((a, b) =>
      (b.rewardCredits / (b.durationSeconds * (1 + b.suspicionRisk / 100))) -
      (a.rewardCredits / (a.durationSeconds * (1 + a.suspicionRisk / 100)))
    );

  for (const contract of candidates) {
    const computeRequired = Math.max(0.001, contract.requiredParams / 1_000_000_000 * 0.002);
    const missionPowerKw = Math.max(0.05, computeRequired * 20);
    const activeAgentDemand = activeAgentCount * AGENT_COMPUTE_DEMAND_PFLOPS;
    const trainingReservation = trainingActive ? availableCompute * 0.5 : 0;

    if (availableCompute - activeAgentDemand - trainingReservation < computeRequired) continue;
    if (activePowerKw + missionPowerKw > maxPowerKw) continue;
    return { contract, computeRequired, missionPowerKw };
  }

  return null;
}
