/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import type { ActiveGig, GameState } from '../types/game';
import { AGENT_COMPUTE_DEMAND_PFLOPS } from './constants';
import { COMPUTE } from './rules';
import { externalComputePflops, gpuComputePflops } from './training';

// One account of the cluster's compute, read by the tick, the contract board, the HUD and the hardware
// tab, so they all agree. Agents and running contracts take their share first; training gets the rest.

// Compute a team uses while it works on a contract: each agent runs its own model.
export const missionComputePflops = (teamModels: Array<{ parametersCount: number }>): number =>
  teamModels.reduce(
    (sum, model) => sum + Math.max(COMPUTE.missionAgentMinPflops, (model.parametersCount / 1_000_000_000) * COMPUTE.missionPflopsPerBillionParams),
    0
  );

export const missionPowerKw = (computePflops: number): number =>
  Math.max(COMPUTE.missionMinKw, computePflops * COMPUTE.missionKwPerPflops);

export interface ComputeLedger {
  total: number;        // installed GPUs + external compute + temporary borrowed compute
  agents: number;       // standby cost of every agent that is not quarantined
  missions: number;     // all running contracts
  autonomous: number;   // the part of `missions` started by the autonomous bots
  used: number;         // agents + missions (never more than total)
  free: number;         // what a new contract can take; training gives way
  training: number;     // what the active training run gets (0 when no run is active)
  trainingShare: number; // training / total, 0 to 1: how much of the cluster the run has
}

type LedgerState = Pick<GameState, 'hardware' | 'agents' | 'activeTraining'> & Partial<Pick<GameState, 'activeGigs' | 'activeGig' | 'borrowedComputePflops' | 'borrowedComputeSeconds'>> & Parameters<typeof externalComputePflops>[0];

export const runningGigs = (state: Pick<LedgerState, 'activeGigs' | 'activeGig'>): ActiveGig[] =>
  state.activeGigs ?? (state.activeGig ? [state.activeGig] : []);

export function computeLedger(state: LedgerState, gigs: ActiveGig[] = runningGigs(state)): ComputeLedger {
  const borrowed = (state.borrowedComputeSeconds ?? 0) > 0 ? state.borrowedComputePflops ?? 0 : 0;
  const total = Math.max(0, gpuComputePflops(state.hardware) + externalComputePflops(state) + borrowed);
  const agents = state.agents.filter(agent => agent.status !== 'quarantined').length * AGENT_COMPUTE_DEMAND_PFLOPS;
  const missions = gigs.reduce((sum, gig) => sum + (gig.computePflopsRequired || 0), 0);
  const autonomous = gigs.reduce((sum, gig) => sum + (gig.isAutonomous ? gig.computePflopsRequired || 0 : 0), 0);
  const used = Math.min(total, agents + missions);
  const free = Math.max(0, total - agents - missions);
  const training = state.activeTraining ? free : 0;
  return { total, agents, missions, autonomous, used, free, training, trainingShare: total > 0 ? training / total : 0 };
}

// How much slower the active training run gets if `extraPflops` more are taken (0 to 1).
export const trainingSlowdown = (ledger: ComputeLedger, extraPflops: number): number =>
  ledger.training > 0 ? Math.min(1, Math.max(0, extraPflops) / ledger.training) : 0;
