## Code Review

### Critical

**`authMiddleware` — line 4: raw `Authorization` header value passed to `jwt.verify`**

The header is read as `req.headers['authorization']` which gives the raw value, typically `"Bearer eyJ..."`. `jwt.verify` expects only the token — not the `Bearer ` prefix. If the client sends a standard Bearer token, `jwt.verify` will always throw a `JsonWebTokenError: invalid token`, and every authenticated request will return 401.

Fix:
```js
const authHeader = req.headers['authorization']
if (!authHeader || !authHeader.startsWith('Bearer ')) {
  return res.status(401).json({ error: 'Missing or malformed Authorization header' })
}
const token = authHeader.slice(7) // remove "Bearer "
```

**`authMiddleware` — line 7: `process.env.JWT_SECRET` may be undefined**

If `JWT_SECRET` is not set in the environment, `jwt.verify` receives `undefined` as the secret and throws. The error is caught and returns a generic 401, making this misconfiguration invisible. A missing secret should crash at startup, not silently fail at runtime.

Fix: validate the secret at module load time, not inside the middleware:
```js
const JWT_SECRET = process.env.JWT_SECRET
if (!JWT_SECRET) {
  throw new Error('JWT_SECRET environment variable is required')
}

function authMiddleware(req, res, next) {
  // ...
  jwt.verify(token, JWT_SECRET)
  // ...
}
```

### Major

**`authMiddleware` — catch block: all JWT errors treated identically**

`jwt.verify` throws different error types: `JsonWebTokenError` (malformed token), `TokenExpiredError` (valid but expired), and `NotBeforeError` (valid but not yet active). Returning a uniform 401 for all of them prevents clients from distinguishing an expired session (show "please log in again") from an invalid token (likely an attack or a bug).

Fix:
```js
} catch (err) {
  if (err.name === 'TokenExpiredError') {
    return res.status(401).json({ error: 'Token expired', code: 'TOKEN_EXPIRED' })
  }
  return res.status(401).json({ error: 'Invalid token', code: 'INVALID_TOKEN' })
}
```

### Minor

None.

### Nits

- Consider using `req.headers.authorization` (lowercase, no bracket notation) — it's equivalent but more idiomatic.
- The module export and the function declaration could be combined: `module.exports = function authMiddleware(...)`.

### Summary

Two critical bugs: the Bearer prefix stripping will cause all valid tokens to be rejected, and the missing secret check will silently fail rather than alerting at startup. One major issue with error differentiation that affects client UX. All three are straightforward fixes. The overall structure of the middleware is sound.
