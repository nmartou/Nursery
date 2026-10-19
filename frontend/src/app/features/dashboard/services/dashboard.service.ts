import { inject, Injectable } from '@angular/core';
import type { Observable } from 'rxjs';
import { ApiService } from '../../../core/services/api.service';
import type { DailyReportStats } from '../models/daily-report-stats.model';

/** Data of the dashboard tiles: one method per tile, each calling its own domain endpoint. */
@Injectable({ providedIn: 'root' })
export class DashboardService {
  private readonly api = inject(ApiService);

  /** Without a date, the API uses the most recent weekday. */
  getDailyReportStats(date?: string): Observable<DailyReportStats> {
    return this.api.get<DailyReportStats>('daily-reports/stats', date ? { date } : undefined);
  }
}
