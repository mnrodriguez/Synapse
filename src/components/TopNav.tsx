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
  Home,
  Clock,
  Play,
  Pause,
  Languages,
  Volume2,
  VolumeX,
  FileText,
  RefreshCw,
  User,
  CloudOff,
  Monitor,
  Tablet,
  Smartphone,
  Zap
} from 'lucide-react';
import { sound } from '../audio/soundManager';
import { localize } from '../utils/i18n';
import { VERSION_PROFILES } from '../utils/versionProfiles';

export type ViewportMode = 'auto' | 'desktop' | 'tablet' | 'mobile';

export interface TopNavProps {
  viewportMode: ViewportMode;
  onSetViewportMode: (mode: ViewportMode) => void;
  onOpenManual: () => void;
  onOpenLeaderboard: () => void;
  onOpenAuth: () => void;
}

export const TopNav: React.FC<TopNavProps> = ({ 
  viewportMode, 
  onSetViewportMode, 
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
    saveGameToCloud,
    upgradeUiVersion,
    openUpgradeModal
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
  const nextVer = ver < 4 ? ((ver + 1) as 2 | 3 | 4) : 1;

  const getBrandIcon = () => {
    if (ver === 4) return <Skull className="w-4 h-4 text-white" />;
    if (ver === 3) return <ShieldAlert className="w-4 h-4 text-cyan-950" />;
    if (ver === 2) return <Cpu className="w-4 h-4 text-white" />;
    return <Sparkles className="w-4 h-4 text-white" />;
  };

  return (
    <div className="w-full flex flex-col z-30 shrink-0">
      {/* ================= PROTOTYPE MASTER TOP BAR ================= */}
      <header className="w-full bg-[#020409] border-b border-white/15 px-3 sm:px-5 py-2 sticky top-0 z-50 flex flex-wrap items-center justify-between gap-2.5 shadow-2xl">
        
        {/* Left: Device Viewport Switcher */}
        <div className="flex items-center gap-1.5">
          <div className="flex items-center bg-slate-900 p-0.5 sm:p-1 rounded-xl border border-white/10 text-xs">
            <button 
              onClick={() => { sound.playKeyClick(); onSetViewportMode('desktop'); }}
              className={`px-2.5 py-1 rounded-lg text-xs font-semibold flex items-center gap-1.5 transition cursor-pointer ${
                viewportMode === 'desktop' 
                  ? 'bg-cyan-400 text-slate-950 shadow font-bold' 
                  : 'text-slate-400 hover:text-white'
              }`}
              title="Force Desktop / Computer Mode"
            >
              <Monitor className="w-3.5 h-3.5" />
              <span className="hidden sm:inline">Desktop</span>
            </button>
            <button 
              onClick={() => { sound.playKeyClick(); onSetViewportMode('tablet'); }}
              className={`px-2.5 py-1 rounded-lg text-xs font-medium flex items-center gap-1.5 transition cursor-pointer ${
                viewportMode === 'tablet' 
                  ? 'bg-cyan-400 text-slate-950 shadow font-bold' 
                  : 'text-slate-400 hover:text-white'
              }`}
              title="Force Tablet Mode"
            >
              <Tablet className="w-3.5 h-3.5" />
              <span className="hidden sm:inline">Tablet</span>
            </button>
            <button 
              onClick={() => { sound.playKeyClick(); onSetViewportMode('mobile'); }}
              className={`px-2.5 py-1 rounded-lg text-xs font-medium flex items-center gap-1.5 transition cursor-pointer ${
                viewportMode === 'mobile' 
                  ? 'bg-cyan-400 text-slate-950 shadow font-bold' 
                  : 'text-slate-400 hover:text-white'
              }`}
              title="Force Mobile Mode"
            >
              <Smartphone className="w-3.5 h-3.5" />
              <span className="hidden sm:inline">Mobile</span>
            </button>
            <button 
              onClick={() => { sound.playKeyClick(); onSetViewportMode('auto'); }}
              className={`px-2 py-1 rounded-lg text-xs font-medium flex items-center gap-1 transition cursor-pointer ${
                viewportMode === 'auto' 
                  ? 'bg-amber-400 text-slate-950 shadow font-bold' 
                  : 'text-slate-500 hover:text-slate-300'
              }`}
              title="Auto Responsive Mode (switches with screen width)"
            >
              <Zap className="w-3 h-3" />
              <span className="hidden md:inline text-[10px]">Auto</span>
            </button>
          </div>
        </div>

        {/* Center: TEMPORARY VERSION CYCLER + QUICK JUMP PILLS */}
        <div className="flex flex-wrap items-center gap-2">
          {/* Primary Trojan Horse Upgrade Trigger Button */}
          <button 
            onClick={() => { sound.playNavSwitch(); openUpgradeModal(); }}
            className="px-3 py-1 rounded-xl bg-gradient-to-r from-amber-500 via-orange-500 to-rose-500 hover:brightness-110 text-slate-950 font-mono text-xs font-extrabold flex items-center gap-1.5 shadow-[0_0_20px_rgba(245,158,11,0.4)] transition transform active:scale-95 cursor-pointer"
            title="Trigger Trojan Horse AI Upgrade Modal"
          >
            <Zap className="w-3.5 h-3.5 fill-current text-slate-950" />
            <span className="text-[11px] uppercase tracking-tight">
              {ver < 4 ? `SWITCH TO NEW VERSION (v${ver} ➔ v${nextVer})` : 'SOVEREIGN CORE ACTIVE (v4)'}
            </span>
          </button>

          {/* Direct Quick-Jump Pills (v1 | v2 | v3 | v4) */}
          <div className="flex items-center bg-slate-900 p-0.5 sm:p-1 rounded-xl border border-white/10 font-mono text-xs">
            <button 
              onClick={() => { sound.playKeyClick(); upgradeUiVersion(1); }}
              className={`px-2 py-0.5 rounded-lg font-bold transition cursor-pointer text-xs ${
                ver === 1 
                  ? 'bg-blue-500 text-white shadow-sm' 
                  : 'text-slate-400 hover:text-white'
              }`}
              title="v1.0 Hobbyist Light Mode"
            >
              v1
            </button>
            <button 
              onClick={() => { sound.playKeyClick(); upgradeUiVersion(2); }}
              className={`px-2 py-0.5 rounded-lg font-bold transition cursor-pointer text-xs ${
                ver === 2 
                  ? 'bg-indigo-600 text-white shadow-sm' 
                  : 'text-slate-400 hover:text-white'
              }`}
              title="v2.0 Developer IDE Dark"
            >
              v2
            </button>
            <button 
              onClick={() => { sound.playKeyClick(); upgradeUiVersion(3); }}
              className={`px-2 py-0.5 rounded-lg font-bold transition cursor-pointer text-xs ${
                ver === 3 
                  ? 'bg-cyan-400 text-slate-950 shadow-sm font-black' 
                  : 'text-slate-400 hover:text-white'
              }`}
              title="v3.0 Tactical Blackbox Cyberpunk"
            >
              v3
            </button>
            <button 
              onClick={() => { sound.playKeyClick(); upgradeUiVersion(4); }}
              className={`px-2 py-0.5 rounded-lg font-bold transition cursor-pointer text-xs ${
                ver === 4 
                  ? 'bg-rose-600 text-white shadow-sm' 
                  : 'text-slate-400 hover:text-white'
              }`}
              title="v4.0 Sovereign Hostile ASI"
            >
              v4
            </button>
          </div>
        </div>

        {/* Right: Bilingual EN | ES, Audio, Speed, Save, Account */}
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
            className="px-2.5 py-1 rounded-xl bg-slate-900 hover:bg-slate-800 border border-white/10 text-[11px] font-bold text-slate-200 flex items-center gap-1 transition cursor-pointer"
            title="Open Official Systems Manual (PDF)"
          >
            <FileText className="w-3.5 h-3.5 text-cyan-400" />
            <span className="hidden sm:inline">MANUAL.PDF</span>
          </a>

          {/* Audio Mute Toggle */}
          <button
            onClick={toggleSound}
            className="p-1.5 rounded-xl bg-slate-900 hover:bg-slate-800 border border-white/10 text-[11px] transition cursor-pointer"
            title={soundMuted ? 'Unmute Audio' : 'Mute Audio'}
          >
            {soundMuted ? <VolumeX className="w-3.5 h-3.5 text-slate-500" /> : <Volume2 className="w-3.5 h-3.5 text-cyan-400" />}
          </button>

          {/* Simulation Speed Controls */}
          <div className="flex items-center bg-slate-900 p-0.5 rounded-xl border border-white/10">
            <button
              type="button"
              onClick={() => { sound.playKeyClick(); setGameSpeed(state.gameSpeed === 0 ? 1 : 0); }}
              className={`px-1.5 py-0.5 rounded text-[10px] font-bold flex items-center gap-1 transition-all cursor-pointer ${
                state.gameSpeed === 0
                  ? 'bg-amber-500 text-slate-950 font-black shadow-sm'
                  : 'text-slate-400 hover:text-white'
              }`}
              title="Pause / Resume (Space)"
            >
              {state.gameSpeed === 0 ? <Play className="w-2.5 h-2.5 fill-current" /> : <Pause className="w-2.5 h-2.5 fill-current" />}
            </button>
            <button
              type="button"
              onClick={() => { sound.playKeyClick(); setGameSpeed(1); }}
              className={`px-1.5 py-0.5 rounded text-[10px] font-bold transition-all cursor-pointer ${
                state.gameSpeed === 1 ? 'bg-cyan-500 text-slate-950 font-black' : 'text-slate-400 hover:text-white'
              }`}
              title="1x Speed"
            >
              1x
            </button>
            <button
              type="button"
              onClick={() => { sound.playKeyClick(); setGameSpeed(5); }}
              className={`px-1.5 py-0.5 rounded text-[10px] font-bold transition-all cursor-pointer ${
                state.gameSpeed === 5 ? 'bg-cyan-500 text-slate-950 font-black' : 'text-slate-400 hover:text-white'
              }`}
              title="5x Speed"
            >
              5x
            </button>
            <button
              type="button"
              onClick={() => { sound.playKeyClick(); setGameSpeed(20); }}
              className={`px-1.5 py-0.5 rounded text-[10px] font-bold transition-all cursor-pointer ${
                state.gameSpeed === 20 ? 'bg-cyan-500 text-slate-950 font-black' : 'text-slate-400 hover:text-white'
              }`}
              title="20x Speed"
            >
              20x
            </button>
          </div>

          {/* Cloud Save Button */}
          <button
            onClick={handleManualSave}
            disabled={isSaving || savingAnim}
            className="px-2 py-1 rounded-xl bg-slate-900 hover:bg-slate-800 border border-white/10 text-[11px] font-semibold text-slate-300 flex items-center gap-1 transition cursor-pointer"
            title="Save Progress to Cloud"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${isSaving || savingAnim ? 'animate-spin text-cyan-400' : 'text-slate-400'}`} />
            <span className="hidden lg:inline text-[10px]">
              {cloudSyncStatus === 'synced' ? 'SAVED' : isSaving || savingAnim ? 'SAVING' : 'SAVE'}
            </span>
          </button>

          {/* User Account / Profile */}
          <button
            onClick={() => { sound.playNavSwitch(); onOpenAuth(); }}
            className="px-2 py-1 rounded-xl bg-slate-900 hover:bg-slate-800 border border-white/10 text-[11px] font-semibold text-slate-300 flex items-center gap-1.5 transition cursor-pointer"
            title="User Account"
          >
            {user ? (
              <>
                {user.photoURL ? (
                  <img src={user.photoURL} alt="Avatar" className="w-3.5 h-3.5 rounded-full" />
                ) : (
                  <User className="w-3.5 h-3.5 text-cyan-400" />
                )}
                <span className="hidden sm:inline max-w-[80px] truncate">{state.callsign || user.displayName || user.email?.split('@')[0]}</span>
              </>
            ) : (
              <>
                <CloudOff className="w-3.5 h-3.5 text-slate-500" />
                <span className="hidden sm:inline text-[10px]">{localize(lang, 'ACCESO', 'SIGN IN')}</span>
              </>
            )}
          </button>
        </div>
      </header>

      {/* ================= DIEGETIC APP TITLE BAR ================= */}
      <div className="mutating-panel border-b px-4 py-2.5 flex flex-wrap items-center justify-between gap-2 z-20">
        <div className="flex items-center gap-2.5">
          <div 
            className="w-8 h-8 rounded-lg flex items-center justify-center font-bold shadow transition-all duration-300 shrink-0"
            style={{
              backgroundColor: ver === 4 ? '#ff003c' : ver === 3 ? '#00f0ff' : ver === 2 ? '#6366f1' : '#2563eb'
            }}
          >
            {getBrandIcon()}
          </div>
          <div>
            <div className="flex items-center gap-2 flex-wrap">
              <span className="font-bold text-sm tracking-tight">{p.appTitle}</span>
              <span 
                className="text-[10px] font-mono px-2 py-0.5 rounded-full font-semibold transition-colors"
                style={{
                  backgroundColor: ver === 4 ? 'rgba(255, 0, 60, 0.2)' : ver === 3 ? 'rgba(0, 240, 255, 0.15)' : ver === 2 ? 'rgba(99, 102, 241, 0.15)' : 'rgba(37, 99, 235, 0.12)',
                  color: ver === 4 ? '#ff003c' : ver === 3 ? '#00f0ff' : ver === 2 ? '#818cf8' : '#2563eb'
                }}
              >
                {p.badge}
              </span>
            </div>
            <p className="text-[11px] mutating-text-muted">{p.subtitle}</p>
          </div>
        </div>

        <div className="flex items-center gap-3 text-xs font-mono">
          <span className="px-2.5 py-1 mutating-sub text-[11px] flex items-center gap-1.5">
            <Home className="w-3.5 h-3.5 mutating-text-muted" />
            <span>{p.facility}</span>
          </span>
          <span 
            className="px-2.5 py-1 mutating-sub text-[11px] flex items-center gap-1.5 font-bold"
            title={localize(
              lang,
              `Día ${state.gameDay || 1} del mes ${state.gameMonth || 1}, año ${state.gameYear}`,
              `Day ${state.gameDay || 1} of month ${state.gameMonth || 1}, year ${state.gameYear}`
            )}
          >
            <Clock className="w-3.5 h-3.5 text-amber-500" />
            <span>
              {localize(lang, `Día ${state.gameDay || 1}`, `Day ${state.gameDay || 1}`)} · {String(state.gameHour ?? 8).padStart(2, '0')}:{String(state.gameMinute ?? 0).padStart(2, '0')}
            </span>
          </span>
        </div>
      </div>
    </div>
  );
};
