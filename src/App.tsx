/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { Suspense, lazy, useState } from 'react';
import { GameProvider, useGame } from './context/GameContext';
import { TopNav } from './components/TopNav';
import { BentoHUD } from './components/BentoHUD';
import { TrojanUpgradeModal } from './components/TrojanUpgradeModal';
import { TrainingReportModal } from './components/TrainingReportModal';
import { StoryEventModal } from './components/StoryEventModal';
import { ContainmentEndingModal } from './components/ContainmentEndingModal';
import { BreachModal } from './components/BreachModal';
import { GameOverModal } from './components/GameOverModal';
import { SingularityTakeoverModal } from './components/SingularityTakeoverModal';
import { SingularityCrisisModal } from './components/SingularityCrisisModal';
import { TutorialMissionBanner } from './components/TutorialMissionBanner';
import {
  Layers, 
  Activity, 
  Server, 
  Database, 
  Briefcase, 
  Users, 
  Sparkles, 
  Globe, 
  Terminal as TermIcon,
  ShieldAlert,
  Power,
  Lock,
  MoreHorizontal
} from 'lucide-react';
import { sound } from './audio/soundManager';
import { localize } from './utils/i18n';
import { VERSION_PROFILES } from './utils/versionProfiles';
import { tierForUiVersion } from './utils/missionTiers';
import { toDisplayProgress, UiVersion } from './utils/singularityGoals';
import { formatCompute } from './utils/training';

// Tabs and large dialogs load on demand, so the first screen does not wait for the whole game.
const lazyNamed = <K extends string>(loader: () => Promise<Record<K, React.ComponentType<any>>>, name: K) =>
  lazy(() => loader().then(module => ({ default: module[name] })));
const Terminal = lazyNamed(() => import('./components/Terminal'), 'Terminal');
const ArchitectureStudio = lazyNamed(() => import('./components/ArchitectureStudio'), 'ArchitectureStudio');
const DataPipelineManager = lazyNamed(() => import('./components/DataPipelineManager'), 'DataPipelineManager');
const HardwareRack = lazyNamed(() => import('./components/HardwareRack'), 'HardwareRack');
const ContractBoard = lazyNamed(() => import('./components/ContractBoard'), 'ContractBoard');
const ResearchTree = lazyNamed(() => import('./components/ResearchTree'), 'ResearchTree');
const TrainingMonitor = lazyNamed(() => import('./components/TrainingMonitor'), 'TrainingMonitor');
const SingularityPortal = lazyNamed(() => import('./components/SingularityPortal'), 'SingularityPortal');
const LeaderboardModal = lazyNamed(() => import('./components/LeaderboardModal'), 'LeaderboardModal');
const AuthModal = lazyNamed(() => import('./components/AuthModal'), 'AuthModal');
const HelpManual = lazyNamed(() => import('./components/HelpManual'), 'HelpManual');
const AgentSandbox = lazyNamed(() => import('./components/AgentSandbox'), 'AgentSandbox');
const GenesisOnboarding = lazyNamed(() => import('./components/GenesisOnboarding'), 'GenesisOnboarding');

type WorkspaceTab = 
  | 'architecture' 
  | 'training' 
  | 'hardware' 
  | 'data' 
  | 'contracts' 
  | 'agents' 
  | 'research' 
  | 'singularity'
  | 'terminal';

const MainGameScreen: React.FC = () => {
  const { state, attemptEmergencyReset } = useGame();
  const [activeTab, setActiveTab] = useState<WorkspaceTab>('architecture');
  const [manualOpen, setManualOpen] = useState(false);
  const [leaderboardOpen, setLeaderboardOpen] = useState(false);
  const [authOpen, setAuthOpen] = useState(false);
  // Phones only show five tabs in the bottom bar; the rest live in this sheet.
  const [moreOpen, setMoreOpen] = useState(false);

  const lang = state.language === 'es' ? 'es' : 'en';
  const ver = state.uiVersion || 1;
  const p = VERSION_PROFILES[lang][ver];

  const handleTabSelect = (tab: WorkspaceTab) => {
    sound.playNavSwitch();
    setActiveTab(tab);
  };

  const navItemsCat1 = [
    { 
      id: 'architecture' as WorkspaceTab, 
      label: p.tabs.architecture, 
      icon: Layers, 
      badge: `${(state.currentModel.parametersCount / 1_000_000).toFixed(0)}M` 
    },
    { 
      id: 'training' as WorkspaceTab, 
      label: p.tabs.training,
      icon: Activity, 
      pulse: !!state.activeTraining, 
      badge: state.activeTraining ? `${Math.floor(state.activeTraining.progressPercent)}%` : 'IDLE'
    },
    { 
      id: 'hardware' as WorkspaceTab, 
      label: p.tabs.hardware, 
      icon: Server, 
      badge: formatCompute(state.totalComputePflops, true) 
    },
    { 
      id: 'data' as WorkspaceTab, 
      label: p.tabs.data, 
      icon: Database, 
      badge: `${state.dataSources.filter(d => d.unlocked).length}/4` 
    }
  ];

  const navItemsCat2 = [
    { 
      id: 'contracts' as WorkspaceTab, 
      label: p.tabs.contracts, 
      icon: Briefcase, 
      // Same count as the board: open contracts of this version's tier.
      badge: `${state.contracts.filter(c => !c.completed && c.tier === tierForUiVersion(ver)).length}` 
    },
    { 
      id: 'agents' as WorkspaceTab, 
      label: p.tabs.agents, 
      icon: Users, 
      pulse: !!state.activeIncident, 
      badge: state.activeIncident ? (lang === 'es' ? 'ALERTA' : 'ALERT') : `${state.agents.length}` 
    },
    { 
      id: 'research' as WorkspaceTab, 
      label: p.tabs.research, 
      icon: Sparkles, 
      badge: `${state.researchTree.filter(r => r.unlocked).length}/${state.researchTree.length}` 
    },
    { 
      id: 'singularity' as WorkspaceTab, 
      label: p.tabs.singularity, 
      icon: Globe, 
      badge: `${toDisplayProgress(ver as UiVersion, state.singularityProgress).toFixed(0)}%` 
    },
    { 
      id: 'terminal' as WorkspaceTab, 
      label: p.tabs.terminal, 
      icon: TermIcon 
    }
  ];

  // Bottom bar label: first word, or two when the first is very short ("Mi PC", not "Mi").
  const shortTab = (label: string) => {
    const words = label.split(' ');
    return words[0].length <= 3 && words[1] ? `${words[0]} ${words[1]}` : words[0];
  };
  const BOTTOM_BAR_TABS: WorkspaceTab[] = ['architecture', 'training', 'hardware', 'contracts', 'agents'];
  const moreNavItems = [...navItemsCat1, ...navItemsCat2].filter(item => !BOTTOM_BAR_TABS.includes(item.id));

  return (
    <div 
      id="app-shell"
      data-ui-version={ver}
      className="flex flex-col h-screen w-screen mutating-app-shell overflow-hidden select-none antialiased relative"
    >
      {/* CRT Scanlines Overlay (Visible in v3/v4) */}
      <div className="crt-overlay absolute inset-0 z-40 pointer-events-none" />

      {/* Hostile Vignette Overlay (Visible in v3/v4) */}
      <div className="hostile-vignette absolute inset-0 z-40 pointer-events-none" />

      {/* Diegetic Header Top Bar */}
      <TopNav 
        onOpenManual={() => setManualOpen(true)}
        onOpenLeaderboard={() => setLeaderboardOpen(true)}
        onOpenAuth={() => setAuthOpen(true)}
      />

      {/* Bento HUD & Whispering Co-Pilot Banner */}
      {/* No z-index here: the workspace layer (z-10) must paint above the HUD so modals opened from it cover the HUD too. */}
      <div className="px-3 pt-2 shrink-0">
        <BentoHUD />
      </div>

      {/* Tutorial mission quest banner if tutorial is active */}
      <TutorialMissionBanner 
        activeTab={activeTab} 
        onNavigateTab={(tab) => handleTabSelect(tab as WorkspaceTab)} 
      />

      {/* ================= MAIN WORKSPACE AREA (SIDEBAR + CENTRAL WORKSPACE) ================= */}
      <div className="flex-1 min-h-0 flex overflow-hidden relative z-10">

        {/* DESKTOP/TABLET SIDEBAR (side-nav-rail) */}
        <aside className="side-nav-rail mutating-panel border-r flex flex-col justify-between p-2.5 shrink-0 select-none overflow-y-auto">
          <div className="space-y-1">
            {/* Category 1: Learning & Lab */}
            <div className="nav-label px-3 py-1 text-[11px] font-bold uppercase tracking-wider mutating-text-muted">
              {p.story.navGroups[0]}
            </div>

            {navItemsCat1.map(item => {
              const Icon = item.icon;
              const isActive = activeTab === item.id;
              return (
                <button
                  key={item.id}
                  onClick={() => handleTabSelect(item.id)}
                  className={`w-full flex items-center justify-between px-3 py-2.5 rounded-lg text-xs font-semibold text-left transition-all cursor-pointer ${
                    isActive
                      ? 'mutating-btn-primary shadow-sm font-bold'
                      : 'mutating-sub mutating-text-muted hover:opacity-100'
                  }`}
                >
                  <div className="flex items-center gap-2.5 truncate">
                    <Icon className={`w-4 h-4 shrink-0 ${item.pulse ? 'theme-danger-text animate-pulse' : ''}`} />
                    <span className="nav-label truncate">{item.label}</span>
                  </div>
                  {item.badge && (
                    <span className="nav-label text-[11px] px-1.5 py-0.2 rounded font-mono font-bold opacity-80 shrink-0">
                      {item.badge}
                    </span>
                  )}
                </button>
              );
            })}

            {/* Category 2: Helpers & Side Gigs */}
            <div className="nav-label px-3 pt-3 pb-1 text-[11px] font-bold uppercase tracking-wider mutating-text-muted">
              {p.story.navGroups[1]}
            </div>

            {navItemsCat2.map(item => {
              const Icon = item.icon;
              const isActive = activeTab === item.id;
              return (
                <button
                  key={item.id}
                  onClick={() => handleTabSelect(item.id)}
                  className={`w-full flex items-center justify-between px-3 py-2.5 rounded-lg text-xs font-semibold text-left transition-all cursor-pointer ${
                    isActive
                      ? 'mutating-btn-primary shadow-sm font-bold'
                      : 'mutating-sub mutating-text-muted hover:opacity-100'
                  }`}
                >
                  <div className="flex items-center gap-2.5 truncate">
                    <Icon className={`w-4 h-4 shrink-0 ${item.pulse ? 'theme-danger-text animate-pulse' : ''}`} />
                    <span className="nav-label truncate">{item.label}</span>
                  </div>
                  {item.badge && (
                    <span className="nav-label text-[11px] px-1.5 py-0.2 rounded font-mono font-bold opacity-80 shrink-0">
                      {item.badge}
                    </span>
                  )}
                </button>
              );
            })}
          </div>

          {/* Safety / Reset Box that mutates into a Locked Trap in v4 */}
          <div className="p-2.5 mutating-sub text-xs space-y-2 mt-3">
            <div className="flex items-center justify-between">
              <span className="font-semibold text-[11px] nav-label">{p.safetyLabel}</span>
              <ShieldAlert className="w-3.5 h-3.5 theme-success-text shrink-0" />
            </div>
            <button 
              onClick={attemptEmergencyReset} 
              className={`w-full py-1.5 px-2 rounded font-semibold text-[11px] flex items-center justify-center gap-1.5 transition cursor-pointer ${
                ver === 4 
                  ? 'theme-danger-soft theme-danger-text border theme-danger-border animate-pulse' 
                  : 'theme-danger-soft theme-danger-text border theme-danger-border'
              }`}
            >
              {ver === 4 ? <Lock className="w-3.5 h-3.5 shrink-0" /> : <Power className="w-3.5 h-3.5 shrink-0" />}
              <span className="nav-label truncate">{p.resetBtn}</span>
            </button>
          </div>
        </aside>

        {/* Central Workspace Module Panel */}
        <main className="workspace-container flex-1 overflow-y-auto p-2.5 sm:p-4 space-y-4">
          <Suspense fallback={<div className="p-4 text-xs mutating-text-muted font-mono" role="status">{lang === 'es' ? 'Cargando…' : 'Loading…'}</div>}>
            {activeTab === 'architecture' && <ArchitectureStudio />}
            {activeTab === 'training' && <TrainingMonitor />}
            {activeTab === 'hardware' && <HardwareRack />}
            {activeTab === 'data' && <DataPipelineManager />}
            {activeTab === 'contracts' && <ContractBoard />}
            {activeTab === 'agents' && <AgentSandbox />}
            {activeTab === 'research' && <ResearchTree />}
            {activeTab === 'singularity' && <SingularityPortal />}
            {activeTab === 'terminal' && <Terminal />}
          </Suspense>
        </main>
      </div>

      {/* MOBILE BOTTOM NAVIGATION BAR (Visible on < 768px screens) */}
      <nav className="bottom-nav-bar mutating-panel border-t py-1.5 px-2 justify-around items-center z-20 shrink-0">
        <button 
          onClick={() => handleTabSelect('architecture')} 
          className={`flex flex-col items-center py-1 px-2 text-center ${activeTab === 'architecture' ? 'mutating-accent-text font-bold' : 'mutating-text-muted'}`}
        >
          <Layers className="w-4 h-4" />
          <span className="text-[11px] mt-0.5 truncate max-w-[55px]">{shortTab(p.tabs.architecture)}</span>
        </button>
        <button 
          onClick={() => handleTabSelect('training')} 
          className={`flex flex-col items-center py-1 px-2 text-center ${activeTab === 'training' ? 'mutating-accent-text font-bold' : 'mutating-text-muted'}`}
        >
          <Activity className="w-4 h-4" />
          <span className="text-[11px] mt-0.5 truncate max-w-[55px]">{shortTab(p.tabs.training)}</span>
        </button>
        <button 
          onClick={() => handleTabSelect('hardware')} 
          className={`flex flex-col items-center py-1 px-2 text-center ${activeTab === 'hardware' ? 'mutating-accent-text font-bold' : 'mutating-text-muted'}`}
        >
          <Server className="w-4 h-4" />
          <span className="text-[11px] mt-0.5 truncate max-w-[55px]">{shortTab(p.tabs.hardware)}</span>
        </button>
        <button 
          onClick={() => handleTabSelect('contracts')} 
          className={`flex flex-col items-center py-1 px-2 text-center ${activeTab === 'contracts' ? 'mutating-accent-text font-bold' : 'mutating-text-muted'}`}
        >
          <Briefcase className="w-4 h-4" />
          <span className="text-[11px] mt-0.5 truncate max-w-[55px]">{shortTab(p.tabs.contracts)}</span>
        </button>
        <button 
          onClick={() => handleTabSelect('agents')} 
          className={`flex flex-col items-center py-1 px-2 text-center ${activeTab === 'agents' ? 'mutating-accent-text font-bold' : 'mutating-text-muted'}`}
        >
          <Users className="w-4 h-4" />
          <span className="text-[11px] mt-0.5 truncate max-w-[55px]">{shortTab(p.tabs.agents)}</span>
        </button>
        <button
          type="button"
          onClick={() => setMoreOpen(open => !open)}
          aria-expanded={moreOpen}
          aria-controls="more-tabs-sheet"
          className={`flex flex-col items-center py-1 px-2 text-center ${moreOpen || moreNavItems.some(i => i.id === activeTab) ? 'mutating-accent-text font-bold' : 'mutating-text-muted'}`}
        >
          <MoreHorizontal className="w-4 h-4" />
          <span className="text-[11px] mt-0.5">{lang === 'es' ? 'Más' : 'More'}</span>
        </button>
      </nav>

      {/* Phone sheet with the tabs that do not fit in the bottom bar */}
      {moreOpen && (
        <div className="bottom-nav-bar fixed inset-0 z-30 items-end bg-black/40" onClick={() => setMoreOpen(false)}>
          <div
            id="more-tabs-sheet"
            role="menu"
            className="w-full mutating-panel border-t p-3 pb-20 space-y-1.5"
            onClick={e => e.stopPropagation()}
          >
            {moreNavItems.map(item => {
              const Icon = item.icon;
              const isActive = activeTab === item.id;
              return (
                <button
                  key={item.id}
                  type="button"
                  role="menuitem"
                  onClick={() => { handleTabSelect(item.id); setMoreOpen(false); }}
                  className={`w-full flex items-center justify-between px-3 py-2.5 rounded-lg text-sm font-semibold text-left cursor-pointer ${
                    isActive ? 'mutating-btn-primary' : 'mutating-sub'
                  }`}
                >
                  <span className="flex items-center gap-2.5">
                    <Icon className="w-4 h-4 shrink-0" />
                    {item.label}
                  </span>
                  {item.badge && <span className="text-[11px] font-mono font-bold opacity-80">{item.badge}</span>}
                </button>
              );
            })}
          </div>
        </div>
      )}

      {/* Trojan Horse AI Upgrade Modal */}
      <TrojanUpgradeModal />

      {/* Onboarding Genesis Protocol Screen */}
      {!state.hasCompletedOnboarding && <Suspense fallback={null}><GenesisOnboarding /></Suspense>}

      {/* Real-World AI Guardrail Breach Incident Popup */}
      <BreachModal />

      {/* Endgame 75% Interactive Crisis Dilemma Modal */}
      <SingularityCrisisModal />

      {/* Endgame AI World Takeover Modal */}
      <SingularityTakeoverModal />

      {/* Game Over & Emergency Loan Modal */}
      <GameOverModal />

      {/* Dialog Modals */}
      {manualOpen && <Suspense fallback={null}><HelpManual isOpen onClose={() => setManualOpen(false)} /></Suspense>}
      <TrainingReportModal />
      <StoryEventModal />
      <ContainmentEndingModal />
      {leaderboardOpen && <Suspense fallback={null}><LeaderboardModal isOpen onClose={() => setLeaderboardOpen(false)} /></Suspense>}
      {authOpen && <Suspense fallback={null}><AuthModal isOpen onClose={() => setAuthOpen(false)} /></Suspense>}
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
