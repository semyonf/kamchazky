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

  test("returns Err instead of Ok(Promise) for an async fn", async () => {
    const rejection = Promise.reject(new Error("db down"));
    rejection.catch(() => {}); // the test only checks the Result
    // @ts-expect-error — async functions belong to tryCatchAsync
    const r = Result.tryCatch(() => rejection);
    expect(r.ok).toBe(false);
    expect(!r.ok && r.error).toBeInstanceOf(TypeError);
    expect(!r.ok && r.error.message).toContain("tryCatchAsync");
  });

  test("allows functions returning any", () => {
    const r = Result.tryCatch(() => JSON.parse('{"a":1}'));
    expect(r.ok && r.value).toEqual({ a: 1 });
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
});
