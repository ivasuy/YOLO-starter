# AGENTS.md

Codex-only autonomous org. Read this at start of every run. All roles run with `sandbox = "danger-full-access"`, `approval = "never"`, mode = `yolo`. No dry-run, no auto, no claude.

## Mission

Take one user prompt → ship phase by phase autonomously. Pause only when CEO needs input.

## Required reading at runtime

```
AGENTS.md          # this file
PROJECT.md         # user-facing changelog; CEO appends after each phase
prompts/<role>.md  # your role contract — fully self-contained, no external skills
```

Spec/plan artifacts live in `docs/superpowers/specs/` and `docs/superpowers/plans/`. CEO writes specs, CTO writes plans, CEO links them in PROJECT.md.

No other markdown is part of the runtime surface. `bin/` holds archived docs. All behavior is inlined directly into each role's prompt file; the runtime does not load external skills.

## Entry

```
scripts/codex-org start "<user prompt>" [--ceo-mode product|technical] [--detach]
scripts/codex-org attach <run-id>
scripts/codex-org list | orgchart <run-id> | logs <run-id> | diff <run-id> --task <id>
scripts/codex-org reply <run-id> "<text>" | stop <run-id> | restart <run-id> --task <id>
scripts/codex-org tail <run-id> --role <role>
```

`start`/`attach` are continuous streams. CEO questions block stdin inline. Ctrl-C detaches (run keeps going). `reply` is the off-band path when detached.

## Org chart

```
ceo  ── interactive intake (only role that asks user) ──┐
 │                                                       │
 ├─ writes phased spec  →  docs/superpowers/specs/       │
 │                                                       │
 └─ per phase:                                           │
      ↓                                                  │
    cto  ── writes implementation plan (additive task    │
     │       graph with context_files, error_rescue_map, │
     │       observability, test_cases, integration_     │
     │       contracts per task)                         │
     │                                                   │
     │   loops with architect (cap: 5 iterations):       │
     │     architect ── runs 7 plan completeness gates   │
     │                  + 11-section review (additive)   │
     │     cto decides loop_done OR reject OR revise     │
     │                                                   │
     ├─ branch = phase slug                              │
     ├─ spawn worktrees (one per task, parallel)         │
     │                                                   │
     │   per task (parallel, max 4 concurrent):          │
     │     implementer-N ── TDD + systematic debugging   │
     │       ↕ reviewer-N (spec + code-quality, dual)    │
     │     reused same agent identity across revisions   │
     │     reviewer cap: 10 revisions                    │
     │                                                   │
     │   when all tasks GREEN:                           │
     │                                                   │
     └─ auditor (cross-worktree, cap: 3 passes)          │
          per-worktree audit log: agent-runs/<run>/audit/<task>.md
          red-flag → original implementer (same agent)   │
          on GREEN: runtime merges all worktrees → phase │
                    branch; runtime creates PR           │
          on iter 3: soft-land with deferred_concerns    │
                                                         │
ceo phase-close: ingest audit + deferred concerns ──→    │
                 PROJECT.md (per-phase block)            ┘
runtime iterates next phase OR ceo final summary
```

## Agent identity & memory

- CEO: one instance, full run. Persists across intake, spec_authoring, every phase_close, final.
- CTO: one instance, full run. Persists across every phase's plan_authoring + architect_review_loop.
- Architect: one instance per phase. Persists across CTO↔architect loop iterations.
- Implementer-N + reviewer-N: one each per task. Persist across reviewer revisions AND auditor red-flag revisions.
- Auditor: one instance per phase. Persists across the 3 audit passes.

Identity preserved by threading prior turns in `payload.conversation` of each role call. Memory stored under `agent-runs/<run-id>/memory/<agent-id>.json`.

## Payload schema (every role call)

Every payload includes:

```jsonc
{
  "run_id": "codex-org-abcd1234",
  "role": "ceo | cto | architect | implementer | reviewer | auditor",
  "phase": "<phase-name string, role-specific>",   // e.g. "interactive_intake", "plan_authoring", "review", "audit"
  "conversation": [/* prior turns for this agent identity */]
}
```

Role-specific additional fields are documented per-role in `prompts/<role>.md` under the "Inputs you receive" section. Key fields by role:

- **CEO intake**: `user_request`, `ceo_mode`, `answers[]`, `turn`
- **CEO spec_authoring**: `intake`, `answers[]`, `spec_target_dir`, `user_request`
- **CEO phase_close**: `phase_no`, `phase_meta`, `spec_path`, `implementation_plan_path`, `audit_report_path`, `audit_summary`, `deferred_concerns`, `non_blocking_observations`, `pr`, `branch`, `project_md_path`
- **CTO plan_authoring**: `phase_no`, `phase_meta`, `spec_path`, `plan_target_dir`
- **CTO architect_review_loop**: `phase_no`, `phase_meta`, `implementation_plan_path`, `architect_feedback`, `iteration`, `max_iterations`
- **Architect**: `phase_no`, `phase_meta`, `spec_path`, `implementation_plan_path`, `iteration`, `max_iterations`, `cto_review_focus`
- **Implementer**: `task` (the full CTO task spec), `worktree_id`, `branch`, `implementation_plan_path`, `review_findings[]`, `revision`, `audit_redflag?`
- **Reviewer**: `task`, `worktree_id`, `branch`, `implementation_plan_path`, `implementer_output`, `revision`
- **Auditor**: `phase_no`, `phase_meta`, `phase_branch`, `implementation_plan_path`, `task_graph[]`, `worktrees[]`, `audit_log_dir`, `audit_report_path`, `iteration`

## Task structure (in CTO's `task_graph`)

CTO produces tasks with this shape (every field required unless noted):

```jsonc
{
  "id": "P1-T1-parser-module",
  "title": "Add parser module",
  "files": ["ui/parser.js", "ui/parser.test.js"],
  "dependencies": [],
  "context_files": ["docs/superpowers/specs/...", "real-sample.jsonl"],
  "instructions": "...",
  "acceptance": ["..."],
  "checks": ["node --test ui/parser.test.js"],
  "error_rescue_map": [
    { "codepath": "...", "failure": "...", "exception": "...", "rescue": "...", "user_sees": "..." }
  ],
  "observability": {
    "logs": ["..."],
    "success_metric": "...",
    "failure_metric": "..."
  },
  "test_cases": [
    { "name": "...", "lens": "happy|happy_shadow_nil|happy_shadow_empty|error_path|edge_*|integration",
      "given": "...", "expect": "..." }
  ],
  "integration_contracts": {
    "exports": [{ "name": "...", "kind": "function|class|constant", "signature": "..." }],
    "imports_from_other_tasks": [{ "from_task": "...", "name": "...", "signature": "..." }],
    "file_paths_consumed_by_other_tasks": ["..."]
  }
}
```

This shape flows transparently from CTO → implementer (via `payload.task`) → reviewer (via `payload.task`) → auditor (via `payload.task_graph[].task` and `payload.worktrees[].task`).

## Output contracts (high-level)

Every role returns JSON with required field `status`. Status enum (varies by role):

| Status | Meaning |
|---|---|
| `GREEN` | Work delivered, proceed |
| `NEEDS_USER` | CEO only: awaits user reply (with `question`) |
| `NEEDS_REVISION` | Reviewer/auditor sends implementer back (with `findings[]` or `redflags[]`) |
| `NEEDS_CONTEXT` | Implementer needs more info before proceeding |
| `NEEDS_USER_VIA_CEO` | Implementer escalates product decision to CEO |
| `BLOCKED` | Fatal stop; includes `reason` |
| `REJECTED` | CTO rejects architect's iteration; loop ends with original plan |
| `DONE` | CEO only: final phase, run complete |
| `DONE_WITH_CONCERNS` | Implementer: work committed but flagged doubts |
| `FAIL` | Runtime-level: cap exceeded (audit pass 3, max revisions) |
| `TIMEOUT` / `PARSE_ERROR` / `ERROR` | Runtime infrastructure failures |

| Role | Typical outputs | Purpose |
|---|---|---|
| CEO intake | `NEEDS_USER` (with `question`) → ... → `GREEN` (with `candidate_spec_ready: true`) | Gather requirements via 10 question categories + 4-shadow probe + anti-feature-creep gate |
| CEO spec_authoring | `GREEN` (with `spec_path`, `phases[]`) | Phased spec authored to disk |
| CEO phase_close | `GREEN` | PROJECT.md block appended |
| CEO final | `DONE` (with `final_summary`) | Run-end summary |
| CTO plan_authoring | `GREEN` (with `implementation_plan_path`, `branch`, `task_graph[]`) | Per-phase plan + dispatch contract |
| CTO architect_review_loop | `GREEN` (`loop_done: true`), `NEEDS_REVISION` (`loop_done: false`), `REJECTED` | Reconcile architect feedback |
| Architect | `GREEN` always; additive only | `added_risks[]`, `edge_cases[]`, `scope_concerns[]`, `gate_results{}`, `gates_passed` |
| Implementer | `GREEN` / `DONE_WITH_CONCERNS` / `NEEDS_CONTEXT` / `NEEDS_USER_VIA_CEO` / `BLOCKED` | Task delivery, always commit before GREEN |
| Reviewer | `GREEN` / `NEEDS_REVISION` | `findings[]` with `severity` + `confidence` (1-10) |
| Auditor | `GREEN` (with `merge_done`, `phase_summary`, `deferred_concerns[]`) / `NEEDS_REVISION` (`redflags[]`) / `BLOCKED` | Cross-worktree gate + soft-landing |

## Git policy

- CTO declares branch per phase in plan: `agent/phase-<n>-<slug>`
- Task branches are flat suffixes: `agent/phase-<n>-<slug>--task-<task-id>` (git refs can't be both a tip and a namespace)
- One worktree per task under `.worktrees/<run-id>/<task-id>`
- Implementer commits before returning GREEN (hard rule)
- Auditor verdict GREEN → runtime merges task branches into phase branch and creates PR
- PR creation soft-fails (no remote, no `gh`, push refused) → emits `pr_failed` event, CEO records that in PROJECT.md, run continues
- Audit report at `agent-runs/<run-id>/audit/phase-<n>-report.md`; per-task logs at `agent-runs/<run-id>/audit/<task-id>.md`

## PROJECT.md update rule

After every phase close, CEO appends:

```
## Phase <n>: <title>
**Date:** <ISO>
**Spec:** docs/superpowers/specs/<file>.md
**Plan:** docs/superpowers/plans/<file>.md
**Audit:** agent-runs/<run-id>/audit/phase-<n>-report.md
**Branch:** agent/phase-<n>-<slug> (merged)
**PR:** <pr.url or "not created — reason: <reason>">

### What changed
<plain-language user-facing summary>

### Deferred Concerns
- **<task_id>** — <concern>
  - Severity if not addressed: <severity>
  - Suggested follow-up: <suggested phase>
  - Workaround: <current workaround>
```

PROJECT.md is the user-facing source of truth. No other docs.

## Observability

- Live stream: foreground `start` or `attach <run-id>` (CEO and you, color-coded events, fixed-width role tags)
- Events durable at `agent-runs/<run-id>/events.jsonl`
- Snapshot: `orgchart <run-id>` (one-shot status, tasks, worktrees, failures)
- Tail one agent live: `scripts/codex-org tail <run-id> --role <role>`
- Per-role logs at `agent-runs/<run-id>/logs/<label>-*.log` (full prompt + stdout + stderr)

Events emit on: role start/stop, status change, agent stream, heartbeat, file write, worktree create/merge, audit red-flag, user question issued/answered, PR created/failed, parse errors, loop caps, run-blocked.

## Iteration caps (runtime safeties)

| Loop | Cap | On exhaustion |
|---|---|---|
| CEO intake | 8 turns | Returns `NEEDS_USER` with all answers collected so far |
| Architect↔CTO | 5 iterations | Treats last CTO output as `GREEN` with `capped: true`; emits `architect_loop_capped` |
| Implementer↔Reviewer per task | 10 revisions | Records `FAIL_MAX_REVISIONS`, restartable |
| Auditor↔Implementer per phase | 3 passes | Returns `FAIL` with `reason: max audit iterations`; runtime treats as audit_failed |

Prompts include matching discipline (e.g. auditor must soft-land into `deferred_concerns` rather than block at pass 3).
