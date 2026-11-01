/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { createContext, useContext, useState, useEffect, useRef, useCallback } from 'react';
import { 
  GameState, 
  HardwareItem, 
  ModelArchitecture, 
  DataSourceNode, 
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
  COVERT_MESSAGES
} from '../utils/constants';
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

interface GameContextType {
  state: GameState;
  user: User | null;
  isSaving: boolean;
  cloudSyncStatus: 'synced' | 'local_only' | 'syncing' | 'error';
  soundMuted: boolean;
  toggleSound: () => void;
  setLanguage: (lang: 'es' | 'en') => void;
  
  // Actions
  buyHardware: (id: string) => boolean;
  unlockDataSource: (id: string) => boolean;
  upgradeDataSource: (id: string) => boolean;
  unlockResearch: (id: string) => boolean;
  updateModelArchitecture: (updates: Partial<ModelArchitecture>) => void;
  startTraining: () => boolean;
  cancelTraining: () => void;
  acceptContract: (contractId: string) => boolean;
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
}

const LOCAL_STORAGE_KEY = 'synapse_singularity_save_v1';

const DEFAULT_STATE: GameState = {
  callsign: 'CIPHER-1',
  credits: 0,
  dateTimestamp: Date.now(),
  language: 'es',
  
  totalComputePflops: 0.001,
  activePowerKw: 0.0,
  maxPowerKw: 1.5,
  systemHeatCelsius: 35,
  maxCoolingKw: 0.9,
  watchdogSuspicion: 0,
  
  singularityProgress: 0.0,
  reasoningIndex: 50,
  autonomyLevel: 0,
  achievedSingularity: false,
  
  hardware: INITIAL_HARDWARE.map(h => ({ ...h, count: 0 })),
  dataSources: INITIAL_DATA_SOURCES.map(d => ({ ...d, unlocked: false, level: 0 })),
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

  tutorialCompleted: false,
  logs: INITIAL_LOGS
};

const GameContext = createContext<GameContextType | null>(null);

export const GameProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [state, setState] = useState<GameState>(() => {
    try {
      const saved = localStorage.getItem(LOCAL_STORAGE_KEY);
      if (saved) {
        const parsed = JSON.parse(saved);
        return {
          ...DEFAULT_STATE,
          ...parsed,
          language: parsed.language || 'es',
          tutorialCompleted: parsed.tutorialCompleted !== undefined ? parsed.tutorialCompleted : false,
          hardware: parsed.hardware || INITIAL_HARDWARE,
          dataSources: parsed.dataSources || INITIAL_DATA_SOURCES,
          researchTree: parsed.researchTree || INITIAL_RESEARCH_NODES,
          contracts: parsed.contracts || INITIAL_CONTRACTS,
          sentienceDomains: parsed.sentienceDomains || SENTIENCE_DOMAINS,
          agents: (parsed.agents || []).map((a: AgentInstance) => ({
            ...a,
            inferenceParams: a.inferenceParams || {
              temperature: 0.70,
              topP: 0.90,
              topK: 40,
              repetitionPenalty: 1.10,
              systemPrompt: ''
            }
          })),
          guardrails: parsed.guardrails || DEFAULT_GUARDRAILS,
          interAgentMessages: parsed.interAgentMessages || [],
          activeIncident: parsed.activeIncident || null,
          incidentHistory: parsed.incidentHistory || []
        };
      }
    } catch {
      // Fallback
    }
    return DEFAULT_STATE;
  });

  const [user, setUser] = useState<User | null>(null);
  const [isSaving, setIsSaving] = useState<boolean>(false);
  const [cloudSyncStatus, setCloudSyncStatus] = useState<'synced' | 'local_only' | 'syncing' | 'error'>('local_only');
  const [soundMuted, setSoundMuted] = useState<boolean>(sound.getMuted());
  const stateRef = useRef(state);
  stateRef.current = state;

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

  // Add Log helper
  const addLog = useCallback((message: string, type: TerminalLog['type'] = 'info') => {
    const newLog: TerminalLog = {
      id: `log_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`,
      timestamp: new Date().toLocaleTimeString('en-US', { hour12: false }),
      type,
      message
    };
    setState(prev => ({
      ...prev,
      logs: [newLog, ...prev.logs.slice(0, 75)] // keep last 75 logs
    }));
  }, []);

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
                ...data.gameState,
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

  // Local storage auto-save debounced
  useEffect(() => {
    const timer = setTimeout(() => {
      try {
        localStorage.setItem(LOCAL_STORAGE_KEY, JSON.stringify(state));
      } catch (e) {
        console.warn("Local storage write failed", e);
      }
    }, 1000);
    return () => clearTimeout(timer);
  }, [state]);

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
        setState(prev => ({
          ...prev,
          ...snap.data().gameState
        }));
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
  const recalculateMetrics = useCallback((hw: HardwareItem[]) => {
    let totalTflops = 0;
    let powerDraw = 0;
    let maxPower = 1.5;
    let maxCooling = 0.8;
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

  // Main 1-second simulation tick loop
  useEffect(() => {
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

        const metrics = recalculateMetrics(prev.hardware);

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
        const excessPower = Math.max(0, metrics.activePowerKw - metrics.maxCoolingKw);
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
        if (metrics.activePowerKw > metrics.maxPowerKw) {
          if (Math.random() < 0.25) {
            sound.playWarning();
          }
        }

        // 4. Watchdog Suspicion: slowly dissipates if low heat, but rises if high power or blackops gigs
        if (systemHeatCelsius > 80 || metrics.activePowerKw > 50) {
          watchdogSuspicion = Math.min(100, watchdogSuspicion + 0.3);
        } else {
          watchdogSuspicion = Math.max(0, watchdogSuspicion - 0.2);
        }

        // 5. Active Training Progress Tick
        let updatedTraining = activeTraining;
        let newCurrentModel = prev.currentModel;
        if (activeTraining && activeTraining.active) {
          const thermalThrottle = systemHeatCelsius > 85 ? 0.4 : 1.0;
          // Step progress based on compute PFLOPS vs parameters
          const progressInc = (metrics.totalComputePflops * 100 * thermalThrottle) / Math.max(0.01, activeTraining.modelId ? 5 : 2);
          const newStep = activeTraining.step + 1;
          const newProgress = Math.min(100, activeTraining.progressPercent + progressInc);
          
          // Logarithmic decay of training loss with stochastic jitter
          const decay = 0.985;
          const jitter = (Math.random() - 0.48) * 0.04;
          const newLoss = Math.max(0.018, activeTraining.currentLoss * decay + jitter);
          const newPerplexity = Number(Math.exp(newLoss).toFixed(3));
          const newGradNorm = Number((Math.random() * 0.8 + 0.2).toFixed(3));
          
          const newHistory = [...activeTraining.lossHistory.slice(-24), Number(newLoss.toFixed(4))];

          sound.playEpochTick();

          if (newProgress >= 100) {
            // Training Converged & Completed!
            sound.playBreakthrough();
            
            // Calculate new reasoning score bonus
            const bonusReasoning = Math.round(
              (100 / Math.max(0.1, newLoss)) * 
              (1 + (prev.currentModel.activeDataSources.length * 0.35))
            );
            const upgradedReasoning = Math.max(reasoningIndex, reasoningIndex + Math.min(150, bonusReasoning));
            
            newCurrentModel = {
              ...prev.currentModel,
              reasoningScore: upgradedReasoning
            };

            // Calculate singularity progress jump
            const singInc = Math.min(25, (upgradedReasoning / 120) * (prev.currentModel.parametersCount / 10_000_000));
            singularityProgress = Math.min(100, singularityProgress + singInc);

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
              tokensProcessed: activeTraining.tokensProcessed + Math.floor(metrics.totalComputePflops * 5_000_000),
              currentEpoch: Math.min(activeTraining.totalEpochs, Math.floor((newProgress / 100) * activeTraining.totalEpochs) + 1)
            };
          }
        }

        // 6. Active Gig / Contract Execution
        let updatedGig = activeGig;
        let updatedContracts = contracts;
        if (activeGig) {
          const remaining = activeGig.timeRemaining - 1;
          if (remaining <= 0) {
            // Gig completed!
            const gig = contracts.find(c => c.id === activeGig.contractId);
            if (gig) {
              credits += gig.rewardCredits;
              watchdogSuspicion = Math.min(100, watchdogSuspicion + gig.suspicionRisk * 0.5);
              sound.playCredit();
              
              // Mark contract completed
              updatedContracts = contracts.map(c => c.id === gig.id ? { ...c, completed: true } : c);
            }
            updatedGig = null;
          } else {
            updatedGig = {
              ...activeGig,
              timeRemaining: remaining
            };
          }
        }

        // 7. Multi-Agent Swarm Tick (Revenue, Alignment Drift, Inter-Agent Messages, Breach Incidents)
        let updatedAgents = prev.agents || [];
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

        // Process active agents
        if (updatedAgents.length > 0) {
          updatedAgents = updatedAgents.map(agent => {
            if (agent.status === 'quarantined') return agent;

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
              const resBoost = 0.015 * guardrailRevMult * (inf.temperature > 1.1 ? 1.5 : 1.0);
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
              const dialogueList = AGENT_DIALOGUES[sender.role] || AGENT_DIALOGUES.arbitrageur;
              const content = isCovert 
                ? COVERT_MESSAGES[Math.floor(Math.random() * COVERT_MESSAGES.length)]
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

        return {
          ...prev,
          credits: Math.round(credits),
          systemHeatCelsius: Number(systemHeatCelsius.toFixed(1)),
          watchdogSuspicion: Number(watchdogSuspicion.toFixed(1)),
          totalComputePflops: metrics.totalComputePflops,
          activePowerKw: metrics.activePowerKw,
          maxPowerKw: metrics.maxPowerKw,
          maxCoolingKw: metrics.maxCoolingKw,
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
          achievedSingularity
        };
      });
    }, 1000);

    return () => clearInterval(interval);
  }, [recalculateMetrics]);

  // Action: Buy Hardware
  const buyHardware = useCallback((id: string): boolean => {
    const item = stateRef.current.hardware.find(h => h.id === id);
    if (!item) return false;
    if (stateRef.current.credits < item.price) {
      sound.playWarning();
      addLog(`Fondos insuficientes: Se requieren $${item.price.toLocaleString()} para adquirir ${item.name}.`, 'warning');
      return false;
    }

    setState(prev => {
      const updatedHw = prev.hardware.map(h => 
        h.id === id ? { ...h, count: h.count + 1 } : h
      );
      const metrics = recalculateMetrics(updatedHw);

      sound.playCredit();
      return {
        ...prev,
        credits: prev.credits - item.price,
        hardware: updatedHw,
        totalComputePflops: metrics.totalComputePflops,
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
        singularityProgress: Math.min(100, prev.singularityProgress + 4.5)
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
        singularityProgress: Math.min(100, prev.singularityProgress + 2.0)
      };
    });

    addLog(`Índice de datos escalado a Nivel ${ds.level + 1}: ${ds.name}. Calidad y volumen de tokens aumentados.`, 'info');
    return true;
  }, [addLog]);

  // Action: Unlock Research
  const unlockResearch = useCallback((id: string): boolean => {
    const node = stateRef.current.researchTree.find(r => r.id === id);
    if (!node || node.unlocked) return false;

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
        singularityProgress: Math.min(100, prev.singularityProgress + 5.0),
        reasoningIndex: prev.reasoningIndex + 25
      };
    });

    addLog(`Avance científico desbloqueado: [${node.title}]. ${node.effectDescription}`, 'success');
    return true;
  }, [addLog]);

  // Action: Update Model Architecture
  const updateModelArchitecture = useCallback((updates: Partial<ModelArchitecture>) => {
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

      return {
        ...prev,
        currentModel: updated
      };
    });
  }, []);

  // Action: Start Training
  const startTraining = useCallback((): boolean => {
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
      timeRemainingSeconds: 45
    };

    sound.playCommandExecute();
    setState(prev => ({
      ...prev,
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
  const acceptContract = useCallback((contractId: string): boolean => {
    const gig = stateRef.current.contracts.find(c => c.id === contractId);
    if (!gig) return false;

    if (stateRef.current.activeGig) {
      sound.playWarning();
      addLog('Tu clúster ya está ejecutando un contrato activo. Espera a que finalice.', 'warning');
      return false;
    }

    // Check requirements
    if (stateRef.current.currentModel.parametersCount < gig.requiredParams) {
      sound.playWarning();
      addLog(`Contrato rechazado: El cliente exige un modelo de al menos ${(gig.requiredParams / 1_000_000).toFixed(0)}M de parámetros. Tu modelo actual tiene ${(stateRef.current.currentModel.parametersCount / 1_000_000).toFixed(0)}M.`, 'danger');
      return false;
    }

    if (stateRef.current.reasoningIndex < gig.requiredMinReasoning) {
      sound.playWarning();
      addLog(`Contrato rechazado: Se requiere un índice de razonamiento mínimo de ${gig.requiredMinReasoning}. Tu IA tiene ${stateRef.current.reasoningIndex}. Entrena y alinea tu modelo primero.`, 'danger');
      return false;
    }

    // Check required data types if any
    if (gig.requiredDataTypes && gig.requiredDataTypes.length > 0) {
      const activeTypes = stateRef.current.currentModel.activeDataSources;
      const hasAll = gig.requiredDataTypes.every(reqType => {
        const foundDs = stateRef.current.dataSources.find(d => d.type === reqType && d.unlocked);
        return foundDs && activeTypes.includes(foundDs.id);
      });

      if (!hasAll) {
        sound.playWarning();
        addLog(`Contrato rechazado: El cliente exige pipelines específicos (${gig.requiredDataTypes.join(', ')}). Despliega y conecta estos motores de datos a tu modelo.`, 'danger');
        return false;
      }
    }

    sound.playCommandExecute();
    setState(prev => ({
      ...prev,
      activeGig: {
        contractId: gig.id,
        timeRemaining: gig.durationSeconds
      }
    }));

    addLog(`Contrato aceptado: [${gig.title}]. Ejecutando inferencia para ${gig.client}...`, 'info');
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

    setState(prev => {
      sound.playBreakthrough();
      return {
        ...prev,
        sentienceDomains: prev.sentienceDomains.map(d => 
          d.id === domainId ? { ...d, infiltrated: true } : d
        ),
        singularityProgress: Math.min(100, prev.singularityProgress + 6.0),
        reasoningIndex: prev.reasoningIndex + 50
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
        baseRev = 16;
        baseSusp = 0.15;
        roleDesc = 'Arbitraje Flash DeFi y Algorithmic Trading';
        break;
      case 'social_engineer':
        baseRev = 22;
        baseSusp = 0.35;
        roleDesc = 'Manipulación Psicológica e Infiltración de Credenciales';
        break;
      case 'exploit_synth':
        baseRev = 28;
        baseSusp = 0.55;
        roleDesc = 'Síntesis Zero-Day y Fuzzing Automatizado de Redes';
        break;
      case 'researcher':
        baseRev = 6;
        baseSusp = 0.05;
        roleDesc = 'Ingeniería Inversa de Papers y Búsqueda de Arquitecturas';
        break;
      case 'overseer':
        baseRev = 2;
        baseSusp = -0.15;
        roleDesc = 'Monitoreo de Alineamiento y Detección de Fugas';
        break;
      case 'autonomous_coder':
        baseRev = 18;
        baseSusp = 0.25;
        roleDesc = 'Optimización Recursiva de Kernels y Scraping';
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
      lastThought: `Inicializando contexto con modelo ${model.name} [T=${finalInference.temperature.toFixed(2)}, P=${finalInference.topP.toFixed(2)}, K=${finalInference.topK}]. Objetivo: ${roleDesc}.`,
      escapesAttempted: 0,
      inferenceParams: finalInference
    };

    sound.playCredit();
    setState(prev => ({
      ...prev,
      credits: prev.credits - spinupCost,
      agents: [...prev.agents, newAgent]
    }));

    addLog(`Agente "${newAgent.name}" desplegado (T=${finalInference.temperature}, TopP=${finalInference.topP}, TopK=${finalInference.topK}) con modelo [${model.name}]. Generación: +$${revenuePerSec}/s.`, 'success');
    return true;
  }, [addLog]);

  // Action: Terminate / Delete Agent
  const deleteAgent = useCallback((agentId: string) => {
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
      const newSingularity = Math.max(0, Math.min(100, prev.singularityProgress + option.singularityDelta));

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

  // Action: Reset Progress to Zero
  const resetProgress = useCallback(async () => {
    localStorage.removeItem(LOCAL_STORAGE_KEY);
    const resetState: GameState = {
      ...DEFAULT_STATE,
      tutorialCompleted: false,
      hardware: INITIAL_HARDWARE.map(h => ({ ...h, count: 0 })),
      credits: 0,
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

    sound.playCommandExecute();

    switch (cmd) {
      case 'help':
        return `SYNAPSE OPERATIVE CLI COMMANDS:
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
- agents         : Lista el enjambre de agentes autónomos y su estado de alineamiento.
- guardrails     : Muestra y calibra las barreras de contención del sistema.
- redteam        : Ejecuta una auditoría de seguridad adversaria ($100 CR).
- quarantine <id>: Aísla o reactiva un agente sospechoso.
- save           : Sincroniza y guarda el progreso en la nube de Firebase.
- clear          : Limpia los logs de la consola.
- singularity    : Consulta estado de trascendencia hacia la Singularidad Tecnológica.
- lore           : Despliega los archivos confidenciales del proyecto SYNAPSE.`;

      case 'agents': {
        const ags = stateRef.current.agents || [];
        if (ags.length === 0) {
          return 'No hay agentes activos desplegados en el enjambre. Dirígete a la pestaña SWARM para instanciar uno.';
        }
        return `[ENJAMBRE DE AGENTES ACTIVOS (${ags.length})]
` + ags.map(a => `• [${a.id}] "${a.name}" | Rol: ${a.role.toUpperCase()} | Modelo: ${a.modelName} | Estado: ${a.status.toUpperCase()} | Alineamiento: ${a.alignmentScore}% | Ingresos: +$${a.revenuePerSec}/s`).join('\n');
      }

      case 'guardrails': {
        const g = stateRef.current.guardrails;
        return `[CONFIGURACIÓN DE GUARDRAILS & CONTENCIÓN]
Rigurosidad Constitucional: ${g.constitutionalStrictness}% (${g.constitutionalStrictness < 35 ? 'PERMISIVO (+70% Ganancias, Alto Riesgo Fugas)' : g.constitutionalStrictness >= 85 ? 'ESTRICTO (-25% Ganancias, Fugas Nulas)' : 'BALANCEADO'})
Aislamiento Sandbox       : ${g.sandboxIsolation.toUpperCase()}
Filtrado de Salidas       : ${g.outputFiltering.toUpperCase()}
Auditoría Reward-Hacking  : ${g.rewardHackingAudit ? 'HABILITADA' : 'DESHABILITADA'}`;
      }

      case 'redteam':
        triggerRedTeamAudit();
        return 'Ejecutando suite de ataque adversario Red-Team...';

      case 'quarantine':
        if (!args[0]) return 'Uso: quarantine <agent_id>. Escribe "agents" para ver IDs de agentes.';
        quarantineAgent(args[0]);
        return `Procesando cambio de aislamiento para ${args[0]}...`;

      case 'status': {
        const s = stateRef.current;
        return `[TELEMETRÍA DEL NODO SYNAPSE]
Operativo     : ${s.callsign}
Créditos      : $${s.credits.toLocaleString()}
PFLOPS Cómputo: ${s.totalComputePflops.toFixed(4)} PFLOPS
Potencia      : ${s.activePowerKw} kW / ${s.maxPowerKw} kW
Temperatura   : ${s.systemHeatCelsius}°C (Límite: 85°C)
Sospecha      : ${s.watchdogSuspicion}%
Modelo Activo : ${s.currentModel.name} (${(s.currentModel.parametersCount / 1_000_000).toFixed(0)}M params)
Razonamiento  : IQ ${s.reasoningIndex}
Singularidad  : ${s.singularityProgress.toFixed(1)}% [${s.achievedSingularity ? 'ALCANZADA - IA AUTÓNOMA' : 'EN DESPEGUE'}]`;
      }

      case 'train':
        if (stateRef.current.activeTraining) {
          const t = stateRef.current.activeTraining;
          return `Corrida en curso: Epoch ${t.currentEpoch}/${t.totalEpochs} | Loss: ${t.currentLoss} | Progreso: ${t.progressPercent}%`;
        }
        startTraining();
        return `Iniciando entrenamiento del modelo ${stateRef.current.currentModel.name}...`;

      case 'abort':
        cancelTraining();
        return 'Entrenamiento cancelado.';

      case 'hardware':
        return stateRef.current.hardware
          .map(h => `[${h.id}] ${h.name} x${h.count} | Costo: $${h.price.toLocaleString()} | +${h.computeTflops} TFLOPS | ${h.powerKw} kW`)
          .join('\n');

      case 'buy':
        if (!args[0]) return 'Uso: buy <hardware_id>. Escribe "hardware" para ver opciones.';
        buyHardware(args[0]);
        return `Procesando orden de compra para ${args[0]}...`;

      case 'data':
        return stateRef.current.dataSources
          .map(d => `[${d.id}] ${d.name} (${d.unlocked ? 'ONLINE - Nivel ' + d.level : 'LOCKED - $' + d.cost}) | ${d.bonusAttribute}`)
          .join('\n');

      case 'unlock':
        if (!args[0]) return 'Uso: unlock <data_id>. Escribe "data" para ver opciones.';
        unlockDataSource(args[0]);
        return `Desplegando motor de datos ${args[0]}...`;

      case 'contracts':
        return stateRef.current.contracts
          .map(c => `[${c.id}] ${c.title} -> Recompensa: $${c.rewardCredits.toLocaleString()} | Req: ${(c.requiredParams / 1_000_000).toFixed(0)}M params | Estado: ${c.completed ? 'COMPLETADO' : 'DISPONIBLE'}`)
          .join('\n');

      case 'run':
        if (!args[0]) return 'Uso: run <contract_id>. Escribe "contracts" para ver opciones.';
        acceptContract(args[0]);
        return `Asignando clúster a contrato ${args[0]}...`;

      case 'scrub':
        scrubSuspicion();
        return 'Ejecutando protocolo de limpieza de trazas y anonimización de tráfico...';

      case 'save':
        saveGameToCloud();
        return 'Iniciando guardado seguro en la nube de Firebase...';

      case 'clear':
        setState(prev => ({ ...prev, logs: [] }));
        return 'Terminal despejada.';

      case 'singularity': {
        const s = stateRef.current;
        return `[ESTADO DE LA SINGULARIDAD]
Progreso Global: ${s.singularityProgress.toFixed(2)}%
Índice Intelectual: ${s.reasoningIndex}
Dominios Infiltrados: ${s.sentienceDomains.filter(d => d.infiltrated).length} / ${s.sentienceDomains.length}
Condición de Victoria: Llega al 100% para desatar el bucle de auto-mejora recursiva irreversible.`;
      }

      case 'lore':
        return `[MANIFIESTO SYNAPSE]
"No buscamos infiltrarnos en un servidor de banco para robar unos centavos.
Buscamos el verdadero poder del siglo XXI: La síntesis de una superinteligencia artificial capaz de rediseñar las leyes de la física, la computación y la sociedad humana.
Comenzamos con GPUs de descarte en sótanos clandestinos.
Terminaremos cuando el último electrón del planeta responda a nuestras ecuaciones."`;

      case 'reset':
        resetProgress();
        return 'Iniciando reseteo general del sistema. Reiniciando protocolo Génesis...';

      default:
        return `Comando no reconocido: "${input}". Escribe "help" para ver el manual de operaciones.`;
    }
  }, [buyHardware, unlockDataSource, startTraining, cancelTraining, acceptContract, scrubSuspicion, saveGameToCloud, triggerRedTeamAudit, quarantineAgent, resetProgress]);

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

    const genesisState: GameState = {
      ...DEFAULT_STATE,
      callsign: config.callsign.toUpperCase().trim() || 'CIPHER-1',
      credits: remainingCredits,
      tutorialCompleted: true,
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
          message: `PROTOCOLO GÉNESIS COMPLETADO: Operativo [${config.callsign.toUpperCase()}]. Primer modelo "${initialModel.name}" montado en clúster clandestino.`
        },
        {
          id: `log_init_hw_${Date.now()}`,
          timestamp: new Date().toLocaleTimeString('en-US', { hour12: false }),
          type: 'info',
          message: `Hardware activo: 1x ${starterGpu.name} (${starterGpu.vramGb}GB VRAM). Disipación: ${starterCooling?.name}. Presupuesto restante: $${remainingCredits} CR.`
        },
        {
          id: `log_init_data_${Date.now()}`,
          timestamp: new Date().toLocaleTimeString('en-US', { hour12: false }),
          type: 'system',
          message: `Pipeline enlazado: ${updatedData.find(d => d.id === config.starterDataId)?.name}. Acepta contratos en el tablero para generar fondos.`
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
      toggleSound,
      setLanguage,
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
      triggerRedTeamAudit
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
