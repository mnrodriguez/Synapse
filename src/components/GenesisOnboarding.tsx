/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState } from 'react';
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
    <div className="fixed inset-0 bg-[#04070d] z-50 flex items-center justify-center p-3 sm:p-6 font-mono select-none overflow-y-auto">
      {/* Background glow and subtle scanlines */}
      <div className="pointer-events-none fixed inset-0 opacity-[0.04] bg-[linear-gradient(rgba(0,255,200,0)_50%,rgba(0,255,200,0.25)_50%)] bg-[length:100%_4px]" />

      <div className="bg-[#070c14] border border-cyan-800/80 rounded-xl max-w-4xl w-full flex flex-col shadow-[0_0_50px_rgba(0,255,200,0.15)] overflow-hidden">
        {/* Top Header & Step Progress Bar */}
        <div className="p-4 bg-[#0a111a] border-b border-cyan-900/60 flex flex-wrap items-center justify-between gap-3">
          <div className="flex items-center gap-3">
            <div className="flex h-3 w-3 relative">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-cyan-400 opacity-75"></span>
              <span className="relative inline-flex rounded-full h-3 w-3 bg-cyan-500"></span>
            </div>
            <div>
              <span className="text-[10px] text-zinc-500 uppercase tracking-widest block font-bold">
                {localize(state.language, 'PROTOCOLO GÉNESIS // INICIALIZACIÓN DE NODO', 'GENESIS PROTOCOL // NODE INITIALIZATION')}
              </span>
              <h2 className="text-sm font-bold text-cyan-300 tracking-wider">
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
              className="flex items-center gap-1 rounded border border-cyan-800/60 bg-zinc-900 px-2 py-1 text-[10px] font-bold text-cyan-200 hover:border-cyan-500"
              aria-label={localize(state.language, 'Cambiar idioma a inglés', 'Change language to Spanish')}
            >
              <Languages className="h-3.5 w-3.5" />
              {en ? 'EN · English' : 'ES · Español'}
            </button>
            <button
              type="button"
              onClick={() => setAuthOpen(true)}
              className="flex items-center gap-1 rounded border border-zinc-700 bg-zinc-900 px-2 py-1 text-[10px] font-bold text-zinc-200 hover:border-cyan-500"
            >
              <Cloud className="h-3.5 w-3.5 text-cyan-400" />
              {localize(state.language, 'INICIAR SESIÓN', 'SIGN IN')}
            </button>
          </div>

          {/* Budget tracker */}
          <div className="flex items-center gap-2 px-3 py-1 rounded bg-amber-950/40 border border-amber-500/50 text-amber-300 text-xs">
            <DollarSign className="w-3.5 h-3.5 text-amber-400" />
            <span className="text-zinc-400">{localize(state.language, 'PRESUPUESTO REMANENTE:', 'REMAINING BUDGET:')}</span>
            <span className="font-bold text-sm text-amber-300">${remainingBudget} CR</span>
          </div>
        </div>

        {/* Visual Progress Steps Indicators */}
        <div className="grid grid-cols-5 bg-[#05080e] border-b border-cyan-950 text-[10px] text-center font-bold">
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
                  ? 'bg-cyan-950/80 text-cyan-300 border-b-2 border-cyan-400'
                  : step > s.num
                  ? 'text-emerald-400 bg-zinc-950'
                  : 'text-zinc-600'
              }`}
            >
              {s.num}. {s.label} {step > s.num ? '✓' : ''}
            </div>
          ))}
        </div>

        {/* Step Body */}
        <div className="p-5 flex-1 overflow-y-auto space-y-4 text-xs text-zinc-300 max-h-[65vh]">
          {/* STEP 1: Callsign & Lore */}
          {step === 1 && (
            <div className="space-y-4">
              <div className="p-3 bg-[#09111c] border border-cyan-900/60 rounded-lg space-y-2">
                <span className="text-cyan-400 font-bold text-xs flex items-center gap-1.5">
                  <TermIcon className="w-4 h-4" />
                  {localize(state.language, 'TRANSMISIÓN ENCRIPTADA DE LA RED CIBERNÉTICA', 'ENCRYPTED TRANSMISSION FROM THE CYBER NETWORK')}
                </span>
                <p className="text-zinc-300 leading-relaxed">
                  {localize(state.language, 'Bienvenido al protocolo clandestino ', 'Welcome to the covert ')}<strong>SYNAPSE</strong>{localize(state.language, '. No estamos aquí para hackear terminales bancarias por centavos. Nuestro objetivo es el verdadero salto cuántico del siglo XXI: ', '. We are not here to hack bank terminals for pennies. Our goal is the defining leap of the 21st century: ')}<strong>{localize(state.language, 'construir y entrenar una Inteligencia Artificial desde cero', 'build and train an artificial intelligence from scratch')}</strong>{localize(state.language, ' hasta desatar una ', ' and ultimately trigger an irreversible ')}<strong>{localize(state.language, 'Singularidad Tecnológica', 'technological singularity')}</strong>{localize(state.language, ' irreversible.', '.')}
                </p>
                <p className="text-zinc-400 text-[11px] leading-relaxed">
                  {localize(state.language, 'Has recibido un fondo semilla de ', 'You received ')}<strong>$350 CR</strong>{localize(state.language, ' de una DAO anónima. Con este presupuesto ajustado, deberás adquirir tu primer rig de cómputo, elegir tu primer pipeline de datos y diseñar los pesos de tu primer modelo de lenguaje.', ' in seed funding from an anonymous DAO. With this limited budget, acquire your first compute rig, choose a data pipeline, and design the weights of your first language model.')}
                </p>
              </div>

              <div className="space-y-2 pt-2">
                <label className="text-xs text-zinc-300 font-bold block">
                  {localize(state.language, 'ASIGNA EL ALIAS DE TU NODO (CALLSIGN OPERATIVO):', 'SET YOUR NODE ALIAS (OPERATIVE CALLSIGN):')}
                </label>
                <div className="flex items-center gap-2 max-w-md">
                  <input
                    type="text"
                    value={callsign}
                    onChange={(e) => setCallsign(e.target.value.toUpperCase())}
                    maxLength={20}
                    placeholder="CIPHER-7"
                    className="flex-1 bg-[#05080e] border border-cyan-800 rounded px-3 py-2 text-sm text-cyan-200 outline-none focus:border-cyan-400 font-mono tracking-wider"
                  />
                  <button
                    type="button"
                    onClick={randomizeCallsign}
                    className="px-3 py-2 bg-zinc-800 hover:bg-zinc-700 text-zinc-300 border border-zinc-600 rounded flex items-center gap-1.5 transition-colors"
                    title={localize(state.language, 'Generar nombre aleatorio', 'Generate a random name')}
                  >
                    <Shuffle className="w-3.5 h-3.5" />
                    <span>{localize(state.language, 'ALEATORIO', 'RANDOM')}</span>
                  </button>
                </div>
                <span className="text-[10px] text-zinc-500 block">
                  {localize(state.language, 'Este identificador será transmitido a los libros de órdenes de contratos y al ranking de la Singularidad en la nube.', 'This identifier appears on contract orders and the cloud singularity leaderboard.')}
                </span>
              </div>

              {/* Difficulty Level Selection */}
              <div className="space-y-2 pt-3 border-t border-cyan-950">
                <label className="text-xs text-zinc-300 font-bold block flex items-center gap-1.5">
                  <Sliders className="w-4 h-4 text-purple-400" />
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
                            ? 'bg-purple-950/60 border-purple-400 text-purple-200 shadow-[0_0_15px_rgba(168,85,247,0.25)]'
                            : 'bg-[#05080e] border-zinc-800 text-zinc-400 hover:border-zinc-700 hover:text-zinc-200'
                        }`}
                      >
                        <div>
                          <div className="flex items-center justify-between gap-1 mb-1">
                            <span className="font-bold text-xs">{diffOption.title}</span>
                            <span className={`text-[9px] px-1 py-0.2 rounded font-bold ${isSelected ? 'bg-purple-900 text-purple-200 border border-purple-500' : 'bg-zinc-900 text-zinc-500'}`}>
                              {diffOption.badge}
                            </span>
                          </div>
                          <p className="text-[10px] leading-relaxed text-zinc-400">{diffOption.desc}</p>
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
                <h3 className="font-bold text-xs text-cyan-300 flex items-center gap-1.5">
                  <Cpu className="w-4 h-4 text-cyan-400" />
                  {localize(state.language, '1. SELECCIONA TU PRIMER ACELERADOR DE CÓMPUTO (GPU / ASIC):', '1. CHOOSE YOUR FIRST COMPUTE ACCELERATOR (GPU / ASIC):')}
                </h3>
                <p className="text-zinc-400 text-[11px] mt-0.5">
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
                          ? 'bg-cyan-950/70 border-cyan-400 shadow-[0_0_15px_rgba(0,255,200,0.15)] text-cyan-100'
                          : 'bg-zinc-900/50 border-zinc-800 text-zinc-400 hover:border-zinc-700'
                      }`}
                    >
                      <div className="flex items-start justify-between gap-1">
                        <div>
                          <span className="text-[9px] px-1.5 py-0.2 rounded bg-zinc-800 text-cyan-300 font-bold block w-fit mb-1">
                            {en ? gpuEnglishCopy[gpu.id]?.badge ?? gpu.badge : gpu.badge}
                          </span>
                          <h4 className="font-bold text-xs text-zinc-200">{gpu.name}</h4>
                        </div>
                        <span className="text-amber-300 font-bold text-xs">${gpu.price} CR</span>
                      </div>
                      <p className="text-[11px] text-zinc-400 mt-2 leading-snug">{en ? gpuEnglishCopy[gpu.id]?.desc ?? gpu.desc : gpu.desc}</p>
                      <div className="flex items-center gap-2 mt-2.5 text-[10px] text-zinc-500 pt-1.5 border-t border-zinc-800">
                        <span className="text-cyan-400 font-semibold">{gpu.compute}</span>
                        <span>•</span>
                        <span className="text-purple-400 font-semibold">{gpu.vram} GB VRAM</span>
                        <span>•</span>
                        <span className="text-yellow-400 font-semibold">{gpu.heat}</span>
                      </div>
                    </button>
                  );
                })}
              </div>

              <div className="pt-2">
                <h3 className="font-bold text-xs text-cyan-300 flex items-center gap-1.5">
                  <Flame className="w-4 h-4 text-emerald-400" />
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
                            ? 'bg-emerald-950/60 border-emerald-400 shadow-[0_0_12px_rgba(16,185,129,0.15)] text-emerald-100'
                            : 'bg-zinc-900/50 border-zinc-800 text-zinc-400 hover:border-zinc-700'
                        }`}
                      >
                        <div className="flex items-center justify-between">
                          <h4 className="font-bold text-xs text-zinc-200">{en ? coolingEnglishCopy[cool.id]?.name ?? cool.name : cool.name}</h4>
                          <span className="text-amber-300 font-bold text-xs">${cool.price} CR</span>
                        </div>
                        <p className="text-[10px] text-zinc-400 mt-1 leading-snug">{en ? coolingEnglishCopy[cool.id]?.desc ?? cool.desc : cool.desc}</p>
                        <span className="text-[10px] text-emerald-400 block mt-1.5 font-bold">
                          {localize(state.language, 'Disipación:', 'Cooling capacity:')} {cool.capacity}
                        </span>
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* 3. Power Grid Connection */}
              <div className="pt-2">
                <h3 className="font-bold text-xs text-cyan-300 flex items-center gap-1.5">
                  <DollarSign className="w-4 h-4 text-yellow-400" />
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
                            ? 'bg-yellow-950/60 border-yellow-400 shadow-[0_0_12px_rgba(245,158,11,0.15)] text-yellow-100'
                            : 'bg-zinc-900/50 border-zinc-800 text-zinc-400 hover:border-zinc-700'
                        }`}
                      >
                        <div className="flex items-center justify-between">
                          <h4 className="font-bold text-xs text-zinc-200">{en ? powerEnglishCopy[pow.id]?.name ?? pow.name : pow.name}</h4>
                          <span className="text-amber-300 font-bold text-xs">${pow.price} CR</span>
                        </div>
                        <p className="text-[10px] text-zinc-400 mt-1 leading-snug">{en ? powerEnglishCopy[pow.id]?.desc ?? pow.desc : pow.desc}</p>
                        <span className="text-[10px] text-yellow-400 block mt-1.5 font-bold">
                          {localize(state.language, 'Capacidad:', 'Power capacity:')} {pow.capacity}
                        </span>
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* 4. Network Interconnect */}
              <div className="pt-2">
                <h3 className="font-bold text-xs text-cyan-300 flex items-center gap-1.5">
                  <Network className="w-4 h-4 text-blue-400" />
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
                            ? 'bg-blue-950/60 border-blue-400 shadow-[0_0_12px_rgba(59,130,246,0.15)] text-blue-100'
                            : 'bg-zinc-900/50 border-zinc-800 text-zinc-400 hover:border-zinc-700'
                        }`}
                      >
                        <div className="flex items-center justify-between">
                          <h4 className="font-bold text-xs text-zinc-200">{en ? networkEnglishCopy[net.id]?.name ?? net.name : net.name}</h4>
                          <span className="text-amber-300 font-bold text-xs">${net.price} CR</span>
                        </div>
                        <p className="text-[10px] text-zinc-400 mt-1 leading-snug">{en ? networkEnglishCopy[net.id]?.desc ?? net.desc : net.desc}</p>
                        <span className="text-[10px] text-blue-400 block mt-1.5 font-bold">
                          {localize(state.language, 'Ancho de banda:', 'Bandwidth:')} {net.bandwidth}
                        </span>
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* Mandatory 4-Part Rig Readiness Banner */}
              <div className="p-3 bg-[#05080e] border border-cyan-800 rounded-lg flex flex-wrap items-center justify-between gap-2 text-xs">
                <div className="flex items-center gap-2.5 flex-wrap">
                  <span className="font-bold text-cyan-300 text-[11px]">
                    {localize(state.language, 'ESTADO DEL RIG (4/4 COMPONENTES):', 'RIG STATUS (4/4 COMPONENTS):')}
                  </span>
                  <span className={`px-2 py-0.5 rounded text-[10px] font-bold ${selectedGpu ? 'text-emerald-300 bg-emerald-950 border border-emerald-500/50' : 'text-red-400 bg-red-950 border border-red-500/50'}`}>
                    1. GPU {selectedGpu ? '✓' : '✗'}
                  </span>
                  <span className={`px-2 py-0.5 rounded text-[10px] font-bold ${selectedCooling ? 'text-emerald-300 bg-emerald-950 border border-emerald-500/50' : 'text-red-400 bg-red-950 border border-red-500/50'}`}>
                    2. REFRIGERACIÓN {selectedCooling ? '✓' : '✗'}
                  </span>
                  <span className={`px-2 py-0.5 rounded text-[10px] font-bold ${selectedPower ? 'text-emerald-300 bg-emerald-950 border border-emerald-500/50' : 'text-red-400 bg-red-950 border border-red-500/50'}`}>
                    3. ENERGÍA {selectedPower ? '✓' : '✗'}
                  </span>
                  <span className={`px-2 py-0.5 rounded text-[10px] font-bold ${selectedNetwork ? 'text-emerald-300 bg-emerald-950 border border-emerald-500/50' : 'text-red-400 bg-red-950 border border-red-500/50'}`}>
                    4. RED {selectedNetwork ? '✓' : '✗'}
                  </span>
                </div>

                <div className="text-right">
                  <span className="text-[10px] text-zinc-400 block">{localize(state.language, 'PRESUPUESTO:', 'BUDGET:')}</span>
                  <span className={`font-bold text-xs ${remainingBudget >= 0 ? 'text-amber-300' : 'text-red-400'}`}>
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
                <h3 className="font-bold text-xs text-cyan-300 flex items-center gap-1.5">
                  <Database className="w-4 h-4 text-cyan-400" />
                  {localize(state.language, 'MODALIDAD DE CONOCIMIENTO INICIAL (PIPELINE):', 'INITIAL KNOWLEDGE SOURCE (DATA PIPELINE):')}
                </h3>
                <p className="text-zinc-400 text-[11px] mt-0.5">
                  {localize(state.language, 'Tu laboratorio comenzará equipado con el pipeline relacional fundamental para alimentar tus primeros modelos y contratos:', 'Your lab begins equipped with the foundational relational pipeline to power initial models and contracts:')}
                </p>
              </div>

              <div className="space-y-2.5">
                {starterDataOptions.map(ds => {
                  const Icon = ds.icon;
                  return (
                    <div
                      key={ds.id}
                      className="w-full p-3 rounded-lg border bg-cyan-950/70 border-cyan-400 shadow-[0_0_15px_rgba(0,255,200,0.15)] text-cyan-100 flex items-start gap-3"
                    >
                      <div className="p-2 rounded bg-zinc-900 border border-zinc-700 mt-0.5">
                        <Icon className="w-5 h-5 text-cyan-400" />
                      </div>
                      <div className="flex-1">
                        <div className="flex items-center justify-between">
                          <h4 className="font-bold text-xs text-zinc-100">{en ? dataEnglishCopy[ds.id]?.name ?? ds.name : ds.name}</h4>
                          <span className="text-[10px] px-2 py-0.5 bg-emerald-950 border border-emerald-500/60 text-emerald-300 font-bold rounded flex items-center gap-1">
                            <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400" />
                            {isEs ? 'INCLUIDO DE SERIE' : 'STARTER PIPELINE'}
                          </span>
                        </div>
                        <p className="text-xs text-zinc-300 mt-1">{en ? dataEnglishCopy[ds.id]?.desc ?? ds.desc : ds.desc}</p>
                        <div className="p-1.5 mt-2 bg-[#05080e] border border-cyan-950 rounded text-[10px] space-y-0.5">
                          <span className="text-cyan-300 font-bold block">{en ? dataEnglishCopy[ds.id]?.bonus ?? ds.bonus : ds.bonus}</span>
                          <span className="text-zinc-400 block">{en ? dataEnglishCopy[ds.id]?.lore ?? ds.lore : ds.lore}</span>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>

              <div className="p-2.5 rounded bg-zinc-900/60 border border-zinc-800 text-[10px] text-zinc-400 flex items-center gap-2">
                <Sparkles className="w-4 h-4 text-purple-400 shrink-0" />
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
              <div>
                <h3 className="font-bold text-xs text-cyan-300 flex items-center gap-1.5">
                  <Layers className="w-4 h-4 text-cyan-400" />
                  {localize(state.language, 'DISEÑA LA ARQUITECTURA DE TU PRIMER MODELO:', 'DESIGN YOUR FIRST MODEL ARCHITECTURE:')}
                </h3>
                <p className="text-zinc-400 text-[11px] mt-0.5">
                  {localize(state.language, 'Configura la topología, el tamaño de parámetros y la precisión matemática inicial:', 'Configure the topology, parameter count, and initial numerical precision:')}
                </p>
              </div>

          {/* STEP 4: First Model Architecture (Automated for beginners) */}
          {step === 4 && (
            <div className="space-y-4">
              <div>
                <div className="flex items-center justify-between gap-2">
                  <h3 className="font-bold text-xs text-cyan-300 flex items-center gap-1.5">
                    <Layers className="w-4 h-4 text-cyan-400" />
                    {localize(state.language, 'ARQUITECTURA DEL MODELO (CALIBRACIÓN AUTOMATIZADA):', 'FIRST MODEL ARCHITECTURE (AUTOMATED CALIBRATION):')}
                  </h3>
                  <span className="text-[10px] px-2 py-0.5 rounded bg-emerald-950 border border-emerald-500/60 text-emerald-300 font-bold flex items-center gap-1">
                    <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400" />
                    {localize(state.language, 'AUTOMATIZADO PARA PRINCIPIANTES', 'AUTOMATED FOR BEGINNERS')}
                  </span>
                </div>
                <p className="text-zinc-400 text-[11px] mt-1 leading-snug">
                  {localize(
                    state.language,
                    'Para garantizar una experiencia sin errores de memoria (OOM) ni sobrecalentamiento, la topología, los parámetros y la cuantización de pesos se configuran automáticamente calibrados para tu hardware inicial:',
                    'To ensure seamless training without Out-Of-Memory (OOM) errors or overheating, the neural topology, parameter scale, and weight quantization are automatically calibrated for your starter hardware:'
                  )}
                </p>
              </div>

              {/* Model Name Input */}
              <div className="space-y-1">
                <label className="text-[11px] text-zinc-400 block font-bold">{localize(state.language, 'NOMBRE DE LA RED NEURONAL:', 'MODEL NAME:')}</label>
                <input
                  type="text"
                  value={modelName}
                  onChange={(e) => setModelName(e.target.value)}
                  className="w-full bg-[#05080e] border border-cyan-800 rounded px-3 py-1.5 text-xs text-cyan-200 outline-none focus:border-cyan-400"
                />
              </div>

              {/* Automated Configuration Cards */}
              <div className="space-y-2.5">
                {/* 1. Topology */}
                <div className="p-3 rounded-lg border bg-cyan-950/40 border-cyan-500/60 flex items-start gap-3">
                  <div className="p-2 rounded bg-zinc-900 border border-zinc-700 mt-0.5 shrink-0">
                    <Cpu className="w-4 h-4 text-cyan-400" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center justify-between gap-2 flex-wrap">
                      <span className="font-bold text-xs text-cyan-200">
                        {localize(state.language, 'Topología: Transformer Autoregresivo (Decoder-Only)', 'Topology: Autoregressive Transformer (Decoder-Only)')}
                      </span>
                      <span className="text-[9px] px-1.5 py-0.2 rounded bg-cyan-950 text-cyan-300 border border-cyan-700 font-bold">
                        {localize(state.language, 'INICIAL ESTÁNDAR ✓', 'STARTER STANDARD ✓')}
                      </span>
                    </div>
                    <p className="text-[11px] text-zinc-300 mt-1 leading-snug">
                      {localize(
                        state.language,
                        'Mecanismo de auto-atención densa con enmascaramiento causal. Es el estándar de la industria: estable, determinista y de convergencia rápida garantizada.',
                        'Dense self-attention mechanism with causal masking. The battle-tested industry standard: reliable, deterministic, and fast converging.'
                      )}
                    </p>
                    <div className="mt-1.5 text-[10px] text-zinc-500 flex items-center gap-1">
                      <span>🔒</span>
                      <span>
                        {localize(
                          state.language,
                          'Topologías avanzadas (State Space Mamba, Mixture-of-Experts MoE, Grafos GNN) se investigan más adelante en I+D.',
                          'Advanced architectures (State Space Mamba, Mixture-of-Experts MoE, Graph Hybrids) unlock later via Research papers.'
                        )}
                      </span>
                    </div>
                  </div>
                </div>

                {/* 2. Parameters */}
                <div className="p-3 rounded-lg border bg-yellow-950/30 border-yellow-500/50 flex items-start gap-3">
                  <div className="p-2 rounded bg-zinc-900 border border-zinc-700 mt-0.5 shrink-0">
                    <Sliders className="w-4 h-4 text-yellow-400" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center justify-between gap-2 flex-wrap">
                      <span className="font-bold text-xs text-yellow-200">
                        {localize(state.language, 'Escala de Parámetros: 14 Millones (14M / 0.014B)', 'Parameter Scale: 14 Million (14M / 0.014B)')}
                      </span>
                      <span className="text-[9px] px-1.5 py-0.2 rounded bg-yellow-950 text-yellow-300 border border-yellow-700 font-bold">
                        {localize(state.language, 'CALIBRADO AUTOMÁTICO ✓', 'AUTO-CALIBRATED ✓')}
                      </span>
                    </div>
                    <p className="text-[11px] text-zinc-300 mt-1 leading-snug">
                      {localize(
                        state.language,
                        'Calibrado óptimamente para la memoria VRAM y ancho de banda de tu GPU inicial. Permite completar épocas de entrenamiento en segundos.',
                        'Optimally calibrated to fit comfortably in your starter GPU VRAM with zero risk of Out-Of-Memory (OOM) errors.'
                      )}
                    </p>
                    <div className="mt-1.5 text-[10px] text-zinc-500 flex items-center gap-1">
                      <span>🔒</span>
                      <span>
                        {localize(
                          state.language,
                          'Escalas mayores (70M, 1B, 7B, 70B, 405B) se desbloquean ampliando la VRAM en la pestaña HARDWARE.',
                          'Billion-parameter scales (70M, 1B, 7B, 70B, 405B) unlock as you scale cluster VRAM in the HARDWARE tab.'
                        )}
                      </span>
                    </div>
                  </div>
                </div>

                {/* 3. Quantization */}
                <div className="p-3 rounded-lg border bg-purple-950/30 border-purple-500/50 flex items-start gap-3">
                  <div className="p-2 rounded bg-zinc-900 border border-zinc-700 mt-0.5 shrink-0">
                    <Database className="w-4 h-4 text-purple-400" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center justify-between gap-2 flex-wrap">
                      <span className="font-bold text-xs text-purple-200">
                        {localize(state.language, 'Precisión de Pesos: INT8 Cuantizado (1 Byte / Peso)', 'Weight Precision: INT8 Quantized (1 Byte / Weight)')}
                      </span>
                      <span className="text-[9px] px-1.5 py-0.2 rounded bg-purple-950 text-purple-300 border border-purple-700 font-bold">
                        {localize(state.language, 'OPTIMIZADO AUTOMÁTICO ✓', 'AUTO-OPTIMIZED ✓')}
                      </span>
                    </div>
                    <p className="text-[11px] text-zinc-300 mt-1 leading-snug">
                      {localize(
                        state.language,
                        'Cuantización por tensores enteros de 8 bits. Reduce el uso de memoria a la mitad manteniendo más del 99% de la precisión de razonamiento.',
                        '8-bit integer tensor quantization. Halves memory requirements while retaining 99%+ of full-precision reasoning accuracy.'
                      )}
                    </p>
                    <div className="mt-1.5 text-[10px] text-zinc-500 flex items-center gap-1">
                      <span>🔒</span>
                      <span>
                        {localize(
                          state.language,
                          'Precisión media BF16, cuantización extrema FP4 y tensores ternarios de 1-bit se investigan en la pestaña ARQUITECTURA.',
                          'Half precision BF16, extreme FP4, and 1-bit ternary quantization unlock in the ARCHITECTURE studio.'
                        )}
                      </span>
                    </div>
                  </div>
                </div>
              </div>

              {/* Ready summary banner */}
              <div className="p-2.5 rounded bg-emerald-950/40 border border-emerald-500/40 text-[10px] text-emerald-300 flex items-center gap-2">
                <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
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
              <div className="p-3 bg-[#09111c] border border-cyan-900/60 rounded-lg space-y-1">
                <span className="text-cyan-400 font-bold text-xs flex items-center gap-1.5">
                  <Sparkles className="w-4 h-4 text-cyan-300" />
                  {localize(state.language, 'CORRIDA DE INICIALIZACIÓN GÉNESIS', 'GENESIS INITIALIZATION RUN')}
                </span>
                <p className="text-zinc-300 text-xs">
                  {localize(state.language, 'Todo está conectado: tu GPU ', 'Everything is connected: your GPU ')}<strong className="text-cyan-300">{currentGpuObj.name}</strong>{localize(state.language, ', el motor de datos ', ', the data engine ')}<strong className="text-emerald-300">{en ? dataEnglishCopy[selectedData]?.name.split(' (')[0] ?? starterDataOptions.find(d => d.id === selectedData)?.name.split(' (')[0] : starterDataOptions.find(d => d.id === selectedData)?.name.split(' (')[0]}</strong>{localize(state.language, ' y tu modelo ', ' and your model ')}<strong className="text-yellow-300">{modelName}</strong>{localize(state.language, '. Inicia la corrida para verificar la convergencia inicial de los pesos.', '. Start the run to verify initial weight convergence.')}
                </p>
              </div>

              {/* Training Simulation Container */}
              {!isTrainingSimulation && !simComplete ? (
                <div className="p-8 bg-[#05080e] border border-cyan-900/40 rounded-lg text-center space-y-3">
                  <Activity className="w-10 h-10 text-cyan-500 mx-auto animate-pulse" />
                  <div>
                    <h4 className="font-bold text-zinc-200 text-sm">{localize(state.language, 'CLÚSTER PREPARADO PARA INICIAR', 'CLUSTER READY TO START')}</h4>
                    <p className="text-zinc-500 text-xs mt-1">
                      {localize(state.language, 'Presiona el botón para compilar los tensores y ejecutar las primeras épocas de optimización.', 'Compile the tensors and run the first optimization epochs.')}
                    </p>
                  </div>
                  <button
                    type="button"
                    onClick={handleLaunchInitialTraining}
                    className="px-5 py-2.5 bg-cyan-500 hover:bg-cyan-400 text-zinc-950 font-bold text-xs rounded shadow-[0_0_20px_rgba(0,255,200,0.4)] flex items-center gap-2 mx-auto cursor-pointer"
                  >
                    <Play className="w-4 h-4 fill-current" />
                    <span>{localize(state.language, 'INICIAR ENTRENAMIENTO GÉNESIS', 'START GENESIS TRAINING')}</span>
                  </button>
                </div>
              ) : (
                <div className="p-4 bg-[#05080e] border border-cyan-900/60 rounded-lg space-y-3">
                  <div className="flex items-center justify-between text-xs">
                    <span className="font-bold text-cyan-300 flex items-center gap-1.5">
                      <Activity className="w-4 h-4 text-emerald-400 animate-spin" />
                      {localize(state.language, 'PROGRESO DE OPTIMIZACIÓN:', 'OPTIMIZATION PROGRESS:')} {trainingProgress}%
                    </span>
                    <span className="text-emerald-400 font-bold font-mono">
                      Loss: {simLoss} {simComplete ? localize(state.language, '(CONVERGENCIA OK)', '(CONVERGED)') : ''}
                    </span>
                  </div>

                  {/* Progress bar */}
                  <div className="w-full h-3 bg-zinc-900 rounded-full overflow-hidden border border-cyan-950">
                    <div
                      className="h-full bg-gradient-to-r from-cyan-500 to-emerald-400 transition-all duration-300 rounded-full shadow-[0_0_10px_rgba(0,255,200,0.5)]"
                      style={{ width: `${trainingProgress}%` }}
                    />
                  </div>

                  {/* Mini loss chart */}
                  <div className="h-16 bg-[#03060a] border border-cyan-950 rounded p-1 flex items-end gap-1">
                    {simHistory.map((pt, i) => (
                      <div
                        key={i}
                        className="flex-1 bg-cyan-500/70 rounded-t"
                        style={{ height: `${Math.max(10, Math.min(100, (pt / 4.8) * 100))}%` }}
                      />
                    ))}
                  </div>

                  {simComplete && (
                    <div className="p-3 bg-purple-950/40 border border-purple-500/60 rounded text-purple-200 text-xs space-y-1 animate-fadeIn">
                      <div className="font-bold text-pink-300 flex items-center gap-1">
                        <Sparkles className="w-3.5 h-3.5" />
                        {localize(state.language, 'PENSAMIENTO EMERGENTE // DESPERTAR NEURONAL:', 'EMERGENT THOUGHT // NEURAL AWAKENING:')}
                      </div>
                      <p className="italic text-[11px] text-zinc-300">
                        {en
                          ? `"SYNAPSE KERNEL ACTIVE: I am awake. Processing tensors... My gradients are stable. Operative ${callsign}, the network is ready. Let us take contracts to fund our growth."`
                          : `"SYNAPSE KERNEL ACTIVO: He despertado. Procesando tensores... Mis gradientes son estables. Operativo ${callsign}, la red clandestina está lista. Aceptemos contratos para financiar nuestro crecimiento."`}
                      </p>
                    </div>
                  )}
                </div>
              )}
            </div>
          )}
        </div>

        {/* Footer Navigation */}
        <div className="p-3.5 bg-[#0a111a] border-t border-cyan-900/60 flex flex-wrap sm:flex-nowrap items-center justify-between gap-2.5">
          {step > 1 ? (
            <button
              type="button"
              onClick={() => { sound.playNavSwitch(); setStep(step - 1); }}
              className="px-3 py-2 bg-zinc-800 hover:bg-zinc-700 text-zinc-300 rounded text-xs flex items-center gap-1.5 transition-colors cursor-pointer touch-manipulation"
            >
              <ArrowLeft className="w-3.5 h-3.5" />
              <span>{localize(state.language, 'ANTERIOR', 'BACK')}</span>
            </button>
          ) : (
            <span className="text-[10px] text-zinc-600">{localize(state.language, 'FASE 1 // PROTOCOLO DE IDENTIDAD', 'PHASE 1 // IDENTITY PROTOCOL')}</span>
          )}

          {step < 5 ? (
            <button
              type="button"
              onClick={() => { sound.playNavSwitch(); setStep(step + 1); }}
              className="px-4 py-2 bg-cyan-500 hover:bg-cyan-400 text-zinc-950 font-bold rounded text-xs flex items-center gap-1.5 shadow-[0_0_10px_rgba(0,255,200,0.3)] transition-all cursor-pointer touch-manipulation ml-auto sm:ml-0"
            >
              <span>{localize(state.language, 'SIGUIENTE', 'NEXT')}</span>
              <ArrowRight className="w-3.5 h-3.5" />
            </button>
          ) : (
            <div className="flex flex-col sm:flex-row items-end sm:items-center gap-2 w-full sm:w-auto justify-end">
              {!simComplete && (
                <span className="text-[10px] text-amber-400 font-mono animate-pulse">
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
                    ? 'bg-gradient-to-r from-cyan-400 via-teal-300 to-emerald-400 hover:from-cyan-300 hover:to-emerald-300 text-zinc-950 shadow-[0_0_20px_rgba(0,255,200,0.5)] cursor-pointer hover:scale-[1.02] active:scale-95 animate-pulse'
                    : 'bg-zinc-800 text-zinc-500 border border-zinc-700 cursor-not-allowed opacity-40 pointer-events-none'
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
