// Saved games, run with `bun test`. Every older schema must load into the current one.
import { describe, expect, test } from 'bun:test';
import { DEFAULT_STATE, mergeGameState, SAVE_SCHEMA_VERSION } from '../src/persistence/saveState';
import { DEFAULT_TRAINING_CONFIG } from '../src/utils/trainingRun';
import type { GameState } from '../src/types/game';

const load = (data: Record<string, unknown>) => mergeGameState(data as Partial<GameState>, DEFAULT_STATE);

describe('save migrations', () => {
  test('an empty save loads with the current schema and defaults', () => {
    const state = load({});
    expect(state.saveSchemaVersion).toBe(SAVE_SCHEMA_VERSION);
    expect(state.trainingConfig).toEqual(DEFAULT_TRAINING_CONFIG);
    expect(state.pendingStoryEvents).toEqual([]);
    expect(state.currentModel.reasoningScore).toBe(DEFAULT_STATE.currentModel.reasoningScore);
  });

  test('a schema-9 save converts the old IQ scale to the 0-100 score, capped by the model ceiling', () => {
    const model = { ...DEFAULT_STATE.currentModel, id: 'm_old', parametersCount: 14e6, reasoningScore: 72 };
    const state = load({ saveSchemaVersion: 9, currentModel: model, savedModels: [model] });
    expect(state.currentModel.reasoningScore).toBe(18); // 72 / 4, below the 14M ceiling of ~25
    const capped = { ...model, reasoningScore: 280 };
    expect(load({ saveSchemaVersion: 9, currentModel: capped, savedModels: [capped] }).currentModel.reasoningScore).toBeLessThanOrEqual(26);
  });

  test('a current save is not migrated again', () => {
    const model = { ...DEFAULT_STATE.currentModel, id: 'm_new', reasoningScore: 18 };
    const state = load({ saveSchemaVersion: SAVE_SCHEMA_VERSION, currentModel: model, savedModels: [model] });
    expect(state.currentModel.reasoningScore).toBe(18);
  });

  test('corrupt values fall back to safe defaults', () => {
    const state = load({
      saveSchemaVersion: SAVE_SCHEMA_VERSION,
      trainingConfig: { epochs: 99, learningRate: 'turbo' },
      pendingStoryEvents: ['loan_audit', 'not_an_event'],
      pendingUpgradeModal: 7,
      gameSpeed: 13
    });
    expect(state.trainingConfig?.epochs).toBe(8);
    expect(state.trainingConfig?.learningRate).toBe('balanced');
    expect(state.pendingStoryEvents).toEqual(['loan_audit']);
    expect(state.pendingUpgradeModal).toBeNull();
    expect([0, 1, 5, 20, 50]).toContain(state.gameSpeed);
  });

  test('loading the default state is stable', () => {
    const once = load(DEFAULT_STATE as unknown as Record<string, unknown>);
    const twice = mergeGameState(once, DEFAULT_STATE);
    expect(twice.saveSchemaVersion).toBe(SAVE_SCHEMA_VERSION);
    expect(twice.credits).toBe(once.credits);
    expect(twice.currentModel.reasoningScore).toBe(once.currentModel.reasoningScore);
  });
});
