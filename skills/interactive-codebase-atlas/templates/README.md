# Codebase Atlas — <REPOSITORY NAME>

An interactive map of the `<repository-name>` repository: what it does, how its parts talk to each other, how a real user action travels through the code, and where to start when you need to change something.

This atlas is **not part of the repository.** It lives beside it and is never committed, staged, or pushed. Nothing here changes the code it describes.

---

## Start it

```bash
node scripts/serve-atlas.mjs .
```

Then open <http://127.0.0.1:4173>.

Prefer the server: it saves progress to `progress/progress.json`. You can also open `index.html` directly — `data/atlas.bundle.js` exists so the atlas works over `file://`, with browser-only progress. Regenerate the bundle after any content or UI-copy change with `atlas:validate` below.

## Commands

| Command | What it does |
|---|---|
| `node scripts/serve-atlas.mjs .` | **atlas:start** — serve the atlas locally |
| `node scripts/validate-atlas.mjs .` | **atlas:validate** — check schema, ids, source references, secrets; regenerate the bundle |
| `node --test tests/atlas.data.test.mjs tests/progress.api.test.mjs` | Data invariants and disk-progress API tests — no dependencies |
| `node scripts/check-untracked.mjs <repo-path> .` | Prove the atlas is invisible to Git |
| `node scripts/screenshot-atlas.mjs .` | Capture the main views for visual review (needs Playwright) |
| `npx playwright test` | Run the interaction suite against an isolated throwaway progress file |

`atlas:create`, `atlas:update`, and `atlas:audit` are agent operations, not scripts — see below.

## Keep it current

The atlas records the exact commit it describes. When the repository moves ahead, a banner appears at the top saying how far behind it is.

To refresh it, ask an agent with the skill installed:

```text
Update the Codebase Atlas from its recorded commit to the current repository HEAD.
```

The update reads the Git log and diffs between the recorded commit and `HEAD`, rewrites only the affected sections, revalidates every source reference, and records the new commit. **Your reading progress is preserved** — sections keep permanent ids, so completion, bookmarks, and unclear flags survive. Substantially rewritten sections get an *Updated since you last viewed this* badge; they are never auto-marked complete.

Other things you can ask for:

```text
Audit whether the Codebase Atlas is still accurate and confirm none of its files are Git tracked.
```
```text
Explain the authentication flow using the Codebase Atlas, at balanced technical depth.
```

## Reading it

Two ordered routes, answering different questions. **The full tour (`#/tour`)** walks every section of the atlas in a sensible order — what the pieces are, how they talk, what they store, what they do end to end. **Reading order (`#/reading-order`)** is a dependency graph of the actual files: an arrow means *this file assumes you have read that one*, each node says what to look for and how to check you got it, and you mark them read on the graph itself. Nothing is ever locked; an unmet prerequisite is a hint. Those completions are counted separately from atlas sections, because "files read" and "sections understood" are different measures.

- **Depth** — Simple, Balanced, or Deep dive, switchable at any time from the top bar. Balanced is the default.
- **Focus mode** — press `f` (or use the button) to hide secondary navigation and optional detail. `Escape` exits.
- **Keyboard** — Tab reaches everything. Arrow keys move between architecture nodes and workflow steps.
- **Reduced motion** — with `prefers-reduced-motion: reduce`, path animations and transitions are off and Play advances in discrete steps.
- **Confidence badges** — every claim is labelled: `verified` (stated by a comment, test, doc, commit, or observable behaviour), `inferred` (a reasonable conclusion from the code), or `unknown` (the repository does not say). An `unknown` is honest, not a gap to be filled with a guess.

## Your progress

When served, progress lives in `progress/progress.json` and is mirrored in your browser's `localStorage` under `codebase-atlas:<repository-name>:v1`. Clearing browser data does not clear the file. When opened directly over `file://`, progress is browser-only. There is no account, database, analytics, remote server, or external request — nothing about your reading leaves this machine.

Tracked per section: state (not started / started / viewed / completed), bookmarks, unclear flags, and the last place you were. **Opening a section never marks it complete** — that is always your call.

From the *Your progress* panel you can filter to unfinished, bookmarked, unclear, or changed-since-last-view; reset progress; and export or import it as JSON. Export is useful for moving between browsers, and for pasting your state into a chat when asking an agent "which parts have I not explored yet?" — an agent cannot read your browser storage.

The first served visit can adopt browser-only progress when the disk file is empty. Two open tabs merge per item rather than erasing one another. Export/import remains useful for moving between machines.

## What is in here

```text
index.html               the shell
assets/atlas.css         presentation
assets/atlas.js          views and routing — no user-facing copy
assets/templates.js      DOM builders and data/ui.json lookups
assets/map.js            the architecture map
assets/icons.js          drawn icon set (16px grid, 1.5 stroke)
assets/progress.js       browser/disk progress client
data/atlas.json          ← all repository-derived content lives here
data/ui.json             ← all interface copy, field tables, navigation, theme overrides
data/atlas.schema.json   the shape of that file
data/atlas.bundle.js     GENERATED mirror of atlas.json, for file:// use
scripts/                 serve, validate, check-untracked, screenshot
progress/progress.json   reader progress when served
tests/                   data/progress invariants + Playwright interaction checks
screenshots/             captured views
```

**Generated vs. curated.** Everything in `data/atlas.json` is derived from the repository by the skill; `data/ui.json` is the curated interface layer and is never regenerated by an atlas update. Each atlas item carries `origin` (`generated`, `curated`, or `inferred`) and a `confidence` level. If you hand-edit a section, set its `origin` to `curated`. `data/atlas.bundle.js` mirrors both JSON files and is always generated — never edit it.

Presentation code in `assets/` knows nothing about this repository. Repository knowledge is in `data/atlas.json`; every interface label and field table is in `data/ui.json`.

## Git isolation

This directory must never appear in the repository's history. If it was placed inside the repository (rather than beside it), it is excluded through `.git/info/exclude` — never through the committed `.gitignore`. Verify at any time:

```bash
node scripts/check-untracked.mjs <repo-path> .
```

## Scope

<Replace with meta.scopeNote — what this version covers and what it deliberately does not.>
