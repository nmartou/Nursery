import {
  ArgumentsHost,
  Catch,
  ExceptionFilter,
  HttpException,
  HttpStatus,
  Logger,
} from '@nestjs/common';
import type { Request, Response } from 'express';
import { STATUS_CODES } from 'node:http';
import { databaseException } from '../database/database-errors.js';
import type { ApiErrorDetail } from '../i18n/api-error.js';
import {
  isMessageKey,
  languageFrom,
  type MessageKey,
  translate,
} from '../i18n/messages.js';
import { toIsoString } from '../utils/date.util.js';

/** Body of every error response of the API. */
export interface ErrorResponseBody {
  statusCode: number;
  /** HTTP reason phrase, e.g. "Not Found". */
  error: string;
  /** Stable identifier of the error, e.g. "absence.overlap". */
  code: MessageKey;
  /** What went wrong, in the language of the request (never empty). */
  messages: string[];
  path: string;
  timestamp: string;
}

interface ErrorDescription {
  status: number;
  error: string;
  code: MessageKey;
  details: ApiErrorDetail[];
}

/**
 * Turns any exception into an `ErrorResponseBody` whose messages are written
 * in the language asked by `Accept-Language` (English by default). Server
 * errors are logged with their stack; their details never reach the client.
 */
@Catch()
export class HttpExceptionFilter implements ExceptionFilter {
  private readonly logger = new Logger(HttpExceptionFilter.name);

  catch(exception: unknown, host: ArgumentsHost): void {
    const ctx = host.switchToHttp();
    const response = ctx.getResponse<Response>();
    const request = ctx.getRequest<Request>();
    // `url` loses the global prefix once routed: report the requested one.
    const path = request.originalUrl;

    const { status, error, code, details } = this.describe(exception, request);
    if (status >= 500) {
      this.logger.error(`${request.method} ${path} -> ${status}`, trace(exception));
    }

    const language = languageFrom(request.headers['accept-language']);
    const body: ErrorResponseBody = {
      statusCode: status,
      error,
      code,
      messages: details.map((detail) =>
        translate(language, detail.code, detail.params),
      ),
      path,
      timestamp: toIsoString(new Date()),
    };
    response.status(status).json(body);
  }

  private describe(exception: unknown, request: Request): ErrorDescription {
    if (!(exception instanceof HttpException)) {
      // A database error is answered as such (409, 400, 503).
      const translated = databaseException(exception);
      if (!translated) {
        return unexpected();
      }
      if (translated.getStatus() < 500) {
        this.logger.warn(
          `${request.method} ${request.originalUrl} -> ${translated.getStatus()}: ${trace(exception)}`,
        );
      }
      return this.describe(translated, request);
    }
    const status = exception.getStatus();
    const body = exception.getResponse() as
      | string
      | {
          code?: unknown;
          params?: ApiErrorDetail['params'];
          details?: unknown;
          message?: unknown;
        };
    const error = STATUS_CODES[status] ?? 'Error';

    // Raised by the application, with a message key.
    if (typeof body === 'object' && isMessageKey(body.code)) {
      const details =
        Array.isArray(body.details) && body.details.length > 0
          ? (body.details as ApiErrorDetail[])
          : [{ code: body.code, params: body.params }];
      return { status, error, code: body.code, details };
    }

    // Raised by Nest or Express, in English: keep it in the logs only.
    const message = typeof body === 'string' ? body : body.message;
    if (status < 500) {
      this.logger.warn(
        `${request.method} ${request.originalUrl} -> ${status}: ${JSON.stringify(message)}`,
      );
    }
    const code = genericCode(status, message);
    const params =
      code === 'route.notFound'
        ? { method: request.method, path: request.originalUrl }
        : undefined;
    return { status, error, code, details: [{ code, params }] };
  }
}

/** Stack of an error and of its causes (Drizzle wraps the driver's error). */
function trace(exception: unknown): string {
  const lines: string[] = [];
  for (
    let current: unknown = exception, depth = 0;
    current !== undefined && depth < 5;
    current = current instanceof Error ? current.cause : undefined, depth++
  ) {
    const text =
      current instanceof Error
        ? (current.stack ?? current.message)
        : typeof current === 'string'
          ? current
          : JSON.stringify(current);
    lines.push(depth === 0 ? text : `Caused by: ${text}`);
  }
  return lines.join('\n');
}

function unexpected(): ErrorDescription {
  return {
    status: HttpStatus.INTERNAL_SERVER_ERROR,
    error: 'Internal Server Error',
    code: 'server.unexpected',
    details: [{ code: 'server.unexpected' }],
  };
}

function genericCode(status: number, message: unknown): MessageKey {
  if (status >= 500) {
    return 'server.unexpected';
  }
  if (status === 404) {
    // Nest's router: "Cannot GET /api/unknown".
    return typeof message === 'string' && message.startsWith('Cannot ')
      ? 'route.notFound'
      : 'request.notFound';
  }
  return 'request.invalid';
}
