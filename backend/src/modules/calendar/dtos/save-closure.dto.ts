import { IsDateString, IsNotEmpty, IsString, MaxLength } from 'class-validator';
import { IsOnOrAfter } from '../../../common/validation/is-on-or-after.decorator.js';
import { Trim } from '../../../common/validation/trim.decorator.js';

/** Body of `POST /closures` and `PUT /closures/:id`. */
export class SaveClosureDto {
  @IsDateString({ strict: true })
  startDate: string;

  @IsDateString({ strict: true })
  @IsOnOrAfter('startDate', {
    message: 'Le dernier jour de fermeture doit suivre le premier.',
  })
  endDate: string;

  /** e.g. "Vacances de Noël", "Pont de l'Ascension" */
  @Trim()
  @IsString()
  @IsNotEmpty()
  @MaxLength(100)
  label: string;
}
