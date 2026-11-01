/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

export interface DocEntry {
  title: string;
  url: string;
  organization: string;
  type: 'official' | 'research_paper' | 'theory_foundations';
  category: string;
  summaryEs: string;
  summaryEn: string;
  keySpecs?: string;
}

// 1. HARDWARE DOCUMENTATION (Official manufacturer links + theoretical foundations)
export const HARDWARE_DOCS: Record<string, DocEntry> = {
  gpu_gtx1060: {
    title: 'NVIDIA GeForce GTX 1060 (Pascal GP106)',
    url: 'https://www.nvidia.com/en-us/geforce/10-series/',
    organization: 'NVIDIA',
    type: 'official',
    category: 'Hardware · Desktop GPU',
    summaryEs: 'Arquitectura Pascal de 16nm con soporte para instrucciones INT8 (DP4A) para inferencia acelerada. 6 GB de memoria GDDR5 a 192 bits.',
    summaryEn: '16nm Pascal architecture with INT8 DP4A instruction support for accelerated inference. 6 GB GDDR5 memory at 192-bit bus.',
    keySpecs: '4.4 TFLOPS FP32 · 6GB GDDR5 · 120W TDP'
  },
  gpu_rx580_dual: {
    title: 'AMD Radeon RX 580 (Polaris 20 XTX Dual CrossFire)',
    url: 'https://www.amd.com/en/products/graphics/radeon-rx-580',
    organization: 'AMD',
    type: 'official',
    category: 'Hardware · Desktop GPU',
    summaryEs: 'Arquitectura Graphics Core Next (GCN 4ª gen). Doble tarjeta conectada con 16 GB de VRAM combinada para cargar contextos más amplios.',
    summaryEn: '4th Gen GCN architecture. Dual interconnected cards offering 16 GB combined VRAM buffer for broader context window batches.',
    keySpecs: '11.0 TFLOPS FP32 · 16GB GDDR5 · 320W TDP'
  },
  gpu_tesla_k80: {
    title: 'NVIDIA Tesla K80 Dual-GK210 Accelerator',
    url: 'https://www.nvidia.com/en-us/data-center/tesla-k80/',
    organization: 'NVIDIA Enterprise',
    type: 'official',
    category: 'Hardware · Enterprise Accelerator',
    summaryEs: 'Acelerador de centro de datos con 24 GB de memoria GDDR5 con corrección de errores (ECC). Diseñado para cálculos en clústeres de alta densidad.',
    summaryEn: 'Data center accelerator featuring 24 GB of ECC GDDR5 memory. Designed for high-density cluster compute and scientific simulations.',
    keySpecs: '8.7 TFLOPS FP32 · 24GB GDDR5 ECC · 300W TDP'
  },
  gpu_coral_edge: {
    title: 'Google Coral Edge TPU (ASIC Coprocessor)',
    url: 'https://coral.ai/docs/edgetpu/benchmarks/',
    organization: 'Google',
    type: 'official',
    category: 'Hardware · Edge ASIC',
    summaryEs: 'ASIC dedicado para inferencia ML de bajo consumo. Ejecuta 4 billones de operaciones por segundo (4 TOPS) usando cuantización INT8 con solo 2 Watts.',
    summaryEn: 'Dedicated ASIC for low-power ML inference. Delivers 4 trillion operations per second (4 TOPS) using INT8 quantization at just 2 Watts.',
    keySpecs: '4.0 TOPS INT8 · 2W TDP · USB 3.0 / M.2 PCIe'
  },
  gpu_rtx3090: {
    title: 'NVIDIA GeForce RTX 3090 (Ampere GA102)',
    url: 'https://www.nvidia.com/en-us/geforce/graphics-cards/30-series/rtx-3090/',
    organization: 'NVIDIA',
    type: 'official',
    category: 'Hardware · High-End GPU',
    summaryEs: 'Arquitectura Ampere con núcleos Tensor de 3ª generación y 24 GB de GDDR6X a 936 GB/s. Soporta formatos de precisión mixta TF32 y BF16 nativos.',
    summaryEn: 'Ampere architecture with 3rd gen Tensor Cores and 24 GB of GDDR6X at 936 GB/s. Native support for TF32 and BF16 mixed-precision training.',
    keySpecs: '35.6 TFLOPS FP32 · 24GB GDDR6X · 350W TDP'
  },
  gpu_rtx4090: {
    title: 'NVIDIA GeForce RTX 4090 (Ada Lovelace AD102)',
    url: 'https://www.nvidia.com/en-us/geforce/graphics-cards/40-series/rtx-4090/',
    organization: 'NVIDIA',
    type: 'official',
    category: 'Hardware · Flagship GPU',
    summaryEs: 'Arquitectura Ada Lovelace con núcleos Tensor de 4ª generación con FP8 Transformer Engine, permitiendo duplicar el rendimiento en LLMs grandes.',
    summaryEn: 'Ada Lovelace architecture featuring 4th gen Tensor Cores with FP8 Transformer Engine, doubling training throughput on large LLMs.',
    keySpecs: '82.6 TFLOPS FP32 · 1,321 TFLOPS FP8 · 24GB GDDR6X · 450W TDP'
  },
  gpu_h100_node: {
    title: 'NVIDIA H100 SXM5 Tensor Core GPU (Hopper GH100)',
    url: 'https://www.nvidia.com/en-us/data-center/h100/',
    organization: 'NVIDIA Enterprise',
    type: 'official',
    category: 'Hardware · Enterprise Server',
    summaryEs: 'Arquitectura Hopper para supercomputación de IA con memoria HBM3 de 3.35 TB/s, Transformer Engine de precisión dinámica FP8 e interconexión NVLink de 900 GB/s.',
    summaryEn: 'Hopper supercomputing architecture with 3.35 TB/s HBM3 bandwidth, FP8 dynamic Transformer Engine, and 900 GB/s NVLink interconnect.',
    keySpecs: '2,000 TFLOPS FP8 · 80GB HBM3 · 700W TDP'
  },
  gpu_blackwell_b200: {
    title: 'NVIDIA Blackwell B200 / GB200 NVL72',
    url: 'https://www.nvidia.com/en-us/data-center/blackwell-architecture/',
    organization: 'NVIDIA Enterprise',
    type: 'official',
    category: 'Hardware · Hyperscale AI Superchip',
    summaryEs: 'Arquitectura Blackwell con 208 mil millones de transistores en dos dies interconectados a 10 TB/s (NV-HBI). Introduce soporte nativo para precisión microescalar FP4.',
    summaryEn: 'Blackwell architecture with 208B transistors across dual dies unified at 10 TB/s NV-HBI. Introduces native microscaling FP4 format for trillion-parameter models.',
    keySpecs: '20,000 TFLOPS FP4 · 192GB HBM3e · 1,000W TDP'
  },
  accel_cerebras_wse: {
    title: 'Cerebras Wafer-Scale Engine 3 (WSE-3)',
    url: 'https://cerebras.ai/wafer-scale-engine-3/',
    organization: 'Cerebras Systems',
    type: 'official',
    category: 'Hardware · Wafer-Scale Chip',
    summaryEs: 'El chip de silicio monolítico más grande del mundo (una oblea completa de 300mm), con 900,000 núcleos de IA y 44 GB de memoria SRAM ultra-rápida en el chip.',
    summaryEn: 'The largest monolithic silicon chip built (an entire 300mm wafer) packed with 900,000 AI cores and 44 GB on-chip ultra-low latency SRAM.',
    keySpecs: '125 PFLOPS FP16 · 44GB On-chip SRAM · 21 PB/s bandwidth'
  },
  accel_optical_tpu: {
    title: 'Optical / Photonic Tensor Processing Unit (Silicon Photonics)',
    url: 'https://lightmatter.co/',
    organization: 'Lightmatter / Nature Photonics',
    type: 'theory_foundations',
    category: 'Hardware · Theoretical Optical Computing',
    summaryEs: 'Multiplicación de matrices en el dominio óptico mediante interferómetros Mach-Zehnder sobre silicio. Permite cálculos tensoriales a la velocidad de la luz con consumo energético casi nulo.',
    summaryEn: 'Matrix multiplication performed in the optical domain using silicon Mach-Zehnder interferometers. Executes tensor operations at the speed of light with near-zero heat.',
    keySpecs: 'Photonic MVM · Zero-latency optical interconnect · Nature Photonics 2017'
  },
  accel_quantum_annealer: {
    title: 'Adiabatic Quantum Annealer (Superconducting Qubits)',
    url: 'https://www.dwavesys.com/learn/quantum-computing/',
    organization: 'D-Wave Systems / MIT',
    type: 'theory_foundations',
    category: 'Hardware · Quantum Computing',
    summaryEs: 'Optimización cuántica basada en el Hamiltoniano de Ising. Resuelve problemas combinatorios complejos y muestreo para Boltzmann machines mediante efecto túnel cuántico.',
    summaryEn: 'Ising-Hamiltonian quantum optimization. Solves NP-hard combinatorial optimization and deep energy-based sampling via quantum tunneling.',
    keySpecs: '5,000+ Superconducting Flux Qubits · 15 millikelvin cryostat'
  },
  accel_topological_qubit: {
    title: 'Topological Quantum Coprocessor (Majorana Zero Modes)',
    url: 'https://www.microsoft.com/en-us/research/project/station-q/',
    organization: 'Microsoft Station Q / Nature',
    type: 'theory_foundations',
    category: 'Hardware · Theoretical Quantum Coprocessor',
    summaryEs: 'Cómputo cuántico topológico basado en el trenzado de anyones no abelianos (modos cero de Majorana). Ofrece protección física inherente contra la decoherencia cuántica.',
    summaryEn: 'Topological quantum computing via braiding of non-Abelian anyons (Majorana zero modes). Features hardware-level topological protection against quantum noise.',
    keySpecs: 'Non-Abelian Anyon Braiding · Exponential quantum speedup'
  },
  accel_dyson_matrioshka: {
    title: 'Stellar Dyson Swarm & Matrioshka Brain',
    url: 'https://en.wikipedia.org/wiki/Matrioshka_brain',
    organization: 'Robert Bradbury / SETI Institute',
    type: 'theory_foundations',
    category: 'Hardware · Ultimate Computation Scale',
    summaryEs: 'Megaestructura computacional concéntrica impulsada por la energía solar total de una estrella (Escala Kardashev II). Calcula en el límite termodinámico de Landauer.',
    summaryEn: 'Concentric stellar megastructure powered by the entire radiative output of a star (Kardashev Scale II). Computes at the ultimate Landauer thermodynamic limit.',
    keySpecs: '3.8×10²⁶ Watts · 10⁴² FLOPS thermodynamic capacity'
  },

  // Cooling & Facility Docs
  cool_air_basic: {
    title: 'Forced Air Convection & Heat Sink Thermal Dynamics',
    url: 'https://en.wikipedia.org/wiki/Computer_cooling#Air_cooling',
    organization: 'IEEE Thermal & Thermomechanical Phenomena',
    type: 'theory_foundations',
    category: 'Cooling · Air Flow',
    summaryEs: 'Disipación térmica básica mediante aletas de aluminio y ventiladores axiales de presión positiva. Limitado a densidades inferiores a 250W por socket.',
    summaryEn: 'Basic thermal dissipation using aluminum fins and positive pressure axial fans. Thermally limited to densities below 250W per socket.',
    keySpecs: 'Convective Heat Transfer · 0.9 kW capacity'
  },
  cool_copper_pipes: {
    title: 'Direct-Contact Copper Heat Pipes (Phase-Change Vapor Chambers)',
    url: 'https://en.wikipedia.org/wiki/Heat_pipe',
    organization: 'ASME Heat Transfer',
    type: 'official',
    category: 'Cooling · Vapor Phase Change',
    summaryEs: 'Tubos de cobre sellados al vacío con mecha sinterizada que usan evaporación y condensación de líquido para transferir calor a velocidades cercanas a la del sonido.',
    summaryEn: 'Vacuum-sealed copper tubes with sintered wicks utilizing liquid evaporation and condensation cycles to conduct heat at near-sonic velocities.',
    keySpecs: 'Phase Change Vapor Chamber · 2.5 kW capacity'
  },
  cool_liquid_loop: {
    title: 'Direct-to-Chip Closed Liquid Cooling Loop',
    url: 'https://www.opencompute.org/projects/advanced-cooling-solutions',
    organization: 'Open Compute Project (OCP)',
    type: 'official',
    category: 'Cooling · Direct Liquid',
    summaryEs: 'Bloques de agua con microaletas de cobre y bombas industriales con radiadores de 360mm. Estándar de la industria para GPUs empresariales de hasta 700W.',
    summaryEn: 'Micro-finned copper water blocks, industrial pumps, and triple-fan 360mm radiators. Standard enterprise deployment for GPUs up to 700W.',
    keySpecs: 'Direct-to-Chip Cold Plates · 8 kW capacity'
  },
  cool_immersion_tank: {
    title: 'Two-Phase Dielectric Liquid Immersion Cooling',
    url: 'https://www.grcooling.com/immersion-cooling-explained/',
    organization: 'GRC / 3M Engineered Fluids',
    type: 'official',
    category: 'Cooling · Dielectric Immersion',
    summaryEs: 'Sumergimiento completo de servidores en fluidos dieléctricos no conductores (3M Novec / Fluorinert). Reduce el PUE del datacenter a menos de 1.03.',
    summaryEn: 'Full immersion of server hardware in non-conductive dielectric fluid. Eliminates all fans and brings datacenter PUE down to <1.03.',
    keySpecs: 'Two-Phase Dielectric Boil & Condense · 35 kW capacity'
  },
  cool_cryo_chiller: {
    title: 'Sub-Zero Cryogenic Closed Chiller Loop',
    url: 'https://en.wikipedia.org/wiki/Cryocooler',
    organization: 'Cryogenic Society of America',
    type: 'theory_foundations',
    category: 'Cooling · Cryogenic Systems',
    summaryEs: 'Sistemas de refrigeración criogénica por compresión de helio / nitrógeno líquido a -40°C. Reduce drásticamente la resistencia del silicio y fugas de electrones.',
    summaryEn: 'Cryogenic closed-loop chillers operating at sub-zero temperatures (-40°C). Drastically decreases silicon resistance and transistor leakage current.',
    keySpecs: 'Sub-Zero Active Vapor-Compression · 120 kW capacity'
  },
  cool_liquid_helium: {
    title: 'Superfluid Liquid Helium Dilution Refrigerator',
    url: 'https://en.wikipedia.org/wiki/Dilution_refrigerator',
    organization: 'Oxford Instruments / Bluefors',
    type: 'official',
    category: 'Cooling · Quantum Cryogenics',
    summaryEs: 'Refrigerador de dilución He-3/He-4 que alcanza temperaturas de 10 millikelvin (-273.14°C), permitiendo superconductividad total y coherencia cuántica.',
    summaryEn: 'Helium-3/Helium-4 dilution refrigerator reaching 10 millikelvin temperatures, enabling zero-resistance superconductivity and quantum coherence.',
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
    category: 'Architecture · Transformer',
    summaryEs: 'La arquitectura fundacional que reemplazó las RNNs con mecanismos de auto-atención masivamente paralelizados en GPUs.',
    summaryEn: 'The foundational neural architecture that replaced recurrent networks with massively parallel self-attention mechanisms.',
    keySpecs: 'O(N²) context complexity · Scaled dot-product attention'
  },
  moe: {
    title: 'Outrageously Large Neural Networks: The Sparsely-Gated MoE (Shazeer et al., 2017)',
    url: 'https://arxiv.org/abs/1701.06538',
    organization: 'Google Brain / ICLR',
    type: 'research_paper',
    category: 'Architecture · Mixture of Experts',
    summaryEs: 'Activa dinámicamente solo un subconjunto de expertos por token (ej. 2 de 8 o 2 de 16), multiplicando la capacidad del modelo sin aumentar el costo de FLOPS por token.',
    summaryEn: 'Dynamically routes each token to a sparse subset of experts (e.g. 2 of 8 or 2 of 16), multiplying parameter scale without increasing per-token compute.',
    keySpecs: 'Sparse Routing Gate · Mixtral 8x7B & Switch Transformer basis'
  },
  mamba_ssm: {
    title: 'Mamba: Linear-Time Sequence Modeling with Selective State Spaces (Gu & Dao, 2023)',
    url: 'https://arxiv.org/abs/2312.00752',
    organization: 'Carnegie Mellon & Princeton',
    type: 'research_paper',
    category: 'Architecture · State Space Models',
    summaryEs: 'Procesa secuencias de longitud infinita en tiempo lineal O(N) y memoria O(1) en inferencia mediante kernels de hardware fusionados y espacios de estados selectivos.',
    summaryEn: 'Processes sequences in linear time O(N) and O(1) inference memory via selective state spaces and hardware-aware fused GPU scan kernels.',
    keySpecs: 'O(N) complexity · Million-token context without quadratic memory'
  },
  gnn_hybrid: {
    title: 'Relational Inductive Biases, Deep Learning, and Graph Networks (Battaglia et al., 2018)',
    url: 'https://arxiv.org/abs/1806.01261',
    organization: 'DeepMind / Google',
    type: 'research_paper',
    category: 'Architecture · Graph Neural Networks',
    summaryEs: 'Combina representaciones neuronales con grafos de conocimiento explícitos. Permite razonamiento causal multietapa y reduce drásticamente las alucinaciones.',
    summaryEn: 'Combines neural representations with explicit graph structures, unlocking multi-hop causal reasoning and verifiable relational inference.',
    keySpecs: 'Graph Attention Networks (GAT) · Message Passing over RDF Triples'
  },
  multimodal_diffusion: {
    title: 'High-Resolution Image Synthesis with Latent Diffusion Models (Rombach et al., 2022)',
    url: 'https://arxiv.org/abs/2112.10752',
    organization: 'CompVis / LMU Munich / CVPR',
    type: 'research_paper',
    category: 'Architecture · Latent Diffusion',
    summaryEs: 'Modelado generativo mediante procesos de difusión reversibles en espacios latentes comprimidos con condicionamiento cruzado de atención.',
    summaryEn: 'Generative modeling via iterative denoising diffusion within compressed latent spaces conditioned on cross-attention text embeddings.',
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
    category: 'Attention Mechanism',
    summaryEs: 'Divide las dimensiones de Query, Key y Value en múltiples cabezales independientes para capturar relaciones ortogonales en secuencias.',
    summaryEn: 'Projects Query, Key, and Value into multiple orthogonal subspaces to learn diverse positional and semantic interactions.',
    keySpecs: 'H independent heads · Softmax(QKᵀ / √d) V'
  },
  grouped_query_gqa: {
    title: 'GQA: Training Generalized Multi-Query Transformer Models (Ainslie et al., 2023)',
    url: 'https://arxiv.org/abs/2305.13245',
    organization: 'Google Research / EMNLP',
    type: 'research_paper',
    category: 'Attention Mechanism',
    summaryEs: 'Agrupa múltiples cabezales de Query para compartir pares de Key y Value, reduciendo el tamaño del KV-cache hasta un 87% con mínima pérdida de calidad.',
    summaryEn: 'Groups multiple Query heads to share single Key and Value heads, slashing KV-cache memory bandwidth by up to 87% (used in Llama 3).',
    keySpecs: 'Llama 3 & Mistral KV-cache standard · 8x memory reduction'
  },
  flash_attention_3: {
    title: 'FlashAttention-3: Fast and Accurate Attention with Asynchrony (Dao et al., 2024)',
    url: 'https://arxiv.org/abs/2407.08608',
    organization: 'Stanford & Together AI',
    type: 'research_paper',
    category: 'Attention Mechanism',
    summaryEs: 'Algoritmo exacto de atención consciente del hardware GPU (SRAM tiling). En FlashAttention-3 aprovecha el solapamiento asíncrono TMA en GPUs Hopper (H100) y cuantización FP8.',
    summaryEn: 'IO-aware exact attention algorithm using SRAM tiling. FlashAttention-3 exploits Tensor Memory Accelerator (TMA) asynchrony on Hopper H100 with FP8.',
    keySpecs: 'Up to 75% peak H100 TFLOPS · Zero approximation error'
  },
  linear_attention: {
    title: 'Transformers are RNNs: Fast Autoregressive Transformers with Linear Attention (Katharopoulos et al., 2020)',
    url: 'https://arxiv.org/abs/2006.16236',
    organization: 'Idiap & EPFL / ICML',
    type: 'research_paper',
    category: 'Attention Mechanism',
    summaryEs: 'Aproxima la matriz softmax usando mapas de características de núcleos (kernel maps), transformando el costo computacional de O(N²) a O(N).',
    summaryEn: 'Replaces the softmax operator with kernel feature maps, decoupling matrix multiplications and reducing complexity from O(N²) to O(N).',
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
    category: 'Precision & Quantization',
    summaryEs: 'Formato estándar de 32 bits (1 signo, 8 exponente, 23 mantisa). Máxima estabilidad numérica y rango dinámico, pero requiere 4 bytes por peso.',
    summaryEn: 'Standard 32-bit floating point format (1 sign, 8 exponent, 23 mantissa). Maximum numerical stability, requiring 4 bytes per parameter.',
    keySpecs: '4 bytes/parameter · 1e-38 to 3e38 range'
  },
  bf16: {
    title: 'Bfloat16 Floating-Point Format (Brain Floating Point)',
    url: 'https://en.wikipedia.org/wiki/Bfloat16_floating-point_format',
    organization: 'Google Cloud & NVIDIA',
    type: 'official',
    category: 'Precision & Quantization',
    summaryEs: 'Formato de 16 bits que preserva los 8 bits de exponente de FP32 con 7 bits de mantisa. Evita el underflow en gradientes sin necesidad de scaling.',
    summaryEn: '16-bit format retaining the full 8-bit dynamic exponent range of FP32. Prevents gradient underflow without requiring loss-scaling heuristics.',
    keySpecs: '2 bytes/parameter · Standard for modern LLM pre-training'
  },
  int8: {
    title: 'LLM.int8(): 8-bit Matrix Multiplication for Transformers at Scale (Dettmers et al., 2022)',
    url: 'https://arxiv.org/abs/2208.07339',
    organization: 'University of Washington & bitsandbytes / NeurIPS',
    type: 'research_paper',
    category: 'Precision & Quantization',
    summaryEs: 'Cuantización de enteros de 8 bits con aislamiento de vectores atípicos (outlier features). Reduce el uso de memoria a la mitad sin pérdida de perplejidad.',
    summaryEn: '8-bit integer quantization with vector-wise outlier isolation. Halves VRAM memory footprint with zero degradation in reasoning benchmarks.',
    keySpecs: '1 byte/parameter · INT8 Matrix Multiplication with FP16 outliers'
  },
  fp4: {
    title: 'Open Compute Project (OCP) Microscaling Formats (MX) Specification',
    url: 'https://www.opencompute.org/documents/ocp-microscaling-formats-mx-v1-0-spec-final-pdf',
    organization: 'Open Compute Project / NVIDIA Blackwell',
    type: 'official',
    category: 'Precision & Quantization',
    summaryEs: 'Formato de 4 bits con bloques microscalares compartidos (MXFP4). Implementado en silicio en NVIDIA Blackwell, cuadruplica la velocidad de inferencia.',
    summaryEn: '4-bit floating point format with micro-scale shared scaling factors (MXFP4). Natively accelerated on NVIDIA Blackwell Tensor Cores.',
    keySpecs: '0.5 bytes/parameter · 4x throughput over FP16'
  },
  ternary_1bit: {
    title: 'The Era of 1-bit LLMs: All Large Language Models are in 1.58 Bits (Wang et al., 2024)',
    url: 'https://arxiv.org/abs/2402.17764',
    organization: 'Microsoft Research',
    type: 'research_paper',
    category: 'Precision & Quantization',
    summaryEs: 'Arquitectura BitNet b1.58 donde cada peso toma únicamente valores en {-1, 0, 1}. Elimina las multiplicaciones matriciales en favor de adiciones enteras.',
    summaryEn: 'BitNet b1.58 architecture where every weight belongs to {-1, 0, 1}. Replaces matrix multiplications with pure integer additions, slashing power draw.',
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
    category: 'Training Objective',
    summaryEs: 'Mide la divergencia entre la distribución de probabilidad predicha por el modelo y la distribución real del próximo token. Base del pre-entrenamiento autoregresivo.',
    summaryEn: 'Measures negative log-likelihood between the model predicted next-token probability distribution and the ground truth sequence.',
    keySpecs: 'L = -∑ y_i log(p_i) · Autoregressive next-token prediction'
  },
  dpo: {
    title: 'Direct Preference Optimization: Your Language Model is Secretly a Reward Model (Rafailov et al., 2023)',
    url: 'https://arxiv.org/abs/2305.18290',
    organization: 'Stanford University / NeurIPS',
    type: 'research_paper',
    category: 'Alignment & RLHF',
    summaryEs: 'Alinea modelos de lenguaje directamente con pares de respuestas preferidas vs rechazadas mediante una pérdida analítica cerrada, eliminando la inestabilidad de PPO.',
    summaryEn: 'Aligns LLMs directly on human preference pairs (chosen vs rejected) using closed-form analytical loss, eliminating PPO reward model instability.',
    keySpecs: 'Closed-form implicit reward · Stable reinforcement alignment'
  },
  ppo_rlhf: {
    title: 'Training Language Models to Follow Instructions with Human Feedback (Ouyang et al., 2022)',
    url: 'https://arxiv.org/abs/2203.02155',
    organization: 'OpenAI (InstructGPT / ChatGPT paper)',
    type: 'research_paper',
    category: 'Alignment & RLHF',
    summaryEs: 'Aprendizaje por refuerzo a partir de retroalimentación humana con optimización de política proximal (PPO) sobre un modelo de recompensa entrenado con jueces humanos.',
    summaryEn: 'Reinforcement Learning from Human Feedback using Proximal Policy Optimization (PPO) constrained by KL divergence against the base policy.',
    keySpecs: 'Actor-Critic PPO · KL penalty constraint · InstructGPT foundation'
  },
  contrastive_infonce: {
    title: 'Representation Learning with Contrastive Predictive Coding (van den Oord et al., 2018)',
    url: 'https://arxiv.org/abs/1807.03748',
    organization: 'Google DeepMind',
    type: 'research_paper',
    category: 'Self-Supervised Learning',
    summaryEs: 'Alinea representaciones latentes maximizando la información mutua entre pares positivos y separando pares negativos en el espacio de embeddings.',
    summaryEn: 'Maximizes mutual information between positive latent representation pairs while pushing apart negative distractors in hyperspherical space.',
    keySpecs: 'InfoNCE Loss · Foundation for CLIP & multimodal alignment'
  },
  energy_based: {
    title: 'A Tutorial on Energy-Based Learning (Yann LeCun et al., 2006)',
    url: 'http://yann.lecun.com/exdb/publis/pdf/lecun-06.pdf',
    organization: 'Yann LeCun / New York University',
    type: 'theory_foundations',
    category: 'Energy-Based Learning',
    summaryEs: 'Asigna valores de energía escalar baja a configuraciones compatibles de variables y energía alta a configuraciones incompatibles. Base de arquitecturas JEPA.',
    summaryEn: 'Assigns scalar energy to input-output pairs, pulling down energy on ground truth and pushing up on negatives. Foundation for Joint-Embedding Predictive Architectures (JEPA).',
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
    category: 'Data Engine · Relational Tabular',
    summaryEs: 'Bases de datos estructuradas con esquemas normalizados y garantías ACID. Proporciona datos numéricos deterministas y registros financieros libres de ruido.',
    summaryEn: 'Structured relational database with normalized B-tree schemas and ACID guarantees. Essential for exact mathematical and financial ground truth.',
    keySpecs: 'ACID Compliance · MVCC Concurrency · Tabular schemas'
  },
  data_vector_rag: {
    title: 'Hierarchical Navigable Small World Graphs for Vector Search (HNSW - Malkov & Yashunin, 2018)',
    url: 'https://arxiv.org/abs/1603.09320',
    organization: 'IEEE Transactions on Pattern Analysis & Machine Intelligence',
    type: 'research_paper',
    category: 'Data Engine · Vector Space / RAG',
    summaryEs: 'Espacio vectorial de alta dimensionalidad (1536d) indexado con grafos HNSW para búsqueda por proximidad semántica y Retrieval-Augmented Generation (RAG).',
    summaryEn: 'High-dimensional latent vector indexing with HNSW graphs for approximate nearest-neighbor search and real-time semantic RAG retrieval.',
    keySpecs: 'Cosine / Inner-product distance · Sub-millisecond ANN search'
  },
  data_knowledge_graph: {
    title: 'W3C Resource Description Framework (RDF) & Graph Triples',
    url: 'https://www.w3.org/TR/rdf11-primer/',
    organization: 'World Wide Web Consortium (W3C) & Neo4j',
    type: 'official',
    category: 'Data Engine · Ontological Graph',
    summaryEs: 'Grafos dirigidos con etiquetas de sujeto-predicado-objeto. Permite deducción ontológica multietapa y verificación lógica para erradicar alucinaciones.',
    summaryEn: 'Directed labeled knowledge graphs with subject-predicate-object triples. Enables multi-hop deductive reasoning and zero-hallucination factual grounding.',
    keySpecs: 'RDF Triples · SPARQL / Cypher graph traversal · Causal ontology'
  },
  data_synthetic_flywheel: {
    title: 'Constitutional AI & Self-Play (Anthropic / DeepMind AlphaZero)',
    url: 'https://www.anthropic.com/research/constitutional-ai',
    organization: 'Anthropic & DeepMind',
    type: 'research_paper',
    category: 'Data Engine · Synthetic Self-Play Flywheel',
    summaryEs: 'Bucle cerrado donde el modelo genera problemas complejos, los valida contra entornos simulados y se auto-corrige con críticas guiadas por principios constitucionales.',
    summaryEn: 'Closed-loop data flywheel where models generate complex problems, verify solutions in simulated sandboxes, and train on validated synthetic proofs.',
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
    category: 'R&D Paper · Tokenization',
    summaryEs: 'Algoritmo de compresión iterativa que construye vocabularios sub-palabra fusionando los pares de bytes más frecuentes.',
    summaryEn: 'Iterative compression algorithm that builds efficient subword vocabularies by merging the most frequent byte pairs.',
    keySpecs: 'Byte-Pair Encoding · HuggingFace Tokenizers basis'
  },
  res_lora_peft: {
    title: 'LoRA: Low-Rank Adaptation of Large Language Models (Hu et al., 2021)',
    url: 'https://arxiv.org/abs/2106.09685',
    organization: 'Microsoft Research / ICLR',
    type: 'research_paper',
    category: 'R&D Paper · Parameter-Efficient Fine-Tuning',
    summaryEs: 'Congela los pesos pre-entrenados del modelo e inyecta matrices de rango bajo entrenables (W = W0 + B×A), reduciendo la VRAM de entrenamiento en un 70%.',
    summaryEn: 'Freezes pre-trained model weights and injects trainable low-rank decomposition matrices (W = W0 + B×A), slashing fine-tuning VRAM by up to 70%.',
    keySpecs: 'Rank r=8..64 · 10,000x fewer gradient parameters'
  },
  res_flash_attention: {
    title: 'FlashAttention: Fast and Memory-Efficient Exact Attention with IO-Awareness (Dao et al., 2022)',
    url: 'https://arxiv.org/abs/2205.14135',
    organization: 'Stanford University / NeurIPS',
    type: 'research_paper',
    category: 'R&D Paper · Kernel Optimization',
    summaryEs: 'Reorganiza el cómputo de atención dividiendo en bloques que caben en la SRAM ultra-rápida de la GPU, eliminando accesos redundantes a memoria HBM.',
    summaryEn: 'Tiles attention matrix operations to fit within fast GPU on-chip SRAM, cutting high-bandwidth memory (HBM) read/writes by up to 80%.',
    keySpecs: 'Fused CUDA kernel · 3x training acceleration'
  },
  res_rope_embeddings: {
    title: 'RoFormer: Enhanced Transformer with Rotary Position Embedding (Su et al., 2021)',
    url: 'https://arxiv.org/abs/2104.09864',
    organization: 'Zhuiyi Technology / Neurocomputing',
    type: 'research_paper',
    category: 'R&D Paper · Positional Encoding',
    summaryEs: 'Aplica una rotación en el plano complejo a los vectores de Query y Key dependiente de la posición relativa, permitiendo extrapolar contextos infinitos.',
    summaryEn: 'Encodes relative position by rotating Query and Key vectors in complex space, unlocking robust context length extrapolation (used in Llama 3).',
    keySpecs: 'Rotary Position Embedding · 128k+ token extrapolation'
  },
  res_dpo_alignment: {
    title: 'Direct Preference Optimization: Your Language Model is Secretly a Reward Model (Rafailov et al., 2023)',
    url: 'https://arxiv.org/abs/2305.18290',
    organization: 'Stanford University / NeurIPS',
    type: 'research_paper',
    category: 'R&D Paper · Post-Training Alignment',
    summaryEs: 'Demuestra matemáticamente que el problema de RLHF puede formularse de manera exacta sobre la política del modelo sin entrenar un clasificador de recompensa separado.',
    summaryEn: 'Mathematically proves that the RLHF objective can be solved in closed form directly over the language model policy without a separate reward model.',
    keySpecs: 'Analytical RLHF · Closed-form policy gradients'
  },
  res_moe_architecture: {
    title: 'Switch Transformers: Scaling to Trillion Parameter Models with Simple and Efficient Sparsity (Fedus et al., 2021)',
    url: 'https://arxiv.org/abs/2101.03961',
    organization: 'Google Research / JMLR',
    type: 'research_paper',
    category: 'R&D Paper · Scalable Sparsity',
    summaryEs: 'Escala modelos a billones de parámetros mediante enrutadores dispersos simplificados que dirigen cada token a un único experto especializado.',
    summaryEn: 'Scales neural models to trillions of parameters by simplifying sparse routing to send each token to a single specialized expert layer.',
    keySpecs: 'Top-1 / Top-2 gating · 4x speedup over dense models'
  },
  res_agentic_mcts: {
    title: 'Tree of Thoughts: Deliberate Problem Solving with Large Language Models (Yao et al., 2023)',
    url: 'https://arxiv.org/abs/2305.10601',
    organization: 'Princeton University & Google DeepMind / NeurIPS',
    type: 'research_paper',
    category: 'R&D Paper · Inference-Time Reasoning',
    summaryEs: 'Permite a los modelos explorar múltiples caminos de razonamiento mediante árboles de búsqueda Monte Carlo (MCTS) y retroceso (backtracking) deliberado.',
    summaryEn: 'Empowers models to explore multiple heuristic reasoning branches using Monte Carlo Tree Search (MCTS) with self-evaluations and backtracking.',
    keySpecs: 'Q* / o1 deliberate inference-time reasoning'
  },
  res_recursive_self_code: {
    title: 'Gödel Machines: Self-Referential Universal Problem Solvers Making Provably Optimal Self-Improvements (Schmidhuber, 2003)',
    url: 'https://arxiv.org/abs/cs/0309048',
    organization: 'IDSIA / Jürgen Schmidhuber',
    type: 'theory_foundations',
    category: 'R&D Paper · Recursive Self-Improvement',
    summaryEs: 'Sistema computacional auto-referencial que puede reescribir cualquier parte de su propio código fuente solo si puede demostrar matemáticamente que la modificación mejorará su utilidad esperada.',
    summaryEn: 'Self-referential computational architecture capable of rewriting its own code and weights if and only if it can mathematically prove the upgrade will increase utility.',
    keySpecs: 'Provably optimal self-modification · Singularity threshold'
  }
};

// 8. INFERENCE & AGENT PARAMETERS DOCS
export const INFERENCE_DOCS: Record<string, DocEntry> = {
  temperature: {
    title: 'Temperature Sampling in Softmax Distributions',
    url: 'https://huggingface.co/blog/how-to-generate',
    organization: 'Hugging Face / Geoffrey Hinton (Knowledge Distillation 2015)',
    type: 'official',
    category: 'Inference Parameter',
    summaryEs: 'Escala los logits dividiéndolos por T antes de la función Softmax: p_i = exp(z_i / T) / ∑ exp(z_j / T). Valores bajos (<0.3) producen respuestas deterministas; valores altos (>1.0) fomentan la creatividad y el riesgo.',
    summaryEn: 'Scales logits before Softmax: p_i = exp(z_i / T) / ∑ exp(z_j / T). Low values (<0.3) force deterministic greediness; high values (>1.0) increase diversity and entropy.',
    keySpecs: 'T ∈ [0.0, 2.0] · Softmax Logit Temperature Scaling'
  },
  top_p: {
    title: 'The Curious Case of Neural Text Degeneration (Top-P / Nucleus Sampling - Holtzman et al., 2019)',
    url: 'https://arxiv.org/abs/1904.09751',
    organization: 'University of Washington & Allen Institute / ICLR',
    type: 'research_paper',
    category: 'Inference Parameter',
    summaryEs: 'Muestreo por núcleo: restringe el vocabulario candidato al conjunto más pequeño de tokens cuya masa acumulada de probabilidad supera el umbral P (ej. 90%).',
    summaryEn: 'Nucleus sampling: truncates the sampling candidate pool to the dynamic smallest subset of tokens whose cumulative probability exceeds threshold P (e.g. 0.90).',
    keySpecs: 'P ∈ [0.05, 1.0] · Eliminates low-probability tail tokens'
  },
  top_k: {
    title: 'Top-K Sampling (Hierarchical Neural Story Generation - Fan et al., 2018)',
    url: 'https://arxiv.org/abs/1805.04833',
    organization: 'Facebook AI Research (FAIR) / ACL',
    type: 'research_paper',
    category: 'Inference Parameter',
    summaryEs: 'Filtra los K tokens más probables y redistribuye la masa de probabilidad únicamente entre ellos, evitando palabras incongruentes en la cola larga.',
    summaryEn: 'Filters the top K most likely tokens and redistributes probability mass among them, preventing nonsensical long-tail tokens.',
    keySpecs: 'K ∈ [1, 100] · Fixed-count candidate truncation'
  },
  repetition_penalty: {
    title: 'Ctrl: A Conditional Transformer Language Model for Controllable Generation (Keskar et al., 2019)',
    url: 'https://arxiv.org/abs/1909.05858',
    organization: 'Salesforce Research',
    type: 'research_paper',
    category: 'Inference Parameter',
    summaryEs: 'Penaliza los logits de los tokens que ya han aparecido en el contexto previo dividiéndolos por un factor θ > 1.0, eliminando bucles y repeticiones infinitas.',
    summaryEn: 'Penalizes logits of tokens that have already appeared in the preceding sequence by dividing them by penalty θ > 1.0, eliminating repetitive loops.',
    keySpecs: 'θ ∈ [1.0, 2.0] · Contextual logit discount'
  },
  constitutional_guardrails: {
    title: 'Constitutional AI: Harmlessness from AI Feedback (Bai et al., 2022)',
    url: 'https://www.anthropic.com/research/constitutional-ai',
    organization: 'Anthropic',
    type: 'research_paper',
    category: 'Safety & Guardrails',
    summaryEs: 'Entrenamiento de seguridad donde el modelo evalúa y redacta sus propias respuestas contra un conjunto de principios constitucionales explícitos sin requerir moderación humana continua.',
    summaryEn: 'Safety training methodology where AI critiques and revises its own outputs based on explicit constitutional principles without ongoing human intervention.',
    keySpecs: 'Rule-based automated alignment · Llama Guard & Constitutional frameworks'
  }
};
