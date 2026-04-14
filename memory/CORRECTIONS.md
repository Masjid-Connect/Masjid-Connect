# Corrections

Running log of corrections the user has made and the patterns to avoid in future.

Format: date → what was wrong → what to do instead → why.

---

## 2026-04-14 — Monolithic CLAUDE.md

- **What was wrong**: CLAUDE.md had grown to ~25KB containing operating rules, governance, product definition, tech stack, backend spec, mobile spec, website spec, design system, dev workflows, and admin UX philosophy — all in one file.
- **What to do instead**: Split by domain. Operating rules go in `memory/`. Project knowledge goes in `projects/<name>/`. Governance stays in `DOCTRINE.md` / `COUNCIL.md`. `CLAUDE.md` is a thin entry point.
- **Why**: a 2,000-line markdown file becomes ceremonial rather than useful. Updates become risky instead of surgical. Contradictions creep in. Claude re-reads irrelevant sections every time.

---

## 2026-04-14 — Over-engineering simple changes

- **What was wrong**: Previous donation simplification carried more surface than needed.
- **What to do instead**: When the user says "just do X for now" — do exactly X. Don't keep adjacent machinery around "in case we need it". Don't refactor the surrounding area. Don't add forward-compat hooks.
- **Why**: over-engineering under the guise of thoroughness creates maintenance burden and obscures intent.

---

## To append

When the user corrects you, write the correction here so it doesn't need to be made twice.
