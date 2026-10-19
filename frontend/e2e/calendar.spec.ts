import { expect, test } from '@playwright/test';
import { CalendarPage } from './pages/calendar.page';
import { ChildrenPage } from './pages/children.page';
import { DailyReportsPage } from './pages/daily-reports.page';
import { MockApi } from './support/mock-api';

test.describe('Calendrier', () => {
  let api: MockApi;
  let calendar: CalendarPage;

  test.beforeEach(async ({ page }) => {
    // "Today" is Monday 19 October 2026, like the mock API.
    await page.clock.setFixedTime(new Date('2026-10-19T09:00:00'));
    api = await MockApi.install(page);
    calendar = new CalendarPage(page);
    await calendar.goto();
    await expect(calendar.heading).toBeVisible();
  });

  test.describe('vue du mois', () => {
    test("s'ouvre sur le mois en cours et passe d'un mois à l'autre", async () => {
      await expect(calendar.monthLabel).toHaveText('octobre 2026');
      await expect(calendar.monthView.locator('.day--today')).toHaveAttribute(
        'data-date',
        '2026-10-19',
      );
      // Arrivals and departures come from the enrollments: nobody in October.
      await calendar.nextMonth.click();
      await expect(calendar.monthLabel).toHaveText('novembre 2026');
      await expect(calendar.day('2026-11-01')).toHaveText(['Férié · Toussaint']);
      await expect(calendar.day('2026-11-02')).toHaveText(['Arrivée · Emma Moreau']);
      await expect(calendar.day('2026-11-09')).toHaveText(['Fermeture · Pont du 11 novembre']);
      await expect(calendar.day('2026-11-10')).toHaveText(['Fermeture · Pont du 11 novembre']);
      await expect(calendar.day('2026-11-11')).toHaveText(['Férié · Armistice 1918']);

      for (const month of ['octobre', 'septembre', 'août', 'juillet']) {
        await calendar.previousMonth.click();
        await expect(calendar.monthLabel).toHaveText(`${month} 2026`);
      }
      await expect(calendar.day('2026-07-31')).toHaveText(['Départ · Lucas Garnier']);
    });

    test('filtre les types d’événements', async () => {
      await calendar.nextMonth.click();
      await calendar.filter('Fermetures').uncheck();
      await expect(calendar.day('2026-11-09')).toHaveCount(0);
      await expect(calendar.day('2026-11-02')).toHaveCount(1);
      await calendar.filter('Arrivées et départs').uncheck();
      await expect(calendar.day('2026-11-02')).toHaveCount(0);
      await calendar.filter('Fermetures').check();
      await expect(calendar.day('2026-11-11')).toHaveCount(1);
    });
  });

  test.describe('fermetures', () => {
    test('ferme la crèche : plus de rapport ces jours-là', async ({ page }) => {
      await calendar.newClosure.click();
      await expect(calendar.dialog).toBeVisible();
      await calendar.dialogField('Motif').fill('Formation du personnel');
      await calendar.dialogField('Premier jour').fill('2026-10-22');
      // The last day follows the first: a one-day closure.
      await expect(calendar.dialogField('Dernier jour')).toHaveValue('2026-10-22');
      await calendar.dialogField('Dernier jour').fill('2026-10-23');
      await calendar.saveButton.click();

      await expect(calendar.dialog).toBeHidden();
      await expect(calendar.notice).toHaveText('Fermeture « Formation du personnel » enregistrée.');
      await expect(calendar.day('2026-10-23')).toHaveText(['Fermeture · Formation du personnel']);

      const reports = new DailyReportsPage(page);
      await reports.goto();
      await reports.dateInput.fill('2026-10-22');
      await expect(page.locator('.closed')).toContainText('La crèche est fermée ce jour-là');
      await expect(page.locator('.closed')).toContainText('Formation du personnel');
      await expect(reports.rows).toHaveCount(0);
    });

    test('un jour férié ferme aussi la crèche', async ({ page }) => {
      const reports = new DailyReportsPage(page);
      await reports.goto();
      await reports.dateInput.fill('2026-11-11');
      await expect(page.locator('.closed')).toContainText('Armistice 1918');
    });

    test('modifie puis supprime une fermeture', async ({ page }) => {
      await calendar.nextMonth.click();
      await calendar.day('2026-11-09').click();
      await expect(
        calendar.dialog.getByRole('heading', { name: 'Modifier la fermeture' }),
      ).toBeVisible();
      await expect(calendar.dialogField('Motif')).toHaveValue('Pont du 11 novembre');
      await calendar.dialogField('Dernier jour').fill('2026-11-09');
      await calendar.saveButton.click();
      await expect(calendar.day('2026-11-10')).toHaveCount(0);

      await calendar.day('2026-11-09').click();
      page.once('dialog', (confirm) => void confirm.accept());
      await calendar.deleteButton.click();
      await expect(calendar.notice).toHaveText('Fermeture supprimée.');
      await expect(calendar.day('2026-11-09')).toHaveCount(0);
      expect(api.saves().map((r) => r.method)).toEqual(['PUT', 'DELETE']);
    });
  });

  test.describe('absences notées dans les rapports du jour', () => {
    test('affiche un enfant marqué absent dans son rapport', async () => {
      // Seed: Nathan is absent on Friday 16th in his report.
      const nathan = calendar.day('2026-10-16');
      await expect(nathan).toHaveText(['Nathan Petit · Absent(e)']);
      await expect(nathan).toHaveAttribute('title', 'Nathan Petit · Absent(e) — Malade (otite).');
      // It is changed in the report, not from the calendar.
      await expect(calendar.monthView.locator('[data-date="2026-10-16"] button.chip')).toHaveCount(
        0,
      );
    });

    test('une absence saisie dans un rapport apparaît aussitôt dans le calendrier', async ({
      page,
    }) => {
      const reports = new DailyReportsPage(page);
      await reports.goto();
      await reports.nextDay.click(); // Monday 19th
      await reports.open('Hugo');
      await page.getByRole('button', { name: 'Absent', exact: true }).click();
      await reports.form.locator('textarea[formcontrolname="absenceComment"]').fill('Fièvre');
      await reports.save();
      await expect(reports.badge('Hugo')).toHaveText('Absent');

      await calendar.goto();
      await expect(calendar.day('2026-10-19')).toHaveText(['Hugo Bernard · Absent(e)']);
      await expect(calendar.day('2026-10-19')).toHaveAttribute(
        'title',
        'Hugo Bernard · Absent(e) — Fièvre',
      );

      // Hidden with the other absences.
      await calendar.filter('Absences').uncheck();
      await expect(calendar.day('2026-10-19')).toHaveCount(0);
    });

    test("n'est pas affichée deux fois quand l'absence était prévue", async ({ page }) => {
      await calendar.newAbsence.click();
      await calendar.fillAbsence({ child: 'Léa Martin', kind: 'Congés', start: '2026-10-19' });
      await calendar.saveButton.click();
      await expect(calendar.dialog).toBeHidden();

      const reports = new DailyReportsPage(page);
      await reports.goto();
      await reports.nextDay.click();
      await reports.open('Léa');
      await page.getByRole('button', { name: 'Absent', exact: true }).click();
      await reports.save();
      await expect(reports.badge('Léa')).toHaveText('Absent');

      await calendar.goto();
      await expect(calendar.day('2026-10-19')).toHaveText(['Léa Martin · Congés']);
    });
  });

  test.describe('absences des enfants', () => {
    test("une absence s'affiche dans le calendrier, les rapports et les inscriptions", async ({
      page,
    }) => {
      await calendar.newAbsence.click();
      await calendar.fillAbsence({
        child: 'Léa Martin',
        kind: 'Maladie',
        start: '2026-10-19',
        end: '2026-10-20',
        comment: 'Otite',
      });
      await expect(calendar.dialog).toContainText(
        'Léa est inscrit(e) du 01/09/2026 au 30/07/2027.',
      );
      await calendar.saveButton.click();

      await expect(calendar.notice).toHaveText('Absence de Léa enregistrée.');
      await expect(calendar.day('2026-10-19')).toHaveText(['Léa Martin · Maladie']);
      await expect(calendar.day('2026-10-20')).toHaveText(['Léa Martin · Maladie']);

      // Daily reports: absent while nothing is entered, with the reason.
      const reports = new DailyReportsPage(page);
      await reports.goto();
      await reports.nextDay.click(); // Monday 19th
      await expect(reports.row('Léa')).toContainText('Absent');
      await expect(reports.row('Léa')).toContainText('Absence prévue : Maladie');
      await reports.open('Léa');
      await expect(reports.form.getByRole('note')).toContainText('Absence prévue : Maladie');
      await expect(reports.form.getByRole('note')).toContainText('Otite');

      // Registrations: absent today, and listed in the child's form.
      const children = new ChildrenPage(page);
      await children.goto();
      await expect(children.row('Léa')).toContainText("Absent aujourd'hui · Maladie");
      await children.row('Léa').click();
      await expect(children.form.getByRole('heading', { name: 'Absences' })).toBeVisible();
      await expect(children.form.locator('[data-group="current"]')).toContainText(
        'Maladie du 19/10/2026 au 20/10/2026 (prévu au calendrier)',
      );
    });

    test("supprimer l'absence rend le rapport à remplir", async ({ page }) => {
      await calendar.newAbsence.click();
      await calendar.fillAbsence({ child: 'Hugo Bernard', kind: 'Congés', start: '2026-10-19' });
      await calendar.saveButton.click();
      await expect(calendar.day('2026-10-19')).toHaveText(['Hugo Bernard · Congés']);

      await calendar.day('2026-10-19').click();
      await expect(
        calendar.dialog.getByRole('heading', { name: 'Modifier l’absence' }),
      ).toBeVisible();
      page.once('dialog', (confirm) => void confirm.accept());
      await calendar.deleteButton.click();
      await expect(calendar.notice).toHaveText('Absence supprimée.');

      const reports = new DailyReportsPage(page);
      await reports.goto();
      await reports.nextDay.click();
      await expect(reports.row('Hugo')).toContainText('À remplir');
      await expect(reports.row('Hugo')).not.toContainText('Absence prévue');
    });

    test('refuse une absence hors inscription ou qui en chevauche une autre', async () => {
      await calendar.newAbsence.click();
      await calendar.fillAbsence({ child: 'Emma Moreau', start: '2026-10-26' });
      await expect(calendar.dialog).toContainText(
        "L'absence doit être comprise dans la période d'inscription.",
      );
      await calendar.saveButton.click();
      await expect(calendar.dialog).toBeVisible();
      expect(api.saves()).toEqual([]);

      await calendar.fillAbsence({ child: 'Léa Martin', start: '2026-10-21' });
      await calendar.saveButton.click();
      await expect(calendar.dialog).toBeHidden();

      await calendar.newAbsence.click();
      await calendar.fillAbsence({ child: 'Léa Martin', start: '2026-10-20', end: '2026-10-22' });
      await calendar.saveButton.click();
      await expect(calendar.dialog.getByRole('alert')).toContainText(
        'Une absence est déjà prévue pour cet enfant sur cette période.',
      );
    });

    test("n'est proposée que pour les enfants inscrits ou à venir", async () => {
      await calendar.newAbsence.click();
      await expect(calendar.dialog.getByLabel('Enfant').locator('option')).toContainText([
        'Choisir un enfant…',
        'Léa Martin',
      ]);
      await expect(calendar.dialog.getByLabel('Enfant')).not.toContainText('Lucas Garnier');
      await expect(calendar.dialog.getByLabel('Enfant')).toContainText('Emma Moreau');
    });
  });

  test.describe("historique des absences dans la fiche de l'enfant", () => {
    test('montre les absences passées notées dans les rapports', async ({ page }) => {
      // Seed: Nathan is absent on Friday 16th in his report.
      const children = new ChildrenPage(page);
      await children.goto();
      await children.row('Nathan').click();
      const past = children.form.locator('[data-group="past"]');
      await expect(past).toContainText('Absent le 16/10/2026 (noté dans les rapports)');
      await expect(past).toContainText('Malade (otite).');
      await expect(children.form.locator('[data-group="current"]')).toContainText(
        "Pas d'absence aujourd'hui.",
      );
    });

    test("une absence notée aujourd'hui est « en cours », et regroupée avec la veille", async ({
      page,
    }) => {
      const reports = new DailyReportsPage(page);
      await reports.goto();
      // Friday 16th, then Monday 19th: one period across the weekend.
      for (const next of [false, true]) {
        if (next) {
          await reports.nextDay.click();
        }
        await reports.open('Hugo');
        await page.getByRole('button', { name: 'Absent', exact: true }).click();
        await reports.save();
        await expect(reports.badge('Hugo')).toHaveText('Absent');
      }

      const children = new ChildrenPage(page);
      await children.goto();
      await expect(children.row('Hugo')).toContainText("Absent aujourd'hui");
      await children.row('Hugo').click();
      await expect(children.form.locator('[data-group="current"]')).toContainText(
        'Absent du 16/10/2026 au 19/10/2026 (noté dans les rapports)',
      );
    });

    test('rassemble absences prévues, en cours et passées', async ({ page }) => {
      await calendar.newAbsence.click();
      await calendar.fillAbsence({
        child: 'Léa Martin',
        kind: 'Congés',
        start: '2026-12-21',
        end: '2026-12-24',
      });
      await calendar.saveButton.click();
      await expect(calendar.dialog).toBeHidden();

      const children = new ChildrenPage(page);
      await children.goto();
      await children.row('Léa').click();
      await expect(children.form.locator('[data-group="upcoming"]')).toContainText(
        'Congés du 21/12/2026 au 24/12/2026 (prévu au calendrier)',
      );
      await expect(children.form.locator('[data-group="past"]')).toContainText(
        'Aucune absence passée.',
      );
    });
  });

  test('se ferme avec Échap sans rien perdre sans confirmation', async ({ page }) => {
    await calendar.newClosure.click();
    await expect(calendar.dialog).toBeVisible();
    await page.keyboard.press('Escape');
    await expect(calendar.dialog).toBeHidden();

    await calendar.newClosure.click();
    await calendar.dialogField('Motif').fill('Vacances');
    page.once('dialog', (confirm) => void confirm.dismiss());
    await page.keyboard.press('Escape');
    await expect(calendar.dialog).toBeVisible();
    await expect(calendar.dialogField('Motif')).toHaveValue('Vacances');
  });

  test.describe('petit écran', () => {
    test.use({ viewport: { width: 375, height: 740 } });

    test('montre la liste des jours chargés au lieu de la grille', async () => {
      await calendar.nextMonth.click();
      await expect(calendar.monthView).toBeHidden();
      await expect(calendar.agenda).toBeVisible();
      await expect(calendar.agenda.locator('.agenda__day').first()).toContainText(
        'dimanche 1 novembre 2026',
      );
      await expect(calendar.agenda).toContainText('Fermeture · Pont du 11 novembre');

      await calendar.newAbsence.click();
      const box = (await calendar.dialog.boundingBox())!;
      expect(box.x + box.width).toBeLessThanOrEqual(375);
      await expect(calendar.saveButton).toBeInViewport();
    });
  });
});
