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
import { DATASET_TIER_CONFIGS, DOMAIN_PRESETS, dataSourceUpgradeCost } from '../utils/constants';
import { formatGameTime } from '../utils/training';
import { DATA_SCRAPING_MIN_SCORE } from '../utils/missionTiers';
import { VERSION_PROFILES } from '../utils/versionProfiles';
import { tr } from '../i18n';

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
  // Story texts of the active UI version (early versions must not name the end goal).
  const story = VERSION_PROFILES[state.language === 'es' ? 'es' : 'en'][(state.uiVersion || 1) as 1 | 2 | 3 | 4].story;

  const [activeSubTab, setActiveSubTab] = useState<'engines' | 'scraping'>('engines');
  const [selectedDomain, setSelectedDomain] = useState<string>('cybersecurity');
  const [customDomainInput, setCustomDomainInput] = useState<string>('');
  const [selectedTier, setSelectedTier] = useState<1 | 2 | 3 | 4>(1);
  const [assignedModelId, setAssignedModelId] = useState<string>(state.currentModel.id);

  const getEngineIcon = (type: string) => {
    switch (type) {
      case 'relational_sql':
        return <Database className="w-5 h-5 mutating-accent-text" />;
      case 'vector_rag':
      case 'vector_embeddings':
        return <GitFork className="w-5 h-5 theme-success-text" />;
      case 'knowledge_graph':
        return <Network className="w-5 h-5 mutating-accent-text" />;
      case 'synthetic_flywheel':
        return <Repeat className="w-5 h-5 theme-warn-text" />;
      default:
        return <Layers className="w-5 h-5 mutating-accent-text" />;
    }
  };

  const getDomainIcon = (iconName: string) => {
    switch (iconName) {
      case 'Shield':
        return <Shield className="w-4 h-4 theme-success-text" />;
      case 'TrendingUp':
        return <TrendingUp className="w-4 h-4 theme-warn-text" />;
      case 'Orbit':
        return <Orbit className="w-4 h-4 mutating-accent-text" />;
      case 'Dna':
        return <Dna className="w-4 h-4 mutating-accent-text" />;
      case 'Cpu':
        return <Cpu className="w-4 h-4 mutating-accent-text" />;
      default:
        return <Database className="w-4 h-4 mutating-accent-text" />;
    }
  };

  const assignedModel = state.savedModels.find(m => m.id === assignedModelId) || state.currentModel;
  const targetDomainKey = selectedDomain === 'custom' ? customDomainInput.trim().toLowerCase() : selectedDomain;
  const tierConfig = DATASET_TIER_CONFIGS[selectedTier];
  const isModelQualifiedForTier = assignedModel.reasoningScore >= tierConfig.minModelIQ;

  // General models eligible to unlock the scraping module
  const eligibleGeneralModels = state.savedModels.filter(m => (!m.modelType || m.modelType === 'general') && m.reasoningScore >= DATA_SCRAPING_MIN_SCORE);
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
            {tr(state.language, 'dataPipelineManager.dataKnowledgeEnginesMultimodalIngestion')}
          </h2>
        </div>
        <div className="text-xs mutating-text-muted">
          {tr(state.language, 'dataPipelineManager.availableBalance')} <span className="theme-success-text font-bold">${state.credits.toLocaleString()} CR</span>
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
          <span>{tr(state.language, 'dataPipelineManager.coreEngines4')}</span>
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
          <span>{tr(state.language, 'dataPipelineManager.dataScrapingMicroModels')}</span>
          {!state.isDataScrapingUnlocked ? (
            <span className="px-1.5 py-0.2 rounded theme-warn-soft theme-warn-text border theme-warn-border text-[11px] flex items-center gap-1">
              <Lock className="w-2.5 h-2.5" />
              {tr(state.language, 'dataPipelineManager.locked')}
            </span>
          ) : state.activeScrapeJob ? (
            <span className="px-1.5 py-0.2 rounded theme-accent-soft theme-on-accent font-black text-[11px] animate-pulse">
              SCRAPING {state.activeScrapeJob.progressPercent}%
            </span>
          ) : (
            <span className="px-1.5 py-0.2 rounded mutating-sub text-[11px] font-bold">
              {state.customDatasets.length} DATASETS
            </span>
          )}
        </button>
      </div>

      {/* VIEW 1: CORE KNOWLEDGE ENGINES */}
      {activeSubTab === 'engines' && (
        <div className="space-y-4">
          <p className="text-xs mutating-text-muted leading-relaxed">
            {story.dataIntro}
          </p>

          {/* Interactive Data Architecture Pipeline Cards */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            {state.dataSources.map(ds => {
              const content = localizedDataSource(state.language, ds);
              const isConnected = state.currentModel.activeDataSources.includes(ds.id);
              const upgradeCost = dataSourceUpgradeCost(ds);
              const technologyAvailable = isDataSourceProgressionUnlocked(ds, state);
              const requiredResearch = state.researchTree.find(node => node.id === ds.requiredResearchId);

              return (
                <div 
                  key={ds.id} 
                  className={`p-3 rounded-lg border transition-all flex flex-col justify-between ${
                    ds.unlocked 
                      ? 'mutating-card theme-accent-border shadow-sm'
                      : 'mutating-sub opacity-70'
                  }`}
                >
                  <div>
                    {/* Title & Badge */}
                    <div className="flex items-start justify-between gap-2">
                      <div className="flex items-center gap-2">
                        <div className="p-1.5 rounded mutating-sub border">
                          {getEngineIcon(ds.type)}
                        </div>
                        <div>
                          <div className="flex items-center gap-1.5 flex-wrap">
                            <h3 className="font-bold text-xs theme-text">{content.name}</h3>
                            {DATA_DOCS[ds.id] && (
                              <DocLinkBadge doc={DATA_DOCS[ds.id]} language={state.language} />
                            )}
                          </div>
                          <span className="text-[11px] mutating-accent-text font-mono">
                            {ds.unlocked
                              ? tr(state.language, 'dataPipelineManager.statusOnlineLevel', { level: ds.level })
                              : technologyAvailable
                                ? tr(state.language, 'dataPipelineManager.statusAvailable')
                                : localize(state.language, `BLOQUEADO · ${requiredResearch?.title ?? 'I+D'} / DÍA ${ds.availableAfterDays ?? '—'}`, `LOCKED · ${requiredResearch?.title ?? 'R&D'} / DAY ${ds.availableAfterDays ?? '—'}`)}
                          </span>
                        </div>
                      </div>

                      {ds.unlocked && (
                        <span className={`px-2 py-0.5 rounded text-[11px] border font-bold ${
                          isConnected 
                            ? 'theme-accent-soft theme-accent-border mutating-accent-text' 
                            : 'theme-sub-bg theme-border mutating-text-muted'
                        }`}>
                          {isConnected
                            ? tr(state.language, 'dataPipelineManager.connectedAi')
                            : tr(state.language, 'dataPipelineManager.disconnected')}
                        </span>
                      )}
                    </div>

                    {/* Description & Technical Specs */}
                    <p className="text-xs theme-text mt-2.5 leading-snug">
                      {content.description}
                    </p>

                    <div className="mt-2 p-2 rounded mutating-sub border text-[11px] space-y-1">
                      <div className="mutating-accent-text font-semibold">{content.bonusAttribute}</div>
                      <div className="mutating-text-muted text-[11px]">{content.technicalDetails}</div>
                    </div>

                    {/* Metric Bars if unlocked */}
                    {ds.unlocked && (
                      <div className="grid grid-cols-3 gap-2 mt-3 pt-2 border-t theme-border text-[11px]">
                        <div>
                          <span className="mutating-text-muted text-[11px] block">{tr(state.language, 'dataPipelineManager.indexedTokens')}</span>
                          <span className="mutating-accent-text font-bold">{ds.tokensIndexed}M</span>
                        </div>
                        <div>
                          <span className="mutating-text-muted text-[11px] block">{tr(state.language, 'dataPipelineManager.qualityPurity')}</span>
                          <span className="theme-success-text font-bold">{ds.qualityScore}%</span>
                        </div>
                        <div>
                          <span className="mutating-text-muted text-[11px] block">{tr(state.language, 'dataPipelineManager.storage')}</span>
                          <span className="theme-warn-text font-bold">{ds.storageGb} GB</span>
                        </div>
                      </div>
                    )}
                  </div>

                  {/* Action buttons */}
                  <div className="mt-3 pt-2 border-t theme-border flex items-center justify-between">
                    {!ds.unlocked ? (
                      <button
                        onClick={() => unlockDataSource(ds.id)}
                        disabled={state.credits < ds.cost || !technologyAvailable}
                        className={`w-full py-1.5 px-3 rounded text-xs font-bold flex items-center justify-center gap-1.5 transition-all ${
                          state.credits >= ds.cost
                            ? 'mutating-btn-primary theme-on-accent cursor-pointer'
                            : 'theme-raised-bg mutating-text-muted cursor-not-allowed border theme-border'
                        }`}
                      >
                        <Unlock className="w-3.5 h-3.5" />
                        <span>{tr(state.language, 'dataPipelineManager.deployEngine')} (${ds.cost.toLocaleString()} CR)</span>
                      </button>
                    ) : (
                      <div className="flex items-center justify-between w-full">
                        <span className="text-[11px] mutating-text-muted">
                          {tr(state.language, 'dataPipelineManager.capacityLevel')} {ds.level}
                        </span>
                        <button
                          onClick={() => upgradeDataSource(ds.id)}
                          disabled={state.credits < upgradeCost}
                          className={`py-1 px-3 rounded text-xs font-bold flex items-center gap-1 transition-all ${
                            state.credits >= upgradeCost
                              ? 'theme-raised-bg mutating-accent-text border theme-accent-border cursor-pointer'
                              : 'theme-sub-bg mutating-text-muted border theme-border cursor-not-allowed'
                          }`}
                        >
                          <TrendingUp className="w-3.5 h-3.5" />
                          <span>{tr(state.language, 'dataPipelineManager.scaleIndex')} (${upgradeCost.toLocaleString()} CR)</span>
                        </button>
                      </div>
                    )}
                  </div>
                </div>
              );
            })}
          </div>

          {/* Visual Knowledge Flow Diagram */}
          <div className="mutating-panel border p-3 rounded-lg text-xs space-y-2">
            <h4 className="font-bold mutating-accent-text flex items-center gap-1.5">
              <GitFork className="w-3.5 h-3.5 mutating-accent-text" />
              {tr(state.language, 'dataPipelineManager.neuralDataFlowArchitectureDag')}
            </h4>
            <div className="flex flex-wrap items-center justify-center gap-2 py-2 text-center">
              <div className="px-2 py-1 rounded theme-accent-soft border theme-accent-border mutating-accent-text text-[11px]">
                SQL Relacional (Tablas ACID)
              </div>
              <ArrowRight className="w-3 h-3 mutating-text-muted" />
              <div className="px-2 py-1 rounded theme-success-soft border theme-success-border theme-success-text text-[11px]">
                {tr(state.language, 'dataPipelineManager.semanticVectorsHnswRag')}
              </div>
              <ArrowRight className="w-3 h-3 mutating-text-muted" />
              <div className="px-2 py-1 rounded theme-accent-soft border theme-accent-border mutating-accent-text text-[11px]">
                {tr(state.language, 'dataPipelineManager.ontologicalGraphRdfTriples')}
              </div>
              <ArrowRight className="w-3 h-3 mutating-text-muted" />
              <div className="px-2 py-1 rounded theme-warn-soft border theme-warn-border theme-warn-text text-[11px]">
                {tr(state.language, 'dataPipelineManager.syntheticSelfPlayFlywheel')}
              </div>
              <ArrowRight className="w-3 h-3 mutating-text-muted" />
              <div className="px-2 py-1 rounded mutating-btn-primary theme-on-accent font-bold text-[11px]">
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
            <div className="rounded-lg border theme-warn-border theme-accent-soft p-4 space-y-4">
              <div className="flex items-start justify-between gap-3">
                <div className="flex items-center gap-2">
                  <div className="p-2 rounded theme-warn-soft border theme-warn-border theme-warn-text">
                    <Lock className="w-6 h-6" />
                  </div>
                  <div>
                    <h3 className="font-bold text-sm theme-warn-text">
                      {tr(state.language, 'dataPipelineManager.dataScrapingGenerationModuleLocked')}
                    </h3>
                    <p className="text-xs theme-warn-text">
                      {tr(state.language, 'dataPipelineManager.autonomousCrawlerHeuristicResearchRequired')}
                    </p>
                  </div>
                </div>
                <span className="px-2 py-0.5 rounded text-[11px] theme-warn-soft theme-warn-text border theme-warn-border font-bold">
                  {tr(state.language, 'dataPipelineManager.cognitivePrerequisite')}
                </span>
              </div>

              <div className="bg-black/50 border theme-warn-border p-3 rounded text-xs space-y-2 theme-text leading-relaxed">
                <p>
                  {state.language === 'en'
                    ? <>To construct specialized domain datasets, your infrastructure needs an automated scraping and synthesis engine. <strong>You cannot access this initially</strong>: you must deploy an existing, sufficiently leveled general AI model to research and unlock this feature.</>
                    : <>Para construir datasets de dominios especializados, tu infraestructura necesita un motor autónomo de scraping y síntesis. <strong>No puedes acceder a este módulo inicialmente</strong>: debes desplegar un modelo general con suficiente nivel cognitivo para investigar y desbloquear esta tecnología.</>}
                </p>
                <div className="p-2.5 rounded theme-warn-soft border theme-warn-border text-[11px] space-y-1">
                  <div className="font-bold theme-warn-text">
                    {tr(state.language, 'dataPipelineManager.prerequisiteRequirementsUnlock')}
                  </div>
                  <ul className="list-disc list-inside space-y-0.5 mutating-text-muted">
                    <li>
                      {tr(state.language, 'dataPipelineManager.n1xDeployedGeneralAiModel')}
                    </li>
                    <li>
                      {tr(state.language, 'dataPipelineManager.completeLeast1TrainingRun')}
                    </li>
                  </ul>
                </div>
              </div>

              {/* Status of Player's Models */}
              <div className="space-y-2">
                <h4 className="text-xs font-bold theme-text">
                  {tr(state.language, 'dataPipelineManager.statusGeneralModels')}
                </h4>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                  {state.savedModels.filter(m => !m.modelType || m.modelType === 'general').map(m => {
                    const isQualified = m.reasoningScore >= DATA_SCRAPING_MIN_SCORE;
                    return (
                      <div
                        key={m.id}
                        className={`p-2.5 rounded border flex items-center justify-between text-xs ${
                          isQualified
                            ? 'theme-success-soft theme-success-border theme-success-text'
                            : 'theme-sub-bg theme-border mutating-text-muted'
                        }`}
                      >
                        <div>
                          <div className="font-bold flex items-center gap-1.5">
                            <span>{m.name}</span>
                            {isQualified && <CheckCircle2 className="w-3.5 h-3.5 theme-success-text" />}
                          </div>
                          <span className="text-[11px] mutating-text-muted">
                            {tr(state.language, 'dataPipelineManager.score')} {m.reasoningScore} / {DATA_SCRAPING_MIN_SCORE} {tr(state.language, 'dataPipelineManager.required')}
                          </span>
                        </div>

                        {isQualified ? (
                          <button
                            onClick={() => unlockDataScrapingModule(m.id)}
                            className="px-3 py-1 rounded theme-btn-success theme-on-accent font-bold text-xs transition-all"
                          >
                            {tr(state.language, 'dataPipelineManager.deployUnlock')}
                          </button>
                        ) : (
                          <span className="text-[11px] theme-warn-text font-bold">
                            {tr(state.language, 'dataPipelineManager.needsMoreTraining')}
                          </span>
                        )}
                      </div>
                    );
                  })}
                </div>
              </div>

              {/* Progressive Complexity Tree Preview */}
              <div className="mutating-panel border p-3 rounded-lg text-xs space-y-2">
                <h4 className="font-bold mutating-accent-text flex items-center gap-1.5">
                  <Sparkles className="w-3.5 h-3.5 mutating-accent-text" />
                  {tr(state.language, 'dataPipelineManager.progressiveDatasetComplexityTreePreview')}
                </h4>
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-2 text-[11px]">
                  {Object.values(DATASET_TIER_CONFIGS).map(tc => (
                    <div key={tc.tier} className="p-2 rounded theme-sub-bg border theme-border">
                      <div className="font-bold theme-text">{state.language === 'en' ? tc.name : tc.nameEs}</div>
                      <div className="mutating-text-muted mt-1">{tr(state.language, 'dataPipelineManager.reqModelScore')} {tc.minModelIQ}</div>
                      <div className="mutating-accent-text mt-0.5">{tc.targetTokensMillions}M tokens · {tc.computePflopsRequired} PF</div>
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
                <div className="rounded-lg border theme-accent-border theme-accent-soft p-3 space-y-2.5">
                  <div className="flex flex-wrap items-center justify-between gap-2 text-xs font-bold">
                    <div className="flex items-center gap-2 mutating-accent-text">
                      <Search className="w-4 h-4 animate-spin mutating-accent-text" />
                      <span>
                        {tr(state.language, 'dataPipelineManager.datasetSynthesisProgress')} {state.activeScrapeJob.domainLabel} (Tier {state.activeScrapeJob.tier})
                      </span>
                    </div>
                    <button
                      onClick={cancelDatasetScraping}
                      className="px-2 py-0.5 rounded theme-danger-soft border theme-danger-border theme-danger-text text-[11px] transition-colors"
                    >
                      {tr(state.language, 'dataPipelineManager.cancelScraping')}
                    </button>
                  </div>

                  <div className="w-full h-2.5 theme-sub-bg rounded-full border theme-accent-border overflow-hidden relative">
                    <div
                      className="h-full theme-gradient transition-all duration-300 rounded-full"
                      style={{ width: `${state.activeScrapeJob.progressPercent}%` }}
                    />
                  </div>

                  <div className="flex flex-wrap items-center justify-between text-[11px] mutating-text-muted">
                    <span>{tr(state.language, 'dataPipelineManager.progress')} {state.activeScrapeJob.progressPercent}%</span>
                    <span>{tr(state.language, 'dataPipelineManager.assignedModel')} <strong className="theme-text">{state.activeScrapeJob.assignedModelName}</strong></span>
                    <span>{tr(state.language, 'dataPipelineManager.computeDedicated')} {state.activeScrapeJob.computeRequiredPflops} PFLOPS</span>
                    <span className="mutating-accent-text">
                      {tr(state.language, 'dataPipelineManager.estimatedTime')}{' '}
                      {state.activeScrapeJob.timeRemainingSeconds === null
                        ? '...'
                        : formatGameTime(state.activeScrapeJob.timeRemainingSeconds)}
                    </span>
                  </div>
                </div>
              )}

              {/* Generator Console */}
              <form onSubmit={handleStartScraping} className="rounded-lg border mutating-panel p-3 space-y-3">
                <div className="flex flex-wrap items-center justify-between gap-2 border-b theme-accent-border pb-2">
                  <div className="flex items-center gap-2">
                    <Sparkles className="w-4 h-4 mutating-accent-text" />
                    <h3 className="font-bold text-xs mutating-accent-text tracking-wider">
                      {tr(state.language, 'dataPipelineManager.specializedDatasetScrapingGenerationConsole')}
                    </h3>
                  </div>
                  <span className="text-[11px] mutating-text-muted">
                    {tr(state.language, 'dataPipelineManager.complexityTreeTiers14')}
                  </span>
                </div>

                {/* Step 1: Select Domain Preset or Custom Input */}
                <div className="space-y-1.5">
                  <label className="text-xs font-bold theme-text flex items-center gap-1.5">
                    <Search className="w-3.5 h-3.5 mutating-accent-text" />
                    <span>{tr(state.language, 'dataPipelineManager.n1SelectTargetDomain')}</span>
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
                              ? 'theme-accent-soft theme-accent-border mutating-accent-text'
                              : 'theme-sub-bg theme-border mutating-text-muted'
                          }`}
                        >
                          <div className="flex items-center justify-between text-xs font-bold">
                            <span className="flex items-center gap-1.5">
                              {getDomainIcon(preset.iconName)}
                              {state.language === 'en' ? preset.name : preset.nameEs}
                            </span>
                            {isSelected && <CheckCircle2 className="w-3.5 h-3.5 mutating-accent-text" />}
                          </div>
                          <p className="text-[11px] mutating-text-muted mt-1 line-clamp-2">
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
                          ? 'theme-accent-soft theme-accent-border mutating-accent-text'
                          : 'theme-sub-bg theme-border mutating-text-muted'
                      }`}
                    >
                      <div className="text-xs font-bold flex items-center justify-between">
                        <span>{tr(state.language, 'dataPipelineManager.customDomainWrite')}</span>
                        {selectedDomain === 'custom' && <CheckCircle2 className="w-3.5 h-3.5 mutating-accent-text" />}
                      </div>
                      <input
                        type="text"
                        value={customDomainInput}
                        onChange={e => setCustomDomainInput(e.target.value)}
                        placeholder={tr(state.language, 'dataPipelineManager.eGQuantumCryptanalysis')}
                        className="mt-1.5 w-full bg-black/60 border theme-border rounded px-2 py-1 text-[11px] theme-text outline-none"
                      />
                    </div>
                  </div>
                </div>

                {/* Step 2: Progressive Complexity Tier */}
                <div className="space-y-1.5 pt-1">
                  <label className="text-xs font-bold theme-text flex items-center gap-1.5">
                    <Sliders className="w-3.5 h-3.5 mutating-accent-text" />
                    <span>{tr(state.language, 'dataPipelineManager.n2ProgressiveComplexityTierTier')}</span>
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
                              ? 'theme-accent-soft theme-accent-border mutating-accent-text'
                              : 'theme-sub-bg theme-border mutating-text-muted'
                          } ${!modelMeetsIQ ? 'opacity-60' : ''}`}
                        >
                          <div className="flex items-center justify-between text-xs font-bold">
                            <span>{state.language === 'en' ? tc.name.split(':')[0] : tc.nameEs.split(':')[0]}</span>
                            {!modelMeetsIQ ? (
                              <span className="text-[11px] theme-warn-text flex items-center gap-0.5">
                                <Lock className="w-2.5 h-2.5" /> {tr(state.language, 'dataPipelineManager.score')} ≥ {tc.minModelIQ}
                              </span>
                            ) : (
                              <span className="text-[11px] theme-success-text font-bold">✓ APTO</span>
                            )}
                          </div>
                          <div className="text-[11px] mutating-accent-text font-bold mt-1">
                            {tc.targetTokensMillions}M tok · {tc.computePflopsRequired} PF
                          </div>
                          <p className="text-[11px] mutating-text-muted mt-1 line-clamp-2">
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
                    <label className="text-xs font-bold theme-text block mb-1">
                      {tr(state.language, 'dataPipelineManager.n3AssignedModelCrawlingSynthesis')}
                    </label>
                    <select
                      value={assignedModelId}
                      onChange={e => setAssignedModelId(e.target.value)}
                      className="w-full theme-sub-bg border theme-border rounded px-2.5 py-1.5 text-xs theme-text outline-none font-mono"
                    >
                      {state.savedModels.map(m => (
                        <option key={m.id} value={m.id}>
                          {m.name} ({tr(state.language, 'dataPipelineManager.score')} {m.reasoningScore} · {m.modelType === 'micro_model' ? (tr(state.language, 'dataPipelineManager.microModel')) : 'General'})
                        </option>
                      ))}
                    </select>
                    <span className="text-[11px] mutating-text-muted mt-1 block">
                      {tr(state.language, 'dataPipelineManager.higherScoringModelsCanScrape')}
                    </span>
                  </div>

                  <div className="flex flex-col justify-end">
                    <button
                      type="submit"
                      disabled={!!state.activeScrapeJob || !isModelQualifiedForTier || (selectedDomain === 'custom' && !customDomainInput.trim())}
                      className={`w-full py-2 px-3 rounded text-xs font-bold flex items-center justify-center gap-2 transition-all ${
                        !state.activeScrapeJob && isModelQualifiedForTier && (selectedDomain !== 'custom' || !!customDomainInput.trim())
                          ? 'mutating-btn-primary text-white cursor-pointer'
                          : 'theme-raised-bg mutating-text-muted border theme-border cursor-not-allowed'
                      }`}
                    >
                      <Play className="w-3.5 h-3.5 fill-current" />
                      <span>
                        {tr(state.language, 'dataPipelineManager.startDatasetGeneration')} ({tierConfig.targetTokensMillions}M TOKENS)
                      </span>
                    </button>
                    {!isModelQualifiedForTier && (
                      <span className="text-[11px] theme-warn-text mt-1 text-center font-bold">
                        {tr(state.language, 'dataPipelineManager.assignedModelNeedsScoreTier', { minModelIQ: tierConfig.minModelIQ })}
                      </span>
                    )}
                  </div>
                </div>
              </form>

              {/* Generated Datasets Library */}
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <h4 className="text-xs font-bold theme-text flex items-center gap-1.5">
                    <Database className="w-3.5 h-3.5 mutating-accent-text" />
                    <span>{tr(state.language, 'dataPipelineManager.specializedDatasetsGeneralBaselineRepository')}</span>
                  </h4>
                  <span className="text-[11px] mutating-text-muted">
                    {state.customDatasets.length} {tr(state.language, 'dataPipelineManager.available')}
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
                            ? 'theme-accent-soft theme-accent-border'
                            : 'theme-panel-bg theme-accent-border'
                        }`}
                      >
                        <div>
                          <div className="flex items-start justify-between gap-1.5">
                            <div>
                              <h5 className="font-bold text-xs theme-text">{ds.name}</h5>
                              <span className="text-[11px] mutating-accent-text font-mono block">
                                {ds.domainLabel} · Tier {ds.tier}
                              </span>
                            </div>
                            <span className={`px-2 py-0.5 rounded text-[11px] font-bold ${
                              isGeneral ? 'theme-accent-soft mutating-accent-text border theme-accent-border' : 'theme-accent-soft mutating-accent-text border theme-accent-border'
                            }`}>
                              {isGeneral ? 'BASELINE' : `TIER ${ds.tier}`}
                            </span>
                          </div>

                          <div className="grid grid-cols-3 gap-1 my-2 text-[11px] mutating-text-muted border-y theme-border py-1.5">
                            <div>
                              <span className="mutating-text-muted block text-[11px]">VOLUMEN</span>
                              <span className="theme-text font-bold">{ds.tokensCount}M tok</span>
                            </div>
                            <div>
                              <span className="mutating-text-muted block text-[11px]">{tr(state.language, 'dataPipelineManager.purity')}</span>
                              <span className="theme-success-text font-bold">{ds.qualityScore}%</span>
                            </div>
                            <div>
                              <span className="mutating-text-muted block text-[11px]">CÓMPUTO</span>
                              <span className="theme-warn-text font-bold">{ds.computeSpentPflops} PF</span>
                            </div>
                          </div>

                          <p className="text-[11px] mutating-text-muted leading-snug line-clamp-2">
                            {ds.description}
                          </p>
                        </div>

                        <div className="mt-3 pt-2 border-t theme-border flex items-center justify-between">
                          <span className="text-[11px] mutating-text-muted truncate max-w-36">
                            {ds.generatedByModelName ? `Por ${ds.generatedByModelName}` : 'Baseline Abierto'}
                          </span>
                          <button
                            onClick={() => trainModelOnDataset(ds.id, !isGeneral)}
                            disabled={!!state.activeTraining}
                            className={`px-2.5 py-1 rounded text-[11px] font-bold transition-all ${
                              !isGeneral
                                ? 'theme-accent-soft border theme-accent-border mutating-accent-text'
                                : 'theme-accent-soft border theme-accent-border mutating-accent-text'
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
