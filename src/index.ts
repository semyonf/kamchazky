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

type AnyResult = Result<unknown, Error>;

type ValueOf<R> = R extends OkResult<infer T> ? T : never;
type ErrorOf<R> = R extends ErrResult<infer E> ? E : never;

type TupleValues<R extends readonly AnyResult[]> = {
  [K in keyof R]: ValueOf<R[K]>;
};
type TupleErrors<R extends readonly AnyResult[]> = ErrorOf<R[number]>;

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

/** Create a failed `Result` containing `error`. */
function err<E extends Error>(error: E): ErrResult<E> {
  return Object.freeze({
    ok: false as const,
    error,
  });
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
function map<T, U, E extends Error>(
  result: Result<T, E>,
  fn: (value: T) => U
): Result<U, E>;
function map<T, U, E extends Error>(
  result: Result<T, E>,
  fn: (value: T) => U
): Result<U, E> {
  return result.ok ? ok(fn(result.value)) : result;
}

/** Transform the error inside an `Err`, leaving `Ok` unchanged. */
function mapError<T>(
  result: OkResult<T>,
  fn: (error: never) => Error
): OkResult<T>;
function mapError<T, E extends Error, F extends Error>(
  result: Result<T, E>,
  fn: (error: E) => F
): Result<T, F>;
function mapError<T, E extends Error, F extends Error>(
  result: OkResult<T> | Result<T, E>,
  fn: ((error: never) => Error) | ((error: E) => F)
): OkResult<T> | Result<T, F> {
  return result.ok ? result : err((fn as (error: E) => F)(result.error));
}

/** Run a side-effect on the `Ok` value without transforming the result. */
function inspect<T>(result: OkResult<T>, fn: (value: T) => void): OkResult<T>;
function inspect<T, E extends Error>(
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
function flatMap<T, U, E extends Error, F extends Error = never>(
  result: Result<T, E>,
  fn: (value: T) => Result<U, F>
): Result<U, E | F> {
  if (result.ok) return fn(result.value);
  return result;
}

/**
 * Recover from an error by applying `fn` to produce a new `Result`.
 * Alias: `flatMapErr`.
 */
function orElse<T, E extends Error, F extends Error>(
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
function flatMapErr<T, E extends Error, F extends Error>(
  result: Result<T, E>,
  fn: (error: E) => Result<T, F>
): Result<T, F> {
  return orElse(result, fn);
}

/** Flatten a nested `Result<Result<T, E>, F>` into `Result<T, E | F>`. */
function flatten<T, E extends Error, F extends Error>(
  result: Result<Result<T, E>, F>
): Result<T, E | F> {
  return result.ok ? result.value : result;
}

/** Exhaustively handle both `Ok` and `Err` branches, returning `R`. */
function match<T, E extends Error, R>(
  result: Result<T, E>,
  handlers: { ok: (value: T) => R; err: (error: E) => R }
): R {
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
function unwrap<T, E extends Error>(result: Result<T, E>): T {
  if (result.ok) return result.value;
  throw result.error;
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

/** Return the `Ok` value, or compute a fallback from `fn`. */
function unwrapOrElse<T, E extends Error>(
  result: Result<T, E>,
  fn: () => T
): T {
  return result.ok ? result.value : fn();
}

/** Convert a nullable value to a `Result`. */
function fromNullable<T, E extends Error>(
  value: T | null | undefined,
  errorFactory: () => E
): Result<NonNullable<T>, E> {
  return value != null ? ok(value) : err(errorFactory());
}

/** Convert a predicate check to a `Result`.  Supports type-guard predicates. */
function fromPredicate<T, S extends T, E extends Error>(
  value: T,
  predicate: (value: T) => value is S,
  errorFactory: () => E
): Result<S, E>;
function fromPredicate<T, E extends Error>(
  value: T,
  predicate: (value: T) => boolean,
  errorFactory: () => E
): Result<T, E>;
function fromPredicate<T, E extends Error>(
  value: T,
  predicate: (value: T) => boolean,
  errorFactory: () => E
): Result<T, E> {
  return predicate(value) ? ok(value) : err(errorFactory());
}

/** Convert an unknown thrown value to an `Error` instance. */
function normalizeError(error: unknown): Error {
  if (error instanceof Error) return error;
  if (error === null || error === undefined) return new Error(String(error));
  if (typeof error === "object") {
    try {
      const json = JSON.stringify(error);
      if (json !== "{}") return new Error(json);
      // JSON.stringify produced '{}' — likely RegExp or similar with no
      // enumerable own properties. Fall through to String().
    } catch {
      // JSON.stringify throws on BigInt and circular references
    }
  }
  try {
    return new Error(String(error));
  } catch {
    return new Error("Non-stringifiable thrown value");
  }
}

/** Wrap a synchronous function that may throw into a `Result`. */
function tryCatch<T>(fn: () => T): Result<T, Error>;
function tryCatch<T, E extends Error>(
  fn: () => T,
  onError: (error: unknown) => E
): Result<T, E>;
function tryCatch<T, E extends Error>(
  fn: () => T,
  onError?: (error: unknown) => E
): Result<T, E | Error> {
  try {
    return ok(fn());
  } catch (error) {
    try {
      return err(onError ? onError(error) : normalizeError(error));
    } catch (mapperError) {
      return err(new Error("Error mapper threw", { cause: mapperError }));
    }
  }
}

/** Wrap an asynchronous function that may reject into a `Result`. */
function tryCatchAsync<T>(fn: () => Promise<T>): Promise<Result<T, Error>>;
function tryCatchAsync<T, E extends Error>(
  fn: () => Promise<T>,
  onError: (error: unknown) => E
): Promise<Result<T, E>>;
async function tryCatchAsync<T, E extends Error>(
  fn: () => Promise<T>,
  onError?: (error: unknown) => E
): Promise<Result<T, E | Error>> {
  try {
    return ok(await fn());
  } catch (error) {
    try {
      return err(onError ? onError(error) : normalizeError(error));
    } catch (mapperError) {
      return err(new Error("Error mapper threw", { cause: mapperError }));
    }
  }
}

/** Wrap a `Promise` that may reject into a `Result`. */
function fromPromise<T>(promise: Promise<T>): Promise<Result<T, Error>>;
function fromPromise<T, E extends Error>(
  promise: Promise<T>,
  onError: (error: unknown) => E
): Promise<Result<T, E>>;
async function fromPromise<T, E extends Error>(
  promise: Promise<T>,
  onError?: (error: unknown) => E
): Promise<Result<T, E | Error>> {
  try {
    return ok(await promise);
  } catch (error) {
    try {
      return err(onError ? onError(error) : normalizeError(error));
    } catch (mapperError) {
      return err(new Error("Error mapper threw", { cause: mapperError }));
    }
  }
}

/**
 * Combine multiple `Result`s into a single `Result` containing a tuple of
 * values.  Returns the first `Err` encountered (fail-fast).
 *
 * Pass results as individual arguments — spreading an array loses tuple
 * inference and degrades value types to `unknown[]`.
 */
function all<const R extends readonly AnyResult[]>(
  ...results: R
): Result<TupleValues<R>, TupleErrors<R>> {
  const values: unknown[] = [];
  for (const result of results) {
    if (!result.ok) return err(result.error) as ErrResult<TupleErrors<R>>;
    values.push(result.value);
  }
  return ok(values) as OkResult<TupleValues<R>>;
}

/**
 * Like `all`, but accepts promises of `Result`s.  All promises are resolved
 * concurrently via `Promise.allSettled` before checking for errors.
 *
 * Promises are expected to resolve to `Result`s — not reject.  If a promise
 * does reject, the rejection is caught and wrapped as an `Err`.
 *
 * @breaking v0.2 — Uses `Promise.allSettled` instead of `Promise.all`. All
 * promises are now always awaited to completion; the first error found during
 * iteration is returned.
 */
async function allAsync<const R extends readonly Promise<AnyResult>[]>(
  ...promises: R
): Promise<
  Result<
    { [K in keyof R]: ValueOf<Awaited<R[K]>> },
    ErrorOf<Awaited<R[number]>> | Error
  >
> {
  type Values = { [K in keyof R]: ValueOf<Awaited<R[K]>> };
  type Errors = ErrorOf<Awaited<R[number]>> | Error;

  const settled = await Promise.allSettled(promises);
  const values: unknown[] = [];
  for (const s of settled) {
    if (s.status === "rejected") {
      return err(normalizeError(s.reason)) as ErrResult<Errors>;
    }
    if (!s.value.ok) {
      return err(s.value.error) as ErrResult<Errors>;
    }
    values.push(s.value.value);
  }
  return ok(values) as OkResult<Values>;
}

/**
 * Like `collect`, but for promises of `Result`s.  Resolves all promises
 * via `Promise.allSettled`, then collects all errors.  Returns an
 * `AggregateError` containing every error found.
 */
async function collectAsync<const R extends readonly Promise<AnyResult>[]>(
  ...promises: R
): Promise<Result<{ [K in keyof R]: ValueOf<Awaited<R[K]>> }, AggregateError>> {
  type Values = { [K in keyof R]: ValueOf<Awaited<R[K]>> };

  const settled = await Promise.allSettled(promises);
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
  if (errors.length > 0)
    return err(new AggregateError(errors)) as ErrResult<AggregateError>;
  return ok(values) as OkResult<Values>;
}

/**
 * Combine multiple `Result`s, collecting **all** errors instead of
 * short-circuiting on the first one.  Returns an `AggregateError` whose
 * `.errors` array contains every individual error.
 */
function collect<const R extends readonly AnyResult[]>(
  ...results: R
): Result<TupleValues<R>, AggregateError> {
  const values: unknown[] = [];
  const errors: Error[] = [];
  for (const result of results) {
    if (result.ok) values.push(result.value);
    else errors.push(result.error);
  }
  if (errors.length > 0)
    return err(new AggregateError(errors)) as ErrResult<AggregateError>;
  return ok(values) as OkResult<TupleValues<R>>;
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
function maybeMap<T, U>(maybe: Maybe<T>, fn: (value: T) => U): Maybe<U>;
function maybeMap<T, U>(maybe: Maybe<T>, fn: (value: T) => U): Maybe<U> {
  return maybe.some ? some(fn(maybe.value)) : NONE;
}

/** Chain a `Maybe`-returning function on the `Some` value. */
function maybeFlatMap<T, U>(
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

/** Exhaustively handle both `Some` and `None` branches, returning `R`. */
function maybeMatch<T, R>(
  maybe: Maybe<T>,
  handlers: { some: (value: T) => R; none: () => R }
): R {
  return maybe.some ? handlers.some(maybe.value) : handlers.none();
}

/** Return the `Some` value or throw. */
function maybeUnwrap<T>(maybe: Maybe<T>): T {
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
 * Pass maybes as individual arguments — spreading an array loses tuple
 * inference and degrades value types to `unknown[]`.
 */
function maybeAll<const M extends readonly AnyMaybe[]>(
  ...maybes: M
): Maybe<TupleMaybeValues<M>> {
  const values: unknown[] = [];
  for (const m of maybes) {
    if (!m.some) return NONE;
    values.push(m.value);
  }
  return some(values) as Some<TupleMaybeValues<M>>;
}

/** Return the first `Some` found, or `None` if all are `None`. */
function maybeFirstSome<T>(...maybes: Maybe<T>[]): Maybe<T> {
  for (const m of maybes) {
    if (m.some) return m;
  }
  return NONE;
}

/** Like `all`, but for promises of `Maybe`s.  Resolves all promises
 *  concurrently via `Promise.allSettled`. */
async function maybeAllAsync<const M extends readonly Promise<AnyMaybe>[]>(
  ...promises: M
): Promise<Maybe<{ [K in keyof M]: MaybeValueOf<Awaited<M[K]>> }>> {
  type Values = { [K in keyof M]: MaybeValueOf<Awaited<M[K]>> };

  const settled = await Promise.allSettled(promises);
  const values: unknown[] = [];
  for (const s of settled) {
    if (s.status === "rejected") return NONE;
    if (!s.value.some) return NONE;
    values.push(s.value.value);
  }
  return some(values) as Some<Values>;
}

// ---------------------------------------------------------------------------
// Maybe <-> Result interop
// ---------------------------------------------------------------------------

/** Convert a `Maybe` to a `Result`, calling `errorFactory` only when `None`.
 *
 * @breaking v0.2 — The second argument changed from `error: E` to
 * `errorFactory: () => E`. The factory is only called when the Maybe is
 * None, avoiding unnecessary error construction for Some.
 */
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
 * Alias for `maybeToResult`.
 *
 * @breaking v0.2 — The second argument changed from `error: E` to
 * `errorFactory: () => E`.
 */
function resultFromMaybe<T, E extends Error>(
  maybe: Maybe<T>,
  errorFactory: () => E
): Result<T, E> {
  return maybeToResult(maybe, errorFactory);
}

/** Convert a `Result<Maybe<T>, E>` to `Maybe<Result<T, E>>`. */
function resultTranspose<T, E extends Error>(
  result: Result<Maybe<T>, E>
): Maybe<Result<T, E>> {
  if (!result.ok) return some(result);
  if (result.value.some) return some(ok(result.value.value));
  return NONE;
}

/** Convert a `Maybe<Result<T, E>>` to `Result<Maybe<T>, E>`. */
function maybeTranspose<T, E extends Error>(
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
  // `as const` without `satisfies Record<string, Function>`: the namespace is a
  // small, static, hand-maintained list of named function references — the
  // function-only invariant is obvious from inspection and enforced by code
  // review. Adding `satisfies` would guard a near-zero-probability mistake that
  // TypeScript would catch at every call site anyway, for no consumer benefit.
} as const;

// Add interop to Result namespace
export const Result = {
  ok,
  err,
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
  unwrapOr,
  unwrapOrElse,
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
  // See comment on Maybe above.
} as const;

export { err, isErr, isNone, isOk, isSome, none, normalizeError, ok, some };
