import {
  ChangeDetectionStrategy,
  Component,
  computed,
  inject,
  signal,
  type OnInit,
} from '@angular/core';
import { RouterLink } from '@angular/router';
import { formatLongDate } from '../../../../shared/utils/date.utils';
import type { DailyReportStats, ReportStatus } from '../../models/daily-report-stats.model';
import { DashboardService } from '../../services/dashboard.service';
import { DashboardTile } from '../dashboard-tile/dashboard-tile';

/** Display order and labels, matching the badges of the reports page. */
const STATUS_ROWS: readonly { status: ReportStatus; label: string }[] = [
  { status: 'todo', label: 'À remplir' },
  { status: 'in_progress', label: 'À compléter' },
  { status: 'complete', label: 'Complets' },
  { status: 'absent', label: 'Absents' },
];

/** Progress of the day's reports: how many are done, and what remains. */
@Component({
  selector: 'app-daily-reports-tile',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [DashboardTile, RouterLink],
  templateUrl: './daily-reports-tile.html',
  styleUrl: './daily-reports-tile.scss',
})
export class DailyReportsTile implements OnInit {
  private readonly dashboardService = inject(DashboardService);

  protected readonly stats = signal<DailyReportStats | null>(null);
  protected readonly loading = signal(true);
  protected readonly error = signal(false);

  protected readonly subtitle = computed(() => {
    const stats = this.stats();
    return stats ? formatLongDate(stats.date) : undefined;
  });

  /** Complete and absent reports need no more input. */
  protected readonly done = computed(() => {
    const stats = this.stats();
    return stats ? stats.byStatus.complete + stats.byStatus.absent : 0;
  });

  protected readonly remaining = computed(() => (this.stats()?.total ?? 0) - this.done());

  protected readonly rows = computed(() => {
    const stats = this.stats();
    return STATUS_ROWS.map((row) => ({ ...row, count: stats?.byStatus[row.status] ?? 0 }));
  });

  ngOnInit(): void {
    this.dashboardService.getDailyReportStats().subscribe({
      next: (stats) => {
        this.stats.set(stats);
        this.loading.set(false);
      },
      error: () => {
        this.error.set(true);
        this.loading.set(false);
      },
    });
  }
}
