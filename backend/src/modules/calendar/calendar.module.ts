import { Module } from '@nestjs/common';
import { CalendarController } from './controllers/calendar.controller.js';
import { CalendarRepository } from './repositories/calendar.repository.js';
import { CalendarService } from './services/calendar.service.js';

@Module({
  controllers: [CalendarController],
  providers: [CalendarService, CalendarRepository],
})
export class CalendarModule {}
