import { Global, Inject, Module, OnApplicationShutdown } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { drizzle, type NodePgDatabase } from 'drizzle-orm/node-postgres';
import { Pool } from 'pg';
import { DRIZZLE, PG_POOL } from '../constants/injection-tokens.js';
import type { DatabaseConfig } from '../../config/database.config.js';
import * as schema from './schema.js';

/** Drizzle client typed with the whole schema, injected with `@Inject(DRIZZLE)`. */
export type Database = NodePgDatabase<typeof schema>;

/**
 * Exposes the Drizzle client over a shared PostgreSQL connection pool. The
 * pool connects lazily, on the first query, so the app starts even when no
 * database is available.
 */
@Global()
@Module({
  providers: [
    {
      provide: PG_POOL,
      inject: [ConfigService],
      useFactory: (config: ConfigService): Pool => {
        const db = config.getOrThrow<DatabaseConfig>('database');
        return new Pool({
          host: db.host,
          port: db.port,
          user: db.user,
          password: db.password,
          database: db.database,
        });
      },
    },
    {
      provide: DRIZZLE,
      inject: [PG_POOL],
      useFactory: (pool: Pool): Database => drizzle(pool, { schema }),
    },
  ],
  exports: [DRIZZLE],
})
export class DatabaseModule implements OnApplicationShutdown {
  constructor(@Inject(PG_POOL) private readonly pool: Pool) {}

  async onApplicationShutdown(): Promise<void> {
    await this.pool.end();
  }
}
