# AGENTS.md

Codex-only autonomous org. Read this at start of every run. All roles run with `sandbox = "danger-full-access"`, `approval = "never"`, mode = `yolo`. No dry-run, no auto, no claude.

## Mission

Take one user prompt → ship phase by phase autonomously. Pause only when CEO needs input.

## Required reading at runtime

```
AGENTS.md          # this file
PROJECT.md         # user-facing changelog; CEO appends after each phase
prompts/<role>.md  # your role contract
```

Superpower spec/plan artifacts live in `docs/superpowers/specs/` and `docs/superpowers/plans/`. Roles write there per skill; CEO links them in PROJECT.md.

No other markdown is part of the runtime surface. `bin/` holds archived docs.

## Entry

```
scripts/codex-org start "<user prompt>" [--ceo-mode product|technical]
scripts/codex-org attach <run-id>
scripts/codex-org list | orgchart <run-id> | logs <run-id> | diff <run-id> --task <id> | reply <run-id> "<text>" | stop <run-id>
```

`start`/`attach` are continuous streams. CEO questions block stdin inline. Ctrl-C detaches (run keeps going). `reply` is the off-band path.

## Org chart

```
ceo  ── interactive intake (only role that asks user) ──┐
 │                                                       │
 ├─ writes phased spec  →  docs/superpowers/specs/       │
 │                                                       │
 └─ per phase:                                           │
      ↓                                                  │
    cto  ── writing-plans (skip impl section) ───────────┤
     │                                                   │
     │   loops with architect (cto-controlled, no cap):  │
     │     architect ── gstack-plan-eng-review           │
     │                  additive only (no removals)      │
     │     cto decides loop_done OR reject               │
     │                                                   │
     ├─ branch = phase slug                              │
     ├─ spawn worktrees (one per task)                   │
     │                                                   │
     │   per task (parallel):                            │
     │     implementer-N (subagent-driven impl prompt)   │
     │       ↕ reviewer-N (spec + code-quality, dual)    │
     │     reused same agent identity across revisions   │
     │                                                   │
     │   when all tasks GREEN:                           │
     │                                                   │
     └─ auditor (cross-worktree)                         │
          per-worktree audit log: agent-runs/<run>/audit/<task>.md
          red-flag → original implementer (same agent)   │
          on GREEN: merge all worktrees → main           │
                                                         │
ceo phase-close: ingest audit + impl plan ──→ PROJECT.md ┘
ceo emits next_phase OR done
```

## Skills per role

| Role | Skills |
|---|---|
| ceo | `using-superpowers`, `brainstorming` (technical mode) OR `gstack-plan-ceo-review` (product mode), `writing-plans` |
| cto | `using-superpowers`, `writing-plans` (skip impl section), `using-git-worktrees`, `subagent-driven-development` |
| architect | `using-superpowers`, `gstack-plan-eng-review` (non-interactive, additive only) |
| implementer | `using-superpowers`, `subagent-driven-development` (implementer-prompt), `test-driven-development`, `systematic-debugging` |
| reviewer | `using-superpowers`, `subagent-driven-development` (spec-reviewer-prompt + code-quality-reviewer-prompt) |
| auditor | `using-superpowers`, `subagent-driven-development` (spec + code-quality), `finishing-a-development-branch` |

## Agent identity rules

- CEO + CTO: one instance, full run.
- Architect: one instance per phase, persists across CTO↔architect loop.
- Implementer-N + reviewer-N: one each per task, persist across their revision loop AND across auditor red-flag revisions.
- Auditor: one instance per phase.

Identity preserved by threading prior turns in the `conversation` field of each payload.

## Payload schema (every role call)

```json
{
  "run_id": "...",
  "role": "ceo|cto|architect|implementer|reviewer|auditor",
  "phase_no": 1,
  "phase": { "title": "...", "summary": "...", "acceptance": [] },
  "spec_path": "docs/superpowers/specs/...",
  "implementation_plan_path": "docs/superpowers/plans/...",
  "task": { "id": "...", "title": "...", "files": [], "instructions": "..." },
  "task_graph": [...],
  "worktree_id": "...",
  "branch": "agent/phase-1-...",
  "conversation": [...],
  "audit_log_path": "agent-runs/<run>/audit/<task>.md",
  "audit_report_path": "agent-runs/<run>/audit/phase-1-report.md",
  "files_touched": [],
  "parent_role": "..."
}
```

Roles return JSON; required field: `status` ∈ `GREEN | NEEDS_REVISION | NEEDS_USER | BLOCKED | REJECTED`.

## Output contracts (high-level)

| Role | Status fields it can set | Purpose |
|---|---|---|
| ceo | `NEEDS_USER` (with `question`), `GREEN` (with `spec` + `phases[]`), `DONE` (run end) | intake, phase split, phase close, final |
| cto | `GREEN` (loop_done, with branch+task_graph), `NEEDS_REVISION` (to architect), `REJECTED` (drops architect input) | per-phase plan + loop control |
| architect | `GREEN` (with `added_risks[]`, `edge_cases[]`) — always additive | upgrade plan |
| implementer | `GREEN` (with diff summary), `NEEDS_USER` is **not allowed** | task delivery |
| reviewer | `GREEN`, `NEEDS_REVISION` (with `required_changes[]`) | pair w/ implementer |
| auditor | `GREEN` (per worktree + final), `NEEDS_REVISION` (red-flag, with target `task_id`) | cross-worktree audit + merge |

## Git policy

- CTO creates branch per phase: `agent/phase-<n>-<slug>`.
- One worktree per task under `.worktrees/<branch>/<task_id>`.
- Auditor merges task branches into the phase branch on GREEN. Resolves conflicts directly (yolo).
- Runner then pushes the phase branch and runs `gh pr create --base main --head <phase-branch>` with the audit report as the PR body.
- PR creation soft-fails (no remote, no `gh`, push refused) → emits `pr_failed` event, CEO records that in PROJECT.md, run continues.
- Audit report at `agent-runs/<run>/audit/phase-<n>-report.md`. Per-task audit logs at `agent-runs/<run>/audit/<task>.md`.

## PROJECT.md update rule

After every phase close, CEO appends:

```
## Phase <n>: <title>
Date: <ISO>
Spec: docs/superpowers/specs/<file>.md
Plan: docs/superpowers/plans/<file>.md
Audit: agent-runs/<run-id>/audit/phase-<n>-report.md
Branch: agent/phase-<n>-<slug>  (merged)
Summary: <human-readable changes>
```

This is the user-facing source of truth. No other docs.

## Observability

- Live stream: foreground `start` or `attach <run-id>`.
- Events durable at `agent-runs/<run-id>/events.jsonl`.
- Snapshot: `orgchart <run-id>`.

Events emit on: role start/stop, status change, file write, worktree create/merge, audit red-flag, user-question issued/answered.
