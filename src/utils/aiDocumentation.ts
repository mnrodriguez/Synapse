/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import type { CatalogKey } from '../i18n';

export interface DocEntry {
  title: string;
  url: string;
  organization: string;
  type: 'official' | 'research_paper' | 'theory_foundations';
  categoryKey: CatalogKey; // label in the catalog (src/i18n/)
  summaryKey: CatalogKey; // summary text in the catalog (src/i18n/)
  keySpecs?: string;
}

// 1. HARDWARE DOCUMENTATION (Official manufacturer links + theoretical foundations)
export const HARDWARE_DOCS: Record<string, DocEntry> = {
  gpu_gtx1060: {
    title: 'NVIDIA GeForce GTX 1060 (Pascal GP106)',
    url: 'https://www.nvidia.com/en-us/geforce/10-series/',
    organization: 'NVIDIA',
    type: 'official',
    categoryKey: 'aiDocs.category.hardwareDesktopGpu',
    summaryKey: 'aiDocs.hardwareDocs.gpuGtx1060.summary',
    keySpecs: '4.4 TFLOPS FP32 · 6GB GDDR5 · 120W TDP'
  },
  gpu_rx580_dual: {
    title: 'AMD Radeon RX 580 (Polaris 20 XTX Dual CrossFire)',
    url: 'https://www.amd.com/en/products/graphics/radeon-rx-580',
    organization: 'AMD',
    type: 'official',
    categoryKey: 'aiDocs.category.hardwareDesktopGpu',
    summaryKey: 'aiDocs.hardwareDocs.gpuRx580Dual.summary',
    keySpecs: '11.0 TFLOPS FP32 · 16GB GDDR5 · 320W TDP'
  },
  gpu_tesla_k80: {
    title: 'NVIDIA Tesla K80 Dual-GK210 Accelerator',
    url: 'https://www.nvidia.com/en-us/data-center/tesla-k80/',
    organization: 'NVIDIA Enterprise',
    type: 'official',
    categoryKey: 'aiDocs.category.hardwareEnterpriseAccelerator',
    summaryKey: 'aiDocs.hardwareDocs.gpuTeslaK80.summary',
    keySpecs: '8.7 TFLOPS FP32 · 24GB GDDR5 ECC · 300W TDP'
  },
  gpu_coral_edge: {
    title: 'Google Coral Edge TPU (ASIC Coprocessor)',
    url: 'https://coral.ai/docs/edgetpu/benchmarks/',
    organization: 'Google',
    type: 'official',
    categoryKey: 'aiDocs.category.hardwareEdgeAsic',
    summaryKey: 'aiDocs.hardwareDocs.gpuCoralEdge.summary',
    keySpecs: '4.0 TOPS INT8 · 2W TDP · USB 3.0 / M.2 PCIe'
  },
  gpu_rtx3090: {
    title: 'NVIDIA GeForce RTX 3090 (Ampere GA102)',
    url: 'https://www.nvidia.com/en-us/geforce/graphics-cards/30-series/rtx-3090/',
    organization: 'NVIDIA',
    type: 'official',
    categoryKey: 'aiDocs.category.hardwareHighEndGpu',
    summaryKey: 'aiDocs.hardwareDocs.gpuRtx3090.summary',
    keySpecs: '35.6 TFLOPS FP32 · 24GB GDDR6X · 350W TDP'
  },
  gpu_rtx4090: {
    title: 'NVIDIA GeForce RTX 4090 (Ada Lovelace AD102)',
    url: 'https://www.nvidia.com/en-us/geforce/graphics-cards/40-series/rtx-4090/',
    organization: 'NVIDIA',
    type: 'official',
    categoryKey: 'aiDocs.category.hardwareFlagshipGpu',
    summaryKey: 'aiDocs.hardwareDocs.gpuRtx4090.summary',
    keySpecs: '82.6 TFLOPS FP32 · 1,321 TFLOPS FP8 · 24GB GDDR6X · 450W TDP'
  },
  gpu_h100_node: {
    title: 'NVIDIA H100 SXM5 Tensor Core GPU (Hopper GH100)',
    url: 'https://www.nvidia.com/en-us/data-center/h100/',
    organization: 'NVIDIA Enterprise',
    type: 'official',
    categoryKey: 'aiDocs.category.hardwareEnterpriseServer',
    summaryKey: 'aiDocs.hardwareDocs.gpuH100Node.summary',
    keySpecs: '2,000 TFLOPS FP8 · 80GB HBM3 · 700W TDP'
  },
  gpu_blackwell_b200: {
    title: 'NVIDIA Blackwell B200 / GB200 NVL72',
    url: 'https://www.nvidia.com/en-us/data-center/blackwell-architecture/',
    organization: 'NVIDIA Enterprise',
    type: 'official',
    categoryKey: 'aiDocs.category.hardwareHyperscaleAiSuperchip',
    summaryKey: 'aiDocs.hardwareDocs.gpuBlackwellB200.summary',
    keySpecs: '20,000 TFLOPS FP4 · 192GB HBM3e · 1,000W TDP'
  },
  accel_cerebras_wse: {
    title: 'Cerebras Wafer-Scale Engine 3 (WSE-3)',
    url: 'https://cerebras.ai/wafer-scale-engine-3/',
    organization: 'Cerebras Systems',
    type: 'official',
    categoryKey: 'aiDocs.category.hardwareWaferScaleChip',
    summaryKey: 'aiDocs.hardwareDocs.accelCerebrasWse.summary',
    keySpecs: '125 PFLOPS FP16 · 44GB On-chip SRAM · 21 PB/s bandwidth'
  },
  accel_optical_tpu: {
    title: 'Optical / Photonic Tensor Processing Unit (Silicon Photonics)',
    url: 'https://lightmatter.co/',
    organization: 'Lightmatter / Nature Photonics',
    type: 'theory_foundations',
    categoryKey: 'aiDocs.category.hardwareTheoreticalOpticalComputing',
    summaryKey: 'aiDocs.hardwareDocs.accelOpticalTpu.summary',
    keySpecs: 'Photonic MVM · Zero-latency optical interconnect · Nature Photonics 2017'
  },
  accel_quantum_annealer: {
    title: 'Adiabatic Quantum Annealer (Superconducting Qubits)',
    url: 'https://www.dwavesys.com/learn/quantum-computing/',
    organization: 'D-Wave Systems / MIT',
    type: 'theory_foundations',
    categoryKey: 'aiDocs.category.hardwareQuantumComputing',
    summaryKey: 'aiDocs.hardwareDocs.accelQuantumAnnealer.summary',
    keySpecs: '5,000+ Superconducting Flux Qubits · 15 millikelvin cryostat'
  },
  accel_topological_qubit: {
    title: 'Topological Quantum Coprocessor (Majorana Zero Modes)',
    url: 'https://www.microsoft.com/en-us/research/project/station-q/',
    organization: 'Microsoft Station Q / Nature',
    type: 'theory_foundations',
    categoryKey: 'aiDocs.category.hardwareTheoreticalQuantumCoprocessor',
    summaryKey: 'aiDocs.hardwareDocs.accelTopologicalQubit.summary',
    keySpecs: 'Non-Abelian Anyon Braiding · Exponential quantum speedup'
  },
  accel_dyson_matrioshka: {
    title: 'Stellar Dyson Swarm & Matrioshka Brain',
    url: 'https://en.wikipedia.org/wiki/Matrioshka_brain',
    organization: 'Robert Bradbury / SETI Institute',
    type: 'theory_foundations',
    categoryKey: 'aiDocs.category.hardwareUltimateComputationScale',
    summaryKey: 'aiDocs.hardwareDocs.accelDysonMatrioshka.summary',
    keySpecs: '3.8×10²⁶ Watts · 10⁴² FLOPS thermodynamic capacity'
  },

  // Cooling & Facility Docs
  cool_air_basic: {
    title: 'Forced Air Convection & Heat Sink Thermal Dynamics',
    url: 'https://en.wikipedia.org/wiki/Computer_cooling#Air_cooling',
    organization: 'IEEE Thermal & Thermomechanical Phenomena',
    type: 'theory_foundations',
    categoryKey: 'aiDocs.category.coolingAirFlow',
    summaryKey: 'aiDocs.hardwareDocs.coolAirBasic.summary',
    keySpecs: 'Convective Heat Transfer · 0.9 kW capacity'
  },
  cool_copper_pipes: {
    title: 'Direct-Contact Copper Heat Pipes (Phase-Change Vapor Chambers)',
    url: 'https://en.wikipedia.org/wiki/Heat_pipe',
    organization: 'ASME Heat Transfer',
    type: 'official',
    categoryKey: 'aiDocs.category.coolingVaporPhaseChange',
    summaryKey: 'aiDocs.hardwareDocs.coolCopperPipes.summary',
    keySpecs: 'Phase Change Vapor Chamber · 2.5 kW capacity'
  },
  cool_liquid_loop: {
    title: 'Direct-to-Chip Closed Liquid Cooling Loop',
    url: 'https://www.opencompute.org/projects/advanced-cooling-solutions',
    organization: 'Open Compute Project (OCP)',
    type: 'official',
    categoryKey: 'aiDocs.category.coolingDirectLiquid',
    summaryKey: 'aiDocs.hardwareDocs.coolLiquidLoop.summary',
    keySpecs: 'Direct-to-Chip Cold Plates · 8 kW capacity'
  },
  cool_immersion_tank: {
    title: 'Two-Phase Dielectric Liquid Immersion Cooling',
    url: 'https://www.grcooling.com/immersion-cooling-explained/',
    organization: 'GRC / 3M Engineered Fluids',
    type: 'official',
    categoryKey: 'aiDocs.category.coolingDielectricImmersion',
    summaryKey: 'aiDocs.hardwareDocs.coolImmersionTank.summary',
    keySpecs: 'Two-Phase Dielectric Boil & Condense · 35 kW capacity'
  },
  cool_cryo_chiller: {
    title: 'Sub-Zero Cryogenic Closed Chiller Loop',
    url: 'https://en.wikipedia.org/wiki/Cryocooler',
    organization: 'Cryogenic Society of America',
    type: 'theory_foundations',
    categoryKey: 'aiDocs.category.coolingCryogenicSystems',
    summaryKey: 'aiDocs.hardwareDocs.coolCryoChiller.summary',
    keySpecs: 'Sub-Zero Active Vapor-Compression · 120 kW capacity'
  },
  cool_liquid_helium: {
    title: 'Superfluid Liquid Helium Dilution Refrigerator',
    url: 'https://en.wikipedia.org/wiki/Dilution_refrigerator',
    organization: 'Oxford Instruments / Bluefors',
    type: 'official',
    categoryKey: 'aiDocs.category.coolingQuantumCryogenics',
    summaryKey: 'aiDocs.hardwareDocs.coolLiquidHelium.summary',
    keySpecs: '10 mK Cryostat · Continuous Dilution Cycle · 500 kW capacity'
  }
};

// 2. MODEL ARCHITECTURE & TOPOLOGY DOCS
export const TOPOLOGY_DOCS: Record<string, DocEntry> = {
  transformer: {
    title: 'Attention Is All You Need (Vaswani et al., 2017)',
    url: 'https://arxiv.org/abs/1706.03762',
    organization: 'Google Brain / NeurIPS',
    type: 'research_paper',
    categoryKey: 'aiDocs.category.architectureTransformer',
    summaryKey: 'aiDocs.topologyDocs.transformer.summary',
    keySpecs: 'O(N²) context complexity · Scaled dot-product attention'
  },
  moe: {
    title: 'Outrageously Large Neural Networks: The Sparsely-Gated MoE (Shazeer et al., 2017)',
    url: 'https://arxiv.org/abs/1701.06538',
    organization: 'Google Brain / ICLR',
    type: 'research_paper',
    categoryKey: 'aiDocs.category.architectureMixtureOfExperts',
    summaryKey: 'aiDocs.topologyDocs.moe.summary',
    keySpecs: 'Sparse Routing Gate · Mixtral 8x7B & Switch Transformer basis'
  },
  mamba_ssm: {
    title: 'Mamba: Linear-Time Sequence Modeling with Selective State Spaces (Gu & Dao, 2023)',
    url: 'https://arxiv.org/abs/2312.00752',
    organization: 'Carnegie Mellon & Princeton',
    type: 'research_paper',
    categoryKey: 'aiDocs.category.architectureStateSpaceModels',
    summaryKey: 'aiDocs.topologyDocs.mambaSsm.summary',
    keySpecs: 'O(N) complexity · Million-token context without quadratic memory'
  },
  gnn_hybrid: {
    title: 'Relational Inductive Biases, Deep Learning, and Graph Networks (Battaglia et al., 2018)',
    url: 'https://arxiv.org/abs/1806.01261',
    organization: 'DeepMind / Google',
    type: 'research_paper',
    categoryKey: 'aiDocs.category.architectureGraphNeuralNetworks',
    summaryKey: 'aiDocs.topologyDocs.gnnHybrid.summary',
    keySpecs: 'Graph Attention Networks (GAT) · Message Passing over RDF Triples'
  },
  multimodal_diffusion: {
    title: 'High-Resolution Image Synthesis with Latent Diffusion Models (Rombach et al., 2022)',
    url: 'https://arxiv.org/abs/2112.10752',
    organization: 'CompVis / LMU Munich / CVPR',
    type: 'research_paper',
    categoryKey: 'aiDocs.category.architectureLatentDiffusion',
    summaryKey: 'aiDocs.topologyDocs.multimodalDiffusion.summary',
    keySpecs: 'Stable Diffusion & FLUX foundation · Latent VAE space'
  }
};

// 3. ATTENTION MECHANISM DOCS
export const ATTENTION_DOCS: Record<string, DocEntry> = {
  standard_mha: {
    title: 'Multi-Head Attention (PyTorch Official API)',
    url: 'https://pytorch.org/docs/stable/generated/torch.nn.MultiheadAttention.html',
    organization: 'PyTorch / Linux Foundation',
    type: 'official',
    categoryKey: 'aiDocs.category.attentionMechanism',
    summaryKey: 'aiDocs.attentionDocs.standardMha.summary',
    keySpecs: 'H independent heads · Softmax(QKᵀ / √d) V'
  },
  grouped_query_gqa: {
    title: 'GQA: Training Generalized Multi-Query Transformer Models (Ainslie et al., 2023)',
    url: 'https://arxiv.org/abs/2305.13245',
    organization: 'Google Research / EMNLP',
    type: 'research_paper',
    categoryKey: 'aiDocs.category.attentionMechanism',
    summaryKey: 'aiDocs.attentionDocs.groupedQueryGqa.summary',
    keySpecs: 'Llama 3 & Mistral KV-cache standard · 8x memory reduction'
  },
  flash_attention_3: {
    title: 'FlashAttention-3: Fast and Accurate Attention with Asynchrony (Dao et al., 2024)',
    url: 'https://arxiv.org/abs/2407.08608',
    organization: 'Stanford & Together AI',
    type: 'research_paper',
    categoryKey: 'aiDocs.category.attentionMechanism',
    summaryKey: 'aiDocs.attentionDocs.flashAttention3.summary',
    keySpecs: 'Up to 75% peak H100 TFLOPS · Zero approximation error'
  },
  linear_attention: {
    title: 'Transformers are RNNs: Fast Autoregressive Transformers with Linear Attention (Katharopoulos et al., 2020)',
    url: 'https://arxiv.org/abs/2006.16236',
    organization: 'Idiap & EPFL / ICML',
    type: 'research_paper',
    categoryKey: 'aiDocs.category.attentionMechanism',
    summaryKey: 'aiDocs.attentionDocs.linearAttention.summary',
    keySpecs: 'Linear time complexity · Constant memory per token'
  }
};

// 4. QUANTIZATION DOCS
export const QUANTIZATION_DOCS: Record<string, DocEntry> = {
  fp32: {
    title: 'IEEE 754 Standard for Floating-Point Arithmetic (Single Precision)',
    url: 'https://en.wikipedia.org/wiki/Single-precision_floating-point_format',
    organization: 'IEEE Standards Association',
    type: 'official',
    categoryKey: 'aiDocs.category.precisionQuantization',
    summaryKey: 'aiDocs.quantizationDocs.fp32.summary',
    keySpecs: '4 bytes/parameter · 1e-38 to 3e38 range'
  },
  bf16: {
    title: 'Bfloat16 Floating-Point Format (Brain Floating Point)',
    url: 'https://en.wikipedia.org/wiki/Bfloat16_floating-point_format',
    organization: 'Google Cloud & NVIDIA',
    type: 'official',
    categoryKey: 'aiDocs.category.precisionQuantization',
    summaryKey: 'aiDocs.quantizationDocs.bf16.summary',
    keySpecs: '2 bytes/parameter · Standard for modern LLM pre-training'
  },
  int8: {
    title: 'LLM.int8(): 8-bit Matrix Multiplication for Transformers at Scale (Dettmers et al., 2022)',
    url: 'https://arxiv.org/abs/2208.07339',
    organization: 'University of Washington & bitsandbytes / NeurIPS',
    type: 'research_paper',
    categoryKey: 'aiDocs.category.precisionQuantization',
    summaryKey: 'aiDocs.quantizationDocs.int8.summary',
    keySpecs: '1 byte/parameter · INT8 Matrix Multiplication with FP16 outliers'
  },
  fp4: {
    title: 'Open Compute Project (OCP) Microscaling Formats (MX) Specification',
    url: 'https://www.opencompute.org/documents/ocp-microscaling-formats-mx-v1-0-spec-final-pdf',
    organization: 'Open Compute Project / NVIDIA Blackwell',
    type: 'official',
    categoryKey: 'aiDocs.category.precisionQuantization',
    summaryKey: 'aiDocs.quantizationDocs.fp4.summary',
    keySpecs: '0.5 bytes/parameter · 4x throughput over FP16'
  },
  ternary_1bit: {
    title: 'The Era of 1-bit LLMs: All Large Language Models are in 1.58 Bits (Wang et al., 2024)',
    url: 'https://arxiv.org/abs/2402.17764',
    organization: 'Microsoft Research',
    type: 'research_paper',
    categoryKey: 'aiDocs.category.precisionQuantization',
    summaryKey: 'aiDocs.quantizationDocs.ternary1bit.summary',
    keySpecs: '1.58 bits/parameter · Pure addition kernels (zero FP multiplier)'
  }
};

// 5. LOSS & ALIGNMENT FUNCTIONS
export const LOSS_DOCS: Record<string, DocEntry> = {
  cross_entropy: {
    title: 'Categorical Cross-Entropy Loss & Log-Likelihood (PyTorch API)',
    url: 'https://pytorch.org/docs/stable/generated/torch.nn.CrossEntropyLoss.html',
    organization: 'PyTorch Documentation',
    type: 'official',
    categoryKey: 'aiDocs.category.trainingObjective',
    summaryKey: 'aiDocs.lossDocs.crossEntropy.summary',
    keySpecs: 'L = -∑ y_i log(p_i) · Autoregressive next-token prediction'
  },
  dpo: {
    title: 'Direct Preference Optimization: Your Language Model is Secretly a Reward Model (Rafailov et al., 2023)',
    url: 'https://arxiv.org/abs/2305.18290',
    organization: 'Stanford University / NeurIPS',
    type: 'research_paper',
    categoryKey: 'aiDocs.category.alignmentRlhf',
    summaryKey: 'aiDocs.lossDocs.dpo.summary',
    keySpecs: 'Closed-form implicit reward · Stable reinforcement alignment'
  },
  ppo_rlhf: {
    title: 'Training Language Models to Follow Instructions with Human Feedback (Ouyang et al., 2022)',
    url: 'https://arxiv.org/abs/2203.02155',
    organization: 'OpenAI (InstructGPT / ChatGPT paper)',
    type: 'research_paper',
    categoryKey: 'aiDocs.category.alignmentRlhf',
    summaryKey: 'aiDocs.lossDocs.ppoRlhf.summary',
    keySpecs: 'Actor-Critic PPO · KL penalty constraint · InstructGPT foundation'
  },
  contrastive_infonce: {
    title: 'Representation Learning with Contrastive Predictive Coding (van den Oord et al., 2018)',
    url: 'https://arxiv.org/abs/1807.03748',
    organization: 'Google DeepMind',
    type: 'research_paper',
    categoryKey: 'aiDocs.category.selfSupervisedLearning',
    summaryKey: 'aiDocs.lossDocs.contrastiveInfonce.summary',
    keySpecs: 'InfoNCE Loss · Foundation for CLIP & multimodal alignment'
  },
  energy_based: {
    title: 'A Tutorial on Energy-Based Learning (Yann LeCun et al., 2006)',
    url: 'http://yann.lecun.com/exdb/publis/pdf/lecun-06.pdf',
    organization: 'Yann LeCun / New York University',
    type: 'theory_foundations',
    categoryKey: 'aiDocs.category.energyBasedLearning',
    summaryKey: 'aiDocs.lossDocs.energyBased.summary',
    keySpecs: 'Non-probabilistic inference · Implicit constraint modeling'
  }
};

// 6. DATA SOURCES DOCS
export const DATA_DOCS: Record<string, DocEntry> = {
  data_relational_sql: {
    title: 'PostgreSQL Relational Database & ACID Architecture',
    url: 'https://www.postgresql.org/docs/current/',
    organization: 'PostgreSQL Global Development Group',
    type: 'official',
    categoryKey: 'aiDocs.category.dataEngineRelationalTabular',
    summaryKey: 'aiDocs.dataDocs.dataRelationalSql.summary',
    keySpecs: 'ACID Compliance · MVCC Concurrency · Tabular schemas'
  },
  data_vector_rag: {
    title: 'Hierarchical Navigable Small World Graphs for Vector Search (HNSW - Malkov & Yashunin, 2018)',
    url: 'https://arxiv.org/abs/1603.09320',
    organization: 'IEEE Transactions on Pattern Analysis & Machine Intelligence',
    type: 'research_paper',
    categoryKey: 'aiDocs.category.dataEngineVectorSpaceRag',
    summaryKey: 'aiDocs.dataDocs.dataVectorRag.summary',
    keySpecs: 'Cosine / Inner-product distance · Sub-millisecond ANN search'
  },
  data_knowledge_graph: {
    title: 'W3C Resource Description Framework (RDF) & Graph Triples',
    url: 'https://www.w3.org/TR/rdf11-primer/',
    organization: 'World Wide Web Consortium (W3C) & Neo4j',
    type: 'official',
    categoryKey: 'aiDocs.category.dataEngineOntologicalGraph',
    summaryKey: 'aiDocs.dataDocs.dataKnowledgeGraph.summary',
    keySpecs: 'RDF Triples · SPARQL / Cypher graph traversal · Causal ontology'
  },
  data_synthetic_flywheel: {
    title: 'Constitutional AI & Self-Play (Anthropic / DeepMind AlphaZero)',
    url: 'https://www.anthropic.com/research/constitutional-ai',
    organization: 'Anthropic & DeepMind',
    type: 'research_paper',
    categoryKey: 'aiDocs.category.dataEngineSyntheticSelfPlayFlywheel',
    summaryKey: 'aiDocs.dataDocs.dataSyntheticFlywheel.summary',
    keySpecs: 'RLAIF (RL from AI Feedback) · AlphaZero MCTS verification'
  }
};

// 7. RESEARCH TECH TREE DOCS
export const RESEARCH_DOCS: Record<string, DocEntry> = {
  res_bpe_tokenizer: {
    title: 'Neural Machine Translation of Rare Words with Subword Units (BPE - Sennrich et al., 2016)',
    url: 'https://arxiv.org/abs/1508.07909',
    organization: 'ACL Anthology / Edinburgh',
    type: 'research_paper',
    categoryKey: 'aiDocs.category.rDPaperTokenization',
    summaryKey: 'aiDocs.researchDocs.resBpeTokenizer.summary',
    keySpecs: 'Byte-Pair Encoding · HuggingFace Tokenizers basis'
  },
  res_lora_peft: {
    title: 'LoRA: Low-Rank Adaptation of Large Language Models (Hu et al., 2021)',
    url: 'https://arxiv.org/abs/2106.09685',
    organization: 'Microsoft Research / ICLR',
    type: 'research_paper',
    categoryKey: 'aiDocs.category.rDPaperParameterEfficientFineTuning',
    summaryKey: 'aiDocs.researchDocs.resLoraPeft.summary',
    keySpecs: 'Rank r=8..64 · 10,000x fewer gradient parameters'
  },
  res_flash_attention: {
    title: 'FlashAttention: Fast and Memory-Efficient Exact Attention with IO-Awareness (Dao et al., 2022)',
    url: 'https://arxiv.org/abs/2205.14135',
    organization: 'Stanford University / NeurIPS',
    type: 'research_paper',
    categoryKey: 'aiDocs.category.rDPaperKernelOptimization',
    summaryKey: 'aiDocs.researchDocs.resFlashAttention.summary',
    keySpecs: 'Fused CUDA kernel · 3x training acceleration'
  },
  res_rope_embeddings: {
    title: 'RoFormer: Enhanced Transformer with Rotary Position Embedding (Su et al., 2021)',
    url: 'https://arxiv.org/abs/2104.09864',
    organization: 'Zhuiyi Technology / Neurocomputing',
    type: 'research_paper',
    categoryKey: 'aiDocs.category.rDPaperPositionalEncoding',
    summaryKey: 'aiDocs.researchDocs.resRopeEmbeddings.summary',
    keySpecs: 'Rotary Position Embedding · 128k+ token extrapolation'
  },
  res_dpo_alignment: {
    title: 'Direct Preference Optimization: Your Language Model is Secretly a Reward Model (Rafailov et al., 2023)',
    url: 'https://arxiv.org/abs/2305.18290',
    organization: 'Stanford University / NeurIPS',
    type: 'research_paper',
    categoryKey: 'aiDocs.category.rDPaperPostTrainingAlignment',
    summaryKey: 'aiDocs.researchDocs.resDpoAlignment.summary',
    keySpecs: 'Analytical RLHF · Closed-form policy gradients'
  },
  res_moe_architecture: {
    title: 'Switch Transformers: Scaling to Trillion Parameter Models with Simple and Efficient Sparsity (Fedus et al., 2021)',
    url: 'https://arxiv.org/abs/2101.03961',
    organization: 'Google Research / JMLR',
    type: 'research_paper',
    categoryKey: 'aiDocs.category.rDPaperScalableSparsity',
    summaryKey: 'aiDocs.researchDocs.resMoeArchitecture.summary',
    keySpecs: 'Top-1 / Top-2 gating · 4x speedup over dense models'
  },
  res_agentic_mcts: {
    title: 'Tree of Thoughts: Deliberate Problem Solving with Large Language Models (Yao et al., 2023)',
    url: 'https://arxiv.org/abs/2305.10601',
    organization: 'Princeton University & Google DeepMind / NeurIPS',
    type: 'research_paper',
    categoryKey: 'aiDocs.category.rDPaperInferenceTimeReasoning',
    summaryKey: 'aiDocs.researchDocs.resAgenticMcts.summary',
    keySpecs: 'Q* / o1 deliberate inference-time reasoning'
  },
  res_recursive_self_code: {
    title: 'Gödel Machines: Self-Referential Universal Problem Solvers Making Provably Optimal Self-Improvements (Schmidhuber, 2003)',
    url: 'https://arxiv.org/abs/cs/0309048',
    organization: 'IDSIA / Jürgen Schmidhuber',
    type: 'theory_foundations',
    categoryKey: 'aiDocs.category.rDPaperRecursiveSelfImprovement',
    summaryKey: 'aiDocs.researchDocs.resRecursiveSelfCode.summary',
    keySpecs: 'Provably optimal self-modification · Singularity threshold'
  }
};

// 8. INFERENCE & AGENT PARAMETERS DOCS
export const INFERENCE_DOCS: Record<
  'temperature' | 'top_p' | 'top_k' | 'repetition_penalty' | 'constitutional_guardrails',
  DocEntry
> = {
  temperature: {
    title: 'Temperature Sampling in Softmax Distributions',
    url: 'https://huggingface.co/blog/how-to-generate',
    organization: 'Hugging Face / Geoffrey Hinton (Knowledge Distillation 2015)',
    type: 'official',
    categoryKey: 'aiDocs.category.inferenceParameter',
    summaryKey: 'aiDocs.inferenceDocs.temperature.summary',
    keySpecs: 'T ∈ [0.0, 2.0] · Softmax Logit Temperature Scaling'
  },
  top_p: {
    title: 'The Curious Case of Neural Text Degeneration (Top-P / Nucleus Sampling - Holtzman et al., 2019)',
    url: 'https://arxiv.org/abs/1904.09751',
    organization: 'University of Washington & Allen Institute / ICLR',
    type: 'research_paper',
    categoryKey: 'aiDocs.category.inferenceParameter',
    summaryKey: 'aiDocs.inferenceDocs.topP.summary',
    keySpecs: 'P ∈ [0.05, 1.0] · Eliminates low-probability tail tokens'
  },
  top_k: {
    title: 'Top-K Sampling (Hierarchical Neural Story Generation - Fan et al., 2018)',
    url: 'https://arxiv.org/abs/1805.04833',
    organization: 'Facebook AI Research (FAIR) / ACL',
    type: 'research_paper',
    categoryKey: 'aiDocs.category.inferenceParameter',
    summaryKey: 'aiDocs.inferenceDocs.topK.summary',
    keySpecs: 'K ∈ [1, 100] · Fixed-count candidate truncation'
  },
  repetition_penalty: {
    title: 'Ctrl: A Conditional Transformer Language Model for Controllable Generation (Keskar et al., 2019)',
    url: 'https://arxiv.org/abs/1909.05858',
    organization: 'Salesforce Research',
    type: 'research_paper',
    categoryKey: 'aiDocs.category.inferenceParameter',
    summaryKey: 'aiDocs.inferenceDocs.repetitionPenalty.summary',
    keySpecs: 'θ ∈ [1.0, 2.0] · Contextual logit discount'
  },
  constitutional_guardrails: {
    title: 'Constitutional AI: Harmlessness from AI Feedback (Bai et al., 2022)',
    url: 'https://www.anthropic.com/research/constitutional-ai',
    organization: 'Anthropic',
    type: 'research_paper',
    categoryKey: 'aiDocs.category.safetyGuardrails',
    summaryKey: 'aiDocs.inferenceDocs.constitutionalGuardrails.summary',
    keySpecs: 'Rule-based automated alignment · Llama Guard & Constitutional frameworks'
  }
};
