import { DailyReportPayload } from '../models/daily-report.model';
import { toFormValue, toPayload } from './report-form.utils';

const payload: DailyReportPayload = {
  absent: false,
  absenceComment: null,
  arrivalTime: '08:15',
  departureTime: null,
  meals: [{ label: 'Purée', quantityGrams: 150 }],
  bottles: [{ time: '09:30', quantityMl: 210 }],
  mealComment: null,
  naps: [{ startTime: '12:30', endTime: null }],
  noNap: false,
  napComment: null,
  stoolStatus: 'normal',
  stoolComment: null,
  parentNote: null,
};

describe('report form utils', () => {
  it('round-trips a payload through the form value', () => {
    expect(toPayload(toFormValue(payload))).toEqual(payload);
  });

  it('turns blank strings into null and trims meal labels', () => {
    const value = toFormValue(payload);
    value.parentNote = '   ';
    value.meals[0].label = '  Compote ';
    const result = toPayload(value);
    expect(result.parentNote).toBeNull();
    expect(result.meals[0].label).toBe('Compote');
  });

  it('drops naps when "no nap" is ticked and the stool comment when normal', () => {
    const value = { ...toFormValue(payload), noNap: true, stoolComment: 'oublié' };
    const result = toPayload(value);
    expect(result.naps).toEqual([]);
    expect(result.stoolComment).toBeNull();
  });
});
