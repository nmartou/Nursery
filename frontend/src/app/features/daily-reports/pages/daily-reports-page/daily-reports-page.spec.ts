import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { type ComponentFixture, TestBed } from '@angular/core/testing';
import { environment } from '../../../../../environments/environment';
import { buildReport, REPORT_SUMMARIES } from '../../testing/daily-report.fixtures';
import { DailyReportsPage } from './daily-reports-page';

const API = `${environment.apiUrl}/daily-reports`;

describe('DailyReportsPage (integration)', () => {
  let fixture: ComponentFixture<DailyReportsPage>;
  let element: HTMLElement;
  let http: HttpTestingController;

  async function render(): Promise<void> {
    fixture.detectChanges();
    await fixture.whenStable();
  }

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [DailyReportsPage],
      providers: [provideHttpClient(), provideHttpClientTesting()],
    }).compileComponents();

    http = TestBed.inject(HttpTestingController);
    fixture = TestBed.createComponent(DailyReportsPage);
    element = fixture.nativeElement as HTMLElement;
    await render();
    http.expectOne(API).flush({ date: '2026-10-16', reports: REPORT_SUMMARIES });
    await render();
  });

  afterEach(() => http.verify());

  async function openHugo(): Promise<void> {
    element.querySelectorAll<HTMLButtonElement>('.row')[1].click();
    http.expectOne(`${API}/r2`).flush(buildReport());
    await render();
  }

  it('shows the list of the day, without form', () => {
    expect(element.querySelector('.page__date')?.textContent).toContain('vendredi 16 octobre 2026');
    expect(element.querySelectorAll('.row')).toHaveLength(3);
    expect(element.querySelector('app-report-form')).toBeNull();
  });

  it('opens the form next to the list when a child is selected', async () => {
    await openHugo();
    expect(element.querySelector('.reports')?.classList).toContain('reports--open');
    expect(element.querySelector('.report__name')?.textContent).toContain('Hugo Bernard');
  });

  it('saves the report and refreshes the row status and time', async () => {
    await openHugo();
    (element.querySelector('button[type="submit"]') as HTMLButtonElement).click();

    const req = http.expectOne(`${API}/r2`);
    expect(req.request.method).toBe('PUT');
    req.flush(buildReport({ status: 'complete', updatedAt: '2026-10-16T16:00:00.000Z' }));
    await render();

    const hugoRow = element.querySelectorAll('.row')[1];
    expect(hugoRow.querySelector('.badge--complete')).not.toBeNull();
  });

  it('loads the next weekday, skipping the weekend', async () => {
    (element.querySelector('[aria-label="Jour suivant"]') as HTMLButtonElement).click();
    http.expectOne(`${API}?date=2026-10-19`).flush({ date: '2026-10-19', reports: [] });
    await render();
    expect(element.querySelector('.list__empty')).not.toBeNull();
  });

  it('closes the form', async () => {
    await openHugo();
    (element.querySelector('[aria-label="Fermer le formulaire"]') as HTMLButtonElement).click();
    await render();
    expect(element.querySelector('app-report-form')).toBeNull();
  });
});
