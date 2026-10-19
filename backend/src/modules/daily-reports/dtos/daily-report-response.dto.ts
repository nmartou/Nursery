import type {
  ReportStatus,
  StoolStatus,
} from '../models/daily-report.model.js';

export class MealResponseDto {
  label: string;
  quantityGrams: number | null;
}

export class BottleResponseDto {
  time: string;
  quantityMl: number | null;
}

export class NapResponseDto {
  startTime: string;
  endTime: string | null;
}

export class DailyReportResponseDto {
  id: string;
  childId: string;
  childFirstName: string;
  childLastName: string;
  date: string;
  status: ReportStatus;
  absent: boolean;
  absenceComment: string | null;
  arrivalTime: string | null;
  departureTime: string | null;
  meals: MealResponseDto[];
  bottles: BottleResponseDto[];
  mealComment: string | null;
  naps: NapResponseDto[];
  noNap: boolean;
  napComment: string | null;
  stoolStatus: StoolStatus;
  stoolComment: string | null;
  parentNote: string | null;
  updatedAt: string;
}
