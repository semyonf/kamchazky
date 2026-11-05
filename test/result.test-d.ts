import { describe, expectTypeOf, test } from "vitest";
import {
  type AggregateErrorOf,
  type ErrResult,
  err,
  isErr,
  isOk,
  type Maybe,
  normalizeError,
  type OkResult,
  ok,
  Result,
  some,
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

  test("ok() → OkResult<undefined>", () => {
    expectTypeOf(ok()).toEqualTypeOf<OkResult<undefined>>();
    expectTypeOf(Result.ok()).toEqualTypeOf<OkResult<undefined>>();
  });

  test("ok<T>() requires a value", () => {
    // @ts-expect-error ok<T>() requires a value argument
    ok<number>();
    // @ts-expect-error Result.ok<T>() requires a value argument
    Result.ok<number>();
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
    expectTypeOf(Result.mapError(ok(1), () => new TypeError())).toEqualTypeOf<
      OkResult<number>
    >();
  });
});

describe("Result.inspect types", () => {
  test("preserves OkResult when input is OkResult", () => {
    expectTypeOf(Result.inspect(ok(1), () => {})).toEqualTypeOf<
      OkResult<number>
    >();
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

  test("includes Error in error type for rejected promises", async () => {
    const r = await Result.allAsync(
      Promise.resolve(ok(1)),
      Promise.reject("raw") as Promise<Result<number, TypeError>>
    );
    if (!r.ok) {
      // Rejected promises are normalized to Error, widening the error type
      expectTypeOf(r.error).toEqualTypeOf<TypeError | Error>();
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

  test("error type is AggregateError with typed .errors", () => {
    const r = Result.collect(ok(1), err(new TypeError()));
    if (!r.ok) {
      expectTypeOf(r.error).toEqualTypeOf<AggregateErrorOf<TypeError>>();
      expectTypeOf(r.error.errors).toEqualTypeOf<TypeError[]>();
      expectTypeOf(r.error).toMatchTypeOf<AggregateError>();
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

describe("Result.tryCatch rejects async functions", () => {
  test("async function: the result is not a Result", () => {
    const r = Result.tryCatch(async () => 42);
    expectTypeOf(r).not.toMatchTypeOf<Result<unknown, Error>>();
    // @ts-expect-error — use tryCatchAsync for functions returning a Promise
    r.ok;
  });

  test("Promise-returning function: cannot be returned as a Result", () => {
    // @ts-expect-error — use tryCatchAsync for functions returning a Promise
    const r: Result<Promise<number>> = Result.tryCatch(() =>
      Promise.resolve(42)
    );
    expectTypeOf(r).toEqualTypeOf<Result<Promise<number>>>();
  });

  test("Promise-returning function with mapper: cannot be mapped", () => {
    const r = Result.tryCatch(
      () => Promise.resolve(42),
      () => new TypeError()
    );
    // @ts-expect-error — use tryCatchAsync for functions returning a Promise
    Result.map(r, (x) => x);
  });

  test("generic code compiles, as in 1.x", () => {
    function safe<T>(f: () => T) {
      return Result.tryCatch(f);
    }
    function safeMapped<T>(f: () => T) {
      return Result.tryCatch(f, () => new TypeError());
    }
    class Repo<T> {
      constructor(private readonly load: () => T) {}
      get(): Result<T, Error> {
        return Result.tryCatch(this.load);
      }
    }
    expectTypeOf(safe(() => 1)).toEqualTypeOf<Result<number, Error>>();
    expectTypeOf(safeMapped(() => 1)).toEqualTypeOf<
      Result<number, TypeError>
    >();
    expectTypeOf(new Repo(() => "a").get()).toEqualTypeOf<
      Result<string, Error>
    >();
  });

  test("a Promise-bound generic is still caught", () => {
    function run<P extends Promise<number>>(f: () => P) {
      return Result.tryCatch(f);
    }
    expectTypeOf(run(() => Promise.resolve(1))).not.toMatchTypeOf<
      Result<unknown, Error>
    >();
  });

  test("throwing function infers never", () => {
    const r = Result.tryCatch(() => {
      throw new Error();
    });
    expectTypeOf(r).toEqualTypeOf<Result<never, Error>>();
  });

  test("function returning any gives unknown", () => {
    const r = Result.tryCatch(() => JSON.parse("1"));
    expectTypeOf(r).toEqualTypeOf<Result<unknown, Error>>();
  });

  test("function returning unknown stays allowed", () => {
    const r = Result.tryCatch((): unknown => 1);
    expectTypeOf(r).toEqualTypeOf<Result<unknown, Error>>();
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

  test("split narrows value to T once failure is ruled out", () => {
    function check(r: Result<number, TypeError>) {
      const [failure, value] = Result.split(r);
      expectTypeOf(value).toEqualTypeOf<number | undefined>();
      if (failure) {
        expectTypeOf(failure).toEqualTypeOf<ErrResult<TypeError>>();
        return;
      }
      expectTypeOf(value).toEqualTypeOf<number>();
    }
    check(ok(1));
  });
});

// ---------------------------------------------------------------------------
// unwrapErr / isResult / array arguments
// ---------------------------------------------------------------------------

describe("Result.unwrapErr types", () => {
  test("returns the error type", () => {
    const r = err(new TypeError()) as Result<number, TypeError>;
    expectTypeOf(Result.unwrapErr(r)).toEqualTypeOf<TypeError>();
  });
});

describe("Result.isResult types", () => {
  test("narrows unknown to Result<unknown, Error>", () => {
    const x: unknown = ok(1);
    if (Result.isResult(x)) {
      expectTypeOf(x).toEqualTypeOf<Result<unknown, Error>>();
    }
  });
});

describe("array arguments types", () => {
  test("Result.all on an array → array of values", () => {
    const rs: Result<number, TypeError>[] = [];
    expectTypeOf(Result.all(rs)).toEqualTypeOf<Result<number[], TypeError>>();
  });

  test("Result.all on an array literal keeps the tuple", () => {
    const r = Result.all([ok(1), ok("a")]);
    if (r.ok) expectTypeOf(r.value).toEqualTypeOf<readonly [number, string]>();
  });

  test("Result.collect on an array", () => {
    const rs: Result<number, TypeError>[] = [];
    expectTypeOf(Result.collect(rs)).toEqualTypeOf<
      Result<number[], AggregateErrorOf<TypeError>>
    >();
  });

  test("Result.allAsync on an array", async () => {
    const ps: Promise<Result<number, TypeError>>[] = [];
    expectTypeOf(await Result.allAsync(ps)).toEqualTypeOf<
      Result<number[], TypeError | Error>
    >();
  });
});

// ---------------------------------------------------------------------------
// Precision: no `unknown` / `Error` where nothing can be inferred
// ---------------------------------------------------------------------------

class NotFound extends Error {
  override readonly name = "NotFound" as const;
}

describe("uninferable error and value types are never", () => {
  const r = err(new TypeError()) as Result<number, TypeError>;

  test("orElse recovering with Ok cannot fail", () => {
    expectTypeOf(Result.orElse(r, () => ok(0))).toEqualTypeOf<
      Result<number, never>
    >();
    expectTypeOf(Result.flatMapErr(r, () => ok(0))).toEqualTypeOf<
      Result<number, never>
    >();
  });

  test("a callback that only throws gives never, not unknown", () => {
    const fail = (e: unknown): never => {
      throw e;
    };
    expectTypeOf(
      Result.flatMap(r, () => {
        throw new Error("x");
      })
    ).toEqualTypeOf<Result<never, TypeError>>();
    expectTypeOf(Result.flatMap(r, (v) => fail(v))).toEqualTypeOf<
      Result<never, TypeError>
    >();
    expectTypeOf(
      Result.orElse(r, (e) => {
        throw e;
      })
    ).toEqualTypeOf<Result<number, never>>();
    expectTypeOf(Result.orElse(r, (e) => fail(e))).toEqualTypeOf<
      Result<number, never>
    >();
    expectTypeOf(Result.flatMapErr(r, (e) => fail(e))).toEqualTypeOf<
      Result<number, never>
    >();
    expectTypeOf(Result.map(r, (v) => fail(v))).toEqualTypeOf<
      Result<never, TypeError>
    >();
    // Still assignable where such a call was assigned before.
    const kept: Result<number, TypeError> = Result.orElse(r, (e) => fail(e));
    void kept;
  });

  test("flatMap returning only Err has value never", () => {
    expectTypeOf(Result.flatMap(r, () => err(new NotFound()))).toEqualTypeOf<
      Result<never, TypeError | NotFound>
    >();
  });

  test("flatten of an Ok adds no error", () => {
    expectTypeOf(Result.flatten(ok(r))).toEqualTypeOf<
      Result<number, TypeError>
    >();
  });

  test("split / unwrapErr / flatten / transpose of an Ok or an Err", () => {
    // A side the input does not have is never, as in 3.0.0; an `any` input
    // gives unknown and Error instead (see the untyped tests).
    expectTypeOf(Result.split(ok(1))[0]).toEqualTypeOf<
      ErrResult<never> | undefined
    >();
    expectTypeOf(Result.unwrapErr(ok(1))).toEqualTypeOf<never>();
    expectTypeOf(Result.unwrap(err(new TypeError()))).toEqualTypeOf<never>();
    expectTypeOf(Result.transpose(ok(some(1)))).toEqualTypeOf<
      Maybe<Result<number, never>>
    >();
    expectTypeOf(Result.flatten(ok(ok(1)))).toEqualTypeOf<
      Result<number, never>
    >();
    expectTypeOf(Result.flatten(err(new TypeError()))).toEqualTypeOf<
      Result<unknown, TypeError>
    >();
  });

  test("map / mapError keep the known side", () => {
    expectTypeOf(Result.map(err(new TypeError()), (x) => x)).toEqualTypeOf<
      ErrResult<TypeError>
    >();
    expectTypeOf(
      Result.mapError(err(new TypeError()), () => new NotFound())
    ).toEqualTypeOf<ErrResult<NotFound>>();
  });
});

describe("Result.match branches", () => {
  const r = err(new TypeError()) as Result<number, TypeError>;

  test("different branch types give their union", () => {
    expectTypeOf(
      Result.match(r, { ok: (v) => v, err: (e) => e.message })
    ).toEqualTypeOf<number | string>();
  });

  test("match on an Err gives the err branch type", () => {
    expectTypeOf(
      Result.match(err(new TypeError()), { ok: (v) => v, err: (e) => e })
    ).toEqualTypeOf<TypeError>();
  });

  test("three explicit type arguments still work", () => {
    expectTypeOf(
      Result.match<number, TypeError, string>(r, {
        ok: String,
        err: (e) => e.message,
      })
    ).toEqualTypeOf<string>();
  });
});

describe("collect error types", () => {
  test("collectAsync .errors includes Error from rejections", async () => {
    const r = await Result.collectAsync(
      Promise.resolve(err(new NotFound())) as Promise<Result<number, NotFound>>
    );
    if (!r.ok) {
      expectTypeOf(r.error.errors).toEqualTypeOf<(NotFound | Error)[]>();
    }
  });

  test("AggregateErrorOf is assignable to AggregateError", () => {
    expectTypeOf<AggregateErrorOf<TypeError>>().toMatchTypeOf<AggregateError>();
  });
});

describe("tryCatch and a Promise in a union", () => {
  // Limitation: overloads can only catch a return type that is entirely
  // a Promise.  At runtime such a call returns Err(TypeError).
  test("number | Promise<number> is not caught at compile time", () => {
    const f = (): number | Promise<number> => 1;
    expectTypeOf(Result.tryCatch(f)).toEqualTypeOf<
      Result<number | Promise<number>, Error>
    >();
  });
});

describe("PromiseLike inputs", () => {
  const pl = Promise.resolve(ok(1)) as PromiseLike<Result<number, TypeError>>;

  test("fromPromise / tryCatchAsync / allAsync / collectAsync", async () => {
    expectTypeOf(
      await Result.fromPromise(Promise.resolve(1) as PromiseLike<number>)
    ).toEqualTypeOf<Result<number, Error>>();
    expectTypeOf(
      await Result.tryCatchAsync(
        () => Promise.resolve(1) as PromiseLike<number>
      )
    ).toEqualTypeOf<Result<number, Error>>();
    expectTypeOf(await Result.allAsync(pl)).toEqualTypeOf<
      Result<readonly [number], TypeError | Error>
    >();
    expectTypeOf(await Result.collectAsync(pl)).toEqualTypeOf<
      Result<readonly [number], AggregateErrorOf<TypeError | Error>>
    >();
  });
});

describe("error classes need a distinguishing member", () => {
  test("a literal name keeps a plain Error out", () => {
    // @ts-expect-error — Error has no `name: "NotFound"`
    const r: Result<number, NotFound> = err(new Error("x"));
    expectTypeOf(r).toEqualTypeOf<Result<number, NotFound>>();
  });
});

// ---------------------------------------------------------------------------
// Async callbacks in sync combinators
// ---------------------------------------------------------------------------

describe("Result.map rejects async callbacks", () => {
  const r = ok(1) as Result<number, TypeError>;

  test("async callback: the result is not a Result", () => {
    const mapped = Result.map(r, async (x) => x + 1);
    expectTypeOf(mapped).not.toMatchTypeOf<Result<unknown, Error>>();
    // @ts-expect-error — map does not await
    mapped.ok;
  });

  test("on an Ok input too", () => {
    // @ts-expect-error — map does not await
    Result.map(ok(1), (x) => Promise.resolve(x)).ok;
  });

  test("generic callback compiles, as in 1.x", () => {
    function mapAll<U>(res: Result<number, TypeError>, f: (n: number) => U) {
      return Result.map(res, f);
    }
    expectTypeOf(mapAll(r, String)).toEqualTypeOf<Result<string, TypeError>>();
  });

  test("sync, any and throwing callbacks keep their types", () => {
    expectTypeOf(Result.map(r, String)).toEqualTypeOf<
      Result<string, TypeError>
    >();
    expectTypeOf(Result.map(ok(1), String)).toEqualTypeOf<OkResult<string>>();
    expectTypeOf(Result.map(r, () => JSON.parse("1"))).toEqualTypeOf<
      Result<unknown, TypeError>
    >();
    expectTypeOf(
      Result.map(r, () => {
        throw new Error();
      })
    ).toEqualTypeOf<Result<never, TypeError>>();
  });

  test("other callbacks already reject async functions", () => {
    // @ts-expect-error — flatMap needs a Result, not a Promise
    Result.flatMap(r, async (x) => ok(x));
    // @ts-expect-error — orElse needs a Result, not a Promise
    Result.orElse(r, async () => ok(0));
    Result.fromPredicate(
      1,
      // @ts-expect-error — a predicate must return boolean; a Promise is always truthy
      async () => true,
      () => new TypeError()
    );
    // @ts-expect-error — mapError needs an Error, not a Promise
    Result.mapError(r, async () => new TypeError());
  });
});

// ---------------------------------------------------------------------------
// An `any` input: the value is `unknown`, never `never`, and no branch is
// assumed.  `never` would assign silently to `string` and `number`.
// ---------------------------------------------------------------------------

describe("an any input is not taken for never or for one branch", () => {
  const untyped = JSON.parse("null");
  const r = err(new TypeError()) as Result<number, TypeError>;

  test("unwrap / unwrapErr / split give unknown and Error", () => {
    expectTypeOf(Result.unwrap(untyped)).toEqualTypeOf<unknown>();
    expectTypeOf(Result.unwrapErr(untyped)).toEqualTypeOf<Error>();
    expectTypeOf(Result.split(untyped)).toEqualTypeOf<
      | readonly [failure: ErrResult<Error>, value: undefined]
      | readonly [failure: undefined, value: unknown]
    >();
    const v = Result.unwrap(untyped);
    const e = Result.unwrapErr(untyped);
    // @ts-expect-error — unknown does not assign to string
    const s: string = v;
    // @ts-expect-error — unknown does not assign to number
    const n: number = v;
    // @ts-expect-error — Error does not assign to string
    const m: string = e;
    void [s, n, m];
  });

  test("unwrapOr gives unknown, unwrapOrElse what fn returns", () => {
    expectTypeOf(Result.unwrapOr(untyped, 1)).toEqualTypeOf<unknown>();
    // unwrapOrElse keeps the types of 3.0.0.
    expectTypeOf(Result.unwrapOrElse(untyped, () => 1)).toEqualTypeOf<number>();
  });

  test("map / mapError / inspect / inspectError do not assume a branch", () => {
    expectTypeOf(Result.map(untyped, () => 1)).toEqualTypeOf<
      Result<number, Error>
    >();
    expectTypeOf(Result.map(untyped, (v) => v)).toEqualTypeOf<
      Result<unknown, Error>
    >();
    expectTypeOf(Result.mapError(untyped, () => new TypeError())).toEqualTypeOf<
      Result<unknown, TypeError>
    >();
    expectTypeOf(Result.inspect(untyped, () => {})).toEqualTypeOf<
      Result<unknown, Error>
    >();
    expectTypeOf(Result.inspectError(untyped, () => {})).toEqualTypeOf<
      Result<unknown, Error>
    >();
  });

  test("map of an any input still rejects an async callback", () => {
    const m = Result.map(untyped, async () => 1);
    // @ts-expect-error — not a Result
    m.ok;
  });

  test("flatMap / orElse / flatten / transpose / match", () => {
    expectTypeOf(Result.flatMap(untyped, () => ok(1))).toEqualTypeOf<
      Result<number, Error>
    >();
    expectTypeOf(Result.orElse(untyped, () => ok(1))).toEqualTypeOf<
      Result<unknown, never>
    >();
    expectTypeOf(Result.flatMapErr(untyped, () => ok(1))).toEqualTypeOf<
      Result<unknown, never>
    >();
    expectTypeOf(Result.flatten(untyped)).toEqualTypeOf<
      Result<unknown, Error>
    >();
    expectTypeOf(Result.transpose(untyped)).toEqualTypeOf<
      Maybe<Result<unknown, Error>>
    >();
    expectTypeOf(
      Result.match(untyped, { ok: (v) => v, err: (e) => e })
    ).toEqualTypeOf<unknown>();
  });

  test("an annotated callback does not pick a one-branch overload", () => {
    class DbError extends Error {
      readonly code: string = "E_DB";
    }
    expectTypeOf(Result.map(untyped, (v: number) => v + 1)).toEqualTypeOf<
      Result<number, Error>
    >();
    expectTypeOf(
      Result.mapError(untyped, (e: DbError) => new TypeError(e.code))
    ).toEqualTypeOf<Result<unknown, TypeError>>();
    expectTypeOf(Result.inspect(untyped, (v: number) => void v)).toEqualTypeOf<
      Result<unknown, Error>
    >();
    expectTypeOf(
      Result.inspectError(untyped, (e: DbError) => void e)
    ).toEqualTypeOf<Result<unknown, Error>>();
    expectTypeOf(Result.flatMap(untyped, (v: number) => ok(v))).toEqualTypeOf<
      Result<number, Error>
    >();
    expectTypeOf(
      Result.orElse(untyped, (e: DbError) => ok(e.code.length))
    ).toEqualTypeOf<Result<unknown, never>>();
    expectTypeOf(
      Result.flatMapErr(untyped, (e: DbError) => ok(e.code.length))
    ).toEqualTypeOf<Result<unknown, never>>();
    expectTypeOf(
      Result.unwrapOrElse(untyped, (e: DbError) => e.code.length)
    ).toEqualTypeOf<number>();
    expectTypeOf(
      Result.match(untyped, { ok: (v: number) => v, err: (e: DbError) => e })
    ).toEqualTypeOf<number | DbError>();
    // The value or error is not readable without narrowing first.
    // @ts-expect-error — value exists only on an Ok
    Result.map(untyped, (v: number) => v + 1).value;
    // @ts-expect-error — error exists only on an Err
    Result.inspectError(untyped, (e: DbError) => void e).error;
    const m = Result.map(untyped, async (v: number) => v);
    // @ts-expect-error — an async callback still gives no Result
    m.ok;
  });

  test("a callback that returns any is not taken for never", () => {
    expectTypeOf(Result.flatMap(r, () => untyped)).toEqualTypeOf<
      Result<unknown, TypeError | Error>
    >();
    expectTypeOf(Result.orElse(r, () => untyped)).toEqualTypeOf<
      Result<unknown, Error>
    >();
    expectTypeOf(Result.flatMapErr(r, () => untyped)).toEqualTypeOf<
      Result<unknown, Error>
    >();
  });

  test("typed inputs keep their precise types", () => {
    expectTypeOf(Result.map(ok(1), String)).toEqualTypeOf<OkResult<string>>();
    expectTypeOf(Result.orElse(r, () => ok(0))).toEqualTypeOf<
      Result<number, never>
    >();
    const rs = [r];
    expectTypeOf(rs.map(Result.unwrap)).toEqualTypeOf<number[]>();
    expectTypeOf(rs.map(Result.split)).toEqualTypeOf<
      (
        | readonly [failure: ErrResult<TypeError>, value: undefined]
        | readonly [failure: undefined, value: number]
      )[]
    >();
    expectTypeOf(Promise.resolve(r).then(Result.unwrap)).toEqualTypeOf<
      Promise<number>
    >();
    expectTypeOf(Result.unwrap<number, TypeError>(r)).toEqualTypeOf<number>();
    expectTypeOf(
      Result.map<number, string, TypeError>(r, String)
    ).toEqualTypeOf<Result<string, TypeError>>();
  });
});

// ---------------------------------------------------------------------------
// An `any` that a callback returns, or that a Promise holds, becomes the
// value `unknown` (`JSON.parse`, `res.json()`).  A value given to `ok`
// directly keeps its type.
// ---------------------------------------------------------------------------

describe("an any value from fn or a Promise becomes unknown", () => {
  const r = ok(1) as Result<number, TypeError>;
  const json = () => Promise.resolve(JSON.parse("1"));

  test("tryCatch / tryCatchAsync / fromPromise", async () => {
    expectTypeOf(Result.tryCatch(() => JSON.parse("1"))).toEqualTypeOf<
      Result<unknown, Error>
    >();
    expectTypeOf(
      Result.tryCatch(
        () => JSON.parse("1"),
        () => new TypeError()
      )
    ).toEqualTypeOf<Result<unknown, TypeError>>();
    expectTypeOf(await Result.tryCatchAsync(json)).toEqualTypeOf<
      Result<unknown, Error>
    >();
    expectTypeOf(
      await Result.tryCatchAsync(json, () => new TypeError())
    ).toEqualTypeOf<Result<unknown, TypeError>>();
    expectTypeOf(await Result.fromPromise(json())).toEqualTypeOf<
      Result<unknown, Error>
    >();
    expectTypeOf(
      await Result.fromPromise(json(), () => new TypeError())
    ).toEqualTypeOf<Result<unknown, TypeError>>();
  });

  test("map", () => {
    expectTypeOf(Result.map(r, () => JSON.parse("1"))).toEqualTypeOf<
      Result<unknown, TypeError>
    >();
    expectTypeOf(Result.map(ok(1), () => JSON.parse("1"))).toEqualTypeOf<
      Result<unknown, never>
    >();
    expectTypeOf(
      Result.map(JSON.parse("null"), () => JSON.parse("1"))
    ).toEqualTypeOf<Result<unknown, Error>>();
  });

  test("never and generic code keep their types", async () => {
    expectTypeOf(
      await Result.tryCatchAsync(async () => {
        throw new Error();
      })
    ).toEqualTypeOf<Result<never, Error>>();
    expectTypeOf(
      await Result.fromPromise(Promise.reject(new Error()))
    ).toEqualTypeOf<Result<never, Error>>();
    const safe = <T>(f: () => Promise<T>): Promise<Result<T, Error>> =>
      Result.tryCatchAsync(f);
    const wrap = <T>(p: Promise<T>): Promise<Result<T, Error>> =>
      Result.fromPromise(p);
    const mapped = <U>(f: (n: number) => U): Result<U, TypeError> =>
      Result.map(r, f);
    expectTypeOf(await safe(async () => 1)).toEqualTypeOf<
      Result<number, Error>
    >();
    expectTypeOf(await wrap(Promise.resolve("a"))).toEqualTypeOf<
      Result<string, Error>
    >();
    expectTypeOf(mapped(String)).toEqualTypeOf<Result<string, TypeError>>();
  });

  test("a value given to ok directly keeps any", () => {
    // biome-ignore lint/suspicious/noExplicitAny: the documented limit
    expectTypeOf(ok(JSON.parse("1"))).toEqualTypeOf<OkResult<any>>();
  });
});
