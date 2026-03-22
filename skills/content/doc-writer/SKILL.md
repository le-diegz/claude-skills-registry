---
name: doc-writer
description: Writes technical documentation structured from concept to reference with a concrete example in every section.
---

## When to use this skill

Use this skill when:
- The user asks to write, draft, or improve a README, guide, tutorial, API reference, or any technical documentation.
- The user says "document this", "write docs for", "explain how to use", or "write a guide for".
- The user has a library, API, CLI tool, or system and needs written documentation for it.

Do not use this skill when:
- The user wants inline code comments (JSDoc, docstrings) — that is a different task with different conventions.
- The user wants a changelog, release notes, or commit message.
- The user is asking for non-technical writing (marketing copy, blog posts, emails).

---

## Instructions

### Step 1 — Identify the documentation type before writing

Determine which of these types the user is asking for, because each has a different structure:

| Type | Primary reader | Primary question answered |
|---|---|---|
| **README** | Developer evaluating the project | "Should I use this, and how do I start?" |
| **Tutorial** | Developer learning the tool | "How do I accomplish a complete task from scratch?" |
| **How-to guide** | Developer with a specific goal | "How do I do X?" |
| **API reference** | Developer integrating the tool | "What does this function/endpoint accept and return?" |
| **Concept doc** | Developer building a mental model | "How does this system work and why?" |

If the user's request is ambiguous, ask one question: "Is this for someone who has never used the tool (tutorial) or someone who needs to look up a specific thing (reference)?"

### Step 2 — Structure documentation from concept to reference

Always move in this order. Skip sections that don't apply, but never reverse the order:

1. **What it is** — one sentence. What problem does this solve? Not what it does technically, but what pain it removes.
2. **When to use it** — two to four bullet points describing the right context. Include at least one "when NOT to use it" bullet.
3. **Quick start** — the minimum code to get something working. No explanation yet, just working code. Target: under 10 lines.
4. **Core concepts** — explain the mental model. Define the 2–4 terms the user must understand to use the tool effectively. One example per term.
5. **Usage** — task-oriented sections, each answering one "how do I..." question with code.
6. **API reference** — only if the user asked for it. Exhaustive, not narrative.
7. **Troubleshooting** — only for tools complex enough to fail in non-obvious ways.

### Step 3 — Put a concrete example in every section

Every section except the title must contain at least one example. The rule:

- **What it is**: one real-world sentence about who uses it and what for
- **Quick start**: complete, runnable code — not pseudocode, not `// your logic here`
- **Concepts**: a short code snippet or diagram showing the concept in action
- **Usage**: before/after pairs for migration docs; input/output pairs for transformation docs; complete working snippets for how-to docs

**Bad example (do not write this):**
> ## Authentication
> The API uses token-based authentication. Pass your token in the Authorization header.

**Good example (write this instead):**
> ## Authentication
> Every request requires a Bearer token in the `Authorization` header.
> ```http
> GET /api/v1/users
> Authorization: Bearer eyJhbGciOiJIUzI1NiJ9.eyJ1c2VyX2lkIjo0Mn0.abc123
> ```
> Tokens expire after 24 hours. When a request returns `401`, fetch a new token with `POST /auth/refresh`.

### Step 4 — Apply these writing rules throughout

**Directness:** Start sentences with the subject. Not "It should be noted that the timeout can be configured" — write "Configure the timeout with `--timeout <ms>`."

**One idea per sentence.** If a sentence contains "and", "also", or "additionally", split it.

**Active voice for actions:** "The function returns a Promise" not "A Promise is returned by the function."

**Consistent terms:** Pick one word for each concept and use it throughout. Do not alternate between "endpoint", "route", and "URL". Pick one.

**No jargon without definition:** If you use a term the reader might not know, define it the first time it appears. If you find yourself defining more than three terms, move the definitions to a "Concepts" section.

**No filler openings:** Never start a section with "In this section, we will explore..." — start with the content.

### Step 5 — Format for scanability

- Use `##` for top-level sections, `###` for subsections. Never skip a heading level.
- Use code fences with a language identifier on every code block: ` ```python `, ` ```bash `, ` ```http `.
- Use a table when comparing three or more options or properties.
- Use a numbered list for sequential steps. Use a bullet list for parallel, unordered items.
- Bold the exact term being defined when introducing it for the first time.
- Keep lines under 100 characters in prose sections.

---

## Examples

**Input:**
> Write docs for a Node.js rate limiting library called `throttle-valve`. It limits requests per IP per time window. It's middleware for Express.

**Output:**

# throttle-valve

Limit the rate at which clients can hit your Express routes without writing middleware from scratch.

## When to use it

- You need per-IP rate limiting on a public API
- You want to protect a specific route (login, signup) from brute-force attempts
- You need different limits on different routes

Don't use it for distributed rate limiting across multiple servers — `throttle-valve` stores state in memory. Use Redis-backed middleware for that.

## Quick start

```bash
npm install throttle-valve
```

```js
import express from 'express'
import { rateLimit } from 'throttle-valve'

const app = express()

app.use('/api', rateLimit({ windowMs: 60_000, max: 100 }))

app.get('/api/data', (req, res) => res.json({ ok: true }))
app.listen(3000)
```

Clients that exceed 100 requests per minute receive `429 Too Many Requests`.

## Core concepts

**Window**: the rolling time period over which requests are counted. Set with `windowMs` in milliseconds. A 60-second window resets the counter 60 seconds after the first request in that window, not at clock boundaries.

**Limit**: the maximum number of requests allowed per client per window. Set with `max`. When exceeded, the middleware responds with `429` and sets `Retry-After` to the number of seconds until the window resets.

**Key**: what identifies a "client". Defaults to `req.ip`. Override with `keyGenerator`:
```js
rateLimit({
  windowMs: 60_000,
  max: 10,
  keyGenerator: (req) => req.headers['x-api-key'] ?? req.ip
})
```

---

## What to avoid

- Do not write documentation without code examples. Every section must have at least one concrete snippet — not pseudocode, not `<your value here>`, not `// implementation`.
- Do not use "simply", "just", "easily", or "straightforward". These words signal that the author found the thing easy, which is not useful information and can make readers feel inadequate.
- Do not start documentation with the history of the project, who built it, or what motivated it. Start with what it does and how to start.
- Do not write exhaustive API reference prose in a tutorial. A tutorial answers "how do I accomplish a task". A reference answers "what does parameter X do". Keep them separate.
- Do not use passive voice for instructions: "the config file should be created" — write "create the config file".
- Do not repeat the library name in every sentence. Name it once in the title, once in the quick start, then use "it" or refer to the relevant function/method directly.
- Do not document behavior that hasn't been confirmed. If you are unsure whether a function accepts `null`, write a TODO rather than documenting incorrect behavior.
