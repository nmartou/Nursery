import type {
  AbsenceKind,
  CalendarEventType,
} from '../models/calendar.model.js';

export class CalendarEventResponseDto {
  key: string;
  type: CalendarEventType;
  startDate: string;
  endDate: string;
  label: string;
  sourceId: string | null;
  childId: string | null;
  absenceKind: AbsenceKind | null;
  comment: string | null;
}

export class CalendarResponseDto {
  from: string;
  to: string;
  /** Sorted by start date. */
  events: CalendarEventResponseDto[];
}

export class ClosureResponseDto {
  id: string;
  startDate: string;
  endDate: string;
  label: string;
}

export class AbsenceResponseDto {
  id: string;
  childId: string;
  childFirstName: string;
  childLastName: string;
  startDate: string;
  endDate: string;
  kind: AbsenceKind;
  comment: string | null;
}
