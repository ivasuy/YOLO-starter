# PROJECT.md

One-file project memory for an adopted repo.

This starter ships `PROJECT.md` from `PROJECT.template.md` during bootstrap.
Replace placeholders with real project details after adoption, then keep the
file short and current.

---

## 1. Project brief

Project name: `<replace-with-project-name>`

One-line description: `<what this product or repo does>`

User / customer: `<who this is for>`

Problem: `<what problem the project solves>`

Smallest useful version: `<the smallest shippable scope>`

Non-goals: `<what this repo is intentionally not doing right now>`

---

## 2. Current status

Last updated: `<YYYY-MM-DD>`

Current branch: `<branch name or "not a git repository yet">`

Current milestone: `<current milestone or sprint>`

Active task: `<one active task>`

Next action: `<next concrete step>`

Blocked on: `<none or blocker>`

---

## 3. Starter baseline

Use this section to record only the durable facts a fresh agent session needs.

Runtime / language: Markdown docs plus shell/Python workflow helpers

Entry points: `AGENTS.md`, `PROJECT.md`, `WORKFLOW.md`, `CLAUDE.md`, `ARCHITECTURE.md`, `TEMPLATE.md`

Workflow baseline:
- `scripts/agent-runner` is the runtime control plane for unattended CEO/CTO/implementer/reviewer orchestration.
- The runner supports executive alignment, CTO plan authoring, per-task worktrees, implementer/reviewer review loops, commit and cleanup contract checks, CTO task acceptance, final integration review, merge attempts, final summary output, and operator commands for run discovery/watch/status/logs/diff.
- `workflow/*.json` defines the role map, task graph, review limits, and summary behavior.
- `workflow/org.defaults.json` defines shared org preset defaults and required-skill metadata for the wrapper scripts.
- `agent-runs/` stores run artifacts, logs, parsed responses, and summaries.

Bundled starter assets:
- Repo-local Superpowers workflow skills live in `skills/superpower/`.
- Claude role files live in `.claude/agents/`.
- Portable Codex role templates live in `.codex/agents/`.
- Prompt contracts live in `prompts/`.
- Helper wrappers and org preset defaults live in `scripts/` and `workflow/`.
- `PROJECT.template.md` is the clean seed used by bootstrap for adopted repos.

Important constraints:
- Keep root `README.md` blank until the adopted project is ready for product-facing docs.
- Use `TEMPLATE.md` for starter usage, not as durable project memory.
- Worktree execution requires a real git repository with `.worktrees/` ignored.
- Start unattended runs with `--mode dry-run` before `auto` or `yolo`.

---

## 4. Commands

Record the real commands for the adopted repo here. Replace examples as the project matures.

```bash
# workflow preview
scripts/agent-runner run workflow/tasks.example.json --mode dry-run

# discover and watch runs
scripts/agent-runner list
scripts/agent-runner watch <run-id>
scripts/agent-runner status <run-id>

# preset preview
scripts/run-codex-org-yolo workflow/tasks.example.json --mode dry-run

# unattended workspace-scoped run
scripts/agent-runner run workflow/tasks.example.json --mode auto

# full-bypass run in trusted isolation only
scripts/agent-runner run workflow/tasks.example.json --mode yolo --allow-yolo

# optional bootstrap into another repo
scripts/bootstrap-agent-runtime /path/to/target-repo
```

---

## 5. Decisions

Use short durable entries only.

### YYYY-MM-DD - Decision title

Decision:

Why:

Consequence:

---

## 6. Changelog / session handoff

Append one compact entry after each meaningful session.

### YYYY-MM-DD - <feature/fix/task>

Branch:

Commit:

Summary:

Files changed:

Checks run:

Architecture changed:

Remaining:

Next action:
