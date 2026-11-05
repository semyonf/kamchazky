import { readFileSync } from "node:fs";
import { defineConfig } from "vitest/config";

const { version } = JSON.parse(readFileSync("package.json", "utf8"));

export default defineConfig({
  // As in tsup.config.ts: the version of the ESLint plugin.
  define: { __KAMCHAZKY_VERSION__: JSON.stringify(version) },
  test: {
    include: ["test/**/*.test.ts"],
    typecheck: {
      enabled: true,
      include: ["test/**/*.test-d.ts"],
    },
  },
});
