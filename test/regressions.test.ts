// Runtime findings of earlier audits, kept as regression tests.
import { describe, expect, test } from "vitest";
import { err, Maybe, none, ok, Result, some } from "../src/index.js";

describe("falsy values survive every function unchanged", () => {
  test.each([0, -0, "", false, null, undefined, Number.NaN, 0n])("%s", (v) => {
    const o = ok(v);
    const s = some(v);
    const results: Record<string, unknown> = {
      "Result.map": Result.map(o, (x) => x).value,
      "Result.flatMap": Result.unwrap(Result.flatMap(o, (x) => ok(x))),
      "Result.orElse": Result.unwrap(Result.orElse(o, () => ok(v))),
      "Result.unwrapOr": Result.unwrapOr(o, v),
      "Result.unwrapOrElse": Result.unwrapOrElse(o, () => v),
      "Result.unwrap": Result.unwrap(o),
      "Result.match": Result.match(o, { ok: (x) => x, err: () => 1 }),
      "Result.split": Result.split(o)[1],
      "Result.all": Result.unwrap(Result.all(o, o))[1],
      "Result.collect": Result.unwrap(Result.collect(o))[0],
      "Result.toMaybe": Maybe.unwrap(Result.toMaybe(o)),
      "Result.flatten": Result.unwrap(Result.flatten(ok(o))),
      "Result.fromPredicate": Result.unwrap(
        Result.fromPredicate(
          v,
          () => true,
          () => new Error()
        )
      ),
      "Result.tryCatch": Result.unwrap(Result.tryCatch(() => v)),
      "Maybe.map": Maybe.map(s, (x) => x).value,
      "Maybe.flatMap": Maybe.unwrap(Maybe.flatMap(s, (x) => some(x))),
      "Maybe.filter": Maybe.unwrap(Maybe.filter(s, () => true)),
      "Maybe.unwrapOr": Maybe.unwrapOr(s, v),
      "Maybe.match": Maybe.match(s, { some: (x) => x, none: () => 1 }),
      "Maybe.all": Maybe.unwrap(Maybe.all(s, s))[1],
      "Maybe.firstSome": Maybe.unwrap(Maybe.firstSome(none(), s)),
      "Maybe.toResult": Result.unwrap(Maybe.toResult(s, () => new Error())),
    };
    for (const [name, got] of Object.entries(results)) {
      expect([name, Object.is(got, v)]).toEqual([name, true]);
    }
    const nullable = Result.fromNullable(v, () => new Error("nullish"));
    expect(nullable.ok).toBe(v != null);
    expect(Maybe.fromNullable(v).some).toBe(v != null);
  });
});

describe("a copy of None is not none(), but is still a None", () => {
  test("structuredClone and JSON", () => {
    const cloned = structuredClone(none());
    const parsed = JSON.parse(JSON.stringify(none()));
    expect(cloned).not.toBe(none());
    expect(Maybe.isNone(cloned)).toBe(true);
    expect(Maybe.isNone(parsed)).toBe(true);
    expect(Maybe.unwrapOr(parsed, 1)).toBe(1);
  });
});

describe("Result values survive structuredClone as plain data", () => {
  test("the AggregateError of collect becomes a plain Error without errors", () => {
    // The platform clones AggregateError as Error (Node 20 and 24).
    const r = Result.collect(err(new Error("a")), err(new Error("b")));
    const cloned = structuredClone(r);
    expect(Result.isResult(cloned)).toBe(true);
    expect(!cloned.ok && cloned.error).not.toBeInstanceOf(AggregateError);
    expect(!cloned.ok && cloned.error.message).toBe(
      "Result.collect: 2 of 2 items failed"
    );
    expect(!cloned.ok && cloned.error.errors).toBeUndefined();
  });

  test("an Err keeps its message; the class is not preserved", () => {
    class NotFoundError extends Error {
      override name = "NotFoundError";
    }
    const cloned = structuredClone(err(new NotFoundError("missing")));
    expect(Result.isResult(cloned)).toBe(true);
    expect(cloned.error.message).toBe("missing");
    expect(cloned.error).not.toBeInstanceOf(NotFoundError);
  });
});
