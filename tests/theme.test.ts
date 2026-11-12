// Theme guard, run with `bun test`. Components must use the theme classes from src/index.css
// (mutating-*, theme-*) instead of fixed Tailwind colours, or the four UI versions bleed into each other.
import { describe, expect, test } from 'bun:test';
import { readdirSync, readFileSync } from 'node:fs';
import { join } from 'node:path';

const ROOT = join(import.meta.dir, '..', 'src');
const FILES = [
  ...readdirSync(join(ROOT, 'components')).filter(f => f.endsWith('.tsx')).map(f => join('components', f)),
  'App.tsx'
];

const FIXED_COLOUR = new RegExp(
  String.raw`(?:^|[\s'"\x60{])(?:[a-z-]+:)*` +
  String.raw`(?:bg|text|border|from|via|to|ring|fill|stroke|accent|outline|divide|placeholder|decoration|caret)-` +
  String.raw`(?:\[#[0-9a-fA-F]+\]|(?:zinc|slate|gray|neutral|stone|cyan|purple|pink|indigo|violet|emerald|green|amber|yellow|orange|red|rose|blue|sky|teal|fuchsia|lime)-\d+(?:/\d+)?)` +
  String.raw`(?=[\s'"\x60}]|$)` +
  String.raw`|(?:drop-)?shadow-\[[^\]]*rgba`,
  'g'
);

// Decorative overlays that are meant to look the same in every version.
const ALLOWED = [
  'bg-[radial-gradient(',
  'bg-[linear-gradient('
];

describe('theme colours', () => {
  for (const file of FILES) {
    test(`${file} uses theme classes only`, () => {
      const source = readFileSync(join(ROOT, file), 'utf8');
      const offenders: string[] = [];
      source.split('\n').forEach((line, i) => {
        if (ALLOWED.some(a => line.includes(a))) return;
        for (const m of line.matchAll(FIXED_COLOUR)) offenders.push(`${file}:${i + 1} ${m[0].trim()}`);
      });
      expect(offenders).toEqual([]);
    });
  }
});
