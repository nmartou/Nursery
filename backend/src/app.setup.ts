import { INestApplication, ValidationPipe } from '@nestjs/common';
import { HttpExceptionFilter } from './common/filters/http-exception.filter.js';
import type { AppConfig } from './config/app.config.js';

/** Global HTTP setup shared by `main.ts` and the e2e tests. */
export function setupApp(app: INestApplication, config: AppConfig): void {
  app.setGlobalPrefix(config.globalPrefix);
  app.enableCors({ origin: config.corsOrigin });
  app.useGlobalPipes(new ValidationPipe({ whitelist: true, transform: true }));
  app.useGlobalFilters(new HttpExceptionFilter());
}
