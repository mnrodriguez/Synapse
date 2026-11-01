/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React from 'react';
import { useGame } from '../context/GameContext';
import { ResearchNode } from '../types/game';
import { 
  BookOpen, 
  CheckCircle2, 
  Lock, 
  Unlock, 
  Sparkles, 
  Zap, 
  Cpu, 
  GitBranch,
  Layers
} from 'lucide-react';
import { sound } from '../audio/soundManager';
import { localize } from '../utils/i18n';
import { localizedResearch } from '../utils/gameContentI18n';
import { RESEARCH_DOCS } from '../utils/aiDocumentation';
import { DocLinkBadge } from './DocLinkBadge';

export const ResearchTree: React.FC = () => {
  const { state, unlockResearch } = useGame();

  const getCategoryColor = (cat: string) => {
    switch (cat) {
      case 'architecture':
        return 'border-cyan-500/50 text-cyan-300';
      case 'optimization':
        return 'border-emerald-500/50 text-emerald-300';
      case 'data':
        return 'border-blue-500/50 text-blue-300';
      case 'autonomy':
        return 'border-purple-500/50 text-purple-300';
      default:
        return 'border-zinc-700 text-zinc-300';
    }
  };

  const isPrerequisitesMet = (node: ResearchNode) => {
    return node.prerequisites.every(preId => {
      const p = state.researchTree.find(r => r.id === preId);
      return p && p.unlocked;
    });
  };

  return (
    <div className="flex flex-col h-full bg-[#070b12] border border-cyan-900/40 rounded-lg p-3 overflow-y-auto space-y-4 font-mono scrollbar-thin scrollbar-thumb-cyan-950">
      {/* Header */}
      <div className="flex flex-wrap items-center justify-between gap-2 border-b border-cyan-900/40 pb-2">
        <div className="flex items-center gap-2">
          <Sparkles className="w-4 h-4 text-cyan-400" />
          <h2 className="text-sm font-bold text-cyan-300 tracking-wider">
            {localize(state.language, 'ÁRBOL DE INVESTIGACIÓN // PAPERS CIENTÍFICOS & DISRUPCIÓN', 'RESEARCH TREE // SCIENTIFIC PAPERS & BREAKTHROUGHS')}
          </h2>
        </div>
        <div className="text-xs text-zinc-400">
          {localize(state.language, 'Saldo Disponible:', 'Available balance:')} <span className="text-amber-300 font-bold">${state.credits.toLocaleString()} CR</span>
        </div>
      </div>

      <p className="text-xs text-zinc-400 leading-relaxed">
        {localize(state.language, 'Desbloquea innovaciones de vanguardia en la literatura de machine learning: desde LoRA y FlashAttention-3 para reducir VRAM, hasta MoE y auto-modificación recursiva del código para iniciar el despegue hacia la Singularidad.', 'Unlock state-of-the-art machine-learning research: from LoRA and FlashAttention-3 for reducing VRAM use to MoE and recursive code optimization for the path to the Singularity.')}
      </p>

      {/* Tech Tree Nodes */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
        {state.researchTree.map(node => {
          const content = localizedResearch(state.language, node);
          const preMet = isPrerequisitesMet(node);
          const canAfford = state.credits >= node.costCredits;

          return (
            <div
              key={node.id}
              className={`p-3 rounded-lg border transition-all flex flex-col justify-between ${
                node.unlocked
                  ? 'bg-[#091522] border-cyan-500/60 shadow-[0_0_15px_rgba(0,255,200,0.06)]'
                  : preMet
                  ? 'bg-[#09111c] border-zinc-700'
                  : 'bg-zinc-950/80 border-zinc-900 opacity-60'
              }`}
            >
              <div>
                <div className="flex items-start justify-between gap-2">
                  <div className="flex items-center gap-2">
                    <span className={`px-2 py-0.5 rounded text-[10px] border font-bold uppercase ${getCategoryColor(node.category)}`}>
                      {localize(state.language, ({
                        architecture: 'Arquitectura',
                        optimization: 'Optimización',
                        data: 'Datos',
                        autonomy: 'Autonomía'
                      } as Record<string, string>)[node.category] || node.category, ({
                        architecture: 'Architecture',
                        optimization: 'Optimization',
                        data: 'Data',
                        autonomy: 'Autonomy'
                      } as Record<string, string>)[node.category] || node.category)}
                    </span>
                    <div className="flex items-center gap-2 flex-wrap">
                      <h3 className="font-bold text-xs text-zinc-100">{content.title}</h3>
                      {RESEARCH_DOCS[node.id] && (
                        <DocLinkBadge doc={RESEARCH_DOCS[node.id]} language={state.language} />
                      )}
                    </div>
                  </div>

                  {node.unlocked ? (
                    <span className="flex items-center gap-1 text-emerald-400 text-[11px] font-bold">
                      <CheckCircle2 className="w-3.5 h-3.5" />
                      {localize(state.language, 'INVESTIGADO', 'RESEARCHED')}
                    </span>
                  ) : (
                    <span className="text-xs font-bold text-amber-300">
                      ${node.costCredits.toLocaleString()} CR
                    </span>
                  )}
                </div>

                <p className="text-xs text-zinc-300 mt-2 leading-snug font-sans">
                  {content.effectDescription}
                </p>

                <div className="mt-2 p-2 rounded bg-[#060a10] border border-cyan-950/80 text-[10px] text-zinc-500">
                  <span className="text-cyan-400 font-semibold block">{localize(state.language, 'FUNDAMENTO TÉCNICO:', 'TECHNICAL BACKGROUND:')}</span>
                  {content.technicalLore}
                </div>

                {node.prerequisites.length > 0 && !node.unlocked && (
                  <div className="mt-2 text-[10px] text-zinc-500 flex items-center gap-1">
                    <GitBranch className="w-3 h-3 text-zinc-600" />
                    <span>{localize(state.language, 'Requisitos previos:', 'Prerequisites:')} </span>
                    <span className={preMet ? 'text-zinc-300' : 'text-red-400'}>
                      {node.prerequisites.map(p => {
                        const prerequisite = state.researchTree.find(r => r.id === p);
                        return prerequisite ? localizedResearch(state.language, prerequisite).title : '';
                      }).join(', ')}
                    </span>
                  </div>
                )}
              </div>

              {/* Action Button */}
              {!node.unlocked && (
                <div className="mt-3 pt-2 border-t border-zinc-800 flex items-center justify-end">
                  <button
                    onClick={() => unlockResearch(node.id)}
                    disabled={!preMet || !canAfford}
                    className={`py-1.5 px-3 rounded text-xs font-bold flex items-center gap-1.5 transition-all ${
                      preMet && canAfford
                        ? 'bg-cyan-500 hover:bg-cyan-400 text-zinc-950 cursor-pointer shadow-[0_0_10px_rgba(0,255,200,0.3)]'
                        : 'bg-zinc-800 text-zinc-500 cursor-not-allowed border border-zinc-700'
                    }`}
                  >
                    {!preMet ? (
                      <>
                        <Lock className="w-3.5 h-3.5" />
                        <span>{localize(state.language, 'BLOQUEADO POR REQUISITOS', 'PREREQUISITES NOT MET')}</span>
                      </>
                    ) : (
                      <>
                        <Unlock className="w-3.5 h-3.5" />
                        <span>{localize(state.language, 'FINANCIAR PAPER', 'FUND RESEARCH')} (${node.costCredits.toLocaleString()} CR)</span>
                      </>
                    )}
                  </button>
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
};
