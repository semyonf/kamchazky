import { describe, expect, test, vi } from "vitest";
import {
  type Maybe,
  Maybe as M,
  type Some,
  err,
  isNone,
  isSome,
  none,
  ok,
  some,
} from "../src/index.js";

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
// Instance methods
// ---------------------------------------------------------------------------

describe("Some methods", () => {
  test(".map transforms the value", () => {
    const m = some(2).map((x) => x * 3);
    expect(m.some).toBe(true);
    expect(m.value).toBe(6);
  });

  test(".flatMap chains to a new Maybe", () => {
    const m = some(5).flatMap((x) => some(x + 1));
    expect(m.some).toBe(true);
    expect((m as Some<number>).value).toBe(6);
  });

  test(".flatMap chains to None", () => {
    const m = some(5).flatMap(() => none());
    expect(m.some).toBe(false);
  });

  test(".filter keeps value when predicate passes", () => {
    const m = some(5).filter((x) => x > 0);
    expect(m.some).toBe(true);
    expect((m as Some<number>).value).toBe(5);
  });

  test(".filter returns None when predicate fails", () => {
    const m = some(5).filter((x) => x > 10);
    expect(m.some).toBe(false);
  });

  test(".inspect calls fn and returns self", () => {
    const spy = vi.fn();
    const m = some(42);
    const returned = m.inspect(spy);
    expect(spy).toHaveBeenCalledWith(42);
    expect(returned).toBe(m);
  });
});

describe("None methods", () => {
  test(".map is a no-op", () => {
    const m = none();
    const mapped = m.map(() => 99);
    expect(mapped).toBe(m);
  });

  test(".flatMap is a no-op", () => {
    const m = none();
    const chained = m.flatMap(() => some(99));
    expect(chained).toBe(m);
  });

  test(".filter is a no-op", () => {
    const m = none();
    const filtered = m.filter(() => true);
    expect(filtered).toBe(m);
  });

  test(".inspect is a no-op", () => {
    const spy = vi.fn();
    const m = none();
    expect(m.inspect(spy)).toBe(m);
    expect(spy).not.toHaveBeenCalled();
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

describe("Maybe.expect", () => {
  test("returns value for Some", () => {
    expect(M.expect(some(42), "should exist")).toBe(42);
  });

  test("throws with custom message for None", () => {
    expect(() => M.expect(none(), "missing value")).toThrow("missing value");
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

// ---------------------------------------------------------------------------
// Maybe <-> Result interop
// ---------------------------------------------------------------------------

describe("Maybe.toResult", () => {
  test("converts Some to Ok", () => {
    const r = M.toResult(some(42), new Error("missing"));
    expect(r.ok && r.value).toBe(42);
  });

  test("converts None to Err", () => {
    const e = new Error("missing");
    const r = M.toResult(none(), e);
    expect(!r.ok && r.error).toBe(e);
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
    const r = Result.fromMaybe(some(42), new Error("missing"));
    expect(r.ok && r.value).toBe(42);
  });

  test("converts None to Err", () => {
    const e = new Error("missing");
    const r = Result.fromMaybe(none(), e);
    expect(!r.ok && r.error).toBe(e);
  });
});

// ---------------------------------------------------------------------------
// Method chaining
// ---------------------------------------------------------------------------

describe("chaining", () => {
  test("some().map().flatMap().filter()", () => {
    const m = some(10)
      .map((x) => x + 5)
      .flatMap((x) => (x > 10 ? some(x) : none()))
      .filter((x) => x < 100);
    expect(m.some && m.value).toBe(15);
  });

  test("none short-circuits through chain", () => {
    const m = none()
      .map(() => 99)
      .flatMap(() => some(100));
    expect(m.some).toBe(false);
  });

  test("inspect chains without transforming", () => {
    const spy = vi.fn();
    const m = some(10)
      .inspect(spy)
      .map((x) => x + 1);
    expect(spy).toHaveBeenCalledWith(10);
    expect(m.some && m.value).toBe(11);
  });
});
