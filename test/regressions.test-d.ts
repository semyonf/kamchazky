// Type-level findings of earlier audits, kept as regression tests.
import { describe, expectTypeOf, test } from "vitest";
import {
  type ErrResult,
  err,
  type OkResult,
  ok,
  Result,
} from "../src/index.js";

class AppError extends Error {
  readonly kind = "app" as const;
}

describe("err of an any value keeps any (known limit, see README)", () => {
  // The error type is inferred from the argument.  Pinned so a fix shows up.
  test("a direct call", () => {
    expectTypeOf(err(JSON.parse("null"))).toEqualTypeOf<
      // biome-ignore lint/suspicious/noExplicitAny: the pinned limit
      ErrResult<any>
    >();
  });

  test("point-free in then", async () => {
    const r = await Promise.resolve(1).then(Result.ok, Result.err);
    expectTypeOf(r).toEqualTypeOf<
      // biome-ignore lint/suspicious/noExplicitAny: the pinned limit
      OkResult<unknown> | ErrResult<any>
    >();
  });

  test("err keeps a typed error", () => {
    expectTypeOf(err(new AppError())).toEqualTypeOf<ErrResult<AppError>>();
  });
});

describe("inference cases from the 2.x and 3.x audits", () => {
  const r = ok(1) as Result<number, AppError>;

  test("spreading an array into all", () => {
    const arr = [r];
    expectTypeOf(Result.all(...arr)).toEqualTypeOf<
      Result<number[], AppError>
    >();
  });

  test("map with a function reference, a this-typed method, Math.abs", () => {
    class Svc {
      k = 2;
      mul(this: Svc, n: number) {
        return n * this.k;
      }
    }
    expectTypeOf(Result.map(r, Math.abs)).toEqualTypeOf<
      Result<number, AppError>
    >();
    expectTypeOf(Result.map(r, String)).toEqualTypeOf<
      Result<string, AppError>
    >();
    expectTypeOf(Result.map(r, new Svc().mul)).toEqualTypeOf<
      Result<number, AppError>
    >();
  });

  test("map in generic code", () => {
    const g = <T, U>(x: Result<T, AppError>, f: (t: T) => U) =>
      Result.map(x, f);
    expectTypeOf(g(r, String)).toEqualTypeOf<Result<string, AppError>>();
  });

  test("tryCatch with a void callback, in a generic class, with a mapper", () => {
    const cb = (): void => {};
    expectTypeOf(Result.tryCatch(cb)).toEqualTypeOf<Result<void, Error>>();
    class Repo<T> {
      constructor(private readonly load: () => T) {}
      get() {
        return Result.tryCatch(() => this.load());
      }
    }
    expectTypeOf(new Repo(() => 1).get()).toEqualTypeOf<
      Result<number, Error>
    >();
    const safe = <T>(f: () => T) =>
      Result.tryCatch(f, (e) => new AppError(String(e)));
    expectTypeOf(safe(() => 1)).toEqualTypeOf<Result<number, AppError>>();
  });

  test("a partly-Promise return type is not caught (documented)", () => {
    const f = () => (Math.random() > 0.5 ? 1 : Promise.resolve(1));
    expectTypeOf(Result.tryCatch(f)).toEqualTypeOf<
      Result<1 | Promise<number>, Error>
    >();
  });

  test("ok passed point-free loses its value type (overloads)", async () => {
    const v = await Promise.resolve(1).then(Result.ok);
    expectTypeOf(v).toEqualTypeOf<OkResult<unknown>>();
  });
});
