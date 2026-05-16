---
name: bmad-orchestrate-story
description: Orchestrate a BMAD Method story from current sprint status to done by coordinating existing BMAD workflows in sub-agent sessions. Use when the user asks to automatically implement, complete, finish, execute, or run a specific story such as "story 1-5", "US 2-1", or "hãy thực hiện story 1-5" without step-by-step intervention.
---

# BMAD Orchestrate Story

## Purpose

Drive one BMAD story from its current sprint state to `done` by acting as an orchestrator over the existing BMAD skills:

- `bmad-sprint-status`
- `bmad-help`
- `bmad-create-story`
- `bmad-dev-story`
- `bmad-quick-dev`
- `bmad-code-review`
- optional validation / QA skills when clearly applicable

This skill is a **workflow coordinator**, not the implementation workflow itself. The main session owns routing, verification, and user-visible summaries. Underlying BMAD workflows run in fresh sub-agent sessions.

## Core Operating Rules

- Keep the main session as the orchestrator: inspect status, decide next workflow, spawn subagents, summarize, and verify completion.
- Run BMAD workflow skills in fresh sub-agent sessions; do not execute `create-story`, `dev-story`, `quick-dev`, `code-review`, or long validation workflows directly in the main session unless the user explicitly asks.
- Use `bmad-help` as the fallback when routing is ambiguous, sprint status is missing/invalid, or a child workflow reports uncertainty about the next BMAD step.
- Continue automatically between workflow steps until every requested target story is verified `done` and committed, a blocker/HALT condition appears, or safety/user-approval boundaries are reached.
- Do not ask the user to approve normal workflow transitions such as backlog → create-story → dev-story → code-review → commit.
- For this skill, committing the completed story is part of the normal requested workflow: after a story is verified `done`, create a local git commit containing only the code/artifact changes for that story before moving to the next requested story.
- Do not perform destructive commands, external/public actions, pushes, deployments, or unrelated commits unless the user explicitly requests them.
- Reply and summarize in the user's language; default to Vietnamese for Vietnamese requests.

## Accepted Inputs

Extract one or more target stories from user text, including:

- `1-5`
- `story 1-5`
- `US 1-5`
- full story key, e.g. `1-5-add-order-discount-support`
- a story file path under implementation artifacts
- multiple story ids/keys/paths in one request, e.g. `story 1-5, 1-6, and 2-1`

If multiple stories are requested, preserve the user's order and process them strictly sequentially. Finish the full workflow for the current story, including verification and commit, before starting the next story.

If no story is specified, use `bmad-sprint-status` / `bmad-help` to identify the next actionable story. If multiple candidates are equally valid, ask the user to choose one.

## State Model

Track these fields during the run:

- `target_stories`: ordered list of normalized story ids/keys/paths requested by the user
- `current_story_index`: zero-based index into `target_stories`
- `target_story`: current story id/key/path being processed
- `completed_stories`: stories verified `done` and committed in this orchestration run
- `story_file`: exact file path when known
- `sprint_status_file`: usually `_bmad-output/implementation-artifacts/sprint-status.yaml`, resolved from BMAD config when possible
- `current_status`: one of `backlog`, `ready-for-dev`, `in-progress`, `review`, `done`, `unknown`
- `last_workflow`: latest spawned skill
- `last_result`: verdict, changed files, gates, blockers, and next recommendation
- `commit_result`: commit hash/message for the current story once committed
- `retry_counts`: count attempts per workflow/status
- `review_findings`: findings to feed back into development

Use `update_plan` in the main session for non-trivial runs so the visible plan matches the real state.

## Routing Table

Use sprint status and story file status as source of truth.

| Story status | Next action |
| --- | --- |
| `backlog` | Spawn `bmad-create-story` |
| `ready-for-dev` | Spawn `bmad-dev-story` |
| `in-progress` | Spawn `bmad-dev-story` with current context |
| `review` | Spawn `bmad-code-review` |
| `done` | Verify story file and sprint status, then stop |
| `unknown` / invalid / missing | Use `bmad-help`, then retry routing |

Prefer `bmad-quick-dev` over `bmad-dev-story` only when the story/change is clearly small, localized, and does not need the full story workflow, or when `bmad-help` / sprint status explicitly recommends it. Otherwise use `bmad-dev-story`.

## Orchestration Workflow

### 1. Normalize request

1. Extract ordered target story id(s)/key(s)/path(s).
2. Resolve project root as the current OpenClaw workspace.
3. Read BMAD config enough to locate `implementation_artifacts` when needed.
4. Initialize visible plan:
   - identify story status
   - run required BMAD workflow
   - review/patch if needed
   - verify `done`
   - commit completed story
   - move to next requested story, if any

### 2. Probe sprint status

Spawn a fresh sub-agent or use a lightweight main-session read when only parsing files is enough:

- Primary: run `bmad-sprint-status` in data/summary mode if available.
- Fallback: read `_bmad-output/implementation-artifacts/sprint-status.yaml` directly.
- If status cannot be determined, run `bmad-help` in the main session or a fresh sub-agent and ask it for the next BMAD skill.

Expected status output to capture:

- matched story key
- current story status
- story file path if known
- recommended next workflow
- sprint status file path
- anomalies or blockers

### 3. Spawn the selected workflow

For each child session, include:

- exact skill to use
- target story id/key/path
- relevant sprint status summary
- previous workflow result, if any
- explicit instruction: run only this workflow, update required BMAD artifacts, report status, blockers, changed files, gates/evidence, and suggested next workflow; do not launch the next workflow yourself

Use isolated/fresh context by default. Use forked context only if the child needs details from the current transcript that are not in files or the child prompt.

### 4. Handle child result

After a child completes:

1. Summarize result internally: status, blockers, files, gates, findings.
2. Re-read or re-check sprint status; do not rely only on the child's claim.
3. Update the visible plan.
4. Route again using the table above.

If a child reports `HALT`, missing requirements, conflicting instructions, destructive action needs, or a decision outside normal BMAD flow, stop and ask the user one concise question.

### 5. Review / patch loop

Expected cycle:

1. `bmad-dev-story` implements and moves story to `review`.
2. `bmad-code-review` reviews.
3. If review passes and status becomes `done`, verify and finish.
4. If review returns `changes-needed`, spawn `bmad-dev-story` again with the findings.
5. Repeat until `done` or blocked.

Set a retry guard:

- max 3 development/review repair loops by default
- max 2 attempts for create-story unless it makes visible progress
- if status does not change after repeated attempts, use `bmad-help`; if still stuck, report `[blocked]`

### 6. Completion gate and commit

For each requested story, do not claim that story is complete until one of these is true:

- `sprint-status.yaml` shows the target story as `done`, and the story file status is also `done` when a story file exists.
- Or `bmad-code-review` explicitly reports that it updated/synced both story file and sprint status to `done`, and a direct inspection does not contradict it.

After the current story is verified `done`:

1. Inspect git status/diff and identify only files changed for the current story.
2. Run the smallest meaningful validation gate if no child workflow already provided current evidence.
3. Create a local git commit for that story before proceeding to the next requested story.
   - Use a clear story-scoped message such as `feat: complete story {{target_story}}` or the project’s existing commit convention when obvious.
   - Stage only files that belong to the completed story. Do not include unrelated working-tree changes.
   - If unrelated pre-existing changes make a clean story commit unsafe, stop with `[blocked]` and ask the user how to handle them.
   - Do not push unless the user explicitly asks.
4. Re-check that the working tree state is safe for the next requested story.
5. If more stories remain, reset per-story transient state (`story_file`, `current_status`, `last_workflow`, `last_result`, `review_findings`, `retry_counts`, `commit_result`) and continue with the next story in order.

Do not claim the overall orchestration is complete until all requested stories have either:

- been verified `done` and committed, or
- hit a blocker that prevents safe continuation.

Final response must include:

- final status for each requested story
- commit hash/message for each completed story
- workflows run
- key changed files/artifacts
- gates/tests/review evidence
- any blockers or follow-up notes

## Child Prompt Templates

### Sprint status child

```text
Use skill `bmad-sprint-status` to inspect the current sprint and locate target story: {{target_story}}.
Return only: matched story key, current status, story file path if known, recommended next workflow, sprint-status path, and blockers/anomalies. Do not run the next workflow.
```

### Create story child

```text
Use skill `bmad-create-story` for target story {{target_story}}.
Create or update the story according to BMAD workflow. Update sprint status if the workflow requires it. Stop after create-story completes.
Report: story file path, final story status, sprint status entry, blockers, and recommended next workflow. Do not run dev-story.
```

### Dev story child

```text
Use skill `bmad-dev-story` for {{story_file_or_target_story}}.
Implement the story until complete or HALT. If review findings are provided, fix them as part of the same story cycle.
Run appropriate project gates from the story/workflow. Update allowed story sections and sprint status according to BMAD rules.
Report: final story status, sprint status entry, changed files, gates run with results, blockers/HALT, and whether code-review should run next. Do not run code-review.

Review findings/context:
{{review_findings}}
```

### Quick dev child

```text
Use skill `bmad-quick-dev` for {{target_story_or_fix}} only because the orchestrator determined this is a small localized change or the BMAD recommendation selected quick-dev.
Make the minimal safe change, run relevant gates, update applicable BMAD artifacts, and report final status, files, gates, blockers, and next recommendation. Do not run code-review.
```

### Code review child

```text
Use skill `bmad-code-review` for {{story_file_or_target_story}}.
Review the implemented story against acceptance criteria, changed files, and BMAD workflow requirements. Run/check appropriate gates. Update story/sprint status if the workflow requires it.
Report: verdict (`approved`, `changes-needed`, or `blocked`), findings, evidence/gates, files reviewed, final story status, sprint status entry, and exact fixes needed if any. Do not run dev-story.
```

### Help fallback child

```text
Use skill `bmad-help` to determine the correct next BMAD workflow for target story {{target_story}}.
Context: current status={{current_status}}, last workflow={{last_workflow}}, last result={{last_result}}.
Return the recommended next skill, reasoning, required inputs, and any blocker. Do not execute the recommended workflow.
```

## Safety and Stop Conditions

Stop and ask the user if:

- the target story is ambiguous and cannot be resolved from sprint status
- a workflow reports a HALT condition
- acceptance criteria or product intent conflict
- implementation requires destructive commands, credential changes, external messages, production deployments, or public actions
- repeated loops make no progress
- the next action is a major course correction rather than a normal BMAD transition

When blocked, report:

- `[blocked]` reason
- evidence/source
- the smallest decision needed from the user
- recommended option

## Notes for OpenClaw Execution

- Use `sessions_spawn` for fresh sub-agent workflow runs.
- Use `sessions_yield` after spawning long child workflows so completion is push-based.
- Do not poll subagents in a tight loop; inspect status only on demand or after completion events.
- Use `read` / direct file inspection for verification after child workflows complete.
- Use `exec` only for local, non-destructive commands such as tests, validation, or file discovery.
- Keep progress updates short and concrete.
