const { test, expect } = require('playwright/test');

const url = 'http://159.194.225.55:8080/site/?model=3';
const viewports = [
  ['desktop', { width: 1280, height: 900 }],
  ['tablet', { width: 820, height: 1100 }],
  ['mobile', { width: 390, height: 844 }],
];

for (const [name, viewport] of viewports) {
  test(`windows and doors options on ${name}`, async ({ page }) => {
    await page.setViewportSize(viewport);
    await page.goto(url, { waitUntil: 'networkidle' });
    await expect(page.locator('.price-overlay .amount')).toBeVisible();
    await expect(page.getByText('Выберите окна и двери')).toBeVisible();
    await expect(page.locator('.card-media img[src*="windows_doors"]')).toHaveCount(6);

    const before = await page.locator('.price-overlay .amount').innerText();
    await page.locator('.card', { hasText: 'Окно ПВХ' }).last().click();
    await page.waitForTimeout(150);
    const after = await page.locator('.price-overlay .amount').innerText();
    expect(before).not.toBe(after);
    expect(after).toContain('312');
  });
}
