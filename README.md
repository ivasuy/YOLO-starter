# codex-org

Codex-only autonomous engineering org. One prompt in → phased shipped changes out. Runs in yolo + `danger-full-access`. No TUI. No claude. No dry-run.

Roles: CEO ↔ user · CTO ↔ Architect (loop) · per-task Implementer ↔ Reviewer (parallel worktrees) · Auditor (cross-worktree) → PR. See `AGENTS.md` for full chart.

## Prereqs

- `codex` CLI on PATH, authenticated (`codex login`)
- `gh` CLI authenticated if you want PRs (optional; soft-fails)
- `git` repo with at least one commit on `main`
- Python 3.10+

## Setup on a project

### A. Bootstrap into an existing project (recommended)

```bash
# from inside this template's directory:
scripts/bootstrap-codex-org /path/to/your-existing-project
cd /path/to/your-existing-project
git init -b main && git add -A && git commit -m "init"   # if not already a repo
git remote add origin <your-fork-or-remote>               # optional, for PRs
scripts/codex-org start "<your prompt>"
```

Bootstrap is idempotent — re-run anytime. It only adds missing files. Never overwrites `README.md`, `.codex/config.toml`, or existing prompts. `AGENTS.md` is prepended (starter content goes on top, your existing content kept below).

All agent behavior is **inlined directly into `prompts/<role>.md`** — no external skill files. The runtime does not load skills; everything each role needs to do its job is in its prompt.

### B. Use the template directly

```bash
git clone <this-template> my-project
cd my-project
git init -b main && git add -A && git commit -m "init"
git remote add origin <your-fork-or-remote>               # optional, for PRs
```

No deps to install either way.

## Run

```bash
# foreground — events stream live, CEO question prompts you inline
scripts/codex-org start "fix the auth bug where tokens never expire"

# product-mode CEO (more strategic intake — scope expansion, premise challenge)
scripts/codex-org start "redesign onboarding to 3 steps" --ceo-mode product

# detach immediately, run in background
scripts/codex-org start "build a /hello endpoint" --detach
```

`start` prints the run id on line 1:

```
run started: codex-org-a1b2c3d4
  dir:    agent-runs/codex-org-a1b2c3d4
  events: agent-runs/codex-org-a1b2c3d4/events.jsonl
```

Run id format: `codex-org-<8 hex>`. Short, copy-pasteable, no slug noise.

## Get the run id later

```bash
scripts/codex-org list                # all runs, newest first, status + phase
scripts/codex-org list --json         # machine-readable
ls -t agent-runs/ | head -1           # quickest one-liner
```

## Observe a running org

```bash
scripts/codex-org attach <run-id>     # continuous event stream; Ctrl-C detaches
scripts/codex-org orgchart <run-id>   # one-shot snapshot (roles, tasks, worktrees, failures)
scripts/codex-org logs <run-id>                 # stream all role logs (no full slurp)
scripts/codex-org logs <run-id> --role cto      # filter by role
scripts/codex-org logs <run-id> --task t1       # filter by task
scripts/codex-org logs <run-id> --role cto --tail 200  # last 200 lines only
scripts/codex-org logs <run-id> --role cto --head 50   # first 50 lines only
scripts/codex-org diff <run-id> --task t1       # git diff for one worktree
```

`attach` is the control panel: prints every event as it happens, prompts you inline when CEO asks.

### What you'll see in the stream (live)

Each role has a distinct color: **CEO** magenta · **CTO** cyan · **ARCHITECT** blue · **IMPLEMENTER** green · **REVIEWER** yellow · **AUDITOR** red. Role tags are fixed-width for column alignment.

```
[19:53:18] PHASE 1/1  Read-Only Dashboard MVP

[19:53:18]   CEO         ▸ start  intake-01
[19:53:37]     CEO         ·  Considering tool usage for output
[19:53:43]     CEO         ›  cat AGENTS.md
[19:54:01]     CEO         ›  git log --oneline -5
[19:54:01]     CEO         ✓  rc=128 git log --oneline -5
[19:54:46]     CEO         ::
[19:55:02]     CEO         ↳
[19:55:02]     CEO         • in=287671 out=4455
[19:55:30]     CEO         · still working, idle=30s
[19:56:24]   CEO         ◂ NEEDS_USER  intake-01
[19:56:24]    CEO asks   Should the dashboard be strictly read-only observability?
[19:56:38]    you        A
[19:56:39]   CTO         ▸ start  plan-p01
[19:57:14]     CTO         ·  Mapping out task graph
[19:57:55]   CTO         ◂ GREEN  plan-p01
```

Glyph legend:
- `·` reasoning (thought completed; truncated to 160 chars)
- `›` shell exec started
- `✓` exec finished — **only printed when exit code ≠ 0** (success is implied)
- `::` todo list emitted
- `↳` agent_message arrived
- `•` turn complete summary (token usage)
- `▸ start` / `◂ STATUS` role-call lifecycle
- ` CEO asks ` / ` you ` block tags around user-interaction events
- `· still working, idle=Ns` heartbeat (throttled to once per 60s per role)

### Second terminal: live-tail one agent

```bash
scripts/codex-org tail <run-id> --role cto      # newest cto log, auto-switches on next turn
scripts/codex-org tail <run-id> --task t1       # any log whose name contains t1
scripts/codex-org tail <run-id> --label impl-t1-r1
scripts/codex-org tail <run-id> --role cto --raw   # unparsed codex --json stream
```

By default `tail` parses each codex `--json` line and renders it cleanly using the same color/glyph system. Example:

```
━━ tail  agent-runs/codex-org-a1b2c3d4/logs/plan-p01-...log  ━━  [cto]
──────────────────────────────────────────────────────────────────────────────
  CTO         · thinking…
  CTO         · Mapping out task graph
  CTO         › ls scripts
  CTO         ✓ rc=0  ls scripts
  CTO         › git log --oneline -5
  CTO         ✗ rc=128  git log --oneline -5
  CTO         :: plan (2/3 done)
  CTO         ↳ answered  status=GREEN  summary=plan written
  CTO         • turn complete  in=287671  out=4455  cached=189184  reasoning=2076
```

Use `--raw` if you need the full unparsed JSON stream for debugging.

### Second terminal: live-tail one agent's raw log

While the run is going, in another shell:

```bash
scripts/codex-org tail <run-id> --role cto         # newest cto log, auto-switches on next turn
scripts/codex-org tail <run-id> --task t1          # any log whose name contains t1
scripts/codex-org tail <run-id> --label impl-t1-r1 # exact label match
```

This is the unfiltered `codex --json` stream as it's written — full reasoning, every tool call, every byte. Use when you suspect one agent is stuck and want to see what it's actually doing.

### Huge agent responses

The runner streams stdout line-by-line; nothing is buffered to RAM beyond bounded buffers:

- only lines containing `agent_message` are retained in full for the JSON parser (cap 32 messages per call)
- a rolling 200-line tail is kept as regex-fallback for parsing
- everything else is written straight to the log file on disk and discarded from memory
- consecutive low-signal "thinking" events are coalesced — one `… thinking` per reasoning burst, not one per line
- `logs` streams line-by-line; use `--head N` or `--tail N` when a single log is megabytes
- `orgchart`, `attach`, and `tail` all read files line-by-line and never slurp the whole thing

You can run a phase that produces millions of lines without RAM growth — disk is the only thing that fills.

## Answer CEO from another shell

If you're detached or replying from automation:

```bash
scripts/codex-org reply <run-id> "use oauth, not jwt"
```

Only works while the run has a pending question (file `agent-runs/<run-id>/pending-question.txt` exists).

## Stop a run

```bash
scripts/codex-org stop <run-id>       # mark stopped; in-flight role calls finish
```

## Failed tasks & restart

A task is marked **failed** only on genuine failure — never on a still-running or stalled role.

### What counts as failed
- worktree creation error
- implementer returned `BLOCKED`
- reviewer never reached GREEN within max revisions (10)
- `PARSE_ERROR` after one strict retry (aborts the whole run, logged in `state.json`)

### What does NOT count as failed
- a long-running codex call → `ACTIVE`
- no new agent stream for > 10 min → `STALLED` (still not a fail)

### Downstream gating

If a phase ends with **zero GREEN tasks**, the auditor is skipped, the run is `BLOCKED`, and `state.json` lists `failed_tasks`. Auditor never runs against empty work.

If a phase ends with **partial GREEN**, `phase_partial` event fires and the auditor audits only the green tasks. Failed ones stay restartable.

### Find what failed and how to restart

```bash
scripts/codex-org orgchart <run-id>
```

The orgchart's red `FAILED TASKS` block shows, per failure:

```
task=dashboard-api-routes  phase=1  stage=worktree  reason=worktree_create_failed
  worktree: /Users/you/proj/.worktrees/codex-org-a1b2c3d4/dashboard-api-routes
  branch:   agent/phase-1-local-dashboard-mvp--task-dashboard-api-routes
  at:       2026-05-16T19:22:41
  detail:   fatal: invalid reference: agent/phase-1-local-dashboard-mvp
  restart:  scripts/codex-org restart codex-org-a1b2c3d4 --task dashboard-api-routes
```

The `restart:` line is the exact command — copy-paste it.

### Restart a single failed task

```bash
scripts/codex-org restart <run-id> --task <task-id>
```

What happens:
- the **same** implementer and reviewer agents are reused (conversation memory persisted at `agent-runs/<run-id>/memory/<agent-id>.json`)
- the **same** worktree is reused
- the failure entry is cleared from `failures.json` on GREEN
- merge into the phase branch and PR are **not** done by restart — re-launch the run, or run the auditor again, to finish merge/PR

You can also discover restartable tasks straight from disk:
```bash
cat agent-runs/<run-id>/failures.json
```

### State colors in orgchart

- `GREEN` (cyan) — done OK
- `ACTIVE` (cyan) — codex call in flight
- `STALLED` (yellow) — codex call open > 10 min, no new agent stream
- `FAIL_MAX_REVISIONS / BLOCKED / ERROR / PARSE_ERROR / TIMEOUT` (red) — genuine fails

### When the entire run is blocked, not just one task

Look at `state.json`:
```bash
cat agent-runs/<run-id>/state.json
```
The `reason` field tells you what stopped it: `parse_error`, `phase_branch_create_failed`, `all_tasks_failed`, `audit_failed`, `intake_failed`, `no_tasks`, `not_a_git_repo`, `no_codex_cli`. Then either fix the root cause and `restart` the affected task, or start a fresh run.

## Where things land

```
docs/superpowers/specs/<slug>.md          # CEO-owned spec
docs/superpowers/plans/<slug>.md          # CTO-owned plan
agent-runs/<run-id>/
  events.jsonl                              # durable event stream
  state.json                                # current status, phase
  logs/<label>-*.log                        # per role call: prompt + stdout + stderr
  audit/<task-id>.md                        # per-worktree audit log
  audit/phase-<n>-report.md                 # phase audit report (PR body)
  pending-question.txt / reply.txt          # file-based user IO
.worktrees/<run-id>/<task-id>/              # one worktree per task
PROJECT.md                                  # user-facing changelog (CEO writes per phase)
```

## Branches & PRs

- Phase branch: `agent/phase-<n>-<slug>` (off `main`)
- Task branch: `agent/phase-<n>-<slug>--task-<task-id>` (worktree on this)

> Note: the `--task-` suffix (not `/<task-id>`) is required by git — a ref can't be both a tip and a namespace, so `agent/phase-1-foo` and `agent/phase-1-foo/bar` cannot coexist.
- Auditor merges task branches → phase branch.
- Runner pushes phase branch + `gh pr create --base main --head <phase-branch> --body-file <audit-report>`.
- No remote / no `gh` / push refused → `pr_failed` event, run continues, CEO records the reason in PROJECT.md.

## Iteration caps (runtime safeties)

| Loop | Cap | On exhaustion |
|---|---|---|
| CEO intake | 8 turns | Returns NEEDS_USER with answers collected so far |
| Architect ↔ CTO | 5 iterations | Treats last CTO output as GREEN with `capped: true` |
| Implementer ↔ Reviewer per task | 10 revisions | Records FAIL_MAX_REVISIONS, restartable |
| Auditor ↔ Implementer per phase | 3 passes | Soft-lands non-critical issues as deferred_concerns, or returns BLOCKED for true blockers |

Prompts include matching discipline — for example, the auditor must soft-land into PROJECT.md's "Deferred Concerns" section rather than block at pass 3 for non-critical issues.

## Customizing

Roles and models live in `workflow/org.defaults.json`. Each role's full behavior contract lives in `prompts/<role>.md` — including TDD discipline, systematic debugging, plan completeness gates, confidence calibration, error/rescue maps, and observability requirements. There are no external skill files; everything is inlined.

Codex CLI defaults in `.codex/config.toml` (already set to `danger-full-access`). Per-role TUI configs (for direct codex CLI usage outside the org pipeline) live in `.codex/agents/<role>.toml`.

## When things break

Look for these in the stream:

- red `PARSE-ERROR` → role returned non-JSON twice; run aborts. Log path in the event.
- yellow `parse-recovered` → role wrapped JSON in fences or prose; tolerated, log path attached.
- yellow `pr-failed` → push or `gh pr create` failed; reason in event.
- red `BLOCKED` → fatal stop; check `state.json` `reason` field.

Every event is in `agent-runs/<run-id>/events.jsonl`. Every role call is logged with full prompt + raw output under `logs/`.

## Files of note

```
AGENTS.md                    # org contract; agents read this at runtime
PROJECT.md                   # user-facing changelog
prompts/<role>.md            # full role contract — inlined behavior, no external skills
workflow/org.defaults.json   # roles + models (skills cleared; all behavior in prompts)
scripts/codex-org            # the single entry CLI
scripts/bootstrap-codex-org  # install into another project
.codex/config.toml           # codex CLI defaults (danger-full-access)
.codex/agents/<role>.toml    # codex TUI per-role summaries (point to prompts/<role>.md)
bin/                         # archived (claude wrappers, old runner, docs)
```

## What each role does

| Role | Job | Key inlined behavior |
|---|---|---|
| **CEO** | Talks to user, writes phased spec, owns PROJECT.md | 10 question categories, 4-shadow-path probe, anti-feature-creep gate, ground-truth rule |
| **CTO** | Per-phase implementation plan with task graph | Error/rescue map, observability, test_cases, integration_contracts per task; scope challenge; 13-item self-review |
| **Architect** | Reviews CTO's plan, additive only | 7 mandatory completeness gates + 11-section eng review (architecture/security/data flow/tests/perf/observability/deployment/trajectory/UX) + confidence calibration |
| **Implementer** | One task in one worktree | TDD red-green-refactor + iron law, systematic debugging 4-phase, root-cause-tracing, testing anti-patterns, "don't invent" rule, commit-before-GREEN |
| **Reviewer** | Paired 1:1 with implementer | Dual-lens (spec + quality), don't-trust-the-report, reality-over-plan, confidence calibration (1-10) |
| **Auditor** | Cross-worktree final gate + merge | Per-worktree audit logs, re-audit discipline (no new findings), 3-pass cap with soft-landing into deferred_concerns |

See `prompts/<role>.md` for the full contract per role.

