import { readFileSync } from "node:fs";
import { createContext, runInContext } from "node:vm";

import ts from "typescript";
import { describe, expect, test, vi } from "vitest";
import {
  err,
  isNone,
  isSome,
  Maybe as M,
  type Maybe,
  none,
  ok,
  some,
} from "../src/index.js";

/** `[a, <hole>, b]`: a sparse array, as `any` input can bring. */
function holey<T>(a: T, b: T): T[] {
  const items = [a];
  items[2] = b;
  return items;
}

// ---------------------------------------------------------------------------
// Factories
// ---------------------------------------------------------------------------

describe("some", () => {
  test("creates a Some", () => {
    const m = some(42);
    expect(m.some).toBe(true);
    expect(m.value).toBe(42);
  });

  test("is frozen", () => {
    expect(Object.isFrozen(some(1))).toBe(true);
  });

  test("works with undefined", () => {
    const m = some(undefined);
    expect(m.some).toBe(true);
    expect(m.value).toBe(undefined);
  });

  test("works with falsy values", () => {
    expect(some(0).value).toBe(0);
    expect(some("").value).toBe("");
    expect(some(false).value).toBe(false);
  });
});

describe("none", () => {
  test("creates a None", () => {
    const m = none();
    expect(m.some).toBe(false);
  });

  test("is frozen", () => {
    expect(Object.isFrozen(none())).toBe(true);
  });

  test("returns the same instance", () => {
    expect(none()).toBe(none());
  });
});

// ---------------------------------------------------------------------------
// Type guards
// ---------------------------------------------------------------------------

describe("isSome / isNone", () => {
  test("isSome returns true for Some", () => {
    expect(isSome(some(1))).toBe(true);
  });

  test("isSome returns false for None", () => {
    expect(isSome(none())).toBe(false);
  });

  test("isNone returns true for None", () => {
    expect(isNone(none())).toBe(true);
  });

  test("isNone returns false for Some", () => {
    expect(isNone(some(1))).toBe(false);
  });
});

// ---------------------------------------------------------------------------
// Standalone transformations
// ---------------------------------------------------------------------------

describe("Maybe.map", () => {
  test("transforms Some value", () => {
    const m = M.map(some(3), (x) => x * 2);
    expect(m.some && m.value).toBe(6);
  });

  test("passes through None", () => {
    const n = none();
    const m = M.map(n, () => 99);
    expect(m.some).toBe(false);
  });
});

describe("Maybe.flatMap", () => {
  test("chains on Some", () => {
    const m = M.flatMap(some(10), (x) => some(x + 5));
    expect(m.some && m.value).toBe(15);
  });

  test("short-circuits on None", () => {
    const m = M.flatMap(none() as Maybe<number>, () => some(99));
    expect(m.some).toBe(false);
  });

  test("propagates None from fn", () => {
    const m = M.flatMap(some(1), () => none());
    expect(m.some).toBe(false);
  });
});

describe("Maybe.flatten", () => {
  test("unwraps nested Some", () => {
    const m = M.flatten(some(some(42)));
    expect(m.some && m.value).toBe(42);
  });

  test("unwraps outer None", () => {
    const m = M.flatten(none() as Maybe<Maybe<number>>);
    expect(m.some).toBe(false);
  });

  test("unwraps inner None", () => {
    const m = M.flatten(some(none()));
    expect(m.some).toBe(false);
  });

  // Through `any` only; 3.0.0 returned the value or a None.
  test.each([
    ["5", () => M.flatten(5 as never), "input"],
    ["some(5)", () => M.flatten(some(5) as never), "value"],
    [
      "some({ some: true })",
      () => M.flatten(some({ some: true }) as never),
      "value",
    ],
  ])("%s throws a TypeError", (_, run, part) => {
    expect(run).toThrow(new TypeError(`Maybe.flatten: ${part} is not a Maybe`));
  });
});

describe("Maybe.filter", () => {
  test("keeps Some when predicate passes", () => {
    const m = M.filter(some(5), (x) => x > 0);
    expect(m.some && m.value).toBe(5);
  });

  test("returns None when predicate fails", () => {
    const m = M.filter(some(-1), (x) => x > 0);
    expect(m.some).toBe(false);
  });

  test("passes through None", () => {
    const m = M.filter(none() as Maybe<number>, () => true);
    expect(m.some).toBe(false);
  });

  test("narrows type with type-guard predicate", () => {
    const m = M.filter(
      some("hello" as string | number),
      (v): v is string => typeof v === "string"
    );
    if (m.some) {
      expect(m.value).toBe("hello");
    }
  });
});

describe("Maybe.inspect", () => {
  test("calls fn for Some", () => {
    const spy = vi.fn();
    const m = some(42);
    const returned = M.inspect(m, spy);
    expect(spy).toHaveBeenCalledWith(42);
    expect(returned).toBe(m);
  });

  test("skips fn for None", () => {
    const spy = vi.fn();
    const m = none();
    const returned = M.inspect(m, spy);
    expect(spy).not.toHaveBeenCalled();
    expect(returned).toBe(m);
  });
});

// ---------------------------------------------------------------------------
// Pattern matching
// ---------------------------------------------------------------------------

describe("Maybe.match", () => {
  test("calls some handler for Some", () => {
    const r = M.match(some(5), {
      some: (v) => v * 2,
      none: () => -1,
    });
    expect(r).toBe(10);
  });

  test("calls none handler for None", () => {
    const r = M.match(none() as Maybe<number>, {
      some: (v) => v * 2,
      none: () => -1,
    });
    expect(r).toBe(-1);
  });
});

// ---------------------------------------------------------------------------
// Extraction
// ---------------------------------------------------------------------------

describe("Maybe.unwrap", () => {
  test("returns value for Some", () => {
    expect(M.unwrap(some(42))).toBe(42);
  });

  test("throws for None", () => {
    expect(() => M.unwrap(none())).toThrow("Called unwrap on None");
  });
});

describe("Maybe.unwrapOr", () => {
  test("returns value for Some", () => {
    expect(M.unwrapOr(some(42), 0)).toBe(42);
  });

  test("returns fallback for None", () => {
    expect(M.unwrapOr(none() as Maybe<number>, 0)).toBe(0);
  });
});

describe("Maybe.unwrapOrElse", () => {
  test("returns value for Some", () => {
    expect(M.unwrapOrElse(some(42), () => 0)).toBe(42);
  });

  test("calls fn for None", () => {
    expect(M.unwrapOrElse(none() as Maybe<number>, () => 99)).toBe(99);
  });

  test("does not call fn for Some", () => {
    const fn = vi.fn(() => 0);
    M.unwrapOrElse(some(42), fn);
    expect(fn).not.toHaveBeenCalled();
  });
});

// Through `any` only, as for the Result functions.
describe("extraction rejects an input that is not a Maybe", () => {
  const inputs: [string, unknown][] = [
    ["5", 5],
    ["null", null],
    ["{ some: true } without a value", { some: true }],
    ["{ some: false, value: 1 }", { some: false, value: 1 }],
  ];
  const calls: [string, (input: never) => unknown][] = [
    ["unwrap", (m) => M.unwrap(m)],
    ["unwrapOr", (m) => M.unwrapOr(m, 0)],
    ["unwrapOrElse", (m) => M.unwrapOrElse(m, () => 0)],
    ["match", (m) => M.match(m, { some: () => 1, none: () => 2 })],
  ];
  describe.each(calls)("Maybe.%s", (name, call) => {
    test.each(inputs)("%s throws a TypeError", (_, input) => {
      expect(() => call(input as never)).toThrow(
        new TypeError(`Maybe.${name}: input is not a Maybe`)
      );
    });
  });
});

describe("Maybe.transpose", () => {
  test("Some(Ok(v)) -> Ok(Some(v))", () => {
    const m = M.transpose(some(ok(42)));
    expect(m.ok).toBe(true);
    if (m.ok) {
      expect(m.value.some).toBe(true);
      if (m.value.some) expect(m.value.value).toBe(42);
    }
  });

  test("Some(Err(e)) -> Err(e)", () => {
    const m = M.transpose(some(err(new Error("fail"))));
    expect(m.ok).toBe(false);
  });

  test("None -> Ok(None)", () => {
    const m = M.transpose(none() as Maybe<Result<number, Error>>);
    expect(m.ok).toBe(true);
    if (m.ok) {
      expect(m.value.some).toBe(false);
    }
  });

  // Through `any` only; 3.0.0 returned an Ok or an Err.
  test.each([
    ["5", () => M.transpose(5 as never), "input is not a Maybe"],
    ["some(5)", () => M.transpose(some(5) as never), "value is not a Result"],
    [
      "some({ ok: false, error: 'denied' })",
      () => M.transpose(some({ ok: false, error: "denied" }) as never),
      "value is not a Result",
    ],
  ])("%s throws a TypeError", (_, run, message) => {
    expect(run).toThrow(new TypeError(`Maybe.transpose: ${message}`));
  });
});

// ---------------------------------------------------------------------------
// Creation helpers
// ---------------------------------------------------------------------------

describe("Maybe.fromNullable", () => {
  test("returns Some for non-null value", () => {
    const m = M.fromNullable(42);
    expect(m.some && m.value).toBe(42);
  });

  test("returns Some for falsy non-null values", () => {
    expect(M.fromNullable(0).some).toBe(true);
    expect(M.fromNullable("").some).toBe(true);
    expect(M.fromNullable(false).some).toBe(true);
  });

  test("returns None for null", () => {
    expect(M.fromNullable(null).some).toBe(false);
  });

  test("returns None for undefined", () => {
    expect(M.fromNullable(undefined).some).toBe(false);
  });
});

describe("Maybe.fromPredicate", () => {
  test("returns Some when predicate passes", () => {
    const m = M.fromPredicate(5, (n) => n > 0);
    expect(m.some && m.value).toBe(5);
  });

  test("returns None when predicate fails", () => {
    const m = M.fromPredicate(-1, (n) => n > 0);
    expect(m.some).toBe(false);
  });

  test("narrows type with type-guard predicate", () => {
    const m = M.fromPredicate(
      "hello" as string | number,
      (v): v is string => typeof v === "string"
    );
    if (m.some) {
      expect(m.value).toBe("hello");
    }
  });
});

// ---------------------------------------------------------------------------
// Combining
// ---------------------------------------------------------------------------

describe("Maybe.all", () => {
  test("combines all Some values into a tuple", () => {
    const m = M.all(some(1), some("two"), some(true));
    expect(m.some && m.value).toEqual([1, "two", true]);
  });

  test("returns None if any is None", () => {
    const m = M.all(some(1), none() as Maybe<string>, some(true));
    expect(m.some).toBe(false);
  });

  test("returns Some([]) for no arguments", () => {
    const m = M.all();
    expect(m.some && m.value).toEqual([]);
  });

  test("works with single argument", () => {
    const m = M.all(some(42));
    expect(m.some && m.value).toEqual([42]);
  });
});

describe("Maybe.firstSome", () => {
  test("returns first Some", () => {
    const m = M.firstSome(none(), some(1), some(2));
    expect(m.some && m.value).toBe(1);
  });

  test("returns None when all None", () => {
    const m = M.firstSome(none(), none(), none());
    expect(m.some).toBe(false);
  });

  test("returns first argument when it is Some", () => {
    const first = some(1);
    const m = M.firstSome(first, some(2));
    expect(m).toBe(first);
  });
});

describe("Maybe.allAsync", () => {
  test("combines all Some promises into a tuple", async () => {
    const m = await M.allAsync(
      Promise.resolve(some(1)),
      Promise.resolve(some(2))
    );
    expect(m.some).toBe(true);
    if (m.some) {
      expect(m.value).toEqual([1, 2]);
    }
  });

  test("rejects with the rejection reason instead of hiding it as None", async () => {
    const boom = new Error("boom");
    await expect(
      M.allAsync(
        Promise.resolve(some(1)),
        Promise.reject(boom) as Promise<Maybe<number>>
      )
    ).rejects.toBe(boom);
  });

  test("a rejection wins over a None that comes before it", async () => {
    const boom = new Error("boom");
    await expect(
      M.allAsync(
        Promise.resolve(none()),
        Promise.reject(boom) as Promise<Maybe<number>>
      )
    ).rejects.toBe(boom);
  });

  test("rejects with the first rejection in argument order", async () => {
    const first = new Error("first");
    const second = new Error("second");
    const late = new Promise<Maybe<number>>((_, reject) =>
      setTimeout(() => reject(first), 5)
    );
    await expect(
      M.allAsync(late, Promise.reject(second) as Promise<Maybe<number>>)
    ).rejects.toBe(first);
  });

  test("returns None when any resolved value is None", async () => {
    const m = await M.allAsync(
      Promise.resolve(some(1)),
      Promise.resolve(none())
    );
    expect(m.some).toBe(false);
  });
});

// ---------------------------------------------------------------------------
// Maybe <-> Result interop
// ---------------------------------------------------------------------------

describe("Maybe.toResult", () => {
  test("converts Some to Ok", () => {
    const r = M.toResult(some(42), () => new Error("missing"));
    expect(r.ok && r.value).toBe(42);
  });

  test("converts None to Err", () => {
    const r = M.toResult(none(), () => new Error("missing"));
    expect(!r.ok && r.error.message).toBe("missing");
  });

  test("does not call errorFactory for Some", () => {
    const factory = vi.fn(() => new Error("missing"));
    M.toResult(some(42), factory);
    expect(factory).not.toHaveBeenCalled();
  });
});

describe("Maybe.fromResult", () => {
  test("converts Ok to Some", () => {
    const m = M.fromResult(ok(42));
    expect(m.some && m.value).toBe(42);
  });

  test("converts Err to None", () => {
    const m = M.fromResult(err(new Error("fail")));
    expect(m.some).toBe(false);
  });
});

// (Also test Result.toMaybe / Result.fromMaybe from Result side)
import { Result } from "../src/index.js";

describe("Result.toMaybe", () => {
  test("converts Ok to Some", () => {
    const m = Result.toMaybe(ok(42));
    expect(m.some && m.value).toBe(42);
  });

  test("converts Err to None", () => {
    const m = Result.toMaybe(err(new Error()));
    expect(m.some).toBe(false);
  });
});

describe("Result.fromMaybe", () => {
  test("converts Some to Ok", () => {
    const r = Result.fromMaybe(some(42), () => new Error("missing"));
    expect(r.ok && r.value).toBe(42);
  });

  test("converts None to Err", () => {
    const r = Result.fromMaybe(none(), () => new Error("missing"));
    expect(!r.ok && r.error.message).toBe("missing");
  });

  test("does not call errorFactory for Some", () => {
    const factory = vi.fn(() => new Error("missing"));
    Result.fromMaybe(some(42), factory);
    expect(factory).not.toHaveBeenCalled();
  });
});

// ---------------------------------------------------------------------------
// Array arguments for combinators
// ---------------------------------------------------------------------------

describe("Maybe combinators accept an array", () => {
  const many = Array.from({ length: 150_000 }, (_, i) => some(i));

  test("Maybe.all", () => {
    const m = M.all([some(1), some(2)]);
    expect(m.some && m.value).toEqual([1, 2]);
    expect(M.all([some(1), none()]).some).toBe(false);
    const big = M.all(many);
    expect(big.some && big.value.length).toBe(150_000);
  });

  test("Maybe.allAsync", async () => {
    const m = await M.allAsync([
      Promise.resolve(some(1)),
      Promise.resolve(some(2)),
    ]);
    expect(m.some && m.value).toEqual([1, 2]);
  });

  test("Maybe.firstSome", () => {
    const m = M.firstSome([none(), some(2)]);
    expect(m.some && m.value).toBe(2);
  });

  test("a single Maybe argument is still the rest form", () => {
    const m = M.all(some([1, 2]));
    expect(m.some && m.value).toEqual([[1, 2]]);
  });

  test("point-free in map and Array.from", async () => {
    const groups = [[some(1), some(2)], [none(), some(3)], []];
    expect(groups.map(M.all)).toEqual([some([1, 2]), none(), some([])]);
    // Array.from as plain JavaScript calls it; TypeScript rejects the call.
    const from = Array.from as (items: unknown[], fn: unknown) => unknown[];
    expect(from(groups, M.all)).toEqual(groups.map(M.all));
    expect(groups.map(M.firstSome)).toEqual([some(1), some(3), none()]);
    const pending = groups.map((g) => g.map((m) => Promise.resolve(m)));
    expect(await Promise.all(pending.map(M.allAsync))).toEqual(
      groups.map(M.all)
    );
  });
});

// ---------------------------------------------------------------------------
// None is one object across the CJS and ESM builds
// ---------------------------------------------------------------------------

describe("None identity", () => {
  const key = Symbol.for("@semyonf/kamchazky/none");
  const registry = globalThis as Record<symbol, unknown>;

  test("none() is registered under a global symbol", () => {
    expect(registry[key]).toBe(none());
  });

  test("the registration cannot be overwritten", () => {
    expect(() => {
      registry[key] = { some: true, value: 1 };
    }).toThrow(TypeError);
    expect(registry[key]).toBe(none());
  });

  test("another copy of the library reuses the registered None", async () => {
    vi.resetModules();
    const copy = await import("../src/index.js");
    expect(copy.none()).toBe(none());
  });
});

/** The library compiled to CommonJS, to load it into a fresh vm realm. */
const moduleSource = ts.transpileModule(
  readFileSync(new URL("../src/index.ts", import.meta.url), "utf8"),
  {
    compilerOptions: {
      module: ts.ModuleKind.CommonJS,
      target: ts.ScriptTarget.ES2022,
    },
  }
).outputText;

describe("a foreign value under the registry key is not used as None", () => {
  // The real registration is non-configurable, so each case runs in a
  // fresh realm with its own global object.
  const load = (setup: string) => {
    const context = createContext({});
    runInContext(setup, context);
    const exports: Record<string, unknown> = {};
    runInContext(`(function (exports) { ${moduleSource} })`, context)(exports);
    return exports as { none: () => unknown; Maybe: typeof M };
  };

  test.each([
    [
      "a Some",
      `globalThis[Symbol.for("@semyonf/kamchazky/none")] = { some: true, value: "x" };`,
    ],
    [
      "a mutable { some: false }",
      `globalThis[Symbol.for("@semyonf/kamchazky/none")] = { some: false };`,
    ],
    [
      "a frozen None with extra keys",
      `globalThis[Symbol.for("@semyonf/kamchazky/none")] = Object.freeze({ some: false, value: 1 });`,
    ],
    [
      "a throwing getter",
      `Object.defineProperty(globalThis, Symbol.for("@semyonf/kamchazky/none"), { get() { throw new Error("x"); } });`,
    ],
  ])("%s", (_, setup) => {
    const lib = load(setup);
    const n = lib.none();
    expect(n).toEqual({ some: false });
    expect(Object.isFrozen(n)).toBe(true);
    expect(lib.Maybe.isNone(n as never)).toBe(true);
    expect(lib.none()).toBe(n);
  });

  test("a frozen None from another copy is reused", () => {
    const context = createContext({});
    const shared = runInContext(
      `globalThis[Symbol.for("@semyonf/kamchazky/none")] = Object.freeze({ some: false });`,
      context
    );
    const exports: Record<string, unknown> = {};
    runInContext(`(function (exports) { ${moduleSource} })`, context)(exports);
    expect((exports as { none: () => unknown }).none()).toBe(shared);
  });
});

describe("Maybe combinators reject items that are not Maybes", () => {
  const bad = (x: unknown) => x as Maybe<number>;

  test.each([
    ["all([[some(1)]])", () => M.all([bad([some(1)])]), "Maybe.all: item 0"],
    ["all([null])", () => M.all([bad(null)]), "Maybe.all: item 0"],
    [
      "all(sparse)",
      () => M.all(holey(some(1), some(2)) as Maybe<number>[]),
      "Maybe.all: item 1",
    ],
    [
      "firstSome(sparse)",
      () =>
        M.firstSome(holey<Maybe<number>>(none(), some(2)) as Maybe<number>[]),
      "Maybe.firstSome: item 1",
    ],
    ["firstSome([1])", () => M.firstSome([bad(1)]), "Maybe.firstSome: item 0"],
  ])("%s throws a TypeError", (_, run, message) => {
    expect(run).toThrow(new TypeError(`${message} is not a Maybe`));
  });

  test.each([
    ["a Some without a value", { some: true }],
    ["a None with a value", { some: false, value: 1 }],
  ])("all, firstSome and allAsync reject %s", async (_, item) => {
    expect(() => M.all([bad(item)])).toThrow(
      new TypeError("Maybe.all: item 0 is not a Maybe")
    );
    expect(() => M.firstSome([bad(item)])).toThrow(
      new TypeError("Maybe.firstSome: item 0 is not a Maybe")
    );
    await expect(M.allAsync([Promise.resolve(bad(item))])).rejects.toThrow(
      new TypeError("Maybe.allAsync: item 0 is not a Maybe")
    );
  });

  test("allAsync checks every item before it rejects with a rejection", async () => {
    await expect(
      M.allAsync([
        Promise.reject(new Error("first")) as Promise<Maybe<number>>,
        Promise.resolve(bad(42)),
      ])
    ).rejects.toThrow(new TypeError("Maybe.allAsync: item 1 is not a Maybe"));
  });

  test("allAsync rejects when a promise resolves to a non-Maybe", async () => {
    await expect(
      M.allAsync([Promise.resolve(some(1)), Promise.resolve(bad(2))])
    ).rejects.toThrow(new TypeError("Maybe.allAsync: item 1 is not a Maybe"));
  });
});
