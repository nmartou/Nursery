import { Type } from 'class-transformer';
import {
  IsArray,
  IsBoolean,
  IsIn,
  IsInt,
  IsNotEmpty,
  IsOptional,
  IsString,
  Matches,
  MaxLength,
  Min,
  ValidateIf,
  ValidateNested,
} from 'class-validator';
import type { StoolStatus } from '../models/daily-report.model.js';

const TIME_PATTERN = /^([01]\d|2[0-3]):[0-5]\d$/;
const TIME_MESSAGE = '$property must be a time formatted as HH:mm';

export class MealDto {
  @IsString()
  @IsNotEmpty()
  @MaxLength(100)
  label: string;

  @IsOptional()
  @IsInt()
  @Min(0)
  quantityGrams: number | null;
}

export class BottleDto {
  @Matches(TIME_PATTERN, { message: TIME_MESSAGE })
  time: string;

  @IsOptional()
  @IsInt()
  @Min(0)
  quantityMl: number | null;
}

export class NapDto {
  @Matches(TIME_PATTERN, { message: TIME_MESSAGE })
  startTime: string;

  @IsOptional()
  @Matches(TIME_PATTERN, { message: TIME_MESSAGE })
  endTime: string | null;
}

export class UpdateDailyReportDto {
  @IsBoolean()
  absent: boolean;

  @IsOptional()
  @IsString()
  @MaxLength(500)
  absenceComment: string | null;

  @IsOptional()
  @Matches(TIME_PATTERN, { message: TIME_MESSAGE })
  arrivalTime: string | null;

  @IsOptional()
  @Matches(TIME_PATTERN, { message: TIME_MESSAGE })
  departureTime: string | null;

  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => MealDto)
  meals: MealDto[];

  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => BottleDto)
  bottles: BottleDto[];

  @IsOptional()
  @IsString()
  @MaxLength(500)
  mealComment: string | null;

  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => NapDto)
  naps: NapDto[];

  @IsBoolean()
  noNap: boolean;

  @IsOptional()
  @IsString()
  @MaxLength(500)
  napComment: string | null;

  @IsIn(['normal', 'other'])
  stoolStatus: StoolStatus;

  /** Required when stools are not normal. */
  @ValidateIf((dto: UpdateDailyReportDto) => dto.stoolStatus === 'other')
  @IsString()
  @IsNotEmpty({
    message: 'stoolComment is required when stoolStatus is "other"',
  })
  @MaxLength(500)
  stoolComment: string | null;

  @IsOptional()
  @IsString()
  @MaxLength(1000)
  parentNote: string | null;
}
