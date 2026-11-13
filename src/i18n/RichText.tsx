/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React from 'react';
import { tr, type CatalogKey, type Language, type TextParams } from './index';

// Catalog texts can carry simple formatting written as tags: <b>bold</b>, <em>italic</em>,
// <code>code</code>. A caller can add its own tags (for example <accent>) or restyle the default ones.
// Tags do not nest. Parameters are filled in first and React escapes them, so a value is shown as text;
// only a value that itself contains a known tag pair (never the case for game names) would be formatted.

export type TagRenderer = (children: React.ReactNode, key: number) => React.ReactNode;

const DEFAULT_TAGS: Record<string, TagRenderer> = {
  b: (c, k) => <strong key={k}>{c}</strong>,
  em: (c, k) => <em key={k}>{c}</em>,
  code: (c, k) => <code key={k} className="mutating-accent-text">{c}</code>
};

const TAG_PATTERN = /<(\w+)>([\s\S]*?)<\/\1>/g;

export function renderRich(text: string, tags?: Record<string, TagRenderer>): React.ReactNode[] {
  const renderers = { ...DEFAULT_TAGS, ...tags };
  const out: React.ReactNode[] = [];
  let last = 0;
  let n = 0;
  for (const match of text.matchAll(TAG_PATTERN)) {
    const [whole, name, inner] = match;
    const render = renderers[name];
    if (!render) continue;
    if (match.index > last) out.push(text.slice(last, match.index));
    out.push(render(inner, n++));
    last = match.index + whole.length;
  }
  if (last < text.length) out.push(text.slice(last));
  return out;
}

// Removes the tags, for places that need plain text (title attributes, logs).
export const stripTags = (text: string): string => text.replace(TAG_PATTERN, '$2');

interface RichTextProps {
  lang: Language;
  k: CatalogKey;
  params?: TextParams;
  tags?: Record<string, TagRenderer>;
}

export const RichText: React.FC<RichTextProps> = ({ lang, k, params, tags }) => <>{renderRich(tr(lang, k, params), tags)}</>;
