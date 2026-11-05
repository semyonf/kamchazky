import { readFileSync, rmSync, writeFileSync } from "node:fs";
import { defineConfig } from "tsup";

const { version } = JSON.parse(readFileSync("package.json", "utf8"));

export default defineConfig({
  entry: ["src/index.ts", "src/eslint.ts"],
  external: ["typescript", "@typescript-eslint/utils"],
  format: ["esm", "cjs"],
  dts: true,
  clean: true,
  // Lets `require("@semyonf/kamchazky/eslint")` return the plugin object
  // (src/eslint.ts has a default export only). tsup applies cjsInterop to
  // the CommonJS build only when splitting is on.
  cjsInterop: true,
  splitting: true,
  sourcemap: true,
  // The version of the ESLint plugin (`meta.version` in src/eslint.ts).
  define: { __KAMCHAZKY_VERSION__: JSON.stringify(version) },
  // The ESM entry of the ESLint plugin re-exports the CommonJS build:
  // - `import` and `require` then give one plugin object, and ESLint
  //   refuses two different objects under one plugin name;
  // - the plugin loads `typescript` with `require`.  TypeScript before 5.5
  //   has no named exports that `import * as ts` could read.
  // Runs after both formats are built.
  onSuccess: async () => {
    writeFileSync(
      "dist/eslint.js",
      'import plugin from "./eslint.cjs";\n\nexport default plugin;\n'
    );
    rmSync("dist/eslint.js.map", { force: true });
  },
});
