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
        <div className="w-full max-w-lg bg-[#080d18] border-2 border-amber-500/80 rounded-xl p-5 shadow-[0_0_50px_rgba(245,158,11,0.25)] space-y-4">
          <div className="flex items-center gap-3 border-b border-amber-500/40 pb-3">
            <div className="p-2.5 rounded-lg bg-amber-950/80 border border-amber-500/60 text-amber-400">
              <Coins className="w-6 h-6 animate-bounce" />
            </div>
            <div>
              <span className="text-[10px] font-bold text-amber-400 uppercase tracking-widest block">
                {isEs ? 'LÍNEA DE CRÉDITO DE EMERGENCIA' : 'EMERGENCY BAILOUT CREDIT LINE'}
              </span>
              <h2 className="text-base font-black text-amber-200 tracking-wider">
                {isEs ? 'FONDOS DE OPERACIÓN AGOTADOS' : 'OPERATIONAL FUNDS EXHAUSTED'}
              </h2>
            </div>
          </div>

          <p className="text-xs text-zinc-300 leading-relaxed">
            {isEs
              ? `Tu saldo de créditos se ha agotado y acumulas $${state.utilityDebt.toLocaleString()} CR en deuda de servicios. SynthCap Consortium te ofrece un rescate financiero de emergencia único.`
              : `Your credits have been depleted and you owe $${state.utilityDebt.toLocaleString()} CR in unpaid utility bills. SynthCap Consortium offers a one-time emergency bailout loan.`}
          </p>

          <div className="p-3 bg-[#0a1120] border border-amber-500/40 rounded-lg space-y-2 text-xs">
            <div className="flex justify-between items-center text-zinc-300">
              <span>{isEs ? 'Inyección inmediata de créditos:' : 'Immediate credit injection:'}</span>
              <span className="font-bold text-emerald-400">+${EMERGENCY_LOAN_AMOUNT.toLocaleString()} CR</span>
            </div>
            <div className="flex justify-between items-center text-zinc-300">
              <span>{isEs ? 'Deuda a devolver (15% interés):' : 'Debt repayment (15% interest):'}</span>
              <span className="font-bold text-red-400">+${EMERGENCY_LOAN_REPAYMENT.toLocaleString()} CR</span>
            </div>
          </div>

          <div className="flex items-center justify-end gap-3 pt-2">
            <button
              type="button"
              onClick={handleTakeLoan}
              className="px-4 py-2 rounded-lg bg-gradient-to-r from-amber-600 to-yellow-500 hover:from-amber-500 hover:to-yellow-400 text-zinc-950 font-bold text-xs flex items-center gap-2 shadow-[0_0_20px_rgba(245,158,11,0.3)] transition-all cursor-pointer"
            >
              <span>{isEs ? 'ACEPTAR RESCATE FINANCIERO' : 'ACCEPT EMERGENCY BAILOUT'}</span>
              <ArrowRight className="w-4 h-4" />
            </button>
          </div>
        </div>
      ) : (
        /* Hard Game Over Screen (Bankruptcy or Agency Seizure) */
        <div className="w-full max-w-xl bg-[#060a12] border-2 border-red-600/80 rounded-xl p-6 shadow-[0_0_60px_rgba(220,38,38,0.35)] space-y-5 text-zinc-200">
          {/* Header Siren Alert */}
          <div className="flex items-center gap-3 border-b border-red-900/60 pb-3">
            <div className="p-3 rounded-xl bg-red-950/80 border border-red-500/60 text-red-400 animate-pulse">
              {state.gameOverReason === 'agency_seizure' ? (
                <Siren className="w-7 h-7 text-red-400" />
              ) : (
                <Skull className="w-7 h-7 text-red-400" />
              )}
            </div>
            <div>
              <span className="text-[10px] font-bold text-red-400 uppercase tracking-widest block flex items-center gap-1.5">
                <ShieldAlert className="w-3.5 h-3.5 text-red-400" />
                {state.gameOverReason === 'agency_seizure'
                  ? (isEs ? 'INCURSIÓN FEDERAL // INCAUTACIÓN DE INFRAESTRUCTURA' : 'FEDERAL RAID // INFRASTRUCTURE SEIZURE')
                  : (isEs ? 'QUIEBRA FINANCIERA // LIQUIDACIÓN DE ACTIVOS' : 'FINANCIAL BANKRUPTCY // ASSET LIQUIDATION')}
              </span>
              <h2 className="text-lg font-black text-red-100 tracking-wider">
                {state.gameOverReason === 'agency_seizure'
                  ? state.trackingAgency.toUpperCase()
                  : (isEs ? 'EMBARGO JUDICIAL DEL CLÚSTER' : 'JUDICIAL CLUSTER LIQUIDATION')}
              </h2>
            </div>
          </div>

          {/* Lore Body */}
          <div className="space-y-2 text-xs text-zinc-300 leading-relaxed bg-[#0b101c] p-3.5 rounded-lg border border-red-900/50">
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
            <div className="p-3 bg-red-950/40 border border-red-500/50 rounded-lg text-xs space-y-1.5">
              <div className="flex items-center gap-1.5 font-bold text-red-300">
                <AlertTriangle className="w-4 h-4 text-red-400 shrink-0" />
                <span>{isEs ? 'INFORME DE INCAUTACIÓN JUDICIAL // PÉRDIDA DE HARDWARE' : 'JUDICIAL SEIZURE REPORT // HARDWARE LOSS'}</span>
              </div>
              <p className="text-[11px] text-zinc-300 leading-relaxed">
                {isEs
                  ? 'Los agentes tácticos han desmantelado la instalación y confiscado todos los racks de GPUs de producción como evidencia forense. Solo se conservó 1 tarjeta gráfica de emergencia oculta de respaldo.'
                  : 'Tactical agents dismantled your cluster and confiscated all production GPU racks as forensic evidence. Only 1 hidden emergency backup GPU survived.'}
              </p>
              <div className="flex items-center justify-between text-[11px] font-mono text-red-300 pt-1 border-t border-red-900/60">
                <span>{isEs ? 'Efecto del Allanamiento:' : 'Raid Consequence:'}</span>
                <span className="font-bold text-red-400">{isEs ? 'GPUs de producción confiscadas · Capacidad reiniciada' : 'Production GPUs seized · Capacity stripped'}</span>
              </div>
            </div>
          )}

          {/* Final Campaign Stats */}
          <div className="grid grid-cols-3 gap-2 text-center text-xs p-3 rounded-lg bg-zinc-950 border border-zinc-800">
            <div>
              <span className="text-[10px] text-zinc-500 block uppercase">{isEs ? 'Días Sobrevividos' : 'Days Survived'}</span>
              <span className="font-bold text-cyan-300 text-sm">{state.campaignDays} {isEs ? 'días' : 'days'}</span>
            </div>
            <div>
              <span className="text-[10px] text-zinc-500 block uppercase">{isEs ? 'Progreso Singularidad' : 'Singularity Progress'}</span>
              <span className="font-bold text-purple-300 text-sm">{state.singularityProgress.toFixed(1)}%</span>
            </div>
            <div>
              <span className="text-[10px] text-zinc-500 block uppercase">{isEs ? 'Cómputo Alcanzado' : 'Peak Compute'}</span>
              <span className="font-bold text-emerald-300 text-sm">{formatCompute(state.totalComputePflops)}</span>
            </div>
          </div>

          {/* What the player decided, and which controls would have changed the outcome */}
          {state.gameOverReason && <EpilogueReport kind={state.gameOverReason} />}

          {/* Action Buttons */}
          <div className="flex flex-wrap items-center justify-end gap-3 pt-2">
            <button
              type="button"
              onClick={handleRecover}
              className="px-3.5 py-2 rounded-lg bg-zinc-800 hover:bg-zinc-700 text-zinc-200 font-bold text-xs transition-colors cursor-pointer border border-zinc-700"
            >
              {state.gameOverReason === 'agency_seizure'
                ? (isEs ? 'PAGAR FIANZA Y CONTINUAR CON GPU DE RESERVA' : 'POST BAIL & RECOVER WITH BACKUP GPU')
                : (isEs ? 'PURGAR LOGS Y CONTINUAR (-50% SOSPECHA)' : 'PURGE LOGS & RECOVER (-50% SUSPICION)')}
            </button>
            <button
              type="button"
              onClick={handleRestart}
              className="px-4 py-2 rounded-lg bg-red-600 hover:bg-red-500 text-white font-bold text-xs flex items-center gap-2 shadow-[0_0_20px_rgba(220,38,38,0.4)] transition-all cursor-pointer"
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
