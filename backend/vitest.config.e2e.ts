import { defineConfig } from 'vitest/config';
import tsconfigPaths from 'vite-tsconfig-paths';

// Same credentials as the application (backend/.env).
try {
  process.loadEnvFile('.env');
} catch {
  // No .env file: rely on the environment variables.
}

const testDatabase =
  process.env.DB_TEST_NAME ?? `${process.env.DB_NAME ?? 'nursery'}_test`;

export default defineConfig({
  plugins: [tsconfigPaths()],
  test: {
    globals: true,
    root: './',
    include: ['**/*.e2e-spec.ts'],
    // Creates and migrates the test database before the run.
    globalSetup: ['./test/support/test-database.ts'],
    // The application under test talks to the test database only.
    env: { DB_NAME: testDatabase },
    // Test files share one database: run them one after the other.
    fileParallelism: false,
  },
});
