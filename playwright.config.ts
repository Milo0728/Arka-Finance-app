import { defineConfig, devices } from "@playwright/test";

const PORT = Number(process.env.E2E_PORT ?? 3000);
const BASE_URL = process.env.E2E_BASE_URL ?? `http://localhost:${PORT}`;

// Force demo mode by blanking the Firebase env. With no apiKey/projectId the
// app's `isFirebaseConfigured` is false and the store hydrates from the local
// seed — keeps E2E hermetic, no network, no Firestore credentials in CI.
const DEMO_ENV = {
  NEXT_PUBLIC_FIREBASE_API_KEY: "",
  NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN: "",
  NEXT_PUBLIC_FIREBASE_PROJECT_ID: "",
  NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET: "",
  NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID: "",
  NEXT_PUBLIC_FIREBASE_APP_ID: "",
  NEXT_PUBLIC_FIREBASE_MEASUREMENT_ID: "",
};

export default defineConfig({
  testDir: "./tests/e2e",
  // CI gets one retry to soak up the rare flake; locally we want fast failure.
  retries: process.env.CI ? 1 : 0,
  fullyParallel: false, // serial keeps localStorage simulations predictable
  workers: 1,
  reporter: process.env.CI ? [["github"], ["html", { open: "never" }]] : "list",
  timeout: 30_000,
  expect: { timeout: 5_000 },

  use: {
    baseURL: BASE_URL,
    trace: "on-first-retry",
    screenshot: "only-on-failure",
    video: "retain-on-failure",
    actionTimeout: 10_000,
    navigationTimeout: 15_000,
  },

  projects: [
    {
      name: "chromium",
      use: { ...devices["Desktop Chrome"] },
    },
  ],

  // Reuses an already-running server locally (faster watch loop). In CI we
  // always start it fresh so artefacts from previous runs can't leak in.
  webServer: {
    command: process.env.CI ? "npm run start" : "npm run dev",
    url: BASE_URL,
    reuseExistingServer: !process.env.CI,
    timeout: 120_000,
    env: DEMO_ENV,
  },
});
