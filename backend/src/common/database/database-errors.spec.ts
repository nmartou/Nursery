import { DrizzleQueryError } from 'drizzle-orm';
import { databaseException } from './database-errors.js';

/** An error of the `pg` driver, wrapped by Drizzle as it does for queries. */
function queryError(code: string, message = 'driver error') {
  return new DrizzleQueryError(
    'insert into "child_absence" ...',
    [],
    Object.assign(new Error(message), { code }),
  );
}

describe('databaseException', () => {
  it.each([
    ['23505', 409, 'database.duplicate'],
    ['23503', 409, 'database.missingReference'],
    ['23514', 400, 'database.invalidValue'],
    ['23502', 400, 'database.invalidValue'],
    ['22P02', 400, 'database.invalidValue'],
    ['22001', 400, 'database.invalidValue'],
    ['22003', 400, 'database.invalidValue'],
    ['22007', 400, 'database.invalidValue'],
    ['22008', 400, 'database.invalidValue'],
  ])('turns SQLSTATE %s into a %i', (code, status, key) => {
    expect(databaseException(queryError(code))).toMatchObject({
      status,
      response: { code: key },
    });
  });

  it.each([
    '08006',
    '08001',
    '57P01',
    '57P03',
    '53300',
    '28P01',
    '3D000',
    'ECONNREFUSED',
    'ENOTFOUND',
    'ETIMEDOUT',
  ])('reports the database as unavailable on %s', (code) => {
    expect(databaseException(queryError(code))).toMatchObject({
      status: 503,
      response: { code: 'database.unavailable' },
    });
  });

  it('recognizes the pool failing to connect, wrapped or not', () => {
    const timeout = new Error('timeout exceeded when trying to connect');
    expect(databaseException(timeout)).toMatchObject({ status: 503 });
    expect(
      databaseException(new DrizzleQueryError('select 1', [], timeout)),
    ).toMatchObject({ status: 503 });
    expect(
      databaseException(new Error('Connection terminated unexpectedly')),
    ).toMatchObject({ status: 503 });
  });

  it('leaves the other errors alone', () => {
    expect(databaseException(queryError('42P01'))).toBeNull();
    expect(databaseException(new TypeError('x is undefined'))).toBeNull();
    expect(databaseException(Object.assign(new Error(), { code: 12 }))).toBeNull();
    expect(databaseException('boom')).toBeNull();
    expect(databaseException(null)).toBeNull();
  });

  it('stops on a cause cycle', () => {
    const error: Error & { cause?: unknown } = new Error('loop');
    error.cause = error;
    expect(databaseException(error)).toBeNull();
  });
});
