import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { type ComponentFixture, TestBed } from '@angular/core/testing';
import { environment } from '../../../../../environments/environment';
import { CHILD_OPTIONS, NOVEMBER_EVENTS } from '../../testing/calendar.fixtures';
import { CalendarPage } from './calendar-page';

const API = environment.apiUrl;

/** jsdom does not implement modal dialogs (see children-page.spec.ts). */
function stubDialog(): void {
  const proto = HTMLDialogElement.prototype as Partial<HTMLDialogElement>;
  proto.showModal ??= function (this: HTMLDialogElement) {
    this.setAttribute('open', '');
  };
  proto.close ??= function (this: HTMLDialogElement) {
    if (this.hasAttribute('open')) {
      this.removeAttribute('open');
      this.dispatchEvent(new Event('close'));
    }
  };
}

describe('CalendarPage (integration)', () => {
  let fixture: ComponentFixture<CalendarPage>;
  let element: HTMLElement;
  let http: HttpTestingController;

  async function render(): Promise<void> {
    fixture.detectChanges();
    await fixture.whenStable();
  }

  const buttonByText = (text: string) =>
    [...element.querySelectorAll<HTMLButtonElement>('button')].find((b) =>
      b.textContent?.includes(text),
    );
  const dialog = () => element.querySelector('dialog') as HTMLDialogElement;
  const calendarRequest = () =>
    http.expectOne((req) => req.method === 'GET' && req.url === `${API}/calendar`);

  beforeEach(async () => {
    vi.useFakeTimers({ toFake: ['Date'] });
    vi.setSystemTime(new Date(2026, 10, 3, 9, 0)); // Tuesday 3 November 2026
    stubDialog();
    await TestBed.configureTestingModule({
      imports: [CalendarPage],
      providers: [provideHttpClient(), provideHttpClientTesting()],
    }).compileComponents();

    http = TestBed.inject(HttpTestingController);
    fixture = TestBed.createComponent(CalendarPage);
    element = fixture.nativeElement as HTMLElement;
    await render();
    const request = calendarRequest();
    // The grid of November 2026: Monday 26 October to Sunday 6 December.
    expect(request.request.params.get('from')).toBe('2026-10-26');
    expect(request.request.params.get('to')).toBe('2026-12-06');
    request.flush({ from: '2026-10-26', to: '2026-12-06', events: NOVEMBER_EVENTS });
    await render();
  });

  afterEach(() => {
    http.verify();
    vi.useRealTimers();
  });

  const chipsOn = (date: string) =>
    [...element.querySelectorAll(`app-month-view [data-date="${date}"] .chip`)].map((chip) =>
      chip.textContent?.trim(),
    );

  it('shows the month with its events, on every day they cover', () => {
    expect(element.querySelector('.month-nav__label')?.textContent).toContain('novembre 2026');
    expect(chipsOn('2026-11-04')).toEqual(['Léa Martin · Maladie']);
    expect(chipsOn('2026-11-05')).toEqual(['Léa Martin · Maladie']);
    expect(chipsOn('2026-11-11')).toEqual(['Férié · Armistice 1918']);
    expect(element.querySelector('[data-date="2026-11-03"]')?.classList).toContain('day--today');
  });

  it('shows the children marked absent in their daily report', () => {
    expect(chipsOn('2026-11-03')).toEqual(['Hugo Bernard · Absent(e)']);
    const chip = element.querySelector('[data-date="2026-11-03"] .chip')!;
    // Not a button: it is changed in the report, not here. The comment shows on hover.
    expect(chip.tagName).toBe('SPAN');
    expect(chip.getAttribute('title')).toBe('Hugo Bernard · Absent(e) — Fièvre');
  });

  it('lists the busy days in the agenda used on phones', () => {
    const days = [...element.querySelectorAll('app-agenda-view .agenda__day')];
    expect(days.map((day) => day.getAttribute('data-date'))).toEqual([
      '2026-11-02',
      '2026-11-03',
      '2026-11-04',
      '2026-11-05',
      '2026-11-09',
      '2026-11-10',
      '2026-11-11',
    ]);
  });

  it('hides a kind of events with its filter', async () => {
    const absences = [...element.querySelectorAll<HTMLInputElement>('.filters input')][1];
    absences.click();
    await render();
    expect(chipsOn('2026-11-04')).toEqual([]);
    expect(chipsOn('2026-11-03')).toEqual([]);
    expect(chipsOn('2026-11-11')).toEqual(['Férié · Armistice 1918']);
  });

  it('moves to the next month and back to today', async () => {
    buttonByText('›')?.click();
    await render();
    expect(calendarRequest().request.params.get('from')).toBe('2026-11-30');
    expect(element.querySelector('.month-nav__label')?.textContent).toContain('décembre 2026');

    buttonByText("Aujourd'hui")?.click();
    await render();
    calendarRequest().flush({ from: '', to: '', events: [] });
    await render();
    expect(element.querySelector('.month-nav__label')?.textContent).toContain('novembre 2026');
  });

  it('opens a closure from the calendar, saves it and reloads the month', async () => {
    element.querySelector<HTMLButtonElement>('[data-date="2026-11-09"] button.chip')!.click();
    await render();
    expect(dialog().open).toBe(true);
    expect(dialog().querySelector('h2')?.textContent).toContain('Modifier la fermeture');

    dialog().querySelector<HTMLButtonElement>('button[type="submit"]')!.click();
    await render();
    const put = http.expectOne(`${API}/closures/k1`);
    expect(put.request.body).toEqual({
      label: 'Pont du 11 novembre',
      startDate: '2026-11-09',
      endDate: '2026-11-10',
    });
    put.flush({});
    await render();
    expect(dialog().open).toBe(false);
    expect(element.querySelector('[role="status"]')?.textContent).toContain(
      'Fermeture « Pont du 11 novembre » enregistrée.',
    );
    calendarRequest().flush({ from: '', to: '', events: NOVEMBER_EVENTS });
    await render();
  });

  it('declares an absence and shows the reason of a refusal', async () => {
    buttonByText('+ Absence')?.click();
    await render();
    http.expectOne(`${API}/children`).flush({ today: '2026-11-03', children: CHILD_OPTIONS });
    await render();
    // Children whose enrollment ended are not offered.
    const options = [...dialog().querySelectorAll('option')].map((o) => o.textContent?.trim());
    expect(options).toEqual(['Choisir un enfant…', 'Léa Martin', 'Emma Moreau']);

    const select = dialog().querySelector('select')!;
    select.value = 'c1';
    select.dispatchEvent(new Event('change'));
    const start = dialog().querySelector<HTMLInputElement>('[formcontrolname="startDate"]')!;
    start.value = '2026-11-04';
    start.dispatchEvent(new Event('input'));
    await render();
    dialog().querySelector<HTMLButtonElement>('button[type="submit"]')!.click();
    await render();

    http
      .expectOne(`${API}/absences`)
      .flush(
        { message: { message: 'Une absence est déjà prévue pour cet enfant sur cette période.' } },
        { status: 409, statusText: 'Conflict' },
      );
    await render();
    expect(dialog().open).toBe(true);
    expect(dialog().querySelector('[role="alert"]')?.textContent).toContain(
      'Une absence est déjà prévue',
    );
  });

  it('deletes an absence after confirmation', async () => {
    const confirm = vi.spyOn(window, 'confirm').mockReturnValue(true);
    element.querySelector<HTMLButtonElement>('[data-date="2026-11-04"] button.chip')!.click();
    await render();
    http.expectOne(`${API}/children`).flush({ today: '2026-11-03', children: CHILD_OPTIONS });
    await render();

    buttonByText('Supprimer')?.click();
    await render();
    const deletion = http.expectOne(`${API}/absences/a1`);
    expect(deletion.request.method).toBe('DELETE');
    deletion.flush(null);
    await render();
    expect(element.querySelector('[role="status"]')?.textContent).toContain('Absence supprimée.');
    calendarRequest().flush({ from: '', to: '', events: [] });
    await render();
    confirm.mockRestore();
  });
});
