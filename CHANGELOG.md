# Changelog

All notable changes to this project are documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.1.0/), and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [Unreleased]

## [1.2.0] - 2026-10-08

### Added

- `interactive-codebase-atlas`: Reading Order view, a DAG of load-bearing files in the order to read them, with per-node "what it is / what to look for / how to check" and on-graph read marking.
- `gitflow-feature-workflow`: plan playbook (`.gitflow/plan.md`) that resumes across sessions, and an Obsidian-friendly LLM project wiki in `docs/wiki/` with a `wiki_lint.py` linter.
- `orchestrator`: cross-provider workers (Codex from Claude Code, Claude from Codex), user-chosen subagent model and concurrency cap, and model-tier guidance.
- `gitflow-feature-workflow`: every feature, hotfix, and release branch is announced on creation with a pushed empty `chore: start <branch>` commit stating goal, scope, exclusions, and semver impact; pull request mode also opens a draft PR.

### Changed

- Made `orchestrator` and `interactive-codebase-atlas` explicit-invocation-only in both Claude Code (`disable-model-invocation: true`) and Codex (`allow_implicit_invocation: false`) so task complexity, delegation requests, or available subagents never activate them automatically.
- `gitflow-feature-workflow`: commits stay local while a branch is built and are pushed when it finishes, instead of after every commit; a material scope change is announced with an empty `chore: update scope` commit.
- `gitflow-feature-workflow`: the plan file is excluded through `.git/info/exclude` instead of `.gitignore`, so planning no longer leaves an uncommitted change on the base branch.
- `orchestrator`: model tiers are described generically, with current model names as examples.
- `orchestrator`: the orchestrator now takes over simple fixes and slices rejected twice instead of always re-dispatching.
- `gitflow-feature-workflow`: switched the default branch names to `main`/`dev`, with a one-time question for repositories still on `master`/`develop`.
- Repository validation accepts the optional `disable-model-invocation` frontmatter field and requires it for explicit-invocation-only skills.

### Fixed

- Removed a duplicated block of four atlas template tests that ran twice.

## [1.1.0] - 2026-08-05

### Added

- Added `orchestrator` as a separately installable skill with Codex UI metadata.

### Changed

- Repositioned the public repository as `Martin-Kocev/skills` and added a separate catalog entry and install command for every skill.
- Made repository validation discover skill directories and require each discovered package to appear in the public README.

## [1.0.1] - 2026-08-04

### Fixed

- Replaced pre-publication owner placeholders with the canonical GitHub source and skills.sh badge.

## [1.0.0] - 2026-08-04

### Added

- Public multi-skill repository packaging for `interactive-codebase-atlas` and `gitflow-feature-workflow`.
- Dependency-free repository, atlas-template, and progress-store validation.
- GitHub Actions validation for public contributions.
- skills.sh-compatible installation and publication documentation.
