// Text catalog guard, run with `bun test`. Every visible text lives in src/i18n/{en,es}.ts.
import { describe, expect, test } from 'bun:test';
import { readdirSync, readFileSync, statSync } from 'node:fs';
import { join } from 'node:path';
import { en } from '../src/i18n/en';
import { es } from '../src/i18n/es';
import { tr, trv } from '../src/i18n';

const SRC = join(import.meta.dir, '..', 'src');
const files = (dir: string): string[] => readdirSync(dir).flatMap(name => {
  const p = join(dir, name);
  return statSync(p).isDirectory() ? files(p) : /\.(ts|tsx)$/.test(name) ? [p] : [];
});
const code = files(SRC).filter(f => !f.includes(`${join('src', 'i18n')}`)).map(f => readFileSync(f, 'utf8')).join('\n');
const params = (s: string) => [...s.matchAll(/\{(\w+)\}/g)].map(m => m[1]).sort();

describe('text catalog', () => {
  test('both languages have the same keys and no empty texts', () => {
    expect(Object.keys(es).sort()).toEqual(Object.keys(en).sort());
    for (const [k, v] of Object.entries(en)) expect(`${k}=${v.trim() ? 'ok' : 'empty'}`).toBe(`${k}=ok`);
    for (const [k, v] of Object.entries(es)) expect(`${k}=${v.trim() ? 'ok' : 'empty'}`).toBe(`${k}=ok`);
  });

  test('every key uses the same parameters in both languages', () => {
    const mismatched = Object.keys(en).filter(k => params(en[k as keyof typeof en]).join() !== params(es[k as keyof typeof es]).join());
    expect(mismatched).toEqual([]);
  });

  test('every key is used by the code', () => {
    const unused = Object.keys(en).filter(key => {
      const base = key.replace(/@v[1-4]$/, '');
      if (base.startsWith('ui.')) return !code.includes(`'${base.slice(3)}'`);
      return !code.includes(`'${base}'`);
    });
    expect(unused).toEqual([]);
  });

  test('no new inline translations: literal localize() calls are gone', () => {
    const inline = code.match(/localize\([^,()]+,\s*['`][^'`]*['`],\s*['`][^'`]*['`]\)/g) ?? [];
    expect(inline).toEqual([]);
  });

  test('parameters are filled in and versions fall back to the plain key', () => {
    const key = Object.keys(en).find(k => params(en[k as keyof typeof en]).length > 0) as keyof typeof en;
    const filled = tr('es', key, Object.fromEntries(params(en[key]).map(p => [p, 'X'])));
    expect(filled.includes('{')).toBe(false);
    expect(trv('en', key, 3)).toBe(tr('en', key));
  });
});
