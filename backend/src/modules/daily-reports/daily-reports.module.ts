import { Module } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import type { Pool } from 'pg';
import {
  DAILY_REPORT_REPOSITORY,
  PG_POOL,
} from '../../common/constants/injection-tokens.js';
import type { DatabaseConfig } from '../../config/database.config.js';
import { DailyReportsController } from './controllers/daily-reports.controller.js';
import { DailyReportRepository } from './repositories/daily-report.repository.js';
import { InMemoryDailyReportRepository } from './repositories/in-memory-daily-report.repository.js';
import { PostgresDailyReportRepository } from './repositories/postgres-daily-report.repository.js';
import { DailyReportsService } from './services/daily-reports.service.js';

@Module({
  controllers: [DailyReportsController],
  providers: [
    DailyReportsService,
    {
      provide: DAILY_REPORT_REPOSITORY,
      inject: [ConfigService, PG_POOL],
      useFactory: (config: ConfigService, pool: Pool): DailyReportRepository =>
        config.getOrThrow<DatabaseConfig>('database').driver === 'postgres'
          ? new PostgresDailyReportRepository(pool)
          : new InMemoryDailyReportRepository(),
    },
  ],
})
export class DailyReportsModule {}
