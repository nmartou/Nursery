import type { ReportStatus } from '../models/daily-report.model.js';

/** Progress of the reports of a day, e.g. for the dashboard. */
export class DailyReportStatsResponseDto {
  date: string;
  /** Why the nursery is closed that day; null when open (then total is 0). */
  closure: string | null;
  /** Number of reports of the day (one per active child). */
  total: number;
  byStatus: Record<ReportStatus, number>;
}
