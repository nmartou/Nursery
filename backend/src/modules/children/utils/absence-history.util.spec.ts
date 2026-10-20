import type { ChildAbsence } from '../models/child.model.js';
import { absenceHistory, currentAbsence } from './absence-history.util.js';

const vacation: ChildAbsence = {
  id: 'a1',
  startDate: '2026-10-26',
  endDate: '2026-10-30',
  kind: 'vacation',
  comment: null,
};

const day = (date: string, comment: string | null = null) => ({
  reportId: `r-${date}`,
  date,
  comment,
});

describe('absenceHistory', () => {
  it('groups consecutive report days, across a weekend, into one period', () => {
    const history = absenceHistory(
      [],
      [
        day('2026-10-16', 'Fièvre'),
        day('2026-10-19'),
        day('2026-10-20', 'Fièvre'),
      ],
    );
    expect(history).toEqual([
      {
        id: 'report-r-2026-10-16',
        startDate: '2026-10-16',
        endDate: '2026-10-20',
        kind: null,
        comment: 'Fièvre',
        source: 'report',
      },
    ]);
  });

  it('keeps separate periods apart and joins their distinct comments', () => {
    const history = absenceHistory(
      [],
      [
        day('2026-10-05', 'Otite'),
        day('2026-10-06', 'Rendez-vous'),
        day('2026-10-08'),
      ],
    );
    expect(history.map((a) => [a.startDate, a.endDate, a.comment])).toEqual([
      ['2026-10-08', '2026-10-08', null],
      ['2026-10-05', '2026-10-06', 'Otite · Rendez-vous'],
    ]);
  });

  it('takes the comment of a later day when the first one has none', () => {
    const history = absenceHistory(
      [],
      [day('2026-10-05'), day('2026-10-06', 'Varicelle')],
    );
    expect(history[0].comment).toBe('Varicelle');
  });

  it('leaves out the report days covered by a planned absence', () => {
    const history = absenceHistory(
      [vacation],
      [day('2026-10-27'), day('2026-10-28'), day('2026-11-02')],
    );
    expect(history.map((a) => [a.id, a.source])).toEqual([
      ['report-r-2026-11-02', 'report'],
      ['a1', 'calendar'],
    ]);
  });

  it('finds the absence covering today', () => {
    const history = absenceHistory([vacation], [day('2026-10-19')]);
    expect(currentAbsence(history, '2026-10-19')?.source).toBe('report');
    expect(currentAbsence(history, '2026-10-28')?.id).toBe('a1');
    expect(currentAbsence(history, '2026-10-21')).toBeNull();
  });
});
