import {
  Body,
  Controller,
  Get,
  Param,
  ParseUUIDPipe,
  Put,
  Query,
} from '@nestjs/common';
import { DailyReportQueryDto } from '../dtos/daily-report-query.dto.js';
import { DailyReportResponseDto } from '../dtos/daily-report-response.dto.js';
import { DailyReportListResponseDto } from '../dtos/daily-report-summary.dto.js';
import { UpdateDailyReportDto } from '../dtos/update-daily-report.dto.js';
import { DailyReportsService } from '../services/daily-reports.service.js';

@Controller('daily-reports')
export class DailyReportsController {
  constructor(private readonly dailyReportsService: DailyReportsService) {}

  @Get()
  list(
    @Query() query: DailyReportQueryDto,
  ): Promise<DailyReportListResponseDto> {
    return this.dailyReportsService.listForDate(query.date);
  }

  @Get(':id')
  getById(
    @Param('id', ParseUUIDPipe) id: string,
  ): Promise<DailyReportResponseDto> {
    return this.dailyReportsService.getById(id);
  }

  @Put(':id')
  update(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: UpdateDailyReportDto,
  ): Promise<DailyReportResponseDto> {
    return this.dailyReportsService.update(id, dto);
  }
}
