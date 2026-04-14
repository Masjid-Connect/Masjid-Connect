# Tools

Which tools to prefer, and which to avoid, in this repo.

## gstack

Use the `/browse` skill from gstack for all web browsing. **Never** use `mcp__claude-in-chrome__*` tools.

### Available gstack skills

`/office-hours`, `/plan-ceo-review`, `/plan-eng-review`, `/plan-design-review`, `/design-consultation`, `/review`, `/ship`, `/land-and-deploy`, `/canary`, `/benchmark`, `/browse`, `/qa`, `/qa-only`, `/design-review`, `/setup-browser-cookies`, `/setup-deploy`, `/retro`, `/investigate`, `/document-release`, `/codex`, `/cso`, `/autoplan`, `/careful`, `/freeze`, `/guard`, `/unfreeze`, `/gstack-upgrade`

## Built-in tools

- File search → `Glob` (not `find` / `ls`).
- Content search → `Grep` (not raw `grep` / `rg`).
- Read files → `Read` (not `cat` / `head` / `tail`).
- Edit files → `Edit` (not `sed` / `awk`).
- Create files → `Write` (not `echo >` / heredoc).

## Agents

- `Explore` — broad codebase exploration (>3 queries).
- `Plan` — implementation strategy for non-trivial tasks.
- `feature-dev:code-reviewer` — independent second opinion on changes.
- `feature-dev:code-explorer` — deep analysis of existing features.
- `feature-dev:code-architect` — architecture blueprints.

Prefer direct tools (`Read`, `Grep`, `Edit`) when the target is already known.

## To populate as patterns emerge

Add repo-specific tool preferences discovered through use.
