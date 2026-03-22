Can you review this authentication middleware? It's Node.js/Express.

```js
const jwt = require('jsonwebtoken')

function authMiddleware(req, res, next) {
  const token = req.headers['authorization']

  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET)
    req.user = decoded
    next()
  } catch (err) {
    res.status(401).json({ error: 'Unauthorized' })
  }
}

module.exports = authMiddleware
```
