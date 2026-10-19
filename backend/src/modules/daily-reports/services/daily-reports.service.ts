import {
  BadRequestException,
  Inject,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { DAILY_REPORT_REPOSITORY } from '../../../common/constants/injection-tokens.js';
import {
  isWeekday,
  mostRecentWeekday,
} from '../../../common/utils/date.util.js';
import { DailyReportResponseDto } from '../dtos/daily-report-response.dto.js';
import { DailyReportListResponseDto } from '../dtos/daily-report-summary.dto.js';
import { UpdateDailyReportDto } from '../dtos/update-daily-report.dto.js';
import { DailyReportMapper } from '../mappers/daily-report.mapper.js';
import type { DailyReportRepository } from '../repositories/daily-report.repository.js';

@Injectable()
export class DailyReportsService {
  constructor(
    @Inject(DAILY_REPORT_REPOSITORY)
    private readonly repository: DailyReportRepository,
  ) {}

  /** Lists the reports of a weekday, creating the missing ones for every child. */
  async listForDate(
    date: string = mostRecentWeekday(),
  ): Promise<DailyReportListResponseDto> {
    if (!isWeekday(date)) {
      throw new BadRequestException('La crèche est fermée le week-end.');
    }
    await this.repository.ensureReportsForDate(date);
    const reports = await this.repository.findByDate(date);
    return {
      date,
      reports: reports.map((report) => DailyReportMapper.toSummaryDto(report)),
    };
  }

  async getById(id: string): Promise<DailyReportResponseDto> {
    const report = await this.repository.findById(id);
    if (!report) {
      throw new NotFoundException(`Daily report ${id} not found`);
    }
    return DailyReportMapper.toResponseDto(report);
  }

  async update(
    id: string,
    dto: UpdateDailyReportDto,
  ): Promise<DailyReportResponseDto> {
    const report = await this.repository.update(
      id,
      DailyReportMapper.toContent(dto),
    );
    if (!report) {
      throw new NotFoundException(`Daily report ${id} not found`);
    }
    return DailyReportMapper.toResponseDto(report);
  }
}
