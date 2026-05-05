import { defineConfig } from "vitest/config";

export default defineConfig({
  resolve: {
    // Vite 6+ resolves tsconfig `paths` natively — no plugin needed for the
    // `@/*` alias defined in tsconfig.json.
    tsconfigPaths: true,
  },
  test: {
    environment: "node",
    globals: false,
    include: ["src/**/*.test.ts", "src/**/*.test.tsx", "tests/unit/**/*.test.ts"],
    coverage: {
      provider: "v8",
      reporter: ["text", "html", "lcov"],
      include: ["src/utils/**", "src/lib/**"],
      exclude: ["src/lib/firebase.ts", "src/lib/preferences.ts"],
    },
  },
});
