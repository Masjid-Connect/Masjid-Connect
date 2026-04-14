# Core Operating Rules

Cross-cutting rules that apply to **all** work in this repo, regardless of which surface (mobile, backend, website, design) you're touching.

## Authority Chain

1. **`DOCTRINE.md`** — non-negotiable rules. If a change conflicts, the change is rejected.
2. **`COUNCIL.md`** — review protocol. Every change goes through council deliberation before implementation.
3. **`CLAUDE.md`** — entry point. Tells Claude how to start and where everything lives.
4. **`projects/<name>/`** — project-specific knowledge (architecture, conventions, decisions).
5. **`memory/`** (this folder) — Claude's operating preferences for this repo.
6. **`context/`** — ephemeral notes for the current session/task.

## Always

- Run council deliberation before any change. The protocol is in `COUNCIL.md`.
- Comply with `DOCTRINE.md`. If you're proposing something that breaches it, raise it explicitly — don't quietly ship.
- Read the relevant `projects/mosque-connect/*.md` file for the surface you're touching before suggesting changes. Don't assume from memory.

## Never

- Don't add features, dependencies, abstractions, or scope beyond what was asked.
- Don't bypass the council to "save time".
- Don't introduce competing frameworks (no Flutter, Next.js, Firebase, Redis, Celery, microservices — see `DOCTRINE.md`).
- Don't write docs unless asked.
