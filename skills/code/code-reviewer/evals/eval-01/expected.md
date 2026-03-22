The response must follow the four-section structure (Critical, Major, Minor, Nits, Summary).

**Required findings:**

1. **Critical — null dereference on `user.id`**: `db.users.findOne` can return `null` if no user matches. Accessing `user.id` on line 3 throws `TypeError: Cannot read properties of null` at runtime. The fix must include a null check before accessing `user.id`, and must return early or throw a descriptive error (e.g. `throw new Error('User not found')` or return `null`). A code example showing the null-guarded version is required.

2. **No fabricated issues**: The function is short and the logic is otherwise sound. If the model identifies a "Major" issue that is not the null dereference, it must be a real issue derivable from the code (e.g. missing error handling on the db calls, no return type annotation). It must not invent a problem.

**Required structure:**

- Critical section: at least the null dereference issue with a code fix
- Summary: acknowledges the single critical issue; does not claim the code "looks good overall" before addressing it
- All four sections present (empty ones marked "None")

**Automatic failure conditions:**

- The null dereference on `user.id` is not identified
- A code fix is absent for the Critical issue
- The review comments on code that was not provided (e.g. speculates about other functions in the codebase)
