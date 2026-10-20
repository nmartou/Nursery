import type { MessageKey, MessageParams } from './messages.js';

/** One message to show to the end user, translated by the exception filter. */
export interface ApiErrorDetail {
  code: MessageKey;
  params?: MessageParams;
}

/**
 * Body of the HTTP exceptions raised by the application:
 * `throw new NotFoundException(apiError('child.notFound'))`. `details` holds
 * one entry per message when there are several (validation).
 */
export interface ApiErrorPayload extends ApiErrorDetail {
  details?: ApiErrorDetail[];
}

export function apiError(
  code: MessageKey,
  params?: MessageParams,
  details?: ApiErrorDetail[],
): ApiErrorPayload {
  return { code, params, details };
}
