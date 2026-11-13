/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { en, type CatalogKey } from './en';
import { es } from './es';

// One text catalog per language (src/i18n/en.ts, src/i18n/es.ts). Keys are "<area>.<name>"; both files
// must have exactly the same keys, which the type checker enforces. Parameters are written {name}.
// A key may have per-version variants written "<key>@v1" … "<key>@v4"; trv() picks the one for the
// current UI version and falls back to the plain key.

export type Language = 'es' | 'en';
export type { CatalogKey };
export type TextParams = Record<string, string | number | null | undefined>;

const CATALOGS: Record<Language, Record<string, string>> = { en, es };

function interpolate(text: string, params?: TextParams): string {
  if (!params) return text;
  return text.replace(/\{(\w+)\}/g, (match, name: string) => (name in params ? String(params[name]) : match));
}

export function tr(language: Language, key: CatalogKey, params?: TextParams): string {
  const catalog = CATALOGS[language === 'es' ? 'es' : 'en'];
  return interpolate(catalog[key] ?? en[key] ?? key, params);
}

// For texts keyed by data (content.<kind>.<id>.<field>): the key may not exist for items created at runtime.
export function hasCatalogKey(key: string): key is CatalogKey {
  return key in en;
}

export function trv(language: Language, key: CatalogKey, version: number, params?: TextParams): string {
  const catalog = CATALOGS[language === 'es' ? 'es' : 'en'];
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
