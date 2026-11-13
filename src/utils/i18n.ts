/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { tr, type CatalogKey, type Language } from '../i18n';

export type { Language };

// Short interface labels live in the text catalog under "ui.<key>" (src/i18n/).
type UiCatalogKey = Extract<CatalogKey, `ui.${string}`>;
export type TranslationKey = UiCatalogKey extends `ui.${infer K}` ? K : never;

export function t(lang: Language, key: TranslationKey): string {
  return tr(lang, `ui.${key}` as CatalogKey);
}
