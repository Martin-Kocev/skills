# Progress tracking

The reader must always know what they have explored, what they left unfinished, and what changed since they last looked. This is a core feature, not an add-on.

## Storage

When served with `scripts/serve-atlas.mjs`, persist to
`progress/progress.json` through the local-only `/api/progress` endpoint and
mirror the same document in `localStorage`. When opened over `file://` or from a
static server without that endpoint, use `localStorage` alone under a
repository-scoped key:

```text
codebase-atlas:<repo-name>:v1
```

No account, database, analytics, remote server, or external request. The local
server binds to `127.0.0.1`; progress never leaves the machine. Use per-item
`updatedAt` timestamps and newest-wins merging so two tabs cannot erase one
another. A reset uses replace semantics. Screenshot and interaction runs must
redirect the progress file to a throwaway path and must never attach to a live
reader store.

Shape:

```jsonc
{
  "storeVersion": 1,
  "atlasSchemaVersion": "1.0",
  "lastVisitAt": "2026-07-31T09:20:11+02:00",
  "lastSeenAtlasCommit": "a1b2c3d",
  "lastLocation": { "itemId": "component-api", "sectionId": "workflow-place-reservation",
                    "stepId": "step-…-3", "scrollY": 420 },
  "depthPreference": "balanced",
  "focusMode": false,
  "sessionMode": "calm",             // calm | focus | exploration | catch-up
  "reducedMotion": false,
  "lowDetailMap": false,
  "theme": "auto",
  "mapState": { "selectedId": "component-api", "zoom": 1.15, "center": [0.42, 0.31],
                "routeFilters": ["runtime"], "search": "", "view": "map" },
  "activeTour": { "tourId": "workflow-place-reservation", "stopId": "step-…-3" },
  "reviewedChangeGroups": { "path-change-reservation-conflicts": "2026-07-31T09:25:00+02:00" },
  "notes": { "file-place-order": "Revisit the transaction boundary." },
  "items": {
    "workflow-place-reservation": {
      "state": "in-progress",          // not-started | started | viewed | completed
      "bookmarked": false,
      "unclear": false,
      "firstOpenedAt": "…", "lastOpenedAt": "…", "completedAt": null,
      "seenHash": "9c1f…",             // contentHash when last opened
      "openCount": 4
    }
  }
}
```

Unknown keys are preserved on write so a newer atlas never destroys an older browser's extra state. On the first served visit only, an empty disk file may adopt existing browser progress; once the file contains progress it is authoritative, so a stale browser cannot resurrect a reset.

Keep map and semantic list/tree views synchronized through `mapState.selectedId`; switching representations must not lose selection, filters, breadcrumbs, or return context. Store no repository contents, analytics, accounts, or remote identifiers beyond the repository-scoped local key.

## States

| State | Set by | Means |
|---|---|---|
| `not-started` | Default | Never opened |
| `started` | Opening the item | Seen, not worked through |
| `viewed` | Reaching the end of the content (scroll or last step) | Read through |
| `completed` | **Manual action only** | The reader says they understand it |

**`opened` is never `understood`.** Auto-advance to `viewed` is allowed; auto-`completed` is not. Completion is always the reader's declaration.

Independent flags: `bookmarked` (save for later) and `unclear` (marked confusing — collected in the review path).

## Granularity

Track at every level, and roll up:

- Whole atlas
- Learning path
- Major section
- Island/module, area/district, and selected file/building
- Workflow story
- Subsystem
- Individual important concept (workflow steps, entities, subsystem stages, glossary terms)
- Tour stop, optional quest, and conceptual change group

- Reading-order node

Parent completion is derived from children, never stored separately — a section shows "4 of 7 concepts" and turns complete when the reader marks it complete, not automatically when the children finish.

**Two denominators, deliberately.** Reading-order nodes are ordinary progress items — same store, same ids, same permanence rule — but they are counted **separately** from atlas sections and never folded into the section meter. "Files read" and "sections understood" measure different things, and merging them would move a percentage the reader never changed the day the graph was added. Give the reading-order page its own meter and leave the rail's section meter alone; a test should assert this, because it is the kind of thing a later refactor merges by accident.

Derive a reading-order node's **ready** state from its prerequisites, never store it. An unmet prerequisite is a hint about reading economy and must never lock the node — the same rule quests follow.

## The completion panel

Persistent, one keystroke away:

```text
Architecture overview                 Completed
Authentication flow                   Viewed
Order processing                      In progress
Background jobs                       Not started
Testing and CI                        Bookmarked
```

Never colour-only: each state carries an icon and a word.

The reader must be able to:

- Mark a section complete manually
- Reopen a completed section (completion is not a lock)
- Mark a concept unclear
- Bookmark a concept
- Reset progress (with a confirmation, and only ever their own local data)
- Filter to unfinished only
- Filter to bookmarked only
- Filter to changed since last view
- Follow a changed workflow-step link to that exact step, with its *Updated since you last viewed* badge still visible during the first revisit; clear the badge only for later visits
- Continue from the last viewed point
- Resume the selected island, active tour stop, scroll position, filters, and map/list view
- See a recap of completed material
- See a recap of concepts marked unclear
- Export and import their progress as JSON
- Review conceptual change groups without changing their understanding/completion state

Export exists for moving between browsers and for sharing state from a static-only atlas. An agent may read the served atlas's local `progress/progress.json` without changing it, but cannot read browser-only `localStorage` unless the reader exports it.

## Stable identifiers

**The single most important rule: an `id` is permanent once published.**

- Kind-prefixed, kebab-case, derived from meaning rather than position: `workflow-place-reservation`, not `workflow-3`.
- Use `component-` for islands/modules, `area-` for districts, and `file-` for selected buildings. Use validated `path-change-*` learning-path IDs for conceptual change review; derive quests from existing `path-*` and `check-*` IDs instead of minting parallel IDs.
- Never renumber. Never re-slug because a title changed. Never regenerate ids in a rewrite.
- Rewording a title, hook, or explanation must not change its `id`. Its changed content hash should lead the reader back to the same stable item.
- **Split**: the larger successor keeps the original `id`; the other gets a new one.
- **Merge**: keep the more substantial item's `id` and list the other under `mergedFrom` so the store transfers progress once, then leaves it alone.
- **Removed**: mark `changed.state = "removed"` and keep the item for one update cycle, so the reader learns the subject went away. Drop it on the following update; the orphaned store entry is harmless.

## Stable map coordinates

Treat published coordinates like IDs: derive initial positions deterministically from stable ID, architecture layer, and relationship grouping; never randomize on page load or regenerate every update. Preserve existing `map.x`, `map.y`, and `layoutKey` byte-for-byte for unchanged islands. Move an island only when architecture changes meaningfully, retain its ID, and mention the move in its change group so spatial memory is not silently broken.

## Change detection

`scripts/validate-atlas.mjs` writes a `contentHash` per item from its meaningful content (title, hook, depth levels, why entries, step contents) — deliberately excluding line numbers and timestamps, so a formatting shift upstream does not flag every section.

On open, compare `contentHash` with the stored `seenHash`:

- Equal → nothing shown
- Different → badge: **Updated since you last viewed this section**, and the item appears in the *Changed since last view* filter
- Absent (`seenHash` null) → the item is simply new to this reader

A changed item **keeps its completion state**. The badge informs; it does not demote. The badge clears when the reader opens the item again.

Change-group review is separate from comprehension. Marking a `path-change-*` group reviewed records a timestamp in `reviewedChangeGroups`; it never marks affected islands, files, workflows, or quest concepts completed. Catch-up mode filters to groups after `lastSeenAtlasCommit` that lack a reviewed timestamp. Update `lastSeenAtlasCommit` only after the reader explicitly finishes or dismisses the catch-up review, not merely on page load.

## Preservation across updates

Update mode rewrites atlas content, never `progress/progress.json`; the browser mirror also survives provided IDs stay stable. After an update, verify with existing progress present that the file is byte-identical and that states, bookmarks, notes, unclear flags, last location, map/list selection, coordinates, filters, active tour stop, quest progress, and reviewed change groups all survived. This is required validation, not optional.

If `storeVersion` ever increments, migrate the existing object in place. Never clear the store on version mismatch.
