# Design: trustworthy island exploration

Design the atlas as a premium educational adventure layered over an evidence-backed architecture tool. Make the world memorable and inviting; keep technical accuracy, legibility, and control primary.

## Visual-direction resources

Inspect these images before implementing a create or substantial UI update:

- `visual-direction/00-full-style-moodboard.png`
- `visual-direction/01-world-map-overview.png`
- `visual-direction/02-island-module-view.png`
- `visual-direction/03-area-folder-view.png`
- `visual-direction/04-file-building-view.png`
- `visual-direction/05-quests-progress.png`
- `visual-direction/06-recent-changes.png`

Treat them as references for mood, hierarchy, spatial storytelling, and interaction placement. Do not pixel-match, trace, or force terrain where it harms the repository's actual structure. Adapt the palette and landmarks to the repository while maintaining one coherent world.

## Information architecture

Use this hierarchy consistently in map, breadcrumbs, search, list/tree, progress, and URLs:

```text
repository world → island/module → area/district → file/building
```

- Make an island a human-useful domain, service, application, package, layer, feature, or deployment unit.
- Use a module/landmark for a bounded subsystem or primary responsibility inside an island.
- Use an area/district for a responsibility-first cluster that may map to one or more folders.
- Use a file/building only for a selected, load-bearing file. Keep the full raw tree behind disclosure.
- Keep friendly names alongside technical names and real paths. Never let the metaphor conceal what code a location represents.

Choose landmarks semantically and consistently: harbor for APIs, vault/cave for data, lighthouse for auth or orientation, workshop for business logic, training ground for tests, library for docs, watchtower for monitoring, ruins for deprecated code. A landmark without informational purpose is decoration; omit it.

## Primary navigation

Provide these repository-supported destinations:

1. Overview
2. World Map
3. Reading Order
4. Recent Changes
5. Guided Tours
6. Search
7. Bookmarks
8. Quests
9. Glossary
10. Settings

Keep branch, exact indexed commit, indexed time, staleness, global search, progress, and update affordance persistently available on desktop. Preserve the same status in compact mobile surfaces.

Give every view exactly one visually dominant suggested action. Render alternatives as quieter secondary actions. Never present a grid of equally loud choices.

## Screen behavior

### Overview

Answer what the project does, how it is organized, what to explore first, what changed, where the reader stopped, and how much they understand. Show a compact world preview, stack badges, progress, resume point, recent discoveries, recent change groups, and repository-supported sessions.

Offer session modes without turning them into deadlines: quick overview, one guided tour, one workflow, catch up on changes, continue unfinished. Learning paths continue to show step counts, never time estimates.

### World map

Show major islands, concise labels, types, key-file counts, approximate complexity, exploration state, change state, current position, and selected relationship routes. Keep the initial view under roughly 15 islands and hide non-critical routes until filtered or selected.

Support click/select, Enter or double-click to open, drag to pan, wheel/pinch to zoom, keyboard movement, search-to-focus, filters, route toggles, reset, minimap, breadcrumbs, and browser-like back/forward navigation. On selection, dim unrelated islands, highlight direct routes, open a concise panel, and offer one dominant **Explore island** action plus Tour, Changes, and Bookmark.

Represent only evidenced relationships. Pair route appearance with text, direction, mechanism, and confidence:

- dotted sea route: ordinary dependency
- moving current: selected runtime data flow
- bridge: tight coupling
- ferry: asynchronous message
- cargo route: batch processing
- cable: infrastructure dependency
- air route: external API
- broken route: unresolved or failing relationship

Animate only the selected route, once, then stop.

### Island, area, and file

Make arrival progressively more technical:

- Island/module: purpose, technical name, owners/contributors when evidenced, health/test state, change state, parent/related islands, important landmarks, progress, and “Why is it built this way?”
- Area/district: responsibility, paths, contained key files, neighboring responsibilities, activity, tests, tags, and last meaningful change.
- File/building: path, responsibility, key symbols, imports/dependencies, dependents, tests/coverage when evidenced, changes, related files, short code preview, why it matters, and open-in-editor only when supported.

Use familiar high-contrast editor styling for code. Never turn code into decorative parchment. Keep file tabs concise: Overview, Code, Changes, Dependencies, Metrics—omit unsupported tabs.

### Recent changes

Group commits by concept, not by raw chronological list. Explain what changed, why when evidenced, affected islands, behavioral and architectural impact, risk, relevant tests, documentation freshness, and recommended review order.

Provide “What changed since my last visit?”: compare `lastSeenAtlasCommit` with the current indexed commit, prioritize high-impact groups, explain concepts before raw diffs, let the reader mark each stable `path-change-*` group reviewed, and preserve that state. Use environmental signals only as secondary cues: ripples for small changes, scaffolding for active development, storm/cracked route for risk, island growth for new modules, lighthouse beam for the next review target.

### Tours, search, bookmarks, and quests

- Tours trace one meaningful repository goal. Focus one stop at a time: one concept, one visual, one or two files, one explanation, optional depth, Previous/Next, and return to the same map context.
- Search modules, areas, files, symbols, glossary entries, tours, and natural-language intent. Show a structured result list and highlighted map locations. Explain why each result matched.
- Bookmarks collect any stable-ID location or concept and preserve the return context.
- Quests encourage real understanding: trace a workflow, discover entry points, review changed areas, or bookmark critical files. Make them optional and skippable. Give explanations, subtle stamps, or completion cards; never use scores, timers, streaks, losses, ranks, punishment, or compulsive prompts.

## Pacing and depth

- Show one important idea per view.
- Keep visible explanations to 2–4 short sentences and roughly 45–75 characters per line.
- Split paragraphs above about 60 words or hide secondary detail behind a clearly labelled disclosure.
- Show summaries first; reveal code, tests, failure cases, and rationale through tabs, drawers, “Explain more,” or the depth selector.
- Keep current location, completed work, remaining work, and resume point visible.
- Prefer drawers, split views, and side panels before full navigation to reduce context switching.

Author all explanations at three levels and persist the reader's choice:

- **Simple:** plain language and a useful analogy when it genuinely helps; never patronize.
- **Balanced:** default; accurate architecture with real names, paths, mechanisms, and inline jargon definitions.
- **Deep:** implementation detail, invariants, edge cases, tests, and one short load-bearing excerpt when useful.

## Explain why

For each important location, route, workflow, and file, answer what it does, why it exists, what problem it solves, why it sits here, which trade-off it represents, what would break if removed, and whether the reason is verified or inferred.

Use reader-shaped disclosures: “Why is this needed?”, “Why here?”, “Why asynchronous?”, “What invariant does this protect?”, “What would break?”, and “Is this intentional or historical?” Carry source and confidence into every answer. Never invent developer intent; `unknown` is valid.

## Visual language

Use calm ocean blues/cyans, seafoam and forest greens, sand/stone neutrals, dark navy text, and restrained gold/orange attention accents. Reserve red for real risk or failure and purple for infrastructure/advanced concepts. Pair every state and category color with an icon, label, shape, or pattern.

Use stylized terrain, paths, docks, workshops, caves, and towers with strong silhouettes, rounded panels, compact badges, and large touch targets. Keep decoration quiet. Avoid generic admin dashboards, walls of cards, dense primary tables, excessive glass, heavy gradients, low contrast, tiny controls, realistic terrain that obscures meaning, and raw directory trees as the main experience. Group or progressively disclose long histories, validation inventories, and progress lists so dozens of similar rows never become one unbroken wall.

Draw icons from the existing icon system; never use Unicode symbols as load-bearing category markers. Use monospace only for code, paths, hashes, and measurements. Spend boldness once per view.

## The reading-order graph

Stage bands read top to bottom, nodes left to right inside a band, and every edge therefore points forward — that is the whole reason the layout is legible without a layout engine. Draw only the edges in SVG and build the nodes as real focusable controls positioned over it; an SVG shape pretending to be a button loses focus rings, `aria-pressed`, and the accessible name, on the one page whose point is a control you press per node.

Fade an edge by the distance it spans: a few long dependencies drawn at full weight read as a tangle across the whole graph, and selecting either end should be what brings one back to full strength. Distinguish a met prerequisite from an unmet one by dash pattern as well as colour. Give the canvas its own scroller — it will be wider than the panel — and never let the document scroll horizontally.

Three node states, each carrying an icon and a word: read, ready, later. `later` is dimmer, never disabled.

## Motion and session modes

Use motion only to explain selection, direction, state, or completion. Keep navigation transitions 200–400 ms and below 500 ms. Draw a selected route once, lift a selected island briefly, clear fog on explicit discovery, then stop. Do not autoplay tours or loop ambient motion by default.

Support calm, focus, exploration, catch-up, reduced-motion, and low-detail-map modes. Focus hides unrelated nodes, optional excerpts, decorative detail, and secondary navigation while keeping depth, progress, Next/Previous, and Exit. Catch-up prioritizes unreviewed change groups. Sound remains off by default.

Under `prefers-reduced-motion`, remove transitions, route drawing, camera travel, and decorative motion in CSS and JS; advance tours discretely. Provide a persistent manual motion control that wins.

## Accessibility and list/tree parity

Make the atlas fully usable without the illustrated map:

- Render a semantic list/tree from the same island, route, area, and file records.
- Preserve identical selection, filters, progress, change badges, bookmarks, route text, and destinations in map and list/tree.
- Use real buttons, navigation, main landmarks, ordered headings, descriptive labels, polite live regions, and focus-accessible tooltips.
- Provide logical tab order, strong focus, Arrow-key spatial/tree navigation, Enter to open, and Escape to close panels.
- Meet 4.5:1 text and 3:1 meaningful-graphic contrast, support 200% zoom, keep body text at least 16px, and use 44×44px touch targets.
- Never communicate state through color alone.

## Responsive behavior

- Desktop: persistent left navigation, large map, right context panel, and repository status.
- Tablet: collapsible navigation, full-width map, slide-over context, and larger controls.
- Mobile: bottom navigation, search-first entry, one island at a time, bottom-sheet detail, reduced decoration, and list/tree as the safe default. Offer a simplified map as an alternative; never squeeze the desktop world into the viewport.

Prevent horizontal page scrolling at 390px, except inside deliberate code and map canvases.

## Empty states and quality check

Give each empty state a plain explanation and next action: “No bookmarks yet—bookmark an island or file to collect it here.” Avoid generic motivational copy.

Before reporting, inspect the real screens at desktop, tablet, and mobile sizes. Reject any view without one focal point, any map whose relationships require color, any mismatch between map and list/tree, any default wall of text, any stale/commit state that is hidden, and any template or invented repository content.
