# Validation checklist

Run before reporting on create, update, or audit. Every line is either done, or explicitly reported as skipped with the reason.

## Automated

```bash
node scripts/validate-atlas.mjs <atlas-path>          # schema, ids, refs, hashes, secrets, bundle
node scripts/check-untracked.mjs <repo-path> <atlas-path>   # Git isolation
node scripts/serve-atlas.mjs <atlas-path> 4173        # local server
node scripts/screenshot-atlas.mjs <atlas-path>        # Playwright captures, if available
```

`validate-atlas.mjs` must exit 0. It resolves sources from `repository.commit`, even when the working tree has moved on. A secret-scan hit or a missing source file at that commit blocks reporting success. Interaction and screenshot runs must use a throwaway progress file; never point them at an already-running atlas server unless the reader explicitly accepts that the suite resets its progress store.

## 1. Start it locally

Serve the atlas and open it. Confirm it also opens directly over `file://` (this is what `data/atlas.bundle.js` is for). Console must be free of errors.

## 2. Test every main learning path

Walk each offered path end to end. Every step resolves to real content. No path leads to an empty view. Paths that the repository does not support are not offered at all.

Also open Overview, World Map, Reading Order, Recent Changes, Guided Tours, Search, Bookmarks, Quests, Glossary, and Settings. Omit a repository-dependent destination only when evidence proves it unsupported. Confirm every screen has one dominant suggested next action.

## 3. Verify referenced source paths

Every `sources[].path` exists at the recorded commit. Named symbols still appear in their files. Spot-check 5–10 references **by opening the files yourself** — the script proves existence, not that the reference still means what the atlas says.

## 4. Verify the recorded Git commit

`repository.commit` matches the state actually analyzed. Branch, tag, and detached flags are right. The commit chip renders in the UI. If the repo has moved on, the staleness banner appears and states the correct commit count.

## 5. Confirm atlas files are not tracked by Git

`check-untracked.mjs` passes: atlas outside the repo, or excluded via `.git/info/exclude`, absent from `git status --porcelain`, absent from `git ls-files`. **Non-negotiable.**

## 6. Confirm `git status` is unaffected

Run `git status` in the repository and read it. It must look exactly as it did before this skill ran. No new untracked entries, no modified `.gitignore`.

## 7. Test progress persistence and representation parity

Mark a section complete, bookmark another, mark a third unclear, add a note, start a tour, select an island, set route filters, switch to list/tree, and mark one change group reviewed. Reload. All survive. Switch map ↔ list/tree and confirm the same stable item remains selected with identical progress, filters, relationships, and destinations. Reset clears only atlas state.

## 8. Test progress preservation after an update

The one that catches real bugs. With progress present, reload the updated atlas and confirm: completion, bookmarks, notes, unclear flags, last location, map/list state, filters, active tour stop, quest state, reviewed change groups, and unchanged island coordinates survived · changed items show the *Updated since you last viewed* badge · a changed workflow-step link opens that exact step and keeps the badge visible during its first revisit, clearing it only on a later visit · **no changed item was auto-marked complete or change group auto-reviewed**.

## 8b. Test the reading-order graph

Every node and every dependency edge is drawn. Mark a node read **from the graph** and confirm: its state changes, its dependents move from *later* to *ready*, the page's own meter moves, **the section meter in the rail does not**, and the completion survives a reload. Un-mark it and confirm it reopens — completion is never a lock, and neither is an unmet prerequisite. Switch to the stage list and confirm it holds the same nodes with the same controls, focusable in reading order. Check horizontal overflow at desktop *and* phone width: the canvas may scroll inside its own container, the document may not.

When seeding progress for these checks, clear **both** halves of the store — the served file and the browser mirror. An item-less server document makes the client adopt whatever `localStorage` holds and push it back, which is the intended recovery path and will silently resurrect the state a test just cleared.

## 9. Test keyboard navigation

Tab through the whole interface. Every control is reachable, focus is visible, and tab order is logical. Arrow keys move between islands, tree items, and workflow steps; Enter opens; `Escape` closes panels. Exercise pan/zoom/filter/reset without a mouse. Nothing is map-only or mouse-only.

## 10. Test desktop, tablet, and narrow layouts

1440px, 834px, 390px. No horizontal page scroll at any width. At 390px, confirm bottom navigation, search-first access, one island at a time, bottom-sheet detail, and list/tree as the safe default; a simplified map may remain optional. Touch targets ≥ 44px. Body text never shrinks below 16px.

## 11. Test reduced-motion behavior

Emulate `prefers-reduced-motion: reduce`. Path animations and transitions are gone. Play advances in discrete steps. Nothing becomes unusable or invisible because a transition was suppressed.

## 12. Run typecheck, lint, and atlas tests

For the static atlas: `node --check` on every JS file, `validate-atlas.mjs`, and the interaction tests in `tests/`. For an escalated Vite atlas: its own typecheck, lint, and test commands. Report failures; do not hide them.

## 13. Check for exposed secrets

The automated scan plus your own read of the auth, delivery, and configuration sections. No keys, tokens, connection strings, env values, real user data, or credential-bearing URLs. Variable names and purposes only.

## 14. Check stale, change-review, and layout stability

Force each state and look at it: up to date (no banner) · behind by N commits (banner with correct count) · dirty working tree (separate notice listing files) · changed sections (badges present, filter returns them) · conceptual change groups in recommended order · reviewed/unreviewed filtering · catch-up from `lastSeenAtlasCommit`. Confirm page load alone does not mark a group reviewed or advance the last-seen commit. Compare pre/post-update coordinates and confirm unchanged islands did not move.

## 15. Inspect the final visual result

Capture and **open** screenshots of: Overview · World Map with one selected route · island/module detail · area/folder detail · file/building detail · Reading Order with some nodes read and one selected · Guided Tour · Search/list-tree equivalent · Bookmarks/Quests progress · Recent Changes · focus mode · mobile list/tree and simplified map when present. Capture every view from isolated fresh progress so focus, scroll, completion, or route state from one screenshot cannot contaminate the next. Wait for entrance motion to settle and reject any screenshot whose primary content remains blurred or translucent.

**Look at each one.** Existence of a PNG is not evidence of quality. Judge:

- Is there a single clear focal point?
- Is there enough space, or does it feel cramped?
- Any wall of text, or any default explanation past ~4 sentences?
- Any dense table acting as the primary interface?
- Are architecture nodes visually distinguishable without colour?
- Do map and list/tree expose the same selected item, routes, status, and actions?
- Is one next action visually dominant on each screen?
- Are quests optional and free of scores, timers, streaks, losses, ranks, or pressure?
- Is contrast comfortable in both themes?
- Did any template placeholder text survive?
- Would *you* want to click the next section?

Fix what you find, re-capture, and look again. Reporting on unexamined screenshots is a failed validation.

## When Playwright is unavailable

Fall back to: `node --check` on all scripts, `validate-atlas.mjs`, manual reasoning over the markup, and a request that the user open the atlas. **Report exactly which visual checks were skipped and why.** Do not silently claim the visual bar was met.
