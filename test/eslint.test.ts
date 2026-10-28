import { fileURLToPath } from "node:url";

import { RuleTester } from "@typescript-eslint/rule-tester";
import { afterAll, describe, it } from "vitest";

import { mustUseResult, noUnwrap } from "../src/eslint.js";

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
      },
      tsconfigRootDir,
    },
  },
});

const resultType = `type R<T> = { ok: true; value: T } | { ok: false; error: Error };`;

ruleTester.run("must-use-result", mustUseResult, {
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
      code: `declare function okOnly(): { ok: true; value: number };\nokOnly();`,
      errors: [{ messageId: "mustUse" }],
    },
    {
      code: `${resultType}\ndeclare function getResult(): R<number>;\nconst r = getResult();\nr;`,
      errors: [{ messageId: "mustUse" }],
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
  ],
});

const maybeType = `type M<T> = { some: true; value: T } | { some: false };`;
const unwrapApi = `declare const Result: { unwrap<T>(r: R<T>): T; unwrapOr<T>(r: R<T>, fallback: T): T };\ndeclare const Maybe: { unwrap<T>(m: M<T>): T };`;
const unwrapSetup = `${resultType}\n${maybeType}\n${unwrapApi}\ndeclare const r: R<number>;\ndeclare const m: M<number>;`;

ruleTester.run("no-unwrap", noUnwrap, {
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
