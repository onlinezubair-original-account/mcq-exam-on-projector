import { test, expect } from '@playwright/test';

test.describe('Smoke test', () => {
  test('loads Meta screen, clicks Skip, reaches Setup — no external requests', async ({ page }) => {
    const requests: string[] = [];
    page.on('request', (req) => {
      const url = req.url();
      // Allow localhost and same-origin (Pages basePath) requests
      if (!url.startsWith('http://127.0.0.1:4173') && !url.startsWith('http://localhost')) {
        requests.push(url);
      }
    });

    await page.goto('/');
    await expect(page.locator('h1')).toContainText(/Exam Meta/);
    await page.click('button:has-text("Skip")');
    await expect(page.locator('h1')).toContainText(/Setup/);

    expect(requests, 'No external requests should leave the origin').toHaveLength(0);
  });
});