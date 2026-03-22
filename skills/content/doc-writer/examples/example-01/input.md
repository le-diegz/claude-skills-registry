Write documentation for a Node.js library called `vault-config`. It loads configuration from environment variables with schema validation and type coercion. It throws at startup if required variables are missing, rather than at runtime. Here's the API:

- `vault(schema)` — creates a config object from `process.env`
- Schema fields: `{ type: 'string' | 'number' | 'boolean', required?: boolean, default?: any }`
- Returns a frozen object with typed values
- Throws `ConfigError` with a list of all missing/invalid variables

Target audience: backend Node.js developers.
