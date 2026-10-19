import 'reflect-metadata';
import { plainToInstance } from 'class-transformer';
import { validate } from 'class-validator';
import { IsOnOrAfter } from './is-on-or-after.decorator.js';

class Period {
  start?: string;

  @IsOnOrAfter('start')
  end?: string;
}

async function isValid(start?: string, end?: string): Promise<boolean> {
  const errors = await validate(plainToInstance(Period, { start, end }));
  return errors.length === 0;
}

describe('IsOnOrAfter', () => {
  it('accepts the same day or a later one', async () => {
    expect(await isValid('2026-09-01', '2026-09-01')).toBe(true);
    expect(await isValid('2026-09-01', '2027-01-10')).toBe(true);
  });

  it('rejects an earlier day', async () => {
    expect(await isValid('2026-09-01', '2026-08-31')).toBe(false);
  });

  it('is skipped when either date is missing', async () => {
    expect(await isValid(undefined, '2026-09-01')).toBe(true);
    expect(await isValid('2026-09-01', undefined)).toBe(true);
  });
});
