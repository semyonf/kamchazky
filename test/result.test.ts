import { describe, expect, test, vi } from "vitest";
import {
  type ErrResult,
  err,
  isErr,
  isOk,
  type Maybe,
  none,
  normalizeError,
  type OkResult,
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
// Instance methods
// ---------------------------------------------------------------------------

describe("OkResult methods", () => {
  test(".map transforms the value", () => {
    const r = ok(2).map((x) => x * 3);
    expect(r.ok).toBe(true);
    expect((r as OkResult<number>).value).toBe(6);
  });

  test(".flatMap chains to a new Result", () => {
    const r = ok(5).flatMap((x) => ok(x + 1));
    expect(r.ok).toBe(true);
    expect((r as OkResult<number>).value).toBe(6);
  });

  test(".flatMap chains to an Err", () => {
    const r = ok(5).flatMap(() => err(new Error("nope")));
    expect(r.ok).toBe(false);
    expect((r as ErrResult).error.message).toBe("nope");
  });

  test(".mapError is a no-op", () => {
    const r = ok(42);
    const mapped = r.mapError(() => new TypeError("ignored"));
    expect(mapped).toBe(r);
  });

  test(".inspect calls fn and returns self", () => {
    const spy = vi.fn();
    const r = ok(42);
    const returned = r.inspect(spy);
    expect(spy).toHaveBeenCalledWith(42);
    expect(returned).toBe(r);
  });

  test(".inspectError is a no-op", () => {
    const spy = vi.fn();
    const r = ok(42);
    expect(r.inspectError(spy)).toBe(r);
    expect(spy).not.toHaveBeenCalled();
  });
});

describe("ErrResult methods", () => {
  test(".map is a no-op", () => {
    const r = err(new Error("e"));
    const mapped = r.map(() => 99);
    expect(mapped).toBe(r);
  });

  test(".flatMap is a no-op", () => {
    const r = err(new Error("e"));
    const chained = r.flatMap(() => ok(99));
    expect(chained).toBe(r);
  });

  test(".mapError transforms the error", () => {
    const r = err(new Error("old")).mapError(
      (e) => new TypeError(`${e.message}!`)
    );
    expect(r.ok).toBe(false);
    expect(r.error).toBeInstanceOf(TypeError);
    expect(r.error.message).toBe("old!");
  });

  test(".inspect is a no-op", () => {
    const spy = vi.fn();
    const r = err(new Error("e"));
    expect(r.inspect(spy)).toBe(r);
    expect(spy).not.toHaveBeenCalled();
  });

  test(".inspectError calls fn and returns self", () => {
    const e = new Error("e");
    const spy = vi.fn();
    const r = err(e);
    const returned = r.inspectError(spy);
    expect(spy).toHaveBeenCalledWith(e);
    expect(returned).toBe(r);
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

describe("Result.expect", () => {
  test("returns value for Ok", () => {
    expect(Result.expect(ok(42), "should be ok")).toBe(42);
  });

  test("throws with custom message for Err", () => {
    expect(() => Result.expect(err(new Error("inner")), "outer")).toThrow(
      "outer: inner"
    );
  });

  test("thrown error has cause", () => {
    const original = new Error("cause");
    try {
      Result.expect(err(original), "msg");
      expect.unreachable();
    } catch (e) {
      expect((e as Error).cause).toBe(original);
    }
  });

  test("preserves error prototype (TypeError)", () => {
    try {
      Result.expect(err(new TypeError("inner")), "msg");
      expect.unreachable();
    } catch (e) {
      expect(e).toBeInstanceOf(TypeError);
      expect(e).toBeInstanceOf(Error);
      expect((e as Error).message).toBe("msg: inner");
    }
  });

  test("preserves error prototype (RangeError)", () => {
    try {
      Result.expect(err(new RangeError("inner")), "msg");
      expect.unreachable();
    } catch (e) {
      expect(e).toBeInstanceOf(RangeError);
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

  test("wraps object as Error using JSON.stringify", () => {
    const e = normalizeError({ code: 1 });
    expect(e).toBeInstanceOf(Error);
    expect(e.message).toBe('{"code":1}');
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
    expect(e.message).toBe('{"key":"value"}');
  });

  test("handles empty null-prototype object", () => {
    const obj = Object.create(null);
    const e = normalizeError(obj);
    expect(e).toBeInstanceOf(Error);
    expect(e.message).toBe("Non-stringifiable thrown value");
  });

  test("handles objects with throwing toString", () => {
    const e = normalizeError({
      toString() {
        throw new Error("boom");
      },
    });
    expect(e).toBeInstanceOf(Error);
    // JSON.stringify should still work since it calls toJSON/toISOString
    // before toString, and for plain objects it serializes own enumerable props
  });

  test("handles BigInt via String fallback", () => {
    const e = normalizeError(BigInt(42));
    expect(e).toBeInstanceOf(Error);
    expect(e.message).toBe("42");
  });

  test("handles circular references via String fallback", () => {
    const obj: Record<string, unknown> = {};
    obj["self"] = obj;
    const e = normalizeError(obj);
    expect(e).toBeInstanceOf(Error);
    // JSON.stringify throws on circular; falls back to String which gives
    // "[object Object]"
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

  test("returns Err when error mapper throws", () => {
    const r = Result.tryCatch(
      () => {
        throw new Error("original");
      },
      () => {
        throw new Error("mapper-fail");
      }
    );
    expect(r.ok).toBe(false);
    if (!r.ok) {
      const e = r.error as Error;
      expect(e.message).toBe("Error mapper threw");
      expect(e.cause).toBeInstanceOf(Error);
      expect((e.cause as Error).message).toBe("mapper-fail");
    }
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

  test("returns Err when error mapper throws", async () => {
    const r = await Result.tryCatchAsync(
      () => Promise.reject(new Error("original")),
      () => {
        throw new Error("mapper-fail");
      }
    );
    expect(r.ok).toBe(false);
    if (!r.ok) {
      expect((r.error as Error).message).toBe("Error mapper threw");
    }
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

  test("returns Err when error mapper throws", async () => {
    const r = await Result.fromPromise(
      Promise.reject(new Error("original")),
      () => {
        throw new Error("mapper-fail");
      }
    );
    expect(r.ok).toBe(false);
    if (!r.ok) {
      expect((r.error as Error).message).toBe("Error mapper threw");
    }
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
      expect(r.error.errors[0].message).toBe("first");
      expect(r.error.errors[1].message).toBe("second");
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
      expect(r.error.errors[0].message).toBe("only");
    }
  });
});

// ---------------------------------------------------------------------------
// Method chaining
// ---------------------------------------------------------------------------

describe("OkResult instance methods", () => {
  test(".match calls ok handler", () => {
    expect(ok(42).match({ ok: (v) => v * 2, err: () => -1 })).toBe(84);
  });

  test(".unwrap returns value", () => {
    expect(ok(42).unwrap()).toBe(42);
  });

  test(".expect returns value", () => {
    expect(ok(42).expect("should be ok")).toBe(42);
  });

  test(".unwrapOr returns value", () => {
    expect(ok(42).unwrapOr(0)).toBe(42);
  });

  test(".unwrapOrElse returns value without calling fn", () => {
    const fn = vi.fn(() => 0);
    expect(ok(42).unwrapOrElse(fn)).toBe(42);
    expect(fn).not.toHaveBeenCalled();
  });
});

describe("ErrResult instance methods", () => {
  test(".match calls err handler", () => {
    expect(
      err(new Error("e")).match({ ok: () => "ok", err: (e) => e.message })
    ).toBe("e");
  });

  test(".unwrap throws", () => {
    const e = new Error("boom");
    expect(() => err(e).unwrap()).toThrow(e);
  });

  test(".expect throws with prototype preservation", () => {
    try {
      err(new TypeError("inner")).expect("msg");
      expect.unreachable();
    } catch (e) {
      expect(e).toBeInstanceOf(TypeError);
    }
  });

  test(".unwrapOr returns fallback", () => {
    expect(err(new Error()).unwrapOr(99)).toBe(99);
  });

  test(".unwrapOrElse calls fn", () => {
    expect(err(new Error()).unwrapOrElse(() => 99)).toBe(99);
  });
});

describe("chaining", () => {
  test("ok().map().flatMap().mapError()", () => {
    const r = ok(10)
      .map((x) => x + 5)
      .flatMap((x) => (x > 10 ? ok(x) : err(new Error("too small"))))
      .mapError((e) => new TypeError(e.message));
    expect(r.ok && r.value).toBe(15);
  });

  test("err short-circuits through chain", () => {
    const original = new Error("original");
    const r = err(original)
      .map(() => 99)
      .flatMap(() => ok(100));
    expect(!r.ok && r.error).toBe(original);
  });

  test("inspect chains without transforming", () => {
    const spy = vi.fn();
    const r = ok(10)
      .inspect(spy)
      .map((x) => x + 1);
    expect(spy).toHaveBeenCalledWith(10);
    expect(r.ok && r.value).toBe(11);
  });
});
