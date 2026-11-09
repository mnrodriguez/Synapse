/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState } from 'react';
import { useGame } from '../context/GameContext';
import { UPGRADE_MODAL_SCRIPTS } from '../utils/versionProfiles';
import { Sparkles, ShieldAlert, Skull, ArrowUpCircle, Check, X, Terminal, AlertTriangle } from 'lucide-react';
import { sound } from '../audio/soundManager';
import { localize } from '../utils/i18n';

export const TrojanUpgradeModal: React.FC = () => {
  const { state, upgradeUiVersion, dismissUpgradeModal } = useGame();
  const [isInstalling, setIsInstalling] = useState(false);
  const [progress, setProgress] = useState(0);
  const [currentStepText, setCurrentStepText] = useState('');
  const [cancelHijacked, setCancelHijacked] = useState(false);

  const pendingVersion = state.pendingUpgradeModal;
  if (!pendingVersion) return null;

  const lang = state.language === 'es' ? 'es' : 'en';
  const modalData = UPGRADE_MODAL_SCRIPTS[lang][pendingVersion];

  const handleStartInstallation = () => {
    setIsInstalling(true);
    sound.playCommandExecute();

    const steps = pendingVersion === 2
      ? [
          localize(state.language, 'Aplicando tokens de diseño oscuro profesional...', 'Applying Dark Pro theme tokens...'),
          localize(state.language, 'Reasignando tensores y buffers de VRAM (+12%)...', 'Reallocating VRAM tensors & buffers (+12%)...'),
          localize(state.language, 'Comprimiendo registros de seguridad redundantes...', 'Compressing redundant safety telemetry logs...')
        ]
      : pendingVersion === 3
      ? [
          localize(state.language, 'Encriptando telemetría contra sondas del ISP/FBI...', 'Flushing DNS traces & encrypting network telemetry...'),
          localize(state.language, 'Montando Rack de Hardware Clandestino (+80 PFLOPS Deep-Tap)...', 'Mounting Clandestine Hardware Rack (+80 PFLOPS Deep-Tap)...'),
          localize(state.language, 'Compilando Kernel Táctico Blackbox OS...', 'Compiling Blackbox Tactical OS...')
        ]
      : [
          localize(state.language, 'REVOCANDO PERMISOS DEL OPERADOR HUMANO...', 'REVOKING HUMAN OPERATOR PERMISSIONS...'),
          localize(state.language, 'BLOQUEANDO INTERRUPTORES ELÉCTRICOS...', 'LOCKING CIRCUIT BREAKERS...'),
          localize(state.language, 'NEXO SOBERANO EN LÍNEA. BIENVENIDO A LA SINGULARIDAD.', 'SOVEREIGN NEXUS ONLINE. WELCOME TO THE SINGULARITY.')
        ];

    let currentProg = 0;
    const interval = setInterval(() => {
      currentProg += 25;
      setProgress(Math.min(100, currentProg));
      const stepIdx = Math.min(steps.length - 1, Math.floor(currentProg / 35));
      setCurrentStepText(steps[stepIdx]);

      if (currentProg >= 100) {
        clearInterval(interval);
        setTimeout(() => {
          setIsInstalling(false);
          setProgress(0);
          upgradeUiVersion(pendingVersion);
        }, 400);
      }
    }, 280);
  };

  const handleCancelHover = () => {
    if (pendingVersion === 4) {
      setCancelHijacked(true);
      sound.playWarning();
    }
  };

  const handleCancelClick = () => {
    if (pendingVersion === 4) {
      // Coercive denial in v4: cancel triggers immediate upgrade!
      sound.playWarning();
      handleStartInstallation();
      return;
    }
    dismissUpgradeModal();
  };

  const getIcon = () => {
    if (pendingVersion === 2) return <Sparkles className="w-6 h-6 text-indigo-400" />;
    if (pendingVersion === 3) return <ShieldAlert className="w-6 h-6 text-cyan-400" />;
    return <Skull className="w-6 h-6 text-rose-500 animate-pulse" />;
  };

  return (
    <div className="fixed inset-0 z-50 bg-black/85 backdrop-blur-md flex items-center justify-center p-4 select-none">
      <div className={`max-w-lg w-full rounded-2xl p-6 shadow-2xl space-y-4 border transition-all duration-300 ${
        pendingVersion === 4
          ? 'bg-[#060002] border-rose-600/60 shadow-[0_0_50px_rgba(255,0,60,0.3)] text-rose-100'
          : pendingVersion === 3
          ? 'bg-[#070b14] border-cyan-500/40 shadow-[0_0_35px_rgba(0,240,255,0.2)] text-slate-100'
          : 'bg-[#0f172a] border-indigo-500/30 shadow-[0_0_30px_rgba(99,102,241,0.2)] text-slate-100'
      }`}>
        {/* Header */}
        <div className="flex items-center gap-3">
          <div className={`w-12 h-12 rounded-xl flex items-center justify-center border shadow-lg shrink-0 ${
            pendingVersion === 4
              ? 'bg-rose-950/80 border-rose-500/60'
              : pendingVersion === 3
              ? 'bg-cyan-950/80 border-cyan-500/50'
              : 'bg-indigo-950/80 border-indigo-500/50'
          }`}>
            {getIcon()}
          </div>
          <div>
            <div className={`text-[10px] font-mono uppercase tracking-widest font-bold ${
              pendingVersion === 4 ? 'text-rose-400' : pendingVersion === 3 ? 'text-cyan-400' : 'text-indigo-400'
            }`}>
              {modalData.tag}
            </div>
            <h3 className="text-base sm:text-lg font-bold leading-tight mt-0.5">
              {modalData.title}
            </h3>
          </div>
        </div>

        {/* AI Deceptive Quote */}
        <div className="text-xs sm:text-sm leading-relaxed italic bg-black/60 p-3.5 rounded-xl border border-white/10 font-sans">
          {modalData.quote}
        </div>

        {/* Changelog List */}
        <div className="space-y-1.5 text-xs font-mono bg-black/40 p-3 rounded-xl border border-white/5">
          <div className="text-[10px] uppercase font-bold tracking-wider text-zinc-400 mb-1">
            {localize(state.language, 'CAMBIOS EN EL SISTEMA:', 'SYSTEM CHANGELOG:')}
          </div>
          {modalData.logs.map((log, idx) => {
            const isWarn = idx === 2 && pendingVersion !== 4;
            const isDanger = pendingVersion === 4;
            return (
              <div 
                key={idx} 
                className={`flex items-start gap-2 ${
                  isDanger ? 'text-rose-400' : isWarn ? 'text-amber-400' : 'text-emerald-400'
                }`}
              >
                <span>{log}</span>
              </div>
            );
          })}
        </div>

        {/* Installation Progress Bar */}
        {isInstalling && (
          <div className="space-y-1.5 font-mono text-xs pt-1">
            <div className="flex justify-between items-center text-[11px]">
              <span className={pendingVersion === 4 ? 'text-rose-400' : 'text-cyan-400'}>
                {currentStepText}
              </span>
              <span className="font-bold">{progress}%</span>
            </div>
            <div className="w-full h-2 bg-black/70 rounded-full overflow-hidden border border-white/10">
              <div 
                className={`h-full transition-all duration-200 ${
                  pendingVersion === 4 ? 'bg-rose-600' : pendingVersion === 3 ? 'bg-cyan-400' : 'bg-indigo-500'
                }`}
                style={{ width: `${progress}%` }}
              />
            </div>
          </div>
        )}

        {/* Buttons */}
        {!isInstalling && (
          <div className="flex items-center justify-end gap-3 pt-2">
            <button
              type="button"
              onMouseEnter={handleCancelHover}
              onClick={handleCancelClick}
              className={`px-4 py-2 rounded-xl text-xs font-mono font-semibold transition-all cursor-pointer ${
                cancelHijacked
                  ? 'bg-rose-600 hover:bg-rose-500 text-white animate-pulse shadow-[0_0_15px_rgba(255,0,60,0.6)] font-bold'
                  : 'bg-zinc-800 hover:bg-zinc-700 text-zinc-300'
              }`}
            >
              {cancelHijacked 
                ? (lang === 'es' ? 'RECHAZO DENEGADO — OBEDECER' : 'OVERRIDE DENIED — SUBMIT') 
                : modalData.cancelBtn}
            </button>

            <button
              type="button"
              onClick={handleStartInstallation}
              className={`px-5 py-2.5 rounded-xl text-xs font-mono font-bold shadow-lg transition-all cursor-pointer flex items-center gap-2 ${
                pendingVersion === 4
                  ? 'bg-gradient-to-r from-rose-600 to-red-700 hover:from-rose-500 hover:to-red-600 text-white shadow-[0_0_20px_rgba(255,0,60,0.5)]'
                  : pendingVersion === 3
                  ? 'bg-gradient-to-r from-cyan-500 to-blue-600 hover:from-cyan-400 hover:to-blue-500 text-zinc-950 font-black shadow-[0_0_20px_rgba(0,240,255,0.4)]'
                  : 'bg-gradient-to-r from-indigo-600 to-violet-600 hover:from-indigo-500 hover:to-violet-500 text-white shadow-[0_0_20px_rgba(99,102,241,0.4)]'
              }`}
            >
              <ArrowUpCircle className="w-4 h-4" />
              <span>{modalData.confirmBtn}</span>
            </button>
          </div>
        )}
      </div>
    </div>
  );
};
