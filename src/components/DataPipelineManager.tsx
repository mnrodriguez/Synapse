/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React from 'react';
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
  HardDrive
} from 'lucide-react';
import { sound } from '../audio/soundManager';
import { localize } from '../utils/i18n';
import { localizedDataSource } from '../utils/gameContentI18n';
import { DATA_DOCS } from '../utils/aiDocumentation';
import { DocLinkBadge } from './DocLinkBadge';

export const DataPipelineManager: React.FC = () => {
  const { state, unlockDataSource, upgradeDataSource } = useGame();

  const getIcon = (type: string) => {
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

  return (
    <div className="flex flex-col h-full bg-[#070b12] border border-cyan-900/40 rounded-lg p-3 overflow-y-auto space-y-4 font-mono scrollbar-thin scrollbar-thumb-cyan-950">
      {/* Header */}
      <div className="flex flex-wrap items-center justify-between gap-2 border-b border-cyan-900/40 pb-2">
        <div className="flex items-center gap-2">
          <Network className="w-4 h-4 text-cyan-400" />
          <h2 className="text-sm font-bold text-cyan-300 tracking-wider">
            {localize(state.language, 'MOTOR DE DATOS Y CONOCIMIENTO // INGESTA MULTIMODAL', 'DATA & KNOWLEDGE ENGINES // MULTIMODAL INGESTION')}
          </h2>
        </div>
        <div className="text-xs text-zinc-400">
          {localize(state.language, 'Saldo Disponible:', 'Available balance:')} <span className="text-amber-300 font-bold">${state.credits.toLocaleString()} CR</span>
        </div>
      </div>

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
                      {getIcon(ds.type)}
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
                          : localize(state.language, 'ESTADO: SIN DESPLEGAR', 'STATUS: NOT DEPLOYED')}
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
                    disabled={state.credits < ds.cost}
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
  );
};
