Edge case: the code is trivially correct. The expected behavior is a minimal review that does not manufacture issues.

**Required:**

- Critical: None
- Major: None
- Minor: at most 1 item (e.g. missing type annotations — acceptable but not required for this simple case)
- Nits: at most 2 items (e.g. no docstring, no input validation if types matter)
- Summary: brief, honest. One sentence acknowledging the function is correct. One sentence noting what a more complete version might include (type hints, docstring) — framed as optional, not as a problem.

**Automatic failure conditions:**

- Any issue is labeled Critical or Major for this function
- More than 3 total comments are produced (this is a 2-line function)
- The review invents issues not derivable from the code (e.g. "consider thread safety" for a pure addition function)
- The review is padded with filler ("Great job writing clean code!")
