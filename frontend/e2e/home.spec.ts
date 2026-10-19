import { expect, test } from '@playwright/test';
import { MockApi } from './support/mock-api';

test.describe("Page d'accueil", () => {
  test('affiche les informations de la crèche', async ({ page }) => {
    await MockApi.install(page);
    await page.goto('/accueil');

    await expect(page.getByRole('heading', { name: 'Bienvenue' })).toBeVisible();
    const card = page.locator('.card');
    await expect(card.getByRole('heading', { name: 'Crèche Les Petits Pas' })).toBeVisible();
    await expect(card).toContainText('12 rue des Lilas, 75000 Paris');
    await expect(card).toContainText('Capacité : 40 enfants');
  });

  test("affiche un message quand l'API est injoignable", async ({ page }) => {
    await MockApi.install(page, { offline: true });
    await page.goto('/accueil');

    await expect(page.getByText("Impossible de joindre l'API")).toBeVisible();
    await expect(page.locator('.card')).toHaveCount(0);
  });
});
