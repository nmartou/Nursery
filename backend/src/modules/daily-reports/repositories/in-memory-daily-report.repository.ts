import { randomUUID } from 'node:crypto';
import { mostRecentWeekday } from '../../../common/utils/date.util.js';
import { Child } from '../models/child.model.js';
import {
  DailyReport,
  DailyReportContent,
} from '../models/daily-report.model.js';
import { DailyReportRepository } from './daily-report.repository.js';
import {
  EMPTY_REPORT_CONTENT,
  MOCK_CHILDREN,
  MOCK_REPORT_CONTENTS,
} from './mocks/daily-reports.mock.js';

/**
 * Temporary mock used while the PostgreSQL database does not exist
 * (`DB_DRIVER=memory`). The most recent weekday is seeded with sample reports.
 */
export class InMemoryDailyReportRepository implements DailyReportRepository {
  private readonly reports = new Map<string, DailyReport>();

  constructor(
    private readonly children: Child[] = MOCK_CHILDREN,
    seedDate: string = mostRecentWeekday(),
  ) {
    for (const child of children) {
      this.create(child, seedDate, MOCK_REPORT_CONTENTS[child.id] ?? {});
    }
  }

  ensureReportsForDate(date: string): Promise<void> {
    for (const child of this.children) {
      const exists = [...this.reports.values()].some(
        (report) => report.childId === child.id && report.date === date,
      );
      if (!exists) {
        this.create(child, date, {});
      }
    }
    return Promise.resolve();
  }

  findByDate(date: string): Promise<DailyReport[]> {
    const reports = [...this.reports.values()]
      .filter((report) => report.date === date)
      .sort(
        (a, b) =>
          a.childLastName.localeCompare(b.childLastName) ||
          a.childFirstName.localeCompare(b.childFirstName),
      );
    return Promise.resolve(reports.map(clone));
  }

  findById(id: string): Promise<DailyReport | null> {
    const report = this.reports.get(id);
    return Promise.resolve(report ? clone(report) : null);
  }

  update(id: string, content: DailyReportContent): Promise<DailyReport | null> {
    const existing = this.reports.get(id);
    if (!existing) {
      return Promise.resolve(null);
    }
    const updated: DailyReport = {
      ...existing,
      ...structuredClone(content),
      updatedAt: new Date(),
    };
    this.reports.set(id, updated);
    return Promise.resolve(clone(updated));
  }

  private create(
    child: Child,
    date: string,
    content: Partial<DailyReportContent>,
  ): void {
    const now = new Date();
    const report: DailyReport = {
      ...structuredClone(EMPTY_REPORT_CONTENT),
      ...structuredClone(content),
      id: randomUUID(),
      childId: child.id,
      childFirstName: child.firstName,
      childLastName: child.lastName,
      date,
      createdAt: now,
      updatedAt: now,
    };
    this.reports.set(report.id, report);
  }
}

function clone(report: DailyReport): DailyReport {
  return structuredClone(report);
}
