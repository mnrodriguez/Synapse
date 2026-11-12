/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import type { ContractGig } from '../types/game';

// Each UI version offers the missions of its own tier, so the board only shows what fits the story stage.
const TIER_BY_UI_VERSION: Record<number, ContractGig['tier']> = {
  1: 'tier1_micro',
  2: 'tier2_corporate',
  3: 'tier3_blackops',
  4: 'tier4_singularity'
};

export function tierForUiVersion(uiVersion: number): ContractGig['tier'] {
  return TIER_BY_UI_VERSION[uiVersion] ?? 'tier1_micro';
}

// Lowest reasoning IQ among the open missions of the current UI version, or null if there are none.
export function lowestOpenIqForVersion(contracts: ContractGig[], uiVersion: number): number | null {
  const tier = tierForUiVersion(uiVersion);
  const open = contracts.filter(c => !c.completed && c.tier === tier);
  if (open.length === 0) return null;
  return Math.min(...open.map(c => c.requiredMinReasoning));
}

// Reasoning IQ the first model needs before the first mission can be run with a deployed agent.
export const FIRST_MISSION_IQ = 10;

// Evaluation score the active model needs to unlock each UI version upgrade (with the singularity progress).
export const UPGRADE_SCORE: Record<2 | 3 | 4, number> = { 2: 28, 3: 42, 4: 50 };

// Evaluation score a general model needs to unlock the data scraping module.
export const DATA_SCRAPING_MIN_SCORE = 20;

// Singularity progress budget (docs/GAME_REVIEW_PLAN.md, P0-8). The v1 stage needs 25 points: about 9 from
// training gains, 10 from missions, and the rest from papers, data engines and new hardware. Later tiers
// pay more per mission, so each stage keeps a similar mix.
export const SINGULARITY_PER_SCORE_POINT = 0.4; // per evaluation point a training run actually gained
export const MISSION_SINGULARITY: Record<ContractGig['tier'], number> = {
  tier1_micro: 1.25,
  tier2_corporate: 2,
  tier3_blackops: 2.5,
  tier4_singularity: 3
};
export const NEW_GPU_SINGULARITY = 0.5; // first unit of each GPU model
