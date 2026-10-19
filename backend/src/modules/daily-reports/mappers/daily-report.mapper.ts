import { toIsoString } from '../../../common/utils/date.util.js';
import type { DailyReportResponseDto } from '../dtos/daily-report-response.dto.js';
import type { DailyReportSummaryDto } from '../dtos/daily-report-summary.dto.js';
import type { UpdateDailyReportDto } from '../dtos/update-daily-report.dto.js';
import type {
  DailyReport,
  DailyReportContent,
} from '../models/daily-report.model.js';
import { computeReportStatus } from '../utils/report-status.util.js';

export class DailyReportMapper {
  static toResponseDto(report: DailyReport): DailyReportResponseDto {
    return {
      id: report.id,
      childId: report.childId,
      childFirstName: report.childFirstName,
      childLastName: report.childLastName,
      date: report.date,
      status: computeReportStatus(report),
      absent: report.absent,
      absenceComment: report.absenceComment,
      arrivalTime: report.arrivalTime,
      departureTime: report.departureTime,
      meals: report.meals.map((meal) => ({ ...meal })),
      bottles: report.bottles.map((bottle) => ({ ...bottle })),
      mealComment: report.mealComment,
      naps: report.naps.map((nap) => ({ ...nap })),
      noNap: report.noNap,
      napComment: report.napComment,
      stoolStatus: report.stoolStatus,
      stoolComment: report.stoolComment,
      parentNote: report.parentNote,
      updatedAt: toIsoString(report.updatedAt),
    };
  }

  static toSummaryDto(report: DailyReport): DailyReportSummaryDto {
    return {
      id: report.id,
      childId: report.childId,
      childFirstName: report.childFirstName,
      childLastName: report.childLastName,
      status: computeReportStatus(report),
      updatedAt: toIsoString(report.updatedAt),
    };
  }

  /** Normalizes the payload: empty strings become null, stool comment is dropped when normal. */
  static toContent(dto: UpdateDailyReportDto): DailyReportContent {
    return {
      absent: dto.absent,
      absenceComment: emptyToNull(dto.absenceComment),
      arrivalTime: emptyToNull(dto.arrivalTime),
      departureTime: emptyToNull(dto.departureTime),
      meals: dto.meals.map((meal) => ({
        label: meal.label.trim(),
        quantityGrams: meal.quantityGrams ?? null,
      })),
      bottles: dto.bottles.map((bottle) => ({
        time: bottle.time,
        quantityMl: bottle.quantityMl ?? null,
      })),
      mealComment: emptyToNull(dto.mealComment),
      naps: dto.naps.map((nap) => ({
        startTime: nap.startTime,
        endTime: emptyToNull(nap.endTime),
      })),
      noNap: dto.noNap,
      napComment: emptyToNull(dto.napComment),
      stoolStatus: dto.stoolStatus,
      stoolComment:
        dto.stoolStatus === 'other' ? emptyToNull(dto.stoolComment) : null,
      parentNote: emptyToNull(dto.parentNote),
    };
  }
}

function emptyToNull(value: string | null | undefined): string | null {
  const trimmed = value?.trim();
  return trimmed ? trimmed : null;
}
