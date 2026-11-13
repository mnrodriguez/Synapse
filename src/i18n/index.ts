/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { en, type CatalogKey } from './en';

// One text catalog per language (src/i18n/en.ts, src/i18n/es.ts). Keys are "<area>.<name>"; both files
// must have exactly the same keys, which the type checker enforces. Parameters are written {name}.
// A key may have per-version variants written "<key>@v1" … "<key>@v4"; trv() picks the one for the
// current UI version and falls back to the plain key.

export type Language = 'es' | 'en';
export type { CatalogKey };
export type TextParams = Record<string, string | number | null | undefined>;

// English ships with the game; other languages are loaded on demand (loadCatalog) so a player only
// downloads the language they use. Until a catalog arrives, its texts fall back to English.
const CATALOGS: Partial<Record<Language, Record<string, string>>> = { en };
let catalogRevision = 0;

export const isCatalogLoaded = (language: Language): boolean => Boolean(CATALOGS[language]);
// Changes whenever a catalog is added, so cached translations know to rebuild.
export const getCatalogRevision = (): number => catalogRevision;

export function registerCatalog(language: Language, catalog: Record<string, string>): void {
  CATALOGS[language] = catalog;
  catalogRevision += 1;
}

export async function loadCatalog(language: Language): Promise<void> {
  if (CATALOGS[language]) return;
  if (language === 'es') {
    const { es } = await import('./es');
    registerCatalog('es', es);
  }
}

const catalogFor = (language: Language): Record<string, string> => CATALOGS[language === 'es' ? 'es' : 'en'] ?? en;

function interpolate(text: string, params?: TextParams): string {
  if (!params) return text;
  return text.replace(/\{(\w+)\}/g, (match, name: string) => (name in params ? String(params[name]) : match));
}

export function tr(language: Language, key: CatalogKey, params?: TextParams): string {
  const catalog = catalogFor(language);
  return interpolate(catalog[key] ?? en[key] ?? key, params);
}

// For texts keyed by data (content.<kind>.<id>.<field>): the key may not exist for items created at runtime.
export function hasCatalogKey(key: string): key is CatalogKey {
  return key in en;
}

export function trv(language: Language, key: CatalogKey, version: number, params?: TextParams): string {
  const catalog = catalogFor(language);
  const variant = catalog[`${key}@v${version}`];
  return interpolate(variant ?? catalog[key] ?? en[key] ?? key, params);
}

// A tree with the same shape as T whose texts are catalog keys (used for tables of texts by version,
// role, etc.). localizeTree() turns it into T for one language.
export type KeyTree<T> = T extends string
  ? CatalogKey
  : T extends readonly (infer U)[]
    ? KeyTree<U>[]
    : T extends object
      ? { [P in keyof T]: KeyTree<T[P]> }
      : T;

export function localizeTree<T>(language: Language, tree: KeyTree<NoInfer<T>>): T {
  const walk = (node: unknown): unknown => {
    if (typeof node === 'string') return tr(language, node as CatalogKey);
    if (Array.isArray(node)) return node.map(walk);
    if (node && typeof node === 'object') return Object.fromEntries(Object.entries(node).map(([k, v]) => [k, walk(v)]));
    return node;
  };
  return walk(tree) as T;
}

// A table of texts per language built from a key tree. Each language is built the first time it is read
// and rebuilt when a catalog arrives, so tables can be declared at module load before Spanish is loaded.
export function localizedTable<T>(tree: KeyTree<NoInfer<T>>): Record<Language, T> {
  const cache: Partial<Record<Language, { revision: number; value: T }>> = {};
  const get = (language: Language): T => {
    const hit = cache[language];
    if (hit && hit.revision === catalogRevision) return hit.value;
    const value = localizeTree<T>(language, tree as KeyTree<NoInfer<T>>);
    cache[language] = { revision: catalogRevision, value };
    return value;
  };
  return {
    get en() { return get('en'); },
    get es() { return get('es'); }
  };
}
