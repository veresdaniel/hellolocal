import { defineConfig } from "vitest/config";

/** HTML test results under reports/html/index.html — open with a browser (file://). */
export default defineConfig({
  test: {
    name: "report",
    include: ["tests/unit/**/*.test.ts", "tests/critical/**/*.test.ts"],
    environment: "node",
    passWithNoTests: false,
    reporters: [
      "default",
      [
        "html",
        {
          outputDir: "reports/html",
          singleFile: true,
        },
      ],
    ],
  },
});
