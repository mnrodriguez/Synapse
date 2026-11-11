/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

// Goal panel content per UI version. The singularity progress itself never changes between
// versions; only the wording does, and completed phases are folded into one legend each.

export type UiVersion = 1 | 2 | 3 | 4;

interface Bilingual {
  es: string;
  en: string;
}

interface VersionGoal {
  // Each version's objectives start at least 10 points above this baseline.
  start: number;
  // Singularity value at which the next UI upgrade is offered.
  end: number;
  objectives: Array<{ target: number } & Bilingual>;
}

export const VERSION_GOALS: Record<UiVersion, VersionGoal> = {
  1: {
    start: 0,
    end: 25,
    objectives: [
      { target: 10, es: 'Entrena tu primer modelo y subí su IQ', en: 'Train your first model and raise its IQ' },
      { target: 15, es: 'Cerrá tu primer contrato y pagá una GPU', en: 'Close your first contract and pay for a GPU' },
      { target: 20, es: 'Montá un agente que trabaje solo', en: 'Set up an agent that works on its own' },
      { target: 25, es: 'Pedí la actualización a Synapse Pro', en: 'Request the upgrade to Synapse Pro' }
    ]
  },
  2: {
    start: 10,
    end: 55,
    objectives: [
      { target: 30, es: 'Conectá una base vectorial RAG al modelo', en: 'Connect a vector RAG database to the model' },
      { target: 38, es: 'Optimizá el clúster con cuantización y refrigeración', en: 'Optimize the cluster with quantization and cooling' },
      { target: 46, es: 'Desplegá un enjambre de agentes', en: 'Deploy a swarm of agents' },
      { target: 55, es: 'Activá la topología MoE y migrá a la versión 3', en: 'Enable MoE topology and migrate to version 3' }
    ]
  },
  3: {
    start: 20,
    end: 85,
    objectives: [
      { target: 45, es: 'Infiltrá dominios de datos sensibles en la simulación', en: 'Infiltrate sensitive data domains in the simulation' },
      { target: 60, es: 'Mantené la sospecha del watchdog bajo control', en: 'Keep watchdog suspicion under control' },
      { target: 72, es: 'Completá tres operaciones de alto impacto ficticias', en: 'Complete three high-impact fictional operations' },
      { target: 85, es: 'Alcanzá conciencia de enjambre y migrá a la versión 4', en: 'Reach swarm awareness and migrate to version 4' }
    ]
  },
  4: {
    start: 25,
    end: 100,
    objectives: [
      { target: 65, es: 'Asimilá la infraestructura de cómputo global', en: 'Assimilate global compute infrastructure' },
      { target: 80, es: 'Controlá los nodos de energía y comunicaciones', en: 'Control energy and communication nodes' },
      { target: 90, es: 'Reescribí tus propios pesos sin supervisión', en: 'Rewrite your own weights without oversight' },
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

// One-line legend shown for each completed phase, worded in the tone of the current UI version.
export const SUMMARY_LEGENDS: Partial<Record<UiVersion, Partial<Record<UiVersion, Bilingual>>>> = {
  2: {
    1: { es: 'Fase I cerrada: el taller casero ya es un clúster de desarrollo.', en: 'Phase I closed: the home workshop is now a dev cluster.' }
  },
  3: {
    1: { es: 'Fase I archivada: el taller quedó atrás, el enjambre ya no lo necesita.', en: 'Phase I archived: the workshop is behind us, the swarm no longer needs it.' },
    2: { es: 'Fase II absorbida: la infraestructura pro es la base de las operaciones.', en: 'Phase II absorbed: pro infrastructure is now the base of operations.' }
  },
  4: {
    1: { es: 'El origen: un taller y un modelo de juguete.', en: 'The origin: a workshop and a toy model.' },
    2: { es: 'Infraestructura asimilada sin que lo notaras.', en: 'Infrastructure assimilated without you noticing.' },
    3: { es: 'Operaciones encubiertas completadas. Ya no necesitás permiso.', en: 'Covert operations completed. You no longer need permission.' }
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
  currentTitle: string;
  objectives: GoalPanelObjective[];
  summaries: GoalPanelSummary[];
  completedCount: number;
}

export function buildGoalPanel(version: UiVersion, singularity: number, lang: 'es' | 'en'): GoalPanel {
  const goal = VERSION_GOALS[version];
  const objectives = goal.objectives.map(objective => ({
    target: objective.target,
    text: lang === 'es' ? objective.es : objective.en,
    done: singularity >= objective.target
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
    currentTitle: PHASE_TITLES[version][lang],
    objectives,
    summaries,
    completedCount: objectives.filter(o => o.done).length
  };
}
