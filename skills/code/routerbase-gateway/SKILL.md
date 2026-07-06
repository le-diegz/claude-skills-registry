---
name: routerbase-gateway
description: Guides RouterBase API integration, model selection, and media generation through an OpenAI-compatible gateway.
---

## When to use this skill

Use this skill when:
- The user asks to use [routerbase](https://routerbase.com/) as an OpenAI-compatible API gateway.
- The user wants to migrate OpenAI SDK, LangChain, LlamaIndex, Vercel AI SDK, Cursor, Continue, or curl examples to RouterBase.
- The user asks which RouterBase model ID to use for chat, vision, image, video, audio, or embeddings.
- The user is building image, video, or audio generation workflows through RouterBase.

Do not use this skill when:
- The user asks about unrelated OpenAI-compatible providers and never mentions RouterBase.
- The user asks for permanent pricing or model availability without allowing a current catalog check.
- The user wants to expose API keys in browser, mobile, or public repository code.

## Instructions

1. Identify the task type: API migration, new integration, model routing, media generation, debugging, or documentation.

2. Keep credentials server-side. Use `ROUTERBASE_API_KEY` in examples and never invent or reveal a real key.

3. For OpenAI-compatible chat or embeddings integrations, preserve the user's existing SDK shape and change only what is necessary:
   - Set the base URL to `https://routerbase.com/v1`.
   - Set `apiKey` or `api_key` from `process.env.ROUTERBASE_API_KEY` or the equivalent server-side environment variable.
   - Replace the model with a RouterBase model ID that fits the workload.

4. For model routing, recommend a primary model and one or two fallback models. Explain the tradeoff for each recommendation in terms of quality, latency, cost, context length, tool calling, vision, JSON mode, or media modality.

5. For media generation, choose the correct endpoint family:
   - Images: `POST https://routerbase.com/v1/images/generations`
   - Video: `POST https://routerbase.com/v1/videos/generations`
   - Speech or audio: `POST https://routerbase.com/v1/audio/speech` or `POST https://routerbase.com/v1/audio/generations`

6. Treat image generation as a synchronous workflow unless current RouterBase docs say otherwise. Treat video and audio jobs as asynchronous workflows: persist the task ID, poll with backoff, and support callback URLs only when the application already has a durable webhook receiver.

7. If exact current model IDs, feature support, or prices matter, verify against RouterBase documentation or API before finalizing the answer. If you cannot verify, mark model IDs as examples and tell the user to check current availability.

8. End with a concise validation checklist that covers environment variables, server-side key handling, one smoke test, error handling, and logging hygiene.

## Examples

**Input:**
> Convert this OpenAI JavaScript snippet to RouterBase for a chat completion. Keep it safe for production.

**Output:**
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

Validation checklist:
- `ROUTERBASE_API_KEY` is set only on the server.
- The base URL is exactly `https://routerbase.com/v1`.
- The selected model ID is verified against current RouterBase availability.
- Logs do not include prompts, API keys, private media URLs, or full error payloads.

**Input:**
> I need image and short video generation through RouterBase. What architecture should I use?

**Output:**
- Use `POST /v1/images/generations` for synchronous image generation.
- Use `POST /v1/videos/generations` for asynchronous video generation.
- Store every video task ID with request metadata, status, result URLs, and error details.
- Poll with exponential backoff unless the app already has a webhook endpoint for callbacks.
- Persist generated files before provider-hosted URLs expire.

## What to avoid

- Do not put RouterBase API keys in browser code, mobile apps, client-side bundles, screenshots, logs, or public repositories.
- Do not claim a model ID, price, or feature is permanently available.
- Do not retry authentication errors, validation errors, policy errors, or invalid model IDs as if they were transient outages.
- Do not mix image, video, and audio endpoint assumptions; each modality can have different parameters and sync behavior.
- Do not hide uncertainty. If a live catalog check was not possible, say so and provide a verification step.
