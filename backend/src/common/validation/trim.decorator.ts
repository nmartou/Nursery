import { Transform } from 'class-transformer';

/**
 * Trims a string property before validation (`ValidationPipe({ transform: true })`),
 * so that "  " fails `@IsNotEmpty()` and " a@b.fr " passes `@IsEmail()`.
 */
export function Trim(): PropertyDecorator {
  return Transform(({ value }: { value: unknown }) =>
    typeof value === 'string' ? value.trim() : value,
  );
}
