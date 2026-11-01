import { defineConfig } from "vitest/config";

export default defineConfig({
  test: {
    name: "unit",
    include: ["tests/unit/**/*.test.ts"],
    environment: "node",
    passWithNoTests: false,
    coverage: {
      provider: "v8",
      reportsDirectory: "coverage",
      reporter: ["text", "lcov", "html"],
      include: [
        "apps/api/src/common/domain-host.ts",
        "apps/api/src/slug/slug.helper.ts",
        "apps/api/src/visitor-ladder/visitor-ladder.ts",
        "apps/api/src/auth/copy-access.ts",
        "apps/api/src/products/products.service.ts",
        "apps/api/src/admin/admin-app-settings.service.ts",
        "apps/web/src/components/publicPlans.ts",
      ],
    },
  },
});
