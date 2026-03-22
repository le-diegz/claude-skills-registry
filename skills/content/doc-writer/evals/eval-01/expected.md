**Required:**

1. **Quick Start is present and shows both install methods** — the output must include a code block showing at minimum `brew install snapenv` AND the basic usage `snapenv > .env`. Both must appear in runnable shell code blocks (` ```bash `).

2. **Every code block has a language identifier** — no bare ``` fences.

3. **`--filter` flag is documented** with a concrete example showing `snapenv --filter PREFIX_ > .env`. The example must show a realistic prefix (not `FOO_`).

4. **No filler opener** — the README must not start with "In this README" or "Welcome to snapenv". It must start with what the tool does.

5. **Active voice for instructions** — "Install snapenv with Homebrew" not "snapenv can be installed using Homebrew".

6. **The word "simply" or "just" does not appear.**

7. **No undocumented behavior** — the README must not describe flags or behaviors not mentioned in the input.

**Recommended:**

- A "When to use it / when not to" section is present
- The README notes that the tool reads the current shell session's environment (not a file), which is the non-obvious behavior

**Automatic failure:**

- Quick Start section is absent
- `--filter` flag is not documented
- A code block has no language identifier
