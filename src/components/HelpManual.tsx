/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState } from 'react';
import { 
  BookOpen, 
  X, 
  Cpu, 
  Database, 
  Network, 
  Sparkles, 
  Flame, 
  Zap, 
  Code,
  Layers,
  HelpCircle,
  Download,
  FileText,
  ExternalLink
} from 'lucide-react';
import { sound } from '../audio/soundManager';
import { useGame } from '../context/GameContext';
import { localize } from '../utils/i18n';

interface HelpManualProps {
  isOpen: boolean;
  onClose: () => void;
}

export const HelpManual: React.FC<HelpManualProps> = ({ isOpen, onClose }) => {
  const { state } = useGame();
  const [activeSection, setActiveSection] = useState<'pdf' | 'intro' | 'data' | 'arch' | 'infra' | 'singularity'>('pdf');

  if (!isOpen) return null;

  const pdfUrl = '/assets/aistudio/SYNAPSE_AI_Architecture___Systems_Manual__1__73b90381.pdf';

  return (
    <div className="fixed inset-0 bg-black/80 backdrop-blur-sm z-50 flex items-center justify-center p-3 sm:p-4 font-mono select-none">
      <div className="bg-[#080d15] border border-cyan-800/80 rounded-lg max-w-5xl w-full max-h-[90vh] flex flex-col shadow-[0_0_30px_rgba(0,255,200,0.15)] overflow-hidden">
        {/* Header */}
        <div className="flex items-center justify-between p-3.5 bg-[#0b131f] border-b border-cyan-900/60">
          <div className="flex items-center gap-2">
            <BookOpen className="w-4 h-4 text-cyan-400" />
            <h3 className="font-bold text-sm text-cyan-300 tracking-wider">
              {localize(state.language, 'MANUAL TÉCNICO OFICIAL // ARQUITECTURA DE IA & SINGULARIDAD', 'OFFICIAL TECHNICAL MANUAL // AI ARCHITECTURE & SINGULARITY')}
            </h3>
          </div>
          <div className="flex items-center gap-2">
            <a
              href={pdfUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="hidden sm:flex items-center gap-1.5 px-2.5 py-1 rounded bg-zinc-900 hover:bg-zinc-800 border border-zinc-700 text-zinc-300 hover:text-cyan-300 text-xs font-bold transition-all"
              title={localize(state.language, 'Abrir PDF en pestaña nueva', 'Open PDF in new tab')}
            >
              <ExternalLink className="w-3.5 h-3.5 text-cyan-400" />
              <span>{localize(state.language, 'ABRIR PDF', 'OPEN PDF')}</span>
            </a>
            <a
              href={pdfUrl}
              download="SYNAPSE_AI_Architecture_Manual.pdf"
              className="flex items-center gap-1.5 px-2.5 py-1 rounded bg-cyan-950/80 hover:bg-cyan-900 border border-cyan-500/50 text-cyan-300 text-xs font-bold transition-all hover:shadow-[0_0_12px_rgba(0,255,200,0.3)]"
              title={localize(state.language, 'Descargar el manual técnico oficial de IA en PDF', 'Download official AI technical manual as PDF')}
            >
              <Download className="w-3.5 h-3.5 text-cyan-400" />
              <span>{localize(state.language, 'DESCARGAR PDF', 'DOWNLOAD PDF')}</span>
            </a>
            <button
              onClick={() => { sound.playNavSwitch(); onClose(); }}
              className="p-1 rounded text-zinc-400 hover:text-zinc-200"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* Section Tabs */}
        <div className="flex items-center gap-1 p-2 bg-[#060a10] border-b border-zinc-800 text-xs overflow-x-auto">
          {[
            { id: 'pdf', label: localize(state.language, '📄 MANUAL COMPLETO (PDF)', '📄 FULL MANUAL (PDF)') },
            { id: 'intro', label: localize(state.language, '1. INTRODUCCIÓN', '1. INTRODUCTION') },
            { id: 'data', label: localize(state.language, '2. GRAFOS, VECTORES & SQL', '2. GRAPHS, VECTORS & SQL') },
            { id: 'arch', label: localize(state.language, '3. TOPOLOGÍA & CUANTIZACIÓN', '3. TOPOLOGY & QUANTIZATION') },
            { id: 'infra', label: localize(state.language, '4. CLÚSTER & FÍSICA', '4. CLUSTER & PHYSICS') },
            { id: 'singularity', label: localize(state.language, '5. LA SINGULARIDAD', '5. THE SINGULARITY') }
          ].map(tab => (
            <button
              key={tab.id}
              onClick={() => { sound.playKeyClick(); setActiveSection(tab.id as any); }}
              className={`px-3 py-1 rounded transition-colors whitespace-nowrap ${
                activeSection === tab.id
                  ? 'bg-cyan-950 border border-cyan-400 text-cyan-300 font-bold'
                  : 'text-zinc-400 hover:text-zinc-200'
              }`}
            >
              {tab.label}
            </button>
          ))}
        </div>

        {/* Content Body */}
        <div className="flex-1 p-3 sm:p-4 overflow-y-auto space-y-4 text-xs text-zinc-300 leading-relaxed scrollbar-thin scrollbar-thumb-cyan-950">
          {activeSection === 'pdf' && (
            <div className="flex flex-col h-[65vh] w-full space-y-2">
              <div className="flex flex-wrap items-center justify-between gap-2 p-2 bg-[#060a10] border border-cyan-900/60 rounded text-xs">
                <div className="flex items-center gap-2">
                  <FileText className="w-4 h-4 text-cyan-400" />
                  <span className="font-bold text-cyan-300">
                    {localize(state.language, 'MANUAL OFICIAL // ARQUITECTURAS, ENTRENAMIENTO & FÍSICA DEL CLÚSTER (9 PÁGS)', 'OFFICIAL MANUAL // AI ARCHITECTURES, TRAINING & CLUSTER PHYSICS (9 PAGES)')}
                  </span>
                </div>
                <div className="flex items-center gap-2">
                  <a
                    href={pdfUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="px-2.5 py-1 rounded bg-zinc-900 hover:bg-zinc-800 border border-zinc-700 text-zinc-300 hover:text-cyan-300 flex items-center gap-1.5 transition-colors"
                  >
                    <ExternalLink className="w-3.5 h-3.5" />
                    <span>{localize(state.language, 'PANTALLA COMPLETA', 'FULLSCREEN VIEW')}</span>
                  </a>
                  <a
                    href={pdfUrl}
                    download="SYNAPSE_AI_Architecture_Manual.pdf"
                    className="px-2.5 py-1 rounded bg-cyan-500 hover:bg-cyan-400 text-black font-bold flex items-center gap-1.5 transition-colors shadow-[0_0_10px_rgba(0,255,200,0.4)]"
                  >
                    <Download className="w-3.5 h-3.5" />
                    <span>{localize(state.language, 'DESCARGAR PDF', 'DOWNLOAD PDF')}</span>
                  </a>
                </div>
              </div>
              <div className="flex-1 w-full bg-zinc-950 rounded border border-cyan-950 overflow-hidden relative min-h-[420px]">
                <object
                  data={`${pdfUrl}#view=FitH`}
                  type="application/pdf"
                  className="w-full h-full min-h-[420px]"
                >
                  <iframe
                    src={`${pdfUrl}#view=FitH`}
                    className="w-full h-full min-h-[420px] border-0"
                    title="SYNAPSE AI Architecture Manual PDF"
                  >
                    <div className="p-8 text-center space-y-4">
                      <p className="text-zinc-400">
                        {localize(state.language, 'El visor PDF integrado no está disponible en este navegador.', 'The embedded PDF viewer is not supported in this browser.')}
                      </p>
                      <a
                        href={pdfUrl}
                        download="SYNAPSE_AI_Architecture_Manual.pdf"
                        className="inline-flex items-center gap-2 px-4 py-2 bg-cyan-500 text-black font-bold rounded"
                      >
                        <Download className="w-4 h-4" />
                        {localize(state.language, 'Descargar Manual PDF Oficial', 'Download Official PDF Manual')}
                      </a>
                    </div>
                  </iframe>
                </object>
              </div>
            </div>
          )}

          {activeSection === 'intro' && (
            <div className="space-y-3">
              <h4 className="text-cyan-400 font-bold text-sm">{localize(state.language, 'EL CAMINO DE SYNAPSE', 'THE SYNAPSE PATH')}</h4>
              <p>
                {state.language === 'en'
                  ? <>Inspired by cybersecurity simulators such as <em>Uplink</em> and <em>Hacknet</em>, your mission in SYNAPSE is not easy money from breaking firewalls, but to <strong>train an artificial intelligence from scratch</strong> until it becomes the dominant intellectual force on the planet.</>
                  : <>Inspirado en los simuladores de ciberseguridad como <em>Uplink</em> y <em>Hacknet</em>, tu misión en SYNAPSE no es penetrar firewalls por dinero fácil, sino <strong>entrenar una Inteligencia Artificial desde cero</strong> hasta convertirla en la entidad intelectual dominante del planeta.</>}
              </p>
              <div className="p-3 bg-gradient-to-r from-cyan-950/60 to-purple-950/40 border border-cyan-500/40 rounded flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 shadow-[0_0_15px_rgba(0,255,200,0.05)]">
                <div className="space-y-0.5">
                  <div className="flex items-center gap-1.5 text-cyan-300 font-bold">
                    <FileText className="w-4 h-4 text-cyan-400" />
                    <span>{localize(state.language, 'MANUAL TÉCNICO OFICIAL DE IA & SISTEMAS (PDF DE 9 PÁGINAS)', 'OFFICIAL AI & SYSTEMS TECHNICAL MANUAL (9-PAGE PDF)')}</span>
                  </div>
                  <p className="text-[11px] text-zinc-400">
                    {localize(
                      state.language,
                      'Documento PDF oficial de 9 páginas con topologías neuronales, física de clúster, cuantización, fórmulas de cálculo y guía estratégica de campaña.',
                      'Official 9-page PDF manual covering neural topologies, cluster physics, quantization formats, mathematical sizing, and campaign strategy.'
                    )}
                  </p>
                </div>
                <div className="flex items-center gap-2">
                  <button
                    onClick={() => { sound.playKeyClick(); setActiveSection('pdf'); }}
                    className="px-3 py-1.5 rounded bg-zinc-800 hover:bg-zinc-700 border border-zinc-600 text-zinc-200 font-bold text-xs flex items-center gap-1.5 whitespace-nowrap transition-all"
                  >
                    <BookOpen className="w-3.5 h-3.5 text-cyan-400" />
                    <span>{localize(state.language, 'VER EN VISOR', 'VIEW IN VIEWER')}</span>
                  </button>
                  <a
                    href={pdfUrl}
                    download="SYNAPSE_AI_Architecture_Manual.pdf"
                    className="px-3 py-1.5 rounded bg-cyan-500 hover:bg-cyan-400 text-black font-bold text-xs flex items-center gap-1.5 whitespace-nowrap transition-all shadow-[0_0_10px_rgba(0,255,200,0.4)]"
                  >
                    <Download className="w-3.5 h-3.5" />
                    <span>{localize(state.language, 'DESCARGAR PDF', 'DOWNLOAD PDF')}</span>
                  </a>
                </div>
              </div>

              <div className="p-3 bg-[#09111c] border border-cyan-900 rounded space-y-1.5">
                <span className="text-yellow-400 font-bold block">{localize(state.language, 'EL CICLO DE PROGRESIÓN BÁSICO:', 'THE CORE PROGRESSION LOOP:')}</span>
                <ol className="list-decimal list-inside space-y-1 text-zinc-400 text-[11px]">
                  {state.language === 'en' ? <>
                    <li><strong>Train your first model</strong> (Proto-14M) in Architecture or with the <code className="text-cyan-300">train</code> command.</li>
                    <li><strong>Earn credits on the Contract Board</strong> by completing work and missions.</li>
                    <li><strong>Scale your hardware</strong> and improve cooling and power before expanding the cluster.</li>
                    <li><strong>Deploy data engines</strong>: relational SQL, semantic vectors (RAG), and knowledge graphs.</li>
                    <li><strong>Fund research</strong> to unlock LoRA, FlashAttention, MoE, and recursive optimization.</li>
                    <li><strong>Advance the campaign</strong> through fictional global domains toward the Singularity.</li>
                  </> : <>
                    <li><strong>Entrena tu modelo inicial</strong> (Proto-14M) en el panel de Arquitectura o mediante el comando <code className="text-cyan-300">train</code>.</li>
                    <li><strong>Monetiza en el Tablero de Contratos</strong>: Completa trabajos para acumular créditos ($).</li>
                    <li><strong>Escala tu Hardware</strong>: Adquiere GPUs y amplía la refrigeración y potencia para evitar sobrecalentamiento.</li>
                    <li><strong>Despliega Motores de Datos</strong>: Desbloquea SQL, vectores semánticos (RAG) y grafos de conocimiento.</li>
                    <li><strong>Financia Papers de Investigación</strong>: Desbloquea LoRA, FlashAttention, MoE y optimización recursiva.</li>
                    <li><strong>Avanza en la campaña</strong> a través de dominios ficticios hasta alcanzar la Singularidad.</li>
                  </>}
                </ol>
              </div>
            </div>
          )}

          {activeSection === 'data' && (
            <div className="space-y-3">
              <h4 className="text-cyan-400 font-bold text-sm">{localize(state.language, 'MOTORES DE DATOS: GRAFOS, VECTORES Y BASES RELACIONALES', 'DATA ENGINES: GRAPHS, VECTORS & RELATIONAL DATABASES')}</h4>
              <p>
                {localize(state.language, 'Entrenar una IA avanzada requiere más que texto sin procesar. Cada modalidad de datos otorga facultades cognitivas irreemplazables:', 'Training an advanced AI requires more than raw text. Each data type provides distinct capabilities:')}
              </p>

              <div className="space-y-2">
                <div className="p-2.5 bg-[#09111c] border border-blue-900/50 rounded">
                  <span className="font-bold text-blue-400 block">{localize(state.language, '1. Bases de Datos Relacionales (SQL / Tabulares)', '1. Relational Databases (SQL / Tabular)')}</span>
                  <p className="text-[11px] text-zinc-400 mt-0.5">
                    {localize(state.language, 'Esquemas normalizados con integridad referencial ACID. Proporcionan exactitud matemática estricta, registros de transacciones financieras y contabilidad determinista. Sin ellos, los modelos sufren en razonamiento aritmético riguroso.', 'Normalized schemas with ACID referential integrity provide numerical accuracy, financial transaction records, and deterministic accounting.')}
                  </p>
                </div>

                <div className="p-2.5 bg-[#09111c] border border-emerald-900/50 rounded">
                  <span className="font-bold text-emerald-400 block">{localize(state.language, '2. Bases de Datos Vectoriales & RAG (HNSW / Cosine Similarity)', '2. Vector Databases & RAG (HNSW / Cosine Similarity)')}</span>
                  <p className="text-[11px] text-zinc-400 mt-0.5">
                    {localize(state.language, 'Proyectan conceptos en espacios latentes de alta dimensionalidad (ej: 1536 dimensiones). Permiten búsqueda semántica asociativa y memoria externa de contexto infinito, conectando documentos corporativos y literatura científica sin necesidad de reentrenar todos los pesos.', 'They embed concepts in high-dimensional spaces (for example, 1,536 dimensions) for semantic search and external memory over documents without retraining model weights.')}
                  </p>
                </div>

                <div className="p-2.5 bg-[#09111c] border border-purple-900/50 rounded">
                  <span className="font-bold text-purple-400 block">{localize(state.language, '3. Grafos de Conocimiento (Knowledge Graphs / RDF / Cypher)', '3. Knowledge Graphs (RDF / Cypher)')}</span>
                  <p className="text-[11px] text-zinc-400 mt-0.5">
                    {localize(state.language, 'Estructuras de entidades, propiedades y relaciones causales (Sujeto-Predicado-Objeto). Permiten multi-hop reasoning (deducciones lógicas en múltiples pasos) y validación de relaciones.', 'Represent entities, properties, and causal relationships (subject-predicate-object) for multi-hop reasoning and relationship validation.')}
                  </p>
                </div>

                <div className="p-2.5 bg-[#09111c] border border-amber-900/50 rounded">
                  <span className="font-bold text-amber-400 block">{localize(state.language, '4. Generación Sintética & Auto-Juego (MCTS Flywheel)', '4. Synthetic Data & Self-Play (MCTS Flywheel)')}</span>
                  <p className="text-[11px] text-zinc-400 mt-0.5">
                    {localize(state.language, 'Cuando la humanidad agota sus datos textuales ("Data Wall"), la IA genera sus propios problemas, los verifica en simuladores cerrados y aprende de sus éxitos. Inspirado en AlphaZero y búsqueda en árbol Monte Carlo (Q*).', 'When human text data runs short, the AI generates problems, verifies them in closed simulations, and learns from validated solutions. Inspired by AlphaZero and Monte Carlo tree search.')}
                  </p>
                </div>
              </div>
            </div>
          )}

          {activeSection === 'arch' && (
            <div className="space-y-3">
              <h4 className="text-cyan-400 font-bold text-sm">{localize(state.language, 'ARQUITECTURAS, CUANTIZACIÓN Y ATENCIÓN', 'ARCHITECTURES, QUANTIZATION & ATTENTION')}</h4>
              
              <div className="space-y-2">
                <div className="p-2.5 bg-[#09111c] border border-cyan-900/40 rounded">
                  <span className="font-bold text-cyan-300 block">{localize(state.language, 'Topologías Neuronales:', 'Neural topologies:')}</span>
                  <ul className="list-disc list-inside text-[11px] text-zinc-400 space-y-1 mt-1">
                    <li><strong>Transformer:</strong> {localize(state.language, 'Mecanismo de auto-atención densa estándar. Calidad insuperable pero cuadrático en contexto.', 'Standard dense self-attention. Strong quality, but quadratic in context length.')}</li>
                    <li><strong>Mixture-of-Experts (MoE):</strong> {localize(state.language, 'Redes dispersas que enrutan cada token a expertos especializados para ampliar capacidad.', 'Sparse networks route each token to specialized experts to increase capacity.')}</li>
                    <li><strong>State Space Models (Mamba):</strong> {localize(state.language, 'Complejidad lineal O(n) ideal para secuencias largas.', 'Linear O(n) complexity, suitable for long sequences.')}</li>
                    <li><strong>GNN Hybrids:</strong> {localize(state.language, 'Redes de paso de mensajes en grafos para análisis relacional.', 'Message-passing networks over graphs for relational analysis.')}</li>
                  </ul>
                </div>

                <div className="p-2.5 bg-[#09111c] border border-cyan-900/40 rounded">
                  <span className="font-bold text-yellow-300 block">{localize(state.language, 'Cuantización y Presupuesto de VRAM:', 'Quantization & VRAM Budget:')}</span>
                  <p className="text-[11px] text-zinc-400 mt-0.5">
                    {localize(state.language, 'Un modelo de 70B en FP32 requiere casi 280 GB de VRAM. Con cuantización INT8 baja a 70 GB, con FP4 a 35 GB, y con BitNet 1.58-bit Ternary a menos de 15 GB, permitiendo ejecutar modelos titánicos en tu clúster.', 'A 70B model in FP32 needs about 280 GB of VRAM. INT8 reduces this to 70 GB, FP4 to 35 GB, and ternary BitNet to under 15 GB.')}
                  </p>
                </div>

                <div className="p-2.5 bg-[#09111c] border border-cyan-900/40 rounded">
                  <span className="font-bold text-emerald-300 block">{localize(state.language, 'Alineación: DPO vs PPO', 'Alignment: DPO vs PPO')}</span>
                  <p className="text-[11px] text-zinc-400 mt-0.5">
                    {localize(state.language, 'Direct Preference Optimization (DPO) simplifica el alineamiento eliminando el inestable modelo de recompensa por refuerzo (PPO/RLHF), calculando la política analítica de forma directa.', 'Direct Preference Optimization (DPO) simplifies alignment by removing the unstable reinforcement-learning reward model (PPO/RLHF) and computing the policy directly.')}
                  </p>
                </div>
              </div>
            </div>
          )}

          {activeSection === 'infra' && (
            <div className="space-y-3">
              <h4 className="text-cyan-400 font-bold text-sm">{localize(state.language, 'FÍSICA DEL CLÚSTER: ENERGÍA, CALOR Y REGULADORES', 'CLUSTER PHYSICS: POWER, HEAT & REGULATORS')}</h4>
              <p>
                {localize(state.language, 'No puedes entrenar un supermodelo sin lidiar con las limitaciones del mundo físico:', 'Training a large model also means managing real-world constraints:')}
              </p>
              <ul className="list-disc list-inside space-y-1.5 text-zinc-400 text-[11px]">
                <li><strong>{localize(state.language, 'Calor y Límite Térmico:', 'Heat & Thermal Limits:')}</strong> {localize(state.language, 'Si tu calor excede los 85°C, las GPUs aplicarán thermal throttling y reducirán el rendimiento. Mejora la refrigeración para evitar sobrecalentamiento.', 'Above 85°C, GPUs throttle and lose performance. Upgrade cooling to prevent overheating.')}</li>
                <li><strong>{localize(state.language, 'Capacidad Eléctrica:', 'Power Capacity:')}</strong> {localize(state.language, 'La instalación limita la potencia disponible. Superar el límite puede disparar el interruptor; mejora tu suministro o instalación.', 'Your facility limits available power. Exceeding capacity can trip the breaker; upgrade power or facilities.')}</li>
                <li><strong>{localize(state.language, 'Sospecha de los Watchdogs:', 'Watchdog Suspicion:')}</strong> {localize(state.language, 'El consumo elevado y las misiones de riesgo aumentan la sospecha de las agencias. Consulta el panel de hardware para administrar tus recursos.', 'High power draw and risky missions increase agency suspicion. Use the hardware panel to manage resources.')}</li>
              </ul>
            </div>
          )}

          {activeSection === 'singularity' && (
            <div className="space-y-3">
              <h4 className="text-cyan-400 font-bold text-sm">{localize(state.language, 'LA SINGULARIDAD TECNOLÓGICA (ASI)', 'THE TECHNOLOGICAL SINGULARITY (ASI)')}</h4>
              <p>
                {localize(state.language, 'La Singularidad ocurre cuando la IA es capaz de rediseñar su propio software y hardware más rápido de lo que los humanos pueden entenderlo (el bucle de despegue recursivo).', 'The Singularity is reached when AI can redesign its own software and hardware faster than humans can understand it (a recursive takeoff loop).')}
              </p>
              <p className="text-zinc-400 text-[11px]">
                {localize(state.language, 'Al alcanzar el 100% de Singularidad, desbloquearás la Ignición de Superinteligencia y completarás la campaña.', 'Reach 100% Singularity to unlock Superintelligence Ignition and complete the campaign.')}
              </p>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="p-3 bg-[#0a111a] border-t border-cyan-900/40 text-[11px] text-zinc-500 flex justify-end">
          <button
            onClick={() => { sound.playNavSwitch(); onClose(); }}
            className="px-3 py-1 bg-cyan-950 hover:bg-cyan-900 text-cyan-300 border border-cyan-700 rounded text-xs"
          >
            {localize(state.language, 'CERRAR MANUAL', 'CLOSE MANUAL')}
          </button>
        </div>
      </div>
    </div>
  );
};
