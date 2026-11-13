# Game Review 2 — progress

Report: `docs/GAME_REVIEW_2.md` · Branch: `claude/trusting-bardeen-kpx3qj` · PR under review: #45 (`docs/manual` @ `49dfb67`, base `main` @ `53ad084`)

- [x] Part A.1: check out `docs/manual`, run `bun install`, `bun test`, `bun run lint`
  - Result: PR branch `docs/manual` @ 49dfb67: `bun install` ok (157 packages); `bun test` 150 pass, 0 fail, 12818 expect() calls, 8 files; `bun run lint` (tsc --noEmit) exit 0, no output.
- [x] Part A.2: verify numeric claims of the new manual against code
  - Result: ~60 numeric claims traced; 2 false as written (score bonus "+15" unreachable, real max 8.25; trading gains round to 0 on small capital), 1 incomplete list (gauge sources), 1 game text contradicting the manual (shadow compute duration). Details: report 1.3.
- [x] Part A.3: backward compatibility and save migration
  - Result: No stored field added; SAVE_SCHEMA_VERSION 11 is correct, no migration needed; save tests pass. One intended behavior change (comply = permanent +50% GPU compute). Unknown trading tier would now throw (hardening, A-6).
- [x] Part A.4: EN/ES parity
  - Result: 2619 keys in both catalogs, none missing, placeholders match; Spanish manual reads natural (tuteo). Minor: "enlentece", mixed decimal separators, facility names in English.
- [x] Part A.5: spoilers in v1/v2
  - Result: No forbidden words in v1/v2 manual (EN+ES). One mild new spoiler: "an upgrade may change more than its offer says" shown in v1/v2. Spoiler test covers only English and 5 words.
- [x] Part A.6: merge decision
  - Result: MERGE AFTER FIXES (A-1 to A-5 in report 1.7). Not merged.
- [x] Part B.1: story and narrative coherence
  - Result: Fork dialog ("SWARM CRISIS") reachable in v1/v2 (screenshot); v1 portal shows "Takeoff progress", "DOMAINS CONTROLLED", "Sing."; v4 dialogue cites choices the player never made; epilogue reads guardrails only at the end. Report 4.1 (S-1 to S-7).
- [x] Part B.2: scientific accuracy
  - Result: 10 findings (C-1 to C-10): resize keeps score (P0), precision taught backwards, papers unlock unrelated items, overfitting epoch announced in advance, Chinchilla worded as a law, Coral TPU as training GPU. External figures marked "to verify" (no outside source consulted). Report 4.2.
- [x] Part B.3: progression, pacing, engagement (simulation)
  - Result: Simulation written (docs/review2/simulate.ts, results in sim_results.txt). Optimal bot: v1 ~16 min, v2 ~16 min, v3 18 SECONDS, v4 nothing left. Gauge is not capped per version: 75% fork fires in v2 (in v1 if resizing resets score) and 100% is reached in v2. Resizing a trained model keeps its score. Energy bill ~200 credits vs ~40,000 earned.
- [x] Part B.4: UI desktop and mobile (screenshots)
  - Result: Playwright screenshots in docs/review2/shots (desktop 1280 and mobile 390, v1-v4) and shots_pr45. First screen is friendly; first game screen is overloaded; two progress numbers; false empty state on contract cards. Report 4.4 and 5.
- [x] Part B.5: technical items (tests, lint, i18n, saves on `main`)
  - Result: main: bun test 140 pass / 0 fail (5379 expects, 7 files); lint exit 0. Catalog 2469 keys each, none missing; 44 EN/ES pairs differ in meaning (Spanish usually the accurate one). Saves: sound, partial guardrails not merged, no mid-game round-trip test. Report 4.5.
- [x] Deliverable report
  - Result: docs/GAME_REVIEW_2.md complete (7 sections). Decision for PR #45: MERGE AFTER FIXES (A-1 to A-7). Nothing merged, no PR opened, no file under src/ or tests/ changed.

Supporting files: `docs/review2/simulate.ts` (full-run simulation), `docs/review2/sim_results.txt`, `docs/review2/screenshots.cjs`, `docs/review2/shots/`, `docs/review2/shots_pr45/`.

- [x] Addendum (requested after delivery): plan for shared compute, several contracts, cancel, compute display, autonomy budget
  - Result: report section 8 (M-1 to M-7, decisions D-1 to D-5). Plan only, no code changed.

STOPPED AT: all steps finished and pushed, including the section 8 addendum. NEXT: nothing pending; the author decides D-1 to D-5 and the PR #45 fixes.
