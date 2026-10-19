/** Date helpers working on `YYYY-MM-DD` strings, independent of the time zone. */

function parseIsoDate(isoDate: string): Date {
  return new Date(`${isoDate}T00:00:00Z`);
}

export function isWeekday(isoDate: string): boolean {
  const day = parseIsoDate(isoDate).getUTCDay();
  return day !== 0 && day !== 6;
}

/** Moves forward (delta > 0) or backward (delta < 0) by whole weekdays, skipping weekends. */
export function addWeekdays(isoDate: string, delta: number): string {
  const date = parseIsoDate(isoDate);
  const step = delta >= 0 ? 1 : -1;
  let remaining = Math.abs(delta);
  while (remaining > 0) {
    date.setUTCDate(date.getUTCDate() + step);
    if (isWeekday(date.toISOString().slice(0, 10))) {
      remaining--;
    }
  }
  return date.toISOString().slice(0, 10);
}

/** e.g. "vendredi 16 octobre 2026" */
export function formatLongDate(isoDate: string): string {
  return parseIsoDate(isoDate).toLocaleDateString('fr-FR', {
    weekday: 'long',
    day: 'numeric',
    month: 'long',
    year: 'numeric',
    timeZone: 'UTC',
  });
}

/** Local `HH:mm` of an ISO timestamp. */
export function formatTime(isoDateTime: string): string {
  return new Date(isoDateTime).toLocaleTimeString('fr-FR', {
    hour: '2-digit',
    minute: '2-digit',
  });
}

/** Current local time as `HH:mm`. */
export function currentTime(now: Date = new Date()): string {
  return `${String(now.getHours()).padStart(2, '0')}:${String(now.getMinutes()).padStart(2, '0')}`;
}
