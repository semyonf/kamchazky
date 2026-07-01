import { defineConfig } from "tsup";

export default defineConfig({
  entry: ["src/index.ts", "src/eslint.ts"],
  external: ["typescript", "@typescript-eslint/utils"],
  format: ["esm", "cjs"],
  dts: true,
  clean: true,
  sourcemap: true,
});
