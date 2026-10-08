# Cross-provider workers

A slice can go to the other provider's CLI: Codex from Claude Code, or Claude Code from Codex. Each runs as a shell process and counts toward the concurrency cap until it exits.

## Common steps

1. Write the Worker-template brief to a file (e.g. `<scratch>/briefs/<slice>.md`) and feed it on stdin, because long prompts break under shell quoting. `<scratch>` is the session scratchpad or a temp dir outside the repo, so briefs and logs never show up in the diff under review.
2. Launch in the background with output redirected to files, never piped through a filter. Claude Code: Bash with `run_in_background` notifies you on exit. Codex: use the shell tool's background mode if available; otherwise run short slices in the foreground.
3. When it exits, read the final-message file and the exit code, then verify the diff as with any worker. The CLI's summary is a claim.
4. The CLI needs network access to reach its API. If your shell sandbox blocks the network, request an unsandboxed or escalated run for that command only.
5. PowerShell has no `<` redirect, so use `Get-Content -Raw <brief> | <command>`. Piping input in is fine; the filter rule applies only to output.

## From Claude Code: Codex worker

Binary: `codex` on PATH, else the newest `$LOCALAPPDATA/OpenAI/Codex/bin/*/codex.exe` (desktop-app install; use `command ls`, since an aliased `ls -F` appends `*`).

```bash
codex exec -C <repo> -s workspace-write --skip-git-repo-check --ephemeral \
  -c model_reasoning_effort=<low|medium|high> [-m <model>] \
  -o <scratch>/out/<slice>.md - < <scratch>/briefs/<slice>.md \
  > <scratch>/logs/<slice>.log 2>&1
```

- Omit `-m` to use the user's default from `~/.codex/config.toml`. Other model ids are in `~/.codex/models_cache.json`.
- Reviewers and search: `-s read-only`. For a plain repo review, `codex exec review` also works.
- `workspace-write` has no network. If the slice's tests need it, add `-c sandbox_workspace_write.network_access=true`.
- `--worktree` gives a git-repo slice its own worktree for risky parallel edits.
- Never pass `--dangerously-bypass-approvals-and-sandbox` unless the user asks.

## From Codex: Claude worker

```bash
claude -p --model <tier's model alias, e.g. sonnet> --effort <low|medium|high> \
  --permission-mode acceptEdits --allowedTools "Bash(<test command>:*)" \
  --output-format json --no-session-persistence \
  < <scratch>/briefs/<slice>.md > <scratch>/out/<slice>.json 2>&1
```

- `acceptEdits` allows file edits. List each shell command the brief needs in `--allowedTools`; a non-interactive run denies everything else instead of prompting.
- Reviewers and search: `--permission-mode dontAsk --allowedTools Read Grep Glob "Bash(git diff:*)"`.
- The JSON has `result` (the final message), `is_error`, and `total_cost_usd`. Put the cost on the task board.
- Optional spend cap: `--max-budget-usd <n>`.
