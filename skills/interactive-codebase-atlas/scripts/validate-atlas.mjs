#!/usr/bin/env node
/**
 * validate-atlas.mjs — structural and factual validation of an atlas.
 *
 *   node validate-atlas.mjs [atlas-path] [--repo <path>] [--no-write]
 *
 * Checks:
 *   1. data/atlas.json parses and has the required top-level shape
 *   2. every item has a stable id, confidence, sources, and three depth levels
 *   3. ids are unique and every cross-reference resolves
 *   4. every sources[].path exists at repository.commit; named symbols still appear
 *   5. no secret-shaped strings leaked into atlas content
 *   6. contentHash is recomputed for change detection
 *   7. data/ui.json has every key assets/atlas.js asks for, and every field
 *      row's compute name is one atlas.js registers
 *   8. data/atlas.bundle.js is regenerated so the atlas works over file://
 *
 * Exit 0 = clean or warnings only. Exit 1 = errors. Exit 2 = usage problem.
 */
import { createHash } from 'node:crypto';
import { execFileSync } from 'node:child_process';
import { existsSync, readFileSync, writeFileSync } from 'node:fs';
import path from 'node:path';

const argv = process.argv.slice(2);
const atlasDir = path.resolve(argv.find((a) => !a.startsWith('--')) ?? process.cwd());
const repoOverride = argv.includes('--repo') ? argv[argv.indexOf('--repo') + 1] : null;
const write = !argv.includes('--no-write');

const errors = [];
const warnings = [];
const err = (m) => errors.push(m);
const warn = (m) => warnings.push(m);

const dataPath = path.join(atlasDir, 'data', 'atlas.json');
if (!existsSync(dataPath)) {
  console.error(`validate-atlas: no data/atlas.json under ${atlasDir}`);
  process.exit(2);
}

let atlas;
try {
  atlas = JSON.parse(readFileSync(dataPath, 'utf8'));
} catch (e) {
  console.error(`validate-atlas: data/atlas.json is not valid JSON — ${e.message}`);
  process.exit(1);
}

/* ------------------------------------------------- 1a. the template layer -- */

/* data/ui.json holds every user-facing string, field table and nav entry. It is
   curated, never regenerated — but atlas.js reads it by dotted key, so a typo or
   a deleted key blanks part of the interface with no runtime error. These checks
   are what make editing ui.json safe: every key the code asks for must exist,
   and every computation a field row names must be registered in atlas.js. */

const uiPath = path.join(atlasDir, 'data', 'ui.json');
let ui = null;
if (!existsSync(uiPath)) {
  err('data/ui.json is missing — the atlas renders no labels without it');
} else {
  try {
    ui = JSON.parse(readFileSync(uiPath, 'utf8'));
  } catch (e) {
    err(`data/ui.json is not valid JSON — ${e.message}`);
  }
}

const dig = (root, dotted) =>
  String(dotted).split('.').reduce((cur, part) => (cur == null ? undefined : cur[part]), root);

let uiKeysChecked = 0;
if (ui) {
  const atlasJsPath = path.join(atlasDir, 'assets', 'atlas.js');
  const src = existsSync(atlasJsPath) ? readFileSync(atlasJsPath, 'utf8') : '';

  // T('a.b'), UI.get('a.b', …), UI.has('a.b'), UI.empty('a.b'), UI.sectionHead('x')
  const asked = new Set();
  for (const m of src.matchAll(/\bT\('([\w.-]+)'/g)) asked.add(m[1]);
  for (const m of src.matchAll(/UI\.(?:get|has|empty)\('([\w.-]+)'/g)) asked.add(m[1]);
  for (const m of src.matchAll(/UI\.sectionHead\('([\w-]+)'/g)) {
    asked.add(`views.${m[1]}.heading`);
    asked.add(`views.${m[1]}.lede`);
  }
  for (const m of src.matchAll(/kv\([^,]+,\s*'([\w-]+)'\)/g)) asked.add(`views.${m[1]}.fields`);

  // Keys assembled at runtime from a variable suffix are listed once, here.
  const dynamic = [
    ...['verified', 'inferred', 'unknown'].map((c) => `badges.confidenceTitles.${c}`),
    ...['not-started', 'started', 'viewed', 'completed'].flatMap((s) => [`states.labels.${s}`, `states.icons.${s}`]),
    ...['explore', 'continue', 'what-changed', 'review-unfinished', 'follow-one-action',
        'follow-one-action-fallback', 'default-one', 'default'].map((k) => `views.home.pathMeta.${k}`),
    ...['previous', 'next', 'finish', 'play', 'pause', 'replay', 'bigPicture', 'showCode', 'hideCode',
        'showFailure', 'hideFailure', 'showTests', 'hideTests', 'explainMore', 'explainLess']
      .map((k) => `views.simulator.controls.${k}`),
    ...['all', 'unfinished', 'bookmarked', 'unclear', 'changed'].map((f) => `views.progress.empty.${f}.title`),
    'actions.complete', 'actions.completed', 'actions.bookmark', 'actions.bookmarked',
    'actions.unclear', 'actions.unclearOn',
    'chrome.theme.toLight', 'chrome.theme.toDark',
    ...['file', 'browser'].flatMap((m) => [
      `chrome.storage.${m}.label`, `chrome.storage.${m}.title`, `views.progress.storage.${m}`]),
    'chrome.storage.file.errorLabel', 'chrome.storage.file.errorTitle',
    'sectionTitles.section-auth', 'sectionTitles.section-delivery',
    'views.explorer.empty.recently-changed.title', 'views.explorer.empty.unexplored.title',
    'views.home.pathMeta.reading-order',
    ...['done', 'ready', 'later'].flatMap((s) => [
      `views.readingOrder.stateLabels.${s}`, `views.readingOrder.stateIcons.${s}`]),
    'views.readingOrder.markRead', 'views.readingOrder.markedRead',
    'views.readingOrder.detailEmpty.title', 'views.readingOrder.detailEmpty.body',
    'views.readingOrder.empty.title', 'views.readingOrder.empty.body',
    'sectionTitles.section-reading-order',
    'chrome.ambient.on', 'chrome.ambient.off',
    // Every collection `collect()` indexes gets a reader-facing name in search
    // results and in the empty-query index summary.
    ...['components', 'areas', 'files', 'connections', 'workflows', 'steps', 'entities', 'channels', 'subsystems',
        'changePlaybooks', 'glossary', 'knowledgeChecks', 'openQuestions', 'learningPaths',
        'readingOrder', 'auth', 'delivery'].map((k) => `search.kindLabels.${k}`),
    ...['depth', 'theme', 'ambient', 'focus'].flatMap((r) => [
      `views.settings.rows.${r}.title`, `views.settings.rows.${r}.body`]),
    // viewProgress() is reached both as its own page and as the Bookmarks view,
    // so its heading pair is chosen by a variable rather than a literal.
    'views.bookmarks.heading', 'views.bookmarks.lede',
  ];
  for (const k of dynamic) asked.add(k);

  for (const key of asked) {
    // A key built by concatenation — T('states.labels.' + s) — is captured as its
    // literal prefix. The variable half is covered by the `dynamic` list above.
    if (key.endsWith('.')) continue;
    uiKeysChecked += 1;
    if (dig(ui, key) === undefined) err(`data/ui.json is missing key "${key}" (asked for by assets/atlas.js)`);
  }

  // Every {compute:"x"} in a field list must be a computation atlas.js registers.
  const registered = new Set();
  const computedBlock = src.match(/var COMPUTED = \{([\s\S]*?)\n  \};/);
  if (computedBlock) for (const m of computedBlock[1].matchAll(/^\s{4}(\w+):/gm)) registered.add(m[1]);
  const checkFieldList = (list, where) => {
    if (!Array.isArray(list)) return err(`${where} is not an array of field rows`);
    list.forEach((row, i) => {
      const at = `${where}[${i}]`;
      if (!row || typeof row !== 'object') return err(`${at} is not a field row`);
      if (!row.label) err(`${at} has no label`);
      if (row.compute && registered.size && !registered.has(row.compute)) {
        err(`${at}: computes "${row.compute}", which atlas.js does not register in COMPUTED`);
      }
      if (!row.compute && !row.from) warn(`${at}: field "${row.label}" reads nothing (no "from", no "compute")`);
    });
  };
  const walkForFieldLists = (node, where) => {
    if (!node || typeof node !== 'object' || Array.isArray(node)) return;
    for (const [k, v] of Object.entries(node)) {
      if (/^(\w+)?[Ff]ields$/.test(k)) checkFieldList(v, `${where}.${k}`);
      else walkForFieldLists(v, `${where}.${k}`);
    }
  };
  walkForFieldLists(ui.views ?? {}, 'ui.views');
}

/* ---------------------------------------------------------- 1. top level -- */

for (const key of ['atlasSchemaVersion', 'skillVersion', 'repository', 'meta', 'learningPaths']) {
  if (!(key in atlas)) err(`missing required top-level key: ${key}`);
}

const repoMeta = atlas.repository ?? {};
for (const key of [
  'name', 'path', 'commit', 'commitShort', 'commitSubject', 'commitTimestamp',
  'generatedAt', 'workingTreeClean', 'dirtyFiles', 'detached', 'atlasLocation',
]) {
  if (!(key in repoMeta)) err(`repository.${key} is missing`);
}

if (repoMeta.commit && repoMeta.commitShort && !repoMeta.commit.startsWith(repoMeta.commitShort)) {
  err('repository.commitShort is not a prefix of repository.commit');
}

if (!Array.isArray(atlas.updateHistory) || atlas.updateHistory.length === 0) {
  warn('updateHistory is empty — the "What changed?" path has nothing to show');
}

const repoRoot = path.resolve(repoOverride ?? repoMeta.path ?? '.');
const repoReadable = existsSync(repoRoot);
if (!repoReadable) warn(`repository path not readable (${repoRoot}) — source references were not checked`);

const gitBaseArgs = ['-c', `safe.directory=${repoRoot}`, '-C', repoRoot];
function git(...args) {
  return execFileSync('git', [...gitBaseArgs, ...args], {
    encoding: 'utf8', stdio: ['ignore', 'pipe', 'ignore'], maxBuffer: 16 * 1024 * 1024,
  });
}
let snapshotReadable = false;
let snapshotPaths = null;
const snapshotBlobs = new Map();
if (repoReadable && repoMeta.commit) {
  try {
    git('cat-file', '-e', `${repoMeta.commit}^{commit}`);
    snapshotReadable = true;
  } catch {
    warn(`recorded commit ${repoMeta.commitShort ?? repoMeta.commit} is unavailable — source references fall back to the working tree`);
  }
}

function normalizedRepoPath(rel) {
  const raw = String(rel ?? '').replace(/\\/g, '/').replace(/^\.\//, '');
  if (!raw || path.isAbsolute(String(rel)) || raw === '..' || raw.startsWith('../')) return null;
  return raw;
}

if (snapshotReadable) {
  snapshotPaths = new Set(git('ls-tree', '-r', '--name-only', repoMeta.commit)
    .split(/\r?\n/).filter(Boolean));

  const referencedPaths = new Set();
  (function collectPaths(node) {
    if (Array.isArray(node)) return node.forEach(collectPaths);
    if (!node || typeof node !== 'object') return;
    for (const [key, value] of Object.entries(node)) {
      if (key === 'path' && typeof value === 'string') {
        const normalized = normalizedRepoPath(value);
        if (normalized && snapshotPaths.has(normalized)) referencedPaths.add(normalized);
      } else collectPaths(value);
    }
  })(atlas);

  const referencedList = [...referencedPaths];
  const specs = referencedList.map((rel) => `${repoMeta.commit}:${rel}`);
  if (specs.length) {
    const raw = execFileSync('git', [...gitBaseArgs, 'cat-file', '--batch'], {
      input: specs.join('\n') + '\n', encoding: null,
      stdio: ['pipe', 'pipe', 'ignore'], maxBuffer: 128 * 1024 * 1024,
    });
    let cursor = 0;
    for (let i = 0; i < specs.length; i += 1) {
      const lineEnd = raw.indexOf(10, cursor);
      const header = raw.subarray(cursor, lineEnd).toString('utf8');
      cursor = lineEnd + 1;
      if (header.endsWith(' missing')) continue;
      const parts = header.split(' ');
      const size = Number(parts[2]);
      const body = raw.subarray(cursor, cursor + size);
      cursor += size + 1;
      if (parts[1] === 'blob') snapshotBlobs.set(referencedList[i], body.toString('utf8'));
    }
  }
}

function repoPathExists(rel) {
  const normalized = normalizedRepoPath(rel);
  if (!normalized) return false;
  if (snapshotReadable) {
    return snapshotPaths.has(normalized) || [...snapshotPaths].some((file) => file.startsWith(normalized.replace(/\/$/, '') + '/'));
  }
  const abs = path.resolve(repoRoot, normalized);
  return (abs === repoRoot || abs.startsWith(repoRoot + path.sep)) && existsSync(abs);
}

/* ------------------------------------------------------- 2. collections -- */

const COLLECTIONS = {
  components: 'component-',
  connections: 'channel-',
  workflows: 'workflow-',
  entities: 'entity-',
  channels: 'channel-',
  subsystems: 'subsystem-',
  changePlaybooks: 'playbook-',
  glossary: 'term-',
  knowledgeChecks: 'check-',
  openQuestions: 'question-',
  learningPaths: 'path-',
};
const SINGLETONS = ['auth', 'delivery'];
/* Workflows carry their explanation in their steps and recap, not in a depth
   block — the reader changes depth per step. Everything else authors all three. */
const NEEDS_DEPTH = new Set(['components', 'entities', 'channels', 'subsystems']);
const NEEDS_SOURCES = new Set(['components', 'workflows', 'entities', 'channels', 'subsystems']);
const CONFIDENCE = new Set(['verified', 'inferred', 'unknown']);
const CHANGE_STATES = new Set(['new', 'updated', 'unchanged', 'removed']);

const ids = new Map();
const items = []; // { item, where, collection }

function registerId(item, where) {
  if (!item || typeof item !== 'object') return;
  if (!item.id) { err(`${where}: item has no id`); return; }
  if (!/^[a-z][a-z0-9]*(-[a-z0-9]+)+$/.test(item.id)) {
    warn(`${where}: id "${item.id}" is not kind-prefixed kebab-case`);
  }
  if (ids.has(item.id)) err(`duplicate id "${item.id}" (${ids.get(item.id)} and ${where})`);
  else ids.set(item.id, where);
}

for (const [collection, prefix] of Object.entries(COLLECTIONS)) {
  const list = atlas[collection];
  if (list === undefined) continue;
  if (!Array.isArray(list)) { err(`${collection} must be an array`); continue; }
  list.forEach((item, i) => {
    const where = `${collection}[${i}]`;
    registerId(item, where);
    if (item?.id && !item.id.startsWith(prefix) && collection !== 'connections') {
      warn(`${where}: id "${item.id}" should start with "${prefix}"`);
    }
    items.push({ item, where, collection });

    if (item?.confidence && !CONFIDENCE.has(item.confidence)) {
      err(`${where}: confidence "${item.confidence}" is not verified|inferred|unknown`);
    }
    if (item?.changed?.state && !CHANGE_STATES.has(item.changed.state)) {
      err(`${where}: changed.state "${item.changed.state}" is not new|updated|unchanged|removed`);
    }
    if (NEEDS_DEPTH.has(collection)) {
      for (const level of ['simple', 'balanced', 'deep']) {
        const text = item?.depth?.[level];
        if (!text || !String(text).trim()) err(`${where}: depth.${level} is empty`);
        else if (level !== 'deep' && String(text).split(/\s+/).length > 90) {
          warn(`${where}: depth.${level} is long (${String(text).split(/\s+/).length} words) — aim for 2–4 short sentences`);
        }
      }
      if (!Array.isArray(item?.why) || item.why.length === 0) {
        warn(`${where}: no "why" entries — readers need the reason, not only the description`);
      }
    }
    if (NEEDS_SOURCES.has(collection)) {
      if (!Array.isArray(item?.sources) || item.sources.length === 0) {
        err(`${where}: no sources — every architectural claim needs repository evidence`);
      }
    }
    // A hook is what makes a reader open the next section. Grounded, not generic.
    if ((collection === 'workflows' || collection === 'subsystems') && !item?.hook) {
      warn(`${where}: no hook — sections without a curiosity opener get skipped`);
    }
  });
}

for (const key of SINGLETONS) {
  const item = atlas[key];
  if (item == null) continue;
  registerId(item, key);
  items.push({ item, where: key, collection: key });
}

for (const [collection, list, prefix] of [
  ['areas', atlas.explorer?.groups ?? [], 'area-'],
  ['files', atlas.explorer?.files ?? [], 'file-'],
]) {
  list.forEach((item, i) => {
    const where = `explorer.${collection}[${i}]`;
    registerId(item, where);
    if (item?.id && !item.id.startsWith(prefix)) {
      if (collection === 'areas' && item.id.startsWith('group-')) {
        warn(`${where}: published legacy id "${item.id}" is preserved; use "area-" for new areas`);
      } else {
        err(`${where}: id "${item.id}" must start with "${prefix}"`);
      }
    }
    if (!Array.isArray(item?.sources) || item.sources.length === 0) {
      err(`${where}: no sources — every explorer detail needs repository evidence`);
    }
    if (!item?.confidence) err(`${where}: missing confidence`);
    if (!item?.whyItMatters) err(`${where}: missing whyItMatters`);
    if (collection === 'areas' && (!Array.isArray(item?.paths) || item.paths.length === 0)) {
      err(`${where}: no paths — an area must identify the repository territory it explains`);
    }
    if (collection === 'files' && !item?.parentId) {
      err(`${where}: missing parentId — every key-file building belongs to an area`);
    }
    items.push({ item, where, collection });
  });
}

/* ------------------------------------------------------- 2b. readingOrder -- */

/* The reading-order graph must actually be a graph a reader can follow: a DAG,
   laid out so that a node's prerequisites are always earlier — either in an
   earlier stage, or earlier inside the same stage. That single rule is what
   makes the drawn layout (stage = row, authored index = column) correct by
   construction rather than by luck, and it makes a cycle unrepresentable. */
const reading = atlas.readingOrder;
if (reading != null) {
  if (reading.id) registerId(reading, 'readingOrder');
  const stageIndex = new Map();
  (reading.stages ?? []).forEach((stage, i) => {
    if (!stage?.id) return err(`readingOrder.stages[${i}]: missing id`);
    if (!stage.id.startsWith('stage-')) err(`readingOrder.stages[${i}]: id "${stage.id}" must start with "stage-"`);
    if (stageIndex.has(stage.id)) err(`readingOrder.stages[${i}]: duplicate stage id "${stage.id}"`);
    stageIndex.set(stage.id, i);
    if (!stage.name) err(`readingOrder.stages[${i}]: missing name`);
  });
  if (!stageIndex.size) err('readingOrder: no stages');

  const nodes = reading.nodes ?? [];
  if (!Array.isArray(nodes) || nodes.length === 0) err('readingOrder: no nodes');
  const rank = new Map();  // node id -> [stage index, index within stage]
  const perStage = new Map();
  nodes.forEach((node, i) => {
    const where = `readingOrder.nodes[${i}]`;
    registerId(node, where);
    if (node?.id && !node.id.startsWith('read-')) err(`${where}: id "${node.id}" must start with "read-"`);
    for (const key of ['title', 'path', 'what', 'lookFor', 'validate']) {
      if (!node?.[key] || !String(node[key]).trim()) err(`${where}: ${key} is empty`);
    }
    if (!Array.isArray(node?.sources) || node.sources.length === 0) {
      err(`${where}: no sources — a reading step names a real file at the recorded commit`);
    }
    if (!stageIndex.has(node?.stage)) err(`${where}: stage "${node?.stage}" is not a declared stage`);
    const si = stageIndex.get(node?.stage) ?? -1;
    const within = (perStage.get(node?.stage) ?? 0);
    perStage.set(node?.stage, within + 1);
    if (node?.id) rank.set(node.id, [si, within]);
    items.push({ item: node, where, collection: 'readingOrder' });
  });

  nodes.forEach((node, i) => {
    const where = `readingOrder.nodes[${i}]`;
    const mine = rank.get(node?.id);
    for (const dep of node?.dependsOn ?? []) {
      const theirs = rank.get(dep);
      if (!theirs) { err(`${where}: dependsOn "${dep}" is not a reading-order node`); continue; }
      if (!mine) continue;
      const earlier = theirs[0] < mine[0] || (theirs[0] === mine[0] && theirs[1] < mine[1]);
      if (!earlier) {
        err(`${where}: dependsOn "${dep}" is not earlier in the reading order — the graph must stay acyclic and forward-only`);
      }
    }
    // Components and explorer files are registered above, so these resolve here.
    for (const ref of [node?.fileId, node?.componentId]) {
      if (ref != null && !ids.has(ref)) err(`${where}: "${ref}" does not resolve to any atlas item`);
    }
  });

  const orphanStages = [...stageIndex.keys()].filter((id) => !perStage.get(id));
  for (const id of orphanStages) warn(`readingOrder: stage "${id}" has no nodes`);
}

// Workflow steps are progress-tracked items in their own right.
for (const [wi, wf] of (atlas.workflows ?? []).entries()) {
  if (!Array.isArray(wf?.steps) || wf.steps.length === 0) {
    err(`workflows[${wi}] (${wf?.id}): has no steps`);
    continue;
  }
  if (wf.steps.length > 14) warn(`workflows[${wi}] (${wf.id}): ${wf.steps.length} steps — long stories lose the thread`);
  wf.steps.forEach((step, si) => {
    const where = `workflows[${wi}].steps[${si}]`;
    registerId(step, where);
    items.push({ item: step, where, collection: 'steps' });
    for (const key of ['plain', 'why']) {
      if (!step?.[key] || !String(step[key]).trim()) err(`${where}: ${key} is empty`);
    }
    if (!step?.source?.path) warn(`${where}: no source file`);
    if (step?.excerpt?.code && String(step.excerpt.code).split('\n').length > 20) {
      warn(`${where}: excerpt is ${String(step.excerpt.code).split('\n').length} lines — keep excerpts short`);
    }
  });
}

/* ------------------------------------------------ 3. cross-reference ids -- */

function checkRef(id, where, label) {
  if (id == null) return;
  if (!ids.has(id)) err(`${where}: ${label} "${id}" does not resolve to any item`);
}
for (const c of atlas.connections ?? []) {
  checkRef(c.from, `connection ${c.id}`, 'from');
  checkRef(c.to, `connection ${c.id}`, 'to');
}
for (const p of atlas.learningPaths ?? []) {
  for (const sid of p.stepIds ?? []) {
    if (!ids.has(sid) && !String(sid).startsWith('section-')) {
      err(`learningPath ${p.id}: step "${sid}" does not resolve`);
    }
  }
  if (!Array.isArray(p.stepIds) || p.stepIds.length === 0) err(`learningPath ${p.id}: has no steps`);
}
for (const e of atlas.entities ?? []) {
  for (const r of e.relationships ?? []) checkRef(r.to, `entity ${e.id}`, 'relationship target');
  for (const cid of [...(e.createdBy ?? []), ...(e.readBy ?? [])]) checkRef(cid, `entity ${e.id}`, 'component');
}
for (const ch of atlas.channels ?? []) {
  for (const cid of ch.connectionIds ?? []) checkRef(cid, `channel ${ch.id}`, 'connection');
}
for (const k of atlas.knowledgeChecks ?? []) {
  checkRef(k.attachedTo, `knowledgeCheck ${k.id}`, 'attachedTo');
  const correct = (k.options ?? []).filter((o) => o.correct).length;
  if (correct !== 1) err(`knowledgeCheck ${k.id}: needs exactly one correct option (found ${correct})`);
  if (!k.explanation) err(`knowledgeCheck ${k.id}: missing explanation`);
}
for (const group of atlas.explorer?.groups ?? []) {
  for (const id of group.componentIds ?? []) checkRef(id, `area ${group.id}`, 'component');
  for (const id of group.keyFileIds ?? []) checkRef(id, `area ${group.id}`, 'key file');
}
for (const file of atlas.explorer?.files ?? []) {
  checkRef(file.parentId, `file ${file.id}`, 'parent area');
  checkRef(file.componentId, `file ${file.id}`, 'component');
  for (const id of [...(file.dependencies ?? []), ...(file.dependents ?? [])]) {
    checkRef(id, `file ${file.id}`, 'file relationship');
  }
}

/* ------------------------------------------------- 4. source references -- */

const fileCache = new Map();
function readRepoFile(rel) {
  if (fileCache.has(rel)) return fileCache.get(rel);
  const normalized = normalizedRepoPath(rel);
  let text = null;
  if (normalized && snapshotReadable) {
    text = snapshotBlobs.get(normalized) ?? null;
  } else if (normalized) {
    const abs = path.resolve(repoRoot, normalized);
    text = repoPathExists(normalized) ? safeRead(abs) : null;
  }
  fileCache.set(rel, text);
  return text;
}
function safeRead(abs) {
  try { return readFileSync(abs, 'utf8'); } catch { return null; }
}

let refTotal = 0;
let refOk = 0;

function checkSource(src, where) {
  if (!src || !src.path) return;
  refTotal += 1;
  if (!repoReadable) return;
  if (!repoPathExists(src.path)) {
    err(`${where}: source path does not exist at ${snapshotReadable ? `recorded commit ${repoMeta.commitShort}` : 'the working tree'} — ${src.path}`);
    return;
  }
  refOk += 1;
  const text = readRepoFile(src.path);
  if (text == null) return; // directory or binary; existence is enough
  if (src.symbol && !text.includes(src.symbol)) {
    err(`${where}: symbol "${src.symbol}" not found in ${src.path}`);
  }
  if (Array.isArray(src.lines) && src.lines.length === 2) {
    const total = text.split('\n').length;
    if (src.lines[1] > total) {
      warn(`${where}: line range ${src.lines.join('-')} exceeds ${src.path} (${total} lines)`);
    }
  }
}

function walkSources(node, where) {
  if (!node || typeof node !== 'object') return;
  if (Array.isArray(node)) {
    node.forEach((n, i) => walkSources(n, `${where}[${i}]`));
    return;
  }
  for (const [key, value] of Object.entries(node)) {
    if (key === 'sources' && Array.isArray(value)) {
      value.forEach((s, i) => checkSource(s, `${where}.sources[${i}]`));
    } else if ((key === 'source' || key === 'entryPoint' || key === 'startHere') && value?.path) {
      checkSource(value, `${where}.${key}`);
    } else if ((key === 'tests' || key === 'storedAt' || key === 'validatedAt') && Array.isArray(value)) {
      value.forEach((s, i) => checkSource(s, `${where}.${key}[${i}]`));
    } else if (key === 'test' && value?.path) {
      checkSource(value, `${where}.test`);
    } else if (value && typeof value === 'object') {
      walkSources(value, `${where}.${key}`);
    }
  }
}
for (const { item, where } of items) walkSources(item, where);

// keyDirectories / explorer group paths
for (const c of atlas.components ?? []) {
  for (const dir of c.keyDirectories ?? []) {
    refTotal += 1;
    if (!repoReadable) continue;
    if (repoPathExists(dir)) refOk += 1;
    else err(`component ${c.id}: keyDirectory does not exist — ${dir}`);
  }
}
for (const g of atlas.explorer?.groups ?? []) {
  for (const p of g.paths ?? []) {
    refTotal += 1;
    if (!repoReadable) continue;
    if (repoPathExists(p)) refOk += 1;
    else err(`explorer group ${g.id}: path does not exist — ${p}`);
  }
}

/* -------------------------------------------------------- 5. secret scan -- */

const SECRET_PATTERNS = [
  [/\b(?:sk|pk|rk)-[A-Za-z0-9]{16,}\b/, 'API key'],
  [/\bgh[pousr]_[A-Za-z0-9]{20,}\b/, 'GitHub token'],
  [/\bAKIA[0-9A-Z]{16}\b/, 'AWS access key id'],
  [/\bxox[abprs]-[A-Za-z0-9-]{10,}\b/, 'Slack token'],
  [/-----BEGIN (?:RSA |EC |OPENSSH |PGP )?PRIVATE KEY-----/, 'private key'],
  [/\beyJ[A-Za-z0-9_-]{10,}\.[A-Za-z0-9_-]{10,}\.[A-Za-z0-9_-]{10,}/, 'JWT'],
  [/\b[a-z][a-z0-9+.-]*:\/\/[^\s/@]+:[^\s/@]+@/, 'URL with embedded credentials'],
  [/\b(?:password|passwd|secret|api[_-]?key|access[_-]?token|client[_-]?secret)\s*[:=]\s*["'][^"'\s]{8,}["']/i, 'assigned secret value'],
];

function scanSecrets(node, where) {
  if (typeof node === 'string') {
    for (const [re, label] of SECRET_PATTERNS) {
      if (re.test(node)) err(`possible ${label} in ${where} — never write credential values into the atlas`);
    }
    return;
  }
  if (Array.isArray(node)) return node.forEach((n, i) => scanSecrets(n, `${where}[${i}]`));
  if (node && typeof node === 'object') {
    for (const [k, v] of Object.entries(node)) scanSecrets(v, `${where}.${k}`);
  }
}
scanSecrets(atlas, 'atlas');

/* -------------------------------------------------------- 6. contentHash -- */

/* contentHash answers one question: "has what this section *claims about the
   repository* changed since the reader last opened it?" Presentation-only
   fields must stay out of it, or re-theming the world map would tell every
   reader that ten islands changed when nothing about the code did. Note the
   line this draws: `map`/`worldType`/`routeType` are how a thing is drawn, but
   `runtime`, `strength` and `relationshipType` are assertions about the
   relationship itself and stay inside the hash. */
const HASH_EXCLUDE = new Set([
  'contentHash', 'lines', 'generatedAt', 'lastValidatedAt', 'lastOpenedAt',
  'map', 'worldType', 'layoutKey', 'accent', 'routeType'
]);
function hashableClone(node) {
  if (Array.isArray(node)) return node.map(hashableClone);
  if (node && typeof node === 'object') {
    const out = {};
    for (const key of Object.keys(node).sort()) {
      if (HASH_EXCLUDE.has(key)) continue;
      out[key] = hashableClone(node[key]);
    }
    return out;
  }
  return node;
}
let hashed = 0;
for (const { item } of items) {
  if (!item?.id) continue;
  item.contentHash = createHash('sha256')
    .update(JSON.stringify(hashableClone(item)))
    .digest('hex')
    .slice(0, 16);
  hashed += 1;
}

/* ------------------------------------------------ 7. write back + bundle -- */

if (write && errors.length === 0) {
  atlas.repository.lastValidatedAt = new Date().toISOString();
}
if (write && errors.length === 0) {
  writeFileSync(dataPath, JSON.stringify(atlas, null, 2) + '\n', 'utf8');
  const bundle =
    '/* GENERATED by validate-atlas.mjs — do not edit. Mirrors data/atlas.json and\n' +
    '   data/ui.json so the atlas also opens directly over file:// without a server. */\n' +
    'window.__ATLAS__ = ' + JSON.stringify(atlas) + ';\n' +
    'window.__ATLAS_UI__ = ' + JSON.stringify(ui ?? null) + ';\n';
  writeFileSync(path.join(atlasDir, 'data', 'atlas.bundle.js'), bundle, 'utf8');
}

/* ------------------------------------------------------------- report ---- */

const counts = Object.entries(COLLECTIONS)
  .filter(([c]) => Array.isArray(atlas[c]) && atlas[c].length)
  .map(([c]) => `${c} ${atlas[c].length}`)
  .concat(atlas.readingOrder?.nodes?.length
    ? [`readingOrder ${atlas.readingOrder.nodes.length} in ${atlas.readingOrder.stages?.length ?? 0} stages`] : [])
  .join(' · ');

console.log(`atlas       ${atlasDir}`);
console.log(`repository  ${repoRoot}${repoReadable ? snapshotReadable ? ' (recorded commit)' : ' (working tree fallback)' : ' (unreadable)'}`);
console.log(`commit      ${repoMeta.commitShort ?? '?'} — ${repoMeta.commitSubject ?? ''}`);
console.log(`items       ${items.length} (${counts})`);
console.log(`sources     ${refOk}/${refTotal} resolved`);
console.log(`ui.json     ${ui ? `${uiKeysChecked} keys asked for by atlas.js, all present` : 'MISSING'}`);
console.log(`hashes      ${hashed} recomputed${write && errors.length === 0 ? ', bundle regenerated' : ' (not written)'}`);

if (warnings.length) {
  console.log(`\nwarnings (${warnings.length})`);
  for (const w of warnings) console.log(`  warn  ${w}`);
}
if (errors.length) {
  console.log(`\nerrors (${errors.length})`);
  for (const e of errors) console.log(`  ERR   ${e}`);
  console.log('\nvalidate-atlas: FAILED');
  process.exit(1);
}
console.log('\nvalidate-atlas: PASSED');
