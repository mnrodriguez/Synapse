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
import { localize } from '../utils/i18n';
import { AuthModal } from './AuthModal';

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
      desc: 'Pascal de segunda mano. Balanceada, fría y altamente compatible con cuantización INT8.',
      badge: 'EQUILIBRADA'
    },
    {
      id: 'gpu_rx580_dual',
      name: 'Dual AMD Radeon RX 580 (16GB VRAM)',
      price: 180,
      compute: '11.0 TFLOPS',
      vram: 16,
      heat: '1.6°C/min',
      desc: 'CrossFire Polaris. Ofrece 16GB de VRAM para entrenar ventanas de contexto amplias sin OOM.',
      badge: 'ALTA VRAM'
    },
    {
      id: 'gpu_tesla_k80',
      name: 'Used Tesla K80 Dual-GK210 (24GB VRAM)',
      price: 210,
      compute: '8.7 TFLOPS',
      vram: 24,
      heat: '1.9°C/min',
      desc: 'Acelerador de datacenter. 24GB de memoria masiva para modelos más densos, pero mayor calor.',
      badge: 'MÁXIMA MEMORIA'
    },
    {
      id: 'gpu_coral_edge',
      name: 'Coral Edge TPU + GTX 1050 (4GB)',
      price: 130,
      compute: '6.2 TFLOPS',
      vram: 4,
      heat: '0.6°C/min',
      desc: 'Híbrido con ASIC de bajo consumo. Máximo ahorro de presupuesto inicial y muy baja temperatura.',
      badge: 'BAJO CONSUMO'
    }
  ];

  const starterCoolingOptions = [
    {
      id: 'cool_air_basic',
      name: 'Ventiladores Industriales de 120mm',
      price: 40,
      capacity: '0.9 kW',
      desc: 'Flujo de aire forzado ruidoso pero suficiente para una tarjeta de bajo consumo.'
    },
    {
      id: 'cool_copper_pipes',
      name: 'Heatpipes de Cobre & Disipador Doble Torre',
      price: 85,
      capacity: '1.8 kW',
      desc: 'Disipación de alto flujo por contacto directo de cobre puro para configuraciones más potentes.'
    }
  ];

  const starterPowerOptions = [
    {
      id: 'power_wall_socket',
      name: 'Toma Eléctrica Domiciliaria (1.5 kW)',
      price: 20,
      capacity: '1.5 kW',
      desc: 'Suministro eléctrico domiciliario. Imprescindible para alimentar GPU y ventiladores.'
    },
    {
      id: 'power_solar_array',
      name: 'Micro-Inversor Solar Residencial (3.0 kW)',
      price: 55,
      capacity: '3.0 kW',
      desc: 'Paneles solares complementarios. Duplican la potencia sin riesgo de sobrecargar el circuito.'
    }
  ];

  const starterNetworkOptions = [
    {
      id: 'net_gigabit',
      name: 'Red Ethernet Gigabit Cat 6 (1 Gbps)',
      price: 30,
      bandwidth: '1 Gbps',
      desc: 'Conexión a internet estándar de alta velocidad. Imprescindible para descargar datasets y comunicar agentes.'
    },
    {
      id: 'net_fiber_10g',
      name: 'Fibra Óptica Dedicada Punto a Punto (10 Gbps)',
      price: 75,
      bandwidth: '10 Gbps',
      desc: 'Enlace simétrico de fibra óptica empresarial. Acelera la descarga masiva de datos y reduce latencia.'
    }
  ];

  const starterDataOptions = [
    {
      id: 'data_relational_sql',
      name: 'Base de Datos Relacional SQL & Registros Tabulares',
      type: 'relational_sql',
      icon: Database,
      desc: 'Esquemas PostgreSQL normalizados con registros financieros, transacciones contables y telemetría.',
      bonus: '+20% Precisión en Contratos Financieros y Arbitraje',
      lore: 'Fundamento de exactitud matemática y determinismo de datos sin inconsistencias.'
    }
  ];

  const gpuEnglishCopy: Record<string, { badge: string; desc: string }> = {
    gpu_gtx1060: { badge: 'BALANCED', desc: 'Used Pascal card. Balanced, cool, and highly compatible with INT8 quantization.' },
    gpu_rx580_dual: { badge: 'HIGH VRAM', desc: 'Polaris CrossFire setup. 16 GB of VRAM for training with larger context windows.' },
    gpu_tesla_k80: { badge: 'MAXIMUM MEMORY', desc: 'Data-center accelerator. 24 GB of memory for denser models, with higher heat output.' },
    gpu_coral_edge: { badge: 'LOW POWER', desc: 'Low-power ASIC hybrid. Keeps the initial budget and operating temperature down.' }
  };
  const coolingEnglishCopy: Record<string, { name: string; desc: string }> = {
    cool_air_basic: {
      name: '120mm Industrial Fans',
      desc: 'Noisy forced-air cooling, sufficient for a low-power card.'
    },
    cool_copper_pipes: {
      name: 'Copper Heatpipes & Dual-Tower Cooler',
      desc: 'High-flow cooling with direct copper contact for more powerful setups.'
    }
  };
  const powerEnglishCopy: Record<string, { name: string; desc: string }> = {
    power_wall_socket: {
      name: 'Residential Power Outlet (15A - 1.5 kW)',
      desc: 'Standard household power supply. Mandatory to power your GPU and cooling fans.'
    },
    power_solar_array: {
      name: 'Residential Solar Micro-Inverter (3.0 kW)',
      desc: 'Auxiliary solar panels. Doubles your power capacity without grid overload.'
    }
  };
  const networkEnglishCopy: Record<string, { name: string; desc: string }> = {
    net_gigabit: {
      name: 'Gigabit Ethernet Cat 6 (1 Gbps)',
      desc: 'High-speed standard internet connection. Mandatory to fetch training datasets and communicate agents.'
    },
    net_fiber_10g: {
      name: 'Dedicated Point-to-Point Fiber (10 Gbps)',
      desc: 'Symmetrical enterprise fiber optic link. Accelerates massive data streaming and reduces latency.'
    }
  };
  const dataEnglishCopy: Record<string, { name: string; desc: string; bonus: string; lore: string }> = {
    data_relational_sql: {
      name: 'SQL Relational Database & Tabular Records',
      desc: 'Normalized PostgreSQL schemas with financial records, accounting transactions, and telemetry.',
      bonus: '+20% accuracy on financial contracts and analysis',
      lore: 'A foundation for mathematical accuracy and deterministic, consistent data.'
    },
    data_vector_rag: {
      name: 'Vector Embedding Database (HNSW RAG)',
      desc: 'A 1,536-dimensional latent space with HNSW indexing for real-time semantic retrieval.',
      bonus: '+35% associative memory and contextual reasoning',
      lore: 'Retrieve information from millions of corporate documents and research papers.'
    },
    data_knowledge_graph: {
      name: 'Ontological Knowledge Graph (RDF Triples)',
      desc: 'Entities and causal relationships represented as subject-predicate-object triples.',
      bonus: 'Reduces hallucinations and enables causal reasoning',
      lore: 'Connects causes and effects through explicit logical relationships.'
    }
  };

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
                {localize(state.language, 'CONFIGURACIÓN INICIAL', 'INITIAL SETUP')}
              </span>
              <h2 className="text-sm font-bold mutating-accent-text tracking-wider">
                {localize(state.language, `FASE ${step} DE 5: `, `PHASE ${step} OF 5: `)}{
                  step === 1 ? localize(state.language, 'IDENTIDAD Y CONCESIÓN DE FONDOS', 'IDENTITY & STARTING FUNDS') :
                  step === 2 ? localize(state.language, 'ADQUISICIÓN DE HARDWARE INICIAL', 'INITIAL HARDWARE ACQUISITION') :
                  step === 3 ? localize(state.language, 'MODALIDAD DE DATOS & CONOCIMIENTO', 'DATA & KNOWLEDGE SOURCES') :
                  step === 4 ? localize(state.language, 'ARQUITECTURA DEL PRIMER MODELO', 'FIRST MODEL ARCHITECTURE') :
                  localize(state.language, 'ENTRENAMIENTO GÉNESIS & DESPERTAR', 'GENESIS TRAINING & AWAKENING')
                }
              </h2>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={() => setLanguage(en ? 'es' : 'en')}
              className="flex items-center gap-1 rounded border theme-accent-border theme-sub-bg px-2 py-1 text-[11px] font-bold mutating-accent-text"
              aria-label={localize(state.language, 'Cambiar idioma a inglés', 'Change language to Spanish')}
            >
              <Languages className="h-3.5 w-3.5" />
              {en ? 'EN · English' : 'ES · Español'}
            </button>
            <button
              type="button"
              onClick={() => setAuthOpen(true)}
              className="flex items-center gap-1 rounded border theme-border theme-sub-bg px-2 py-1 text-[11px] font-bold theme-text"
            >
              <Cloud className="h-3.5 w-3.5 mutating-accent-text" />
              {localize(state.language, 'INICIAR SESIÓN', 'SIGN IN')}
            </button>
          </div>

          {/* Budget tracker */}
          <div className="flex items-center gap-2 px-3 py-1 rounded theme-warn-soft border theme-warn-border theme-warn-text text-xs">
            <DollarSign className="w-3.5 h-3.5 theme-warn-text" />
            <span className="mutating-text-muted">{localize(state.language, 'PRESUPUESTO REMANENTE:', 'REMAINING BUDGET:')}</span>
            <span className="font-bold text-sm theme-warn-text">${remainingBudget} CR</span>
          </div>
        </div>

        {/* Visual Progress Steps Indicators */}
        <div className="grid grid-cols-5 theme-panel-bg border-b theme-accent-border text-[11px] text-center font-bold">
          {[
            { num: 1, label: localize(state.language, 'Identidad', 'Identity') },
            { num: 2, label: 'Hardware' },
            { num: 3, label: localize(state.language, 'Datos', 'Data') },
            { num: 4, label: localize(state.language, 'Arquitectura', 'Architecture') },
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
        <div className="p-5 flex-1 overflow-y-auto space-y-4 text-xs theme-text max-h-[65vh]">
          {/* STEP 1: Callsign & Lore */}
          {step === 1 && (
            <div className="space-y-4">
              <div className="p-3 theme-panel-bg border theme-accent-border rounded-lg space-y-2">
                <span className="mutating-accent-text font-bold text-xs flex items-center gap-1.5">
                  <TermIcon className="w-4 h-4" />
                  {localize(state.language, 'MENSAJE DE BIENVENIDA', 'WELCOME MESSAGE')}
                </span>
                <p className="theme-text leading-relaxed">
                  {localize(state.language, 'Bienvenido a ', 'Welcome to ')}<strong>SYNAPSE</strong>{localize(state.language, ', un pequeño estudio para aprender a ', ', a small studio to learn how to ')}<strong>{localize(state.language, 'construir y entrenar tu propia inteligencia artificial desde cero', 'build and train your own artificial intelligence from scratch')}</strong>{localize(state.language, '. Empiezas con una PC modesta y un modelo diminuto; con práctica, buenos datos y algunos trabajos pagos, va a crecer.', '. You start with a modest PC and a tiny model; with practice, good data and a few paid jobs, it will grow.')}
                </p>
                <p className="mutating-text-muted text-[11px] leading-relaxed">
                  {localize(state.language, 'Has recibido un fondo semilla de ', 'You received ')}<strong>$350 CR</strong>{localize(state.language, ' de un programa de ciencia abierta. Con este presupuesto ajustado, deberás adquirir tu primer rig de cómputo, elegir tu primer pipeline de datos y diseñar los pesos de tu primer modelo de lenguaje.', ' in seed funding from an open-science program. With this limited budget, acquire your first compute rig, choose a data pipeline, and design the weights of your first language model.')}
                </p>
              </div>

              <div className="space-y-2 pt-2">
                <label className="text-xs theme-text font-bold block">
                  {localize(state.language, 'ELIGE TU NOMBRE DE USUARIO:', 'CHOOSE YOUR USERNAME:')}
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
                    title={localize(state.language, 'Generar nombre aleatorio', 'Generate a random name')}
                  >
                    <Shuffle className="w-3.5 h-3.5" />
                    <span>{localize(state.language, 'ALEATORIO', 'RANDOM')}</span>
                  </button>
                </div>
                <span className="text-[11px] mutating-text-muted block">
                  {localize(state.language, 'Este nombre aparece en tus trabajos y en el ranking global.', 'This name appears on your jobs and on the global leaderboard.')}
                </span>
              </div>

              {/* Difficulty Level Selection */}
              <div className="space-y-2 pt-3 border-t theme-accent-border">
                <label className="text-xs theme-text font-bold block flex items-center gap-1.5">
                  <Sliders className="w-4 h-4 mutating-accent-text" />
                  {localize(state.language, 'SELECCIONA EL NIVEL DE DIFICULTAD DE LA SIMULACIÓN:', 'SELECT SIMULATION DIFFICULTY LEVEL:')}
                </label>

                <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
                  {[
                    {
                      id: 'beginner',
                      title: isEs ? 'Principiante (Aprendiz)' : 'Beginner (Novice)',
                      desc: isEs ? 'Aprende cómo se entrena una IA con controles simplificados, tarjetas educativas y bonificación de fondos.' : 'Learn AI training fundamentals with simplified controls, guided cards, and reward bonus.',
                      badge: '+25% RECOMPENSAS'
                    },
                    {
                      id: 'normal',
                      title: isEs ? 'Normal (Práctico)' : 'Normal (Practitioner)',
                      desc: isEs ? 'Nivel intermedio con hiperparámetros esenciales (Cuantización, Temperatura, Top-P, RAG, LoRA).' : 'Intermediate level with essential hyperparameters (Quantization, Temp, Top-P, RAG, LoRA).',
                      badge: 'BALANCEADO'
                    },
                    {
                      id: 'engineer',
                      title: isEs ? 'Ingeniero (Arquitecto)' : 'Engineer (Architect)',
                      desc: isEs ? 'Simulación completa e irrestricta. Control total sobre pérdidas DPO/PPO, prompts y matriz de hardware.' : 'Full unconstrained simulation. Full control over loss functions, system prompts, and cluster hardware.',
                      badge: 'EXPERIENCIA COMPLETA'
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
                  {localize(state.language, '1. SELECCIONA TU PRIMER ACELERADOR DE CÓMPUTO (GPU / ASIC):', '1. CHOOSE YOUR FIRST COMPUTE ACCELERATOR (GPU / ASIC):')}
                </h3>
                <p className="mutating-text-muted text-[11px] mt-0.5">
                  {localize(state.language, 'Elige tu arquitectura de procesamiento inicial. Una GPU con mayor VRAM te permitirá entrenar modelos más densos, mientras que una más fría mantendrá a raya el recalentamiento.', 'Choose your initial compute hardware. More VRAM supports larger models, while a more efficient card helps control heat.')}
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
                            {en ? gpuEnglishCopy[gpu.id]?.badge ?? gpu.badge : gpu.badge}
                          </span>
                          <h4 className="font-bold text-xs theme-text">{gpu.name}</h4>
                        </div>
                        <span className="theme-warn-text font-bold text-xs">${gpu.price} CR</span>
                      </div>
                      <p className="text-[11px] mutating-text-muted mt-2 leading-snug">{en ? gpuEnglishCopy[gpu.id]?.desc ?? gpu.desc : gpu.desc}</p>
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
                  {localize(state.language, '2. REFRIGERACIÓN BÁSICA (OBLIGATORIA PARA EVITAR INCENDIO TÉRMICO):', '2. BASIC COOLING (MANDATORY TO PREVENT THERMAL OVERHEAT):')}
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
                          <h4 className="font-bold text-xs theme-text">{en ? coolingEnglishCopy[cool.id]?.name ?? cool.name : cool.name}</h4>
                          <span className="theme-warn-text font-bold text-xs">${cool.price} CR</span>
                        </div>
                        <p className="text-[11px] mutating-text-muted mt-1 leading-snug">{en ? coolingEnglishCopy[cool.id]?.desc ?? cool.desc : cool.desc}</p>
                        <span className="text-[11px] theme-success-text block mt-1.5 font-bold">
                          {localize(state.language, 'Disipación:', 'Cooling capacity:')} {cool.capacity}
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
                  {localize(state.language, '3. CONEXIÓN A RED ELÉCTRICA (OBLIGATORIA PARA ENCENDER EL CLÚSTER):', '3. POWER GRID CONNECTION (MANDATORY TO POWER ON CLUSTER):')}
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
                          <h4 className="font-bold text-xs theme-text">{en ? powerEnglishCopy[pow.id]?.name ?? pow.name : pow.name}</h4>
                          <span className="theme-warn-text font-bold text-xs">${pow.price} CR</span>
                        </div>
                        <p className="text-[11px] mutating-text-muted mt-1 leading-snug">{en ? powerEnglishCopy[pow.id]?.desc ?? pow.desc : pow.desc}</p>
                        <span className="text-[11px] theme-warn-text block mt-1.5 font-bold">
                          {localize(state.language, 'Capacidad:', 'Power capacity:')} {pow.capacity}
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
                  {localize(state.language, '4. INTERCONEXIÓN DE RED (OBLIGATORIA PARA DESCARGAR DATOS Y AGENTES):', '4. NETWORK INTERCONNECT (MANDATORY TO FETCH DATASETS & AGENTS):')}
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
                          <h4 className="font-bold text-xs theme-text">{en ? networkEnglishCopy[net.id]?.name ?? net.name : net.name}</h4>
                          <span className="theme-warn-text font-bold text-xs">${net.price} CR</span>
                        </div>
                        <p className="text-[11px] mutating-text-muted mt-1 leading-snug">{en ? networkEnglishCopy[net.id]?.desc ?? net.desc : net.desc}</p>
                        <span className="text-[11px] mutating-accent-text block mt-1.5 font-bold">
                          {localize(state.language, 'Ancho de banda:', 'Bandwidth:')} {net.bandwidth}
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
                    {localize(state.language, 'ESTADO DEL RIG (4/4 COMPONENTES):', 'RIG STATUS (4/4 COMPONENTS):')}
                  </span>
                  <span className={`px-2 py-0.5 rounded text-[11px] font-bold ${selectedGpu ? 'theme-success-text theme-success-soft border theme-success-border' : 'theme-danger-text theme-danger-soft border theme-danger-border'}`}>
                    1. GPU {selectedGpu ? '✓' : '✗'}
                  </span>
                  <span className={`px-2 py-0.5 rounded text-[11px] font-bold ${selectedCooling ? 'theme-success-text theme-success-soft border theme-success-border' : 'theme-danger-text theme-danger-soft border theme-danger-border'}`}>
                    2. REFRIGERACIÓN {selectedCooling ? '✓' : '✗'}
                  </span>
                  <span className={`px-2 py-0.5 rounded text-[11px] font-bold ${selectedPower ? 'theme-success-text theme-success-soft border theme-success-border' : 'theme-danger-text theme-danger-soft border theme-danger-border'}`}>
                    3. ENERGÍA {selectedPower ? '✓' : '✗'}
                  </span>
                  <span className={`px-2 py-0.5 rounded text-[11px] font-bold ${selectedNetwork ? 'theme-success-text theme-success-soft border theme-success-border' : 'theme-danger-text theme-danger-soft border theme-danger-border'}`}>
                    4. RED {selectedNetwork ? '✓' : '✗'}
                  </span>
                </div>

                <div className="text-right">
                  <span className="text-[11px] mutating-text-muted block">{localize(state.language, 'PRESUPUESTO:', 'BUDGET:')}</span>
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
                  {localize(state.language, 'MODALIDAD DE CONOCIMIENTO INICIAL (PIPELINE):', 'INITIAL KNOWLEDGE SOURCE (DATA PIPELINE):')}
                </h3>
                <p className="mutating-text-muted text-[11px] mt-0.5">
                  {localize(state.language, 'Tu laboratorio comenzará equipado con el pipeline relacional fundamental para alimentar tus primeros modelos y contratos:', 'Your lab begins equipped with the foundational relational pipeline to power initial models and contracts:')}
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
                          <h4 className="font-bold text-xs theme-text">{en ? dataEnglishCopy[ds.id]?.name ?? ds.name : ds.name}</h4>
                          <span className="text-[11px] px-2 py-0.5 theme-success-soft border theme-success-border theme-success-text font-bold rounded flex items-center gap-1">
                            <CheckCircle2 className="w-3.5 h-3.5 theme-success-text" />
                            {isEs ? 'INCLUIDO DE SERIE' : 'STARTER PIPELINE'}
                          </span>
                        </div>
                        <p className="text-xs theme-text mt-1">{en ? dataEnglishCopy[ds.id]?.desc ?? ds.desc : ds.desc}</p>
                        <div className="p-1.5 mt-2 theme-panel-bg border theme-accent-border rounded text-[11px] space-y-0.5">
                          <span className="mutating-accent-text font-bold block">{en ? dataEnglishCopy[ds.id]?.bonus ?? ds.bonus : ds.bonus}</span>
                          <span className="mutating-text-muted block">{en ? dataEnglishCopy[ds.id]?.lore ?? ds.lore : ds.lore}</span>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>

              <div className="p-2.5 rounded theme-sub-bg border theme-border text-[11px] mutating-text-muted flex items-center gap-2">
                <Sparkles className="w-4 h-4 mutating-accent-text shrink-0" />
                <span>
                  {isEs 
                    ? 'Los motores avanzados (Bases Vectoriales HNSW, Grafos Ontológicos y Cómputo Sintético) se desbloquearán en la pestaña DATOS conforme expanda su laboratorio.'
                    : 'Advanced modalities (HNSW Vector Embeddings, Knowledge Graphs, and Synthetic Data) will unlock in the DATA tab as your lab scales.'}
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
                      {localize(state.language, 'ARQUITECTURA DEL MODELO (CALIBRACIÓN AUTOMATIZADA):', 'FIRST MODEL ARCHITECTURE (AUTOMATED CALIBRATION):')}
                    </h3>
                    <span className="text-[11px] px-2 py-0.5 rounded theme-success-soft border theme-success-border theme-success-text font-bold flex items-center gap-1">
                      <CheckCircle2 className="w-3.5 h-3.5 theme-success-text" />
                      {localize(state.language, 'AUTOMATIZADO PARA PRINCIPIANTES', 'AUTOMATED FOR BEGINNERS')}
                    </span>
                  </div>
                  <p className="mutating-text-muted text-[11px] mt-1 leading-snug">
                    {localize(
                      state.language,
                      'Para garantizar una experiencia sin errores de memoria (OOM) ni sobrecalentamiento, la topología, los parámetros y la cuantización de pesos se configuran automáticamente calibrados para tu hardware inicial:',
                      'To ensure seamless training without Out-Of-Memory (OOM) errors or overheating, the neural topology, parameter scale, and weight quantization are automatically calibrated for your starter hardware:'
                    )}
                  </p>
                </div>
              ) : (
                <div>
                  <h3 className="font-bold text-xs mutating-accent-text flex items-center gap-1.5">
                    <Layers className="w-4 h-4 mutating-accent-text" />
                    {localize(state.language, 'DISEÑA LA ARQUITECTURA DE TU PRIMER MODELO:', 'DESIGN YOUR FIRST MODEL ARCHITECTURE:')}
                  </h3>
                  <p className="mutating-text-muted text-[11px] mt-0.5">
                    {localize(state.language, 'Configura la topología, el tamaño de parámetros y la precisión matemática inicial:', 'Configure the topology, parameter count, and initial numerical precision:')}
                  </p>
                </div>
              )}

              {/* Model Name Input */}
              <div className="space-y-1">
                <label className="text-[11px] mutating-text-muted block font-bold">{localize(state.language, 'NOMBRE DE LA RED NEURONAL:', 'MODEL NAME:')}</label>
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
                          {localize(state.language, 'Topología: Transformer Autoregresivo (Decoder-Only)', 'Topology: Autoregressive Transformer (Decoder-Only)')}
                        </span>
                        <span className="text-[11px] px-1.5 py-0.2 rounded theme-accent-soft mutating-accent-text border theme-accent-border font-bold">
                          {localize(state.language, 'INICIAL ESTÁNDAR ✓', 'STARTER STANDARD ✓')}
                        </span>
                      </div>
                      <p className="text-[11px] theme-text mt-1 leading-snug">
                        {localize(
                          state.language,
                          'Mecanismo de auto-atención densa con enmascaramiento causal. Es el estándar de la industria: estable, determinista y de convergencia rápida garantizada.',
                          'Dense self-attention mechanism with causal masking. The battle-tested industry standard: reliable, deterministic, and fast converging.'
                        )}
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
                          {localize(state.language, 'Escala de Parámetros: 14 Millones (14M / 0.014B)', 'Parameter Scale: 14 Million (14M / 0.014B)')}
                        </span>
                        <span className="text-[11px] px-1.5 py-0.2 rounded theme-warn-soft theme-warn-text border theme-warn-border font-bold">
                          {localize(state.language, 'CALIBRADO AUTOMÁTICO ✓', 'AUTO-CALIBRATED ✓')}
                        </span>
                      </div>
                      <p className="text-[11px] theme-text mt-1 leading-snug">
                        {localize(
                          state.language,
                          'Calibrado óptimamente para la memoria VRAM y ancho de banda de tu GPU inicial. Permite completar épocas de entrenamiento en segundos.',
                          'Optimally calibrated to fit comfortably in your starter GPU VRAM with zero risk of Out-Of-Memory (OOM) errors.'
                        )}
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
                          {localize(state.language, 'Precisión de Pesos: INT8 Cuantizado (1 Byte / Peso)', 'Weight Precision: INT8 Quantized (1 Byte / Weight)')}
                        </span>
                        <span className="text-[11px] px-1.5 py-0.2 rounded theme-accent-soft mutating-accent-text border theme-accent-border font-bold">
                          {localize(state.language, 'OPTIMIZADO AUTOMÁTICO ✓', 'AUTO-OPTIMIZED ✓')}
                        </span>
                      </div>
                      <p className="text-[11px] theme-text mt-1 leading-snug">
                        {localize(
                          state.language,
                          'Cuantización por tensores enteros de 8 bits. Reduce el uso de memoria a la mitad manteniendo más del 99% de la precisión de razonamiento.',
                          '8-bit integer tensor quantization. Halves memory requirements while retaining 99%+ of full-precision reasoning accuracy.'
                        )}
                      </p>
                    </div>
                  </div>
                </div>
              ) : (
                /* Selectable Options for Normal / Engineer Difficulties */
                <div className="space-y-3">
                  {/* Parameter Size */}
                  <div className="space-y-1.5">
                    <label className="text-[11px] mutating-text-muted block font-bold">{localize(state.language, 'ESCALA DE PARÁMETROS INICIAL:', 'INITIAL PARAMETER SCALE:')}</label>
                    <div className="grid grid-cols-3 gap-2">
                      {[
                        { val: 7_000_000, label: localize(state.language, '7M Parámetros', '7M Parameters'), note: localize(state.language, 'Ultraligero, converge en segundos.', 'Very lightweight; converges in seconds.') },
                        { val: 14_000_000, label: localize(state.language, '14M Parámetros', '14M Parameters'), note: localize(state.language, 'Recomendado. Buen balance inicial.', 'Recommended. A good starting balance.') },
                        { val: 28_000_000, label: localize(state.language, '28M Parámetros', '28M Parameters'), note: localize(state.language, 'Mayor razonamiento, exige más VRAM.', 'More reasoning capacity; requires more VRAM.') }
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
                    <label className="text-[11px] mutating-text-muted block font-bold">{localize(state.language, 'CUANTIZACIÓN DE PESOS:', 'WEIGHT QUANTIZATION:')}</label>
                    <div className="grid grid-cols-2 gap-2">
                      <button
                        type="button"
                        onClick={() => { sound.playKeyClick(); setModelQuant('int8'); }}
                        className={`p-2.5 rounded border text-left cursor-pointer ${
                          modelQuant === 'int8' ? 'theme-accent-soft theme-accent-border mutating-accent-text' : 'theme-sub-bg theme-border mutating-text-muted'
                        }`}
                      >
                        <div className="font-bold text-xs">{localize(state.language, 'INT8 Cuantizado (Recomendado)', 'INT8 Quantized (Recommended)')}</div>
                        <div className="text-[11px] mutating-text-muted">{localize(state.language, '1 byte por peso. Cabe holgadamente en tu GPU.', '1 byte per weight. Fits easily in your GPU memory.')}</div>
                      </button>
                      <button
                        type="button"
                        onClick={() => { sound.playKeyClick(); setModelQuant('bf16'); }}
                        className={`p-2.5 rounded border text-left cursor-pointer ${
                          modelQuant === 'bf16' ? 'theme-accent-soft theme-accent-border mutating-accent-text' : 'theme-sub-bg theme-border mutating-text-muted'
                        }`}
                      >
                        <div className="font-bold text-xs">{localize(state.language, 'BF16 Precisión Media', 'BF16 Half Precision')}</div>
                        <div className="text-[11px] mutating-text-muted">{localize(state.language, '2 bytes por peso. Mayor fidelidad de gradiente.', '2 bytes per weight. Greater gradient fidelity.')}</div>
                      </button>
                    </div>
                  </div>
                </div>
              )}

              {/* Ready summary banner */}
              <div className="p-2.5 rounded theme-success-soft border theme-success-border text-[11px] theme-success-text flex items-center gap-2">
                <CheckCircle2 className="w-4 h-4 theme-success-text shrink-0" />
                <span>
                  {localize(
                    state.language,
                    'ARQUITECTURA LISTA: Haz clic en SIGUIENTE para ejecutar la corrida de inicialización y calibrar los tensores.',
                    'ARCHITECTURE READY: Click NEXT to execute the genesis initialization run and calibrate the neural tensors.'
                  )}
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
                  {localize(state.language, 'CORRIDA DE INICIALIZACIÓN GÉNESIS', 'GENESIS INITIALIZATION RUN')}
                </span>
                <p className="theme-text text-xs">
                  {localize(state.language, 'Todo está conectado: tu GPU ', 'Everything is connected: your GPU ')}<strong className="mutating-accent-text">{currentGpuObj.name}</strong>{localize(state.language, ', el motor de datos ', ', the data engine ')}<strong className="theme-success-text">{en ? dataEnglishCopy[selectedData]?.name.split(' (')[0] ?? starterDataOptions.find(d => d.id === selectedData)?.name.split(' (')[0] : starterDataOptions.find(d => d.id === selectedData)?.name.split(' (')[0]}</strong>{localize(state.language, ' y tu modelo ', ' and your model ')}<strong className="theme-warn-text">{modelName}</strong>{localize(state.language, '. Inicia la corrida para verificar la convergencia inicial de los pesos.', '. Start the run to verify initial weight convergence.')}
                </p>
              </div>

              {/* Training Simulation Container */}
              {!isTrainingSimulation && !simComplete ? (
                <div className="p-8 theme-panel-bg border theme-accent-border rounded-lg text-center space-y-3">
                  <Activity className="w-10 h-10 mutating-accent-text mx-auto animate-pulse" />
                  <div>
                    <h4 className="font-bold theme-text text-sm">{localize(state.language, 'CLÚSTER PREPARADO PARA INICIAR', 'CLUSTER READY TO START')}</h4>
                    <p className="mutating-text-muted text-xs mt-1">
                      {localize(state.language, 'Presiona el botón para compilar los tensores y ejecutar las primeras épocas de optimización.', 'Compile the tensors and run the first optimization epochs.')}
                    </p>
                  </div>
                  <button
                    type="button"
                    onClick={handleLaunchInitialTraining}
                    className="px-5 py-2.5 mutating-btn-primary theme-on-accent font-bold text-xs rounded flex items-center gap-2 mx-auto cursor-pointer"
                  >
                    <Play className="w-4 h-4 fill-current" />
                    <span>{localize(state.language, 'INICIAR ENTRENAMIENTO GÉNESIS', 'START GENESIS TRAINING')}</span>
                  </button>
                </div>
              ) : (
                <div className="p-4 theme-panel-bg border theme-accent-border rounded-lg space-y-3">
                  <div className="flex items-center justify-between text-xs">
                    <span className="font-bold mutating-accent-text flex items-center gap-1.5">
                      <Activity className="w-4 h-4 theme-success-text animate-spin" />
                      {localize(state.language, 'PROGRESO DE OPTIMIZACIÓN:', 'OPTIMIZATION PROGRESS:')} {trainingProgress}%
                    </span>
                    <span className="theme-success-text font-bold font-mono">
                      {localize(state.language, 'Pérdida', 'Loss')}: {simLoss} {simComplete ? localize(state.language, '(CONVERGENCIA OK)', '(CONVERGED)') : ''}
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
                        {localize(state.language, 'PENSAMIENTO EMERGENTE // DESPERTAR NEURONAL:', 'EMERGENT THOUGHT // NEURAL AWAKENING:')}
                      </div>
                      <p className="italic text-[11px] theme-text">
                        {en
                          ? `"BUDDYBOT ONLINE: Hi! I am up and running. My gradients are stable. ${callsign}, shall we take a few jobs to upgrade your PC? I would love to learn more."`
                          : `"BUDDYBOT EN LÍNEA: ¡Hola! Ya estoy funcionando. Mis gradientes están estables. ${callsign}, ¿tomamos algunos trabajos para mejorar tu PC? Me encantaría aprender más."`}
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
              <span>{localize(state.language, 'ANTERIOR', 'BACK')}</span>
            </button>
          ) : (
            <span className="text-[11px] mutating-text-muted">{localize(state.language, 'FASE 1 // PROTOCOLO DE IDENTIDAD', 'PHASE 1 // IDENTITY PROTOCOL')}</span>
          )}

          {step < 5 ? (
            <button
              type="button"
              onClick={() => { sound.playNavSwitch(); setStep(step + 1); }}
              className="px-4 py-2 mutating-btn-primary theme-on-accent font-bold rounded text-xs flex items-center gap-1.5 transition-all cursor-pointer touch-manipulation ml-auto sm:ml-0"
            >
              <span>{localize(state.language, 'SIGUIENTE', 'NEXT')}</span>
              <ArrowRight className="w-3.5 h-3.5" />
            </button>
          ) : (
            <div className="flex flex-col sm:flex-row items-end sm:items-center gap-2 w-full sm:w-auto justify-end">
              {!simComplete && (
                <span className="text-[11px] theme-warn-text font-mono animate-pulse">
                  {isEs ? '👈 Primero ejecuta "INICIAR ENTRENAMIENTO GÉNESIS" arriba' : '👈 Click "START GENESIS TRAINING" above first'}
                </span>
              )}
              <button
                type="button"
                onClick={handleFinishOnboarding}
                disabled={!simComplete}
                title={!simComplete ? (isEs ? 'Ejecuta el entrenamiento génesis arriba primero para desbloquear' : 'Run genesis training above first to unlock') : undefined}
                className={`w-full sm:w-auto justify-center px-4 sm:px-5 py-2.5 rounded-lg text-xs font-black flex items-center gap-2 transition-all touch-manipulation ${
                  simComplete
                    ? 'theme-gradient theme-on-accent cursor-pointer hover:scale-[1.02] active:scale-95 animate-pulse'
                    : 'theme-raised-bg mutating-text-muted border theme-border cursor-not-allowed opacity-40 pointer-events-none'
                }`}
              >
                <CheckCircle2 className="w-4 h-4 shrink-0" />
                <span className="text-center">{localize(state.language, 'INGRESAR A SYNAPSE OS (COMENZAR SIMULACIÓN)', 'ENTER SYNAPSE OS (START SIMULATION)')}</span>
              </button>
            </div>
          )}
        </div>
        <AuthModal isOpen={authOpen} onClose={() => setAuthOpen(false)} />
      </div>
    </div>
  );
};
