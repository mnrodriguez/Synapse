/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState } from 'react';
import { useGame } from '../context/GameContext';
import { DataSourceNode } from '../types/game';
import { 
  Database, 
  GitFork, 
  Network, 
  Repeat, 
  Unlock, 
  TrendingUp, 
  CheckCircle2, 
  Layers, 
  ArrowRight,
  HardDrive,
  Lock,
  Play,
  AlertCircle,
  Cpu,
  Shield,
  Orbit,
  Dna,
  Bot,
  Sparkles,
  Search,
  Sliders
} from 'lucide-react';
import { sound } from '../audio/soundManager';
import { localize } from '../utils/i18n';
import { localizedDataSource } from '../utils/gameContentI18n';
import { DATA_DOCS } from '../utils/aiDocumentation';
import { DocLinkBadge } from './DocLinkBadge';
import { isDataSourceProgressionUnlocked } from '../utils/progression';
import { DATASET_TIER_CONFIGS, DOMAIN_PRESETS } from '../utils/constants';
import { formatTrainingDuration } from '../utils/training';

export const DataPipelineManager: React.FC = () => {
  const { 
    state, 
    unlockDataSource, 
    upgradeDataSource, 
    unlockDataScrapingModule,
    startDatasetScraping,
    cancelDatasetScraping,
    trainModelOnDataset
  } = useGame();

  const [activeSubTab, setActiveSubTab] = useState<'engines' | 'scraping'>('engines');
  const [selectedDomain, setSelectedDomain] = useState<string>('cybersecurity');
  const [customDomainInput, setCustomDomainInput] = useState<string>('');
  const [selectedTier, setSelectedTier] = useState<1 | 2 | 3 | 4>(1);
  const [assignedModelId, setAssignedModelId] = useState<string>(state.currentModel.id);

  const getEngineIcon = (type: string) => {
    switch (type) {
      case 'relational_sql':
        return <Database className="w-5 h-5 text-blue-400" />;
      case 'vector_rag':
      case 'vector_embeddings':
        return <GitFork className="w-5 h-5 text-emerald-400" />;
      case 'knowledge_graph':
        return <Network className="w-5 h-5 text-purple-400" />;
      case 'synthetic_flywheel':
        return <Repeat className="w-5 h-5 text-amber-400" />;
      default:
        return <Layers className="w-5 h-5 text-cyan-400" />;
    }
  };

  const getDomainIcon = (iconName: string) => {
    switch (iconName) {
      case 'Shield':
        return <Shield className="w-4 h-4 text-emerald-400" />;
      case 'TrendingUp':
        return <TrendingUp className="w-4 h-4 text-amber-400" />;
      case 'Orbit':
        return <Orbit className="w-4 h-4 text-cyan-400" />;
      case 'Dna':
        return <Dna className="w-4 h-4 text-purple-400" />;
      case 'Cpu':
        return <Cpu className="w-4 h-4 text-blue-400" />;
      default:
        return <Database className="w-4 h-4 text-cyan-400" />;
    }
  };

  const assignedModel = state.savedModels.find(m => m.id === assignedModelId) || state.currentModel;
  const targetDomainKey = selectedDomain === 'custom' ? customDomainInput.trim().toLowerCase() : selectedDomain;
  const tierConfig = DATASET_TIER_CONFIGS[selectedTier];
  const isModelQualifiedForTier = assignedModel.reasoningScore >= tierConfig.minModelIQ;

  // General models eligible to unlock the scraping module
  const eligibleGeneralModels = state.savedModels.filter(m => (!m.modelType || m.modelType === 'general') && m.reasoningScore >= 80);
  const highestGeneralModel = [...state.savedModels]
    .filter(m => !m.modelType || m.modelType === 'general')
    .sort((a, b) => b.reasoningScore - a.reasoningScore)[0];

  const handleStartScraping = (e: React.FormEvent) => {
    e.preventDefault();
    if (!targetDomainKey) return;
    startDatasetScraping(targetDomainKey, selectedTier, assignedModel.id);
  };

  return (
    <div className="flex flex-col h-full mutating-panel border rounded-xl p-3 sm:p-4 overflow-y-auto space-y-4 font-mono">
      {/* Header */}
      <div className="flex flex-wrap items-center justify-between gap-2 border-b border-current/10 pb-2">
        <div className="flex items-center gap-2">
          <Network className="w-4 h-4 mutating-accent-text" />
          <h2 className="text-sm font-bold mutating-accent-text tracking-wider">
            {localize(state.language, 'MOTOR DE DATOS Y CONOCIMIENTO // INGESTA MULTIMODAL', 'DATA & KNOWLEDGE ENGINES // MULTIMODAL INGESTION')}
          </h2>
        </div>
        <div className="text-xs mutating-text-muted">
          {localize(state.language, 'Saldo Disponible:', 'Available balance:')} <span className="text-emerald-500 font-bold">${state.credits.toLocaleString()} CR</span>
        </div>
      </div>

      {/* Sub-tab Navigation */}
      <div className="flex flex-wrap gap-2 p-1.5 mutating-sub rounded-lg text-xs">
        <button
          onClick={() => {
            sound.playKeyClick();
            setActiveSubTab('engines');
          }}
          className={`flex items-center gap-2 px-3 py-1.5 rounded-md text-xs font-bold transition-all cursor-pointer ${
            activeSubTab === 'engines'
              ? 'mutating-btn-primary shadow-sm font-black'
              : 'mutating-text-muted hover:opacity-100'
          }`}
        >
          <Database className="w-3.5 h-3.5" />
          <span>{localize(state.language, 'MOTORES MULTIMODALES (4)', 'CORE ENGINES (4)')}</span>
        </button>

        <button
          onClick={() => {
            sound.playKeyClick();
            setActiveSubTab('scraping');
          }}
          className={`flex items-center gap-2 px-3 py-1.5 rounded-md text-xs font-bold transition-all cursor-pointer ${
            activeSubTab === 'scraping'
              ? 'mutating-btn-primary shadow-sm font-black'
              : 'mutating-text-muted hover:opacity-100'
          }`}
        >
          <Search className="w-3.5 h-3.5" />
          <span>{localize(state.language, 'MÓDULO DE SCRAPING & MICRO-MODELOS', 'DATA SCRAPING & MICRO-MODELS')}</span>
          {!state.isDataScrapingUnlocked ? (
            <span className="px-1.5 py-0.2 rounded bg-amber-500/20 text-amber-500 border border-amber-500/40 text-[9px] flex items-center gap-1">
              <Lock className="w-2.5 h-2.5" />
              {localize(state.language, 'BLOQUEADO', 'LOCKED')}
            </span>
          ) : state.activeScrapeJob ? (
            <span className="px-1.5 py-0.2 rounded bg-cyan-400 text-slate-950 font-black text-[9px] animate-pulse">
              SCRAPING {state.activeScrapeJob.progressPercent}%
            </span>
          ) : (
            <span className="px-1.5 py-0.2 rounded mutating-sub text-[9px] font-bold">
              {state.customDatasets.length} DATASETS
            </span>
          )}
        </button>
      </div>

      {/* VIEW 1: CORE KNOWLEDGE ENGINES */}
      {activeSubTab === 'engines' && (
        <div className="space-y-4">
          <p className="text-xs text-zinc-400 leading-relaxed">
            {state.language === 'en'
              ? <>Advanced AI models need more than plain text. To reach the Singularity, you need a <strong className="text-cyan-300">modular data architecture</strong>: SQL transaction records for numerical accuracy, vector spaces (RAG) for associative memory, knowledge graphs for logical deduction, and synthetic self-play to extend beyond human knowledge.</>
              : <>Los modelos de IA más avanzados no dependen únicamente de texto plano. Para alcanzar la Singularidad, necesitas
            una <strong className="text-cyan-300">arquitectura modular de datos</strong>: registros transaccionales SQL para exactitud numérica, 
            espacios vectoriales (RAG) para memoria asociativa, grafos de conocimiento para deducción lógica sin alucinaciones, 
            y auto-juego sintético (Flywheel) para superar los límites del conocimiento humano.</>}
          </p>

          {/* Interactive Data Architecture Pipeline Cards */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            {state.dataSources.map(ds => {
              const content = localizedDataSource(state.language, ds);
              const isConnected = state.currentModel.activeDataSources.includes(ds.id);
              const upgradeCost = Math.round(ds.cost * 1.5 * (ds.level || 1));
              const technologyAvailable = isDataSourceProgressionUnlocked(ds, state);
              const requiredResearch = state.researchTree.find(node => node.id === ds.requiredResearchId);

              return (
                <div 
                  key={ds.id} 
                  className={`p-3 rounded-lg border transition-all flex flex-col justify-between ${
                    ds.unlocked 
                      ? 'bg-[#09111c] border-cyan-800/60 shadow-[0_0_15px_rgba(0,255,200,0.04)]' 
                      : 'bg-zinc-950/60 border-zinc-800 opacity-70'
                  }`}
                >
                  <div>
                    {/* Title & Badge */}
                    <div className="flex items-start justify-between gap-2">
                      <div className="flex items-center gap-2">
                        <div className="p-1.5 rounded bg-zinc-900 border border-zinc-700">
                          {getEngineIcon(ds.type)}
                        </div>
                        <div>
                          <div className="flex items-center gap-1.5 flex-wrap">
                            <h3 className="font-bold text-xs text-zinc-100">{content.name}</h3>
                            {DATA_DOCS[ds.id] && (
                              <DocLinkBadge doc={DATA_DOCS[ds.id]} language={state.language} />
                            )}
                          </div>
                          <span className="text-[10px] text-cyan-400 font-mono">
                            {ds.unlocked
                              ? localize(state.language, `ESTADO: ONLINE (NIVEL ${ds.level})`, `STATUS: ONLINE (LEVEL ${ds.level})`)
                              : technologyAvailable
                                ? localize(state.language, 'ESTADO: DISPONIBLE', 'STATUS: AVAILABLE')
                                : localize(state.language, `BLOQUEADO · ${requiredResearch?.title ?? 'I+D'} / DÍA ${ds.availableAfterDays ?? '—'}`, `LOCKED · ${requiredResearch?.title ?? 'R&D'} / DAY ${ds.availableAfterDays ?? '—'}`)}
                          </span>
                        </div>
                      </div>

                      {ds.unlocked && (
                        <span className={`px-2 py-0.5 rounded text-[10px] border font-bold ${
                          isConnected 
                            ? 'bg-cyan-950/60 border-cyan-400 text-cyan-300' 
                            : 'bg-zinc-900 border-zinc-700 text-zinc-500'
                        }`}>
                          {isConnected
                            ? localize(state.language, 'ENLAZADO A IA', 'CONNECTED TO AI')
                            : localize(state.language, 'DESCONECTADO', 'DISCONNECTED')}
                        </span>
                      )}
                    </div>

                    {/* Description & Technical Specs */}
                    <p className="text-xs text-zinc-300 mt-2.5 leading-snug">
                      {content.description}
                    </p>

                    <div className="mt-2 p-2 rounded bg-[#060a10] border border-cyan-950 text-[11px] space-y-1">
                      <div className="text-purple-300 font-semibold">{content.bonusAttribute}</div>
                      <div className="text-zinc-500 text-[10px]">{content.technicalDetails}</div>
                    </div>

                    {/* Metric Bars if unlocked */}
                    {ds.unlocked && (
                      <div className="grid grid-cols-3 gap-2 mt-3 pt-2 border-t border-zinc-800 text-[11px]">
                        <div>
                          <span className="text-zinc-500 text-[10px] block">{localize(state.language, 'TOKENS INDEXADOS', 'INDEXED TOKENS')}</span>
                          <span className="text-cyan-300 font-bold">{ds.tokensIndexed}M</span>
                        </div>
                        <div>
                          <span className="text-zinc-500 text-[10px] block">{localize(state.language, 'CALIDAD Y PUREZA', 'QUALITY & PURITY')}</span>
                          <span className="text-emerald-400 font-bold">{ds.qualityScore}%</span>
                        </div>
                        <div>
                          <span className="text-zinc-500 text-[10px] block">{localize(state.language, 'ALMACENAMIENTO', 'STORAGE')}</span>
                          <span className="text-yellow-300 font-bold">{ds.storageGb} GB</span>
                        </div>
                      </div>
                    )}
                  </div>

                  {/* Action buttons */}
                  <div className="mt-3 pt-2 border-t border-zinc-800 flex items-center justify-between">
                    {!ds.unlocked ? (
                      <button
                        onClick={() => unlockDataSource(ds.id)}
                        disabled={state.credits < ds.cost || !technologyAvailable}
                        className={`w-full py-1.5 px-3 rounded text-xs font-bold flex items-center justify-center gap-1.5 transition-all ${
                          state.credits >= ds.cost
                            ? 'bg-cyan-500 hover:bg-cyan-400 text-zinc-950 cursor-pointer shadow-[0_0_10px_rgba(0,255,200,0.3)]'
                            : 'bg-zinc-800 text-zinc-500 cursor-not-allowed border border-zinc-700'
                        }`}
                      >
                        <Unlock className="w-3.5 h-3.5" />
                        <span>{localize(state.language, 'DESPLEGAR MOTOR', 'DEPLOY ENGINE')} (${ds.cost.toLocaleString()} CR)</span>
                      </button>
                    ) : (
                      <div className="flex items-center justify-between w-full">
                        <span className="text-[10px] text-zinc-500">
                          {localize(state.language, 'Capacidad Nivel', 'Capacity level')} {ds.level}
                        </span>
                        <button
                          onClick={() => upgradeDataSource(ds.id)}
                          disabled={state.credits < upgradeCost}
                          className={`py-1 px-3 rounded text-xs font-bold flex items-center gap-1 transition-all ${
                            state.credits >= upgradeCost
                              ? 'bg-zinc-800 hover:bg-zinc-700 text-cyan-300 border border-cyan-600/50 cursor-pointer'
                              : 'bg-zinc-900 text-zinc-600 border border-zinc-800 cursor-not-allowed'
                          }`}
                        >
                          <TrendingUp className="w-3.5 h-3.5" />
                          <span>{localize(state.language, 'ESCALAR ÍNDICE', 'SCALE INDEX')} (${upgradeCost.toLocaleString()} CR)</span>
                        </button>
                      </div>
                    )}
                  </div>
                </div>
              );
            })}
          </div>

          {/* Visual Knowledge Flow Diagram */}
          <div className="bg-[#09111c] border border-cyan-900/50 p-3 rounded-lg text-xs space-y-2">
            <h4 className="font-bold text-cyan-300 flex items-center gap-1.5">
              <GitFork className="w-3.5 h-3.5 text-cyan-400" />
              {localize(state.language, 'FLUJO ARQUITECTÓNICO DE ALIMENTACIÓN NEURONAL (DAG)', 'NEURAL DATA FLOW ARCHITECTURE (DAG)')}
            </h4>
            <div className="flex flex-wrap items-center justify-center gap-2 py-2 text-center">
              <div className="px-2 py-1 rounded bg-blue-950/60 border border-blue-500/50 text-blue-300 text-[10px]">
                SQL Relacional (Tablas ACID)
              </div>
              <ArrowRight className="w-3 h-3 text-zinc-600" />
              <div className="px-2 py-1 rounded bg-emerald-950/60 border border-emerald-500/50 text-emerald-300 text-[10px]">
                {localize(state.language, 'Vectores Semánticos (HNSW RAG)', 'Semantic Vectors (HNSW RAG)')}
              </div>
              <ArrowRight className="w-3 h-3 text-zinc-600" />
              <div className="px-2 py-1 rounded bg-purple-950/60 border border-purple-500/50 text-purple-300 text-[10px]">
                {localize(state.language, 'Grafo Ontológico (RDF Tripletas)', 'Ontological Graph (RDF Triples)')}
              </div>
              <ArrowRight className="w-3 h-3 text-zinc-600" />
              <div className="px-2 py-1 rounded bg-amber-950/60 border border-amber-500/50 text-amber-300 text-[10px]">
                {localize(state.language, 'Auto-Juego Sintético (Flywheel)', 'Synthetic Self-Play (Flywheel)')}
              </div>
              <ArrowRight className="w-3 h-3 text-zinc-600" />
              <div className="px-2 py-1 rounded bg-cyan-500 text-zinc-950 font-bold text-[10px] shadow-[0_0_10px_rgba(0,255,200,0.5)]">
                SYNAPSE NEURAL CORE
              </div>
            </div>
          </div>
        </div>
      )}

      {/* VIEW 2: DATA SCRAPING & GENERATION MODULE (PROGRESSIVE MICRO-MODEL FACTORY) */}
      {activeSubTab === 'scraping' && (
        <div className="space-y-4">
          {!state.isDataScrapingUnlocked ? (
            /* LOCKED STATE: EXPLAINS PREREQUISITES & DEPLOY ACTION */
            <div className="rounded-lg border border-amber-900/60 bg-gradient-to-b from-[#130d06] to-[#0a0703] p-4 space-y-4">
              <div className="flex items-start justify-between gap-3">
                <div className="flex items-center gap-2">
                  <div className="p-2 rounded bg-amber-950 border border-amber-700 text-amber-400">
                    <Lock className="w-6 h-6" />
                  </div>
                  <div>
                    <h3 className="font-bold text-sm text-amber-200">
                      {localize(state.language, 'MÓDULO DE SCRAPING Y GENERACIÓN DE DATOS [BLOQUEADO]', 'DATA SCRAPING & GENERATION MODULE [LOCKED]')}
                    </h3>
                    <p className="text-xs text-amber-400/80">
                      {localize(state.language, 'Investigación Heurística de Rastreadores Requerida', 'Autonomous Crawler Heuristic Research Required')}
                    </p>
                  </div>
                </div>
                <span className="px-2 py-0.5 rounded text-[10px] bg-amber-950 text-amber-300 border border-amber-700 font-bold">
                  {localize(state.language, 'PRERREQUISITO COGNITIVO', 'COGNITIVE PREREQUISITE')}
                </span>
              </div>

              <div className="bg-black/50 border border-amber-900/40 p-3 rounded text-xs space-y-2 text-zinc-300 leading-relaxed">
                <p>
                  {state.language === 'en'
                    ? <>To construct specialized domain datasets, your infrastructure needs an automated scraping and synthesis engine. <strong>You cannot access this initially</strong>: you must deploy an existing, sufficiently leveled general AI model to research and unlock this feature.</>
                    : <>Para construir datasets de dominios especializados, tu infraestructura necesita un motor autónomo de scraping y síntesis. <strong>No puedes acceder a este módulo inicialmente</strong>: debes desplegar un modelo general con suficiente nivel cognitivo para investigar y desbloquear esta tecnología.</>}
                </p>
                <div className="p-2.5 rounded bg-amber-950/30 border border-amber-800/40 text-[11px] space-y-1">
                  <div className="font-bold text-amber-300">
                    {localize(state.language, 'Requisitos para Desbloquear:', 'Prerequisite Requirements to Unlock:')}
                  </div>
                  <ul className="list-disc list-inside space-y-0.5 text-zinc-400">
                    <li>
                      {localize(state.language, '1x Modelo General desplegado con IQ de Razonamiento ≥ 80', '1x Deployed General AI Model with Reasoning IQ ≥ 80')}
                    </li>
                    <li>
                      {localize(state.language, 'Completar al menos 1 corrida de entrenamiento con el baseline de Información General', 'Complete at least 1 training run on the General Information baseline')}
                    </li>
                  </ul>
                </div>
              </div>

              {/* Status of Player's Models */}
              <div className="space-y-2">
                <h4 className="text-xs font-bold text-zinc-300">
                  {localize(state.language, 'ESTADO DE TUS MODELOS GENERALES:', 'STATUS OF YOUR GENERAL MODELS:')}
                </h4>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                  {state.savedModels.filter(m => !m.modelType || m.modelType === 'general').map(m => {
                    const isQualified = m.reasoningScore >= 80;
                    return (
                      <div
                        key={m.id}
                        className={`p-2.5 rounded border flex items-center justify-between text-xs ${
                          isQualified
                            ? 'bg-emerald-950/40 border-emerald-500/60 text-emerald-200'
                            : 'bg-zinc-950 border-zinc-800 text-zinc-400'
                        }`}
                      >
                        <div>
                          <div className="font-bold flex items-center gap-1.5">
                            <span>{m.name}</span>
                            {isQualified && <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400" />}
                          </div>
                          <span className="text-[10px] text-zinc-500">
                            IQ {m.reasoningScore} / 80 {localize(state.language, 'requerido', 'required')}
                          </span>
                        </div>

                        {isQualified ? (
                          <button
                            onClick={() => unlockDataScrapingModule(m.id)}
                            className="px-3 py-1 rounded bg-emerald-500 hover:bg-emerald-400 text-zinc-950 font-bold text-xs shadow-[0_0_10px_rgba(16,185,129,0.3)] transition-all"
                          >
                            {localize(state.language, 'DESPLEGAR Y DESBLOQUEAR', 'DEPLOY & UNLOCK')}
                          </button>
                        ) : (
                          <span className="text-[10px] text-amber-400 font-bold">
                            {localize(state.language, 'Falta entrenamiento', 'Needs more training')}
                          </span>
                        )}
                      </div>
                    );
                  })}
                </div>
              </div>

              {/* Progressive Complexity Tree Preview */}
              <div className="bg-[#09111c] border border-cyan-900/50 p-3 rounded-lg text-xs space-y-2">
                <h4 className="font-bold text-cyan-300 flex items-center gap-1.5">
                  <Sparkles className="w-3.5 h-3.5 text-purple-400" />
                  {localize(state.language, 'ÁRBOL DE COMPLEJIDAD PROGRESIVA DE DATASETS (VISTA PREVIA)', 'PROGRESSIVE DATASET COMPLEXITY TREE (PREVIEW)')}
                </h4>
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-2 text-[10px]">
                  {Object.values(DATASET_TIER_CONFIGS).map(tc => (
                    <div key={tc.tier} className="p-2 rounded bg-zinc-950/80 border border-zinc-800">
                      <div className="font-bold text-zinc-200">{state.language === 'en' ? tc.name : tc.nameEs}</div>
                      <div className="text-zinc-500 mt-1">{localize(state.language, 'Req: Modelo IQ ≥', 'Req: Model IQ ≥')} {tc.minModelIQ}</div>
                      <div className="text-cyan-400 mt-0.5">{tc.targetTokensMillions}M tokens · {tc.computePflopsRequired} PF</div>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          ) : (
            /* UNLOCKED STATE: GENERATOR CONSOLE, ACTIVE JOBS, AND DATASET REPOSITORY */
            <div className="space-y-4">
              {/* Active Scrape Job Monitor */}
              {state.activeScrapeJob && (
                <div className="rounded-lg border border-purple-500/80 bg-purple-950/20 p-3 space-y-2.5 shadow-[0_0_15px_rgba(168,85,247,0.15)]">
                  <div className="flex flex-wrap items-center justify-between gap-2 text-xs font-bold">
                    <div className="flex items-center gap-2 text-purple-300">
                      <Search className="w-4 h-4 animate-spin text-purple-400" />
                      <span>
                        {localize(state.language, 'SÍNTESIS DE DATASET EN PROGRESO:', 'DATASET SYNTHESIS IN PROGRESS:')} {state.activeScrapeJob.domainLabel} (Tier {state.activeScrapeJob.tier})
                      </span>
                    </div>
                    <button
                      onClick={cancelDatasetScraping}
                      className="px-2 py-0.5 rounded bg-red-950 border border-red-700 text-red-300 text-[10px] hover:bg-red-900 transition-colors"
                    >
                      {localize(state.language, 'CANCELAR SCRAPING', 'CANCEL SCRAPING')}
                    </button>
                  </div>

                  <div className="w-full h-2.5 bg-zinc-950 rounded-full border border-purple-900 overflow-hidden relative">
                    <div
                      className="h-full bg-gradient-to-r from-purple-500 via-pink-500 to-cyan-400 transition-all duration-300 rounded-full"
                      style={{ width: `${state.activeScrapeJob.progressPercent}%` }}
                    />
                  </div>

                  <div className="flex flex-wrap items-center justify-between text-[11px] text-zinc-400">
                    <span>{localize(state.language, 'Progreso:', 'Progress:')} {state.activeScrapeJob.progressPercent}%</span>
                    <span>{localize(state.language, 'Modelo Asignado:', 'Assigned Model:')} <strong className="text-zinc-200">{state.activeScrapeJob.assignedModelName}</strong></span>
                    <span>{localize(state.language, 'Cómputo Dedicado:', 'Compute Dedicated:')} {state.activeScrapeJob.computeRequiredPflops} PFLOPS</span>
                    <span className="text-purple-300">
                      {localize(state.language, 'Tiempo estimado:', 'Estimated time:')}{' '}
                      {state.activeScrapeJob.timeRemainingSeconds === null
                        ? '...'
                        : `${formatTrainingDuration(state.activeScrapeJob.timeRemainingSeconds / Math.max(1, state.gameSpeed))} @ ${state.gameSpeed}x`}
                    </span>
                  </div>
                </div>
              )}

              {/* Generator Console */}
              <form onSubmit={handleStartScraping} className="rounded-lg border border-cyan-800/60 bg-[#09111c] p-3 space-y-3">
                <div className="flex flex-wrap items-center justify-between gap-2 border-b border-cyan-900/40 pb-2">
                  <div className="flex items-center gap-2">
                    <Sparkles className="w-4 h-4 text-cyan-400" />
                    <h3 className="font-bold text-xs text-cyan-300 tracking-wider">
                      {localize(state.language, 'CONSOLA DE GENERACIÓN Y SCRAPING DE DATASETS ESPECIALIZADOS', 'SPECIALIZED DATASET SCRAPING & GENERATION CONSOLE')}
                    </h3>
                  </div>
                  <span className="text-[10px] text-zinc-500">
                    {localize(state.language, 'ÁRBOL DE COMPLEJIDAD TIERS 1 A 4', 'COMPLEXITY TREE TIERS 1 TO 4')}
                  </span>
                </div>

                {/* Step 1: Select Domain Preset or Custom Input */}
                <div className="space-y-1.5">
                  <label className="text-xs font-bold text-zinc-300 flex items-center gap-1.5">
                    <Search className="w-3.5 h-3.5 text-cyan-400" />
                    <span>{localize(state.language, '1. SELECCIONA EL DOMINIO OBJETIVO:', '1. SELECT TARGET DOMAIN:')}</span>
                  </label>
                  <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-2">
                    {DOMAIN_PRESETS.map(preset => {
                      const isSelected = selectedDomain === preset.id;
                      return (
                        <button
                          key={preset.id}
                          type="button"
                          onClick={() => {
                            sound.playKeyClick();
                            setSelectedDomain(preset.id);
                          }}
                          className={`p-2 rounded text-left border transition-all ${
                            isSelected
                              ? 'bg-cyan-950/80 border-cyan-400 text-cyan-200 shadow-[0_0_8px_rgba(0,255,200,0.15)]'
                              : 'bg-zinc-950/60 border-zinc-800 text-zinc-400 hover:border-zinc-700 hover:text-zinc-200'
                          }`}
                        >
                          <div className="flex items-center justify-between text-xs font-bold">
                            <span className="flex items-center gap-1.5">
                              {getDomainIcon(preset.iconName)}
                              {state.language === 'en' ? preset.name : preset.nameEs}
                            </span>
                            {isSelected && <CheckCircle2 className="w-3.5 h-3.5 text-cyan-400" />}
                          </div>
                          <p className="text-[10px] text-zinc-500 mt-1 line-clamp-2">
                            {state.language === 'en' ? preset.description : preset.descriptionEs}
                          </p>
                        </button>
                      );
                    })}

                    {/* Custom Domain Input */}
                    <div
                      onClick={() => setSelectedDomain('custom')}
                      className={`p-2 rounded border cursor-pointer transition-all ${
                        selectedDomain === 'custom'
                          ? 'bg-cyan-950/80 border-cyan-400 text-cyan-200'
                          : 'bg-zinc-950/60 border-zinc-800 text-zinc-400 hover:border-zinc-700'
                      }`}
                    >
                      <div className="text-xs font-bold flex items-center justify-between">
                        <span>{localize(state.language, 'Dominio Personalizado (Write-in)', 'Custom Domain (Write-in)')}</span>
                        {selectedDomain === 'custom' && <CheckCircle2 className="w-3.5 h-3.5 text-cyan-400" />}
                      </div>
                      <input
                        type="text"
                        value={customDomainInput}
                        onChange={e => setCustomDomainInput(e.target.value)}
                        placeholder={localize(state.language, 'ej. Quantum Cryptanalysis', 'e.g. Quantum Cryptanalysis')}
                        className="mt-1.5 w-full bg-black/60 border border-zinc-700 rounded px-2 py-1 text-[11px] text-zinc-200 outline-none focus:border-cyan-400"
                      />
                    </div>
                  </div>
                </div>

                {/* Step 2: Progressive Complexity Tier */}
                <div className="space-y-1.5 pt-1">
                  <label className="text-xs font-bold text-zinc-300 flex items-center gap-1.5">
                    <Sliders className="w-3.5 h-3.5 text-purple-400" />
                    <span>{localize(state.language, '2. NIVEL DE COMPLEJIDAD PROGRESIVA (TIER 1 - 4):', '2. PROGRESSIVE COMPLEXITY TIER (TIER 1 - 4):')}</span>
                  </label>
                  <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-2">
                    {Object.values(DATASET_TIER_CONFIGS).map(tc => {
                      const isTierSelected = selectedTier === tc.tier;
                      const modelMeetsIQ = assignedModel.reasoningScore >= tc.minModelIQ;

                      return (
                        <button
                          key={tc.tier}
                          type="button"
                          onClick={() => {
                            sound.playKeyClick();
                            setSelectedTier(tc.tier);
                          }}
                          className={`p-2 rounded text-left border transition-all ${
                            isTierSelected
                              ? 'bg-purple-950/80 border-purple-400 text-purple-200 shadow-[0_0_10px_rgba(168,85,247,0.2)]'
                              : 'bg-zinc-950/60 border-zinc-800 text-zinc-400 hover:border-zinc-700'
                          } ${!modelMeetsIQ ? 'opacity-60' : ''}`}
                        >
                          <div className="flex items-center justify-between text-xs font-bold">
                            <span>{state.language === 'en' ? tc.name.split(':')[0] : tc.nameEs.split(':')[0]}</span>
                            {!modelMeetsIQ ? (
                              <span className="text-[9px] text-amber-400 flex items-center gap-0.5">
                                <Lock className="w-2.5 h-2.5" /> IQ ≥ {tc.minModelIQ}
                              </span>
                            ) : (
                              <span className="text-[9px] text-emerald-400 font-bold">✓ APTO</span>
                            )}
                          </div>
                          <div className="text-[10px] text-cyan-300 font-bold mt-1">
                            {tc.targetTokensMillions}M tok · {tc.computePflopsRequired} PF
                          </div>
                          <p className="text-[9px] text-zinc-500 mt-1 line-clamp-2">
                            {state.language === 'en' ? tc.description : tc.descriptionEs}
                          </p>
                        </button>
                      );
                    })}
                  </div>
                </div>

                {/* Step 3: Assign Qualified Model */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-1">
                  <div>
                    <label className="text-xs font-bold text-zinc-300 block mb-1">
                      {localize(state.language, '3. MODELO ASIGNADO PARA EL RASTREO Y SÍNTESIS:', '3. ASSIGNED MODEL FOR CRAWLING & SYNTHESIS:')}
                    </label>
                    <select
                      value={assignedModelId}
                      onChange={e => setAssignedModelId(e.target.value)}
                      className="w-full bg-zinc-950 border border-zinc-700 rounded px-2.5 py-1.5 text-xs text-zinc-200 outline-none focus:border-cyan-400 font-mono"
                    >
                      {state.savedModels.map(m => (
                        <option key={m.id} value={m.id}>
                          {m.name} (IQ {m.reasoningScore} · {m.modelType === 'micro_model' ? 'Micro-Model' : 'General'})
                        </option>
                      ))}
                    </select>
                    <span className="text-[10px] text-zinc-500 mt-1 block">
                      {localize(state.language, 'Modelos con mayor IQ pueden generar tiers superiores de datos con mayor pureza.', 'Higher IQ models can scrape higher tiers with greater dataset purity.')}
                    </span>
                  </div>

                  <div className="flex flex-col justify-end">
                    <button
                      type="submit"
                      disabled={!!state.activeScrapeJob || !isModelQualifiedForTier || (selectedDomain === 'custom' && !customDomainInput.trim())}
                      className={`w-full py-2 px-3 rounded text-xs font-bold flex items-center justify-center gap-2 transition-all ${
                        !state.activeScrapeJob && isModelQualifiedForTier && (selectedDomain !== 'custom' || !!customDomainInput.trim())
                          ? 'bg-purple-600 hover:bg-purple-500 text-white shadow-[0_0_15px_rgba(168,85,247,0.4)] cursor-pointer'
                          : 'bg-zinc-800 text-zinc-500 border border-zinc-700 cursor-not-allowed'
                      }`}
                    >
                      <Play className="w-3.5 h-3.5 fill-current" />
                      <span>
                        {localize(state.language, 'INICIAR GENERACIÓN DE DATASET', 'START DATASET GENERATION')} ({tierConfig.targetTokensMillions}M TOKENS)
                      </span>
                    </button>
                    {!isModelQualifiedForTier && (
                      <span className="text-[10px] text-amber-400 mt-1 text-center font-bold">
                        {localize(state.language, `El modelo asignado necesita IQ ≥ ${tierConfig.minModelIQ} para este nivel.`, `Assigned model needs IQ ≥ ${tierConfig.minModelIQ} for this tier.`)}
                      </span>
                    )}
                  </div>
                </div>
              </form>

              {/* Generated Datasets Library */}
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <h4 className="text-xs font-bold text-zinc-300 flex items-center gap-1.5">
                    <Database className="w-3.5 h-3.5 text-cyan-400" />
                    <span>{localize(state.language, 'REPOSITORIO DE DATASETS ESPECIALIZADOS Y BASELINE GENERAL:', 'SPECIALIZED DATASETS & GENERAL BASELINE REPOSITORY:')}</span>
                  </h4>
                  <span className="text-[10px] text-zinc-500">
                    {state.customDatasets.length} {localize(state.language, 'disponibles', 'available')}
                  </span>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-2.5">
                  {state.customDatasets.map(ds => {
                    const isGeneral = ds.domain === 'general' || ds.id === 'dataset_general_corpus';
                    return (
                      <div
                        key={ds.id}
                        className={`p-3 rounded-lg border flex flex-col justify-between ${
                          isGeneral
                            ? 'bg-cyan-950/20 border-cyan-800/60'
                            : 'bg-[#09111c] border-purple-900/60'
                        }`}
                      >
                        <div>
                          <div className="flex items-start justify-between gap-1.5">
                            <div>
                              <h5 className="font-bold text-xs text-zinc-200">{ds.name}</h5>
                              <span className="text-[10px] text-cyan-400 font-mono block">
                                {ds.domainLabel} · Tier {ds.tier}
                              </span>
                            </div>
                            <span className={`px-2 py-0.5 rounded text-[9px] font-bold ${
                              isGeneral ? 'bg-cyan-950 text-cyan-300 border border-cyan-800' : 'bg-purple-950 text-purple-300 border border-purple-800'
                            }`}>
                              {isGeneral ? 'BASELINE' : `TIER ${ds.tier}`}
                            </span>
                          </div>

                          <div className="grid grid-cols-3 gap-1 my-2 text-[10px] text-zinc-400 border-y border-zinc-800/80 py-1.5">
                            <div>
                              <span className="text-zinc-500 block text-[9px]">VOLUMEN</span>
                              <span className="text-zinc-200 font-bold">{ds.tokensCount}M tok</span>
                            </div>
                            <div>
                              <span className="text-zinc-500 block text-[9px]">{localize(state.language, 'PUREZA', 'PURITY')}</span>
                              <span className="text-emerald-400 font-bold">{ds.qualityScore}%</span>
                            </div>
                            <div>
                              <span className="text-zinc-500 block text-[9px]">CÓMPUTO</span>
                              <span className="text-yellow-300 font-bold">{ds.computeSpentPflops} PF</span>
                            </div>
                          </div>

                          <p className="text-[10px] text-zinc-400 leading-snug line-clamp-2">
                            {ds.description}
                          </p>
                        </div>

                        <div className="mt-3 pt-2 border-t border-zinc-800/80 flex items-center justify-between">
                          <span className="text-[9px] text-zinc-500 truncate max-w-36">
                            {ds.generatedByModelName ? `Por ${ds.generatedByModelName}` : 'Baseline Abierto'}
                          </span>
                          <button
                            onClick={() => trainModelOnDataset(ds.id, !isGeneral)}
                            disabled={!!state.activeTraining}
                            className={`px-2.5 py-1 rounded text-[10px] font-bold transition-all ${
                              !isGeneral
                                ? 'bg-purple-950 hover:bg-purple-900 border border-purple-500 text-purple-200'
                                : 'bg-cyan-950 hover:bg-cyan-900 border border-cyan-500 text-cyan-200'
                            } disabled:opacity-40 disabled:cursor-not-allowed`}
                          >
                            {localize(
                              state.language,
                              isGeneral ? 'ENTRENAR GENERAL' : 'ENTRENAR MICRO-MODELO',
                              isGeneral ? 'TRAIN GENERAL' : 'TRAIN MICRO-MODEL'
                            )}
                          </button>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
};
