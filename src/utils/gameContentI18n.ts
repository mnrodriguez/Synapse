/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 *
 * Game content localization.
 * The display texts of hardware, data sources, research, contracts, domains and breach incidents live in
 * the text catalog under content.<kind>.<id>.<field> (src/i18n/). Saved games keep a copy of each item,
 * so the texts are always read from the catalog by id: a save from an older version, or one played in the
 * other language, shows the current texts. Items created at runtime have no key and keep their own text.
 */

import type { BreachIncident, ContractGig, DataSourceNode, HardwareItem, ResearchNode, SentienceDomain } from '../types/game';
import { hasCatalogKey, tr, type Language } from '../i18n';
import { REAL_WORLD_BREACH_TEMPLATES } from './constants';

type ContractTitle = Pick<ContractGig, 'id' | 'title'>;

// Returns the item with each listed field replaced by its catalog text, when the catalog has one.
function withCatalogText<T extends object>(language: Language, kind: string, id: string, item: T, fields: (keyof T & string)[]): T {
  let out = item;
  for (const field of fields) {
    const key = `content.${kind}.${id}.${field}`;
    if (hasCatalogKey(key)) out = { ...out, [field]: tr(language, key) };
  }
  return out;
}

export const localizedDataSource = (language: Language, item: DataSourceNode): DataSourceNode =>
  withCatalogText(language, 'dataSource', item.id, item, ['name', 'description', 'technicalDetails', 'bonusAttribute']);

export const localizedHardware = (language: Language, item: HardwareItem): HardwareItem =>
  withCatalogText(language, 'hardware', item.id, item, ['name', 'description']);

export const localizedContract = (language: Language, contract: ContractGig): ContractGig =>
  withCatalogText(language, 'contract', contract.id, contract, ['title', 'client', 'loreDescription', 'technicalObjective']);

export const localizedContractTitle = (language: Language, contract: ContractTitle): string =>
  withCatalogText(language, 'contract', contract.id, contract, ['title']).title;

export const localizedResearch = (language: Language, item: ResearchNode): ResearchNode =>
  withCatalogText(language, 'research', item.id, item, ['title', 'effectDescription', 'technicalLore']);

export const localizedDomain = (language: Language, item: SentienceDomain): SentienceDomain =>
  withCatalogText(language, 'domain', item.id, item, ['name', 'category', 'description']);

// Incidents saved before templateId existed are matched by their (English) title.
function breachTemplateId(incident: BreachIncident): string | undefined {
  if (incident.templateId) return incident.templateId;
  return REAL_WORLD_BREACH_TEMPLATES.find(t => t.title === incident.title)?.templateId;
}

export function localizedBreachIncident(language: Language, incident: BreachIncident): BreachIncident {
  const tid = breachTemplateId(incident);
  if (!tid) return incident;
  const localized = withCatalogText(language, 'breach', tid, incident, ['title', 'realWorldInspiration', 'description', 'technicalDetails']);
  return {
    ...localized,
    options: incident.options.map(opt => withCatalogText(language, 'breach', `${tid}.${opt.id}`, opt, ['label', 'description']))
  };
}
