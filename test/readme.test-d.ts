// Every typed claim of README.md, as written there.
import { describe, expectTypeOf, test } from "vitest";
import {
  type AggregateErrorOf,
  type ErrResult,
  err,
  Maybe,
  type None,
  none,
  type OkResult,
  ok,
  Result,
  type Some,
  some,
} from "../src/index.js";

class User {
  readonly kind = "user" as const;
}
class Post {
  readonly kind = "post" as const;
}
class Settings {
  readonly kind = "settings" as const;
}
class NotFoundError extends Error {
  override readonly name = "NotFoundError" as const;
}
class ApiError extends Error {
  override readonly name = "ApiError" as const;
}
class NetworkError extends Error {
  override readonly name = "NetworkError" as const;
}
class ParseError extends Error {
  override readonly name = "ParseError" as const;
}
class UserError extends Error {
  override readonly name = "UserError" as const;
}
class PostError extends Error {
  override readonly name = "PostError" as const;
}
class ValidationError extends Error {
  override readonly name = "ValidationError" as const;
}

describe("README: Quick Start", () => {
  test("narrowing on .ok and .some", () => {
    const result = ok(new User()) as Result<User, ApiError>;
    if (result.ok) expectTypeOf(result.value).toEqualTypeOf<User>();
    else expectTypeOf(result.error).toEqualTypeOf<ApiError>();
    const maybe = none() as Maybe<User>;
    if (maybe.some) expectTypeOf(maybe.value).toEqualTypeOf<User>();
  });
});

describe("README: Creating results; Async callbacks; Throws inside callbacks", () => {
  test("ok / err", () => {
    expectTypeOf(Result.ok(42)).toEqualTypeOf<OkResult<number>>();
    expectTypeOf(Result.ok()).toEqualTypeOf<OkResult<undefined>>();
    expectTypeOf(Result.err(new Error("fail"))).toEqualTypeOf<
      ErrResult<Error>
    >();
  });

  test("fromNullable / fromPredicate", () => {
    const found = null as User | null;
    expectTypeOf(
      Result.fromNullable(found, () => new NotFoundError("x"))
    ).toEqualTypeOf<Result<User, NotFoundError>>();
    const value = 1 as unknown;
    expectTypeOf(
      Result.fromPredicate(
        value,
        (v): v is string => typeof v === "string",
        (v) => new TypeError(`expected string, got ${typeof v}`)
      )
    ).toEqualTypeOf<Result<string, TypeError>>();
  });

  test("fromPromise with a mapper", () => {
    const response = Promise.resolve(new Post());
    expectTypeOf(
      Result.fromPromise(response, (e) => new NetworkError(String(e)))
    ).toEqualTypeOf<Promise<Result<Post, NetworkError>>>();
  });

  test("tryCatch of JSON.parse with a mapper", () => {
    expectTypeOf(
      Result.tryCatch(
        () => JSON.parse("1"),
        (e) => new ParseError(String(e))
      )
    ).toEqualTypeOf<Result<unknown, ParseError>>();
  });

  test("tryCatch with an async fn: the first use does not compile", () => {
    const save = async () => 1;
    const r = Result.tryCatch(async () => save());
    // @ts-expect-error — not a Result
    r.ok;
  });

  test("tryCatch in generic code", () => {
    const wrap = <T>(f: () => T) => Result.tryCatch(f);
    expectTypeOf(wrap(() => 1)).toEqualTypeOf<Result<number, Error>>();
  });

  test("a mapper that rethrows unknown errors", () => {
    const load = (): User => new User();
    expectTypeOf(
      Result.tryCatch(load, (e) => {
        if (e instanceof NotFoundError) return e;
        throw e;
      })
    ).toEqualTypeOf<Result<User, NotFoundError>>();
  });
});

describe("README: Transforming, Extracting values, Async callbacks", () => {
  const r = ok(1) as Result<number, TypeError>;

  test("map with an async callback is not a Result", () => {
    const m = Result.map(r, async (v) => v);
    // @ts-expect-error — not a Result
    m.ok;
  });

  test("unwrapOr takes a fallback of the value type, plus null", () => {
    // @ts-expect-error — a string fallback for a number value
    Result.unwrapOr(r, "x");
    expectTypeOf(Result.unwrapOr(r, null)).toEqualTypeOf<number | null>();
  });

  test("split narrows the value after checking failure", () => {
    const f = (): Result<number, TypeError> => {
      const [failure, value] = Result.split(r);
      if (failure) return failure;
      expectTypeOf(value).toEqualTypeOf<number>();
      return ok(value);
    };
    void f;
  });

  test("match branches give their union", () => {
    expectTypeOf(
      Result.match(r, { ok: (v) => v, err: () => null })
    ).toEqualTypeOf<number | null>();
  });

  test("exhaustive compiles only when every case is handled", () => {
    const f = (result: Result<number, TypeError>): number => {
      if (result.ok) return result.value;
      if (!result.ok) return 0;
      return Result.exhaustive(result);
    };
    void f;
  });
});

describe("README: Combining results", () => {
  const user = ok(new User()) as Result<User, UserError>;
  const posts = ok([new Post()]) as Result<Post[], PostError>;

  test("all / allAsync / collect / collectAsync", async () => {
    expectTypeOf(Result.all(user, posts)).toEqualTypeOf<
      Result<readonly [User, Post[]], UserError | PostError>
    >();
    expectTypeOf(
      await Result.allAsync(Promise.resolve(user), Promise.resolve(posts))
    ).toEqualTypeOf<
      Result<readonly [User, Post[]], UserError | PostError | Error>
    >();
    const c = Result.collect(user, posts);
    expectTypeOf(c).toEqualTypeOf<
      Result<readonly [User, Post[]], AggregateErrorOf<UserError | PostError>>
    >();
    if (!c.ok) {
      expectTypeOf(c.error.errors).toEqualTypeOf<(UserError | PostError)[]>();
    }
    expectTypeOf(
      await Result.collectAsync(Promise.resolve(user), Promise.resolve(posts))
    ).toEqualTypeOf<
      Result<
        readonly [User, Post[]],
        AggregateErrorOf<UserError | PostError | Error>
      >
    >();
  });

  test("one array keeps tuple types or gives an array", () => {
    const items = [1, 2];
    const validate = (n: number) =>
      n > 0 ? ok(new User()) : err(new ValidationError());
    expectTypeOf(Result.all(items.map(validate))).toEqualTypeOf<
      Result<User[], ValidationError>
    >();
    expectTypeOf(Result.all([user, posts])).toEqualTypeOf<
      Result<readonly [User, Post[]], UserError | PostError>
    >();
  });
});

describe("README: Maybe", () => {
  const u = some(new User()) as Maybe<User>;
  const s = some(new Settings()) as Maybe<Settings>;

  test("constructors", () => {
    expectTypeOf(Maybe.some(42)).toEqualTypeOf<Some<number>>();
    expectTypeOf(Maybe.none()).toEqualTypeOf<None>();
  });

  test("fromPredicate with a type guard", () => {
    const value = 1 as unknown;
    expectTypeOf(
      Maybe.fromPredicate(value, (v): v is string => typeof v === "string")
    ).toEqualTypeOf<Maybe<string>>();
  });

  test("all / firstSome / allAsync", async () => {
    expectTypeOf(Maybe.all(u, s)).toEqualTypeOf<
      Maybe<readonly [User, Settings]>
    >();
    expectTypeOf(Maybe.firstSome(u, u)).toEqualTypeOf<Maybe<User>>();
    expectTypeOf(
      await Maybe.allAsync(Promise.resolve(u), Promise.resolve(s))
    ).toEqualTypeOf<Maybe<readonly [User, Settings]>>();
    const ids = [1, 2];
    const findCached = (_: number) => u;
    expectTypeOf(Maybe.all(ids.map(findCached))).toEqualTypeOf<Maybe<User[]>>();
  });
});

describe("README: Untyped (any) values", () => {
  const r = ok(1) as Result<number, TypeError>;

  test("tryCatch / fromPromise give unknown", async () => {
    expectTypeOf(Result.tryCatch(() => JSON.parse("1"))).toEqualTypeOf<
      Result<unknown, Error>
    >();
    const res = { json: () => Promise.resolve(JSON.parse("1")) };
    expectTypeOf(await Result.fromPromise(res.json())).toEqualTypeOf<
      Result<unknown, Error>
    >();
  });

  test("a value given directly keeps any", () => {
    // biome-ignore lint/suspicious/noExplicitAny: the documented limit
    type Any = any;
    expectTypeOf(ok(JSON.parse("1"))).toEqualTypeOf<OkResult<Any>>();
    expectTypeOf(Result.flatMap(r, () => ok(JSON.parse("1")))).toEqualTypeOf<
      Result<Any, TypeError>
    >();
    expectTypeOf(Result.orElse(r, () => ok(JSON.parse("1")))).toEqualTypeOf<
      Result<Any, never>
    >();
    expectTypeOf(
      Result.match(r, { ok: () => JSON.parse("1"), err: () => 0 })
    ).toEqualTypeOf<Any>();
    expectTypeOf(
      Result.unwrapOrElse(r, () => JSON.parse("1"))
    ).toEqualTypeOf<Any>();
  });

  test("an untyped callback counts as one that returns any", () => {
    const legacy = JSON.parse("{}");
    expectTypeOf(Result.tryCatch(legacy.parse)).toEqualTypeOf<
      Result<unknown, Error>
    >();
    expectTypeOf(Result.map(r, legacy.transform)).toEqualTypeOf<
      Result<unknown, TypeError>
    >();
    expectTypeOf(Result.flatMap(r, legacy.validate)).toEqualTypeOf<
      Result<unknown, TypeError | Error>
    >();
    expectTypeOf(Result.orElse(r, legacy.recover)).toEqualTypeOf<
      Result<unknown, Error>
    >();
    // match: TypeScript does not know what untyped handlers return.
    expectTypeOf(Result.match(r, legacy.handlers)).toEqualTypeOf<unknown>();
  });
});

describe("README: Design decisions", () => {
  test("an error class with a literal name is distinct from Error", () => {
    class NotFound extends Error {
      override readonly name = "NotFound" as const;
    }
    // @ts-expect-error — a plain Error is not a NotFound
    const r: Result<User, NotFound> = err(new Error("x"));
    void r;
  });

  test("never where a callback gives no source", () => {
    const r = ok(1) as Result<number, TypeError>;
    expectTypeOf(Result.orElse(r, () => ok(0))).toEqualTypeOf<
      Result<number, never>
    >();
    expectTypeOf(Result.flatMap(r, () => err(new ParseError()))).toEqualTypeOf<
      Result<never, TypeError | ParseError>
    >();
    expectTypeOf(Maybe.firstSome(none(), none())).toEqualTypeOf<Maybe<never>>();
  });
});

describe("README: Quick Start chain", () => {
  test("flatMap of fromNullable and fromPredicate, then match", () => {
    class ConfigError extends Error {
      override readonly name = "ConfigError" as const;
    }
    const env: { PORT?: string } = {};
    const port = Result.flatMap(
      Result.fromNullable(env.PORT, () => new ConfigError("PORT is not set")),
      (raw) =>
        Result.fromPredicate(
          Number(raw),
          Number.isInteger,
          (n) => new ConfigError(`PORT is not an integer: ${n}`)
        )
    );
    expectTypeOf(port).toEqualTypeOf<Result<number, ConfigError>>();
    expectTypeOf(
      Result.match(port, {
        ok: (p) => `listening on ${p}`,
        err: (e) => e.message,
      })
    ).toEqualTypeOf<string>();
  });
});

describe("README: Checking values", () => {
  test("isOk / isErr / isSome filter arrays", () => {
    const results = [ok(1)] as Result<number, ParseError>[];
    expectTypeOf(results.filter(Result.isOk)).toEqualTypeOf<
      OkResult<number>[]
    >();
    expectTypeOf(results.filter(Result.isErr)).toEqualTypeOf<
      ErrResult<ParseError>[]
    >();
    const maybes = [some(1)] as Maybe<number>[];
    expectTypeOf(maybes.filter(Maybe.isSome)).toEqualTypeOf<Some<number>[]>();
  });
});

describe("README: Untyped (any) values, the table", () => {
  // biome-ignore lint/suspicious/noExplicitAny: the documented input
  type Any = any;
  const x = JSON.parse("1");
  const legacy = JSON.parse("{}");
  const r = ok(1) as Result<number, ParseError>;

  test("an any input", () => {
    expectTypeOf(Result.unwrap(x)).toEqualTypeOf<unknown>();
    // @ts-expect-error — unknown is not a string
    const s: string = Result.unwrap(x);
    void s;
    expectTypeOf(Result.map(x, (v: number) => v + 1)).toEqualTypeOf<
      Result<number, Error>
    >();
  });

  test("match: one untyped handler, or typed handlers on an any input", () => {
    expectTypeOf(
      Result.match(r, { ok: (v) => v, err: legacy.fn })
    ).toEqualTypeOf<unknown>();
    expectTypeOf(
      Result.match(x, { ok: (v: string) => v, err: (e) => e })
    ).toEqualTypeOf<string | Error>();
    // @ts-expect-error — err must take an Error
    Result.match(x, { ok: (v: string) => v, err: (e: string) => e });
  });

  test("an error mapper that returns any gives Error", () => {
    expectTypeOf(Result.mapError(r, (e) => legacy.wrap(e))).toEqualTypeOf<
      Result<number, Error>
    >();
    const n = 1 as number | null;
    expectTypeOf(Result.fromNullable(n, () => legacy.wrap())).toEqualTypeOf<
      Result<number, Error>
    >();
  });

  test("a value given directly keeps any", () => {
    expectTypeOf(err(x)).toEqualTypeOf<ErrResult<Any>>();
    expectTypeOf(Result.unwrapOr(r, x)).toEqualTypeOf<Any>();
    expectTypeOf(Maybe.fromNullable(x)).toEqualTypeOf<Maybe<Any>>();
  });

  test("the input must still be a Result and fit an annotated callback", () => {
    const fetchUser = async () => ok(new User()) as Result<User, ApiError>;
    // @ts-expect-error — a forgotten await
    Result.map(fetchUser(), legacy.fn);
    // @ts-expect-error — the value is a number
    Result.flatMap(r, (v: string) => legacy(v));
    const generic = <T, E extends Error>(input: Result<T, E>) =>
      Result.map(input, legacy.fn);
    expectTypeOf(generic(r)).toEqualTypeOf<Result<unknown, ParseError>>();
  });

  test("a cast where the any comes from", () => {
    type Config = { port: number };
    expectTypeOf(
      Result.tryCatch(() => JSON.parse("1") as Config)
    ).toEqualTypeOf<Result<Config, Error>>();
  });
});

describe("README: Point-free use", () => {
  test("one signature keeps its type; overloads lose theirs", () => {
    const rs = [ok(1)] as Result<number, ParseError>[];
    expectTypeOf(rs.map(Result.unwrap)).toEqualTypeOf<number[]>();
    expectTypeOf([1, 2].map(Result.ok)).toEqualTypeOf<OkResult<unknown>[]>();
    const groups = [rs];
    expectTypeOf(groups.map(Result.all)).toEqualTypeOf<
      Result<readonly unknown[], Error>[]
    >();
    expectTypeOf([1, 2].map((n) => Result.ok(n))).toEqualTypeOf<
      OkResult<number>[]
    >();
  });
});
