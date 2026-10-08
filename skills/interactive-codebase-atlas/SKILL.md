---
name: interactive-codebase-atlas
description: Explicitly-invoked only. Create, update, audit, or explain an interactive, animated, ADHD-friendly browser-based "Codebase Atlas" that teaches how any repository works. Invoke only when the user explicitly names this skill or its slash command.
disable-model-invocation: true
---

# Interactive Codebase Atlas

Turn an unfamiliar repository into a trustworthy island archipelago: an explorable technical museum that builds a working mental model instead of listing files. Let the adventure metaphor support comprehension; never let it replace evidence.

## Activation

**Require explicit invocation.** Run this skill only when the user calls `/interactive-codebase-atlas`, names the skill, or points at an existing atlas directory and asks to update, audit, or explain it. Do not activate for a generic request to document, map, or explain code.

## Non-negotiable safety

**Never let the atlas enter the repository's Git history.** Default to the sibling directory `../<repo-name>-codebase-atlas/`. Never add, commit, push, or include atlas files in a PR. Never modify production source, schema, config, tests, or infrastructure to support the atlas. Read `references/safety.md` before writing the first file on every run; it outranks all visual and workflow guidance.

## Execution contract

1. Resolve mode and inputs by discovery.
2. Read `references/safety.md`; establish the output location and Git isolation.
3. Run `scripts/git-metadata.mjs` and record the exact repository state.
4. Read the selected mode playbook plus its linked references; follow them in order.
5. Validate with `references/validation.md`.
6. Report with `references/report.md`.

Mark a checklist item N/A only when repository evidence proves the capability absent. Never mark it N/A because it was inconvenient.

## Modes

| Mode | Trigger | Playbook |
|---|---|---|
| **create** | No atlas exists, or the user requests a new one | `references/create.md` |
| **update** | Atlas exists and `HEAD` moved past its recorded commit | `references/update.md` |
| **audit** | User asks whether the atlas is accurate, current, functional, or untracked | `references/audit.md` |
| **explain** | User asks a focused codebase question | `references/explain.md` |

Infer the mode: missing atlas → create; present atlas with a different `HEAD` → update; an accuracy request → audit; a focused question → explain. Explain mode answers and never rebuilds the atlas.

## Inputs

Discover these. Ask only when discovery genuinely fails and the answer changes the work.

| Input | Default |
|---|---|
| Repository path | Current working directory's Git root |
| Atlas output path | `../<repo-name>-codebase-atlas/` |
| Learning focus | Broad system understanding |
| Technical depth | `balanced`; always author `simple`, `balanced`, and `deep` |
| Priority workflows and islands | Choose from repository evidence |
| Branch, tag, detached state | Read from Git and record exactly |

## Product model

Represent the repository as a deterministic hierarchy:

```text
repository world → island/module → area/district → file/building
```

- Make each **island** a human-useful domain, service, application, package, architectural layer, or deployment unit—not an automatic raw folder.
- Use **modules/landmarks** for important bounded subsystems, **areas/districts** for responsibility-first clusters or folders, and **files/buildings** for selected load-bearing files.
- Render real relationships as filterable world-map routes. Keep direction, mechanism, runtime/static nature, confidence, and sources visible. Do not render every route by default.
- Keep the conceptual world and accessible list/tree as equivalent views of the same records. Every map action must have a keyboard- and screen-reader-operable list/tree action.
- Derive IDs and initial coordinates deterministically. Preserve both forever unless architecture changes meaningfully.

## Required experience

Provide repository-supported surfaces for **Overview, World Map, Reading Order, Recent Changes, Guided Tours, Search, Bookmarks, Quests, Glossary, and Settings**. Keep the deeper architecture, workflows, explorer, data, communication, auth, subsystems, delivery, and change-playbook content defined in `references/sections.md`.

**Reading Order** answers the question the rest of the atlas does not: *which files do I actually open, and in what order?* It is a directed acyclic graph of the load-bearing files, laid out so every node is explained by the ones before it — an edge means "this file assumes you have read that one". Each node carries what the file is, the one idea to look for in it, and how to check the reader got it. Nodes are marked read **on the graph itself**, never only in a detail panel. Prerequisites are hints, never locks. The guided tour is an ordered route through the *atlas*; this is an ordered route through the *code*. Author both when the repository supports them.

On every screen:

- Show one dominant suggested next action.
- Show current location, progress, resume point, exact indexed commit, and staleness when present.
- Keep default explanations to 2–4 short sentences; disclose detail progressively.
- Preserve three authored depth levels.
- Label architectural claims `verified`, `inferred`, or `unknown`, and attach repository sources.
- Keep quests optional, subtle, and non-punitive: no streaks, scores, timers, losses, rankings, or manipulative notifications.

Support calm, focus, exploration, catch-up, reduced-motion, and low-detail-map session modes. Preserve the last island, route/filter state, scroll position, active tour stop, reviewed changes, bookmarks, notes, and understanding declarations locally. Sound is off by default.

## Atlas technology

Default to a **zero-dependency static atlas**: hand-written HTML, plain non-module JS, CSS, and JSON data. Require no install or build step. Support both `file://` and a one-line local server.

Escalate to Vite + TypeScript only when the user asks or the atlas exceeds roughly 40 sections and needs component reuse. State that choice in the plan. Preserve the same schema, progress, safety, accessibility, update, and validation contracts.

Start from `templates/`, then copy `scripts/` into the generated atlas. Together they provide the working shell, data-driven UI copy layer, router, map, workflow simulator, browser/disk progress store, icon set, schema, tests, server, validator, and screenshot harness. Adapt them to the repository and the archipelago model; never ship example copy. Treat the seven images in `references/visual-direction/` as mood and layout direction, not pixel-matching requirements. Read `references/design.md` before implementing UI.

## Reference map

Load only what the mode needs.

| File | Read when |
|---|---|
| `references/safety.md` | **Always first** |
| `references/investigation.md` | create, update, audit |
| `references/create.md` | create |
| `references/update.md` | update |
| `references/audit.md` | audit |
| `references/explain.md` | explain |
| `references/schema.md` | Writing `data/atlas.json` |
| `references/sections.md` | create, update |
| `references/design.md` | Writing UI |
| `references/progress.md` | Touching progress, IDs, tours, quests, or change review |
| `references/validation.md` | Before reporting create, update, or audit |
| `references/report.md` | Final create, update, or audit message |

## Scripts

Run these dependency-free Node.js scripts from the atlas directory unless noted.

```bash
node scripts/git-metadata.mjs <repo-path>
node scripts/validate-atlas.mjs <atlas-path>
node scripts/check-untracked.mjs <repo-path> <atlas-path>
node scripts/serve-atlas.mjs <atlas-path> [port]
node scripts/screenshot-atlas.mjs <atlas-path>
```

`validate-atlas.mjs` also regenerates `data/atlas.bundle.js` for `file://`. Run it after every content change.

## Quality bar

- Explain why every important component, route, workflow step, and file exists.
- Trace selected workflows end to end from real code; never infer architecture from folder names.
- Keep code excerpts short and load-bearing.
- Trust implementation over conflicting docs, cite both, and surface the conflict.
- Prefer depth, correctness, spatial memory, and engagement over exhaustive coverage.
- Preserve stable IDs, coordinates, progress, and exact commit/staleness behavior through updates.
- Validate the map, list/tree parity, search, tours, bookmarks, quests, changes review, keyboard use, reduced motion, mobile behavior, `file://`, and Git isolation before claiming success.

## Example invocations

```text
Use $interactive-codebase-atlas to create an island-based atlas for this repository.
```

```text
Use $interactive-codebase-atlas to update the existing atlas from its recorded commit to current HEAD. Preserve progress, coordinates, and reviewed changes.
```

```text
Use $interactive-codebase-atlas to audit accuracy, interactions, accessibility, staleness, and Git isolation.
```

```text
Use $interactive-codebase-atlas to explain the authentication flow at balanced depth.
```
