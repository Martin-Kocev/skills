# Hotfix playbook

Hotfixes fix urgent production bugs. They branch from `main`, not `dev`, because `dev` may hold unreleased work that must not ship. They must land in both `main` and `dev`: skipping `dev` makes the fix silently disappear in the next release. Urgency shortens planning (`references/plan.md`) but does not skip it, unless the user asks for the fix in one sitting.

```bash
# 1. Branch from up-to-date main; version = latest tag + patch
git fetch --prune --tags
git switch main
git pull --ff-only
git switch -c hotfix/1.3.1

# Announce it (format in references/feature.md) so the team knows production
# is being patched and what will change
git commit --allow-empty -m "chore: start hotfix/1.3.1" \
  -m "Goal: <the production bug being fixed>" \
  -m "Scope: <files to change>" -m "Semver: patch"
git push -u origin hotfix/1.3.1

# 2. Test-first: write the regression test and see it fail, fix the bug,
#    then run the full suite. Commit test and fix together: fix: ...
#    Commits stay local until the finish push in step 6.

# 3. Bump the version file, add a "## [1.3.1] - YYYY-MM-DD" heading to
#    CHANGELOG.md (format in references/release.md), and ingest the fix into
#    the wiki (references/wiki.md).
#    Commits: chore: bump version to 1.3.1 / docs(wiki): ...

# 4. Merge into main and tag
git switch main
git pull --ff-only
git merge --no-ff hotfix/1.3.1
git tag -a v1.3.1 -m "Hotfix 1.3.1: <one-line summary>"

# 5. Merge into dev as well (or the open release branch; see below)
git switch dev
git pull --ff-only
git merge --no-ff hotfix/1.3.1

# 6. Push both branches and the tag together, then clean up
git push --atomic origin main dev v1.3.1
git branch -d hotfix/1.3.1
git push origin --delete hotfix/1.3.1
```

`--atomic` pushes `main`, `dev`, and the tag together or not at all, so a failure cannot leave the fix on `main` but missing from `dev`. Verify the push succeeded before reporting the hotfix as done.

**Open release branch:** if a `release/*` branch exists, merge the hotfix into it instead of `dev` (the release carries it into `dev`), push that branch in step 6 in place of `dev`, and tell the user.

The remote, pull request, and CI rules in `SKILL.md` apply. Without a remote, skip the pushes and say nothing was pushed.
