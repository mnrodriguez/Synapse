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
  Layers,
  Clock
} from 'lucide-react';
import { sound } from '../audio/soundManager';
import { localizedResearch } from '../utils/gameContentI18n';
import { RESEARCH_DOCS } from '../utils/aiDocumentation';
import { DocLinkBadge } from './DocLinkBadge';
import { tr, type CatalogKey } from '../i18n';

const CATEGORY_KEYS: Record<string, CatalogKey> = {
  architecture: 'researchTree.category.architecture',
  optimization: 'researchTree.category.optimization',
  data: 'researchTree.category.data',
  autonomy: 'researchTree.category.autonomy'
};

export const ResearchTree: React.FC = () => {
  const { state, unlockResearch } = useGame();

  const getCategoryColor = (cat: string) => {
    switch (cat) {
      case 'architecture':
        return 'theme-accent-border mutating-accent-text';
      case 'optimization':
        return 'theme-success-border theme-success-text';
      case 'data':
        return 'theme-accent-border mutating-accent-text';
      case 'autonomy':
        return 'theme-accent-border mutating-accent-text';
      default:
        return 'theme-border theme-text';
    }
  };

  const isPrerequisitesMet = (node: ResearchNode) => {
    return node.prerequisites.every(preId => {
      const p = state.researchTree.find(r => r.id === preId);
      return p && p.unlocked;
    });
  };

  return (
    <div className="flex flex-col h-full mutating-panel border rounded-lg p-3 overflow-y-auto space-y-4 font-mono">
      {/* Header */}
      <div className="flex flex-wrap items-center justify-between gap-2 border-b theme-accent-border pb-2">
        <div className="flex items-center gap-2">
          <Sparkles className="w-4 h-4 mutating-accent-text" />
          <h2 className="text-sm font-bold mutating-accent-text tracking-wider">
            {tr(state.language, 'researchTree.researchTreeScientificPapersBreakthroughs')}
          </h2>
        </div>
        <div className="flex flex-wrap gap-3 text-xs mutating-text-muted">
          <span>
            {tr(state.language, 'researchTree.availableBalance')} <span className="theme-warn-text font-bold">${state.credits.toLocaleString()} CR</span>
          </span>
          <span className="flex items-center gap-1">
            <Clock className="h-3 w-3 mutating-accent-text" />
            {tr(state.language, 'researchTree.campaignDay')} <strong className="mutating-accent-text">{state.campaignDays + 1}</strong>
          </span>
        </div>
      </div>

      <p className="text-xs mutating-text-muted leading-relaxed">
        {tr(state.language, 'researchTree.technologyFollowsProgressionInspiredPublished')}
      </p>

      {/* Stage-Adapted Funding Protocol Banner */}
      <div className="p-2.5 rounded theme-accent-soft border theme-accent-border text-[11px] font-mono flex items-center justify-between gap-2">
        <div className="flex items-center gap-2">
          <Zap className="w-4 h-4 mutating-accent-text shrink-0" />
          <span className="mutating-accent-text font-bold">
            {state.uiVersion === 4 ? (
              tr(state.language, 'researchTree.v40CompilationModeDirect')
            ) : state.uiVersion === 3 ? (
              tr(state.language, 'researchTree.v30CovertProtocolSwarm')
            ) : state.uiVersion === 2 ? (
              tr(state.language, 'researchTree.v20ProMechanismGithub')
            ) : (
              tr(state.language, 'researchTree.v10ResearchFundCommunity')
            )}
          </span>
        </div>
      </div>

      {/* Tech Tree Nodes */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
        {[...state.researchTree]
          .sort((a, b) => (a.availableAfterDays ?? 0) - (b.availableAfterDays ?? 0))
          .map(node => {
          const content = localizedResearch(state.language, node);
          const preMet = isPrerequisitesMet(node);
          const canAfford = state.credits >= node.costCredits;

          return (
            <div
              key={node.id}
              className={`p-3 rounded-lg border transition-all flex flex-col justify-between ${
                node.unlocked
                  ? 'theme-panel-bg theme-accent-border'
                  : preMet
                  ? 'theme-panel-bg theme-border'
                  : 'theme-sub-bg theme-border opacity-60'
              }`}
            >
              <div>
                <div className="flex items-start justify-between gap-2">
                  <div className="flex items-center gap-2">
                    <span className={`px-2 py-0.5 rounded text-[11px] border font-bold uppercase ${getCategoryColor(node.category)}`}>
                      {(CATEGORY_KEYS[node.category] ? tr(state.language, CATEGORY_KEYS[node.category]) : node.category)}
                    </span>
                    <div className="flex items-center gap-2 flex-wrap">
                      <h3 className="font-bold text-xs theme-text">{content.title}</h3>
                      {RESEARCH_DOCS[node.id] && (
                        <DocLinkBadge doc={RESEARCH_DOCS[node.id]} language={state.language} />
                      )}
                    </div>
                  </div>

                  {node.unlocked ? (
                    <span className="flex items-center gap-1 theme-success-text text-[11px] font-bold">
                      <CheckCircle2 className="w-3.5 h-3.5" />
                      {tr(state.language, 'researchTree.researched')}
                    </span>
                  ) : (
                    <span className="text-xs font-bold theme-warn-text">
                      ${node.costCredits.toLocaleString()} CR
                    </span>
                  )}
                </div>

                <p className="text-xs theme-text mt-2 leading-snug font-sans">
                  {content.effectDescription}
                </p>

                <div className="mt-2 flex flex-wrap gap-2 text-[11px]">
                  {node.releaseYear && (
                    <span className={`rounded border px-1.5 py-0.5 ${
                      node.releaseYear > 2026
                        ? 'theme-accent-border mutating-accent-text'
                        : 'theme-border mutating-text-muted'
                    }`}>
                      {node.releaseYear > 2026
                        ? tr(state.language, 'researchTree.projected', { releaseYear: node.releaseYear })
                        : tr(state.language, 'researchTree.milestone', { releaseYear: node.releaseYear })}
                    </span>
                  )}
                  {node.availableAfterDays !== undefined && !node.unlocked && (
                    <span className={state.campaignDays >= node.availableAfterDays ? 'theme-success-text' : 'mutating-accent-text'}>
                      {state.campaignDays >= node.availableAfterDays
                        ? tr(state.language, 'researchTree.timelineAvailabilityReached')
                        : tr(state.language, 'researchTree.timelineUnlockDayDays', { availableAfterDays: node.availableAfterDays + 1, campaignDays: node.availableAfterDays - state.campaignDays }) }
                    </span>
                  )}
                </div>

                <div className="mt-2 p-2 rounded theme-panel-bg border theme-accent-border text-[11px] mutating-text-muted">
                  <span className="mutating-accent-text font-semibold block">{tr(state.language, 'researchTree.technicalBackground')}</span>
                  {content.technicalLore}
                </div>

                {node.prerequisites.length > 0 && !node.unlocked && (
                  <div className="mt-2 text-[11px] mutating-text-muted flex items-center gap-1">
                    <GitBranch className="w-3 h-3 mutating-text-muted" />
                    <span>{tr(state.language, 'researchTree.prerequisites')} </span>
                    <span className={preMet ? 'theme-text' : 'theme-danger-text'}>
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
                <div className="mt-3 pt-2 border-t theme-border flex items-center justify-end">
                  <button
                    onClick={() => unlockResearch(node.id)}
                    disabled={!preMet || !canAfford}
                    className={`py-1.5 px-3 rounded text-xs font-bold flex items-center gap-1.5 transition-all ${
                      preMet && canAfford
                        ? 'mutating-btn-primary theme-on-accent cursor-pointer'
                        : 'theme-raised-bg mutating-text-muted cursor-not-allowed border theme-border'
                    }`}
                  >
                    {!preMet ? (
                      <>
                        <Lock className="w-3.5 h-3.5" />
                        <span>{tr(state.language, 'researchTree.prerequisitesNotMet')}</span>
                      </>
                    ) : (
                      <>
                        <Unlock className="w-3.5 h-3.5" />
                        <span>{tr(state.language, 'researchTree.fundResearch')} (${node.costCredits.toLocaleString()} CR)</span>
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
