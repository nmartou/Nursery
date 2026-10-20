import { BadRequestException } from '@nestjs/common';
import type { ValidationError } from 'class-validator';
import { apiError, type ApiErrorDetail } from '../i18n/api-error.js';
import { isMessageKey } from '../i18n/messages.js';

/**
 * `exceptionFactory` of the ValidationPipe: a 400 `validation.failed` with one
 * message key per failed constraint, translated by the exception filter.
 */
export function validationExceptionFactory(
  errors: ValidationError[],
): BadRequestException {
  return new BadRequestException(
    apiError('validation.failed', undefined, validationDetails(errors)),
  );
}

/**
 * A DTO gives a catalog key as message (`{ message: 'validation.phone' }`);
 * otherwise the constraint is described by `validation.<constraint>` (or
 * `validation.invalid`), with the path of the field (`parents.0.email`) and the
 * number of the constraint when there is one (length, size, minimum).
 */
export function validationDetails(
  errors: ValidationError[],
  parentPath = '',
): ApiErrorDetail[] {
  return errors.flatMap((error) => {
    const field = parentPath ? `${parentPath}.${error.property}` : error.property;
    const own = Object.entries(error.constraints ?? {}).map(
      ([constraint, message]): ApiErrorDetail => {
        if (isMessageKey(message)) {
          return { code: message };
        }
        const key = `validation.${constraint}`;
        const n = /\d+/.exec(message)?.[0];
        return {
          code: isMessageKey(key) ? key : 'validation.invalid',
          params: n === undefined ? { field } : { field, n },
        };
      },
    );
    return [...own, ...validationDetails(error.children ?? [], field)];
  });
}
