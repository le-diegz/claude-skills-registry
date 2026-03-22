---
name: code-reviewer
description: Produces prioritized, actionable code review comments with concrete fix examples instead of style observations.
---

## When to use this skill

Use this skill when:
- The user shares a function, class, module, diff, or PR and asks for review, feedback, or critique.
- The user asks "what's wrong with this", "can you review this", or "any improvements?".
- The user pastes code with the intent of improving it before shipping or merging.

Do not use this skill when:
- The user wants you to explain what code does without asking for critique.
- The user has a specific runtime error and wants debugging help (use a debugging approach instead).
- The user asks to refactor code to a specific pattern they've already decided on.

---

## Instructions

### Step 1 — Read the full code before commenting on any of it

Read every line before writing a single comment. Do not stream observations as you go. Common mistakes that look like bugs at line 10 are sometimes intentional design at line 50. Understanding the whole before critiquing the parts is not optional.

### Step 2 — Categorize every issue by severity before writing the review

Assign each issue to one of four levels. Use these definitions precisely:

| Level | Definition | Action required |
|---|---|---|
| **Critical** | Will cause data loss, security vulnerability, crash in production, or incorrect behavior in the expected use case | Must fix before merge |
| **Major** | Meaningfully degrades performance, maintainability, or correctness in edge cases the author likely didn't consider | Should fix before merge |
| **Minor** | Makes the code harder to read or reason about, but doesn't affect behavior | Fix if time allows |
| **Nit** | Personal style preference or marginal improvement | Optional, do not block |

### Step 3 — Write the review in severity order

Structure the output as:

```
## Code Review

### Critical
[issues, or "None"]

### Major
[issues, or "None"]

### Minor
[issues, or "None"]

### Nits
[issues, or "None" — keep this section short]

### Summary
[2–3 sentences: overall assessment, biggest strengths, single most important next step]
```

### Step 4 — Write each comment as a self-contained unit

Every comment must contain exactly three parts:

1. **Location**: file name and line number, or a code snippet identifying the exact location
2. **Problem**: one sentence stating what is wrong and why it matters — not "this could be improved" but "this will panic if `data` is nil because there is no nil check before line 14"
3. **Fix**: a concrete code example showing what the corrected version looks like

**Example of a bad comment (do not write this):**
> This function is a bit long and could be refactored for readability.

**Example of a good comment (write this instead):**
> **`processPayment()` — line 34**
> **Problem:** The function catches all errors with a bare `except Exception` and returns `None` silently. A network timeout and an invalid card number are handled identically, making it impossible for the caller to distinguish transient failures (retry) from permanent ones (surface to user).
> **Fix:**
> ```python
> class PaymentError(Exception): pass
> class TransientPaymentError(PaymentError): pass
>
> def process_payment(amount, card):
>     try:
>         return gateway.charge(amount, card)
>     except gateway.NetworkError as e:
>         raise TransientPaymentError(str(e)) from e
>     except gateway.CardError as e:
>         raise PaymentError(str(e)) from e
> ```

### Step 5 — Review for real problems, not surface symptoms

Check for these categories in this order:

1. **Correctness** — Does the code do what it is supposed to do? Test the happy path mentally. Then test with a nil/null input, an empty collection, a boundary value, a concurrent caller, and a network failure. Does it still do the right thing?

2. **Security** — Is there untrusted input reaching a dangerous sink? SQL concatenation, shell execution, path traversal, missing auth checks, secrets in logs.

3. **Error handling** — Are errors swallowed, lost, or converted to generic messages? Can the caller distinguish failure modes?

4. **Resource management** — Are connections, file handles, and locks always released? Does the happy path release them? Does the error path?

5. **Concurrency** — Is shared mutable state accessed without synchronization? Are there race conditions in the obvious execution paths?

6. **Logic** — Are there off-by-one errors, wrong operator precedence, incorrect boolean logic, or missing early returns?

7. **Maintainability** — Is there meaningful duplication that will diverge? Are names misleading? Are magic numbers unexplained?

Do not spend review time on: formatting that a linter catches automatically, import ordering, comment style, indentation.

### Step 6 — Be precise and bienveillant

The review is read by a person who wrote this code in good faith. Every critical comment must be factual and specific, never insulting. Never write "this is wrong" without explaining why. Never write "this is bad code" — write what specific problem the code has.

Do not pad the review with encouragement after every comment. One honest summary sentence about what the code does well is enough.

Do not use hedging language for real problems: "you might want to consider possibly fixing" — if it is Critical, say it is Critical and say why.

---

## Examples

**Input:**
```python
def get_user(user_id):
    conn = db.connect()
    result = conn.execute(f"SELECT * FROM users WHERE id = {user_id}")
    return result.fetchone()
```

**Output:**

## Code Review

### Critical

**`get_user()` — line 3: SQL injection vulnerability**

`user_id` is interpolated directly into the query string. Any caller passing `user_id = "1 OR 1=1"` will dump the entire users table.

Fix:
```python
def get_user(user_id):
    conn = db.connect()
    result = conn.execute("SELECT * FROM users WHERE id = ?", (user_id,))
    return result.fetchone()
```

**`get_user()` — line 2: database connection never closed**

`conn.connect()` opens a connection that is never released. In a long-running process, every call leaks a connection until the pool is exhausted.

Fix:
```python
def get_user(user_id):
    with db.connect() as conn:
        result = conn.execute("SELECT * FROM users WHERE id = ?", (user_id,))
        return result.fetchone()
```

### Major
None.

### Minor
None.

### Nits
None.

### Summary
Two critical issues that must be fixed before this reaches production: a SQL injection that exposes every user record, and a connection leak. The fix for both is a one-line change each. No architectural concerns.

---

## What to avoid

- Do not write comments about formatting, indentation, or style that a linter (eslint, flake8, rubocop) would catch. These are not code review concerns.
- Do not write a comment without a concrete fix. "Consider extracting this into a helper function" is not a review comment — show the extracted function.
- Do not soften Critical issues. "You might want to add a nil check here" for a code path that will crash in production is a disservice to the author.
- Do not invent problems. If a function is short, well-named, and correct, say so in the Summary and do not manufacture Minor issues to fill the template.
- Do not repeat the same observation multiple times across different comments. If error handling is systematically absent, say it once clearly rather than noting it on each of the seven functions that lack it.
- Do not write "overall this looks good!" as a opener if there are Critical issues. The severity order speaks for itself.
- Do not comment on code that was not provided. If the user shares a single function, do not speculate about the rest of the codebase.
