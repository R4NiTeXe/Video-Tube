import { defineConfig } from "vitest/config";
import react from "@vitejs/plugin-react";
import path from "path";

export default defineConfig({
  plugins: [react()],
  test: {
    environment: "jsdom",
    globals: true,
    setupFiles: [],
    exclude: ["**/e2e/**", "**/node_modules/**", "**/.next/**"],
    coverage: {
      provider: "v8",
      enabled: true,
      reporter: ["text", "lcov", "html"],
      reportsDirectory: "./coverage",
      include: ["app/**", "src/**"],
      exclude: [
        "**/*.config.*",
        "**/*.d.ts",
        "**/types/**",
        "**/node_modules/**",
        "**/.next/**",
        "app/layout.tsx",
        "**/loading.tsx",
        "**/error.tsx",
      ],
      thresholds: {
        lines: 80,
        functions: 80,
        branches: 75,
        statements: 80,
      },
    },
  },
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "."),
    },
  },
});
