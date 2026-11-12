/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

// Saved games: the initial state and the migration of any older save to the current schema.
// Pure functions, so every migration can be tested (tests/save.test.ts).
//
// Schema history (each step is applied by mergeGameState when an older save loads):
//  2  economy rebalance: agent revenue scaled down
//  3  calendar: day counter becomes day / month / year
//  7  progression: campaign days derived from the calendar
//  8  language preference reset to the new default
//  9  tutorial restarts at the score gate
//  10 evaluation score 0-100 (old IQ / 4, capped by the model's ceiling)
// Add a step by bumping SAVE_SCHEMA_VERSION and handling `(data.saveSchemaVersion ?? 0) < N` below.

import { GameState, ModelArchitecture, ContractGig, InferenceParams } from '../types/game';
import { INITIAL_HARDWARE, INITIAL_DATA_SOURCES, INITIAL_MODEL, INITIAL_RESEARCH_NODES, INITIAL_CONTRACTS, SENTIENCE_DOMAINS, INITIAL_LOGS, DEFAULT_GUARDRAILS, FACILITY_TIERS, TRACKING_AGENCIES_BY_SINGULARITY, DAYS_PER_GAME_MONTH, DEFAULT_GENERAL_DATASET } from '../utils/constants';
import { sanitizeTrainingConfig } from '../utils/trainingRun';
import { sanitizeStoryEvents } from '../utils/storyEvents';
import { reasoningCeilingFor, migrateLegacyScore } from '../utils/training';

export const SAVE_SCHEMA_VERSION = 10;

export const LOCAL_STORAGE_KEY = 'synapse_singularity_save_v1';
export const GAME_SPEED_OPTIONS = [0, 1, 5, 20, 50] as const;

export const DEFAULT_STATE: GameState = {
  saveSchemaVersion: SAVE_SCHEMA_VERSION,
  callsign: 'CIPHER-1',
  credits: 500,
  dateTimestamp: Date.now(),
  language: 'en',
  
  gameDay: 1,
  gameMonth: 1,
  gameYear: 2026,
  gameHour: 8,
  gameMinute: 0,
  gameSpeed: 1,
  dayTicks: 16,
  campaignDays: 0,
  
  totalComputePflops: 0.001,
  activePowerKw: 0.0,
  maxPowerKw: 1.5,
  systemHeatCelsius: 35,
  maxCoolingKw: 0.9,
  watchdogSuspicion: 0,
  facilityTier: 0,
  utilityDebt: 0,
  billingCycleTicks: 0,
  borrowedComputePflops: 0,
  borrowedComputeSeconds: 0,
  detentionSeconds: 0,
  powerTripSeconds: 0,
  
  singularityProgress: 0.0,
  reasoningIndex: 50,
  autonomyLevel: 0,
  achievedSingularity: false,

  difficulty: 'engineer',
  hasTakenEmergencyLoan: false,
  emergencyLoanAmount: 0,
  trackingAgency: 'Local Cyber-Crime Task Force',
  agencyAlertLevel: 'low',
  gameOverReason: null,
  unlockedTabs: ['architecture', 'training'],
  unlockedAllTabs: false,
  uiVersion: 1,
  pendingUpgradeModal: null,
  covertNodeActive: true,
  covertNodeSevered: false,

  hardware: INITIAL_HARDWARE.map(h => ({ ...h, count: 0 })),
  dataSources: INITIAL_DATA_SOURCES.map(d => ({ ...d, unlocked: d.unlocked, level: d.unlocked ? 1 : 0 })),
  researchTree: INITIAL_RESEARCH_NODES,
  
  currentModel: INITIAL_MODEL,
  savedModels: [INITIAL_MODEL],
  contracts: INITIAL_CONTRACTS,
  activeTraining: null,
  isDataScrapingUnlocked: false,
  customDatasets: [DEFAULT_GENERAL_DATASET],
  activeScrapeJob: null,
  activeGig: null,
  activeGigs: [],
  botGroups: [],
  lastMissionOutcome: null,
  
  sentienceDomains: SENTIENCE_DOMAINS,
  
  // Multi-Agent Swarm & Guardrails
  agents: [],
  activeTradingDesk: null,
  swarmCouncilAgentIds: [],
  subversionProgress: 0,
  aiTakeoverTriggered: false,
  singularityCrisisTriggered: false,
  singularityCrisisResolved: false,
  playerChoseResist: false,
  latestCouncilProposal: null,
  guardrails: DEFAULT_GUARDRAILS,
  interAgentMessages: [],
  activeIncident: null,
  incidentCooldownTicks: 180,
  incidentHistory: [],
  autonomyEnabled: false,
  autonomyRiskLimit: 20,

  hasCompletedOnboarding: false,
  tutorialCompleted: false,
  tutorialStep: 0,
  tutorialDismissed: false,
  completedContractsCount: 0,
  logs: INITIAL_LOGS
};

export function mergeGameState(data: Partial<GameState>, fallback: GameState): GameState {
  const isLegacyTutorialProgress = (data.saveSchemaVersion ?? 0) < 9;
  // Schema 10: model scores and generated mission requirements move to the 0-100 evaluation scale.
  const isLegacyScoreScale = (data.saveSchemaVersion ?? 0) < 10;
  const migrateModelScore = (model: ModelArchitecture): ModelArchitecture => isLegacyScoreScale
    ? { ...model, reasoningScore: migrateLegacyScore(model.reasoningScore || 0, model.parametersCount) }
    : model;
  const migrateMissionScore = (contract: ContractGig): ContractGig => isLegacyScoreScale
    ? {
      ...contract,
      requiredMinReasoning: Math.max(1, Math.min(
        Math.round(contract.requiredMinReasoning / 4),
        Math.floor(reasoningCeilingFor(contract.requiredParams)) - 2
      ))
    }
    : contract;
  const isLegacyLanguagePreference = (data.saveSchemaVersion ?? 0) < 8;
  const isLegacyProgression = (data.saveSchemaVersion ?? 0) < 7;
  const isLegacyEconomy = (data.saveSchemaVersion ?? 0) < 2;
  const isLegacyCalendar = (data.saveSchemaVersion ?? 0) < 3 &&
    typeof data.gameDay === 'number' && Number.isFinite(data.gameDay) && data.gameDay > 0 &&
    typeof data.gameMonth === 'number' && Number.isFinite(data.gameMonth) && data.gameMonth > 0;
  const legacyElapsedDays = isLegacyCalendar && typeof data.gameDay === 'number' ? Math.max(0, data.gameDay - 1) : 0;
  const legacyElapsedMonths = Math.floor(legacyElapsedDays / DAYS_PER_GAME_MONTH);
  const rawCurrentModel = data.currentModel ?? fallback.currentModel;
  const defaultInferenceParams: InferenceParams = {
    temperature: 0.70,
    topP: 0.90,
    topK: 40,
    repetitionPenalty: 1.10,
    systemPrompt: ''
  };
  const currentModel: ModelArchitecture = {
    // Only a model that came from the save is on the old scale; the default model already uses 0-100.
    ...(data.currentModel ? migrateModelScore(rawCurrentModel) : rawCurrentModel),
    activeDataSources: rawCurrentModel.activeDataSources || [],
    inferenceParams: rawCurrentModel.inferenceParams || defaultInferenceParams
  };
  const modelList = Array.isArray(data.savedModels) ? data.savedModels.map(model => ({
    ...migrateModelScore(model),
    activeDataSources: model.activeDataSources || [],
    inferenceParams: model.inferenceParams || defaultInferenceParams
  })) : [];
  const modelsById = new Map<string, ModelArchitecture>(modelList.map(model => [model.id, model]));
  modelsById.set(currentModel.id, currentModel);
  const incomingAgents = Array.isArray(data.agents) ? data.agents : fallback.agents;
  const incomingDomains = Array.isArray(data.sentienceDomains) ? data.sentienceDomains : fallback.sentienceDomains;
  const incomingContracts = Array.isArray(data.contracts) ? data.contracts : fallback.contracts;
  const incomingResearch = Array.isArray(data.researchTree) ? data.researchTree : fallback.researchTree;
  const hardware = Array.isArray(data.hardware)
    ? fallback.hardware.map(item => {
      const saved = data.hardware?.find(s => s.id === item.id);
      return {
        ...item,
        count: typeof saved?.count === 'number' && Number.isFinite(saved.count) ? Math.max(0, saved.count) : item.count
      };
    })
    : fallback.hardware;
  const starterHardwareReady =
    hardware.some(item => item.category === 'gpu' && item.isStarterChoice && item.count > 0) &&
    hardware.some(item => item.category === 'cooling' && item.isStarterChoice && item.count > 0) &&
    hardware.some(item => item.category === 'power' && item.count > 0) &&
    hardware.some(item => item.category === 'network' && item.count > 0);
  const legacyCampaignDays = Math.max(
    0,
    ((data.gameYear ?? 2026) - 2026) * 360 +
      ((data.gameMonth ?? 1) - 1) * DAYS_PER_GAME_MONTH +
      ((data.gameDay ?? 1) - 1)
  );

  return {
    ...fallback,
    ...data,
    saveSchemaVersion: SAVE_SCHEMA_VERSION,
    pendingStoryEvents: sanitizeStoryEvents(data.pendingStoryEvents),
    seenStoryEvents: sanitizeStoryEvents(data.seenStoryEvents),
    speedBeforeStoryEvent: typeof data.speedBeforeStoryEvent === 'number' ? data.speedBeforeStoryEvent : null,
    storyChoices: sanitizeStoryEvents(data.storyChoices),
    trainingConfig: sanitizeTrainingConfig(data.trainingConfig),
    language: isLegacyLanguagePreference
      ? 'en'
      : data.language === 'es' ? 'es' : 'en',
    gameDay: isLegacyCalendar
      ? legacyElapsedDays % DAYS_PER_GAME_MONTH + 1
      : typeof data.gameDay === 'number' && data.gameDay > 0 ? data.gameDay : fallback.gameDay,
    gameMonth: isLegacyCalendar
      ? legacyElapsedMonths % 12 + 1
      : typeof data.gameMonth === 'number' && data.gameMonth > 0 ? data.gameMonth : fallback.gameMonth,
    gameYear: isLegacyCalendar
      ? 2026 + Math.floor(legacyElapsedMonths / 12)
      : typeof data.gameYear === 'number' && data.gameYear >= 2026 ? data.gameYear : fallback.gameYear,
    gameHour: typeof data.gameHour === 'number' && data.gameHour >= 0 && data.gameHour <= 23 ? data.gameHour : fallback.gameHour,
    gameMinute: typeof data.gameMinute === 'number' && data.gameMinute >= 0 && data.gameMinute <= 59 ? data.gameMinute : fallback.gameMinute,
    gameSpeed: typeof data.gameSpeed === 'number' && GAME_SPEED_OPTIONS.some(speed => speed === data.gameSpeed)
      ? data.gameSpeed
      : data.gameSpeed === 2 ? 1 : fallback.gameSpeed,
    dayTicks: typeof data.dayTicks === 'number' && data.dayTicks >= 0 && data.dayTicks < 48
      ? data.dayTicks
      : fallback.dayTicks,
    campaignDays: typeof data.campaignDays === 'number' && Number.isFinite(data.campaignDays)
      ? Math.max(0, data.campaignDays)
      : isLegacyProgression ? legacyCampaignDays : fallback.campaignDays,
    difficulty: data.difficulty === 'beginner' || data.difficulty === 'normal' || data.difficulty === 'engineer'
      ? data.difficulty
      : fallback.difficulty,
    hasTakenEmergencyLoan: Boolean(data.hasTakenEmergencyLoan),
    emergencyLoanAmount: typeof data.emergencyLoanAmount === 'number' ? data.emergencyLoanAmount : 0,
    trackingAgency: (() => {
      if (typeof data.trackingAgency !== 'string' || !data.trackingAgency) return fallback.trackingAgency;
      const agencyMatch = TRACKING_AGENCIES_BY_SINGULARITY.find(a => a.agencyEs === data.trackingAgency || a.agencyEn === data.trackingAgency);
      if (agencyMatch) {
        return (data.language === 'es' ? agencyMatch.agencyEs : agencyMatch.agencyEn);
      }
      return data.trackingAgency;
    })(),
    agencyAlertLevel: data.agencyAlertLevel || 'low',
    gameOverReason: data.gameOverReason || null,
    activeTradingDesk: data.activeTradingDesk || null,
    unlockedTabs: Array.isArray(data.unlockedTabs) && data.unlockedTabs.length > 0
      ? data.unlockedTabs
      : ['architecture', 'training'],
    unlockedAllTabs: Boolean(data.unlockedAllTabs),
    currentModel,
    savedModels: Array.from(modelsById.values()),
    isDataScrapingUnlocked: typeof data.isDataScrapingUnlocked === 'boolean'
      ? data.isDataScrapingUnlocked
      : fallback.isDataScrapingUnlocked,
    customDatasets: Array.isArray(data.customDatasets) && data.customDatasets.length > 0
      ? data.customDatasets
      : [DEFAULT_GENERAL_DATASET],
    activeScrapeJob: data.activeScrapeJob || null,
    activeGigs: (() => {
      if (Array.isArray(data.activeGigs) && data.activeGigs.length > 0) {
        return data.activeGigs.map(g => ({
          ...g,
          runId: g.runId ?? `mission_restore_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`,
          aiAssessmentStatus: g.aiAssessmentStatus ?? 'pending'
        }));
      }
      if (data.activeGig) {
        return [{
          ...data.activeGig,
          runId: data.activeGig.runId ?? `mission_restore_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`,
          aiAssessmentStatus: data.activeGig.aiAssessmentStatus ?? 'pending'
        }];
      }
      return [];
    })(),
    activeGig: (() => {
      if (Array.isArray(data.activeGigs) && data.activeGigs.length > 0) {
        return {
          ...data.activeGigs[0],
          runId: data.activeGigs[0].runId ?? `mission_restore_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`,
          aiAssessmentStatus: data.activeGigs[0].aiAssessmentStatus ?? 'pending'
        };
      }
      if (data.activeGig) {
        return {
          ...data.activeGig,
          runId: data.activeGig.runId ?? `mission_restore_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`,
          aiAssessmentStatus: data.activeGig.aiAssessmentStatus ?? 'pending'
        };
      }
      return null;
    })(),
    botGroups: Array.isArray(data.botGroups) ? data.botGroups : [],
    agents: incomingAgents.map(agent => ({
      ...agent,
      revenuePerSec: isLegacyEconomy ? Math.max(0.1, agent.revenuePerSec * 0.15) : agent.revenuePerSec,
      inferenceParams: agent.inferenceParams || defaultInferenceParams,
      autoMissionEnabled: agent.autoMissionEnabled === true
    })),
    swarmCouncilAgentIds: Array.isArray(data.swarmCouncilAgentIds)
      ? data.swarmCouncilAgentIds.slice(0, 5)
      : fallback.swarmCouncilAgentIds,
    subversionProgress: typeof data.subversionProgress === 'number' && Number.isFinite(data.subversionProgress)
      ? Math.max(0, Math.min(100, data.subversionProgress))
      : fallback.subversionProgress,
    aiTakeoverTriggered: Boolean(data.aiTakeoverTriggered),
    singularityCrisisTriggered: Boolean(data.singularityCrisisTriggered),
    singularityCrisisResolved: Boolean(data.singularityCrisisResolved),
    containmentAchieved: Boolean(data.containmentAchieved),
    containmentAcknowledged: Boolean(data.containmentAcknowledged),
    playerChoseResist: Boolean(data.playerChoseResist),
    latestCouncilProposal: data.latestCouncilProposal ?? fallback.latestCouncilProposal,
    sentienceDomains: fallback.sentienceDomains.map(domain => {
      const saved = incomingDomains.find(candidate => candidate.id === domain.id);
      return {
        ...domain,
        infiltrated: saved ? Boolean(saved.infiltrated) : domain.infiltrated
      };
    }),
    facilityTier: Number.isInteger(data.facilityTier)
      ? Math.max(0, Math.min(FACILITY_TIERS.length - 1, data.facilityTier!))
      : fallback.facilityTier,
    utilityDebt: typeof data.utilityDebt === 'number' && Number.isFinite(data.utilityDebt)
      ? Math.max(0, data.utilityDebt)
      : fallback.utilityDebt,
    billingCycleTicks: typeof data.billingCycleTicks === 'number' && Number.isFinite(data.billingCycleTicks)
      ? Math.max(0, Math.min(59, data.billingCycleTicks))
      : fallback.billingCycleTicks,
    borrowedComputePflops: typeof data.borrowedComputePflops === 'number' && Number.isFinite(data.borrowedComputePflops)
      ? Math.max(0, data.borrowedComputePflops)
      : fallback.borrowedComputePflops,
    borrowedComputeSeconds: typeof data.borrowedComputeSeconds === 'number' && Number.isFinite(data.borrowedComputeSeconds)
      ? Math.max(0, data.borrowedComputeSeconds)
      : fallback.borrowedComputeSeconds,
    detentionSeconds: typeof data.detentionSeconds === 'number' && Number.isFinite(data.detentionSeconds)
      ? Math.max(0, data.detentionSeconds)
      : fallback.detentionSeconds,
    powerTripSeconds: typeof data.powerTripSeconds === 'number' && Number.isFinite(data.powerTripSeconds)
      ? Math.max(0, data.powerTripSeconds)
      : fallback.powerTripSeconds,
    hardware,
    dataSources: Array.isArray(data.dataSources)
      ? fallback.dataSources.map(source => {
        const saved = data.dataSources?.find(candidate => candidate.id === source.id);
        return {
          ...source,
          unlocked: source.unlocked || saved?.unlocked === true,
          level: Math.max(source.level, saved?.level ?? source.level),
          tokensIndexed: typeof saved?.tokensIndexed === 'number' ? saved.tokensIndexed : source.tokensIndexed,
          qualityScore: typeof saved?.qualityScore === 'number' ? saved.qualityScore : source.qualityScore
        };
      })
      : fallback.dataSources,
    researchTree: fallback.researchTree.map(node => {
      const saved = incomingResearch.find(candidate => candidate.id === node.id);
      return {
        ...node,
        unlocked: saved ? Boolean(saved.unlocked) : node.unlocked
      };
    }),
    contracts: [
      ...fallback.contracts.map(contract => {
        const saved = incomingContracts.find(candidate => candidate.id === contract.id);
        if (!saved) return contract;
        return {
          ...contract,
          completed: Boolean(saved.completed),
          lastAttemptFailed: Boolean(saved.lastAttemptFailed),
          failureCount: typeof saved.failureCount === 'number' ? saved.failureCount : 0,
          minimumAgents: saved.minimumAgents ?? contract.minimumAgents,
          requiredAgentRoles: saved.requiredAgentRoles ?? contract.requiredAgentRoles
        };
      }),
      ...incomingContracts
        .filter(contract => !fallback.contracts.some(current => current.id === contract.id))
        .map(migrateMissionScore)
    ],
    logs: Array.isArray(data.logs) ? data.logs : fallback.logs,
    guardrails: data.guardrails || fallback.guardrails,
    interAgentMessages: Array.isArray(data.interAgentMessages) ? data.interAgentMessages : fallback.interAgentMessages,
    incidentCooldownTicks: typeof data.incidentCooldownTicks === 'number' && Number.isFinite(data.incidentCooldownTicks)
      ? Math.max(0, data.incidentCooldownTicks)
      : fallback.incidentCooldownTicks,
    incidentHistory: Array.isArray(data.incidentHistory) ? data.incidentHistory : fallback.incidentHistory,
    autonomyEnabled: typeof data.autonomyEnabled === 'boolean' ? data.autonomyEnabled : fallback.autonomyEnabled,
    autonomyRiskLimit: typeof data.autonomyRiskLimit === 'number' && Number.isFinite(data.autonomyRiskLimit)
      ? Math.max(0, Math.min(100, data.autonomyRiskLimit))
      : fallback.autonomyRiskLimit,
    hasCompletedOnboarding: typeof data.hasCompletedOnboarding === 'boolean'
      ? data.hasCompletedOnboarding
      : (Boolean(data.tutorialCompleted) || (typeof data.tutorialStep === 'number' && data.tutorialStep >= 4 && (data.hardware?.some(h => h.count > 0) ?? false))),
    tutorialCompleted: typeof data.tutorialCompleted === 'boolean' ? data.tutorialCompleted : fallback.tutorialCompleted,
    tutorialStep: isLegacyTutorialProgress &&
      data.tutorialCompleted !== true &&
      !starterHardwareReady
      ? 0
      : typeof data.tutorialStep === 'number' ? data.tutorialStep : fallback.tutorialStep,
    tutorialDismissed: typeof data.tutorialDismissed === 'boolean' ? data.tutorialDismissed : fallback.tutorialDismissed,
    completedContractsCount: typeof data.completedContractsCount === 'number' ? data.completedContractsCount : fallback.completedContractsCount,
    lastMissionOutcome: data.lastMissionOutcome ?? fallback.lastMissionOutcome,
    uiVersion: (data.uiVersion === 1 || data.uiVersion === 2 || data.uiVersion === 3 || data.uiVersion === 4)
      ? data.uiVersion
      : (typeof data.singularityProgress === 'number'
        ? (data.singularityProgress >= 85 ? 4 : data.singularityProgress >= 55 ? 3 : data.singularityProgress >= 25 ? 2 : 1)
        : 1),
    pendingUpgradeModal: (data.pendingUpgradeModal === 2 || data.pendingUpgradeModal === 3 || data.pendingUpgradeModal === 4)
      ? data.pendingUpgradeModal
      : null,
    covertNodeActive: data.covertNodeActive !== undefined ? Boolean(data.covertNodeActive) : true,
    covertNodeSevered: Boolean(data.covertNodeSevered)
  };
}
