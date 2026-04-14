# Architectural Decision Records — Masjid Connect

Lightweight ADRs for decisions worth preserving: why something is the
way it is, what alternatives were considered, what would trigger a
revisit.

## When to write an ADR

- The decision affects the shape of the system (new dependency,
  new module, new pattern).
- The decision is non-obvious to a future reader (including your
  own future self or a new council member).
- Reversing the decision would cost more than one commit.

Routine implementation choices do not need an ADR. Council
deliberation that approves a small change does not need an ADR —
the commit message is enough.

## Format

One file per decision, named `NNNN-short-slug.md` (4-digit zero-padded,
never reused). Use this template:

```markdown
# ADR NNNN — <Title>

**Status:** Proposed | Accepted | Superseded by ADR NNNN | Deprecated
**Date:** YYYY-MM-DD
**Deciders:** <council seats>

## Context
<What is the situation? What forces are at play?>

## Decision
<What did we decide?>

## Consequences
<What becomes easier? What becomes harder? What do we accept?>

## Alternatives considered
<What else did we look at? Why did we not pick those?>

## Revisit triggers
<What would make us reopen this decision?>
```

## Index

| # | Title | Status | Date |
|---|-------|--------|------|
| [0001](./0001-council-expansion-18-to-30.md) | Council expansion from 18 to 30 seats | Accepted | 2026-04-14 |

## Maintenance

- Never edit a past ADR's Context/Decision. Instead, supersede it
  with a new ADR that references the old one.
- Status can change from Proposed → Accepted → Superseded, with a
  pointer to the successor.
- Keep each ADR under 200 lines.
