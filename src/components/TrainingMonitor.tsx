/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState } from 'react';
import { useGame } from '../context/GameContext';
import { 
  Activity, 
  TrendingDown, 
  Cpu, 
  Layers, 
  AlertCircle, 
  CheckCircle2, 
  Play,
  Database,
  Brain,
  Sliders,
  Sparkles
} from 'lucide-react';
import { sound } from '../audio/soundManager';
import { gpuComputePflops, formatTrainingTime, externalComputePflops, formatCompute } from '../utils/training';
import { STARTER_TRAINING_DATASET } from '../utils/constants';
import { computeLedger } from '../utils/computeLedger';
import { TrainingConfigPanel } from './TrainingConfigPanel';
import { vramForRun, BATCH_SIZES, learningRateLabel, runConfigFor } from '../utils/trainingRun';
import { tr } from '../i18n';

// Selected dataset: an inline style so the accent border and tint win over the theme surface classes.
const DATASET_SELECTED_STYLE: React.CSSProperties = {
  borderColor: 'var(--accent-primary)',
  boxShadow: '0 0 0 2px var(--accent-primary)',
  backgroundColor: 'color-mix(in srgb, var(--accent-primary) 14%, transparent)'
};

export const TrainingMonitor: React.FC = () => {
  const { state, cancelTraining, startTraining, selectModel } = useGame();
  const job = state.activeTraining;
  // What agents and running contracts leave for training (utils/computeLedger.ts).
  const ledger = computeLedger(state);
  const current = state.currentModel;
  const [selectedDatasetId, setSelectedDatasetId] = useState<string>(
    current.trainedOnDatasetId || STARTER_TRAINING_DATASET.id
  );

  // Total cluster VRAM calculation
  const totalClusterVram = state.hardware.reduce((sum, h) => 
    h.category === 'gpu' ? sum + (h.vramGb * h.count) : sum, 0
  );
  // The batch changes the memory a run needs (see utils/trainingRun.ts).
  const runVramGb = vramForRun(current.vramRequiredGb, runConfigFor(state).batchSize);
  const isVramSufficient = totalClusterVram >= runVramGb;
  const isBreakerTripped = state.powerTripSeconds > 0;
  const isDetained = state.detentionSeconds > 0;

  // Unlocked datasets for selection
  const unlockedDatasets = [
    {
      id: STARTER_TRAINING_DATASET.id,
      name: tr(state.language, 'trainingMonitor.starterCorpusWebBooksNews'),
      domain: 'general',
      tier: 1,
      // Show the tokens the run will actually use: the saved general corpus when present.
      tokensCount: STARTER_TRAINING_DATASET.tokensCount,
      qualityScore: STARTER_TRAINING_DATASET.qualityScore
    },
    // The general corpus is listed once above; a saved dataset with the same id would make two options look selected.
    ...state.customDatasets.map(ds => ({
      id: ds.id,
      name: `${ds.name} (${ds.domainLabel})`,
      domain: ds.domain,
      tier: ds.tier,
      tokensCount: ds.tokensCount,
      qualityScore: ds.qualityScore
    }))
  ];

  if (!job) {
    return (
      <div className="flex flex-col h-full mutating-panel border rounded-xl p-3 sm:p-5 overflow-y-auto space-y-4 font-mono">
        {/* Header */}
        <div className="flex flex-wrap items-center justify-between gap-2 border-b border-current/10 pb-2">
          <div className="flex items-center gap-2">
            <Activity className="w-4 h-4 mutating-accent-text" />
            <h2 className="text-sm font-bold mutating-accent-text tracking-wider">
              {tr(state.language, 'trainingMonitor.trainingMonitorModelDispatcher')}
            </h2>
          </div>
          <div className="flex items-center gap-2 text-[11px] mutating-text-muted">
            <span>{tr(state.language, 'trainingMonitor.compute')} <strong>{formatCompute(ledger.total)}</strong></span>
            <span>•</span>
            <span>{tr(state.language, 'trainingMonitor.freeForTraining')} <strong className={ledger.free < ledger.total * 0.5 ? 'theme-warn-text' : 'theme-success-text'}>{formatCompute(ledger.free)}</strong></span>
            <span>•</span>
            <span>{tr(state.language, 'trainingMonitor.totalVram')} <strong className="theme-success-text">{totalClusterVram} GB</strong></span>
          </div>
        </div>

        {/* Saved Models Selector Section */}
        <section className="space-y-2">
          <div className="flex items-center justify-between">
            <h3 className="text-xs font-bold mutating-accent-text uppercase tracking-wider flex items-center gap-1.5">
              <Layers className="w-3.5 h-3.5" />
              {tr(state.language, 'trainingMonitor.n1SelectModelTrain')}
            </h3>
            <span className="text-[11px] mutating-text-muted">
              {state.savedModels.length} {tr(state.language, 'trainingMonitor.modelSLibrary')}
            </span>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-2.5">
            {state.savedModels.map(model => {
              const isSelected = model.id === current.id;
              const hasVram = totalClusterVram >= model.vramRequiredGb;
              const paramsLabel = model.parametersCount >= 1_000_000_000
                ? `${(model.parametersCount / 1_000_000_000).toFixed(1)}B`
                : `${Math.round(model.parametersCount / 1_000_000)}M`;

              return (
                <div
                  key={model.id}
                  onClick={() => {
                    sound.playKeyClick();
                    selectModel(model.id);
                  }}
                  className={`p-3 rounded-lg border transition-all cursor-pointer flex flex-col justify-between space-y-2 ${
                    isSelected
                      ? 'mutating-sub border-2 border-current shadow-md'
                      : 'mutating-card border-current/15 hover:border-current/40 opacity-80 hover:opacity-100'
                  }`}
                >
                  <div className="flex items-start justify-between gap-1">
                    <div className="truncate">
                      <span className="font-bold text-xs truncate block" title={model.name}>
                        {model.name}
                      </span>
                      <span className="text-[11px] mutating-text-muted block">
                        {model.topology.toUpperCase()} · {paramsLabel} params
                      </span>
                    </div>
                    {isSelected && (
                      <span className="text-[11px] px-1.5 py-0.5 rounded font-bold mutating-btn-primary shrink-0 shadow-sm">
                        {tr(state.language, 'trainingMonitor.active')}
                      </span>
                    )}
                  </div>

                  <div className="pt-1 border-t border-current/10 flex items-center justify-between text-[11px]">
                    <span className="mutating-accent-text font-bold flex items-center gap-1">
                      <Brain className="w-3 h-3 mutating-accent-text" />
                      {tr(state.language, 'trainingMonitor.score')} {model.reasoningScore ?? 0}
                    </span>
                    <span className={`text-[11px] ${hasVram ? 'mutating-text-muted' : 'theme-danger-text font-bold'}`}>
                      {model.vramRequiredGb} GB VRAM
                    </span>
                  </div>
                </div>
              );
            })}
          </div>
        </section>

        {/* Training Configuration & Launch Panel */}
        <section className="mutating-sub p-4 rounded-xl border space-y-4">
          <div className="flex flex-wrap items-center justify-between gap-2 border-b border-current/10 pb-2">
            <div>
              <h3 className="text-xs font-bold mutating-accent-text uppercase tracking-wider flex items-center gap-1.5">
                <Database className="w-3.5 h-3.5" />
                {tr(state.language, 'trainingMonitor.n2TrainingDatasetQuantization')}
              </h3>
              <p className="text-[11px] mutating-text-muted mt-0.5">
                {tr(state.language, 'trainingMonitor.processedTrainingDataWillDecrease')}
              </p>
            </div>
            <div className="text-right">
              <span className="text-[11px] mutating-text-muted block">{tr(state.language, 'trainingMonitor.targetModel')}</span>
              <span className="text-xs font-bold mutating-accent-text font-mono">{current.name}</span>
            </div>
          </div>

          {/* Dataset Selector Dropdown */}
          <div className="space-y-1">
            <label className="text-[11px] mutating-text-muted block uppercase tracking-wider font-semibold">
              {tr(state.language, 'trainingMonitor.selectDataset')}
            </label>
            <div className="flex flex-wrap gap-2">
              {unlockedDatasets.map(ds => (
                <button
                  key={ds.id}
                  type="button"
                  onClick={() => {
                    sound.playKeyClick();
                    setSelectedDatasetId(ds.id);
                  }}
                  aria-pressed={selectedDatasetId === ds.id}
                  style={selectedDatasetId === ds.id ? DATASET_SELECTED_STYLE : undefined}
                  className={`px-3 py-1.5 rounded-lg text-xs font-mono transition-all cursor-pointer border ${
                    selectedDatasetId === ds.id
                      ? 'mutating-sub mutating-accent-text font-bold'
                      : 'mutating-sub border-current/15 mutating-text-muted hover:opacity-100'
                  }`}
                >
                  {ds.name} · {ds.tokensCount}M tokens
                </button>
              ))}
            </div>
          </div>

          {/* Run settings and their cost */}
          {(() => {
            const ds = unlockedDatasets.find(d => d.id === selectedDatasetId) ?? unlockedDatasets[0];
            return (
              <TrainingConfigPanel
                datasetId={ds.id}
                datasetTokensMillions={ds.tokensCount}
                datasetQuality={ds.qualityScore ?? 70}
                totalVramGb={totalClusterVram}
              />
            );
          })()}

          {/* Hardware & VRAM Requirement Check */}
          <div className="p-3 rounded-lg border border-current/15 mutating-card flex flex-wrap items-center justify-between gap-3 text-xs">
            <div className="space-y-1">
              <div className="flex items-center gap-2">
                <Cpu className="w-4 h-4 theme-success-text" />
                <span className="font-bold">
                  {tr(state.language, 'trainingMonitor.vramMemoryAudit')}
                </span>
                <span className={isVramSufficient ? 'theme-success-text font-bold' : 'theme-danger-text font-bold'}>
                  {runVramGb} GB {tr(state.language, 'trainingMonitor.required')} / {totalClusterVram} GB {tr(state.language, 'trainingMonitor.available')}
                </span>
              </div>
              <p className="text-[11px] mutating-text-muted">
                {isVramSufficient
                  ? tr(state.language, 'trainingMonitor.clusterHasSufficientVramHold')
                  : tr(state.language, 'trainingMonitor.insufficientVramQuantizeModelInt8')}
              </p>
            </div>

            {/* Launch Training Button */}
            <button
              onClick={() => {
                sound.playBreakthrough();
                startTraining(selectedDatasetId, current.modelType === 'micro_model', current.id);
              }}
              disabled={!isVramSufficient || isBreakerTripped || isDetained}
              className={`px-5 py-2.5 rounded-xl font-bold text-xs flex items-center gap-2 transition-all shadow-md ${
                isVramSufficient && !isBreakerTripped && !isDetained
                  ? 'mutating-btn-primary cursor-pointer hover:shadow-lg'
                  : 'theme-raised-bg mutating-text-muted border theme-border cursor-not-allowed opacity-50'
              }`}
            >
              <Play className="w-4 h-4 fill-current" />
              <span>
                {tr(state.language, 'trainingMonitor.startTraining')} {current.name}
              </span>
            </button>
          </div>
        </section>
      </div>
    );
  }

  // Generate SVG path for Loss Curve
  const history = job.lossHistory;
  const maxLoss = 5.0;
  const minLoss = 0.0;
  const width = 450;
  const height = 140;

  const toPoints = (series: number[]) => series.map((loss, idx) => {
    const x = (idx / Math.max(1, series.length - 1)) * width;
    const normalizedLoss = Math.min(1, Math.max(0, (loss - minLoss) / (maxLoss - minLoss)));
    const y = height - (normalizedLoss * height);
    return `${x},${y}`;
  }).join(' ');
  const points = toPoints(history);
  const valHistory = job.valLossHistory ?? [];
  const valPoints = toPoints(valHistory);
  // Validation going up while training goes down is the sign of overfitting.
  const valRising = valHistory.length > 3 && valHistory[valHistory.length - 1] > Math.min(...valHistory) + 0.05;

  return (
    <div className="flex flex-col h-full mutating-panel border rounded-xl p-3 sm:p-4 overflow-y-auto space-y-4 font-mono">
      {/* Header */}
      <div className="flex flex-wrap items-center justify-between gap-2 border-b border-current/10 pb-2">
        <div className="flex items-center gap-2">
          <Activity className="w-4 h-4 theme-success-text animate-pulse" />
          <h2 className="text-sm font-bold mutating-accent-text tracking-wider">
            {tr(state.language, 'trainingMonitor.convergenceMonitorTrainingTelemetry')}
          </h2>
        </div>

        <button
          onClick={() => { sound.playWarning(); cancelTraining(); }}
          className="flex items-center gap-1.5 px-3 py-1 theme-danger-soft border theme-danger-border theme-danger-text rounded text-xs transition-colors cursor-pointer"
        >
          <AlertCircle className="w-3.5 h-3.5" />
          <span>{tr(state.language, 'trainingMonitor.cancelRun')}</span>
        </button>
      </div>

      {/* Main Epoch Progress Bar */}
      <div className="mutating-sub p-3 rounded-lg space-y-2">
        <div className="flex flex-wrap items-center justify-between text-xs font-bold gap-2">
          <div className="flex items-center gap-2">
            <span className="mutating-accent-text">
              {tr(state.language, 'trainingMonitor.totalProgress')} {Math.floor(job.progressPercent)}%
            </span>
            <span className="px-2 py-0.5 rounded theme-accent-soft border theme-accent-border mutating-accent-text text-[11px] font-bold">
              {job.modelName}
            </span>
            {job.targetModelType === 'micro_model' ? (
              <span className="px-2 py-0.5 rounded theme-accent-soft border theme-accent-border mutating-accent-text text-[11px] font-bold">
                {tr(state.language, 'trainingMonitor.microModel')} ({job.datasetDomain || tr(state.language, 'trainingMonitor.specialist')})
              </span>
            ) : (
              <span className="px-2 py-0.5 rounded theme-success-soft border theme-success-border theme-success-text text-[11px]">
                {tr(state.language, 'trainingMonitor.generalModel')}
              </span>
            )}
            {job.datasetName && (
              <span className="text-[11px] mutating-text-muted font-mono truncate max-w-44">
                [{job.datasetName}]
              </span>
            )}
          </div>
          <span className="theme-warn-text font-mono">
            {tr(state.language, 'trainingMonitor.epoch')} {job.currentEpoch} / {job.totalEpochs} ({tr(state.language, 'trainingMonitor.step')} #{job.step})
          </span>
        </div>

        <div className="w-full h-3 theme-raised-bg rounded-full border border-current/15 overflow-hidden relative">
          <div 
            className="h-full theme-gradient transition-all duration-300"
            style={{ width: `${Math.min(100, Math.max(0, job.progressPercent))}%` }}
          />
        </div>

        <div className="flex flex-wrap items-center justify-between text-xs pt-1 mutating-text-muted gap-2">
          <div>
            <span className="mutating-text-muted block text-[11px]">{tr(state.language, 'trainingMonitor.computeAllocatedRun')}</span>
            <span className="mutating-accent-text font-bold">
              {tr(state.language, 'trainingMonitor.runGets', { training: formatCompute(ledger.training), total: formatCompute(ledger.total), percent: Math.round(ledger.trainingShare * 100) })}
            </span>
            {(ledger.agents > 0 || ledger.missions > 0) && (
              <span className="theme-warn-text block text-[11px]">
                {tr(state.language, 'trainingMonitor.slowedBy', { contracts: formatCompute(ledger.missions), agents: formatCompute(ledger.agents) })}
              </span>
            )}
          </div>
          <div>
            <span className="mutating-text-muted block text-[11px]">{tr(state.language, 'trainingMonitor.timeLeftGameTime')}</span>
            <span className="theme-success-text font-bold">
              {job.timeRemainingSeconds === null
                ? tr(state.language, 'trainingMonitor.n')
                : formatTrainingTime(job.timeRemainingSeconds, state.language)}
            </span>
          </div>
        </div>
      </div>

      {/* Real-time Loss Curve Chart */}
      <div className="mutating-sub p-3 rounded-lg space-y-2">
        <div className="flex items-center justify-between text-xs">
          <span className="font-bold mutating-accent-text flex items-center gap-1.5">
            <TrendingDown className="w-3.5 h-3.5" />
            {tr(state.language, 'trainingMonitor.lossCurvesTrainingValidation')}
          </span>
          <span className="font-bold font-mono flex flex-wrap gap-3">
            <span className="mutating-accent-text">{tr(state.language, 'trainingMonitor.training')}: {job.currentLoss.toFixed(4)}</span>
            {job.currentValLoss !== undefined && (
              <span className="theme-warn-text">{tr(state.language, 'trainingMonitor.validation')}: {job.currentValLoss.toFixed(4)}</span>
            )}
          </span>
        </div>

        {/* SVG Chart */}
        <div className="relative w-full h-[140px] mutating-panel border border-current/15 rounded-lg overflow-hidden p-2 flex items-center justify-center">
          <svg className="w-full h-full" viewBox={`0 0 ${width} ${height}`} preserveAspectRatio="none">
            {/* Grid lines */}
            <line x1="0" y1="35" x2={width} y2="35" stroke="currentColor" strokeOpacity="0.1" strokeDasharray="4" />
            <line x1="0" y1="70" x2={width} y2="70" stroke="currentColor" strokeOpacity="0.1" strokeDasharray="4" />
            <line x1="0" y1="105" x2={width} y2="105" stroke="currentColor" strokeOpacity="0.1" strokeDasharray="4" />

            {/* Validation loss (dashed) */}
            {valPoints && (
              <polyline
                fill="none"
                stroke="var(--accent-warn)"
                strokeWidth="2"
                strokeDasharray="6 4"
                points={valPoints}
                strokeLinecap="round"
                strokeLinejoin="round"
              />
            )}
            {/* Training loss */}
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
        <div className="flex items-center justify-between text-[11px] mutating-text-muted">
          <span>{tr(state.language, 'trainingMonitor.initialStep')} {job.initialLoss}</span>
          <span className={valRising ? 'theme-danger-text font-bold' : 'mutating-accent-text'}>
            {valRising
              ? tr(state.language, 'trainingMonitor.validationRisingModelStartingMemorise')
              : tr(state.language, 'trainingMonitor.solidTrainingDashedValidation')}
          </span>
          <span>LR {learningRateLabel(state.language, job.plan ? job.plan.config.learningRate : 'balanced')} · batch {job.plan ? BATCH_SIZES[job.plan.config.batchSize].value : 64}</span>
        </div>
      </div>

      {/* Numerical Metrics Cards */}
      <div className="triple-grid grid gap-2.5 text-xs">
        <div className="p-3 rounded-lg mutating-sub">
          <span className="text-[11px] mutating-text-muted block">{tr(state.language, 'trainingMonitor.perplexity')}</span>
          <span className="mutating-accent-text font-bold text-sm">{job.perplexity}</span>
          <span className="text-[11px] mutating-text-muted block mt-0.5">e^(loss)</span>
        </div>

        <div className="p-3 rounded-lg mutating-sub">
          <span className="text-[11px] mutating-text-muted block">{tr(state.language, 'trainingMonitor.gradientNorm')}</span>
          <span className="theme-warn-text font-bold text-sm">{job.gradientNorm}</span>
          <span className="text-[11px] mutating-text-muted block mt-0.5">Clip: 1.0</span>
        </div>

        <div className="p-3 rounded-lg mutating-sub">
          <span className="text-[11px] mutating-text-muted block">{tr(state.language, 'trainingMonitor.gpuTemperature')}</span>
          <span className={`font-bold text-sm ${state.systemHeatCelsius > 80 ? 'theme-danger-text' : 'theme-success-text'}`}>
            {state.systemHeatCelsius}°C
          </span>
          <span className="text-[11px] mutating-text-muted block mt-0.5">{tr(state.language, 'trainingMonitor.cooling')} {state.maxCoolingKw} kW</span>
        </div>

        <div className="p-3 rounded-lg mutating-sub">
          <span className="text-[11px] mutating-text-muted block">{tr(state.language, 'trainingMonitor.activeTopology')}</span>
          <span className="mutating-accent-text font-bold text-xs truncate block">{current.topology}</span>
          <span className="text-[11px] mutating-text-muted block mt-0.5">{current.quantization.toUpperCase()}</span>
        </div>
      </div>
    </div>
  );
};
