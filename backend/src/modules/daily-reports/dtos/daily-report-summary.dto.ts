import type {
  PlannedAbsence,
  ReportStatus,
} from '../models/daily-report.model.js';

export class DailyReportSummaryDto {
  id: string;
  childId: string;
  childFirstName: string;
  childLastName: string;
  status: ReportStatus;
  plannedAbsence: PlannedAbsence | null;
  updatedAt: string;
}

export class DailyReportListResponseDto {
  date: string;
  /** Why the nursery is closed that day (holiday, closure); null when open. */
  closure: string | null;
  reports: DailyReportSummaryDto[];
}
