import { Component, computed, input } from '@angular/core';
import { REPORT_STATUS_DISPLAY } from '../../constants/report-status.constants';
import { ReportStatus } from '../../models/daily-report.model';

@Component({
  selector: 'app-report-status-badge',
  template: `
    <span class="badge" [class]="'badge badge--' + status()" [title]="display().hint">
      <span class="badge__dot" aria-hidden="true"></span>
      {{ display().label }}
    </span>
  `,
  styleUrl: './report-status-badge.scss',
})
export class ReportStatusBadge {
  readonly status = input.required<ReportStatus>();
  protected readonly display = computed(() => REPORT_STATUS_DISPLAY[this.status()]);
}
