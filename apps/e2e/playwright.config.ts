import { defineConfig } from '@playwright/test';

const WEB_URL = 'http://127.0.0.1:3204';

// The web app inlines NEXT_PUBLIC_* at build time, so build it with the same
// values (see the `e2e` job in .github/workflows/ci.yml and apps/e2e/README.md).
export default defineConfig({
  testDir: './tests',
  timeout: 60_000,
  retries: 0,
  reporter: [['list']],
  use: {
    baseURL: WEB_URL,
    // Traces are for debugging a failure, not for every run.
    trace: 'off',
    ...(process.env.PLAYWRIGHT_CHROMIUM_PATH
      ? {
          launchOptions: {
            executablePath: process.env.PLAYWRIGHT_CHROMIUM_PATH,
          },
        }
      : {}),
  },
  webServer: [
    {
      command: 'bun scripts/e2e-stack.ts',
      cwd: '../api',
      url: 'http://127.0.0.1:3299/ready',
      timeout: 120_000,
      reuseExistingServer: false,
      // Let the stack drop its database before Playwright moves on.
      gracefulShutdown: { signal: 'SIGTERM', timeout: 10_000 },
    },
    {
      command: 'bunx next start -p 3204 -H 127.0.0.1',
      cwd: '../web',
      url: WEB_URL,
      timeout: 60_000,
      reuseExistingServer: false,
    },
  ],
});
