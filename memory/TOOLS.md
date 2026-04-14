# Tools — Agent Runtime Policy

How the AI assistant uses tools during sessions on this repository.
This is about agent behaviour, not about project dependencies.

**Scope:** Every session that runs on `/home/user/Masjid-Connect`
(or wherever this repo is checked out).

## 1. Dedicated tools over shell commands

CLAUDE.md already mandates this for the built-in Claude Code tools.
Codifying it here as a hard rule for this repo:

| Action | Use | Not |
|--------|-----|-----|
| Read a file | `Read` | `cat`, `head`, `tail`, `sed` |
| Edit a file | `Edit` | `sed`, `awk` |
| Create a file | `Write` | `cat <<EOF`, `echo >` |
| Find files by path | `Glob` | `find`, `ls` recursively |
| Search file contents | `Grep` | `grep`, `rg` |
| System commands only | `Bash` | — |

Deviating costs the user a worse review experience. Not negotiable.

## 2. Parallelism

When two or more tool calls are independent of each other, issue them
in a single response. Examples:

- Reading three files to understand a change: parallel.
- Running `git status` and `git diff` before a commit: parallel.
- Running `wc -l` and `git log` for a survey: parallel.

Sequential only when the second call depends on the first's output.

## 3. Subagent policy

The `Agent` tool is valuable for:

- **Open-ended codebase searches** where you're not confident the first
  grep will find what you need.
- **Protecting the main context** from large tool outputs (e.g. reading
  all 25 root markdown files).
- **Genuinely parallel investigation** (three reviews of different
  surfaces).

Do not use `Agent` for:

- Tasks the main session can do in two or three tool calls.
- Directed searches where `Grep` or `Glob` would be faster.
- Subjective judgement calls — the main agent must own those.

When using `Agent`, brief the subagent like a colleague who hasn't seen
the conversation: include paths, constraints, and the expected form of
the response.

## 4. Destructive operations require confirmation

Before any destructive or hard-to-reverse action on this repo, confirm
with the user unless already authorised in the current turn. Includes:

- `git reset --hard`, `git push --force`, `git rebase -i`.
- `rm -rf` of anything outside `node_modules/`, `.expo/`, or `dist/`.
- Deleting a branch.
- Dropping a database table (Django `migrate` forward is not destructive
  by default, but `sqlmigrate` reversals that drop columns are).
- Overwriting uncommitted changes via `checkout --`.
- Posting to external services (Slack, GitHub PRs, webhooks).

"Authorised in the current turn" means the user asked for that specific
action in their most recent message. Broader authorisation does not
carry across turns.

## 5. Branch and push discipline

- Develop on the branch named in the task setup. For this session:
  `claude/review-migration-docs-cY9ne`.
- Never create or push to a different branch without explicit permission.
- `git push -u origin <branch>` on the first push so tracking is set.
- Retry network-failed pushes up to four times with exponential backoff
  (2s, 4s, 8s, 16s). Do not retry on auth errors.
- Never `--force` to a shared or main branch. Warn if the user asks.

## 6. Commits

- New commits over `--amend`. Amending is destructive if the prior
  commit is pushed.
- Commit messages describe the **why** in one or two sentences after
  the subject line.
- Never stage files that may contain secrets (`.env`, `*.key`,
  credentials). Prefer naming files in `git add` over `git add -A`.
- Never bypass hooks (`--no-verify`) without explicit user request.

## 7. GitHub interaction

- Use `mcp__github__*` tools only. No `gh` CLI. No direct API calls.
- Scope is strictly `masjid-connect/masjid-connect` per the session
  setup. Any tool call targeting another repo is invalid.
- Do not open a pull request unless the user explicitly asks. The
  branch push is sufficient; the user opens the PR when ready.
- Be frugal with PR comments. Reply only when necessary.

## 8. Council-gated tool use

Per `/COUNCIL.md`, council deliberation precedes any change to:

- `/DOCTRINE.md`, `/COUNCIL.md`, `/CLAUDE.md`
- `memory/*` (this directory)
- `projects/masjid-connect/decisions/*` (ADRs)
- Migrations in `/backend/core/migrations/`
- Payment flows (`/backend/api/donation*`, `/web/donate.*`, `app/(tabs)/support.tsx`)
- Legal pages (`/web/privacy.html`, `/web/terms.html`)

"Deliberation" here means: identify relevant seats, render their
verdicts inline in the response, only proceed on APPROVED.

## 9. Sentry logging in error handling

Every `try/catch` added to TypeScript or Python code must either:

- Call `Sentry.captureException(err, { extra: { ... } })` with
  context, OR
- Contain a comment justifying the silent catch (e.g.
  `// expected: user cancelled Expo WebBrowser`).

Per CLAUDE.md "Error Handling" — this rule is reiterated here because
the agent will add catch blocks frequently and it is the single most
common regression.

---

*Codified 2026-04-14. Scope: this repository. Cross-project agent policy
is set in `~/.claude/CLAUDE.md` (user-level) if it exists.*
