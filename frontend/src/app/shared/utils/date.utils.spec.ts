import { addWeekdays, currentTime, formatLongDate, isWeekday } from './date.utils';

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
});
