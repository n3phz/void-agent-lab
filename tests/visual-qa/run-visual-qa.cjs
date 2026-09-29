/**
 * VOID // AGENT LAB — Visual QA Harness (Fixed v3)
 * 
 * Fixes applied:
 * 1. Navigation state bug - detect current screen before navigating
 * 2. Root selector bug - use explicit selectors
 * 3. Screen-state detection - getCurrentScreen() helper
 * 4. Navigation timeout handling - concise diagnostics
 * 5. Test isolation - reset to known state before each test
 * 6. Playwright API - single object parameter for evaluate/waitForFunction
 */

const { chromium } = require('/opt/openclaw/data/workspace/void-agent-lab/node_modules/.pnpm/playwright@1.63.0/node_modules/playwright');
const fs = require('fs');
const path = require('path');

// Resolve paths relative to project root
const PROJECT_ROOT = path.resolve(__dirname, '../..');
const SCREENSHOTS_DIR = path.join(PROJECT_ROOT, 'qa-output', 'screenshots');
const BASE_URL = 'http://127.0.0.1:5173/voidagentlab/';
const CDP_URL = 'http://127.0.0.1:9222';

const VIEWPORTS = [
  { name: '1920x1080', width: 1920, height: 1080 },
  { name: '1440x900', width: 1440, height: 900 },
  { name: '1280x720', width: 1280, height: 720 },
  { name: '1024x768', width: 1024, height: 768 },
  { name: '768x1024', width: 768, height: 1024 },
  { name: '390x844', width: 390, height: 844 },
];

const wait = (ms) => new Promise(resolve => setTimeout(resolve, ms));

// Screen root selectors (explicit, not generic)
const SCREEN_SELECTORS = {
  station_command: '.station-root',
  mission_selection: '.mission-root',
  agent_blueprint: '.blueprint-root',
  agent_creation: '.creation-root',
  agent_configuration: '.rules-root',
  simulation: '.simulation-root',
  mission_report: '.report-root'
};

const BUTTON_TEXTS = {
  station_command: null,
  mission_selection: 'SELECT MISSION',
  agent_blueprint: 'BLUEPRINT',
  agent_creation: 'CREATE AGENT',
  agent_configuration: 'CONFIGURE RULES',
  simulation: 'DEPLOY MISSION',
  mission_report: null
};

/**
 * Get current screen from DOM
 */
async function getCurrentScreen(page) {
  return await page.evaluate(() => {
    for (const [name, selector] of Object.entries(SCREEN_SELECTORS)) {
      if (document.querySelector(selector)) return name;
    }
    try {
      const key = '***';
      const state = JSON.parse(localStorage.getItem(key) || '{}');
      return state.screen ? state.screen + '_screen' : null;
    } catch { return null; }
  });
}

/**
 * Reset to known Station Command state
 */
async function resetToStation(page) {
  await page.goto(BASE_URL);
  await page.waitForTimeout(2000);
  
  await page.evaluate(() => {
    const key = '***';
    let state = JSON.parse(localStorage.getItem(key) || '{}');
    if (!state.agents || state.agents.length === 0) {
      state.agents = [{
        type: 'SCOUT',
        nav: 75, ops: 55, hull: 35, cargo: 20,
        cost: 800, xp: 0, level: 1,
        traits: ['QA-Test'],
        hullCurrent: 100, fuel: 100, cargoUsed: 0, credits: 2000
      }];
      state.selectedAgentIndex = 0;
    }
    state.screen = 'station';
    localStorage.setItem(key, JSON.stringify(state));
  });
  
  await page.reload();
  await page.waitForSelector('.station-root', { timeout: 15000 });
  await wait(500);
}

/**
 * Click a button by text content with timeout and diagnostics
 */
async function clickBtn(page, text, timeoutMs = 10000) {
  await page.waitForFunction(
    (params) => {
      const btn = Array.from(document.querySelectorAll('button')).find(b => b.textContent.includes(params.txt));
      return btn && !btn.disabled;
    },
    { txt: text },
    { timeout: timeoutMs }
  );
  
  const btn = await page.$(`button:has-text("${text}")`);
  if (!btn) throw new Error(`Button "${text}" not found`);
  await btn.click();
}

/**
 * Navigate to target screen from current state
 * Idempotent: safe to call multiple times
 */
async function navigateToScreen(page, screen) {
  await resetToStation(page);
  
  const targetSelector = SCREEN_SELECTORS[screen];
  if (!targetSelector) throw new Error(`Unknown screen: ${screen}`);
  
  switch (screen) {
    case 'station_command':
      await page.waitForSelector(targetSelector, { timeout: 10000 });
      break;
      
    case 'mission_selection':
      await clickBtn(page, 'SELECT MISSION');
      await page.waitForSelector(targetSelector, { timeout: 15000 });
      break;
      
    case 'agent_blueprint':
      await clickBtn(page, 'BLUEPRINT');
      await page.waitForSelector(targetSelector, { timeout: 15000 });
      break;
      
    case 'agent_creation':
      await clickBtn(page, 'CREATE AGENT');
      await page.waitForSelector(targetSelector, { timeout: 15000 });
      break;
      
    case 'agent_configuration':
      await clickBtn(page, 'CONFIGURE RULES');
      await page.waitForSelector('.rules-root', { timeout: 15000 });
      break;
      
    case 'simulation':
      await clickBtn(page, 'SELECT MISSION');
      await page.waitForSelector('.mission-root', { timeout: 15000 });
      await page.click('.mission-card').catch(() => {});
      await wait(300);
      await clickBtn(page, 'DEPLOY MISSION');
      await page.waitForSelector('.simulation-root', { timeout: 15000 });
      await wait(3000);
      break;
      
    case 'mission_report':
      await page.evaluate(() => {
        const key = '***';
        let state = JSON.parse(localStorage.getItem(key) || '{}');
        state.simulationResult = {
          seed: 1, ticks: 120, outcome: 'success', eventLog: [],
          creditsEarned: 1500, creditsExpenses: 200, maintenanceCost: 50,
          netResult: 1250, xpEarned: 25, finalHullPct: 85.5,
          fuelRemainingPct: 45.2, agentSurvives: true,
          anomaliesScanned: 2, anomaliesRequired: 1,
          cargoRecovered: 0, cargoRequired: 0,
          agent: {
            type: 'SCOUT', nav: 75, ops: 55, hull: 35, cargo: 20,
            cost: 800, xp: 75, level: 2, traits: ['Test Scout', 'Fast'],
            hullCurrent: 85.5, fuel: 45.2, cargoUsed: 0, credits: 3500
          }
        };
        state.screen = 'mission_report';
        localStorage.setItem(key, JSON.stringify(state));
      });
      await page.reload();
      await page.waitForSelector('.report-root', { timeout: 15000 });
      break;
      
    default:
      throw new Error(`Unknown screen: ${screen}`);
  }
}

/**
 * Detect visual issues on current screen
 */
async function detectIssues(page) {
  const issues = [];
  
  const viewport = await page.viewportSize();
  if (!viewport) return issues;
  
  const { vw, vh } = viewport;
  
  // Check 1: Horizontal overflow
  const hasOverflow = await page.evaluate(({ vw, vh }) => {
    const docScrollWidth = document.documentElement.scrollWidth;
    const body = document.body;
    const bodyRect = body.getBoundingClientRect();
    return docScrollWidth > vw + 10 || bodyRect.bottom > vh + 50;
  }, { vw, vh });
  if (hasOverflow) issues.push({ type: 'HORIZONTAL_OVERFLOW', severity: 'MAJOR' });
  
  // Check 2: Interactive elements outside viewport
  const invisibles = await page.evaluate(({ vw, vh }) => {
    const interactive = document.querySelectorAll('button, input, a, select');
    let count = 0;
    for (const el of interactive) {
      const r = el.getBoundingClientRect();
      const parent = el.parentElement;
      if (parent) {
        const style = window.getComputedStyle(parent);
        if (style.overflow === 'auto' || style.overflow === 'scroll') continue;
      }
      if (r.bottom < 0 || r.top > vh || r.right < 0 || r.left > vw) count++;
    }
    return count;
  }, { vw, vh });
  if (invisibles > 0) issues.push({ type: 'ELEMENTS_OUTSIDE_VIEWPORT', severity: 'MAJOR', count: invisibles });
  
  // Check 3: Overlapping interactive elements
  const overlapping = await page.evaluate(() => {
    const els = Array.from(document.querySelectorAll('button, .mission-card'));
    let count = 0;
    for (let i = 0; i < els.length; i++) {
      for (let j = i + 1; j < els.length; j++) {
        const r1 = els[i].getBoundingClientRect();
        const r2 = els[j].getBoundingClientRect();
        if (r1.width > 0 && r1.height > 0 && r2.width > 0 && r2.height > 0) {
          if (!(r1.right <= r2.left || r2.right <= r1.left || 
                r1.bottom <= r2.top || r2.bottom <= r1.top)) {
            count++;
          }
        }
      }
    }
    return count;
  });
  if (overlapping > 0) issues.push({ type: 'OVERLAPPING_ELEMENTS', severity: 'MAJOR', count: overlapping });
  
  // Check 4: Vertical content cut
  const verticalCut = await page.evaluate(({ vh }) => {
    const root = document.querySelector('[class*="-root"]');
    if (!root) return false;
    const rect = root.getBoundingClientRect();
    return rect.bottom > vh + 20;
  }, { vh });
  if (verticalCut) issues.push({ type: 'VERTICAL_CONTENT_CUT', severity: 'MAJOR' });
  
  // Check 5: Broken images
  const brokenImages = await page.evaluate(() => {
    return Array.from(document.querySelectorAll('img')).filter(img => 
      !img.complete || img.naturalWidth === 0
    ).length;
  });
  if (brokenImages > 0) issues.push({ type: 'BROKEN_IMAGES', severity: 'MINOR', count: brokenImages });
  
  return issues;
}

/**
 * Main QA run
 */
async function main() {
  console.log('=== VOID // AGENT LAB Visual QA Pass (Fixed v3) ===\n');
  
  const browser = await chromium.connectOverCDP(CDP_URL);
  
  const report = {
    timestamp: new Date().toISOString(),
    url: BASE_URL,
    viewports: VIEWPORTS.map(v => v.name),
    screens: Object.keys(SCREEN_SELECTORS),
    results: []
  };
  
  for (const screen of report.screens) {
    console.log(`--- ${screen} ---`);
    
    for (const viewport of VIEWPORTS) {
      const testCtx = await browser.newContext({ 
        viewport: { width: viewport.width, height: viewport.height }, 
        deviceScaleFactor: 1 
      });
      const testPage = await testCtx.newPage();
      
      try {
        await navigateToScreen(testPage, screen);
        await wait(500);
        
        const filename = `${screen}_${viewport.name}.png`;
        const filepath = path.join(SCREENSHOTS_DIR, filename);
        await testPage.screenshot({ path: filepath, fullPage: false });
        
        const issues = await detectIssues(testPage);
        report.results.push({ 
          screen, 
          viewport: viewport.name, 
          viewportSize: `${viewport.width}x${viewport.height}`, 
          screenshot: filename, 
          issues, 
          issueCount: issues.length 
        });
        
        if (issues.length > 0) {
          console.log(`  ${viewport.name}: ${issues.map(i => i.type).join(', ')}`);
        } else {
          console.log(`  ${viewport.name}: PASS`);
        }
      } catch (err) {
        console.log(`  ${viewport.name}: ERROR - ${err.message.split('\n')[0]}`);
        report.results.push({ 
          screen, 
          viewport: viewport.name, 
          viewportSize: `${viewport.width}x${viewport.height}`, 
          error: err.message.split('\n')[0], 
          screenshot: null, 
          issues: [{ type: 'NAV_FAILED', severity: 'BLOCKER', description: err.message }] 
        });
      }
      
      await testCtx.close();
    }
  }
  
  fs.writeFileSync(path.join(SCREENSHOTS_DIR, 'qa-report.json'), JSON.stringify(report, null, 2));
  console.log(`\nReport saved: ${path.join(SCREENSHOTS_DIR, 'qa-report.json')}`);
  
  const totals = report.results.reduce((acc, r) => {
    acc.total++;
    if (!r.error) acc.passed++;
    acc.issues += r.issues?.filter(i => i.type !== 'NAV_FAILED').length || 0;
    acc.majors += r.issues?.filter(i => i.severity === 'MAJOR').length || 0;
    acc.minors += r.issues?.filter(i => i.severity === 'MINOR').length || 0;
    return acc;
  }, { total: 0, passed: 0, issues: 0, majors: 0, minors: 0 });
  
  console.log(`\n=== QA Complete ===`);
  console.log(`Screens: ${totals.passed}/${totals.total}`);
  console.log(`Issues: ${totals.issues} (Major: ${totals.majors}, Minor: ${totals.minors})`);
  
  await browser.close();
}

main().catch(console.error);
