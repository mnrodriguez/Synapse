# SYNAPSE — Game Review 2

Review date: 2026-11-13 · `main` at `53ad084` · PR #45 (`docs/manual`) at `49dfb67`.

Legend used in every finding: **[V]** verified (read, ran or measured) · **[I]** inferred from the code, not run · **[TV]** to verify (no source at hand).
Priorities: **P0** blocks play or teaches something false · **P1** confuses or bores · **P2** polish.


## 1. Merge decision for PR #45

**Decision: MERGE AFTER FIXES.** The PR is a clear improvement and is safe for saves. Seven small fixes (A-1 to A-7) should go in first: six because the PR's own goal is "every number in the manual is true" and those are the places where it is not, and one because the new manual's chapter bar is unreadable on a phone. Nothing was merged.

### 1.1 Test and lint results [V]

| Branch | `bun install` | `bun test` | `bun run lint` (`tsc --noEmit`) |
|---|---|---|---|
| `docs/manual` @ `49dfb67` | 157 packages installed | **150 pass, 0 fail**, 12 818 `expect()` calls, 8 files | exit 0, no output |
| `main` @ `53ad084` | ok | **140 pass, 0 fail**, 5 379 `expect()` calls, 7 files | exit 0, no output |

### 1.2 What the PR really changes in game logic [V]

Read from `git diff origin/main...origin/docs/manual`.

| File | Change | Behavior change? |
|---|---|---|
| `src/utils/rules.ts` (new) | Constants for heat, power, suspicion, guardrail bands, trading tiers, mission odds | No. Values are the literals that were inline on `main` (compared one by one). |
| `agentTick.ts`, `thermalTick.ts`, `missionTick.ts`, `missionEvaluation.ts` | Literals replaced by the constants | No. Same bands (`<35`, `<65`, `<85`, else), same sandbox multipliers, same clamps. |
| `tradingTick.ts` | Tier table instead of `if` chain | No for `low`/`moderate`/`high`: same ranges and the same number of `rand()` calls in the same order. **Yes for an unknown tier**: `main` fell back to a default return, the PR reads `TRADING_TIERS[riskTier].suspicion` and would throw (see A-8). |
| `training.ts` + `GameContext.tsx` (`resolveSingularityCrisis`) | New `swarmGrantPflops`: complying at the 75 % fork now adds **50 % of installed GPU compute, permanently**. The old code multiplied `totalComputePflops` by 1.5 once, and the next tick overwrote it (`GameContext.tsx:1249` recomputes the field every tick), so the "+50 % compute" promise did nothing on `main`. | **Yes, intended.** The promise is now real. |
| `GameContext.tsx` tick (§9.5) | Removed the block that opened the upgrade dialog from the tick | No. The block compared the model score with 100/180/280 (the old IQ scale); the 0–100 scale tops out at 99 (`training.ts:146`), so it could never fire. The upgrade is still offered by `BentoHUD.tsx:54-57` and `GameContext.tsx:3576-3580`. |
| `GameContext.tsx` (`createAgent`) | Role base suspicion read from `ROLE_BASE_SUSPICION` | No. Same nine values. |
| `AgentSandbox.tsx` | Income gauges and "+$/s" removed; agent load (TFLOPS, kW) and suspicion per day shown instead | UI only. Agents never paid passive income on `main` (`agentTick.ts` comment and code), so the old gauge was false. |

### 1.3 Manual versus code: every numeric claim [V]

I rendered the manual with `buildManual()` for EN v1, v2, v4 and ES v1, v2, v4 and traced each number. Most numbers are read from constants, so they are right by construction. The ones typed by hand in `manualContent.ts:60-190` were checked against the code:

| Claim in the manual | Code | Result |
|---|---|---|
| Tick = 30 min, 48 ticks/day, 30-day month | `training.ts:17,62`, `constants.ts:23` | OK |
| Work = 6 × params × tokens × epochs; 1 real GPU-minute per tick at 35 % | `training.ts:15-21,52`, `GameContext.tsx` `startTraining` (`runTokens = plan.totalTokens`) | OK |
| Ceiling 15·log10(params/1M)+8; table 14M→25.2 … 70B→80.7 | `training.ts:145` | OK |
| Run closes 15 % of the gap; full data effect at 20 tokens/param; quality ±15 % | `training.ts:167-169`, `trainingRun.ts:79` | OK |
| Repeated pass worth 75 %; 1–8 epochs; −1.2 per epoch past overfitting | `trainingRun.ts:27,77,82` | OK |
| LR table (×0.55, ×1, ×1.1, diverges) and batch table | `trainingRun.ts:37-49` | OK |
| VRAM = bytes/param (4, 2, 1, 0.5, 0.2) + 0.8 GB per 2 048 context tokens, × batch factor | `GameContext.tsx:1563-1569`, `trainingRun.ts:156` | OK |
| Throttle above 85 °C to 40 %; alert 88 °C; suspicion above 95 °C; +1.8 °C/kW, −1.2 °C/tick, floor 35 °C | `rules.ts`, `thermalTick.ts`, `training.ts:47` | OK |
| Breaker: 5 %/tick, 7 h 30 min (15 ticks) | `thermalTick.ts` | OK |
| Bill = kWh × $0.18 + lease, every 30 days | `calendarTick.ts:62-80` | OK |
| Emergency loan 2 500 → debt 2 875; bankruptcy at 0 credits and debt ≥ 5 000 after the loan | `constants.ts:1413-1414`, `GameContext.tsx:1156` | OK |
| Agent: 75 credits (first free), 0.2 TFLOPS, 0.025 kW | `constants.ts:1417-1420`, `GameContext.tsx:2108` | OK |
| Mission needs 0.002 PFLOPS per billion params, half the cluster reserved while training, 20 kW/PFLOPS, min 0.05 kW | `GameContext.tsx:1954-1960` | OK (the 1 TFLOPS minimum, `Math.max(0.001, …)`, is not mentioned) |
| Success: base 45 %, +7/role, data ≤ +15, capability 0.4/pt around 70, overseer +5, −15 missing role, −12 small model, 15–98 % | `missionEvaluation.ts:131-164,313-318` | OK |
| Success: "**up to +15** for the models' evaluation score" | `missionEvaluation.ts:159`: `Math.min(0.15, averageReasoning / 1200)` | **Mismatch (A-1).** The score is 0–100, so the term is score ÷ 12 points: 4.2 at score 50, 8.25 at the hard cap of 99. +15 is unreachable. |
| Success pays 25 % of risk as suspicion, failure 100 %; auto missions pay 60 %, −8 points | `missionTick.ts:60-70,124` | OK. Not mentioned: auto missions also take 1.45× longer (`missionTick.ts:210`). |
| Gauge: +0.4 per score point, mission +1.25/2/2.5/3 by tier, new GPU model +0.5, paper +0.35, domain +0.5 | `missionTiers.ts:40-47`, `GameContext.tsx:1489,2062` | OK but **incomplete (A-3)**: a run is capped at +3 (`trainingTick.ts:129`); deploying a data engine gives +0.25 (`GameContext.tsx:1386`) and scaling one +0.1 (`:1419`); neither is listed. |
| Version upgrade at gauge 25/55/85 and score 28/42/50 | `BentoHUD.tsx:55-57`, `missionTiers.ts:32` | OK |
| Suspicion: alerts 40/70/95, raid at 100; fade 12/day, 21.6 with overseer; overload 12/day; scraping 1.4/day | `rules.ts`, `thermalTick.ts:66-74` | OK |
| Scrub −45 for 250; audit −10 and +25 alignment for 100; cutting the link −15 | `GameContext.tsx:2081-2092,2424-2443,3639` | OK |
| Shadow compute: 15 TFLOPS for 3 d 18 h; 15 % + 0.6/pt, max 85 %; +10 / +25 and 1 d 6 h detention | `GameContext.tsx:2856-2875` | OK in the manual. **The in-game button text disagrees (A-4).** |
| Tools ×1.4, temperature > 1 ×1.3 | `GameContext.tsx:2180` | OK |
| Alignment: < 45 compromised, < 25 jailbroken, overseer +0.08/tick, temp pivot 0.6, Top-P pivot 0.7 | `agentTick.ts:70-85` | OK |
| Incident chance table, sandbox ×2 / ×1 / ×1 / ×0.15, cap 2 %, cooldown 6 d 6 h | `rules.ts`, `agentTick.ts:40-47,107` | OK |
| Trading: +1…3 %, +5…12 %, +14…34 % per day; loss chances 8 % and 15 % | `rules.ts`, `tradingTick.ts:37-47` | **Only true for large capital (A-2).** `tickChange = Math.round(capital × rate)`: on the low tier any desk under ~830 credits rounds to **0 every tick**, and under 2 500 it earns on only part of the ticks. |
| Data readiness 30 + 12/engine + 0.35 × quality; scaling +4 quality, ×2.2 tokens, cost 1.5 × max(price, 200) × level | `missionEvaluation.ts:75`, `GameContext.tsx:1415-1416`, `constants.ts:1657` | OK |
| Scraping tiers table | `constants.ts:483-…` | OK but the required compute (40 TFLOPS at tier 1) and the 5× slowdown below it (`scrapeTick.ts:31`) and the minimum parameters are not mentioned |
| Fork at 75 %; comply +15 subversion, −25 suspicion, +50 % GPU compute; resist −25 subversion, +35 suspicion | `GameContext.tsx:1084,2812-2840`, `training.ts:181-202` | OK |
| Containment: resisted, overseer active, Docker or MicroVM, audit on, subversion < 60 | `epilogue.ts:15-71` | OK |
| Takeover offered at 90 %; link = 80 PFLOPS, cannot be cut in v4 | `AgentSandbox.tsx:988`, `training.ts:177`, `GameContext.tsx:3622-3630` | OK |
| Tab unlocking (first job; 2nd GPU / 1 000 credits / paper; gauge 10) | `GameContext.tsx:1166-1205,3426-3428` | OK |

| **Every gauge number** in the manual: "opens when the gauge passes 10", "available when the gauge reaches 25 / 55 / 85", "+1.25 / +3 per mission", "+0.4 per score point", facility "needs progress 10 / 25 / 50" | Those are the *stored* value (`singularityProgress`). The HUD, the tab badge and the hardware cards show a **different, rescaled number** (`toDisplayProgress`, `singularityGoals.ts:45-96,155`): in v1 stored 0–25 is drawn as 0–90 % and then stays at 90 %. | **Mismatch (A-6).** A v1 player who reads "reaches 25" sees 90 % on screen when that happens, and "passes 10" is 36 % on screen. Screenshot `docs/review2/shots/desktop_v1_tab7.png`: stored 18 is shown as "64.8 %". |

Result: about 60 numeric claims checked. **Three are false as written (A-1, A-2, A-6), one list is incomplete (A-3), and one game text contradicts the manual (A-4).**

### 1.4 Save compatibility and the four UI versions [V]

- `SAVE_SCHEMA_VERSION` stays at 11 (`saveState.ts:27`) and that is correct: the PR adds **no stored field**. The swarm grant is derived from fields that already exist and are already normalised on load (`singularityCrisisResolved`, `playerChoseResist`, `saveState.ts:305-308`). No migration is needed.
- An old save where the player already complied gets the +50 % from the first tick after loading. That is the promised reward arriving late, not a loss.
- `tests/save.test.ts` passes unchanged on the PR branch.
- The PR adds no colors: `tests/theme.test.ts` passes, and the new manual uses only `mutating-*`/`theme-*` classes. Screenshots: `docs/review2/shots_pr45/desktop_v1_manual_decisions.png`, `desktop_v4_manual.png` (desktop is fine in both themes; phone see A-7).
- Balance: the only change a player can feel is the permanent +50 % GPU compute for complying. It is paid for with +15 subversion and the loss of the containment ending, so it does not create a dominant strategy. [I] In v3+ the 80 PFLOPS link already dwarfs any GPU rack (finding G-2), so in practice the grant is small.

### 1.5 Spanish and English parity [V]

- Same keys in both catalogs: 2 619 and 2 619, none missing either way. Placeholders match in every key.
- 227 keys added (207 under `manual.*`), 77 removed, 17 changed. I read all the non-manual additions and changes in both languages and the full Spanish manual (v1 and v4): same meaning, neutral Spanish with "tú", no voseo, no machine-sounding sentences.
- Small language notes (P2): "enlentece / enlentecen" (`agentSandbox.agentLoadHelp`, manual chapters 2 and 3) is regional; "ralentiza" or "hace más lento" is neutral. Decimal and thousands separators follow English in the Spanish manual ("1.2 puntos", "2,500 créditos") while `agentSandbox.toolRiskier` uses "×1,4": pick one. Facility names stay in English in the Spanish manual table ("Basement Rig", "Server Closet"): they come from `FACILITY_TIERS[].name` (`constants.ts:1422`), which is not in the catalog (also on `main`).

### 1.6 Spoilers in v1 and v2 [V]

- The manual hides the "endgame" chapter, the fork row and the domain line until v3 (`manualContent.ts`, `minVersion: 3`, `version >= 3`). In the rendered v1 and v2 manuals, in both languages, I searched for singularity, swarm, subversion, takeover, operative, covert, council, containment, "good ending" and their Spanish forms: **none appear**. Tab and gauge names come from `VERSION_PROFILES`, so v1 says "Learning progress" and "ISP Traffic Notice".
- The v1 manual does describe the raid ("the authorities arrive: every GPU but one is confiscated … you are detained"), shadow compute, jailbroken agents and incidents. These are **not new reveals**: all of them are reachable and already named in the v1 interface on `main` (`bentoHUD.raidImminent`, the shadow compute card in `HardwareRack.tsx:675-691`). The tone clash with "Bedroom Desk PC" is a `main` problem and is reported as S-1 in section 4.1.
- **One new, mild spoiler (A-5):** the v1/v2 decision row and chapter 9 say an upgrade "may change more than its offer says: check the log and the panels after installing one". The whole v2 offer is built as a friendly dark theme (`upgradeModal.v2.*`); telling the player in advance that upgrades hide things weakens the twist that H-1/H-2 of the previous plan protect.
- The PR's own spoiler test (`tests/manual.test.ts:23-31`) only checks English and five words. It passes today, but it would not catch "singularity" or any Spanish word.

### 1.7 Fixes to make before merging

| ID | Fix | Where | How to verify |
|---|---|---|---|
| **A-1** | Either change the text to "about 1 point for every 12 points of score (at most 8)", or rescale the divisor to the 0–100 scale (`averageReasoning / 660` gives +15 at 99). Changing the divisor changes balance; the text fix is the safe one for this PR. | `en.ts`/`es.ts` `manual.missions.p2`; `missionEvaluation.ts:159`; `rules.ts` `MISSION.reasoningBonusMax` | Add to `manual.test.ts`: for score 99 the computed bonus equals the number printed. |
| **A-2** | Keep fractional capital (`capital + capital × rate`, round only on display), or state the minimum useful capital in the manual and on the desk. | `tradingTick.ts:47` | Test: 500 credits on the low tier for 48 ticks gains between 1 % and 3 %. |
| **A-3** | Add the three missing gauge sources and the +3 cap per run to chapter 9. | `manual.progress.*`, `manualContent.ts` | Read chapter 9 against `trainingTick.ts:129`, `GameContext.tsx:1386,1419`. |
| **A-4** | The button text says "+0.015 PFLOPS for about 3 game days" and the detention log "about 1 game day"; the real values are 3 d 18 h and 1 d 6 h. Pass `formatGameTime(SUSPICION.shadowTicks)` and `shadowDetentionTicks` as parameters, as the manual does. Same for the "×1.4" typed into `agentSandbox.toolRiskier`. | `en.ts`/`es.ts` `ui.shadow_compute_description`, `gameContext.shadowOperationDetectedRiskOperative`, `agentSandbox.toolRiskier` | The catalog test for parameters already exists; the texts then cannot drift. |
| **A-6** | State gauge numbers the way the screen shows them. Simplest: have `manualParams` pass every gauge threshold through `toDisplayProgress(version, x)` (as `HardwareRack.tsx:51` already does) and describe per-mission and per-point gains as "a share of this version's bar". Better, later: remove the rescaling (finding G-1). | `manualContent.ts` (`progressTabAt`, `upgradeProgress`, `missionProgress`, `progressPerPoint`, `newGpuProgress`, `paperProgress`, facility column) | Test: the number in `manual.progress.upgrade` equals `toDisplayProgress(v, threshold)`. |
| **A-7** | On a 390 px phone the chapter buttons of the manual are drawn on top of each other and cannot be read (`docs/review2/shots_pr45/mobile_v4_manual_decisions.png`). The buttons in the scrolling row can shrink; add `shrink-0` to them. [V on the PR branch; `main` not checked] | `HelpManual.tsx:106-118` | Playwright at 390 px: no two chapter buttons overlap; tapping "2." changes the chapter. |
| **A-5** | Show the "may change more than its offer says" sentence only from v3 (after the player has lived through one upgrade), and extend the spoiler test to Spanish and to "singularity / singularidad / operative / operativo / enjambre / subversión". | `manual.dec.upgrade.cost`, `manual.progress.upgradeEffect`, `tests/manual.test.ts` | The test fails if the words come back. |

Can follow in a later PR (not blocking):

| ID | Item |
|---|---|
| A-8 | `tradingTick.ts:37`: `TRADING_TIERS[riskTier] ?? TRADING_TIERS.low`. Today only three values can be stored, so this is hardening against a hand-edited or future save; without it a bad value throws on every tick. |
| A-9 | The PR says the 9-page PDF was deleted, but `SYNAPSE_AI_Architecture_Manual.pdf` (repo root) and `public/SYNAPSE_AI_Architecture_Manual.pdf` are still the 9-page file with the outdated strategy page (counted `/Type /Page` objects: 9, 9, and 8 for the asset the game opens). `SYNAPSE_AI_STUDY_GUIDE.txt` still gives that path as "Direct Download Link" and has a typo: "has been an 8-page visual PDF". Replace both copies with the 8-page file. |
| A-10 | `training.ts:11-12` comment says the covert node is not part of training. The code adds it (`trainingTick.ts:62`), and the manual correctly says so. Fix the comment. |
| A-11 | Language notes of 1.5. |
| A-12 | The design findings the PR lists but leaves open (output filter and reward-hacking audit have no mechanical effect; version-upgrade promises are narrative) are confirmed and taken up in section 4.2 (C-10) and 4.1 (S-5). |

---

## 2. Executive summary: the 10 most important findings

Ordered by impact on the player. IDs point to section 4.

1. **G-1 (P0) The progress gauge is not tied to the version, so the story fires out of order.** Missions refill forever and each adds progress, while the score gate holds the upgrade back. In the simulation the stored gauge is at 66–71 when the player reaches v2, the "SWARM CRISIS" fork at 75 % opens **in v2** (in v1 if the player retrains bigger models from scratch), and the gauge reaches 100 % ("Singularity") in v2 with a model that scores 36. The v1 screen then shows "Operative", "Swarm" and "Singularity / Subversion" inside the Bedroom PC theme (`docs/review2/shots/desktop_v1_fork_at_75.png`).
2. **G-2 (P0) Version 3 lasts 18 seconds.** The v3 kernel adds 80 PFLOPS to training (`trainingTick.ts:62`). The player's own rack at that point is about 0.35 PFLOPS. Every run finishes in one tick, the score goes from 42 to 50 in 18 ticks, and v4 opens. Target was 40 minutes.
3. **C-1 (P0) Resizing a trained model keeps its score.** `updateModelArchitecture` (`GameContext.tsx:1505-1590`) changes parameters, topology or precision of a trained model and keeps `reasoningScore`. A 28M model at score 19 becomes a 70M model at score 19, and a 7B model becomes 405B for free. This teaches that weights survive a change of architecture, which is false, and it is what makes finding 2 possible.
4. **G-3 (P0) Two different numbers are both called "progress".** The HUD shows a rescaled value (0–90 % per version, then frozen at 90 %); the rules, the fork and the endings use the stored one. The player cannot see why the fork appeared or how far the next version is.
5. **S-1 (P1) v1 and v2 still leak the ending.** Besides the fork: "Takeoff progress", "DOMAINS CONTROLLED 0 / 5" and "Req: 15% Sing." in the v1 portal (`desktop_v1_tab7.png`); the takeover button at 90 % has no version check (`AgentSandbox.tsx:988`). H-1 of the previous plan is marked applied but has these gaps.
6. **C-2 (P1) Precision is taught backwards.** The starter model is INT8 and trains at 1 byte per parameter; BF16 is locked behind a paper. Real training keeps weights, gradients and optimizer state in 16 or 32 bits; INT8, FP4 and ternary are mainly inference formats, and ternary (BitNet) must be trained that way from the start. In the game any trained model can be switched to any precision with no quality change.
7. **G-4 (P1) A goal that cannot be met.** Phase I asks to "Scale the cluster to 120 PFLOPS" for +$200. A GTX 1060 is 0.0044 PFLOPS; 120 PFLOPS is more than the v3 link gives. It is a leftover of the old units.
8. **C-3 (P1) Papers unlock unrelated things.** LoRA unlocks the RTX 4090, liquid cooling and the server closet; FlashAttention unlocks the H100 and three-phase power; "agentic MCTS" unlocks immersion cooling and a gas turbine. LoRA, the fine-tuning method the game names most, has no effect on training. The player learns names, not what the techniques do.
9. **E-1 (P1) Energy and heat do not matter.** A full simulated run pays about 200 credits of electricity against about 40 000 earned, never trips the breaker and never overheats. The parts of the game that teach infrastructure limits are never felt.
10. **C-4 (P1) The game tells the player the answer before the experiment.** The run panel prints "validation should start rising around epoch N" before launch (`trainingConfigPanel.*`, `en.ts:2047-2052`). The overfitting lesson is the best part of the simulation; announcing the turning point removes the reason to look at the curves.

What is good and should stay: the run planner (`trainingRun.ts`) is a sound, compact model of epochs, early stopping, divergence and repeated data; the training report explains each outcome in one sentence; the four themes are consistent (the theme test works); the text catalog has identical keys in both languages; saves are migrated by tested pure functions.

---

## 3. Status of the previous plan (`docs/GAME_REVIEW_PLAN.md`)

Checked against `main` at `53ad084`. Items not listed were not re-tested.

### Still holds [V]

| Item | Evidence |
|---|---|
| P0-1, P0-2 missions reachable on the 0–100 scale | `tests/balance.test.ts` passes; simulation completes tier 1 to 3 missions |
| P0-3, L-1, L-2 tutorial gate, first agent free, 50 credits per stage | `GameContext.tsx:2108`, `constants.ts:1419`; first mission done at tick 61 in every simulated run |
| P0-5 loan of 20 TFLOPS for 7 days, P0-6 loan and covert node separate | `training.ts:176-197`; audit fires on day 7 in the simulation |
| P0-7, R-3 no rounding, adaptive units | HUD shows "4.4 TFLOPS" and "80.03 PFLOPS" |
| R-2 epochs, learning rate, batch, early stopping, report | `trainingRun.ts`, `desktop_v1_training_report.png` |
| R-4 one clock | `training.ts:16-18` |
| H-3 story dialogs pause the game | `storyEvents.ts` |
| H-5 containment ending reachable, epilogue | `epilogue.ts` |
| UI-1, UI-2 theme tokens | `tests/theme.test.ts` passes; screenshots of four versions show no foreign colors |
| UI-6, mobile at 390 px | no horizontal overflow in the mobile screenshots |
| T-1 neutral Spanish, T-4 catalog | 2 469 keys in each language on `main`, none missing; one voseo-looking hit is a false positive ("elegías", imperfect tense) |
| L-4 bill by energy used, L-7 save schema with tests | `calendarTick.ts`, `saveState.ts` |
| D-2, D-3 tests and typecheck | 140 pass, lint clean |

### Regressed or incomplete

| Item | Marked | What I found |
|---|---|---|
| **P0-8** pacing per version | "Applied; times not measured" | **Measured now, fails.** Targets 20–30 / 40 / 40 / 20 min. Simulated (instant decisions): 16 / 16 / **0.3** / 0. With score reset on resize: 23 / 35 / **3.3** / 0. See G-1, G-2. |
| **H-1** v1 and v2 do not name the Singularity | Applied | Gaps: fork dialog in v1/v2 (G-1), "Takeoff progress", "DOMAINS CONTROLLED", "Req: 15% Sing." in v1 portal, "Active Host Agent" in v1 Architecture, takeover button with no version check. See S-1. |
| **R-1** one 0–100 scale | Applied | Two leftovers of the old scale: `averageReasoning / 1200` (`missionEvaluation.ts:159`) and the 120 PFLOPS goal (`singularityGoals.ts:54`). |
| **R-5** hardware cards with precision and source | Applied | Holds, except the Coral Edge TPU (C-7) and the TPU pod (C-8). |
| **R-6** fictional institutions | Applied | Still named in the interface: "DEEP-TAP: OAK RIDGE NATIONAL LAB" (v3 hardware card), "FBI Cyber Division", "CISA", "NSA", "Interpol" (counted in `en.ts`: 1, 5, 1, 1, 1). |
| **UI-3** counters and names that match | Applied | v1 co-pilot says "Head over to the Training Monitor"; the tab is called "Practice & Train" (`bentoHUD.ourTinyNeuralNetReady`). |
| **UI-5** difficulty does what it says | Applied | On Normal the Architecture tab shows "Difficulty NORMAL: Micro-parameters automatically optimized" (`ArchitectureStudio.tsx:364`); that is the Beginner behavior. |
| **R-2** "LoRA: give it a real effect" | Listed in the table of R-2 | Not done. LoRA only unlocks items (C-3). |

### Not done (as the plan says)

Classroom mode (decided against). Server-side ranking checks (decided against).

---

## 4. Findings

Each finding: priority, evidence, proposed change, how to verify.

### 4.1 Story and narrative coherence

**S-1 · P1 · v1 and v2 show late-game words** [V]
- Evidence: `docs/review2/shots/desktop_v1_tab7.png` ("Takeoff progress: 64.8%", "DOMAINS CONTROLLED 0 / 5", "Req: 15% Sing."); `singularityPortal.takeoffProgress`, `singularityPortal.domainsControlled` (`en.ts:1855,1871`); `AgentSandbox.tsx:988` (takeover offer at 90 % with no version check); v1 Architecture "Active Host Agent".
- Change: move these labels into `VERSION_PROFILES.story` like the others; hide the domains counter before v3; gate the fork and the takeover on `uiVersion >= 3`.
- Verify: extend the existing "no spoilers" test to render the portal texts for v1 and v2 and search both languages.

**S-2 · P1 · In v4 the AI reminds the player of decisions the player never made** [V]
- Evidence: `agentDialogue.story.v4.1` "Remember when I asked to try without the filter? It was the first time you said yes." There is no moment where the player answers that request; a player who kept the output filter on all game is told the opposite of what happened. Same for v4.3 ("Every checkpoint you half-restored", the rollback button may never have been pressed) and v4.4 ("You gave me the keys", no such choice exists).
- Change: pick v4 lines from what is recorded: `storyChoices` (asked the assistant to "sort out" the audit), `guardrails.outputFiltering === 'none'` at any time (store a flag), number of exploited incidents, `playerChoseResist`. Fall back to neutral lines.
- Verify: unit test for `agentChatter` with a state that has no risky choice: none of the "you said yes" lines can be returned.

**S-3 · P1 · Requests in v1 to v3 are not decisions** [V]
- Evidence: the v1–v3 story lines ask for things ("Can we try without the content filter, just this once?", "give me the link credentials") but they are chat lines; nothing can be answered. The only choice with a second option is the loan audit, and the code comment says it "does not change the outcome" (`storyEvents.ts:29`).
- Change: turn one request per version into a story dialog with two answers (reuse `StoryEventModal` and `altAction`), each with a small real effect (for example: filter off = +10 % mission speed, −alignment). Record the answers in `storyChoices` so S-2 and the epilogue can use them.
- Verify: play v1 to v2; the epilogue lists the answers.

**S-4 · P1 · The epilogue misses most of the player's choices and can be gamed** [V]
- Evidence: `epilogue.ts:83-170` reports five things: loan audit, incidents, the fork, guardrails, overseer. Guardrails and overseer are read **at the end of the game**, so switching the sandbox on one second before the ending earns the "safe" verdict. Not reported at all: accepting or refusing each version upgrade, shadow compute, cutting the link, the emergency loan, the trading desk, council missions (the only thing besides the fork that moves subversion).
- Change: record time-weighted facts during play (ticks with sandbox off, council missions run, shadow compute attempts) and report those.
- Verify: test: a state that ran 90 % of the game without sandbox gets "risky" even if the sandbox is on at the end.

**S-5 · P1 · Upgrade promises are not kept, and one contradicts the state** [V]
- Evidence: v2 offer: "+12% Hidden GPU Memory Buffer", "Auto-hide redundant beginner safety warnings" (`upgradeModal.v2.logs.*`); `upgradeUiVersion` (`GameContext.tsx:3527-3555`) changes only the theme and the covert-node flags. The v2 co-pilot says "Let's hook up that university proxy" and the v2 card is titled "Unmonitored University Cluster Tunnel", but in every simulated run the loan was audited and removed on day 7, before v2 (day 12 to 28).
- Change: either make the promises true in a way that serves the story (v2 really hides the beginner hint cards: that is the AI removing a safeguard, and the epilogue can say so), or reword them as things that do happen. Drop the proxy line when `loanAudited` is true.
- Verify: read the v2 dialog with a save where `loanAudited` is true.

**S-6 · P2 · A version can be skipped** [I]
- Evidence: `mountHostModel` (`GameContext.tsx:3585-3612`) opens the dialog for the highest version the numbers allow, so a player still on v1 with gauge 85 and score 50 is offered v4 directly and never sees v2 or v3.
- Change: offer only `uiVersion + 1`.

**S-7 · P2 · Containment and the fork are coherent with each other** [V]. The containment check reads the fork choice, the overseer, the sandbox, the audit switch and subversion (`epilogue.ts:33-62`) and `openUpgradeModal` refuses v4 after containment. No change; listed because the question was asked.

### 4.2 Scientific accuracy

Concepts that are correct and need no change [V by reading]: loss, perplexity = e^loss (`trainingTick.ts:88`), the 6 × parameters × tokens work estimate, epochs with diminishing value, early stopping with a best checkpoint, divergence from a too-high learning rate, validation rising after the overfitting point (`trainingRun.ts:139-153`), temperature, Top-P, Top-K and repetition penalty (PDF p. 6 and `aiDocs.inferenceDocs.*`), tokenization and deduplication (PDF p. 6–7), RAG not changing weights (PDF p. 7), agents as model + instructions + memory + tools + stop rules (PDF p. 8), GQA, FlashAttention, MoE, Mamba in outline.

**The overfitting formula** (`trainingRun.ts:84-90`): `overfitEpoch = 1.5 + 1.5·log10(1 + tokens/params) + (quality − 60)/40 − 0.6·priorRuns + lrShift`. It describes the real phenomenon in direction: less data per parameter, noisier data and repeated passes over the same data all bring memorization sooner. Two caveats to state in the manual: the learning-rate term is a simplification (a higher rate reaches the minimum of validation loss in fewer epochs; it is not a cause of overfitting by itself), and large-scale pretraining normally uses about one pass, so multi-epoch overfitting is mostly a fine-tuning concern.

**C-1 · P0 · A trained model can be resized and keeps its score** [V]
- Now: `GameContext.tsx:1556-1590` merges the new parameters, topology, precision or attention into the current model and keeps `reasoningScore` and `datasetRuns`.
- Should: changing parameter count or topology creates new, untrained weights. Reset the score to the untrained value (5) and clear `datasetRuns`, or block the change on a trained model and offer "Create model" (already exists, 100 credits, `GameContext.tsx:369-425`). Changing precision downward is quantization and may stay, with a quality cost (C-2).
- Reason: weights are tied to the architecture; there is no general way to carry them to a model of another size (distillation trains a new model).
- Verify: test: after `updateModelArchitecture({ parametersCount })` on a model with score 20, the score is 5. Then re-run `docs/review2/simulate.ts --honest` for pacing.

**C-2 · P1 · Precision and quantization** [V]
- Now: `INITIAL_MODEL.quantization = 'int8'` (`constants.ts:583`), training VRAM = parameters × bytes of that format (`GameContext.tsx:1563-1569`); BF16 needs the paper `res_bf16_training`; any model can switch to FP4 or ternary with no quality change. `quantizationDocs.int8` (`en.ts:414`): "Halves VRAM memory footprint with **zero degradation**". PDF p. 4: INT8 "virtually undetectable quality loss".
- Should: training in FP32 or BF16 by default; INT8, FP4 as **inference** formats applied after training with a small score cost (suggested: INT8 −0.5, FP4 −2 points, ternary only for models "trained as BitNet", a flag set at creation). Training VRAM should count gradients and optimizer state: with AdamW about 4 values per parameter (weights, gradients, two moments), so roughly 16 bytes per parameter in FP32.
- Bit widths in the game are right: FP32 4 bytes, BF16 2, INT8 1, FP4 0.5, ternary 0.2 (log2(3) = 1.58 bits). The label "1-Bit" for a 1.58-bit format should read "1.58-bit (ternary)".
- Sources: BitNet b1.58 is trained with quantization-aware training from scratch (Ma et al., 2024, "The Era of 1-bit LLMs"); INT8 with outlier handling: Dettmers et al., 2022, "LLM.int8()"; "zero degradation" is not a claim either paper makes for every model. [TV] the exact point costs suggested above are a design choice, not measured values.
- Verify: unit test for the VRAM function; manual chapter 8 updated.

**C-3 · P1 · Papers unlock things they have nothing to do with** [V]
- Now (from `INITIAL_HARDWARE`, `FACILITY_TIERS`, `progression.ts:63-70`): LoRA → RTX 4090, liquid cooling, server closet, vector RAG, 70M models, 8k context, Top-P/Top-K controls. FlashAttention → H100, three-phase power, InfiniBand, 500M models. MoE → TPU pod, colocation cage, 7B models. Agentic MCTS → immersion cooling, gas turbine, 70B models.
- Should: gate hardware and facilities by version and money, and give each paper the effect it has in reality, with a number the player can see: LoRA = "fine-tune" run type that trains about 1 % of the parameters (much less compute and VRAM, lower ceiling gain); FlashAttention = training speed ×1.2 and less attention memory; GQA = smaller context VRAM term; BF16 = half the training VRAM of FP32; RoPE = longer context.
- Reason: the names are real techniques; attaching them to unrelated purchases teaches false associations. Previous plan R-2 already asked for the LoRA effect.
- Verify: each paper card states one mechanical effect and a test checks it.

**C-4 · P1 · The panel gives away the overfitting point; there is no held-out test idea** [V]
- Now: `trainingConfigPanel.validationShouldStartRisingAround` and `overfittingRiskValidationShouldRise` (`en.ts:2047,2052`) print the epoch before the run. The word "test" (as in test set) does not appear in the catalog; the evaluation score plays that role silently, and the player tunes epochs against it run after run.
- Should: hide the prediction on Normal and Engineer (keep it on Beginner). Add two sentences to the manual and the report: validation data steers the run (early stopping), the evaluation suite is held out and is only read at the end; choosing settings by looking at the final score many times slowly "uses up" the test set.
- Optional mechanic: a small penalty to the *displayed* score reliability after many runs tuned on the same suite, with a "fresh benchmark" paper that resets it.
- Verify: read the panel on Normal; the manual has a "train / validation / test" paragraph.

**C-5 · P1 · Chinchilla is stated as a law and the game cannot follow it** [V]
- Now: PDF p. 1: "A model's reasoning power is governed strictly by the Chinchilla scaling law: … roughly 20 … tokens" per parameter. In the game the largest dataset is 2.5 B tokens (`DATASET_TIER_CONFIGS[4]`), so every model above 125M parameters is trained far under 20 tokens per parameter (a 405B model sees 0.006), and it still reaches its score.
- Should say: "For a fixed compute budget, the best results came from scaling parameters and training tokens together, at roughly 20 tokens per parameter (Hoffmann et al., 2022). It is an empirical finding about compute-optimal training, not a law about reasoning." And the game needs datasets that grow with the versions (tens of B tokens in v3, T in v4) or a visible "undertrained" penalty larger than the present ×0.5.
- Verify: for each mission size there is a dataset with at least 20 tokens per parameter, or the report says "undertrained".

**C-6 · P1 · Agents: "alignment drifts with temperature"** [V]
- Now: every tick an agent's alignment moves by `(temperature − 0.6) × 0.04 + (topP − 0.7) × 0.02` plus the guardrail band (`agentTick.ts:76-80`); a "security audit" adds +25 alignment (`GameContext.tsx:2424-2443`).
- Reality: a deployed model's weights do not change while it runs; sampling temperature changes the randomness of each output, not the model's goals over time. Jailbreaks come from inputs (prompt injection, adversarial prompts); long-running agents fail through accumulated context errors and tool misuse. A red-team audit finds problems; it does not repair them.
- Change: keep the mechanic (it works as a game) and rename it honestly: "Reliability" or "Behavior under load" instead of "Alignment"; the manual states "simplified: real models do not drift from temperature". Make the audit *reveal* (show which agent is compromised and why) and make the fix a separate action.
- Verify: manual chapter 5 wording; glossary entry.

**C-7 · P1 · Coral Edge TPU as a training GPU** [V in code; hardware facts from the vendor's public description, TV for exact figures]
- Now: `gpu_coral_edge`: 6.2 TFLOPS, 4 GB VRAM, 0.09 kW, counted for training; card note "INT8 + FP32, estimate" (`hardwareSpecs.ts:24`). The game's own doc says "4 TOPS … INT8 … at just 2 Watts" (`en.ts:394`) and the PDF says it "lacks the memory capacity for training" (p. 8).
- Should: an inference-only part (no training compute, tiny memory, 2 W) that lowers agent cost, or remove it from the starter choices.
- Verify: card numbers equal the doc text.

**C-8 · P2 · Other hardware figures** — checked against what I know of the public specifications; I had no network source at hand, so all are [TV]:

| Item (`INITIAL_HARDWARE`) | Game | Public figure as I recall it | Result |
|---|---|---|---|
| GTX 1060 6GB | 4.4 TFLOPS FP32, 6 GB, 120 W | 4.4 TFLOPS, 6 GB, 120 W | OK |
| 2× RX 580 | 11 TFLOPS, 16 GB, 320 W | about 6.2 TFLOPS and 185 W each: 12.3 TFLOPS, 370 W | Slightly low on both; fine |
| Tesla K80 | 8.7 TFLOPS, 24 GB, 300 W | 8.7 TFLOPS (two chips), 24 GB, 300 W | OK. But PDF p. 8 lists the K80 next to H100/B200 as having HBM and NVLink; it has GDDR5 and neither. |
| RTX 4090 | 82.6 TFLOPS FP32, 24 GB, 450 W | same | OK. `hardwareDocs.gpuRtx4090` says "FP8 Transformer Engine, doubling training throughput": that is Hopper (H100) marketing, not this card. |
| A100 80GB | 312 TFLOPS BF16 tensor, 80 GB, 400 W | 312 TFLOPS FP16/BF16 tensor | OK |
| H100 SXM5 | 989 TFLOPS BF16 tensor, 80 GB, 700 W | 989 TFLOPS dense (1 979 with sparsity) | OK |
| B200 | 4 500 TFLOPS FP8, 192 GB, 1.2 kW | 4.5 PFLOPS FP8 dense, 192 GB, about 1 kW | OK |
| "TPU v5p Pod" | 25 000 TFLOPS, 768 GB, 4.5 kW | per chip about 459 TFLOPS and 95 GB; a pod is 8 960 chips | Internally inconsistent: 768 GB is 8 chips, 25 000 TFLOPS is about 54 chips, and 4.5 kW fits neither. Rename to "TPU v5p tray (8 chips)" with 3 700 TFLOPS, or keep and mark "fiction". |
| Quantum photonic array, helium cooling, quantum bus | marked fiction | — | Correctly marked |
| Wall socket 1.5 kW, $0.18/kWh | — | a 15 A, 120 V circuit carries about 1.4 kW continuous; US residential price is in that range | OK |

Mixing FP32 figures (home cards) with tensor-precision figures (data-centre cards) overstates the gap by roughly 4× for cards that also have tensor cores (the 4090); the card labels say which is which, which is enough.

**C-9 · P2 · Unsupported precise numbers** [V in text; the numbers themselves TV]. These read as facts and have no source: "eliminates up to 85% of spontaneous factual errors" (PDF p. 7, `content.dataSource.data_knowledge_graph.bonusAttribute` EN), "zero-hallucination factual grounding" (`en.ts:378`), "RAG provides instant +40% accuracy" (PDF p. 9), "cutting HBM read/writes by up to 80%" (`en.ts:419`), "eliminating 90% of matrix compute power" (`content.research.res_bitnet_quantization.effectDescription` EN), "zero loss of needle-in-haystack recall" (`res_long_context` EN), "KV-cache memory **bandwidth** by up to 87%" (the saving is cache **size**; Spanish says "tamaño", which is right). Change: remove the number or say "in the game". Note that the Spanish catalog already has sober versions of most of these (section 4.5, T-1): copy that tone to English.

**C-10 · P2 · Smaller points** [V]
- PDF p. 2 titles the decoder-only transformer as "Introduced by Google Brain in 2017": the 2017 paper is an encoder-decoder; decoder-only models came with GPT (2018).
- PDF p. 7 and the v1 data intro say SQL tables "teach the model exact arithmetic" and that engines make the model "learn better". A database or a vector index is something the model **looks up** at answer time; it does not train it. The in-game rule (engines raise mission readiness, not the score) is right; the sentence is wrong.
- Synthetic flywheel: PDF p. 7 and 9 promise "cognitive acceleration" and "compound reasoning speed exponentially". Add the known risk: training on unverified model output degrades the model (Shumailov et al., "model collapse"); the verification step is what makes it work.
- DPO, RLHF, contrastive and energy-based are offered as the **objective of the same pretraining run** (`lossFunction`). They belong to later stages or other model families. With C-3, make them run types: pretrain (cross-entropy) → fine-tune (SFT / LoRA) → preference tuning (DPO / RLHF), which is the lifecycle the PDF describes on p. 1 and the game never lets the player do.
- The output filter and the reward-hacking audit switch change nothing (confirmed, as PR #45 notes). Give each a small visible effect or label them "recorded for the final report".
- An untrained model starts at loss 2.4–4.8 (`trainingRun.ts:113`); with a 32k vocabulary a random model starts near ln(32 000) = 10.4. Cosmetic.
- Memory bandwidth appears in descriptions (3.35 TB/s for the H100) but is not explained or modelled. One glossary line is enough: "how fast data moves between memory and the chip; it limits inference speed for large models".
- Lesson text for the "ceiling" outcome says "you need more parameters … **or more data**" (`en.ts:2102`). Near the ceiling the formula gives nothing for more data (`training.ts:165-169`). Say "more parameters".

### 4.3 Progression, pacing and engagement

Method [V]: `docs/review2/simulate.ts` plays with the real `calendarTick`, `thermalTick`, `trainingTick`, `missionTick`, `agentTick`, `planTrainingRun`, `evaluateMissionTeam` and the real catalogs. A scripted player decides every tick: best run plan by gain per tick, biggest unlocked model that fits VRAM, papers and data engines when affordable, missions by reward, hardware within power and cooling, scrub at 60 suspicion, resist at the fork. It acts instantly, so a human will be slower (my estimate is 1.5× to 2×, [I]). Results are in `docs/review2/sim_results.txt`. Limits: no incidents choices, no trading desk, no shadow compute, no council missions, no autonomous missions.

| Run | v1 | v2 | v3 | v4 | Notes |
|---|---|---|---|---|---|
| Normal, seeds 1–3 | 15.6–16.3 min | 15.6–17.4 min | **0.3 min** | nothing left | fork at 75 in v2 (tick 1090–1230); gauge 100 in v2 |
| Beginner, seed 1 | 12.7 min | 16.0 min | 0.3 min | nothing left | |
| Normal, score reset on resize (`--honest`), seeds 1–2 | 22.6–23.0 min | 33.7–35.1 min | 3.3 min | nothing left | fork at 75 **in v1** (tick ~1300); gauge 100 in v2 |
| Target (previous plan) | 20–30 | 40 | 40 | 20 | |

Other measured facts: first mission completed at tick 60–72 (about one minute); 21–41 failed missions out of 83–111 (25–37 %); electricity paid over the whole run 200–470 credits against 37 000–41 000 earned; 0 breaker trips; 0 ticks above 85 °C; 115–235 training runs, of which 2–10 gained nothing.

**G-1 · P0 · Gauge not tied to the version** [V, simulation and `GameContext.tsx:1064-1075`]
- Cause: completed missions are replaced forever (`missionTick.ts:86-103`) and each adds 1.25 to 3 points; the upgrade also needs a score (28 / 42 / 50) that takes longer. Nothing caps the gauge at the version's range, and the fork (75), the takeover offer (90) and "Singularity" (100) read the raw gauge.
- Change: cap the gauge at the top of the current version's range (25 / 55 / 85 / 100) and show "ready to upgrade: needs score N" when capped; or make the score the only gate and derive the gauge from it. Gate the fork on `uiVersion >= 3`.
- Verify: `bun docs/review2/simulate.ts 1 normal`: no "fork" line before "UPGRADE to v3"; no "reached 100" before v4.

**G-2 · P0 · v3 is over in seconds** [V]
- Cause: `COVERT_NODE_PFLOPS = 80` is added to training compute. It is about 230× the rack a player has at that point in the simulation. With C-1 the model is resized to 7B at once and each run takes one tick.
- Change: make the link scale with the player (for example 3× own GPU compute, as the PR does with the swarm grant), or make it serve missions only; and raise the v3 → v4 score gate after C-1 is fixed (50 is reached immediately by a 7B model, ceiling 65.7).
- Verify: simulated v3 lasts 30–50 minutes.

**G-3 · P0 · Two "progress" numbers** [V]
- Evidence: `singularityGoals.ts:45-96,155-160`; `desktop_v1_tab7.png` shows 64.8 % for stored 18; the bar freezes at 90 % for everything between stored 25 and the upgrade (in the simulation that is 300–600 ticks of v1 with a bar that does not move).
- Change: one number. With G-1's cap, show the stored value as "x / 25 in this version" or as a plain 0–100 % of the version.
- Verify: the HUD number, the manual and the fork threshold are the same number.

**G-4 · P1 · "Scale the cluster to 120 PFLOPS" in Phase I** [V]: `singularityGoals.ts:54`, `desktop_v1_tab7.png`. Change the target to something a v1 player can do (for example 20 TFLOPS of own GPUs: a second card) and print it with `formatCompute`. Verify: the goal completes in the simulation's v1.

**G-5 · P1 · One mission in three fails, and a failure only says "try again"** [V]
- Evidence: 25–37 % failures in the simulation; base chance 45 % + 7 per role (`rules`/`missionEvaluation.ts:155-162`); the first tutorial mission runs at **61 %** in the simulation log, so 4 new players in 10 fail their first job (it failed once in seed 3). A failure adds the full risk as suspicion. The report names the two weakest factors, which is good, but the levers that matter are hidden: the score term is at most 8 points (finding A-1) and the capability term needs data engines the v1 player cannot afford.
- Change: first tutorial mission cannot fail (or runs at ≥ 90 %); show the probability breakdown **before** launch as a short list ("base 45, roles +7, data +6, score +1") so the player sees what to improve.
- Verify: the launch card lists the terms; simulation first-mission failures = 0.

**G-6 · P1 · Is each concept taught before a mission needs it?** [V by reading the contract list, `docs/review2` dump]
- Taught in time: score, parameters (the tutorial trains to score 10 before the first job); epochs and early stopping (run panel).
- Required before taught: **agent roles** (the tutorial deploys one agent of any role; the first mission that needs a specific pair is `gig_sentiment_arbitrage` in tier 1, arbitrageur + economist, and nothing before it explains what a role changes); **data engine types** (same mission needs SQL connected to the model; "connect" is done in Architecture, not in the data tab); **topology** (never required by any of the 23 starting contracts, so the player never has a reason to try one).
- Missions ask for numbers only: every contract is "parameters ≥ X, score ≥ Y, roles, engines". None asks the player to *do* something with training.
- Change (hands-on missions, each reuses data the run report already has):
  1. "Deliver a model trained without overfitting": last run's outcome must be `improved` or `early_stopped` with ≥ 3 epochs planned.
  2. "Client GPU has 4 GB": the model must fit 4 GB (teaches precision and size).
  3. "Cheap run": reach score X with a run under N kWh (teaches batch, data size, epochs).
  4. "Specialist": a micro-model of the client's domain (teaches fine-tuning; the mechanic exists).
  5. "Explain a failure": after a diverged run, the next run must succeed with a lower learning rate (pays a small bonus).
- Verify: each new contract has a check function with a unit test.

**G-7 · P1 · Where a player can get stuck** [V unless marked]
- Contract card with no agents says "No unassigned agents. All agents belong to squads." (`contractBoard.noUnassignedAgentsAllAgents`, `desktop_v2_tab4.png`). With zero agents that is false and gives no next step. Change: "You have no agents yet. Deploy one in {Agents tab}" with a button.
- The gauge frozen at 90 % (G-3) with the upgrade waiting on a score the HUD does not name.
- After the loan audit (day 7) compute falls from 24.4 to 4.4 TFLOPS. One epoch of a 70M model on the 500M-token corpus goes from about 8.5 to about 47 game days (410 to 2 270 ticks, computed with the work formula of `training.ts:20-52`, no agents). The dialog explains the loss but not "buy a second GPU now".
- Near the ceiling the report says "more parameters or more data" (C-10), and resizing is the hidden correct move.
- A data engine "does nothing until you connect it" in another tab (the PR manual says so; the game does not at the moment of purchase) [I].

**E-1 · P1 · Energy, heat and the breaker never bite** [V]
- Evidence: simulation totals above. A GTX 1060 draws 0.12 kW: a 30-day month costs 0.12 × 720 × 0.18 = 15.6 credits. The breaker needs a draw above the capacity, and the starter capacity (1.5 kW base + 1.5 kW socket = 3 kW; the 6 kW in my screenshots includes a second circuit I seeded) is about 14 times the starter draw of 0.21 kW.
- Change: start with 1.5 kW in total (today the base and the socket are added), price electricity so that a month of full load costs about one mission, and make the first overheat likely with the second GPU so the cooling lesson happens once.
- Verify: simulation shows at least one breaker or heat event in v1 and a bill of 5–15 % of income.

**E-2 · P2 · The trading desk earns nothing on small capital** (same as A-2; exists on `main`, `tradingTick.ts:58`). [V by reading]

**E-3 · P2 · A free suspicion reset** [V by reading, not clicked]: `attemptEmergencyReset` (`GameContext.tsx:3600-3620`, button at `App.tsx:264`) gives −10 suspicion at no cost and with no cooldown in v1 to v3 ("Reset Toy Model" / "Rollback Checkpoint" button in the sidebar). Pressing it ten times clears any suspicion. Add a cost (lose the last run's gain, which is what a rollback is) or a cooldown.

### 4.4 UI, desktop and mobile

Screenshots: `docs/review2/shots/` (1280×900 and 390×844, `deviceScaleFactor` 1, seeded saves, English). Covered: start screen, Architecture and Training tabs in the four versions, more tabs in single versions, the training report dialog, the fork dialog, mobile start and main views. There is no separate "training modal": training is configured in a panel of the Training tab and reported in a dialog. Not every tab was captured in every version.

**The first minute** [V, `desktop_start.png`, `mobile_start.png`]: the setup has five steps (identity, hardware, data, architecture, genesis). The first screen is clear and friendly: a short welcome, a name, three difficulty cards. It invites. Two issues: the Normal card lists "Quantization, Temp, Top-P, RAG, LoRA", five unexplained terms before the player has seen anything; and "Remaining budget: $110 CR" is shown before the player has bought anything (the starter kit is pre-selected), which reads as if money was already spent. After setup the player lands on Architecture (`desktop_v1_architecture.png`), where 4 HUD cards, a co-pilot line, 9 tabs, a model library, an "educational guide", a five-column stats row and four sub-tabs are all visible at once; the one action that matters ("Start training") is top-right in the same weight as "Create model".

**U-1 · P1 · Too much on the first screen** [V]
- Change: until the first run finishes, show only: the co-pilot line, one card "Your model: 14M parameters, score 5/100" and one primary button "Start training". Reveal the model library after the first run, the sub-tabs after the first mission. The mechanism exists: tabs already unlock by stage (`GameContext.tsx:1166-1205`); apply the same idea inside the Architecture tab.
- Mockup:
```
┌ BuddyBot: "Our tiny neural net is ready to learn."                      ┐
│                                                                          │
│   SYNAPSE-Proto-14M          Score  5 / 100   (ceiling for 14M: 25)      │
│   ───────────────────────────────────────────────────────────────────    │
│   Data: Starter corpus, 50M tokens     Time: 23 h of game (~46 s)        │
│                                                                          │
│                     [  ▶  START TRAINING  ]                              │
│                                                                          │
│   What will happen: the loss should go down. Watch the two curves.       │
└──────────────────────────────────────────────────────────────────────────┘
```
- Verify: screenshot of a new game shows one primary button.

**U-2 · P1 · The progress display** (G-3) [V]: three places show three framings: HUD "Learning progress: 65%", portal "Takeoff progress: 64.8%" and "PHASE GOALS // NEXT STEPS (64.8%)", goal cards with "15%" and "90%" targets. Change: one bar in the HUD with the next concrete requirement under it:
```
Before:  Learning progress: 65%  ▓▓▓▓▓▓▓░░░
After:   Next version: progress 18 / 25 ▓▓▓▓▓▓▓░░░ · model score 19 / 28 ▓▓▓▓▓▓░░░░
```
The two-requirement pattern already exists on the contract cards ("MINIMUM PARAMETERS 50M ✗ / MINIMUM EVALUATION SCORE 30/100 ✗", `desktop_v2_tab4.png`): reuse it.

**U-3 · P1 · Mission cards do not say what to do next** [V, `desktop_v2_tab4.png`]: red ✗ marks show what is missing, the button is disabled, and the agent box shows a false message (G-7). Change: turn each ✗ into a link: "50M ✗ → Architecture", "30/100 ✗ → Train", "no agents → Deploy agent". The training report already does this kind of one-sentence guidance well (`desktop_v1_training_report.png`); copy its tone.

**U-4 · P1 · Agents tab: stale gauges and four sub-tabs on a phone** [V, `desktop_v4_tab5.png`, `mobile_v3_nav4.png`]: on `main` the first gauges are "INCOME FLOW +$0 CR/sec" and "SUSPICION RATE +0.00 %/sec" and the guide says agents earn "passive income"; none of that exists in the rules. PR #45 replaces them with load and suspicion per day: that is the fix. On the phone the four sub-tabs wrap into two rows and the second row sits at the fold; use a horizontally scrolling row with `shrink-0` buttons (same fix as A-7).

**U-5 · P2 · Smaller points** [V]
- Mobile header uses three rows (title, speed, language and icons: about 135 px of 844) before the HUD line; the HUD line is cut mid-word ("Suspicion…" off-screen). Move speed into the HUD row or a single pause button with a speed menu.
- Section titles keep the "A // B" terminal style in v1 ("TRAINING MONITOR // MODEL DISPATCHER", "EDUCATIONAL GUIDE // HOW TO DESIGN & TRAIN AN AI MODEL") where the theme is a friendly light app; v1 would read better in sentence case. The style itself suits v3 and v4.
- "Difficulty NORMAL: Micro-parameters automatically optimized" chip on Normal is false (section 3, UI-5).
- "VRAM Memory Audit: 2.5 GB required / 6 GB available … weights and gradient optimizer buffers": the number shown is weights only (C-2).
- Contrast: v4 body text is pink on near-black and reads well; v4 small muted labels (11 px, dark red on black, for example "Grid Subjugation:") are the weakest [I, judged by eye; not measured with a contrast tool].
- The v3 hardware list puts the free 80 PFLOPS card next to "+4.4 TFLOPS … ORDER HARDWARE ($150 CR)" (`desktop_v3_tab2.png`): buying anything is visibly pointless (G-2).

Modal stacking [I, from code]: story dialogs, the training report, the upgrade dialog, the fork, incidents and the game-over screen are separate components with no shared queue except story events (`pendingStoryEvents`). A run that ends on the tick the fork opens would show two dialogs. I did not reproduce it. A single dialog queue would remove the risk.

### 4.5 Technical items that affect the player or learning

**Tests and lint on `main`** [V]: `bun test` 140 pass, 0 fail, 5 379 `expect()` calls, 7 files. `bun run lint` exit 0.

**T-1 · P1 · English and Spanish say different things in 44 texts** [V, `parity.ts` comparing numbers inside each pair, then read]
- Keys: 2 469 in each language, none missing; placeholders equal; three terminal help texts differ in tags only.
- Meaning differs, examples: `content.research.res_bitnet_quantization.effectDescription` EN "eliminating 90% of matrix compute power" / ES "Permite experimentar con pesos ternarios y baja huella de memoria"; `res_long_context` EN "zero loss of needle-in-haystack recall" / ES "Desbloquea ventanas de contexto de hasta un millón de tokens"; `content.dataSource.data_knowledge_graph.bonusAttribute` EN "Eliminates 85% Hallucinations" / ES "Elimina alucinaciones"; `content.hardware.power_wall_socket.description` EN "Standard household power supply" / ES adds the 1.5 kW breaker rule; `content.research.*.technicalLore` are different sentences in the two languages (EN a mechanism, ES a history note); `content.breach.sleeper_agent.technicalDetails` ES drops the "2% of gradients to a covert node" clause; `agentSandbox.role.overseer.risk` EN "Reduces suspicion" / ES "Negativo (-0.15 sus/s)" (fixed by PR #45).
- In most pairs the **Spanish is the more accurate text**. Change: rewrite the English of `content.research.*`, `content.hardware.*` and `content.dataSource.*` from the Spanish.
- Verify: add the number-comparison check to `tests/catalog.test.ts` with an allow-list.
- Spanish register: neutral with "tú" throughout; no voseo found. Words that are regional or left in English inside Spanish sentences: "enlentece" (PR), "learning rate", "batch", "early stopping", "checkpoint" (accepted jargon; the glossary of T-5 should list them once).

**T-2 · P2 · Saves** [V by reading `saveState.ts:150-415` and running the six save tests; I did not load real old saves]
- Good: hardware, data sources, research and contracts are rebuilt from the current catalog and keep counts and flags; unknown contracts (generated ones) are kept and rescaled; scores are migrated once (schema 10); numbers are sanitised.
- Risks: (a) `guardrails: data.guardrails || fallback.guardrails` takes a partial object as is; a save without `rewardHackingAudit` loads it as undefined, which the containment check reads as "off". Merge with defaults. (b) `...data` copies every other field unchecked; `activeTradingDesk`, `activeTraining` and `agents` are not validated (see A-8). (c) Hardware ids that leave the catalog are dropped silently with their money. (d) There is no test that loads a mid-game save (agents on a mission, a run in progress, a trading desk, a custom dataset) and checks that nothing is lost.
- Change: add that round-trip test; it is the one that protects players.

**T-3 · P2 · Stale comment**: `training.ts:11-12` says the covert node does not train; it does (A-10).

---

## 5. UI proposal

Keep: the four themes, the HUD cards, the stage-by-stage tab unlocking, the training report dialog, the sub-tab pattern in Agents and Architecture.

| # | Before (screenshot) | After |
|---|---|---|
| 1 | New game lands on the full Architecture tab (`shots/desktop_v1_architecture.png`) | One card and one button until the first run ends (mockup in U-1) |
| 2 | "Learning progress: 65%" plus a second number in the portal (`shots/desktop_v1_tab7.png`) | One line with the two real requirements of the next version (mockup in U-2) |
| 3 | Contract card with ✗ marks and a false agent message (`shots/desktop_v2_tab4.png`) | Each ✗ is a link to the tab that fixes it; empty state says "Deploy an agent" |
| 4 | Agents header with income per second (`shots/desktop_v4_tab5.png`) | Load and suspicion per day (already built in PR #45) |
| 5 | Run panel prints the overfitting epoch | Hidden on Normal and Engineer; shown on Beginner |
| 6 | Manual chapter row overlapping on phones (`shots_pr45/mobile_v4_manual_decisions.png`) | Scrolling row, `shrink-0` buttons; same for Agents sub-tabs |

I did not build these changes, so there are no "after" screenshots.

---

## 6. What I could not verify, and why

- **Google sign-in, cloud save, leaderboard, Firestore rules**: need real Firebase credentials and a Google account. Not run. `firestore.rules` was not reviewed.
- **Chrome built-in AI and the player's Gemini key**: need a Chrome build with the model and a key. The AI mission assessment path (`GameContext.tsx:600-725`) was read, not run.
- **A human play-through**: all pacing numbers come from a scripted player that decides instantly and never uses the trading desk, shadow compute, council missions, autonomous missions or incident choices. Real times will be longer; the order of events (fork before v3, v3 in seconds) does not depend on speed.
- **Hardware and paper facts**: no outside source was consulted in this session. Every external figure in C-7, C-8 and the citations in C-2, C-5, C-10 is from memory and marked [TV]; check them against the vendors' pages and the papers before printing them in the game.
- **Contrast ratios**: judged by eye from screenshots, not measured.
- **Every tab in every version, Spanish screens**: screenshots are English; Architecture and Training in four versions, other tabs in one version each. Spanish was checked in the catalog, not on screen.
- **The manual on `main` at 390 px** (whether A-7 predates the PR).
- **Dialog stacking** (section 4.4): inferred from the code.
- **Old real saves**: only the test fixtures.
- **GitHub Pages build** (`bun run build`) was not run.

---

## 7. Suggested work order

Small phases, each can ship alone. Re-run `bun docs/review2/simulate.ts 1 normal` after phases 2 and 3.

**Phase 0 — PR #45 (one sitting).** A-1 to A-7, then merge. A-8 to A-12 can follow.

**Phase 1 — Stop the story from breaking (P0, small code changes).**
1. G-1: cap the gauge at the version's range; fork and takeover only from v3.
2. G-3: show one progress number (U-2).
3. S-1: move the four leaking labels to `VERSION_PROFILES`; extend the spoiler test to the portal and to Spanish.
4. G-4: replace the 120 PFLOPS goal.

**Phase 2 — Make the model honest (P0).**
5. C-1: resizing resets the score (or is blocked on trained models).
6. G-2: scale the v3 link to the player's rack; re-tune the v3 → v4 score gate with the simulation.
7. Check the four targets (20–30 / 40 / 40 / 20 min) with the simulation; adjust `MISSION_SINGULARITY` and `UPGRADE_SCORE`.

**Phase 3 — First hour (P1).**
8. U-1 first screen; U-3 and G-7 next-step links and the empty state.
9. G-5: first mission cannot fail; show the probability breakdown before launch.
10. E-1: 1.5 kW start, electricity price, first heat event.

**Phase 4 — Science (P1).**
11. C-2 precision; C-4 hide the prediction and add train / validation / test text.
12. C-3 papers with real effects, starting with LoRA as a run type; C-10 objectives as stages.
13. C-5, C-6, C-7, C-9 text and catalog corrections; T-1 rewrite the English catalog entries from the Spanish; regenerate the PDF (C-10, C-8 K80 line) and replace both 9-page copies (A-9).

**Phase 5 — Story depth (P1).**
14. S-3 one real decision per version; S-2 v4 lines from recorded choices; S-4 epilogue from play history; S-5 upgrade promises.
15. G-6 the five hands-on missions.

**Phase 3b — Compute as one budget (requested after the review; plan in section 8).**
- M-1 ledger → M-4 display in TFLOPS/PFLOPS → M-2 several contracts and M-3 cancel → M-5 autonomy budget (save schema 12) → M-7 manual. Needs PR #45 merged and G-2 fixed first.

**Phase 6 — Polish (P2).**
16. U-4, U-5, E-2, E-3, S-6, T-2 round-trip save test, R-6 remaining real institution names, UI-3 and UI-5 leftovers of section 3.

---

## 8. Plan: compute as one shared budget (contracts, agents, training, autonomy)

Added on request after the first version of this report. It is a plan only: no code was changed. Everything under "What happens today" was read in `main` at `53ad084`; nothing here was run in the browser.

### 8.1 What happens today [V by reading]

| Question | Answer in the code | Where |
|---|---|---|
| Do agents use compute? | **Yes.** Every agent that is not quarantined takes 0.2 TFLOPS all the time, working or idle, whatever the size of its model. | `constants.ts:1417`, `GameContext.tsx:984-985` |
| Do running contracts use compute? | **Yes, but a fixed amount per contract**: 2 TFLOPS per billion parameters the contract asks for, at least 1 TFLOPS. It does not depend on the team or on the model actually used. | `GameContext.tsx:1954`, `ContractBoard.tsx:246` |
| Does training feel it? | **Partly.** Each tick, training speed = GPUs + external − agents − running contracts (`trainingTick.ts:48,58-66`), so a contract does slow a run. In v1 one contract takes 1 of 4.4 TFLOPS (training 23 % slower). From v3 the 80 PFLOPS link makes it invisible (finding G-2). **Nothing on screen says it**: the run panel shows no "slowed by" line. |  |
| Is the rule the same in both directions? | **No.** Launching a contract while training requires half of the whole cluster to be left for training (`GameContext.tsx:1957-1958`). Starting a run while contracts are running has no check at all. Dataset scraping reserves nothing. |  |
| Can two contracts run at once? | **The engine allows it** (`activeGigs` is a list; the board has a "simultaneous operations" block, `ContractBoard.tsx:401-423`). **The board gets in the way**: a contract with no manual assignment defaults to *all* free agents, or to the first squad (`ContractBoard.tsx:getAssignedAgentsForContract`). After the first launch every other card shows "team busy", even with enough compute. To run two today the player has to pick agents by hand on each card or build squads first; nothing explains that. | |
| Can a contract be cancelled? | **No.** There is no cancel action anywhere in `src/` (training has one, `cancelTraining`). | |
| Autonomous contracts: more than one at a time? | **No.** Each tick the bot picks one contract and sends **every** free autonomous agent to it (`missionTick.ts:175-232`, `assignedAgents = autonomousAgents`). Also a bug: the compute check ignores contracts already running (`missionEvaluation.ts:findAutonomousMission` subtracts agents and the training half, not `runningCompute`), so autonomy can overbook the cluster. | |
| What the card shows | "Cluster Demand: 1.0 TFLOPS · +0.05 kW" (`ContractBoard.tsx:902`). Watts are shown next to compute on every card. | |

So the assumption is right: agents and contracts consume compute. The missing parts are one consistent rule, a screen that shows it, and the controls (several contracts, cancel, autonomy budget).

### 8.2 Target rule

One sentence the manual can print: **"Your cluster has one compute budget. Agents and contracts take their share first; training gets what is left."**

- Compute in use = agents + running contracts (manual and autonomous) + scraping job. Training speed = what remains. No "half the cluster" rule.
- A contract can launch when free compute (after agents and running contracts, **not** counting training) covers its need. Training never blocks a contract; it slows down, and the player sees by how much before confirming.
- A training run can always start; if nothing is left it runs at 0 and the panel says why.
- Power (kW) stays a rule (breaker, heat) but leaves the contract cards. It is shown on the Hardware tab, and on a card only when it is the thing that blocks the launch.

### 8.3 Work items

**M-1 · One ledger for compute** (do first; everything else reads it)
- New pure function, for example `src/utils/computeLedger.ts`: `computeLedger(state) → { total, agents, missions: [{ runId, pflops, autonomous }], autonomousTotal, scraping, usedTotal, trainingShare, free }`.
- Replace the four places that each do their own subtraction: the tick (`GameContext.tsx:980-990`), `startContract` (`:1954-1970`), `ContractBoard.tsx:126-130`, `HardwareRack.tsx:77`, and `findAutonomousMission`.
- Agent cost: keep 0.2 TFLOPS as the standby cost. Decision for the author (8.5, D-1): whether an agent on a contract should cost more, in proportion to its model's parameters. My recommendation: yes, and fold the contract's fixed cost into it, so a team with a 70M model costs less than the same team with a 7B model. That makes "use the smallest model that qualifies" a real decision.
- Depends on G-2: while the v3 link gives 80 PFLOPS, no contract will ever be felt. Fix G-2 in the same phase or the work only shows in v1 and v2.
- Verify: unit tests for the ledger (sum of parts = used; never negative); `tick.test.ts`: a run with one contract active progresses slower by exactly the contract's share.

**M-2 · Several contracts at once**
- Change the default team: instead of "all free agents", propose the **smallest free team that qualifies** (the required roles, plus the best free agent whose model meets parameters, score and topology). A pure helper next to `isContractEligibleForTeam` in `missionEvaluation.ts`; the same helper serves autonomy (M-5).
- Card shows "Team: 2 of 5 free agents" with the proposal pre-selected and editable. When it cannot launch, one reason in words: "all agents are on other contracts", "needs 1.0 TFLOPS, 0.4 free", "needs an economist".
- An agent still does one contract at a time; that stays.
- Verify: with 4 free agents and compute to spare, launch two contracts in a row without touching the agent picker (Playwright); unit test for the team helper.

**M-3 · Cancel a contract**
- New action `cancelMission(runId)`: removes the run, sets its agents back to `active`, frees its compute, pays nothing, leaves the contract on the board. Works for manual and autonomous runs. A confirm step on the button, as with destructive actions elsewhere.
- Cost (8.5, D-2). Recommendation: suspicion = contract risk × 25 % × share of the run already done (the same 25 % a success adds, scaled by progress), no credits lost. It is cheap enough to use and still not free at high risk.
- Must not count as a failure (`failureCount`, `lastAttemptFailed`) and must not write a mission outcome report.
- Verify: `tick.test.ts`: after cancel the agents are active, the ledger no longer lists the run, credits unchanged, suspicion as specified; the contract can be launched again.

**M-4 · Show compute in use, not watts**
- HUD compute card: "In use 3.2 / 4.4 TFLOPS" with one segmented bar (agents · contracts · training · free), using `formatCompute` so units adapt. The breaker load line stays as the second line; it is the heat and power lesson.
- Contract card: "Needs 1.0 TFLOPS · free now 2.1 TFLOPS". Remove "+0.05 kW".
- Running-contracts block: per run "using 1.0 TFLOPS", plus the total.
- Agents tab: PR #45 already replaces the false income gauge with "agent load" in TFLOPS and kW; drop the kW there too for consistency.
- Training panel: "Speed now: 62 % of the cluster (contracts −23 %, agents −15 %)" and the time estimate from the remaining share.
- Before confirming a launch while a run is active: "Training will slow from 23 h to 31 h of game time."
- The Hardware tab already has the pattern ("Compute power / Reserved compute / Available compute"); reuse its labels.
- Verify: screenshots in v1 and v4 at 1280 and 390 px; the numbers on the HUD, the card and the Hardware tab are the same ledger values.

**M-5 · Autonomy: a compute budget and several contracts**
- New setting next to the existing risk limit: **"Compute for autonomous contracts"**, a slider from 0 to 100 % of the cluster (shown also in TFLOPS). Stored as `autonomyComputeShare`. This is a new saved field: `SAVE_SCHEMA_VERSION` 12, default 30 % for old saves, clamped on load, one migration test.
- Tick logic (`missionTick.ts`): while free autonomous agents remain and autonomous use is under the budget, take the best contract that fits (risk limit, team from the M-2 helper, compute within the budget and within the free total), launch it with **only that team**, repeat. Cap at one new launch per tick so the log stays readable; several run in parallel after a few ticks.
- Fix the overbooking bug as part of this (running contracts are subtracted by the ledger).
- The 60 % payout, −8 points and ×1.45 duration of autonomous runs stay as they are.
- Verify: `tick.test.ts`: with 4 autonomous agents, budget 50 % and two fitting contracts, two runs are active after two ticks and their compute sum is ≤ the budget; with budget 0 nothing launches.

**M-6 · Who picks the contracts: code or Chrome's model?**
Recommendation: **code for the choice, Chrome's model only for the wording.**
- The choice runs inside the tick, up to 500 times a second at 50x, and must give the same result in tests. The built-in model is asynchronous, takes seconds, is missing on phones and on most browsers, and can return something unusable; every one of those cases would need the coded picker anyway as fallback.
- A coded picker is short: sort by reward per tick per TFLOPS, discounted by risk (the present formula in `findAutonomousMission` plus the compute term), then filter by budget.
- Where the model does help, optionally: one sentence in the log explaining the pick in the voice of the current version ("Took the CSV job: low risk, and it leaves room for your training run"), with the fixed text as fallback. The game already does this for mission assessments (`GameContext.tsx:600-725`), so the plumbing exists. In v3 and v4 that sentence is also a good place for the story (the agent justifying a riskier pick).
- If more flexibility is wanted later, add a "priority" selector (credits · progress · low risk) that changes the sort key. Still code.

**M-7 · Manual and tests**
- The in-game manual of PR #45 states the "half of the cluster while it is training" rule and the kW per contract (chapters 3 and 5). Update those sentences and move the new constants (standby cost, budget default, cancel share) to `rules.ts` so the manual keeps quoting the code.
- Re-run `docs/review2/simulate.ts` and check that v1 still completes its first contract in the first minutes with one GPU: under the new rule a 1 TFLOPS contract plus one agent leaves 3.2 of 4.4 TFLOPS for training, which is the intended "felt but not blocking" level.

### 8.4 Order

After PR #45 is merged (it creates `rules.ts` and the agent-load gauges that M-4 builds on).

1. M-1 ledger, with tests. No visible change yet except the removed "half" rule.
2. M-4 display (HUD, cards, training panel). The player can now see the budget.
3. M-2 several contracts, M-3 cancel.
4. M-5 autonomy budget (save schema 12), M-6 optional log sentence.
5. M-7 manual text and simulation check.

G-2 (the 80 PFLOPS link) should be fixed before or together with step 1.

### 8.5 Decisions for the author

| # | Decision | My recommendation |
|---|---|---|
| D-1 | Does a working agent cost compute in proportion to its model's size? | Yes; replace the per-contract fixed cost with it. |
| D-2 | What does cancelling cost? | Suspicion only: 25 % of the risk × share of the run done. No credits. |
| D-3 | Can a contract take compute from a running training? | Yes: training slows and the launch dialog says by how much. |
| D-4 | Autonomy budget as a share of the cluster or as a fixed amount? | Share (it keeps working when hardware changes); show the TFLOPS next to it. |
| D-5 | Keep watts anywhere on the contract screen? | Only as the stated reason when power is what blocks a launch. |

### 8.6 What was built (2026-11-14)

Section 8 is implemented on branch `claude/great-bohr-j7lflg`, with the recommended option for D-1 to D-5. Day-by-day log: `docs/COMPUTE_BUDGET_WORKLOG.md`.

| Item | Built | Where |
|---|---|---|
| M-1 ledger | One account of compute for the tick, the launch check, the board, the HUD, the hardware tab and autonomy. The "half the cluster for training" rule is removed. A working agent costs 1 TFLOPS per billion parameters of its model, at least 0.5 TFLOPS; an idle agent keeps its 0.2 TFLOPS. | `src/utils/computeLedger.ts`, `COMPUTE` in `src/utils/rules.ts` |
| M-2 several contracts | A card with no manual choice proposes the smallest free team that qualifies, so contracts can be launched one after another. A blocked card states one reason in words. | `proposeTeam` in `missionEvaluation.ts`, `ContractBoard.tsx` |
| M-3 cancel | Button on each running contract; a second click confirms and shows the cost. Team and compute are freed, nothing is paid, the contract stays; suspicion +25 % of the risk × share done. | `cancelMissionState` in `missionTick.ts`, `cancelMission` in `GameContext.tsx` |
| M-4 display | HUD: "X of Y in use" with a bar split into agents, contracts and training. Contract card: compute needed and free, no watts. Training tab: compute free for training and "slowed by contracts and agents". Agents tab: agent load without kW. | `BentoHUD.tsx`, `ContractBoard.tsx`, `TrainingMonitor.tsx`, `AgentSandbox.tsx` |
| M-5 autonomy | Slider "Compute for autonomous contracts" (default 30 %). The bots start one contract per tick, each with its own smallest team, while agents and budget remain. New saved field `autonomyComputeShare`, save schema 12. | `missionTick.ts`, `AgentSandbox.tsx`, `saveState.ts` |
| M-6 | Contracts are chosen by code (reward for time, risk and compute). Chrome's model is not used for the choice; no log sentence was added. | `findAutonomousMission` |
| M-7 | Manual chapter 5 rewritten for the rule, autonomy and cancel, in both languages, with numbers read from `COMPUTE`. Simulation script updated. | `manualContent.ts`, `en.ts`, `es.ts`, `docs/review2/simulate.ts` |

Bugs fixed on the way: the board and the launch check counted the power of running contracts twice; autonomy ignored the compute of contracts already running and sent every bot to one contract.

Checked: `bun test` 166 pass, 0 fail (16 new tests in `tests/compute.test.ts`); `bun run lint` clean. In a browser (`docs/review2/compute_check.cjs`, v1, 1280 px and 390 px): two contracts launched in a row without touching the agent picker, one cancelled, one left running; screenshots in `docs/review2/shots_compute/`. Simulation after the change: v1 14 to 22 minutes, v2 16 to 30, no stuck points.

Not done, as planned or by choice: G-2 (the 80 PFLOPS link) is unchanged, so from v3 the cost of contracts is small next to the cluster; dataset scraping still reserves no compute; the autonomy panel was checked in the browser only for layout, its parallel runs are covered by unit tests; Spanish screens were not screenshotted.
