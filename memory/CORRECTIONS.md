# Corrections — Mistakes Made, Lessons Recorded

A running log of errors made by the AI assistant during sessions on
this repository, and the corrections that followed. Future sessions
read this file before starting substantive work.

**Format per entry:**

```
## YYYY-MM-DD — <short title>

**What happened:** <one or two sentences, factual>
**Why it was wrong:** <the underlying error>
**Correction:** <what was done instead>
**Lesson:** <what to do differently in future sessions>
**Commits:** <sha or "none">
```

**Rules:**

- Append-only. Never trim. Past mistakes are curriculum.
- Entries are short — under 10 lines each.
- Only record mistakes the agent *actually* made. Do not fabricate
  hypotheticals.
- Group the corrections chronologically (newest at the bottom).

---

## 2026-04-14 — Proposed porting Allowance-guard structure without checking target repo

**What happened:** In an early turn of the migration-docs review, the
agent drafted a "Phase 1–5 plan" to port the Allowance-guard `memory/`
+ `projects/` + `context/` structure into Masjid-Connect, complete
with a 12-seat council rebuild.

**Why it was wrong:** The agent had not yet read the target repo.
Masjid-Connect already has DOCTRINE.md + COUNCIL.md + a 460-line
CLAUDE.md — a working three-layer governance stack. A blind port
would have created two sources of truth for the same rules.

**Correction:** The agent walked the plan back in the next turn,
replaced it with a doc-triage proposal (archive fossil audits, keep
13 of 25 root markdowns), and on user direction executed a reduced
Allowance-guard-style port that adds only net-new content (VOICE,
CONSTRAINTS with mosque-specific rules, TOOLS, CORRECTIONS, ADR log,
BUSINESS, STATUS).

**Lesson:** Read the target repo before proposing any structural plan.
Structural advice that assumes a missing governance layer is worse
than useless when that layer already exists — it invites duplication.

**Commits:** `f6da401` (council 18→30), follow-up commit adding
`memory/` + `projects/masjid-connect/` + `context/`.
