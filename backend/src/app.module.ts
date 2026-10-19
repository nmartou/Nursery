import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { DatabaseModule } from './common/database/database.module.js';
import { appConfig } from './config/app.config.js';
import { databaseConfig } from './config/database.config.js';
import { CalendarModule } from './modules/calendar/calendar.module.js';
import { ChildrenModule } from './modules/children/children.module.js';
import { DailyReportsModule } from './modules/daily-reports/daily-reports.module.js';

@Module({
  imports: [
    ConfigModule.forRoot({ isGlobal: true, load: [appConfig, databaseConfig] }),
    DatabaseModule,
    CalendarModule,
    ChildrenModule,
    DailyReportsModule,
  ],
})
export class AppModule {}
