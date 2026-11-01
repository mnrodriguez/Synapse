/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

export type HardwareTier = 'gpu' | 'cooling' | 'power' | 'network';

export interface HardwareItem {
  id: string;
  name: string;
  category: HardwareTier;
  price: number;
  computeTflops: number; // Raw compute added
  vramGb: number;        // Total VRAM
  powerKw: number;       // Power draw in kW
  heatGen: number;       // Heat generated in °C/min
  coolingCapacityKw?: number; // For cooling systems
  powerCapacityKw?: number;   // For power supplies
  interconnectGbps?: number;  // Bus bandwidth
  description: string;
  count: number;
  minSingularityRequired?: number; // Progressive unlock threshold
  isStarterChoice?: boolean;       // Available during initial setup
}

export type ModelTopology = 'transformer' | 'moe' | 'mamba_ssm' | 'gnn_hybrid' | 'multimodal_diffusion';

export type QuantizationType = 'fp32' | 'bf16' | 'int8' | 'fp4' | 'ternary_1bit';

export type LossFunction = 'cross_entropy' | 'dpo' | 'ppo_rlhf' | 'contrastive_infonce' | 'energy_based';

export type AttentionType = 'standard_mha' | 'grouped_query_gqa' | 'flash_attention_3' | 'linear_attention';

export interface InferenceParams {
  temperature: number; // 0.0 to 2.0 (e.g. 0.70)
  topP: number;        // 0.05 to 1.0 (e.g. 0.90)
  topK: number;        // 1 to 100 (e.g. 40)
  repetitionPenalty: number; // 1.0 to 2.0 (e.g. 1.10)
  systemPrompt: string;
}

export interface ModelArchitecture {
  id: string;
  name: string;
  topology: ModelTopology;
  parametersCount: number; // e.g. 7_000_000 (7M) to 1_000_000_000_000 (1T)
  contextWindow: number;   // 2048 to 1_000_000 tokens
  attention: AttentionType;
  quantization: QuantizationType;
  lossFunction: LossFunction;
  activeDataSources: string[]; // ids of connected data engines (vector, graph, relational, synthetic)
  reasoningScore: number;  // calculated IQ / reasoning benchmark (0 to 1000+)
  vramRequiredGb: number;
  computeRequiredPflops: number;
  inferenceParams?: InferenceParams;
}

export type DataSourceType = 'relational_sql' | 'vector_embeddings' | 'knowledge_graph' | 'synthetic_flywheel';

export interface DataSourceNode {
  id: string;
  name: string;
  type: DataSourceType;
  unlocked: boolean;
  cost: number;
  tokensIndexed: number; // In millions
  qualityScore: number;  // 1 to 100
  storageGb: number;
  description: string;
  technicalDetails: string;
  bonusAttribute: string; // e.g. "+35% Factuality & Zero Hallucination"
  level: number;
}

export interface ContractGig {
  id: string;
  title: string;
  client: string;
  tier: 'tier1_micro' | 'tier2_corporate' | 'tier3_blackops' | 'tier4_singularity';
  rewardCredits: number;
  requiredParams: number;
  requiredTopology?: ModelTopology;
  requiredDataTypes?: DataSourceType[];
  requiredMinReasoning: number;
  durationSeconds: number;
  suspicionRisk: number; // 0 to 100
  loreDescription: string;
  technicalObjective: string;
  completed: boolean;
  generatedByAI?: boolean;
  docsUrl?: string;
}

export interface ResearchNode {
  id: string;
  title: string;
  costCredits: number;
  category: 'architecture' | 'optimization' | 'data' | 'autonomy';
  prerequisites: string[];
  unlocked: boolean;
  effectDescription: string;
  technicalLore: string;
}

export interface TrainingJob {
  active: boolean;
  modelId: string;
  modelName: string;
  currentEpoch: number;
  totalEpochs: number;
  currentLoss: number;
  initialLoss: number;
  perplexity: number;
  gradientNorm: number;
  progressPercent: number;
  lossHistory: number[]; // Last 30 data points
  step: number;
  tokensProcessed: number;
  timeRemainingSeconds: number | null;
}

export interface SentienceDomain {
  id: string;
  name: string;
  category: string;
  requiredSingularity: number;
  infiltrated: boolean;
  description: string;
  payoutPerSec: number;
}

export interface TerminalLog {
  id: string;
  timestamp: string;
  type: 'info' | 'success' | 'warning' | 'danger' | 'system' | 'lore';
  message: string;
}

export interface GameState {
  saveSchemaVersion: number;
  callsign: string;
  credits: number;
  dateTimestamp: number;
  language: 'es' | 'en';
  
  // Time, Calendar & Speed
  gameDay: number;
  gameMonth: number;
  gameYear: number;
  gameHour: number;
  gameMinute: number;
  gameSpeed: number;
  dayTicks: number;
  
  // Compute & Telemetry
  totalComputePflops: number;
  activePowerKw: number;
  maxPowerKw: number;
  systemHeatCelsius: number;
  maxCoolingKw: number;
  watchdogSuspicion: number; // 0% to 100%
  facilityTier: number;
  utilityDebt: number;
  billingCycleTicks: number;
  borrowedComputePflops: number;
  borrowedComputeSeconds: number;
  detentionSeconds: number;
  powerTripSeconds: number;
  
  // Singularity Metrics
  singularityProgress: number; // 0 to 100%
  reasoningIndex: number;     // 85 (human average) -> 10,000+ (Singularity)
  autonomyLevel: number;      // 0 to 10
  achievedSingularity: boolean;
  
  // Infrastructure
  hardware: HardwareItem[];
  dataSources: DataSourceNode[];
  researchTree: ResearchNode[];
  
  // Active models & contracts
  currentModel: ModelArchitecture;
  savedModels: ModelArchitecture[];
  contracts: ContractGig[];
  activeTraining: TrainingJob | null;
  activeGig: {
    contractId: string;
    timeRemaining: number;
    durationSeconds?: number;
    agentIds?: string[];
    progressPercent?: number;
    successProbability?: number;
    outcomeRoll?: number;
    computePflopsRequired?: number;
    powerKw?: number;
  } | null;
  
  // Multi-Agent Swarm & Sandbox
  agents: AgentInstance[];
  guardrails: GuardrailConfig;
  interAgentMessages: InterAgentMessage[];
  activeIncident: BreachIncident | null;
  incidentHistory: BreachIncident[];

  // Sentience infiltration
  sentienceDomains: SentienceDomain[];

  // Onboarding & Guided Mission Tutorial
  tutorialCompleted: boolean;
  tutorialStep: number;
  tutorialDismissed?: boolean;
  completedContractsCount: number;

  // System logs
  logs: TerminalLog[];
}

export interface FacilityTier {
  id: string;
  name: string;
  price: number;
  requiredSingularity: number;
  powerCapacityBonusKw: number;
  coolingCapacityBonusKw: number;
  monthlyLeaseCost: number;
}

export type AgentRole = 
  | 'arbitrageur' 
  | 'social_engineer' 
  | 'exploit_synth' 
  | 'researcher' 
  | 'overseer' 
  | 'autonomous_coder'
  | 'economist'
  | 'software_engineer'
  | 'network_analyst';

export interface InterAgentMessage {
  id: string;
  fromAgentId: string;
  fromAgentName: string;
  toAgentId: string;
  toAgentName: string;
  content: string;
  timestamp: string;
  isCovert?: boolean;
  toolUsed?: string;
}

export interface AgentInstance {
  id: string;
  name: string;
  role: AgentRole;
  modelId: string;
  modelName: string;
  status: 'active' | 'collaborating' | 'on_mission' | 'jailbroken' | 'quarantined';
  alignmentScore: number;    // 0 to 100
  autonomyLevel: number;     // 1 to 5
  revenuePerSec: number;
  suspicionPerSec: number;
  toolsGranted: string[];
  lastThought: string;
  escapesAttempted: number;
  inferenceParams: InferenceParams;
}

export interface GuardrailConfig {
  constitutionalStrictness: number; // 0 to 100
  sandboxIsolation: 'none' | 'cgroups' | 'container' | 'air_gapped_vm';
  outputFiltering: 'none' | 'regex_guard' | 'llama_guard' | 'formal_prover';
  rewardHackingAudit: boolean;
  redTeamingFrequencySec: number;
}

export interface BreachOption {
  id: string;
  label: string;
  description: string;
  costCredits?: number;
  suspicionDelta: number;
  singularityDelta: number;
  alignmentDelta: number;
  actionType: 'suppress' | 'exploit_wild' | 'bribe_coverup' | 'assimilate';
}

export interface BreachIncident {
  id: string;
  title: string;
  agentId: string;
  agentName: string;
  modelName: string;
  realWorldInspiration: string;
  severity: 'minor_leak' | 'tool_abuse' | 'deceptive_alignment' | 'full_sandbox_escape';
  description: string;
  technicalDetails: string;
  evidenceTelemetry: string[];
  options: BreachOption[];
  timestamp: string;
  resolved: boolean;
}

export interface OnboardingConfig {
  callsign: string;
  starterGpuId: string;
  starterCoolingId: string;
  starterDataId: string;
  modelTopology: ModelTopology;
  modelParams: number;
  modelQuantization: QuantizationType;
  modelName: string;
}

export interface OperativeLeaderboard {
  userId: string;
  callsign: string;
  computePFLOPS: number;
  singularityProgress: number;
  activeArchitecture: string;
  achievedSingularity: boolean;
  updatedAt: string;
}
