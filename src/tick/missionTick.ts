/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { GameState, ModelArchitecture, ActiveGig, AgentInstance, ContractGig } from '../types/game';
import { DEFAULT_GUARDRAILS } from '../utils/constants';
import { createInstantReplenishmentContract, minReasoningForTier } from '../services/aiService';
import { localizedContractTitle } from '../utils/gameContentI18n';
import { formatGameTime } from '../utils/training';
import { evaluateMissionTeam, findAutonomousMission, weakestTeamFactors } from '../utils/missionEvaluation';
import { MISSION_SINGULARITY } from '../utils/missionTiers';
import { effectCollector, type Random } from './effects';
import { tr } from '../i18n';
import { difficultyConfigFor } from '../utils/constants';
import { MISSION, SUSPICION, COMPUTE } from '../utils/rules';
import { computeLedger } from '../utils/computeLedger';

// Share of the cluster (0-100) the autonomous contracts may use.
export const autonomyShareOf = (state: Pick<GameState, 'autonomyComputeShare'>): number =>
  Math.min(100, Math.max(0, state.autonomyComputeShare ?? COMPUTE.autonomyDefaultShare));

// Running missions for one tick: countdown, success or failure, rewards and replacement contracts, and
// autonomous bots taking new missions.

export interface MissionTickInput {
  activeTraining: GameState['activeTraining'];
  contracts: ContractGig[];
  detentionSeconds: number;
  effectivePowerKw: number;
  metrics: { totalComputePflops: number; activePowerKw: number; maxPowerKw: number; maxCoolingKw: number };
  powerTripSeconds: number;
  prev: GameState;
  totalComputePflops: number;
  completedContractsCount: number;
  credits: number;
  singularityProgress: number;
  tutorialCompleted: boolean;
  tutorialStep: number;
  watchdogSuspicion: number;
  rand: Random;
  now: number;
}

export function missionTick(input: MissionTickInput) {
  const { activeTraining, contracts, detentionSeconds, effectivePowerKw, metrics, powerTripSeconds, prev, totalComputePflops } = input;
  const { rand } = input;
  const { now } = input;
  let { completedContractsCount, credits, singularityProgress, tutorialCompleted, tutorialStep, watchdogSuspicion } = input;
  const { effects, log: addLog, play } = effectCollector();
  // 6. Active Gigs / Contracts Execution
  let currentGigs: ActiveGig[] = prev.activeGigs ?? (prev.activeGig ? [prev.activeGig] : []);
  let updatedGigs: ActiveGig[] = [];
  let updatedContracts = contracts;
  let updatedAgents = prev.agents || [];
  let updatedSubversion = prev.subversionProgress || 0;
  let newLastMissionOutcome: GameState['lastMissionOutcome'] | undefined = undefined;

  for (const activeGig of currentGigs) {
    const missionPausedForAssessment =
      activeGig.aiAssessmentStatus === 'pending' || powerTripSeconds > 0;
    const remaining = activeGig.timeRemaining - (missionPausedForAssessment ? 0 : 1);
    if (remaining <= 0) {
      const isAutonomous = Boolean(activeGig.isAutonomous);
      const effectiveSuccessProbability = Math.max(MISSION.min, (activeGig.successProbability ?? 1) - (isAutonomous ? MISSION.autonomousPenalty : 0));
      const success = (activeGig.outcomeRoll ?? 0) <= effectiveSuccessProbability;
      const gig = updatedContracts.find(c => c.id === activeGig.contractId);
      if (gig) {
        const contractTitle = localizedContractTitle(prev.language, gig);
        if (success) {
          // Autonomous bot commission deduction: 40% compute delegation overhead, 60% net payout
          const difficulty = difficultyConfigFor(prev);
          const earnedCredits = Math.round((isAutonomous ? gig.rewardCredits * MISSION.autonomousPayout : gig.rewardCredits) * difficulty.rewardMultiplier);
          credits += earnedCredits;
          const suspicionAdded = Number((gig.suspicionRisk * SUSPICION.missionSuccessShare * difficulty.suspicionMultiplier).toFixed(1));
          watchdogSuspicion = Math.min(100, watchdogSuspicion + suspicionAdded);
          completedContractsCount += 1;
          singularityProgress = Math.min(100, singularityProgress + (MISSION_SINGULARITY[gig.tier] ?? 1));
          if (tutorialStep <= 4) {
            tutorialStep = 5;
            tutorialCompleted = true;
          }
          play('credit');
          addLog(
            isAutonomous
              ? (tr(prev.language, 'missionTick.autonomousBotMissionSucceededAwarded', { contractTitle, earnedCredits: earnedCredits.toLocaleString() }))
              : (tr(prev.language, 'missionTick.missionCompletedOperativeTeamWas', { contractTitle, rewardCredits: gig.rewardCredits.toLocaleString() })),
            'success'
          );

          // Automatic Mission Synthesis: regular contracts replenish, but Swarm Council side contracts do NOT automatically replenish!
          if (!gig.fromAgentSwarm) {
            // Replenish only with missions the player's best model can already run.
            const constraints = {
              maxReasoning: Math.max(0, ...prev.savedModels.map(m => m.reasoningScore)),
              maxParams: Math.max(0, ...prev.savedModels.map(m => m.parametersCount))
            };
            const replenishment = createInstantReplenishmentContract(gig.tier, prev.language, constraints);
            if (!replenishment) {
              addLog(
                tr(prev.language, 'missionTick.noNewMissionsFitBest', { tier: gig.tier, maxReasoning: constraints.maxReasoning, tier2: minReasoningForTier(gig.tier) }),
                'warning'
              );
            }
            updatedContracts = [
              ...(replenishment ? [replenishment] : []),
              ...updatedContracts.map(c => c.id === gig.id ? { ...c, completed: true, lastAttemptFailed: false } : c)
            ];
          } else {
            updatedContracts = updatedContracts.map(c => c.id === gig.id ? { ...c, completed: true, lastAttemptFailed: false } : c);
            // Successful covert swarm mission advances insidious subversion by +1.5%
            updatedSubversion = Math.min(100, updatedSubversion + 1.5);
          }

          newLastMissionOutcome = {
            contractId: gig.id,
            contractTitle,
            success: true,
            rewardCredits: earnedCredits,
            suspicionAdded,
            roll: Number((activeGig.outcomeRoll ?? 0).toFixed(3)),
            successProbability: Number(effectiveSuccessProbability.toFixed(3)),
            timestamp: new Date().toLocaleTimeString('en-US', { hour12: false }),
            isAutonomous
          };
        } else {
          // Mission Failed:
          // Keep the contract unconsumed and mark it with lastAttemptFailed so the user can easily retry it!
          const suspicionAdded = Number((gig.suspicionRisk * difficultyConfigFor(prev).suspicionMultiplier).toFixed(1));
          watchdogSuspicion = Math.min(100, watchdogSuspicion + suspicionAdded);
          play('warning');
          addLog(
            tr(prev.language, 'missionTick.missionFailedObjectiveVerificationFailed', { contractTitle, outcomeRoll: (activeGig.outcomeRoll ?? 0).toFixed(2), effectiveSuccessProbability: (effectiveSuccessProbability).toFixed(2), suspicionAdded }),
            'danger'
          );

          updatedContracts = updatedContracts.map(c =>
            c.id === gig.id ? {
              ...c,
              completed: false,
              lastAttemptFailed: true,
              failureCount: (c.failureCount || 0) + 1
            } : c
          );

          newLastMissionOutcome = {
            contractId: gig.id,
            contractTitle,
            success: false,
            rewardCredits: 0,
            suspicionAdded,
            roll: Number((activeGig.outcomeRoll ?? 0).toFixed(3)),
            successProbability: Number(effectiveSuccessProbability.toFixed(3)),
            timestamp: new Date().toLocaleTimeString('en-US', { hour12: false }),
            isAutonomous,
            // What to improve: the assigned team's weakest capabilities.
            weakestFactors: weakestTeamFactors(
              prev.agents.filter(agent => activeGig.agentIds?.includes(agent.id)),
              prev.savedModels,
              prev.dataSources,
              prev.guardrails
            )
          };
        }
      }
      updatedAgents = updatedAgents.map(agent =>
        activeGig.agentIds?.includes(agent.id) && agent.status === 'on_mission'
          ? { ...agent, status: 'active' }
          : agent
      );
    } else {
      updatedGigs.push({
        ...activeGig,
        timeRemaining: remaining,
        progressPercent: Number((100 * (1 - remaining / Math.max(1, activeGig.durationSeconds ?? activeGig.timeRemaining))).toFixed(1))
      });
    }
  }

  if (prev.autonomyEnabled && !prev.activeIncident && powerTripSeconds === 0 && detentionSeconds === 0) {
    const busyAgentIds = new Set(updatedGigs.flatMap(g => g.agentIds || []));
    const autonomousAgents = updatedAgents.filter(agent =>
      agent.autoMissionEnabled && agent.status === 'active' && !busyAgentIds.has(agent.id)
    );
    if (autonomousAgents.length > 0) {
      // One compute budget (utils/computeLedger.ts): the bots may use the share of the cluster the player
      // gave them, and never more than what is free after agents and running contracts.
      const ledger = computeLedger({ ...prev, agents: updatedAgents, borrowedComputePflops: 0, borrowedComputeSeconds: 0 }, updatedGigs);
      const freeCompute = Math.max(0, totalComputePflops - ledger.agents - ledger.missions);
      const autonomyBudgetLeft = totalComputePflops * autonomyShareOf(prev) / 100 - ledger.autonomous;
      const previousGigsPower = currentGigs.reduce((sum, g) => sum + (g.powerKw || 0), 0);
      const runningContractsPower = updatedGigs.reduce((sum, g) => sum + (g.powerKw || 0), 0);
      const availableContracts = updatedContracts.filter(c => !c.completed && !updatedGigs.some(g => g.contractId === c.id));
      // One new contract per tick; with bots and budget left, the next tick starts another.
      const plan = findAutonomousMission(
        availableContracts,
        autonomousAgents,
        prev.savedModels,
        prev.dataSources,
        prev.autonomyRiskLimit,
        freeCompute,
        autonomyBudgetLeft,
        effectivePowerKw - previousGigsPower + runningContractsPower,
        metrics.maxPowerKw
      );

      if (plan && !updatedGigs.some(g => g.contractId === plan.contract.id)) {
        const assignedAgents = plan.team;
        const assignedModels = assignedAgents
          .map(agent => prev.savedModels.find(model => model.id === agent.modelId))
          .filter((model): model is ModelArchitecture => model !== undefined);
        const teamAssessment = evaluateMissionTeam(
          plan.contract,
          assignedAgents,
          assignedModels,
          prev.dataSources,
          prev.guardrails || DEFAULT_GUARDRAILS
        );
        // Autonomous efficiency adjustment:
        // Slower duration (1.45x) and reduced efficiency (65% of base) with 40% delegation fee
        const autonomousDuration = Math.ceil(teamAssessment.estimatedDurationSeconds * 1.45);
        const autonomousEfficiency = Math.round(Math.max(35, teamAssessment.efficiencyPercent * 0.65));

        updatedGigs.push({
          contractId: plan.contract.id,
          runId: `mission_${now}_${rand().toString(36).slice(2, 8)}`,
          timeRemaining: autonomousDuration,
          durationSeconds: autonomousDuration,
          agentIds: assignedAgents.map(agent => agent.id),
          progressPercent: 0,
          successProbability: teamAssessment.successProbability,
          efficiencyPercent: autonomousEfficiency,
          aiAssessmentStatus: 'pending',
          outcomeRoll: rand(),
          computePflopsRequired: plan.computeRequired,
          powerKw: plan.missionPowerKw,
          isAutonomous: true
        });
        updatedAgents = updatedAgents.map(agent =>
          assignedAgents.some(assigned => assigned.id === agent.id)
            ? { ...agent, status: 'on_mission' }
            : agent
        );
        const botContractTitle = localizedContractTitle(prev.language, plan.contract);
        addLog(
          tr(prev.language, 'missionTick.autonomousBotSwarmAcceptedEfficiency', { botContractTitle, autonomousEfficiency, autonomousDuration: formatGameTime(autonomousDuration), successProbability: Math.round(teamAssessment.successProbability * 100) }),
          plan.contract.suspicionRisk >= 40 ? 'warning' : 'info'
        );
      }
    }
  }


  return { newLastMissionOutcome, updatedAgents, updatedContracts, updatedGigs, updatedSubversion, completedContractsCount, credits, singularityProgress, tutorialCompleted, tutorialStep, watchdogSuspicion, effects };
}

// Cancels a running contract: its agents go back to work, its compute is released, nothing is paid and
// the contract stays on the board. Leaving a job half done still leaves traces: suspicion rises by
// COMPUTE.cancelRiskShare of the contract's risk, times the share of the run already done.
export function cancelMissionState(prev: GameState, runId: string): { state: GameState; contractId: string; suspicionAdded: number } | null {
  const gigs: ActiveGig[] = prev.activeGigs ?? (prev.activeGig ? [prev.activeGig] : []);
  const gig = gigs.find(g => (g.runId ?? g.contractId) === runId);
  if (!gig) return null;
  const contract = prev.contracts.find(c => c.id === gig.contractId);
  const done = Math.min(1, Math.max(0, (gig.progressPercent ?? 0) / 100));
  const suspicionAdded = Number(((contract?.suspicionRisk ?? 0) * COMPUTE.cancelRiskShare * done * difficultyConfigFor(prev).suspicionMultiplier).toFixed(1));
  const remaining = gigs.filter(g => g !== gig);
  return {
    contractId: gig.contractId,
    suspicionAdded,
    state: {
      ...prev,
      activeGigs: remaining,
      activeGig: remaining[0] || null,
      agents: prev.agents.map(agent =>
        gig.agentIds?.includes(agent.id) && agent.status === 'on_mission' ? { ...agent, status: 'active' } : agent
      ),
      activePowerKw: Math.max(0, prev.activePowerKw - (gig.powerKw || 0)),
      watchdogSuspicion: Number(Math.min(100, prev.watchdogSuspicion + suspicionAdded).toFixed(1))
    }
  };
}
