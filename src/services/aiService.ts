/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { GoogleGenAI } from '@google/genai';
import type { AgentInstance, AgentRole, ContractGig, GameState, ModelTopology, DataSourceType } from '../types/game';
import type { Language } from '../utils/i18n';

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
  const envKey = process.env.GEMINI_API_KEY || (typeof window !== 'undefined' && (window as unknown as { GEMINI_API_KEY?: string }).GEMINI_API_KEY);
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
  language: 'es' | 'en' = 'es',
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
            loreDescription: String(item.loreDescription || 'Operación comercial para validación de pesos neuronales.'),
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
