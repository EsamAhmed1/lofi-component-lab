import { defineConfig, devices } from "@playwright/test";

const browsers = [
  { name: "chromium", use: devices["Desktop Chrome"] },
  { name: "firefox", use: devices["Desktop Firefox"] },
  { name: "webkit", use: devices["Desktop Safari"] },
] as const;

const schemes = ["light", "dark"] as const;

export default defineConfig({
  testDir: "tests",
  fullyParallel: true,
  // 4 workers ran this machine out of memory once the gallery passed 18 components.
  workers: 2,
  // WebKit occasionally crashes mid axe scan on this machine; one retry tells a crash from a real failure.
  retries: 1,
  reporter: [["list"], ["./tests/quality-reporter.ts"]],
  use: { baseURL: "http://localhost:3100" },
  projects: browsers.flatMap((browser) =>
    schemes.map((colorScheme) => ({
      name: `${browser.name}-${colorScheme}`,
      use: { ...browser.use, colorScheme },
    })),
  ),
  webServer: {
    command: "npm run build && npx next start -p 3100",
    url: "http://localhost:3100",
    timeout: 240_000,
    reuseExistingServer: true,
  },
});
