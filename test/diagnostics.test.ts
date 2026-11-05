// The errors of a typed misuse.  The overloads for an untyped (`any`) value
// come after the typed ones and skip a typed call by its argument count, so
// TypeScript reports the error that 3.0.0 reported: at the argument for a
// function with one typed overload, and as "No overload matches this call"
// for one with several.
import { fileURLToPath } from "node:url";
import ts from "typescript";
import { describe, expect, test } from "vitest";

const file = fileURLToPath(new URL("diagnostics-input.ts", import.meta.url));
const options: ts.CompilerOptions = {
  strict: true,
  noEmit: true,
  target: ts.ScriptTarget.ES2022,
  module: ts.ModuleKind.ESNext,
  moduleResolution: ts.ModuleResolutionKind.Bundler,
  lib: ["lib.es2022.d.ts"],
  types: [],
};

function errorsOf(code: string): string[] {
  const text = `import { Maybe, Result } from "../src/index.js";
declare const r: Result<number>;
declare const m: Maybe<number>;
${code}`;
  const host = ts.createCompilerHost(options);
  const { fileExists, getSourceFile, readFile } = host;
  host.fileExists = (name) => name === file || fileExists.call(host, name);
  host.readFile = (name) => (name === file ? text : readFile.call(host, name));
  host.getSourceFile = (name, ...rest) =>
    name === file
      ? ts.createSourceFile(name, text, ts.ScriptTarget.ES2022)
      : getSourceFile.call(host, name, ...rest);
  const program = ts.createProgram([file], options, host);
  return ts
    .getPreEmitDiagnostics(program)
    .map((d) => ts.flattenDiagnosticMessageText(d.messageText, "\n"));
}

describe("the error of a typed misuse", () => {
  test.each([
    [
      `Result.unwrapOr(r, "x");`,
      "Argument of type 'string' is not assignable to parameter of type 'number'.",
    ],
    [
      `Result.unwrapOrElse(r, () => "x");`,
      "Type 'string' is not assignable to type 'number'.",
    ],
    [
      `Result.match(r, { ok: (v: string) => v, err: () => "" });`,
      "Argument of type 'Result<number>' is not assignable to parameter of type 'Result<string, Error>'.",
    ],
    [
      `Result.flatMap(r, (v) => v + 1);`,
      "Type 'number' is not assignable to type 'Result<never, never>'.",
    ],
    [
      `Result.orElse(r, () => 0);`,
      "Type 'number' is not assignable to type 'Result<number, never>'.",
    ],
    [`Result.map(r, (v: string) => v);`, "No overload matches this call."],
    [
      `Maybe.unwrapOr(m, "x");`,
      "Argument of type 'string' is not assignable to parameter of type 'number'.",
    ],
    [
      `Maybe.match(m, { some: (v: string) => v, none: () => "" });`,
      "Argument of type 'Maybe<number>' is not assignable to parameter of type 'Maybe<string>'.",
    ],
    [
      `Maybe.flatMap(m, (v) => v + 1);`,
      "Type 'number' is not assignable to type 'Maybe<never>'.",
    ],
    [
      `Result.fromPromise(1);`,
      "Argument of type 'number' is not assignable to parameter of type 'PromiseLike<unknown>'.",
    ],
    [
      `Result.tryCatchAsync(() => 1);`,
      "Type 'number' is not assignable to type 'PromiseLike<unknown>'.",
    ],
    // One signature, whose input also takes an `Err` or a `Some` of never.
    [
      `Result.unwrap("x");`,
      "Argument of type 'string' is not assignable to parameter of type 'Result<never, never>'.",
    ],
    [
      `Maybe.unwrap(r);`,
      "Argument of type 'Result<number>' is not assignable to parameter of type 'Maybe<never>'.",
    ],
  ])("%s gives the error of 3.0.0", (call, message) => {
    const errors = errorsOf(call);
    expect(errors).toHaveLength(1);
    expect((errors[0] ?? "").split("\n")[0]).toBe(message);
  });

  test("an overload error lists the typed overloads only", () => {
    const [error] = errorsOf(`Result.inspect(r, (v: string) => v);`);
    expect(error).toContain("No overload matches this call.");
    expect(error).not.toMatch(/skip: never/);
  });

  // An overload for an untyped value takes one more argument, of type
  // `never`, so an argument too many is reported there.
  test("an argument too many names the extra argument", () => {
    expect(errorsOf(`Result.unwrapOr(r, 1, 2);`)).toEqual([
      "Argument of type '2' is not assignable to parameter of type 'never'.",
    ]);
  });
});
