import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { type ComponentFixture, TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';
import { environment } from '../../../../../environments/environment';
import type { DailyReportStats } from '../../models/daily-report-stats.model';
import { DailyReportsTile } from './daily-reports-tile';

const STATS_URL = `${environment.apiUrl}/daily-reports/stats`;

const STATS: DailyReportStats = {
  date: '2026-10-16',
  total: 5,
  byStatus: { todo: 1, in_progress: 2, complete: 1, absent: 1 },
};

describe('DailyReportsTile', () => {
  let fixture: ComponentFixture<DailyReportsTile>;
  let http: HttpTestingController;
  let element: HTMLElement;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [DailyReportsTile],
      providers: [provideHttpClient(), provideHttpClientTesting(), provideRouter([])],
    }).compileComponents();
    fixture = TestBed.createComponent(DailyReportsTile);
    http = TestBed.inject(HttpTestingController);
    element = fixture.nativeElement as HTMLElement;
    fixture.detectChanges();
  });

  afterEach(() => http.verify());

  async function respond(body: DailyReportStats): Promise<void> {
    http.expectOne(STATS_URL).flush(body);
    await fixture.whenStable();
  }

  it('shows a loading state, then the date of the stats', async () => {
    expect(element.textContent).toContain('Chargement');
    await respond(STATS);
    expect(element.querySelector('.tile__subtitle')?.textContent).toContain('16 octobre 2026');
  });

  it('counts complete and absent reports as done', async () => {
    await respond(STATS);
    expect(element.querySelector('.progress__figure')?.textContent).toMatch(/2\s*\/\s*5/);
    const bar = element.querySelector<HTMLProgressElement>('progress');
    expect(bar?.value).toBe(2);
    expect(bar?.max).toBe(5);
    expect(element.querySelector('.progress__hint')?.textContent).toContain(
      '3 rapports restent à remplir ou compléter',
    );
  });

  it('lists the count of each status', async () => {
    await respond(STATS);
    const items = [...element.querySelectorAll('.statuses__item')].map((item) => [
      item.querySelector('.statuses__label')?.textContent,
      item.querySelector('.statuses__count')?.textContent,
    ]);
    expect(items).toEqual([
      ['À remplir', '1'],
      ['À compléter', '2'],
      ['Complets', '1'],
      ['Absents', '1'],
    ]);
  });

  it('congratulates when every report is done', async () => {
    await respond({ ...STATS, byStatus: { todo: 0, in_progress: 0, complete: 4, absent: 1 } });
    expect(element.querySelector('.progress__hint--done')?.textContent).toContain(
      'Tous les rapports sont terminés',
    );
  });

  it('handles a day without children', async () => {
    await respond({
      ...STATS,
      total: 0,
      byStatus: { todo: 0, in_progress: 0, complete: 0, absent: 0 },
    });
    expect(element.textContent).toContain('Aucun enfant inscrit');
    expect(element.querySelector('progress')).toBeNull();
  });

  it('shows an error when the API fails, and keeps the link to the reports', async () => {
    http.expectOne(STATS_URL).flush(null, { status: 500, statusText: 'Server Error' });
    await fixture.whenStable();
    expect(element.textContent).toContain('Impossible de charger les rapports du jour');
    expect(element.querySelector('a')?.getAttribute('href')).toBe('/rapports');
  });
});
