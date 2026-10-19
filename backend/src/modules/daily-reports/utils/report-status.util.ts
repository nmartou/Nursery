import type {
  DailyReportContent,
  PlannedAbsence,
  ReportStatus,
} from '../models/daily-report.model.js';

/**
 * A report is complete once arrival, departure, food (meal or bottle) and nap
 * (or "no nap") are filled in. Stools default to "normal" so they never block.
 * A report left empty on a day of planned absence counts as absent; anything
 * entered (e.g. the child came after all) takes over.
 */
export function computeReportStatus(
  report: DailyReportContent,
  plannedAbsence: PlannedAbsence | null = null,
): ReportStatus {
  if (report.absent) {
    return 'absent';
  }

  const hasFood = report.meals.length > 0 || report.bottles.length > 0;
  const hasNap = report.naps.length > 0 || report.noNap;

  if (report.arrivalTime && report.departureTime && hasFood && hasNap) {
    return 'complete';
  }

  const hasAnyInput =
    !!report.arrivalTime ||
    !!report.departureTime ||
    hasFood ||
    hasNap ||
    !!report.mealComment ||
    !!report.napComment ||
    report.stoolStatus !== 'normal' ||
    !!report.parentNote;

  if (hasAnyInput) {
    return 'in_progress';
  }
  return plannedAbsence ? 'absent' : 'todo';
}
