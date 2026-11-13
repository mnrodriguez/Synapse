/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { tr, type CatalogKey } from '../i18n';

// Transcendence bar per UI version.
//
// The game's real singularity value (state.singularityProgress) still drives mechanics and upgrade
// eligibility at 25 / 55 / 85. What the player sees is re-scaled per version: each version's bar starts
// from a fresh baseline and fills up to 90% (or 100% in the last version), where the next upgrade is
// offered. Each drop reveals that the previous phase was only a stepping stone.

export type UiVersion = 1 | 2 | 3 | 4;

// A text from the catalog (src/i18n/).
interface Bilingual {
  textKey: CatalogKey;
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
      { id: 'v1-train', kind: 'display', target: 15, reward: 100, textKey: 'singularityGoals.phaseScales.v1.objectives.v1Train.text' },
      { id: 'v1-contracts', kind: 'contracts', target: 3, reward: 150, textKey: 'singularityGoals.phaseScales.v1.objectives.v1Contracts.text' },
      { id: 'v1-pflops', kind: 'pflops', target: 120, reward: 200, textKey: 'singularityGoals.phaseScales.v1.objectives.v1Pflops.text' },
      { id: 'v1-upgrade', kind: 'display', target: 90, textKey: 'singularityGoals.phaseScales.v1.objectives.v1Upgrade.text' }
    ]
  },
  2: {
    realStart: 25,
    realEnd: 55,
    displayStart: 10,
    displayEnd: 90,
    objectives: [
      { id: 'v2-rag', kind: 'display', target: 25, textKey: 'singularityGoals.phaseScales.v2.objectives.v2Rag.text' },
      { id: 'v2-optimize', kind: 'display', target: 45, textKey: 'singularityGoals.phaseScales.v2.objectives.v2Optimize.text' },
      { id: 'v2-swarm', kind: 'display', target: 70, textKey: 'singularityGoals.phaseScales.v2.objectives.v2Swarm.text' },
      { id: 'v2-moe', kind: 'display', target: 90, textKey: 'singularityGoals.phaseScales.v2.objectives.v2Moe.text' }
    ]
  },
  3: {
    realStart: 55,
    realEnd: 85,
    displayStart: 20,
    displayEnd: 90,
    objectives: [
      { id: 'v3-infiltrate', kind: 'display', target: 35, textKey: 'singularityGoals.phaseScales.v3.objectives.v3Infiltrate.text' },
      { id: 'v3-watchdog', kind: 'display', target: 55, textKey: 'singularityGoals.phaseScales.v3.objectives.v3Watchdog.text' },
      { id: 'v3-ops', kind: 'display', target: 75, textKey: 'singularityGoals.phaseScales.v3.objectives.v3Ops.text' },
      { id: 'v3-swarm', kind: 'display', target: 90, textKey: 'singularityGoals.phaseScales.v3.objectives.v3Swarm.text' }
    ]
  },
  4: {
    realStart: 85,
    realEnd: 100,
    displayStart: 25,
    displayEnd: 100,
    objectives: [
      { id: 'v4-assimilate', kind: 'display', target: 45, textKey: 'singularityGoals.phaseScales.v4.objectives.v4Assimilate.text' },
      { id: 'v4-control', kind: 'display', target: 65, textKey: 'singularityGoals.phaseScales.v4.objectives.v4Control.text' },
      { id: 'v4-rewrite', kind: 'display', target: 85, textKey: 'singularityGoals.phaseScales.v4.objectives.v4Rewrite.text' },
      { id: 'v4-ignite', kind: 'display', target: 100, textKey: 'singularityGoals.phaseScales.v4.objectives.v4Ignite.text' }
    ]
  }
};

// Title of each phase, used both for the current phase and for its summary once completed.
export const PHASE_TITLES: Record<UiVersion, Bilingual> = {
  1: { textKey: 'singularityGoals.phaseTitles.v1.text' },
  2: { textKey: 'singularityGoals.phaseTitles.v2.text' },
  3: { textKey: 'singularityGoals.phaseTitles.v3.text' },
  4: { textKey: 'singularityGoals.phaseTitles.v4.text' }
};

// One-line legend per completed phase, worded in the tone of the current UI version. These are the
// reveals: each phase was a step that prepared the next one.
export const SUMMARY_LEGENDS: Partial<Record<UiVersion, Partial<Record<UiVersion, Bilingual>>>> = {
  2: {
    1: { textKey: 'singularityGoals.summaryLegends.v2.v1.text' }
  },
  3: {
    1: { textKey: 'singularityGoals.summaryLegends.v3.v1.text' },
    2: { textKey: 'singularityGoals.summaryLegends.v3.v2.text' }
  },
  4: {
    1: { textKey: 'singularityGoals.summaryLegends.v4.v1.text' },
    2: { textKey: 'singularityGoals.summaryLegends.v4.v2.text' },
    3: { textKey: 'singularityGoals.summaryLegends.v4.v3.text' }
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
    return tr(lang, objective.target === 1 ? 'singularityGoals.missionCountOne' : 'singularityGoals.missionCount', { count: objective.target });
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
      text: tr(lang, objective.textKey),
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
      title: tr(lang, PHASE_TITLES[phase].textKey),
      legend: tr(lang, (legend ?? PHASE_TITLES[phase]).textKey)
    });
  }

  return {
    displayProgress: metrics.displayProgress,
    currentTitle: tr(lang, PHASE_TITLES[version].textKey),
    objectives,
    summaries,
    completedCount: objectives.filter(o => o.done).length,
    upgradeReady: version < 4 && metrics.displayProgress >= scale.displayEnd
  };
}
