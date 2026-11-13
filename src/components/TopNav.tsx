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
import { VERSION_PROFILES } from '../utils/versionProfiles';
import { tr } from '../i18n';

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
    if (ver === 4) return <Skull className="w-4 h-4 theme-danger-text" />;
    if (ver === 3) return <ShieldAlert className="w-4 h-4 mutating-accent-text" />;
    if (ver === 2) return <Cpu className="w-4 h-4 mutating-accent-text" />;
    return <Sparkles className="w-4 h-4 mutating-accent-text" />;
  };

  return (
    <div className="w-full flex flex-col z-30 shrink-0 select-none">
      <header className="w-full mutating-panel border-b px-3 sm:px-5 py-2 sticky top-0 z-50 flex flex-wrap items-center justify-between gap-2.5 shadow-md">
        
        {/* Left: Brand Identity & Callsign */}
        <div className="flex items-center gap-3">
          <div className="p-1.5 rounded-lg mutating-sub border flex items-center justify-center shrink-0">
            {getBrandIcon()}
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h1 className="font-bold text-xs sm:text-sm tracking-tight font-mono">
                {p.appTitle}
              </h1>
              <span className="text-[11px] px-2 py-0.5 rounded mutating-sub mutating-text-muted font-mono font-semibold">
                {p.badge}
              </span>
            </div>
            <p className="text-[11px] mutating-text-muted font-mono">
              {p.story.operatorLabel} <strong className="mutating-accent-text">{state.callsign}</strong> • {p.facility}
            </p>
          </div>
        </div>

        {/* Controls row: one line that scrolls sideways on phones instead of stacking into three rows */}
        <div className="flex items-center gap-2 w-full sm:w-auto min-w-0 overflow-x-auto">

        {/* Center: Simulation Speed Controls */}
        <div className="flex items-center gap-1 mutating-sub p-1 rounded-xl border font-mono text-xs">
          <Clock className="w-3.5 h-3.5 mutating-text-muted ml-1 mr-0.5" />
          <button
            onClick={() => setGameSpeed(state.gameSpeed === 0 ? 1 : 0)}
            className={`px-2 py-1 rounded-lg text-[11px] font-bold flex items-center gap-1 transition cursor-pointer ${
              state.gameSpeed === 0 ? 'theme-btn-warn theme-on-accent font-black' : 'mutating-text-muted hover:opacity-100'
            }`}
            title="Pause / Resume Simulation (Space)"
          >
            {state.gameSpeed === 0 ? <Play className="w-3 h-3 fill-current" /> : <Pause className="w-3 h-3 fill-current" />}
            <span>{state.gameSpeed === 0 ? (tr(lang, 'topNav.paused')) : '1x'}</span>
          </button>
          {[1, 5, 20, 50].map(speed => (
            <button
              key={speed}
              onClick={() => setGameSpeed(speed)}
              className={`px-2 py-1 rounded-lg text-[11px] font-bold transition cursor-pointer ${
                state.gameSpeed === speed ? 'mutating-btn-primary shadow-sm font-bold' : 'mutating-text-muted hover:opacity-100'
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
            className="px-2.5 py-1 rounded-xl mutating-sub hover:opacity-90 border text-xs font-mono font-semibold flex items-center gap-1.5 transition cursor-pointer"
            title="Language Switcher / Selector de Idioma"
          >
            <Languages className="w-3.5 h-3.5 mutating-accent-text" />
            <span className={`px-1.5 py-0.2 rounded font-bold ${tr(state.language, 'topNav.mutatingBtnPrimary')}`}>EN</span>
            <span className="opacity-40">|</span>
            <span className={`px-1.5 py-0.2 rounded font-bold ${tr(state.language, 'topNav.mutatingTextMuted')}`}>ES</span>
          </button>

          {/* Official PDF Manual Link */}
          <a
            href="/assets/aistudio/SYNAPSE_AI_Architecture___Systems_Manual__1__73b90381.pdf"
            target="_blank"
            rel="noopener noreferrer"
            onClick={() => sound.playKeyClick()}
            className="hidden lg:flex items-center gap-1 px-2.5 py-1 rounded-xl mutating-sub hover:opacity-90 border text-xs font-medium transition cursor-pointer"
            title="Download PDF Systems Manual"
          >
            <FileText className="w-3.5 h-3.5 theme-warn-text" />
            <span>PDF</span>
          </a>

          {/* Audio Sound FX Toggle */}
          <button
            onClick={() => toggleSound()}
            className="p-1.5 rounded-xl mutating-sub hover:opacity-90 border transition cursor-pointer"
            title={soundMuted ? 'Unmute Sound FX' : 'Mute Sound FX'}
          >
            {soundMuted ? <VolumeX className="w-3.5 h-3.5 theme-danger-text" /> : <Volume2 className="w-3.5 h-3.5 theme-success-text" />}
          </button>

          {/* Cloud Save Button */}
          <button
            onClick={handleManualSave}
            disabled={isSaving}
            className={`px-2.5 py-1 rounded-xl border text-xs font-mono font-semibold flex items-center gap-1.5 transition cursor-pointer ${
              savingAnim
                ? 'theme-success-soft theme-success-border theme-success-text'
                : 'mutating-sub hover:opacity-90'
            }`}
            title="Sync & Save Progress"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${isSaving || savingAnim ? 'animate-spin theme-success-text' : 'mutating-text-muted'}`} />
            <span className="hidden sm:inline">{isSaving ? (tr(lang, 'topNav.saving')) : (tr(lang, 'topNav.save'))}</span>
          </button>

          {/* User Account / Auth Trigger */}
          <button
            onClick={() => { sound.playKeyClick(); onOpenAuth(); }}
            className={`px-2.5 py-1 rounded-xl border text-xs font-mono font-semibold flex items-center gap-1.5 transition cursor-pointer ${
              user
                ? 'theme-accent-soft theme-accent-border mutating-accent-text'
                : 'mutating-sub hover:opacity-90'
            }`}
          >
            {user ? <User className="w-3.5 h-3.5 mutating-accent-text" /> : <CloudOff className="w-3.5 h-3.5 theme-warn-text" />}
            <span className="hidden md:inline truncate max-w-[90px]">{user ? user.displayName?.split(' ')[0] || 'Operative' : (tr(lang, 'topNav.account'))}</span>
          </button>
        </div>

        </div>
      </header>
    </div>
  );
};
