/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { InterAgentMessage, AgentInstance, ContractGig, GameState } from '../types/game';
import { DEFAULT_GUARDRAILS, REAL_WORLD_BREACH_TEMPLATES } from '../utils/constants';
import { agentChatter } from '../utils/agentDialogues';
import { strictnessBand, SANDBOX_RESEARCH_MULTIPLIER, SANDBOX_INCIDENT_MULTIPLIER, INCIDENT_CHANCE_CAP, INCIDENT_CHANCE_PER_SUSPICION_POINT, INCIDENT_COOLDOWN_TICKS, ALIGNMENT_COMPROMISED_BELOW, ALIGNMENT_JAILBREAK_BELOW, OVERSEER_ALIGNMENT_PER_TICK } from '../utils/rules';
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

  // Guardrails (see utils/rules.ts): strictness picks a band for drift and incident chance; the sandbox
  // scales the incident chance and the research agents' slow progress.
  const band = strictnessBand(guardrails.constitutionalStrictness);
  const guardrailRevMult = band.researchBoost * (SANDBOX_RESEARCH_MULTIPLIER[guardrails.sandboxIsolation] ?? 1);
  const alignmentDriftRate = band.alignmentDrift;
  const baseBreachProbability = Math.min(
    INCIDENT_CHANCE_CAP,
    band.incidentChance * (SANDBOX_INCIDENT_MULTIPLIER[guardrails.sandboxIsolation] ?? 1) +
      Math.max(0, watchdogSuspicion - 35) * INCIDENT_CHANCE_PER_SUSPICION_POINT
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
        newAlignment = Math.min(100, newAlignment + OVERSEER_ALIGNMENT_PER_TICK);
      }
      const tempDrift = (inf.temperature - 0.6) * 0.04;
      const topPDrift = (inf.topP - 0.7) * 0.02;
      const totalDrift = alignmentDriftRate + tempDrift + topPDrift;
      newAlignment = Math.max(0, Math.min(100, newAlignment - totalDrift));

      return {
        ...agent,
        alignmentScore: Number(newAlignment.toFixed(1)),
        status: newAlignment < ALIGNMENT_JAILBREAK_BELOW ? 'jailbroken' : agent.status === 'jailbroken' ? 'active' : agent.status
      };
    });

    // Check for breach / jailbreak incident only if cooldown elapsed and an actual compromised condition exists
    if (!newActiveIncident && updatedIncidentCooldown === 0) {
      const rogue = updatedAgents.find(a => (a.alignmentScore < ALIGNMENT_COMPROMISED_BELOW || a.status === 'jailbroken') && a.status !== 'quarantined');
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
          updatedIncidentCooldown = INCIDENT_COOLDOWN_TICKS;
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
        const misaligned = sender.alignmentScore < ALIGNMENT_COMPROMISED_BELOW || receiver.alignmentScore < ALIGNMENT_COMPROMISED_BELOW;
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
