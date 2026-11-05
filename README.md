# kamchazky

Type-safe `Result` and `Maybe` for TypeScript: errors and missing values as ordinary values, with full type inference and an ESLint plugin that keeps you from dropping them.

`result.ok` and `maybe.some` are fields, not methods. Most Result libraries (oxide.ts among them) expose `.ok()` as a method that returns a plain `boolean`, and TypeScript sees no link between that boolean and the value, so you end up calling `.unwrap()` anyway. A discriminant field lets the compiler narrow the type for you.

## Install

```
npm install @semyonf/kamchazky
```

## Quick Start

Check `result.ok` once and TypeScript knows what you have:

```typescript
declare const result: Result<User, ApiError>;

if (result.ok) {
  result.value; // User
} else {
  result.error; // ApiError
}

declare const maybe: Maybe<User>;

if (maybe.some) {
  maybe.value; // User
}
```

This works in ternaries, early returns and switches, anywhere TypeScript does control-flow analysis.

A chain of steps, each of which can fail:

```typescript
import { Result } from "@semyonf/kamchazky";

class ConfigError extends Error {
  override readonly name = "ConfigError" as const;
}

const port = Result.flatMap(
  Result.fromNullable(process.env.PORT, () => new ConfigError("PORT is not set")),
  (raw) =>
    Result.fromPredicate(Number(raw), Number.isInteger, (n) => new ConfigError(`PORT is not an integer: ${n}`)),
); // Result<number, ConfigError>

const message = Result.match(port, {
  ok: (p) => `listening on ${p}`,
  err: (e) => e.message,
}); // string
```

---

## Result

### Types

```typescript
type Result<T, E extends Error = Error> = OkResult<T> | ErrResult<E>;

type OkResult<T> = { readonly ok: true; readonly value: T };
type ErrResult<E extends Error> = { readonly ok: false; readonly error: E };
```

Every function lives on the `Result` namespace. `ok`, `err`, `isResult`, `isOk`, `isErr` and `normalizeError` are also exported at the top level.

### Creating results

```typescript
Result.ok(42);                    // OkResult<number>
Result.ok();                      // OkResult<undefined>
Result.err(new Error("fail"));    // ErrResult<Error>

Result.fromNullable(
  await findUser(id),
  () => new NotFoundError(`User ${id} not found`),
); // Result<User, NotFoundError>

Result.fromPredicate(
  value,
  (v): v is string => typeof v === "string",
  (v) => new TypeError(`expected string, got ${typeof v}`),
); // Result<string, TypeError>

Result.tryCatch(() => JSON.parse(input)); // Result<unknown, Error>
Result.tryCatch(() => JSON.parse(input), (e) => new ParseError(String(e))); // Result<unknown, ParseError>
Result.tryCatchAsync(() => fetch("/api").then((r) => r.json())); // Promise<Result<unknown, Error>>
Result.fromPromise(fetch("/api"), (e) => new NetworkError(String(e))); // Promise<Result<Response, NetworkError>>
```

- `tryCatch` is for synchronous code; use `tryCatchAsync` for a function that returns a Promise (see [Async callbacks](#async-callbacks)).
- Without `onError`, a thrown value becomes an `Error` through `normalizeError`. The error factory of `fromPredicate` receives the rejected value.

### Transforming

```typescript
Result.map(result, (value) => value * 2);
Result.mapError(result, (e) => new AppError(e.message));
Result.flatMap(result, (value) => validate(value)); // chain Result-returning steps
Result.orElse(result, (error) => ok(defaultValue)); // recover from an error
Result.flatMapErr(result, (error) => retry(error)); // the same as orElse
Result.flatten(ok(ok(42)));                         // ok(42); the error types are united
Result.inspect(result, (value) => console.log("got", value)); // observe; returns the input
Result.inspectError(result, (error) => console.error(error));
```

- The callbacks do not await: the result of `Result.map(r, async (v) => …)` cannot be used (see [Async callbacks](#async-callbacks)).
- A throw inside a callback propagates and does not become an `Err` (see [Throws inside callbacks](#throws-inside-callbacks)).

### Extracting values

```typescript
Result.unwrap(result);              // the value, or throws the error
Result.unwrapErr(result);           // the error, or throws on Ok (mostly for tests)
Result.unwrapOr(result, fallback);  // the value, or the fallback
Result.unwrapOrElse(result, (error) => computeFallback(error));

Result.match(result, {
  ok: (value) => `Success: ${value}`,
  err: (error) => `Error: ${error.message}`,
});

const [failure, user] = Result.split(await findUser(id));
if (failure) return failure; // ErrResult<E>, returned as is
user;                        // User
```

- The fallback of `unwrapOr` and `unwrapOrElse` must have the value type: `Result.unwrapOr(r, "x")` on a `Result<number, E>` does not compile. `null` and `undefined` are allowed and widen the type: `Result.unwrapOr(r, null)` is `number | null`.
- The `match` branches may return different types, and the result is their union: `Result.match(r, { ok: (v) => v, err: () => null })` is `number | null`.

`Result.exhaustive(value)` accepts only `never`, so an `if` chain or a `switch` over a Result fails to compile when a case is missing:

```typescript
if (result.ok) return result.value;
if (!result.ok) return handle(result.error);
return Result.exhaustive(result); // compiles only if all cases are handled
```

If it is reached at runtime, it throws `Unhandled result case: "pending"` for a string, `String(value)` for other primitives (`42`, `NaN`, `Symbol(s)`), and `<object>` or `<function>` for those, with the value as `cause`.

### Combining results

```typescript
// Fail fast: the first error
const r = Result.all(fetchUser(id), fetchPosts(id));
// Result<readonly [User, Post[]], UserError | PostError>

// All promises at once; a rejection becomes an Err, hence `| Error`
const r = await Result.allAsync(fetchUserAsync(id), fetchPostsAsync(id));
// Result<readonly [User, Post[]], UserError | PostError | Error>

// Every error, in an AggregateError
const r = Result.collect(validateName(input.name), validateEmail(input.email));
// Result<readonly [Name, Email], AggregateErrorOf<NameError | EmailError>>
// r.error.errors is typed (NameError | EmailError)[], not any[]

const r = await Result.collectAsync(fetchA(), fetchB());
// Result<readonly [A, B], AggregateErrorOf<AError | BError | Error>>

// One array, for a dynamic list
const r = Result.all(items.map(validate)); // Result<Item[], ValidationError>
```

- `allAsync` and `collectAsync` wait for every promise, also after an `Err` or a rejection, so no rejection is left unhandled. `allAsync` returns the first `Err` in argument order, not the first to settle.
- Pass a long list as one array, not as `...items`: spreading about 150 000 arguments throws `RangeError: Maximum call stack size exceeded` on Node 24. An array literal keeps tuple types: `Result.all([a, b])` is `readonly [A, B]`.

### Errors

```typescript
Result.normalizeError(new TypeError("t")); // the TypeError itself
Result.normalizeError("oops");             // new Error("oops")
Result.normalizeError(42);                 // new Error("42")
Result.normalizeError({ message: "db down", code: "ECONNREFUSED" });
// new Error("db down", { cause: <the object> })
Result.normalizeError({ status: 401, config: { headers: { Authorization: "…" } } });
// new Error("Non-Error object thrown", { cause: <the object> })
```

- An object is never serialized into the message, because a rejected response or config object can carry tokens, and messages end up in logs. The object stays available as `cause`.
- `Result.err()` normalizes a non-`Error` that reaches it through `any`, so `result.error` is always an `Error`. Its type is still `any` then: in `.catch((e) => err(e))` type the parameter, `(e: unknown) => err(normalizeError(e))`, or use `Result.fromPromise`.

### Checking values

```typescript
Result.isResult(value);       // value is Result<unknown, Error>
results.filter(Result.isOk);  // OkResult<T>[]
results.filter(Result.isErr); // ErrResult<E>[]
```

`isResult` is for generic code that receives `unknown`, such as decorators and interceptors. It accepts `{ ok: true, value }` and `{ ok: false, error }` with an `Error` in `error`, rejects an object that has both `value` and `error`, and never throws.

---

## Maybe

### Types

```typescript
type Maybe<T> = Some<T> | None;

type Some<T> = { readonly some: true; readonly value: T };
type None = { readonly some: false };
```

Every function lives on the `Maybe` namespace. `some`, `none`, `isSome` and `isNone` are also exported at the top level.

### Creating maybes

```typescript
Maybe.some(42);  // Some<number>
Maybe.none();    // None
Maybe.fromNullable(document.getElementById("app")); // Maybe<HTMLElement>
Maybe.fromPredicate(value, (v): v is string => typeof v === "string"); // Maybe<string>
```

### Transforming

```typescript
Maybe.map(maybe, (value) => value * 2);
Maybe.flatMap(maybe, (value) => findById(value));
Maybe.flatten(some(some(42)));     // some(42)
Maybe.filter(maybe, (x) => x > 0); // keeps Some only if the predicate passes; a type guard narrows
Maybe.inspect(maybe, (value) => console.log("got", value));
```

Async callbacks and throws inside callbacks behave as with `Result`.

### Extracting values

```typescript
Maybe.unwrap(maybe);                        // the value, or throws
Maybe.unwrapOr(maybe, fallback);            // the value, or the fallback
Maybe.unwrapOrElse(maybe, () => compute());
Maybe.match(maybe, {
  some: (value) => `Found: ${value}`,
  none: () => "Not found",
});
```

### Combining maybes

```typescript
// None if any is None
const m = Maybe.all(findUser(id), findSettings(id)); // Maybe<readonly [User, Settings]>

// The first Some
const m = Maybe.firstSome(fromCache(id), fromDb(id)); // Maybe<User>

const m = await Maybe.allAsync(findUserAsync(id), findSettingsAsync(id)); // Maybe<readonly [User, Settings]>
const m = Maybe.all(ids.map(findCached)); // Maybe<User[]>
```

`None` means "no value", not "failed". If a promise passed to `Maybe.allAsync` rejects, the result rejects with the first rejection in argument order, even when another input is `None`. Use `Result.allAsync` or `Result.collectAsync` to get errors as values.

### Checking values

```typescript
maybes.filter(Maybe.isSome); // Some<T>[]
Maybe.isNone(maybe);         // maybe is None
```

---

## Interop

```typescript
// Result → Maybe (drops the error)
Result.toMaybe(ok(42));            // some(42)
Result.toMaybe(err(new Error())); // none()

// Maybe → Result (needs an error for None)
Result.fromMaybe(some(42), () => new Error("missing")); // ok(42)
Result.fromMaybe(none(), () => new Error("missing"));   // err(Error("missing"))
Maybe.fromResult(ok(42));                              // some(42)
Maybe.toResult(some(42), () => new Error("missing"));  // ok(42)

// Swap the nesting
Result.transpose(ok(some(42)));   // Maybe<Result<T, E>>: some(ok(42))
Result.transpose(ok(none()));     // none()
Maybe.transpose(some(ok(42)));    // Result<Maybe<T>, E>: ok(some(42))
Maybe.transpose(none());          // ok(none())
```

---

## ESLint plugin

The plugin has two rules. `must-use-result` reports a Result that is dropped, and `no-unwrap` reports calls that turn an error back into a throw.

### Setup

```bash
npm install @semyonf/kamchazky @typescript-eslint/parser @typescript-eslint/utils typescript
```

Both rules use type information, so enable typed linting (`projectService`; see the [typescript-eslint docs](https://typescript-eslint.io/getting-started/typed-linting)). In tests a throw from `unwrap` is what you want, so the second config object turns `no-unwrap` off there. It must come after the first, because later objects override earlier ones:

```js
// eslint.config.mjs
import kamchazky from "@semyonf/kamchazky/eslint";
import parser from "@typescript-eslint/parser";

export default [
  {
    files: ["**/*.ts"],
    plugins: { kamchazky },
    rules: {
      "kamchazky/must-use-result": "error",
      "kamchazky/no-unwrap": "error",
    },
    languageOptions: {
      parser,
      parserOptions: {
        projectService: true,
        tsconfigRootDir: import.meta.dirname,
      },
    },
  },
  {
    files: ["**/*.test.ts", "**/*.spec.ts"],
    rules: { "kamchazky/no-unwrap": "off" },
  },
];
```

`require("@semyonf/kamchazky/eslint")` returns the same plugin object, so CommonJS and ESM configs can be mixed. The plugin type fits `defineConfig`, `Linter.Config` and `ESLint.Plugin`, so a type-checked `eslint.config.ts` compiles. Legacy `.eslintrc` is not supported, because the package does not follow the `eslint-plugin-*` naming that legacy configs require.

### ESLint Rule: `must-use-result`

The rule reports an expression whose value is dropped while its type is a Result, an array or tuple of Results, or a Promise of either. It also reports a Result-returning callback passed where the caller ignores the return value, such as `forEach` or an `onClick` handler.

```typescript
getResult();              // ❌ the error is lost
getAsyncResult();         // ❌ a Promise<Result> nobody awaits
await getAsyncResult();   // ❌ awaited, then dropped
maybeGetResult();         // ❌ Result<T, E> | null still holds an error
items.map(validate);      // ❌ an array of Results
await Promise.all(items.map(save)); // ❌ the same after Promise.all
items.forEach(validate);  // ❌ forEach ignores what validate returns
<Button onClick={() => save()} />; // ❌ so does onClick, typed () => void
save().catch(() => {});   // ❌ catch handles a rejection; a resolved Err is still lost
ready && getResult();     // ❌ the operator reads the Result, then drops it
getResult() as unknown;   // ❌ a cast does not keep the Result
Result.tryCatch(async () => save()); // ❌ reported wherever it appears, used or not
await Promise.allSettled([...pending]); // ❌ a new array; its fulfilled entries hold Results

// ✅ Allowed
const r = getResult();    // assigned
return getResult();       // returned
getResult().ok;           // read
doSomething(getResult()); // passed on
results.sort(cmp);        // returns the stored array it got
void save();              // an intentional discard, e.g. fire and forget
void Promise.allSettled([...pending]); // the same for a batch
```

`void` marks an intentional discard. Use it only where losing the error is fine: unlike a silent drop, it is visible in review.

### ESLint Rule: `no-unwrap`

`Result.unwrap` throws the error of an `Err`, `Maybe.unwrap` throws on `None`, and `Result.unwrapErr` throws on `Ok`. The rule reports every reference to a function named `unwrap` or `unwrapErr` whose first parameter is a Result or a Maybe, whether it is called or passed on.

```typescript
Result.unwrap(r);         // ❌ throws on Err
Maybe.unwrap(m);          // ❌ throws on None
promise.then(Result.unwrap); // ❌ passed on, throws when called
Result.unwrapErr(r);      // ❌ throws on Ok
Result[`unwrap`](r);      // ❌ a computed key with the literal type "unwrap"
const { unwrap } = Result; // ❌ reported here, so every later use is covered
const { unwrap: take } = Result; // ❌ renamed too
Result[key](r, 0);        // ❌ with key: "unwrap" | "unwrapOr", it may be unwrap
const [take] = fns;       // ❌ with fns: (typeof Result.unwrap)[]
fns[0](r);                // ❌ the same element, called

// ✅ Allowed
const [failure, value] = Result.split(r);
Result.unwrapOr(r, 0);
Result.match(r, { ok: (v) => v, err: () => 0 });
```

### Limitations

- **Results are matched by shape.** Any type shaped like a Result counts, not only the types of this package. The `ok` field must be the literal `true` or `false`, so a response type such as `{ ok: boolean; error?: string }` is not a Result.
- **Only nullish extras are allowed in a union.** `Result<T, E> | null`, `| undefined` and `| void` are checked, while `Result<T, E> | string` is skipped. Arrays and tuples count when an element holds a Result, nested up to 8 levels.
- **Only known calls hand a stored value back.** On a variable or a field, `sort`, `reverse`, `fill`, `copyWithin`, `shift`, `pop`, `splice`, `Object.freeze` / `seal` / `preventExtensions`, `Result.inspect` / `inspectError`, and `finally` or `await` of a stored Promise lose nothing, so they are allowed. Any other function is reported, and so is a getter that computes its value.
- **Callbacks are checked where they are passed.** That is an argument, a JSX attribute or an object literal property whose type returns `void`, also behind `!`, `?.` or a cast and when the callback is optional. A callback assigned to a variable, `const cb: () => void = () => save()`, is not checked.
- **A Result used as a condition is not checked.** `if (getResult())` is always true; `@typescript-eslint/no-unnecessary-condition` reports it.
- **An assigned Result is not tracked.** `const r = getResult();` is allowed even if `r` is never read; TypeScript's `noUnusedLocals` reports that.
- **`no-unwrap` matches by name.** It sees the name in a member access, a destructuring pattern and a computed key whose type is that name or a union with it. `Result[name as string]` and `Reflect.get(Result, "unwrap")` are missed.

---

## Edge cases

### Async callbacks

`tryCatch`, `Result.map` and `Maybe.map` do not await. With a callback that returns a Promise they return a type that is not a Result, so the first use of the result does not compile, and the message names the fix:

```typescript
const r = Result.tryCatch(async () => save());
r.ok; // ❌ Property 'ok' does not exist — "Use Result.tryCatchAsync …"
```

The callbacks of `flatMap`, `orElse` and the other chaining functions must return a Result, so an async one fails to compile there too. The check uses overloads, so generic code compiles: `<T>(f: () => T) => Result.tryCatch(f)` is `Result<T, Error>`. A callback that returns `T | Promise<T>` is not caught, and an untyped (`any`) one is not taken for an async one.

At runtime `map` does not check and gives an `Ok` with a Promise inside. `tryCatch` never gives an `Ok` with a thenable: it returns an `Err` with a `TypeError` whose `cause` is the thenable, passed through `onError` like a thrown error. By then `fn` has run, and its side effects, such as an insert, have started. `tryCatch` never calls `then`, so a lazy thenable such as a query builder does not execute, and a rejection of the returned Promise is unhandled, which ends a Node process by default. Use `tryCatchAsync`, or await the `cause`.

`must-use-result` reports these calls wherever they appear, including the case the types miss: a call whose result is never used.

### Untyped (`any`) values

An `any` would spread silently through your code, so the library turns it into `unknown` or `Error` where it can.

| You pass | You get | Example |
|---|---|---|
| an `any` input | `unknown` value, `Error` error | `Result.unwrap(x)` is `unknown`; `Result.map(x, (v: number) => v + 1)` is `Result<number, Error>` |
| an `any` that the function of `tryCatch` / `tryCatchAsync`, a `map` callback or the Promise of `fromPromise` gives | `unknown` value | `Result.tryCatch(() => JSON.parse(s))` is `Result<unknown, Error>` |
| an untyped callback | `unknown` value, plus `Error` where the callback makes the error | `Result.map(r, legacy.fn)` is `Result<unknown, E>`; `Result.flatMap(r, legacy.fn)` is `Result<unknown, E \| Error>`; `Result.orElse(r, legacy.fn)` is `Result<unknown, Error>` |
| `match` with one untyped handler, either one | `unknown` | `Result.match(r, { ok: (v) => v, err: legacy.fn })` is `unknown` |
| `match` on an `any` input with typed handlers | the union of the handler results; `err` must take an `Error` | `Result.match(x, { ok: (v: string) => v, err: (e) => e })` is `string \| Error` |
| an `onError`, an error factory or a `mapError` callback that returns `any` | `Error` | `Result.mapError(r, (e) => legacy.wrap(e))` is `Result<number, Error>`; `Result.fromNullable(n, () => legacy.wrap())` is `Result<number, Error>` |
| an `any` value given directly | `any` | `ok(x)` is `OkResult<any>`; `err(x)` is `ErrResult<any>`; `Result.unwrapOr(r, x)` is `any`; `Maybe.fromNullable(x)` is `Maybe<any>` |

- The input must still be a Result, and a callback that annotates its parameter must fit it: `Result.map(fetchUser(), legacy.fn)` (a forgotten `await`) and `Result.flatMap(r, (v: string) => legacy(v))` on a `Result<number, E>` do not compile. In generic code the error type is kept: `<T, E extends Error>(r: Result<T, E>) => Result.map(r, legacy.fn)` returns `Result<unknown, E>`.
- An `unknown` needs a check or a cast before use: `const s: string = Result.unwrap(x)` does not compile when `x` is `any`. Cast where the `any` comes from: `Result.tryCatch(() => JSON.parse(s) as Config)` is `Result<Config, Error>`.

### Throws inside callbacks

No function catches a throw from your callback. When a callback of `map`, `mapError`, `flatMap`, `orElse`, `inspect`, `match`, `unwrapOrElse`, an error factory or a `Maybe` function throws, the error leaves the call and does not become an `Err`. Wrap code that can throw in `tryCatch`, inside `flatMap` when it works on the value:

```typescript
Result.flatMap(r, (s) => Result.tryCatch(() => JSON.parse(s)));
```

The same holds for `onError`: what it throws, `tryCatch` throws, and `tryCatchAsync` and `fromPromise` reject with. A mapper can use this to turn the errors it knows into an `Err` and let the rest through:

```typescript
Result.tryCatch(
  () => repo.load(id),
  (e) => {
    if (e instanceof NotFoundError) return e; // → Err(NotFoundError)
    throw e;                                  // a bug — let it through
  },
); // Result<Entity, NotFoundError>
```

### Input checks and JSON

A value that is not a Result or a Maybe can reach a function only through `any` or from JavaScript. It is a bug, so the function throws a `TypeError` instead of returning an `Err` that looks like a real failure. A Result must be `{ ok: true, value }` or `{ ok: false, error }` with an `Error` in `error`; a Maybe must be `{ some: true, value }` or `{ some: false }` without a `value`.

- The combinators check every item before they return the first `Err`: `TypeError("Result.all: item 1 is not a Result")`, with a zero-based index. `allAsync`, `collectAsync` and `Maybe.allAsync` reject with it, also when another item rejects.
- `unwrap`, `unwrapErr`, `unwrapOr`, `unwrapOrElse`, `split`, `match` and their `Maybe` counterparts check the input before they call a callback: `TypeError("Result.unwrap: input is not a Result")`.
- `flatten` and `transpose` check the input and the value inside it: `Result.flatten(ok(5))` throws `TypeError("Result.flatten: value is not a Result")`.
- `map`, `flatMap`, `isOk` and the other functions do not check; they read `ok` or `some` as it is.

A combinator takes either items or one array. An array followed by other items, `Result.all([a], b)`, throws; an array followed by a number is the call that `map` and `Array.from` make, so the array is read as the list.

JSON drops `value: undefined`, so `Result.ok()` sent through an HTTP body, a queue or a cache arrives as `{ ok: true }`, which is not a Result. An API response such as `{ ok: false, error: "denied" }` is not one either. Send `Result.ok(null)`, or rebuild the Result with `ok` / `err` after parsing.

### Point-free use

A function passed without an arrow, as in `rs.map(Result.unwrap)`, receives the index and the array as extra arguments, and TypeScript types it by its last overload.

- `unwrap`, `unwrapErr`, `split`, `flatten`, `transpose`, `Maybe.unwrap` and `Maybe.transpose` have one signature and keep their types: `rs.map(Result.unwrap)` is `number[]`.
- Other functions lose their generic types: `nums.map(Result.ok)` is `OkResult<unknown>[]`, and `groups.map(Result.all)` is `Result<readonly unknown[], Error>[]`.
- The combinators, `ok`, `tryCatch`, `tryCatchAsync` and `fromPromise` ignore the extra arguments at runtime. Others use them: `rs.map(Result.unwrapOr)` returns the index for an `Err`, and `rs.map(Result.flatMap)` throws a `TypeError` for an `Ok`, because the index is not a function.

Write an arrow to keep both the types and the meaning: `nums.map((n) => Result.ok(n))`.

### Error detection

`normalizeError`, `err` and `isResult` decide what an `Error` is. They use `Error.isError` where the runtime has it, and Node's `util.types.isNativeError` on Node 20.16+ and 22.3+, which lack `Error.isError`. Both recognize a real Error from any realm, whatever its `Symbol.toStringTag`. A polyfill of `Error.isError` that only reads the tag, such as the core-js one, is ignored.

Without either check, the library reads the built-in tag. A real Error that sets its own `Symbol.toStringTag` then counts as an Error only if it comes from this realm and has a string `message`. On every runtime, an object that only claims to be an Error (`{ [Symbol.toStringTag]: "Error" }`) is wrapped.

A real Error passes through as is, also one whose `message` is not a string: `Object.assign(new HttpError(), { message: { code: 401 } })` keeps its class, stack and object `message`. Where errors come from such code, read the message with `String(error.message)`.

### `None` across builds

`none()` returns one frozen object, also when the CommonJS and the ESM build run in one process: it is stored under `Symbol.for("@semyonf/kamchazky/none")` as a read-only property of the global object. A copy made by `structuredClone` or JSON is a different object, so check it with `Maybe.isNone` or `.some`, not `===`.

The library reuses a value already stored under that key only if it is a frozen `{ some: false }`. If it is something else, or the global object is not extensible, each build keeps its own `None`: `===` holds within one build, and `Maybe.isNone` works across all of them.

---

## Design decisions

**Discriminant fields, not methods.** Control-flow analysis narrows on a field, so `if (r.ok)` gives you the value without `.unwrap()`.

**Plain frozen objects and free functions.** A Result is `{ ok, value }` or `{ ok, error }` without methods, so test matchers, loggers and `structuredClone` treat it as data.

**The error type extends `Error`.** Strings and arbitrary values cannot be used as errors, while custom Error subclasses can.

**Give each error class a distinguishing member.** TypeScript compares classes by shape, so `class NotFound extends Error {}` is the same type as `Error`. A literal `name` makes the class distinct and lets you narrow on it:

```typescript
class NotFound extends Error {
  override readonly name = "NotFound" as const;
}
const r: Result<User, NotFound> = err(new Error("x")); // ❌ compile error
```

**`never` where nothing can produce a type, `unknown` for `any`.** `Result.orElse(r, () => ok(0))` is `Result<number, never>`, because the callback cannot fail; the same holds for `Result.flatMap(r, () => err(e))` and `Maybe.firstSome(none(), none())`. An `any` becomes `unknown`, not `never`, because `never` assigns silently to every type.

**A bad input throws, a failure is an `Err`.** A value that is not a Result is a programmer error, and an `Err` would hide it among real failures.

**`all()` fails fast, `collect()` gathers.** Use `collect` when you need every error, as in form validation.

**`collect()` uses `AggregateError`.** It is a standard `Error` subclass, so it fits `E extends Error`, and `AggregateErrorOf<E>` types its `.errors` as `E[]`. Its message counts the failures (`Result.collect: 2 of 3 items failed`); `structuredClone` copies it as a plain `Error` without `.errors`.

**`flatten()` unites the error types.** The inner and the outer Result can fail differently, and the result is `Result<T, E | F>`.

**No error type on `OkResult`, no value on `None`.** Each branch carries only what it can hold.

## Upgrading

Breaking changes and the steps to upgrade are in [CHANGELOG.md](CHANGELOG.md).

## License

MIT
