import { sql } from 'drizzle-orm';
import { drizzle } from 'drizzle-orm/node-postgres';
import { Pool } from 'pg';
import type { Database } from '../../src/common/database/database.module.js';
import * as schema from '../../src/common/database/schema.js';
import { child, nursery } from '../../src/common/database/schema.js';

export interface TestDatabase {
  db: Database;
  close: () => Promise<void>;
}

/**
 * A Drizzle client on the test database, without the Nest application: for
 * the repository specs (`*.db-spec.ts`). `DB_NAME` is set to the test
 * database by vitest.config.e2e.ts.
 */
export function connectTestDatabase(): TestDatabase {
  const pool = new Pool({
    host: process.env.DB_HOST ?? 'localhost',
    port: Number(process.env.DB_PORT ?? 5432),
    user: process.env.DB_USER ?? 'nursery',
    password: process.env.DB_PASSWORD ?? 'nursery',
    database: process.env.DB_NAME,
  });
  return { db: drizzle(pool, { schema }), close: () => pool.end() };
}

/** Empties every table: children, reports, contacts and absences go with the nursery. */
export async function resetDatabase(db: Database): Promise<void> {
  await db.execute(sql`TRUNCATE nursery, parent, closure CASCADE`);
}

type ChildRow = typeof child.$inferInsert;

/** Inserts a child (and the nursery on first use); returns its id. */
export async function insertChild(
  db: Database,
  overrides: Partial<Omit<ChildRow, 'nurseryId'>> = {},
): Promise<string> {
  let nurseryId = (await db.select({ id: nursery.id }).from(nursery)).at(0)?.id;
  if (nurseryId === undefined) {
    [{ id: nurseryId }] = await db
      .insert(nursery)
      .values({ name: 'Crèche test', address: 'Rue test', capacity: 10 })
      .returning({ id: nursery.id });
  }
  const [{ id }] = await db
    .insert(child)
    .values({
      nurseryId,
      firstName: 'Léa',
      lastName: 'Martin',
      birthDate: '2024-03-12',
      enrollmentStart: '2026-09-01',
      enrollmentEnd: null,
      ...overrides,
    })
    .returning({ id: child.id });
  return id;
}
