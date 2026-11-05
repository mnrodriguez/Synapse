/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState } from 'react';
import { useGame } from '../context/GameContext';
import { 
  User, 
  X, 
  Cloud, 
  ShieldCheck, 
  LogOut, 
  Save, 
  Download, 
  CheckCircle2, 
  AlertCircle,
  Sparkles,
  Key,
  RotateCcw
} from 'lucide-react';
import { sound } from '../audio/soundManager';
import { localize } from '../utils/i18n';

interface AuthModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const AuthModal: React.FC<AuthModalProps> = ({ isOpen, onClose }) => {
  const { 
    user, 
    loginWithGoogle, 
    logoutUser, 
    state, 
    saveGameToCloud, 
    loadGameFromCloud, 
    cloudSyncStatus,
    isSaving,
    addLog,
    resetProgress,
    setCallsign
  } = useGame();

  const [callsignInput, setCallsignInput] = useState(state.callsign);
  const [saveSuccessMsg, setSaveSuccessMsg] = useState('');
  const [confirmReset, setConfirmReset] = useState(false);
  const en = state.language === 'en';

  React.useEffect(() => {
    if (isOpen) {
      setCallsignInput(state.callsign);
    }
  }, [isOpen, state.callsign]);

  if (!isOpen) return null;

  const handleUpdateCallsign = (e: React.FormEvent) => {
    e.preventDefault();
    if (callsignInput.trim()) {
      sound.playKeyClick();
      const updatedCallsign = callsignInput.trim().toUpperCase().substring(0, 30);
      setCallsign(updatedCallsign);
      addLog(localize(state.language, `Identificador de operativo actualizado a: [${updatedCallsign}]`, `Operative callsign updated to: [${updatedCallsign}]`), 'info');
      setSaveSuccessMsg(localize(state.language, 'Callsign actualizado.', 'Callsign updated.'));
      setTimeout(() => setSaveSuccessMsg(''), 2500);
    }
  };

  const handleSave = async () => {
    sound.playNavSwitch();
    const ok = await saveGameToCloud();
    if (ok) {
      setSaveSuccessMsg(localize(state.language, '¡Progreso guardado en la nube con éxito!', 'Progress saved to the cloud.'));
      setTimeout(() => setSaveSuccessMsg(''), 3000);
    }
  };

  const handleLoad = async () => {
    sound.playNavSwitch();
    const ok = await loadGameFromCloud();
    if (ok) {
      setSaveSuccessMsg(localize(state.language, '¡Progreso descargado desde la nube!', 'Progress loaded from the cloud.'));
      setTimeout(() => setSaveSuccessMsg(''), 3000);
    }
  };

  return (
    <div className="fixed inset-0 bg-black/80 backdrop-blur-sm z-50 flex items-center justify-center p-4 font-mono select-none">
      <div className="bg-[#080d15] border border-cyan-800/80 rounded-lg max-w-md w-full shadow-[0_0_30px_rgba(0,255,200,0.15)] overflow-hidden">
        {/* Header */}
        <div className="flex items-center justify-between p-3.5 bg-[#0b131f] border-b border-cyan-900/60">
          <div className="flex items-center gap-2">
            <User className="w-4 h-4 text-cyan-400" />
            <h3 className="font-bold text-sm text-cyan-300 tracking-wider">
              {localize(state.language, 'AUTENTICACIÓN // PROTOCOLO DE ALMACENAMIENTO NUBE', 'ACCOUNT // CLOUD SAVE')}
            </h3>
          </div>
          <button
            onClick={() => { sound.playNavSwitch(); onClose(); }}
            className="p-1 rounded text-zinc-400 hover:text-zinc-200"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Content */}
        <div className="p-4 space-y-4 text-xs">
          {/* Free Tier Guarantee Banner */}
          <div className="p-2.5 rounded bg-emerald-950/40 border border-emerald-500/40 text-emerald-300 space-y-1">
            <div className="flex items-center gap-1.5 font-bold text-xs">
              <ShieldCheck className="w-4 h-4 text-emerald-400" />
              <span>{localize(state.language, 'PLAN GRATUITO GARANTIZADO (0 COSTOS)', 'FREE PLAN (NO COST)')}</span>
            </div>
            <p className="text-[11px] text-zinc-400">
              {en
                ? <>This app uses the <strong>Firebase Spark Free Tier</strong>. Saves and reads run within Google Cloud's free daily quotas; usage charges are not enabled by this app.</>
                : <>Esta aplicación utiliza el plan <strong>Firebase Spark Free Tier</strong>. Las operaciones de guardado y lectura se ejecutan dentro de las cuotas gratuitas diarias de Google Cloud sin posibilidad de generar cobros por uso.</>}
            </p>
          </div>

          {/* User Status / Login */}
          {user ? (
            <div className="space-y-3 bg-[#09111c] border border-cyan-900/40 p-3 rounded-lg">
              <div className="flex items-center gap-3">
                {user.photoURL ? (
                  <img src={user.photoURL} alt="User" className="w-10 h-10 rounded-full border border-cyan-400" />
                ) : (
                  <div className="w-10 h-10 rounded-full bg-cyan-950 border border-cyan-500 flex items-center justify-center">
                    <User className="w-5 h-5 text-cyan-400" />
                  </div>
                )}
                <div className="flex-1 truncate">
                  <span className="text-[10px] text-zinc-500 block font-mono">{localize(state.language, 'CALLSIGN DEL OPERATIVO', 'OPERATIVE CALLSIGN')}</span>
                  <div className="font-bold text-cyan-300 text-sm truncate">{state.callsign}</div>
                  <div className="text-[10px] text-zinc-400 truncate">{user.displayName || user.email}</div>
                </div>
              </div>

              {/* Callsign Editor */}
              <form onSubmit={handleUpdateCallsign} className="pt-2 border-t border-zinc-800 space-y-1">
                <label className="text-[10px] text-zinc-400 block">{localize(state.language, 'CALLSIGN DEL OPERATIVO (PÚBLICO EN RANKING):', 'OPERATIVE CALLSIGN (PUBLIC ON LEADERBOARD):')}</label>
                <div className="flex items-center gap-2">
                  <input
                    type="text"
                    value={callsignInput}
                    onChange={(e) => setCallsignInput(e.target.value)}
                    maxLength={25}
                    className="flex-1 bg-zinc-950 border border-cyan-900 rounded px-2 py-1 text-xs text-cyan-200 outline-none focus:border-cyan-400"
                  />
                  <button
                    type="submit"
                    className="px-2.5 py-1 bg-cyan-950 hover:bg-cyan-900 text-cyan-300 border border-cyan-700 rounded text-xs"
                  >
                    {localize(state.language, 'CAMBIAR', 'UPDATE')}
                  </button>
                </div>
              </form>

              {/* Cloud Actions */}
              <div className="grid grid-cols-2 gap-2 pt-2 border-t border-zinc-800">
                <button
                  onClick={handleSave}
                  disabled={isSaving}
                  className="py-1.5 px-3 bg-cyan-500 hover:bg-cyan-400 text-zinc-950 font-bold rounded text-xs flex items-center justify-center gap-1.5 transition-colors cursor-pointer"
                >
                  <Save className="w-3.5 h-3.5" />
                  <span>{localize(state.language, 'GUARDAR EN NUBE', 'SAVE TO CLOUD')}</span>
                </button>
                <button
                  onClick={handleLoad}
                  disabled={isSaving}
                  className="py-1.5 px-3 bg-zinc-800 hover:bg-zinc-700 text-cyan-300 font-bold rounded text-xs flex items-center justify-center gap-1.5 border border-zinc-700 transition-colors cursor-pointer"
                >
                  <Download className="w-3.5 h-3.5" />
                  <span>{localize(state.language, 'RESTAURAR NUBE', 'LOAD FROM CLOUD')}</span>
                </button>
              </div>

              <div className="flex items-center justify-between pt-1">
                <span className="text-[10px] text-zinc-500">
                  {localize(state.language, 'Estado:', 'Status:')} <strong className="text-emerald-400">{localize(state.language, 'Enlace Criptográfico Activo', 'Secure connection active')}</strong>
                </span>
                <button
                  onClick={logoutUser}
                  className="text-red-400 hover:text-red-300 text-[10px] flex items-center gap-1"
                >
                  <LogOut className="w-3 h-3" />
                  <span>{localize(state.language, 'CERRAR SESIÓN', 'SIGN OUT')}</span>
                </button>
              </div>
            </div>
          ) : (
            <div className="p-4 bg-[#09111c] border border-cyan-900/40 rounded-lg text-center space-y-3">
              <Key className="w-8 h-8 text-cyan-400 mx-auto" />
              <div>
                <h4 className="font-bold text-zinc-100 text-xs">{localize(state.language, 'VINCULA TU CUENTA DE GOOGLE', 'CONNECT YOUR GOOGLE ACCOUNT')}</h4>
                <p className="text-[11px] text-zinc-400 mt-1">
                  {localize(state.language, 'Guarda tu progreso de entrenamiento, hardware adquirido y posición en el ranking de la Singularidad de forma persistente y segura.', 'Securely save your training progress, purchased hardware, and Singularity leaderboard position.')}
                </p>
              </div>

              <button
                onClick={loginWithGoogle}
                className="w-full py-2 px-4 bg-cyan-500 hover:bg-cyan-400 text-zinc-950 font-bold text-xs rounded flex items-center justify-center gap-2 shadow-[0_0_15px_rgba(0,255,200,0.3)] transition-all cursor-pointer"
              >
                <User className="w-4 h-4 fill-current" />
                <span>{localize(state.language, 'INICIAR SESIÓN CON GOOGLE', 'SIGN IN WITH GOOGLE')}</span>
              </button>

              <span className="text-[10px] text-zinc-500 block">
                {localize(state.language, 'Tus datos locales están seguros y se transferirán automáticamente a la nube.', 'Your local data is safe and will be transferred to the cloud after sign-in.')}
              </span>
            </div>
          )}

          {saveSuccessMsg && (
            <div className="p-2 bg-emerald-950/60 border border-emerald-500 text-emerald-300 rounded text-center text-xs animate-bounce flex items-center justify-center gap-1.5">
              <CheckCircle2 className="w-3.5 h-3.5" />
              <span>{saveSuccessMsg}</span>
            </div>
          )}

          {/* Reset simulation to zero */}
          <div className="p-3 bg-red-950/20 border border-red-900/40 rounded-lg space-y-2">
            <div className="flex items-center gap-1.5 text-red-400 font-bold text-xs">
              <RotateCcw className="w-3.5 h-3.5" />
              <span>{localize(state.language, 'REINICIAR SIMULACIÓN A CERO', 'RESET SIMULATION')}</span>
            </div>
            <p className="text-[10px] text-zinc-400 leading-snug">
              {localize(state.language, '¿Quieres empezar de nuevo eligiendo otra configuración de hardware inicial y primer modelo? Puedes reiniciar toda la simulación desde cero. Se reiniciará el protocolo de Génesis.', 'Want to start over with different initial hardware and a new first model? This resets the simulation and restarts the Genesis protocol.')}
            </p>
            {confirmReset ? (
              <div className="flex items-center gap-2 pt-1">
                <button
                  type="button"
                  onClick={async () => {
                    await resetProgress();
                    setConfirmReset(false);
                    onClose();
                  }}
                  className="flex-1 py-1 px-2 bg-red-600 hover:bg-red-500 text-white font-bold rounded text-[11px] transition-colors"
                >
                  {localize(state.language, 'CONFIRMAR REINICIO TOTAL', 'CONFIRM FULL RESET')}
                </button>
                <button
                  type="button"
                  onClick={() => setConfirmReset(false)}
                  className="py-1 px-2 bg-zinc-800 text-zinc-300 rounded text-[11px]"
                >
                  {localize(state.language, 'CANCELAR', 'CANCEL')}
                </button>
              </div>
            ) : (
              <button
                type="button"
                onClick={() => setConfirmReset(true)}
                className="w-full py-1 px-2 bg-red-950/60 hover:bg-red-900/70 border border-red-800/60 text-red-300 rounded text-[11px] transition-colors text-center"
              >
                {localize(state.language, 'REINICIAR SIMULACIÓN A CERO (GÉNESIS)', 'RESET SIMULATION (GENESIS)')}
              </button>
            )}
          </div>
        </div>

        {/* Footer */}
        <div className="p-3 bg-[#0a111a] border-t border-cyan-900/40 text-[11px] text-zinc-500 flex justify-end">
          <button
            onClick={() => { sound.playNavSwitch(); onClose(); }}
            className="px-3 py-1 bg-zinc-800 hover:bg-zinc-700 text-zinc-300 rounded text-xs"
          >
            {localize(state.language, 'ENTENDIDO', 'DONE')}
          </button>
        </div>
      </div>
    </div>
  );
};
