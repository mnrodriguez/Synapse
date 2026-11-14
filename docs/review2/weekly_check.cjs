// Browser check: the weekly report appears when a game week closes, the suspicion warning dialog opens,
// and the early game-over screen names no end goal. Needs the dev server (bun run dev).
const { chromium } = require('playwright');
const out = 'docs/review2/shots_weekly';
const KEY = 'synapse_singularity_save_v1';
const model = { id: 'm1', name: 'SYNAPSE-Genesis-28M', topology: 'transformer', parametersCount: 28000000, contextWindow: 2048, attention: 'standard_mha', quantization: 'int8', lossFunction: 'cross_entropy', activeDataSources: ['data_relational_sql'], reasoningScore: 21.7, vramRequiredGb: 1, computeRequiredPflops: 0.001, modelType: 'general', inferenceParams: { temperature: 0.6, topP: 0.7, topK: 40, repetitionPenalty: 1.1, systemPrompt: '' } };
const sources = { agents: 9.4, missions: 61.5, overload: 0, scraping: 4.2, trading: 0, faded: 12.6 };
const seed = (extra = {}) => ({
  saveSchemaVersion: 13, hasCompletedOnboarding: true, tutorialCompleted: true, tutorialStep: 5, language: 'en', difficulty: 'normal', uiVersion: 1,
  unlockedAllTabs: true, unlockedTabs: ['architecture', 'data', 'hardware', 'contracts', 'research', 'training', 'agents', 'singularity'],
  credits: 931, singularityProgress: 14, watchdogSuspicion: 22, gameSpeed: 1, completedContractsCount: 3, loanAudited: true,
  currentModel: model, savedModels: [model], agents: [],
  researchTree: [{ id: 'res_bpe_tokenizer', unlocked: true }], announcedResearchIds: ['res_bpe_tokenizer'],
  hardware: [{ id: 'gpu_gtx1060', count: 1 }, { id: 'cool_air_basic', count: 1 }, { id: 'power_wall_socket', count: 1 }, { id: 'net_gigabit', count: 1 }],
  ...extra
});
const riskyAgent = { id: 'a', name: 'a', role: 'exploit_synth', modelId: 'm1', modelName: 'm', status: 'active', alignmentScore: 90, autonomyLevel: 1, revenuePerSec: 1, suspicionPerSec: 8, toolsGranted: ['bash_exec'], lastThought: '', escapesAttempted: 0, inferenceParams: model.inferenceParams, autoMissionEnabled: false };
(async () => {
  const browser = await chromium.launch();
  const ctx = await browser.newContext({ viewport: { width: 390, height: 844 }, deviceScaleFactor: 1, hasTouch: true, isMobile: true });
  const open = async save => {
    const page = await ctx.newPage();
    await page.addInitScript(([k, s]) => localStorage.setItem(k, s), [KEY, JSON.stringify(save)]);
    await page.goto('http://localhost:3000/', { waitUntil: 'domcontentloaded' });
    await page.waitForTimeout(3500);
    return page;
  };
  const res = {};

  // 1. Two ticks before the end of day 7: the report must open by itself and pause the game.
  let page = await open(seed({ campaignDays: 6, gameDay: 7, dayTicks: 45, weekStats: { startSuspicion: 9, sources: { agents: 2.1, missions: 14.5, overload: 0, scraping: 1.4, trading: 0, faded: 5 }, creditsEarned: 610, missionsOk: 4, missionsFailed: 1 } }));
  await page.waitForTimeout(4000);
  res.weeklyTitle = await page.locator('#weekly-report-title').textContent().catch(() => null);
  res.weeklyText = (await page.locator('[aria-labelledby="weekly-report-title"]').innerText().catch(() => '')).replace(/\n+/g, ' | ').slice(0, 800);
  await page.screenshot({ path: `${out}/weekly_report.png` });
  await page.locator('[aria-labelledby="weekly-report-title"] button').last().click().catch(() => {});
  await page.waitForTimeout(500);
  res.weeklyClosed = (await page.locator('#weekly-report-title').count()) === 0;
  await page.close();

  // 2. Crossing 50 %: the warning dialog.
  page = await open(seed({ watchdogSuspicion: 49.9, campaignDays: 2, agents: [riskyAgent] }));
  await page.waitForTimeout(3000);
  res.warningTitle = await page.locator('#story-event-title').textContent().catch(() => null);
  await page.screenshot({ path: `${out}/suspicion_warning.png` });
  await page.close();

  // 3. Early game over (v1).
  page = await open(seed({ gameSpeed: 0, gameOverReason: 'agency_seizure', watchdogSuspicion: 100, campaignDays: 106, singularityProgress: 16.5, suspicionTotals: sources, seenStoryEvents: ['loan_audit'], storyChoices: ['loan_audit'] }));
  const body = (await page.locator('body').innerText()).replace(/\n+/g, ' | ');
  res.gameOverNamesGoal = /singularit|swarm|first permission/i.test(body);
  res.gameOverHasBreakdown = /What raised/i.test(body);
  await page.screenshot({ path: `${out}/game_over_v1.png`, fullPage: true });
  await page.close();

  console.log(JSON.stringify(res, null, 1));
  await browser.close();
})();
