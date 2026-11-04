# kamchazky

Type-safe `Result` and `Maybe` monads for TypeScript. Explicit error handling and optional values with full type inference — no exceptions required.

## Install

```
npm install @semyonf/kamchazky
```

## Quick Start

`Result<T, E>` is a discriminated union. Check `result.ok` once and TypeScript knows exactly what you have — no `.unwrap()`, no casting, no runtime surprises:

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

// Works in ternaries, early returns, switches — anywhere TypeScript does control-flow analysis.
```

Most Result libraries (including oxide.ts) expose `.ok()` as a *method*, which returns a plain `boolean`. TypeScript sees no connection between that boolean and the original type, so you still have to call `.unwrap()` and hope it doesn't throw, which kinda defeats the purpose. This library uses a discriminant field so the compiler does the work for you.

---

## Result

### Types

#### `Result<T, E extends Error = Error>`

Union of `OkResult<T> | ErrResult<E>`.

#### `OkResult<T>`

```typescript
type OkResult<T> = {
  readonly ok: true;
  readonly value: T;
};
```

#### `ErrResult<E extends Error>`

```typescript
type ErrResult<E extends Error> = {
  readonly ok: false;
  readonly error: E;
};
```

### API

All functions are available on the `Result` namespace and the most common ones (`ok`, `err`, `isResult`, `isOk`, `isErr`, `normalizeError`) are also exported at the top level.

#### Creating results

```typescript
// From values
Result.ok(42);                    // OkResult<number>
Result.ok();                      // OkResult<undefined>
Result.err(new Error("fail"));    // ErrResult<Error>

// From nullable values
Result.fromNullable(
  await findUser(id),
  () => new NotFoundError(`User ${id} not found`),
); // Result<User, NotFoundError>

// From predicates (supports type guards; the factory receives the rejected value)
Result.fromPredicate(
  value,
  (v): v is string => typeof v === "string",
  (v) => new TypeError(`expected string, got ${typeof v}`),
); // Result<string, TypeError>

// From functions that may throw
Result.tryCatch(() => JSON.parse(input));
Result.tryCatchAsync(() => fetch("/api").then(r => r.json()));

// From promises that may reject
Result.fromPromise(fetch("/api"));
Result.fromPromise(
  fetch("/api"),
  (e) => new NetworkError(String(e)),
); // Promise<Result<Response, NetworkError>>

// With custom error mapping
Result.tryCatch(
  () => JSON.parse(input),
  (e) => new ParseError(String(e)),
); // Result<unknown, ParseError>
```

`tryCatch` is for synchronous code only: it cannot catch a rejection it does not await, so use `tryCatchAsync` for async functions. For a function that returns a Promise, `tryCatch` does not return a `Result` type, so the first use of the result is a compile error that names `tryCatchAsync`:

```typescript
const r = Result.tryCatch(async () => save());
r.ok; // ❌ Property 'ok' does not exist — "Use Result.tryCatchAsync …"
```

The check is made with overloads, so generic code compiles: `<T>(f: () => T) => Result.tryCatch(f)` returns `Result<T, Error>`. Two cases are not caught at compile time: a return type that is only partly a Promise (`number | Promise<number>`) and a call whose result is never used. At runtime a returned Promise gives `Err(TypeError)` with the Promise as `cause`, never an `Ok` holding it, and its rejection does not crash the process as an unhandled rejection.

Whatever `onError` throws propagates unchanged: `tryCatch` throws it, `tryCatchAsync` and `fromPromise` reject with it. This lets a mapper turn known errors into `Err` and let the rest through:

```typescript
Result.tryCatch(
  () => repo.load(id),
  (e) => {
    if (e instanceof NotFoundError) return e; // → Err(NotFoundError)
    throw e;                                  // a bug — let it through
  },
); // Result<Entity, NotFoundError>
```

#### Checking unknown values

```typescript
Result.isResult(value); // value is Result<unknown, Error>
```

`isResult` is for decorators, interceptors and other generic code that receives `unknown`. It accepts `{ ok: true, value }` and `{ ok: false, error }` where `error` is an `Error`.

#### Transforming

```typescript
// Transform the value
Result.map(result, (value) => value * 2);

// Transform the error
Result.mapError(result, (e) => new AppError(e.message));

// Chain Result-returning operations
Result.flatMap(result, (value) => validate(value));

// Recover from errors
Result.orElse(result, (error) => ok(defaultValue));

// Flatten nested Results (inner and outer error types can differ)
Result.flatten(ok(ok(42))); // ok(42)

// Observe values without transforming (useful for logging)
Result.inspect(result, (value) => console.log("got", value));
Result.inspectError(result, (error) => console.error(error));
```

`map` does not await. An async callback would give `Ok(Promise)`, and a rejection of that Promise would be lost, so the types reject it: the result of `Result.map(r, async (v) => …)` is not a `Result`, and its first use is a compile error. Await the value first, or wrap the async work in `Result.tryCatchAsync`. `Maybe.map` works the same way. Like `tryCatch`, this is checked with overloads: generic callbacks compile, and a callback that returns `T | Promise<T>` is not caught. The runtime does not check it.

#### Extracting values

```typescript
Result.unwrap(result);              // returns value or throws error
Result.unwrapErr(result);           // returns error or throws on Ok — mostly for tests
Result.unwrapOr(result, fallback);  // returns value or fallback (same type)
Result.unwrapOrElse(result, (error) => computeFallback(error));
```

`unwrapOr` and `unwrapOrElse` take a fallback of the success type `T`: `Result.unwrapOr(r, "x")` on a `Result<number, E>` is a compile error. `null` and `undefined` are the exception, TypeScript adds them to `T`: `Result.unwrapOr(r, null)` gives `number | null`. Use `match` when you need a different return type.

The `unwrapOrElse` callback receives the error, and the `fromPredicate` error factory receives the rejected value (since 2.0). A callback with an optional first parameter now gets that argument instead of `undefined`: `(m?: string) => new Error(m ?? "default")` receives the value.

`split` turns a `Result` into a `[failure, value]` tuple, for early returns without `.value`:

```typescript
const [failure, user] = Result.split(await findUser(id));
if (failure) return failure; // ErrResult<E>, returned as is
user;                         // User
```

#### Pattern matching

```typescript
Result.match(result, {
  ok: (value) => `Success: ${value}`,
  err: (error) => `Error: ${error.message}`,
});
```

The branches may return different types; the result is their union. `Result.match(r, { ok: (v) => v, err: () => null })` gives `number | null`.

`Result.exhaustive(value)` is a compile-time exhaustiveness guard — it only accepts `never`, so a `switch` or `if`/`else` chain over a Result union fails to compile when a branch is missed:

```typescript
if (result.ok) return result.value;
if (!result.ok) return handle(result.error);
return Result.exhaustive(result); // compiles only if all cases are handled
```

#### Combining results

```typescript
// Combine multiple results — fail-fast, returns first error
const r = Result.all(fetchUser(id), fetchPosts(id));
// Result<readonly [User, Post[]], UserError | PostError>

// Async variant — resolves all promises concurrently. A rejected promise
// becomes an Err with a normalized Error, hence the extra `| Error`.
const r = await Result.allAsync(fetchUserAsync(id), fetchPostsAsync(id));
// Result<readonly [User, Post[]], UserError | PostError | Error>

// Collect all errors instead of failing fast
const r = Result.collect(
  validateName(input.name),
  validateEmail(input.email),
  validateAge(input.age),
); // Result<readonly [Name, Email, Age], AggregateErrorOf<NameError | EmailError | AgeError>>
// On failure: r.error is an AggregateError; r.error.errors holds every
// individual error, typed (NameError | EmailError | AgeError)[], not any[]

// Async variant of collect — resolves all promises, gathers every error
// (including raw rejections, which are normalized to Error)
const r = await Result.collectAsync(fetchA(), fetchB(), fetchC());
// Result<readonly [A, B, C], AggregateErrorOf<AError | BError | CError | Error>>
```

Every combinator also takes one array, for a dynamic list:

```typescript
const r = Result.all(items.map(validate)); // Result<Item[], ValidationError>
const r = await Result.allAsync(ids.map(fetchUser));
```

Pass the array itself, not `...items`: spreading a large array into arguments throws `RangeError: Maximum call stack size exceeded` (around 150 000 elements on Node 24). An array literal keeps exact tuple types: `Result.all([a, b])` gives `readonly [A, B]`.

#### Error normalization

```typescript
Result.normalizeError(new TypeError("t")); // returns the TypeError as-is
Result.normalizeError("oops");             // new Error("oops")
Result.normalizeError(42);                 // new Error("42")
Result.normalizeError({ message: "db down", code: "ECONNREFUSED" });
// new Error("db down", { cause: <the object> })
Result.normalizeError({ status: 401, config: { headers: { Authorization: "…" } } });
// new Error("Non-Error object thrown", { cause: <the object> })
```

Objects are never serialized into the message: a rejected response or config object can carry tokens and headers, and messages end up in logs and error trackers. The original object is kept as `cause`. `Result.err()` applies the same normalization to a non-`Error` value that reaches it through `any`, so `result.error.message` is always a string.

---

## Maybe

### Types

#### `Maybe<T>`

Union of `Some<T> | None`.

#### `Some<T>`

```typescript
type Some<T> = {
  readonly some: true;
  readonly value: T;
};
```

#### `None`

```typescript
type None = {
  readonly some: false;
};
```

### API

All functions are available on the `Maybe` namespace and the most common ones (`some`, `none`, `isSome`, `isNone`) are also exported at the top level.

#### Creating maybes

```typescript
// From values
Maybe.some(42);  // Some<number>
Maybe.none();    // None

// From nullable values (no error factory needed, unlike Result)
Maybe.fromNullable(document.getElementById("app")); // Maybe<HTMLElement>

// From predicates (supports type guards)
Maybe.fromPredicate(
  value,
  (v): v is string => typeof v === "string",
); // Maybe<string>
```

#### Transforming

```typescript
// Transform the value
Maybe.map(maybe, (value) => value * 2);

// Chain Maybe-returning operations
Maybe.flatMap(maybe, (value) => findById(value));

// Flatten nested Maybes
Maybe.flatten(some(some(42))); // some(42)

// Filter — keep Some only if predicate passes (supports type guards)
Maybe.filter(maybe, (x) => x > 0);

// Observe values without transforming
Maybe.inspect(maybe, (value) => console.log("got", value));
```

#### Extracting values

```typescript
Maybe.unwrap(maybe);                    // returns value or throws
Maybe.unwrapOr(maybe, fallback);        // returns value or fallback (same type)
Maybe.unwrapOrElse(maybe, () => compute()); // returns value or computes fallback
```

#### Pattern matching

```typescript
Maybe.match(maybe, {
  some: (value) => `Found: ${value}`,
  none: () => "Not found",
});
```

#### Combining maybes

```typescript
// Combine multiple maybes — returns None if any is None
const m = Maybe.all(findUser(id), findSettings(id));
// Maybe<[User, Settings]>

// Return the first Some found
const m = Maybe.firstSome(fromCache(id), fromDb(id), defaultValue);
// Maybe<User>

// Async variant — resolves all promises concurrently
const m = await Maybe.allAsync(findUserAsync(id), findSettingsAsync(id));
// Maybe<[User, Settings]>

// Each also takes one array, for a dynamic list
const m = Maybe.all(ids.map(findCached)); // Maybe<User[]>
```

`None` means "no value", not "failed". If any promise passed to `Maybe.allAsync` rejects, the returned promise rejects with the first rejection reason in argument order, even when another input is `None`. Use `Result.allAsync` or `Result.collectAsync` to get errors as values.

---

## Interop

Convert between `Result` and `Maybe`:

```typescript
// Result → Maybe (discards the error)
Result.toMaybe(ok(42));            // some(42)
Result.toMaybe(err(new Error())); // none()

// Maybe → Result (requires an error factory for the None case)
Result.fromMaybe(some(42), () => new Error("missing")); // ok(42)
Result.fromMaybe(none(), () => new Error("missing"));   // err(Error("missing"))

// Same operations from the Maybe side
Maybe.fromResult(ok(42));                                  // some(42)
Maybe.toResult(some(42), () => new Error("missing"));     // ok(42)

// Transpose nested containers
Result.transpose(ok(some(42)));   // Maybe<Result<T, E>>: some(ok(42))
Result.transpose(ok(none()));     // none()
Maybe.transpose(some(ok(42)));    // Result<Maybe<T>, E>: ok(some(42))
Maybe.transpose(none());          // ok(none())
```

---

## ESLint Rule: `must-use-result`

A `Result` carries an error that must not be silently lost. The `must-use-result` rule catches discarded Results at lint time — it flags any expression statement whose type looks like a `Result` (a discriminated union of `{ ok: true; value }` / `{ ok: false; error }` shapes), an array or tuple of Results, or a `Promise` of either. It also flags a Result-returning callback passed where the caller ignores the callback's return value, such as `forEach`.

### Setup

```bash
npm install @semyonf/kamchazky @typescript-eslint/parser @typescript-eslint/utils typescript
```

The rule is type-aware, so typed linting must be enabled (`projectService`; see the [typescript-eslint typed linting docs](https://typescript-eslint.io/getting-started/typed-linting)):

```js
// eslint.config.mjs (flat config)
import kamchazky from "@semyonf/kamchazky/eslint";
import parser from "@typescript-eslint/parser";

export default [
  {
    files: ["**/*.ts"],
    plugins: { kamchazky },
    rules: { "kamchazky/must-use-result": "error" },
    languageOptions: {
      parser,
      parserOptions: {
        projectService: true,
        tsconfigRootDir: import.meta.dirname,
      },
    },
  },
];
```

CommonJS configs work too: `require("@semyonf/kamchazky/eslint")` returns the plugin object.

Legacy `.eslintrc` config is not supported: legacy plugin resolution requires the `eslint-plugin-*` package naming convention, which this package does not follow. Use flat config (default since ESLint 9).

### What it catches

```typescript
getResult();              // ❌ discarded — error is lost
await getAsyncResult();   // ❌ discarded — error is lost
getAsyncResult();         // ❌ un-awaited Promise<Result> — error is lost
const r = getResult();
r;                        // ❌ assigned then discarded
(getResult(), other());   // ❌ discarded inside a sequence expression
maybeGetResult();         // ❌ Result<T, E> | null is still a Result
items.map(validate);      // ❌ array of Results discarded
await Promise.all(items.map(save)); // ❌ array of Results discarded
items.forEach(validate);  // ❌ forEach ignores what validate returns
items.map(validate).sort(cmp); // ❌ sort returns the fresh array from map
save().catch(() => undefined); // ❌ catch handles a rejection; a resolved Err is still lost

// ✅ Allowed
const r = getResult();    // assigned
r = getResult();          // reassigned
return getResult();       // returned
getResult().ok;           // read
doSomething(getResult()); // passed as argument
results.sort(cmp);        // returns the same stored array — nothing is lost
Object.freeze(results);   // returns its argument — nothing is lost
void save();              // an intentional discard, e.g. fire and forget
```

The rule uses TypeScript's type checker, so it works with any type that structurally matches a `Result` — not just `@semyonf/kamchazky` types. To avoid false positives on API response shapes like `{ ok: boolean; error?: string }`, the `ok` discriminant must be a literal `true`/`false` — a plain `boolean` gives no narrowing and is not treated as a Result.

### Limitations

- **`void` marks an intentional discard.** `void getResult();` evaluates to `undefined`, so the rule does not flag it. Write `void` only where losing the error is really fine; it is visible in review, unlike a silent discard.
- **Only known identity calls are skipped.** `sort`, `reverse`, `fill` and `copyWithin` on an array, and `Object.freeze` / `seal` / `preventExtensions`, return what they got, so on a stored array they are allowed. Another function that returns its argument is still flagged.
- **Only unions with nullish extras are detected.** `Result<T, E> | null | undefined` is caught, but a union with any other non-Result member (e.g. `Result<T, E> | string`) is skipped.
- **Callbacks are checked only where the parameter returns `void`.** `forEach(validate)` is flagged. A parameter typed `() => unknown` may use the return value, so passing a Result-returning function there is allowed.
- **An assigned Result is not tracked further.** `r = getResult();` is allowed even if `r` is never read; TypeScript's `noUnusedLocals` covers unused variables.

## ESLint Rule: `no-unwrap`

`Result.unwrap` throws the contained error on `Err`, and `Maybe.unwrap` throws on `None`. The thrown error leaves the Result flow, so neither the type nor `must-use-result` tracks it. The `no-unwrap` rule flags any reference to a function named `unwrap` whose first parameter looks like a `Result` or a `Maybe`, called or passed on.

```js
// eslint.config.js (flat config)
rules: {
  "kamchazky/must-use-result": "error",
  "kamchazky/no-unwrap": "error",
},
```

In tests a throw is what you want, since the test fails with the thrown error. Turn the rule off there:

```js
{
  files: ["**/*.test.ts", "**/*.spec.ts"],
  rules: { "kamchazky/no-unwrap": "off" },
},
```

### What it catches

```typescript
Result.unwrap(r);         // ❌ throws on Err
Maybe.unwrap(m);          // ❌ throws on None
promise.then(Result.unwrap); // ❌ passed on, throws when called
const { unwrap } = Result;
unwrap(r);                // ❌ same function under its own name

// ✅ Allowed
const [failure, value] = Result.split(r);
Result.unwrapOr(r, 0);
Result.match(r, { ok: (v) => v, err: () => 0 });
```

### Limitations

- **A renamed or detached function is not detected.** The rule matches by name: `const { unwrap: take } = Result; take(r);` is missed. After `const { unwrap } = Result;` only a direct call `unwrap(r)` is flagged, not `rs.map(unwrap)`.

---

## Design Decisions

**Discriminant fields, not methods** — `result.ok` and `maybe.some` are boolean fields, not methods. TypeScript's control-flow analysis works directly with discriminant fields, giving you automatic narrowing without `.unwrap()`.

**Error type must extend `Error`** — prevents using strings or arbitrary values as errors while allowing custom Error subclasses.

**Give each error class a distinguishing member** — TypeScript compares classes by shape, so `class NotFound extends Error {}` is the same type as `Error`, and `err(new Error())` is accepted where `Result<T, NotFound>` is declared. A literal `name` makes the class distinct and lets you narrow by it:

```typescript
class NotFound extends Error {
  override readonly name = "NotFound" as const;
}
const r: Result<User, NotFound> = err(new Error("x")); // ❌ compile error
```

**No `unknown` or `Error` where nothing can be inferred** — an error or value type that has no source becomes `never`. `Result.orElse(r, () => ok(0))` is `Result<number, never>`, `Result.flatMap(r, () => err(e))` is `Result<never, …>`, `Maybe.firstSome(none(), none())` is `Maybe<never>`.

**Singleton `None`** — `none()` always returns the same frozen object, also when both the CommonJS and the ESM build are loaded in one process (it is registered under `Symbol.for("@semyonf/kamchazky/none")`). Safe to compare with `===`.

**Fail-fast `all()`** — returns the first error/None rather than collecting all errors. Use `Result.collect()` when you need all errors (e.g., validation).

**`collect()` uses `AggregateError`** — a standard ES2021 `Error` subclass with an `.errors` array, satisfying the `E extends Error` constraint. Its type is `AggregateErrorOf<E>`, an `AggregateError` whose `.errors` is `E[]` instead of the built-in `any[]`.

**`flatten()` supports different error types** — inner and outer `Result`s can have different error types; the result unions them (`E | F`).

**No error type on `OkResult` / no value on `None`** — keeps signatures clean and prevents ghost types from polluting the wrong branch.

## License

MIT
