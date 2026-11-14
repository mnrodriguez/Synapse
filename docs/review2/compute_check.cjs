// Browser check for the compute budget work: launches two contracts in a row without touching the agent
// picker, cancels one, and screenshots the HUD, the board, the training tab and the autonomy panel.
// Needs the dev server:  bun run dev   then   node docs/review2/compute_check.cjs
const { chromium } = require('playwright');
const out = 'docs/review2/shots_compute';
const KEY = 'synapse_singularity_save_v1';
const model = { id: 'm1', name: 'SYNAPSE-Proto-28M', topology: 'transformer', parametersCount: 28000000, contextWindow: 2048, attention: 'standard_mha', quantization: 'int8', lossFunction: 'cross_entropy', activeDataSources: ['data_relational_sql'], reasoningScore: 21, vramRequiredGb: 1, computeRequiredPflops: 0.001, modelType: 'general', inferenceParams: { temperature: 0.6, topP: 0.7, topK: 40, repetitionPenalty: 1.1, systemPrompt: '' } };
const agent = (id, role, auto) => ({ id, name: id, role, modelId: 'm1', modelName: model.name, status: 'active', alignmentScore: 92, autonomyLevel: 1, revenuePerSec: 1, suspicionPerSec: 0.05, toolsGranted: ['web_search'], lastThought: '', escapesAttempted: 0, inferenceParams: model.inferenceParams, autoMissionEnabled: auto });
const seed = (v, extra = {}) => ({
  saveSchemaVersion: 12, hasCompletedOnboarding: true, tutorialCompleted: true, tutorialStep: 5, language: 'en', difficulty: 'normal', uiVersion: v,
  unlockedAllTabs: true, unlockedTabs: ['architecture', 'data', 'hardware', 'contracts', 'research', 'training', 'agents', 'singularity'],
  credits: 900, singularityProgress: 14, watchdogSuspicion: 8, gameSpeed: 0, completedContractsCount: 3, campaignDays: 9, gameDay: 10, loanAudited: true,
  currentModel: model, savedModels: [model], agents: [agent('Ada', 'researcher', false), agent('Bo', 'researcher', false), agent('Cy', 'economist', false), agent('Di', 'arbitrageur', false)],
  hardware: [{ id: 'gpu_gtx1060', count: 1 }, { id: 'cool_air_basic', count: 1 }, { id: 'power_wall_socket', count: 1 }, { id: 'net_gigabit', count: 1 }],
  ...extra
});
(async () => {
  const browser = await chromium.launch();
  const results = [];
  for (const [label, viewport] of [['desktop', { width: 1280, height: 900 }], ['mobile', { width: 390, height: 844 }]]) {
    const ctx = await browser.newContext({ viewport, deviceScaleFactor: 1, hasTouch: label === 'mobile', isMobile: label === 'mobile' });
    const open = async save => { const page = await ctx.newPage(); await page.addInitScript(([k, s]) => localStorage.setItem(k, s), [KEY, JSON.stringify(save)]); await page.goto('http://localhost:3000/', { waitUntil: 'domcontentloaded' }); await page.waitForTimeout(3500); return page; };
    const shot = async (page, name) => { await page.waitForTimeout(400); await page.screenshot({ path: `${out}/${label}_${name}.png`, fullPage: label === 'desktop' ? false : false }); };
    const tab = async (page, id) => { if (label === 'desktop') await page.locator('button:has(span.nav-label)').nth(id).click(); else { const map = { 1: 1, 4: 3, 5: 4 }; await page.locator('nav.bottom-nav-bar button').nth(map[id]).click(); } await page.waitForTimeout(500); };
    for (const v of [1, 4]) {
      const page = await open(seed(v, v === 4 ? { contracts: undefined } : {}));
      await tab(page, 4);
      await shot(page, `v${v}_board_before`);
      const deploy = () => page.locator('button:not([disabled])').filter({ hasText: /deploy on contract|deploy|execute/i });
      const n0 = await deploy().count();
      if (n0 > 0) { await deploy().first().click(); await page.waitForTimeout(600); }
      const n1 = await deploy().count();
      if (n1 > 0) { await deploy().first().click(); await page.waitForTimeout(600); }
      const running = await page.locator('button').filter({ hasText: /^cancel$/i }).count();
      await page.evaluate(() => window.scrollTo(0, 0));
      await shot(page, `v${v}_board_two_running`);
      const cancel = page.locator('button').filter({ hasText: /^cancel$/i }).first();
      let afterCancel = running;
      if (running > 0) { await cancel.click(); await shot(page, `v${v}_board_cancel_confirm`); await page.locator('button').filter({ hasText: /^confirm/i }).first().click(); await page.waitForTimeout(600); afterCancel = await page.locator('button').filter({ hasText: /^cancel$/i }).count(); }
      results.push({ label, v, launchableBefore: n0, launchableAfterFirst: n1, runningAfterTwoLaunches: running, runningAfterCancel: afterCancel, hud: (await page.locator('text=/in use/i').first().textContent().catch(() => null)) });
      await tab(page, 1); await shot(page, `v${v}_training`);
      await tab(page, 5); await shot(page, `v${v}_agents`);
      await page.close();
    }
    await ctx.close();
  }
  console.log(JSON.stringify(results, null, 1));
  await browser.close();
})();
