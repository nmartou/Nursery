import {
  BadRequestException,
  type HttpException,
  PayloadTooLargeException,
  UnsupportedMediaTypeException,
} from '@nestjs/common';
import type { ErrorRequestHandler } from 'express';
import { apiError } from '../i18n/api-error.js';

/**
 * The HTTP exception matching an error of the body parser (it sets `type`),
 * or null for any other error.
 */
export function bodyParserException(error: unknown): HttpException | null {
  const type =
    typeof error === 'object' && error !== null && 'type' in error
      ? error.type
      : undefined;
  switch (type) {
    case 'entity.parse.failed':
      return new BadRequestException(apiError('body.invalidJson'));
    case 'entity.too.large':
      return new PayloadTooLargeException(apiError('body.tooLarge'));
    case 'encoding.unsupported':
    case 'charset.unsupported':
      return new UnsupportedMediaTypeException(
        apiError('body.unsupportedEncoding'),
      );
    default:
      return null;
  }
}

/**
 * Express error middleware placed right after the body parsers: their errors
 * reach the exception filter as localized HTTP exceptions.
 */
export const bodyParserErrorHandler: ErrorRequestHandler = (
  error,
  _request,
  _response,
  next,
) => {
  next(bodyParserException(error) ?? error);
};
