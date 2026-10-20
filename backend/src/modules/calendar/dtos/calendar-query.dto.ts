import type { MessageKey } from '../../../common/i18n/messages.js';
import { IsDateString } from 'class-validator';
import { IsOnOrAfter } from '../../../common/validation/is-on-or-after.decorator.js';

/** `GET /calendar?from&to`, bounds included. */
export class CalendarQueryDto {
  @IsDateString({ strict: true })
  from: string;

  @IsDateString({ strict: true })
  @IsOnOrAfter('from', {
    message: 'validation.periodEndBeforeStart' satisfies MessageKey,
  })
  to: string;
}
