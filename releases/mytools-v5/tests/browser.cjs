const { chromium } = require('playwright');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');

const url = process.env.MYTOOLS_URL || 'http://127.0.0.1:8812/';
const output = process.env.MYTOOLS_QA_DIR || path.join(__dirname, '..', 'qa');
fs.mkdirSync(output, { recursive: true });

async function addItem(page, type, target, name) {
  await page.locator('#add-tool').click();
  await page.locator('#tool-form [name="type"]').selectOption(type);
  await page.locator('#tool-form [name="target"]').fill(target);
  await page.locator('#tool-form [name="name"]').fill(name);
  await page.locator('#tool-form button[type="submit"]').click();
  await page.locator('#tool-dialog').waitFor({ state: 'hidden' });
}

(async () => {
  const browser = await chromium.launch({ headless: true, executablePath: process.env.CHROME_PATH || 'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe' });
  try {
    for (const viewport of [{ width: 1440, height: 900 }, { width: 390, height: 844 }]) {
      const context = await browser.newContext({ viewport });
      const page = await context.newPage();
      const errors = [];
      page.on('pageerror', error => errors.push(error.message));
      await page.route('https://terakoya-ai.vercel.app/api/next-workshop', route => route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify({
        title: '制作ワークショップ', description: '開催情報を見る', dateTime: '2026-10-03T20:00:00+09:00'
      }) }));
      const response = await page.goto(url);
      assert.equal(response.status(), 200);
      await page.evaluate(() => {
        localStorage.setItem('terakoya-mytools-v4', JSON.stringify({ tools: [{ id: 'old-web', url: 'https://example.com/old', name: '以前のツール' }] }));
        localStorage.setItem('terakoya-mytools-v5', JSON.stringify({ tools: [{ id: 'other-web', target: 'https://example.com/other', name: '別サイトのツール' }] }));
      });
      await page.reload();
      await page.locator('#site-heading').waitFor();
      assert.equal(await page.locator('.tool-card').count(), 0);
      assert.equal(await page.locator('#tool-empty-title').textContent(), 'まだ登録がありません');
      assert.ok(await page.getByText('制作ワークショップ').count() > 0);
      assert.equal(await page.getByText('デモ', { exact: true }).count(), 0);

      await page.locator('#add-tool').click();
      await page.locator('#tool-form [name="target"]').fill('javascript:alert(1)');
      await page.locator('#tool-form [name="name"]').fill('危険なURL');
      await page.locator('#tool-form button[type="submit"]').click();
      assert.match(await page.locator('#tool-error').textContent(), /http または https/);
      await page.locator('#cancel-tool').click();

      await addItem(page, 'local', 'C:\\Tools\\start.bat', '作業バッチ');
      await addItem(page, 'skill', 'https://github.com/example/skill', '構成スキル');
      await addItem(page, 'prompt', '原稿を3案作ってください。\n事実確認を忘れずに。', '原稿プロンプト');
      await addItem(page, 'other', '案件Aの参照メモ', '業務メモ');
      assert.equal(await page.locator('.tool-card').count(), 4);
      assert.equal(await page.locator('.tool-card').filter({ hasText: '作業バッチ' }).locator('a.primary-action').count(), 0);
      assert.equal(await page.locator('.tool-card').filter({ hasText: '作業バッチ' }).getByRole('button', { name: '場所をコピー' }).count(), 1);
      assert.equal(await page.locator('.tool-card').filter({ hasText: '原稿プロンプト' }).getByRole('button', { name: '本文をコピー' }).count(), 1);
      await page.locator('.tool-card').filter({ hasText: '原稿プロンプト' }).getByRole('button', { name: '編集' }).click();
      assert.equal(await page.locator('#tool-form [name="type"]').inputValue(), 'prompt');
      assert.equal(await page.locator('#tool-form [name="target"]').inputValue(), '原稿を3案作ってください。\n事実確認を忘れずに。');
      await page.screenshot({ path: path.join(output, `${viewport.width}-edit.png`), fullPage: true });
      await page.locator('#cancel-tool').click();
      await page.locator('#type-filter').selectOption('skill');
      assert.equal(await page.locator('.tool-card').count(), 1);
      await page.locator('#type-filter').selectOption('all');
      await page.reload();
      assert.equal(await page.locator('.tool-card').count(), 4);
      const saved = await page.evaluate(() => JSON.parse(localStorage.getItem(`terakoya-mytools-v5:${location.origin}${location.pathname}`)));
      assert.ok(saved.tools.some(tool => tool.type === 'prompt' && tool.target.includes('事実確認')));
      assert.ok(!saved.tools.some(tool => tool.type === 'web'));
      assert.equal(await page.evaluate(() => JSON.parse(localStorage.getItem('terakoya-mytools-v4')).tools.length), 1);
      const existingPage = await context.newPage();
      await existingPage.route(url, async route => {
        const response = await route.fetch();
        const body = (await response.text())
          .replace('name="terakoya-site-id" content=""', 'name="terakoya-site-id" content="existing-site"')
          .replace('name="terakoya-import-storage-key" content=""', 'name="terakoya-import-storage-key" content="terakoya-mytools-v4"');
        await route.fulfill({ response, body });
      });
      await existingPage.goto(url);
      assert.equal(await existingPage.locator('.tool-card').count(), 1);
      assert.equal(await existingPage.locator('.tool-card a.primary-action').getAttribute('href'), 'https://example.com/old');
      const otherPage = await context.newPage();
      await otherPage.route(url, async route => {
        const response = await route.fetch();
        const body = (await response.text()).replace('name="terakoya-site-id" content=""', 'name="terakoya-site-id" content="other-new-site"');
        await route.fulfill({ response, body });
      });
      await otherPage.goto(url);
      assert.equal(await otherPage.locator('.tool-card').count(), 0);
      await existingPage.close();
      await otherPage.close();
      assert.equal(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth), true);
      assert.deepEqual(errors, []);
      await page.screenshot({ path: path.join(output, `${viewport.width}-tools.png`), fullPage: true });
      await context.close();
    }
    console.log('PASS: desktop/mobile, empty new site, explicit v4 migration, site isolation, five types, validation, filtering, persistence, no overflow/pageerror');
  } finally { await browser.close(); }
})().catch(error => { console.error(error); process.exitCode = 1; });
