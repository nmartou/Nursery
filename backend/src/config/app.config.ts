import { registerAs } from '@nestjs/config';

export interface AppConfig {
  port: number;
  globalPrefix: string;
  corsOrigin: string;
}

export const appConfig = registerAs('app', (): AppConfig => ({
  port: Number(process.env.PORT ?? 3000),
  globalPrefix: process.env.API_PREFIX ?? 'api',
  corsOrigin: process.env.CORS_ORIGIN ?? 'http://localhost:4200',
}));
