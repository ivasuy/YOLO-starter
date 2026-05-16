# PROJECT.md

User-facing changelog of changes made by the codex-org. CEO appends one block per shipped phase.

This file is the durable, plain-language record of what the autonomous org delivered, in order. Each phase block names the spec, plan, audit report, branch, PR, and a human-readable summary of what changed for the user.

## How to read this file

- **Phases are append-only.** Newer phases go at the bottom.
- **Each phase block is self-contained** — you don't need to read prior phases to understand it.
- **Deferred Concerns** are non-blocking issues the auditor noted but chose not to block on; future runs can pick them up.

## Status

(initial — no phases shipped yet)

---

<!-- CEO appends one phase block here per shipped phase, using this template: -->
<!--
## Phase <n>: <title>
**Date:** <ISO-8601>
**Spec:** docs/superpowers/specs/<file>.md
**Plan:** docs/superpowers/plans/<file>.md
**Audit:** agent-runs/<run-id>/audit/phase-<n>-report.md
**Branch:** agent/phase-<n>-<slug> (merged)
**PR:** <url or "not created — reason: X">

### What changed
<plain-language user-facing summary>

### Deferred Concerns
- **<task_id>** — <concern>
  - Severity if not addressed: <severity>
  - Suggested follow-up: <phase / backlog>
  - Workaround: <current workaround>
-->
