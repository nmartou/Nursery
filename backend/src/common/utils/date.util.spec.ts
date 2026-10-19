import {
  isWeekday,
  mostRecentWeekday,
  toHourMinute,
  toIsoDate,
} from './date.util.js';

describe('date utils', () => {
  it('drops the seconds of a PostgreSQL time', () => {
    expect(toHourMinute('08:15:00')).toBe('08:15');
  });

  it('formats a local date as YYYY-MM-DD', () => {
    expect(toIsoDate(new Date(2026, 0, 5))).toBe('2026-01-05');
  });

  it('detects weekdays', () => {
    expect(isWeekday('2026-10-16')).toBe(true); // Friday
    expect(isWeekday('2026-10-17')).toBe(false); // Saturday
    expect(isWeekday('2026-10-18')).toBe(false); // Sunday
  });

  it('falls back to the previous Friday on weekends', () => {
    expect(mostRecentWeekday(new Date(2026, 9, 18))).toBe('2026-10-16');
    expect(mostRecentWeekday(new Date(2026, 9, 14))).toBe('2026-10-14');
  });
});
