param(
    [string]$SkillPath = (Split-Path -Parent $PSScriptRoot)
)

$ErrorActionPreference = 'Stop'
$resolvedSkillPath = (Resolve-Path -LiteralPath $SkillPath).Path
$skillFile = Join-Path $resolvedSkillPath 'SKILL.md'
$failures = [System.Collections.Generic.List[string]]::new()

function Require-Match {
    param([string]$Name, [string]$Content, [string]$Pattern)
    if ($Content -notmatch $Pattern) { $failures.Add($Name) }
}

function Forbid-Match {
    param([string]$Name, [string]$Content, [string]$Pattern)
    if ($Content -match $Pattern) { $failures.Add($Name) }
}

foreach ($relativePath in @(
    'SKILL.md',
    'references\agents-md-template.md',
    'references\feature.md',
    'references\hotfix.md',
    'references\release.md',
    'references\plan.md',
    'references\wiki.md',
    'agents\openai.yaml',
    'scripts\check_skill.ps1',
    'scripts\wiki_lint.py'
)) {
    if (-not (Test-Path -LiteralPath (Join-Path $resolvedSkillPath $relativePath))) {
        $failures.Add("Missing required file: $relativePath")
    }
}
if ($failures.Count -gt 0) {
    Write-Error ("Skill validation failed:`n- " + ($failures -join "`n- "))
}

$skillContent = Get-Content -LiteralPath $skillFile -Raw
$read = { param($p) Get-Content -LiteralPath (Join-Path $resolvedSkillPath $p) -Raw }
$templateContent = & $read 'references\agents-md-template.md'
$wikiContent = & $read 'references\wiki.md'
$hotfixContent = & $read 'references\hotfix.md'
$releaseContent = & $read 'references\release.md'
$markdownFiles = Get-ChildItem -LiteralPath $resolvedSkillPath -Recurse -File -Filter '*.md'
$allMarkdown = ($markdownFiles | ForEach-Object { Get-Content -LiteralPath $_.FullName -Raw }) -join "`n"

# Discovery metadata and size
Require-Match 'Missing YAML frontmatter name' $skillContent '(?m)^name:\s*gitflow-feature-workflow$'
Require-Match 'Description must start with Use when' $skillContent '(?m)^description:\s*Use when'
$descriptionMatch = [regex]::Match($skillContent, '(?m)^description:\s*(.+)$')
if ($descriptionMatch.Success -and $descriptionMatch.Groups[1].Value.Length -gt 1024) {
    $failures.Add('Description exceeds 1024 characters')
}
$wordCount = ([regex]::Matches($skillContent, '\S+')).Count
if ($wordCount -ge 1500) { $failures.Add("SKILL.md must remain below 1500 words; found $wordCount") }

# Progressive disclosure: every reference is linked from SKILL.md
foreach ($ref in 'feature', 'hotfix', 'release', 'plan', 'wiki', 'agents-md-template') {
    Require-Match "$ref reference link is missing" $skillContent "references/$ref\.md"
}
Require-Match 'Wiki lint script link is missing' $skillContent 'scripts/wiki_lint\.py'

# Branch names: main/dev everywhere; master/develop only on legacy-names lines
Require-Match 'main production role is missing' $skillContent '`main` \| Production'
Require-Match 'dev integration role is missing' $skillContent '`dev` \| Integration'
Require-Match 'feature branch mapping is missing' $skillContent '`feature/<short-name>`[^\n]*`dev`[^\n]*`dev`'
Require-Match 'hotfix branch mapping is missing' $skillContent '`hotfix/<version>`[^\n]*`main`[^\n]*`main` and `dev`'
Require-Match 'release branch mapping is missing' $skillContent '`release/<version>`[^\n]*`dev`[^\n]*`main` and `dev`'
foreach ($file in $markdownFiles) {
    $lines = Get-Content -LiteralPath $file.FullName
    foreach ($line in $lines) {
        if ($line -match '\b(master|develop)\b' -and $line -notmatch '(?i)legacy') {
            $failures.Add("Legacy branch name outside the legacy note in $($file.Name): $line")
        }
    }
}
Require-Match 'Legacy-name handling is missing' $skillContent '(?s)Legacy branch names.*ask once'

# Workflow, questions, plan handoff, skills
Require-Match 'Plan handoff file is missing' $skillContent '`\.gitflow/plan\.md`'
Forbid-Match 'Model-switch stop remains' $allMarkdown '(?i)model switch|switch to the cheaper model|cheaper model'
Require-Match 'Clarifying-question guidance is missing' $skillContent '(?s)Ask before you build.*better implementation exists'
Require-Match 'Conditional mid-workflow asking is missing' $skillContent 'Ask only when'
Require-Match 'Skill suggestion guidance is missing' $allMarkdown 'Suggest only skills that are actually present'
Forbid-Match 'Unconditional plan approval pause remains' $skillContent 'Wait for the user to approve the plan'

# TDD
Require-Match 'TDD section is missing' $skillContent '(?m)^## Test-driven development$'
Require-Match 'Test-first rule is missing' $skillContent 'Write the failing test first'
Require-Match 'Red-green-refactor rule is missing' $skillContent 'red . green . refactor'
Require-Match 'Feature test rule is missing' $skillContent 'Every feature gets tests'
Require-Match 'Regression test rule is missing' $skillContent 'bug fix gets a regression test'

# LLM wiki
Require-Match 'Wiki query-first rule is missing' $skillContent '`docs/wiki/index\.md` first'
Require-Match 'Wiki ingest-before-merge rule is missing' $skillContent '(?s)Ingest.{0,40}before merging every branch'
Require-Match 'Wiki lint-on-release rule is missing' $skillContent '(?s)Lint.{0,40}every release branch'
Require-Match 'Grep-able log format is missing' $wikiContent '## \[2026-\d\d-\d\d\] feature \|'
Require-Match 'Wiki frontmatter types are missing' $wikiContent 'overview \| module \| feature \| decision \| gotcha'
Require-Match 'Obsidian guidance is missing' $wikiContent '(?s)## Obsidian.*Graph view'
Require-Match 'AGENTS.md wiki pointer is missing' $templateContent '## Knowledge base'
Forbid-Match 'Exhaustive file inventory in AGENTS.md remains' $templateContent '## File reference'

# Git mechanics
Require-Match 'Direct-commit guardrail is missing' $skillContent 'Never commit directly to `main` or `dev`'
Require-Match 'Branch-before-change guardrail is missing' $skillContent 'Branch before touching any file'
Require-Match 'Pull-first rule is missing' $skillContent '\*\*Pull first\.\*\*'
Require-Match 'Announce-on-start rule is missing' $skillContent '(?s)\*\*Announce on start\.\*\*.{0,80}push an empty'
Require-Match 'Push-on-finish rule is missing' $skillContent '\*\*Push on finish\.\*\*'
Forbid-Match 'Push-every-commit rule remains' $allMarkdown '(?i)push right after each commit|after every commit on the'
$featureContent = & $read 'references\feature.md'
Require-Match 'Feature start announcement is missing' $featureContent '(?s)git commit --allow-empty -m "chore: start feature/.*git push -u origin'
Require-Match 'Hotfix start announcement is missing' $hotfixContent 'chore: start hotfix/'
Require-Match 'Release start announcement is missing' $releaseContent 'chore: start release/'
Require-Match 'Plan exclude-file rule is missing' (& $read 'references\plan.md') 'info/exclude'
Require-Match 'Fast-forward-only base updates are missing' $skillContent 'git pull --ff-only'
Require-Match 'No-ff merge requirement is missing' $skillContent 'merges into `dev` and `main` use `--no-ff`'
Require-Match 'Annotated main tags are missing' $skillContent 'annotated semver tag'
Require-Match 'Atomic hotfix push is missing' $hotfixContent 'git push --atomic origin main dev'
Require-Match 'Atomic release push is missing' $releaseContent 'git push --atomic origin main dev'
Require-Match 'Hotfix-into-open-release rule is missing' $hotfixContent 'Open release branch'
Require-Match 'Semver feature/minor rule is missing' $skillContent 'Feature → minor'
Require-Match 'Semver bugfix/patch rule is missing' $skillContent 'Hotfix / bug fix → patch'
Require-Match 'Semver breaking/major rule is missing' $skillContent 'Breaking change → major'
Require-Match 'Conventional Commits rule is missing' $skillContent 'Conventional Commits'
Require-Match 'Co-author prohibition is missing' $skillContent 'Do not add a co-authorship trailer'
Require-Match 'Full-suite rule is missing' $skillContent 'full test suite'
Require-Match 'Lint/format rule is missing' $skillContent 'lint/format checks'
Require-Match 'Unfiltered exit-code rule is missing' $skillContent 'real exit code'
Require-Match 'No-remote local completion is missing' $skillContent '(?s)No remote configured.*complete the workflow locally'
Require-Match 'Local merge default is missing' $skillContent 'local merge mode by default'
Require-Match 'Protected-branch PR fallback is missing' $skillContent '(?s)protected target branch.*Never bypass protection'
Require-Match 'Red-CI merge prohibition is missing' $skillContent '(?s)CI configured.*Never merge.*pipeline is red'
Require-Match 'Force-push guardrail is missing' $skillContent 'Never force-push'
Require-Match 'Rebase guardrail is missing' $skillContent 'Never rebase'
Require-Match 'Destructive confirmation is missing' $skillContent 'Destructive operations: confirm with the user'
Require-Match 'Dirty-worktree protection is missing' $skillContent 'uncommitted changes \(stash, commit, or abort\)'
Require-Match 'Conflict-resolution guardrail is missing' $skillContent 'resolve it deliberately'

if ($failures.Count -gt 0) {
    Write-Error ("Skill validation failed:`n- " + ($failures -join "`n- "))
}

Write-Output "PASS: structure, discovery metadata, main/dev Gitflow, TDD, and LLM wiki rules validated."
Write-Output "PASS: SKILL.md contains $wordCount words across $($markdownFiles.Count) Markdown files."
