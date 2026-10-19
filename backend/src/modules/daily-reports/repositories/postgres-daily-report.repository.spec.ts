import type { Pool } from 'pg';
import { EMPTY_REPORT_CONTENT } from './mocks/daily-reports.mock.js';
import { PostgresDailyReportRepository } from './postgres-daily-report.repository.js';
import type { DailyReportRow } from './rows/daily-report.rows.js';

const reportRow: DailyReportRow = {
  id: 'r1',
  child_id: 'c1',
  child_first_name: 'Léa',
  child_last_name: 'Martin',
  report_date: '2026-10-16',
  absent: false,
  absence_comment: null,
  arrival_time: '08:15',
  departure_time: null,
  meal_comment: null,
  no_nap: false,
  nap_comment: null,
  stool_status: 'normal',
  stool_comment: null,
  parent_note: null,
  created_at: new Date('2026-10-16T06:00:00Z'),
  updated_at: new Date('2026-10-16T07:00:00Z'),
};

/** Builds a fake pg Pool answering queries by matching their SQL. */
function createPoolMock(options: { updatedRows?: number } = {}) {
  const query = vi.fn((sql: string) => {
    if (sql.includes('FROM report_meal')) {
      return {
        rows: [{ report_id: 'r1', label: 'Purée', quantity_grams: 150 }],
      };
    }
    if (sql.includes('FROM report_bottle')) {
      return { rows: [{ report_id: 'r1', time: '09:30', quantity_ml: 210 }] };
    }
    if (sql.includes('FROM report_nap')) {
      return {
        rows: [{ report_id: 'r1', start_time: '12:30', end_time: null }],
      };
    }
    if (sql.includes('FROM daily_report r')) {
      return { rows: [reportRow] };
    }
    if (sql.trimStart().startsWith('UPDATE daily_report')) {
      return { rowCount: options.updatedRows ?? 1, rows: [] };
    }
    return { rowCount: 0, rows: [] };
  });
  const client = { query, release: vi.fn() };
  const pool = { query, connect: vi.fn(() => Promise.resolve(client)) };
  return { pool: pool as unknown as Pool, query, client };
}

describe('PostgresDailyReportRepository', () => {
  it('creates missing reports for active children with ON CONFLICT', async () => {
    const { pool, query } = createPoolMock();
    await new PostgresDailyReportRepository(pool).ensureReportsForDate(
      '2026-10-16',
    );
    const [sql, params] = query.mock.calls[0] as unknown as [string, unknown[]];
    expect(sql).toContain('ON CONFLICT (child_id, report_date) DO NOTHING');
    expect(params).toEqual(['2026-10-16']);
  });

  it('maps rows and their meals, bottles and naps to domain models', async () => {
    const { pool } = createPoolMock();
    const [report] = await new PostgresDailyReportRepository(pool).findByDate(
      '2026-10-16',
    );
    expect(report).toMatchObject({
      id: 'r1',
      childFirstName: 'Léa',
      date: '2026-10-16',
      arrivalTime: '08:15',
      meals: [{ label: 'Purée', quantityGrams: 150 }],
      bottles: [{ time: '09:30', quantityMl: 210 }],
      naps: [{ startTime: '12:30', endTime: null }],
    });
  });

  it('replaces the report details inside a transaction', async () => {
    const { pool, query, client } = createPoolMock();
    await new PostgresDailyReportRepository(pool).update('r1', {
      ...EMPTY_REPORT_CONTENT,
      meals: [{ label: 'Compote', quantityGrams: 100 }],
      bottles: [{ time: '10:00', quantityMl: 180 }],
    });
    const statements = query.mock.calls.map(
      ([sql]) => sql.trim().split(/\s+/)[0],
    );
    expect(statements.slice(0, 2)).toEqual(['BEGIN', 'UPDATE']);
    expect(statements).toContain('COMMIT');
    expect(statements.filter((s) => s === 'DELETE')).toHaveLength(3);
    expect(statements.filter((s) => s === 'INSERT')).toHaveLength(2);
    expect(client.release).toHaveBeenCalled();
  });

  it('rolls back and returns null when the report does not exist', async () => {
    const { pool, query } = createPoolMock({ updatedRows: 0 });
    const result = await new PostgresDailyReportRepository(pool).update(
      'missing',
      EMPTY_REPORT_CONTENT,
    );
    expect(result).toBeNull();
    expect(query.mock.calls.map(([sql]) => sql)).toContain('ROLLBACK');
  });
});
