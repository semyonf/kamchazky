/** A successful result containing a value of type `T`. */
export type OkResult<T> = {
  readonly ok: true;
  readonly value: T;
};

/** A failed result containing an error of type `E`. */
export type ErrResult<E extends Error = Error> = {
  readonly ok: false;
  readonly error: E;
};

/**
 * A value that is either a success (`OkResult<T>`) or a failure
 * (`ErrResult<E>`). Use `Result.ok` / `Result.err` to construct, and the
 * companion `Result.*` functions to transform.
 */
export type Result<T, E extends Error = Error> = OkResult<T> | ErrResult<E>;

/**
 * The error of `Result.collect` / `collectAsync`: a real `AggregateError`
 * whose `.errors` is typed.  The built-in `AggregateError.errors` is
 * `any[]`, which would let `r.error.errors[0].anything` compile.
 */
export interface AggregateErrorOf<E extends Error> extends AggregateError {
  errors: E[];
}

type AnyResult = Result<unknown, Error>;

type ValueOf<R> = R extends OkResult<infer T> ? T : never;
/** `ErrorOf<any>` is `Error`, so an untyped input needs no `ErrorIfAny`,
 *  which generic code could not resolve. */
type ErrorOf<R> = R extends ErrResult<infer E> ? E : never;

type TupleValues<R extends readonly AnyResult[]> = {
  [K in keyof R]: ValueOf<R[K]>;
};
type TupleErrors<R extends readonly AnyResult[]> = ErrorOf<R[number]>;

/*
 * Untyped (`any`) values
 *
 * A value typed `any` (`JSON.parse(s)`, an untyped library) would make
 * every type it touches `any`.  The functions give `unknown` for such a
 * value and `Error` for such an error instead.  They do it with overloads,
 * and the order of the overloads is what makes it work.
 *
 * The typed overloads are the overloads of 3.0.0, and test/compat.test-d.ts
 * pins what typed code infers through them.  TypeScript checks an argument
 * against the first overload that looks at it and keeps parts of that check
 * (the type of a call passed as the argument, the parameter and return
 * types of a callback), so an overload put in front of them must have the
 * same parameters.  The overloads for untyped values come after them, or
 * in front of them with the same parameters.  `OnlyIfAny` describes the two
 * passes in which TypeScript picks an overload, and `OnlyIfAnyCallback` the
 * callback type `(...args: any[]) => any`, which the first pass treats
 * apart.
 *
 * A comment above the overloads of a function lists them in order, with
 * these names:
 *
 *   3.0.0         the typed overloads of 3.0.0.
 *   3.0.0 copy    a copy of them that skips `any`, see `OnlyIfTyped` and
 *                 `OnlyIfNotAny`.
 *   input         an `any` input: `result: I`, `...untyped: OnlyIfAny<I>`.
 *                 The callback's parameter has the type `P`, which defaults
 *                 to `unknown` (`Error` for an error), so an unannotated
 *                 callback gets that type.  It comes first among the
 *                 untyped overloads, because TypeScript types an
 *                 unannotated callback only once an overload has taken the
 *                 other arguments.
 *   input ×3      `input` with a callback that returns the error `E`
 *                 (`onError`; `fn` and `F` in `mapError`), three times: with
 *                 `OnlyIfTyped<E>` for a typed callback, with `OnlyIfAny<E>`
 *                 for one that returns `any` (the error is `Error`), and
 *                 without a check of `E` for generic code, whose `E` the
 *                 other two skip.  Each return type names `E` or `Error`:
 *                 generic code cannot resolve `IsAny<E> extends true ?
 *                 Error : E`.  The first one makes an unannotated callback
 *                 that returns `any` reach the second, as a `3.0.0 copy`
 *                 does, see `OnlyIfTyped`.
 *   returns any   a callback, `onError` or error factory whose return type
 *                 is `any`: `fn: (value: ValueOf<I>) => R`, `...untyped:
 *                 OnlyIfAny<R>`.  The input must still be a Result (`I
 *                 extends AnyResult`), and an annotated parameter must fit
 *                 it.
 *   callback      an `any` callback with a typed input: `result: I &
 *                 AnyResult`, `fn: C`, `...untyped: OnlyIfAny<C>`, or
 *                 `OnlyIfAnyCallback<C>` where the callback gives the error
 *                 (`orElse`).  The intersection keeps a non-Result input
 *                 out, as a constraint would; unlike a constraint or a
 *                 conditional type it keeps generic code (`r: Result<T,
 *                 E>`) in this overload and the point-free type of the
 *                 function.  Only where the typed overload would put `any`
 *                 into its result: `inspect` has none, a typed overload
 *                 takes such a call in the second pass and keeps its typed
 *                 result.
 *   handler       an `any` handler of `match` next to a typed one.
 *   both          an `any` input and an `any` callback, where no `callback`
 *                 overload takes them: `...untyped: OnlyIfBothAny<I, C>`,
 *                 or `[...OnlyIfAny<I>, ...OnlyIfAnyCallback<C>]` where the
 *                 callback gives the error (`mapError`, `tryCatch`).
 *
 * A function with one signature has no such list; see `flatten`.
 */

/** `true` for `any` only. */
type IsAny<T> = 0 extends 1 & T ? true : false;

/**
 * The rest parameter of an overload for an untyped value `A`: no argument
 * when `A` is `any`, one argument of type `never` otherwise.
 *
 * TypeScript resolves an overloaded call in two passes: first it takes the
 * first overload that each argument is a subtype of, then the first one
 * that each argument is assignable to.  `any` is a subtype of `any` and
 * `unknown` only, so in the first pass no typed overload takes an `any`
 * argument, while a parameter whose type is a bare type parameter
 * (`result: I`) does: TypeScript infers `any` for `I`.
 *
 * The rest parameter keeps typed calls out.  For any type but `any`,
 * including one that generic code cannot tell yet, it asks for one more
 * argument of type `never`.  No call passes one, so a typed call skips the
 * overload without an error (the return type is simplified):
 *
 *   function map<I, U, P = unknown>(
 *     result: I, fn: (value: P) => U, ...untyped: OnlyIfAny<I>
 *   ): Result<U, Error>;
 *
 *   map(JSON.parse(s), (v) => v)  // I = any: OnlyIfAny<I> = [], taken
 *   map(r, (v) => v)              // I = Result<…>: one argument short, skipped
 *
 * The element is labelled `skip`; the label shows in `Parameters<typeof
 * Result.unwrapOr>` and in the error for an argument too many.
 */
type OnlyIfAny<A> = IsAny<A> extends true ? [] : [skip: never];

/** As `OnlyIfAny`, for two values that must both be `any`. */
type OnlyIfBothAny<A, B> = [...OnlyIfAny<A>, ...OnlyIfAny<B>];

/**
 * As `OnlyIfAny`, for a callback: no argument for `any` and for a function
 * that takes any arguments and returns `any`, such as `(...args: any[]) =>
 * any`, the type of `vi.fn()` and `jest.fn()`.
 *
 * In the first pass TypeScript relates `(...args: any[]) => any` to no
 * function type but one of the same form, so no `returns any` overload
 * takes it there.  The second pass takes the first overload that it is
 * assignable to, a typed one: `orElse(r, vi.fn())` would be `Result<T,
 * never>`.  A `both` or `callback` overload with `fn: C` and this rest
 * parameter takes it in the first pass.
 */
type OnlyIfAnyCallback<C> =
  IsAny<C> extends true
    ? []
    : [C] extends [(...args: infer A) => infer R]
      ? IsAny<R> extends true
        ? unknown[] extends A
          ? []
          : [skip: never]
        : [skip: never]
      : [skip: never];

/**
 * The rest parameter of a `3.0.0 copy`, the reverse of `OnlyIfAny`: no
 * argument for a typed `A`, so typed code infers the same, and one argument
 * of type `never` for `any`, for `unknown` and for a type that generic code
 * cannot tell yet.  `unknown`, which TypeScript infers when the argument
 * does not fit, skips the copy as well, so a wrong argument is reported
 * once, by the typed overload after it.
 *
 * Where a typed overload's callback returns a bare type parameter
 * (`mapError`'s `(error: E) => F`) or a Promise of one (`tryCatchAsync`'s
 * `PromiseLike<T>`), `any` passes the first pass there too, with `F = any`.
 * Such a function starts with copies of its typed overloads that end in
 * `...typed: OnlyIfTyped<F>`, then come the untyped overloads, then the
 * typed overloads as they are, which take generic code.
 *
 * The copy also makes an unannotated callback that returns `any` reach the
 * `returns any` overload.  TypeScript first checks each overload without
 * such a callback and infers `F` from its constraint; the first overload
 * that passes that check makes it check every later overload with the
 * callback.  The copy passes the first check and fails the second, so the
 * `returns any` overload after it sees `F = any`.
 */
type OnlyIfTyped<A> =
  IsAny<A> extends true
    ? [skip: never]
    : unknown extends A
      ? [skip: never]
      : [];

/** As `OnlyIfTyped`, without the check for `unknown`: one argument of type
 *  `never` for `any` and for a type that generic code cannot tell yet, no
 *  argument for any other type, `unknown` included.  For a `3.0.0 copy`
 *  whose `T` TypeScript infers as `unknown`, see `tryCatchAsync`. */
type OnlyIfNotAny<A> = IsAny<A> extends true ? [skip: never] : [];

/** `Error` where `X` is `any`, `Else` otherwise.  For the `UntypedValue`
 *  of a one-signature function (`flatten`), which generic code leaves at its
 *  default, so the type resolves.  An overload names `E` or `Error` in its
 *  return type instead, see `input ×3`. */
type ErrorIfAny<X, Else> = IsAny<X> extends true ? Error : Else;

/** Combinators take their items as rest arguments or as one array.  The
 *  array form avoids spreading: `f(...arr)` with ~150k elements throws
 *  `RangeError: Maximum call stack size exceeded`.
 *
 *  An array followed by an index is the array form too: `map` and
 *  `flatMap` call a callback with `(items, index, array)` and `Array.from`
 *  with `(items, index)`.  The types accept `groups.map(Result.all)`,
 *  because TypeScript checks an overloaded function passed as a callback
 *  with its type parameters erased to `any`. */
function listArgs(args: readonly unknown[]): readonly unknown[] {
  const [first, second] = args;
  const isList =
    Array.isArray(first) && (args.length === 1 || typeof second === "number");
  return isList ? first : args;
}

/** What a function expects to be a Result (an input, the value inside an
 *  `Ok`, an item of a combinator) must be one, as `isResult` checks it.
 *  Anything else arrived through `any` and is a programmer error: a
 *  TypeError that names the function and the part (`"input"`, or the index
 *  of an item), never an `Err` that looks like a real failure.  The value
 *  itself is not put into the message. */
function expectResult(value: unknown, fn: string, part: Part): AnyResult {
  if (isResult(value)) return value;
  throw new TypeError(`${fn}: ${partName(part)} is not a Result`);
}

/** A named part, or the index of an item: the message is built only on
 *  failure. */
type Part = string | number;

function partName(part: Part): string {
  return typeof part === "number" ? `item ${part}` : part;
}

/** Every item is checked before the first `Err` is returned.
 *  `Array.from`, not `map`: `map` skips the holes of a sparse array, which
 *  would then pass unchecked. */
function expectResults(items: readonly unknown[], fn: string): AnyResult[] {
  return Array.from(items, (item, i) => expectResult(item, fn, i));
}

/** The settled promises of `allAsync` / `collectAsync` as Results.  A
 *  rejection becomes an `Err` with the normalized reason; every fulfilled
 *  value is checked, also after a rejection or an `Err`. */
function settledResults(
  settled: readonly PromiseSettledResult<unknown>[],
  fn: string
): AnyResult[] {
  return settled.map((s, i) =>
    s.status === "rejected"
      ? err(normalizeError(s.reason))
      : expectResult(s.value, fn, i)
  );
}

/** `Ok` of every value, or the first `Err`. */
function allOrFirstErr(results: readonly AnyResult[]): AnyResult {
  const values: unknown[] = [];
  for (const result of results) {
    if (!result.ok) return err(result.error);
    values.push(result.value);
  }
  return ok(values);
}

/** `Ok` of every value, or an `Err` with every error in an
 *  `AggregateError`.  Its message counts the failures and does not repeat
 *  their messages, which may carry data that must not reach a log. */
function allOrEveryErr(results: readonly AnyResult[], fn: string): AnyResult {
  const values: unknown[] = [];
  const errors: Error[] = [];
  for (const result of results) {
    if (result.ok) values.push(result.value);
    else errors.push(result.error);
  }
  if (errors.length === 0) return ok(values);
  return err(
    new AggregateError(
      errors,
      `${fn}: ${errors.length} of ${results.length} items failed`
    )
  );
}

function createOk<T>(value: T): OkResult<T> {
  return Object.freeze({
    ok: true as const,
    value,
  });
}

function ok(): OkResult<undefined>;
function ok<T>(value: T): OkResult<T>;
function ok<T>(...args: [] | [value: T]): OkResult<undefined> | OkResult<T> {
  return args.length === 0 ? createOk(undefined) : createOk(args[0]);
}

/**
 * Create a failed `Result` containing `error`.
 *
 * An `any` argument gives `ErrResult<any>`, also point-free
 * (`promise.catch(Result.err)`): the error type is inferred from it.
 *
 * A non-`Error` value that slips past the type (through `any`, e.g. a
 * `.catch((e) => err(e))`) is normalized with `normalizeError`, so
 * `result.error` is always an `Error` at runtime.
 */
function err<E extends Error>(error: E): ErrResult<E> {
  return Object.freeze({
    ok: false as const,
    error: normalizeError(error) as E,
  });
}

/**
 * Check whether an arbitrary value is a `Result`: `{ ok: true, value }` or
 * `{ ok: false, error }` with an `Error`.  An object with both `value` and
 * `error` (an API response like `{ ok, value, error }`) is not a Result.
 * For decorators, interceptors and other generic code that receives
 * `unknown`.  Matches by shape, so a structurally equal object from another
 * copy of the library passes too.  Never throws.
 */
function isResult(value: unknown): value is Result<unknown, Error> {
  if (typeof value !== "object" || value === null) return false;
  try {
    const r = value as { ok?: unknown; error?: unknown };
    if (r.ok === true) return "value" in r && !("error" in r);
    if (r.ok === false) return isError(r.error) && !("value" in r);
    return false;
  } catch {
    // A revoked Proxy or a throwing getter is not a Result.
    return false;
  }
}

/** Narrow a `Result` to `OkResult`. */
function isOk<T, E extends Error>(result: Result<T, E>): result is OkResult<T> {
  return result.ok;
}

/** Narrow a `Result` to `ErrResult`. */
function isErr<T, E extends Error>(
  result: Result<T, E>
): result is ErrResult<E> {
  return !result.ok;
}

/**
 * The return type of `map` for a callback that returns a Promise.  It is
 * not a `Result`: `Ok(Promise)` would hide a rejection nobody awaits.
 * `never` (a callback that only throws) gets `R`, and `any` (`JSON.parse`)
 * gets `R` with the value `unknown`.  The check for `any` is written out,
 * not `IsAny<U>`: generic code returns this type unresolved, and it must
 * stay the type of 3.0.0 (test/compat.test-d.ts), as must
 * `AsyncInTryCatch` and `AsyncInMaybeMap`.
 */
type AsyncInMap<U, R> = [U] extends [never]
  ? R
  : 0 extends 1 & U
    ? Result<unknown, ErrorOf<R>>
    : {
        readonly "Result.map does not await. Await the value first, or use Result.tryCatchAsync for async work": never;
      };

/**
 * Transform the value inside an `Ok`, leaving `Err` unchanged.
 *
 * An async callback is rejected by the types: the result is not a `Result`,
 * so its first use is a compile error.  Generic callbacks compile.  The
 * runtime does not check this.
 */
// Overloads: 3.0.0, input, callback.  No `returns any`: the first 3.0.0
// overload takes such a callback (`any` satisfies `U extends
// PromiseLike<unknown>`), and `AsyncInMap` gives `unknown` for it.
function map<T, U extends PromiseLike<unknown>, E extends Error = never>(
  result: Result<T, E>,
  fn: (value: T) => U
): AsyncInMap<U, Result<U, E>>;
function map<T, U>(result: OkResult<T>, fn: (value: T) => U): OkResult<U>;
function map<E extends Error>(
  result: ErrResult<E>,
  fn: (value: never) => unknown
): ErrResult<E>;
function map<T, U, E extends Error = never>(
  result: Result<T, E>,
  fn: (value: T) => U
): Result<U, E>;
function map<I, U, P = unknown>(
  result: I,
  fn: (value: P) => U,
  ...untyped: OnlyIfAny<I>
): [U] extends [PromiseLike<unknown>]
  ? AsyncInMap<U, Result<U, Error>>
  : Result<U, Error>;
function map<I, C>(
  result: I & AnyResult,
  fn: C,
  ...untyped: OnlyIfAny<C>
): Result<unknown, ErrorOf<I>>;
function map<T, U, E extends Error>(
  result: Result<T, E>,
  fn: ((value: T) => U) | ((value: never) => unknown)
): Result<U, E> {
  return result.ok ? ok((fn as (value: T) => U)(result.value)) : result;
}

/** The result of `mapError` whose callback returns `any`: the error
 *  becomes `Error`, as the error of a `flatMap` callback that returns
 *  `any` does. */
type WithPlainError<I> =
  IsAny<I> extends true
    ? Result<unknown, Error>
    : [I] extends [OkResult<infer T>]
      ? OkResult<T>
      : [I] extends [ErrResult<Error>]
        ? ErrResult<Error>
        : Result<ValueOf<I>, Error>;

/** Transform the error inside an `Err`, leaving `Ok` unchanged. */
// Overloads: 3.0.0 (the first one), 3.0.0 copy, returns any, 3.0.0,
// input ×3, both.  The first 3.0.0 overload returns no `F` and needs no copy.
function mapError<T>(
  result: OkResult<T>,
  fn: (error: never) => Error
): OkResult<T>;
function mapError<E extends Error, F extends Error>(
  result: ErrResult<E>,
  fn: (error: E) => F,
  ...typed: OnlyIfTyped<F>
): ErrResult<F>;
function mapError<T, E extends Error, F extends Error>(
  result: Result<T, E>,
  fn: (error: E) => F,
  ...typed: OnlyIfTyped<F>
): Result<T, F>;
function mapError<I extends AnyResult, R>(
  result: I,
  fn: (error: ErrorOf<I>) => R,
  ...untyped: OnlyIfAny<R>
): WithPlainError<I>;
function mapError<E extends Error, F extends Error>(
  result: ErrResult<E>,
  fn: (error: E) => F
): ErrResult<F>;
function mapError<T, E extends Error, F extends Error>(
  result: Result<T, E>,
  fn: (error: E) => F
): Result<T, F>;
function mapError<I, F extends Error, P = Error>(
  result: I,
  fn: (error: P) => F,
  ...untyped: [...OnlyIfAny<I>, ...OnlyIfTyped<F>]
): Result<unknown, F>;
function mapError<I, F extends Error, P = Error>(
  result: I,
  fn: (error: P) => F,
  ...untyped: [...OnlyIfAny<I>, ...OnlyIfAny<F>]
): Result<unknown, Error>;
function mapError<I, F extends Error, P = Error>(
  result: I,
  fn: (error: P) => F,
  ...untyped: OnlyIfAny<I>
): Result<unknown, F>;
function mapError<I, C>(
  result: I,
  fn: C,
  ...untyped: [...OnlyIfAny<I>, ...OnlyIfAnyCallback<C>]
): Result<unknown, Error>;
function mapError<T, E extends Error, F extends Error>(
  result: Result<T, E>,
  fn: ((error: never) => Error) | ((error: E) => F)
): Result<T, F> {
  return result.ok ? result : err((fn as (error: E) => F)(result.error));
}

/** Run a side-effect on the `Ok` value without transforming the result. */
// Overloads: 3.0.0, input, both.
function inspect<T>(result: OkResult<T>, fn: (value: T) => void): OkResult<T>;
function inspect<T, E extends Error = never>(
  result: Result<T, E>,
  fn: (value: T) => void
): Result<T, E>;
function inspect<I, P = unknown>(
  result: I,
  fn: (value: P) => void,
  ...untyped: OnlyIfAny<I>
): Result<unknown, Error>;
function inspect<I, C>(
  result: I,
  fn: C,
  ...untyped: OnlyIfBothAny<I, C>
): Result<unknown, Error>;
function inspect<T, E extends Error>(
  result: Result<T, E>,
  fn: ((value: T) => void) | ((value: never) => void)
): Result<T, E> {
  if (result.ok) (fn as (value: T) => void)(result.value);
  return result;
}

/** Run a side-effect on the `Err` error without transforming the result. */
// Overloads: 3.0.0, input, both.
function inspectError<E extends Error>(
  result: ErrResult<E>,
  fn: (error: E) => void
): ErrResult<E>;
function inspectError<T, E extends Error>(
  result: Result<T, E>,
  fn: (error: E) => void
): Result<T, E>;
function inspectError<I, P = Error>(
  result: I,
  fn: (error: P) => void,
  ...untyped: OnlyIfAny<I>
): Result<unknown, Error>;
function inspectError<I, C>(
  result: I,
  fn: C,
  ...untyped: OnlyIfBothAny<I, C>
): Result<unknown, Error>;
function inspectError<T, E extends Error>(
  result: Result<T, E>,
  fn: ((error: E) => void) | ((error: never) => void)
): Result<T, E> {
  if (!result.ok) (fn as (error: E) => void)(result.error);
  return result;
}

/** Chain a `Result`-returning function on the `Ok` value. */
// Overloads: 3.0.0, input, returns any, callback.
function flatMap<
  T,
  U = never,
  E extends Error = never,
  F extends Error = never,
>(result: Result<T, E>, fn: (value: T) => Result<U, F>): Result<U, E | F>;
function flatMap<I, U, F extends Error = never, P = unknown>(
  result: I,
  fn: (value: P) => Result<U, F>,
  ...untyped: OnlyIfAny<I>
): Result<U, Error | F>;
function flatMap<I extends AnyResult, R>(
  result: I,
  fn: (value: ValueOf<I>) => R,
  ...untyped: OnlyIfAny<R>
): Result<unknown, ErrorOf<I> | Error>;
function flatMap<I, C>(
  result: I & AnyResult,
  fn: C,
  ...untyped: OnlyIfAny<C>
): Result<unknown, ErrorOf<I> | Error>;
function flatMap<T, U, E extends Error, F extends Error>(
  result: Result<T, E>,
  fn: ((value: T) => Result<U, F>) | ((value: never) => unknown)
): Result<U, E | F> {
  if (result.ok) return (fn as (value: T) => Result<U, F>)(result.value);
  return result;
}

/**
 * Recover from an error by applying `fn` to produce a new `Result`.
 * Alias: `flatMapErr`.
 */
// Overloads: 3.0.0, input, returns any, callback.
function orElse<T, E extends Error, F extends Error = never>(
  result: Result<T, E>,
  fn: (error: E) => Result<T, F>
): Result<T, F>;
function orElse<I, F extends Error = never, P = Error>(
  result: I,
  fn: (error: P) => Result<unknown, F>,
  ...untyped: OnlyIfAny<I>
): Result<unknown, F>;
function orElse<I extends AnyResult, R>(
  result: I,
  fn: (error: ErrorOf<I>) => R,
  ...untyped: OnlyIfAny<R>
): Result<unknown, Error>;
function orElse<I, C>(
  result: I & AnyResult,
  fn: C,
  ...untyped: OnlyIfAnyCallback<C>
): Result<unknown, Error>;
function orElse<T, E extends Error, F extends Error>(
  result: Result<T, E>,
  fn: ((error: E) => Result<T, F>) | ((error: never) => unknown)
): Result<T, F> {
  if (!result.ok) return (fn as (error: E) => Result<T, F>)(result.error);
  return result;
}

/**
 * Recover from an error by applying `fn` to produce a new `Result`.
 * Alias for `orElse`.
 */
// Overloads: 3.0.0, input, returns any, callback.
function flatMapErr<T, E extends Error, F extends Error = never>(
  result: Result<T, E>,
  fn: (error: E) => Result<T, F>
): Result<T, F>;
function flatMapErr<I, F extends Error = never, P = Error>(
  result: I,
  fn: (error: P) => Result<unknown, F>,
  ...untyped: OnlyIfAny<I>
): Result<unknown, F>;
function flatMapErr<I extends AnyResult, R>(
  result: I,
  fn: (error: ErrorOf<I>) => R,
  ...untyped: OnlyIfAny<R>
): Result<unknown, Error>;
function flatMapErr<I, C>(
  result: I & AnyResult,
  fn: C,
  ...untyped: OnlyIfAnyCallback<C>
): Result<unknown, Error>;
function flatMapErr<T, E extends Error, F extends Error>(
  result: Result<T, E>,
  fn: ((error: E) => Result<T, F>) | ((error: never) => unknown)
): Result<T, F> {
  return orElse(result, fn as (error: E) => Result<T, F>);
}

/*
 * One signature.  A function that is often passed point-free
 * (`rs.map(Result.unwrap)`) keeps one signature, because an overloaded
 * function loses its generic type there.  Its input has the type
 * `Result<T, E> | UntypedInput`, with a type parameter `UntypedInput extends
 * ErrResult<never>` (`Some<never>` for a Maybe).  TypeScript infers into a
 * bare union member only what it could not infer into the rest of the
 * union, so `UntypedInput` is `any` for an `any` input only (and `never` for
 * a `never` input, which keeps the typed result).  Any other input, generic
 * code and explicit type arguments leave it at its default, which:
 *   - holds no value and is a subtype of `Result<T, E>`, so the input
 *     accepts what the typed signature accepted;
 *   - is a Result (a Maybe), so the `no-unwrap` rule still recognizes
 *     `unwrap` by its first parameter;
 *   - is not a type parameter, so generic code gets the typed result, not
 *     a deferred conditional type.
 * The return type is `IsAny<UntypedInput> extends true ? <untyped> :
 * <typed>`.  A bare `UntypedValue` next to the value inside the input
 * (`flatten`, `Maybe.transpose`) works the same way and adds `Error`, as
 * the value may then be any Result; a `never` value (`Result<never, E>`)
 * holds nothing and adds nothing.
 */

/** Flatten a nested `Result<Result<T, E>, F>` into `Result<T, E | F>`.
 *  Throws a `TypeError` when the input or its `Ok` value is not a Result.
 *  One signature, so `nested.map(Result.flatten)` keeps its type; an
 *  untyped input gives `Result<unknown, Error>`, and an untyped value
 *  inside adds `Error`. */
function flatten<
  T,
  E extends Error = never,
  F extends Error = never,
  UntypedInput extends ErrResult<never> = ErrResult<never>,
  UntypedValue extends ErrResult<never> = ErrResult<never>,
>(
  result: Result<Result<T, E> | UntypedValue, F> | UntypedInput
): IsAny<UntypedInput> extends true
  ? Result<unknown, Error>
  : Result<T, E | F | ErrorIfAny<UntypedValue, never>>;
function flatten(input: unknown): AnyResult {
  const result = expectResult(input, "Result.flatten", "input");
  return result.ok
    ? expectResult(result.value, "Result.flatten", "value")
    : result;
}

/** Exhaustively handle both `Ok` and `Err` branches.  The branches may
 *  return different types; the result is their union.  An untyped handler
 *  counts as one that returns `unknown`: TypeScript does not know what it
 *  returns.  A handler that returns `any` gives `any`.  Throws a
 *  `TypeError` when the input is not a Result, before calling a handler. */
// Overloads: 3.0.0, handler, input, both.  `handler` takes an untyped `err`
// next to a typed `ok`; an untyped `ok` needs none, its result defaults to
// `unknown`.  In `input` each handler parameter has its own type parameter,
// so annotating one does not change the other.
function match<T = never, E extends Error = never, A = unknown, B = A>(
  result: Result<T, E>,
  handlers: { ok: (value: T) => A; err: (error: E) => B }
): A | B;
function match<T, E extends Error, A, H>(
  result: Result<T, E>,
  handlers: { ok: (value: T) => A; err: H },
  ...untyped: OnlyIfAny<H>
): unknown;
function match<I, A = unknown, B = A, P = unknown, Q extends Error = Error>(
  result: I,
  handlers: { ok: (value: P) => A; err: (error: Q) => B },
  ...untyped: OnlyIfAny<I>
): A | B;
function match<I, H>(
  result: I,
  handlers: H,
  ...untyped: OnlyIfBothAny<I, H>
): unknown;
function match<T, E extends Error, A, B>(
  input: Result<T, E>,
  handlers: { ok: (value: T) => A; err: (error: E) => B }
): A | B {
  const result = expectResult(input, "Result.match", "input") as Result<T, E>;
  return result.ok ? handlers.ok(result.value) : handlers.err(result.error);
}

/** A primitive for the message of `exhaustive`.  Objects and functions
 *  are not serialized: a Result or a payload may carry tokens or personal
 *  data, and messages end up in logs. */
function describeCase(value: unknown): string {
  switch (typeof value) {
    case "object":
      return value === null ? "null" : "<object>";
    case "function":
      return "<function>";
    case "string":
      return JSON.stringify(value);
    default:
      return String(value);
  }
}

/** Compile-time exhaustiveness guard — only accepts `never`.  At runtime
 *  it throws `Unhandled result case: <value>` for a primitive and
 *  `Unhandled result case: <object>` for an object, with the value as
 *  `cause`. */
function exhaustive(value: never): never {
  throw new Error(`Unhandled result case: ${describeCase(value)}`, {
    cause: value,
  });
}

/** Return the `Ok` value or throw the contained error.  An untyped input
 *  gives `unknown`.  An input that is not a Result throws a `TypeError`. */
function unwrap<
  T = never,
  E extends Error = never,
  UntypedInput extends ErrResult<never> = ErrResult<never>,
>(
  result: Result<T, E> | UntypedInput
): IsAny<UntypedInput> extends true ? unknown : T;
function unwrap(input: unknown): unknown {
  const result = expectResult(input, "Result.unwrap", "input");
  if (result.ok) return result.value;
  throw result.error;
}

/** Return the `Err` error or throw.  The inverse of `unwrap`, mostly for
 *  tests: it reads `r.error` without narrowing first.  The thrown error does
 *  not carry the `Ok` value, which may be sensitive.  An untyped input gives
 *  `Error`.  An input that is not a Result throws a `TypeError`. */
function unwrapErr<
  T = never,
  E extends Error = never,
  UntypedInput extends ErrResult<never> = ErrResult<never>,
>(
  result: Result<T, E> | UntypedInput
): IsAny<UntypedInput> extends true ? Error : E;
function unwrapErr(input: unknown): Error {
  const result = expectResult(input, "Result.unwrapErr", "input");
  if (!result.ok) return result.error;
  throw new Error("Called unwrapErr on Ok");
}

/**
 * Return the `Ok` value or `fallback`.
 *
 * The fallback must be the same type `T` as the success value.  This is
 * intentional — use `match` when you need a different return type.  An
 * input that is not a Result throws a `TypeError`.
 */
// Overloads: 3.0.0, input.
function unwrapOr<T, E extends Error>(result: Result<T, E>, fallback: T): T;
function unwrapOr<I>(
  result: I,
  fallback: unknown,
  ...untyped: OnlyIfAny<I>
): unknown;
function unwrapOr<T, E extends Error>(input: Result<T, E>, fallback: T): T {
  const result = expectResult(input, "Result.unwrapOr", "input") as Result<
    T,
    E
  >;
  return result.ok ? result.value : fallback;
}

/** Return the `Ok` value, or compute a fallback from the error.  An input
 *  that is not a Result throws a `TypeError`. */
function unwrapOrElse<T, E extends Error>(
  result: Result<T, E>,
  fn: (error: E) => T
): T {
  const checked = expectResult(result, "Result.unwrapOrElse", "input");
  return checked.ok ? (checked.value as T) : fn(checked.error as E);
}

type Split<T, E extends Error> =
  | readonly [failure: ErrResult<E>, value: undefined]
  | readonly [failure: undefined, value: T];

/**
 * Split a `Result` into a `[failure, value]` tuple.  Checking `failure`
 * narrows `value` to `T`, and `failure` can be returned as is.  An untyped
 * input gives `Split<unknown, Error>`.  An input that is not a Result throws
 * a `TypeError`.
 */
function split<
  T = never,
  E extends Error = never,
  UntypedInput extends ErrResult<never> = ErrResult<never>,
>(
  result: Result<T, E> | UntypedInput
): IsAny<UntypedInput> extends true ? Split<unknown, Error> : Split<T, E>;
function split(input: unknown): Split<unknown, Error> {
  const result = expectResult(input, "Result.split", "input");
  return result.ok ? [undefined, result.value] : [result, undefined];
}

/** Convert a nullable value to a `Result`. */
// Overloads: returns any, 3.0.0.  `returns any` has the parameters of the
// 3.0.0 overload, so it may come first.
function fromNullable<T, E extends Error>(
  value: T | null | undefined,
  errorFactory: () => E,
  ...untyped: OnlyIfAny<E>
): Result<NonNullable<T>, Error>;
function fromNullable<T, E extends Error>(
  value: T | null | undefined,
  errorFactory: () => E
): Result<NonNullable<T>, E>;
function fromNullable<T, E extends Error>(
  value: T | null | undefined,
  errorFactory: () => E
): Result<NonNullable<T>, E> {
  return value != null ? ok(value) : err(errorFactory());
}

/** Convert a predicate check to a `Result`.  Supports type-guard predicates.
 *  The error factory receives the rejected value. */
// Overloads: 3.0.0 copy, returns any, 3.0.0.
function fromPredicate<T, S extends T, E extends Error>(
  value: T,
  predicate: (value: T) => value is S,
  errorFactory: (value: T) => E,
  ...typed: OnlyIfTyped<E>
): Result<S, E>;
function fromPredicate<T, E extends Error>(
  value: T,
  predicate: (value: T) => boolean,
  errorFactory: (value: T) => E,
  ...typed: OnlyIfTyped<E>
): Result<T, E>;
function fromPredicate<T, S extends T, E extends Error>(
  value: T,
  predicate: (value: T) => value is S,
  errorFactory: (value: T) => E,
  ...untyped: OnlyIfAny<E>
): Result<S, Error>;
function fromPredicate<T, E extends Error>(
  value: T,
  predicate: (value: T) => boolean,
  errorFactory: (value: T) => E,
  ...untyped: OnlyIfAny<E>
): Result<T, Error>;
function fromPredicate<T, S extends T, E extends Error>(
  value: T,
  predicate: (value: T) => value is S,
  errorFactory: (value: T) => E
): Result<S, E>;
function fromPredicate<T, E extends Error>(
  value: T,
  predicate: (value: T) => boolean,
  errorFactory: (value: T) => E
): Result<T, E>;
function fromPredicate<T, E extends Error>(
  value: T,
  predicate: (value: T) => boolean,
  errorFactory: (value: T) => E
): Result<T, E> {
  return predicate(value) ? ok(value) : err(errorFactory(value));
}

/** `util.types.isNativeError` of Node, which checks the internal slot like
 *  `Error.isError`.  Node 20 and 22 have no `Error.isError`; from 20.16 /
 *  22.3 they reach node:util synchronously through
 *  `process.getBuiltinModule`, also from an ES module.  Elsewhere
 *  `undefined`. */
function nodeIsNativeError(): unknown {
  try {
    const node = (
      globalThis as {
        process?: { getBuiltinModule?: (id: string) => unknown };
      }
    ).process;
    const util = node?.getBuiltinModule?.("node:util") as
      | { types?: { isNativeError?: unknown } }
      | undefined;
    return util?.types?.isNativeError;
  } catch {
    return undefined;
  }
}

/** A check of the internal slot of an Error: `Error.isError`, else Node's
 *  `isNativeError`.  Polyfills for runtimes without `Error.isError` may read
 *  the tag instead — the core-js sham does — and then `{
 *  [Symbol.toStringTag]: "Error" }` passes.  A check that accepts that
 *  object, or rejects a real Error, is not used. */
function findSlotCheck(): ((value: unknown) => boolean) | undefined {
  const fake = { [Symbol.toStringTag]: "Error" };
  const fits = (fn: unknown): ((value: unknown) => boolean) | undefined => {
    if (typeof fn !== "function") return undefined;
    try {
      const check = (value: unknown) => fn.call(Error, value) === true;
      return check(new Error("probe")) && !check(fake) ? check : undefined;
    } catch {
      return undefined;
    }
  };
  return (
    fits((Error as { isError?: unknown }).isError) ?? fits(nodeIsNativeError())
  );
}

const slotCheck = findSlotCheck();
const objectToString = Object.prototype.toString;

/** A real Error object, from any realm, by its internal slot.  Without a
 *  check of the slot (a browser without `Error.isError`, Node before 20.16
 *  / 22.3) the built-in tag is used: it reads "Error" only from that slot,
 *  and only when no `Symbol.toStringTag` overrides it, so an object that
 *  sets the tag itself does not pass — nor does a real Error that sets it. */
function hasErrorSlot(value: unknown): boolean {
  if (slotCheck) return slotCheck(value);
  return (
    typeof value === "object" &&
    value !== null &&
    !(Symbol.toStringTag in value) &&
    objectToString.call(value) === "[object Error]"
  );
}

/**
 * An `Error`: a real Error object from any realm (vm, iframe), or an object
 * that inherits from `Error.prototype` and has a string `message`.  A real
 * Error is accepted whatever its `message` is, so it keeps its identity and
 * class.  `{ [Symbol.toStringTag]: "Error" }` does not pass, with or without
 * `Error.isError`.  Never throws: a revoked Proxy or a throwing getter gives
 * `false`.
 */
function isError(value: unknown): value is Error {
  try {
    return (
      hasErrorSlot(value) ||
      (value instanceof Error &&
        typeof (value as { message?: unknown }).message === "string")
    );
  } catch {
    return false;
  }
}

/**
 * Convert an unknown thrown value to an `Error` instance.
 *
 * Errors pass through unchanged, also a real Error whose `message` is not a
 * string: it keeps its identity, so its `message` is not a string although
 * the type says so.  Primitives become `new Error(String(v))`.
 * Objects are never serialized into the message — a rejected HTTP response
 * or config object may carry tokens or headers. The message is the object's
 * own string `message` if it has one, otherwise a fixed text; the original
 * object stays available as `cause`.
 */
function normalizeError(error: unknown): Error {
  if (isError(error)) return error;
  if (
    (typeof error === "object" && error !== null) ||
    typeof error === "function"
  ) {
    let message: unknown;
    try {
      message = (error as { message?: unknown }).message;
    } catch {
      // A throwing getter — fall back to the fixed message.
    }
    return new Error(
      typeof message === "string" ? message : "Non-Error object thrown",
      { cause: error }
    );
  }
  return new Error(String(error));
}

/** Map a caught value with `onError`, or normalize it.  Whatever `onError`
 *  throws propagates unchanged, so a mapper can turn known errors into `Err`
 *  and rethrow the rest.  Something other than a function is no `onError`:
 *  `fns.map(Result.tryCatch)` passes the index there, and the types accept
 *  that call through the overload without `onError`. */
function toError<E extends Error>(
  error: unknown,
  onError: ((error: unknown) => E) | undefined
): E | Error {
  return typeof onError === "function" ? onError(error) : normalizeError(error);
}

function isPromiseLike(value: unknown): value is PromiseLike<unknown> {
  if (
    (typeof value !== "object" || value === null) &&
    typeof value !== "function"
  ) {
    return false;
  }
  try {
    return typeof (value as { then?: unknown }).then === "function";
  } catch {
    return false;
  }
}

/**
 * The return type of `tryCatch` for a function that returns a Promise.  It
 * is not a `Result`, so the first use — `.ok`, `Result.map(...)`, a return
 * typed `Result` — is a compile error that names `tryCatchAsync`.
 * `never` (a function that only throws) gets `R`, and `any` (`JSON.parse`)
 * gets `R` with the value `unknown`: both satisfy `T extends PromiseLike`.
 */
type AsyncInTryCatch<T, R> = [T] extends [never]
  ? R
  : 0 extends 1 & T
    ? Result<unknown, ErrorOf<R>>
    : {
        readonly "Result.tryCatch does not await. Use Result.tryCatchAsync for functions that return a Promise": never;
      };

/**
 * Wrap a synchronous function that may throw into a `Result`.
 *
 * For a function that returns a Promise the result type is not a `Result`,
 * so using it does not compile — use `tryCatchAsync`.  The check is done by
 * overloads, not by a conditional parameter type, so generic code such as
 * `<T>(f: () => T) => Result.tryCatch(f)` compiles.
 *
 * At runtime a returned thenable gives an `Err`: a `TypeError` with the
 * thenable as `cause`, passed through `onError` like a thrown error.  `fn`
 * has already run by then, so an async function has started its work and
 * its side effects.  tryCatch never calls `then`: a lazy thenable (a query
 * builder) does not run, and the rejection of a Promise is not handled — it
 * surfaces as an unhandled rejection, like any Promise nobody awaits, which
 * crashes Node by default.
 *
 * Whatever `onError` throws propagates unchanged: return an error to get an
 * `Err`, rethrow to let the error through.
 */
// Overloads: 3.0.0 copy (those with `onError`), returns any, 3.0.0, input
// (without `onError`), input ×3, both.  `input` takes an `any` `fn`.  No
// overload for a `fn` that returns `any`: `AsyncInTryCatch` gives `unknown`
// for it.
function tryCatch<T extends PromiseLike<unknown>, E extends Error>(
  fn: () => T,
  onError: (error: unknown) => E,
  ...typed: OnlyIfTyped<E>
): AsyncInTryCatch<T, Result<T, E>>;
function tryCatch<T, E extends Error>(
  fn: () => T,
  onError: (error: unknown) => E,
  ...typed: OnlyIfTyped<E>
): Result<T, E>;
function tryCatch<T extends PromiseLike<unknown>, E extends Error>(
  fn: () => T,
  onError: (error: unknown) => E,
  ...untyped: OnlyIfAny<E>
): AsyncInTryCatch<T, Result<T, Error>>;
function tryCatch<T, E extends Error>(
  fn: () => T,
  onError: (error: unknown) => E,
  ...untyped: OnlyIfAny<E>
): Result<T, Error>;
function tryCatch<T extends PromiseLike<unknown>>(
  fn: () => T
): AsyncInTryCatch<T, Result<T, Error>>;
function tryCatch<T extends PromiseLike<unknown>, E extends Error>(
  fn: () => T,
  onError: (error: unknown) => E
): AsyncInTryCatch<T, Result<T, E>>;
function tryCatch<T>(fn: () => T): Result<T, Error>;
function tryCatch<T, E extends Error>(
  fn: () => T,
  onError: (error: unknown) => E
): Result<T, E>;
function tryCatch<C>(fn: C, ...untyped: OnlyIfAny<C>): Result<unknown, Error>;
function tryCatch<C, E extends Error>(
  fn: C,
  onError: (error: unknown) => E,
  ...untyped: [...OnlyIfAny<C>, ...OnlyIfTyped<E>]
): Result<unknown, E>;
function tryCatch<C, E extends Error>(
  fn: C,
  onError: (error: unknown) => E,
  ...untyped: [...OnlyIfAny<C>, ...OnlyIfAny<E>]
): Result<unknown, Error>;
function tryCatch<C, E extends Error>(
  fn: C,
  onError: (error: unknown) => E,
  ...untyped: OnlyIfAny<C>
): Result<unknown, E>;
function tryCatch<C, O>(
  fn: C,
  onError: O,
  ...untyped: [...OnlyIfAny<C>, ...OnlyIfAnyCallback<O>]
): Result<unknown, Error>;
function tryCatch<T, E extends Error>(
  fn: () => T,
  onError?: (error: unknown) => E
): Result<T, E | Error> {
  let value: T;
  try {
    value = fn();
  } catch (error) {
    return err(toError(error, onError));
  }
  if (isPromiseLike(value)) {
    // `then` is never called: on a lazy thenable (a query builder) it would
    // run the query, and on a Promise it would hide a rejection that the
    // caller never awaited.  The TypeError goes through `onError` like a
    // thrown error: generic code types the error as what `onError` returns.
    const misuse = new TypeError(
      "Result.tryCatch: fn returned a Promise, which tryCatch does not await. Use Result.tryCatchAsync.",
      { cause: value }
    );
    return err(toError(misuse, onError));
  }
  return ok(value);
}

/**
 * Wrap an asynchronous function that may reject into a `Result`.
 *
 * If `onError` throws, the returned promise rejects with that error.
 */
// Overloads: 3.0.0 copy, input (without `onError`), input ×3, returns any,
// 3.0.0.  The copies skip an `any` value `T` and an `onError` that returns
// `any`; `input` takes an `any` value `T`.  The copy with `onError` checks
// `T` with `OnlyIfNotAny`, which lets `unknown` pass: TypeScript infers
// `unknown` for the value of an `any` function or Promise, and the copy
// must pass the first check for an unannotated `onError` that returns
// `any` to reach `returns any`, see `OnlyIfTyped`.
function tryCatchAsync<T>(
  fn: () => PromiseLike<T>,
  ...typed: OnlyIfTyped<T>
): Promise<Result<T, Error>>;
function tryCatchAsync<T, E extends Error>(
  fn: () => PromiseLike<T>,
  onError: (error: unknown) => E,
  ...typed: [...OnlyIfNotAny<T>, ...OnlyIfTyped<E>]
): Promise<Result<T, E>>;
function tryCatchAsync<T>(
  fn: () => PromiseLike<T>,
  ...untyped: OnlyIfAny<T>
): Promise<Result<unknown, Error>>;
function tryCatchAsync<T, E extends Error>(
  fn: () => PromiseLike<T>,
  onError: (error: unknown) => E,
  ...untyped: [...OnlyIfAny<T>, ...OnlyIfTyped<E>]
): Promise<Result<unknown, E>>;
function tryCatchAsync<T, E extends Error>(
  fn: () => PromiseLike<T>,
  onError: (error: unknown) => E,
  ...untyped: [...OnlyIfAny<T>, ...OnlyIfAny<E>]
): Promise<Result<unknown, Error>>;
function tryCatchAsync<T, E extends Error>(
  fn: () => PromiseLike<T>,
  onError: (error: unknown) => E,
  ...untyped: OnlyIfAny<T>
): Promise<Result<unknown, E>>;
function tryCatchAsync<T, E extends Error>(
  fn: () => PromiseLike<T>,
  onError: (error: unknown) => E,
  ...untyped: OnlyIfAny<E>
): Promise<Result<T, Error>>;
function tryCatchAsync<T>(fn: () => PromiseLike<T>): Promise<Result<T, Error>>;
function tryCatchAsync<T, E extends Error>(
  fn: () => PromiseLike<T>,
  onError: (error: unknown) => E
): Promise<Result<T, E>>;
async function tryCatchAsync<T, E extends Error>(
  fn: () => PromiseLike<T>,
  onError?: (error: unknown) => E
): Promise<Result<T, E | Error>> {
  try {
    return ok(await fn());
  } catch (error) {
    return err(toError(error, onError));
  }
}

/**
 * Wrap a `Promise` that may reject into a `Result`.
 *
 * If `onError` throws, the returned promise rejects with that error.
 */
// Overloads: 3.0.0 copy, input (without `onError`), input ×3, returns any,
// 3.0.0, as in `tryCatchAsync`.
function fromPromise<T>(
  promise: PromiseLike<T>,
  ...typed: OnlyIfTyped<T>
): Promise<Result<T, Error>>;
function fromPromise<T, E extends Error>(
  promise: PromiseLike<T>,
  onError: (error: unknown) => E,
  ...typed: [...OnlyIfNotAny<T>, ...OnlyIfTyped<E>]
): Promise<Result<T, E>>;
function fromPromise<T>(
  promise: PromiseLike<T>,
  ...untyped: OnlyIfAny<T>
): Promise<Result<unknown, Error>>;
function fromPromise<T, E extends Error>(
  promise: PromiseLike<T>,
  onError: (error: unknown) => E,
  ...untyped: [...OnlyIfAny<T>, ...OnlyIfTyped<E>]
): Promise<Result<unknown, E>>;
function fromPromise<T, E extends Error>(
  promise: PromiseLike<T>,
  onError: (error: unknown) => E,
  ...untyped: [...OnlyIfAny<T>, ...OnlyIfAny<E>]
): Promise<Result<unknown, Error>>;
function fromPromise<T, E extends Error>(
  promise: PromiseLike<T>,
  onError: (error: unknown) => E,
  ...untyped: OnlyIfAny<T>
): Promise<Result<unknown, E>>;
function fromPromise<T, E extends Error>(
  promise: PromiseLike<T>,
  onError: (error: unknown) => E,
  ...untyped: OnlyIfAny<E>
): Promise<Result<T, Error>>;
function fromPromise<T>(promise: PromiseLike<T>): Promise<Result<T, Error>>;
function fromPromise<T, E extends Error>(
  promise: PromiseLike<T>,
  onError: (error: unknown) => E
): Promise<Result<T, E>>;
async function fromPromise<T, E extends Error>(
  promise: PromiseLike<T>,
  onError?: (error: unknown) => E
): Promise<Result<T, E | Error>> {
  try {
    return ok(await promise);
  } catch (error) {
    return err(toError(error, onError));
  }
}

/**
 * Combine multiple `Result`s into a single `Result` containing a tuple of
 * values.  Returns the first `Err` encountered (fail-fast).
 *
 * Pass results as arguments, or as one array — `all(results)` for a
 * dynamic list.  Do not spread a large array into arguments: around 150k
 * elements that throws `RangeError`.
 */
function all<const R extends readonly AnyResult[]>(
  results: R
): Result<TupleValues<R>, TupleErrors<R>>;
function all<const R extends readonly AnyResult[]>(
  ...results: R
): Result<TupleValues<R>, TupleErrors<R>>;
function all(...args: readonly unknown[]): AnyResult {
  return allOrFirstErr(expectResults(listArgs(args), "Result.all"));
}

/**
 * Like `all`, but accepts promises of `Result`s.  All promises are resolved
 * concurrently via `Promise.allSettled` before checking for errors.
 *
 * Promises are expected to resolve to `Result`s — not reject.  If a promise
 * does reject, the rejection is caught and wrapped as an `Err`.
 */
function allAsync<const R extends readonly PromiseLike<AnyResult>[]>(
  promises: R
): Promise<
  Result<
    { [K in keyof R]: ValueOf<Awaited<R[K]>> },
    ErrorOf<Awaited<R[number]>> | Error
  >
>;
function allAsync<const R extends readonly PromiseLike<AnyResult>[]>(
  ...promises: R
): Promise<
  Result<
    { [K in keyof R]: ValueOf<Awaited<R[K]>> },
    ErrorOf<Awaited<R[number]>> | Error
  >
>;
async function allAsync(...args: readonly unknown[]): Promise<AnyResult> {
  const settled = await Promise.allSettled(listArgs(args));
  return allOrFirstErr(settledResults(settled, "Result.allAsync"));
}

/**
 * Like `collect`, but for promises of `Result`s.  Resolves all promises
 * via `Promise.allSettled`, then collects all errors.  Returns an
 * `AggregateError` containing every error found; a rejection is normalized
 * to `Error`, so `.errors` is typed `(E | Error)[]`.
 */
function collectAsync<const R extends readonly PromiseLike<AnyResult>[]>(
  promises: R
): Promise<
  Result<
    { [K in keyof R]: ValueOf<Awaited<R[K]>> },
    AggregateErrorOf<ErrorOf<Awaited<R[number]>> | Error>
  >
>;
function collectAsync<const R extends readonly PromiseLike<AnyResult>[]>(
  ...promises: R
): Promise<
  Result<
    { [K in keyof R]: ValueOf<Awaited<R[K]>> },
    AggregateErrorOf<ErrorOf<Awaited<R[number]>> | Error>
  >
>;
async function collectAsync(...args: readonly unknown[]): Promise<AnyResult> {
  const settled = await Promise.allSettled(listArgs(args));
  return allOrEveryErr(
    settledResults(settled, "Result.collectAsync"),
    "Result.collectAsync"
  );
}

/**
 * Combine multiple `Result`s, collecting **all** errors instead of
 * short-circuiting on the first one.  Returns an `AggregateError` whose
 * `.errors` array contains every individual error.
 */
function collect<const R extends readonly AnyResult[]>(
  results: R
): Result<TupleValues<R>, AggregateErrorOf<TupleErrors<R>>>;
function collect<const R extends readonly AnyResult[]>(
  ...results: R
): Result<TupleValues<R>, AggregateErrorOf<TupleErrors<R>>>;
function collect(...args: readonly unknown[]): AnyResult {
  return allOrEveryErr(
    expectResults(listArgs(args), "Result.collect"),
    "Result.collect"
  );
}

// ===========================================================================
// Maybe
// ===========================================================================

/** A `Maybe` that contains a value of type `T`. */
export type Some<T> = {
  readonly some: true;
  readonly value: T;
};

/** A `Maybe` that contains no value. */
export type None = {
  readonly some: false;
};

/**
 * A value that is either present (`Some<T>`) or absent (`None`).
 * Use `Maybe.some` / `Maybe.none` to construct, and the companion `Maybe.*`
 * functions to transform.
 */
export type Maybe<T> = Some<T> | None;

type AnyMaybe = Maybe<unknown>;

/** `{ some: true, value }` or `{ some: false }` without a value, the
 *  counterpart of `isResult`.  Never throws. */
function isMaybe(value: unknown): value is AnyMaybe {
  if (typeof value !== "object" || value === null) return false;
  try {
    const m = value as { some?: unknown };
    if (m.some === true) return "value" in m;
    if (m.some === false) return !("value" in m);
    return false;
  } catch {
    // A revoked Proxy or a throwing getter is not a Maybe.
    return false;
  }
}

/** See `expectResult`. */
function expectMaybe(value: unknown, fn: string, part: Part): AnyMaybe {
  if (isMaybe(value)) return value;
  throw new TypeError(`${fn}: ${partName(part)} is not a Maybe`);
}

/** See `expectResults`; every item is checked before the first `None` is
 *  returned. */
function expectMaybes(items: readonly unknown[], fn: string): AnyMaybe[] {
  return Array.from(items, (item, i) => expectMaybe(item, fn, i));
}

/** `Some` of every value, or `None` if one is missing. */
function everySome(maybes: readonly AnyMaybe[]): AnyMaybe {
  const values: unknown[] = [];
  for (const m of maybes) {
    if (!m.some) return NONE;
    values.push(m.value);
  }
  return some(values);
}

type MaybeValueOf<M> = M extends Some<infer T> ? T : never;

type TupleMaybeValues<M extends readonly AnyMaybe[]> = {
  [K in keyof M]: MaybeValueOf<M[K]>;
};

/** Create a `Maybe` containing `value`. */
function some<T>(value: T): Some<T> {
  return Object.freeze({
    some: true as const,
    value,
  });
}

// One `None` per process, shared by the CJS and ESM builds (and any copy
// of this version that a bundler duplicates), so `none() === none()` holds
// even when both builds are loaded.  A value already under the key is used
// only if it is a frozen plain `{ some: false }`; otherwise, or when the
// global object is not extensible, this copy keeps its own `None`.  The
// registration is read-only, also when an older copy made it writable.
const NONE_KEY = Symbol.for("@semyonf/kamchazky/none");

function isNoneObject(value: unknown): value is None {
  if (typeof value !== "object" || value === null) return false;
  if (!Object.isFrozen(value)) return false;
  if (Object.getPrototypeOf(value) !== Object.prototype) return false;
  const keys = Reflect.ownKeys(value);
  const flag = Object.getOwnPropertyDescriptor(value, "some");
  return keys.length === 1 && flag !== undefined && flag.value === false;
}

function sharedNone(): None {
  const own: None = Object.freeze({ some: false as const });
  try {
    const existing = (globalThis as { [NONE_KEY]?: unknown })[NONE_KEY];
    if (isNoneObject(existing)) {
      // A copy of 3.0.0 registers with a plain assignment, which leaves the
      // property writable.  An accessor is left as is.
      const current = Object.getOwnPropertyDescriptor(globalThis, NONE_KEY);
      if (current && "value" in current && current.writable) {
        Object.defineProperty(globalThis, NONE_KEY, {
          writable: false,
          configurable: false,
        });
      }
      return existing;
    }
    if (existing === undefined && Object.isExtensible(globalThis)) {
      Object.defineProperty(globalThis, NONE_KEY, { value: own });
    }
  } catch {
    // A throwing getter or a locked-down global: keep our own None.
  }
  return own;
}

const NONE: None = sharedNone();

/** Create an empty `Maybe`. */
function none(): None {
  return NONE;
}

/** Narrow a `Maybe` to `Some`. */
function isSome<T>(maybe: Maybe<T>): maybe is Some<T> {
  return maybe.some;
}

/** Narrow a `Maybe` to `None`. */
function isNone<T>(maybe: Maybe<T>): maybe is None {
  return !maybe.some;
}

/**
 * The return type of `Maybe.map` for a callback that returns a Promise; not
 * a `Maybe`, see `AsyncInMap`.
 */
type AsyncInMaybeMap<U, R> = [U] extends [never]
  ? R
  : 0 extends 1 & U
    ? Maybe<unknown>
    : {
        readonly "Maybe.map does not await. Await the value first": never;
      };

/**
 * Transform the value inside a `Some`, leaving `None` unchanged.
 *
 * An async callback is rejected by the types, as in `Result.map`.
 */
// Overloads: 3.0.0, input, callback.  No `returns any`, as in `Result.map`.
function maybeMap<T, U extends PromiseLike<unknown>>(
  maybe: Maybe<T>,
  fn: (value: T) => U
): AsyncInMaybeMap<U, Maybe<U>>;
function maybeMap<T, U>(maybe: Some<T>, fn: (value: T) => U): Some<U>;
function maybeMap(maybe: None, fn: (value: never) => unknown): None;
function maybeMap<T, U>(maybe: Maybe<T>, fn: (value: T) => U): Maybe<U>;
function maybeMap<I, U, P = unknown>(
  maybe: I,
  fn: (value: P) => U,
  ...untyped: OnlyIfAny<I>
): [U] extends [PromiseLike<unknown>] ? AsyncInMaybeMap<U, Maybe<U>> : Maybe<U>;
function maybeMap<I, C>(
  maybe: I & AnyMaybe,
  fn: C,
  ...untyped: OnlyIfAny<C>
): Maybe<unknown>;
function maybeMap<T, U>(
  maybe: Maybe<T>,
  fn: ((value: T) => U) | ((value: never) => unknown)
): Maybe<U> {
  return maybe.some ? some((fn as (value: T) => U)(maybe.value)) : NONE;
}

/** Chain a `Maybe`-returning function on the `Some` value. */
// Overloads: 3.0.0, input, returns any, callback.
function maybeFlatMap<T, U = never>(
  maybe: Maybe<T>,
  fn: (value: T) => Maybe<U>
): Maybe<U>;
function maybeFlatMap<I, U = never, P = unknown>(
  maybe: I,
  fn: (value: P) => Maybe<U>,
  ...untyped: OnlyIfAny<I>
): Maybe<U>;
function maybeFlatMap<I extends AnyMaybe, R>(
  maybe: I,
  fn: (value: MaybeValueOf<I>) => R,
  ...untyped: OnlyIfAny<R>
): Maybe<unknown>;
function maybeFlatMap<I, C>(
  maybe: I & AnyMaybe,
  fn: C,
  ...untyped: OnlyIfAny<C>
): Maybe<unknown>;
function maybeFlatMap<T, U>(
  maybe: Maybe<T>,
  fn: ((value: T) => Maybe<U>) | ((value: never) => unknown)
): Maybe<U> {
  return maybe.some ? (fn as (value: T) => Maybe<U>)(maybe.value) : NONE;
}

/** Flatten a nested `Maybe<Maybe<T>>` into `Maybe<T>`.  Throws a
 *  `TypeError` when the input or its `Some` value is not a Maybe. */
function maybeFlatten<T>(maybe: Maybe<Maybe<T>>): Maybe<T> {
  const outer = expectMaybe(maybe, "Maybe.flatten", "input");
  if (!outer.some) return NONE;
  return expectMaybe(outer.value, "Maybe.flatten", "value") as Maybe<T>;
}

/** Keep the `Some` value only if `predicate` returns true. */
function maybeFilter<T, S extends T>(
  maybe: Maybe<T>,
  predicate: (value: T) => value is S
): Maybe<S>;
function maybeFilter<T>(
  maybe: Maybe<T>,
  predicate: (value: T) => boolean
): Maybe<T>;
function maybeFilter<T>(
  maybe: Maybe<T>,
  predicate: (value: T) => boolean
): Maybe<T> {
  return maybe.some && predicate(maybe.value) ? maybe : NONE;
}

/** Run a side-effect on the `Some` value without transforming the maybe. */
// Overloads: 3.0.0, input, both.
function maybeInspect<T>(maybe: Some<T>, fn: (value: T) => void): Some<T>;
function maybeInspect<T>(maybe: Maybe<T>, fn: (value: T) => void): Maybe<T>;
function maybeInspect<I, P = unknown>(
  maybe: I,
  fn: (value: P) => void,
  ...untyped: OnlyIfAny<I>
): Maybe<unknown>;
function maybeInspect<I, C>(
  maybe: I,
  fn: C,
  ...untyped: OnlyIfBothAny<I, C>
): Maybe<unknown>;
function maybeInspect<T>(
  maybe: Maybe<T>,
  fn: ((value: T) => void) | ((value: never) => void)
): Maybe<T> {
  if (maybe.some) (fn as (value: T) => void)(maybe.value);
  return maybe;
}

/** Exhaustively handle both `Some` and `None` branches.  The branches may
 *  return different types; the result is their union.  Untyped handlers
 *  give `unknown`, as in `Result.match`.  Throws a `TypeError` when the
 *  input is not a Maybe, before calling a handler. */
// Overloads: 3.0.0, handler, input, both, as in `Result.match`.
function maybeMatch<T = never, A = unknown, B = A>(
  maybe: Maybe<T>,
  handlers: { some: (value: T) => A; none: () => B }
): A | B;
function maybeMatch<T, A, H>(
  maybe: Maybe<T>,
  handlers: { some: (value: T) => A; none: H },
  ...untyped: OnlyIfAny<H>
): unknown;
function maybeMatch<I, A = unknown, B = A>(
  maybe: I,
  handlers: { some: (value: unknown) => A; none: () => B },
  ...untyped: OnlyIfAny<I>
): A | B;
function maybeMatch<I, H>(
  maybe: I,
  handlers: H,
  ...untyped: OnlyIfBothAny<I, H>
): unknown;
function maybeMatch<T, A, B>(
  input: Maybe<T>,
  handlers: { some: (value: T) => A; none: () => B }
): A | B {
  const maybe = expectMaybe(input, "Maybe.match", "input") as Maybe<T>;
  return maybe.some ? handlers.some(maybe.value) : handlers.none();
}

/** Return the `Some` value or throw.  An untyped input gives `unknown`.  An
 *  input that is not a Maybe throws a `TypeError`. */
function maybeUnwrap<T = never, UntypedInput extends Some<never> = Some<never>>(
  maybe: Maybe<T> | UntypedInput
): IsAny<UntypedInput> extends true ? unknown : T;
function maybeUnwrap(input: unknown): unknown {
  const maybe = expectMaybe(input, "Maybe.unwrap", "input");
  if (maybe.some) return maybe.value;
  throw new Error("Called unwrap on None");
}

/**
 * Return the `Some` value or `fallback`.
 *
 * The fallback must be the same type `T` as the contained value.  This is
 * intentional — use `match` when you need a different return type.  An
 * input that is not a Maybe throws a `TypeError`.
 */
// Overloads: 3.0.0, input.
function maybeUnwrapOr<T>(maybe: Maybe<T>, fallback: T): T;
function maybeUnwrapOr<I>(
  maybe: I,
  fallback: unknown,
  ...untyped: OnlyIfAny<I>
): unknown;
function maybeUnwrapOr<T>(input: Maybe<T>, fallback: T): T {
  const maybe = expectMaybe(input, "Maybe.unwrapOr", "input") as Maybe<T>;
  return maybe.some ? maybe.value : fallback;
}

/** Return the `Some` value, or compute a fallback from `fn`.  An input that
 *  is not a Maybe throws a `TypeError`. */
function maybeUnwrapOrElse<T>(maybe: Maybe<T>, fn: () => T): T {
  const checked = expectMaybe(maybe, "Maybe.unwrapOrElse", "input");
  return checked.some ? (checked.value as T) : fn();
}

/** Convert a nullable value to a `Maybe`. */
function maybeFromNullable<T>(
  value: T | null | undefined
): Maybe<NonNullable<T>> {
  return value != null ? some(value) : NONE;
}

/** Convert a predicate check to a `Maybe`.  Supports type-guard predicates. */
function maybeFromPredicate<T, S extends T>(
  value: T,
  predicate: (value: T) => value is S
): Maybe<S>;
function maybeFromPredicate<T>(
  value: T,
  predicate: (value: T) => boolean
): Maybe<T>;
function maybeFromPredicate<T>(
  value: T,
  predicate: (value: T) => boolean
): Maybe<T> {
  return predicate(value) ? some(value) : NONE;
}

/**
 * Combine multiple `Maybe`s into a single `Maybe` containing a tuple of
 * values.  Returns `None` if any input is `None` (fail-fast).
 *
 * Pass maybes as arguments, or as one array — `Maybe.all(maybes)` for a
 * dynamic list.  Do not spread a large array into arguments: around 150k
 * elements that throws `RangeError`.
 */
function maybeAll<const M extends readonly AnyMaybe[]>(
  maybes: M
): Maybe<TupleMaybeValues<M>>;
function maybeAll<const M extends readonly AnyMaybe[]>(
  ...maybes: M
): Maybe<TupleMaybeValues<M>>;
function maybeAll(...args: readonly unknown[]): AnyMaybe {
  return everySome(expectMaybes(listArgs(args), "Maybe.all"));
}

/** Return the first `Some` found, or `None` if all are `None`.  Takes
 *  maybes as arguments or as one array.  Inputs may hold different types;
 *  the value type is their union. */
function maybeFirstSome<const M extends readonly AnyMaybe[]>(
  maybes: M
): Maybe<MaybeValueOf<M[number]>>;
function maybeFirstSome<const M extends readonly AnyMaybe[]>(
  ...maybes: M
): Maybe<MaybeValueOf<M[number]>>;
// With an explicit type argument: `firstSome<number>(...)`.
function maybeFirstSome<T>(maybes: readonly Maybe<T>[]): Maybe<T>;
function maybeFirstSome<T>(...maybes: Maybe<T>[]): Maybe<T>;
function maybeFirstSome(...args: readonly unknown[]): AnyMaybe {
  for (const m of expectMaybes(listArgs(args), "Maybe.firstSome")) {
    if (m.some) return m;
  }
  return NONE;
}

/** Like `all`, but for promises of `Maybe`s.  Waits for all promises to
 *  settle via `Promise.allSettled`.
 *
 *  `None` means "no value", not "failed": if any promise rejects, the
 *  returned promise rejects with the first rejection reason in argument
 *  order, even when another input is `None`.  Use `Result.allAsync` or
 *  `Result.collectAsync` to get errors as values. */
function maybeAllAsync<const M extends readonly PromiseLike<AnyMaybe>[]>(
  promises: M
): Promise<Maybe<{ [K in keyof M]: MaybeValueOf<Awaited<M[K]>> }>>;
function maybeAllAsync<const M extends readonly PromiseLike<AnyMaybe>[]>(
  ...promises: M
): Promise<Maybe<{ [K in keyof M]: MaybeValueOf<Awaited<M[K]>> }>>;
async function maybeAllAsync(...args: readonly unknown[]): Promise<AnyMaybe> {
  const settled = await Promise.allSettled(listArgs(args));
  // A non-Maybe is a programmer error: every fulfilled value is checked
  // before the first rejection is rethrown.
  const maybes: AnyMaybe[] = [];
  let rejected: PromiseRejectedResult | undefined;
  for (const [i, s] of settled.entries()) {
    if (s.status === "fulfilled") {
      maybes.push(expectMaybe(s.value, "Maybe.allAsync", i));
    } else if (rejected === undefined) {
      rejected = s;
    }
  }
  if (rejected) throw rejected.reason;
  return everySome(maybes);
}

// ---------------------------------------------------------------------------
// Maybe <-> Result interop
// ---------------------------------------------------------------------------

/** Convert a `Maybe` to a `Result`, calling `errorFactory` only when `None`. */
// Overloads: returns any, 3.0.0, as in `fromNullable`.
function maybeToResult<T, E extends Error>(
  maybe: Maybe<T>,
  errorFactory: () => E,
  ...untyped: OnlyIfAny<E>
): Result<T, Error>;
function maybeToResult<T, E extends Error>(
  maybe: Maybe<T>,
  errorFactory: () => E
): Result<T, E>;
function maybeToResult<T, E extends Error>(
  maybe: Maybe<T>,
  errorFactory: () => E
): Result<T, E> {
  return maybe.some ? ok(maybe.value) : err(errorFactory());
}

/** Convert a `Result` to a `Maybe`, discarding the error. */
function maybeFromResult<T, E extends Error>(result: Result<T, E>): Maybe<T> {
  return result.ok ? some(result.value) : NONE;
}

/** Convert a `Result` to a `Maybe`, discarding the error. */
function resultToMaybe<T, E extends Error>(result: Result<T, E>): Maybe<T> {
  return maybeFromResult(result);
}

/** Convert a `Maybe` to a `Result`, calling `errorFactory` only when `None`.
 * Alias for `maybeToResult`. */
// Overloads: returns any, 3.0.0, as in `fromNullable`.
function resultFromMaybe<T, E extends Error>(
  maybe: Maybe<T>,
  errorFactory: () => E,
  ...untyped: OnlyIfAny<E>
): Result<T, Error>;
function resultFromMaybe<T, E extends Error>(
  maybe: Maybe<T>,
  errorFactory: () => E
): Result<T, E>;
function resultFromMaybe<T, E extends Error>(
  maybe: Maybe<T>,
  errorFactory: () => E
): Result<T, E> {
  return maybeToResult(maybe, errorFactory);
}

/** Convert a `Result<Maybe<T>, E>` to `Maybe<Result<T, E>>`.  One
 *  signature and a `TypeError` for a wrong input, see `flatten`. */
function resultTranspose<
  T,
  E extends Error = never,
  UntypedInput extends ErrResult<never> = ErrResult<never>,
>(
  result: Result<Maybe<T>, E> | UntypedInput
): IsAny<UntypedInput> extends true
  ? Maybe<Result<unknown, Error>>
  : Maybe<Result<T, E>>;
function resultTranspose(input: unknown): Maybe<AnyResult> {
  const result = expectResult(input, "Result.transpose", "input");
  if (!result.ok) return some(result);
  const maybe = expectMaybe(result.value, "Result.transpose", "value");
  return maybe.some ? some(ok(maybe.value)) : NONE;
}

/** Convert a `Maybe<Result<T, E>>` to `Result<Maybe<T>, E>`.  One
 *  signature and a `TypeError` for a wrong input, see `flatten`. */
function maybeTranspose<
  T,
  E extends Error = never,
  UntypedInput extends Some<never> = Some<never>,
  UntypedValue extends ErrResult<never> = ErrResult<never>,
>(
  maybe: Maybe<Result<T, E> | UntypedValue> | UntypedInput
): IsAny<UntypedInput> extends true
  ? Result<Maybe<unknown>, Error>
  : Result<Maybe<T>, E | ErrorIfAny<UntypedValue, never>>;
function maybeTranspose(input: unknown): Result<AnyMaybe, Error> {
  const maybe = expectMaybe(input, "Maybe.transpose", "input");
  if (!maybe.some) return ok(NONE);
  const result = expectResult(maybe.value, "Maybe.transpose", "value");
  return result.ok ? ok(some(result.value)) : err(result.error);
}

export const Maybe = {
  some,
  none,
  isSome,
  isNone,
  map: maybeMap,
  flatMap: maybeFlatMap,
  flatten: maybeFlatten,
  filter: maybeFilter,
  inspect: maybeInspect,
  match: maybeMatch,
  unwrap: maybeUnwrap,
  unwrapOr: maybeUnwrapOr,
  unwrapOrElse: maybeUnwrapOrElse,
  fromNullable: maybeFromNullable,
  fromPredicate: maybeFromPredicate,
  all: maybeAll,
  allAsync: maybeAllAsync,
  firstSome: maybeFirstSome,
  toResult: maybeToResult,
  fromResult: maybeFromResult,
  transpose: maybeTranspose,
} as const;

export const Result = {
  ok,
  err,
  isResult,
  isOk,
  isErr,
  map,
  mapError,
  inspect,
  inspectError,
  flatMap,
  flatMapErr,
  orElse,
  flatten,
  match,
  exhaustive,
  unwrap,
  unwrapErr,
  unwrapOr,
  unwrapOrElse,
  split,
  fromNullable,
  fromPredicate,
  normalizeError,
  tryCatch,
  tryCatchAsync,
  fromPromise,
  all,
  allAsync,
  collect,
  collectAsync,
  toMaybe: resultToMaybe,
  fromMaybe: resultFromMaybe,
  transpose: resultTranspose,
} as const;

export {
  err,
  isErr,
  isNone,
  isOk,
  isResult,
  isSome,
  none,
  normalizeError,
  ok,
  some,
};
