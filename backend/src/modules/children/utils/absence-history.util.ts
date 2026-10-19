import { nextWeekday } from '../../../common/utils/date.util.js';
import type {
  AbsenceEntry,
  ChildAbsence,
  ReportedAbsenceDay,
} from '../models/child.model.js';

/**
 * A child's absences, most recent first: those planned in the calendar, and the
 * days marked absent in the daily reports. Report days already covered by a
 * planned absence are left out (the planned one says it already), and
 * consecutive weekdays (Friday then Monday included) become one period.
 */
export function absenceHistory(
  planned: ChildAbsence[],
  reported: ReportedAbsenceDay[],
): AbsenceEntry[] {
  const covered = (date: string) =>
    planned.some(
      (absence) => absence.startDate <= date && absence.endDate >= date,
    );

  const periods: AbsenceEntry[] = [];
  const days = reported
    .filter((day) => !covered(day.date))
    .sort((a, b) => a.date.localeCompare(b.date));
  for (const day of days) {
    const last = periods.at(-1);
    if (last && nextWeekday(last.endDate) === day.date) {
      last.endDate = day.date;
      if (day.comment && !last.comment?.split(' · ').includes(day.comment)) {
        last.comment = last.comment
          ? `${last.comment} · ${day.comment}`
          : day.comment;
      }
    } else {
      periods.push({
        id: `report-${day.reportId}`,
        startDate: day.date,
        endDate: day.date,
        kind: null,
        comment: day.comment,
        source: 'report',
      });
    }
  }

  return [
    ...planned.map((absence) => ({ ...absence, source: 'calendar' as const })),
    ...periods,
  ].sort((a, b) => b.startDate.localeCompare(a.startDate));
}

/** The absence covering `today`, if any. */
export function currentAbsence(
  history: AbsenceEntry[],
  today: string,
): AbsenceEntry | null {
  return (
    history.find(
      (absence) => absence.startDate <= today && absence.endDate >= today,
    ) ?? null
  );
}
