/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useEffect, useMemo, useState } from 'react';
import { BookOpen, X, Download, FileText, ExternalLink, Lightbulb } from 'lucide-react';
import { sound } from '../audio/soundManager';
import { useGame } from '../context/GameContext';
import { tr } from '../i18n';
import { renderRich } from '../i18n/RichText';
import { MANUAL_PDF_URL } from '../utils/assets';
import { buildManual, manualParams, type ManualBlock, type UiVersion } from './manual/manualContent';

interface HelpManualProps {
  isOpen: boolean;
  onClose: () => void;
}

const ManualBlockView: React.FC<{ block: ManualBlock }> = ({ block }) => {
  switch (block.kind) {
    case 'heading': return <h5 className="theme-warn-text font-bold pt-1">{block.text}</h5>;
    case 'text': return <p><>{renderRich(block.text)}</></p>;
    case 'tip': return (
      <div className="p-2.5 theme-accent-soft border theme-accent-border rounded flex gap-2 items-start">
        <Lightbulb className="w-4 h-4 mutating-accent-text shrink-0 mt-0.5" />
        <span><>{renderRich(block.text)}</></span>
      </div>
    );
    case 'list': return (
      <ul className="list-disc list-inside space-y-1 mutating-text-muted text-[11px]">
        {block.items.map((item, i) => <li key={i}><>{renderRich(item)}</></li>)}
      </ul>
    );
    case 'table': return (
      <div className="overflow-x-auto">
        <table className="w-full text-[11px] border theme-border">
          <thead><tr>{block.headers.map((h, i) => <th key={i} className="text-left p-1.5 border theme-border mutating-accent-text">{h}</th>)}</tr></thead>
          <tbody>{block.rows.map((r, i) => <tr key={i}>{r.map((cell, j) => <td key={j} className="p-1.5 border theme-border align-top"><>{renderRich(cell)}</></td>)}</tr>)}</tbody>
        </table>
      </div>
    );
  }
};

export const HelpManual: React.FC<HelpManualProps> = ({ isOpen, onClose }) => {
  const { state } = useGame();
  const version = (Math.min(4, Math.max(1, state.uiVersion || 1))) as UiVersion;
  const chapters = useMemo(() => buildManual(state.language, version, state.difficulty), [state.language, version, state.difficulty]);
  const [activeSection, setActiveSection] = useState<string>('start');

  useEffect(() => {
    if (!isOpen) return;
    const onKey = (e: KeyboardEvent) => { if (e.key === 'Escape') onClose(); };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  const pdfUrl = MANUAL_PDF_URL;

  return (
    <div className="fixed inset-0 bg-black/80 backdrop-blur-sm z-50 flex items-center justify-center p-3 sm:p-4 font-mono select-none">
      <div className="theme-panel-bg border theme-accent-border rounded-lg max-w-5xl w-full max-h-[90vh] flex flex-col overflow-hidden">
        {/* Header */}
        <div className="flex items-center justify-between p-3.5 theme-panel-bg border-b theme-accent-border">
          <div className="flex items-center gap-2">
            <BookOpen className="w-4 h-4 mutating-accent-text" />
            <h3 className="font-bold text-sm mutating-accent-text tracking-wider">
              {tr(state.language, 'helpManual.officialTechnicalManualAiArchitecture')}
            </h3>
          </div>
          <div className="flex items-center gap-2">
            <a
              href={pdfUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="hidden sm:flex items-center gap-1.5 px-2.5 py-1 rounded theme-sub-bg border theme-border theme-text text-xs font-bold transition-all"
              title={tr(state.language, 'helpManual.openPdfNewTab')}
            >
              <ExternalLink className="w-3.5 h-3.5 mutating-accent-text" />
              <span>{tr(state.language, 'helpManual.openPdf')}</span>
            </a>
            <a
              href={pdfUrl}
              download="SYNAPSE_AI_Architecture_Manual.pdf"
              className="flex items-center gap-1.5 px-2.5 py-1 rounded theme-accent-soft border theme-accent-border mutating-accent-text text-xs font-bold transition-all"
              title={tr(state.language, 'helpManual.downloadOfficialAiTechnicalManual')}
            >
              <Download className="w-3.5 h-3.5 mutating-accent-text" />
              <span>{tr(state.language, 'helpManual.downloadPdf')}</span>
            </a>
            <button
              onClick={() => { sound.playNavSwitch(); onClose(); }}
              className="p-1 rounded mutating-text-muted"
              aria-label={tr(state.language, 'helpManual.closeManual')}
              title={tr(state.language, 'helpManual.closeManual')}
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* Section Tabs */}
        <div className="flex items-center gap-1 p-2 theme-panel-bg border-b theme-border text-xs overflow-x-auto">
          {[...chapters.map(c => ({ id: c.id as string, label: c.title })), { id: 'pdf', label: tr(state.language, 'helpManual.fullManualPdf') }].map(tab => (
            <button
              key={tab.id}
              onClick={() => { sound.playKeyClick(); setActiveSection(tab.id); }}
              className={`px-3 py-1 rounded transition-colors whitespace-nowrap ${
                activeSection === tab.id
                  ? 'theme-accent-soft border theme-accent-border mutating-accent-text font-bold'
                  : 'mutating-text-muted'
              }`}
            >
              {tab.label}
            </button>
          ))}
        </div>

        {/* Content Body */}
        <div className="flex-1 p-3 sm:p-4 overflow-y-auto space-y-4 text-xs theme-text leading-relaxed scrollbar-thin scrollbar-thumb-cyan-950">
          {chapters.filter(c => c.id === activeSection).map(c => (
            <div key={c.id} className="space-y-3">
              <h4 className="mutating-accent-text font-bold text-sm">{c.title}</h4>
              {c.blocks.map((b, i) => <ManualBlockView key={i} block={b} />)}
            </div>
          ))}

          {activeSection === 'pdf' && (
            <div className="flex flex-col h-[65vh] w-full space-y-2">
              <p className="text-[11px] mutating-text-muted">{tr(state.language, 'helpManual.pdfNote')}</p>
              <div className="flex flex-wrap items-center justify-between gap-2 p-2 theme-panel-bg border theme-accent-border rounded text-xs">
                <div className="flex items-center gap-2">
                  <FileText className="w-4 h-4 mutating-accent-text" />
                  <span className="font-bold mutating-accent-text">
                    {tr(state.language, 'helpManual.officialManualAiArchitecturesTraining')}
                  </span>
                </div>
                <div className="flex items-center gap-2">
                  <a
                    href={pdfUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="px-2.5 py-1 rounded theme-sub-bg border theme-border theme-text flex items-center gap-1.5 transition-colors"
                  >
                    <ExternalLink className="w-3.5 h-3.5" />
                    <span>{tr(state.language, 'helpManual.fullscreenView')}</span>
                  </a>
                  <a
                    href={pdfUrl}
                    download="SYNAPSE_AI_Architecture_Manual.pdf"
                    className="px-2.5 py-1 rounded mutating-btn-primary theme-on-accent font-bold flex items-center gap-1.5 transition-colors"
                  >
                    <Download className="w-3.5 h-3.5" />
                    <span>{tr(state.language, 'helpManual.downloadPdf')}</span>
                  </a>
                </div>
              </div>
              <div className="flex-1 w-full theme-sub-bg rounded border theme-accent-border overflow-hidden relative min-h-[420px]">
                <object
                  data={`${pdfUrl}#view=FitH`}
                  type="application/pdf"
                  className="w-full h-full min-h-[420px]"
                >
                  <iframe
                    src={`${pdfUrl}#view=FitH`}
                    className="w-full h-full min-h-[420px] border-0"
                    title="SYNAPSE AI Architecture Manual PDF"
                  >
                    <div className="p-8 text-center space-y-4">
                      <p className="mutating-text-muted">
                        {tr(state.language, 'helpManual.embeddedPdfViewerNotSupported')}
                      </p>
                      <a
                        href={pdfUrl}
                        download="SYNAPSE_AI_Architecture_Manual.pdf"
                        className="inline-flex items-center gap-2 px-4 py-2 mutating-btn-primary theme-on-accent font-bold rounded"
                      >
                        <Download className="w-4 h-4" />
                        {tr(state.language, 'helpManual.downloadOfficialPdfManual')}
                      </a>
                    </div>
                  </iframe>
                </object>
              </div>
            </div>
          )}

        </div>

        {/* Footer */}
        <div className="p-3 theme-panel-bg border-t theme-accent-border text-[11px] mutating-text-muted flex justify-end">
          <button
            onClick={() => { sound.playNavSwitch(); onClose(); }}
            className="px-3 py-1 theme-accent-soft mutating-accent-text border theme-accent-border rounded text-xs"
          >
            {tr(state.language, 'helpManual.closeManual')}
          </button>
        </div>
      </div>
    </div>
  );
};
