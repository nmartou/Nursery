import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { appConfig } from './config/app.config.js';
import { HealthModule } from './modules/health/health.module.js';
import { NurseryModule } from './modules/nursery/nursery.module.js';

@Module({
  imports: [
    ConfigModule.forRoot({ isGlobal: true, load: [appConfig] }),
    HealthModule,
    NurseryModule,
  ],
})
export class AppModule {}
