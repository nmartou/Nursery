import { drizzle } from 'drizzle-orm/node-postgres';
import { Pool } from 'pg';
import {
  connectTestDatabase,
  insertChild,
  resetDatabase,
  type TestDatabase,
} from '../../../test/support/test-db.js';
import type { Database } from './database.module.js';
import { databaseException } from './database-errors.js';
import { childAbsence, dailyReport } from './schema.js';

const UNKNOWN_ID = '00000000-0000-4000-8000-000000000000';

/** The HTTP answer to the error raised by a query, as the filter gives it. */
async function answerTo(query: Promise<unknown>) {
  const error: unknown = await query.then(
    () => {
      throw new Error('The query should have failed');
    },
    (e: unknown) => e,
  );
  const exception = databaseException(error);
  return {
    status: exception?.getStatus(),
    code: (exception?.getResponse() as { code?: string } | undefined)?.code,
  };
}

/** Real PostgreSQL errors, as raised through Drizzle. */
describe('databaseException (test database)', () => {
  let connection: TestDatabase;
  let db: Database;

  beforeAll(() => {
    connection = connectTestDatabase();
    db = connection.db;
  });

  afterAll(() => connection.close());

  beforeEach(() => resetDatabase(db));

  it('answers a duplicate with a 409', async () => {
    const childId = await insertChild(db);
    const report = { childId, reportDate: '2026-10-19' };
    await db.insert(dailyReport).values(report);

    await expect(answerTo(db.insert(dailyReport).values(report))).resolves.toEqual({
      status: 409,
      code: 'database.duplicate',
    });
  });

  it('answers a reference to a deleted row with a 409', async () => {
    await expect(
      answerTo(
        db.insert(childAbsence).values({
          childId: UNKNOWN_ID,
          startDate: '2026-10-19',
          endDate: '2026-10-20',
          kind: 'sickness',
        }),
      ),
    ).resolves.toEqual({ status: 409, code: 'database.missingReference' });
  });

  it('answers a refused value with a 400', async () => {
    const childId = await insertChild(db);
    // Reports are for weekdays only (CHECK constraint).
    await expect(
      answerTo(db.insert(dailyReport).values({ childId, reportDate: '2026-10-17' })),
    ).resolves.toEqual({ status: 400, code: 'database.invalidValue' });
  });

  it('answers an unreachable database with a 503', async () => {
    const pool = new Pool({
      host: '127.0.0.1',
      port: 1,
      connectionTimeoutMillis: 2000,
    });
    try {
      await expect(answerTo(drizzle(pool).execute('select 1'))).resolves.toEqual(
        { status: 503, code: 'database.unavailable' },
      );
    } finally {
      await pool.end();
    }
  });
});
