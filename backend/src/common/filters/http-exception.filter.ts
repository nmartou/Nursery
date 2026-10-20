import {
  ArgumentsHost,
  Catch,
  ExceptionFilter,
  HttpException,
  HttpStatus,
  Logger,
} from '@nestjs/common';
import type { Request, Response } from 'express';
import { toIsoString } from '../utils/date.util.js';

/** Body of every error response of the API. */
export interface ErrorResponseBody {
  statusCode: number;
  /** HTTP reason phrase, e.g. "Not Found". */
  error: string;
  /** What went wrong, in French, ready to be shown (never empty). */
  messages: string[];
  path: string;
  timestamp: string;
}

const UNEXPECTED_ERROR = 'Une erreur inattendue est survenue. Réessayez plus tard.';

@Catch()
export class HttpExceptionFilter implements ExceptionFilter {
  private readonly logger = new Logger(HttpExceptionFilter.name);

  catch(exception: unknown, host: ArgumentsHost): void {
    const ctx = host.switchToHttp();
    const response = ctx.getResponse<Response>();
    const request = ctx.getRequest<Request>();

    const { status, error, messages } = describe(exception);

    // Server errors are hidden from the client: keep their details in the logs.
    if (status >= 500) {
      this.logger.error(
        `${request.method} ${request.url} -> ${status}`,
        exception instanceof Error ? exception.stack : String(exception),
      );
    }

    const body: ErrorResponseBody = {
      statusCode: status,
      error,
      messages,
      path: request.url,
      timestamp: toIsoString(new Date()),
    };
    response.status(status).json(body);
  }
}

function describe(
  exception: unknown,
): Pick<ErrorResponseBody, 'error' | 'messages'> & { status: number } {
  if (!(exception instanceof HttpException)) {
    return {
      status: HttpStatus.INTERNAL_SERVER_ERROR,
      error: 'Internal Server Error',
      messages: [UNEXPECTED_ERROR],
    };
  }
  const status = exception.getStatus();
  const body = exception.getResponse();
  const { message, error } =
    typeof body === 'string'
      ? { message: body, error: undefined }
      : (body as { message?: unknown; error?: unknown });
  return {
    status,
    error: typeof error === 'string' ? error : String(HttpStatus[status]),
    messages: toMessages(message),
  };
}

function toMessages(message: unknown): string[] {
  const messages = (Array.isArray(message) ? message : [message]).filter(
    (m): m is string => typeof m === 'string' && m !== '',
  );
  return messages.length > 0 ? messages : ['La requête a été refusée.'];
}
