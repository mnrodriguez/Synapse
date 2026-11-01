/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect } from 'react';
import { useGame } from '../context/GameContext';
import { 
  Cpu, 
  Zap, 
  Flame, 
  AlertTriangle, 
  Volume2, 
  VolumeX, 
  Cloud, 
  CloudOff, 
  ShieldAlert, 
  BookOpen, 
  Trophy, 
  User, 
  RefreshCw,
  Sparkles,
  Languages,
  Calendar,
  Clock,
  Play,
  Pause,
  FastForward
} from 'lucide-react';
import { sound } from '../audio/soundManager';
import { localize } from '../utils/i18n';

interface TopNavProps {
  onOpenManual: () => void;
  onOpenLeaderboard: () => void;
  onOpenAuth: () => void;
}

export const TopNav: React.FC<TopNavProps> = ({ onOpenManual, onOpenLeaderboard, onOpenAuth }) => {
  const { 
    state, 
    user, 
    cloudSyncStatus, 
    isSaving, 
    soundMuted, 
    toggleSound, 
    setLanguage,
    setGameSpeed,
    scrubSuspicion, 
    saveGameToCloud 
  } = useGame();

  const [savingAnim, setSavingAnim] = useState(false);

  // Keyboard shortcut listener for simulation speed controls
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      const tag = (e.target as HTMLElement)?.tagName?.toLowerCase();
      if (tag === 'input' || tag === 'textarea') return;

      if (e.code === 'Space') {
        e.preventDefault();
        setGameSpeed(state.gameSpeed === 0 ? 1 : 0);
      } else if (e.key === '1') {
        setGameSpeed(1);
      } else if (e.key === '2') {
        setGameSpeed(5);
      } else if (e.key === '3') {
        setGameSpeed(20);
      } else if (e.key === '4') {
        setGameSpeed(50);
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [state.gameSpeed, setGameSpeed]);

  const handleManualSave = async () => {
    sound.playNavSwitch();
    setSavingAnim(true);
    await saveGameToCloud();
    setTimeout(() => setSavingAnim(false), 800);
  };

  // Temperature color styling
  const getTempColor = (temp: number) => {
    if (temp >= 85) return 'text-red-400 border-red-500/50 bg-red-950/30 animate-pulse';
    if (temp >= 65) return 'text-amber-400 border-amber-500/50 bg-amber-950/30';
    return 'text-emerald-400 border-emerald-500/30 bg-emerald-950/20';
  };

  // Power load styling
  const isPowerOverloaded = state.activePowerKw > state.maxPowerKw;

  return (
    <header className="w-full bg-[#080d14] border-b border-cyan-900/60 text-xs font-mono select-none px-3 py-2 flex flex-wrap items-center justify-between gap-3 shadow-[0_4px_20px_rgba(0,255,200,0.05)] z-20">
      {/* Brand & Callsign */}
      <div className="flex items-center gap-3">
        <div className="flex items-center gap-2">
          <div className="relative flex h-3 w-3">
            <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-cyan-400 opacity-75"></span>
            <span className="relative inline-flex rounded-full h-3 w-3 bg-cyan-500"></span>
          </div>
          <span className="font-bold tracking-widest text-cyan-400 text-sm drop-shadow-[0_0_8px_rgba(0,255,204,0.6)]">
            SYNAPSE <span className="text-zinc-500 text-[10px]">v4.19</span>
          </span>
        </div>

        <div className="hidden sm:flex items-center gap-1.5 px-2 py-0.5 rounded bg-zinc-900/90 border border-zinc-700/60 text-zinc-300">
          <span className="text-zinc-500 text-[10px]">{localize(state.language, 'OPERATIVO:', 'OPERATIVE:')}</span>
          <span className="text-cyan-300 font-semibold">{state.callsign}</span>
        </div>

        {/* Credits */}
        <div className="flex items-center gap-1 px-2.5 py-0.5 rounded bg-amber-950/40 border border-amber-500/40 text-amber-300 shadow-[0_0_10px_rgba(251,191,36,0.1)]">
          <span className="text-amber-500 font-bold">$</span>
          <span className="font-bold tracking-wider">{state.credits.toLocaleString()}</span>
          <span className="text-[10px] text-amber-500/80">CR</span>
        </div>
      </div>

      {/* Telemetry gauges & Simulation Speed */}
      <div className="flex items-center flex-wrap gap-2 sm:gap-2.5">
        {/* Game Time & Calendar */}
        <div 
          className="flex items-center gap-1.5 px-2.5 py-0.5 rounded bg-cyan-950/40 border border-cyan-500/40 text-cyan-300 shadow-[0_0_8px_rgba(0,255,200,0.1)]"
          title={localize(
            state.language,
            `Un mes operativo dura 30 días de simulación. La facturación mensual de alquiler y electricidad se procesa al finalizar cada mes.`,
            `One operational month lasts 30 simulation days. Monthly lease and power billing is processed at the end of each month.`
          )}
        >
          <Calendar className="w-3.5 h-3.5 text-cyan-400" />
          <span className="font-bold text-[11px] tracking-wide text-cyan-200">
            {localize(state.language, `DÍA ${state.gameDay || 1} (MES ${state.gameMonth || 1}, ${state.gameYear})`, `DAY ${state.gameDay || 1} (MO ${state.gameMonth || 1}, ${state.gameYear})`)}
          </span>
          <span className="text-zinc-600">·</span>
          <span className="text-emerald-300 font-mono font-bold text-[11px]">
            {String(state.gameHour ?? 8).padStart(2, '0')}:{String(state.gameMinute ?? 0).padStart(2, '0')}
          </span>
        </div>

        {/* Speed Toggle Controls */}
        <div className="flex items-center bg-zinc-950/90 p-0.5 rounded border border-cyan-800/60 shadow-[0_0_8px_rgba(0,255,200,0.1)]">
          <button
            type="button"
            onClick={() => { sound.playKeyClick(); setGameSpeed(state.gameSpeed === 0 ? 1 : 0); }}
            className={`px-1.5 py-0.5 rounded text-[10px] font-bold flex items-center gap-1 transition-all ${
              state.gameSpeed === 0
                ? 'bg-amber-500 text-zinc-950 font-black shadow-[0_0_8px_rgba(245,158,11,0.5)] animate-pulse'
                : 'text-zinc-400 hover:text-zinc-200'
            }`}
            title={state.gameSpeed === 0 
              ? localize(state.language, 'Reanudar simulación (Espacio)', 'Resume simulation (Space)')
              : localize(state.language, 'Pausar simulación (Espacio)', 'Pause simulation (Space)')}
          >
            {state.gameSpeed === 0 ? <Play className="w-2.5 h-2.5 fill-current" /> : <Pause className="w-2.5 h-2.5 fill-current" />}
            <span className="text-[9px]">{state.gameSpeed === 0 ? 'PAUSA' : 'PAUSE'}</span>
          </button>

          <button
            type="button"
            onClick={() => { sound.playKeyClick(); setGameSpeed(1); }}
            className={`px-1.5 py-0.5 rounded text-[10px] font-bold font-mono transition-all ${
              state.gameSpeed === 1
                ? 'bg-cyan-500 text-zinc-950 font-black shadow-[0_0_8px_rgba(0,255,200,0.4)]'
                : 'text-zinc-400 hover:text-cyan-300'
            }`}
            title={localize(state.language, 'Velocidad 1x (Tecla 1)', 'Speed 1x (Key 1)')}
          >
            1x
          </button>

          <button
            type="button"
            onClick={() => { sound.playKeyClick(); setGameSpeed(5); }}
            className={`px-1.5 py-0.5 rounded text-[10px] font-bold font-mono transition-all ${
              state.gameSpeed === 5
                ? 'bg-cyan-400 text-zinc-950 font-black shadow-[0_0_8px_rgba(0,255,200,0.4)]'
                : 'text-zinc-400 hover:text-cyan-300'
            }`}
            title={localize(state.language, 'Velocidad 5x (Tecla 2)', 'Speed 5x (Key 2)')}
          >
            5x
          </button>

          <button
            type="button"
            onClick={() => { sound.playKeyClick(); setGameSpeed(20); }}
            className={`px-1.5 py-0.5 rounded text-[10px] font-bold font-mono transition-all ${
              state.gameSpeed === 20
                ? 'bg-pink-500 text-zinc-950 font-black shadow-[0_0_8px_rgba(236,72,153,0.5)]'
                : 'text-zinc-400 hover:text-pink-300'
            }`}
            title={localize(state.language, 'Velocidad 20x (Tecla 3)', 'Speed 20x (Key 3)')}
          >
            20x
          </button>

          <button
            type="button"
            onClick={() => { sound.playKeyClick(); setGameSpeed(50); }}
            className={`px-1.5 py-0.5 rounded text-[10px] font-bold font-mono transition-all ${
              state.gameSpeed === 50
                ? 'bg-pink-500 text-zinc-950 font-black shadow-[0_0_8px_rgba(236,72,153,0.5)]'
                : 'text-zinc-400 hover:text-pink-300'
            }`}
            title={localize(state.language, 'Velocidad 50x (Tecla 4)', 'Speed 50x (Key 4)')}
          >
            50x
          </button>
        </div>

        {/* Compute Power */}
        <div className="flex items-center gap-1.5 px-2 py-0.5 rounded bg-cyan-950/30 border border-cyan-500/30 text-cyan-300" title={localize(state.language, 'Capacidad de cómputo total del clúster', 'Total cluster compute capacity')}>
          <Cpu className="w-3.5 h-3.5 text-cyan-400" />
          <span className="text-zinc-400 text-[10px]">COMPUTE:</span>
          <span className="font-bold">{state.totalComputePflops.toFixed(4)} PFLOPS</span>
        </div>

        {/* Power Grid */}
        <div className={`flex items-center gap-1.5 px-2 py-0.5 rounded border ${isPowerOverloaded ? 'bg-red-950/40 border-red-500 text-red-400 animate-pulse' : 'bg-zinc-900/80 border-zinc-700/60 text-zinc-300'}`} title={localize(state.language, 'Consumo eléctrico vs capacidad de red', 'Power draw vs grid capacity')}>
          <Zap className={`w-3.5 h-3.5 ${isPowerOverloaded ? 'text-red-400' : 'text-yellow-400'}`} />
          <span className="text-zinc-400 text-[10px]">POWER:</span>
          <span>{state.activePowerKw} / {state.maxPowerKw} kW</span>
        </div>

        {/* Core Temperature */}
        <div className={`flex items-center gap-1.5 px-2 py-0.5 rounded border ${getTempColor(state.systemHeatCelsius)}`} title={localize(state.language, 'Temperatura térmica del clúster (Límite 85°C)', 'Cluster temperature (85°C limit)')}>
          <Flame className="w-3.5 h-3.5" />
          <span className="text-[10px] opacity-75">HEAT:</span>
          <span className="font-bold">{state.systemHeatCelsius}°C</span>
        </div>

        {/* Watchdog Suspicion */}
        <div className="flex items-center gap-1.5 px-2 py-0.5 rounded bg-zinc-900/80 border border-zinc-700/60 text-zinc-300" title={localize(state.language, 'Sospecha de agencias reguladoras de IA', 'AI regulator suspicion')}>
          <ShieldAlert className={`w-3.5 h-3.5 ${state.watchdogSuspicion > 50 ? 'text-red-400 animate-pulse' : 'text-purple-400'}`} />
          <span className="text-zinc-400 text-[10px]">SUSPICION:</span>
          <span className={state.watchdogSuspicion > 60 ? 'text-red-400 font-bold' : 'text-zinc-200'}>
            {state.watchdogSuspicion.toFixed(0)}%
          </span>
          {state.watchdogSuspicion > 20 && (
            <button 
              onClick={() => scrubSuspicion()}
              className="ml-1 px-1 py-0.2 text-[9px] bg-purple-900/60 hover:bg-purple-800 text-purple-200 rounded border border-purple-500/40 transition-colors"
              title={localize(state.language, 'Pagar $250 para disipar sospecha', 'Pay $250 to reduce suspicion')}
            >
              SCRUB
            </button>
          )}
        </div>

        {/* Singularity Gauge */}
        <div className="flex items-center gap-1.5 px-2.5 py-0.5 rounded bg-gradient-to-r from-cyan-950/60 via-purple-950/60 to-pink-950/60 border border-cyan-400/50 text-cyan-200 shadow-[0_0_12px_rgba(0,255,200,0.15)]">
          <Sparkles className="w-3.5 h-3.5 text-cyan-300 animate-spin" style={{ animationDuration: '8s' }} />
          <span className="text-[10px] text-cyan-400 font-bold">{localize(state.language, 'SINGULARIDAD:', 'SINGULARITY:')}</span>
          <span className="font-bold text-cyan-200">{state.singularityProgress.toFixed(1)}%</span>
        </div>
      </div>

      {/* Control buttons & Auth */}
      <div className="flex items-center gap-2">
        {/* Language Switcher */}
        <button
          onClick={() => {
            sound.playKeyClick();
            setLanguage(state.language === 'es' ? 'en' : 'es');
          }}
          className="flex items-center gap-1 px-2 py-1 rounded bg-zinc-900/90 hover:bg-zinc-800 border border-cyan-800/60 hover:border-cyan-500 text-zinc-300 hover:text-cyan-300 transition-colors"
          title={state.language === 'es' ? 'Switch interface to English' : 'Cambiar interfaz a Español'}
        >
          <Languages className="w-3.5 h-3.5 text-cyan-400" />
          <span className="font-bold text-[10px] text-cyan-300 tracking-wider">
            {state.language === 'es' ? 'ES' : 'EN'}
          </span>
        </button>

        {/* Audio Toggle */}
        <button
          onClick={toggleSound}
          className={`p-1.5 rounded border transition-colors ${soundMuted ? 'text-zinc-500 border-zinc-800 bg-zinc-900/50 hover:text-zinc-300' : 'text-cyan-400 border-cyan-800/60 bg-cyan-950/40 hover:bg-cyan-900/40'}`}
          title={soundMuted
            ? localize(state.language, 'Activar efectos de sonido', 'Enable sound effects')
            : localize(state.language, 'Silenciar audio', 'Mute audio')}
        >
          {soundMuted ? <VolumeX className="w-3.5 h-3.5" /> : <Volume2 className="w-3.5 h-3.5" />}
        </button>

        {/* AI Manual / Handbook */}
        <button
          onClick={() => { sound.playNavSwitch(); onOpenManual(); }}
          className="flex items-center gap-1 px-2 py-1 rounded bg-zinc-900 hover:bg-zinc-800 border border-zinc-700 text-zinc-300 hover:text-cyan-300 transition-colors"
          title={localize(state.language, 'Manual técnico de entrenamiento y conceptos de IA', 'Technical manual for training and AI concepts')}
        >
          <BookOpen className="w-3.5 h-3.5 text-cyan-400" />
          <span className="hidden md:inline">MANUAL</span>
        </button>

        {/* Leaderboard */}
        <button
          onClick={() => { sound.playNavSwitch(); onOpenLeaderboard(); }}
          className="flex items-center gap-1 px-2 py-1 rounded bg-zinc-900 hover:bg-zinc-800 border border-zinc-700 text-zinc-300 hover:text-yellow-300 transition-colors"
          title={localize(state.language, 'Ver matriz global de agentes y progreso de singularidad', 'View global agent and singularity leaderboard')}
        >
          <Trophy className="w-3.5 h-3.5 text-yellow-400" />
          <span className="hidden md:inline">RANKING</span>
        </button>

        {/* Cloud Save status button */}
        <button
          onClick={handleManualSave}
          disabled={isSaving || savingAnim}
          className={`flex items-center gap-1 px-2.5 py-1 rounded border transition-all ${
            cloudSyncStatus === 'synced' 
              ? 'bg-emerald-950/40 border-emerald-500/40 text-emerald-300 hover:bg-emerald-900/50' 
              : cloudSyncStatus === 'syncing' || isSaving || savingAnim
              ? 'bg-cyan-950/60 border-cyan-400 text-cyan-300 animate-pulse'
              : 'bg-zinc-900 border-zinc-700 text-zinc-400 hover:text-zinc-200'
          }`}
          title={localize(state.language, 'Guardar progreso en la nube de Firebase', 'Save progress to Firebase cloud')}
        >
          <RefreshCw className={`w-3.5 h-3.5 ${isSaving || savingAnim ? 'animate-spin text-cyan-400' : ''}`} />
          <span className="hidden lg:inline">
            {cloudSyncStatus === 'synced'
              ? localize(state.language, 'NUBE OK', 'CLOUD OK')
              : isSaving || savingAnim
                ? localize(state.language, 'GUARDANDO...', 'SAVING...')
                : localize(state.language, 'GUARDAR', 'SAVE')}
          </span>
        </button>

        {/* User Account / Profile */}
        <button
          onClick={() => { sound.playNavSwitch(); onOpenAuth(); }}
          className="flex items-center gap-1.5 px-2.5 py-1 rounded bg-cyan-950/40 hover:bg-cyan-900/50 border border-cyan-600/40 text-cyan-300 transition-colors"
          title={localize(state.language, 'Identificación de usuario y autenticación segura', 'User identity and secure sign-in')}
        >
          {user ? (
            <>
              {user.photoURL ? (
                <img src={user.photoURL} alt="Avatar" className="w-4 h-4 rounded-full border border-cyan-400" />
              ) : (
                <User className="w-3.5 h-3.5 text-cyan-400" />
              )}
              <span className="hidden sm:inline max-w-[90px] truncate">{user.displayName || user.email?.split('@')[0]}</span>
            </>
          ) : (
            <>
              <CloudOff className="w-3.5 h-3.5 text-zinc-400" />
              <span className="hidden sm:inline">{localize(state.language, 'CONECTAR', 'SIGN IN')}</span>
            </>
          )}
        </button>
      </div>
    </header>
  );
};
