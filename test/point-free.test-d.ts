// Every function that takes one argument, passed point-free to `map`,
// `filter` or `then`.  A function without overloads keeps its generic type
// there; an overloaded one is typed by its last overload, so its value
// type is lost.  Those cases are pinned below, so a fix shows up.
import { describe, expectTypeOf, test } from "vitest";
import {
  type AggregateErrorOf,
  type ErrResult,
  Maybe,
  type None,
  type OkResult,
  Result,
  type Some,
} from "../src/index.js";

class AppError extends Error {
  readonly kind = "app" as const;
}

const rs: Result<number, AppError>[] = [];
const nested: Result<Result<number, AppError>, TypeError>[] = [];
const rms: Result<Maybe<number>, AppError>[] = [];
const mrs: Maybe<Result<number, AppError>>[] = [];
const ms: Maybe<number>[] = [];
const mms: Maybe<Maybe<number>>[] = [];
const nums: number[] = [];
const unknowns: unknown[] = [];
const errors: AppError[] = [];

describe("Result functions point-free", () => {
  test("err / isResult / isOk / isErr / normalizeError", () => {
    expectTypeOf(errors.map(Result.err)).toEqualTypeOf<ErrResult<AppError>[]>();
    expectTypeOf(unknowns.filter(Result.isResult)).toEqualTypeOf<
      Result<unknown, Error>[]
    >();
    expectTypeOf(rs.filter(Result.isOk)).toEqualTypeOf<OkResult<number>[]>();
    expectTypeOf(rs.filter(Result.isErr)).toEqualTypeOf<
      ErrResult<AppError>[]
    >();
    expectTypeOf(unknowns.map(Result.normalizeError)).toEqualTypeOf<Error[]>();
  });

  test("unwrap / unwrapErr / split", () => {
    expectTypeOf(rs.map(Result.unwrap)).toEqualTypeOf<number[]>();
    expectTypeOf(rs.map(Result.unwrapErr)).toEqualTypeOf<AppError[]>();
    expectTypeOf(rs.map(Result.split)).toEqualTypeOf<
      (
        | readonly [failure: ErrResult<AppError>, value: undefined]
        | readonly [failure: undefined, value: number]
      )[]
    >();
  });

  test("flatten, in map and in then", async () => {
    expectTypeOf(nested.map(Result.flatten)).toEqualTypeOf<
      Result<number, AppError | TypeError>[]
    >();
    const p = Promise.resolve(nested[0] as (typeof nested)[number]);
    expectTypeOf(await p.then(Result.flatten)).toEqualTypeOf<
      Result<number, AppError | TypeError>
    >();
  });

  test("toMaybe / transpose", () => {
    expectTypeOf(rs.map(Result.toMaybe)).toEqualTypeOf<Maybe<number>[]>();
    expectTypeOf(rms.map(Result.transpose)).toEqualTypeOf<
      Maybe<Result<number, AppError>>[]
    >();
  });

  test("exhaustive takes only never", () => {
    const nevers: never[] = [];
    expectTypeOf(nevers.map(Result.exhaustive)).toEqualTypeOf<never[]>();
    // @ts-expect-error — a Result is not never
    rs.map(Result.exhaustive);
  });

  test("overloaded: ok, tryCatch, tryCatchAsync, fromPromise lose the value type", () => {
    expectTypeOf(nums.map(Result.ok)).toEqualTypeOf<OkResult<unknown>[]>();
    const fns: (() => number)[] = [];
    expectTypeOf(fns.map(Result.tryCatch)).toEqualTypeOf<
      Result<unknown, Error>[]
    >();
    const asyncFns: (() => Promise<number>)[] = [];
    expectTypeOf(asyncFns.map(Result.tryCatchAsync)).toEqualTypeOf<
      Promise<Result<unknown, Error>>[]
    >();
    const ps: Promise<number>[] = [];
    expectTypeOf(ps.map(Result.fromPromise)).toEqualTypeOf<
      Promise<Result<unknown, Error>>[]
    >();
  });

  test("overloaded: the combinators in map compile, and lose their types", () => {
    // At runtime the index and the array that map passes are ignored.
    const groups = [rs];
    expectTypeOf(groups.map(Result.all)).toEqualTypeOf<
      Result<readonly unknown[], Error>[]
    >();
    expectTypeOf(groups.map(Result.collect)).toEqualTypeOf<
      Result<readonly unknown[], AggregateErrorOf<Error>>[]
    >();
    const pending = [rs.map((r) => Promise.resolve(r))];
    expectTypeOf(pending.map(Result.allAsync)).toEqualTypeOf<
      Promise<Result<readonly unknown[], Error>>[]
    >();
    // An arrow function keeps them.
    expectTypeOf(groups.map((g) => Result.all(g))).toEqualTypeOf<
      Result<number[], AppError>[]
    >();
  });

  test("overloaded: the combinators in then lose the value and error types", async () => {
    const list = Promise.resolve(rs);
    expectTypeOf(await list.then(Result.all)).toEqualTypeOf<
      OkResult<readonly unknown[]> | ErrResult<Error>
    >();
    expectTypeOf(await list.then(Result.collect)).toEqualTypeOf<
      OkResult<readonly unknown[]> | ErrResult<AggregateErrorOf<Error>>
    >();
    const pending = Promise.resolve(rs.map((r) => Promise.resolve(r)));
    expectTypeOf(await pending.then(Result.allAsync)).toEqualTypeOf<
      Result<readonly unknown[], Error>
    >();
    expectTypeOf(await pending.then(Result.collectAsync)).toEqualTypeOf<
      Result<readonly unknown[], AggregateErrorOf<Error>>
    >();
  });
});

describe("Maybe functions point-free", () => {
  test("some / none / isSome / isNone", () => {
    expectTypeOf(nums.map(Maybe.some)).toEqualTypeOf<Some<number>[]>();
    expectTypeOf(nums.map(Maybe.none)).toEqualTypeOf<None[]>();
    expectTypeOf(ms.filter(Maybe.isSome)).toEqualTypeOf<Some<number>[]>();
    expectTypeOf(ms.filter(Maybe.isNone)).toEqualTypeOf<None[]>();
  });

  test("flatten / unwrap / fromNullable / fromResult / transpose", () => {
    expectTypeOf(mms.map(Maybe.flatten)).toEqualTypeOf<Maybe<number>[]>();
    expectTypeOf(ms.map(Maybe.unwrap)).toEqualTypeOf<number[]>();
    const nullables: (number | null)[] = [];
    expectTypeOf(nullables.map(Maybe.fromNullable)).toEqualTypeOf<
      Maybe<number>[]
    >();
    expectTypeOf(rs.map(Maybe.fromResult)).toEqualTypeOf<Maybe<number>[]>();
    expectTypeOf(mrs.map(Maybe.transpose)).toEqualTypeOf<
      Result<Maybe<number>, AppError>[]
    >();
  });

  test("overloaded: the combinators in map compile, and lose their types", () => {
    const groups = [ms];
    expectTypeOf(groups.map(Maybe.all)).toEqualTypeOf<
      Maybe<readonly unknown[]>[]
    >();
    expectTypeOf(groups.map(Maybe.firstSome)).toEqualTypeOf<Maybe<unknown>[]>();
    expectTypeOf(groups.map((g) => Maybe.all(g))).toEqualTypeOf<
      Maybe<number[]>[]
    >();
  });

  test("overloaded: the combinators in then lose the value type", async () => {
    const list = Promise.resolve(ms);
    expectTypeOf(await list.then(Maybe.all)).toEqualTypeOf<
      Some<readonly unknown[]> | None
    >();
    expectTypeOf(await list.then(Maybe.firstSome)).toEqualTypeOf<
      Some<unknown> | None
    >();
    const pending = Promise.resolve(ms.map((m) => Promise.resolve(m)));
    expectTypeOf(await pending.then(Maybe.allAsync)).toEqualTypeOf<
      Maybe<readonly unknown[]>
    >();
  });
});
