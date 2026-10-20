import type { NestExpressApplication } from '@nestjs/platform-express';
import { ConfigService } from '@nestjs/config';
import { Test } from '@nestjs/testing';
import { AppModule } from '../../src/app.module.js';
import { setupApp } from '../../src/app.setup.js';
import { DRIZZLE } from '../../src/common/constants/injection-tokens.js';
import type { Database } from '../../src/common/database/database.module.js';
import type { AppConfig } from '../../src/config/app.config.js';
import { resetDatabase } from './test-db.js';

export interface TestApp {
  app: NestExpressApplication;
  db: Database;
}

/** The real application (same HTTP setup as main.ts) on an empty test database. */
export async function createTestApp(): Promise<TestApp> {
  const moduleFixture = await Test.createTestingModule({
    imports: [AppModule],
  }).compile();

  const app = moduleFixture.createNestApplication<NestExpressApplication>({
    bodyParser: false,
  });
  setupApp(app, app.get(ConfigService).getOrThrow<AppConfig>('app'));
  await app.init();

  const db = app.get<Database>(DRIZZLE);
  await resetDatabase(db);
  return { app, db };
}
