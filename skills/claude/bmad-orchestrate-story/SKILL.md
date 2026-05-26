---
name: bmad-orchestrate-story
description: Orchestrate one or more BMAD Method stories from current sprint status to done by coordinating existing BMAD workflows in sub-agent sessions. Accepts one or more story ids (e.g. "story 1-5, 1-6, 1-7") processed sequentially until all are done, or a raw requirement (text or file path) which is first turned into a story via bmad-create-story and then carried through the same flow. Use when the user asks to automatically implement, complete, finish, execute, or run specific stories such as "story 1-5", "US 2-1", "hãy thực hiện story 1-5, 1-6", or to build a requirement end-to-end without step-by-step intervention.
---

# BMAD Orchestrate Story

## Purpose

Drive one or more BMAD stories from their current sprint state to `done` by acting as an orchestrator over the existing BMAD skills. Input may be one or more story references (processed sequentially until all are `done`) or a raw requirement (text or file) that is first converted into a story via `bmad-create-story`. The orchestrator coordinates:

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

## Model Selection

When spawning child sub-agent sessions, the orchestrator MUST pass an explicit `model` parameter based on the workflow being run:

| Child workflow skill | Model to use |
| --- | --- |
| `bmad-create-story` | `opus` |
| `bmad-sprint-status` | `sonnet` |
| `bmad-help` | `sonnet` |
| `bmad-dev-story` | `sonnet` |
| `bmad-quick-dev` | `sonnet` |
| `bmad-code-review` | `sonnet` |
| any other BMAD workflow not listed above | `sonnet` |

Rationale: story creation requires the strongest reasoning for requirements decomposition, acceptance criteria, and architectural alignment, so it runs on Opus. All other workflows (status probing, implementation, review, helpers) run on Sonnet for cost/speed efficiency.

Apply this rule on every sub-agent spawn (e.g., via the Agent tool's `model` field). Do not override these defaults unless the user explicitly requests a different model for a specific run.

## Accepted Inputs

The orchestrator runs in one of two input modes. Decide the mode first, then normalize.

### Mode A — Story references (one or more)

Extract one or more target stories from user text, including:

- `1-5`
- `story 1-5`
- `US 1-5`
- full story key, e.g. `1-5-add-order-discount-support`
- a story file path under implementation artifacts
- multiple story ids/keys/paths in one request, e.g. `story 1-5, 1-6, and 2-1`

If multiple stories are requested, preserve the user's order and process them **strictly sequentially**. Finish the full workflow for the current story — including verification and commit — before starting the next story. The run is complete only when **every** requested story is verified `done` (or one hits a blocker that prevents safe continuation).

### Mode B — Requirement (text or file)

The user may instead pass a raw requirement rather than a story reference, e.g.:

- inline requirement text describing what to build
- a path to a requirement file (e.g. a `.md`/`.txt` spec, a brief, or an attached document)

When the input is a requirement, do **not** try to guess an existing story id. Instead:

1. Capture the requirement as `requirement_input` (the verbatim text, or the resolved file path + its contents).
2. Spawn `bmad-create-story` with the requirement as its input/context so it produces a concrete story file (see the requirement-based create-story child template below).
3. Capture the resulting story key/file as a normal `target_story`, append it to `target_stories`, then continue with the standard flow (dev-story → code-review → verify `done` → commit) exactly as in Mode A.

A single request may mix modes (e.g. "implement story 1-5 and also build this requirement: ..."). Process each item sequentially in the user's order; requirement items go through create-story first, story-reference items route directly off sprint status.

### No input

If neither a story nor a requirement is specified, use `bmad-sprint-status` / `bmad-help` to identify the next actionable story. If multiple candidates are equally valid, ask the user to choose one.

## State Model

Track these fields during the run:

- `input_mode`: `stories`, `requirement`, or `mixed` — how the user supplied work
- `requirement_input`: when a requirement was supplied, the verbatim requirement text and/or resolved requirement file path (+ its contents)
- `work_queue`: ordered list of pending work items in the user's order; each item is either a story reference or a requirement to convert first
- `target_stories`: ordered list of normalized story ids/keys/paths to drive to `done` (requirement items are appended here once `bmad-create-story` produces a concrete story)
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

1. Determine `input_mode`: are the user's items story references, a requirement (text/file), or a mix? Build `work_queue` in the user's order.
2. For story-reference items, extract the normalized story id(s)/key(s)/path(s).
3. For a requirement item, capture `requirement_input`: keep the verbatim text, and if a file path was given, resolve it and load its contents. Do not invent a story id — this item will go through `bmad-create-story` first (step 1.5 / Mode B).
4. Resolve project root as the current OpenClaw workspace.
5. Read BMAD config enough to locate `implementation_artifacts` when needed.
6. Initialize visible plan, one tracked unit per work item:
   - (requirement items only) create story from requirement
   - identify story status
   - run required BMAD workflow
   - review/patch if needed
   - verify `done`
   - commit completed story
   - move to next requested item, if any

### 1.5 Convert requirement items to stories (Mode B)

When the current work item is a requirement (not a story reference):

1. Spawn `bmad-create-story` (model `opus`) using the requirement-based create-story child template, passing `requirement_input` as the input/context.
2. Capture the resulting story file path and story key from the child's report.
3. Append that story key/path to `target_stories` and treat it as the `target_story` for the rest of the flow.
4. Re-read sprint status so routing uses the real, just-created entry rather than the child's claim.
5. Proceed into the standard flow (Probe → route → dev → review → verify → commit) exactly as for a story-reference item.

If the requirement is too ambiguous for `bmad-create-story` to produce a single coherent story (e.g. it spans multiple epics or needs product decisions), stop and ask the user one concise question, or surface the child's clarifying questions, before continuing.

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

Spawn with `model: sonnet`.

```text
Use skill `bmad-sprint-status` to inspect the current sprint and locate target story: {{target_story}}.
Return only: matched story key, current status, story file path if known, recommended next workflow, sprint-status path, and blockers/anomalies. Do not run the next workflow.
```

### Create story child (from a story reference)

Spawn with `model: opus` (story creation always uses Opus).

```text
Use skill `bmad-create-story` for target story {{target_story}}.
Create or update the story according to BMAD workflow. Update sprint status if the workflow requires it. Stop after create-story completes.
Report: story file path, final story status, sprint status entry, blockers, and recommended next workflow. Do not run dev-story.
```

### Create story child (from a requirement — Mode B)

Spawn with `model: opus` (story creation always uses Opus).

```text
Use skill `bmad-create-story` to turn the following requirement into a single concrete BMAD story, then stop.
The user supplied a raw requirement rather than an existing story id; use it as the primary input/context for what to build.

Requirement (verbatim text and/or file path + contents):
{{requirement_input}}

Create the story file and update sprint status according to BMAD workflow. Align with existing epics/PRD/architecture where they apply; if the requirement clearly maps to an existing epic, place the story there, otherwise follow the workflow's rules for new work.
Report: created story file path, assigned story key, final story status, sprint status entry, any clarifying questions or blockers, and recommended next workflow. Do not run dev-story.
```

### Dev story child

Spawn with `model: sonnet`.

```text
Use skill `bmad-dev-story` for {{story_file_or_target_story}}.
Implement the story until complete or HALT. If review findings are provided, fix them as part of the same story cycle.
Run appropriate project gates from the story/workflow. Update allowed story sections and sprint status according to BMAD rules.
Report: final story status, sprint status entry, changed files, gates run with results, blockers/HALT, and whether code-review should run next. Do not run code-review.

Review findings/context:
{{review_findings}}
```

### Quick dev child

Spawn with `model: sonnet`.

```text
Use skill `bmad-quick-dev` for {{target_story_or_fix}} only because the orchestrator determined this is a small localized change or the BMAD recommendation selected quick-dev.
Make the minimal safe change, run relevant gates, update applicable BMAD artifacts, and report final status, files, gates, blockers, and next recommendation. Do not run code-review.
```

### Code review child

Spawn with `model: sonnet`.

```text
Use skill `bmad-code-review` for {{story_file_or_target_story}}.
Review the implemented story against acceptance criteria, changed files, and BMAD workflow requirements. Run/check appropriate gates. Update story/sprint status if the workflow requires it.
Report: verdict (`approved`, `changes-needed`, or `blocked`), findings, evidence/gates, files reviewed, final story status, sprint status entry, and exact fixes needed if any. Do not run dev-story.
```

### Help fallback child

Spawn with `model: sonnet`.

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
