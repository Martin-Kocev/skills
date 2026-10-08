# Project wiki (LLM Wiki pattern)

Karpathy's LLM Wiki applied to a code repo. The code is the raw source layer, `docs/wiki/` is the LLM-maintained wiki, and this file is the schema. The wiki compounds: each branch leaves the next task a better map instead of a rediscovery job.

## Layout

```text
docs/wiki/
  index.md        catalog: every page, one line each, by category (read first)
  log.md          append-only history, one entry per operation
  overview.md     how the modules fit together, with a mermaid diagram
  modules/        one page per component or key directory
  features/       one page per user-visible capability
  decisions/      one page per non-obvious choice (why it is this way)
  gotchas/        one page per trap that actually bit someone
```

Filenames are kebab-case and unique across the whole wiki, because Obsidian resolves `[[name]]` by filename. Link with `[[name]]` or `[[name|label]]`. Every link becomes a graph edge, so link where a reader would want to jump, not everywhere a word appears.

## Page format

```markdown
---
title: Tokenizer core
type: module            # overview | module | feature | decision | gotcha
tags: [module]          # same as type; drives Obsidian graph color groups
sources: [src/tokenizer/core.py, tests/test_core.py]
updated: 2026-09-28
---

# Tokenizer core

Orchestrates [[normalize]] then [[segment]]; public entry is `tokenize()`.

## Key files
| Path | Role |
|---|---|
| `src/tokenizer/core.py` | `tokenize()`, pipeline wiring |

## Depends on / used by
- Depends on [[normalize]], [[segment]]. Used by [[cli]].

## Gotchas
- [[gotcha-nfc-before-split]]
```

- `sources` lists repo-relative paths (files or directories) the page describes. The lint script flags paths that no longer exist, which is how stale pages surface.
- Body per type: **module**: purpose, key files, interface, dependencies, tests. **feature**: behavior, entry points, modules involved, tests, version added. **decision**: context, decision, alternatives rejected, date, branch. **gotcha**: symptom, cause, correct approach, date. **overview**: architecture in a few paragraphs plus a `mermaid` graph of modules.
- Keep pages short and factual. Write for the next agent: facts, paths, names; no narrative.

## index.md

```markdown
# <Project> wiki

Start here. Read only the pages the task needs.

## Overview
- [[overview]]: how the pieces fit
## Modules
- [[tokenizer-core]]: pipeline entry, `tokenize()` (`src/tokenizer/core.py`)
## Features
## Decisions
## Gotchas
```

Every page appears exactly once, with a one-line summary precise enough to decide whether to open it.

## log.md

Newest entry at the bottom, never edited afterwards. The fixed heading lets `grep "^## \[" docs/wiki/log.md | tail -10` show recent history.

```markdown
## [2026-09-28] feature | feature/csv-export
- Created [[csv-export]], [[decision-streaming-writer]]
- Updated [[reports]], [[index]]
```

Operations: `bootstrap`, `feature`, `fix`, `hotfix`, `release`, `lint`, `query`.

## Operations

**Bootstrap** (once, with the user's OK): scan the repo, write `overview.md`, a module page per key component, and `index.md`, and move any file map, architecture notes, and gotchas from `AGENTS.md` into pages, leaving a pointer. Log it as `bootstrap`. Summarize generated, vendored, and repetitive directories in one line instead of paging them.

**Query** (every task, while orienting): read `index.md` and the recent log, open the relevant pages, and follow links one hop at a time. Answers worth keeping (an explored subsystem, a traced bug) get filed as pages during the next ingest.

**Ingest** (before each merge, on the task branch):
1. Update the page of every module the branch touched: `sources`, interface, dependencies, `updated`.
2. Add or update the feature page for user-visible behavior.
3. File each decision from `.gitflow/plan.md` that a future reader would question as a decision page.
4. Add a gotcha page only for a trap that actually happened, and link it from the affected modules. Sharpen an existing page rather than duplicate it; delete pages that no longer apply.
5. Update `overview.md` when the architecture changed, then `index.md`, then append to `log.md`.
6. Commit `docs(wiki): <summary>`.

**Lint** (every release branch, or on request):

```bash
python <skill-dir>/scripts/wiki_lint.py docs/wiki
```

It exits 1 on broken links, missing or invalid frontmatter, pages missing from the index, index links to missing pages, duplicate names, and `sources` paths that no longer exist. It warns on orphans (pages nothing but the index links to). Fix the errors, review the warnings, then read for contradictions between pages and claims the code no longer supports. Log it as `lint`.

## Obsidian

- Open `docs/wiki/` as a vault. Gitignore `docs/wiki/.obsidian/` unless the user wants shared vault settings.
- Graph view shows structure. Color groups by `tag:#module`, `tag:#feature`, `tag:#decision`, `tag:#gotcha` make hotspots visible, e.g. a module with many gotchas.
- Frontmatter is Dataview-ready. For example, `TABLE updated, sources FROM "modules" SORT updated ASC` lists the stalest module pages first.
- Mermaid blocks in `overview.md` render natively.
