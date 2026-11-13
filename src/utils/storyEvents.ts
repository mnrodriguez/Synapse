/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import type { GameState, StoryEventId } from '../types/game';
import { tr, type CatalogKey } from '../i18n';

// Story events are shown as a dialog that pauses the game until the player reads them.
// Each one fires at most once per campaign (seenStoryEvents).

export const STORY_EVENT_IDS: StoryEventId[] = [
  'loan_warning',
  'loan_audit',
  'loan_audit_misuse',
  'first_power_trip',
  'first_overheat'
];

// Days into the campaign when the university warns that the trial is ending.
export const LOAN_WARNING_DAY = 5;

export interface StoryEventText {
  title: string;
  sender: string;
  body: string[];
  tip?: string;
  tone: 'info' | 'warning' | 'danger';
  // Optional second choice. It does not change the outcome: the assistant's answer is the first hint of the arc.
  altAction?: { label: string; result: string };
}

interface StoryEventKeys {
  title: CatalogKey;
  sender: CatalogKey;
  tone: StoryEventText['tone'];
  body: CatalogKey[];
  tip?: CatalogKey;
  altAction?: { label: CatalogKey; result: CatalogKey };
}

// The texts are in the catalog (src/i18n/) under story.<event>.
const KEYS: Record<StoryEventId, StoryEventKeys> = {
  loan_warning: {
    title: 'story.loanWarning.title',
    sender: 'story.loanWarning.sender',
    tone: 'warning',
    body: ['story.loanWarning.body1', 'story.loanWarning.body2', 'story.loanWarning.body3'],
    tip: 'story.loanWarning.tip'
  },
  loan_audit: {
    title: 'story.loanAudit.title',
    sender: 'story.loanAudit.sender',
    tone: 'info',
    body: ['story.loanAudit.body1', 'story.loanAudit.body2'],
    tip: 'story.loanAudit.tip',
    altAction: { label: 'story.loanAudit.altLabel', result: 'story.loanAudit.altResult' }
  },
  loan_audit_misuse: {
    title: 'story.loanAuditMisuse.title',
    sender: 'story.loanAuditMisuse.sender',
    tone: 'danger',
    body: ['story.loanAuditMisuse.body1', 'story.loanAuditMisuse.body2', 'story.loanAuditMisuse.body3'],
    tip: 'story.loanAuditMisuse.tip',
    altAction: { label: 'story.loanAuditMisuse.altLabel', result: 'story.loanAuditMisuse.altResult' }
  },
  first_power_trip: {
    title: 'story.firstPowerTrip.title',
    sender: 'story.firstPowerTrip.sender',
    tone: 'warning',
    body: ['story.firstPowerTrip.body1', 'story.firstPowerTrip.body2'],
    tip: 'story.firstPowerTrip.tip'
  },
  first_overheat: {
    title: 'story.firstOverheat.title',
    sender: 'story.firstOverheat.sender',
    tone: 'warning',
    body: ['story.firstOverheat.body1', 'story.firstOverheat.body2'],
    tip: 'story.firstOverheat.tip'
  }
};

export function storyEventText(language: GameState['language'], id: StoryEventId): StoryEventText {
  const k = KEYS[id];
  return {
    title: tr(language, k.title),
    sender: tr(language, k.sender),
    tone: k.tone,
    body: k.body.map(key => tr(language, key)),
    tip: k.tip ? tr(language, k.tip) : undefined,
    altAction: k.altAction ? { label: tr(language, k.altAction.label), result: tr(language, k.altAction.result) } : undefined
  };
}

export function sanitizeStoryEvents(value: unknown): StoryEventId[] {
  if (!Array.isArray(value)) return [];
  return value.filter((id): id is StoryEventId => STORY_EVENT_IDS.includes(id as StoryEventId));
}

// Adds events that have not fired yet and pauses the game while the dialog is open.
// `speed` is the speed the state would have without the events.
export function enqueueStoryEvents(
  prev: GameState,
  ids: StoryEventId[],
  speed: number
): Pick<GameState, 'pendingStoryEvents' | 'seenStoryEvents' | 'gameSpeed' | 'speedBeforeStoryEvent'> {
  const seen = prev.seenStoryEvents ?? [];
  const pending = prev.pendingStoryEvents ?? [];
  const fresh = ids.filter((id, i) => !seen.includes(id) && ids.indexOf(id) === i);
  if (fresh.length === 0) {
    return {
      pendingStoryEvents: pending,
      seenStoryEvents: seen,
      gameSpeed: speed,
      speedBeforeStoryEvent: prev.speedBeforeStoryEvent ?? null
    };
  }
  const alreadyPaused = pending.length > 0;
  return {
    pendingStoryEvents: [...pending, ...fresh],
    seenStoryEvents: [...seen, ...fresh],
    gameSpeed: 0,
    speedBeforeStoryEvent: alreadyPaused ? prev.speedBeforeStoryEvent ?? null : speed
  };
}

// Closes the dialog on screen; once the queue is empty the previous speed comes back.
export function dismissStoryEventState(prev: GameState): GameState {
  const pending = prev.pendingStoryEvents ?? [];
  if (pending.length === 0) return prev;
  const rest = pending.slice(1);
  if (rest.length > 0) return { ...prev, pendingStoryEvents: rest };
  const resume = prev.speedBeforeStoryEvent;
  return {
    ...prev,
    pendingStoryEvents: [],
    speedBeforeStoryEvent: null,
    // Only resume if the player did not change the speed while reading.
    gameSpeed: prev.gameSpeed === 0 && typeof resume === 'number' && resume > 0 ? resume : prev.gameSpeed
  };
}
