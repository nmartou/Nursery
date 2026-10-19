import { registerAs } from '@nestjs/config';

/**
 * `memory` uses the in-memory mock repositories (no database needed).
 * `postgres` uses the PostgreSQL repositories.
 */
export type DatabaseDriver = 'memory' | 'postgres';

export interface DatabaseConfig {
  driver: DatabaseDriver;
  host: string;
  port: number;
  user: string;
  password: string;
  database: string;
}

export const databaseConfig = registerAs('database', (): DatabaseConfig => ({
  driver: process.env.DB_DRIVER === 'postgres' ? 'postgres' : 'memory',
  host: process.env.DB_HOST ?? 'localhost',
  port: Number(process.env.DB_PORT ?? 5432),
  user: process.env.DB_USER ?? 'nursery',
  password: process.env.DB_PASSWORD ?? 'nursery',
  database: process.env.DB_NAME ?? 'nursery',
}));
