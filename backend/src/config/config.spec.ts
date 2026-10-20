import { appConfig } from './app.config.js';
import { databaseConfig } from './database.config.js';

const VARIABLES = [
  'PORT',
  'API_PREFIX',
  'CORS_ORIGIN',
  'DB_HOST',
  'DB_PORT',
  'DB_USER',
  'DB_PASSWORD',
  'DB_NAME',
];

describe('configuration', () => {
  afterEach(() => {
    vi.unstubAllEnvs();
  });

  it('falls back to the local development values', () => {
    for (const name of VARIABLES) {
      vi.stubEnv(name, undefined);
    }

    expect(appConfig()).toEqual({
      port: 3000,
      globalPrefix: 'api',
      corsOrigin: 'http://localhost:4200',
    });
    expect(databaseConfig()).toEqual({
      host: 'localhost',
      port: 5432,
      user: 'nursery',
      password: 'nursery',
      database: 'nursery',
    });
  });

  it('reads the environment variables, ports as numbers', () => {
    vi.stubEnv('PORT', '8080');
    vi.stubEnv('API_PREFIX', 'v1');
    vi.stubEnv('CORS_ORIGIN', 'https://creche.example.com');
    vi.stubEnv('DB_HOST', 'db');
    vi.stubEnv('DB_PORT', '5433');
    vi.stubEnv('DB_USER', 'app');
    vi.stubEnv('DB_PASSWORD', 'secret');
    vi.stubEnv('DB_NAME', 'creche');

    expect(appConfig()).toEqual({
      port: 8080,
      globalPrefix: 'v1',
      corsOrigin: 'https://creche.example.com',
    });
    expect(databaseConfig()).toEqual({
      host: 'db',
      port: 5433,
      user: 'app',
      password: 'secret',
      database: 'creche',
    });
  });
});
