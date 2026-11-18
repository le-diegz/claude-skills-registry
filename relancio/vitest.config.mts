import { defineConfig } from "vitest/config";
import react from "@vitejs/plugin-react";

export default defineConfig({
  plugins: [react()],
  resolve: {
    tsconfigPaths: true,
    alias: { "server-only": new URL("./tests/support/server-only.ts", import.meta.url).pathname },
  },
  test: {
    environment: "node",
    include: ["tests/unit/**/*.test.ts", "tests/integration/**/*.test.ts"],
    env: { TZ: "UTC" },
    setupFiles: ["./tests/support/setup.ts"],
    testTimeout: 30000,
    hookTimeout: 60000,
    fileParallelism: false,
  },
});
