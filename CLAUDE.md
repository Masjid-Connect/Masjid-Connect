# CLAUDE.md

Entry point. Everything else lives in focused files — do not load project details from here.

## Startup Routine

On every task:

1. **Check authority docs.**
   - `DOCTRINE.md` — non-negotiable rules. Breaches reject the change.
   - `COUNCIL.md` — review protocol. Every change passes council first.
2. **Load the relevant surface doc** from `projects/mosque-connect/` based on what's being touched:
   - `PROJECT.md` — purpose, scope, philosophy
   - `MOBILE.md` — Expo app, components, conventions, commands
   - `BACKEND.md` — Django REST, models, endpoints, ops
   - `WEBSITE.md` — Cloudflare Pages, donation flow, CSP
   - `DESIGN.md` — colours, typography, principles, admin UX
   - `BUSINESS.md` — donation model, Stripe, Gift Aid, trust positioning
   - `DECISIONS.md` — why things are the way they are
   - `STATUS.md` — current state, blockers, what's next
3. **Apply operating rules** from `memory/`:
   - `CORE.md` — cross-cutting rules
   - `VOICE.md` — how to sound
   - `PROCESS.md` — how to work through tasks
   - `OUTPUT.md` — what deliverables should look like
   - `TOOLS.md` — which tools to prefer/avoid
   - `CONSTRAINTS.md` — hard boundaries
   - `CORRECTIONS.md` — past mistakes to avoid

## Council Enforcement

Before making **any** change to this project — code, config, design, architecture, dependencies, or documentation — run a council deliberation:

1. Identify which council seats are relevant to the change.
2. Simulate each expert's review from their domain perspective, applying their specific mandate.
3. Output the deliberation in the format defined in `COUNCIL.md`.
4. **Only proceed if the verdict is APPROVED.** If any member blocks or raises concerns, address them first and re-deliberate.
5. If no existing council seat covers a domain needed for the review, **auto-add a new expert seat** to `COUNCIL.md` and include them in the deliberation.

The council is the top-level authority. No exceptions.

## Where Things Go

When adding new information, decide:

| It's about… | Goes in… |
|---|---|
| How I operate (rules, preferences, tools) | `memory/` |
| This project (architecture, decisions, state) | `projects/mosque-connect/` |
| Governance (non-negotiables, review protocol) | `DOCTRINE.md` or `COUNCIL.md` |
| Right now (ephemeral session notes) | `context/` |

**Do not** add project details to this file. Keep it a thin pointer.
