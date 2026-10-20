import {
  registerDecorator,
  type ValidationArguments,
  type ValidationOptions,
} from 'class-validator';

/**
 * The decorated `YYYY-MM-DD` date must be the same day as, or after, the date
 * held by `property` on the same object. Skipped when either value is missing
 * (combine with `@IsOptional()` / `@IsDateString()` for those cases).
 */
export function IsOnOrAfter(
  property: string,
  options?: ValidationOptions,
): PropertyDecorator {
  return (target: object, propertyName: string | symbol) => {
    registerDecorator({
      name: 'isOnOrAfter',
      target: target.constructor,
      propertyName: propertyName.toString(),
      constraints: [property],
      options: {
        message: `$property must be on or after ${property}`,
        ...options,
      },
      validator: {
        // class-validator always passes the arguments when validating.
        validate(value: unknown, args: ValidationArguments): boolean {
          const [other] = args.constraints as [string];
          const reference = (args.object as Record<string, unknown>)[other];
          if (typeof value !== 'string' || typeof reference !== 'string') {
            return true;
          }
          // ISO dates compare correctly as strings.
          return value >= reference;
        },
      },
    });
  };
}
