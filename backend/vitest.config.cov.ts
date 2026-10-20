import { defineConfig } from 'vitest/config';

/**
 * Coverage of the whole test suite: unit specs, and the e2e and repository
 * specs on the test database (which must be reachable, see vitest.config.e2e.ts).
 */
export default defineConfig({
  test: {
    projects: ['./vitest.config.ts', './vitest.config.e2e.ts'],
    coverage: {
      provider: 'v8',
      include: ['src/**/*.ts'],
      exclude: [
        '**/*.spec.ts',
        '**/*.db-spec.ts',
        '**/testing/**',
        // Bootstrap only: the e2e tests start the app through AppModule.
        'src/main.ts',
      ],
      reporter: ['text', 'html'],
    },
  },
});
