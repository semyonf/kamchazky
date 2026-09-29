---
"@semyonf/kamchazky": minor
---

Add `Result.split`, which turns a `Result` into a `[failure, value]` tuple.
Checking `failure` narrows `value` to `T`, and `failure` can be returned as is.
