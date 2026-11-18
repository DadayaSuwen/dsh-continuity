import { defineConfig } from '@playwright/test';

export default defineConfig({
  testDir: 'tests/e2e/browser',
  outputDir: '.runtime/browser-results',
  testMatch: '**/*.spec.ts',
  timeout: 60000,
  expect: { timeout: 10000 },
  fullyParallel: false,
  workers: 1,
  projects: [
    { name: 'phone-390', use: { viewport: { width: 390, height: 844 } } },
    { name: 'phone-360', use: { viewport: { width: 360, height: 800 } } },
  ],
  use: {
    baseURL: 'http://127.0.0.1:3917',
    viewport: { width: 390, height: 844 },
    isMobile: true,
    hasTouch: true,
    locale: 'zh-CN',
    trace: 'retain-on-failure',
    screenshot: 'only-on-failure',
    ...(process.env.CONTINUITY_BROWSER_PATH
      ? { launchOptions: { executablePath: process.env.CONTINUITY_BROWSER_PATH } }
      : {}),
  },
  reporter: [
    ['list'],
    ['html', { open: 'never' }],
    ['junit', { outputFile: 'test-results/mobile-junit.xml' }],
  ],
});
