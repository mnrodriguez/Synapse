// Text catalog guard, run with `bun test`. Every visible text lives in src/i18n/{en,es}.ts.
import { describe, expect, test } from 'bun:test';
import { readdirSync, readFileSync, statSync } from 'node:fs';
import { join } from 'node:path';
import { en } from '../src/i18n/en';
import { es } from '../src/i18n/es';
import { tr, trv } from '../src/i18n';
import { createElement } from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { RichText, stripTags } from '../src/i18n/RichText';

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

  test('formatting tags are the same in both languages and are closed', () => {
    // Paired tags only: a placeholder such as "run <id>" or "<directiva>" is plain text.
    const tags = (s: string) => [...s.matchAll(/<(\w+)>[\s\S]*?<\/\1>/g)].map(m => m[1]).sort().join();
    const mismatched = Object.keys(en).filter(k => tags(en[k as keyof typeof en]) !== tags(es[k as keyof typeof es]));
    expect(mismatched).toEqual([]);
    const unclosed = Object.entries(en).filter(([, v]) => {
      // Only the formatting tags: a placeholder such as "buy <id>" is plain text.
      const open = [...v.matchAll(/<(b|em|code)>/g)].map(m => m[1]);
      return open.some(t => !v.includes(`</${t}>`));
    }).map(([k]) => k);
    expect(unclosed).toEqual([]);
  });

  test('no CSS classes in the catalog', () => {
    const classes = Object.entries(en).filter(([, v]) => /(^|\s)(theme|mutating)-[\w-]+/.test(v)).map(([k]) => k);
    expect(classes).toEqual([]);
  });

  test('every key is used by the code', () => {
    const unused = Object.keys(en).filter(key => {
      const base = key.replace(/@v[1-4]$/, '');
      const name = base.startsWith('ui.') ? base.slice(3) : base;
      return !code.includes(`'${name}'`) && !code.includes(`"${name}"`);
    });
    expect(unused).toEqual([]);
  });

  test('no inline translations: the localize(es, en) helper is gone', () => {
    expect(code.match(/\blocalize\(/g) ?? []).toEqual([]);
  });

  test('parameters are filled in and versions fall back to the plain key', () => {
    const key = Object.keys(en).find(k => params(en[k as keyof typeof en]).length > 0) as keyof typeof en;
    const filled = tr('es', key, Object.fromEntries(params(en[key]).map(p => [p, 'X'])));
    expect(filled.includes('{')).toBe(false);
    expect(trv('en', key, 3)).toBe(tr('en', key));
  });

  test('formatted texts render their tags and keep the plain text', () => {
    const html = renderToStaticMarkup(createElement(RichText, { lang: 'es', k: 'helpManual.introMission' }));
    expect(html).toContain('<em>Uplink</em>');
    expect(html).toContain('<strong>entrenar una Inteligencia Artificial desde cero</strong>');
    const custom = renderToStaticMarkup(createElement(RichText, {
      lang: 'en',
      k: 'genesisOnboarding.allConnected',
      params: { gpu: 'GTX <1060>', data: 'Wiki', model: 'Proto' },
      tags: { gpu: (c: React.ReactNode, k: number) => createElement('b', { key: k, className: 'g' }, c) }
    }));
    // A parameter is text, never markup; unknown tags stay as written.
    expect(custom).toContain('<b class="g">GTX &lt;1060&gt;</b>');
    expect(custom).toContain('&lt;data&gt;Wiki&lt;/data&gt;');
    expect(stripTags(tr('en', 'terminal.helpHint'))).toBe('Type help to see all available commands, or use the modules above.');
  });
});
