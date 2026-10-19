import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { TestBed } from '@angular/core/testing';
import { environment } from '../../../../environments/environment';
import { DailyReportPayload } from '../models/daily-report.model';
import { DailyReportsService } from './daily-reports.service';

describe('DailyReportsService', () => {
  let service: DailyReportsService;
  let http: HttpTestingController;

  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [provideHttpClient(), provideHttpClientTesting()],
    });
    service = TestBed.inject(DailyReportsService);
    http = TestBed.inject(HttpTestingController);
  });

  afterEach(() => http.verify());

  it('requests the reports of a given date', () => {
    service.getByDate('2026-10-16').subscribe();
    const req = http.expectOne(`${environment.apiUrl}/daily-reports?date=2026-10-16`);
    expect(req.request.method).toBe('GET');
    req.flush({ date: '2026-10-16', reports: [] });
  });

  it('lets the API choose the date when none is given', () => {
    service.getByDate().subscribe();
    http.expectOne(`${environment.apiUrl}/daily-reports`).flush({ date: '', reports: [] });
  });

  it('saves a report with PUT', () => {
    const payload = { absent: true } as DailyReportPayload;
    service.save('r1', payload).subscribe();
    const req = http.expectOne(`${environment.apiUrl}/daily-reports/r1`);
    expect(req.request.method).toBe('PUT');
    expect(req.request.body).toBe(payload);
    req.flush({});
  });
});
