/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

// Files under public/ are served from the site's base path (/Synapse/ on GitHub Pages), so links
// to them must start with BASE_URL instead of "/".
const BASE = (import.meta as { env?: { BASE_URL?: string } }).env?.BASE_URL ?? '/';

export const MANUAL_PDF_URL = `${BASE}assets/aistudio/SYNAPSE_AI_Architecture___Systems_Manual__1__73b90381.pdf`;
