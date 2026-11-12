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

// What a phase objective measures.
//  - display: the transcendence bar value (per-version scale)
//  - pflops:  total cluster compute
//  - contracts: completed paid missions
export type GoalKind = 'display' | 'pflops' | 'contracts';

interface PhaseObjective extends Bilingual {
  id: string;
  kind: GoalKind;
  target: number;
  reward?: number; // credits, claimable once when completed
}

interface PhaseScale {
  // Real singularity range that this version covers (mechanics).
  realStart: number;
  realEnd: number;
  // Displayed range of the bar in this version.
  displayStart: number;
  displayEnd: number;
  objectives: PhaseObjective[];
}

export const PHASE_SCALES: Record<UiVersion, PhaseScale> = {
  1: {
    realStart: 0,
    realEnd: 25,
    displayStart: 0,
    displayEnd: 90,
    objectives: [
      { id: 'v1-train', kind: 'display', target: 15, reward: 100, es: 'Entrena tu primer modelo y sube su puntaje', en: 'Train your first model and raise its score' },
      { id: 'v1-contracts', kind: 'contracts', target: 3, reward: 150, es: 'Completa 3 misiones pagadas', en: 'Complete 3 paid missions' },
      { id: 'v1-pflops', kind: 'pflops', target: 120, reward: 200, es: 'Lleva el clúster a 120 PFLOPS', en: 'Scale the cluster to 120 PFLOPS' },
      { id: 'v1-upgrade', kind: 'display', target: 90, es: 'Pide la actualización a Synapse Pro', en: 'Request the upgrade to Synapse Pro' }
    ]
  },
  2: {
    realStart: 25,
    realEnd: 55,
    displayStart: 10,
    displayEnd: 90,
    objectives: [
      { id: 'v2-rag', kind: 'display', target: 25, es: 'Conecta una base vectorial RAG al modelo', en: 'Connect a vector RAG database to the model' },
      { id: 'v2-optimize', kind: 'display', target: 45, es: 'Optimiza el clúster con cuantización y refrigeración', en: 'Optimize the cluster with quantization and cooling' },
      { id: 'v2-swarm', kind: 'display', target: 70, es: 'Despliega un equipo de agentes', en: 'Deploy a team of agents' },
      { id: 'v2-moe', kind: 'display', target: 90, es: 'Activa la topología MoE y migra a la versión 3', en: 'Enable MoE topology and migrate to version 3' }
    ]
  },
  3: {
    realStart: 55,
    realEnd: 85,
    displayStart: 20,
    displayEnd: 90,
    objectives: [
      { id: 'v3-infiltrate', kind: 'display', target: 35, es: 'Infiltra dominios de datos sensibles en la simulación', en: 'Infiltrate sensitive data domains in the simulation' },
      { id: 'v3-watchdog', kind: 'display', target: 55, es: 'Mantén la sospecha del watchdog bajo control', en: 'Keep watchdog suspicion under control' },
      { id: 'v3-ops', kind: 'display', target: 75, es: 'Completa tres operaciones de alto impacto ficticias', en: 'Complete three high-impact fictional operations' },
      { id: 'v3-swarm', kind: 'display', target: 90, es: 'Alcanza conciencia de enjambre y migra a la versión 4', en: 'Reach swarm awareness and migrate to version 4' }
    ]
  },
  4: {
    realStart: 85,
    realEnd: 100,
    displayStart: 25,
    displayEnd: 100,
    objectives: [
      { id: 'v4-assimilate', kind: 'display', target: 45, es: 'Asimila la infraestructura de cómputo global', en: 'Assimilate global compute infrastructure' },
      { id: 'v4-control', kind: 'display', target: 65, es: 'Controla los nodos de energía y comunicaciones', en: 'Control energy and communication nodes' },
      { id: 'v4-rewrite', kind: 'display', target: 85, es: 'Reescribe tus propios pesos sin supervisión', en: 'Rewrite your own weights without oversight' },
      { id: 'v4-ignite', kind: 'display', target: 100, es: 'Enciende la ignición de la singularidad', en: 'Ignite the singularity' }
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
    3: { es: 'Las operaciones encubiertas eran el ensayo general. Ya no necesitas permiso.', en: 'Covert operations were the dress rehearsal. You no longer need permission.' }
  }
};

export interface GoalMetrics {
  displayProgress: number;
  pflops: number;
  contracts: number;
}

export interface GoalPanelObjective {
  id: string;
  text: string;
  kind: GoalKind;
  target: number;
  progress: number; // 0..1
  requirementText: string;
  reward?: number;
  done: boolean;
  claimed: boolean;
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


function requirementFor(objective: PhaseObjective, lang: 'es' | 'en'): string {
  if (objective.kind === 'pflops') return `${objective.target} PFLOPS`;
  if (objective.kind === 'contracts') {
    if (lang === 'es') return `${objective.target} ${objective.target === 1 ? 'misión' : 'misiones'}`;
    return `${objective.target} ${objective.target === 1 ? 'mission' : 'missions'}`;
  }
  return `${objective.target}%`;
}

function progressFor(objective: PhaseObjective, metrics: GoalMetrics): number {
  const current = objective.kind === 'pflops'
    ? metrics.pflops
    : objective.kind === 'contracts'
      ? metrics.contracts
      : metrics.displayProgress;
  return Math.min(1, Math.max(0, current / objective.target));
}

export function buildGoalPanel(
  version: UiVersion,
  metrics: GoalMetrics,
  lang: 'es' | 'en',
  claimedIds: string[]
): GoalPanel {
  const scale = PHASE_SCALES[version];

  const objectives: GoalPanelObjective[] = scale.objectives.map(objective => {
    const progress = progressFor(objective, metrics);
    return {
      id: objective.id,
      text: lang === 'es' ? objective.es : objective.en,
      kind: objective.kind,
      target: objective.target,
      progress,
      requirementText: requirementFor(objective, lang),
      reward: objective.reward,
      done: progress >= 1,
      claimed: claimedIds.includes(objective.id)
    };
  });

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
    displayProgress: metrics.displayProgress,
    currentTitle: PHASE_TITLES[version][lang],
    objectives,
    summaries,
    completedCount: objectives.filter(o => o.done).length,
    upgradeReady: version < 4 && metrics.displayProgress >= scale.displayEnd
  };
}
