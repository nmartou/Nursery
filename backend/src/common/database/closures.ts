import { and, asc, gte, lte } from 'drizzle-orm';
import { publicHolidayOn } from '../utils/public-holidays.util.js';
import type { Database } from './database.module.js';
import { closure } from './schema.js';

/**
 * Why the nursery is closed on `date` (`YYYY-MM-DD`): a public holiday or a
 * closure period of the nursery; null on an open day. Weekends are handled by
 * the callers (they are never open).
 */
export async function closureOn(
  db: Database,
  date: string,
): Promise<string | null> {
  const holiday = publicHolidayOn(date);
  if (holiday) {
    return holiday;
  }
  const found = (
    await db
      .select({ label: closure.label })
      .from(closure)
      .where(and(lte(closure.startDate, date), gte(closure.endDate, date)))
      .orderBy(asc(closure.startDate))
      .limit(1)
  ).at(0);
  return found?.label ?? null;
}
