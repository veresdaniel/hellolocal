import path from "node:path";
import { defineConfig } from "vitest/config";

const apiNm = path.resolve(__dirname, "apps/api/node_modules");

/**
 * Lightweight Nest / service integration tests.
 * Uses mocked Prisma (no production DB). Run: pnpm test:integration
 */
export default defineConfig({
  resolve: {
    alias: {
      "@nestjs/common": path.join(apiNm, "@nestjs/common"),
      "@nestjs/core": path.join(apiNm, "@nestjs/core"),
      "@nestjs/throttler": path.join(apiNm, "@nestjs/throttler"),
      "reflect-metadata": path.join(apiNm, "reflect-metadata"),
      "@prisma/client": path.join(apiNm, "@prisma/client"),
    },
  },
  test: {
    name: "integration",
    include: ["tests/integration/**/*.test.ts"],
    environment: "node",
    passWithNoTests: false,
    fileParallelism: false,
  },
});
