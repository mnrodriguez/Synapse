// Review script: screenshots of the running dev server (bun run dev) with seeded saves.
// node docs/review2/screenshots.cjs [baseUrl] [outDir] [onlyManual]
const { chromium } = require('playwright');
const base = process.argv[2] || 'http://localhost:3000/';
const out = process.argv[3] || 'docs/review2/shots';
const onlyManual = process.argv[4] === 'manual';
const KEY = 'synapse_singularity_save_v1';
const seed = (v, extra = {}) => ({
  saveSchemaVersion: 11, hasCompletedOnboarding: true, tutorialCompleted: true, tutorialStep: 5, language: 'en', difficulty: 'normal',
  uiVersion: v, unlockedAllTabs: true, unlockedTabs: ['architecture', 'data', 'hardware', 'contracts', 'research', 'training', 'agents', 'singularity'],
  credits: [0, 850, 6400, 91000, 2400000][v], singularityProgress: [0, 18, 41, 72, 91][v], watchdogSuspicion: [0, 12, 33, 58, 77][v], gameSpeed: 0,
  completedContractsCount: 4, campaignDays: 9, gameDay: 10, loanAudited: true, singularityCrisisResolved: v >= 3, playerChoseResist: true,
  hardware: [{ id: 'gpu_gtx1060', count: 1 }, { id: 'gpu_rx580_dual', count: v >= 2 ? 2 : 0 }, { id: 'cool_air_basic', count: 1 }, { id: 'power_wall_socket', count: 1 }, { id: 'power_solar_array', count: 1 }, { id: 'net_gigabit', count: 1 }],
  ...extra
});
(async () => {
  const browser = await chromium.launch();
  const shot = async (page, name) => { await page.waitForTimeout(500); await page.screenshot({ path: `${out}/${name}.png` }); console.log('shot', name); };
  const open = async (ctx, save) => {
    const page = await ctx.newPage();
    await page.addInitScript(([k, s]) => { if (s) localStorage.setItem(k, s); else localStorage.removeItem(k); }, [KEY, save ? JSON.stringify(save) : null]);
    await page.goto(base, { waitUntil: 'domcontentloaded' });
    await page.waitForTimeout(3500);
    return page;
  };
  for (const [label, viewport] of [['desktop', { width: 1280, height: 900 }], ['mobile', { width: 390, height: 844 }]]) {
    const ctx = await browser.newContext({ viewport, deviceScaleFactor: 1, hasTouch: label === 'mobile', isMobile: label === 'mobile' });
    if (!onlyManual) {
      const start = await open(ctx, null);
      await shot(start, `${label}_start`);
      // walk a few onboarding steps to see how long it is
      for (let i = 1; i <= 3; i++) { const btn = start.locator('button').filter({ hasText: /next|continue|start|begin|initialize|confirm|siguiente/i }).last(); if (!(await btn.count())) break; await btn.click({ timeout: 2000 }).catch(() => {}); await shot(start, `${label}_start_step${i}`); }
      await start.close();
    }
    for (const v of [1, 2, 3, 4]) {
      const page = await open(ctx, seed(v));
      if (onlyManual) {
        const m = page.locator('button').filter({ hasText: /manual/i }).first();
        if (await m.count()) { await m.click().catch(() => {}); await shot(page, `${label}_v${v}_manual`); const ch = page.locator('button').filter({ hasText: /^2\./ }).first(); if (await ch.count()) { await ch.click().catch(() => {}); await shot(page, `${label}_v${v}_manual_decisions`); } }
        await page.close(); continue;
      }
      await shot(page, `${label}_v${v}_architecture`);
      if (label === 'desktop') {
        const n = await page.locator('button:has(span.nav-label)').count();
        for (let i = 0; i < n; i++) {
          const b = page.locator('button:has(span.nav-label)').nth(i);
          await b.click().catch(() => {});
          await shot(page, `${label}_v${v}_tab${i}`);
        }
      } else {
        const n = await page.locator('nav.bottom-nav-bar button').count();
        for (let i = 0; i < n; i++) { await page.locator('nav.bottom-nav-bar button').nth(i).click().catch(() => {}); await shot(page, `${label}_v${v}_nav${i}`); if (i === n - 1) await page.keyboard.press('Escape'); }
      }
      await page.close();
      // training report modal
      const rep = await open(ctx, seed(v, { lastTrainingReport: { modelName: 'SYNAPSE-Proto-28M', datasetName: 'Starter Corpus', isMicroModel: false, reasoningBefore: 14.2, reasoningAfter: 13.1, reasoningCeiling: 30, finalLoss: 1.9, finalValLoss: 3.4, outcome: 'overfit', epochsRun: 6, epochsPlanned: 6, bestEpoch: 1.3, learningRate: 'high', energyKwh: 2.1, energyCost: 0.38 } }));
      await shot(rep, `${label}_v${v}_training_report`);
      await rep.close();
    }
    // the 75% fork in v1 and v2 (no version check in the tick)
    if (!onlyManual) for (const v of [1, 2]) { const p = await open(ctx, seed(v, { singularityProgress: 76, singularityCrisisTriggered: true, singularityCrisisResolved: false })); await shot(p, `${label}_v${v}_fork_at_75`); await p.close(); }
    await ctx.close();
  }
  await browser.close();
})();
