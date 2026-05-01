# @semyonf/kamchazky

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
