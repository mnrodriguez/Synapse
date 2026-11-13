/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useEffect, useState } from 'react';
import { Sparkles, KeyRound, Download, CheckCircle2 } from 'lucide-react';
import { useGame } from '../context/GameContext';
import { browserAiStatus, enableBrowserAi, type BrowserAiStatus } from '../services/aiService';
import { tr } from '../i18n';

// Where the in-game AI comes from: Chrome's built-in model, the player's own Gemini key, or the
// local generator. Shown in the account dialog.
export const AiSettingsPanel: React.FC = () => {
  const { state, missionAiApiKey, setMissionAiApiKey } = useGame();
  const lang = state.language;
  const [status, setStatus] = useState<BrowserAiStatus | null>(null);
  const [progress, setProgress] = useState<number | null>(null);
  const [failed, setFailed] = useState(false);
  const [draftKey, setDraftKey] = useState('');

  useEffect(() => {
    let alive = true;
    browserAiStatus().then(s => { if (alive) setStatus(s); });
    return () => { alive = false; };
  }, []);

  const enable = async () => {
    setFailed(false);
    setProgress(0);
    const ok = await enableBrowserAi(loaded => setProgress(loaded));
    setProgress(null);
    if (!ok) setFailed(true);
    setStatus(await browserAiStatus());
  };

  const provider = status === 'available'
    ? tr(lang, 'aiSettingsPanel.chromeSBuiltAi')
    : missionAiApiKey
      ? tr(lang, 'aiSettingsPanel.geminiKey')
      : tr(lang, 'aiSettingsPanel.localGeneratorNoAi');

  const statusText: Record<BrowserAiStatus, string> = {
    unsupported: tr(lang, 'aiSettingsPanel.browserHasNoBuiltAi'),
    unavailable: tr(lang, 'aiSettingsPanel.chromeCannotRunItsModel'),
    downloadable: tr(lang, 'aiSettingsPanel.modelCanDownloadedAbout2'),
    downloading: tr(lang, 'aiSettingsPanel.chromeDownloadingModel'),
    available: tr(lang, 'aiSettingsPanel.enabledReadyNoInternetUse')
  };

  return (
    <section className="p-3 rounded border theme-border theme-sub-bg space-y-3" aria-labelledby="ai-settings-title">
      <h4 id="ai-settings-title" className="flex items-center gap-1.5 font-bold text-xs mutating-accent-text">
        <Sparkles className="w-4 h-4" />
        {tr(lang, 'aiSettingsPanel.aiAssistant')}
      </h4>
      <p className="text-[11px] mutating-text-muted">
        {tr(lang, 'aiSettingsPanel.useNow')} <strong className="theme-text">{provider}</strong>
      </p>

      {/* Chrome's built-in model */}
      <div className="space-y-1.5">
        <p className="font-bold text-[11px]">{tr(lang, 'aiSettingsPanel.browserAiFree')}</p>
        <p className="text-[11px] mutating-text-muted flex items-start gap-1">
          {status === 'available' && <CheckCircle2 className="w-3.5 h-3.5 theme-success-text shrink-0" aria-hidden="true" />}
          {status === null ? tr(lang, 'aiSettingsPanel.checking') : statusText[status]}
        </p>
        {(status === 'downloadable' || status === 'downloading') && (
          <button
            type="button"
            onClick={enable}
            disabled={progress !== null}
            className="w-full py-1.5 rounded mutating-btn-primary text-[11px] font-bold flex items-center justify-center gap-1.5 disabled:opacity-60 cursor-pointer"
          >
            <Download className="w-3.5 h-3.5" />
            {progress !== null
              ? tr(lang, 'aiSettingsPanel.downloading', { progress: Math.round(progress * 100) })
              : tr(lang, 'aiSettingsPanel.enableBrowserAi')}
          </button>
        )}
        {failed && (
          <p className="text-[11px] theme-danger-text" role="alert">
            {tr(lang, 'aiSettingsPanel.couldNotEnabledTryAgain')}
          </p>
        )}
      </div>

      {/* The player's own Gemini key */}
      <div className="space-y-1.5">
        <p className="font-bold text-[11px] flex items-center gap-1"><KeyRound className="w-3.5 h-3.5" />{tr(lang, 'aiSettingsPanel.geminiKeyOptional')}</p>
        <p className="text-[11px] mutating-text-muted">
          {tr(lang, 'aiSettingsPanel.storedOnlyBrowserNotUploaded')}
        </p>
        {missionAiApiKey ? (
          <div className="flex items-center justify-between gap-2">
            <span className="text-[11px] font-mono">••••{missionAiApiKey.slice(-4)}</span>
            <button
              type="button"
              onClick={() => setMissionAiApiKey('')}
              className="px-2 py-1 rounded border theme-danger-border theme-danger-text text-[11px] cursor-pointer"
            >
              {tr(lang, 'aiSettingsPanel.deleteKey')}
            </button>
          </div>
        ) : (
          <form
            className="flex gap-1.5"
            onSubmit={e => { e.preventDefault(); if (draftKey.trim()) { setMissionAiApiKey(draftKey); setDraftKey(''); } }}
          >
            <input
              type="password"
              autoComplete="off"
              value={draftKey}
              onChange={e => setDraftKey(e.target.value)}
              placeholder={tr(lang, 'aiSettingsPanel.googleAiStudioKey')}
              aria-label={tr(lang, 'aiSettingsPanel.geminiKey2')}
              className="flex-1 min-w-0 rounded border theme-border theme-panel-bg px-2 py-1 text-[11px]"
            />
            <button type="submit" disabled={!draftKey.trim()} className="px-2 py-1 rounded mutating-btn-primary text-[11px] font-bold disabled:opacity-50 cursor-pointer">
              {tr(lang, 'aiSettingsPanel.save')}
            </button>
          </form>
        )}
      </div>
    </section>
  );
};
