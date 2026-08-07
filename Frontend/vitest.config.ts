import { defineConfig } from "vitest/config";
import react from "@vitejs/plugin-react";
import path from "path";

export default defineConfig({
  plugins: [react()],
  test: {
    environment: "jsdom",
    globals: true,
    setupFiles: ["./vitest-setup.ts"],
    exclude: ["**/e2e/**", "**/node_modules/**", "**/.next/**"],
    coverage: {
      provider: "v8",
      enabled: true,
      reporter: ["text", "lcov", "html"],
      reportsDirectory: "./coverage",
      include: [
        "src/lib/**",
        "src/services/**",
        "src/store/**",
        "src/components/PageMeta.tsx",
        "src/components/SplashWrapper.tsx",
        "src/hooks/useSSE.ts",
      ],
      exclude: [
        "**/*.config.*",
        "**/*.d.ts",
        "**/types/**",
        "**/node_modules/**",
        "**/.next/**",
        "**/vitest-setup.ts",
      ],
      thresholds: {
        lines: 70,
        functions: 75,
        branches: 52,
        statements: 68,
      },
    },
  },
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "."),
    },
  },
});
