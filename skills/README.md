# skills

Use this folder for project-specific or vendored agentic skill source that should travel with the template.

This starter keeps the canonical portable skill source here so the workflow works even on machines without user-level skill installs.

Superpowers-generated specs and plans belong in:

```text
docs/superpowers/specs/
docs/superpowers/plans/
```

Do not copy every user-level skill into this repository. Add a project skill only when it is project-specific, repeated, or protects against a known failure mode.

Bundled starter skills:

- `project-workflow`: local workflow entry point for this starter.
- `superpower/using-superpowers`: call at the start of any new session or task.
- `superpower/brainstorming`: call for vague features, product decisions, and UX direction before implementation.
- `superpower/writing-plans`: call after the spec/design is approved and work needs a task plan.
- `superpower/subagent-driven-development`: call when executing a plan with independent tasks and review loops.
- `superpower/systematic-debugging`: call before fixing any bug, failing test, build failure, or unexpected behavior.
- `superpower/using-git-worktrees`: call before isolated worktree-based task execution.
- `superpower/test-driven-development`: call before implementing any feature, bug fix, refactor, or behavior change.
- `superpower/finishing-a-development-branch`: call when implementation is done and merge/PR/cleanup decisions remain.
- `github-readme`: imported README-writing skill source. Use it when writing the product README after adopting the template.
