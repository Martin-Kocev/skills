# Create mode

Build a new atlas for a repository that has not been analyzed before.

## Step 1 — Establish ground state

```bash
node scripts/git-metadata.mjs <repo-path>
```

Captures branch/tag/detached state, commit hash and subject, timestamps, working-tree cleanliness, and the list of uncommitted files. Keep the output; it becomes `repository` in `data/atlas.json`.

If the working tree is dirty, decide now how to handle it and say so in the plan: the atlas documents committed `HEAD`, and uncommitted changes are called out separately (see `schema.md` → `dirtyFiles`). Never present uncommitted behavior as part of a stable repository version.

## Step 2 — Investigate

Follow `references/investigation.md`. Come out of it able to answer, from evidence:

- What does this system do, in one sentence a non-expert understands?
- What are its 5–12 major human-useful islands/modules, and why are those conceptual boundaries better than the raw top-level folders?
- How do those components talk to each other, and by which mechanism?
- Which 3–5 user-visible actions best explain the system when traced end to end?
- Where does data live, and what are the 4–8 entities that matter most?
- Which 1–3 subsystems would a newcomer find hardest?
- How does a change get from a developer's machine to production?
- Which areas and load-bearing files belong inside each island, and which relationships should become routes?

## Step 3 — Present a plan, then proceed

Post a concise plan. Not a document — a scannable list:

- Discovered applications, services, and proposed islands
- Major packages
- Important data stores
- Communication mechanisms found
- Representative workflows selected (and why those)
- Subsystems selected for deep dives
- Proposed atlas sections
- Technology (static by default) and directory path
- How the atlas will be started
- Current Git commit (short hash + subject)
- Areas that remain uncertain
- Scope of version 1
- Deterministic grouping/layout rule and responsive list/tree fallback

Then **proceed without waiting**, unless there is a genuine blocker: the repository is not a Git repository, the parent directory is unwritable, the repo is empty, or the user's stated focus does not exist in the code. A genuine blocker is a fact that makes the work impossible or wrong — not a preference you would like confirmed.

## Step 4 — Scope version 1

Prioritize depth, correctness, and engagement over coverage. For a large repository, v1 normally contains:

- One strong architecture overview
- 3–5 representative workflows, traced fully
- The most important domain entities (4–8)
- 1–3 difficult subsystems
- Authentication and authorization, when present
- Testing and development workflow
- A glossary of project-specific terms
- Progress tracking
- Git update metadata
- Island/module → area → file navigation, with map/list parity
- Recent-change review, search, bookmarks, settings, and optional non-punitive quests

**Do not attempt to explain every file.** A v1 that explains six things excellently beats one that mentions sixty. Record deliberate omissions as "recommended next additions" in the final report.

Scale down honestly for small repositories: a 400-line CLI gets one workflow, three components, and no queue section. Empty sections are worse than absent ones — omit a section entirely rather than shipping it with "N/A".

## Step 5 — Author the data before the UI

Write `data/atlas.json` first, conforming to `references/schema.md`. Content and presentation stay separate: the UI renders whatever the data says, and the data carries every source reference and confidence level.

Author in this order — each layer gives the next its vocabulary:

1. `meta` — the one-sentence pitch and the hook that opens the atlas
2. `components` + `connections` — evidence-backed islands and routes, with deterministic stable coordinates
3. `workflows` — the traced stories (the highest-value content; spend the most time here)
4. `entities` — the data model
5. `channels` — communication mechanisms, success and failure
6. `auth` — when present
7. `subsystems` — deep dives
8. `delivery` — testing, CI, release
9. `changePlaybooks` — "where should I change this?"
10. `glossary` — terms the repository actually uses
11. `knowledgeChecks` — optional, low-pressure
12. `explorer` — island/module → area → file hierarchy over the real tree
13. `readingOrder` — the DAG of files to read in order; author it after `explorer`, since its nodes
    link into the files you have already selected as load-bearing
14. `learningPaths` — include conceptual `what-changed` paths with stable review IDs
15. Quest presentation — assemble optional, non-punitive goals from existing learning-path and knowledge-check IDs; author no duplicate collection

Every item needs: stable `id`, `confidence`, `sources[]`, and the three depth levels. See `references/schema.md`.

## Step 6 — Build the UI

Copy `templates/` into the atlas directory, copy the skill's `scripts/` directory beside it, then adapt the result. Do not omit `data/ui.json`, `assets/templates.js`, or the progress API tests: they are part of the working template, not optional examples. Read `references/design.md` and inspect its seven `references/visual-direction/` images before implementing the island world. Treat the images as mood and layout direction, not pixel specifications. Follow `references/progress.md` for the progress model.

Adapt, don't ship the template raw: the palette, island hierarchy, section hooks, deterministic map layout, routes, responsive list/tree, and copy must reflect this repository. A reader must never see template placeholder text.

Borrow the repository's visual identity when it is easy and appropriate (a brand hue, a logo mark, a font already vendored in the repo) — but keep the atlas visibly distinct from the production application. It is a companion, not a clone.

## Step 7 — Write the atlas README

From `templates/README.md`. Must contain: what this is, how to start it, how to update it, how to audit it, where progress is stored, what is generated vs. curated, and the standing update command:

```text
Update the Codebase Atlas from its recorded commit to the current repository HEAD.
```

## Step 8 — Validate and verify

```bash
node scripts/validate-atlas.mjs <atlas-path>
node scripts/check-untracked.mjs <repo-path> <atlas-path>
```

Then work through `references/validation.md` in full, including screenshots, map/list parity, Recent Changes review, one dominant next action, mobile behavior, and visual inspection.

## Step 9 — Report

Use `references/report.md`. Keep it concise. Do not paste generated files or successful logs.
