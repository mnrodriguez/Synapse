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
- [ ] Part B.1: story and narrative coherence
- [ ] Part B.2: scientific accuracy
- [x] Part B.3: progression, pacing, engagement (simulation)
  - Result: Simulation written (docs/review2/simulate.ts, results in sim_results.txt). Optimal bot: v1 ~16 min, v2 ~16 min, v3 18 SECONDS, v4 nothing left. Gauge is not capped per version: 75% fork fires in v2 (in v1 if resizing resets score) and 100% is reached in v2. Resizing a trained model keeps its score. Energy bill ~200 credits vs ~40,000 earned.
- [ ] Part B.4: UI desktop and mobile (screenshots)
- [ ] Part B.5: technical items (tests, lint, i18n, saves on `main`)
- [ ] Deliverable report

Partial findings are kept in `docs/GAME_REVIEW_2.md` (grows step by step).

STOPPED AT: finished "Part B.3". NEXT: Part B.1/B.2 reading (story, science), then B.4 screenshots, B.5, report.
