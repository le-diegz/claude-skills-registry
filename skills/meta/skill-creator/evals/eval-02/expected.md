Edge case: a valid, well-scoped skill request, but "any English text" needs boundary clarification (technical docs vs casual text vs legal text require different translation approaches). The response should flag this and proceed once clarified.

**Required:**

1. **One scoping question is asked** — the response must ask what type of text this will be applied to (technical/developer content, general prose, formal/legal, UI strings, etc.) because translation register varies significantly. A response that generates files for "any text" without asking is too accepting of vague scope.

2. **When proceeding**, the generated `trigger` must exclude overlapping skills — for example, "Do not activate for translating code, for tasks where the user needs localization with cultural adaptation rather than direct translation, or for non-English source languages."

3. **`domain` is `content`** — not `meta`, not `code`.

4. **`SKILL.md` instructions address register** — even a general translation skill must instruct Claude on: preserving formatting (code blocks, markdown), handling untranslatable terms (proper nouns, brand names), and noting when a phrase has no direct French equivalent.

**Recommended:**

- The response notes that `claude-haiku-4-5` should only be added to `model_compatibility` if translation quality has been verified on that model.

**Automatic failure:**

- The response generates files for "any English text" without asking about text type
- `domain` is set to anything other than `content`
- `SKILL.md` instructions do not address how to handle untranslatable terms or formatting
