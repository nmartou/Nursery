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

/** e.g. "16/10/2026" */
export function formatShortDate(isoDate: string): string {
  const [year, month, day] = isoDate.split('-');
  return `${day}/${month}/${year}`;
}

/** Whole months between two `YYYY-MM-DD` dates (0 if `to` is before `from`). */
function monthsBetween(from: string, to: string): number {
  const [fromYear, fromMonth, fromDay] = from.split('-').map(Number);
  const [toYear, toMonth, toDay] = to.split('-').map(Number);
  const months = (toYear - fromYear) * 12 + (toMonth - fromMonth) - (toDay < fromDay ? 1 : 0);
  return Math.max(months, 0);
}

/** Age of a young child on `today`: "3 mois", "18 mois", "2 ans"… */
export function formatAge(birthDate: string, today: string): string {
  if (today < birthDate) {
    return 'à naître';
  }
  const months = monthsBetween(birthDate, today);
  if (months < 24) {
    return `${months} mois`;
  }
  const years = Math.floor(months / 12);
  return `${years} ans`;
}

/** `YYYY-MM-DD` shifted by a number of calendar days. */
export function addDays(isoDate: string, days: number): string {
  const date = parseIsoDate(isoDate);
  date.setUTCDate(date.getUTCDate() + days);
  return date.toISOString().slice(0, 10);
}

/** 1 for Monday … 7 for Sunday. */
export function isoDayOfWeek(isoDate: string): number {
  return ((parseIsoDate(isoDate).getUTCDay() + 6) % 7) + 1;
}

/** Today's local date as `YYYY-MM-DD`. */
export function todayIsoDate(now: Date = new Date()): string {
  const month = String(now.getMonth() + 1).padStart(2, '0');
  const day = String(now.getDate()).padStart(2, '0');
  return `${now.getFullYear()}-${month}-${day}`;
}

/** e.g. "octobre 2026" for any day of that month. */
export function formatMonth(isoDate: string): string {
  return parseIsoDate(isoDate).toLocaleDateString('fr-FR', {
    month: 'long',
    year: 'numeric',
    timeZone: 'UTC',
  });
}

/** First day (`YYYY-MM-01`) of the month containing `isoDate`. */
export function firstOfMonth(isoDate: string): string {
  return `${isoDate.slice(0, 7)}-01`;
}

/** First day of the month `delta` months away. */
export function shiftMonth(isoDate: string, delta: number): string {
  const year = Number(isoDate.slice(0, 4));
  const month = Number(isoDate.slice(5, 7)) - 1 + delta;
  const shifted = new Date(Date.UTC(year, month, 1));
  return shifted.toISOString().slice(0, 10);
}
