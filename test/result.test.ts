import { runInNewContext } from "node:vm";

import { describe, expect, test, vi } from "vitest";
import {
  err,
  isErr,
  isOk,
  type Maybe,
  none,
  normalizeError,
  ok,
  Result,
  some,
} from "../src/index.js";

/** `[a, <hole>, b]`: a sparse array, as `any` input can bring. */
function holey<T>(a: T, b: T): T[] {
  const items = [a];
  items[2] = b;
  return items;
}

// ---------------------------------------------------------------------------
// Factories
// ---------------------------------------------------------------------------

describe("ok", () => {
  test("creates an OkResult", () => {
    const r = ok(42);
    expect(r.ok).toBe(true);
    expect(r.value).toBe(42);
  });

  test("is frozen", () => {
    expect(Object.isFrozen(ok(1))).toBe(true);
  });

  test("works with undefined", () => {
    const r = ok(undefined);
    expect(r.ok).toBe(true);
    expect(r.value).toBe(undefined);
  });

  test("works with an omitted value", () => {
    const r = ok();
    expect(r.ok).toBe(true);
    expect(r.value).toBe(undefined);
  });
});

describe("err", () => {
  test("creates an ErrResult", () => {
    const e = new Error("boom");
    const r = err(e);
    expect(r.ok).toBe(false);
    expect(r.error).toBe(e);
  });

  test("is frozen", () => {
    expect(Object.isFrozen(err(new Error()))).toBe(true);
  });

  test("preserves error subclasses", () => {
    const e = new TypeError("bad type");
    const r = err(e);
    expect(r.error).toBeInstanceOf(TypeError);
  });
});

// ---------------------------------------------------------------------------
// Type guards
// ---------------------------------------------------------------------------

describe("isOk / isErr", () => {
  test("isOk returns true for Ok", () => {
    expect(isOk(ok(1))).toBe(true);
  });

  test("isOk returns false for Err", () => {
    expect(isOk(err(new Error()))).toBe(false);
  });

  test("isErr returns true for Err", () => {
    expect(isErr(err(new Error()))).toBe(true);
  });

  test("isErr returns false for Ok", () => {
    expect(isErr(ok(1))).toBe(false);
  });
});

// ---------------------------------------------------------------------------
// Standalone transformations
// ---------------------------------------------------------------------------

describe("Result.map", () => {
  test("transforms Ok value", () => {
    const r = Result.map(ok(3), (x) => x * 2);
    expect(r.ok && r.value).toBe(6);
  });

  test("passes through Err", () => {
    const e = err(new Error("e"));
    const r = Result.map(e, () => 99);
    expect(r).toBe(e);
  });
});

describe("Result.mapError", () => {
  test("transforms Err error", () => {
    const r = Result.mapError(
      err(new Error("a")),
      (e) => new TypeError(e.message)
    );
    expect(!r.ok && r.error).toBeInstanceOf(TypeError);
  });

  test("passes through Ok", () => {
    const o = ok(1);
    const r = Result.mapError(o, () => new TypeError());
    expect(r).toBe(o);
  });
});

describe("Result.inspect", () => {
  test("calls fn for Ok", () => {
    const spy = vi.fn();
    const r = ok(42);
    const returned = Result.inspect(r, spy);
    expect(spy).toHaveBeenCalledWith(42);
    expect(returned).toBe(r);
  });

  test("skips fn for Err", () => {
    const spy = vi.fn();
    const r = err(new Error("e"));
    const returned = Result.inspect(r, spy);
    expect(spy).not.toHaveBeenCalled();
    expect(returned).toBe(r);
  });
});

describe("Result.inspectError", () => {
  test("calls fn for Err", () => {
    const e = new Error("e");
    const spy = vi.fn();
    const r = err(e);
    const returned = Result.inspectError(r, spy);
    expect(spy).toHaveBeenCalledWith(e);
    expect(returned).toBe(r);
  });

  test("skips fn for Ok", () => {
    const spy = vi.fn();
    const r = ok(1);
    const returned = Result.inspectError(r, spy);
    expect(spy).not.toHaveBeenCalled();
    expect(returned).toBe(r);
  });
});

describe("Result.flatMap", () => {
  test("chains on Ok", () => {
    const r = Result.flatMap(ok(10), (x) => ok(x + 5));
    expect(r.ok && r.value).toBe(15);
  });

  test("short-circuits on Err", () => {
    const e = err(new Error("e"));
    const r = Result.flatMap(e, () => ok(99));
    expect(r.ok).toBe(false);
  });

  test("propagates new Err from fn", () => {
    const r = Result.flatMap(ok(1), () => err(new TypeError("t")));
    expect(!r.ok && r.error).toBeInstanceOf(TypeError);
  });
});

describe("Result.orElse", () => {
  test("passes through Ok", () => {
    const o = ok(1);
    const r = Result.orElse(o, () => ok(99));
    expect(r.ok && r.value).toBe(1);
  });

  test("applies fallback on Err", () => {
    const r = Result.orElse(err(new Error("e")), () => ok(42));
    expect(r.ok && r.value).toBe(42);
  });

  test("fallback can return Err", () => {
    const r = Result.orElse(err(new Error("a")), () => err(new TypeError("b")));
    expect(!r.ok && r.error.message).toBe("b");
  });
});

describe("Result.flatMapErr", () => {
  test("is an alias for orElse", () => {
    const r = Result.flatMapErr(err(new Error("x")), () => ok(7));
    expect(r.ok && r.value).toBe(7);
  });
});

describe("Result.flatten", () => {
  test("unwraps nested Ok", () => {
    const r = Result.flatten(ok(ok(42)));
    expect(r.ok && r.value).toBe(42);
  });

  test("unwraps outer Err", () => {
    const e = new Error("outer");
    const r = Result.flatten(err(e));
    expect(!r.ok && r.error).toBe(e);
  });

  test("unwraps inner Err", () => {
    const e = new Error("inner");
    const r = Result.flatten(ok(err(e)));
    expect(!r.ok && r.error).toBe(e);
  });

  test("supports different inner and outer error types", () => {
    const inner = new TypeError("inner");
    const outer: Result<Result<number, TypeError>, RangeError> = ok(err(inner));
    const r = Result.flatten(outer);
    expect(!r.ok && r.error).toBe(inner);
    expect(!r.ok && r.error).toBeInstanceOf(TypeError);
  });

  test("returns outer Err with different error types", () => {
    const outerErr = new RangeError("outer");
    const r = Result.flatten(
      err(outerErr) as Result<Result<number, TypeError>, RangeError>
    );
    expect(!r.ok && r.error).toBe(outerErr);
    expect(!r.ok && r.error).toBeInstanceOf(RangeError);
  });

  // Through `any` only; 3.0.0 returned the value.
  test.each([
    ["5", () => Result.flatten(5 as never), "input"],
    ["null", () => Result.flatten(null as never), "input"],
    ["ok(5)", () => Result.flatten(ok(5) as never), "value"],
    [
      "ok({ ok: false, error: 'denied' })",
      () => Result.flatten(ok({ ok: false, error: "denied" }) as never),
      "value",
    ],
  ])("%s throws a TypeError", (_, run, part) => {
    expect(run).toThrow(
      new TypeError(`Result.flatten: ${part} is not a Result`)
    );
  });
});

// ---------------------------------------------------------------------------
// Pattern matching
// ---------------------------------------------------------------------------

describe("Result.match", () => {
  test("calls ok handler for Ok", () => {
    const r = Result.match(ok(5), {
      ok: (v) => v * 2,
      err: () => -1,
    });
    expect(r).toBe(10);
  });

  test("calls err handler for Err", () => {
    const r = Result.match(err(new Error("e")), {
      ok: (v) => `ok:${v}`,
      err: (e) => e.message,
    });
    expect(r).toBe("e");
  });
});

describe("Result.exhaustive", () => {
  test("throws with value context", () => {
    expect(() => Result.exhaustive(42 as never)).toThrow(
      "Unhandled result case: 42"
    );
    expect(() => Result.exhaustive("pending" as never)).toThrow(
      'Unhandled result case: "pending"'
    );
  });

  test("does not serialize an object into the message", () => {
    const value = ok({ password: "PLACEHOLDER" });
    let caught: unknown;
    try {
      Result.exhaustive(value as never);
    } catch (e) {
      caught = e;
    }
    expect((caught as Error).message).toBe("Unhandled result case: <object>");
    expect((caught as Error).cause).toBe(value);
  });
});

// ---------------------------------------------------------------------------
// Extraction
// ---------------------------------------------------------------------------

describe("Result.unwrap", () => {
  test("returns value for Ok", () => {
    expect(Result.unwrap(ok(42))).toBe(42);
  });

  test("throws for Err", () => {
    const e = new Error("fail");
    expect(() => Result.unwrap(err(e))).toThrow(e);
  });
});

describe("Result.unwrapOr", () => {
  test("returns value for Ok", () => {
    expect(Result.unwrapOr(ok(42), 0)).toBe(42);
  });

  test("returns fallback for Err", () => {
    expect(Result.unwrapOr(err(new Error()), 0)).toBe(0);
  });
});

describe("Result.unwrapOrElse", () => {
  test("returns value for Ok", () => {
    expect(Result.unwrapOrElse(ok(42), () => 0)).toBe(42);
  });

  test("calls fn for Err", () => {
    expect(Result.unwrapOrElse(err(new Error()), () => 99)).toBe(99);
  });

  test("does not call fn for Ok", () => {
    const fn = vi.fn(() => 0);
    Result.unwrapOrElse(ok(42), fn);
    expect(fn).not.toHaveBeenCalled();
  });

  test("passes the error to fn", () => {
    const e = new Error("original");
    const r = Result.unwrapOrElse(
      err(e) as Result<string, Error>,
      (error) => error.message
    );
    expect(r).toBe("original");
  });
});

describe("Result.split", () => {
  test("returns [undefined, value] for Ok", () => {
    expect(Result.split(ok(42))).toEqual([undefined, 42]);
  });

  test("returns [the same ErrResult, undefined] for Err", () => {
    const r = err(new Error("fail"));
    const [failure, value] = Result.split(r);
    expect(failure).toBe(r);
    expect(value).toBeUndefined();
  });
});

// Through `any` only: an input that is not a Result is a programmer error.
// 3.0.0 returned or threw whatever the object held.
describe("extraction rejects an input that is not a Result", () => {
  const revoked = Proxy.revocable({}, {});
  revoked.revoke();
  const inputs: [string, unknown][] = [
    ["5", 5],
    ["undefined", undefined],
    ["{ ok: false, error: 'denied' }", { ok: false, error: "denied" }],
    ["{ ok: true } after a JSON round trip", JSON.parse('{"ok":true}')],
    ["a revoked Proxy", revoked.proxy],
  ];
  const calls: [string, (input: never) => unknown][] = [
    ["unwrap", (r) => Result.unwrap(r)],
    ["unwrapErr", (r) => Result.unwrapErr(r)],
    ["unwrapOr", (r) => Result.unwrapOr(r, 0)],
    ["unwrapOrElse", (r) => Result.unwrapOrElse(r, () => 0)],
    ["split", (r) => Result.split(r)],
    ["match", (r) => Result.match(r, { ok: () => 1, err: () => 2 })],
  ];
  describe.each(calls)("Result.%s", (name, call) => {
    test.each(inputs)("%s throws a TypeError", (_, input) => {
      expect(() => call(input as never)).toThrow(
        new TypeError(`Result.${name}: input is not a Result`)
      );
    });
  });

  test("the handlers and fn are not called", () => {
    const fn = vi.fn();
    expect(() => Result.unwrapOrElse(5 as never, fn)).toThrow(TypeError);
    expect(() => Result.match(5 as never, { ok: fn, err: fn })).toThrow(
      TypeError
    );
    expect(fn).not.toHaveBeenCalled();
  });
});

describe("Result.transpose", () => {
  test("Ok(Some(v)) -> Some(Ok(v))", () => {
    const r = Result.transpose(ok(some(42)));
    expect(r.some).toBe(true);
    if (r.some) {
      expect(r.value.ok).toBe(true);
      if (r.value.ok) expect(r.value.value).toBe(42);
    }
  });

  test("Ok(None) -> None", () => {
    const r = Result.transpose(ok(none()));
    expect(r.some).toBe(false);
  });

  test("Err(e) -> Some(Err(e))", () => {
    const e = new Error("fail");
    const r = Result.transpose(err(e) as Result<Maybe<number>, Error>);
    expect(r.some).toBe(true);
    if (r.some) {
      expect(r.value.ok).toBe(false);
      if (!r.value.ok) expect(r.value.error).toBe(e);
    }
  });

  // Through `any` only; 3.0.0 returned a Some or a None.
  test.each([
    ["5", () => Result.transpose(5 as never), "input is not a Result"],
    ["ok(5)", () => Result.transpose(ok(5) as never), "value is not a Maybe"],
    [
      "ok({ some: true })",
      () => Result.transpose(ok({ some: true }) as never),
      "value is not a Maybe",
    ],
  ])("%s throws a TypeError", (_, run, message) => {
    expect(run).toThrow(new TypeError(`Result.transpose: ${message}`));
  });
});

// ---------------------------------------------------------------------------
// Creation helpers
// ---------------------------------------------------------------------------

describe("Result.fromNullable", () => {
  test("returns Ok for non-null value", () => {
    const r = Result.fromNullable(42, () => new Error());
    expect(r.ok && r.value).toBe(42);
  });

  test("returns Ok for falsy non-null values", () => {
    expect(Result.fromNullable(0, () => new Error()).ok).toBe(true);
    expect(Result.fromNullable("", () => new Error()).ok).toBe(true);
    expect(Result.fromNullable(false, () => new Error()).ok).toBe(true);
  });

  test("returns Err for null", () => {
    const r = Result.fromNullable(null, () => new Error("null"));
    expect(!r.ok && r.error.message).toBe("null");
  });

  test("returns Err for undefined", () => {
    const r = Result.fromNullable(undefined, () => new Error("undef"));
    expect(!r.ok && r.error.message).toBe("undef");
  });
});

describe("Result.fromPredicate", () => {
  test("returns Ok when predicate passes", () => {
    const r = Result.fromPredicate(
      5,
      (n) => n > 0,
      () => new Error("negative")
    );
    expect(r.ok && r.value).toBe(5);
  });

  test("returns Err when predicate fails", () => {
    const r = Result.fromPredicate(
      -1,
      (n) => n > 0,
      () => new Error("negative")
    );
    expect(!r.ok && r.error.message).toBe("negative");
  });

  test("passes the rejected value to the error factory", () => {
    const r = Result.fromPredicate(
      -1,
      (n) => n > 0,
      (n) => new Error(`expected positive, got ${n}`)
    );
    expect(!r.ok && r.error.message).toBe("expected positive, got -1");
  });

  test("narrows type with type-guard predicate", () => {
    const r = Result.fromPredicate(
      "hello" as string | number,
      (v): v is string => typeof v === "string",
      () => new Error("not string")
    );
    if (r.ok) {
      // At runtime the value is the original string
      expect(r.value).toBe("hello");
    }
  });
});

// ---------------------------------------------------------------------------
// normalizeError
// ---------------------------------------------------------------------------

describe("Result.normalizeError", () => {
  test("passes through Error instances", () => {
    const e = new TypeError("t");
    expect(normalizeError(e)).toBe(e);
  });

  test("wraps string as Error", () => {
    const e = normalizeError("oops");
    expect(e).toBeInstanceOf(Error);
    expect(e.message).toBe("oops");
  });

  test("wraps number as Error", () => {
    const e = normalizeError(42);
    expect(e).toBeInstanceOf(Error);
    expect(e.message).toBe("42");
  });

  test("wraps object as Error and keeps it in cause", () => {
    const thrown = { code: 1 };
    const e = normalizeError(thrown);
    expect(e).toBeInstanceOf(Error);
    expect(e.message).toBe("Non-Error object thrown");
    expect(e.cause).toBe(thrown);
  });

  test("wraps null as Error", () => {
    const e = normalizeError(null);
    expect(e).toBeInstanceOf(Error);
    expect(e.message).toBe("null");
  });

  test("wraps undefined as Error", () => {
    const e = normalizeError(undefined);
    expect(e).toBeInstanceOf(Error);
    expect(e.message).toBe("undefined");
  });

  test("handles null-prototype objects", () => {
    const obj = Object.create(null);
    obj.key = "value";
    const e = normalizeError(obj);
    expect(e).toBeInstanceOf(Error);
    expect(e.message).toBe("Non-Error object thrown");
    expect(e.cause).toBe(obj);
  });

  test("handles empty null-prototype object", () => {
    const obj = Object.create(null);
    const e = normalizeError(obj);
    expect(e).toBeInstanceOf(Error);
    expect(e.message).toBe("Non-Error object thrown");
  });

  test("never calls toString on thrown objects", () => {
    const e = normalizeError({
      toString() {
        throw new Error("boom");
      },
    });
    expect(e).toBeInstanceOf(Error);
    expect(e.message).toBe("Non-Error object thrown");
  });

  test("does not copy object contents into the message", () => {
    const thrown = {
      status: 401,
      config: { headers: { Authorization: "Bearer secret-token" } },
    };
    const e = normalizeError(thrown);
    expect(e.message).not.toContain("secret-token");
    expect(e.cause).toBe(thrown);
  });

  test("uses a string `message` of an error-like object", () => {
    const thrown = { message: "db down", code: "ECONNREFUSED" };
    const e = normalizeError(thrown);
    expect(e.message).toBe("db down");
    expect(e.cause).toBe(thrown);
  });

  test("survives a throwing `message` getter", () => {
    const thrown = {
      get message(): string {
        throw new Error("getter");
      },
    };
    const e = normalizeError(thrown);
    expect(e.message).toBe("Non-Error object thrown");
  });

  test("passes through Errors from another realm", () => {
    const foreign = runInNewContext("new Error('vm')") as Error;
    expect(foreign instanceof Error).toBe(false);
    expect(normalizeError(foreign)).toBe(foreign);
  });

  test("handles BigInt via String fallback", () => {
    const e = normalizeError(BigInt(42));
    expect(e).toBeInstanceOf(Error);
    expect(e.message).toBe("42");
  });

  test("handles circular references", () => {
    const obj: { self?: unknown } = {};
    obj.self = obj;
    const e = normalizeError(obj);
    expect(e).toBeInstanceOf(Error);
    expect(e.message).toBe("Non-Error object thrown");
  });
});

// ---------------------------------------------------------------------------
// Exception handling
// ---------------------------------------------------------------------------

describe("Result.tryCatch", () => {
  test("returns Ok for successful fn", () => {
    const r = Result.tryCatch(() => 42);
    expect(r.ok && r.value).toBe(42);
  });

  test("returns Err for throwing fn", () => {
    const r = Result.tryCatch(() => {
      throw new Error("oops");
    });
    expect(!r.ok && r.error.message).toBe("oops");
  });

  test("wraps non-Error thrown values", () => {
    const r = Result.tryCatch(() => {
      throw "string error";
    });
    expect(!r.ok && r.error.message).toBe("string error");
    expect(!r.ok && r.error).toBeInstanceOf(Error);
  });

  test("applies custom error mapper", () => {
    const r = Result.tryCatch(
      () => {
        throw new Error("raw");
      },
      (e) => new TypeError((e as Error).message)
    );
    expect(!r.ok && r.error).toBeInstanceOf(TypeError);
  });

  test("rethrows what the error mapper throws, unchanged", () => {
    const mapperFail = new Error("mapper-fail");
    expect(() =>
      Result.tryCatch(
        () => {
          throw new Error("original");
        },
        () => {
          throw mapperFail;
        }
      )
    ).toThrow(mapperFail);
  });

  test("mapper can turn known errors into Err and rethrow unknown ones", () => {
    class NotFound extends Error {}
    const handle = (e: unknown) => {
      if (e instanceof NotFound) return e;
      throw e;
    };
    const known = Result.tryCatch(() => {
      throw new NotFound("nope");
    }, handle);
    expect(!known.ok && known.error).toBeInstanceOf(NotFound);

    const bug = new RangeError("bug");
    expect(() =>
      Result.tryCatch(() => {
        throw bug;
      }, handle)
    ).toThrow(bug);
  });

  test("returns Err(TypeError) instead of Ok(Promise) for an async fn", () => {
    const rejection = Promise.reject(new Error("db down"));
    // Typed as a plain function, as plain JavaScript or `any` would be.
    const fn: () => unknown = () => rejection;
    const r = Result.tryCatch(fn);
    expect(r.ok).toBe(false);
    expect(!r.ok && r.error).toBeInstanceOf(TypeError);
    expect(!r.ok && r.error.message).toContain("tryCatchAsync");
    expect(!r.ok && r.error.cause).toBe(rejection);
    // tryCatch leaves the rejection to the caller; this test handles it.
    rejection.catch(() => {});
  });

  test("never calls then: a rejection is not marked handled", () => {
    const pending = new Promise<never>(() => {});
    const then = vi.spyOn(pending, "then");
    const r = Result.tryCatch((() => pending) as () => unknown);
    expect(!r.ok && r.error.cause).toBe(pending);
    expect(then).not.toHaveBeenCalled();
  });

  test("does not run a lazy thenable such as a query builder", () => {
    const then = vi.fn();
    const query = { where: () => query, then };
    const r = Result.tryCatch((() => query.where()) as () => unknown);
    expect(r.ok).toBe(false);
    expect(!r.ok && r.error).toBeInstanceOf(TypeError);
    expect(!r.ok && r.error.cause).toBe(query);
    expect(then).not.toHaveBeenCalled();
  });

  test("the TypeError for a returned Promise goes through onError", () => {
    // Generic code compiles for an async fn and types the error as the
    // mapper's result, so the runtime must deliver that.
    class AppError extends Error {
      readonly code = "E_APP";
    }
    const seen: unknown[] = [];
    const safe = <T>(f: () => T) =>
      Result.tryCatch(f, (e) => {
        seen.push(e);
        return new AppError("mapped");
      });
    const pending = new Promise<never>(() => {});
    const r = safe(() => pending);
    expect(!r.ok && r.error).toBeInstanceOf(AppError);
    expect(!r.ok && r.error.code).toBe("E_APP");
    expect(seen).toHaveLength(1);
    expect(seen[0]).toBeInstanceOf(TypeError);
    expect((seen[0] as TypeError).cause).toBe(pending);
  });

  test("a mapper that rethrows lets the TypeError for a Promise through", () => {
    const pending = new Promise<never>(() => {});
    const run = () =>
      Result.tryCatch((() => pending) as () => unknown, (e) => {
        throw e;
      });
    expect(run).toThrow(TypeError);
    expect(run).toThrow("tryCatchAsync");
  });

  test("an async fn has already started when the Err is returned", () => {
    let started = false;
    const fn: () => unknown = async () => {
      started = true;
    };
    const r = Result.tryCatch(fn);
    expect(r.ok).toBe(false);
    expect(started).toBe(true);
  });

  test("a value whose `then` getter throws is an Ok", () => {
    const weird = {
      // biome-ignore lint/suspicious/noThenProperty: the test needs a hostile thenable
      get then(): unknown {
        throw new Error("getter");
      },
    };
    const r = Result.tryCatch(() => weird);
    expect(r.ok && r.value).toBe(weird);
  });

  test("allows functions returning any", () => {
    const r = Result.tryCatch(() => JSON.parse('{"a":1}'));
    expect(r.ok && r.value).toEqual({ a: 1 });
  });
});

// `map` passes (item, index, array); the types accept these functions there
// through the overload without onError, so the index is not taken for it.
describe("tryCatch, tryCatchAsync and fromPromise point-free in map", () => {
  const boom = (): number => {
    throw new Error("boom");
  };

  test("tryCatch", () => {
    const rs = [boom, boom, () => 1].map(Result.tryCatch);
    expect(rs.map((r) => r.ok)).toEqual([false, false, true]);
    expect(!rs[1]?.ok && rs[1]?.error.message).toBe("boom");
  });

  test("tryCatchAsync and fromPromise", async () => {
    const fns = [boom, boom].map((f) => async () => f());
    const a = await Promise.all(fns.map(Result.tryCatchAsync));
    expect(a.map((r) => !r.ok && r.error.message)).toEqual(["boom", "boom"]);
    const ps = [Promise.reject(new Error("x")), Promise.reject(new Error("y"))];
    const b = await Promise.all(ps.map(Result.fromPromise));
    expect(b.map((r) => !r.ok && r.error.message)).toEqual(["x", "y"]);
  });
});

describe("Result.tryCatchAsync", () => {
  test("returns Ok for resolved promise", async () => {
    const r = await Result.tryCatchAsync(() => Promise.resolve(42));
    expect(r.ok && r.value).toBe(42);
  });

  test("returns Err for rejected promise", async () => {
    const r = await Result.tryCatchAsync(() => Promise.reject(new Error("no")));
    expect(!r.ok && r.error.message).toBe("no");
  });

  test("wraps non-Error rejection", async () => {
    const r = await Result.tryCatchAsync(() => Promise.reject("string"));
    expect(!r.ok && r.error.message).toBe("string");
  });

  test("applies custom error mapper", async () => {
    const r = await Result.tryCatchAsync(
      () => Promise.reject(new Error("raw")),
      (e) => new TypeError((e as Error).message)
    );
    expect(!r.ok && r.error).toBeInstanceOf(TypeError);
  });

  test("rejects with what the error mapper throws, unchanged", async () => {
    const original = new Error("original");
    await expect(
      Result.tryCatchAsync(
        () => Promise.reject(original),
        (e) => {
          throw e;
        }
      )
    ).rejects.toBe(original);
  });

  test("catches a synchronous throw before the promise is created", async () => {
    const r = await Result.tryCatchAsync((): Promise<number> => {
      throw new Error("sync");
    });
    expect(!r.ok && r.error.message).toBe("sync");
  });
});

// ---------------------------------------------------------------------------
// fromPromise
// ---------------------------------------------------------------------------

describe("Result.fromPromise", () => {
  test("returns Ok for resolved promise", async () => {
    const r = await Result.fromPromise(Promise.resolve(42));
    expect(r.ok && r.value).toBe(42);
  });

  test("returns Err for rejected promise", async () => {
    const r = await Result.fromPromise(Promise.reject(new Error("no")));
    expect(!r.ok && r.error.message).toBe("no");
  });

  test("wraps non-Error rejection", async () => {
    const r = await Result.fromPromise(Promise.reject("string"));
    expect(!r.ok && r.error.message).toBe("string");
    expect(!r.ok && r.error).toBeInstanceOf(Error);
  });

  test("applies custom error mapper", async () => {
    const r = await Result.fromPromise(
      Promise.reject(new Error("raw")),
      (e) => new TypeError((e as Error).message)
    );
    expect(!r.ok && r.error).toBeInstanceOf(TypeError);
  });

  test("rejects with what the error mapper throws, unchanged", async () => {
    const original = new Error("original");
    await expect(
      Result.fromPromise(Promise.reject(original), (e) => {
        throw e;
      })
    ).rejects.toBe(original);
  });

  test("err() normalizes a non-Error rejection passed through `any`", async () => {
    const r = await Promise.reject("boom").catch((e) => err(e));
    expect(r.error).toBeInstanceOf(Error);
    expect(r.error.message).toBe("boom");
  });
});

// ---------------------------------------------------------------------------
// Combining
// ---------------------------------------------------------------------------

describe("Result.all", () => {
  test("combines all Ok results into a tuple", () => {
    const r = Result.all(ok(1), ok("two"), ok(true));
    expect(r.ok && r.value).toEqual([1, "two", true]);
  });

  test("returns first Err (fail-fast)", () => {
    const r = Result.all(
      ok(1),
      err(new Error("first")),
      err(new Error("second"))
    );
    expect(!r.ok && r.error.message).toBe("first");
  });

  test("returns Ok([]) for no arguments", () => {
    const r = Result.all();
    expect(r.ok && r.value).toEqual([]);
  });

  test("works with single argument", () => {
    const r = Result.all(ok(42));
    expect(r.ok && r.value).toEqual([42]);
  });
});

describe("Result.allAsync", () => {
  test("combines all Ok promises into a tuple", async () => {
    const r = await Result.allAsync(
      Promise.resolve(ok(1)),
      Promise.resolve(ok("two"))
    );
    expect(r.ok && r.value).toEqual([1, "two"]);
  });

  test("returns first Err", async () => {
    const r = await Result.allAsync(
      Promise.resolve(ok(1)),
      Promise.resolve(err(new Error("fail")))
    );
    expect(!r.ok && r.error.message).toBe("fail");
  });

  test("catches rejected promise", async () => {
    const r = await Result.allAsync(
      Promise.resolve(ok(1)),
      Promise.reject(new Error("rejected")) as Promise<Result<number, Error>>
    );
    expect(r.ok).toBe(false);
    expect(!r.ok && r.error.message).toBe("rejected");
  });

  test("catches non-Error rejection", async () => {
    const r = await Result.allAsync(
      Promise.resolve(ok(1)),
      Promise.reject("string rejection") as Promise<Result<number, Error>>
    );
    expect(r.ok).toBe(false);
    expect(!r.ok && r.error).toBeInstanceOf(Error);
    expect(!r.ok && r.error.message).toBe("string rejection");
  });

  test("catches rejection mixed with Err results", async () => {
    const r = await Result.allAsync(
      Promise.resolve(err(new Error("result-err"))),
      Promise.reject(new Error("rejection")) as Promise<Result<number, Error>>
    );
    // Promise.allSettled resolves all, first Err in iteration order wins
    expect(r.ok).toBe(false);
    if (!r.ok) {
      expect(r.error.message).toBe("result-err");
    }
  });
});

describe("Result.collectAsync", () => {
  test("collects all errors from mixed rejections and Errs", async () => {
    const r = await Result.collectAsync(
      Promise.resolve(ok(1)),
      Promise.resolve(err(new Error("err1"))),
      Promise.reject("raw-rejection") as Promise<Result<number, Error>>
    );
    expect(r.ok).toBe(false);
    if (!r.ok) {
      expect(r.error).toBeInstanceOf(AggregateError);
      expect(r.error.errors).toHaveLength(2);
    }
  });

  test("returns Ok values when all succeed", async () => {
    const r = await Result.collectAsync(
      Promise.resolve(ok(1)),
      Promise.resolve(ok(2))
    );
    expect(r.ok).toBe(true);
    if (r.ok) {
      expect(r.value).toEqual([1, 2]);
    }
  });
});

// ---------------------------------------------------------------------------
// collect
// ---------------------------------------------------------------------------

describe("Result.collect", () => {
  test("combines all Ok results into a tuple", () => {
    const r = Result.collect(ok(1), ok("two"), ok(true));
    expect(r.ok && r.value).toEqual([1, "two", true]);
  });

  test("collects all errors (not just first)", () => {
    const r = Result.collect(
      ok(1),
      err(new Error("first")),
      err(new Error("second"))
    );
    expect(r.ok).toBe(false);
    if (!r.ok) {
      expect(r.error).toBeInstanceOf(AggregateError);
      expect(r.error.errors).toHaveLength(2);
      expect(r.error.errors[0]?.message).toBe("first");
      expect(r.error.errors[1]?.message).toBe("second");
    }
  });

  test("returns all errors when everything fails", () => {
    const r = Result.collect(
      err(new TypeError("a")),
      err(new RangeError("b")),
      err(new Error("c"))
    );
    expect(r.ok).toBe(false);
    if (!r.ok) {
      expect(r.error.errors).toHaveLength(3);
      expect(r.error.errors[0]).toBeInstanceOf(TypeError);
      expect(r.error.errors[1]).toBeInstanceOf(RangeError);
    }
  });

  test("returns Ok([]) for no arguments", () => {
    const r = Result.collect();
    expect(r.ok && r.value).toEqual([]);
  });

  test("works with single Ok", () => {
    const r = Result.collect(ok(42));
    expect(r.ok && r.value).toEqual([42]);
  });

  test("the AggregateError message counts the failures, without their text", async () => {
    const r = Result.collect(
      err(new Error("PLACEHOLDER")),
      ok(1),
      err(new TypeError("b"))
    );
    expect(!r.ok && r.error.message).toBe(
      "Result.collect: 2 of 3 items failed"
    );
    const a = await Result.collectAsync(
      Promise.reject("PLACEHOLDER") as Promise<Result<number>>,
      Promise.resolve(ok(1))
    );
    expect(!a.ok && a.error.message).toBe(
      "Result.collectAsync: 1 of 2 items failed"
    );
  });

  test("works with single Err", () => {
    const r = Result.collect(err(new Error("only")));
    expect(r.ok).toBe(false);
    if (!r.ok) {
      expect(r.error.errors).toHaveLength(1);
      expect(r.error.errors[0]?.message).toBe("only");
    }
  });
});

// ---------------------------------------------------------------------------
// Method chaining
// ---------------------------------------------------------------------------

// ---------------------------------------------------------------------------
// unwrapErr
// ---------------------------------------------------------------------------

describe("Result.unwrapErr", () => {
  test("returns the error of an Err", () => {
    const e = new TypeError("t");
    expect(Result.unwrapErr(err(e))).toBe(e);
  });

  test("throws on Ok", () => {
    expect(() => Result.unwrapErr(ok(1))).toThrow("Called unwrapErr on Ok");
  });

  test("does not put the Ok value into the thrown error", () => {
    const secret = { password: "PLACEHOLDER" };
    let caught: unknown;
    try {
      Result.unwrapErr(ok(secret));
    } catch (e) {
      caught = e;
    }
    expect(caught).toBeInstanceOf(Error);
    expect((caught as Error).cause).toBeUndefined();
    expect("cause" in (caught as Error)).toBe(false);
  });
});

// ---------------------------------------------------------------------------
// isResult
// ---------------------------------------------------------------------------

describe("Result.isResult", () => {
  test("accepts values made by ok() and err()", () => {
    expect(Result.isResult(ok(1))).toBe(true);
    expect(Result.isResult(ok())).toBe(true);
    expect(Result.isResult(err(new Error()))).toBe(true);
  });

  test("accepts structurally equal plain objects", () => {
    expect(Result.isResult({ ok: true, value: 1 })).toBe(true);
    expect(Result.isResult({ ok: false, error: new Error() })).toBe(true);
  });

  test.each([
    ["null", null],
    ["undefined", undefined],
    ["a number", 1],
    ["an empty object", {}],
    ["Ok without value", { ok: true }],
    ["Err without error", { ok: false }],
    ["Err with a non-Error error", { ok: false, error: "boom" }],
    ["a non-boolean ok", { ok: "yes", value: 1 }],
    ["an API DTO", { ok: true, error: "x" }],
    [
      "an API DTO with a value and an error",
      { ok: true, value: 1, error: "x" },
    ],
    ["an Err with a value", { ok: false, error: new Error(), value: 1 }],
    ["a Maybe", some(1)],
  ])("rejects %s", (_, value) => {
    expect(Result.isResult(value)).toBe(false);
  });
});

// ---------------------------------------------------------------------------
// Array arguments for combinators
// ---------------------------------------------------------------------------

describe("combinators accept an array", () => {
  const many = Array.from({ length: 150_000 }, (_, i) => ok(i));

  test("Result.all", () => {
    const r = Result.all([ok(1), ok(2)]);
    expect(r.ok && r.value).toEqual([1, 2]);
    expect(Result.all([]).ok).toBe(true);
    const e = new Error("e");
    const failed = Result.all([ok(1), err(e)]);
    expect(!failed.ok && failed.error).toBe(e);
  });

  test("Result.all on 150k elements", () => {
    const r = Result.all(many);
    expect(r.ok && r.value.length).toBe(150_000);
  });

  test("Result.collect", () => {
    const r = Result.collect([ok(1), err(new Error("a")), err(new Error("b"))]);
    expect(!r.ok && r.error.errors).toHaveLength(2);
    const big = Result.collect(many);
    expect(big.ok && big.value.length).toBe(150_000);
  });

  test("Result.allAsync", async () => {
    const r = await Result.allAsync([
      Promise.resolve(ok(1)),
      Promise.resolve(ok(2)),
    ]);
    expect(r.ok && r.value).toEqual([1, 2]);
    const big = await Result.allAsync(many.map((x) => Promise.resolve(x)));
    expect(big.ok && big.value.length).toBe(150_000);
  });

  test("Result.collectAsync", async () => {
    const r = await Result.collectAsync([
      Promise.resolve(ok(1)),
      Promise.resolve(err(new Error("a"))),
    ]);
    expect(!r.ok && r.error.errors).toHaveLength(1);
  });

  test("a single Result argument is still the rest form", () => {
    const r = Result.all(ok([1, 2]));
    expect(r.ok && r.value).toEqual([[1, 2]]);
  });

  // `map` passes (items, index, array); the types accept that, so the
  // runtime takes the first argument as the list.
  test("point-free in map, flatMap and Array.from", async () => {
    const e = new Error("e");
    const groups = [[ok(1), ok(2)], [ok(3), err(e)], []];
    expect(groups.map(Result.all)).toEqual([ok([1, 2]), err(e), ok([])]);
    // Array.from passes (items, index).  TypeScript rejects this call (it
    // takes the element type from the callback), plain JavaScript does not.
    const from = Array.from as (items: unknown[], fn: unknown) => unknown[];
    expect(from(groups, Result.all)).toEqual(groups.map(Result.all));
    expect(groups.flatMap(Result.all)).toEqual(groups.map(Result.all));
    const collected = groups.map(Result.collect);
    expect(collected.map((r) => r.ok)).toEqual([true, false, true]);
    const pending = groups.map((g) => g.map((r) => Promise.resolve(r)));
    expect(await Promise.all(pending.map(Result.allAsync))).toEqual(
      groups.map(Result.all)
    );
    const asyncCollected = await Promise.all(pending.map(Result.collectAsync));
    expect(asyncCollected.map((r) => r.ok)).toEqual([true, false, true]);
  });

  test("an array next to a Result is still not a Result", () => {
    const bad = [ok(1)] as unknown as Result<number>;
    expect(() => Result.all(bad, ok(2))).toThrow(
      new TypeError("Result.all: item 0 is not a Result")
    );
  });
});

// ---------------------------------------------------------------------------
// Hostile values: revoked Proxy, throwing getters, fake Errors
// ---------------------------------------------------------------------------

describe("hostile values never make a function throw", () => {
  const revoked = () => {
    const { proxy, revoke } = Proxy.revocable({}, {});
    revoke();
    return proxy;
  };

  test("tryCatch with a thrown revoked Proxy", () => {
    const thrown = revoked();
    const r = Result.tryCatch(() => {
      throw thrown;
    });
    expect(!r.ok && r.error.message).toBe("Non-Error object thrown");
    expect(!r.ok && r.error.cause).toBe(thrown);
  });

  test("err() with a revoked Proxy", () => {
    const r = err(revoked() as unknown as Error);
    expect(r.error).toBeInstanceOf(Error);
  });

  test("normalizeError with a revoked Proxy", () => {
    expect(normalizeError(revoked()).message).toBe("Non-Error object thrown");
  });

  test("tryCatchAsync / fromPromise / allAsync / collectAsync", async () => {
    const a = await Result.tryCatchAsync(() => Promise.reject(revoked()));
    const b = await Result.fromPromise(Promise.reject(revoked()));
    const c = await Result.allAsync(
      Promise.reject(revoked()) as Promise<Result<number>>
    );
    const d = await Result.collectAsync(
      Promise.reject(revoked()) as Promise<Result<number>>
    );
    expect([a.ok, b.ok, c.ok, d.ok]).toEqual([false, false, false, false]);
  });

  test("isResult with a revoked Proxy or a throwing getter", () => {
    expect(Result.isResult(revoked())).toBe(false);
    const getter = {
      get ok(): boolean {
        throw new Error("getter");
      },
    };
    expect(Result.isResult(getter)).toBe(false);
  });

  test("exhaustive throws its own error for a revoked Proxy", () => {
    const value = revoked();
    let caught: unknown;
    try {
      Result.exhaustive(value as never);
    } catch (e) {
      caught = e;
    }
    expect((caught as Error).message).toBe("Unhandled result case: <object>");
    expect((caught as Error).cause).toBe(value);
  });

  test("a fake Error via Symbol.toStringTag is normalized", () => {
    const fake = { [Symbol.toStringTag]: "Error" };
    const r = err(fake as unknown as Error);
    expect(r.error).not.toBe(fake);
    expect(typeof r.error.message).toBe("string");
  });

  test("an object with Error.prototype but no string message is normalized", () => {
    const bad = Object.assign(Object.create(Error.prototype), { message: 42 });
    expect(typeof normalizeError(bad).message).toBe("string");
    expect(normalizeError(bad).cause).toBe(bad);
  });
});

// ---------------------------------------------------------------------------
// Error detection with and without Error.isError (Node 20 / 22 lack it)
// ---------------------------------------------------------------------------

type Lib = typeof import("../src/index.js");

/** Load a fresh copy of the library with `Error.isError` removed, as on
 *  runtimes that do not have it. */
async function loadWithoutIsError(): Promise<Lib> {
  const holder = Error as { isError?: unknown };
  const saved = holder.isError;
  delete holder.isError;
  try {
    vi.resetModules();
    return await import("../src/index.js");
  } finally {
    if (saved !== undefined) holder.isError = saved;
  }
}

/** Load a fresh copy of the library with `Error.isError` replaced by a
 *  sham that reads the tag, as core-js installs on Node 20 / 22. */
async function loadWithShamIsError(): Promise<Lib> {
  const holder = Error as { isError?: unknown };
  const saved = holder.isError;
  holder.isError = function isError(value: unknown): boolean {
    const tag = Object.prototype.toString.call(value);
    return (
      typeof value === "object" &&
      value !== null &&
      (tag === "[object Error]" || tag === "[object DOMException]")
    );
  };
  try {
    vi.resetModules();
    return await import("../src/index.js");
  } finally {
    if (saved === undefined) delete holder.isError;
    else holder.isError = saved;
  }
}

/** Load a fresh copy of the library: a loader above may have left a copy
 *  made without `Error.isError` in the module cache. */
async function loadFresh(): Promise<Lib> {
  vi.resetModules();
  return await import("../src/index.js");
}

/** Load a fresh copy of the library on a runtime without `Error.isError`
 *  and without `process.getBuiltinModule` (a browser, or Node before 20.16
 *  / 22.3): only the tag tells a real Error. */
async function loadWithTagOnly(): Promise<Lib> {
  const holder = Error as { isError?: unknown };
  const saved = holder.isError;
  const getBuiltinModule = process.getBuiltinModule;
  delete holder.isError;
  (process as { getBuiltinModule?: unknown }).getBuiltinModule = undefined;
  try {
    vi.resetModules();
    return await import("../src/index.js");
  } finally {
    if (saved !== undefined) holder.isError = saved;
    process.getBuiltinModule = getBuiltinModule;
  }
}

/** A real Error whose own `Symbol.toStringTag` hides the built-in tag. */
const taggedError = (message: unknown): Error =>
  Object.assign(new Error("x"), {
    [Symbol.toStringTag]: "Tagged",
    message,
  });

describe.each([
  ["with Error.isError", loadFresh],
  ["without Error.isError", loadWithoutIsError],
  ["with a sham of Error.isError that reads the tag", loadWithShamIsError],
  ["with the tag only", loadWithTagOnly],
])("error detection %s", (_, load) => {
  test("a Proxy of a fake or of an Error with a non-string message is not an Error", async () => {
    const lib = await load();
    const fake = new Proxy({ [Symbol.toStringTag]: "Error" }, {});
    expect(lib.normalizeError(fake)).not.toBe(fake);
    const proxied = new Proxy(
      Object.assign(new Error("x"), { message: 1 }),
      {}
    );
    expect(lib.normalizeError(proxied)).not.toBe(proxied);
    expect(lib.isResult({ ok: false, error: proxied })).toBe(false);
  });

  test("a fake with Symbol.toStringTag 'Error' is not an Error", async () => {
    const lib = await load();
    const bare = { [Symbol.toStringTag]: "Error" };
    expect(lib.normalizeError(bare)).not.toBe(bare);
    expect(lib.err(bare as unknown as Error).error.message).toBe(
      "Non-Error object thrown"
    );
    const fake = { [Symbol.toStringTag]: "Error", message: "fake" };
    const n = lib.normalizeError(fake);
    expect(n).not.toBe(fake);
    expect(n).toBeInstanceOf(Error);
    expect(n.cause).toBe(fake);
    expect(lib.err(fake as unknown as Error).error).not.toBe(fake);
    expect(lib.isResult({ ok: false, error: fake })).toBe(false);
  });

  test("a real Error with a non-string message keeps its identity", async () => {
    const lib = await load();
    class HttpError extends Error {}
    const e = Object.assign(new HttpError("x"), { message: 42 });
    expect(lib.normalizeError(e)).toBe(e);
    expect(lib.err(e).error).toBe(e);
    expect(lib.isResult({ ok: false, error: e })).toBe(true);
  });

  test("an Error from another realm keeps its identity", async () => {
    const lib = await load();
    const foreign = runInNewContext("new TypeError('x')") as Error;
    expect(lib.normalizeError(foreign)).toBe(foreign);
    expect(lib.err(foreign).error).toBe(foreign);
  });

  test("a real Error with its own toStringTag keeps its identity", async () => {
    const lib = await load();
    class Tagged extends Error {
      get [Symbol.toStringTag]() {
        return "Tagged";
      }
    }
    const e = new Tagged("x");
    expect(lib.normalizeError(e)).toBe(e);
  });
});

// The internal slot tells a real Error that sets its own tag.  Without
// `Error.isError` it comes from node:util; the tag alone cannot tell it.
describe.each([
  ["with Error.isError", loadFresh],
  ["without Error.isError", loadWithoutIsError],
  ["with a sham of Error.isError that reads the tag", loadWithShamIsError],
])("a real Error with its own tag %s", (_, load) => {
  test("keeps its identity with a non-string message", async () => {
    const lib = await load();
    const e = taggedError(42);
    expect(lib.normalizeError(e)).toBe(e);
    expect(lib.isResult({ ok: false, error: e })).toBe(true);
  });

  test("keeps its identity from another realm", async () => {
    const lib = await load();
    const foreign = runInNewContext(
      "const e = new Error('x'); e[Symbol.toStringTag] = 'Tagged'; e"
    ) as Error;
    expect(lib.normalizeError(foreign)).toBe(foreign);
  });
});

describe("a real Error with its own tag with the tag only", () => {
  test("is taken for an Error only with a string message from this realm", async () => {
    const lib = await loadWithTagOnly();
    const own = taggedError("x");
    expect(lib.normalizeError(own)).toBe(own);
    const nonString = taggedError(42);
    expect(lib.normalizeError(nonString)).not.toBe(nonString);
    const foreign = runInNewContext(
      "const e = new Error('x'); e[Symbol.toStringTag] = 'Tagged'; e"
    ) as Error;
    expect(lib.normalizeError(foreign)).not.toBe(foreign);
  });
});

// ---------------------------------------------------------------------------
// Malformed input to combinators (through `any`) is a programmer error: a
// TypeError that names the function and the position, never an Err that
// looks like a real failure.
// ---------------------------------------------------------------------------

describe("combinators reject items that are not Results", () => {
  const bad = (x: unknown) => x as Result<number>;

  test.each([
    ["all([[ok(1)]])", () => Result.all([bad([ok(1)])]), "Result.all: item 0"],
    [
      "all([ok(1)], ok(2))",
      () => Result.all(bad([ok(1)]), ok(2)),
      "Result.all: item 0",
    ],
    ["all([1, 2])", () => Result.all([bad(1), bad(2)]), "Result.all: item 0"],
    ["all([null])", () => Result.all([bad(null)]), "Result.all: item 0"],
    [
      "all(sparse)",
      () => Result.all(holey(ok(1), ok(2)) as Result<number>[]),
      "Result.all: item 1",
    ],
    ["all(Set)", () => Result.all(bad(new Set([ok(1)]))), "Result.all: item 0"],
    [
      "collect([[ok(1)]])",
      () => Result.collect([bad([ok(1)])]),
      "Result.collect: item 0",
    ],
    [
      "collect(sparse)",
      () => Result.collect(holey(ok(1), ok(2)) as Result<number>[]),
      "Result.collect: item 1",
    ],
    [
      "all({ ok: 'yes' })",
      () => Result.all([bad({ ok: "yes", value: 1 })]),
      "Result.all: item 0",
    ],
  ])("%s throws a TypeError", (_, run, message) => {
    expect(run).toThrow(TypeError);
    expect(run).toThrow(`${message} is not a Result`);
  });

  test("the message does not include the item", () => {
    expect(() => Result.all([bad({ password: "PLACEHOLDER" })])).toThrow(
      /^Result\.all: item 0 is not a Result$/
    );
  });

  test("allAsync / collectAsync reject when a promise resolves to a non-Result", async () => {
    await expect(
      Result.allAsync([Promise.resolve(ok(1)), Promise.resolve(bad(2))])
    ).rejects.toThrow(new TypeError("Result.allAsync: item 1 is not a Result"));
    await expect(
      Result.collectAsync([Promise.resolve(bad(undefined))])
    ).rejects.toThrow(
      new TypeError("Result.collectAsync: item 0 is not a Result")
    );
  });

  test("allAsync with a hole rejects with a TypeError", async () => {
    const items = holey(Promise.resolve(ok(1)), Promise.resolve(ok(2)));
    await expect(
      Result.allAsync(items as Promise<Result<number>>[])
    ).rejects.toThrow(new TypeError("Result.allAsync: item 1 is not a Result"));
  });

  // The item check is isResult: an object it rejects is not taken for an
  // Err that looks like a real failure.
  test.each([
    ["an Err without an error", { ok: false }],
    ["an Err with a string error", { ok: false, error: "denied" }],
    ["an Ok without a value", { ok: true }],
    ["an Ok with an error", { ok: true, value: 1, error: "x" }],
    ["an Err with a value", { ok: false, error: new Error(), value: 1 }],
  ])("all, collect, allAsync and collectAsync reject %s", async (_, item) => {
    for (const run of [
      () => Result.all([bad(item)]),
      () => Result.collect([bad(item)]),
    ]) {
      expect(run).toThrow(TypeError);
      expect(run).toThrow(/^Result\.(all|collect): item 0 is not a Result$/);
    }
    await expect(Result.allAsync([Promise.resolve(bad(item))])).rejects.toThrow(
      new TypeError("Result.allAsync: item 0 is not a Result")
    );
    await expect(
      Result.collectAsync([Promise.resolve(bad(item))])
    ).rejects.toThrow(
      new TypeError("Result.collectAsync: item 0 is not a Result")
    );
  });

  // JSON drops a property whose value is undefined (README).
  test("an ok() sent through JSON is not a Result; ok(null) is", () => {
    const wire = JSON.parse(JSON.stringify([ok(), ok(null)])) as unknown[];
    expect(wire[0]).toEqual({ ok: true });
    expect(Result.isResult(wire[0])).toBe(false);
    expect(() => Result.all([bad(wire[0])])).toThrow(
      new TypeError("Result.all: item 0 is not a Result")
    );
    expect(Result.all([bad(wire[1])])).toEqual(ok([null]));
  });

  test("allAsync checks every item, also after an Err or a rejection", async () => {
    const e = new Error("real failure");
    await expect(
      Result.allAsync([Promise.resolve(err(e)), Promise.resolve(bad(42))])
    ).rejects.toThrow(new TypeError("Result.allAsync: item 1 is not a Result"));
    await expect(
      Result.allAsync([
        Promise.reject(e) as Promise<Result<number>>,
        Promise.resolve(bad(42)),
      ])
    ).rejects.toThrow(new TypeError("Result.allAsync: item 1 is not a Result"));
  });
});
