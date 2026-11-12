/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState } from 'react';
import { ExternalLink, BookOpen, Sparkles, X, Info } from 'lucide-react';
import { DocEntry } from '../utils/aiDocumentation';
import { sound } from '../audio/soundManager';

interface DocLinkBadgeProps {
  doc: DocEntry;
  language?: 'es' | 'en';
  variant?: 'badge' | 'button' | 'icon';
  className?: string;
}

export const DocLinkBadge: React.FC<DocLinkBadgeProps> = ({ 
  doc, 
  language = 'en',
  variant = 'badge',
  className = ''
}) => {
  const [modalOpen, setModalOpen] = useState(false);

  const handleClick = (e: React.MouseEvent) => {
    e.stopPropagation();
    sound.playKeyClick();
    setModalOpen(true);
  };

  const isEs = language === 'es';

  return (
    <>
      {variant === 'badge' && (
        <span
          role="button"
          tabIndex={0}
          onClick={handleClick}
          onKeyDown={(e) => {
            if (e.key === 'Enter' || e.key === ' ') {
              e.preventDefault();
              handleClick(e as unknown as React.MouseEvent);
            }
          }}
          title={isEs ? `Ver documentación real: ${doc.title}` : `View official docs: ${doc.title}`}
          className={`inline-flex items-center gap-1 px-1.5 py-0.5 rounded text-[9px] font-mono tracking-wider transition-all cursor-pointer border select-none ${
            doc.type === 'official'
              ? 'bg-cyan-950/50 hover:bg-cyan-900/60 text-cyan-300 border-cyan-700/50 hover:border-cyan-400'
              : doc.type === 'research_paper'
              ? 'bg-purple-950/50 hover:bg-purple-900/60 text-purple-300 border-purple-700/50 hover:border-purple-400'
              : 'bg-emerald-950/50 hover:bg-emerald-900/60 text-emerald-300 border-emerald-700/50 hover:border-emerald-400'
          } ${className}`}
        >
          <BookOpen className="w-2.5 h-2.5" />
          <span>{isEs ? 'GUÍA' : 'DOCS'}</span>
          <ExternalLink className="w-2.5 h-2.5 opacity-70" />
        </span>
      )}

      {variant === 'button' && (
        <button
          type="button"
          onClick={handleClick}
          className={`inline-flex items-center gap-1.5 px-2 py-1 rounded text-[10px] font-mono font-bold transition-all border cursor-pointer ${
            doc.type === 'official'
              ? 'bg-cyan-950/70 hover:bg-cyan-900 text-cyan-300 border-cyan-600/60 hover:shadow-[0_0_10px_rgba(0,255,200,0.2)]'
              : 'bg-purple-950/70 hover:bg-purple-900 text-purple-200 border-purple-600/60 hover:shadow-[0_0_10px_rgba(168,85,247,0.2)]'
          } ${className}`}
        >
          <BookOpen className="w-3 h-3 text-cyan-400" />
          <span>{isEs ? 'DOCUMENTACIÓN TÉCNICA' : 'TECHNICAL DOCS'}</span>
          <ExternalLink className="w-3 h-3" />
        </button>
      )}

      {variant === 'icon' && (
        <button
          type="button"
          onClick={handleClick}
          title={isEs ? `Ver documentación real: ${doc.title}` : `View official docs: ${doc.title}`}
          className={`p-1 rounded text-cyan-400 hover:text-cyan-200 hover:bg-cyan-950/60 transition-colors border border-cyan-800/40 hover:border-cyan-500 cursor-pointer ${className}`}
        >
          <ExternalLink className="w-3 h-3" />
        </button>
      )}

      {/* Cyberpunk Documentation Modal */}
      {modalOpen && (
        <div 
          className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm animate-fadeIn"
          onClick={(e) => { e.stopPropagation(); setModalOpen(false); }}
        >
          <div 
            className="bg-[#080d16] border border-cyan-500/60 rounded-xl max-w-lg w-full p-4 sm:p-5 shadow-[0_0_35px_rgba(0,255,200,0.2)] font-mono text-xs select-none space-y-3"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Header */}
            <div className="flex items-start justify-between gap-2 border-b border-cyan-900/60 pb-2.5">
              <div className="flex items-center gap-2">
                <div className="p-1.5 rounded bg-cyan-950 border border-cyan-600/40 text-cyan-400">
                  <BookOpen className="w-4 h-4" />
                </div>
                <div>
                  <span className="text-[10px] text-cyan-400 uppercase tracking-widest block font-bold">
                    {doc.category}
                  </span>
                  <h3 className="text-sm font-bold text-zinc-100 leading-snug">
                    {doc.title}
                  </h3>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setModalOpen(false)}
                className="p-1 text-zinc-400 hover:text-zinc-100 hover:bg-zinc-800 rounded transition-colors cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* Organization & Paper Type */}
            <div className="flex items-center gap-2 text-[11px]">
              <span className="px-2 py-0.5 rounded bg-zinc-900 border border-zinc-700/60 text-zinc-300">
                {isEs ? 'Fuente / Autor:' : 'Source / Author:'} <strong className="text-cyan-300">{doc.organization}</strong>
              </span>
              <span className={`px-2 py-0.5 rounded text-[10px] font-bold border ${
                doc.type === 'official'
                  ? 'bg-emerald-950/60 text-emerald-300 border-emerald-600/40'
                  : doc.type === 'research_paper'
                  ? 'bg-purple-950/60 text-purple-300 border-purple-600/40'
                  : 'bg-amber-950/60 text-amber-300 border-amber-600/40'
              }`}>
                {doc.type === 'official' ? (isEs ? 'ESPECIFICACIÓN OFICIAL' : 'OFFICIAL SPEC') : doc.type === 'research_paper' ? (isEs ? 'PAPER ARXÍV / I+D' : 'ARXIV RESEARCH PAPER') : (isEs ? 'FUNDAMENTO TEÓRICO' : 'THEORETICAL FOUNDATION')}
              </span>
            </div>

            {/* Explanation / Summary */}
            <div className="p-3 bg-[#05080e] border border-cyan-950 rounded-lg space-y-1.5 text-zinc-300 text-xs leading-relaxed">
              <p>{isEs ? doc.summaryEs : doc.summaryEn}</p>
              {doc.keySpecs && (
                <div className="mt-2 pt-2 border-t border-zinc-800/80 text-[11px] text-cyan-400 font-mono">
                  <span className="text-zinc-500">{isEs ? 'Especificaciones Clave: ' : 'Key Specifications: '}</span>
                  {doc.keySpecs}
                </div>
              )}
            </div>

            {/* Real Link Action */}
            <div className="pt-2 flex items-center justify-between border-t border-cyan-900/40">
              <span className="text-[10px] text-zinc-500">
                {isEs ? 'Abre en nueva pestaña para estudiar el concepto real.' : 'Opens in a new tab to inspect the real-world material.'}
              </span>
              <a
                href={doc.url}
                target="_blank"
                rel="noopener noreferrer"
                className="px-3.5 py-1.5 rounded bg-gradient-to-r from-cyan-500 to-emerald-400 hover:from-cyan-400 hover:to-emerald-300 text-zinc-950 font-bold text-xs flex items-center gap-1.5 shadow-[0_0_12px_rgba(0,255,200,0.3)] transition-all cursor-pointer"
              >
                <span>{isEs ? 'ABRIR FUENTE REAL' : 'OPEN REAL SOURCE'}</span>
                <ExternalLink className="w-3.5 h-3.5" />
              </a>
            </div>
          </div>
        </div>
      )}
    </>
  );
};
