import {
  ChangeDetectionStrategy,
  Component,
  computed,
  inject,
  signal,
  type OnInit,
  viewChild,
} from '@angular/core';
import { addWeekdays, formatLongDate, isWeekday } from '../../../../shared/utils/date.utils';
import { ReportForm } from '../../components/report-form/report-form';
import { ReportList } from '../../components/report-list/report-list';
import type {
  DailyReport,
  DailyReportPayload,
  DailyReportSummary,
} from '../../models/daily-report.model';
import { DailyReportsService } from '../../services/daily-reports.service';

const UNSAVED_CHANGES_MESSAGE =
  'Des modifications ne sont pas enregistrées et seront perdues. Continuer ?';

@Component({
  selector: 'app-daily-reports-page',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [ReportList, ReportForm],
  templateUrl: './daily-reports-page.html',
  styleUrl: './daily-reports-page.scss',
})
export class DailyReportsPage implements OnInit {
  private readonly reportsService = inject(DailyReportsService);
  private readonly reportForm = viewChild(ReportForm);

  protected readonly date = signal<string | null>(null);
  protected readonly reports = signal<DailyReportSummary[]>([]);
  protected readonly selected = signal<DailyReport | null>(null);
  protected readonly loading = signal(true);
  protected readonly error = signal<string | null>(null);
  protected readonly saving = signal(false);
  protected readonly saveError = signal<string | null>(null);

  protected readonly longDate = computed(() => {
    const date = this.date();
    return date ? formatLongDate(date) : '';
  });

  ngOnInit(): void {
    this.loadDate();
  }

  protected previousDay(): void {
    const date = this.date();
    if (date) {
      this.changeDate(addWeekdays(date, -1));
    }
  }

  protected nextDay(): void {
    const date = this.date();
    if (date) {
      this.changeDate(addWeekdays(date, 1));
    }
  }

  protected onDatePicked(value: string): void {
    if (!value) {
      return;
    }
    if (!isWeekday(value)) {
      this.error.set('La crèche est fermée le week-end : choisissez un jour de semaine.');
      return;
    }
    this.changeDate(value);
  }

  protected select(id: string): void {
    if (this.selected()?.id === id || !this.confirmDiscard()) {
      return;
    }
    this.saveError.set(null);
    this.reportsService.getById(id).subscribe({
      next: (report) => this.selected.set(report),
      error: () => this.error.set('Impossible de charger le rapport.'),
    });
  }

  protected close(): void {
    if (this.confirmDiscard()) {
      this.selected.set(null);
    }
  }

  protected save(payload: DailyReportPayload): void {
    const current = this.selected();
    if (!current) {
      return;
    }
    this.saving.set(true);
    this.saveError.set(null);
    this.reportsService.save(current.id, payload).subscribe({
      next: (saved) => {
        this.selected.set(saved);
        this.reports.update((reports) =>
          reports.map((report) =>
            report.id === saved.id
              ? { ...report, status: saved.status, updatedAt: saved.updatedAt }
              : report,
          ),
        );
        this.saving.set(false);
      },
      error: () => {
        this.saveError.set("L'enregistrement a échoué, réessayez.");
        this.saving.set(false);
      },
    });
  }

  private changeDate(date: string): void {
    if (date !== this.date() && this.confirmDiscard()) {
      this.loadDate(date);
    }
  }

  private loadDate(date?: string): void {
    this.loading.set(true);
    this.error.set(null);
    this.selected.set(null);
    this.reportsService.getByDate(date).subscribe({
      next: (list) => {
        this.date.set(list.date);
        this.reports.set(list.reports);
        this.loading.set(false);
      },
      error: () => {
        this.error.set("Impossible de joindre l'API. Vérifiez que le backend est démarré.");
        this.loading.set(false);
      },
    });
  }

  private confirmDiscard(): boolean {
    return !this.reportForm()?.isDirty() || window.confirm(UNSAVED_CHANGES_MESSAGE);
  }
}
