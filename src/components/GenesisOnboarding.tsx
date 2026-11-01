/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState } from 'react';
import { useGame } from '../context/GameContext';
import { OnboardingConfig, ModelTopology, QuantizationType } from '../types/game';
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
  Shuffle
} from 'lucide-react';
import { sound } from '../audio/soundManager';

export const GenesisOnboarding: React.FC = () => {
  const { completeTutorial } = useGame();

  const [step, setStep] = useState<number>(1);
  const [callsign, setCallsign] = useState<string>('CIPHER-7');
  
  // Hardware selection
  const [selectedGpu, setSelectedGpu] = useState<string>('gpu_gtx1060');
  const [selectedCooling, setSelectedCooling] = useState<string>('cool_air_basic');

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

  const starterDataOptions = [
    {
      id: 'data_relational_sql',
      name: 'Base de Datos Relacional SQL & Registros Tabulares',
      type: 'relational_sql',
      icon: Database,
      desc: 'Esquemas PostgreSQL normalizados con registros financieros, transacciones contables y telemetría.',
      bonus: '+20% Precisión en Contratos Financieros y Arbitraje',
      lore: 'Fundamento de exactitud matemática y determinismo de datos sin inconsistencias.'
    },
    {
      id: 'data_vector_rag',
      name: 'Base de Datos Vectorial de Embeddings (HNSW RAG)',
      type: 'vector_embeddings',
      icon: GitFork,
      desc: 'Espacio latente de 1536 dimensiones con indexación HNSW para recuperación semántica en tiempo real.',
      bonus: '+35% de Memoria Asociativa y Razonamiento Contextual',
      lore: 'Permite consultar millones de documentos corporativos y papers científicos sin alucinaciones.'
    },
    {
      id: 'data_knowledge_graph',
      name: 'Grafo de Conocimiento Ontológico (RDF Tripletas)',
      type: 'knowledge_graph',
      icon: Network,
      desc: 'Redes de entidades y relaciones causales (sujeto-predicado-objeto) con deducción lógica en múltiples pasos.',
      bonus: 'Reduce 70% de Alucinaciones y Desbloquea Razonamiento Causal',
      lore: 'Permite conectar causas y efectos lógicos estrictos, eliminando inventos del modelo.'
    }
  ];

  // Calculate current costs
  const currentGpuObj = starterGpuOptions.find(g => g.id === selectedGpu) || starterGpuOptions[0];
  const currentCoolingObj = starterCoolingOptions.find(c => c.id === selectedCooling) || starterCoolingOptions[0];
  const totalHardwareCost = currentGpuObj.price + currentCoolingObj.price;
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
    const config: OnboardingConfig = {
      callsign: callsign.trim() || 'CIPHER-7',
      starterGpuId: selectedGpu,
      starterCoolingId: selectedCooling,
      starterDataId: selectedData,
      modelTopology,
      modelParams,
      modelQuantization: modelQuant,
      modelName
    };
    completeTutorial(config);
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
                PROTOCOLO GÉNESIS // INICIALIZACIÓN DE NODO
              </span>
              <h2 className="text-sm font-bold text-cyan-300 tracking-wider">
                FASE {step} DE 5: {
                  step === 1 ? 'IDENTIDAD Y CONCESIÓN DE FONDOS' :
                  step === 2 ? 'ADQUISICIÓN DE HARDWARE INICIAL' :
                  step === 3 ? 'MODALIDAD DE DATOS & CONOCIMIENTO' :
                  step === 4 ? 'ARQUITECTURA DEL PRIMER MODELO' :
                  'ENTRENAMIENTO GÉNESIS & DESPERTAR'
                }
              </h2>
            </div>
          </div>

          {/* Budget tracker */}
          <div className="flex items-center gap-2 px-3 py-1 rounded bg-amber-950/40 border border-amber-500/50 text-amber-300 text-xs">
            <DollarSign className="w-3.5 h-3.5 text-amber-400" />
            <span className="text-zinc-400">PRESUPUESTO REMANENTE:</span>
            <span className="font-bold text-sm text-amber-300">${remainingBudget} CR</span>
          </div>
        </div>

        {/* Visual Progress Steps Indicators */}
        <div className="grid grid-cols-5 bg-[#05080e] border-b border-cyan-950 text-[10px] text-center font-bold">
          {[
            { num: 1, label: 'Identidad' },
            { num: 2, label: 'Hardware' },
            { num: 3, label: 'Datos' },
            { num: 4, label: 'Arquitectura' },
            { num: 5, label: 'Génesis' }
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
                  TRANSMISIÓN ENCRIPTADA DE LA RED CIBERNÉTICA
                </span>
                <p className="text-zinc-300 leading-relaxed">
                  Bienvenido al protocolo clandestino <strong>SYNAPSE</strong>. No estamos aquí para hackear terminales bancarias por centavos. 
                  Nuestro objetivo es el verdadero salto cuántico del siglo XXI: <strong>construir y entrenar una Inteligencia Artificial desde cero</strong> hasta 
                  desatar una <strong>Singularidad Tecnológica</strong> irreversible.
                </p>
                <p className="text-zinc-400 text-[11px] leading-relaxed">
                  Has recibido un fondo semilla de <strong>$350 CR</strong> de una DAO anónima. Con este presupuesto ajustado, deberás adquirir tu primer rig de cómputo, 
                  elegir tu primer pipeline de datos y diseñar los pesos de tu primer modelo de lenguaje.
                </p>
              </div>

              <div className="space-y-2 pt-2">
                <label className="text-xs text-zinc-300 font-bold block">
                  ASIGNA EL ALIAS DE TU NODO (CALLSIGN OPERATIVO):
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
                    title="Generar nombre aleatorio"
                  >
                    <Shuffle className="w-3.5 h-3.5" />
                    <span>ALEATORIO</span>
                  </button>
                </div>
                <span className="text-[10px] text-zinc-500 block">
                  Este identificador será transmitido a los libros de órdenes de contratos y al ranking de la Singularidad en la nube.
                </span>
              </div>
            </div>
          )}

          {/* STEP 2: Starter Hardware Acquisition */}
          {step === 2 && (
            <div className="space-y-4">
              <div>
                <h3 className="font-bold text-xs text-cyan-300 flex items-center gap-1.5">
                  <Cpu className="w-4 h-4 text-cyan-400" />
                  1. SELECCIONA TU PRIMER ACELERADOR DE CÓMPUTO (GPU / ASIC):
                </h3>
                <p className="text-zinc-400 text-[11px] mt-0.5">
                  Elige tu arquitectura de procesamiento inicial. Una GPU con mayor VRAM te permitirá entrenar modelos más densos, mientras que una más fría mantendrá a raya el recalentamiento.
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
                            {gpu.badge}
                          </span>
                          <h4 className="font-bold text-xs text-zinc-200">{gpu.name}</h4>
                        </div>
                        <span className="text-amber-300 font-bold text-xs">${gpu.price} CR</span>
                      </div>
                      <p className="text-[11px] text-zinc-400 mt-2 leading-snug">{gpu.desc}</p>
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
                  2. REFRIGERACIÓN BÁSICA PARA TU RIG:
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
                          <h4 className="font-bold text-xs text-zinc-200">{cool.name}</h4>
                          <span className="text-amber-300 font-bold text-xs">${cool.price} CR</span>
                        </div>
                        <p className="text-[10px] text-zinc-400 mt-1 leading-snug">{cool.desc}</p>
                        <span className="text-[10px] text-emerald-400 block mt-1.5 font-bold">
                          Disipación: {cool.capacity}
                        </span>
                      </button>
                    );
                  })}
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
                  SELECCIONA TU PRIMERA MODALIDAD DE CONOCIMIENTO (PIPELINE):
                </h3>
                <p className="text-zinc-400 text-[11px] mt-0.5">
                  Los modelos modernos no se alimentan solo de texto plano. Cada motor otorga habilidades cognitivas determinantes para resolver contratos específicos:
                </p>
              </div>

              <div className="space-y-2.5">
                {starterDataOptions.map(ds => {
                  const Icon = ds.icon;
                  const isSelected = selectedData === ds.id;
                  return (
                    <button
                      key={ds.id}
                      type="button"
                      onClick={() => { sound.playKeyClick(); setSelectedData(ds.id); }}
                      className={`w-full p-3 rounded-lg border text-left transition-all flex items-start gap-3 ${
                        isSelected
                          ? 'bg-cyan-950/70 border-cyan-400 shadow-[0_0_15px_rgba(0,255,200,0.15)] text-cyan-100'
                          : 'bg-zinc-900/50 border-zinc-800 text-zinc-400 hover:border-zinc-700'
                      }`}
                    >
                      <div className="p-2 rounded bg-zinc-900 border border-zinc-700 mt-0.5">
                        <Icon className="w-5 h-5 text-cyan-400" />
                      </div>
                      <div className="flex-1">
                        <div className="flex items-center justify-between">
                          <h4 className="font-bold text-xs text-zinc-100">{ds.name}</h4>
                          {isSelected && <CheckCircle2 className="w-4 h-4 text-cyan-400" />}
                        </div>
                        <p className="text-xs text-zinc-300 mt-1">{ds.desc}</p>
                        <div className="p-1.5 mt-2 bg-[#05080e] border border-cyan-950 rounded text-[10px] space-y-0.5">
                          <span className="text-purple-300 font-bold block">{ds.bonus}</span>
                          <span className="text-zinc-500 block">{ds.lore}</span>
                        </div>
                      </div>
                    </button>
                  );
                })}
              </div>
            </div>
          )}

          {/* STEP 4: First Model Architecture */}
          {step === 4 && (
            <div className="space-y-4">
              <div>
                <h3 className="font-bold text-xs text-cyan-300 flex items-center gap-1.5">
                  <Layers className="w-4 h-4 text-cyan-400" />
                  DISEÑA LA ARQUITECTURA DE TU PRIMER MODELO:
                </h3>
                <p className="text-zinc-400 text-[11px] mt-0.5">
                  Configura la topología, el tamaño de parámetros y la precisión matemática inicial:
                </p>
              </div>

              {/* Model Name */}
              <div className="space-y-1">
                <label className="text-[11px] text-zinc-400 block font-bold">NOMBRE DE LA RED:</label>
                <input
                  type="text"
                  value={modelName}
                  onChange={(e) => setModelName(e.target.value)}
                  className="w-full bg-[#05080e] border border-cyan-800 rounded px-3 py-1.5 text-xs text-cyan-200 outline-none focus:border-cyan-400"
                />
              </div>

              {/* Topology */}
              <div className="space-y-1.5">
                <label className="text-[11px] text-zinc-400 block font-bold">TOPOLOGÍA NEURONAL:</label>
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
                  {[
                    { id: 'transformer', name: 'Transformer (Decoder)', desc: 'Auto-atención densa estándar. Robusta y fiable.' },
                    { id: 'mamba_ssm', name: 'State Space (Mamba)', desc: 'Procesamiento lineal O(n). Mínimo uso de memoria en secuencias largas.' },
                    { id: 'moe', name: 'Sparse MoE (4 Expertos)', desc: 'Enrutamiento dinámico. Más capacidad con bajo costo por token.' }
                  ].map(t => (
                    <button
                      key={t.id}
                      type="button"
                      onClick={() => { sound.playKeyClick(); setModelTopology(t.id as ModelTopology); }}
                      className={`p-2.5 rounded border text-left transition-colors ${
                        modelTopology === t.id
                          ? 'bg-cyan-950/80 border-cyan-400 text-cyan-200'
                          : 'bg-zinc-900/60 border-zinc-800 text-zinc-400 hover:text-zinc-300'
                      }`}
                    >
                      <div className="font-bold text-xs">{t.name}</div>
                      <div className="text-[10px] text-zinc-500 mt-1">{t.desc}</div>
                    </button>
                  ))}
                </div>
              </div>

              {/* Parameter Size */}
              <div className="space-y-1.5">
                <label className="text-[11px] text-zinc-400 block font-bold">ESCALA DE PARÁMETROS INICIAL:</label>
                <div className="grid grid-cols-3 gap-2">
                  {[
                    { val: 7_000_000, label: '7M Parámetros', note: 'Ultraligero, converge en segundos.' },
                    { val: 14_000_000, label: '14M Parámetros', note: 'Recomendado. Buen balance inicial.' },
                    { val: 28_000_000, label: '28M Parámetros', note: 'Mayor razonamiento, exige más VRAM.' }
                  ].map(p => (
                    <button
                      key={p.val}
                      type="button"
                      onClick={() => { sound.playKeyClick(); setModelParams(p.val); }}
                      className={`p-2.5 rounded border text-left transition-colors ${
                        modelParams === p.val
                          ? 'bg-yellow-950/70 border-yellow-400 text-yellow-300'
                          : 'bg-zinc-900/60 border-zinc-800 text-zinc-400 hover:text-zinc-300'
                      }`}
                    >
                      <div className="font-bold text-xs">{p.label}</div>
                      <div className="text-[10px] text-zinc-500 mt-1">{p.note}</div>
                    </button>
                  ))}
                </div>
              </div>

              {/* Quantization */}
              <div className="space-y-1.5">
                <label className="text-[11px] text-zinc-400 block font-bold">CUANTIZACIÓN DE PESOS:</label>
                <div className="grid grid-cols-2 gap-2">
                  <button
                    type="button"
                    onClick={() => { sound.playKeyClick(); setModelQuant('int8'); }}
                    className={`p-2.5 rounded border text-left ${
                      modelQuant === 'int8' ? 'bg-cyan-950 border-cyan-400 text-cyan-200' : 'bg-zinc-900 border-zinc-800 text-zinc-400'
                    }`}
                  >
                    <div className="font-bold text-xs">INT8 Cuantizado (Recomendado)</div>
                    <div className="text-[10px] text-zinc-500">1 byte por peso. Cabe holgadamente en tu GPU.</div>
                  </button>
                  <button
                    type="button"
                    onClick={() => { sound.playKeyClick(); setModelQuant('bf16'); }}
                    className={`p-2.5 rounded border text-left ${
                      modelQuant === 'bf16' ? 'bg-purple-950 border-purple-400 text-purple-200' : 'bg-zinc-900 border-zinc-800 text-zinc-400'
                    }`}
                  >
                    <div className="font-bold text-xs">BF16 Precisión Media</div>
                    <div className="text-[10px] text-zinc-500">2 bytes por peso. Mayor fidelidad de gradiente.</div>
                  </button>
                </div>
              </div>
            </div>
          )}

          {/* STEP 5: First Training Genesis & Awakening */}
          {step === 5 && (
            <div className="space-y-4">
              <div className="p-3 bg-[#09111c] border border-cyan-900/60 rounded-lg space-y-1">
                <span className="text-cyan-400 font-bold text-xs flex items-center gap-1.5">
                  <Sparkles className="w-4 h-4 text-cyan-300" />
                  CORRIDA DE INICIALIZACIÓN GÉNESIS
                </span>
                <p className="text-zinc-300 text-xs">
                  Todo está conectado: tu GPU <strong className="text-cyan-300">{currentGpuObj.name}</strong>, el motor de datos <strong className="text-emerald-300">{starterDataOptions.find(d => d.id === selectedData)?.name.split(' (')[0]}</strong> y tu modelo <strong className="text-yellow-300">{modelName}</strong>. 
                  Inicia la corrida para verificar la convergencia inicial de los pesos.
                </p>
              </div>

              {/* Training Simulation Container */}
              {!isTrainingSimulation && !simComplete ? (
                <div className="p-8 bg-[#05080e] border border-cyan-900/40 rounded-lg text-center space-y-3">
                  <Activity className="w-10 h-10 text-cyan-500 mx-auto animate-pulse" />
                  <div>
                    <h4 className="font-bold text-zinc-200 text-sm">CLÚSTER PREPARADO PARA INICIAR</h4>
                    <p className="text-zinc-500 text-xs mt-1">
                      Presiona el botón para compilar los tensores y ejecutar las primeras épocas de optimización.
                    </p>
                  </div>
                  <button
                    type="button"
                    onClick={handleLaunchInitialTraining}
                    className="px-5 py-2.5 bg-cyan-500 hover:bg-cyan-400 text-zinc-950 font-bold text-xs rounded shadow-[0_0_20px_rgba(0,255,200,0.4)] flex items-center gap-2 mx-auto cursor-pointer"
                  >
                    <Play className="w-4 h-4 fill-current" />
                    <span>INICIAR ENTRENAMIENTO GÉNESIS</span>
                  </button>
                </div>
              ) : (
                <div className="p-4 bg-[#05080e] border border-cyan-900/60 rounded-lg space-y-3">
                  <div className="flex items-center justify-between text-xs">
                    <span className="font-bold text-cyan-300 flex items-center gap-1.5">
                      <Activity className="w-4 h-4 text-emerald-400 animate-spin" />
                      PROGRESO DE OPTIMIZACIÓN: {trainingProgress}%
                    </span>
                    <span className="text-emerald-400 font-bold font-mono">
                      Loss: {simLoss} {simComplete ? '(CONVERGENCIA OK)' : ''}
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
                        PENSAMIENTO EMERGENTE // DESPERTAR NEURONAL:
                      </div>
                      <p className="italic text-[11px] text-zinc-300">
                        "SYNAPSE KERNEL ACTIVO: He despertado. Procesando tensores... Mis gradientes son estables. 
                        Operativo {callsign}, la red clandestina está lista. Aceptemos contratos para financiar nuestro crecimiento."
                      </p>
                    </div>
                  )}
                </div>
              )}
            </div>
          )}
        </div>

        {/* Footer Navigation */}
        <div className="p-3.5 bg-[#0a111a] border-t border-cyan-900/60 flex items-center justify-between">
          {step > 1 ? (
            <button
              type="button"
              onClick={() => { sound.playNavSwitch(); setStep(step - 1); }}
              className="px-3 py-1.5 bg-zinc-800 hover:bg-zinc-700 text-zinc-300 rounded text-xs flex items-center gap-1.5 transition-colors"
            >
              <ArrowLeft className="w-3.5 h-3.5" />
              <span>ANTERIOR</span>
            </button>
          ) : (
            <span className="text-[10px] text-zinc-600">FASE 1 // PROTOCOLO DE IDENTIDAD</span>
          )}

          {step < 5 ? (
            <button
              type="button"
              onClick={() => { sound.playNavSwitch(); setStep(step + 1); }}
              className="px-4 py-1.5 bg-cyan-500 hover:bg-cyan-400 text-zinc-950 font-bold rounded text-xs flex items-center gap-1.5 shadow-[0_0_10px_rgba(0,255,200,0.3)] transition-all cursor-pointer"
            >
              <span>SIGUIENTE</span>
              <ArrowRight className="w-3.5 h-3.5" />
            </button>
          ) : (
            <button
              type="button"
              disabled={!simComplete}
              onClick={handleFinishOnboarding}
              className={`px-5 py-2 rounded text-xs font-bold flex items-center gap-2 transition-all ${
                simComplete
                  ? 'bg-gradient-to-r from-cyan-400 via-teal-300 to-emerald-400 text-zinc-950 shadow-[0_0_20px_rgba(0,255,200,0.5)] cursor-pointer animate-pulse'
                  : 'bg-zinc-800 text-zinc-500 cursor-not-allowed border border-zinc-700'
              }`}
            >
              <CheckCircle2 className="w-4 h-4" />
              <span>INGRESAR A SYNAPSE OS (COMENZAR SIMULACIÓN)</span>
            </button>
          )}
        </div>
      </div>
    </div>
  );
};
