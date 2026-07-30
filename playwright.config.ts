import { defineConfig, devices } from "@playwright/test";

const backendPort = Number(process.env.SMOKE_BACKEND_PORT ?? 3209);
const frontendPort = Number(process.env.SMOKE_FRONTEND_PORT ?? 5179);
const backendApiUrl = `http://127.0.0.1:${backendPort}/api`;
const frontendUrl = `http://127.0.0.1:${frontendPort}`;

export default defineConfig({
  testDir: "./tests",
  timeout: 60_000,
  expect: {
    timeout: 10_000,
  },
  use: {
    ...devices["Desktop Chrome"],
    baseURL: frontendUrl,
    trace: "retain-on-failure",
  },
  webServer: [
    {
      command: "cd ../backend && npm run build && npm run start",
      env: {
        EMAIL_PROVIDER: "none",
        FRONTEND_URL: frontendUrl,
        JWT_EXPIRES_IN: "1d",
        JWT_SECRET: "browser-smoke-secret",
        NODE_ENV: "development",
        PORT: String(backendPort),
        REGISTRATION_VERIFICATION_PROVIDER: "none",
        SMS_PROVIDER: "none",
      },
      reuseExistingServer: false,
      timeout: 120_000,
      url: `${backendApiUrl}/translations`,
    },
    {
      command: [
        "npm",
        "run",
        "dev",
        "--",
        "--host",
        "127.0.0.1",
        "--port",
        String(frontendPort),
      ].join(" "),
      env: {
        VITE_API_URL: backendApiUrl,
      },
      reuseExistingServer: false,
      timeout: 120_000,
      url: frontendUrl,
    },
  ],
});
