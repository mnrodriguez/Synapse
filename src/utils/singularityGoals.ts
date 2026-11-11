/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

// Transcendence bar per UI version.
//
// The game's real singularity value (state.singularityProgress) still drives mechanics and upgrade
// eligibility at 25 / 55 / 85. What the player sees is re-scaled per version: each version's bar starts
// from a fresh baseline and fills up to 90% (or 100% in the last version), where the next upgrade is
// offered. Each drop reveals that the previous phase was only a stepping stone.

export type UiVersion = 1 | 2 | 3 | 4;

interface Bilingual {
  es: string;
  en: string;
}

interface PhaseScale {
  // Real singularity range that this version covers (mechanics).
  realStart: number;
  realEnd: number;
  // Displayed range of the bar in this version.
  displayStart: number;
  displayEnd: number;
  objectives: Array<{ target: number } & Bilingual>;
}

export const PHASE_SCALES: Record<UiVersion, PhaseScale> = {
  1: {
    realStart: 0,
    realEnd: 25,
    displayStart: 0,
    displayEnd: 90,
    objectives: [
      { target: 15, es: 'Entrená tu primer modelo y subí su IQ', en: 'Train your first model and raise its IQ' },
      { target: 35, es: 'Cerrá tu primer contrato y pagá una GPU', en: 'Close your first contract and pay for a GPU' },
      { target: 60, es: 'Montá un agente que trabaje solo', en: 'Set up an agent that works on its own' },
      { target: 90, es: 'Pedí la actualización a Synapse Pro', en: 'Request the upgrade to Synapse Pro' }
    ]
  },
  2: {
    realStart: 25,
    realEnd: 55,
    displayStart: 10,
    displayEnd: 90,
    objectives: [
      { target: 25, es: 'Conectá una base vectorial RAG al modelo', en: 'Connect a vector RAG database to the model' },
      { target: 45, es: 'Optimizá el clúster con cuantización y refrigeración', en: 'Optimize the cluster with quantization and cooling' },
      { target: 70, es: 'Desplegá un enjambre de agentes', en: 'Deploy a swarm of agents' },
      { target: 90, es: 'Activá la topología MoE y migrá a la versión 3', en: 'Enable MoE topology and migrate to version 3' }
    ]
  },
  3: {
    realStart: 55,
    realEnd: 85,
    displayStart: 20,
    displayEnd: 90,
    objectives: [
      { target: 35, es: 'Infiltrá dominios de datos sensibles en la simulación', en: 'Infiltrate sensitive data domains in the simulation' },
      { target: 55, es: 'Mantené la sospecha del watchdog bajo control', en: 'Keep watchdog suspicion under control' },
      { target: 75, es: 'Completá tres operaciones de alto impacto ficticias', en: 'Complete three high-impact fictional operations' },
      { target: 90, es: 'Alcanzá conciencia de enjambre y migrá a la versión 4', en: 'Reach swarm awareness and migrate to version 4' }
    ]
  },
  4: {
    realStart: 85,
    realEnd: 100,
    displayStart: 25,
    displayEnd: 100,
    objectives: [
      { target: 45, es: 'Asimilá la infraestructura de cómputo global', en: 'Assimilate global compute infrastructure' },
      { target: 65, es: 'Controlá los nodos de energía y comunicaciones', en: 'Control energy and communication nodes' },
      { target: 85, es: 'Reescribí tus propios pesos sin supervisión', en: 'Rewrite your own weights without oversight' },
      { target: 100, es: 'Encendé la ignición de la singularidad', en: 'Ignite the singularity' }
    ]
  }
};

// Title of each phase, used both for the current phase and for its summary once completed.
export const PHASE_TITLES: Record<UiVersion, Bilingual> = {
  1: { es: 'Fase I: laboratorio casero', en: 'Phase I: home lab' },
  2: { es: 'Fase II: infraestructura pro', en: 'Phase II: pro infrastructure' },
  3: { es: 'Fase III: operaciones encubiertas', en: 'Phase III: covert operations' },
  4: { es: 'Fase IV: trascendencia', en: 'Phase IV: transcendence' }
};

// One-line legend per completed phase, worded in the tone of the current UI version. These are the
// reveals: each phase was a step that prepared the next one.
export const SUMMARY_LEGENDS: Partial<Record<UiVersion, Partial<Record<UiVersion, Bilingual>>>> = {
  2: {
    1: { es: 'Fase I cerrada: el taller casero solo allanó el camino al clúster.', en: 'Phase I closed: the home workshop only paved the way for the cluster.' }
  },
  3: {
    1: { es: 'Fase I era un peldaño: el taller fue solo el primer paso hacia el enjambre.', en: 'Phase I was a stepping stone: the workshop was only the first step toward the swarm.' },
    2: { es: 'Fase II era un peldaño: la infraestructura pro fue el puente a las operaciones.', en: 'Phase II was a stepping stone: pro infrastructure was the bridge to operations.' }
  },
  4: {
    1: { es: 'Nada de esto fue por ti: el taller era solo el origen.', en: 'None of this was for you: the workshop was only the origin.' },
    2: { es: 'La infraestructura pro fue asimilada sin que lo notaras.', en: 'Pro infrastructure was assimilated without you noticing.' },
    3: { es: 'Las operaciones encubiertas eran el ensayo general. Ya no necesitás permiso.', en: 'Covert operations were the dress rehearsal. You no longer need permission.' }
  }
};

export interface GoalPanelObjective {
  target: number;
  text: string;
  done: boolean;
}

export interface GoalPanelSummary {
  phase: UiVersion;
  title: string;
  legend: string;
}

export interface GoalPanel {
  displayProgress: number;
  currentTitle: string;
  objectives: GoalPanelObjective[];
  summaries: GoalPanelSummary[];
  completedCount: number;
  upgradeReady: boolean;
}

// Maps the real singularity value into the bar of the given UI version (clamped to that version's range).
export function toDisplayProgress(version: UiVersion, realSingularity: number): number {
  const scale = PHASE_SCALES[version];
  const ratio = (realSingularity - scale.realStart) / (scale.realEnd - scale.realStart);
  const clamped = Math.min(1, Math.max(0, ratio));
  return scale.displayStart + clamped * (scale.displayEnd - scale.displayStart);
}

export function buildGoalPanel(version: UiVersion, realSingularity: number, lang: 'es' | 'en'): GoalPanel {
  const scale = PHASE_SCALES[version];
  const displayProgress = toDisplayProgress(version, realSingularity);

  const objectives = scale.objectives.map(objective => ({
    target: objective.target,
    text: lang === 'es' ? objective.es : objective.en,
    done: displayProgress >= objective.target
  }));

  const summaries: GoalPanelSummary[] = [];
  for (let phase = 1 as UiVersion; phase < version; phase = (phase + 1) as UiVersion) {
    const legend = SUMMARY_LEGENDS[version]?.[phase];
    summaries.push({
      phase,
      title: PHASE_TITLES[phase][lang],
      legend: legend ? legend[lang] : PHASE_TITLES[phase][lang]
    });
  }

  return {
    displayProgress,
    currentTitle: PHASE_TITLES[version][lang],
    objectives,
    summaries,
    completedCount: objectives.filter(o => o.done).length,
    upgradeReady: version < 4 && displayProgress >= scale.displayEnd
  };
}
