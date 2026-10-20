import {
  type ArgumentsHost,
  BadRequestException,
  ConflictException,
  HttpException,
  Logger,
  NotFoundException,
  ServiceUnavailableException,
} from '@nestjs/common';
import { DrizzleQueryError } from 'drizzle-orm';
import { apiError } from '../i18n/api-error.js';
import { HttpExceptionFilter } from './http-exception.filter.js';

function createHost(acceptLanguage?: string) {
  const response = {
    status: vi.fn(),
    json: vi.fn(),
  };
  response.status.mockReturnValue(response);
  const request = {
    method: 'POST',
    // Routed: the global prefix is gone from `url`.
    url: '/absences',
    originalUrl: '/api/absences',
    headers: { 'accept-language': acceptLanguage },
  };
  const host = {
    switchToHttp: () => ({
      getResponse: () => response,
      getRequest: () => request,
    }),
  } as unknown as ArgumentsHost;
  return { host, response };
}

describe('HttpExceptionFilter', () => {
  const filter = new HttpExceptionFilter();
  let logError: ReturnType<typeof vi.spyOn>;
  let logWarn: ReturnType<typeof vi.spyOn>;

  beforeEach(() => {
    logError = vi
      .spyOn(Logger.prototype, 'error')
      .mockImplementation(() => undefined);
    logWarn = vi
      .spyOn(Logger.prototype, 'warn')
      .mockImplementation(() => undefined);
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  /** Sends the exception through the filter; returns the status and the body. */
  function send(exception: unknown, acceptLanguage?: string) {
    const { host, response } = createHost(acceptLanguage);
    filter.catch(exception, host);
    return {
      status: response.status.mock.calls[0][0] as number,
      body: response.json.mock.calls[0][0] as Record<string, unknown>,
    };
  }

  describe('errors raised by the application', () => {
    const overlap = () => new ConflictException(apiError('absence.overlap'));

    it('answers in the language of the request', () => {
      const { status, body } = send(overlap(), 'fr-FR,fr;q=0.9');

      expect(status).toBe(409);
      expect(body).toEqual({
        statusCode: 409,
        error: 'Conflict',
        code: 'absence.overlap',
        messages: [
          'Une absence est déjà prévue pour cet enfant sur cette période.',
        ],
        path: '/api/absences',
        timestamp: expect.stringMatching(/^\d{4}-\d{2}-\d{2}T/),
      });
      expect(logError).not.toHaveBeenCalled();
    });

    it('answers in English by default', () => {
      expect(send(overlap()).body.messages).toEqual([
        'An absence is already planned for this child over this period.',
      ]);
      expect(send(overlap(), 'de-DE').body.messages).toEqual([
        'An absence is already planned for this child over this period.',
      ]);
    });

    it('sends one message per detail, with its parameters', () => {
      const { body } = send(
        new BadRequestException(
          apiError('validation.failed', undefined, [
            { code: 'validation.isNotEmpty', params: { field: 'label' } },
            { code: 'validation.closureEndBeforeStart' },
          ]),
        ),
        'fr',
      );
      expect(body).toMatchObject({
        statusCode: 400,
        code: 'validation.failed',
        messages: [
          '« label » est obligatoire.',
          'Le dernier jour de fermeture doit suivre le premier.',
        ],
      });
    });

    it('logs the server errors raised on purpose, and keeps their message', () => {
      const { status, body } = send(
        new ServiceUnavailableException(apiError('database.unavailable')),
      );
      expect(status).toBe(503);
      expect(body.code).toBe('database.unavailable');
      expect(logError).toHaveBeenCalled();
    });
  });

  describe('errors raised by Nest or Express', () => {
    it('explains an unknown route', () => {
      const { status, body } = send(
        new NotFoundException('Cannot POST /api/absences'),
        'fr',
      );
      expect(status).toBe(404);
      expect(body).toMatchObject({
        code: 'route.notFound',
        messages: ["Cette adresse n'existe pas : POST /api/absences."],
      });
    });

    it('replaces their English message by a generic one, kept in the logs', () => {
      expect(send(new NotFoundException('Gone')).body).toMatchObject({
        code: 'request.notFound',
        messages: ['This resource does not exist.'],
      });
      expect(send(new HttpException('Too late', 410)).body).toMatchObject({
        error: 'Gone',
        code: 'request.invalid',
      });
      expect(logWarn).toHaveBeenCalledWith(
        'POST /api/absences -> 410: "Too late"',
      );
    });
  });

  describe('database errors', () => {
    const driverError = (code: string) =>
      new DrizzleQueryError(
        'insert into "child_absence" ...',
        [],
        Object.assign(new Error('violates foreign key constraint'), { code }),
      );

    it('answers a conflict, logged as a warning with its cause', () => {
      const { status, body } = send(driverError('23503'), 'fr');

      expect(status).toBe(409);
      expect(body).toMatchObject({
        code: 'database.missingReference',
        messages: [
          "Cette modification concerne des données qui n'existent plus. Rechargez la page.",
        ],
      });
      expect(logError).not.toHaveBeenCalled();
      expect(logWarn).toHaveBeenCalledWith(
        expect.stringContaining(
          'Caused by: Error: violates foreign key constraint',
        ),
      );
    });

    it('reports an unreachable database as a 503, logged as an error', () => {
      const error = driverError('ECONNREFUSED');

      const { status, body } = send(error);

      expect(status).toBe(503);
      expect(body).toMatchObject({
        error: 'Service Unavailable',
        code: 'database.unavailable',
      });
      expect(logError).toHaveBeenCalledWith(
        'POST /api/absences -> 503',
        expect.stringContaining('Failed query'),
      );
    });
  });

  describe('unexpected errors', () => {
    it('hides them from the client and logs their stack', () => {
      const error = new Error('connection refused');

      const { status, body } = send(error, 'fr');

      expect(status).toBe(500);
      expect(body).toMatchObject({
        statusCode: 500,
        error: 'Internal Server Error',
        code: 'server.unexpected',
        messages: ['Une erreur inattendue est survenue. Réessayez plus tard.'],
      });
      expect(JSON.stringify(body)).not.toContain('connection refused');
      expect(logError).toHaveBeenCalledWith(
        'POST /api/absences -> 500',
        error.stack,
      );
    });

    it('logs a thrown value that is not an Error', () => {
      expect(send('boom').status).toBe(500);
      expect(logError).toHaveBeenCalledWith('POST /api/absences -> 500', 'boom');
      send({ reason: 'pool closed' });
      expect(logError).toHaveBeenLastCalledWith(
        'POST /api/absences -> 500',
        '{"reason":"pool closed"}',
      );
    });

    it('logs the message of an error without stack', () => {
      const error = new Error('no stack');
      delete error.stack;
      send(error);
      expect(logError).toHaveBeenCalledWith('POST /api/absences -> 500', 'no stack');
    });

    it('names an unusual status "Error"', () => {
      expect(send(new HttpException('Closed', 499)).body).toMatchObject({
        statusCode: 499,
        error: 'Error',
        code: 'request.invalid',
      });
    });

    it('hides the message of a 5xx raised by Nest', () => {
      expect(send(new HttpException('Pool exhausted', 502)).body).toMatchObject({
        code: 'server.unexpected',
      });
    });
  });
});
