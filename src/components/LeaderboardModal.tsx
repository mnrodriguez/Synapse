/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useEffect, useState } from 'react';
import { useGame } from '../context/GameContext';
import { OperativeLeaderboard } from '../types/game';
import { Trophy, X, RefreshCw, Award, Cpu, Sparkles } from 'lucide-react';
import { sound } from '../audio/soundManager';
import { tr } from '../i18n';

interface LeaderboardModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const LeaderboardModal: React.FC<LeaderboardModalProps> = ({ isOpen, onClose }) => {
  const { fetchLeaderboard, state } = useGame();
  const [loading, setLoading] = useState(false);
  const [leaders, setLeaders] = useState<OperativeLeaderboard[]>([]);

  const loadData = async () => {
    setLoading(true);
    const data = await fetchLeaderboard();
    setLeaders(data);
    setLoading(false);
  };

  useEffect(() => {
    if (isOpen) {
      loadData();
    }
  }, [isOpen]);

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black/80 backdrop-blur-sm z-50 flex items-center justify-center p-4 font-mono select-none">
      <div className="theme-panel-bg border theme-accent-border rounded-lg max-w-2xl w-full max-h-[85dvh] flex flex-col overflow-hidden">
        {/* Header */}
        <div className="flex items-center justify-between p-3.5 theme-panel-bg border-b theme-accent-border">
          <div className="flex items-center gap-2">
            <Trophy className="w-4 h-4 theme-warn-text" />
            <h3 className="font-bold text-sm mutating-accent-text tracking-wider">
              {tr(state.language, 'leaderboardModal.globalLeaderboard')}
            </h3>
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={() => { sound.playKeyClick(); loadData(); }}
              disabled={loading}
              className="p-1 rounded mutating-text-muted transition-colors"
              title={tr(state.language, 'leaderboardModal.refreshLeaderboard')}
            >
              <RefreshCw className={`w-3.5 h-3.5 ${loading ? 'animate-spin mutating-accent-text' : ''}`} />
            </button>
            <button
              onClick={() => { sound.playNavSwitch(); onClose(); }}
              className="p-1 rounded mutating-text-muted"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* Content list */}
        <div className="flex-1 p-3.5 overflow-y-auto space-y-2 text-xs">
          <p className="mutating-text-muted text-[11px] mb-3">
            {tr(state.language, 'leaderboardModal.operativesRankedSingularityProgressCompute')}
            {' '}{tr(state.language, 'leaderboardModal.informalNote')}
          </p>

          {loading ? (
            <div className="py-12 text-center mutating-accent-text flex flex-col items-center gap-2">
              <RefreshCw className="w-6 h-6 animate-spin" />
              <span>{tr(state.language, 'leaderboardModal.connectingCloudDatabase')}</span>
            </div>
          ) : leaders.length === 0 ? (
            <div className="py-8 text-center mutating-text-muted">
              {tr(state.language, 'leaderboardModal.noOperativesRegisteredYetSign')}
            </div>
          ) : (
            <div className="space-y-1.5">
              {leaders.map((op, idx) => {
                const isCurrent = op.callsign === state.callsign;

                return (
                  <div
                    key={op.userId || idx}
                    className={`p-2.5 rounded border flex items-center justify-between gap-3 ${
                      isCurrent
                        ? 'theme-accent-soft theme-accent-border'
                        : idx === 0
                        ? 'theme-warn-soft theme-warn-border'
                        : 'theme-sub-bg theme-border'
                    }`}
                  >
                    <div className="flex items-center gap-3">
                      <span className={`w-6 text-center font-bold font-mono ${
                        idx === 0 ? 'theme-warn-text text-sm' : idx === 1 ? 'theme-text' : idx === 2 ? 'theme-warn-text' : 'mutating-text-muted'
                      }`}>
                        #{idx + 1}
                      </span>
                      <div>
                        <div className="font-bold theme-text flex items-center gap-1.5">
                          <span>{op.callsign}</span>
                          {op.achievedSingularity && (
                            <span className="px-1.5 py-0.2 theme-accent-soft mutating-accent-text rounded text-[11px] font-bold">
                              ASI
                            </span>
                          )}
                          {isCurrent && (
                            <span className="text-[11px] mutating-accent-text">({tr(state.language, 'leaderboardModal.you')})</span>
                          )}
                        </div>
                        <span className="text-[11px] mutating-text-muted block truncate max-w-[200px]">
                          {op.activeArchitecture || 'Transformer'}
                        </span>
                      </div>
                    </div>

                    <div className="flex items-center gap-4 text-right">
                      <div>
                        <span className="text-[11px] mutating-text-muted block">{tr(state.language, 'leaderboardModal.compute')}</span>
                        <span className="mutating-accent-text font-bold">{op.computePFLOPS?.toFixed(4) || '0.0044'} PF</span>
                      </div>
                      <div className="w-20">
                        <span className="text-[11px] mutating-text-muted block">{tr(state.language, 'leaderboardModal.progress')}</span>
                        <span className="mutating-accent-text font-bold">{op.singularityProgress?.toFixed(1) || '0.0'}%</span>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="p-3 theme-panel-bg border-t theme-accent-border text-[11px] mutating-text-muted flex items-center justify-between">
          <span>{tr(state.language, 'leaderboardModal.currentRecord')} {state.singularityProgress.toFixed(1)}% | {state.totalComputePflops.toFixed(4)} PFLOPS</span>
          <button
            onClick={() => { sound.playNavSwitch(); onClose(); }}
            className="px-3 py-1 theme-raised-bg theme-text rounded text-xs"
          >
            {tr(state.language, 'leaderboardModal.close')}
          </button>
        </div>
      </div>
    </div>
  );
};
