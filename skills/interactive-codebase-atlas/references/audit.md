# Audit mode

Check whether an atlas is accurate, current, visually functional, and still pointing at files that exist. Audit **reports**; it does not rewrite content. Small mechanical fixes (a moved file path, a stale timestamp) may be applied and listed. Anything substantive becomes a recommendation to run update mode.

## 1. Structural integrity

```bash
node scripts/validate-atlas.mjs <atlas-path> --no-write
```

Confirms: `data/atlas.json` parses, conforms to the schema, has unique and stable `id`s, every referenced item exists, `data/atlas.bundle.js` matches the JSON, and no secret-shaped strings are present.

## 2. Git currency

```bash
node scripts/git-metadata.mjs <repo-path>
git log --oneline <recorded-commit>..HEAD | wc -l
```

Report:

- Recorded commit vs current `HEAD`
- How many commits behind
- Whether the recorded commit still exists
- Whether the branch changed
- Whether the working tree is clean
- Whether the atlas's staleness banner actually renders in that state — check the UI, not just the data

## 3. Source-reference truth

For every `sources[].path`:

- Does the file exist at `HEAD`?
- If a `symbol` is named, does it still appear in that file?
- If `lines` are given, do they still fall inside the file and near the named symbol?

Line numbers drift constantly; treat a drifted line range as a warning, a missing file or symbol as an error. `validate-atlas.mjs` produces this list. Spot-check 5–10 references **by opening the files yourself** — the script proves existence, not that the reference still means what the atlas says it means.

## 4. Claim accuracy sampling

Pick the highest-value claims and re-verify them against the code:

- The architecture overview's central assertion
- Each workflow's first and last step, plus one middle step
- Each `verified` "why" — is its cited evidence still there?
- The auth enforcement points
- Anything marked `unknown` — has the repository since answered it?

Report every claim that no longer holds, with the file that disproves it. Also flag over-confidence: an `inferred` claim presented as fact, or a `verified` claim whose cited evidence has vanished.

## 5. Git isolation

```bash
node scripts/check-untracked.mjs <repo-path> <atlas-path>
```

Verifies the atlas is outside the repo, or (inside case) excluded via `.git/info/exclude`, absent from `git status --porcelain`, and absent from `git ls-files`. This check must pass. If it fails, say so first, before anything else in the report, and give the exact remedy.

## 6. Visual and interaction health

Serve the atlas and drive it:

```bash
node scripts/serve-atlas.mjs <atlas-path>
node scripts/screenshot-atlas.mjs <atlas-path>
```

Check:

- Start screen renders and every offered learning path leads somewhere real
- Reading order draws every node and edge, marks a node read from the graph, readies its dependents, moves its own meter and not the section meter, and survives a reload
- World map draws, islands are clickable, routes are filterable, only the selected route animates once, and unchanged coordinates remain stable
- The semantic list/tree exposes the same selection, relationships, filters, progress, and destinations as the map
- A workflow simulator steps forward, backward, plays, and pauses
- Depth selector switches all three levels; none is empty
- Focus mode hides what it should
- Search returns results
- Overview, Recent Changes, Tours, Search, Bookmarks, Quests, Glossary, and Settings resolve to real content
- Progress panel loads; completion, notes, bookmarks, active tour, and reviewed change groups persist across reload
- Keyboard navigation reaches every control; focus is visible
- Reduced motion is respected (`prefers-reduced-motion: reduce`)
- Narrow and tablet layouts do not overflow horizontally
- Mobile defaults safely to one-island/list-tree navigation and does not squeeze the desktop map
- Console has no errors

**Open the screenshots and look at them.** Assess hierarchy, spacing, contrast, and whether any view has degenerated into a wall of text or a dense table. Existence of a PNG is not evidence of quality.

## 7. Content-health review

Beyond correctness, judge whether the atlas still does its job:

- Any section that has grown into a wall of text
- Any default explanation longer than ~4 sentences
- Any code excerpt that has crept toward full-file length
- Empty or placeholder-shaped sections
- Template text that survived generation
- Sections with no `sources[]` at all
- Documentation conflicts that are now resolved (or newly created)

## 8. Report

Use `references/report.md` with `mode: audit`. Lead with a one-line verdict:

> **Current** — atlas matches `HEAD` (`a1b2c3d`), 41/41 source references valid, not Git tracked.

> **Stale** — repository is 14 commits ahead; 3 broken source references; auth section contradicts `src/auth/session.ts`. Run update mode.

> **Broken isolation** — atlas files appear in `git status`. Fix before anything else.

Then: findings by severity (errors, then warnings, then observations), mechanical fixes applied, and recommended next action.
