// Fully typed code infers what it inferred in 3.0.0: every expected type
// and every rejected call in this file up to the last block is what the
// 3.0.0 types give with TypeScript 5.9 (and 7.0).  On TypeScript 5.0 and
// 5.4 the 3.0.0 types give a few of them differently; a comment marks
// those.  The overloads for an untyped (`any`) value must not change any of
// them; do not change an expected type to let a new overload pass.  The
// last block holds the typed calls whose types differ from 3.0.0 on
// purpose, with the 3.0.0 type in a comment.
import { describe, expectTypeOf, test } from "vitest";
import {
  type AggregateErrorOf,
  type ErrResult,
  err,
  isErr,
  isNone,
  isOk,
  isResult,
  isSome,
  Maybe,
  type None,
  none,
  normalizeError,
  type OkResult,
  ok,
  Result,
  type Some,
  some,
} from "../src/index.js";

class AppError extends Error {
  override readonly name = "AppError" as const;
}
class DbError extends Error {
  override readonly name = "DbError" as const;
  readonly code: string = "E_DB";
}
type Status = "active" | "inactive";
type Mode = "dev" | "prod";
type Config = { mode: Mode; port: number };
type Shape = { kind: "circle"; r: number } | { kind: "square"; side: number };
type H = { handler: (x: number) => number };
type Loose = "a" | "b" | (string & {});
type User = { id: number; name: string };
// A copy of a type that the library does not export.
type Split<T, E extends Error> =
  | readonly [failure: ErrResult<E>, value: undefined]
  | readonly [failure: undefined, value: T];

declare const rn: Result<number, AppError>;
declare const rnE: Result<number, Error>;
declare const neverValue: never;
declare const rs: Result<string, DbError>;
declare const rStatus: Result<Status, Error>;
declare const rCfg: Result<Config, Error>;
declare const rShape: Result<Shape, AppError>;
declare const rH: Result<H, Error>;
declare const okn: OkResult<number>;
declare const erra: ErrResult<AppError>;
declare const rNever: Result<number, never>;
declare const rnn: Result<Result<number, AppError>, DbError>;
declare const rm: Result<Maybe<number>, AppError>;
declare const rUnion: Result<number, AppError> | Result<string, DbError>;
declare const rArr: Result<number[], AppError>;
declare const rOpt: Result<number | undefined, AppError>;
declare const mn: Maybe<number>;
declare const ms: Maybe<Status>;
declare const mCfg: Maybe<Config>;
declare const mH: Maybe<H>;
declare const somen: Some<number>;
declare const nn: None;
declare const mr: Maybe<Result<number, AppError>>;
declare const mm: Maybe<Maybe<number>>;
declare const pn: Promise<number>;
declare const pStatus: Promise<Status>;
declare const prn: Promise<Result<number, AppError>>;
declare const prs: Promise<Result<string, DbError>>;
declare const pmn: Promise<Maybe<number>>;
declare const plike: PromiseLike<number>;
declare const results: Result<number, AppError>[];
declare const maybes: Maybe<number>[];
declare const unknownValue: unknown;
declare function getUser(id: number): Result<User, AppError>;
declare function findUser(id: number): Maybe<User>;
declare function fetchUser(id: number): Promise<Result<User, AppError>>;
declare function readPort(): Promise<number>;
declare function recover(e: AppError): Result<number, DbError>;
declare function toDb(e: AppError): DbError;
declare function log(v: unknown): void;
declare function parseNum(s: string): number;
declare function fail(e: unknown): never;
declare function identity<T>(x: T): T;
declare function wrapOk<X>(x: X): OkResult<X>;
declare function wrapSome<X>(x: X): Some<X>;
declare function useConfig(c: Config): void;
declare function useStatus(s: Status): void;
declare function useResult<T, E extends Error>(r: Result<T, E>): T;
declare function useShapeResult(r: Result<Shape, AppError>): void;
declare function keep<R extends Result<Loose, AppError>>(r: R): R;
declare function keepMaybe<M extends Maybe<Loose>>(m: M): M;
declare function validate(v: number): Result<number, DbError>;
declare const isPositive: (v: number) => boolean;
declare const notAnError: () => string;
describe("map", () => {
  test("inferred", () => {
    const t_map_1 = Result.map(rn, (v) => v + 1);
    expectTypeOf(t_map_1).toEqualTypeOf<Result<number, AppError>>();

    const t_map_2 = Result.map(rn, (v) => String(v));
    expectTypeOf(t_map_2).toEqualTypeOf<Result<string, AppError>>();

    const t_map_3 = Result.map(rn, () => "a");
    expectTypeOf(t_map_3).toEqualTypeOf<Result<string, AppError>>();

    const t_map_4 = Result.map(rn, (v) => ({ v }));
    expectTypeOf(t_map_4).toEqualTypeOf<Result<{ v: number }, AppError>>();

    const t_map_5 = Result.map(okn, (v) => v * 2);
    expectTypeOf(t_map_5).toEqualTypeOf<OkResult<number>>();

    const t_map_6 = Result.map(erra, (v) => v);
    expectTypeOf(t_map_6).toEqualTypeOf<ErrResult<AppError>>();

    const t_map_7 = Result.map(rn, (v: number) => v + 1);
    expectTypeOf(t_map_7).toEqualTypeOf<Result<number, AppError>>();

    const t_map_8 = Result.map(rn, String);
    expectTypeOf(t_map_8).toEqualTypeOf<Result<string, AppError>>();

    const t_map_9 = Result.map(rn, async (v) => v);
    expectTypeOf(t_map_9).toEqualTypeOf<{
      readonly "Result.map does not await. Await the value first, or use Result.tryCatchAsync for async work": never;
    }>();

    const t_map_10 = Result.map(rn, (v) => {
      throw v;
    });
    expectTypeOf(t_map_10).toEqualTypeOf<Result<never, AppError>>();

    const t_map_11 = Result.map(rNever, (v) => v);
    expectTypeOf(t_map_11).toEqualTypeOf<Result<number, never>>();

    const t_map_12 = Result.map(ok(1), (v) => v);
    expectTypeOf(t_map_12).toEqualTypeOf<OkResult<number>>();

    const t_map_13 = Result.map(err(new AppError()), (v) => v);
    expectTypeOf(t_map_13).toEqualTypeOf<ErrResult<AppError>>();

    const t_map_14 = Result.map(rn, () => "active" as const);
    expectTypeOf(t_map_14).toEqualTypeOf<Result<"active", AppError>>();

    const t_map_15 = Result.map(rn, (v) => (v > 0 ? "active" : "inactive"));
    expectTypeOf(t_map_15).toEqualTypeOf<
      Result<"active" | "inactive", AppError>
    >();

    const t_map_16 = Result.map(rn, (v) => ({ handler: (x: number) => x + v }));
    expectTypeOf(t_map_16).toEqualTypeOf<
      Result<{ handler: (x: number) => number }, AppError>
    >();

    const t_map_17 = Result.map<number, string, AppError>(rn, String);
    expectTypeOf(t_map_17).toEqualTypeOf<Result<string, AppError>>();

    const t_map_18 = Result.map(rn, identity);
    expectTypeOf(t_map_18).toEqualTypeOf<Result<number, AppError>>();

    const t_map_20 = Result.map(rn, (v) => [v, String(v)] as const);
    expectTypeOf(t_map_20).toEqualTypeOf<
      Result<readonly [number, string], AppError>
    >();

    const t_map_21 = Result.map(rn, (v) => ok(v));
    expectTypeOf(t_map_21).toEqualTypeOf<Result<OkResult<number>, AppError>>();

    const t_map_22 = Result.map(rn, () => undefined);
    expectTypeOf(t_map_22).toEqualTypeOf<Result<undefined, AppError>>();

    const t_map_23 = Result.map(rn, () => {});
    expectTypeOf(t_map_23).toEqualTypeOf<Result<void, AppError>>();

    const t_map_24 = Result.map(rn, (v) => Promise.resolve(v));
    expectTypeOf(t_map_24).toEqualTypeOf<{
      readonly "Result.map does not await. Await the value first, or use Result.tryCatchAsync for async work": never;
    }>();

    // biome-ignore lint/complexity/useArrowFunction: a function expression callback
    const t_map_25 = Result.map(rn, function (v) {
      return v + 1;
    });
    expectTypeOf(t_map_25).toEqualTypeOf<Result<number, AppError>>();

    const t_map_26 = Result.map(rn, (v) => ({ kind: "circle" as const, r: v }));
    expectTypeOf(t_map_26).toEqualTypeOf<
      Result<{ kind: "circle"; r: number }, AppError>
    >();

    const t_map_27 = Result.map(rArr, (xs) => xs.map((x) => x + 1));
    expectTypeOf(t_map_27).toEqualTypeOf<Result<number[], AppError>>();

    const t_map_28 = Result.map(rn, (v) =>
      v > 0 ? ok(v) : err(new DbError())
    );
    expectTypeOf(t_map_28).toEqualTypeOf<
      Result<OkResult<number> | ErrResult<DbError>, AppError>
    >();

    const t_map_29 = Result.map(okn, async () => 1);
    expectTypeOf(t_map_29).toEqualTypeOf<{
      readonly "Result.map does not await. Await the value first, or use Result.tryCatchAsync for async work": never;
    }>();

    const t_map_30 = Result.map(rn, (): Status => "active");
    expectTypeOf(t_map_30).toEqualTypeOf<Result<Status, AppError>>();

    const t_map_31 = Result.map(rn, () => ({ mode: "dev", port: 1 }));
    expectTypeOf(t_map_31).toEqualTypeOf<
      Result<{ mode: string; port: number }, AppError>
    >();

    const t_map_32 = Result.map(rn, fail);
    expectTypeOf(t_map_32).toEqualTypeOf<Result<never, AppError>>();

    const t_map_33 = Result.map(erra, () => "a");
    expectTypeOf(t_map_33).toEqualTypeOf<ErrResult<AppError>>();

    const t_map_34 = Result.map(rn, Math.abs);
    expectTypeOf(t_map_34).toEqualTypeOf<Result<number, AppError>>();

    const t_map_35 = Result.map(rn, (v) => [v]);
    expectTypeOf(t_map_35).toEqualTypeOf<Result<number[], AppError>>();

    const t_map_36 = keep(Result.map(rn, () => "a"));
    expectTypeOf(t_map_36).toEqualTypeOf<Result<string, AppError>>();

    const t_map_37 = Result.map(rn, (v) => ({ ok: true, value: v }));
    expectTypeOf(t_map_37).toEqualTypeOf<
      Result<{ ok: boolean; value: number }, AppError>
    >();

    const t_map_38 = Result.map<number, Promise<number>, AppError>(
      rn,
      async (v) => v
    );
    expectTypeOf(t_map_38).toEqualTypeOf<{
      readonly "Result.map does not await. Await the value first, or use Result.tryCatchAsync for async work": never;
    }>();
  });
  test("declared", () => {
    const a_map_2: Result<string, AppError> = Result.map(rn, (v) => String(v));
    const a_map_4: Result<Loose, AppError> = Result.map(rn, () => "a");
    const a_map_5: Result<Status, AppError> = Result.map(
      rn,
      (): Status => "active"
    );
    const a_map_6: Result<number, AppError> = Result.map(rn, (v) => v);
    const a_map_7: OkResult<string> = Result.map(okn, String);
    const a_map_10: Result<Loose, AppError> = Result.map(rn, (v) =>
      v ? "a" : "b"
    );
    const a_map_11: Result<{ s: Loose }, AppError> = Result.map(rn, () => ({
      s: "a",
    }));
    void [a_map_2, a_map_4, a_map_5, a_map_6, a_map_7, a_map_10, a_map_11];
  });
  test("generic", () => {
    function g_map_1<T>(r: Result<T, AppError>) {
      return Result.map(r, (v) => [v]);
    }
    expectTypeOf(g_map_1).toEqualTypeOf<
      <T>(r: Result<T, AppError>) => Result<T[], AppError>
    >();

    function g_map_2<T, E extends Error>(r: Result<T, E>, f: (v: T) => string) {
      return Result.map(r, f);
    }
    expectTypeOf(g_map_2).toEqualTypeOf<
      <T, E extends Error>(
        r: Result<T, E>,
        f: (v: T) => string
      ) => Result<string, E>
    >();

    function g_map_3<T>(r: Result<T, AppError>, f: (v: T) => Promise<T>) {
      return Result.map(r, f);
    }
    expectTypeOf(g_map_3).toEqualTypeOf<
      <T>(
        r: Result<T, AppError>,
        f: (v: T) => Promise<T>
      ) => {
        readonly "Result.map does not await. Await the value first, or use Result.tryCatchAsync for async work": never;
      }
    >();

    function g_map_5<U>(r: Result<number, AppError>, f: (v: number) => U) {
      return Result.map(r, f);
    }
    expectTypeOf(g_map_5).toEqualTypeOf<
      <U>(
        r: Result<number, AppError>,
        f: (v: number) => U
      ) => Result<U, AppError>
    >();
  });
});

describe("mapError", () => {
  test("inferred", () => {
    const t_mapError_1 = Result.mapError(rn, (e) => new DbError(e.message));
    expectTypeOf(t_mapError_1).toEqualTypeOf<Result<number, DbError>>();

    const t_mapError_2 = Result.mapError(rn, (e: AppError) => toDb(e));
    expectTypeOf(t_mapError_2).toEqualTypeOf<Result<number, DbError>>();

    const t_mapError_3 = Result.mapError(okn, () => new DbError());
    expectTypeOf(t_mapError_3).toEqualTypeOf<OkResult<number>>();

    const t_mapError_4 = Result.mapError(erra, (e) => new DbError(e.name));
    expectTypeOf(t_mapError_4).toEqualTypeOf<ErrResult<DbError>>();

    const t_mapError_5 = Result.mapError(rn, () => new TypeError());
    expectTypeOf(t_mapError_5).toEqualTypeOf<Result<number, TypeError>>();

    const t_mapError_6 = Result.mapError(rn, toDb);
    expectTypeOf(t_mapError_6).toEqualTypeOf<Result<number, DbError>>();

    const t_mapError_7 = Result.mapError<number, AppError, DbError>(rn, toDb);
    expectTypeOf(t_mapError_7).toEqualTypeOf<Result<number, DbError>>();

    const t_mapError_8 = Result.mapError(rn, (e) => e);
    expectTypeOf(t_mapError_8).toEqualTypeOf<Result<number, AppError>>();

    const t_mapError_9 = Result.mapError(rNever, () => new DbError());
    expectTypeOf(t_mapError_9).toEqualTypeOf<Result<number, DbError>>();

    const t_mapError_11 = Result.mapError<number>(okn, () => new DbError());
    expectTypeOf(t_mapError_11).toEqualTypeOf<OkResult<number>>();

    const t_mapError_12 = Result.mapError<AppError, DbError>(erra, toDb);
    expectTypeOf(t_mapError_12).toEqualTypeOf<ErrResult<DbError>>();
  });
  test("declared", () => {
    const a_mapError_1: Result<number, Error> = Result.mapError(
      rn,
      () => new DbError()
    );
    const a_mapError_2: Result<number, DbError> = Result.mapError(rn, (e) =>
      toDb(e)
    );
    const a_mapError_3: OkResult<number> = Result.mapError(
      okn,
      () => new DbError()
    );
    void [a_mapError_1, a_mapError_2, a_mapError_3];
  });
  test("generic", () => {
    function g_mapError_1<T, E extends Error>(r: Result<T, E>) {
      return Result.mapError(r, (e) => new DbError(e.message));
    }
    expectTypeOf(g_mapError_1).toEqualTypeOf<
      <T, E extends Error>(r: Result<T, E>) => Result<T, DbError>
    >();
  });
});

describe("inspect and inspectError", () => {
  test("inferred", () => {
    const t_inspect_1 = Result.inspect(rn, (v) => log(v));
    expectTypeOf(t_inspect_1).toEqualTypeOf<Result<number, AppError>>();

    const t_inspect_2 = Result.inspect(okn, (v) => log(v));
    expectTypeOf(t_inspect_2).toEqualTypeOf<OkResult<number>>();

    const t_inspect_3 = Result.inspect(rn, () => {});
    expectTypeOf(t_inspect_3).toEqualTypeOf<Result<number, AppError>>();

    const t_inspect_4 = Result.inspect(erra, () => {});
    expectTypeOf(t_inspect_4).toEqualTypeOf<Result<unknown, AppError>>();

    const t_inspect_5 = Result.inspect(rn, log);
    expectTypeOf(t_inspect_5).toEqualTypeOf<Result<number, AppError>>();

    const t_inspect_6 = Result.inspect(rn, (v: number) => log(v));
    expectTypeOf(t_inspect_6).toEqualTypeOf<Result<number, AppError>>();

    const t_inspect_7 = Result.inspect<number, AppError>(rn, log);
    expectTypeOf(t_inspect_7).toEqualTypeOf<Result<number, AppError>>();

    const t_inspect_8 = Result.inspect(rn, (v) => v + 1);
    expectTypeOf(t_inspect_8).toEqualTypeOf<Result<number, AppError>>();

    const t_inspect_9 = Result.inspect<number>(okn, log);
    expectTypeOf(t_inspect_9).toEqualTypeOf<OkResult<number>>();

    const t_inspectError_1 = Result.inspectError(rn, (e) => log(e));
    expectTypeOf(t_inspectError_1).toEqualTypeOf<Result<number, AppError>>();

    const t_inspectError_2 = Result.inspectError(erra, (e) => log(e.name));
    expectTypeOf(t_inspectError_2).toEqualTypeOf<ErrResult<AppError>>();

    const t_inspectError_3 = Result.inspectError(okn, () => {});
    expectTypeOf(t_inspectError_3).toEqualTypeOf<Result<number, Error>>();

    const t_inspectError_4 = Result.inspectError(rn, log);
    expectTypeOf(t_inspectError_4).toEqualTypeOf<Result<number, AppError>>();

    const t_inspectError_5 = Result.inspectError(rn, (e: AppError) => log(e));
    expectTypeOf(t_inspectError_5).toEqualTypeOf<Result<number, AppError>>();

    const t_inspectError_6 = Result.inspectError<number, AppError>(rn, log);
    expectTypeOf(t_inspectError_6).toEqualTypeOf<Result<number, AppError>>();

    const t_inspectError_7 = Result.inspectError<AppError>(erra, log);
    expectTypeOf(t_inspectError_7).toEqualTypeOf<ErrResult<AppError>>();
  });
  test("declared", () => {
    const a_inspect_1: Result<number, AppError> = Result.inspect(rn, () => {});
    const a_inspect_2: Result<number, AppError> = Result.inspectError(rn, log);
    void [a_inspect_1, a_inspect_2];
  });
});

describe("flatMap", () => {
  test("inferred", () => {
    const t_flatMap_1 = Result.flatMap(rn, (v) => ok(v + 1));
    expectTypeOf(t_flatMap_1).toEqualTypeOf<Result<number, AppError>>();

    const t_flatMap_2 = Result.flatMap(rn, () => err(new DbError()));
    expectTypeOf(t_flatMap_2).toEqualTypeOf<
      Result<never, AppError | DbError>
    >();

    const t_flatMap_3 = Result.flatMap(rn, (v) =>
      v > 0 ? ok(v) : err(new DbError())
    );
    expectTypeOf(t_flatMap_3).toEqualTypeOf<
      Result<number, AppError | DbError>
    >();

    const t_flatMap_4 = Result.flatMap(rn, () => ok("active"));
    expectTypeOf(t_flatMap_4).toEqualTypeOf<Result<string, AppError>>();

    const t_flatMap_5 = Result.flatMap(rn, (v) => getUser(v));
    expectTypeOf(t_flatMap_5).toEqualTypeOf<Result<User, AppError>>();

    const t_flatMap_6 = Result.flatMap(rn, getUser);
    expectTypeOf(t_flatMap_6).toEqualTypeOf<Result<User, AppError>>();

    const t_flatMap_7 = Result.flatMap(rn, () => rs);
    expectTypeOf(t_flatMap_7).toEqualTypeOf<
      Result<string, AppError | DbError>
    >();

    const t_flatMap_8 = Result.flatMap(rn, (v) => ({ ok: true, value: v }));
    expectTypeOf(t_flatMap_8).toEqualTypeOf<Result<number, AppError>>();

    const t_flatMap_9 = Result.flatMap(rn, (v) => ({
      ok: true as const,
      value: v,
    }));
    expectTypeOf(t_flatMap_9).toEqualTypeOf<Result<number, AppError>>();

    const t_flatMap_10 = Result.flatMap(
      rn,
      (v): Result<Status, DbError> =>
        v > 0 ? ok("active") : err(new DbError())
    );
    expectTypeOf(t_flatMap_10).toEqualTypeOf<
      Result<Status, AppError | DbError>
    >();

    const t_flatMap_11 = Result.flatMap(okn, (v) => ok(String(v)));
    expectTypeOf(t_flatMap_11).toEqualTypeOf<Result<string, never>>();

    const t_flatMap_12 = Result.flatMap(erra, () => ok(1));
    expectTypeOf(t_flatMap_12).toEqualTypeOf<Result<number, AppError>>();

    const t_flatMap_13 = Result.flatMap(rn, fail);
    expectTypeOf(t_flatMap_13).toEqualTypeOf<Result<never, AppError>>();

    const t_flatMap_14 = Result.flatMap<number, string, AppError, TypeError>(
      rn,
      () => err(new TypeError())
    );
    expectTypeOf(t_flatMap_14).toEqualTypeOf<
      Result<string, AppError | TypeError>
    >();

    const t_flatMap_15 = Result.flatMap(rn, (v: number) => ok(v));
    expectTypeOf(t_flatMap_15).toEqualTypeOf<Result<number, AppError>>();

    const t_flatMap_16 = Result.flatMap(rn, (v) => ({
      ok: false,
      error: new DbError(String(v)),
    }));
    expectTypeOf(t_flatMap_16).toEqualTypeOf<
      Result<never, AppError | DbError>
    >();

    const t_flatMap_17 = Result.flatMap(rn, (v) =>
      Result.map(rs, (s) => s + v)
    );
    expectTypeOf(t_flatMap_17).toEqualTypeOf<
      Result<string, AppError | DbError>
    >();

    const t_flatMap_18 = Result.flatMap(rn, () => ok({ mode: "dev", port: 1 }));
    expectTypeOf(t_flatMap_18).toEqualTypeOf<
      Result<{ mode: string; port: number }, AppError>
    >();

    const t_flatMap_20 = Result.flatMap(rn, (v) => {
      if (v > 0) return ok(v);
      return err(new DbError());
    });
    expectTypeOf(t_flatMap_20).toEqualTypeOf<
      Result<number, AppError | DbError>
    >();

    const t_flatMap_21 = Result.flatMap(rn, (v) =>
      Result.fromNullable(v, () => new DbError())
    );
    expectTypeOf(t_flatMap_21).toEqualTypeOf<
      Result<number, AppError | DbError>
    >();

    const t_flatMap_22 = Result.flatMap(rNever, (v) => ok(v));
    expectTypeOf(t_flatMap_22).toEqualTypeOf<Result<number, never>>();

    const t_flatMap_23 = Result.flatMap(rn, (v) =>
      ok({ handler: (x: number) => x + v })
    );
    expectTypeOf(t_flatMap_23).toEqualTypeOf<
      Result<{ handler: (x: number) => number }, AppError>
    >();

    const t_flatMap_24 = Result.flatMap(ok(1), (v) => ok(v));
    expectTypeOf(t_flatMap_24).toEqualTypeOf<Result<number, never>>();

    const t_flatMap_26 = Result.flatMap(rn, wrapOk);
    expectTypeOf(t_flatMap_26).toEqualTypeOf<Result<number, AppError>>();

    const t_flatMap_27 = Result.flatMap(rn, validate);
    expectTypeOf(t_flatMap_27).toEqualTypeOf<
      Result<number, AppError | DbError>
    >();

    const t_flatMap_28 = Result.flatMap(rn, (v) => validate(v));
    expectTypeOf(t_flatMap_28).toEqualTypeOf<
      Result<number, AppError | DbError>
    >();

    const t_flatMap_29 = Result.flatMap(rn, () => ok(undefined));
    expectTypeOf(t_flatMap_29).toEqualTypeOf<Result<undefined, AppError>>();

    const t_flatMap_30 = Result.flatMap(rn, () => ok());
    expectTypeOf(t_flatMap_30).toEqualTypeOf<Result<undefined, AppError>>();

    const t_flatMap_31 = Result.flatMap(erra, (v) => ok(v));
    expectTypeOf(t_flatMap_31).toEqualTypeOf<Result<unknown, AppError>>();

    const t_flatMap_32 = Result.flatMap<number, number, AppError, DbError>(
      rn,
      validate
    );
    expectTypeOf(t_flatMap_32).toEqualTypeOf<
      Result<number, AppError | DbError>
    >();

    // biome-ignore lint/complexity/useArrowFunction: a function expression callback
    const t_flatMap_33 = Result.flatMap(rn, function (v) {
      return ok(v);
    });
    expectTypeOf(t_flatMap_33).toEqualTypeOf<Result<number, AppError>>();

    const t_flatMap_34 = keep(Result.flatMap(rn, () => ok("a")));
    expectTypeOf(t_flatMap_34).toEqualTypeOf<Result<"a", AppError>>();

    const t_flatMap_35 = Result.flatMap(rn, (v) =>
      ok(v > 0 ? "active" : "inactive")
    );
    expectTypeOf(t_flatMap_35).toEqualTypeOf<Result<string, AppError>>();
  });
  test("declared", () => {
    const a_flatMap_1: Result<Status, AppError | DbError> = Result.flatMap(
      rn,
      (v) => (v > 0 ? ok("active") : err(new DbError()))
    );
    const a_flatMap_2: Result<Status, Error> = Result.flatMap(rn, () =>
      ok("active")
    );
    const a_flatMap_3: Result<Status, Error> = Result.flatMap(rn, (v) =>
      ok(v > 0 ? "active" : "inactive")
    );
    const a_flatMap_4: Result<Config, AppError> = Result.flatMap(rn, (p) =>
      ok({ mode: "dev", port: p })
    );
    const a_flatMap_5: Result<Config, AppError> = Result.flatMap(rn, () =>
      ok({ mode: "dev", port: 1 })
    );
    const a_flatMap_6: Result<H, Error> = Result.flatMap(rn, (v) =>
      ok({ handler: (x) => x + v })
    );
    const a_flatMap_7: Result<number, AppError> = Result.flatMap(rn, (v) => ({
      ok: true,
      value: v,
    }));
    const a_flatMap_8: Result<Shape, AppError> = Result.flatMap(rn, (v) =>
      ok({ kind: "circle", r: v })
    );
    const a_flatMap_9: Result<Status, Error> = Result.flatMap(rn, (v) => ({
      ok: true,
      value: v > 0 ? "active" : "inactive",
    }));
    const a_flatMap_10: Result<Loose, Error> = Result.flatMap(rn, () =>
      ok("a")
    );
    const a_flatMap_11: Result<number, AppError | DbError> = Result.flatMap(
      rn,
      validate
    );
    const a_flatMap_12: Result<H, Error> = Result.flatMap(rn, () =>
      ok({ handler: (x) => x })
    );
    const a_flatMap_13: Result<Status, AppError> = Result.flatMap(erra, () =>
      ok("active")
    );
    const a_flatMap_14: Result<Status, DbError> = Result.flatMap(okn, () =>
      ok("active")
    );
    const a_flatMap_15: Result<Status, Error> = Result.flatMap(rn, (v) => {
      if (v > 0) return ok("active");
      return err(new Error());
    });
    function f_flatMap_1(): Result<Status, Error> {
      return Result.flatMap(rn, (v) => ok(v > 0 ? "active" : "inactive"));
    }
    function f_flatMap_2(): Result<Config, Error> {
      return Result.flatMap(rn, (p) => ok({ mode: "dev", port: p }));
    }
    async function f_flatMap_3(): Promise<Result<Status, Error>> {
      return Result.flatMap(await prn, () => ok("active"));
    }
    const f_flatMap_4 = (): Result<Status, Error> =>
      Result.flatMap(rn, () => ok("active"));
    void [
      a_flatMap_1,
      a_flatMap_2,
      a_flatMap_3,
      a_flatMap_4,
      a_flatMap_5,
      a_flatMap_6,
      a_flatMap_7,
      a_flatMap_8,
      a_flatMap_9,
      a_flatMap_10,
      a_flatMap_11,
      a_flatMap_12,
      a_flatMap_13,
      a_flatMap_14,
      a_flatMap_15,
      f_flatMap_1,
      f_flatMap_2,
      f_flatMap_3,
      f_flatMap_4,
    ];
  });
  test("generic", () => {
    function g_flatMap_1<T>(r: Result<T, AppError>) {
      return Result.flatMap(r, (v) => ok([v]));
    }
    expectTypeOf(g_flatMap_1).toEqualTypeOf<
      <T>(r: Result<T, AppError>) => Result<T[], AppError>
    >();

    function g_flatMap_2<T, U, E extends Error>(
      r: Result<T, AppError>,
      f: (v: T) => Result<U, E>
    ) {
      return Result.flatMap(r, f);
    }
    expectTypeOf(g_flatMap_2).toEqualTypeOf<
      <T, U, E extends Error>(
        r: Result<T, AppError>,
        f: (v: T) => Result<U, E>
      ) => Result<U, AppError | E>
    >();

    function g_flatMap_4<F extends (v: number) => Result<string, DbError>>(
      r: Result<number, AppError>,
      f: F
    ) {
      return Result.flatMap(r, f);
    }
    expectTypeOf(g_flatMap_4).toEqualTypeOf<
      <F extends (v: number) => Result<string, DbError>>(
        r: Result<number, AppError>,
        f: F
      ) => Result<string, AppError | DbError>
    >();

    function g_flatMap_5<T>(r: Result<T, AppError>, f: (v: T) => never) {
      return Result.flatMap(r, f);
    }
    expectTypeOf(g_flatMap_5).toEqualTypeOf<
      <T>(r: Result<T, AppError>, f: (v: T) => never) => Result<never, AppError>
    >();
  });
});

describe("orElse and flatMapErr", () => {
  test("inferred", () => {
    const t_orElse_1 = Result.orElse(rn, () => ok(0));
    expectTypeOf(t_orElse_1).toEqualTypeOf<Result<number, never>>();

    const t_orElse_2 = Result.orElse(rn, (e) => err(new DbError(e.message)));
    expectTypeOf(t_orElse_2).toEqualTypeOf<Result<number, DbError>>();

    const t_orElse_3 = Result.orElse(rn, (e) =>
      e.message ? ok(1) : err(new DbError())
    );
    expectTypeOf(t_orElse_3).toEqualTypeOf<Result<number, DbError>>();

    const t_orElse_4 = Result.orElse(rn, recover);
    expectTypeOf(t_orElse_4).toEqualTypeOf<Result<number, DbError>>();

    const t_orElse_5 = Result.orElse(rn, fail);
    expectTypeOf(t_orElse_5).toEqualTypeOf<Result<number, never>>();

    const t_orElse_6 = Result.orElse(okn, () => ok(1));
    expectTypeOf(t_orElse_6).toEqualTypeOf<Result<number, never>>();

    const t_orElse_7 = Result.orElse(erra, () => ok(1));
    expectTypeOf(t_orElse_7).toEqualTypeOf<Result<number, never>>();

    const t_orElse_8 = Result.orElse(rn, (e: AppError) => ok(e.message.length));
    expectTypeOf(t_orElse_8).toEqualTypeOf<Result<number, never>>();

    const t_orElse_9 = Result.orElse<number, AppError>(rn, () => ok(1));
    expectTypeOf(t_orElse_9).toEqualTypeOf<Result<number, never>>();

    const t_orElse_10 = Result.orElse<number, AppError, DbError>(rn, () =>
      err(new DbError())
    );
    expectTypeOf(t_orElse_10).toEqualTypeOf<Result<number, DbError>>();

    const t_orElse_11 = Result.orElse(rCfg, () =>
      ok({ mode: "dev" as const, port: 1 })
    );
    expectTypeOf(t_orElse_11).toEqualTypeOf<Result<Config, never>>();

    const t_orElse_12 = Result.orElse(rShape, () =>
      ok({ kind: "circle" as const, r: 1 })
    );
    expectTypeOf(t_orElse_12).toEqualTypeOf<Result<Shape, never>>();

    const t_orElse_13 = Result.orElse(rn, () => rNever);
    expectTypeOf(t_orElse_13).toEqualTypeOf<Result<number, never>>();

    const t_orElse_14 = Result.orElse(rn, (e) => ({
      ok: true,
      value: e.message.length,
    }));
    expectTypeOf(t_orElse_14).toEqualTypeOf<Result<number, never>>();

    const t_orElse_15 = Result.orElse(rH, () =>
      ok({ handler: (x: number) => x })
    );
    expectTypeOf(t_orElse_15).toEqualTypeOf<
      Result<{ handler: (x: number) => number }, never>
    >();

    const t_orElse_16 = Result.orElse(rn, () => {
      return ok(0);
    });
    expectTypeOf(t_orElse_16).toEqualTypeOf<Result<number, never>>();

    const t_orElse_17 = Result.orElse(rNever, () => ok(1));
    expectTypeOf(t_orElse_17).toEqualTypeOf<Result<number, never>>();

    const t_orElse_20 = Result.orElse(erra, () => ok("x"));
    expectTypeOf(t_orElse_20).toEqualTypeOf<Result<string, never>>();

    const t_orElse_21 = Result.orElse(rn, () => ({
      ok: false,
      error: new DbError(),
    }));
    expectTypeOf(t_orElse_21).toEqualTypeOf<Result<number, DbError>>();

    const t_orElse_nested_1 = Result.orElse(rH, () =>
      ok({ handler: (x) => x + 1 })
    );
    expectTypeOf(t_orElse_nested_1).toEqualTypeOf<
      Result<{ handler: (x: number) => number }, never>
    >();

    const t_orElse_nested_2 = Result.flatMapErr(rH, (e) =>
      ok({ handler: (x) => x + e.message.length })
    );
    expectTypeOf(t_orElse_nested_2).toEqualTypeOf<
      Result<{ handler: (x: number) => number }, never>
    >();

    const t_flatMapErr_1 = Result.flatMapErr(rn, () => ok(0));
    expectTypeOf(t_flatMapErr_1).toEqualTypeOf<Result<number, never>>();

    const t_flatMapErr_2 = Result.flatMapErr(rn, (e) =>
      err(new DbError(e.message))
    );
    expectTypeOf(t_flatMapErr_2).toEqualTypeOf<Result<number, DbError>>();

    const t_flatMapErr_3 = Result.flatMapErr(rn, recover);
    expectTypeOf(t_flatMapErr_3).toEqualTypeOf<Result<number, DbError>>();

    const t_flatMapErr_4 = Result.flatMapErr(rn, fail);
    expectTypeOf(t_flatMapErr_4).toEqualTypeOf<Result<number, never>>();

    const t_flatMapErr_5 = Result.flatMapErr<number, AppError>(rn, () => ok(1));
    expectTypeOf(t_flatMapErr_5).toEqualTypeOf<Result<number, never>>();

    const t_flatMapErr_6 = Result.flatMapErr(erra, () => ok(1));
    expectTypeOf(t_flatMapErr_6).toEqualTypeOf<Result<number, never>>();

    const t_flatMapErr_7 = Result.flatMapErr<number, AppError, DbError>(
      rn,
      recover
    );
    expectTypeOf(t_flatMapErr_7).toEqualTypeOf<Result<number, DbError>>();
  });
  test("declared", () => {
    const a_orElse_1: Result<Status, never> = Result.orElse(rStatus, () =>
      ok("inactive")
    );
    const a_orElse_2: Result<Config, never> = Result.orElse(rCfg, (e) =>
      ok({ mode: "dev", port: e.message.length })
    );
    const a_orElse_3: Result<Config, never> = Result.orElse(rCfg, () =>
      ok({ mode: "dev", port: 1 })
    );
    const a_orElse_4: Result<Shape, never> = Result.orElse(rShape, () =>
      ok({ kind: "square", side: 1 })
    );
    const a_orElse_5: Result<Status, DbError> = Result.orElse(rStatus, (e) =>
      e.message ? ok("inactive") : err(new DbError())
    );
    const a_orElse_6: Result<Status, never> = Result.orElse(rStatus, () => ({
      ok: true,
      value: "inactive",
    }));
    const a_orElse_7: Result<Status, never> = Result.flatMapErr(rStatus, () =>
      ok("inactive")
    );
    const a_orElse_8: Result<Config, never> = Result.flatMapErr(rCfg, () =>
      ok({ mode: "dev", port: 1 })
    );
    const a_orElse_9: Result<number, DbError> = Result.orElse(rn, recover);
    const a_orElse_10: Result<Status, Error> = Result.orElse(rStatus, () =>
      ok("active")
    );
    const a_orElse_11: Result<Status, never> = Result.orElse(erra, () =>
      ok("active")
    );
    const a_orElse_12: Result<Config, never> = Result.orElse(erra, () =>
      ok({ mode: "dev", port: 1 })
    );
    const a_orElse_13: Result<H, never> = Result.orElse(rH, () =>
      ok({ handler: (x) => x })
    );
    const a_orElse_14: Result<Status, never> = Result.flatMapErr(erra, () =>
      ok("inactive")
    );
    function f_orElse_1(): Result<Status, never> {
      return Result.orElse(rStatus, () => ok("inactive"));
    }
    function f_orElse_2(): Result<Config, DbError> {
      return Result.orElse(rCfg, (e) =>
        e.message ? ok({ mode: "prod", port: 80 }) : err(new DbError())
      );
    }
    const f_orElse_3 = (
      r: Result<Status, never> = Result.orElse(rStatus, () => ok("inactive"))
    ) => r;
    void [
      a_orElse_1,
      a_orElse_2,
      a_orElse_3,
      a_orElse_4,
      a_orElse_5,
      a_orElse_6,
      a_orElse_7,
      a_orElse_8,
      a_orElse_9,
      a_orElse_10,
      a_orElse_11,
      a_orElse_12,
      a_orElse_13,
      a_orElse_14,
      f_orElse_1,
      f_orElse_2,
      f_orElse_3,
    ];
  });
  test("generic", () => {
    function g_orElse_1<T>(r: Result<T, AppError>, fallback: T) {
      return Result.orElse(r, () => ok(fallback));
    }
    expectTypeOf(g_orElse_1).toEqualTypeOf<
      <T>(r: Result<T, AppError>, fallback: T) => Result<T, never>
    >();

    function g_orElse_2<T, F extends Error>(
      r: Result<T, AppError>,
      f: (e: AppError) => Result<T, F>
    ) {
      return Result.orElse(r, f);
    }
    expectTypeOf(g_orElse_2).toEqualTypeOf<
      <T, F extends Error>(
        r: Result<T, AppError>,
        f: (e: AppError) => Result<T, F>
      ) => Result<T, F>
    >();
  });
});

describe("unwrap, unwrapErr, unwrapOr, unwrapOrElse, split and flatten", () => {
  test("inferred", () => {
    const t_flatten_1 = Result.flatten(rnn);
    expectTypeOf(t_flatten_1).toEqualTypeOf<
      Result<number, AppError | DbError>
    >();

    const t_flatten_2 = Result.flatten(ok(rn));
    expectTypeOf(t_flatten_2).toEqualTypeOf<Result<number, AppError>>();

    const t_flatten_3 = Result.flatten<number, AppError, DbError>(rnn);
    expectTypeOf(t_flatten_3).toEqualTypeOf<
      Result<number, AppError | DbError>
    >();

    const t_unwrap_1 = Result.unwrap(rn);
    expectTypeOf(t_unwrap_1).toEqualTypeOf<number>();

    const t_unwrap_2 = Result.unwrap(okn);
    expectTypeOf(t_unwrap_2).toEqualTypeOf<number>();

    const t_unwrap_3 = Result.unwrap(rStatus);
    expectTypeOf<typeof t_unwrap_3>().toEqualTypeOf<Status>();

    const t_unwrap_4 = Result.unwrap<number, AppError>(rn);
    expectTypeOf(t_unwrap_4).toEqualTypeOf<number>();

    const t_unwrap_6 = Result.unwrap<number>(okn);
    expectTypeOf(t_unwrap_6).toEqualTypeOf<number>();

    const t_unwrapErr_1 = Result.unwrapErr(rn);
    expectTypeOf(t_unwrapErr_1).toEqualTypeOf<AppError>();

    const t_unwrapErr_2 = Result.unwrapErr(erra);
    expectTypeOf(t_unwrapErr_2).toEqualTypeOf<AppError>();

    const t_unwrapErr_3 = Result.unwrapErr<number, AppError>(rn);
    expectTypeOf(t_unwrapErr_3).toEqualTypeOf<AppError>();

    const t_split_1 = Result.split(rn);
    expectTypeOf(t_split_1).toEqualTypeOf<
      | readonly [failure: ErrResult<AppError>, value: undefined]
      | readonly [failure: undefined, value: number]
    >();

    const t_split_2 = Result.split(rStatus);
    expectTypeOf(t_split_2).toEqualTypeOf<
      | readonly [failure: ErrResult<Error>, value: undefined]
      | readonly [failure: undefined, value: Status]
    >();

    const t_split_3 = Result.split<number, AppError>(rn);
    expectTypeOf(t_split_3).toEqualTypeOf<
      | readonly [failure: ErrResult<AppError>, value: undefined]
      | readonly [failure: undefined, value: number]
    >();

    const t_unwrapOr_1 = Result.unwrapOr(rn, 0);
    expectTypeOf(t_unwrapOr_1).toEqualTypeOf<number>();

    const t_unwrapOr_2 = Result.unwrapOr(rn, null);
    expectTypeOf(t_unwrapOr_2).toEqualTypeOf<number | null>();

    const t_unwrapOr_3 = Result.unwrapOr(rStatus, "inactive");
    expectTypeOf<typeof t_unwrapOr_3>().toEqualTypeOf<Status>();

    const t_unwrapOr_4 = Result.unwrapOr(rCfg, { mode: "dev", port: 1 });
    expectTypeOf(t_unwrapOr_4).toEqualTypeOf<{ mode: string; port: number }>();

    const t_unwrapOr_5 = Result.unwrapOr(okn, 1);
    expectTypeOf(t_unwrapOr_5).toEqualTypeOf<number>();

    const t_unwrapOr_6 = Result.unwrapOr(erra, 1);
    expectTypeOf<typeof t_unwrapOr_6>().toEqualTypeOf<1>();

    const t_unwrapOr_7 = Result.unwrapOr<number, AppError>(rn, 1);
    expectTypeOf(t_unwrapOr_7).toEqualTypeOf<number>();

    const t_unwrapOr_8 = Result.unwrapOr(rn, undefined);
    expectTypeOf(t_unwrapOr_8).toEqualTypeOf<number | undefined>();

    const t_unwrapOrElse_1 = Result.unwrapOrElse(rn, () => 0);
    expectTypeOf(t_unwrapOrElse_1).toEqualTypeOf<number>();

    const t_unwrapOrElse_2 = Result.unwrapOrElse(rn, (e) => e.message.length);
    expectTypeOf(t_unwrapOrElse_2).toEqualTypeOf<number>();

    const t_unwrapOrElse_3 = Result.unwrapOrElse(rStatus, () => "inactive");
    expectTypeOf(t_unwrapOrElse_3).toEqualTypeOf<string>();

    const t_unwrapOrElse_4 = Result.unwrapOrElse(rCfg, () => ({
      mode: "dev",
      port: 1,
    }));
    expectTypeOf(t_unwrapOrElse_4).toEqualTypeOf<{
      mode: string;
      port: number;
    }>();

    const t_unwrapOrElse_5 = Result.unwrapOrElse(rn, fail);
    expectTypeOf(t_unwrapOrElse_5).toEqualTypeOf<number>();

    const t_unwrapOrElse_6 = Result.unwrapOrElse(erra, () => 1);
    expectTypeOf(t_unwrapOrElse_6).toEqualTypeOf<number>();

    const t_unwrapOrElse_7 = Result.unwrapOrElse(okn, () => 1);
    expectTypeOf(t_unwrapOrElse_7).toEqualTypeOf<number>();

    const t_unwrapOrElse_8 = Result.unwrapOrElse(
      rn,
      (e: AppError) => e.name.length
    );
    expectTypeOf(t_unwrapOrElse_8).toEqualTypeOf<number>();

    const t_unwrapOrElse_9 = Result.unwrapOrElse<number, AppError>(rn, () => 1);
    expectTypeOf(t_unwrapOrElse_9).toEqualTypeOf<number>();

    const t_unwrapOrElse_10 = Result.unwrapOrElse(rn, () => null);
    expectTypeOf(t_unwrapOrElse_10).toEqualTypeOf<number | null>();

    const t_unwrapOrElse_11 = Result.unwrapOrElse(rH, () => ({
      handler: (x: number) => x,
    }));
    expectTypeOf(t_unwrapOrElse_11).toEqualTypeOf<{
      handler: (x: number) => number;
    }>();

    const t_unwrapOrElse_12 = Result.unwrapOrElse(rH, () => ({
      handler: (x) => x,
    }));
    expectTypeOf(t_unwrapOrElse_12).toEqualTypeOf<{
      handler: (x: number) => number;
    }>();

    const t_unwrapOrElse_13 = Result.unwrapOrElse(rStatus, (e) =>
      e.message ? "active" : "inactive"
    );
    expectTypeOf<typeof t_unwrapOrElse_13>().toEqualTypeOf<Status>();

    const t_unwrapOrElse_14 = Result.unwrapOrElse(erra, () => "x");
    expectTypeOf(t_unwrapOrElse_14).toEqualTypeOf<string>();
  });
  test("declared", () => {
    const a_unwrapOr_1: Status = Result.unwrapOr(rStatus, "inactive");
    const a_unwrapOr_2: Config = Result.unwrapOr(rCfg, {
      mode: "dev",
      port: 1,
    });
    const a_unwrapOr_3: H = Result.unwrapOr(rH, { handler: (x) => x });
    const a_unwrapOrElse_1: Status = Result.unwrapOrElse(
      rStatus,
      () => "inactive"
    );
    const a_unwrapOrElse_2: Config = Result.unwrapOrElse(rCfg, () => ({
      mode: "dev",
      port: 3000,
    }));
    const a_unwrapOrElse_3: Config = Result.unwrapOrElse(rCfg, (e) => ({
      mode: "dev",
      port: e.message.length,
    }));
    const a_unwrapOrElse_4: Shape = Result.unwrapOrElse(rShape, () => ({
      kind: "circle",
      r: 0,
    }));
    const a_unwrapOrElse_5: H = Result.unwrapOrElse(rH, () => ({
      handler: (x) => x,
    }));
    const a_unwrapOrElse_6: Status = Result.unwrapOrElse(rStatus, (e) =>
      e.message ? "active" : "inactive"
    );
    const a_unwrapOrElse_7: Loose = Result.unwrapOrElse(rStatus, () => "a");
    const a_unwrapOrElse_8: number = Result.unwrapOrElse(rn, () => 1);
    const a_unwrapOrElse_9: Status = Result.unwrapOrElse(erra, () => "active");
    const a_unwrapOrElse_10: Config = Result.unwrapOrElse(erra, () => ({
      mode: "dev",
      port: 1,
    }));
    function f_unwrapOrElse_1(): Status {
      return Result.unwrapOrElse(rStatus, () => "inactive");
    }
    function f_unwrapOrElse_2(): Config {
      return Result.unwrapOrElse(rCfg, () => ({ mode: "dev", port: 3000 }));
    }
    function f_unwrapOrElse_3(): void {
      useStatus(Result.unwrapOrElse(rStatus, () => "inactive"));
      useConfig(Result.unwrapOrElse(rCfg, () => ({ mode: "dev", port: 1 })));
    }
    void [
      a_unwrapOr_1,
      a_unwrapOr_2,
      a_unwrapOr_3,
      a_unwrapOrElse_1,
      a_unwrapOrElse_2,
      a_unwrapOrElse_3,
      a_unwrapOrElse_4,
      a_unwrapOrElse_5,
      a_unwrapOrElse_6,
      a_unwrapOrElse_7,
      a_unwrapOrElse_8,
      a_unwrapOrElse_9,
      a_unwrapOrElse_10,
      f_unwrapOrElse_1,
      f_unwrapOrElse_2,
      f_unwrapOrElse_3,
    ];
  });
  test("generic", () => {
    function g_unwrapOrElse_1<T>(r: Result<T, AppError>, fallback: () => T) {
      return Result.unwrapOrElse(r, fallback);
    }
    expectTypeOf(g_unwrapOrElse_1).toEqualTypeOf<
      <T>(r: Result<T, AppError>, fallback: () => T) => T
    >();

    function g_unwrap_1<T, E extends Error>(r: Result<T, E>) {
      return Result.unwrap(r);
    }
    expectTypeOf(g_unwrap_1).toEqualTypeOf<
      <T, E extends Error>(r: Result<T, E>) => T
    >();

    function g_flatten_1<T>(r: Result<Result<T, AppError>, DbError>) {
      return Result.flatten(r);
    }
    expectTypeOf(g_flatten_1).toEqualTypeOf<
      <T>(
        r: Result<Result<T, AppError>, DbError>
      ) => Result<T, AppError | DbError>
    >();
  });
});

describe("match", () => {
  test("inferred", () => {
    const t_match_1 = Result.match(rn, {
      ok: (v) => v + 1,
      err: (e) => e.name,
    });
    expectTypeOf(t_match_1).toEqualTypeOf<number | "AppError">();

    const t_match_2 = Result.match(rn, { ok: (v) => v, err: () => null });
    expectTypeOf(t_match_2).toEqualTypeOf<number | null>();

    const t_match_3 = Result.match(rn, { ok: () => "a", err: () => "b" });
    expectTypeOf(t_match_3).toEqualTypeOf<string>();

    const t_match_4 = Result.match(rn, { ok: String, err: (e) => e.message });
    expectTypeOf(t_match_4).toEqualTypeOf<string>();

    const t_match_5 = Result.match(okn, { ok: (v) => v, err: (e) => e });
    expectTypeOf(t_match_5).toEqualTypeOf<number>();

    const t_match_6 = Result.match(erra, { ok: () => 1, err: () => 2 });
    expectTypeOf(t_match_6).toEqualTypeOf<number>();

    const t_match_7 = Result.match<number, AppError, string>(rn, {
      ok: String,
      err: (e) => e.message,
    });
    expectTypeOf(t_match_7).toEqualTypeOf<string>();

    const t_match_8 = Result.match<number, AppError, string, null>(rn, {
      ok: String,
      err: () => null,
    });
    expectTypeOf(t_match_8).toEqualTypeOf<string | null>();

    const t_match_9 = Result.match(rn, { ok: fail, err: fail });
    expectTypeOf(t_match_9).toEqualTypeOf<never>();

    const t_match_10 = Result.match(rn, {
      ok: (v) => ok(v),
      err: (e) => err(e),
    });
    expectTypeOf(t_match_10).toEqualTypeOf<
      OkResult<number> | ErrResult<AppError>
    >();

    const t_match_11 = Result.match(rn, {
      ok: (v): Status => (v > 0 ? "active" : "inactive"),
      err: (): Status => "inactive",
    });
    expectTypeOf<typeof t_match_11>().toEqualTypeOf<Status>();

    const t_match_12 = Result.match(rn, { ok: () => {}, err: () => {} });
    expectTypeOf(t_match_12).toEqualTypeOf<void>();

    const t_match_13 = Result.match(rn, {
      ok: (v: number) => v,
      err: (e: AppError) => e,
    });
    expectTypeOf(t_match_13).toEqualTypeOf<number | AppError>();

    const t_match_14 = Result.match(rn, {
      ok: (v) => ({ kind: "circle", r: v }),
      err: () => ({ kind: "square", side: 0 }),
    });
    expectTypeOf(t_match_14).toEqualTypeOf<
      { kind: string; side: number } | { kind: string; r: number }
    >();

    const t_match_15 = Result.match(rn, {
      ok: (v) => ({ handler: (x: number) => x + v }),
      err: () => null,
    });
    expectTypeOf(t_match_15).toEqualTypeOf<{
      handler: (x: number) => number;
    } | null>();

    const t_match_16 = Result.match(erra, { ok: (v) => v, err: (e) => e.name });
    expectTypeOf<typeof t_match_16>().toEqualTypeOf<"AppError">();

    const t_match_17 = Result.match(rn, {
      ok: () => "a" as const,
      err: () => "b" as const,
    });
    expectTypeOf<typeof t_match_17>().toEqualTypeOf<"a" | "b">();
  });
  test("declared", () => {
    const a_match_1: Status = Result.match(rn, {
      ok: () => "active",
      err: () => "inactive",
    });
    const a_match_2: Config = Result.match(rCfg, {
      ok: (c) => c,
      err: () => ({ mode: "dev", port: 1 }),
    });
    const a_match_3: Shape = Result.match(rn, {
      ok: (v) => ({ kind: "circle", r: v }),
      err: () => ({ kind: "square", side: 0 }),
    });
    const a_match_4: H = Result.match(rH, {
      ok: (h) => h,
      err: () => ({ handler: (x) => x }),
    });
    const a_match_5: string = Result.match(rn, {
      ok: String,
      err: (e) => e.message,
    });
    const a_match_6: Status = Result.match(erra, {
      ok: () => "active",
      err: () => "inactive",
    });
    function f_match_1(): Status {
      return Result.match(rn, { ok: () => "active", err: () => "inactive" });
    }
    void [
      a_match_1,
      a_match_2,
      a_match_3,
      a_match_4,
      a_match_5,
      a_match_6,
      f_match_1,
    ];
  });
  test("generic", () => {
    function g_match_1<T>(r: Result<T, AppError>) {
      return Result.match(r, { ok: (v) => [v], err: () => [] });
    }
    expectTypeOf(g_match_1).toEqualTypeOf<
      <T>(r: Result<T, AppError>) => never[] | T[]
    >();

    function g_match_2<T, A>(r: Result<T, AppError>, f: (v: T) => A) {
      return Result.match(r, { ok: f, err: () => null });
    }
    expectTypeOf(g_match_2).toEqualTypeOf<
      <T, A>(r: Result<T, AppError>, f: (v: T) => A) => A | null
    >();
  });
});

describe("tryCatch, tryCatchAsync and fromPromise", () => {
  test("inferred", () => {
    const t_tryCatch_1 = Result.tryCatch(() => parseNum("1"));
    expectTypeOf(t_tryCatch_1).toEqualTypeOf<Result<number, Error>>();

    const t_tryCatch_2 = Result.tryCatch(() => "a");
    expectTypeOf(t_tryCatch_2).toEqualTypeOf<Result<string, Error>>();

    const t_tryCatch_3 = Result.tryCatch(
      () => parseNum("1"),
      () => new AppError()
    );
    expectTypeOf(t_tryCatch_3).toEqualTypeOf<Result<number, AppError>>();

    const t_tryCatch_4 = Result.tryCatch(() => readPort());
    expectTypeOf(t_tryCatch_4).toEqualTypeOf<{
      readonly "Result.tryCatch does not await. Use Result.tryCatchAsync for functions that return a Promise": never;
    }>();

    const t_tryCatch_5 = Result.tryCatch(async () => 1);
    expectTypeOf(t_tryCatch_5).toEqualTypeOf<{
      readonly "Result.tryCatch does not await. Use Result.tryCatchAsync for functions that return a Promise": never;
    }>();

    const t_tryCatch_6 = Result.tryCatch(() => fail(1));
    expectTypeOf(t_tryCatch_6).toEqualTypeOf<Result<never, Error>>();

    const t_tryCatch_7 = Result.tryCatch(() => ({
      mode: "dev" as const,
      port: 1,
    }));
    expectTypeOf(t_tryCatch_7).toEqualTypeOf<
      Result<{ mode: "dev"; port: number }, Error>
    >();

    const t_tryCatch_8 = Result.tryCatch(
      () => readPort(),
      (e) => new AppError(String(e))
    );
    expectTypeOf(t_tryCatch_8).toEqualTypeOf<{
      readonly "Result.tryCatch does not await. Use Result.tryCatchAsync for functions that return a Promise": never;
    }>();

    const t_tryCatch_9 = Result.tryCatch<number>(() => 1);
    expectTypeOf(t_tryCatch_9).toEqualTypeOf<Result<number, Error>>();

    const t_tryCatch_10 = Result.tryCatch<number, AppError>(
      () => 1,
      () => new AppError()
    );
    expectTypeOf(t_tryCatch_10).toEqualTypeOf<Result<number, AppError>>();

    const t_tryCatch_11 = Result.tryCatch((): Status => "active");
    expectTypeOf(t_tryCatch_11).toEqualTypeOf<Result<Status, Error>>();

    const t_tryCatch_12 = Result.tryCatch(() => unknownValue);
    expectTypeOf(t_tryCatch_12).toEqualTypeOf<Result<unknown, Error>>();

    const t_tryCatch_13 = Result.tryCatch(() => ok(1));
    expectTypeOf(t_tryCatch_13).toEqualTypeOf<
      Result<OkResult<number>, Error>
    >();

    const t_tryCatch_14 = Result.tryCatch(() => ({ mode: "dev", port: 1 }));
    expectTypeOf(t_tryCatch_14).toEqualTypeOf<
      Result<{ mode: string; port: number }, Error>
    >();

    const t_tryCatch_16 = Result.tryCatch(() => ({
      handler: (x: number) => x,
    }));
    expectTypeOf(t_tryCatch_16).toEqualTypeOf<
      Result<{ handler: (x: number) => number }, Error>
    >();

    const t_tryCatch_17 = Result.tryCatch<Promise<number>>(() => readPort());
    expectTypeOf(t_tryCatch_17).toEqualTypeOf<{
      readonly "Result.tryCatch does not await. Use Result.tryCatchAsync for functions that return a Promise": never;
    }>();

    const t_tryCatchAsync_1 = Result.tryCatchAsync(() => readPort());
    expectTypeOf(t_tryCatchAsync_1).toEqualTypeOf<
      Promise<Result<number, Error>>
    >();

    const t_tryCatchAsync_2 = Result.tryCatchAsync(async () => "a");
    expectTypeOf(t_tryCatchAsync_2).toEqualTypeOf<
      Promise<Result<string, Error>>
    >();

    const t_tryCatchAsync_3 = Result.tryCatchAsync(async () => ({
      mode: "dev" as const,
      port: 1,
    }));
    expectTypeOf(t_tryCatchAsync_3).toEqualTypeOf<
      Promise<Result<{ mode: "dev"; port: number }, Error>>
    >();

    const t_tryCatchAsync_4 = Result.tryCatchAsync(
      () => readPort(),
      (e) => new AppError(String(e))
    );
    expectTypeOf(t_tryCatchAsync_4).toEqualTypeOf<
      Promise<Result<number, AppError>>
    >();

    const t_tryCatchAsync_5 = Result.tryCatchAsync(() => plike);
    expectTypeOf(t_tryCatchAsync_5).toEqualTypeOf<
      Promise<Result<number, Error>>
    >();

    const t_tryCatchAsync_6 = Result.tryCatchAsync<number>(() => readPort());
    expectTypeOf(t_tryCatchAsync_6).toEqualTypeOf<
      Promise<Result<number, Error>>
    >();

    const t_tryCatchAsync_7 = Result.tryCatchAsync<number, AppError>(
      () => readPort(),
      () => new AppError()
    );
    expectTypeOf(t_tryCatchAsync_7).toEqualTypeOf<
      Promise<Result<number, AppError>>
    >();

    const t_tryCatchAsync_8 = Result.tryCatchAsync(async () => fail(1));
    expectTypeOf(t_tryCatchAsync_8).toEqualTypeOf<
      Promise<Result<never, Error>>
    >();

    const t_tryCatchAsync_9 = Result.tryCatchAsync(async () => {
      const port = await readPort();
      return { mode: "dev" as const, port };
    });
    expectTypeOf(t_tryCatchAsync_9).toEqualTypeOf<
      Promise<Result<{ mode: "dev"; port: number }, Error>>
    >();

    const t_tryCatchAsync_10 = Result.tryCatchAsync(() => Promise.resolve("x"));
    expectTypeOf(t_tryCatchAsync_10).toEqualTypeOf<
      Promise<Result<string, Error>>
    >();

    const t_tryCatchAsync_11 = Result.tryCatchAsync(() => pStatus);
    expectTypeOf(t_tryCatchAsync_11).toEqualTypeOf<
      Promise<Result<Status, Error>>
    >();

    const t_tryCatchAsync_12 = Result.tryCatchAsync(async () => unknownValue);
    expectTypeOf(t_tryCatchAsync_12).toEqualTypeOf<
      Promise<Result<unknown, Error>>
    >();

    const t_tryCatchAsync_13 = Result.tryCatchAsync(() =>
      Promise.reject(new Error())
    );
    expectTypeOf(t_tryCatchAsync_13).toEqualTypeOf<
      Promise<Result<never, Error>>
    >();

    const t_tryCatchAsync_14 = Result.tryCatchAsync(async () => ({
      mode: "dev",
      port: 1,
    }));
    expectTypeOf(t_tryCatchAsync_14).toEqualTypeOf<
      Promise<Result<{ mode: string; port: number }, Error>>
    >();

    const t_tryCatchAsync_15 = Result.tryCatchAsync(readPort);
    expectTypeOf(t_tryCatchAsync_15).toEqualTypeOf<
      Promise<Result<number, Error>>
    >();

    const t_tryCatchAsync_16 = Result.tryCatchAsync(async () => ok(1));
    expectTypeOf(t_tryCatchAsync_16).toEqualTypeOf<
      Promise<Result<OkResult<number>, Error>>
    >();

    const t_fromPromise_1 = Result.fromPromise(pn);
    expectTypeOf(t_fromPromise_1).toEqualTypeOf<
      Promise<Result<number, Error>>
    >();

    const t_fromPromise_2 = Result.fromPromise(pStatus);
    expectTypeOf(t_fromPromise_2).toEqualTypeOf<
      Promise<Result<Status, Error>>
    >();

    const t_fromPromise_3 = Result.fromPromise(Promise.resolve("active"));
    expectTypeOf(t_fromPromise_3).toEqualTypeOf<
      Promise<Result<string, Error>>
    >();

    const t_fromPromise_4 = Result.fromPromise(
      pn,
      (e) => new AppError(String(e))
    );
    expectTypeOf(t_fromPromise_4).toEqualTypeOf<
      Promise<Result<number, AppError>>
    >();

    const t_fromPromise_5 = Result.fromPromise(plike);
    expectTypeOf(t_fromPromise_5).toEqualTypeOf<
      Promise<Result<number, Error>>
    >();

    const t_fromPromise_6 = Result.fromPromise<number>(pn);
    expectTypeOf(t_fromPromise_6).toEqualTypeOf<
      Promise<Result<number, Error>>
    >();

    const t_fromPromise_7 = Result.fromPromise<number, AppError>(
      pn,
      () => new AppError()
    );
    expectTypeOf(t_fromPromise_7).toEqualTypeOf<
      Promise<Result<number, AppError>>
    >();

    const t_fromPromise_8 = Result.fromPromise(Promise.reject(new Error()));
    expectTypeOf(t_fromPromise_8).toEqualTypeOf<
      Promise<Result<never, Error>>
    >();

    const t_fromPromise_9 = Result.fromPromise(readPort());
    expectTypeOf(t_fromPromise_9).toEqualTypeOf<
      Promise<Result<number, Error>>
    >();

    const t_fromPromise_10 = Result.fromPromise(
      Promise.resolve({ mode: "dev" as const, port: 1 })
    );
    expectTypeOf(t_fromPromise_10).toEqualTypeOf<
      Promise<Result<{ mode: "dev"; port: number }, Error>>
    >();

    const t_fromPromise_11 = Result.fromPromise(prn);
    expectTypeOf(t_fromPromise_11).toEqualTypeOf<
      Promise<Result<Result<number, AppError>, Error>>
    >();

    const t_fromPromise_12 = Result.fromPromise(
      Promise.resolve({ mode: "dev", port: 1 })
    );
    expectTypeOf(t_fromPromise_12).toEqualTypeOf<
      Promise<Result<{ mode: string; port: number }, Error>>
    >();

    const t_fromPromise_13 = Result.fromPromise(Promise.all([pn, pStatus]));
    expectTypeOf(t_fromPromise_13).toEqualTypeOf<
      Promise<Result<[number, Status], Error>>
    >();
  });
  test("declared", () => {
    const a_tryCatch_1: Result<Status, Error> = Result.tryCatch(
      (): Status => "inactive"
    );
    const a_tryCatch_3: Result<string, AppError> = Result.tryCatch(
      () => "inactive",
      () => new AppError()
    );
    const a_tryCatch_5: Result<number, Error> = Result.tryCatch(() =>
      parseNum("1")
    );
    const a_tryCatchAsync_2: Promise<Result<Config, Error>> =
      Result.tryCatchAsync(async () => ({
        mode: "dev",
        port: 1,
      }));
    const a_tryCatchAsync_4: Promise<Result<H, Error>> = Result.tryCatchAsync(
      async () => ({ handler: (x) => x })
    );
    const a_tryCatchAsync_5: Promise<Result<Status, Error>> =
      Result.tryCatchAsync(() => Promise.resolve("active"));
    const a_tryCatchAsync_6: Promise<Result<Shape, Error>> =
      Result.tryCatchAsync(async () => ({
        kind: "circle",
        r: 1,
      }));
    async function f_tryCatchAsync_1(): Promise<Result<Config, Error>> {
      return Result.tryCatchAsync(async () => {
        const port = await readPort();
        return { mode: "dev", port };
      });
    }
    async function f_tryCatchAsync_3(): Promise<Result<Config, Error>> {
      const r = await Result.tryCatchAsync(async () => ({
        mode: "dev" as const,
        port: 1,
      }));
      return r;
    }
    const a_fromPromise_1: Promise<Result<Status, Error>> = Result.fromPromise(
      Promise.resolve("active")
    );
    const a_fromPromise_2: Promise<Result<Config, Error>> = Result.fromPromise(
      Promise.resolve({ mode: "dev", port: 1 })
    );
    const a_fromPromise_3: Promise<Result<Status, Error>> =
      Result.fromPromise(pStatus);
    const a_fromPromise_4: Promise<Result<Status, AppError>> =
      Result.fromPromise(Promise.resolve("active"), () => new AppError());
    async function f_fromPromise_1(): Promise<Result<Status, Error>> {
      return Result.fromPromise(Promise.resolve("active"));
    }
    void [
      a_tryCatch_1,
      a_tryCatch_3,
      a_tryCatch_5,
      a_tryCatchAsync_2,
      a_tryCatchAsync_4,
      a_tryCatchAsync_5,
      a_tryCatchAsync_6,
      f_tryCatchAsync_1,
      f_tryCatchAsync_3,
      a_fromPromise_1,
      a_fromPromise_2,
      a_fromPromise_3,
      a_fromPromise_4,
      f_fromPromise_1,
    ];
  });
  test("generic", () => {
    function g_fromPromise_1<T>(p: Promise<T>) {
      return Result.fromPromise(p);
    }
    expectTypeOf(g_fromPromise_1).toEqualTypeOf<
      <T>(p: Promise<T>) => Promise<Result<T, Error>>
    >();

    function g_fromPromise_2<T>(p: PromiseLike<T>) {
      return Result.fromPromise(p, () => new AppError());
    }
    expectTypeOf(g_fromPromise_2).toEqualTypeOf<
      <T>(p: PromiseLike<T>) => Promise<Result<T, AppError>>
    >();

    function g_tryCatchAsync_1<T>(f: () => Promise<T>) {
      return Result.tryCatchAsync(f);
    }
    expectTypeOf(g_tryCatchAsync_1).toEqualTypeOf<
      <T>(f: () => Promise<T>) => Promise<Result<T, Error>>
    >();

    function g_tryCatchAsync_2<T>(f: () => Promise<T>) {
      return Result.tryCatchAsync(f, (e) => new AppError(String(e)));
    }
    expectTypeOf(g_tryCatchAsync_2).toEqualTypeOf<
      <T>(f: () => Promise<T>) => Promise<Result<T, AppError>>
    >();

    function g_tryCatch_1<T>(f: () => T) {
      return Result.tryCatch(f);
    }
    expectTypeOf(g_tryCatch_1).toEqualTypeOf<
      <T>(f: () => T) => Result<T, Error>
    >();

    function g_tryCatch_2<T>(f: () => T) {
      return Result.tryCatch(f, (e) => new AppError(String(e)));
    }
    expectTypeOf(g_tryCatch_2).toEqualTypeOf<
      <T>(f: () => T) => Result<T, AppError>
    >();
  });
});

describe("constructors, guards, combinators and conversions", () => {
  test("inferred", () => {
    const t_ok_1 = ok(1);
    expectTypeOf(t_ok_1).toEqualTypeOf<OkResult<number>>();

    const t_ok_2 = ok();
    expectTypeOf(t_ok_2).toEqualTypeOf<OkResult<undefined>>();

    const t_ok_3 = ok("a" as const);
    expectTypeOf(t_ok_3).toEqualTypeOf<OkResult<"a">>();

    const t_err_1 = err(new AppError());
    expectTypeOf(t_err_1).toEqualTypeOf<ErrResult<AppError>>();

    const t_isResult_1 = isResult(unknownValue);
    expectTypeOf<typeof t_isResult_1>().toEqualTypeOf<boolean>();

    const t_isOk_1 = isOk(rn);
    expectTypeOf<typeof t_isOk_1>().toEqualTypeOf<boolean>();

    const t_isErr_1 = isErr(rn);
    expectTypeOf<typeof t_isErr_1>().toEqualTypeOf<boolean>();

    const t_fromNullable_1 = Result.fromNullable(rOpt, () => new AppError());
    expectTypeOf(t_fromNullable_1).toEqualTypeOf<
      Result<
        NonNullable<ErrResult<AppError> | OkResult<number | undefined>>,
        AppError
      >
    >();

    const t_fromNullable_2 = Result.fromNullable(
      1 as number | null,
      () => new AppError()
    );
    expectTypeOf(t_fromNullable_2).toEqualTypeOf<Result<number, AppError>>();

    const t_fromNullable_3 = Result.fromNullable<number, AppError>(
      1,
      () => new AppError()
    );
    expectTypeOf(t_fromNullable_3).toEqualTypeOf<Result<number, AppError>>();

    const t_fromPredicate_1 = Result.fromPredicate(
      1 as number | string,
      (v): v is number => typeof v === "number",
      () => new AppError()
    );
    expectTypeOf(t_fromPredicate_1).toEqualTypeOf<Result<number, AppError>>();

    const t_fromPredicate_2 = Result.fromPredicate(
      1,
      (v) => v > 0,
      (v) => new AppError(String(v))
    );
    expectTypeOf(t_fromPredicate_2).toEqualTypeOf<Result<1, AppError>>();

    const t_fromPredicate_3 = Result.fromPredicate(
      1,
      isPositive,
      () => new AppError()
    );
    expectTypeOf(t_fromPredicate_3).toEqualTypeOf<Result<1, AppError>>();

    const t_all_1 = Result.all(rn, rs);
    expectTypeOf(t_all_1).toEqualTypeOf<
      Result<readonly [number, string], AppError | DbError>
    >();

    const t_all_2 = Result.all([rn, rs]);
    expectTypeOf(t_all_2).toEqualTypeOf<
      Result<readonly [number, string], AppError | DbError>
    >();

    const t_all_3 = Result.all(results);
    expectTypeOf(t_all_3).toEqualTypeOf<Result<number[], AppError>>();

    const t_all_4 = Result.all([rn, rs] as const);
    expectTypeOf(t_all_4).toEqualTypeOf<
      Result<readonly [number, string], AppError | DbError>
    >();

    const t_all_5 = Result.all();
    expectTypeOf(t_all_5).toEqualTypeOf<Result<readonly [], never>>();

    const t_allAsync_1 = Result.allAsync(prn, prs);
    expectTypeOf(t_allAsync_1).toEqualTypeOf<
      Promise<Result<readonly [number, string], AppError | Error | DbError>>
    >();

    const t_allAsync_2 = Result.allAsync([prn, prs]);
    expectTypeOf(t_allAsync_2).toEqualTypeOf<
      Promise<Result<readonly [number, string], AppError | Error | DbError>>
    >();

    const t_allAsync_3 = Result.allAsync([fetchUser(1), fetchUser(2)]);
    expectTypeOf(t_allAsync_3).toEqualTypeOf<
      Promise<Result<readonly [User, User], AppError | Error>>
    >();

    const t_collect_1 = Result.collect(rn, rs);
    expectTypeOf(t_collect_1).toEqualTypeOf<
      Result<readonly [number, string], AggregateErrorOf<AppError | DbError>>
    >();

    const t_collect_2 = Result.collect(results);
    expectTypeOf(t_collect_2).toEqualTypeOf<
      Result<number[], AggregateErrorOf<AppError>>
    >();

    const t_collectAsync_1 = Result.collectAsync(prn, prs);
    expectTypeOf(t_collectAsync_1).toEqualTypeOf<
      Promise<
        Result<
          readonly [number, string],
          AggregateErrorOf<AppError | Error | DbError>
        >
      >
    >();

    const t_toMaybe_1 = Result.toMaybe(rn);
    expectTypeOf(t_toMaybe_1).toEqualTypeOf<Maybe<number>>();

    const t_fromMaybe_1 = Result.fromMaybe(mn, () => new AppError());
    expectTypeOf(t_fromMaybe_1).toEqualTypeOf<Result<number, AppError>>();

    const t_transpose_1 = Result.transpose(rm);
    expectTypeOf(t_transpose_1).toEqualTypeOf<
      Maybe<Result<number, AppError>>
    >();

    const t_transpose_2 = Result.transpose<number, AppError>(rm);
    expectTypeOf(t_transpose_2).toEqualTypeOf<
      Maybe<Result<number, AppError>>
    >();

    const t_normalizeError_1 = normalizeError(unknownValue);
    expectTypeOf(t_normalizeError_1).toEqualTypeOf<Error>();
  });
  test("declared", () => {
    const a_all_2: Result<readonly [number, string], AppError | DbError> =
      Result.all(rn, rs);
    const a_collect_1: Result<
      readonly number[],
      AggregateErrorOf<AppError>
    > = Result.collect(results);
    const a_fromNullable_1: Result<Status, AppError> = Result.fromNullable(
      "active" as Status | null,
      () => new AppError()
    );
    const a_fromPredicate_1: Result<number, AppError> = Result.fromPredicate(
      1,
      (v) => v > 0,
      () => new AppError()
    );
    void [a_all_2, a_collect_1, a_fromNullable_1, a_fromPredicate_1];
  });
});

describe("Maybe", () => {
  test("inferred", () => {
    const t_mmap_1 = Maybe.map(mn, (v) => v + 1);
    expectTypeOf(t_mmap_1).toEqualTypeOf<Maybe<number>>();

    const t_mmap_2 = Maybe.map(somen, (v) => String(v));
    expectTypeOf(t_mmap_2).toEqualTypeOf<Some<string>>();

    const t_mmap_3 = Maybe.map(nn, (v) => v);
    expectTypeOf(t_mmap_3).toEqualTypeOf<None>();

    const t_mmap_4 = Maybe.map(mn, () => "a");
    expectTypeOf(t_mmap_4).toEqualTypeOf<Maybe<string>>();

    const t_mmap_5 = Maybe.map(mn, async (v) => v);
    expectTypeOf(t_mmap_5).toEqualTypeOf<{
      readonly "Maybe.map does not await. Await the value first": never;
    }>();

    const t_mmap_6 = Maybe.map(mn, fail);
    expectTypeOf(t_mmap_6).toEqualTypeOf<Maybe<never>>();

    const t_mmap_7 = Maybe.map(mn, (v: number) => v);
    expectTypeOf(t_mmap_7).toEqualTypeOf<Maybe<number>>();

    const t_mmap_8 = Maybe.map(mn, String);
    expectTypeOf(t_mmap_8).toEqualTypeOf<Maybe<string>>();

    const t_mmap_9 = Maybe.map(some(1), (v) => v);
    expectTypeOf(t_mmap_9).toEqualTypeOf<Some<number>>();

    const t_mmap_10 = Maybe.map(none(), (v) => v);
    expectTypeOf(t_mmap_10).toEqualTypeOf<None>();

    const t_mmap_11 = Maybe.map(mn, (v) => ({ handler: (x: number) => x + v }));
    expectTypeOf(t_mmap_11).toEqualTypeOf<
      Maybe<{ handler: (x: number) => number }>
    >();

    const t_mmap_12 = Maybe.map(mn, () => ({ mode: "dev", port: 1 }));
    expectTypeOf(t_mmap_12).toEqualTypeOf<
      Maybe<{ mode: string; port: number }>
    >();

    const t_mmap_13 = keepMaybe(Maybe.map(mn, () => "a"));
    expectTypeOf(t_mmap_13).toEqualTypeOf<Maybe<string>>();

    const t_mmap_14 = Maybe.map<number, string>(mn, String);
    expectTypeOf(t_mmap_14).toEqualTypeOf<Maybe<string>>();

    const t_mflatMap_1 = Maybe.flatMap(mn, (v) => some(v + 1));
    expectTypeOf(t_mflatMap_1).toEqualTypeOf<Maybe<number>>();

    const t_mflatMap_2 = Maybe.flatMap(mn, () => none());
    expectTypeOf(t_mflatMap_2).toEqualTypeOf<Maybe<never>>();

    const t_mflatMap_3 = Maybe.flatMap(mn, (v) => (v > 0 ? some(v) : none()));
    expectTypeOf(t_mflatMap_3).toEqualTypeOf<Maybe<number>>();

    const t_mflatMap_4 = Maybe.flatMap(mn, () => some("active"));
    expectTypeOf(t_mflatMap_4).toEqualTypeOf<Maybe<string>>();

    const t_mflatMap_5 = Maybe.flatMap(mn, findUser);
    expectTypeOf(t_mflatMap_5).toEqualTypeOf<Maybe<User>>();

    const t_mflatMap_6 = Maybe.flatMap(mn, fail);
    expectTypeOf(t_mflatMap_6).toEqualTypeOf<Maybe<never>>();

    const t_mflatMap_7 = Maybe.flatMap(mn, (v) => ({ some: true, value: v }));
    expectTypeOf(t_mflatMap_7).toEqualTypeOf<Maybe<number>>();

    const t_mflatMap_8 = Maybe.flatMap(somen, (v) => some(v));
    expectTypeOf(t_mflatMap_8).toEqualTypeOf<Maybe<number>>();

    const t_mflatMap_9 = Maybe.flatMap(nn, () => some(1));
    expectTypeOf(t_mflatMap_9).toEqualTypeOf<Maybe<number>>();

    const t_mflatMap_10 = Maybe.flatMap<number, string>(mn, (v) =>
      some(String(v))
    );
    expectTypeOf(t_mflatMap_10).toEqualTypeOf<Maybe<string>>();

    const t_mflatMap_11 = Maybe.flatMap(mn, (v: number) => some(v));
    expectTypeOf(t_mflatMap_11).toEqualTypeOf<Maybe<number>>();

    const t_mflatMap_12 = Maybe.flatMap(mn, wrapSome);
    expectTypeOf(t_mflatMap_12).toEqualTypeOf<Maybe<number>>();

    const t_mflatMap_13 = Maybe.flatMap(mn, () =>
      some({ mode: "dev", port: 1 })
    );
    expectTypeOf(t_mflatMap_13).toEqualTypeOf<
      Maybe<{ mode: string; port: number }>
    >();

    const t_mflatten_1 = Maybe.flatten(mm);
    expectTypeOf(t_mflatten_1).toEqualTypeOf<Maybe<number>>();

    const t_mfilter_1 = Maybe.filter(mn, (v) => v > 0);
    expectTypeOf(t_mfilter_1).toEqualTypeOf<Maybe<number>>();

    const t_mfilter_2 = Maybe.filter(
      mn as Maybe<number | string>,
      (v): v is number => typeof v === "number"
    );
    expectTypeOf(t_mfilter_2).toEqualTypeOf<Maybe<number>>();

    const t_mfilter_3 = Maybe.filter(mn, isPositive);
    expectTypeOf(t_mfilter_3).toEqualTypeOf<Maybe<number>>();

    const t_minspect_1 = Maybe.inspect(mn, (v) => log(v));
    expectTypeOf(t_minspect_1).toEqualTypeOf<Maybe<number>>();

    const t_minspect_2 = Maybe.inspect(somen, () => {});
    expectTypeOf(t_minspect_2).toEqualTypeOf<Some<number>>();

    const t_minspect_3 = Maybe.inspect(mn, log);
    expectTypeOf(t_minspect_3).toEqualTypeOf<Maybe<number>>();

    const t_minspect_4 = Maybe.inspect<number>(mn, log);
    expectTypeOf(t_minspect_4).toEqualTypeOf<Maybe<number>>();

    const t_mmatch_1 = Maybe.match(mn, {
      some: (v) => v + 1,
      none: () => "none",
    });
    expectTypeOf(t_mmatch_1).toEqualTypeOf<string | number>();

    const t_mmatch_2 = Maybe.match(mn, { some: () => "a", none: () => "b" });
    expectTypeOf(t_mmatch_2).toEqualTypeOf<string>();

    const t_mmatch_3 = Maybe.match<number, string>(mn, {
      some: String,
      none: () => "none",
    });
    expectTypeOf(t_mmatch_3).toEqualTypeOf<string>();

    const t_mmatch_4 = Maybe.match<number, string, null>(mn, {
      some: String,
      none: () => null,
    });
    expectTypeOf(t_mmatch_4).toEqualTypeOf<string | null>();

    const t_mmatch_5 = Maybe.match(nn, { some: (v) => v, none: () => 0 });
    expectTypeOf(t_mmatch_5).toEqualTypeOf<number>();

    const t_munwrap_1 = Maybe.unwrap(mn);
    expectTypeOf(t_munwrap_1).toEqualTypeOf<number>();

    const t_munwrap_2 = Maybe.unwrap(somen);
    expectTypeOf(t_munwrap_2).toEqualTypeOf<number>();

    const t_munwrap_3 = Maybe.unwrap<number>(mn);
    expectTypeOf(t_munwrap_3).toEqualTypeOf<number>();

    const t_munwrapOr_1 = Maybe.unwrapOr(mn, 0);
    expectTypeOf(t_munwrapOr_1).toEqualTypeOf<number>();

    const t_munwrapOr_2 = Maybe.unwrapOr(ms, "inactive");
    expectTypeOf<typeof t_munwrapOr_2>().toEqualTypeOf<Status>();

    const t_munwrapOr_3 = Maybe.unwrapOr(mn, null);
    expectTypeOf(t_munwrapOr_3).toEqualTypeOf<number | null>();

    const t_munwrapOr_4 = Maybe.unwrapOr<number>(mn, 0);
    expectTypeOf(t_munwrapOr_4).toEqualTypeOf<number>();

    const t_munwrapOrElse_1 = Maybe.unwrapOrElse(mn, () => 0);
    expectTypeOf(t_munwrapOrElse_1).toEqualTypeOf<number>();

    const t_munwrapOrElse_2 = Maybe.unwrapOrElse(ms, () => "inactive");
    expectTypeOf(t_munwrapOrElse_2).toEqualTypeOf<string>();

    const t_munwrapOrElse_3 = Maybe.unwrapOrElse(mCfg, () => ({
      mode: "dev",
      port: 1,
    }));
    expectTypeOf(t_munwrapOrElse_3).toEqualTypeOf<{
      mode: string;
      port: number;
    }>();

    const t_munwrapOrElse_4 = Maybe.unwrapOrElse(mH, () => ({
      handler: (x) => x,
    }));
    expectTypeOf(t_munwrapOrElse_4).toEqualTypeOf<{
      handler: (x: number) => number;
    }>();

    const t_munwrapOrElse_5 = Maybe.unwrapOrElse<number>(mn, () => 0);
    expectTypeOf(t_munwrapOrElse_5).toEqualTypeOf<number>();

    const t_mfromNullable_1 = Maybe.fromNullable(1 as number | undefined);
    expectTypeOf(t_mfromNullable_1).toEqualTypeOf<Maybe<number>>();

    const t_mfromPredicate_1 = Maybe.fromPredicate(1, (v) => v > 0);
    expectTypeOf(t_mfromPredicate_1).toEqualTypeOf<Maybe<1>>();

    const t_mall_1 = Maybe.all(mn, ms);
    expectTypeOf(t_mall_1).toEqualTypeOf<Maybe<readonly [number, Status]>>();

    const t_mall_2 = Maybe.all(maybes);
    expectTypeOf(t_mall_2).toEqualTypeOf<Maybe<number[]>>();

    const t_mallAsync_1 = Maybe.allAsync(pmn, pmn);
    expectTypeOf(t_mallAsync_1).toEqualTypeOf<
      Promise<Maybe<readonly [number, number]>>
    >();

    const t_mfirstSome_1 = Maybe.firstSome(mn, ms);
    expectTypeOf(t_mfirstSome_1).toEqualTypeOf<Maybe<number | Status>>();

    const t_mfirstSome_2 = Maybe.firstSome<number>(mn, some(1));
    expectTypeOf(t_mfirstSome_2).toEqualTypeOf<Maybe<number>>();

    const t_mfirstSome_3 = Maybe.firstSome(maybes);
    expectTypeOf(t_mfirstSome_3).toEqualTypeOf<Maybe<number>>();

    const t_mtoResult_1 = Maybe.toResult(mn, () => new AppError());
    expectTypeOf(t_mtoResult_1).toEqualTypeOf<Result<number, AppError>>();

    const t_mfromResult_1 = Maybe.fromResult(rn);
    expectTypeOf(t_mfromResult_1).toEqualTypeOf<Maybe<number>>();

    const t_mtranspose_1 = Maybe.transpose(mr);
    expectTypeOf(t_mtranspose_1).toEqualTypeOf<
      Result<Maybe<number>, AppError>
    >();

    const t_mtranspose_2 = Maybe.transpose<number, AppError>(mr);
    expectTypeOf(t_mtranspose_2).toEqualTypeOf<
      Result<Maybe<number>, AppError>
    >();

    const t_isSome_1 = isSome(mn);
    expectTypeOf<typeof t_isSome_1>().toEqualTypeOf<boolean>();

    const t_isNone_1 = isNone(mn);
    expectTypeOf<typeof t_isNone_1>().toEqualTypeOf<boolean>();
  });
  test("declared", () => {
    const a_mmap_1: Maybe<Status> = Maybe.map(mn, (v) =>
      v > 0 ? "active" : "inactive"
    );
    const a_mmap_2: Maybe<Loose> = Maybe.map(mn, () => "a");
    const a_mflatMap_1: Maybe<Status> = Maybe.flatMap(mn, (_v) =>
      some("active")
    );
    const a_mflatMap_2: Maybe<Status> = Maybe.flatMap(mn, () => some("active"));
    const a_mflatMap_3: Maybe<Config> = Maybe.flatMap(mn, (p) =>
      some({ mode: "dev", port: p })
    );
    const a_mflatMap_4: Maybe<H> = Maybe.flatMap(mn, (v) =>
      some({ handler: (x) => x + v })
    );
    const a_mflatMap_5: Maybe<Shape> = Maybe.flatMap(mn, (v) =>
      v > 0 ? some({ kind: "circle", r: v }) : none()
    );
    const a_mflatMap_6: Maybe<number> = Maybe.flatMap(mn, (v) => ({
      some: true,
      value: v,
    }));
    const a_mflatMap_7: Maybe<H> = Maybe.flatMap(mn, () =>
      some({ handler: (x) => x })
    );
    const a_munwrapOr_1: Status = Maybe.unwrapOr(ms, "inactive");
    const a_munwrapOrElse_1: Status = Maybe.unwrapOrElse(ms, () => "inactive");
    const a_munwrapOrElse_2: Config = Maybe.unwrapOrElse(mCfg, () => ({
      mode: "dev",
      port: 1,
    }));
    const a_munwrapOrElse_3: H = Maybe.unwrapOrElse(mH, () => ({
      handler: (x) => x,
    }));
    const a_mmatch_1: Status = Maybe.match(mn, {
      some: () => "active",
      none: () => "inactive",
    });
    const a_mmatch_2: Config = Maybe.match(mCfg, {
      some: (c) => c,
      none: () => ({ mode: "dev", port: 1 }),
    });
    const a_mmatch_3: H = Maybe.match(mH, {
      some: (h) => h,
      none: () => ({ handler: (x) => x }),
    });
    function f_mflatMap_1(): Maybe<Status> {
      return Maybe.flatMap(mn, (v) => some(v > 0 ? "active" : "inactive"));
    }
    void [
      a_mmap_1,
      a_mmap_2,
      a_mflatMap_1,
      a_mflatMap_2,
      a_mflatMap_3,
      a_mflatMap_4,
      a_mflatMap_5,
      a_mflatMap_6,
      a_mflatMap_7,
      a_munwrapOr_1,
      a_munwrapOrElse_1,
      a_munwrapOrElse_2,
      a_munwrapOrElse_3,
      a_mmatch_1,
      a_mmatch_2,
      a_mmatch_3,
      f_mflatMap_1,
    ];
  });
  test("generic", () => {
    function g_mflatMap_1<T>(m: Maybe<T>) {
      return Maybe.flatMap(m, (v) => some([v]));
    }
    expectTypeOf(g_mflatMap_1).toEqualTypeOf<<T>(m: Maybe<T>) => Maybe<T[]>>();

    function g_mmap_1<T, U>(m: Maybe<T>, f: (v: T) => U) {
      return Maybe.map(m, f);
    }
    expectTypeOf(g_mmap_1).toEqualTypeOf<
      <T, U>(m: Maybe<T>, f: (v: T) => U) => Maybe<U>
    >();

    function g_mmap_2<T>(m: Maybe<T>, f: (v: T) => Promise<T>) {
      return Maybe.map(m, f);
    }
    expectTypeOf(g_mmap_2).toEqualTypeOf<
      <T>(
        m: Maybe<T>,
        f: (v: T) => Promise<T>
      ) => { readonly "Maybe.map does not await. Await the value first": never }
    >();

    function g_mmatch_1<T>(m: Maybe<T>) {
      return Maybe.match(m, { some: (v) => [v], none: () => [] });
    }
    expectTypeOf(g_mmatch_1).toEqualTypeOf<<T>(m: Maybe<T>) => never[] | T[]>();
  });
});

describe("point-free and nested use", () => {
  test("inferred", () => {
    const t_pf_1 = results.map(Result.unwrap);
    expectTypeOf(t_pf_1).toEqualTypeOf<number[]>();

    const t_pf_2 = results.map(Result.split);
    expectTypeOf(t_pf_2).toEqualTypeOf<
      (
        | readonly [failure: ErrResult<AppError>, value: undefined]
        | readonly [failure: undefined, value: number]
      )[]
    >();

    const t_pf_3 = results.map(Result.toMaybe);
    expectTypeOf(t_pf_3).toEqualTypeOf<Maybe<number>[]>();

    const t_pf_4 = maybes.map(Maybe.unwrap);
    expectTypeOf(t_pf_4).toEqualTypeOf<number[]>();

    const t_pf_5 = [rnn].map(Result.flatten);
    expectTypeOf(t_pf_5).toEqualTypeOf<Result<number, AppError | DbError>[]>();

    const t_pf_6 = results.filter(Result.isOk);
    expectTypeOf(t_pf_6).toEqualTypeOf<OkResult<number>[]>();

    const t_pf_7 = results.filter(isErr);
    expectTypeOf(t_pf_7).toEqualTypeOf<ErrResult<AppError>[]>();

    const t_pf_8 = Promise.resolve(rn).then(Result.unwrap);
    expectTypeOf(t_pf_8).toEqualTypeOf<Promise<number>>();

    const t_pf_9 = [1, 2].map((n) => Result.ok(n));
    expectTypeOf(t_pf_9).toEqualTypeOf<OkResult<number>[]>();

    const t_pf_10 = results.map((r) => Result.map(r, (v) => v + 1));
    expectTypeOf(t_pf_10).toEqualTypeOf<Result<number, AppError>[]>();

    const t_pf_11 = results.map((r) => Result.flatMap(r, (v) => ok(String(v))));
    expectTypeOf(t_pf_11).toEqualTypeOf<Result<string, AppError>[]>();

    const t_pf_12 = results.map((r) => Result.orElse(r, () => ok(0)));
    expectTypeOf(t_pf_12).toEqualTypeOf<Result<number, never>[]>();

    const t_pf_13 = [mr].map(Maybe.transpose);
    expectTypeOf(t_pf_13).toEqualTypeOf<Result<Maybe<number>, AppError>[]>();

    const t_pf_14 = [rm].map(Result.transpose);
    expectTypeOf(t_pf_14).toEqualTypeOf<Maybe<Result<number, AppError>>[]>();

    const t_pf_15 = results.map((r) =>
      Result.match(r, { ok: (v) => v, err: () => 0 })
    );
    expectTypeOf(t_pf_15).toEqualTypeOf<number[]>();

    const t_nest_1 = Result.flatMap(rn, (v) =>
      Result.flatMap(rs, (s) => ok({ v, s }))
    );
    expectTypeOf(t_nest_1).toEqualTypeOf<
      Result<{ v: number; s: string }, AppError | DbError>
    >();

    const t_nest_2 = Result.orElse(rn, () => Result.map(rs, (s) => s.length));
    expectTypeOf(t_nest_2).toEqualTypeOf<Result<number, DbError>>();

    const t_nest_3 = Result.map(Result.flatMap(rn, getUser), (u) => u.name);
    expectTypeOf(t_nest_3).toEqualTypeOf<Result<string, AppError>>();

    const t_nest_4 = Result.match(Result.flatMap(rn, getUser), {
      ok: (u) => u.id,
      err: (e) => e.name,
    });
    expectTypeOf(t_nest_4).toEqualTypeOf<number | "AppError">();

    const t_nest_5 = Maybe.flatMap(mn, (v) =>
      Maybe.map(findUser(v), (u) => u.name)
    );
    expectTypeOf(t_nest_5).toEqualTypeOf<Maybe<string>>();

    const t_nest_6 = Result.flatMap(rn, (v) =>
      Result.orElse(getUser(v), () => ok({ id: 0, name: "anon" }))
    );
    expectTypeOf(t_nest_6).toEqualTypeOf<
      Result<{ id: number; name: string }, AppError>
    >();

    const t_nest_7 = Result.unwrapOrElse(
      Result.map(rn, (v) => String(v)),
      () => "none"
    );
    expectTypeOf(t_nest_7).toEqualTypeOf<string>();

    const t_nest_8 = Result.flatMap(rStatus, (s) =>
      s === "active" ? ok(s) : err(new AppError())
    );
    expectTypeOf(t_nest_8).toEqualTypeOf<Result<"active", AppError | Error>>();

    const t_nest_9 = useResult(Result.map(rn, (v) => v * 2));
    expectTypeOf(t_nest_9).toEqualTypeOf<number>();

    const t_nest_10 = [Result.map(rn, String), Result.map(rs, (s) => s)];
    expectTypeOf(t_nest_10).toEqualTypeOf<
      (ErrResult<AppError> | OkResult<string> | ErrResult<DbError>)[]
    >();

    const t_nest_11 = Result.flatMap(rn, (v) => Result.tryCatch(() => v * 2));
    expectTypeOf(t_nest_11).toEqualTypeOf<Result<number, AppError | Error>>();
  });
  test("declared", () => {
    const a_nest_1: Result<{ v: number; s: string }, AppError | DbError> =
      Result.flatMap(rn, (v) => Result.map(rs, (s) => ({ v, s })));
    const a_nest_3: Result<Status, Error>[] = [
      Result.flatMap(rn, () => ok("active")),
      Result.orElse(rStatus, () => ok("inactive")),
    ];
    const a_nest_4: { s: Result<Status, never> } = {
      s: Result.orElse(rStatus, () => ok("inactive")),
    };
    const a_nest_5: Status = useResult(
      Result.orElse(rStatus, () => ok("inactive"))
    );
    function f_nest_1(): void {
      useShapeResult(Result.flatMap(rn, (v) => ok({ kind: "circle", r: v })));
      useShapeResult(
        Result.orElse(rShape, () => ok({ kind: "square", side: 1 }))
      );
    }
    const a_nest_6: Promise<Result<Status, Error>> = prn.then((r) =>
      Result.flatMap(r, () => ok("active"))
    );
    const a_nest_7: Result<Status, Error> = Math.random()
      ? Result.flatMap(rn, () => ok("active"))
      : Result.orElse(rStatus, () => ok("inactive"));
    const a_nest_8 = Result.flatMap(rn, () => ok("active")) satisfies Result<
      Status,
      AppError
    >;
    const a_nest_9: Result<Status, AppError> = Result.flatMap(rn, (v) =>
      Result.map(rStatus, (s) => (v > 0 ? s : "inactive"))
    ) as Result<Status, AppError>;
    const a_nest_10 = useResult<Status, never>(
      Result.orElse(rStatus, () => ok("inactive"))
    );
    class C {
      readonly s: Result<Status, never> = Result.orElse(rStatus, () =>
        ok("inactive")
      );
      readonly m: Maybe<Status> = Maybe.flatMap(mn, () => some("active"));
    }
    void [
      a_nest_1,
      a_nest_3,
      a_nest_4,
      a_nest_5,
      f_nest_1,
      a_nest_6,
      a_nest_7,
      a_nest_8,
      a_nest_9,
      a_nest_10,
      C,
    ];
  });
});

describe("a call or an object literal as the input", () => {
  test("inferred", () => {
    const t_in_1 = Result.unwrapOr(
      Result.flatMap(rn, () => ok("active")),
      "inactive"
    );
    expectTypeOf(t_in_1).toEqualTypeOf<string>();

    const t_in_2 = Result.unwrapOrElse(
      Result.flatMap(rn, () => ok("active")),
      () => "inactive"
    );
    expectTypeOf(t_in_2).toEqualTypeOf<string>();

    const t_in_3 = Result.orElse(
      Result.flatMap(rn, () => ok("active")),
      () => ok("inactive")
    );
    expectTypeOf(t_in_3).toEqualTypeOf<Result<string, never>>();

    const t_in_4 = Result.flatMapErr(
      Result.flatMap(rn, () => ok("active")),
      () => ok("inactive")
    );
    expectTypeOf(t_in_4).toEqualTypeOf<Result<string, never>>();

    const t_in_5 = Result.mapError(
      Result.flatMap(rn, () => ok("active")),
      () => new DbError()
    );
    expectTypeOf(t_in_5).toEqualTypeOf<Result<string, DbError>>();

    const t_in_6 = Result.inspect(
      Result.flatMap(rn, () => ok("active")),
      log
    );
    expectTypeOf(t_in_6).toEqualTypeOf<Result<string, AppError>>();

    const t_in_7 = Result.inspectError(
      Result.flatMap(rn, () => err(new DbError())),
      log
    );
    expectTypeOf(t_in_7).toEqualTypeOf<Result<never, AppError | DbError>>();

    const t_in_8 = Result.match(
      Result.flatMap(rn, () => ok("active")),
      { ok: (s) => s, err: () => "inactive" }
    );
    expectTypeOf(t_in_8).toEqualTypeOf<string>();

    const t_in_9 = Result.map(
      Result.flatMap(rn, () => ok("active")),
      (s) => s
    );
    expectTypeOf(t_in_9).toEqualTypeOf<Result<string, AppError>>();

    const t_in_10 = Result.flatMap(
      Result.flatMap(rn, () => ok("active")),
      (s) => ok(s)
    );
    expectTypeOf(t_in_10).toEqualTypeOf<Result<string, AppError>>();

    const t_in_11 = Maybe.unwrapOr(
      Maybe.flatMap(mn, () => some("active")),
      "inactive"
    );
    expectTypeOf(t_in_11).toEqualTypeOf<string>();

    const t_in_12 = Maybe.unwrapOrElse(
      Maybe.flatMap(mn, () => some("active")),
      () => "inactive"
    );
    expectTypeOf(t_in_12).toEqualTypeOf<string>();

    const t_in_13 = Maybe.inspect(
      Maybe.flatMap(mn, () => some("active")),
      log
    );
    expectTypeOf(t_in_13).toEqualTypeOf<Maybe<string>>();

    const t_in_14 = Maybe.match(
      Maybe.flatMap(mn, () => some("active")),
      { some: (s) => s, none: () => "inactive" }
    );
    expectTypeOf(t_in_14).toEqualTypeOf<string>();

    const t_in_15 = Maybe.map(
      Maybe.flatMap(mn, () => some("active")),
      (s) => s
    );
    expectTypeOf(t_in_15).toEqualTypeOf<Maybe<string>>();

    const t_in_16 = Maybe.flatMap(
      Maybe.flatMap(mn, () => some("active")),
      (s) => some(s)
    );
    expectTypeOf(t_in_16).toEqualTypeOf<Maybe<string>>();

    const t_in_17 = Result.unwrapOr({ ok: true, value: 1 }, 0);
    expectTypeOf(t_in_17).toEqualTypeOf<number>();

    const t_in_18 = Result.map({ ok: true, value: 1 }, (v) => v + 1);
    expectTypeOf(t_in_18).toEqualTypeOf<OkResult<number>>();

    const t_in_19 = Result.match(
      { ok: false, error: new AppError() },
      { ok: () => 1, err: (e) => e.name }
    );
    expectTypeOf(t_in_19).toEqualTypeOf<number | "AppError">();

    const t_in_20 = Maybe.unwrapOr({ some: true, value: 1 }, 0);
    expectTypeOf(t_in_20).toEqualTypeOf<number>();

    const t_in_21 = Result.unwrapOr(ok("active"), "inactive");
    expectTypeOf(t_in_21).toEqualTypeOf<string>();

    const t_in_22 = Result.orElse(err(new AppError()), () => ok("x"));
    expectTypeOf(t_in_22).toEqualTypeOf<Result<string, never>>();

    const t_in_23 = Result.unwrapOrElse(
      Result.fromNullable(1 as number | null, () => new AppError()),
      () => 0
    );
    expectTypeOf(t_in_23).toEqualTypeOf<number>();

    const t_in_24 = Result.unwrapOr(
      Result.map(rn, (v) => (v > 0 ? "active" : "inactive")),
      "inactive"
    );
    expectTypeOf<typeof t_in_24>().toEqualTypeOf<"active" | "inactive">();
  });
  test("declared", () => {
    const a_in_1: Status = Result.unwrapOr(
      Result.flatMap(rn, () => ok("active")),
      "inactive"
    );
    const a_in_2: Status = Result.unwrapOrElse(
      Result.flatMap(rn, () => ok("active")),
      () => "inactive"
    );
    const a_in_3: Result<Status, never> = Result.orElse(
      Result.flatMap(rn, () => ok("active")),
      () => ok("inactive")
    );
    const a_in_4: Result<Status, never> = Result.flatMapErr(
      Result.flatMap(rn, () => ok("active")),
      () => ok("inactive")
    );
    const a_in_5: Result<Status, DbError> = Result.mapError(
      Result.flatMap(rn, () => ok("active")),
      () => new DbError()
    );
    const a_in_6: Result<Status, AppError> = Result.inspect(
      Result.flatMap(rn, () => ok("active")),
      log
    );
    const a_in_10: Status = Maybe.unwrapOr(
      Maybe.flatMap(mn, () => some("active")),
      "inactive"
    );
    const a_in_11: Status = Maybe.unwrapOrElse(
      Maybe.flatMap(mn, () => some("active")),
      () => "inactive"
    );
    const a_in_12: Maybe<Status> = Maybe.inspect(
      Maybe.flatMap(mn, () => some("active")),
      log
    );
    const a_in_14: Status = Result.unwrapOr(ok("active"), "inactive");
    const a_in_15: Result<Status, never> = Result.orElse(
      err(new AppError()),
      () => ok("active")
    );
    const a_in_17: H = Result.unwrapOr(
      Result.flatMap(rn, () => ok({ handler: (x) => x })),
      { handler: (x) => x }
    );
    const a_in_18: Result<Status, Error> = Result.unwrapOr(
      ok(Result.flatMap(rn, () => ok("active"))),
      err(new Error())
    );
    const a_in_19: Status = Result.unwrapOrElse(ok("active"), (e) =>
      e.message ? "active" : "inactive"
    );
    void [
      a_in_1,
      a_in_2,
      a_in_3,
      a_in_4,
      a_in_5,
      a_in_6,
      a_in_10,
      a_in_11,
      a_in_12,
      a_in_14,
      a_in_15,
      a_in_17,
      a_in_18,
      a_in_19,
    ];
  });
});

describe("F1 audit repros", () => {
  test("declared", () => {
    const a_f1_1: Status = Result.unwrapOrElse(rStatus, () => "inactive");
    function f_f1_2(): Config {
      return Result.unwrapOrElse(rCfg, () => ({ mode: "dev", port: 3000 }));
    }
    const a_f1_3: Result<Status, never> = Result.orElse(rStatus, () =>
      ok("inactive")
    );
    const a_f1_4: Result<Status, never> = Result.flatMapErr(rStatus, () =>
      ok("inactive")
    );
    const a_f1_5: Result<Status, never> = Result.orElse(rStatus, (e) =>
      ok(e.message ? "inactive" : "active")
    );
    const a_f1_6: Result<Status, Error> = Result.flatMap(rnE, () =>
      ok("active")
    );
    const a_f1_7: Result<Status, Error> = Result.flatMap(rnE, (v) =>
      ok(v ? "active" : "inactive")
    );
    const a_f1_8: Maybe<Status> = Maybe.flatMap(mn, () => some("active"));
    const a_f1_9: Maybe<Status> = Maybe.flatMap(mn, (v) =>
      Maybe.some(v ? "active" : "inactive")
    );
    async function f_f1_10(): Promise<Result<Status, Error>> {
      return Result.fromPromise(Promise.resolve("active"));
    }
    async function f_f1_11(port: number): Promise<Result<Config, Error>> {
      return Result.tryCatchAsync(async () => ({ mode: "dev", port }));
    }
    const a_f1_12: Result<Status, never> = Result.orElse(rStatus, (e) =>
      e ? ok("inactive") : ok("active")
    );
    void [
      a_f1_1,
      f_f1_2,
      a_f1_3,
      a_f1_4,
      a_f1_5,
      a_f1_6,
      a_f1_7,
      a_f1_8,
      a_f1_9,
      f_f1_10,
      f_f1_11,
      a_f1_12,
    ];
  });
  test("inferred", () => {
    const t_f1_1 = Result.flatMap(rnE, (v) => ({ ok: true, value: v }));
    expectTypeOf(t_f1_1).toEqualTypeOf<Result<number, Error>>();
    const t_f1_2 = Result.orElse(rH, () => ok({ handler: (x) => x + 1 }));
    expectTypeOf(t_f1_2).toEqualTypeOf<
      Result<{ handler: (x: number) => number }, never>
    >();
    // TypeScript 5.0 to 5.4 give Result<string, never>, for 3.0.0 as well.
    const t_f1_3 = Result.orElse(rStatus, () => ok("inactive"));
    expectTypeOf(t_f1_3).toEqualTypeOf<Result<Status, never>>();
    const t_f1_4 = Result.flatMapErr(rH, () => ok({ handler: (x) => x * 2 }));
    expectTypeOf(t_f1_4).toEqualTypeOf<
      Result<{ handler: (x: number) => number }, never>
    >();
    const t_f1_5 = Result.flatMap(rnE, () => ok({ handler: (x: number) => x }));
    expectTypeOf(t_f1_5).toEqualTypeOf<
      Result<{ handler: (x: number) => number }, Error>
    >();
    const t_f1_6 = Result.unwrapOrElse(rH, () => ({ handler: (x) => x - 1 }));
    expectTypeOf(t_f1_6).toEqualTypeOf<{ handler: (x: number) => number }>();
    const t_f1_7 = Maybe.unwrapOrElse(mH, () => ({ handler: (x) => x + 2 }));
    expectTypeOf(t_f1_7).toEqualTypeOf<{ handler: (x: number) => number }>();
    const t_f1_8 = Result.unwrapOr(rH, { handler: (x) => x });
    expectTypeOf(t_f1_8).toEqualTypeOf<{ handler: (x: number) => number }>();
    const t_f1_9 = Maybe.unwrapOr(mH, { handler: (x) => x });
    expectTypeOf(t_f1_9).toEqualTypeOf<{ handler: (x: number) => number }>();
    const t_f1_10 = Result.orElse(rStatus, () => ({
      ok: true,
      value: "inactive",
    }));
    expectTypeOf(t_f1_10).toEqualTypeOf<Result<string, never>>();
    const t_f1_11 = Result.flatMap(rStatus, (s) => ({ ok: true, value: s }));
    expectTypeOf(t_f1_11).toEqualTypeOf<Result<Status, Error>>();
    const t_f1_12 = Maybe.flatMap(ms, (s) => ({ some: true, value: s }));
    expectTypeOf(t_f1_12).toEqualTypeOf<Maybe<Status>>();
  });
});

describe("a call, a conditional or a literal as the input, with an expected type", () => {
  test("satisfies", () => {
    const t_ctx_1 = Result.unwrapOr(
      Result.ok("active"),
      "inactive"
    ) satisfies Status;
    expectTypeOf<typeof t_ctx_1>().toEqualTypeOf<"active" | "inactive">();
    const t_ctx_2 = Result.unwrapOr(ok("active"), "inactive") satisfies Status;
    expectTypeOf<typeof t_ctx_2>().toEqualTypeOf<"active" | "inactive">();
    const t_ctx_3 = Result.unwrapOr(
      Result.map(rn, () => "active"),
      "inactive"
      // @ts-expect-error
    ) satisfies Status;
    void t_ctx_3;
    const t_ctx_4 = Result.unwrapOr(
      wrapOk("active"),
      "inactive"
    ) satisfies Status;
    expectTypeOf<typeof t_ctx_4>().toEqualTypeOf<"active" | "inactive">();
    const t_ctx_5 = Result.unwrapOr(
      identity(ok("active")),
      "inactive"
    ) satisfies Status;
    expectTypeOf<typeof t_ctx_5>().toEqualTypeOf<"active" | "inactive">();
    const t_ctx_6 = Result.unwrapOr(
      { ok: true, value: "active" },
      "inactive"
    ) satisfies Status;
    expectTypeOf<typeof t_ctx_6>().toEqualTypeOf<"active" | "inactive">();
    const t_ctx_7 = Result.unwrapOr(
      Math.random() ? ok("active") : err(new AppError()),
      "inactive"
    ) satisfies Status;
    expectTypeOf<typeof t_ctx_7>().toEqualTypeOf<"active" | "inactive">();
    const t_ctx_8 = Result.unwrapOrElse(
      Result.ok("active"),
      () => "inactive"
    ) satisfies Status;
    expectTypeOf<typeof t_ctx_8>().toEqualTypeOf<"active" | "inactive">();
    // @ts-expect-error
    const t_ctx_9 = Result.map(Result.ok("active"), (v) => v) satisfies Result<
      Status,
      Error
    >;
    void t_ctx_9;
    // @ts-expect-error
    const t_ctx_10 = Result.map(ok("active"), (v) => v) satisfies Result<
      Status,
      never
    >;
    void t_ctx_10;
    const t_ctx_11 = Result.flatMap(
      Result.ok("active"),
      (v) => Result.ok(v)
      // @ts-expect-error
    ) satisfies Result<Status, Error>;
    void t_ctx_11;
    const t_ctx_12 = Result.match(Result.ok("active"), {
      ok: (v) => v,
      err: () => "inactive",
      // @ts-expect-error
    }) satisfies Status;
    void t_ctx_12;
    const t_ctx_13 = Result.inspect(
      Result.ok("active"),
      () => {}
    ) satisfies Result<Status, Error>;
    expectTypeOf(t_ctx_13).toEqualTypeOf<OkResult<"active">>();
    const t_ctx_14 = Result.inspectError(
      Result.ok("active"),
      () => {}
      // @ts-expect-error
    ) satisfies Result<Status, Error>;
    void t_ctx_14;
    const t_ctx_15 = Result.mapError(
      Result.ok("active"),
      (e) => e
    ) satisfies Result<Status, Error>;
    expectTypeOf(t_ctx_15).toEqualTypeOf<OkResult<"active">>();
    const t_ctx_16 = Result.orElse(Result.ok("active"), () =>
      ok("inactive")
    ) satisfies Result<Status, never>;
    expectTypeOf(t_ctx_16).toEqualTypeOf<
      Result<"active" | "inactive", never>
    >();
    const t_ctx_17 = Result.flatMapErr(Result.ok("active"), () =>
      ok("inactive")
    ) satisfies Result<Status, never>;
    expectTypeOf(t_ctx_17).toEqualTypeOf<
      Result<"active" | "inactive", never>
    >();
    const t_ctx_18 = Result.unwrap(Result.ok("active")) satisfies Status;
    expectTypeOf<typeof t_ctx_18>().toEqualTypeOf<"active">();
    const t_ctx_19 = Result.split(Result.ok("active")) satisfies readonly [
      unknown,
      Status | undefined,
    ];
    expectTypeOf(t_ctx_19).toEqualTypeOf<
      | readonly [failure: ErrResult<never>, value: undefined]
      | readonly [failure: undefined, value: "active"]
    >();
    const t_ctx_20 = Result.toMaybe(
      Result.ok("active")
    ) satisfies Maybe<Status>;
    expectTypeOf(t_ctx_20).toEqualTypeOf<Maybe<"active">>();
    const t_ctx_21 = Maybe.unwrapOr(
      Maybe.some("active"),
      "inactive"
    ) satisfies Status;
    expectTypeOf<typeof t_ctx_21>().toEqualTypeOf<"active" | "inactive">();
    const t_ctx_22 = Maybe.unwrapOr(
      some("active"),
      "inactive"
    ) satisfies Status;
    expectTypeOf<typeof t_ctx_22>().toEqualTypeOf<"active" | "inactive">();
    const t_ctx_23 = Maybe.unwrapOr(
      Maybe.map(mn, () => "active"),
      "inactive"
      // @ts-expect-error
    ) satisfies Status;
    void t_ctx_23;
    const t_ctx_24 = Maybe.unwrapOr(
      { some: true, value: "active" },
      "inactive"
    ) satisfies Status;
    expectTypeOf<typeof t_ctx_24>().toEqualTypeOf<"active" | "inactive">();
    const t_ctx_25 = Maybe.unwrapOrElse(
      Maybe.some("active"),
      () => "inactive"
    ) satisfies Status;
    expectTypeOf<typeof t_ctx_25>().toEqualTypeOf<"active" | "inactive">();
    const t_ctx_26 = Maybe.map(
      Maybe.some("active"),
      (v) => v
      // @ts-expect-error
    ) satisfies Maybe<Status>;
    void t_ctx_26;
    const t_ctx_27 = Maybe.flatMap(
      Maybe.some("active"),
      (v) => Maybe.some(v)
      // @ts-expect-error
    ) satisfies Maybe<Status>;
    void t_ctx_27;
    const t_ctx_28 = Maybe.inspect(
      Maybe.some("active"),
      () => {}
    ) satisfies Maybe<Status>;
    expectTypeOf(t_ctx_28).toEqualTypeOf<Some<"active">>();
    const t_ctx_29 = Maybe.match(Maybe.some("active"), {
      some: (v) => v,
      none: () => "inactive",
      // @ts-expect-error
    }) satisfies Status;
    void t_ctx_29;
    const t_ctx_30 = Maybe.filter(
      Maybe.some("active"),
      () => true
      // @ts-expect-error
    ) satisfies Maybe<Status>;
    void t_ctx_30;
    const t_ctx_31 = Maybe.unwrap(Maybe.some("active")) satisfies Status;
    expectTypeOf<typeof t_ctx_31>().toEqualTypeOf<"active">();
    const t_ctx_32 = Maybe.toResult(
      Maybe.some("active"),
      () => new AppError()
    ) satisfies Result<Status, AppError>;
    expectTypeOf(t_ctx_32).toEqualTypeOf<Result<"active", AppError>>();
    const t_ctx_33 = Result.fromMaybe(
      Maybe.some("active"),
      () => new AppError()
    ) satisfies Result<Status, AppError>;
    expectTypeOf(t_ctx_33).toEqualTypeOf<Result<"active", AppError>>();
    const t_ctx_34 = Maybe.fromResult(
      Result.ok("active")
    ) satisfies Maybe<Status>;
    expectTypeOf(t_ctx_34).toEqualTypeOf<Maybe<"active">>();
    const t_ctx_35 = Result.unwrapOr(
      Result.fromNullable("active" as Status | null, () => new AppError()),
      "inactive"
    ) satisfies Status;
    expectTypeOf<typeof t_ctx_35>().toEqualTypeOf<
      NonNullable<"active" | "inactive">
    >();
    const t_ctx_36 = Result.unwrapOr(
      Result.tryCatch(() => "active"),
      "inactive"
      // @ts-expect-error
    ) satisfies Status;
    void t_ctx_36;
    const t_ctx_37 = Result.map(
      Result.tryCatch(() => "active"),
      (v) => v
      // @ts-expect-error
    ) satisfies Result<Status, Error>;
    void t_ctx_37;
    const t_ctx_38 = Result.unwrapOr(
      Result.orElse(rStatus, () => ok("inactive")),
      "active"
    ) satisfies Status;
    expectTypeOf<typeof t_ctx_38>().toEqualTypeOf<Status>();
    const t_ctx_39 = Result.unwrapOr(
      Result.flatMap(rn, () => ok("active")),
      "inactive"
    ) satisfies Status;
    expectTypeOf<typeof t_ctx_39>().toEqualTypeOf<"active" | "inactive">();
    const t_ctx_40 = Maybe.unwrapOr(
      Maybe.flatMap(mn, () => some("active")),
      "inactive"
    ) satisfies Status;
    expectTypeOf<typeof t_ctx_40>().toEqualTypeOf<"active" | "inactive">();
    const t_ctx_41 = Result.map(
      Result.map(rn, () => "active"),
      (s) => s
      // @ts-expect-error
    ) satisfies Result<Status, AppError>;
    void t_ctx_41;
    const t_ctx_42 = Result.mapError(
      Result.err(new AppError()),
      () => new DbError()
    ) satisfies Result<Status, DbError>;
    expectTypeOf(t_ctx_42).toEqualTypeOf<ErrResult<DbError>>();
    const t_ctx_43 = Result.unwrapOr(Result.all(ok("active"), ok(1)), [
      "inactive",
      0,
      // @ts-expect-error
    ]) satisfies readonly [Status, number];
    void t_ctx_43;
    const t_ctx_44 = Result.unwrapOr(Result.ok({ mode: "dev", port: 1 }), {
      // @ts-expect-error
      mode: "prod",
      port: 2,
    }) satisfies Config;
    void t_ctx_44;
    const t_ctx_45 = Result.unwrapOrElse(
      Result.ok({ mode: "dev", port: 1 }),
      // @ts-expect-error
      () => ({ mode: "prod", port: 2 })
    ) satisfies Config;
    void t_ctx_45;
    const t_ctx_46 = Maybe.unwrapOr(Maybe.some({ mode: "dev", port: 1 }), {
      // @ts-expect-error
      mode: "prod",
      port: 2,
    }) satisfies Config;
    void t_ctx_46;
    const t_ctx_47 = Result.match(Result.ok({ mode: "dev", port: 1 }), {
      ok: (c) => c,
      err: () => ({ mode: "prod", port: 2 }),
      // @ts-expect-error
    }) satisfies Config;
    void t_ctx_47;
    const t_ctx_48 = Result.unwrap(
      Result.map(rn, (v) => ({ kind: "circle", r: v }))
      // @ts-expect-error
    ) satisfies Shape;
    void t_ctx_48;
    const t_ctx_49 = Result.map(rn, () => ({
      // @ts-expect-error
      handler: (x) => x + 1,
    })) satisfies Result<H, AppError>;
    void t_ctx_49;
    const t_ctx_50 = Result.flatMap(rn, () =>
      ok({ handler: (x) => x + 1 })
    ) satisfies Result<H, AppError>;
    expectTypeOf(t_ctx_50).toEqualTypeOf<
      Result<{ handler: (x: number) => number }, AppError>
    >();
  });
  test("declared", () => {
    const a_ctx_1: Status = Result.unwrapOr(Result.ok("active"), "inactive");
    // @ts-expect-error
    const a_ctx_2: Status = Result.unwrapOr(
      Result.map(rn, () => "active"),
      "inactive"
    );
    const a_ctx_3: Status = Maybe.unwrapOr(Maybe.some("active"), "inactive");
    const a_ctx_4: Status = Result.unwrapOrElse(
      Result.ok("active"),
      () => "inactive"
    );
    // @ts-expect-error
    const a_ctx_5: Result<Status, Error> = Result.map(
      Result.ok("active"),
      (v) => v
    );
    // @ts-expect-error
    const a_ctx_6: Result<Status, Error> = Result.flatMap(
      Result.ok("active"),
      (v) => Result.ok(v)
    );
    // @ts-expect-error
    const a_ctx_7: Status = Result.match(Result.ok("active"), {
      ok: (v) => v,
      err: () => "inactive",
    });
    const a_ctx_8: Result<Status, Error> = Result.inspect(
      Result.ok("active"),
      () => {}
    );
    const a_ctx_9: Result<Status, Error> = Result.mapError(
      Result.ok("active"),
      (e) => e
    );
    // @ts-expect-error
    const a_ctx_10: Maybe<Status> = Maybe.map(Maybe.some("active"), (v) => v);
    const a_ctx_11: Maybe<Status> = Maybe.inspect(
      Maybe.some("active"),
      () => {}
    );
    // @ts-expect-error
    const a_ctx_12: Status = Maybe.match(Maybe.some("active"), {
      some: (v) => v,
      none: () => "inactive",
    });
    // @ts-expect-error
    const a_ctx_13: Result<Status, Error> = Result.inspectError(
      Result.ok("active"),
      () => {}
    );
    const a_ctx_14: Result<Status, never> = Result.orElse(
      Result.ok("active"),
      () => ok("inactive")
    );
    const a_ctx_15: Status = Maybe.unwrapOrElse(
      Maybe.some("active"),
      () => "inactive"
    );
    const a_ctx_16: Status = Result.unwrapOr(
      { ok: true, value: "active" },
      "inactive"
    );
    const a_ctx_17: Status = Maybe.unwrapOr(
      { some: true, value: "active" },
      "inactive"
    );
    const a_ctx_18: Status = Result.unwrapOr(
      Math.random() ? ok("active") : err(new AppError()),
      "inactive"
    );
    const a_ctx_19: Status = Result.unwrap(Result.ok("active"));
    const a_ctx_20: Maybe<Status> = Result.toMaybe(Result.ok("active"));
    const a_ctx_21: Result<Status, AppError> = Result.fromMaybe(
      Maybe.some("active"),
      () => new AppError()
    );
    function f_ctx_22(): Status {
      return Result.unwrapOr(Result.ok("active"), "inactive");
    }
    function f_ctx_23(): Result<Status, Error> {
      // @ts-expect-error
      return Result.map(Result.ok("active"), (v) => v);
    }
    const f_ctx_24 = (): Status =>
      Maybe.unwrapOr(Maybe.some("active"), "inactive");
    useStatus(Result.unwrapOr(Result.ok("active"), "inactive"));
    useStatus(Maybe.unwrapOr(Maybe.some("active"), "inactive"));
    useStatus(
      // @ts-expect-error
      Result.match(Result.ok("active"), { ok: (v) => v, err: () => "inactive" })
    );
    useConfig(
      Result.unwrapOr(Result.ok({ mode: "dev", port: 1 }), {
        // @ts-expect-error
        mode: "prod",
        port: 2,
      })
    );
    useConfig(Result.unwrapOrElse(rCfg, () => ({ mode: "prod", port: 2 })));
    useConfig(Maybe.unwrapOrElse(mCfg, () => ({ mode: "prod", port: 2 })));
    // @ts-expect-error
    useShapeResult(Result.map(rn, (r) => ({ kind: "circle", r })));
    const a_ctx_25: Result<Status, AppError>[] = [
      // @ts-expect-error
      Result.map(rn, () => "active"),
      Result.flatMap(rn, () => ok("inactive")),
    ];
    const a_ctx_26: Status = Result.unwrapOr(
      Result.flatten(ok(ok("active"))),
      "inactive"
    );
    const a_ctx_27: Maybe<Status> = Maybe.flatten(some(some("active")));
    const a_ctx_28: Maybe<Result<Status, never>> = Result.transpose(
      ok(some("active"))
    );
    const a_ctx_29: Result<Maybe<Status>, never> = Maybe.transpose(
      some(ok("active"))
    );
    const a_ctx_30: Status = Result.unwrapOr(
      Result.fromPredicate(
        "active",
        (s) => s.length > 0,
        () => new AppError()
      ),
      "inactive"
    );
    void [
      a_ctx_1,
      a_ctx_2,
      a_ctx_3,
      a_ctx_4,
      a_ctx_5,
      a_ctx_6,
      a_ctx_7,
      a_ctx_8,
      a_ctx_9,
      a_ctx_10,
      a_ctx_11,
      a_ctx_12,
      a_ctx_13,
      a_ctx_14,
      a_ctx_15,
      a_ctx_16,
      a_ctx_17,
      a_ctx_18,
      a_ctx_19,
      a_ctx_20,
      a_ctx_21,
      f_ctx_22,
      f_ctx_23,
      f_ctx_24,
      a_ctx_25,
      a_ctx_26,
      a_ctx_27,
      a_ctx_28,
      a_ctx_29,
      a_ctx_30,
    ];
  });
});

describe("explicit type arguments", () => {
  test("inferred", () => {
    const t_ta_1 = Result.map<number, string, AppError>(rn, (v) => String(v));
    expectTypeOf(t_ta_1).toEqualTypeOf<Result<string, AppError>>();
    const t_ta_2 = Result.map<number, string>(okn, (v) => String(v));
    expectTypeOf(t_ta_2).toEqualTypeOf<OkResult<string>>();
    const t_ta_3 = Result.map<AppError>(erra, () => 1);
    expectTypeOf(t_ta_3).toEqualTypeOf<ErrResult<AppError>>();
    const t_ta_4 = Result.mapError<number, AppError, DbError>(rn, (e) =>
      toDb(e)
    );
    expectTypeOf(t_ta_4).toEqualTypeOf<Result<number, DbError>>();
    const t_ta_5 = Result.mapError<number>(okn, () => new DbError());
    expectTypeOf(t_ta_5).toEqualTypeOf<OkResult<number>>();
    const t_ta_6 = Result.mapError<AppError, DbError>(erra, toDb);
    expectTypeOf(t_ta_6).toEqualTypeOf<ErrResult<DbError>>();
    const t_ta_7 = Result.inspect<number, AppError>(rn, log);
    expectTypeOf(t_ta_7).toEqualTypeOf<Result<number, AppError>>();
    const t_ta_8 = Result.inspect<number>(okn, log);
    expectTypeOf(t_ta_8).toEqualTypeOf<OkResult<number>>();
    const t_ta_9 = Result.inspectError<number, AppError>(rn, log);
    expectTypeOf(t_ta_9).toEqualTypeOf<Result<number, AppError>>();
    const t_ta_10 = Result.inspectError<AppError>(erra, log);
    expectTypeOf(t_ta_10).toEqualTypeOf<ErrResult<AppError>>();
    const t_ta_11 = Result.flatMap<number, string, AppError, DbError>(rn, () =>
      err(new DbError())
    );
    expectTypeOf(t_ta_11).toEqualTypeOf<Result<string, AppError | DbError>>();
    const t_ta_12 = Result.flatMap<number, string, AppError>(rn, (v) =>
      ok(String(v))
    );
    expectTypeOf(t_ta_12).toEqualTypeOf<Result<string, AppError>>();
    const t_ta_13 = Result.flatMap<number, string>(okn, (v) => ok(String(v)));
    expectTypeOf(t_ta_13).toEqualTypeOf<Result<string, never>>();
    const t_ta_14 = Result.orElse<number, AppError, DbError>(rn, recover);
    expectTypeOf(t_ta_14).toEqualTypeOf<Result<number, DbError>>();
    const t_ta_15 = Result.orElse<number, AppError>(rn, () => ok(1));
    expectTypeOf(t_ta_15).toEqualTypeOf<Result<number, never>>();
    const t_ta_16 = Result.flatMapErr<number, AppError, DbError>(rn, recover);
    expectTypeOf(t_ta_16).toEqualTypeOf<Result<number, DbError>>();
    const t_ta_17 = Result.flatMapErr<number, AppError>(rn, () => ok(2));
    expectTypeOf(t_ta_17).toEqualTypeOf<Result<number, never>>();
    const t_ta_18 = Result.flatten<number, AppError, DbError>(rnn);
    expectTypeOf(t_ta_18).toEqualTypeOf<Result<number, AppError | DbError>>();
    const t_ta_19 = Result.flatten<number, AppError>(ok(ok(1)));
    expectTypeOf(t_ta_19).toEqualTypeOf<Result<number, AppError>>();
    const t_ta_20 = Result.flatten<number>(ok(ok(1)));
    expectTypeOf(t_ta_20).toEqualTypeOf<Result<number, never>>();
    const t_ta_21 = Result.match<number, AppError, string, string>(rn, {
      ok: String,
      err: (e) => e.message,
    });
    expectTypeOf(t_ta_21).toEqualTypeOf<string>();
    const t_ta_22 = Result.match<number, AppError, string>(rn, {
      ok: String,
      err: (e) => e.message,
    });
    expectTypeOf(t_ta_22).toEqualTypeOf<string>();
    const t_ta_23 = Result.unwrap<number, AppError>(rn);
    expectTypeOf(t_ta_23).toEqualTypeOf<number>();
    const t_ta_24 = Result.unwrap<number>(okn);
    expectTypeOf(t_ta_24).toEqualTypeOf<number>();
    const t_ta_25 = Result.unwrapErr<number, AppError>(rn);
    expectTypeOf(t_ta_25).toEqualTypeOf<AppError>();
    const t_ta_26 = Result.unwrapErr<number, AppError>(erra);
    expectTypeOf(t_ta_26).toEqualTypeOf<AppError>();
    const t_ta_27 = Result.unwrapOr<number, AppError>(rn, 0);
    expectTypeOf(t_ta_27).toEqualTypeOf<number>();
    const t_ta_28 = Result.unwrapOrElse<number, AppError>(rn, () => 0);
    expectTypeOf(t_ta_28).toEqualTypeOf<number>();
    const t_ta_29 = Result.split<number, AppError>(rn);
    expectTypeOf(t_ta_29).toEqualTypeOf<
      | readonly [failure: ErrResult<AppError>, value: undefined]
      | readonly [failure: undefined, value: number]
    >();
    const t_ta_30 = Result.split<number>(okn);
    expectTypeOf(t_ta_30).toEqualTypeOf<
      | readonly [failure: undefined, value: number]
      | readonly [failure: ErrResult<never>, value: undefined]
    >();
    const t_ta_31 = Result.fromNullable<number, AppError>(
      1,
      () => new AppError()
    );
    expectTypeOf(t_ta_31).toEqualTypeOf<Result<number, AppError>>();
    const t_ta_32 = Result.fromPredicate<number, AppError>(
      1,
      isPositive,
      () => new AppError()
    );
    expectTypeOf(t_ta_32).toEqualTypeOf<Result<number, AppError>>();
    const t_ta_33 = Result.tryCatch<number>(() => 1);
    expectTypeOf(t_ta_33).toEqualTypeOf<Result<number, Error>>();
    const t_ta_34 = Result.tryCatch<number, AppError>(
      () => 1,
      () => new AppError()
    );
    expectTypeOf(t_ta_34).toEqualTypeOf<Result<number, AppError>>();
    const t_ta_35 = Result.tryCatchAsync<number>(async () => 1);
    expectTypeOf(t_ta_35).toEqualTypeOf<Promise<Result<number, Error>>>();
    const t_ta_36 = Result.tryCatchAsync<number, AppError>(
      async () => 1,
      () => new AppError()
    );
    expectTypeOf(t_ta_36).toEqualTypeOf<Promise<Result<number, AppError>>>();
    const t_ta_37 = Result.fromPromise<number>(pn);
    expectTypeOf(t_ta_37).toEqualTypeOf<Promise<Result<number, Error>>>();
    const t_ta_38 = Result.fromPromise<number, AppError>(
      pn,
      () => new AppError()
    );
    expectTypeOf(t_ta_38).toEqualTypeOf<Promise<Result<number, AppError>>>();
    const t_ta_39 = Result.ok<number>(1);
    expectTypeOf(t_ta_39).toEqualTypeOf<OkResult<number>>();
    const t_ta_40 = Result.err<AppError>(new AppError());
    expectTypeOf(t_ta_40).toEqualTypeOf<ErrResult<AppError>>();
    const t_ta_41 = Result.isOk<number, AppError>(rn);
    expectTypeOf<typeof t_ta_41>().toEqualTypeOf<boolean>();
    const t_ta_42 = Result.toMaybe<number, AppError>(rn);
    expectTypeOf(t_ta_42).toEqualTypeOf<Maybe<number>>();
    const t_ta_43 = Result.fromMaybe<number, AppError>(
      mn,
      () => new AppError()
    );
    expectTypeOf(t_ta_43).toEqualTypeOf<Result<number, AppError>>();
    const t_ta_44 = Result.transpose<number, AppError>(rm);
    expectTypeOf(t_ta_44).toEqualTypeOf<Maybe<Result<number, AppError>>>();
    const t_ta_45 = Result.transpose<number>(ok(some(1)));
    expectTypeOf(t_ta_45).toEqualTypeOf<Maybe<Result<number, never>>>();
    const t_ta_46 = Maybe.map<number, string>(mn, String);
    expectTypeOf(t_ta_46).toEqualTypeOf<Maybe<string>>();
    const t_ta_47 = Maybe.flatMap<number, string>(mn, (v) => some(String(v)));
    expectTypeOf(t_ta_47).toEqualTypeOf<Maybe<string>>();
    const t_ta_48 = Maybe.flatten<number>(mm);
    expectTypeOf(t_ta_48).toEqualTypeOf<Maybe<number>>();
    const t_ta_49 = Maybe.filter<number>(mn, isPositive);
    expectTypeOf(t_ta_49).toEqualTypeOf<Maybe<number>>();
    const t_ta_50 = Maybe.inspect<number>(mn, log);
    expectTypeOf(t_ta_50).toEqualTypeOf<Maybe<number>>();
    const t_ta_51 = Maybe.match<number, string, string>(mn, {
      some: String,
      none: () => "",
    });
    expectTypeOf(t_ta_51).toEqualTypeOf<string>();
    const t_ta_52 = Maybe.match<number, string>(mn, {
      some: String,
      none: () => "",
    });
    expectTypeOf(t_ta_52).toEqualTypeOf<string>();
    const t_ta_53 = Maybe.unwrap<number>(mn);
    expectTypeOf(t_ta_53).toEqualTypeOf<number>();
    const t_ta_54 = Maybe.unwrapOr<number>(mn, 0);
    expectTypeOf(t_ta_54).toEqualTypeOf<number>();
    const t_ta_55 = Maybe.unwrapOrElse<number>(mn, () => 0);
    expectTypeOf(t_ta_55).toEqualTypeOf<number>();
    const t_ta_56 = Maybe.fromNullable<number>(1);
    expectTypeOf(t_ta_56).toEqualTypeOf<Maybe<number>>();
    const t_ta_57 = Maybe.fromPredicate<number>(1, isPositive);
    expectTypeOf(t_ta_57).toEqualTypeOf<Maybe<number>>();
    const t_ta_58 = Maybe.toResult<number, AppError>(mn, () => new AppError());
    expectTypeOf(t_ta_58).toEqualTypeOf<Result<number, AppError>>();
    const t_ta_59 = Maybe.fromResult<number, AppError>(rn);
    expectTypeOf(t_ta_59).toEqualTypeOf<Maybe<number>>();
    const t_ta_60 = Maybe.transpose<number, AppError>(mr);
    expectTypeOf(t_ta_60).toEqualTypeOf<Result<Maybe<number>, AppError>>();
    const t_ta_61 = Maybe.transpose<number>(some(ok(1)));
    expectTypeOf(t_ta_61).toEqualTypeOf<Result<Maybe<number>, never>>();
    const t_ta_62 = Maybe.some<number>(1);
    expectTypeOf(t_ta_62).toEqualTypeOf<Some<number>>();
    const t_ta_63 = Maybe.firstSome<number>([mn, mn]);
    expectTypeOf(t_ta_63).toEqualTypeOf<Maybe<number>>();
    const t_ta_64 = Maybe.firstSome<number>(mn, mn);
    expectTypeOf(t_ta_64).toEqualTypeOf<Maybe<number>>();
    // @ts-expect-error
    const t_ta_65 = Result.unwrapErr<number>(erra);
    void t_ta_65;
    const t_ta_66 = Result.split<number>(rNever);
    expectTypeOf(t_ta_66).toEqualTypeOf<
      | readonly [failure: undefined, value: number]
      | readonly [failure: ErrResult<never>, value: undefined]
    >();
    const t_ta_67 = Result.unwrap<number>(rNever);
    expectTypeOf(t_ta_67).toEqualTypeOf<number>();
    // @ts-expect-error
    const t_ta_68 = Result.flatten<number, AppError>(rnn);
    void t_ta_68;
    const t_ta_69 = Result.match<number, AppError, number, number>(rn, {
      ok: (v) => v,
      err: () => 0,
    });
    expectTypeOf(t_ta_69).toEqualTypeOf<number>();
    const t_ta_70 = Result.map<number, Promise<number>, AppError>(
      rn,
      async (v) => v
    );
    expectTypeOf(t_ta_70).toEqualTypeOf<{
      readonly "Result.map does not await. Await the value first, or use Result.tryCatchAsync for async work": never;
    }>();
    // @ts-expect-error
    const t_ta_71 = Result.flatMap<number>(okn, () => err(new DbError()));
    void t_ta_71;
    const t_ta_72 = Maybe.flatMap<number>(mn, () => none());
    expectTypeOf(t_ta_72).toEqualTypeOf<Maybe<never>>();
    const t_ta_73 = Result.isErr<number, AppError>(rn);
    expectTypeOf<typeof t_ta_73>().toEqualTypeOf<boolean>();
    const t_ta_74 = Maybe.isSome<number>(mn);
    expectTypeOf<typeof t_ta_74>().toEqualTypeOf<boolean>();
    const t_ta_75 = Result.tryCatch<Promise<number>>(() => pn);
    expectTypeOf(t_ta_75).toEqualTypeOf<{
      readonly "Result.tryCatch does not await. Use Result.tryCatchAsync for functions that return a Promise": never;
    }>();
  });
  test("rejected by 3.0.0", () => {
    // @ts-expect-error
    const t_tr_1 = Result.map<number>(okn, String);
    void t_tr_1;
    // @ts-expect-error
    const t_tr_2 = Maybe.map<number>(mn, String);
    void t_tr_2;
    // @ts-expect-error
    const t_tr_3 = Result.flatMap<number>(okn, (n) => ok(String(n)));
    void t_tr_3;
    // @ts-expect-error
    const t_tr_4 = Maybe.flatMap<number>(mn, (n) => some(String(n)));
    void t_tr_4;
    // @ts-expect-error
    const t_tr_7 = Result.unwrapErr<number>(erra);
    void t_tr_7;
    // @ts-expect-error
    const t_tr_8 = Result.unwrapOr<number>(rn, 0);
    void t_tr_8;
    // @ts-expect-error
    const t_tr_9 = Result.unwrapOrElse<number>(rn, () => 0);
    void t_tr_9;
    // @ts-expect-error
    const t_tr_10 = Result.orElse<number>(rn, () => ok(1));
    void t_tr_10;
    // @ts-expect-error
    const t_tr_11 = Result.mapError<number, AppError>(rn, toDb);
    void t_tr_11;
    // @ts-expect-error
    const t_tr_12 = Result.inspect<string>(rn, log);
    void t_tr_12;
    // @ts-expect-error
    const t_tr_13 = Result.unwrap<string>(rn);
    void t_tr_13;
    // @ts-expect-error
    const t_tr_14 = Result.unwrapOr<string, AppError>(rn, "x");
    void t_tr_14;
    // @ts-expect-error
    const t_tr_15 = Result.flatten<string>(rnn);
    void t_tr_15;
    // @ts-expect-error
    const t_tr_16 = Result.split<string>(rn);
    void t_tr_16;
    // @ts-expect-error
    const t_tr_17 = Result.transpose<string>(rm);
    void t_tr_17;
    // @ts-expect-error
    const t_tr_18 = Maybe.transpose<string>(mr);
    void t_tr_18;
    // @ts-expect-error
    const t_tr_19 = Maybe.unwrap<string>(mn);
    void t_tr_19;
    // @ts-expect-error
    const t_tr_20 = Maybe.unwrapOr<string>(mn, "x");
    void t_tr_20;
    // @ts-expect-error
    const t_tr_21 = Result.tryCatchAsync<string>(async () => 1);
    void t_tr_21;
    // @ts-expect-error
    const t_tr_22 = Result.fromPromise<string>(pn);
    void t_tr_22;
    // @ts-expect-error
    const t_tr_23 = Result.map<number, string, AppError, Error>(rn, String);
    void t_tr_23;
    // @ts-expect-error
    const t_tr_24 = Result.unwrapErr<number>(rn);
    void t_tr_24;
  });
});

// TypeScript 5.0 rejects an input of type `R extends Result<…>` to map,
// flatMap, match, inspect, unwrap, split and unwrapErr, for 3.0.0 as well.
describe("generic code", () => {
  test("inferred", () => {
    function g_gen_1<R extends Result<number, AppError>>(r: R) {
      return Result.unwrapOr(r, 0);
    }
    expectTypeOf(g_gen_1).toEqualTypeOf<
      <R extends Result<number, AppError>>(r: R) => number
    >();
    function g_gen_2<R extends Result<number, AppError>>(r: R) {
      return Result.map(r, (v) => v + 1);
    }
    expectTypeOf(g_gen_2).toEqualTypeOf<
      <R extends Result<number, AppError>>(r: R) => Result<number, AppError>
    >();
    function g_gen_3<R extends Result<number, AppError>>(r: R) {
      return Result.flatMap(r, (v) => ok(String(v)));
    }
    expectTypeOf(g_gen_3).toEqualTypeOf<
      <R extends Result<number, AppError>>(r: R) => Result<string, AppError>
    >();
    function g_gen_4<R extends Result<number, AppError>>(r: R) {
      return Result.orElse(r, () => ok(0));
    }
    expectTypeOf(g_gen_4).toEqualTypeOf<
      <R extends Result<number, AppError>>(r: R) => Result<number, never>
    >();
    function g_gen_5<R extends Result<number, AppError>>(r: R) {
      return Result.match(r, { ok: (v) => v, err: () => 0 });
    }
    expectTypeOf(g_gen_5).toEqualTypeOf<
      <R extends Result<number, AppError>>(r: R) => number
    >();
    function g_gen_6<R extends Result<number, AppError>>(r: R) {
      return Result.mapError(r, toDb);
    }
    expectTypeOf(g_gen_6).toEqualTypeOf<
      <R extends Result<number, AppError>>(r: R) => Result<number, DbError>
    >();
    function g_gen_7<R extends Result<number, AppError>>(r: R) {
      return Result.inspect(r, log);
    }
    expectTypeOf(g_gen_7).toEqualTypeOf<
      <R extends Result<number, AppError>>(r: R) => Result<number, AppError>
    >();
    function g_gen_8<R extends Result<number, AppError>>(r: R) {
      return Result.inspectError(r, log);
    }
    expectTypeOf(g_gen_8).toEqualTypeOf<
      <R extends Result<number, AppError>>(r: R) => Result<number, AppError>
    >();
    function g_gen_9<R extends Result<number, AppError>>(r: R) {
      return Result.unwrapOrElse(r, () => 0);
    }
    expectTypeOf(g_gen_9).toEqualTypeOf<
      <R extends Result<number, AppError>>(r: R) => number
    >();
    function g_gen_10<R extends Result<number, AppError>>(r: R) {
      return Result.flatMapErr(r, recover);
    }
    expectTypeOf(g_gen_10).toEqualTypeOf<
      <R extends Result<number, AppError>>(r: R) => Result<number, DbError>
    >();
    function g_gen_11<M extends Maybe<number>>(m: M) {
      return Maybe.map(m, (v) => v + 1);
    }
    expectTypeOf(g_gen_11).toEqualTypeOf<
      <M extends Maybe<number>>(m: M) => Maybe<number>
    >();
    function g_gen_12<M extends Maybe<number>>(m: M) {
      return Maybe.flatMap(m, (v) => some(String(v)));
    }
    expectTypeOf(g_gen_12).toEqualTypeOf<
      <M extends Maybe<number>>(m: M) => Maybe<string>
    >();
    function g_gen_13<M extends Maybe<number>>(m: M) {
      return Maybe.unwrapOr(m, 0);
    }
    expectTypeOf(g_gen_13).toEqualTypeOf<
      <M extends Maybe<number>>(m: M) => number
    >();
    function g_gen_14<M extends Maybe<number>>(m: M) {
      return Maybe.match(m, { some: (v) => v, none: () => 0 });
    }
    expectTypeOf(g_gen_14).toEqualTypeOf<
      <M extends Maybe<number>>(m: M) => number
    >();
    function g_gen_15<M extends Maybe<number>>(m: M) {
      return Maybe.inspect(m, log);
    }
    expectTypeOf(g_gen_15).toEqualTypeOf<
      <M extends Maybe<number>>(m: M) => Maybe<number>
    >();
    function g_gen_16<F extends (v: number) => Result<string, DbError>>(f: F) {
      return Result.flatMap(rn, f);
    }
    expectTypeOf(g_gen_16).toEqualTypeOf<
      <F extends (v: number) => Result<string, DbError>>(
        f: F
      ) => Result<string, AppError | DbError>
    >();
    function g_gen_17<F extends (v: number) => string>(f: F) {
      return Result.map(rn, f);
    }
    expectTypeOf(g_gen_17).toEqualTypeOf<
      <F extends (v: number) => string>(f: F) => Result<string, AppError>
    >();
    function g_gen_18<F extends (e: AppError) => Result<number, DbError>>(
      f: F
    ) {
      return Result.orElse(rn, f);
    }
    expectTypeOf(g_gen_18).toEqualTypeOf<
      <F extends (e: AppError) => Result<number, DbError>>(
        f: F
      ) => Result<number, DbError>
    >();
    function g_gen_19<U>(f: (v: number) => U) {
      return Result.map(rn, f);
    }
    expectTypeOf(g_gen_19).toEqualTypeOf<
      <U>(f: (v: number) => U) => Result<U, AppError>
    >();
    function g_gen_20<U, F extends Error>(f: (v: number) => Result<U, F>) {
      return Result.flatMap(rn, f);
    }
    expectTypeOf(g_gen_20).toEqualTypeOf<
      <U, F extends Error>(
        f: (v: number) => Result<U, F>
      ) => Result<U, AppError | F>
    >();
    function g_gen_22<T>(fn: () => T) {
      return Result.tryCatch(fn);
    }
    expectTypeOf(g_gen_22).toEqualTypeOf<
      <T>(fn: () => T) => Result<T, Error>
    >();
    function g_gen_23<T>(fn: () => Promise<T>) {
      return Result.tryCatchAsync(fn);
    }
    expectTypeOf(g_gen_23).toEqualTypeOf<
      <T>(fn: () => Promise<T>) => Promise<Result<T, Error>>
    >();
    function g_gen_24<T>(p: Promise<T>) {
      return Result.fromPromise(p);
    }
    expectTypeOf(g_gen_24).toEqualTypeOf<
      <T>(p: Promise<T>) => Promise<Result<T, Error>>
    >();
    function g_gen_25<T, E extends Error>(r: Result<T, E>, d: T) {
      return Result.unwrapOr(r, d);
    }
    expectTypeOf(g_gen_25).toEqualTypeOf<
      <T, E extends Error>(r: Result<T, E>, d: T) => T
    >();
    function g_gen_26<T>(m: Maybe<T>, d: T) {
      return Maybe.unwrapOr(m, d);
    }
    expectTypeOf(g_gen_26).toEqualTypeOf<<T>(m: Maybe<T>, d: T) => T>();
    function g_gen_27<T, E extends Error>(r: Result<T, E>) {
      return Result.match(r, { ok: (v) => [v], err: (e) => e });
    }
    expectTypeOf(g_gen_27).toEqualTypeOf<
      <T, E extends Error>(r: Result<T, E>) => E | T[]
    >();
    function g_gen_28<R extends OkResult<string>>(r: R) {
      return Result.map(r, (s) => s.length);
    }
    expectTypeOf(g_gen_28).toEqualTypeOf<
      <R extends OkResult<string>>(r: R) => OkResult<number>
    >();
    function g_gen_29<R extends ErrResult<AppError>>(r: R) {
      return Result.mapError(r, toDb);
    }
    expectTypeOf(g_gen_29).toEqualTypeOf<
      <R extends ErrResult<AppError>>(r: R) => ErrResult<DbError>
    >();
    function g_gen_30<T>(fn: () => T, onError: (e: unknown) => AppError) {
      return Result.tryCatch(fn, onError);
    }
    expectTypeOf(g_gen_30).toEqualTypeOf<
      <T>(fn: () => T, onError: (e: unknown) => AppError) => Result<T, AppError>
    >();
    function g_gen_32<T>(p: PromiseLike<T>) {
      return Result.fromPromise(p, () => new AppError());
    }
    expectTypeOf(g_gen_32).toEqualTypeOf<
      <T>(p: PromiseLike<T>) => Promise<Result<T, AppError>>
    >();
    function g_gen_33<R extends Result<number, AppError>>(r: R) {
      return Result.unwrap(r);
    }
    expectTypeOf(g_gen_33).toEqualTypeOf<
      <R extends Result<number, AppError>>(r: R) => number
    >();
    function g_gen_34<R extends Result<number, AppError>>(r: R) {
      return Result.split(r);
    }
    expectTypeOf(g_gen_34).toEqualTypeOf<
      <R extends Result<number, AppError>>(r: R) => Split<number, AppError>
    >();
    function g_gen_35<M extends Maybe<number>>(m: M) {
      return Maybe.filter(m, isPositive);
    }
    expectTypeOf(g_gen_35).toEqualTypeOf<
      <M extends Maybe<number>>(m: M) => Maybe<number>
    >();
    function g_gen_36<M extends Maybe<string>>(m: M) {
      return Maybe.unwrapOrElse(m, () => "");
    }
    expectTypeOf(g_gen_36).toEqualTypeOf<
      <M extends Maybe<string>>(m: M) => string
    >();
    function g_gen_37<U>(f: (v: number) => U) {
      return Maybe.map(mn, f);
    }
    expectTypeOf(g_gen_37).toEqualTypeOf<
      <U>(f: (v: number) => U) => Maybe<U>
    >();
    function g_gen_38<U>(f: (v: number) => Maybe<U>) {
      return Maybe.flatMap(mn, f);
    }
    expectTypeOf(g_gen_38).toEqualTypeOf<
      <U>(f: (v: number) => Maybe<U>) => Maybe<U>
    >();
    function g_gen_39<A, B>(h: {
      ok: (v: number) => A;
      err: (e: AppError) => B;
    }) {
      return Result.match(rn, h);
    }
    expectTypeOf(g_gen_39).toEqualTypeOf<
      <A, B>(h: { ok: (v: number) => A; err: (e: AppError) => B }) => A | B
    >();
    function g_gen_40<E extends Error>(
      r: Result<number, E>,
      f: (e: E) => Result<number, DbError>
    ) {
      return Result.orElse(r, f);
    }
    expectTypeOf(g_gen_40).toEqualTypeOf<
      <E extends Error>(
        r: Result<number, E>,
        f: (e: E) => Result<number, DbError>
      ) => Result<number, DbError>
    >();
  });
});

describe("generic code that calls a function with one signature", () => {
  test("inferred", () => {
    function g_one_1<T>(r: OkResult<T>) {
      return Result.unwrap(r);
    }
    expectTypeOf(g_one_1).toEqualTypeOf<<T>(r: OkResult<T>) => T>();
    function g_one_2<T>(r: Result<T, never>) {
      return Result.unwrap(r);
    }
    expectTypeOf(g_one_2).toEqualTypeOf<<T>(r: Result<T, never>) => T>();
    function g_one_3<T>(r: OkResult<T>): T {
      return Result.unwrap(r);
    }
    expectTypeOf(g_one_3).toEqualTypeOf<<T>(r: OkResult<T>) => T>();
    function g_one_4<E extends Error>(r: ErrResult<E>) {
      return Result.unwrapErr(r);
    }
    expectTypeOf(g_one_4).toEqualTypeOf<
      <E extends Error>(r: ErrResult<E>) => E
    >();
    function g_one_5<T>(r: OkResult<T>) {
      return Result.unwrapErr(r);
    }
    expectTypeOf(g_one_5).toEqualTypeOf<<T>(r: OkResult<T>) => never>();
    function g_one_6<T>(r: OkResult<T>) {
      return Result.split(r);
    }
    expectTypeOf(g_one_6).toEqualTypeOf<
      <T>(r: OkResult<T>) => Split<T, never>
    >();
    function g_one_7<T>(r: OkResult<OkResult<T>>) {
      return Result.flatten(r);
    }
    expectTypeOf(g_one_7).toEqualTypeOf<
      <T>(r: OkResult<OkResult<T>>) => Result<T, never>
    >();
    function g_one_8<T>(r: Result<Maybe<T>, Error>) {
      return Result.transpose(r);
    }
    expectTypeOf(g_one_8).toEqualTypeOf<
      <T>(r: Result<Maybe<T>, Error>) => Maybe<Result<T, Error>>
    >();
    function g_one_9<T>(m: Maybe<Result<T, Error>>) {
      return Maybe.transpose(m);
    }
    expectTypeOf(g_one_9).toEqualTypeOf<
      <T>(m: Maybe<Result<T, Error>>) => Result<Maybe<T>, Error>
    >();
    function g_one_10<T>(m: Maybe<T>) {
      return Maybe.unwrap(m);
    }
    expectTypeOf(g_one_10).toEqualTypeOf<<T>(m: Maybe<T>) => T>();
    function g_one_11<R extends OkResult<unknown>>(r: R) {
      return Result.unwrap(r);
    }
    expectTypeOf(g_one_11).toEqualTypeOf<
      <R extends OkResult<unknown>>(r: R) => unknown
    >();
    function g_one_12<T extends string>(r: OkResult<T>) {
      return Result.unwrap(r);
    }
    expectTypeOf(g_one_12).toEqualTypeOf<
      <T extends string>(r: OkResult<T>) => T
    >();
    function g_one_13<T, E extends Error>(r: Result<T, E>) {
      return Result.unwrapErr(r);
    }
    expectTypeOf(g_one_13).toEqualTypeOf<
      <T, E extends Error>(r: Result<T, E>) => E
    >();
    function g_one_14<T, E extends Error>(r: Result<T, E>) {
      return Result.split(r);
    }
    expectTypeOf(g_one_14).toEqualTypeOf<
      <T, E extends Error>(r: Result<T, E>) => Split<T, E>
    >();
    function g_one_15<T, E extends Error>(r: Result<Result<T, E>, E>) {
      return Result.flatten(r);
    }
    expectTypeOf(g_one_15).toEqualTypeOf<
      <T, E extends Error>(r: Result<Result<T, E>, E>) => Result<T, E>
    >();
    function g_one_16<T>(r: OkResult<T>) {
      return Result.split<T>(r);
    }
    expectTypeOf(g_one_16).toEqualTypeOf<
      <T>(r: OkResult<T>) => Split<T, never>
    >();
    function g_one_17<T>(r: Result<T, never>): T {
      return Result.unwrap<T>(r);
    }
    expectTypeOf(g_one_17).toEqualTypeOf<<T>(r: Result<T, never>) => T>();
    function g_one_18<T>(m: Some<T>): T {
      return Maybe.unwrap(m);
    }
    expectTypeOf(g_one_18).toEqualTypeOf<<T>(m: Some<T>) => T>();
    function g_one_19<T>(r: OkResult<Result<T, AppError>>) {
      return Result.flatten(r);
    }
    expectTypeOf(g_one_19).toEqualTypeOf<
      <T>(r: OkResult<Result<T, AppError>>) => Result<T, AppError>
    >();
    function g_one_20<T>(m: Some<OkResult<T>>) {
      return Maybe.transpose(m);
    }
    expectTypeOf(g_one_20).toEqualTypeOf<
      <T>(m: Some<OkResult<T>>) => Result<Maybe<T>, never>
    >();
    function g_one_21<T>(r: OkResult<Some<T>>) {
      return Result.transpose(r);
    }
    expectTypeOf(g_one_21).toEqualTypeOf<
      <T>(r: OkResult<Some<T>>) => Maybe<Result<T, never>>
    >();
    function g_one_22<T>(list: OkResult<T>[]) {
      return list.map(Result.unwrap);
    }
    expectTypeOf(g_one_22).toEqualTypeOf<<T>(list: OkResult<T>[]) => T[]>();
    function g_one_23<T>(list: Maybe<T>[]) {
      return list.map(Maybe.unwrap);
    }
    expectTypeOf(g_one_23).toEqualTypeOf<<T>(list: Maybe<T>[]) => T[]>();
    function g_one_24<T, E extends Error>(r: Result<T, E>) {
      return Result.unwrap<T, E>(r);
    }
    expectTypeOf(g_one_24).toEqualTypeOf<
      <T, E extends Error>(r: Result<T, E>) => T
    >();
    function g_one_25<E extends Error>(r: Result<never, E>) {
      return Result.unwrap(r);
    }
    expectTypeOf(g_one_25).toEqualTypeOf<
      <E extends Error>(r: Result<never, E>) => never
    >();
    // TypeScript 5.0 rejects this call, see "generic code".
    function g_one_26<R extends Result<string, AppError>>(r: R) {
      return Result.unwrapErr(r);
    }
    expectTypeOf(g_one_26).toEqualTypeOf<
      <R extends Result<string, AppError>>(r: R) => AppError
    >();
    function g_one_27<M extends Maybe<number>>(m: M) {
      return Maybe.unwrap(m);
    }
    expectTypeOf(g_one_27).toEqualTypeOf<
      <M extends Maybe<number>>(m: M) => number
    >();
  });

  test("values", () => {
    const t_one_1 = Maybe.unwrap(nn);
    expectTypeOf(t_one_1).toEqualTypeOf<never>();
    const t_one_2 = Maybe.unwrap(none());
    expectTypeOf(t_one_2).toEqualTypeOf<never>();
    const t_one_3 = Result.unwrapErr(ok(1 as unknown));
    expectTypeOf(t_one_3).toEqualTypeOf<never>();
    const t_one_4 = Result.unwrap(ok(1 as unknown));
    expectTypeOf(t_one_4).toEqualTypeOf<unknown>();
    const t_one_5 = Result.split(err(new AppError()));
    expectTypeOf(t_one_5).toEqualTypeOf<
      | readonly [failure: ErrResult<AppError>, value: undefined]
      | readonly [failure: undefined, value: never]
    >();
    const t_one_6 = Result.flatten(ok(err(new AppError())));
    expectTypeOf(t_one_6).toEqualTypeOf<Result<unknown, AppError>>();
    const t_one_7 = Maybe.transpose(none());
    expectTypeOf(t_one_7).toEqualTypeOf<Result<Maybe<unknown>, never>>();
    const t_one_8 = Result.transpose(err(new AppError()));
    expectTypeOf(t_one_8).toEqualTypeOf<Maybe<Result<unknown, AppError>>>();
    const t_one_9 = Result.unwrap(erra);
    expectTypeOf(t_one_9).toEqualTypeOf<never>();
    const t_one_10 = Result.unwrapErr(okn);
    expectTypeOf(t_one_10).toEqualTypeOf<never>();
    const t_one_11 = Maybe.unwrap(somen);
    expectTypeOf(t_one_11).toEqualTypeOf<number>();
    const t_one_12 = Maybe.unwrap(mm);
    expectTypeOf(t_one_12).toEqualTypeOf<Maybe<number>>();
    // @ts-expect-error
    const t_one_13 = Result.unwrap(rUnion);
    void t_one_13;
    // @ts-expect-error
    const t_one_14 = Result.unwrapErr(rUnion);
    void t_one_14;
    // @ts-expect-error
    const t_one_15 = Result.split(rUnion);
    void t_one_15;
    const t_one_16 = Maybe.unwrap<Status>(ms);
    expectTypeOf<typeof t_one_16>().toEqualTypeOf<Status>();
    const t_one_17 = Result.unwrapErr<number, AppError>(rn);
    expectTypeOf(t_one_17).toEqualTypeOf<AppError>();
    const t_one_18 = Result.flatten<number, AppError, DbError>(rnn);
    expectTypeOf(t_one_18).toEqualTypeOf<Result<number, AppError | DbError>>();
  });
});

describe("a never input", () => {
  test("inferred", () => {
    const t_nv_1 = Result.map(neverValue, (v) => v);
    expectTypeOf(t_nv_1).toEqualTypeOf<OkResult<unknown>>();
    const t_nv_2 = Result.unwrapOr(neverValue, 1);
    expectTypeOf<typeof t_nv_2>().toEqualTypeOf<1>();
    const t_nv_3 = Result.flatMap(neverValue, () => ok(1));
    expectTypeOf(t_nv_3).toEqualTypeOf<Result<number, never>>();
    const t_nv_4 = Result.orElse(neverValue, () => ok(1));
    expectTypeOf(t_nv_4).toEqualTypeOf<Result<number, never>>();
    const t_nv_5 = Result.match(neverValue, { ok: () => 1, err: () => 2 });
    expectTypeOf(t_nv_5).toEqualTypeOf<number>();
    const t_nv_6 = Result.mapError(neverValue, () => new DbError());
    expectTypeOf(t_nv_6).toEqualTypeOf<OkResult<unknown>>();
    const t_nv_7 = Result.inspect(neverValue, log);
    expectTypeOf(t_nv_7).toEqualTypeOf<OkResult<unknown>>();
    const t_nv_8 = Maybe.map(neverValue, (v) => v);
    expectTypeOf(t_nv_8).toEqualTypeOf<Some<unknown>>();
    const t_nv_9 = Maybe.unwrapOr(neverValue, 1);
    expectTypeOf<typeof t_nv_9>().toEqualTypeOf<1>();
    const t_nv_11 = Result.flatMap(rn, fail);
    expectTypeOf(t_nv_11).toEqualTypeOf<Result<never, AppError>>();
    const t_nv_12 = Result.orElse(rn, fail);
    expectTypeOf(t_nv_12).toEqualTypeOf<Result<number, never>>();
    const t_nv_13 = Maybe.flatMap(mn, fail);
    expectTypeOf(t_nv_13).toEqualTypeOf<Maybe<never>>();
    const t_nv_14 = Result.map(rn, fail);
    expectTypeOf(t_nv_14).toEqualTypeOf<Result<never, AppError>>();
    const t_nv_15 = Result.tryCatch(() => fail(0));
    expectTypeOf(t_nv_15).toEqualTypeOf<Result<never, Error>>();
    const t_nv_16 = Result.tryCatchAsync(async () => fail(0));
    expectTypeOf(t_nv_16).toEqualTypeOf<Promise<Result<never, Error>>>();
    const t_nv_17 = Result.fromPromise(Promise.reject(new Error()));
    expectTypeOf(t_nv_17).toEqualTypeOf<Promise<Result<never, Error>>>();
    const t_nv_18 = Result.mapError(rn, fail);
    expectTypeOf(t_nv_18).toEqualTypeOf<Result<number, never>>();
    const t_nv_19 = Result.unwrapOrElse(rn, fail);
    expectTypeOf(t_nv_19).toEqualTypeOf<number>();
    const t_nv_20 = Result.match(rn, { ok: fail, err: fail });
    expectTypeOf(t_nv_20).toEqualTypeOf<never>();
    const t_nv_21 = Result.unwrap(neverValue);
    expectTypeOf(t_nv_21).toEqualTypeOf<never>();
    const t_nv_22 = Result.unwrapErr(neverValue);
    expectTypeOf(t_nv_22).toEqualTypeOf<never>();
    const t_nv_23 = Result.split(neverValue);
    expectTypeOf(t_nv_23).toEqualTypeOf<
      | readonly [failure: ErrResult<never>, value: undefined]
      | readonly [failure: undefined, value: never]
    >();
    const t_nv_24 = Result.flatten(neverValue);
    expectTypeOf(t_nv_24).toEqualTypeOf<Result<unknown, never>>();
    const t_nv_25 = Result.transpose(neverValue);
    expectTypeOf(t_nv_25).toEqualTypeOf<Maybe<Result<unknown, never>>>();
    const t_nv_26 = Maybe.unwrap(neverValue);
    expectTypeOf(t_nv_26).toEqualTypeOf<never>();
    const t_nv_27 = Maybe.transpose(neverValue);
    expectTypeOf(t_nv_27).toEqualTypeOf<Result<Maybe<unknown>, never>>();
  });
});

describe("typed misuse is rejected", () => {
  test("rejected", () => {
    // @ts-expect-error
    const t_bad_1 = Result.unwrapOr(rn, "x");
    void t_bad_1;
    // @ts-expect-error
    const t_bad_2 = Result.unwrapOrElse(rn, () => "x");
    void t_bad_2;
    // @ts-expect-error
    const t_bad_3 = Result.map(rn, (v: string) => v);
    void t_bad_3;
    // @ts-expect-error
    const t_bad_4 = Result.flatMap(rn, (v) => v + 1);
    void t_bad_4;
    // @ts-expect-error
    const t_bad_5 = Result.orElse(rn, () => ok("x"));
    void t_bad_5;
    // @ts-expect-error
    const t_bad_6 = Result.orElse(rn, () => 0);
    void t_bad_6;
    // @ts-expect-error
    const t_bad_7 = Result.flatMapErr(rn, () => ok("x"));
    void t_bad_7;
    // @ts-expect-error
    const t_bad_8 = Result.mapError(rn, () => "not an error");
    void t_bad_8;
    // @ts-expect-error
    const t_bad_9 = Result.inspect(rn, (v: string) => v);
    void t_bad_9;
    // @ts-expect-error
    const t_bad_10 = Result.inspectError(rn, (e: DbError) => e);
    void t_bad_10;
    // @ts-expect-error
    const t_bad_11 = Result.match(rn, { ok: (v: string) => v, err: () => "" });
    void t_bad_11;
    // @ts-expect-error
    const t_bad_12 = Result.match(rn, { ok: (v) => v });
    void t_bad_12;
    // @ts-expect-error
    const t_bad_13 = Result.unwrapOr(rn, 1, 2);
    void t_bad_13;
    // @ts-expect-error
    const t_bad_14 = Result.map(rn);
    void t_bad_14;
    // @ts-expect-error
    const t_bad_15 = Result.map(1, (v) => v);
    void t_bad_15;
    // @ts-expect-error
    const t_bad_16 = Result.unwrapOr({ ok: true }, 0);
    void t_bad_16;
    // @ts-expect-error
    const t_bad_17 = Result.tryCatch(() => 1, notAnError);
    void t_bad_17;
    // @ts-expect-error
    const t_bad_18 = Result.tryCatchAsync(() => 1);
    void t_bad_18;
    // @ts-expect-error
    const t_bad_19 = Result.fromPromise(1);
    void t_bad_19;
    // @ts-expect-error
    const t_bad_20 = Result.all([1, 2]);
    void t_bad_20;
    // @ts-expect-error
    const t_bad_21 = Maybe.unwrapOr(mn, "x");
    void t_bad_21;
    // @ts-expect-error
    const t_bad_22 = Maybe.unwrapOrElse(mn, () => "x");
    void t_bad_22;
    // @ts-expect-error
    const t_bad_23 = Maybe.map(mn, (v: string) => v);
    void t_bad_23;
    // @ts-expect-error
    const t_bad_24 = Maybe.flatMap(mn, (v) => v + 1);
    void t_bad_24;
    // @ts-expect-error
    const t_bad_25 = Maybe.match(mn, {
      some: (v: string) => v,
      none: () => "",
    });
    void t_bad_25;
    // @ts-expect-error
    const t_bad_26 = Maybe.inspect(mn, (v: string) => v);
    void t_bad_26;
    // @ts-expect-error
    const t_bad_27 = Maybe.filter(mn, (v: string) => v.length > 0);
    void t_bad_27;
    // @ts-expect-error
    const t_bad_28 = Result.unwrap(mn);
    void t_bad_28;
    // @ts-expect-error
    const t_bad_29 = Maybe.unwrap(rn);
    void t_bad_29;
    // @ts-expect-error
    const t_bad_30 = Result.err("not an error");
    void t_bad_30;
    // @ts-expect-error
    const t_bad_31 = Result.flatMap(rn, () => some(1));
    void t_bad_31;
    // @ts-expect-error
    const t_bad_32 = Maybe.flatMap(mn, () => ok(1));
    void t_bad_32;
    // @ts-expect-error
    const t_bad_33 = Result.orElse(rn, (e: DbError) => ok(e.code.length));
    void t_bad_33;
    const t_bad_34 = Result.unwrapOr(rStatus, "pending");
    expectTypeOf<typeof t_bad_34>().toEqualTypeOf<Status | "pending">();
    // @ts-expect-error
    const t_bad_35 = Result.flatMap(rn, (v) => (v ? ok(1) : 0));
    void t_bad_35;
    const t_bad_36 = Result.unwrapOrElse(rStatus, () => "pending");
    expectTypeOf(t_bad_36).toEqualTypeOf<string>();
    const t_bad_37 = Maybe.unwrapOr(ms, "pending");
    expectTypeOf<typeof t_bad_37>().toEqualTypeOf<Status | "pending">();
    // @ts-expect-error
    const t_bad_38 = Result.map(rn, (v) => v, 1);
    void t_bad_38;
    // @ts-expect-error
    const t_bad_39 = Result.match(rn, { ok: (v) => v, err: (e: DbError) => e });
    void t_bad_39;
    // @ts-expect-error
    const t_bad_40 = Result.fromNullable(1, () => "e");
    void t_bad_40;
    // @ts-expect-error
    const t_bad_41 = Result.toMaybe(mn);
    void t_bad_41;
    // @ts-expect-error
    const t_bad_42 = Maybe.toResult(rn, () => new AppError());
    void t_bad_42;
    // @ts-expect-error
    const t_bad_43 = Result.flatten(rn);
    void t_bad_43;
    // @ts-expect-error
    const t_bad_44 = Maybe.flatten(mn);
    void t_bad_44;
    // @ts-expect-error
    const t_bad_45 = Result.transpose(rn);
    void t_bad_45;
    // @ts-expect-error
    const t_bad_46 = Result.collect(1, 2);
    void t_bad_46;
    // @ts-expect-error
    const t_bad_47 = Maybe.all(1, 2);
    void t_bad_47;
    // @ts-expect-error
    const t_bad_48 = Result.inspect(rn);
    void t_bad_48;
  });
  test("declared", () => {
    // @ts-expect-error
    const a_bad_1: Result<string, AppError> = Result.map(rn, (v) => v);
    // @ts-expect-error
    const a_bad_2: Status = Result.unwrapOr(rn, 0);
    // @ts-expect-error
    const a_bad_3: Result<number, never> = Result.orElse(rn, () =>
      err(new DbError())
    );
    // @ts-expect-error
    const a_bad_4: Maybe<string> = Maybe.map(mn, (v) => v);
    // @ts-expect-error
    const a_bad_5: Status = Result.match(rn, {
      ok: () => "x",
      err: () => "active",
    });
    // @ts-expect-error
    const a_bad_6: OkResult<number> = Result.map(rn, (v) => v);
    // @ts-expect-error
    const a_bad_7: Status = Result.unwrapOr(Result.ok("pending"), "inactive");
    // @ts-expect-error
    const a_bad_8: Result<number, AppError> = Result.tryCatch(async () => 1);
    void [
      a_bad_1,
      a_bad_2,
      a_bad_3,
      a_bad_4,
      a_bad_5,
      a_bad_6,
      a_bad_7,
      a_bad_8,
    ];
  });
});

describe("point-free", () => {
  test("inferred", () => {
    const t_pf2_1 = results.map(Result.isOk);
    expectTypeOf(t_pf2_1).toEqualTypeOf<boolean[]>();
    const t_pf2_2 = results.map(Result.unwrapErr);
    expectTypeOf(t_pf2_2).toEqualTypeOf<AppError[]>();
    const t_pf2_3 = [1, 2].map(Result.ok);
    expectTypeOf(t_pf2_3).toEqualTypeOf<OkResult<unknown>[]>();
    const t_pf2_4 = [new AppError()].map(Result.err);
    expectTypeOf(t_pf2_4).toEqualTypeOf<ErrResult<AppError>[]>();
    const t_pf2_5 = [1, 2].map(Maybe.some);
    expectTypeOf(t_pf2_5).toEqualTypeOf<Some<number>[]>();
    const t_pf2_6 = [pn].map(Result.fromPromise);
    expectTypeOf(t_pf2_6).toEqualTypeOf<Promise<Result<unknown, Error>>[]>();
    const t_pf2_7 = [() => 1].map(Result.tryCatch);
    expectTypeOf(t_pf2_7).toEqualTypeOf<Result<unknown, Error>[]>();
    const t_pf2_8 = [readPort].map(Result.tryCatchAsync);
    expectTypeOf(t_pf2_8).toEqualTypeOf<Promise<Result<unknown, Error>>[]>();
    const t_pf2_9 = [results].map(Result.all);
    expectTypeOf(t_pf2_9).toEqualTypeOf<Result<readonly unknown[], Error>[]>();
    const t_pf2_10 = [results].map(Result.collect);
    expectTypeOf(t_pf2_10).toEqualTypeOf<
      Result<readonly unknown[], AggregateErrorOf<Error>>[]
    >();
    const t_pf2_11 = [maybes].map(Maybe.all);
    expectTypeOf(t_pf2_11).toEqualTypeOf<Maybe<readonly unknown[]>[]>();
    const t_pf2_12 = [maybes].map(Maybe.firstSome);
    expectTypeOf(t_pf2_12).toEqualTypeOf<Maybe<unknown>[]>();
    const t_pf2_13 = maybes.map(Maybe.isSome);
    expectTypeOf(t_pf2_13).toEqualTypeOf<boolean[]>();
    const t_pf2_14 = maybes.filter(Maybe.isSome);
    expectTypeOf(t_pf2_14).toEqualTypeOf<Some<number>[]>();
    // @ts-expect-error
    const t_pf2_15 = maybes.map(Maybe.fromResult);
    void t_pf2_15;
    const t_pf2_16 = [1, null].map(Maybe.fromNullable);
    expectTypeOf(t_pf2_16).toEqualTypeOf<Maybe<number>[]>();
    const t_pf2_17 = [mm].map(Maybe.flatten);
    expectTypeOf(t_pf2_17).toEqualTypeOf<Maybe<number>[]>();
    const t_pf2_18 = results.map(Maybe.fromResult);
    expectTypeOf(t_pf2_18).toEqualTypeOf<Maybe<number>[]>();
    const t_pf2_19 = [unknownValue].map(Result.isResult);
    expectTypeOf(t_pf2_19).toEqualTypeOf<boolean[]>();
    const t_pf2_20 = [unknownValue].map(Result.normalizeError);
    expectTypeOf(t_pf2_20).toEqualTypeOf<Error[]>();
    const t_pf2_21 = prn.then(Result.split);
    expectTypeOf(t_pf2_21).toEqualTypeOf<
      Promise<
        | readonly [failure: ErrResult<AppError>, value: undefined]
        | readonly [failure: undefined, value: number]
      >
    >();
    const t_pf2_22 = prn.then(Result.toMaybe);
    expectTypeOf(t_pf2_22).toEqualTypeOf<Promise<None | Some<number>>>();
    const t_pf2_23 = pmn.then(Maybe.unwrap);
    expectTypeOf(t_pf2_23).toEqualTypeOf<Promise<number>>();
    // @ts-expect-error
    const t_pf2_24 = results.flatMap(Result.split);
    void t_pf2_24;
    const t_pf2_25 = Promise.all([prn, prs]).then(Result.all);
    expectTypeOf(t_pf2_25).toEqualTypeOf<
      Promise<ErrResult<Error> | OkResult<readonly unknown[]>>
    >();
    const t_pf2_26 = Promise.all([prn, prs]).then(Result.collect);
    expectTypeOf(t_pf2_26).toEqualTypeOf<
      Promise<OkResult<readonly unknown[]> | ErrResult<AggregateErrorOf<Error>>>
    >();
    const t_pf2_27 = results.map(Result.unwrap).map(String);
    expectTypeOf(t_pf2_27).toEqualTypeOf<string[]>();
    const t_pf2_28 = [rm].map(Result.transpose).map(Maybe.unwrap);
    expectTypeOf(t_pf2_28).toEqualTypeOf<Result<number, AppError>[]>();
  });
});

describe("types read from the functions", () => {
  test("ReturnType and Parameters", () => {
    const t_tl_1 = null as unknown as ReturnType<typeof Result.ok>;
    expectTypeOf(t_tl_1).toEqualTypeOf<OkResult<unknown>>();
    const t_tl_2 = null as unknown as Parameters<typeof Result.ok>;
    expectTypeOf(t_tl_2).toEqualTypeOf<[value: unknown]>();
    const t_tl_3 = null as unknown as ReturnType<typeof Result.err>;
    expectTypeOf(t_tl_3).toEqualTypeOf<ErrResult<Error>>();
    const t_tl_4 = null as unknown as Parameters<typeof Result.err>;
    expectTypeOf(t_tl_4).toEqualTypeOf<[error: Error]>();
    const t_tl_5 = null as unknown as ReturnType<typeof Result.isResult>;
    expectTypeOf<typeof t_tl_5>().toEqualTypeOf<boolean>();
    const t_tl_6 = null as unknown as Parameters<typeof Result.isResult>;
    expectTypeOf(t_tl_6).toEqualTypeOf<[value: unknown]>();
    const t_tl_7 = null as unknown as ReturnType<typeof Result.isOk>;
    expectTypeOf<typeof t_tl_7>().toEqualTypeOf<boolean>();
    const t_tl_8 = null as unknown as Parameters<typeof Result.isOk>;
    expectTypeOf(t_tl_8).toEqualTypeOf<[result: Result<unknown, Error>]>();
    const t_tl_9 = null as unknown as ReturnType<typeof Result.isErr>;
    expectTypeOf<typeof t_tl_9>().toEqualTypeOf<boolean>();
    const t_tl_10 = null as unknown as Parameters<typeof Result.isErr>;
    expectTypeOf(t_tl_10).toEqualTypeOf<[result: Result<unknown, Error>]>();
    const t_tl_11 = null as unknown as ReturnType<typeof Result.mapError>;
    expectTypeOf(t_tl_11).toEqualTypeOf<Result<unknown, Error>>();
    const t_tl_12 = null as unknown as ReturnType<typeof Result.inspect>;
    expectTypeOf(t_tl_12).toEqualTypeOf<Result<unknown, Error>>();
    const t_tl_13 = null as unknown as ReturnType<typeof Result.inspectError>;
    expectTypeOf(t_tl_13).toEqualTypeOf<Result<unknown, Error>>();
    const t_tl_14 = null as unknown as ReturnType<typeof Result.flatMap>;
    expectTypeOf(t_tl_14).toEqualTypeOf<Result<unknown, Error>>();
    const t_tl_15 = null as unknown as ReturnType<typeof Result.flatMapErr>;
    expectTypeOf(t_tl_15).toEqualTypeOf<Result<unknown, Error>>();
    const t_tl_16 = null as unknown as ReturnType<typeof Result.orElse>;
    expectTypeOf(t_tl_16).toEqualTypeOf<Result<unknown, Error>>();
    const t_tl_17 = null as unknown as ReturnType<typeof Result.flatten>;
    expectTypeOf(t_tl_17).toEqualTypeOf<Result<unknown, Error>>();
    const t_tl_18 = null as unknown as ReturnType<typeof Result.match>;
    expectTypeOf(t_tl_18).toEqualTypeOf<unknown>();
    const t_tl_19 = null as unknown as ReturnType<typeof Result.exhaustive>;
    // biome-ignore lint/suspicious/noExplicitAny: the 3.0.0 type
    expectTypeOf(t_tl_19).toEqualTypeOf<any>();
    const t_tl_20 = null as unknown as Parameters<typeof Result.exhaustive>;
    expectTypeOf(t_tl_20).toEqualTypeOf<[value: never]>();
    const t_tl_21 = null as unknown as ReturnType<typeof Result.unwrap>;
    expectTypeOf(t_tl_21).toEqualTypeOf<unknown>();
    const t_tl_22 = null as unknown as ReturnType<typeof Result.unwrapErr>;
    expectTypeOf(t_tl_22).toEqualTypeOf<Error>();
    const t_tl_23 = null as unknown as ReturnType<typeof Result.unwrapOr>;
    expectTypeOf(t_tl_23).toEqualTypeOf<unknown>();
    const t_tl_24 = null as unknown as ReturnType<typeof Result.unwrapOrElse>;
    expectTypeOf(t_tl_24).toEqualTypeOf<unknown>();
    const t_tl_25 = null as unknown as Parameters<typeof Result.unwrapOrElse>;
    expectTypeOf(t_tl_25).toEqualTypeOf<
      [result: Result<unknown, Error>, fn: (error: Error) => unknown]
    >();
    const t_tl_26 = null as unknown as ReturnType<typeof Result.split>;
    expectTypeOf(t_tl_26).toEqualTypeOf<
      | readonly [failure: ErrResult<Error>, value: undefined]
      | readonly [failure: undefined, value: unknown]
    >();
    const t_tl_27 = null as unknown as ReturnType<typeof Result.fromNullable>;
    // biome-ignore lint/complexity/noBannedTypes: the 3.0.0 type
    expectTypeOf(t_tl_27).toEqualTypeOf<Result<{}, Error>>();
    const t_tl_28 = null as unknown as Parameters<typeof Result.fromNullable>;
    expectTypeOf(t_tl_28).toEqualTypeOf<
      [value: unknown, errorFactory: () => Error]
    >();
    const t_tl_29 = null as unknown as ReturnType<typeof Result.fromPredicate>;
    expectTypeOf(t_tl_29).toEqualTypeOf<Result<unknown, Error>>();
    const t_tl_30 = null as unknown as Parameters<typeof Result.fromPredicate>;
    expectTypeOf(t_tl_30).toEqualTypeOf<
      [
        value: unknown,
        predicate: (value: unknown) => boolean,
        errorFactory: (value: unknown) => Error,
      ]
    >();
    const t_tl_31 = null as unknown as ReturnType<typeof Result.normalizeError>;
    expectTypeOf(t_tl_31).toEqualTypeOf<Error>();
    const t_tl_32 = null as unknown as Parameters<typeof Result.normalizeError>;
    expectTypeOf(t_tl_32).toEqualTypeOf<[error: unknown]>();
    const t_tl_33 = null as unknown as ReturnType<typeof Result.tryCatch>;
    expectTypeOf(t_tl_33).toEqualTypeOf<Result<unknown, Error>>();
    const t_tl_34 = null as unknown as ReturnType<typeof Result.tryCatchAsync>;
    expectTypeOf(t_tl_34).toEqualTypeOf<Promise<Result<unknown, Error>>>();
    const t_tl_35 = null as unknown as Parameters<typeof Result.tryCatchAsync>;
    expectTypeOf(t_tl_35).toEqualTypeOf<
      [fn: () => PromiseLike<unknown>, onError: (error: unknown) => Error]
    >();
    const t_tl_36 = null as unknown as ReturnType<typeof Result.fromPromise>;
    expectTypeOf(t_tl_36).toEqualTypeOf<Promise<Result<unknown, Error>>>();
    const t_tl_37 = null as unknown as Parameters<typeof Result.fromPromise>;
    expectTypeOf(t_tl_37).toEqualTypeOf<
      [promise: PromiseLike<unknown>, onError: (error: unknown) => Error]
    >();
    const t_tl_38 = null as unknown as ReturnType<typeof Result.all>;
    expectTypeOf(t_tl_38).toEqualTypeOf<Result<readonly unknown[], Error>>();
    const t_tl_39 = null as unknown as Parameters<typeof Result.all>;
    expectTypeOf(t_tl_39).toEqualTypeOf<unknown[]>();
    const t_tl_40 = null as unknown as ReturnType<typeof Result.allAsync>;
    expectTypeOf(t_tl_40).toEqualTypeOf<
      Promise<Result<readonly unknown[], Error>>
    >();
    const t_tl_41 = null as unknown as Parameters<typeof Result.allAsync>;
    expectTypeOf(t_tl_41).toEqualTypeOf<unknown[]>();
    const t_tl_42 = null as unknown as ReturnType<typeof Result.collect>;
    expectTypeOf(t_tl_42).toEqualTypeOf<
      Result<readonly unknown[], AggregateErrorOf<Error>>
    >();
    const t_tl_43 = null as unknown as Parameters<typeof Result.collect>;
    expectTypeOf(t_tl_43).toEqualTypeOf<unknown[]>();
    const t_tl_44 = null as unknown as ReturnType<typeof Result.collectAsync>;
    expectTypeOf(t_tl_44).toEqualTypeOf<
      Promise<Result<readonly unknown[], AggregateErrorOf<Error>>>
    >();
    const t_tl_45 = null as unknown as Parameters<typeof Result.collectAsync>;
    expectTypeOf(t_tl_45).toEqualTypeOf<unknown[]>();
    const t_tl_46 = null as unknown as ReturnType<typeof Result.toMaybe>;
    expectTypeOf(t_tl_46).toEqualTypeOf<Maybe<unknown>>();
    const t_tl_47 = null as unknown as Parameters<typeof Result.toMaybe>;
    expectTypeOf(t_tl_47).toEqualTypeOf<[result: Result<unknown, Error>]>();
    const t_tl_48 = null as unknown as ReturnType<typeof Result.fromMaybe>;
    expectTypeOf(t_tl_48).toEqualTypeOf<Result<unknown, Error>>();
    const t_tl_49 = null as unknown as Parameters<typeof Result.fromMaybe>;
    expectTypeOf(t_tl_49).toEqualTypeOf<
      [maybe: Maybe<unknown>, errorFactory: () => Error]
    >();
    const t_tl_50 = null as unknown as ReturnType<typeof Result.transpose>;
    expectTypeOf(t_tl_50).toEqualTypeOf<Maybe<Result<unknown, Error>>>();
    const t_tl_51 = null as unknown as ReturnType<typeof Maybe.some>;
    expectTypeOf(t_tl_51).toEqualTypeOf<Some<unknown>>();
    const t_tl_52 = null as unknown as Parameters<typeof Maybe.some>;
    expectTypeOf(t_tl_52).toEqualTypeOf<[value: unknown]>();
    const t_tl_53 = null as unknown as ReturnType<typeof Maybe.none>;
    expectTypeOf(t_tl_53).toEqualTypeOf<None>();
    const t_tl_54 = null as unknown as Parameters<typeof Maybe.none>;
    expectTypeOf(t_tl_54).toEqualTypeOf<[]>();
    const t_tl_55 = null as unknown as ReturnType<typeof Maybe.isSome>;
    expectTypeOf<typeof t_tl_55>().toEqualTypeOf<boolean>();
    const t_tl_56 = null as unknown as Parameters<typeof Maybe.isSome>;
    expectTypeOf(t_tl_56).toEqualTypeOf<[maybe: Maybe<unknown>]>();
    const t_tl_57 = null as unknown as ReturnType<typeof Maybe.isNone>;
    expectTypeOf<typeof t_tl_57>().toEqualTypeOf<boolean>();
    const t_tl_58 = null as unknown as Parameters<typeof Maybe.isNone>;
    expectTypeOf(t_tl_58).toEqualTypeOf<[maybe: Maybe<unknown>]>();
    const t_tl_59 = null as unknown as ReturnType<typeof Maybe.map>;
    expectTypeOf(t_tl_59).toEqualTypeOf<Maybe<unknown>>();
    const t_tl_60 = null as unknown as ReturnType<typeof Maybe.flatMap>;
    expectTypeOf(t_tl_60).toEqualTypeOf<Maybe<unknown>>();
    const t_tl_61 = null as unknown as ReturnType<typeof Maybe.flatten>;
    expectTypeOf(t_tl_61).toEqualTypeOf<Maybe<unknown>>();
    const t_tl_62 = null as unknown as Parameters<typeof Maybe.flatten>;
    expectTypeOf(t_tl_62).toEqualTypeOf<[maybe: Maybe<Maybe<unknown>>]>();
    const t_tl_63 = null as unknown as ReturnType<typeof Maybe.filter>;
    expectTypeOf(t_tl_63).toEqualTypeOf<Maybe<unknown>>();
    const t_tl_64 = null as unknown as Parameters<typeof Maybe.filter>;
    expectTypeOf(t_tl_64).toEqualTypeOf<
      [maybe: Maybe<unknown>, predicate: (value: unknown) => boolean]
    >();
    const t_tl_65 = null as unknown as ReturnType<typeof Maybe.inspect>;
    expectTypeOf(t_tl_65).toEqualTypeOf<Maybe<unknown>>();
    const t_tl_66 = null as unknown as ReturnType<typeof Maybe.match>;
    expectTypeOf(t_tl_66).toEqualTypeOf<unknown>();
    const t_tl_67 = null as unknown as ReturnType<typeof Maybe.unwrap>;
    expectTypeOf(t_tl_67).toEqualTypeOf<unknown>();
    const t_tl_68 = null as unknown as ReturnType<typeof Maybe.unwrapOr>;
    expectTypeOf(t_tl_68).toEqualTypeOf<unknown>();
    const t_tl_69 = null as unknown as ReturnType<typeof Maybe.unwrapOrElse>;
    expectTypeOf(t_tl_69).toEqualTypeOf<unknown>();
    const t_tl_70 = null as unknown as Parameters<typeof Maybe.unwrapOrElse>;
    expectTypeOf(t_tl_70).toEqualTypeOf<
      [maybe: Maybe<unknown>, fn: () => unknown]
    >();
    const t_tl_71 = null as unknown as ReturnType<typeof Maybe.fromNullable>;
    // biome-ignore lint/complexity/noBannedTypes: the 3.0.0 type
    expectTypeOf(t_tl_71).toEqualTypeOf<Maybe<{}>>();
    const t_tl_72 = null as unknown as Parameters<typeof Maybe.fromNullable>;
    expectTypeOf(t_tl_72).toEqualTypeOf<[value: unknown]>();
    const t_tl_73 = null as unknown as ReturnType<typeof Maybe.fromPredicate>;
    expectTypeOf(t_tl_73).toEqualTypeOf<Maybe<unknown>>();
    const t_tl_74 = null as unknown as Parameters<typeof Maybe.fromPredicate>;
    expectTypeOf(t_tl_74).toEqualTypeOf<
      [value: unknown, predicate: (value: unknown) => boolean]
    >();
    const t_tl_75 = null as unknown as ReturnType<typeof Maybe.all>;
    expectTypeOf(t_tl_75).toEqualTypeOf<Maybe<readonly unknown[]>>();
    const t_tl_76 = null as unknown as Parameters<typeof Maybe.all>;
    expectTypeOf(t_tl_76).toEqualTypeOf<unknown[]>();
    const t_tl_77 = null as unknown as ReturnType<typeof Maybe.allAsync>;
    expectTypeOf(t_tl_77).toEqualTypeOf<Promise<Maybe<readonly unknown[]>>>();
    const t_tl_78 = null as unknown as Parameters<typeof Maybe.allAsync>;
    expectTypeOf(t_tl_78).toEqualTypeOf<unknown[]>();
    const t_tl_79 = null as unknown as ReturnType<typeof Maybe.firstSome>;
    expectTypeOf(t_tl_79).toEqualTypeOf<Maybe<unknown>>();
    const t_tl_80 = null as unknown as Parameters<typeof Maybe.firstSome>;
    expectTypeOf(t_tl_80).toEqualTypeOf<Maybe<unknown>[]>();
    const t_tl_81 = null as unknown as ReturnType<typeof Maybe.toResult>;
    expectTypeOf(t_tl_81).toEqualTypeOf<Result<unknown, Error>>();
    const t_tl_82 = null as unknown as Parameters<typeof Maybe.toResult>;
    expectTypeOf(t_tl_82).toEqualTypeOf<
      [maybe: Maybe<unknown>, errorFactory: () => Error]
    >();
    const t_tl_83 = null as unknown as ReturnType<typeof Maybe.fromResult>;
    expectTypeOf(t_tl_83).toEqualTypeOf<Maybe<unknown>>();
    const t_tl_84 = null as unknown as Parameters<typeof Maybe.fromResult>;
    expectTypeOf(t_tl_84).toEqualTypeOf<[result: Result<unknown, Error>]>();
    const t_tl_85 = null as unknown as ReturnType<typeof Maybe.transpose>;
    expectTypeOf(t_tl_85).toEqualTypeOf<Result<Maybe<unknown>, Error>>();
  });
});

describe("point-free use of every function", () => {
  test("map and forEach", () => {
    const t_pf3_1 = results.map(Result.ok);
    expectTypeOf(t_pf3_1).toEqualTypeOf<OkResult<unknown>[]>();
    // @ts-expect-error
    const t_pf3_2 = results.map(Result.err);
    void t_pf3_2;
    const t_pf3_3 = results.map(Result.isResult);
    expectTypeOf(t_pf3_3).toEqualTypeOf<boolean[]>();
    const t_pf3_4 = results.map(Result.isOk);
    expectTypeOf(t_pf3_4).toEqualTypeOf<boolean[]>();
    const t_pf3_5 = results.map(Result.isErr);
    expectTypeOf(t_pf3_5).toEqualTypeOf<boolean[]>();
    // @ts-expect-error
    const t_pf3_6 = results.map(Result.map);
    void t_pf3_6;
    // @ts-expect-error
    const t_pf3_7 = results.map(Result.flatten);
    void t_pf3_7;
    // @ts-expect-error
    const t_pf3_8 = results.map(Result.exhaustive);
    void t_pf3_8;
    const t_pf3_9 = results.map(Result.unwrap);
    expectTypeOf(t_pf3_9).toEqualTypeOf<number[]>();
    const t_pf3_10 = results.map(Result.unwrapErr);
    expectTypeOf(t_pf3_10).toEqualTypeOf<AppError[]>();
    // @ts-expect-error
    const t_pf3_11 = results.map(Result.unwrapOrElse);
    void t_pf3_11;
    const t_pf3_12 = results.map(Result.split);
    expectTypeOf(t_pf3_12).toEqualTypeOf<
      (
        | readonly [failure: ErrResult<AppError>, value: undefined]
        | readonly [failure: undefined, value: number]
      )[]
    >();
    // @ts-expect-error
    const t_pf3_13 = results.map(Result.fromNullable);
    void t_pf3_13;
    // @ts-expect-error
    const t_pf3_14 = results.map(Result.fromPredicate);
    void t_pf3_14;
    const t_pf3_15 = results.map(Result.normalizeError);
    expectTypeOf(t_pf3_15).toEqualTypeOf<Error[]>();
    // @ts-expect-error
    const t_pf3_16 = results.map(Result.tryCatchAsync);
    void t_pf3_16;
    // @ts-expect-error
    const t_pf3_17 = results.map(Result.fromPromise);
    void t_pf3_17;
    const t_pf3_18 = results.map(Result.all);
    expectTypeOf(t_pf3_18).toEqualTypeOf<Result<readonly unknown[], Error>[]>();
    const t_pf3_19 = results.map(Result.allAsync);
    expectTypeOf(t_pf3_19).toEqualTypeOf<
      Promise<Result<readonly unknown[], Error>>[]
    >();
    const t_pf3_20 = results.map(Result.collect);
    expectTypeOf(t_pf3_20).toEqualTypeOf<
      Result<readonly unknown[], AggregateErrorOf<Error>>[]
    >();
    const t_pf3_21 = results.map(Result.collectAsync);
    expectTypeOf(t_pf3_21).toEqualTypeOf<
      Promise<Result<readonly unknown[], AggregateErrorOf<Error>>>[]
    >();
    const t_pf3_22 = results.map(Result.toMaybe);
    expectTypeOf(t_pf3_22).toEqualTypeOf<Maybe<number>[]>();
    // @ts-expect-error
    const t_pf3_23 = results.map(Result.fromMaybe);
    void t_pf3_23;
    // @ts-expect-error
    const t_pf3_24 = results.map(Result.transpose);
    void t_pf3_24;
    const t_pf3_25 = maybes.map(Maybe.some);
    expectTypeOf(t_pf3_25).toEqualTypeOf<Some<Maybe<number>>[]>();
    const t_pf3_26 = maybes.map(Maybe.none);
    expectTypeOf(t_pf3_26).toEqualTypeOf<None[]>();
    const t_pf3_27 = maybes.map(Maybe.isSome);
    expectTypeOf(t_pf3_27).toEqualTypeOf<boolean[]>();
    const t_pf3_28 = maybes.map(Maybe.isNone);
    expectTypeOf(t_pf3_28).toEqualTypeOf<boolean[]>();
    // @ts-expect-error
    const t_pf3_29 = maybes.map(Maybe.flatten);
    void t_pf3_29;
    // @ts-expect-error
    const t_pf3_30 = maybes.map(Maybe.filter);
    void t_pf3_30;
    const t_pf3_31 = maybes.map(Maybe.unwrap);
    expectTypeOf(t_pf3_31).toEqualTypeOf<number[]>();
    // @ts-expect-error
    const t_pf3_32 = maybes.map(Maybe.unwrapOrElse);
    void t_pf3_32;
    const t_pf3_33 = maybes.map(Maybe.fromNullable);
    expectTypeOf(t_pf3_33).toEqualTypeOf<
      Maybe<NonNullable<None | Some<number>>>[]
    >();
    // @ts-expect-error
    const t_pf3_34 = maybes.map(Maybe.fromPredicate);
    void t_pf3_34;
    const t_pf3_35 = maybes.map(Maybe.all);
    expectTypeOf(t_pf3_35).toEqualTypeOf<Maybe<readonly unknown[]>[]>();
    const t_pf3_36 = maybes.map(Maybe.allAsync);
    expectTypeOf(t_pf3_36).toEqualTypeOf<
      Promise<Maybe<readonly unknown[]>>[]
    >();
    const t_pf3_37 = maybes.map(Maybe.firstSome);
    expectTypeOf(t_pf3_37).toEqualTypeOf<Maybe<unknown>[]>();
    // @ts-expect-error
    const t_pf3_38 = maybes.map(Maybe.toResult);
    void t_pf3_38;
    // @ts-expect-error
    const t_pf3_39 = maybes.map(Maybe.fromResult);
    void t_pf3_39;
    // @ts-expect-error
    const t_pf3_40 = maybes.map(Maybe.transpose);
    void t_pf3_40;
    // @ts-expect-error
    const t_pf3_41 = [() => 1].map(Result.tryCatchAsync);
    void t_pf3_41;
    // @ts-expect-error
    const t_pf3_42 = [pn].map(Result.tryCatchAsync);
    void t_pf3_42;
    // @ts-expect-error
    const t_pf3_43 = [() => 1].map(Result.fromPromise);
    void t_pf3_43;
    const t_pf3_44 = [pn].map(Result.fromPromise);
    expectTypeOf(t_pf3_44).toEqualTypeOf<Promise<Result<unknown, Error>>[]>();
    const t_pf3_45 = [() => 1].map(Result.tryCatch);
    expectTypeOf(t_pf3_45).toEqualTypeOf<Result<unknown, Error>[]>();
    const t_pf3_46 = results.forEach(Result.unwrap);
    expectTypeOf(t_pf3_46).toEqualTypeOf<void>();
    const t_pf3_47 = results.forEach(Result.unwrapErr);
    expectTypeOf(t_pf3_47).toEqualTypeOf<void>();
    // @ts-expect-error
    const t_pf3_48 = results.forEach(Result.unwrapOrElse);
    void t_pf3_48;
    const t_pf3_49 = results.forEach(Result.split);
    expectTypeOf(t_pf3_49).toEqualTypeOf<void>();
    // @ts-expect-error
    const t_pf3_50 = results.forEach(Result.flatten);
    void t_pf3_50;
    // @ts-expect-error
    const t_pf3_51 = results.forEach(Result.transpose);
    void t_pf3_51;
  });
});
describe("constructors, guards and combinators", () => {
  test("inferred", () => {
    const t_cg_1 = Result.ok();
    expectTypeOf(t_cg_1).toEqualTypeOf<OkResult<undefined>>();
    const t_cg_2 = Result.ok(undefined);
    expectTypeOf(t_cg_2).toEqualTypeOf<OkResult<undefined>>();
    const t_cg_3 = Result.ok("active" as const);
    expectTypeOf(t_cg_3).toEqualTypeOf<OkResult<"active">>();
    const t_cg_4 = Result.err(new DbError());
    expectTypeOf(t_cg_4).toEqualTypeOf<ErrResult<DbError>>();
    const t_cg_5 = Result.isResult(unknownValue);
    expectTypeOf<typeof t_cg_5>().toEqualTypeOf<boolean>();
    const t_cg_6 = Result.normalizeError(unknownValue);
    expectTypeOf(t_cg_6).toEqualTypeOf<Error>();
    const t_cg_7 = Result.all(rn, rs);
    expectTypeOf(t_cg_7).toEqualTypeOf<
      Result<readonly [number, string], AppError | DbError>
    >();
    const t_cg_8 = Result.all([rn, rs]);
    expectTypeOf(t_cg_8).toEqualTypeOf<
      Result<readonly [number, string], AppError | DbError>
    >();
    const t_cg_9 = Result.all(results);
    expectTypeOf(t_cg_9).toEqualTypeOf<Result<number[], AppError>>();
    const t_cg_10 = Result.collect(rn, rs);
    expectTypeOf(t_cg_10).toEqualTypeOf<
      Result<readonly [number, string], AggregateErrorOf<AppError | DbError>>
    >();
    const t_cg_11 = Result.collect(results);
    expectTypeOf(t_cg_11).toEqualTypeOf<
      Result<number[], AggregateErrorOf<AppError>>
    >();
    const t_cg_12 = Result.allAsync(prn, prs);
    expectTypeOf(t_cg_12).toEqualTypeOf<
      Promise<Result<readonly [number, string], AppError | Error | DbError>>
    >();
    const t_cg_13 = Result.collectAsync([prn, prs]);
    expectTypeOf(t_cg_13).toEqualTypeOf<
      Promise<
        Result<
          readonly [number, string],
          AggregateErrorOf<AppError | Error | DbError>
        >
      >
    >();
    const t_cg_14 = Result.all();
    expectTypeOf(t_cg_14).toEqualTypeOf<Result<readonly [], never>>();
    const t_cg_15 = Result.all([]);
    expectTypeOf(t_cg_15).toEqualTypeOf<Result<readonly [], never>>();
    const t_cg_16 = Maybe.all(mn, ms);
    expectTypeOf(t_cg_16).toEqualTypeOf<Maybe<readonly [number, Status]>>();
    const t_cg_17 = Maybe.all([mn, mCfg]);
    expectTypeOf(t_cg_17).toEqualTypeOf<Maybe<readonly [number, Config]>>();
    const t_cg_18 = Maybe.allAsync(pmn, pmn);
    expectTypeOf(t_cg_18).toEqualTypeOf<
      Promise<Maybe<readonly [number, number]>>
    >();
    const t_cg_19 = Maybe.firstSome(mn, ms);
    expectTypeOf(t_cg_19).toEqualTypeOf<Maybe<number | Status>>();
    const t_cg_20 = Maybe.firstSome([mn, ms]);
    expectTypeOf(t_cg_20).toEqualTypeOf<Maybe<number | Status>>();
    const t_cg_21 = Maybe.none();
    expectTypeOf(t_cg_21).toEqualTypeOf<None>();
    const t_cg_22 = Maybe.fromPredicate(rn as unknown, Result.isResult);
    expectTypeOf(t_cg_22).toEqualTypeOf<Maybe<Result<unknown, Error>>>();
    const t_cg_23 = Result.fromPredicate(
      unknownValue,
      Result.isResult,
      () => new AppError()
    );
    expectTypeOf(t_cg_23).toEqualTypeOf<
      Result<Result<unknown, Error>, AppError>
    >();
    const t_cg_24 = Result.exhaustive(neverValue);
    expectTypeOf(t_cg_24).toEqualTypeOf<never>();
    const t_cg_25 = Result.fromNullable(rOpt, () => new AppError());
    expectTypeOf(t_cg_25).toEqualTypeOf<
      Result<
        NonNullable<ErrResult<AppError> | OkResult<number | undefined>>,
        AppError
      >
    >();
    const t_cg_26 = Result.all(ok(1), err(new AppError()), ok("a" as const));
    expectTypeOf(t_cg_26).toEqualTypeOf<
      Result<readonly [number, never, "a"], AppError>
    >();
    const t_cg_27 = Result.collect(ok(1), err(new DbError()));
    expectTypeOf(t_cg_27).toEqualTypeOf<
      Result<readonly [number, never], AggregateErrorOf<DbError>>
    >();
    const t_cg_28 = Maybe.all(some(1), none(), some("a"));
    expectTypeOf(t_cg_28).toEqualTypeOf<
      Maybe<readonly [number, never, string]>
    >();
    const t_cg_29 = isOk(rn) ? rn.value : rn.error;
    expectTypeOf(t_cg_29).toEqualTypeOf<number | AppError>();
    const t_cg_30 = isSome(mn) ? mn.value : 0;
    expectTypeOf(t_cg_30).toEqualTypeOf<number>();
    const t_cg_31 = Result.allAsync([fetchUser(1), fetchUser(2)]);
    expectTypeOf(t_cg_31).toEqualTypeOf<
      Promise<Result<readonly [User, User], AppError | Error>>
    >();
    const t_cg_32 = Maybe.toResult(mn, () => new DbError());
    expectTypeOf(t_cg_32).toEqualTypeOf<Result<number, DbError>>();
    // @ts-expect-error
    const t_cg_33 = Result.toMaybe(rUnion);
    void t_cg_33;
    // @ts-expect-error
    const t_cg_34 = Result.map(rUnion, (v) => v);
    void t_cg_34;
    // @ts-expect-error
    const t_cg_35 = Result.unwrapOr(rUnion, 0);
    void t_cg_35;
    // @ts-expect-error
    const t_cg_36 = Result.match(rUnion, { ok: (v) => v, err: (e) => e.name });
    void t_cg_36;
    // @ts-expect-error
    const t_cg_37 = Result.flatMap(rUnion, (v) => ok([v]));
    void t_cg_37;
    // @ts-expect-error
    const t_cg_38 = Result.orElse(rUnion, () => ok(1));
    void t_cg_38;
  });
});

// The typed calls whose types differ from 3.0.0 on purpose, with the 3.0.0
// type in a comment.
describe("intended differences from 3.0.0", () => {
  // The return types of `map` and `tryCatch` for a callback that returns a
  // Promise turn `any` into `unknown`.  Generic code shows the same type as
  // in 3.0.0, but the type that `U` or `P` later becomes `any` in is a
  // `Result` of `unknown` (3.0.0: of `any`).  Copies of the two types:
  type AsyncInMap<U, R> = [U] extends [never]
    ? R
    : 0 extends 1 & U
      ? Result<unknown, R extends ErrResult<infer E> ? E : never>
      : {
          readonly "Result.map does not await. Await the value first, or use Result.tryCatchAsync for async work": never;
        };
  type AsyncInTryCatch<T, R> = [T] extends [never]
    ? R
    : 0 extends 1 & T
      ? Result<unknown, R extends ErrResult<infer E> ? E : never>
      : {
          readonly "Result.tryCatch does not await. Use Result.tryCatchAsync for functions that return a Promise": never;
        };

  test("generic code that returns AsyncInMap or AsyncInTryCatch", () => {
    function viaMap<U extends PromiseLike<number>>(f: (v: number) => U) {
      return Result.map(rn, f);
    }
    expectTypeOf(viaMap).toEqualTypeOf<
      <U extends PromiseLike<number>>(
        f: (v: number) => U
      ) => AsyncInMap<U, Result<U, AppError>>
    >();
    function viaTryCatch<P extends PromiseLike<number>>(fn: () => P) {
      return Result.tryCatch(fn);
    }
    expectTypeOf(viaTryCatch).toEqualTypeOf<
      <P extends PromiseLike<number>>(
        fn: () => P
      ) => AsyncInTryCatch<P, Result<P, Error>>
    >();
  });

  test("match with the input types only", () => {
    // 3.0.0: an error, the result type defaulted to never.
    expectTypeOf(
      Result.match<number, AppError>(rn, { ok: String, err: () => "e" })
    ).toEqualTypeOf<unknown>();
    expectTypeOf(
      Maybe.match<number>(mn, { some: String, none: () => "e" })
    ).toEqualTypeOf<unknown>();
  });

  // A function passed point-free, or read by ReturnType / Parameters, is
  // typed by its last overload, now the one for an untyped value.
  test("the last overload, point-free and in ReturnType", () => {
    // 3.0.0: number[]
    expectTypeOf(results.map(Result.unwrapOr)).toEqualTypeOf<unknown[]>();
    expectTypeOf(maybes.map(Maybe.unwrapOr)).toEqualTypeOf<unknown[]>();
    // 3.0.0: Result<unknown, Error>
    expectTypeOf<ReturnType<typeof Result.map>>().toEqualTypeOf<
      Result<unknown, never>
    >();
  });

  // 3.0.0 rejected these calls, which pass the index as the callback (or
  // the handlers) and throw at runtime when they call it.
  test("the last overload takes a point-free call that 3.0.0 rejected", () => {
    type Results = Result<unknown, Error>[];
    expectTypeOf(results.map(Result.mapError)).toEqualTypeOf<Results>();
    expectTypeOf(results.map(Result.inspect)).toEqualTypeOf<Results>();
    expectTypeOf(results.map(Result.inspectError)).toEqualTypeOf<Results>();
    expectTypeOf(results.map(Result.flatMap)).toEqualTypeOf<Results>();
    expectTypeOf(results.map(Result.flatMapErr)).toEqualTypeOf<Results>();
    expectTypeOf(results.map(Result.orElse)).toEqualTypeOf<Results>();
    expectTypeOf(results.map(Result.match)).toEqualTypeOf<unknown[]>();
    expectTypeOf(results.map(Result.tryCatch)).toEqualTypeOf<Results>();
    expectTypeOf([pn].map(Result.tryCatch)).toEqualTypeOf<Results>();
    expectTypeOf(maybes.map(Maybe.map)).toEqualTypeOf<Maybe<unknown>[]>();
    expectTypeOf(maybes.map(Maybe.flatMap)).toEqualTypeOf<Maybe<unknown>[]>();
    expectTypeOf(maybes.map(Maybe.inspect)).toEqualTypeOf<Maybe<unknown>[]>();
    expectTypeOf(maybes.map(Maybe.match)).toEqualTypeOf<unknown[]>();
    results.forEach(Result.map);
    results.forEach(Result.mapError);
    results.forEach(Result.inspect);
    results.forEach(Result.flatMap);
    results.forEach(Result.orElse);
    results.forEach(Result.match);
  });

  test("Parameters of a function with overloads", () => {
    // 3.0.0: the parameters of its last overload, for example
    // [result: Result<unknown, Error>, fallback: unknown].
    type Two = [unknown, unknown, never];
    type Both = [unknown, unknown, never, never];
    // An untyped callback still needs a Result (a Maybe) as the input.
    type OnResult = [Result<unknown, Error>, unknown, never];
    type OnMaybe = [Maybe<unknown>, unknown, never];
    expectTypeOf<Parameters<typeof Result.map>>().toEqualTypeOf<OnResult>();
    expectTypeOf<Parameters<typeof Result.mapError>>().toEqualTypeOf<Both>();
    expectTypeOf<Parameters<typeof Result.inspect>>().toEqualTypeOf<Both>();
    expectTypeOf<
      Parameters<typeof Result.inspectError>
    >().toEqualTypeOf<Both>();
    expectTypeOf<Parameters<typeof Result.flatMap>>().toEqualTypeOf<OnResult>();
    expectTypeOf<
      Parameters<typeof Result.flatMapErr>
    >().toEqualTypeOf<OnResult>();
    expectTypeOf<Parameters<typeof Result.orElse>>().toEqualTypeOf<OnResult>();
    expectTypeOf<Parameters<typeof Result.match>>().toEqualTypeOf<Both>();
    expectTypeOf<Parameters<typeof Result.unwrapOr>>().toEqualTypeOf<Two>();
    expectTypeOf<Parameters<typeof Result.tryCatch>>().toEqualTypeOf<Both>();
    expectTypeOf<Parameters<typeof Maybe.map>>().toEqualTypeOf<OnMaybe>();
    expectTypeOf<Parameters<typeof Maybe.flatMap>>().toEqualTypeOf<OnMaybe>();
    expectTypeOf<Parameters<typeof Maybe.inspect>>().toEqualTypeOf<Both>();
    expectTypeOf<Parameters<typeof Maybe.match>>().toEqualTypeOf<Both>();
    expectTypeOf<Parameters<typeof Maybe.unwrapOr>>().toEqualTypeOf<Two>();
  });

  test("Parameters of a function with one signature", () => {
    // 3.0.0: without the member of never, which holds no value, for
    // example [result: Result<unknown, Error>].
    type Input = [Result<unknown, Error> | ErrResult<never>];
    expectTypeOf<Parameters<typeof Result.unwrap>>().toEqualTypeOf<Input>();
    expectTypeOf<Parameters<typeof Result.unwrapErr>>().toEqualTypeOf<Input>();
    expectTypeOf<Parameters<typeof Result.split>>().toEqualTypeOf<Input>();
    expectTypeOf<Parameters<typeof Result.flatten>>().toEqualTypeOf<
      [
        | Result<Result<unknown, Error> | ErrResult<never>, Error>
        | ErrResult<never>,
      ]
    >();
    expectTypeOf<Parameters<typeof Result.transpose>>().toEqualTypeOf<
      [Result<Maybe<unknown>, Error> | ErrResult<never>]
    >();
    expectTypeOf<Parameters<typeof Maybe.unwrap>>().toEqualTypeOf<
      [Maybe<unknown> | Some<never>]
    >();
    expectTypeOf<Parameters<typeof Maybe.transpose>>().toEqualTypeOf<
      [Maybe<Result<unknown, Error> | ErrResult<never>> | Some<never>]
    >();
  });
});
