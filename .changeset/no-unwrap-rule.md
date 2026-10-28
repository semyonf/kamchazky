---
"@semyonf/kamchazky": minor
---

Add the `no-unwrap` ESLint rule. It flags `Result.unwrap` and `Maybe.unwrap`,
which throw on `Err` or `None` and take the failure out of the Result flow.
