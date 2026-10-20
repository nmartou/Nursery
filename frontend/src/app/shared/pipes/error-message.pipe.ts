import { Pipe, type PipeTransform } from '@angular/core';
import { errorMessage, type ErrorMessageKey } from '../i18n/error-messages';

/** `{{ 'field.firstNameRequired' | errorMessage }}` in a template. */
@Pipe({ name: 'errorMessage' })
export class ErrorMessagePipe implements PipeTransform {
  transform(key: ErrorMessageKey): string {
    return errorMessage(key);
  }
}
