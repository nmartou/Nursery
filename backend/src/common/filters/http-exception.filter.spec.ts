import {
  type ArgumentsHost,
  Logger,
  NotFoundException,
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

  it('sends the status and the message of an HTTP exception', () => {
    const { host, response } = createHost();

    filter.catch(new NotFoundException('Child c1 not found'), host);

    expect(response.status).toHaveBeenCalledWith(404);
    expect(response.json).toHaveBeenCalledWith({
      statusCode: 404,
      path: '/api/children/c1',
      timestamp: expect.stringMatching(/^\d{4}-\d{2}-\d{2}T/),
      message: {
        statusCode: 404,
        message: 'Child c1 not found',
        error: 'Not Found',
      },
    });
    expect(logError).not.toHaveBeenCalled();
  });

  it('hides an unexpected error from the client and logs its stack', () => {
    const { host, response } = createHost();
    const error = new Error('connection refused');

    filter.catch(error, host);

    expect(response.status).toHaveBeenCalledWith(500);
    expect(response.json).toHaveBeenCalledWith(
      expect.objectContaining({
        statusCode: 500,
        message: 'Internal server error',
      }),
    );
    expect(logError).toHaveBeenCalledWith('GET /api/children/c1', error.stack);
  });

  it('logs a thrown value that is not an Error', () => {
    const { host, response } = createHost();

    filter.catch('boom', host);

    expect(response.status).toHaveBeenCalledWith(500);
    expect(logError).toHaveBeenCalledWith('GET /api/children/c1', 'boom');
  });
});
