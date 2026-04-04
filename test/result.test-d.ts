import { describe, expectTypeOf, test } from "vitest";
import {
  type ErrResult,
  err,
  isErr,
  isOk,
  normalizeError,
  type OkResult,
  ok,
  Result,
} from "../src/index.js";

// ---------------------------------------------------------------------------
// Factory return types
// ---------------------------------------------------------------------------

describe("ok / err return types", () => {
  test("ok(42) → OkResult<number>", () => {
    expectTypeOf(ok(42)).toEqualTypeOf<OkResult<number>>();
  });

  test("ok('hello') → OkResult<string>", () => {
    expectTypeOf(ok("hello")).toEqualTypeOf<OkResult<string>>();
  });

  test("err(new TypeError()) → ErrResult<TypeError>", () => {
    expectTypeOf(err(new TypeError())).toEqualTypeOf<ErrResult<TypeError>>();
  });

  test("err(new Error()) → ErrResult<Error>", () => {
    expectTypeOf(err(new Error())).toEqualTypeOf<ErrResult<Error>>();
  });
});

// ---------------------------------------------------------------------------
// OkResult / ErrResult fields
// ---------------------------------------------------------------------------

describe("OkResult shape", () => {
  test(".ok is true", () => {
    expectTypeOf(ok(1).ok).toEqualTypeOf<true>();
  });

  test(".value has the value type", () => {
    expectTypeOf(ok(1).value).toEqualTypeOf<number>();
  });
});

describe("ErrResult shape", () => {
  test(".ok is false", () => {
    expectTypeOf(err(new Error()).ok).toEqualTypeOf<false>();
  });

  test(".error has the error type", () => {
    expectTypeOf(err(new TypeError()).error).toEqualTypeOf<TypeError>();
  });
});

// ---------------------------------------------------------------------------
// Type guard narrowing
// ---------------------------------------------------------------------------

describe("isOk / isErr narrowing", () => {
  test("isOk narrows to OkResult", () => {
    const r = ok(1) as Result<number, TypeError>;
    if (isOk(r)) {
      expectTypeOf(r).toEqualTypeOf<OkResult<number>>();
    }
  });

  test("isErr narrows to ErrResult", () => {
    const r = err(new TypeError()) as Result<number, TypeError>;
    if (isErr(r)) {
      expectTypeOf(r).toEqualTypeOf<ErrResult<TypeError>>();
    }
  });

  test(".ok discriminant narrows both branches", () => {
    // Function param prevents control-flow narrowing from the initializer.
    function check(r: Result<string, RangeError>) {
      if (r.ok) {
        expectTypeOf(r).toEqualTypeOf<OkResult<string>>();
        expectTypeOf(r.value).toEqualTypeOf<string>();
      } else {
        expectTypeOf(r).toEqualTypeOf<ErrResult<RangeError>>();
        expectTypeOf(r.error).toEqualTypeOf<RangeError>();
      }
    }
    check(ok("x"));
  });
});

// ---------------------------------------------------------------------------
// Instance method return types
// ---------------------------------------------------------------------------

describe("OkResult method return types", () => {
  test(".map returns OkResult<U>", () => {
    expectTypeOf(ok(1).map(String)).toEqualTypeOf<OkResult<string>>();
  });

  test(".flatMap to Ok preserves structure", () => {
    const r = ok(1).flatMap((x) => ok(String(x)));
    if (r.ok) {
      expectTypeOf(r.value).toEqualTypeOf<string>();
    }
  });

  test(".flatMap to Err widens error type", () => {
    const r = ok(1).flatMap(
      (_x): Result<string, TypeError> => err(new TypeError())
    );
    if (!r.ok) {
      expectTypeOf(r.error).toEqualTypeOf<TypeError>();
    }
  });

  test(".mapError is identity on OkResult", () => {
    expectTypeOf(ok(1).mapError(() => new TypeError())).toEqualTypeOf<
      OkResult<number>
    >();
  });

  test(".inspect returns OkResult<T>", () => {
    expectTypeOf(ok(1).inspect(() => {})).toEqualTypeOf<OkResult<number>>();
  });

  test(".inspectError returns OkResult<T>", () => {
    expectTypeOf(ok(1).inspectError(() => {})).toEqualTypeOf<
      OkResult<number>
    >();
  });
});

describe("ErrResult method return types", () => {
  test(".map returns ErrResult<E>", () => {
    expectTypeOf(err(new TypeError()).map(() => 42)).toEqualTypeOf<
      ErrResult<TypeError>
    >();
  });

  test(".flatMap returns ErrResult<E>", () => {
    expectTypeOf(err(new TypeError()).flatMap(() => ok(42))).toEqualTypeOf<
      ErrResult<TypeError>
    >();
  });

  test(".mapError returns ErrResult<F>", () => {
    expectTypeOf(
      err(new Error()).mapError((e) => new TypeError(e.message))
    ).toEqualTypeOf<ErrResult<TypeError>>();
  });

  test(".inspect returns ErrResult<E>", () => {
    expectTypeOf(err(new TypeError()).inspect(() => {})).toEqualTypeOf<
      ErrResult<TypeError>
    >();
  });

  test(".inspectError returns ErrResult<E>", () => {
    expectTypeOf(err(new TypeError()).inspectError(() => {})).toEqualTypeOf<
      ErrResult<TypeError>
    >();
  });
});

// ---------------------------------------------------------------------------
// Standalone function types — use function params to prevent narrowing
// ---------------------------------------------------------------------------

describe("Result.map types", () => {
  test("preserves error type through Ok path", () => {
    function check(r: Result<number, TypeError>) {
      const mapped = Result.map(r, String);
      if (mapped.ok) {
        expectTypeOf(mapped.value).toEqualTypeOf<string>();
      } else {
        expectTypeOf(mapped.error).toEqualTypeOf<TypeError>();
      }
    }
    check(ok(1));
  });

  test("preserves OkResult when input is OkResult", () => {
    expectTypeOf(Result.map(ok(1), String)).toEqualTypeOf<OkResult<string>>();
  });
});

describe("Result.mapError types", () => {
  test("transforms error type", () => {
    function check(r: Result<number, Error>) {
      const mapped = Result.mapError(r, (e) => new TypeError(e.message));
      if (mapped.ok) {
        expectTypeOf(mapped.value).toEqualTypeOf<number>();
      } else {
        expectTypeOf(mapped.error).toEqualTypeOf<TypeError>();
      }
    }
    check(err(new Error()));
  });

  test("preserves OkResult when input is OkResult", () => {
    expectTypeOf(
      Result.mapError(ok(1), () => new TypeError())
    ).toEqualTypeOf<OkResult<number>>();
  });
});

describe("Result.inspect types", () => {
  test("preserves OkResult when input is OkResult", () => {
    expectTypeOf(
      Result.inspect(ok(1), () => {})
    ).toEqualTypeOf<OkResult<number>>();
  });

  test("preserves Result when input is Result", () => {
    function check(r: Result<number, TypeError>) {
      expectTypeOf(Result.inspect(r, () => {})).toEqualTypeOf<
        Result<number, TypeError>
      >();
    }
    check(ok(1));
  });
});

describe("Result.inspectError types", () => {
  test("preserves ErrResult when input is ErrResult", () => {
    expectTypeOf(
      Result.inspectError(err(new TypeError()), () => {})
    ).toEqualTypeOf<ErrResult<TypeError>>();
  });

  test("preserves Result when input is Result", () => {
    function check(r: Result<number, TypeError>) {
      expectTypeOf(Result.inspectError(r, () => {})).toEqualTypeOf<
        Result<number, TypeError>
      >();
    }
    check(ok(1));
  });
});

describe("Result.flatMap types", () => {
  test("unions error types", () => {
    function check(r: Result<number, TypeError>) {
      const mapped = Result.flatMap(
        r,
        (n): Result<string, RangeError> => ok(String(n))
      );
      if (!mapped.ok) {
        expectTypeOf(mapped.error).toEqualTypeOf<TypeError | RangeError>();
      } else {
        expectTypeOf(mapped.value).toEqualTypeOf<string>();
      }
    }
    check(ok(1));
  });
});

describe("Result.orElse types", () => {
  test("replaces error type", () => {
    function check(r: Result<number, TypeError>) {
      const recovered = Result.orElse(r, () => ok(0));
      if (recovered.ok) {
        expectTypeOf(recovered.value).toEqualTypeOf<number>();
      }
    }
    check(err(new TypeError()));
  });
});

describe("Result.flatten types", () => {
  test("unions different inner and outer error types", () => {
    function check(r: Result<Result<number, TypeError>, RangeError>) {
      const flat = Result.flatten(r);
      if (!flat.ok) {
        expectTypeOf(flat.error).toEqualTypeOf<TypeError | RangeError>();
      } else {
        expectTypeOf(flat.value).toEqualTypeOf<number>();
      }
    }
    check(ok(ok(1)));
  });

  test("works with same error type", () => {
    function check(r: Result<Result<number, TypeError>, TypeError>) {
      const flat = Result.flatten(r);
      if (!flat.ok) {
        expectTypeOf(flat.error).toEqualTypeOf<TypeError>();
      }
    }
    check(ok(ok(1)));
  });
});

// ---------------------------------------------------------------------------
// all / allAsync tuple inference
// ---------------------------------------------------------------------------

describe("Result.all types", () => {
  test("produces tuple of values", () => {
    const r = Result.all(ok(1), ok("two"), ok(true));
    if (r.ok) {
      const [a, b, c] = r.value;
      expectTypeOf(a).toEqualTypeOf<number>();
      expectTypeOf(b).toEqualTypeOf<string>();
      expectTypeOf(c).toEqualTypeOf<boolean>();
    }
  });

  test("unions error types from mixed results", () => {
    function check(
      a: Result<number, TypeError>,
      b: Result<string, RangeError>
    ) {
      const r = Result.all(a, b);
      if (r.ok) {
        expectTypeOf(r.value[0]).toEqualTypeOf<number>();
        expectTypeOf(r.value[1]).toEqualTypeOf<string>();
      } else {
        expectTypeOf(r.error).toEqualTypeOf<TypeError | RangeError>();
      }
    }
    check(ok(1), ok("x"));
  });

  test("empty args → Ok with empty tuple", () => {
    const r = Result.all();
    if (r.ok) {
      expectTypeOf(r.value.length).toEqualTypeOf<0>();
    }
  });
});

describe("Result.allAsync types", () => {
  test("produces tuple of values from promises", async () => {
    const r = await Result.allAsync(
      Promise.resolve(ok(1)),
      Promise.resolve(ok("x"))
    );
    if (r.ok) {
      expectTypeOf(r.value[0]).toEqualTypeOf<number>();
      expectTypeOf(r.value[1]).toEqualTypeOf<string>();
    }
  });
});

// ---------------------------------------------------------------------------
// collect
// ---------------------------------------------------------------------------

describe("Result.collect types", () => {
  test("produces tuple of values on success", () => {
    const r = Result.collect(ok(1), ok("two"));
    if (r.ok) {
      expectTypeOf(r.value[0]).toEqualTypeOf<number>();
      expectTypeOf(r.value[1]).toEqualTypeOf<string>();
    }
  });

  test("error type is AggregateError", () => {
    const r = Result.collect(ok(1), err(new TypeError()));
    if (!r.ok) {
      expectTypeOf(r.error).toEqualTypeOf<AggregateError>();
    }
  });
});

// ---------------------------------------------------------------------------
// fromNullable / fromPredicate
// ---------------------------------------------------------------------------

describe("Result.fromNullable types", () => {
  test("strips null | undefined from value type", () => {
    function check(v: string | null | undefined) {
      const r = Result.fromNullable(v, () => new Error());
      if (r.ok) {
        expectTypeOf(r.value).toEqualTypeOf<string>();
      }
    }
    check("hello");
  });
});

describe("Result.fromPredicate types", () => {
  test("narrows with type-guard predicate", () => {
    const v: string | number = "hello";
    const r = Result.fromPredicate(
      v,
      (x): x is string => typeof x === "string",
      () => new Error()
    );
    if (r.ok) {
      expectTypeOf(r.value).toEqualTypeOf<string>();
    }
  });

  test("preserves type with boolean predicate", () => {
    function check(n: number) {
      const r = Result.fromPredicate(
        n,
        (x) => x > 0,
        () => new Error()
      );
      if (r.ok) {
        expectTypeOf(r.value).toEqualTypeOf<number>();
      }
    }
    check(42);
  });
});

// ---------------------------------------------------------------------------
// normalizeError
// ---------------------------------------------------------------------------

describe("normalizeError types", () => {
  test("returns Error", () => {
    expectTypeOf(normalizeError("oops")).toEqualTypeOf<Error>();
  });

  test("accepts unknown", () => {
    expectTypeOf(normalizeError).parameter(0).toEqualTypeOf<unknown>();
  });
});

// ---------------------------------------------------------------------------
// tryCatch
// ---------------------------------------------------------------------------

describe("Result.tryCatch types", () => {
  test("without mapper → error is Error", () => {
    const r = Result.tryCatch(() => 42);
    if (r.ok) {
      expectTypeOf(r.value).toEqualTypeOf<number>();
    } else {
      expectTypeOf(r.error).toEqualTypeOf<Error>();
    }
  });

  test("with mapper → error is custom type", () => {
    const r = Result.tryCatch(
      () => 42,
      () => new TypeError()
    );
    if (r.ok) {
      expectTypeOf(r.value).toEqualTypeOf<number>();
    } else {
      expectTypeOf(r.error).toEqualTypeOf<TypeError>();
    }
  });
});

describe("Result.tryCatchAsync types", () => {
  test("without mapper → error is Error", async () => {
    const r = await Result.tryCatchAsync(() => Promise.resolve(42));
    if (r.ok) {
      expectTypeOf(r.value).toEqualTypeOf<number>();
    } else {
      expectTypeOf(r.error).toEqualTypeOf<Error>();
    }
  });

  test("with mapper → error is custom type", async () => {
    const r = await Result.tryCatchAsync(
      () => Promise.resolve(42),
      () => new TypeError()
    );
    if (r.ok) {
      expectTypeOf(r.value).toEqualTypeOf<number>();
    } else {
      expectTypeOf(r.error).toEqualTypeOf<TypeError>();
    }
  });
});

// ---------------------------------------------------------------------------
// fromPromise
// ---------------------------------------------------------------------------

describe("Result.fromPromise types", () => {
  test("without mapper → error is Error", async () => {
    const r = await Result.fromPromise(Promise.resolve(42));
    if (r.ok) {
      expectTypeOf(r.value).toEqualTypeOf<number>();
    } else {
      expectTypeOf(r.error).toEqualTypeOf<Error>();
    }
  });

  test("with mapper → error is custom type", async () => {
    const r = await Result.fromPromise(
      Promise.resolve(42),
      () => new TypeError()
    );
    if (r.ok) {
      expectTypeOf(r.value).toEqualTypeOf<number>();
    } else {
      expectTypeOf(r.error).toEqualTypeOf<TypeError>();
    }
  });
});

// ---------------------------------------------------------------------------
// match / exhaustive
// ---------------------------------------------------------------------------

describe("Result.match types", () => {
  test("return type unifies handler returns", () => {
    function check(r: Result<number, Error>) {
      const out = Result.match(r, {
        ok: (v) => String(v),
        err: (e) => e.message,
      });
      expectTypeOf(out).toEqualTypeOf<string>();
    }
    check(ok(1));
  });
});

describe("Result.exhaustive types", () => {
  test("parameter is never", () => {
    expectTypeOf(Result.exhaustive).parameter(0).toEqualTypeOf<never>();
  });
});

// ---------------------------------------------------------------------------
// unwrap / unwrapOr / expect
// ---------------------------------------------------------------------------

describe("extraction types", () => {
  test("unwrap returns T", () => {
    function check(r: Result<number, Error>) {
      expectTypeOf(Result.unwrap(r)).toEqualTypeOf<number>();
    }
    check(ok(1));
  });

  test("unwrapOr returns T", () => {
    function check(r: Result<number, Error>) {
      expectTypeOf(Result.unwrapOr(r, 0)).toEqualTypeOf<number>();
    }
    check(ok(1));
  });

  test("expect returns T", () => {
    function check(r: Result<number, Error>) {
      expectTypeOf(Result.expect(r, "msg")).toEqualTypeOf<number>();
    }
    check(ok(1));
  });
});
