/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState } from 'react';
import { ExternalLink, BookOpen, Sparkles, X, Info } from 'lucide-react';
import { DocEntry } from '../utils/aiDocumentation';
import { sound } from '../audio/soundManager';
import { tr } from '../i18n';

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
          title={tr((isEs ? 'es' : 'en'), 'docLinkBadge.viewOfficialDocs', { title: doc.title })}
          className={`inline-flex items-center gap-1 px-1.5 py-0.5 rounded text-[11px] font-mono tracking-wider transition-all cursor-pointer border select-none ${
            doc.type === 'official'
              ? 'theme-accent-soft mutating-accent-text theme-accent-border'
              : doc.type === 'research_paper'
              ? 'theme-accent-soft mutating-accent-text theme-accent-border'
              : 'theme-success-soft theme-success-text theme-success-border'
          } ${className}`}
        >
          <BookOpen className="w-2.5 h-2.5" />
          <span>{tr((isEs ? 'es' : 'en'), 'docLinkBadge.docs')}</span>
          <ExternalLink className="w-2.5 h-2.5 opacity-70" />
        </span>
      )}

      {variant === 'button' && (
        <button
          type="button"
          onClick={handleClick}
          className={`inline-flex items-center gap-1.5 px-2 py-1 rounded text-[11px] font-mono font-bold transition-all border cursor-pointer ${
            doc.type === 'official'
              ? 'theme-accent-soft mutating-accent-text theme-accent-border'
              : 'theme-accent-soft mutating-accent-text theme-accent-border'
          } ${className}`}
        >
          <BookOpen className="w-3 h-3 mutating-accent-text" />
          <span>{tr((isEs ? 'es' : 'en'), 'docLinkBadge.technicalDocs')}</span>
          <ExternalLink className="w-3 h-3" />
        </button>
      )}

      {variant === 'icon' && (
        <button
          type="button"
          onClick={handleClick}
          title={tr((isEs ? 'es' : 'en'), 'docLinkBadge.viewOfficialDocs', { title: doc.title })}
          className={`p-1 rounded mutating-accent-text transition-colors border theme-accent-border cursor-pointer ${className}`}
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
            className="theme-panel-bg border theme-accent-border rounded-xl max-w-lg w-full p-4 sm:p-5 font-mono text-xs select-none space-y-3"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Header */}
            <div className="flex items-start justify-between gap-2 border-b theme-accent-border pb-2.5">
              <div className="flex items-center gap-2">
                <div className="p-1.5 rounded theme-accent-soft border theme-accent-border mutating-accent-text">
                  <BookOpen className="w-4 h-4" />
                </div>
                <div>
                  <span className="text-[11px] mutating-accent-text uppercase tracking-widest block font-bold">
                    {doc.category}
                  </span>
                  <h3 className="text-sm font-bold theme-text leading-snug">
                    {doc.title}
                  </h3>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setModalOpen(false)}
                className="p-1 mutating-text-muted rounded transition-colors cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* Organization & Paper Type */}
            <div className="flex items-center gap-2 text-[11px]">
              <span className="px-2 py-0.5 rounded theme-sub-bg border theme-border theme-text">
                {tr((isEs ? 'es' : 'en'), 'docLinkBadge.sourceAuthor')} <strong className="mutating-accent-text">{doc.organization}</strong>
              </span>
              <span className={`px-2 py-0.5 rounded text-[11px] font-bold border ${
                doc.type === 'official'
                  ? 'theme-success-soft theme-success-text theme-success-border'
                  : doc.type === 'research_paper'
                  ? 'theme-accent-soft mutating-accent-text theme-accent-border'
                  : 'theme-warn-soft theme-warn-text theme-warn-border'
              }`}>
                {doc.type === 'official' ? (tr((isEs ? 'es' : 'en'), 'docLinkBadge.officialSpec')) : doc.type === 'research_paper' ? (tr((isEs ? 'es' : 'en'), 'docLinkBadge.arxivResearchPaper')) : (tr((isEs ? 'es' : 'en'), 'docLinkBadge.theoreticalFoundation'))}
              </span>
            </div>

            {/* Explanation / Summary */}
            <div className="p-3 theme-panel-bg border theme-accent-border rounded-lg space-y-1.5 theme-text text-xs leading-relaxed">
              <p>{isEs ? doc.summaryEs : doc.summaryEn}</p>
              {doc.keySpecs && (
                <div className="mt-2 pt-2 border-t theme-border text-[11px] mutating-accent-text font-mono">
                  <span className="mutating-text-muted">{tr((isEs ? 'es' : 'en'), 'docLinkBadge.keySpecifications')}</span>
                  {doc.keySpecs}
                </div>
              )}
            </div>

            {/* Real Link Action */}
            <div className="pt-2 flex items-center justify-between border-t theme-accent-border">
              <span className="text-[11px] mutating-text-muted">
                {tr((isEs ? 'es' : 'en'), 'docLinkBadge.opensNewTabInspectReal')}
              </span>
              <a
                href={doc.url}
                target="_blank"
                rel="noopener noreferrer"
                className="px-3.5 py-1.5 rounded theme-gradient theme-on-accent font-bold text-xs flex items-center gap-1.5 transition-all cursor-pointer"
              >
                <span>{tr((isEs ? 'es' : 'en'), 'docLinkBadge.openRealSource')}</span>
                <ExternalLink className="w-3.5 h-3.5" />
              </a>
            </div>
          </div>
        </div>
      )}
    </>
  );
};
