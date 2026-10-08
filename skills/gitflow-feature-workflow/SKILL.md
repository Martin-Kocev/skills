---
name: gitflow-feature-workflow
description: Use when making code or versioning changes in a git repository that uses Gitflow with main and dev branches (or legacy master/develop), including features, non-urgent bug fixes, production hotfixes, releases, or semver bumps. Pulls first, plans, branches before editing, works test-first, announces each branch on start and pushes on finish, merges with --no-ff after verification, and keeps an Obsidian-friendly LLM wiki of the project up to date.
---

# Gitflow Feature Workflow

Strict Gitflow for every repository change: protect `main`, integrate through `dev`, verify before merging, and leave the local repo and remote in a stated final state.

## Branch model

| Branch | Role | From | Merges into | Playbook |
|---|---|---|---|---|
| `main` | Production; every merge tagged | — | — | — |
| `dev` | Integration | — | — | — |
| `feature/<short-name>` | Feature or non-urgent fix | `dev` | `dev` | `references/feature.md` |
| `hotfix/<version>` | Urgent production fix | `main` | `main` and `dev` (or the open `release/*`) | `references/hotfix.md` |
| `release/<version>` | Release stabilization | `dev` | `main` and `dev` | `references/release.md` |

Read the selected playbook completely before branching. Feature names are short kebab-case (under 50 characters); hotfix and release names are the target version.

**Legacy branch names.** If the repo has `master`/`develop` instead of `main`/`dev`, ask once whether to keep them for this repo or rename them. Renaming moves the remote default branch and retargets open PRs, so never do it unasked. Record the answer under Project conventions in `AGENTS.md` and substitute the repo's names in every command. If no integration branch exists, ask before creating and pushing `dev`.

## Workflow

1. **Orient.** Pull first. Read `AGENTS.md` unless already loaded, then query the project wiki (below): `docs/wiki/index.md` first, then only the pages this task needs. Use recorded commands, pages, and gotchas instead of rediscovering them. If `AGENTS.md` or the wiki is missing or out of shape, offer to create it with one scan (`references/agents-md-template.md`, `references/wiki.md`).
2. **Plan** per `references/plan.md`: investigate, ask every open question in one round, name fitting skills, write `.gitflow/plan.md`, then continue straight into implementation.
3. **Branch and announce** per the playbook before touching any file.
4. **Build test-first** through the plan's steps, posting the playbook's steps as a checklist and ticking them off.
5. **Verify, document, sync, merge, push** per the playbook.
6. **Report** what landed, test and lint results, docs and wiki updates, CI state, and exactly what was pushed or left local.

Mark a step N/A only when an observable predicate proves it absent (no remote, no CI config, no formatter, no testable behavior), and say which.

## Project wiki

`docs/wiki/` is an LLM-maintained Obsidian vault in Karpathy's LLM Wiki pattern: `[[wikilinked]]` pages, a catalog (`index.md`), and an append-only `log.md`. The location can be overridden in `AGENTS.md`. Read `references/wiki.md` before writing to it.

- **Query** when orienting: `index.md`, the recent log, then only the relevant pages. When a page contradicts the code, the code wins; fix the page on the task branch.
- **Ingest** before merging every branch: update the pages for touched modules, add feature, decision, and gotcha pages that earned one, update `index.md`, and append a `log.md` entry. Commit as `docs(wiki): ...` on the same branch, so knowledge merges with the code it describes.
- **Lint** on every release branch or when asked: run `python <this skill>/scripts/wiki_lint.py docs/wiki`, fix what it reports, then read for contradictions it cannot see.

## Ask before you build

Ask whenever the answer changes the plan (what to look for: `references/plan.md`). When a better implementation exists, give the alternative, why, its cost, and your recommendation, then follow the user's decision. Batch questions; never re-confirm explicit requirements.

Ask only when it changes the result mid-workflow: Gitflow initialization or renaming, pre-existing uncommitted changes (stash, commit, or abort), destructive actions, conflicting edits where both sides look intentional, local merge versus pull request mode.

## Test-driven development

TDD is the default for every feature, fix, hotfix, and release fix.

- Write the failing test first, run it, and see it fail for the right reason. A test that never failed proves nothing.
- Work in small red → green → refactor cycles, covering edge cases and error paths, not only the happy path.
- Every feature gets tests. Every bug fix gets a regression test that fails without the fix.
- Commit each test with the code that makes it pass.
- Skip TDD only where no test can observe the change (formatting, docs, config without behavior); say which and why. A slow suite is not a reason.

## Commits and hygiene

- Small Conventional Commits (`feat:`, `fix:`, `docs:`, `chore:`). Do not add a co-authorship trailer or AI attribution.
- Before each commit, check `git status` and the staged diff for secrets, `.env` files, credentials, large binaries, build artifacts, and editor/OS junk; gitignore local-only files. If a secret is already committed, stop before pushing and tell the user to rotate it.
- Split unrelated changes into separate branches.

## Verification and docs

- Run the focused test, the full test suite, and configured lint/format checks with the commands in `AGENTS.md`. Run them bare and read the real exit code; piping through `tail`, `head`, or `grep` hides failures. Never merge red. Report pre-existing unrelated failures and ask how to proceed.
- Update `README.md` when public behavior, setup, commands, or architecture change.
- Update `AGENTS.md` when verified commands or conventions change. File maps, architecture, decisions, and gotchas go in the wiki.
- Add code changes to `CHANGELOG.md` under `## [Unreleased]` (format in `references/release.md`).

## Semver

Feature → minor · Hotfix / bug fix → patch · Breaking change → major. Read the current version from the latest tag on `main` (`git describe --tags --abbrev=0 main`) or the version file named in `AGENTS.md`. Call out breaking changes during planning.

## Team sync: announce on start, push on finish

- **Pull first.** Before planning or editing, `git fetch --prune` and `git pull --ff-only` the current branch; pull the base again before branching or merging.
- **Announce on start.** Right after branching, push an empty `chore: start <branch>` commit stating the plan's goal, scope, exclusions, and semver impact, so teammates know who is changing what (`references/feature.md`). In pull request mode, also open a draft PR.
- **Commit locally while building.** If the scope changes materially, push an empty `chore: update scope` commit saying how.
- **Push on finish.** After verification and the base sync, push the branch, then merge per the playbook. If a teammate's push blocks it, `git pull --no-rebase`, rerun the suite, push.
- **Pausing unfinished work:** report local-only commits and offer to push them.

## Merging, remotes, and CI

- Update a long-lived branch only with `git pull --ff-only`. If it refuses, the local branch has diverged: stop and report instead of merging or rebasing it.
- All merges into `dev` and `main` use `--no-ff`. Every merge into `main` gets an annotated semver tag `v<version>`.
- Use local merge mode by default. Switch to pull request mode when the user asks or a protected target branch rejects a push: push the branch, open its PR against the target (or mark the draft ready with `gh pr ready`), check CI, report the link, and stop for review. Never bypass protection.
- No remote configured: complete the workflow locally and say nothing was pushed.
- CI configured: check the pipeline after pushing. Never merge into `dev` or `main` while the pipeline is red. No CI: mark it N/A.
- A rejected push is not completion: resolve the divergence or switch to pull request mode.

## Guardrails

- Never commit directly to `main` or `dev`. Branch before touching any file. If changes landed on a long-lived branch, carry them to the right branch intact (`git switch -c <branch>` keeps uncommitted work) and verify `git status`.
- Never force-push shared branches. Never rebase `main` or `dev`.
- Destructive operations: confirm with the user first and say what will be lost.
- When a git command fails (merge conflict, rejected push), stop and resolve it deliberately. Resolve conflicts whose intent is obvious, show the resolution, and rerun the full suite; ask when both sides look intentional.

## Definition of done

- [ ] Pulled first; branch announced on start and pushed on finish
- [ ] Plan written, questions resolved
- [ ] Correct branch from the correct base, created before any edit
- [ ] Tests written first and seen failing; full suite and lint/format green
- [ ] `README.md`, `AGENTS.md`, `CHANGELOG.md` updated where their predicates apply
- [ ] Wiki ingested for this branch; `index.md` and `log.md` updated; lint clean on releases
- [ ] Small Conventional Commits; no secrets, junk, or AI trailers
- [ ] Synced with base before merging; correct targets; `--no-ff`; `main` merges tagged
- [ ] CI green when configured; pushes verified, or local/review-only state stated exactly
