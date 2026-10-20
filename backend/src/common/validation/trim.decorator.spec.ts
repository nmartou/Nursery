import 'reflect-metadata';
import { plainToInstance } from 'class-transformer';
import { Trim } from './trim.decorator.js';

class Form {
  @Trim()
  value?: unknown;
}

const transform = (value: unknown) =>
  plainToInstance(Form, { value }).value;

describe('Trim', () => {
  it('trims a string', () => {
    expect(transform('  Léa ')).toBe('Léa');
    expect(transform('   ')).toBe('');
  });

  it('leaves any other value unchanged', () => {
    expect(transform(null)).toBeNull();
    expect(transform(undefined)).toBeUndefined();
    expect(transform(12)).toBe(12);
  });
});
