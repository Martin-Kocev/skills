# Plan playbook

Write the plan, then implement it in the same session. The plan must still stand on its own, because an interrupted task may be resumed in a fresh session with none of the planning conversation. Write for that reader: explicit paths, commands, and test names, and no "as discussed above".

## 1. Investigate

Read `AGENTS.md`, query the wiki (`docs/wiki/index.md`, then the relevant pages), inspect Git state, and read the files the change actually touches. Never plan from filenames alone: guessed signatures send the implementer into code that does not exist.

## 2. Ask everything now

Planning is the cheap moment to ask. Ask when the answer changes the plan: requirements with more than one reasonable reading, undefined edge cases and error behavior, scope boundaries, acceptance criteria and how the user wants the result verified, or a requested library, pattern, schema, or API shape you would not choose. Raise any better implementation (alternative, why, cost, recommendation), then record the user's decision.

Batch the questions into one round. Unanswered questions never survive into the plan as hedges: either the user answered, or the plan records an explicit assumption.

## 3. Suggest skills

List the skills in this session that fit the task, one line each on why (UI design for interfaces, document skills for file deliverables, review skills before merging). Suggest only skills that are actually present. Name the ones to use during implementation so they are invoked at the right step.

## 4. Write `.gitflow/plan.md`

Keep `.gitflow/` out of version control with the clone-local exclude file. Editing `.gitignore` here would leave an uncommitted change on the base branch before the task branch exists.

```bash
exclude="$(git rev-parse --git-path info/exclude)"
grep -qxF '.gitflow/' "$exclude" || printf '.gitflow/\n' >> "$exclude"
```

```markdown
# Plan: <short title>

Branch: feature/<short-name> (from dev)   Semver: minor
Status: PLANNED

## Goal
One paragraph: the observable outcome when this is done.

## Context
Files and functions involved, with paths. Relevant wiki pages as [[links]].
Verified commands from AGENTS.md: test, lint, format, run.

## Decisions
Choices made with the user, including rejected alternatives and why.

## Assumptions
Explicit assumptions the implementer must not silently change.

## Suggested skills
- <skill-name>: why it applies.

## Test plan (write these first)
1. `<test file>::<test name>`: behavior asserted, expected failure before the change.
2. ... edge cases and error paths, not only the happy path.

## Implementation steps (TDD order)
1. [ ] Red: add test 1, run `<command>`, confirm it fails for the right reason.
2. [ ] Green: minimal change in `<file>`.
3. [ ] Refactor with the suite green.
4. [ ] Commit: `feat: ...`
5. [ ] ... repeat per behavior.

## Verification
Exact commands (focused test, full suite, lint, format) and the expected result of each.

## Docs and wiki
README / AGENTS.md / CHANGELOG entries, or N/A with the reason.
Wiki pages to create or update at ingest.

## Out of scope
What this branch deliberately does not do.
```

## 5. Implement

Summarize the plan path, the branch, and the decisions resolved in one short message, then go straight on to implementation.

If the work is interrupted, a later session resumes it with:

```text
/gitflow-feature-workflow execute .gitflow/plan.md
```

## 6. Execute the plan

1. Pull first (`git fetch --prune`, `git pull --ff-only`), then read `.gitflow/plan.md`, `AGENTS.md`, and the wiki pages linked in Context before touching anything.
2. Follow the playbook for the branch type; create the branch before editing.
3. Execute the steps in order, test-first, ticking `[ ]` to `[x]` as each lands.
4. If the code contradicts the plan (a function does not exist, a test cannot be written as described, a step is already done), stop and report the mismatch instead of redesigning silently.
5. At ingest, file the plan's Decisions into the wiki. Set `Status: DONE` when the work merges, then delete `.gitflow/plan.md` or say it was kept.
