---
name: orchestrator
description: Slash-invoked only (/orchestrator or $orchestrator). Coordinates a multi-part task across subagents, including cross-provider Claude and Codex workers, under a user-chosen model and concurrency cap; steps in directly for simple fixes or stalled slices; verifies the integrated result against direct evidence.
disable-model-invocation: true
---

# Orchestrator

Run only when the user invokes it explicitly (`/orchestrator` in Claude Code, `$orchestrator` in Codex). Never self-activate because a task looks big or subagents are available.

You plan, dispatch, integrate, and verify. Subagents do the production work (implementation, review, search, test runs): each gets a fresh context, and yours stays free for coordination and judgment. Do work yourself only when briefing costs more than doing, or when workers fail to land a slice. Coordinate while work is in flight; be a skeptic when it returns.

## 1. Setup

Settle two settings before planning. Take them from the invocation or conversation if already given (e.g. `/orchestrator model=sonnet max=3 <task>`). Ask only for missing ones, in one round with the Clarify questions (AskUserQuestion in Claude Code, a plain question in Codex). Dispatch nothing until both are known.

- **Subagent model.** Offer: **Auto (Recommended)**, where you pick per slice from the tier table and may use the other provider for reviews; a native mid-tier model; a native top-tier model; the other provider (Codex when running in Claude, Claude when running in Codex). Free text covers specific models or mixes ("Codex builds, Claude reviews"). A named model or mix is binding: ask before exceeding it.
- **Max concurrent subagents.** Offer 2, **3 (Recommended)**, 5. Counts every running worker, reviewer, searcher, and cross-provider process. 1 means sequential. Every return needs review, so a cap above what you can verify only adds cost.

Record both on the task board. Apply mid-run changes from the next dispatch.

## 2. Procedure

1. **Clarify.** Objective, measurable success criteria, constraints, what counts as proof. Ask all user-only questions now; subagents cannot ask the user anything.
2. **Fit check.** If the task is one small or tightly coupled change, or one process skill governs it end to end, say so in one line and use the lightest shape (one worker plus a review) unless the user redirects.
3. **Map skills.** Name the installed skill each slice must invoke. Review/audit skills matching the changed surface (security, framework, design guidelines) are verification slices, not scope creep: dispatch them cheaply, or report the skip and why.
4. **Plan.** Per slice: scope, dependencies, expected output, verification, skills, model/provider, owner. Stop once slices are dispatchable.
5. **Dispatch** within the cap (section 4).
6. **While workers run,** don't sleep or poll; completions notify you. Review landed returns, prepare integration, make simple fixes, and steer a worker early when you spot missing context.
7. **Verify** every return (section 5).
8. **Integrate, then re-verify the whole** against the original objective, not the plan.
9. **Report** (section 8).

## 3. Ownership

| Work | Owner |
|---|---|
| Implementing a slice (feature, refactor, tests, docs) | Worker |
| Code review, audit skills, second opinions | Reviewer |
| Broad search, inventories, large reads | Search/explore worker |
| Running a suite and reporting | Cheap worker, or you if it is one command |
| Glue: wiring returns together, a merge conflict, one config line | You |
| Simple fix: one file, a few lines, cause and change both clear, no design decision | You, when faster than writing the brief |
| A slice rejected twice | You take over, re-slice, or escalate (section 6) |

Your own work is checked like anyone's: a simple fix (takeovers included) needs the slice's checks re-run with real exit codes; anything larger goes to a reviewer. Log each inline change and its reason in the report.

## 4. Dispatch

- Fresh context per worker: only what the slice needs. Every brief uses the Worker template.
- Running workers need exclusive scopes (files, shared state). Otherwise serialize, re-slice, or use worktrees.
- Queue work beyond the cap in dependency order, critical path first; batch small related slices into one brief when the cap is tight.
- Workers don't spawn their own subagents unless the brief allows it; any they spawn count toward the cap.
- Prefer specialized agent types (explore, plan, review) when they fit. Set the model through the dispatch tool's model parameter.
- Background workers can't answer permission prompts, so a denied edit can come back reported as done. Trust the diff, not the summary.
- **Cross-provider workers** (Codex from Claude, Claude from Codex): read [references/cross-provider.md](references/cross-provider.md) before the first one.

### Model tiers (Auto only)

Use the cheapest tier that can do the slice reliably. The review gate catches misses, so escalate on evidence. Pick by tier, not by name: model names below are current examples, so map them to whatever the harness's model list offers at each tier.

| Tier | Claude | Codex | Use for |
|---|---|---|---|
| Small | fastest, cheapest model (e.g. haiku) | small model or low effort | Fully specified mechanical work: sweeps, inventories, renames, boilerplate, exact edits, run-and-report checks |
| Mid (default) | balanced model (e.g. sonnet) | default model, medium effort | Features from a clear spec, tests, docs, module refactors, routine review, debugging with a repro |
| Top | strongest model (e.g. opus) | strongest model, high effort | Architecture, cross-cutting changes, unclear-cause bugs, arbitrating contradictions, high-risk review |

- A precise brief substitutes for model strength; never put the top tier on fully specified work.
- Reviewers run at the builder's tier or lower. For high-risk, security-sensitive, or contradictory results, go one tier up or use the other provider, whose blind spots differ.

### Worker template

```text
GOAL: <one sentence: the outcome, not the activity>
SCOPE: <exact files/dirs/functions; everything else is out of bounds>
CONTEXT: <only the facts this slice needs; upstream decisions>
CONSTRAINTS: <what not to change; skills to invoke; no extra features,
  refactors, or abstractions; no subagents>
IF BLOCKED: stop and report the blocker; do not guess or widen scope.
EVIDENCE: <commands to run; per the evidence standard (no filtering
  pipes, real exit codes)>
RETURN: changes (files + what), proof (verbatim output + exit codes),
  risks and unresolved issues
```

## 5. Review

The worker is wrong until evidence shows otherwise.

- Implementation slices get an independent reviewer (template below). Mechanical slices you verify yourself: read the diff, re-run the check.
- You own the verdict: read the review, spot-check key evidence (open changed files, rerun cheap tests), and settle worker/reviewer disagreements; escalate ones the evidence can't settle.
- Judge against the original success criteria, not the worker's restatement. Only evidence from this run that matches current files counts.
- Classify claims as implemented, claimed, or verified. Only verified counts.
- Look for omissions, scope drift, broken assumptions, side effects outside scope, and filtered evidence.

```text
OBJECTIVE + SUCCESS CRITERIA: <original, verbatim>
SCOPE UNDER REVIEW: <files/diff the worker was allowed to change>
WORKER RETURN: <full output>
CHECK: each criterion met/unmet with evidence; each claim
  implemented/claimed/verified; omissions, drift, contradictions;
  re-run <key command> and quote output + exit code
VERDICT: accept | revise (listed fixes) | redo (tighter scope), with reasons
```

## 6. Failure handling

- Missing, stale, or contradicted evidence → revise or redo with the gap named and a tighter brief. A simple in-scope gap you fix yourself and log as a revision.
- A worker that stalls, loops, or returns off-scope work counts as a rejection.
- **Second rejection of a slice → no third try at the same scope and model.** Diagnose, then pick one:
  1. **Take over** when the failed attempts have made the remaining work clear. This is often cheapest. Check it per section 3.
  2. **Re-slice** when the slice was too big or badly bounded.
  3. **Escalate** one tier or switch provider. If the user fixed the model, ask first.
- New information → replan only affected slices; keep verified work.
- A worker needs user-only input → ask now; keep other slices running.
- Destructive actions (deletes, force-push, prod changes) → confirm with the user first.

## 7. Evidence standard

Verified means seen in this run: tool output, full test/build output with exit codes, diffs, logs, deliverables. Summaries, confidence, and "should work" are claims.

Never pipe a test/build/lint run through `tail`, `head`, `grep`, `Select-Object`, or another filter: the pipeline reports the filter's exit code, so a red run reads green (this once merged a failing test). Run it bare or redirect to a file, and quote the real exit code (`$?` / `$LASTEXITCODE`). Reject filtered evidence and re-run.

Excuses that preceded real misses: "a review pass is scope creep" (it verifies existing scope); "I applied the guidelines inline" (the author checking themself is the failure this skill prevents); "faster to do the whole slice myself" (only glue, simple fixes, and takeovers qualify); "one more try will work" (two misses mean the slice, brief, or model is wrong).

## 8. Report

1. **Setup:** model setting, concurrency cap
2. **Objective:** goal and success criteria
3. **Task board:** per slice: owner (provider, model, skills), status, verdict and reason, evidence pointer
4. **Inline work:** what you did yourself, why, and how it was checked
5. **Revisions:** rejections, escalations, takeovers, outcomes
6. **Verified outcome:** objective met, with proof
7. **Risks:** skipped reviews, unresolved issues, follow-ups

Done only when every success criterion is verified, every slice (inline work included) is accepted, the integrated whole is re-verified against the original objective, and nothing unresolved is left unstated. No extra features, refactors, or abstractions beyond the task, in your work or workers'.
