const { chromium } = require('playwright');

(async () => {
  const browser = await chromium.launch();
  const results = {};

  // ---------- Page 1: client configurator ----------
  {
    const page = await browser.newPage({ viewport: { width: 1280, height: 900 } });
    const consoleErrors = [];
    const failedRequests = [];

    page.on('console', (msg) => {
      if (msg.type() === 'error') consoleErrors.push(msg.text());
    });
    page.on('requestfailed', (req) => {
      failedRequests.push(`${req.url()} :: ${req.failure()?.errorText}`);
    });
    page.on('response', (res) => {
      if (res.status() >= 400) {
        failedRequests.push(`${res.status()} ${res.url()}`);
      }
    });

    try {
      await page.goto('https://kp.glavinstrument.com/cli1238?model=9', {
        waitUntil: 'networkidle',
        timeout: 45000,
      });
    } catch (e) {
      results.page1_navError = String(e);
    }

    await page.waitForTimeout(2000);

    const imgInfo = await page.evaluate(() => {
      const imgs = Array.from(document.querySelectorAll('img'));
      return imgs.map((img) => ({
        src: img.currentSrc || img.src,
        naturalWidth: img.naturalWidth,
        naturalHeight: img.naturalHeight,
        complete: img.complete,
        width: img.clientWidth,
        height: img.clientHeight,
        alt: img.alt,
      }));
    });

    results.page1_images = imgInfo;
    results.page1_consoleErrors = consoleErrors;
    results.page1_failedRequests = failedRequests;

    await page.screenshot({
      path: 'c:\\Projects\\bathhouse\\scratchpad_verify_images.png',
      fullPage: false,
    });

    await page.close();
  }

  // ---------- Page 2: admin panel ----------
  {
    const page = await browser.newPage({ viewport: { width: 1280, height: 900 } });
    const consoleErrors = [];
    const failedRequests = [];

    page.on('console', (msg) => {
      if (msg.type() === 'error') consoleErrors.push(msg.text());
    });
    page.on('requestfailed', (req) => {
      failedRequests.push(`${req.url()} :: ${req.failure()?.errorText}`);
    });
    page.on('response', (res) => {
      if (res.status() >= 400) {
        failedRequests.push(`${res.status()} ${res.url()}`);
      }
    });

    try {
      await page.goto('https://kp.glavinstrument.com/admin1238', {
        waitUntil: 'networkidle',
        timeout: 45000,
      });
    } catch (e) {
      results.page2_navError = String(e);
    }

    await page.waitForTimeout(1500);

    const imgInfo = await page.evaluate(() => {
      const imgs = Array.from(document.querySelectorAll('img'));
      return imgs.map((img) => ({
        src: img.currentSrc || img.src,
        naturalWidth: img.naturalWidth,
        naturalHeight: img.naturalHeight,
        complete: img.complete,
        alt: img.alt,
      }));
    });

    results.page2_images = imgInfo;
    results.page2_consoleErrors = consoleErrors;
    results.page2_failedRequests = failedRequests;

    await page.screenshot({
      path: 'c:\\Projects\\bathhouse\\scratchpad_verify_images_admin.png',
      fullPage: false,
    });

    await page.close();
  }

  await browser.close();

  console.log(JSON.stringify(results, null, 2));
})();
