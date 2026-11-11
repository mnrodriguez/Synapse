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
