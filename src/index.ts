/** A successful result containing a value of type `T`. */
export type OkResult<T> = {
  readonly ok: true;
  readonly value: T;
  map<U>(fn: (value: T) => U): OkResult<U>;
  flatMap<U, F extends Error = never>(
    fn: (value: T) => Result<U, F>
  ): Result<U, F>;
  mapError<F extends Error>(fn: (error: never) => F): OkResult<T>;
  inspect(fn: (value: T) => void): OkResult<T>;
  inspectError(fn: (error: never) => void): OkResult<T>;
};

/** A failed result containing an error of type `E`. */
export type ErrResult<E extends Error = Error> = {
  readonly ok: false;
  readonly error: E;
  map<U>(fn: (value: never) => U): ErrResult<E>;
  flatMap<U, F extends Error = never>(
    fn: (value: never) => Result<U, F>
  ): ErrResult<E>;
  mapError<F extends Error>(fn: (error: E) => F): ErrResult<F>;
  inspect(fn: (value: never) => void): ErrResult<E>;
  inspectError(fn: (error: E) => void): ErrResult<E>;
};

/**
 * A value that is either a success (`OkResult<T>`) or a failure
 * (`ErrResult<E>`).  Use `Result.ok` / `Result.err` to construct, and the
 * companion `Result.*` functions or instance methods to transform.
 */
export type Result<T, E extends Error = Error> = OkResult<T> | ErrResult<E>;

type AnyResult = Result<unknown, Error>;

type ValueOf<R> = R extends OkResult<infer T> ? T : never;
type ErrorOf<R> = R extends ErrResult<infer E> ? E : never;

type TupleValues<R extends readonly AnyResult[]> = {
  [K in keyof R]: ValueOf<R[K]>;
};
type TupleErrors<R extends readonly AnyResult[]> = ErrorOf<R[number]>;

/** Create a successful `Result` containing `value`. */
function ok<T>(value: T): OkResult<T> {
  const self: OkResult<T> = Object.freeze({
    ok: true as const,
    value,
    map: <U>(fn: (value: T) => U): OkResult<U> => ok(fn(value)),
    flatMap: <U, F extends Error = never>(
      fn: (value: T) => Result<U, F>
    ): Result<U, F> => fn(value),
    mapError: <F extends Error>(_fn: (error: never) => F): OkResult<T> => self,
    inspect: (fn: (value: T) => void): OkResult<T> => {
      fn(value);
      return self;
    },
    inspectError: (_fn: (error: never) => void): OkResult<T> => self,
  });
  return self;
}

/** Create a failed `Result` containing `error`. */
function err<E extends Error>(error: E): ErrResult<E> {
  const self: ErrResult<E> = Object.freeze({
    ok: false as const,
    error,
    map: <U>(_fn: (value: never) => U): ErrResult<E> => self,
    flatMap: <U, F extends Error = never>(
      _fn: (value: never) => Result<U, F>
    ): ErrResult<E> => self,
    mapError: <F extends Error>(fn: (error: E) => F): ErrResult<F> =>
      err(fn(error)),
    inspect: (_fn: (value: never) => void): ErrResult<E> => self,
    inspectError: (fn: (error: E) => void): ErrResult<E> => {
      fn(error);
      return self;
    },
  });
  return self;
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
  // Safe: ErrResult<E> ⊆ Result<U, E | F>  — error type is widened, value
  // channel is unused.  The assertion is needed because ErrResult's methods
  // make E invariant in TypeScript's structural checker.
  return result as ErrResult<E | F>;
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
  // Safe: OkResult<T> ⊆ Result<T, F> — same variance pattern as flatMap.
  return result as OkResult<T>;
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
  // Safe: both branches widen the error type — same variance pattern as flatMap.
  return (result.ok ? result.value : result) as Result<T, E | F>;
}

/** Exhaustively handle both `Ok` and `Err` branches, returning `R`. */
function match<T, E extends Error, R>(
  result: Result<T, E>,
  handlers: { ok: (value: T) => R; err: (error: E) => R }
): R {
  return result.ok ? handlers.ok(result.value) : handlers.err(result.error);
}

/** Compile-time exhaustiveness guard — only accepts `never`. */
function exhaustive(_: never): never {
  throw new Error("Unhandled result case");
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

/** Return the `Ok` value or throw with a custom `message`. */
function expect<T, E extends Error>(result: Result<T, E>, message: string): T {
  if (result.ok) return result.value;
  throw new Error(`${message}: ${result.error.message}`, {
    cause: result.error,
  });
}

/** Convert a nullable value to a `Result`. */
function fromNullable<T, E extends Error>(
  value: T | null | undefined,
  errorFactory: () => E
): Result<NonNullable<T>, E> {
  return value != null ? ok(value as NonNullable<T>) : err(errorFactory());
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
  return error instanceof Error ? error : new Error(String(error));
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
    return err(onError ? onError(error) : normalizeError(error));
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
    return err(onError ? onError(error) : normalizeError(error));
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
    return err(onError ? onError(error) : normalizeError(error));
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
 * concurrently via `Promise.all` before checking for errors.
 *
 * Promises are expected to resolve to `Result`s — not reject.  If a promise
 * rejects, the rejection is caught and wrapped as an `Err`.
 */
async function allAsync<const R extends readonly Promise<AnyResult>[]>(
  ...promises: R
): Promise<
  Result<
    { [K in keyof R]: ValueOf<Awaited<R[K]>> },
    ErrorOf<Awaited<R[number]>>
  >
> {
  type Values = { [K in keyof R]: ValueOf<Awaited<R[K]>> };
  type Errors = ErrorOf<Awaited<R[number]>>;

  let results: AnyResult[];
  try {
    results = await Promise.all(promises);
  } catch (error) {
    // Defensive: catches raw promise rejections (contract violation).
    return err(normalizeError(error)) as ErrResult<Errors>;
  }
  const values: unknown[] = [];
  for (const result of results) {
    if (!result.ok) return err(result.error) as ErrResult<Errors>;
    values.push(result.value);
  }
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
  map<U>(fn: (value: T) => U): Some<U>;
  flatMap<U>(fn: (value: T) => Maybe<U>): Maybe<U>;
  filter(predicate: (value: T) => boolean): Maybe<T>;
  inspect(fn: (value: T) => void): Some<T>;
};

/** A `Maybe` that contains no value. */
export type None = {
  readonly some: false;
  map<U>(fn: (value: never) => U): None;
  flatMap<U>(fn: (value: never) => Maybe<U>): None;
  filter(predicate: (value: never) => boolean): None;
  inspect(fn: (value: never) => void): None;
};

/**
 * A value that is either present (`Some<T>`) or absent (`None`).
 * Use `Maybe.some` / `Maybe.none` to construct, and the companion `Maybe.*`
 * functions or instance methods to transform.
 */
export type Maybe<T> = Some<T> | None;

type AnyMaybe = Maybe<unknown>;

type MaybeValueOf<M> = M extends Some<infer T> ? T : never;

type TupleMaybeValues<M extends readonly AnyMaybe[]> = {
  [K in keyof M]: MaybeValueOf<M[K]>;
};

/** Create a `Maybe` containing `value`. */
function some<T>(value: T): Some<T> {
  const self: Some<T> = Object.freeze({
    some: true as const,
    value,
    map: <U>(fn: (value: T) => U): Some<U> => some(fn(value)),
    flatMap: <U>(fn: (value: T) => Maybe<U>): Maybe<U> => fn(value),
    filter: (predicate: (value: T) => boolean): Maybe<T> =>
      predicate(value) ? self : NONE,
    inspect: (fn: (value: T) => void): Some<T> => {
      fn(value);
      return self;
    },
  });
  return self;
}

const NONE: None = Object.freeze({
  some: false as const,
  map: <U>(_fn: (value: never) => U): None => NONE,
  flatMap: <U>(_fn: (value: never) => Maybe<U>): None => NONE,
  filter: (_predicate: (value: never) => boolean): None => NONE,
  inspect: (_fn: (value: never) => void): None => NONE,
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

/** Return the `Some` value or throw with a custom `message`. */
function maybeExpect<T>(maybe: Maybe<T>, message: string): T {
  if (maybe.some) return maybe.value;
  throw new Error(message);
}

/** Convert a nullable value to a `Maybe`. */
function maybeFromNullable<T>(value: T | null | undefined): Maybe<NonNullable<T>> {
  return value != null ? some(value as NonNullable<T>) : NONE;
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

// ---------------------------------------------------------------------------
// Maybe <-> Result interop
// ---------------------------------------------------------------------------

/** Convert a `Maybe` to a `Result`, using `error` for `None`. */
function maybeToResult<T, E extends Error>(
  maybe: Maybe<T>,
  error: E
): Result<T, E> {
  return maybe.some ? ok(maybe.value) : err(error);
}

/** Convert a `Result` to a `Maybe`, discarding the error. */
function maybeFromResult<T, E extends Error>(result: Result<T, E>): Maybe<T> {
  return result.ok ? some(result.value) : NONE;
}

/** Convert a `Result` to a `Maybe`, discarding the error. */
function resultToMaybe<T, E extends Error>(result: Result<T, E>): Maybe<T> {
  return result.ok ? some(result.value) : NONE;
}

/** Convert a `Maybe` to a `Result`, using `error` for `None`. */
function resultFromMaybe<T, E extends Error>(
  maybe: Maybe<T>,
  error: E
): Result<T, E> {
  return maybe.some ? ok(maybe.value) : err(error);
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
  expect: maybeExpect,
  fromNullable: maybeFromNullable,
  fromPredicate: maybeFromPredicate,
  all: maybeAll,
  firstSome: maybeFirstSome,
  toResult: maybeToResult,
  fromResult: maybeFromResult,
} as const satisfies Record<string, (...args: never[]) => unknown>;

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
  expect,
  fromNullable,
  fromPredicate,
  normalizeError,
  tryCatch,
  tryCatchAsync,
  fromPromise,
  all,
  allAsync,
  collect,
  toMaybe: resultToMaybe,
  fromMaybe: resultFromMaybe,
} as const satisfies Record<string, (...args: never[]) => unknown>;

export { err, isErr, isNone, isOk, isSome, none, normalizeError, ok, some };
