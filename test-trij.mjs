import { chromium } from '/home/moses/Desktop/trij/node_modules/playwright/index.mjs';

const BASE = 'http://localhost:5173';

async function main() {
  const browser = await chromium.launch({ headless: true });
  const ctx = await browser.newContext({ viewport: { width: 1280, height: 800 } });
  const errors = [];

  // Collect all console errors
  ctx.on('page', (page) => {
    page.on('pageerror', (err) => {
      errors.push({ type: 'pageerror', url: page.url(), message: err.message, stack: err.stack });
    });
    page.on('console', (msg) => {
      if (msg.type() === 'error') {
        errors.push({ type: 'console-error', url: page.url(), message: msg.text() });
      }
    });
    page.on('response', (resp) => {
      if (!resp.ok()) {
        errors.push({ type: 'http-error', url: page.url(), status: resp.status(), resource: resp.url() });
      }
    });
  });

  try {
    // 1. Login page
    console.log('1. Opening login page...');
    const page = await ctx.newPage();
    await page.goto(`${BASE}/login`, { waitUntil: 'networkidle' });
    await page.waitForTimeout(3000);
    console.log(`   Login page loaded. Errors so far: ${errors.length}`);

    // 2. Click "Continue without account" (offline demo mode)
    console.log('2. Clicking "Continue without account"...');
    const continueBtn = page.locator('button', { hasText: /continue without account/i });
    if (await continueBtn.count() > 0) {
      await continueBtn.click();
      await page.waitForTimeout(2000);
      console.log(`   Clicked continue. Errors: ${errors.length}`);
    } else {
      // Try finding any button that leads to offline mode
      const allText = await page.textContent('body');
      console.log(`   Could not find "Continue without account" button. Page text: ${allText.substring(0, 200)}`);
      
      // Try entering offline mode via localStorage
      console.log('   Trying direct login via localStorage...');
      await page.evaluate(() => {
        const fakeId = crypto.randomUUID();
        const fakeUser = { id: fakeId, email: 'demo@trij.local', name: 'Demo User' };
        window.localStorage.setItem('trij-session', JSON.stringify({ state: { offlineUser: fakeUser }, version: 0 }));
      });
      await page.goto(`${BASE}/dashboard`, { waitUntil: 'networkidle' });
      await page.waitForTimeout(3000);
    }

    // 3. Navigate to Settings
    console.log('3. Navigating to /settings...');
    await page.goto(`${BASE}/settings`, { waitUntil: 'networkidle' });
    await page.waitForTimeout(3000);
    console.log(`   Settings page loaded. Errors: ${errors.length}`);

    // 4. Navigate to Triage
    console.log('4. Navigating to /triage...');
    await page.goto(`${BASE}/triage`, { waitUntil: 'networkidle' });
    await page.waitForTimeout(3000);
    console.log(`   Triage page loaded. Errors: ${errors.length}`);

    // 5. Navigate to Dashboard
    console.log('5. Navigating to /dashboard...');
    await page.goto(`${BASE}/dashboard`, { waitUntil: 'networkidle' });
    await page.waitForTimeout(3000);
    console.log(`   Dashboard page loaded. Errors: ${errors.length}`);

    // 6. Navigate to Patients
    console.log('6. Navigating to /patients...');
    await page.goto(`${BASE}/patients`, { waitUntil: 'networkidle' });
    await page.waitForTimeout(3000);
    console.log(`   Patients page loaded. Errors: ${errors.length}`);

    // 7. Navigate to FAQ
    console.log('7. Navigating to /faq...');
    await page.goto(`${BASE}/faq`, { waitUntil: 'networkidle' });
    await page.waitForTimeout(3000);
    console.log(`   FAQ page loaded. Errors: ${errors.length}`);

    // 8. Navigate to Help
    console.log('8. Navigating to /help...');
    await page.goto(`${BASE}/help`, { waitUntil: 'networkidle' });
    await page.waitForTimeout(3000);
    console.log(`   Help page loaded. Errors: ${errors.length}`);

    // Print all errors
    console.log('\n========== RESULTS ==========');
    if (errors.length === 0) {
      console.log('✅ NO ERRORS FOUND — All pages load without crashes');
    } else {
      console.log(`❌ ${errors.length} ERROR(S) FOUND:\n`);
      errors.forEach((e, i) => {
        console.log(`--- Error ${i + 1} ---`);
        console.log(`  Type: ${e.type}`);
        console.log(`  URL:  ${e.url}`);
        console.log(`  Msg:  ${e.message}`);
        if (e.stack) console.log(`  Stack: ${e.stack.split('\n').slice(0, 3).join('\n')}`);
        if (e.resource) console.log(`  Resource: ${e.resource}`);
        if (e.status) console.log(`  Status: ${e.status}`);
        console.log();
      });
    }
  } catch (err) {
    console.error('Test script error:', err.message);
  } finally {
    await browser.close();
  }
}

main();
