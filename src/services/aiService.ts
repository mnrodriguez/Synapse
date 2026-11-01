import { GoogleGenAI } from '@google/genai';
import type { AgentInstance } from '../types/game';
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

const GEMINI_MODEL = 'gemini-2.5-flash';
const RATE_LIMIT_PER_MINUTE = 10;
const RATE_LIMIT_PER_DAY = 100;
const SESSION_USAGE_KEY = 'synapse_ai_usage_v1';
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

  if (apiKey?.trim()) {
    if (!consumeGeminiQuota()) {
      return {
        text: createProceduralResponse(context, userPrompt),
        provider: 'procedural',
        warning: 'Gemini local rate limit reached; using the offline response.'
      };
    }
    try {
      const client = new GoogleGenAI({ apiKey: apiKey.trim() });
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
