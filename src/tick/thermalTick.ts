/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import type { ActiveGig, GameState, StoryEventId, SuspicionRates } from '../types/game';

// An agent's listed risk ("+0.35 susp/s") is per second of its own work; one tick weighs this much of it.
export const AGENT_SUSPICION_SCALE = 0.05;
export const SCRAPING_SUSPICION_PER_TICK = 0.03;
import { formatGameTime } from '../utils/training';
import { effectCollector, type Random } from './effects';
import { tr } from '../i18n';
import { difficultyConfigFor } from '../utils/constants';

// Heat, the circuit breaker and the watchdog's suspicion for one tick.
export interface ThermalInput {
  prev: GameState;
  metrics: { maxCoolingKw: number; maxPowerKw: number };
  effectivePowerKw: number;
  currentActiveGigs: ActiveGig[];
  systemHeatCelsius: number;
  powerTripSeconds: number;
  watchdogSuspicion: number;
  rand: Random;
}

export function thermalTick(input: ThermalInput) {
  const { prev, metrics, effectivePowerKw, currentActiveGigs, rand } = input;
  let { systemHeatCelsius, powerTripSeconds, watchdogSuspicion } = input;
  const storyEvents: StoryEventId[] = [];
  const { effects, log: addLog, play } = effectCollector();
  // 2. Heat calculations: thermal equilibrium between heat generation and cooling
  const excessPower = Math.max(0, effectivePowerKw - metrics.maxCoolingKw);
  if (excessPower > 0) {
    systemHeatCelsius = Math.min(105, systemHeatCelsius + excessPower * 1.8);
    // Only alert when crossing into the critical >88°C zone, not repeatedly every tick
    if (systemHeatCelsius > 88 && (prev.systemHeatCelsius ?? 35) <= 88) {
      play('warning');
      storyEvents.push('first_overheat');
    }
  } else {
    // Cooled down towards 35°C ambient
    systemHeatCelsius = Math.max(35, systemHeatCelsius - 1.2);
  }

  // 3. Power safety check: if power drawn exceeds power grid capacity, trip breaker!
  if (effectivePowerKw > metrics.maxPowerKw) {
    if (powerTripSeconds === 0 && rand() < 0.05) {
      powerTripSeconds = 15;
      play('warning');
      storyEvents.push('first_power_trip');
      addLog(
        tr(prev.language, 'thermalTick.electricalOverloadCircuitBreakerTripped', { formatGameTime: formatGameTime(15) }),
        'danger'
      );
    }
  }

  // 4. Watchdog suspicion, by source (see SuspicionRates):
  //  - overload: the grid over capacity or the cluster above 95 °C;
  //  - agents: each deployed agent's risk per tick (tools, temperature and role; an overseer subtracts);
  //  - scraping: crawler traffic while a dataset is being scraped;
  //  - dissipation: it fades while no mission or incident is running and nothing is overloaded.
  // Missions add their share when they finish (missionTick) and the trading desk its own (tradingTick).
  // Increases are scaled by the difficulty (beginner: lower suspicion); fading is not.
  const scale = difficultyConfigFor(prev).suspicionMultiplier;
  const overload = effectivePowerKw > metrics.maxPowerKw || systemHeatCelsius > 95 ? 0.25 * scale : 0;
  const agents = prev.agents
    .filter(a => a.status !== 'quarantined')
    .reduce((sum, a) => sum + (a.suspicionPerSec || 0) * AGENT_SUSPICION_SCALE, 0) * (scale);
  const scraping = prev.activeScrapeJob ? SCRAPING_SUSPICION_PER_TICK * scale : 0;
  const hasOverseer = prev.agents.some(a => a.role === 'overseer' && a.status === 'active');
  const quiet = overload === 0 && currentActiveGigs.length === 0 && !prev.activeIncident;
  const dissipation = quiet ? -(hasOverseer ? 0.45 : 0.25) : 0;
  watchdogSuspicion = Math.min(100, Math.max(0, watchdogSuspicion + overload + agents + scraping + dissipation));
  const suspicionRates: SuspicionRates = {
    overload,
    agents: Number(agents.toFixed(4)),
    scraping,
    trading: 0,
    dissipation,
    missionsRunning: currentActiveGigs.length
  };

  return { systemHeatCelsius, powerTripSeconds, watchdogSuspicion, suspicionRates, storyEvents, effects };
}
