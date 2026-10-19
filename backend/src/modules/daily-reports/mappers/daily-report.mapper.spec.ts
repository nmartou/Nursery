import type { UpdateDailyReportDto } from '../dtos/update-daily-report.dto.js';
import type { DailyReport } from '../models/daily-report.model.js';
import { EMPTY_REPORT_CONTENT } from '../repositories/mocks/daily-reports.mock.js';
import { DailyReportMapper } from './daily-report.mapper.js';

const report: DailyReport = {
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
});
