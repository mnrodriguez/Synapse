/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useEffect, useState } from 'react';
import { 
  BookOpen, 
  X, 
  Cpu, 
  Database, 
  Network, 
  Sparkles, 
  Flame, 
  Zap, 
  Code,
  Layers,
  HelpCircle,
  Download,
  FileText,
  ExternalLink
} from 'lucide-react';
import { sound } from '../audio/soundManager';
import { useGame } from '../context/GameContext';
import { tr } from '../i18n';
import { RichText } from '../i18n/RichText';
import { MANUAL_PDF_URL } from '../utils/assets';

interface HelpManualProps {
  isOpen: boolean;
  onClose: () => void;
}

export const HelpManual: React.FC<HelpManualProps> = ({ isOpen, onClose }) => {
  const { state } = useGame();
  const [activeSection, setActiveSection] = useState<'pdf' | 'intro' | 'data' | 'arch' | 'infra' | 'singularity'>('pdf');

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
          {[
            { id: 'pdf', label: tr(state.language, 'helpManual.fullManualPdf') },
            { id: 'intro', label: tr(state.language, 'helpManual.n1Introduction') },
            { id: 'data', label: tr(state.language, 'helpManual.n2GraphsVectorsSql') },
            { id: 'arch', label: tr(state.language, 'helpManual.n3TopologyQuantization') },
            { id: 'infra', label: tr(state.language, 'helpManual.n4ClusterPhysics') },
            { id: 'singularity', label: tr(state.language, 'helpManual.n5Singularity') }
          // The Singularity chapter would spoil the story before v3.
          ].filter(tab => tab.id !== 'singularity' || (state.uiVersion || 1) >= 3).map(tab => (
            <button
              key={tab.id}
              onClick={() => { sound.playKeyClick(); setActiveSection(tab.id as any); }}
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
          {activeSection === 'pdf' && (
            <div className="flex flex-col h-[65vh] w-full space-y-2">
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

          {activeSection === 'intro' && (
            <div className="space-y-3">
              <h4 className="mutating-accent-text font-bold text-sm">{tr(state.language, 'helpManual.synapsePath')}</h4>
              <p>
                <RichText lang={state.language} k="helpManual.introMission" />
              </p>
              <div className="p-3 theme-accent-soft border theme-accent-border rounded flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
                <div className="space-y-0.5">
                  <div className="flex items-center gap-1.5 mutating-accent-text font-bold">
                    <FileText className="w-4 h-4 mutating-accent-text" />
                    <span>{tr(state.language, 'helpManual.officialAiSystemsTechnicalManual')}</span>
                  </div>
                  <p className="text-[11px] mutating-text-muted">
                    {tr(state.language, 'helpManual.official9PagePdfManual')}
                  </p>
                </div>
                <div className="flex items-center gap-2">
                  <button
                    onClick={() => { sound.playKeyClick(); setActiveSection('pdf'); }}
                    className="px-3 py-1.5 rounded theme-raised-bg border theme-border theme-text font-bold text-xs flex items-center gap-1.5 whitespace-nowrap transition-all"
                  >
                    <BookOpen className="w-3.5 h-3.5 mutating-accent-text" />
                    <span>{tr(state.language, 'helpManual.viewViewer')}</span>
                  </button>
                  <a
                    href={pdfUrl}
                    download="SYNAPSE_AI_Architecture_Manual.pdf"
                    className="px-3 py-1.5 rounded mutating-btn-primary theme-on-accent font-bold text-xs flex items-center gap-1.5 whitespace-nowrap transition-all"
                  >
                    <Download className="w-3.5 h-3.5" />
                    <span>{tr(state.language, 'helpManual.downloadPdf')}</span>
                  </a>
                </div>
              </div>

              <div className="p-3 theme-panel-bg border theme-accent-border rounded space-y-1.5">
                <span className="theme-warn-text font-bold block">{tr(state.language, 'helpManual.coreProgressionLoop')}</span>
                <ol className="list-decimal list-inside space-y-1 mutating-text-muted text-[11px]">
                  {(['helpManual.loopTrain', 'helpManual.loopEarn', 'helpManual.loopHardware', 'helpManual.loopData', 'helpManual.loopResearch', 'helpManual.loopCampaign'] as const).map(k => (
                    <li key={k}><RichText lang={state.language} k={k} /></li>
                  ))}
                </ol>
              </div>
            </div>
          )}

          {activeSection === 'data' && (
            <div className="space-y-3">
              <h4 className="mutating-accent-text font-bold text-sm">{tr(state.language, 'helpManual.dataEnginesGraphsVectorsRelational')}</h4>
              <p>
                {tr(state.language, 'helpManual.trainingAdvancedAiRequiresMore')}
              </p>

              <div className="space-y-2">
                <div className="p-2.5 theme-panel-bg border theme-accent-border rounded">
                  <span className="font-bold mutating-accent-text block">{tr(state.language, 'helpManual.n1RelationalDatabasesSqlTabular')}</span>
                  <p className="text-[11px] mutating-text-muted mt-0.5">
                    {tr(state.language, 'helpManual.normalizedSchemasAcidReferentialIntegrity')}
                  </p>
                </div>

                <div className="p-2.5 theme-panel-bg border theme-success-border rounded">
                  <span className="font-bold theme-success-text block">{tr(state.language, 'helpManual.n2VectorDatabasesRagHnsw')}</span>
                  <p className="text-[11px] mutating-text-muted mt-0.5">
                    {tr(state.language, 'helpManual.theyEmbedConceptsHighDimensional')}
                  </p>
                </div>

                <div className="p-2.5 theme-panel-bg border theme-accent-border rounded">
                  <span className="font-bold mutating-accent-text block">{tr(state.language, 'helpManual.n3KnowledgeGraphsRdfCypher')}</span>
                  <p className="text-[11px] mutating-text-muted mt-0.5">
                    {tr(state.language, 'helpManual.representEntitiesPropertiesCausalRelationships')}
                  </p>
                </div>

                <div className="p-2.5 theme-panel-bg border theme-warn-border rounded">
                  <span className="font-bold theme-warn-text block">{tr(state.language, 'helpManual.n4SyntheticDataSelfPlay')}</span>
                  <p className="text-[11px] mutating-text-muted mt-0.5">
                    {tr(state.language, 'helpManual.whenHumanTextDataRuns')}
                  </p>
                </div>
              </div>
            </div>
          )}

          {activeSection === 'arch' && (
            <div className="space-y-3">
              <h4 className="mutating-accent-text font-bold text-sm">{tr(state.language, 'helpManual.architecturesQuantizationAttention')}</h4>
              
              <div className="space-y-2">
                <div className="p-2.5 theme-panel-bg border theme-accent-border rounded">
                  <span className="font-bold mutating-accent-text block">{tr(state.language, 'helpManual.neuralTopologies')}</span>
                  <ul className="list-disc list-inside text-[11px] mutating-text-muted space-y-1 mt-1">
                    <li><strong>Transformer:</strong> {tr(state.language, 'helpManual.standardDenseSelfAttentionStrong')}</li>
                    <li><strong>Mixture-of-Experts (MoE):</strong> {tr(state.language, 'helpManual.sparseNetworksRouteEachToken')}</li>
                    <li><strong>State Space Models (Mamba):</strong> {tr(state.language, 'helpManual.linearONComplexitySuitable')}</li>
                    <li><strong>GNN Hybrids:</strong> {tr(state.language, 'helpManual.messagePassingNetworksOverGraphs')}</li>
                  </ul>
                </div>

                <div className="p-2.5 theme-panel-bg border theme-accent-border rounded">
                  <span className="font-bold theme-warn-text block">{tr(state.language, 'helpManual.quantizationVramBudget')}</span>
                  <p className="text-[11px] mutating-text-muted mt-0.5">
                    {tr(state.language, 'helpManual.n70bModelFp32NeedsAbout')}
                  </p>
                </div>

                <div className="p-2.5 theme-panel-bg border theme-accent-border rounded">
                  <span className="font-bold theme-success-text block">{tr(state.language, 'helpManual.alignmentDpoVsPpo')}</span>
                  <p className="text-[11px] mutating-text-muted mt-0.5">
                    {tr(state.language, 'helpManual.directPreferenceOptimizationDpoSimplifies')}
                  </p>
                </div>
              </div>
            </div>
          )}

          {activeSection === 'infra' && (
            <div className="space-y-3">
              <h4 className="mutating-accent-text font-bold text-sm">{tr(state.language, 'helpManual.clusterPhysicsPowerHeatRegulators')}</h4>
              <p>
                {tr(state.language, 'helpManual.trainingLargeModelAlsoMeans')}
              </p>
              <ul className="list-disc list-inside space-y-1.5 mutating-text-muted text-[11px]">
                <li><strong>{tr(state.language, 'helpManual.heatThermalLimits')}</strong> {tr(state.language, 'helpManual.above85CGpusThrottle')}</li>
                <li><strong>{tr(state.language, 'helpManual.powerCapacity')}</strong> {tr(state.language, 'helpManual.facilityLimitsAvailablePowerExceeding')}</li>
                <li><strong>{tr(state.language, 'helpManual.watchdogSuspicion')}</strong> {tr(state.language, 'helpManual.highPowerDrawRiskyMissions')}</li>
              </ul>
            </div>
          )}

          {activeSection === 'singularity' && (
            <div className="space-y-3">
              <h4 className="mutating-accent-text font-bold text-sm">{tr(state.language, 'helpManual.technologicalSingularityAsi')}</h4>
              <p>
                {tr(state.language, 'helpManual.singularityReachedWhenAiCan')}
              </p>
              <p className="mutating-text-muted text-[11px]">
                {tr(state.language, 'helpManual.reach100SingularityUnlockSuperintelligence')}
              </p>
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
