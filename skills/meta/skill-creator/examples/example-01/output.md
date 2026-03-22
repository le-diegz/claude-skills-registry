Good scope. "Write better error messages" is specific enough — the output is a finite piece of text (an error message), the trigger is clear (developer asks Claude to write error messages), and the rubric will be verifiable.

One scoping decision to confirm: should this skill cover both **user-facing messages** (shown in the UI) and **developer-facing messages** (API error responses, thrown exceptions, log entries)? These have different requirements — user-facing messages should avoid technical terms; developer messages should include context like request IDs and affected fields. I'll scope to user-facing messages and API error responses (the two most common cases), and exclude internal log messages and exception strings.

---

Here are the generated files:

---

**`meta.json`:**

```json
{
  "name": "error-message-writer",
  "version": "1.0.0",
  "description": "Writes clear, actionable error messages that state what went wrong and what the user should do next.",
  "trigger": "Activate this skill when the user asks to write, improve, or review error messages, validation errors, or user-facing failure states in an application. Do not activate for writing error handling logic, try/catch blocks, or error logging — this skill produces message text only, not code structure.",
  "domain": "code",
  "tags": ["error-messages", "ux-writing", "validation", "api-errors", "user-facing"],
  "author": "your-handle",
  "model_compatibility": ["claude-sonnet-4-6"],
  "requires_tools": [],
  "license": "MIT"
}
```

---

**`SKILL.md`** (abridged for review — full file would be generated to disk):

```markdown
---
name: error-message-writer
description: Writes clear, actionable error messages that state what went wrong and what the user should do next.
---

## When to use this skill

Use this skill when:
- The user shares a list of error codes or validation rules and asks for message copy.
- The user shows a current error message and asks to improve it.
- The user asks "what should this error say" or "write the error messages for this form".

Do not use this skill when:
- The user wants to implement error handling logic (try/catch, error classes, middleware).
- The user wants internal log messages or exception strings (different audience and requirements).

## Instructions

1. For every error message, identify: what happened, why it matters to the user, and what action resolves it.

2. Apply the three-part structure to every message:
   - **What**: state the problem in plain language, without technical terms
   - **Why it matters** (optional, for non-obvious errors): one short phrase
   - **What to do**: one concrete action the user can take right now

3. Use these constraints:
   - Maximum 2 sentences per user-facing message
   - No stack traces, field names, or internal codes in user-facing messages
   - API error responses must include: human-readable message + machine-readable code + affected field (if applicable)
   - Never write "Something went wrong" or "An error occurred" without more context

...

## What to avoid
- Do not write "Please try again later" as the only action — tell the user when to retry or who to contact.
- Do not include technical identifiers (SQL constraint names, internal field names) in user-facing messages.
...
```

---

**Suggested `examples/example-01/input.md`:**
```
Write user-facing error messages for these form validation cases:
- Email field is empty
- Email format is invalid
- Password is less than 8 characters
- Passwords don't match (confirm password field)
- Username is already taken
```

**Suggested `examples/example-01/output.md`** would show messages like:
- "Enter your email address." (not "Email is required")
- "Check that your email address is formatted correctly — for example, name@domain.com."
- "Your password must be at least 8 characters."
- "Passwords don't match. Re-enter your password."
- "That username is taken. Try adding numbers or choosing a different one."

Want me to write the full files to disk? I'll also generate `eval-01` (happy path: a set of validation errors) and `eval-02` (edge case: a 500-level API error where the cause is unknown to the frontend).
