import { expect, test } from '@playwright/test';
import { ChildrenPage, field } from './pages/children.page';
import { DailyReportsPage } from './pages/daily-reports.page';
import { MockApi } from './support/mock-api';

const TOM = { firstName: 'Tom', lastName: 'Durand', birthDate: '2025-06-01' };
const ANNE = {
  firstName: 'Anne',
  lastName: 'Durand',
  email: 'anne.durand@example.com',
  phone: '06 12 34 56 78',
};

test.describe('Inscriptions', () => {
  let api: MockApi;
  let children: ChildrenPage;

  test.beforeEach(async ({ page }) => {
    api = await MockApi.install(page);
    children = new ChildrenPage(page);
    await children.goto();
    await expect(children.heading).toBeVisible();
  });

  test.describe('liste', () => {
    test('montre les enfants inscrits, avec un compteur par filtre', async () => {
      await expect(children.rows).toHaveCount(5);
      await expect(children.filter('Inscrits')).toContainText('5');
      await expect(children.filter('À venir')).toContainText('1');
      await expect(children.filter('Anciens')).toContainText('1');
      await expect(children.filter('Tous')).toContainText('7');

      const lea = children.row('Léa');
      await expect(lea).toContainText('2 ans');
      await expect(lea).toContainText('Du 01/09/2026 au 30/07/2027');
      await expect(lea).toContainText('Claire Martin (Mère)');
      await expect(lea).toContainText('+ 1 contact');
      await expect(children.row('Hugo')).toContainText('Depuis le 01/09/2026');
    });

    test('filtre par statut et recherche par nom', async () => {
      await children.showFilter('À venir');
      await expect(children.rows).toHaveCount(1);
      await expect(children.rows.first()).toContainText('Emma Moreau');
      await expect(children.rows.first()).toContainText('À venir');

      await children.showFilter('Anciens');
      await expect(children.rows).toHaveText([/Lucas Garnier.*Terminé/]);

      await children.showFilter('Tous');
      await children.search.fill('chloe');
      await expect(children.rows).toHaveCount(1);
      await expect(children.rows.first()).toContainText('Chloé Dubois');
    });
  });

  test.describe('formulaire', () => {
    test("s'ouvre devant la page, assombrie et floutée", async ({ page }) => {
      await children.newButton.click();
      await expect(children.dialog).toBeVisible();
      await expect(
        children.form.getByRole('heading', { name: 'Nouvelle inscription' }),
      ).toBeVisible();

      const backdrop = await children.dialog.evaluate((dialog) => {
        const style = getComputedStyle(dialog, '::backdrop');
        return { filter: style.backdropFilter, background: style.backgroundColor };
      });
      expect(backdrop.filter).toContain('blur');
      expect(backdrop.background).not.toBe('rgba(0, 0, 0, 0)');

      // Modal: the page behind cannot be used while the form is open.
      const inertBehind = await page.evaluate(() => {
        const link = document.querySelector('a[href="/rapports"]') as HTMLElement;
        const { x, y, width, height } = link.getBoundingClientRect();
        return document.elementFromPoint(x + width / 2, y + height / 2) === link;
      });
      expect(inertBehind).toBe(false);
      await expect(children.childField('Prénom')).toBeFocused();
    });

    test('inscrit un nouvel enfant avec ses parents et un contact', async () => {
      await children.newButton.click();
      await children.fillChild({ ...TOM, start: '2026-11-02', end: '2027-07-30' });
      await children.fillParent(0, ANNE);

      await children.form.getByRole('button', { name: '+ Ajouter un parent' }).click();
      await expect(children.parent(1).getByLabel("Lien avec l'enfant")).toHaveValue('father');
      await children.fillParent(1, {
        firstName: 'Paul',
        lastName: 'Durand',
        email: 'paul.durand@example.com',
        phone: '+33 6 98 76 54 32',
      });

      await children.form.getByRole('button', { name: '+ Ajouter un contact' }).click();
      const contact = children.contact(0);
      await field(contact, 'Prénom').fill('Jeanne');
      await field(contact, 'Nom').fill('Durand');
      await field(contact, 'Lien').fill('Grand-mère');
      await field(contact, 'Téléphone').fill('06 10 20 30 40');

      await children.saveButton.click();

      await expect(children.dialog).toBeHidden();
      await expect(children.notice).toHaveText('Tom Durand est inscrit(e).');
      // He starts in November: the list switched to the upcoming children.
      await expect(children.filter('À venir')).toHaveClass(/filters__item--active/);
      await expect(children.row('Tom')).toContainText('Du 02/11/2026 au 30/07/2027');
      await expect(children.row('Tom')).toContainText('+ 1 contact');

      expect(api.saves()).toHaveLength(1);
      expect(api.saves()[0]).toMatchObject({
        method: 'POST',
        body: {
          firstName: 'Tom',
          enrollmentStart: '2026-11-02',
          enrollmentEnd: '2027-07-30',
          parents: [
            { ...ANNE, relationship: 'mother' },
            { firstName: 'Paul', relationship: 'father' },
          ],
          contacts: [{ firstName: 'Jeanne', relationship: 'Grand-mère' }],
        },
      });
    });

    test('refuse un formulaire incomplet ou incohérent sans rien envoyer', async () => {
      await children.newButton.click();
      await children.saveButton.click();
      await expect(children.form).toContainText('Le prénom est obligatoire.');
      await expect(children.form).toContainText("L'e-mail est obligatoire.");

      await children.fillChild({ ...TOM, start: '2025-01-01' });
      await expect(children.form).toContainText(
        "L'inscription ne peut pas commencer avant la naissance.",
      );
      await children.enrollmentField('Premier jour').fill('2026-11-02');
      await children.enrollmentField('Dernier jour').fill('2026-10-01');
      await expect(children.form).toContainText('La fin doit être le même jour ou après le début.');

      await children.fillParent(0, { ...ANNE, email: 'anne@', phone: 'abc' });
      await expect(children.parent(0)).toContainText('Adresse e-mail invalide.');
      await expect(children.parent(0)).toContainText('Numéro de téléphone invalide.');

      await children.saveButton.click();
      await expect(children.dialog).toBeVisible();
      expect(api.saves()).toEqual([]);
    });

    test("modifie l'inscription d'un enfant", async () => {
      await children.row('Léa').click();
      await expect(children.form.getByRole('heading', { name: 'Léa Martin' })).toBeVisible();
      await expect(children.childField('Prénom')).toHaveValue('Léa');
      await expect(field(children.parent(1), 'E-mail')).toHaveValue('thomas.martin@example.com');
      await expect(field(children.contact(0), 'Lien')).toHaveValue('Grand-mère');

      await children.childField('Nom').fill('Martin-Dupont');
      await children.parent(1).getByRole('button', { name: 'Retirer' }).click();
      await children.contact(0).getByRole('button', { name: 'Retirer ce contact' }).click();
      await children.saveButton.click();

      await expect(children.dialog).toBeHidden();
      await expect(children.notice).toHaveText(
        "L'inscription de Léa Martin-Dupont est enregistrée.",
      );
      await expect(children.row('Léa')).toContainText('Martin-Dupont');
      await expect(children.row('Léa')).not.toContainText('contact');
      expect(api.saves()[0]).toMatchObject({
        method: 'PUT',
        path: '/api/children/c1',
        body: { lastName: 'Martin-Dupont', contacts: [] },
      });
      expect((api.saves()[0].body as { parents: unknown[] }).parents).toHaveLength(1);
    });

    test("ajouter un parent ou un contact sans le remplir n'empêche pas de quitter", async ({
      page,
    }) => {
      const confirms: string[] = [];
      page.on('dialog', (confirm) => {
        confirms.push(confirm.message());
        void confirm.dismiss();
      });
      const addParent = children.form.getByRole('button', { name: '+ Ajouter un parent' });
      const addContact = children.form.getByRole('button', { name: '+ Ajouter un contact' });

      // New registration: Annuler, then Escape.
      await children.newButton.click();
      await addParent.click();
      await addContact.click();
      await expect(children.contact(0)).toBeVisible();
      await children.cancelButton.click();
      await expect(children.dialog).toBeHidden();

      await children.newButton.click();
      await addContact.click();
      await expect(children.contact(0)).toBeVisible();
      await page.keyboard.press('Escape');
      await expect(children.dialog).toBeHidden();

      // Existing child: the backdrop.
      await children.row('Léa').click();
      await addContact.click();
      await expect(children.contact(1)).toBeVisible();
      await page.mouse.click(5, 5);
      await expect(children.dialog).toBeHidden();
      expect(confirms).toEqual([]);

      // Once the added contact is filled in, leaving asks for confirmation.
      await children.row('Léa').click();
      await addContact.click();
      await field(children.contact(1), 'Prénom').fill('Paul');
      await children.cancelButton.click();
      expect(confirms).toHaveLength(1);
      await expect(children.dialog).toBeVisible();
      expect(api.saves()).toEqual([]);
    });

    test('le dernier parent ne peut pas être retiré', async () => {
      await children.row('Hugo').click();
      await expect(children.parent(0).getByRole('button', { name: 'Retirer' })).toBeDisabled();
    });

    test('se ferme avec Échap, le fond ou Annuler, en protégeant les modifications', async ({
      page,
    }) => {
      // Without changes, Escape and a click on the backdrop close it directly.
      // (The dialog opens on the next render: wait for it before acting.)
      await children.newButton.click();
      await expect(children.dialog).toBeVisible();
      await page.keyboard.press('Escape');
      await expect(children.dialog).toBeHidden();

      await children.newButton.click();
      await expect(children.dialog).toBeVisible();
      await page.mouse.click(5, 5); // on the dimmed backdrop
      await expect(children.dialog).toBeHidden();

      // With changes, the user is asked first.
      await children.newButton.click();
      await children.childField('Prénom').fill('Tom');
      const asked = new Promise<string>((resolve) =>
        page.once('dialog', (confirm) => {
          resolve(confirm.message());
          void confirm.dismiss();
        }),
      );
      await page.keyboard.press('Escape');
      expect(await asked).toContain('Des modifications ne sont pas enregistrées');
      await expect(children.dialog).toBeVisible();
      await expect(children.childField('Prénom')).toHaveValue('Tom');

      page.once('dialog', (confirm) => void confirm.accept());
      await children.cancelButton.click();
      await expect(children.dialog).toBeHidden();
      expect(api.saves()).toEqual([]);
    });
  });

  test.describe('rapports du jour', () => {
    test('un enfant inscrit apparaît dans les rapports à partir de son premier jour', async ({
      page,
    }) => {
      await children.newButton.click();
      await children.fillChild({ ...TOM, start: '2026-10-19' });
      await children.fillParent(0, ANNE);
      await children.saveButton.click();
      await expect(children.dialog).toBeHidden();

      const reports = new DailyReportsPage(page);
      await page.getByRole('link', { name: 'Rapports du jour', exact: true }).click();
      await expect(reports.rows).toHaveCount(5); // Friday 16th: not enrolled yet
      await expect(reports.row('Tom')).toHaveCount(0);

      await reports.nextDay.click(); // Monday 19th
      await expect(reports.longDate).toHaveText('lundi 19 octobre 2026');
      await expect(reports.row('Tom')).toContainText('À remplir');
      await expect(reports.rows).toHaveCount(6);
    });

    test("un enfant dont l'inscription se termine disparaît des jours suivants", async ({
      page,
    }) => {
      await children.row('Hugo').click();
      await children.enrollmentField('Dernier jour').fill('2026-10-16');
      await children.saveButton.click();
      await expect(children.notice).toContainText('Hugo Bernard');

      const reports = new DailyReportsPage(page);
      await reports.goto();
      await expect(reports.row('Hugo')).toHaveCount(1); // still enrolled on Friday 16th
      await reports.nextDay.click();
      await expect(reports.longDate).toHaveText('lundi 19 octobre 2026');
      await expect(reports.row('Hugo')).toHaveCount(0);
      await expect(reports.rows).toHaveCount(4);
    });

    test('un nouveau prénom est repris dans les rapports et le tableau de bord', async ({
      page,
    }) => {
      await children.row('Chloé').click();
      await children.childField('Prénom').fill('Chloë');
      await children.saveButton.click();
      await expect(children.dialog).toBeHidden();

      const reports = new DailyReportsPage(page);
      await reports.goto();
      await expect(reports.row('Chloë')).toHaveCount(1);

      await page.goto('/accueil');
      const tile = page.getByRole('region', { name: 'Rapports du jour' });
      await expect(tile.locator('.progress__figure')).toContainText('2 / 5');
    });
  });

  test.describe('petit écran', () => {
    test.use({ viewport: { width: 375, height: 740 } });

    test('la liste et la modale restent utilisables sur un smartphone', async ({ page }) => {
      await expect(children.rows.first()).toBeVisible();
      const row = (await children.rows.first().boundingBox())!;
      expect(row.x + row.width).toBeLessThanOrEqual(375);

      await children.newButton.click();
      await expect(children.dialog).toBeVisible();
      const dialog = (await children.dialog.boundingBox())!;
      expect(dialog.x).toBeGreaterThanOrEqual(0);
      expect(dialog.x + dialog.width).toBeLessThanOrEqual(375);
      expect(dialog.y + dialog.height).toBeLessThanOrEqual(740);

      // The form body scrolls while the buttons stay reachable.
      await expect(children.saveButton).toBeInViewport();
      await children.form.getByRole('button', { name: '+ Ajouter un contact' }).click();
      await expect(children.contact(0)).toBeVisible();
      await expect(children.saveButton).toBeInViewport();
      await page.screenshot({ path: 'test-results/inscriptions-mobile.png' });
    });
  });
});
