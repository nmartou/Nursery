export type ReportStatus = 'todo' | 'in_progress' | 'complete' | 'absent';

/** `GET /daily-reports/stats` */
export interface DailyReportStats {
  /** `YYYY-MM-DD` */
  date: string;
  /** Why the nursery is closed that day (holiday, closure); null when open. */
  closure: string | null;
  total: number;
  byStatus: Record<ReportStatus, number>;
}
