import { DailyReportContent } from '../models/daily-report.model.js';
import { computeReportStatus } from './report-status.util.js';

const empty: DailyReportContent = {
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

describe('computeReportStatus', () => {
  it('is "todo" when nothing is filled in', () => {
    expect(computeReportStatus(empty)).toBe('todo');
  });

  it('is "absent" when the child is absent, whatever else is filled', () => {
    expect(
      computeReportStatus({ ...empty, absent: true, arrivalTime: '08:00' }),
    ).toBe('absent');
  });

  it('is "in_progress" as soon as one field is filled', () => {
    expect(computeReportStatus({ ...empty, arrivalTime: '08:00' })).toBe(
      'in_progress',
    );
    expect(
      computeReportStatus({
        ...empty,
        stoolStatus: 'other',
        stoolComment: 'x',
      }),
    ).toBe('in_progress');
  });

  it('is "complete" with arrival, departure, food and nap', () => {
    const report: DailyReportContent = {
      ...empty,
      arrivalTime: '08:00',
      departureTime: '17:00',
      bottles: [{ time: '10:00', quantityMl: 180 }],
      noNap: true,
    };
    expect(computeReportStatus(report)).toBe('complete');
  });

  it('stays "in_progress" without departure time', () => {
    const report: DailyReportContent = {
      ...empty,
      arrivalTime: '08:00',
      meals: [{ label: 'Purée', quantityGrams: 150 }],
      naps: [{ startTime: '12:30', endTime: '14:00' }],
    };
    expect(computeReportStatus(report)).toBe('in_progress');
  });
});
