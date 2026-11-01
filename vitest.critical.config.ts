import { defineConfig } from "vitest/config";

export default defineConfig({
  test: {
    include: ["tests/critical/**/*.test.ts"],
    environment: "node",
    passWithNoTests: false,
  },
});
