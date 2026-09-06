# DESIGN: Text-to-Gantt

## 1. Design Direction

The application should feel like a project planning utility rather than a generic AI chat interface.

Priority order:
1. Timeline readability.
2. Fast generation.
3. Low-friction editing.
4. Clear AI uncertainty.

## 2. Page Structure

```text
App Shell
├── Header
│   ├── Product name
│   ├── Generate action
│   └── Export CSV
├── Input Section
│   ├── Textarea
│   └── Parse status
├── Review Section
│   ├── Validation summary
│   ├── Task preview table
│   └── Warnings
├── Filter Bar
│   └── Assignee selector
└── Gantt Workspace
    ├── Timeline header
    ├── Task labels
    ├── Gantt bars
    └── Horizontal scroll
```

## 3. Interaction Rules

### Generate
Button is disabled for empty input. During generation show progress state and prevent duplicate requests.

### Review
Warnings should be visible before entering the main Gantt workspace.

### Resize
Dragging the right edge of a Gantt bar changes end date. Display updated duration immediately.

### Filter
Filtering should not mutate the underlying task array.

### Export
Export button should use current canonical state, not the original AI response.

## 4. Visual Hierarchy

Use a neutral application canvas with strong contrast between:
- Input area.
- Review/validation information.
- Filter controls.
- Gantt workspace.

Avoid excessive dashboard cards. The Gantt should receive the largest visual area.

## 5. Responsive Behavior

Desktop is the primary MVP target because Gantt editing requires horizontal space.

Tablet:
- Keep horizontal scroll.
- Collapse secondary controls if required.

Mobile:
- View-only or limited interaction may be supported.
- Do not optimize MVP around mobile editing.

## 6. Accessibility

- Form controls must have accessible labels.
- Keyboard focus states must remain visible.
- Color cannot be the only indication of validation status.
- Task information should remain understandable without relying on hover alone.

## 7. Component Boundaries

Suggested frontend components:

```text
components/
├── timeline-input/
├── parse-review/
├── assignee-filter/
├── gantt-board/
├── gantt-task-tooltip/
├── export-csv-button/
└── status-banner/
```

Keep Gantt-library-specific code inside `gantt-board` and its adapter. Do not let the library dictate the application's full domain model.

## 8. Design States

Every major flow needs:
- Empty state.
- Loading state.
- Success state.
- Validation-warning state.
- Error state.

## 9. Example Empty State

Headline:
`Turn your project schedule into a timeline.`

Supporting text:
`Paste a schedule in plain language. Text-to-Gantt will extract tasks, dates, and owners.`

Input placeholder:
`Example: Andi starts frontend on September 10 for 5 days...`
