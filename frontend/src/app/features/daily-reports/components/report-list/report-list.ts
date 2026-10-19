import { Component, computed, input, output } from '@angular/core';
import { formatTime } from '../../../../shared/utils/date.utils';
import { DailyReportSummary } from '../../models/daily-report.model';
import { ReportStatusBadge } from '../report-status-badge/report-status-badge';

@Component({
  selector: 'app-report-list',
  imports: [ReportStatusBadge],
  templateUrl: './report-list.html',
  styleUrl: './report-list.scss',
})
export class ReportList {
  readonly reports = input.required<DailyReportSummary[]>();
  readonly selectedId = input<string | null>(null);
  readonly selectReport = output<string>();

  /** Reports still needing input (to fill or to complete). */
  protected readonly remaining = computed(
    () =>
      this.reports().filter((report) => report.status === 'todo' || report.status === 'in_progress')
        .length,
  );

  protected readonly formatTime = formatTime;
}
