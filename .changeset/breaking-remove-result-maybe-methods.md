---
"@semyonf/kamchazky": major
---

**Breaking: remove instance methods and `expect` from `Result` and `Maybe`.**

- `OkResult`, `ErrResult`, `Some`, and `None` now contain only discriminant fields (`ok`/`some`, `value`/`error`).
- Removed: all instance methods (`map`, `flatMap`, `mapError`, `inspect`, `inspectError`, `match`, `unwrap`, `unwrapOr`, `unwrapOrElse`, `expect`).
- Removed: standalone `expect` functions and exports (`Result.expect`, `Maybe.expect`, `ok().expect()`, `some().expect()`, etc.).
- All operations remain available as namespace functions (`Result.map`, `Maybe.map`, etc.).
- Removed unnecessary `as` casts in `flatMap`, `flatten`, `orElse`, `fromNullable`, and `transpose` implementations.
- Simplified `Result.ok()` and `ok()` overloads to use a dedicated `createOk` helper, keeping precise generic types in the implementation.
