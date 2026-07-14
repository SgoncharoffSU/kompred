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

  // Find the actual scrollable container
  const scrollInfo = await page.evaluate(() => {
    const candidates = Array.from(document.querySelectorAll('*')).filter((el) => {
      const s = getComputedStyle(el);
      return (s.overflowY === 'auto' || s.overflowY === 'scroll') && el.scrollHeight > el.clientHeight;
    });
    return candidates.map((el) => ({
      tag: el.tagName,
      cls: el.className,
      scrollHeight: el.scrollHeight,
      clientHeight: el.clientHeight,
    }));
  });
  console.log('SCROLL_CANDIDATES', JSON.stringify(scrollInfo, null, 2));

  async function scrollAndShot(y, path) {
    await page.evaluate((yy) => {
      const el = document.querySelector('div.flex-1.min-h-0.overflow-y-auto') || document.scrollingElement;
      if (el) el.scrollTop = yy;
      window.scrollTo(0, yy);
    }, y);
    await page.waitForTimeout(600);
    await page.screenshot({ path });
  }

  await scrollAndShot(0, `${OUT_DIR}\\mobile_scroll0.png`);
  await scrollAndShot(400, `${OUT_DIR}\\mobile_scroll400.png`);
  await scrollAndShot(1200, `${OUT_DIR}\\mobile_scroll1200.png`);

  // Report actual scrollTop achieved
  const finalScroll = await page.evaluate(() => {
    const el = document.querySelector('div.flex-1.min-h-0.overflow-y-auto');
    return { scrollTop: el ? el.scrollTop : null, windowScrollY: window.scrollY };
  });
  console.log('FINAL_SCROLL', JSON.stringify(finalScroll));

  // Sticky photo rect at this scroll position
  const stickyRect = await page.evaluate(() => {
    const imgs = Array.from(document.querySelectorAll('img'));
    const sticky = imgs.find((img) => img.closest('.sticky'));
    if (!sticky) return null;
    const rect = sticky.getBoundingClientRect();
    const wrapper = sticky.closest('.sticky');
    const wrapperRect = wrapper.getBoundingClientRect();
    return { imgRect: rect, wrapperRect, wrapperClass: wrapper.className, imgSrc: sticky.src, naturalWidth: sticky.naturalWidth, naturalHeight: sticky.naturalHeight };
  });
  console.log('STICKY_RECT', JSON.stringify(stickyRect, null, 2));

  await browser.close();
})().catch((err) => {
  console.error('SCRIPT_ERROR', err);
  process.exit(1);
});
