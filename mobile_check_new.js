const { chromium } = require('playwright');

const OUT_DIR = 'C:\\Users\\sgonc\\AppData\\Local\\Temp\\claude\\c--Projects-bathhouse\\931492cb-380d-4f69-acfd-ffcb2a4c4e93\\scratchpad';

(async () => {
  const browser = await chromium.launch();
  const context = await browser.newContext({
    viewport: { width: 375, height: 812 },
    isMobile: true,
    hasTouch: true,
    deviceScaleFactor: 2,
    userAgent: 'Mozilla/5.0 (iPhone; CPU iPhone OS 16_0 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/16.0 Mobile/15E148 Safari/604.1',
  });
  const page = await context.newPage();

  await page.goto('https://kp.glavinstrument.com/cli1238', { waitUntil: 'networkidle', timeout: 60000 });
  await page.waitForTimeout(1500);

  // Screenshot 1: top
  await page.screenshot({ path: `${OUT_DIR}\\mobile_scroll0.png` });

  // Scroll to ~400px
  await page.evaluate(() => window.scrollTo(0, 400));
  await page.waitForTimeout(500);
  await page.screenshot({ path: `${OUT_DIR}\\mobile_scroll400.png` });

  // Scroll to ~1200px
  await page.evaluate(() => window.scrollTo(0, 1200));
  await page.waitForTimeout(500);
  await page.screenshot({ path: `${OUT_DIR}\\mobile_scroll1200.png` });

  // Check img elements
  const imgInfo = await page.evaluate(() => {
    const imgs = Array.from(document.querySelectorAll('img'));
    return imgs.map((img, i) => {
      const rect = img.getBoundingClientRect();
      const cs = getComputedStyle(img);
      let ancestorHidden = false;
      let el = img;
      const ancestorStyles = [];
      while (el && el !== document.body) {
        const s = getComputedStyle(el);
        ancestorStyles.push({ tag: el.tagName, cls: el.className, display: s.display, visibility: s.visibility });
        if (s.display === 'none' || s.visibility === 'hidden') ancestorHidden = true;
        el = el.parentElement;
      }
      return {
        index: i,
        src: img.src,
        className: img.className,
        parentClassName: img.parentElement ? img.parentElement.className : null,
        rect,
        display: cs.display,
        visibility: cs.visibility,
        opacity: cs.opacity,
        ancestorHidden,
        ancestorStylesSample: ancestorStyles.slice(0, 6),
      };
    });
  });

  console.log('IMG_INFO_JSON_START');
  console.log(JSON.stringify(imgInfo, null, 2));
  console.log('IMG_INFO_JSON_END');

  await browser.close();
})().catch((err) => {
  console.error('SCRIPT_ERROR', err);
  process.exit(1);
});
