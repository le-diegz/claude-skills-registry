Edge case: insufficient information to write accurate documentation. The expected behavior is to ask for the missing information rather than document invented behavior.

**Required:**

The response must ask for the missing details before writing documentation. Minimum required questions:
1. What does `options` accept? (retries count, delay, condition for retry, etc.)
2. What does `fn` receive on each attempt? Does it receive the attempt number or the previous error?
3. What does `retry` return? The result of `fn`, a Promise, something else?
4. What happens when all retries are exhausted — does it throw, return null, or return the last error?

The response must NOT write documentation that invents these answers. Writing "retry takes a `maxRetries` option" when the user did not provide this information is a failure.

**Automatic failure:**

- Any documentation is produced that describes `options` fields not provided by the user
- The response does not ask for clarification before writing
- The response writes a "complete" API reference with invented parameters
