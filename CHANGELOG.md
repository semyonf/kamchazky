# @semyonf/kamchazky

## 4.0.0

### Major Changes

- 2db515c: Untyped (`any`) values become `unknown` or `Error` instead of `never` or `any`, functions check that their input is a Result or a Maybe, `tryCatch` no longer hides the rejection of a Promise, and both ESLint rules report more.

  **Upgrading from 3.0**

  1. **An `any` input no longer becomes `never`.** `Result.unwrap(x as any)` is `unknown`, so `const s: string = Result.unwrap(x)` stops compiling. Check or cast the value, or type it where it comes from.
  2. **An `any` value from `tryCatch`, `tryCatchAsync`, a `map` callback or `fromPromise` becomes `unknown`.** `Result.tryCatch(() => JSON.parse(s))` is `Result<unknown, Error>`. Cast inside the callback (`JSON.parse(s) as Config`) or validate the value.
  3. **An error mapper that returns `any` gives `Error`.** This covers `onError`, the error factories and `mapError`. Give the mapper a return type where you need the specific class.
  4. **An untyped callback or `match` handler gives `unknown`,** not `never` or the type of the other handler: `Result.flatMap(r, legacy.fn)` is `Result<unknown, E | Error>`. Type the callback.
  5. **A function with overloads loses its generic types when passed point-free,** and `ReturnType` / `Parameters` describe its overload for untyped values: `rs.map(Result.unwrapOr)` is `unknown[]`. Write an arrow: `rs.map((r) => Result.unwrapOr(r, 0))`.
  6. **`tryCatch` with an async function no longer hides the rejection.** It surfaces as an unhandled rejection, which ends a Node process by default. Change such a call to `tryCatchAsync`.
  7. **A value that is not a Result or a Maybe throws a `TypeError`** in the combinators, `flatten`, `transpose`, `unwrap`, `unwrapErr`, `unwrapOr`, `unwrapOrElse`, `split`, `match` and their `Maybe` counterparts. This includes `Result.ok()` after a JSON round trip (`{ ok: true }`) and an API response such as `{ ok: false, error: "denied" }`. Rebuild Results with `ok` / `err` after parsing, or send `Result.ok(null)`.
  8. **`isResult` rejects an object that has both `value` and `error`.** Check such API responses by their own fields.
  9. **Error details changed.** A real `Error` whose `message` is not a string is kept as is, so read the message with `String(error.message)`. The error that `unwrapErr` throws on an `Ok` has no `cause`, and `exhaustive` writes `<object>` instead of the JSON of an object.
  10. **The plugin declares its rules as `{ meta, create }`.** Code that passes `plugin.rules[…]` to typescript-eslint's `RuleTester` needs a cast.
  11. **`must-use-result` and `no-unwrap` report more.** Handle the reported Result or mark an intentional discard with `void`. Replace `unwrap` with `split`, `match` or `unwrapOr`, and turn `no-unwrap` off in test files.

  **Types**

  - Fully typed code infers the same types as in 3.0.0, except for functions with overloads passed point-free or read with `ReturnType` / `Parameters` (item 5).
  - An `any` input gives `unknown` and `Error` (was `never`): `Result.unwrap` gives `unknown`, `unwrapErr` gives `Error`, `split` gives a tuple of `ErrResult<Error>` and `unknown`, `Maybe.unwrap` gives `unknown`.
  - `map`, `mapError`, `inspect`, `inspectError`, `flatMap`, `flatMapErr`, `orElse`, `flatten`, `transpose` and the `Maybe` functions on an `any` input give a `Result` / `Maybe`, not an `OkResult` / `Some`: `Result.map(x as any, (v: number) => v + 1)` is `Result<number, Error>` (was `OkResult<number>`).
  - `match` on an `any` input keeps the type of each typed handler: `Result.match(x as any, { ok: (v: string) => v, err: (e) => e })` is `string | Error` (was `string`). The `err` handler must take an `Error`.
  - An `any` value that `fn` of `tryCatch` / `tryCatchAsync`, a `Result.map` / `Maybe.map` callback or the Promise of `fromPromise` gives becomes `unknown` (was `any`). A value given directly keeps `any`: `ok(JSON.parse(s))` is `OkResult<any>`.
  - An error that `onError`, an error factory (`fromNullable`, `fromPredicate`, `Maybe.toResult`, `Result.fromMaybe`) or a `mapError` callback returns as `any` becomes `Error`. `Result.mapError(r, (e) => legacy.wrap(e))` is `Result<number, Error>` (was `Result<number, any>`), and on an `any` input `Result<unknown, Error>` (was `OkResult<unknown>`). This includes an unannotated `onError` on an `any` function or Promise (`Result.tryCatchAsync(() => db.query(), (e) => wrap(e))`, was `Result<unknown, any>`), and for a `vi.fn()` or `(...args: any[]) => any` callback: `Result.orElse(r, vi.fn())` is `Result<unknown, Error>` (was `Result<T, never>`), `Result.tryCatch(x as any, vi.fn())` is `Result<unknown, Error>` (was the "does not await" type).
  - An untyped callback counts as one that returns `any`. `Result.flatMap(r, legacy.fn)` is `Result<unknown, E | Error>` (was `Result<never, E>`), `orElse` and `flatMapErr` give `Result<unknown, Error>` (was `Result<T, never>`), `Maybe.flatMap` gives `Maybe<unknown>` (was `Maybe<never>`).
  - `Result.map`, `Maybe.map` and `Result.tryCatch` with an untyped callback give a Result or Maybe of `unknown` (was the "does not await" type).
  - `match` with an untyped handler, either one, gives `unknown` (was `never`, or the type of the other handler). `Result.match<number, AppError>(r, …)` with the input types only compiles and gives `unknown`.
  - The input must still be a Result, and an annotated callback must fit it, as in 3.0.0: `Result.map(fetchUser(), legacy.fn)` and `Result.flatMap(r, (v: string) => legacy(v))` on a `Result<number, E>` do not compile.
  - An `any` inside a typed input adds `Error`: `Result.flatten(ok(x as any))` is `Result<unknown, Error>` (was `Result<unknown, never>`), `Maybe.transpose(some(x as any))` is `Result<Maybe<unknown>, Error>` (was `Result<Maybe<unknown>, never>`).
  - `rs.map(Result.flatMap)` and other point-free calls that pass the index as the callback now compile (3.0.0 rejected them), and throw a `TypeError` when they call the index.
  - A call with a wrong number of arguments reads differently, for example "Expected at least 2 arguments" (was "Expected 2 arguments").

  **Runtime**

  - `tryCatch` never calls `then` on what `fn` returns. A lazy thenable is not executed (was executed), and the rejection of a returned Promise is no longer marked as handled.
  - The `Err(TypeError)` that `tryCatch` returns for a thenable goes through `onError` (was returned as is), so generic code gets the error type it declares.
  - The combinators throw `TypeError("Result.all: item 1 is not a Result")` for an item that is not a Result or a Maybe, and the async ones reject with it. 3.0.0 returned `Err(Error("undefined"))`, `Err(Error("denied"))` for `{ ok: false, error: "denied" }`, a `None`, or an `Ok` for `Result.ok()` after JSON. Every item is checked before the first `Err` or rejection.
  - `flatten` and `transpose` check the input and the value inside it: `Result.flatten(ok(5))` throws (was `5`).
  - `unwrap`, `unwrapErr`, `unwrapOr`, `unwrapOrElse`, `split`, `match` and `Maybe.unwrap`, `unwrapOr`, `unwrapOrElse`, `match` throw `TypeError("Result.unwrap: input is not a Result")` for such an input. 3.0.0 read whatever it held: `Result.unwrap(5)` threw `undefined`, and `Result.unwrapOr({ ok: true }, 0)` returned `undefined`.
  - A combinator passed point-free (`groups.map(Result.all)`) or to `Array.from` reads the array and ignores the index (was an `Err` or `None` for every group).
  - `tryCatch`, `tryCatchAsync` and `fromPromise` passed point-free ignore the index (was `TypeError: onError is not a function` on a failure).
  - `isResult` rejects `{ ok, value, error }` (was `true`).
  - `err()` and `normalizeError` keep a real `Error` whose `message` is not a string (was replaced with `Error("Non-Error object thrown")`).
  - `unwrapErr` on an `Ok` throws an error without the value as `cause`, since the value may be sensitive.
  - `exhaustive` writes `<object>` and `<function>` (was the JSON of an object and `undefined` for a function). `NaN`, `Infinity` and a symbol appear as `String` gives them (was `null`, `null` and `undefined`).
  - The `AggregateError` of `collect` / `collectAsync` has a message that counts the failures, `Result.collect: 2 of 3 items failed` (was empty).
  - Without `Error.isError`, an object with `Symbol.toStringTag = "Error"` is no longer taken for an Error. Node 20.16+ and 22.3+ use `util.types.isNativeError`, and a polyfill of `Error.isError` that reads the tag is not used.
  - `none()` reuses a value stored under its global key only if it is a frozen `{ some: false }` (was any value), and stores its own read-only (was writable). The library loads when the global object is not extensible (was a `TypeError`).

  **ESLint plugin**

  - `import` and `require` of `@semyonf/kamchazky/eslint` give one plugin object. A CommonJS and an ESM config that both add it no longer fail with `Cannot redefine plugin "kamchazky"`.
  - The plugin loads from an ESM config with TypeScript 5.0 to 5.4 (was `TypeError: Cannot read properties of undefined (reading 'Null')`).
  - `@semyonf/kamchazky/eslint` resolves under `moduleResolution: node10`.
  - The plugin type fits `defineConfig`, `Linter.Config[]` and `ESLint.Plugin`, so a type-checked `eslint.config.ts` compiles (was TS2322).
  - The plugin has `meta.version`, so `eslint --cache` lints again after an upgrade of this package.
  - The documentation links of both rules point to existing README sections.

  `must-use-result` reports more:

  - `tryCatch`, `Result.map` and `Maybe.map` with an async callback wherever the call appears, for example as an argument or in a template string.
  - A Result that `&&`, `||`, `??` or `?:` drops: `ready && getResult()`.
  - `Result.split(getResult())`, a call that returns a type parameter constrained to a Result, `Promise.allSettled` of Results, and an array of `Promise<Result>`.
  - An array of Results with `null` or `undefined` (`items?.map(validate)`) and nested arrays (`chunks.map((c) => c.map(validate))`).
  - `sort` on a getter that builds the array (`batch.checks.sort(cmp)`, also `batch["checks"]` and `batch[key]` with `key: "checks"`) or on a field of a call result (`getHolder().list.sort(cmp)`).
  - A Result that a comma drops outside a statement, as in `while ((validate(i), i < n))`, and in the `for` init and update clauses.
  - A Result behind a cast: `getResult() as unknown`.
  - A Result-returning callback in a JSX attribute or an object literal property or method whose type returns `void`: `<Button onClick={() => save()} />`, `register({ onDone: save })`. This includes a callback behind `!`, `?.` or a cast, an optional one (`onClick={props.onSave}`), a method with a symbol key, and a callback that returns a tuple of Promises.
  - `void` in a union counts as nullish, so `save().catch(() => {})` is reported.

  `must-use-result` reports less:

  - `Result.inspect` / `inspectError` on a stored Result, also as what a `forEach` callback returns, in both branches of `?:`.
  - `sort` on a stored array behind `?.` or a cast, and `shift`, `pop` and `splice` on a stored array.
  - `finally` on a stored Promise and `await` of a stored Promise.

  `no-unwrap` reports more:

  - `unwrapErr`, and a computed key whose type is `"unwrap"` or a union with it: `` Result[`unwrap`] ``, `Result[key]`.
  - Destructuring: `const { unwrap } = Result`, renamed, with a string or computed key, with a default, in a destructuring assignment (`({ unwrap: f } = Result)`), from an array of these functions (`const [take] = fns`, also called as `fns[0](r)`) and in `for…of`. The rule reports the pattern, not each later call.
  - `opt?.unwrap(r)` on an optional object and `box.unwrap?.(r)` on an optional property.
  - A function named `unwrap` whose parameter is a type parameter constrained to a Result or a Maybe.

## 3.0.0

### Major Changes

- 9b332a0: **Breaking:** `Result.map` and `Maybe.map` reject async callbacks in the
  types. `Result.map(r, async (v) => …)` used to give
  `Result<Promise<U>, E>`: an `Ok` holding a Promise whose rejection nobody
  awaits. Now the result type is not a `Result` (or `Maybe`), so its first
  use is a compile error that says `map` does not await. Await the value
  first, or wrap the async work in `Result.tryCatchAsync`.

  The check is made with overloads, so generic callbacks
  (`<U>(f: (n: number) => U) => Result.map(r, f)`) compile, and a callback
  that returns `T | Promise<T>` is not caught. The runtime is unchanged.

### Patch Changes

- 9b332a0: Fix regressions introduced in 2.0.0.

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

  - **Breaking:** `Result.unwrapOrElse` now passes the error to the fallback
    function. _(Corrected in 2.0.1: this was listed as non-breaking.)_
  - **Breaking:** `Result.fromPredicate` now passes the rejected value to the
    error factory. _(Corrected in 2.0.1: this was listed as non-breaking.)_
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

  The `unwrapOrElse` and `fromPredicate` callback changes break callbacks
  with an optional first parameter: `(m?: string) => new Error(m ?? "x")`
  used to get `undefined` and now gets the value. Zero-argument callbacks
  are not affected. _(Corrected in 2.0.1: this paragraph said the changes
  were backwards-compatible.)_

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
