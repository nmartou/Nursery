import type { AbsenceKind, CalendarEventType, EventFilter } from '../models/calendar.model';

export const ABSENCE_KIND_LABELS: Record<AbsenceKind, string> = {
  vacation: 'Congés',
  sickness: 'Maladie',
  other: 'Autre absence',
};

/** Short prefix shown before the event label, e.g. "Férié · Toussaint". */
export const EVENT_TYPE_LABELS: Record<CalendarEventType, string> = {
  public_holiday: 'Férié',
  closure: 'Fermeture',
  absence: 'Absence',
  reported_absence: 'Absent',
  enrollment_start: 'Arrivée',
  enrollment_end: 'Départ',
};

export const EVENT_FILTERS: readonly {
  value: EventFilter;
  label: string;
  types: CalendarEventType[];
}[] = [
  { value: 'closures', label: 'Fermetures', types: ['public_holiday', 'closure'] },
  { value: 'absences', label: 'Absences', types: ['absence', 'reported_absence'] },
  {
    value: 'movements',
    label: 'Arrivées et départs',
    types: ['enrollment_start', 'enrollment_end'],
  },
];

export const WEEKDAY_LABELS = ['Lun', 'Mar', 'Mer', 'Jeu', 'Ven', 'Sam', 'Dim'];
