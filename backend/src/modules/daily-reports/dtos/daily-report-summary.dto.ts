import type { ReportStatus } from '../models/daily-report.model.js';

export class DailyReportSummaryDto {
  id: string;
  childId: string;
  childFirstName: string;
  childLastName: string;
  status: ReportStatus;
  updatedAt: string;
}

export class DailyReportListResponseDto {
  date: string;
  reports: DailyReportSummaryDto[];
}
