import type { PublicHoliday } from '../../../common/utils/public-holidays.util.js';
import type {
  AbsenceResponseDto,
  ClosureResponseDto,
} from '../dtos/calendar-response.dto.js';
import type { SaveAbsenceDto } from '../dtos/save-absence.dto.js';
import type {
  Absence,
  AbsenceInput,
  CalendarEvent,
  CalendarEventType,
  Closure,
  EnrollmentBound,
  ReportedAbsence,
} from '../models/calendar.model.js';

/** Within a day: closures first, then arrivals, departures and absences. */
const TYPE_ORDER: CalendarEventType[] = [
  'public_holiday',
  'closure',
  'enrollment_start',
  'enrollment_end',
  'absence',
  'reported_absence',
];

const NO_CHILD = { childId: null, absenceKind: null, comment: null };

export class CalendarMapper {
  static holiday(holiday: PublicHoliday): CalendarEvent {
    return {
      key: `holiday-${holiday.date}`,
      type: 'public_holiday',
      startDate: holiday.date,
      endDate: holiday.date,
      label: holiday.label,
      sourceId: null,
      ...NO_CHILD,
    };
  }

  static closure(closure: Closure): CalendarEvent {
    return {
      key: `closure-${closure.id}`,
      type: 'closure',
      startDate: closure.startDate,
      endDate: closure.endDate,
      label: closure.label,
      sourceId: closure.id,
      ...NO_CHILD,
    };
  }

  static absence(absence: Absence): CalendarEvent {
    return {
      key: `absence-${absence.id}`,
      type: 'absence',
      startDate: absence.startDate,
      endDate: absence.endDate,
      label: `${absence.childFirstName} ${absence.childLastName}`,
      sourceId: absence.id,
      childId: absence.childId,
      absenceKind: absence.kind,
      comment: absence.comment,
    };
  }

  /** Not editable here: it is changed in the daily report of that day. */
  static reportedAbsence(absence: ReportedAbsence): CalendarEvent {
    return {
      key: `reported_absence-${absence.reportId}`,
      type: 'reported_absence',
      startDate: absence.date,
      endDate: absence.date,
      label: `${absence.childFirstName} ${absence.childLastName}`,
      sourceId: null,
      childId: absence.childId,
      absenceKind: null,
      comment: absence.comment,
    };
  }

  static enrollment(
    bound: EnrollmentBound,
    type: 'enrollment_start' | 'enrollment_end',
  ): CalendarEvent {
    return {
      key: `${type}-${bound.childId}`,
      type,
      startDate: bound.date,
      endDate: bound.date,
      label: `${bound.childFirstName} ${bound.childLastName}`,
      sourceId: null,
      ...NO_CHILD,
      childId: bound.childId,
    };
  }

  static sort(events: CalendarEvent[]): CalendarEvent[] {
    const compare = (a: CalendarEvent, b: CalendarEvent): number => {
      const byDate = a.startDate.localeCompare(b.startDate);
      if (byDate !== 0) {
        return byDate;
      }
      const byType = TYPE_ORDER.indexOf(a.type) - TYPE_ORDER.indexOf(b.type);
      return byType !== 0 ? byType : a.label.localeCompare(b.label);
    };
    return [...events].sort(compare);
  }

  static toAbsenceInput(dto: SaveAbsenceDto): AbsenceInput {
    return {
      childId: dto.childId,
      startDate: dto.startDate,
      endDate: dto.endDate,
      kind: dto.kind,
      // An empty comment is no comment.
      comment: dto.comment === '' ? null : (dto.comment ?? null),
    };
  }

  static toClosureDto(closure: Closure): ClosureResponseDto {
    return { ...closure };
  }

  static toAbsenceDto(absence: Absence): AbsenceResponseDto {
    return { ...absence };
  }
}
