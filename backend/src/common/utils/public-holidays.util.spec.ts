import {
  easterSunday,
  frenchPublicHolidays,
  publicHolidayOn,
  publicHolidaysBetween,
} from './public-holidays.util.js';

describe('public holidays', () => {
  it('computes Easter Sunday', () => {
    expect(easterSunday(2024)).toBe('2024-03-31');
    expect(easterSunday(2025)).toBe('2025-04-20');
    expect(easterSunday(2026)).toBe('2026-04-05');
    expect(easterSunday(2027)).toBe('2027-03-28');
  });

  it('lists the eleven French public holidays of 2026', () => {
    expect(frenchPublicHolidays(2026)).toEqual([
      { date: '2026-01-01', label: "Jour de l'an" },
      { date: '2026-04-06', label: 'Lundi de Pâques' },
      { date: '2026-05-01', label: 'Fête du Travail' },
      { date: '2026-05-08', label: 'Victoire 1945' },
      { date: '2026-05-14', label: 'Ascension' },
      { date: '2026-05-25', label: 'Lundi de Pentecôte' },
      { date: '2026-07-14', label: 'Fête nationale' },
      { date: '2026-08-15', label: 'Assomption' },
      { date: '2026-11-01', label: 'Toussaint' },
      { date: '2026-11-11', label: 'Armistice 1918' },
      { date: '2026-12-25', label: 'Noël' },
    ]);
  });

  it('finds the holidays of a period, across years', () => {
    expect(
      publicHolidaysBetween('2026-12-20', '2027-01-05').map((h) => h.label),
    ).toEqual(['Noël', "Jour de l'an"]);
  });

  it('tells whether a day is a holiday', () => {
    expect(publicHolidayOn('2026-11-11')).toBe('Armistice 1918');
    expect(publicHolidayOn('2026-11-12')).toBeNull();
  });
});
