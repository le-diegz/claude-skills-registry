# vault-config

Validate and type-coerce environment variables at startup so missing configuration crashes immediately instead of causing runtime errors three calls deep.

## When to use it

- You have a Node.js service that reads from `process.env` and want to fail loudly at startup if anything is missing
- You want typed config values (numbers as numbers, booleans as booleans) without manual parsing
- You want a single place where all required environment variables are declared

Don't use it for configuration loaded from files, databases, or remote sources — `vault-config` only reads from `process.env`.

## Quick start

```bash
npm install vault-config
```

```js
import { vault } from 'vault-config'

const config = vault({
  PORT:        { type: 'number', default: 3000 },
  DATABASE_URL: { type: 'string', required: true },
  DEBUG:       { type: 'boolean', default: false },
})

console.log(config.PORT)        // 3000 (number)
console.log(config.DEBUG)       // false (boolean)
console.log(config.DATABASE_URL) // "postgres://..." (string)
```

If `DATABASE_URL` is not set in the environment, this throws before your server starts:
```
ConfigError: Missing required environment variables:
  - DATABASE_URL (string, required)
```

## Core concepts

**Schema**: a plain object where each key is an environment variable name and each value describes the expected type, whether it's required, and an optional default.

```js
const schema = {
  TIMEOUT_MS: { type: 'number', required: true },
  LOG_LEVEL:  { type: 'string', default: 'info' },
  VERBOSE:    { type: 'boolean', default: false },
}
```

**Type coercion**: `vault` converts the raw string value from `process.env` to the declared type. The rules are:
- `'number'` — `parseFloat(value)`. Throws if the result is `NaN`.
- `'boolean'` — `'true'` and `'1'` → `true`; `'false'` and `'0'` → `false`. Any other value throws.
- `'string'` — no conversion applied.

**Fail-fast validation**: `vault` reads and validates the entire schema before returning. It collects all errors — not just the first — and throws a single `ConfigError` listing every missing or invalid variable. This means one fix cycle, not one fix per restart.

**Frozen config**: the returned object is `Object.freeze()`d. Mutations are silently ignored in non-strict mode, or throw in strict mode.

```js
config.PORT = 9000 // no effect — config is frozen
```

## Usage

### Declare config at module load time

Call `vault()` at the top level of your entry file, not inside a function or route handler. Configuration is a startup concern.

```js
// app.js — top of file, before any other imports that might use config
import { vault } from 'vault-config'

export const config = vault({
  PORT:         { type: 'number', default: 3000 },
  DATABASE_URL: { type: 'string', required: true },
  JWT_SECRET:   { type: 'string', required: true },
})
```

Then import `config` wherever you need it:
```js
import { config } from './app.js'

app.listen(config.PORT)
```

### Handle `ConfigError` in startup scripts

```js
import { vault, ConfigError } from 'vault-config'

try {
  const config = vault(schema)
  startServer(config)
} catch (err) {
  if (err instanceof ConfigError) {
    console.error(err.message)
    process.exit(1)
  }
  throw err
}
```

### Use defaults for optional variables

A variable with a `default` is never required, even if it's missing from the environment. Providing both `required: true` and `default` is a schema error and throws immediately.

```js
vault({
  CACHE_TTL: { type: 'number', default: 300 },      // 300 if not set
  CACHE_TTL: { type: 'number', required: true },    // throws if not set
  // WRONG — do not combine:
  CACHE_TTL: { type: 'number', required: true, default: 300 }, // ConfigError at startup
})
```

## API reference

### `vault(schema)`

| Parameter | Type | Description |
|---|---|---|
| `schema` | `object` | Map of env var names to field descriptors |

Returns a frozen object with keys matching the schema, values cast to the declared types.

Throws `ConfigError` if any required variable is missing or any value cannot be coerced to the declared type.

### Field descriptor

| Property | Type | Required | Default |
|---|---|---|---|
| `type` | `'string' \| 'number' \| 'boolean'` | Yes | — |
| `required` | `boolean` | No | `false` |
| `default` | `any` | No | `undefined` |

### `ConfigError`

Extends `Error`. Additional properties:

| Property | Type | Description |
|---|---|---|
| `fields` | `string[]` | Names of the variables that failed validation |

## Troubleshooting

**`ConfigError: Missing required environment variables`**
One or more required variables are not set. Check `err.fields` for the list. In development, add the missing variables to your `.env` file. In production, check your deployment environment configuration.

**`ConfigError: Invalid value for VERBOSE — expected boolean, got "yes"`**
Boolean variables only accept `'true'`, `'false'`, `'1'`, or `'0'`. String values like `'yes'` or `'on'` are not coerced.

**Config object appears empty when imported from another module**
`vault()` must be called before the importing modules execute. Move the `vault()` call to the top of your entry point file.
