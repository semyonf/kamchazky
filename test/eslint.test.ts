import { fileURLToPath } from "node:url";

import { RuleTester } from "@typescript-eslint/rule-tester";
import { afterAll, describe, it } from "vitest";

import plugin from "../src/eslint.js";

RuleTester.afterAll = afterAll;
RuleTester.describe = describe;
RuleTester.it = it;
RuleTester.itOnly = it.only;

const tsconfigRootDir = fileURLToPath(new URL("fixtures", import.meta.url));

const ruleTester = new RuleTester({
  languageOptions: {
    parserOptions: {
      projectService: {
        allowDefaultProject: ["*.ts*"],
        // Without an explicit default project the lint files get default
        // compiler options (strictNullChecks off), which does not match how
        // the rule runs in real strict-mode projects.
        defaultProject: "tsconfig.json",
      },
      tsconfigRootDir,
    },
  },
});

const resultType = `type R<T> = { ok: true; value: T } | { ok: false; error: Error };`;

ruleTester.run("must-use-result", plugin.rules["must-use-result"], {
  invalid: [
    {
      code: `${resultType}\ndeclare function getResult(): R<number>;\ngetResult();`,
      errors: [{ messageId: "mustUse" }],
    },
    {
      code: `${resultType}\ndeclare function getAsyncResult(): Promise<R<number>>;\nasync function f() { await getAsyncResult(); }`,
      errors: [{ messageId: "mustUse" }],
    },
    {
      code: `${resultType}\ndeclare function getAsyncResult(): Promise<R<number>>;\ngetAsyncResult();`,
      errors: [{ messageId: "mustUseAsync" }],
    },
    {
      code: `declare function okOnly(): { ok: true; value: number };\nokOnly();`,
      errors: [{ messageId: "mustUse" }],
    },
    {
      code: `${resultType}\ndeclare function getResult(): R<number>;\nconst r = getResult();\nr;`,
      errors: [{ messageId: "mustUse" }],
    },
    {
      code: `${resultType}\ndeclare function getResult(): R<number>;\n(getResult(), 0);`,
      errors: [{ messageId: "mustUse" }],
    },
    {
      code: `${resultType}\ndeclare function maybeResult(): R<number> | null;\nmaybeResult();`,
      errors: [{ messageId: "mustUse" }],
    },
    {
      code: `${resultType}\ndeclare function maybeResult(): R<number> | undefined;\nmaybeResult();`,
      errors: [{ messageId: "mustUse" }],
    },
    // An un-awaited Promise<Result> inside an async function is still lost.
    {
      code: `${resultType}\ndeclare function getAsyncResult(): Promise<R<number>>;\nasync function f() { getAsyncResult(); }`,
      errors: [{ messageId: "mustUseAsync" }],
    },
    // Arrays and tuples of Results carry errors too.
    {
      code: `${resultType}\ndeclare function validate(x: number): R<number>;\ndeclare const items: number[];\nitems.map(validate);`,
      errors: [{ messageId: "mustUse" }],
    },
    {
      code: `${resultType}\ndeclare function save(x: number): Promise<R<number>>;\ndeclare const items: number[];\nasync function f() { await Promise.all(items.map(save)); }`,
      errors: [{ messageId: "mustUse" }],
    },
    {
      code: `${resultType}\ndeclare function save(x: number): Promise<R<number>>;\ndeclare const items: number[];\nPromise.all(items.map(save));`,
      errors: [{ messageId: "mustUseAsync" }],
    },
    {
      code: `${resultType}\ndeclare const pair: [R<number>, R<string>];\npair;`,
      errors: [{ messageId: "mustUse" }],
    },
    // A Result-returning callback passed where the caller ignores the
    // return value (a void-returning parameter) loses every error.
    {
      code: `${resultType}\ndeclare function validate(x: number): R<number>;\ndeclare const items: number[];\nitems.forEach(validate);`,
      errors: [{ messageId: "mustUseCallback" }],
    },
    {
      code: `${resultType}\ndeclare function validate(x: number): R<number>;\ndeclare const items: number[];\nitems.forEach((x) => validate(x));`,
      errors: [{ messageId: "mustUseCallback" }],
    },
    {
      code: `${resultType}\ndeclare function save(x: number): Promise<R<number>>;\ndeclare const items: number[];\nitems.forEach(async (x) => save(x));`,
      errors: [{ messageId: "mustUseCallback" }],
    },
    {
      code: `${resultType}\ndeclare function getResult(): R<number>;\ndeclare function onEvent(cb?: () => void): void;\nonEvent(getResult);`,
      errors: [{ messageId: "mustUseCallback" }],
    },
  ],
  valid: [
    {
      code: `${resultType}\ndeclare function getResult(): R<number>;\nconst r = getResult();`,
    },
    {
      code: `${resultType}\ndeclare function getResult(): R<number>;\nfunction f() { return getResult(); }`,
    },
    {
      code: `${resultType}\ndeclare function getResult(): R<number>;\ngetResult().ok;`,
    },
    {
      code: `${resultType}\ndeclare function getResult(): R<number>;\ndeclare function log(x: unknown): void;\nlog(getResult());`,
    },
    {
      code: `declare function g(): { kind: "a" } | { kind: "b" };\ng();`,
    },
    {
      code: `const x = 1;\nx + 1;`,
    },
    // A non-literal `ok: boolean` (typical API DTO) gives no narrowing and
    // must not be flagged.
    {
      code: `declare function apiCall(): { ok: boolean; error?: string };\napiCall();`,
    },
    // Promises of non-Results stay untouched.
    {
      code: `declare function ping(): Promise<void>;\nping();`,
    },
    {
      code: `${resultType}\ndeclare function nullable(): R<number> | string;\nnullable();`,
    },
    // Assignment stores the Result, it does not discard it.
    {
      code: `${resultType}\ndeclare function getResult(): R<number>;\nlet r: R<number>;\nr = getResult();\nr.ok;`,
    },
    {
      code: `${resultType}\ndeclare function getResult(): R<number>;\nlet r: R<number> | undefined;\nr ??= getResult();\nr.ok;`,
    },
    {
      code: `${resultType}\ndeclare function getResult(): R<number>;\nconst box: { r?: R<number> } = {};\nbox.r = getResult();`,
    },
    {
      code: `${resultType}\ndeclare function save(x: number): Promise<R<number>>;\ndeclare const items: number[];\nasync function f() { return Promise.all(items.map(save)); }`,
    },
    {
      code: `declare const items: number[];\nitems.map((x) => x * 2);`,
    },
    {
      code: `declare const empty: [];\nempty;`,
    },
    // Callbacks whose Result is read, or passed where the return value is
    // used, are fine.
    {
      code: `${resultType}\ndeclare function validate(x: number): R<number>;\ndeclare const items: number[];\nitems.forEach((x) => { if (!validate(x).ok) throw new Error(); });`,
    },
    {
      code: `${resultType}\ndeclare function validate(x: number): R<number>;\ndeclare const items: number[];\nconst rs = items.map(validate);`,
    },
    {
      code: `${resultType}\ndeclare function getResult(): R<number>;\ndeclare function run(cb: () => unknown): void;\nrun(getResult);`,
    },
    {
      code: `declare const items: number[];\nitems.forEach((x) => x * 2);`,
    },
  ],
});

const maybeType = `type M<T> = { some: true; value: T } | { some: false };`;
const unwrapApi = `declare const Result: { unwrap<T>(r: R<T>): T; unwrapOr<T>(r: R<T>, fallback: T): T };\ndeclare const Maybe: { unwrap<T>(m: M<T>): T };`;
const unwrapSetup = `${resultType}\n${maybeType}\n${unwrapApi}\ndeclare const r: R<number>;\ndeclare const m: M<number>;`;

ruleTester.run("no-unwrap", plugin.rules["no-unwrap"], {
  invalid: [
    {
      code: `${unwrapSetup}\nconst v = Result.unwrap(r);`,
      errors: [{ messageId: "noUnwrap" }],
    },
    {
      code: `${unwrapSetup}\nconst v = Maybe.unwrap(m);`,
      errors: [{ messageId: "noUnwrap" }],
    },
    {
      code: `${unwrapSetup}\ndeclare function getAsyncResult(): Promise<R<number>>;\nasync function f() { return Result.unwrap(await getAsyncResult()); }`,
      errors: [{ messageId: "noUnwrap" }],
    },
    {
      code: `${unwrapSetup}\nconst { unwrap } = Result;\nconst v = unwrap(r);`,
      errors: [{ messageId: "noUnwrap" }],
    },
    {
      code: `${unwrapSetup}\nconst Alias = Result;\nconst v = Alias.unwrap(r);`,
      errors: [{ messageId: "noUnwrap" }],
    },
    {
      code: `${unwrapSetup}\ndeclare const rs: R<number>[];\nconst vs = rs.map(Result.unwrap);`,
      errors: [{ messageId: "noUnwrap" }],
    },
    {
      code: `${unwrapSetup}\ndeclare function getAsyncResult(): Promise<R<number>>;\nconst v = getAsyncResult().then(Result.unwrap);`,
      errors: [{ messageId: "noUnwrap" }],
    },
    {
      code: `${unwrapSetup}\nconst v = Result.unwrap.call(null, r);`,
      errors: [{ messageId: "noUnwrap" }],
    },
    {
      code: `${unwrapSetup}\nconst v = Result["unwrap"](r);`,
      errors: [{ messageId: "noUnwrap" }],
    },
    {
      code: `${unwrapSetup}\ndeclare const a: any;\nconst v = Result.unwrap(a);`,
      errors: [{ messageId: "noUnwrap" }],
    },
  ],
  valid: [
    {
      code: `${unwrapSetup}\nconst v = Result.unwrapOr(r, 0);`,
    },
    {
      code: `declare const box: { unwrap(x: string): string };\nconst v = box.unwrap("a");`,
    },
    {
      code: `declare function unwrap(x: number): number;\nconst v = unwrap(1);`,
    },
    {
      code: `declare const flags: { unwrap(x: { some: boolean; id: number }): number };\nconst v = flags.unwrap({ some: true, id: 1 });`,
    },
    {
      code: `${unwrapSetup}\nconst f = Result.unwrapOr;`,
    },
  ],
});
