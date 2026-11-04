---
"@semyonf/kamchazky": major
---

**Breaking:** `Result.map` and `Maybe.map` reject async callbacks in the
types. `Result.map(r, async (v) => …)` used to give
`Result<Promise<U>, E>`: an `Ok` holding a Promise whose rejection nobody
awaits. Now the result type is not a `Result` (or `Maybe`), so its first
use is a compile error that says `map` does not await. Await the value
first, or wrap the async work in `Result.tryCatchAsync`.

The check is made with overloads, so generic callbacks
(`<U>(f: (n: number) => U) => Result.map(r, f)`) compile, and a callback
that returns `T | Promise<T>` is not caught. The runtime is unchanged.
