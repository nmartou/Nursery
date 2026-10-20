import type { Request, Response } from 'express';
import {
  bodyParserErrorHandler,
  bodyParserException,
} from './body-parser-errors.js';

const parserError = (type: string) =>
  Object.assign(new Error('raw parser error'), { type });

describe('body parser errors', () => {
  it.each([
    ['entity.parse.failed', 400, 'body.invalidJson'],
    ['entity.too.large', 413, 'body.tooLarge'],
    ['encoding.unsupported', 415, 'body.unsupportedEncoding'],
    ['charset.unsupported', 415, 'body.unsupportedEncoding'],
  ])('turns %s into a %i', (type, status, code) => {
    expect(bodyParserException(parserError(type))).toMatchObject({
      status,
      response: { code },
    });
  });

  it('leaves the other errors alone', () => {
    expect(bodyParserException(parserError('request.aborted'))).toBeNull();
    expect(bodyParserException(new Error('boom'))).toBeNull();
    expect(bodyParserException('boom')).toBeNull();
    expect(bodyParserException(null)).toBeNull();
  });

  it('passes the translated error, or the original one, to the next handler', () => {
    const next = vi.fn();
    const run = (error: unknown) =>
      bodyParserErrorHandler(
        error,
        {} as Request,
        {} as Response,
        next,
      );

    run(parserError('entity.too.large'));
    const other = new Error('boom');
    run(other);

    expect(next.mock.calls[0][0]).toMatchObject({ status: 413 });
    expect(next.mock.calls[1][0]).toBe(other);
  });
});
