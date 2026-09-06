# Interactive Timeline Generation & Heuristic Parsing Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Transform the "Generate Timeline" action into an interactive, unmistakably responsive, and human-perceptible operation with visual loading, success confirmation, canvas redraw triggering, and smart heuristic extraction for natural-language freeform input.

**Architecture:** 
1. **Frontend-Only Heuristic Extraction:** Enhance `raw-text.ts` to detect duration (`3 hari`, `2w`), relative/explicit dates (`besok`, `10 Sep`), and assignees (`oleh Andi`, `@Budi`) on freeform lines lacking delimiter pipes (`|`), extracting structured task objects without requiring an external AI backend.
2. **Monotonic Generation Synchronization:** Introduce a monotonic counter `generationTick` passed to `GanttBoard`, busting the memoized `renderKey` cache so clicking "Generate Timeline" forces a live SVG redraw and visual canvas pulse even when task data is unchanged.
3. **Multi-Stage Visual Feedback:** Upgrade `handleParse` from an imperceptible 30ms timeout to a 280ms human-perceptible loading state followed by a 1.8s green success state (`Check` icon + "Timeline Generated!") and floating toast indicator.

**Tech Stack:** Next.js 15 (App Router), React 19, TypeScript, Tailwind CSS, Lucide React, Frappe Gantt, tsx.

**Spec:** [generate_timeline_diagnosis_and_plan.md](file:///home/sh1shiroon/.gemini/antigravity-cli/brain/297e3736-f261-4fc8-a23e-1e32a753eb23/generate_timeline_diagnosis_and_plan.md)

## Global Constraints

- **Pure Client-Side First:** All parsing and feedback must run client-side without requiring network calls or backend API servers.
- **Zero Breakage of Existing Formats:** Delimited formats (pipe `|`, tab `\t`, comma `,`) and existing test suites (`scripts/parser-check.ts`) must retain 100% backward compatibility.
- **Strict Accessibility & Contrast:** Button colors, spinners, toasts, and animation pulses must comply with WCAG AA contrast standards.
- **Type Safety:** Zero TypeScript errors on `npm run build` or `tsc --noEmit`.

---

### Task 1: Heuristic Natural-Language Line Extractor

**Files:**
- Create: `frontend/scripts/test-natural-parser.ts`
- Modify: `frontend/src/lib/format/raw-text.ts`

**Interfaces:**
- Consumes: `text: string` in `parseRawText(text: string)`
- Produces: `ParseRowState[]` with populated `name`, `assignee`, `start`, `duration`, `end`, `dependsOn` even when input lines have no pipes or separators.

- [ ] **Step 1: Write the failing test**

Create `frontend/scripts/test-natural-parser.ts`:
```typescript
import { parseRawText } from '../src/lib/format/raw-text'

let failures = 0
function check(desc: string, cond: boolean) {
  if (!cond) {
    failures++
    console.error(`FAIL: ${desc}`)
  } else {
    console.log(`ok: ${desc}`)
  }
}

// Test 1: Piped lines still parse correctly (backward compatibility)
const piped = parseRawText('Sprint Planning | Andi | 10 Sep 2026 | 2 hari')
check('piped row count', piped.length === 1)
check('piped name', piped[0].name === 'Sprint Planning')
check('piped assignee', piped[0].assignee === 'Andi')
check('piped start', piped[0].start === '10 Sep 2026')
check('piped duration', piped[0].duration === '2 hari')

// Test 2: Natural language with "oleh" and duration
const freeform1 = parseRawText('Riset pasar dan kompetitor besok selama 3 hari oleh Tini')
check('freeform1 row count', freeform1.length === 1)
check('freeform1 name', freeform1[0].name.trim() === 'Riset pasar dan kompetitor')
check('freeform1 assignee', freeform1[0].assignee === 'Tini')
check('freeform1 start', freeform1[0].start === 'besok')
check('freeform1 duration', freeform1[0].duration === '3 hari')

// Test 3: Natural language with @mention and week duration
const freeform2 = parseRawText('Desain UI/UX wireframe 2 minggu @Budi')
check('freeform2 name', freeform2[0].name.trim() === 'Desain UI/UX wireframe')
check('freeform2 assignee', freeform2[0].assignee === 'Budi')
check('freeform2 duration', freeform2[0].duration === '2 minggu')

// Test 4: Natural language with explicit date and shorthand duration
const freeform3 = parseRawText('Testing regression 15 Sep 4d lead: Siti')
check('freeform3 name', freeform3[0].name.trim() === 'Testing regression')
check('freeform3 assignee', freeform3[0].assignee === 'Siti')
check('freeform3 start', freeform3[0].start === '15 Sep')
check('freeform3 duration', freeform3[0].duration === '4d')

if (failures > 0) {
  console.error(`\n${failures} tests failed!`)
  process.exit(1)
} else {
  console.log(`\nAll natural language parser tests passed!`)
  process.exit(0)
}
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npx tsx scripts/test-natural-parser.ts` from `frontend`
Expected: FAIL on `freeform1 name` or `freeform1 assignee` because current `raw-text.ts` puts the whole sentence into `name`.

- [ ] **Step 3: Write minimal implementation**

Modify `frontend/src/lib/format/raw-text.ts`:
Add a heuristic line extractor helper `extractFreeformLine(raw: string)` that checks for:
- Assignee: `/\b(?:oleh|assignee:|lead:|pic:)\s+([a-zA-Z0-9_\-\.]+)/i` or `/@([a-zA-Z0-9_\-\.]+)/i`
- Duration: `/\b(\d+)\s*(?:hari|day|days|minggu|week|weeks|hr|d|w)\b/i` or `/\b(?:selama|durasi:?)\s+(\d+\s*(?:hari|day|days|minggu|week|weeks|hr|d|w))\b/i`
- Start date / relative keywords: `/\b(besok|lusa|hari ini|today|tomorrow|senin depan|selasa depan|rabu depan|kamis depan|jumat depan|sabtu depan|minggu depan|\d{1,2}\s+(?:jan|feb|mar|apr|mei|may|jun|jul|agu|aug|sep|okt|oct|nov|des|dec)[a-z]*|\d{4}-\d{2}-\d{2})\b/i`
- Name: Clean up matched tokens from the raw string and trim.

Integrate into `parseRawText`:
```typescript
function parseFreeformLine(raw: string): { name: string; assignee: string; start: string; duration: string; end: string; dependsOn: string } {
  let text = raw.replace(/^[-*•\d\.]+\s*/, '') // remove bullets / numbers
  let assignee = ''
  let duration = ''
  let start = ''
  let dependsOn = ''

  // 1. Extract assignee
  const picMatch = text.match(/\b(?:oleh|assignee:|lead:|pic:)\s+([a-zA-Z0-9_\-\.]+)/i)
  if (picMatch) {
    assignee = picMatch[1]
    text = text.replace(picMatch[0], ' ')
  } else {
    const atMatch = text.match(/@([a-zA-Z0-9_\-\.]+)/)
    if (atMatch) {
      assignee = atMatch[1]
      text = text.replace(atMatch[0], ' ')
    }
  }

  // 2. Extract duration (e.g., "selama 3 hari", "3 hari", "2 minggu", "4d")
  const durPrefixMatch = text.match(/\b(?:selama|durasi:?)\s+(\d+\s*(?:hari|day|days|minggu|week|weeks|hr|d|w)?)\b/i)
  if (durPrefixMatch) {
    duration = durPrefixMatch[1].trim()
    text = text.replace(durPrefixMatch[0], ' ')
  } else {
    const durMatch = text.match(/\b(\d+\s*(?:hari|day|days|minggu|week|weeks|hr|d|w))\b/i)
    if (durMatch) {
      duration = durMatch[1].trim()
      text = text.replace(durMatch[0], ' ')
    }
  }

  // 3. Extract start date or relative date
  const dateMatch = text.match(/\b(besok|lusa|hari ini|today|tomorrow|senin depan|selasa depan|rabu depan|kamis depan|jumat depan|sabtu depan|minggu depan|\d{1,2}\s+(?:jan|feb|mar|apr|mei|may|jun|jul|agu|aug|sep|okt|oct|nov|des|dec)[a-z]*(?:\s+\d{4})?|\d{4}-\d{2}-\d{2})\b/i)
  if (dateMatch) {
    start = dateMatch[1].trim()
    text = text.replace(dateMatch[0], ' ')
  }

  // 4. Extract dependencies if present (e.g., "setelah Desain", "after Desain")
  const depMatch = text.match(/\b(?:setelah|after|depends on|dep:)\s+([a-zA-Z0-9_\-\s]+)$/i)
  if (depMatch) {
    dependsOn = depMatch[1].trim()
    text = text.replace(depMatch[0], ' ')
  }

  // Clean name
  const name = text.replace(/\s+/g, ' ').trim()

  return { name, assignee, start, duration, end: '', dependsOn }
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `npx tsx scripts/test-natural-parser.ts` and `npx tsx scripts/parser-check.ts`
Expected: Both pass cleanly (26/26 on parser-check and all checks on test-natural-parser).

- [ ] **Step 5: Commit**

```bash
git add frontend/scripts/test-natural-parser.ts frontend/src/lib/format/raw-text.ts
git commit -m "feat(parser): add natural-language heuristic parsing for freeform task rows"
```

---

### Task 2: Reactive Generation Feedback & Monotonic Render Synchronization

**Files:**
- Modify: `frontend/src/app/page.tsx`
- Modify: `frontend/src/components/gantt-board/gantt-board.tsx`
- Modify: `frontend/src/components/task-input/raw-text-editor.tsx`

**Interfaces:**
- Consumes: `generationTick: number` in `GanttBoardProps`
- Produces: Visual loading state (`isParsing: boolean`), success confirmation (`generateSuccess: boolean`), incremented `generationTick`, and forced SVG redraw on manual click.

- [ ] **Step 1: Write the failing test / interface assertion**

In `frontend/src/components/gantt-board/gantt-board.tsx`:
Add `generationTick?: number` to `GanttBoardProps`. Include `generationTick` in `renderKey`:
```typescript
const renderKey = JSON.stringify([
  ganttTasks.map(t => [t.id, t.start, t.end, t.dependencies || '']),
  viewMode,
  generationTick ?? 0,
])
```
Add temporary test verification in `frontend/scripts/build-check.ts` or run `npm run build` to verify type contract.

- [ ] **Step 2: Run verification to observe state needs**

Observe that without `generateSuccess` in `page.tsx`, the Generate button cannot indicate completion, and `generationTick` is not yet supplied.

- [ ] **Step 3: Implement generation state & feedback in `page.tsx` and `gantt-board.tsx`**

In `frontend/src/app/page.tsx`:
1. Define state variables:
   ```typescript
   const [generationTick, setGenerationTick] = useState(0)
   const [generateSuccess, setGenerateSuccess] = useState(false)
   const [toastMessage, setToastMessage] = useState<string | null>(null)
   const successTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null)
   ```
2. Refactor `handleParse`:
   ```typescript
   const handleParse = useCallback(() => {
     setIsParsing(true)
     if (successTimeoutRef.current) clearTimeout(successTimeoutRef.current)
     setGenerateSuccess(false)

     // 280ms gives a smooth, tactile feel confirming that calculation is happening
     window.setTimeout(() => {
       const rows = inputMode === 'raw' && rawText.trim() ? parseRawText(rawText) : inputRows
       if (inputMode === 'raw' && rawText.trim()) setInputRows(rows)
       const ok = runParse(rows, false)
       setIsParsing(false)
       if (ok) {
         setGenerationTick(t => t + 1)
         setGenerateSuccess(true)
         setToastMessage(`Timeline updated! (${rows.length} task${rows.length > 1 ? 's' : ''})`)
         successTimeoutRef.current = setTimeout(() => {
           setGenerateSuccess(false)
           setToastMessage(null)
         }, 1800)
       }
     }, 280)
   }, [inputRows, rawText, inputMode, runParse])
   ```
3. Pass `generationTick={generationTick}` to `<GanttBoard ... />`.
4. Update the "Generate Timeline" header button:
   - If `isParsing`: Show spinning `Loader2` icon + "Generating..." + `opacity-80`.
   - Else if `generateSuccess`: Show `Check` icon + "Timeline Generated!" + `bg-emerald-600 hover:bg-emerald-700 text-white`.
   - Else: Show `Play` icon + "Generate Timeline".

- [ ] **Step 4: Run build to verify compilation**

Run: `npm run build` from `frontend`
Expected: Build passes with code 0.

- [ ] **Step 5: Commit**

```bash
git add frontend/src/app/page.tsx frontend/src/components/gantt-board/gantt-board.tsx frontend/src/components/task-input/raw-text-editor.tsx
git commit -m "feat(ui): add generationTick cache-busting, perceptible loading, and success state"
```

---

### Task 3: Visual Polish, Canvas Pulse Animation, and Floating Toast Notification

**Files:**
- Modify: `frontend/src/app/globals.css`
- Modify: `frontend/src/app/page.tsx`
- Modify: `frontend/src/components/gantt-board/gantt-board.tsx`

**Interfaces:**
- Consumes: `generateSuccess: boolean` and `toastMessage: string | null` in `page.tsx`
- Produces: CSS pulse animation on Gantt canvas wrapper (`animate-canvas-pulse`), floating animated pill toast in lower-right or header, and smooth scroll into view on mobile viewports.

- [ ] **Step 1: Write CSS animation in `globals.css`**

In `frontend/src/app/globals.css`:
```css
@keyframes canvasPulse {
  0% {
    box-shadow: 0 0 0 0 rgba(16, 185, 129, 0.4);
  }
  50% {
    box-shadow: 0 0 0 6px rgba(16, 185, 129, 0.15);
  }
  100% {
    box-shadow: 0 0 0 0 rgba(16, 185, 129, 0);
  }
}

.animate-canvas-pulse {
  animation: canvasPulse 1.2s ease-out;
}
```

- [ ] **Step 2: Add pulse effect and floating toast in `page.tsx`**

1. Apply `generateSuccess ? 'animate-canvas-pulse ring-1 ring-emerald-500/40' : ''` to the Gantt chart container wrapper.
2. Render floating toast overlay when `toastMessage` is present:
   ```tsx
   {toastMessage && (
     <div className="fixed bottom-6 right-6 z-50 flex items-center gap-2.5 px-4 py-2.5 rounded-lg bg-surface-elevated/95 border border-border shadow-xl backdrop-blur text-xs font-medium text-foreground transition-all duration-200 animate-in fade-in slide-in-from-bottom-3">
       <div className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
       <span>{toastMessage}</span>
     </div>
   )}
   ```
3. If on mobile screen (`window.innerWidth < 768`), smooth scroll to the Gantt container when generation completes.

- [ ] **Step 3: Run build to verify stylesheet and JSX**

Run: `npm run build` in `frontend`
Expected: Build passes with code 0.

- [ ] **Step 4: Commit**

```bash
git add frontend/src/app/globals.css frontend/src/app/page.tsx frontend/src/components/gantt-board/gantt-board.tsx
git commit -m "feat(ux): add canvas pulse animation and floating toast notification on timeline generation"
```

---

### Task 4: Complete End-to-End Regression and Build Verification

**Files:**
- Test: `frontend/scripts/parser-check.ts`
- Test: `frontend/scripts/test-natural-parser.ts`

- [ ] **Step 1: Execute all unit parser checks**

Run: `npx tsx scripts/parser-check.ts`
Expected: All 26/26 tests PASS.

- [ ] **Step 2: Execute natural language checks**

Run: `npx tsx scripts/test-natural-parser.ts`
Expected: All tests PASS.

- [ ] **Step 3: Run full Next.js production build**

Run: `npm run build`
Expected: Static HTML export completes with exit code 0.

- [ ] **Step 4: Commit and finalize**

```bash
git commit --allow-empty -m "chore: verify interactive timeline generation end-to-end"
```
