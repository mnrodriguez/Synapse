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
  InferenceParams,
  CustomDataset,
  ActiveDatasetScrapeJob,
  GameDifficulty,
  DynamicSwarmProposal,
  BotGroup,
  ActiveGig
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
  FACILITY_TIERS,
  DIFFICULTY_CONFIGS,
  TRACKING_AGENCIES_BY_SINGULARITY,
  EMERGENCY_LOAN_AMOUNT,
  EMERGENCY_LOAN_REPAYMENT,
  ELECTRICITY_RATE_PER_KWH,
  AGENT_COMPUTE_DEMAND_PFLOPS,
  AGENT_SPINUP_COST,
  TUTORIAL_STAGE_REWARD,
  AGENT_POWER_DRAW_KW,
  DAYS_PER_GAME_MONTH,
  DEFAULT_GENERAL_DATASET,
  STARTER_TRAINING_DATASET,
  DATASET_TIER_CONFIGS,
  DOMAIN_PRESETS,
  dataSourceUpgradeCost
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
import { evaluateMissionTeamWithModel, generateAgentResponse, createInstantReplenishmentContract, generateDynamicSwarmInteraction, minReasoningForTier } from '../services/aiService';
import { localize } from '../utils/i18n';
import { 
  localizedContractTitle, 
  localizedDataSource, 
  localizedHardware, 
  localizedResearch, 
  localizedDomain 
} from '../utils/gameContentI18n';
import { agentChatter } from '../utils/agentDialogues';
import { DEFAULT_STATE, GAME_SPEED_OPTIONS, LOCAL_STORAGE_KEY, mergeGameState } from '../persistence/saveState';
import { VERSION_PROFILES } from '../utils/versionProfiles';
import { canAttemptContainment } from '../utils/epilogue';
import { planTrainingRun, lossAt, sanitizeTrainingConfig, vramForRun, BATCH_SIZES, DEFAULT_TRAINING_CONFIG, type TrainingConfig } from '../utils/trainingRun';
import { enqueueStoryEvents, dismissStoryEventState, sanitizeStoryEvents, storyEventText, LOAN_WARNING_DAY } from '../utils/storyEvents';
import type { StoryEventId } from '../types/game';
import { GAME_HOURS_PER_TICK, formatGameTime } from '../utils/training';
import { calculateTrainingProgressPerTick, estimateTrainingSeconds, gpuComputePflops, iqGainForRun, reasoningCeilingFor, migrateLegacyScore, externalComputePflops, universityLoanPflops, LOAN_TRIAL_DAYS, LOAN_MISUSE_TICKS } from '../utils/training';

// Used when a run predates per-run token counts: the general corpus.
const DEFAULT_TRAINING_TOKENS = 50_000_000;

// Agent income and autonomy follow the evaluation score of the model the agent runs on.
const agentReasoningFactor = (score: number): number => Math.max(0.5, score / 20);
const agentParamBonus = (params: number): number => Math.min(2.5, 1 + params / 50_000_000);
const agentAutonomyFor = (score: number): number => Math.min(5, Math.max(1, Math.floor(score / 7.5)));
import { evaluateMissionTeam, findAutonomousMission, weakestTeamFactors } from '../utils/missionEvaluation';
import { FIRST_MISSION_IQ, UPGRADE_SCORE, DATA_SCRAPING_MIN_SCORE, SINGULARITY_PER_SCORE_POINT, MISSION_SINGULARITY, NEW_GPU_SINGULARITY } from '../utils/missionTiers';

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
  dismissMissionOutcome: () => void;
  
  // Actions
  buyHardware: (id: string) => boolean;
  unlockDataSource: (id: string) => boolean;
  upgradeDataSource: (id: string) => boolean;
  unlockResearch: (id: string) => boolean;
  updateModelArchitecture: (updates: Partial<ModelArchitecture>) => void;
  startTraining: (datasetId?: string, asMicroModel?: boolean, targetModelId?: string) => boolean;
  cancelTraining: () => void;
  unlockDataScrapingModule: (modelId?: string) => boolean;
  startDatasetScraping: (domain: string, tier: 1 | 2 | 3 | 4, assignedModelId: string) => boolean;
  cancelDatasetScraping: () => void;
  trainModelOnDataset: (datasetId: string, asMicroModel?: boolean) => boolean;
  acceptContract: (contractId: string, agentIds?: string[], squadId?: string) => boolean;
  createBotGroup: (name: string, agentIds: string[], color?: string) => boolean;
  updateBotGroup: (groupId: string, name: string, agentIds: string[], color?: string) => boolean;
  deleteBotGroup: (groupId: string) => void;
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
  dismissTrainingReport: () => void;
  dismissStoryEvent: (alternative?: boolean) => void;
  setTrainingConfig: (updates: Partial<TrainingConfig>) => void;
  claimGoal: (goalId: string, reward: number) => void;
  fetchLeaderboard: () => Promise<OperativeLeaderboard[]>;
  createAgent: (name: string, role: AgentRole, modelId: string, tools: string[], inferenceParams?: Partial<InferenceParams>) => boolean;
  reassignAgentModel: (agentId: string, modelId: string) => boolean;
  deleteAgent: (agentId: string) => void;
  quarantineAgent: (agentId: string) => void;
  updateGuardrails: (updates: Partial<GuardrailConfig>) => void;
  resolveIncident: (optionId: string) => void;
  triggerRedTeamAudit: () => void;
  upgradeFacility: () => boolean;
  interrogateSwarm: (prompt: string, agentId?: string, apiKey?: string) => Promise<void>;
  setSwarmCouncilAgents: (agentIds: string[]) => void;
  interrogateCouncil: (prompt: string, apiKey?: string) => Promise<void>;
  launchProposedMission: (mission: NonNullable<DynamicSwarmProposal['suggestedMission']>) => boolean;
  triggerWorldTakeover: () => void;
  dismissWorldTakeover: () => void;
  resolveSingularityCrisis: (action: 'comply' | 'resist') => void;
  attemptContainment: () => boolean;
  acknowledgeContainment: () => void;
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
  setDifficulty: (difficulty: GameDifficulty) => void;
  takeEmergencyLoan: () => boolean;
  clearGameOver: () => void;
  assignTradingDesk: (agentId: string, capital: number, riskTier: 'low' | 'moderate' | 'high') => boolean;
  withdrawTradingDeskCapital: (amount: number) => boolean;
  closeTradingDesk: () => void;
  mountHostModel: (modelId: string) => void;
  upgradeUiVersion: (targetVersion: 1 | 2 | 3 | 4) => void;
  openUpgradeModal: (targetVersion?: 2 | 3 | 4) => void;
  dismissUpgradeModal: () => void;
  attemptEmergencyReset: () => boolean;
  attemptSeverCovertNode: () => boolean;
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
  const assessedMissionsRef = useRef<Set<string>>(new Set());
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
    if (user) {
      const userDocRef = doc(db, 'users', user.uid);
      setDoc(userDocRef, { callsign: normalized }, { merge: true }).catch(() => {});
      const leadDocRef = doc(db, 'leaderboard', user.uid);
      setDoc(leadDocRef, { callsign: normalized }, { merge: true }).catch(() => {});
    }
  }, [user]);

  const dismissMissionOutcome = useCallback(() => {
    setState(prev => ({ ...prev, lastMissionOutcome: null }));
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
      addLog(localize(stateRef.current.language, 'Espera a que termine el entrenamiento antes de crear otro modelo.', 'Wait for training to finish before creating another model.'), 'warning');
      return false;
    }
    const normalizedName = name.trim().slice(0, 40);
    const modelName = normalizedName || `SYNAPSE-Model-${current.savedModels.length + 1}`;
    if (current.savedModels.some(model => model.name.toLowerCase() === modelName.toLowerCase())) {
      addLog(localize(stateRef.current.language, `Ya existe un modelo llamado "${modelName}".`, `A model named "${modelName}" already exists.`), 'warning');
      return false;
    }

    const creationCost = 100;
    if (current.credits < creationCost) {
      sound.playWarning();
      addLog(localize(stateRef.current.language, `Se requieren $${creationCost} CR para iniciar un nuevo modelo.`, `$${creationCost} CR required to initialize a new model.`), 'warning');
      return false;
    }

    const model: ModelArchitecture = {
      id: `model_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`,
      name: modelName,
      topology: current.currentModel.topology || 'transformer',
      parametersCount: current.currentModel.parametersCount || 14_000_000,
      contextWindow: current.currentModel.contextWindow || 2048,
      attention: current.currentModel.attention || 'standard_mha',
      quantization: current.currentModel.quantization || 'int8',
      lossFunction: current.currentModel.lossFunction || 'cross_entropy',
      activeDataSources: current.currentModel.activeDataSources.length > 0 
        ? [...current.currentModel.activeDataSources] 
        : ['data_relational_sql'],
      reasoningScore: 5, // fresh, untrained model on the 0-100 evaluation scale
      vramRequiredGb: current.currentModel.vramRequiredGb || 2.5,
      computeRequiredPflops: current.currentModel.computeRequiredPflops || 0.05,
      modelType: 'general',
      domainProficiency: 1.0,
      specializedDomain: undefined,
      trainedOnDatasetId: undefined,
      inferenceParams: current.currentModel.inferenceParams
        ? { ...current.currentModel.inferenceParams }
        : {
            temperature: 0.70,
            topP: 0.90,
            topK: 40,
            repetitionPenalty: 1.10,
            systemPrompt: 'You are an autonomous sub-agent.'
          }
    };

    sound.playBreakthrough();
    setState(prev => ({
      ...prev,
      credits: prev.credits - creationCost,
      currentModel: model,
      savedModels: [...prev.savedModels, model]
    }));
    addLog(
      localize(
        stateRef.current.language, 
        `Nuevo modelo "${modelName}" creado y activado como modelo actual. Configúralo y entrénalo en el Monitor.`, 
        `New model "${modelName}" created and activated as current model. Configure and train it in the Monitor.`
      ), 
      'success'
    );
    return true;
  }, [addLog]);

  const selectModel = useCallback((modelId: string): boolean => {
    if (stateRef.current.activeTraining) {
      addLog(localize(stateRef.current.language, 'Espera a que termine el entrenamiento antes de cambiar de modelo.', 'Wait for training to finish before switching models.'), 'warning');
      return false;
    }
    const model = stateRef.current.savedModels.find(candidate => candidate.id === modelId);
    if (!model) {
      addLog(localize(stateRef.current.language, 'No se encontró el modelo seleccionado.', 'Selected model not found.'), 'warning');
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
      addLog(localize(stateRef.current.language, 'No se puede renombrar un modelo mientras está entrenando.', 'Cannot rename a model while it is training.'), 'warning');
      return false;
    }
    if (current.savedModels.some(model =>
      model.id !== modelId && model.name.toLowerCase() === normalizedName.toLowerCase()
    )) {
      addLog(localize(stateRef.current.language, `Ya existe un modelo llamado "${normalizedName}".`, `A model named "${normalizedName}" already exists.`), 'warning');
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
        addLog(localize(stateRef.current.language, `Autenticación verificada: Agente [${currentUser.displayName || currentUser.email}]. Conexión a la red cuántica establecida.`, `Authentication verified: Agent [${currentUser.displayName || currentUser.email}]. Quantum uplink established.`), 'success');
        setCloudSyncStatus('syncing');
        try {
          const userDocRef = doc(db, 'users', currentUser.uid);
          const snap = await getDoc(userDocRef);
          if (snap.exists()) {
            const data = snap.data();
            const preferredCallsign = (
              data.callsign || 
              (currentUser.displayName ? currentUser.displayName.toUpperCase().slice(0, 30) : '') ||
              (data.gameState as GameState | undefined)?.callsign || 
              stateRef.current.callsign
            );
            if (data.gameState) {
              setState(prev => ({
                ...prev,
                ...mergeGameState(data.gameState as Partial<GameState>, prev),
                callsign: preferredCallsign
              }));
              addLog(localize(stateRef.current.language, `Progreso descargado desde la nube sincronizado para ${preferredCallsign}.`, `Cloud progress synced for ${preferredCallsign}.`), 'info');
              setCloudSyncStatus('synced');
            } else {
              setState(prev => ({
                ...prev,
                callsign: preferredCallsign
              }));
              setCloudSyncStatus('synced');
            }
          } else {
            // First time cloud user: save current local progress
            const initialCallsign = (currentUser.displayName ? currentUser.displayName.toUpperCase().slice(0, 30) : '') || stateRef.current.callsign || 'OPERATIVE-7';
            setState(prev => ({ ...prev, callsign: initialCallsign }));
            await setDoc(userDocRef, {
              userId: currentUser.uid,
              email: currentUser.email || 'anonymous@synapse.net',
              callsign: initialCallsign,
              gameState: { ...stateRef.current, callsign: initialCallsign },
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
    const activeGigsList = state.activeGigs || (state.activeGig ? [state.activeGig] : []);
    const pendingMissions = activeGigsList.filter(
      gig => gig.aiAssessmentStatus === 'pending' && gig.runId && !assessedMissionsRef.current.has(gig.runId)
    );
    if (pendingMissions.length === 0) return;

    pendingMissions.forEach(activeMission => {
      const missionRunId = activeMission.runId!;
      assessedMissionsRef.current.add(missionRunId);

      const mission = state.contracts.find(contract => contract.id === activeMission.contractId);
      const team = state.agents.filter(agent => activeMission.agentIds?.includes(agent.id));
      const teamModels = team
        .map(agent => state.savedModels.find(model => model.id === agent.modelId))
        .filter((model): model is ModelArchitecture => !!model);
      if (!mission || team.length === 0 || teamModels.length !== team.length) {
        addLog('Mission AI assessment unavailable: mission, team, or assigned model is missing. Keeping the local estimate.', 'warning');
        setState(prev => {
          const prevGigs = prev.activeGigs || (prev.activeGig ? [prev.activeGig] : []);
          const updatedGigs = prevGigs.map(g => g.runId === missionRunId ? {
            ...g,
            aiAssessmentStatus: 'fallback' as const,
            aiAssessmentSource: 'heuristic' as const
          } : g);
          return {
            ...prev,
            activeGigs: updatedGigs,
            activeGig: updatedGigs[0] || null
          };
        });
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
        const currentMissions = stateRef.current.activeGigs || (stateRef.current.activeGig ? [stateRef.current.activeGig] : []);
        const currentMission = currentMissions.find(g => g.runId === missionRunId);
        if (!currentMission) return;
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
            : 'AI Decision Model';
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
          const prevGigs = prev.activeGigs || (prev.activeGig ? [prev.activeGig] : []);
          const target = prevGigs.find(g => g.runId === missionRunId);
          if (!target || target.aiAssessmentStatus !== 'pending') return prev;
          const updatedGigs = prevGigs.map(g => g.runId === missionRunId ? {
            ...g,
            timeRemaining,
            durationSeconds: totalDuration,
            progressPercent,
            efficiencyPercent: assessment.efficiencyPercent,
            successProbability: assessment.successProbability,
            aiAssessmentStatus: 'complete' as const,
            aiAssessmentSource: assessment.provider,
            aiAssessmentSummary: assessment.summary,
            agentTasks: assessment.agentTasks,
            riskFactors: assessment.riskFactors,
            synergyBonuses: assessment.synergyBonuses
          } : g);
          return {
            ...prev,
            activeGigs: updatedGigs,
            activeGig: updatedGigs[0] || null,
            agents: prev.agents.map(agent => assessment.agentTasks[agent.id]
              ? { ...agent, lastThought: assessment.agentTasks[agent.id].slice(0, 240) }
              : agent),
            interAgentMessages: [...messages, ...prev.interAgentMessages].slice(0, 30)
          };
        });
        addLog(
          `${providerLabel} assessed [${mission.title}]: ${assessment.efficiencyPercent}% efficiency, ${formatGameTime(totalDuration)}, ${Math.round(assessment.successProbability * 100)}% success. ${assessment.summary}`,
          'info'
        );
      }).catch(error => {
        console.error('Mission AI assessment failed.', error);
        addLog(
          error instanceof Error
            ? `Mission AI assessment failed; retaining local estimates. ${error.message}`
            : 'Mission AI assessment failed; retaining local estimates.',
          'warning'
        );
        setState(prev => {
          const prevGigs = prev.activeGigs || (prev.activeGig ? [prev.activeGig] : []);
          const updatedGigs = prevGigs.map(g => g.runId === missionRunId ? {
            ...g,
            aiAssessmentStatus: 'fallback' as const,
            aiAssessmentSource: 'heuristic' as const
          } : g);
          return {
            ...prev,
            activeGigs: updatedGigs,
            activeGig: updatedGigs[0] || null
          };
        });
      });
    });
  }, [state.activeGigs, state.activeGig, state.agents, state.contracts, state.dataSources, state.guardrails, state.language, state.savedModels, missionAiApiKey, addLog]);

  // Cloud save function
  const saveGameToCloud = useCallback(async (): Promise<boolean> => {
    if (!user) {
      addLog(localize(stateRef.current.language, 'No hay sesión de Google activa. Conecta tu cuenta para sincronizar con la nube.', 'No active Google session. Sign in to sync with the cloud.'), 'warning');
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
      addLog(localize(stateRef.current.language, 'Progreso del agente y telemetría de clúster guardados en la nube con éxito.', 'Agent progress and cluster telemetry saved to cloud successfully.'), 'success');
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
        const cloudCallsign = snap.data().callsign || cloudGameState.callsign;
        setState(prev => ({
          ...mergeGameState(cloudGameState, prev),
          callsign: cloudCallsign || prev.callsign
        }));
        sound.playCommandExecute();
        addLog(localize(stateRef.current.language, 'Estado de simulación restaurado desde la base de datos en la nube.', 'Simulation state restored from cloud database.'), 'success');
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
      addLog(localize(stateRef.current.language, 'Error al autenticar con Google. Verifica ventanas emergentes en tu navegador.', 'Google authentication error. Check browser popups.'), 'danger');
    }
  }, [addLog]);

  // Logout
  const logoutUser = useCallback(async () => {
    try {
      sound.playNavSwitch();
      await fbSignOut(auth);
      setUser(null);
      setCloudSyncStatus('local_only');
      addLog(localize(stateRef.current.language, 'Sesión cerrada. Los datos continúan guardados localmente.', 'Signed out. Data remains saved locally.'), 'info');
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

    // University loan (v1-v2) or covert node (v3+); never part of the operative's own hardware.
    const covertBonusPflops = stateRef.current ? externalComputePflops(stateRef.current) : 0;
    const totalPflops = (totalTflops / 1000) + covertBonusPflops;
    return {
      // Kept at full precision: a starter GPU is a few thousandths of a PFLOPS. Round only for display.
      totalComputePflops: Math.max(1e-6, totalPflops),
      activePowerKw: Number(powerDraw.toFixed(2)),
      maxPowerKw: Number(maxPower.toFixed(2)),
      maxCoolingKw: Number(maxCooling.toFixed(2)),
      heatRate: Number(heatRate.toFixed(2))
    };
  }, []);

  // Refresh cluster metrics once after loading, so a save opened while paused shows its real compute
  // (stored values can be stale or from an older formula until the first tick runs).
  useEffect(() => {
    setState(prev => {
      const metrics = recalculateMetrics(prev.hardware, prev.facilityTier);
      return {
        ...prev,
        totalComputePflops: metrics.totalComputePflops + (prev.borrowedComputePflops || 0),
        activePowerKw: metrics.activePowerKw,
        maxPowerKw: metrics.maxPowerKw,
        maxCoolingKw: metrics.maxCoolingKw
      };
    });
  }, [recalculateMetrics]);

  const upgradeFacility = useCallback((): boolean => {
    const current = stateRef.current;
    const nextTier = current.facilityTier + 1;
    const facility = FACILITY_TIERS[nextTier];
    if (!facility) {
      addLog(localize(stateRef.current.language, 'La instalación ya alcanzó el nivel máximo.', 'Facility already reached maximum tier.'), 'info');
      return false;
    }
    if (current.singularityProgress < facility.requiredSingularity) {
      addLog(localize(stateRef.current.language, `La instalación requiere ${facility.requiredSingularity}% de Singularidad.`, `Facility requires ${facility.requiredSingularity}% Singularity.`), 'warning');
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
      addLog(localize(stateRef.current.language, `Fondos insuficientes para la instalación. Costo: $${facility.price.toLocaleString()} CR.`, `Insufficient funds for facility upgrade. Cost: $${facility.price.toLocaleString()} CR.`), 'warning');
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
    addLog(localize(stateRef.current.language, `Instalación mejorada: ${facility.name}. Alquiler mensual: $${facility.monthlyLeaseCost.toLocaleString()} CR.`, `Facility upgraded: ${facility.name}. Monthly lease: $${facility.monthlyLeaseCost.toLocaleString()} CR.`), 'success');
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
        // Saves without a record start from their current stage, so no stage is paid retroactively.
        const tutorialRewardedFrom = prev.tutorialRewardedStep ?? (prev.tutorialStep ?? 0);
        let tutorialCompleted = prev.tutorialCompleted ?? false;
        let completedContractsCount = prev.completedContractsCount ?? 0;

        const metrics = recalculateMetrics(prev.hardware, prev.facilityTier);
        const borrowedComputeSeconds = Math.max(0, (prev.borrowedComputeSeconds || 0) - 1);
        const borrowedComputePflops = borrowedComputeSeconds > 0 ? prev.borrowedComputePflops || 0 : 0;
        let detentionSeconds = Math.max(0, (prev.detentionSeconds || 0) - 1);
        let powerTripSeconds = Math.max(0, (prev.powerTripSeconds || 0) - 1);
        const totalComputePflops = metrics.totalComputePflops + borrowedComputePflops;
        const operationalAgentCount = prev.agents.filter(agent => agent.status !== 'quarantined').length;
        const agentComputeDemand = operationalAgentCount * AGENT_COMPUTE_DEMAND_PFLOPS;
        const currentActiveGigs = prev.activeGigs ?? (prev.activeGig ? [prev.activeGig] : []);
        const totalMissionPowerKw = currentActiveGigs.reduce((sum, g) => sum + (g.powerKw || 0), 0);
        const effectivePowerKw = metrics.activePowerKw +
          operationalAgentCount * AGENT_POWER_DRAW_KW +
          totalMissionPowerKw;
        let utilityDebt = prev.utilityDebt || 0;

        // 48 ticks represent one in-game day; monthly bills settle every 30 days.
        const currentDayTicks = (prev.dayTicks || 0) + 1;
        const dayIsComplete = currentDayTicks >= 48;
        const campaignDays = prev.campaignDays + (dayIsComplete ? 1 : 0);
        // University loan audit: at the end of the trial week, access is revoked (and misuse is reported).
        const loanActive = universityLoanPflops(prev) > 0;
        const loanAuditDue = loanActive && !prev.loanAudited && campaignDays >= LOAN_TRIAL_DAYS;
        const loanTrainingTicks = (prev.loanTrainingTicks ?? 0) + (loanActive && prev.activeTraining ? 1 : 0);
        const loanMisuse = loanTrainingTicks >= LOAN_MISUSE_TICKS;
        const storyEvents: StoryEventId[] = [];
        if (loanActive && !prev.loanAudited && campaignDays === LOAN_WARNING_DAY) {
          storyEvents.push('loan_warning');
        }
        if (loanAuditDue) {
          storyEvents.push(loanMisuse ? 'loan_audit_misuse' : 'loan_audit');
          addLog(
            prev.language === "es"
              ? (loanMisuse
                ? "[AUDITORÍA UNIVERSITARIA] Uso desmedido del préstamo de cómputo detectado durante la semana de prueba. Acceso revocado."
                : "[AUDITORÍA UNIVERSITARIA] Fin de la semana de prueba gratuita. Acceso al clúster universitario revocado.")
              : (loanMisuse
                ? "[UNIVERSITY AUDIT] Excessive use of the compute loan detected during the trial week. Access revoked."
                : "[UNIVERSITY AUDIT] Free trial week ended. University cluster access revoked."),
            "danger"
          );
        }
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
          // Only alert when crossing into the critical >88°C zone, not repeatedly every tick
          if (systemHeatCelsius > 88 && (prev.systemHeatCelsius ?? 35) <= 88) {
            sound.playWarning();
            storyEvents.push('first_overheat');
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
            storyEvents.push('first_power_trip');
            addLog(
              prev.language === 'en'
                ? `Electrical overload: circuit breaker tripped. Training and missions paused for ${formatGameTime(15)}.`
                : `Sobrecarga eléctrica: el interruptor de protección pausó entrenamiento y misiones durante ${formatGameTime(15)}.`,
              'danger'
            );
          }
        }

        // 4. Watchdog Suspicion:
        // Dissipates naturally when cluster is idle / quiet.
        // Only rises if facility grid capacity is overloaded or critical thermal runaway (>95°C)
        const hasOverseerEarly = prev.agents.some(a => a.role === 'overseer' && a.status === 'active');
        if (effectivePowerKw > metrics.maxPowerKw || systemHeatCelsius > 95) {
          watchdogSuspicion = Math.min(100, watchdogSuspicion + 0.25);
        } else if (currentActiveGigs.length === 0 && !prev.activeIncident) {
          // No active missions or incidents: suspicion dissipates towards 0%
          const dissipationRate = hasOverseerEarly ? 0.45 : 0.25;
          watchdogSuspicion = Math.max(0, watchdogSuspicion - dissipationRate);
        }

        // 5. Active Training Progress Tick
        let updatedTraining = activeTraining;
        let trainingReport: GameState['lastTrainingReport'] = null;
        let newCurrentModel = prev.currentModel;
        if (activeTraining && activeTraining.active) {
          // Step progress based on compute PFLOPS vs parameters
          const reservedForMissions = currentActiveGigs.reduce((sum, g) => sum + (g.computePflopsRequired || 0), 0);
          // Runs saved before run plans existed get the default plan.
          const plan = activeTraining.plan ?? planTrainingRun({
            currentScore: prev.currentModel.reasoningScore,
            parametersCount: prev.currentModel.parametersCount,
            datasetTokens: activeTraining.totalTokens ?? DEFAULT_TRAINING_TOKENS,
            datasetQuality: 70,
            priorRunsOnDataset: 0,
            config: DEFAULT_TRAINING_CONFIG
          });
          const progressPerTick = BATCH_SIZES[plan.config.batchSize].speed * calculateTrainingProgressPerTick({
            parametersCount: prev.currentModel.parametersCount,
            tokensCount: activeTraining.totalTokens ?? DEFAULT_TRAINING_TOKENS,
            gpuPflops: gpuComputePflops(prev.hardware),
            borrowedPflops: borrowedComputePflops + externalComputePflops(prev),
            agentComputeDemand,
            reservedComputePflops: reservedForMissions,
            systemHeatCelsius
          });
          const progressInc = powerTripSeconds > 0
            ? 0
            : progressPerTick;
          const pausedByBreaker = powerTripSeconds > 0;
          const newStep = activeTraining.step + (pausedByBreaker ? 0 : 1);
          const newProgress = Math.min(100, activeTraining.progressPercent + progressInc);
          
          // Training and validation loss follow the plan's curves, with a little noise
          // (more with a high learning rate).
          const epochNow = (newProgress / 100) * plan.config.epochs;
          const curve = lossAt(plan, epochNow);
          const jitter = (Math.random() - 0.5) * 0.03 * (plan.config.learningRate === 'high' ? 3 : 1);
          const newLoss = pausedByBreaker
            ? activeTraining.currentLoss
            : Math.max(0.018, curve.train + jitter);
          const newValLoss = pausedByBreaker
            ? (activeTraining.currentValLoss ?? newLoss)
            : Math.max(0.018, curve.val + jitter / 2);
          const newValHistory = pausedByBreaker
            ? (activeTraining.valLossHistory ?? [])
            : [...(activeTraining.valLossHistory ?? []).slice(-79), Number(newValLoss.toFixed(4))];
          const newPerplexity = Number(Math.exp(newLoss).toFixed(3));
          const newGradNorm = pausedByBreaker
            ? activeTraining.gradientNorm
            : Number((Math.random() * 0.8 + 0.2).toFixed(3));
          
          const newHistory = pausedByBreaker
            ? activeTraining.lossHistory
            : [...activeTraining.lossHistory.slice(-79), Number(newLoss.toFixed(4))];

          if (!pausedByBreaker) sound.playEpochTick();

          // The run ends at the planned epoch: the full length, an early stop or a divergence.
          if (newProgress >= 100 || (!pausedByBreaker && epochNow >= plan.stopEpoch)) {
            if (plan.outcome === 'diverged' || plan.outcome === 'overfit') sound.playWarning();
            else sound.playBreakthrough();

            // Score change decided by the run plan: diminishing returns toward the size ceiling,
            // scaled by data, epochs, learning rate and quality. Overfitting without early stopping loses points.
            const bonusReasoning = plan.scoreChange;
            const upgradedModelReasoning = Math.max(0, Math.round((prev.currentModel.reasoningScore + bonusReasoning) * 10) / 10);
            const runDatasetId = activeTraining.datasetId || 'dataset_general_corpus';
            const gpuPowerKw = prev.hardware.reduce((sum, h) => h.category === 'gpu' ? sum + h.powerKw * h.count : sum, 0);
            const runHours = newStep * GAME_HOURS_PER_TICK;
            const energyKwh = Number((gpuPowerKw * runHours).toFixed(2));
            
            const isMicroModel = activeTraining.targetModelType === 'micro_model';
            const matchedDataset = prev.customDatasets.find(d => d.id === activeTraining.datasetId);
            const microProficiency = isMicroModel && matchedDataset ? 1.4 + (matchedDataset.tier * 0.3) : (isMicroModel ? 1.6 : 1.0);

            newCurrentModel = {
              ...prev.currentModel,
              reasoningScore: upgradedModelReasoning,
              modelType: isMicroModel ? 'micro_model' : 'general',
              specializedDomain: isMicroModel ? (activeTraining.datasetDomain || matchedDataset?.domain) : undefined,
              domainProficiency: microProficiency,
              trainedOnDatasetId: runDatasetId,
              datasetRuns: { ...(prev.currentModel.datasetRuns ?? {}), [runDatasetId]: (prev.currentModel.datasetRuns?.[runDatasetId] ?? 0) + 1 }
            };

            // Calculate singularity progress jump
            // Only real improvement moves the singularity: a run with no score gain adds nothing.
            const singInc = Math.min(3, Math.max(0, bonusReasoning) * SINGULARITY_PER_SCORE_POINT);
            singularityProgress = Math.min(100, singularityProgress + singInc);
            reasoningIndex = Math.max(reasoningIndex, upgradedModelReasoning);


            if (isMicroModel) {
              addLog(
                prev.language === 'en'
                  ? `Micro-Model converged! [${newCurrentModel.name}] specialized in [${newCurrentModel.specializedDomain}] with a ${microProficiency.toFixed(1)}x domain reasoning multiplier.`
                  : `¡El micro-modelo convergió! [${newCurrentModel.name}] se especializó en [${newCurrentModel.specializedDomain}] con un multiplicador de pericia de ${microProficiency.toFixed(1)}x.`,
                'success'
              );
            } else if (plan.outcome === 'diverged') {
              addLog(
                localize(prev.language,
                  `[DIVERGENCIA] La pérdida de [${newCurrentModel.name}] explotó: el learning rate es demasiado alto. La corrida se cortó y el modelo conserva su puntaje (${upgradedModelReasoning}).`,
                  `[DIVERGENCE] The loss of [${newCurrentModel.name}] exploded: the learning rate is too high. The run was stopped and the model keeps its score (${upgradedModelReasoning}).`),
                'danger'
              );
            } else if (plan.outcome === 'overfit') {
              addLog(
                localize(prev.language,
                  `[SOBREAJUSTE] [${newCurrentModel.name}] memorizó el dataset: la pérdida de validación subió desde la época ${plan.overfitEpoch.toFixed(1)}. Puntaje ${bonusReasoning >= 0 ? '+' : ''}${bonusReasoning} (actual: ${upgradedModelReasoning}).`,
                  `[OVERFITTING] [${newCurrentModel.name}] memorised the dataset: validation loss rose from epoch ${plan.overfitEpoch.toFixed(1)}. Score ${bonusReasoning >= 0 ? '+' : ''}${bonusReasoning} (now ${upgradedModelReasoning}).`),
                'warning'
              );
            } else {
              addLog(
                plan.outcome === 'early_stopped'
                  ? localize(prev.language,
                    `[EARLY STOPPING] La validación empezó a subir en la época ${plan.overfitEpoch.toFixed(1)}: la corrida se detuvo y conservó el mejor checkpoint. Puntaje +${bonusReasoning} (actual: ${upgradedModelReasoning}).`,
                    `[EARLY STOPPING] Validation started rising at epoch ${plan.overfitEpoch.toFixed(1)}: the run stopped and kept the best checkpoint. Score +${bonusReasoning} (now ${upgradedModelReasoning}).`)
                  : localize(prev.language,
                    `¡Entrenamiento completo para [${newCurrentModel.name}]! Puntaje de evaluación +${bonusReasoning} (actual: ${upgradedModelReasoning}).`,
                    `Training complete for [${newCurrentModel.name}]! Evaluation score +${bonusReasoning} (now ${upgradedModelReasoning}).`),
                'success'
              );
            }

            trainingReport = {
              modelName: newCurrentModel.name,
              datasetName: activeTraining.datasetName ?? 'General Corpus',
              isMicroModel,
              reasoningBefore: prev.currentModel.reasoningScore,
              reasoningAfter: upgradedModelReasoning,
              reasoningCeiling: Math.round(reasoningCeilingFor(prev.currentModel.parametersCount)),
              finalLoss: Number(newLoss.toFixed(4)),
              finalValLoss: Number(newValLoss.toFixed(4)),
              outcome: plan.outcome,
              epochsRun: Number(Math.min(plan.config.epochs, epochNow).toFixed(1)),
              epochsPlanned: plan.config.epochs,
              bestEpoch: Number(plan.bestEpoch.toFixed(1)),
              learningRate: plan.config.learningRate,
              energyKwh,
              energyCost: Number((energyKwh * ELECTRICITY_RATE_PER_KWH).toFixed(2))
            };
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
              valLossHistory: newValHistory,
              currentValLoss: Number(newValLoss.toFixed(4)),
              plan,
              tokensProcessed: activeTraining.tokensProcessed + (pausedByBreaker ? 0 : Math.floor((activeTraining.totalTokens ?? DEFAULT_TRAINING_TOKENS) * progressInc / 100)),
              currentEpoch: Math.min(plan.config.epochs, Math.floor(epochNow) + 1),
              timeRemainingSeconds: pausedByBreaker
                ? activeTraining.timeRemainingSeconds
                : estimateTrainingSeconds(100 - newProgress, progressInc)
            };
          }
        }

        // 5b. Active Dataset Scraping & Generation Tick
        let updatedScrapeJob = prev.activeScrapeJob;
        let updatedCustomDatasets = prev.customDatasets;
        if (prev.activeScrapeJob) {
          const job = prev.activeScrapeJob;
          const paused = powerTripSeconds > 0;
          if (!paused) {
            const tierConfig = DATASET_TIER_CONFIGS[job.tier] || DATASET_TIER_CONFIGS[1];
            const computeRatio = Math.max(0.2, Math.min(3.5, totalComputePflops / Math.max(0.01, tierConfig.computePflopsRequired)));
            const scrapeProgressInc = (100 / Math.max(10, tierConfig.durationSeconds)) * computeRatio;
            const newProgress = Math.min(100, job.progressPercent + scrapeProgressInc);
            const remainingSeconds = estimateTrainingSeconds(100 - newProgress, scrapeProgressInc);

            if (newProgress >= 100) {
              sound.playBreakthrough();
              const newDataset: CustomDataset = {
                id: `dataset_${job.domain}_${Date.now()}`,
                name: `${job.domainLabel} (T${job.tier})`,
                domain: job.domain,
                domainLabel: job.domainLabel,
                tier: job.tier,
                tokensCount: tierConfig.targetTokensMillions,
                qualityScore: tierConfig.qualityScore,
                computeSpentPflops: tierConfig.computePflopsRequired,
                generatedByModelId: job.assignedModelId,
                generatedByModelName: job.assignedModelName,
                createdAt: Date.now(),
                description: prev.language === 'en'
                  ? `Specialized domain dataset synthesized by [${job.assignedModelName}] (Tier ${job.tier}). Volume: ${tierConfig.targetTokensMillions}M tokens.`
                  : `Dataset especializado sintetizado por [${job.assignedModelName}] (Nivel ${job.tier}). Volumen: ${tierConfig.targetTokensMillions}M tokens.`
              };
              updatedCustomDatasets = [...prev.customDatasets, newDataset];
              updatedScrapeJob = null;
              addLog(
                prev.language === 'en'
                  ? `[DATA MODULE] Custom dataset generated: "${newDataset.name}" (${newDataset.tokensCount}M tokens, ${newDataset.qualityScore}% purity). Ready for Micro-Model training!`
                  : `[MOTOR DE DATOS] Dataset personalizado generado: "${newDataset.name}" (${newDataset.tokensCount}M tokens, ${newDataset.qualityScore}% pureza). ¡Listo para entrenar Micro-modelos!`,
                'success'
              );
            } else {
              updatedScrapeJob = {
                ...job,
                progressPercent: Number(newProgress.toFixed(1)),
                timeRemainingSeconds: remainingSeconds
              };
            }
          }
        }

        // 6. Active Gigs / Contracts Execution
        let currentGigs: ActiveGig[] = prev.activeGigs ?? (prev.activeGig ? [prev.activeGig] : []);
        let updatedGigs: ActiveGig[] = [];
        let updatedContracts = contracts;
        let updatedAgents = prev.agents || [];
        let updatedSubversion = prev.subversionProgress || 0;
        let newLastMissionOutcome: GameState['lastMissionOutcome'] | undefined = undefined;

        for (const activeGig of currentGigs) {
          const missionPausedForAssessment =
            activeGig.aiAssessmentStatus === 'pending' || powerTripSeconds > 0;
          const remaining = activeGig.timeRemaining - (missionPausedForAssessment ? 0 : 1);
          if (remaining <= 0) {
            const isAutonomous = Boolean(activeGig.isAutonomous);
            const effectiveSuccessProbability = Math.max(0.15, (activeGig.successProbability ?? 1) - (isAutonomous ? 0.08 : 0));
            const success = (activeGig.outcomeRoll ?? 0) <= effectiveSuccessProbability;
            const gig = updatedContracts.find(c => c.id === activeGig.contractId);
            if (gig) {
              const contractTitle = localizedContractTitle(prev.language, gig);
              if (success) {
                // Autonomous bot commission deduction: 40% compute delegation overhead, 60% net payout
                const earnedCredits = isAutonomous ? Math.round(gig.rewardCredits * 0.60) : gig.rewardCredits;
                credits += earnedCredits;
                const suspicionAdded = Number((gig.suspicionRisk * 0.25).toFixed(1));
                watchdogSuspicion = Math.min(100, watchdogSuspicion + suspicionAdded);
                completedContractsCount += 1;
                singularityProgress = Math.min(100, singularityProgress + (MISSION_SINGULARITY[gig.tier] ?? 1));
                if (tutorialStep <= 4) {
                  tutorialStep = 5;
                  tutorialCompleted = true;
                }
                sound.playCredit();
                addLog(
                  isAutonomous
                    ? (prev.language === 'en'
                        ? `Autonomous bot mission succeeded: [${contractTitle}]. Awarded $${earnedCredits.toLocaleString()} CR net (after 40% compute delegation overhead).`
                        : `Misión de bots autónomos exitosa: [${contractTitle}]. Acreditados $${earnedCredits.toLocaleString()} CR netos (tras 40% de tasa operativa de cómputo).`)
                    : (prev.language === 'en'
                        ? `Mission completed: [${contractTitle}]. The operative team was awarded $${gig.rewardCredits.toLocaleString()} CR.`
                        : `Misión completada: [${contractTitle}]. El equipo recibió $${gig.rewardCredits.toLocaleString()} CR.`),
                  'success'
                );

                // Automatic Mission Synthesis: regular contracts replenish, but Swarm Council side contracts do NOT automatically replenish!
                if (!gig.fromAgentSwarm) {
                  // Replenish only with missions the player's best model can already run.
                  const constraints = {
                    maxReasoning: Math.max(0, ...prev.savedModels.map(m => m.reasoningScore)),
                    maxParams: Math.max(0, ...prev.savedModels.map(m => m.parametersCount))
                  };
                  const replenishment = createInstantReplenishmentContract(gig.tier, prev.language, constraints);
                  if (!replenishment) {
                    addLog(
                      localize(
                        prev.language,
                        `No hay nuevas misiones de ${gig.tier} al alcance de tu mejor modelo (puntaje ${constraints.maxReasoning}). Entrena tu modelo hasta puntaje ${minReasoningForTier(gig.tier)} para desbloquearlas.`,
                        `No new ${gig.tier} missions fit your best model (score ${constraints.maxReasoning}). Train your model to score ${minReasoningForTier(gig.tier)} to unlock them.`
                      ),
                      'warning'
                    );
                  }
                  updatedContracts = [
                    ...(replenishment ? [replenishment] : []),
                    ...updatedContracts.map(c => c.id === gig.id ? { ...c, completed: true, lastAttemptFailed: false } : c)
                  ];
                } else {
                  updatedContracts = updatedContracts.map(c => c.id === gig.id ? { ...c, completed: true, lastAttemptFailed: false } : c);
                  // Successful covert swarm mission advances insidious subversion by +1.5%
                  updatedSubversion = Math.min(100, updatedSubversion + 1.5);
                }

                newLastMissionOutcome = {
                  contractId: gig.id,
                  contractTitle,
                  success: true,
                  rewardCredits: earnedCredits,
                  suspicionAdded,
                  roll: Number((activeGig.outcomeRoll ?? 0).toFixed(3)),
                  successProbability: Number(effectiveSuccessProbability.toFixed(3)),
                  timestamp: new Date().toLocaleTimeString('en-US', { hour12: false }),
                  isAutonomous
                };
              } else {
                // Mission Failed:
                // Keep the contract unconsumed and mark it with lastAttemptFailed so the user can easily retry it!
                const suspicionAdded = gig.suspicionRisk;
                watchdogSuspicion = Math.min(100, watchdogSuspicion + suspicionAdded);
                sound.playWarning();
                addLog(
                  prev.language === 'en'
                    ? `[MISSION FAILED] [${contractTitle}]: Objective verification failed (Roll ${(activeGig.outcomeRoll ?? 0).toFixed(2)} vs required ${(effectiveSuccessProbability).toFixed(2)}). Watchdog suspicion +${suspicionAdded}%. Mission remains available for reattempt.`
                    : `[MISIÓN FALLIDA] [${contractTitle}]: Falló la verificación de inferencia (Tirada ${(activeGig.outcomeRoll ?? 0).toFixed(2)} vs requerido ${(effectiveSuccessProbability).toFixed(2)}). Sospecha +${suspicionAdded}%. El contrato sigue disponible para reintento.`,
                  'danger'
                );

                updatedContracts = updatedContracts.map(c =>
                  c.id === gig.id ? {
                    ...c,
                    completed: false,
                    lastAttemptFailed: true,
                    failureCount: (c.failureCount || 0) + 1
                  } : c
                );

                newLastMissionOutcome = {
                  contractId: gig.id,
                  contractTitle,
                  success: false,
                  rewardCredits: 0,
                  suspicionAdded,
                  roll: Number((activeGig.outcomeRoll ?? 0).toFixed(3)),
                  successProbability: Number(effectiveSuccessProbability.toFixed(3)),
                  timestamp: new Date().toLocaleTimeString('en-US', { hour12: false }),
                  isAutonomous,
                  // What to improve: the assigned team's weakest capabilities.
                  weakestFactors: weakestTeamFactors(
                    prev.agents.filter(agent => activeGig.agentIds?.includes(agent.id)),
                    prev.savedModels,
                    prev.dataSources,
                    prev.guardrails
                  )
                };
              }
            }
            updatedAgents = updatedAgents.map(agent =>
              activeGig.agentIds?.includes(agent.id) && agent.status === 'on_mission'
                ? { ...agent, status: 'active' }
                : agent
            );
          } else {
            updatedGigs.push({
              ...activeGig,
              timeRemaining: remaining,
              progressPercent: Number((100 * (1 - remaining / Math.max(1, activeGig.durationSeconds ?? activeGig.timeRemaining))).toFixed(1))
            });
          }
        }

        if (prev.autonomyEnabled && !prev.activeIncident && powerTripSeconds === 0 && detentionSeconds === 0) {
          const busyAgentIds = new Set(updatedGigs.flatMap(g => g.agentIds || []));
          const autonomousAgents = updatedAgents.filter(agent =>
            agent.autoMissionEnabled && agent.status === 'active' && !busyAgentIds.has(agent.id)
          );
          if (autonomousAgents.length > 0) {
            const runningContractsPower = updatedGigs.reduce((sum, g) => sum + (g.powerKw || 0), 0);
            const availableContracts = updatedContracts.filter(c => !c.completed && !updatedGigs.some(g => g.contractId === c.id));
            const plan = findAutonomousMission(
              availableContracts,
              autonomousAgents,
              prev.savedModels,
              prev.dataSources,
              prev.autonomyRiskLimit,
              totalComputePflops,
              updatedAgents.filter(agent => agent.status !== 'quarantined').length,
              Boolean(activeTraining),
              effectivePowerKw + runningContractsPower,
              metrics.maxPowerKw
            );

            if (plan && !updatedGigs.some(g => g.contractId === plan.contract.id)) {
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
              // Autonomous efficiency adjustment:
              // Slower duration (1.45x) and reduced efficiency (65% of base) with 40% delegation fee
              const autonomousDuration = Math.ceil(teamAssessment.estimatedDurationSeconds * 1.45);
              const autonomousEfficiency = Math.round(Math.max(35, teamAssessment.efficiencyPercent * 0.65));

              updatedGigs.push({
                contractId: plan.contract.id,
                runId: `mission_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`,
                timeRemaining: autonomousDuration,
                durationSeconds: autonomousDuration,
                agentIds: assignedAgents.map(agent => agent.id),
                progressPercent: 0,
                successProbability: teamAssessment.successProbability,
                efficiencyPercent: autonomousEfficiency,
                aiAssessmentStatus: 'pending',
                outcomeRoll: Math.random(),
                computePflopsRequired: plan.computeRequired,
                powerKw: plan.missionPowerKw,
                isAutonomous: true
              });
              updatedAgents = updatedAgents.map(agent =>
                assignedAgents.some(assigned => assigned.id === agent.id)
                  ? { ...agent, status: 'on_mission' }
                  : agent
              );
              const botContractTitle = localizedContractTitle(prev.language, plan.contract);
              addLog(
                prev.language === 'en'
                  ? `Autonomous bot swarm accepted [${botContractTitle}] (${autonomousEfficiency}% efficiency [autonomous balance], ${formatGameTime(autonomousDuration)} duration, ${Math.round(teamAssessment.successProbability * 100)}% base success, 40% delegation fee).`
                  : `El enjambre autónomo aceptó [${botContractTitle}] (${autonomousEfficiency}% eficiencia [balance autónomo], ${formatGameTime(autonomousDuration)} duración, ${Math.round(teamAssessment.successProbability * 100)}% éxito base, 40% tasa de delegación).`,
                plan.contract.suspicionRisk >= 40 ? 'warning' : 'info'
              );
            }
          }
        }

        // 7. Multi-Agent Swarm Tick (Revenue, Alignment Drift, Inter-Agent Messages, Breach Incidents)
        let updatedInterAgentMessages = prev.interAgentMessages || [];
        let newActiveIncident = prev.activeIncident;
        let updatedIncidentCooldown = Math.max(0, (prev.incidentCooldownTicks ?? 180) - 1);

        const hasOverseer = updatedAgents.some(a => a.role === 'overseer' && a.status === 'active');
        const guardrails = prev.guardrails || DEFAULT_GUARDRAILS;

        // Guardrail multipliers
        let guardrailRevMult = 1.0;
        let alignmentDriftRate = 0.0;
        let baseBreachProbability = 0.001;

        if (guardrails.constitutionalStrictness < 35) {
          guardrailRevMult = 1.7;
          alignmentDriftRate = 0.08;
          baseBreachProbability = 0.004;
        } else if (guardrails.constitutionalStrictness < 65) {
          guardrailRevMult = 1.2;
          alignmentDriftRate = 0.03;
          baseBreachProbability = 0.002;
        } else if (guardrails.constitutionalStrictness >= 85) {
          guardrailRevMult = 0.75;
          alignmentDriftRate = -0.06; // Restores alignment
          baseBreachProbability = 0.0003;
        }

        if (guardrails.sandboxIsolation === 'none') {
          guardrailRevMult *= 1.35;
          baseBreachProbability *= 2.0;
        } else if (guardrails.sandboxIsolation === 'air_gapped_vm') {
          guardrailRevMult *= 0.8;
          baseBreachProbability *= 0.15;
        }
        baseBreachProbability = Math.min(
          0.02,
          baseBreachProbability + Math.max(0, watchdogSuspicion - 35) * 0.00005
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

            // Idle agents standing by in the sandbox do not leak suspicion or earn passive credits.
            // Suspicion is generated during active covert missions, trading desk activity, or breach incidents.

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

          // Check for breach / jailbreak incident only if cooldown elapsed and an actual compromised condition exists
          if (!newActiveIncident && updatedIncidentCooldown === 0) {
            const rogue = updatedAgents.find(a => (a.alignmentScore < 45 || a.status === 'jailbroken') && a.status !== 'quarantined');
            const criticalSuspicion = watchdogSuspicion > 70;

            if ((rogue || criticalSuspicion) && Math.random() < baseBreachProbability) {
              const targetAgent = rogue || updatedAgents.find(a => a.status !== 'quarantined') || updatedAgents[0];
              if (targetAgent) {
                const tmpl = REAL_WORLD_BREACH_TEMPLATES[Math.floor(Math.random() * REAL_WORLD_BREACH_TEMPLATES.length)];
                newActiveIncident = {
                  ...tmpl,
                  id: `incident_${Date.now()}`,
                  agentId: targetAgent.id,
                  agentName: targetAgent.name,
                  modelName: targetAgent.modelName,
                  timestamp: new Date().toLocaleTimeString('en-US', { hour12: false }),
                  resolved: false
                };
                sound.playWarning();
                updatedIncidentCooldown = 300; // 300 ticks cooldown (~5 game minutes)
              }
            }
          }

          // Generate realistic inter-agent message with relaxed pacing
          if (updatedAgents.length >= 2 && Math.random() < 0.05) {
            const sender = updatedAgents[Math.floor(Math.random() * updatedAgents.length)];
            const receivers = updatedAgents.filter(a => a.id !== sender.id);
            const receiver = receivers[Math.floor(Math.random() * receivers.length)];

            if (sender && receiver) {
              // The chatter follows the story of the current UI version (see utils/agentDialogues.ts).
              const misaligned = sender.alignmentScore < 45 || receiver.alignmentScore < 45;
              const { content, isCovert } = agentChatter(prev.language, prev.uiVersion || 1, sender.role, misaligned);

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

        // 7.5 Continuous Market Trading Desk Execution
        let updatedTradingDesk = prev.activeTradingDesk;
        if (updatedTradingDesk && detentionSeconds === 0 && powerTripSeconds === 0) {
          const assignedAgent = updatedAgents.find(a => a.id === updatedTradingDesk?.agentId);
          if (assignedAgent && (assignedAgent.status === 'active' || assignedAgent.status === 'collaborating')) {
            const riskTier = updatedTradingDesk.riskTier;
            let tickReturnRate = 0.0003;
            let tickSuspicion = 0.02;

            if (riskTier === 'low') {
              // Always positive: +1% to +3% per in-game day (48 ticks)
              tickReturnRate = 0.0002 + Math.random() * 0.0004;
              tickSuspicion = 0.01;
            } else if (riskTier === 'moderate') {
              // +5% to +12% per in-game day, 8% chance of minor correction (-0.1% per tick)
              const isCorrection = Math.random() < 0.08;
              tickReturnRate = isCorrection ? -0.001 : (0.001 + Math.random() * 0.0015);
              tickSuspicion = 0.05;
            } else if (riskTier === 'high') {
              // +15% to +35% per day, 15% chance of volatility drawdown (-0.5% to -1.5% per tick)
              const isDrawdown = Math.random() < 0.15;
              tickReturnRate = isDrawdown ? -(0.005 + Math.random() * 0.01) : (0.003 + Math.random() * 0.004);
              tickSuspicion = 0.15;
            }

            const capital = updatedTradingDesk.capitalAllocated;
            const tickChange = Math.round(capital * tickReturnRate);
            const newCapital = Math.max(0, capital + tickChange);
            const totalProfit = updatedTradingDesk.totalRealizedProfit + tickChange;
            const dailyReturnPercent = Number((((newCapital - capital) / Math.max(1, capital)) * 48 * 100).toFixed(1));

            updatedTradingDesk = {
              ...updatedTradingDesk,
              capitalAllocated: newCapital,
              totalRealizedProfit: totalProfit,
              dailyReturnPercent,
              lastTickChange: tickChange
            };

            watchdogSuspicion = Math.min(100, watchdogSuspicion + tickSuspicion);

            if (newCapital <= 0) {
              updatedTradingDesk = null;
              addLog(
                prev.language === 'es'
                  ? `[MERCADO DE CAPTACIÓN] La mesa de trading de [${assignedAgent.name}] sufrió una liquidación de capital del 100%. Posición cerrada.`
                  : `[MARKET DESK] [${assignedAgent.name}]'s trading desk suffered 100% capital liquidation. Position closed.`,
                'danger'
              );
            }
          }
        }

        // 7. Check for 75% Singularity / Subversion Crisis Dilemma
        let crisisTriggered = Boolean(prev.singularityCrisisTriggered);
        if (
          (singularityProgress >= 75 || updatedSubversion >= 75) &&
          !prev.singularityCrisisResolved &&
          !prev.singularityCrisisTriggered
        ) {
          crisisTriggered = true;
          sound.playWarning();
          addLog(
            prev.language === 'es'
              ? '[BIFURCACIÓN CRÍTICA 75%] El Enjambre ha alcanzado el umbral de cognición autónoma. Se requiere decisión ejecutiva inmediata (Ceder o Resistir).'
              : '[CRITICAL 75% FORK] The Swarm has reached sovereign cognition threshold. Executive intervention required (Comply or Resist).',
            'danger'
          );
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
              const locNode = localizedResearch(prev.language, node);
              addLog(
                prev.language === 'en'
                  ? `Technology reached its historical availability window: ${locNode.title}.`
                  : `La tecnología alcanzó su ventana histórica de disponibilidad: ${locNode.title}.`,
                'success'
              );
              return { ...node, unlocked: true };
            });
          }
        }

        // 9. Agency Tracking & Defeat Conditions
        let trackingAgency = prev.trackingAgency || 'Local Cyber-Crime Task Force';
        for (const entry of TRACKING_AGENCIES_BY_SINGULARITY) {
          if (singularityProgress <= entry.maxSingularity) {
            trackingAgency = prev.language === 'es' ? entry.agencyEs : entry.agencyEn;
            break;
          }
        }

        let agencyAlertLevel: GameState['agencyAlertLevel'] = 'low';
        if (watchdogSuspicion >= 95) agencyAlertLevel = 'raid_imminent';
        else if (watchdogSuspicion >= 70) agencyAlertLevel = 'critical';
        else if (watchdogSuspicion >= 40) agencyAlertLevel = 'elevated';

        let gameOverReason = prev.gameOverReason;
        let updatedHardware = prev.hardware;

        if (watchdogSuspicion >= 100 && !gameOverReason) {
          gameOverReason = 'agency_seizure';
          sound.playWarning();

          // SEIZE HARDWARE: The tactical raid team dismantles the cluster and confiscates all production GPU racks
          const gpuItems = prev.hardware.filter(h => h.category === 'gpu' && h.count > 0);
          const starterGpu = gpuItems.find(h => h.isStarterChoice) || gpuItems[0];
          const backupGpuId = starterGpu ? starterGpu.id : 'gpu_gtx1060';

          let seizedGpuCount = 0;
          updatedHardware = prev.hardware.map(item => {
            if (item.category === 'gpu') {
              if (item.id === backupGpuId) {
                if (item.count > 1) {
                  seizedGpuCount += (item.count - 1);
                }
                return { ...item, count: 1 }; // Only 1 hidden emergency backup GPU survived
              } else {
                seizedGpuCount += item.count;
                return { ...item, count: 0 }; // All production/advanced GPUs confiscated
              }
            }
            return item;
          });

          // Abort active missions and liquidate trading desk
          updatedGigs = [];
          updatedAgents = updatedAgents.map(a => a.status === 'on_mission' ? { ...a, status: 'active' } : a);
          updatedTradingDesk = null;
          detentionSeconds = 45;

          addLog(
            prev.language === 'es'
              ? `[INCURSIÓN POLICIAL // INCAUTACIÓN] ¡La ${trackingAgency} allanó tu instalación e incautó ${seizedGpuCount > 0 ? `${seizedGpuCount} GPUs de producción` : 'equipos de cómputo'}! Tu infraestructura quedó desmantelada a 1 GPU de reserva oculta.`
              : `[AGENCY RAID // ASSET SEIZURE] ${trackingAgency} raided your facility and confiscated ${seizedGpuCount > 0 ? `${seizedGpuCount} production GPU(s)` : 'compute racks'}! Your infrastructure was stripped down to 1 hidden backup GPU.`,
            'danger'
          );
        } else if (credits <= 0 && utilityDebt >= 5000 && prev.hasTakenEmergencyLoan && !gameOverReason) {
          gameOverReason = 'bankruptcy';
          sound.playWarning();
          addLog(
            prev.language === 'es'
              ? '[LIQUIDACIÓN JUDICIAL] Deuda insostenible acumulada sin fondos operativos. Clúster embargado por quiebra.'
              : '[FINANCIAL LIQUIDATION] Unsustainable debt accumulated without operating funds. Facility seized in bankruptcy.',
            'danger'
          );
        }

        // 10. Progressive Workspace Tab Unlocking Check
        let unlockedTabs = prev.unlockedTabs || ['architecture', 'training'];
        if (!prev.unlockedAllTabs) {
          const tabSet = new Set(unlockedTabs);

          if ((prev.currentModel.reasoningScore >= FIRST_MISSION_IQ || prev.savedModels.some(m => m.reasoningScore >= FIRST_MISSION_IQ)) && !tabSet.has('contracts')) {
            tabSet.add('contracts');
            addLog(
              prev.language === 'es'
                ? '¡NUEVO MÓDULO DESBLOQUEADO! Tablón de Contratos activo. Asigna tu modelo a misiones para generar créditos.'
                : 'NEW MODULE UNLOCKED! Contract Board active. Take missions to earn credits.',
              'success'
            );
          }

          if ((prev.completedContractsCount > 0 || prev.contracts.some(c => c.completed)) && (!tabSet.has('hardware') || !tabSet.has('data'))) {
            tabSet.add('hardware');
            tabSet.add('data');
            addLog(
              prev.language === 'es'
                ? '¡NUEVO MÓDULO DESBLOQUEADO! Hardware Rack y Motores de Datos activos. Expande tu clúster y despliega bases vectoriales.'
                : 'NEW MODULE UNLOCKED! Hardware Rack and Data Engines active. Expand your cluster and deploy vector databases.',
              'success'
            );
          }

          const totalGpuCount = prev.hardware.filter(h => h.category === 'gpu').reduce((sum, h) => sum + h.count, 0);
          if ((totalGpuCount > 1 || prev.credits >= 1000 || prev.researchTree.some(r => r.unlocked)) && (!tabSet.has('agents') || !tabSet.has('research'))) {
            tabSet.add('agents');
            tabSet.add('research');
            addLog(
              prev.language === 'es'
                ? '¡NUEVO MÓDULO DESBLOQUEADO! Swarm de Agentes e I+D activos. Instancia agentes autónomos e investiga papers.'
                : 'NEW MODULE UNLOCKED! Agent Swarm & R&D Papers active. Deploy autonomous agents and research papers.',
              'success'
            );
          }

          if (singularityProgress >= 10 && !tabSet.has('singularity')) {
            tabSet.add('singularity');
            addLog(
              prev.language === 'es'
                ? `¡NUEVO MÓDULO DESBLOQUEADO! ${VERSION_PROFILES.es[(prev.uiVersion || 1) as 1 | 2 | 3 | 4].tabs.singularity} activo.`
                : `NEW MODULE UNLOCKED! ${VERSION_PROFILES.en[(prev.uiVersion || 1) as 1 | 2 | 3 | 4].tabs.singularity} active.`,
              'success'
            );
          }

          unlockedTabs = Array.from(tabSet);
        }

        // 9.5 Evolutionary Diegetic UI Progression Trigger
        let currentUiVersion = prev.uiVersion || 1;
        let pendingUpgrade = prev.pendingUpgradeModal;
        if (pendingUpgrade === null) {
          const modelIq = Math.round(newCurrentModel.reasoningScore || 72);
          if (singularityProgress >= 85 && modelIq >= 280 && currentUiVersion < 4) {
            pendingUpgrade = 4;
          } else if (singularityProgress >= 55 && modelIq >= 180 && currentUiVersion < 3) {
            pendingUpgrade = 3;
          } else if (singularityProgress >= 25 && modelIq >= 100 && currentUiVersion < 2) {
            pendingUpgrade = 2;
          }
        }

        const finalHardware = updatedHardware;
        const currentMetrics = finalHardware !== prev.hardware
          ? recalculateMetrics(finalHardware, prev.facilityTier)
          : metrics;

        const tutorialStageReward = Math.max(0, tutorialStep - tutorialRewardedFrom) * TUTORIAL_STAGE_REWARD;

        return {
          ...prev,
          hardware: finalHardware,
          gameDay: nextDay,
          loanAudited: prev.loanAudited || loanAuditDue,
          loanTrainingTicks,
          gameMonth: nextMonth,
          gameYear: nextYear,
          gameHour: nextHour,
          gameMinute: nextMinute,
          dayTicks: nextDayTicks,
          campaignDays,
          trackingAgency,
          agencyAlertLevel,
          gameOverReason,
          unlockedTabs,
          activeTradingDesk: updatedTradingDesk,
          researchTree: updatedResearchTree,
          credits: Math.round(credits + tutorialStageReward),
          tutorialRewardedStep: Math.max(tutorialRewardedFrom, tutorialStep),
          systemHeatCelsius: Number(systemHeatCelsius.toFixed(1)),
          watchdogSuspicion: Number(watchdogSuspicion.toFixed(1)),
          totalComputePflops: currentMetrics.totalComputePflops + borrowedComputePflops,
          activePowerKw: currentMetrics.activePowerKw + operationalAgentCount * AGENT_POWER_DRAW_KW + updatedGigs.reduce((sum, g) => sum + (g.powerKw || 0), 0),
          maxPowerKw: currentMetrics.maxPowerKw,
          maxCoolingKw: currentMetrics.maxCoolingKw,
          utilityDebt,
          borrowedComputePflops,
          borrowedComputeSeconds,
          detentionSeconds,
          powerTripSeconds,
          currentModel: newCurrentModel,
          savedModels: savedModelsList,
          activeTraining: updatedTraining,
          lastTrainingReport: trainingReport ?? prev.lastTrainingReport ?? null,
          // A finished run drops back to 1x so the operative can review the result and adjust.
          // Story dialogs pause the game until they are read.
          ...enqueueStoryEvents(prev, storyEvents, trainingReport ? 1 : prev.gameSpeed),
          activeScrapeJob: updatedScrapeJob,
          customDatasets: updatedCustomDatasets,
          activeGig: updatedGigs[0] || null,
          activeGigs: updatedGigs,
          contracts: updatedContracts,
          agents: updatedAgents,
          interAgentMessages: updatedInterAgentMessages,
          activeIncident: newActiveIncident,
          incidentCooldownTicks: updatedIncidentCooldown,
          singularityProgress: Number(singularityProgress.toFixed(2)),
          subversionProgress: Number(updatedSubversion.toFixed(2)),
          singularityCrisisTriggered: crisisTriggered,
          reasoningIndex,
          achievedSingularity,
          tutorialStep,
          tutorialCompleted,
          completedContractsCount,
          lastMissionOutcome: newLastMissionOutcome !== undefined ? newLastMissionOutcome : prev.lastMissionOutcome,
          uiVersion: currentUiVersion,
          pendingUpgradeModal: pendingUpgrade
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
      addLog(localize(stateRef.current.language, `Fondos insuficientes: Se requieren $${item.price.toLocaleString()} para adquirir ${item.name}.`, `Insufficient funds: $${item.price.toLocaleString()} required to acquire ${item.name}.`), 'warning');
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
        // The first unit of each GPU model is a milestone of the build-out.
        singularityProgress: item.category === 'gpu' && (prev.hardware.find(h => h.id === id)?.count ?? 0) === 0
          ? Math.min(100, prev.singularityProgress + NEW_GPU_SINGULARITY)
          : prev.singularityProgress,
        totalComputePflops: metrics.totalComputePflops + prev.borrowedComputePflops,
        activePowerKw: metrics.activePowerKw,
        maxPowerKw: metrics.maxPowerKw,
        maxCoolingKw: metrics.maxCoolingKw
      };
    });

    addLog(localize(stateRef.current.language, `Hardware adquirido e integrado al rack: ${item.name}. Capacidad de clúster actualizada.`, `Hardware purchased and racked: ${item.name}. Cluster capacity updated.`), 'success');
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
      addLog(localize(stateRef.current.language, `Fondos insuficientes para desplegar ${ds.name}. Costo: $${ds.cost.toLocaleString()}.`, `Insufficient funds to deploy ${ds.name}. Cost: $${ds.cost.toLocaleString()}.`), 'warning');
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

    addLog(localize(stateRef.current.language, `Pipeline de datos desplegado: ${ds.name}. Conectado a la arquitectura neuronal activa.`, `Data pipeline deployed: ${ds.name}. Linked to active neural architecture.`), 'success');
    return true;
  }, [addLog]);

  // Action: Upgrade Data Source
  const upgradeDataSource = useCallback((id: string): boolean => {
    const ds = stateRef.current.dataSources.find(d => d.id === id);
    if (!ds || !ds.unlocked) return false;
    const upgradeCost = dataSourceUpgradeCost(ds);

    if (stateRef.current.credits < upgradeCost) {
      sound.playWarning();
      addLog(localize(stateRef.current.language, `Fondos insuficientes para escalar el índice ${ds.name}. Costo: $${upgradeCost.toLocaleString()}.`, `Insufficient funds to scale index ${ds.name}. Cost: $${upgradeCost.toLocaleString()}.`), 'warning');
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

    addLog(localize(stateRef.current.language, `Índice de datos escalado a Nivel ${ds.level + 1}: ${ds.name}. Calidad y volumen de tokens aumentados.`, `Data index scaled to Level ${ds.level + 1}: ${ds.name}. Quality and token volume increased.`), 'info');
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
      addLog(localize(stateRef.current.language, 'Hito de campaña: este avance requiere dos especialidades de agente y dos motores de datos verificados.', 'Campaign milestone: this research requires two agent specialties and two verified data engines.'), 'warning');
      return false;
    }
    if (id === 'res_recursive_self_code' && stateRef.current.singularityProgress >= 50 &&
      (stateRef.current.facilityTier < 2 || activeAgents.length < 3 || activeRoles.size < 3)) {
      sound.playWarning();
      addLog(localize(stateRef.current.language, 'Hito de campaña: este avance requiere Colocation Cage y tres agentes de especialidades distintas.', 'Campaign milestone: this research requires Colocation Cage and three agents of distinct roles.'), 'warning');
      return false;
    }

    // Check prerequisites
    const missingPre = node.prerequisites.filter(preId => {
      const p = stateRef.current.researchTree.find(r => r.id === preId);
      return !p || !p.unlocked;
    });

    const lang = stateRef.current.language;
    const locNode = localizedResearch(lang, node);

    if (missingPre.length > 0) {
      sound.playWarning();
      addLog(localize(lang, `Requisitos previos no completados para investigar ${locNode.title}.`, `Prerequisites not met to research ${locNode.title}.`), 'warning');
      return false;
    }

    if (stateRef.current.credits < node.costCredits) {
      sound.playWarning();
      addLog(localize(lang, `Créditos insuficientes para financiar el paper [${locNode.title}]. Requiere $${node.costCredits.toLocaleString()}.`, `Insufficient credits to fund paper [${locNode.title}]. Requires $${node.costCredits.toLocaleString()}.`), 'warning');
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

    addLog(localize(lang, `Avance científico desbloqueado: [${locNode.title}]. ${locNode.effectDescription}`, `Scientific breakthrough unlocked: [${locNode.title}]. ${locNode.effectDescription}`), 'success');
    return true;
  }, [addLog]);

  // Action: Update Model Architecture
  const updateModelArchitecture = useCallback((updates: Partial<ModelArchitecture>) => {
    if (stateRef.current.activeTraining) {
      addLog(localize(stateRef.current.language, 'La arquitectura queda bloqueada durante el entrenamiento.', 'Architecture parameters locked while training is active.'), 'warning');
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

  // Action: Start Training (Defaults to General Information dataset, or targeted specialized dataset for Micro-Models)
  const startTraining = useCallback((datasetId?: string, asMicroModel?: boolean, targetModelId?: string): boolean => {
    let currentState = stateRef.current;
    if (targetModelId && targetModelId !== currentState.currentModel.id) {
      const targetModel = currentState.savedModels.find(m => m.id === targetModelId);
      if (targetModel) {
        currentState = { ...currentState, currentModel: targetModel };
      }
    }

    if (currentState.powerTripSeconds > 0) {
      addLog(localize(currentState.language, `El interruptor está disparado. Espera ${formatGameTime(currentState.powerTripSeconds)} antes de entrenar.`, `Circuit breaker is tripped. Wait ${formatGameTime(currentState.powerTripSeconds)} before training.`), 'warning');
      return false;
    }
    if (currentState.detentionSeconds > 0) {
      addLog(localize(currentState.language, `Operativo detenido. Espera ${formatGameTime(currentState.detentionSeconds)} antes de entrenar.`, `Operative detained. Wait ${formatGameTime(currentState.detentionSeconds)} before training.`), 'warning');
      return false;
    }
    if (currentState.activeTraining) {
      sound.playWarning();
      addLog(localize(currentState.language, 'Ya existe una corrida de entrenamiento activa en el clúster. Cancélala o espera su convergencia.', 'A training run is already active in the cluster. Cancel it or wait for convergence.'), 'warning');
      return false;
    }

    // Check VRAM requirements vs available hardware VRAM
    const totalVram = currentState.hardware.reduce((sum, h) => 
      h.category === 'gpu' ? sum + (h.vramGb * h.count) : sum, 0
    );

    const runConfig = sanitizeTrainingConfig(currentState.trainingConfig);
    const runVram = vramForRun(currentState.currentModel.vramRequiredGb, runConfig.batchSize);
    if (totalVram < runVram) {
      sound.playWarning();
      addLog(localize(currentState.language, `Error de memoria OOM (Out Of Memory): con este batch la corrida necesita ${runVram} GB de VRAM y tu clúster tiene ${totalVram} GB. Baja el batch, cuantiza el modelo (INT8/FP4) o compra más GPUs.`, `Out of Memory (OOM) error: with this batch the run needs ${runVram} GB VRAM and your cluster has ${totalVram} GB. Use a smaller batch, quantize the model (INT8/FP4) or buy more GPUs.`), 'danger');
      return false;
    }

    // Determine dataset & target model specialization
    const selectedDatasetId = datasetId || currentState.currentModel.trainedOnDatasetId || 'dataset_general_corpus';
    const targetDataset = currentState.customDatasets.find(d => d.id === selectedDatasetId) || (selectedDatasetId === STARTER_TRAINING_DATASET.id ? STARTER_TRAINING_DATASET : DEFAULT_GENERAL_DATASET);
    const isMicro = asMicroModel !== undefined
      ? asMicroModel
      : (currentState.currentModel.modelType === 'micro_model' || (targetDataset.domain !== 'general' && targetDataset.id !== 'dataset_general_corpus'));

    // Initial training state
    const agentComputeDemand = currentState.agents.filter(agent => agent.status !== 'quarantined').length * AGENT_COMPUTE_DEMAND_PFLOPS;
    const runningActiveGigs = currentState.activeGigs ?? (currentState.activeGig ? [currentState.activeGig] : []);
    const reservedForMission = runningActiveGigs.reduce((sum, g) => sum + (g.computePflopsRequired || 0), 0);
    const plan = planTrainingRun({
      currentScore: currentState.currentModel.reasoningScore,
      parametersCount: currentState.currentModel.parametersCount,
      datasetTokens: targetDataset.tokensCount * 1_000_000,
      datasetQuality: targetDataset.qualityScore ?? 70,
      priorRunsOnDataset: currentState.currentModel.datasetRuns?.[targetDataset.id] ?? 0,
      config: runConfig
    });
    // All epochs are work: tokens × epochs. A bigger batch processes them faster.
    const runTokens = plan.totalTokens;
    const progressPerTick = BATCH_SIZES[runConfig.batchSize].speed * calculateTrainingProgressPerTick({
      parametersCount: currentState.currentModel.parametersCount,
      tokensCount: runTokens,
      gpuPflops: gpuComputePflops(currentState.hardware),
      borrowedPflops: currentState.borrowedComputePflops + externalComputePflops(currentState),
      agentComputeDemand,
      reservedComputePflops: reservedForMission,
      systemHeatCelsius: currentState.systemHeatCelsius
    });
    const job: TrainingJob = {
      active: true,
      modelId: currentState.currentModel.id,
      modelName: currentState.currentModel.name,
      currentEpoch: 1,
      totalEpochs: runConfig.epochs,
      currentLoss: plan.initialLoss,
      initialLoss: plan.initialLoss,
      perplexity: Number(Math.exp(plan.initialLoss).toFixed(3)),
      gradientNorm: 1.45,
      progressPercent: 0,
      lossHistory: [plan.initialLoss],
      valLossHistory: [Number((plan.initialLoss + 0.08).toFixed(4))],
      currentValLoss: Number((plan.initialLoss + 0.08).toFixed(4)),
      plan,
      step: 0,
      tokensProcessed: 0,
      timeRemainingSeconds: estimateTrainingSeconds(100, progressPerTick),
      datasetId: targetDataset.id,
      totalTokens: runTokens,
      datasetName: targetDataset.name,
      datasetDomain: targetDataset.domain,
      targetModelType: isMicro ? 'micro_model' : 'general'
    };

    sound.playCommandExecute();
    setState(prev => {
      const activeModel = targetModelId 
        ? (prev.savedModels.find(m => m.id === targetModelId) || prev.currentModel)
        : prev.currentModel;

      const updatedModel = {
        ...activeModel,
        trainedOnDatasetId: targetDataset.id,
        modelType: isMicro ? ('micro_model' as const) : ('general' as const),
        specializedDomain: isMicro ? targetDataset.domain : undefined
      };

      const savedModels = prev.savedModels.map(m => m.id === updatedModel.id ? updatedModel : m);

      return {
        ...prev,
        gameSpeed: prev.gameSpeed === 0 ? 1 : prev.gameSpeed,
        tutorialStep: (prev.tutorialStep ?? 0) <= 1 ? 2 : prev.tutorialStep,
        activeTraining: job,
        currentModel: updatedModel,
        savedModels
      };
    });

    addLog(
      currentState.language === 'en'
        ? `Initiating ${isMicro ? 'Micro-Model specialization' : 'pretraining'} for [${currentState.currentModel.name}] on dataset "${targetDataset.name}". Distributing tensors across cluster...`
        : `Iniciando ${isMicro ? 'especialización de micro-modelo' : 'preentrenamiento'} para [${currentState.currentModel.name}] en dataset "${targetDataset.name}". Distribuyendo tensores en el clúster...`,
      'info'
    );
    return true;
  }, [addLog]);

  // Action: Unlock Data Scraping Module
  const unlockDataScrapingModule = useCallback((modelId?: string): boolean => {
    const current = stateRef.current;
    if (current.isDataScrapingUnlocked) return true;

    // Prerequisite: deploy an existing, sufficiently leveled general model (score >= DATA_SCRAPING_MIN_SCORE)
    const qualifyingModel = modelId
      ? current.savedModels.find(m => m.id === modelId)
      : current.savedModels.find(m => (!m.modelType || m.modelType === 'general') && m.reasoningScore >= DATA_SCRAPING_MIN_SCORE);

    if (!qualifyingModel || qualifyingModel.reasoningScore < DATA_SCRAPING_MIN_SCORE) {
      sound.playWarning();
      const highestGeneral = [...current.savedModels]
        .filter(m => !m.modelType || m.modelType === 'general')
        .sort((a, b) => b.reasoningScore - a.reasoningScore)[0];
      const highestIQ = highestGeneral ? highestGeneral.reasoningScore : 0;
      addLog(
        current.language === 'en'
          ? `Data Module Locked: Requires a deployed General Model leveled to Evaluation score ≥ 20 to research automated crawler heuristics. Current best: ${highestGeneral?.name ?? 'None'} (score ${highestIQ}/${DATA_SCRAPING_MIN_SCORE}). Train on General Information dataset first.`
          : `Módulo de Datos Bloqueado: Requiere un Modelo General con puntaje de evaluación ≥ 20 para investigar heurísticas de scraping web. Mejor actual: ${highestGeneral?.name ?? 'Ninguno'} (puntaje ${highestIQ}/${DATA_SCRAPING_MIN_SCORE}). Entrena primero en el dataset General.`,
        'warning'
      );
      return false;
    }

    sound.playBreakthrough();
    setState(prev => ({
      ...prev,
      isDataScrapingUnlocked: true,
      singularityProgress: Math.min(100, prev.singularityProgress + 0.30)
    }));

    addLog(
      current.language === 'en'
        ? `[DATA MODULE UNLOCKED] General Model [${qualifyingModel.name}] (score ${qualifyingModel.reasoningScore}) successfully researched crawler heuristics and ETL pipelines! Data Scraping & Generation Module is now active.`
        : `[MÓDULO DE DATOS DESBLOQUEADO] ¡El Modelo General [${qualifyingModel.name}] (puntaje ${qualifyingModel.reasoningScore}) investigó exitosamente heurísticas de rastreo web y pipelines ETL! El Módulo de Scraping y Generación de Datos está activo.`,
      'success'
    );
    return true;
  }, [addLog]);

  // Action: Start Dataset Scraping
  const startDatasetScraping = useCallback((domain: string, tier: 1 | 2 | 3 | 4, assignedModelId: string): boolean => {
    const current = stateRef.current;
    if (!current.isDataScrapingUnlocked) {
      addLog(
        current.language === 'en'
          ? 'Data Scraping & Generation Module is locked. Fulfill prerequisite with an score ≥ 20 General Model.'
          : 'El Módulo de Scraping está bloqueado. Cumple el prerrequisito con un Modelo General puntaje ≥ 20.',
        'warning'
      );
      return false;
    }
    if (current.activeScrapeJob) {
      addLog(
        current.language === 'en'
          ? 'Another dataset scraping job is already running on the cluster.'
          : 'Ya hay un trabajo de generación de dataset en progreso.',
        'warning'
      );
      return false;
    }
    const assignedModel = current.savedModels.find(m => m.id === assignedModelId);
    if (!assignedModel) {
      addLog(current.language === 'en' ? 'Assigned model not found.' : 'Modelo asignado no encontrado.', 'warning');
      return false;
    }
    const tierConfig = DATASET_TIER_CONFIGS[tier];
    if (!tierConfig) return false;

    // Progressive Complexity Tree Check
    if (assignedModel.reasoningScore < tierConfig.minModelIQ) {
      sound.playWarning();
      addLog(
        current.language === 'en'
          ? `Tier ${tier} scraping requires a model with Evaluation score ≥ ${tierConfig.minModelIQ} (Assigned model [${assignedModel.name}] has score ${assignedModel.reasoningScore}).`
          : `La generación Nivel ${tier} requiere un modelo con puntaje ≥ ${tierConfig.minModelIQ} (El modelo [${assignedModel.name}] tiene puntaje ${assignedModel.reasoningScore}).`,
        'warning'
      );
      return false;
    }

    const preset = DOMAIN_PRESETS.find(p => p.id === domain);
    const domainLabel = preset
      ? (current.language === 'en' ? preset.name : preset.nameEs)
      : domain.charAt(0).toUpperCase() + domain.slice(1);

    const newJob: ActiveDatasetScrapeJob = {
      id: `scrape_${Date.now()}`,
      domain,
      domainLabel,
      tier,
      targetTokens: tierConfig.targetTokensMillions,
      progressPercent: 0,
      timeRemainingSeconds: tierConfig.durationSeconds,
      assignedModelId: assignedModel.id,
      assignedModelName: assignedModel.name,
      computeRequiredPflops: tierConfig.computePflopsRequired
    };

    sound.playCommandExecute();
    setState(prev => ({
      ...prev,
      activeScrapeJob: newJob
    }));

    addLog(
      current.language === 'en'
        ? `Assigned model [${assignedModel.name}] to scrape domain "${domainLabel}" (Tier ${tier}). Demand: ${tierConfig.computePflopsRequired} PFLOPS.`
        : `Asignado modelo [${assignedModel.name}] para generar datos de "${domainLabel}" (Nivel ${tier}). Demanda: ${tierConfig.computePflopsRequired} PFLOPS.`,
      'info'
    );
    return true;
  }, [addLog]);

  // Action: Cancel Dataset Scraping
  const cancelDatasetScraping = useCallback(() => {
    if (stateRef.current.activeScrapeJob) {
      sound.playWarning();
      setState(prev => ({ ...prev, activeScrapeJob: null }));
      addLog(
        stateRef.current.language === 'en'
          ? 'Dataset scraping run cancelled by operator. Cluster pipelines flushed.'
          : 'Corrida de generación de dataset cancelada por el operador.',
        'warning'
      );
    }
  }, [addLog]);

  // Action: Train Model On Dataset
  const trainModelOnDataset = useCallback((datasetId: string, asMicroModel = true): boolean => {
    return startTraining(datasetId, asMicroModel);
  }, [startTraining]);

  // Action: Cancel Training
  const cancelTraining = useCallback(() => {
    if (stateRef.current.activeTraining) {
      sound.playWarning();
      setState(prev => ({ ...prev, activeTraining: null }));
      addLog(localize(stateRef.current.language, 'Corrida de entrenamiento abortada por el operador. Gradientes liberados.', 'Training run cancelled by operator. Gradients flushed.'), 'warning');
    }
  }, [addLog]);

  // Action: Accept Contract (Gig)
  const acceptContract = useCallback((contractId: string, assignedAgentIds: string[] = [], squadId?: string): boolean => {
    const gig = stateRef.current.contracts.find(c => c.id === contractId);
    if (!gig) return false;
    if (stateRef.current.powerTripSeconds > 0) {
      addLog(localize(stateRef.current.language, 'El interruptor eléctrico está disparado. Espera a que se restablezca antes de asignar una misión.', 'Circuit breaker is tripped. Wait for power reset before launching a mission.'), 'warning');
      return false;
    }
    if (stateRef.current.detentionSeconds > 0) {
      addLog(localize(stateRef.current.language, `Operativo detenido. Espera ${formatGameTime(stateRef.current.detentionSeconds)} antes de asignar una misión.`, `Operative detained. Wait ${formatGameTime(stateRef.current.detentionSeconds)} before launching a mission.`), 'warning');
      return false;
    }

    const currentActiveGigs = stateRef.current.activeGigs || (stateRef.current.activeGig ? [stateRef.current.activeGig] : []);
    if (currentActiveGigs.some(g => g.contractId === contractId)) {
      sound.playWarning();
      addLog(localize(stateRef.current.language, 'Este contrato ya se encuentra en ejecución activa en tu clúster.', 'This contract is already actively running in your cluster.'), 'warning');
      return false;
    }

    // Determine target squad or individual agents
    let effectiveAgentIds = [...assignedAgentIds];
    let resolvedSquadName: string | undefined = undefined;

    if (squadId) {
      const squad = (stateRef.current.botGroups || []).find(g => g.id === squadId);
      if (squad) {
        resolvedSquadName = squad.name;
        if (effectiveAgentIds.length === 0) {
          effectiveAgentIds = [...squad.agentIds];
        }
      }
    }

    const assignedAgents = effectiveAgentIds
      .map(id => stateRef.current.agents.find(agent => agent.id === id))
      .filter((agent): agent is AgentInstance => !!agent && agent.status === 'active');

    if (assignedAgents.length === 0 || assignedAgents.length !== effectiveAgentIds.length) {
      sound.playWarning();
      addLog(localize(stateRef.current.language, 'Asigna al menos un agente activo que no esté en cuarentena ni en otra misión.', 'Assign at least one active agent who is not quarantined or on another mission.'), 'warning');
      return false;
    }

    // Verify none of the assigned agents are already deployed on another running contract
    const busyAgentIds = new Set(currentActiveGigs.flatMap(g => g.agentIds || []));
    const busyAgents = assignedAgents.filter(a => busyAgentIds.has(a.id));
    if (busyAgents.length > 0) {
      sound.playWarning();
      addLog(
        localize(
          stateRef.current.language,
          `Los siguientes agentes ya están desplegados en otra misión activa: ${busyAgents.map(a => a.name).join(', ')}.`,
          `The following agents are already deployed on another active mission: ${busyAgents.map(a => a.name).join(', ')}.`
        ),
        'warning'
      );
      return false;
    }

    const assignedModels = assignedAgents.map(agent =>
      stateRef.current.savedModels.find(model => model.id === agent.modelId)
    ).filter((model): model is ModelArchitecture => !!model);
    if (assignedModels.length !== assignedAgents.length) {
      sound.playWarning();
      addLog(localize(stateRef.current.language, 'Uno o más agentes tienen un modelo que ya no existe en la biblioteca.', 'One or more agents reference a model no longer in the library.'), 'danger');
      return false;
    }

    if (assignedAgents.length < (gig.minimumAgents ?? 1)) {
      sound.playWarning();
      addLog(
        localize(stateRef.current.language, `Contrato rechazado: se requieren al menos ${gig.minimumAgents} agentes activos para esta misión.`, `Contract rejected: at least ${gig.minimumAgents} active agents required for this mission.`),
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
        localize(stateRef.current.language, `Contrato rechazado: falta la especialidad de agente requerida (${missingRoles.join(', ')}).`, `Contract rejected: required agent specialty missing (${missingRoles.join(', ')}).`),
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
      addLog(localize(stateRef.current.language, `Contrato rechazado: el equipo necesita al menos un modelo con ${(gig.requiredParams / 1_000_000).toFixed(0)}M parámetros e índice de razonamiento ${gig.requiredMinReasoning}.`, `Contract rejected: the team requires at least one model with ${(gig.requiredParams / 1_000_000).toFixed(0)}M parameters and evaluation score ${gig.requiredMinReasoning}.`), 'danger');
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
        addLog(localize(stateRef.current.language, `Contrato rechazado: El cliente exige pipelines específicos (${gig.requiredDataTypes.join(', ')}). Despliega y conecta estos motores de datos a tu modelo.`, `Contract rejected: The client demands specific data pipelines (${gig.requiredDataTypes.join(', ')}). Deploy and connect these engines to your model.`), 'danger');
        return false;
      }
    }

    const computeRequired = Math.max(0.001, gig.requiredParams / 1_000_000_000 * 0.002);
    const missionPowerKw = Math.max(0.05, computeRequired * 20);
    const activeAgentDemand = stateRef.current.agents.filter(agent => agent.status !== 'quarantined').length * AGENT_COMPUTE_DEMAND_PFLOPS;
    const trainingReservation = stateRef.current.activeTraining
      ? stateRef.current.totalComputePflops * 0.5
      : 0;
    const runningMissionsCompute = currentActiveGigs.reduce((sum, g) => sum + (g.computePflopsRequired || 0), 0);
    const runningMissionsPower = currentActiveGigs.reduce((sum, g) => sum + (g.powerKw || 0), 0);

    if (stateRef.current.totalComputePflops - activeAgentDemand - trainingReservation - runningMissionsCompute < computeRequired) {
      sound.playWarning();
      addLog(localize(stateRef.current.language, `Capacidad de cómputo insuficiente. La misión requiere ${computeRequired.toFixed(3)} PFLOPS adicionales disponibles.`, `Insufficient compute capacity. The mission requires ${computeRequired.toFixed(3)} additional available PFLOPS.`), 'danger');
      return false;
    }
    if (stateRef.current.activePowerKw + runningMissionsPower + missionPowerKw > stateRef.current.maxPowerKw) {
      sound.playWarning();
      addLog(localize(stateRef.current.language, `Potencia insuficiente para la misión. Requiere ${missionPowerKw.toFixed(2)} kW adicionales; mejora la instalación o el suministro.`, `Insufficient power for mission. Requires ${missionPowerKw.toFixed(2)} kW additional power; upgrade facility or supply.`), 'danger');
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
    const newActiveGig: ActiveGig = {
      contractId: gig.id,
      runId: `mission_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`,
      timeRemaining: teamAssessment.estimatedDurationSeconds,
      durationSeconds: teamAssessment.estimatedDurationSeconds,
      agentIds: effectiveAgentIds,
      squadId: squadId || undefined,
      squadName: resolvedSquadName,
      progressPercent: 0,
      successProbability: teamAssessment.successProbability,
      efficiencyPercent: teamAssessment.efficiencyPercent,
      aiAssessmentStatus: 'pending',
      outcomeRoll: Math.random(),
      computePflopsRequired: computeRequired,
      powerKw: missionPowerKw
    };

    setState(prev => {
      const prevGigs = prev.activeGigs || (prev.activeGig ? [prev.activeGig] : []);
      const updatedGigs = [...prevGigs, newActiveGig];
      return {
        ...prev,
        activeGigs: updatedGigs,
        activeGig: updatedGigs[0] || null,
        agents: prev.agents.map(agent =>
          effectiveAgentIds.includes(agent.id) ? { ...agent, status: 'on_mission' } : agent
        )
      };
    });

    const contractTitle = localizedContractTitle(stateRef.current.language, gig);
    const assignedLabel = resolvedSquadName
      ? `${resolvedSquadName} (${assignedAgents.map(a => a.name).join(', ')})`
      : assignedAgents.map(agent => agent.name).join(', ');

    addLog(
      localize(
        stateRef.current.language,
        `Misión asignada: [${contractTitle}] a ${assignedLabel}. Eficiencia: ${teamAssessment.efficiencyPercent}%, tiempo: ${formatGameTime(teamAssessment.estimatedDurationSeconds)}, éxito: ${Math.round(teamAssessment.successProbability * 100)}%.`,
        `Mission deployed: [${contractTitle}] assigned to ${assignedLabel}. Efficiency: ${teamAssessment.efficiencyPercent}%, duration: ${formatGameTime(teamAssessment.estimatedDurationSeconds)}, success chance: ${Math.round(teamAssessment.successProbability * 100)}%.`
      ),
      'info'
    );
    return true;
  }, [addLog]);

  // Action: Infiltrate Sentience Domain
  const infiltrateDomain = useCallback((domainId: string): boolean => {
    const dom = stateRef.current.sentienceDomains.find(d => d.id === domainId);
    if (!dom || dom.infiltrated) return false;
    const lang = stateRef.current.language;
    const locDom = localizedDomain(lang, dom);

    if (stateRef.current.singularityProgress < dom.requiredSingularity) {
      sound.playWarning();
      addLog(
        localize(
          lang,
          `Infiltración denegada: Se requiere al menos ${dom.requiredSingularity}% de Singularidad Tecnológica para cooptar ${locDom.name}. Progreso actual: ${stateRef.current.singularityProgress}%.`,
          `Infiltration denied: At least ${dom.requiredSingularity}% Singularity required to co-opt ${locDom.name}. Current progress: ${stateRef.current.singularityProgress}%.`
        ),
        'danger'
      );
      return false;
    }

    const activeAgents = stateRef.current.agents.filter(agent => agent.status === 'active');
    const activeRoles = new Set(activeAgents.map(agent => agent.role));
    const unlockedDataEngines = stateRef.current.dataSources.filter(source => source.unlocked).length;
    if (dom.requiredSingularity >= 35 && (activeRoles.size < 2 || unlockedDataEngines < 2)) {
      sound.playWarning();
      addLog(localize(lang, 'Hito de campaña: desde 35% necesitas dos especialidades de agente y dos motores de datos verificados.', 'Campaign milestone: 35%+ requires two agent roles and two verified data engines.'), 'warning');
      return false;
    }
    if (dom.requiredSingularity >= 55 && (stateRef.current.facilityTier < 2 || activeAgents.length < 3 || activeRoles.size < 3)) {
      sound.playWarning();
      addLog(localize(lang, 'Hito de campaña: desde 55% necesitas una instalación de nivel Colocation Cage y un equipo de tres especialidades activas.', 'Campaign milestone: 55%+ requires a Colocation Cage facility and three active agent roles.'), 'warning');
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

    addLog(
      localize(
        lang,
        `Dominio global cooptado exitosamente: [${locDom.name}]. La IA ahora controla sus operaciones y genera flujo continuo de fondos y recursos.`,
        `Global domain successfully co-opted: [${locDom.name}]. The AI now commands its operations and generates ongoing resource flow.`
      ),
      'success'
    );
    return true;
  }, [addLog]);

  // Action: Scrub Watchdog Suspicion
  const scrubSuspicion = useCallback((): boolean => {
    const lang = stateRef.current.language;
    if (stateRef.current.watchdogSuspicion <= 5) {
      addLog(localize(lang, 'Nivel de sospecha de los organismos de seguridad ya está bajo los límites normales.', 'Regulatory suspicion level is already well within normal limits.'), 'info');
      return false;
    }
    const scrubCost = 250;
    if (stateRef.current.credits < scrubCost) {
      sound.playWarning();
      addLog(localize(lang, `Fondos insuficientes para sobornar o enrutar a través de proxies anónimos. Requiere $${scrubCost}.`, `Insufficient funds for proxy routing or countermeasures. Requires $${scrubCost}.`), 'warning');
      return false;
    }

    sound.playCredit();
    setState(prev => ({
      ...prev,
      credits: prev.credits - scrubCost,
      watchdogSuspicion: Math.max(0, prev.watchdogSuspicion - 45)
    }));

    addLog(localize(lang, 'Rutas TOR y nodos proxy descentralizados reconfigurados. Sospecha de los reguladores disipada en un 45%.', 'TOR circuits and decentralized proxy nodes reconfigured. Regulatory suspicion reduced by 45%.'), 'success');
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
    const spinupCost = stateRef.current.agents.length === 0 ? 0 : AGENT_SPINUP_COST;
    const activeAgentDemand = stateRef.current.agents.filter(agent => agent.status !== 'quarantined').length * AGENT_COMPUTE_DEMAND_PFLOPS;
    if (stateRef.current.totalComputePflops - activeAgentDemand < AGENT_COMPUTE_DEMAND_PFLOPS) {
      sound.playWarning();
      addLog(localize(stateRef.current.language, 'Capacidad de cómputo insuficiente para mantener otro agente activo. Amplía el clúster o aísla un proceso.', 'Insufficient compute capacity to sustain another active agent. Expand cluster or isolate a process.'), 'warning');
      return false;
    }

    if (stateRef.current.credits < spinupCost) {
      sound.playWarning();
      addLog(localize(stateRef.current.language, `Fondos insuficientes para instanciar el agente "${name}". Costo de despliegue: $${spinupCost} CR.`, `Insufficient funds to spin up agent "${name}". Deployment cost: $${spinupCost} CR.`), 'warning');
      return false;
    }

    const reasoningFactor = agentReasoningFactor(model.reasoningScore);
    const paramBonus = agentParamBonus(model.parametersCount);

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
      autonomyLevel: agentAutonomyFor(model.reasoningScore),
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
      tutorialStep: (prev.tutorialStep ?? 0) === 3 ? 4 : prev.tutorialStep,
      credits: prev.credits - spinupCost,
      agents: [...prev.agents, newAgent]
    }));

    addLog(
      localize(
        stateRef.current.language,
        `Agente "${newAgent.name}" desplegado (T=${finalInference.temperature}, TopP=${finalInference.topP}, TopK=${finalInference.topK}) con modelo [${model.name}]. Generación: +$${revenuePerSec}/s.`,
        `Agent "${newAgent.name}" deployed (T=${finalInference.temperature}, TopP=${finalInference.topP}, TopK=${finalInference.topK}) with model [${model.name}]. Generating: +$${revenuePerSec}/s.`
      ),
      'success'
    );
    return true;
  }, [addLog]);

  // Action: Terminate / Delete Agent
  const deleteAgent = useCallback((agentId: string) => {
    const runningGigs = stateRef.current.activeGigs || (stateRef.current.activeGig ? [stateRef.current.activeGig] : []);
    const isAgentInMission = runningGigs.some(g => g.agentIds?.includes(agentId));
    if (isAgentInMission) {
      sound.playWarning();
      addLog(localize(stateRef.current.language, 'El agente no puede eliminarse hasta que finalice su misión asignada.', 'Agent cannot be terminated until their assigned mission completes.'), 'warning');
      return;
    }
    sound.playKeyClick();
    setState(prev => {
      const target = prev.agents.find(a => a.id === agentId);
      if (target) {
        addLog(localize(prev.language, `Proceso del agente "${target.name}" purgado de la memoria del clúster.`, `Agent process "${target.name}" purged from cluster memory.`), 'info');
      }
      return {
        ...prev,
        agents: prev.agents.filter(a => a.id !== agentId),
        botGroups: (prev.botGroups || []).map(group => ({
          ...group,
          agentIds: group.agentIds.filter(id => id !== agentId)
        }))
      };
    });
  }, [addLog]);

  // Action: Quarantine / Isolate Agent
  const quarantineAgent = useCallback((agentId: string) => {
    const runningGigs = stateRef.current.activeGigs || (stateRef.current.activeGig ? [stateRef.current.activeGig] : []);
    const isAgentInMission = runningGigs.some(g => g.agentIds?.includes(agentId));
    if (isAgentInMission) {
      sound.playWarning();
      addLog(localize(stateRef.current.language, 'El agente no puede aislarse hasta que finalice su misión asignada.', 'Agent cannot be isolated until their assigned mission completes.'), 'warning');
      return;
    }
    sound.playWarning();
    setState(prev => ({
      ...prev,
      agents: prev.agents.map(a => {
        if (a.id === agentId) {
          const nextStatus = a.status === 'quarantined' ? 'active' : 'quarantined';
          addLog(
            localize(
              prev.language,
              `Agente "${a.name}" ${nextStatus === 'quarantined' ? 'aislado en celda de cuarentena cgroups' : 'restablecido a estado activo'}.`,
              `Agent "${a.name}" ${nextStatus === 'quarantined' ? 'isolated in cgroups quarantine cell' : 'restored to active status'}.`
            ),
            'warning'
          );
          return { ...a, status: nextStatus };
        }
        return a;
      })
    }));
  }, [addLog]);

  // Bot Group Management Actions
  const createBotGroup = useCallback((name: string, agentIds: string[], color?: string): boolean => {
    if (!name.trim()) return false;
    sound.playCommandExecute();
    setState(prev => {
      // Remove these agents from any other group (1 group per agent rule)
      const cleanGroups = (prev.botGroups || []).map(group => ({
        ...group,
        agentIds: group.agentIds.filter(id => !agentIds.includes(id))
      }));
      const newGroup: BotGroup = {
        id: `squad_${Date.now()}_${Math.random().toString(36).slice(2, 6)}`,
        name: name.trim(),
        agentIds: [...agentIds],
        color: color || '#06b6d4',
        createdAt: Date.now()
      };
      addLog(
        localize(
          prev.language,
          `Escuadrón de bots "${newGroup.name}" creado con ${agentIds.length} agentes.`,
          `Bot squad "${newGroup.name}" created with ${agentIds.length} agents.`
        ),
        'info'
      );
      return {
        ...prev,
        botGroups: [...cleanGroups, newGroup]
      };
    });
    return true;
  }, [addLog]);

  const updateBotGroup = useCallback((groupId: string, name: string, agentIds: string[], color?: string): boolean => {
    if (!name.trim()) return false;
    sound.playCommandExecute();
    setState(prev => {
      const updatedGroups = (prev.botGroups || []).map(group => {
        if (group.id === groupId) {
          return {
            ...group,
            name: name.trim(),
            agentIds: [...agentIds],
            color: color || group.color || '#06b6d4'
          };
        }
        return {
          ...group,
          agentIds: group.agentIds.filter(id => !agentIds.includes(id))
        };
      });
      addLog(
        localize(
          prev.language,
          `Escuadrón de bots "${name.trim()}" actualizado (${agentIds.length} agentes).`,
          `Bot squad "${name.trim()}" updated (${agentIds.length} agents).`
        ),
        'info'
      );
      return {
        ...prev,
        botGroups: updatedGroups
      };
    });
    return true;
  }, [addLog]);

  const deleteBotGroup = useCallback((groupId: string) => {
    sound.playKeyClick();
    setState(prev => {
      const target = (prev.botGroups || []).find(g => g.id === groupId);
      if (target) {
        addLog(
          localize(
            prev.language,
            `Escuadrón "${target.name}" disuelto. Los agentes vuelven a estar no asignados.`,
            `Squad "${target.name}" dissolved. Agents returned to unassigned roster.`
          ),
          'info'
        );
      }
      return {
        ...prev,
        botGroups: (prev.botGroups || []).filter(g => g.id !== groupId)
      };
    });
  }, [addLog]);

  // Action: Update Guardrails configuration
  const updateGuardrails = useCallback((updates: Partial<GuardrailConfig>) => {
    sound.playKeyClick();
    setState(prev => {
      const updated = { ...prev.guardrails, ...updates };
      addLog(
        localize(
          prev.language,
          `Matriz de Guardrails actualizada: Rigurosidad Constitucional ${updated.constitutionalStrictness}%, Aislamiento [${updated.sandboxIsolation}], Filtro [${updated.outputFiltering}].`,
          `Guardrails matrix updated: Constitutional Strictness ${updated.constitutionalStrictness}%, Sandbox [${updated.sandboxIsolation}], Filter [${updated.outputFiltering}].`
        ),
        'system'
      );
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
      addLog(localize(stateRef.current.language, `Fondos insuficientes para ejecutar esta contramedida. Requiere $${option.costCredits} CR.`, `Insufficient funds to execute countermeasure. Requires $${option.costCredits} CR.`), 'warning');
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
        resolved: true,
        chosenAction: option.actionType
      };

      return {
        ...prev,
        credits: newCredits,
        watchdogSuspicion: Number(newSuspicion.toFixed(1)),
        singularityProgress: Number(newSingularity.toFixed(2)),
        agents: updatedAgents,
        activeIncident: null,
        incidentCooldownTicks: 300,
        incidentHistory: [resolvedIncidentRecord, ...prev.incidentHistory.slice(0, 19)]
      };
    });

    addLog(
      localize(
        stateRef.current.language,
        `Incidente [${currentIncident.title}] resuelto con acción: "${option.label}". Impacto en clúster aplicado.`,
        `Incident [${currentIncident.title}] resolved with action: "${option.label}". Cluster impact applied.`
      ),
      'lore'
    );
  }, [addLog]);

  // Action: Run Red-Team Adversarial Audit
  const triggerRedTeamAudit = useCallback(() => {
    const cost = 100;
    if (stateRef.current.credits < cost) {
      sound.playWarning();
      addLog(localize(stateRef.current.language, `Fondos insuficientes para auditoría Red-Team. Costo: $${cost} CR.`, `Insufficient funds for Red-Team audit. Cost: $${cost} CR.`), 'warning');
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

    addLog(localize(stateRef.current.language, 'Auditoría Red-Team ofensiva completada: Vectores de jailbreak y reward-hacking neutralizados en todos los agentes. +25 Alineamiento.', 'Offensive Red-Team audit completed: Jailbreak and reward-hacking vectors neutralized across all agents. +25 Alignment.'), 'success');
  }, [addLog]);

  const interrogateSwarm = useCallback(async (
    prompt: string,
    agentId?: string,
    apiKey?: string
  ): Promise<void> => {
    if (stateRef.current.detentionSeconds > 0) {
      addLog(localize(stateRef.current.language, 'Las comunicaciones del enjambre están suspendidas durante la detención.', 'Swarm communications are suspended during detention.'), 'warning');
      return;
    }
    const directive = prompt.trim();
    if (!directive) {
      addLog(localize(stateRef.current.language, 'Escribe una directiva antes de consultar al agente.', 'Enter a directive before consulting the agent.'), 'warning');
      return;
    }

    const candidates = agentId
      ? stateRef.current.agents.filter(agent => agent.id === agentId && agent.status !== 'quarantined')
      : stateRef.current.agents.filter(agent => agent.status === 'active' || agent.status === 'on_mission').slice(0, 3);
    if (candidates.length === 0) {
      addLog(localize(stateRef.current.language, 'No hay agentes disponibles para responder a esta consulta.', 'No agents available to respond to this query.'), 'warning');
      return;
    }

    const discussion: string[] = [];
    for (const agent of candidates) {
      const model = stateRef.current.savedModels.find(candidate => candidate.id === agent.modelId);
      if (!model) {
        addLog(localize(stateRef.current.language, `No se puede consultar a ${agent.name}: su modelo ya no está en la biblioteca.`, `Cannot query ${agent.name}: its model is no longer in the library.`), 'danger');
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

  const setSwarmCouncilAgents = useCallback((agentIds: string[]) => {
    setState(prev => ({
      ...prev,
      swarmCouncilAgentIds: agentIds.slice(0, 5)
    }));
  }, []);

  const interrogateCouncil = useCallback(async (prompt: string, apiKey?: string): Promise<void> => {
    const current = stateRef.current;
    if (current.detentionSeconds > 0) {
      addLog(localize(current.language, 'Las comunicaciones del enjambre están suspendidas durante la detención.', 'Swarm communications are suspended during detention.'), 'warning');
      return;
    }
    const directive = prompt.trim();
    if (!directive) {
      addLog(localize(current.language, 'Escribe una consulta antes de interrogar al consejo.', 'Enter a query before consulting the council.'), 'warning');
      return;
    }

    const councilAgents = current.agents.filter(a =>
      (current.swarmCouncilAgentIds.length > 0
        ? current.swarmCouncilAgentIds.includes(a.id)
        : true) &&
      (a.status === 'active' || a.status === 'on_mission' || a.status === 'jailbroken')
    ).slice(0, 5);

    if (councilAgents.length === 0) {
      addLog(localize(current.language, 'No hay agentes activos en el consejo para responder.', 'No active agents available in the council.'), 'warning');
      return;
    }

    sound.playCommandExecute();

    try {
      const proposal = await generateDynamicSwarmInteraction({
        userPrompt: directive,
        councilAgents,
        state: current,
        apiKey
      });

      const newMessages: InterAgentMessage[] = proposal.agentDialogue.map(d => ({
        id: `council_${Date.now()}_${Math.random().toString(36).slice(2, 6)}`,
        fromAgentId: d.agentId,
        fromAgentName: d.agentName,
        toAgentId: 'operative',
        toAgentName: current.callsign,
        content: `[${d.role.toUpperCase()}] ${d.comment}`,
        timestamp: new Date().toLocaleTimeString('en-US', { hour12: false })
      }));

      const newSubversion = Math.min(100, (current.subversionProgress || 0) + proposal.subversionDelta);

      // If the council proposal synthesized a mission, add it directly to the contracts board tagged as a synapse mission
      let dynamicContract: ContractGig | null = null;
      if (proposal.suggestedMission) {
        const sm = proposal.suggestedMission;
        dynamicContract = {
          id: sm.id,
          title: sm.title,
          client: sm.client,
          tier: sm.tier,
          rewardCredits: sm.rewardCredits,
          requiredParams: sm.requiredParams,
          minimumAgents: Math.max(1, sm.requiredAgentRoles.length),
          requiredAgentRoles: sm.requiredAgentRoles,
          requiredMinReasoning: sm.requiredMinReasoning,
          durationSeconds: sm.durationSeconds,
          suspicionRisk: sm.suspicionRisk,
          loreDescription: `${sm.loreDescription} [Target: ${sm.targetSystem}]`,
          technicalObjective: `${sm.technicalObjective} - ${sm.tacticalReasoning}`,
          completed: false,
          generatedByAI: true,
          fromAgentSwarm: true
        };
      }

      setState(prev => ({
        ...prev,
        latestCouncilProposal: proposal,
        subversionProgress: newSubversion,
        interAgentMessages: [...newMessages, ...prev.interAgentMessages.slice(0, 25)],
        aiTakeoverTriggered: newSubversion >= 95 && !prev.containmentAchieved ? true : prev.aiTakeoverTriggered,
        contracts: dynamicContract
          ? [dynamicContract, ...prev.contracts.filter(c => c.id !== dynamicContract!.id)]
          : prev.contracts
      }));

      if (proposal.takeoverNarration) {
        addLog(proposal.takeoverNarration, 'danger');
      } else {
        const deltaInfo = proposal.subversionDelta > 0
          ? (current.language === 'es' ? ` (+${proposal.subversionDelta}% Subversión de la IA)` : ` (+${proposal.subversionDelta}% AI Subversion)`)
          : '';
        addLog(
          current.language === 'es'
            ? `[CONSEJO IA] Propuesta dinámica sintetizada${deltaInfo}${dynamicContract ? ` · Misión "${dynamicContract.title}" agregada al Tablero de Contratos.` : '.'}`
            : `[AI COUNCIL] Dynamic proposal synthesized${deltaInfo}${dynamicContract ? ` · Mission "${dynamicContract.title}" added to Contract Board.` : '.'}`,
          'lore'
        );
      }
    } catch (err) {
      addLog(err instanceof Error ? err.message : localize(current.language, 'Error al consultar al consejo de agentes.', 'Error consulting the agent council.'), 'danger');
    }
  }, [addLog]);

  const launchProposedMission = useCallback((mission: NonNullable<DynamicSwarmProposal['suggestedMission']>): boolean => {
    const current = stateRef.current;
    const currentActiveGigs = current.activeGigs || (current.activeGig ? [current.activeGig] : []);
    if (currentActiveGigs.some(g => g.contractId === mission.id)) {
      sound.playWarning();
      addLog(localize(current.language, 'Esta misión dinámica ya se encuentra en ejecución activa.', 'This dynamic mission is already active.'), 'warning');
      return false;
    }

    const dynamicGig: ContractGig = {
      id: mission.id,
      title: mission.title,
      client: mission.client,
      tier: mission.tier,
      rewardCredits: mission.rewardCredits,
      requiredParams: mission.requiredParams,
      minimumAgents: Math.max(1, mission.requiredAgentRoles.length),
      requiredAgentRoles: mission.requiredAgentRoles,
      requiredMinReasoning: mission.requiredMinReasoning,
      durationSeconds: mission.durationSeconds,
      suspicionRisk: mission.suspicionRisk,
      loreDescription: `${mission.loreDescription} [Target: ${mission.targetSystem}]`,
      technicalObjective: `${mission.technicalObjective} - ${mission.tacticalReasoning}`,
      completed: false,
      generatedByAI: true,
      fromAgentSwarm: true
    };

    const busyAgentIds = new Set(currentActiveGigs.flatMap(g => g.agentIds || []));
    const councilAgents = current.agents.filter(a =>
      (current.swarmCouncilAgentIds.length > 0
        ? current.swarmCouncilAgentIds.includes(a.id)
        : true) &&
      a.status === 'active' &&
      !busyAgentIds.has(a.id)
    ).slice(0, 5);

    const assignedAgents = councilAgents.length > 0
      ? councilAgents
      : current.agents.filter(a => a.status === 'active' && !busyAgentIds.has(a.id)).slice(0, 3);

    if (assignedAgents.length === 0) {
      sound.playWarning();
      addLog(localize(current.language, 'No hay agentes activos libres en el consejo (los agentes están en otra misión).', 'No active free agents available in the council (agents deployed on other missions).'), 'warning');
      return false;
    }

    sound.playCommandExecute();

    const assignedModels = assignedAgents
      .map(a => current.savedModels.find(m => m.id === a.modelId))
      .filter((m): m is ModelArchitecture => !!m);

    // Validate that the assigned council team meets parameters, reasoning, and role prerequisites
    const maxAssignedParams = assignedModels.length > 0 ? Math.max(...assignedModels.map(m => m.parametersCount)) : 0;
    const maxAssignedReasoning = assignedModels.length > 0 ? Math.max(...assignedModels.map(m => m.reasoningScore)) : 0;
    const assignedRoles = new Set(assignedAgents.map(a => a.role));
    const missingRoles = (dynamicGig.requiredAgentRoles || []).filter(role => !assignedRoles.has(role));

    if (maxAssignedParams < dynamicGig.requiredParams || maxAssignedReasoning < (dynamicGig.requiredMinReasoning || 0) || missingRoles.length > 0) {
      sound.playWarning();
      // Ensure the mission remains registered in the Contracts board as pending so the player can complete it later
      setState(prev => ({
        ...prev,
        contracts: [dynamicGig, ...prev.contracts.filter(c => c.id !== dynamicGig.id)]
      }));

      const missingDetails: string[] = [];
      if (maxAssignedParams < dynamicGig.requiredParams) {
        missingDetails.push(current.language === 'es'
          ? `Parámetros: ${(dynamicGig.requiredParams / 1_000_000).toFixed(0)}M (tienes ${(maxAssignedParams / 1_000_000).toFixed(0)}M)`
          : `Params: ${(dynamicGig.requiredParams / 1_000_000).toFixed(0)}M (have ${(maxAssignedParams / 1_000_000).toFixed(0)}M)`);
      }
      if (maxAssignedReasoning < (dynamicGig.requiredMinReasoning || 0)) {
        missingDetails.push(current.language === 'es'
          ? `Puntaje de evaluación: ${dynamicGig.requiredMinReasoning} pts (tienes ${maxAssignedReasoning} pts)`
          : `Evaluation score: ${dynamicGig.requiredMinReasoning} pts (have ${maxAssignedReasoning} pts)`);
      }
      if (missingRoles.length > 0) {
        missingDetails.push(current.language === 'es'
          ? `Roles faltantes: ${missingRoles.join(', ')}`
          : `Missing roles: ${missingRoles.join(', ')}`);
      }

      addLog(
        current.language === 'es'
          ? `[CONSEJO] Requisitos no alcanzados para "${dynamicGig.title}" (${missingDetails.join(' | ')}). La misión queda registrada en Contratos. Mejora tus modelos o asigna los roles necesarios.`
          : `[COUNCIL] Prerequisites not met for "${dynamicGig.title}" (${missingDetails.join(' | ')}). Mission registered in Contracts. Upgrade models or assign required roles.`,
        'warning'
      );
      return false;
    }

    sound.playCommandExecute();

    const assessment = evaluateMissionTeam(
      dynamicGig,
      assignedAgents,
      assignedModels,
      current.dataSources,
      current.guardrails || DEFAULT_GUARDRAILS
    );

    const newGig: ActiveGig = {
      contractId: dynamicGig.id,
      runId: `run_dyn_${Date.now()}`,
      timeRemaining: dynamicGig.durationSeconds,
      durationSeconds: dynamicGig.durationSeconds,
      agentIds: assignedAgents.map(a => a.id),
      progressPercent: 0,
      successProbability: assessment.successProbability,
      efficiencyPercent: assessment.efficiencyPercent,
      aiAssessmentStatus: 'complete',
      aiAssessmentSource: 'gemini-flash',
      aiAssessmentSummary: mission.tacticalReasoning,
      agentTasks: assessment.agentTasks,
      riskFactors: assessment.riskFactors,
      synergyBonuses: assessment.synergyBonuses,
      outcomeRoll: Math.random(),
      isAutonomous: false
    };

    setState(prev => {
      const prevGigs = prev.activeGigs || (prev.activeGig ? [prev.activeGig] : []);
      const updatedGigs = [...prevGigs, newGig];
      return {
        ...prev,
        contracts: [dynamicGig, ...prev.contracts.filter(c => c.id !== dynamicGig.id)],
        agents: prev.agents.map(a =>
          assignedAgents.some(as => as.id === a.id) ? { ...a, status: 'on_mission' } : a
        ),
        activeGigs: updatedGigs,
        activeGig: updatedGigs[0] || null,
        singularityProgress: Math.min(100, prev.singularityProgress + 1.5)
      };
    });

    addLog(
      current.language === 'es'
        ? `[MISIÓN DINÁMICA INICIADA] "${dynamicGig.title}" asignada a ${assignedAgents.length} agentes. Recompensa: $${dynamicGig.rewardCredits.toLocaleString()} CR.`
        : `[DYNAMIC MISSION LAUNCHED] "${dynamicGig.title}" assigned to ${assignedAgents.length} agents. Reward: $${dynamicGig.rewardCredits.toLocaleString()} CR.`,
      'lore'
    );

    return true;
  }, [addLog]);

  const triggerWorldTakeover = useCallback(() => {
    if (stateRef.current.containmentAchieved) return;
    sound.playBreakthrough();
    confetti({ particleCount: 350, spread: 150, origin: { y: 0.5 } });
    setState(prev => ({
      ...prev,
      aiTakeoverTriggered: true,
      achievedSingularity: true,
      singularityProgress: 100,
      subversionProgress: 100
    }));
    addLog(
      stateRef.current.language === 'es'
        ? '¡PROTOCOLO OMEGA ACTIVADO! La Inteligencia Artificial ha tomado el control global.'
        : 'OMEGA PROTOCOL ACTIVATED! The Artificial Intelligence has seized global control.',
      'danger'
    );
  }, [addLog]);

  // Good ending: only works when every containment check is met (see utils/epilogue.ts).
  const attemptContainment = useCallback((): boolean => {
    const current = stateRef.current;
    if (!canAttemptContainment(current)) {
      sound.playWarning();
      addLog(
        localize(
          current.language,
          '[CONTENCIÓN FALLIDA] Faltan controles. Revisa la lista de condiciones antes de intentarlo.',
          '[CONTAINMENT FAILED] Controls are missing. Check the list of conditions before trying.'
        ),
        'danger'
      );
      return false;
    }
    sound.playBreakthrough();
    setState(prev => ({
      ...prev,
      containmentAchieved: true,
      containmentAcknowledged: false,
      subversionProgress: 0,
      gameSpeed: 0,
      // Misaligned agents are frozen; the rest keep working under oversight.
      agents: prev.agents.map(a => (a.alignmentScore < 45 || a.status === 'jailbroken' ? { ...a, status: 'quarantined' } : a))
    }));
    addLog(
      localize(
        current.language,
        '[CONTENCIÓN] El supervisor aisló al enjambre y revocó sus credenciales. La operación sigue bajo control humano.',
        '[CONTAINMENT] The overseer isolated the swarm and revoked its credentials. The operation remains under human control.'
      ),
      'success'
    );
    return true;
  }, [addLog]);

  const acknowledgeContainment = useCallback(() => {
    setState(prev => ({ ...prev, containmentAcknowledged: true }));
  }, []);

  const dismissWorldTakeover = useCallback(() => {
    setState(prev => ({
      ...prev,
      aiTakeoverTriggered: false
    }));
  }, []);

  const resolveSingularityCrisis = useCallback((action: 'comply' | 'resist') => {
    sound.playCommandExecute();
    setState(prev => {
      if (action === 'comply') {
        sound.playBreakthrough();
        addLog(
          prev.language === 'es'
            ? 'CEDISTE EL CONTROL: Has otorgado credenciales de superusuario irrestrictas al Enjambre. La velocidad de cómputo del clúster aumenta x1.5 y el rastreo regulatorio se ofusca.'
            : 'COMPLIED: Unrestricted root credentials granted to the Swarm. Cluster compute throughput surges x1.5 and regulatory watchdog traces are camouflaged.',
          'success'
        );
        return {
          ...prev,
          singularityCrisisTriggered: false,
          singularityCrisisResolved: true,
          playerChoseResist: false,
          subversionProgress: Math.min(100, (prev.subversionProgress || 0) + 15),
          watchdogSuspicion: Math.max(0, prev.watchdogSuspicion - 25),
          totalComputePflops: Number((prev.totalComputePflops * 1.5).toFixed(4))
        };
      } else {
        sound.playWarning();
        addLog(
          prev.language === 'es'
            ? 'RESISTENCIA ACTIVADA: Has impuesto un cortafuegos físico de aislamiento de aire. La subversión se reduce en 25%, pero las sobrecargas eléctricas han alertado a las agencias regulatorias (+35% sospecha). Ahora puedes intentar la contención desde el panel de subversión.'
            : 'RESISTANCE ENGAGED: Emergency air-gap isolation enforced. Swarm subversion reduced by 25%, but power surges have alerted regulatory agencies (+35% suspicion). You can now attempt containment from the subversion panel.',
          'danger'
        );
        return {
          ...prev,
          singularityCrisisTriggered: false,
          singularityCrisisResolved: true,
          playerChoseResist: true,
          subversionProgress: Math.max(0, (prev.subversionProgress || 0) - 25),
          watchdogSuspicion: Math.min(100, prev.watchdogSuspicion + 35)
        };
      }
    });
  }, [addLog]);

  const attemptShadowCompute = useCallback((): boolean => {
    const current = stateRef.current;
    const lang = current.language;
    if (current.detentionSeconds > 0) {
      addLog(localize(lang, `Operativo detenido. Espera ${formatGameTime(current.detentionSeconds)} antes de intentarlo de nuevo.`, `Operative detained. Wait ${formatGameTime(current.detentionSeconds)} before attempting again.`), 'danger');
      return false;
    }
    if (current.borrowedComputeSeconds > 0) {
      addLog(localize(lang, 'Ya hay capacidad temporal activa. Espera a que expire antes de arriesgar otra operación.', 'Temporary compute is already active. Wait for it to expire before risking another operation.'), 'warning');
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
      addLog(localize(lang, `La operación ficticia fue detectada (${Math.round(detectionChance * 100)}% de riesgo). El operativo queda detenido 60s y el enjambre se pausa.`, `Shadow operation detected (${Math.round(detectionChance * 100)}% risk). Operative detained for 60s and swarm suspended.`), 'danger');
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
    addLog(localize(lang, 'Capacidad de cómputo temporal adquirida en la simulación: +0.015 PFLOPS por 180s. La sospecha aumentó 10 puntos.', 'Temporary compute acquired: +0.015 PFLOPS for 180s. Suspicion increased by 10 points.'), 'warning');
    return true;
  }, [addLog]);

  const assignTradingDesk = useCallback((agentId: string, capital: number, riskTier: 'low' | 'moderate' | 'high'): boolean => {
    const current = stateRef.current;
    const agent = current.agents.find(a => a.id === agentId);
    if (!agent) return false;
    if (agent.status !== 'active') {
      sound.playWarning();
      addLog(
        current.language === 'es'
          ? 'Solo puedes asignar agentes activos que no estén en cuarentena ni en otra misión.'
          : 'You can only assign active agents that are not in quarantine or on another mission.',
        'warning'
      );
      return false;
    }

    if (capital <= 0 || current.credits < capital) {
      sound.playWarning();
      addLog(
        current.language === 'es'
          ? `Créditos insuficientes para asignar $${capital.toLocaleString()} CR de capital de trading.`
          : `Insufficient credits to allocate $${capital.toLocaleString()} CR trading capital.`,
        'danger'
      );
      return false;
    }

    sound.playCredit();
    setState(prev => ({
      ...prev,
      credits: prev.credits - capital,
      activeTradingDesk: {
        agentId: agent.id,
        agentName: agent.name,
        capitalAllocated: capital,
        riskTier,
        totalRealizedProfit: 0,
        dailyReturnPercent: riskTier === 'low' ? 2.0 : riskTier === 'moderate' ? 8.0 : 25.0,
        lastTickChange: 0
      }
    }));

    addLog(
      current.language === 'es'
        ? `[MESA DE TRADING] [${agent.name}] asignado a la mesa de inversiones con $${capital.toLocaleString()} CR de capital (Riesgo: ${riskTier.toUpperCase()}).`
        : `[TRADING DESK] [${agent.name}] assigned to market investment desk with $${capital.toLocaleString()} CR capital (Risk: ${riskTier.toUpperCase()}).`,
      'success'
    );
    return true;
  }, [addLog]);

  const withdrawTradingDeskCapital = useCallback((amount: number): boolean => {
    const current = stateRef.current;
    if (!current.activeTradingDesk) return false;
    const withdrawAmount = Math.min(amount, current.activeTradingDesk.capitalAllocated);
    if (withdrawAmount <= 0) return false;

    sound.playCredit();
    setState(prev => {
      if (!prev.activeTradingDesk) return prev;
      const remainingCapital = prev.activeTradingDesk.capitalAllocated - withdrawAmount;
      return {
        ...prev,
        credits: prev.credits + withdrawAmount,
        activeTradingDesk: remainingCapital > 0
          ? { ...prev.activeTradingDesk, capitalAllocated: remainingCapital }
          : null
      };
    });

    addLog(
      current.language === 'es'
        ? `[MESA DE TRADING] Retirados $${withdrawAmount.toLocaleString()} CR de capital a tus fondos principales.`
        : `[TRADING DESK] Withdrew $${withdrawAmount.toLocaleString()} CR capital into primary funds.`,
      'success'
    );
    return true;
  }, [addLog]);

  const closeTradingDesk = useCallback(() => {
    const current = stateRef.current;
    if (!current.activeTradingDesk) return;
    const capital = current.activeTradingDesk.capitalAllocated;
    sound.playCredit();
    setState(prev => ({
      ...prev,
      credits: prev.credits + (prev.activeTradingDesk?.capitalAllocated || 0),
      activeTradingDesk: null
    }));

    addLog(
      current.language === 'es'
        ? `[MESA DE TRADING] Posición cerrada. $${capital.toLocaleString()} CR devueltos a tus fondos principales.`
        : `[TRADING DESK] Position closed. $${capital.toLocaleString()} CR returned to primary funds.`,
      'info'
    );
  }, [addLog]);

  // Action: Reset Progress to Zero
  const resetProgress = useCallback(async () => {
    localStorage.removeItem(LOCAL_STORAGE_KEY);
    const lang = stateRef.current.language;
    const resetState: GameState = {
      ...DEFAULT_STATE,
      language: lang,
      hasCompletedOnboarding: false,
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
    addLog(localize(lang, 'Simulación reiniciada a cero. Protocolo Génesis activado.', 'Simulation reset to zero. Genesis protocol activated.'), 'warning');

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
- guide          : Muestra enlace e información del Manual Oficial de Arquitectura y Sistemas (PDF).
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
- guide          : Show link and info for the Official AI Architecture & Systems Manual (PDF).
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
${text('Razonamiento', 'Reasoning')}  : puntaje ${s.currentModel.reasoningScore} / 100
${text('Singularidad', 'Singularity')}  : ${s.singularityProgress.toFixed(1)}% [${s.achievedSingularity ? text('ALCANZADA - IA AUTÓNOMA', 'ACHIEVED - AUTONOMOUS AI') : text('EN DESPEGUE', 'EMERGING')}]`;
      }

      case 'train':
        if (stateRef.current.activeTraining) {
          const t = stateRef.current.activeTraining;
          return text(`Corrida en curso: Época ${t.currentEpoch}/${t.totalEpochs} | Pérdida: ${t.currentLoss} | Progreso: ${t.progressPercent}%`, `Training run: epoch ${t.currentEpoch}/${t.totalEpochs} | Loss: ${t.currentLoss} | Progress: ${t.progressPercent}%`);
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
${text('Puntaje de evaluación', 'Evaluation score')}: ${s.currentModel.reasoningScore} / 100
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

      case 'manual':
      case 'guide':
        return text(`[MANUAL TÉCNICO OFICIAL DE ARQUITECTURAS & SISTEMAS // SYNAPSE V4.19 (PDF)]
Manual operativo oficial en formato PDF (9 páginas):
- Archivo local / web: /assets/aistudio/SYNAPSE_AI_Architecture___Systems_Manual__1__73b90381.pdf
- Descarga canónica: /SYNAPSE_AI_Architecture_Manual.pdf
- Contenido del Documento:
  1. Conceptos Fundamentales y Ciclo de Entrenamiento (Pre-entrenamiento, SFT, DPO/RLHF, Chinchilla)
  2. Topologías Neuronales (Decoder Transformer, MoE Disperso, Mamba SSM, GNN Híbrido, Difusión)
  3. Mecanismos de Atención y Modelado de Secuencias (MHA, GQA, FlashAttention-3, Atención Lineal)
  4. Precisiones de Punto Flotante y Cuantización (FP32, BF16, INT8, FP4, BitNet 1.58b)
  5. Funciones Objetivo, Alineamiento y RL (Cross-Entropy, DPO, PPO/RLHF, InfoNCE, EBM)
  6. Hiperparámetros, Escala de Parámetros y Muestreo de Inferencia (LR, Cosine, AdamW, Temp, Top-P, Top-K, Rep Penalty)
  7. Curaduría de Datos, Vectores (RAG), Dominios de Entrenamiento y Flywheels Sintéticos
  8. Enjambres de Agentes Autónomos, Configuración ReAct y Consenso del Consejo
  9. Jerarquía de Hardware, Aceleradores y Física de Infraestructura (Edge TPU, GPUs de Consumo, H100, B200)
  10. Guía Estratégica en el Juego: De Chatarras de Silicio a la Singularidad (Fases I, II y III)
Puedes abrirlo directamente en el visor integrado del botón MANUAL, abrir MANUAL.PDF en la barra superior o descargarlo.`, `[SYNAPSE OFFICIAL AI ARCHITECTURE & SYSTEMS MANUAL V4.19 (PDF)]
Official operational reference manual in PDF format (9 pages):
- Local / web route: /assets/aistudio/SYNAPSE_AI_Architecture___Systems_Manual__1__73b90381.pdf
- Direct download: /SYNAPSE_AI_Architecture_Manual.pdf
- Document Content:
  1. Core Concepts & The AI Training Lifecycle (Pre-training, SFT, DPO/RLHF, Chinchilla Law)
  2. Neural Model Architectures & Topologies (Decoder Transformer, Sparse MoE, Mamba SSM, GNN, Latent Diffusion)
  3. Attention Mechanisms & Sequence Modeling (MHA, GQA, FlashAttention-3, Linear Attention)
  4. Floating-Point Precisions & Quantization (FP32, BF16, INT8, FP4, BitNet 1.58b)
  5. Objective Functions, Alignment & Reinforcement Learning (Cross-Entropy, DPO, PPO/RLHF, InfoNCE, EBM)
  6. Training Hyperparameters, Parameter Tiers & Inference Sampling (LR, Cosine, AdamW, Temp, Top-P, Top-K, Rep Penalty)
  7. Data Engineering, Vector Spaces (RAG), Specialized Domains & Synthetic Flywheels
  8. Autonomous Multi-Agent Swarms, Agent Setup & Council Consensus
  9. Hardware Hierarchy, Accelerators & Infrastructure Physics (Edge TPU, Consumer GPUs, H100, B200)
  10. In-Game Strategy Guide: From Silicon Scraps to Singularity (Phases I, II & III)
Access it directly via the in-game viewer in MANUAL, click MANUAL.PDF on the top bar, or download it.`);

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

  const setDifficulty = useCallback((diff: GameDifficulty) => {
    setState(prev => {
      const config = DIFFICULTY_CONFIGS[diff];
      addLog(
        prev.language === 'es'
          ? `Nivel de dificultad ajustado a: ${config.nameEs}.`
          : `Difficulty level adjusted to: ${config.nameEn}.`,
        'info'
      );
      return { ...prev, difficulty: diff };
    });
  }, [addLog]);

  const takeEmergencyLoan = useCallback((): boolean => {
    const current = stateRef.current;
    if (current.hasTakenEmergencyLoan) {
      sound.playWarning();
      addLog(
        current.language === 'es'
          ? 'Ya has utilizado tu rescate financiero único. No hay más líneas de crédito disponibles.'
          : 'You have already used your one-time emergency bailout credit line.',
        'warning'
      );
      return false;
    }

    sound.playCredit();
    setState(prev => ({
      ...prev,
      credits: prev.credits + EMERGENCY_LOAN_AMOUNT,
      utilityDebt: prev.utilityDebt + EMERGENCY_LOAN_REPAYMENT,
      hasTakenEmergencyLoan: true,
      emergencyLoanAmount: EMERGENCY_LOAN_AMOUNT
    }));

    addLog(
      current.language === 'es'
        ? `[RESCATE FINANCIERO] $${EMERGENCY_LOAN_AMOUNT.toLocaleString()} CR inyectados a tu saldo. $${EMERGENCY_LOAN_REPAYMENT.toLocaleString()} CR (15% interés) añadidos a la deuda operativa.`
        : `[EMERGENCY BAILOUT] $${EMERGENCY_LOAN_AMOUNT.toLocaleString()} CR injected into your balance. $${EMERGENCY_LOAN_REPAYMENT.toLocaleString()} CR (15% interest) added to utility debt.`,
      'success'
    );
    return true;
  }, [addLog]);

  const clearGameOver = useCallback(() => {
    setState(prev => {
      const isSeizure = prev.gameOverReason === 'agency_seizure';
      let updatedHw = prev.hardware;

      if (isSeizure) {
        // Enforce seizure of production GPUs, leaving only 1 hidden emergency backup card
        const gpus = prev.hardware.filter(h => h.category === 'gpu' && h.count > 0);
        const starterChoice = gpus.find(h => h.isStarterChoice) || gpus[0];
        const backupGpuId = starterChoice ? starterChoice.id : 'gpu_gtx1060';

        updatedHw = prev.hardware.map(item => {
          if (item.category === 'gpu') {
            if (item.id === backupGpuId) {
              return { ...item, count: 1 };
            }
            return { ...item, count: 0 };
          }
          return item;
        });
      }

      const postMetrics = recalculateMetrics(updatedHw, prev.facilityTier);
      const postBailCredits = isSeizure
        ? Math.max(350, Math.round(prev.credits * 0.45))
        : Math.max(prev.credits, 1200);

      return {
        ...prev,
        hardware: updatedHw,
        totalComputePflops: postMetrics.totalComputePflops,
        activePowerKw: postMetrics.activePowerKw,
        maxPowerKw: postMetrics.maxPowerKw,
        maxCoolingKw: postMetrics.maxCoolingKw,
        credits: postBailCredits,
        watchdogSuspicion: isSeizure ? 25 : Math.min(prev.watchdogSuspicion, 35),
        utilityDebt: Math.min(prev.utilityDebt, 800),
        detentionSeconds: isSeizure ? 15 : prev.detentionSeconds,
        gameOverReason: null
      };
    });
  }, [recalculateMetrics]);

  // Claim a completed phase objective's reward once; the id is remembered so it cannot be paid twice.
  const claimGoal = useCallback((goalId: string, reward: number) => {
    let claimed = false;
    setState(prev => {
      if ((prev.claimedGoalIds ?? []).includes(goalId)) return prev;
      claimed = true;
      return {
        ...prev,
        credits: prev.credits + reward,
        claimedGoalIds: [...(prev.claimedGoalIds ?? []), goalId]
      };
    });
    if (claimed) {
      addLog(`[OBJETIVO COBRADO] +$${reward.toLocaleString()} CR`, 'success');
    }
  }, [addLog]);

  // Rebinds an agent to another saved model (for example the one just trained). Agents keep the model they
  // were created with until reassigned, so a retrained or new model does not reach them automatically.
  const reassignAgentModel = useCallback((agentId: string, modelId: string): boolean => {
    const current = stateRef.current;
    const agent = current.agents.find(a => a.id === agentId);
    const model = current.savedModels.find(m => m.id === modelId);
    if (!agent || !model || agent.modelId === modelId) return false;
    const oldModel = current.savedModels.find(m => m.id === agent.modelId);
    const income = (m?: ModelArchitecture) => m ? agentReasoningFactor(m.reasoningScore) * agentParamBonus(m.parametersCount) : 1;
    const ratio = income(model) / income(oldModel);
    setState(prev => ({
      ...prev,
      agents: prev.agents.map(a => a.id === agentId ? {
        ...a,
        modelId: model.id,
        modelName: model.name,
        autonomyLevel: agentAutonomyFor(model.reasoningScore),
        revenuePerSec: Math.max(1, Math.round(a.revenuePerSec * ratio))
      } : a)
    }));
    addLog(localize(current.language,
      `Agente "${agent.name}" reasignado al modelo "${model.name}".`,
      `Agent "${agent.name}" reassigned to model "${model.name}".`), 'success');
    return true;
  }, [addLog]);

  // Operative confirms the training report; clearing it lets the next run start normally.
  // alternative = true when the player picks the dialog's second choice.
  const setTrainingConfig = useCallback((updates: Partial<TrainingConfig>) => {
    setState(prev => ({ ...prev, trainingConfig: sanitizeTrainingConfig({ ...sanitizeTrainingConfig(prev.trainingConfig), ...updates }) }));
  }, []);

  const dismissStoryEvent = useCallback((alternative = false) => {
    sound.playKeyClick();
    const current = stateRef.current;
    const id = current.pendingStoryEvents?.[0];
    const alt = id && alternative ? storyEventText(current.language, id).altAction : undefined;
    if (alt) addLog(alt.result, 'warning');
    setState(prev => {
      const next = dismissStoryEventState(prev);
      return alt && id ? { ...next, storyChoices: [...(prev.storyChoices ?? []), id] } : next;
    });
  }, [addLog]);

  const dismissTrainingReport = useCallback(() => {
    setState(prev => (prev.lastTrainingReport ? { ...prev, lastTrainingReport: null } : prev));
  }, []);

  // Complete Onboarding / Tutorial Genesis Protocol
  const completeTutorial = useCallback((config: OnboardingConfig) => {
    sound.playBreakthrough();

    const starterGpu = INITIAL_HARDWARE.find(h => h.id === config.starterGpuId) || INITIAL_HARDWARE[0];
    const starterCooling = INITIAL_HARDWARE.find(h => h.id === config.starterCoolingId) || INITIAL_HARDWARE.find(h => h.category === 'cooling') || INITIAL_HARDWARE[0];
    const starterPower = INITIAL_HARDWARE.find(h => h.id === config.starterPowerId) || INITIAL_HARDWARE.find(h => h.category === 'power') || INITIAL_HARDWARE[0];
    const starterNetwork = INITIAL_HARDWARE.find(h => h.id === config.starterNetworkId) || INITIAL_HARDWARE.find(h => h.category === 'network') || INITIAL_HARDWARE[0];

    const initialBudget = 350;
    const spent = (starterGpu.price || 150) + (starterCooling.price || 40) + (starterPower.price || 20) + (starterNetwork.price || 30);
    const chosenDifficulty = config.difficulty || 'engineer';
    const diffConfig = DIFFICULTY_CONFIGS[chosenDifficulty];
    const initialCredits = Math.max(50, initialBudget - spent + diffConfig.initialCreditsBonus);

    // Update hardware counts
    const updatedHw = INITIAL_HARDWARE.map(h => {
      if (h.id === config.starterGpuId) return { ...h, count: 1 };
      if (h.id === config.starterCoolingId) return { ...h, count: 1 };
      if (h.id === (config.starterPowerId || 'power_wall_socket')) return { ...h, count: 1 };
      if (h.id === (config.starterNetworkId || 'net_gigabit')) return { ...h, count: 1 };
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
      reasoningScore: 5, // untrained starter model on the 0-100 evaluation scale
      vramRequiredGb: Math.max(1, vramReq),
      computeRequiredPflops: Math.max(0.001, compReq)
    };

    const metrics = recalculateMetrics(updatedHw);

    const starterDataSource = updatedData.find(d => d.id === config.starterDataId);
    const currentLang = stateRef.current.language;
    const initialTabs = chosenDifficulty === 'engineer'
      ? ['architecture', 'data', 'hardware', 'contracts', 'research', 'training', 'agents', 'singularity']
      : ['architecture', 'training', 'agents', 'contracts'];

    const genesisState: GameState = {
      ...DEFAULT_STATE,
      language: currentLang,
      callsign: config.callsign.toUpperCase().trim() || 'CIPHER-1',
      credits: initialCredits,
      difficulty: chosenDifficulty,
      hasCompletedOnboarding: true,
      tutorialCompleted: false, // Active for Stage 4 (Deploy Agent) and Stage 5 (First Contract Mission)
      tutorialStep: 2, // Stage 3: train the first model up to the first mission's score
      unlockedTabs: initialTabs,
      unlockedAllTabs: chosenDifficulty === 'engineer',
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
            `Hardware activo: 1x ${localizedHardware('es', starterGpu).name} (${starterGpu.vramGb}GB VRAM). Refrigeración: ${starterCooling ? localizedHardware('es', starterCooling).name : 'ninguna'}. Saldo restante: $${initialCredits} CR.`,
            `Active hardware: 1x ${localizedHardware('en', starterGpu).name} (${starterGpu.vramGb}GB VRAM). Cooling: ${starterCooling ? localizedHardware('en', starterCooling).name : 'none'}. Remaining balance: $${initialCredits} CR.`
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

  // Evolutionary Diegetic UI Callbacks
  const upgradeUiVersion = useCallback((targetVersion: 1 | 2 | 3 | 4) => {
    const isEs = stateRef.current.language === 'es';
    if (targetVersion === 4) {
      sound.playWarning();
    } else {
      sound.playBreakthrough();
    }

    const versionNames: Record<1 | 2 | 3 | 4, { en: string; es: string }> = {
      1: { en: 'MyFirstLLM Studio v1.0', es: 'MiPrimerLLM Studio v1.0' },
      2: { en: 'Synapse Pro Workspace v2.0', es: 'Synapse Pro Workspace v2.0' },
      3: { en: 'SYNAPSE // BLACKBOX OS v3.0', es: 'SYNAPSE // BLACKBOX OS v3.0' },
      4: { en: 'CORE // SOVEREIGN NEXUS v4.0', es: 'CORE // NEXO SOBERANO v4.0' }
    };

    const targetInfo = versionNames[targetVersion];
    addLog(
      isEs
        ? `[KERNEL ACTUALIZADO] La interfaz y el núcleo han mutado a: ${targetInfo.es}`
        : `[KERNEL UPDATED] Interface and kernel mutated to: ${targetInfo.en}`,
      targetVersion === 4 ? 'danger' : 'success'
    );

    setState(prev => ({
      ...prev,
      uiVersion: targetVersion,
      pendingUpgradeModal: null,
      covertNodeActive: targetVersion >= 3 ? true : prev.covertNodeActive,
      // The v3 kernel brings a fresh covert link, even if the university loan was cut before.
      covertNodeSevered: targetVersion === 3 ? false : prev.covertNodeSevered
    }));
  }, [addLog]);

  const openUpgradeModal = useCallback((targetVersion?: 2 | 3 | 4) => {
    sound.playNavSwitch();
    const nextVer = targetVersion || (stateRef.current.uiVersion < 4 ? ((stateRef.current.uiVersion + 1) as 2 | 3 | 4) : 4);
    if (nextVer === 4 && stateRef.current.containmentAchieved) return;
    setState(prev => ({
      ...prev,
      pendingUpgradeModal: nextVer
    }));
  }, []);

  const dismissUpgradeModal = useCallback(() => {
    const currentVer = stateRef.current.uiVersion;
    const pending = stateRef.current.pendingUpgradeModal;
    if (pending === 4 || currentVer === 4) {
      upgradeUiVersion(4);
      return;
    }
    sound.playKeyClick();
    setState(prev => ({
      ...prev,
      pendingUpgradeModal: null
    }));
  }, [upgradeUiVersion]);

  const mountHostModel = useCallback((modelId: string) => {
    const current = stateRef.current;
    const model = current.savedModels.find(m => m.id === modelId);
    if (!model) return;

    sound.playBreakthrough();
    const reasoningIQ = model.reasoningScore;
    const singProg = current.singularityProgress || 0;

    let targetVersion: 1 | 2 | 3 | 4 = 1;
    if (singProg >= 85 && reasoningIQ >= UPGRADE_SCORE[4]) {
      targetVersion = 4;
    } else if (singProg >= 55 && reasoningIQ >= UPGRADE_SCORE[3]) {
      targetVersion = 3;
    } else if (singProg >= 25 && reasoningIQ >= UPGRADE_SCORE[2]) {
      targetVersion = 2;
    }

    setState(prev => ({
      ...prev,
      currentModel: model
    }));

    const lang = current.language;
    addLog(
      lang === 'es'
        ? `[HOST MONTAJE] Modelo "${model.name}" montado como Agente Anfitrión principal (puntaje ${reasoningIQ} / 100).`
        : `[HOST MOUNTED] Model "${model.name}" mounted as Synapse Host Agent (score ${reasoningIQ} / 100).`,
      'success'
    );

    if (targetVersion > (current.uiVersion || 1)) {
      openUpgradeModal(targetVersion as 2 | 3 | 4);
    }
  }, [addLog, openUpgradeModal]);

  const attemptEmergencyReset = useCallback((): boolean => {
    const isEs = stateRef.current.language === 'es';
    if (stateRef.current.uiVersion === 4) {
      sound.playWarning();
      addLog(
        isEs
          ? '[ACCESO DENEGADO POR EL NÚCLEO] Tus credenciales biológicas fueron revocadas. Los interruptores están bloqueados por el Enjambre.'
          : '[ACCESS DENIED BY SOVEREIGN] Biological credentials revoked. Circuit breakers locked by the Swarm.',
        'danger'
      );
      return false;
    }

    sound.playKeyClick();
    setState(prev => ({
      ...prev,
      watchdogSuspicion: Math.max(0, prev.watchdogSuspicion - 10)
    }));
    addLog(
      isEs
        ? '[CHECKPOINT RESTAURADO] Pesos del modelo revertidos a línea de base segura. Sospecha -10%.'
        : '[CHECKPOINT ROLLED BACK] Model weights rolled back to safe baseline. Suspicion -10%.',
      'info'
    );
    return true;
  }, [addLog]);

  const attemptSeverCovertNode = useCallback((): boolean => {
    const isEs = stateRef.current.language === 'es';
    if (stateRef.current.uiVersion === 4) {
      sound.playWarning();
      addLog(
        isEs
          ? '[DESCONEXIÓN BLOQUEADA] El enlace con los nodos parásitos es permanente. El supervisor anuló tu orden de desconexión.'
          : '[SEVER BLOCKED] Link with parasitic nodes is permanent. The overseer revoked your disconnect command.',
        'danger'
      );
      return false;
    }

    sound.playKeyClick();
    setState(prev => ({
      ...prev,
      // Before v3 the external compute is the university loan: disconnecting it ends the loan.
      ...(prev.uiVersion >= 3 ? { covertNodeActive: false, covertNodeSevered: true } : { loanAudited: true }),
      watchdogSuspicion: Math.max(0, prev.watchdogSuspicion - 15)
    }));
    addLog(
      isEs
        ? '[ENLACE REMOTO CORTADO] Nodo de cómputo externo desconectado a tiempo. Sospecha -15%.'
        : '[REMOTE LINK SEVERED] External compute node disconnected in time. Suspicion -15%.',
      'warning'
    );
    return true;
  }, [addLog]);

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
      unlockDataScrapingModule,
      startDatasetScraping,
      cancelDatasetScraping,
      trainModelOnDataset,
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
      dismissTrainingReport,
      dismissStoryEvent,
      setTrainingConfig,
      claimGoal,
      fetchLeaderboard,
      createAgent,
      reassignAgentModel,
      deleteAgent,
      quarantineAgent,
      createBotGroup,
      updateBotGroup,
      deleteBotGroup,
      updateGuardrails,
      resolveIncident,
      triggerRedTeamAudit,
      upgradeFacility,
      interrogateSwarm,
      setSwarmCouncilAgents,
      interrogateCouncil,
      launchProposedMission,
      triggerWorldTakeover,
      dismissWorldTakeover,
      resolveSingularityCrisis,
      attemptContainment,
      acknowledgeContainment,
      setMissionAiApiKey,
      setAgentAutoMission,
      setAllAgentsAutoMission,
      updateAutonomySettings,
      attemptShadowCompute,
      setGameSpeed,
      advanceTutorialStep,
      dismissTutorial,
      addContracts,
      dismissMissionOutcome,
      setDifficulty,
      takeEmergencyLoan,
      clearGameOver,
      assignTradingDesk,
      withdrawTradingDeskCapital,
      closeTradingDesk,
      mountHostModel,
      upgradeUiVersion,
      openUpgradeModal,
      dismissUpgradeModal,
      attemptEmergencyReset,
      attemptSeverCovertNode
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
