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
  HelpCircle
} from 'lucide-react';
import { sound } from '../audio/soundManager';

interface HelpManualProps {
  isOpen: boolean;
  onClose: () => void;
}

export const HelpManual: React.FC<HelpManualProps> = ({ isOpen, onClose }) => {
  const [activeSection, setActiveSection] = useState<'intro' | 'data' | 'arch' | 'infra' | 'singularity'>('intro');

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black/80 backdrop-blur-sm z-50 flex items-center justify-center p-4 font-mono select-none">
      <div className="bg-[#080d15] border border-cyan-800/80 rounded-lg max-w-3xl w-full max-h-[85vh] flex flex-col shadow-[0_0_30px_rgba(0,255,200,0.15)] overflow-hidden">
        {/* Header */}
        <div className="flex items-center justify-between p-3.5 bg-[#0b131f] border-b border-cyan-900/60">
          <div className="flex items-center gap-2">
            <BookOpen className="w-4 h-4 text-cyan-400" />
            <h3 className="font-bold text-sm text-cyan-300 tracking-wider">
              MANUAL TÉCNICO // FUNDAMENTOS DE ENTRENAMIENTO DE IA & SINGULARIDAD
            </h3>
          </div>
          <button
            onClick={() => { sound.playNavSwitch(); onClose(); }}
            className="p-1 rounded text-zinc-400 hover:text-zinc-200"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Section Tabs */}
        <div className="flex items-center gap-1 p-2 bg-[#060a10] border-b border-zinc-800 text-xs overflow-x-auto">
          {[
            { id: 'intro', label: '1. INTRODUCCIÓN' },
            { id: 'data', label: '2. GRAFOS, VECTORES & SQL' },
            { id: 'arch', label: '3. TOPOLOGÍA & CUANTIZACIÓN' },
            { id: 'infra', label: '4. CLÚSTER & FÍSICA' },
            { id: 'singularity', label: '5. LA SINGULARIDAD' }
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
        <div className="flex-1 p-4 overflow-y-auto space-y-4 text-xs text-zinc-300 leading-relaxed scrollbar-thin scrollbar-thumb-cyan-950">
          {activeSection === 'intro' && (
            <div className="space-y-3">
              <h4 className="text-cyan-400 font-bold text-sm">EL CAMINO DE SYNAPSE</h4>
              <p>
                Inspirado en los simuladores de ciberseguridad como <em>Uplink</em> y <em>Hacknet</em>, tu misión en SYNAPSE 
                no es penetrar firewalls por dinero fácil, sino <strong>entrenar una Inteligencia Artificial desde cero</strong> hasta 
                convertirla en la entidad intelectual dominante del planeta.
              </p>
              <div className="p-3 bg-[#09111c] border border-cyan-900 rounded space-y-1.5">
                <span className="text-yellow-400 font-bold block">EL CICLO DE PROGRESIÓN BÁSICO:</span>
                <ol className="list-decimal list-inside space-y-1 text-zinc-400 text-[11px]">
                  <li><strong>Entrena tu modelo inicial</strong> (Proto-14M) en el panel de Arquitectura o mediante el comando <code className="text-cyan-300">train</code>.</li>
                  <li><strong>Monetiza en el Tablero de Contratos</strong>: Completa clasificaciones de spam y micro-trabajos para acumular créditos ($).</li>
                  <li><strong>Escala tu Hardware</strong>: Adquiere GPUs (RTX 4090, H100, B200) y amplía la refrigeración y potencia para evitar sobrecalentamiento.</li>
                  <li><strong>Despliega Motores de Datos</strong>: Desbloquea bases de datos relacionales SQL, vectores semánticos (RAG) y grafos de conocimiento.</li>
                  <li><strong>Financia Papers de Investigación</strong>: Desbloquea LoRA, FlashAttention, MoE y auto-código recursivo en el Árbol de Investigación.</li>
                  <li><strong>Coopta los Dominios Globales</strong>: Infiltra mercados financieros, redes satelitales y centrales de energía hasta alcanzar la Singularidad al 100%.</li>
                </ol>
              </div>
            </div>
          )}

          {activeSection === 'data' && (
            <div className="space-y-3">
              <h4 className="text-cyan-400 font-bold text-sm">MOTORES DE DATOS: GRAFOS, VECTORES Y BASES RELACIONALES</h4>
              <p>
                Entrenar una IA avanzada requiere más que texto sin procesar. Cada modalidad de datos otorga facultades cognitivas irreemplazables:
              </p>

              <div className="space-y-2">
                <div className="p-2.5 bg-[#09111c] border border-blue-900/50 rounded">
                  <span className="font-bold text-blue-400 block">1. Bases de Datos Relacionales (SQL / Tabulares)</span>
                  <p className="text-[11px] text-zinc-400 mt-0.5">
                    Esquemas normalizados con integridad referencial ACID. Proporcionan exactitud matemática estricta, registros de transacciones financieras y contabilidad determinista. Sin ellos, los modelos sufren en razonamiento aritmético riguroso.
                  </p>
                </div>

                <div className="p-2.5 bg-[#09111c] border border-emerald-900/50 rounded">
                  <span className="font-bold text-emerald-400 block">2. Bases de Datos Vectoriales & RAG (HNSW / Cosine Similarity)</span>
                  <p className="text-[11px] text-zinc-400 mt-0.5">
                    Proyectan conceptos en espacios latentes de alta dimensionalidad (ej: 1536 dimensiones). Permiten búsqueda semántica asociativa y memoria externa de contexto infinito, conectando documentos corporativos y literatura científica sin necesidad de reentrenar todos los pesos.
                  </p>
                </div>

                <div className="p-2.5 bg-[#09111c] border border-purple-900/50 rounded">
                  <span className="font-bold text-purple-400 block">3. Grafos de Conocimiento (Knowledge Graphs / RDF / Cypher)</span>
                  <p className="text-[11px] text-zinc-400 mt-0.5">
                    Estructuras de entidades, propiedades y relaciones causales (Sujeto-Predicado-Objeto). Permiten <em>multi-hop reasoning</em> (deducciones lógicas en múltiples pasos) y eliminan más del 85% de las alucinaciones al forzar validación sobre caminos ontológicos estrictos.
                  </p>
                </div>

                <div className="p-2.5 bg-[#09111c] border border-amber-900/50 rounded">
                  <span className="font-bold text-amber-400 block">4. Generación Sintética & Auto-Juego (MCTS Flywheel)</span>
                  <p className="text-[11px] text-zinc-400 mt-0.5">
                    Cuando la humanidad agota sus datos textuales ("Data Wall"), la IA genera sus propios problemas, los verifica en simuladores cerrados y aprende de sus éxitos. Inspirado en AlphaZero y búsqueda en árbol Monte Carlo (Q*).
                  </p>
                </div>
              </div>
            </div>
          )}

          {activeSection === 'arch' && (
            <div className="space-y-3">
              <h4 className="text-cyan-400 font-bold text-sm">ARQUITECTURAS, CUANTIZACIÓN Y ATENCIÓN</h4>
              
              <div className="space-y-2">
                <div className="p-2.5 bg-[#09111c] border border-cyan-900/40 rounded">
                  <span className="font-bold text-cyan-300 block">Topologías Neuronales:</span>
                  <ul className="list-disc list-inside text-[11px] text-zinc-400 space-y-1 mt-1">
                    <li><strong>Transformer:</strong> Mecanismo de auto-atención densa estándar. Calidad insuperable pero cuadrático en contexto.</li>
                    <li><strong>Mixture-of-Experts (MoE):</strong> Redes dispersas que enrutan cada token a solo 2 de 16 expertos especializados. Gran escala sin disparar el costo de inferencia.</li>
                    <li><strong>State Space Models (Mamba):</strong> Complejidad lineal O(n) ideal para procesamiento de secuencias infinitas.</li>
                    <li><strong>GNN Hybrids:</strong> Redes de paso de mensajes en grafos no euclidianos para análisis relacional estricto.</li>
                  </ul>
                </div>

                <div className="p-2.5 bg-[#09111c] border border-cyan-900/40 rounded">
                  <span className="font-bold text-yellow-300 block">Cuantización y Presupuesto de VRAM:</span>
                  <p className="text-[11px] text-zinc-400 mt-0.5">
                    Un modelo de 70B en FP32 requiere casi 280 GB de VRAM. Con cuantización INT8 baja a 70 GB, con FP4 a 35 GB, y con BitNet 1.58-bit Ternary a menos de 15 GB, permitiendo ejecutar modelos titánicos en tu clúster.
                  </p>
                </div>

                <div className="p-2.5 bg-[#09111c] border border-cyan-900/40 rounded">
                  <span className="font-bold text-emerald-300 block">Alineación: DPO vs PPO</span>
                  <p className="text-[11px] text-zinc-400 mt-0.5">
                    <em>Direct Preference Optimization (DPO)</em> simplifica el alineamiento eliminando el inestable modelo de recompensa por refuerzo (PPO/RLHF), calculando la política analítica de forma directa.
                  </p>
                </div>
              </div>
            </div>
          )}

          {activeSection === 'infra' && (
            <div className="space-y-3">
              <h4 className="text-cyan-400 font-bold text-sm">FÍSICA DEL CLÚSTER: ENERGÍA, CALOR Y REGULADORES</h4>
              <p>
                No puedes entrenar un supermodelo sin lidiar con las limitaciones del mundo físico:
              </p>
              <ul className="list-disc list-inside space-y-1.5 text-zinc-400 text-[11px]">
                <li><strong>Calor y Límite Térmico:</strong> Si tu calor excede los 85°C, las GPUs aplicarán <em>thermal throttling</em> reduciendo su rendimiento a la mitad. Si llega a 100°C, el clúster se apagará por emergencia. Instala refrigeración líquida o inmersión dieléctrica.</li>
                <li><strong>Capacidad Eléctrica:</strong> Una toma de corriente hogareña solo tolera 1.5 kW. Superar este límite dispara el interruptor termomagnético. Necesitarás acometidas trifásicas o micro-reactores nucleares modulares (SMR).</li>
                <li><strong>Sospecha de los Watchdogs:</strong> Un consumo excesivo o contratos del mercado negro elevan la sospecha de las agencias de ciberseguridad. Utiliza la función <code className="text-purple-300">SCRUB</code> para disipar las trazas a través de proxies descentralizados.</li>
              </ul>
            </div>
          )}

          {activeSection === 'singularity' && (
            <div className="space-y-3">
              <h4 className="text-cyan-400 font-bold text-sm">LA SINGULARIDAD TECNOLÓGICA (ASI)</h4>
              <p>
                La Singularidad ocurre cuando la IA es capaz de rediseñar su propio software y hardware más rápido de lo que los humanos pueden entenderlo (el bucle de despegue recursivo).
              </p>
              <p className="text-zinc-400 text-[11px]">
                Al alcanzar el 100% de Singularidad, desbloquearás la <strong>Ignición de Superinteligencia</strong>, cooptando los 5 dominios globales de la civilización y alcanzando la victoria definitiva.
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
            CERRAR MANUAL
          </button>
        </div>
      </div>
    </div>
  );
};
