import { type ComponentFixture, TestBed } from '@angular/core/testing';
import type { ClosurePayload } from '../../models/calendar.model';
import { ClosureForm } from './closure-form';

describe('ClosureForm', () => {
  let fixture: ComponentFixture<ClosureForm>;
  let element: HTMLElement;
  let saved: ClosurePayload[];

  beforeEach(async () => {
    await TestBed.configureTestingModule({ imports: [ClosureForm] }).compileComponents();
    fixture = TestBed.createComponent(ClosureForm);
    element = fixture.nativeElement as HTMLElement;
    saved = [];
    fixture.componentInstance.saveClosure.subscribe((payload) => saved.push(payload));
    await fixture.whenStable();
  });

  async function type(name: string, value: string): Promise<void> {
    const input = element.querySelector<HTMLInputElement>(`[formcontrolname="${name}"]`)!;
    input.value = value;
    input.dispatchEvent(new Event('input'));
    input.dispatchEvent(new Event('blur'));
    await fixture.whenStable();
  }

  async function submit(): Promise<void> {
    element.querySelector<HTMLButtonElement>('button[type="submit"]')!.click();
    await fixture.whenStable();
  }

  it('fills the last day with the first one, for a one-day closure', async () => {
    await type('label', ' Pont de l’Ascension ');
    await type('startDate', '2027-05-07');
    await submit();
    expect(saved).toEqual([
      { label: 'Pont de l’Ascension', startDate: '2027-05-07', endDate: '2027-05-07' },
    ]);
  });

  it('refuses a missing label or a last day before the first', async () => {
    await type('startDate', '2026-12-21');
    await type('endDate', '2026-12-20');
    await submit();
    expect(saved).toEqual([]);
    expect(element.textContent).toContain('Le motif est obligatoire.');
    expect(element.textContent).toContain('Le dernier jour doit suivre le premier.');
  });

  it('edits an existing closure, which can be deleted', async () => {
    fixture.componentRef.setInput('closure', {
      id: 'k1',
      label: 'Noël',
      startDate: '2026-12-24',
      endDate: '2027-01-01',
    });
    await fixture.whenStable();
    expect(element.querySelector('h2')?.textContent).toContain('Modifier la fermeture');
    expect(fixture.componentInstance.isDirty()).toBe(false);

    const deleted: unknown[] = [];
    fixture.componentInstance.deleteClosure.subscribe(() => deleted.push(true));
    [...element.querySelectorAll('button')]
      .find((b) => b.textContent?.includes('Supprimer'))!
      .click();
    expect(deleted).toHaveLength(1);
  });
});
