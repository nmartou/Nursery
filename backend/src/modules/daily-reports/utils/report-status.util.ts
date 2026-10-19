import {
  DailyReportContent,
  ReportStatus,
} from '../models/daily-report.model.js';

/**
 * A report is complete once arrival, departure, food (meal or bottle) and nap
 * (or "no nap") are filled in. Stools default to "normal" so they never block.
 */
export function computeReportStatus(report: DailyReportContent): ReportStatus {
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

  return hasAnyInput ? 'in_progress' : 'todo';
}
