/* 独立浏览器上下文检查，不读取或修改用户浏览器的学习记录。 */
const { chromium } = require('playwright');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const { pathToFileURL } = require('node:url');

(async () => {
  const root = path.resolve(__dirname, '..');
  const qa = path.join(__dirname, 'qa');
  fs.mkdirSync(qa, { recursive: true });
  const options = { headless: true };
  if (process.env.CHROME_PATH) options.executablePath = process.env.CHROME_PATH;
  const browser = await chromium.launch(options);
  try {
    const context = await browser.newContext({ viewport: { width: 1440, height: 1000 } });
    const page = await context.newPage();
    const errors = [];
    const network = [];
    page.on('pageerror', err => errors.push(err.message));
    await page.route('**/*', route => {
      if (/^https?:/.test(route.request().url())) { network.push(route.request().url()); return route.abort(); }
      return route.continue();
    });
    const url = pathToFileURL(path.join(root, 'llm-course.html')).href;
    await page.goto(url);
    await page.waitForSelector('#navtree .nav-item');
    assert.equal(await page.locator('.katex-error').count(), 0);
    assert.equal(await page.locator('section.unit[data-stage]').count(), 78);
    const blank = await page.evaluate(() => ({
      questions: [...document.querySelectorAll('.ex-body')].filter(x => !x.textContent.trim()).length,
      answers: [...document.querySelectorAll('.ex-ans-body')].filter(x => !x.textContent.trim()).length,
      exits: [...document.querySelectorAll('.exit-list')].filter(x => !x.children.length).length
    }));
    assert.deepEqual(blank, { questions: 0, answers: 0, exits: 0 });
    const duplicateIds = await page.evaluate(() => {
      const seen = new Set(), duplicates = [];
      document.querySelectorAll('[id]').forEach(x => { if (seen.has(x.id)) duplicates.push(x.id); seen.add(x.id); });
      return duplicates;
    });
    assert.deepEqual(duplicateIds, []);
    await page.locator('.nav-check[data-unit="0-0"]').check();
    assert.match(await page.locator('#progress-text').innerText(), /1 \/ 78/);
    await page.reload();
    assert.equal(await page.locator('.nav-check[data-unit="0-0"]').isChecked(), true);
    await page.evaluate(() => { location.hash = '#/7-2'; });
    await page.waitForSelector('#unit-7-2.visible');
    assert.match(await page.locator('#unit-7-2 .ex-body').first().innerText(), /准确率/);
    assert.equal(await page.locator('#unit-7-2 .exit-list li').count(), 6);
    await page.locator('#unit-7-2 .exit-list li').first().click();
    await page.locator('#home-link').click();
    await page.locator('#resume-btn').click();
    await page.waitForSelector('#unit-7-2.visible');
    await page.locator('#search-input').fill('不一致题数');
    assert.equal(await page.locator('.nav-item[data-unit="7-2"]').isVisible(), true);
    await page.locator('#search-input').fill('');
    await page.locator('#learning-mode').selectOption('guided');
    await page.waitForSelector('#gate-0.visible');
    await page.locator('#learning-mode').selectOption('free');
    await page.evaluate(() => { location.hash = '#/gate-10'; });
    await page.waitForSelector('#gate-10.visible');
    await page.locator('[data-grade="10"]').click();
    await page.locator('#home-link').click();
    const links = await page.locator('#wrong-panel [data-jump]').evaluateAll(xs => xs.map(x => x.dataset.jump));
    assert(links.includes('10-2') && links.includes('10-3'));
    assert(links.every(x => /^\d+-\d+$/.test(x)));
    await page.evaluate(() => {
      location.hash = '#/gate-10';
      window.__GATES__.find(g => g.stage === 10).questions.forEach(q => {
        document.querySelector(`input[name="g10-${q.n}"][value="${q.answer}"]`).checked = true;
      });
    });
    await page.waitForSelector('#gate-10.visible');
    await page.locator('[data-grade="10"]').click();
    assert.match(await page.locator('#gate-result-10').innerText(), /100%/);
    assert.equal(await page.evaluate(() => JSON.parse(localStorage.getItem('llm-course:wrong')).length), 0);
    const downloadEvent = page.waitForEvent('download');
    await page.locator('#export-btn').click();
    const download = await downloadEvent;
    const backup = path.join(qa, 'progress.json');
    await download.saveAs(backup);
    const data = JSON.parse(fs.readFileSync(backup, 'utf8'));
    assert(data.done.includes('0-0'));
    assert(data.gates['10'].pass);
    page.on('dialog', dialog => dialog.accept());
    await page.locator('#clear-btn').click();
    await page.waitForFunction(() => !localStorage.getItem('llm-course:done'));
    await page.locator('#import-input').setInputFiles(backup);
    await page.waitForFunction(() => JSON.parse(localStorage.getItem('llm-course:done') || '[]').includes('0-0'));
    await page.reload();
    assert.equal(await page.locator('.nav-check[data-unit="0-0"]').isChecked(), true);
    await page.evaluate(() => { location.hash = '#/10-1'; });
    await page.waitForSelector('#unit-10-1.visible');
    const slider = page.locator('#viz-agent-loop input');
    await slider.fill('10');
    await slider.dispatchEvent('input');
    assert.match(await page.locator('#viz-agent-loop .calculator-output').innerText(), /59.9%/);
    await page.screenshot({ path: path.join(qa, 'desktop.png'), fullPage: false });
    await page.setViewportSize({ width: 390, height: 844 });
    await page.evaluate(() => { location.hash = '#/5-6'; });
    await page.waitForSelector('#unit-5-6.visible');
    const overflow = await page.evaluate(() => document.documentElement.scrollWidth > innerWidth + 2);
    assert.equal(overflow, false, '移动端页面横向溢出');
    await page.waitForFunction(() => document.querySelector('#sidebar').getBoundingClientRect().right <= 1);
    await page.screenshot({ path: path.join(qa, 'mobile.png'), fullPage: false });
    await page.locator('#menu-toggle').click();
    assert.equal(await page.locator('#sidebar').evaluate(x => x.classList.contains('open')), true);
    assert.deepEqual(errors, []);
    assert.deepEqual(network, [], '离线课程不应加载外部资源');
    console.log(JSON.stringify({ units: 78, blank, errors, externalRequests: network.length,
      passed: ['进度保存', '续学', '全文搜索', '闯关', '跨单元错题', '重测移除', '导入导出', '交互图', '移动布局', '离线加载'] }, null, 2));
  } finally { await browser.close(); }
})().catch(err => { console.error(err); process.exitCode = 1; });
