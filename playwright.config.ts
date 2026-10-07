import { defineConfig, devices } from "@playwright/test";

export default defineConfig({
  testDir: "./e2e",
  timeout: 45000,
  fullyParallel: false,
  forbidOnly: !!process.env.CI,
  retries: 0,
  workers: 1,
  reporter: "list",
  use: {
    baseURL: "http://127.0.0.1:3000",
    trace: "off",
  },
  webServer: {
    command: "bun run dev -- --port 3000",
    url: "http://127.0.0.1:3000",
    reuseExistingServer: true,
    timeout: 30000,
  },
  projects: [
    {
      name: "Desktop",
      use: {
        viewport: { width: 1280, height: 800 },
      },
    },
    {
      name: "Mobile",
      use: {
        viewport: { width: 390, height: 844 },
        isMobile: true,
      },
    },
  ],
});
