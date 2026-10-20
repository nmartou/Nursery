import { HttpErrorResponse } from '@angular/common/http';
import { errorMessage, type ErrorMessageKey } from '../i18n/error-messages';

/** Body of the error responses of the API. */
export interface ApiErrorBody {
  statusCode: number;
  /** Stable identifier of the error, e.g. "absence.overlap". */
  code: string;
  /** Already in the language of the interface (sent as Accept-Language). */
  messages: string[];
}

export function isApiErrorBody(body: unknown): body is ApiErrorBody {
  if (typeof body !== 'object' || body === null) {
    return false;
  }
  const { code, messages } = body as Partial<Record<keyof ApiErrorBody, unknown>>;
  return (
    typeof code === 'string' &&
    Array.isArray(messages) &&
    messages.length > 0 &&
    messages.every((message) => typeof message === 'string')
  );
}

/** The `code` of an API error ("absence.overlap"), or null. */
export function apiErrorCode(error: unknown): string | null {
  return error instanceof HttpErrorResponse && isApiErrorBody(error.error)
    ? error.error.code
    : null;
}

/**
 * What to tell the user when a request failed: the server cannot be reached,
 * or what the API explained, or else `fallback`.
 */
export function httpErrorMessage(error: unknown, fallback: ErrorMessageKey): string {
  if (error instanceof HttpErrorResponse) {
    if (error.status === 0) {
      return errorMessage('api.unreachable');
    }
    if (isApiErrorBody(error.error)) {
      return error.error.messages.join(' ');
    }
  }
  return errorMessage(fallback);
}
