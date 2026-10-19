import { expect, test } from '@playwright/test';
import { MockApi } from './support/mock-api';

test.describe("Page d'accueil", () => {
  test('mène aux rapports du jour', async ({ page }) => {
    await MockApi.install(page);
    await page.goto('/accueil');

    await expect(page.getByRole('heading', { name: 'Bienvenue' })).toBeVisible();
    await page.locator('.card').getByRole('heading', { name: 'Rapports du jour' }).click();

    await expect(page).toHaveURL(/\/rapports$/);
  });
});
