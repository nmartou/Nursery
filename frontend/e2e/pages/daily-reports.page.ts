import { Locator, Page } from '@playwright/test';

/** Page object for /rapports: keeps selectors in one place. */
export class DailyReportsPage {
  readonly heading: Locator;
  readonly longDate: Locator;
  readonly dateInput: Locator;
  readonly nextDay: Locator;
  readonly previousDay: Locator;
  readonly list: Locator;
  readonly rows: Locator;
  readonly summary: Locator;
  readonly form: Locator;
  readonly saveButton: Locator;
  readonly formState: Locator;
  readonly error: Locator;

  constructor(private readonly page: Page) {
    this.heading = page.getByRole('heading', { name: 'Rapports du jour' });
    this.longDate = page.locator('.page__date');
    this.dateInput = page.getByLabel('Date des rapports');
    this.nextDay = page.getByRole('button', { name: 'Jour suivant' });
    this.previousDay = page.getByRole('button', { name: 'Jour précédent' });
    this.list = page.locator('app-report-list');
    this.rows = this.list.locator('.row');
    this.summary = page.locator('.list__summary');
    this.form = page.locator('app-report-form');
    this.saveButton = this.form.getByRole('button', { name: 'Enregistrer' });
    this.formState = this.form.locator('.report__state');
    this.error = page.getByRole('alert');
  }

  async goto(): Promise<void> {
    await this.page.goto('/rapports');
  }

  row(firstName: string): Locator {
    return this.rows.filter({ hasText: firstName });
  }

  badge(firstName: string): Locator {
    return this.row(firstName).locator('.badge');
  }

  async open(firstName: string): Promise<void> {
    await this.row(firstName).click();
    await this.form.locator('.report__name', { hasText: firstName }).waitFor();
  }

  /** Form section by its title (Présence, Alimentation, Sieste…). */
  section(title: string): Locator {
    return this.form.locator('.section').filter({
      has: this.page.getByRole('heading', { name: title, level: 3 }),
    });
  }

  field(label: string): Locator {
    return this.form.getByLabel(label, { exact: true });
  }

  async save(): Promise<void> {
    await this.saveButton.click();
  }
}
