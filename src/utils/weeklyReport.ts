/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import type { GameState, ResearchNode, SuspicionSources, WeekStats, WeeklyReport } from '../types/game';
import { FACILITY_TIERS, INITIAL_DATA_SOURCES, INITIAL_HARDWARE } from './constants';
import { getModelOptionRequirement, researchStatus } from './progression';
import { RESEARCH_PER_WEEK, WEEK_DAYS } from './rules';

// The weekly report: every game week the game pauses and says what happened (where suspicion came from,
// what was earned) and which papers can be funded from now on. Papers arrive a few per week instead of
// all at once, so each new option gets noticed.

export const emptySources = (): SuspicionSources => ({ agents: 0, missions: 0, overload: 0, scraping: 0, trading: 0, faded: 0 });

export const emptyWeek = (suspicion = 0): WeekStats =>
  ({ startSuspicion: suspicion, sources: emptySources(), creditsEarned: 0, missionsOk: 0, missionsFailed: 0 });

export function addSources(a: SuspicionSources | undefined, b: Partial<SuspicionSources>): SuspicionSources {
  const base = { ...emptySources(), ...(a ?? {}) };
  for (const key of Object.keys(b) as Array<keyof SuspicionSources>) base[key] = Number((base[key] + (b[key] ?? 0)).toFixed(4));
  return base;
}

export function sanitizeSources(value: unknown): SuspicionSources {
  const v = (value && typeof value === 'object' ? value : {}) as Partial<SuspicionSources>;
  const out = emptySources();
  for (const key of Object.keys(out) as Array<keyof SuspicionSources>) {
    const n = v[key];
    out[key] = typeof n === 'number' && Number.isFinite(n) ? Math.max(0, n) : 0;
  }
  return out;
}

// The source that added the most, or null when nothing did.
export function topSource(sources: SuspicionSources): Exclude<keyof SuspicionSources, 'faded'> | null {
  const keys = ['agents', 'missions', 'overload', 'scraping', 'trading'] as const;
  const best = [...keys].sort((a, b) => sources[b] - sources[a])[0];
  return sources[best] > 0.05 ? best : null;
}

type ResearchState = Pick<GameState, 'uiVersion' | 'savedModels' | 'currentModel' | 'researchTree'> & Partial<Pick<GameState, 'announcedResearchIds'>>;

// Papers that meet version, score and prerequisites but have not been announced yet, cheapest first.
export function researchWaiting(state: ResearchState): ResearchNode[] {
  const announced = state.announcedResearchIds ?? [];
  return state.researchTree
    .filter(node => !node.unlocked && !announced.includes(node.id))
    .filter(node => {
      const status = researchStatus(node, { ...state, announcedResearchIds: undefined });
      return status.versionMet && status.scoreMet && status.prerequisitesMet;
    })
    .sort((a, b) => a.costCredits - b.costCredits);
}

// A new campaign starts with its first paper on the table. An older save keeps everything it could
// already fund.
export const initialAnnouncedResearch = (state: ResearchState): string[] =>
  researchWaiting({ ...state, announcedResearchIds: [] }).slice(0, 1).map(node => node.id);

export const migratedAnnouncedResearch = (state: ResearchState): string[] => [
  ...state.researchTree.filter(node => node.unlocked).map(node => node.id),
  ...researchWaiting({ ...state, announcedResearchIds: [] }).map(node => node.id)
];

export const isWeekEnd = (campaignDays: number, dayIsComplete: boolean): boolean =>
  dayIsComplete && campaignDays > 0 && campaignDays % WEEK_DAYS === 0;

// Closes the week: builds the report, announces up to RESEARCH_PER_WEEK new papers and starts a new week.
export function closeWeek(state: ResearchState & Pick<GameState, 'campaignDays' | 'watchdogSuspicion'> & Partial<Pick<GameState, 'weekStats'>>): {
  report: WeeklyReport;
  announcedResearchIds: string[];
  weekStats: WeekStats;
} {
  const week = state.weekStats ?? emptyWeek(state.watchdogSuspicion);
  const waiting = researchWaiting(state);
  const arriving = waiting.slice(0, RESEARCH_PER_WEEK);
  const s = week.sources;
  const tracked = s.agents + s.missions + s.overload + s.scraping + s.trading - s.faded;
  const report: WeeklyReport = {
    week: Math.round(state.campaignDays / WEEK_DAYS),
    newResearchIds: arriving.map(node => node.id),
    waitingResearch: waiting.length - arriving.length,
    suspicionStart: Number(week.startSuspicion.toFixed(1)),
    suspicionEnd: Number(state.watchdogSuspicion.toFixed(1)),
    sources: s,
    other: Number((state.watchdogSuspicion - week.startSuspicion - tracked).toFixed(1)),
    creditsEarned: Math.round(week.creditsEarned),
    missionsOk: week.missionsOk,
    missionsFailed: week.missionsFailed
  };
  return {
    report,
    announcedResearchIds: [...(state.announcedResearchIds ?? []), ...report.newResearchIds],
    weekStats: emptyWeek(state.watchdogSuspicion)
  };
}

// What funding a paper opens, by kind, so the report and the paper card can say it in plain words.
export interface ResearchUnlocks {
  hardware: string[];   // hardware ids
  dataSources: string[];
  facilities: string[];
  modelSizes: number[];
  modelOptions: string[]; // topology, precision, attention, objective and context values
}

const SIZES = [70e6, 250e6, 500e6, 1.5e9, 7e9, 25e9, 70e9, 200e9, 405e9, 500e9];
const OPTIONS: Array<[Parameters<typeof getModelOptionRequirement>[0], Array<string | number>]> = [
  ['topology', ['gnn_hybrid', 'moe', 'mamba_ssm', 'multimodal_diffusion']],
  ['quantization', ['bf16', 'fp4', 'ternary_1bit']],
  ['attention', ['grouped_query_gqa', 'flash_attention_3', 'linear_attention']],
  ['lossFunction', ['dpo', 'ppo_rlhf', 'contrastive_infonce', 'energy_based']],
  ['contextWindow', [8192, 32768, 128000, 1000000]]
];

export function researchUnlocks(researchId: string): ResearchUnlocks {
  const needs = (item: { requiredResearchId?: string }) => item.requiredResearchId === researchId;
  return {
    hardware: INITIAL_HARDWARE.filter(needs).map(h => h.id),
    dataSources: INITIAL_DATA_SOURCES.filter(needs).map(d => d.id),
    facilities: FACILITY_TIERS.filter(needs).map(f => f.id),
    modelSizes: SIZES.filter(size => getModelOptionRequirement('parametersCount', size).requiredResearchId === researchId),
    modelOptions: OPTIONS.flatMap(([field, values]) =>
      values.filter(value => getModelOptionRequirement(field, value as never).requiredResearchId === researchId).map(value => `${field}:${value}`))
  };
}

export const countUnlocks = (u: ResearchUnlocks): number =>
  u.hardware.length + u.dataSources.length + u.facilities.length + u.modelSizes.length + u.modelOptions.length;
