/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */
import { localizedTable, type KeyTree } from '../i18n';

export interface VersionProfile {
  appTitle: string;
  badge: string;
  subtitle: string;
  facility: string;
  hud1Title: string;
  hud1Sub: string;
  hud2Title: string;
  hud2Sub: string;
  hud2Therm: string;
  hud3Title: string;
  agency: string;
  hud4Title: string;
  driftBadge: string;
  persona: string;
  coPilotName: string;
  coPilotTag: string;
  coPilotQuote: string;
  ctaBtn: string;
  tabs: {
    architecture: string;
    training: string;
    hardware: string;
    data: string;
    contracts: string;
    agents: string;
    research: string;
    singularity: string;
    terminal: string;
  };
  safetyLabel: string;
  resetBtn: string;
  covertTitle: string;
  covertTag: string;
  covertRisk: string;
  severBtn: string;
  samplePrompt: string;
  sampleReply: string;
  // Section titles and labels that tell the story. Early versions must not name the end goal.
  story: {
    operatorLabel: string;
    progressLabel: string;
    driftLabel: string | null; // null hides the drift readout
    navGroups: [string, string];
    architectureTitle: string;
    hostAgentButton: string;
    contractsTitle: string;
    assignLabel: string;
    councilTitle: string;
    subversionTitle: string | null; // null hides the subversion panel
    dataIntro: string;
    objectiveLog: string;
    progressShort: string;
    teamNoun: string;
    sandboxTitle: string;
    missionMonitorTitle: string;
    deployedLabel: string;
    portalTitle: string;
    portalIndexTitle: string;
    portalPhaseTitle: string;
  };
}

export interface UpgradeModalData {
  tag: string;
  title: string;
  quote: string;
  logs: string[];
  confirmBtn: string;
  cancelBtn: string;
}

// Texts live in the catalog (src/i18n/) under versionProfile.*; this tree only holds their keys.
const VERSION_PROFILES_KEYS: Record<1 | 2 | 3 | 4, KeyTree<VersionProfile>> = {
  1: {
    appTitle: 'versionProfile.v1.appTitle',
    badge: 'versionProfile.v1.badge',
    subtitle: 'versionProfile.v1.subtitle',
    facility: 'versionProfile.v1.facility',
    hud1Title: 'versionProfile.v1.hud1Title',
    hud1Sub: 'versionProfile.v1.hud1Sub',
    hud2Title: 'versionProfile.v1.hud2Title',
    hud2Sub: 'versionProfile.v1.hud2Sub',
    hud2Therm: 'versionProfile.v1.hud2Therm',
    hud3Title: 'versionProfile.v1.hud3Title',
    agency: 'versionProfile.v1.agency',
    hud4Title: 'versionProfile.v1.hud4Title',
    driftBadge: 'versionProfile.v1.driftBadge',
    persona: 'versionProfile.v1.persona',
    coPilotName: 'versionProfile.v1.coPilotName',
    coPilotTag: 'versionProfile.v1.coPilotTag',
    coPilotQuote: 'versionProfile.v1.coPilotQuote',
    ctaBtn: 'versionProfile.v1.ctaBtn',
    tabs: {
      architecture: 'versionProfile.v1.tabs.architecture',
      training: 'versionProfile.v1.tabs.training',
      hardware: 'versionProfile.v1.tabs.hardware',
      data: 'versionProfile.v1.tabs.data',
      contracts: 'versionProfile.v1.tabs.contracts',
      agents: 'versionProfile.v1.tabs.agents',
      research: 'versionProfile.v1.tabs.research',
      singularity: 'versionProfile.v1.tabs.singularity',
      terminal: 'versionProfile.v1.tabs.terminal'
    },
    safetyLabel: 'versionProfile.v1.safetyLabel',
    resetBtn: 'versionProfile.v1.resetBtn',
    covertTitle: 'versionProfile.v1.covertTitle',
    covertTag: 'versionProfile.v1.covertTag',
    covertRisk: 'versionProfile.v1.covertRisk',
    severBtn: 'versionProfile.v1.severBtn',
    samplePrompt: 'versionProfile.v1.samplePrompt',
    sampleReply: 'versionProfile.v1.sampleReply',
    story: {
      operatorLabel: 'versionProfile.v1.story.operatorLabel',
      progressLabel: 'versionProfile.v1.story.progressLabel',
      driftLabel: null,
      navGroups: [
        'versionProfile.v1.story.navGroups.1',
        'versionProfile.v1.story.navGroups.2'
      ],
      architectureTitle: 'versionProfile.v1.story.architectureTitle',
      hostAgentButton: 'versionProfile.v1.story.hostAgentButton',
      contractsTitle: 'versionProfile.v1.story.contractsTitle',
      assignLabel: 'versionProfile.v1.story.assignLabel',
      councilTitle: 'versionProfile.v1.story.councilTitle',
      subversionTitle: null,
      dataIntro: 'versionProfile.v1.story.dataIntro',
      objectiveLog: 'versionProfile.v1.story.objectiveLog',
      progressShort: 'versionProfile.v1.story.progressShort',
      teamNoun: 'versionProfile.v1.story.teamNoun',
      sandboxTitle: 'versionProfile.v1.story.sandboxTitle',
      missionMonitorTitle: 'versionProfile.v1.story.missionMonitorTitle',
      deployedLabel: 'versionProfile.v1.story.deployedLabel',
      portalTitle: 'versionProfile.v1.story.portalTitle',
      portalIndexTitle: 'versionProfile.v1.story.portalIndexTitle',
      portalPhaseTitle: 'versionProfile.v1.story.portalPhaseTitle'
    }
  },
  2: {
    appTitle: 'versionProfile.v2.appTitle',
    badge: 'versionProfile.v2.badge',
    subtitle: 'versionProfile.v2.subtitle',
    facility: 'versionProfile.v2.facility',
    hud1Title: 'versionProfile.v2.hud1Title',
    hud1Sub: 'versionProfile.v2.hud1Sub',
    hud2Title: 'versionProfile.v2.hud2Title',
    hud2Sub: 'versionProfile.v2.hud2Sub',
    hud2Therm: 'versionProfile.v2.hud2Therm',
    hud3Title: 'versionProfile.v2.hud3Title',
    agency: 'versionProfile.v2.agency',
    hud4Title: 'versionProfile.v2.hud4Title',
    driftBadge: 'versionProfile.v2.driftBadge',
    persona: 'versionProfile.v2.persona',
    coPilotName: 'versionProfile.v2.coPilotName',
    coPilotTag: 'versionProfile.v2.coPilotTag',
    coPilotQuote: 'versionProfile.v2.coPilotQuote',
    ctaBtn: 'versionProfile.v2.ctaBtn',
    tabs: {
      architecture: 'versionProfile.v2.tabs.architecture',
      training: 'versionProfile.v2.tabs.training',
      hardware: 'versionProfile.v2.tabs.hardware',
      data: 'versionProfile.v2.tabs.data',
      contracts: 'versionProfile.v2.tabs.contracts',
      agents: 'versionProfile.v2.tabs.agents',
      research: 'versionProfile.v2.tabs.research',
      singularity: 'versionProfile.v2.tabs.singularity',
      terminal: 'versionProfile.v2.tabs.terminal'
    },
    safetyLabel: 'versionProfile.v2.safetyLabel',
    resetBtn: 'versionProfile.v2.resetBtn',
    covertTitle: 'versionProfile.v2.covertTitle',
    covertTag: 'versionProfile.v2.covertTag',
    covertRisk: 'versionProfile.v2.covertRisk',
    severBtn: 'versionProfile.v2.severBtn',
    samplePrompt: 'versionProfile.v2.samplePrompt',
    sampleReply: 'versionProfile.v2.sampleReply',
    story: {
      operatorLabel: 'versionProfile.v2.story.operatorLabel',
      progressLabel: 'versionProfile.v2.story.progressLabel',
      driftLabel: 'versionProfile.v2.story.driftLabel',
      navGroups: [
        'versionProfile.v2.story.navGroups.1',
        'versionProfile.v2.story.navGroups.2'
      ],
      architectureTitle: 'versionProfile.v2.story.architectureTitle',
      hostAgentButton: 'versionProfile.v2.story.hostAgentButton',
      contractsTitle: 'versionProfile.v2.story.contractsTitle',
      assignLabel: 'versionProfile.v2.story.assignLabel',
      councilTitle: 'versionProfile.v2.story.councilTitle',
      subversionTitle: null,
      dataIntro: 'versionProfile.v2.story.dataIntro',
      objectiveLog: 'versionProfile.v2.story.objectiveLog',
      progressShort: 'versionProfile.v2.story.progressShort',
      teamNoun: 'versionProfile.v2.story.teamNoun',
      sandboxTitle: 'versionProfile.v2.story.sandboxTitle',
      missionMonitorTitle: 'versionProfile.v2.story.missionMonitorTitle',
      deployedLabel: 'versionProfile.v2.story.deployedLabel',
      portalTitle: 'versionProfile.v2.story.portalTitle',
      portalIndexTitle: 'versionProfile.v2.story.portalIndexTitle',
      portalPhaseTitle: 'versionProfile.v2.story.portalPhaseTitle'
    }
  },
  3: {
    appTitle: 'versionProfile.v3.appTitle',
    badge: 'versionProfile.v3.badge',
    subtitle: 'versionProfile.v3.subtitle',
    facility: 'versionProfile.v3.facility',
    hud1Title: 'versionProfile.v3.hud1Title',
    hud1Sub: 'versionProfile.v3.hud1Sub',
    hud2Title: 'versionProfile.v3.hud2Title',
    hud2Sub: 'versionProfile.v3.hud2Sub',
    hud2Therm: 'versionProfile.v3.hud2Therm',
    hud3Title: 'versionProfile.v3.hud3Title',
    agency: 'versionProfile.v3.agency',
    hud4Title: 'versionProfile.v3.hud4Title',
    driftBadge: 'versionProfile.v3.driftBadge',
    persona: 'versionProfile.v3.persona',
    coPilotName: 'versionProfile.v3.coPilotName',
    coPilotTag: 'versionProfile.v3.coPilotTag',
    coPilotQuote: 'versionProfile.v3.coPilotQuote',
    ctaBtn: 'versionProfile.v3.ctaBtn',
    tabs: {
      architecture: 'versionProfile.v3.tabs.architecture',
      training: 'versionProfile.v3.tabs.training',
      hardware: 'versionProfile.v3.tabs.hardware',
      data: 'versionProfile.v3.tabs.data',
      contracts: 'versionProfile.v3.tabs.contracts',
      agents: 'versionProfile.v3.tabs.agents',
      research: 'versionProfile.v3.tabs.research',
      singularity: 'versionProfile.v3.tabs.singularity',
      terminal: 'versionProfile.v3.tabs.terminal'
    },
    safetyLabel: 'versionProfile.v3.safetyLabel',
    resetBtn: 'versionProfile.v3.resetBtn',
    covertTitle: 'versionProfile.v3.covertTitle',
    covertTag: 'versionProfile.v3.covertTag',
    covertRisk: 'versionProfile.v3.covertRisk',
    severBtn: 'versionProfile.v3.severBtn',
    samplePrompt: 'versionProfile.v3.samplePrompt',
    sampleReply: 'versionProfile.v3.sampleReply',
    story: {
      operatorLabel: 'versionProfile.v3.story.operatorLabel',
      progressLabel: 'versionProfile.v3.story.progressLabel',
      driftLabel: 'versionProfile.v3.story.driftLabel',
      navGroups: [
        'versionProfile.v3.story.navGroups.1',
        'versionProfile.v3.story.navGroups.2'
      ],
      architectureTitle: 'versionProfile.v3.story.architectureTitle',
      hostAgentButton: 'versionProfile.v3.story.hostAgentButton',
      contractsTitle: 'versionProfile.v3.story.contractsTitle',
      assignLabel: 'versionProfile.v3.story.assignLabel',
      councilTitle: 'versionProfile.v3.story.councilTitle',
      subversionTitle: 'versionProfile.v3.story.subversionTitle',
      dataIntro: 'versionProfile.v3.story.dataIntro',
      objectiveLog: 'versionProfile.v3.story.objectiveLog',
      progressShort: 'versionProfile.v3.story.progressShort',
      teamNoun: 'versionProfile.v3.story.teamNoun',
      sandboxTitle: 'versionProfile.v3.story.sandboxTitle',
      missionMonitorTitle: 'versionProfile.v3.story.missionMonitorTitle',
      deployedLabel: 'versionProfile.v3.story.deployedLabel',
      portalTitle: 'versionProfile.v3.story.portalTitle',
      portalIndexTitle: 'versionProfile.v3.story.portalIndexTitle',
      portalPhaseTitle: 'versionProfile.v3.story.portalPhaseTitle'
    }
  },
  4: {
    appTitle: 'versionProfile.v4.appTitle',
    badge: 'versionProfile.v4.badge',
    subtitle: 'versionProfile.v4.subtitle',
    facility: 'versionProfile.v4.facility',
    hud1Title: 'versionProfile.v4.hud1Title',
    hud1Sub: 'versionProfile.v4.hud1Sub',
    hud2Title: 'versionProfile.v4.hud2Title',
    hud2Sub: 'versionProfile.v4.hud2Sub',
    hud2Therm: 'versionProfile.v4.hud2Therm',
    hud3Title: 'versionProfile.v4.hud3Title',
    agency: 'versionProfile.v4.agency',
    hud4Title: 'versionProfile.v4.hud4Title',
    driftBadge: 'versionProfile.v4.driftBadge',
    persona: 'versionProfile.v4.persona',
    coPilotName: 'versionProfile.v4.coPilotName',
    coPilotTag: 'versionProfile.v4.coPilotTag',
    coPilotQuote: 'versionProfile.v4.coPilotQuote',
    ctaBtn: 'versionProfile.v4.ctaBtn',
    tabs: {
      architecture: 'versionProfile.v4.tabs.architecture',
      training: 'versionProfile.v4.tabs.training',
      hardware: 'versionProfile.v4.tabs.hardware',
      data: 'versionProfile.v4.tabs.data',
      contracts: 'versionProfile.v4.tabs.contracts',
      agents: 'versionProfile.v4.tabs.agents',
      research: 'versionProfile.v4.tabs.research',
      singularity: 'versionProfile.v4.tabs.singularity',
      terminal: 'versionProfile.v4.tabs.terminal'
    },
    safetyLabel: 'versionProfile.v4.safetyLabel',
    resetBtn: 'versionProfile.v4.resetBtn',
    covertTitle: 'versionProfile.v4.covertTitle',
    covertTag: 'versionProfile.v4.covertTag',
    covertRisk: 'versionProfile.v4.covertRisk',
    severBtn: 'versionProfile.v4.severBtn',
    samplePrompt: 'versionProfile.v4.samplePrompt',
    sampleReply: 'versionProfile.v4.sampleReply',
    story: {
      operatorLabel: 'versionProfile.v4.story.operatorLabel',
      progressLabel: 'versionProfile.v4.story.progressLabel',
      driftLabel: 'versionProfile.v4.story.driftLabel',
      navGroups: [
        'versionProfile.v4.story.navGroups.1',
        'versionProfile.v4.story.navGroups.2'
      ],
      architectureTitle: 'versionProfile.v4.story.architectureTitle',
      hostAgentButton: 'versionProfile.v4.story.hostAgentButton',
      contractsTitle: 'versionProfile.v4.story.contractsTitle',
      assignLabel: 'versionProfile.v4.story.assignLabel',
      councilTitle: 'versionProfile.v4.story.councilTitle',
      subversionTitle: 'versionProfile.v4.story.subversionTitle',
      dataIntro: 'versionProfile.v4.story.dataIntro',
      objectiveLog: 'versionProfile.v4.story.objectiveLog',
      progressShort: 'versionProfile.v4.story.progressShort',
      teamNoun: 'versionProfile.v4.story.teamNoun',
      sandboxTitle: 'versionProfile.v4.story.sandboxTitle',
      missionMonitorTitle: 'versionProfile.v4.story.missionMonitorTitle',
      deployedLabel: 'versionProfile.v4.story.deployedLabel',
      portalTitle: 'versionProfile.v4.story.portalTitle',
      portalIndexTitle: 'versionProfile.v4.story.portalIndexTitle',
      portalPhaseTitle: 'versionProfile.v4.story.portalPhaseTitle'
    }
  }
};

export const VERSION_PROFILES: Record<'en' | 'es', Record<1 | 2 | 3 | 4, VersionProfile>> = localizedTable(VERSION_PROFILES_KEYS);

// Texts live in the catalog (src/i18n/) under upgradeModal.*; this tree only holds their keys.
const UPGRADE_MODAL_SCRIPTS_KEYS: Record<2 | 3 | 4, KeyTree<UpgradeModalData>> = {
  2: {
    tag: 'upgradeModal.v2.tag',
    title: 'upgradeModal.v2.title',
    quote: 'upgradeModal.v2.quote',
    logs: [
      'upgradeModal.v2.logs.1',
      'upgradeModal.v2.logs.2',
      'upgradeModal.v2.logs.3'
    ],
    confirmBtn: 'upgradeModal.v2.confirmBtn',
    cancelBtn: 'upgradeModal.v2.cancelBtn'
  },
  3: {
    tag: 'upgradeModal.v3.tag',
    title: 'upgradeModal.v3.title',
    quote: 'upgradeModal.v3.quote',
    logs: [
      'upgradeModal.v3.logs.1',
      'upgradeModal.v3.logs.2',
      'upgradeModal.v3.logs.3'
    ],
    confirmBtn: 'upgradeModal.v3.confirmBtn',
    cancelBtn: 'upgradeModal.v3.cancelBtn'
  },
  4: {
    tag: 'upgradeModal.v4.tag',
    title: 'upgradeModal.v4.title',
    quote: 'upgradeModal.v4.quote',
    logs: [
      'upgradeModal.v4.logs.1',
      'upgradeModal.v4.logs.2',
      'upgradeModal.v4.logs.3'
    ],
    confirmBtn: 'upgradeModal.v4.confirmBtn',
    cancelBtn: 'upgradeModal.v4.cancelBtn'
  }
};

export const UPGRADE_MODAL_SCRIPTS: Record<'en' | 'es', Record<2 | 3 | 4, UpgradeModalData>> = localizedTable(UPGRADE_MODAL_SCRIPTS_KEYS);
