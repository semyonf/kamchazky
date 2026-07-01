---
"@semyonf/kamchazky": minor
---

Add an ESLint plugin export `@semyonf/kamchazky/eslint` with the type-aware
`must-use-result` rule. It flags a `Result` that is discarded as a statement
(e.g. `getResult();` or `await getAsyncResult();`), since a discarded `Result`
silently loses the error it carries. Requires `@typescript-eslint/utils` and
`typescript` (both optional peer dependencies, needed only when linting).
