#!/usr/bin/env node
/**
 * git-metadata.mjs — capture the exact repository state an atlas describes.
 *
 *   node git-metadata.mjs [repo-path] [--json|--pretty]
 *
 * Prints the `repository` object for data/atlas.json. Read-only: only
 * inspecting git commands are used, never anything that writes.
 */
import { execFileSync } from 'node:child_process';
import { existsSync } from 'node:fs';
import path from 'node:path';

const args = process.argv.slice(2);
const repoArg = args.find((a) => !a.startsWith('--')) ?? process.cwd();
const pretty = !args.includes('--json');

function gitRaw(cwd, ...cmd) {
  try {
    return execFileSync('git', ['-c', `safe.directory=${cwd}`, ...cmd], {
      cwd,
      encoding: 'utf8',
      stdio: ['ignore', 'pipe', 'ignore'],
      maxBuffer: 32 * 1024 * 1024,
    });
  } catch {
    return null;
  }
}

/* Trimmed: right for the single-value queries (a hash, a branch, a subject).
   Wrong for `status --porcelain`, whose first line begins with a significant
   space — see the -z parse below, which uses gitRaw for exactly that reason. */
function git(cwd, ...cmd) {
  const out = gitRaw(cwd, ...cmd);
  return out === null ? null : out.trim();
}

function fail(message) {
  console.error(`git-metadata: ${message}`);
  process.exit(1);
}

const startDir = path.resolve(repoArg);
if (!existsSync(startDir)) fail(`path does not exist: ${startDir}`);

const root = git(startDir, 'rev-parse', '--show-toplevel');
if (!root) fail(`not a git repository: ${startDir}`);

const repoRoot = path.resolve(root);
const commit = git(repoRoot, 'rev-parse', 'HEAD');
if (!commit) fail('repository has no commits yet — create one before building an atlas');

// Branch: `--abbrev-ref HEAD` yields "HEAD" when detached.
const branchRaw = git(repoRoot, 'rev-parse', '--abbrev-ref', 'HEAD');
const detached = branchRaw === 'HEAD' || branchRaw === null;
const branch = detached ? null : branchRaw;

// Exact tag only; a describe-derived name would misrepresent the state.
const tag = git(repoRoot, 'describe', '--tags', '--exact-match', 'HEAD');

// Prefer the branch's configured upstream remote. Repositories often use a
// canonical name such as `gitlab` or `company`, so assuming `origin` silently
// drops useful identity metadata even when the checkout is configured well.
const upstream = git(repoRoot, 'rev-parse', '--abbrev-ref', '--symbolic-full-name', '@{upstream}');
const remotes = (git(repoRoot, 'remote') ?? '').split('\n').filter(Boolean);
const upstreamRemote = upstream && upstream.includes('/') ? upstream.split('/')[0] : null;
const configuredPushRemote = git(repoRoot, 'config', '--get', 'remote.pushDefault');
const remoteName = upstreamRemote || configuredPushRemote || (remotes.includes('origin') ? 'origin' : remotes[0]) || null;

// Remote URL, stripped of any embedded credentials before it is recorded.
function sanitizeRemote(url) {
  if (!url) return null;
  const scpLike = /^[\w.-]+@([\w.-]+):(.+?)(?:\.git)?$/.exec(url);
  if (scpLike) return `${scpLike[1]}/${scpLike[2]}`;
  try {
    const parsed = new URL(url);
    return `${parsed.host}${parsed.pathname.replace(/\.git$/, '')}`;
  } catch {
    return null;
  }
}

/* `-z` gives NUL-separated records and, crucially, leaves paths *unquoted*:
   the default porcelain wraps anything with a space or a non-ASCII byte in
   quotes with C-style escapes, which is how paths containing spaces
   Logo.png" used to reach the atlas still wearing them. */
const porcelain = gitRaw(repoRoot, 'status', '--porcelain', '-z') ?? '';
const records = porcelain.split('\0').filter(Boolean);
const dirtyFiles = [];
for (let i = 0; i < records.length; i += 1) {
  const record = records[i];
  const code = record.slice(0, 2);
  const file = record.slice(3);
  const renamed = code.includes('R') || code.includes('C');
  // A rename or copy emits a second record holding the *old* path. Consume it
  // so it is never reported as a change of its own.
  if (renamed) i += 1;
  const status =
    code.includes('?') ? 'untracked'
    : code.includes('D') ? 'deleted'
    : code.includes('A') ? 'added'
    : renamed ? 'renamed'
    : 'modified';
  dirtyFiles.push({ path: file, status });
}

const rootCommits = (git(repoRoot, 'rev-list', '--max-parents=0', 'HEAD') ?? '').split('\n');

const meta = {
  name: path.basename(repoRoot),
  path: repoRoot,
  remote: sanitizeRemote(remoteName ? git(repoRoot, 'config', '--get', `remote.${remoteName}.url`) : null),
  branch,
  tag: tag || null,
  detached,
  commit,
  commitShort: commit.slice(0, 7),
  commitSubject: git(repoRoot, 'log', '-1', '--format=%s') ?? '',
  commitTimestamp: git(repoRoot, 'log', '-1', '--format=%cI') ?? null,
  rootCommit: rootCommits[rootCommits.length - 1] || null,
  generatedAt: new Date().toISOString(),
  workingTreeClean: dirtyFiles.length === 0,
  dirtyFiles,
  lastValidatedAt: null,
  atlasLocation: 'sibling',
  gitExcludeApplied: false,
};

process.stdout.write(JSON.stringify(meta, null, pretty ? 2 : 0) + '\n');
