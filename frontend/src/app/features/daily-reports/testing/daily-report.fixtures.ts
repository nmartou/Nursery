import { DailyReport, DailyReportSummary } from '../models/daily-report.model';

/** Shared test data for the daily-reports feature specs. */

export const REPORT_SUMMARIES: DailyReportSummary[] = [
  {
    id: 'r1',
    childId: 'c1',
    childFirstName: 'Léa',
    childLastName: 'Martin',
    status: 'complete',
    updatedAt: '2026-10-16T15:30:00.000Z',
  },
  {
    id: 'r2',
    childId: 'c2',
    childFirstName: 'Hugo',
    childLastName: 'Bernard',
    status: 'in_progress',
    updatedAt: '2026-10-16T08:00:00.000Z',
  },
  {
    id: 'r3',
    childId: 'c3',
    childFirstName: 'Chloé',
    childLastName: 'Dubois',
    status: 'todo',
    updatedAt: '2026-10-16T06:00:00.000Z',
  },
];

export function buildReport(overrides: Partial<DailyReport> = {}): DailyReport {
  return {
    id: 'r2',
    childId: 'c2',
    childFirstName: 'Hugo',
    childLastName: 'Bernard',
    date: '2026-10-16',
    status: 'in_progress',
    updatedAt: '2026-10-16T08:00:00.000Z',
    absent: false,
    absenceComment: null,
    arrivalTime: '08:40',
    departureTime: null,
    meals: [],
    bottles: [{ time: '09:30', quantityMl: 210 }],
    mealComment: null,
    naps: [{ startTime: '10:00', endTime: '10:45' }],
    noNap: false,
    napComment: null,
    stoolStatus: 'normal',
    stoolComment: null,
    parentNote: null,
    ...overrides,
  };
}
