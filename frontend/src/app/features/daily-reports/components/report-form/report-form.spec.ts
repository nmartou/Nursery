import { ComponentFixture, TestBed } from '@angular/core/testing';
import { DailyReportPayload } from '../../models/daily-report.model';
import { buildReport } from '../../testing/daily-report.fixtures';
import { ReportForm } from './report-form';

describe('ReportForm', () => {
  let fixture: ComponentFixture<ReportForm>;
  let component: ReportForm;
  let element: HTMLElement;
  let saved: DailyReportPayload[];

  async function render(): Promise<void> {
    fixture.detectChanges();
    await fixture.whenStable();
  }

  function click(selector: string, text?: string): void {
    const buttons = [...element.querySelectorAll<HTMLButtonElement>(selector)];
    const button = text ? buttons.find((b) => b.textContent?.includes(text)) : buttons[0];
    button!.click();
  }

  beforeEach(async () => {
    await TestBed.configureTestingModule({ imports: [ReportForm] }).compileComponents();
    fixture = TestBed.createComponent(ReportForm);
    component = fixture.componentInstance;
    fixture.componentRef.setInput('report', buildReport());
    saved = [];
    component.saveReport.subscribe((payload) => saved.push(payload));
    element = fixture.nativeElement as HTMLElement;
    await render();
  });

  it('pre-fills the child name and the saved data', () => {
    expect(element.querySelector('.report__name')?.textContent).toContain('Hugo Bernard');
    expect(component.form.controls.arrivalTime.value).toBe('08:40');
    expect(component.form.controls.bottles.length).toBe(1);
    expect(component.form.dirty).toBe(false);
  });

  it('adds meal and bottle entries', async () => {
    click('.link-button', 'Ajouter un repas');
    click('.link-button', 'Ajouter un biberon');
    await render();
    expect(component.form.controls.meals.length).toBe(1);
    expect(component.form.controls.bottles.length).toBe(2);
    expect(component.form.controls.bottles.at(1).value.time).toMatch(/^\d{2}:\d{2}$/);
    expect(component.isDirty()).toBe(true);
  });

  it('hides the day sections when the child is marked absent', async () => {
    click('.button', 'Absent');
    await render();
    expect(element.textContent).not.toContain('Alimentation');
    expect(element.querySelector('textarea[formControlName="absenceComment"]')).not.toBeNull();

    click('button[type="submit"]');
    expect(saved[0].absent).toBe(true);
  });

  it('requires a comment only when stools are not normal', async () => {
    const stool = component.form.controls.stoolStatus;
    expect(element.querySelector('textarea[formControlName="stoolComment"]')).toBeNull();

    stool.setValue('other');
    await render();
    expect(element.querySelector('textarea[formControlName="stoolComment"]')).not.toBeNull();

    click('button[type="submit"]');
    await render();
    expect(saved).toHaveLength(0);
    expect(element.querySelector('.error')?.textContent).toContain('obligatoire');

    component.form.controls.stoolComment.setValue('Selles liquides');
    click('button[type="submit"]');
    expect(saved[0]).toMatchObject({ stoolStatus: 'other', stoolComment: 'Selles liquides' });
  });

  it('emits the full payload on save', () => {
    component.form.controls.departureTime.setValue('17:15');
    component.form.controls.parentNote.setValue('Bonne journée');
    click('button[type="submit"]');
    expect(saved[0]).toEqual({
      absent: false,
      absenceComment: null,
      arrivalTime: '08:40',
      departureTime: '17:15',
      meals: [],
      bottles: [{ time: '09:30', quantityMl: 210 }],
      mealComment: null,
      naps: [{ startTime: '10:00', endTime: '10:45' }],
      noNap: false,
      napComment: null,
      stoolStatus: 'normal',
      stoolComment: null,
      parentNote: 'Bonne journée',
    });
  });

  it('reloads and resets when a new version of the report comes in', async () => {
    component.form.controls.arrivalTime.setValue('09:00');
    component.form.markAsDirty();
    fixture.componentRef.setInput('report', buildReport({ arrivalTime: '07:30' }));
    await render();
    expect(component.form.controls.arrivalTime.value).toBe('07:30');
    expect(component.isDirty()).toBe(false);
  });
});
