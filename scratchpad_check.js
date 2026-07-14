const { chromium } = require('playwright');

(async () => {
  const browser = await chromium.launch();
  const context = await browser.newContext({
    viewport: { width: 375, height: 812 },
    deviceScaleFactor: 2,
    isMobile: true,
    hasTouch: true,
    userAgent: 'Mozilla/5.0 (iPhone; CPU iPhone OS 16_0 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/16.0 Mobile/15E148 Safari/604.1',
  });
  const page = await context.newPage();

  const consoleErrors = [];
  const pageErrors = [];

  page.on('console', (msg) => {
    if (msg.type() === 'error') {
      consoleErrors.push(msg.text());
    }
  });
  page.on('pageerror', (err) => {
    pageErrors.push(err.message);
  });

  console.log('Navigating...');
  await page.goto('https://kp.glavinstrument.com/cli1238?model=9', { waitUntil: 'networkidle', timeout: 60000 });

  // wait for visible content
  try {
    await page.waitForSelector('body', { timeout: 10000 });
  } catch (e) {}
  await page.waitForTimeout(3000);

  console.log('Taking top screenshot...');
  await page.screenshot({ path: 'C:\\Projects\\bathhouse\\scratchpad_live_top.png' });

  // zoomed crop of top-left header/logo region
  console.log('Taking logo crop...');
  await page.screenshot({
    path: 'C:\\Projects\\bathhouse\\scratchpad_live_logo.png',
    clip: { x: 0, y: 0, width: 200, height: 150 },
  });

  // Find the scrollable element
  const scrollInfo = await page.evaluate(() => {
    function findScrollable() {
      const all = Array.from(document.querySelectorAll('*'));
      let candidates = [];
      for (const el of all) {
        const style = getComputedStyle(el);
        const overflowY = style.overflowY;
        if ((overflowY === 'auto' || overflowY === 'scroll') && el.scrollHeight > el.clientHeight + 10) {
          candidates.push({
            tag: el.tagName,
            cls: el.className && el.className.toString ? el.className.toString().slice(0, 80) : '',
            scrollHeight: el.scrollHeight,
            clientHeight: el.clientHeight,
          });
        }
      }
      return candidates;
    }
    const cands = findScrollable();
    return {
      candidates: cands,
      docScrollHeight: document.documentElement.scrollHeight,
      docClientHeight: document.documentElement.clientHeight,
      bodyScrollHeight: document.body.scrollHeight,
      bodyClientHeight: document.body.clientHeight,
    };
  });
  console.log('Scroll info:', JSON.stringify(scrollInfo, null, 2));

  // Determine best scrollable: pick largest scrollHeight-clientHeight diff among candidates, else window/body
  let scrollTargetSelectorInfo = await page.evaluate(() => {
    const all = Array.from(document.querySelectorAll('*'));
    let best = null;
    let bestDiff = -1;
    let idx = 0;
    for (const el of all) {
      const style = getComputedStyle(el);
      const overflowY = style.overflowY;
      if ((overflowY === 'auto' || overflowY === 'scroll') && el.scrollHeight > el.clientHeight + 10) {
        const diff = el.scrollHeight - el.clientHeight;
        if (diff > bestDiff) {
          bestDiff = diff;
          best = el;
        }
      }
      idx++;
    }
    if (best) {
      // tag it with a data attribute so we can select it later
      best.setAttribute('data-pw-scroll-target', 'true');
      return { found: true, scrollHeight: best.scrollHeight, clientHeight: best.clientHeight };
    }
    return { found: false };
  });
  console.log('Scroll target:', JSON.stringify(scrollTargetSelectorInfo));

  async function scrollToPercent(pct) {
    return await page.evaluate((pct) => {
      const el = document.querySelector('[data-pw-scroll-target="true"]');
      if (el) {
        const max = el.scrollHeight - el.clientHeight;
        el.scrollTop = max * pct;
        return { usedElement: true, scrollTop: el.scrollTop, max };
      } else {
        const max = document.documentElement.scrollHeight - window.innerHeight;
        window.scrollTo(0, max * pct);
        return { usedElement: false, scrollTop: window.scrollY, max };
      }
    }, pct);
  }

  console.log('Scrolling to 60%...');
  let r1 = await scrollToPercent(0.6);
  console.log('scroll result', JSON.stringify(r1));
  await page.waitForTimeout(1000);
  await page.screenshot({ path: 'C:\\Projects\\bathhouse\\scratchpad_live_mid.png' });

  console.log('Scrolling to 100%...');
  let r2 = await scrollToPercent(1.0);
  console.log('scroll result', JSON.stringify(r2));
  await page.waitForTimeout(1000);
  await page.screenshot({ path: 'C:\\Projects\\bathhouse\\scratchpad_live_bottom.png' });

  console.log('=== CONSOLE ERRORS ===');
  console.log(JSON.stringify(consoleErrors, null, 2));
  console.log('=== PAGE ERRORS ===');
  console.log(JSON.stringify(pageErrors, null, 2));

  await browser.close();
})().catch((e) => {
  console.error('SCRIPT FAILED:', e);
  process.exit(1);
});
