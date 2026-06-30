# `must-use-result` ESLint rule — design

## Problem

`Result<T, E>` never throws. An error lives inside the value. If a caller
`await`s a `Result` and discards it without reading `.ok`, the error is silently
lost. TypeScript does not enforce consumption; there is no `#[must_use]`.

Two existing lints already cover adjacent cases:

- `no-unused-vars` — a `Result` assigned to a variable that is never read.
- `no-floating-promises` — a `Promise<Result>` whose `await` was forgotten.

The remaining gap: an **awaited Result discarded as a statement**. This rule
closes exactly that gap. It does not reimplement the two lints above.

## Packaging

The rule ships from the kamchazky package so it travels with the monad.

- New export subpath `@semyonf/kamchazky/eslint` → `dist/eslint.js`, added as a
  second `tsup` entry. The main `.` entry stays dependency-free and
  `sideEffects: false`.
- `@typescript-eslint/utils` is an **optional `peerDependency`**. Only consumers
  who lint resolve it; runtime consumers of the monad do not.
- The monorepo wires it in `@configs/eslint/typescript.js` as a plugin
  (namespace `kamchazky`), alongside the existing `edenex` plugin, enabled as
  `kamchazky/must-use-result: "error"`.

## Detection (type-based)

Use `ESLintUtils.getParserServices` and the TS type checker. A type is a
kamchazky `Result` iff:

1. its `aliasSymbol` resolves to the name `Result`, **and**
2. the symbol's declaration source file resolves to the kamchazky package.

Condition 2 prevents false positives from an unrelated `Result` type defined
elsewhere. Type-based detection survives the staged method-removal refactor and
any future renames; it never relies on identifier text.

## Semantics — what counts as "used"

Flag a `Result` only when it is **discarded**: an `ExpressionStatement` whose
expression, after unwrapping a top-level `await`, has a kamchazky `Result` type.

Everything else is already "used" or covered:

| Form                                   | Status                              |
| -------------------------------------- | ----------------------------------- |
| `return result` / passed as argument   | used                                |
| `const r = await f(); ... r.ok`         | used (`no-unused-vars` if unread)   |
| `Result.match(result, ...)` / `.ok`     | used (member / argument)            |
| forgotten `await` on `Promise<Result>`  | covered by `no-floating-promises`   |
| `someResult;` / `await asyncResult();`  | **flagged by this rule**            |

### Decisions

- **Strict, no `void` escape hatch.** Intentional discard uses
  `// eslint-disable-next-line`. No implicit opt-out via the `void` operator.
- **Report-only, non-fixable.** The fix is ambiguous (return vs. check vs.
  unwrap), so no autofix.

## Rule shape

- `meta.type: "problem"`, `messages.mustUse`, `schema: []`, no `fixable`.
- Single visitor: `ExpressionStatement`. Resolve the expression type (unwrap one
  `await`), apply the two-condition detection, report on match.

## Testing (TDD)

`@typescript-eslint/rule-tester` `RuleTester` with a fixture `tsconfig` that
imports the real `Result` type. Tests written first, red → green.

- **Valid:** returned; assigned-and-read; `.ok` checked; passed to
  `Result.match` / `Result.unwrap`; a non-`Result` expression statement.
- **Invalid:** bare `someResult;`; `await asyncResult();` as a statement.

## Out of scope

- Tracking whether `.ok` was actually branched on (left to `no-unused-vars`
  once the value is bound).
- Autofix.
- `Maybe` (separate follow-up if wanted).
