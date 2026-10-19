import {
  Body,
  Controller,
  Delete,
  Get,
  HttpCode,
  Param,
  ParseUUIDPipe,
  Post,
  Put,
  Query,
} from '@nestjs/common';
import { CalendarQueryDto } from '../dtos/calendar-query.dto.js';
import {
  AbsenceResponseDto,
  CalendarResponseDto,
  ClosureResponseDto,
} from '../dtos/calendar-response.dto.js';
import { SaveAbsenceDto } from '../dtos/save-absence.dto.js';
import { SaveClosureDto } from '../dtos/save-closure.dto.js';
import { CalendarService } from '../services/calendar.service.js';

/** Routes of the calendar and of the two kinds of events it lets the staff edit. */
@Controller()
export class CalendarController {
  constructor(private readonly calendarService: CalendarService) {}

  @Get('calendar')
  events(@Query() query: CalendarQueryDto): Promise<CalendarResponseDto> {
    return this.calendarService.events(query.from, query.to);
  }

  @Post('closures')
  createClosure(@Body() dto: SaveClosureDto): Promise<ClosureResponseDto> {
    return this.calendarService.createClosure(dto);
  }

  @Put('closures/:id')
  updateClosure(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: SaveClosureDto,
  ): Promise<ClosureResponseDto> {
    return this.calendarService.updateClosure(id, dto);
  }

  @Delete('closures/:id')
  @HttpCode(204)
  deleteClosure(@Param('id', ParseUUIDPipe) id: string): Promise<void> {
    return this.calendarService.deleteClosure(id);
  }

  @Post('absences')
  createAbsence(@Body() dto: SaveAbsenceDto): Promise<AbsenceResponseDto> {
    return this.calendarService.createAbsence(dto);
  }

  @Put('absences/:id')
  updateAbsence(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: SaveAbsenceDto,
  ): Promise<AbsenceResponseDto> {
    return this.calendarService.updateAbsence(id, dto);
  }

  @Delete('absences/:id')
  @HttpCode(204)
  deleteAbsence(@Param('id', ParseUUIDPipe) id: string): Promise<void> {
    return this.calendarService.deleteAbsence(id);
  }
}
