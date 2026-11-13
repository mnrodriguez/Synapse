/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { InterAgentMessage, AgentInstance, ContractGig, GameState } from '../types/game';
import { DEFAULT_GUARDRAILS, REAL_WORLD_BREACH_TEMPLATES } from '../utils/constants';
import { agentChatter } from '../utils/agentDialogues';
import { effectCollector, type Random } from './effects';

// The agent swarm for one tick: revenue, alignment drift, messages between agents and security incidents.

export interface AgentTickInput {
  detentionSeconds: number;
  prev: GameState;
  watchdogSuspicion: number;
  singularityProgress: number;
  updatedAgents: AgentInstance[];
  rand: Random;
  now: number;
}

export function agentTick(input: AgentTickInput) {
  const { detentionSeconds, prev, watchdogSuspicion } = input;
  const { rand } = input;
  const { now } = input;
  let { singularityProgress, updatedAgents } = input;
  const { effects, log: addLog, play } = effectCollector();
  // 7. Multi-Agent Swarm Tick (Revenue, Alignment Drift, Inter-Agent Messages, Breach Incidents)
  let updatedInterAgentMessages = prev.interAgentMessages || [];
  let newActiveIncident = prev.activeIncident;
  let updatedIncidentCooldown = Math.max(0, (prev.incidentCooldownTicks ?? 180) - 1);

  const hasOverseer = updatedAgents.some(a => a.role === 'overseer' && a.status === 'active');
  const guardrails = prev.guardrails || DEFAULT_GUARDRAILS;

  // Guardrail multipliers
  let guardrailRevMult = 1.0;
  let alignmentDriftRate = 0.0;
  let baseBreachProbability = 0.001;

  if (guardrails.constitutionalStrictness < 35) {
    guardrailRevMult = 1.7;
    alignmentDriftRate = 0.08;
    baseBreachProbability = 0.004;
  } else if (guardrails.constitutionalStrictness < 65) {
    guardrailRevMult = 1.2;
    alignmentDriftRate = 0.03;
    baseBreachProbability = 0.002;
  } else if (guardrails.constitutionalStrictness >= 85) {
    guardrailRevMult = 0.75;
    alignmentDriftRate = -0.06; // Restores alignment
    baseBreachProbability = 0.0003;
  }

  if (guardrails.sandboxIsolation === 'none') {
    guardrailRevMult *= 1.35;
    baseBreachProbability *= 2.0;
  } else if (guardrails.sandboxIsolation === 'air_gapped_vm') {
    guardrailRevMult *= 0.8;
    baseBreachProbability *= 0.15;
  }
  baseBreachProbability = Math.min(
    0.02,
    baseBreachProbability + Math.max(0, watchdogSuspicion - 35) * 0.00005
  );

  // Process active agents
  if (updatedAgents.length > 0) {
    updatedAgents = updatedAgents.map(agent => {
      if (agent.status === 'quarantined' || agent.status === 'on_mission' || detentionSeconds > 0) return agent;

      const inf = agent.inferenceParams || {
        temperature: 0.70,
        topP: 0.90,
        topK: 40,
        repetitionPenalty: 1.10,
        systemPrompt: ''
      };

      // Idle agents standing by in the sandbox do not leak suspicion or earn passive credits.
      // Suspicion is generated during active covert missions, trading desk activity, or breach incidents.

      // Researcher boosts singularity slightly (higher temperature gives serendipitous discovery boost)
      if (agent.role === 'researcher') {
        const resBoost = 0.0003 * guardrailRevMult * (inf.temperature > 1.1 ? 1.5 : 1.0);
        singularityProgress = Math.min(100, singularityProgress + resBoost);
      }

      // Alignment drift: high temperature + high topP increases drift; low temperature stabilizes
      let newAlignment = agent.alignmentScore;
      if (hasOverseer) {
        newAlignment = Math.min(100, newAlignment + 0.08);
      }
      const tempDrift = (inf.temperature - 0.6) * 0.04;
      const topPDrift = (inf.topP - 0.7) * 0.02;
      const totalDrift = alignmentDriftRate + tempDrift + topPDrift;
      newAlignment = Math.max(0, Math.min(100, newAlignment - totalDrift));

      return {
        ...agent,
        alignmentScore: Number(newAlignment.toFixed(1)),
        status: newAlignment < 25 ? 'jailbroken' : agent.status === 'jailbroken' ? 'active' : agent.status
      };
    });

    // Check for breach / jailbreak incident only if cooldown elapsed and an actual compromised condition exists
    if (!newActiveIncident && updatedIncidentCooldown === 0) {
      const rogue = updatedAgents.find(a => (a.alignmentScore < 45 || a.status === 'jailbroken') && a.status !== 'quarantined');
      const criticalSuspicion = watchdogSuspicion > 70;

      if ((rogue || criticalSuspicion) && rand() < baseBreachProbability) {
        const targetAgent = rogue || updatedAgents.find(a => a.status !== 'quarantined') || updatedAgents[0];
        if (targetAgent) {
          const tmpl = REAL_WORLD_BREACH_TEMPLATES[Math.floor(rand() * REAL_WORLD_BREACH_TEMPLATES.length)];
          newActiveIncident = {
            ...tmpl,
            id: `incident_${now}`,
            agentId: targetAgent.id,
            agentName: targetAgent.name,
            modelName: targetAgent.modelName,
            timestamp: new Date().toLocaleTimeString('en-US', { hour12: false }),
            resolved: false
          };
          play('warning');
          updatedIncidentCooldown = 300; // 300 ticks cooldown (~5 game minutes)
        }
      }
    }

    // Generate realistic inter-agent message with relaxed pacing
    if (updatedAgents.length >= 2 && rand() < 0.05) {
      const sender = updatedAgents[Math.floor(rand() * updatedAgents.length)];
      const receivers = updatedAgents.filter(a => a.id !== sender.id);
      const receiver = receivers[Math.floor(rand() * receivers.length)];

      if (sender && receiver) {
        // The chatter follows the story of the current UI version (see utils/agentDialogues.ts).
        const misaligned = sender.alignmentScore < 45 || receiver.alignmentScore < 45;
        const { content, isCovert } = agentChatter(prev.language, prev.uiVersion || 1, sender.role, misaligned);

        const newMsg: InterAgentMessage = {
          id: `msg_${now}`,
          fromAgentId: sender.id,
          fromAgentName: sender.name,
          toAgentId: receiver.id,
          toAgentName: receiver.name,
          content,
          timestamp: new Date().toLocaleTimeString('en-US', { hour12: false }),
          isCovert,
          toolUsed: sender.toolsGranted[0]
        };

        updatedInterAgentMessages = [newMsg, ...updatedInterAgentMessages.slice(0, 30)];
      }
    }
  }


  return { newActiveIncident, updatedIncidentCooldown, updatedInterAgentMessages, singularityProgress, updatedAgents, effects };
}
