import { expect, test } from '@playwright/test';
import { DailyReportsPage } from './pages/daily-reports.page';
import { MockApi } from './support/mock-api';

test.describe('Rapports du jour', () => {
  let api: MockApi;
  let reports: DailyReportsPage;

  test.beforeEach(async ({ page }) => {
    api = await MockApi.install(page);
    reports = new DailyReportsPage(page);
    await reports.goto();
  });

  test.describe('Liste', () => {
    test('affiche les enfants du jour avec un indicateur par ligne', async () => {
      await expect(reports.heading).toBeVisible();
      await expect(reports.longDate).toHaveText('vendredi 16 octobre 2026');
      // Displayed as "Vendredi…": the capital letter comes from CSS
      expect(
        await reports.longDate.evaluate(
          (el) => getComputedStyle(el, '::first-letter').textTransform,
        ),
      ).toBe('uppercase');
      await expect(reports.rows).toHaveCount(5);

      await expect(reports.badge('Léa')).toHaveText('Complet');
      await expect(reports.badge('Hugo')).toHaveText('À compléter');
      await expect(reports.badge('Chloé')).toHaveText('À remplir');
      await expect(reports.badge('Nathan')).toHaveText('Absent');
      await expect(reports.badge('Inès')).toHaveText('À compléter');

      await expect(reports.summary).toHaveText('3 rapports à remplir ou compléter');
    });

    test("affiche l'heure de dernière modification sur chaque ligne", async () => {
      for (const row of await reports.rows.all()) {
        await expect(row.locator('.row__time')).toHaveText(/^Modifié à \d{2}:\d{2}$/);
      }
    });

    test('distingue les états par une couleur différente', async () => {
      const colorOf = (name: string) =>
        reports.badge(name).evaluate((el) => getComputedStyle(el).color);
      const colors = new Set(
        await Promise.all(['Léa', 'Hugo', 'Chloé', 'Nathan'].map((name) => colorOf(name))),
      );
      expect(colors.size).toBe(4);
    });

    test('n’affiche pas de formulaire tant qu’aucun enfant n’est choisi', async () => {
      await expect(reports.form).toHaveCount(0);
    });
  });

  test.describe('Ouverture du formulaire', () => {
    test('décale la liste à gauche et ouvre le formulaire à côté', async () => {
      const listBefore = (await reports.list.boundingBox())!;

      await reports.open('Hugo');

      await expect(reports.form).toBeVisible();
      await expect(reports.row('Hugo')).toHaveClass(/row--selected/);
      await expect
        .poll(async () => (await reports.list.boundingBox())!.width)
        .toBeLessThan(listBefore.width);
      // The list and the form slide with a CSS transition: wait for the end position.
      await expect
        .poll(async () => {
          const list = (await reports.list.boundingBox())!;
          const form = (await reports.form.boundingBox())!;
          return form.x - (list.x + list.width);
        })
        .toBeGreaterThan(-1);
    });

    test('pré-remplit le nom et les données déjà saisies', async () => {
      await reports.open('Hugo');

      await expect(reports.form.locator('.report__name')).toHaveText('Hugo Bernard');
      await expect(reports.form.locator('.report__date')).toHaveText('vendredi 16 octobre 2026');
      await expect(reports.field("Heure d'arrivée")).toHaveValue('08:40');
      await expect(reports.field('Heure de départ')).toHaveValue('');
      await expect(reports.field('Heure du biberon')).toHaveValue('09:30');
      await expect(reports.field('Quantité en millilitres')).toHaveValue('210');
      await expect(reports.field('Début de la sieste')).toHaveValue('10:00');
      await expect(reports.formState).toHaveText(/Enregistré à \d{2}:\d{2}/);
    });

    test('se ferme avec le bouton de fermeture', async ({ page }) => {
      await reports.open('Hugo');
      await page.getByRole('button', { name: 'Fermer le formulaire' }).click();
      await expect(reports.form).toHaveCount(0);
      await expect(reports.row('Hugo')).not.toHaveClass(/row--selected/);
    });
  });

  test.describe('Saisie et enregistrement', () => {
    test('enregistre un rapport complet et met à jour la ligne', async ({ page }) => {
      await reports.open('Chloé');

      await reports.field("Heure d'arrivée").fill('08:05');
      await reports.field('Heure de départ').fill('17:10');
      await expect(reports.formState).toHaveText('Modifications non enregistrées');

      await page.getByRole('button', { name: '+ Ajouter un repas' }).click();
      await reports.field('Aliment').fill('Purée de potiron');
      await reports.field('Quantité en grammes').fill('140');

      await page.getByRole('button', { name: '+ Ajouter un biberon' }).click();
      await expect(reports.field('Heure du biberon')).toHaveValue(/^\d{2}:\d{2}$/);
      await reports.field('Heure du biberon').fill('15:45');
      await reports.field('Quantité en millilitres').fill('180');

      await page.getByRole('button', { name: '+ Ajouter une sieste' }).click();
      await reports.field('Début de la sieste').fill('12:45');
      await reports.field('Fin de la sieste').fill('14:30');

      await reports.section('Transmission aux parents').locator('textarea').fill('Belle journée !');
      await reports.save();

      await expect(reports.badge('Chloé')).toHaveText('Complet');
      await expect(reports.form.locator('.report__header .badge')).toHaveText('Complet');
      await expect(reports.formState).toHaveText(/Enregistré à \d{2}:\d{2}/);
      await expect(reports.summary).toHaveText('2 rapports à remplir ou compléter');

      expect(api.saves()).toHaveLength(1);
      expect(api.saves()[0].body).toEqual({
        absent: false,
        absenceComment: null,
        arrivalTime: '08:05',
        departureTime: '17:10',
        meals: [{ label: 'Purée de potiron', quantityGrams: 140 }],
        bottles: [{ time: '15:45', quantityMl: 180 }],
        mealComment: null,
        naps: [{ startTime: '12:45', endTime: '14:30' }],
        noNap: false,
        napComment: null,
        stoolStatus: 'normal',
        stoolComment: null,
        parentNote: 'Belle journée !',
      });
    });

    test('met à jour l’heure de modification de la ligne après enregistrement', async () => {
      api.now = () => new Date('2026-10-16T14:27:00+02:00');
      await expect(reports.row('Hugo').locator('.row__time')).not.toHaveText('Modifié à 14:27');
      await reports.open('Hugo');
      await reports.field('Heure de départ').fill('16:00');
      await reports.save();

      await expect(reports.row('Hugo').locator('.row__time')).toHaveText('Modifié à 14:27');
    });

    test('ajoute et supprime des repas et des biberons', async ({ page }) => {
      await reports.open('Léa');
      const meals = reports.form.locator('[formarrayname="meals"] .entry');
      const bottles = reports.form.locator('[formarrayname="bottles"] .entry');
      await expect(meals).toHaveCount(2);
      await expect(bottles).toHaveCount(1);

      await page.getByRole('button', { name: '+ Ajouter un repas' }).click();
      await page.getByRole('button', { name: '+ Ajouter un biberon' }).click();
      await expect(meals).toHaveCount(3);
      await expect(bottles).toHaveCount(2);

      await page.getByRole('button', { name: 'Supprimer ce repas' }).first().click();
      await page.getByRole('button', { name: 'Supprimer ce biberon' }).last().click();
      await expect(meals).toHaveCount(2);
      await expect(bottles).toHaveCount(1);
      await expect(meals.first().getByLabel('Aliment')).toHaveValue('Compote de pommes');
    });

    test('bloque l’enregistrement si un repas n’a pas de libellé', async ({ page }) => {
      await reports.open('Chloé');
      await page.getByRole('button', { name: '+ Ajouter un repas' }).click();
      await reports.save();

      await expect(reports.field('Aliment')).toHaveClass(/invalid/);
      expect(api.saves()).toHaveLength(0);
    });

    test('« Pas de sieste » masque les plages de sieste', async () => {
      await reports.open('Hugo');
      const sieste = reports.section('Sieste');
      await expect(sieste.getByRole('button', { name: '+ Ajouter une sieste' })).toBeVisible();

      await sieste.getByLabel('Pas de sieste').check();
      await expect(sieste.getByRole('button', { name: '+ Ajouter une sieste' })).toBeHidden();
      await expect(reports.field('Début de la sieste')).toHaveCount(0);

      await reports.save();
      await expect.poll(() => api.saves().length).toBe(1);
      expect(api.saves()[0].body).toMatchObject({ noNap: true, naps: [] });
    });
  });

  test.describe('Absence', () => {
    test('le bouton Absent masque la journée et le commentaire est facultatif', async ({
      page,
    }) => {
      await reports.open('Chloé');
      await page.getByRole('button', { name: 'Absent', exact: true }).click();

      await expect(reports.section('Alimentation')).toHaveCount(0);
      await expect(reports.section('Sieste')).toHaveCount(0);
      await expect(reports.field("Heure d'arrivée")).toHaveCount(0);
      await expect(reports.form.getByText("Commentaire d'absence")).toBeVisible();

      await reports.save();
      await expect(reports.badge('Chloé')).toHaveText('Absent');
      expect(api.saves()[0].body).toMatchObject({ absent: true, absenceComment: null });
    });

    test('enregistre le commentaire d’absence et permet d’annuler', async ({ page }) => {
      await reports.open('Nathan');
      const absenceComment = reports.form.locator('textarea[formcontrolname="absenceComment"]');
      await expect(absenceComment).toHaveValue('Malade (otite).');
      await expect(page.getByRole('button', { name: "Annuler l'absence" })).toHaveAttribute(
        'aria-pressed',
        'true',
      );

      await page.getByRole('button', { name: "Annuler l'absence" }).click();
      await expect(reports.section('Alimentation')).toBeVisible();
      await reports.save();
      await expect(reports.badge('Nathan')).toHaveText('À remplir');
    });
  });

  test.describe('Selles', () => {
    test('sont « Normales » par défaut, sans commentaire', async () => {
      await reports.open('Hugo');
      await expect(reports.field('État des selles')).toHaveValue('normal');
      await expect(reports.form.getByText('Précisez')).toHaveCount(0);
    });

    test('le commentaire apparaît et devient obligatoire avec « Autre »', async () => {
      await reports.open('Hugo');
      await reports.field('État des selles').selectOption('other');

      const comment = reports.section('Selles').locator('textarea');
      await expect(comment).toBeVisible();

      await reports.save();
      await expect(reports.form.getByText('Un commentaire est obligatoire')).toBeVisible();
      expect(api.saves()).toHaveLength(0);

      await comment.fill('Selles dures');
      await reports.save();
      await expect.poll(() => api.saves().length).toBe(1);
      expect(api.saves()[0].body).toMatchObject({
        stoolStatus: 'other',
        stoolComment: 'Selles dures',
      });
    });

    test('revenir à « Normales » masque le commentaire', async () => {
      await reports.open('Inès');
      await expect(reports.section('Selles').locator('textarea')).toHaveValue(
        'Selles liquides, à surveiller.',
      );
      await reports.field('État des selles').selectOption('normal');
      await expect(reports.section('Selles').locator('textarea')).toHaveCount(0);
    });
  });

  test.describe('Modifications non enregistrées', () => {
    test('demande confirmation avant de changer d’enfant', async ({ page }) => {
      await reports.open('Hugo');
      await reports.field('Heure de départ').fill('16:30');

      page.once('dialog', (dialog) => dialog.dismiss());
      await reports.row('Chloé').click();
      await expect(reports.form.locator('.report__name')).toHaveText('Hugo Bernard');
      await expect(reports.field('Heure de départ')).toHaveValue('16:30');

      page.once('dialog', (dialog) => dialog.accept());
      await reports.row('Chloé').click();
      await expect(reports.form.locator('.report__name')).toHaveText('Chloé Dubois');
    });

    test('ne demande rien quand le formulaire est intact', async ({ page }) => {
      let dialogs = 0;
      page.on('dialog', (dialog) => {
        dialogs++;
        void dialog.dismiss();
      });
      await reports.open('Hugo');
      await reports.open('Chloé');
      expect(dialogs).toBe(0);
    });
  });

  test.describe('Choix du jour', () => {
    test('passe au jour de semaine suivant en sautant le week-end', async () => {
      await reports.nextDay.click();

      await expect(reports.longDate).toHaveText('lundi 19 octobre 2026');
      await expect(reports.dateInput).toHaveValue('2026-10-19');
      await expect(reports.rows).toHaveCount(5);
      for (const name of ['Léa', 'Hugo', 'Chloé', 'Nathan', 'Inès']) {
        await expect(reports.badge(name)).toHaveText('À remplir');
      }

      await reports.previousDay.click();
      await expect(reports.longDate).toHaveText('vendredi 16 octobre 2026');
      await expect(reports.badge('Léa')).toHaveText('Complet');
    });

    test('refuse un jour de week-end choisi dans le calendrier', async () => {
      await reports.dateInput.fill('2026-10-17');
      await expect(reports.error).toContainText('fermée le week-end');
      await expect(reports.longDate).toHaveText('vendredi 16 octobre 2026');
    });
  });
});

test.describe('Rapports du jour — cas particuliers', () => {
  test("affiche une erreur quand l'API est injoignable", async ({ page }) => {
    await MockApi.install(page, { offline: true });
    await new DailyReportsPage(page).goto();
    await expect(page.getByRole('alert')).toContainText("Impossible de joindre l'API");
  });

  test('empile la liste et le formulaire sur un petit écran', async ({ page }) => {
    await page.setViewportSize({ width: 800, height: 900 });
    await MockApi.install(page);
    const reports = new DailyReportsPage(page);
    await reports.goto();
    await reports.open('Hugo');

    const list = (await reports.list.boundingBox())!;
    const form = (await reports.form.boundingBox())!;
    expect(form.y).toBeGreaterThanOrEqual(list.y + list.height - 1);

    const overflow = await page
      .locator('.layout__content')
      .evaluate((el) => el.scrollWidth - el.clientWidth);
    expect(overflow).toBeLessThanOrEqual(0);
  });
});
