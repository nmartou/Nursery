import type { DailyReportPayload, StoolStatus } from '../models/daily-report.model';

/** Raw value of the report form: optional text fields are empty strings, not null. */
export interface ReportFormValue {
  absent: boolean;
  absenceComment: string;
  arrivalTime: string;
  departureTime: string;
  meals: { label: string; quantityGrams: number | null }[];
  bottles: { time: string; quantityMl: number | null }[];
  mealComment: string;
  naps: { startTime: string; endTime: string }[];
  noNap: boolean;
  napComment: string;
  stoolStatus: StoolStatus;
  stoolComment: string;
  parentNote: string;
}

export function toFormValue(report: DailyReportPayload): ReportFormValue {
  return {
    absent: report.absent,
    absenceComment: report.absenceComment ?? '',
    arrivalTime: report.arrivalTime ?? '',
    departureTime: report.departureTime ?? '',
    meals: report.meals.map((meal) => ({ ...meal })),
    bottles: report.bottles.map((bottle) => ({ ...bottle })),
    mealComment: report.mealComment ?? '',
    naps: report.naps.map((nap) => ({ startTime: nap.startTime, endTime: nap.endTime ?? '' })),
    noNap: report.noNap,
    napComment: report.napComment ?? '',
    stoolStatus: report.stoolStatus,
    stoolComment: report.stoolComment ?? '',
    parentNote: report.parentNote ?? '',
  };
}

export function toPayload(value: ReportFormValue): DailyReportPayload {
  return {
    absent: value.absent,
    absenceComment: blankToNull(value.absenceComment),
    arrivalTime: blankToNull(value.arrivalTime),
    departureTime: blankToNull(value.departureTime),
    meals: value.meals.map((meal) => ({
      label: meal.label.trim(),
      quantityGrams: meal.quantityGrams,
    })),
    bottles: value.bottles.map((bottle) => ({ ...bottle })),
    mealComment: blankToNull(value.mealComment),
    // "No nap" wins over any nap entered before ticking it
    naps: value.noNap
      ? []
      : value.naps.map((nap) => ({ startTime: nap.startTime, endTime: blankToNull(nap.endTime) })),
    noNap: value.noNap,
    napComment: blankToNull(value.napComment),
    stoolStatus: value.stoolStatus,
    stoolComment: value.stoolStatus === 'other' ? blankToNull(value.stoolComment) : null,
    parentNote: blankToNull(value.parentNote),
  };
}

function blankToNull(value: string): string | null {
  const trimmed = value.trim();
  return trimmed ? trimmed : null;
}
