import {
  IsDateString,
  IsIn,
  IsOptional,
  IsString,
  IsUUID,
  MaxLength,
} from 'class-validator';
import { IsOnOrAfter } from '../../../common/validation/is-on-or-after.decorator.js';
import { Trim } from '../../../common/validation/trim.decorator.js';
import type { AbsenceKind } from '../models/calendar.model.js';

const ABSENCE_KINDS: AbsenceKind[] = ['vacation', 'sickness', 'other'];

/** Body of `POST /absences` and `PUT /absences/:id`. */
export class SaveAbsenceDto {
  @IsUUID()
  childId: string;

  @IsDateString({ strict: true })
  startDate: string;

  @IsDateString({ strict: true })
  @IsOnOrAfter('startDate', {
    message: "Le dernier jour d'absence doit suivre le premier.",
  })
  endDate: string;

  @IsIn(ABSENCE_KINDS)
  kind: AbsenceKind;

  @Trim()
  @IsOptional()
  @IsString()
  @MaxLength(500)
  comment: string | null;
}
