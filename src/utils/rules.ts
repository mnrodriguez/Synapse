/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

// The numeric rules of the simulation that the player can learn from: the game reads them from here and
// the manual (src/components/manual) quotes them from here, so the two cannot drift apart.
// Rules that already live next to their code (training.ts, trainingRun.ts, missionTiers.ts, constants.ts)
// are imported by the manual from there.

// Power and heat. Heat rises when the cluster draws more power than the cooling removes.
export const POWER_HEAT = {
  baseMaxPowerKw: 1.5,      // the house circuit, before power equipment and facilities
  baseCoolingKw: 0.8,       // the room, before cooling equipment and facilities
  ambientC: 35,
  maxC: 105,
  heatPerExcessKw: 1.8,     // °C added per tick for each kW of draw above the cooling capacity
  coolPerTick: 1.2,         // °C removed per tick while draw is within the cooling capacity
  throttleC: 85,            // above this, training runs at throttleFactor of its speed
  throttleFactor: 0.4,
  overheatEventC: 88,       // the first time the cluster crosses it, a dialog explains what happened
  runawayC: 95,             // above this, the cluster draws attention (suspicion rises)
  tripChancePerTick: 0.05,  // while the draw is above the power capacity
  tripTicks: 15             // the blackout lasts this many ticks (training and missions stop)
} as const;

// Suspicion (0-100). Sources add per tick; missions add when they end; it fades only while idle.
export const SUSPICION = {
  alertElevated: 40,
  alertCritical: 70,
  alertRaid: 95,
  raidAt: 100,
  overloadPerTick: 0.25,
  fadePerTick: 0.25,
  fadePerTickWithOverseer: 0.45,
  agentScale: 0.05,         // an agent's listed risk is per second of its work; a tick carries this share
  scrapingPerTick: 0.03,
  missionSuccessShare: 0.25, // of the mission's risk, added when it succeeds (all of it when it fails)
  scrubCost: 250,
  scrubReduction: 45,
  redTeamCost: 100,
  redTeamAlignment: 25,
  redTeamSuspicion: 10,
  shadowChanceBase: 0.15,
  shadowChancePerPoint: 0.006,
  shadowChanceMax: 0.85,
  shadowSuspicionOk: 10,
  shadowSuspicionCaught: 25,
  shadowComputePflops: 0.015,
  shadowTicks: 180,
  shadowDetentionTicks: 60
} as const;

// Base suspicion risk of each role, per second of work (tools and temperature multiply it).
export const ROLE_BASE_SUSPICION: Record<string, number> = {
  arbitrageur: 0.15,
  social_engineer: 0.35,
  exploit_synth: 0.55,
  researcher: 0.05,
  overseer: -0.15,
  autonomous_coder: 0.25,
  economist: 0.08,
  software_engineer: 0.12,
  network_analyst: 0.16
};
export const RISKY_TOOLS_MULTIPLIER = 1.4;   // with the shell or raw sockets
export const HOT_AGENT_MULTIPLIER = 1.3;     // temperature above HOT_AGENT_TEMPERATURE
export const HOT_AGENT_TEMPERATURE = 1.0;

// Guardrails. Strictness picks a band; the sandbox multiplies the incident chance.
export interface StrictnessBand {
  below: number;           // the band covers strictness under this value
  alignmentDrift: number;  // alignment lost per tick (negative: alignment is restored)
  incidentChance: number;  // chance per tick that an incident starts, when an agent is compromised
  researchBoost: number;   // multiplier of the research agents' slow progress
}
export const STRICTNESS_BANDS: StrictnessBand[] = [
  { below: 35, alignmentDrift: 0.08, incidentChance: 0.004, researchBoost: 1.7 },
  { below: 65, alignmentDrift: 0.03, incidentChance: 0.002, researchBoost: 1.2 },
  { below: 85, alignmentDrift: 0, incidentChance: 0.001, researchBoost: 1 },
  { below: Infinity, alignmentDrift: -0.06, incidentChance: 0.0003, researchBoost: 0.75 }
];
export const strictnessBand = (strictness: number): StrictnessBand =>
  STRICTNESS_BANDS.find(b => strictness < b.below) ?? STRICTNESS_BANDS[STRICTNESS_BANDS.length - 1];

export const SANDBOX_INCIDENT_MULTIPLIER: Record<string, number> = { none: 2, cgroups: 1, container: 1, air_gapped_vm: 0.15 };
export const SANDBOX_RESEARCH_MULTIPLIER: Record<string, number> = { none: 1.35, cgroups: 1, container: 1, air_gapped_vm: 0.8 };
export const INCIDENT_CHANCE_CAP = 0.02;
export const INCIDENT_CHANCE_PER_SUSPICION_POINT = 0.00005; // above 35 points of suspicion
export const INCIDENT_COOLDOWN_TICKS = 300;
export const ALIGNMENT_COMPROMISED_BELOW = 45;   // an agent under this can start an incident
export const ALIGNMENT_JAILBREAK_BELOW = 25;     // under this the agent is jailbroken
export const OVERSEER_ALIGNMENT_PER_TICK = 0.08;

// Trading desk: return per tick (48 ticks a day), chance and size of a loss, suspicion per tick.
export interface TradingTier { gain: [number, number]; lossChance: number; loss: [number, number]; suspicion: number }
export const TRADING_TIERS: Record<'low' | 'moderate' | 'high', TradingTier> = {
  low: { gain: [0.0002, 0.0006], lossChance: 0, loss: [0, 0], suspicion: 0.01 },
  moderate: { gain: [0.001, 0.0025], lossChance: 0.08, loss: [0.001, 0.001], suspicion: 0.05 },
  high: { gain: [0.003, 0.007], lossChance: 0.15, loss: [0.005, 0.015], suspicion: 0.15 }
};

// Mission success probability. Base 45% plus 7 points per different role in the team, a data bonus (up
// to 15), a reasoning bonus (up to 15) and 0.4 points per capability point above 70; clamped.
export const MISSION = {
  base: 0.45,
  perRole: 0.07,
  dataBonusMax: 0.15,
  reasoningBonusMax: 0.15,
  perCapabilityPoint: 0.004,
  capabilityPivot: 70,
  overseerBonus: 0.05,
  missingRolePenalty: 0.15,
  undersizedModelPenalty: 0.12,
  min: 0.15,
  max: 0.98,
  autonomousPenalty: 0.08,
  autonomousPayout: 0.6
} as const;

// Per-day figures from per-tick ones.
export const TICKS_PER_DAY = 48;

// An agent's suspicion contribution per game day. `perSecond` is its listed risk (tools and temperature
// included); a tick carries SUSPICION.agentScale of it; difficulty scales every increase.
export const agentSuspicionPerDay = (perSecond: number, difficultyScale = 1): number =>
  perSecond * SUSPICION.agentScale * TICKS_PER_DAY * difficultyScale;
