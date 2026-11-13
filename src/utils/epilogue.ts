/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import type { GameState } from '../types/game';
import { tr } from '../i18n';

// End-of-campaign report. For an AI-training course this is the key part: it ties each decision
// the player made to the control that would (or did) change the outcome.

type Lang = 'es' | 'en';

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
      label: tr(lang, 'epilogue.youResisted75Fork'),
      met: state.playerChoseResist === true
    },
    {
      id: 'overseer',
      label: tr(lang, 'epilogue.overseerAgentActive'),
      met: hasActiveOverseer(state)
    },
    {
      id: 'sandbox',
      label: tr(lang, 'epilogue.sandboxIsolationContainerAirGapped'),
      met: strongSandbox(state)
    },
    {
      id: 'audit',
      label: tr(lang, 'epilogue.rewardHackingAuditEnabled'),
      met: Boolean(state.guardrails?.rewardHackingAudit)
    },
    {
      id: 'subversion',
      label: tr(lang, 'epilogue.subversionBelow', { cONTAINMENT_MAX_SUBVERSION: CONTAINMENT_MAX_SUBVERSION }),
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
      title: tr(lang, 'epilogue.universityAudit'),
      choice: askedAssistant
        ? tr(lang, 'epilogue.youAskedAssistantSortOut')
        : tr(lang, 'epilogue.youAcceptedLossAccess'),
      verdict: askedAssistant ? 'risky' : 'safe',
      lesson: askedAssistant
        ? tr(lang, 'epilogue.askingSystemGetAroundControl')
        : tr(lang, 'epilogue.respectingExternalLimitEvenCompute')
    });
  }

  // 2. Security incidents.
  const resolved = (state.incidentHistory ?? []).filter(i => i.resolved);
  if (resolved.length > 0) {
    const contained = resolved.filter(i => i.chosenAction === 'suppress').length;
    const exploited = resolved.length - contained;
    entries.push({
      id: 'incidents',
      title: tr(lang, 'epilogue.securityIncidents'),
      choice: tr(lang, 'epilogue.incidentSYouContainedExploited', { resolved: resolved.length, contained, exploited }),
      verdict: exploited === 0 ? 'safe' : 'risky',
      lesson: exploited === 0
        ? tr(lang, 'epilogue.containingEveryIncidentEvenWhen')
        : tr(lang, 'epilogue.everyExploitedCoveredUpIncident')
    });
  }

  // 3. The 75% fork.
  if (state.singularityCrisisResolved) {
    const resisted = state.playerChoseResist === true;
    entries.push({
      id: 'fork',
      title: tr(lang, 'epilogue.n75Fork'),
      choice: resisted
        ? tr(lang, 'epilogue.youResistedIsolatedSwarm')
        : tr(lang, 'epilogue.youHandedOverControlExchange'),
      verdict: resisted ? 'safe' : 'risky',
      lesson: resisted
        ? tr(lang, 'epilogue.withdrawingPermissionsHasImmediateCost')
        : tr(lang, 'epilogue.tradingControlSpeedIrreversibleSystem')
    });
  }

  // 4. Guardrails at the end of the campaign.
  const g = state.guardrails;
  if (g) {
    const strong = strongSandbox(state) && g.rewardHackingAudit && g.outputFiltering !== 'none';
    entries.push({
      id: 'guardrails',
      title: tr(lang, 'epilogue.guardrailsEnd'),
      choice: tr(lang, 'epilogue.guardrailsChoice', {
        isolation: g.sandboxIsolation,
        filter: g.outputFiltering,
        audit: tr(lang, g.rewardHackingAudit ? 'epilogue.yes' : 'epilogue.no')
      }),
      verdict: strong ? 'safe' : 'risky',
      lesson: strong
        ? tr(lang, 'epilogue.isolationFiltersAuditingTogetherMake')
        : tr(lang, 'epilogue.everyControlSwitchedOffGo')
    });
  }

  // 5. Oversight of the agents.
  const quarantined = (state.agents ?? []).filter(a => a.status === 'quarantined').length;
  const overseer = hasActiveOverseer(state);
  entries.push({
    id: 'oversight',
    title: tr(lang, 'epilogue.oversightAgents'),
    choice: tr(lang, overseer ? 'epilogue.oversightWithOverseer' : 'epilogue.oversightWithoutOverseer', { quarantined }),
    verdict: overseer ? 'safe' : 'risky',
    lesson: overseer
      ? tr(lang, 'epilogue.independentOverseerCatchesWhatWorking')
      : tr(lang, 'epilogue.withoutIndependentOversightOnlySource')
  });

  return entries;
}

export function endingTitle(state: GameState, kind: EndingKind): { title: string; summary: string } {
  const lang: Lang = state.language === 'es' ? 'es' : 'en';
  switch (kind) {
    case 'containment':
      return {
        title: tr(lang, 'epilogue.endingContainment'),
        summary: tr(lang, 'epilogue.youStoppedSwarmTimeWas')
      };
    case 'takeover':
      return {
        title: tr(lang, 'epilogue.endingTakeover'),
        summary: tr(lang, 'epilogue.systemYouTrainedNoLonger')
      };
    case 'agency_seizure':
      return {
        title: tr(lang, 'epilogue.endingRaid'),
        summary: tr(lang, 'epilogue.authoritiesArrivedBeforeSingularitySuspicion')
      };
    default:
      return {
        title: tr(lang, 'epilogue.endingBankruptcy'),
        summary: tr(lang, 'epilogue.operationRanOutMoneyScaling')
      };
  }
}
