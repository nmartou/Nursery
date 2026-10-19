import { expect, test } from '@playwright/test';
import { MockApi } from './support/mock-api';

test.describe('Tableau de bord', () => {
  test("affiche l'avancement des rapports du jour", async ({ page }) => {
    await MockApi.install(page);
    await page.goto('/accueil');

    await expect(page.getByRole('heading', { name: 'Tableau de bord' })).toBeVisible();
    const tile = page.getByRole('region', { name: 'Rapports du jour' });
    await expect(tile).toContainText('vendredi 16 octobre 2026');
    // Seed: Léa complete, Nathan absent, Hugo and Inès in progress, Chloé empty.
    await expect(tile.locator('.progress__figure')).toContainText('2 / 5');
    await expect(tile).toContainText('3 rapports restent à remplir ou compléter.');
  });

  test('mène aux rapports du jour', async ({ page }) => {
    await MockApi.install(page);
    await page.goto('/accueil');

    await page.getByRole('link', { name: 'Ouvrir les rapports du jour' }).click();
    await expect(page).toHaveURL(/\/rapports$/);
  });

  test("affiche un message quand l'API est injoignable", async ({ page }) => {
    await MockApi.install(page, { offline: true });
    await page.goto('/accueil');

    await expect(page.getByText('Impossible de charger les rapports du jour.')).toBeVisible();
  });
});
