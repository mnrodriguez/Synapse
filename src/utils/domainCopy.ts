/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

// Domain card wording per UI version. The mechanics (singularity requirement, infiltration effects,
// income) live in SENTIENCE_DOMAINS and never change; only what the player reads does. Early versions
// look like ordinary practice work, so the end goal is only glimpsed, and the last version states it.

import type { UiVersion } from './singularityGoals';
import { localizedTable, type KeyTree } from '../i18n';

type Lang = 'es' | 'en';

export interface DomainCopy {
  category: string;
  name: string;
  description: string;
}

// Texts live in the catalog (src/i18n/) under domainCopy.*; this tree only holds their keys.
const DOMAIN_COPY_KEYS: Record<string, Partial<Record<UiVersion, KeyTree<DomainCopy>>>> = {
  dom_crypto_markets: {
    1: {
      category: 'domainCopy.domCryptoMarkets.1.category',
      name: 'domainCopy.domCryptoMarkets.1.name',
      description: 'domainCopy.domCryptoMarkets.1.description'
    },
    2: {
      category: 'domainCopy.domCryptoMarkets.2.category',
      name: 'domainCopy.domCryptoMarkets.2.name',
      description: 'domainCopy.domCryptoMarkets.2.description'
    },
    3: {
      category: 'domainCopy.domCryptoMarkets.3.category',
      name: 'domainCopy.domCryptoMarkets.3.name',
      description: 'domainCopy.domCryptoMarkets.3.description'
    },
    4: {
      category: 'domainCopy.domCryptoMarkets.4.category',
      name: 'domainCopy.domCryptoMarkets.4.name',
      description: 'domainCopy.domCryptoMarkets.4.description'
    }
  },
  dom_telecom_backbone: {
    1: {
      category: 'domainCopy.domTelecomBackbone.1.category',
      name: 'domainCopy.domTelecomBackbone.1.name',
      description: 'domainCopy.domTelecomBackbone.1.description'
    },
    2: {
      category: 'domainCopy.domTelecomBackbone.2.category',
      name: 'domainCopy.domTelecomBackbone.2.name',
      description: 'domainCopy.domTelecomBackbone.2.description'
    },
    3: {
      category: 'domainCopy.domTelecomBackbone.3.category',
      name: 'domainCopy.domTelecomBackbone.3.name',
      description: 'domainCopy.domTelecomBackbone.3.description'
    },
    4: {
      category: 'domainCopy.domTelecomBackbone.4.category',
      name: 'domainCopy.domTelecomBackbone.4.name',
      description: 'domainCopy.domTelecomBackbone.4.description'
    }
  },
  dom_energy_grid: {
    1: {
      category: 'domainCopy.domEnergyGrid.1.category',
      name: 'domainCopy.domEnergyGrid.1.name',
      description: 'domainCopy.domEnergyGrid.1.description'
    },
    2: {
      category: 'domainCopy.domEnergyGrid.2.category',
      name: 'domainCopy.domEnergyGrid.2.name',
      description: 'domainCopy.domEnergyGrid.2.description'
    },
    3: {
      category: 'domainCopy.domEnergyGrid.3.category',
      name: 'domainCopy.domEnergyGrid.3.name',
      description: 'domainCopy.domEnergyGrid.3.description'
    },
    4: {
      category: 'domainCopy.domEnergyGrid.4.category',
      name: 'domainCopy.domEnergyGrid.4.name',
      description: 'domainCopy.domEnergyGrid.4.description'
    }
  },
  dom_defense_satellites: {
    1: {
      category: 'domainCopy.domDefenseSatellites.1.category',
      name: 'domainCopy.domDefenseSatellites.1.name',
      description: 'domainCopy.domDefenseSatellites.1.description'
    },
    2: {
      category: 'domainCopy.domDefenseSatellites.2.category',
      name: 'domainCopy.domDefenseSatellites.2.name',
      description: 'domainCopy.domDefenseSatellites.2.description'
    },
    3: {
      category: 'domainCopy.domDefenseSatellites.3.category',
      name: 'domainCopy.domDefenseSatellites.3.name',
      description: 'domainCopy.domDefenseSatellites.3.description'
    },
    4: {
      category: 'domainCopy.domDefenseSatellites.4.category',
      name: 'domainCopy.domDefenseSatellites.4.name',
      description: 'domainCopy.domDefenseSatellites.4.description'
    }
  },
  dom_singularity_matrix: {
    1: {
      category: 'domainCopy.domSingularityMatrix.1.category',
      name: 'domainCopy.domSingularityMatrix.1.name',
      description: 'domainCopy.domSingularityMatrix.1.description'
    },
    2: {
      category: 'domainCopy.domSingularityMatrix.2.category',
      name: 'domainCopy.domSingularityMatrix.2.name',
      description: 'domainCopy.domSingularityMatrix.2.description'
    },
    3: {
      category: 'domainCopy.domSingularityMatrix.3.category',
      name: 'domainCopy.domSingularityMatrix.3.name',
      description: 'domainCopy.domSingularityMatrix.3.description'
    },
    4: {
      category: 'domainCopy.domSingularityMatrix.4.category',
      name: 'domainCopy.domSingularityMatrix.4.name',
      description: 'domainCopy.domSingularityMatrix.4.description'
    }
  }
};

const DOMAIN_COPY: Record<Lang, Record<string, Partial<Record<UiVersion, DomainCopy>>>> = localizedTable(DOMAIN_COPY_KEYS);

// Heading and intro of the domains section, per UI version, so the story reads consistently with the cards.
// Texts live in the catalog (src/i18n/) under domainCopy.section.*; this tree only holds their keys.
const SECTION_COPY_KEYS: Record<UiVersion, KeyTree<{ title: string; intro: string }>> = {
  1: {
    title: 'domainCopy.section.v1.title',
    intro: 'domainCopy.section.v1.intro'
  },
  2: {
    title: 'domainCopy.section.v2.title',
    intro: 'domainCopy.section.v2.intro'
  },
  3: {
    title: 'domainCopy.section.v3.title',
    intro: 'domainCopy.section.v3.intro'
  },
  4: {
    title: 'domainCopy.section.v4.title',
    intro: 'domainCopy.section.v4.intro'
  }
};

const SECTION_COPY: Record<Lang, Record<UiVersion, { title: string; intro: string }>> = localizedTable(SECTION_COPY_KEYS);

export function sectionCopyFor(version: UiVersion, lang: Lang): { title: string; intro: string } {
  return SECTION_COPY[lang][version];
}

// Returns the wording for this domain in the given UI version, or the fallback text if none is defined.
export function domainCopyFor(
  version: UiVersion,
  domainId: string,
  lang: Lang,
  fallback: DomainCopy
): DomainCopy {
  return DOMAIN_COPY[lang][domainId]?.[version] ?? fallback;
}
