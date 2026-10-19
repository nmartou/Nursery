import type { INestApplication } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { Test } from '@nestjs/testing';
import { sql } from 'drizzle-orm';
import { AppModule } from '../../src/app.module.js';
import { setupApp } from '../../src/app.setup.js';
import { DRIZZLE } from '../../src/common/constants/injection-tokens.js';
import type { Database } from '../../src/common/database/database.module.js';
import type { AppConfig } from '../../src/config/app.config.js';

export interface TestApp {
  app: INestApplication;
  db: Database;
}

/** The real application (same HTTP setup as main.ts) on an empty test database. */
export async function createTestApp(): Promise<TestApp> {
  const moduleFixture = await Test.createTestingModule({
    imports: [AppModule],
  }).compile();

  const app = moduleFixture.createNestApplication();
  setupApp(app, app.get(ConfigService).getOrThrow<AppConfig>('app'));
  await app.init();

  const db = app.get<Database>(DRIZZLE);
  // Children (and their reports, contacts, absences) go with the nursery.
  await db.execute(sql`TRUNCATE nursery, parent, closure CASCADE`);
  return { app, db };
}
