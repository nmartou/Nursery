import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { TestBed } from '@angular/core/testing';
import { environment } from '../../../../environments/environment';
import { DashboardService } from './dashboard.service';

describe('DashboardService', () => {
  let service: DashboardService;
  let http: HttpTestingController;

  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [provideHttpClient(), provideHttpClientTesting()],
    });
    service = TestBed.inject(DashboardService);
    http = TestBed.inject(HttpTestingController);
  });

  afterEach(() => http.verify());

  it('requests the report stats of a given date', () => {
    service.getDailyReportStats('2026-10-16').subscribe();
    const req = http.expectOne(`${environment.apiUrl}/daily-reports/stats?date=2026-10-16`);
    expect(req.request.method).toBe('GET');
    req.flush({});
  });

  it('lets the API choose the date when none is given', () => {
    service.getDailyReportStats().subscribe();
    http.expectOne(`${environment.apiUrl}/daily-reports/stats`).flush({});
  });
});
