import type { HttpInterceptorFn } from '@angular/common/http';
import { APP_LANGUAGE } from '../../shared/i18n/language';

/** Asks the API to explain its errors in the language of the interface. */
export const languageInterceptor: HttpInterceptorFn = (request, next) =>
  next(request.clone({ setHeaders: { 'Accept-Language': APP_LANGUAGE } }));
