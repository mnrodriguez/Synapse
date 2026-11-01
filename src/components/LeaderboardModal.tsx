/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useEffect, useState } from 'react';
import { useGame } from '../context/GameContext';
import { OperativeLeaderboard } from '../types/game';
import { Trophy, X, RefreshCw, Award, Cpu, Sparkles } from 'lucide-react';
import { sound } from '../audio/soundManager';
import { localize } from '../utils/i18n';

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
      <div className="bg-[#080d15] border border-cyan-800/80 rounded-lg max-w-2xl w-full max-h-[85vh] flex flex-col shadow-[0_0_30px_rgba(0,255,200,0.15)] overflow-hidden">
        {/* Header */}
        <div className="flex items-center justify-between p-3.5 bg-[#0b131f] border-b border-cyan-900/60">
          <div className="flex items-center gap-2">
            <Trophy className="w-4 h-4 text-yellow-400" />
            <h3 className="font-bold text-sm text-cyan-300 tracking-wider">
              {localize(state.language, 'MATRIZ GLOBAL DE OPERATIVOS // RANKING DE SINGULARIDAD', 'GLOBAL OPERATIVE MATRIX // SINGULARITY LEADERBOARD')}
            </h3>
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={() => { sound.playKeyClick(); loadData(); }}
              disabled={loading}
              className="p-1 rounded text-zinc-400 hover:text-cyan-300 transition-colors"
              title={localize(state.language, 'Actualizar ranking', 'Refresh leaderboard')}
            >
              <RefreshCw className={`w-3.5 h-3.5 ${loading ? 'animate-spin text-cyan-400' : ''}`} />
            </button>
            <button
              onClick={() => { sound.playNavSwitch(); onClose(); }}
              className="p-1 rounded text-zinc-400 hover:text-zinc-200"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* Content list */}
        <div className="flex-1 p-3.5 overflow-y-auto space-y-2 text-xs">
          <p className="text-zinc-400 text-[11px] mb-3">
            {localize(state.language, 'Agentes clasificados por su porcentaje de avance hacia la Singularidad Tecnológica y poder de cómputo en la red distribuida de Firestore.', 'Operatives ranked by Singularity progress and compute power on the distributed Firestore network.')}
          </p>

          {loading ? (
            <div className="py-12 text-center text-cyan-400 flex flex-col items-center gap-2">
              <RefreshCw className="w-6 h-6 animate-spin" />
              <span>{localize(state.language, 'Conectando con la base de datos en la nube...', 'Connecting to the cloud database...')}</span>
            </div>
          ) : leaders.length === 0 ? (
            <div className="py-8 text-center text-zinc-500">
              {localize(state.language, 'No hay agentes registrados aún. Inicia sesión con Google y haz clic en Guardar para registrar tu clúster.', 'No operatives are registered yet. Sign in with Google and save to register your cluster.')}
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
                        ? 'bg-cyan-950/70 border-cyan-400 shadow-[0_0_10px_rgba(0,255,200,0.2)]'
                        : idx === 0
                        ? 'bg-amber-950/40 border-amber-500/50'
                        : 'bg-zinc-900/60 border-zinc-800'
                    }`}
                  >
                    <div className="flex items-center gap-3">
                      <span className={`w-6 text-center font-bold font-mono ${
                        idx === 0 ? 'text-yellow-400 text-sm' : idx === 1 ? 'text-zinc-300' : idx === 2 ? 'text-amber-600' : 'text-zinc-600'
                      }`}>
                        #{idx + 1}
                      </span>
                      <div>
                        <div className="font-bold text-zinc-200 flex items-center gap-1.5">
                          <span>{op.callsign}</span>
                          {op.achievedSingularity && (
                            <span className="px-1.5 py-0.2 bg-purple-900 text-purple-200 rounded text-[9px] font-bold">
                              ASI
                            </span>
                          )}
                          {isCurrent && (
                            <span className="text-[10px] text-cyan-400">({localize(state.language, 'TÚ', 'YOU')})</span>
                          )}
                        </div>
                        <span className="text-[10px] text-zinc-500 block truncate max-w-[200px]">
                          {op.activeArchitecture || 'Transformer'}
                        </span>
                      </div>
                    </div>

                    <div className="flex items-center gap-4 text-right">
                      <div>
                        <span className="text-[10px] text-zinc-500 block">{localize(state.language, 'CÓMPUTO', 'COMPUTE')}</span>
                        <span className="text-cyan-300 font-bold">{op.computePFLOPS?.toFixed(4) || '0.0044'} PF</span>
                      </div>
                      <div className="w-20">
                        <span className="text-[10px] text-zinc-500 block">{localize(state.language, 'SINGULARIDAD', 'SINGULARITY')}</span>
                        <span className="text-purple-300 font-bold">{op.singularityProgress?.toFixed(1) || '0.0'}%</span>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="p-3 bg-[#0a111a] border-t border-cyan-900/40 text-[11px] text-zinc-500 flex items-center justify-between">
          <span>{localize(state.language, 'Tu récord actual:', 'Your current record:')} {state.singularityProgress.toFixed(1)}% | {state.totalComputePflops.toFixed(4)} PFLOPS</span>
          <button
            onClick={() => { sound.playNavSwitch(); onClose(); }}
            className="px-3 py-1 bg-zinc-800 hover:bg-zinc-700 text-zinc-300 rounded text-xs"
          >
            {localize(state.language, 'CERRAR', 'CLOSE')}
          </button>
        </div>
      </div>
    </div>
  );
};
