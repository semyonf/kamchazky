# result

Type-safe `Result` and `Maybe` monads for TypeScript. Explicit error handling and optional values with full type inference — no exceptions required.

## Install

```
npm install @semyonf/camtschaticus
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
  map<U>(fn: (value: T) => U): OkResult<U>;
  flatMap<U, F extends Error = never>(fn: (value: T) => Result<U, F>): Result<U, F>;
  mapError<F extends Error>(fn: (error: never) => F): OkResult<T>;
  inspect(fn: (value: T) => void): OkResult<T>;
  inspectError(fn: (error: never) => void): OkResult<T>;
};
```

#### `ErrResult<E extends Error>`

```typescript
type ErrResult<E extends Error = Error> = {
  readonly ok: false;
  readonly error: E;
  map<U>(fn: (value: never) => U): ErrResult<E>;
  flatMap<U, F extends Error = never>(fn: (value: never) => Result<U, F>): ErrResult<E>;
  mapError<F extends Error>(fn: (error: E) => F): ErrResult<F>;
  inspect(fn: (value: never) => void): ErrResult<E>;
  inspectError(fn: (error: E) => void): ErrResult<E>;
};
```

### API

All functions are available on the `Result` namespace and the most common ones (`ok`, `err`, `isOk`, `isErr`, `normalizeError`) are also exported at the top level.

#### Creating results

```typescript
// From values
Result.ok(42);                    // OkResult<number>
Result.err(new Error("fail"));    // ErrResult<Error>

// From nullable values
Result.fromNullable(
  await findUser(id),
  () => new NotFoundError(`User ${id} not found`),
); // Result<User, NotFoundError>

// From predicates (supports type guards)
Result.fromPredicate(
  value,
  (v): v is string => typeof v === "string",
  () => new TypeError("expected string"),
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

All transformations are also available as instance methods for chaining:

```typescript
ok(10)
  .inspect((x) => console.log("start:", x))
  .map((x) => x + 5)
  .flatMap((x) => x > 10 ? ok(x) : err(new Error("too small")))
  .mapError((e) => new AppError(e.message))
  .inspectError((e) => console.error(e));
```

#### Extracting values

```typescript
Result.unwrap(result);              // returns value or throws error
Result.unwrapOr(result, fallback);  // returns value or fallback (same type)
Result.expect(result, "msg");       // returns value or throws with message
```

`unwrapOr` requires the fallback to be the same type `T` as the success value. Use `match` when you need a different return type.

#### Pattern matching

```typescript
Result.match(result, {
  ok: (value) => `Success: ${value}`,
  err: (error) => `Error: ${error.message}`,
});
```

#### Combining results

```typescript
// Combine multiple results — fail-fast, returns first error
const r = Result.all(fetchUser(id), fetchPosts(id));
// Result<[User, Post[]], Error>

// Async variant — resolves all promises concurrently
const r = await Result.allAsync(fetchUserAsync(id), fetchPostsAsync(id));
// Result<[User, Post[]], Error>

// Collect all errors instead of failing fast
const r = Result.collect(
  validateName(input.name),
  validateEmail(input.email),
  validateAge(input.age),
); // Result<[Name, Email, Age], AggregateError>
// On failure: r.error.errors contains all individual errors
```

`all` and `collect` use exact tuple inference — pass results as individual arguments. Spreading an array (`...arr`) loses the tuple types and degrades values to `unknown[]`.

#### Error normalization

```typescript
Result.normalizeError(new TypeError("t")); // returns the TypeError as-is
Result.normalizeError("oops");             // new Error("oops")
Result.normalizeError(42);                 // new Error("42")
```

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
  map<U>(fn: (value: T) => U): Some<U>;
  flatMap<U>(fn: (value: T) => Maybe<U>): Maybe<U>;
  filter(predicate: (value: T) => boolean): Maybe<T>;
  inspect(fn: (value: T) => void): Some<T>;
};
```

#### `None`

```typescript
type None = {
  readonly some: false;
  map<U>(fn: (value: never) => U): None;
  flatMap<U>(fn: (value: never) => Maybe<U>): None;
  filter(predicate: (value: never) => boolean): None;
  inspect(fn: (value: never) => void): None;
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

All transformations are also available as instance methods for chaining:

```typescript
some(10)
  .inspect((x) => console.log("start:", x))
  .map((x) => x + 5)
  .flatMap((x) => x > 10 ? some(x) : none())
  .filter((x) => x < 100);
```

#### Extracting values

```typescript
Maybe.unwrap(maybe);              // returns value or throws
Maybe.unwrapOr(maybe, fallback);  // returns value or fallback (same type)
Maybe.expect(maybe, "msg");       // returns value or throws with message
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
```

---

## Interop

Convert between `Result` and `Maybe`:

```typescript
// Result → Maybe (discards the error)
Result.toMaybe(ok(42));            // some(42)
Result.toMaybe(err(new Error())); // none()

// Maybe → Result (requires an error for the None case)
Result.fromMaybe(some(42), new Error("missing")); // ok(42)
Result.fromMaybe(none(), new Error("missing"));   // err(Error("missing"))

// Same operations from the Maybe side
Maybe.fromResult(ok(42));                          // some(42)
Maybe.toResult(some(42), new Error("missing"));    // ok(42)
```

---

## Design Decisions

**Discriminant fields, not methods** — `result.ok` and `maybe.some` are boolean fields, not methods. TypeScript's control-flow analysis works directly with discriminant fields, giving you automatic narrowing without `.unwrap()`.

**Error type must extend `Error`** — prevents using strings or arbitrary values as errors while allowing custom Error subclasses.

**Singleton `None`** — `none()` always returns the same frozen object. Safe to compare with `===`.

**Fail-fast `all()`** — returns the first error/None rather than collecting all errors. Use `Result.collect()` when you need all errors (e.g., validation).

**`collect()` uses `AggregateError`** — a standard ES2021 `Error` subclass with an `.errors` array, satisfying the `E extends Error` constraint without custom types.

**`flatten()` supports different error types** — inner and outer `Result`s can have different error types; the result unions them (`E | F`).

**No error type on `OkResult` / no value on `None`** — keeps signatures clean and prevents ghost types from polluting the wrong branch.

## License

MIT
