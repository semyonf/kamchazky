import { mustUseResult, noUnwrap } from "./rules.js";

/** The package version, put in by the build (`define` in tsup.config.ts and
 *  vitest.config.ts).  ESLint keys its cache on the plugin name and
 *  version: without a version, `--cache` keeps the results of the old
 *  rules after an upgrade. */
declare const __KAMCHAZKY_VERSION__: string;

/**
 * A rule as the published declaration types it.  The rules are
 * typescript-eslint `RuleModule`s, whose `create` takes a context with
 * methods that ESLint 9 removed (`getScope` and others), so that type does
 * not fit ESLint's config types (`defineConfig`, `Linter.Config`,
 * `ESLint.Plugin`).  This shape fits them, ESLint 8's (`@types/eslint`)
 * and typescript-eslint's configs, and needs no types from any of them.
 * The rule tests use the full types from rules.ts.
 */
type PluginRule = {
  readonly meta: {
    readonly type: "problem" | "suggestion" | "layout";
    readonly docs?: { readonly description: string; readonly url?: string };
    readonly messages: Readonly<Record<string, string>>;
  };
  // ESLint 8, ESLint 9 and typescript-eslint each pass their own context
  // and call the listeners with their own node types.  No function type
  // fits between the listeners of typescript-eslint (`(node: never) =>
  // void` for any selector) and those of ESLint (`(...args: any[]) =>
  // void`), so a listener is `any` here.
  // biome-ignore lint/suspicious/noExplicitAny: see the comment above
  create(context: any): Record<string, any>;
};

type Plugin = {
  readonly meta: { readonly name: string; readonly version: string };
  readonly rules: {
    readonly "must-use-result": PluginRule;
    readonly "no-unwrap": PluginRule;
  };
};

// The plugin object is the module's only export, so the CommonJS build can
// set `module.exports` to it (tsup `cjsInterop`) and `require()` returns the
// plugin itself instead of `{ default, ... }`.
const plugin: Plugin = {
  meta: { name: "@semyonf/kamchazky", version: __KAMCHAZKY_VERSION__ },
  rules: { "must-use-result": mustUseResult, "no-unwrap": noUnwrap },
};

export default plugin;
