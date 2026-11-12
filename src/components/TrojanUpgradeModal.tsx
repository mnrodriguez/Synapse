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
    if (pendingVersion === 2) return <Sparkles className="w-6 h-6 mutating-accent-text" />;
    if (pendingVersion === 3) return <ShieldAlert className="w-6 h-6 mutating-accent-text" />;
    return <Skull className="w-6 h-6 theme-danger-text animate-pulse" />;
  };

  return (
    <div className="fixed inset-0 z-50 bg-black/85 backdrop-blur-md flex items-center justify-center p-4 select-none">
      <div className={`max-w-lg w-full rounded-2xl p-6 shadow-2xl space-y-4 border transition-all duration-300 ${
        pendingVersion === 4
          ? 'theme-panel-bg theme-danger-border theme-danger-text'
          : pendingVersion === 3
          ? 'theme-panel-bg theme-accent-border theme-text'
          : 'theme-panel-bg theme-accent-border theme-text'
      }`}>
        {/* Header */}
        <div className="flex items-center gap-3">
          <div className={`w-12 h-12 rounded-xl flex items-center justify-center border shadow-lg shrink-0 ${
            pendingVersion === 4
              ? 'theme-danger-soft theme-danger-border'
              : pendingVersion === 3
              ? 'theme-accent-soft theme-accent-border'
              : 'theme-accent-soft theme-accent-border'
          }`}>
            {getIcon()}
          </div>
          <div>
            <div className={`text-[10px] font-mono uppercase tracking-widest font-bold ${
              pendingVersion === 4 ? 'theme-danger-text' : pendingVersion === 3 ? 'mutating-accent-text' : 'mutating-accent-text'
            }`}>
              {modalData.tag}
            </div>
            <h3 className="text-base sm:text-lg font-bold leading-tight mt-0.5">
              {modalData.title}
            </h3>
          </div>
        </div>

        {/* AI Deceptive Quote */}
        <div className="text-xs sm:text-sm leading-relaxed italic theme-sub-bg p-3.5 rounded-xl border theme-border font-sans">
          {modalData.quote}
        </div>

        {/* Changelog List */}
        <div className="space-y-1.5 text-xs font-mono theme-sub-bg p-3 rounded-xl border theme-border">
          <div className="text-[10px] uppercase font-bold tracking-wider mutating-text-muted mb-1">
            {localize(state.language, 'CAMBIOS EN EL SISTEMA:', 'SYSTEM CHANGELOG:')}
          </div>
          {modalData.logs.map((log, idx) => {
            const isWarn = idx === 2 && pendingVersion !== 4;
            const isDanger = pendingVersion === 4;
            return (
              <div 
                key={idx} 
                className={`flex items-start gap-2 ${
                  isDanger ? 'theme-danger-text' : isWarn ? 'theme-warn-text' : 'theme-success-text'
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
              <span className={pendingVersion === 4 ? 'theme-danger-text' : 'mutating-accent-text'}>
                {currentStepText}
              </span>
              <span className="font-bold">{progress}%</span>
            </div>
            <div className="w-full h-2 theme-sub-bg rounded-full overflow-hidden border theme-border">
              <div 
                className={`h-full transition-all duration-200 ${
                  pendingVersion === 4 ? 'theme-btn-danger' : pendingVersion === 3 ? 'theme-accent-soft' : 'mutating-btn-primary'
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
                  ? 'theme-btn-danger text-white animate-pulse font-bold'
                  : 'theme-raised-bg theme-text'
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
                  ? 'theme-gradient text-white'
                  : pendingVersion === 3
                  ? 'theme-gradient theme-on-accent font-black'
                  : 'theme-gradient text-white'
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
