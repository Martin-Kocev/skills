# Release playbook

Releases stabilize what is on `dev` and promote it to production. A release branch takes only bug fixes, the version bump, release metadata, and wiki lint fixes; new features wait for the next release. The version is fixed when the branch is created.

```bash
# 1. Decide the version per the semver rules in SKILL.md
git fetch --prune --tags
git switch dev
git pull --ff-only
git switch -c release/1.4.0

# Announce it (format in references/feature.md): the team should stop
# expecting new features in 1.4.0 from this point
git commit --allow-empty -m "chore: start release/1.4.0" \
  -m "Goal: release 1.4.0 from dev" \
  -m "Scope: version bump, changelog, release fixes only" -m "Semver: minor"
git push -u origin release/1.4.0

# 2. Bump the version file. In CHANGELOG.md, move the Unreleased entries
#    under "## [1.4.0] - YYYY-MM-DD" (format below).
#    Commit: chore: prepare release 1.4.0

# 3. Run the full suite and lint; fix bugs here with fix: commits only.
#    Lint the wiki (references/wiki.md), fix what it reports, and log a
#    "release" entry. Never merge red.
#    Commits stay local until the finish push in step 6.

# 4. Merge into main and tag
git switch main
git pull --ff-only
git merge --no-ff release/1.4.0
git tag -a v1.4.0 -m "Release 1.4.0"

# 5. Merge back into dev (carries release fixes and the version bump)
git switch dev
git pull --ff-only
git merge --no-ff release/1.4.0

# 6. Push both branches and the tag together, then clean up
git push --atomic origin main dev v1.4.0
git branch -d release/1.4.0
git push origin --delete release/1.4.0
```

Verify the atomic push succeeded before reporting the release as done. The remote, pull request, and CI rules in `SKILL.md` apply.

## CHANGELOG.md format (Keep a Changelog)

Features merged to `dev` add entries under `## [Unreleased]`. Releases move that block under a version heading. Hotfixes add a version heading directly.

```markdown
# Changelog

## [Unreleased]

## [1.4.0] - 2026-07-13
### Added
- CSV export for reports

### Fixed
- Empty rows no longer crash the importer

## [1.3.1] - 2026-07-01
### Fixed
- Session cookies expiring immediately
```

Categories: Added, Changed, Deprecated, Removed, Fixed, Security.
