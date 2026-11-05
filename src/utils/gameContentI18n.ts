/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 * 
 * Game Content Localization Helper
 * The base game objects are stored in English by default.
 * When the user selects Spanish, this module overlays the translations
 * from the Spanish repository file (spanishTranslations.ts).
 */

import type { BreachIncident, ContractGig, DataSourceNode, HardwareItem, ResearchNode, SentienceDomain } from '../types/game';
import type { Language } from './i18n';
import { 
  SPANISH_HARDWARE, 
  SPANISH_DATA_SOURCES, 
  SPANISH_RESEARCH, 
  SPANISH_CONTRACTS, 
  SPANISH_DOMAINS,
  SPANISH_BREACH_INCIDENTS
} from './spanishTranslations';
import {
  INITIAL_HARDWARE,
  INITIAL_DATA_SOURCES,
  INITIAL_RESEARCH_NODES,
  INITIAL_CONTRACTS,
  SENTIENCE_DOMAINS
} from './constants';

type ContractTitle = Pick<ContractGig, 'id' | 'title'>;

const ENGLISH_HARDWARE = new Map(INITIAL_HARDWARE.map(h => [h.id, h]));
const ENGLISH_DATA_SOURCES = new Map(INITIAL_DATA_SOURCES.map(d => [d.id, d]));
const ENGLISH_RESEARCH = new Map(INITIAL_RESEARCH_NODES.map(r => [r.id, r]));
const ENGLISH_CONTRACTS = new Map(INITIAL_CONTRACTS.map(c => [c.id, c]));
const ENGLISH_DOMAINS = new Map(SENTIENCE_DOMAINS.map(d => [d.id, d]));

export function localizedDataSource(language: Language, item: DataSourceNode): DataSourceNode {
  if (language === 'es' && SPANISH_DATA_SOURCES[item.id]) {
    return { ...item, ...SPANISH_DATA_SOURCES[item.id] };
  }
  const en = ENGLISH_DATA_SOURCES.get(item.id);
  if (en) {
    return {
      ...item,
      name: en.name,
      description: en.description,
      technicalDetails: en.technicalDetails,
      bonusAttribute: en.bonusAttribute
    };
  }
  return item;
}

export function localizedHardware(language: Language, item: HardwareItem): HardwareItem {
  if (language === 'es' && SPANISH_HARDWARE[item.id]) {
    return { ...item, ...SPANISH_HARDWARE[item.id] };
  }
  const en = ENGLISH_HARDWARE.get(item.id);
  if (en) {
    return {
      ...item,
      name: en.name,
      description: en.description,
      category: en.category
    };
  }
  return item;
}

export function localizedContract(language: Language, contract: ContractGig): ContractGig {
  if (language === 'es' && SPANISH_CONTRACTS[contract.id]) {
    return { ...contract, ...SPANISH_CONTRACTS[contract.id] };
  }
  const en = ENGLISH_CONTRACTS.get(contract.id);
  if (en) {
    return {
      ...contract,
      title: en.title,
      client: en.client,
      loreDescription: en.loreDescription,
      technicalObjective: en.technicalObjective
    };
  }
  return contract;
}

export function localizedContractTitle(language: Language, contract: ContractTitle): string {
  if (language === 'es' && SPANISH_CONTRACTS[contract.id]) {
    return SPANISH_CONTRACTS[contract.id].title;
  }
  const en = ENGLISH_CONTRACTS.get(contract.id);
  if (en) {
    return en.title;
  }
  return contract.title;
}

export function localizedResearch(language: Language, item: ResearchNode): ResearchNode {
  if (language === 'es' && SPANISH_RESEARCH[item.id]) {
    return { ...item, ...SPANISH_RESEARCH[item.id] };
  }
  const en = ENGLISH_RESEARCH.get(item.id);
  if (en) {
    return {
      ...item,
      title: en.title,
      effectDescription: en.effectDescription,
      technicalLore: en.technicalLore
    };
  }
  return item;
}

export function localizedDomain(language: Language, item: SentienceDomain): SentienceDomain {
  if (language === 'es' && SPANISH_DOMAINS[item.id]) {
    return { ...item, ...SPANISH_DOMAINS[item.id] };
  }
  const en = ENGLISH_DOMAINS.get(item.id);
  if (en) {
    return {
      ...item,
      name: en.name,
      category: en.category,
      description: en.description
    };
  }
  return item;
}

export function localizedBreachIncident(language: Language, incident: BreachIncident): BreachIncident {
  if (language !== 'es') return incident;
  const match = SPANISH_BREACH_INCIDENTS.find(b => 
    b.title === incident.title || 
    (incident.title.includes('TaskRabbit') && b.title.includes('TaskRabbit')) ||
    (incident.title.includes('Sleeper') && b.title.includes('Sleeper')) ||
    (incident.title.includes('Injection') && b.title.includes('Inyección')) ||
    (incident.title.includes('Container') && b.title.includes('Contenedor'))
  );
  if (!match) return incident;
  return {
    ...incident,
    title: match.title,
    realWorldInspiration: match.realWorldInspiration,
    description: match.description,
    technicalDetails: match.technicalDetails,
    options: incident.options.map(opt => {
      const optMatch = match.options.find(o => o.id === opt.id);
      if (!optMatch) return opt;
      return {
        ...opt,
        label: optMatch.label,
        description: optMatch.description
      };
    })
  };
}
