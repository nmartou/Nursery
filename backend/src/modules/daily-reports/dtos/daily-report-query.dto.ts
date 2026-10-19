import { IsDateString, IsOptional } from 'class-validator';

export class DailyReportQueryDto {
  /** `YYYY-MM-DD`; defaults to the most recent weekday. */
  @IsOptional()
  @IsDateString({ strict: true })
  date?: string;
}
