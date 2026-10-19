import { BadRequestException, NotFoundException } from '@nestjs/common';
import type { DailyReport } from '../models/daily-report.model.js';
import type { DailyReportRepository } from '../repositories/daily-report.repository.js';
import { EMPTY_REPORT_CONTENT } from '../testing/daily-report.fixtures.js';
import { DailyReportsService } from './daily-reports.service.js';

const report: DailyReport = {
  plannedAbsence: null,
  ...EMPTY_REPORT_CONTENT,
  id: 'r1',
  childId: 'c1',
  childFirstName: 'Léa',
  childLastName: 'Martin',
  date: '2026-10-16',
  createdAt: new Date('2026-10-16T06:00:00Z'),
  updatedAt: new Date('2026-10-16T07:00:00Z'),
};

function createRepositoryMock() {
  return {
    closureOn: vi.fn((): Promise<string | null> => Promise.resolve(null)),
    ensureReportsForDate: vi.fn(() => Promise.resolve()),
    findByDate: vi.fn(() => Promise.resolve([report])),
    findById: vi.fn((id: string) =>
      Promise.resolve(id === report.id ? report : null),
    ),
    update: vi.fn((id: string) =>
      Promise.resolve(id === report.id ? { ...report, absent: true } : null),
    ),
  };
}

describe('DailyReportsService', () => {
  let repository: ReturnType<typeof createRepositoryMock>;
  let service: DailyReportsService;

  beforeEach(() => {
    repository = createRepositoryMock();
    service = new DailyReportsService(
      repository as unknown as DailyReportRepository,
    );
  });

  it('creates the missing reports before listing the day', async () => {
    const list = await service.listForDate('2026-10-16');

    expect(repository.ensureReportsForDate).toHaveBeenCalledWith('2026-10-16');
    expect(list).toEqual({
      date: '2026-10-16',
      closure: null,
      reports: [expect.objectContaining({ id: 'r1', status: 'todo' })],
    });
  });

  it('creates no report on a closed day and says why', async () => {
    repository.closureOn.mockResolvedValueOnce('Toussaint');
    await expect(service.listForDate('2026-11-02')).resolves.toEqual({
      date: '2026-11-02',
      closure: 'Toussaint',
      reports: [],
    });
    expect(repository.ensureReportsForDate).not.toHaveBeenCalled();
  });

  it('shows an empty report as absent on a day of planned absence', async () => {
    repository.findByDate.mockResolvedValueOnce([
      { ...report, plannedAbsence: { kind: 'sickness', comment: 'Otite' } },
    ]);
    const list = await service.listForDate('2026-10-16');
    expect(list.reports[0]).toMatchObject({
      status: 'absent',
      plannedAbsence: { kind: 'sickness', comment: 'Otite' },
    });
  });

  it('counts the reports of the day by status', async () => {
    repository.findByDate.mockResolvedValueOnce([
      report,
      { ...report, id: 'r2', absent: true },
      { ...report, id: 'r3', arrivalTime: '08:00' },
    ]);

    await expect(service.statsForDate('2026-10-16')).resolves.toEqual({
      date: '2026-10-16',
      closure: null,
      total: 3,
      byStatus: { todo: 1, in_progress: 1, complete: 0, absent: 1 },
    });
  });

  it('refuses weekends without querying the database', async () => {
    await expect(service.listForDate('2026-10-17')).rejects.toBeInstanceOf(
      BadRequestException,
    );
    expect(repository.ensureReportsForDate).not.toHaveBeenCalled();
  });

  it('returns the saved report with its recomputed status', async () => {
    const saved = await service.update('r1', {
      ...EMPTY_REPORT_CONTENT,
      absent: true,
    });
    expect(saved.status).toBe('absent');
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
