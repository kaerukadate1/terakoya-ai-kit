const { chromium } = require('playwright');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');

const url = process.env.MYTOOLS_URL || 'http://127.0.0.1:8812/';
const output = process.env.MYTOOLS_QA_DIR || path.join(__dirname, '..', 'qa');
fs.mkdirSync(output, { recursive: true });

(async () => {
  const browser = await chromium.launch({ headless: true, executablePath: process.env.CHROME_PATH || 'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe' });
  try {
    for (const viewport of [{ width: 1440, height: 900 }, { width: 390, height: 844 }]) {
      const context = await browser.newContext({ viewport });
      const page = await context.newPage();
      const errors = [];
      page.on('pageerror', error => errors.push(error.message));
      await page.route('https://raw.githubusercontent.com/**/announcements.json', route => route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify({ schemaVersion: 1, announcements: [
        { id: 'demo', title: 'デモ', body: '表示しない', startsAt: '2026-01-01T00:00:00Z', endsAt: '2027-01-01T00:00:00Z', detailUrl: 'https://example.com/', snsUrl: '', isDemo: true, priority: 5 },
        { id: 'real', title: '制作ワークショップ', body: '開催情報を見る', startsAt: '2026-01-01T00:00:00Z', endsAt: '2027-01-01T00:00:00Z', detailUrl: 'https://example.com/', snsUrl: '', isDemo: false, priority: 1 }
      ] }) }));
      const response = await page.goto(url);
      assert.equal(response.status(), 200);
      await page.getByRole('heading', { name: 'マイツール', exact: true }).waitFor();
      assert.equal(await page.getByText('デモ', { exact: true }).count(), 0);
      assert.ok(await page.getByText('制作ワークショップ').count() > 0);
      await page.screenshot({ path: path.join(output, `${viewport.width}-home.png`), fullPage: true });

      await page.locator('[data-view="profile"]').click();
      await page.locator('[name="businessName"]').fill('青葉企画');
      await page.locator('[name="businessDescription"]').fill('小さな事業の販促を支援します。');
      await page.getByRole('button', { name: '保存する' }).click();
      await page.reload();
      await page.locator('[data-view="profile"]').click();
      assert.equal(await page.locator('[name="businessName"]').inputValue(), '青葉企画');
      await page.locator('[data-view="tools"]').click();
      await page.getByRole('button', { name: '＋ ツールを追加' }).click();
      await page.locator('#tool-dialog [name="url"]').fill('https://example.com/tool');
      await page.locator('#tool-dialog [name="name"]').fill('告知ツール');
      await page.locator('#tool-dialog button[type="submit"]').click();
      assert.equal(await page.locator('.tool-card').count(), 1);
      await page.locator('[data-view="settings"]').click();
      await page.locator('[name="theme"][value="dark"]').check();
      await page.locator('#settings-form button[type="submit"]').click();
      assert.equal(await page.locator('body').getAttribute('data-theme'), 'dark');
      assert.equal(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth), true);
      assert.deepEqual(errors, []);
      await page.screenshot({ path: path.join(output, `${viewport.width}-dark.png`), fullPage: true });
      await context.close();
    }
    console.log('PASS desktop/mobile, profile persistence, tool registration, theme, announcement filter, no overflow/pageerror');
  } finally { await browser.close(); }
})().catch(error => { console.error(error); process.exitCode = 1; });
