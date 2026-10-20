import { ValidationPipe } from '@nestjs/common';
import type { NestExpressApplication } from '@nestjs/platform-express';
import { bodyParserErrorHandler } from './common/http/body-parser-errors.js';
import { HttpExceptionFilter } from './common/filters/http-exception.filter.js';
import { validationExceptionFactory } from './common/validation/validation-exception.factory.js';
import type { AppConfig } from './config/app.config.js';

/** Largest body accepted (a registration is a few kilobytes). */
const BODY_LIMIT = '100kb';

/**
 * Global HTTP setup shared by `main.ts` and the e2e tests. The application
 * must be created with `{ bodyParser: false }`: the parsers are registered
 * here, followed by the middleware that localizes their errors.
 */
export function setupApp(
  app: NestExpressApplication,
  config: AppConfig,
): void {
  // First, so that every response, errors included, has the CORS headers.
  app.enableCors({ origin: config.corsOrigin });
  app.useBodyParser('json', { limit: BODY_LIMIT });
  app.useBodyParser('urlencoded', { limit: BODY_LIMIT, extended: true });
  app.use(bodyParserErrorHandler);
  app.setGlobalPrefix(config.globalPrefix);
  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,
      transform: true,
      exceptionFactory: validationExceptionFactory,
    }),
  );
  app.useGlobalFilters(new HttpExceptionFilter());
}
