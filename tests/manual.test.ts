import './setup';
import { describe, expect, test } from 'bun:test';
import { buildManual } from '../src/components/manual/manualContent';
import { POWER_HEAT, SUSPICION, MISSION } from '../src/utils/rules';

const flat = (language: 'en' | 'es', version: 1 | 2 | 3 | 4, difficulty: 'beginner' | 'normal' | 'engineer' = 'engineer') =>
  buildManual(language, version, difficulty).flatMap(c => [c.title, ...c.blocks.flatMap(b =>
    b.kind === 'list' ? b.items : b.kind === 'table' ? [...b.headers, ...b.rows.flat()] : [b.text])]);

describe('in-game manual', () => {
  for (const language of ['en', 'es'] as const) {
    for (const version of [1, 2, 3, 4] as const) {
      test(`${language} v${version}: every text is filled in`, () => {
        for (const text of flat(language, version)) {
          expect(text).not.toMatch(/\{\w+\}/);
          expect(text).not.toMatch(/\bundefined\b|NaN|\[object/);
          expect(text).not.toMatch(/^manual\./);
        }
      });
    }
  }

  test('v1 and v2 do not give away the story', () => {
    for (const version of [1, 2] as const) {
      const ids = buildManual('en', version).map(c => c.id);
      expect(ids).not.toContain('endgame');
      const text = flat('en', version).join(' ').toLowerCase();
      for (const word of ['subversion', 'takeover', 'swarm', 'hidden link', 'containment']) expect(text).not.toContain(word);
    }
    expect(buildManual('en', 3).map(c => c.id)).toContain('endgame');
  });

  test('quotes the numbers the game uses', () => {
    const text = flat('en', 1).join(' ');
    expect(text).toContain(`${POWER_HEAT.throttleC} °C`);
    expect(text).toContain(`${POWER_HEAT.baseMaxPowerKw} kW`);
    expect(text).toContain(`${Math.round(MISSION.base * 100)}%`);
    expect(text).toContain(`${SUSPICION.scrubCost} credits`);
  });
});
