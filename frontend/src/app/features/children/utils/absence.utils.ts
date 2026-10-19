import { formatShortDate } from '../../../shared/utils/date.utils';
import { ABSENCE_KIND_LABELS } from '../constants/child.constants';
import type { ChildAbsence } from '../models/child.model';

/** "Maladie", or how an absence noted in a daily report is called (no reason known). */
export function absenceLabel(absence: ChildAbsence): string {
  return absence.kind ? ABSENCE_KIND_LABELS[absence.kind] : 'Absent';
}

/** Where the absence comes from, for the staff to know where to change it. */
export function absenceSource(absence: ChildAbsence): string {
  return absence.source === 'report' ? 'noté dans les rapports' : 'prévu au calendrier';
}

/** "le 16/10/2026" or "du 16/10/2026 au 20/10/2026". */
export function formatPeriod(start: string, end: string): string {
  return start === end
    ? `le ${formatShortDate(start)}`
    : `du ${formatShortDate(start)} au ${formatShortDate(end)}`;
}

export interface AbsenceGroups {
  current: ChildAbsence[];
  upcoming: ChildAbsence[];
  past: ChildAbsence[];
}

/** Splits the history (most recent first) around `today`, bounds included. */
export function groupAbsences(absences: ChildAbsence[], today: string): AbsenceGroups {
  return {
    current: absences.filter((a) => a.startDate <= today && a.endDate >= today),
    // The soonest first.
    upcoming: absences.filter((a) => a.startDate > today).reverse(),
    past: absences.filter((a) => a.endDate < today),
  };
}
