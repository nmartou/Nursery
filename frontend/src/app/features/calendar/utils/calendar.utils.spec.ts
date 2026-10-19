import { NOVEMBER_EVENTS } from '../testing/calendar.fixtures';
import { eventsOn, eventText, isEditable, monthWeeks } from './calendar.utils';

describe('calendar utils', () => {
  it('builds the Monday-to-Sunday weeks covering a month', () => {
    const weeks = monthWeeks('2026-10-19', '2026-10-19');
    expect(weeks).toHaveLength(5);
    expect(weeks[0][0]).toMatchObject({ date: '2026-09-28', inMonth: false, weekend: false });
    expect(weeks[0][3]).toMatchObject({ date: '2026-10-01', dayOfMonth: 1, inMonth: true });
    expect(weeks[3][0]).toMatchObject({ date: '2026-10-19', today: true });
    expect(weeks[3][5].weekend).toBe(true);
    expect(weeks[4][6].date).toBe('2026-11-01');
  });

  it('adds a sixth week when the month needs it', () => {
    // August 2026 starts on a Saturday and ends on a Monday.
    const weeks = monthWeeks('2026-08-15', '2026-10-19');
    expect(weeks).toHaveLength(6);
    expect(weeks[5][0].date).toBe('2026-08-31');
  });

  it('finds the events covering a day, multi-day ones included', () => {
    expect(eventsOn(NOVEMBER_EVENTS, '2026-11-05').map((e) => e.key)).toEqual(['absence-a1']);
    expect(eventsOn(NOVEMBER_EVENTS, '2026-11-10').map((e) => e.key)).toEqual(['closure-k1']);
    expect(eventsOn(NOVEMBER_EVENTS, '2026-11-06')).toEqual([]);
  });

  it('describes each kind of event', () => {
    expect(NOVEMBER_EVENTS.map(eventText)).toEqual([
      'Férié · Armistice 1918',
      'Fermeture · Pont du 11 novembre',
      'Léa Martin · Maladie',
      'Hugo Bernard · Absent(e)',
      'Arrivée · Emma Moreau',
    ]);
  });

  it('only lets the staff edit closures and absences', () => {
    // Absences noted in a report are changed in the report itself.
    expect(NOVEMBER_EVENTS.map(isEditable)).toEqual([false, true, true, false, false]);
  });
});
