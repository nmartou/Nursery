export type ParentRelationship = 'mother' | 'father' | 'guardian' | 'other';

/** Where the child stands, relative to today, in its enrollment period. */
export type EnrollmentStatus = 'upcoming' | 'enrolled' | 'ended';

/** A parent or legal guardian, possibly shared with siblings. */
export interface ChildParent {
  id: string;
  firstName: string;
  lastName: string;
  email: string;
  phone: string | null;
  relationship: ParentRelationship;
}

/** Someone else to call when the parents cannot be reached. */
export interface ChildContact {
  firstName: string;
  lastName: string;
  relationship: string;
  phone: string;
}

export type AbsenceKind = 'vacation' | 'sickness' | 'other';

/** An absence declared in the calendar (vacation, sickness...), bounds included. */
export interface ChildAbsence {
  id: string;
  startDate: string;
  endDate: string;
  kind: AbsenceKind;
  comment: string | null;
}

/** A day the child was marked absent in its daily report. */
export interface ReportedAbsenceDay {
  reportId: string;
  date: string;
  comment: string | null;
}

/**
 * One entry of a child's absence history: planned in the calendar, or noted in
 * the daily reports (consecutive weekdays grouped into one period).
 */
export interface AbsenceEntry {
  id: string;
  startDate: string;
  endDate: string;
  /** Null for absences noted in the reports (the reason is not known). */
  kind: AbsenceKind | null;
  comment: string | null;
  source: 'calendar' | 'report';
}

export interface Child {
  id: string;
  firstName: string;
  lastName: string;
  /** `YYYY-MM-DD` */
  birthDate: string;
  /** `YYYY-MM-DD`, first day of attendance */
  enrollmentStart: string;
  /** `YYYY-MM-DD`, last day of attendance; null when not known yet */
  enrollmentEnd: string | null;
  /** Ordered: the first parent is the main contact. */
  parents: ChildParent[];
  contacts: ChildContact[];
  /** Every absence planned in the calendar, by start date. */
  absences: ChildAbsence[];
  /** Every day marked absent in a daily report, by date. */
  reportedAbsences: ReportedAbsenceDay[];
  createdAt: Date;
  updatedAt: Date;
}

/** What the staff fills in when registering or editing a child. */
export interface ChildInput {
  firstName: string;
  lastName: string;
  birthDate: string;
  enrollmentStart: string;
  enrollmentEnd: string | null;
  parents: Omit<ChildParent, 'id'>[];
  contacts: ChildContact[];
}
