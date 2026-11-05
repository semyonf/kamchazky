// A typed flat config that adds the plugin.  The type of the plugin must fit
// ESLint's config types and typescript-eslint's.
import kamchazky from "@semyonf/kamchazky/eslint";
import type { TSESLint } from "@typescript-eslint/utils";
import type { ESLint, Linter } from "eslint";
import { defineConfig } from "eslint/config";

export const viaDefine = defineConfig([
  { plugins: { kamchazky }, rules: { "kamchazky/must-use-result": "error" } },
]);
export const viaLinter: Linter.Config[] = [
  { plugins: { kamchazky }, rules: { "kamchazky/no-unwrap": "error" } },
];
export const asPlugin: ESLint.Plugin = kamchazky;
export const viaTypescriptEslint: TSESLint.FlatConfig.ConfigArray = [
  { plugins: { kamchazky } },
];
