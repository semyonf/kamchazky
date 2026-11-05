import { describe, expectTypeOf, test } from "vitest";
import {
  isNone,
  isSome,
  Maybe as M,
  type Maybe,
  type None,
  none,
  ok,
  Result as R,
  type Result,
  type Some,
  some,
} from "../src/index.js";

// ---------------------------------------------------------------------------
// Factory return types
// ---------------------------------------------------------------------------

describe("some / none return types", () => {
  test("some(42) → Some<number>", () => {
    expectTypeOf(some(42)).toEqualTypeOf<Some<number>>();
  });

  test("some('hello') → Some<string>", () => {
    expectTypeOf(some("hello")).toEqualTypeOf<Some<string>>();
  });

  test("none() → None", () => {
    expectTypeOf(none()).toEqualTypeOf<None>();
  });
});

// ---------------------------------------------------------------------------
// Some / None fields
// ---------------------------------------------------------------------------

describe("Some shape", () => {
  test(".some is true", () => {
    expectTypeOf(some(1).some).toEqualTypeOf<true>();
  });

  test(".value has the value type", () => {
    expectTypeOf(some(1).value).toEqualTypeOf<number>();
  });
});

describe("None shape", () => {
  test(".some is false", () => {
    expectTypeOf(none().some).toEqualTypeOf<false>();
  });
});

// ---------------------------------------------------------------------------
// Type guard narrowing
// ---------------------------------------------------------------------------

describe("isSome / isNone narrowing", () => {
  test("isSome narrows to Some", () => {
    const m = some(1) as Maybe<number>;
    if (isSome(m)) {
      expectTypeOf(m).toEqualTypeOf<Some<number>>();
    }
  });

  test("isNone narrows to None", () => {
    const m = none() as Maybe<number>;
    if (isNone(m)) {
      expectTypeOf(m).toEqualTypeOf<None>();
    }
  });

  test(".some discriminant narrows both branches", () => {
    function check(m: Maybe<string>) {
      if (m.some) {
        expectTypeOf(m).toEqualTypeOf<Some<string>>();
        expectTypeOf(m.value).toEqualTypeOf<string>();
      } else {
        expectTypeOf(m).toEqualTypeOf<None>();
      }
    }
    check(some("x"));
  });
});

// ---------------------------------------------------------------------------
// Instance method return types
// ---------------------------------------------------------------------------

// ---------------------------------------------------------------------------
// Standalone function types
// ---------------------------------------------------------------------------

describe("Maybe.map types", () => {
  test("preserves Some when input is Some", () => {
    expectTypeOf(M.map(some(1), String)).toEqualTypeOf<Some<string>>();
  });

  test("returns Maybe when input is Maybe", () => {
    function check(m: Maybe<number>) {
      expectTypeOf(M.map(m, String)).toEqualTypeOf<Maybe<string>>();
    }
    check(some(1));
  });
});

describe("Maybe.flatMap types", () => {
  test("returns Maybe<U>", () => {
    function check(m: Maybe<number>) {
      const result = M.flatMap(m, (n) => some(String(n)));
      expectTypeOf(result).toEqualTypeOf<Maybe<string>>();
    }
    check(some(1));
  });
});

describe("Maybe.flatten types", () => {
  test("unwraps nested Maybe", () => {
    function check(m: Maybe<Maybe<number>>) {
      expectTypeOf(M.flatten(m)).toEqualTypeOf<Maybe<number>>();
    }
    check(some(some(1)));
  });
});

describe("Maybe.filter types", () => {
  test("narrows with type guard", () => {
    function check(m: Maybe<string | number>) {
      const filtered = M.filter(m, (v): v is string => typeof v === "string");
      expectTypeOf(filtered).toEqualTypeOf<Maybe<string>>();
    }
    check(some("x"));
  });

  test("preserves type with boolean predicate", () => {
    function check(m: Maybe<number>) {
      expectTypeOf(M.filter(m, (x) => x > 0)).toEqualTypeOf<Maybe<number>>();
    }
    check(some(1));
  });
});

describe("Maybe.inspect types", () => {
  test("preserves Some when input is Some", () => {
    expectTypeOf(M.inspect(some(1), () => {})).toEqualTypeOf<Some<number>>();
  });

  test("preserves Maybe when input is Maybe", () => {
    function check(m: Maybe<number>) {
      expectTypeOf(M.inspect(m, () => {})).toEqualTypeOf<Maybe<number>>();
    }
    check(some(1));
  });
});

// ---------------------------------------------------------------------------
// match
// ---------------------------------------------------------------------------

describe("Maybe.match types", () => {
  test("return type unifies handler returns", () => {
    function check(m: Maybe<number>) {
      const out = M.match(m, {
        some: (v) => String(v),
        none: () => "nothing",
      });
      expectTypeOf(out).toEqualTypeOf<string>();
    }
    check(some(1));
  });
});

// ---------------------------------------------------------------------------
// Extraction types
// ---------------------------------------------------------------------------

describe("extraction types", () => {
  test("unwrap returns T", () => {
    function check(m: Maybe<number>) {
      expectTypeOf(M.unwrap(m)).toEqualTypeOf<number>();
    }
    check(some(1));
  });

  test("unwrapOr returns T", () => {
    function check(m: Maybe<number>) {
      expectTypeOf(M.unwrapOr(m, 0)).toEqualTypeOf<number>();
    }
    check(some(1));
  });
});

// ---------------------------------------------------------------------------
// fromNullable / fromPredicate
// ---------------------------------------------------------------------------

describe("Maybe.fromNullable types", () => {
  test("strips null | undefined from value type", () => {
    function check(v: string | null | undefined) {
      const m = M.fromNullable(v);
      if (m.some) {
        expectTypeOf(m.value).toEqualTypeOf<string>();
      }
    }
    check("hello");
  });
});

describe("Maybe.fromPredicate types", () => {
  test("narrows with type-guard predicate", () => {
    const v: string | number = "hello";
    const m = M.fromPredicate(v, (x): x is string => typeof x === "string");
    if (m.some) {
      expectTypeOf(m.value).toEqualTypeOf<string>();
    }
  });

  test("preserves type with boolean predicate", () => {
    function check(n: number) {
      const m = M.fromPredicate(n, (x) => x > 0);
      if (m.some) {
        expectTypeOf(m.value).toEqualTypeOf<number>();
      }
    }
    check(42);
  });
});

// ---------------------------------------------------------------------------
// all tuple inference
// ---------------------------------------------------------------------------

describe("Maybe.all types", () => {
  test("produces tuple of values", () => {
    const m = M.all(some(1), some("two"), some(true));
    if (m.some) {
      const [a, b, c] = m.value;
      expectTypeOf(a).toEqualTypeOf<number>();
      expectTypeOf(b).toEqualTypeOf<string>();
      expectTypeOf(c).toEqualTypeOf<boolean>();
    }
  });

  test("empty args → Some with empty tuple", () => {
    const m = M.all();
    if (m.some) {
      expectTypeOf(m.value.length).toEqualTypeOf<0>();
    }
  });
});

// ---------------------------------------------------------------------------
// Interop types
// ---------------------------------------------------------------------------

describe("Maybe.toResult types", () => {
  test("returns Result<T, E>", () => {
    function check(m: Maybe<number>) {
      const r = M.toResult(m, () => new TypeError("missing"));
      if (r.ok) {
        expectTypeOf(r.value).toEqualTypeOf<number>();
      } else {
        expectTypeOf(r.error).toEqualTypeOf<TypeError>();
      }
    }
    check(some(1));
  });
});

describe("Maybe.fromResult types", () => {
  test("returns Maybe<T>", () => {
    function check(r: Result<number, Error>) {
      const m = M.fromResult(r);
      if (m.some) {
        expectTypeOf(m.value).toEqualTypeOf<number>();
      }
    }
    check(ok(1));
  });
});

describe("Result.toMaybe types", () => {
  test("returns Maybe<T>", () => {
    function check(r: Result<number, Error>) {
      const m = R.toMaybe(r);
      if (m.some) {
        expectTypeOf(m.value).toEqualTypeOf<number>();
      }
    }
    check(ok(1));
  });
});

describe("Result.fromMaybe types", () => {
  test("returns Result<T, E>", () => {
    function check(m: Maybe<number>) {
      const r = R.fromMaybe(m, () => new TypeError("missing"));
      if (r.ok) {
        expectTypeOf(r.value).toEqualTypeOf<number>();
      } else {
        expectTypeOf(r.error).toEqualTypeOf<TypeError>();
      }
    }
    check(some(1));
  });
});

// ---------------------------------------------------------------------------
// Precision
// ---------------------------------------------------------------------------

describe("Maybe precision", () => {
  const m = none() as Maybe<number>;

  test("firstSome with different types gives their union", () => {
    expectTypeOf(M.firstSome(some(1), some("a"))).toEqualTypeOf<
      Maybe<number | string>
    >();
    expectTypeOf(M.firstSome([some(1), some("a")])).toEqualTypeOf<
      Maybe<number | string>
    >();
  });

  test("firstSome of Nones holds never", () => {
    expectTypeOf(M.firstSome(none(), none())).toEqualTypeOf<Maybe<never>>();
  });

  test("map on None stays None", () => {
    expectTypeOf(M.map(none(), (x) => x)).toEqualTypeOf<None>();
  });

  test("flatMap with a callback that only throws holds never", () => {
    const fail = (v: unknown): never => {
      throw new Error(String(v));
    };
    expectTypeOf(M.flatMap(m, (v) => fail(v))).toEqualTypeOf<Maybe<never>>();
    expectTypeOf(
      M.flatMap(m, () => {
        throw new Error("x");
      })
    ).toEqualTypeOf<Maybe<never>>();
  });

  test("flatMap returning only None holds never", () => {
    expectTypeOf(M.flatMap(m, () => none())).toEqualTypeOf<Maybe<never>>();
  });

  test("match branches may differ", () => {
    expectTypeOf(
      M.match(m, { some: (v) => v, none: () => "none" })
    ).toEqualTypeOf<number | string>();
  });

  test("unwrap of None is never", () => {
    expectTypeOf(M.unwrap(none())).toEqualTypeOf<never>();
  });

  test("transpose of Some(Ok) or None adds no error", () => {
    expectTypeOf(M.transpose(some(ok(1)))).toEqualTypeOf<
      Result<Maybe<number>, never>
    >();
    expectTypeOf(M.transpose(none())).toEqualTypeOf<
      Result<Maybe<unknown>, never>
    >();
  });

  test("allAsync accepts PromiseLike", async () => {
    const pl = Promise.resolve(some(1)) as PromiseLike<Maybe<number>>;
    expectTypeOf(await M.allAsync(pl)).toEqualTypeOf<
      Maybe<readonly [number]>
    >();
  });
});

describe("Maybe.firstSome explicit type argument (1.x form)", () => {
  test("firstSome<number>(...) compiles", () => {
    expectTypeOf(M.firstSome<number>(some(1), some(2))).toEqualTypeOf<
      Maybe<number>
    >();
    expectTypeOf(M.firstSome<number>([some(1)])).toEqualTypeOf<Maybe<number>>();
  });
});

describe("Maybe.map rejects async callbacks", () => {
  const m = some(1) as Maybe<number>;

  test("async callback: the result is not a Maybe", () => {
    const mapped = M.map(m, async (x) => x + 1);
    expectTypeOf(mapped).not.toMatchTypeOf<Maybe<unknown>>();
    // @ts-expect-error — map does not await
    mapped.some;
  });

  test("generic callback compiles", () => {
    function mapAll<U>(mm: Maybe<number>, f: (n: number) => U) {
      return M.map(mm, f);
    }
    expectTypeOf(mapAll(m, String)).toEqualTypeOf<Maybe<string>>();
  });

  test("sync callbacks keep their types", () => {
    expectTypeOf(M.map(m, String)).toEqualTypeOf<Maybe<string>>();
    expectTypeOf(M.map(some(1), String)).toEqualTypeOf<Some<string>>();
    expectTypeOf(M.map(none(), String)).toEqualTypeOf<None>();
  });

  test("filter and flatMap already reject async functions", () => {
    // @ts-expect-error — a predicate must return boolean
    M.filter(m, async () => true);
    // @ts-expect-error — flatMap needs a Maybe, not a Promise
    M.flatMap(m, async (x) => some(x));
  });
});

// ---------------------------------------------------------------------------
// An `any` input: the value is `unknown`, never `never`.
// ---------------------------------------------------------------------------

describe("an any input is not taken for never or for one branch", () => {
  const untyped = JSON.parse("null");
  const m = none() as Maybe<number>;

  test("unwrap / unwrapOr give unknown, unwrapOrElse what fn returns", () => {
    expectTypeOf(M.unwrap(untyped)).toEqualTypeOf<unknown>();
    expectTypeOf(M.unwrapOr(untyped, 1)).toEqualTypeOf<unknown>();
    // unwrapOrElse keeps the types of 3.0.0.
    expectTypeOf(M.unwrapOrElse(untyped, () => 1)).toEqualTypeOf<number>();
    const v = M.unwrap(untyped);
    // @ts-expect-error — unknown does not assign to string
    const s: string = v;
    void s;
  });

  test("map / inspect do not assume Some", () => {
    expectTypeOf(M.map(untyped, () => 1)).toEqualTypeOf<Maybe<number>>();
    expectTypeOf(M.inspect(untyped, () => {})).toEqualTypeOf<Maybe<unknown>>();
  });

  test("an annotated callback does not pick the Some overload", () => {
    expectTypeOf(M.map(untyped, (v: number) => v + 1)).toEqualTypeOf<
      Maybe<number>
    >();
    expectTypeOf(M.inspect(untyped, (v: number) => void v)).toEqualTypeOf<
      Maybe<unknown>
    >();
    expectTypeOf(M.flatMap(untyped, (v: number) => some(v))).toEqualTypeOf<
      Maybe<number>
    >();
    expectTypeOf(
      M.match(untyped, { some: (v: number) => v, none: () => "none" })
    ).toEqualTypeOf<number | string>();
    // @ts-expect-error — value exists only on a Some
    M.map(untyped, (v: number) => v + 1).value;
    const p = M.map(untyped, async (v: number) => v);
    // @ts-expect-error — an async callback still gives no Maybe
    p.some;
  });

  test("flatMap / match / transpose", () => {
    expectTypeOf(M.flatMap(untyped, () => some(1))).toEqualTypeOf<
      Maybe<number>
    >();
    expectTypeOf(M.flatMap(m, () => untyped)).toEqualTypeOf<Maybe<unknown>>();
    expectTypeOf(
      M.match(untyped, { some: (v) => v, none: () => 0 })
    ).toEqualTypeOf<unknown>();
    expectTypeOf(M.transpose(untyped)).toEqualTypeOf<
      Result<Maybe<unknown>, Error>
    >();
  });

  test("typed inputs keep their precise types", () => {
    expectTypeOf(M.map(none(), (x) => x)).toEqualTypeOf<None>();
    expectTypeOf(M.flatMap(m, () => none())).toEqualTypeOf<Maybe<never>>();
    expectTypeOf([m].map(M.unwrap)).toEqualTypeOf<number[]>();
  });
});

describe("an any value from the map callback becomes unknown", () => {
  test("Maybe.map", () => {
    const m = none() as Maybe<number>;
    expectTypeOf(M.map(m, () => JSON.parse("1"))).toEqualTypeOf<
      Maybe<unknown>
    >();
    expectTypeOf(M.map(some(1), () => JSON.parse("1"))).toEqualTypeOf<
      Maybe<unknown>
    >();
    expectTypeOf(
      M.map(JSON.parse("null"), () => JSON.parse("1"))
    ).toEqualTypeOf<Maybe<unknown>>();
    expectTypeOf(
      M.map(m, () => {
        throw new Error();
      })
    ).toEqualTypeOf<Maybe<never>>();
  });
});
