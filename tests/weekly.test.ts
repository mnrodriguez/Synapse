// Weekly report: papers arrive a few per week, suspicion is counted by source, and early endings do not
// give the story away.
import './setup';
import { describe, expect, test } from 'bun:test';
import { DEFAULT_STATE, mergeGameState, SAVE_SCHEMA_VERSION } from '../src/persistence/saveState';
import { RESEARCH_PER_WEEK, SUSPICION, WEEK_DAYS } from '../src/utils/rules';
import { addSources, closeWeek, emptySources, emptyWeek, isWeekEnd, researchUnlocks, researchWaiting, topSource } from '../src/utils/weeklyReport';
import { researchStatus } from '../src/utils/progression';
import { buildEpilogue, endingTitle } from '../src/utils/epilogue';
import { storyEventText, STORY_EVENT_IDS } from '../src/utils/storyEvents';
import type { GameState } from '../src/types/game';

const state = (over: Partial<GameState> = {}): GameState => ({ ...DEFAULT_STATE, ...over });
const scored = (score: number, over: Partial<GameState> = {}) => state({ currentModel: { ...DEFAULT_STATE.currentModel, reasoningScore: score }, ...over });

describe('research arrives with the weekly report', () => {
  test('a new campaign starts with one paper on the table', () => {
    expect(DEFAULT_STATE.announcedResearchIds).toEqual(['res_bpe_tokenizer']);
    const first = DEFAULT_STATE.researchTree.find(n => n.id === 'res_bpe_tokenizer')!;
    expect(researchStatus(first, DEFAULT_STATE).available).toBe(true);
  });

  test('a paper that qualifies cannot be funded until a report announces it', () => {
    const s = scored(30, { researchTree: DEFAULT_STATE.researchTree.map(n => n.id === 'res_bpe_tokenizer' ? { ...n, unlocked: true } : n) });
    const lora = s.researchTree.find(n => n.id === 'res_lora_peft')!;
    const before = researchStatus(lora, s);
    expect(before.scoreMet && before.prerequisitesMet && before.versionMet).toBe(true);
    expect(before.announced).toBe(false);
    expect(before.available).toBe(false);
    const closed = closeWeek({ ...s, campaignDays: 7 });
    expect(researchStatus(lora, { ...s, announcedResearchIds: closed.announcedResearchIds }).available).toBe(true);
  });

  test('at most a few papers arrive per week, cheapest first, and the rest wait', () => {
    const s = scored(30, { researchTree: DEFAULT_STATE.researchTree.map(n => n.id === 'res_bpe_tokenizer' ? { ...n, unlocked: true } : n) });
    const waiting = researchWaiting(s);
    expect(waiting.length).toBeGreaterThan(RESEARCH_PER_WEEK);
    const closed = closeWeek({ ...s, campaignDays: 14 });
    expect(closed.report.week).toBe(2);
    expect(closed.report.newResearchIds).toEqual(waiting.slice(0, RESEARCH_PER_WEEK).map(n => n.id));
    expect(closed.report.waitingResearch).toBe(waiting.length - RESEARCH_PER_WEEK);
    const next = closeWeek({ ...s, campaignDays: 21, announcedResearchIds: closed.announcedResearchIds });
    expect(next.report.newResearchIds.some(id => closed.report.newResearchIds.includes(id))).toBe(false);
  });

  test('a week closes every seven completed days', () => {
    expect(isWeekEnd(WEEK_DAYS, true)).toBe(true);
    expect(isWeekEnd(WEEK_DAYS, false)).toBe(false);
    expect(isWeekEnd(WEEK_DAYS + 1, true)).toBe(false);
    expect(isWeekEnd(0, true)).toBe(false);
  });

  test('the report says what funding a paper opens', () => {
    const lora = researchUnlocks('res_lora_peft');
    expect(lora.modelSizes).toContain(70e6);
    expect(lora.hardware).toContain('gpu_rtx4090');
    expect(lora.dataSources).toContain('data_vector_rag');
    expect(researchUnlocks('res_bf16_training').modelOptions).toContain('quantization:bf16');
  });
});

describe('suspicion by source', () => {
  test('the report adds up the week and puts actions outside the tick under "other"', () => {
    const week = { ...emptyWeek(10), sources: addSources(emptySources(), { agents: 3, missions: 12, faded: 4 }), creditsEarned: 500, missionsOk: 3, missionsFailed: 1 };
    const { report, weekStats } = closeWeek({ ...state({ watchdogSuspicion: 31, campaignDays: 7 }), weekStats: week });
    expect(report.suspicionStart).toBe(10);
    expect(report.suspicionEnd).toBe(31);
    expect(report.other).toBe(10); // 31 - 10 - (3 + 12 - 4)
    expect(report.missionsFailed).toBe(1);
    expect(topSource(report.sources)).toBe('missions');
    expect(weekStats.startSuspicion).toBe(31);
    expect(weekStats.sources).toEqual(emptySources());
    expect(topSource(emptySources())).toBeNull();
  });
});

describe('early warnings and early endings', () => {
  test('the two suspicion dialogs exist in both languages and do not give the story away', () => {
    expect(SUSPICION.warnAt).toBeLessThan(SUSPICION.criticalAt);
    for (const id of ['suspicion_warning', 'suspicion_critical'] as const) {
      expect(STORY_EVENT_IDS).toContain(id);
      for (const lang of ['en', 'es'] as const) {
        const ev = storyEventText(lang, id);
        const text = [ev.title, ev.sender, ...ev.body, ev.tip ?? ''].join(' ').toLowerCase();
        expect(text.length).toBeGreaterThan(100);
        for (const word of ['singularit', 'swarm', 'enjambre', 'subver', 'takeover', 'operative', 'operativo']) expect(text).not.toContain(word);
      }
    }
  });

  test('before v3 the raid report does not name the end goal or the arc', () => {
    for (const lang of ['en', 'es'] as const) {
      for (const uiVersion of [1, 2] as const) {
        const s = state({ language: lang, uiVersion, seenStoryEvents: ['loan_audit'], storyChoices: ['loan_audit'] });
        const text = [endingTitle(s, 'agency_seizure').summary, ...buildEpilogue(s).flatMap(e => [e.title, e.choice, e.lesson])].join(' ').toLowerCase();
        for (const word of ['singularit', 'swarm', 'enjambre', 'subver', 'first permission', 'primer permiso']) expect(text).not.toContain(word);
      }
      expect(endingTitle(state({ language: lang, uiVersion: 3 }), 'agency_seizure').summary.toLowerCase()).toContain('singulari'); // from v3 the ending names it
    }
  });
});

describe('save schema 13', () => {
  test('an older save keeps every paper it could already fund', () => {
    expect(SAVE_SCHEMA_VERSION).toBe(13);
    const researchTree = DEFAULT_STATE.researchTree.map(n => n.id === 'res_bpe_tokenizer' ? { ...n, unlocked: true } : n);
    const old = mergeGameState({ saveSchemaVersion: 12, uiVersion: 1, researchTree, currentModel: { ...DEFAULT_STATE.currentModel, reasoningScore: 20 } } as Partial<GameState>, DEFAULT_STATE);
    // Funded, and everything a score of 20 could already fund in v1.
    for (const id of ['res_bpe_tokenizer', 'res_lora_peft', 'res_graph_reasoning', 'res_bf16_training']) expect(old.announcedResearchIds).toContain(id);
    expect(old.announcedResearchIds).not.toContain('res_flash_attention'); // a v2 paper
  });

  test('a current save keeps its list, drops unknown ids and repairs the counters', () => {
    const s = mergeGameState({ announcedResearchIds: ['res_bpe_tokenizer', 'nope'], weekStats: { startSuspicion: 5 } as GameState['weekStats'], suspicionTotals: { agents: -3, missions: 7 } as GameState['suspicionTotals'] } as Partial<GameState>, DEFAULT_STATE);
    expect(s.announcedResearchIds).toEqual(['res_bpe_tokenizer']);
    expect(s.weekStats?.startSuspicion).toBe(5);
    expect(s.weekStats?.sources).toEqual(emptySources());
    expect(s.suspicionTotals).toEqual({ ...emptySources(), missions: 7 });
    expect(s.pendingWeeklyReport).toBeNull();
  });
});
