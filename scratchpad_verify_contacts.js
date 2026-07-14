const { chromium } = require('playwright');

(async () => {
  const browser = await chromium.launch();
  const context = await browser.newContext({
    viewport: { width: 375, height: 812 },
    isMobile: true,
    hasTouch: true,
    userAgent: 'Mozilla/5.0 (iPhone; CPU iPhone OS 16_0 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/16.0 Mobile/15E148 Safari/604.1',
  });
  const page = await context.newPage();

  const consoleErrors = [];
  page.on('console', (msg) => {
    if (msg.type() === 'error') consoleErrors.push(msg.text());
  });
  page.on('pageerror', (err) => consoleErrors.push('PAGEERROR: ' + err.message));

  await page.goto('https://kp.glavinstrument.com/cli1238?model=9', { waitUntil: 'networkidle', timeout: 60000 });
  await page.waitForTimeout(3000);

  // Try to find the scrollable element with overflow-y-auto
  const scrollInfo = await page.evaluate(() => {
    const candidates = Array.from(document.querySelectorAll('*')).filter((el) => {
      const style = getComputedStyle(el);
      return (style.overflowY === 'auto' || style.overflowY === 'scroll') && el.scrollHeight > el.clientHeight + 50;
    });
    // pick the largest scrollHeight one
    candidates.sort((a, b) => b.scrollHeight - a.scrollHeight);
    return candidates.slice(0, 5).map((el, i) => ({
      idx: i,
      tag: el.tagName,
      cls: el.className && el.className.toString ? el.className.toString().slice(0, 120) : '',
      scrollHeight: el.scrollHeight,
      clientHeight: el.clientHeight,
    }));
  });
  console.log('SCROLL CANDIDATES:', JSON.stringify(scrollInfo, null, 2));

  // Build a selector path for the top candidate using a data attribute we set
  const setupResult = await page.evaluate(() => {
    const candidates = Array.from(document.querySelectorAll('*')).filter((el) => {
      const style = getComputedStyle(el);
      return (style.overflowY === 'auto' || style.overflowY === 'scroll') && el.scrollHeight > el.clientHeight + 50;
    });
    candidates.sort((a, b) => b.scrollHeight - a.scrollHeight);
    const target = candidates[0];
    if (!target) return null;
    target.setAttribute('data-scroll-target', 'true');
    return {
      scrollHeight: target.scrollHeight,
      clientHeight: target.clientHeight,
    };
  });
  console.log('SETUP RESULT:', JSON.stringify(setupResult, null, 2));

  if (!setupResult) {
    console.log('NO SCROLLABLE ELEMENT FOUND, falling back to window');
  }

  // Find the contacts container - fixed position div containing phone/telegram/email links
  const findContactsInfo = async () => {
    return await page.evaluate(() => {
      const all = Array.from(document.querySelectorAll('div'));
      const candidates = all.filter((el) => {
        const style = getComputedStyle(el);
        if (style.position !== 'fixed') return false;
        const hasTel = el.querySelector('a[href^="tel:"]');
        const hasMail = el.querySelector('a[href^="mailto:"]');
        const hasTg = el.querySelector('a[href*="t.me"], a[href*="telegram"]');
        return hasTel || hasMail || hasTg;
      });
      return candidates.map((el) => {
        const style = getComputedStyle(el);
        const rect = el.getBoundingClientRect();
        return {
          cls: el.className && el.className.toString ? el.className.toString() : '',
          opacity: style.opacity,
          transform: style.transform,
          visibility: style.visibility,
          display: style.display,
          rect: { top: rect.top, bottom: rect.bottom, left: rect.left, right: rect.right, width: rect.width, height: rect.height },
        };
      });
    });
  };

  const scrollTo = async (y) => {
    await page.evaluate((yy) => {
      const el = document.querySelector('[data-scroll-target]');
      if (el) {
        el.scrollTop = yy;
      } else {
        window.scrollTo(0, yy);
      }
    }, y);
    await page.waitForTimeout(700); // allow transition
  };

  const sh = setupResult ? setupResult.scrollHeight : await page.evaluate(() => document.documentElement.scrollHeight);
  const ch = setupResult ? setupResult.clientHeight : await page.evaluate(() => window.innerHeight);

  console.log('scrollHeight:', sh, 'clientHeight:', ch);

  // TOP
  await scrollTo(0);
  await page.screenshot({ path: 'C:\\Projects\\bathhouse\\scratchpad_contacts_top.png' });
  const topInfo = await findContactsInfo();
  console.log('TOP CONTACTS INFO:', JSON.stringify(topInfo, null, 2));

  // MID
  const midY = Math.round(sh * 0.5);
  await scrollTo(midY);
  await page.screenshot({ path: 'C:\\Projects\\bathhouse\\scratchpad_contacts_mid.png' });
  const midInfo = await findContactsInfo();
  console.log('MID CONTACTS INFO (scrollTo=' + midY + '):', JSON.stringify(midInfo, null, 2));

  // NEAR BOTTOM
  const nearY = Math.max(0, sh - ch - 100);
  await scrollTo(nearY);
  await page.screenshot({ path: 'C:\\Projects\\bathhouse\\scratchpad_contacts_near.png' });
  const nearInfo = await findContactsInfo();
  console.log('NEAR BOTTOM CONTACTS INFO (scrollTo=' + nearY + '):', JSON.stringify(nearInfo, null, 2));

  // Also check the actual current scrollTop achieved (in case content shorter than expected)
  const actualScroll = await page.evaluate(() => {
    const el = document.querySelector('[data-scroll-target]');
    return el ? el.scrollTop : window.scrollY;
  });
  console.log('ACTUAL SCROLLTOP AT NEAR:', actualScroll);

  console.log('CONSOLE ERRORS:', JSON.stringify(consoleErrors, null, 2));

  await browser.close();
})().catch((e) => {
  console.error('SCRIPT ERROR:', e);
  process.exit(1);
});
