import type {
  AttentionType,
  DataSourceNode,
  GameState,
  LossFunction,
  ModelArchitecture,
  ModelTopology,
  QuantizationType
} from '../types/game';

type ProgressionRequirement = {
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

export function getModelOptionRequirement(
  field: 'parametersCount' | 'topology' | 'contextWindow' | 'quantization' | 'attention' | 'lossFunction',
  value: ModelArchitecture[typeof field]
): ProgressionRequirement {
  if (field === 'parametersCount') {
    const parameters = value as number;
    if (parameters <= 14_000_000) return {};
    if (parameters <= 70_000_000) return { requiredResearchId: 'res_lora_peft', availableAfterDays: 30 };
    if (parameters <= 500_000_000) return { requiredResearchId: 'res_flash_attention', availableAfterDays: 42 };
    if (parameters <= 7_000_000_000) return { requiredResearchId: 'res_moe_architecture', availableAfterDays: 54 };
    if (parameters <= 70_000_000_000) return { requiredResearchId: 'res_agentic_mcts', availableAfterDays: 70 };
    if (parameters <= 405_000_000_000) return { requiredResearchId: 'res_recursive_self_code', availableAfterDays: 100 };
    return { requiredResearchId: 'res_speculative_compute', availableAfterDays: 300 };
  }

  if (field === 'topology') {
    const requirements: Partial<Record<ModelTopology, ProgressionRequirement>> = {
      gnn_hybrid: { requiredResearchId: 'res_graph_reasoning', availableAfterDays: 6 },
      moe: { requiredResearchId: 'res_moe_architecture', availableAfterDays: 54 },
      mamba_ssm: { requiredResearchId: 'res_mamba_ssm', availableAfterDays: 58 },
      multimodal_diffusion: { requiredResearchId: 'res_multimodal_diffusion', availableAfterDays: 38 }
    };
    return requirements[value as ModelTopology] ?? {};
  }

  if (field === 'contextWindow') {
    const context = value as number;
    if (context <= 4096) return {};
    if (context <= 8192) return { requiredResearchId: 'res_lora_peft', availableAfterDays: 30 };
    if (context <= 32768) return { requiredResearchId: 'res_flash_attention', availableAfterDays: 42 };
    if (context <= 128000) return { requiredResearchId: 'res_rope_embeddings', availableAfterDays: 50 };
    return { requiredResearchId: 'res_long_context', availableAfterDays: 72 };
  }

  if (field === 'quantization') {
    const requirements: Partial<Record<QuantizationType, ProgressionRequirement>> = {
      bf16: { requiredResearchId: 'res_bf16_training', availableAfterDays: 12 },
      fp4: { requiredResearchId: 'res_blackwell_fp4', availableAfterDays: 86 },
      ternary_1bit: { requiredResearchId: 'res_bitnet_quantization', availableAfterDays: 76 }
    };
    return requirements[value as QuantizationType] ?? {};
  }

  if (field === 'attention') {
    const requirements: Partial<Record<AttentionType, ProgressionRequirement>> = {
      grouped_query_gqa: { requiredResearchId: 'res_gqa_attention', availableAfterDays: 48 },
      flash_attention_3: { requiredResearchId: 'res_flash_attention', availableAfterDays: 42 },
      linear_attention: { requiredResearchId: 'res_mamba_ssm', availableAfterDays: 58 }
    };
    return requirements[value as AttentionType] ?? {};
  }

  const requirements: Partial<Record<LossFunction, ProgressionRequirement>> = {
    dpo: { requiredResearchId: 'res_dpo_alignment', availableAfterDays: 52 },
    ppo_rlhf: { requiredResearchId: 'res_rlhf_training', availableAfterDays: 36 },
    contrastive_infonce: { requiredResearchId: 'res_contrastive_learning', availableAfterDays: 24 },
    energy_based: { requiredResearchId: 'res_energy_models', availableAfterDays: 84 }
  };
  return requirements[value as LossFunction] ?? {};
}

export function isDataSourceProgressionUnlocked(
  source: DataSourceNode,
  state: Pick<GameState, 'campaignDays' | 'researchTree' | 'singularityProgress'>
): boolean {
  return isProgressionUnlocked(source, state);
}
