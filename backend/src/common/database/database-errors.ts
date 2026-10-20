import {
  BadRequestException,
  ConflictException,
  type HttpException,
  ServiceUnavailableException,
} from '@nestjs/common';
import { apiError } from '../i18n/api-error.js';

/** SQLSTATE codes of PostgreSQL turned into a client error. */
const CLIENT_ERRORS: Record<string, () => HttpException> = {
  // unique_violation: two concurrent requests saving the same thing.
  '23505': () => new ConflictException(apiError('database.duplicate')),
  // foreign_key_violation: the referenced row was deleted meanwhile.
  '23503': () => new ConflictException(apiError('database.missingReference')),
  // check_violation, not_null_violation, invalid values.
  '23514': () => new BadRequestException(apiError('database.invalidValue')),
  '23502': () => new BadRequestException(apiError('database.invalidValue')),
  '22P02': () => new BadRequestException(apiError('database.invalidValue')),
  '22001': () => new BadRequestException(apiError('database.invalidValue')),
  '22003': () => new BadRequestException(apiError('database.invalidValue')),
  '22007': () => new BadRequestException(apiError('database.invalidValue')),
  '22008': () => new BadRequestException(apiError('database.invalidValue')),
};

/**
 * Errors meaning that the database cannot be reached: PostgreSQL connection
 * exceptions (class 08), shutdown, too many connections, refused credentials
 * or missing database, and the network errors of the driver.
 */
function isUnavailable(code: string): boolean {
  return (
    code.startsWith('08') ||
    ['57P01', '57P02', '57P03', '53300', '28000', '28P01', '3D000'].includes(
      code,
    ) ||
    ['ECONNREFUSED', 'ECONNRESET', 'ENOTFOUND', 'ETIMEDOUT', 'EAI_AGAIN'].includes(
      code,
    )
  );
}

/** Messages of the `pg` pool when no connection can be opened. */
const CONNECTION_MESSAGES = [
  'timeout exceeded when trying to connect',
  'Connection terminated',
];

/**
 * The HTTP exception matching an error of the database driver, or null when
 * the error does not come from it. Drizzle wraps the driver's error in
 * `cause`: the whole chain is searched.
 */
export function databaseException(error: unknown): HttpException | null {
  for (
    let current: unknown = error, depth = 0;
    typeof current === 'object' && current !== null && depth < 5;
    current = (current as { cause?: unknown }).cause, depth++
  ) {
    const { code, message } = current as { code?: unknown; message?: unknown };
    if (typeof code === 'string') {
      if (code in CLIENT_ERRORS) {
        return CLIENT_ERRORS[code]();
      }
      if (isUnavailable(code)) {
        return unavailable();
      }
    }
    if (
      typeof message === 'string' &&
      CONNECTION_MESSAGES.some((m) => message.includes(m))
    ) {
      return unavailable();
    }
  }
  return null;
}

function unavailable(): HttpException {
  return new ServiceUnavailableException(apiError('database.unavailable'));
}
