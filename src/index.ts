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
type ErrorOf<R> = R extends ErrResult<infer E> ? E : never;

type TupleValues<R extends readonly AnyResult[]> = {
  [K in keyof R]: ValueOf<R[K]>;
};
type TupleErrors<R extends readonly AnyResult[]> = ErrorOf<R[number]>;

/** Combinators take their items as rest arguments or as one array.  The
 *  array form avoids spreading: `f(...arr)` with ~150k elements throws
 *  `RangeError: Maximum call stack size exceeded`. */
function listArgs<T>(args: readonly unknown[]): readonly T[] {
  return (
    args.length === 1 && Array.isArray(args[0]) ? args[0] : args
  ) as readonly T[];
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
 * A non-`Error` value that slips past the type (through `any`, e.g. a
 * `.catch((e) => err(e))`) is normalized with `normalizeError`, so
 * `result.error.message` is always a string at runtime.
 */
function err<E extends Error>(error: E): ErrResult<E> {
  return Object.freeze({
    ok: false as const,
    error: isError(error) ? error : (normalizeError(error) as E),
  });
}

/**
 * Check whether an arbitrary value is a `Result`: `{ ok: true, value }` or
 * `{ ok: false, error }` with an `Error`.  For decorators, interceptors and
 * other generic code that receives `unknown`.  Matches by shape, so a
 * structurally equal object from another copy of the library passes too.
 */
function isResult(value: unknown): value is Result<unknown, Error> {
  if (typeof value !== "object" || value === null) return false;
  const r = value as { ok?: unknown; error?: unknown };
  if (r.ok === true) return "value" in r;
  if (r.ok === false) return isError(r.error);
  return false;
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

/** Transform the value inside an `Ok`, leaving `Err` unchanged. */
function map<T, U>(result: OkResult<T>, fn: (value: T) => U): OkResult<U>;
function map<E extends Error>(
  result: ErrResult<E>,
  fn: (value: never) => unknown
): ErrResult<E>;
function map<T, U, E extends Error = never>(
  result: Result<T, E>,
  fn: (value: T) => U
): Result<U, E>;
function map<T, U, E extends Error>(
  result: Result<T, E>,
  fn: ((value: T) => U) | ((value: never) => unknown)
): Result<U, E> {
  return result.ok ? ok((fn as (value: T) => U)(result.value)) : result;
}

/** Transform the error inside an `Err`, leaving `Ok` unchanged. */
function mapError<T>(
  result: OkResult<T>,
  fn: (error: never) => Error
): OkResult<T>;
function mapError<E extends Error, F extends Error>(
  result: ErrResult<E>,
  fn: (error: E) => F
): ErrResult<F>;
function mapError<T, E extends Error, F extends Error>(
  result: Result<T, E>,
  fn: (error: E) => F
): Result<T, F>;
function mapError<T, E extends Error, F extends Error>(
  result: Result<T, E>,
  fn: ((error: never) => Error) | ((error: E) => F)
): Result<T, F> {
  return result.ok ? result : err((fn as (error: E) => F)(result.error));
}

/** Run a side-effect on the `Ok` value without transforming the result. */
function inspect<T>(result: OkResult<T>, fn: (value: T) => void): OkResult<T>;
function inspect<T, E extends Error = never>(
  result: Result<T, E>,
  fn: (value: T) => void
): Result<T, E>;
function inspect<T, E extends Error>(
  result: Result<T, E>,
  fn: (value: T) => void
): Result<T, E> {
  if (result.ok) fn(result.value);
  return result;
}

/** Run a side-effect on the `Err` error without transforming the result. */
function inspectError<E extends Error>(
  result: ErrResult<E>,
  fn: (error: E) => void
): ErrResult<E>;
function inspectError<T, E extends Error>(
  result: Result<T, E>,
  fn: (error: E) => void
): Result<T, E>;
function inspectError<T, E extends Error>(
  result: Result<T, E>,
  fn: (error: E) => void
): Result<T, E> {
  if (!result.ok) fn(result.error);
  return result;
}

/** Chain a `Result`-returning function on the `Ok` value. */
function flatMap<
  T,
  U = never,
  E extends Error = never,
  F extends Error = never,
>(result: Result<T, E>, fn: (value: T) => Result<U, F>): Result<U, E | F> {
  if (result.ok) return fn(result.value);
  return result;
}

/**
 * Recover from an error by applying `fn` to produce a new `Result`.
 * Alias: `flatMapErr`.
 */
function orElse<T, E extends Error, F extends Error = never>(
  result: Result<T, E>,
  fn: (error: E) => Result<T, F>
): Result<T, F> {
  if (!result.ok) return fn(result.error);
  return result;
}

/**
 * Recover from an error by applying `fn` to produce a new `Result`.
 * Alias for `orElse`.
 */
function flatMapErr<T, E extends Error, F extends Error = never>(
  result: Result<T, E>,
  fn: (error: E) => Result<T, F>
): Result<T, F> {
  return orElse(result, fn);
}

/** Flatten a nested `Result<Result<T, E>, F>` into `Result<T, E | F>`. */
function flatten<T, E extends Error = never, F extends Error = never>(
  result: Result<Result<T, E>, F>
): Result<T, E | F> {
  return result.ok ? result.value : result;
}

/** Exhaustively handle both `Ok` and `Err` branches.  The branches may
 *  return different types; the result is their union. */
function match<T = never, E extends Error = never, A = never, B = A>(
  result: Result<T, E>,
  handlers: { ok: (value: T) => A; err: (error: E) => B }
): A | B {
  return result.ok ? handlers.ok(result.value) : handlers.err(result.error);
}

/** Compile-time exhaustiveness guard — only accepts `never`. */
function exhaustive(value: never): never {
  let detail: string;
  try {
    detail = JSON.stringify(value);
  } catch {
    detail = String(value);
  }
  throw new Error(`Unhandled result case: ${detail}`);
}

/** Return the `Ok` value or throw the contained error. */
function unwrap<T = never, E extends Error = never>(result: Result<T, E>): T {
  if (result.ok) return result.value;
  throw result.error;
}

/** Return the `Err` error or throw.  The inverse of `unwrap`, mostly for
 *  tests: it reads `r.error` without narrowing first. */
function unwrapErr<T = never, E extends Error = never>(
  result: Result<T, E>
): E {
  if (!result.ok) return result.error;
  throw new Error("Called unwrapErr on Ok", { cause: result.value });
}

/**
 * Return the `Ok` value or `fallback`.
 *
 * The fallback must be the same type `T` as the success value.  This is
 * intentional — use `match` when you need a different return type.
 */
function unwrapOr<T, E extends Error>(result: Result<T, E>, fallback: T): T {
  return result.ok ? result.value : fallback;
}

/** Return the `Ok` value, or compute a fallback from the error. */
function unwrapOrElse<T, E extends Error>(
  result: Result<T, E>,
  fn: (error: E) => T
): T {
  return result.ok ? result.value : fn(result.error);
}

type Split<T, E extends Error> =
  | readonly [failure: ErrResult<E>, value: undefined]
  | readonly [failure: undefined, value: T];

/**
 * Split a `Result` into a `[failure, value]` tuple.  Checking `failure`
 * narrows `value` to `T`, and `failure` can be returned as is.
 */
function split<T = never, E extends Error = never>(
  result: Result<T, E>
): Split<T, E> {
  return result.ok ? [undefined, result.value] : [result, undefined];
}

/** Convert a nullable value to a `Result`. */
function fromNullable<T, E extends Error>(
  value: T | null | undefined,
  errorFactory: () => E
): Result<NonNullable<T>, E> {
  return value != null ? ok(value) : err(errorFactory());
}

/** Convert a predicate check to a `Result`.  Supports type-guard predicates.
 *  The error factory receives the rejected value. */
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

/** `instanceof Error`, plus Errors from another realm (vm, iframe). */
function isError(value: unknown): value is Error {
  return (
    value instanceof Error ||
    Object.prototype.toString.call(value) === "[object Error]"
  );
}

/**
 * Convert an unknown thrown value to an `Error` instance.
 *
 * Errors pass through unchanged. Primitives become `new Error(String(v))`.
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
 *  and rethrow the rest. */
function toError<E extends Error>(
  error: unknown,
  onError: ((error: unknown) => E) | undefined
): E | Error {
  return onError ? onError(error) : normalizeError(error);
}

function isPromiseLike(value: unknown): value is PromiseLike<unknown> {
  return (
    ((typeof value === "object" && value !== null) ||
      typeof value === "function") &&
    typeof (value as { then?: unknown }).then === "function"
  );
}

/** Turns `fn`'s type into a compile error when it may return a Promise,
 *  including `number | Promise<number>`.  `any`, `unknown` and `never` stay
 *  allowed (`JSON.parse`, throwing functions). */
type SyncOnly<T> = 0 extends 1 & T
  ? unknown
  : [T] extends [never]
    ? unknown
    : true extends (T extends PromiseLike<unknown> ? true : false)
      ? {
          "Result.tryCatch does not await. Use Result.tryCatchAsync for functions that return a Promise": never;
        }
      : unknown;

/**
 * Wrap a synchronous function that may throw into a `Result`.
 *
 * Functions that return a Promise are a compile error — use
 * `tryCatchAsync`.  If one slips through at runtime, the result is an
 * `Err(TypeError)`, never an `Ok` holding a Promise.
 *
 * Whatever `onError` throws propagates unchanged: return an error to get an
 * `Err`, rethrow to let the error through.
 */
function tryCatch<T>(fn: (() => T) & SyncOnly<T>): Result<T, Error>;
function tryCatch<T, E extends Error>(
  fn: (() => T) & SyncOnly<T>,
  onError: (error: unknown) => E
): Result<T, E>;
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
    return err(
      new TypeError(
        "Result.tryCatch: fn returned a Promise, which tryCatch does not await. Use Result.tryCatchAsync."
      )
    );
  }
  return ok(value);
}

/**
 * Wrap an asynchronous function that may reject into a `Result`.
 *
 * If `onError` throws, the returned promise rejects with that error.
 */
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
  const values: unknown[] = [];
  for (const result of listArgs<AnyResult>(args)) {
    if (!result.ok) return err(result.error);
    values.push(result.value);
  }
  return ok(values);
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
  const settled = await Promise.allSettled(
    listArgs<PromiseLike<AnyResult>>(args)
  );
  const values: unknown[] = [];
  for (const s of settled) {
    if (s.status === "rejected") return err(normalizeError(s.reason));
    if (!s.value.ok) return err(s.value.error);
    values.push(s.value.value);
  }
  return ok(values);
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
  const settled = await Promise.allSettled(
    listArgs<PromiseLike<AnyResult>>(args)
  );
  const values: unknown[] = [];
  const errors: Error[] = [];
  for (const s of settled) {
    if (s.status === "rejected") {
      errors.push(normalizeError(s.reason));
    } else if (!s.value.ok) {
      errors.push(s.value.error);
    } else {
      values.push(s.value.value);
    }
  }
  if (errors.length > 0) return err(new AggregateError(errors));
  return ok(values);
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
  const values: unknown[] = [];
  const errors: Error[] = [];
  for (const result of listArgs<AnyResult>(args)) {
    if (result.ok) values.push(result.value);
    else errors.push(result.error);
  }
  if (errors.length > 0) return err(new AggregateError(errors));
  return ok(values);
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

const NONE: None = Object.freeze({
  some: false as const,
});

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

/** Transform the value inside a `Some`, leaving `None` unchanged. */
function maybeMap<T, U>(maybe: Some<T>, fn: (value: T) => U): Some<U>;
function maybeMap(maybe: None, fn: (value: never) => unknown): None;
function maybeMap<T, U>(maybe: Maybe<T>, fn: (value: T) => U): Maybe<U>;
function maybeMap<T, U>(
  maybe: Maybe<T>,
  fn: ((value: T) => U) | ((value: never) => unknown)
): Maybe<U> {
  return maybe.some ? some((fn as (value: T) => U)(maybe.value)) : NONE;
}

/** Chain a `Maybe`-returning function on the `Some` value. */
function maybeFlatMap<T, U = never>(
  maybe: Maybe<T>,
  fn: (value: T) => Maybe<U>
): Maybe<U> {
  return maybe.some ? fn(maybe.value) : NONE;
}

/** Flatten a nested `Maybe<Maybe<T>>` into `Maybe<T>`. */
function maybeFlatten<T>(maybe: Maybe<Maybe<T>>): Maybe<T> {
  return maybe.some ? maybe.value : NONE;
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
function maybeInspect<T>(maybe: Some<T>, fn: (value: T) => void): Some<T>;
function maybeInspect<T>(maybe: Maybe<T>, fn: (value: T) => void): Maybe<T>;
function maybeInspect<T>(maybe: Maybe<T>, fn: (value: T) => void): Maybe<T> {
  if (maybe.some) fn(maybe.value);
  return maybe;
}

/** Exhaustively handle both `Some` and `None` branches.  The branches may
 *  return different types; the result is their union. */
function maybeMatch<T = never, A = never, B = A>(
  maybe: Maybe<T>,
  handlers: { some: (value: T) => A; none: () => B }
): A | B {
  return maybe.some ? handlers.some(maybe.value) : handlers.none();
}

/** Return the `Some` value or throw. */
function maybeUnwrap<T = never>(maybe: Maybe<T>): T {
  if (maybe.some) return maybe.value;
  throw new Error("Called unwrap on None");
}

/**
 * Return the `Some` value or `fallback`.
 *
 * The fallback must be the same type `T` as the contained value.  This is
 * intentional — use `match` when you need a different return type.
 */
function maybeUnwrapOr<T>(maybe: Maybe<T>, fallback: T): T {
  return maybe.some ? maybe.value : fallback;
}

/** Return the `Some` value, or compute a fallback from `fn`. */
function maybeUnwrapOrElse<T>(maybe: Maybe<T>, fn: () => T): T {
  return maybe.some ? maybe.value : fn();
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
  const values: unknown[] = [];
  for (const m of listArgs<AnyMaybe>(args)) {
    if (!m.some) return NONE;
    values.push(m.value);
  }
  return some(values);
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
function maybeFirstSome(...args: readonly unknown[]): AnyMaybe {
  for (const m of listArgs<AnyMaybe>(args)) {
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
  const settled = await Promise.allSettled(
    listArgs<PromiseLike<AnyMaybe>>(args)
  );
  const rejected = settled.find(
    (s): s is PromiseRejectedResult => s.status === "rejected"
  );
  if (rejected) throw rejected.reason;

  const values: unknown[] = [];
  for (const s of settled) {
    if (s.status === "rejected" || !s.value.some) return NONE;
    values.push(s.value.value);
  }
  return some(values);
}

// ---------------------------------------------------------------------------
// Maybe <-> Result interop
// ---------------------------------------------------------------------------

/** Convert a `Maybe` to a `Result`, calling `errorFactory` only when `None`. */
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
function resultFromMaybe<T, E extends Error>(
  maybe: Maybe<T>,
  errorFactory: () => E
): Result<T, E> {
  return maybeToResult(maybe, errorFactory);
}

/** Convert a `Result<Maybe<T>, E>` to `Maybe<Result<T, E>>`. */
function resultTranspose<T, E extends Error = never>(
  result: Result<Maybe<T>, E>
): Maybe<Result<T, E>> {
  if (!result.ok) return some(result);
  if (result.value.some) return some(ok(result.value.value));
  return NONE;
}

/** Convert a `Maybe<Result<T, E>>` to `Result<Maybe<T>, E>`. */
function maybeTranspose<T, E extends Error = never>(
  maybe: Maybe<Result<T, E>>
): Result<Maybe<T>, E> {
  if (!maybe.some) return ok(NONE);
  if (maybe.value.ok) return ok(some(maybe.value.value));
  return err(maybe.value.error);
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
