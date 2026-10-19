export type StoolStatus = 'normal' | 'other';

export type ReportStatus = 'todo' | 'in_progress' | 'complete' | 'absent';

export interface Meal {
  label: string;
  quantityGrams: number | null;
}

export interface Bottle {
  /** `HH:mm` */
  time: string;
  quantityMl: number | null;
}

export interface Nap {
  startTime: string;
  endTime: string | null;
}

/** Editable content, sent to the API when saving. */
export interface DailyReportPayload {
  absent: boolean;
  absenceComment: string | null;
  arrivalTime: string | null;
  departureTime: string | null;
  meals: Meal[];
  bottles: Bottle[];
  mealComment: string | null;
  naps: Nap[];
  noNap: boolean;
  napComment: string | null;
  stoolStatus: StoolStatus;
  stoolComment: string | null;
  parentNote: string | null;
}

/** An absence declared in the calendar for that day. */
export interface PlannedAbsence {
  kind: 'vacation' | 'sickness' | 'other';
  comment: string | null;
}

export interface DailyReport extends DailyReportPayload {
  id: string;
  childId: string;
  childFirstName: string;
  childLastName: string;
  /** `YYYY-MM-DD` */
  date: string;
  status: ReportStatus;
  /** Shown as absent while nothing is entered. */
  plannedAbsence: PlannedAbsence | null;
  /** ISO timestamp of the last save */
  updatedAt: string;
}

export interface DailyReportSummary {
  id: string;
  childId: string;
  childFirstName: string;
  childLastName: string;
  status: ReportStatus;
  plannedAbsence: PlannedAbsence | null;
  updatedAt: string;
}

export interface DailyReportList {
  date: string;
  /** Why the nursery is closed that day (holiday, closure); null when open. */
  closure: string | null;
  reports: DailyReportSummary[];
}
