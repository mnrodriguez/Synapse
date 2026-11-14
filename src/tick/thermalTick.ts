/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import type { ActiveGig, GameState, StoryEventId, SuspicionRates } from '../types/game';

import { formatGameTime } from '../utils/training';
import { effectCollector, type Random } from './effects';
import { tr } from '../i18n';
import { difficultyConfigFor } from '../utils/constants';
import { POWER_HEAT, SUSPICION } from '../utils/rules';

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
    systemHeatCelsius = Math.min(POWER_HEAT.maxC, systemHeatCelsius + excessPower * POWER_HEAT.heatPerExcessKw);
    // Only alert when crossing into the critical >88°C zone, not repeatedly every tick
    if (systemHeatCelsius > POWER_HEAT.overheatEventC && (prev.systemHeatCelsius ?? POWER_HEAT.ambientC) <= POWER_HEAT.overheatEventC) {
      play('warning');
      storyEvents.push('first_overheat');
    }
  } else {
    // Cooled down towards 35°C ambient
    systemHeatCelsius = Math.max(POWER_HEAT.ambientC, systemHeatCelsius - POWER_HEAT.coolPerTick);
  }

  // 3. Power safety check: if power drawn exceeds power grid capacity, trip breaker!
  if (effectivePowerKw > metrics.maxPowerKw) {
    if (powerTripSeconds === 0 && rand() < POWER_HEAT.tripChancePerTick) {
      powerTripSeconds = POWER_HEAT.tripTicks;
      play('warning');
      storyEvents.push('first_power_trip');
      addLog(
        tr(prev.language, 'thermalTick.electricalOverloadCircuitBreakerTripped', { formatGameTime: formatGameTime(POWER_HEAT.tripTicks) }),
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
  const overload = effectivePowerKw > metrics.maxPowerKw || systemHeatCelsius > POWER_HEAT.runawayC ? SUSPICION.overloadPerTick * scale : 0;
  const agents = prev.agents
    .filter(a => a.status !== 'quarantined')
    .reduce((sum, a) => sum + (a.suspicionPerSec || 0) * SUSPICION.agentScale, 0) * (scale);
  const scraping = prev.activeScrapeJob ? SUSPICION.scrapingPerTick * scale : 0;
  const hasOverseer = prev.agents.some(a => a.role === 'overseer' && a.status === 'active');
  const quiet = overload === 0 && currentActiveGigs.length === 0 && !prev.activeIncident;
  const dissipation = quiet ? -(hasOverseer ? SUSPICION.fadePerTickWithOverseer : SUSPICION.fadePerTick) : 0;
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
