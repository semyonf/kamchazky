---
"@semyonf/kamchazky": major
---

Untyped (`any`) values become `unknown` or `Error` instead of `never` or `any`, functions check that their input is a Result or a Maybe, `tryCatch` no longer hides the rejection of a Promise, and both ESLint rules report more.

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

- `unwrapErr`, and a computed key whose type is `"unwrap"` or a union with it: ``Result[`unwrap`]``, `Result[key]`.
- Destructuring: `const { unwrap } = Result`, renamed, with a string or computed key, with a default, in a destructuring assignment (`({ unwrap: f } = Result)`), from an array of these functions (`const [take] = fns`, also called as `fns[0](r)`) and in `for…of`. The rule reports the pattern, not each later call.
- `opt?.unwrap(r)` on an optional object and `box.unwrap?.(r)` on an optional property.
- A function named `unwrap` whose parameter is a type parameter constrained to a Result or a Maybe.
