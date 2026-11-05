// Checks of the built package (CommonJS and ESM).  `npm run build` must run
// first, as in CI.
import { execFileSync, spawnSync } from "node:child_process";
import {
  copyFileSync,
  existsSync,
  mkdirSync,
  mkdtempSync,
  readFileSync,
  rmSync,
  symlinkSync,
  writeFileSync,
} from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";

import { describe, expect, test } from "vitest";

const dist = fileURLToPath(new URL("../dist/", import.meta.url));
const tsc = fileURLToPath(
  new URL("../node_modules/typescript/bin/tsc", import.meta.url)
);
const consumer = fileURLToPath(new URL("consumer/", import.meta.url));
const modules = fileURLToPath(new URL("../node_modules/", import.meta.url));

function run(code: string, type: "module" | "commonjs"): string {
  return execFileSync(process.execPath, [`--input-type=${type}`, "-e", code], {
    cwd: dist,
    encoding: "utf8",
  }).trim();
}

describe("built package", () => {
  test("dist exists (run `npm run build` first)", () => {
    expect(existsSync(`${dist}index.js`)).toBe(true);
    expect(existsSync(`${dist}index.cjs`)).toBe(true);
  });

  test("none() is one object across the CommonJS and ESM builds", () => {
    const out = run(
      `import { createRequire } from "node:module";
       const esm = await import("./index.js");
       const cjs = createRequire(import.meta.url)("./index.cjs");
       console.log(esm.none() === cjs.none());`,
      "module"
    );
    expect(out).toBe("true");
  });

  test("Results from one build work with the other", () => {
    const out = run(
      `import { createRequire } from "node:module";
       const esm = await import("./index.js");
       const cjs = createRequire(import.meta.url)("./index.cjs");
       console.log(
         esm.Result.isOk(cjs.Result.ok(1)),
         cjs.Result.match(esm.Result.err(new Error("x")), { ok: () => "ok", err: (e) => e.message }),
         esm.Result.isResult(cjs.Result.ok(1))
       );`,
      "module"
    );
    expect(out).toBe("true x true");
  });

  test("ESM loads with a non-extensible global object", () => {
    const out = run(
      `Object.preventExtensions(globalThis);
       const { none, Maybe } = await import("./index.js");
       console.log(JSON.stringify(none()), none() === none(), Maybe.isNone(none()));`,
      "module"
    );
    expect(out).toBe(`{"some":false} true true`);
  });

  test("CommonJS loads with a non-extensible global object", () => {
    const out = run(
      `Object.preventExtensions(globalThis);
       const { none } = require("./index.cjs");
       console.log(JSON.stringify(none()), none() === none());`,
      "commonjs"
    );
    expect(out).toBe(`{"some":false} true`);
  });

  test("a foreign value under the key is not returned by none()", () => {
    const out = run(
      `globalThis[Symbol.for("@semyonf/kamchazky/none")] = { some: true, value: "x" };
       const { none, Maybe } = await import("./index.js");
       console.log(JSON.stringify(none()), Maybe.isNone(none()));`,
      "module"
    );
    expect(out).toBe(`{"some":false} true`);
  });

  test("both builds of the ESLint plugin carry the package version", () => {
    const { version } = JSON.parse(
      readFileSync(new URL("../package.json", import.meta.url), "utf8")
    ) as { version: string };
    const out = run(
      `import { createRequire } from "node:module";
       const esm = (await import("./eslint.js")).default;
       const cjs = createRequire(import.meta.url)("./eslint.cjs");
       console.log(esm.meta.version, cjs.meta.version);`,
      "module"
    );
    expect(out).toBe(`${version} ${version}`);
  });

  test("a None that 3.0.0 registered with an assignment is made read-only", () => {
    const out = run(
      `const key = Symbol.for("@semyonf/kamchazky/none");
       const shared = Object.freeze({ some: false });
       globalThis[key] = shared;
       const { none } = await import("./index.js");
       const d = Object.getOwnPropertyDescriptor(globalThis, key);
       console.log(none() === shared, d.value === shared, d.writable, d.configurable);`,
      "module"
    );
    expect(out).toBe("true true false false");
  });

  test("import and require of the ESLint entry give one plugin object", () => {
    // ESLint refuses two different objects under one plugin name, as when a
    // CommonJS shared config and an ESM config both bring the plugin.
    const out = run(
      `import { createRequire } from "node:module";
       const esm = (await import("./eslint.js")).default;
       const cjs = createRequire(import.meta.url)("./eslint.cjs");
       console.log(esm === cjs);`,
      "module"
    );
    expect(out).toBe("true");
  });

  test("the ESM ESLint entry loads with a TypeScript that has no named ESM exports", () => {
    // TypeScript before 5.5 is CommonJS that Node cannot list named exports
    // of, so `import * as ts from "typescript"` gets no `TypeFlags`.  A copy
    // of the built entries next to such a `typescript` reproduces it.
    const dir = mkdtempSync(join(tmpdir(), "kamchazky-ts54-"));
    try {
      mkdirSync(join(dir, "dist"));
      for (const file of ["eslint.js", "eslint.cjs"]) {
        copyFileSync(join(dist, file), join(dir, "dist", file));
      }
      writeFileSync(join(dir, "package.json"), '{ "type": "module" }');
      const fake = join(dir, "node_modules", "typescript");
      mkdirSync(fake, { recursive: true });
      writeFileSync(join(fake, "package.json"), '{ "main": "index.js" }');
      writeFileSync(
        join(fake, "index.js"),
        `module.exports = Object.assign({}, require(${JSON.stringify(
          join(modules, "typescript")
        )}));`
      );
      symlinkSync(
        join(modules, "@typescript-eslint"),
        join(dir, "node_modules", "@typescript-eslint")
      );
      const entry = pathToFileURL(join(dir, "dist", "eslint.js")).href;
      const out = run(
        `const p = (await import(${JSON.stringify(entry)})).default;
         console.log(Object.keys(p.rules).sort().join(","));`,
        "module"
      );
      expect(out).toBe("must-use-result,no-unwrap");
    } finally {
      rmSync(dir, { recursive: true, force: true });
    }
  });

  test("require of the ESLint entry returns the plugin object", () => {
    const out = run(
      `const p = require("./eslint.cjs");
       console.log(Object.keys(p.rules).sort().join(","));`,
      "commonjs"
    );
    expect(out).toBe("must-use-result,no-unwrap");
  });

  test("tryCatch leaves the rejection of a returned Promise unhandled", () => {
    const out = run(
      `const seen = [];
       process.on("unhandledRejection", (e) => seen.push(e.message));
       const { Result } = await import("./index.js");
       const r = Result.tryCatch(async () => { throw new Error("audit insert failed"); });
       await new Promise((resolve) => setTimeout(resolve, 20));
       console.log(r.ok, r.error.name, JSON.stringify(seen));`,
      "module"
    );
    expect(out).toBe(`false TypeError ["audit insert failed"]`);
  });

  test("with onError the Err holds the mapped error, and the rejection still surfaces", () => {
    const out = run(
      `const seen = [];
       process.on("unhandledRejection", (e) => seen.push(e.message));
       const { Result } = await import("./index.js");
       const r = Result.tryCatch(
         async () => { throw new Error("audit insert failed"); },
         (e) => new RangeError(e.name)
       );
       await new Promise((resolve) => setTimeout(resolve, 20));
       console.log(r.ok, r.error.name, r.error.message, JSON.stringify(seen));`,
      "module"
    );
    expect(out).toBe(`false RangeError TypeError ["audit insert failed"]`);
  });

  test("tryCatch does not run a lazy thenable", () => {
    const out = run(
      `const { Result } = await import("./index.js");
       let executed = 0;
       const query = { where() { return this; }, then(res) { executed++; res(3); } };
       const r = Result.tryCatch(() => query.where());
       await new Promise((resolve) => setTimeout(resolve, 10));
       console.log(r.ok, executed);`,
      "module"
    );
    expect(out).toBe("false 0");
  });

  test("a consumer with declaration: true re-exports and spreads Result and Maybe", () => {
    // test/consumer imports the package by its own name, so the types come
    // from dist/index.d.ts (ESM) and dist/index.d.cts (CommonJS).
    const out = mkdtempSync(join(tmpdir(), "kamchazky-consumer-"));
    try {
      const run = spawnSync(
        process.execPath,
        [
          tsc,
          "-p",
          `${consumer}tsconfig.json`,
          "--noEmit",
          "false",
          "--outDir",
          out,
        ],
        { encoding: "utf8" }
      );
      expect(run.stdout + run.stderr).toBe("");
      expect(run.status).toBe(0);
      for (const file of ["esm.d.mts", "cjs.d.cts"]) {
        expect(readFileSync(join(out, file), "utf8")).toContain("AppResult");
      }
    } finally {
      rmSync(out, { recursive: true, force: true });
    }
    // A full tsc run takes about 4.5 s alone, more next to other test files.
  }, 30_000);
});
