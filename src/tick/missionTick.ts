/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { GameState, ModelArchitecture, ActiveGig, AgentInstance, ContractGig } from '../types/game';
import { DEFAULT_GUARDRAILS } from '../utils/constants';
import { createInstantReplenishmentContract, minReasoningForTier } from '../services/aiService';
import { localize } from '../utils/i18n';
import { localizedContractTitle } from '../utils/gameContentI18n';
import { formatGameTime } from '../utils/training';
import { evaluateMissionTeam, findAutonomousMission, weakestTeamFactors } from '../utils/missionEvaluation';
import { MISSION_SINGULARITY } from '../utils/missionTiers';
import { effectCollector, type Random } from './effects';

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
      const effectiveSuccessProbability = Math.max(0.15, (activeGig.successProbability ?? 1) - (isAutonomous ? 0.08 : 0));
      const success = (activeGig.outcomeRoll ?? 0) <= effectiveSuccessProbability;
      const gig = updatedContracts.find(c => c.id === activeGig.contractId);
      if (gig) {
        const contractTitle = localizedContractTitle(prev.language, gig);
        if (success) {
          // Autonomous bot commission deduction: 40% compute delegation overhead, 60% net payout
          const earnedCredits = isAutonomous ? Math.round(gig.rewardCredits * 0.60) : gig.rewardCredits;
          credits += earnedCredits;
          const suspicionAdded = Number((gig.suspicionRisk * 0.25).toFixed(1));
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
              ? (prev.language === 'en'
                  ? `Autonomous bot mission succeeded: [${contractTitle}]. Awarded $${earnedCredits.toLocaleString()} CR net (after 40% compute delegation overhead).`
                  : `Misión de bots autónomos exitosa: [${contractTitle}]. Acreditados $${earnedCredits.toLocaleString()} CR netos (tras 40% de tasa operativa de cómputo).`)
              : (prev.language === 'en'
                  ? `Mission completed: [${contractTitle}]. The operative team was awarded $${gig.rewardCredits.toLocaleString()} CR.`
                  : `Misión completada: [${contractTitle}]. El equipo recibió $${gig.rewardCredits.toLocaleString()} CR.`),
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
                localize(
                  prev.language,
                  `No hay nuevas misiones de ${gig.tier} al alcance de tu mejor modelo (puntaje ${constraints.maxReasoning}). Entrena tu modelo hasta puntaje ${minReasoningForTier(gig.tier)} para desbloquearlas.`,
                  `No new ${gig.tier} missions fit your best model (score ${constraints.maxReasoning}). Train your model to score ${minReasoningForTier(gig.tier)} to unlock them.`
                ),
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
          const suspicionAdded = gig.suspicionRisk;
          watchdogSuspicion = Math.min(100, watchdogSuspicion + suspicionAdded);
          play('warning');
          addLog(
            prev.language === 'en'
              ? `[MISSION FAILED] [${contractTitle}]: Objective verification failed (Roll ${(activeGig.outcomeRoll ?? 0).toFixed(2)} vs required ${(effectiveSuccessProbability).toFixed(2)}). Watchdog suspicion +${suspicionAdded}%. Mission remains available for reattempt.`
              : `[MISIÓN FALLIDA] [${contractTitle}]: Falló la verificación de inferencia (Tirada ${(activeGig.outcomeRoll ?? 0).toFixed(2)} vs requerido ${(effectiveSuccessProbability).toFixed(2)}). Sospecha +${suspicionAdded}%. El contrato sigue disponible para reintento.`,
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
      const runningContractsPower = updatedGigs.reduce((sum, g) => sum + (g.powerKw || 0), 0);
      const availableContracts = updatedContracts.filter(c => !c.completed && !updatedGigs.some(g => g.contractId === c.id));
      const plan = findAutonomousMission(
        availableContracts,
        autonomousAgents,
        prev.savedModels,
        prev.dataSources,
        prev.autonomyRiskLimit,
        totalComputePflops,
        updatedAgents.filter(agent => agent.status !== 'quarantined').length,
        Boolean(activeTraining),
        effectivePowerKw + runningContractsPower,
        metrics.maxPowerKw
      );

      if (plan && !updatedGigs.some(g => g.contractId === plan.contract.id)) {
        const assignedAgents = autonomousAgents;
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
          prev.language === 'en'
            ? `Autonomous bot swarm accepted [${botContractTitle}] (${autonomousEfficiency}% efficiency [autonomous balance], ${formatGameTime(autonomousDuration)} duration, ${Math.round(teamAssessment.successProbability * 100)}% base success, 40% delegation fee).`
            : `El enjambre autónomo aceptó [${botContractTitle}] (${autonomousEfficiency}% eficiencia [balance autónomo], ${formatGameTime(autonomousDuration)} duración, ${Math.round(teamAssessment.successProbability * 100)}% éxito base, 40% tasa de delegación).`,
          plan.contract.suspicionRisk >= 40 ? 'warning' : 'info'
        );
      }
    }
  }


  return { newLastMissionOutcome, updatedAgents, updatedContracts, updatedGigs, updatedSubversion, completedContractsCount, credits, singularityProgress, tutorialCompleted, tutorialStep, watchdogSuspicion, effects };
}
