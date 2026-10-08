# Agent Skills

## Project overview

This repository distributes three self-contained Agent Skills. `interactive-codebase-atlas` creates evidence-backed, browser-based explanations of unfamiliar repositories while keeping every generated atlas outside the analyzed repository's Git history. `gitflow-feature-workflow` supplies `main`/`dev` branching and release discipline, plan-first TDD, and an Obsidian-friendly project wiki. `orchestrator` coordinates separable work across Claude and Codex subagents and independently verifies their integrated output.

Consumers install individual skills or select from the full collection through the open `skills` CLI. The public source of truth is the content under `skills/`; repository-level files document, validate, and release those packages.

## Tech stack

- Markdown and YAML skill definitions
- Dependency-free Node.js ESM scripts and tests
- Static HTML, CSS, JavaScript, and JSON atlas templates
- Single long-lived `master` branch with short-lived topic branches

## Common commands

| Task | Command | Notes |
|---|---|---|
| Run full validation | `npm test` | Run from the repository root; no install step |
| Validate repository packages | `node scripts/validate-repository.mjs` | Checks metadata and bundled resource references |
| Validate atlas template | `node skills/interactive-codebase-atlas/scripts/validate-atlas.mjs skills/interactive-codebase-atlas/templates --no-write` | Structural validation without regenerating the bundle |
| Run atlas template tests | `node --test skills/interactive-codebase-atlas/templates/tests/atlas.data.test.mjs skills/interactive-codebase-atlas/templates/tests/progress.api.test.mjs` | Dependency-free tests |
| List locally discoverable skills | `npx skills add . --list` | Uses the external skills CLI; may need network access on first run |

## Project conventions

- `master` is the only long-lived branch; this repository does not use Gitflow. Do not create a `develop` branch here, and do not apply the bundled `gitflow-feature-workflow` skill to this repository — it is a distributed product, not this project's own process.
- Work directly on `master`, or use a short-lived topic branch merged back into `master` when a change needs review.
- Keep `npm test` green before every push to `master`.
- Keep each skill self-contained under `skills/<skill-name>/`.
- Keep `SKILL.md` frontmatter limited to `name`, `description`, and optionally `disable-model-invocation: true` for explicit-invocation-only skills (pair it with `policy.allow_implicit_invocation: false` in `agents/openai.yaml`).
- `~/.agents/skills/<name>` for each of these skills is a directory junction to `skills/<name>` here, so editing the installed skill edits this repository. Run `npm test` before committing. Recreate a junction with `New-Item -ItemType Junction -Path ~/.agents/skills/<name> -Target "C:/FINKI/Custom Skills/skills/skills/<name>"`.
- Update root documentation for public installation or layout changes.
- Generated codebase atlases are never stored in this repository as examples or fixtures.
- Do not add dependencies unless dependency-free validation can no longer cover a demonstrated requirement.

## Architecture notes

The root repository is a distribution shell. The skills CLI recursively discovers each `SKILL.md` entrypoint. Entry points progressively disclose their own `references/`, deterministic work lives in `scripts/`, and reusable atlas output files live in `templates/`.

The repository validator discovers every directory under `skills/`, checks package identity and every local resource path mentioned by each entrypoint, and rejects undocumented packages. The atlas's own validator and Node tests then exercise the reusable static template independently.

## File reference

| Path | Purpose | Key exports / dependencies |
|---|---|---|
| `skills/interactive-codebase-atlas/SKILL.md` | Atlas activation and execution contract | References atlas playbooks, scripts, and templates |
| `skills/interactive-codebase-atlas/references/safety.md` | Non-negotiable Git isolation and secret-handling rules | Must be read before creating an atlas |
| `skills/interactive-codebase-atlas/scripts/validate-atlas.mjs` | Validates generated atlas structure and content | Node.js standard library |
| `skills/interactive-codebase-atlas/templates/` | Zero-dependency static atlas starting point | HTML, CSS, JS, JSON, tests |
| `skills/gitflow-feature-workflow/SKILL.md` | Gitflow routing and definition of done | References plan, feature, release, hotfix, and wiki playbooks |
| `skills/gitflow-feature-workflow/scripts/check_skill.ps1` | Self-check of the Gitflow skill's structure and word budget | PowerShell 7 |
| `skills/gitflow-feature-workflow/scripts/wiki_lint.py` | Lints a project's `docs/wiki/` vault | Python standard library |
| `skills/orchestrator/SKILL.md` | Multi-agent decomposition, dispatch, and independent verification | Uses subagent coordination tools supplied by the active harness |
| `skills/orchestrator/references/cross-provider.md` | Running Codex workers from Claude Code and Claude workers from Codex | `codex` and `claude` CLIs |
| `scripts/validate-repository.mjs` | Repository-wide skill package validation | Node.js standard library |
| `.github/workflows/validate.yml` | Public CI validation | Runs `npm test` on Node.js 20 |

## Gotchas and lessons learned

- **2026-08-04** — The skill-creator metadata generator requires PyYAML. Preserve already-valid `agents/openai.yaml` when that dependency is unavailable, and use the dependency-free repository validator for CI.
- **2026-08-04** — The atlas safety rules apply to generated atlas output. The distributable skill package itself belongs in this repository; generated atlases never do.
