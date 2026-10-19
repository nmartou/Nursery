import type { ChildAbsence } from '../models/child.model';
import { absenceLabel, absenceSource, formatPeriod, groupAbsences } from './absence.utils';

const absence = (overrides: Partial<ChildAbsence>): ChildAbsence => ({
  id: 'a',
  startDate: '2026-10-19',
  endDate: '2026-10-19',
  kind: null,
  comment: null,
  source: 'report',
  ...overrides,
});

describe('absence utils', () => {
  it('names an absence by its reason, or "Absent" when noted in a report', () => {
    expect(absenceLabel(absence({ kind: 'sickness', source: 'calendar' }))).toBe('Maladie');
    expect(absenceLabel(absence({}))).toBe('Absent');
    expect(absenceSource(absence({}))).toBe('noté dans les rapports');
    expect(absenceSource(absence({ source: 'calendar' }))).toBe('prévu au calendrier');
  });

  it('formats a day or a period', () => {
    expect(formatPeriod('2026-10-16', '2026-10-16')).toBe('le 16/10/2026');
    expect(formatPeriod('2026-10-16', '2026-10-20')).toBe('du 16/10/2026 au 20/10/2026');
  });

  it('splits the history around today, the soonest upcoming first', () => {
    // As the API sends it: most recent first.
    const history = [
      absence({ id: 'later', startDate: '2026-12-21', endDate: '2026-12-24' }),
      absence({ id: 'soon', startDate: '2026-10-26', endDate: '2026-10-30' }),
      absence({ id: 'now', startDate: '2026-10-19', endDate: '2026-10-20' }),
      absence({ id: 'before', startDate: '2026-10-16', endDate: '2026-10-16' }),
    ];
    const groups = groupAbsences(history, '2026-10-19');
    expect(groups.current.map((a) => a.id)).toEqual(['now']);
    expect(groups.upcoming.map((a) => a.id)).toEqual(['soon', 'later']);
    expect(groups.past.map((a) => a.id)).toEqual(['before']);
  });
});
