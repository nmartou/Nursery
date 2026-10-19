import { InMemoryDailyReportRepository } from './in-memory-daily-report.repository.js';
import {
  EMPTY_REPORT_CONTENT,
  MOCK_CHILDREN,
} from './mocks/daily-reports.mock.js';

describe('InMemoryDailyReportRepository', () => {
  let repository: InMemoryDailyReportRepository;

  beforeEach(() => {
    repository = new InMemoryDailyReportRepository(MOCK_CHILDREN, '2026-10-16');
  });

  it('seeds one report per child, sorted by last name', async () => {
    const reports = await repository.findByDate('2026-10-16');
    expect(reports.map((report) => report.childLastName)).toEqual([
      'Bernard',
      'Dubois',
      'Leroy',
      'Martin',
      'Petit',
    ]);
  });

  it('creates missing empty reports only once per date', async () => {
    await repository.ensureReportsForDate('2026-10-19');
    await repository.ensureReportsForDate('2026-10-19');
    const reports = await repository.findByDate('2026-10-19');
    expect(reports).toHaveLength(MOCK_CHILDREN.length);
    expect(reports.every((report) => report.arrivalTime === null)).toBe(true);
  });

  it('updates a report and its modification date', async () => {
    const [report] = await repository.findByDate('2026-10-16');
    const updated = await repository.update(report.id, {
      ...EMPTY_REPORT_CONTENT,
      arrivalTime: '09:00',
    });
    expect(updated?.arrivalTime).toBe('09:00');
    expect(updated!.updatedAt.getTime()).toBeGreaterThanOrEqual(
      report.updatedAt.getTime(),
    );
  });

  it('returns null for an unknown report', async () => {
    expect(await repository.findById('unknown')).toBeNull();
    expect(await repository.update('unknown', EMPTY_REPORT_CONTENT)).toBeNull();
  });

  it('returns copies so callers cannot mutate the store', async () => {
    const [report] = await repository.findByDate('2026-10-16');
    report.meals.push({ label: 'Hack', quantityGrams: 1 });
    const fresh = await repository.findById(report.id);
    expect(fresh?.meals).not.toContainEqual({
      label: 'Hack',
      quantityGrams: 1,
    });
  });
});
