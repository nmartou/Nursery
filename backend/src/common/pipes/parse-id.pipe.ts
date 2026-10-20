import { BadRequestException, ParseUUIDPipe } from '@nestjs/common';
import { apiError } from '../i18n/api-error.js';

/** Validates the `:id` of a route (a UUID): `@Param('id', ParseIdPipe)`. */
export const ParseIdPipe = new ParseUUIDPipe({
  exceptionFactory: () => new BadRequestException(apiError('request.invalidId')),
});
