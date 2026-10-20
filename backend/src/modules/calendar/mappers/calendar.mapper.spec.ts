import type { SaveAbsenceDto } from '../dtos/save-absence.dto.js';
import type { CalendarEvent } from '../models/calendar.model.js';
import { CalendarMapper } from './calendar.mapper.js';

const event = (overrides: Partial<CalendarEvent>): CalendarEvent => ({
  key: 'k',
  type: 'absence',
  startDate: '2026-11-02',
  endDate: '2026-11-02',
  label: 'Léa Martin',
  sourceId: null,
  childId: null,
  absenceKind: null,
  comment: null,
  ...overrides,
});

const DTO: SaveAbsenceDto = {
  childId: 'c1',
  startDate: '2026-11-02',
  endDate: '2026-11-03',
  kind: 'vacation',
  comment: 'Grands-parents',
};

describe('CalendarMapper', () => {
  it('sorts by date, then closures, arrivals, departures and absences, then name', () => {
    const sorted = CalendarMapper.sort([
      event({ key: 'reported', type: 'reported_absence' }),
      event({ key: 'absence-zoe', label: 'Zoé Petit' }),
      event({ key: 'absence-adam', label: 'Adam Petit' }),
      event({ key: 'end', type: 'enrollment_end' }),
      event({ key: 'start', type: 'enrollment_start' }),
      event({ key: 'closure', type: 'closure', label: 'Pont' }),
      event({ key: 'holiday', type: 'public_holiday', label: 'Toussaint' }),
      event({ key: 'before', startDate: '2026-11-01' }),
    ]);

    expect(sorted.map((e) => e.key)).toEqual([
      'before',
      'holiday',
      'closure',
      'start',
      'end',
      'absence-adam',
      'absence-zoe',
      'reported',
    ]);
  });

  it('does not reorder the given array', () => {
    const events = [
      event({ key: 'b', startDate: '2026-11-03' }),
      event({ key: 'a' }),
    ];
    CalendarMapper.sort(events);
    expect(events.map((e) => e.key)).toEqual(['b', 'a']);
  });

  it.each([
    ['an empty comment', ''],
    ['a missing comment', undefined],
    ['a null comment', null],
  ])('saves %s as none', (_, comment) => {
    expect(
      CalendarMapper.toAbsenceInput({
        ...DTO,
        comment: comment as string | null,
      }).comment,
    ).toBeNull();
  });

  it('keeps the fields of an absence and its comment', () => {
    expect(CalendarMapper.toAbsenceInput(DTO)).toEqual(DTO);
  });
});
