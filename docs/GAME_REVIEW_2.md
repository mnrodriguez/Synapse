# SYNAPSE — Game Review 2

Review date: 2026-11-13 · `main` at `53ad084` · PR #45 (`docs/manual`) at `49dfb67`.

Legend used in every finding: **[V]** verified (read, ran or measured) · **[I]** inferred from the code, not run · **[TV]** to verify (no source at hand).
Priorities: **P0** blocks play or teaches something false · **P1** confuses or bores · **P2** polish.

<!-- SECTIONS 2-7 ARE ADDED BELOW AS EACH STEP FINISHES; SEE docs/GAME_REVIEW_2_PROGRESS.md -->

## 1. Merge decision for PR #45

**Decision: MERGE AFTER FIXES.** The PR is a clear improvement and is safe for saves; five small fixes (A-1 to A-5) should go in first because the PR's own goal is "every number in the manual is true", and those are the places where it is not.

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
| `tradingTick.ts` | Tier table instead of `if` chain | No for `low`/`moderate`/`high`: same ranges and the same number of `rand()` calls in the same order. **Yes for an unknown tier**: `main` fell back to a default return, the PR reads `TRADING_TIERS[riskTier].suspicion` and would throw (see A-6). |
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
| Success: "**up to +15** for the models' evaluation score" | `missionEvaluation.ts:160`: `Math.min(0.15, averageReasoning / 1200)` | **Mismatch (A-1).** The score is 0–100, so the term is score ÷ 12 points: 4.2 at score 50, 8.25 at the hard cap of 99. +15 is unreachable. |
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

Result: about 60 numeric claims checked, **2 false as written (A-1, A-2), 1 incomplete list (A-3), 1 game text that contradicts the manual (A-4)**.

### 1.4 Save compatibility and the four UI versions [V]

- `SAVE_SCHEMA_VERSION` stays at 11 (`saveState.ts:27`) and that is correct: the PR adds **no stored field**. The swarm grant is derived from fields that already exist and are already normalised on load (`singularityCrisisResolved`, `playerChoseResist`, `saveState.ts:305-308`). No migration is needed.
- An old save where the player already complied gets the +50 % from the first tick after loading. That is the promised reward arriving late, not a loss.
- `tests/save.test.ts` passes unchanged on the PR branch.
- The PR adds no colors: `tests/theme.test.ts` passes, and the new manual uses only `mutating-*`/`theme-*` classes. Screenshots of the manual in v1 and v4 are in section 5.
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
| **A-1** | Either change the text to "about 1 point for every 12 points of score (at most 8)", or rescale the divisor to the 0–100 scale (`averageReasoning / 660` gives +15 at 99). Changing the divisor changes balance; the text fix is the safe one for this PR. | `en.ts`/`es.ts` `manual.missions.p2`; `missionEvaluation.ts:160`; `rules.ts` `MISSION.reasoningBonusMax` | Add to `manual.test.ts`: for score 99 the computed bonus equals the number printed. |
| **A-2** | Keep fractional capital (`capital + capital × rate`, round only on display), or state the minimum useful capital in the manual and on the desk. | `tradingTick.ts:47` | Test: 500 credits on the low tier for 48 ticks gains between 1 % and 3 %. |
| **A-3** | Add the three missing gauge sources and the +3 cap per run to chapter 9. | `manual.progress.*`, `manualContent.ts` | Read chapter 9 against `trainingTick.ts:129`, `GameContext.tsx:1386,1419`. |
| **A-4** | The button text says "+0.015 PFLOPS for about 3 game days" and the detention log "about 1 game day"; the real values are 3 d 18 h and 1 d 6 h. Pass `formatGameTime(SUSPICION.shadowTicks)` and `shadowDetentionTicks` as parameters, as the manual does. Same for the "×1.4" typed into `agentSandbox.toolRiskier`. | `en.ts`/`es.ts` `ui.shadow_compute_description`, `gameContext.shadowOperationDetectedRiskOperative`, `agentSandbox.toolRiskier` | The catalog test for parameters already exists; the texts then cannot drift. |
| **A-5** | Show the "may change more than its offer says" sentence only from v3 (after the player has lived through one upgrade), and extend the spoiler test to Spanish and to "singularity / singularidad / operative / operativo / enjambre / subversión". | `manual.dec.upgrade.cost`, `manual.progress.upgradeEffect`, `tests/manual.test.ts` | The test fails if the words come back. |

Can follow in a later PR (not blocking):

| ID | Item |
|---|---|
| A-6 | `tradingTick.ts:37`: `TRADING_TIERS[riskTier] ?? TRADING_TIERS.low`. Today only three values can be stored, so this is hardening against a hand-edited or future save; without it a bad value throws on every tick. |
| A-7 | The PR says the 9-page PDF was deleted, but `SYNAPSE_AI_Architecture_Manual.pdf` (repo root) and `public/SYNAPSE_AI_Architecture_Manual.pdf` are still the 9-page file with the outdated strategy page (counted `/Type /Page` objects: 9, 9, and 8 for the asset the game opens). `SYNAPSE_AI_STUDY_GUIDE.txt` still gives that path as "Direct Download Link" and has a typo: "has been an 8-page visual PDF". Replace both copies with the 8-page file. |
| A-8 | `training.ts:11-12` comment says the covert node is not part of training. The code adds it (`trainingTick.ts:62`), and the manual correctly says so. Fix the comment. |
| A-9 | Language notes of 1.5. |
| A-10 | The design findings the PR lists but leaves open (output filter and reward-hacking audit have no mechanical effect; version-upgrade promises are narrative) are confirmed and taken up in section 4.2 (C-9) and 4.1 (S-4). |
