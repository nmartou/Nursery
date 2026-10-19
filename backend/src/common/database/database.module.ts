import { Global, Inject, Module, OnApplicationShutdown } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { Pool } from 'pg';
import { PG_POOL } from '../constants/injection-tokens.js';
import type { DatabaseConfig } from '../../config/database.config.js';

/**
 * Exposes a shared PostgreSQL connection pool. The pool connects lazily, on
 * the first query, so the app starts even when no database is available.
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
  ],
  exports: [PG_POOL],
})
export class DatabaseModule implements OnApplicationShutdown {
  constructor(@Inject(PG_POOL) private readonly pool: Pool) {}

  async onApplicationShutdown(): Promise<void> {
    await this.pool.end();
  }
}
