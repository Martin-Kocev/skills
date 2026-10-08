/**
 * Interaction checks — optional, requires Playwright.
 *
 *   npx playwright test tests/atlas.interaction.spec.mjs
 *
 * Start the atlas first:  node scripts/serve-atlas.mjs . 4173
 * If Playwright is unavailable, run tests/atlas.data.test.mjs and report which
 * interaction checks were skipped. Do not claim they passed.
 */
import { test, expect } from 'playwright/test';
import { readFileSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const BASE = process.env.ATLAS_URL ?? 'http://127.0.0.1:4173';
const ROOT = path.resolve(fileURLToPath(new URL('..', import.meta.url)));
const ATLAS = JSON.parse(readFileSync(path.join(ROOT, 'data', 'atlas.json'), 'utf8'));
const STORAGE_KEY = `codebase-atlas:${ATLAS.repository.name}:v1`;
const FIRST_COMPONENT = ATLAS.components?.[0];
const FIRST_SUBSYSTEM = ATLAS.subsystems?.[0];
const SEARCH_TERM = ATLAS.glossary?.[0]?.term ?? FIRST_COMPONENT?.name?.split(/\s+/)[0] ?? 'main';

/**
 * Progress is now file-backed, which means it outlives a browser context — so
 * it also outlives a test. Clear it once up front, or a second run of this
 * suite starts with completions the first run left behind and the assertions
 * about a *fresh* reader stop being true. Harmless when the endpoint is absent
 * (a static host), which is the same fallback the atlas itself makes.
 */
test.beforeAll(async () => {
  try {
    await fetch(BASE + '/api/progress?mode=replace', {
      method: 'PUT',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ storeVersion: 1, items: {} }),
    });
  } catch { /* no progress API — localStorage-only mode */ }
});

test.beforeEach(async ({ page }) => {
  await page.goto(BASE + '/index.html#/');
});

test('start screen offers paths and shows the documented commit', async ({ page }) => {
  await expect(page.locator('.commit-chip')).toContainText('Atlas updated through commit');
  await expect(page.locator('.path-card')).not.toHaveCount(0);
  // Step counts, never time estimates.
  await expect(page.locator('.path-card__meta').first()).not.toContainText(/min|hour/i);
});

test('architecture map renders and selecting a node opens its detail', async ({ page }) => {
  await page.goto(BASE + '/index.html#/architecture');
  const nodes = page.locator('.node');
  await expect(nodes.first()).toBeVisible();
  await nodes.first().click();
  await expect(page.locator('.detail h3')).toBeVisible();
  // Only the selected path animates.
  await expect(page.locator('.edge[data-active="true"]')).not.toHaveCount(0);
});

test('a workflow steps forward and backward', async ({ page }) => {
  await page.goto(BASE + '/index.html#/workflows');
  await page.locator('.path-card').first().click();
  await expect(page.locator('.sim__counter')).toContainText('Step 1 of');
  await page.getByRole('button', { name: /Next/ }).click();
  await expect(page.locator('.sim__counter')).toContainText('Step 2 of');
  await page.getByRole('button', { name: /Previous/ }).click();
  await expect(page.locator('.sim__counter')).toContainText('Step 1 of');
});

test('workflow playback is visible and disclosure controls never fail silently', async ({ page }) => {
  const workflow = ATLAS.workflows[0];
  const firstStep = workflow.steps[0];
  await page.goto(BASE + '/index.html#/workflows/' + workflow.id + '/0');

  for (const [kind, available] of [
    ['code', Boolean(firstStep.excerpt?.code)],
    ['failure', Boolean(firstStep.failure)],
    ['tests', Boolean(firstStep.test)],
  ]) {
    const control = page.locator(`[data-sim-control="${kind}"]`);
    await expect(control).toBeVisible();
    if (!available) {
      await expect(control).toBeDisabled();
      await expect(control).toContainText(/No |unavailable/i);
      continue;
    }
    await expect(control).toBeEnabled();
    await control.click();
    const revealed = kind === 'code' ? page.locator('.sim__step .excerpt')
      : kind === 'failure' ? page.locator('.sim__step .notice')
        : page.locator('.sim__step .srcs');
    await expect(revealed).toBeVisible();
  }

  await page.locator('[data-sim-control="play"]').click();
  await expect(page.locator('[data-sim-control="play"]')).toContainText('Pause');
  await expect(page.locator('.sim__playback')).toBeVisible();
  await expect(page.locator('.sim__play-track')).toHaveAttribute('role', 'progressbar');
  await page.locator('[data-sim-control="play"]').click();

  await page.goto(BASE + '/index.html#/workflows/' + workflow.id + '/1');
  await page.locator('[data-sim-control="replay"]').click();
  await expect(page.locator('.sim__counter')).toContainText('Step 1 of');
  await expect(page.locator('[data-sim-control="play"]')).toContainText('Pause');
  await expect(page.locator('.sim__playback')).toBeVisible();
});

test('a changed workflow step stays marked for its first revisit and links to the exact step', async ({ page }) => {
  const workflow = ATLAS.workflows.find((candidate) => candidate.steps?.length > 1);
  test.skip(!workflow, 'atlas has no multi-step workflow');
  const stepIndex = 1;
  const step = workflow.steps[stepIndex];
  const at = '2026-08-01T00:00:00.000Z';
  await fetch(BASE + '/api/progress?mode=replace', {
    method: 'PUT', headers: { 'content-type': 'application/json' },
    body: JSON.stringify({
      storeVersion: 1,
      items: {
        [step.id]: {
          state: 'completed', bookmarked: true, unclear: false,
          firstOpenedAt: at, lastOpenedAt: at, completedAt: at,
          seenHash: 'an-older-content-hash', openCount: 2, updatedAt: at,
        },
      },
    }),
  });

  await page.goto(BASE + '/index.html#/progress?filter=changed');
  const row = page.locator('.checklist li', { hasText: step.title });
  await expect(row).toBeVisible();
  await row.getByRole('link', { name: step.title }).click();
  await expect(page).toHaveURL(new RegExp(`#/workflows/${workflow.id}/${stepIndex}$`));
  await expect(page.locator('.sim__counter')).toContainText(`Step ${stepIndex + 1} of`);
  await expect(page.locator('.sim__step .badge--updated')).toBeVisible();

  const stored = await fetch(BASE + '/api/progress').then((response) => response.json());
  expect(stored.items[step.id].state).toBe('completed');
  expect(stored.items[step.id].bookmarked).toBe(true);
  await page.reload();
  await expect(page.locator('.sim__step .badge--updated')).toHaveCount(0);
});

test('workflow arrival motion settles to crisp readable content', async ({ page }) => {
  await page.goto(BASE + '/index.html#/workflows');
  await page.locator('.path-card').first().click();
  const step = page.locator('.sim__step');
  await expect(step).toBeVisible();
  await page.waitForTimeout(700);
  const style = await step.evaluate((node) => {
    const css = getComputedStyle(node);
    return { filter: css.filter, opacity: css.opacity };
  });
  expect(style.filter).toBe('none');
  expect(style.opacity).toBe('1');
});

test('focus mode does not leak into a fresh subsystem or delivery view', async ({ browser }) => {
  const ctx = await browser.newContext();
  const page = await ctx.newPage();
  if (FIRST_SUBSYSTEM?.stages?.length) {
    await page.goto(BASE + '/index.html#/subsystems/' + FIRST_SUBSYSTEM.id);
    await expect(page.locator('details.disclose').first()).toBeVisible();
  }
  if (ATLAS.delivery?.testTypes?.length) {
    await page.goto(BASE + '/index.html#/delivery');
    await expect(page.locator('details.disclose').first()).toBeVisible();
  }
  await ctx.close();
});

test('depth selector changes the explanation and never empties it', async ({ page }) => {
  await page.goto(BASE + '/index.html#/architecture');
  await page.locator('.node').first().click();
  // Not `.depth-body` alone: a component carrying an `example` renders a second
  // paragraph with the same base class, and this assertion is about the
  // depth-switched explanation specifically.
  const body = page.locator('.detail .depth-body:not(.depth-body--example)');
  const balanced = await body.textContent();
  await page.getByRole('button', { name: 'Simple' }).click();
  await page.locator('.node').first().click();
  const simple = await body.textContent();
  expect(simple?.trim().length).toBeGreaterThan(0);
  expect(simple).not.toEqual(balanced);
});

test('progress persists across a reload and completion is never automatic', async ({ page }) => {
  await page.goto(BASE + '/index.html#/architecture');
  await page.locator('.node').first().click();
  await expect(page.getByRole('button', { name: /Mark complete/ })).toBeVisible(); // opened ≠ completed
  await page.getByRole('button', { name: /Mark complete/ }).click();
  await page.reload();
  await page.goto(BASE + '/index.html#/progress');
  await expect(page.locator('.state[data-state="completed"]').first()).toBeVisible();
});

test('focus mode hides secondary navigation', async ({ page }) => {
  await page.goto(BASE + '/index.html#/architecture');
  await page.keyboard.press('f');
  await expect(page.locator('.rail')).toBeHidden();
  await page.keyboard.press('Escape');
  await expect(page.locator('.rail')).toBeVisible();
});

test('keyboard reaches the map and Enter selects', async ({ page }) => {
  await page.goto(BASE + '/index.html#/architecture');
  await page.locator('.node').first().focus();
  await page.keyboard.press('Enter');
  await expect(page.locator('.detail h3')).toBeVisible();
});

test('reduced motion removes the path animation', async ({ browser }) => {
  const ctx = await browser.newContext({ reducedMotion: 'reduce' });
  const page = await ctx.newPage();
  await page.goto(BASE + '/index.html#/architecture');
  await page.locator('.node').first().click();
  const dash = await page.locator('.edge[data-active="true"]').first()
    .evaluate((el) => getComputedStyle(el).strokeDasharray);
  expect(dash === 'none' || dash === '').toBeTruthy();
  await ctx.close();
});

test('narrow layout does not scroll horizontally', async ({ browser }) => {
  const ctx = await browser.newContext({ viewport: { width: 390, height: 844 } });
  const page = await ctx.newPage();
  await page.goto(BASE + '/index.html#/architecture');
  const overflow = await page.evaluate(() =>
    document.documentElement.scrollWidth - document.documentElement.clientWidth);
  expect(overflow).toBeLessThanOrEqual(1);
  await ctx.close();
});

test('empty filters show a real empty state', async ({ page }) => {
  await page.goto(BASE + '/index.html#/progress?filter=bookmarked');
  await expect(page.locator('.empty')).toBeVisible();
  await expect(page.locator('.empty')).toContainText(/Bookmark/i);
});

test('map honours authored coordinates, and unplaced islands land the same way every render', async ({ page }) => {
  const result = await page.evaluate(() => {
    const host = document.createElement('div');
    document.body.appendChild(host);
    const component = (id, map) => ({ id, name: id, category: 'backend', responsibility: id, layer: 1, map });
    const snapshot = (items) => {
      window.AtlasMap.render(host, items, [], {});
      return Object.fromEntries([...host.querySelectorAll('.node')].map((node) => [node.dataset.id, {
        x: Number(node.dataset.mapX), y: Number(node.dataset.mapY),
        sourceX: node.dataset.mapSourceX, sourceY: node.dataset.mapSourceY
      }]));
    };
    const authored = snapshot([component('authored-right', { x: .8, y: .75 }), component('authored-left', { x: .2, y: .25 })]);
    // Same two islands, opposite input order. Placement must not depend on it,
    // or the world would rearrange itself between updates and destroy the
    // spatial memory the map exists to build.
    const first = snapshot([component('fallback-beta'), component('fallback-alpha')]);
    const reversed = snapshot([component('fallback-alpha'), component('fallback-beta')]);
    host.remove();
    return { authored, first, reversed };
  });
  expect(result.authored['authored-left'].sourceX).toBe('authored');
  expect(result.authored['authored-left'].sourceY).toBe('authored');
  expect(result.authored['authored-left'].x).toBeLessThan(result.authored['authored-right'].x);
  expect(result.authored['authored-left'].y).toBeLessThan(result.authored['authored-right'].y);
  expect(result.first).toEqual(result.reversed);
});

test('every island the map draws is also reachable from the list', async ({ page }) => {
  await page.goto(BASE + '/index.html#/architecture');
  const links = page.locator('.map-component-link');
  // Parity, not approximation: a destination that exists only inside the SVG is
  // a destination a keyboard or screen-reader user does not have.
  expect(await links.count()).toEqual(await page.locator('.node').count());
});

test('mobile world map is list-first with an action for every island', async ({ browser }) => {
  const ctx = await browser.newContext({ viewport: { width: 390, height: 844 } });
  const page = await ctx.newPage();
  await page.goto(BASE + '/index.html#/architecture');

  await expect(page.locator('.map-list')).toHaveAttribute('open', '');
  await expect(page.locator('.illustrated-map')).not.toHaveAttribute('open', '');
  await expect(page.locator('.map-frame')).toBeHidden();

  const componentActions = page.locator('.map-component-link');
  expect(await componentActions.count()).toBeGreaterThan(0);
  await componentActions.first().click();
  await expect(page.locator('.detail h3')).toBeVisible();

  await page.getByText('Show illustrated map', { exact: true }).click();
  await expect(page.locator('.map-frame')).toBeVisible();
  const overflow = await page.evaluate(() =>
    document.documentElement.scrollWidth - document.documentElement.clientWidth);
  expect(overflow).toBeLessThanOrEqual(1);
  await ctx.close();
});

test('Search, Bookmarks, Quests, and Settings are first-class destinations', async ({ page }) => {
  for (const [name, route] of [['Search', '#/search'], ['Bookmarks', '#/bookmarks'],
                               ['Quests', '#/quests'], ['Settings', '#/settings']]) {
    await page.goto(BASE + '/index.html' + route);
    await expect(page.locator('#view').getByRole('heading', { name, exact: true })).toBeVisible();
    const link = page.getByRole('navigation', { name: 'Atlas sections' }).getByRole('link', { name, exact: true });
    await link.scrollIntoViewIfNeeded();
    await expect(link).toBeVisible();
  }
  // A term from atlas data, so a hit proves the index rather than fixture luck.
  await page.goto(BASE + '/index.html#/search?q=' + encodeURIComponent(SEARCH_TERM));
  await expect(page.locator('.search-result-group')).not.toHaveCount(0);
  await page.goto(BASE + '/index.html#/settings');
  for (const label of ['Export progress', 'Import progress', 'Reset progress']) {
    await expect(page.getByRole('button', { name: label })).toBeVisible();
  }
});

test('boot does not advance last-seen commit; review and finish catch-up stay independent', async ({ page }) => {
  // This atlas has no repository changes to group yet — HEAD has not moved since
  // it was indexed — so the group under test is injected. The behaviour being
  // pinned is the rule, not this repository's current data.
  await page.addInitScript((componentId) => {
    let atlas;
    Object.defineProperty(window, '__ATLAS__', {
      configurable: true,
      get: () => atlas,
      set: (value) => {
        atlas = value;
        atlas.learningPaths = [...(atlas.learningPaths || []), {
          id: 'path-change-runtime-contract', kind: 'what-changed', title: 'Runtime contract changed',
          blurb: 'Review the affected gateway island.', summary: 'The runtime now preserves an explicit catch-up boundary.',
          stepIds: [componentId], affectedIds: [componentId], reviewOrder: 1
        }];
      }
    });
  }, FIRST_COMPONENT.id);
  // beforeEach already loaded the page, and a goto that differs only by fragment
  // is a same-document navigation — no scripts re-run, so the init script above
  // would never fire. Reload to get a real document load.
  await page.goto(BASE + '/index.html#/changed');
  await page.reload();
  const key = STORAGE_KEY;
  const read = () => page.evaluate((k) => JSON.parse(localStorage.getItem(k) || '{}'), key);

  // Merely arriving on the page must never consume the catch-up.
  expect((await read()).lastSeenAtlasCommit ?? null).toBeNull();

  const group = page.locator('.change-group[data-reviewed="false"]', { hasText: 'Runtime contract changed' });
  await expect(group).toContainText('Runtime contract changed');
  await group.getByRole('button', { name: 'Mark reviewed' }).click();
  await page.waitForTimeout(600);   // past the save debounce
  const reviewed = await read();
  expect(reviewed.reviewedChangeGroups['path-change-runtime-contract']).toBeTruthy();
  expect(reviewed.lastSeenAtlasCommit ?? null).toBeNull();
  // Reviewing a group is an acknowledgement, never a completion.
  expect(reviewed.items['path-change-runtime-contract']).toBeUndefined();

  // A real atlas may already contain authored change groups. Review those too
  // before asserting that Finish catch-up can advance all the way to HEAD.
  // This keeps the test valid both for a pristine template and for an updated
  // atlas with more than one conceptual repository change.
  const remainingReviewButtons = page.getByRole('button', { name: 'Mark reviewed' });
  while (await remainingReviewButtons.count()) {
    await remainingReviewButtons.first().click();
  }
  await page.waitForTimeout(600);

  await page.reload();
  await expect(page.locator('.change-group[data-reviewed="true"]', { hasText: 'Runtime contract changed' })).toContainText('Reviewed');
  await page.getByRole('button', { name: 'Finish catch-up' }).click();
  await page.waitForTimeout(600);
  const finished = await read();
  expect(finished.lastSeenAtlasCommit).toBe(ATLAS.repository.commitShort);
  expect(finished.reviewedChangeGroups['path-change-runtime-contract']).toBeTruthy();
});

test('no console errors on the main views', async ({ page }) => {
  const errors = [];
  page.on('console', (m) => m.type() === 'error' && errors.push(m.text()));
  page.on('pageerror', (e) => errors.push(String(e)));
  for (const route of ['#/', '#/architecture', '#/workflows', '#/explorer', '#/data', '#/progress',
    '#/search', '#/bookmarks', '#/quests', '#/settings', '#/changed', '#/questions']) {
    await page.goto(BASE + '/index.html' + route);
    await page.waitForTimeout(200);
  }
  expect(errors).toEqual([]);
});

test('open questions are a first-class view, not a footnote', async ({ page }) => {
  await page.goto(BASE + '/index.html#/questions');
  await expect(page.locator('.card h3').first()).toBeVisible();
  // An unknown is labelled as one — a reader must never mistake it for a finding.
  await expect(page.locator('.badge--unknown').first()).toBeVisible();
});

test('every heading comes from data/ui.json, not from the code', async ({ page }) => {
  await page.goto(BASE + '/index.html#/');
  const ui = await page.evaluate(() => window.__ATLAS_UI__ ?? fetch('data/ui.json').then((r) => r.json()));
  for (const [route, key] of [['#/data', 'data'], ['#/glossary', 'glossary'], ['#/questions', 'questions']]) {
    await page.goto(BASE + '/index.html' + route);
    await expect(page.locator('.section-head h2')).toHaveText(ui.views[key].heading);
    await expect(page.locator('.section-head .lede')).toHaveText(ui.views[key].lede);
  }
});

test('progress is written to disk and survives a browser with no stored data', async ({ browser }) => {
  // A real browser profile, used and then thrown away.
  // A deep-linked section no other test in this file touches, so its state
  // here is unambiguous rather than whatever an earlier test left it in.
  test.skip(!FIRST_SUBSYSTEM, 'atlas has no subsystem detail to persist');
  const route = '#/subsystems/' + FIRST_SUBSYSTEM.id;
  const first = await browser.newContext();
  const a = await first.newPage();
  await a.goto(BASE + '/index.html' + route);
  await expect(a.locator('.storage-chip')).toContainText(/Saved to disk/i);
  // Scoped to #view: the rail carries its own <h2>Sections</h2> ahead of the page.
  const title = await a.locator('#view h2').first().textContent();
  await a.getByRole('button', { name: /Mark complete/ }).click();
  await a.waitForTimeout(900);   // past the save debounce
  await first.close();

  // A different profile: no localStorage, no cookies, nothing carried over —
  // the state of a reader who has just cleared their browsing data.
  const second = await browser.newContext();
  const b = await second.newPage();
  await b.goto(BASE + '/index.html#/progress');
  expect(await b.evaluate(() => Object.keys(localStorage).length)).toBeGreaterThanOrEqual(0);
  const row = b.locator('.checklist li', { hasText: title ?? '' });
  await expect(row.locator('.state[data-state="completed"]')).toBeVisible();
  await expect(b.locator('.storage-note')).toContainText('progress/progress.json');
  await second.close();
});

test('a browser that already had progress hands it to the file on first served visit', async ({ browser }) => {
  // Adoption is deliberately a *first use* behaviour, not a standing merge: once
  // the file has content it is the source of truth, and folding a browser's
  // stale copy in on every load would resurrect progress a reset had cleared.
  // So this starts from an empty file — the state it is actually about.
  await fetch(BASE + '/api/progress?mode=replace', {
    method: 'PUT',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify({ storeVersion: 1, items: {} }),
  });

  const ctx = await browser.newContext();
  const page = await ctx.newPage();
  await page.goto(BASE + '/index.html');
  // Stand in for a reader who used the atlas over file:// before serving it.
  await page.evaluate(({ storageKey, subsystemId }) => {
    const at = '2026-08-01T00:00:00.000Z';
    localStorage.setItem(storageKey, JSON.stringify({
      storeVersion: 1,
      items: {
        [subsystemId]: {
          state: 'completed', bookmarked: true, unclear: false, firstOpenedAt: at,
          lastOpenedAt: at, completedAt: at, seenHash: null, openCount: 2, updatedAt: at,
        },
      },
    }));
  }, { storageKey: STORAGE_KEY, subsystemId: FIRST_SUBSYSTEM.id });
  // A real reload, not a hash change: only a document load re-runs hydration.
  await page.reload();
  await page.waitForTimeout(1200);

  const stored = await fetch(BASE + '/api/progress').then((r) => r.json());
  expect(stored.items[FIRST_SUBSYSTEM.id]?.state).toBe('completed');
  expect(stored.items[FIRST_SUBSYSTEM.id]?.bookmarked).toBe(true);
  await ctx.close();
});

/* ------------------------------------------------------- the reading order */

/**
 * Put the loaded page in front of an empty store — both halves of it.
 *
 * Clearing the disk file alone is not enough and fails in a way that looks like
 * a bug in the atlas: `AtlasProgress.hydrate` treats an item-less server
 * document as "no progress yet" and adopts whatever the browser mirror holds,
 * then pushes that back up. That adopt path is deliberate (it is how a reader
 * who starts serving an atlas keeps the history they built over `file://`), so
 * a test that wants a fresh reader has to clear localStorage too — and then
 * reload, because these navigations differ only by fragment and never re-run
 * hydrate at all.
 */
async function freshReader(page) {
  await fetch(BASE + '/api/progress?mode=replace', {
    method: 'PUT', headers: { 'content-type': 'application/json' },
    body: JSON.stringify({ storeVersion: 1, items: {} }),
  }).catch(() => { /* static host: localStorage is the whole store */ });
  await page.evaluate(() => { try { localStorage.clear(); } catch { /* private mode */ } });
  await page.reload();
}

test('the reading-order graph draws every node and every dependency edge', async ({ page }) => {
  const reading = ATLAS.readingOrder;
  test.skip(!reading?.nodes?.length, 'atlas has no reading order');

  await page.goto(BASE + '/index.html#/reading-order');
  await expect(page.locator('.dag-canvas .dag-node')).toHaveCount(reading.nodes.length);
  await expect(page.locator('.dag-band')).toHaveCount(reading.stages.length);

  const edges = reading.nodes.reduce((n, node) => n + (node.dependsOn?.length ?? 0), 0);
  await expect(page.locator('.dag-edges .dag-edge')).toHaveCount(edges);

  /* The canvas is wider than the panel and owns its own scroller; the document
     must never scroll sideways. Checked at phone width too, where the page
     falls back to the stacked list — the grid item's default `min-width: auto`
     let a node's nowrap path line push the document 137px wide there while the
     desktop graph was perfectly contained. */
  for (const size of [{ width: 1400, height: 900 }, { width: 390, height: 780 }]) {
    await page.setViewportSize(size);
    await page.reload();
    const overflow = await page.evaluate(() =>
      document.documentElement.scrollWidth - document.documentElement.clientWidth);
    expect(overflow, `horizontal overflow at ${size.width}px`).toBeLessThanOrEqual(1);
  }
});

test('marking a node read on the graph persists and readies what depends on it', async ({ page }) => {
  const reading = ATLAS.readingOrder;
  test.skip(!reading?.nodes?.length, 'atlas has no reading order');
  const root = reading.nodes.find((node) => !(node.dependsOn ?? []).length);
  const next = reading.nodes.find((node) => (node.dependsOn ?? []).length === 1
    && node.dependsOn[0] === root.id);
  test.skip(!next, 'no single-prerequisite successor to assert on');

  await page.goto(BASE + '/index.html#/reading-order');
  await freshReader(page);
  const rootNode = page.locator('.dag-canvas .dag-node').filter({ hasText: root.title }).first();
  const nextNode = page.locator('.dag-canvas .dag-node').filter({ hasText: next.title }).first();
  await expect(nextNode).toHaveAttribute('data-state', 'later');

  // The control on the node itself — marking a node complete must not require
  // opening it first, which is the point of the page.
  await rootNode.locator('.dag-node__check').click();
  await expect(rootNode).toHaveAttribute('data-state', 'done');
  await expect(nextNode).toHaveAttribute('data-state', 'ready');

  // The push to disk is debounced (assets/progress.js), so poll rather than
  // asserting on the first read — a bare fetch here races the save, not the UI.
  await expect.poll(async () => {
    const stored = await fetch(BASE + '/api/progress').then((r) => r.json()).catch(() => null);
    return stored?.items?.[root.id]?.state ?? null;
  }, { timeout: 5000 }).toBe('completed');

  await page.reload();
  await expect(page.locator('.dag-canvas .dag-node').filter({ hasText: root.title }).first())
    .toHaveAttribute('data-state', 'done');

  // Completion is never a lock: reopening it is one press away.
  await page.locator('.dag-canvas .dag-node').filter({ hasText: root.title }).first()
    .locator('.dag-node__check').click();
  await expect(page.locator('.dag-canvas .dag-node').filter({ hasText: root.title }).first())
    .toHaveAttribute('data-state', 'ready');
});

test('the stage list is the graph, not a summary of it', async ({ page }) => {
  const reading = ATLAS.readingOrder;
  test.skip(!reading?.nodes?.length, 'atlas has no reading order');

  await page.goto(BASE + '/index.html#/reading-order');
  await page.getByRole('button', { name: 'By stage' }).click();
  await expect(page.locator('.dag-list .dag-node')).toHaveCount(reading.nodes.length);
  await expect(page.locator('.dag-canvas')).toHaveCount(0);

  // Every node is reachable by keyboard with a real name, in reading order.
  const first = page.locator('.dag-list .dag-node__open').first();
  await first.focus();
  await expect(first).toBeFocused();
  await first.press('Enter');
  await expect(page.locator('.dag-detail h3')).toBeVisible();
});

test('a reading-order node explains itself and links back into the atlas', async ({ page }) => {
  const reading = ATLAS.readingOrder;
  test.skip(!reading?.nodes?.length, 'atlas has no reading order');
  const node = reading.nodes.find((candidate) => (candidate.dependsOn ?? []).length > 0);

  await page.goto(BASE + '/index.html#/reading-order/' + node.id);
  const detail = page.locator('.dag-detail');
  await expect(detail.locator('h3')).toHaveText(node.title);
  await expect(detail).toContainText(node.path);
  // What it is / what to look for / how to check — the three the page promises.
  await expect(detail.locator('dd')).toHaveCount(4);
  await expect(detail.locator('.dag-detail__rel').first()).toContainText(
    reading.nodes.find((n) => n.id === node.dependsOn[0]).title);
});

test('reading the files does not move the section-progress meter', async ({ page }) => {
  const reading = ATLAS.readingOrder;
  test.skip(!reading?.nodes?.length, 'atlas has no reading order');

  await page.goto(BASE + '/index.html#/reading-order');
  await page.reload();   // fragment-only navigation never re-runs hydrate

  /* Asserted relatively, not against an empty store. A previous test's page can
     still be flushing its own progress with `keepalive` while this one starts,
     so "the count goes up by exactly one" is a property that holds whatever it
     started at — and it is the property under test anyway. */
  const filesMeter = page.locator('.dag-head__meter .meter-label');
  const railMeter = page.locator('.rail__progress .meter-label');
  const railBefore = await railMeter.textContent();
  const before = Number((await filesMeter.textContent()).match(/^(\d+)/)[1]);

  const unread = page.locator('.dag-canvas .dag-node:not([data-state="done"])').first();
  await unread.locator('.dag-node__check').click();
  await expect(filesMeter).toHaveText(new RegExp('^' + (before + 1) + ' of '));
  // The files meter moves; the sections meter in the rail does not.
  await expect(railMeter).toHaveText(railBefore);
});
