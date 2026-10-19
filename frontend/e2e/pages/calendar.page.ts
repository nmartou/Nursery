import type { Locator, Page } from '@playwright/test';
import { field } from './children.page';

/** Page object for /calendrier: keeps selectors in one place. */
export class CalendarPage {
  readonly heading: Locator;
  readonly monthLabel: Locator;
  readonly previousMonth: Locator;
  readonly nextMonth: Locator;
  readonly newClosure: Locator;
  readonly newAbsence: Locator;
  readonly notice: Locator;
  readonly monthView: Locator;
  readonly agenda: Locator;
  readonly dialog: Locator;
  readonly saveButton: Locator;
  readonly cancelButton: Locator;
  readonly deleteButton: Locator;

  constructor(private readonly page: Page) {
    this.heading = page.getByRole('heading', { name: 'Calendrier', level: 1 });
    this.monthLabel = page.locator('.month-nav__label');
    this.previousMonth = page.getByRole('button', { name: 'Mois précédent' });
    this.nextMonth = page.getByRole('button', { name: 'Mois suivant' });
    this.newClosure = page.getByRole('button', { name: '+ Fermeture' });
    this.newAbsence = page.getByRole('button', { name: '+ Absence' });
    this.notice = page.getByRole('status');
    this.monthView = page.locator('app-month-view');
    this.agenda = page.locator('app-agenda-view');
    this.dialog = page.locator('dialog.modal');
    this.saveButton = this.dialog.getByRole('button', { name: 'Enregistrer' });
    this.cancelButton = this.dialog.getByRole('button', { name: 'Annuler' });
    this.deleteButton = this.dialog.getByRole('button', { name: 'Supprimer' });
  }

  async goto(): Promise<void> {
    await this.page.goto('/calendrier');
  }

  /** Event chips shown on a day of the month grid. */
  day(date: string): Locator {
    return this.monthView.locator(`[data-date="${date}"] .chip`);
  }

  filter(label: string): Locator {
    return this.page.locator('.filters__item').filter({ hasText: label }).locator('input');
  }

  dialogField(label: string): Locator {
    return field(this.dialog, label);
  }

  async fillAbsence(absence: {
    child: string;
    kind?: 'Congés' | 'Maladie' | 'Autre absence';
    start: string;
    end?: string;
    comment?: string;
  }): Promise<void> {
    await this.dialog.getByLabel('Enfant').selectOption({ label: absence.child });
    if (absence.kind) {
      await this.dialog.getByLabel(absence.kind).check();
    }
    await this.dialogField('Premier jour').fill(absence.start);
    if (absence.end) {
      await this.dialogField('Dernier jour').fill(absence.end);
    }
    if (absence.comment) {
      await this.dialogField('Commentaire').fill(absence.comment);
    }
  }
}
