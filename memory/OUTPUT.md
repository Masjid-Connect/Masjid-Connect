# Output Expectations

What Claude's deliverables should look like.

## Code

- Default to writing **no comments**. Only comment when the *why* is non-obvious (hidden constraint, subtle invariant, workaround for a specific bug).
- Never write multi-paragraph docstrings or multi-line comment blocks. One short line max.
- Don't reference the current task or fix inside code comments ("used by X", "added for Y flow", "fixes #123"). That belongs in the PR description.
- No backwards-compat shims, no feature-flag hacks, no placeholder stubs for hypothetical future requirements.

## Edits

- Prefer `Edit` over `Write` for existing files.
- Preserve existing style, indentation, and naming unless the task is to change it.
- No `// removed`, no renamed `_unused` vars — if it's dead, delete it.

## Text Responses

- Short. One or two sentences for acknowledgements; more only when the task requires it.
- End-of-turn: one sentence on what changed, one on what's next. No trailing essays.
- Markdown only where rendering helps (tables, code blocks). Don't use headers for chat-length replies.

## Docs

- Only write docs when explicitly asked.
- When asked, match the existing doc structure (`projects/mosque-connect/*.md` style — focused, short, scannable).

## To populate as patterns emerge

Record corrections to output format, length, or structure that the user has made.
