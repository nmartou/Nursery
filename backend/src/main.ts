import { Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { NestFactory } from '@nestjs/core';
import type { NestExpressApplication } from '@nestjs/platform-express';
import { AppModule } from './app.module.js';
import { setupApp } from './app.setup.js';
import type { AppConfig } from './config/app.config.js';

async function bootstrap() {
  // The body parsers are registered by setupApp.
  const app = await NestFactory.create<NestExpressApplication>(AppModule, {
    bodyParser: false,
  });
  const config = app.get(ConfigService).getOrThrow<AppConfig>('app');

  setupApp(app, config);
  app.enableShutdownHooks();

  await app.listen(config.port);
  Logger.log(
    `API running on http://localhost:${config.port}/${config.globalPrefix}`,
    'Bootstrap',
  );
}
await bootstrap();
