/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import type { GameState } from '../types/game';
import type { StoryEventId } from '../types/game';
import { DAYS_PER_GAME_MONTH, ELECTRICITY_RATE_PER_KWH, FACILITY_TIERS } from '../utils/constants';
import { universityLoanPflops, LOAN_TRIAL_DAYS, LOAN_MISUSE_TICKS } from '../utils/training';
import { LOAN_WARNING_DAY } from '../utils/storyEvents';
import { effectCollector } from './effects';
import { tr } from '../i18n';

// One tick of the calendar: half an hour passes, days and months roll over, the university loan is
// audited at the end of its trial week, and the monthly bill is paid when a month ends.
export interface CalendarInput {
  prev: GameState;
  credits: number;
  utilityDebt: number;
  effectivePowerKw: number;
}

export function calendarTick(input: CalendarInput) {
  const { prev, effectivePowerKw } = input;
  let { credits, utilityDebt } = input;
  const { effects, log: addLog } = effectCollector();
  // 48 ticks represent one in-game day; monthly bills settle every 30 days.
  const currentDayTicks = (prev.dayTicks || 0) + 1;
  const dayIsComplete = currentDayTicks >= 48;
  const campaignDays = prev.campaignDays + (dayIsComplete ? 1 : 0);
  // University loan audit: at the end of the trial week, access is revoked (and misuse is reported).
  const loanActive = universityLoanPflops(prev) > 0;
  const loanAuditDue = loanActive && !prev.loanAudited && campaignDays >= LOAN_TRIAL_DAYS;
  const loanTrainingTicks = (prev.loanTrainingTicks ?? 0) + (loanActive && prev.activeTraining ? 1 : 0);
  const loanMisuse = loanTrainingTicks >= LOAN_MISUSE_TICKS;
  const storyEvents: StoryEventId[] = [];
  if (loanActive && !prev.loanAudited && campaignDays === LOAN_WARNING_DAY) {
    storyEvents.push('loan_warning');
  }
  if (loanAuditDue) {
    storyEvents.push(loanMisuse ? 'loan_audit_misuse' : 'loan_audit');
    addLog(
      prev.language === "es"
        ? (loanMisuse
          ? "[AUDITORÍA UNIVERSITARIA] Uso desmedido del préstamo de cómputo detectado durante la semana de prueba. Acceso revocado."
          : "[AUDITORÍA UNIVERSITARIA] Fin de la semana de prueba gratuita. Acceso al clúster universitario revocado.")
        : (loanMisuse
          ? "[UNIVERSITY AUDIT] Excessive use of the compute loan detected during the trial week. Access revoked."
          : "[UNIVERSITY AUDIT] Free trial week ended. University cluster access revoked."),
      "danger"
    );
  }
  const nextDayTicks = dayIsComplete ? 0 : currentDayTicks;
  const nextHour = Math.floor(nextDayTicks / 2);
  const nextMinute = (nextDayTicks % 2) * 30;

  let nextDay = prev.gameDay || 1;
  let nextMonth = prev.gameMonth || 1;
  let nextYear = prev.gameYear || 2026;
  let monthIsComplete = false;

  if (dayIsComplete) {
    if (nextDay >= DAYS_PER_GAME_MONTH) {
      nextDay = 1;
      monthIsComplete = true;
      if (nextMonth >= 12) {
        nextMonth = 1;
        nextYear += 1;
      } else {
        nextMonth += 1;
      }
    } else {
      nextDay += 1;
    }
  }

  // Monthly billing triggers only when the calendar rolls into a new month.
  if (monthIsComplete) {
    const facility = FACILITY_TIERS[prev.facilityTier] || FACILITY_TIERS[0];
    const currentMonthBill = effectivePowerKw * ELECTRICITY_RATE_PER_KWH * 720 + facility.monthlyLeaseCost;
    const totalDue = utilityDebt + currentMonthBill;
    const paid = Math.min(credits, totalDue);
    credits -= paid;
    utilityDebt = Number((totalDue - paid).toFixed(2));
    addLog(
      utilityDebt > 0
        ? (tr(prev.language, 'calendarTick.unpaidBillMonthDayCr', { gameMonth: prev.gameMonth || 1, gameDay: prev.gameDay || 1, utilityDebt: utilityDebt.toLocaleString() }))
        : (tr(prev.language, 'calendarTick.monthDayBillPaidCr', { gameMonth: prev.gameMonth || 1, gameDay: prev.gameDay || 1, currentMonthBill: currentMonthBill.toFixed(2), monthlyLeaseCost: facility.monthlyLeaseCost, eLECTRICITY_RATE_PER_KWH: (effectivePowerKw * ELECTRICITY_RATE_PER_KWH * 720).toFixed(2) })),
      utilityDebt > 0 ? 'danger' : 'info'
    );
  }


  return {
    credits,
    utilityDebt,
    dayIsComplete,
    campaignDays,
    loanAuditDue,
    loanTrainingTicks,
    storyEvents,
    nextDayTicks,
    nextHour,
    nextMinute,
    nextDay,
    nextMonth,
    nextYear,
    effects
  };
}
