import type { DailyReportContent } from '../models/daily-report.model.js';

/** A report with nothing filled in, as created for a new day. */
export const EMPTY_REPORT_CONTENT: DailyReportContent = {
  absent: false,
  absenceComment: null,
  arrivalTime: null,
  departureTime: null,
  meals: [],
  bottles: [],
  mealComment: null,
  naps: [],
  noNap: false,
  napComment: null,
  stoolStatus: 'normal',
  stoolComment: null,
  parentNote: null,
};
