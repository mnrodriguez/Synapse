/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React from 'react';
import { useGame } from '../context/GameContext';
import { 
  Activity, 
  TrendingDown, 
  Flame, 
  Cpu, 
  Layers, 
  AlertCircle, 
  CheckCircle2, 
  Play,
  RotateCcw
} from 'lucide-react';
import { sound } from '../audio/soundManager';
import { localize } from '../utils/i18n';
import { formatTrainingDuration } from '../utils/training';

export const TrainingMonitor: React.FC = () => {
  const { state, cancelTraining, startTraining } = useGame();
  const job = state.activeTraining;

  if (!job) {
    return (
      <div className="flex flex-col items-center justify-center h-full bg-[#070b12] border border-cyan-900/40 rounded-lg p-6 text-center font-mono space-y-4">
        <Activity className="w-12 h-12 text-cyan-900 animate-pulse" />
        <div>
          <h3 className="text-sm font-bold text-zinc-300">{localize(state.language, 'CLÚSTER EN ESPERA (IDLE)', 'CLUSTER IDLE')}</h3>
          <p className="text-xs text-zinc-500 max-w-md mt-1">
            {localize(state.language, 'No hay ninguna corrida de entrenamiento activa en este momento. Dirígete a la pestaña de Arquitectura para configurar los hiperparámetros e iniciar una nueva corrida.', 'There is no active training run. Go to the Architecture tab to configure the model and start a new run.')}
          </p>
        </div>
        <button
          onClick={() => startTraining()}
          className="px-4 py-2 bg-cyan-500 hover:bg-cyan-400 text-zinc-950 font-bold text-xs rounded flex items-center gap-2 shadow-[0_0_15px_rgba(0,255,200,0.3)] transition-all"
        >
          <Play className="w-4 h-4 fill-current" />
          <span>{localize(state.language, 'INICIAR ENTRENAMIENTO DE', 'START TRAINING')} {state.currentModel.name}</span>
        </button>
      </div>
    );
  }

  // Generate SVG path for Loss Curve
  const history = job.lossHistory;
  const maxLoss = 5.0;
  const minLoss = 0.0;
  const width = 450;
  const height = 140;

  const points = history.map((loss, idx) => {
    const x = (idx / Math.max(1, history.length - 1)) * width;
    const normalizedLoss = Math.min(1, Math.max(0, (loss - minLoss) / (maxLoss - minLoss)));
    const y = height - (normalizedLoss * height);
    return `${x},${y}`;
  }).join(' ');

  return (
    <div className="flex flex-col h-full bg-[#070b12] border border-cyan-900/40 rounded-lg p-3 overflow-y-auto space-y-4 font-mono scrollbar-thin scrollbar-thumb-cyan-950">
      {/* Header */}
      <div className="flex flex-wrap items-center justify-between gap-2 border-b border-cyan-900/40 pb-2">
        <div className="flex items-center gap-2">
          <Activity className="w-4 h-4 text-emerald-400 animate-pulse" />
          <h2 className="text-sm font-bold text-cyan-300 tracking-wider">
            {localize(state.language, 'MONITOR DE CONVERGENCIA // TELEMETRÍA DE ENTRENAMIENTO', 'CONVERGENCE MONITOR // TRAINING TELEMETRY')}
          </h2>
        </div>

        <button
          onClick={cancelTraining}
          className="flex items-center gap-1.5 px-3 py-1 bg-red-950/60 hover:bg-red-900 border border-red-500/60 text-red-300 rounded text-xs transition-colors"
        >
          <AlertCircle className="w-3.5 h-3.5" />
          <span>{localize(state.language, 'CANCELAR CORRIDA', 'CANCEL RUN')}</span>
        </button>
      </div>

      {/* Main Epoch Progress Bar */}
      <div className="bg-[#09111c] border border-cyan-900/60 p-3 rounded-lg space-y-2">
        <div className="flex flex-wrap items-center justify-between text-xs font-bold gap-2">
          <div className="flex items-center gap-2">
            <span className="text-cyan-300">
              {localize(state.language, 'PROGRESO TOTAL:', 'TOTAL PROGRESS:')} {Math.floor(job.progressPercent)}%
            </span>
            {job.targetModelType === 'micro_model' ? (
              <span className="px-2 py-0.5 rounded bg-purple-950/80 border border-purple-500/60 text-purple-300 text-[10px] font-bold">
                MICRO-MODEL ({job.datasetDomain || 'SPECIALIST'})
              </span>
            ) : (
              <span className="px-2 py-0.5 rounded bg-cyan-950/80 border border-cyan-500/60 text-cyan-300 text-[10px]">
                {localize(state.language, 'MODELO GENERAL', 'GENERAL MODEL')}
              </span>
            )}
            {job.datasetName && (
              <span className="text-[10px] text-zinc-400 font-mono truncate max-w-44">
                [{job.datasetName}]
              </span>
            )}
          </div>
          <span className="text-yellow-300 font-mono">
            {localize(state.language, 'Época', 'Epoch')} {job.currentEpoch} / {job.totalEpochs} ({localize(state.language, 'Paso', 'Step')} #{job.step})
          </span>
        </div>

        <div className="w-full h-3 bg-zinc-950 rounded-full border border-cyan-900/80 overflow-hidden relative">
          <div 
            className="h-full bg-gradient-to-r from-cyan-500 via-teal-400 to-emerald-400 transition-all duration-300 rounded-full shadow-[0_0_10px_rgba(0,255,200,0.5)]"
            style={{ width: `${job.progressPercent}%` }}
          />
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-3 gap-2 text-[11px] text-zinc-400 pt-1">
          <div>
            <span className="text-zinc-500 block text-[10px]">{localize(state.language, 'TOKENS Y CÓMPUTO:', 'TOKENS & COMPUTE:')}</span>
            <span>{(job.tokensProcessed / 1_000_000).toFixed(1)}M tok · {state.totalComputePflops.toFixed(4)} PF</span>
          </div>
          <div>
            <span className="text-zinc-500 block text-[10px]">{localize(state.language, 'DURACIÓN EN HARDWARE:', 'HARDWARE RUNTIME:')}</span>
            <span className="text-zinc-300">
              {state.gameSpeed === 0
                ? localize(state.language, 'PAUSADO', 'PAUSED')
                : job.timeRemainingSeconds === null
                  ? localize(state.language, 'Sin cómputo', 'No compute')
                  : `${formatTrainingDuration(job.timeRemainingSeconds / Math.max(1, state.gameSpeed))} @ ${state.gameSpeed}x`}
            </span>
          </div>
          <div>
            <span className="text-zinc-500 block text-[10px]">{localize(state.language, 'PREDICCIÓN EN DÍAS CON HARDWARE ACTUAL:', 'ESTIMATED DAYS WITH CURRENT HARDWARE:')}</span>
            <span className="text-emerald-300 font-bold">
              {job.timeRemainingSeconds === null
                ? localize(state.language, 'N/A', 'N/A')
                : `${(job.timeRemainingSeconds / 48).toFixed(1)} ${localize(state.language, 'días de simulación', 'in-game days')}`}
            </span>
          </div>
        </div>
      </div>

      {/* Real-time Loss Curve Chart */}
      <div className="bg-[#09111c] border border-cyan-900/60 p-3 rounded-lg space-y-2">
        <div className="flex items-center justify-between text-xs">
          <span className="font-bold text-zinc-300 flex items-center gap-1.5">
            <TrendingDown className="w-3.5 h-3.5 text-cyan-400" />
            {localize(state.language, 'CURVA DE PÉRDIDA EN TIEMPO REAL (CROSS-ENTROPY LOSS)', 'REAL-TIME LOSS CURVE (CROSS-ENTROPY)')}
          </span>
          <span className="text-emerald-400 font-bold font-mono">
            {localize(state.language, 'Loss actual:', 'Current loss:')} {job.currentLoss.toFixed(4)}
          </span>
        </div>

        {/* SVG Chart */}
        <div className="relative w-full h-[140px] bg-[#05080e] border border-cyan-950 rounded overflow-hidden p-2 flex items-center justify-center">
          <svg className="w-full h-full" viewBox={`0 0 ${width} ${height}`} preserveAspectRatio="none">
            {/* Grid lines */}
            <line x1="0" y1="35" x2={width} y2="35" stroke="#102030" strokeDasharray="4" />
            <line x1="0" y1="70" x2={width} y2="70" stroke="#102030" strokeDasharray="4" />
            <line x1="0" y1="105" x2={width} y2="105" stroke="#102030" strokeDasharray="4" />

            {/* Loss Polyline */}
            {points && (
              <polyline
                fill="none"
                stroke="#00ffcc"
                strokeWidth="2.5"
                points={points}
                strokeLinecap="round"
                strokeLinejoin="round"
              />
            )}
          </svg>
        </div>
        <div className="flex items-center justify-between text-[10px] text-zinc-500">
          <span>{localize(state.language, 'Paso Inicial:', 'Initial step:')} {job.initialLoss}</span>
          <span className="text-cyan-400">{localize(state.language, 'Tendencia: Convergencia Monótona', 'Trend: Monotonic convergence')}</span>
          <span>{localize(state.language, 'Objetivo:', 'Target:')} &lt; 0.05</span>
        </div>
      </div>

      {/* Numerical Metrics Cards */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 text-xs">
        <div className="p-2.5 rounded bg-[#09111c] border border-cyan-900/40">
          <span className="text-[10px] text-zinc-500 block">{localize(state.language, 'PERPLEJIDAD', 'PERPLEXITY')}</span>
          <span className="text-cyan-300 font-bold text-sm">{job.perplexity}</span>
          <span className="text-[9px] text-zinc-600 block mt-0.5">e^(loss)</span>
        </div>

        <div className="p-2.5 rounded bg-[#09111c] border border-cyan-900/40">
          <span className="text-[10px] text-zinc-500 block">{localize(state.language, 'NORMA DE GRADIENTE', 'GRADIENT NORM')}</span>
          <span className="text-yellow-300 font-bold text-sm">{job.gradientNorm}</span>
          <span className="text-[9px] text-zinc-600 block mt-0.5">Clip: 1.0</span>
        </div>

        <div className="p-2.5 rounded bg-[#09111c] border border-cyan-900/40">
          <span className="text-[10px] text-zinc-500 block">{localize(state.language, 'TEMPERATURA GPU', 'GPU TEMPERATURE')}</span>
          <span className={`font-bold text-sm ${state.systemHeatCelsius > 80 ? 'text-red-400' : 'text-emerald-400'}`}>
            {state.systemHeatCelsius}°C
          </span>
          <span className="text-[9px] text-zinc-600 block mt-0.5">{localize(state.language, 'Disipación', 'Cooling')} {state.maxCoolingKw} kW</span>
        </div>

        <div className="p-2.5 rounded bg-[#09111c] border border-cyan-900/40">
          <span className="text-[10px] text-zinc-500 block">{localize(state.language, 'TOPOLOGÍA ACTIVA', 'ACTIVE TOPOLOGY')}</span>
          <span className="text-purple-300 font-bold text-xs truncate block">{state.currentModel.topology}</span>
          <span className="text-[9px] text-zinc-600 block mt-0.5">{state.currentModel.quantization.toUpperCase()}</span>
        </div>
      </div>
    </div>
  );
};
