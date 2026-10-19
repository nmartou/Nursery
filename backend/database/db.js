// Database tooling, run through npm scripts so `.env` is loaded:
//   npm run db:migrate   applies the pending migrations of database/migrations/
//   npm run db:seed      applies the pending migrations, then loads
//                        database/seed.sql into an empty database
// Migrations are generated from src/common/database/schema.ts by `npm run db:generate`.
// This script only depends on drizzle-orm and pg, so it also runs in the
// production image (where drizzle-kit, a dev dependency, is not installed).
import { readFile } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';
import { drizzle } from 'drizzle-orm/node-postgres';
import { migrate as runMigrations } from 'drizzle-orm/node-postgres/migrator';
import pg from 'pg';

const DATABASE_DIR = new URL('./', import.meta.url);

function createClient() {
  const env = process.env;
  return new pg.Client({
    host: env.DB_HOST ?? 'localhost',
    port: Number(env.DB_PORT ?? 5432),
    user: env.DB_USER ?? 'nursery',
    password: env.DB_PASSWORD ?? 'nursery',
    database: env.DB_NAME ?? 'nursery',
  });
}

async function migrate(client) {
  await runMigrations(drizzle(client), {
    migrationsFolder: fileURLToPath(new URL('./migrations', DATABASE_DIR)),
  });
  console.log('✔ Base à jour.');
}

async function seed(client) {
  // The tables must exist: works on a brand-new database too.
  await migrate(client);
  const { rows } = await client.query(
    'SELECT count(*)::int AS count FROM child',
  );
  if (rows[0].count > 0) {
    console.log('La base contient déjà des données : seed ignoré.');
    return;
  }
  // seed.sql manages its own transaction.
  await client.query(await readFile(new URL('seed.sql', DATABASE_DIR), 'utf8'));
  console.log("✔ Données d'exemple chargées.");
}

const commands = { migrate, seed };
const command = commands[process.argv[2]];
if (!command) {
  console.error(
    `Usage: node database/db.js <${Object.keys(commands).join('|')}>`,
  );
  process.exit(1);
}

const client = createClient();
try {
  await client.connect();
  await command(client);
} catch (error) {
  console.error(`✖ ${error.message}`);
  process.exitCode = 1;
} finally {
  await client.end();
}
