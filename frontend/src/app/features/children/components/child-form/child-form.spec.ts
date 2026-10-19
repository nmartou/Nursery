import { provideRouter } from '@angular/router';
import { type ComponentFixture, TestBed } from '@angular/core/testing';
import type { ChildPayload } from '../../models/child.model';
import { buildChild } from '../../testing/child.fixtures';
import { ChildForm } from './child-form';

describe('ChildForm', () => {
  let fixture: ComponentFixture<ChildForm>;
  let element: HTMLElement;
  let saved: ChildPayload[];

  async function render(child: ReturnType<typeof buildChild> | null = null): Promise<void> {
    fixture.componentRef.setInput('child', child);
    await fixture.whenStable();
  }

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [ChildForm],
      providers: [provideRouter([])],
    }).compileComponents();
    fixture = TestBed.createComponent(ChildForm);
    element = fixture.nativeElement as HTMLElement;
    saved = [];
    fixture.componentInstance.saveChild.subscribe((payload) => saved.push(payload));
    await render();
  });

  const input = (name: string, index = 0) =>
    element.querySelectorAll<HTMLInputElement>(`[formcontrolname="${name}"]`)[index];

  async function type(name: string, value: string, index = 0): Promise<void> {
    const field = input(name, index);
    field.value = value;
    field.dispatchEvent(new Event('input'));
    field.dispatchEvent(new Event('blur'));
    await fixture.whenStable();
  }

  async function submit(): Promise<void> {
    element.querySelector<HTMLButtonElement>('button[type="submit"]')?.click();
    await fixture.whenStable();
  }

  async function fillValidChild(): Promise<void> {
    await type('firstName', 'Tom');
    await type('lastName', 'Durand');
    await type('birthDate', '2025-06-01');
    await type('enrollmentStart', '2026-11-02');
    // Parent: the first name/last name inputs after the child's ones
    await type('firstName', 'Anne', 1);
    await type('lastName', 'Durand', 1);
    await type('email', 'anne.durand@example.com');
    await type('phone', '06 12 34 56 78');
  }

  const buttonByText = (text: string) =>
    [...element.querySelectorAll<HTMLButtonElement>('button')].find((b) =>
      b.textContent?.includes(text),
    );

  it('starts a new registration with one parent, which cannot be removed', () => {
    expect(element.querySelector('#child-form-title')?.textContent).toContain(
      'Nouvelle inscription',
    );
    expect(element.querySelectorAll('[aria-label^="Parent "]')).toHaveLength(1);
    expect(buttonByText('Retirer')?.disabled).toBe(true);
    expect(buttonByText('Inscrire')).toBeDefined();
  });

  it('does not emit an incomplete registration and shows what is missing', async () => {
    await submit();
    expect(saved).toEqual([]);
    expect(element.textContent).toContain('Le prénom est obligatoire.');
    expect(element.textContent).toContain('La date de début est obligatoire.');
    expect(element.textContent).toContain("L'e-mail est obligatoire.");
    expect(element.textContent).toContain('Certains champs sont à corriger.');
  });

  it('only shows the error summary after a save attempt', async () => {
    await type('firstName', 'Tom');
    expect(element.textContent).not.toContain('Certains champs sont à corriger.');
    await submit();
    expect(element.textContent).toContain('Certains champs sont à corriger.');
  });

  it('emits the payload of a valid registration', async () => {
    await fillValidChild();
    await submit();
    expect(saved).toEqual([
      {
        firstName: 'Tom',
        lastName: 'Durand',
        birthDate: '2025-06-01',
        enrollmentStart: '2026-11-02',
        enrollmentEnd: null,
        parents: [
          {
            firstName: 'Anne',
            lastName: 'Durand',
            email: 'anne.durand@example.com',
            phone: '06 12 34 56 78',
            relationship: 'mother',
          },
        ],
        contacts: [],
      },
    ]);
  });

  it('checks the enrollment dates against the birth and each other', async () => {
    await fillValidChild();
    await type('enrollmentStart', '2025-01-01');
    expect(element.textContent).toContain(
      "L'inscription ne peut pas commencer avant la naissance.",
    );

    await type('enrollmentStart', '2026-11-02');
    await type('enrollmentEnd', '2026-10-30');
    expect(element.textContent).toContain('La fin doit être le même jour ou après le début.');
    await submit();
    expect(saved).toEqual([]);
  });

  it('validates emails and phone numbers', async () => {
    await type('email', 'pas-un-email');
    await type('phone', 'abc');
    expect(element.textContent).toContain('Adresse e-mail invalide.');
    expect(element.textContent).toContain('Numéro de téléphone invalide.');
  });

  it('adds a second parent (father by default) and refuses a shared email', async () => {
    await fillValidChild();
    buttonByText('+ Ajouter un parent')?.click();
    await fixture.whenStable();

    expect(element.querySelectorAll('[aria-label^="Parent "]')).toHaveLength(2);
    const relationship = element.querySelectorAll<HTMLSelectElement>(
      '[formcontrolname="relationship"]',
    )[1];
    expect(relationship.value).toBe('father');

    await type('firstName', 'Paul', 2);
    await type('lastName', 'Durand', 2);
    await type('email', 'ANNE.durand@example.com', 1);
    await type('phone', '06 00 00 00 00', 1);
    expect(element.textContent).toContain(
      'Chaque parent doit avoir une adresse e-mail différente.',
    );
    await submit();
    expect(saved).toEqual([]);
  });

  it('does not count empty added rows as unsaved changes', async () => {
    buttonByText('+ Ajouter un parent')?.click();
    buttonByText('+ Ajouter un contact')?.click();
    await fixture.whenStable();
    expect(element.querySelectorAll('[aria-label^="Contact "]')).toHaveLength(1);
    expect(fixture.componentInstance.isDirty()).toBe(false);

    // Typing in the added contact is a change.
    await type('relationship', 'Voisin', 2);
    expect(fixture.componentInstance.isDirty()).toBe(true);
  });

  it('counts removing an existing contact as a change, not adding an empty one', async () => {
    await render(buildChild());
    buttonByText('+ Ajouter un contact')?.click();
    await fixture.whenStable();
    expect(fixture.componentInstance.isDirty()).toBe(false);

    buttonByText('Retirer ce contact')?.click(); // the existing one, listed first
    await fixture.whenStable();
    expect(fixture.componentInstance.isDirty()).toBe(true);
  });

  it('adds and removes other contacts', async () => {
    await fillValidChild();
    buttonByText('+ Ajouter un contact')?.click();
    await fixture.whenStable();
    expect(element.querySelectorAll('[aria-label^="Contact "]')).toHaveLength(1);

    // An empty contact blocks the save…
    await submit();
    expect(saved).toEqual([]);

    // …until it is removed.
    buttonByText('Retirer ce contact')?.click();
    await fixture.whenStable();
    await submit();
    expect(saved).toHaveLength(1);
  });

  it('shows the past, current and upcoming absences of the child', async () => {
    vi.useFakeTimers({ toFake: ['Date'] });
    vi.setSystemTime(new Date(2026, 9, 19, 10, 0)); // Monday 19 October 2026
    await render(
      buildChild({
        absences: [
          {
            id: 'a2',
            startDate: '2026-12-21',
            endDate: '2026-12-24',
            kind: 'vacation',
            comment: null,
            source: 'calendar',
          },
          {
            id: 'report-r1',
            startDate: '2026-10-19',
            endDate: '2026-10-19',
            kind: null,
            comment: 'Fièvre',
            source: 'report',
          },
          {
            id: 'report-r0',
            startDate: '2026-10-14',
            endDate: '2026-10-16',
            kind: null,
            comment: null,
            source: 'report',
          },
        ],
      }),
    );
    const group = (key: string) =>
      element.querySelector(`[data-group="${key}"]`)?.textContent?.replace(/\s+/g, ' ');
    expect(group('current')).toContain('Absent le 19/10/2026 (noté dans les rapports)');
    expect(element.querySelector('[data-group="current"] .absence__comment')?.textContent).toBe(
      '· Fièvre',
    );
    expect(group('upcoming')).toContain('Congés du 21/12/2026 au 24/12/2026 (prévu au calendrier)');
    expect(group('past')).toContain('Absent du 14/10/2026 au 16/10/2026 (noté dans les rapports)');
    vi.useRealTimers();
  });

  it('says when a group has no absence, and shows nothing for a new child', async () => {
    await render(buildChild({ absences: [] }));
    expect(element.querySelector('[data-group="past"]')?.textContent).toContain(
      'Aucune absence passée.',
    );
    await render(null);
    expect(element.querySelector('[data-group]')).toBeNull();
  });

  it('loads an existing child for edition', async () => {
    await render(buildChild());
    expect(element.querySelector('#child-form-title')?.textContent).toContain('Léa Martin');
    expect(input('firstName').value).toBe('Léa');
    expect(input('enrollmentEnd').value).toBe('2027-07-30');
    expect(input('email').value).toBe('claire.martin@example.com');
    expect(element.querySelectorAll('[aria-label^="Contact "]')).toHaveLength(1);
    expect(element.querySelector('.badge--enrolled')).not.toBeNull();
    expect(fixture.componentInstance.isDirty()).toBe(false);

    await type('lastName', 'Martin-Dupont');
    expect(fixture.componentInstance.isDirty()).toBe(true);
    await submit();
    expect(saved[0].lastName).toBe('Martin-Dupont');
    expect(saved[0].contacts).toHaveLength(1);
  });

  it('shows the error returned by the page', async () => {
    fixture.componentRef.setInput('saveError', "L'enregistrement a échoué, réessayez.");
    await fixture.whenStable();
    expect(element.querySelector('[role="alert"]')?.textContent).toContain(
      "L'enregistrement a échoué",
    );
  });
});
