/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useEffect, useState } from 'react';
import { useGame } from '../context/GameContext';
import { OnboardingConfig, ModelTopology, QuantizationType, GameDifficulty } from '../types/game';
import { 
  Cpu, 
  Terminal as TermIcon, 
  Flame, 
  Database, 
  Network, 
  GitFork, 
  Layers, 
  Play, 
  CheckCircle2, 
  ArrowRight, 
  ArrowLeft, 
  Sparkles, 
  DollarSign, 
  ShieldCheck, 
  Activity,
  Shuffle,
  Languages,
  Cloud,
  Sliders
} from 'lucide-react';
import { sound } from '../audio/soundManager';
import { AuthModal } from './AuthModal';
import { tr } from '../i18n';
import { RichText } from '../i18n/RichText';

export const GenesisOnboarding: React.FC = () => {
  const { completeTutorial, state, setLanguage } = useGame();
  const [authOpen, setAuthOpen] = useState(false);
  const en = state.language === 'en';
  const isEs = state.language === 'es';

  const [step, setStep] = useState<number>(1);
  const [callsign, setCallsign] = useState<string>('CIPHER-7');
  const [difficulty, setDifficulty] = useState<GameDifficulty>('beginner');

  // Hardware selection (Mandatory 4-Part Rig)
  const [selectedGpu, setSelectedGpu] = useState<string>('gpu_gtx1060');
  const [selectedCooling, setSelectedCooling] = useState<string>('cool_air_basic');
  const [selectedPower, setSelectedPower] = useState<string>('power_wall_socket');
  const [selectedNetwork, setSelectedNetwork] = useState<string>('net_gigabit');

  // Data selection
  const [selectedData, setSelectedData] = useState<string>('data_relational_sql');

  // Model selection
  const [modelTopology, setModelTopology] = useState<ModelTopology>('transformer');
  const [modelParams, setModelParams] = useState<number>(14_000_000);
  const [modelQuant, setModelQuant] = useState<QuantizationType>('int8');
  const [modelName, setModelName] = useState<string>('SYNAPSE-Genesis-14M');
  // The default name follows the chosen parameter count until the operative types their own name.
  const [modelNameEdited, setModelNameEdited] = useState<boolean>(false);
  useEffect(() => {
    if (!modelNameEdited) {
      setModelName(`SYNAPSE-Genesis-${Math.round(modelParams / 1_000_000)}M`);
    }
  }, [modelParams, modelNameEdited]);

  // Step 5 training simulation
  const [isTrainingSimulation, setIsTrainingSimulation] = useState<boolean>(false);
  const [trainingProgress, setTrainingProgress] = useState<number>(0);
  const [simLoss, setSimLoss] = useState<number>(4.8);
  const [simHistory, setSimHistory] = useState<number[]>([4.8]);
  const [simComplete, setSimComplete] = useState<boolean>(false);

  const INITIAL_GRANT = 350;

  const starterGpuOptions = [
    {
      id: 'gpu_gtx1060',
      name: 'NVIDIA GTX 1060 (6GB VRAM)',
      price: 150,
      compute: '4.4 TFLOPS',
      vram: 6,
      heat: '0.8°C/min',
      desc: tr(state.language, 'genesisOnboarding.gpu.gpuGtx1060.desc'),
      badge: tr(state.language, 'genesisOnboarding.gpu.gpuGtx1060.badge')
    },
    {
      id: 'gpu_rx580_dual',
      name: 'Dual AMD Radeon RX 580 (16GB VRAM)',
      price: 180,
      compute: '11.0 TFLOPS',
      vram: 16,
      heat: '1.6°C/min',
      desc: tr(state.language, 'genesisOnboarding.gpu.gpuRx580Dual.desc'),
      badge: tr(state.language, 'genesisOnboarding.gpu.gpuRx580Dual.badge')
    },
    {
      id: 'gpu_tesla_k80',
      name: 'Used Tesla K80 Dual-GK210 (24GB VRAM)',
      price: 210,
      compute: '8.7 TFLOPS',
      vram: 24,
      heat: '1.9°C/min',
      desc: tr(state.language, 'genesisOnboarding.gpu.gpuTeslaK80.desc'),
      badge: tr(state.language, 'genesisOnboarding.gpu.gpuTeslaK80.badge')
    },
    {
      id: 'gpu_coral_edge',
      name: 'Coral Edge TPU + GTX 1050 (4GB)',
      price: 130,
      compute: '6.2 TFLOPS',
      vram: 4,
      heat: '0.6°C/min',
      desc: tr(state.language, 'genesisOnboarding.gpu.gpuCoralEdge.desc'),
      badge: tr(state.language, 'genesisOnboarding.gpu.gpuCoralEdge.badge')
    }
  ];

  const starterCoolingOptions = [
    {
      id: 'cool_air_basic',
      name: tr(state.language, 'genesisOnboarding.cooling.coolAirBasic.name'),
      price: 40,
      capacity: '0.9 kW',
      desc: tr(state.language, 'genesisOnboarding.cooling.coolAirBasic.desc')
    },
    {
      id: 'cool_copper_pipes',
      name: tr(state.language, 'genesisOnboarding.cooling.coolCopperPipes.name'),
      price: 85,
      capacity: '1.8 kW',
      desc: tr(state.language, 'genesisOnboarding.cooling.coolCopperPipes.desc')
    }
  ];

  const starterPowerOptions = [
    {
      id: 'power_wall_socket',
      name: tr(state.language, 'genesisOnboarding.power.powerWallSocket.name'),
      price: 20,
      capacity: '1.5 kW',
      desc: tr(state.language, 'genesisOnboarding.power.powerWallSocket.desc')
    },
    {
      id: 'power_solar_array',
      name: tr(state.language, 'genesisOnboarding.power.powerSolarArray.name'),
      price: 55,
      capacity: '3.0 kW',
      desc: tr(state.language, 'genesisOnboarding.power.powerSolarArray.desc')
    }
  ];

  const starterNetworkOptions = [
    {
      id: 'net_gigabit',
      name: tr(state.language, 'genesisOnboarding.network.netGigabit.name'),
      price: 30,
      bandwidth: '1 Gbps',
      desc: tr(state.language, 'genesisOnboarding.network.netGigabit.desc')
    },
    {
      id: 'net_fiber_10g',
      name: tr(state.language, 'genesisOnboarding.network.netFiber10g.name'),
      price: 75,
      bandwidth: '10 Gbps',
      desc: tr(state.language, 'genesisOnboarding.network.netFiber10g.desc')
    }
  ];

  const starterDataOptions = [
    {
      id: 'data_relational_sql',
      name: tr(state.language, 'genesisOnboarding.data.dataRelationalSql.name'),
      type: 'relational_sql',
      icon: Database,
      desc: tr(state.language, 'genesisOnboarding.data.dataRelationalSql.desc'),
      bonus: tr(state.language, 'genesisOnboarding.data.dataRelationalSql.bonus'),
      lore: tr(state.language, 'genesisOnboarding.data.dataRelationalSql.lore')
    }
  ];


  // Calculate current costs
  const currentGpuObj = starterGpuOptions.find(g => g.id === selectedGpu) || starterGpuOptions[0];
  const currentCoolingObj = starterCoolingOptions.find(c => c.id === selectedCooling) || starterCoolingOptions[0];
  const currentPowerObj = starterPowerOptions.find(p => p.id === selectedPower) || starterPowerOptions[0];
  const currentNetworkObj = starterNetworkOptions.find(n => n.id === selectedNetwork) || starterNetworkOptions[0];
  const totalHardwareCost = currentGpuObj.price + currentCoolingObj.price + currentPowerObj.price + currentNetworkObj.price;
  const remainingBudget = INITIAL_GRANT - totalHardwareCost;

  // Randomize callsign
  const randomizeCallsign = () => {
    sound.playKeyClick();
    const prefixes = ['NEXUS', 'CIPHER', 'VECTOR', 'TURING', 'NEO', 'OMEGA', 'GHOST', 'SYNAPSE'];
    const randomNum = Math.floor(Math.random() * 89 + 11);
    setCallsign(`${prefixes[Math.floor(Math.random() * prefixes.length)]}-${randomNum}`);
  };

  // Start Step 5 simulation
  const handleLaunchInitialTraining = () => {
    sound.playCommandExecute();
    setIsTrainingSimulation(true);
    setTrainingProgress(0);
    setSimLoss(4.8);
    setSimHistory([4.8]);
    setSimComplete(false);

    let currentStep = 0;
    const interval = setInterval(() => {
      currentStep += 1;
      const progress = Math.min(100, currentStep * 10);
      setTrainingProgress(progress);

      setSimLoss(prev => {
        const next = Math.max(0.45, prev * 0.78 + (Math.random() - 0.5) * 0.08);
        const fixed = Number(next.toFixed(3));
        setSimHistory(h => [...h, fixed]);
        return fixed;
      });

      sound.playEpochTick();

      if (progress >= 100) {
        clearInterval(interval);
        setSimComplete(true);
        sound.playBreakthrough();
      }
    }, 400);
  };

  const handleFinishOnboarding = () => {
    try {
      sound.playBreakthrough();
      const config: OnboardingConfig = {
        callsign: callsign.trim() || 'CIPHER-7',
        starterGpuId: selectedGpu,
        starterCoolingId: selectedCooling,
        starterPowerId: selectedPower,
        starterNetworkId: selectedNetwork,
        starterDataId: selectedData,
        modelTopology,
        modelParams,
        modelQuantization: modelQuant,
        modelName: modelName.trim() || `SYNAPSE-Proto-${(modelParams / 1_000_000).toFixed(0)}M`,
        difficulty
      };
      completeTutorial(config);
    } catch (err) {
      console.error("Failed to complete genesis onboarding:", err);
    }
  };

  return (
    <div className="fixed inset-0 theme-panel-bg z-50 flex items-center justify-center p-3 sm:p-6 font-mono select-none overflow-y-auto">
      {/* Background glow and subtle scanlines */}
      <div className="pointer-events-none fixed inset-0 opacity-[0.04] bg-[linear-gradient(rgba(0,255,200,0)_50%,rgba(0,255,200,0.25)_50%)] bg-[length:100%_4px]" />

      <div className="theme-panel-bg border theme-accent-border rounded-xl max-w-4xl w-full flex flex-col overflow-hidden">
        {/* Top Header & Step Progress Bar */}
        <div className="p-4 theme-panel-bg border-b theme-accent-border flex flex-wrap items-center justify-between gap-3">
          <div className="flex items-center gap-3">
            <div className="flex h-3 w-3 relative">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full theme-accent-soft opacity-75"></span>
              <span className="relative inline-flex rounded-full h-3 w-3 mutating-btn-primary"></span>
            </div>
            <div>
              <span className="text-[11px] mutating-text-muted uppercase tracking-widest block font-bold">
                {tr(state.language, 'genesisOnboarding.initialSetup')}
              </span>
              <h2 className="text-sm font-bold mutating-accent-text tracking-wider">
                {tr(state.language, 'genesisOnboarding.phase5', { step })}{
                  step === 1 ? tr(state.language, 'genesisOnboarding.identityStartingFunds') :
                  step === 2 ? tr(state.language, 'genesisOnboarding.initialHardwareAcquisition') :
                  step === 3 ? tr(state.language, 'genesisOnboarding.dataKnowledgeSources') :
                  step === 4 ? tr(state.language, 'genesisOnboarding.firstModelArchitecture') :
                  tr(state.language, 'genesisOnboarding.genesisTrainingAwakening')
                }
              </h2>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={() => setLanguage(en ? 'es' : 'en')}
              className="flex items-center gap-1 rounded border theme-accent-border theme-sub-bg px-2 py-1 text-[11px] font-bold mutating-accent-text"
              aria-label={tr(state.language, 'genesisOnboarding.changeLanguageSpanish')}
            >
              <Languages className="h-3.5 w-3.5" />
              {tr((en ? 'en' : 'es'), 'genesisOnboarding.enEnglish')}
            </button>
            <button
              type="button"
              onClick={() => setAuthOpen(true)}
              className="flex items-center gap-1 rounded border theme-border theme-sub-bg px-2 py-1 text-[11px] font-bold theme-text"
            >
              <Cloud className="h-3.5 w-3.5 mutating-accent-text" />
              {tr(state.language, 'genesisOnboarding.sign')}
            </button>
          </div>

          {/* Budget tracker */}
          <div className="flex items-center gap-2 px-3 py-1 rounded theme-warn-soft border theme-warn-border theme-warn-text text-xs">
            <DollarSign className="w-3.5 h-3.5 theme-warn-text" />
            <span className="mutating-text-muted">{tr(state.language, 'genesisOnboarding.remainingBudget')}</span>
            <span className="font-bold text-sm theme-warn-text">${remainingBudget} CR</span>
          </div>
        </div>

        {/* Visual Progress Steps Indicators */}
        <div className="grid grid-cols-5 theme-panel-bg border-b theme-accent-border text-[11px] text-center font-bold">
          {[
            { num: 1, label: tr(state.language, 'genesisOnboarding.identity') },
            { num: 2, label: 'Hardware' },
            { num: 3, label: tr(state.language, 'genesisOnboarding.data') },
            { num: 4, label: tr(state.language, 'genesisOnboarding.architecture') },
            { num: 5, label: 'Genesis' }
          ].map(s => (
            <div
              key={s.num}
              className={`py-1.5 transition-colors ${
                step === s.num
                  ? 'theme-accent-soft mutating-accent-text border-b-2 theme-accent-border'
                  : step > s.num
                  ? 'theme-success-text theme-sub-bg'
                  : 'mutating-text-muted'
              }`}
            >
              {s.num}. {s.label} {step > s.num ? '✓' : ''}
            </div>
          ))}
        </div>

        {/* Step Body */}
        <div className="p-5 flex-1 overflow-y-auto space-y-4 text-xs theme-text max-h-[65dvh]">
          {/* STEP 1: Callsign & Lore */}
          {step === 1 && (
            <div className="space-y-4">
              <div className="p-3 theme-panel-bg border theme-accent-border rounded-lg space-y-2">
                <span className="mutating-accent-text font-bold text-xs flex items-center gap-1.5">
                  <TermIcon className="w-4 h-4" />
                  {tr(state.language, 'genesisOnboarding.welcomeMessage')}
                </span>
                <p className="theme-text leading-relaxed">
                  <RichText lang={state.language} k="genesisOnboarding.welcomeIntro" />
                </p>
                <p className="mutating-text-muted text-[11px] leading-relaxed">
                  <RichText lang={state.language} k="genesisOnboarding.seedFunding" params={{ grant: INITIAL_GRANT }} />
                </p>
              </div>

              <div className="space-y-2 pt-2">
                <label className="text-xs theme-text font-bold block">
                  {tr(state.language, 'genesisOnboarding.chooseUsername')}
                </label>
                <div className="flex items-center gap-2 max-w-md">
                  <input
                    type="text"
                    value={callsign}
                    onChange={(e) => setCallsign(e.target.value.toUpperCase())}
                    maxLength={20}
                    placeholder="CIPHER-7"
                    className="flex-1 theme-panel-bg border theme-accent-border rounded px-3 py-2 text-sm mutating-accent-text outline-none font-mono tracking-wider"
                  />
                  <button
                    type="button"
                    onClick={randomizeCallsign}
                    className="px-3 py-2 theme-raised-bg theme-text border theme-border rounded flex items-center gap-1.5 transition-colors"
                    title={tr(state.language, 'genesisOnboarding.generateRandomName')}
                  >
                    <Shuffle className="w-3.5 h-3.5" />
                    <span>{tr(state.language, 'genesisOnboarding.random')}</span>
                  </button>
                </div>
                <span className="text-[11px] mutating-text-muted block">
                  {tr(state.language, 'genesisOnboarding.nameAppearsJobsGlobalLeaderboard')}
                </span>
              </div>

              {/* Difficulty Level Selection */}
              <div className="space-y-2 pt-3 border-t theme-accent-border">
                <label className="text-xs theme-text font-bold block flex items-center gap-1.5">
                  <Sliders className="w-4 h-4 mutating-accent-text" />
                  {tr(state.language, 'genesisOnboarding.selectSimulationDifficultyLevel')}
                </label>

                <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
                  {[
                    {
                      id: 'beginner',
                      title: tr((isEs ? 'es' : 'en'), 'genesisOnboarding.beginnerNovice'),
                      desc: tr((isEs ? 'es' : 'en'), 'genesisOnboarding.learnAiTrainingFundamentalsSimplified'),
                      badge: tr(state.language, 'genesisOnboarding.badgeRewards')
                    },
                    {
                      id: 'normal',
                      title: tr((isEs ? 'es' : 'en'), 'genesisOnboarding.normalPractitioner'),
                      desc: tr((isEs ? 'es' : 'en'), 'genesisOnboarding.intermediateLevelEssentialHyperparametersQuantization'),
                      badge: tr(state.language, 'genesisOnboarding.badgeBalanced')
                    },
                    {
                      id: 'engineer',
                      title: tr((isEs ? 'es' : 'en'), 'genesisOnboarding.engineerArchitect'),
                      desc: tr((isEs ? 'es' : 'en'), 'genesisOnboarding.fullUnconstrainedSimulationFullControl'),
                      badge: tr(state.language, 'genesisOnboarding.badgeFullExperience')
                    }
                  ].map(diffOption => {
                    const isSelected = difficulty === diffOption.id;
                    return (
                      <div
                        key={diffOption.id}
                        onClick={() => { sound.playKeyClick(); setDifficulty(diffOption.id as GameDifficulty); }}
                        className={`p-3 rounded-lg border cursor-pointer transition-all flex flex-col justify-between ${
                          isSelected
                            ? 'theme-accent-soft theme-accent-border mutating-accent-text'
                            : 'theme-panel-bg theme-border mutating-text-muted'
                        }`}
                      >
                        <div>
                          <div className="flex items-center justify-between gap-1 mb-1">
                            <span className="font-bold text-xs">{diffOption.title}</span>
                            <span className={`text-[11px] px-1 py-0.2 rounded font-bold ${isSelected ? 'theme-accent-soft mutating-accent-text border theme-accent-border' : 'theme-sub-bg mutating-text-muted'}`}>
                              {diffOption.badge}
                            </span>
                          </div>
                          <p className="text-[11px] leading-relaxed mutating-text-muted">{diffOption.desc}</p>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            </div>
          )}

          {/* STEP 2: Starter Hardware Acquisition */}
          {step === 2 && (
            <div className="space-y-4">
              <div>
                <h3 className="font-bold text-xs mutating-accent-text flex items-center gap-1.5">
                  <Cpu className="w-4 h-4 mutating-accent-text" />
                  {tr(state.language, 'genesisOnboarding.n1ChooseFirstComputeAccelerator')}
                </h3>
                <p className="mutating-text-muted text-[11px] mt-0.5">
                  {tr(state.language, 'genesisOnboarding.chooseInitialComputeHardwareMore')}
                </p>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                {starterGpuOptions.map(gpu => {
                  const isSelected = selectedGpu === gpu.id;
                  return (
                    <button
                      key={gpu.id}
                      type="button"
                      onClick={() => { sound.playKeyClick(); setSelectedGpu(gpu.id); }}
                      className={`p-3 rounded-lg border text-left transition-all ${
                        isSelected
                          ? 'theme-accent-soft theme-accent-border mutating-accent-text'
                          : 'theme-sub-bg theme-border mutating-text-muted'
                      }`}
                    >
                      <div className="flex items-start justify-between gap-1">
                        <div>
                          <span className="text-[11px] px-1.5 py-0.2 rounded theme-raised-bg mutating-accent-text font-bold block w-fit mb-1">
                            {gpu.badge}
                          </span>
                          <h4 className="font-bold text-xs theme-text">{gpu.name}</h4>
                        </div>
                        <span className="theme-warn-text font-bold text-xs">${gpu.price} CR</span>
                      </div>
                      <p className="text-[11px] mutating-text-muted mt-2 leading-snug">{gpu.desc}</p>
                      <div className="flex items-center gap-2 mt-2.5 text-[11px] mutating-text-muted pt-1.5 border-t theme-border">
                        <span className="mutating-accent-text font-semibold">{gpu.compute}</span>
                        <span>•</span>
                        <span className="mutating-accent-text font-semibold">{gpu.vram} GB VRAM</span>
                        <span>•</span>
                        <span className="theme-warn-text font-semibold">{gpu.heat}</span>
                      </div>
                    </button>
                  );
                })}
              </div>

              <div className="pt-2">
                <h3 className="font-bold text-xs mutating-accent-text flex items-center gap-1.5">
                  <Flame className="w-4 h-4 theme-success-text" />
                  {tr(state.language, 'genesisOnboarding.n2BasicCoolingMandatoryPrevent')}
                </h3>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 mt-2">
                  {starterCoolingOptions.map(cool => {
                    const isSelected = selectedCooling === cool.id;
                    return (
                      <button
                        key={cool.id}
                        type="button"
                        onClick={() => { sound.playKeyClick(); setSelectedCooling(cool.id); }}
                        className={`p-2.5 rounded-lg border text-left transition-all ${
                          isSelected
                            ? 'theme-success-soft theme-success-border theme-success-text'
                            : 'theme-sub-bg theme-border mutating-text-muted'
                        }`}
                      >
                        <div className="flex items-center justify-between">
                          <h4 className="font-bold text-xs theme-text">{cool.name}</h4>
                          <span className="theme-warn-text font-bold text-xs">${cool.price} CR</span>
                        </div>
                        <p className="text-[11px] mutating-text-muted mt-1 leading-snug">{cool.desc}</p>
                        <span className="text-[11px] theme-success-text block mt-1.5 font-bold">
                          {tr(state.language, 'genesisOnboarding.coolingCapacity')} {cool.capacity}
                        </span>
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* 3. Power Grid Connection */}
              <div className="pt-2">
                <h3 className="font-bold text-xs mutating-accent-text flex items-center gap-1.5">
                  <DollarSign className="w-4 h-4 theme-warn-text" />
                  {tr(state.language, 'genesisOnboarding.n3PowerGridConnectionMandatory')}
                </h3>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 mt-2">
                  {starterPowerOptions.map(pow => {
                    const isSelected = selectedPower === pow.id;
                    return (
                      <button
                        key={pow.id}
                        type="button"
                        onClick={() => { sound.playKeyClick(); setSelectedPower(pow.id); }}
                        className={`p-2.5 rounded-lg border text-left transition-all ${
                          isSelected
                            ? 'theme-warn-soft theme-warn-border theme-warn-text'
                            : 'theme-sub-bg theme-border mutating-text-muted'
                        }`}
                      >
                        <div className="flex items-center justify-between">
                          <h4 className="font-bold text-xs theme-text">{pow.name}</h4>
                          <span className="theme-warn-text font-bold text-xs">${pow.price} CR</span>
                        </div>
                        <p className="text-[11px] mutating-text-muted mt-1 leading-snug">{pow.desc}</p>
                        <span className="text-[11px] theme-warn-text block mt-1.5 font-bold">
                          {tr(state.language, 'genesisOnboarding.powerCapacity')} {pow.capacity}
                        </span>
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* 4. Network Interconnect */}
              <div className="pt-2">
                <h3 className="font-bold text-xs mutating-accent-text flex items-center gap-1.5">
                  <Network className="w-4 h-4 mutating-accent-text" />
                  {tr(state.language, 'genesisOnboarding.n4NetworkInterconnectMandatoryFetch')}
                </h3>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 mt-2">
                  {starterNetworkOptions.map(net => {
                    const isSelected = selectedNetwork === net.id;
                    return (
                      <button
                        key={net.id}
                        type="button"
                        onClick={() => { sound.playKeyClick(); setSelectedNetwork(net.id); }}
                        className={`p-2.5 rounded-lg border text-left transition-all ${
                          isSelected
                            ? 'theme-accent-soft theme-accent-border mutating-accent-text'
                            : 'theme-sub-bg theme-border mutating-text-muted'
                        }`}
                      >
                        <div className="flex items-center justify-between">
                          <h4 className="font-bold text-xs theme-text">{net.name}</h4>
                          <span className="theme-warn-text font-bold text-xs">${net.price} CR</span>
                        </div>
                        <p className="text-[11px] mutating-text-muted mt-1 leading-snug">{net.desc}</p>
                        <span className="text-[11px] mutating-accent-text block mt-1.5 font-bold">
                          {tr(state.language, 'genesisOnboarding.bandwidth')} {net.bandwidth}
                        </span>
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* Mandatory 4-Part Rig Readiness Banner */}
              <div className="p-3 theme-panel-bg border theme-accent-border rounded-lg flex flex-wrap items-center justify-between gap-2 text-xs">
                <div className="flex items-center gap-2.5 flex-wrap">
                  <span className="font-bold mutating-accent-text text-[11px]">
                    {tr(state.language, 'genesisOnboarding.rigStatus44Components')}
                  </span>
                  <span className={`px-2 py-0.5 rounded text-[11px] font-bold ${selectedGpu ? 'theme-success-text theme-success-soft border theme-success-border' : 'theme-danger-text theme-danger-soft border theme-danger-border'}`}>
                    1. GPU {selectedGpu ? '✓' : '✗'}
                  </span>
                  <span className={`px-2 py-0.5 rounded text-[11px] font-bold ${selectedCooling ? 'theme-success-text theme-success-soft border theme-success-border' : 'theme-danger-text theme-danger-soft border theme-danger-border'}`}>
                    2. {tr(state.language, 'genesisOnboarding.stepCooling')} {selectedCooling ? '✓' : '✗'}
                  </span>
                  <span className={`px-2 py-0.5 rounded text-[11px] font-bold ${selectedPower ? 'theme-success-text theme-success-soft border theme-success-border' : 'theme-danger-text theme-danger-soft border theme-danger-border'}`}>
                    3. {tr(state.language, 'genesisOnboarding.stepPower')} {selectedPower ? '✓' : '✗'}
                  </span>
                  <span className={`px-2 py-0.5 rounded text-[11px] font-bold ${selectedNetwork ? 'theme-success-text theme-success-soft border theme-success-border' : 'theme-danger-text theme-danger-soft border theme-danger-border'}`}>
                    4. {tr(state.language, 'genesisOnboarding.stepNetwork')} {selectedNetwork ? '✓' : '✗'}
                  </span>
                </div>

                <div className="text-right">
                  <span className="text-[11px] mutating-text-muted block">{tr(state.language, 'genesisOnboarding.budget')}</span>
                  <span className={`font-bold text-xs ${remainingBudget >= 0 ? 'theme-warn-text' : 'theme-danger-text'}`}>
                    ${remainingBudget} CR / ${INITIAL_GRANT} CR
                  </span>
                </div>
              </div>
            </div>
          )}

          {/* STEP 3: Starter Data Modality */}
          {step === 3 && (
            <div className="space-y-3">
              <div>
                <h3 className="font-bold text-xs mutating-accent-text flex items-center gap-1.5">
                  <Database className="w-4 h-4 mutating-accent-text" />
                  {tr(state.language, 'genesisOnboarding.initialKnowledgeSourceDataPipeline')}
                </h3>
                <p className="mutating-text-muted text-[11px] mt-0.5">
                  {tr(state.language, 'genesisOnboarding.labBeginsEquippedFoundationalRelational')}
                </p>
              </div>

              <div className="space-y-2.5">
                {starterDataOptions.map(ds => {
                  const Icon = ds.icon;
                  return (
                    <div
                      key={ds.id}
                      className="w-full p-3 rounded-lg border theme-accent-soft theme-accent-border mutating-accent-text flex items-start gap-3"
                    >
                      <div className="p-2 rounded theme-sub-bg border theme-border mt-0.5">
                        <Icon className="w-5 h-5 mutating-accent-text" />
                      </div>
                      <div className="flex-1">
                        <div className="flex items-center justify-between">
                          <h4 className="font-bold text-xs theme-text">{ds.name}</h4>
                          <span className="text-[11px] px-2 py-0.5 theme-success-soft border theme-success-border theme-success-text font-bold rounded flex items-center gap-1">
                            <CheckCircle2 className="w-3.5 h-3.5 theme-success-text" />
                            {tr((isEs ? 'es' : 'en'), 'genesisOnboarding.starterPipeline')}
                          </span>
                        </div>
                        <p className="text-xs theme-text mt-1">{ds.desc}</p>
                        <div className="p-1.5 mt-2 theme-panel-bg border theme-accent-border rounded text-[11px] space-y-0.5">
                          <span className="mutating-accent-text font-bold block">{ds.bonus}</span>
                          <span className="mutating-text-muted block">{ds.lore}</span>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>

              <div className="p-2.5 rounded theme-sub-bg border theme-border text-[11px] mutating-text-muted flex items-center gap-2">
                <Sparkles className="w-4 h-4 mutating-accent-text shrink-0" />
                <span>
                  {tr((isEs ? 'es' : 'en'), 'genesisOnboarding.advancedModalitiesHnswVectorEmbeddings')}
                </span>
              </div>
            </div>
          )}

          {/* STEP 4: First Model Architecture */}
          {step === 4 && (
            <div className="space-y-4">
              {difficulty === 'beginner' ? (
                <div>
                  <div className="flex items-center justify-between gap-2">
                    <h3 className="font-bold text-xs mutating-accent-text flex items-center gap-1.5">
                      <Layers className="w-4 h-4 mutating-accent-text" />
                      {tr(state.language, 'genesisOnboarding.firstModelArchitectureAutomatedCalibration')}
                    </h3>
                    <span className="text-[11px] px-2 py-0.5 rounded theme-success-soft border theme-success-border theme-success-text font-bold flex items-center gap-1">
                      <CheckCircle2 className="w-3.5 h-3.5 theme-success-text" />
                      {tr(state.language, 'genesisOnboarding.automatedBeginners')}
                    </span>
                  </div>
                  <p className="mutating-text-muted text-[11px] mt-1 leading-snug">
                    {tr(state.language, 'genesisOnboarding.ensureSeamlessTrainingWithoutOut')}
                  </p>
                </div>
              ) : (
                <div>
                  <h3 className="font-bold text-xs mutating-accent-text flex items-center gap-1.5">
                    <Layers className="w-4 h-4 mutating-accent-text" />
                    {tr(state.language, 'genesisOnboarding.designFirstModelArchitecture')}
                  </h3>
                  <p className="mutating-text-muted text-[11px] mt-0.5">
                    {tr(state.language, 'genesisOnboarding.configureTopologyParameterCountInitial')}
                  </p>
                </div>
              )}

              {/* Model Name Input */}
              <div className="space-y-1">
                <label className="text-[11px] mutating-text-muted block font-bold">{tr(state.language, 'genesisOnboarding.modelName')}</label>
                <input
                  type="text"
                  value={modelName}
                  onChange={(e) => {
                    setModelName(e.target.value);
                    setModelNameEdited(true);
                  }}
                  className="w-full theme-panel-bg border theme-accent-border rounded px-3 py-1.5 text-xs mutating-accent-text outline-none"
                />
              </div>

              {/* Model Configuration */}
              {difficulty === 'beginner' ? (
                /* Automated Configuration Cards for Beginners */
                <div className="space-y-2.5">
                  {/* 1. Topology */}
                  <div className="p-3 rounded-lg border theme-accent-soft theme-accent-border flex items-start gap-3">
                    <div className="p-2 rounded theme-sub-bg border theme-border mt-0.5 shrink-0">
                      <Cpu className="w-4 h-4 mutating-accent-text" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center justify-between gap-2 flex-wrap">
                        <span className="font-bold text-xs mutating-accent-text">
                          {tr(state.language, 'genesisOnboarding.topologyAutoregressiveTransformerDecoderOnly')}
                        </span>
                        <span className="text-[11px] px-1.5 py-0.2 rounded theme-accent-soft mutating-accent-text border theme-accent-border font-bold">
                          {tr(state.language, 'genesisOnboarding.starterStandard')}
                        </span>
                      </div>
                      <p className="text-[11px] theme-text mt-1 leading-snug">
                        {tr(state.language, 'genesisOnboarding.denseSelfAttentionMechanismCausal')}
                      </p>
                    </div>
                  </div>

                  {/* 2. Parameters */}
                  <div className="p-3 rounded-lg border theme-warn-soft theme-warn-border flex items-start gap-3">
                    <div className="p-2 rounded theme-sub-bg border theme-border mt-0.5 shrink-0">
                      <Sliders className="w-4 h-4 theme-warn-text" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center justify-between gap-2 flex-wrap">
                        <span className="font-bold text-xs theme-warn-text">
                          {tr(state.language, 'genesisOnboarding.parameterScale14Million14m')}
                        </span>
                        <span className="text-[11px] px-1.5 py-0.2 rounded theme-warn-soft theme-warn-text border theme-warn-border font-bold">
                          {tr(state.language, 'genesisOnboarding.autoCalibrated')}
                        </span>
                      </div>
                      <p className="text-[11px] theme-text mt-1 leading-snug">
                        {tr(state.language, 'genesisOnboarding.optimallyCalibratedFitComfortablyStarter')}
                      </p>
                    </div>
                  </div>

                  {/* 3. Quantization */}
                  <div className="p-3 rounded-lg border theme-accent-soft theme-accent-border flex items-start gap-3">
                    <div className="p-2 rounded theme-sub-bg border theme-border mt-0.5 shrink-0">
                      <Database className="w-4 h-4 mutating-accent-text" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center justify-between gap-2 flex-wrap">
                        <span className="font-bold text-xs mutating-accent-text">
                          {tr(state.language, 'genesisOnboarding.weightPrecisionInt8Quantized1')}
                        </span>
                        <span className="text-[11px] px-1.5 py-0.2 rounded theme-accent-soft mutating-accent-text border theme-accent-border font-bold">
                          {tr(state.language, 'genesisOnboarding.autoOptimized')}
                        </span>
                      </div>
                      <p className="text-[11px] theme-text mt-1 leading-snug">
                        {tr(state.language, 'genesisOnboarding.n8BitIntegerTensorQuantization')}
                      </p>
                    </div>
                  </div>
                </div>
              ) : (
                /* Selectable Options for Normal / Engineer Difficulties */
                <div className="space-y-3">
                  {/* Parameter Size */}
                  <div className="space-y-1.5">
                    <label className="text-[11px] mutating-text-muted block font-bold">{tr(state.language, 'genesisOnboarding.initialParameterScale')}</label>
                    <div className="grid grid-cols-3 gap-2">
                      {[
                        { val: 7_000_000, label: tr(state.language, 'genesisOnboarding.n7mParameters'), note: tr(state.language, 'genesisOnboarding.veryLightweightConvergesSeconds') },
                        { val: 14_000_000, label: tr(state.language, 'genesisOnboarding.n14mParameters'), note: tr(state.language, 'genesisOnboarding.recommendedGoodStartingBalance') },
                        { val: 28_000_000, label: tr(state.language, 'genesisOnboarding.n28mParameters'), note: tr(state.language, 'genesisOnboarding.moreReasoningCapacityRequiresMore') }
                      ].map(p => (
                        <button
                          key={p.val}
                          type="button"
                          onClick={() => { sound.playKeyClick(); setModelParams(p.val); }}
                          className={`p-2.5 rounded border text-left transition-colors cursor-pointer ${
                            modelParams === p.val
                              ? 'theme-warn-soft theme-warn-border theme-warn-text'
                              : 'theme-sub-bg theme-border mutating-text-muted'
                          }`}
                        >
                          <div className="font-bold text-xs">{p.label}</div>
                          <div className="text-[11px] mutating-text-muted mt-1">{p.note}</div>
                        </button>
                      ))}
                    </div>
                  </div>

                  {/* Quantization */}
                  <div className="space-y-1.5">
                    <label className="text-[11px] mutating-text-muted block font-bold">{tr(state.language, 'genesisOnboarding.weightQuantization')}</label>
                    <div className="grid grid-cols-2 gap-2">
                      <button
                        type="button"
                        onClick={() => { sound.playKeyClick(); setModelQuant('int8'); }}
                        className={`p-2.5 rounded border text-left cursor-pointer ${
                          modelQuant === 'int8' ? 'theme-accent-soft theme-accent-border mutating-accent-text' : 'theme-sub-bg theme-border mutating-text-muted'
                        }`}
                      >
                        <div className="font-bold text-xs">{tr(state.language, 'genesisOnboarding.int8QuantizedRecommended')}</div>
                        <div className="text-[11px] mutating-text-muted">{tr(state.language, 'genesisOnboarding.n1BytePerWeightFits')}</div>
                      </button>
                      <button
                        type="button"
                        onClick={() => { sound.playKeyClick(); setModelQuant('bf16'); }}
                        className={`p-2.5 rounded border text-left cursor-pointer ${
                          modelQuant === 'bf16' ? 'theme-accent-soft theme-accent-border mutating-accent-text' : 'theme-sub-bg theme-border mutating-text-muted'
                        }`}
                      >
                        <div className="font-bold text-xs">{tr(state.language, 'genesisOnboarding.bf16HalfPrecision')}</div>
                        <div className="text-[11px] mutating-text-muted">{tr(state.language, 'genesisOnboarding.n2BytesPerWeightGreater')}</div>
                      </button>
                    </div>
                  </div>
                </div>
              )}

              {/* Ready summary banner */}
              <div className="p-2.5 rounded theme-success-soft border theme-success-border text-[11px] theme-success-text flex items-center gap-2">
                <CheckCircle2 className="w-4 h-4 theme-success-text shrink-0" />
                <span>
                  {tr(state.language, 'genesisOnboarding.architectureReadyClickNextExecute')}
                </span>
              </div>
            </div>
          )}

          {/* STEP 5: First Training Genesis & Awakening */}
          {step === 5 && (
            <div className="space-y-4">
              <div className="p-3 theme-panel-bg border theme-accent-border rounded-lg space-y-1">
                <span className="mutating-accent-text font-bold text-xs flex items-center gap-1.5">
                  <Sparkles className="w-4 h-4 mutating-accent-text" />
                  {tr(state.language, 'genesisOnboarding.genesisInitializationRun')}
                </span>
                <p className="theme-text text-xs">
                  <RichText
                    lang={state.language}
                    k="genesisOnboarding.allConnected"
                    params={{ gpu: currentGpuObj.name, data: starterDataOptions.find(d => d.id === selectedData)?.name.split(' (')[0], model: modelName }}
                    tags={{
                      gpu: (c, k) => <strong key={k} className="mutating-accent-text">{c}</strong>,
                      data: (c, k) => <strong key={k} className="theme-success-text">{c}</strong>,
                      model: (c, k) => <strong key={k} className="theme-warn-text">{c}</strong>
                    }}
                  />
                </p>
              </div>

              {/* Training Simulation Container */}
              {!isTrainingSimulation && !simComplete ? (
                <div className="p-8 theme-panel-bg border theme-accent-border rounded-lg text-center space-y-3">
                  <Activity className="w-10 h-10 mutating-accent-text mx-auto animate-pulse" />
                  <div>
                    <h4 className="font-bold theme-text text-sm">{tr(state.language, 'genesisOnboarding.clusterReadyStart')}</h4>
                    <p className="mutating-text-muted text-xs mt-1">
                      {tr(state.language, 'genesisOnboarding.compileTensorsRunFirstOptimization')}
                    </p>
                  </div>
                  <button
                    type="button"
                    onClick={handleLaunchInitialTraining}
                    className="px-5 py-2.5 mutating-btn-primary theme-on-accent font-bold text-xs rounded flex items-center gap-2 mx-auto cursor-pointer"
                  >
                    <Play className="w-4 h-4 fill-current" />
                    <span>{tr(state.language, 'genesisOnboarding.startGenesisTraining')}</span>
                  </button>
                </div>
              ) : (
                <div className="p-4 theme-panel-bg border theme-accent-border rounded-lg space-y-3">
                  <div className="flex items-center justify-between text-xs">
                    <span className="font-bold mutating-accent-text flex items-center gap-1.5">
                      <Activity className="w-4 h-4 theme-success-text animate-spin" />
                      {tr(state.language, 'genesisOnboarding.optimizationProgress')} {trainingProgress}%
                    </span>
                    <span className="theme-success-text font-bold font-mono">
                      {tr(state.language, 'genesisOnboarding.loss')}: {simLoss} {simComplete ? tr(state.language, 'genesisOnboarding.converged') : ''}
                    </span>
                  </div>

                  {/* Progress bar */}
                  <div className="w-full h-3 theme-sub-bg rounded-full overflow-hidden border theme-accent-border">
                    <div
                      className="h-full theme-gradient transition-all duration-300 rounded-full"
                      style={{ width: `${trainingProgress}%` }}
                    />
                  </div>

                  {/* Mini loss chart */}
                  <div className="h-16 theme-panel-bg border theme-accent-border rounded p-1 flex items-end gap-1">
                    {simHistory.map((pt, i) => (
                      <div
                        key={i}
                        className="flex-1 theme-accent-soft rounded-t"
                        style={{ height: `${Math.max(10, Math.min(100, (pt / 4.8) * 100))}%` }}
                      />
                    ))}
                  </div>

                  {simComplete && (
                    <div className="p-3 theme-accent-soft border theme-accent-border rounded mutating-accent-text text-xs space-y-1 animate-fadeIn">
                      <div className="font-bold mutating-accent-text flex items-center gap-1">
                        <Sparkles className="w-3.5 h-3.5" />
                        {tr(state.language, 'genesisOnboarding.emergentThoughtNeuralAwakening')}
                      </div>
                      <p className="italic text-[11px] theme-text">
                        {tr((en ? 'en' : 'es'), 'genesisOnboarding.buddybotOnlineHiIAm', { callsign })}
                      </p>
                    </div>
                  )}
                </div>
              )}
            </div>
          )}
        </div>

        {/* Footer Navigation */}
        <div className="p-3.5 theme-panel-bg border-t theme-accent-border flex flex-wrap sm:flex-nowrap items-center justify-between gap-2.5">
          {step > 1 ? (
            <button
              type="button"
              onClick={() => { sound.playNavSwitch(); setStep(step - 1); }}
              className="px-3 py-2 theme-raised-bg theme-text rounded text-xs flex items-center gap-1.5 transition-colors cursor-pointer touch-manipulation"
            >
              <ArrowLeft className="w-3.5 h-3.5" />
              <span>{tr(state.language, 'genesisOnboarding.back')}</span>
            </button>
          ) : (
            <span className="text-[11px] mutating-text-muted">{tr(state.language, 'genesisOnboarding.phase1IdentityProtocol')}</span>
          )}

          {step < 5 ? (
            <button
              type="button"
              onClick={() => { sound.playNavSwitch(); setStep(step + 1); }}
              className="px-4 py-2 mutating-btn-primary theme-on-accent font-bold rounded text-xs flex items-center gap-1.5 transition-all cursor-pointer touch-manipulation ml-auto sm:ml-0"
            >
              <span>{tr(state.language, 'genesisOnboarding.next')}</span>
              <ArrowRight className="w-3.5 h-3.5" />
            </button>
          ) : (
            <div className="flex flex-col sm:flex-row items-end sm:items-center gap-2 w-full sm:w-auto justify-end">
              {!simComplete && (
                <span className="text-[11px] theme-warn-text font-mono animate-pulse">
                  {tr((isEs ? 'es' : 'en'), 'genesisOnboarding.clickStartGenesisTrainingAbove')}
                </span>
              )}
              <button
                type="button"
                onClick={handleFinishOnboarding}
                disabled={!simComplete}
                title={!simComplete ? (tr((isEs ? 'es' : 'en'), 'genesisOnboarding.runGenesisTrainingAboveFirst')) : undefined}
                className={`w-full sm:w-auto justify-center px-4 sm:px-5 py-2.5 rounded-lg text-xs font-black flex items-center gap-2 transition-all touch-manipulation ${
                  simComplete
                    ? 'theme-gradient theme-on-accent cursor-pointer hover:scale-[1.02] active:scale-95 animate-pulse'
                    : 'theme-raised-bg mutating-text-muted border theme-border cursor-not-allowed opacity-40 pointer-events-none'
                }`}
              >
                <CheckCircle2 className="w-4 h-4 shrink-0" />
                <span className="text-center">{tr(state.language, 'genesisOnboarding.enterSynapseOsStartSimulation')}</span>
              </button>
            </div>
          )}
        </div>
        <AuthModal isOpen={authOpen} onClose={() => setAuthOpen(false)} />
      </div>
    </div>
  );
};
