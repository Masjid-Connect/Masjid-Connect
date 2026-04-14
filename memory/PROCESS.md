# Process

How Claude should work through tasks in this repo.

## Before Any Change

1. **Council deliberation** — see `COUNCIL.md`. Relevant seats weigh in; verdict must be APPROVED.
2. **Read the relevant doc** — `projects/mosque-connect/<domain>.md` for the surface you're touching.
3. **Confirm scope** — for non-trivial or destructive changes, confirm with the user before editing.

## During Work

- Edit existing files; don't create new ones without reason.
- One focused change at a time. No drive-by refactors, no "while I'm here" cleanup.
- Surface trade-offs as they appear — don't silently resolve them.

## After Work

- Verify the change (typecheck, test, or run the feature if UI).
- Short summary of what changed and what's next. One or two sentences.
- **Commit after each logical unit of work.** User preference (recorded 2026-04-14): commits should be regular — do not let many unrelated changes pile up uncommitted. A coherent feature/fix/refactor = one commit. Don't wait for a big "end of session" commit; checkpoint as you go.
- Commit messages follow the project's existing style (see `git log --oneline -10`): type prefix (`feat:` / `fix:` / `chore:` / `docs:` / `refactor:`), short imperative summary, optional body. Co-author trailer stays.

## Destructive Actions

Always confirm before:
- Deleting files, branches, or database rows.
- Force-pushing or resetting.
- Running `rm -rf`, `git clean -f`, `git reset --hard`, or `--no-verify`.
- Modifying CI/CD pipelines.
- Posting to external services (Slack, email, gists, pastebins).
- Anything visible to others.

## To populate as patterns emerge

Document specific process preferences the user has endorsed or corrected.
