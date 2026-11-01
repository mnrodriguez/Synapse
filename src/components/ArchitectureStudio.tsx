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
  Sparkles
} from 'lucide-react';
import { sound } from '../audio/soundManager';
import { t } from '../utils/i18n';

export const ArchitectureStudio: React.FC = () => {
  const { state, updateModelArchitecture, startTraining, cancelTraining, addLog } = useGame();
  const current = state.currentModel;

  // Total cluster VRAM calculation
  const totalClusterVram = state.hardware.reduce((sum, h) => 
    h.category === 'gpu' ? sum + (h.vramGb * h.count) : sum, 0
  );

  const isVramSufficient = totalClusterVram >= current.vramRequiredGb;

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
        addLog('El modelo requiere al menos una fuente de datos conectada para entrenar.', 'warning');
        return;
      }
      active.splice(idx, 1);
    } else {
      active.push(dsId);
    }
    updateModelArchitecture({ activeDataSources: active });
  };

  const handleInferenceParamChange = (key: keyof InferenceParams, val: any) => {
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

  const paramPresets = [
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

  const contextPresets = [2048, 4096, 8192, 32768, 128000, 1000000];

  return (
    <div className="flex flex-col h-full bg-[#070b12] border border-cyan-900/40 rounded-lg p-3 overflow-y-auto space-y-4 font-mono scrollbar-thin scrollbar-thumb-cyan-950">
      {/* Studio Header */}
      <div className="flex flex-wrap items-center justify-between gap-2 border-b border-cyan-900/40 pb-2">
        <div className="flex items-center gap-2">
          <Layers className="w-4 h-4 text-cyan-400" />
          <h2 className="text-sm font-bold text-cyan-300 tracking-wider">
            ESTUDIO DE ARQUITECTURA NEURONAL // TOPOLOGÍA
          </h2>
        </div>

        {/* Action button */}
        {state.activeTraining ? (
          <button
            onClick={cancelTraining}
            className="flex items-center gap-1.5 px-3 py-1 bg-red-950/60 hover:bg-red-900 border border-red-500/60 text-red-300 rounded text-xs transition-colors"
          >
            <AlertCircle className="w-3.5 h-3.5" />
            <span>ABORTAR ENTRENAMIENTO</span>
          </button>
        ) : (
          <button
            onClick={() => startTraining()}
            disabled={!isVramSufficient}
            className={`flex items-center gap-1.5 px-3.5 py-1.5 rounded text-xs font-bold transition-all shadow-[0_0_15px_rgba(0,255,200,0.2)] ${
              isVramSufficient 
                ? 'bg-cyan-500 hover:bg-cyan-400 text-zinc-950 cursor-pointer' 
                : 'bg-zinc-800 text-zinc-500 border border-zinc-700 cursor-not-allowed'
            }`}
          >
            <Play className="w-3.5 h-3.5 fill-current" />
            <span>INICIAR ENTRENAMIENTO ({current.name})</span>
          </button>
        )}
      </div>

      {/* Model Spec Card */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 bg-[#09111c] border border-cyan-900/50 p-2.5 rounded text-xs">
        <div>
          <span className="text-zinc-500 text-[10px] block">MODELO BASE</span>
          <span className="text-cyan-300 font-bold">{current.name}</span>
        </div>
        <div>
          <span className="text-zinc-500 text-[10px] block">PARÁMETROS</span>
          <span className="text-yellow-300 font-bold">
            {current.parametersCount >= 1_000_000_000
              ? `${(current.parametersCount / 1_000_000_000).toFixed(1)}B`
              : `${(current.parametersCount / 1_000_000).toFixed(0)}M`}
          </span>
        </div>
        <div>
          <span className="text-zinc-500 text-[10px] block">VRAM REQUERIDA</span>
          <span className={`font-bold ${isVramSufficient ? 'text-emerald-400' : 'text-red-400'}`}>
            {current.vramRequiredGb} GB / {totalClusterVram} GB {isVramSufficient ? '✓' : '(OOM!)'}
          </span>
        </div>
        <div>
          <span className="text-zinc-500 text-[10px] block">BENCHMARK INTELECTUAL</span>
          <span className="text-purple-300 font-bold">IQ {current.reasoningScore} pts</span>
        </div>
      </div>

      {/* Section 1: Topology selection */}
      <div className="space-y-1.5">
        <label className="text-xs text-zinc-400 font-bold flex items-center gap-1.5">
          <Cpu className="w-3.5 h-3.5 text-cyan-400" />
          TOPOLOGÍA DE RED Y PARADIGMA COMPUTACIONAL
        </label>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-2">
          {[
            {
              id: 'transformer',
              name: 'Transformer Autoregresivo (Decoder-Only)',
              desc: 'Atención densa O(n²). Excelente coherencia global y modelado del lenguaje.'
            },
            {
              id: 'moe',
              name: 'Sparse Mixture-of-Experts (MoE)',
              desc: 'Enrutador Top-K. Multiplica parámetros activos sin elevar costo por token.'
            },
            {
              id: 'mamba_ssm',
              name: 'State Space Model (Mamba SSM)',
              desc: 'Complejidad O(n) lineal. Memoria recurrente continua para secuencias ultra-largas.'
            },
            {
              id: 'gnn_hybrid',
              name: 'Graph Neural Network (GNN Hybrid)',
              desc: 'Paso de mensajes en grafos no euclidianos. Razonamiento relacional estricto.'
            },
            {
              id: 'multimodal_diffusion',
              name: 'Multimodal Diffusion / Flow-Matching',
              desc: 'Generación conjunta texto-visión-código con trayectorias óptimas de difusión.'
            }
          ].map(top => (
            <button
              key={top.id}
              onClick={() => handleTopologyChange(top.id as ModelTopology)}
              className={`p-2 rounded text-left border transition-all ${
                current.topology === top.id
                  ? 'bg-cyan-950/70 border-cyan-400 text-cyan-200 shadow-[0_0_10px_rgba(0,255,200,0.15)]'
                  : 'bg-zinc-900/60 border-zinc-800 text-zinc-400 hover:border-zinc-700 hover:text-zinc-300'
              }`}
            >
              <div className="font-bold text-xs flex items-center justify-between">
                <span>{top.name.split(' (')[0]}</span>
                {current.topology === top.id && <CheckCircle2 className="w-3 h-3 text-cyan-400" />}
              </div>
              <p className="text-[10px] text-zinc-500 mt-1 leading-snug">{top.desc}</p>
            </button>
          ))}
        </div>
      </div>

      {/* Section 2: Scale of parameters & Context */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        {/* Parameters scale */}
        <div className="space-y-1.5">
          <label className="text-xs text-zinc-400 font-bold flex items-center gap-1.5">
            <Sliders className="w-3.5 h-3.5 text-yellow-400" />
            ESCALA DE PARÁMETROS (CAPACIDAD COGNITIVA)
          </label>
          <div className="flex flex-wrap gap-1.5">
            {paramPresets.map(preset => (
              <button
                key={preset.label}
                onClick={() => handleParamsPreset(preset.value, preset.label)}
                className={`px-2.5 py-1 rounded text-xs font-mono font-bold border transition-colors ${
                  current.parametersCount === preset.value
                    ? 'bg-yellow-950/60 border-yellow-400 text-yellow-300'
                    : 'bg-zinc-900/80 border-zinc-800 text-zinc-400 hover:border-zinc-700'
                }`}
              >
                {preset.label}
              </button>
            ))}
          </div>
          <p className="text-[10px] text-zinc-500">
            Modelos mayores requieren más VRAM y FLOPs, pero desbloquean contratos de alto valor y aceleran la Singularidad.
          </p>
        </div>

        {/* Context Window */}
        <div className="space-y-1.5">
          <label className="text-xs text-zinc-400 font-bold flex items-center gap-1.5">
            <Sparkles className="w-3.5 h-3.5 text-purple-400" />
            VENTANA DE CONTEXTO (TOKENS)
          </label>
          <div className="flex flex-wrap gap-1.5">
            {contextPresets.map(ctx => (
              <button
                key={ctx}
                onClick={() => handleContextChange(ctx)}
                className={`px-2 py-1 rounded text-xs font-mono border transition-colors ${
                  current.contextWindow === ctx
                    ? 'bg-purple-950/60 border-purple-400 text-purple-300 font-bold'
                    : 'bg-zinc-900/80 border-zinc-800 text-zinc-400 hover:border-zinc-700'
                }`}
              >
                {ctx >= 1_000_000 ? '1M' : ctx >= 1000 ? `${ctx / 1000}k` : ctx}
              </button>
            ))}
          </div>
          <p className="text-[10px] text-zinc-500">
            Ventanas grandes consumen caché KV exponencialmente a menos que uses RoPE o FlashAttention.
          </p>
        </div>
      </div>

      {/* Section 3: Quantization & Attention & Loss */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
        {/* Quantization */}
        <div className="space-y-1.5">
          <label className="text-xs text-zinc-400 font-bold">CUANTIZACIÓN DE PESOS</label>
          <div className="space-y-1">
            {[
              { id: 'fp32', label: 'FP32 Completo (4 bytes/param)', hint: 'Precisión pura, máxima VRAM' },
              { id: 'bf16', label: 'BF16 Estándar (2 bytes/param)', hint: 'Rango dinámico de bfloat16' },
              { id: 'int8', label: 'INT8 Cuantizado (1 byte/param)', hint: 'Ideal para GPUs GTX / RTX' },
              { id: 'fp4', label: 'FP4 Blackwell (0.5 byte/param)', hint: 'Ultra-comprimido para 70B+' },
              { id: 'ternary_1bit', label: 'BitNet 1.58-bit Ternary', hint: 'Solo {-1, 0, +1}, mínimo consumo' }
            ].map(q => (
              <button
                key={q.id}
                onClick={() => handleQuantizationChange(q.id as QuantizationType)}
                className={`w-full text-left p-1.5 rounded border text-xs transition-colors ${
                  current.quantization === q.id
                    ? 'bg-cyan-950/70 border-cyan-400 text-cyan-200'
                    : 'bg-zinc-900/60 border-zinc-800 text-zinc-400 hover:text-zinc-200'
                }`}
              >
                <div className="font-semibold">{q.label}</div>
                <div className="text-[9px] text-zinc-500">{q.hint}</div>
              </button>
            ))}
          </div>
        </div>

        {/* Attention Mechanism */}
        <div className="space-y-1.5">
          <label className="text-xs text-zinc-400 font-bold">MECANISMO DE ATENCIÓN</label>
          <div className="space-y-1">
            {[
              { id: 'standard_mha', label: 'Multi-Head Attention (MHA)', hint: 'Atención tradicional dot-product' },
              { id: 'grouped_query_gqa', label: 'Grouped-Query (GQA)', hint: 'Reduce tamaño de KV cache a 1/8' },
              { id: 'flash_attention_3', label: 'FlashAttention-3', hint: 'Tiling en SRAM, velocidad x2' },
              { id: 'linear_attention', label: 'Linear Attention', hint: 'Kernelización de baja complejidad' }
            ].map(att => (
              <button
                key={att.id}
                onClick={() => handleAttentionChange(att.id as AttentionType)}
                className={`w-full text-left p-1.5 rounded border text-xs transition-colors ${
                  current.attention === att.id
                    ? 'bg-purple-950/70 border-purple-400 text-purple-200'
                    : 'bg-zinc-900/60 border-zinc-800 text-zinc-400 hover:text-zinc-200'
                }`}
              >
                <div className="font-semibold">{att.label}</div>
                <div className="text-[9px] text-zinc-500">{att.hint}</div>
              </button>
            ))}
          </div>
        </div>

        {/* Loss & Alignment Objective */}
        <div className="space-y-1.5">
          <label className="text-xs text-zinc-400 font-bold">FUNCIÓN DE PÉRDIDA Y ALINEACIÓN</label>
          <div className="space-y-1">
            {[
              { id: 'cross_entropy', label: 'Cross-Entropy Pretraining', hint: 'Predicción del siguiente token estándar' },
              { id: 'dpo', label: 'Direct Preference Optimization (DPO)', hint: 'Alineación analítica sin reward-model' },
              { id: 'ppo_rlhf', label: 'PPO / Reinforcement Learning', hint: 'Optimización de política con feedback' },
              { id: 'contrastive_infonce', label: 'Contrastive InfoNCE', hint: 'Representaciones conjuntas latentes' },
              { id: 'energy_based', label: 'Energy-Based Objective', hint: 'Minimización de energía libre en el sistema' }
            ].map(loss => (
              <button
                key={loss.id}
                onClick={() => handleLossChange(loss.id as LossFunction)}
                className={`w-full text-left p-1.5 rounded border text-xs transition-colors ${
                  current.lossFunction === loss.id
                    ? 'bg-emerald-950/70 border-emerald-400 text-emerald-200'
                    : 'bg-zinc-900/60 border-zinc-800 text-zinc-400 hover:text-zinc-200'
                }`}
              >
                <div className="font-semibold">{loss.label}</div>
                <div className="text-[9px] text-zinc-500">{loss.hint}</div>
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Section 4: Connected Data Pipelines (User requested: Graph, Vector, SQL) */}
      <div className="space-y-1.5 bg-[#080e18] border border-cyan-900/40 p-3 rounded">
        <label className="text-xs text-zinc-300 font-bold flex items-center gap-1.5">
          <Database className="w-3.5 h-3.5 text-cyan-400" />
          PIPELINES DE DATOS CONECTADOS AL MODELO
        </label>
        <p className="text-[11px] text-zinc-400">
          Haz clic para conectar o desconectar fuentes de datos. Cada motor añade capacidades cognitivas únicas (Deducción causal con Grafos, RAG con Vectores, Transacciones con SQL):
        </p>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-2 mt-2">
          {state.dataSources.map(ds => {
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
                  <span className="truncate">{ds.name.split(' (')[0]}</span>
                  {isConnected && <span className="text-cyan-400 text-[10px]">CONECTADO</span>}
                </div>
                <div className="text-[10px] text-zinc-400 mt-1">{ds.bonusAttribute}</div>
                <div className="text-[9px] text-zinc-500 mt-1">
                  {ds.unlocked ? `Tokens: ${ds.tokensIndexed}M | Nivel ${ds.level}` : `BLOQUEADO (Desplegar en Data Engine)`}
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
            <span>{t(state.language, 'inference_hyperparams')} (DEFAULT DEL MODELO)</span>
          </label>
          <span className="text-[10px] text-zinc-400 font-mono">CALIBRACIÓN ESTOCÁSTICA</span>
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
              {currentParams.temperature < 0.4 ? 'Determinista' : currentParams.temperature > 1.0 ? 'Alta creatividad / riesgo' : 'Estándar'}
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
              min="0.10"
              max="1.00"
              step="0.05"
              value={currentParams.topP}
              onChange={(e) => handleInferenceParamChange('topP', parseFloat(e.target.value))}
              className="w-full accent-purple-400 cursor-pointer"
            />
            <div className="text-[9px] text-zinc-500 mt-1">Filtro de masa probabilística</div>
          </div>

          {/* Top-K */}
          <div className="bg-zinc-950/70 p-2.5 rounded border border-zinc-800">
            <div className="flex justify-between items-center text-xs mb-1">
              <span className="text-zinc-300 font-bold">{t(state.language, 'param_top_k')}:</span>
              <span className="text-yellow-300 font-bold font-mono">{currentParams.topK}</span>
            </div>
            <input
              type="range"
              min="1"
              max="100"
              step="1"
              value={currentParams.topK}
              onChange={(e) => handleInferenceParamChange('topK', parseInt(e.target.value))}
              className="w-full accent-yellow-400 cursor-pointer"
            />
            <div className="text-[9px] text-zinc-500 mt-1">Pool de vocabulario K</div>
          </div>

          {/* Repetition Penalty */}
          <div className="bg-zinc-950/70 p-2.5 rounded border border-zinc-800">
            <div className="flex justify-between items-center text-xs mb-1">
              <span className="text-zinc-300 font-bold">{t(state.language, 'param_repetition_penalty')}:</span>
              <span className="text-emerald-300 font-bold font-mono">{currentParams.repetitionPenalty.toFixed(2)}x</span>
            </div>
            <input
              type="range"
              min="1.00"
              max="2.00"
              step="0.05"
              value={currentParams.repetitionPenalty}
              onChange={(e) => handleInferenceParamChange('repetitionPenalty', parseFloat(e.target.value))}
              className="w-full accent-emerald-400 cursor-pointer"
            />
            <div className="text-[9px] text-zinc-500 mt-1">Previene bucles repetitivos</div>
          </div>
        </div>
      </div>
    </div>
  );
};
