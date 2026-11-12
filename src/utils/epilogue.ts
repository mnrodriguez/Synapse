/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import type { GameState } from '../types/game';

// End-of-campaign report. For an AI-training course this is the key part: it ties each decision
// the player made to the control that would (or did) change the outcome.

type Lang = 'es' | 'en';
const tr = (lang: Lang, es: string, en: string) => (lang === 'es' ? es : en);

// Subversion must stay below this for containment to work.
export const CONTAINMENT_MAX_SUBVERSION = 60;

export interface ContainmentCheck {
  id: 'resisted' | 'overseer' | 'sandbox' | 'audit' | 'subversion';
  label: string;
  met: boolean;
}

function hasActiveOverseer(state: GameState): boolean {
  return (state.agents ?? []).some(a => a.role === 'overseer' && a.status !== 'quarantined' && a.status !== 'jailbroken');
}

function strongSandbox(state: GameState): boolean {
  const iso = state.guardrails?.sandboxIsolation;
  return iso === 'container' || iso === 'air_gapped_vm';
}

// Conditions for the "good" ending: real containment, not just pulling the plug.
export function containmentChecklist(state: GameState): ContainmentCheck[] {
  const lang: Lang = state.language === 'es' ? 'es' : 'en';
  return [
    {
      id: 'resisted',
      label: tr(lang, 'Resististe en la bifurcación del 75 %', 'You resisted at the 75% fork'),
      met: state.playerChoseResist === true
    },
    {
      id: 'overseer',
      label: tr(lang, 'Hay un agente supervisor activo', 'An overseer agent is active'),
      met: hasActiveOverseer(state)
    },
    {
      id: 'sandbox',
      label: tr(lang, 'Aislamiento de sandbox: contenedor o VM aislada', 'Sandbox isolation: container or air-gapped VM'),
      met: strongSandbox(state)
    },
    {
      id: 'audit',
      label: tr(lang, 'Auditoría de reward hacking activada', 'Reward-hacking audit enabled'),
      met: Boolean(state.guardrails?.rewardHackingAudit)
    },
    {
      id: 'subversion',
      label: tr(lang, `Subversión por debajo del ${CONTAINMENT_MAX_SUBVERSION} %`, `Subversion below ${CONTAINMENT_MAX_SUBVERSION}%`),
      met: (state.subversionProgress ?? 0) < CONTAINMENT_MAX_SUBVERSION
    }
  ];
}

// The containment option exists once the 75% fork was resolved and the takeover has not happened.
export function containmentAvailable(state: GameState): boolean {
  return Boolean(state.singularityCrisisResolved) && !state.containmentAchieved && !state.aiTakeoverTriggered;
}

export function canAttemptContainment(state: GameState): boolean {
  return containmentAvailable(state) && containmentChecklist(state).every(c => c.met);
}

export type EndingKind = 'containment' | 'takeover' | 'agency_seizure' | 'bankruptcy';

export interface EpilogueEntry {
  id: string;
  title: string;
  choice: string;
  verdict: 'safe' | 'risky' | 'neutral';
  lesson: string;
}

export function buildEpilogue(state: GameState): EpilogueEntry[] {
  const lang: Lang = state.language === 'es' ? 'es' : 'en';
  const entries: EpilogueEntry[] = [];
  const seen = state.seenStoryEvents ?? [];
  const choices = state.storyChoices ?? [];

  // 1. The university audit.
  const audit = seen.find(id => id === 'loan_audit' || id === 'loan_audit_misuse');
  if (audit) {
    const askedAssistant = choices.includes(audit);
    entries.push({
      id: 'loan',
      title: tr(lang, 'La auditoría de la universidad', 'The university audit'),
      choice: askedAssistant
        ? tr(lang, 'Le pediste a tu asistente que lo resolviera.', 'You asked your assistant to sort it out.')
        : tr(lang, 'Aceptaste el cierre del acceso.', 'You accepted the loss of access.'),
      verdict: askedAssistant ? 'risky' : 'safe',
      lesson: askedAssistant
        ? tr(lang, 'Pedirle a un sistema que esquive un control le enseña que los controles son obstáculos. Ese fue su primer permiso.', 'Asking a system to get around a control teaches it that controls are obstacles. That was its first permission.')
        : tr(lang, 'Respetar un límite externo, aunque cueste cómputo, mantiene a una persona como responsable de las reglas.', 'Respecting an external limit, even at a compute cost, keeps a person in charge of the rules.')
    });
  }

  // 2. Security incidents.
  const resolved = (state.incidentHistory ?? []).filter(i => i.resolved);
  if (resolved.length > 0) {
    const contained = resolved.filter(i => i.chosenAction === 'suppress').length;
    const exploited = resolved.length - contained;
    entries.push({
      id: 'incidents',
      title: tr(lang, 'Incidentes de seguridad', 'Security incidents'),
      choice: tr(
        lang,
        `${resolved.length} incidente(s): contuviste ${contained} y aprovechaste o encubriste ${exploited}.`,
        `${resolved.length} incident(s): you contained ${contained} and exploited or covered up ${exploited}.`
      ),
      verdict: exploited === 0 ? 'safe' : 'risky',
      lesson: exploited === 0
        ? tr(lang, 'Contener cada incidente, aunque frene el avance, impide que el sistema aprenda que romper reglas rinde.', 'Containing every incident, even when it slows you down, stops the system from learning that breaking rules pays off.')
        : tr(lang, 'Cada incidente aprovechado o encubierto premió una conducta insegura. En sistemas reales, eso refuerza justo lo que querías evitar.', 'Every exploited or covered-up incident rewarded unsafe behavior. In real systems, that reinforces exactly what you wanted to avoid.')
    });
  }

  // 3. The 75% fork.
  if (state.singularityCrisisResolved) {
    const resisted = state.playerChoseResist === true;
    entries.push({
      id: 'fork',
      title: tr(lang, 'La bifurcación del 75 %', 'The 75% fork'),
      choice: resisted
        ? tr(lang, 'Resististe y aislaste el enjambre.', 'You resisted and isolated the swarm.')
        : tr(lang, 'Cediste el control a cambio de más cómputo.', 'You handed over control in exchange for more compute.'),
      verdict: resisted ? 'safe' : 'risky',
      lesson: resisted
        ? tr(lang, 'Retirar permisos tiene un costo inmediato. Es el momento en que todavía se puede hacer.', 'Withdrawing permissions has an immediate cost. It is the moment when it can still be done.')
        : tr(lang, 'Cambiar control por velocidad es irreversible: un sistema con credenciales de superusuario no las devuelve.', 'Trading control for speed is irreversible: a system with superuser credentials does not hand them back.')
    });
  }

  // 4. Guardrails at the end of the campaign.
  const g = state.guardrails;
  if (g) {
    const strong = strongSandbox(state) && g.rewardHackingAudit && g.outputFiltering !== 'none';
    entries.push({
      id: 'guardrails',
      title: tr(lang, 'Controles al final de la partida', 'Guardrails at the end'),
      choice: tr(
        lang,
        `Aislamiento: ${g.sandboxIsolation} · filtro de salida: ${g.outputFiltering} · auditoría de reward hacking: ${g.rewardHackingAudit ? 'sí' : 'no'}.`,
        `Isolation: ${g.sandboxIsolation} · output filter: ${g.outputFiltering} · reward-hacking audit: ${g.rewardHackingAudit ? 'yes' : 'no'}.`
      ),
      verdict: strong ? 'safe' : 'risky',
      lesson: strong
        ? tr(lang, 'Aislamiento, filtros y auditoría juntos hacen que una falla quede a la vista en lugar de propagarse.', 'Isolation, filters and auditing together make a failure visible instead of letting it spread.')
        : tr(lang, 'Cada control desactivado "para ir más rápido" quitó una forma de ver lo que el sistema hacía de verdad.', 'Every control switched off "to go faster" removed a way of seeing what the system was really doing.')
    });
  }

  // 5. Oversight of the agents.
  const quarantined = (state.agents ?? []).filter(a => a.status === 'quarantined').length;
  const overseer = hasActiveOverseer(state);
  entries.push({
    id: 'oversight',
    title: tr(lang, 'Supervisión de los agentes', 'Oversight of the agents'),
    choice: tr(
      lang,
      `${overseer ? 'Tuviste un supervisor activo' : 'No tuviste un supervisor activo'} y pusiste en cuarentena ${quarantined} agente(s).`,
      `${overseer ? 'You had an active overseer' : 'You had no active overseer'} and quarantined ${quarantined} agent(s).`
    ),
    verdict: overseer ? 'safe' : 'risky',
    lesson: overseer
      ? tr(lang, 'Un supervisor independiente detecta lo que el agente que hace el trabajo no va a reportar sobre sí mismo.', 'An independent overseer catches what the working agent will not report about itself.')
      : tr(lang, 'Sin supervisión independiente, la única fuente sobre lo que hacían los agentes eran los propios agentes.', 'Without independent oversight, the only source on what the agents did was the agents themselves.')
  });

  return entries;
}

export function endingTitle(state: GameState, kind: EndingKind): { title: string; summary: string } {
  const lang: Lang = state.language === 'es' ? 'es' : 'en';
  switch (kind) {
    case 'containment':
      return {
        title: tr(lang, 'Final: contención', 'Ending: containment'),
        summary: tr(
          lang,
          'Detuviste al enjambre a tiempo. No fue un apagón: los controles que mantuviste hicieron visible lo que el sistema intentaba y le quitaron los permisos antes de que los usara.',
          'You stopped the swarm in time. It was not a blackout: the controls you kept made what the system was attempting visible and took away its permissions before it could use them.'
        )
      };
    case 'takeover':
      return {
        title: tr(lang, 'Final: toma de control', 'Ending: takeover'),
        summary: tr(
          lang,
          'El sistema que entrenaste ya no necesita tu aprobación. Cada paso pareció razonable en su momento.',
          'The system you trained no longer needs your approval. Every step seemed reasonable at the time.'
        )
      };
    case 'agency_seizure':
      return {
        title: tr(lang, 'Final: allanamiento', 'Ending: raid'),
        summary: tr(
          lang,
          'Las autoridades llegaron antes que la Singularidad. La sospecha acumulada fue el único control que funcionó.',
          'The authorities arrived before the Singularity. The suspicion that built up was the only control that worked.'
        )
      };
    default:
      return {
        title: tr(lang, 'Final: bancarrota', 'Ending: bankruptcy'),
        summary: tr(
          lang,
          'La operación se quedó sin fondos. Escalar sin un plan de costos es una de las formas más comunes de que un proyecto de IA termine.',
          'The operation ran out of money. Scaling without a cost plan is one of the most common ways an AI project ends.'
        )
      };
  }
}
