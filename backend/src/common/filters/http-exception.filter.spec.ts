import {
  type ArgumentsHost,
  BadRequestException,
  HttpException,
  Logger,
  NotFoundException,
  ServiceUnavailableException,
} from '@nestjs/common';
import { HttpExceptionFilter } from './http-exception.filter.js';

function createHost() {
  const response = {
    status: vi.fn(),
    json: vi.fn(),
  };
  response.status.mockReturnValue(response);
  const host = {
    switchToHttp: () => ({
      getResponse: () => response,
      getRequest: () => ({ method: 'GET', url: '/api/children/c1' }),
    }),
  } as unknown as ArgumentsHost;
  return { host, response };
}

describe('HttpExceptionFilter', () => {
  const filter = new HttpExceptionFilter();
  let logError: ReturnType<typeof vi.spyOn>;

  beforeEach(() => {
    logError = vi
      .spyOn(Logger.prototype, 'error')
      .mockImplementation(() => undefined);
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  /** Sends the exception through the filter; returns the status and the body. */
  function send(exception: unknown) {
    const { host, response } = createHost();
    filter.catch(exception, host);
    return {
      status: response.status.mock.calls[0][0] as number,
      body: response.json.mock.calls[0][0] as Record<string, unknown>,
    };
  }

  it('sends the status and the message of an HTTP exception, flattened', () => {
    const { status, body } = send(
      new NotFoundException("Cet enfant n'existe pas."),
    );

    expect(status).toBe(404);
    expect(body).toEqual({
      statusCode: 404,
      error: 'Not Found',
      messages: ["Cet enfant n'existe pas."],
      path: '/api/children/c1',
      timestamp: expect.stringMatching(/^\d{4}-\d{2}-\d{2}T/),
    });
    expect(logError).not.toHaveBeenCalled();
  });

  it('sends every validation message', () => {
    const { body } = send(
      new BadRequestException(['Prénom obligatoire.', 'E-mail invalide.']),
    );
    expect(body).toMatchObject({
      statusCode: 400,
      error: 'Bad Request',
      messages: ['Prénom obligatoire.', 'E-mail invalide.'],
    });
  });

  it('accepts an exception built from a plain string', () => {
    const { status, body } = send(new HttpException('Trop tard.', 410));
    expect(status).toBe(410);
    expect(body).toMatchObject({ error: 'GONE', messages: ['Trop tard.'] });
  });

  it('falls back to a generic message when the exception has none', () => {
    const { body } = send(new BadRequestException({ message: '' }));
    expect(body.messages).toEqual(['La requête a été refusée.']);
  });

  it('hides an unexpected error from the client and logs its stack', () => {
    const error = new Error('connection refused');

    const { status, body } = send(error);

    expect(status).toBe(500);
    expect(body).toMatchObject({
      statusCode: 500,
      error: 'Internal Server Error',
      messages: ['Une erreur inattendue est survenue. Réessayez plus tard.'],
    });
    expect(JSON.stringify(body)).not.toContain('connection refused');
    expect(logError).toHaveBeenCalledWith(
      'GET /api/children/c1 -> 500',
      error.stack,
    );
  });

  it('logs a thrown value that is not an Error', () => {
    expect(send('boom').status).toBe(500);
    expect(logError).toHaveBeenCalledWith('GET /api/children/c1 -> 500', 'boom');
  });

  it('logs the server errors raised on purpose, and keeps their message', () => {
    const { status, body } = send(
      new ServiceUnavailableException('Base de données indisponible.'),
    );
    expect(status).toBe(503);
    expect(body.messages).toEqual(['Base de données indisponible.']);
    expect(logError).toHaveBeenCalled();
  });
});
