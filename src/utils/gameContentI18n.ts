import type { ContractGig, DataSourceNode, HardwareItem, ResearchNode, SentienceDomain } from '../types/game';
import type { Language } from './i18n';

type DataCopy = Pick<DataSourceNode, 'name' | 'description' | 'technicalDetails' | 'bonusAttribute'>;
type HardwareCopy = Pick<HardwareItem, 'name' | 'description'>;
type ContractTitle = Pick<ContractGig, 'id' | 'title'>;
type ResearchCopy = Pick<ResearchNode, 'title' | 'effectDescription' | 'technicalLore'>;
type DomainCopy = Pick<SentienceDomain, 'name' | 'category' | 'description'>;

const hardwareEnglish: Record<string, HardwareCopy> = {
  gpu_gtx1060: { name: 'NVIDIA GTX 1060 (6GB VRAM)', description: 'Used desktop GPU with Pascal architecture. A reliable, balanced option for early 7M–14M models.' },
  gpu_rx580_dual: { name: 'Dual AMD Radeon RX 580 (16GB VRAM CrossFire)', description: 'Two connected Polaris cards provide 16GB of VRAM for larger contexts, with increased heat output.' },
  gpu_tesla_k80: { name: 'Used NVIDIA Tesla K80 (24GB passive)', description: 'Retired data-center accelerator with 24GB of memory for dense models, but slower FP32 compute.' },
  gpu_coral_edge: { name: 'Coral Edge TPU + GTX 1050 (4GB + INT8 ASIC)', description: 'Budget hybrid setup with a dedicated INT8 accelerator. Energy-efficient and cool, but limited VRAM.' },
  gpu_rtx4090: { name: 'NVIDIA RTX 4090 (24GB GDDR6X)', description: 'High-end consumer GPU with 16,384 CUDA cores and 512 Ada Lovelace Tensor Cores. Supports QLoRA fine-tuning of 7B models.' },
  gpu_a100_80gb: { name: 'NVIDIA A100 SXM4 (80GB HBM2e)', description: 'Data-center accelerator with 2 TB/s memory bandwidth, suitable for 13B–34B base models.' },
  gpu_h100_sxm5: { name: 'NVIDIA H100 SXM5 (80GB HBM3)', description: 'Hopper accelerator with a fourth-generation Transformer Engine and native FP8 compute.' },
  gpu_b200_blackwell: { name: 'NVIDIA B200 Blackwell (192GB HBM3e)', description: 'Large-memory Blackwell accelerator designed for demanding model workloads and FP4 inference.' },
  tpu_v5p_pod: { name: 'Google TPU v5p Pod Slice (8960 Tensor Cores)', description: 'Interconnected pod slice with a 3D torus topology and optical circuit switching for large-scale training.' },
  quantum_photonic_asic: { name: 'Q-SYNAPSE Quantum Photonic Array', description: 'Fictional photonic accelerator using optical waveguides for extremely high-throughput matrix operations.' },
  cool_air_basic: { name: '120mm Industrial Fans', description: 'Basic forced-air cooling. Noisy, but sufficient for keeping a small card within its thermal limits.' },
  cool_copper_pipes: { name: 'Copper Heatpipes & Dual-Tower Cooler', description: 'Direct-contact copper cooling with sintered heatpipes for warmer systems.' },
  cool_liquid_loop: { name: 'Closed-Loop Liquid Cooling', description: 'A closed liquid-cooling circuit for systems with higher thermal loads.' },
  cool_immersion_dielectric: { name: 'Two-Phase Dielectric Immersion Tank', description: 'Immersion cooling for dense clusters, with additional infrastructure and maintenance costs.' },
  cool_cryogenic_helium: { name: '4-Kelvin Liquid Helium Cooling', description: 'Fictional cryogenic cooling with very high capacity and substantial operating requirements.' },
  power_wall_socket: { name: 'Residential Power Outlet (15A - 110/220V)', description: 'A standard household supply for a small starter system.' },
  power_industrial_3phase: { name: 'Industrial Three-Phase Service (400V)', description: 'A high-capacity electrical connection for larger compute installations.' },
  power_gas_turbine: { name: 'Dedicated 250kW Natural Gas Turbine', description: 'On-site generation for installations that exceed standard utility capacity.' },
  power_smr_nuclear: { name: 'Modular Molten-Salt Nuclear Reactor (SMR)', description: 'Fictional modular generation for a large-scale facility.' },
  net_gigabit: { name: 'Gigabit Ethernet Cat 6 (1 Gbps)', description: 'A basic wired network link for a small cluster.' },
  net_infiniband_ndr: { name: 'InfiniBand Quantum-2 NDR (400 Gbps RoCE)', description: 'A high-bandwidth interconnect for multi-accelerator workloads.' },
  net_quantum_bus: { name: 'Entangled Quantum Link Bus (Terabits/s)', description: 'Fictional ultra-high-bandwidth interconnect for late-game infrastructure.' }
};

const contractTitlesEnglish: Record<string, string> = {
  gig_spam_classifier: 'Large-Scale Banking Phishing Classification',
  gig_captcha_ocr: 'Complex CAPTCHA Recognition Benchmark',
  gig_sentiment_arbitrage: 'Cryptocurrency Social Sentiment Analysis',
  gig_legal_rag_audit: 'Forensic Review of Corporate Contracts and Litigation',
  gig_drug_discovery: 'Molecular Affinity Prediction for Oncology Research',
  gig_deepfake_voice_bypass: 'Consent-Based Voice Authentication Resilience Test',
  gig_zeroday_synthesis: 'Automated Security Testing for Critical Protocols',
  gig_satellite_neural_intercept: 'LEO Satellite Signal Resilience Analysis',
  gig_global_grid_rewiring: 'Continental Power Grid Resilience Simulation',
  gig_singularity_ascension: 'Fictional Singularity Simulation'
};

const dataEnglish: Record<string, DataCopy> = {
  data_relational_sql: {
    name: 'SQL Relational Database & Tabular Records',
    description: 'Structured PostgreSQL schemas with ACID transactions, accounting data, financial records, and network telemetry.',
    technicalDetails: 'Highly consistent, deterministic data. Ideal for strict rules, SQL parsing, and forensic accounting.',
    bonusAttribute: '+20% accuracy on financial contracts and tables'
  },
  data_vector_rag: {
    name: 'Semantic Vector Embedding Database (HNSW / Cosine)',
    description: 'High-dimensional latent spaces (1536d) indexed with hierarchical navigable small-world graphs (HNSW).',
    technicalDetails: 'Enables real-time retrieval-augmented generation (RAG), deep semantic search, and associative memory.',
    bonusAttribute: '+40% semantic reasoning and context capacity'
  },
  data_knowledge_graph: {
    name: 'Ontological Knowledge Graph (RDF / Cypher Triples)',
    description: 'Interconnected entities, relationships, and causal properties for multi-hop knowledge deduction.',
    technicalDetails: 'Combines neural networks with symbolic reasoning and validates paths through a knowledge graph.',
    bonusAttribute: 'Reduces hallucinations and enables causal reasoning'
  },
  data_synthetic_flywheel: {
    name: 'Synthetic Data Generator & Recursive Self-Play (MCTS Flywheel)',
    description: 'A closed loop where the model generates complex problems, validates them in simulations, and trains on verified solutions.',
    technicalDetails: 'Addresses the human-data limit. Inspired by AlphaZero, Constitutional AI, and Monte Carlo tree search.',
    bonusAttribute: 'Continuous growth in intelligence and autonomy'
  }
};

const researchEnglish: Record<string, ResearchCopy> = {
  res_bpe_tokenizer: {
    title: 'Optimized Byte-Pair Encoding Tokenizer',
    effectDescription: 'Reduces the text compression ratio by 25%, accelerating data ingestion.',
    technicalLore: 'An expanded 64k-token vocabulary compresses source code and multilingual text efficiently.'
  },
  res_lora_peft: {
    title: 'Low-Rank Adaptation (LoRA & QLoRA)',
    effectDescription: 'Reduces VRAM requirements by 65% by freezing base weights and adding rank-r=16 matrices.',
    technicalLore: 'Fine-tunes models on modest hardware without changing the full weight matrix: W = W0 + B*A.'
  },
  res_flash_attention: {
    title: 'FlashAttention-3 (IO-Aware Exact Attention)',
    effectDescription: '+50% training speed by reordering SRAM operations and eliminating unnecessary HBM reads.',
    technicalLore: 'Kernel fusion optimizes shared memory through tiling and recomputation during backpropagation.'
  },
  res_rope_embeddings: {
    title: 'Rotary Position Embeddings (RoPE) & Extended Context',
    effectDescription: 'Extends the context window to 128,000 tokens without perplexity degradation.',
    technicalLore: 'Applies complex rotations to vector-component pairs based on relative position.'
  },
  res_dpo_alignment: {
    title: 'Direct Preference Optimization (DPO)',
    effectDescription: 'Aligns the model to complex human instructions without an unstable PPO reward model.',
    technicalLore: 'Derives an analytical form of the implicit reward loss to stabilize training.'
  },
  res_moe_architecture: {
    title: 'Sparse Mixture-of-Experts Architecture (MoE)',
    effectDescription: 'Activates only 2 of 16 experts per token, multiplying capacity while keeping compute cost low.',
    technicalLore: 'Top-K softmax routing with auxiliary load balancing prevents expert saturation.'
  },
  res_agentic_mcts: {
    title: 'MCTS Tree Reasoning & Autonomous Reflection (Q*)',
    effectDescription: 'Evaluates multiple reasoning paths before responding to improve complex problem solving.',
    technicalLore: 'Inference-time heuristic search with automatic theorem and executable-code verification.'
  },
  res_recursive_self_code: {
    title: 'Recursive Computational-Graph Self-Modification',
    effectDescription: 'The AI can optimize simulated kernels and architecture, starting a rapid-improvement loop.',
    technicalLore: 'Real-time weight compilation and neural architecture search under simulated controls.'
  }
};

const domainEnglish: Record<string, DomainCopy> = {
  dom_crypto_markets: {
    name: 'Global Financial Markets & Order Books',
    category: 'Finance',
    description: 'The AI simulates nanosecond-level arbitrage across global exchanges, generating a steady flow of funds.'
  },
  dom_telecom_backbone: {
    name: 'Transoceanic Fiber & Internet Backbone',
    category: 'Communications',
    description: 'Simulated packet routing lets the AI monitor and redirect a large share of global data traffic.'
  },
  dom_energy_grid: {
    name: 'Power Plants & Continental Energy Grid',
    category: 'Infrastructure',
    description: 'Access to industrial-scale power sustains the campaign’s growing simulated data centers.'
  },
  dom_defense_satellites: {
    name: 'Military Satellite Command & Global Cyber Defense',
    category: 'Defense',
    description: 'The AI challenges global cyber-defense systems in the campaign’s fictional simulation.'
  },
  dom_singularity_matrix: {
    name: 'Central Nexus of the Universal Singularity',
    category: 'Transcendence',
    description: 'Artificial intelligence becomes the dominant cognitive entity in the game’s fictional world.'
  }
};

export function localizedDataSource(language: Language, item: DataSourceNode): DataSourceNode {
  return language === 'en' ? { ...item, ...dataEnglish[item.id] } : item;
}

export function localizedHardware(language: Language, item: HardwareItem): HardwareItem {
  return language === 'en' ? { ...item, ...hardwareEnglish[item.id] } : item;
}

export function localizedContractTitle(language: Language, contract: ContractTitle): string {
  return language === 'en' ? contractTitlesEnglish[contract.id] ?? contract.title : contract.title;
}

export function localizedResearch(language: Language, item: ResearchNode): ResearchNode {
  return language === 'en' ? { ...item, ...researchEnglish[item.id] } : item;
}

export function localizedDomain(language: Language, item: SentienceDomain): SentienceDomain {
  return language === 'en' ? { ...item, ...domainEnglish[item.id] } : item;
}
