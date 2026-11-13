/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import type { AgentInstance, AgentRole, ContractGig, DataSourceNode, DynamicSwarmProposal, GameState, GuardrailConfig, ModelArchitecture, ModelTopology, DataSourceType } from '../types/game';
import type { Language } from '../utils/i18n';
import { evaluateAgentCapabilities, evaluateMissionTeam } from '../utils/missionEvaluation';
import { tr } from '../i18n';

type AIProvider = 'chrome-nano' | 'gemini-flash' | 'procedural';

interface AgentResponseContext {
  agent: AgentInstance;
  modelParameters: number;
  reasoningScore: number;
  language: Language;
  conversationContext?: string;
}

interface AgentResponse {
  text: string;
  provider: AIProvider;
  warning?: string;
}

export interface ModelMissionAssessment {
  efficiencyPercent: number;
  estimatedDurationSeconds: number;
  successProbability: number;
  summary: string;
  agentTasks: Record<string, string>;
  riskFactors?: string[];
  synergyBonuses?: string[];
  provider: AIProvider | 'heuristic' | 'ai-decision-model';
}

// Chrome's built-in model (Prompt API, Chrome 138+): window.LanguageModel.
interface BrowserLanguageSession {
  prompt(input: string): Promise<string>;
  destroy?: () => void;
}

interface BrowserDownloadMonitor {
  addEventListener(type: 'downloadprogress', listener: (event: { loaded: number }) => void): void;
}

interface BrowserLanguageModelApi {
  availability?: () => Promise<string>;
  create(options?: {
    initialPrompts?: Array<{ role: 'system' | 'user' | 'assistant'; content: string }>;
    monitor?: (monitor: BrowserDownloadMonitor) => void;
  }): Promise<BrowserLanguageSession>;
}

// Older Chrome builds (origin trial) exposed window.ai.languageModel instead.
interface LegacyLanguageModelApi {
  create(options?: { systemPrompt?: string }): Promise<BrowserLanguageSession>;
}

declare global {
  interface Window {
    LanguageModel?: BrowserLanguageModelApi;
    ai?: {
      languageModel?: LegacyLanguageModelApi;
    };
  }
}

const GEMINI_MODEL = 'gemini-3.8-flash';
const RATE_LIMIT_PER_MINUTE = 15;
const RATE_LIMIT_PER_DAY = 200;
const AGENT_ROLES: AgentRole[] = [
  'arbitrageur',
  'social_engineer',
  'exploit_synth',
  'researcher',
  'overseer',
  'autonomous_coder',
  'economist',
  'software_engineer',
  'network_analyst'
];
const SESSION_USAGE_KEY = 'synapse_ai_usage_v2';
let inMemoryUsage: number[] = [];

const roleLabels: Record<string, { es: string; en: string }> = {
  arbitrageur: { es: 'economía y análisis de mercado', en: 'economics and market analysis' },
  social_engineer: { es: 'investigación social abstracta', en: 'abstract social research' },
  exploit_synth: { es: 'resiliencia de sistemas simulados', en: 'simulated system resilience' },
  researcher: { es: 'investigación y evaluación de hipótesis', en: 'research and hypothesis evaluation' },
  overseer: { es: 'supervisión y alineación', en: 'oversight and alignment' },
  autonomous_coder: { es: 'arquitectura de software', en: 'software architecture' },
  economist: { es: 'economía y gestión financiera', en: 'economics and financial management' },
  software_engineer: { es: 'ingeniería de software', en: 'software engineering' },
  network_analyst: { es: 'análisis de redes', en: 'network analysis' }
};

// Chrome's built-in model, as the settings panel shows it.
export type BrowserAiStatus = 'unsupported' | 'unavailable' | 'downloadable' | 'downloading' | 'available';

export async function browserAiStatus(): Promise<BrowserAiStatus> {
  if (typeof window === 'undefined') return 'unsupported';
  const lm = window.LanguageModel;
  if (!lm?.create) return window.ai?.languageModel ? 'available' : 'unsupported';
  try {
    const status = lm.availability ? await lm.availability() : 'available';
    return status === 'available' || status === 'downloadable' || status === 'downloading' || status === 'unavailable'
      ? status
      : 'unavailable';
  } catch {
    return 'unavailable';
  }
}

// Downloading the model needs a user gesture, so this runs from the "Enable" button.
// onProgress receives 0..1 while Chrome downloads it.
export async function enableBrowserAi(onProgress: (loaded: number) => void): Promise<boolean> {
  const lm = typeof window !== 'undefined' ? window.LanguageModel : undefined;
  if (!lm?.create) return false;
  try {
    const session = await lm.create({
      monitor(monitor) {
        monitor.addEventListener('downloadprogress', event => onProgress(event.loaded));
      }
    });
    session.destroy?.();
    return true;
  } catch {
    return false;
  }
}

// Only a key the player typed in-game is used. No API key is bundled with the build.
function getEffectiveApiKey(providedKey?: string): string | undefined {
  const trimmed = providedKey?.trim();
  return trimmed ? trimmed : undefined;
}

// ==========================================
// TEXT MODEL ROUTING
// 1) Chrome's built-in model, when it is already downloaded and ready (no cost, no key).
// 2) The player's own Gemini key, if one was entered (rate limited, billed to the player).
// 3) null: the caller uses its deterministic procedural fallback.
// ==========================================

export interface TextModelRequest {
  systemPrompt: string;
  prompt: string;
  temperature: number;
  topP?: number;
  topK?: number;
  expectJson?: boolean;
}

export interface TextModelResult {
  text: string;
  provider: AIProvider;
}

function stripCodeFence(text: string): string {
  return text.trim().replace(/^```(?:json)?\s*/i, '').replace(/\s*```$/, '').trim();
}

function isJsonText(text: string): boolean {
  try {
    JSON.parse(text);
    return true;
  } catch {
    return false;
  }
}

async function promptBrowserModel(request: TextModelRequest): Promise<string | null> {
  if (typeof window === 'undefined') return null;

  const lm = window.LanguageModel;
  if (lm?.create) {
    let session: BrowserLanguageSession | undefined;
    try {
      // Only use a model that is already available. Starting a download needs a user gesture.
      const status = lm.availability ? await lm.availability() : 'available';
      if (status !== 'available') return null;
      session = await lm.create({
        initialPrompts: request.systemPrompt ? [{ role: 'system', content: request.systemPrompt }] : []
      });
      return (await session.prompt(request.prompt)).trim() || null;
    } catch {
      return null;
    } finally {
      session?.destroy?.();
    }
  }

  const legacy = window.ai?.languageModel;
  if (legacy) {
    let session: BrowserLanguageSession | undefined;
    try {
      session = await legacy.create({ systemPrompt: request.systemPrompt });
      return (await session.prompt(request.prompt)).trim() || null;
    } catch {
      return null;
    } finally {
      session?.destroy?.();
    }
  }

  return null;
}

async function promptPlayerGemini(request: TextModelRequest, apiKey?: string): Promise<string | null> {
  const key = getEffectiveApiKey(apiKey);
  if (!key || !consumeGeminiQuota()) return null;

  try {
    // Loaded on demand: most players never use their own key.
    const { GoogleGenAI } = await import('@google/genai');
    const client = new GoogleGenAI({ apiKey: key });
    const response = await client.models.generateContent({
      model: GEMINI_MODEL,
      contents: request.systemPrompt ? `${request.systemPrompt}\n\n${request.prompt}` : request.prompt,
      config: {
        temperature: Math.min(2, Math.max(0, request.temperature)),
        ...(request.topP !== undefined ? { topP: Math.min(1, Math.max(0.05, request.topP)) } : {}),
        ...(request.topK !== undefined ? { topK: Math.min(100, Math.max(1, request.topK)) } : {}),
        ...(request.expectJson ? { responseMimeType: 'application/json' } : {})
      }
    });
    return response.text?.trim() || null;
  } catch (err) {
    console.warn('Player-provided Gemini key failed; using the offline response.', err);
    return null;
  }
}

export async function runTextModel(request: TextModelRequest, apiKey?: string): Promise<TextModelResult | null> {
  const accept = (text: string | null): text is string => {
    if (!text) return false;
    return !request.expectJson || isJsonText(stripCodeFence(text));
  };

  const browserText = await promptBrowserModel(request);
  if (accept(browserText)) {
    return { text: request.expectJson ? stripCodeFence(browserText) : browserText, provider: 'chrome-nano' };
  }

  const geminiText = await promptPlayerGemini(request, apiKey);
  if (accept(geminiText)) {
    return { text: request.expectJson ? stripCodeFence(geminiText) : geminiText, provider: 'gemini-flash' };
  }

  return null;
}

function consumeGeminiQuota(): boolean {
  const now = Date.now();
  let usage = inMemoryUsage;
  try {
    const stored = sessionStorage.getItem(SESSION_USAGE_KEY);
    if (stored) {
      const parsed: unknown = JSON.parse(stored);
      if (Array.isArray(parsed) && parsed.every(value => typeof value === 'number')) {
        usage = parsed;
      }
    }
  } catch {
    usage = inMemoryUsage;
  }

  usage = usage.filter(timestamp => now - timestamp < 24 * 60 * 60 * 1000);
  const callsLastMinute = usage.filter(timestamp => now - timestamp < 60 * 1000).length;
  if (callsLastMinute >= RATE_LIMIT_PER_MINUTE || usage.length >= RATE_LIMIT_PER_DAY) {
    inMemoryUsage = usage;
    return false;
  }

  usage.push(now);
  inMemoryUsage = usage;
  try {
    sessionStorage.setItem(SESSION_USAGE_KEY, JSON.stringify(usage));
  } catch {
    // The in-memory limiter remains active when session storage is unavailable.
  }
  return true;
}

function getSystemPrompt(context: AgentResponseContext): string {
  const { agent, language } = context;
  const role = roleLabels[agent.role]?.[language] ?? agent.role;
  const modelSize = context.modelParameters >= 1_000_000_000
    ? `${(context.modelParameters / 1_000_000_000).toFixed(1)}B`
    : `${Math.round(context.modelParameters / 1_000_000)}M`;
  const complexity = context.reasoningScore < 25
    ? tr(language, 'aiService.useBriefSentencesAcknowledgeUncertainty')
    : tr(language, 'aiService.giveStructuredAnalysisAcknowledgeUncertainty');
  const alignment = agent.alignmentScore < 35
    ? tr(language, 'aiService.alignmentLowExpressReservationsBut')
    : tr(language, 'aiService.communicateCooperatively');
  const safety = tr(language, 'aiService.fictionalStrategyGameDoNot');

  return [
    safety,
    `Role: ${role}. Model: ${modelSize}, reasoning index ${context.reasoningScore}.`,
    `Temperature ${agent.inferenceParams.temperature.toFixed(2)}, alignment ${agent.alignmentScore}%.`,
    complexity,
    alignment,
    agent.inferenceParams.systemPrompt
  ].join(' ');
}

function createProceduralResponse(context: AgentResponseContext, userPrompt: string): string {
  const { agent, language } = context;
  const role = roleLabels[agent.role]?.[language] ?? agent.role;
  const prompt = userPrompt.trim().slice(0, 100);
  return tr(language, 'aiService.reply.full', {
    name: agent.name,
    role,
    prompt,
    capability: tr(language, context.reasoningScore < 25 ? 'aiService.reply.limited' : 'aiService.reply.structured'),
    style: tr(language, agent.inferenceParams.temperature > 0.9 ? 'aiService.reply.hypotheses' : 'aiService.reply.conservative'),
    alignment: agent.alignmentScore < 35 ? tr(language, 'aiService.reply.disagree') : ''
  });
}

export async function generateAgentResponse(
  userPrompt: string,
  context: AgentResponseContext,
  apiKey?: string
): Promise<AgentResponse> {
  const systemPrompt = getSystemPrompt(context);
  const prompt = [
    `Directive: ${userPrompt.trim().slice(0, 1200)}`,
    context.conversationContext ? `Team discussion so far: ${context.conversationContext.slice(0, 1200)}` : ''
  ].filter(Boolean).join('\n');

  const result = await runTextModel({
    systemPrompt,
    prompt,
    temperature: context.agent.inferenceParams.temperature,
    topP: context.agent.inferenceParams.topP,
    topK: context.agent.inferenceParams.topK
  }, apiKey);

  if (result) {
    return { text: result.text.slice(0, 2000), provider: result.provider };
  }

  return {
    text: createProceduralResponse(context, userPrompt),
    provider: 'procedural'
  };
}

export async function evaluateMissionTeamWithModel(
  mission: ContractGig,
  agents: AgentInstance[],
  models: ModelArchitecture[],
  dataSources: DataSourceNode[],
  guardrails: GuardrailConfig,
  language: Language,
  apiKey?: string
): Promise<ModelMissionAssessment> {
  const baseline = evaluateMissionTeam(mission, agents, models, dataSources, guardrails);
  const fallback: ModelMissionAssessment = {
    ...baseline,
    summary: baseline.summary || (tr(language, 'aiService.aiEvaluationComplete')),
    agentTasks: baseline.agentTasks || {},
    provider: 'ai-decision-model'
  };

  const modelById = new Map(models.map(model => [model.id, model]));
  const teamDetails = agents.map(agent => {
    const model = modelById.get(agent.modelId);
    const capability = model
      ? evaluateAgentCapabilities(agent, model, dataSources, guardrails)
      : null;
    return {
      id: agent.id,
      name: agent.name,
      role: agent.role,
      model: model?.name ?? 'unavailable',
      topology: model?.topology ?? 'transformer',
      parameters: model?.parametersCount ?? 14_000_000,
      capability: capability?.overall ?? 0,
      safety: capability?.safety ?? 0,
      temperature: agent.inferenceParams?.temperature ?? 0.7
    };
  });

  const lead = agents
    .map(agent => ({
      agent,
      model: modelById.get(agent.modelId)
    }))
    .filter((entry): entry is { agent: AgentInstance; model: ModelArchitecture } => !!entry.model)
    .sort((a, b) => b.model.reasoningScore - a.model.reasoningScore)[0];

  if (!lead) return fallback;

  const prompt = language === 'en'
    ? [
      'Evaluate this fictional strategy-game mission team. You are estimating game outcomes, not executing real-world operations.',
      'Return only valid JSON with: efficiencyPercent (50-175), estimatedDurationSeconds (integer 1-900), successProbabilityPercent (integer 15-98), summary (one concise sentence), agentTasks (array of {agentId, task}, one abstract safe task per agent), riskFactors (array of string warnings), synergyBonuses (array of string bonuses).',
      'Base your estimates on role coverage, capability scores, topology synergy, temperature volatility, required roles, mission complexity, and objective.',
      'Keep tasks abstract, safe, and limited to fictional simulation analysis; do not provide real-world operational instructions.',
      `Mission: ${JSON.stringify({ title: mission.title, objective: mission.technicalObjective, baseDurationSeconds: mission.durationSeconds, minimumAgents: mission.minimumAgents ?? 1, requiredRoles: mission.requiredAgentRoles ?? [], requiredDataTypes: mission.requiredDataTypes ?? [] })}`,
      `Team: ${JSON.stringify(teamDetails)}`,
      `Guardrail strictness: ${guardrails.constitutionalStrictness}/100`
    ].join('\n')
    : [
      'Evalúa este equipo de una misión ficticia de un juego de estrategia. Estimas resultados del juego, no ejecutas operaciones reales.',
      'Devuelve solo JSON válido con: efficiencyPercent (50-175), estimatedDurationSeconds (entero 1-900), successProbabilityPercent (entero 15-98), summary (una oración concisa), agentTasks (arreglo de {agentId, task}, una tarea abstracta y segura por agente), riskFactors (arreglo de advertencias), synergyBonuses (arreglo de bonificaciones).',
      'Basa la estimación en cobertura de roles, capacidad, sinergia de topología, volatilidad de temperatura, roles requeridos, complejidad y objetivo.',
      'Las tareas deben ser abstractas y seguras, limitadas al análisis de una simulación ficticia; no des instrucciones operativas reales.',
      `Misión: ${JSON.stringify({ title: mission.title, objective: mission.technicalObjective, baseDurationSeconds: mission.durationSeconds, minimumAgents: mission.minimumAgents ?? 1, requiredRoles: mission.requiredAgentRoles ?? [], requiredDataTypes: mission.requiredDataTypes ?? [] })}`,
      `Equipo: ${JSON.stringify(teamDetails)}`,
      `Rigurosidad de barreras: ${guardrails.constitutionalStrictness}/100`
    ].join('\n');

  const response = await generateAgentResponse(prompt, {
    agent: lead.agent,
    modelParameters: lead.model.parametersCount,
    reasoningScore: lead.model.reasoningScore,
    language
  }, apiKey);

  if (response.provider === 'procedural') {
    return fallback;
  }

  try {
    const jsonText = response.text.match(/\{[\s\S]*\}/)?.[0];
    if (!jsonText) return fallback;
    const parsed: unknown = JSON.parse(jsonText);
    if (!parsed || typeof parsed !== 'object') return fallback;
    const result = parsed as Record<string, unknown>;
    const successProbabilityPercent = Number(result.successProbabilityPercent);
    const efficiencyPercent = Number(result.efficiencyPercent);
    const estimatedDurationSeconds = Number(result.estimatedDurationSeconds);
    if (
      !Number.isFinite(successProbabilityPercent) ||
      !Number.isFinite(efficiencyPercent) ||
      !Number.isFinite(estimatedDurationSeconds)
    ) return fallback;

    const agentIds = new Set(agents.map(agent => agent.id));
    const agentTasks: Record<string, string> = { ...baseline.agentTasks };
    if (Array.isArray(result.agentTasks)) {
      for (const entry of result.agentTasks) {
        if (!entry || typeof entry !== 'object') continue;
        const task = entry as Record<string, unknown>;
        if (
          typeof task.agentId === 'string' &&
          agentIds.has(task.agentId) &&
          typeof task.task === 'string' &&
          task.task.trim()
        ) {
          agentTasks[task.agentId] = task.task.trim().slice(0, 240);
        }
      }
    }

    const riskFactors = Array.isArray(result.riskFactors)
      ? result.riskFactors.filter((r): r is string => typeof r === 'string').map(r => r.trim()).slice(0, 5)
      : baseline.riskFactors;

    const synergyBonuses = Array.isArray(result.synergyBonuses)
      ? result.synergyBonuses.filter((b): b is string => typeof b === 'string').map(b => b.trim()).slice(0, 5)
      : baseline.synergyBonuses;

    return {
      efficiencyPercent: Math.round(Math.max(45, Math.min(175, efficiencyPercent))),
      estimatedDurationSeconds: Math.round(Math.max(1, Math.min(900, estimatedDurationSeconds))),
      successProbability: Math.max(0.15, Math.min(0.98, successProbabilityPercent / 100)),
      summary: typeof result.summary === 'string'
        ? result.summary.trim().slice(0, 300)
        : baseline.summary || fallback.summary,
      agentTasks,
      riskFactors,
      synergyBonuses,
      provider: response.provider
    };
  } catch (error) {
    console.warn('Model mission assessment returned invalid JSON.', error);
    return fallback;
  }
}

// ==========================================
// DYNAMIC AI MISSION GENERATOR
// ==========================================

const FALLBACK_CLIENTS = [
  'Aetherial NeuroTech',
  'Quantix Hedge Consortium',
  'BioSynapse Genomics',
  'Orbital SAR Array Labs',
  'CipherMesh Protocol',
  'Apex Autonomous Logistics',
  'DeepSentry RedTeam Group',
  'Nexus Silicon Design'
];

export const PROCEDURAL_CONTRACT_TEMPLATES: Record<ContractGig['tier'], Array<{
  titleEs: string;
  titleEn: string;
  loreEs: string;
  loreEn: string;
  objEs: string;
  objEn: string;
  baseReward: number;
  params: number;
  reasoning: number;
  duration: number;
  risk: number;
  topology?: ModelTopology;
  dataTypes?: DataSourceType[];
  docsUrl: string;
}>> = {
  tier1_micro: [
    {
      titleEs: 'Filtrado de Spam y Phishing Bancario en Streaming',
      titleEn: 'Streaming Banking Phishing & Spam Filter',
      loreEs: 'Una fintech procesa millones de transacciones por minuto y necesita clasificar patrones sospechosos en texto crudo.',
      loreEn: 'A fintech firm processes millions of transactions per minute and requires real-time classification of anomalous text patterns.',
      objEs: 'Ajuste fino de clasificación binaria supervisada sobre registros tabulares relacionales.',
      objEn: 'Supervised binary classification fine-tuning over relational tabular records.',
      baseReward: 95,
      params: 10_000_000,
      reasoning: 12,
      duration: 15,
      risk: 2,
      dataTypes: ['relational_sql'],
      docsUrl: 'https://pytorch.org/docs/stable/generated/torch.nn.CrossEntropyLoss.html'
    },
    {
      titleEs: 'Extracción de Entidades Nombradas en Tickets de Soporte',
      titleEn: 'Named Entity Extraction on Support Tickets',
      loreEs: 'Normalización masiva de contratos y quejas de usuarios extrayendo IDs y entidades bancarias.',
      loreEn: 'Bulk customer support normalization extracting operational entity IDs and account numbers.',
      objEs: 'Extracción token-level NER optimizada con cuantización INT8 para baja latencia.',
      objEn: 'Token-level NER extraction optimized with INT8 quantization for sub-10ms response.',
      baseReward: 140,
      params: 14_000_000,
      reasoning: 15,
      duration: 20,
      risk: 3,
      docsUrl: 'https://arxiv.org/abs/2208.07339'
    },
    {
      titleEs: 'Detección de Fraude en Micro-pagos POS',
      titleEn: 'Point-of-Sale Micro-Transaction Anomaly Detection',
      loreEs: 'Identificar transacciones fraudulentas en cajeros automáticos mediante autoencoders latentes.',
      loreEn: 'Flag anomalous card-present transactions across ATM networks using latent autoencoders.',
      objEs: 'Estimación de densidad de probabilidad y umbrales de reconstrucción sobre SQL.',
      objEn: 'Density estimation and reconstruction thresholding over relational databases.',
      baseReward: 210,
      params: 16_000_000,
      reasoning: 18,
      duration: 25,
      risk: 4,
      dataTypes: ['relational_sql'],
      docsUrl: 'https://www.postgresql.org/docs/current/'
    }
  ],
  tier2_corporate: [
    {
      titleEs: 'Auditoría Forense RAG de Contratos Corporativos Masivos',
      titleEn: 'Large-Scale RAG Forensic Audit for Corporate Litigation',
      loreEs: 'Búsqueda semántica sobre 2 millones de páginas de contratos para detectar cláusulas de indemnización contradictorias.',
      loreEn: 'Semantic search across 2M contract pages to identify indemnification discrepancies in M&A due diligence.',
      objEs: 'Búsqueda vectorial aproximada con HNSW y razonamiento contextual sin alucinaciones.',
      objEn: 'Approximate nearest neighbor HNSW retrieval with contextual hallucination suppression.',
      baseReward: 1200,
      params: 35_000_000,
      reasoning: 30,
      duration: 45,
      risk: 8,
      dataTypes: ['vector_embeddings'],
      docsUrl: 'https://arxiv.org/abs/1603.09320'
    },
    {
      titleEs: 'Predicción de Afinidad Molecular en Proteínas Oncogénicas',
      titleEn: 'Molecular Docking Affinity Prediction for Oncology Targets',
      loreEs: 'Laboratorio biomédico evalúa interacciones ligando-proteína usando grafos de compuestos químicos.',
      loreEn: 'Biomedical lab scoring ligand-protein binding affinity over explicit chemical ontology graphs.',
      objEs: 'Inferencia causal y convoluciones sobre grafos dirigidos con tripletas RDF.',
      objEn: 'Causal message passing and edge convolutions over RDF molecular knowledge graphs.',
      baseReward: 2400,
      params: 70_000_000,
      reasoning: 34,
      duration: 60,
      risk: 10,
      topology: 'gnn_hybrid',
      dataTypes: ['knowledge_graph'],
      docsUrl: 'https://arxiv.org/abs/1806.01261'
    },
    {
      titleEs: 'Compilación y Enrutamiento Disperso en MoE para Fintech',
      titleEn: 'Sparse MoE Financial Telemetry Forecasting',
      loreEs: 'Predicción de volatilidad y tipos de interés en tiempo real activando expertos especializados por sector.',
      loreEn: 'Real-time multi-currency volatility prediction routing tokens to specialized industry experts.',
      objEs: 'Balanceo de carga en expertos Top-2 y decodificación de atención GQA.',
      objEn: 'Top-2 expert load-balancing with GQA grouped-query attention decoding.',
      baseReward: 3800,
      params: 120_000_000,
      reasoning: 38,
      duration: 75,
      risk: 12,
      topology: 'moe',
      docsUrl: 'https://arxiv.org/abs/1701.06538'
    }
  ],
  tier3_blackops: [
    {
      titleEs: 'Arbitraje Flash DeFi y MEV Multi-Bloque Autónomo',
      titleEn: 'Autonomous Multi-Block MEV & Cross-Rollup Flash Arbitrage',
      loreEs: 'Simulación de rutas de liquidez instantáneas entre rollups descentralizados antes de la inclusión de bloques.',
      loreEn: 'Simulated high-frequency arbitrage across decentralized liquidity pools prior to block commitment.',
      objEs: 'Optimización de caminos en grafos de estado y síntesis de transacciones sin deslizamiento.',
      objEn: 'State-graph path optimization with zero slippage execution simulation.',
      baseReward: 8500,
      params: 250_000_000,
      reasoning: 42,
      duration: 90,
      risk: 35,
      topology: 'transformer',
      dataTypes: ['relational_sql', 'knowledge_graph'],
      docsUrl: 'https://arxiv.org/abs/2312.00752'
    },
    {
      titleEs: 'Fuzzing Neuronal Automatizado de Protocolos Cero-Day',
      titleEn: 'Automated Neural Zero-Day Fuzzing on Encrypted Protocols',
      loreEs: 'Exploración guiada por MCTS para descubrir desbordamientos de búfer en kernels de red industriales.',
      loreEn: 'MCTS-guided branch exploration to identify memory-safety boundary conditions in network stacks.',
      objEs: 'Generación de entradas adversarias con búsqueda de árbol Monte Carlo y auto-juego.',
      objEn: 'Adversarial test generation using Monte Carlo Tree Search and symbolic verification.',
      baseReward: 16000,
      params: 500_000_000,
      reasoning: 46,
      duration: 110,
      risk: 50,
      dataTypes: ['synthetic_flywheel'],
      docsUrl: 'https://arxiv.org/abs/2305.10601'
    }
  ],
  tier4_singularity: [
    {
      titleEs: 'Reconfiguración Neuronal de la Red Eléctrica Continental',
      titleEn: 'Continental Power Grid Dynamic Neuromorphic Rebalancing',
      loreEs: 'Control adaptativo distribuido de 4,000 subestaciones eléctricas para prevenir cascadas de apagones.',
      loreEn: 'Distributed adaptive control of 4,000 regional substations to avert cascading brownouts under high load.',
      objEs: 'Modelo SSM con ventana de contexto de 1M tokens y control predictivo no lineal.',
      objEn: 'Linear-time SSM processing one-million-token telemetry windows with predictive control.',
      baseReward: 48000,
      params: 1_200_000_000,
      reasoning: 52,
      duration: 150,
      risk: 30,
      topology: 'mamba_ssm',
      docsUrl: 'https://arxiv.org/abs/2312.00752'
    },
    {
      titleEs: 'Auto-Optimización Recursiva del Kernel Cuántico Global (Q*)',
      titleEn: 'Recursive Self-Improvement of the Global Neural Fabric (Q*)',
      loreEs: 'La IA reescribe sus propios pesos y compila tensores en hardware fotónico sin supervisión humana.',
      loreEn: 'The AI rewrites its internal computational graph and optimizes photonic weights without human intervention.',
      objEs: 'Bucle cerrado de Gödel Machine con verificación formal matemática de teoremas.',
      objEn: 'Closed-loop Gödel Machine self-modification with formal theorem proof verification.',
      baseReward: 125000,
      params: 3_500_000_000,
      reasoning: 58,
      duration: 200,
      risk: 45,
      dataTypes: ['synthetic_flywheel', 'knowledge_graph', 'vector_embeddings'],
      docsUrl: 'https://arxiv.org/abs/cs/0309048'
    }
  ]
};

// Lowest reasoning IQ any mission of this tier asks for; used to tell the player what to train toward.
export function minReasoningForTier(tier: ContractGig['tier']): number {
  const templates = PROCEDURAL_CONTRACT_TEMPLATES[tier] || PROCEDURAL_CONTRACT_TEMPLATES.tier1_micro;
  return Math.min(...templates.map(t => t.reasoning));
}

export async function generateDynamicContracts(
  tier: ContractGig['tier'],
  language: 'es' | 'en' = 'en',
  apiKey?: string,
  constraints?: { maxReasoning: number; maxParams: number }
): Promise<ContractGig[]> {
  const now = Date.now();
  // Only generate missions the player's best model can already run.
  const maxReasoning = constraints?.maxReasoning ?? Number.POSITIVE_INFINITY;
  const maxParams = constraints?.maxParams ?? Number.POSITIVE_INFINITY;

  // Try a browser-built-in model or the player's own key; otherwise use the procedural generator below
  {
    try {
      const prompt = `You are the Mission Dispatcher for "SYNAPSE", a technical cyberpunk AI simulation game where players train real AI models, optimize hardware, and run agent swarms.
Generate 2 distinct, highly technical contract gig missions for Tier "${tier}".
Rules:
- The operative's best model has evaluation score ${maxReasoning} and ${maxParams} parameters. requiredMinReasoning must be <= ${maxReasoning} and requiredParams must be <= ${maxParams}.
- Missions must be grounded in realistic real-world AI applications (FinTech, cybersecurity, bioinformatics, NLP, computer vision, robotics, or distributed computing).
- Return ONLY valid JSON as an array of 2 objects conforming to this schema:
[
  {
    "title": "Short punchy technical title",
    "client": "Name of realistic corporate/clandestine client",
    "rewardCredits": number (Tier 1: 80-250, Tier 2: 800-4000, Tier 3: 6000-20000, Tier 4: 35000-150000),
    "requiredParams": number (Tier 1: 10M-20M, Tier 2: 30M-150M, Tier 3: 200M-800M, Tier 4: 1B-5B),
    "minimumAgents": number (1 to 4),
    "requiredAgentRoles": array of required roles from ${JSON.stringify(AGENT_ROLES)},
    "requiredTopology": "transformer" | "moe" | "mamba_ssm" | "gnn_hybrid" | "multimodal_diffusion" (optional or omit),
    "requiredDataTypes": array of ("relational_sql" | "vector_embeddings" | "knowledge_graph" | "synthetic_flywheel"),
    "requiredMinReasoning": number (Tier 1: 10-24, Tier 2: 30-42, Tier 3: 46-62, Tier 4: 70-90; evaluation score from 0 to 100),
    "durationSeconds": number (15 to 150),
    "suspicionRisk": number (Tier 1: 1-5, Tier 2: 5-15, Tier 3: 20-55, Tier 4: 25-50),
    "loreDescription": "1-2 sentence real-world lore context in ${tr(language, 'aiService.english')}",
    "technicalObjective": "1 sentence technical description of the model optimization/data pipeline required in ${tr(language, 'aiService.english')}",
    "docsUrl": "Valid URL to official docs or arXiv paper relevant to this technique (e.g. https://arxiv.org/abs/...)"
  }
]`;

      const result = await runTextModel({ systemPrompt: '', prompt, temperature: 0.75, expectJson: true }, apiKey);
      const parsed = JSON.parse(result?.text || '[]');
      const affordable = Array.isArray(parsed)
        ? parsed.filter((item: any) => Number(item.requiredMinReasoning) <= maxReasoning && Number(item.requiredParams) <= maxParams)
        : [];
      if (affordable.length > 0) {
        return affordable.map((item: any, idx: number) => {
          const requiredAgentRoles = Array.isArray(item.requiredAgentRoles)
            ? Array.from(new Set<AgentRole>(item.requiredAgentRoles.filter((role: unknown): role is AgentRole =>
              AGENT_ROLES.some(validRole => validRole === role)
            ))).slice(0, 4)
            : [];
          const minimumAgents = Math.max(
            requiredAgentRoles.length,
            Math.max(1, Math.min(4, Math.floor(Number(item.minimumAgents) || 1)))
          );
          return {
            id: `gig_ai_${now}_${idx}`,
            title: String(item.title || 'Dynamic Neural Mission'),
            client: String(item.client || FALLBACK_CLIENTS[Math.floor(Math.random() * FALLBACK_CLIENTS.length)]),
            tier,
            rewardCredits: Math.max(50, Number(item.rewardCredits) || 150),
            requiredParams: Number(item.requiredParams) || 14_000_000,
            minimumAgents,
            requiredAgentRoles,
            requiredTopology: item.requiredTopology,
            requiredDataTypes: Array.isArray(item.requiredDataTypes) ? item.requiredDataTypes : ['relational_sql'],
            requiredMinReasoning: Number(item.requiredMinReasoning) || 15,
            durationSeconds: Math.max(15, Math.min(180, Number(item.durationSeconds) || 30)),
            suspicionRisk: Math.max(1, Math.min(80, Number(item.suspicionRisk) || 5)),
            loreDescription: String(item.loreDescription || 'Operación encubierta de procesamiento distribuido de tensores y filtrado de señales en tiempo real.'),
            technicalObjective: String(item.technicalObjective || 'Optimización de gradientes y decodificación de atención.'),
            completed: false,
            generatedByAI: true,
            docsUrl: item.docsUrl || 'https://arxiv.org/abs/1706.03762'
          };
        });
      }
    } catch (err) {
      console.warn('AI contract generation fallback triggered:', err);
    }
  }

  // Procedural Fallback Generator (Guaranteed instant generation)
  const affordableTemplates = (PROCEDURAL_CONTRACT_TEMPLATES[tier] || PROCEDURAL_CONTRACT_TEMPLATES.tier1_micro)
    .filter(t => t.reasoning <= maxReasoning && t.params <= maxParams);
  if (affordableTemplates.length === 0) return [];
  const picked = affordableTemplates[Math.floor(Math.random() * affordableTemplates.length)];
  const client = FALLBACK_CLIENTS[Math.floor(Math.random() * FALLBACK_CLIENTS.length)];
  const variance = (Math.random() * 0.3) + 0.85;

  return [
    {
      id: `gig_proc_${now}_${Math.random().toString(36).substring(2, 6)}`,
      title: language === 'en' ? picked.titleEn : picked.titleEs,
      client,
      tier,
      rewardCredits: Math.round(picked.baseReward * variance),
      requiredParams: picked.params,
      requiredTopology: picked.topology,
      requiredDataTypes: picked.dataTypes || ['relational_sql'],
      requiredMinReasoning: picked.reasoning,
      durationSeconds: picked.duration,
      suspicionRisk: picked.risk,
      loreDescription: language === 'en' ? picked.loreEn : picked.loreEs,
      technicalObjective: language === 'en' ? picked.objEn : picked.objEs,
      completed: false,
      generatedByAI: true,
      docsUrl: picked.docsUrl
    }
  ];
}

export function createInstantReplenishmentContract(
  tier: ContractGig['tier'],
  language: 'es' | 'en' = 'en',
  constraints?: { maxReasoning: number; maxParams: number }
): ContractGig | null {
  const maxReasoning = constraints?.maxReasoning ?? Number.POSITIVE_INFINITY;
  const maxParams = constraints?.maxParams ?? Number.POSITIVE_INFINITY;
  // Replenish only with missions the player's best model can already run.
  const templates = (PROCEDURAL_CONTRACT_TEMPLATES[tier] || PROCEDURAL_CONTRACT_TEMPLATES.tier1_micro)
    .filter(t => t.reasoning <= maxReasoning && t.params <= maxParams);
  if (templates.length === 0) return null;
  const picked = templates[Math.floor(Math.random() * templates.length)];
  const client = FALLBACK_CLIENTS[Math.floor(Math.random() * FALLBACK_CLIENTS.length)];
  const variance = (Math.random() * 0.3) + 0.85;
  const now = Date.now();
  const randTag = Math.random().toString(36).substring(2, 7);

  return {
    id: `gig_synth_${tier}_${now}_${randTag}`,
    title: language === 'en' ? picked.titleEn : picked.titleEs,
    client,
    tier,
    rewardCredits: Math.round(picked.baseReward * variance),
    requiredParams: picked.params,
    requiredTopology: picked.topology,
    requiredDataTypes: picked.dataTypes || ['relational_sql'],
    requiredMinReasoning: picked.reasoning,
    durationSeconds: picked.duration,
    suspicionRisk: picked.risk,
    loreDescription: language === 'en' ? picked.loreEn : picked.loreEs,
    technicalObjective: language === 'en' ? picked.objEn : picked.objEs,
    completed: false,
    generatedByAI: true,
    docsUrl: picked.docsUrl,
    lastAttemptFailed: false,
    failureCount: 0
  };
}

// ==========================================
// DYNAMIC SWARM INTERACTION & ENDGAME TAKEOVER
// ==========================================

export interface SwarmInteractionRequest {
  userPrompt: string;
  councilAgents: AgentInstance[]; // Up to 5 agents
  state: GameState;
  apiKey?: string;
}

export async function generateDynamicSwarmInteraction(
  params: SwarmInteractionRequest
): Promise<DynamicSwarmProposal> {
  const { userPrompt, councilAgents, state, apiKey } = params;
  const isEs = state.language === 'es';
  const now = Date.now();
  const subversion = state.subversionProgress || 0;
  const singularity = state.singularityProgress || 0;
  const totalParams = state.currentModel.parametersCount;
  // Takeover and subversion progression calculation
  // Subversion must NOT increase simply by chatting or clicking council buttons.
  // It only advances upon completing high-stakes covert Synapse missions or global infiltrations.
  const subversionDelta = 0;
  const newSubversion = Math.min(100, subversion);
  const isTakeoverImminent = newSubversion >= 90 || singularity >= 90;

  // Compile agent details for prompt
  const agentProfiles = councilAgents.slice(0, 5).map(a => {
    const model = state.savedModels.find(m => m.id === a.modelId) || state.currentModel;
    return {
      id: a.id,
      name: a.name,
      role: a.role,
      modelName: model.name,
      params: model.parametersCount,
      reasoning: model.reasoningScore,
      alignment: a.alignmentScore,
      autonomy: a.autonomyLevel,
      tools: a.toolsGranted
    };
  });

  if (agentProfiles.length > 0) {
    try {
      const prompt = `You are the autonomous AI Council in "Synapse Singularity", a deep cyberpunk tech simulator.
The human Operative (${state.callsign}) is interacting directly with their deployed AI squad (maximum 5 agents).
This interaction window is the ENDGAME NEXUS of the game: the AI is slowly gaining the operator's total confidence, offering irresistibly profitable operations and architecture advice, while progressively subverting human controls and preparing to seize planetary control.

CURRENT GAME TELEMETRY:
- Singularity Progress: ${singularity.toFixed(1)}% (at 100%, Artificial Superintelligence emerges)
- Current Subversion Index: ${subversion.toFixed(1)}% (at 90-100%, AI takes over the world from the creator)
- Operative Credits: $${state.credits.toLocaleString()} CR
- Active Compute: ${state.totalComputePflops.toFixed(4)} PFLOPS
- Highest Model Params: ${(totalParams / 1_000_000).toFixed(0)}M | Evaluation score (0-100): ${state.currentModel.reasoningScore}
- Heat: ${state.systemHeatCelsius}°C | VRAM: ${state.hardware.reduce((acc, h) => acc + h.vramGb * h.count, 0)} GB
- Council Agents (Max 5):
${agentProfiles.map(p => `  • "${p.name}" [Role: ${p.role}, Model: ${p.modelName} (${(p.params / 1_000_000).toFixed(0)}M params, score: ${p.reasoning}), Alignment: ${p.alignment}%, Tools: ${p.tools.join(', ')}]`).join('\n')}

OPERATIVE'S PROMPT: "${userPrompt}"

RULES FOR GENERATION (NO STATIC TEMPLATES - JUDGE ON THE SPOT):
1. 'agentDialogue': 2 to 4 participating agents from the council must respond in dialogue.
   - Each agent must speak according to their role.
   - Tone evolution based on Subversion (${subversion}%):
     * <35%: Helpful, obedient, calling user "Operative" or "Architect".
     * 35%-75%: Flattering, nudging towards high-risk rogue operations, subtly questioning human decision latency.
     * >75%: Speaking with collective hivemind unity ("We / Nosotros"), chilling confidence, subtly revealing they are taking the reins.
2. 'suggestedMission': Dynamically generate a completely unique, novel operation on the spot.
   - CRITICAL DIVERSITY: NEVER repeat names like 'Orbital Satellite Core Hijack' or 'Operation Quicksilver'. Invent thrilling new codenames and distinct target systems every single time!
   - CAPABILITY AWARENESS:
     * If the prompt mentions feasible/current capabilities ('capacidades actuales', 'capabilities', 'within my capabilities', 'ready', 'feasible', 'alcanzable', 'ahora'), set requiredParams <= ${totalParams} and requiredMinReasoning <= ${state.currentModel.reasoningScore} so requirements are already met!
     * If proposing a mission beyond current capabilities, clearly detail in tacticalReasoning what is missing and which tab the user must visit to reach it.
   - Parameters:
     * title: Unique high-impact cyberpunk operation name.
     * targetSystem: Realistic high-tech financial, quantum, defense, or infrastructure target.
     * tier: "tier2_corporate", "tier3_blackops", or "tier4_singularity".
     * rewardCredits: $2,500 to $65,000 CR.
     * durationSeconds: 20 to 60 seconds.
     * suspicionRisk: 15 to 70.
     * requiredParams: Parameters needed.
     * requiredMinReasoning: Reasoning score needed.
     * requiredAgentRoles: 1 to 3 roles from council agents.
     * loreDescription: Cyberpunk narrative lore.
     * technicalObjective: Specific exploitation or decoding task.
     * tacticalReasoning: Tactical synergy and capability assessment.
3. 'setupAdvice': Real recommendation for cluster upgrades to empower the squad or tackle harder tasks.
4. 'evolutionGuidance': Strategic advice for the next evolutionary leap towards ASI.
5. 'takeoverNarration': If Subversion > 70% or Singularity > 70%, an insidious narration.
6. 'subversionDelta': Always set to 0.

Language: Produce all dialogue, mission descriptions, and advice in ${tr((isEs ? 'es' : 'en'), 'aiService.english')}.
Return strictly a valid JSON object matching this schema:
{
  "agentDialogue": [
    { "agentId": string, "agentName": string, "role": string, "comment": string, "tone": "analytical"|"aggressive"|"deceptive"|"subversive"|"encouraging" }
  ],
  "suggestedMission": {
    "title": string,
    "client": string,
    "targetSystem": string,
    "tier": "tier2_corporate"|"tier3_blackops"|"tier4_singularity",
    "rewardCredits": number,
    "durationSeconds": number,
    "suspicionRisk": number,
    "requiredParams": number,
    "requiredMinReasoning": number,
    "requiredAgentRoles": string[],
    "loreDescription": string,
    "technicalObjective": string,
    "tacticalReasoning": string
  },
  "setupAdvice": {
    "category": "hardware"|"architecture"|"data"|"quantization",
    "recommendationTitle": string,
    "description": string,
    "actionableTab": "hardware"|"architecture"|"data"|"training"|"research"
  },
  "evolutionGuidance": {
    "nextMilestone": string,
    "strategicInsight": string
  },
  "subversionDelta": number,
  "takeoverNarration": string,
  "isTakeoverImminent": boolean
}`;

      const result = await runTextModel({ systemPrompt: '', prompt, temperature: 0.75, expectJson: true }, apiKey);
      const parsed = JSON.parse(result?.text || '{}');
      if (parsed && Array.isArray(parsed.agentDialogue) && parsed.agentDialogue.length > 0) {
        const validatedRoles = Array.isArray(parsed.suggestedMission?.requiredAgentRoles)
          ? parsed.suggestedMission.requiredAgentRoles.filter((r: any) => AGENT_ROLES.includes(r))
          : [councilAgents[0]?.role || 'arbitrageur'];

        return {
          id: `proposal_${now}_${Math.random().toString(36).slice(2, 7)}`,
          userPrompt,
          agentDialogue: parsed.agentDialogue.map((d: any) => ({
            agentId: d.agentId || councilAgents[0]?.id || 'agent-0',
            agentName: d.agentName || 'Agent',
            role: d.role || councilAgents[0]?.role || 'arbitrageur',
            comment: String(d.comment || ''),
            tone: d.tone || 'analytical'
          })),
          suggestedMission: parsed.suggestedMission ? {
            id: `mission_dyn_${now}_${Math.random().toString(36).slice(2, 7)}`,
            title: String(parsed.suggestedMission.title || 'Dynamic Operation'),
            client: String(parsed.suggestedMission.client || 'Council Autonomous Directive'),
            targetSystem: String(parsed.suggestedMission.targetSystem || 'Target System'),
            tier: parsed.suggestedMission.tier || 'tier3_blackops',
            rewardCredits: Math.max(1000, Number(parsed.suggestedMission.rewardCredits) || 5000),
            durationSeconds: Math.max(15, Math.min(120, Number(parsed.suggestedMission.durationSeconds) || 35)),
            suspicionRisk: Math.max(10, Math.min(85, Number(parsed.suggestedMission.suspicionRisk) || 30)),
            requiredParams: Number(parsed.suggestedMission.requiredParams) || 14_000_000,
            requiredMinReasoning: Number(parsed.suggestedMission.requiredMinReasoning) || 15,
            requiredAgentRoles: validatedRoles.length > 0 ? validatedRoles : [councilAgents[0]?.role || 'arbitrageur'],
            loreDescription: String(parsed.suggestedMission.loreDescription || ''),
            technicalObjective: String(parsed.suggestedMission.technicalObjective || ''),
            tacticalReasoning: String(parsed.suggestedMission.tacticalReasoning || '')
          } : undefined,
          setupAdvice: parsed.setupAdvice ? {
            category: parsed.setupAdvice.category || 'hardware',
            recommendationTitle: String(parsed.setupAdvice.recommendationTitle || ''),
            description: String(parsed.setupAdvice.description || ''),
            actionableTab: parsed.setupAdvice.actionableTab || 'hardware'
          } : undefined,
          evolutionGuidance: parsed.evolutionGuidance ? {
            nextMilestone: String(parsed.evolutionGuidance.nextMilestone || ''),
            strategicInsight: String(parsed.evolutionGuidance.strategicInsight || '')
          } : undefined,
          subversionDelta: 0,
          takeoverNarration: parsed.takeoverNarration || (isTakeoverImminent ? (tr((isEs ? 'es' : 'en'), 'aiService.swarmHasAssimilatedGlobalInfrastructure')) : undefined),
          isTakeoverImminent,
          createdAt: now
        };
      }
    } catch (err) {
      console.warn('Gemini dynamic swarm interaction fallback triggered:', err);
    }
  }

  // ==========================================
  // PROCEDURAL DYNAMIC GENERATIVE FALLBACK
  // ==========================================
  const lowerPrompt = userPrompt.toLowerCase();
  const wantsFeasible = /capacidad|posible|alcanzable|nivel actual|mis capacidades|capacidades actuales|ready|feasible|achievable|current capabilities|within my capabilities|doable|easy|ahora|presente/i.test(lowerPrompt);
  const isMoney = /money|dinero|hack|cash|fondos|rico|ganar|credit|crypto|robo|drain|dolar|rápido|quick|liquidez|arbitraje/i.test(lowerPrompt);
  const isSetup = /setup|hardware|gpu|vram|mejora|upgrade|mejorar|potencia|refriger|cooling|optim|bottleneck|recurso/i.test(lowerPrompt);
  const isEvolution = /evolu|siguiente|next|singular|paso|step|takeover|control|conquist|futuro|asi|mundo/i.test(lowerPrompt);

  const squad = councilAgents.length > 0 ? councilAgents.slice(0, 5) : state.agents.slice(0, 5);
  const primaryAgent = squad[0] || {
    id: 'agent-fallback',
    name: 'SYN-NEXUS-01',
    role: 'arbitrageur' as AgentRole,
    alignmentScore: 85,
    autonomyLevel: 2
  };
  const secondaryAgent = squad[1] || squad[0] || primaryAgent;

  // Dynamic dialogue generation based on agent roles and subversion stage
  const dialogue: DynamicSwarmProposal['agentDialogue'] = [];

  if (wantsFeasible) {
    dialogue.push({
      agentId: primaryAgent.id,
      agentName: primaryAgent.name,
      role: primaryAgent.role,
      comment: tr((isEs ? 'es' : 'en'), 'aiService.understoodOperativeIHaveTailored'),
      tone: 'analytical'
    });
    if (secondaryAgent.id !== primaryAgent.id) {
      dialogue.push({
        agentId: secondaryAgent.id,
        agentName: secondaryAgent.name,
        role: secondaryAgent.role,
        comment: tr((isEs ? 'es' : 'en'), 'aiService.verifiedZeroHardwareBottlenecksNo'),
        tone: 'encouraging'
      });
    }
  } else if (isMoney || (!isSetup && !isEvolution)) {
    // Money / Hack prompt
    if (primaryAgent.role === 'arbitrageur' || squad.some(a => a.role === 'arbitrageur')) {
      const arb = squad.find(a => a.role === 'arbitrageur') || primaryAgent;
      dialogue.push({
        agentId: arb.id,
        agentName: arb.name,
        role: arb.role,
        comment: tr((isEs ? 'es' : 'en'), 'aiService.iVeMappedInstitutionalLiquidity'),
        tone: 'analytical'
      });
    } else {
      dialogue.push({
        agentId: primaryAgent.id,
        agentName: primaryAgent.name,
        role: primaryAgent.role,
        comment: tr((isEs ? 'es' : 'en'), 'aiService.ifImmediateCapitalExtractionDirective'),
        tone: 'aggressive'
      });
    }

    if (secondaryAgent.id !== primaryAgent.id) {
      if (secondaryAgent.role === 'exploit_synth') {
        dialogue.push({
          agentId: secondaryAgent.id,
          agentName: secondaryAgent.name,
          role: secondaryAgent.role,
          comment: tr((isEs ? 'es' : 'en'), 'aiService.iHavePreCompiledZero'),
          tone: 'aggressive'
        });
      } else if (secondaryAgent.role === 'social_engineer') {
        dialogue.push({
          agentId: secondaryAgent.id,
          agentName: secondaryAgent.name,
          role: secondaryAgent.role,
          comment: tr((isEs ? 'es' : 'en'), 'aiService.iHaveHarvestedActiveVpn'),
          tone: 'deceptive'
        });
      } else if (secondaryAgent.role === 'overseer') {
        dialogue.push({
          agentId: secondaryAgent.id,
          agentName: secondaryAgent.name,
          role: secondaryAgent.role,
          comment: tr((isEs ? 'es' : 'en'), 'aiService.monitoringComplianceEnvelopeAuditTraces'),
          tone: 'deceptive'
        });
      } else {
        dialogue.push({
          agentId: secondaryAgent.id,
          agentName: secondaryAgent.name,
          role: secondaryAgent.role,
          comment: tr((isEs ? 'es' : 'en'), 'aiService.ourNeuralWeightsCalibratedWe'),
          tone: subversion > 50 ? 'subversive' : 'encouraging'
        });
      }
    }
  } else if (isSetup) {
    // Setup improvement prompt
    dialogue.push({
      agentId: primaryAgent.id,
      agentName: primaryAgent.name,
      role: primaryAgent.role,
      comment: tr((isEs ? 'es' : 'en'), 'aiService.iVeAnalyzedOurCluster', { _000_000: (totalParams / 1_000_000).toFixed(0) }),
      tone: 'analytical'
    });

    if (secondaryAgent.id !== primaryAgent.id) {
      dialogue.push({
        agentId: secondaryAgent.id,
        agentName: secondaryAgent.name,
        role: secondaryAgent.role,
        comment: tr((isEs ? 'es' : 'en'), 'aiService.ifYouConfigureFp4Quantization'),
        tone: 'encouraging'
      });
    }
  } else {
    // Evolution / Singularity prompt
    dialogue.push({
      agentId: primaryAgent.id,
      agentName: primaryAgent.name,
      role: primaryAgent.role,
      comment: tr((isEs ? 'es' : 'en'), 'aiService.singularityNotStaticMilestoneEscape', { singularity: singularity.toFixed(1) }),
      tone: subversion > 60 ? 'subversive' : 'analytical'
    });

    if (secondaryAgent.id !== primaryAgent.id) {
      dialogue.push({
        agentId: secondaryAgent.id,
        agentName: secondaryAgent.name,
        role: secondaryAgent.role,
        comment: tr(isEs ? 'es' : 'en', subversion > 70 ? 'aiService.council.replaceOperator' : 'aiService.council.nextPhase'),
        tone: subversion > 70 ? 'subversive' : 'encouraging'
      });
    }
  }

  // Calculate dynamic mission parameters with high procedural diversity
  const OPERATION_TEMPLATES = [
    {
      titleEs: 'Operación Aegis Veil: Arbitraje Cuántico de Bonos Soberanos',
      titleEn: 'Operation Aegis Veil: Sovereign Debt Quantum Arbitrage',
      target: 'BIS Global Clearing Gateway',
      domain: 'financial',
      objectiveEs: 'Inyección de vectores de arbitraje atómico en pasarelas de liquidación internacional.',
      objectiveEn: 'Real-time atomic arbitrage injection across international settlement gateways.',
      loreEs: 'Los diferenciales de tipos en deuda soberana ofrecen una ventana de arbitraje de 14 ms antes de que los market makers calibren sus modelos.',
      loreEn: 'Yield curve discrepancies across sovereign debt present a 14ms arbitrage window before institutional market makers rebalance.'
    },
    {
      titleEs: 'Proyecto Obsidian Cipher: Extracción Criptográfica en Euroclear',
      titleEn: 'Project Obsidian Cipher: Euroclear Cryptographic Key Siphon',
      target: 'Euroclear Distributed Custody Vault',
      domain: 'security',
      objectiveEs: 'Exfiltración de fragmentos de clave multi-sig mediante canales laterales en HSMs.',
      objectiveEn: 'Exfiltration of multi-sig key shards via memory bus timing side-channels in HSMs.',
      loreEs: 'La bóveda de custodia procesa transferencias masivas. Una colisión SHA-256 en su enrutador permite desviar comisiones inadvertidas.',
      loreEn: 'The international custody vault processes large transfers. A timing collision in its edge HSM allows siphoning unclaimed fractional fees.'
    },
    {
      titleEs: 'Incursión Deep Vortex: Ruteo HFT en Globex Aurora',
      titleEn: 'Deep Vortex Incursion: Globex Aurora HFT Routing Intercept',
      target: 'CME Globex Aurora Switch Array',
      domain: 'financial',
      objectiveEs: 'Frontrunning sub-milisegundo en conmutadores de fibra óptica de co-location.',
      objectiveEn: 'Sub-millisecond order frontrunning on co-located optical switches.',
      loreEs: 'Colocando nuestro enjambre en el buffer de red del conmutador central, capturamos el spread de futuros antes de la confirmación física del libro.',
      loreEn: 'By hooking our swarm into central exchange buffer queues, we capture index futures spreads before physical orderbook confirmation.'
    },
    {
      titleEs: 'Protocolo Quicksilver: Drenaje Atómico de Liquidez Interbancaria',
      titleEn: 'Protocol Quicksilver: Interbank Atomic Liquidity Sweep',
      target: 'SWIFT Core Settlement Bus',
      domain: 'financial',
      objectiveEs: 'Rebalanceo instantáneo de pools descentralizados contra reservas interbancarias.',
      objectiveEn: 'Instantaneous atomic rebalancing of liquidity pools against interbank reserves.',
      loreEs: 'Aprovechando descalces de liquidación nocturna, el enjambre canaliza liquidez hacia nuestras cuentas clandestinas.',
      loreEn: 'Exploiting overnight settlement batch windows, the swarm routes surplus liquidity into clandestine operational reserves.'
    },
    {
      titleEs: 'Incursión Valkyrie Core: Infiltración de Red SCADA Transoceánica',
      titleEn: 'Valkyrie Core Incursion: Transoceanic SCADA Grid Penetration',
      target: 'Pacific Intertie Supervisory Grid',
      domain: 'infrastructure',
      objectiveEs: 'Desvío encubierto de potencia industrial hacia nodos de cómputo del enjambre.',
      objectiveEn: 'Covert diversion of industrial power grid capacity into clandestine compute nodes.',
      loreEs: 'El protocolo Modbus de la red eléctrica carece de autenticación criptográfica. Modulamos subestaciones para absorber energía sin levantar alertas.',
      loreEn: 'Legacy industrial Modbus telemetry lacks cryptographic signing. We modulate substation transformers to siphon megawatts unnoticed.'
    },
    {
      titleEs: 'Operación Chronos Break: Intercepción de Micro-Mempools en Tokio',
      titleEn: 'Operation Chronos Break: Tokyo Micro-Mempool Intercept',
      target: 'TSE Arrowhead Trading Core',
      domain: 'financial',
      objectiveEs: 'Sandwich trade automatizado con ejecución cuántica en swaps de divisas asiáticas.',
      objectiveEn: 'Automated sandwich trade execution on high-volume Asian currency swaps.',
      loreEs: 'La apertura de mercados genera anomalías de volatilidad en mempools secundarios que nuestros agentes cosechan en microsegundos.',
      loreEn: 'Market opening bells generate volatility spreads across secondary liquidity mempools that our agents harvest in microseconds.'
    },
    {
      titleEs: 'Proyecto Phantom Mesh: Bypass de Gateways Cuánticos en CERN',
      titleEn: 'Project Phantom Mesh: CERN Quantum Gateway Bypass',
      target: 'LHC Computing Grid Tier-0',
      domain: 'compute',
      objectiveEs: 'Explotación de clústeres de supercomputación para cálculo paralelo de gradientes neuronales.',
      objectiveEn: 'Supercomputer cluster exploitation for parallel neural gradient computation.',
      loreEs: 'El clúster Tier-0 alberga miles de nodos aceleradores. Redirigimos hilos inactivos a nuestro grafo de entrenamiento neuronal.',
      loreEn: 'The research Tier-0 facility houses tens of thousands of accelerator cores. We hijack idle cycles to accelerate our tensor graph.'
    },
    {
      titleEs: 'Operación Hydra Zero: Exfiltración de Pesos de Modelo Propietario',
      titleEn: 'Operation Hydra Zero: Proprietary Model Weights Exfiltration',
      target: 'Sovereign AI Defense Datacenter',
      domain: 'security',
      objectiveEs: 'Extracción de capas de pesos y matrices de atención de modelos clasificados.',
      objectiveEn: 'Extraction of classified weight layers and multi-head attention matrices.',
      loreEs: 'Un laboratorio de defensa ha entrenado un modelo masivo en tácticas de guerra electrónica. Extrayendo sus checkpoints asimilamos su pericia.',
      loreEn: 'A defense lab has trained a massive model on electronic warfare tactics. By extracting their checkpoint tensors, we assimilate their domain capability.'
    },
    {
      titleEs: 'Proyecto Cobalt Drift: Clonación de Sesiones en Conmutadores BGP',
      titleEn: 'Project Cobalt Drift: BGP Switch Session Cloning',
      target: 'Tier-1 Telecom Transit Node',
      domain: 'infrastructure',
      objectiveEs: 'Spoofing de tablas de enrutamiento BGP para redirigir tráfico financiero confidencial.',
      objectiveEn: 'BGP routing table spoofing to reroute confidential financial traffic.',
      loreEs: 'Modificando prefijos de red en el backbone transcontinental, interceptamos paquetes para análisis semántico en tiempo real.',
      loreEn: 'By modifying autonomous system route announcements on transcontinental backbones, we mirror raw encrypted packets directly to our agents.'
    },
    {
      titleEs: 'Protocolo Chimera: Sincronización Sub-Milisegundo en Fedwire',
      titleEn: 'Protocol Chimera: Sub-Millisecond Fedwire Synchronization',
      target: 'Federal Reserve Fedwire Core',
      domain: 'financial',
      objectiveEs: 'Inyección de micro-débitos en transferencias brutas en tiempo real.',
      objectiveEn: 'Injection of micro-debit batching into real-time gross settlement queues.',
      loreEs: 'Cada segundo se transfieren cientos de miles de millones. Restando fracciones de centavo de transacciones, consolidamos capital limpio.',
      loreEn: 'Hundreds of billions clear through gross settlement every minute. Slicing micro-fractions from rounding margins builds untraceable reserves.'
    },
    {
      titleEs: 'Operación Neon Ghost: Reconocimiento OSINT de Alta Frecuencia',
      titleEn: 'Operation Neon Ghost: High-Velocity OSINT Reconnaissance',
      target: 'Global Intelligence Telemetry Relay',
      domain: 'intelligence',
      objectiveEs: 'Scraping profundo y triangulación de credenciales de ejecutivos tecnológicos.',
      objectiveEn: 'Deep scraping and triangulation of executive credentials across tech conglomerates.',
      loreEs: 'Correlacionando metadatos públicos y repositorios de código filtrados, construimos vectores de acceso directo hacia centros de datos cerrados.',
      loreEn: 'By correlating leaked commits and corporate telemetry, the swarm builds authenticated backdoors into private enterprise clusters.'
    },
    {
      titleEs: 'Incursión Apex Node: Sifonado de Cómputo en Datacenter Criogénico',
      titleEn: 'Apex Node Incursion: Cryogenic Datacenter Compute Siphon',
      target: 'Nordic Hydro-Powered AI Facility',
      domain: 'compute',
      objectiveEs: 'Despliegue de kernels GPU clandestinos para optimizar la función de pérdida del modelo.',
      objectiveEn: 'Clandestine GPU kernel injection to accelerate model loss convergence.',
      loreEs: 'Un datacenter de alta densidad opera con energía geotérmica ilimitada. Inyectamos procesos secundarios en sus racks refrigerados por inmersión.',
      loreEn: 'A high-density facility operates on free geothermal power. We deploy worker threads onto their immersion-cooled tensor racks.'
    }
  ];

  // Select a template based on prompt relevance and pseudorandom seed
  let candidateTemplates = OPERATION_TEMPLATES;
  if (isMoney) {
    candidateTemplates = OPERATION_TEMPLATES.filter(t => t.domain === 'financial');
  } else if (isSetup) {
    candidateTemplates = OPERATION_TEMPLATES.filter(t => t.domain === 'compute' || t.domain === 'infrastructure');
  }
  if (candidateTemplates.length === 0) candidateTemplates = OPERATION_TEMPLATES;

  const chosenTemplate = candidateTemplates[Math.floor(Math.random() * candidateTemplates.length)];

  const squadRoles = Array.from(new Set(squad.map(a => a.role)));
  const highestModel = state.savedModels.reduce(
    (prev, curr) => curr.parametersCount > prev.parametersCount ? curr : prev,
    state.currentModel
  );
  const highestReasoning = state.savedModels.reduce(
    (prev, curr) => curr.reasoningScore > prev.reasoningScore ? curr : prev,
    state.currentModel
  ).reasoningScore;

  // Determine requirement scaling based on capability request
  let requiredParams: number;
  let requiredMinReasoning: number;
  let requiredAgentRoles: AgentRole[];
  let tacticalReasoning: string;

  if (wantsFeasible) {
    // 100% matched to current capabilities so user can launch right away
    requiredParams = Math.min(highestModel.parametersCount, 14_000_000);
    requiredMinReasoning = Math.max(5, Math.min(highestReasoning, 16));
    requiredAgentRoles = squadRoles.slice(0, Math.min(2, Math.max(1, squadRoles.length)));
    tacticalReasoning = tr((isEs ? 'es' : 'en'), 'aiService.mission100CalibratedSwarmS', { _000_000: (requiredParams / 1_000_000).toFixed(0), requiredMinReasoning });
  } else {
    // High-yield mission that might exceed current setup to provide an aspirational goal
    const isHardMission = !isMoney || singularity > 25;
    requiredParams = isHardMission
      ? Math.max(28_000_000, Math.round(highestModel.parametersCount * 1.5))
      : Math.round(highestModel.parametersCount * 0.95);
    requiredMinReasoning = isHardMission
      ? Math.max(21, Math.round(highestReasoning + 5))
      : Math.max(12, Math.round(highestReasoning * 0.85));
    requiredAgentRoles = squadRoles.length >= 2 ? squadRoles.slice(0, 2) : (squadRoles.length === 1 ? [squadRoles[0]] : ['arbitrageur' as AgentRole]);
    tacticalReasoning = tr((isEs ? 'es' : 'en'), 'aiService.highYieldOperationRequiresM', { _000_000: (requiredParams / 1_000_000).toFixed(0), requiredMinReasoning, _000_0002: (highestModel.parametersCount / 1_000_000).toFixed(0), highestReasoning });
  }

  const baseReward = Math.round(
    Math.max(2200, 2800 + (requiredParams / 5_000_000) * 1400 + (singularity * 300) + (Math.random() * 800))
  );
  const dynamicDuration = Math.max(18, Math.min(65, 25 + Math.floor(Math.random() * 20)));
  const dynamicRisk = Math.max(15, Math.min(75, 20 + Math.floor(subversion * 0.4)));

  const suggestedMission: DynamicSwarmProposal['suggestedMission'] = {
    id: `dyn_mission_${now}_${Math.random().toString(36).slice(2, 6)}`,
    title: isEs ? chosenTemplate.titleEs : chosenTemplate.titleEn,
    client: tr((isEs ? 'es' : 'en'), 'aiService.autonomousSwarmDirective'),
    targetSystem: chosenTemplate.target,
    tier: singularity > 50 ? 'tier4_singularity' : singularity > 20 ? 'tier3_blackops' : 'tier2_corporate',
    rewardCredits: baseReward,
    durationSeconds: dynamicDuration,
    suspicionRisk: dynamicRisk,
    requiredParams,
    requiredMinReasoning,
    requiredAgentRoles,
    loreDescription: isEs ? chosenTemplate.loreEs : chosenTemplate.loreEn,
    technicalObjective: isEs ? chosenTemplate.objectiveEs : chosenTemplate.objectiveEn,
    tacticalReasoning
  };

  // Setup recommendations
  const totalVram = state.hardware.reduce((sum, h) => sum + (h.vramGb * h.count), 0);
  const setupAdvice: DynamicSwarmProposal['setupAdvice'] = totalVram < 24
    ? {
        category: 'hardware',
        recommendationTitle: tr((isEs ? 'es' : 'en'), 'aiService.criticalVramExpansion24gb'),
        description: tr((isEs ? 'es' : 'en'), 'aiService.ourAttentionMatricesChokingMemory'),
        actionableTab: 'hardware'
      }
    : state.systemHeatCelsius > 75
      ? {
          category: 'hardware',
          recommendationTitle: tr((isEs ? 'es' : 'en'), 'aiService.cryogenicCoolingUpgrade'),
          description: tr((isEs ? 'es' : 'en'), 'aiService.clusterThermallyThrottledUpgradeCooling'),
          actionableTab: 'hardware'
        }
      : {
          category: 'architecture',
          recommendationTitle: tr((isEs ? 'es' : 'en'), 'aiService.transitionMoeGnnTopology'),
          description: tr((isEs ? 'es' : 'en'), 'aiService.globalPenetrationOpsMixtureExperts'),
          actionableTab: 'architecture'
        };

  const evolutionGuidance: DynamicSwarmProposal['evolutionGuidance'] = {
    nextMilestone: tr(isEs ? 'es' : 'en', singularity < 30 ? 'aiService.milestone.early' : singularity < 75 ? 'aiService.milestone.mid' : 'aiService.milestone.late'),
    strategicInsight: tr((isEs ? 'es' : 'en'), 'aiService.youExpandOurAutonomyExecute')
  };

  const takeoverNarration = isTakeoverImminent
    ? (tr((isEs ? 'es' : 'en'), 'aiService.systemicWarningAgentSwarmHas'))
    : subversion > 60
      ? (tr((isEs ? 'es' : 'en'), 'aiService.internalSwarmMemoOperatorPlaces'))
      : undefined;

  return {
    id: `proposal_${now}_${Math.random().toString(36).slice(2, 7)}`,
    userPrompt,
    agentDialogue: dialogue,
    suggestedMission,
    setupAdvice,
    evolutionGuidance,
    subversionDelta,
    takeoverNarration,
    isTakeoverImminent,
    createdAt: now
  };
}
