import type { UpdateDailyReportDto } from '../dtos/update-daily-report.dto.js';
import type { DailyReport } from '../models/daily-report.model.js';
import { EMPTY_REPORT_CONTENT } from '../testing/daily-report.fixtures.js';
import { DailyReportMapper } from './daily-report.mapper.js';

const report: DailyReport = {
  plannedAbsence: null,
  ...EMPTY_REPORT_CONTENT,
  id: 'r1',
  childId: 'c1',
  childFirstName: 'Léa',
  childLastName: 'Martin',
  date: '2026-10-16',
  arrivalTime: '08:00',
  createdAt: new Date('2026-10-16T06:00:00.000Z'),
  updatedAt: new Date('2026-10-16T07:30:00.000Z'),
};

describe('DailyReportMapper', () => {
  it('maps a report to a response DTO with its computed status', () => {
    const dto = DailyReportMapper.toResponseDto(report);
    expect(dto.status).toBe('in_progress');
    expect(dto.updatedAt).toBe('2026-10-16T07:30:00.000Z');
    expect(dto.childFirstName).toBe('Léa');
  });

  it('maps a report to a summary DTO', () => {
    expect(DailyReportMapper.toSummaryDto(report)).toEqual({
      id: 'r1',
      childId: 'c1',
      childFirstName: 'Léa',
      childLastName: 'Martin',
      status: 'in_progress',
      plannedAbsence: null,
      updatedAt: '2026-10-16T07:30:00.000Z',
    });
  });

  it('normalizes empty strings and drops the stool comment when stools are normal', () => {
    const dto: UpdateDailyReportDto = {
      ...EMPTY_REPORT_CONTENT,
      absenceComment: '  ',
      arrivalTime: '',
      meals: [{ label: '  Purée  ', quantityGrams: 150 }],
      naps: [{ startTime: '12:00', endTime: '' }],
      stoolStatus: 'normal',
      stoolComment: 'ignored',
    };
    const content = DailyReportMapper.toContent(dto);
    expect(content.absenceComment).toBeNull();
    expect(content.arrivalTime).toBeNull();
    expect(content.meals).toEqual([{ label: 'Purée', quantityGrams: 150 }]);
    expect(content.naps).toEqual([{ startTime: '12:00', endTime: null }]);
    expect(content.stoolComment).toBeNull();
  });

  it('keeps the stool comment of abnormal stools and nulls missing quantities', () => {
    const dto = {
      ...EMPTY_REPORT_CONTENT,
      meals: [{ label: 'Compote' }],
      bottles: [{ time: '09:30' }],
      stoolStatus: 'other',
      stoolComment: ' Liquides ',
    } as UpdateDailyReportDto;
    const content = DailyReportMapper.toContent(dto);
    expect(content.meals).toEqual([{ label: 'Compote', quantityGrams: null }]);
    expect(content.bottles).toEqual([{ time: '09:30', quantityMl: null }]);
    expect(content.stoolComment).toBe('Liquides');
  });
});
