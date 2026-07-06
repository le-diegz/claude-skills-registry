# Evaluation Rubric

Assess the answer against these criteria:

- Correctly identifies RouterBase as an OpenAI-compatible gateway.
- Uses `https://routerbase.com/v1` for SDK base URL examples.
- Keeps `ROUTERBASE_API_KEY` server-side and avoids real or invented secrets.
- Separates chat/model-routing guidance from image, video, and audio media workflows.
- Treats current model IDs, prices, and feature availability as values that should be verified.
- Provides concrete validation steps before production use.
