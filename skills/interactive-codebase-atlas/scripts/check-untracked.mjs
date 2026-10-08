#!/usr/bin/env node
/**
 * check-untracked.mjs — prove the atlas is not, and cannot become, part of the
 * repository's Git history.
 *
 *   node check-untracked.mjs <repo-path> <atlas-path>
 *
 * Exit 0 = isolated. Exit 1 = the atlas is visible to Git; fix before reporting.
 */
import { execFileSync } from 'node:child_process';
import { existsSync, readFileSync } from 'node:fs';
import path from 'node:path';

const [repoArg, atlasArg] = process.argv.slice(2);
if (!repoArg || !atlasArg) {
  console.error('usage: node check-untracked.mjs <repo-path> <atlas-path>');
  process.exit(2);
}

function git(cwd, ...cmd) {
  try {
    return execFileSync('git', ['-c', `safe.directory=${cwd}`, ...cmd], {
      cwd, encoding: 'utf8', stdio: ['ignore', 'pipe', 'ignore'],
      maxBuffer: 32 * 1024 * 1024,
    }).trim();
  } catch {
    return null;
  }
}

const repoRoot = git(path.resolve(repoArg), 'rev-parse', '--show-toplevel');
if (!repoRoot) {
  console.error(`check-untracked: not a git repository: ${repoArg}`);
  process.exit(2);
}

const repo = path.resolve(repoRoot);
const atlas = path.resolve(atlasArg);
const problems = [];
const notes = [];

// Is the atlas inside the repository working tree?
const rel = path.relative(repo, atlas);
const inside = rel !== '' && !rel.startsWith('..') && !path.isAbsolute(rel);
const relPosix = inside ? rel.split(path.sep).join('/') : null;

if (!inside) {
  notes.push(`atlas is outside the repository (${atlas})`);
} else {
  notes.push(`atlas is INSIDE the repository at /${relPosix}/`);

  // 1. Must be listed in .git/info/exclude, never in the committed .gitignore.
  const gitDir = git(repo, 'rev-parse', '--git-dir');
  const excludePath = path.resolve(repo, gitDir ?? '.git', 'info', 'exclude');
  const excludeText = existsSync(excludePath) ? readFileSync(excludePath, 'utf8') : '';
  const firstSegment = relPosix.split('/')[0];
  const excluded = excludeText
    .split('\n')
    .map((l) => l.trim().replace(/^\/+|\/+$/g, ''))
    .filter((l) => l && !l.startsWith('#'))
    .some((l) => l === firstSegment || l === relPosix);

  if (excluded) notes.push(`.git/info/exclude covers /${firstSegment}/`);
  else problems.push(`/${firstSegment}/ is not listed in .git/info/exclude`);

  // 2. The committed .gitignore must not have been touched for the atlas.
  const gitignorePath = path.join(repo, '.gitignore');
  if (existsSync(gitignorePath)) {
    const ignoreText = readFileSync(gitignorePath, 'utf8');
    if (ignoreText.includes(firstSegment)) {
      problems.push(`.gitignore mentions "${firstSegment}" — the committed .gitignore must not be modified for the atlas`);
    }
  }
  const ignoreStatus = git(repo, 'status', '--porcelain', '--', '.gitignore');
  if (ignoreStatus) problems.push('.gitignore has uncommitted modifications — revert them');
}

// 3. No atlas path may appear in `git status`.
const porcelain = git(repo, 'status', '--porcelain') ?? '';
const statusHits = porcelain
  .split('\n')
  .filter(Boolean)
  .map((l) => l.slice(3).trim().replace(/^"|"$/g, ''))
  .filter((p) => relPosix && (p === relPosix || p.startsWith(`${relPosix}/`) || p.startsWith(`${relPosix.split('/')[0]}/`)));
if (statusHits.length) {
  problems.push(`git status lists atlas paths: ${statusHits.slice(0, 5).join(', ')}`);
} else {
  notes.push('git status shows no atlas paths');
}

// 4. No atlas path may be tracked.
const tracked = (git(repo, 'ls-files', '--', relPosix ?? ':!*') ?? '')
  .split('\n')
  .filter(Boolean);
if (relPosix && tracked.length) {
  problems.push(`${tracked.length} atlas file(s) are TRACKED by git — run: git rm -r --cached ${relPosix}`);
} else {
  notes.push('no atlas files are tracked');
}

// 5. Nothing atlas-shaped may be staged anywhere.
const staged = (git(repo, 'diff', '--cached', '--name-only') ?? '').split('\n').filter(Boolean);
const stagedHits = staged.filter((p) => /codebase-atlas/i.test(p) || (relPosix && p.startsWith(relPosix)));
if (stagedHits.length) problems.push(`atlas paths are STAGED: ${stagedHits.slice(0, 5).join(', ')}`);

for (const n of notes) console.log(`  ok    ${n}`);
for (const p of problems) console.log(`  FAIL  ${p}`);

if (problems.length) {
  console.log('\ncheck-untracked: FAILED — resolve before reporting success.');
  process.exit(1);
}
console.log('\ncheck-untracked: PASSED — the atlas is isolated from Git.');
