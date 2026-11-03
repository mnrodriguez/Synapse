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
import { calculateTrainingProgressPerTick, estimateTrainingSeconds, formatTrainingDuration } from '../utils/training';
import { evaluateModelCapabilities } from '../utils/missionEvaluation';
import { getModelOptionRequirement, isProgressionUnlocked } from '../utils/progression';
import { DocLinkBadge } from './DocLinkBadge';

export const ArchitectureStudio: React.FC = () => {
  const {
    state,
    updateModelArchitecture,
    startTraining,
    cancelTraining,
    addLog,
    createModel,
    selectModel,
    renameModel
  } = useGame();
  const [newModelName, setNewModelName] = useState(`SYNAPSE-Model-${state.savedModels.length + 1}`);
  const [editingModelId, setEditingModelId] = useState<string | null>(null);
  const [editingModelName, setEditingModelName] = useState('');
  const current = state.currentModel;

  // Total cluster VRAM calculation
  const totalClusterVram = state.hardware.reduce((sum, h) => 
    h.category === 'gpu' ? sum + (h.vramGb * h.count) : sum, 0
  );

  const isVramSufficient = totalClusterVram >= current.vramRequiredGb;
  const agentComputeDemand = state.agents.filter(agent => agent.status !== 'quarantined').length * AGENT_COMPUTE_DEMAND_PFLOPS;
  const trainingProgressPerTick = calculateTrainingProgressPerTick({
    parametersCount: current.parametersCount,
    totalComputePflops: state.totalComputePflops,
    agentComputeDemand,
    reservedComputePflops: state.activeGig?.computePflopsRequired || 0,
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
    <div className="flex flex-col h-full bg-[#070b12] border border-cyan-900/40 rounded-lg p-3 overflow-y-auto space-y-4 font-mono scrollbar-thin scrollbar-thumb-cyan-950">
      {/* Studio Header */}
      <div className="flex flex-wrap items-center justify-between gap-2 border-b border-cyan-900/40 pb-2">
        <div className="flex items-center gap-2">
          <Layers className="w-4 h-4 text-cyan-400" />
          <h2 className="text-sm font-bold text-cyan-300 tracking-wider">
            {localize(state.language, 'ESTUDIO DE ARQUITECTURA NEURONAL // TOPOLOGÍA', 'NEURAL ARCHITECTURE STUDIO // TOPOLOGY')}
          </h2>
        </div>

        {/* Action button */}
        {state.activeTraining ? (
          <button
            onClick={cancelTraining}
            className="flex items-center gap-1.5 px-3 py-1 bg-red-950/60 hover:bg-red-900 border border-red-500/60 text-red-300 rounded text-xs transition-colors"
          >
            <AlertCircle className="w-3.5 h-3.5" />
            <span>{localize(state.language, 'ABORTAR ENTRENAMIENTO', 'ABORT TRAINING')}</span>
          </button>
        ) : (
          <button
            onClick={() => startTraining(current.trainedOnDatasetId, current.modelType === 'micro_model')}
            disabled={!isVramSufficient || state.powerTripSeconds > 0 || state.detentionSeconds > 0}
            className={`flex items-center gap-1.5 px-3.5 py-1.5 rounded text-xs font-bold transition-all shadow-[0_0_15px_rgba(0,255,200,0.2)] ${
              isVramSufficient && state.powerTripSeconds === 0 && state.detentionSeconds === 0
                ? 'bg-cyan-500 hover:bg-cyan-400 text-zinc-950 cursor-pointer' 
                : 'bg-zinc-800 text-zinc-500 border border-zinc-700 cursor-not-allowed'
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

      <section className="space-y-2 rounded border border-cyan-900/50 bg-[#09111c] p-2.5">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <div>
            <h3 className="text-xs font-bold tracking-wider text-cyan-300">{t(state.language, 'model_library')}</h3>
            <p className="text-[10px] text-zinc-500">{t(state.language, 'model_library_desc')}</p>
          </div>
          <form onSubmit={handleCreateModel} className="flex gap-1.5">
            <input
              aria-label={t(state.language, 'model_name')}
              value={newModelName}
              onChange={event => setNewModelName(event.target.value)}
              maxLength={40}
              disabled={!!state.activeTraining}
              className="w-40 rounded border border-zinc-700 bg-zinc-950 px-2 py-1 text-[10px] text-zinc-200 outline-none focus:border-cyan-500 disabled:opacity-50"
            />
            <button
              type="submit"
              disabled={!!state.activeTraining || state.credits < 100}
              className="rounded border border-cyan-700 bg-cyan-950 px-2 py-1 text-[10px] font-bold text-cyan-300 hover:bg-cyan-900 disabled:cursor-not-allowed disabled:opacity-40"
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
              className={`flex items-center gap-1 rounded border px-2 py-1 text-[10px] ${
                current.id === model.id
                  ? 'border-cyan-500 bg-cyan-950/60 text-cyan-200'
                  : 'border-zinc-800 bg-zinc-950 text-zinc-400'
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
                    className="w-32 bg-zinc-950 px-1 text-[10px] outline-none"
                  />
                  <button type="submit" aria-label={t(state.language, 'save_name')} className="text-emerald-400"><Check className="h-3 w-3" /></button>
                  <button type="button" aria-label={t(state.language, 'cancel')} onClick={() => setEditingModelId(null)} className="text-zinc-500"><X className="h-3 w-3" /></button>
                </form>
              ) : (
                <>
                  <button
                    type="button"
                    disabled={!!state.activeTraining}
                    onClick={() => selectModel(model.id)}
                    className="max-w-48 truncate text-left disabled:cursor-not-allowed"
                    title={`${model.name} · IQ ${model.reasoningScore}`}
                  >
                    {model.name} <span className="text-zinc-500">· IQ {model.reasoningScore}</span>
                  </button>
                  <button
                    type="button"
                    aria-label={`${t(state.language, 'rename_model')} ${model.name}`}
                    onClick={() => {
                      setEditingModelId(model.id);
                      setEditingModelName(model.name);
                    }}
                    className="ml-1 text-zinc-500 hover:text-cyan-300"
                  >
                    <Pencil className="h-3 w-3" />
                  </button>
                </>
              )}
            </div>
          ))}
        </div>
      </section>

      {/* Educational Guidance Card for Beginner & Normal Modes */}
      {state.difficulty !== 'engineer' && (
        <section className="p-3 bg-purple-950/30 border border-purple-500/50 rounded-lg space-y-1.5 font-mono text-purple-200">
          <div className="flex items-center gap-2 font-bold text-xs text-purple-300">
            <Sparkles className="w-4 h-4 text-purple-400" />
            <span>
              {localize(state.language, 'GUÍA EDUCATIVA // ¿CÓMO SE ENTRENA Y CONFIGURA UN MODELO DE IA?', 'EDUCATIONAL GUIDE // HOW TO DESIGN & TRAIN AN AI MODEL')}
            </span>
          </div>
          <p className="text-[11px] leading-relaxed text-zinc-300">
            {localize(
              state.language,
              'Entrenar una IA consiste en procesar millones de palabras (tokens) de un dataset para ajustar sus conexiones neuronales (parámetros). Cuantos más parámetros tiene el modelo, mayor es su capacidad de razonamiento (IQ), pero exigirá más memoria VRAM en tus GPUs y más refrigeración.',
              'Training an AI means processing millions of dataset tokens to refine its neural weights (parameters). Models with more parameters achieve higher reasoning IQ, but require more GPU VRAM and active cooling capacity.'
            )}
          </p>
          <div className="flex flex-wrap gap-2 text-[10px] pt-1 text-purple-300 font-bold">
            <span className="px-2 py-0.5 rounded bg-purple-900/60 border border-purple-500/40">
              💡 {localize(state.language, `Dificultad ${state.difficulty.toUpperCase()}: Micro-parámetros optimizados automáticamente`, `Difficulty ${state.difficulty.toUpperCase()}: Micro-parameters automatically optimized`)}
            </span>
            <span className="px-2 py-0.5 rounded bg-cyan-950/60 border border-cyan-500/40 text-cyan-300">
              ⚡ {localize(state.language, 'Recompensas de misiones ajustadas', 'Mission rewards adjusted')}
            </span>
          </div>
        </section>
      )}

      {/* Model Spec Card */}
      <div className="grid grid-cols-2 sm:grid-cols-5 gap-2 bg-[#09111c] border border-cyan-900/50 p-2.5 rounded text-xs">
        <div>
          <span className="text-zinc-500 text-[10px] block">{t(state.language, 'base_model')}</span>
          <span className="text-cyan-300 font-bold">{current.name}</span>
        </div>
        <div>
          <span className="text-zinc-500 text-[10px] block">{t(state.language, 'parameters')}</span>
          <span className="text-yellow-300 font-bold">
            {current.parametersCount >= 1_000_000_000
              ? `${(current.parametersCount / 1_000_000_000).toFixed(1)}B`
              : `${(current.parametersCount / 1_000_000).toFixed(0)}M`}
          </span>
        </div>
        <div>
          <span className="text-zinc-500 text-[10px] block">{t(state.language, 'required_vram')}</span>
          <span className={`font-bold ${isVramSufficient ? 'text-emerald-400' : 'text-red-400'}`}>
            {current.vramRequiredGb} GB / {totalClusterVram} GB {isVramSufficient ? '✓' : '(OOM!)'}
          </span>
        </div>
        <div>
          <span className="text-zinc-500 text-[10px] block">{localize(state.language, 'BENCHMARK INTELECTUAL', 'REASONING BENCHMARK')}</span>
          <span className="text-purple-300 font-bold">IQ {current.reasoningScore} pts</span>
          {current.modelType === 'micro_model' && (
            <span className="text-[10px] text-purple-400 block font-bold">
              +{Math.round(((current.domainProficiency || 1.5) - 1) * 100)}% {current.specializedDomain?.toUpperCase()}
            </span>
          )}
        </div>
        <div>
          <span className="text-zinc-500 text-[10px] block">{localize(state.language, 'PREDICCIÓN CON HARDWARE ACTUAL', 'PREDICTION WITH CURRENT HW')}</span>
          <span className="text-emerald-300 font-bold block">
            {estimatedTrainingSeconds === null
              ? localize(state.language, 'Sin cómputo disponible', 'No compute available')
              : `${(estimatedTrainingSeconds / 48).toFixed(1)} ${localize(state.language, 'días de simulación', 'in-game days')}`}
          </span>
          <span className="text-[10px] text-zinc-400 font-mono block">
            {estimatedTrainingSeconds === null
              ? ''
              : `(~${formatTrainingDuration(estimatedTrainingSeconds / estimateSpeed)} @ ${estimateSpeed}x)`}
          </span>
          {state.gameSpeed === 0 && (
            <span className="text-[9px] text-yellow-500 block">{localize(state.language, 'Simulación pausada', 'Simulation paused')}</span>
          )}
        </div>
      </div>

      <section className="rounded border border-purple-900/50 bg-purple-950/10 p-2.5">
        <div className="mb-2 flex items-center justify-between gap-2">
          <h3 className="text-[11px] font-bold tracking-wider text-purple-200">
            {localize(state.language, 'EVALUACIÓN IA DEL MODELO', 'AI MODEL EVALUATION')}
          </h3>
          <span className="text-[10px] font-bold text-purple-300">
            {localize(state.language, 'APTITUD GLOBAL', 'OVERALL FIT')}: {modelEvaluation.overall}/100
          </span>
        </div>
        <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
          {[
            { label: localize(state.language, 'Razonamiento', 'Reasoning'), score: modelEvaluation.reasoning },
            { label: localize(state.language, 'Especialización', 'Specialization'), score: modelEvaluation.specialization },
            { label: localize(state.language, 'Datos', 'Data readiness'), score: modelEvaluation.dataReadiness },
            { label: localize(state.language, 'Fiabilidad', 'Reliability'), score: modelEvaluation.reliability }
          ].map(quality => (
            <div key={quality.label} className="rounded bg-[#080d16] px-2 py-1.5">
              <div className="flex justify-between gap-1 text-[10px] text-zinc-400">
                <span>{quality.label}</span>
                <span className="font-bold text-cyan-300">{quality.score}</span>
              </div>
              <div className="mt-1 h-1 overflow-hidden rounded bg-zinc-900">
                <div className="h-full rounded bg-purple-400" style={{ width: `${quality.score}%` }} />
              </div>
            </div>
          ))}
        </div>
        <p className="mt-1.5 text-[9px] text-zinc-500">
          {localize(state.language, 'La aptitud se estima con arquitectura, entrenamiento, hiperparámetros y fuentes de datos; influye en la probabilidad de éxito de las misiones.', 'Fit is estimated from architecture, training, sampling settings, and data sources; it contributes to mission success probability.')}
        </p>
      </section>

      {/* Section 0: Dataset Baseline & Micro-Model Specialization */}
      <section className="space-y-2 rounded border border-cyan-800/60 bg-[#080f1a] p-3 font-mono">
        <div className="flex flex-wrap items-center justify-between gap-2 border-b border-cyan-900/40 pb-1.5">
          <div className="flex items-center gap-1.5">
            <Database className="w-4 h-4 text-cyan-400" />
            <h3 className="text-xs font-bold tracking-wider text-cyan-300">
              {localize(state.language, 'ESPECIALIZACIÓN Y CORPUS DE ENTRENAMIENTO // BASELINE GENERAL VS MICRO-MODELOS', 'TRAINING DATASET & SPECIALIZATION // GENERAL BASELINE VS MICRO-MODELS')}
            </h3>
          </div>
          <span className="text-[10px] text-zinc-400">
            {current.modelType === 'micro_model'
              ? localize(state.language, `MODO: MICRO-MODELO (${current.specializedDomain?.toUpperCase()})`, `MODE: MICRO-MODEL (${current.specializedDomain?.toUpperCase()})`)
              : localize(state.language, 'MODO: MODELO GENERAL (INFORMACIÓN AMPLIA)', 'MODE: GENERAL MODEL (BROAD SPECTRUM)')}
          </span>
        </div>

        <p className="text-[11px] text-zinc-400 leading-snug">
          {state.language === 'en'
            ? <>Initial AI training defaults to the <strong className="text-cyan-300">General Information baseline</strong> for balanced, broad-spectrum progression. Unlock the <strong className="text-cyan-300">Data Scraping Module</strong> in Data Engines to generate specialized domain datasets (Cybersecurity, Astrophysics, Finance, Bioinformatics, Robotics) and train high-velocity <strong className="text-purple-300">Micro-Models</strong>.</>
            : <>El entrenamiento inicial predetermina el <strong className="text-cyan-300">baseline de Información General</strong> para un avance equilibrado. Desbloquea el <strong className="text-cyan-300">Módulo de Scraping</strong> en Motores de Datos para sintetizar datasets especializados y entrenar <strong className="text-purple-300">Micro-Modelos</strong> ultrarrápidos.</>}
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
                      ? 'bg-cyan-950/70 border-cyan-400 text-cyan-200 shadow-[0_0_10px_rgba(0,255,200,0.15)]'
                      : 'bg-purple-950/70 border-purple-400 text-purple-200 shadow-[0_0_10px_rgba(168,85,247,0.2)]'
                    : 'bg-zinc-950/60 border-zinc-800 text-zinc-400 hover:border-zinc-700 hover:text-zinc-300'
                }`}
              >
                <div className="flex items-center justify-between text-xs font-bold">
                  <span className="truncate">{dataset.name}</span>
                  {isSelected && (
                    <span className="text-[10px] text-cyan-400 font-mono">
                      ✓ {localize(state.language, 'ACTIVO', 'ACTIVE')}
                    </span>
                  )}
                </div>
                <div className="flex items-center gap-2 text-[10px] mt-1 text-zinc-400">
                  <span className={`px-1.5 py-0.2 rounded text-[9px] font-bold ${
                    isGeneral ? 'bg-cyan-950 text-cyan-300 border border-cyan-800' : 'bg-purple-950 text-purple-300 border border-purple-800'
                  }`}>
                    {isGeneral ? 'GENERAL T1' : `SPECIALIST T${dataset.tier}`}
                  </span>
                  <span>{dataset.tokensCount}M tok</span>
                  <span>{dataset.qualityScore}% {localize(state.language, 'pureza', 'purity')}</span>
                </div>
                <p className="text-[10px] text-zinc-500 mt-1 line-clamp-2 leading-tight">
                  {dataset.description}
                </p>
                {!isGeneral && (
                  <div className="mt-1 text-[9px] text-emerald-400 font-bold">
                    +{Math.round(((1.4 + dataset.tier * 0.3) - 1) * 100)}% {localize(state.language, 'Pericia en contratos de', 'Proficiency in')} {dataset.domainLabel}
                  </div>
                )}
              </button>
            );
          })}
        </div>

        {!state.isDataScrapingUnlocked && (
          <div className="rounded border border-amber-900/60 bg-amber-950/20 p-2 text-xs flex items-center justify-between gap-2">
            <span className="text-[11px] text-amber-300">
              {localize(
                state.language,
                'Módulo de Scraping Bloqueado: Entrena tu modelo general a IQ ≥ 80 para desbloquear la generación de datasets especializados en la pestaña "Datos & Grafos".',
                'Data Scraping Locked: Level your general model to Reasoning IQ ≥ 80 to unlock custom specialized datasets in the "Data & Graphs" tab.'
              )}
            </span>
          </div>
        )}
      </section>

      {/* Section 1: Topology selection */}
      <div className="space-y-1.5">
        <label className="text-xs text-zinc-400 font-bold flex items-center gap-1.5">
          <Cpu className="w-3.5 h-3.5 text-cyan-400" />
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
                  ? 'cursor-not-allowed opacity-45 bg-zinc-900/40 border-zinc-800 text-zinc-500'
                  : current.topology === top.id
                  ? 'cursor-pointer bg-cyan-950/70 border-cyan-400 text-cyan-200 shadow-[0_0_10px_rgba(0,255,200,0.15)]'
                  : 'cursor-pointer bg-zinc-900/60 border-zinc-800 text-zinc-400 hover:border-zinc-700 hover:text-zinc-300'
              }`}
            >
              <div className="font-bold text-xs flex items-center justify-between">
                <span>{top.name.split(' (')[0]}</span>
                <div className="flex items-center gap-1">
                  {TOPOLOGY_DOCS[top.id] && (
                    <DocLinkBadge doc={TOPOLOGY_DOCS[top.id]} language={state.language} />
                  )}
                  {!unlocked && <Lock className="h-3 w-3 text-zinc-500" />}
                  {current.topology === top.id && <CheckCircle2 className="w-3 h-3 text-cyan-400" />}
                </div>
              </div>
              <p className="text-[10px] text-zinc-500 mt-1 leading-snug">{top.desc}</p>
            </div>
              );
            })()
          ))}
        </div>
      </div>

      {/* Section 2: Scale of parameters & Context */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        {/* Parameters scale */}
        <div className="space-y-1.5">
          <label className="text-xs text-zinc-400 font-bold flex items-center gap-1.5">
            <Sliders className="w-3.5 h-3.5 text-yellow-400" />
            {localize(state.language, 'ESCALA DE PARÁMETROS (CAPACIDAD COGNITIVA)', 'PARAMETER SCALE (COGNITIVE CAPACITY)')}
          </label>
          <div className="flex flex-wrap gap-1.5">
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
                className={`px-2.5 py-1 rounded text-xs font-mono font-bold border transition-colors disabled:cursor-not-allowed disabled:opacity-35 ${
                  current.parametersCount === preset.value
                    ? 'bg-yellow-950/60 border-yellow-400 text-yellow-300'
                    : 'bg-zinc-900/80 border-zinc-800 text-zinc-400 hover:border-zinc-700'
                }`}
              >
                {preset.label} {!unlocked && <Lock className="ml-1 inline h-3 w-3" />}
              </button>
                );
              })()
            ))}
          </div>
          <p className="text-[10px] text-zinc-500">
            {localize(state.language, 'Modelos mayores requieren más VRAM y FLOPs, pero desbloquean contratos de alto valor y aceleran la Singularidad.', 'Larger models require more VRAM and FLOPs but unlock higher-value contracts and advance the Singularity.')}
          </p>
        </div>

        {/* Context Window */}
        <div className="space-y-1.5">
          <label className="text-xs text-zinc-400 font-bold flex items-center gap-1.5">
            <Sparkles className="w-3.5 h-3.5 text-purple-400" />
            {localize(state.language, 'VENTANA DE CONTEXTO (TOKENS)', 'CONTEXT WINDOW (TOKENS)')}
          </label>
          <div className="flex flex-wrap gap-1.5">
            {contextPresets.map(ctx => (
              (() => {
                const unlocked = isOptionUnlocked('contextWindow', ctx);
                return (
              <button
                key={ctx}
                disabled={!unlocked}
                onClick={() => handleContextChange(ctx)}
                className={`px-2 py-1 rounded text-xs font-mono border transition-colors disabled:cursor-not-allowed disabled:opacity-35 ${
                  current.contextWindow === ctx
                    ? 'bg-purple-950/60 border-purple-400 text-purple-300 font-bold'
                    : 'bg-zinc-900/80 border-zinc-800 text-zinc-400 hover:border-zinc-700'
                }`}
              >
                {ctx >= 1_000_000 ? '1M' : ctx >= 1000 ? `${ctx / 1000}k` : ctx}
                {!unlocked && <Lock className="ml-1 inline h-3 w-3" />}
              </button>
                );
              })()
            ))}
          </div>
          <p className="text-[10px] text-zinc-500">
            {localize(state.language, 'Ventanas grandes consumen caché KV exponencialmente a menos que uses RoPE o FlashAttention.', 'Large context windows increase KV-cache memory use; RoPE and FlashAttention can help.')}
          </p>
        </div>
      </div>

      {/* Section 3: Quantization & Attention & Loss */}
      {isBeginner ? (
        <div className="p-3 rounded bg-[#080d16] border border-purple-900/50 text-xs space-y-2 font-mono">
          <div className="font-bold text-purple-300 flex items-center gap-1.5">
            <Sparkles className="w-3.5 h-3.5 text-purple-400" />
            <span>{localize(state.language, 'HIPERPARÁMETROS AUTOMATIZADOS (MODO PRINCIPIANTE)', 'AUTOMATED HYPERPARAMETERS (BEGINNER MODE)')}</span>
          </div>
          <p className="text-[10px] text-zinc-400">
            {localize(state.language, 'En modo Principiante, la precisión matemática, la atención y la función de pérdida se configuran automáticamente con valores óptimos para garantizar estabilidad.', 'In Beginner mode, quantization, attention mechanism, and loss function are automatically set to stable, optimal defaults.')}
          </p>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-2 text-[10px] pt-1">
            <div className="p-2 rounded bg-zinc-950 border border-zinc-800">
              <span className="text-zinc-500 block font-bold">{localize(state.language, 'CUANTIZACIÓN:', 'QUANTIZATION:')}</span>
              <span className="font-bold text-cyan-300">INT8 Quantized (1 byte/param)</span>
              <span className="text-zinc-500 block text-[9px] mt-0.5">{localize(state.language, 'Balance ideal de memoria VRAM', 'Ideal VRAM balance')}</span>
            </div>
            <div className="p-2 rounded bg-zinc-950 border border-zinc-800">
              <span className="text-zinc-500 block font-bold">{localize(state.language, 'ATENCIÓN:', 'ATTENTION:')}</span>
              <span className="font-bold text-purple-300">Standard MHA / FlashAttention</span>
              <span className="text-zinc-500 block text-[9px] mt-0.5">{localize(state.language, 'Procesamiento de contexto estable', 'Stable context processing')}</span>
            </div>
            <div className="p-2 rounded bg-zinc-950 border border-zinc-800">
              <span className="text-zinc-500 block font-bold">{localize(state.language, 'FUNCIÓN DE PÉRDIDA:', 'LOSS FUNCTION:')}</span>
              <span className="font-bold text-yellow-300">Cross-Entropy Loss</span>
              <span className="text-zinc-500 block text-[9px] mt-0.5">{localize(state.language, 'Convergencia rápida y predecible', 'Predictable fast convergence')}</span>
            </div>
          </div>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
          {/* Quantization */}
          <div className="space-y-1.5">
            <label className="text-xs text-zinc-400 font-bold">{t(state.language, 'quantization')}</label>
            <div className="space-y-1">
              {[
                { id: 'fp32', label: 'FP32 Full (4 bytes/param)', hint: localize(state.language, 'Precisión pura, máxima VRAM', 'Full precision; maximum VRAM') },
                { id: 'bf16', label: 'BF16 Standard (2 bytes/param)', hint: localize(state.language, 'Rango dinámico de bfloat16', 'bfloat16 dynamic range') },
                { id: 'int8', label: 'INT8 Quantized (1 byte/param)', hint: localize(state.language, 'Ideal para GPUs GTX / RTX', 'Suitable for GTX / RTX GPUs') },
                { id: 'fp4', label: 'FP4 Blackwell (0.5 byte/param)', hint: localize(state.language, 'Ultra-comprimido para 70B+', 'Ultra-compressed for 70B+') },
                { id: 'ternary_1bit', label: 'BitNet 1.58-bit Ternary', hint: localize(state.language, 'Solo {-1, 0, +1}, mínimo consumo', 'Only {-1, 0, +1}; minimal memory use') }
              ].map(q => (
                (() => {
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
                  className={`w-full text-left p-1.5 rounded border text-xs transition-colors ${
                    !unlocked
                      ? 'cursor-not-allowed opacity-40 bg-zinc-900/40 border-zinc-800 text-zinc-500'
                      : current.quantization === q.id
                      ? 'cursor-pointer bg-cyan-950/70 border-cyan-400 text-cyan-200'
                      : 'cursor-pointer bg-zinc-900/60 border-zinc-800 text-zinc-400 hover:text-zinc-200'
                  }`}
                >
                  <div className="flex items-center justify-between">
                    <div className="font-semibold">{q.label}</div>
                    {QUANTIZATION_DOCS[q.id] && (
                      <DocLinkBadge doc={QUANTIZATION_DOCS[q.id]} language={state.language} />
                    )}
                    {!unlocked && <Lock className="h-3 w-3 text-zinc-500" />}
                  </div>
                  <div className="text-[9px] text-zinc-500">{q.hint}</div>
                </div>
                  );
                })()
              ))}
            </div>
          </div>

          {/* Attention Mechanism */}
          <div className="space-y-1.5">
            <label className="text-xs text-zinc-400 font-bold">{localize(state.language, 'MECANISMO DE ATENCIÓN', 'ATTENTION MECHANISM')}</label>
            <div className="space-y-1">
              {[
                { id: 'standard_mha', label: 'Multi-Head Attention (MHA)', hint: localize(state.language, 'Atención tradicional dot-product', 'Traditional dot-product attention') },
                { id: 'grouped_query_gqa', label: 'Grouped-Query (GQA)', hint: localize(state.language, 'Reduce tamaño de KV cache a 1/8', 'Reduces KV-cache size to 1/8') },
                { id: 'flash_attention_3', label: 'FlashAttention-3', hint: localize(state.language, 'Tiling en SRAM, velocidad x2', 'SRAM tiling; up to 2x speed') },
                { id: 'linear_attention', label: 'Linear Attention', hint: localize(state.language, 'Kernelización de baja complejidad', 'Low-complexity kernelization') }
              ].map(att => (
                (() => {
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
                  className={`w-full text-left p-1.5 rounded border text-xs transition-colors ${
                    !unlocked
                      ? 'cursor-not-allowed opacity-40 bg-zinc-900/40 border-zinc-800 text-zinc-500'
                      : current.attention === att.id
                      ? 'cursor-pointer bg-purple-950/70 border-purple-400 text-purple-200'
                      : 'cursor-pointer bg-zinc-900/60 border-zinc-800 text-zinc-400 hover:text-zinc-200'
                  }`}
                >
                  <div className="flex items-center justify-between">
                    <div className="font-semibold">{att.label}</div>
                    {ATTENTION_DOCS[att.id] && (
                      <DocLinkBadge doc={ATTENTION_DOCS[att.id]} language={state.language} />
                    )}
                    {!unlocked && <Lock className="h-3 w-3 text-zinc-500" />}
                  </div>
                  <div className="text-[9px] text-zinc-500">{att.hint}</div>
                </div>
                  );
                })()
              ))}
            </div>
          </div>

          {/* Loss & Alignment Objective */}
          <div className="space-y-1.5">
            <label className="text-xs text-zinc-400 font-bold">{localize(state.language, 'FUNCIÓN DE PÉRDIDA Y ALINEACIÓN', 'LOSS & ALIGNMENT OBJECTIVE')}</label>
            <div className="space-y-1">
              {[
                { id: 'cross_entropy', label: 'Cross-Entropy Pretraining', hint: localize(state.language, 'Predicción del siguiente token estándar', 'Standard next-token prediction') },
                { id: 'dpo', label: 'Direct Preference Optimization (DPO)', hint: localize(state.language, 'Alineación analítica sin modelo de recompensa', 'Analytical alignment without a reward model') },
                { id: 'ppo_rlhf', label: 'PPO / Reinforcement Learning', hint: localize(state.language, 'Optimización de política con retroalimentación', 'Policy optimization with feedback') },
                { id: 'contrastive_infonce', label: 'Contrastive InfoNCE', hint: localize(state.language, 'Representaciones latentes conjuntas', 'Joint latent representations') },
                { id: 'energy_based', label: 'Energy-Based Objective', hint: localize(state.language, 'Minimización de energía libre del sistema', 'System free-energy minimization') }
              ].map(loss => (
                (() => {
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
                  className={`w-full text-left p-1.5 rounded border text-xs transition-colors ${
                    !unlocked
                      ? 'cursor-not-allowed opacity-40 bg-zinc-900/40 border-zinc-800 text-zinc-500'
                      : current.lossFunction === loss.id
                      ? 'cursor-pointer bg-emerald-950/70 border-emerald-400 text-emerald-200'
                      : 'cursor-pointer bg-zinc-900/60 border-zinc-800 text-zinc-400 hover:text-zinc-200'
                  }`}
                >
                  <div className="flex items-center justify-between">
                    <div className="font-semibold">{loss.label}</div>
                    {LOSS_DOCS[loss.id] && (
                      <DocLinkBadge doc={LOSS_DOCS[loss.id]} language={state.language} />
                    )}
                    {!unlocked && <Lock className="h-3 w-3 text-zinc-500" />}
                  </div>
                  <div className="text-[9px] text-zinc-500">{loss.hint}</div>
                </div>
                  );
                })()
              ))}
            </div>
          </div>
        </div>
      )}

      {/* Section 4: Connected Data Pipelines (User requested: Graph, Vector, SQL) */}
      <div className="space-y-1.5 bg-[#080e18] border border-cyan-900/40 p-3 rounded">
        <label className="text-xs text-zinc-300 font-bold flex items-center gap-1.5">
          <Database className="w-3.5 h-3.5 text-cyan-400" />
          {localize(state.language, 'PIPELINES DE DATOS CONECTADOS AL MODELO', 'DATA PIPELINES CONNECTED TO MODEL')}
        </label>
        <p className="text-[11px] text-zinc-400">
          {localize(state.language, 'Haz clic para conectar o desconectar fuentes de datos. Cada motor añade capacidades cognitivas únicas (deducción causal con grafos, RAG con vectores y transacciones con SQL).', 'Connect or disconnect data sources. Each engine adds distinct capabilities (causal graph reasoning, vector RAG, and SQL transactions).')}
        </p>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-2 mt-2">
          {state.dataSources.map(ds => {
            const displaySource = localizedDataSource(state.language, ds);
            const isConnected = current.activeDataSources.includes(ds.id);
            return (
              <button
                key={ds.id}
                disabled={!ds.unlocked}
                onClick={() => toggleDataSource(ds.id)}
                className={`p-2 rounded text-left border transition-all ${
                  !ds.unlocked 
                    ? 'opacity-40 border-zinc-800 bg-zinc-950 cursor-not-allowed'
                    : isConnected 
                    ? 'bg-cyan-950/60 border-cyan-400 text-cyan-200 shadow-[0_0_8px_rgba(0,255,200,0.15)]' 
                    : 'bg-zinc-900/60 border-zinc-800 text-zinc-500 hover:border-zinc-700 hover:text-zinc-300'
                }`}
              >
                <div className="flex items-center justify-between text-xs font-bold">
                  <span className="truncate">{displaySource.name.split(' (')[0]}</span>
                  {isConnected && <span className="text-cyan-400 text-[10px]">{localize(state.language, 'CONECTADO', 'CONNECTED')}</span>}
                </div>
                <div className="text-[10px] text-zinc-400 mt-1">{displaySource.bonusAttribute}</div>
                <div className="text-[9px] text-zinc-500 mt-1">
                  {ds.unlocked
                    ? `${localize(state.language, 'Tokens', 'Tokens')}: ${ds.tokensIndexed}M | ${localize(state.language, 'Nivel', 'Level')} ${ds.level}`
                    : localize(state.language, 'BLOQUEADO (Desplegar en Motor de Datos)', 'LOCKED (Deploy in Data Engines)')}
                </div>
              </button>
            );
          })}
        </div>
      </div>

      {/* Section 5: Default Inference & Sampling Hyperparameters for this Architecture */}
      <div className="space-y-2 bg-[#080e18] border border-cyan-900/40 p-3 rounded">
        <div className="flex items-center justify-between pb-1.5 border-b border-cyan-900/30">
          <label className="text-xs text-zinc-300 font-bold flex items-center gap-1.5">
            <Sliders className="w-3.5 h-3.5 text-cyan-400" />
            <span>{t(state.language, 'inference_hyperparams')} ({localize(state.language, 'DEFAULT DEL MODELO', 'MODEL DEFAULTS')})</span>
          </label>
          <span className="text-[10px] text-zinc-400 font-mono">{localize(state.language, 'CALIBRACIÓN ESTOCÁSTICA', 'SAMPLING CALIBRATION')}</span>
        </div>

        <p className="text-[11px] text-zinc-400">
          {state.language === 'es'
            ? 'Define los parámetros por defecto con los que los agentes y contratos instancian este modelo. Puedes sobrescribirlos al desplegar cada agente.'
            : 'Configure the default inference parameters applied when agents or contracts spin up this model. Overridable per agent instance.'}
        </p>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 mt-2">
          {/* Temperature */}
          <div className="bg-zinc-950/70 p-2.5 rounded border border-zinc-800">
            <div className="flex justify-between items-center text-xs mb-1">
              <span className="text-zinc-300 font-bold">{t(state.language, 'param_temperature')}:</span>
              <span className="text-cyan-300 font-bold font-mono">{currentParams.temperature.toFixed(2)}</span>
            </div>
            <input
              type="range"
              min="0.0"
              max="2.0"
              step="0.05"
              value={currentParams.temperature}
              onChange={(e) => handleInferenceParamChange('temperature', parseFloat(e.target.value))}
              className="w-full accent-cyan-400 cursor-pointer"
            />
            <div className="text-[9px] text-zinc-500 mt-1">
              {currentParams.temperature < 0.4
                ? localize(state.language, 'Determinista', 'Deterministic')
                : currentParams.temperature > 1.0
                  ? localize(state.language, 'Alta creatividad / riesgo', 'High creativity / risk')
                  : localize(state.language, 'Estándar', 'Standard')}
            </div>
          </div>

          {/* Top-P */}
          <div className="bg-zinc-950/70 p-2.5 rounded border border-zinc-800">
            <div className="flex justify-between items-center text-xs mb-1">
              <span className="text-zinc-300 font-bold">{t(state.language, 'param_top_p')}:</span>
              <span className="text-purple-300 font-bold font-mono">{currentParams.topP.toFixed(2)}</span>
            </div>
            <input
              type="range"
              disabled={!advancedSamplingUnlocked}
              min="0.10"
              max="1.00"
              step="0.05"
              value={currentParams.topP}
              onChange={(e) => handleInferenceParamChange('topP', parseFloat(e.target.value))}
              className="w-full accent-purple-400 cursor-pointer disabled:cursor-not-allowed disabled:opacity-40"
            />
            <div className="text-[9px] text-zinc-500 mt-1">{localize(state.language, 'Filtro de masa probabilística', 'Probability-mass filter')}</div>
          </div>

          {/* Top-K */}
          <div className="bg-zinc-950/70 p-2.5 rounded border border-zinc-800">
            <div className="flex justify-between items-center text-xs mb-1">
              <span className="text-zinc-300 font-bold">{t(state.language, 'param_top_k')}:</span>
              <span className="text-yellow-300 font-bold font-mono">{currentParams.topK}</span>
            </div>
            <input
              type="range"
              disabled={!advancedSamplingUnlocked}
              min="1"
              max="100"
              step="1"
              value={currentParams.topK}
              onChange={(e) => handleInferenceParamChange('topK', parseInt(e.target.value))}
              className="w-full accent-yellow-400 cursor-pointer disabled:cursor-not-allowed disabled:opacity-40"
            />
            <div className="text-[9px] text-zinc-500 mt-1">{localize(state.language, 'Pool de vocabulario K', 'Top-K vocabulary pool')}</div>
          </div>

          {/* Repetition Penalty */}
          <div className="bg-zinc-950/70 p-2.5 rounded border border-zinc-800">
            <div className="flex justify-between items-center text-xs mb-1">
              <span className="text-zinc-300 font-bold">{t(state.language, 'param_repetition_penalty')}:</span>
              <span className="text-emerald-300 font-bold font-mono">{currentParams.repetitionPenalty.toFixed(2)}x</span>
            </div>
            <input
              type="range"
              disabled={!advancedSamplingUnlocked}
              min="1.00"
              max="2.00"
              step="0.05"
              value={currentParams.repetitionPenalty}
              onChange={(e) => handleInferenceParamChange('repetitionPenalty', parseFloat(e.target.value))}
              className="w-full accent-emerald-400 cursor-pointer disabled:cursor-not-allowed disabled:opacity-40"
            />
            <div className="text-[9px] text-zinc-500 mt-1">{localize(state.language, 'Previene bucles repetitivos', 'Prevents repetitive loops')}</div>
          </div>
        </div>
        {!advancedSamplingUnlocked && (
          <p className="mt-2 flex items-center gap-1 text-[10px] text-amber-300">
            <Lock className="h-3 w-3" />
            {localize(state.language, 'Top-P, Top-K y penalización se desbloquean con LoRA o en el día 12.', 'Top-P, Top-K, and repetition penalty unlock with LoRA research or on campaign day 12.')}
          </p>
        )}
      </div>
    </div>
  );
};
