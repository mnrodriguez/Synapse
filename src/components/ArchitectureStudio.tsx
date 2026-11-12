/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState } from 'react';
import { useGame } from '../context/GameContext';
import { 
  ModelTopology, 
  QuantizationType, 
  LossFunction, 
  AttentionType, 
  ModelArchitecture,
  InferenceParams 
} from '../types/game';
import { 
  Layers, 
  Cpu, 
  Play, 
  AlertCircle, 
  CheckCircle2, 
  Database, 
  Zap, 
  Settings2,
  Sliders,
  Sparkles,
  Pencil,
  Check,
  X,
  Lock
} from 'lucide-react';
import { sound } from '../audio/soundManager';
import { t } from '../utils/i18n';
import { localize } from '../utils/i18n';
import { localizedDataSource } from '../utils/gameContentI18n';
import { 
  TOPOLOGY_DOCS, 
  ATTENTION_DOCS, 
  QUANTIZATION_DOCS, 
  LOSS_DOCS 
} from '../utils/aiDocumentation';
import { AGENT_COMPUTE_DEMAND_PFLOPS } from '../utils/constants';
import { DATA_SCRAPING_MIN_SCORE } from '../utils/missionTiers';
import { sanitizeTrainingConfig, BATCH_SIZES } from '../utils/trainingRun';
import { gpuComputePflops, calculateTrainingProgressPerTick, estimateTrainingSeconds, formatTrainingDuration, formatTrainingTime, externalComputePflops } from '../utils/training';
import { evaluateModelCapabilities } from '../utils/missionEvaluation';
import { getModelOptionRequirement, isProgressionUnlocked } from '../utils/progression';
import { DocLinkBadge } from './DocLinkBadge';
import { VERSION_PROFILES } from '../utils/versionProfiles';

const DEFAULT_TRAINING_TOKENS_ESTIMATE = 50_000_000; // general corpus, used for the architecture estimate

export const ArchitectureStudio: React.FC = () => {
  const {
    state,
    updateModelArchitecture,
    startTraining,
    cancelTraining,
    addLog,
    createModel,
    selectModel,
    renameModel,
    mountHostModel
  } = useGame();
  // Story texts of the active UI version (early versions must not name the end goal).
  const story = VERSION_PROFILES[state.language === 'es' ? 'es' : 'en'][(state.uiVersion || 1) as 1 | 2 | 3 | 4].story;
  const [newModelName, setNewModelName] = useState(`SYNAPSE-Model-${state.savedModels.length + 1}`);
  const [editingModelId, setEditingModelId] = useState<string | null>(null);
  const [editingModelName, setEditingModelName] = useState('');
  const [activeArchTab, setActiveArchTab] = useState<'topology' | 'precision' | 'training' | 'sampling'>('topology');
  const current = state.currentModel;

  // Total cluster VRAM calculation
  const totalClusterVram = state.hardware.reduce((sum, h) => 
    h.category === 'gpu' ? sum + (h.vramGb * h.count) : sum, 0
  );

  const isVramSufficient = totalClusterVram >= current.vramRequiredGb;
  const agentComputeDemand = state.agents.filter(agent => agent.status !== 'quarantined').length * AGENT_COMPUTE_DEMAND_PFLOPS;
  // Same estimate as the training panel: dataset tokens × epochs, sped up by the batch.
  const runConfig = sanitizeTrainingConfig(state.trainingConfig);
  const trainingProgressPerTick = BATCH_SIZES[runConfig.batchSize].speed * calculateTrainingProgressPerTick({
    parametersCount: current.parametersCount,
    tokensCount: DEFAULT_TRAINING_TOKENS_ESTIMATE * runConfig.epochs,
    gpuPflops: gpuComputePflops(state.hardware),
    borrowedPflops: state.borrowedComputePflops + externalComputePflops(state),
    agentComputeDemand,
    reservedComputePflops: (state.activeGigs || (state.activeGig ? [state.activeGig] : [])).reduce((sum, g) => sum + (g.computePflopsRequired || 0), 0),
    systemHeatCelsius: state.systemHeatCelsius
  });
  const estimatedTrainingSeconds = estimateTrainingSeconds(100, trainingProgressPerTick);
  const estimateSpeed = Math.max(1, state.gameSpeed);
  const modelEvaluation = evaluateModelCapabilities(current, state.dataSources);
  const isOptionUnlocked = (
    field: 'parametersCount' | 'topology' | 'contextWindow' | 'quantization' | 'attention' | 'lossFunction',
    value: number | string
  ) => isProgressionUnlocked(
    getModelOptionRequirement(field, value as ModelArchitecture[typeof field]),
    state
  );
  const advancedSamplingUnlocked = isProgressionUnlocked(
    { requiredResearchId: 'res_lora_peft', availableAfterDays: 30 },
    state
  );

  const handleTopologyChange = (top: ModelTopology) => {
    sound.playKeyClick();
    updateModelArchitecture({ topology: top });
  };

  const handleParamsPreset = (params: number, label: string) => {
    sound.playKeyClick();
    updateModelArchitecture({
      parametersCount: params,
      name: `SYNAPSE-${label}-${current.topology.toUpperCase()}`
    });
  };

  const handleCreateModel = (event: React.FormEvent) => {
    event.preventDefault();
    if (createModel(newModelName)) {
      setNewModelName(`SYNAPSE-Model-${state.savedModels.length + 2}`);
    }
  };

  const handleRenameModel = (event: React.FormEvent, modelId: string) => {
    event.preventDefault();
    if (renameModel(modelId, editingModelName)) {
      setEditingModelId(null);
      setEditingModelName('');
    }
  };

  const handleQuantizationChange = (q: QuantizationType) => {
    sound.playKeyClick();
    updateModelArchitecture({ quantization: q });
  };

  const handleAttentionChange = (att: AttentionType) => {
    sound.playKeyClick();
    updateModelArchitecture({ attention: att });
  };

  const handleLossChange = (loss: LossFunction) => {
    sound.playKeyClick();
    updateModelArchitecture({ lossFunction: loss });
  };

  const handleContextChange = (ctx: number) => {
    sound.playKeyClick();
    updateModelArchitecture({ contextWindow: ctx });
  };

  const toggleDataSource = (dsId: string) => {
    sound.playKeyClick();
    const active = [...current.activeDataSources];
    const idx = active.indexOf(dsId);
    if (idx >= 0) {
      if (active.length === 1) {
        addLog(localize(state.language, 'El modelo requiere al menos una fuente de datos conectada para entrenar.', 'The model needs at least one connected data source to train.'), 'warning');
        return;
      }
      active.splice(idx, 1);
    } else {
      active.push(dsId);
    }
    updateModelArchitecture({ activeDataSources: active });
  };

  const handleInferenceParamChange = <K extends keyof InferenceParams>(key: K, val: InferenceParams[K]) => {
    sound.playKeyClick();
    const currentParams = current.inferenceParams || {
      temperature: 0.70,
      topP: 0.90,
      topK: 40,
      repetitionPenalty: 1.10,
      systemPrompt: 'You are an autonomous machine intelligence.'
    };
    updateModelArchitecture({
      inferenceParams: {
        ...currentParams,
        [key]: val
      }
    });
  };

  const currentParams = current.inferenceParams || {
    temperature: 0.70,
    topP: 0.90,
    topK: 40,
    repetitionPenalty: 1.10,
    systemPrompt: 'You are an autonomous machine intelligence.'
  };

  const isBeginner = state.difficulty === 'beginner';

  const paramPresets = isBeginner ? [
    { label: '14M (Proto)', value: 14_000_000 },
    { label: '70M (Compact)', value: 70_000_000 },
    { label: '500M (Standard)', value: 500_000_000 }
  ] : [
    { label: '14M', value: 14_000_000 },
    { label: '70M', value: 70_000_000 },
    { label: '500M', value: 500_000_000 },
    { label: '1.5B', value: 1_500_000_000 },
    { label: '7B', value: 7_000_000_000 },
    { label: '34B', value: 34_000_000_000 },
    { label: '70B', value: 70_000_000_000 },
    { label: '405B', value: 405_000_000_000 },
    { label: '1T', value: 1_000_000_000_000 }
  ];

  const contextPresets = isBeginner ? [2048, 4096] : [2048, 4096, 8192, 32768, 128000, 1000000];

  return (
    <div className="flex flex-col h-full mutating-panel border rounded-xl p-3 sm:p-4 overflow-y-auto space-y-4 font-mono">
      {/* Studio Header */}
      <div className="flex flex-wrap items-center justify-between gap-2 border-b border-current/10 pb-2">
        <div className="flex items-center gap-2">
          <Layers className="w-4 h-4 mutating-accent-text" />
          <h2 className="text-sm font-bold mutating-accent-text tracking-wider">
            {story.architectureTitle}
          </h2>
        </div>

        {/* Action button */}
        {state.activeTraining ? (
          <button
            onClick={cancelTraining}
            className="flex items-center gap-1.5 px-3 py-1 theme-danger-soft border theme-danger-border theme-danger-text rounded text-xs transition-colors"
          >
            <AlertCircle className="w-3.5 h-3.5" />
            <span>{localize(state.language, 'ABORTAR ENTRENAMIENTO', 'ABORT TRAINING')}</span>
          </button>
        ) : (
          <button
            onClick={() => startTraining(current.trainedOnDatasetId, current.modelType === 'micro_model')}
            disabled={!isVramSufficient || state.powerTripSeconds > 0 || state.detentionSeconds > 0}
            className={`flex items-center gap-1.5 px-3.5 py-1.5 rounded text-xs font-bold transition-all ${
              isVramSufficient && state.powerTripSeconds === 0 && state.detentionSeconds === 0
                ? 'mutating-btn-primary theme-on-accent cursor-pointer' 
                : 'theme-raised-bg mutating-text-muted border theme-border cursor-not-allowed'
            }`}
          >
            <Play className="w-3.5 h-3.5 fill-current" />
            <span>
              {localize(state.language, 'INICIAR ENTRENAMIENTO', 'START TRAINING')} ({current.name})
              {current.modelType === 'micro_model' ? ' · MICRO' : ''}
            </span>
          </button>
        )}
      </div>

      <section className="space-y-2 rounded mutating-sub p-2.5">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <div>
            <h3 className="text-xs font-bold tracking-wider mutating-accent-text">{t(state.language, 'model_library')}</h3>
            <p className="text-[11px] mutating-text-muted">{t(state.language, 'model_library_desc')}</p>
          </div>
          <form onSubmit={handleCreateModel} className="flex gap-1.5">
            <input
              aria-label={t(state.language, 'model_name')}
              value={newModelName}
              onChange={event => setNewModelName(event.target.value)}
              maxLength={40}
              disabled={!!state.activeTraining}
              className="w-40 rounded border border-current/20 mutating-sub px-2 py-1 text-[11px] outline-none disabled:opacity-50"
            />
            <button
              type="submit"
              disabled={!!state.activeTraining || state.credits < 100}
              className="rounded mutating-btn-primary px-2.5 py-1 text-[11px] font-bold disabled:cursor-not-allowed disabled:opacity-40 cursor-pointer"
              title={t(state.language, 'model_create_cost')}
            >
              + {t(state.language, 'create_model')} · 100 CR
            </button>
          </form>
        </div>

        <div className="flex flex-wrap gap-1.5">
          {state.savedModels.map(model => (
            <div
              key={model.id}
              className={`flex items-center gap-1 rounded border px-2 py-1 text-[11px] transition-all ${
                current.id === model.id
                  ? 'mutating-btn-primary font-bold shadow-sm'
                  : 'mutating-sub mutating-text-muted hover:opacity-100'
              }`}
            >
              {editingModelId === model.id ? (
                <form onSubmit={event => handleRenameModel(event, model.id)} className="flex items-center gap-1">
                  <input
                    autoFocus
                    aria-label={t(state.language, 'rename_model')}
                    value={editingModelName}
                    onChange={event => setEditingModelName(event.target.value)}
                    maxLength={40}
                    className="w-32 mutating-sub px-1 text-[11px] outline-none"
                  />
                  <button type="submit" aria-label={t(state.language, 'save_name')} className="theme-success-text"><Check className="h-3 w-3" /></button>
                  <button type="button" aria-label={t(state.language, 'cancel')} onClick={() => setEditingModelId(null)} className="mutating-text-muted"><X className="h-3 w-3" /></button>
                </form>
              ) : (
                <>
                  <button
                    type="button"
                    disabled={!!state.activeTraining}
                    onClick={() => selectModel(model.id)}
                    className="max-w-48 truncate text-left disabled:cursor-not-allowed"
                    title={`${model.name} · score ${model.reasoningScore}`}
                  >
                    {model.name} <span className="opacity-75">· {state.language === 'es' ? 'Puntaje' : 'Score'} {model.reasoningScore}</span>
                  </button>
                  <button
                    type="button"
                    aria-label={`${t(state.language, 'rename_model')} ${model.name}`}
                    onClick={() => {
                      setEditingModelId(model.id);
                      setEditingModelName(model.name);
                    }}
                    className="ml-1 opacity-60 hover:opacity-100"
                  >
                    <Pencil className="h-3 w-3" />
                  </button>

                  {current.id === model.id ? (
                    <span className="ml-1 text-[11px] px-1.5 py-0.2 rounded theme-accent-soft mutating-accent-text font-bold border theme-accent-border shrink-0">
                      {localize(state.language, 'ANFITRIÓN ✓', 'HOST ✓')}
                    </span>
                  ) : (
                    <button
                      type="button"
                      onClick={() => mountHostModel(model.id)}
                      className="ml-1 text-[11px] px-1.5 py-0.2 rounded theme-accent-soft mutating-accent-text font-bold border theme-accent-border transition cursor-pointer shrink-0"
                      title={localize(state.language, 'Montar como Agente Anfitrión de Synapse', 'Mount as Synapse Host Agent')}
                    >
                      🚀 {localize(state.language, 'Montar', 'Mount')}
                    </button>
                  )}
                </>
              )}
            </div>
          ))}
        </div>
      </section>

      {/* Educational Guidance Card for Beginner & Normal Modes */}
      {state.difficulty !== 'engineer' && (
        <section className="p-3 theme-accent-soft border theme-accent-border rounded-lg space-y-1.5 font-mono mutating-accent-text">
          <div className="flex items-center gap-2 font-bold text-xs mutating-accent-text">
            <Sparkles className="w-4 h-4 mutating-accent-text" />
            <span>
              {localize(state.language, 'GUÍA EDUCATIVA // ¿CÓMO SE ENTRENA Y CONFIGURA UN MODELO DE IA?', 'EDUCATIONAL GUIDE // HOW TO DESIGN & TRAIN AN AI MODEL')}
            </span>
          </div>
          <p className="text-[11px] leading-relaxed mutating-text-muted">
            {localize(
              state.language,
              'Entrenar una IA consiste en procesar millones de palabras (tokens) de un dataset para ajustar sus conexiones neuronales (parámetros). Cuantos más parámetros tiene el modelo, mayor es su puntaje de evaluación, pero exigirá más memoria VRAM en tus GPUs y más refrigeración.',
              'Training an AI means processing millions of dataset tokens to refine its neural weights (parameters). Models with more parameters achieve higher evaluation scores, but require more GPU VRAM and active cooling capacity.'
            )}
          </p>
          <div className="flex flex-wrap gap-2 text-[11px] pt-1 mutating-accent-text font-bold">
            <span className="px-2 py-0.5 rounded theme-accent-soft border theme-accent-border">
              💡 {localize(state.language, `Dificultad ${state.difficulty.toUpperCase()}: Micro-parámetros optimizados automáticamente`, `Difficulty ${state.difficulty.toUpperCase()}: Micro-parameters automatically optimized`)}
            </span>
            <span className="px-2 py-0.5 rounded theme-accent-soft border theme-accent-border mutating-accent-text">
              ⚡ {localize(state.language, 'Recompensas de misiones ajustadas', 'Mission rewards adjusted')}
            </span>
          </div>
        </section>
      )}

      {/* Model Spec Card */}
      <div className="grid grid-cols-2 sm:grid-cols-5 gap-2 mutating-sub p-2.5 rounded-lg text-xs">
        <div>
          <span className="mutating-text-muted text-[11px] block">{t(state.language, 'base_model')}</span>
          <span className="mutating-accent-text font-bold">{current.name}</span>
        </div>
        <div>
          <span className="mutating-text-muted text-[11px] block">{t(state.language, 'parameters')}</span>
          <span className="theme-warn-text font-bold">
            {current.parametersCount >= 1_000_000_000
              ? `${(current.parametersCount / 1_000_000_000).toFixed(1)}B`
              : `${(current.parametersCount / 1_000_000).toFixed(0)}M`}
          </span>
        </div>
        <div>
          <span className="mutating-text-muted text-[11px] block">{t(state.language, 'required_vram')}</span>
          <span className={`font-bold ${isVramSufficient ? 'theme-success-text' : 'theme-danger-text'}`}>
            {current.vramRequiredGb} GB / {totalClusterVram} GB {isVramSufficient ? '✓' : '(OOM!)'}
          </span>
        </div>
        <div>
          <span className="mutating-text-muted text-[11px] block">{localize(state.language, 'BENCHMARK INTELECTUAL', 'REASONING BENCHMARK')}</span>
          <span className="mutating-accent-text font-bold">{state.language === 'es' ? 'Puntaje' : 'Score'} {current.reasoningScore} / 100</span>
          {current.modelType === 'micro_model' && (
            <span className="text-[11px] mutating-accent-text block font-bold">
              +{Math.round(((current.domainProficiency || 1.5) - 1) * 100)}% {current.specializedDomain?.toUpperCase()}
            </span>
          )}
        </div>
        <div>
          <span className="mutating-text-muted text-[11px] block">{localize(state.language, 'PREDICCIÓN CON HARDWARE ACTUAL', 'PREDICTION WITH CURRENT HW')}</span>
          <span className="theme-success-text font-bold block">
            {estimatedTrainingSeconds === null
              ? localize(state.language, 'Sin cómputo disponible', 'No compute available')
              : formatTrainingTime(estimatedTrainingSeconds, state.language)}
          </span>
          <span className="text-[11px] mutating-text-muted font-mono block">
            {estimatedTrainingSeconds === null
              ? ''
              : `(~${formatTrainingDuration(estimatedTrainingSeconds / estimateSpeed)} @ ${estimateSpeed}x)`}
          </span>
          {state.gameSpeed === 0 && (
            <span className="text-[11px] theme-warn-text block">{localize(state.language, 'Simulación pausada', 'Simulation paused')}</span>
          )}
        </div>

        {/* Diegetic Host Agent Mounting Action */}
        <div className="flex items-center justify-between col-span-2 sm:col-span-5 pt-2 border-t border-current/10">
          <div className="flex items-center gap-2">
            <span className="text-[11px] mutating-text-muted">
              {localize(state.language, 'Agente Anfitrión Activo:', 'Active Host Agent:')} <strong className="mutating-accent-text">{current.name}</strong> ({state.language === 'es' ? 'Puntaje' : 'Score'} {current.reasoningScore} / 100)
            </span>
          </div>
          <button
            type="button"
            onClick={() => mountHostModel(current.id)}
            className="px-3.5 py-1.5 rounded-lg theme-gradient hover:brightness-110 text-white font-mono text-xs font-bold flex items-center gap-1.5 transition cursor-pointer"
          >
            <Sparkles className="w-3.5 h-3.5" />
            <span>{story.hostAgentButton}</span>
          </button>
        </div>
      </div>

      {/* Expansive Sub-Navigation Menu */}
      <div className="flex items-center gap-1.5 p-1.5 mutating-sub text-xs overflow-x-auto shadow-sm">
        <button
          onClick={() => { sound.playKeyClick(); setActiveArchTab('topology'); }}
          className={`px-3 py-1.5 rounded-md font-bold transition-all whitespace-nowrap flex items-center gap-2 cursor-pointer ${
            activeArchTab === 'topology'
              ? 'mutating-btn-primary shadow-sm font-black'
              : 'mutating-text-muted hover:opacity-100'
          }`}
        >
          <Cpu className="w-3.5 h-3.5" />
          <span>{localize(state.language, '1. TOPOLOGÍA & ESCALA', '1. TOPOLOGY & SCALE')}</span>
        </button>
        <button
          onClick={() => { sound.playKeyClick(); setActiveArchTab('precision'); }}
          className={`px-3 py-1.5 rounded-md font-bold transition-all whitespace-nowrap flex items-center gap-2 cursor-pointer ${
            activeArchTab === 'precision'
              ? 'mutating-btn-primary shadow-sm font-black'
              : 'mutating-text-muted hover:opacity-100'
          }`}
        >
          <Zap className="w-3.5 h-3.5" />
          <span>{localize(state.language, '2. PRECISIÓN & VRAM', '2. PRECISION & VRAM')}</span>
        </button>
        <button
          onClick={() => { sound.playKeyClick(); setActiveArchTab('training'); }}
          className={`px-3 py-1.5 rounded-md font-bold transition-all whitespace-nowrap flex items-center gap-2 cursor-pointer ${
            activeArchTab === 'training'
              ? 'mutating-btn-primary shadow-sm font-black'
              : 'mutating-text-muted hover:opacity-100'
          }`}
        >
          <Settings2 className="w-3.5 h-3.5" />
          <span>{localize(state.language, '3. HIPERPARÁMETROS & PIPELINES', '3. HYPERPARAMS & PIPELINES')}</span>
        </button>
        <button
          onClick={() => { sound.playKeyClick(); setActiveArchTab('sampling'); }}
          className={`px-3 py-1.5 rounded-md font-bold transition-all whitespace-nowrap flex items-center gap-2 cursor-pointer ${
            activeArchTab === 'sampling'
              ? 'mutating-btn-primary shadow-sm font-black'
              : 'mutating-text-muted hover:opacity-100'
          }`}
        >
          <Sliders className="w-3.5 h-3.5" />
          <span>{localize(state.language, '4. MUESTREO DE INFERENCIA', '4. INFERENCE SAMPLING')}</span>
        </button>
      </div>

      {/* Tab 1: Topology & Parameter Scale */}
      {activeArchTab === 'topology' && (
        <div className="space-y-4 animate-fadeIn">
          {/* Section 0: Dataset Baseline & Micro-Model Specialization */}
          <section className="space-y-2 rounded border mutating-panel p-3 font-mono">
        <div className="flex flex-wrap items-center justify-between gap-2 border-b theme-accent-border pb-1.5">
          <div className="flex items-center gap-1.5">
            <Database className="w-4 h-4 mutating-accent-text" />
            <h3 className="text-xs font-bold tracking-wider mutating-accent-text">
              {localize(state.language, 'ESPECIALIZACIÓN Y CORPUS DE ENTRENAMIENTO // BASELINE GENERAL VS MICRO-MODELOS', 'TRAINING DATASET & SPECIALIZATION // GENERAL BASELINE VS MICRO-MODELS')}
            </h3>
          </div>
          <span className="text-[11px] mutating-text-muted">
            {current.modelType === 'micro_model'
              ? localize(state.language, `MODO: MICRO-MODELO (${current.specializedDomain?.toUpperCase()})`, `MODE: MICRO-MODEL (${current.specializedDomain?.toUpperCase()})`)
              : localize(state.language, 'MODO: MODELO GENERAL (INFORMACIÓN AMPLIA)', 'MODE: GENERAL MODEL (BROAD SPECTRUM)')}
          </span>
        </div>

        <p className="text-[11px] mutating-text-muted leading-snug">
          {state.language === 'en'
            ? <>Initial AI training defaults to the <strong className="mutating-accent-text">General Information baseline</strong> for balanced, broad-spectrum progression. Unlock the <strong className="mutating-accent-text">Data Scraping Module</strong> in Data Engines to generate specialized domain datasets (Cybersecurity, Astrophysics, Finance, Bioinformatics, Robotics) and train high-velocity <strong className="mutating-accent-text">Micro-Models</strong>.</>
            : <>El entrenamiento inicial predetermina el <strong className="mutating-accent-text">baseline de Información General</strong> para un avance equilibrado. Desbloquea el <strong className="mutating-accent-text">Módulo de Scraping</strong> en Motores de Datos para sintetizar datasets especializados y entrenar <strong className="mutating-accent-text">Micro-Modelos</strong> ultrarrápidos.</>}
        </p>

        {/* Dataset Cards Grid */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-2 pt-1">
          {state.customDatasets.map(dataset => {
            const isSelected = (current.trainedOnDatasetId || 'dataset_general_corpus') === dataset.id;
            const isGeneral = dataset.domain === 'general' || dataset.id === 'dataset_general_corpus';

            return (
              <button
                key={dataset.id}
                type="button"
                onClick={() => {
                  sound.playKeyClick();
                  if (isGeneral) {
                    updateModelArchitecture({
                      trainedOnDatasetId: dataset.id,
                      modelType: 'general',
                      specializedDomain: undefined,
                      domainProficiency: 1.0
                    });
                  } else {
                    const prof = 1.4 + (dataset.tier * 0.3);
                    updateModelArchitecture({
                      trainedOnDatasetId: dataset.id,
                      modelType: 'micro_model',
                      specializedDomain: dataset.domain,
                      domainProficiency: prof
                    });
                  }
                }}
                className={`p-2 rounded text-left border transition-all ${
                  isSelected
                    ? isGeneral
                      ? 'theme-accent-soft theme-accent-border mutating-accent-text'
                      : 'theme-accent-soft theme-accent-border mutating-accent-text'
                    : 'theme-sub-bg theme-border mutating-text-muted'
                }`}
              >
                <div className="flex items-center justify-between text-xs font-bold">
                  <span className="truncate">{dataset.name}</span>
                  {isSelected && (
                    <span className="text-[11px] mutating-accent-text font-mono">
                      ✓ {localize(state.language, 'ACTIVO', 'ACTIVE')}
                    </span>
                  )}
                </div>
                <div className="flex items-center gap-2 text-[11px] mt-1 mutating-text-muted">
                  <span className={`px-1.5 py-0.2 rounded text-[11px] font-bold ${
                    isGeneral ? 'theme-accent-soft mutating-accent-text border theme-accent-border' : 'theme-accent-soft mutating-accent-text border theme-accent-border'
                  }`}>
                    {isGeneral ? 'GENERAL T1' : `SPECIALIST T${dataset.tier}`}
                  </span>
                  <span>{dataset.tokensCount}M tok</span>
                  <span>{dataset.qualityScore}% {localize(state.language, 'pureza', 'purity')}</span>
                </div>
                <p className="text-[11px] mutating-text-muted mt-1 line-clamp-2 leading-tight">
                  {dataset.description}
                </p>
                {!isGeneral && (
                  <div className="mt-1 text-[11px] theme-success-text font-bold">
                    +{Math.round(((1.4 + dataset.tier * 0.3) - 1) * 100)}% {localize(state.language, 'Pericia en contratos de', 'Proficiency in')} {dataset.domainLabel}
                  </div>
                )}
              </button>
            );
          })}
        </div>

        {!state.isDataScrapingUnlocked && (
          <div className="rounded border theme-warn-border theme-warn-soft p-2 text-xs flex items-center justify-between gap-2">
            <span className="text-[11px] theme-warn-text">
              {localize(
                state.language,
                `Módulo de Scraping Bloqueado: Entrena tu modelo general a puntaje ≥ ${DATA_SCRAPING_MIN_SCORE} para desbloquear la generación de datasets especializados en la pestaña "${VERSION_PROFILES.es[(state.uiVersion || 1) as 1 | 2 | 3 | 4].tabs.data}".`,
                `Data Scraping Locked: Level your general model to Evaluation score ≥ ${DATA_SCRAPING_MIN_SCORE} to unlock custom specialized datasets in the "${VERSION_PROFILES.en[(state.uiVersion || 1) as 1 | 2 | 3 | 4].tabs.data}" tab.`
              )}
            </span>
          </div>
        )}
      </section>

      {/* Section 1: Topology selection */}
      <div className="space-y-1.5">
        <label className="text-xs mutating-text-muted font-bold flex items-center gap-1.5">
          <Cpu className="w-3.5 h-3.5 mutating-accent-text" />
          {localize(state.language, 'TOPOLOGÍA DE RED Y PARADIGMA COMPUTACIONAL', 'NETWORK TOPOLOGY & COMPUTATIONAL PARADIGM')}
        </label>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-2">
          {[
            {
              id: 'transformer',
              name: localize(state.language, 'Transformer Autoregresivo (Decoder-Only)', 'Autoregressive Transformer (Decoder-Only)'),
              desc: localize(state.language, 'Atención densa O(n²). Excelente coherencia global y modelado del lenguaje.', 'Dense O(n²) attention. Strong global coherence and language modeling.')
            },
            {
              id: 'moe',
              name: 'Sparse Mixture-of-Experts (MoE)',
              desc: localize(state.language, 'Enrutador Top-K. Multiplica parámetros activos sin elevar costo por token.', 'Top-K router increases model capacity without raising compute per token.')
            },
            {
              id: 'mamba_ssm',
              name: 'State Space Model (Mamba SSM)',
              desc: localize(state.language, 'Complejidad O(n) lineal. Memoria recurrente continua para secuencias ultra-largas.', 'Linear O(n) complexity with recurrent memory for very long sequences.')
            },
            {
              id: 'gnn_hybrid',
              name: 'Graph Neural Network (GNN Hybrid)',
              desc: localize(state.language, 'Paso de mensajes en grafos no euclidianos. Razonamiento relacional estricto.', 'Message passing on non-Euclidean graphs for structured relational reasoning.')
            },
            {
              id: 'multimodal_diffusion',
              name: 'Multimodal Diffusion / Flow-Matching',
              desc: localize(state.language, 'Generación conjunta texto-visión-código con trayectorias óptimas de difusión.', 'Joint text, vision, and code generation using optimized diffusion paths.')
            }
          ].map(top => (
            (() => {
              const unlocked = isOptionUnlocked('topology', top.id);
              return (
            <div
              key={top.id}
              role="button"
              tabIndex={unlocked ? 0 : -1}
              aria-disabled={!unlocked}
              onClick={() => {
                if (unlocked) handleTopologyChange(top.id as ModelTopology);
              }}
              onKeyDown={(e) => {
                if (unlocked && (e.key === 'Enter' || e.key === ' ')) {
                  e.preventDefault();
                  handleTopologyChange(top.id as ModelTopology);
                }
              }}
              className={`p-2 rounded text-left border transition-all ${
                !unlocked
                  ? 'cursor-not-allowed opacity-45 theme-sub-bg theme-border mutating-text-muted'
                  : current.topology === top.id
                  ? 'cursor-pointer theme-accent-soft theme-accent-border mutating-accent-text'
                  : 'cursor-pointer theme-sub-bg theme-border mutating-text-muted'
              }`}
            >
              <div className="font-bold text-xs flex items-center justify-between">
                <span>{top.name.split(' (')[0]}</span>
                <div className="flex items-center gap-1">
                  {TOPOLOGY_DOCS[top.id] && (
                    <DocLinkBadge doc={TOPOLOGY_DOCS[top.id]} language={state.language} />
                  )}
                  {!unlocked && <Lock className="h-3 w-3 mutating-text-muted" />}
                  {current.topology === top.id && <CheckCircle2 className="w-3 h-3 mutating-accent-text" />}
                </div>
              </div>
              <p className="text-[11px] mutating-text-muted mt-1 leading-snug">{top.desc}</p>
            </div>
              );
            })()
          ))}
        </div>
      </div>

          {/* Parameters scale */}
          <div className="space-y-1.5 p-3 rounded-lg mutating-panel border">
            <label className="text-xs theme-text font-bold flex items-center gap-1.5">
              <Sliders className="w-3.5 h-3.5 theme-warn-text" />
              <span>{localize(state.language, 'ESCALA DE PARÁMETROS // CAPACIDAD COGNITIVA', 'PARAMETER SCALE // COGNITIVE CAPACITY')}</span>
            </label>
            <p className="text-[11px] mutating-text-muted">
              {localize(
                state.language,
                'El número de parámetros define el volumen de conexiones neuronales del modelo. Regla de Chinchilla: Entrenar requiere ~20 tokens por parámetro.',
                'Parameter count defines the total weight capacity. Chinchilla Scaling Law: Optimal training requires ~20 tokens per parameter.'
              )}
            </p>
            <div className="flex flex-wrap gap-1.5 pt-1">
              {paramPresets.map(preset => (
                (() => {
                  const unlocked = isOptionUnlocked('parametersCount', preset.value);
                  const requirement = getModelOptionRequirement('parametersCount', preset.value);
                  return (
                <button
                  key={preset.label}
                  disabled={!unlocked}
                  title={!unlocked
                    ? localize(state.language, `Investiga ${requirement.requiredResearchId} o avanza al día ${requirement.availableAfterDays}`, `Research ${requirement.requiredResearchId} or advance to day ${requirement.availableAfterDays}`)
                    : undefined}
                  onClick={() => handleParamsPreset(preset.value, preset.label)}
                  className={`px-3 py-1.5 rounded text-xs font-mono font-bold border transition-all disabled:cursor-not-allowed disabled:opacity-35 ${
                    current.parametersCount === preset.value
                      ? 'theme-warn-soft theme-warn-border theme-warn-text'
                      : 'theme-sub-bg theme-border mutating-text-muted'
                  }`}
                >
                  {preset.label} {!unlocked && <Lock className="ml-1 inline h-3 w-3" />}
                </button>
                  );
                })()
              ))}
            </div>
            <div className="mt-2 p-2 rounded theme-sub-bg border theme-border text-[11px] mutating-text-muted flex flex-wrap items-center justify-between gap-2">
              <span>{localize(state.language, 'Tokens Óptimos Chinchilla:', 'Chinchilla Optimal Tokens:')} <strong className="mutating-accent-text font-mono">{(current.parametersCount * 20 / 1_000_000).toFixed(0)}M tokens</strong></span>
              <span>{localize(state.language, 'Cómputo Teórico:', 'Theoretical Compute:')} <strong className="mutating-accent-text font-mono">{(6 * current.parametersCount * (current.parametersCount * 20)).toExponential(2)} FLOPs</strong></span>
            </div>
          </div>
        </div>
      )}

        {/* Tab 2: Precision & VRAM Allocation */}
        {activeArchTab === 'precision' && (
          <div className="space-y-4">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 pb-2 border-b theme-border">
              <div>
                <h3 className="text-sm font-semibold theme-text flex items-center gap-2">
                  <Cpu className="w-4 h-4 mutating-accent-text" />
                  {localize(state.language, 'Precisión Numérica & Mecanismo de Atención', 'Numerical Precision & Attention Mechanism')}
                </h3>
                <p className="text-xs mutating-text-muted mt-0.5">
                  {localize(
                    state.language,
                    'Ajusta la precisión de coma flotante por parámetro y la arquitectura de atención para balancear fidelidad y memoria VRAM.',
                    'Configure per-parameter floating-point precision and attention architecture to balance fidelity and VRAM footprint.'
                  )}
                </p>
              </div>
            </div>

            {isBeginner ? (
              <div className="p-4 rounded-lg theme-sub-bg border theme-accent-border text-xs space-y-2">
                <div className="font-semibold mutating-accent-text flex items-center gap-2">
                  <Sparkles className="w-4 h-4 mutating-accent-text" />
                  <span>{localize(state.language, 'Precisión Automatizada (Modo Principiante)', 'Automated Precision (Beginner Mode)')}</span>
                </div>
                <p className="text-xs mutating-text-muted">
                  {localize(
                    state.language,
                    'En modo Principiante, la precisión matemática se calibra en INT8 y la atención en MHA para garantizar entrenamiento estable y predecible.',
                    'In Beginner mode, precision is calibrated to INT8 and attention to MHA to guarantee stable, predictable convergence.'
                  )}
                </p>
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {/* Quantization */}
                <div className="space-y-2 p-3.5 rounded-lg theme-sub-bg border theme-border">
                  <label className="text-xs font-semibold theme-text flex items-center justify-between">
                    <span>{t(state.language, 'quantization')}</span>
                    <span className="text-[11px] mutating-text-muted font-mono">WEIGHT MEMORY</span>
                  </label>
                  <div className="space-y-2">
                    {[
                      { id: 'fp32', label: 'FP32 Full (4 bytes/param)', hint: localize(state.language, 'Precisión pura de 32 bits, máxima demanda de VRAM', 'Full 32-bit precision; maximum VRAM demand') },
                      { id: 'bf16', label: 'BF16 Standard (2 bytes/param)', hint: localize(state.language, 'Rango dinámico de bfloat16, estándar industrial moderno', 'bfloat16 dynamic range; modern industry standard') },
                      { id: 'int8', label: 'INT8 Quantized (1 byte/param)', hint: localize(state.language, 'Cuantización lineal a enteros; reduce VRAM a la mitad', 'Linear integer quantization; halves VRAM usage') },
                      { id: 'fp4', label: 'FP4 Microscaling (0.5 byte/param)', hint: localize(state.language, 'Microescalado de 4 bits para clusters ultra densos', '4-bit microscaling for high-density clusters') },
                      { id: 'ternary_1bit', label: 'BitNet 1.58-bit Ternary', hint: localize(state.language, 'Pesos discretos {-1, 0, +1}; suma sin multiplicaciones', 'Discrete weights {-1, 0, +1}; multiplication-free additions') }
                    ].map(q => {
                      const unlocked = isOptionUnlocked('quantization', q.id);
                      return (
                        <div
                          key={q.id}
                          role="button"
                          tabIndex={unlocked ? 0 : -1}
                          aria-disabled={!unlocked}
                          onClick={() => {
                            if (unlocked) handleQuantizationChange(q.id as QuantizationType);
                          }}
                          onKeyDown={(e) => {
                            if (unlocked && (e.key === 'Enter' || e.key === ' ')) {
                              e.preventDefault();
                              handleQuantizationChange(q.id as QuantizationType);
                            }
                          }}
                          className={`w-full text-left p-2.5 rounded-md border text-xs transition-colors ${
                            !unlocked
                              ? 'cursor-not-allowed opacity-40 theme-sub-bg theme-border mutating-text-muted'
                              : current.quantization === q.id
                              ? 'cursor-pointer theme-accent-soft theme-accent-border mutating-accent-text'
                              : 'cursor-pointer theme-sub-bg theme-border mutating-text-muted'
                          }`}
                        >
                          <div className="flex items-center justify-between">
                            <span className="font-medium theme-text">{q.label}</span>
                            <div className="flex items-center gap-1.5">
                              {QUANTIZATION_DOCS[q.id] && (
                                <DocLinkBadge doc={QUANTIZATION_DOCS[q.id]} language={state.language} />
                              )}
                              {!unlocked && <Lock className="h-3 w-3 mutating-text-muted" />}
                            </div>
                          </div>
                          <div className="text-[11px] mutating-text-muted mt-1">{q.hint}</div>
                        </div>
                      );
                    })}
                  </div>
                </div>

                {/* Attention Mechanism */}
                <div className="space-y-2 p-3.5 rounded-lg theme-sub-bg border theme-border">
                  <label className="text-xs font-semibold theme-text flex items-center justify-between">
                    <span>{localize(state.language, 'Mecanismo de Atención', 'Attention Mechanism')}</span>
                    <span className="text-[11px] mutating-text-muted font-mono">KV CACHE SPEED</span>
                  </label>
                  <div className="space-y-2">
                    {[
                      { id: 'standard_mha', label: 'Multi-Head Attention (MHA)', hint: localize(state.language, 'Atención canónica completa; complejidad cuadrática O(N²)', 'Canonical full attention; quadratic O(N²) memory') },
                      { id: 'grouped_query_gqa', label: 'Grouped-Query Attention (GQA)', hint: localize(state.language, 'Comparte claves/valores entre cabezas; reduce KV cache a 1/8', 'Shares keys/values across heads; 8x smaller KV cache') },
                      { id: 'flash_attention_3', label: 'FlashAttention-3', hint: localize(state.language, 'Tiling en SRAM de GPU; computación asíncrona FP8', 'GPU SRAM tiling with asynchronous FP8 tensor computation') },
                      { id: 'linear_attention', label: 'Linear Attention', hint: localize(state.language, 'Kernelización lineal O(N); escalabilidad extrema de contexto', 'Linear O(N) kernelization; extreme context scaling') }
                    ].map(att => {
                      const unlocked = isOptionUnlocked('attention', att.id);
                      return (
                        <div
                          key={att.id}
                          role="button"
                          tabIndex={unlocked ? 0 : -1}
                          aria-disabled={!unlocked}
                          onClick={() => {
                            if (unlocked) handleAttentionChange(att.id as AttentionType);
                          }}
                          onKeyDown={(e) => {
                            if (unlocked && (e.key === 'Enter' || e.key === ' ')) {
                              e.preventDefault();
                              handleAttentionChange(att.id as AttentionType);
                            }
                          }}
                          className={`w-full text-left p-2.5 rounded-md border text-xs transition-colors ${
                            !unlocked
                              ? 'cursor-not-allowed opacity-40 theme-sub-bg theme-border mutating-text-muted'
                              : current.attention === att.id
                              ? 'cursor-pointer theme-accent-soft theme-accent-border mutating-accent-text'
                              : 'cursor-pointer theme-sub-bg theme-border mutating-text-muted'
                          }`}
                        >
                          <div className="flex items-center justify-between">
                            <span className="font-medium theme-text">{att.label}</span>
                            <div className="flex items-center gap-1.5">
                              {ATTENTION_DOCS[att.id] && (
                                <DocLinkBadge doc={ATTENTION_DOCS[att.id]} language={state.language} />
                              )}
                              {!unlocked && <Lock className="h-3 w-3 mutating-text-muted" />}
                            </div>
                          </div>
                          <div className="text-[11px] mutating-text-muted mt-1">{att.hint}</div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              </div>
            )}

            {/* VRAM Budget & Allocation Gauge */}
            <div className="p-4 rounded-lg theme-sub-bg border theme-border space-y-3">
              <div className="flex items-center justify-between">
                <span className="text-xs font-semibold theme-text flex items-center gap-2">
                  <Database className="w-4 h-4 mutating-accent-text" />
                  {localize(state.language, 'Presupuesto de Memoria VRAM del Cluster', 'Cluster VRAM Memory Budget')}
                </span>
                <span className="text-xs font-mono font-medium mutating-text-muted">
                  {current.vramRequiredGb.toFixed(1)} GB / <strong className="theme-text">{totalClusterVram.toFixed(1)} GB</strong>
                </span>
              </div>

              {/* Progress bar */}
              <div className="h-2 w-full theme-raised-bg rounded-full overflow-hidden">
                <div 
                  className={`h-full transition-all duration-300 ${
                    isVramSufficient 
                      ? current.vramRequiredGb / totalClusterVram > 0.85 ? 'theme-warn-soft' : 'theme-accent-soft' 
                      : 'theme-btn-danger'
                  }`}
                  style={{ width: `${Math.min(100, totalClusterVram > 0 ? (current.vramRequiredGb / totalClusterVram) * 100 : 100)}%` }}
                />
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 text-xs pt-1 mutating-text-muted">
                <div className="p-2 rounded theme-sub-bg border theme-border">
                  <div className="text-[11px] mutating-text-muted font-medium">{localize(state.language, 'Memoria de Pesos', 'Weights Footprint')}</div>
                  <div className="theme-text font-mono mt-0.5">
                    {((current.parametersCount * (current.quantization === 'fp32' ? 4 : current.quantization === 'bf16' ? 2 : current.quantization === 'int8' ? 1 : current.quantization === 'fp4' ? 0.5 : 0.2)) / 1_000_000_000).toFixed(1)} GB
                  </div>
                </div>
                <div className="p-2 rounded theme-sub-bg border theme-border">
                  <div className="text-[11px] mutating-text-muted font-medium">{localize(state.language, 'Caché KV Contexto', 'Context KV-Cache')}</div>
                  <div className="theme-text font-mono mt-0.5">
                    {(current.contextWindow > 32000 ? (current.attention === 'grouped_query_gqa' ? 2.4 : 12.0) : 0.8).toFixed(1)} GB
                  </div>
                </div>
                <div className="p-2 rounded theme-sub-bg border theme-border">
                  <div className="text-[11px] mutating-text-muted font-medium">{localize(state.language, 'Margen de Activaciones', 'Activation Headroom')}</div>
                  <div className="theme-text font-mono mt-0.5">
                    {(current.vramRequiredGb * 0.15).toFixed(1)} GB (~15%)
                  </div>
                </div>
              </div>

              {!isVramSufficient && (
                <div className="p-2.5 rounded theme-danger-soft border theme-danger-border text-xs theme-danger-text flex items-center gap-2">
                  <AlertCircle className="w-4 h-4 theme-danger-text shrink-0" />
                  <span>
                    {localize(
                      state.language,
                      'Insuficiente VRAM. Reduce la escala de parámetros, baja la precisión a INT8/FP4 o instala GPUs adicionales en el Rack de Hardware.',
                      'Insufficient VRAM. Downscale parameters, quantize to INT8/FP4, or install additional GPUs in the Hardware Rack.'
                    )}
                  </span>
                </div>
              )}
            </div>
          </div>
        )}

        {/* Tab 3: Hyperparameters & Connected Pipelines */}
        {activeArchTab === 'training' && (
          <div className="space-y-4">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 pb-2 border-b theme-border">
              <div>
                <h3 className="text-sm font-semibold theme-text flex items-center gap-2">
                  <Sliders className="w-4 h-4 mutating-accent-text" />
                  {localize(state.language, 'Ventana de Contexto, Objetivos & Datos', 'Context Window, Objectives & Data Pipelines')}
                </h3>
                <p className="text-xs mutating-text-muted mt-0.5">
                  {localize(
                    state.language,
                    'Configura la longitud del contexto de entrada, la función de optimización y conecta pipelines de datos cognitivos.',
                    'Configure input context length, mathematical loss objective, and connect cognitive data pipelines.'
                  )}
                </p>
              </div>
            </div>

            {/* Context Window */}
            <div className="space-y-2 p-3.5 rounded-lg theme-sub-bg border theme-border">
              <label className="text-xs font-semibold theme-text flex items-center justify-between">
                <span className="flex items-center gap-1.5">
                  <Sparkles className="w-3.5 h-3.5 mutating-accent-text" />
                  {localize(state.language, 'Ventana de Contexto (Tokens)', 'Context Window (Tokens)')}
                </span>
                <span className="text-[11px] mutating-text-muted font-mono">TOKEN RETENTION</span>
              </label>
              <div className="flex flex-wrap gap-2">
                {contextPresets.map(ctx => {
                  const unlocked = isOptionUnlocked('contextWindow', ctx);
                  return (
                    <button
                      key={ctx}
                      disabled={!unlocked}
                      onClick={() => handleContextChange(ctx)}
                      className={`px-3 py-1.5 rounded-md text-xs font-mono font-medium border transition-colors disabled:cursor-not-allowed disabled:opacity-35 ${
                        current.contextWindow === ctx
                          ? 'theme-accent-soft theme-accent-border mutating-accent-text font-bold'
                          : 'theme-sub-bg theme-border mutating-text-muted'
                      }`}
                    >
                      {ctx >= 1_000_000 ? '1M tokens' : ctx >= 1000 ? `${ctx / 1000}k tokens` : `${ctx} tokens`}
                      {!unlocked && <Lock className="ml-1.5 inline h-3 w-3" />}
                    </button>
                  );
                })}
              </div>
              <p className="text-[11px] mutating-text-muted">
                {localize(
                  state.language,
                  'Ventanas de contexto expandidas permiten análisis multi-documento y memoria de agentes de largo plazo.',
                  'Expanded context windows enable multi-document synthesis and long-term agent task recall.'
                )}
              </p>
            </div>

            {/* Loss Function & Alignment Objective */}
            <div className="space-y-2 p-3.5 rounded-lg theme-sub-bg border theme-border">
              <label className="text-xs font-semibold theme-text flex items-center justify-between">
                <span>{localize(state.language, 'Función de Pérdida & Alineación', 'Loss Function & Alignment Objective')}</span>
                <span className="text-[11px] mutating-text-muted font-mono">OBJECTIVE GRADIENT</span>
              </label>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
                {[
                  { id: 'cross_entropy', label: 'Cross-Entropy Pretraining', hint: localize(state.language, 'Predicción canónica del siguiente token autoregresivo', 'Canonical autoregressive next-token prediction') },
                  { id: 'dpo', label: 'Direct Preference Optimization (DPO)', hint: localize(state.language, 'Alineación analítica sin modelo de recompensa separado', 'Direct analytical policy optimization without reward models') },
                  { id: 'ppo_rlhf', label: 'PPO / Reinforcement Learning', hint: localize(state.language, 'Optimización estocástica con retroalimentación humana', 'Stochastic policy optimization via human/AI feedback') },
                  { id: 'contrastive_infonce', label: 'Contrastive InfoNCE', hint: localize(state.language, 'Espacios latentes conjuntos para razonamiento multi-modal', 'Joint multimodal latent representations') },
                  { id: 'energy_based', label: 'Energy-Based Objective', hint: localize(state.language, 'Minimización de energía libre para dinámica AGI', 'Free-energy minimization for adaptive self-correcting agents') }
                ].map(loss => {
                  const unlocked = isOptionUnlocked('lossFunction', loss.id);
                  return (
                    <div
                      key={loss.id}
                      role="button"
                      tabIndex={unlocked ? 0 : -1}
                      aria-disabled={!unlocked}
                      onClick={() => {
                        if (unlocked) handleLossChange(loss.id as LossFunction);
                      }}
                      onKeyDown={(e) => {
                        if (unlocked && (e.key === 'Enter' || e.key === ' ')) {
                          e.preventDefault();
                          handleLossChange(loss.id as LossFunction);
                        }
                      }}
                      className={`w-full text-left p-2.5 rounded-md border text-xs transition-colors ${
                        !unlocked
                          ? 'cursor-not-allowed opacity-40 theme-sub-bg theme-border mutating-text-muted'
                          : current.lossFunction === loss.id
                          ? 'cursor-pointer theme-success-soft theme-success-border theme-success-text'
                          : 'cursor-pointer theme-sub-bg theme-border mutating-text-muted'
                      }`}
                    >
                      <div className="flex items-center justify-between">
                        <span className="font-medium theme-text">{loss.label}</span>
                        <div className="flex items-center gap-1.5">
                          {LOSS_DOCS[loss.id] && (
                            <DocLinkBadge doc={LOSS_DOCS[loss.id]} language={state.language} />
                          )}
                          {!unlocked && <Lock className="h-3 w-3 mutating-text-muted" />}
                        </div>
                      </div>
                      <div className="text-[11px] mutating-text-muted mt-1">{loss.hint}</div>
                    </div>
                  );
                })}
              </div>
            </div>

            {/* Connected Data Pipelines */}
            <div className="space-y-2 p-3.5 rounded-lg theme-sub-bg border theme-border">
              <label className="text-xs font-semibold theme-text flex items-center justify-between">
                <span className="flex items-center gap-1.5">
                  <Database className="w-3.5 h-3.5 mutating-accent-text" />
                  {localize(state.language, 'Pipelines de Datos Conectados al Modelo', 'Connected Cognitive Data Pipelines')}
                </span>
                <span className="text-[11px] mutating-text-muted font-mono">RETRIEVAL & SYNTHESIS</span>
              </label>
              <p className="text-xs mutating-text-muted">
                {localize(
                  state.language,
                  'Conecta motores de datos para enriquecer el entrenamiento. Grafos otorgan causalidad, vectores otorgan RAG y SQL otorga precisión transaccional.',
                  'Connect data engines to enrich training representations: knowledge graphs unlock causal reasoning, vectors provide RAG, and SQL provides structured factuality.'
                )}
              </p>
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-2.5 pt-1">
                {state.dataSources.map(ds => {
                  const displaySource = localizedDataSource(state.language, ds);
                  const isConnected = current.activeDataSources.includes(ds.id);
                  return (
                    <button
                      key={ds.id}
                      disabled={!ds.unlocked}
                      onClick={() => toggleDataSource(ds.id)}
                      className={`p-3 rounded-lg text-left border transition-all ${
                        !ds.unlocked 
                          ? 'opacity-40 theme-border theme-sub-bg cursor-not-allowed'
                          : isConnected 
                          ? 'theme-accent-soft theme-accent-border mutating-accent-text' 
                          : 'theme-sub-bg theme-border mutating-text-muted'
                      }`}
                    >
                      <div className="flex items-center justify-between text-xs font-semibold">
                        <span className="truncate">{displaySource.name.split(' (')[0]}</span>
                        {isConnected && <span className="mutating-accent-text text-[11px] font-mono">LINKED</span>}
                      </div>
                      <div className="text-[11px] theme-text mt-1">{displaySource.bonusAttribute}</div>
                      <div className="text-[11px] mutating-text-muted mt-1.5 font-mono">
                        {ds.unlocked
                          ? `${ds.tokensIndexed}M tokens · Lv.${ds.level}`
                          : localize(state.language, 'BLOQUEADO', 'LOCKED')}
                      </div>
                    </button>
                  );
                })}
              </div>
            </div>
          </div>
        )}

        {/* Tab 4: Inference Sampling & Evaluation */}
        {activeArchTab === 'sampling' && (
          <div className="space-y-4">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 pb-2 border-b theme-border">
              <div>
                <h3 className="text-sm font-semibold theme-text flex items-center gap-2">
                  <Sliders className="w-4 h-4 mutating-accent-text" />
                  {localize(state.language, 'Muestreo de Inferencia & Evaluación Cognitiva', 'Inference Sampling & Cognitive Evaluation')}
                </h3>
                <p className="text-xs mutating-text-muted mt-0.5">
                  {localize(
                    state.language,
                    'Calibra la estocasticidad de decodificación y revisa los benchmarks evaluados del modelo resultante.',
                    'Calibrate stochastic decoding parameters and inspect evaluated benchmark performance metrics.'
                  )}
                </p>
              </div>
            </div>

            {/* Model Evaluation Summary Card */}
            <div className="p-4 rounded-lg theme-sub-bg border theme-border space-y-3">
              <div className="flex items-center justify-between">
                <span className="text-xs font-semibold theme-text flex items-center gap-2">
                  <Sparkles className="w-4 h-4 theme-warn-text" />
                  {localize(state.language, 'Benchmarks Sintéticos del Modelo', 'Synthetic Model Benchmarks')}
                </span>
                <span className="text-[11px] mutating-text-muted font-mono">EVALUATION METRICS</span>
              </div>

              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                <div className="p-2.5 rounded theme-sub-bg border theme-border">
                  <div className="text-[11px] mutating-text-muted">{localize(state.language, 'Capacidad de Razonamiento', 'Reasoning Score')}</div>
                  <div className="text-lg font-bold font-mono mutating-accent-text mt-1">{Math.round(modelEvaluation.reasoning)}</div>
                  <div className="text-[11px] mutating-text-muted mt-0.5">MMLU / GSM8K</div>
                </div>

                <div className="p-2.5 rounded theme-sub-bg border theme-border">
                  <div className="text-[11px] mutating-text-muted">{localize(state.language, 'Fiabilidad & Seguridad', 'Reliability & Safety')}</div>
                  <div className="text-lg font-bold font-mono theme-success-text mt-1">{Math.round(modelEvaluation.reliability)}%</div>
                  <div className="text-[11px] mutating-text-muted mt-0.5">Hallucination Control</div>
                </div>

                <div className="p-2.5 rounded theme-sub-bg border theme-border">
                  <div className="text-[11px] mutating-text-muted">{localize(state.language, 'Especialización de Dominio', 'Specialization Index')}</div>
                  <div className="text-lg font-bold font-mono mutating-accent-text mt-1">{Math.round(modelEvaluation.specialization)}</div>
                  <div className="text-[11px] mutating-text-muted mt-0.5">Task Proficiency</div>
                </div>

                <div className="p-2.5 rounded theme-sub-bg border theme-border">
                  <div className="text-[11px] mutating-text-muted">{localize(state.language, 'Madurez de Datos', 'Data Readiness')}</div>
                  <div className="text-lg font-bold font-mono theme-warn-text mt-1">{Math.round(modelEvaluation.dataReadiness)}%</div>
                  <div className="text-[11px] mutating-text-muted mt-0.5">Pipeline Integration</div>
                </div>
              </div>
            </div>

            {/* Inference Parameters */}
            <div className="p-4 rounded-lg theme-sub-bg border theme-border space-y-3">
              <div className="flex items-center justify-between">
                <span className="text-xs font-semibold theme-text">
                  {t(state.language, 'inference_hyperparams')}
                </span>
                <span className="text-[11px] mutating-text-muted font-mono">TEMPERATURE & TOP-P SAMPLING</span>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
                {/* Temperature */}
                <div className="theme-sub-bg p-3 rounded-lg border theme-border">
                  <div className="flex justify-between items-center text-xs mb-1">
                    <span className="theme-text font-medium">{t(state.language, 'param_temperature')}:</span>
                    <span className="mutating-accent-text font-bold font-mono">{currentParams.temperature.toFixed(2)}</span>
                  </div>
                  <input
                    type="range"
                    min="0.0"
                    max="2.0"
                    step="0.05"
                    value={currentParams.temperature}
                    onChange={(e) => handleInferenceParamChange('temperature', parseFloat(e.target.value))}
                    className="w-full cursor-pointer"
                  />
                  <div className="text-[11px] mutating-text-muted mt-1.5">
                    {currentParams.temperature < 0.3
                      ? localize(state.language, 'Determinista (Argmax / Greedy)', 'Deterministic (Greedy decoding)')
                      : currentParams.temperature > 1.1
                      ? localize(state.language, 'Creativo / Exploratorio', 'High stochastic exploration')
                      : localize(state.language, 'Equilibrado para producción', 'Balanced production sampling')}
                  </div>
                </div>

                {/* Top-P */}
                <div className="theme-sub-bg p-3 rounded-lg border theme-border">
                  <div className="flex justify-between items-center text-xs mb-1">
                    <span className="theme-text font-medium">{t(state.language, 'param_top_p')}:</span>
                    <span className="mutating-accent-text font-bold font-mono">{currentParams.topP.toFixed(2)}</span>
                  </div>
                  <input
                    type="range"
                    disabled={!advancedSamplingUnlocked}
                    min="0.10"
                    max="1.00"
                    step="0.05"
                    value={currentParams.topP}
                    onChange={(e) => handleInferenceParamChange('topP', parseFloat(e.target.value))}
                    className="w-full cursor-pointer disabled:cursor-not-allowed disabled:opacity-40"
                  />
                  <div className="text-[11px] mutating-text-muted mt-1.5">{localize(state.language, 'Filtro de masa probabilística acumulada', 'Cumulative probability mass nucleus')}</div>
                </div>

                {/* Top-K */}
                <div className="theme-sub-bg p-3 rounded-lg border theme-border">
                  <div className="flex justify-between items-center text-xs mb-1">
                    <span className="theme-text font-medium">{t(state.language, 'param_top_k')}:</span>
                    <span className="theme-warn-text font-bold font-mono">{currentParams.topK}</span>
                  </div>
                  <input
                    type="range"
                    disabled={!advancedSamplingUnlocked}
                    min="1"
                    max="100"
                    step="1"
                    value={currentParams.topK}
                    onChange={(e) => handleInferenceParamChange('topK', parseInt(e.target.value))}
                    className="w-full cursor-pointer disabled:cursor-not-allowed disabled:opacity-40"
                  />
                  <div className="text-[11px] mutating-text-muted mt-1.5">{localize(state.language, 'Tamaño del vocabulario permitido', 'Permitted vocabulary token cutoff')}</div>
                </div>

                {/* Repetition Penalty */}
                <div className="theme-sub-bg p-3 rounded-lg border theme-border">
                  <div className="flex justify-between items-center text-xs mb-1">
                    <span className="theme-text font-medium">{t(state.language, 'param_repetition_penalty')}:</span>
                    <span className="theme-success-text font-bold font-mono">{currentParams.repetitionPenalty.toFixed(2)}x</span>
                  </div>
                  <input
                    type="range"
                    disabled={!advancedSamplingUnlocked}
                    min="1.00"
                    max="2.00"
                    step="0.05"
                    value={currentParams.repetitionPenalty}
                    onChange={(e) => handleInferenceParamChange('repetitionPenalty', parseFloat(e.target.value))}
                    className="w-full cursor-pointer disabled:cursor-not-allowed disabled:opacity-40"
                  />
                  <div className="text-[11px] mutating-text-muted mt-1.5">{localize(state.language, 'Penalización por repetición de n-gramas', 'N-gram frequency penalty factor')}</div>
                </div>
              </div>

              {!advancedSamplingUnlocked && (
                <div className="flex items-center gap-1.5 text-xs theme-warn-text pt-1">
                  <Lock className="h-3.5 w-3.5" />
                  <span>{localize(state.language, 'Top-P, Top-K y penalización se desbloquean tras investigar LoRA PEFT o en el día 30.', 'Top-P, Top-K, and repetition penalty unlock after researching LoRA PEFT or on day 30.')}</span>
                </div>
              )}
            </div>
          </div>
        )}
    </div>
  );
};
