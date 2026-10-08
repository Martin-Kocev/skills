/**
 * Data invariants — runs on plain Node, no dependencies.
 *
 *   node --test
 *
 * These guard the properties that quietly break an atlas: unstable ids,
 * missing depth levels, unsourced claims, and drifting bundles.
 */
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync, existsSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

// fileURLToPath, not .pathname: a directory name containing a space arrives
// percent-encoded in the URL and would produce a path that does not exist.
const root = path.resolve(fileURLToPath(new URL('..', import.meta.url)));
const atlas = JSON.parse(readFileSync(path.join(root, 'data', 'atlas.json'), 'utf8'));
const ui = JSON.parse(readFileSync(path.join(root, 'data', 'ui.json'), 'utf8'));

function everyItem() {
  const out = [];
  for (const key of ['components', 'connections', 'workflows', 'entities', 'channels', 'subsystems', 'changePlaybooks', 'glossary', 'knowledgeChecks', 'openQuestions', 'learningPaths']) {
    for (const item of atlas[key] ?? []) {
      out.push({ item, key });
      for (const step of item.steps ?? []) out.push({ item: step, key: 'steps' });
    }
  }
  for (const item of atlas.explorer?.groups ?? []) out.push({ item, key: 'areas' });
  for (const item of atlas.explorer?.files ?? []) out.push({ item, key: 'files' });
  for (const item of atlas.readingOrder?.nodes ?? []) out.push({ item, key: 'readingOrder' });
  for (const key of ['auth', 'delivery']) if (atlas[key]) out.push({ item: atlas[key], key });
  return out;
}

test('records the commit it describes', () => {
  const r = atlas.repository;
  assert.match(r.commit, /^[0-9a-f]{7,40}$/, 'commit must be a hash');
  assert.ok(r.commit.startsWith(r.commitShort), 'commitShort must prefix commit');
  assert.ok(r.commitSubject.length > 0, 'commit subject must be present');
  assert.ok(typeof r.workingTreeClean === 'boolean');
});

test('ids are unique — reader progress depends on it', () => {
  const seen = new Set();
  for (const { item } of everyItem()) {
    if (!item.id) continue;
    assert.ok(!seen.has(item.id), `duplicate id: ${item.id}`);
    seen.add(item.id);
  }
});

test('ids are kind-prefixed kebab-case', () => {
  for (const { item } of everyItem()) {
    if (!item.id) continue;
    assert.match(item.id, /^[a-z][a-z0-9]*(-[a-z0-9]+)+$/, `bad id: ${item.id}`);
  }
});

test('explanations exist at all three depths', () => {
  for (const { item, key } of everyItem()) {
    // Workflows explain themselves through their steps, not a depth block.
    if (!['components', 'entities', 'channels', 'subsystems'].includes(key)) continue;
    for (const level of ['simple', 'balanced', 'deep']) {
      assert.ok(item.depth?.[level]?.trim(), `${item.id}: depth.${level} is empty`);
    }
  }
});

test('default explanations stay short', () => {
  for (const { item } of everyItem()) {
    const text = item.depth?.balanced;
    if (!text) continue;
    assert.ok(text.split(/\s+/).length <= 90, `${item.id}: balanced explanation is a wall of text`);
  }
});

test('every architectural claim carries evidence and a confidence level', () => {
  for (const { item, key } of everyItem()) {
    if (!['components', 'workflows', 'entities', 'subsystems'].includes(key)) continue;
    assert.ok((item.sources ?? []).length > 0, `${item.id}: no sources`);
    assert.ok(['verified', 'inferred', 'unknown'].includes(item.confidence), `${item.id}: bad confidence`);
  }
});

test('connections point at components that exist', () => {
  const ids = new Set((atlas.components ?? []).map((c) => c.id));
  for (const c of atlas.connections ?? []) {
    assert.ok(ids.has(c.from), `${c.id}: unknown from ${c.from}`);
    assert.ok(ids.has(c.to), `${c.id}: unknown to ${c.to}`);
  }
});

test('learning paths lead somewhere real', () => {
  const ids = new Set(everyItem().map(({ item }) => item.id).filter(Boolean));
  for (const p of atlas.learningPaths ?? []) {
    assert.ok((p.stepIds ?? []).length > 0, `${p.id}: has no steps`);
    for (const s of p.stepIds) {
      assert.ok(ids.has(s) || s.startsWith('section-'), `${p.id}: dead step ${s}`);
    }
  }
});

test('knowledge checks have one answer and always explain it', () => {
  for (const k of atlas.knowledgeChecks ?? []) {
    assert.equal((k.options ?? []).filter((o) => o.correct).length, 1, `${k.id}: needs exactly one correct option`);
    assert.ok(k.explanation?.trim(), `${k.id}: missing explanation`);
  }
});

test('every workflow ends with a knowledge check', () => {
  const checked = new Set((atlas.knowledgeChecks ?? []).map((check) => check.attachedTo));
  for (const workflow of atlas.workflows ?? []) {
    assert.ok(checked.has(workflow.id), `${workflow.id}: no end-of-workflow knowledge check`);
  }
});

test('code excerpts stay short', () => {
  for (const w of atlas.workflows ?? []) {
    for (const s of w.steps ?? []) {
      if (!s.excerpt?.code) continue;
      assert.ok(s.excerpt.code.split('\n').length <= 20, `${s.id}: excerpt is too long to be an excerpt`);
    }
  }
});

test('no secret-shaped strings anywhere in the content', () => {
  const patterns = [
    /\b(?:sk|pk)-[A-Za-z0-9]{16,}\b/, /\bgh[pousr]_[A-Za-z0-9]{20,}\b/, /\bAKIA[0-9A-Z]{16}\b/,
    /-----BEGIN (?:RSA |EC )?PRIVATE KEY-----/, /\beyJ[A-Za-z0-9_-]{10,}\.[A-Za-z0-9_-]{10,}\./,
    /\b[a-z][a-z0-9+.-]*:\/\/[^\s/@]+:[^\s/@]+@/
  ];
  const text = JSON.stringify(atlas);
  for (const re of patterns) assert.ok(!re.test(text), `possible secret matching ${re}`);
});

test('the file:// bundle matches both sources of truth', () => {
  const bundlePath = path.join(root, 'data', 'atlas.bundle.js');
  if (!existsSync(bundlePath)) return; // regenerated by validate-atlas.mjs
  const bundle = readFileSync(bundlePath, 'utf8');
  // Two assignments now, one per JSON file. Each is one line ending in ';'.
  const assigned = (name) => {
    const line = bundle.split('\n').find((l) => l.startsWith(`window.${name} = `));
    assert.ok(line, `bundle does not define window.${name}`);
    return JSON.parse(line.slice(`window.${name} = `.length).replace(/;$/, ''));
  };
  assert.deepEqual(assigned('__ATLAS__'), atlas,
    'bundled atlas.json is stale — run validate-atlas.mjs');
  assert.deepEqual(assigned('__ATLAS_UI__'), ui,
    'bundled ui.json is stale — run validate-atlas.mjs');
});

/* ----------------------------------------------------- the reading order -- */

/* The graph is drawn from authored order alone: stage index is the row, index
   inside the stage is the column. That layout is only *correct* if every
   dependency points backwards through that same order — which is also what
   makes the graph acyclic and what makes the list view (stage by stage, in
   order) an honest alternative to the picture rather than a different claim. */
test('the reading order is a forward-only DAG', () => {
  const reading = atlas.readingOrder;
  if (!reading) return;
  const stageAt = new Map((reading.stages ?? []).map((s, i) => [s.id, i]));
  const rank = new Map();
  const perStage = new Map();
  for (const node of reading.nodes ?? []) {
    assert.ok(stageAt.has(node.stage), `${node.id}: unknown stage ${node.stage}`);
    const within = perStage.get(node.stage) ?? 0;
    perStage.set(node.stage, within + 1);
    rank.set(node.id, [stageAt.get(node.stage), within]);
  }
  for (const node of reading.nodes ?? []) {
    const [ms, mi] = rank.get(node.id);
    for (const dep of node.dependsOn ?? []) {
      assert.ok(rank.has(dep), `${node.id}: dependsOn unknown node ${dep}`);
      const [ds, di] = rank.get(dep);
      assert.ok(ds < ms || (ds === ms && di < mi),
        `${node.id}: dependsOn ${dep}, which is not earlier in the reading order`);
    }
  }
});

test('every reading-order node says what it is, what to look for, and how to check', () => {
  for (const node of atlas.readingOrder?.nodes ?? []) {
    for (const key of ['title', 'path', 'what', 'lookFor', 'validate']) {
      assert.ok(node[key]?.trim(), `${node.id}: ${key} is empty`);
    }
    assert.ok((node.sources ?? []).length > 0, `${node.id}: no sources`);
  }
});

/* Reading-order nodes are progress items, so they must stay out of the section
   meter's denominator — folding "files read" into "sections understood" would
   silently move every existing reader's percentage. */
test('reading-order nodes are not counted as atlas sections', () => {
  const TRACKED = ['components', 'workflows', 'entities', 'channels', 'subsystems', 'changePlaybooks'];
  const tracked = new Set();
  for (const kind of TRACKED) for (const item of atlas[kind] ?? []) tracked.add(item.id);
  for (const key of ['auth', 'delivery']) if (atlas[key]?.id) tracked.add(atlas[key].id);
  for (const node of atlas.readingOrder?.nodes ?? []) {
    assert.ok(!tracked.has(node.id), `${node.id} is counted twice`);
  }
  const src = readFileSync(path.join(root, 'assets', 'atlas.js'), 'utf8');
  const fn = src.slice(src.indexOf('function trackedIds()'));
  assert.ok(!fn.slice(0, fn.indexOf('\n  }')).includes('readingOrder'),
    'trackedIds() counts reading-order nodes — the section meter would jump');
});

/* ------------------------------------------------------- the UI template -- */

/* data/ui.json is the whole interface's copy and layout. atlas.js reads it by
   dotted key, so a rename there fails silently at runtime — these tests plus
   validate-atlas.mjs's key sweep are what make editing it safe. */

test('ui.json defines the chrome, every view, and their empty states', () => {
  assert.ok(ui.uiSchemaVersion, 'uiSchemaVersion is missing');
  for (const key of ['theme', 'chrome', 'rail', 'badges', 'states', 'actions', 'notices', 'common', 'views', 'errors']) {
    assert.ok(ui[key], `ui.json has no "${key}" section`);
  }
  for (const view of ['home', 'architecture', 'workflows', 'simulator', 'explorer', 'data',
    'communication', 'auth', 'subsystems', 'delivery', 'change', 'glossary', 'questions',
    'progress', 'changed', 'readingOrder', 'notFound']) {
    assert.ok(ui.views[view], `ui.json has no view "${view}"`);
  }
});

test('every field row names a label and a value to read', () => {
  const walk = (node, where) => {
    if (!node || typeof node !== 'object' || Array.isArray(node)) return;
    for (const [k, v] of Object.entries(node)) {
      if (/[Ff]ields$/.test(k)) {
        assert.ok(Array.isArray(v), `${where}.${k} must be an array`);
        v.forEach((row, i) => {
          assert.ok(row.label, `${where}.${k}[${i}] has no label`);
          assert.ok(row.from || row.compute, `${where}.${k}[${i}] reads nothing`);
        });
      } else walk(v, `${where}.${k}`);
    }
  };
  walk(ui.views, 'views');
});

test('every rail entry points at a route the router serves', () => {
  /* Read the router's own table rather than restating it here. A hand-kept copy
     fails the wrong way round: adding a real route breaks the test, while
     deleting one leaves the fixture claiming it still exists. */
  const src = readFileSync(path.join(root, 'assets', 'atlas.js'), 'utf8');
  const table = src.slice(src.indexOf('var ROUTES = {'));
  const body = table.slice(0, table.indexOf('\n  };'));
  const routes = new Set(['#/', ...[...body.matchAll(/^\s*'([\w-]+)':/gm)].map((m) => `#/${m[1]}`)]);
  assert.ok(routes.size > 5, 'could not read the ROUTES table out of assets/atlas.js');
  for (const entry of [...(ui.rail.nav ?? []), ...(ui.rail.progressNav ?? [])]) {
    assert.ok(routes.has(entry.href), `rail entry "${entry.label}" points at unknown route ${entry.href}`);
    assert.ok(entry.label, `rail entry ${entry.href} has no label`);
  }
});

/* The tour is the atlas's only ordered route through everything it asks a
   reader to complete, so "everything" has to mean the same set on both sides.
   A new tracked collection that no stage names would be silently unreachable
   in reading order while still counting against the progress meter. */
test('the full tour reaches every section the progress meter counts', () => {
  const TRACKED = ['components', 'workflows', 'entities', 'channels', 'subsystems',
    'changePlaybooks', 'auth', 'delivery'];
  const tracked = new Set();
  for (const kind of TRACKED) {
    const coll = atlas[kind];
    if (Array.isArray(coll)) for (const item of coll) { if (item?.id) tracked.add(item.id); }
    else if (coll?.id) tracked.add(coll.id);
  }

  const stages = ui.views?.tour?.stages ?? [];
  assert.ok(stages.length, 'views.tour.stages is empty — the atlas has no reading order');

  const onTour = [];
  for (const stage of stages) {
    assert.ok(stage.title, `tour stage ${stage.id} has no title`);
    assert.ok((stage.kinds ?? []).length, `tour stage ${stage.id} names no collections`);
    for (const kind of stage.kinds) {
      assert.ok(TRACKED.includes(kind),
        `tour stage "${stage.title}" names "${kind}", which progress does not track`);
      const coll = atlas[kind];
      if (Array.isArray(coll)) for (const item of coll) { if (item?.id) onTour.push(item.id); }
      else if (coll?.id) onTour.push(coll.id);
    }
  }

  const missing = [...tracked].filter((id) => !onTour.includes(id));
  assert.deepEqual(missing, [], `tracked sections missing from the tour: ${missing.join(', ')}`);
  assert.equal(onTour.length, new Set(onTour).size, 'a section appears on the tour twice');
  assert.equal(onTour.length, tracked.size);
});

test('atlas.js holds no user-facing copy of its own', () => {
  const src = readFileSync(path.join(root, 'assets', 'atlas.js'), 'utf8');
  // A sentence-shaped string literal in the renderer means a label escaped ui.json.
  // The boot-failure screen is the documented exception: it runs when ui.json
  // could not be read, so it cannot ask ui.json for its wording.
  const body = src.slice(0, src.indexOf('function fail('));
  const prose = [...body.matchAll(/'([A-Z][a-z]+(?: [a-z]+){3,}[^']*)'/g)].map((m) => m[1]);
  assert.deepEqual(prose, [], `copy left in atlas.js: ${prose.join(' | ')}`);
});
