import { inject, Injectable } from '@angular/core';
import type { Observable } from 'rxjs';
import { ApiService } from '../../../core/services/api.service';
import type {
  DailyReport,
  DailyReportList,
  DailyReportPayload,
} from '../models/daily-report.model';

@Injectable({ providedIn: 'root' })
export class DailyReportsService {
  private readonly api = inject(ApiService);

  /** Without a date, the API returns the most recent weekday. */
  getByDate(date?: string): Observable<DailyReportList> {
    return this.api.get<DailyReportList>('daily-reports', date ? { date } : undefined);
  }

  getById(id: string): Observable<DailyReport> {
    return this.api.get<DailyReport>(`daily-reports/${id}`);
  }

  save(id: string, payload: DailyReportPayload): Observable<DailyReport> {
    return this.api.put<DailyReport>(`daily-reports/${id}`, payload);
  }
}
