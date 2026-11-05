// An untyped (`any`) argument in every position of every function that
// detects one.  No result may show `never` or the "does not await" type:
// each of them assigns where it should not or hides the value.
import { describe, expectTypeOf, test, vi } from "vitest";
import {
  type ErrResult,
  err,
  Maybe,
  type OkResult,
  ok,
  Result,
  type Some,
} from "../src/index.js";

class AppError extends Error {
  readonly kind = "app" as const;
}

// An untyped module, `require`, JSON.
const untyped = JSON.parse("null");
// biome-ignore lint/suspicious/noExplicitAny: an untyped client
declare const db: { query(sql?: string): any };
// biome-ignore lint/suspicious/noExplicitAny: an untyped declaration
declare function legacyFetch(): any;
// biome-ignore lint/suspicious/noExplicitAny: the shape of vi.fn(), jest.fn()
declare const mock: (...args: any[]) => any;

const r = err(new AppError()) as Result<number, AppError>;
const m = Maybe.none() as Maybe<number>;

describe("tryCatchAsync and fromPromise with an untyped function or Promise", () => {
  test("the value is unknown", async () => {
    expectTypeOf(await Result.tryCatchAsync(() => db.query())).toEqualTypeOf<
      Result<unknown, Error>
    >();
    expectTypeOf(await Result.tryCatchAsync(legacyFetch)).toEqualTypeOf<
      Result<unknown, Error>
    >();
    expectTypeOf(await Result.tryCatchAsync(() => mock("id"))).toEqualTypeOf<
      Result<unknown, Error>
    >();
    expectTypeOf(await Result.tryCatchAsync(mock)).toEqualTypeOf<
      Result<unknown, Error>
    >();
    expectTypeOf(await Result.tryCatchAsync(vi.fn())).toEqualTypeOf<
      Result<unknown, Error>
    >();
    expectTypeOf(await Result.tryCatchAsync(untyped)).toEqualTypeOf<
      Result<unknown, Error>
    >();
    expectTypeOf(await Result.fromPromise(db.query())).toEqualTypeOf<
      Result<unknown, Error>
    >();
    expectTypeOf(await Result.fromPromise(untyped)).toEqualTypeOf<
      Result<unknown, Error>
    >();
  });

  test("with onError the error is what onError returns", async () => {
    expectTypeOf(
      await Result.tryCatchAsync(
        () => db.query(),
        () => new AppError()
      )
    ).toEqualTypeOf<Result<unknown, AppError>>();
    expectTypeOf(
      await Result.fromPromise(db.query(), () => new AppError())
    ).toEqualTypeOf<Result<unknown, AppError>>();
  });

  test("an untyped onError gives Error", async () => {
    expectTypeOf(
      await Result.tryCatchAsync(() => db.query(), untyped)
    ).toEqualTypeOf<Result<unknown, Error>>();
    expectTypeOf(await Result.tryCatchAsync(untyped, untyped)).toEqualTypeOf<
      Result<unknown, Error>
    >();
    expectTypeOf(await Result.fromPromise(db.query(), untyped)).toEqualTypeOf<
      Result<unknown, Error>
    >();
    expectTypeOf(
      await Result.tryCatchAsync(async () => 1, untyped)
    ).toEqualTypeOf<Result<number, Error>>();
    expectTypeOf(
      await Result.fromPromise(Promise.resolve(1), untyped)
    ).toEqualTypeOf<Result<number, Error>>();
  });

  test("the value can be cast and narrowed", async () => {
    type Row = { id: number };
    const viaPromise = await Result.fromPromise(db.query("select 1"));
    if (viaPromise.ok) {
      const rows = viaPromise.value as Row[];
      expectTypeOf(rows).toEqualTypeOf<Row[]>();
    }
    const viaArrow = await Result.tryCatchAsync(() => db.query("select 1"));
    if (viaArrow.ok && typeof viaArrow.value === "string") {
      expectTypeOf(viaArrow.value).toEqualTypeOf<string>();
    }
  });

  test("typed, async, never and generic calls keep their types", async () => {
    expectTypeOf(
      await Result.tryCatchAsync(async () => db.query())
    ).toEqualTypeOf<Result<unknown, Error>>();
    expectTypeOf(
      // biome-ignore lint/suspicious/noExplicitAny: an explicit Promise<any>
      await Result.fromPromise(db.query() as Promise<any>)
    ).toEqualTypeOf<Result<unknown, Error>>();
    expectTypeOf(
      await Result.fromPromise(Promise.reject(new Error()))
    ).toEqualTypeOf<Result<never, Error>>();
    expectTypeOf(
      await Result.tryCatchAsync(() => Promise.resolve(1))
    ).toEqualTypeOf<Result<number, Error>>();
    const wrap = <T>(p: Promise<T>) => Result.fromPromise(p);
    expectTypeOf(wrap).toEqualTypeOf<
      <T>(p: Promise<T>) => Promise<Result<T, Error>>
    >();
  });
});

// An error that onError or an error factory returns as `any` becomes
// `Error`, as in mapError.
describe("an onError or error factory that returns any", () => {
  const n = 1 as number | null;

  test("gives Error", async () => {
    expectTypeOf(Result.tryCatch(() => 1, mock)).toEqualTypeOf<
      Result<number, Error>
    >();
    expectTypeOf(
      Result.tryCatch(
        () => 1,
        (e) => mock(e)
      )
    ).toEqualTypeOf<Result<number, Error>>();
    expectTypeOf(Result.tryCatch(() => untyped, mock)).toEqualTypeOf<
      Result<unknown, Error>
    >();
    expectTypeOf(Result.tryCatch(untyped, (e) => mock(e))).toEqualTypeOf<
      Result<unknown, Error>
    >();
    expectTypeOf(await Result.tryCatchAsync(async () => 1, mock)).toEqualTypeOf<
      Result<number, Error>
    >();
    expectTypeOf(
      await Result.tryCatchAsync(() => db.query(), mock)
    ).toEqualTypeOf<Result<unknown, Error>>();
    expectTypeOf(
      await Result.fromPromise(Promise.resolve(1), (e) => mock(e))
    ).toEqualTypeOf<Result<number, Error>>();
    expectTypeOf(await Result.fromPromise(db.query(), mock)).toEqualTypeOf<
      Result<unknown, Error>
    >();
    expectTypeOf(Result.fromNullable(n, () => mock(null))).toEqualTypeOf<
      Result<number, Error>
    >();
    expectTypeOf(Result.fromNullable(n, legacyFetch)).toEqualTypeOf<
      Result<number, Error>
    >();
    expectTypeOf(Result.fromPredicate(n, () => true, mock)).toEqualTypeOf<
      Result<number | null, Error>
    >();
    expectTypeOf(
      Result.fromPredicate(
        n,
        () => true,
        (v) => mock(v)
      )
    ).toEqualTypeOf<Result<number | null, Error>>();
    expectTypeOf(
      Result.fromPredicate(n, (v): v is number => v !== null, mock)
    ).toEqualTypeOf<Result<number, Error>>();
    expectTypeOf(Maybe.toResult(m, mock)).toEqualTypeOf<
      Result<number, Error>
    >();
    expectTypeOf(Result.fromMaybe(m, legacyFetch)).toEqualTypeOf<
      Result<number, Error>
    >();
  });

  test("a typed one and generic code keep their types", async () => {
    expectTypeOf(
      Result.tryCatch(
        () => 1,
        () => new AppError()
      )
    ).toEqualTypeOf<Result<number, AppError>>();
    expectTypeOf(
      await Result.fromPromise(Promise.resolve(1), () => new AppError())
    ).toEqualTypeOf<Result<number, AppError>>();
    expectTypeOf(Result.fromNullable(n, () => new AppError())).toEqualTypeOf<
      Result<number, AppError>
    >();
    expectTypeOf(Maybe.toResult(m, () => new AppError())).toEqualTypeOf<
      Result<number, AppError>
    >();
    function generic<T, E extends Error>(value: T, make: () => E) {
      expectTypeOf(Result.tryCatch(() => value, make)).toEqualTypeOf<
        Result<T, E>
      >();
      expectTypeOf(Result.fromNullable(value, make)).toEqualTypeOf<
        Result<NonNullable<T>, E>
      >();
      expectTypeOf(Maybe.toResult(Maybe.some(value), make)).toEqualTypeOf<
        Result<T, E>
      >();
      expectTypeOf(Result.fromMaybe(Maybe.some(value), make)).toEqualTypeOf<
        Result<T, E>
      >();
      expectTypeOf(Result.fromPredicate(value, () => true, make)).toEqualTypeOf<
        Result<T, E>
      >();
      return Result.fromPromise(Promise.resolve(value), make);
    }
    expectTypeOf(generic).returns.toEqualTypeOf<
      Promise<Result<unknown, Error>>
    >();
  });
});

// Every function with an error callback, on an untyped (`any`) input, an
// `() => any`, a `Promise<any>` and a typed input, with a callback that
// returns `any`: annotated, unannotated, `(...args: any[]) => any` (mock,
// vi.fn()) and `() => any` (legacyFetch).  Each gives `Error`; a typed
// callback keeps its error and generic code its generic error.
describe("an error callback that returns any, on every kind of input", () => {
  // biome-ignore lint/suspicious/noExplicitAny: an explicit Promise<any>
  const rows = db.query() as Promise<any>;
  const n = 1 as number | null;

  test("tryCatch", () => {
    expectTypeOf(
      Result.tryCatch(untyped, (e: unknown) => mock(e))
    ).toEqualTypeOf<Result<unknown, Error>>();
    expectTypeOf(Result.tryCatch(untyped, (e) => mock(e))).toEqualTypeOf<
      Result<unknown, Error>
    >();
    expectTypeOf(Result.tryCatch(untyped, mock)).toEqualTypeOf<
      Result<unknown, Error>
    >();
    expectTypeOf(Result.tryCatch(untyped, vi.fn())).toEqualTypeOf<
      Result<unknown, Error>
    >();
    expectTypeOf(Result.tryCatch(untyped, legacyFetch)).toEqualTypeOf<
      Result<unknown, Error>
    >();
    expectTypeOf(
      Result.tryCatch(untyped, (e) => new AppError(String(e)))
    ).toEqualTypeOf<Result<unknown, AppError>>();
    expectTypeOf(
      Result.tryCatch(
        () => db.query(),
        (e: unknown) => mock(e)
      )
    ).toEqualTypeOf<Result<unknown, Error>>();
    expectTypeOf(
      Result.tryCatch(
        () => db.query(),
        (e) => mock(e)
      )
    ).toEqualTypeOf<Result<unknown, Error>>();
    expectTypeOf(Result.tryCatch(() => db.query(), mock)).toEqualTypeOf<
      Result<unknown, Error>
    >();
    expectTypeOf(Result.tryCatch(() => db.query(), vi.fn())).toEqualTypeOf<
      Result<unknown, Error>
    >();
    expectTypeOf(Result.tryCatch(() => db.query(), legacyFetch)).toEqualTypeOf<
      Result<unknown, Error>
    >();
    expectTypeOf(
      Result.tryCatch(
        () => db.query(),
        (e) => new AppError(String(e))
      )
    ).toEqualTypeOf<Result<unknown, AppError>>();
    expectTypeOf(
      Result.tryCatch(
        () => 1,
        (e: unknown) => mock(e)
      )
    ).toEqualTypeOf<Result<number, Error>>();
    expectTypeOf(
      Result.tryCatch(
        () => 1,
        (e) => mock(e)
      )
    ).toEqualTypeOf<Result<number, Error>>();
    expectTypeOf(Result.tryCatch(() => 1, mock)).toEqualTypeOf<
      Result<number, Error>
    >();
    expectTypeOf(Result.tryCatch(() => 1, vi.fn())).toEqualTypeOf<
      Result<number, Error>
    >();
    expectTypeOf(Result.tryCatch(() => 1, legacyFetch)).toEqualTypeOf<
      Result<number, Error>
    >();
    expectTypeOf(
      Result.tryCatch(
        () => 1,
        (e) => new AppError(String(e))
      )
    ).toEqualTypeOf<Result<number, AppError>>();
  });

  test("tryCatchAsync", async () => {
    expectTypeOf(
      await Result.tryCatchAsync(untyped, (e: unknown) => mock(e))
    ).toEqualTypeOf<Result<unknown, Error>>();
    expectTypeOf(
      await Result.tryCatchAsync(untyped, (e) => mock(e))
    ).toEqualTypeOf<Result<unknown, Error>>();
    expectTypeOf(await Result.tryCatchAsync(untyped, mock)).toEqualTypeOf<
      Result<unknown, Error>
    >();
    expectTypeOf(await Result.tryCatchAsync(untyped, vi.fn())).toEqualTypeOf<
      Result<unknown, Error>
    >();
    expectTypeOf(
      await Result.tryCatchAsync(untyped, legacyFetch)
    ).toEqualTypeOf<Result<unknown, Error>>();
    expectTypeOf(
      await Result.tryCatchAsync(untyped, (e) => new AppError(String(e)))
    ).toEqualTypeOf<Result<unknown, AppError>>();
    expectTypeOf(
      await Result.tryCatchAsync(
        () => db.query(),
        (e: unknown) => mock(e)
      )
    ).toEqualTypeOf<Result<unknown, Error>>();
    expectTypeOf(
      await Result.tryCatchAsync(
        () => db.query(),
        (e) => mock(e)
      )
    ).toEqualTypeOf<Result<unknown, Error>>();
    expectTypeOf(
      await Result.tryCatchAsync(() => db.query(), mock)
    ).toEqualTypeOf<Result<unknown, Error>>();
    expectTypeOf(
      await Result.tryCatchAsync(() => db.query(), vi.fn())
    ).toEqualTypeOf<Result<unknown, Error>>();
    expectTypeOf(
      await Result.tryCatchAsync(() => db.query(), legacyFetch)
    ).toEqualTypeOf<Result<unknown, Error>>();
    expectTypeOf(
      await Result.tryCatchAsync(
        () => db.query(),
        (e) => new AppError(String(e))
      )
    ).toEqualTypeOf<Result<unknown, AppError>>();
    expectTypeOf(
      await Result.tryCatchAsync(
        async () => db.query(),
        (e: unknown) => mock(e)
      )
    ).toEqualTypeOf<Result<unknown, Error>>();
    expectTypeOf(
      await Result.tryCatchAsync(
        async () => db.query(),
        (e) => mock(e)
      )
    ).toEqualTypeOf<Result<unknown, Error>>();
    expectTypeOf(
      await Result.tryCatchAsync(async () => db.query(), mock)
    ).toEqualTypeOf<Result<unknown, Error>>();
    expectTypeOf(
      await Result.tryCatchAsync(async () => db.query(), vi.fn())
    ).toEqualTypeOf<Result<unknown, Error>>();
    expectTypeOf(
      await Result.tryCatchAsync(async () => db.query(), legacyFetch)
    ).toEqualTypeOf<Result<unknown, Error>>();
    expectTypeOf(
      await Result.tryCatchAsync(
        async () => db.query(),
        (e) => new AppError(String(e))
      )
    ).toEqualTypeOf<Result<unknown, AppError>>();
    expectTypeOf(
      await Result.tryCatchAsync(
        async () => 1,
        (e: unknown) => mock(e)
      )
    ).toEqualTypeOf<Result<number, Error>>();
    expectTypeOf(
      await Result.tryCatchAsync(
        async () => 1,
        (e) => mock(e)
      )
    ).toEqualTypeOf<Result<number, Error>>();
    expectTypeOf(await Result.tryCatchAsync(async () => 1, mock)).toEqualTypeOf<
      Result<number, Error>
    >();
    expectTypeOf(
      await Result.tryCatchAsync(async () => 1, vi.fn())
    ).toEqualTypeOf<Result<number, Error>>();
    expectTypeOf(
      await Result.tryCatchAsync(async () => 1, legacyFetch)
    ).toEqualTypeOf<Result<number, Error>>();
    expectTypeOf(
      await Result.tryCatchAsync(
        async () => 1,
        (e) => new AppError(String(e))
      )
    ).toEqualTypeOf<Result<number, AppError>>();
  });

  test("fromPromise", async () => {
    expectTypeOf(
      await Result.fromPromise(db.query(), (e: unknown) => mock(e))
    ).toEqualTypeOf<Result<unknown, Error>>();
    expectTypeOf(
      await Result.fromPromise(db.query(), (e) => mock(e))
    ).toEqualTypeOf<Result<unknown, Error>>();
    expectTypeOf(await Result.fromPromise(db.query(), mock)).toEqualTypeOf<
      Result<unknown, Error>
    >();
    expectTypeOf(await Result.fromPromise(db.query(), vi.fn())).toEqualTypeOf<
      Result<unknown, Error>
    >();
    expectTypeOf(
      await Result.fromPromise(db.query(), legacyFetch)
    ).toEqualTypeOf<Result<unknown, Error>>();
    expectTypeOf(
      await Result.fromPromise(db.query(), (e) => new AppError(String(e)))
    ).toEqualTypeOf<Result<unknown, AppError>>();
    expectTypeOf(
      await Result.fromPromise(rows, (e: unknown) => mock(e))
    ).toEqualTypeOf<Result<unknown, Error>>();
    expectTypeOf(await Result.fromPromise(rows, (e) => mock(e))).toEqualTypeOf<
      Result<unknown, Error>
    >();
    expectTypeOf(await Result.fromPromise(rows, mock)).toEqualTypeOf<
      Result<unknown, Error>
    >();
    expectTypeOf(await Result.fromPromise(rows, vi.fn())).toEqualTypeOf<
      Result<unknown, Error>
    >();
    expectTypeOf(await Result.fromPromise(rows, legacyFetch)).toEqualTypeOf<
      Result<unknown, Error>
    >();
    expectTypeOf(
      await Result.fromPromise(rows, (e) => new AppError(String(e)))
    ).toEqualTypeOf<Result<unknown, AppError>>();
    expectTypeOf(
      await Result.fromPromise(Promise.resolve(1), (e: unknown) => mock(e))
    ).toEqualTypeOf<Result<number, Error>>();
    expectTypeOf(
      await Result.fromPromise(Promise.resolve(1), (e) => mock(e))
    ).toEqualTypeOf<Result<number, Error>>();
    expectTypeOf(
      await Result.fromPromise(Promise.resolve(1), mock)
    ).toEqualTypeOf<Result<number, Error>>();
    expectTypeOf(
      await Result.fromPromise(Promise.resolve(1), vi.fn())
    ).toEqualTypeOf<Result<number, Error>>();
    expectTypeOf(
      await Result.fromPromise(Promise.resolve(1), legacyFetch)
    ).toEqualTypeOf<Result<number, Error>>();
    expectTypeOf(
      await Result.fromPromise(
        Promise.resolve(1),
        (e) => new AppError(String(e))
      )
    ).toEqualTypeOf<Result<number, AppError>>();
  });

  test("mapError", () => {
    expectTypeOf(Result.mapError(untyped, (e: Error) => mock(e))).toEqualTypeOf<
      Result<unknown, Error>
    >();
    expectTypeOf(Result.mapError(untyped, (e) => mock(e))).toEqualTypeOf<
      Result<unknown, Error>
    >();
    expectTypeOf(Result.mapError(untyped, mock)).toEqualTypeOf<
      Result<unknown, Error>
    >();
    expectTypeOf(Result.mapError(untyped, vi.fn())).toEqualTypeOf<
      Result<unknown, Error>
    >();
    expectTypeOf(Result.mapError(untyped, legacyFetch)).toEqualTypeOf<
      Result<unknown, Error>
    >();
    expectTypeOf(
      Result.mapError(untyped, (e) => new AppError(e.message))
    ).toEqualTypeOf<Result<unknown, AppError>>();
    expectTypeOf(Result.mapError(r, (e: Error) => mock(e))).toEqualTypeOf<
      Result<number, Error>
    >();
    expectTypeOf(Result.mapError(r, (e) => mock(e))).toEqualTypeOf<
      Result<number, Error>
    >();
    expectTypeOf(Result.mapError(r, mock)).toEqualTypeOf<
      Result<number, Error>
    >();
    expectTypeOf(Result.mapError(r, vi.fn())).toEqualTypeOf<
      Result<number, Error>
    >();
    expectTypeOf(Result.mapError(r, legacyFetch)).toEqualTypeOf<
      Result<number, Error>
    >();
    expectTypeOf(
      Result.mapError(r, (e) => new AppError(e.message))
    ).toEqualTypeOf<Result<number, AppError>>();
  });

  test("fromNullable", () => {
    expectTypeOf(Result.fromNullable(n, () => mock())).toEqualTypeOf<
      Result<number, Error>
    >();
    expectTypeOf(Result.fromNullable(n, mock)).toEqualTypeOf<
      Result<number, Error>
    >();
    expectTypeOf(Result.fromNullable(n, vi.fn())).toEqualTypeOf<
      Result<number, Error>
    >();
    expectTypeOf(Result.fromNullable(n, legacyFetch)).toEqualTypeOf<
      Result<number, Error>
    >();
    expectTypeOf(Result.fromNullable(n, () => new AppError())).toEqualTypeOf<
      Result<number, AppError>
    >();
  });

  test("fromPredicate", () => {
    expectTypeOf(
      Result.fromPredicate(
        n,
        () => true,
        (v: unknown) => mock(v)
      )
    ).toEqualTypeOf<Result<number | null, Error>>();
    expectTypeOf(
      Result.fromPredicate(
        n,
        () => true,
        (v) => mock(v)
      )
    ).toEqualTypeOf<Result<number | null, Error>>();
    expectTypeOf(Result.fromPredicate(n, () => true, mock)).toEqualTypeOf<
      Result<number | null, Error>
    >();
    expectTypeOf(Result.fromPredicate(n, () => true, vi.fn())).toEqualTypeOf<
      Result<number | null, Error>
    >();
    expectTypeOf(
      Result.fromPredicate(n, () => true, legacyFetch)
    ).toEqualTypeOf<Result<number | null, Error>>();
    expectTypeOf(
      Result.fromPredicate(
        n,
        () => true,
        (v) => new AppError(String(v))
      )
    ).toEqualTypeOf<Result<number | null, AppError>>();
  });

  test("Maybe.toResult", () => {
    expectTypeOf(Maybe.toResult(untyped, () => mock())).toEqualTypeOf<
      Result<unknown, Error>
    >();
    expectTypeOf(Maybe.toResult(untyped, mock)).toEqualTypeOf<
      Result<unknown, Error>
    >();
    // Left as in 3.0.0 (`any`): TypeScript types an inline vi.fn() against
    // `() => E` of the first overload, whose parameters must be those of
    // 3.0.0, and no overload after it takes the call.  A stored vi.fn()
    // gives Error.
    expectTypeOf(Maybe.toResult(untyped, vi.fn())).toEqualTypeOf<
      // biome-ignore lint/suspicious/noExplicitAny: pins the current type
      Result<unknown, any>
    >();
    const fn = vi.fn();
    expectTypeOf(Maybe.toResult(untyped, fn)).toEqualTypeOf<
      Result<unknown, Error>
    >();
    expectTypeOf(Maybe.toResult(untyped, legacyFetch)).toEqualTypeOf<
      Result<unknown, Error>
    >();
    expectTypeOf(Maybe.toResult(untyped, () => new AppError())).toEqualTypeOf<
      Result<unknown, AppError>
    >();
    expectTypeOf(Maybe.toResult(m, () => mock())).toEqualTypeOf<
      Result<number, Error>
    >();
    expectTypeOf(Maybe.toResult(m, mock)).toEqualTypeOf<
      Result<number, Error>
    >();
    expectTypeOf(Maybe.toResult(m, vi.fn())).toEqualTypeOf<
      Result<number, Error>
    >();
    expectTypeOf(Maybe.toResult(m, legacyFetch)).toEqualTypeOf<
      Result<number, Error>
    >();
    expectTypeOf(Maybe.toResult(m, () => new AppError())).toEqualTypeOf<
      Result<number, AppError>
    >();
  });

  test("Result.fromMaybe", () => {
    expectTypeOf(Result.fromMaybe(untyped, () => mock())).toEqualTypeOf<
      Result<unknown, Error>
    >();
    expectTypeOf(Result.fromMaybe(untyped, mock)).toEqualTypeOf<
      Result<unknown, Error>
    >();
    // Left as in 3.0.0 (`any`): TypeScript types an inline vi.fn() against
    // `() => E` of the first overload, whose parameters must be those of
    // 3.0.0, and no overload after it takes the call.  A stored vi.fn()
    // gives Error.
    expectTypeOf(Result.fromMaybe(untyped, vi.fn())).toEqualTypeOf<
      // biome-ignore lint/suspicious/noExplicitAny: pins the current type
      Result<unknown, any>
    >();
    const fn = vi.fn();
    expectTypeOf(Result.fromMaybe(untyped, fn)).toEqualTypeOf<
      Result<unknown, Error>
    >();
    expectTypeOf(Result.fromMaybe(untyped, legacyFetch)).toEqualTypeOf<
      Result<unknown, Error>
    >();
    expectTypeOf(Result.fromMaybe(untyped, () => new AppError())).toEqualTypeOf<
      Result<unknown, AppError>
    >();
    expectTypeOf(Result.fromMaybe(m, () => mock())).toEqualTypeOf<
      Result<number, Error>
    >();
    expectTypeOf(Result.fromMaybe(m, mock)).toEqualTypeOf<
      Result<number, Error>
    >();
    expectTypeOf(Result.fromMaybe(m, vi.fn())).toEqualTypeOf<
      Result<number, Error>
    >();
    expectTypeOf(Result.fromMaybe(m, legacyFetch)).toEqualTypeOf<
      Result<number, Error>
    >();
    expectTypeOf(Result.fromMaybe(m, () => new AppError())).toEqualTypeOf<
      Result<number, AppError>
    >();
  });

  test("orElse", () => {
    expectTypeOf(Result.orElse(untyped, (e: Error) => mock(e))).toEqualTypeOf<
      Result<unknown, Error>
    >();
    expectTypeOf(Result.orElse(untyped, (e) => mock(e))).toEqualTypeOf<
      Result<unknown, Error>
    >();
    expectTypeOf(Result.orElse(untyped, mock)).toEqualTypeOf<
      Result<unknown, Error>
    >();
    expectTypeOf(Result.orElse(untyped, vi.fn())).toEqualTypeOf<
      Result<unknown, Error>
    >();
    expectTypeOf(Result.orElse(untyped, legacyFetch)).toEqualTypeOf<
      Result<unknown, Error>
    >();
    expectTypeOf(Result.orElse(r, (e: Error) => mock(e))).toEqualTypeOf<
      Result<unknown, Error>
    >();
    expectTypeOf(Result.orElse(r, (e) => mock(e))).toEqualTypeOf<
      Result<unknown, Error>
    >();
    expectTypeOf(Result.orElse(r, mock)).toEqualTypeOf<
      Result<unknown, Error>
    >();
    expectTypeOf(Result.orElse(r, vi.fn())).toEqualTypeOf<
      Result<unknown, Error>
    >();
    expectTypeOf(Result.orElse(r, legacyFetch)).toEqualTypeOf<
      Result<unknown, Error>
    >();
  });

  test("flatMapErr", () => {
    expectTypeOf(
      Result.flatMapErr(untyped, (e: Error) => mock(e))
    ).toEqualTypeOf<Result<unknown, Error>>();
    expectTypeOf(Result.flatMapErr(untyped, (e) => mock(e))).toEqualTypeOf<
      Result<unknown, Error>
    >();
    expectTypeOf(Result.flatMapErr(untyped, mock)).toEqualTypeOf<
      Result<unknown, Error>
    >();
    expectTypeOf(Result.flatMapErr(untyped, vi.fn())).toEqualTypeOf<
      Result<unknown, Error>
    >();
    expectTypeOf(Result.flatMapErr(untyped, legacyFetch)).toEqualTypeOf<
      Result<unknown, Error>
    >();
    expectTypeOf(Result.flatMapErr(r, (e: Error) => mock(e))).toEqualTypeOf<
      Result<unknown, Error>
    >();
    expectTypeOf(Result.flatMapErr(r, (e) => mock(e))).toEqualTypeOf<
      Result<unknown, Error>
    >();
    expectTypeOf(Result.flatMapErr(r, mock)).toEqualTypeOf<
      Result<unknown, Error>
    >();
    expectTypeOf(Result.flatMapErr(r, vi.fn())).toEqualTypeOf<
      Result<unknown, Error>
    >();
    expectTypeOf(Result.flatMapErr(r, legacyFetch)).toEqualTypeOf<
      Result<unknown, Error>
    >();
  });

  // An untyped value given directly: only the error is pinned.  The value
  // is `any`, or `unknown` with some callbacks and TypeScript versions.
  test("fromNullable and fromPredicate with an untyped value", () => {
    expectTypeOf(
      Result.unwrapErr(Result.fromNullable(untyped, () => mock()))
    ).toEqualTypeOf<Error>();
    expectTypeOf(
      Result.unwrapErr(Result.fromNullable(untyped, mock))
    ).toEqualTypeOf<Error>();
    expectTypeOf(
      Result.unwrapErr(Result.fromNullable(untyped, vi.fn()))
    ).toEqualTypeOf<Error>();
    expectTypeOf(
      Result.unwrapErr(Result.fromNullable(untyped, legacyFetch))
    ).toEqualTypeOf<Error>();
    expectTypeOf(
      Result.unwrapErr(
        Result.fromPredicate(
          untyped,
          () => true,
          (v: unknown) => mock(v)
        )
      )
    ).toEqualTypeOf<Error>();
    expectTypeOf(
      Result.unwrapErr(
        Result.fromPredicate(
          untyped,
          () => true,
          (v) => mock(v)
        )
      )
    ).toEqualTypeOf<Error>();
    expectTypeOf(
      Result.unwrapErr(Result.fromPredicate(untyped, () => true, mock))
    ).toEqualTypeOf<Error>();
    expectTypeOf(
      Result.unwrapErr(Result.fromPredicate(untyped, () => true, vi.fn()))
    ).toEqualTypeOf<Error>();
    expectTypeOf(
      Result.unwrapErr(Result.fromPredicate(untyped, () => true, legacyFetch))
    ).toEqualTypeOf<Error>();
  });

  test("generic code keeps its error", () => {
    function generic<T, E extends Error>(
      value: T,
      onError: (error: unknown) => E,
      mapper: (error: Error) => E,
      make: () => E
    ) {
      expectTypeOf(Result.tryCatch(untyped, onError)).toEqualTypeOf<
        Result<unknown, E>
      >();
      expectTypeOf(Result.tryCatch(untyped, (e) => onError(e))).toEqualTypeOf<
        Result<unknown, E>
      >();
      expectTypeOf(Result.tryCatch(() => db.query(), onError)).toEqualTypeOf<
        Result<unknown, E>
      >();
      expectTypeOf(
        Result.tryCatch(
          () => db.query(),
          (e) => onError(e)
        )
      ).toEqualTypeOf<Result<unknown, E>>();
      expectTypeOf(Result.tryCatch(() => value, onError)).toEqualTypeOf<
        Result<T, E>
      >();
      expectTypeOf(
        Result.tryCatch(
          () => value,
          (e) => onError(e)
        )
      ).toEqualTypeOf<Result<T, E>>();
      expectTypeOf(Result.tryCatchAsync(untyped, onError)).toEqualTypeOf<
        Promise<Result<unknown, E>>
      >();
      expectTypeOf(
        Result.tryCatchAsync(untyped, (e) => onError(e))
      ).toEqualTypeOf<Promise<Result<unknown, E>>>();
      expectTypeOf(
        Result.tryCatchAsync(() => db.query(), onError)
      ).toEqualTypeOf<Promise<Result<unknown, E>>>();
      expectTypeOf(
        Result.tryCatchAsync(
          () => db.query(),
          (e) => onError(e)
        )
      ).toEqualTypeOf<Promise<Result<unknown, E>>>();
      expectTypeOf(
        Result.tryCatchAsync(async () => db.query(), onError)
      ).toEqualTypeOf<Promise<Result<unknown, E>>>();
      expectTypeOf(
        Result.tryCatchAsync(
          async () => db.query(),
          (e) => onError(e)
        )
      ).toEqualTypeOf<Promise<Result<unknown, E>>>();
      expectTypeOf(
        Result.tryCatchAsync(async () => value, onError)
      ).toEqualTypeOf<Promise<Result<T, E>>>();
      expectTypeOf(
        Result.tryCatchAsync(
          async () => value,
          (e) => onError(e)
        )
      ).toEqualTypeOf<Promise<Result<T, E>>>();
      expectTypeOf(Result.fromPromise(db.query(), onError)).toEqualTypeOf<
        Promise<Result<unknown, E>>
      >();
      expectTypeOf(
        Result.fromPromise(db.query(), (e) => onError(e))
      ).toEqualTypeOf<Promise<Result<unknown, E>>>();
      expectTypeOf(Result.fromPromise(rows, onError)).toEqualTypeOf<
        Promise<Result<unknown, E>>
      >();
      expectTypeOf(Result.fromPromise(rows, (e) => onError(e))).toEqualTypeOf<
        Promise<Result<unknown, E>>
      >();
      expectTypeOf(
        Result.fromPromise(Promise.resolve(value), onError)
      ).toEqualTypeOf<Promise<Result<Awaited<T>, E>>>();
      expectTypeOf(
        Result.fromPromise(Promise.resolve(value), (e) => onError(e))
      ).toEqualTypeOf<Promise<Result<Awaited<T>, E>>>();
      expectTypeOf(Result.mapError(untyped, mapper)).toEqualTypeOf<
        Result<unknown, E>
      >();
      expectTypeOf(Result.mapError(untyped, (e) => mapper(e))).toEqualTypeOf<
        Result<unknown, E>
      >();
      expectTypeOf(Result.mapError(r, mapper)).toEqualTypeOf<
        Result<number, E>
      >();
      expectTypeOf(Result.mapError(r, (e) => mapper(e))).toEqualTypeOf<
        Result<number, E>
      >();
      expectTypeOf(Result.fromNullable(value, make)).toEqualTypeOf<
        Result<NonNullable<T>, E>
      >();
      expectTypeOf(Result.fromNullable(value, () => make())).toEqualTypeOf<
        Result<NonNullable<T>, E>
      >();
      expectTypeOf(Maybe.toResult(untyped, make)).toEqualTypeOf<
        Result<unknown, E>
      >();
      expectTypeOf(Maybe.toResult(untyped, () => make())).toEqualTypeOf<
        Result<unknown, E>
      >();
      expectTypeOf(Maybe.toResult(Maybe.some(value), make)).toEqualTypeOf<
        Result<T, E>
      >();
      expectTypeOf(
        Maybe.toResult(Maybe.some(value), () => make())
      ).toEqualTypeOf<Result<T, E>>();
      expectTypeOf(Result.fromMaybe(untyped, make)).toEqualTypeOf<
        Result<unknown, E>
      >();
      expectTypeOf(Result.fromMaybe(untyped, () => make())).toEqualTypeOf<
        Result<unknown, E>
      >();
      expectTypeOf(Result.fromMaybe(Maybe.some(value), make)).toEqualTypeOf<
        Result<T, E>
      >();
      expectTypeOf(
        Result.fromMaybe(Maybe.some(value), () => make())
      ).toEqualTypeOf<Result<T, E>>();
    }
    void generic;
  });
});

describe("an untyped input", () => {
  test("Result functions", () => {
    expectTypeOf(Result.map(untyped, untyped)).toEqualTypeOf<
      Result<unknown, Error>
    >();
    expectTypeOf(Result.map(untyped, legacyFetch)).toEqualTypeOf<
      Result<unknown, Error>
    >();
    expectTypeOf(Result.mapError(untyped, untyped)).toEqualTypeOf<
      Result<unknown, Error>
    >();
    expectTypeOf(Result.inspect(untyped, untyped)).toEqualTypeOf<
      Result<unknown, Error>
    >();
    expectTypeOf(Result.inspectError(untyped, untyped)).toEqualTypeOf<
      Result<unknown, Error>
    >();
    expectTypeOf(Result.flatMap(untyped, untyped)).toEqualTypeOf<
      Result<unknown, Error>
    >();
    expectTypeOf(Result.flatMap(untyped, () => untyped)).toEqualTypeOf<
      Result<unknown, Error>
    >();
    expectTypeOf(Result.unwrap(untyped)).toEqualTypeOf<unknown>();
    expectTypeOf(Result.unwrapErr(untyped)).toEqualTypeOf<Error>();
    expectTypeOf(Result.unwrapOr(untyped, untyped)).toEqualTypeOf<unknown>();
    expectTypeOf(
      Result.unwrapOrElse(untyped, untyped)
    ).toEqualTypeOf<unknown>();
    expectTypeOf(Result.split(untyped)).toEqualTypeOf<
      | readonly [failure: ErrResult<Error>, value: undefined]
      | readonly [failure: undefined, value: unknown]
    >();
    expectTypeOf(Result.flatten(untyped)).toEqualTypeOf<
      Result<unknown, Error>
    >();
  });

  test("Maybe functions", () => {
    expectTypeOf(Maybe.map(untyped, untyped)).toEqualTypeOf<Maybe<unknown>>();
    expectTypeOf(Maybe.flatMap(untyped, untyped)).toEqualTypeOf<
      Maybe<unknown>
    >();
    expectTypeOf(Maybe.inspect(untyped, untyped)).toEqualTypeOf<
      Maybe<unknown>
    >();
    expectTypeOf(Maybe.filter(untyped, untyped)).toEqualTypeOf<
      Maybe<unknown>
    >();
    expectTypeOf(Maybe.unwrap(untyped)).toEqualTypeOf<unknown>();
    expectTypeOf(Maybe.unwrapOr(untyped, untyped)).toEqualTypeOf<unknown>();
    expectTypeOf(Maybe.unwrapOrElse(untyped, untyped)).toEqualTypeOf<unknown>();
  });

  test("an onError or error mapper with a parameter gives what it returns", async () => {
    // biome-ignore lint/suspicious/noExplicitAny: an explicit Promise<any>
    const rows = db.query() as Promise<any>;
    expectTypeOf(
      Result.tryCatch(untyped, (e) => new AppError(String(e)))
    ).toEqualTypeOf<Result<unknown, AppError>>();
    expectTypeOf(
      await Result.tryCatchAsync(
        async () => db.query(),
        (e) => new AppError(String(e))
      )
    ).toEqualTypeOf<Result<unknown, AppError>>();
    expectTypeOf(
      await Result.fromPromise(rows, (e) => new AppError(String(e)))
    ).toEqualTypeOf<Result<unknown, AppError>>();
    expectTypeOf(
      Result.mapError(untyped, (e) => new AppError(e.message))
    ).toEqualTypeOf<Result<unknown, AppError>>();
    expectTypeOf(
      await Result.tryCatchAsync(
        async () => db.query(),
        (e) => mock(e)
      )
    ).toEqualTypeOf<Result<unknown, Error>>();
    expectTypeOf(await Result.fromPromise(rows, (e) => mock(e))).toEqualTypeOf<
      Result<unknown, Error>
    >();
  });

  test("generic code keeps the error of a generic onError or error mapper", () => {
    function generic<E extends Error>(
      onError: (error: unknown) => E,
      mapper: (error: Error) => E
    ) {
      expectTypeOf(Result.tryCatch(untyped, onError)).toEqualTypeOf<
        Result<unknown, E>
      >();
      expectTypeOf(Result.tryCatch(legacyFetch, onError)).toEqualTypeOf<
        Result<unknown, E>
      >();
      expectTypeOf(Result.tryCatchAsync(legacyFetch, onError)).toEqualTypeOf<
        Promise<Result<unknown, E>>
      >();
      expectTypeOf(
        Result.tryCatchAsync(async () => db.query(), onError)
      ).toEqualTypeOf<Promise<Result<unknown, E>>>();
      expectTypeOf(
        // biome-ignore lint/suspicious/noExplicitAny: an explicit Promise<any>
        Result.fromPromise(db.query() as Promise<any>, onError)
      ).toEqualTypeOf<Promise<Result<unknown, E>>>();
      expectTypeOf(Result.fromPromise(untyped, onError)).toEqualTypeOf<
        Promise<Result<unknown, E>>
      >();
      expectTypeOf(Result.mapError(untyped, mapper)).toEqualTypeOf<
        Result<unknown, E>
      >();
    }
    void generic;
  });
});

// An untyped value inside a typed Result or Maybe may be any Result: the
// error it brings is `Error`, not `never`.
describe("an untyped value inside a Result or a Maybe", () => {
  test("flatten and Maybe.transpose add Error", () => {
    expectTypeOf(Result.flatten(ok(untyped))).toEqualTypeOf<
      Result<unknown, Error>
    >();
    const outer = r as Result<typeof untyped, AppError>;
    expectTypeOf(Result.flatten(outer)).toEqualTypeOf<
      Result<unknown, AppError | Error>
    >();
    expectTypeOf(Maybe.transpose(Maybe.some(untyped))).toEqualTypeOf<
      Result<Maybe<unknown>, Error>
    >();
    const inner = m as Maybe<typeof untyped>;
    expectTypeOf(Maybe.transpose(inner)).toEqualTypeOf<
      Result<Maybe<unknown>, Error>
    >();
  });

  test("a typed inner value that holds nothing keeps never", () => {
    const failed = r as Result<never, AppError>;
    expectTypeOf(Result.flatten(failed)).toEqualTypeOf<
      Result<unknown, AppError>
    >();
    const empty = m as Maybe<never>;
    expectTypeOf(Maybe.transpose(empty)).toEqualTypeOf<
      Result<Maybe<unknown>, never>
    >();
    expectTypeOf(Result.flatten(ok(ok(1)))).toEqualTypeOf<
      Result<number, never>
    >();
  });
});

// unwrapOrElse keeps the types of 3.0.0: it returns what `fn` returns.
describe("unwrapOrElse with an untyped input", () => {
  test("returns what fn returns", () => {
    expectTypeOf(Result.unwrapOrElse(untyped, () => 1)).toEqualTypeOf<number>();
    const value = Result.unwrapOrElse(untyped, () => untyped);
    // biome-ignore lint/suspicious/noExplicitAny: the pinned type
    expectTypeOf(value).toEqualTypeOf<any>();
    const some = Maybe.unwrapOrElse(untyped, () => untyped);
    // biome-ignore lint/suspicious/noExplicitAny: the pinned type
    expectTypeOf(some).toEqualTypeOf<any>();
    // A callback that only throws gives never, although an Ok input
    // returns its value.
    const fail = (): never => {
      throw new Error("fail");
    };
    expectTypeOf(Result.unwrapOrElse(untyped, fail)).toEqualTypeOf<never>();
  });
});

// A `never` input is not an untyped one: the functions with one signature
// keep the types of 3.0.0 for it.
describe("a never input of the functions with one signature", () => {
  test("keeps the types of 3.0.0", () => {
    const nothing = undefined as never;
    expectTypeOf(Result.unwrap(nothing)).toEqualTypeOf<never>();
    expectTypeOf(Result.unwrapErr(nothing)).toEqualTypeOf<never>();
    expectTypeOf(Maybe.unwrap(nothing)).toEqualTypeOf<never>();
    expectTypeOf(Result.flatten(nothing)).toEqualTypeOf<
      Result<unknown, never>
    >();
  });
});

// The functions with one signature tell an untyped input apart by a type
// parameter that a typed input leaves at its constraint, not by the value
// type, so generic code gets the types of 3.0.0.
describe("generic code that calls a function with one signature", () => {
  test("gets the types of 3.0.0", () => {
    function value<T>(result: OkResult<T>): T {
      return Result.unwrap(result);
    }
    function error<E extends Error>(result: Result<never, E>): E {
      return Result.unwrapErr(result);
    }
    function some<T>(maybe: Some<T>): T {
      return Maybe.unwrap(maybe);
    }
    function parts<T>(result: Result<T, never>) {
      return Result.split<T>(result);
    }
    expectTypeOf(value).toEqualTypeOf<<T>(result: OkResult<T>) => T>();
    expectTypeOf(error).toEqualTypeOf<
      <E extends Error>(result: Result<never, E>) => E
    >();
    expectTypeOf(some).toEqualTypeOf<<T>(maybe: Some<T>) => T>();
    expectTypeOf(parts).toEqualTypeOf<
      <T>(
        result: Result<T, never>
      ) =>
        | readonly [failure: ErrResult<never>, value: undefined]
        | readonly [failure: undefined, value: T]
    >();
  });
});

describe("an untyped callback or value where the input is typed", () => {
  test("keeps the types it had", () => {
    expectTypeOf(Result.mapError(r, untyped)).toEqualTypeOf<
      Result<number, Error>
    >();
    expectTypeOf(Result.inspect(r, untyped)).toEqualTypeOf<
      Result<number, AppError>
    >();
    expectTypeOf(Result.inspectError(r, untyped)).toEqualTypeOf<
      Result<number, AppError>
    >();
    expectTypeOf(Result.unwrapOrElse(r, untyped)).toEqualTypeOf<number>();
    // A fallback given directly keeps any, as `ok(any)` does.
    // biome-ignore lint/suspicious/noExplicitAny: the pinned type
    expectTypeOf(Result.unwrapOr(r, untyped)).toEqualTypeOf<any>();
    expectTypeOf(Result.tryCatch(() => 1, untyped)).toEqualTypeOf<
      Result<number, Error>
    >();
    expectTypeOf(Result.tryCatch(legacyFetch)).toEqualTypeOf<
      Result<unknown, Error>
    >();
    expectTypeOf(Result.map(r, legacyFetch)).toEqualTypeOf<
      Result<unknown, AppError>
    >();
    expectTypeOf(Maybe.filter(m, untyped)).toEqualTypeOf<Maybe<number>>();
    expectTypeOf(Maybe.inspect(m, untyped)).toEqualTypeOf<Maybe<number>>();
    expectTypeOf(Maybe.unwrapOrElse(m, untyped)).toEqualTypeOf<number>();
    // biome-ignore lint/suspicious/noExplicitAny: the pinned type
    expectTypeOf(Maybe.unwrapOr(m, untyped)).toEqualTypeOf<any>();
  });

  test("a value built from it with ok keeps any", () => {
    // biome-ignore lint/suspicious/noExplicitAny: the pinned type
    expectTypeOf(ok(untyped)).toEqualTypeOf<OkResult<any>>();
  });
});

// An untyped callback fits every overload, also the one for a callback
// that only throws (`never`) and the one for a callback that returns a
// Promise.  It gets what a callback that returns `any` gets.
describe("an untyped callback is not taken for never or for a Promise", () => {
  test("map / tryCatch / Maybe.map give unknown, not the does-not-await type", () => {
    expectTypeOf(Result.map(r, untyped)).toEqualTypeOf<
      Result<unknown, AppError>
    >();
    expectTypeOf(Result.map(ok(1), untyped)).toEqualTypeOf<
      Result<unknown, never>
    >();
    expectTypeOf(Result.map(err(new AppError()), untyped)).toEqualTypeOf<
      Result<unknown, AppError>
    >();
    expectTypeOf(Result.tryCatch(untyped)).toEqualTypeOf<
      Result<unknown, Error>
    >();
    expectTypeOf(Result.tryCatch(untyped, untyped)).toEqualTypeOf<
      Result<unknown, Error>
    >();
    expectTypeOf(Result.tryCatch(untyped, () => new AppError())).toEqualTypeOf<
      Result<unknown, AppError>
    >();
    expectTypeOf(Maybe.map(m, untyped)).toEqualTypeOf<Maybe<unknown>>();
    expectTypeOf(Maybe.map(Maybe.some(1), untyped)).toEqualTypeOf<
      Maybe<unknown>
    >();
    expectTypeOf(Maybe.map(Maybe.none(), untyped)).toEqualTypeOf<
      Maybe<unknown>
    >();
  });

  test("flatMap / orElse / flatMapErr / Maybe.flatMap give unknown and Error, not never", () => {
    expectTypeOf(Result.flatMap(r, untyped)).toEqualTypeOf<
      Result<unknown, AppError | Error>
    >();
    expectTypeOf(Result.flatMap(ok(1), untyped)).toEqualTypeOf<
      Result<unknown, Error>
    >();
    expectTypeOf(Result.orElse(r, untyped)).toEqualTypeOf<
      Result<unknown, Error>
    >();
    expectTypeOf(Result.flatMapErr(r, untyped)).toEqualTypeOf<
      Result<unknown, Error>
    >();
    expectTypeOf(Maybe.flatMap(m, untyped)).toEqualTypeOf<Maybe<unknown>>();
    // The same with an untyped input: the callback may return an Err.
    expectTypeOf(Result.orElse(untyped, untyped)).toEqualTypeOf<
      Result<unknown, Error>
    >();
    expectTypeOf(Result.orElse(untyped, () => untyped)).toEqualTypeOf<
      Result<unknown, Error>
    >();
    expectTypeOf(Result.flatMapErr(untyped, untyped)).toEqualTypeOf<
      Result<unknown, Error>
    >();
    expectTypeOf(Result.flatMapErr(untyped, () => untyped)).toEqualTypeOf<
      Result<unknown, Error>
    >();
  });

  // TypeScript types a callback with unannotated parameters only after it
  // has chosen the overloads that the other arguments fit, so the `any`
  // that such a callback returns must give the same types.
  test("a callback with unannotated parameters that returns any", () => {
    expectTypeOf(Result.map(r, (v) => mock(v))).toEqualTypeOf<
      Result<unknown, AppError>
    >();
    expectTypeOf(Maybe.map(m, (v) => mock(v))).toEqualTypeOf<Maybe<unknown>>();
    expectTypeOf(Result.flatMap(r, (v) => mock(v))).toEqualTypeOf<
      Result<unknown, AppError | Error>
    >();
    expectTypeOf(Result.orElse(r, (e) => mock(e))).toEqualTypeOf<
      Result<unknown, Error>
    >();
    expectTypeOf(Result.flatMapErr(r, (e) => mock(e))).toEqualTypeOf<
      Result<unknown, Error>
    >();
    expectTypeOf(Maybe.flatMap(m, (v) => mock(v))).toEqualTypeOf<
      Maybe<unknown>
    >();
    // The same with an untyped input.
    expectTypeOf(Result.map(untyped, (v) => mock(v))).toEqualTypeOf<
      Result<unknown, Error>
    >();
    expectTypeOf(Result.flatMap(untyped, (v) => mock(v))).toEqualTypeOf<
      Result<unknown, Error>
    >();
    expectTypeOf(Result.orElse(untyped, (e) => mock(e))).toEqualTypeOf<
      Result<unknown, Error>
    >();
    expectTypeOf(Result.flatMapErr(untyped, (e) => mock(e))).toEqualTypeOf<
      Result<unknown, Error>
    >();
    expectTypeOf(Maybe.flatMap(untyped, (v) => mock(v))).toEqualTypeOf<
      Maybe<unknown>
    >();
  });

  // An error that a callback returns as `any` becomes `Error`, as the
  // error of a flatMap callback that returns `any` does.
  test("mapError with a callback that returns any gives Error", () => {
    expectTypeOf(Result.mapError(r, () => untyped)).toEqualTypeOf<
      Result<number, Error>
    >();
    expectTypeOf(
      Result.mapError(r, (e) => {
        expectTypeOf(e).toEqualTypeOf<AppError>();
        return mock(e);
      })
    ).toEqualTypeOf<Result<number, Error>>();
    expectTypeOf(Result.mapError(r, (e: AppError) => mock(e))).toEqualTypeOf<
      Result<number, Error>
    >();
    expectTypeOf(Result.mapError(r, mock)).toEqualTypeOf<
      Result<number, Error>
    >();
    expectTypeOf(Result.mapError(r, legacyFetch)).toEqualTypeOf<
      Result<number, Error>
    >();
    expectTypeOf(
      Result.mapError(err(new AppError()), () => untyped)
    ).toEqualTypeOf<ErrResult<Error>>();
    expectTypeOf(Result.mapError(ok(1), () => untyped)).toEqualTypeOf<
      OkResult<number>
    >();
    // The same with an untyped input.
    expectTypeOf(Result.mapError(untyped, () => untyped)).toEqualTypeOf<
      Result<unknown, Error>
    >();
    expectTypeOf(Result.mapError(untyped, (e) => mock(e))).toEqualTypeOf<
      Result<unknown, Error>
    >();
    // A typed callback keeps its error type.
    expectTypeOf(
      Result.mapError(untyped, (e) => new AppError(e.message))
    ).toEqualTypeOf<Result<unknown, AppError>>();
    expectTypeOf(
      Result.mapError(r, (e) => new TypeError(e.kind))
    ).toEqualTypeOf<Result<number, TypeError>>();
  });

  // An untyped callback, or one that returns `any`, does not make the input
  // fit: a forgotten `await` and a callback for another type are rejected,
  // as in 3.0.0.
  test("an input that is not a Result or a Maybe is rejected", () => {
    const pending = Promise.resolve(ok(1));
    const user = { id: 1 };
    // @ts-expect-error — a Promise is not a Result
    Result.map(pending, untyped);
    // @ts-expect-error — a Promise is not a Result
    Result.flatMap(pending, untyped);
    // @ts-expect-error — a Promise is not a Result
    Result.flatMap(pending, (v) => mock(v));
    // @ts-expect-error — a Promise is not a Result
    Result.orElse(pending, untyped);
    // @ts-expect-error — a Promise is not a Result
    Result.flatMapErr(pending, untyped);
    // @ts-expect-error — an object is not a Maybe
    Maybe.map(user, untyped);
    // @ts-expect-error — an object is not a Maybe
    Maybe.flatMap(user, untyped);
    // @ts-expect-error — an object is not a Maybe
    Maybe.flatMap(user, (v) => mock(v));
  });

  test("generic code with a typed input takes an untyped callback", () => {
    function generic<T, E extends Error>(input: Result<T, E>, maybe: Maybe<T>) {
      expectTypeOf(Result.map(input, untyped)).toEqualTypeOf<
        Result<unknown, E>
      >();
      expectTypeOf(Result.flatMap(input, untyped)).toEqualTypeOf<
        Result<unknown, E | Error>
      >();
      expectTypeOf(Result.orElse(input, untyped)).toEqualTypeOf<
        Result<unknown, Error>
      >();
      expectTypeOf(Result.flatMapErr(input, untyped)).toEqualTypeOf<
        Result<unknown, Error>
      >();
      expectTypeOf(Maybe.map(maybe, untyped)).toEqualTypeOf<Maybe<unknown>>();
      expectTypeOf(Maybe.flatMap(maybe, untyped)).toEqualTypeOf<
        Maybe<unknown>
      >();
    }
    // An input typed by a type parameter keeps its error type as well.
    function ofParameter<E extends Error, R extends Result<number, E>>(
      input: R
    ) {
      const mapped: Result<unknown, E> = Result.map(input, untyped);
      const chained: Result<unknown, E | Error> = Result.flatMap(
        input,
        untyped
      );
      const returnsAny: Result<unknown, E | Error> = Result.flatMap(
        input,
        (v) => mock(v)
      );
      void [mapped, chained, returnsAny];
    }
    void [generic, ofParameter];
  });

  test("a callback for another type is rejected", () => {
    class DbError extends Error {
      readonly code = 1;
    }
    // @ts-expect-error — the value is a number
    Result.flatMap(r, (v: string) => mock(v));
    // @ts-expect-error — the error is an AppError
    Result.orElse(r, (e: DbError) => mock(e.code));
    // @ts-expect-error — the error is an AppError
    Result.flatMapErr(r, (e: DbError) => mock(e.code));
    // @ts-expect-error — the value is a number
    Maybe.flatMap(m, (v: string) => mock(v));
  });

  test("never no longer assigns to every type", () => {
    // @ts-expect-error — unknown is not string
    const s: Result<string, AppError> = Result.flatMap(r, untyped);
    // @ts-expect-error — the callback may fail
    const neverFails: Result<number, never> = Result.orElse(r, untyped);
    // @ts-expect-error — unknown is not number
    const found: Maybe<number> = Maybe.flatMap(m, untyped);
    void [s, neverFails, found];
  });

  test("a callback that only throws still gives never", () => {
    const fail = (e: unknown): never => {
      throw e;
    };
    expectTypeOf(Result.flatMap(r, fail)).toEqualTypeOf<
      Result<never, AppError>
    >();
    expectTypeOf(Result.orElse(r, fail)).toEqualTypeOf<Result<number, never>>();
    expectTypeOf(Result.flatMapErr(r, fail)).toEqualTypeOf<
      Result<number, never>
    >();
    expectTypeOf(Maybe.flatMap(m, fail)).toEqualTypeOf<Maybe<never>>();
    expectTypeOf(Result.orElse(untyped, fail)).toEqualTypeOf<
      Result<unknown, never>
    >();
  });

  // TypeScript does not know what an untyped handler returns: it counts as
  // returning `unknown`.
  test("match / Maybe.match with untyped handlers give unknown", () => {
    expectTypeOf(Result.match(r, untyped)).toEqualTypeOf<unknown>();
    expectTypeOf(
      Result.match(r, { ok: untyped, err: untyped })
    ).toEqualTypeOf<unknown>();
    expectTypeOf(Result.match(untyped, untyped)).toEqualTypeOf<unknown>();
    expectTypeOf(
      Result.match(r, { ok: untyped, err: () => 0 })
    ).toEqualTypeOf<unknown>();
    expectTypeOf(Maybe.match(m, untyped)).toEqualTypeOf<unknown>();
    expectTypeOf(
      Maybe.match(m, { some: untyped, none: untyped })
    ).toEqualTypeOf<unknown>();
    expectTypeOf(Maybe.match(untyped, untyped)).toEqualTypeOf<unknown>();
    // Also when the other handler is typed.
    expectTypeOf(
      Result.match(r, { ok: (v) => v + 1, err: untyped })
    ).toEqualTypeOf<unknown>();
    expectTypeOf(
      Maybe.match(m, { some: (v) => v + 1, none: untyped })
    ).toEqualTypeOf<unknown>();
    expectTypeOf(
      Maybe.match(m, { some: untyped, none: () => 0 })
    ).toEqualTypeOf<unknown>();
  });

  // On an untyped input an annotated handler parameter does not set the
  // type of the other handler's parameter.
  test("match on an untyped input with an annotated handler", () => {
    expectTypeOf(
      Result.match(untyped, { ok: (v) => v, err: (e: AppError) => e.kind })
    ).toEqualTypeOf<unknown>();
    expectTypeOf(
      Result.match(untyped, { ok: (v: string) => v, err: (e) => e })
    ).toEqualTypeOf<string | Error>();
    expectTypeOf(
      Maybe.match(untyped, { some: (v: string) => v, none: () => 1 })
    ).toEqualTypeOf<string | number>();
    // The error of a Result is an Error.
    // @ts-expect-error — a string is not an Error
    Result.match(untyped, { ok: (v) => v, err: (e: string) => e });
  });

  // A typed handler that returns `any` gives `any`, what calling it gives,
  // as `unwrapOrElse` does.
  test("match / Maybe.match with a handler that returns any give any", () => {
    expectTypeOf(
      Result.match(r, { ok: () => untyped, err: () => 0 })
      // biome-ignore lint/suspicious/noExplicitAny: the pinned type
    ).toEqualTypeOf<any>();
    expectTypeOf(
      Maybe.match(m, { some: (v) => mock(v), none: () => 0 })
      // biome-ignore lint/suspicious/noExplicitAny: the pinned type
    ).toEqualTypeOf<any>();
  });
});

// Explicit type arguments keep the meaning they had in 3.0.0: the overloads
// for an untyped value come first, and none of them takes the arguments of
// the typed overload.
describe("explicit type arguments", () => {
  const fail = (e: unknown): never => {
    throw e;
  };

  test("orElse / flatMapErr / flatMap keep the typed overload", () => {
    expectTypeOf(Result.orElse<number, AppError>(r, () => ok(1))).toEqualTypeOf<
      Result<number, never>
    >();
    expectTypeOf(Result.orElse<number, AppError>(r, fail)).toEqualTypeOf<
      Result<number, never>
    >();
    expectTypeOf(
      Result.flatMapErr<number, AppError>(r, () => ok(1))
    ).toEqualTypeOf<Result<number, never>>();
    expectTypeOf(
      Result.flatMap<number, string, AppError, TypeError>(r, () =>
        err(new TypeError())
      )
    ).toEqualTypeOf<Result<string, AppError | TypeError>>();
    expectTypeOf(Result.map<number, string, AppError>(r, String)).toEqualTypeOf<
      Result<string, AppError>
    >();
  });

  // The other type parameters keep their 3.0.0 defaults (`never`), also on
  // the functions that tell an untyped input apart with one signature.
  test("unwrapErr / split / flatten / transpose with the value type only", () => {
    const flat: Result<number, never> = Result.flatten<number>(ok(ok(1)));
    expectTypeOf(flat).toEqualTypeOf<Result<number, never>>();
    expectTypeOf(Result.split<number>(ok(1))).toEqualTypeOf<
      | readonly [failure: ErrResult<never>, value: undefined]
      | readonly [failure: undefined, value: number]
    >();
    expectTypeOf(Result.transpose<number>(ok(Maybe.some(1)))).toEqualTypeOf<
      Maybe<Result<number, never>>
    >();
    expectTypeOf(Maybe.transpose<number>(Maybe.some(ok(1)))).toEqualTypeOf<
      Result<Maybe<number>, never>
    >();
    expectTypeOf(Result.unwrap<number>(ok(1))).toEqualTypeOf<number>();
    expectTypeOf(Maybe.unwrap<number>(Maybe.some(1))).toEqualTypeOf<number>();
  });

  test("calls that 3.0.0 rejected are still rejected", () => {
    // @ts-expect-error — E is never, so an Err with an AppError does not fit
    Result.unwrapErr<number>(err(new AppError()));
    // @ts-expect-error — map has no overload with one type argument
    Result.map<number>(ok(1), String);
    // @ts-expect-error — Maybe.map has no overload with one type argument
    Maybe.map<number>(Maybe.some(1), String);
    // @ts-expect-error — U defaults to never
    Result.flatMap<number>(ok(1), (n) => ok(String(n)));
    // @ts-expect-error — U defaults to never
    Maybe.flatMap<number>(Maybe.some(1), (n) => Maybe.some(String(n)));
  });

  test("match with the input types only gives unknown (3.0.0: an error)", () => {
    expectTypeOf(
      Result.match<number, AppError>(r, { ok: String, err: () => "e" })
    ).toEqualTypeOf<unknown>();
    expectTypeOf(
      Maybe.match<number>(m, { some: String, none: () => "e" })
    ).toEqualTypeOf<unknown>();
  });
});
