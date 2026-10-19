import { and, isNull, lte, gte, or, type SQL } from 'drizzle-orm';
import { child } from './schema.js';

/**
 * SQL condition: the child is enrolled on `date` (`YYYY-MM-DD`), i.e. the day
 * falls within its enrollment period (an open end means "still enrolled").
 * The nursery's closing days (calendar) will be checked here too.
 */
export function isEnrolledOn(date: string): SQL {
  return and(
    lte(child.enrollmentStart, date),
    or(isNull(child.enrollmentEnd), gte(child.enrollmentEnd, date)),
  ) as SQL;
}
