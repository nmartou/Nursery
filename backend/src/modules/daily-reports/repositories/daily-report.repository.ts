import {
  DailyReport,
  DailyReportContent,
} from '../models/daily-report.model.js';

export interface DailyReportRepository {
  /** Creates an empty report for every active child that has none on that date. */
  ensureReportsForDate(date: string): Promise<void>;
  /** Reports of the day, sorted by child last name then first name. */
  findByDate(date: string): Promise<DailyReport[]>;
  findById(id: string): Promise<DailyReport | null>;
  /** Replaces the editable content of a report; returns null when it does not exist. */
  update(id: string, content: DailyReportContent): Promise<DailyReport | null>;
}
