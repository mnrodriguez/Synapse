/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useEffect, useState } from 'react';
import { useGame } from '../context/GameContext';
import { 
  CheckCircle2, 
  ArrowRight,
  Sparkles,
  Server, 
  Layers, 
  Activity, 
  Bot, 
  Briefcase
} from 'lucide-react';
import { sound } from '../audio/soundManager';
import { VERSION_PROFILES } from '../utils/versionProfiles';
import { lowestOpenIqForVersion, FIRST_MISSION_IQ } from '../utils/missionTiers';
import confetti from 'canvas-confetti';
import { tr } from '../i18n';

interface TutorialMissionBannerProps {
  onNavigateTab: (tab: string) => void;
  activeTab?: string;
}

export const TutorialMissionBanner: React.FC<TutorialMissionBannerProps> = ({ onNavigateTab, activeTab = '' }) => {
  const { state, advanceTutorialStep, addLog } = useGame();
  // On phones the description is folded away by default to leave room for the workspace.
  const [detailsOpen, setDetailsOpen] = useState(false);

  const step = state.tutorialStep ?? 0;
  const isEs = state.language === 'es';
  const lang = isEs ? 'es' : 'en';
  const tabLabels = VERSION_PROFILES[isEs ? 'es' : 'en'][(state.uiVersion || 1) as 1 | 2 | 3 | 4].tabs;

  const hasStarterGpu = state.hardware.some(h => h.category === 'gpu' && h.isStarterChoice && h.count > 0);
  const hasStarterCooling = state.hardware.some(h => h.category === 'cooling' && h.isStarterChoice && h.count > 0);
  const hasPowerSupply = state.hardware.some(h => h.category === 'power' && h.count > 0);
  const hasNetworkConnection = state.hardware.some(h => h.category === 'network' && h.count > 0);
  const hasStarterHardware = hasStarterGpu && hasStarterCooling && hasPowerSupply && hasNetworkConnection;
  const hasAgent = state.agents.length > 0;
  const hasFinishedContract = (state.completedContractsCount || 0) > 0 || state.contracts.some(c => c.completed);

  // Auto-progress stages when conditions are satisfied
  useEffect(() => {
    if (step === 0 && hasStarterHardware) {
      sound.playCredit();
      advanceTutorialStep(1);
      addLog(tr(lang, 'tutorialMissionBanner.genesisProtocol15Starter'), 'success');
    } else if (step === 2 && state.savedModels.some(m => m.reasoningScore >= FIRST_MISSION_IQ)) {
      sound.playBreakthrough();
      advanceTutorialStep(3);
      addLog(tr(lang, 'tutorialMissionBanner.genesisProtocol35Training'), 'success');
    } else if (step === 3 && hasAgent) {
      sound.playBreakthrough();
      advanceTutorialStep(4);
      addLog(tr(lang, 'tutorialMissionBanner.genesisProtocol45First'), 'success');
    } else if (step === 4 && hasFinishedContract) {
      sound.playBreakthrough();
      confetti({ particleCount: 120, spread: 80 });
      advanceTutorialStep(5);
      addLog(tr(lang, 'tutorialMissionBanner.genesisProtocolCompleteFirstCommercial'), 'success');
    }
  }, [hasStarterHardware, hasAgent, hasFinishedContract, step, state.savedModels, advanceTutorialStep, addLog, isEs]);

  // Hooks must run on every render, so this early return comes after them (completing the tutorial mid-mission used to blank the screen).
  if (state.tutorialCompleted || state.tutorialDismissed) {
    return null;
  }

  const stepsData = [
    {
      id: 0,
      tab: 'hardware',
      title: tr(lang, 'tutorialMissionBanner.stage1AcquireStarterHardware'),
      desc: tr(lang, 'tutorialMissionBanner.stage1Desc', { hardware: tabLabels.hardware }),
      icon: Server,
      buttonText: tr(lang, 'tutorialMissionBanner.go', { hardware: tabLabels.hardware.toUpperCase() }),
      isCompleted: hasStarterHardware
    },
    {
      id: 1,
      tab: 'architecture',
      title: tr(lang, 'tutorialMissionBanner.stage2ModelArchitecture'),
      desc: tr(lang, 'tutorialMissionBanner.stage2Desc', { architecture: tabLabels.architecture }),
      icon: Layers,
      buttonText: tr(lang, 'tutorialMissionBanner.go2', { architecture: tabLabels.architecture.toUpperCase() }),
      isCompleted: step > 1
    },
    {
      id: 2,
      tab: 'training',
      title: tr(lang, 'tutorialMissionBanner.stage3TrainNeuralWeights'),
      desc: tr(lang, 'tutorialMissionBanner.stage3Desc', { training: tabLabels.training }),
      icon: Activity,
      buttonText: tr(lang, 'tutorialMissionBanner.go3', { training: tabLabels.training.toUpperCase() }),
      isCompleted: step > 2
    },
    {
      id: 3,
      tab: 'agents',
      title: tr(lang, 'tutorialMissionBanner.stage4DeployFirstAgent'),
      desc: tr(lang, 'tutorialMissionBanner.stage4Desc', { agents: tabLabels.agents }),
      icon: Bot,
      buttonText: tr(lang, 'tutorialMissionBanner.go4', { agents: tabLabels.agents.toUpperCase() }),
      isCompleted: hasAgent || step > 3
    },
    {
      id: 4,
      tab: 'contracts',
      title: tr(lang, 'tutorialMissionBanner.stage5SolveFirstMission'),
      desc: tr(lang, 'tutorialMissionBanner.stage5Desc', { contracts: tabLabels.contracts }),
      icon: Briefcase,
      buttonText: tr(lang, 'tutorialMissionBanner.go5', { contracts: tabLabels.contracts.toUpperCase() }),
      isCompleted: hasFinishedContract
    }
  ];

  const currentStepInfo = stepsData[Math.min(4, step)];
  // On the contracts stage, explain how to unblock when no open mission fits the best model.
  const bestIq = Math.max(0, ...state.savedModels.map(m => m.reasoningScore));
  const lowestOpenIq = lowestOpenIqForVersion(state.contracts, state.uiVersion || 1);
  const blockedByIq = currentStepInfo.tab === 'contracts' && lowestOpenIq !== null && bestIq < lowestOpenIq;
  // On the training stage, the goal is the IQ the first mission needs; show progress toward it.
  const trainingGoalOpen = currentStepInfo.tab === 'training' && bestIq < FIRST_MISSION_IQ;
  const guidanceText = trainingGoalOpen
    ? (tr(lang, 'tutorialMissionBanner.trainUntilScoreReachesYou', { training: tabLabels.training, firstMissionIq: FIRST_MISSION_IQ, bestIq }))
    : blockedByIq
    ? (tr(lang, 'tutorialMissionBanner.bestModelHasScoreEasiest', { bestIq, lowestOpenIq, training: tabLabels.training }))
    : null;

  return (
    <div className="w-full mutating-panel border-b p-2 sm:p-2.5 font-mono select-none shadow-md z-10 animate-fadeIn">
      <div className="max-w-7xl mx-auto flex flex-col md:flex-row items-start md:items-center justify-between gap-2.5">
        
        {/* Left: Mission Lore and current stage */}
        <div className="flex items-start sm:items-center gap-2.5">
          <div className="p-1.5 rounded-lg mutating-sub border shrink-0">
            <Sparkles className="w-4 h-4 mutating-accent-text animate-pulse" />
          </div>

          <div>
            <div className="flex items-center gap-2 flex-wrap">
              <span className="text-[11px] uppercase tracking-widest font-black mutating-accent-text mutating-sub px-2 py-0.5 rounded border">
                {tr(lang, 'tutorialMissionBanner.firstMissionGenesisProtocol')}
              </span>
              <span className="text-xs font-bold font-sans flex items-center gap-1">
                {currentStepInfo.title}
              </span>
              <span className="text-[11px] theme-warn-text font-bold mutating-sub px-1.5 py-0.2 rounded border theme-warn-border">
                {tr(lang, 'tutorialMissionBanner.step5', { step: step + 1 })}
              </span>
            </div>

            <p className={`text-[11px] mutating-text-muted mt-0.5 leading-snug ${detailsOpen ? '' : 'hidden md:block'}`}>
              {guidanceText ?? currentStepInfo.desc}
            </p>
          </div>
        </div>

        {/* Right: Step progress pills and action button */}
        <div className="flex items-center gap-2 shrink-0 self-end md:self-center">
          <button
            type="button"
            onClick={() => setDetailsOpen(open => !open)}
            aria-expanded={detailsOpen}
            className="md:hidden px-2 py-1 text-[11px] font-bold rounded border mutating-sub cursor-pointer"
          >
            {detailsOpen ? (tr(lang, 'tutorialMissionBanner.hide')) : (tr(lang, 'tutorialMissionBanner.details'))}
          </button>

          {/* Progress dots */}
          <div className="hidden lg:flex items-center gap-1 mr-2">
            {stepsData.map((s, idx) => (
              <div 
                key={s.id}
                title={s.title}
                className={`w-2.5 h-2.5 rounded-full transition-all ${
                  idx < step 
                    ? 'theme-btn-success shadow-sm'
                    : idx === step
                    ? 'theme-accent-soft animate-pulse shadow-md'
                    : 'theme-raised-bg'
                }`}
              />
            ))}
          </div>

          <button
            type="button"
            onClick={() => onNavigateTab(currentStepInfo.tab)}
            className="px-3.5 py-1.5 mutating-btn-primary font-mono text-xs font-extrabold flex items-center gap-1.5 shadow-md cursor-pointer transition-all hover:scale-105 active:scale-95"
          >
            <span>{currentStepInfo.buttonText}</span>
            <ArrowRight className="w-3.5 h-3.5" />
          </button>
        </div>

      </div>
    </div>
  );
};
