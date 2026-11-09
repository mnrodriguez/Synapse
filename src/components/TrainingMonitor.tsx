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
      <div className="flex flex-col items-center justify-center h-full mutating-panel border rounded-xl p-6 text-center font-mono space-y-4">
        <Activity className="w-12 h-12 mutating-accent-text opacity-40 animate-pulse" />
        <div>
          <h3 className="text-sm font-bold mutating-accent-text">{localize(state.language, 'CLÚSTER EN ESPERA (IDLE)', 'CLUSTER IDLE')}</h3>
          <p className="text-xs mutating-text-muted max-w-md mt-1">
            {localize(state.language, 'No hay ninguna corrida de entrenamiento activa en este momento. Dirígete a la pestaña de Arquitectura para configurar los hiperparámetros e iniciar una nueva corrida.', 'There is no active training run. Go to the Architecture tab to configure the model and start a new run.')}
          </p>
        </div>
        <button
          onClick={() => { sound.playBreakthrough(); startTraining(); }}
          className="px-4 py-2 mutating-btn-primary font-bold text-xs rounded-lg flex items-center gap-2 shadow transition-all cursor-pointer"
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
    <div className="flex flex-col h-full mutating-panel border rounded-xl p-3 sm:p-4 overflow-y-auto space-y-4 font-mono">
      {/* Header */}
      <div className="flex flex-wrap items-center justify-between gap-2 border-b border-current/10 pb-2">
        <div className="flex items-center gap-2">
          <Activity className="w-4 h-4 text-emerald-500 animate-pulse" />
          <h2 className="text-sm font-bold mutating-accent-text tracking-wider">
            {localize(state.language, 'MONITOR DE CONVERGENCIA // TELEMETRÍA DE ENTRENAMIENTO', 'CONVERGENCE MONITOR // TRAINING TELEMETRY')}
          </h2>
        </div>

        <button
          onClick={() => { sound.playWarning(); cancelTraining(); }}
          className="flex items-center gap-1.5 px-3 py-1 bg-rose-500/15 hover:bg-rose-500/25 border border-rose-500/40 text-rose-500 rounded text-xs transition-colors cursor-pointer"
        >
          <AlertCircle className="w-3.5 h-3.5" />
          <span>{localize(state.language, 'CANCELAR CORRIDA', 'CANCEL RUN')}</span>
        </button>
      </div>

      {/* Main Epoch Progress Bar */}
      <div className="mutating-sub p-3 rounded-lg space-y-2">
        <div className="flex flex-wrap items-center justify-between text-xs font-bold gap-2">
          <div className="flex items-center gap-2">
            <span className="mutating-accent-text">
              {localize(state.language, 'PROGRESO TOTAL:', 'TOTAL PROGRESS:')} {Math.floor(job.progressPercent)}%
            </span>
            {job.targetModelType === 'micro_model' ? (
              <span className="px-2 py-0.5 rounded bg-purple-500/20 border border-purple-500/40 text-purple-400 text-[10px] font-bold">
                MICRO-MODEL ({job.datasetDomain || 'SPECIALIST'})
              </span>
            ) : (
              <span className="px-2 py-0.5 rounded bg-blue-500/15 border border-blue-500/30 text-blue-500 text-[10px]">
                {localize(state.language, 'MODELO GENERAL', 'GENERAL MODEL')}
              </span>
            )}
            {job.datasetName && (
              <span className="text-[10px] mutating-text-muted font-mono truncate max-w-44">
                [{job.datasetName}]
              </span>
            )}
          </div>
          <span className="text-amber-500 font-mono">
            {localize(state.language, 'Época', 'Epoch')} {job.currentEpoch} / {job.totalEpochs} ({localize(state.language, 'Paso', 'Step')} #{job.step})
          </span>
        </div>

        <div className="w-full h-3 bg-slate-500/20 rounded-full border border-current/15 overflow-hidden relative">
          <div 
            className="h-full bg-gradient-to-r from-blue-500 to-emerald-500 transition-all duration-300"
            style={{ width: `${Math.min(100, Math.max(0, job.progressPercent))}%` }}
          />
        </div>

        <div className="flex flex-wrap items-center justify-between text-xs pt-1 text-slate-400 gap-2">
          <div>
            <span className="mutating-text-muted block text-[10px]">{localize(state.language, 'CÓMPUTO ASIGNADO A LA CORRIDA:', 'COMPUTE ALLOCATED TO RUN:')}</span>
            <span className="mutating-accent-text font-bold">
              {(state.totalComputePflops * 0.5).toFixed(2)} PFLOPS (50% Cluster)
            </span>
          </div>
          <div>
            <span className="mutating-text-muted block text-[10px]">{localize(state.language, 'PREDICCIÓN EN DÍAS CON HARDWARE ACTUAL:', 'ESTIMATED DAYS WITH CURRENT HARDWARE:')}</span>
            <span className="text-emerald-500 font-bold">
              {job.timeRemainingSeconds === null
                ? localize(state.language, 'N/A', 'N/A')
                : `${(job.timeRemainingSeconds / 48).toFixed(1)} ${localize(state.language, 'días de simulación', 'in-game days')}`}
            </span>
          </div>
        </div>
      </div>

      {/* Real-time Loss Curve Chart */}
      <div className="mutating-sub p-3 rounded-lg space-y-2">
        <div className="flex items-center justify-between text-xs">
          <span className="font-bold mutating-accent-text flex items-center gap-1.5">
            <TrendingDown className="w-3.5 h-3.5" />
            {localize(state.language, 'CURVA DE PÉRDIDA EN TIEMPO REAL (CROSS-ENTROPY LOSS)', 'REAL-TIME LOSS CURVE (CROSS-ENTROPY)')}
          </span>
          <span className="text-emerald-500 font-bold font-mono">
            {localize(state.language, 'Loss actual:', 'Current loss:')} {job.currentLoss.toFixed(4)}
          </span>
        </div>

        {/* SVG Chart */}
        <div className="relative w-full h-[140px] mutating-panel border border-current/15 rounded-lg overflow-hidden p-2 flex items-center justify-center">
          <svg className="w-full h-full" viewBox={`0 0 ${width} ${height}`} preserveAspectRatio="none">
            {/* Grid lines */}
            <line x1="0" y1="35" x2={width} y2="35" stroke="currentColor" strokeOpacity="0.1" strokeDasharray="4" />
            <line x1="0" y1="70" x2={width} y2="70" stroke="currentColor" strokeOpacity="0.1" strokeDasharray="4" />
            <line x1="0" y1="105" x2={width} y2="105" stroke="currentColor" strokeOpacity="0.1" strokeDasharray="4" />

            {/* Loss Polyline */}
            {points && (
              <polyline
                fill="none"
                stroke="var(--accent-primary)"
                strokeWidth="2.5"
                points={points}
                strokeLinecap="round"
                strokeLinejoin="round"
              />
            )}
          </svg>
        </div>
        <div className="flex items-center justify-between text-[10px] mutating-text-muted">
          <span>{localize(state.language, 'Paso Inicial:', 'Initial step:')} {job.initialLoss}</span>
          <span className="mutating-accent-text">{localize(state.language, 'Tendencia: Convergencia Monótona', 'Trend: Monotonic convergence')}</span>
          <span>{localize(state.language, 'Objetivo:', 'Target:')} &lt; 0.05</span>
        </div>
      </div>

      {/* Numerical Metrics Cards */}
      <div className="triple-grid grid gap-2.5 text-xs">
        <div className="p-3 rounded-lg mutating-sub">
          <span className="text-[10px] mutating-text-muted block">{localize(state.language, 'PERPLEJIDAD', 'PERPLEXITY')}</span>
          <span className="mutating-accent-text font-bold text-sm">{job.perplexity}</span>
          <span className="text-[9px] mutating-text-muted block mt-0.5">e^(loss)</span>
        </div>

        <div className="p-3 rounded-lg mutating-sub">
          <span className="text-[10px] mutating-text-muted block">{localize(state.language, 'NORMA DE GRADIENTE', 'GRADIENT NORM')}</span>
          <span className="text-amber-500 font-bold text-sm">{job.gradientNorm}</span>
          <span className="text-[9px] mutating-text-muted block mt-0.5">Clip: 1.0</span>
        </div>

        <div className="p-3 rounded-lg mutating-sub">
          <span className="text-[10px] mutating-text-muted block">{localize(state.language, 'TEMPERATURA GPU', 'GPU TEMPERATURE')}</span>
          <span className={`font-bold text-sm ${state.systemHeatCelsius > 80 ? 'text-rose-500' : 'text-emerald-500'}`}>
            {state.systemHeatCelsius}°C
          </span>
          <span className="text-[9px] mutating-text-muted block mt-0.5">{localize(state.language, 'Disipación', 'Cooling')} {state.maxCoolingKw} kW</span>
        </div>

        <div className="p-3 rounded-lg mutating-sub">
          <span className="text-[10px] mutating-text-muted block">{localize(state.language, 'TOPOLOGÍA ACTIVA', 'ACTIVE TOPOLOGY')}</span>
          <span className="text-purple-500 font-bold text-xs truncate block">{state.currentModel.topology}</span>
          <span className="text-[9px] mutating-text-muted block mt-0.5">{state.currentModel.quantization.toUpperCase()}</span>
        </div>
      </div>
    </div>
  );
};
