# AGENT: Text-to-Gantt

## 1. Objective

Implement a production-oriented MVP that converts natural-language project schedules into an editable Gantt timeline.

## 2. Repository Structure

```text
/
  frontend/
  backend/
  docs/
  PRD.md
  SCHEMA.md
  DESIGN.md
  AGENT.md
```

Frontend and backend are separate applications with independent environment configuration and deployment.

## 3. Execution Rules

- Read only files relevant to the current task.
- Do not perform broad repository exploration unless the task requires it.
- Preserve existing architecture unless a direct requirement requires change.
- Make the smallest change that satisfies the requirement.
- Avoid refactoring unrelated code.
- Validate changed behavior once with the narrowest relevant command.
- Stop after the requested scope is complete.

## 4. Implementation Order

### /subgoal 1: Define domain schema
Implement canonical task and timeline schemas from SCHEMA.md.

### /subgoal 2: Build parser API
Implement `/api/parse-timeline` with structured LLM output, schema validation, date normalization, and ambiguity handling.

### /subgoal 3: Build input/review UI
Implement natural-language input, loading/error states, and structured task preview.

### /subgoal 4: Integrate Gantt
Implement Frappe Gantt through an adapter layer. Keep canonical domain types independent from the library.

### /subgoal 5: Add filtering
Add assignee filter without mutating canonical task data.

### /subgoal 6: Add direct editing
Support right-edge resize and synchronized duration/end-date updates.

### /subgoal 7: Add CSV export
Export normalized task state using the schema in SCHEMA.md.

### /subgoal 8: Integrate Graphify
Use Graphify to track relevant project structure and change relationships so future modifications can target affected nodes/files rather than broad repository inspection.

## 5. Approval Boundaries

Do not:
- Add authentication without explicit scope.
- Add persistence/database architecture without explicit scope.
- Replace Frappe Gantt with another library without explicit scope.
- Change the public API contract without updating SCHEMA.md and related consumers.
- Introduce unrelated dependencies.

## 6. AI Parsing Constraints

- Never trust raw model output.
- Validate all model output server-side.
- Never invent missing dates silently.
- Use reference date and timezone for relative dates.
- Preserve ambiguity when confidence is insufficient.
- Keep prompt logic separate from deterministic business rules.

## 7. Graphify Change Discipline

When changing a feature:
1. Identify the Graphify nodes directly affected by the change.
2. Inspect only relevant files/components represented by those nodes.
3. Update dependent nodes when schema/contracts change.
4. Avoid broad repository scans when dependency information already identifies the impact scope.

Graphify is a project-change tracking mechanism, not a replacement for domain validation or tests.

## 8. Validation

Prefer narrow checks:
- Typecheck changed app.
- Lint changed files or package scope.
- Run targeted tests for parser/date logic.
- Manually verify Gantt resize only when UI behavior changes.

Do not repeatedly run full-project validation after trivial changes unless the project configuration requires it.

<!-- antislop:start -->
## antislop
For UI, copy, people, mobile layout, or code comments work, read `antislop.md` (core) and then the skill for the task:
- UI / visual: `skills/antislop-ui/SKILL.md`
- Copy & text: `skills/antislop-copywriting/SKILL.md`
- People: `skills/antislop-human/SKILL.md`
- Mobile / responsive: `skills/antislop-layoutmobile/SKILL.md`
- Code comments: `skills/antislop-code/SKILL.md`
Before starting, ask the user when antislop applies: during the work, or after it is done.
<!-- antislop:end -->

