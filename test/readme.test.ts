// Every runtime claim of README.md, as written there.
import { describe, expect, test } from "vitest";
import {
  err,
  Maybe,
  none,
  normalizeError,
  ok,
  Result,
  some,
} from "../src/index.js";

describe("README: Errors", () => {
  test("the documented examples", () => {
    const t = new TypeError("t");
    expect(Result.normalizeError(t)).toBe(t);
    expect(normalizeError("oops").message).toBe("oops");
    expect(normalizeError(42).message).toBe("42");
    const db = { message: "db down", code: "ECONNREFUSED" };
    expect(normalizeError(db).message).toBe("db down");
    expect(normalizeError(db).cause).toBe(db);
    const response = {
      status: 401,
      config: { headers: { Authorization: "PLACEHOLDER" } },
    };
    const n = normalizeError(response);
    expect(n.message).toBe("Non-Error object thrown");
    expect(n.message).not.toContain("PLACEHOLDER");
    expect(n.cause).toBe(response);
  });

  test("a real Error with a non-string message keeps it", () => {
    class HttpError extends Error {}
    const e = Object.assign(new HttpError(), { message: { code: 401 } });
    expect(normalizeError(e)).toBe(e);
    expect(err(e).error.message).toEqual({ code: 401 });
    expect(String(err(e).error.message)).toBe("[object Object]");
  });

  test("err() normalizes a non-Error value from any", () => {
    const r = err("boom" as unknown as Error);
    expect(r.error).toBeInstanceOf(Error);
    expect(r.error.message).toBe("boom");
  });
});

describe("README: Transforming; Throws inside callbacks", () => {
  test("flatten of nested Results and Maybes", () => {
    expect(Result.flatten(ok(ok(42)))).toEqual(ok(42));
    expect(Maybe.flatten(some(some(42)))).toEqual(some(42));
  });

  test("orElse recovers", () => {
    expect(Result.orElse(err(new Error()), () => ok(0))).toEqual(ok(0));
  });

  test("a throw from a callback propagates", () => {
    const boom = (): never => {
      throw new Error("boom");
    };
    const e = err(new Error("e"));
    expect(() => Result.map(ok(1), boom)).toThrow("boom");
    expect(() => Result.mapError(e, boom)).toThrow("boom");
    expect(() => Result.inspect(ok(1), boom)).toThrow("boom");
    expect(() => Result.inspectError(e, boom)).toThrow("boom");
    expect(() => Result.flatMap(ok(1), boom)).toThrow("boom");
    expect(() => Result.orElse(e, boom)).toThrow("boom");
    expect(() => Result.match(ok(1), { ok: boom, err: boom })).toThrow("boom");
    expect(() => Maybe.map(some(1), boom)).toThrow("boom");
    expect(() => Maybe.flatMap(some(1), boom)).toThrow("boom");
    expect(() => Maybe.inspect(some(1), boom)).toThrow("boom");
    const parsed = Result.flatMap(ok("{"), (s) =>
      Result.tryCatch(() => JSON.parse(s))
    );
    expect(!parsed.ok && parsed.error).toBeInstanceOf(SyntaxError);
  });
});

describe("README: Combining results", () => {
  test("all fails fast with the first error", () => {
    const a = new Error("a");
    expect(Result.all(ok(1), err(a), err(new Error("b")))).toEqual(err(a));
  });

  test("collect gathers every error in an AggregateError", () => {
    const a = new Error("a");
    const b = new TypeError("b");
    const r = Result.collect(err(a), ok(1), err(b));
    expect(!r.ok && r.error).toBeInstanceOf(AggregateError);
    expect(!r.ok && r.error.errors).toEqual([a, b]);
  });

  test("allAsync / collectAsync turn a rejection into a normalized Err", async () => {
    const r = await Result.allAsync(Promise.reject("raw"));
    expect(!r.ok && r.error.message).toBe("raw");
    const c = await Result.collectAsync(Promise.reject("raw"));
    expect(!c.ok && (c.error.errors[0] as Error).message).toBe("raw");
  });

  test("allAsync / collectAsync wait for every promise", async () => {
    const settled: string[] = [];
    const later = (ms: number, name: string, fail = false) =>
      new Promise<Result<number, Error>>((resolve, reject) =>
        setTimeout(() => {
          settled.push(name);
          if (fail) reject(new Error(name));
          else resolve(err(new Error(name)));
        }, ms)
      );
    const r = await Result.allAsync(
      later(30, "first"),
      later(1, "second", true)
    );
    expect(settled).toEqual(["second", "first"]);
    expect(!r.ok && r.error.message).toBe("first");
    settled.length = 0;
    const c = await Result.collectAsync(later(1, "a"), later(30, "b", true));
    expect(settled).toEqual(["a", "b"]);
    expect(!c.ok && c.error.errors.map((e) => e.message)).toEqual(["a", "b"]);
  });

  test("Maybe.allAsync rejects with the first rejection in argument order, even after a None", async () => {
    await expect(
      Maybe.allAsync(
        Promise.resolve(none()),
        Promise.reject(new Error("first")),
        Promise.reject(new Error("second"))
      )
    ).rejects.toThrow("first");
  });
});

describe("README: Interop", () => {
  test("the documented conversions", () => {
    expect(Result.toMaybe(ok(42))).toEqual(some(42));
    expect(Result.toMaybe(err(new Error()))).toBe(none());
    expect(Result.fromMaybe(some(42), () => new Error("missing"))).toEqual(
      ok(42)
    );
    const missing = Result.fromMaybe(none(), () => new Error("missing"));
    expect(!missing.ok && missing.error.message).toBe("missing");
    expect(Maybe.fromResult(ok(42))).toEqual(some(42));
    expect(Maybe.toResult(some(42), () => new Error("missing"))).toEqual(
      ok(42)
    );
    expect(Result.transpose(ok(some(42)))).toEqual(some(ok(42)));
    expect(Result.transpose(ok(none()))).toBe(none());
    expect(Maybe.transpose(some(ok(42)))).toEqual(ok(some(42)));
    expect(Maybe.transpose(none())).toEqual(ok(none()));
  });
});

describe("README: Design decisions", () => {
  test("results and maybes are frozen; None is a singleton", () => {
    expect(Object.isFrozen(ok(1))).toBe(true);
    expect(Object.isFrozen(err(new Error()))).toBe(true);
    expect(Object.isFrozen(some(1))).toBe(true);
    expect(none()).toBe(none());
    expect(Maybe.map(none(), (x) => x)).toBe(none());
  });

  test("functions over plain objects: no instance methods", () => {
    expect(Object.keys(ok(1))).toEqual(["ok", "value"]);
    expect(Object.keys(err(new Error()))).toEqual(["ok", "error"]);
    expect(Object.getPrototypeOf(ok(1))).toBe(Object.prototype);
  });
});

describe("README: Extracting values", () => {
  test("exhaustive names primitives and hides objects", () => {
    const message = (value: unknown) => {
      try {
        Result.exhaustive(value as never);
      } catch (e) {
        return (e as Error).message;
      }
      return "no throw";
    };
    expect(message("pending")).toBe('Unhandled result case: "pending"');
    expect(message(42)).toBe("Unhandled result case: 42");
    expect(message(Number.NaN)).toBe("Unhandled result case: NaN");
    expect(message(Symbol("s"))).toBe("Unhandled result case: Symbol(s)");
    expect(message({ token: "PLACEHOLDER" })).toBe(
      "Unhandled result case: <object>"
    );
    expect(message(() => 1)).toBe("Unhandled result case: <function>");
  });
});

describe("README: Checking values", () => {
  test("isResult rejects an object with both value and error", () => {
    expect(Result.isResult({ ok: true, value: 1, error: "x" })).toBe(false);
    expect(Result.isResult({ ok: false, error: "denied" })).toBe(false);
  });
});

describe("README: Input checks and JSON", () => {
  // biome-ignore lint/suspicious/noExplicitAny: values that arrive through any
  const untyped = (value: unknown): any => value;
  const json = JSON.parse(JSON.stringify(ok()));

  test("Result.ok() after JSON is not a Result", () => {
    expect(json).toEqual({ ok: true });
    expect(Result.isResult(json)).toBe(false);
  });

  test("combinators throw with a zero-based index", async () => {
    expect(() => Result.all(ok(1), untyped(5))).toThrow(
      new TypeError("Result.all: item 1 is not a Result")
    );
    expect(() => Result.all(err(new Error("e")), untyped(5))).toThrow(
      "Result.all: item 1 is not a Result"
    );
    expect(() => Result.all([json])).toThrow(
      "Result.all: item 0 is not a Result"
    );
    expect(() => Result.all(untyped([ok(1)]), ok(2))).toThrow(TypeError);
    expect(Result.all(untyped([ok(1), ok(2)]), untyped(0))).toEqual(ok([1, 2]));
    await expect(
      Result.collectAsync(
        Promise.reject(new Error("r")),
        Promise.resolve(untyped(5))
      )
    ).rejects.toThrow("Result.collectAsync: item 1 is not a Result");
    await expect(
      Maybe.allAsync(
        Promise.reject(new Error("r")),
        Promise.resolve(untyped(5))
      )
    ).rejects.toThrow("Maybe.allAsync: item 1 is not a Maybe");
  });

  test("extracting functions check the input", () => {
    const denied = untyped({ ok: false, error: "denied" });
    for (const input of [json, denied]) {
      expect(() => Result.unwrap(input)).toThrow(
        new TypeError("Result.unwrap: input is not a Result")
      );
      expect(() => Result.unwrapErr(input)).toThrow(TypeError);
      expect(() => Result.unwrapOr(input, 0)).toThrow(TypeError);
      expect(() => Result.split(input)).toThrow(TypeError);
    }
    const fn = () => 0;
    expect(() => Result.unwrapOrElse(untyped(5), fn)).toThrow(TypeError);
    expect(() => Result.match(untyped(5), { ok: fn, err: fn })).toThrow(
      "Result.match: input is not a Result"
    );
    expect(() => Maybe.unwrapOr(untyped(5), 0)).toThrow(
      "Maybe.unwrapOr: input is not a Maybe"
    );
  });

  test("flatten checks the value inside; map does not check", () => {
    expect(() => Result.flatten(ok(untyped(5)))).toThrow(
      new TypeError("Result.flatten: value is not a Result")
    );
    expect(Result.map(untyped(5), (v) => v)).toBe(5);
  });
});

describe("README: Point-free use", () => {
  test("combinators ignore the index; unwrapOr and flatMap use it", () => {
    const groups = [[ok(1), ok(2)], [err(new Error("x"))]];
    expect(groups.map(Result.all)[0]).toEqual(ok([1, 2]));
    expect([err(new Error("e")), ok(5)].map(Result.unwrapOr)).toEqual([0, 5]);
    expect(() => [ok(1)].map(Result.flatMap)).toThrow(TypeError);
  });
});

describe("README: None across builds", () => {
  test("a copy is not ===, but isNone accepts it", () => {
    const copy = structuredClone(none());
    expect(copy).not.toBe(none());
    expect(Maybe.isNone(copy)).toBe(true);
  });
});
