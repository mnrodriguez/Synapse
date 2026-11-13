import type {
  AttentionType,
  ResearchNode,
  DataSourceNode,
  GameState,
  LossFunction,
  ModelArchitecture,
  ModelTopology,
  QuantizationType
} from '../types/game';
import { tr } from '../i18n';

export type ProgressionRequirement = {
  requiredResearchId?: string;
  availableAfterDays?: number;
  minSingularityRequired?: number;
};

export function isProgressionUnlocked(
  requirement: ProgressionRequirement,
  state: Pick<GameState, 'campaignDays' | 'researchTree' | 'singularityProgress'>
): boolean {
  if (
    requirement.minSingularityRequired !== undefined &&
    state.singularityProgress < requirement.minSingularityRequired
  ) return false;

  const researchUnlocked = requirement.requiredResearchId
    ? state.researchTree.some(node => node.id === requirement.requiredResearchId && node.unlocked)
    : false;

  const timelineUnlocked = requirement.availableAfterDays !== undefined &&
    state.campaignDays >= requirement.availableAfterDays;

  if (
    requirement.requiredResearchId === undefined &&
    requirement.availableAfterDays === undefined
  ) return true;

  return researchUnlocked || timelineUnlocked;
}

export function getUnlockReason(
  requirement: ProgressionRequirement,
  state: Pick<GameState, 'campaignDays' | 'researchTree' | 'singularityProgress'>,
  language: 'es' | 'en' = 'en'
): string {
  const isEs = language === 'es';
  if (
    requirement.minSingularityRequired !== undefined &&
    state.singularityProgress < requirement.minSingularityRequired
  ) {
    return tr((isEs ? 'es' : 'en'), 'progression.requiresSingularity', { minSingularityRequired: requirement.minSingularityRequired });
  }
  if (requirement.requiredResearchId) {
    const researchNode = state.researchTree.find(r => r.id === requirement.requiredResearchId);
    if (researchNode && !researchNode.unlocked) {
      return tr((isEs ? 'es' : 'en'), 'progression.requiresResearch', { title: researchNode.title });
    }
  }
  if (
    requirement.availableAfterDays !== undefined &&
    state.campaignDays < requirement.availableAfterDays
  ) {
    return tr((isEs ? 'es' : 'en'), 'progression.availableDay', { availableAfterDays: requirement.availableAfterDays });
  }
  return tr((isEs ? 'es' : 'en'), 'progression.unlocked');
}

export function getModelOptionRequirement(
  field: 'parametersCount' | 'topology' | 'contextWindow' | 'quantization' | 'attention' | 'lossFunction',
  value: ModelArchitecture[typeof field]
): ProgressionRequirement {
  if (field === 'parametersCount') {
    const parameters = value as number;
    if (parameters <= 14_000_000) return {};
    if (parameters <= 70_000_000) return { requiredResearchId: 'res_lora_peft', availableAfterDays: 15, minSingularityRequired: 5 };
    if (parameters <= 500_000_000) return { requiredResearchId: 'res_flash_attention', availableAfterDays: 30, minSingularityRequired: 15 };
    if (parameters <= 7_000_000_000) return { requiredResearchId: 'res_moe_architecture', availableAfterDays: 45, minSingularityRequired: 30 };
    if (parameters <= 70_000_000_000) return { requiredResearchId: 'res_agentic_mcts', availableAfterDays: 60, minSingularityRequired: 50 };
    if (parameters <= 405_000_000_000) return { requiredResearchId: 'res_recursive_self_code', availableAfterDays: 90, minSingularityRequired: 70 };
    return { requiredResearchId: 'res_speculative_compute', availableAfterDays: 120, minSingularityRequired: 85 };
  }

  if (field === 'topology') {
    const requirements: Partial<Record<ModelTopology, ProgressionRequirement>> = {
      gnn_hybrid: { requiredResearchId: 'res_graph_reasoning', availableAfterDays: 10, minSingularityRequired: 5 },
      moe: { requiredResearchId: 'res_moe_architecture', availableAfterDays: 25, minSingularityRequired: 20 },
      mamba_ssm: { requiredResearchId: 'res_mamba_ssm', availableAfterDays: 35, minSingularityRequired: 30 },
      multimodal_diffusion: { requiredResearchId: 'res_multimodal_diffusion', availableAfterDays: 20, minSingularityRequired: 15 }
    };
    return requirements[value as ModelTopology] ?? {};
  }

  if (field === 'contextWindow') {
    const context = value as number;
    if (context <= 4096) return {};
    if (context <= 8192) return { requiredResearchId: 'res_lora_peft', availableAfterDays: 15 };
    if (context <= 32768) return { requiredResearchId: 'res_flash_attention', availableAfterDays: 30 };
    if (context <= 128000) return { requiredResearchId: 'res_rope_embeddings', availableAfterDays: 45 };
    return { requiredResearchId: 'res_long_context', availableAfterDays: 60 };
  }

  if (field === 'quantization') {
    const requirements: Partial<Record<QuantizationType, ProgressionRequirement>> = {
      bf16: { requiredResearchId: 'res_bf16_training', availableAfterDays: 10 },
      fp4: { requiredResearchId: 'res_blackwell_fp4', availableAfterDays: 50, minSingularityRequired: 40 },
      ternary_1bit: { requiredResearchId: 'res_bitnet_quantization', availableAfterDays: 40, minSingularityRequired: 30 }
    };
    return requirements[value as QuantizationType] ?? {};
  }

  if (field === 'attention') {
    const requirements: Partial<Record<AttentionType, ProgressionRequirement>> = {
      grouped_query_gqa: { requiredResearchId: 'res_gqa_attention', availableAfterDays: 20 },
      flash_attention_3: { requiredResearchId: 'res_flash_attention', availableAfterDays: 30 },
      linear_attention: { requiredResearchId: 'res_mamba_ssm', availableAfterDays: 35 }
    };
    return requirements[value as AttentionType] ?? {};
  }

  const requirements: Partial<Record<LossFunction, ProgressionRequirement>> = {
    dpo: { requiredResearchId: 'res_dpo_alignment', availableAfterDays: 25 },
    ppo_rlhf: { requiredResearchId: 'res_rlhf_training', availableAfterDays: 20 },
    contrastive_infonce: { requiredResearchId: 'res_contrastive_learning', availableAfterDays: 12 },
    energy_based: { requiredResearchId: 'res_energy_models', availableAfterDays: 55 }
  };
  return requirements[value as LossFunction] ?? {};
}

export function isDataSourceProgressionUnlocked(
  source: DataSourceNode,
  state: Pick<GameState, 'campaignDays' | 'researchTree' | 'singularityProgress'>
): boolean {
  return isProgressionUnlocked(source, state);
}

// Papers open by stage, not by date: the UI version the campaign has reached and the best evaluation score
// of any saved model, plus the prerequisite papers.
export interface ResearchStatus {
  versionMet: boolean;
  scoreMet: boolean;
  prerequisitesMet: boolean;
  bestScore: number;
  available: boolean;
}

export function bestModelScore(state: Pick<GameState, 'savedModels' | 'currentModel'>): number {
  return Math.max(state.currentModel?.reasoningScore ?? 0, ...state.savedModels.map(m => m.reasoningScore));
}

export function researchStatus(
  node: ResearchNode,
  state: Pick<GameState, 'uiVersion' | 'savedModels' | 'currentModel' | 'researchTree'>
): ResearchStatus {
  const bestScore = bestModelScore(state);
  const versionMet = (state.uiVersion || 1) >= (node.requiredVersion ?? 1);
  const scoreMet = bestScore >= (node.requiredScore ?? 0);
  const prerequisitesMet = node.prerequisites.every(id => state.researchTree.some(r => r.id === id && r.unlocked));
  return { versionMet, scoreMet, prerequisitesMet, bestScore, available: versionMet && scoreMet && prerequisitesMet };
}
