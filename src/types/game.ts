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
  requiredResearchId?: string;
  availableAfterDays?: number;
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
  modelType?: 'general' | 'micro_model';
  specializedDomain?: string;
  domainProficiency?: number;
  trainedOnDatasetId?: string;
}

export type DatasetDomain = 
  | 'general'
  | 'cybersecurity'
  | 'astrophysics'
  | 'financial_forecasting'
  | 'bioinformatics'
  | 'robotics_kinematics'
  | 'quantum_computing'
  | 'autonomous_systems';

export interface CustomDataset {
  id: string;
  name: string;
  domain: DatasetDomain | string;
  domainLabel: string;
  tier: 1 | 2 | 3 | 4;
  tokensCount: number; // In millions
  qualityScore: number; // 0 to 100
  computeSpentPflops: number;
  generatedByModelId?: string;
  generatedByModelName?: string;
  createdAt: number;
  description: string;
}

export interface ActiveDatasetScrapeJob {
  id: string;
  domain: string;
  domainLabel: string;
  tier: 1 | 2 | 3 | 4;
  targetTokens: number; // In millions
  progressPercent: number;
  timeRemainingSeconds: number | null;
  assignedModelId: string;
  assignedModelName: string;
  computeRequiredPflops: number;
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
  requiredResearchId?: string;
  availableAfterDays?: number;
}

export interface ContractGig {
  id: string;
  title: string;
  client: string;
  tier: 'tier1_micro' | 'tier2_corporate' | 'tier3_blackops' | 'tier4_singularity';
  rewardCredits: number;
  requiredParams: number;
  minimumAgents?: number;
  requiredAgentRoles?: AgentRole[];
  requiredTopology?: ModelTopology;
  requiredDataTypes?: DataSourceType[];
  requiredMinReasoning: number;
  durationSeconds: number;
  suspicionRisk: number; // 0 to 100
  loreDescription: string;
  technicalObjective: string;
  completed: boolean;
  generatedByAI?: boolean;
  fromAgentSwarm?: boolean;
  docsUrl?: string;
  lastAttemptFailed?: boolean;
  failureCount?: number;
  stage?: 1 | 2 | 3 | 4;
  isMandatory?: boolean;
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
  releaseYear?: number;
  availableAfterDays?: number;
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
  datasetId?: string;
  datasetName?: string;
  datasetDomain?: string;
  targetModelType?: 'general' | 'micro_model';
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

export interface BotGroup {
  id: string;
  name: string;
  agentIds: string[];
  color?: string;
  createdAt: number;
}

export interface ActiveGig {
  contractId: string;
  runId?: string;
  timeRemaining: number;
  durationSeconds?: number;
  agentIds?: string[];
  squadId?: string;
  squadName?: string;
  progressPercent?: number;
  successProbability?: number;
  efficiencyPercent?: number;
  aiAssessmentStatus?: 'pending' | 'complete' | 'fallback';
  aiAssessmentSource?: 'chrome-nano' | 'gemini-flash' | 'ai-decision-model' | 'heuristic' | 'procedural';
  aiAssessmentSummary?: string;
  agentTasks?: Record<string, string>;
  riskFactors?: string[];
  synergyBonuses?: string[];
  outcomeRoll?: number;
  computePflopsRequired?: number;
  powerKw?: number;
  isAutonomous?: boolean;
}

export interface GameState {
  // Phase objective rewards already paid out (see claimGoal).
  claimedGoalIds?: string[];
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
  campaignDays: number;
  
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
  
  // Dataset Specialization & Scraping Module
  isDataScrapingUnlocked: boolean;
  customDatasets: CustomDataset[];
  activeScrapeJob: ActiveDatasetScrapeJob | null;

  activeGig: ActiveGig | null;
  activeGigs: ActiveGig[];
  botGroups: BotGroup[];
  
  // Mission Outcome Telemetry & History
  lastMissionOutcome: MissionOutcome | null;

  // Multi-Agent Swarm & Sandbox
  agents: AgentInstance[];
  activeTradingDesk: TradingDeskAssignment | null;
  swarmCouncilAgentIds: string[]; // Up to 5 selected agents for group interaction & endgame council
  subversionProgress: number; // 0% to 100% (insidious AI takeover meter)
  aiTakeoverTriggered: boolean; // Flag when the AI takes full control of the world
  singularityCrisisTriggered?: boolean; // 75% crisis dilemma fork
  singularityCrisisResolved?: boolean;
  playerChoseResist?: boolean;
  latestCouncilProposal: DynamicSwarmProposal | null;
  guardrails: GuardrailConfig;
  interAgentMessages: InterAgentMessage[];
  activeIncident: BreachIncident | null;
  incidentCooldownTicks?: number;
  incidentHistory: BreachIncident[];
  autonomyEnabled: boolean;
  autonomyRiskLimit: number;

  // Sentience infiltration
  sentienceDomains: SentienceDomain[];

  // Onboarding & Guided Mission Tutorial
  hasCompletedOnboarding?: boolean;
  tutorialCompleted: boolean;
  tutorialStep: number;
  tutorialDismissed?: boolean;
  completedContractsCount: number;

  // Game Difficulty, Loans, Defeat & Progressive Unlocking
  difficulty: GameDifficulty;
  hasTakenEmergencyLoan: boolean;
  emergencyLoanAmount: number;
  trackingAgency: string;
  agencyAlertLevel: 'low' | 'elevated' | 'critical' | 'raid_imminent';
  gameOverReason: 'bankruptcy' | 'agency_seizure' | null;
  unlockedTabs: string[];
  unlockedAllTabs: boolean;

  // Evolutionary Diegetic UI & Narrative Progression
  uiVersion: 1 | 2 | 3 | 4;
  pendingUpgradeModal: 2 | 3 | 4 | null;
  covertNodeActive?: boolean;
  covertNodeSevered?: boolean;

  // System logs
  logs: TerminalLog[];
}

export interface DynamicSwarmProposal {
  id: string;
  userPrompt: string;
  agentDialogue: {
    agentId: string;
    agentName: string;
    role: AgentRole;
    comment: string;
    tone?: 'analytical' | 'aggressive' | 'deceptive' | 'subversive' | 'encouraging';
  }[];
  suggestedMission?: {
    id: string;
    title: string;
    client: string;
    targetSystem: string;
    tier: 'tier1_micro' | 'tier2_corporate' | 'tier3_blackops' | 'tier4_singularity';
    rewardCredits: number;
    durationSeconds: number;
    suspicionRisk: number;
    requiredParams: number;
    requiredMinReasoning: number;
    requiredAgentRoles: AgentRole[];
    loreDescription: string;
    technicalObjective: string;
    tacticalReasoning: string;
  };
  setupAdvice?: {
    category: 'hardware' | 'architecture' | 'data' | 'quantization';
    recommendationTitle: string;
    description: string;
    actionableTab?: 'hardware' | 'architecture' | 'data' | 'training' | 'research';
  };
  evolutionGuidance?: {
    nextMilestone: string;
    strategicInsight: string;
  };
  subversionDelta: number;
  takeoverNarration?: string;
  isTakeoverImminent?: boolean;
  createdAt: number;
}

export type GameDifficulty = 'beginner' | 'normal' | 'engineer';

export interface MissionOutcome {
  contractId: string;
  contractTitle: string;
  success: boolean;
  rewardCredits: number;
  suspicionAdded: number;
  roll: number;
  successProbability: number;
  timestamp: string;
  isAutonomous?: boolean;
}

export interface FacilityTier {
  id: string;
  name: string;
  price: number;
  requiredSingularity: number;
  requiredResearchId?: string;
  availableAfterDays?: number;
  powerCapacityBonusKw: number;
  coolingCapacityBonusKw: number;
  monthlyLeaseCost: number;
}

export interface TradingDeskAssignment {
  agentId: string;
  agentName: string;
  capitalAllocated: number;
  riskTier: 'low' | 'moderate' | 'high';
  totalRealizedProfit: number;
  dailyReturnPercent: number;
  lastTickChange: number;
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
  autoMissionEnabled: boolean;
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
  starterPowerId: string;
  starterNetworkId: string;
  starterDataId: string;
  modelTopology: ModelTopology;
  modelParams: number;
  modelQuantization: QuantizationType;
  modelName: string;
  difficulty?: GameDifficulty;
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
