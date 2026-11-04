---
"@semyonf/kamchazky": major
---

Stop losing errors silently, add `unwrapErr`, `isResult` and array
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
