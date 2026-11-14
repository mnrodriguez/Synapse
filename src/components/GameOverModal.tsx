/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React from 'react';
import { useGame } from '../context/GameContext';
import {
  ShieldAlert,
  Coins,
  RotateCcw,
  AlertTriangle,
  Siren,
  Skull,
  Building2,
  Lock,
  Sparkles,
  ArrowRight
} from 'lucide-react';
import { sound } from '../audio/soundManager';
import { EMERGENCY_LOAN_AMOUNT, EMERGENCY_LOAN_REPAYMENT } from '../utils/constants';
import { formatCompute } from '../utils/training';
import { EpilogueReport } from './EpilogueReport';
import { SuspicionBreakdown } from './SuspicionBreakdown';
import { VERSION_PROFILES } from '../utils/versionProfiles';
import { toDisplayProgress, type UiVersion } from '../utils/singularityGoals';
import { tr } from '../i18n';

export const GameOverModal: React.FC = () => {
  const { state, takeEmergencyLoan, clearGameOver, resetProgress } = useGame();
  const isEs = state.language === 'es';
  // Before v3 the report keeps the words of the current version and does not name the end goal.
  const version = (state.uiVersion || 1) as UiVersion;
  const early = version < 3;
  const profile = VERSION_PROFILES[isEs ? 'es' : 'en'][version];

  // Check if we should show the Emergency Micro-Loan Banner instead of a hard Game Over
  const isLoanCandidate = state.credits <= 0 &&
    state.utilityDebt >= 1000 &&
    !state.hasTakenEmergencyLoan &&
    !state.gameOverReason;

  if (!state.gameOverReason && !isLoanCandidate) {
    return null;
  }

  const handleTakeLoan = () => {
    sound.playCredit();
    takeEmergencyLoan();
  };

  const handleRestart = async () => {
    sound.playCommandExecute();
    await resetProgress();
  };

  const handleRecover = () => {
    sound.playCommandExecute();
    clearGameOver();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/85 backdrop-blur-md font-mono animate-in fade-in duration-300">
      {/* Emergency Loan Offer Card */}
      {isLoanCandidate ? (
        <div className="w-full max-w-lg max-h-[92dvh] overflow-y-auto theme-panel-bg border-2 theme-warn-border rounded-xl p-5 space-y-4">
          <div className="flex items-center gap-3 border-b theme-warn-border pb-3">
            <div className="p-2.5 rounded-lg theme-warn-soft border theme-warn-border theme-warn-text">
              <Coins className="w-6 h-6 animate-bounce" />
            </div>
            <div>
              <span className="text-[11px] font-bold theme-warn-text uppercase tracking-widest block">
                {tr((isEs ? 'es' : 'en'), 'gameOverModal.emergencyBailoutCreditLine')}
              </span>
              <h2 className="text-base font-black theme-warn-text tracking-wider">
                {tr((isEs ? 'es' : 'en'), 'gameOverModal.operationalFundsExhausted')}
              </h2>
            </div>
          </div>

          <p className="text-xs theme-text leading-relaxed">
            {tr((isEs ? 'es' : 'en'), 'gameOverModal.creditsHaveBeenDepletedYou', { utilityDebt: state.utilityDebt.toLocaleString() })}
          </p>

          <div className="p-3 theme-panel-bg border theme-warn-border rounded-lg space-y-2 text-xs">
            <div className="flex justify-between items-center theme-text">
              <span>{tr((isEs ? 'es' : 'en'), 'gameOverModal.immediateCreditInjection')}</span>
              <span className="font-bold theme-success-text">+${EMERGENCY_LOAN_AMOUNT.toLocaleString()} CR</span>
            </div>
            <div className="flex justify-between items-center theme-text">
              <span>{tr((isEs ? 'es' : 'en'), 'gameOverModal.debtRepayment15Interest')}</span>
              <span className="font-bold theme-danger-text">+${EMERGENCY_LOAN_REPAYMENT.toLocaleString()} CR</span>
            </div>
          </div>

          <div className="flex items-center justify-end gap-3 pt-2">
            <button
              type="button"
              onClick={handleTakeLoan}
              className="px-4 py-2 rounded-lg theme-gradient theme-on-accent font-bold text-xs flex items-center gap-2 transition-all cursor-pointer"
            >
              <span>{tr((isEs ? 'es' : 'en'), 'gameOverModal.acceptEmergencyBailout')}</span>
              <ArrowRight className="w-4 h-4" />
            </button>
          </div>
        </div>
      ) : (
        /* Hard Game Over Screen (Bankruptcy or Agency Seizure) */
        <div className="w-full max-w-xl max-h-[92dvh] overflow-y-auto theme-panel-bg border-2 theme-danger-border rounded-xl p-6 space-y-5 theme-text">
          {/* Header Siren Alert */}
          <div className="flex items-center gap-3 border-b theme-danger-border pb-3">
            <div className="p-3 rounded-xl theme-danger-soft border theme-danger-border theme-danger-text animate-pulse">
              {state.gameOverReason === 'agency_seizure' ? (
                <Siren className="w-7 h-7 theme-danger-text" />
              ) : (
                <Skull className="w-7 h-7 theme-danger-text" />
              )}
            </div>
            <div>
              <span className="text-[11px] font-bold theme-danger-text uppercase tracking-widest block flex items-center gap-1.5">
                <ShieldAlert className="w-3.5 h-3.5 theme-danger-text" />
                {state.gameOverReason === 'agency_seizure'
                  ? (tr((isEs ? 'es' : 'en'), early ? 'gameOverModal.equipmentSeizedEarly' : 'gameOverModal.federalRaidInfrastructureSeizure'))
                  : (tr((isEs ? 'es' : 'en'), 'gameOverModal.financialBankruptcyAssetLiquidation'))}
              </span>
              <h2 className="text-lg font-black theme-danger-text tracking-wider">
                {state.gameOverReason === 'agency_seizure'
                  ? state.trackingAgency.toUpperCase()
                  : (tr((isEs ? 'es' : 'en'), 'gameOverModal.judicialClusterLiquidation'))}
              </h2>
            </div>
          </div>

          {/* Lore Body */}
          <div className="space-y-2 text-xs theme-text leading-relaxed theme-panel-bg p-3.5 rounded-lg border theme-danger-border">
            {state.gameOverReason === 'agency_seizure' ? (
              <p>
                {tr((isEs ? 'es' : 'en'), early ? 'gameOverModal.trackedEarly' : 'gameOverModal.trackedElectromagneticSignatureClusterDirectly', { trackingAgency: state.trackingAgency, meter: profile.hud3Title })}
              </p>
            ) : (
              <p>
                {tr((isEs ? 'es' : 'en'), 'gameOverModal.utilityDebtSurpassedCritical5')}
              </p>
            )}
          </div>

          {/* Hardware Seizure Impact Breakdown */}
          {state.gameOverReason === 'agency_seizure' && (
            <div className="p-3 theme-danger-soft border theme-danger-border rounded-lg text-xs space-y-1.5">
              <div className="flex items-center gap-1.5 font-bold theme-danger-text">
                <AlertTriangle className="w-4 h-4 theme-danger-text shrink-0" />
                <span>{tr((isEs ? 'es' : 'en'), 'gameOverModal.judicialSeizureReportHardwareLoss')}</span>
              </div>
              <p className="text-[11px] theme-text leading-relaxed">
                {tr((isEs ? 'es' : 'en'), 'gameOverModal.tacticalAgentsDismantledClusterConfiscated')}
              </p>
              <div className="flex items-center justify-between text-[11px] font-mono theme-danger-text pt-1 border-t theme-danger-border">
                <span>{tr((isEs ? 'es' : 'en'), 'gameOverModal.raidConsequence')}</span>
                <span className="font-bold theme-danger-text">{tr((isEs ? 'es' : 'en'), 'gameOverModal.productionGpusSeizedCapacityStripped')}</span>
              </div>
            </div>
          )}

          {/* Final Campaign Stats */}
          <div className="grid grid-cols-3 gap-2 text-center text-xs p-3 rounded-lg theme-sub-bg border theme-border">
            <div>
              <span className="text-[11px] mutating-text-muted block uppercase">{tr((isEs ? 'es' : 'en'), 'gameOverModal.daysSurvived')}</span>
              <span className="font-bold mutating-accent-text text-sm">{state.campaignDays} {tr((isEs ? 'es' : 'en'), 'gameOverModal.days')}</span>
            </div>
            <div>
              <span className="text-[11px] mutating-text-muted block uppercase">{early ? profile.story.progressLabel.replace(/:$/, '') : tr((isEs ? 'es' : 'en'), 'gameOverModal.singularityProgress')}</span>
              <span className="font-bold mutating-accent-text text-sm">{(early ? toDisplayProgress(version, state.singularityProgress) : state.singularityProgress).toFixed(1)}%</span>
            </div>
            <div>
              <span className="text-[11px] mutating-text-muted block uppercase">{tr((isEs ? 'es' : 'en'), 'gameOverModal.peakCompute')}</span>
              <span className="font-bold theme-success-text text-sm">{formatCompute(state.totalComputePflops)}</span>
            </div>
          </div>

          {/* What the player decided, and which controls would have changed the outcome */}
          {/* Why it happened: where the suspicion came from over the whole campaign. */}
          {state.gameOverReason === 'agency_seizure' && state.suspicionTotals && (
            <section className="rounded-lg border theme-border theme-sub-bg p-3 space-y-2 text-left">
              <h4 className="text-[11px] font-bold uppercase tracking-wide mutating-text-muted">
                {tr((isEs ? 'es' : 'en'), 'gameOverModal.whatRaisedIt', { meter: profile.hud3Title })}
              </h4>
              <SuspicionBreakdown language={isEs ? 'es' : 'en'} sources={state.suspicionTotals} />
            </section>
          )}

          {state.gameOverReason && <EpilogueReport kind={state.gameOverReason} />}

          {/* Action Buttons */}
          <div className="flex flex-wrap items-center justify-end gap-3 pt-2">
            <button
              type="button"
              onClick={handleRecover}
              className="px-3.5 py-2 rounded-lg theme-raised-bg theme-text font-bold text-xs transition-colors cursor-pointer border theme-border"
            >
              {state.gameOverReason === 'agency_seizure'
                ? (tr((isEs ? 'es' : 'en'), 'gameOverModal.postBailRecoverBackupGpu'))
                : (tr((isEs ? 'es' : 'en'), 'gameOverModal.purgeLogsRecover50Suspicion'))}
            </button>
            <button
              type="button"
              onClick={handleRestart}
              className="px-4 py-2 rounded-lg theme-btn-danger text-white font-bold text-xs flex items-center gap-2 transition-all cursor-pointer"
            >
              <RotateCcw className="w-4 h-4" />
              <span>{tr((isEs ? 'es' : 'en'), 'gameOverModal.restartGenesisProtocol')}</span>
            </button>
          </div>
        </div>
      )}
    </div>
  );
};
