# Required atlas content and surfaces

Preserve the content sections below and expose them through the island-world product shell. Include repository-dependent content only when evidence supports it—an absent section is honest, an empty one is clutter. Use stable IDs; never renumber existing published content because the navigation changed.

## Product shell

Provide these destinations whenever their underlying content exists:

| Destination | Renders |
|---|---|
| **Overview** | Start screen, project orientation, progress, resume, sessions, compact world, recent change groups |
| **World Map** | Architecture components as islands, connections as routes, explorer groups/trees as deeper levels |
| **Reading Order** | `readingOrder` as a stage-banded DAG of files to read, each markable read on the graph, with a stage list at parity |
| **Recent Changes** | Conceptual `what-changed` learning paths, `updateHistory`, changed items, and review state since `lastSeenAtlasCommit` |
| **Guided Tours** | Learning paths and workflow stories |
| **Search** | Modules, areas, files, symbols, terms, tours, and natural-language intent |
| **Bookmarks** | Bookmarked stable-ID items with their return context |
| **Quests** | Optional understanding goals assembled from workflows and knowledge checks |
| **Glossary** | Project-specific terms |
| **Settings** | Depth, theme, motion, session mode, detail level, progress import/export/reset |

Keep one dominant next action on each destination. Keep branch, exact indexed commit, progress, resume point, and staleness reachable everywhere. Search, bookmarks, quests, and settings are product views over existing data and progress; do not duplicate content just to populate them.

---

## 0. Overview / start screen

The first thing a reader sees. It offers **paths**, not a table of contents.

Show: atlas title, `meta.oneLiner`, `meta.hook`, stack, commit chip (`Atlas updated through commit a1b2c3d — "…"`), staleness when applicable, overall progress, resume point, one recommended next action, compact world preview, recent change groups, and learning paths.

Paths, shown only when supported:

| Path | Offer when | Shows |
|---|---|---|
| **Quick overview** | Always | A short guided pass over the whole system. **Step count, never a time estimate.** |
| **Follow one action** | ≥1 workflow | A real action traced through UI, backend, domain, storage, events, and back to the screen |
| **Explore the architecture** | Always | Free navigation of the map |
| **Continue learning** | Progress exists | Resume at the last incomplete section |
| **What changed?** | `updateHistory.length > 1` | Repository and atlas changes since the last visit |
| **Review unfinished** | Anything unclear/bookmarked/incomplete | Those items only |

First-visit state hides *Continue* and *Review*; they appear once there is something to continue.

Offer calm, focus, exploration, and catch-up sessions as display/navigation modes, not deadlines. Continue showing step counts rather than time estimates.

---

## 1. Interactive architecture world map

A clickable world, not a diagram image. Render `components` as islands/modules and `connections` as routes. Render the same records as a semantic list/tree with action parity.

Layout by `layer`: clients at one end, infrastructure at the other. Encode category with **shape and icon and label**, not colour alone. Keep the first view under ~15 islands. Use stable deterministic coordinates and preserve them across updates. Do not show every route by default; select or filter relationship categories.

Selecting an island opens a concise panel: friendly and technical name · type · responsibility · users · why it exists · main entry point · important areas and files · direct relationships · one example · sources · tests · confidence · change and exploration state. Make **Explore island** dominant; keep Start Tour, View Changes, and Bookmark secondary.

Support click/select, Enter or double-click to open, pan, zoom, keyboard movement, search-to-focus, filters, route toggles, reset, minimap, breadcrumbs, and back/forward. **Animate only the selected communication path, once.** Everything else stays still by default.

Selecting an edge shows the `connections` record: mechanism, data, validation, auth, success, failure, retry, and why that mechanism.

---

## 2. Guided workflow stories

Three to five workflows, chosen because they explain the system — not because they are simple. Signing in, creating an item, processing a payment, uploading a file, submitting a form, sending a notification, running a background job, synchronizing data, updating another client live, changing configuration, deploying.

Each opens with its `hook` and runs as a step-through story:

```text
User action → UI component → request → route/controller → service → business logic
→ database or external system → event or response → updated interface
```

Per step: plain-language explanation · the file · the important function/component/route/class · why this step exists · input · output · possible failure · a relevant test · an optional short excerpt · whether it changed since the previous atlas version.

One step is in focus at a time. The rail shows where the reader is in the arc. End with the recap and a "what happens next?" link into the next section.

---

## 3. Conceptual repository explorer

**Responsibility first, directories second.** Drill down as island/module → area/district → file/building. Group by what code *does*: user interfaces · backend and APIs · domain logic · data access · database and migrations · auth · events and background processing · shared utilities · shared UI · tests · infrastructure · scripts · documentation.

Toggles: conceptual view (default) · actual folder view · recently changed files · files referenced by the current workflow · files relevant to a selected feature · files not yet explored.

Never open on the full file tree. Show groups and areas first; files appear on expansion. Every level exposes friendly name, technical name/path, responsibility, sources, confidence, progress, and change state. The illustrated hierarchy and semantic tree must select and navigate the same stable IDs.

---

## 3b. Reading-order graph

The explorer answers *where does this live?* This answers *what do I open first, and what does it assume I already know?* Author it as `readingOrder` (see `references/schema.md`) whenever the repository has more than a handful of load-bearing files.

**Shape.** A directed acyclic graph of files, grouped into ordered **stages**. A node's `dependsOn` names the files it assumes, and every one of them must be earlier — an earlier stage, or earlier within the same stage. That single rule keeps the graph acyclic *and* makes the drawn layout correct by construction, because stage index is the row and authored index is the column. Enforce it in validation; do not rely on authoring discipline.

**Per node**, all four are required and none is optional prose:

| Field | What it must say |
|---|---|
| `what` | What this file is, in one sentence |
| `lookFor` | The load-bearing idea in it — the thing the reader should come away holding, not a summary |
| `validate` | How to check they got it: a test to run, a command, a constraint to confirm, a claim to check against the code |
| `dependsOn` | What it assumes, as node ids |

`validate` is what makes this a reading *and validation* order rather than a syllabus. Prefer a real test file or command in the repository over a rhetorical question.

**Size and shape.** Aim for 25–50 nodes and 7–12 stages, at most five nodes per stage so the drawn row stays under a readable width. Start at orientation documents, end at whatever the reader most wants to change. Every stage needs a `name` and a sentence saying why those files belong together.

**Interaction.** Nodes are marked read **on the graph**, with a control on the node itself — that is the point of the page, and requiring a detail panel first defeats it. Selecting a node opens its notes beside or below the graph. Derive three states: **read**, **ready** (every prerequisite read), and **later**. Never lock a `later` node; an unmet prerequisite is a hint about reading economy, not a gate — the same rule quests follow. Encode state with icon *and* word *and* shape, never hue alone.

**Parity.** Provide a stage-by-stage list of the same nodes with the same controls, defaulting on narrow screens. The graph canvas may overflow its panel and own a scroller; the document must never scroll horizontally. Build nodes as real focusable controls rather than SVG shapes pretending to be buttons — draw only the edges in SVG.

**Progress.** Node ids are progress items like any other, under the same store and the same `id` permanence rule. Keep them **out of the section-progress denominator**: "files read" and "sections understood" are different measures, and folding them together silently moves a number the reader did not change. Give the page its own meter.

Offer it from the start screen as a `learningPaths` entry with `kind: "reading-order"`.

---

## 4. Workflow simulator

Step through a workflow with controls: Previous · Next · Play · Pause · Replay · Big picture · Explain more · Explain less · Show code · Hide code · Show failure scenario · Show tests · Why is this done? · Return to architecture map.

The current step must always be obvious — position, highlight, and the rail all agree. Animation is slow, clear, and skippable; Play is opt-in and never autostarts. Under `prefers-reduced-motion`, transitions become instant and Play advances by discrete steps.

"Big picture" drops the reader back to the map with the current step's component highlighted, then returns them to the same step.

---

## 5. Data model

Most important entities first — usually 4–8. Never an alphabetical schema dump.

Per entity: real-world meaning · who creates it · who reads it · important relationships · lifecycle · where it is validated · where it is stored · **why it is separate from related entities** · relevant schemas, migrations, services, and tests · whether it is persisted, computed, cached, temporary, or published.

Distinguish, where applicable: operational state · historical state · audit state · configuration · derived data · cached data · public data · read models · events · external data. The distinction is usually the most useful thing on the page — it tells a reader which tables they may safely change.

---

## 6. Communication and synchronization

One entry per mechanism present: HTTP · RPC · server actions · WebSockets · SSE · queues · event buses · webhooks · scheduled jobs · database polling · shared storage · IPC.

Per mechanism: initiator · receiver · data transmitted · validation · authentication · authorization · success behavior · failure behavior · retry behavior · recovery from missed updates · **why that mechanism was chosen over the obvious alternative**.

Include at least one success scenario and one failure scenario the repository supports. Failure is where readers learn the most.

---

## 7. Authentication and authorization

When present. How identity is established · how sessions or tokens are created · how requests are authenticated · where permissions are enforced · roles and permission concepts · frontend restrictions · backend enforcement · sensitive operations · failure behavior · tests · **why checks exist in more than one layer**.

Be explicit that frontend checks are UX and backend checks are the boundary — readers routinely get this backwards.

**Never expose secrets, credentials, tokens, personal information, or environment values.** Name variables and mechanisms, never values.

---

## 8. Important subsystem deep dives

One to four. Pick by difficulty and importance: visual editors, search, payments, scheduling, state machines, file processing, ML, synchronization, caching, plugins, compilation, rendering, data pipelines, geometry, permissions, multi-tenancy.

Per subsystem: purpose · inputs and outputs · internal stages · important data structures · invariants · why it is designed this way · connection to the rest of the system · failure points · tests · **where a developer should start when changing it**.

The `startHere` pointer is the payoff. Make it a specific file and a specific first move.

---

## 9. Testing and delivery

Visualize how a change travels:

```text
Task → branch → implementation → focused tests → typecheck → lint
→ integration tests → browser tests → CI → review → merge → release
```

Show only the stages this repository has. Explain: available test types · what each covers · important commands · CI checks · manual checks · environment requirements · test databases · generated artifacts · debugging workflow · project-specific traps · release/deployment process · **why each verification layer exists**.

Traps are the highest-value item here. Every repository has two or three things that waste a newcomer's afternoon.

---

## 10. "Where should I change this?" mode

Repository-grounded playbooks for the tasks people actually arrive with: change visible text · add a page · add a database field · change a business rule · add an API endpoint · add an event · modify authentication · add a background job · change shared UI · update deployment config.

Per playbook: likely starting point · other affected layers · tests to update · applicable project instructions (from `AGENTS.md`/`CONTRIBUTING.md`) · areas not to modify · why the change belongs there · confidence level.

Point at an existing analogous implementation whenever one exists — "copy what `X` does" is the most useful sentence in this section.

---

## 11. Searchable glossary

Project-specific terms only. Per term: short plain-language definition · technical meaning · why the concept exists · where it appears (linked) · related terms · an example · source references.

Terms should be clickable from anywhere in the atlas — first use in a section links to the glossary entry in a popover, not a page jump.

---

## 12. Optional knowledge checks

Low pressure, always skippable, attached to the section they follow: choose the next workflow step · match a component to its responsibility · predict which service receives a request · identify the proper place for a change · arrange stages in order · distinguish frontend validation from backend enforcement.

Explain the answer immediately, including when it was correct. **No scores, timers, streaks, rankings, or punitive feedback.** A wrong answer produces an explanation, never a judgment.

Present repository-grounded checks as optional quests when useful: discover entry points, trace one workflow, locate validation, review changed islands, or bookmark critical files. Track the underlying concepts completed, not points. Never add streak loss, ranks, rewards with monetary framing, manipulative notifications, or locked core content.

## Cross-cutting change review

Group changes conceptually with stable `path-change-*` learning-path IDs. Show what changed, why when evidenced, affected islands/files, behavioral and architectural impact, risk, tests, documentation freshness, and recommended review order. Compare the reader's `lastSeenAtlasCommit` with the indexed commit, explain concepts before raw diffs, and let each group be marked reviewed without altering understanding/completion state.

---

## Cross-cutting requirements

Every section must have: a stable `id` · a repository-grounded curiosity hook · three depth levels · sources · confidence · one dominant next action · progress controls (complete · bookmark · unclear) · change state when applicable. Every map destination must have an equivalent list/tree destination. Preserve these contracts on desktop, tablet, mobile, `file://`, keyboard, and reduced motion.
