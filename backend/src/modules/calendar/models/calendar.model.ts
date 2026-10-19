export type AbsenceKind = 'vacation' | 'sickness' | 'other';

/** A period the nursery is closed (holidays, bridges...), bounds included. */
export interface Closure {
  id: string;
  /** `YYYY-MM-DD` */
  startDate: string;
  /** `YYYY-MM-DD` */
  endDate: string;
  label: string;
}

/** A child's planned absence, bounds included. */
export interface Absence {
  id: string;
  childId: string;
  childFirstName: string;
  childLastName: string;
  startDate: string;
  endDate: string;
  kind: AbsenceKind;
  comment: string | null;
}

export type AbsenceInput = Omit<
  Absence,
  'id' | 'childFirstName' | 'childLastName'
>;

export type ClosureInput = Omit<Closure, 'id'>;

/** A day a child was marked absent in its daily report. */
export interface ReportedAbsence {
  reportId: string;
  childId: string;
  childFirstName: string;
  childLastName: string;
  date: string;
  comment: string | null;
}

/** First or last day of a child's enrollment. */
export interface EnrollmentBound {
  childId: string;
  childFirstName: string;
  childLastName: string;
  date: string;
}

export type CalendarEventType =
  | 'public_holiday'
  | 'closure'
  | 'absence'
  | 'reported_absence'
  | 'enrollment_start'
  | 'enrollment_end';

/** Anything shown on the calendar, from one of the sources above. */
export interface CalendarEvent {
  /** Stable key, unique among the events of a response. */
  key: string;
  type: CalendarEventType;
  startDate: string;
  endDate: string;
  /** Holiday or closure label; the child's full name otherwise. */
  label: string;
  /** Id of the closure or absence, to edit it; null for computed events. */
  sourceId: string | null;
  childId: string | null;
  absenceKind: AbsenceKind | null;
  comment: string | null;
}
