import { expect, test } from '@playwright/test';
import { MockApi } from './support/mock-api';

test.describe('Navigation', () => {
  test.beforeEach(async ({ page }) => {
    await MockApi.install(page);
  });

  test("redirige vers l'accueil et marque le lien actif", async ({ page }) => {
    await page.goto('/');
    await expect(page).toHaveURL(/\/accueil$/);
    await expect(page).toHaveTitle('Accueil · Nursery');
    await expect(page.getByRole('link', { name: 'Accueil' })).toHaveClass(/sidebar__link--active/);
  });

  test('place les inscriptions avant les rapports du jour, puis le calendrier', async ({
    page,
  }) => {
    await page.goto('/accueil');
    await expect(page.locator('.sidebar__link')).toHaveText([
      /Accueil/,
      /Inscriptions/,
      /Rapports du jour/,
      /Calendrier/,
    ]);
    await page.getByRole('link', { name: 'Inscriptions' }).click();
    await expect(page).toHaveURL(/\/inscriptions$/);
    await expect(page).toHaveTitle('Inscriptions · Nursery');
  });

  test('ouvre la page des rapports depuis la barre latérale', async ({ page }) => {
    await page.goto('/accueil');
    await page.getByRole('link', { name: 'Rapports du jour', exact: true }).click();
    await expect(page).toHaveURL(/\/rapports$/);
    await expect(page).toHaveTitle('Rapports du jour · Nursery');
    await expect(page.getByRole('heading', { name: 'Rapports du jour' })).toBeVisible();
  });

  test('replie et déplie la barre de navigation', async ({ page }) => {
    await page.goto('/accueil');
    const sidebar = page.locator('.sidebar');
    const toggle = page.getByRole('button', { name: 'Replier la navigation' });
    const expandedWidth = (await sidebar.boundingBox())!.width;

    await toggle.click();
    await expect(sidebar).toHaveClass(/sidebar--collapsed/);
    await expect(page.getByRole('button', { name: 'Déplier la navigation' })).toHaveAttribute(
      'aria-expanded',
      'false',
    );
    await expect(page.locator('.sidebar__brand')).toBeHidden();
    // Labels are hidden but links stay reachable through their title
    await expect(page.locator('.sidebar__link').first()).not.toContainText('Accueil');
    await expect.poll(async () => (await sidebar.boundingBox())!.width).toBeLessThan(expandedWidth);

    await page.getByRole('button', { name: 'Déplier la navigation' }).click();
    await expect(sidebar).not.toHaveClass(/sidebar--collapsed/);
    await expect(page.locator('.sidebar__link').first()).toContainText('Accueil');
  });
});
