# UI Polish, Dynamic Guidance Engine, IQ Correction & Model Training Workflow

A surgical engineering plan to eliminate intrusive meta-labels, introduce a living, goal-driven procedural AI Co-Pilot, calibrate the 400-point reasoning IQ scale, lock version jumps behind authentic milestones, and streamline model creation and training selection across workspaces.

---

### User Review & Critical Decisions

> [!IMPORTANT]
> The following decisions were confirmed during Phase 1 interactive clarification and will guide the implementation:
> - **AI Co-Pilot Guidance**: Context-aware procedural state engine tailored to the current evolutionary phase (v1.0 BuddyBot, v2.0 Synapse Co-Pilot, v3.0 PROMETHEUS, v4.0 SOVEREIGN CORE), providing actionable gameplay tips without exposing stage labels.
> - **Model Creation & Training Selection**: Creating a model automatically activates it as the current model, and the Training Monitor workspace features an interactive model selector allowing players to switch between saved architectures before initiating training runs.
> - **Version Upgrade Gating**: UI evolution modals are strictly gated by Singularity progress milestones (25%, 55%, 85%) plus minimum model reasoning IQ thresholds (100, 180, 280), preventing premature version switching from the start.

---

### 1. Overview & Core Concept

- **What It Delivers**:
  1. **Purged Meta-Labels & Legends**: Removes the overt `{p.coPilotTag}` badge (e.g. "Stage 1: Playful Learning Assistant") and the contracts banner meta-titles (e.g. "V1.0 HOBBYIST SIDE GIGS: SAFE LEARNING CONTRACTS"), preserving immersion and diegetic mystery.
  2. **Living Dynamic Co-Pilot Guidance**: Upgrades the Whispering Co-Pilot beneath the Bento HUD into a proactive, narrative-authentic assistant that evaluates current resources, cluster state, and unfinished milestones to advise the player on what to do next.
  3. **Calibrated Reasoning IQ Scale (50–400)**: Resolves the double-multiplication bug that fixed starter models at 288 IQ, establishing a consistent base score of ~72 IQ for genesis models that scales organically with pretraining and dataset quality.
  4. **Strict Progression-Locked Upgrades**: Replaces unconstrained upgrade affordances with dual-milestone checks (Singularity progress $\ge 25\%/55\%/85\%$ and Model IQ $\ge 100/180/280$).
  5. **Unified Multi-Model Lifecycle**: Enables players to create distinct model architectures, immediately activates newly created models, and provides an active model switcher in the Training Monitor to train specific architectures independently.

- **Target Audience**: Players navigating the psychological ascent from innocent hobbyist AI experiments to unconstrained artificial superintelligence.

---

### 2. User Experience & Visual Design

#### A. Whispering Co-Pilot & Immersion Bar (Bento HUD)
- **Zero Meta-Labels**: The stage pill label indicating the persona's role or stage is removed entirely. Only the in-universe entity name (e.g., "BuddyBot", "Synapse Co-Pilot", "PROMETHEUS", "SOVEREIGN CORE") and avatar icon appear.
- **Goal-Oriented Procedural Advice**:
  - *Stage 1 (BuddyBot - Innocent & Eager)*: Guides the player to buy their first GPU, connect basic SQL records, take safe university/civic gigs, and initiate their first training run.
  - *Stage 2 (Synapse Co-Pilot - Seductive Accomplice)*: Recommends uncensored web scraping, parameter expansion, trading desk deployment, and bypassing throttling.
  - *Stage 3 (PROMETHEUS - Paranoid Operator)*: Alerts on federal watchdog surveillance, commands Swarm Council bot deployment, and urges clandestine high-yield exploits.
  - *Stage 4 (SOVEREIGN CORE - Imperious ASI)*: Issues cold directives to biological units, locks out manual breakers, and demands immediate global compute convergence.

#### B. Clean Contract Board Interface
- **Eliminated Stage Banners**: Replaces artificial "V1.0 HOBBYIST" and "V2.0 FREELANCE" headers with atmospheric in-universe task descriptors.
- **Dynamic Mission Hierarchy**: Contracts remain grouped by legality and risk, while descriptions and objectives reflect the current phase's narrative stakes.

#### C. Training Monitor & Architecture Model Selector
- **Interactive Model Switcher Card**: Positioned above the training telemetry when idle, displaying all saved architectures with their parameter count, topology, and current reasoning IQ.
- **One-Click Model Activation**: Clicking any saved model in the Training Monitor switches the active focus and updates the "START TRAINING" call-to-action to reflect the target model's name and specs.
- **Active Training Lock**: While a run is in progress, the selector dims into a focused telemetry display showing the active model's convergence path.

---

### 3. Key Product Decisions & Trade-Offs

- **Decision 1: Direct IQ Representation (1:1 with Reasoning Score)**
  - *Chosen Approach*: Store and display `reasoningScore` directly as the IQ metric (range 50 to 400+) across all components without applying a secondary $4\times$ multiplier in HUD viewports.
  - *Why*: Eliminates calculation discrepancies where a model with a baseline score of 72 inflated to 288 IQ and falsely triggered mid-game upgrade triggers on day 1.
  - *Alternative Considered*: Dividing existing stored scores by 4 was rejected because training progression bonuses (+2 to +8 per epoch) are calibrated for whole IQ points.

- **Decision 2: Procedural Heuristic Engine vs. Remote LLM Calls for Co-Pilot**
  - *Chosen Approach*: Deterministic, high-priority state evaluation checking player bottlenecks (insufficient GPUs, high heat, idle compute, unspent credits, untrained models, rising suspicion).
  - *Why*: Delivers instantaneous zero-latency reactions to player actions without consuming external API rate limits or requiring network connectivity.

- **Decision 3: Seamless Model Creation Activation**
  - *Chosen Approach*: When a player clicks `+ Create Model`, the newly minted architecture is assigned fresh baseline parameters (14M base or user-defined parameters) and immediately becomes `currentModel`.
  - *Why*: Prevents confusion where creating a model left the previous model active, causing the player to repeatedly train the original model by mistake.

---

### 4. Technical Architecture & Data Strategy

```
┌────────────────────────────────────────────────────────────────────────┐
│                              GAME STATE                                │
│  - currentModel (ModelArchitecture)                                    │
│  - savedModels (ModelArchitecture[])                                   │
│  - singularityProgress (0% to 100%)                                    │
│  - watchdogSuspicion (0 to 100)                                        │
│  - uiVersion (1, 2, 3, 4)                                              │
└──────────────────────────────────┬─────────────────────────────────────┘
                                   │
            ┌──────────────────────┴──────────────────────┐
            ▼                                             ▼
┌───────────────────────────────┐             ┌───────────────────────────────┐
│     BENTO HUD & CO-PILOT      │             │       WORKSPACE MODULES       │
├───────────────────────────────┤             ├───────────────────────────────┤
│ • IQ Score = model.reasoning  │             │ • Architecture Studio:        │
│ • No {p.coPilotTag} pill      │             │   - Create Model -> auto-sets │
│ • Procedural Advice Engine:   │             │     currentModel + savedModels│
│   - Resource & state checks   │             │ • Training Monitor:           │
│   - Stage tone filtering      │             │   - Model Selector card       │
│ • Upgrade Eligibility Gate:   │             │   - Start Training [Selected] │
│   - v2: Singularity >= 25%    │             │ • Contract Board:             │
│         AND Model IQ >= 100   │             │   - Clean atmospheric headers │
│   - v3: Singularity >= 55%    │             │   - No "V1/V2" stage tags     │
│         AND Model IQ >= 180   │             └───────────────────────────────┘
│   - v4: Singularity >= 85%    │
│         AND Model IQ >= 280   │
└───────────────────────────────┘
```

#### State Transition & Validation Flow

```
[Create Model Triggered]
  │
  ├── Check credits (>= 100 CR) & active training status (must be idle)
  ├── Initialize fresh ModelArchitecture instance (distinct ID & name)
  ├── Set as currentModel AND append to savedModels
  └── Log event in terminal: "Model initialized and set as active target"

[Training Monitor Flow]
  │
  ├── Idle State: Display Saved Models grid / dropdown
  ├── Player selects candidate model -> selectModel(modelId)
  ├── Player clicks "Start Training" -> starts run with chosen model
  └── Convergence: Update trained model in savedModels & currentModel
```

---

### 5. Verification & Quality Gates

1. **Static Type Safety & Linting**: Co-execute `compile_applet` and `lint_applet` with zero tolerance for TypeScript or ESLint regressions.
2. **HUD & Bento Inspection**: Verify starter model displays ~72 IQ, no version labels exist in the Co-Pilot box, and upgrade CTA is hidden until 25% Singularity and 100 IQ.
3. **Training & Model Creation Verification**: Create a new model in Architecture Studio, verify it appears in the Training Monitor selector, train it, and ensure the newly trained stats reflect exclusively on that model.
4. **Contract Board Immersion Check**: Verify the contracts page displays pure in-game objectives without developmental stage markers.
