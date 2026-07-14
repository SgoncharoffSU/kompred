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
  await page.goto('https://kp.glavinstrument.com/cli1238?model=9', { waitUntil: 'networkidle', timeout: 60000 });
  await page.waitForTimeout(3000);

  async function inspect(label) {
    const info = await page.evaluate(() => {
      const el = document.querySelector('[data-pw-scroll-target="true"]') ;
      const results = [];
      const all = Array.from(document.querySelectorAll('*'));
      for (const e of all) {
        const cs = getComputedStyle(e);
        if (cs.position === 'sticky') {
          const r = e.getBoundingClientRect();
          results.push({
            tag: e.tagName,
            cls: (e.className && e.className.toString) ? e.className.toString().slice(0,100) : '',
            top: cs.top, bottom: cs.bottom,
            rect: { top: r.top, bottom: r.bottom, left: r.left, right: r.right, height: r.height, width: r.width },
          });
        }
      }
      const scrollEl = document.querySelector('[data-pw-scroll-target="true"]');
      return {
        stickyElements: results,
        scrollTop: scrollEl ? scrollEl.scrollTop : null,
      };
    });
    console.log(`--- ${label} ---`);
    console.log(JSON.stringify(info, null, 2));
  }

  // tag the scroll target first
  await page.evaluate(() => {
    const all = Array.from(document.querySelectorAll('*'));
    let best = null, bestDiff = -1;
    for (const el of all) {
      const style = getComputedStyle(el);
      if ((style.overflowY === 'auto' || style.overflowY === 'scroll') && el.scrollHeight > el.clientHeight + 10) {
        const diff = el.scrollHeight - el.clientHeight;
        if (diff > bestDiff) { bestDiff = diff; best = el; }
      }
    }
    if (best) best.setAttribute('data-pw-scroll-target', 'true');
  });

  await inspect('scroll=0');

  await page.evaluate(() => {
    const el = document.querySelector('[data-pw-scroll-target="true"]');
    el.scrollTop = (el.scrollHeight - el.clientHeight) * 0.3;
  });
  await page.waitForTimeout(500);
  await inspect('scroll=30%');

  await page.evaluate(() => {
    const el = document.querySelector('[data-pw-scroll-target="true"]');
    el.scrollTop = (el.scrollHeight - el.clientHeight) * 0.6;
  });
  await page.waitForTimeout(500);
  await inspect('scroll=60%');

  await page.evaluate(() => {
    const el = document.querySelector('[data-pw-scroll-target="true"]');
    el.scrollTop = (el.scrollHeight - el.clientHeight) * 1.0;
  });
  await page.waitForTimeout(500);
  await inspect('scroll=100%');

  await browser.close();
})().catch((e) => { console.error('FAILED', e); process.exit(1); });
