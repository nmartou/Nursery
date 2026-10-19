import { addDays, firstOfMonth, isoDayOfWeek } from '../../../shared/utils/date.utils';
import { ABSENCE_KIND_LABELS, EVENT_TYPE_LABELS } from '../constants/calendar.constants';
import type { CalendarDay, CalendarEvent } from '../models/calendar.model';

/**
 * The weeks (Monday to Sunday) covering the month of `isoDate`: days of the
 * neighbouring months fill the first and last weeks.
 */
export function monthWeeks(isoDate: string, today: string): CalendarDay[][] {
  const first = firstOfMonth(isoDate);
  const month = first.slice(0, 7);
  let day = addDays(first, 1 - isoDayOfWeek(first));
  const weeks: CalendarDay[][] = [];
  do {
    const week: CalendarDay[] = [];
    for (let i = 0; i < 7; i++) {
      week.push({
        date: day,
        dayOfMonth: Number(day.slice(8, 10)),
        inMonth: day.startsWith(month),
        weekend: i >= 5,
        today: day === today,
      });
      day = addDays(day, 1);
    }
    weeks.push(week);
  } while (day.startsWith(month));
  return weeks;
}

/** The events covering a day (multi-day events appear on each of their days). */
export function eventsOn(events: CalendarEvent[], date: string): CalendarEvent[] {
  return events.filter((event) => event.startDate <= date && event.endDate >= date);
}

/** Text of an event chip, e.g. "Férié · Toussaint" or "Léa Martin · Maladie". */
export function eventText(event: CalendarEvent): string {
  if (event.type === 'reported_absence') {
    return `${event.label} · Absent(e)`;
  }
  if (event.type === 'absence') {
    const kind = event.absenceKind ? ABSENCE_KIND_LABELS[event.absenceKind] : 'Absence';
    return `${event.label} · ${kind}`;
  }
  return `${EVENT_TYPE_LABELS[event.type]} · ${event.label}`;
}

/** Closures and absences are entered by the staff; the rest is computed. */
export function isEditable(event: CalendarEvent): boolean {
  return event.sourceId !== null;
}
