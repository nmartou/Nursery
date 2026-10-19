export type ReportStatus = 'todo' | 'in_progress' | 'complete' | 'absent';

/** `GET /daily-reports/stats` */
export interface DailyReportStats {
  /** `YYYY-MM-DD` */
  date: string;
  total: number;
  byStatus: Record<ReportStatus, number>;
}
