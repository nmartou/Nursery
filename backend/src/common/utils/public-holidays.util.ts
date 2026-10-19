export interface PublicHoliday {
  /** `YYYY-MM-DD` */
  date: string;
  label: string;
}

function iso(year: number, month: number, day: number): string {
  return `${year}-${String(month).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
}

function addDays(isoDate: string, days: number): string {
  const date = new Date(`${isoDate}T00:00:00Z`);
  date.setUTCDate(date.getUTCDate() + days);
  return iso(date.getUTCFullYear(), date.getUTCMonth() + 1, date.getUTCDate());
}

/** Easter Sunday (Gregorian calendar, Meeus/Jones/Butcher algorithm). */
export function easterSunday(year: number): string {
  const a = year % 19;
  const b = Math.floor(year / 100);
  const c = year % 100;
  const d = Math.floor(b / 4);
  const e = b % 4;
  const f = Math.floor((b + 8) / 25);
  const g = Math.floor((b - f + 1) / 3);
  const h = (19 * a + b - d - g + 15) % 30;
  const i = Math.floor(c / 4);
  const k = c % 4;
  const l = (32 + 2 * e + 2 * i - h - k) % 7;
  const m = Math.floor((a + 11 * h + 22 * l) / 451);
  const month = Math.floor((h + l - 7 * m + 114) / 31);
  const day = ((h + l - 7 * m + 114) % 31) + 1;
  return iso(year, month, day);
}

/** The eleven French public holidays of a year, in date order. */
export function frenchPublicHolidays(year: number): PublicHoliday[] {
  const easter = easterSunday(year);
  return [
    { date: iso(year, 1, 1), label: "Jour de l'an" },
    { date: addDays(easter, 1), label: 'Lundi de Pâques' },
    { date: iso(year, 5, 1), label: 'Fête du Travail' },
    { date: iso(year, 5, 8), label: 'Victoire 1945' },
    { date: addDays(easter, 39), label: 'Ascension' },
    { date: addDays(easter, 50), label: 'Lundi de Pentecôte' },
    { date: iso(year, 7, 14), label: 'Fête nationale' },
    { date: iso(year, 8, 15), label: 'Assomption' },
    { date: iso(year, 11, 1), label: 'Toussaint' },
    { date: iso(year, 11, 11), label: 'Armistice 1918' },
    { date: iso(year, 12, 25), label: 'Noël' },
  ].sort((x, y) => x.date.localeCompare(y.date));
}

/** Public holidays between two `YYYY-MM-DD` dates, bounds included. */
export function publicHolidaysBetween(
  from: string,
  to: string,
): PublicHoliday[] {
  const holidays: PublicHoliday[] = [];
  for (
    let year = Number(from.slice(0, 4));
    year <= Number(to.slice(0, 4));
    year++
  ) {
    holidays.push(
      ...frenchPublicHolidays(year).filter(
        (holiday) => holiday.date >= from && holiday.date <= to,
      ),
    );
  }
  return holidays;
}

/** The label of the public holiday on that day, or null. */
export function publicHolidayOn(isoDate: string): string | null {
  return publicHolidaysBetween(isoDate, isoDate).at(0)?.label ?? null;
}
