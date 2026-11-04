---
"@semyonf/kamchazky": patch
---

Fix regressions introduced in 2.0.0.

- `Result.tryCatch` compiles in generic code again:
  `<T>(f: () => T) => Result.tryCatch(f)` returns `Result<T, Error>`, as in
  1.x. The Promise check is now made with overloads instead of a
  conditional parameter type, which TypeScript could not resolve for a
  generic `T`. For a function that returns a Promise, the result type is not
  a `Result`, so the first use of the result is a compile error that names
  `tryCatchAsync`. A return type that is only partly a Promise
  (`number | Promise<number>`) is no longer caught at compile time.
- `Result.tryCatch` no longer crashes the process when the function returns
  a rejected Promise. The `Err(TypeError)` it returns carries the Promise as
  `cause`, and the rejection is marked as handled.
- Hostile values no longer make library functions throw: a revoked Proxy or
  a throwing getter passed to `tryCatch`, `tryCatchAsync`, `fromPromise`,
  `allAsync`, `collectAsync`, `err`, `normalizeError`, `isResult` or
  `exhaustive` gives a normal result or error.
- An object faked with `Symbol.toStringTag = "Error"` is no longer taken for
  an `Error`; `err()` and `normalizeError` wrap it, so `.message` is always
  a string. `Error.isError` is used where the runtime has it.
- `none()` is one object across the CommonJS and ESM builds, so
  `none() === none()` holds when both are loaded.
- `Maybe.firstSome<number>(...)` with an explicit type argument compiles
  again.
- `must-use-result` no longer flags `results.sort(cmp)`, `reverse()`,
  `fill()`, `copyWithin()` on a stored array, or `Object.freeze` / `seal` /
  `preventExtensions` of a stored value: these return what they got, so no
  Result is lost. `items.map(validate).sort(cmp)` is still flagged.
- CHANGELOG: the 2.0.0 `unwrapOrElse` / `fromPredicate` callback changes are
  now marked as breaking. A callback with an optional first parameter now
  receives the error or the rejected value instead of `undefined`.
- README: removed the legacy `.eslintrc` example (legacy config is not
  supported), aligned the `void` guidance, and fixed the documented result
  types of `all`, `allAsync`, `collect` and `collectAsync`.
