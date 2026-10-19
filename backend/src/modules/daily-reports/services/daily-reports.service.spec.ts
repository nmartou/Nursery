import { BadRequestException, NotFoundException } from '@nestjs/common';
import { Test, TestingModule } from '@nestjs/testing';
import { DAILY_REPORT_REPOSITORY } from '../../../common/constants/injection-tokens.js';
import { InMemoryDailyReportRepository } from '../repositories/in-memory-daily-report.repository.js';
import {
  EMPTY_REPORT_CONTENT,
  MOCK_CHILDREN,
} from '../repositories/mocks/daily-reports.mock.js';
import { DailyReportsService } from './daily-reports.service.js';

describe('DailyReportsService', () => {
  let service: DailyReportsService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        DailyReportsService,
        {
          provide: DAILY_REPORT_REPOSITORY,
          useValue: new InMemoryDailyReportRepository(
            MOCK_CHILDREN,
            '2026-10-16',
          ),
        },
      ],
    }).compile();

    service = module.get(DailyReportsService);
  });

  it('lists the seeded reports with one status per child', async () => {
    const list = await service.listForDate('2026-10-16');
    const statuses = Object.fromEntries(
      list.reports.map((report) => [report.childFirstName, report.status]),
    );
    expect(list.date).toBe('2026-10-16');
    expect(statuses).toEqual({
      Hugo: 'in_progress',
      Chloé: 'todo',
      Inès: 'in_progress',
      Léa: 'complete',
      Nathan: 'absent',
    });
  });

  it('creates empty reports automatically for a new weekday', async () => {
    const list = await service.listForDate('2026-10-19');
    expect(list.reports).toHaveLength(MOCK_CHILDREN.length);
    expect(list.reports.every((report) => report.status === 'todo')).toBe(true);
  });

  it('refuses weekends', async () => {
    await expect(service.listForDate('2026-10-17')).rejects.toBeInstanceOf(
      BadRequestException,
    );
  });

  it('saves a report and recomputes its status', async () => {
    const { reports } = await service.listForDate('2026-10-16');
    const chloe = reports.find((report) => report.childFirstName === 'Chloé')!;
    const saved = await service.update(chloe.id, {
      ...EMPTY_REPORT_CONTENT,
      absent: true,
    });
    expect(saved.status).toBe('absent');
    expect((await service.getById(chloe.id)).absent).toBe(true);
  });

  it('throws NotFound for an unknown report', async () => {
    await expect(service.getById('unknown')).rejects.toBeInstanceOf(
      NotFoundException,
    );
    await expect(
      service.update('unknown', EMPTY_REPORT_CONTENT),
    ).rejects.toBeInstanceOf(NotFoundException);
  });
});
