# @semyonf/kamchazky

## 2.0.0

### Major Changes

- e7472bc: Stop losing errors silently, add `unwrapErr`, `isResult` and array
  arguments for combinators, and close `must-use-result` detection gaps.

  Breaking changes are marked **Breaking**.

  New:

  - `Result.unwrapErr(r)` returns the error of an `Err` and throws on `Ok`.
  - `Result.isResult(x: unknown): x is Result<unknown, Error>` checks an
    arbitrary value by shape. Also exported as `isResult`.
  - `Result.all`, `collect`, `allAsync`, `collectAsync` and `Maybe.all`,
    `allAsync`, `firstSome` also take one array: `Result.all(items)`. Spreading
    a large array into arguments threw `RangeError` around 150k elements.

  Types:

  - **Breaking:** `Result.collect` / `collectAsync` return
    `AggregateErrorOf<E>` (exported): a real `AggregateError` whose `.errors`
    is `E[]` instead of `any[]`. It stays assignable to `AggregateError`.
  - `Result.match` and `Maybe.match` branches may return different types; the
    result is their union. Previously this was a compile error.
  - `Maybe.firstSome` accepts Maybes of different types and gives their
    union; all-`None` input gives `Maybe<never>` instead of `Maybe<unknown>`.
  - Error and value types that cannot be inferred are `never`, not `Error` or
    `unknown`: `orElse(r, () => ok(0))` is `Result<number, never>`, and the
    same holds for `flatMap`, `flatMapErr`, `flatten`, `split`, `unwrap`,
    `unwrapErr`, `transpose`, `Maybe.flatMap`, `Maybe.unwrap`.
  - `Result.map` / `mapError` on an `ErrResult` return an `ErrResult`;
    `Maybe.map` on `None` returns `None`.
  - **Breaking:** `Result.tryCatch` also rejects functions that may return a
    Promise, such as `() => number | Promise<number>`.
  - `fromPromise`, `tryCatchAsync`, `allAsync`, `collectAsync` and
    `Maybe.allAsync` accept `PromiseLike`, not only `Promise`.

  Library:

  - `Result.unwrapOrElse` now passes the error to the fallback function.
  - `Result.fromPredicate` now passes the rejected value to the error factory.
  - **Breaking:** `Result.tryCatch` rejects Promise-returning functions at compile time.
    At runtime it returns `Err(TypeError)` instead of `Ok(Promise)`, whose
    rejection nobody caught.
  - **Breaking:** `Maybe.allAsync` rejects with the first rejection reason instead of
    resolving to `None`, which hid the error.
  - **Breaking:** whatever `onError` throws in `Result.tryCatch`,
    `tryCatchAsync` and `fromPromise` now propagates unchanged. Previously it
    became `Err(new Error("Error mapper threw"))`, which did not match the
    declared error type and lost the original error. A mapper can now return
    known errors and rethrow the rest.
  - **Breaking:** `Result.normalizeError` no longer serializes thrown objects into the
    message (they can carry tokens or headers). It uses the object's string
    `message` if present, otherwise `"Non-Error object thrown"`, and keeps the
    object as `cause`. Errors from another realm pass through unchanged.
  - `Result.err()` normalizes a non-`Error` value that reaches it through
    `any`, so `result.error.message` is always a string.

  `must-use-result` ESLint rule:

  - Flags un-awaited `Promise<Result>` expression statements (new
    `mustUseAsync` message).
  - Flags Results discarded inside sequence expressions: `(getResult(), 0);`.
  - Flags nullable Results: `Result<T, E> | null | undefined`.
  - No longer flags types with a non-literal `ok: boolean` discriminant
    (e.g. API DTOs like `{ ok: boolean; error?: string }`), which produced
    false positives.
  - No longer flags assignments: `r = getResult();`.
  - Flags discarded arrays and tuples of Results: `items.map(validate);`,
    `await Promise.all(items.map(save));`.
  - Flags Result-returning callbacks passed to a `void`-returning parameter:
    `items.forEach(validate);` (new `mustUseCallback` message).
  - **Breaking:** `require("@semyonf/kamchazky/eslint")` now returns the
    plugin object. The named `mustUseResult` and `noUnwrap` exports are
    removed; use `plugin.rules["must-use-result"]` and
    `plugin.rules["no-unwrap"]`.

  `no-unwrap` ESLint rule:

  - Like `must-use-result`, it now requires a literal `true`/`false`
    discriminant (`ok`, `some`), so `{ some: boolean }` shapes are not
    treated as a Maybe.

  The `unwrapOrElse` and `fromPredicate` callback changes are
  backwards-compatible — existing zero-argument callbacks remain valid.

## 1.3.0

### Minor Changes

- 00db5f9: Add the `no-unwrap` ESLint rule. It flags `Result.unwrap` and `Maybe.unwrap`,
  which throw on `Err` or `None` and take the failure out of the Result flow.

## 1.2.0

### Minor Changes

- f218968: Add `Result.split`, which turns a `Result` into a `[failure, value]` tuple.
  Checking `failure` narrows `value` to `T`, and `failure` can be returned as is.

## 1.1.0

### Minor Changes

- 207bd30: Add an ESLint plugin export `@semyonf/kamchazky/eslint` with the type-aware
  `must-use-result` rule. It flags a `Result` that is discarded as a statement
  (e.g. `getResult();` or `await getAsyncResult();`), since a discarded `Result`
  silently loses the error it carries. Requires `@typescript-eslint/utils` and
  `typescript` (both optional peer dependencies, needed only when linting).

## 1.0.0

### Major Changes

- a824487: **Breaking: remove instance methods and `expect` from `Result` and `Maybe`.**

  - `OkResult`, `ErrResult`, `Some`, and `None` now contain only discriminant fields (`ok`/`some`, `value`/`error`).
  - Removed: all instance methods (`map`, `flatMap`, `mapError`, `inspect`, `inspectError`, `match`, `unwrap`, `unwrapOr`, `unwrapOrElse`, `expect`).
  - Removed: standalone `expect` functions and exports (`Result.expect`, `Maybe.expect`, `ok().expect()`, `some().expect()`, etc.).
  - All operations remain available as namespace functions (`Result.map`, `Maybe.map`, etc.).
  - Removed unnecessary `as` casts in `flatMap`, `flatten`, `orElse`, `fromNullable`, and `transpose` implementations.
  - Simplified `Result.ok()` and `ok()` overloads to use a dedicated `createOk` helper, keeping precise generic types in the implementation.

## 0.3.0

### Minor Changes

- 6da422b: Allow `Result.ok()` and `ok()` to create an `OkResult<undefined>` without passing an explicit `undefined` value.

## 0.2.0

Initial public release.

### Features

- `Result<T, E>` discriminated union with `ok`/`err` constructors and a full set of combinators: `map`, `mapError`, `flatMap`, `orElse` (alias `flatMapErr`), `flatten`, `inspect`, `inspectError`, `match`.
- `Maybe<T>` discriminated union with `some`/`none` constructors and combinators: `map`, `flatMap`, `flatten`, `filter`, `inspect`, `match`.
- Instance methods on every `Result` and `Maybe` so the same operations can be called either as free functions or chained off the value.
- Extraction helpers: `unwrap`, `unwrapOr`, `unwrapOrElse`, `expect`. `Result.expect` rethrows preserving the original error's prototype, stack, and `cause`.
- Constructors from values: `fromNullable`, `fromPredicate` (both support type-guard predicates).
- Async and throw-handling constructors: `Result.tryCatch`, `Result.tryCatchAsync`, `Result.fromPromise`. Mapper errors are caught and wrapped rather than escaping.
- `Result.normalizeError` — converts arbitrary thrown values to `Error` instances, handling non-stringifiable cases.
- Combinators with exact tuple inference: `Result.all`, `Result.allAsync`, `Result.collect`, `Result.collectAsync`, `Maybe.all`, `Maybe.allAsync`, `Maybe.firstSome`. `collect` aggregates errors via the standard `AggregateError`.
- Interop: `Result.toMaybe` / `Result.fromMaybe` and `Maybe.toResult` / `Maybe.fromResult`, plus `Result.transpose` / `Maybe.transpose` for nested values.
- `Result.exhaustive` — compile-time exhaustiveness guard, throws with a serialized detail at runtime.
- Dual ESM + CJS build with separate `.d.ts` / `.d.cts` declaration files. `sideEffects: false` for tree-shaking. Requires Node `>=20`.
