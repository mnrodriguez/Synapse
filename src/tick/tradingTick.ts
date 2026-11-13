/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */


import type { GameState, ContractGig, AgentInstance } from '../types/game';
import { effectCollector, type Random } from './effects';
import { tr } from '../i18n';
import { difficultyConfigFor } from '../utils/constants';

// The trading desk for one tick.

export interface TradingTickInput {
  detentionSeconds: number;
  powerTripSeconds: number;
  prev: GameState;
  updatedAgents: AgentInstance[];
  watchdogSuspicion: number;
  rand: Random;
}

export function tradingTick(input: TradingTickInput) {
  const { detentionSeconds, powerTripSeconds, prev, updatedAgents } = input;
  const { rand } = input;
  let { watchdogSuspicion } = input;
  const { effects, log: addLog, play } = effectCollector();
  // 7.5 Continuous Market Trading Desk Execution
  let updatedTradingDesk = prev.activeTradingDesk;
  let tradingSuspicion = 0;
  if (updatedTradingDesk && detentionSeconds === 0 && powerTripSeconds === 0) {
    const assignedAgent = updatedAgents.find(a => a.id === updatedTradingDesk?.agentId);
    if (assignedAgent && (assignedAgent.status === 'active' || assignedAgent.status === 'collaborating')) {
      const riskTier = updatedTradingDesk.riskTier;
      let tickReturnRate = 0.0003;
      let tickSuspicion = 0.02;

      if (riskTier === 'low') {
        // Always positive: +1% to +3% per in-game day (48 ticks)
        tickReturnRate = 0.0002 + rand() * 0.0004;
        tickSuspicion = 0.01;
      } else if (riskTier === 'moderate') {
        // +5% to +12% per in-game day, 8% chance of minor correction (-0.1% per tick)
        const isCorrection = rand() < 0.08;
        tickReturnRate = isCorrection ? -0.001 : (0.001 + rand() * 0.0015);
        tickSuspicion = 0.05;
      } else if (riskTier === 'high') {
        // +15% to +35% per day, 15% chance of volatility drawdown (-0.5% to -1.5% per tick)
        const isDrawdown = rand() < 0.15;
        tickReturnRate = isDrawdown ? -(0.005 + rand() * 0.01) : (0.003 + rand() * 0.004);
        tickSuspicion = 0.15;
      }

      const capital = updatedTradingDesk.capitalAllocated;
      const tickChange = Math.round(capital * tickReturnRate);
      const newCapital = Math.max(0, capital + tickChange);
      const totalProfit = updatedTradingDesk.totalRealizedProfit + tickChange;
      const dailyReturnPercent = Number((((newCapital - capital) / Math.max(1, capital)) * 48 * 100).toFixed(1));

      updatedTradingDesk = {
        ...updatedTradingDesk,
        capitalAllocated: newCapital,
        totalRealizedProfit: totalProfit,
        dailyReturnPercent,
        lastTickChange: tickChange
      };

      tradingSuspicion = tickSuspicion * difficultyConfigFor(prev).suspicionMultiplier;
      watchdogSuspicion = Math.min(100, watchdogSuspicion + tradingSuspicion);

      if (newCapital <= 0) {
        updatedTradingDesk = null;
        addLog(
          tr(prev.language, 'tradingTick.marketDeskSTradingDesk', { name: assignedAgent.name }),
          'danger'
        );
      }
    }
  }


  return { updatedTradingDesk, watchdogSuspicion, tradingSuspicion, effects };
}
