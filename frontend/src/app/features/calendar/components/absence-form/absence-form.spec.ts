import { type ComponentFixture, TestBed } from '@angular/core/testing';
import type { AbsencePayload } from '../../models/calendar.model';
import { CHILD_OPTIONS } from '../../testing/calendar.fixtures';
import { AbsenceForm } from './absence-form';

describe('AbsenceForm', () => {
  let fixture: ComponentFixture<AbsenceForm>;
  let element: HTMLElement;
  let saved: AbsencePayload[];

  beforeEach(async () => {
    await TestBed.configureTestingModule({ imports: [AbsenceForm] }).compileComponents();
    fixture = TestBed.createComponent(AbsenceForm);
    fixture.componentRef.setInput('children', CHILD_OPTIONS);
    element = fixture.nativeElement as HTMLElement;
    saved = [];
    fixture.componentInstance.saveAbsence.subscribe((payload) => saved.push(payload));
    await fixture.whenStable();
  });

  async function set(name: string, value: string): Promise<void> {
    const field = element.querySelector<HTMLInputElement | HTMLSelectElement>(
      `[formcontrolname="${name}"]:not([type="radio"])`,
    )!;
    field.value = value;
    field.dispatchEvent(new Event(field instanceof HTMLSelectElement ? 'change' : 'input'));
    field.dispatchEvent(new Event('blur'));
    await fixture.whenStable();
  }

  /** The radio of a reason, found by its label (as the user does). */
  const radio = (label: string) =>
    [...element.querySelectorAll('label.choice')]
      .find((choice) => choice.textContent?.trim() === label)!
      .querySelector('input')!;

  async function submit(): Promise<void> {
    element.querySelector<HTMLButtonElement>('button[type="submit"]')!.click();
    await fixture.whenStable();
  }

  it('declares a vacation for a child, the comment being optional', async () => {
    await set('childId', 'c1');
    expect(element.textContent).toContain('Léa est inscrit(e) du 01/09/2026 au 30/07/2027.');
    radio('Congés').click();
    await set('startDate', '2026-12-21');
    await set('endDate', '2026-12-24');
    await submit();
    expect(saved).toEqual([
      {
        childId: 'c1',
        kind: 'vacation',
        startDate: '2026-12-21',
        endDate: '2026-12-24',
        comment: null,
      },
    ]);
  });

  it('defaults to a one-day sickness absence', async () => {
    await set('childId', 'c1');
    await set('startDate', '2026-10-20');
    await set('comment', '  Otite ');
    await submit();
    expect(saved).toEqual([
      {
        childId: 'c1',
        kind: 'sickness',
        startDate: '2026-10-20',
        endDate: '2026-10-20',
        comment: 'Otite',
      },
    ]);
  });

  it('refuses an absence outside the enrollment of the child', async () => {
    await set('childId', 'c6'); // enrolled from 02/11/2026
    await set('startDate', '2026-10-26');
    await set('endDate', '2026-11-03');
    expect(element.textContent).toContain(
      "L'absence doit être comprise dans la période d'inscription.",
    );
    await submit();
    expect(saved).toEqual([]);
  });

  it('requires a child and dates', async () => {
    await submit();
    expect(saved).toEqual([]);
    expect(element.textContent).toContain("Choisissez l'enfant.");
    expect(element.textContent).toContain('Le premier jour est obligatoire.');
  });

  it('loads an existing absence for edition', async () => {
    fixture.componentRef.setInput('absence', {
      id: 'a1',
      childId: 'c1',
      childFirstName: 'Léa',
      childLastName: 'Martin',
      startDate: '2026-11-04',
      endDate: '2026-11-05',
      kind: 'sickness',
      comment: 'Otite',
    });
    await fixture.whenStable();
    expect(element.querySelector('h2')?.textContent).toContain('Modifier l’absence');
    expect(element.querySelector<HTMLSelectElement>('select')!.value).toBe('c1');
    expect(radio('Maladie').checked).toBe(true);
    expect(fixture.componentInstance.isDirty()).toBe(false);
  });
});
