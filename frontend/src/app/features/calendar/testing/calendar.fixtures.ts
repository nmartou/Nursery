import type { CalendarEvent, ChildOption } from '../models/calendar.model';

/** Shared test data for the calendar specs: November 2026, today the 19th of October. */

export const TODAY = '2026-10-19';

function event(
  overrides: Partial<CalendarEvent> & Pick<CalendarEvent, 'key' | 'type'>,
): CalendarEvent {
  return {
    startDate: '2026-11-02',
    endDate: '2026-11-02',
    label: '',
    sourceId: null,
    childId: null,
    absenceKind: null,
    comment: null,
    ...overrides,
  };
}

export const NOVEMBER_EVENTS: CalendarEvent[] = [
  event({
    key: 'holiday-2026-11-11',
    type: 'public_holiday',
    startDate: '2026-11-11',
    endDate: '2026-11-11',
    label: 'Armistice 1918',
  }),
  event({
    key: 'closure-k1',
    type: 'closure',
    startDate: '2026-11-09',
    endDate: '2026-11-10',
    label: 'Pont du 11 novembre',
    sourceId: 'k1',
  }),
  event({
    key: 'absence-a1',
    type: 'absence',
    startDate: '2026-11-04',
    endDate: '2026-11-05',
    label: 'Léa Martin',
    sourceId: 'a1',
    childId: 'c1',
    absenceKind: 'sickness',
    comment: 'Otite',
  }),
  event({
    key: 'reported_absence-r9',
    type: 'reported_absence',
    startDate: '2026-11-03',
    endDate: '2026-11-03',
    label: 'Hugo Bernard',
    childId: 'c2',
    comment: 'Fièvre',
  }),
  event({
    key: 'enrollment_start-c6',
    type: 'enrollment_start',
    label: 'Emma Moreau',
    childId: 'c6',
  }),
];

export const CHILD_OPTIONS: ChildOption[] = [
  {
    id: 'c1',
    firstName: 'Léa',
    lastName: 'Martin',
    enrollmentStart: '2026-09-01',
    enrollmentEnd: '2027-07-30',
    enrollmentStatus: 'enrolled',
  },
  {
    id: 'c6',
    firstName: 'Emma',
    lastName: 'Moreau',
    enrollmentStart: '2026-11-02',
    enrollmentEnd: null,
    enrollmentStatus: 'upcoming',
  },
  {
    id: 'c7',
    firstName: 'Lucas',
    lastName: 'Garnier',
    enrollmentStart: '2024-09-02',
    enrollmentEnd: '2026-07-31',
    enrollmentStatus: 'ended',
  },
];
