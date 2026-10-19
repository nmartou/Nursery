import { Module } from '@nestjs/common';
import { DailyReportsController } from './controllers/daily-reports.controller.js';
import { DailyReportRepository } from './repositories/daily-report.repository.js';
import { DailyReportsService } from './services/daily-reports.service.js';

@Module({
  controllers: [DailyReportsController],
  providers: [DailyReportsService, DailyReportRepository],
})
export class DailyReportsModule {}
