import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";

import { RuleTester } from "@typescript-eslint/rule-tester";
import { afterAll, describe, expect, it } from "vitest";

import plugin from "../src/eslint.js";
import { mustUseResult, noUnwrap } from "../src/rules.js";

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
const libImport = `import { Maybe, Result } from "../../src/index.js";`;

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
    // A callback passed as a JSX attribute or as a property of an object
    // literal, where the expected type returns void.
    {
      code: `${libImport}\ndeclare function validate(n: number): Result<number>;\ndeclare function save(): Promise<Result<number>>;\ndeclare function Button(props: { onClick: () => void }): null;\nconst a = <Button onClick={() => save()} />;\nconst b = <Button onClick={save} />;\ndeclare function register(options: { on: (n: number) => void }): void;\nregister({ on: (n) => validate(n) });\nregister({ on: validate });\nregister({ on(n) { return validate(n); } });\nconst c: { on: () => void } = { on: () => validate(1) };`,
      filename: "react.tsx",
      errors: [
        { messageId: "mustUseCallback", line: 5 },
        { messageId: "mustUseCallback", line: 6 },
        { messageId: "mustUseCallback", line: 8 },
        { messageId: "mustUseCallback", line: 9 },
        { messageId: "mustUseCallback", line: 10 },
        { messageId: "mustUseCallback", line: 11 },
      ],
    },
    // A field of a value made by a call is as fresh as that value.
    {
      code: `${resultType}\ndeclare function cmp(a: R<number>, b: R<number>): number;\ndeclare function getHolder(): { list: R<number>[] };\ngetHolder().list.sort(cmp);\nnew (class { list: R<number>[] = []; })().list.reverse();`,
      errors: [{ messageId: "mustUse" }, { messageId: "mustUse" }],
    },
    // A comma drops every value but the last, wherever the sequence is.
    {
      code: `${resultType}\ndeclare function validate(n: number): R<number>;\ndeclare const n: number;\nfunction f(): number {\n  let i = 0;\n  while ((validate(i), i < n)) i++;\n  const g = () => (validate(1), 2);\n  void g;\n  if ((validate(3), i) && n) i++;\n  for (; (validate(4), i < n); ) i++;\n  const h = (i, (validate(5), n));\n  void h;\n  return (validate(2), i);\n}`,
      errors: [
        { messageId: "mustUse", line: 6 },
        { messageId: "mustUse", line: 7 },
        { messageId: "mustUse", line: 9 },
        { messageId: "mustUse", line: 10 },
        { messageId: "mustUse", line: 11 },
        { messageId: "mustUse", line: 13 },
      ],
    },
    // A sequence that a statement drops as a whole is reported once.
    {
      code: `${resultType}\ndeclare function validate(n: number): R<number>;\ndeclare const ready: boolean;\n(validate(1), (validate(2), 0));\nready && (validate(3), 0);\n(validate(4), ready) ? 1 : 2;`,
      errors: [
        { messageId: "mustUse" },
        { messageId: "mustUse" },
        { messageId: "mustUse" },
        { messageId: "mustUse" },
      ],
    },
    // The init and update clauses of a for statement drop their values.
    {
      code: `${resultType}\ndeclare function validate(x: number): R<number>;\ndeclare function getResult(): R<number>;\nfor (let i = 0; i < 1; validate(i), i++) {}\nfor (getResult(); false; ) {}`,
      errors: [{ messageId: "mustUse" }, { messageId: "mustUse" }],
    },
    // A cast does not keep the Result.
    {
      code: `${resultType}\ndeclare function getResult(): R<number>;\ngetResult() as unknown;\n<unknown>getResult();`,
      errors: [{ messageId: "mustUse" }, { messageId: "mustUse" }],
    },
    // A value cast to a Result and dropped: the cast says it carries an
    // error, as an untyped RPC or IPC call does.
    {
      code: `${resultType}\ndeclare function untyped(): any;\ndeclare function invoke(cmd: string): unknown;\ndeclare const ipc: { invoke(channel: string, ...args: unknown[]): Promise<any> };\nuntyped() as R<number>;\ninvoke("save") as Promise<R<void>>;\ninvoke("save") as unknown as R<void>;\n<R<number>>untyped();\nipc.invoke("save", 1) as Promise<R<void>>;`,
      errors: [
        { messageId: "mustUse" },
        { messageId: "mustUseAsync" },
        { messageId: "mustUse" },
        { messageId: "mustUse" },
        { messageId: "mustUseAsync" },
      ],
    },
    // Nullable arrays and tuples of Results, as optional chains give them.
    {
      code: `${resultType}\ndeclare function validate(x: number): R<number>;\ndeclare function save(x: number): Promise<R<number>>;\ndeclare const items: number[] | undefined;\ndeclare const repo: { list(): R<number>[] | null; pair(): [R<number>, string] | undefined };\nitems?.map(validate);\nrepo.list();\nrepo.pair();\nitems?.map(save);`,
      errors: [
        { messageId: "mustUse" },
        { messageId: "mustUse" },
        { messageId: "mustUse" },
        { messageId: "mustUseAsync" },
      ],
    },
    // A block body or a function expression that returns a fresh Result
    // in any branch still drops it.
    {
      code: `${libImport}\ndeclare function validate(x: number): Result<number>;\ndeclare const rs: Result<number>[];\ndeclare function log(x: unknown): void;\nrs.forEach((r) => { return Result.inspect(validate(1), log); });\nrs.forEach(function (r) { if (r.ok) return r; return validate(1); });\nrs.forEach((r) => { const inner = () => r; log(inner); return validate(2); });\nrs.forEach((r) => r);`,
      errors: [
        { messageId: "mustUseCallback" },
        { messageId: "mustUseCallback" },
        { messageId: "mustUseCallback" },
        { messageId: "mustUseCallback" },
      ],
    },
    // A branch of \`?:\` or the last part of a sequence that returns a fresh
    // Result, or the Result itself, still drops it.
    {
      code: `${libImport}\ndeclare function validate(x: number): Result<number>;\ndeclare const rs: Result<number>[];\ndeclare function log(x: unknown): void;\nrs.forEach((r) => (r.ok ? Result.inspect(r, log) : validate(1)));\nrs.forEach((r) => (r.ok ? Result.inspect(r, log) : r));\nrs.forEach((r) => (Result.inspect(r, log), validate(1)));\nrs.forEach((r) => { return r.ok ? validate(2) : Result.inspectError(r, log); });`,
      errors: [
        { messageId: "mustUseCallback", line: 5 },
        { messageId: "mustUseCallback", line: 6 },
        { messageId: "mustUseCallback", line: 7 },
        { messageId: "mustUseCallback", line: 8 },
      ],
    },
    // A concise arrow that hands a fresh Result to inspect still drops it.
    {
      code: `${libImport}\ndeclare function validate(x: number): Result<number>;\ndeclare const items: number[];\nitems.forEach((x) => Result.inspect(validate(x), () => {}));\nitems.forEach((x) => Object.freeze(validate(x)));`,
      errors: [
        { messageId: "mustUseCallback" },
        { messageId: "mustUseCallback" },
      ],
    },
    // A sort of a freshly mapped array still drops new Results.
    {
      code: `${resultType}\ndeclare function validate(x: number): R<number>;\ndeclare const items: number[];\ndeclare function cmp(a: R<number>, b: R<number>): number;\nitems.map(validate).sort(cmp);`,
      errors: [{ messageId: "mustUse" }],
    },
    // \`.catch\` handles only a rejection; the resolved Result is still lost.
    // Use \`void save();\` to discard on purpose.
    {
      code: `${resultType}\ndeclare function save(): Promise<R<number>>;\nsave().catch(() => undefined);`,
      errors: [{ messageId: "mustUseAsync" }],
    },
    // A user function named like an array method is not special.
    {
      code: `${resultType}\ndeclare const api: { sort(): R<number>[] };\napi.sort();`,
      errors: [{ messageId: "mustUse" }],
    },
    // The "does not await" type of tryCatch / map with an async callback is
    // not a Result, so the checks above miss it.  It is always a mistake:
    // flagged wherever the call appears.
    {
      code: `${libImport}\ndeclare function save(n: number): Promise<void>;\ndeclare const r: Result<number>;\nResult.tryCatch(() => save(1));\nResult.tryCatch(async () => { await save(1); });\nResult.map(r, async (v) => { await save(v); });\nMaybe.map(Maybe.some(1), async (v) => save(v));`,
      errors: [
        { messageId: "noAwait" },
        { messageId: "noAwait" },
        { messageId: "noAwait" },
        { messageId: "noAwait" },
      ],
    },
    {
      code: `${libImport}\ndeclare function save(n: number): Promise<void>;\ndeclare function log(x: unknown): void;\nlog(Result.tryCatch(() => save(1)));\nconst s = \`\${Result.tryCatch(() => save(1))}\`;\nasync function h() { return await Result.tryCatch(() => save(1)); }\nif (Result.tryCatch(() => save(1))) {}\nconst arr = [Result.tryCatch(() => save(1))];\nconst o = { ...Result.tryCatch(() => save(1)) };`,
      errors: [
        { messageId: "noAwait" },
        { messageId: "noAwait" },
        { messageId: "noAwait" },
        { messageId: "noAwait" },
        { messageId: "noAwait" },
        { messageId: "noAwait" },
      ],
    },
    // Operands of && / || / ?? and the branches of ?: are discarded too.
    {
      code: `${resultType}\ndeclare function getResult(): R<number>;\ndeclare const ready: boolean;\nready && getResult();`,
      errors: [{ messageId: "mustUse" }],
    },
    {
      code: `${resultType}\ndeclare function getResult(): R<number>;\ndeclare const ready: boolean;\nready ? getResult() : 0;`,
      errors: [{ messageId: "mustUse" }],
    },
    {
      code: `${resultType}\ndeclare function getResult(): R<number> | undefined;\ndeclare function fallback(): R<number>;\ngetResult() ?? fallback();`,
      errors: [{ messageId: "mustUse" }, { messageId: "mustUse" }],
    },
    // A fresh Result tested by a logical operator is still dropped, and so is
    // a stored one that ends up as the value of the statement.
    {
      code: `${resultType}\ndeclare function getResult(): R<number>;\ndeclare function send(r: R<number>): void;\ngetResult() && send(getResult());\ngetResult() || send(getResult());`,
      errors: [{ messageId: "mustUse" }, { messageId: "mustUse" }],
    },
    {
      code: `${resultType}\ndeclare const ready: boolean;\ndeclare const cached: R<number>;\nready && cached;`,
      errors: [{ messageId: "mustUse" }],
    },
    // A getter builds a fresh Result on every read.
    {
      code: `${resultType}\ndeclare function send(r: R<number>): void;\ndeclare const batch: { get current(): R<number> };\nbatch.current && send(batch.current);`,
      errors: [{ messageId: "mustUse" }],
    },
    // A [failure, value] tuple from split carries the error.
    {
      code: `${libImport}\ndeclare function getResult(): Result<number>;\nResult.split(getResult());`,
      errors: [{ messageId: "mustUse" }],
    },
    {
      code: `${resultType}\ndeclare const pair: [R<number>, string];\npair;`,
      errors: [{ messageId: "mustUse" }],
    },
    // A type parameter constrained to a Result.
    {
      code: `${resultType}\nfunction f<T extends R<number>>(op: () => T) { op(); }`,
      errors: [{ messageId: "mustUse" }],
    },
    {
      code: `${resultType}\nasync function f<T extends R<number>>(op: () => Promise<T>) { await op(); }`,
      errors: [{ messageId: "mustUse" }],
    },
    {
      code: `${resultType}\nfunction f<T extends R<number>>(op: () => Promise<T>) { op(); }`,
      errors: [{ messageId: "mustUseAsync" }],
    },
    // allSettled keeps every Result in its fulfilled entries.
    {
      code: `${resultType}\ndeclare function save(x: number): Promise<R<number>>;\ndeclare const items: number[];\nasync function f() { await Promise.allSettled(items.map(save)); }`,
      errors: [{ messageId: "mustUse" }],
    },
    // An array of Promises of Results.
    {
      code: `${resultType}\ndeclare function save(x: number): Promise<R<number>>;\ndeclare const items: number[];\nitems.map(save);`,
      errors: [{ messageId: "mustUseAsync" }],
    },
    {
      code: `${resultType}\ndeclare function batches(): Promise<R<number>>[][][];\nbatches();`,
      errors: [{ messageId: "mustUseAsync" }],
    },
    // Nested arrays of Results, as chunked batches give them.
    {
      code: `${resultType}\ndeclare function validate(n: number): R<number>;\ndeclare function save(n: number): Promise<R<number>>;\ndeclare const chunks: number[][];\nchunks.map((c) => c.map(validate));\nasync function f() { await Promise.all(chunks.map((c) => Promise.all(c.map(save)))); }\ndeclare const deep: (R<number>[] | undefined)[][];\ndeep;\ndeclare const pair: [R<number>[], string];\npair;\nchunks.forEach((c) => c.map(validate));`,
      errors: [
        { messageId: "mustUse" },
        { messageId: "mustUse" },
        { messageId: "mustUse" },
        { messageId: "mustUse" },
        { messageId: "mustUseCallback" },
      ],
    },
    // inspect returns its argument: a fresh Result passed in is still lost.
    {
      code: `${libImport}\ndeclare function getResult(): Result<number>;\nResult.inspect(getResult(), () => {});\nResult.inspectError(getResult(), () => {});`,
      errors: [{ messageId: "mustUse" }, { messageId: "mustUse" }],
    },
    // Another \`inspect\` that takes a Result and returns one may build a new
    // Result, as an audit that fails a check does.
    {
      code: `${libImport}\ndeclare const r: Result<number>;\ndeclare const audit: { inspect(r: Result<number>): Result<number>; inspectError: (r: Result<number>) => Result<number> };\naudit.inspect(r);\naudit.inspectError(r);`,
      errors: [{ messageId: "mustUse" }, { messageId: "mustUse" }],
    },
    // `await` of a stored Result that is no Promise drops it as \`r;\` does.
    {
      code: `${resultType}\ndeclare const r: R<number>;\ndeclare const p: Promise<R<number>>;\nasync function f() {\n  await r;\n  await await p;\n  await (await p);\n}`,
      errors: [{ messageId: "mustUse" }],
    },
    // A getter returns a fresh array on every read: sorting it loses it.
    {
      code: `${resultType}\ndeclare function cmp(a: R<number>, b: R<number>): number;\ndeclare const batch: { get checks(): R<number>[] };\nbatch.checks.sort(cmp);\nObject.freeze(batch.checks);`,
      errors: [{ messageId: "mustUse" }, { messageId: "mustUse" }],
    },
    // A getter with a body that builds the value is fresh too, and so is
    // what a method named \`get\` returns when it is not a Map's.
    {
      code: `${resultType}\ndeclare function validate(n: number): R<number>;\ndeclare function send(r: R<number>): void;\ndeclare function cmp(a: R<number>, b: R<number>): number;\nclass Batch {\n  items: number[] = [];\n  get checks() { return this.items.map(validate); }\n  get first() { return validate(this.items[0] ?? 0); }\n  m(api: { get(key: string): R<number> }) {\n    this.checks.sort(cmp);\n    this.first && send(this.first);\n    api.get("k") && send(api.get("k"));\n  }\n}`,
      errors: [
        { messageId: "mustUse" },
        { messageId: "mustUse" },
        { messageId: "mustUse" },
      ],
    },
    // A stored entry read with Map.get and dropped as a statement, as \`r;\`.
    {
      code: `${resultType}\ndeclare const cache: Map<string, R<number>>;\ncache.get("k");`,
      errors: [{ messageId: "mustUse" }],
    },
    // An optional callback, \`onSave?: () => Promise<R>\`, returns a Result
    // whenever it is there.
    {
      code: `${libImport}\ndeclare function validate(n: number): Result<number>;\ndeclare function Button(props: { onClick?: () => void }): null;\ntype Props = { onSave?: () => Promise<Result<number>>; onCheck?: () => Result<number> };\ndeclare function later(cb?: () => void): void;\nfunction Form(props: Props) {\n  later(props.onCheck);\n  later(props.onSave);\n  register({ on: props.onCheck });\n  return <Button onClick={props.onSave} />;\n}\ndeclare function register(options: { on?: () => void }): void;`,
      filename: "react.tsx",
      errors: [
        { messageId: "mustUseCallback", line: 7 },
        { messageId: "mustUseCallback", line: 8 },
        { messageId: "mustUseCallback", line: 9 },
        { messageId: "mustUseCallback", line: 10 },
      ],
    },
    // A getter read with an element access builds its value as it does
    // with a dot, also in the body of another getter.
    {
      code: `${resultType}\ndeclare function validate(n: number): R<number>;\ndeclare function send(r: R<number>): void;\ndeclare function cmp(a: R<number>, b: R<number>): number;\nclass Batch {\n  items: number[] = [];\n  get checks() { return this.items.map(validate); }\n  get first() { return validate(1); }\n  get checksByKey() { return this["checks"]; }\n}\ndeclare const batch: Batch;\nbatch["checks"].sort(cmp);\nbatch["first"] && send(batch.first);\nbatch.checksByKey.sort(cmp);`,
      errors: [
        { messageId: "mustUse", line: 12 },
        { messageId: "mustUse", line: 13 },
        { messageId: "mustUse", line: 14 },
      ],
    },
    // A key whose type names the getter reads it too, and a key of two
    // names reads a getter if either name is one.
    {
      code: `${resultType}\ndeclare function cmp(a: R<number>, b: R<number>): number;\ndeclare const batch: { get checks(): R<number>[]; list: R<number>[] };\nconst key = "checks";\ndeclare const either: "checks" | "list";\nbatch[key].sort(cmp);\nbatch[either].sort(cmp);`,
      errors: [
        { messageId: "mustUse", line: 6 },
        { messageId: "mustUse", line: 7 },
      ],
    },
    // \`finally\` and \`await\` on a fresh Promise drop its Result, and so does
    // waiting for a fresh array of stored Promises.
    {
      code: `${resultType}\ndeclare function save(): Promise<R<number>>;\ndeclare function log(x: unknown): void;\nclass Svc {\n  pending = new Set<Promise<R<number>>>();\n  async m() {\n    save().finally(() => log(1));\n    await save().finally(() => log(1));\n    await Promise.allSettled([...this.pending]);\n  }\n}`,
      errors: [
        { messageId: "mustUseAsync", line: 7 },
        { messageId: "mustUse", line: 8 },
        { messageId: "mustUse", line: 9 },
      ],
    },
    // A callback reference behind \`!\`, \`?.\` or a cast, a method with a
    // computed key, and a tuple of Promises a callback returns.
    {
      code: `${libImport}\ndeclare function validate(n: number): Result<number>;\ndeclare function save(): Promise<Result<number>>;\ndeclare function Button(props: { onClick?: () => void }): null;\ndeclare const h: { click?: () => Result<number> } | undefined;\nconst a = <Button onClick={h!.click!} />;\nconst b = <Button onClick={h?.click} />;\ndeclare function on(options: { done?: () => void }): void;\non({ done: h!.click! });\non({ done: h?.click as () => Result<number> });\ndeclare function reg(options: { [Symbol.iterator]: () => void; "a-b": () => void }): void;\nconst key = "a-b" as const;\nreg({ [Symbol.iterator]() { return validate(1); }, [key]() { return validate(2); } });\ndeclare function later(cb: () => void): void;\nlater(() => [save(), save()] as const);`,
      filename: "react.tsx",
      errors: [
        { messageId: "mustUseCallback", line: 6 },
        { messageId: "mustUseCallback", line: 7 },
        { messageId: "mustUseCallback", line: 9 },
        { messageId: "mustUseCallback", line: 10 },
        { messageId: "mustUseCallback", line: 13 },
        { messageId: "mustUseCallback", line: 13 },
        { messageId: "mustUseCallback", line: 15 },
      ],
    },
    // Taking elements out of a fresh array loses the others with it.
    {
      code: `${resultType}\ndeclare function validate(n: number): R<number>;\ndeclare function list(): R<number>[];\ndeclare const batch: { get checks(): R<number>[] };\ndeclare const items: number[];\nlist().shift();\nbatch.checks.pop();\nitems.map(validate).splice(0, 1);`,
      errors: [
        { messageId: "mustUse", line: 6 },
        { messageId: "mustUse", line: 7 },
        { messageId: "mustUse", line: 8 },
      ],
    },
    // \`void\` holds a Result as \`undefined\` does: \`.catch(() => {})\` gives
    // \`Promise<R | void>\`, and the Result it resolves to is still lost.
    {
      code: `${resultType}\ndeclare function save(): Promise<R<number>>;\ndeclare const logger: { error(e: unknown): void };\nsave().catch(() => {});\nsave().catch((e) => logger.error(e));\ndeclare function later(): Promise<R<number> | void>;\nlater();\ndeclare function now(): R<number> | void;\nnow();\ndeclare function each(): (R<number> | void)[];\neach();`,
      errors: [
        { messageId: "mustUseAsync", line: 4 },
        { messageId: "mustUseAsync", line: 5 },
        { messageId: "mustUseAsync", line: 7 },
        { messageId: "mustUse", line: 9 },
        { messageId: "mustUse", line: 11 },
      ],
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
    // Calls that return their receiver or argument: no Result is lost.
    {
      code: `${resultType}\ndeclare const results: R<number>[];\ndeclare function cmp(a: R<number>, b: R<number>): number;\nresults.sort(cmp);`,
    },
    {
      code: `${resultType}\ndeclare const results: R<number>[];\nresults.reverse();`,
    },
    {
      code: `${resultType}\ndeclare const results: R<number>[];\ndeclare const r: R<number>;\nresults.fill(r);`,
    },
    {
      code: `${resultType}\ndeclare const results: R<number>[];\nresults.copyWithin(0, 1);`,
    },
    {
      code: `${resultType}\ndeclare const results: R<number>[];\nObject.freeze(results);`,
    },
    {
      code: `${resultType}\ndeclare const r: R<number>;\nObject.freeze(r);`,
    },
    {
      code: `${resultType}\ndeclare const results: R<number>[];\nObject.seal(results);\nObject.preventExtensions(results);`,
    },
    {
      code: `${resultType}\ndeclare function save(): Promise<R<number>>;\nvoid save();`,
    },
    // A stored Result tested by && / || / ?? is read, not lost.
    {
      code: `${resultType}\ndeclare function send(r: R<number>): void;\ndeclare let lastResult: R<number> | undefined;\nfunction a(cached: R<number> | undefined) { cached && send(cached); }\nfunction b(r: R<number> | null) { r ?? send({ ok: true, value: 1 }); }\nlastResult && send(lastResult);\nlastResult! || send(lastResult!);\ndeclare const other: boolean;\nlastResult && other && send(lastResult);`,
    },
    {
      code: `${resultType}\ndeclare function send(r: R<number>): void;\nclass Svc {\n  private last?: R<number>;\n  run() { this.last && send(this.last); }\n}`,
    },
    // Fields of stored values, and for clauses without a Result.
    {
      code: `${resultType}\ndeclare function cmp(a: R<number>, b: R<number>): number;\ndeclare const holder: { list: R<number>[]; inner: { list: R<number>[] } };\nholder.list.sort(cmp);\nholder.inner.list.reverse();\nclass Base { list: R<number>[] = []; }\nclass Svc extends Base {\n  m() { this.list.sort(cmp); super.list.sort(cmp); }\n}\nfor (let i = 0; i < 1; i++) {}`,
    },
    // An auto-accessor field stores its value, as a field does, and so does
    // a getter that returns a field.  Map.get returns a stored entry.
    {
      code: `${resultType}\ndeclare function send(r: R<number>): void;\ndeclare function cmp(a: R<number>, b: R<number>): number;\ndeclare function fallback(): void;\nclass Store {\n  accessor results: R<number>[] = [];\n  accessor last: R<number> | undefined;\n  private _first: R<number> | undefined;\n  get first() { return this._first; }\n  get sorted(): R<number>[] { return this.results; }\n  m(cache: Map<string, R<number>>, lists: ReadonlyMap<string, R<number>[]>, weak: WeakMap<object, R<number>>, key: object) {\n    this.results.sort(cmp);\n    this.last && send(this.last);\n    Object.freeze(this.last);\n    this.first && send(this.first);\n    this.first ?? fallback();\n    this.sorted.reverse();\n    cache.get("k") && send(cache.get("k")!);\n    lists.get("k")?.sort(cmp);\n    weak.get(key) ?? fallback();\n  }\n}`,
    },
    // A stored array behind an optional chain.
    {
      code: `${resultType}\ndeclare function cmp(a: R<number>, b: R<number>): number;\nclass Svc {\n  results: R<number>[] = [];\n  maybe?: R<number>[];\n  m(other?: Svc) {\n    this.results?.sort(cmp);\n    this.maybe?.sort(cmp);\n    other?.results.sort(cmp);\n    other?.maybe?.reverse();\n  }\n}`,
    },
    // A concise arrow that returns the stored Result it got loses nothing.
    {
      code: `${libImport}\ndeclare const rs: Result<number>[];\ndeclare const logger: { warn(e: unknown): void };\nrs.forEach((r) => Result.inspectError(r, (e) => logger.warn(e)));\nrs.forEach((r) => Result.inspect(r, (v) => logger.warn(v)));\nrs.forEach((r) => Object.freeze(r));\nrs.forEach((r) => Result.inspect(r, () => {}) as Result<number>);`,
    },
    // A callback with a block body, or a function expression, whose every
    // return gives back the stored Result it got.
    {
      code: `${libImport}\ndeclare const rs: Result<number>[];\ndeclare function log(x: unknown): void;\nrs.forEach((r) => { return Result.inspect(r, log); });\nrs.forEach(function (r) { return Result.inspectError(r, log); });\nrs.forEach((r) => { if (r.ok) return Result.inspect(r, log); log(r); return Object.freeze(r); });\nrs.forEach((r) => { const f = () => 1; log(f); return (Object.freeze(r)); });`,
    },
    // Both branches of \`?:\`, or the last part of a sequence, give back
    // the stored Result, as two \`return\` statements do.
    {
      code: `${libImport}\ndeclare const rs: Result<number>[];\ndeclare function log(x: unknown): void;\nrs.forEach((r) => (r.ok ? Result.inspect(r, log) : Result.inspectError(r, log)));\nrs.forEach((r) => { if (r.ok) return Result.inspect(r, log); return Result.inspectError(r, log); });\nrs.forEach((r) => { return r.ok ? Result.inspect(r, log) : Object.freeze(r); });\nrs.forEach((r) => (log(r), Result.inspect(r, log)));\nrs.forEach((r) => (r.ok ? Result.inspect(r, log) : (log(r), Result.inspectError(r, log))) as Result<number>);`,
    },
    // The same positions where the caller uses what the callback returns,
    // or the callback hands back the stored Result it got.
    {
      code: `${libImport}\ndeclare function validate(n: number): Result<number>;\ndeclare function log(x: unknown): void;\ndeclare function Button(props: { onClick: () => void; check?: () => Result<number> }): null;\nconst a = <Button onClick={() => { void validate(1); }} check={() => validate(2)} />;\ndeclare function register(options: { on: (r: Result<number>) => void; map?: (n: number) => unknown }): void;\nregister({ on: (r) => Result.inspect(r, log), map: validate });\nregister({ on(r) { return Result.inspectError(r, log); } });\nconst o = { on: () => validate(1) };`,
      filename: "react.tsx",
    },
    // Another \`inspect\` that takes a Result and returns something else
    // got the Result as an argument, as \`log(getResult())\` does.
    {
      code: `${libImport}\ndeclare function getResult(): Result<number>;\ndeclare const util: { inspect(object: unknown, options?: object): string };\ndeclare const debug: { inspectError(r: unknown): void };\nutil.inspect(getResult());\nutil.inspect(getResult(), { depth: 2 });\ndebug.inspectError(getResult());`,
    },
    // The README examples: inspect on a stored Result returns that Result.
    {
      code: `${libImport}\ndeclare const result: Result<number>;\nResult.inspect(result, (value) => console.log("got", value));\nResult.inspectError(result, (error) => console.error(error));`,
    },
    // A stored array behind a cast, a non-null assertion or a field.
    {
      code: `${resultType}\ndeclare const results: R<number>[];\ndeclare const holder: { list: R<number>[] };\ndeclare function cmp(a: R<number>, b: R<number>): number;\n(results as R<number>[]).sort(cmp);\nresults!.sort(cmp);\nholder.list.reverse();\nconst key = "list";\nholder[key].sort(cmp);`,
    },
    // tryCatch / map with sync work are ordinary Results.
    {
      code: `${libImport}\ndeclare const r: Result<number>;\nconst a = Result.tryCatch(() => 1);\nconst b = Result.map(r, (v) => v + 1);\nconst c = Result.tryCatch(() => JSON.parse("1"));`,
    },
    // An untyped callback is not taken for one that returns a Promise.
    {
      code: `${libImport}\ndeclare const legacy: any;\ndeclare const r: Result<number>;\ndeclare function log(x: unknown): void;\nlog(Result.map(r, legacy.transform));\nlog(Result.tryCatch(legacy.parse));\nlog(Result.tryCatch(legacy.parse, () => new TypeError()));\nlog(Maybe.map(Maybe.some(1), legacy.transform));`,
    },
    // A cast to a Result that is used, or discarded on purpose.
    {
      code: `${resultType}\ndeclare function untyped(): any;\nconst r = untyped() as R<number>;\nvoid (untyped() as R<number>);\n(untyped() as R<number>).ok;\nuntyped() as number;`,
    },
    // A sequence without a dropped Result, or discarded on purpose.
    {
      code: `${resultType}\ndeclare function validate(n: number): R<number>;\ndeclare function log(x: unknown): void;\nconst a = (log(1), 2);\nconst b = (log(1), validate(2));\nvoid (validate(1), 2);\nfor (let i = 0, j = 0; i < 1; i++, j++) {}`,
    },
    // A tuple without a Result.
    {
      code: `declare const pair: [number, string];\npair;`,
    },
    // Nested arrays without a Result.
    {
      code: `declare const grid: number[][];\ngrid;\ngrid.map((row) => row.map((x) => x * 2));`,
    },
    {
      code: `function f<T extends number>(op: () => T) { op(); }`,
    },
    // Recursive array types end the walk instead of overflowing the stack.
    {
      code: `type Deep = Deep[];\ndeclare const d: Deep;\nd;\ndeclare function deep(): Deep;\ndeep();\ndeclare function each(cb: () => void): void;\neach(deep);`,
    },
    // An element access reads a field or a stored entry as a dot does.
    {
      code: `${resultType}\ndeclare function send(r: R<number>): void;\ndeclare function cmp(a: R<number>, b: R<number>): number;\nclass Holder {\n  list: R<number>[] = [];\n  private _list: R<number>[] = [];\n  get viaKey() { return this["_list"]; }\n  m(i: number) {\n    this["list"].sort(cmp);\n    this.viaKey.sort(cmp);\n    this.list[0] && send(this.list[0]);\n    this.list[i] && send(this.list[i]);\n  }\n}`,
    },
    // \`finally\` on a stored Promise hands it back, and \`await\` hands back
    // the Result a stored Promise holds: whoever stored it reads it.
    {
      code: `${resultType}\ndeclare function save(): Promise<R<number>>;\ndeclare function log(x: unknown): void;\nclass Svc {\n  ready: Promise<R<number>> = save();\n  maybe?: Promise<R<number>>;\n  pending = new Set<Promise<R<number>>>();\n  fire() {\n    const p = save();\n    this.pending.add(p);\n    p.finally(() => this.pending.delete(p));\n    this.maybe?.finally(() => log(1));\n  }\n  async stop() {\n    await this.ready;\n    await this.ready.finally(() => log(1));\n    await this.maybe;\n  }\n}`,
    },
    // A wrapped reference that returns no Result, or is cast to one that
    // returns none.
    {
      code: `${libImport}\ndeclare function Button(props: { onClick?: () => void }): null;\ndeclare const h: { click?: () => number; check?: () => Result<number> } | undefined;\nconst a = <Button onClick={h!.click!} />;\nconst b = <Button onClick={h?.click} />;\ndeclare function on(options: { done?: () => void }): void;\non({ done: h?.check as () => void });\ndeclare function later(cb: () => void): void;\nlater(() => [1, 2] as const);`,
      filename: "react.tsx",
    },
    // \`shift\`, \`pop\` and \`splice\` on a stored array hand back elements
    // that it stored: the caller evicts them, nothing is lost.
    {
      code: `${resultType}\nclass History {\n  items: R<number>[] = [];\n  maybe?: R<number>[];\n  trim(n: number) {\n    this.items.shift();\n    this.items.pop();\n    this.items.splice(0, n);\n    this.maybe?.shift();\n  }\n}`,
    },
    // A value that is only \`void\` or \`undefined\` holds no Result.
    {
      code: `declare function done(): void;\ndone();\ndeclare function later(): Promise<void | undefined>;\nlater();\ndeclare function each(): (void | null)[];\neach();`,
    },
    {
      code: `type Nested<T> = Array<Nested<T>>;\ndeclare const n: Nested<number>;\nn;\ntype Grow<T> = Array<Grow<[T]>>;\ndeclare const g: Grow<number>;\ng;\ntype Loop = Promise<Loop>;\ndeclare function loop(): Loop;\nloop();`,
    },
  ],
});

const maybeType = `type M<T> = { some: true; value: T } | { some: false };`;
const unwrapApi = `declare const Result: { unwrap<T>(r: R<T>): T; unwrapErr<T>(r: R<T>): Error; unwrapOr<T>(r: R<T>, fallback: T): T };\ndeclare const Maybe: { unwrap<T>(m: M<T>): T };`;
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
    // Computed keys whose type is the literal "unwrap".
    {
      code: `${unwrapSetup}\nconst v = Result[\`unwrap\`](r);`,
      errors: [{ messageId: "noUnwrap" }],
    },
    {
      code: `${unwrapSetup}\nconst key = "unwrap" as const;\nconst v = Result[key](r);`,
      errors: [{ messageId: "noUnwrap" }],
    },
    // Destructuring is reported at the pattern, so every later use is
    // covered, renamed or not.
    {
      code: `${unwrapSetup}\nconst { unwrap } = Result;\nconst v = unwrap.call(null, r);`,
      errors: [{ messageId: "noUnwrap" }],
    },
    {
      code: `${unwrapSetup}\nconst { unwrap: take } = Result;\nconst v = take(r);`,
      errors: [{ messageId: "noUnwrap" }],
    },
    {
      code: `${unwrapSetup}\nconst { unwrap } = Maybe;\ndeclare const ms: M<number>[];\nconst vs = ms.map(unwrap);`,
      errors: [{ messageId: "noUnwrap" }],
    },
    // A computed key whose type is a union that includes "unwrap".
    {
      code: `${unwrapSetup}\ndeclare const key: "unwrap" | "unwrapOr";\nconst f = Result[key];`,
      errors: [{ messageId: "noUnwrap" }],
    },
    // A string key names the property as an identifier does, and a computed
    // key with a union type may name it, in a pattern as in a member access.
    {
      code: `${unwrapSetup}\ndeclare const key: "unwrap" | "unwrapOr";\nconst { "unwrap": a } = Result;\nconst { 'unwrapErr': b } = Result;\nconst { "unwrap": c } = Maybe;\nconst { [key]: d } = Result;\nconst { "unwrap": e = Result.unwrapOr } = Result;`,
      errors: [
        { messageId: "noUnwrap", line: 8 },
        { messageId: "noUnwrap", line: 9 },
        { messageId: "noUnwrap", line: 10 },
        { messageId: "noUnwrap", line: 11 },
        { messageId: "noUnwrap", line: 12 },
      ],
    },
    // A destructuring assignment: the target keeps its own declared type,
    // so the key is looked up in the value taken apart.
    {
      code: `${unwrapSetup}\ndeclare const key: "unwrap" | "unwrapOr";\nlet f: unknown;\n({ unwrap: f } = Result);\n({ "unwrap": f } = Result);\n({ 'unwrapErr': f } = Result);\n({ ["unwrap"]: f } = Result);\n({ [key]: f } = Result);\n({ unwrap: f } = Maybe);\nfor ({ unwrap: f } of [Result]) {}\n({ api: { unwrap: f } } = { api: Result });`,
      errors: [
        { messageId: "noUnwrap", line: 9 },
        { messageId: "noUnwrap", line: 10 },
        { messageId: "noUnwrap", line: 11 },
        { messageId: "noUnwrap", line: 12 },
        { messageId: "noUnwrap", line: 13 },
        { messageId: "noUnwrap", line: 14 },
        { messageId: "noUnwrap", line: 15 },
        { messageId: "noUnwrap", line: 16 },
      ],
    },
    {
      code: `${unwrapSetup}\ndeclare const fns: (typeof Result.unwrap)[];\ndeclare const pair: [number, typeof Result.unwrapErr];\nlet t: unknown;\nconst box: { take?: unknown } = {};\n[t] = fns;\n[, t] = pair;\nfor ([t] of [fns]) {}\n[box.take] = fns;`,
      errors: [
        { messageId: "noUnwrap", line: 11 },
        { messageId: "noUnwrap", line: 12 },
        { messageId: "noUnwrap", line: 13 },
        { messageId: "noUnwrap", line: 14 },
      ],
    },
    // Array destructuring is reported at the pattern, like object
    // destructuring.
    {
      code: `${unwrapSetup}\nfunction a([take]: [typeof Result.unwrap]) { return take(r); }\nfunction b(fns: (typeof Result.unwrapErr)[]) { const [take = fns[0]] = fns; return take!(r); }\ndeclare const loose: [(typeof Result.unwrap) | undefined];\nconst [maybeTake] = loose;`,
      errors: [
        { messageId: "noUnwrap" },
        { messageId: "noUnwrap" },
        { messageId: "noUnwrap" },
      ],
    },
    {
      code: `${libImport}\ndeclare const m: Maybe<number>;\nfunction a([take]: [typeof Maybe.unwrap]) { return take(m); }`,
      errors: [{ messageId: "noUnwrap" }],
    },
    // A pattern with a default takes apart the value or the default, and a
    // call reads an element as a pattern does.
    {
      code: `${unwrapSetup}\ndeclare const fns: (typeof Result.unwrap)[];\ndeclare const holder: { fns: (typeof Result.unwrapErr)[] };\nlet t: unknown;\n({ fns: [t] = [] as unknown[] } = holder);\nconst { fns: [u] = [] as unknown[] } = holder;\nconst [[v] = []] = [fns];\nfns[0]!(r);\nfns?.[0]?.(r);\ndeclare const plain: ((n: number) => number)[];\nplain[0]!(1);\nconst { list: [w] = [] } = { list: [1] };`,
      errors: [
        { messageId: "noUnwrap", line: 10 },
        { messageId: "noUnwrap", line: 11 },
        { messageId: "noUnwrap", line: 12 },
        { messageId: "noUnwrap", line: 13 },
        { messageId: "noUnwrap", line: 14 },
      ],
    },
    // A value that an index signature or another iterable gives has the
    // type of the target.
    {
      code: `${unwrapSetup}\ndeclare const table: Record<string, typeof Result.unwrap>;\ndeclare const loose: Iterable<typeof Result.unwrapErr>;\nconst { unwrap } = table;\nconst { unwrap: take } = table;\nconst [first] = loose;\nlet u: typeof Result.unwrap | undefined;\n[u] = new Set<typeof Result.unwrap>();`,
      errors: [
        { messageId: "noUnwrap", line: 9 },
        { messageId: "noUnwrap", line: 10 },
        { messageId: "noUnwrap", line: 11 },
        { messageId: "noUnwrap", line: 13 },
      ],
    },
    // The library's Maybe.unwrap, declared as maybeUnwrap, in the same forms.
    {
      code: `${libImport}\ndeclare const ms: (typeof Maybe.unwrap)[];\nconst { "unwrap": a } = Maybe;\nlet f: unknown;\n({ "unwrap": f } = Maybe);\n({ 'unwrapErr': f } = Result);\n[f] = ms;`,
      errors: [
        { messageId: "noUnwrap", line: 3 },
        { messageId: "noUnwrap", line: 5 },
        { messageId: "noUnwrap", line: 6 },
        { messageId: "noUnwrap", line: 7 },
      ],
    },
    // An optional object or an optional property still holds the throwing
    // function.
    {
      code: `${unwrapSetup}\ndeclare const opt: typeof Result | undefined;\ndeclare const box: { unwrap?: typeof Result.unwrap };\nopt?.unwrap(r);\nbox.unwrap?.(r);\nconst { unwrap } = box;`,
      errors: [
        { messageId: "noUnwrap", line: 9 },
        { messageId: "noUnwrap", line: 10 },
        { messageId: "noUnwrap", line: 11 },
      ],
    },
    // A generic parameter constrained to a Maybe takes a Maybe.
    {
      code: `${unwrapSetup}\ndeclare const lib: { unwrap<X extends M<number>>(m: X): number };\nlib.unwrap(m);`,
      errors: [{ messageId: "noUnwrap", line: 8 }],
    },
    // A name that a destructuring assignment binds is reported at the
    // pattern, not again where it is called.
    {
      code: `${unwrapSetup}\ndeclare const fns: (typeof Result.unwrapErr)[];\nlet unwrap: typeof Result.unwrap;\nlet unwrapErr: typeof Result.unwrapErr;\n({ unwrap } = Result);\nunwrap(r);\n[unwrapErr] = fns;\nunwrapErr(r);\nfor ({ unwrap } of [Result]) unwrap(r);`,
      errors: [
        { messageId: "noUnwrap", line: 10 },
        { messageId: "noUnwrap", line: 12 },
        { messageId: "noUnwrap", line: 14 },
      ],
    },
    // unwrapErr throws on Ok.
    {
      code: `${unwrapSetup}\nconst e = Result.unwrapErr(r);`,
      errors: [{ messageId: "noUnwrap" }],
    },
    // The library itself.
    {
      code: `import { Maybe, Result } from "../../src/index.js";\ndeclare const r: Result<number>;\ndeclare const m: Maybe<number>;\nconst a = Result.unwrap(r);\nconst b = Maybe.unwrap(m);\nconst c = Result.unwrapErr(r);`,
      errors: [
        { messageId: "noUnwrap" },
        { messageId: "noUnwrap" },
        { messageId: "noUnwrap" },
      ],
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
    {
      code: `${unwrapSetup}\nconst { unwrapOr } = Result;\nconst v = unwrapOr(r, 0);`,
    },
    {
      code: `declare const box: { unwrap(x: string): string };\nconst { unwrap } = box;\nconst v = unwrap("a");`,
    },
    {
      code: `${unwrapSetup}\nconst key = "unwrapOr" as const;\nconst v = Result[key](r, 0);`,
    },
    {
      code: `${unwrapSetup}\ndeclare const key: "unwrapOr" | "unwrapErr2";\nconst f = Result[key as "unwrapOr"];\nconst [take] = [Result.unwrapOr];\nconst [n] = [1];`,
    },
    // The same key forms on a property that takes no Result, or that is not
    // one of the throwing functions.
    {
      code: `${unwrapSetup}\ndeclare const box: { unwrap(x: string): string; other(x: string): string };\ndeclare const key: "unwrap" | "other";\ndeclare const fns: (typeof Result.unwrapOr)[];\nconst { "unwrap": b } = box;\nconst { [key]: c } = box;\nconst { "unwrapOr": a } = Result;\nlet f: unknown;\n({ "unwrap": f } = box);\n({ unwrapOr: f } = Result);\n[f] = fns;\n[...f] = [Result];\n[f] = new Set([1]);`,
    },
    // A pattern in a signature without a body binds nothing: a function
    // type, an interface member, an overload, a \`declare\` or abstract method.
    {
      code: `${unwrapSetup}\ntype F = ({ unwrap }: typeof Result) => void;\ntype G = ([take]: [typeof Result.unwrap]) => void;\ninterface H {\n  m({ "unwrap": u }: typeof Result): void;\n  new ({ a: { unwrapErr } }: { a: typeof Result }): H;\n}\ndeclare function f({ unwrap }: typeof Result): void;\nabstract class C { abstract m({ unwrap }: typeof Maybe): void; }\nfunction o({ unwrap }: typeof Result): void;\nfunction o(x: unknown) { return x; }`,
    },
    // The checker cannot type a pattern inside a rest element or a for…in
    // target (it throws); the target's own type is used there.
    {
      code: `${unwrapSetup}\ndeclare const fns: (typeof Result.unwrap)[];\nlet t: unknown;\n[...[t]] = fns;\n[...[{ unwrap: t }]] = [Result];\nfor ({ unwrap: t } in Result) {}`,
    },
  ],
});

describe("rule docs", () => {
  // GitHub's heading anchors: lower case, punctuation other than "-" and
  // "_" dropped, spaces turned into hyphens (ASCII headings).
  const slug = (heading: string) =>
    heading
      .toLowerCase()
      .replace(/[^a-z0-9 _-]/g, "")
      .replace(/ /g, "-");
  const headings = readFileSync(
    new URL("../README.md", import.meta.url),
    "utf8"
  )
    .split("\n")
    .filter((line) => /^#{1,6} /.test(line))
    .map((line) => line.replace(/^#+ /, ""));

  it.each(
    Object.keys(plugin.rules)
  )("%s links to its README section", (name) => {
    const heading = headings.find((h) => h.includes(`\`${name}\``));
    expect(heading).toBeDefined();
    const rule = plugin.rules[name as keyof typeof plugin.rules];
    expect(rule.meta.docs?.url).toBe(
      `https://github.com/semyonf/kamchazky#${slug(heading ?? "")}`
    );
  });
});

describe("plugin meta", () => {
  // ESLint keys its cache on the plugin name and version: without a version
  // an upgrade keeps the old, cached results.
  it("exposes the rules under their names", () => {
    expect(plugin.rules).toEqual({
      "must-use-result": mustUseResult,
      "no-unwrap": noUnwrap,
    });
  });

  it("carries the package name and version", () => {
    const pkg = JSON.parse(
      readFileSync(new URL("../package.json", import.meta.url), "utf8")
    ) as { name: string; version: string };
    expect(plugin.meta).toEqual({ name: pkg.name, version: pkg.version });
  });
});
