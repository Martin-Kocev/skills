# AGENTS.md template

`AGENTS.md` is loaded into every session, so it holds only what every task needs: what the project is, how to run it, and the rules. Everything else (file map, architecture, decisions, gotchas) lives in the wiki (`references/wiki.md`), where the model reads only the pages a task needs. Preserve this structure when updating.

```markdown
# <Project Name>

## Project overview
2–4 sentences: what the project does, who uses it, main entry points.

## Knowledge base
Project wiki: `docs/wiki/` (Obsidian vault). Read `docs/wiki/index.md` first,
then only the pages the task needs. Recent history:
`grep "^## \[" docs/wiki/log.md | tail -10`.

## Tech stack
- Language(s) and versions
- Frameworks and major libraries
- Test runner, lint/format tools, build/deploy tooling

## Common commands
Exact commands as they actually succeeded here, including flags, working
directory, and env vars.

| Task | Command | Notes |
|---|---|---|
| Run full test suite | `npm test` | must pass before any merge |
| Lint | `npm run lint` | |
| Start dev server | `npm run dev` | port 3000 |

## Project conventions
Rules not derivable from code: branch names (`main`/`dev`), remote name,
merge flags, commit style, i18n rules, naming, review expectations.
```

Rules for maintaining the file:

- A recorded command that stops working gets replaced in the same task that found the breakage.
- Keep it terse. Detail that is not needed by every task belongs in a wiki page.
- When migrating an older `AGENTS.md`, move its File reference, Architecture notes, and Gotchas sections into wiki pages (bootstrap in `references/wiki.md`) and leave the Knowledge base pointer.
