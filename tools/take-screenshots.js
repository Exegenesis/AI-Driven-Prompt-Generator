const puppeteer = require('puppeteer');
const fs = require('fs');
const path = require('path');

(async () => {
  const outDir = path.join(process.cwd(), 'screenshots');
  if (!fs.existsSync(outDir)) fs.mkdirSync(outDir);
  const url = process.argv[2] || 'http://localhost:4000';

  const viewports = [
    { name: 'desktop', width: 1366, height: 768 },
    { name: 'tablet', width: 768, height: 1024 },
    { name: 'phone', width: 375, height: 812 },
  ];

  const browser = await puppeteer.launch({ args: ['--no-sandbox', '--disable-setuid-sandbox'] });
  const page = await browser.newPage();

  for (const vp of viewports) {
    await page.setViewport({ width: vp.width, height: vp.height });
    console.log('Capturing', vp.name, url);
    await page.goto(url, { waitUntil: 'networkidle2', timeout: 30000 });
    const file = path.join(outDir, `index-${vp.name}.png`);
    await page.screenshot({ path: file, fullPage: true });
    console.log('Saved', file);
  }

  await browser.close();
  console.log('Done');
})();
