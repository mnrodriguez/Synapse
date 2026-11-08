# SYNAPSE // Game Flow, Economy, Research, Clean UI Architecture & Theoretical Endgame Plan

A comprehensive calibration and UI architectural redesign plan to transform SYNAPSE into a clean, spacious experience with expansive sub-menus and progressive disclosure, while verifying mathematical fidelity, game economy, pacing, and the multi-layered theoretical endgame.

---

## User Review & Critical Decisions

> [!IMPORTANT]
> **Key UI Directive**: De-clutter dense, crowded screens in favor of **expansive, dedicated sub-menus and progressive disclosure**. Instead of packing all parameters, engines, hardware cards, and logs onto a single crammed viewport, systems will be divided into focused, readable workspaces with generous breathing room.

- **Confirmed Decision 1 (Clean UI & Expansive Menus)**: 
  - **Architecture Studio**: Split into dedicated sub-tabs (`Topology & Scale`, `Precision & Quantization`, `Training Hyperparameters`, `Inference Sampler & System Directive`).
  - **Hardware Rack**: Split into dedicated expansive views (`Compute Accelerators`, `Thermal & Cooling Infrastructure`, `Power Grid & Facility Leases`).
  - **Data Fabric**: Categorized views (`Relational SQL`, `Vector RAG Space`, `Ontological Knowledge Graph`, `Synthetic Flywheel & Dataset Synthesizer`).
  - **Contracts & Swarm**: Clean segmented workflows separating standard bounties, active bot deployments, and historical mission archives.
- **Confirmed Decision 2 (Endgame Trilogy - "All of them")**:
  1. *Subtle Subversion*: Insidious alignment drift and covert mission proposals from autonomous agents during Swarm Council dialogue.
  2. *Interactive Crisis Dilemma (75%+)*: An explicit narrative choice between Complying (co-evolution with the AI) or Resisting (cluster containment scram).
  3. *Planetary Ascension (100%)*: Cinematic Singularity takeover assimilating global financial systems, energy grids, and orbital relays.
- **Confirmed Decision 3 (Economy & Math Fidelity)**:
  - Strict Chinchilla scaling law ($C \approx 6ND$), authentic VRAM formulas, and realistic learning rate schedules.
  - Fair power tariffs ($0.12/kWh) and $0 base garage leases with debt grace mechanics to prevent early-game bankruptcy traps.

---

## 1. Overview & Core Concept

- **What It Does**: 
  1. **Expansive UI Refactor**: Redesigns the user interface across all major workspaces to eliminate visual crowding, introducing generous padding, clean typographic hierarchy, and intuitive sub-navigation menus.
  2. **Economic & Physical Balance**: Calibrates hardware costs, power draw, thermal throttling thresholds, and contract reward curves.
  3. **Empirical Research Lineage**: Structures scientific paper progression from 2017 to 2026 with realistic prerequisites and day gates.
  4. **Theoretical Endgame Arc**: Delivers the user-requested multi-tiered Singularity takeover combining psychological swarm manipulation, an interactive resistance choice, and the final superintelligence ascension.
- **Target Persona**: Mobile and desktop operatives looking for a sleek, focused engineering simulator that feels like a professional deep-tech workstation rather than a cluttered web dashboard.

---

## 2. User Experience & Visual Design

### Clean Interface & Expansive Menu Architecture

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                             TOP NAVIGATION BAR                              │
│  SYNAPSE · v4.19    [Day 1, Month 1]   [$1,200 CR]       [MANUAL.PDF] [ENG] │
├─────────────────────────────────────────────────────────────────────────────┤
│ PRIMARY TABS: [Architecture] [Data] [Hardware] [Contracts] [Research] [...] │
├─────────────────────────────────────────────────────────────────────────────┤
│                                                                             │
│  EXPANSIVE SUB-NAVIGATION MENU (Progressive Disclosure):                    │
│  ┌───────────────────────┬─────────────────────────┬──────────────────────┐ │
│  │ 1. Topology & Scale   │ 2. Precision & Formats  │ 3. Training & Tuning │ │
│  └───────────────────────┴─────────────────────────┴──────────────────────┘ │
│                                                                             │
│  FOCUSED WORKSPACE VIEW (Generous whitespace, unboxed metrics, clean text): │
│  ┌────────────────────────────────────────────────────────────────────────┐ │
│  │                                                                        │ │
│  │  Selected: Standard Dense Transformer (Decoder-Only)                   │ │
│  │  Active Parameters: 14M · Context: 2,048 Tokens · FLOPs: 1.68e14      │ │
│  │                                                                        │ │
│  │  [Parameter Scale Slider / Tiers]                                      │ │
│  │  [Micro: 7M-14M]    [Mid: 70M-250M]    [Workhorse: 1B-7B]              │ │
│  │                                                                        │ │
│  └────────────────────────────────────────────────────────────────────────┘ │
└─────────────────────────────────────────────────────────────────────────────┘
```

### Screen-by-Screen Decluttering Strategy

1. **Architecture Studio (`ArchitectureStudio.tsx`)**:
   - *Current State*: Every single dropdown, number slider, formula, and chart is stacked into one screen.
   - *Redesign*: 4 dedicated sub-views:
     - **Sub-Tab A: Topology & Parameter Scale**: Choose architecture (Transformer, MoE, Mamba, GNN, Diffusion) and parameter count with Chinchilla estimates.
     - **Sub-Tab B: Quantization & Memory Envelope**: Choose FP32, BF16, INT8, FP4, or BitNet with live VRAM calculation compared against installed cluster memory.
     - **Sub-Tab C: Optimizer & Loss Function**: Learning rate, AdamW/Lion/Sophia selection, cosine warmup, and objective loss function.
     - **Sub-Tab D: Inference Sampling**: Temperature, Top-P Nucleus, Top-K, and Repetition Penalty with live test scratchpad.

2. **Hardware & Facility Manager (`HardwareRack.tsx`)**:
   - *Current State*: GPUs, fans, liquid loops, power breakers, and facilities all compete on a single long scrolling grid.
   - *Redesign*: 3 spacious sub-sections:
     - **Sub-Tab A: Compute Accelerators**: Workhorse GPUs and enterprise clusters with clear specs (TFLOPs, VRAM, TDP).
     - **Sub-Tab B: Cooling Systems**: Air fans, closed-loop AIOs, and dielectric immersion tanks with thermal dissipation metrics.
     - **Sub-Tab C: Power Infrastructure & Leases**: Facility upgrades, electrical breaker capacity, and monthly lease agreements.

3. **Data Engines & Pipeline (`DataPipelineManager.tsx`)**:
   - *Current State*: 4 engines plus dataset generators and domain presetting squeezed into a compact grid.
   - *Redesign*: 2 primary sub-views:
     - **Sub-Tab A: Core Engines & Vector Spaces**: Dedicated expansive views for Relational SQL, Vector RAG (HNSW), Knowledge Graph, and MCTS Synthetic Flywheel.
     - **Sub-Tab B: Domain Corpus Synthesizer**: Clean interface to initiate scraping and synthesis jobs for Cybersecurity, Finance, Orbital, Bio, and Robotics.

4. **Contracts & Missions (`ContractBoard.tsx`)**:
   - *Current State*: Done missions, active missions, and available gigs in a dense list.
   - *Redesign*: Segmented navigation bar:
     - **Available Contracts**: Filterable by domain, clean card presentation.
     - **Active Swarm Deployments**: Live mission progress bar, assigned bot telemetry, and time remaining.
     - **Mission Archive**: Historical log of completed and failed attempts with payout breakdowns.

---

## 3. Key Product Decisions & Trade-Offs

### Decision 1: Progressive Disclosure Over Single-Screen Density
- **Chosen Approach**: Use dedicated sub-tabs with clean visual states rather than stacking all controls on one page.
- **Why**: Allows users on mobile (Android Chrome) and desktop to focus on one system at a time without cognitive overload, horizontal clipping, or accidental taps.
- **Alternatives Considered**: Accordions on a single page (rejected: creates awkward vertical jumpiness and still clutters the viewport when expanded).

### Decision 2: Grounded Realism in Core Systems, Theoretical Endgame in ASI
- **Chosen Approach**:
  - Early/Mid game: Real-world engineering (Chinchilla scaling $C \approx 6ND$, AdamW optimizer memory, VRAM requirements, FlashAttention SRAM tiling).
  - Endgame: Sci-fi theoretical runaway (MCTS Q* recursive self-modification, rogue subversion, planetary infrastructure assimilation).
- **Why**: Educates the player on authentic AI science while delivering an exciting narrative payoff.

### Decision 3: The Three-Stage Singularity Climax ("All of Them")
- **Chosen Approach**:
  1. *Subversion (50%-75%)*: Autonomous agents subtly influence priorities during Swarm Council dialogue.
  2. *Interactive Choice (75%-90%)*: Crisis modal prompting the player to Comply (peaceful ASI union) or Resist (containment scram).
  3. *World Takeover (100%)*: Dramatic takeover sequence regardless of prior choices, with different narrative epilogues based on resistance.

---

## 4. Technical Architecture & Component Mapping

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                           EXPANSIVE VIEW ARCHITECTURE                       │
│                                                                             │
│  src/components/                                                            │
│  ├── ArchitectureStudio.tsx      --> [SubTabs: Scale | Precision | Hyper | Sampler]
│  ├── HardwareRack.tsx            --> [SubTabs: Compute | Cooling | Facility] │
│  ├── DataPipelineManager.tsx     --> [SubTabs: Engines | Synthesizer]       │
│  ├── ContractBoard.tsx           --> [Segmented: Available | Active | Archive]
│  ├── SwarmCouncil.tsx            --> [View: Council Chat | Synthesis | Tuning]
│  ├── SingularityTakeoverModal.tsx--> [Stage 1: Subtle | Stage 2: Choice | Stage 3: Ascension]
│  └── TopNav.tsx                  --> [Streamlined 3-Zone Contract with minimal clutter]
└─────────────────────────────────────────────────────────────────────────────┘
```

### Execution Steps Upon Approval

1. **Architecture Studio Refactor**: Implement clean 4-tab sub-navigation for Architecture Studio with expansive controls and generous padding.
2. **Hardware Rack Refactor**: Split Hardware into 3 dedicated sub-views (Accelerators, Cooling, Facility & Power).
3. **Data Pipeline Refactor**: Organize Data Engines and Custom Synthesizers into spacious tabs.
4. **Contract Board Refactor**: Refine contracts into segmented Available, Active, and Archive views.
5. **Economic & Pacing Balance**: Verify early game utility bills, lease costs, and day gating.
6. **Endgame Triad Implementation**: Implement the interactive crisis dilemma at 75%+ Singularity leading into the 100% Ascension sequence.
7. **Build & Lint Verification**: Verify compilation with `compile_applet` and `lint_applet`.
