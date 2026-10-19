import type { Locator, Page } from '@playwright/test';

/**
 * The input labelled `label` inside `scope`. Matched on the start of the label:
 * "Nom" must not match "Prénom", and an error message shown in the label
 * ("Prénom Le prénom est obligatoire.") must not hide the field.
 */
export function field(scope: Locator, label: string): Locator {
  return scope.getByLabel(new RegExp(`^${label}`));
}

/** Page object for /inscriptions: keeps selectors in one place. */
export class ChildrenPage {
  readonly heading: Locator;
  readonly newButton: Locator;
  readonly rows: Locator;
  readonly search: Locator;
  readonly notice: Locator;
  readonly dialog: Locator;
  readonly form: Locator;
  readonly saveButton: Locator;
  readonly cancelButton: Locator;

  constructor(private readonly page: Page) {
    this.heading = page.getByRole('heading', { name: 'Inscriptions', level: 1 });
    this.newButton = page.getByRole('button', { name: 'Inscrire un enfant' });
    this.rows = page.locator('app-child-list .row');
    this.search = page.getByLabel('Rechercher un enfant');
    this.notice = page.getByRole('status');
    this.dialog = page.locator('dialog.modal');
    this.form = this.dialog.locator('app-child-form');
    this.saveButton = this.form.locator('button[type="submit"]');
    this.cancelButton = this.form.getByRole('button', { name: 'Annuler' });
  }

  async goto(): Promise<void> {
    await this.page.goto('/inscriptions');
  }

  row(name: string): Locator {
    return this.rows.filter({ hasText: name });
  }

  filter(label: string): Locator {
    return this.page.locator('.filters__item').filter({ hasText: label });
  }

  async showFilter(label: string): Promise<void> {
    await this.filter(label).click();
  }

  /** A field of the child section. */
  childField(label: string): Locator {
    return field(this.form.locator('fieldset').nth(0), label);
  }

  enrollmentField(label: string): Locator {
    return field(this.form.locator('fieldset').nth(1), label);
  }

  parent(index: number): Locator {
    return this.form.getByRole('group', { name: `Parent ${index + 1}` });
  }

  contact(index: number): Locator {
    return this.form.getByRole('group', { name: `Contact ${index + 1}` });
  }

  async fillChild(child: {
    firstName: string;
    lastName: string;
    birthDate: string;
    start: string;
    end?: string;
  }): Promise<void> {
    await this.childField('Prénom').fill(child.firstName);
    await this.childField('Nom').fill(child.lastName);
    await this.childField('Date de naissance').fill(child.birthDate);
    await this.enrollmentField('Premier jour').fill(child.start);
    if (child.end) {
      await this.enrollmentField('Dernier jour').fill(child.end);
    }
  }

  async fillParent(
    index: number,
    parent: { firstName: string; lastName: string; email: string; phone: string },
  ): Promise<void> {
    const card = this.parent(index);
    await field(card, 'Prénom').fill(parent.firstName);
    await field(card, 'Nom').fill(parent.lastName);
    await field(card, 'E-mail').fill(parent.email);
    await field(card, 'Téléphone').fill(parent.phone);
  }
}
