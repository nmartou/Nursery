import { defineConfig, devices } from '@playwright/test';

/**
 * UI tests run in a real browser against the Angular dev server.
 * The backend API is mocked in each test (see e2e/support/mock-api.ts).
 *
 * E2E_PORT picks another port for the dev server, e.g. when 4200 is taken by the
 * Docker stack (an existing server on the port would otherwise be reused).
 */
const port = Number(process.env['E2E_PORT'] ?? 4200);
const baseURL = `http://localhost:${port}`;

export default defineConfig({
  testDir: './e2e',
  fullyParallel: true,
  forbidOnly: !!process.env['CI'],
  retries: process.env['CI'] ? 2 : 0,
  reporter: [['list'], ['html', { open: 'never' }]],
  use: {
    baseURL,
    locale: 'fr-FR',
    timezoneId: 'Europe/Paris',
    trace: 'on-first-retry',
    screenshot: 'only-on-failure',
  },
  projects: [
    {
      name: 'desktop',
      use: { ...devices['Desktop Chrome'], viewport: { width: 1366, height: 850 } },
    },
  ],
  webServer: {
    command: `npm start -- --port ${port}`,
    url: baseURL,
    reuseExistingServer: !process.env['CI'],
    timeout: 120_000,
  },
});
