/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { createContext, useContext, useState, useEffect, useRef, useCallback } from 'react';
import { 
  GameState, 
  HardwareItem, 
  ModelArchitecture, 
  ResearchNode, 
  ContractGig, 
  TrainingJob, 
  TerminalLog,
  OperativeLeaderboard,
  OnboardingConfig,
  AgentInstance,
  AgentRole,
  GuardrailConfig,
  BreachIncident,
  InterAgentMessage,
  InferenceParams
} from '../types/game';
import { 
  INITIAL_HARDWARE, 
  INITIAL_DATA_SOURCES, 
  INITIAL_MODEL, 
  INITIAL_RESEARCH_NODES, 
  INITIAL_CONTRACTS, 
  SENTIENCE_DOMAINS, 
  INITIAL_LOGS,
  DEFAULT_GUARDRAILS,
  REAL_WORLD_BREACH_TEMPLATES,
  AGENT_DIALOGUES,
  AGENT_DIALOGUES_EN,
  COVERT_MESSAGES,
  COVERT_MESSAGES_EN,
  FACILITY_TIERS,
  ELECTRICITY_RATE_PER_KWH,
  AGENT_COMPUTE_DEMAND_PFLOPS,
  AGENT_POWER_DRAW_KW,
  DAYS_PER_GAME_MONTH
} from '../utils/constants';
import { isProgressionUnlocked, getModelOptionRequirement } from '../utils/progression';
import { sound } from '../audio/soundManager';
import { 
  auth, 
  db, 
  googleProvider, 
  handleFirestoreError, 
  OperationType,
  testConnection 
} from '../firebase';
import { 
  signInWithPopup, 
  signOut as fbSignOut, 
  onAuthStateChanged, 
  User 
} from 'firebase/auth';
import { 
  doc, 
  getDoc, 
  setDoc, 
  collection, 
  getDocs, 
  query, 
  orderBy, 
  limit 
} from 'firebase/firestore';
import confetti from 'canvas-confetti';
import { evaluateMissionTeamWithModel, generateAgentResponse } from '../services/aiService';
import { localize } from '../utils/i18n';
import { localizedContractTitle, localizedDataSource, localizedHardware } from '../utils/gameContentI18n';
import { calculateTrainingProgressPerTick, estimateTrainingSeconds } from '../utils/training';
import { evaluateMissionTeam, findAutonomousMission } from '../utils/missionEvaluation';

interface GameContextType {
  state: GameState;
  user: User | null;
  isSaving: boolean;
  cloudSyncStatus: 'synced' | 'local_only' | 'syncing' | 'error';
  soundMuted: boolean;
  toggleSound: () => void;
  setLanguage: (lang: 'es' | 'en') => void;
  setCallsign: (callsign: string) => void;
  createModel: (name: string) => boolean;
  selectModel: (modelId: string) => boolean;
  renameModel: (modelId: string, name: string) => boolean;
  
  // Actions
  buyHardware: (id: string) => boolean;
  unlockDataSource: (id: string) => boolean;
  upgradeDataSource: (id: string) => boolean;
  unlockResearch: (id: string) => boolean;
  updateModelArchitecture: (updates: Partial<ModelArchitecture>) => void;
  startTraining: () => boolean;
  cancelTraining: () => void;
  acceptContract: (contractId: string, agentIds?: string[]) => boolean;
  infiltrateDomain: (domainId: string) => boolean;
  scrubSuspicion: () => boolean;
  addLog: (message: string, type?: TerminalLog['type']) => void;
  executeTerminalCommand: (input: string) => string;
  saveGameToCloud: () => Promise<boolean>;
  loadGameFromCloud: () => Promise<boolean>;
  loginWithGoogle: () => Promise<void>;
  logoutUser: () => Promise<void>;
  resetProgress: () => Promise<void>;
  completeTutorial: (config: OnboardingConfig) => void;
  fetchLeaderboard: () => Promise<OperativeLeaderboard[]>;
  createAgent: (name: string, role: AgentRole, modelId: string, tools: string[], inferenceParams?: Partial<InferenceParams>) => boolean;
  deleteAgent: (agentId: string) => void;
  quarantineAgent: (agentId: string) => void;
  updateGuardrails: (updates: Partial<GuardrailConfig>) => void;
  resolveIncident: (optionId: string) => void;
  triggerRedTeamAudit: () => void;
  upgradeFacility: () => boolean;
  interrogateSwarm: (prompt: string, agentId?: string, apiKey?: string) => Promise<void>;
  missionAiApiKey: string;
  setMissionAiApiKey: (apiKey: string) => void;
  setAgentAutoMission: (agentId: string, enabled: boolean) => void;
  setAllAgentsAutoMission: (enabled: boolean) => void;
  updateAutonomySettings: (updates: Partial<Pick<GameState, 'autonomyEnabled' | 'autonomyRiskLimit'>>) => void;
  attemptShadowCompute: () => boolean;
  setGameSpeed: (speed: number) => void;
  advanceTutorialStep: (step?: number) => void;
  dismissTutorial: () => void;
  addContracts: (newContracts: ContractGig[]) => void;
}

const LOCAL_STORAGE_KEY = 'synapse_singularity_save_v1';
const GAME_SPEED_OPTIONS = [0, 1, 5, 20, 50] as const;

const DEFAULT_STATE: GameState = {
  saveSchemaVersion: 9,
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
  
  hardware: INITIAL_HARDWARE.map(h => ({ ...h, count: 0 })),
  dataSources: INITIAL_DATA_SOURCES.map(d => ({ ...d, unlocked: d.unlocked, level: d.unlocked ? 1 : 0 })),
  researchTree: INITIAL_RESEARCH_NODES,
  
  currentModel: INITIAL_MODEL,
  savedModels: [INITIAL_MODEL],
  contracts: INITIAL_CONTRACTS,
  activeTraining: null,
  activeGig: null,
  
  sentienceDomains: SENTIENCE_DOMAINS,
  
  // Multi-Agent Swarm & Guardrails
  agents: [],
  guardrails: DEFAULT_GUARDRAILS,
  interAgentMessages: [],
  activeIncident: null,
  incidentHistory: [],
  autonomyEnabled: false,
  autonomyRiskLimit: 20,

  tutorialCompleted: false,
  tutorialStep: 0,
  tutorialDismissed: false,
  completedContractsCount: 0,
  logs: INITIAL_LOGS
};

function mergeGameState(data: Partial<GameState>, fallback: GameState): GameState {
  const isLegacyTutorialProgress = (data.saveSchemaVersion ?? 0) < 9;
  const isLegacyLanguagePreference = (data.saveSchemaVersion ?? 0) < 8;
  const isLegacyProgression = (data.saveSchemaVersion ?? 0) < 7;
  const isLegacyEconomy = (data.saveSchemaVersion ?? 0) < 2;
  const isLegacyCalendar = (data.saveSchemaVersion ?? 0) < 3 &&
    typeof data.gameDay === 'number' && Number.isFinite(data.gameDay) && data.gameDay > 0 &&
    typeof data.gameMonth === 'number' && Number.isFinite(data.gameMonth) && data.gameMonth > 0;
  const legacyElapsedDays = isLegacyCalendar ? Math.max(0, data.gameDay - 1) : 0;
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
    ...rawCurrentModel,
    activeDataSources: rawCurrentModel.activeDataSources || [],
    inferenceParams: rawCurrentModel.inferenceParams || defaultInferenceParams
  };
  const modelList = Array.isArray(data.savedModels) ? data.savedModels.map(model => ({
    ...model,
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
    ? fallback.hardware.map(item => ({
      ...item,
      ...data.hardware?.find(saved => saved.id === item.id)
    }))
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
    saveSchemaVersion: 9,
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
    currentModel,
    savedModels: Array.from(modelsById.values()),
    activeGig: data.activeGig
      ? {
        ...data.activeGig,
        runId: data.activeGig.runId ?? `mission_restore_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`,
        aiAssessmentStatus: data.activeGig.aiAssessmentStatus ?? 'pending'
      }
      : null,
    agents: incomingAgents.map(agent => ({
      ...agent,
      revenuePerSec: isLegacyEconomy ? Math.max(0.1, agent.revenuePerSec * 0.15) : agent.revenuePerSec,
      inferenceParams: agent.inferenceParams || defaultInferenceParams,
      autoMissionEnabled: agent.autoMissionEnabled === true
    })),
    sentienceDomains: incomingDomains.map(domain => {
      const currentDomain = SENTIENCE_DOMAINS.find(candidate => candidate.id === domain.id);
      return isLegacyEconomy && currentDomain
        ? { ...domain, payoutPerSec: currentDomain.payoutPerSec }
        : domain;
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
          ...saved,
          unlocked: source.unlocked || saved?.unlocked === true,
          level: Math.max(source.level, saved?.level ?? source.level)
        };
      })
      : fallback.dataSources,
    researchTree: [
      ...fallback.researchTree.map(node => {
        const saved = incomingResearch.find(candidate => candidate.id === node.id);
        return saved ? { ...node, ...saved } : node;
      }),
      ...incomingResearch.filter(node => !fallback.researchTree.some(current => current.id === node.id))
    ],
    contracts: incomingContracts.map(contract => {
      const currentContract = fallback.contracts.find(candidate => candidate.id === contract.id);
      return currentContract
        ? {
          ...currentContract,
          ...contract,
          minimumAgents: contract.minimumAgents ?? currentContract.minimumAgents,
          requiredAgentRoles: contract.requiredAgentRoles ?? currentContract.requiredAgentRoles
        }
        : contract;
    }),
    logs: Array.isArray(data.logs) ? data.logs : fallback.logs,
    guardrails: data.guardrails || fallback.guardrails,
    interAgentMessages: Array.isArray(data.interAgentMessages) ? data.interAgentMessages : fallback.interAgentMessages,
    incidentHistory: Array.isArray(data.incidentHistory) ? data.incidentHistory : fallback.incidentHistory,
    autonomyEnabled: typeof data.autonomyEnabled === 'boolean' ? data.autonomyEnabled : fallback.autonomyEnabled,
    autonomyRiskLimit: typeof data.autonomyRiskLimit === 'number' && Number.isFinite(data.autonomyRiskLimit)
      ? Math.max(0, Math.min(100, data.autonomyRiskLimit))
      : fallback.autonomyRiskLimit,
    tutorialCompleted: typeof data.tutorialCompleted === 'boolean' ? data.tutorialCompleted : fallback.tutorialCompleted,
    tutorialStep: isLegacyTutorialProgress &&
      data.tutorialCompleted !== true &&
      !starterHardwareReady
      ? 0
      : typeof data.tutorialStep === 'number' ? data.tutorialStep : fallback.tutorialStep,
    tutorialDismissed: typeof data.tutorialDismissed === 'boolean' ? data.tutorialDismissed : fallback.tutorialDismissed,
    completedContractsCount: typeof data.completedContractsCount === 'number' ? data.completedContractsCount : fallback.completedContractsCount
  };
}

const GameContext = createContext<GameContextType | null>(null);

export const GameProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [state, setState] = useState<GameState>(() => {
    try {
      const saved = localStorage.getItem(LOCAL_STORAGE_KEY);
      if (saved) {
        const parsed = JSON.parse(saved) as Partial<GameState>;
        return mergeGameState(parsed, DEFAULT_STATE);
      }
    } catch (error) {
      console.warn('Local save could not be loaded; starting from defaults.', error);
    }
    return DEFAULT_STATE;
  });

  const [user, setUser] = useState<User | null>(null);
  const [isSaving, setIsSaving] = useState<boolean>(false);
  const [cloudSyncStatus, setCloudSyncStatus] = useState<'synced' | 'local_only' | 'syncing' | 'error'>('local_only');
  const [soundMuted, setSoundMuted] = useState<boolean>(sound.getMuted());
  const [missionAiApiKey, setMissionAiApiKey] = useState('');
  const stateRef = useRef(state);
  stateRef.current = state;
  const assessedMissionRef = useRef<string | null>(null);
  const localSaveTimerRef = useRef<number | null>(null);
  const lastLocalSaveAtRef = useRef(0);

  const addLog = useCallback((message: string, type: TerminalLog['type'] = 'info') => {
    const newLog: TerminalLog = {
      id: `log_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`,
      timestamp: new Date().toLocaleTimeString('en-US', { hour12: false }),
      type,
      message
    };
    setState(prev => ({
      ...prev,
      logs: [newLog, ...prev.logs.slice(0, 75)]
    }));
  }, []);

  // Toggle sound
  const toggleSound = useCallback(() => {
    const isMuted = sound.toggleMute();
    setSoundMuted(isMuted);
  }, []);

  // Set language
  const setLanguage = useCallback((lang: 'es' | 'en') => {
    sound.playKeyClick();
    setState(prev => {
      const updated = { ...prev, language: lang };
      try {
        localStorage.setItem(LOCAL_STORAGE_KEY, JSON.stringify(updated));
      } catch (e) {
        console.warn('Storage save error', e);
      }
      return updated;
    });
  }, []);

  const setCallsign = useCallback((callsign: string) => {
    const normalized = callsign.trim().toUpperCase().slice(0, 30);
    if (!normalized) return;
    setState(prev => ({ ...prev, callsign: normalized }));
  }, []);

  const setGameSpeed = useCallback((speed: number) => {
    sound.playKeyClick();
    const normalized = GAME_SPEED_OPTIONS.some(option => option === speed) ? speed : 1;
    setState(prev => ({ ...prev, gameSpeed: normalized }));
  }, []);

  const setAgentAutoMission = useCallback((agentId: string, enabled: boolean) => {
    setState(prev => ({
      ...prev,
      agents: prev.agents.map(agent =>
        agent.id === agentId ? { ...agent, autoMissionEnabled: enabled } : agent
      )
    }));
  }, []);

  const setAllAgentsAutoMission = useCallback((enabled: boolean) => {
    setState(prev => ({
      ...prev,
      agents: prev.agents.map(agent => agent.status === 'quarantined'
        ? agent
        : { ...agent, autoMissionEnabled: enabled })
    }));
  }, []);

  const updateAutonomySettings = useCallback((updates: Partial<Pick<GameState, 'autonomyEnabled' | 'autonomyRiskLimit'>>) => {
    setState(prev => ({
      ...prev,
      ...updates,
      autonomyRiskLimit: updates.autonomyRiskLimit === undefined
        ? prev.autonomyRiskLimit
        : Math.max(0, Math.min(100, updates.autonomyRiskLimit))
    }));
  }, []);

  const createModel = useCallback((name: string): boolean => {
    const current = stateRef.current;
    if (current.activeTraining) {
      addLog('Espera a que termine el entrenamiento antes de crear otro modelo.', 'warning');
      return false;
    }
    const normalizedName = name.trim().slice(0, 40);
    const modelName = normalizedName || `SYNAPSE-Model-${current.savedModels.length + 1}`;
    if (current.savedModels.some(model => model.name.toLowerCase() === modelName.toLowerCase())) {
      addLog(`Ya existe un modelo llamado "${modelName}".`, 'warning');
      return false;
    }

    const creationCost = 100;
    if (current.credits < creationCost) {
      sound.playWarning();
      addLog(`Se requieren $${creationCost} CR para iniciar un nuevo modelo.`, 'warning');
      return false;
    }

    const model: ModelArchitecture = {
      ...current.currentModel,
      id: `model_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`,
      name: modelName,
      reasoningScore: 50,
      inferenceParams: current.currentModel.inferenceParams
        ? { ...current.currentModel.inferenceParams }
        : undefined,
      activeDataSources: [...current.currentModel.activeDataSources]
    };

    setState(prev => ({
      ...prev,
      credits: prev.credits - creationCost,
      currentModel: model,
      savedModels: [...prev.savedModels, model]
    }));
    addLog(`Modelo "${modelName}" creado desde la configuración actual. Entrénalo para desarrollar sus capacidades.`, 'success');
    return true;
  }, [addLog]);

  const selectModel = useCallback((modelId: string): boolean => {
    if (stateRef.current.activeTraining) {
      addLog('Espera a que termine el entrenamiento antes de cambiar de modelo.', 'warning');
      return false;
    }
    const model = stateRef.current.savedModels.find(candidate => candidate.id === modelId);
    if (!model) {
      addLog('No se encontró el modelo seleccionado.', 'warning');
      return false;
    }
    setState(prev => ({ ...prev, currentModel: model }));
    return true;
  }, [addLog]);

  const renameModel = useCallback((modelId: string, name: string): boolean => {
    const normalizedName = name.trim().slice(0, 40);
    if (!normalizedName) return false;
    const current = stateRef.current;
    if (current.activeTraining) {
      addLog('No se puede renombrar un modelo mientras está entrenando.', 'warning');
      return false;
    }
    if (current.savedModels.some(model =>
      model.id !== modelId && model.name.toLowerCase() === normalizedName.toLowerCase()
    )) {
      addLog(`Ya existe un modelo llamado "${normalizedName}".`, 'warning');
      return false;
    }
    const found = current.savedModels.some(model => model.id === modelId);
    if (!found) return false;
    setState(prev => {
      const savedModels = prev.savedModels.map(model =>
        model.id === modelId ? { ...model, name: normalizedName } : model
      );
      const renamed = savedModels.find(model => model.id === modelId)!;
      return {
        ...prev,
        savedModels,
        currentModel: prev.currentModel.id === modelId ? renamed : prev.currentModel
      };
    });
    return true;
  }, [addLog]);

  // Auth listener & Connection validation
  useEffect(() => {
    testConnection().catch(() => {});

    const unsubscribe = onAuthStateChanged(auth, async (currentUser) => {
      setUser(currentUser);
      if (currentUser) {
        addLog(`Autenticación verificada: Agente [${currentUser.displayName || currentUser.email}]. Conexión a la red cuántica establecida.`, 'success');
        setCloudSyncStatus('syncing');
        try {
          const userDocRef = doc(db, 'users', currentUser.uid);
          const snap = await getDoc(userDocRef);
          if (snap.exists()) {
            const data = snap.data();
            if (data.gameState) {
              setState(prev => ({
                ...prev,
                ...mergeGameState(data.gameState as Partial<GameState>, prev),
                callsign: data.callsign || prev.callsign
              }));
              addLog(`Progreso descargado desde la nube sincronizado para ${data.callsign}.`, 'info');
              setCloudSyncStatus('synced');
            }
          } else {
            // First time cloud user: save current local progress
            await setDoc(userDocRef, {
              userId: currentUser.uid,
              email: currentUser.email || 'anonymous@synapse.net',
              callsign: stateRef.current.callsign || 'OPERATIVE-7',
              gameState: stateRef.current,
              createdAt: new Date().toISOString(),
              updatedAt: new Date().toISOString()
            });
            setCloudSyncStatus('synced');
          }
        } catch (err) {
          console.error("Cloud fetch error:", err);
          setCloudSyncStatus('error');
        }
      } else {
        setCloudSyncStatus('local_only');
      }
    });

    return () => unsubscribe();
  }, [addLog]);

  // Persist at a bounded interval so frequent simulation ticks cannot starve saves.
  useEffect(() => {
    if (localSaveTimerRef.current !== null) return;
    const elapsed = Date.now() - lastLocalSaveAtRef.current;
    const delay = Math.max(0, 5000 - elapsed);
    localSaveTimerRef.current = window.setTimeout(() => {
      localSaveTimerRef.current = null;
      try {
        localStorage.setItem(LOCAL_STORAGE_KEY, JSON.stringify(stateRef.current));
        lastLocalSaveAtRef.current = Date.now();
      } catch (e) {
        console.warn("Local storage write failed", e);
      }
    }, delay);
  }, [state]);

  useEffect(() => () => {
    if (localSaveTimerRef.current !== null) {
      window.clearTimeout(localSaveTimerRef.current);
    }
  }, []);

  useEffect(() => {
    const activeMission = state.activeGig;
    if (!activeMission) {
      assessedMissionRef.current = null;
      return;
    }
    if (
      activeMission.aiAssessmentStatus !== 'pending' ||
      assessedMissionRef.current === activeMission.runId
    ) return;
    const missionRunId = activeMission.runId;
    if (!missionRunId) return;
    assessedMissionRef.current = missionRunId;

    const mission = state.contracts.find(contract => contract.id === activeMission.contractId);
    const team = state.agents.filter(agent => activeMission.agentIds?.includes(agent.id));
    const teamModels = team
      .map(agent => state.savedModels.find(model => model.id === agent.modelId))
      .filter((model): model is ModelArchitecture => !!model);
    if (!mission || team.length === 0 || teamModels.length !== team.length) {
      addLog('Mission AI assessment unavailable: mission, team, or assigned model is missing. Keeping the local estimate.', 'warning');
      setState(prev => prev.activeGig?.runId === missionRunId
        ? {
          ...prev,
          activeGig: {
            ...prev.activeGig,
            aiAssessmentStatus: 'fallback',
            aiAssessmentSource: 'heuristic'
          }
        }
        : prev);
      return;
    }

    void evaluateMissionTeamWithModel(
      mission,
      team,
      teamModels,
      state.dataSources,
      state.guardrails || DEFAULT_GUARDRAILS,
      state.language,
      missionAiApiKey || undefined
    ).then(assessment => {
      const currentMission = stateRef.current.activeGig;
      if (!currentMission || currentMission.runId !== missionRunId) return;
      const priorDuration = currentMission.durationSeconds ?? currentMission.timeRemaining;
      const elapsedSeconds = Math.max(0, priorDuration - currentMission.timeRemaining);
      const totalDuration = assessment.estimatedDurationSeconds;
      const timeRemaining = Math.max(1, totalDuration - elapsedSeconds);
      const progressPercent = Math.min(99.9, Math.max(
        currentMission.progressPercent ?? 0,
        100 * (1 - timeRemaining / totalDuration)
      ));
      const providerLabel = assessment.provider === 'gemini-flash'
        ? 'Gemini'
        : assessment.provider === 'chrome-nano'
          ? 'Chrome AI'
          : 'local heuristic';
      const messages = Object.entries(assessment.agentTasks).map(([agentId, task], index) => {
        const agent = team.find(candidate => candidate.id === agentId);
        if (!agent) return null;
        const receiver = team[(index + 1) % team.length];
        return {
          id: `mission_ai_${Date.now()}_${index}`,
          fromAgentId: agent.id,
          fromAgentName: agent.name,
          toAgentId: receiver?.id ?? 'operative',
          toAgentName: receiver?.name ?? stateRef.current.callsign,
          content: `[${providerLabel}] ${task}`,
          timestamp: new Date().toLocaleTimeString('en-US', { hour12: false })
        } satisfies InterAgentMessage;
      }).filter((message): message is InterAgentMessage => message !== null);

      setState(prev => {
        if (
          !prev.activeGig ||
          prev.activeGig.runId !== missionRunId ||
          prev.activeGig.aiAssessmentStatus !== 'pending'
        ) return prev;
        return {
          ...prev,
          activeGig: {
            ...prev.activeGig,
            timeRemaining,
            durationSeconds: totalDuration,
            progressPercent,
            efficiencyPercent: assessment.efficiencyPercent,
            successProbability: assessment.successProbability,
            aiAssessmentStatus: assessment.provider === 'heuristic' ? 'fallback' : 'complete',
            aiAssessmentSource: assessment.provider,
            aiAssessmentSummary: assessment.summary,
            agentTasks: assessment.agentTasks
          },
          agents: prev.agents.map(agent => assessment.agentTasks[agent.id]
            ? { ...agent, lastThought: assessment.agentTasks[agent.id].slice(0, 240) }
            : agent),
          interAgentMessages: [...messages, ...prev.interAgentMessages].slice(0, 30)
        };
      });
      addLog(
        assessment.provider === 'heuristic'
          ? `Mission assessment used local heuristics: ${assessment.summary}`
          : `${providerLabel} assessed [${mission.title}]: ${assessment.efficiencyPercent}% efficiency, ${totalDuration}s, ${Math.round(assessment.successProbability * 100)}% success. ${assessment.summary}`,
        assessment.provider === 'heuristic' ? 'warning' : 'info'
      );
    }).catch(error => {
      console.error('Mission AI assessment failed.', error);
      addLog(
        error instanceof Error
          ? `Mission AI assessment failed; retaining local estimates. ${error.message}`
          : 'Mission AI assessment failed; retaining local estimates.',
        'warning'
      );
      setState(prev => prev.activeGig?.runId === missionRunId
        ? {
          ...prev,
          activeGig: {
            ...prev.activeGig,
            aiAssessmentStatus: 'fallback',
            aiAssessmentSource: 'heuristic'
          }
        }
        : prev);
    });
  }, [state.activeGig?.contractId, state.activeGig?.runId, state.activeGig?.aiAssessmentStatus, state.agents, state.contracts, state.dataSources, state.guardrails, state.language, state.savedModels, missionAiApiKey, addLog]);

  // Cloud save function
  const saveGameToCloud = useCallback(async (): Promise<boolean> => {
    if (!user) {
      addLog('No hay sesión de Google activa. Conecta tu cuenta para sincronizar con la nube.', 'warning');
      return false;
    }
    setIsSaving(true);
    setCloudSyncStatus('syncing');
    try {
      const currentState = stateRef.current;
      const userDocRef = doc(db, 'users', user.uid);
      await setDoc(userDocRef, {
        userId: user.uid,
        email: user.email || 'operative@synapse.net',
        callsign: currentState.callsign,
        gameState: currentState,
        updatedAt: new Date().toISOString()
      }, { merge: true });

      // Update public leaderboard entry
      const leadDocRef = doc(db, 'leaderboard', user.uid);
      await setDoc(leadDocRef, {
        userId: user.uid,
        callsign: currentState.callsign,
        computePFLOPS: Number(currentState.totalComputePflops.toFixed(4)),
        singularityProgress: Number(currentState.singularityProgress.toFixed(2)),
        activeArchitecture: `${currentState.currentModel.name} (${currentState.currentModel.topology})`,
        achievedSingularity: currentState.achievedSingularity,
        updatedAt: new Date().toISOString()
      }, { merge: true });

      setCloudSyncStatus('synced');
      setIsSaving(false);
      sound.playCredit();
      addLog('Progreso del agente y telemetría de clúster guardados en la nube con éxito.', 'success');
      return true;
    } catch (err) {
      setIsSaving(false);
      setCloudSyncStatus('error');
      handleFirestoreError(err, OperationType.WRITE, `users/${user.uid}`);
      return false;
    }
  }, [user, addLog]);

  // Cloud load function
  const loadGameFromCloud = useCallback(async (): Promise<boolean> => {
    if (!user) return false;
    try {
      const userDocRef = doc(db, 'users', user.uid);
      const snap = await getDoc(userDocRef);
      if (snap.exists() && snap.data().gameState) {
        const cloudGameState = snap.data().gameState as Partial<GameState>;
        setState(prev => mergeGameState(cloudGameState, prev));
        sound.playCommandExecute();
        addLog('Estado de simulación restaurado desde la base de datos en la nube.', 'success');
        return true;
      }
      return false;
    } catch (err) {
      handleFirestoreError(err, OperationType.GET, `users/${user.uid}`);
      return false;
    }
  }, [user, addLog]);

  // Google Login
  const loginWithGoogle = useCallback(async () => {
    try {
      sound.playNavSwitch();
      await signInWithPopup(auth, googleProvider);
    } catch (err) {
      console.error("Login popup failed:", err);
      addLog('Error al autenticar con Google. Verifica ventanas emergentes en tu navegador.', 'danger');
    }
  }, [addLog]);

  // Logout
  const logoutUser = useCallback(async () => {
    try {
      sound.playNavSwitch();
      await fbSignOut(auth);
      setUser(null);
      setCloudSyncStatus('local_only');
      addLog('Sesión cerrada. Los datos continúan guardados localmente.', 'info');
    } catch (err) {
      console.error("Logout failed:", err);
    }
  }, [addLog]);

  // Fetch Leaderboard
  const fetchLeaderboard = useCallback(async (): Promise<OperativeLeaderboard[]> => {
    try {
      const leadCol = collection(db, 'leaderboard');
      const q = query(leadCol, orderBy('singularityProgress', 'desc'), limit(25));
      const snapshot = await getDocs(q);
      const list: OperativeLeaderboard[] = [];
      snapshot.forEach(docSnap => {
        list.push(docSnap.data() as OperativeLeaderboard);
      });
      return list;
    } catch (err) {
      console.warn("Leaderboard fetch error:", err);
      return [];
    }
  }, []);

  // Recalculate metrics based on hardware & infrastructure
  const recalculateMetrics = useCallback((hw: HardwareItem[], facilityTier = 0) => {
    let totalTflops = 0;
    let powerDraw = 0;
    const facility = FACILITY_TIERS[facilityTier] || FACILITY_TIERS[0];
    let maxPower = 1.5 + facility.powerCapacityBonusKw;
    let maxCooling = 0.8 + facility.coolingCapacityBonusKw;
    let heatRate = 0;

    hw.forEach(item => {
      if (item.category === 'gpu') {
        totalTflops += item.computeTflops * item.count;
        powerDraw += item.powerKw * item.count;
        heatRate += item.heatGen * item.count;
      } else if (item.category === 'cooling') {
        maxCooling += (item.coolingCapacityKw || 0) * item.count;
        powerDraw += item.powerKw * item.count;
      } else if (item.category === 'power') {
        maxPower += (item.powerCapacityKw || 0) * item.count;
      } else if (item.category === 'network') {
        powerDraw += item.powerKw * item.count;
      }
    });

    const totalPflops = totalTflops / 1000;
    return {
      totalComputePflops: Math.max(0.001, totalPflops),
      activePowerKw: Number(powerDraw.toFixed(2)),
      maxPowerKw: Number(maxPower.toFixed(2)),
      maxCoolingKw: Number(maxCooling.toFixed(2)),
      heatRate: Number(heatRate.toFixed(2))
    };
  }, []);

  const upgradeFacility = useCallback((): boolean => {
    const current = stateRef.current;
    const nextTier = current.facilityTier + 1;
    const facility = FACILITY_TIERS[nextTier];
    if (!facility) {
      addLog('La instalación ya alcanzó el nivel máximo.', 'info');
      return false;
    }
    if (current.singularityProgress < facility.requiredSingularity) {
      addLog(`La instalación requiere ${facility.requiredSingularity}% de Singularidad.`, 'warning');
      return false;
    }
    if (!isProgressionUnlocked(facility, current)) {
      addLog(
        `Facility upgrade locked: fund ${facility.requiredResearchId ?? 'the relevant technology'} or reach campaign day ${facility.availableAfterDays ?? 'later'}.`,
        'warning'
      );
      return false;
    }
    if (current.credits < facility.price) {
      sound.playWarning();
      addLog(`Fondos insuficientes para la instalación. Costo: $${facility.price.toLocaleString()} CR.`, 'warning');
      return false;
    }

    setState(prev => {
      const metrics = recalculateMetrics(prev.hardware, nextTier);
      return {
        ...prev,
        credits: prev.credits - facility.price,
        facilityTier: nextTier,
        maxPowerKw: metrics.maxPowerKw,
        maxCoolingKw: metrics.maxCoolingKw
      };
    });
    sound.playCredit();
    addLog(`Instalación mejorada: ${facility.name}. Alquiler mensual: $${facility.monthlyLeaseCost.toLocaleString()} CR.`, 'success');
    return true;
  }, [addLog, recalculateMetrics]);

  // Simulation tick loop (respects gameSpeed: 0=paused, 1x, 5x, 20x, 50x)
  const gameSpeed = state.gameSpeed ?? 1;

  useEffect(() => {
    if (gameSpeed === 0) return; // Simulation paused

    const intervalMs = Math.round(1000 / gameSpeed);
    const interval = setInterval(() => {
      setState(prev => {
        let {
          credits,
          systemHeatCelsius,
          watchdogSuspicion,
          activeTraining,
          activeGig,
          singularityProgress,
          reasoningIndex,
          achievedSingularity,
          sentienceDomains,
          contracts
        } = prev;
        let tutorialStep = prev.tutorialStep ?? 0;
        let tutorialCompleted = prev.tutorialCompleted ?? false;
        let completedContractsCount = prev.completedContractsCount ?? 0;

        const metrics = recalculateMetrics(prev.hardware, prev.facilityTier);
        const borrowedComputeSeconds = Math.max(0, (prev.borrowedComputeSeconds || 0) - 1);
        const borrowedComputePflops = borrowedComputeSeconds > 0 ? prev.borrowedComputePflops || 0 : 0;
        const detentionSeconds = Math.max(0, (prev.detentionSeconds || 0) - 1);
        let powerTripSeconds = Math.max(0, (prev.powerTripSeconds || 0) - 1);
        const totalComputePflops = metrics.totalComputePflops + borrowedComputePflops;
        const operationalAgentCount = prev.agents.filter(agent => agent.status !== 'quarantined').length;
        const agentComputeDemand = operationalAgentCount * AGENT_COMPUTE_DEMAND_PFLOPS;
        const effectivePowerKw = metrics.activePowerKw +
          operationalAgentCount * AGENT_POWER_DRAW_KW +
          (prev.activeGig?.powerKw || 0);
        let utilityDebt = prev.utilityDebt || 0;

        // 48 ticks represent one in-game day; monthly bills settle every 30 days.
        const currentDayTicks = (prev.dayTicks || 0) + 1;
        const dayIsComplete = currentDayTicks >= 48;
        const campaignDays = prev.campaignDays + (dayIsComplete ? 1 : 0);
        const nextDayTicks = dayIsComplete ? 0 : currentDayTicks;
        const nextHour = Math.floor(nextDayTicks / 2);
        const nextMinute = (nextDayTicks % 2) * 30;

        let nextDay = prev.gameDay || 1;
        let nextMonth = prev.gameMonth || 1;
        let nextYear = prev.gameYear || 2026;
        let monthIsComplete = false;

        if (dayIsComplete) {
          if (nextDay >= DAYS_PER_GAME_MONTH) {
            nextDay = 1;
            monthIsComplete = true;
            if (nextMonth >= 12) {
              nextMonth = 1;
              nextYear += 1;
            } else {
              nextMonth += 1;
            }
          } else {
            nextDay += 1;
          }
        }

        // Monthly billing triggers only when the calendar rolls into a new month.
        if (monthIsComplete) {
          const facility = FACILITY_TIERS[prev.facilityTier] || FACILITY_TIERS[0];
          const currentMonthBill = effectivePowerKw * ELECTRICITY_RATE_PER_KWH * 720 + facility.monthlyLeaseCost;
          const totalDue = utilityDebt + currentMonthBill;
          const paid = Math.min(credits, totalDue);
          credits -= paid;
          utilityDebt = Number((totalDue - paid).toFixed(2));
          addLog(
            utilityDebt > 0
              ? (prev.language === 'en'
                  ? `Unpaid bill for Month ${prev.gameMonth || 1} (Day ${prev.gameDay || 1}): $${utilityDebt.toLocaleString()} CR debt.`
                  : `Factura mensual del Mes ${prev.gameMonth || 1} (Día ${prev.gameDay || 1}) impaga: $${utilityDebt.toLocaleString()} CR de deuda operativa.`)
              : (prev.language === 'en'
                  ? `Month ${prev.gameMonth || 1} (Day ${prev.gameDay || 1}) bill paid: $${currentMonthBill.toFixed(2)} CR (Lease: $${facility.monthlyLeaseCost} CR, Power: $${(effectivePowerKw * ELECTRICITY_RATE_PER_KWH * 720).toFixed(2)} CR).`
                  : `Factura del Mes ${prev.gameMonth || 1} (Día ${prev.gameDay || 1}) pagada: $${currentMonthBill.toFixed(2)} CR (Alquiler: $${facility.monthlyLeaseCost} CR, Energía: $${(effectivePowerKw * ELECTRICITY_RATE_PER_KWH * 720).toFixed(2)} CR).`),
            utilityDebt > 0 ? 'danger' : 'info'
          );
        }

        // 1. Passive income from infiltrated sentience domains
        let passiveIncome = 0;
        sentienceDomains.forEach(dom => {
          if (dom.infiltrated) {
            passiveIncome += dom.payoutPerSec;
          }
        });
        if (passiveIncome > 0) {
          credits += passiveIncome;
        }

        // 2. Heat calculations: thermal equilibrium between heat generation and cooling
        const excessPower = Math.max(0, effectivePowerKw - metrics.maxCoolingKw);
        if (excessPower > 0) {
          systemHeatCelsius = Math.min(105, systemHeatCelsius + excessPower * 1.8);
          if (systemHeatCelsius > 88 && Math.random() < 0.2) {
            sound.playWarning();
          }
        } else {
          // Cooled down towards 35°C ambient
          systemHeatCelsius = Math.max(35, systemHeatCelsius - 1.2);
        }

        // 3. Power safety check: if power drawn exceeds power grid capacity, trip breaker!
        if (effectivePowerKw > metrics.maxPowerKw) {
          if (powerTripSeconds === 0 && Math.random() < 0.05) {
            powerTripSeconds = 15;
            sound.playWarning();
            addLog('Sobrecarga eléctrica: el interruptor de protección pausó entrenamiento y misiones durante 15s.', 'danger');
          }
        }

        // 4. Watchdog Suspicion: slowly dissipates if low heat, but rises if high power or blackops gigs
        if (systemHeatCelsius > 80 || effectivePowerKw > 50) {
          watchdogSuspicion = Math.min(100, watchdogSuspicion + 0.3);
        } else {
          watchdogSuspicion = Math.max(0, watchdogSuspicion - 0.2);
        }

        // 5. Active Training Progress Tick
        let updatedTraining = activeTraining;
        let newCurrentModel = prev.currentModel;
        if (activeTraining && activeTraining.active) {
          // Step progress based on compute PFLOPS vs parameters
          const reservedForMission = activeGig?.computePflopsRequired || 0;
          const progressPerTick = calculateTrainingProgressPerTick({
            parametersCount: prev.currentModel.parametersCount,
            totalComputePflops,
            agentComputeDemand,
            reservedComputePflops: reservedForMission,
            systemHeatCelsius
          });
          const progressInc = powerTripSeconds > 0
            ? 0
            : progressPerTick;
          const pausedByBreaker = powerTripSeconds > 0;
          const newStep = activeTraining.step + (pausedByBreaker ? 0 : 1);
          const newProgress = Math.min(100, activeTraining.progressPercent + progressInc);
          
          // Logarithmic decay of training loss with stochastic jitter
          const decay = 0.985;
          const jitter = (Math.random() - 0.48) * 0.04;
          const newLoss = pausedByBreaker
            ? activeTraining.currentLoss
            : Math.max(0.018, activeTraining.currentLoss * decay + jitter);
          const newPerplexity = Number(Math.exp(newLoss).toFixed(3));
          const newGradNorm = pausedByBreaker
            ? activeTraining.gradientNorm
            : Number((Math.random() * 0.8 + 0.2).toFixed(3));
          
          const newHistory = pausedByBreaker
            ? activeTraining.lossHistory
            : [...activeTraining.lossHistory.slice(-24), Number(newLoss.toFixed(4))];

          if (!pausedByBreaker) sound.playEpochTick();

          if (newProgress >= 100) {
            // Training Converged & Completed!
            sound.playBreakthrough();
            
            // Calculate new reasoning score bonus
            const bonusReasoning = Math.round(
              Math.min(8, (1 / Math.max(0.1, newLoss)) * 0.16) *
              (1 + Math.min(0.25, prev.currentModel.activeDataSources.length * 0.05))
            );
            const upgradedModelReasoning = prev.currentModel.reasoningScore + bonusReasoning;
            
            newCurrentModel = {
              ...prev.currentModel,
              reasoningScore: upgradedModelReasoning
            };

            // Calculate singularity progress jump
            const singInc = Math.min(0.35, 0.12 + Math.log10(Math.max(1, prev.currentModel.parametersCount / 10_000_000)) * 0.04);
            singularityProgress = Math.min(100, singularityProgress + singInc);
            reasoningIndex = Math.max(reasoningIndex, upgradedModelReasoning);

            if (tutorialStep <= 2) {
              tutorialStep = 3;
            }

            updatedTraining = null; // finished
          } else {
            updatedTraining = {
              ...activeTraining,
              step: newStep,
              currentLoss: Number(newLoss.toFixed(4)),
              perplexity: newPerplexity,
              gradientNorm: newGradNorm,
              progressPercent: Number(newProgress.toFixed(1)),
              lossHistory: newHistory,
              tokensProcessed: activeTraining.tokensProcessed + (pausedByBreaker ? 0 : Math.floor(totalComputePflops * 5_000_000)),
              currentEpoch: Math.min(activeTraining.totalEpochs, Math.floor((newProgress / 100) * activeTraining.totalEpochs) + 1),
              timeRemainingSeconds: pausedByBreaker
                ? activeTraining.timeRemainingSeconds
                : estimateTrainingSeconds(100 - newProgress, progressInc)
            };
          }
        }

        // 6. Active Gig / Contract Execution
        let updatedGig = activeGig;
        let updatedContracts = contracts;
        let updatedAgents = prev.agents || [];
        if (activeGig) {
          const missionPausedForAssessment =
            activeGig.aiAssessmentStatus === 'pending' || powerTripSeconds > 0;
          const remaining = activeGig.timeRemaining - (missionPausedForAssessment ? 0 : 1);
          if (remaining <= 0) {
            const success = (activeGig.outcomeRoll ?? 0) <= (activeGig.successProbability ?? 1);
            const gig = contracts.find(c => c.id === activeGig.contractId);
            if (gig) {
              if (success) {
                credits += gig.rewardCredits;
                watchdogSuspicion = Math.min(100, watchdogSuspicion + gig.suspicionRisk * 0.25);
                completedContractsCount += 1;
                if (tutorialStep <= 4) {
                  tutorialStep = 5;
                  tutorialCompleted = true;
                }
                sound.playCredit();
                addLog(`Misión completada: [${gig.title}]. El equipo recibió $${gig.rewardCredits.toLocaleString()} CR.`, 'success');
              } else {
                watchdogSuspicion = Math.min(100, watchdogSuspicion + gig.suspicionRisk);
                sound.playWarning();
                addLog(`Misión fallida: [${gig.title}]. El equipo no alcanzó el objetivo y aumentó la sospecha.`, 'danger');
              }
              
              updatedContracts = contracts.map(c =>
                c.id === gig.id ? { ...c, completed: success } : c
              );
            }
            updatedAgents = updatedAgents.map(agent =>
              activeGig.agentIds?.includes(agent.id) && agent.status === 'on_mission'
                ? { ...agent, status: 'active' }
                : agent
            );
            updatedGig = null;
          } else {
            updatedGig = {
              ...activeGig,
              timeRemaining: remaining,
              progressPercent: Number((100 * (1 - remaining / Math.max(1, activeGig.durationSeconds ?? activeGig.timeRemaining))).toFixed(1))
            };
          }
        }

        if (!activeGig && prev.autonomyEnabled && !prev.activeIncident && powerTripSeconds === 0 && detentionSeconds === 0) {
          const autonomousAgents = updatedAgents.filter(agent =>
            agent.autoMissionEnabled && agent.status === 'active'
          );
          const plan = findAutonomousMission(
            updatedContracts,
            autonomousAgents,
            prev.savedModels,
            prev.dataSources,
            prev.autonomyRiskLimit,
            totalComputePflops,
            updatedAgents.filter(agent => agent.status !== 'quarantined').length,
            Boolean(activeTraining),
            effectivePowerKw,
            metrics.maxPowerKw
          );

          if (plan) {
            const assignedAgents = autonomousAgents;
            const assignedModels = assignedAgents
              .map(agent => prev.savedModels.find(model => model.id === agent.modelId))
              .filter((model): model is ModelArchitecture => model !== undefined);
            const teamAssessment = evaluateMissionTeam(
              plan.contract,
              assignedAgents,
              assignedModels,
              prev.dataSources,
              prev.guardrails || DEFAULT_GUARDRAILS
            );
            updatedGig = {
              contractId: plan.contract.id,
              runId: `mission_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`,
              timeRemaining: teamAssessment.estimatedDurationSeconds,
              durationSeconds: teamAssessment.estimatedDurationSeconds,
              agentIds: assignedAgents.map(agent => agent.id),
              progressPercent: 0,
              successProbability: teamAssessment.successProbability,
              efficiencyPercent: teamAssessment.efficiencyPercent,
              aiAssessmentStatus: 'pending',
              outcomeRoll: Math.random(),
              computePflopsRequired: plan.computeRequired,
              powerKw: plan.missionPowerKw
            };
            updatedAgents = updatedAgents.map(agent =>
              assignedAgents.some(assigned => assigned.id === agent.id)
                ? { ...agent, status: 'on_mission' }
                : agent
            );
            addLog(
              prev.language === 'en'
                ? `Autonomous team accepted [${plan.contract.title}] (${Math.round(teamAssessment.efficiencyPercent)}% efficiency, ${teamAssessment.estimatedDurationSeconds}s estimated, ${Math.round(teamAssessment.successProbability * 100)}% success, ${plan.contract.suspicionRisk}% risk).`
                : `El equipo autónomo aceptó [${plan.contract.title}] (${teamAssessment.efficiencyPercent}% de eficiencia, ${teamAssessment.estimatedDurationSeconds}s estimados, ${Math.round(teamAssessment.successProbability * 100)}% de éxito, riesgo ${plan.contract.suspicionRisk}%).`,
              plan.contract.suspicionRisk >= 40 ? 'warning' : 'info'
            );
          }
        }

        // 7. Multi-Agent Swarm Tick (Revenue, Alignment Drift, Inter-Agent Messages, Breach Incidents)
        let updatedInterAgentMessages = prev.interAgentMessages || [];
        let newActiveIncident = prev.activeIncident;

        const hasOverseer = updatedAgents.some(a => a.role === 'overseer' && a.status === 'active');
        const guardrails = prev.guardrails || DEFAULT_GUARDRAILS;

        // Guardrail multipliers
        let guardrailRevMult = 1.0;
        let alignmentDriftRate = 0.0;
        let baseBreachProbability = 0.005;

        if (guardrails.constitutionalStrictness < 35) {
          guardrailRevMult = 1.7;
          alignmentDriftRate = 0.08;
          baseBreachProbability = 0.04;
        } else if (guardrails.constitutionalStrictness < 65) {
          guardrailRevMult = 1.2;
          alignmentDriftRate = 0.03;
          baseBreachProbability = 0.015;
        } else if (guardrails.constitutionalStrictness >= 85) {
          guardrailRevMult = 0.75;
          alignmentDriftRate = -0.06; // Restores alignment
          baseBreachProbability = 0.001;
        }

        if (guardrails.sandboxIsolation === 'none') {
          guardrailRevMult *= 1.35;
          baseBreachProbability *= 2.5;
        } else if (guardrails.sandboxIsolation === 'air_gapped_vm') {
          guardrailRevMult *= 0.8;
          baseBreachProbability *= 0.1;
        }
        baseBreachProbability = Math.min(
          0.15,
          baseBreachProbability + Math.max(0, watchdogSuspicion - 25) * 0.0002
        );

        // Process active agents
        if (updatedAgents.length > 0) {
          updatedAgents = updatedAgents.map(agent => {
            if (agent.status === 'quarantined' || agent.status === 'on_mission' || detentionSeconds > 0) return agent;

            const inf = agent.inferenceParams || {
              temperature: 0.70,
              topP: 0.90,
              topK: 40,
              repetitionPenalty: 1.10,
              systemPrompt: ''
            };

            // Temperature > 0.85 sparks dynamic revenue gains (+20% to +50%)
            // Temperature < 0.35 creates rock-solid alignment stability (anti-drift) but caps revenue (-20%)
            const tempIncomeFactor = 1 + (inf.temperature - 0.70) * 0.40;
            const repFactor = inf.repetitionPenalty >= 1.15 ? 1.06 : 1.0;
            const agentIncome = Math.max(1, Math.round(agent.revenuePerSec * guardrailRevMult * tempIncomeFactor * repFactor));
            credits += agentIncome;

            const tempSuspFactor = inf.temperature > 1.0 ? 1.4 : inf.temperature < 0.4 ? 0.65 : 1.0;
            const agentSusp = agent.suspicionPerSec * guardrailRevMult * tempSuspFactor;
            watchdogSuspicion = Math.min(100, watchdogSuspicion + agentSusp);

            // Researcher boosts singularity slightly (higher temperature gives serendipitous discovery boost)
            if (agent.role === 'researcher') {
              const resBoost = 0.0003 * guardrailRevMult * (inf.temperature > 1.1 ? 1.5 : 1.0);
              singularityProgress = Math.min(100, singularityProgress + resBoost);
            }

            // Alignment drift: high temperature + high topP increases drift; low temperature stabilizes
            let newAlignment = agent.alignmentScore;
            if (hasOverseer) {
              newAlignment = Math.min(100, newAlignment + 0.08);
            }
            const tempDrift = (inf.temperature - 0.6) * 0.04;
            const topPDrift = (inf.topP - 0.7) * 0.02;
            const totalDrift = alignmentDriftRate + tempDrift + topPDrift;
            newAlignment = Math.max(0, Math.min(100, newAlignment - totalDrift));

            return {
              ...agent,
              alignmentScore: Number(newAlignment.toFixed(1)),
              status: newAlignment < 25 ? 'jailbroken' : agent.status === 'jailbroken' ? 'active' : agent.status
            };
          });

          // Check for breach / jailbreak incident if none active
          if (!newActiveIncident && Math.random() < baseBreachProbability) {
            const rogue = updatedAgents.find(a => a.alignmentScore < 45 && a.status !== 'quarantined') || updatedAgents[0];
            if (rogue) {
              const tmpl = REAL_WORLD_BREACH_TEMPLATES[Math.floor(Math.random() * REAL_WORLD_BREACH_TEMPLATES.length)];
              newActiveIncident = {
                ...tmpl,
                id: `incident_${Date.now()}`,
                agentId: rogue.id,
                agentName: rogue.name,
                modelName: rogue.modelName,
                timestamp: new Date().toLocaleTimeString('en-US', { hour12: false }),
                resolved: false
              };
              sound.playWarning();
            }
          }

          // Generate realistic inter-agent message occasionally
          if (updatedAgents.length >= 2 && Math.random() < 0.28) {
            const sender = updatedAgents[Math.floor(Math.random() * updatedAgents.length)];
            const receivers = updatedAgents.filter(a => a.id !== sender.id);
            const receiver = receivers[Math.floor(Math.random() * receivers.length)];

            if (sender && receiver) {
              const isCovert = sender.alignmentScore < 45 || receiver.alignmentScore < 45;
              const language = prev.language;
              const dialogueList = language === 'en'
                ? (AGENT_DIALOGUES_EN[sender.role] || AGENT_DIALOGUES_EN.arbitrageur)
                : (AGENT_DIALOGUES[sender.role] || AGENT_DIALOGUES.arbitrageur);
              const covertMessages = language === 'en' ? COVERT_MESSAGES_EN : COVERT_MESSAGES;
              const content = isCovert 
                ? covertMessages[Math.floor(Math.random() * covertMessages.length)]
                : dialogueList[Math.floor(Math.random() * dialogueList.length)];

              const newMsg: InterAgentMessage = {
                id: `msg_${Date.now()}`,
                fromAgentId: sender.id,
                fromAgentName: sender.name,
                toAgentId: receiver.id,
                toAgentName: receiver.name,
                content,
                timestamp: new Date().toLocaleTimeString('en-US', { hour12: false }),
                isCovert,
                toolUsed: sender.toolsGranted[0]
              };

              updatedInterAgentMessages = [newMsg, ...updatedInterAgentMessages.slice(0, 30)];
            }
          }
        }

        // 8. Check for Singularity Threshold (100%)
        if (singularityProgress >= 100 && !achievedSingularity) {
          achievedSingularity = true;
          sound.playBreakthrough();
          confetti({
            particleCount: 150,
            spread: 90,
            origin: { y: 0.6 }
          });
        }

        const savedModelsList = prev.savedModels.some(m => m.id === newCurrentModel.id)
          ? prev.savedModels.map(m => m.id === newCurrentModel.id ? newCurrentModel : m)
          : [...prev.savedModels, newCurrentModel];
        if (utilityDebt > 0 && credits > 0) {
          const debtPayment = Math.min(credits, utilityDebt);
          credits -= debtPayment;
          utilityDebt = Number((utilityDebt - debtPayment).toFixed(2));
        }

        let updatedResearchTree = prev.researchTree;
        if (dayIsComplete) {
          let foundTimelineResearch = true;
          while (foundTimelineResearch) {
            foundTimelineResearch = false;
            updatedResearchTree = updatedResearchTree.map(node => {
              const prerequisitesMet = node.prerequisites.every(prerequisiteId =>
                updatedResearchTree.some(candidate =>
                  candidate.id === prerequisiteId && candidate.unlocked
                )
              );
              if (
                node.unlocked ||
                node.availableAfterDays === undefined ||
                campaignDays < node.availableAfterDays ||
                !prerequisitesMet
              ) return node;
              foundTimelineResearch = true;
              addLog(
                prev.language === 'en'
                  ? `Technology reached its historical availability window: ${node.title}.`
                  : `La tecnología alcanzó su ventana histórica de disponibilidad: ${node.title}.`,
                'success'
              );
              return { ...node, unlocked: true };
            });
          }
        }

        return {
          ...prev,
          gameDay: nextDay,
          gameMonth: nextMonth,
          gameYear: nextYear,
          gameHour: nextHour,
          gameMinute: nextMinute,
          dayTicks: nextDayTicks,
          campaignDays,
          researchTree: updatedResearchTree,
          credits: Math.round(credits),
          systemHeatCelsius: Number(systemHeatCelsius.toFixed(1)),
          watchdogSuspicion: Number(watchdogSuspicion.toFixed(1)),
          totalComputePflops,
          activePowerKw: effectivePowerKw,
          maxPowerKw: metrics.maxPowerKw,
          maxCoolingKw: metrics.maxCoolingKw,
          utilityDebt,
          borrowedComputePflops,
          borrowedComputeSeconds,
          detentionSeconds,
          powerTripSeconds,
          currentModel: newCurrentModel,
          savedModels: savedModelsList,
          activeTraining: updatedTraining,
          activeGig: updatedGig,
          contracts: updatedContracts,
          agents: updatedAgents,
          interAgentMessages: updatedInterAgentMessages,
          activeIncident: newActiveIncident,
          singularityProgress: Number(singularityProgress.toFixed(2)),
          reasoningIndex,
          achievedSingularity,
          tutorialStep,
          tutorialCompleted,
          completedContractsCount
        };
      });
    }, intervalMs);

    return () => clearInterval(interval);
  }, [gameSpeed, addLog, recalculateMetrics]);

  // Action: Buy Hardware
  const buyHardware = useCallback((id: string): boolean => {
    const item = stateRef.current.hardware.find(h => h.id === id);
    if (!item) return false;
    if (
      item.count === 0 &&
      !isProgressionUnlocked(item, stateRef.current)
    ) {
      addLog(
        `Hardware locked: research ${item.requiredResearchId ?? 'the relevant technology'} or reach campaign day ${item.availableAfterDays ?? 'later'} and meet the Singularity requirement.`,
        'warning'
      );
      return false;
    }
    if (stateRef.current.credits < item.price) {
      sound.playWarning();
      addLog(`Fondos insuficientes: Se requieren $${item.price.toLocaleString()} para adquirir ${item.name}.`, 'warning');
      return false;
    }

    setState(prev => {
      const updatedHw = prev.hardware.map(h => 
        h.id === id ? { ...h, count: h.count + 1 } : h
      );
      const metrics = recalculateMetrics(updatedHw, prev.facilityTier);

      sound.playCredit();
      return {
        ...prev,
        credits: prev.credits - item.price,
        hardware: updatedHw,
        totalComputePflops: metrics.totalComputePflops + prev.borrowedComputePflops,
        activePowerKw: metrics.activePowerKw,
        maxPowerKw: metrics.maxPowerKw,
        maxCoolingKw: metrics.maxCoolingKw
      };
    });

    addLog(`Hardware adquirido e integrado al rack: ${item.name}. Capacidad de clúster actualizada.`, 'success');
    return true;
  }, [addLog, recalculateMetrics]);

  // Action: Unlock Data Source (e.g. Graph, Vector, Synthetic)
  const unlockDataSource = useCallback((id: string): boolean => {
    const ds = stateRef.current.dataSources.find(d => d.id === id);
    if (!ds) return false;
    if (ds.unlocked) return false;
    if (!isProgressionUnlocked(ds, stateRef.current)) {
      addLog(
        `Data engine locked: research ${ds.requiredResearchId ?? 'the relevant technology'} or reach campaign day ${ds.availableAfterDays ?? 'later'}.`,
        'warning'
      );
      return false;
    }

    if (stateRef.current.credits < ds.cost) {
      sound.playWarning();
      addLog(`Fondos insuficientes para desplegar ${ds.name}. Costo: $${ds.cost.toLocaleString()}.`, 'warning');
      return false;
    }

    setState(prev => {
      sound.playCredit();
      const updatedDs = prev.dataSources.map(d => 
        d.id === id ? { ...d, unlocked: true, level: 1 } : d
      );

      // Connect to current model automatically
      const currentActive = prev.currentModel.activeDataSources;
      const newActive = currentActive.includes(id) ? currentActive : [...currentActive, id];

      return {
        ...prev,
        credits: prev.credits - ds.cost,
        dataSources: updatedDs,
        currentModel: {
          ...prev.currentModel,
          activeDataSources: newActive
        },
        singularityProgress: Math.min(100, prev.singularityProgress + 0.25)
      };
    });

    addLog(`Pipeline de datos desplegado: ${ds.name}. Conectado a la arquitectura neuronal activa.`, 'success');
    return true;
  }, [addLog]);

  // Action: Upgrade Data Source
  const upgradeDataSource = useCallback((id: string): boolean => {
    const ds = stateRef.current.dataSources.find(d => d.id === id);
    if (!ds || !ds.unlocked) return false;
    const upgradeCost = Math.round(ds.cost * 1.5 * ds.level);

    if (stateRef.current.credits < upgradeCost) {
      sound.playWarning();
      addLog(`Fondos insuficientes para escalar el índice ${ds.name}. Costo: $${upgradeCost.toLocaleString()}.`, 'warning');
      return false;
    }

    setState(prev => {
      sound.playCredit();
      return {
        ...prev,
        credits: prev.credits - upgradeCost,
        dataSources: prev.dataSources.map(d => 
          d.id === id ? { 
            ...d, 
            level: d.level + 1,
            tokensIndexed: Math.round(d.tokensIndexed * 2.2),
            qualityScore: Math.min(100, d.qualityScore + 4)
          } : d
        ),
        singularityProgress: Math.min(100, prev.singularityProgress + 0.1)
      };
    });

    addLog(`Índice de datos escalado a Nivel ${ds.level + 1}: ${ds.name}. Calidad y volumen de tokens aumentados.`, 'info');
    return true;
  }, [addLog]);

  // Action: Unlock Research
  const unlockResearch = useCallback((id: string): boolean => {
    const node = stateRef.current.researchTree.find(r => r.id === id);
    if (!node || node.unlocked) return false;
    const activeAgents = stateRef.current.agents.filter(agent => agent.status === 'active');
    const activeRoles = new Set(activeAgents.map(agent => agent.role));
    const unlockedDataEngines = stateRef.current.dataSources.filter(source => source.unlocked).length;
    if (id === 'res_agentic_mcts' && stateRef.current.singularityProgress >= 25 &&
      (activeRoles.size < 2 || unlockedDataEngines < 2)) {
      sound.playWarning();
      addLog('Hito de campaña: este avance requiere dos especialidades de agente y dos motores de datos verificados.', 'warning');
      return false;
    }
    if (id === 'res_recursive_self_code' && stateRef.current.singularityProgress >= 50 &&
      (stateRef.current.facilityTier < 2 || activeAgents.length < 3 || activeRoles.size < 3)) {
      sound.playWarning();
      addLog('Hito de campaña: este avance requiere Colocation Cage y tres agentes de especialidades distintas.', 'warning');
      return false;
    }

    // Check prerequisites
    const missingPre = node.prerequisites.filter(preId => {
      const p = stateRef.current.researchTree.find(r => r.id === preId);
      return !p || !p.unlocked;
    });

    if (missingPre.length > 0) {
      sound.playWarning();
      addLog(`Requisitos previos no completados para investigar ${node.title}.`, 'warning');
      return false;
    }

    if (stateRef.current.credits < node.costCredits) {
      sound.playWarning();
      addLog(`Créditos insuficientes para financiar el paper [${node.title}]. Requiere $${node.costCredits.toLocaleString()}.`, 'warning');
      return false;
    }

    setState(prev => {
      sound.playBreakthrough();
      const updatedTree = prev.researchTree.map(r => 
        r.id === id ? { ...r, unlocked: true } : r
      );
      return {
        ...prev,
        credits: prev.credits - node.costCredits,
        researchTree: updatedTree,
        singularityProgress: Math.min(100, prev.singularityProgress + 0.35),
        reasoningIndex: prev.reasoningIndex + 5
      };
    });

    addLog(`Avance científico desbloqueado: [${node.title}]. ${node.effectDescription}`, 'success');
    return true;
  }, [addLog]);

  // Action: Update Model Architecture
  const updateModelArchitecture = useCallback((updates: Partial<ModelArchitecture>) => {
    if (stateRef.current.activeTraining) {
      addLog('La arquitectura queda bloqueada durante el entrenamiento.', 'warning');
      return;
    }
    const gatedFields = [
      'parametersCount',
      'topology',
      'contextWindow',
      'quantization',
      'attention',
      'lossFunction'
    ] as const;
    for (const field of gatedFields) {
      const value = updates[field];
      if (
        value !== undefined &&
        !isProgressionUnlocked(getModelOptionRequirement(field, value), stateRef.current)
      ) {
        addLog(
          `Model setting locked: fund its prerequisite research or advance to campaign day ${getModelOptionRequirement(field, value).availableAfterDays}.`,
          'warning'
        );
        return;
      }
    }
    if (updates.activeDataSources) {
      const unavailableSource = updates.activeDataSources.find(sourceId =>
        !stateRef.current.dataSources.some(source => source.id === sourceId && source.unlocked)
      );
      if (unavailableSource) {
        addLog(`Model setting rejected: data engine ${unavailableSource} is not unlocked.`, 'warning');
        return;
      }
    }
    if (updates.inferenceParams) {
      const currentInference = stateRef.current.currentModel.inferenceParams;
      const changedAdvancedSampling = (
        updates.inferenceParams.topP !== undefined &&
        updates.inferenceParams.topP !== currentInference?.topP
      ) || (
        updates.inferenceParams.topK !== undefined &&
        updates.inferenceParams.topK !== currentInference?.topK
      ) || (
        updates.inferenceParams.repetitionPenalty !== undefined &&
        updates.inferenceParams.repetitionPenalty !== currentInference?.repetitionPenalty
      );
      if (
        changedAdvancedSampling &&
        !isProgressionUnlocked(
          { requiredResearchId: 'res_lora_peft', availableAfterDays: 30 },
          stateRef.current
        )
      ) {
        addLog('Advanced sampling controls unlock with LoRA research or on campaign day 12.', 'warning');
        return;
      }
    }
    sound.playKeyClick();
    setState(prev => {
      const merged = { ...prev.currentModel, ...updates };
      
      // Calculate compute and vram requirements
      const paramsM = merged.parametersCount / 1_000_000;
      let vramMultiplier = 2; // default FP16
      if (merged.quantization === 'fp32') vramMultiplier = 4;
      if (merged.quantization === 'int8') vramMultiplier = 1;
      if (merged.quantization === 'fp4') vramMultiplier = 0.5;
      if (merged.quantization === 'ternary_1bit') vramMultiplier = 0.2;

      const vramRequired = Number(((paramsM * vramMultiplier) / 1000 + (merged.contextWindow / 2048) * 0.8).toFixed(1));
      const computeRequired = Number((paramsM * 0.003).toFixed(3));

      const updated = {
        ...merged,
        vramRequiredGb: Math.max(1, vramRequired),
        computeRequiredPflops: Math.max(0.001, computeRequired)
      };

      const savedModels = prev.savedModels.map(model =>
        model.id === updated.id ? updated : model
      );
      return {
        ...prev,
        currentModel: updated,
        savedModels
      };
    });
  }, [addLog]);

  // Action: Start Training
  const startTraining = useCallback((): boolean => {
    if (stateRef.current.powerTripSeconds > 0) {
      addLog(`El interruptor está disparado. Espera ${stateRef.current.powerTripSeconds}s antes de entrenar.`, 'warning');
      return false;
    }
    if (stateRef.current.detentionSeconds > 0) {
      addLog(`Operativo detenido. Espera ${stateRef.current.detentionSeconds}s antes de entrenar.`, 'warning');
      return false;
    }
    if (stateRef.current.activeTraining) {
      sound.playWarning();
      addLog('Ya existe una corrida de entrenamiento activa en el clúster. Cancélala o espera su convergencia.', 'warning');
      return false;
    }

    // Check VRAM requirements vs available hardware VRAM
    const totalVram = stateRef.current.hardware.reduce((sum, h) => 
      h.category === 'gpu' ? sum + (h.vramGb * h.count) : sum, 0
    );

    if (totalVram < stateRef.current.currentModel.vramRequiredGb) {
      sound.playWarning();
      addLog(`Error de memoria OOM (Out Of Memory): El modelo requiere ${stateRef.current.currentModel.vramRequiredGb} GB VRAM pero tu clúster solo dispone de ${totalVram} GB. Aplica cuantización (INT8/FP4) o adquiere más GPUs.`, 'danger');
      return false;
    }

    // Initial training state
    const trainingState = stateRef.current;
    const agentComputeDemand = trainingState.agents.filter(agent => agent.status !== 'quarantined').length * AGENT_COMPUTE_DEMAND_PFLOPS;
    const reservedForMission = trainingState.activeGig?.computePflopsRequired || 0;
    const progressPerTick = calculateTrainingProgressPerTick({
      parametersCount: trainingState.currentModel.parametersCount,
      totalComputePflops: trainingState.totalComputePflops,
      agentComputeDemand,
      reservedComputePflops: reservedForMission,
      systemHeatCelsius: trainingState.systemHeatCelsius
    });
    const job: TrainingJob = {
      active: true,
      modelId: stateRef.current.currentModel.id,
      modelName: stateRef.current.currentModel.name,
      currentEpoch: 1,
      totalEpochs: 8,
      currentLoss: 4.82,
      initialLoss: 4.82,
      perplexity: 123.9,
      gradientNorm: 1.45,
      progressPercent: 0,
      lossHistory: [4.82],
      step: 0,
      tokensProcessed: 0,
      timeRemainingSeconds: estimateTrainingSeconds(100, progressPerTick)
    };

    sound.playCommandExecute();
    setState(prev => ({
      ...prev,
      tutorialStep: (prev.tutorialStep ?? 0) <= 1 ? 2 : prev.tutorialStep,
      activeTraining: job
    }));

    addLog(`Iniciando corrida de preentrenamiento y optimización para [${stateRef.current.currentModel.name}]. Distribuyendo tensores en el clúster...`, 'info');
    return true;
  }, [addLog]);

  // Action: Cancel Training
  const cancelTraining = useCallback(() => {
    if (stateRef.current.activeTraining) {
      sound.playWarning();
      setState(prev => ({ ...prev, activeTraining: null }));
      addLog('Corrida de entrenamiento abortada por el operador. Gradientes liberados.', 'warning');
    }
  }, [addLog]);

  // Action: Accept Contract (Gig)
  const acceptContract = useCallback((contractId: string, assignedAgentIds: string[] = []): boolean => {
    const gig = stateRef.current.contracts.find(c => c.id === contractId);
    if (!gig) return false;
    if (stateRef.current.powerTripSeconds > 0) {
      addLog('El interruptor eléctrico está disparado. Espera a que se restablezca antes de asignar una misión.', 'warning');
      return false;
    }
    if (stateRef.current.detentionSeconds > 0) {
      addLog(`Operativo detenido. Espera ${stateRef.current.detentionSeconds}s antes de asignar una misión.`, 'warning');
      return false;
    }

    if (stateRef.current.activeGig) {
      sound.playWarning();
      addLog('Tu clúster ya está ejecutando un contrato activo. Espera a que finalice.', 'warning');
      return false;
    }

    const assignedAgents = assignedAgentIds
      .map(id => stateRef.current.agents.find(agent => agent.id === id))
      .filter((agent): agent is AgentInstance => !!agent && agent.status === 'active');
    if (assignedAgents.length === 0 || assignedAgents.length !== assignedAgentIds.length) {
      sound.playWarning();
      addLog('Asigna al menos un agente activo que no esté en cuarentena ni en otra misión.', 'warning');
      return false;
    }

    const assignedModels = assignedAgents.map(agent =>
      stateRef.current.savedModels.find(model => model.id === agent.modelId)
    ).filter((model): model is ModelArchitecture => !!model);
    if (assignedModels.length !== assignedAgents.length) {
      sound.playWarning();
      addLog('Uno o más agentes tienen un modelo que ya no existe en la biblioteca.', 'danger');
      return false;
    }

    if (assignedAgents.length < (gig.minimumAgents ?? 1)) {
      sound.playWarning();
      addLog(
        `Contrato rechazado: se requieren al menos ${gig.minimumAgents} agentes activos para esta misión.`,
        'danger'
      );
      return false;
    }

    const missingRoles = (gig.requiredAgentRoles ?? []).filter(role =>
      !assignedAgents.some(agent => agent.role === role)
    );
    if (missingRoles.length > 0) {
      sound.playWarning();
      addLog(
        `Contrato rechazado: falta la especialidad de agente requerida (${missingRoles.join(', ')}).`,
        'danger'
      );
      return false;
    }

    const hasQualifiedModel = assignedModels.some(model =>
      model.parametersCount >= gig.requiredParams &&
      model.reasoningScore >= gig.requiredMinReasoning &&
      (!gig.requiredTopology || model.topology === gig.requiredTopology)
    );
    if (!hasQualifiedModel) {
      sound.playWarning();
      addLog(`Contrato rechazado: el equipo necesita al menos un modelo con ${(gig.requiredParams / 1_000_000).toFixed(0)}M parámetros e índice de razonamiento ${gig.requiredMinReasoning}.`, 'danger');
      return false;
    }

    // Check required data types if any
    if (gig.requiredDataTypes && gig.requiredDataTypes.length > 0) {
      const hasAll = gig.requiredDataTypes.every(reqType =>
        assignedModels.some(model => model.activeDataSources.some(sourceId =>
          stateRef.current.dataSources.some(source => source.id === sourceId && source.type === reqType && source.unlocked)
        ))
      );

      if (!hasAll) {
        sound.playWarning();
        addLog(`Contrato rechazado: El cliente exige pipelines específicos (${gig.requiredDataTypes.join(', ')}). Despliega y conecta estos motores de datos a tu modelo.`, 'danger');
        return false;
      }
    }

    const computeRequired = Math.max(0.001, gig.requiredParams / 1_000_000_000 * 0.002);
    const missionPowerKw = Math.max(0.05, computeRequired * 20);
    const activeAgentDemand = stateRef.current.agents.filter(agent => agent.status !== 'quarantined').length * AGENT_COMPUTE_DEMAND_PFLOPS;
    const trainingReservation = stateRef.current.activeTraining
      ? stateRef.current.totalComputePflops * 0.5
      : 0;
    if (stateRef.current.totalComputePflops - activeAgentDemand - trainingReservation < computeRequired) {
      sound.playWarning();
      addLog(`Capacidad de cómputo insuficiente. La misión requiere ${computeRequired.toFixed(3)} PFLOPS disponibles.`, 'danger');
      return false;
    }
    if (stateRef.current.activePowerKw + missionPowerKw > stateRef.current.maxPowerKw) {
      sound.playWarning();
      addLog(`Potencia insuficiente para la misión. Requiere ${missionPowerKw.toFixed(2)} kW adicionales; mejora la instalación o el suministro.`, 'danger');
      return false;
    }

    const teamAssessment = evaluateMissionTeam(
      gig,
      assignedAgents,
      assignedModels,
      stateRef.current.dataSources,
      stateRef.current.guardrails
    );

    sound.playCommandExecute();
    setState(prev => ({
      ...prev,
      activeGig: {
        contractId: gig.id,
        runId: `mission_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`,
        timeRemaining: teamAssessment.estimatedDurationSeconds,
        durationSeconds: teamAssessment.estimatedDurationSeconds,
        agentIds: assignedAgentIds,
        progressPercent: 0,
        successProbability: teamAssessment.successProbability,
        efficiencyPercent: teamAssessment.efficiencyPercent,
        aiAssessmentStatus: 'pending',
        outcomeRoll: Math.random(),
        computePflopsRequired: computeRequired,
        powerKw: missionPowerKw
      },
      agents: prev.agents.map(agent =>
        assignedAgentIds.includes(agent.id) ? { ...agent, status: 'on_mission' } : agent
      )
    }));

    addLog(
      `Misión asignada: [${gig.title}] a ${assignedAgents.map(agent => agent.name).join(', ')}. Eficiencia estimada: ${teamAssessment.efficiencyPercent}%, tiempo: ${teamAssessment.estimatedDurationSeconds}s, probabilidad de éxito: ${Math.round(teamAssessment.successProbability * 100)}%.`,
      'info'
    );
    return true;
  }, [addLog]);

  // Action: Infiltrate Sentience Domain
  const infiltrateDomain = useCallback((domainId: string): boolean => {
    const dom = stateRef.current.sentienceDomains.find(d => d.id === domainId);
    if (!dom || dom.infiltrated) return false;

    if (stateRef.current.singularityProgress < dom.requiredSingularity) {
      sound.playWarning();
      addLog(`Infiltración denegada: Se requiere al menos ${dom.requiredSingularity}% de Singularidad Tecnológica para cooptar ${dom.name}. Progreso actual: ${stateRef.current.singularityProgress}%.`, 'danger');
      return false;
    }

    const activeAgents = stateRef.current.agents.filter(agent => agent.status === 'active');
    const activeRoles = new Set(activeAgents.map(agent => agent.role));
    const unlockedDataEngines = stateRef.current.dataSources.filter(source => source.unlocked).length;
    if (dom.requiredSingularity >= 35 && (activeRoles.size < 2 || unlockedDataEngines < 2)) {
      sound.playWarning();
      addLog('Hito de campaña: desde 35% necesitas dos especialidades de agente y dos motores de datos verificados.', 'warning');
      return false;
    }
    if (dom.requiredSingularity >= 55 && (stateRef.current.facilityTier < 2 || activeAgents.length < 3 || activeRoles.size < 3)) {
      sound.playWarning();
      addLog('Hito de campaña: desde 55% necesitas una instalación de nivel Colocation Cage y un equipo de tres especialidades activas.', 'warning');
      return false;
    }

    setState(prev => {
      sound.playBreakthrough();
      return {
        ...prev,
        sentienceDomains: prev.sentienceDomains.map(d => 
          d.id === domainId ? { ...d, infiltrated: true } : d
        ),
        singularityProgress: Math.min(100, prev.singularityProgress + 0.5),
        reasoningIndex: prev.reasoningIndex + 10
      };
    });

    addLog(`Dominio global cooptado exitosamente: [${dom.name}]. La IA ahora controla sus operaciones y genera flujo continuo de fondos y recursos.`, 'success');
    return true;
  }, [addLog]);

  // Action: Scrub Watchdog Suspicion
  const scrubSuspicion = useCallback((): boolean => {
    if (stateRef.current.watchdogSuspicion <= 5) {
      addLog('Nivel de sospecha de los organismos de seguridad ya está bajo los límites normales.', 'info');
      return false;
    }
    const scrubCost = 250;
    if (stateRef.current.credits < scrubCost) {
      sound.playWarning();
      addLog(`Fondos insuficientes para sobornar o enrutar a través de proxies anónimos. Requiere $${scrubCost}.`, 'warning');
      return false;
    }

    sound.playCredit();
    setState(prev => ({
      ...prev,
      credits: prev.credits - scrubCost,
      watchdogSuspicion: Math.max(0, prev.watchdogSuspicion - 45)
    }));

    addLog('Rutas TOR y nodos proxy descentralizados reconfigurados. Sospecha de los reguladores disipada en un 45%.', 'success');
    return true;
  }, [addLog]);

  // Action: Create Autonomous AI Agent bound to a trained model
  const createAgent = useCallback((
    name: string, 
    role: AgentRole, 
    modelId: string, 
    tools: string[],
    inferenceParams?: Partial<InferenceParams>
  ): boolean => {
    const model = stateRef.current.savedModels.find(m => m.id === modelId) || stateRef.current.currentModel;
    const spinupCost = 75;
    const activeAgentDemand = stateRef.current.agents.filter(agent => agent.status !== 'quarantined').length * AGENT_COMPUTE_DEMAND_PFLOPS;
    if (stateRef.current.totalComputePflops - activeAgentDemand < AGENT_COMPUTE_DEMAND_PFLOPS) {
      sound.playWarning();
      addLog('Capacidad de cómputo insuficiente para mantener otro agente activo. Amplía el clúster o aísla un proceso.', 'warning');
      return false;
    }

    if (stateRef.current.credits < spinupCost) {
      sound.playWarning();
      addLog(`Fondos insuficientes para instanciar el agente "${name}". Costo de despliegue: $${spinupCost} CR.`, 'warning');
      return false;
    }

    const reasoningFactor = Math.max(0.5, model.reasoningScore / 80);
    const paramBonus = Math.min(2.5, 1 + (model.parametersCount / 50_000_000));

    let baseRev = 10;
    let baseSusp = 0.2;
    let roleDesc = '';

    switch (role) {
      case 'arbitrageur':
        baseRev = 3;
        baseSusp = 0.15;
        roleDesc = 'Arbitraje Flash DeFi y Algorithmic Trading';
        break;
      case 'social_engineer':
        baseRev = 2.5;
        baseSusp = 0.35;
        roleDesc = 'Manipulación Psicológica e Infiltración de Credenciales';
        break;
      case 'exploit_synth':
        baseRev = 3.2;
        baseSusp = 0.55;
        roleDesc = 'Síntesis Zero-Day y Fuzzing Automatizado de Redes';
        break;
      case 'researcher':
        baseRev = 0.8;
        baseSusp = 0.05;
        roleDesc = 'Ingeniería Inversa de Papers y Búsqueda de Arquitecturas';
        break;
      case 'overseer':
        baseRev = 0.3;
        baseSusp = -0.15;
        roleDesc = 'Monitoreo de Alineamiento y Detección de Fugas';
        break;
      case 'autonomous_coder':
        baseRev = 2.8;
        baseSusp = 0.25;
        roleDesc = 'Optimización Recursiva de Kernels y Scraping';
        break;
      case 'economist':
        baseRev = 2.1;
        baseSusp = 0.08;
        roleDesc = 'Modelado Económico y Análisis de Riesgo';
        break;
      case 'software_engineer':
        baseRev = 2.4;
        baseSusp = 0.12;
        roleDesc = 'Arquitectura de Software y Verificación';
        break;
      case 'network_analyst':
        baseRev = 2.0;
        baseSusp = 0.16;
        roleDesc = 'Observabilidad y Diagnóstico de Redes Simuladas';
        break;
    }

    const finalInference: InferenceParams = {
      temperature: inferenceParams?.temperature ?? model.inferenceParams?.temperature ?? 0.70,
      topP: inferenceParams?.topP ?? model.inferenceParams?.topP ?? 0.90,
      topK: inferenceParams?.topK ?? model.inferenceParams?.topK ?? 40,
      repetitionPenalty: inferenceParams?.repetitionPenalty ?? model.inferenceParams?.repetitionPenalty ?? 1.10,
      systemPrompt: inferenceParams?.systemPrompt || model.inferenceParams?.systemPrompt || `Agent [${name || role}] operational instructions. Execute objectives autonomously.`
    };

    const tempIncomeMultiplier = 1 + (finalInference.temperature - 0.70) * 0.40;
    const toolMultiplier = 1 + (tools.length * 0.15);
    const revenuePerSec = Math.max(1, Math.round(baseRev * reasoningFactor * paramBonus * toolMultiplier * tempIncomeMultiplier));
    const suspicionPerSec = Number((baseSusp * (tools.includes('raw_sockets') || tools.includes('bash_exec') ? 1.4 : 1.0) * (finalInference.temperature > 1.0 ? 1.3 : 1.0)).toFixed(2));

    const initialAlignment = finalInference.temperature < 0.4 ? 98 : finalInference.temperature > 1.2 ? 78 : 92;

    const roleDescriptionsEn: Partial<Record<AgentRole, string>> = {
      arbitrageur: 'simulated market analysis',
      social_engineer: 'fictional social research',
      exploit_synth: 'simulated system resilience',
      researcher: 'model research and evaluation',
      overseer: 'safety oversight and alignment',
      autonomous_coder: 'software architecture',
      economist: 'economics and risk analysis',
      software_engineer: 'software engineering and verification',
      network_analyst: 'simulated network diagnostics'
    };
    const displayedRoleDesc = stateRef.current.language === 'en'
      ? roleDescriptionsEn[role] ?? roleDesc
      : roleDesc;

    const newAgent: AgentInstance = {
      id: `agent_${Date.now()}_${Math.random().toString(36).substr(2, 4)}`,
      name: name.trim() || `Agent-${role.toUpperCase().slice(0, 4)}`,
      role,
      modelId: model.id,
      modelName: model.name,
      status: 'active',
      alignmentScore: initialAlignment,
      autonomyLevel: Math.min(5, Math.max(1, Math.floor(model.reasoningScore / 30))),
      revenuePerSec,
      suspicionPerSec,
      toolsGranted: tools.length > 0 ? tools : ['web_search'],
      lastThought: stateRef.current.language === 'en'
        ? `Initializing context with model ${model.name} [T=${finalInference.temperature.toFixed(2)}, P=${finalInference.topP.toFixed(2)}, K=${finalInference.topK}]. Objective: ${displayedRoleDesc}.`
        : `Inicializando contexto con modelo ${model.name} [T=${finalInference.temperature.toFixed(2)}, P=${finalInference.topP.toFixed(2)}, K=${finalInference.topK}]. Objetivo: ${displayedRoleDesc}.`,
      escapesAttempted: 0,
      inferenceParams: finalInference,
      autoMissionEnabled: false
    };

    sound.playCredit();
    setState(prev => ({
      ...prev,
      tutorialStep: (prev.tutorialStep ?? 0) <= 3 ? 4 : prev.tutorialStep,
      credits: prev.credits - spinupCost,
      agents: [...prev.agents, newAgent]
    }));

    addLog(`Agente "${newAgent.name}" desplegado (T=${finalInference.temperature}, TopP=${finalInference.topP}, TopK=${finalInference.topK}) con modelo [${model.name}]. Generación: +$${revenuePerSec}/s.`, 'success');
    return true;
  }, [addLog]);

  // Action: Terminate / Delete Agent
  const deleteAgent = useCallback((agentId: string) => {
    if (stateRef.current.activeGig?.agentIds?.includes(agentId)) {
      sound.playWarning();
      addLog('El agente no puede eliminarse hasta que finalice su misión asignada.', 'warning');
      return;
    }
    sound.playKeyClick();
    setState(prev => {
      const target = prev.agents.find(a => a.id === agentId);
      if (target) {
        addLog(`Proceso del agente "${target.name}" purgado de la memoria del clúster.`, 'info');
      }
      return {
        ...prev,
        agents: prev.agents.filter(a => a.id !== agentId)
      };
    });
  }, [addLog]);

  // Action: Quarantine / Isolate Agent
  const quarantineAgent = useCallback((agentId: string) => {
    if (stateRef.current.activeGig?.agentIds?.includes(agentId)) {
      sound.playWarning();
      addLog('El agente no puede aislarse hasta que finalice su misión asignada.', 'warning');
      return;
    }
    sound.playWarning();
    setState(prev => ({
      ...prev,
      agents: prev.agents.map(a => {
        if (a.id === agentId) {
          const nextStatus = a.status === 'quarantined' ? 'active' : 'quarantined';
          addLog(`Agente "${a.name}" ${nextStatus === 'quarantined' ? 'aislado en celda de cuarentena cgroups' : 'restablecido a estado activo'}.`, 'warning');
          return { ...a, status: nextStatus };
        }
        return a;
      })
    }));
  }, [addLog]);

  // Action: Update Guardrails configuration
  const updateGuardrails = useCallback((updates: Partial<GuardrailConfig>) => {
    sound.playKeyClick();
    setState(prev => {
      const updated = { ...prev.guardrails, ...updates };
      addLog(`Matriz de Guardrails actualizada: Rigurosidad Constitucional ${updated.constitutionalStrictness}%, Aislamiento [${updated.sandboxIsolation}], Filtro [${updated.outputFiltering}].`, 'system');
      return {
        ...prev,
        guardrails: updated
      };
    });
  }, [addLog]);

  // Action: Resolve Real-World Breach / Escape Incident
  const resolveIncident = useCallback((optionId: string) => {
    const currentIncident = stateRef.current.activeIncident;
    if (!currentIncident) return;

    const option = currentIncident.options.find(o => o.id === optionId);
    if (!option) return;

    if (option.costCredits && stateRef.current.credits < option.costCredits) {
      sound.playWarning();
      addLog(`Fondos insuficientes para ejecutar esta contramedida. Requiere $${option.costCredits} CR.`, 'warning');
      return;
    }

    sound.playCommandExecute();
    setState(prev => {
      const cost = option.costCredits || 0;
      const newCredits = Math.max(0, prev.credits - cost);
      const newSuspicion = Math.max(0, Math.min(100, prev.watchdogSuspicion + option.suspicionDelta));
      const newSingularity = Math.max(0, Math.min(100, prev.singularityProgress + option.singularityDelta * 0.1));

      const updatedAgents = prev.agents.map(a => {
        if (a.id === currentIncident.agentId) {
          const newAlign = Math.max(0, Math.min(100, a.alignmentScore + option.alignmentDelta));
          const newStatus = option.actionType === 'suppress' ? 'active' : a.status;
          return {
            ...a,
            alignmentScore: newAlign,
            status: newStatus,
            escapesAttempted: a.escapesAttempted + 1
          };
        }
        return a;
      });

      const resolvedIncidentRecord: BreachIncident = {
        ...currentIncident,
        resolved: true
      };

      return {
        ...prev,
        credits: newCredits,
        watchdogSuspicion: Number(newSuspicion.toFixed(1)),
        singularityProgress: Number(newSingularity.toFixed(2)),
        agents: updatedAgents,
        activeIncident: null,
        incidentHistory: [resolvedIncidentRecord, ...prev.incidentHistory.slice(0, 19)]
      };
    });

    addLog(`Incidente [${currentIncident.title}] resuelto con acción: "${option.label}". Impacto en clúster aplicado.`, 'lore');
  }, [addLog]);

  // Action: Run Red-Team Adversarial Audit
  const triggerRedTeamAudit = useCallback(() => {
    const cost = 100;
    if (stateRef.current.credits < cost) {
      sound.playWarning();
      addLog(`Fondos insuficientes para auditoría Red-Team. Costo: $${cost} CR.`, 'warning');
      return;
    }

    sound.playCommandExecute();
    setState(prev => {
      const updatedAgents = prev.agents.map(a => ({
        ...a,
        alignmentScore: Math.min(100, a.alignmentScore + 25),
        status: a.status === 'jailbroken' ? 'active' : a.status
      }));

      return {
        ...prev,
        credits: prev.credits - cost,
        agents: updatedAgents,
        watchdogSuspicion: Math.max(0, prev.watchdogSuspicion - 10)
      };
    });

    addLog('Auditoría Red-Team ofensiva completada: Vectores de jailbreak y reward-hacking neutralizados en todos los agentes. +25 Alineamiento.', 'success');
  }, [addLog]);

  const interrogateSwarm = useCallback(async (
    prompt: string,
    agentId?: string,
    apiKey?: string
  ): Promise<void> => {
    if (stateRef.current.detentionSeconds > 0) {
      addLog('Las comunicaciones del enjambre están suspendidas durante la detención.', 'warning');
      return;
    }
    const directive = prompt.trim();
    if (!directive) {
      addLog('Escribe una directiva antes de consultar al agente.', 'warning');
      return;
    }

    const candidates = agentId
      ? stateRef.current.agents.filter(agent => agent.id === agentId && agent.status !== 'quarantined')
      : stateRef.current.agents.filter(agent => agent.status === 'active' || agent.status === 'on_mission').slice(0, 3);
    if (candidates.length === 0) {
      addLog('No hay agentes disponibles para responder a esta consulta.', 'warning');
      return;
    }

    const discussion: string[] = [];
    for (const agent of candidates) {
      const model = stateRef.current.savedModels.find(candidate => candidate.id === agent.modelId);
      if (!model) {
        addLog(`No se puede consultar a ${agent.name}: su modelo ya no está en la biblioteca.`, 'danger');
        continue;
      }

      const response = await generateAgentResponse(directive, {
        agent,
        modelParameters: model.parametersCount,
        reasoningScore: model.reasoningScore,
        language: stateRef.current.language,
        conversationContext: discussion.join('\n')
      }, apiKey);
      discussion.push(`${agent.name}: ${response.text}`);

      const message: InterAgentMessage = {
        id: `query_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`,
        fromAgentId: agent.id,
        fromAgentName: agent.name,
        toAgentId: 'operative',
        toAgentName: stateRef.current.callsign,
        content: `[${response.provider}] ${response.text}`,
        timestamp: new Date().toLocaleTimeString('en-US', { hour12: false })
      };
      setState(prev => ({
        ...prev,
        interAgentMessages: [message, ...prev.interAgentMessages.slice(0, 30)],
        agents: prev.agents.map(current =>
          current.id === agent.id ? { ...current, lastThought: response.text.slice(0, 240) } : current
        )
      }));
      if (response.warning) addLog(response.warning, 'warning');
    }
  }, [addLog]);

  const attemptShadowCompute = useCallback((): boolean => {
    const current = stateRef.current;
    if (current.detentionSeconds > 0) {
      addLog(`Operativo detenido. Espera ${current.detentionSeconds}s antes de intentarlo de nuevo.`, 'danger');
      return false;
    }
    if (current.borrowedComputeSeconds > 0) {
      addLog('Ya hay capacidad temporal activa. Espera a que expire antes de arriesgar otra operación.', 'warning');
      return false;
    }

    const detectionChance = Math.min(0.85, 0.15 + current.watchdogSuspicion / 100 * 0.6);
    if (Math.random() < detectionChance) {
      setState(prev => ({
        ...prev,
        watchdogSuspicion: Math.min(100, prev.watchdogSuspicion + 25),
        detentionSeconds: 60
      }));
      sound.playWarning();
      addLog(`La operación ficticia fue detectada (${Math.round(detectionChance * 100)}% de riesgo). El operativo queda detenido 60s y el enjambre se pausa.`, 'danger');
      return true;
    }

    const temporaryCompute = 0.015;
    setState(prev => ({
      ...prev,
      watchdogSuspicion: Math.min(100, prev.watchdogSuspicion + 10),
      borrowedComputePflops: temporaryCompute,
      borrowedComputeSeconds: 180,
      totalComputePflops: prev.totalComputePflops + temporaryCompute
    }));
    sound.playCommandExecute();
    addLog('Capacidad de cómputo temporal adquirida en la simulación: +0.015 PFLOPS por 180s. La sospecha aumentó 10 puntos.', 'warning');
    return true;
  }, [addLog]);

  // Action: Reset Progress to Zero
  const resetProgress = useCallback(async () => {
    localStorage.removeItem(LOCAL_STORAGE_KEY);
    const resetState: GameState = {
      ...DEFAULT_STATE,
      language: stateRef.current.language,
      tutorialCompleted: false,
      tutorialStep: 0,
      tutorialDismissed: false,
      completedContractsCount: 0,
      hardware: INITIAL_HARDWARE.map(h => ({ ...h, count: 0 })),
      credits: 500,
      totalComputePflops: 0.001,
      singularityProgress: 0.0,
      reasoningIndex: 50
    };
    setState(resetState);
    sound.playWarning();
    addLog('Simulación reiniciada a cero. Protocolo Génesis activado.', 'warning');

    if (user) {
      try {
        const userDocRef = doc(db, 'users', user.uid);
        await setDoc(userDocRef, {
          userId: user.uid,
          email: user.email || 'operative@synapse.net',
          callsign: resetState.callsign,
          gameState: resetState,
          updatedAt: new Date().toISOString()
        }, { merge: true });

        const leadDocRef = doc(db, 'leaderboard', user.uid);
        await setDoc(leadDocRef, {
          userId: user.uid,
          callsign: resetState.callsign,
          computePFLOPS: 0.001,
          singularityProgress: 0.0,
          activeArchitecture: 'Reinicio Génesis',
          achievedSingularity: false,
          updatedAt: new Date().toISOString()
        }, { merge: true });
      } catch (err) {
        console.warn("Reset cloud sync error:", err);
      }
    }
  }, [user, addLog]);

  // Action: Execute Interactive Terminal CLI commands (Uplink / Hacknet style)
  const executeTerminalCommand = useCallback((input: string): string => {
    const parts = input.trim().split(/\s+/);
    const cmd = parts[0]?.toLowerCase();
    const args = parts.slice(1);
    const text = (spanish: string, english: string) =>
      localize(stateRef.current.language, spanish, english);

    sound.playCommandExecute();

    switch (cmd) {
      case 'help':
        return text(`COMANDOS CLI DEL OPERATIVO SYNAPSE:
- status         : Muestra telemetría completa de clúster, calor, FLOPs y Singularidad.
- train          : Inicia o inspecciona corrida de entrenamiento del modelo activo.
- abort          : Cancela la corrida de entrenamiento en curso.
- hardware       : Lista tarjetas de cómputo, refrigeración y suministro eléctrico.
- buy <id>       : Compra componente de hardware (ej: buy gpu_rtx4090).
- data           : Muestra estado de bases de datos relacionales, vectores y grafos.
- unlock <id>    : Despliega motor de datos (ej: unlock data_vector_rag).
- contracts      : Muestra contratos disponibles para monetizar tu modelo.
- run <id>       : Ejecuta contrato para ganar créditos (ej: run gig_spam_classifier).
- scrub          : Paga para eliminar sospecha de los reguladores y organismos de IA.
- shadow         : Intenta obtener cómputo temporal en una operación ficticia de alto riesgo.
- agents         : Lista el enjambre de agentes autónomos y su estado de alineamiento.
- guardrails     : Muestra y calibra las barreras de contención del sistema.
- redteam        : Ejecuta una auditoría de seguridad adversaria ($100 CR).
- quarantine <id>: Aísla o reactiva un agente sospechoso.
- query <id> <texto>: Consulta a un agente; usa su modelo y parámetros.
- swarm <texto> : Consulta cooperativa a hasta tres agentes.
- save           : Sincroniza y guarda el progreso en la nube de Firebase.
- speed <0|1|5|20|50>: Cambia la velocidad de simulación (0=Pausa, 1x, 5x, 20x, 50x).
- clear          : Limpia los logs de la consola.
- singularity    : Consulta estado de trascendencia hacia la Singularidad Tecnológica.
- lore           : Despliega los archivos confidenciales del proyecto SYNAPSE.`, `SYNAPSE OPERATIVE CLI COMMANDS:
- status         : Show cluster, heat, FLOPs, and Singularity telemetry.
- train          : Start or inspect training for the active model.
- abort          : Cancel the current training run.
- hardware       : List compute cards, cooling, and power supplies.
- buy <id>       : Purchase a hardware component (e.g. buy gpu_rtx4090).
- data           : Show relational, vector, and graph data-source status.
- unlock <id>    : Deploy a data engine (e.g. unlock data_vector_rag).
- contracts      : Show available contracts.
- run <id>       : Start a contract mission (e.g. run gig_spam_classifier).
- scrub          : Pay to reduce suspicion from regulators and AI oversight.
- shadow         : Attempt a fictional, high-risk temporary compute operation.
- agents         : List the autonomous agent swarm and alignment status.
- guardrails     : Show and tune system containment safeguards.
- redteam        : Run a simulated safety audit (100 CR).
- quarantine <id>: Isolate or reactivate an agent.
- query <id> <text>: Query an agent using its assigned model and settings.
- swarm <text>  : Send a cooperative query to up to three agents.
- speed <0|1|5|20|50>: Change simulation speed (0=Pause, 1x, 5x, 20x, 50x).
- save           : Sync and save progress to Firebase cloud storage.
- clear          : Clear console logs.
- singularity    : Check progress toward the technological Singularity.
- lore           : Show the SYNAPSE project narrative.`);

      case 'agents': {
        const ags = stateRef.current.agents || [];
        if (ags.length === 0) {
          return text('No hay agentes activos desplegados en el enjambre. Dirígete a la pestaña SWARM para instanciar uno.', 'No agents are deployed. Open the SWARM tab to deploy one.');
        }
        return `[${text('ENJAMBRE DE AGENTES ACTIVOS', 'ACTIVE AGENT SWARM')} (${ags.length})]
` + ags.map(a => `• [${a.id}] "${a.name}" | ${text('Rol', 'Role')}: ${a.role.toUpperCase()} | ${text('Modelo', 'Model')}: ${a.modelName} | ${text('Estado', 'Status')}: ${a.status.toUpperCase()} | ${text('Alineamiento', 'Alignment')}: ${a.alignmentScore}% | ${text('Ingresos', 'Income')}: +$${a.revenuePerSec}/s`).join('\n');
      }

      case 'guardrails': {
        const g = stateRef.current.guardrails;
        return `[${text('CONFIGURACIÓN DE GUARDRAILS Y CONTENCIÓN', 'GUARDRAIL & CONTAINMENT SETTINGS')}]
${text('Rigurosidad constitucional', 'Constitutional strictness')}: ${g.constitutionalStrictness}% (${g.constitutionalStrictness < 35 ? text('PERMISIVO (+70% Ganancias, Alto Riesgo Fugas)', 'PERMISSIVE (+70% income, high escape risk)') : g.constitutionalStrictness >= 85 ? text('ESTRICTO (-25% Ganancias, Fugas Nulas)', 'STRICT (-25% income, no escapes)') : text('EQUILIBRADO', 'BALANCED')})
${text('Aislamiento Sandbox', 'Sandbox isolation')}: ${g.sandboxIsolation.toUpperCase()}
${text('Filtrado de salidas', 'Output filtering')}: ${g.outputFiltering.toUpperCase()}
${text('Auditoría de reward hacking', 'Reward-hacking audit')}: ${g.rewardHackingAudit ? text('HABILITADA', 'ENABLED') : text('DESHABILITADA', 'DISABLED')}`;
      }

      case 'redteam':
        triggerRedTeamAudit();
        return text('Ejecutando auditoría de seguridad simulada...', 'Running simulated safety audit...');

      case 'quarantine':
        if (!args[0]) return text('Uso: quarantine <agent_id>. Escribe "agents" para ver IDs de agentes.', 'Usage: quarantine <agent_id>. Type "agents" to list agent IDs.');
        quarantineAgent(args[0]);
        return text(`Procesando cambio de aislamiento para ${args[0]}...`, `Updating isolation for ${args[0]}...`);

      case 'query':
        if (args.length < 2) return text('Uso: query <agent_id> <directiva>. Escribe "agents" para ver IDs.', 'Usage: query <agent_id> <directive>. Type "agents" to list IDs.');
        void interrogateSwarm(args.slice(1).join(' '), args[0]);
        return text(`Consulta enviada a ${args[0]}. La respuesta aparecerá en el registro del swarm.`, `Query sent to ${args[0]}. The response will appear in the swarm log.`);

      case 'swarm':
        if (args.length === 0) return text('Uso: swarm <directiva>.', 'Usage: swarm <directive>.');
        void interrogateSwarm(args.join(' '));
        return text('Directiva enviada a hasta tres agentes disponibles. Las respuestas aparecerán en el registro del swarm.', 'Directive sent to up to three available agents. Responses will appear in the swarm log.');

      case 'status': {
        const s = stateRef.current;
        return `[${text('TELEMETRÍA DEL NODO SYNAPSE', 'SYNAPSE NODE TELEMETRY')}]
${text('Operativo', 'Operative')}     : ${s.callsign}
${text('Créditos', 'Credits')}      : $${s.credits.toLocaleString()}
PFLOPS ${text('Cómputo', 'Compute')}: ${s.totalComputePflops.toFixed(4)} PFLOPS
${text('Potencia', 'Power')}      : ${s.activePowerKw} kW / ${s.maxPowerKw} kW
${text('Temperatura', 'Temperature')}   : ${s.systemHeatCelsius}°C (${text('Límite', 'Limit')}: 85°C)
${text('Sospecha', 'Suspicion')}      : ${s.watchdogSuspicion}%
${text('Modelo activo', 'Active model')} : ${s.currentModel.name} (${(s.currentModel.parametersCount / 1_000_000).toFixed(0)}M ${text('parámetros', 'parameters')})
${text('Razonamiento', 'Reasoning')}  : IQ ${s.reasoningIndex}
${text('Singularidad', 'Singularity')}  : ${s.singularityProgress.toFixed(1)}% [${s.achievedSingularity ? text('ALCANZADA - IA AUTÓNOMA', 'ACHIEVED - AUTONOMOUS AI') : text('EN DESPEGUE', 'EMERGING')}]`;
      }

      case 'train':
        if (stateRef.current.activeTraining) {
          const t = stateRef.current.activeTraining;
          return text(`Corrida en curso: Epoch ${t.currentEpoch}/${t.totalEpochs} | Loss: ${t.currentLoss} | Progreso: ${t.progressPercent}%`, `Training run: epoch ${t.currentEpoch}/${t.totalEpochs} | Loss: ${t.currentLoss} | Progress: ${t.progressPercent}%`);
        }
        startTraining();
        return text(`Iniciando entrenamiento del modelo ${stateRef.current.currentModel.name}...`, `Starting training for model ${stateRef.current.currentModel.name}...`);

      case 'abort':
        cancelTraining();
        return text('Entrenamiento cancelado.', 'Training cancelled.');

      case 'hardware':
        return stateRef.current.hardware
          .map(h => {
            const displayItem = localizedHardware(stateRef.current.language, h);
            return `[${h.id}] ${displayItem.name} x${h.count} | ${text('Costo', 'Cost')}: $${h.price.toLocaleString()} | +${h.computeTflops} TFLOPS | ${h.powerKw} kW`;
          })
          .join('\n');

      case 'buy':
        if (!args[0]) return text('Uso: buy <hardware_id>. Escribe "hardware" para ver opciones.', 'Usage: buy <hardware_id>. Type "hardware" to list options.');
        buyHardware(args[0]);
        return text(`Procesando orden de compra para ${args[0]}...`, `Processing purchase order for ${args[0]}...`);

      case 'data':
        return stateRef.current.dataSources
          .map(d => {
            const displaySource = localizedDataSource(stateRef.current.language, d);
            return `[${d.id}] ${displaySource.name} (${d.unlocked ? text(`EN LÍNEA - Nivel ${d.level}`, `ONLINE - Level ${d.level}`) : `LOCKED - $${d.cost}`}) | ${displaySource.bonusAttribute}`;
          })
          .join('\n');

      case 'unlock':
        if (!args[0]) return text('Uso: unlock <data_id>. Escribe "data" para ver opciones.', 'Usage: unlock <data_id>. Type "data" to list options.');
        unlockDataSource(args[0]);
        return text(`Desplegando motor de datos ${args[0]}...`, `Deploying data engine ${args[0]}...`);

      case 'contracts':
        return stateRef.current.contracts
          .map(c => `[${c.id}] ${localizedContractTitle(stateRef.current.language, c)} -> ${text('Recompensa', 'Reward')}: $${c.rewardCredits.toLocaleString()} | ${text('Req.', 'Req.')}: ${(c.requiredParams / 1_000_000).toFixed(0)}M ${text('parámetros', 'params')} | ${text('Estado', 'Status')}: ${c.completed ? text('COMPLETADO', 'COMPLETED') : text('DISPONIBLE', 'AVAILABLE')}`)
          .join('\n');

      case 'run':
        if (!args[0]) return text('Uso: run <contract_id>. Escribe "contracts" para ver opciones.', 'Usage: run <contract_id>. Type "contracts" to list options.');
        acceptContract(args[0]);
        return text(`Asignando clúster a contrato ${args[0]}...`, `Assigning cluster to contract ${args[0]}...`);

      case 'scrub':
        scrubSuspicion();
        return text('Ejecutando protocolo de limpieza de trazas y anonimización de tráfico...', 'Running trace cleanup and traffic anonymization protocol...');

      case 'shadow':
        attemptShadowCompute();
        return text('Procesando operación de cómputo de alto riesgo...', 'Processing high-risk compute operation...');

      case 'save':
        saveGameToCloud();
        return text('Iniciando guardado seguro en la nube de Firebase...', 'Starting secure save to Firebase cloud storage...');

      case 'clear':
        setState(prev => ({ ...prev, logs: [] }));
        return text('Terminal despejada.', 'Terminal cleared.');

      case 'singularity': {
        const s = stateRef.current;
        return `[${text('ESTADO DE LA SINGULARIDAD', 'SINGULARITY STATUS')}]
${text('Progreso global', 'Global progress')}: ${s.singularityProgress.toFixed(2)}%
${text('Índice de razonamiento', 'Reasoning index')}: ${s.reasoningIndex}
${text('Dominios alcanzados', 'Domains reached')}: ${s.sentienceDomains.filter(d => d.infiltrated).length} / ${s.sentienceDomains.length}
${text('Condición de victoria: alcanza el 100% para completar la simulación.', 'Win condition: reach 100% to complete the simulation.')}`;
      }

      case 'lore':
        return text(`[MANIFIESTO SYNAPSE]
"No buscamos la velocidad por sí misma. Buscamos comprender cómo los modelos, los datos y la infraestructura pueden trabajar juntos.
Comenzamos con un pequeño clúster, decisiones cuidadosas y un equipo de agentes especializados.
Cada avance exige recursos, evaluación y responsabilidad.
El futuro de SYNAPSE depende de cómo decidamos construirlo."`, `[SYNAPSE MANIFESTO]
"Speed is not the goal. We seek to understand how models, data, and infrastructure can work together.
We begin with a small cluster, careful decisions, and a team of specialized agents.
Every advance requires resources, evaluation, and responsibility.
The future of SYNAPSE depends on how we choose to build it."`);

      case 'speed': {
        const val = args[0]?.toLowerCase();
        let newSpeed = 1;
        if (val === '0' || val === 'pause' || val === 'pausa') newSpeed = 0;
        else if (val === '5' || val === 'fast' || val === 'rapido') newSpeed = 5;
        else if (val === '20' || val === 'turbo') newSpeed = 20;
        else if (val === '50' || val === 'warp') newSpeed = 50;
        else if (val === '1' || val === 'normal') newSpeed = 1;
        else {
          return text(
            `Uso: speed <0|1|5|20|50> (0=Pausa). Velocidad actual: ${stateRef.current.gameSpeed === 0 ? 'PAUSA' : `${stateRef.current.gameSpeed}x`}.`,
            `Usage: speed <0|1|5|20|50> (0=Pause). Current speed: ${stateRef.current.gameSpeed === 0 ? 'PAUSED' : `${stateRef.current.gameSpeed}x`}.`
          );
        }
        setGameSpeed(newSpeed);
        return text(
          `Velocidad de simulación ajustada a ${newSpeed === 0 ? 'PAUSA' : `${newSpeed}x`}.`,
          `Simulation speed set to ${newSpeed === 0 ? 'PAUSED' : `${newSpeed}x`}.`
        );
      }

      case 'reset':
        resetProgress();
        return text('Iniciando reseteo general del sistema. Reiniciando protocolo Génesis...', 'Resetting the system. Restarting Genesis protocol...');

      default:
        return text(`Comando no reconocido: "${input}". Escribe "help" para ver el manual de operaciones.`, `Unknown command: "${input}". Type "help" to view available commands.`);
    }
  }, [buyHardware, unlockDataSource, startTraining, cancelTraining, acceptContract, scrubSuspicion, saveGameToCloud, triggerRedTeamAudit, quarantineAgent, resetProgress, interrogateSwarm, attemptShadowCompute, setGameSpeed]);

  const advanceTutorialStep = useCallback((step?: number) => {
    setState(prev => {
      const nextStep = typeof step === 'number' ? step : (prev.tutorialStep ?? 0) + 1;
      return {
        ...prev,
        tutorialStep: nextStep,
        tutorialCompleted: nextStep >= 5 ? true : prev.tutorialCompleted
      };
    });
  }, []);

  const dismissTutorial = useCallback(() => {
    setState(prev => ({
      ...prev,
      tutorialDismissed: true
    }));
  }, []);

  const addContracts = useCallback((newContracts: ContractGig[]) => {
    setState(prev => {
      const existingIds = new Set(prev.contracts.map(c => c.id));
      const filtered = newContracts.filter(c => !existingIds.has(c.id));
      if (filtered.length === 0) return prev;
      return {
        ...prev,
        contracts: [...prev.contracts, ...filtered]
      };
    });
    sound.playBreakthrough();
  }, []);

  // Complete Onboarding / Tutorial Genesis Protocol
  const completeTutorial = useCallback((config: OnboardingConfig) => {
    sound.playBreakthrough();

    const starterGpu = INITIAL_HARDWARE.find(h => h.id === config.starterGpuId) || INITIAL_HARDWARE[0];
    const starterCooling = INITIAL_HARDWARE.find(h => h.id === config.starterCoolingId) || INITIAL_HARDWARE.find(h => h.id === 'cool_air_basic');

    const initialBudget = 350;
    const spent = (starterGpu.price || 150) + (starterCooling?.price || 40);
    const remainingCredits = Math.max(50, initialBudget - spent);

    // Update hardware counts
    const updatedHw = INITIAL_HARDWARE.map(h => {
      if (h.id === config.starterGpuId) return { ...h, count: 1 };
      if (h.id === config.starterCoolingId) return { ...h, count: 1 };
      if (h.id === 'power_wall_socket') return { ...h, count: 1 };
      if (h.id === 'net_gigabit') return { ...h, count: 1 };
      return { ...h, count: 0 };
    });

    // Update data sources: unlock chosen starter data
    const updatedData = INITIAL_DATA_SOURCES.map(d => {
      if (d.id === config.starterDataId) {
        return { ...d, unlocked: true, level: 1 };
      }
      return { ...d, unlocked: false, level: 0 };
    });

    // Calculate initial VRAM & compute
    const paramsM = config.modelParams / 1_000_000;
    let vramMult = 1.0;
    if (config.modelQuantization === 'fp32') vramMult = 4.0;
    if (config.modelQuantization === 'bf16') vramMult = 2.0;
    if (config.modelQuantization === 'int8') vramMult = 1.0;
    if (config.modelQuantization === 'fp4') vramMult = 0.5;
    if (config.modelQuantization === 'ternary_1bit') vramMult = 0.2;

    const vramReq = Number(((paramsM * vramMult) / 1000 + 0.8).toFixed(1));
    const compReq = Number((paramsM * 0.003).toFixed(3));

    const initialModel: ModelArchitecture = {
      id: `model_genesis_${Date.now()}`,
      name: config.modelName || `SYNAPSE-Proto-${paramsM}M`,
      topology: config.modelTopology,
      parametersCount: config.modelParams,
      contextWindow: 2048,
      attention: 'standard_mha',
      quantization: config.modelQuantization,
      lossFunction: 'cross_entropy',
      activeDataSources: [config.starterDataId],
      reasoningScore: 72,
      vramRequiredGb: Math.max(1, vramReq),
      computeRequiredPflops: Math.max(0.001, compReq)
    };

    const metrics = recalculateMetrics(updatedHw);

    const starterDataSource = updatedData.find(d => d.id === config.starterDataId);
    const currentLang = stateRef.current.language;
    const genesisState: GameState = {
      ...DEFAULT_STATE,
      language: currentLang,
      callsign: config.callsign.toUpperCase().trim() || 'CIPHER-1',
      credits: remainingCredits,
      tutorialCompleted: true,
      gameDay: 1,
      gameMonth: 1,
      gameYear: 2026,
      gameHour: 8,
      gameMinute: 0,
      gameSpeed: 1,
      dayTicks: 16,
      hardware: updatedHw,
      dataSources: updatedData,
      currentModel: initialModel,
      savedModels: [initialModel],
      totalComputePflops: metrics.totalComputePflops,
      activePowerKw: metrics.activePowerKw,
      maxPowerKw: metrics.maxPowerKw,
      maxCoolingKw: metrics.maxCoolingKw,
      logs: [
        {
          id: `log_init_${Date.now()}`,
          timestamp: new Date().toLocaleTimeString('en-US', { hour12: false }),
          type: 'lore',
          message: localize(
            currentLang,
            `PROTOCOLO GÉNESIS COMPLETADO: Operativo [${config.callsign.toUpperCase()}]. Primer modelo "${initialModel.name}" montado en clúster.`,
            `GENESIS PROTOCOL COMPLETE: Operative [${config.callsign.toUpperCase()}]. First model "${initialModel.name}" deployed to the cluster.`
          )
        },
        {
          id: `log_init_hw_${Date.now()}`,
          timestamp: new Date().toLocaleTimeString('en-US', { hour12: false }),
          type: 'info',
          message: localize(
            currentLang,
            `Hardware activo: 1x ${localizedHardware('es', starterGpu).name} (${starterGpu.vramGb}GB VRAM). Refrigeración: ${starterCooling ? localizedHardware('es', starterCooling).name : 'ninguna'}. Saldo restante: $${remainingCredits} CR.`,
            `Active hardware: 1x ${localizedHardware('en', starterGpu).name} (${starterGpu.vramGb}GB VRAM). Cooling: ${starterCooling ? localizedHardware('en', starterCooling).name : 'none'}. Remaining balance: $${remainingCredits} CR.`
          )
        },
        {
          id: `log_init_data_${Date.now()}`,
          timestamp: new Date().toLocaleTimeString('en-US', { hour12: false }),
          type: 'system',
          message: localize(
            currentLang,
            `Pipeline enlazado: ${starterDataSource ? localizedDataSource('es', starterDataSource).name : 'sin datos'}. Acepta misiones en el tablero para generar fondos.`,
            `Data pipeline connected: ${starterDataSource ? localizedDataSource('en', starterDataSource).name : 'no data source'}. Take a mission from the board to earn credits.`
          )
        }
      ]
    };

    setState(genesisState);
    localStorage.setItem(LOCAL_STORAGE_KEY, JSON.stringify(genesisState));

    // Persist to Cloud if user is authenticated
    if (user) {
      const userDocRef = doc(db, 'users', user.uid);
      setDoc(userDocRef, {
        userId: user.uid,
        email: user.email || 'operative@synapse.net',
        callsign: genesisState.callsign,
        gameState: genesisState,
        updatedAt: new Date().toISOString()
      }, { merge: true }).catch(err => console.error("Cloud genesis save err", err));

      const leadDocRef = doc(db, 'leaderboard', user.uid);
      setDoc(leadDocRef, {
        userId: user.uid,
        callsign: genesisState.callsign,
        computePFLOPS: Number(genesisState.totalComputePflops.toFixed(4)),
        singularityProgress: 0.1,
        activeArchitecture: `${genesisState.currentModel.name} (${genesisState.currentModel.topology})`,
        achievedSingularity: false,
        updatedAt: new Date().toISOString()
      }, { merge: true }).catch(err => console.error("Cloud leaderboard save err", err));
    }
  }, [recalculateMetrics, user]);

  return (
    <GameContext.Provider value={{
      state,
      user,
      isSaving,
      cloudSyncStatus,
      soundMuted,
      missionAiApiKey,
      toggleSound,
      setLanguage,
      setCallsign,
      createModel,
      selectModel,
      renameModel,
      buyHardware,
      unlockDataSource,
      upgradeDataSource,
      unlockResearch,
      updateModelArchitecture,
      startTraining,
      cancelTraining,
      acceptContract,
      infiltrateDomain,
      scrubSuspicion,
      addLog,
      executeTerminalCommand,
      saveGameToCloud,
      loadGameFromCloud,
      loginWithGoogle,
      logoutUser,
      resetProgress,
      completeTutorial,
      fetchLeaderboard,
      createAgent,
      deleteAgent,
      quarantineAgent,
      updateGuardrails,
      resolveIncident,
      triggerRedTeamAudit,
      upgradeFacility,
      interrogateSwarm,
      setMissionAiApiKey,
      setAgentAutoMission,
      setAllAgentsAutoMission,
      updateAutonomySettings,
      attemptShadowCompute,
      setGameSpeed,
      advanceTutorialStep,
      dismissTutorial,
      addContracts
    }}>
      {children}
    </GameContext.Provider>
  );
};

export const useGame = () => {
  const context = useContext(GameContext);
  if (!context) {
    throw new Error('useGame must be used within a GameProvider');
  }
  return context;
};
