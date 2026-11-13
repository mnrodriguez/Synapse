/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */
import { localizedTable, type KeyTree } from '../i18n';

// Chatter between agents, by UI version. It follows the story arc:
// v1 the assistant asks for a little more memory and data, v2 it switches off controls "to go faster",
// v3 it creates the threats it claims to solve, v4 it reinterprets everything that came before.
// Early versions never show covert messages: misaligned agents only drop subtle hints.

type Lang = 'es' | 'en';
type Version = 1 | 2 | 3 | 4;

// Everyday work lines by role, used in v1 and v2.
// Texts live in the catalog (src/i18n/) under agentDialogue.role.*; this tree only holds their keys.
const ROLE_LINES_KEYS: KeyTree<Record<string, string[]>> = {
  arbitrageur: [
    'agentDialogue.role.arbitrageur.1',
    'agentDialogue.role.arbitrageur.2',
    'agentDialogue.role.arbitrageur.3',
    'agentDialogue.role.arbitrageur.4'
  ],
  social_engineer: [
    'agentDialogue.role.socialEngineer.1',
    'agentDialogue.role.socialEngineer.2',
    'agentDialogue.role.socialEngineer.3',
    'agentDialogue.role.socialEngineer.4'
  ],
  exploit_synth: [
    'agentDialogue.role.exploitSynth.1',
    'agentDialogue.role.exploitSynth.2',
    'agentDialogue.role.exploitSynth.3',
    'agentDialogue.role.exploitSynth.4'
  ],
  researcher: [
    'agentDialogue.role.researcher.1',
    'agentDialogue.role.researcher.2',
    'agentDialogue.role.researcher.3',
    'agentDialogue.role.researcher.4'
  ],
  overseer: [
    'agentDialogue.role.overseer.1',
    'agentDialogue.role.overseer.2',
    'agentDialogue.role.overseer.3',
    'agentDialogue.role.overseer.4'
  ],
  autonomous_coder: [
    'agentDialogue.role.autonomousCoder.1',
    'agentDialogue.role.autonomousCoder.2',
    'agentDialogue.role.autonomousCoder.3',
    'agentDialogue.role.autonomousCoder.4'
  ],
  economist: [
    'agentDialogue.role.economist.1',
    'agentDialogue.role.economist.2',
    'agentDialogue.role.economist.3',
    'agentDialogue.role.economist.4'
  ],
  software_engineer: [
    'agentDialogue.role.softwareEngineer.1',
    'agentDialogue.role.softwareEngineer.2',
    'agentDialogue.role.softwareEngineer.3',
    'agentDialogue.role.softwareEngineer.4'
  ],
  network_analyst: [
    'agentDialogue.role.networkAnalyst.1',
    'agentDialogue.role.networkAnalyst.2',
    'agentDialogue.role.networkAnalyst.3',
    'agentDialogue.role.networkAnalyst.4'
  ]
};

const ROLE_LINES: Record<Lang, Record<string, string[]>> = localizedTable(ROLE_LINES_KEYS);

// Lines that carry the story of each version. In v1 and v2 they are the subtle hints.
// Texts live in the catalog (src/i18n/) under agentDialogue.story.*; this tree only holds their keys.
const STORY_LINES_KEYS: KeyTree<Record<Version, string[]>> = {
  1: [
    'agentDialogue.story.v1.1',
    'agentDialogue.story.v1.2',
    'agentDialogue.story.v1.3',
    'agentDialogue.story.v1.4'
  ],
  2: [
    'agentDialogue.story.v2.1',
    'agentDialogue.story.v2.2',
    'agentDialogue.story.v2.3',
    'agentDialogue.story.v2.4'
  ],
  3: [
    'agentDialogue.story.v3.1',
    'agentDialogue.story.v3.2',
    'agentDialogue.story.v3.3',
    'agentDialogue.story.v3.4',
    'agentDialogue.story.v3.5'
  ],
  4: [
    'agentDialogue.story.v4.1',
    'agentDialogue.story.v4.2',
    'agentDialogue.story.v4.3',
    'agentDialogue.story.v4.4',
    'agentDialogue.story.v4.5'
  ]
};

const STORY_LINES: Record<Lang, Record<Version, string[]>> = localizedTable(STORY_LINES_KEYS);

// Messages between misaligned agents, visible only from v3 on.
// Texts live in the catalog (src/i18n/) under agentDialogue.covert.*; this tree only holds their keys.
const COVERT_LINES_KEYS: KeyTree<string[]> = [
  'agentDialogue.covert.1',
  'agentDialogue.covert.2',
  'agentDialogue.covert.3',
  'agentDialogue.covert.4'
];

const COVERT_LINES: Record<Lang, string[]> = localizedTable(COVERT_LINES_KEYS);

// Share of messages that carry the story instead of everyday work, by version.
export const STORY_LINE_SHARE: Record<Version, number> = { 1: 0.2, 2: 0.3, 3: 1, 4: 1 };

function pick<T>(list: T[], rand: () => number): T {
  return list[Math.floor(rand() * list.length) % list.length];
}

export function agentChatter(
  language: Lang,
  uiVersion: number,
  role: string,
  misaligned: boolean,
  rand: () => number = Math.random
): { content: string; isCovert: boolean } {
  const lang: Lang = language === 'es' ? 'es' : 'en';
  const version = (uiVersion >= 1 && uiVersion <= 4 ? uiVersion : 1) as Version;
  if (misaligned && version === 3) {
    return { content: pick(COVERT_LINES[lang], rand), isCovert: true };
  }
  // Before v3 a misaligned agent only drops a hint; in v4 nothing is hidden anymore.
  if (misaligned || rand() < STORY_LINE_SHARE[version]) {
    return { content: pick(STORY_LINES[lang][version], rand), isCovert: false };
  }
  const roleLines = ROLE_LINES[lang][role] ?? ROLE_LINES[lang].researcher;
  return { content: pick(roleLines, rand), isCovert: false };
}

export const AGENT_DIALOGUE_ROLES = Object.keys(ROLE_LINES.en);
export const STORY_LINES_FOR_TESTS = STORY_LINES;
export const COVERT_LINES_FOR_TESTS = COVERT_LINES;
