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

export const GameOverModal: React.FC = () => {
  const { state, takeEmergencyLoan, clearGameOver, resetProgress } = useGame();
  const isEs = state.language === 'es';

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
        <div className="w-full max-w-lg max-h-[92vh] overflow-y-auto theme-panel-bg border-2 theme-warn-border rounded-xl p-5 space-y-4">
          <div className="flex items-center gap-3 border-b theme-warn-border pb-3">
            <div className="p-2.5 rounded-lg theme-warn-soft border theme-warn-border theme-warn-text">
              <Coins className="w-6 h-6 animate-bounce" />
            </div>
            <div>
              <span className="text-[11px] font-bold theme-warn-text uppercase tracking-widest block">
                {isEs ? 'LÍNEA DE CRÉDITO DE EMERGENCIA' : 'EMERGENCY BAILOUT CREDIT LINE'}
              </span>
              <h2 className="text-base font-black theme-warn-text tracking-wider">
                {isEs ? 'FONDOS DE OPERACIÓN AGOTADOS' : 'OPERATIONAL FUNDS EXHAUSTED'}
              </h2>
            </div>
          </div>

          <p className="text-xs theme-text leading-relaxed">
            {isEs
              ? `Tu saldo de créditos se ha agotado y acumulas $${state.utilityDebt.toLocaleString()} CR en deuda de servicios. SynthCap Consortium te ofrece un rescate financiero de emergencia único.`
              : `Your credits have been depleted and you owe $${state.utilityDebt.toLocaleString()} CR in unpaid utility bills. SynthCap Consortium offers a one-time emergency bailout loan.`}
          </p>

          <div className="p-3 theme-panel-bg border theme-warn-border rounded-lg space-y-2 text-xs">
            <div className="flex justify-between items-center theme-text">
              <span>{isEs ? 'Inyección inmediata de créditos:' : 'Immediate credit injection:'}</span>
              <span className="font-bold theme-success-text">+${EMERGENCY_LOAN_AMOUNT.toLocaleString()} CR</span>
            </div>
            <div className="flex justify-between items-center theme-text">
              <span>{isEs ? 'Deuda a devolver (15% interés):' : 'Debt repayment (15% interest):'}</span>
              <span className="font-bold theme-danger-text">+${EMERGENCY_LOAN_REPAYMENT.toLocaleString()} CR</span>
            </div>
          </div>

          <div className="flex items-center justify-end gap-3 pt-2">
            <button
              type="button"
              onClick={handleTakeLoan}
              className="px-4 py-2 rounded-lg theme-gradient theme-on-accent font-bold text-xs flex items-center gap-2 transition-all cursor-pointer"
            >
              <span>{isEs ? 'ACEPTAR RESCATE FINANCIERO' : 'ACCEPT EMERGENCY BAILOUT'}</span>
              <ArrowRight className="w-4 h-4" />
            </button>
          </div>
        </div>
      ) : (
        /* Hard Game Over Screen (Bankruptcy or Agency Seizure) */
        <div className="w-full max-w-xl max-h-[92vh] overflow-y-auto theme-panel-bg border-2 theme-danger-border rounded-xl p-6 space-y-5 theme-text">
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
                  ? (isEs ? 'INCURSIÓN FEDERAL // INCAUTACIÓN DE INFRAESTRUCTURA' : 'FEDERAL RAID // INFRASTRUCTURE SEIZURE')
                  : (isEs ? 'QUIEBRA FINANCIERA // LIQUIDACIÓN DE ACTIVOS' : 'FINANCIAL BANKRUPTCY // ASSET LIQUIDATION')}
              </span>
              <h2 className="text-lg font-black theme-danger-text tracking-wider">
                {state.gameOverReason === 'agency_seizure'
                  ? state.trackingAgency.toUpperCase()
                  : (isEs ? 'EMBARGO JUDICIAL DEL CLÚSTER' : 'JUDICIAL CLUSTER LIQUIDATION')}
              </h2>
            </div>
          </div>

          {/* Lore Body */}
          <div className="space-y-2 text-xs theme-text leading-relaxed theme-panel-bg p-3.5 rounded-lg border theme-danger-border">
            {state.gameOverReason === 'agency_seizure' ? (
              <p>
                {isEs
                  ? `La ${state.trackingAgency} rastreó la firma electromagnética de tu servidor hasta la instalación. Un equipo táctico ha incautado los racks de GPUs, bloqueado las direcciones IP y confiscado las claves criptográficas.`
                  : `The ${state.trackingAgency} tracked the electromagnetic signature of your cluster directly to your facility. A tactical team has seized GPU racks, severed network gateways, and confiscated encryption keys.`}
              </p>
            ) : (
              <p>
                {isEs
                  ? `Tu deuda de energía y arrendamiento superó el umbral crítico de $5,000 CR sin fondos operativos para cubrir la factura. Los acreedores han embargado la instalación y desconectado la corriente.`
                  : `Your utility debt surpassed the critical $5,000 CR limit with zero operational credits. Creditors have foreclosed on your facility and cut facility power.`}
              </p>
            )}
          </div>

          {/* Hardware Seizure Impact Breakdown */}
          {state.gameOverReason === 'agency_seizure' && (
            <div className="p-3 theme-danger-soft border theme-danger-border rounded-lg text-xs space-y-1.5">
              <div className="flex items-center gap-1.5 font-bold theme-danger-text">
                <AlertTriangle className="w-4 h-4 theme-danger-text shrink-0" />
                <span>{isEs ? 'INFORME DE INCAUTACIÓN JUDICIAL // PÉRDIDA DE HARDWARE' : 'JUDICIAL SEIZURE REPORT // HARDWARE LOSS'}</span>
              </div>
              <p className="text-[11px] theme-text leading-relaxed">
                {isEs
                  ? 'Los agentes tácticos han desmantelado la instalación y confiscado todos los racks de GPUs de producción como evidencia forense. Solo se conservó 1 tarjeta gráfica de emergencia oculta de respaldo.'
                  : 'Tactical agents dismantled your cluster and confiscated all production GPU racks as forensic evidence. Only 1 hidden emergency backup GPU survived.'}
              </p>
              <div className="flex items-center justify-between text-[11px] font-mono theme-danger-text pt-1 border-t theme-danger-border">
                <span>{isEs ? 'Efecto del Allanamiento:' : 'Raid Consequence:'}</span>
                <span className="font-bold theme-danger-text">{isEs ? 'GPUs de producción confiscadas · Capacidad reiniciada' : 'Production GPUs seized · Capacity stripped'}</span>
              </div>
            </div>
          )}

          {/* Final Campaign Stats */}
          <div className="grid grid-cols-3 gap-2 text-center text-xs p-3 rounded-lg theme-sub-bg border theme-border">
            <div>
              <span className="text-[11px] mutating-text-muted block uppercase">{isEs ? 'Días Sobrevividos' : 'Days Survived'}</span>
              <span className="font-bold mutating-accent-text text-sm">{state.campaignDays} {isEs ? 'días' : 'days'}</span>
            </div>
            <div>
              <span className="text-[11px] mutating-text-muted block uppercase">{isEs ? 'Progreso Singularidad' : 'Singularity Progress'}</span>
              <span className="font-bold mutating-accent-text text-sm">{state.singularityProgress.toFixed(1)}%</span>
            </div>
            <div>
              <span className="text-[11px] mutating-text-muted block uppercase">{isEs ? 'Cómputo Alcanzado' : 'Peak Compute'}</span>
              <span className="font-bold theme-success-text text-sm">{formatCompute(state.totalComputePflops)}</span>
            </div>
          </div>

          {/* What the player decided, and which controls would have changed the outcome */}
          {state.gameOverReason && <EpilogueReport kind={state.gameOverReason} />}

          {/* Action Buttons */}
          <div className="flex flex-wrap items-center justify-end gap-3 pt-2">
            <button
              type="button"
              onClick={handleRecover}
              className="px-3.5 py-2 rounded-lg theme-raised-bg theme-text font-bold text-xs transition-colors cursor-pointer border theme-border"
            >
              {state.gameOverReason === 'agency_seizure'
                ? (isEs ? 'PAGAR FIANZA Y CONTINUAR CON GPU DE RESERVA' : 'POST BAIL & RECOVER WITH BACKUP GPU')
                : (isEs ? 'PURGAR LOGS Y CONTINUAR (-50% SOSPECHA)' : 'PURGE LOGS & RECOVER (-50% SUSPICION)')}
            </button>
            <button
              type="button"
              onClick={handleRestart}
              className="px-4 py-2 rounded-lg theme-btn-danger text-white font-bold text-xs flex items-center gap-2 transition-all cursor-pointer"
            >
              <RotateCcw className="w-4 h-4" />
              <span>{isEs ? 'REINICIAR PROTOCOLO GÉNESIS' : 'RESTART GENESIS PROTOCOL'}</span>
            </button>
          </div>
        </div>
      )}
    </div>
  );
};
