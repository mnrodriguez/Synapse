/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useRef, useEffect } from 'react';
import { useGame } from '../context/GameContext';
import { Terminal as TerminalIcon, CornerDownLeft, Trash2, Cpu, Database, Briefcase, Zap } from 'lucide-react';
import { sound } from '../audio/soundManager';
import { localize } from '../utils/i18n';
import { VERSION_PROFILES } from '../utils/versionProfiles';

export const Terminal: React.FC = () => {
  const { state, executeTerminalCommand, addLog } = useGame();
  // Story texts of the active UI version (early versions must not name the end goal).
  const story = VERSION_PROFILES[state.language === 'es' ? 'es' : 'en'][(state.uiVersion || 1) as 1 | 2 | 3 | 4].story;
  const [input, setInput] = useState('');
  const [history, setHistory] = useState<string[]>([]);
  const [historyIndex, setHistoryIndex] = useState<number>(-1);
  const logContainerRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const getLogMessage = (log: (typeof state.logs)[number]) => {
    if (log.id === 'log_0') {
      return localize(
        state.language,
        'Terminal SYNAPSE v4.19.0-alpha inicializada. Interfaz segura montada.',
        'SYNAPSE Terminal v4.19.0-alpha initialized. Secure interface mounted.'
      );
    }
    if (log.id === 'log_1') {
      // The objective line is rewritten by each UI version: the real goal only appears in v4.
      return story.objectiveLog;
    }
    if (log.id === 'log_2') {
      return localize(
        state.language,
        'Hardware y clúster listos. Laboratorio de Agentes y Red de Guardrails inicializados.',
        'Hardware and cluster ready. Agent Lab and Guardrail Network initialized.'
      );
    }
    return log.message;
  };

  // Auto-scroll on new logs
  useEffect(() => {
    if (logContainerRef.current) {
      logContainerRef.current.scrollTop = logContainerRef.current.scrollHeight;
    }
  }, [state.logs]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!input.trim()) return;

    const trimmed = input.trim();
    setHistory(prev => [trimmed, ...prev.slice(0, 40)]);
    setHistoryIndex(-1);

    // Echo command
    addLog(`> ${trimmed}`, 'system');

    // Run command
    const output = executeTerminalCommand(trimmed);
    if (output) {
      addLog(output, 'info');
    }

    setInput('');
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    sound.playKeyClick();
    if (e.key === 'ArrowUp') {
      e.preventDefault();
      if (history.length > 0 && historyIndex < history.length - 1) {
        const nextIdx = historyIndex + 1;
        setHistoryIndex(nextIdx);
        setInput(history[nextIdx]);
      }
    } else if (e.key === 'ArrowDown') {
      e.preventDefault();
      if (historyIndex > 0) {
        const nextIdx = historyIndex - 1;
        setHistoryIndex(nextIdx);
        setInput(history[nextIdx]);
      } else if (historyIndex === 0) {
        setHistoryIndex(-1);
        setInput('');
      }
    } else if (e.key === 'Tab') {
      e.preventDefault();
      // Auto-complete suggestions
      const commands = ['status', 'train', 'abort', 'hardware', 'buy', 'data', 'unlock', 'contracts', 'run', 'scrub', 'shadow', 'query', 'swarm', 'save', 'clear', 'singularity', 'lore', 'manual', 'guide', 'help'];
      const match = commands.find(c => c.startsWith(input.toLowerCase().trim()));
      if (match) {
        setInput(match);
      }
    }
  };

  const runShortcut = (cmd: string) => {
    sound.playKeyClick();
    addLog(`> ${cmd}`, 'system');
    const out = executeTerminalCommand(cmd);
    if (out) addLog(out, 'info');
  };

  // Color mapping for terminal log types
  const getLogStyle = (type: string) => {
    switch (type) {
      case 'success':
        return 'text-emerald-400';
      case 'warning':
        return 'text-amber-400 font-semibold';
      case 'danger':
        return 'text-red-400 font-bold bg-red-950/20 px-1 rounded';
      case 'system':
        return 'text-cyan-300 font-mono opacity-90';
      case 'lore':
        return 'text-purple-300 italic';
      default:
        return 'text-zinc-300';
    }
  };

  return (
    <div className="flex flex-col h-full mutating-panel border rounded-lg overflow-hidden font-mono shadow-sm">
      {/* Terminal Title Bar */}
      <div className="flex items-center justify-between px-3 py-1.5 mutating-sub border-b text-xs select-none">
        <div className="flex items-center gap-2">
          <TerminalIcon className="w-3.5 h-3.5 mutating-accent-text" />
          <span className="mutating-accent-text font-bold tracking-wider">NEURO-TERMINAL // BASH-X</span>
          <span className="text-[10px] mutating-text-muted">tty1:connected</span>
        </div>
        
        {/* Quick Shortcut Buttons */}
        <div className="flex items-center gap-1.5 overflow-x-auto">
          <button 
            onClick={() => runShortcut('status')}
            className="px-1.5 py-0.5 text-[10px] bg-cyan-950/40 hover:bg-cyan-900/60 text-cyan-300 rounded border border-cyan-800/40 transition-colors"
          >
            status
          </button>
          <button 
            onClick={() => runShortcut('train')}
            className="px-1.5 py-0.5 text-[10px] bg-emerald-950/40 hover:bg-emerald-900/60 text-emerald-300 rounded border border-emerald-800/40 transition-colors"
          >
            train
          </button>
          <button 
            onClick={() => runShortcut('contracts')}
            className="px-1.5 py-0.5 text-[10px] bg-amber-950/40 hover:bg-amber-900/60 text-amber-300 rounded border border-amber-800/40 transition-colors"
          >
            gigs
          </button>
          <button 
            onClick={() => runShortcut('singularity')}
            className="px-1.5 py-0.5 text-[10px] bg-purple-950/40 hover:bg-purple-900/60 text-purple-300 rounded border border-purple-800/40 transition-colors"
          >
            singularity
          </button>
          <button 
            onClick={() => runShortcut('clear')}
            className="p-1 text-zinc-500 hover:text-zinc-300 transition-colors"
            title={localize(state.language, 'Limpiar terminal', 'Clear terminal')}
          >
            <Trash2 className="w-3 h-3" />
          </button>
        </div>
      </div>

      {/* Log Feed */}
      <div 
        ref={logContainerRef}
        className="flex-1 p-3 overflow-y-auto space-y-1.5 text-xs select-text scrollbar-thin scrollbar-thumb-cyan-950 scrollbar-track-transparent"
        style={{ scrollBehavior: 'smooth' }}
      >
        <div className="text-[11px] text-cyan-500/80 mb-2 border-b border-cyan-950/80 pb-2">
          === SYNAPSE NEURAL COMPUTING KERNEL v4.19 (x86_64-quantum-arch) ===<br />
          {localize(state.language, 'Escribe', 'Type')} <span className="text-cyan-300 font-bold">help</span> {localize(state.language, 'para ver todos los comandos disponibles o utiliza los paneles modulares superiores.', 'to see all available commands, or use the modules above.')}
        </div>

        {state.logs.slice().reverse().map(log => (
          <div key={log.id} className="flex items-start gap-2 leading-relaxed break-words font-mono">
            <span className="text-zinc-600 text-[10px] select-none shrink-0 font-mono">[{log.timestamp}]</span>
            <span className={`flex-1 whitespace-pre-wrap ${getLogStyle(log.type)}`}>
              {getLogMessage(log)}
            </span>
          </div>
        ))}
      </div>

      {/* Interactive Command Input */}
      <form onSubmit={handleSubmit} className="p-2 mutating-sub border-t flex items-center gap-2">
        <span className="mutating-accent-text font-bold text-xs select-none pl-1 flex items-center gap-1">
          <span>{state.callsign}</span>@synapse:~$
        </span>
        <input
          ref={inputRef}
          type="text"
          value={input}
          onChange={(e) => setInput(e.target.value)}
          onKeyDown={handleKeyDown}
          placeholder={localize(state.language, "Escribe 'help', 'train', 'hardware', 'buy <id>'...", "Type 'help', 'train', 'hardware', or 'buy <id>'...")}
          className="flex-1 bg-transparent border-none outline-none text-xs font-mono placeholder:opacity-50 focus:ring-0"
          autoFocus
        />
        <button
          type="submit"
          className="px-2 py-1 mutating-btn-primary rounded text-xs flex items-center gap-1 transition-all cursor-pointer font-bold"
        >
          <CornerDownLeft className="w-3 h-3" />
          <span className="hidden sm:inline text-[10px]">{localize(state.language, 'EJEC', 'EXEC')}</span>
        </button>
      </form>
    </div>
  );
};
