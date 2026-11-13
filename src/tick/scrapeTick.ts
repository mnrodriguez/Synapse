/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import type { CustomDataset, GameState } from '../types/game';
import { DATASET_TIER_CONFIGS } from '../utils/constants';
import { estimateTrainingSeconds } from '../utils/training';
import { effectCollector } from './effects';
import { tr } from '../i18n';

// One tick of the active data scraping job; finishing it adds a custom dataset.
export interface ScrapeInput {
  prev: GameState;
  powerTripSeconds: number;
  totalComputePflops: number;
  now: number;
}

export function scrapeTick(input: ScrapeInput) {
  const { prev, powerTripSeconds, totalComputePflops, now } = input;
  const { effects, log: addLog, play } = effectCollector();
  // 5b. Active Dataset Scraping & Generation Tick
  let updatedScrapeJob = prev.activeScrapeJob;
  let updatedCustomDatasets = prev.customDatasets;
  if (prev.activeScrapeJob) {
    const job = prev.activeScrapeJob;
    const paused = powerTripSeconds > 0;
    if (!paused) {
      const tierConfig = DATASET_TIER_CONFIGS[job.tier] || DATASET_TIER_CONFIGS[1];
      const computeRatio = Math.max(0.2, Math.min(3.5, totalComputePflops / Math.max(0.01, tierConfig.computePflopsRequired)));
      const scrapeProgressInc = (100 / Math.max(10, tierConfig.durationSeconds)) * computeRatio;
      const newProgress = Math.min(100, job.progressPercent + scrapeProgressInc);
      const remainingSeconds = estimateTrainingSeconds(100 - newProgress, scrapeProgressInc);

      if (newProgress >= 100) {
        play('breakthrough');
        const newDataset: CustomDataset = {
          id: `dataset_${job.domain}_${now}`,
          name: `${job.domainLabel} (T${job.tier})`,
          domain: job.domain,
          domainLabel: job.domainLabel,
          tier: job.tier,
          tokensCount: tierConfig.targetTokensMillions,
          qualityScore: tierConfig.qualityScore,
          computeSpentPflops: tierConfig.computePflopsRequired,
          generatedByModelId: job.assignedModelId,
          generatedByModelName: job.assignedModelName,
          createdAt: now,
          description: tr(prev.language, 'scrapeTick.specializedDomainDatasetSynthesizedTier', { assignedModelName: job.assignedModelName, tier: job.tier, targetTokensMillions: tierConfig.targetTokensMillions })
        };
        updatedCustomDatasets = [...prev.customDatasets, newDataset];
        updatedScrapeJob = null;
        addLog(
          tr(prev.language, 'scrapeTick.dataModuleCustomDatasetGenerated', { name: newDataset.name, tokensCount: newDataset.tokensCount, qualityScore: newDataset.qualityScore }),
          'success'
        );
      } else {
        updatedScrapeJob = {
          ...job,
          progressPercent: Number(newProgress.toFixed(1)),
          timeRemainingSeconds: remainingSeconds
        };
      }
    }
  }


  return { updatedScrapeJob, updatedCustomDatasets, effects };
}
