/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */


import type { GameState, ContractGig, AgentInstance } from '../types/game';
import { effectCollector, type Random } from './effects';
import { tr } from '../i18n';
import { difficultyConfigFor } from '../utils/constants';
import { TRADING_TIERS } from '../utils/rules';

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
      // Returns, chance of a loss and suspicion by risk tier: see TRADING_TIERS in utils/rules.ts.
      const tier = TRADING_TIERS[riskTier];
      const tickSuspicion = tier.suspicion;
      const [lossLow, lossHigh] = tier.loss;
      const [gainLow, gainHigh] = tier.gain;
      const isLoss = tier.lossChance > 0 && rand() < tier.lossChance;
      const tickReturnRate = isLoss
        ? -(lossLow + (lossHigh > lossLow ? rand() * (lossHigh - lossLow) : 0))
        : gainLow + rand() * (gainHigh - gainLow);

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
