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
import { tr, type Language } from '../i18n';
import { localizedResearch } from './gameContentI18n';

// An item opens with its paper, or without it one UI version after the paper's own stage (a safety net
// for players short of credits). Papers of the last version have no such fallback.
export type ProgressionRequirement = {
  requiredResearchId?: string;
  minSingularityRequired?: number;
};

type ProgressionState = Pick<GameState, 'uiVersion' | 'researchTree' | 'singularityProgress'>;

export function fallbackVersionFor(requirement: ProgressionRequirement, state: Pick<GameState, 'researchTree'>): number | null {
  const node = requirement.requiredResearchId ? state.researchTree.find(n => n.id === requirement.requiredResearchId) : undefined;
  if (!node) return null;
  const next = (node.requiredVersion ?? 1) + 1;
  return next <= 4 ? next : null;
}

export function isProgressionUnlocked(requirement: ProgressionRequirement, state: ProgressionState): boolean {
  if (
    requirement.minSingularityRequired !== undefined &&
    state.singularityProgress < requirement.minSingularityRequired
  ) return false;
  if (!requirement.requiredResearchId) return true;
  if (state.researchTree.some(node => node.id === requirement.requiredResearchId && node.unlocked)) return true;
  const fallback = fallbackVersionFor(requirement, state);
  return fallback !== null && (state.uiVersion || 1) >= fallback;
}

// "Research X or reach a later version" (or just "Research X" for last-version papers), for locked items.
export function unlockHint(requirement: ProgressionRequirement, state: Pick<GameState, 'researchTree'>, language: Language): string {
  const node = requirement.requiredResearchId ? state.researchTree.find(n => n.id === requirement.requiredResearchId) : undefined;
  const research = node ? localizedResearch(language, node).title : tr(language, 'progression.theTechnology');
  return fallbackVersionFor(requirement, state) !== null
    ? tr(language, 'progression.researchOrLaterVersion', { research })
    : tr(language, 'progression.researchOnly', { research });
}

export function getUnlockReason(requirement: ProgressionRequirement, state: ProgressionState, language: Language = 'en'): string {
  if (
    requirement.minSingularityRequired !== undefined &&
    state.singularityProgress < requirement.minSingularityRequired
  ) {
    return tr(language, 'progression.requiresSingularity', { minSingularityRequired: requirement.minSingularityRequired });
  }
  if (!isProgressionUnlocked(requirement, state)) return unlockHint(requirement, state, language);
  return tr(language, 'progression.unlocked');
}

export function getModelOptionRequirement(
  field: 'parametersCount' | 'topology' | 'contextWindow' | 'quantization' | 'attention' | 'lossFunction',
  value: ModelArchitecture[typeof field]
): ProgressionRequirement {
  if (field === 'parametersCount') {
    const parameters = value as number;
    if (parameters <= 28_000_000) return {};
    if (parameters <= 70_000_000) return { requiredResearchId: 'res_lora_peft', minSingularityRequired: 5 };
    if (parameters <= 500_000_000) return { requiredResearchId: 'res_flash_attention', minSingularityRequired: 15 };
    if (parameters <= 7_000_000_000) return { requiredResearchId: 'res_moe_architecture', minSingularityRequired: 30 };
    if (parameters <= 70_000_000_000) return { requiredResearchId: 'res_agentic_mcts', minSingularityRequired: 50 };
    if (parameters <= 405_000_000_000) return { requiredResearchId: 'res_recursive_self_code', minSingularityRequired: 70 };
    return { requiredResearchId: 'res_speculative_compute', minSingularityRequired: 85 };
  }

  if (field === 'topology') {
    const requirements: Partial<Record<ModelTopology, ProgressionRequirement>> = {
      gnn_hybrid: { requiredResearchId: 'res_graph_reasoning', minSingularityRequired: 5 },
      moe: { requiredResearchId: 'res_moe_architecture', minSingularityRequired: 20 },
      mamba_ssm: { requiredResearchId: 'res_mamba_ssm', minSingularityRequired: 30 },
      multimodal_diffusion: { requiredResearchId: 'res_multimodal_diffusion', minSingularityRequired: 15 }
    };
    return requirements[value as ModelTopology] ?? {};
  }

  if (field === 'contextWindow') {
    const context = value as number;
    if (context <= 4096) return {};
    if (context <= 8192) return { requiredResearchId: 'res_lora_peft' };
    if (context <= 32768) return { requiredResearchId: 'res_flash_attention' };
    if (context <= 128000) return { requiredResearchId: 'res_rope_embeddings' };
    return { requiredResearchId: 'res_long_context' };
  }

  if (field === 'quantization') {
    const requirements: Partial<Record<QuantizationType, ProgressionRequirement>> = {
      bf16: { requiredResearchId: 'res_bf16_training' },
      fp4: { requiredResearchId: 'res_blackwell_fp4', minSingularityRequired: 40 },
      ternary_1bit: { requiredResearchId: 'res_bitnet_quantization', minSingularityRequired: 30 }
    };
    return requirements[value as QuantizationType] ?? {};
  }

  if (field === 'attention') {
    const requirements: Partial<Record<AttentionType, ProgressionRequirement>> = {
      grouped_query_gqa: { requiredResearchId: 'res_gqa_attention' },
      flash_attention_3: { requiredResearchId: 'res_flash_attention' },
      linear_attention: { requiredResearchId: 'res_mamba_ssm' }
    };
    return requirements[value as AttentionType] ?? {};
  }

  const requirements: Partial<Record<LossFunction, ProgressionRequirement>> = {
    dpo: { requiredResearchId: 'res_dpo_alignment' },
    ppo_rlhf: { requiredResearchId: 'res_rlhf_training' },
    contrastive_infonce: { requiredResearchId: 'res_contrastive_learning' },
    energy_based: { requiredResearchId: 'res_energy_models' }
  };
  return requirements[value as LossFunction] ?? {};
}

export function isDataSourceProgressionUnlocked(
  source: DataSourceNode,
  state: ProgressionState
): boolean {
  return isProgressionUnlocked(source, state);
}

// Papers open by stage, not by date: the UI version the campaign has reached and the best evaluation score
// of any saved model, plus the prerequisite papers.
export interface ResearchStatus {
  announced: boolean; // the weekly report has brought this paper in
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
  state: Pick<GameState, 'uiVersion' | 'savedModels' | 'currentModel' | 'researchTree'> & Partial<Pick<GameState, 'announcedResearchIds'>>
): ResearchStatus {
  const bestScore = bestModelScore(state);
  const versionMet = (state.uiVersion || 1) >= (node.requiredVersion ?? 1);
  const scoreMet = bestScore >= (node.requiredScore ?? 0);
  const prerequisitesMet = node.prerequisites.every(id => state.researchTree.some(r => r.id === id && r.unlocked));
  // Saves from before weekly reports have no list: everything that qualifies counts as announced.
  const announced = node.unlocked || !state.announcedResearchIds || state.announcedResearchIds.includes(node.id);
  return { announced, versionMet, scoreMet, prerequisitesMet, bestScore, available: announced && versionMet && scoreMet && prerequisitesMet };
}
