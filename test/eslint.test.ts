import { fileURLToPath } from "node:url";

import { RuleTester } from "@typescript-eslint/rule-tester";
import { afterAll, describe, it } from "vitest";

import { mustUseResult } from "../src/eslint.js";

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
