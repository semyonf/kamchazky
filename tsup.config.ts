import { defineConfig } from "tsup";

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
});
