export type AbsenceKind = 'vacation' | 'sickness' | 'other';

export type CalendarEventType =
  | 'public_holiday'
  | 'closure'
  | 'absence'
  /** A child marked absent in the daily report of that day. */
  | 'reported_absence'
  | 'enrollment_start'
  | 'enrollment_end';

/** One item of `GET /calendar?from&to`. */
export interface CalendarEvent {
  key: string;
  type: CalendarEventType;
  /** `YYYY-MM-DD`, bounds included */
  startDate: string;
  endDate: string;
  /** Holiday or closure label; the child's full name otherwise. */
  label: string;
  /** Id of the closure or absence (editable events); null for computed ones. */
  sourceId: string | null;
  childId: string | null;
  absenceKind: AbsenceKind | null;
  comment: string | null;
}

export interface CalendarResponse {
  from: string;
  to: string;
  events: CalendarEvent[];
}

export interface Closure {
  id: string;
  startDate: string;
  endDate: string;
  label: string;
}

export type ClosurePayload = Omit<Closure, 'id'>;

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

export type AbsencePayload = Omit<Absence, 'id' | 'childFirstName' | 'childLastName'>;

/** A child an absence can be declared for (from `GET /children`). */
export interface ChildOption {
  id: string;
  firstName: string;
  lastName: string;
  enrollmentStart: string;
  enrollmentEnd: string | null;
  enrollmentStatus: 'upcoming' | 'enrolled' | 'ended';
}

/** A day of the month grid. */
export interface CalendarDay {
  /** `YYYY-MM-DD` */
  date: string;
  dayOfMonth: number;
  inMonth: boolean;
  weekend: boolean;
  today: boolean;
}

/** Groups of event types the user can show or hide. */
export type EventFilter = 'closures' | 'absences' | 'movements';
