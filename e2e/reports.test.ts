import { expect, test } from '@playwright/test';

test('reports page loads', async ({ page }) => {
  await page.goto('/app/all-reports');
  await expect(page.locator('h1')).toHaveText(/Reports/);
});
