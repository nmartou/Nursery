import { BadRequestException } from '@nestjs/common';
import type { ValidationError } from 'class-validator';

/**
 * French wording of the class-validator constraints used by the DTOs; `n` is
 * the number of the constraint (length, size, minimum), when there is one.
 */
const DEFAULT_MESSAGES: Record<string, (n: string) => string> = {
  isNotEmpty: () => 'est obligatoire',
  isDefined: () => 'est obligatoire',
  isString: () => 'doit être un texte',
  maxLength: (n) => `ne doit pas dépasser ${n} caractères`,
  isDateString: () => 'doit être une date au format AAAA-MM-JJ',
  isIn: () => 'contient une valeur non autorisée',
  isInt: () => 'doit être un nombre entier',
  min: (n) => `doit être supérieur ou égal à ${n}`,
  isBoolean: () => 'doit valoir vrai ou faux',
  isArray: () => 'doit être une liste',
  arrayMinSize: (n) => `doit contenir au moins ${n} élément(s)`,
  arrayMaxSize: (n) => `ne doit pas contenir plus de ${n} éléments`,
  isUuid: () => 'doit être un identifiant valide',
  isEmail: () => 'doit être une adresse e-mail valide',
  nestedValidation: () => 'doit être un objet',
};

/**
 * `exceptionFactory` of the ValidationPipe: one French message per failed
 * constraint, nested properties included (`parents.0.email`).
 *
 * class-validator's default messages are English and start with the name of
 * the property ("email must be an email"): those are replaced. Messages given
 * in a DTO (`{ message: '…' }`) are written in French without the property
 * name, and are kept as they are.
 */
export function validationExceptionFactory(
  errors: ValidationError[],
): BadRequestException {
  return new BadRequestException(validationMessages(errors));
}

export function validationMessages(
  errors: ValidationError[],
  parentPath = '',
): string[] {
  return errors.flatMap((error) => {
    const path = parentPath ? `${parentPath}.${error.property}` : error.property;
    const own = Object.entries(error.constraints ?? {}).map(([name, message]) =>
      isDefaultMessage(message, error.property)
        ? `« ${path} » ${frenchMessage(name, message)}.`
        : message,
    );
    return [...own, ...validationMessages(error.children ?? [], path)];
  });
}

function isDefaultMessage(message: string, property: string): boolean {
  return message.includes(property);
}

function frenchMessage(constraint: string, english: string): string {
  const number = /\d+/.exec(english)?.[0] ?? '';
  return DEFAULT_MESSAGES[constraint]?.(number) ?? 'est invalide';
}
