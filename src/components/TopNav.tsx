/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect } from 'react';
import { useGame } from '../context/GameContext';
import { 
  Sparkles,
  Cpu,
  ShieldAlert,
  Skull,
  Clock,
  Play,
  Pause,
  Languages,
  Volume2,
  VolumeX,
  FileText,
  RefreshCw,
  User,
  CloudOff
} from 'lucide-react';
import { sound } from '../audio/soundManager';
import { localize } from '../utils/i18n';
import { VERSION_PROFILES } from '../utils/versionProfiles';

export interface TopNavProps {
  onOpenManual: () => void;
  onOpenLeaderboard: () => void;
  onOpenAuth: () => void;
}

export const TopNav: React.FC<TopNavProps> = ({ 
  onOpenManual,
  onOpenLeaderboard, 
  onOpenAuth 
}) => {
  const { 
    state, 
    user, 
    cloudSyncStatus, 
    isSaving, 
    soundMuted, 
    toggleSound, 
    setLanguage,
    setGameSpeed,
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

  const lang = state.language === 'es' ? 'es' : 'en';
  const ver = state.uiVersion || 1;
  const p = VERSION_PROFILES[lang][ver];

  const getBrandIcon = () => {
    if (ver === 4) return <Skull className="w-4 h-4 text-rose-500" />;
    if (ver === 3) return <ShieldAlert className="w-4 h-4 text-cyan-400" />;
    if (ver === 2) return <Cpu className="w-4 h-4 text-indigo-400" />;
    return <Sparkles className="w-4 h-4 text-blue-400" />;
  };

  return (
    <div className="w-full flex flex-col z-30 shrink-0 select-none">
      <header className="w-full bg-[#020409] border-b border-white/15 px-3 sm:px-5 py-2 sticky top-0 z-50 flex flex-wrap items-center justify-between gap-2.5 shadow-2xl">
        
        {/* Left: Brand Identity & Callsign */}
        <div className="flex items-center gap-3">
          <div className="p-1.5 rounded-lg bg-slate-900 border border-white/10 flex items-center justify-center shrink-0">
            {getBrandIcon()}
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h1 className="font-bold text-xs sm:text-sm text-slate-100 tracking-tight font-mono">
                {p.appTitle}
              </h1>
              <span className="text-[10px] px-2 py-0.5 rounded bg-slate-900 border border-white/10 text-slate-400 font-mono font-semibold">
                {p.badge}
              </span>
            </div>
            <p className="text-[10px] text-slate-400 font-mono">
              {localize(lang, 'Operativo:', 'Operative:')} <strong className="text-cyan-400">{state.callsign}</strong> • {p.facility}
            </p>
          </div>
        </div>

        {/* Center: Simulation Speed Controls */}
        <div className="flex items-center gap-1 bg-slate-900 p-1 rounded-xl border border-white/10 font-mono text-xs">
          <Clock className="w-3.5 h-3.5 text-slate-400 ml-1 mr-0.5" />
          <button
            onClick={() => setGameSpeed(state.gameSpeed === 0 ? 1 : 0)}
            className={`px-2 py-1 rounded-lg text-[10px] font-bold flex items-center gap-1 transition cursor-pointer ${
              state.gameSpeed === 0 ? 'bg-amber-500 text-slate-950' : 'text-slate-400 hover:text-white'
            }`}
            title="Pause / Resume Simulation (Space)"
          >
            {state.gameSpeed === 0 ? <Play className="w-3 h-3 fill-current" /> : <Pause className="w-3 h-3 fill-current" />}
            <span>{state.gameSpeed === 0 ? (lang === 'es' ? 'PAUSADO' : 'PAUSED') : '1x'}</span>
          </button>
          {[1, 5, 20, 50].map(speed => (
            <button
              key={speed}
              onClick={() => setGameSpeed(speed)}
              className={`px-2 py-1 rounded-lg text-[10px] font-bold transition cursor-pointer ${
                state.gameSpeed === speed ? 'bg-cyan-400 text-slate-950' : 'text-slate-400 hover:text-white'
              }`}
            >
              {speed}x
            </button>
          ))}
        </div>

        {/* Right: Controls & Language Toggle */}
        <div className="flex items-center gap-1.5 sm:gap-2 text-xs font-mono">
          {/* Bilingual EN | ES Toggle */}
          <button
            onClick={() => {
              sound.playKeyClick();
              setLanguage(state.language === 'es' ? 'en' : 'es');
            }}
            className="px-2.5 py-1 rounded-xl bg-slate-900 hover:bg-slate-800 border border-cyan-500/40 text-xs font-mono font-semibold flex items-center gap-1.5 transition cursor-pointer"
            title="Language Switcher / Selector de Idioma"
          >
            <Languages className="w-3.5 h-3.5 text-cyan-400" />
            <span className={`px-1.5 py-0.2 rounded font-bold ${state.language === 'en' ? 'bg-cyan-400 text-slate-950' : 'text-slate-400'}`}>EN</span>
            <span className="text-slate-600">|</span>
            <span className={`px-1.5 py-0.2 rounded font-bold ${state.language === 'es' ? 'bg-cyan-400 text-slate-950' : 'text-slate-400'}`}>ES</span>
          </button>

          {/* Official PDF Manual Link */}
          <a
            href="/assets/aistudio/SYNAPSE_AI_Architecture___Systems_Manual__1__73b90381.pdf"
            target="_blank"
            rel="noopener noreferrer"
            onClick={() => sound.playKeyClick()}
            className="hidden lg:flex items-center gap-1 px-2.5 py-1 rounded-xl bg-slate-900 hover:bg-slate-800 border border-slate-700 text-slate-300 text-xs font-medium transition cursor-pointer"
            title="Download PDF Systems Manual"
          >
            <FileText className="w-3.5 h-3.5 text-amber-400" />
            <span>PDF</span>
          </a>

          {/* Audio Sound FX Toggle */}
          <button
            onClick={() => toggleSound()}
            className="p-1.5 rounded-xl bg-slate-900 hover:bg-slate-800 border border-slate-700 text-slate-300 transition cursor-pointer"
            title={soundMuted ? 'Unmute Sound FX' : 'Mute Sound FX'}
          >
            {soundMuted ? <VolumeX className="w-3.5 h-3.5 text-rose-400" /> : <Volume2 className="w-3.5 h-3.5 text-emerald-400" />}
          </button>

          {/* Cloud Save Button */}
          <button
            onClick={handleManualSave}
            disabled={isSaving}
            className={`px-2.5 py-1 rounded-xl border text-xs font-mono font-semibold flex items-center gap-1.5 transition cursor-pointer ${
              savingAnim
                ? 'bg-emerald-950 border-emerald-500 text-emerald-300'
                : 'bg-slate-900 hover:bg-slate-800 border-slate-700 text-slate-300'
            }`}
            title="Sync & Save Progress"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${isSaving || savingAnim ? 'animate-spin text-emerald-400' : 'text-slate-400'}`} />
            <span className="hidden sm:inline">{isSaving ? (lang === 'es' ? 'Guardando...' : 'Saving...') : (lang === 'es' ? 'Guardar' : 'Save')}</span>
          </button>

          {/* User Account / Auth Trigger */}
          <button
            onClick={() => { sound.playKeyClick(); onOpenAuth(); }}
            className={`px-2.5 py-1 rounded-xl border text-xs font-mono font-semibold flex items-center gap-1.5 transition cursor-pointer ${
              user
                ? 'bg-cyan-950/80 border-cyan-500/60 text-cyan-300'
                : 'bg-slate-900 hover:bg-slate-800 border-slate-700 text-slate-400'
            }`}
          >
            {user ? <User className="w-3.5 h-3.5 text-cyan-400" /> : <CloudOff className="w-3.5 h-3.5 text-amber-400" />}
            <span className="hidden md:inline truncate max-w-[90px]">{user ? user.displayName?.split(' ')[0] || 'Operative' : (lang === 'es' ? 'Cuenta' : 'Account')}</span>
          </button>
        </div>

      </header>
    </div>
  );
};
