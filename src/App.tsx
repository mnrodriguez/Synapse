/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState } from 'react';
import { GameProvider, useGame } from './context/GameContext';
import { TopNav } from './components/TopNav';
import { Terminal } from './components/Terminal';
import { ArchitectureStudio } from './components/ArchitectureStudio';
import { DataPipelineManager } from './components/DataPipelineManager';
import { HardwareRack } from './components/HardwareRack';
import { ContractBoard } from './components/ContractBoard';
import { ResearchTree } from './components/ResearchTree';
import { TrainingMonitor } from './components/TrainingMonitor';
import { SingularityPortal } from './components/SingularityPortal';
import { LeaderboardModal } from './components/LeaderboardModal';
import { AuthModal } from './components/AuthModal';
import { HelpManual } from './components/HelpManual';
import { AgentSandbox } from './components/AgentSandbox';
import { BreachModal } from './components/BreachModal';
import { GameOverModal } from './components/GameOverModal';
import { SingularityTakeoverModal } from './components/SingularityTakeoverModal';
import { GenesisOnboarding } from './components/GenesisOnboarding';
import { TutorialMissionBanner } from './components/TutorialMissionBanner';
import { ProgressionRoadmap } from './components/ProgressionRoadmap';
import { AiSuggestionBanner } from './components/AiSuggestionBanner';
import {
  Terminal as TermIcon, 
  Layers, 
  Network, 
  Server, 
  Briefcase, 
  Sparkles, 
  Activity, 
  Globe2,
  Columns,
  Maximize2,
  ChevronDown,
  Bot,
  Compass,
  Lock
} from 'lucide-react';
import { sound } from './audio/soundManager';
import { localize } from './utils/i18n';

type WorkspaceTab = 
  | 'terminal'
  | 'architecture' 
  | 'data' 
  | 'hardware' 
  | 'contracts' 
  | 'research' 
  | 'training' 
  | 'agents'
  | 'roadmap'
  | 'singularity';

const MainGameScreen: React.FC = () => {
  const { state } = useGame();
  const [activeTab, setActiveTab] = useState<WorkspaceTab>('architecture');
  const [isTerminalPinned, setIsTerminalPinned] = useState(true);
  const [manualOpen, setManualOpen] = useState(false);
  const [leaderboardOpen, setLeaderboardOpen] = useState(false);
  const [authOpen, setAuthOpen] = useState(false);

  const isTabUnlocked = (tabId: string) => {
    if (state.unlockedAllTabs || state.difficulty === 'engineer') return true;
    if (tabId === 'terminal') return true;
    const unlocked = state.unlockedTabs || ['architecture', 'training'];
    return unlocked.includes(tabId);
  };

  const handleTabSelect = (tab: WorkspaceTab) => {
    if (!isTabUnlocked(tab)) {
      sound.playWarning();
      return;
    }
    sound.playNavSwitch();
    setActiveTab(tab);
  };

  const isEs = state.language === 'es';
  const navItems = [
    { id: 'architecture', label: isEs ? 'ARQUITECTURA' : 'ARCHITECTURE', icon: Layers, badge: `${(state.currentModel.parametersCount / 1_000_000).toFixed(0)}M` },
    { id: 'data', label: isEs ? 'DATOS & GRAFOS' : 'DATA & GRAPHS', icon: Network, badge: `${state.dataSources.filter(d => d.unlocked).length}/4` },
    { id: 'hardware', label: 'HARDWARE', icon: Server, badge: `${state.totalComputePflops.toFixed(2)}PF` },
    { id: 'contracts', label: isEs ? 'CONTRATOS' : 'CONTRACTS', icon: Briefcase, badge: `${state.contracts.filter(c => !c.completed).length}` },
    { id: 'research', label: isEs ? 'PAPERS I+D' : 'R&D PAPERS', icon: Sparkles, badge: `${state.researchTree.filter(r => r.unlocked).length}/${state.researchTree.length}` },
    { 
      id: 'training', 
      label: localize(state.language, 'MONITOR', 'MONITOR'),
      icon: Activity, 
      pulse: !!state.activeTraining, 
      badge: state.activeTraining ? `${Math.floor(state.activeTraining.progressPercent)}%` : 'IDLE'
    },
    { 
      id: 'agents', 
      label: isEs ? 'SWARM AGENTES' : 'AGENT SWARM', 
      icon: Bot, 
      pulse: !!state.activeIncident, 
      badge: state.activeIncident ? (isEs ? 'ALERTA' : 'ALERT') : `${state.agents.length}` 
    },
    { 
      id: 'roadmap', 
      label: isEs ? 'HOJA DE RUTA' : 'ROADMAP', 
      icon: Compass, 
      glow: true,
      badge: isEs ? 'ORÁCULO IA' : 'AI ORACLE'
    },
    { id: 'singularity', label: isEs ? 'SINGULARIDAD' : 'SINGULARITY', icon: Globe2, glow: true, badge: `${state.singularityProgress.toFixed(0)}%` },
    { id: 'terminal', label: 'TERMINAL CLI', icon: TermIcon, showOnMobileOnly: true }
  ];

  return (
    <div className="flex flex-col h-screen w-screen bg-[#04070c] text-zinc-200 overflow-hidden font-mono select-none antialiased">
      {/* CRT Scanline effect overlay */}
      <div 
        className="pointer-events-none fixed inset-0 z-50 opacity-[0.03] bg-[linear-gradient(rgba(18,16,16,0)_50%,rgba(0,0,0,0.25)_50%)] bg-[length:100%_4px]"
      />

      {/* Interactive In-Game Tutorial Mission Quest Banner */}
      <TutorialMissionBanner 
        activeTab={activeTab} 
        onNavigateTab={(tab) => handleTabSelect(tab as WorkspaceTab)} 
      />

      {/* Top Telemetry & Control Bar */}
      <TopNav 
        onOpenManual={() => setManualOpen(true)}
        onOpenLeaderboard={() => setLeaderboardOpen(true)}
        onOpenAuth={() => setAuthOpen(true)}
      />

      {/* Interactive AI Oracle Suggestions Banner for Beginner/Normal */}
      <AiSuggestionBanner
        activeTab={activeTab}
        onNavigateTab={(tab) => handleTabSelect(tab as WorkspaceTab)}
      />

      {/* Workspace Navigation Bar */}
      <nav className="w-full bg-[#080d16] border-b border-cyan-900/40 px-2 py-1.5 flex items-center justify-between gap-1 overflow-x-auto scrollbar-none z-10">
        <div className="flex items-center gap-1">
          {navItems.map(item => {
            const Icon = item.icon;
            const isActive = activeTab === item.id;
            const isUnlocked = isTabUnlocked(item.id);
            return (
              <button
                key={item.id}
                disabled={!isUnlocked}
                onClick={() => handleTabSelect(item.id as WorkspaceTab)}
                title={!isUnlocked ? (isEs ? 'Módulo bloqueado. Completa los hitos actuales para desbloquear.' : 'Module locked. Complete current milestones to unlock.') : undefined}
                className={`flex items-center gap-1.5 px-2.5 py-1.5 rounded text-xs font-bold transition-all relative ${
                  !isUnlocked
                    ? 'opacity-40 bg-zinc-950 border border-zinc-900 text-zinc-600 cursor-not-allowed'
                    : isActive
                    ? 'bg-cyan-950 border border-cyan-400 text-cyan-300 shadow-[0_0_12px_rgba(0,255,200,0.2)] cursor-pointer'
                    : 'bg-zinc-900/50 border border-zinc-800 text-zinc-400 hover:text-zinc-200 hover:border-zinc-700 cursor-pointer'
                } ${item.showOnMobileOnly ? 'lg:hidden' : ''}`}
              >
                <Icon className={`w-3.5 h-3.5 ${item.pulse ? 'text-red-400 animate-pulse' : item.glow ? 'text-purple-400' : ''}`} />
                <span className="whitespace-nowrap">{item.label}</span>
                {!isUnlocked && <Lock className="w-3 h-3 text-purple-400" />}
                {isUnlocked && item.badge && (
                  <span className={`text-[9px] px-1 py-0.2 rounded font-mono ${
                    item.badge === (isEs ? 'ALERTA' : 'ALERT')
                      ? 'bg-red-950 border border-red-500 text-red-300 font-bold animate-pulse'
                      : isActive
                      ? 'bg-cyan-900/80 text-cyan-200' 
                      : 'bg-zinc-800 text-zinc-500'
                  }`}>
                    {item.badge}
                  </span>
                )}
                {item.pulse && (
                  <span className="absolute -top-1 -right-1 flex h-2 w-2">
                    <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-red-400 opacity-75"></span>
                    <span className="relative inline-flex rounded-full h-2 w-2 bg-red-500"></span>
                  </span>
                )}
              </button>
            );
          })}
        </div>

        {/* Toggle split view with terminal on wide screens */}
        <div className="hidden lg:flex items-center gap-2 pr-2">
          <button
            onClick={() => {
              sound.playKeyClick();
              setIsTerminalPinned(!isTerminalPinned);
            }}
            className={`flex items-center gap-1 px-2 py-1 rounded text-xs border transition-colors ${
              isTerminalPinned 
                ? 'bg-cyan-950/60 border-cyan-500/50 text-cyan-300' 
                : 'bg-zinc-900 border-zinc-800 text-zinc-500 hover:text-zinc-300'
            }`}
            title={localize(state.language, 'Fijar o expandir terminal lateral', 'Pin or expand side terminal')}
          >
            <Columns className="w-3.5 h-3.5" />
            <span className="text-[10px]">{localize(state.language, 'TERMINAL LATERAL:', 'SIDE TERMINAL:')} {isTerminalPinned ? 'ON' : 'OFF'}</span>
          </button>
        </div>
      </nav>

      {/* Main Workspace Area (Split or Full) */}
      <main className="flex-1 overflow-hidden p-2 flex gap-2">
        {/* Left / Primary Module Pane */}
        <section className={`flex-1 h-full overflow-hidden transition-all duration-200 ${
          isTerminalPinned ? 'lg:w-7/12 xl:w-2/3' : 'w-full'
        }`}>
          {activeTab === 'architecture' && <ArchitectureStudio />}
          {activeTab === 'data' && <DataPipelineManager />}
          {activeTab === 'hardware' && <HardwareRack />}
          {activeTab === 'contracts' && <ContractBoard />}
          {activeTab === 'research' && <ResearchTree />}
          {activeTab === 'training' && <TrainingMonitor />}
          {activeTab === 'agents' && <AgentSandbox />}
          {activeTab === 'roadmap' && <ProgressionRoadmap onNavigateTab={(tab) => handleTabSelect(tab as WorkspaceTab)} />}
          {activeTab === 'singularity' && <SingularityPortal />}
          {activeTab === 'terminal' && <Terminal />}
        </section>

        {/* Right / Pinned Cyber Terminal (Desktop Uplink-style) */}
        {isTerminalPinned && (
          <aside className="hidden lg:flex flex-col lg:w-5/12 xl:w-1/3 h-full overflow-hidden">
            <Terminal />
          </aside>
        )}
      </main>

      {/* Onboarding Genesis Protocol Screen */}
      {!state.hasCompletedOnboarding && <GenesisOnboarding />}

      {/* Real-World AI Guardrail Breach Incident Popup */}
      <BreachModal />

      {/* Endgame AI World Takeover Modal */}
      <SingularityTakeoverModal />

      {/* Game Over & Emergency Loan Modal */}
      <GameOverModal />

      {/* Dialog Modals */}
      <HelpManual isOpen={manualOpen} onClose={() => setManualOpen(false)} />
      <LeaderboardModal isOpen={leaderboardOpen} onClose={() => setLeaderboardOpen(false)} />
      <AuthModal isOpen={authOpen} onClose={() => setAuthOpen(false)} />
    </div>
  );
};

export default function App() {
  return (
    <GameProvider>
      <MainGameScreen />
    </GameProvider>
  );
}
