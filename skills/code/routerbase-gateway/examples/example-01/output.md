Use the same OpenAI-compatible SDK shape and change the base URL plus model.

```js
import OpenAI from "openai";

const client = new OpenAI({
  apiKey: process.env.ROUTERBASE_API_KEY,
  baseURL: "https://routerbase.com/v1",
});

const response = await client.chat.completions.create({
  model: "google/gemini-2.5-flash",
  messages: [{ role: "user", content: "Write one sentence about model routing." }],
});

console.log(response.choices[0].message.content);
```

Before production, verify the model ID against the current RouterBase catalog, run one server-side smoke test, and confirm logs never include API keys or private prompts.
