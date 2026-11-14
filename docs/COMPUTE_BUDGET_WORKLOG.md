# Compute budget: work log

Implements section 8 of `docs/GAME_REVIEW_2.md` (items M-1 to M-7). Branch: `claude/great-bohr-j7lflg` (review branch + `main` at `881f330`, which has PR #45 merged). One pull request at the end; commits as each step is done.

**If this work is interrupted:** read this file, resume at the first unchecked step, run `bun test` and `bun run lint` before continuing. The last line says where it stopped.

## Decisions taken (section 8.5, the recommended options)

- D-1: a working agent costs compute in proportion to its model: per agent on a contract, `max(0.5 TFLOPS, 1 TFLOPS per billion parameters of its model)`. This replaces the fixed per-contract cost. Idle agents keep the 0.2 TFLOPS standby cost.
- D-2: cancelling a contract costs suspicion only: 25 % of its risk × share of the run done. No credits.
- D-3: a contract may take compute from a running training; training slows and the card says by how much. The "half the cluster is reserved for training" rule is removed.
- D-4: the autonomy budget is a share of the cluster (0-100 %), default 30 %.
- D-5: watts leave the contract cards; power is named only when it is what blocks a launch.
- M-6: contracts are picked by code. Chrome's model is not used for the choice.

## Not in this work

- G-2 (the 80 PFLOPS link in v3) is not changed, so from v3 contract compute is small next to the cluster.
- Dataset scraping still reserves no compute.
- The fixes A-1 to A-7 for the manual (PR #45 was merged without them).

## Steps

- [x] 1. M-1 compute ledger (`src/utils/computeLedger.ts`), constants in `rules.ts`, used by the tick, `startContract`, the contract board, the hardware tab and autonomy; tests
- [x] 2. M-2 smallest-team proposal; several contracts without touching the agent picker; tests
- [x] 3. M-3 cancel a contract (action, button with confirm, tests)
- [ ] 4. M-5 autonomy: compute budget slider, several contracts in parallel, save schema 12, tests
- [ ] 5. M-4 display: HUD "in use", contract cards without watts, training panel "slowed by", agents tab
- [ ] 6. M-7 manual texts (EN/ES), simulation script, full test and lint run, screenshots
- [ ] 7. Report section 8 updated with what was built; pull request opened

## Log

- Branch created from the review branch, `main` merged. Baseline: `bun test` 150 pass, 0 fail; `bun run lint` clean.
- Steps 1-3 and the logic of step 4 done. New: `src/utils/computeLedger.ts` (ledger, `missionComputePflops`, `trainingSlowdown`), `COMPUTE` in `rules.ts`, `proposeTeam` and the rewritten `findAutonomousMission` in `missionEvaluation.ts`, `cancelMissionState` in `missionTick.ts`, action `cancelMission`, field `autonomyComputeShare` with save schema 12. The half-cluster rule is gone from `startContract`, the board, the hardware tab and autonomy. Contract board: default team is the smallest free one, one reason shown when blocked, cancel button with a second click to confirm, compute needed and free instead of watts. Also fixed while there: the board and `startContract` counted the power of running contracts twice, and autonomy sent every bot to one contract. Tests: new `tests/compute.test.ts` (16 tests); `bun test` 166 pass, 0 fail; lint clean.

STOPPED AT: steps 1-3 committed; step 4 logic and tests done, its slider in the agents tab is missing. NEXT: step 4 slider (AgentSandbox.tsx near the risk-limit slider, line ~640), then step 5 display (BentoHUD compute card, TrainingMonitor 'slowed by' line, AgentSandbox agent-load gauge without kW).
