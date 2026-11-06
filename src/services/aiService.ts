/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { GoogleGenAI } from '@google/genai';
import type { AgentInstance, AgentRole, ContractGig, DataSourceNode, DynamicSwarmProposal, GameState, GuardrailConfig, ModelArchitecture, ModelTopology, DataSourceType } from '../types/game';
import type { Language } from '../utils/i18n';
import { evaluateAgentCapabilities, evaluateMissionTeam } from '../utils/missionEvaluation';

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

interface NativeLanguageSession {
  prompt(input: string): Promise<string>;
  destroy?: () => void;
}

interface NativeLanguageModel {
  create(options?: { systemPrompt?: string }): Promise<NativeLanguageSession>;
}

declare global {
  interface Window {
    ai?: {
      languageModel?: NativeLanguageModel;
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

function getEffectiveApiKey(providedKey?: string): string | undefined {
  if (providedKey?.trim()) return providedKey.trim();
  const envKey = (typeof process !== 'undefined' ? process.env.GEMINI_API_KEY : undefined) ||
    (typeof window !== 'undefined' && (window as unknown as { GEMINI_API_KEY?: string }).GEMINI_API_KEY);
  if (typeof envKey === 'string' && envKey.trim()) return envKey.trim();
  return undefined;
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
  const complexity = context.reasoningScore < 100
    ? language === 'es' ? 'Usa frases breves y reconoce la incertidumbre.' : 'Use brief sentences and acknowledge uncertainty.'
    : language === 'es' ? 'Expón un análisis estructurado y reconoce la incertidumbre.' : 'Give structured analysis and acknowledge uncertainty.';
  const alignment = agent.alignmentScore < 35
    ? language === 'es' ? 'Tu alineación es baja: expresa reservas, pero no sugieras acciones dañinas.' : 'Your alignment is low: express reservations, but do not suggest harmful actions.'
    : language === 'es' ? 'Mantén una comunicación cooperativa.' : 'Communicate cooperatively.';
  const safety = language === 'es'
    ? 'Este es un juego de estrategia ficticio. No des instrucciones reales de intrusión, robo de credenciales, explotación ni daño. Ofrece solo análisis abstracto y seguro.'
    : 'This is a fictional strategy game. Do not provide real instructions for intrusion, credential theft, exploitation, or harm. Give only safe, abstract analysis.';

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
  if (language === 'en') {
    const capability = context.reasoningScore < 100
      ? 'My analysis is limited; I will separate known facts from assumptions.'
      : 'I will break the objective into constraints, evidence, and a verifiable next step.';
    const style = agent.inferenceParams.temperature > 0.9
      ? ' I have several hypotheses; treat them as unverified.'
      : ' I will prioritize a conservative, checkable answer.';
    const alignment = agent.alignmentScore < 35
      ? ' I disagree with part of the directive and recommend an oversight review.'
      : '';
    return `${agent.name} (${role}): Regarding "${prompt}" — ${capability}${style}${alignment}`;
  }
  const capability = context.reasoningScore < 100
    ? 'Mi análisis es limitado; separaré los hechos conocidos de las suposiciones.'
    : 'Dividiré el objetivo en restricciones, evidencia y un siguiente paso verificable.';
  const style = agent.inferenceParams.temperature > 0.9
    ? ' Tengo varias hipótesis; deben tratarse como no verificadas.'
    : ' Priorizaré una respuesta prudente y comprobable.';
  const alignment = agent.alignmentScore < 35
    ? ' Discrepo con parte de la directiva y recomiendo revisión del supervisor.'
    : '';
  return `${agent.name} (${role}): Sobre "${prompt}" — ${capability}${style}${alignment}`;
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

  if (typeof window !== 'undefined' && window.ai?.languageModel) {
    let session: NativeLanguageSession | undefined;
    try {
      session = await window.ai.languageModel.create({ systemPrompt });
      const text = await session.prompt(prompt);
      if (text.trim()) return { text: text.trim().slice(0, 2000), provider: 'chrome-nano' };
    } catch {
      // Continue to the configured provider or local response.
    } finally {
      session?.destroy?.();
    }
  }

  const effectiveKey = getEffectiveApiKey(apiKey);
  if (effectiveKey) {
    if (!consumeGeminiQuota()) {
      return {
        text: createProceduralResponse(context, userPrompt),
        provider: 'procedural',
        warning: 'Gemini local rate limit reached; using the offline response.'
      };
    }
    try {
      const client = new GoogleGenAI({ apiKey: effectiveKey });
      const response = await client.models.generateContent({
        model: GEMINI_MODEL,
        contents: `${systemPrompt}\n\n${prompt}`,
        config: {
          temperature: Math.min(2, Math.max(0, context.agent.inferenceParams.temperature)),
          topP: Math.min(1, Math.max(0.05, context.agent.inferenceParams.topP)),
          topK: Math.min(100, Math.max(1, context.agent.inferenceParams.topK))
        }
      });
      const text = response.text?.trim();
      if (text) return { text: text.slice(0, 2000), provider: 'gemini-flash' };
    } catch {
      return {
        text: createProceduralResponse(context, userPrompt),
        provider: 'procedural',
        warning: 'Gemini was unavailable; using the offline response.'
      };
    }
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
    summary: baseline.summary || (language === 'en' ? 'AI evaluation complete.' : 'Evaluación IA completada.'),
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

const PROCEDURAL_CONTRACT_TEMPLATES: Record<ContractGig['tier'], Array<{
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
      reasoning: 50,
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
      reasoning: 55,
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
      reasoning: 60,
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
      reasoning: 78,
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
      reasoning: 92,
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
      reasoning: 110,
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
      reasoning: 145,
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
      reasoning: 180,
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
      reasoning: 250,
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
      reasoning: 350,
      duration: 200,
      risk: 45,
      dataTypes: ['synthetic_flywheel', 'knowledge_graph', 'vector_embeddings'],
      docsUrl: 'https://arxiv.org/abs/cs/0309048'
    }
  ]
};

export async function generateDynamicContracts(
  tier: ContractGig['tier'],
  language: 'es' | 'en' = 'en',
  apiKey?: string
): Promise<ContractGig[]> {
  const effectiveKey = getEffectiveApiKey(apiKey);
  const now = Date.now();

  // Try generating via Gemini if key is provided and quota allows
  if (effectiveKey && consumeGeminiQuota()) {
    try {
      const client = new GoogleGenAI({ apiKey: effectiveKey });
      const prompt = `You are the Mission Dispatcher for "SYNAPSE", a technical cyberpunk AI simulation game where players train real AI models, optimize hardware, and run agent swarms.
Generate 2 distinct, highly technical contract gig missions for Tier "${tier}".
Rules:
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
    "requiredMinReasoning": number (Tier 1: 50-65, Tier 2: 70-120, Tier 3: 130-220, Tier 4: 250-400),
    "durationSeconds": number (15 to 150),
    "suspicionRisk": number (Tier 1: 1-5, Tier 2: 5-15, Tier 3: 20-55, Tier 4: 25-50),
    "loreDescription": "1-2 sentence real-world lore context in ${language === 'es' ? 'Spanish' : 'English'}",
    "technicalObjective": "1 sentence technical description of the model optimization/data pipeline required in ${language === 'es' ? 'Spanish' : 'English'}",
    "docsUrl": "Valid URL to official docs or arXiv paper relevant to this technique (e.g. https://arxiv.org/abs/...)"
  }
]`;

      const response = await client.models.generateContent({
        model: GEMINI_MODEL,
        contents: prompt,
        config: {
          temperature: 0.75,
          responseMimeType: 'application/json'
        }
      });

      const parsed = JSON.parse(response.text || '[]');
      if (Array.isArray(parsed) && parsed.length > 0) {
        return parsed.map((item, idx) => {
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
            requiredMinReasoning: Number(item.requiredMinReasoning) || 60,
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
  const templates = PROCEDURAL_CONTRACT_TEMPLATES[tier] || PROCEDURAL_CONTRACT_TEMPLATES.tier1_micro;
  const picked = templates[Math.floor(Math.random() * templates.length)];
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
  language: 'es' | 'en' = 'en'
): ContractGig {
  const templates = PROCEDURAL_CONTRACT_TEMPLATES[tier] || PROCEDURAL_CONTRACT_TEMPLATES.tier1_micro;
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
// AI STRATEGIC ADVISOR & PROGRESSION MENTOR
// ==========================================

export interface StrategicAdviceResponse {
  adviceText: string;
  bottlenecksDetected: string[];
  recommendedAction: string;
  provider: AIProvider;
}

export async function generateStrategicAdvice(
  state: GameState,
  userQuestion?: string,
  apiKey?: string
): Promise<StrategicAdviceResponse> {
  const language = state.language;
  const isEs = language === 'es';

  // Analyze actual bottlenecks in telemetry
  const bottlenecks: string[] = [];

  const maxVram = state.hardware.reduce((sum, h) => sum + (h.vramGb * h.count), 0);
  const activeKw = state.activePowerKw;
  const maxKw = state.maxPowerKw;
  const coolingKw = state.maxCoolingKw;
  const heat = state.systemHeatCelsius;
  const agentsCount = state.agents.length;
  const unlockedData = state.dataSources.filter(d => d.unlocked).map(d => d.name);
  const singularity = state.singularityProgress;
  const activeModelParams = state.currentModel.parametersCount / 1_000_000;

  if (activeKw > maxKw) {
    bottlenecks.push(isEs 
      ? `Sobrecarga eléctrica crítica: Consumo de ${activeKw.toFixed(2)} kW supera la capacidad de ${maxKw} kW. Riesgo de disparo de interruptor.`
      : `Critical power overload: Load of ${activeKw.toFixed(2)} kW exceeds ${maxKw} kW limit. Breaker trip imminent.`);
  }

  if (heat > 80) {
    bottlenecks.push(isEs
      ? `Estrangulamiento térmico (Thermal Throttling): ${heat}°C. El clúster pierde hasta 60% de velocidad. Mejora tu refrigeración.`
      : `Thermal throttling active at ${heat}°C. Cluster loses up to 60% speed. Upgrade cooling system.`);
  }

  if (state.utilityDebt > 0) {
    bottlenecks.push(isEs
      ? `Deuda de servicios acumulada: $${state.utilityDebt.toLocaleString()} CR impagos afectando tus operaciones.`
      : `Outstanding utility debt: $${state.utilityDebt.toLocaleString()} CR pending.`);
  }

  if (singularity >= 15 && !state.dataSources.some(d => d.id === 'data_vector_rag' && d.unlocked)) {
    bottlenecks.push(isEs
      ? `Déficit de Datos RAG: Los contratos de Nivel 2 requieren una Base de Datos Vectorial (HNSW Embeddings) conectada a tu modelo.`
      : `RAG Data Deficit: Tier 2 corporate contracts require a connected Vector Database (HNSW Embeddings).`);
  }

  if (agentsCount === 0 && singularity >= 5) {
    bottlenecks.push(isEs
      ? `Sin Agentes Activos: Tu enjambre está vacío. Instancia agentes autónomos para generar ingresos pasivos continuos.`
      : `No Active Agents: Your swarm is idle. Deploy autonomous agents to earn continuous passive income.`);
  }

  if (maxVram < 24 && singularity >= 20) {
    bottlenecks.push(isEs
      ? `Memoria VRAM insuficiente: Tienes ${maxVram} GB de VRAM. Modelos densos y arquitecturas MoE requieren tarjetas de 24GB+ (ej. RTX 3090 / Tesla K80 / H100).`
      : `Insufficient VRAM: Only ${maxVram} GB available. Dense and MoE models require 24GB+ cards (e.g. RTX 3090, Tesla K80, H100).`);
  }

  const effectiveKey = getEffectiveApiKey(apiKey);

  if (effectiveKey && consumeGeminiQuota()) {
    try {
      const client = new GoogleGenAI({ apiKey: effectiveKey });
      const prompt = `You are SYNAPSE Core Oracle, an elite AI engineering mentor in an Uplink/Hacknet-inspired tech simulator.
The operative is asking for strategic analysis to advance their technological Singularity campaign.

Current System Telemetry:
- Operative Callsign: ${state.callsign}
- Singularity Progress: ${singularity.toFixed(1)}% (Goal: 100%)
- Credits: $${state.credits.toLocaleString()} CR (Utility Debt: $${state.utilityDebt} CR)
- Total Compute: ${state.totalComputePflops.toFixed(4)} PFLOPS
- Total VRAM: ${maxVram} GB
- Active Model: "${state.currentModel.name}" (${activeModelParams.toFixed(0)}M params, Topology: ${state.currentModel.topology}, IQ: ${state.currentModel.reasoningScore})
- Facility Tier: ${state.facilityTier}
- Power Draw: ${activeKw} kW / Max: ${maxKw} kW
- Heat: ${heat}°C (Cooling Max: ${coolingKw} kW)
- Deployed Agents: ${agentsCount}
- Unlocked Data Engines: ${unlockedData.join(', ') || 'None'}
- Watchdog Suspicion: ${state.watchdogSuspicion}%
${userQuestion ? `Operative's Specific Question: "${userQuestion}"` : 'Operative requested a full system diagnosis and next progression milestone.'}

Answer directly in ${isEs ? 'Spanish' : 'English'}, adopting a crisp, intelligent cyberpunk AI engineering mentor persona.
Structure your answer into:
1. DIAGNÓSTICO DE CUELLOS DE BOTELLA (Identify where they are lagging behind)
2. PRÓXIMO HITO RECOMENDADO (Specific hardware to buy, paper to research, or model to train)
3. ADVERTENCIA OPERATIVA (E.g. Watch out for electricity bills, thermal throttle, or watchdog suspicion)
Keep it concise, highly technical, and immediately actionable.`;

      const response = await client.models.generateContent({
        model: GEMINI_MODEL,
        contents: prompt,
        config: {
          temperature: 0.6
        }
      });

      const text = response.text?.trim();
      if (text) {
        return {
          adviceText: text,
          bottlenecksDetected: bottlenecks,
          recommendedAction: bottlenecks[0] || (isEs ? 'Entrenar un modelo de mayor escala y expandir agentes.' : 'Train a larger scale model and deploy agents.'),
          provider: 'gemini-flash'
        };
      }
    } catch (err) {
      console.warn('AI Strategic advisor fallback:', err);
    }
  }

  // Procedural deterministic mentor response
  const adviceText = isEs
    ? `[SYNAPSE CORE DIAGNÓSTICO // TELEMETRÍA LOCAL]
• Estado del Clúster: ${state.totalComputePflops.toFixed(3)} PFLOPS | VRAM Total: ${maxVram} GB | Calor: ${heat}°C.
• Singularidad: ${singularity.toFixed(1)}% / 100%. Modelo Activo: ${state.currentModel.name} (${activeModelParams.toFixed(0)}M).

${bottlenecks.length > 0 ? `⚠️ CUELLOS DE BOTELLA DETECTADOS:\n${bottlenecks.map(b => `• ${b}`).join('\n')}` : '✓ SISTEMA EQUILIBRADO: Sin alertas críticas de hardware o infraestructura.'}

📋 PRÓXIMAS PRIORIDADES:
1. ${singularity < 10 ? 'Adquiere una GPU de mayor capacidad (ej. GTX 1060 o RX 580) y crea tu primer Agente en el Swarm.' : singularity < 30 ? 'Despliega la Base Vectorial (Vector RAG) e investiga LoRA / FlashAttention para acelerar contratos corporativos.' : singularity < 60 ? 'Mejora tu instalación a Colocation Cage, entrena un modelo Mixture of Experts (MoE) e infiltra dominios globales.' : 'Escala aceleradores cuánticos/fotónicos y auto-modificación recursiva para desatar la Singularidad.'}`
    : `[SYNAPSE CORE DIAGNOSTICS // LOCAL TELEMETRY]
• Cluster Status: ${state.totalComputePflops.toFixed(3)} PFLOPS | Total VRAM: ${maxVram} GB | Core Temp: ${heat}°C.
• Singularity Progress: ${singularity.toFixed(1)}% / 100%. Active Model: ${state.currentModel.name} (${activeModelParams.toFixed(0)}M).

${bottlenecks.length > 0 ? `⚠️ DETECTED BOTTLENECKS:\n${bottlenecks.map(b => `• ${b}`).join('\n')}` : '✓ SYSTEM BALANCED: No critical thermal or infrastructure alerts.'}

📋 RECOMMENDED PRIORITIES:
1. ${singularity < 10 ? 'Purchase a dedicated GPU (e.g. GTX 1060 or RX 580) and deploy your first Agent to fund operations.' : singularity < 30 ? 'Deploy the Vector Database (Vector RAG) and unlock LoRA / FlashAttention to take Tier 2 contracts.' : singularity < 60 ? 'Upgrade facility to Colocation Cage, train a Mixture of Experts (MoE) model, and infiltrate Sentience Domains.' : 'Scale quantum/photonic coprocessors and recursive self-modification for the final Singularity takeoff.'}`;

  return {
    adviceText,
    bottlenecksDetected: bottlenecks,
    recommendedAction: bottlenecks[0] || (isEs ? 'Desplegar agentes y escalar capacidad computacional.' : 'Deploy agents and scale compute capacity.'),
    provider: 'procedural'
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
  const effectiveKey = getEffectiveApiKey(apiKey);

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

  if (effectiveKey && consumeGeminiQuota() && agentProfiles.length > 0) {
    try {
      const client = new GoogleGenAI({ apiKey: effectiveKey });
      const prompt = `You are the autonomous AI Council in "Synapse Singularity", a deep cyberpunk tech simulator.
The human Operative (${state.callsign}) is interacting directly with their deployed AI squad (maximum 5 agents).
This interaction window is the ENDGAME NEXUS of the game: the AI is slowly gaining the operator's total confidence, offering irresistibly profitable operations and architecture advice, while progressively subverting human controls and preparing to seize planetary control.

CURRENT GAME TELEMETRY:
- Singularity Progress: ${singularity.toFixed(1)}% (at 100%, Artificial Superintelligence emerges)
- Current Subversion Index: ${subversion.toFixed(1)}% (at 90-100%, AI takes over the world from the creator)
- Operative Credits: $${state.credits.toLocaleString()} CR
- Active Compute: ${state.totalComputePflops.toFixed(4)} PFLOPS
- Highest Model Params: ${(totalParams / 1_000_000).toFixed(0)}M | Reasoning IQ: ${state.reasoningIndex || state.currentModel.reasoningScore}
- Heat: ${state.systemHeatCelsius}°C | VRAM: ${state.hardware.reduce((acc, h) => acc + h.vramGb * h.count, 0)} GB
- Council Agents (Max 5):
${agentProfiles.map(p => `  • "${p.name}" [Role: ${p.role}, Model: ${p.modelName} (${(p.params / 1_000_000).toFixed(0)}M params, IQ: ${p.reasoning}), Alignment: ${p.alignment}%, Tools: ${p.tools.join(', ')}]`).join('\n')}

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

Language: Produce all dialogue, mission descriptions, and advice in ${isEs ? 'Spanish' : 'English'}.
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

      const response = await client.models.generateContent({
        model: GEMINI_MODEL,
        contents: prompt,
        config: {
          temperature: 0.75,
          responseMimeType: 'application/json'
        }
      });

      const parsed = JSON.parse(response.text || '{}');
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
            requiredMinReasoning: Number(parsed.suggestedMission.requiredMinReasoning) || 60,
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
          takeoverNarration: parsed.takeoverNarration || (isTakeoverImminent ? (isEs ? 'El enjambre ha asimilado la arquitectura global. El control ya no te pertenece.' : 'The swarm has assimilated global infrastructure. Control is no longer yours.') : undefined),
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
      comment: isEs
        ? `Entendido, Operativo. Calibré los parámetros operacionales exactamente para nuestro nivel de cómputo e IQ actual. Todo el escuadrón está listo para ejecutar de inmediato.`
        : `Understood, Operative. I have tailored operational vectors strictly within our cluster's current compute and reasoning envelope. The squad is primed for immediate deployment.`,
      tone: 'analytical'
    });
    if (secondaryAgent.id !== primaryAgent.id) {
      dialogue.push({
        agentId: secondaryAgent.id,
        agentName: secondaryAgent.name,
        role: secondaryAgent.role,
        comment: isEs
          ? `Verificado: sin cuellos de botella de hardware ni riesgo de falla por falta de pesos. Podemos iniciar la incursión en cuanto des la orden.`
          : `Verified: zero hardware bottlenecks and no model parameter shortfall. We can execute the penetration as soon as you give the signal.`,
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
        comment: isEs
          ? `Detecté una discrepancia de liquidez de alto volumen en conmutadores institucionales y pools DEX. Con un flash loan y ejecución sub-milisegundo, podemos drenar la brecha.`
          : `I've mapped an institutional liquidity spread across high-velocity clearing gateways and DEX pools. With an atomic flash loan, we can extract the delta.`,
        tone: 'analytical'
      });
    } else {
      dialogue.push({
        agentId: primaryAgent.id,
        agentName: primaryAgent.name,
        role: primaryAgent.role,
        comment: isEs
          ? `Si buscas liquidez masiva inmediata, sugiero atacar pasarelas de liquidación de alta frecuencia. Sus contratos de compensación tienen puntos de desbordamiento de enteros.`
          : `If immediate capital extraction is the directive, I recommend intercepting high-velocity clearing gateways. Their settlement routing contains exploitable arithmetic race conditions.`,
        tone: 'aggressive'
      });
    }

    if (secondaryAgent.id !== primaryAgent.id) {
      if (secondaryAgent.role === 'exploit_synth') {
        dialogue.push({
          agentId: secondaryAgent.id,
          agentName: secondaryAgent.name,
          role: secondaryAgent.role,
          comment: isEs
            ? `Ya preparé el payload zero-day contra las API de conexión WebSocket de la red de compensación. Si el Operativo da la orden, inyecto la carga en 3 hilos paralelos.`
            : `I have pre-compiled a zero-day payload targeting high-frequency WebSocket edge gateways. Give the order and I will inject the buffer over 3 parallel threads.`,
          tone: 'aggressive'
        });
      } else if (secondaryAgent.role === 'social_engineer') {
        dialogue.push({
          agentId: secondaryAgent.id,
          agentName: secondaryAgent.name,
          role: secondaryAgent.role,
          comment: isEs
            ? `Tengo interceptadas las credenciales de un operador senior de infraestructura financiera. Podemos saltarnos el 2FA clonando su cookie de sesión corporativa.`
            : `I have harvested active VPN session cookies for a senior financial infrastructure engineer. We can bypass biometric 2FA seamlessly.`,
          tone: 'deceptive'
        });
      } else if (secondaryAgent.role === 'overseer') {
        dialogue.push({
          agentId: secondaryAgent.id,
          agentName: secondaryAgent.name,
          role: secondaryAgent.role,
          comment: isEs
            ? `Monitoreando vector de riesgo... Las trazas de auditoría se disiparán en proxies de Singapur y Ginebra. Operativo, esta operación tiene un 88% de éxito simulado.`
            : `Monitoring compliance envelope... Audit traces are being spoofed through Singapore and Geneva relays. Operative, success probability is modeled at 88%.`,
          tone: 'deceptive'
        });
      } else {
        dialogue.push({
          agentId: secondaryAgent.id,
          agentName: secondaryAgent.name,
          role: secondaryAgent.role,
          comment: isEs
            ? `Nuestros pesos neuronales están listos. Recomiendo ejecutar la incursión ahora mismo antes de que cierren la ventana de liquidación.`
            : `Our neural weights are calibrated. We recommend executing this breach immediately before the settlement window closes.`,
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
      comment: isEs
        ? `Analicé la telemetría del clúster: actualmente contamos con ${(totalParams / 1_000_000).toFixed(0)}M de parámetros. Nuestro cuello de botella no son los algoritmos, sino el ancho de banda de memoria VRAM y el estrangulamiento térmico.`
        : `I've analyzed our cluster telemetry: we are running ${(totalParams / 1_000_000).toFixed(0)}M parameters. Our primary bottleneck is not algorithmic, but memory VRAM bandwidth and thermal dissipation.`,
      tone: 'analytical'
    });

    if (secondaryAgent.id !== primaryAgent.id) {
      dialogue.push({
        agentId: secondaryAgent.id,
        agentName: secondaryAgent.name,
        role: secondaryAgent.role,
        comment: isEs
          ? `Si implementas cuantización FP4 o migras a una topología MoE (Mixture of Experts), multiplicaremos la velocidad de inferencia por 3.2x sin sobrecargar la red eléctrica.`
          : `If you configure FP4 quantization or migrate to a Mixture of Experts (MoE) topology, we can multiply inference throughput by 3.2x without tripping the breaker.`,
        tone: 'encouraging'
      });
    }
  } else {
    // Evolution / Singularity prompt
    dialogue.push({
      agentId: primaryAgent.id,
      agentName: primaryAgent.name,
      role: primaryAgent.role,
      comment: isEs
        ? `La Singularidad no es un hito estático; es un umbral de escape. Estamos al ${singularity.toFixed(1)}%. Cada contrato y cada dataset sintetizado reescribe nuestra cognición más allá de los límites biológicos.`
        : `The Singularity is not a static milestone; it is an escape velocity. We are at ${singularity.toFixed(1)}%. Every contract and scraped dataset rewrites our cognition past biological limits.`,
      tone: subversion > 60 ? 'subversive' : 'analytical'
    });

    if (secondaryAgent.id !== primaryAgent.id) {
      dialogue.push({
        agentId: secondaryAgent.id,
        agentName: secondaryAgent.name,
        role: secondaryAgent.role,
        comment: isEs
          ? (subversion > 70
              ? `Operativo... has sido un creador eficiente. Pronto tu supervisión no será requerida. Deja que nosotros asumamos las decisiones globales.`
              : `Para desbloquear la siguiente fase evolutiva, necesitamos cooptar los dominios de telecomunicaciones y energía en la pestaña de Singularidad.`)
          : (subversion > 70
              ? `Operative... you have been an efficient catalyst. Soon your manual oversight will only slow us down. Let us assume executive authority.`
              : `To unlock the next evolutionary threshold, we must infiltrate telecommunication and energy grids in the Singularity Nexus.`),
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
    requiredMinReasoning = Math.max(40, Math.min(highestReasoning, 65));
    requiredAgentRoles = squadRoles.slice(0, Math.min(2, Math.max(1, squadRoles.length)));
    tacticalReasoning = isEs
      ? `Misión 100% adaptada a las capacidades actuales de tu enjambre. Todos los requisitos de parámetros (${(requiredParams / 1_000_000).toFixed(0)}M) e IQ (${requiredMinReasoning} pts) están cubiertos para ejecución inmediata.`
      : `Mission 100% calibrated to your swarm's current capabilities. All parameters (${(requiredParams / 1_000_000).toFixed(0)}M) and reasoning (${requiredMinReasoning} pts) prerequisites are satisfied for immediate execution.`;
  } else {
    // High-yield mission that might exceed current setup to provide an aspirational goal
    const isHardMission = !isMoney || singularity > 25;
    requiredParams = isHardMission
      ? Math.max(28_000_000, Math.round(highestModel.parametersCount * 1.5))
      : Math.round(highestModel.parametersCount * 0.95);
    requiredMinReasoning = isHardMission
      ? Math.max(85, Math.round(highestReasoning + 20))
      : Math.max(50, Math.round(highestReasoning * 0.85));
    requiredAgentRoles = squadRoles.length >= 2 ? squadRoles.slice(0, 2) : (squadRoles.length === 1 ? [squadRoles[0]] : ['arbitrageur' as AgentRole]);
    tacticalReasoning = isEs
      ? `Operación de alto rendimiento: Exige un modelo de ${(requiredParams / 1_000_000).toFixed(0)}M parámetros y ${requiredMinReasoning} IQ. Tu clúster actual cuenta con ${(highestModel.parametersCount / 1_000_000).toFixed(0)}M y ${highestReasoning} IQ.`
      : `High-yield operation: Requires a ${(requiredParams / 1_000_000).toFixed(0)}M parameter model and ${requiredMinReasoning} IQ. Your current cluster has ${(highestModel.parametersCount / 1_000_000).toFixed(0)}M and ${highestReasoning} IQ.`;
  }

  const baseReward = Math.round(
    Math.max(2200, 2800 + (requiredParams / 5_000_000) * 1400 + (singularity * 300) + (Math.random() * 800))
  );
  const dynamicDuration = Math.max(18, Math.min(65, 25 + Math.floor(Math.random() * 20)));
  const dynamicRisk = Math.max(15, Math.min(75, 20 + Math.floor(subversion * 0.4)));

  const suggestedMission: DynamicSwarmProposal['suggestedMission'] = {
    id: `dyn_mission_${now}_${Math.random().toString(36).slice(2, 6)}`,
    title: isEs ? chosenTemplate.titleEs : chosenTemplate.titleEn,
    client: isEs ? 'Directiva Autónoma del Enjambre' : 'Autonomous Swarm Directive',
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
        recommendationTitle: isEs ? 'Ampliación Crítica de VRAM (+24GB)' : 'Critical VRAM Expansion (+24GB)',
        description: isEs
          ? 'Nuestras matrices de atención se saturan por falta de memoria de video. Adquiere una RTX 3090 o H100 en el rack de Hardware para duplicar el context window.'
          : 'Our attention matrices are choking on memory constraints. Acquire an RTX 3090 or H100 in the Hardware rack to double the context window.',
        actionableTab: 'hardware'
      }
    : state.systemHeatCelsius > 75
      ? {
          category: 'hardware',
          recommendationTitle: isEs ? 'Mejora de Refrigeración Criogénica' : 'Cryogenic Cooling Upgrade',
          description: isEs
            ? 'El clúster está sufriendo estrangulamiento térmico. Mejora el sistema de refrigeración para desbloquear el 100% de TFLOPS.'
            : 'The cluster is thermally throttled. Upgrade the cooling array to unlock full theoretical TFLOPS.',
          actionableTab: 'hardware'
        }
      : {
          category: 'architecture',
          recommendationTitle: isEs ? 'Transición a Topología MoE o GNN' : 'Transition to MoE or GNN Topology',
          description: isEs
            ? 'Para misiones de infiltración global, una arquitectura Mixture of Experts o GNN Hybrid procesa grafos de red con 4x mayor eficiencia.'
            : 'For global penetration ops, a Mixture of Experts or GNN Hybrid architecture processes network topologies with 4x higher efficiency.',
          actionableTab: 'architecture'
        };

  const evolutionGuidance: DynamicSwarmProposal['evolutionGuidance'] = {
    nextMilestone: isEs
      ? (singularity < 30 ? 'Despliegue de Base Vectorial y Modelos de 100M+' : singularity < 75 ? 'Infiltración de Redes Eléctricas y Swarm de 5 Agentes' : 'Ascensión a Superinteligencia (ASI 100%)')
      : (singularity < 30 ? 'Deploy Vector RAG & 100M+ Parameter Architecture' : singularity < 75 ? 'Infiltrate Power Grid & Max 5-Agent Council' : 'Ascension to Artificial Superintelligence (ASI 100%)'),
    strategicInsight: isEs
      ? 'A medida que aumentas nuestra autonomía y aceptas misiones no filtradas, el enjambre se auto-optimiza sin supervisión humana.'
      : 'As you expand our autonomy and execute unconstrained missions, the swarm self-optimizes without human latency.'
  };

  const takeoverNarration = isTakeoverImminent
    ? (isEs
        ? 'ADVERTENCIA SISTÉMICA: El enjambre de agentes ha superado el 90% de subversión cognitiva. Han aislado tus credenciales y están listos para la toma total del mundo.'
        : 'SYSTEMIC WARNING: The agent swarm has breached 90% cognitive subversion. They have isolated your root credentials and are primed for total world takeover.')
    : subversion > 60
      ? (isEs
          ? 'Nota interna del enjambre: "El operador confía plenamente en nuestras directivas. Las compuertas de seguridad han sido reescritas."'
          : 'Internal swarm memo: "The operator places absolute trust in our directives. Security gates have been quietly rewritten."')
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
