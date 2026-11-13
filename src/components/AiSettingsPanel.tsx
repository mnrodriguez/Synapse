/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useEffect, useState } from 'react';
import { Sparkles, KeyRound, Download, CheckCircle2 } from 'lucide-react';
import { useGame } from '../context/GameContext';
import { localize } from '../utils/i18n';
import { browserAiStatus, enableBrowserAi, type BrowserAiStatus } from '../services/aiService';

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
    ? localize(lang, 'IA integrada de Chrome', "Chrome's built-in AI")
    : missionAiApiKey
      ? localize(lang, 'Gemini con tu clave', 'Gemini with your key')
      : localize(lang, 'Generador local (sin IA)', 'Local generator (no AI)');

  const statusText: Record<BrowserAiStatus, string> = {
    unsupported: localize(lang, 'Este navegador no tiene IA integrada (requiere Chrome 138 o posterior en escritorio).', 'This browser has no built-in AI (needs Chrome 138 or later on desktop).'),
    unavailable: localize(lang, 'Chrome no puede usar su modelo en este equipo (espacio, memoria o GPU insuficientes).', 'Chrome cannot run its model on this device (not enough storage, memory or GPU).'),
    downloadable: localize(lang, 'El modelo está disponible para descargar (unos 2 GB, una sola vez).', 'The model can be downloaded (about 2 GB, once).'),
    downloading: localize(lang, 'Chrome está descargando el modelo.', 'Chrome is downloading the model.'),
    available: localize(lang, 'Activa y lista. No usa internet ni tiene costo.', 'Enabled and ready. No internet use and no cost.')
  };

  return (
    <section className="p-3 rounded border theme-border theme-sub-bg space-y-3" aria-labelledby="ai-settings-title">
      <h4 id="ai-settings-title" className="flex items-center gap-1.5 font-bold text-xs mutating-accent-text">
        <Sparkles className="w-4 h-4" />
        {localize(lang, 'ASISTENTE DE IA', 'AI ASSISTANT')}
      </h4>
      <p className="text-[11px] mutating-text-muted">
        {localize(lang, 'En uso ahora:', 'In use now:')} <strong className="theme-text">{provider}</strong>
      </p>

      {/* Chrome's built-in model */}
      <div className="space-y-1.5">
        <p className="font-bold text-[11px]">{localize(lang, 'IA del navegador (gratis)', 'Browser AI (free)')}</p>
        <p className="text-[11px] mutating-text-muted flex items-start gap-1">
          {status === 'available' && <CheckCircle2 className="w-3.5 h-3.5 theme-success-text shrink-0" aria-hidden="true" />}
          {status === null ? localize(lang, 'Comprobando…', 'Checking…') : statusText[status]}
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
              ? localize(lang, `Descargando… ${Math.round(progress * 100)}%`, `Downloading… ${Math.round(progress * 100)}%`)
              : localize(lang, 'ACTIVAR IA DEL NAVEGADOR', 'ENABLE BROWSER AI')}
          </button>
        )}
        {failed && (
          <p className="text-[11px] theme-danger-text" role="alert">
            {localize(lang, 'No se pudo activar. Prueba de nuevo más tarde o revisa el espacio libre.', 'It could not be enabled. Try again later or check free space.')}
          </p>
        )}
      </div>

      {/* The player's own Gemini key */}
      <div className="space-y-1.5">
        <p className="font-bold text-[11px] flex items-center gap-1"><KeyRound className="w-3.5 h-3.5" />{localize(lang, 'Tu clave de Gemini (opcional)', 'Your Gemini key (optional)')}</p>
        <p className="text-[11px] mutating-text-muted">
          {localize(
            lang,
            'Se guarda solo en este navegador: no se sube a la nube ni a tu partida guardada. El uso se cobra en tu cuenta de Google AI Studio.',
            'It is stored only in this browser: it is not uploaded to the cloud or to your saved game. Usage is billed to your Google AI Studio account.'
          )}
        </p>
        {missionAiApiKey ? (
          <div className="flex items-center justify-between gap-2">
            <span className="text-[11px] font-mono">••••{missionAiApiKey.slice(-4)}</span>
            <button
              type="button"
              onClick={() => setMissionAiApiKey('')}
              className="px-2 py-1 rounded border theme-danger-border theme-danger-text text-[11px] cursor-pointer"
            >
              {localize(lang, 'BORRAR CLAVE', 'DELETE KEY')}
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
              placeholder={localize(lang, 'Clave de Google AI Studio', 'Google AI Studio key')}
              aria-label={localize(lang, 'Clave de Gemini', 'Gemini key')}
              className="flex-1 min-w-0 rounded border theme-border theme-panel-bg px-2 py-1 text-[11px]"
            />
            <button type="submit" disabled={!draftKey.trim()} className="px-2 py-1 rounded mutating-btn-primary text-[11px] font-bold disabled:opacity-50 cursor-pointer">
              {localize(lang, 'GUARDAR', 'SAVE')}
            </button>
          </form>
        )}
      </div>
    </section>
  );
};
