/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import type { TerminalLog } from '../types/game';

// Tick steps are pure: instead of writing to the terminal or playing sounds, they return effects that
// the game context applies in order. That keeps them testable outside React.

export type SoundName = 'warning' | 'breakthrough' | 'epochTick' | 'credit';

export type TickEffect =
  | { kind: 'log'; message: string; type: TerminalLog['type'] }
  | { kind: 'sound'; name: SoundName };

export function effectCollector() {
  const effects: TickEffect[] = [];
  return {
    effects,
    log: (message: string, type: TerminalLog['type'] = 'info') => {
      effects.push({ kind: 'log', message, type });
    },
    play: (name: SoundName) => {
      effects.push({ kind: 'sound', name });
    }
  };
}

export type Random = () => number;
