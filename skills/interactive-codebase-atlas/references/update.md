# Update mode

Refresh an existing atlas from its recorded commit to the repository's current `HEAD`. Focus on **what changed**. Do not reanalyze the whole repository unnecessarily, and do not erase the reader's learning history.

## The twelve steps

### 1. Read the atlas metadata

Load `data/atlas.json` → `repository` and `updateHistory`. Note `commit`, `atlasSchemaVersion`, `skillVersion`, and `lastValidatedAt`. If the schema version is older than this skill's, migrate (see *Schema migration* below) before anything else.

### 2. Identify the previously recorded commit

`repository.commit`. Confirm it exists in the repository:

```bash
git cat-file -e <old-commit>^{commit}
```

If it does not exist, jump to *Recovery* below.

### 3. Determine the current commit

```bash
node scripts/git-metadata.mjs <repo-path>
```

If `HEAD` equals the recorded commit and the tree is clean, there is nothing to update. Say so, offer an audit instead, and stop. Do not manufacture work.

### 4. Inspect the log between them

```bash
git log --oneline --no-merges <old>..<new>
git log --format='%h %s%n%b' <old>..<new>
```

Commit messages are the cheapest source of *intent* you will ever get. Read the bodies — they frequently upgrade an `inferred` rationale to `verified`.

### 5. Inspect the diffs

```bash
git diff --stat <old>..<new>
git diff --name-status <old>..<new>
```

Then read the actual diffs for files that matter, not all of them. Prioritize: entry points, routes, schemas/migrations, domain logic, auth, event/queue registration, CI config, and any file already referenced in `data/atlas.json`.

### 6. Classify what changed

Map changed paths onto atlas items. For each, decide: **new**, **updated**, **removed**, or **cosmetic** (formatting, comments, lockfiles, generated output).

Look specifically for:

- New or removed applications, services, packages
- New, split, merged, or repurposed islands/modules and areas
- New, changed, or deleted routes and handlers
- Schema and migration changes → entities
- Renamed or moved files that break existing `sources[]` paths
- Changed workflow steps
- New or removed events, queues, jobs, webhooks
- Auth changes — always treat as high priority
- Test additions or deletions covering documented behavior
- Documentation changes that resolve or create a conflict with implementation
- Relationship changes that add, remove, redirect, or reclassify world-map routes
- Files that entered or left the reading order: a new load-bearing file needs a node and an
  honest `dependsOn`, and a deleted one has to be removed rather than left pointing at nothing.
  Re-check the `validate` line of every node whose file changed — a named test that was renamed
  or deleted turns the page's promise into a dead end.

### 7. Re-read changed files and their neighbourhood

A changed function is not enough. Read its callers and callees for the hops the atlas documents, so a workflow step's *input*, *output*, and *failure* stay true.

### 8. Update only affected atlas content

Preserve untouched items byte-for-byte where possible — it keeps diffs reviewable and progress hashes stable. For each affected item:

- Update the content and `sources[]`
- Set `changed` to `new` or `updated` with the commit that caused it
- Re-check `confidence` — new commit messages may promote `inferred` → `verified`
- Never silently drop an item. Removed subject matter becomes an item marked `removed` with a short note, kept for one update cycle so the reader learns that it went away, then dropped on the next update.
- Preserve every unchanged island's coordinates and `layoutKey` byte-for-byte. Move an island only for a meaningful architecture change, keep its stable ID, and describe the move in a conceptual change group.
- Preserve island/module → area → file parentage when responsibilities remain stable. A moved file keeps its ID and receives a new path; a changed responsibility may require a new ID and an explicit removed predecessor.
- Create or update stable `path-change-*` learning paths that explain related commits by concept, affected islands/files, behavior, risk, tests, documentation impact, and recommended review order.

### 9. Revalidate unchanged source references

Files move without their content changing. Run:

```bash
node scripts/validate-atlas.mjs <atlas-path>
```

It reports every `sources[].path` that no longer exists and every symbol it could not find in the named file. Fix each one — a broken reference silently destroys trust in every other reference.

### 10. Record the new commit

Update `repository` with the fresh metadata and append to `updateHistory`:

```json
{
  "commit": "…", "commitShort": "…", "at": "…",
  "mode": "update", "fromCommit": "…",
  "summary": "Reservation conflict handling added; order workflow step 4 rewritten",
  "changedSectionIds": ["workflow-place-order", "entity-reservation"],
  "removedSectionIds": []
}
```

### 11. Produce a "What changed in the atlas?" report

Two audiences, both short:

- **In the atlas** — Recent Changes renders conceptual `what-changed` learning paths first, then `updateHistory` and affected items. Compare with `lastSeenAtlasCommit`, prioritize high-impact unreviewed groups, and explain concepts before raw diffs.
- **In the final message** — 3–8 bullets covering what actually moved. Not a commit list; a meaning list. "Orders now emit `order.reserved` before payment, so the payment workflow gained a step" beats "12 commits touched `src/orders`."

### 12. Preserve progress

Served atlases keep authoritative progress in `progress/progress.json` and mirror it in browser `localStorage`; static-only atlases use `localStorage`. Preserve the progress file byte-for-byte and keep section `id`s stable. Never replace, migrate, or reset progress as a side effect of updating atlas content.

- Never renumber, re-slug, or regenerate `id`s. An `id` is permanent once published.
- Rewording a title, hook, or explanation must not change its `id`.
- If an item genuinely splits into two, keep the original `id` on the larger successor and mint a new `id` for the other.
- If two items merge, keep the more-visited one's `id` and record the other in `mergedFrom` so the UI can transfer progress once.
- Preserve coordinates, map/list selection, filters, notes, active tour stop, quest progress, and reviewed change-group timestamps as well as completion/bookmark/unclear state.

`contentHash` (recomputed by `validate-atlas.mjs`) drives the *Updated since you last viewed this section* badge. Substantially rewritten items get flagged automatically. **Updated material is never auto-marked complete**—the badge appears, completion remains what the reader chose, and the section shows in the *Changed since last view* filter. Affected `path-change-*` paths remain unreviewed until the reader explicitly reviews them; page load never advances `lastSeenAtlasCommit`.

## Schema migration

If `atlasSchemaVersion` is behind this skill's version: add new fields with safe defaults, keep all existing `id`s, bump the version, and note the migration in `updateHistory` with `"mode": "migrate"`. Never regenerate the atlas from scratch to satisfy a schema change — that would discard progress.

## Recovery when history is unusable

**Old commit missing (history rewritten, force-push, shallow clone):**
Say so plainly. Try `git reflog` and `git log --all` for a nearby ancestor. If nothing works, fall back to a careful full audit (`references/audit.md`) — validate every source reference, re-verify every high-value claim, and mark items that could not be confirmed as `needsRefresh`. Keep all `id`s so progress survives.

**Repository is unrelated to the recorded source** (different remote, different root commit, atlas pointed at the wrong directory):
Stop. Do not overwrite. Explain the mismatch with both remotes/root commits, and ask whether to create a new atlas beside it.

**Repository is on a different branch than recorded:**
Not an error. Record the new branch, and note in the report that the atlas now documents a different line of development — content differences may be branch divergence rather than progress.

**Working tree dirty:**
Document committed `HEAD`. List uncommitted files in `repository.dirtyFiles`, surface them in the UI as a distinct notice, and never fold uncommitted behavior into the main narrative.

## Finish

Run `references/validation.md` (including the progress-preservation check and the changed-section indicator check), then report with `references/report.md`.
