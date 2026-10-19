import type { ReportStatus } from '../models/daily-report.model.js';

/** Progress of the reports of a day, e.g. for the dashboard. */
export class DailyReportStatsResponseDto {
  date: string;
  /** Number of reports of the day (one per active child). */
  total: number;
  byStatus: Record<ReportStatus, number>;
}
