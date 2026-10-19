import {
  addDays,
  addWeekdays,
  currentTime,
  formatAge,
  formatLongDate,
  formatMonth,
  formatShortDate,
  isoDayOfWeek,
  shiftMonth,
  todayIsoDate,
  isWeekday,
} from './date.utils';

describe('date utils', () => {
  it('detects weekdays', () => {
    expect(isWeekday('2026-10-16')).toBe(true);
    expect(isWeekday('2026-10-17')).toBe(false);
  });

  it('skips weekends when moving between days', () => {
    expect(addWeekdays('2026-10-16', 1)).toBe('2026-10-19');
    expect(addWeekdays('2026-10-19', -1)).toBe('2026-10-16');
    expect(addWeekdays('2026-10-14', 1)).toBe('2026-10-15');
  });

  it('formats a long French date', () => {
    expect(formatLongDate('2026-10-16')).toBe('vendredi 16 octobre 2026');
  });

  it('formats the current time as HH:mm', () => {
    expect(currentTime(new Date(2026, 9, 16, 9, 5))).toBe('09:05');
  });

  it('formats a short French date', () => {
    expect(formatShortDate('2026-10-16')).toBe('16/10/2026');
  });

  it('gives the age in months before 2 years, then in years', () => {
    expect(formatAge('2026-07-20', '2026-10-19')).toBe('2 mois');
    expect(formatAge('2026-07-20', '2026-10-20')).toBe('3 mois');
    expect(formatAge('2024-11-01', '2026-10-19')).toBe('23 mois');
    expect(formatAge('2024-03-12', '2026-10-19')).toBe('2 ans');
    expect(formatAge('2026-12-01', '2026-10-19')).toBe('à naître');
  });

  it('moves by calendar days and months', () => {
    expect(addDays('2026-10-31', 1)).toBe('2026-11-01');
    expect(addDays('2026-03-01', -1)).toBe('2026-02-28');
    expect(shiftMonth('2026-12-15', 1)).toBe('2027-01-01');
    expect(shiftMonth('2026-01-31', -1)).toBe('2025-12-01');
  });

  it('gives the ISO day of week, today and the month name', () => {
    expect(isoDayOfWeek('2026-10-19')).toBe(1); // Monday
    expect(isoDayOfWeek('2026-10-25')).toBe(7); // Sunday
    expect(todayIsoDate(new Date(2026, 9, 19, 23, 30))).toBe('2026-10-19');
    expect(formatMonth('2026-10-19')).toBe('octobre 2026');
  });
});
