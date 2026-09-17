import { defineConfig, devices } from '@playwright/test';

const baseURL = process.env.E2E_BASE_URL ?? 'http://localhost:3001';

export default defineConfig({
  testDir: './tests/e2e',
  outputDir: 'test-results',
  fullyParallel: false,
  forbidOnly: Boolean(process.env.CI),
  retries: process.env.CI ? 2 : 0,
  workers: 1,
  reporter: [['list'], ['html', { outputFolder: 'playwright-report', open: 'never' }]],
  expect: { timeout: 10_000 },
  use: {
    baseURL,
    screenshot: 'only-on-failure',
    trace: 'retain-on-failure',
    video: 'retain-on-failure',
    actionTimeout: 10_000,
    navigationTimeout: 20_000,
  },
  webServer: process.env.E2E_REUSE_SERVER === 'false' ? {
    command: 'npm run dev',
    url: baseURL,
    reuseExistingServer: !process.env.CI,
    timeout: 120_000,
  } : undefined,
  projects: [
    { name: 'chromium', use: { ...devices['Desktop Chrome'] } },
    { name: 'firefox', use: { ...devices['Desktop Firefox'] } },
    { name: 'webkit', use: { ...devices['Desktop Safari'] } },
  ],
});
