import { drizzle } from 'drizzle-orm/node-postgres';
import { migrate } from 'drizzle-orm/node-postgres/migrator';
import { Client } from 'pg';

/**
 * The e2e tests run against a dedicated database (`DB_TEST_NAME`, by default
 * `<DB_NAME>_test`) with the same credentials as the application, so they
 * never touch the development data.
 */
export function testDatabaseName(): string {
  return process.env.DB_TEST_NAME ?? `${process.env.DB_NAME ?? 'nursery'}_test`;
}

function connectionTo(database: string): Client {
  return new Client({
    host: process.env.DB_HOST ?? 'localhost',
    port: Number(process.env.DB_PORT ?? 5432),
    user: process.env.DB_USER ?? 'nursery',
    password: process.env.DB_PASSWORD ?? 'nursery',
    database,
  });
}

/** Vitest global setup: creates the test database if needed and migrates it. */
export default async function setup(): Promise<void> {
  const name = testDatabaseName();

  const admin = connectionTo(process.env.DB_NAME ?? 'nursery');
  await admin.connect();
  try {
    const { rowCount } = await admin.query(
      'SELECT 1 FROM pg_database WHERE datname = $1',
      [name],
    );
    if (rowCount === 0) {
      // Identifiers cannot be bound as parameters.
      await admin.query(`CREATE DATABASE "${name.replaceAll('"', '""')}"`);
    }
  } finally {
    await admin.end();
  }

  const client = connectionTo(name);
  await client.connect();
  try {
    await migrate(drizzle(client), {
      migrationsFolder: './database/migrations',
    });
  } finally {
    await client.end();
  }
}
