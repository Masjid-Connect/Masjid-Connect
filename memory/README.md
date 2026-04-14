# memory/ — Net-New Agent Memory

This directory holds content that the existing root docs explicitly do
**not** cover: tone of voice, agent tool policy, mosque-specific hard
rules beyond DOCTRINE, and a running log of mistakes and their corrections.

Nothing in `memory/` duplicates `/DOCTRINE.md`, `/COUNCIL.md`, or
`/CLAUDE.md`. If a rule lives in one of those three, it stays there and
`memory/` links to it.

## Where each thing lives — one source of truth

| Topic | Source of truth | Why |
|-------|-----------------|-----|
| Project mission, locked stack, dependency/API/data rules | `/DOCTRINE.md` | Governing doctrine |
| Council roster (30 seats), deliberation protocol, growth log | `/COUNCIL.md` | Supreme review body |
| Project spec, tech stack, design system, API reference, commands, code conventions | `/CLAUDE.md` | Operating manual |
| System architecture, data flow, infrastructure | `/ARCHITECTURE.md` | Canonical architecture doc |
| Tone of voice, Islamic honorifics policy, banned marketing phrases | `memory/VOICE.md` | Not codified elsewhere — Seat 28's remit |
| Mosque-specific hard rules (prayer-time computation, honorifics lint, deploy windows, GDPR Art 9, riba disclosure) | `memory/CONSTRAINTS.md` | Extends DOCTRINE with domain-specific rules |
| Agent tool-use policy (dedicated tools over Bash, parallelism, subagents) | `memory/TOOLS.md` | Runtime behaviour, not project spec |
| Record of mistakes the agent has made and how they were corrected | `memory/CORRECTIONS.md` | Agent memory across sessions |
| Charity / donation / Gift Aid business model | `projects/masjid-connect/BUSINESS.md` | Not currently in any root doc |
| Current launch phase | `projects/masjid-connect/STATUS.md` | One-liner, updated when phase shifts |
| Architectural decisions worth preserving | `projects/masjid-connect/decisions/` | ADR log — lightweight, one file per decision |
| Per-session scratch (research notes, sub-agent outputs) | `context/` (gitignored) | Not committed; survives session, not repo |

## Maintenance rules

1. **DOCTRINE wins.** If any file in `memory/` ever contradicts
   `/DOCTRINE.md`, DOCTRINE is right; update `memory/` to match.
2. **No duplication.** Do not copy rules from `/CLAUDE.md`, `/DOCTRINE.md`,
   or `/COUNCIL.md` into `memory/`. Link instead. Council Seat 1
   (Architect) blocks PRs that re-home existing rules.
3. **`CORRECTIONS.md` grows; never trim.** Past mistakes teach future
   sessions.
4. **Constraints are supersede-only.** New rules go in
   `CONSTRAINTS.md` with a date. Never delete — supersede with a newer
   dated entry if a rule changes.
5. **400-line cap per file.** Split if a file grows beyond that.
6. **Council deliberation required** before adding a new file here or
   rehoming content between `memory/` and the root docs.

---

*Introduced 2026-04-14 on branch `claude/review-migration-docs-cY9ne` after
council deliberation (Seat 1 Architect blocked a broader port; Seats 5,
13, 17, 19, 20, 22, 28 approved this reduced scope). See
`projects/masjid-connect/decisions/0001-council-expansion-18-to-30.md`
for the council expansion that preceded this change.*
