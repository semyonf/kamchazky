# @semyonf/kamchazky

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
