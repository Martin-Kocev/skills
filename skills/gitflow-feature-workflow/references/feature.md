# Feature and bugfix playbook

Features and non-urgent bug fixes branch from `dev` and merge back into `dev`. The rules (TDD, commits, verification, docs, wiki) are in `SKILL.md`; this file gives the order and the commands. Without a remote, skip every push and say so in the report.

## 1. Plan

Follow `references/plan.md`. On resume, re-read `.gitflow/plan.md` before branching.

## 2. Branch before changes

```bash
git status                  # dirty? ask: stash, commit, or abort
git fetch --prune
git switch dev
git pull --ff-only
git switch -c feature/<short-name>
git branch --show-current   # confirm before editing
```

### Announce the branch

Push an empty start commit so teammates see who is changing what before any code lands. Fill it from `.gitflow/plan.md`; keep each line to one sentence.

```bash
git commit --allow-empty -m "chore: start feature/<short-name>" \
  -m "Goal: <observable outcome from the plan>" \
  -m "Scope: <modules and files this branch will change>" \
  -m "Out of scope: <what it deliberately leaves alone>" \
  -m "Semver: minor"
git push -u origin feature/<short-name>
```

Pull request mode: also open a draft PR so the announcement shows in the PR list:

```bash
gh pr create --draft --base dev --title "feat: <short title>" --body "<the same Goal/Scope/Out of scope/Semver lines>"
```

Resuming a branch that already exists: `git fetch --prune`, `git switch feature/<short-name>`, `git pull --ff-only`, so you continue from what the team has pushed. It is already announced; do not add a second start commit.

## 3. Build test-first

Run the plan's TDD cycles. For each behavior: write the test, see it fail for the right reason, write the minimal code to pass, refactor with the suite green, and commit the test and code together (`feat: ...`, `fix: ...`). Keep these commits local until the branch is finished.

If the scope changes materially (a new module, a dropped requirement, a semver change), tell the team:

```bash
git commit --allow-empty -m "chore: update scope" -m "<what changed and why>"
git push
```

## 4. Verify, document, ingest

1. Run the focused test, then the full test suite, then lint/format checks.
2. Update `README.md`, `AGENTS.md`, and `CHANGELOG.md` where their predicates apply.
3. Ingest the branch into the wiki (`references/wiki.md`) and commit `docs(wiki): ...`.

## 5. Sync with dev

```bash
git fetch --prune
git switch dev
git pull --ff-only
git switch feature/<short-name>
git merge dev
```

If the merge brought changes or conflicts, rerun the full suite. Walk the definition of done in `SKILL.md`.

## 6. Finish

Push the branch first; this is the finish push that publishes the work. If it is rejected because a teammate pushed to the branch, `git pull --no-rebase`, rerun the full suite, and push again.

Local merge mode (default). Confirm each command succeeded before running the next:

```bash
git push origin feature/<short-name>
git switch dev
git merge --no-ff feature/<short-name>
git push origin dev
git branch -d feature/<short-name>
git push origin --delete feature/<short-name>
```

Pull request mode: push the branch, mark the draft PR ready with `gh pr ready` (or run `gh pr create --base dev` if none exists), verify CI, report the link, and stop without merging or deleting the branch.

## 7. Report

Per `SKILL.md`, plus the path of `.gitflow/plan.md` and whether it was kept or deleted.
