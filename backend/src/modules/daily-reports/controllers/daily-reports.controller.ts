import {
  Body,
  Controller,
  Get,
  Param,
  Put,
  Query,
} from '@nestjs/common';
import { DailyReportQueryDto } from '../dtos/daily-report-query.dto.js';
import { DailyReportResponseDto } from '../dtos/daily-report-response.dto.js';
import { DailyReportStatsResponseDto } from '../dtos/daily-report-stats.dto.js';
import { DailyReportListResponseDto } from '../dtos/daily-report-summary.dto.js';
import { UpdateDailyReportDto } from '../dtos/update-daily-report.dto.js';
import { DailyReportsService } from '../services/daily-reports.service.js';
import { ParseIdPipe } from '../../../common/pipes/parse-id.pipe.js';

@Controller('daily-reports')
export class DailyReportsController {
  constructor(private readonly dailyReportsService: DailyReportsService) {}

  @Get()
  list(
    @Query() query: DailyReportQueryDto,
  ): Promise<DailyReportListResponseDto> {
    return this.dailyReportsService.listForDate(query.date);
  }

  /** Declared before `:id` so that "stats" is not parsed as an id. */
  @Get('stats')
  stats(
    @Query() query: DailyReportQueryDto,
  ): Promise<DailyReportStatsResponseDto> {
    return this.dailyReportsService.statsForDate(query.date);
  }

  @Get(':id')
  getById(
    @Param('id', ParseIdPipe) id: string,
  ): Promise<DailyReportResponseDto> {
    return this.dailyReportsService.getById(id);
  }

  @Put(':id')
  update(
    @Param('id', ParseIdPipe) id: string,
    @Body() dto: UpdateDailyReportDto,
  ): Promise<DailyReportResponseDto> {
    return this.dailyReportsService.update(id, dto);
  }
}
