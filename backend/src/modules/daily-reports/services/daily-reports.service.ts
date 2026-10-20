import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import {
  isWeekday,
  mostRecentWeekday,
} from '../../../common/utils/date.util.js';
import { DailyReportResponseDto } from '../dtos/daily-report-response.dto.js';
import { DailyReportStatsResponseDto } from '../dtos/daily-report-stats.dto.js';
import { DailyReportListResponseDto } from '../dtos/daily-report-summary.dto.js';
import { UpdateDailyReportDto } from '../dtos/update-daily-report.dto.js';
import { DailyReportMapper } from '../mappers/daily-report.mapper.js';
import type { ReportStatus } from '../models/daily-report.model.js';
import { DailyReportRepository } from '../repositories/daily-report.repository.js';

const REPORT_NOT_FOUND = "Ce rapport n'existe pas.";

@Injectable()
export class DailyReportsService {
  constructor(private readonly repository: DailyReportRepository) {}

  /**
   * Lists the reports of a weekday, creating the missing ones for every child
   * enrolled that day. A closed day (public holiday, closure) has no reports.
   */
  async listForDate(
    date: string = mostRecentWeekday(),
  ): Promise<DailyReportListResponseDto> {
    if (!isWeekday(date)) {
      throw new BadRequestException('La crèche est fermée le week-end.');
    }
    const closure = await this.repository.closureOn(date);
    if (closure) {
      return { date, closure, reports: [] };
    }
    await this.repository.ensureReportsForDate(date);
    const reports = await this.repository.findByDate(date);
    return {
      date,
      closure: null,
      reports: reports.map((report) => DailyReportMapper.toSummaryDto(report)),
    };
  }

  /** Counts the reports of a weekday by status (missing reports are created first). */
  async statsForDate(date?: string): Promise<DailyReportStatsResponseDto> {
    const list = await this.listForDate(date);
    const byStatus: Record<ReportStatus, number> = {
      todo: 0,
      in_progress: 0,
      complete: 0,
      absent: 0,
    };
    for (const report of list.reports) {
      byStatus[report.status]++;
    }
    return {
      date: list.date,
      closure: list.closure,
      total: list.reports.length,
      byStatus,
    };
  }

  async getById(id: string): Promise<DailyReportResponseDto> {
    const report = await this.repository.findById(id);
    if (!report) {
      throw new NotFoundException(REPORT_NOT_FOUND);
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
      throw new NotFoundException(REPORT_NOT_FOUND);
    }
    return DailyReportMapper.toResponseDto(report);
  }
}
