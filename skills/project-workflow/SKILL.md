---
name: project-workflow
description: Use when starting, planning, implementing, reviewing, debugging, orchestrating, or completing work in this project starter template.
---

# Project Workflow

Use this skill as the entry point for this template's agentic organization.

This repository bundles the core Superpowers workflow chain locally in `skills/superpower/`. Prefer these local bundled copies over assuming global user-level skill installs.

## Required Reading

Read:

- `AGENTS.md`
- `PROJECT.md`
- `WORKFLOW.md`

## Route The Work

- Vague feature or product decision: use `using-superpowers`, then `brainstorming`; CEO owns the spec.
- Multi-step implementation: use `writing-plans`; CTO owns the plan.
- Bug, failing test, build failure, or unexpected behavior: use `systematic-debugging` before fixing.
- Feature, bug fix, refactor, or behavior change: use `test-driven-development`.
- Independent plan tasks: use `subagent-driven-development`.
- Tiny low-risk work: inline execution is allowed.
- Completion, merge, PR, or cleanup: use `finishing-a-development-branch`.
- Unattended cross-provider orchestration: use `scripts/agent-runner` with a task file in `workflow/`.

Bundled local paths:

- `skills/superpower/using-superpowers/SKILL.md`
- `skills/superpower/brainstorming/SKILL.md`
- `skills/superpower/writing-plans/SKILL.md`
- `skills/superpower/subagent-driven-development/SKILL.md`
- `skills/superpower/systematic-debugging/SKILL.md`
- `skills/superpower/using-git-worktrees/SKILL.md`
- `skills/superpower/test-driven-development/SKILL.md`
- `skills/superpower/finishing-a-development-branch/SKILL.md`

## Role Defaults

- CEO: product intent, acceptance criteria, specs in `docs/superpowers/specs/`.
- CTO: implementation plan, model routing, worktrees, dispatch, reviewers, merge.
- Implementer: assigned files only, TDD, targeted checks.
- Reviewer: read-only review, `GREEN` or `CHANGES_REQUIRED`.

## Worktree Rule

Use `.worktrees/<task-slug>` for isolated implementation once the repo is under git and `.worktrees/` is ignored.

Do not parallelize implementers into the same files. The CTO must assign file ownership before dispatch.

## Executive Alignment Rule

CEO and CTO may run a bounded debate before implementation. Keep this to upper management roles. Implementers and reviewers should not debate direction; they should report status and findings.

## Model Rule

Use the cheapest safe model:

- CTO and final merge: `gpt-5.5` `xhigh`.
- Mechanical implementation: `gpt-5.3-codex` medium or fast equivalent.
- Normal review: `gpt-5.4` high or stronger.
- Cheap scans/docs: spark, mini, or haiku-class.
- High-risk security/auth/storage/money/data-loss work: strongest available reviewer.

## Memory Rule

`PROJECT.md` is the only durable state file. Specs and plans live under `docs/superpowers/` only when needed.
