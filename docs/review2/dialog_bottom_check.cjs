// Browser check at phone size: the last button of the game-over dialog is visible and not under the bottom bar.
const { chromium } = require('playwright');
const KEY = 'synapse_singularity_save_v1';
(async () => {
  const browser = await chromium.launch();
  const ctx = await browser.newContext({ viewport: { width: 390, height: 700 }, deviceScaleFactor: 1, hasTouch: true, isMobile: true });
  const page = await ctx.newPage();
  const save = { saveSchemaVersion: 13, hasCompletedOnboarding: true, tutorialCompleted: true, tutorialStep: 5, language: 'en', uiVersion: 1, gameSpeed: 0, gameOverReason: 'agency_seizure', watchdogSuspicion: 100, campaignDays: 106, singularityProgress: 16.5, suspicionTotals: { agents: 9.4, missions: 61.5, overload: 0, scraping: 4.2, trading: 0, faded: 12.6 }, seenStoryEvents: ['loan_audit'], storyChoices: ['loan_audit'], hardware: [{ id: 'gpu_gtx1060', count: 1 }] };
  await page.addInitScript(([k, s]) => localStorage.setItem(k, s), [KEY, JSON.stringify(save)]);
  await page.goto('http://localhost:3000/', { waitUntil: 'domcontentloaded' });
  await page.waitForTimeout(3500);
  const last = page.locator('.fixed.inset-0 button').last();
  await last.scrollIntoViewIfNeeded();
  await page.waitForTimeout(300);
  const box = await last.boundingBox();
  const hit = await page.evaluate(([x, y]) => { const el = document.elementFromPoint(x, y); return el ? (el.closest('nav') ? 'bottom bar' : el.closest('button')?.innerText || el.tagName) : null; }, [box.x + box.width / 2, box.y + box.height / 2]);
  console.log(JSON.stringify({ lastButton: await last.innerText(), bottomOfButton: Math.round(box.y + box.height), viewportHeight: 700, elementOnTop: hit }));
  await page.screenshot({ path: 'docs/review2/shots_weekly/game_over_bottom.png' });
  await browser.close();
})();
