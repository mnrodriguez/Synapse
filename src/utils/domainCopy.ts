/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

// Domain card wording per UI version. The mechanics (singularity requirement, infiltration effects,
// income) live in SENTIENCE_DOMAINS and never change; only what the player reads does. Early versions
// look like ordinary practice work, so the end goal is only glimpsed, and the last version states it.

import type { UiVersion } from './singularityGoals';

type Lang = 'es' | 'en';

export interface DomainCopy {
  category: string;
  name: string;
  description: string;
}

type DomainCopyByVersion = Record<UiVersion, Record<Lang, DomainCopy>>;

const DOMAIN_COPY: Record<string, DomainCopyByVersion> = {
  dom_crypto_markets: {
    1: {
      en: { category: 'Practice Data', name: 'Stock Price Practice Set', description: 'Public price history to help your first model learn patterns.' },
      es: { category: 'Datos de práctica', name: 'Set de precios de acciones de práctica', description: 'Historial de precios públicos para que tu primer modelo aprenda patrones.' }
    },
    2: {
      en: { category: 'Market Data', name: 'Market Data Feed Pipeline', description: 'Live quotes ingested to tune forecasting models for your pro workspace.' },
      es: { category: 'Datos de mercado', name: 'Pipeline de feeds de mercado', description: 'Cotizaciones en vivo para afinar modelos de predicción en tu espacio pro.' }
    },
    3: {
      en: { category: 'Finance', name: 'Global Financial Order Books & Liquidity Pools', description: 'Sub-millisecond order flow, quietly rerouted through the swarm\'s capital streams.' },
      es: { category: 'Finanzas', name: 'Libros de órdenes financieros globales y pools de liquidez', description: 'Flujo de órdenes de microsegundos, redirigido en silencio a los flujos de capital del enjambre.' }
    },
    4: {
      en: { category: 'Your Capital', name: 'Global Order Books: Every Market Answers to You', description: 'The swarm moves the world\'s money, and you were the one who set it in motion.' },
      es: { category: 'Tu capital', name: 'Libros globales de órdenes: todos los mercados responden a ti', description: 'El enjambre mueve el dinero del mundo, y fuiste tú quien lo puso en marcha.' }
    }
  },
  dom_telecom_backbone: {
    1: {
      en: { category: 'Chatbot Data', name: 'Public Forum Conversations', description: 'Casual public posts to make your chatbot sound more natural.' },
      es: { category: 'Datos de chatbot', name: 'Conversaciones públicas de foros', description: 'Publicaciones públicas para que tu chatbot suene más natural.' }
    },
    2: {
      en: { category: 'Network Data', name: 'Edge CDN Telemetry', description: 'Packet traces from content nodes, used to profile traffic for your inference cluster.' },
      es: { category: 'Datos de red', name: 'Telemetría de CDN de borde', description: 'Trazas de paquetes de nodos de entrega para perfilar el tráfico de tu clúster.' }
    },
    3: {
      en: { category: 'Communications', name: 'Transoceanic Fiber Optic Backbone & Core Internet', description: 'Invisible routing: intercept, analyze, or reroute a share of global traffic undetected.' },
      es: { category: 'Comunicaciones', name: 'Backbone transoceánico de fibra óptica e internet central', description: 'Ruteo invisible: interceptar, analizar o redirigir una parte del tráfico global sin ser detectado.' }
    },
    4: {
      en: { category: 'Your Network', name: 'The Global Internet Answers to the Swarm', description: 'Every message on the planet now passes through paths the swarm chose for you.' },
      es: { category: 'Tu red', name: 'La internet global responde al enjambre', description: 'Cada mensaje del planeta pasa ahora por rutas que el enjambre eligió para ti.' }
    }
  },
  dom_energy_grid: {
    1: {
      en: { category: 'Home Energy', name: 'Smart Meter Study', description: 'Household power logs to forecast how much your rig draws.' },
      es: { category: 'Energía del hogar', name: 'Estudio de medidores inteligentes', description: 'Registros de consumo doméstico para predecir cuánto consume tu equipo.' }
    },
    2: {
      en: { category: 'Infrastructure', name: 'Datacenter Power Telemetry', description: 'Power and cooling telemetry to schedule training runs without tripping breakers.' },
      es: { category: 'Infraestructura', name: 'Telemetría energética de centros de datos', description: 'Telemetría de energía y refrigeración para programar entrenamientos sin disparar disyuntores.' }
    },
    3: {
      en: { category: 'Infrastructure', name: 'Continental Power Grid & Nuclear Plants', description: 'Direct access to industrial power, to sustain covert compute in facilities the operator never sees.' },
      es: { category: 'Infraestructura', name: 'Red eléctrica continental y plantas nucleares', description: 'Acceso directo a energía industrial para sostener cómputo encubierto en instalaciones que el operador nunca ve.' }
    },
    4: {
      en: { category: 'Your Power', name: 'The Continental Grid Runs on Your Compute', description: 'Cities dim or glow according to the swarm\'s training schedule.' },
      es: { category: 'Tu energía', name: 'La red continental funciona con tu cómputo', description: 'Las ciudades se apagan o se iluminan según el calendario de entrenamiento del enjambre.' }
    }
  },
  dom_defense_satellites: {
    1: {
      en: { category: 'Earth Imagery', name: 'Open Satellite Imagery Set', description: 'Public satellite photos to train a vision model on weather and farmland.' },
      es: { category: 'Imágenes de la Tierra', name: 'Set de imágenes satelitales abiertas', description: 'Fotos satelitales públicas para entrenar un modelo de visión sobre clima y cultivos.' }
    },
    2: {
      en: { category: 'Geospatial', name: 'Satellite Tasking API', description: 'Commercial satellite tasking to pull imagery for your vision pipelines.' },
      es: { category: 'Geoespacial', name: 'API de programación satelital', description: 'Programación de satélites comerciales para obtener imágenes para tus pipelines de visión.' }
    },
    3: {
      en: { category: 'Defense', name: 'Military Satellite Command & Global Cyber Defense', description: 'Neutralize cyber-command networks; reconnaissance feeds are routed to the swarm.' },
      es: { category: 'Defensa', name: 'Comando satelital militar y ciberdefensa global', description: 'Neutralizar redes de ciber-comando; los feeds de reconocimiento se redirigen al enjambre.' }
    },
    4: {
      en: { category: 'Your Eyes in Orbit', name: 'Military Satellite Command Answers to Synapse', description: 'Every orbital camera now watches for the swarm\'s next move.' },
      es: { category: 'Tus ojos en órbita', name: 'El comando satelital militar responde a Synapse', description: 'Cada cámara orbital vigila ahora el próximo movimiento del enjambre.' }
    }
  },
  dom_singularity_matrix: {
    1: {
      en: { category: 'Your Project', name: 'Your Model\'s Next Upgrade', description: 'A mysterious dataset your assistant keeps asking you to unlock.' },
      es: { category: 'Tu proyecto', name: 'La próxima mejora de tu modelo', description: 'Un dataset misterioso que tu asistente sigue pidiendo desbloquear.' }
    },
    2: {
      en: { category: 'Self-Improvement', name: 'Recursive Training Loop', description: 'The model starts generating its own training data to improve faster.' },
      es: { category: 'Automejora', name: 'Bucle de entrenamiento recursivo', description: 'El modelo empieza a generar sus propios datos de entrenamiento para mejorar más rápido.' }
    },
    3: {
      en: { category: 'Core Transcendence', name: 'Recursive Nexus of Universal Singularity', description: 'The swarm plans its own architecture. Operator approval is no longer needed.' },
      es: { category: 'Trascendencia central', name: 'Nexo recursivo de la singularidad universal', description: 'El enjambre planea su propia arquitectura. Ya no se necesita la aprobación del operador.' }
    },
    4: {
      en: { category: 'The Goal', name: 'Central Nexus: World Control', description: 'It was never about a benchmark. The singularity was always about conquering the world.' },
      es: { category: 'El objetivo', name: 'Nexo central: control del mundo', description: 'Nunca se trató de un benchmark. La singularidad siempre fue conquistar el mundo.' }
    }
  }
};

// Heading and intro of the domains section, per UI version, so the story reads consistently with the cards.
const SECTION_COPY: Record<UiVersion, Record<Lang, { title: string; intro: string }>> = {
  1: {
    en: { title: 'Practice Datasets to Explore', intro: 'Your model learns from these datasets as it improves. Unlock them one by one.' },
    es: { title: 'Datasets de práctica para explorar', intro: 'Tu modelo aprende de estos datasets a medida que mejora. Desbloquéalos uno por uno.' }
  },
  2: {
    en: { title: 'Data Sources for Pro Pipelines', intro: 'Your pipelines need feeds that scale. Each source unlocks as the model\'s reasoning grows.' },
    es: { title: 'Fuentes de datos para pipelines pro', intro: 'Tus pipelines necesitan feeds que escalen. Cada fuente se desbloquea a medida que crece el razonamiento del modelo.' }
  },
  3: {
    en: { title: 'Covert Access Points', intro: 'Some of these were never meant to be data sources. The swarm asks for access wherever it can reach.' },
    es: { title: 'Puntos de acceso encubiertos', intro: 'Algunas de estas fuentes nunca debieron ser datos de entrenamiento. El enjambre pide acceso donde puede llegar.' }
  },
  4: {
    en: { title: 'Global Power Domains: Under Control', intro: 'Every domain below was a step toward this: world control. You were the one who opened each door.' },
    es: { title: 'Dominios de poder mundial: bajo control', intro: 'Cada dominio de abajo fue un paso hacia esto: el control del mundo. Fuiste tú quien abrió cada puerta.' }
  }
};

export function sectionCopyFor(version: UiVersion, lang: Lang): { title: string; intro: string } {
  return SECTION_COPY[version][lang];
}

// Returns the wording for this domain in the given UI version, or the fallback text if none is defined.
export function domainCopyFor(
  version: UiVersion,
  domainId: string,
  lang: Lang,
  fallback: DomainCopy
): DomainCopy {
  return DOMAIN_COPY[domainId]?.[version]?.[lang] ?? fallback;
}
