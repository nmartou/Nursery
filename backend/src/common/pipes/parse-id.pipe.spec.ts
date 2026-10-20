import type { ArgumentMetadata } from '@nestjs/common';
import { ParseIdPipe } from './parse-id.pipe.js';

const PARAM: ArgumentMetadata = { type: 'param', data: 'id' };

describe('ParseIdPipe', () => {
  it('accepts a UUID', async () => {
    const id = '00000000-0000-4000-8000-000000000000';
    await expect(ParseIdPipe.transform(id, PARAM)).resolves.toBe(id);
  });

  it('refuses anything else with request.invalidId', async () => {
    await expect(ParseIdPipe.transform('12', PARAM)).rejects.toMatchObject({
      status: 400,
      response: { code: 'request.invalidId' },
    });
  });
});
