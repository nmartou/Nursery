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
  /** `HH:mm` */
  startTime: string;
  /** `HH:mm`, null while the child is still sleeping */
  endTime: string | null;
}

export interface DailyReport {
  id: string;
  childId: string;
  childFirstName: string;
  childLastName: string;
  /** `YYYY-MM-DD` */
  date: string;
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
  createdAt: Date;
  updatedAt: Date;
}

/** Fields the staff can edit during the day. */
export type DailyReportContent = Omit<
  DailyReport,
  | 'id'
  | 'childId'
  | 'childFirstName'
  | 'childLastName'
  | 'date'
  | 'createdAt'
  | 'updatedAt'
>;
