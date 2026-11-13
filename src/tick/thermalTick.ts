/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import type { ActiveGig, GameState, StoryEventId } from '../types/game';
import { formatGameTime } from '../utils/training';
import { effectCollector, type Random } from './effects';

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
        prev.language === 'en'
          ? `Electrical overload: circuit breaker tripped. Training and missions paused for ${formatGameTime(15)}.`
          : `Sobrecarga eléctrica: el interruptor de protección pausó entrenamiento y misiones durante ${formatGameTime(15)}.`,
        'danger'
      );
    }
  }

  // 4. Watchdog Suspicion:
  // Dissipates naturally when cluster is idle / quiet.
  // Only rises if facility grid capacity is overloaded or critical thermal runaway (>95°C)
  const hasOverseerEarly = prev.agents.some(a => a.role === 'overseer' && a.status === 'active');
  if (effectivePowerKw > metrics.maxPowerKw || systemHeatCelsius > 95) {
    watchdogSuspicion = Math.min(100, watchdogSuspicion + 0.25);
  } else if (currentActiveGigs.length === 0 && !prev.activeIncident) {
    // No active missions or incidents: suspicion dissipates towards 0%
    const dissipationRate = hasOverseerEarly ? 0.45 : 0.25;
    watchdogSuspicion = Math.max(0, watchdogSuspicion - dissipationRate);
  }


  return { systemHeatCelsius, powerTripSeconds, watchdogSuspicion, storyEvents, effects };
}
