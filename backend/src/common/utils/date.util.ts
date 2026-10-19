export function toIsoString(date: Date): string {
  return date.toISOString();
}

/** Formats a date as `YYYY-MM-DD` using the local calendar day. */
export function toIsoDate(date: Date): string {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

/** PostgreSQL `time` values come back as `HH:mm:ss`: keeps `HH:mm`. */
export function toHourMinute(time: string): string {
  return time.slice(0, 5);
}

/** Returns true when the `YYYY-MM-DD` date is Monday to Friday. */
export function isWeekday(isoDate: string): boolean {
  const day = new Date(`${isoDate}T00:00:00Z`).getUTCDay();
  return day !== 0 && day !== 6;
}

/** Returns the given day if it is a weekday, otherwise the previous Friday. */
export function mostRecentWeekday(now: Date = new Date()): string {
  const date = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  while (!isWeekday(toIsoDate(date))) {
    date.setDate(date.getDate() - 1);
  }
  return toIsoDate(date);
}
