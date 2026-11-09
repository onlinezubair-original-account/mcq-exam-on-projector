# MCQ PROJECTOR: MASTER PLAN v4 (HYBRID, EXECUTABLE EDITION)

**What this is:** the running Next.js project (Milestones 1–8, "v8 parity build") upgraded with the best ideas from `MASTER_PROJECT_PLAN_v3`, plus a full path to **GitHub + online hosting**.
**What this replaces:** `mcq-projector-nextjs-plan-v3.md` (planning only) and the roadmap parts of `HANDOFF.md`. `MASTER_PROJECT_PLAN_v3` stays as a *reference* only; nothing in it is executed as written.
**Platform:** Windows 10/11, PowerShell 7+ (`pwsh`), Edge/Chrome. **Hosting:** GitHub (repo + Actions + Pages). **Workflow:** Me → AI → PowerShell → AI → Me.

---

## 0. How to read this document

1. Part 1 explains **what was kept, adopted, adapted and rejected** from each source, and why.
2. Part 2 is the **target architecture** (existing layout plus a few new folders).
3. Part 3 is the **execution standard** (PowerShell rules, the script preamble, the feedback summary).
4. Part 4 is the **roadmap** (8 phases, each independently shippable).
5. Parts 5–6 give **phase details**, with full scripts where the logic is non-trivial (GitHub phase).
6. Parts 7–10: tests, risks, acceptance checklist, first action.

**Truth hierarchy** (when sources disagree): live source code > this plan > `HANDOFF.md` > older plans. `HANDOFF.md` is known to be wrong in places (see Phase 0).

---

# PART 1: DECISIONS

## 1.1 Why a hybrid

| | Running project (Next.js) | MASTER_PROJECT_PLAN_v3 (Vite) |
|---|---|---|
| Status | Working, 8 milestones done, static export | Not started; ~100 KB spec |
| Strength | Real, tested `lib/` layer; fast to ship; N sets (1–8); per-slide timer | Much stronger engine: reproducible seeds, constrained shuffles, independent verifier, hashed packages, fit checking, preflight |
| Weakness | Plain `Math.random` shuffles, no key verification, no fit check, timer drifts if tab throttled, 5 known gaps | Huge scope (two windows, IndexedDB, PWA, anchor paging, folder backup); would mean a full rewrite and abandoning working code |

**Decision:** keep the Next.js project as the base. **Port v3's engine and safety ideas into it in small, test-guarded phases.** Do not rewrite. Do not switch to Vite.

## 1.2 What we take from v3

| v3 idea | Verdict | How it lands here |
|---|---|---|
| Seeded PRNG (`cyrb128`+`sfc32`), golden vectors | **Adopt verbatim** | Phase 2. Every shuffle reproducible from a seed shown on the End screen and in exports |
| Cross-set constraints (no same question at same position; different correct letters) | **Adopt, generalized to 1–8 sets** | Phase 2. v3's triple enumeration does not scale to 8 sets, so replaced by a sequential greedy scorer |
| Answers stored as option IDs, never letters (INV-8) | **Adopt** | Phase 2. Letters become derived values |
| Independent verifier + mutation tests (INV-5) | **Adopt** | Phase 2 |
| `Math.random` banned in logic (INV-7), import boundaries via ESLint | **Adopt** | Phase 2 |
| Immutable hashed package, version bump on rebuild (INV-3) | **Adopt, simplified** | Phase 5. File export/import, no IndexedDB |
| Master key + audit key CSV | **Adopt** | Phase 5. Added beside the existing `AllAnswerKeys.csv`, which stays byte-identical |
| Projector-safe view type (INV-2) | **Adopt as a type-level rule** | Phase 2. Slides/print/paper builders receive a view type with no answers. Sets up Phase 7 |
| Deadline-based timer (no `setInterval` decrement) | **Adopt, monotonic variant** | Phase 3 |
| Wake Lock, `storage.persist()` | **Adopt** | Phase 3 |
| Preflight checklist gating Start | **Adopt, simplified** | Phase 3 (on the existing calibration screen) |
| DOM-measured fit check, no clipped text (INV-4) | **Adopt the check, not the paging engine** | Phase 3. Fixed `perSlide` paging stays |
| Validation warnings (cross-reference, "all of the above", duplicate options, length bias) | **Adopt** | Phase 4 |
| Sub/superscript tokenizer, never `innerHTML` | **Adopt** | Phase 4 (valuable for Pharm.D formulas) |
| JSON/CSV bank import | **Adopt as converters into the existing text format** | Phase 4 |
| Offline launcher `launch.ps1` + release folder | **Adopt** | Phase 6 |
| Hardware QA, acceptance checklist | **Adopt** | Phase 6 |
| Two windows (teacher/projector) over BroadcastChannel | **Defer** | Phase 7 (stretch). Large, not needed for v1.0 |
| Anchor-based paging + `autoFit` density policy | **Defer** | Phase 7 (stretch) |
| Groups, pinned questions, IndexedDB library, folder backup via File System Access | **Defer** | Phase 7 (stretch) |
| Vite, fixed 3 sets A/B/C, repo-audit stage S0, third-party code register | **Reject** | Next.js stays; 1–8 sets stay; no outside code is reused, so S0 has nothing to decide |
| Per-window `AudioContext` created once | **Reject** | v8's fresh-context-per-beep is deliberate (Safari autoplay). Keep it, add a "Test sound" button |

## 1.3 What we keep from the running project (non-negotiable parity)

All of Tech Reference §§4–10 stays: four screens, text question format, `PERSLIDE_BY_SETS`, room presets, two-key persistence with the exact commit points (Meta "Next →" and Setup "Build slideshow →" only), "Skip →" never touching last-used settings, calibration excluded from autosave, End-screen key by position, existing zip/CSV/paper formats, keyboard shortcuts, chalkboard theme. `lib/` stays framework-agnostic.

## 1.4 Behavior-change register (the only deliberate deviations from v8)

| # | Change | Why | Escape hatch |
|---|---|---|---|
| C1 | Shuffles are seeded, and set generation is constraint-aware | Reproducibility and stronger anti-copy | Seed field in Setup "Advanced" |
| C2 | Options matching "All/None of the above" and "Both A and B" are pinned last | Shuffling them makes the question wrong | Setup toggle "Keep 'All of the above' last" (default on) |
| C3 | Timer is deadline-based (monotonic clock) | Correct under throttling, sleep, background tabs | None needed; visible timing unchanged |
| C4 | A recovered session always restores **paused** | Never auto-resume an exam silently | Teacher presses Space/Resume |
| C5 | Start Exam is gated by a preflight; blocking checks are verifier + fit | No clipped questions, no unverified keys | "Start anyway" with typed confirmation |
| C6 | Real package is built when calibration opens (not at Start) | Fit check must measure the real content | Rebuilding creates version + 1 |
| C7 | Papers/zip gain a footer with package ID and seed; zip gains extra files | Traceability | Existing files unchanged byte-for-byte except the footer line |
| C8 | `A+` during an exam refuses a size that would clip a later question | INV-4 | Toast explains why |

Everything else is parity. If a change not listed here seems necessary, stop and record it in `HANDOFF.md` before implementing.

---

# PART 2: TARGET ARCHITECTURE

## 2.1 Stack (unchanged unless stated)

Next.js 16 App Router, `output: 'export'`, React 19, TypeScript strict, Zustand 5, CSS Modules, Vitest + Testing Library, `fflate`, Atkinson Hyperlegible via `next/font`.
**New dev dependencies (record purpose/size/licence in each phase report):** `fast-check` (property tests), `@playwright/test` (E2E), `serve` (static server for E2E/CI), `fake-indexeddb` **not needed**. **No new runtime dependencies in v1.0.**

## 2.2 Layout additions (existing folders untouched)

```text
.github/workflows/ci-deploy.yml     # Phase 1
.github/workflows/release.yml       # Phase 6
docs/reference/                     # old plans kept read-only (v3 plan, tech reference)
docs/STATUS.md                      # one-screen truth: phase, test counts, live URL (updated by scripts)
lib/
  prng.ts            # cyrb128, sfc32, makeRng, randInt              (Phase 2)
  generate.ts        # generateSets(): constrained, seeded            (Phase 2)
  verify.ts          # independent verifier, V_* codes                (Phase 2)
  keys.ts            # deriveKeys(), deriveMasterKey()                (Phase 2)
  view.ts            # toProjectorView(): answer-free view types      (Phase 2)
  timer.ts           # pure deadline timer math                       (Phase 3)
  fit.ts             # pure fit decisions from measured heights       (Phase 3)
  preflight.ts       # evaluatePreflight(inputs): Check[]             (Phase 3)
  validate.ts        # bank warnings/errors                           (Phase 4)
  text.ts            # NFC normalize + sub/sup tokenizer              (Phase 4)
  importJson.ts, importCsv.ts, exportBank.ts                          (Phase 4)
  canonical.ts, hash.ts, pkg.ts                                       (Phase 5)
  exportCsv.ts       # master_key.csv, audit_key.csv                  (Phase 5)
hooks/
  useFitCheck.ts     # DOM measurement adapter                        (Phase 3)
  useWakeLock.ts                                                      (Phase 3)
tests/
  e2e/               # Playwright                                      (Phase 1+)
  fixtures/          # banks, golden vectors
tools/
  launch.ps1         # offline launcher                                (Phase 6)
```

## 2.3 Invariants (adapted from v3 B2)

| ID | Invariant | Enforced by |
|---|---|---|
| INV-1 | Display operations (font, fullscreen, print, resize) never change exam state, sets, keys, package or timer | Tests T-DISP-* |
| INV-2 | Slideshow, print and paper code never receives answers: it takes `ProjectorQuestion[]` from `toProjectorView()` | Types + ESLint boundary + T-VIEW-1 |
| INV-3 | After build, sets/keys are frozen. Rebuild = new package version | `Object.freeze` in dev, type `Readonly<…>`, T-PKG-4 |
| INV-4 | No stem or option is clipped | Fit check (Phase 3), T-FIT-* |
| INV-5 | Keys are derived only from final permutations and independently verified; mismatches are never auto-repaired | `verify.ts`, mutation tests |
| INV-6 | No network requests at runtime; no CDN, analytics or external fonts | E2E request log (T-NET-1) |
| INV-7 | `Math.random` is forbidden in `lib/**` | ESLint rule |
| INV-8 | Correct answers are stored as option IDs | Types; letters derived |

## 2.4 Type additions (`types/index.ts`; all additive, no existing field removed)

```ts
interface Option { id?: string; letter: string; text: string; origLetter?: string; pin?: 'first' | 'last' }
interface Question { id?: string; number: number; text: string; options: Option[]; answer: string | null; answerId?: string | null }
interface SetQuestion { /* existing fields */ qid?: string; answerId?: string | null }   // answer (letter) is DERIVED from answerId

interface GenParams { seed: string; algorithmVersion: string; numSets: number; pinAllOfAbove: boolean }
interface RelaxationNote { code: string; detail: string }
interface ConstraintReport {
  questionPositionConflicts: number;
  correctLetterCollisions: number;
  maxSameLetterRun: Record<string, number>;
  correctLetterCounts: Record<string, Record<string, number>>;
  relaxations: RelaxationNote[];
}
interface ProjectorOption { letter: string; text: string }
interface ProjectorQuestion { seq: number; text: string; options: ProjectorOption[] }   // no ids, no answer
```

Existing rules from Tech Reference §13 still apply: import shared types from `@/types` only; `semester`/`quizNumber` are `number | ''`; new config/meta fields must be added to `DEFAULT_*`, `lib/storage.ts` payload types, `commitLastSettings`, and every test `resetStore()` helper.

---

# PART 3: EXECUTION STANDARD

## 3.1 Rules for the executing AI

1. Read this whole document before producing any script.
2. Execute phases in order. Do not start a phase until the previous phase's **exit criteria** are reported as met in a green feedback summary.
3. One script = one logical step. After each script, wait for the pasted green summary before producing the next.
4. Never claim a test passed unless a script ran it and the summary shows it. Never invent file contents: if you need a file you have not seen, deliver an **inspect script** (3.4) first.
5. Do not change architecture, names, constants or algorithms defined here. If you think something is wrong, say so in one line and continue with the document's version unless it makes the build impossible.
6. Do not add dependencies beyond 2.1 without recording purpose, size and licence in the phase report.
7. Do not refactor working code unless a phase task says so or a test fails.
8. Ask the user at most one question per turn, only when no default exists. The only question needed up front is the project path (Part 10).
9. Every code-changing script ends with `verify` (typecheck + lint + all tests + build). Commit only on green (3.2 `Save-Commit`).
10. Keep prose short. The deliverable of every turn is a working paste-ready script.

## 3.2 Script preamble (every delivered script = this preamble + a body)

> In this document, bodies are shown as `# --- PREAMBLE ---` followed by the body. The AI MUST expand the preamble in full when delivering, so each script is paste-ready on its own. Scripts must work pasted whole **and** line-by-line.

```powershell
#requires -Version 7.0
$ErrorActionPreference = 'Stop'
$ProjectDir = 'C:\FULL\PATH\TO\PROJECT'     # replaced once, then reused in every script
if (-not (Test-Path -LiteralPath $ProjectDir)) { throw "Project folder not found: $ProjectDir" }
Set-Location -LiteralPath $ProjectDir
$script:Summary = [System.Collections.Generic.List[string]]::new()
$script:Status  = 'FAILED'
$script:StageId = 'UNSET'
function Add-Summary([string]$m) { $script:Summary.Add($m) }
function Write-Section([string]$t) { Write-Host "`n=== $t ===" -ForegroundColor Cyan }
function Assert-Tool([string]$n) { if (-not (Get-Command $n -ErrorAction SilentlyContinue)) { throw "Missing prerequisite: $n" } }
function Backup-IfExists([string]$p) {
  if (Test-Path -LiteralPath $p) { $b = "$p.bak-$(Get-Date -Format yyyyMMdd-HHmmss)"; Copy-Item -LiteralPath $p -Destination $b -Force; Add-Summary "BACKUP: $b" }
}
function Write-File([string]$path, [string]$content) {      # idempotent; never silently overwrites different content
  $full = if ([IO.Path]::IsPathRooted($path)) { $path } else { Join-Path (Get-Location).Path $path }
  $dir = Split-Path -Parent $full; if ($dir -and -not (Test-Path -LiteralPath $dir)) { New-Item -ItemType Directory -Path $dir -Force | Out-Null }
  if (Test-Path -LiteralPath $full) {
    if ((Get-Content -LiteralPath $full -Raw) -ceq $content) { Add-Summary "UNCHANGED: $path"; return }
    Backup-IfExists $full
  }
  [IO.File]::WriteAllText($full, $content, [Text.UTF8Encoding]::new($false)); Add-Summary "WROTE: $path"
}
function Invoke-Step([string]$label, [scriptblock]$sb) {
  Write-Section $label; $global:LASTEXITCODE = 0; & $sb
  if ($LASTEXITCODE -ne 0) { throw "$label failed (exit code $LASTEXITCODE)" }
}
function Save-Commit([string]$msg) {                         # call only after verify is green
  if ((Get-Command git -ErrorAction SilentlyContinue) -and (Test-Path .git)) {
    git add -A | Out-Null
    if (git status --porcelain) { git commit -q -m $msg; Add-Summary "COMMIT: $msg" } else { Add-Summary 'COMMIT: nothing to commit' }
  }
}
function Write-AiSummary {                                    # always the LAST output; also logs and copies to clipboard
  $lines = @("STAGE: $script:StageId", "STATUS: $script:Status") + $script:Summary
  Write-Host "`n----- AI FEEDBACK SUMMARY (already copied to clipboard) -----" -ForegroundColor Green
  foreach ($l in $lines) { Write-Host $l -ForegroundColor Green }
  Write-Host '----- END SUMMARY -----' -ForegroundColor Green
  try {
    $err = ($script:Summary | Where-Object { $_ -like 'ERROR:*' } | Select-Object -First 1); if (-not $err) { $err = 'None' }
    $changed = ($script:Summary | Where-Object { $_ -match '^(WROTE|COMMIT|INSTALLED|TESTS)' }) -join '; '; if (-not $changed) { $changed = 'no changes' }
    Add-Content -LiteralPath 'automation-log.md' -Value @("- $(Get-Date -Format 's')", "  - $script:StageId", "  - $script:Status", "  - $changed", "  - $err")
    Set-Clipboard -Value ($lines -join "`n")
  } catch { Write-Host "(log/clipboard step skipped: $($_.Exception.Message))" -ForegroundColor Yellow }
}
```

**Script skeleton (the body goes inside `try`):**

```powershell
try {
  $script:StageId = 'P<n>.<k> <name>'
  # ... work ...
  $script:Status = 'SUCCESS'
} catch {
  Add-Summary "ERROR: $($_.Exception.Message)"
  Add-Summary "AT: $($_.InvocationInfo.PositionMessage -replace '\s+',' ')"
} finally { Write-AiSummary }
```

## 3.3 Script rules

1. Idempotent and re-runnable; leaves the project valid. Files are written with `Write-File` using single-quoted here-strings (`@' … '@`) so `$` is literal.
2. npm via `Invoke-Step`; exit codes never ignored. Install only what is missing (check `package.json` / `node_modules` first).
3. Terminal-first reporting: print tables; do not create report files. Summary is ≤ ~25 lines: stage, status, versions, paths changed, test counts (`passed/failed/skipped`), warnings, values needed by the next script.
4. Destructive operations require a prior `Test-Path` and a backup or typed confirmation. Never use `exit` (it closes the user's terminal). Never set execution policy globally, never run as administrator, never open firewall ports.
5. Test counts come from `npx vitest run --reporter=json --outputFile=.vitest-result.json` (`numPassedTests`, `numFailedTests`, `numTotalTests`); delete the file afterward. If parsing fails, put the last 15 output lines in the summary.
6. Project paths and the GitHub owner/repo are asked **once**, then reused.

## 3.4 Inspect script (used whenever the AI needs file contents)

The AI cannot see the repository. When it needs a file, it delivers this script with the file list filled in. The **file contents** go to the clipboard (not the summary), and the user pastes them back.

```powershell
# --- PREAMBLE ---   (inspect scripts use the preamble but do NOT call Write-AiSummary, because that would overwrite the clipboard)
try {
  $files = @('components/ExamApp.tsx','vitest.config.ts')            # AI edits this list per request
  $out = foreach ($f in $files) {
    if (Test-Path -LiteralPath $f) { "##### $f`n" + (Get-Content -LiteralPath $f -Raw) } else { "##### $f (MISSING)" }
  }
  Set-Clipboard -Value ($out -join "`n`n")
  Write-Host "COPIED $($files.Count) file(s) to clipboard. Paste them into the chat." -ForegroundColor Green
} catch { Write-Host "ERROR: $($_.Exception.Message)" -ForegroundColor Red }
```

---

# PART 4: ROADMAP

| Phase | Name | Scripts | Result | Rough effort* |
|---|---|---|---|---|
| **0** | Stabilize the baseline | P0.1–P0.6 | The 5 known gaps fixed, **all** tests running, safety-net git commit | 1–2 sessions |
| **1** | GitHub + CI + online hosting | P1.1–P1.6 | App live on GitHub Pages; every push tested; deploys from `main` | 1–2 sessions |
| **2** | Trusted engine | P2.1–P2.8 | Seeded, constraint-aware sets; independent verifier; ID-based answers | 3–4 sessions |
| **3** | Exam-day reliability | P3.1–P3.7 | Deadline timer, wake lock, fit check, preflight, sound test | 3 sessions |
| **4** | Better input and content | P4.1–P4.6 | Warnings, "all of the above" pinning, sub/superscripts, JSON/CSV import | 2–3 sessions |
| **5** | Package, exports, backup | P5.1–P5.7 | Hashed package, master/audit keys, export/restore | 2–3 sessions |
| **6** | Release, offline kit, hardware QA | P6.1–P6.6 | Tagged release zip with launcher; acceptance checklist signed | 2 sessions |
| **7** | *Stretch (post v1.0)* | n/a | Dual window, anchor paging, groups/pins, library | separate plan |

\*One session = one sitting of a few script round-trips. Estimates are rough; the exit criteria, not the estimate, decide when a phase is done.

**Minimum shippable product = Phases 0 + 1 + 2 + 3.** After Phase 3 you have an online, tested, more trustworthy app than v8. Phases 4–6 add polish and release hardening. If time runs short, cut in this order: P4 JSON/CSV import → P5 import/restore → P4 sub/superscripts → P5 audit key. Never cut: verifier, fit check, deadline timer, CI.

**Every phase ends with:** `verify` green (typecheck, lint, all tests, build) → commit → push (after Phase 1) → CI green → live site checked → `docs/STATUS.md` updated → one-line phase report in chat.

---

# PART 5: PHASES 0–1 (FULL DETAIL)

## PHASE 0: STABILIZE THE BASELINE

**Goal:** make "build GREEN" actually true, and fix the five gaps listed in Tech Reference §11, before anything new is built on top.

### P0.1 Baseline snapshot (read-only)

```powershell
# --- PREAMBLE ---
try {
  $script:StageId = 'P0.1 baseline snapshot'
  Assert-Tool node; Assert-Tool npm
  Add-Summary "NODE: $(node -v)  NPM: $(npm -v)"
  $pkg = Get-Content package.json -Raw | ConvertFrom-Json
  Add-Summary "PKG: $($pkg.name) next=$($pkg.dependencies.next) react=$($pkg.dependencies.react) zustand=$($pkg.dependencies.zustand)"
  Add-Summary "SCRIPTS: $(($pkg.scripts.PSObject.Properties | ForEach-Object { $_.Name }) -join ', ')"
  Add-Summary "GIT: $(if (Test-Path .git) { 'present, branch ' + (git branch --show-current) + ', remote ' + ((git remote) -join ',') } else { 'NOT a repository' })"
  $src = Get-ChildItem -Recurse -File -Include *.ts,*.tsx -ErrorAction SilentlyContinue | Where-Object { $_.FullName -notmatch 'node_modules|[\\/]\.next[\\/]|[\\/]out[\\/]' }
  $tests = $src | Where-Object Name -match '\.test\.tsx?$'
  Add-Summary "TEST FILES ON DISK: $($tests.Count)"
  Add-Summary "VITEST INCLUDE: $((Select-String -Path vitest.config.ts -Pattern 'include').Line.Trim())"
  $live = $src | Where-Object { $_.Name -notmatch '\.test\.' }
  $wire = $live | Select-String -Pattern 'loadLastSettings\(|checkAutosave\(' | Where-Object { $_.Path -notmatch 'persistence\.ts$' }
  Add-Summary "GAP1 recovery call sites outside persistence.ts: $(@($wire).Count)  (0 = gap confirmed)"
  $pKey  = [bool](Select-String -Path hooks/useKeyboardShortcuts.ts -Pattern "KeyP|'p'|'P'" -Quiet)
  $btnDis = [bool](Select-String -Path components/screens/SlideshowScreen/Bottombar.tsx -Pattern 'disabled' -Quiet)
  Add-Summary "GAP2 'P' key bound: $pKey  (False = gap confirmed)"
  Add-Summary "GAP3 Bottombar contains 'disabled': $btnDis  (True = check the print button)"
  $script:Status = 'SUCCESS'
} catch { Add-Summary "ERROR: $($_.Exception.Message)" } finally { Write-AiSummary }
```

### P0.2 Safety net (git hygiene + snapshot commit)

Initialize git if absent, write `.gitignore` and `.gitattributes` (only missing lines are appended), commit the current state as `chore: snapshot before v4 work`, tag `baseline-v8-parity`.

Required `.gitignore` lines: `node_modules`, `.next`, `out`, `dist`, `coverage`, `test-results`, `playwright-report`, `*.bak-*`, `.env`, `.env.*`, `!.env.example`, `automation-log.md`, `.vitest-result.json`, `banks/`, `*.exam.json`, `*.package.json`.
`.gitattributes`: `* text=auto`.

**Exam content never goes into the repository.** The ignore rules above exist for that reason.

### P0.3 Make every test run

Replace `vitest.config.ts`:

```ts
import { defineConfig } from 'vitest/config';
import path from 'node:path';

export default defineConfig({
  resolve: { alias: { '@': path.resolve(__dirname, '.') } },
  esbuild: { jsx: 'automatic' },
  test: {
    environment: 'node', // component/hook tests already declare jsdom via pragma
    include: ['**/*.test.{ts,tsx}'],
    exclude: ['node_modules/**', '.next/**', 'out/**', 'tests/e2e/**'],
  },
});
```

Run the full suite, **report the real count and any failures** in the summary (Tech Reference §9 predicts the 7 previously excluded files mostly pass, but this must be observed, not assumed). Fix failures one test file at a time, one script each. Any test that cannot be fixed is *not* deleted: it is marked `it.skip` with a `// TODO(P0.3): reason` comment and listed in the summary.
**Exit:** all test files execute; failures = 0; skips documented.

### P0.4 Wire crash recovery and last-used settings on load (highest-value fix)

- In `components/ExamApp.tsx`, add one mount effect: `useEffect(() => { loadLastSettings(); checkAutosave(); }, [])`. Order is fixed: last-settings first, autosave second (autosave wins).
- Hydration-safe: it runs after mount only; nothing reads `localStorage` during render.
- `ResumeBanner` renders above the current screen whenever `resumeData` is non-null and `screen !== 'show'`.
- Tests (new `components/ExamApp.test.tsx`): (a) last-settings-only → fields prefilled, no banner; (b) autosave present → banner shown; "Resume" restores exam state; "Discard" clears autosave and leaves last-settings untouched; (c) both present → autosave wins; (d) calibration state never appears in a recovered session.
**Exit:** manual check: build an exam, refresh the tab mid-exam → banner appears → Resume restores the slide. Summary reports tests (a)–(d) passing.

### P0.5 Wire print backup mid-exam

- Bind `P` in `hooks/useKeyboardShortcuts.ts`; enable the `Bottombar` "Print backup" button; both call the existing `usePrintBackup()`. Remove the two stale "Milestone 6b/8" comments.
- Print is a pure overlay: it must not change `screen`, `slideIndex`, `paused`, or the timer interval (INV-1).
- Tests: shortcut calls the hook once; with `vi.spyOn(window,'print')`, store snapshot before/after is identical; `#printArea` contains no answer text.

### P0.6 Export-shape snapshot tests, cleanup, truthful HANDOFF

- Add snapshot tests for `buildQuestionPaperHTML`, `buildAnswerKeyCSV` (comment header line, six columns, `Question Number` = displayed number, empty `Tags`), and the zip file-name list, using a small hand-written `SetQuestion[]` fixture. These freeze today's export bytes so later phases cannot change them accidentally.
- Delete the unused `public/*.svg` defaults; remove the meaningless `start` script.
- Rewrite `HANDOFF.md` milestone table to match reality; create `docs/STATUS.md` (phase, test counts, date).
- Commit: `fix: phase 0 baseline`.

**Phase 0 exit criteria:** `verify` green with **all** test files executed; gaps 1–5 closed and tested; HANDOFF truthful; commit made.

---

## PHASE 1: GITHUB + CI + ONLINE HOSTING

**Goal:** the project lives on GitHub, every push is verified automatically, and `main` deploys to a public URL (GitHub Pages) that works on any machine with a browser.

### 1.1 Decisions (defaults used unless you say otherwise)

| # | Decision | Default | Notes |
|---|---|---|---|
| G1 | Repository visibility | **Public** | GitHub Pages on a *private* repo needs a paid plan. The repo holds no exam content (git-ignored, and the app is client-side only). If you want private: use Cloudflare Pages or Netlify instead (same static `out/`), or upgrade the plan |
| G2 | Hosting | **GitHub Pages via Actions** | Free, no server, no secrets |
| G3 | Repo name | `mcq-projector` | URL becomes `https://<owner>.github.io/mcq-projector/` |
| G4 | Branching | `main` only, short-lived feature branches optional | CI runs on PRs too |
| G5 | Data location | Browser `localStorage` per origin | The online site and `localhost` do **not** share saved sessions. Use package export/restore (Phase 5) to move work between them |
| G6 | Offline use | Load the page once and keep the tab open, **or** use the release zip (Phase 6) | After the first load the app needs no network. A *refresh* while offline on the hosted site fails until Phase 6 |

### 1.2 What goes online, and what does not

The deployed site is only the static `out/` folder: HTML, JS, CSS, the self-hosted font, and the Pharm.D course list. No question banks, no keys, no seeds are ever uploaded; they exist only in the teacher's browser. There are no secrets and no environment variables.

### P1.1 Hosting-ready configuration

Script writes/updates (using `Write-File`, with backups): `next.config.ts`, `playwright.config.ts`, `tests/e2e/smoke.spec.ts`, and adds scripts/dev-dependencies to `package.json`.

**`next.config.ts`**

```ts
import type { NextConfig } from 'next';

// '' for localhost / release zip; '/<repo>' for GitHub Pages (set by CI from configure-pages)
const basePath = process.env.PAGES_BASE_PATH ?? '';

const nextConfig: NextConfig = {
  output: 'export',
  basePath,
  assetPrefix: basePath || undefined,
  trailingSlash: true,
  images: { unoptimized: true },
  env: {
    NEXT_PUBLIC_COMMIT: process.env.GITHUB_SHA?.slice(0, 7) ?? 'local',
    NEXT_PUBLIC_BUILT_AT: new Date().toISOString(),
  },
};
export default nextConfig;
```

A small footer shows `commit abc1234 · built <date>` so you always know which version is live.

**`package.json` scripts to ensure present** (merge, do not overwrite):

```json
{
  "typecheck": "tsc --noEmit",
  "lint": "eslint .",
  "test": "vitest run",
  "test:cov": "vitest run --coverage",
  "build": "next build",
  "serve:out": "serve out -l 4173 --no-clipboard",
  "e2e": "playwright test",
  "verify": "npm run typecheck && npm run lint && npm run test && npm run build"
}
```
New dev dependencies: `@playwright/test`, `serve` (purpose: E2E static server). Record versions.

**`playwright.config.ts`**

```ts
import { defineConfig } from '@playwright/test';

export default defineConfig({
  testDir: 'tests/e2e',
  workers: 1,
  retries: process.env.CI ? 1 : 0,
  use: {
    baseURL: 'http://127.0.0.1:4173',
    // local machine: use installed Edge (no browser download); CI: bundled Chromium
    ...(process.env.CI ? {} : { channel: 'msedge' }),
    trace: 'on-first-retry',
  },
  webServer: {
    command: 'npm run build && npm run serve:out',
    url: 'http://127.0.0.1:4173',
    reuseExistingServer: true,
    timeout: 180_000,
  },
});
```

**`tests/e2e/smoke.spec.ts`** (grows in later phases): loads `/`, asserts the Meta screen is visible, clicks "Skip →", asserts the Setup screen; records every request and asserts **no request leaves `127.0.0.1`** (INV-6 / T-NET-1).

### P1.2 Workflow: verify on every push, deploy `main`

**`.github/workflows/ci-deploy.yml`** (written by script; if GitHub warns that an action major version is outdated, bump the major only):

```yaml
name: CI and Deploy

on:
  push:
    branches: [main]
  pull_request:
  workflow_dispatch:

permissions:
  contents: read

concurrency:
  group: ci-${{ github.ref }}
  cancel-in-progress: true

jobs:
  verify:
    runs-on: ubuntu-latest
    timeout-minutes: 20
    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-node@v4
        with:
          node-version: lts/*
          cache: npm
      - run: npm ci
      - run: npm run typecheck
      - run: npm run lint
      - run: npm run test:cov
      - run: npm run build
      - run: npx playwright install --with-deps chromium
      - run: npm run e2e
        env:
          CI: 'true'
      - if: failure()
        uses: actions/upload-artifact@v4
        with:
          name: playwright-report
          path: |
            playwright-report
            test-results
          if-no-files-found: ignore

  deploy:
    if: github.ref == 'refs/heads/main' && github.event_name != 'pull_request'
    needs: verify
    runs-on: ubuntu-latest
    timeout-minutes: 15
    permissions:
      pages: write
      id-token: write
      contents: read
    concurrency:
      group: pages
      cancel-in-progress: false
    environment:
      name: github-pages
      url: ${{ steps.deployment.outputs.page_url }}
    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-node@v4
        with:
          node-version: lts/*
          cache: npm
      - id: pages
        uses: actions/configure-pages@v5
      - run: npm ci
      - run: npm run build
        env:
          PAGES_BASE_PATH: ${{ steps.pages.outputs.base_path }}
          GITHUB_SHA: ${{ github.sha }}
      - uses: actions/upload-pages-artifact@v3
        with:
          path: out
      - id: deployment
        uses: actions/deploy-pages@v4
```

The `verify` job builds with no base path and runs E2E against it; the `deploy` job rebuilds with the Pages base path. A failing test therefore blocks deployment.

### P1.3 Remote, push, enable Pages (needs GitHub CLI `gh`, logged in)

Asks the user **once** for `owner` (GitHub username/org). If `gh` is missing or not logged in, the script prints the exact manual steps instead of failing.

```powershell
# --- PREAMBLE ---
$Owner = 'YOUR-GITHUB-USERNAME'; $Repo = 'mcq-projector'; $Visibility = 'public'   # public|private
try {
  $script:StageId = 'P1.3 create remote, push, enable Pages'
  Assert-Tool git
  if (-not (Test-Path .git)) { throw 'Not a git repository. Run P0.2 first.' }
  if (git status --porcelain) { throw 'Uncommitted changes. Commit (or run verify + Save-Commit) first.' }
  git branch -M main
  $hasGh = [bool](Get-Command gh -ErrorAction SilentlyContinue)
  $authed = $false; if ($hasGh) { gh auth status 2>&1 | Out-Null; $authed = ($LASTEXITCODE -eq 0) }
  if (-not $authed) {
    Add-Summary 'MANUAL: gh CLI missing or not logged in.'
    Add-Summary "MANUAL 1: create an EMPTY $Visibility repo named $Repo at https://github.com/new (no README, no .gitignore)"
    Add-Summary "MANUAL 2: run: git remote add origin https://github.com/$Owner/$Repo.git ; git push -u origin main --tags"
    Add-Summary 'MANUAL 3: repo Settings > Pages > Source: GitHub Actions'
    $script:Status = 'PARTIAL'
  } else {
    $existing = (git remote) -contains 'origin'
    if (-not $existing) {
      gh repo view "$Owner/$Repo" 2>&1 | Out-Null
      if ($LASTEXITCODE -ne 0) { Invoke-Step 'create repo' { gh repo create "$Owner/$Repo" "--$Visibility" --source . --remote origin } ; Add-Summary "CREATED: $Owner/$Repo ($Visibility)" }
      else { git remote add origin "https://github.com/$Owner/$Repo.git"; Add-Summary "REMOTE ADDED to existing repo $Owner/$Repo" }
    } else { Add-Summary "REMOTE: origin already set -> $(git remote get-url origin)" }
    Invoke-Step 'push main + tags' { git push -u origin main --tags }
    # Enable Pages with "GitHub Actions" as the source (409/422 = already enabled -> fine)
    $global:LASTEXITCODE = 0
    gh api -X POST "repos/$Owner/$Repo/pages" -f build_type=workflow 2>&1 | Out-Null
    if ($LASTEXITCODE -ne 0) { Add-Summary 'PAGES: enable call returned an error (probably already enabled). If the site fails, set Settings > Pages > Source: GitHub Actions' }
    else { Add-Summary 'PAGES: enabled (source: GitHub Actions)' }
    $global:LASTEXITCODE = 0
    Add-Summary "URL (after first deploy): https://$Owner.github.io/$Repo/"
    $script:Status = 'SUCCESS'
  }
} catch { Add-Summary "ERROR: $($_.Exception.Message)" } finally { Write-AiSummary }
```

### P1.4 Watch the first run and verify the live site

```powershell
# --- PREAMBLE ---
$Owner = 'YOUR-GITHUB-USERNAME'; $Repo = 'mcq-projector'
try {
  $script:StageId = 'P1.4 verify deployment'
  Assert-Tool gh
  $runId = gh run list --repo "$Owner/$Repo" --workflow 'CI and Deploy' --limit 1 --json databaseId --jq '.[0].databaseId'
  if (-not $runId) { throw 'No workflow run found yet. Push a commit first.' }
  gh run watch $runId --repo "$Owner/$Repo" --exit-status 2>&1 | Out-Host
  $ok = ($LASTEXITCODE -eq 0); Add-Summary "RUN $runId : $(if ($ok) {'success'} else {'FAILED (see: gh run view --log-failed)'})"
  if ($ok) {
    $url = "https://$Owner.github.io/$Repo/"
    $r = Invoke-WebRequest -Uri $url -UseBasicParsing -TimeoutSec 30
    Add-Summary "HTTP $($r.StatusCode) $url  (bytes $($r.Content.Length))"
    $js = [regex]::Match($r.Content, '/_next/static/[^"'' ]+\.js').Value
    if ($js) { $j = Invoke-WebRequest -Uri ("https://$Owner.github.io" + $js) -UseBasicParsing; Add-Summary "ASSET OK: $js -> HTTP $($j.StatusCode)" }
    else { Add-Summary 'WARN: could not find a _next JS asset in the HTML (check basePath)' }
    $script:Status = 'SUCCESS'
  } else { Add-Summary ('LOG: ' + (gh run view $runId --repo "$Owner/$Repo" --log-failed 2>&1 | Select-Object -Last 15 | Out-String)) }
} catch { Add-Summary "ERROR: $($_.Exception.Message)" } finally { Write-AiSummary }
```
Common first-run failures and fixes (the AI checks these in order): blank page or 404 on assets → `PAGES_BASE_PATH` not applied (check `configure-pages` step output); "Pages not enabled" → set Source to GitHub Actions; E2E timeout in CI → raise `timeout` in `playwright.config.ts`.

### P1.5 README, deployment notes, branch hygiene

`README.md` (what it is, live URL, `npm run dev`, `npm run verify`, how to deploy, exam-day tips from Part 9); `docs/DEPLOY.md`: **rollback** (revert the commit on `main`, or re-run an older successful *Deploy* run), custom domain (add `CNAME` via Pages settings; `base_path` becomes `''` automatically), and private-repo alternatives (G1). Optional: enable branch protection on `main` requiring the `verify` check (`gh api` or Settings → Branches).

### P1.6 Live smoke test and status update

Open the live URL on a **second device or clean browser profile**: Meta → Skip → Setup → Load sample → Build → calibration → Start → advance one slide → End. Record the commit footer hash. Update `docs/STATUS.md` (URL, last deployed commit, test counts).

**Phase 1 exit criteria:** repository on GitHub; CI green on `main`; site reachable at the Pages URL; live smoke test passes on a clean profile; E2E proves zero external requests; rollback procedure documented; `STATUS.md` updated.

---

# PART 6: PHASES 2–7 (SPECIFICATION)

Each phase lists **goal, scripts, files, tests that must exist, exit criteria**. Scripts follow Part 3; the AI delivers them one at a time. Test IDs are referenced again in Part 7.

---

## PHASE 2: TRUSTED ENGINE (seeded, constrained, verified)

**Goal:** sets are reproducible from a seed, harder to copy across neighbours, and every key is independently verified before it can be used. No UI redesign; Setup gains one "Advanced" seed field.

| Script | Work |
|---|---|
| P2.1 | ESLint: ban `Math.random` in `lib/**`; boundary rule (INV-2): `components/screens/SlideshowScreen/**`, `components/PrintArea.tsx`, `hooks/usePrintBackup.ts` and paper builders must not import `lib/keys`, `lib/verify`, `lib/generate`. Fix existing violations (the old `shuffle` default RNG) |
| P2.2 | `lib/prng.ts` + `tests/fixtures/prng-golden.json` (20 outputs of `makeRng('golden-seed','s1')`, generated once, committed) |
| P2.3 | Add ID fields to types and parser: `Question.id = Q001…` (by bank number, zero-padded to 3), `Option.id = <qid>-o<n>` (by order of appearance), `answerId`. Letter `answer` stays, derived. All existing parser tests still pass unchanged |
| P2.4 | `shuffle.ts`: `shuffle(arr, rng)` and `buildSet` accept an injected RNG; existing public helpers (`getSetLabel`, `PERSLIDE_BY_SETS`) unchanged |
| P2.5 | `lib/generate.ts` (algorithm below) + tests |
| P2.6 | `lib/keys.ts`, `lib/verify.ts` + mutation tests |
| P2.7 | `lib/view.ts` (`toProjectorView`) and switch Slideshow/Print/paper code to the answer-free type; leakage test |
| P2.8 | Store integration: seed in Setup "Advanced"; build at calibration open (C6); seed and constraint report shown on End screen and stamped in exports; autosave stores seed; verify gate on build |

### 2.1 PRNG (compatibility contract: copy exactly)

```ts
// lib/prng.ts
export const ALGORITHM_VERSION = 'gen-1.0.0';

export function cyrb128(str: string): [number, number, number, number] {
  let h1 = 1779033703, h2 = 3144134277, h3 = 1013904242, h4 = 2773480762;
  for (let i = 0; i < str.length; i++) {
    const k = str.charCodeAt(i);
    h1 = h2 ^ Math.imul(h1 ^ k, 597399067);
    h2 = h3 ^ Math.imul(h2 ^ k, 2869860233);
    h3 = h4 ^ Math.imul(h3 ^ k, 951274213);
    h4 = h1 ^ Math.imul(h4 ^ k, 2716044179);
  }
  h1 = Math.imul(h3 ^ (h1 >>> 18), 597399067);
  h2 = Math.imul(h4 ^ (h2 >>> 22), 2869860233);
  h3 = Math.imul(h1 ^ (h3 >>> 17), 951274213);
  h4 = Math.imul(h2 ^ (h4 >>> 19), 2716044179);
  h1 ^= (h2 ^ h3 ^ h4); h2 ^= h1; h3 ^= h1; h4 ^= h1;
  return [h1 >>> 0, h2 >>> 0, h3 >>> 0, h4 >>> 0];
}

export type Rng = () => number; // float in [0, 1)

export function sfc32(a: number, b: number, c: number, d: number): Rng {
  return () => {
    a |= 0; b |= 0; c |= 0; d |= 0;
    const t = (((a + b) | 0) + d) | 0;
    d = (d + 1) | 0;
    a = b ^ (b >>> 9);
    b = (c + (c << 3)) | 0;
    c = (c << 21) | (c >>> 11);
    c = (c + t) | 0;
    return (t >>> 0) / 4294967296;
  };
}

export function makeRng(seed: string, stream: string): Rng {
  const [a, b, c, d] = cyrb128(`${ALGORITHM_VERSION}|${seed}|${stream}`);
  const r = sfc32(a, b, c, d);
  for (let i = 0; i < 15; i++) r(); // warm-up
  return r;
}
export const randInt = (rng: Rng, n: number): number => Math.floor(rng() * n);
```

The seed itself is created in the UI/store layer (not `lib/`): 16 bytes from `crypto.getRandomValues`, hex-encoded. Changing any algorithm requires bumping `ALGORITHM_VERSION`; the golden-vector test fails otherwise.

### 2.2 Generation algorithm (`generateSets`), generalized to N = 1–8 sets

Pure and deterministic: same bank + seed + `algorithmVersion` ⇒ identical output. Reject invalid banks (`GEN_INVALID_BANK`) and unknown versions (`GEN_VERSION_UNSUPPORTED`). Return a `Result`, never throw for bad input.

**Streams (exact strings):** `qorder:<k>` (k = 1..N), `opttarget`, `optperm:<k>`.

**Question order**
1. Set 1: `fisherYates(questions, rng('qorder:1'))`.
2. Set k > 1: one RNG instance per set, consumed across up to `GEN_MAX_ATTEMPTS = 300` attempts. Each attempt = Fisher–Yates shuffle. `conflicts` = number of positions `i` where this set's qid equals the qid at `i` in **any earlier set**. Accept the first attempt with 0 conflicts; otherwise keep the attempt with the fewest and add relaxation `Q_POSITION_RELAXED` (with count). Impossible cases (e.g. 8 sets, 5 questions) therefore *relax and report*, never fail.

**Option permutation per question** (`K` options, with `pinFirst`/`pinLast` if present)
1. Allowed correct positions `P`: pinned-first correct ⇒ `{0}`; pinned-last correct ⇒ `{K-1}`; else all positions except `0` if a first-pin exists and `K-1` if a last-pin exists.
2. **Target selection (stream `opttarget`), questions in bank order, sets in order 1..N.** For set s choose position `pos ∈ P` minimizing `score = 1000 × (number of earlier sets whose correct position for this question equals pos) + counts[s][pos]`; ties broken with `randInt(rng, ties.length)` over ties in ascending position order. Then `counts[s][pos]++`. If the best score ≥ 1000, add relaxation `OPT_LETTER_DISTINCT_RELAXED` (once per question). *(This replaces v3's all-triples enumeration, which is exponential in N and unusable at 8 sets.)*
3. Permutation (stream `optperm:<k>`): empty slots; place correct option at its target; place pins at the ends; shuffle the remaining options with Fisher–Yates and fill the empty slots in order. **Identity avoidance:** if the result equals bank order and ≥ 2 options are free, reshuffle up to 20 times; accept the last.
4. `pinAllOfAbove` (config, default on): an option is auto-pinned `last` if its text matches `/\b(all|none) of the (above|these)\b/i` or `/\b(both|options?)\s+[A-H]\s*(and|&|,)\s*[A-H]\b/i`. If two options in one question match, pin only the last one in bank order and record a Phase 4 warning.

**Report:** `correctLetterCounts`, `maxSameLetterRun` (per set, in displayed order; ≥ 4 adds informational `LETTER_RUN_LONG`), `correctLetterCollisions`, `questionPositionConflicts`, `relaxations[]`.

### 2.3 Keys and verifier

- `buildSet` output holds `qid`, displayed options with IDs, `answerId`. `answer` (letter) is **derived** from `answerId` by locating that option in the displayed question; never copied from the bank.
- `deriveKeys(sets)`: per set rows `{seq, letter, qid}`. `deriveMasterKey(keys)`: per qid, `(seq, letter)` for every set.
- `verifyPackageContent` is an **independent implementation** (must not call `deriveKeys`). Issue codes: `V_Q_COUNT`, `V_Q_UNIQUE`, `V_SEQ`, `V_TEXT`, `V_OPT_SET`, `V_OPT_LETTER`, `V_KEY_ROW`, `V_KEY_SEQ`, `V_MASTER`, `V_PINS`, `V_MAP`. Any issue ⇒ `ok=false` ⇒ **the exam cannot start**; nothing is auto-repaired.
- `toProjectorView(sets)` returns `{seq, text, options:[{letter,text}]}[]` per set: no ids, no answers.

### 2.4 Tests that must exist and pass

| ID | Test |
|---|---|
| T-PRNG-1 | Golden vectors match forever |
| T-PRNG-2 | Same seed+stream ⇒ same sequence; different stream ⇒ different |
| T-GEN-1 | `fast-check`, ≥ 500 runs, bank sizes 1–200, N = 1–8: every set has each qid exactly once; options are a permutation of the bank's |
| T-GEN-2 | Identical inputs ⇒ byte-identical output (`JSON.stringify` equal) |
| T-GEN-3 | number of questions ≥ number of sets (≥ 3) and no pins ⇒ `questionPositionConflicts = 0` in ≥ 99 % of 1000 seeds; any nonzero carries `Q_POSITION_RELAXED` |
| T-GEN-4 | K ≥ N, no pins ⇒ correct letters differ across sets for every question |
| T-GEN-5 | Pinned option(s) at ends in every set; correct option pinned ⇒ fixed position |
| T-GEN-6 | Letter distribution per set balanced: ≥ 20 questions, K = 4 ⇒ each letter within ±3 of Q/4 |
| T-GEN-7 | Impossible layouts relax and report; never throw |
| T-KEY-1 | 10 000 random (bank, seed) cases: derived letter equals the displayed option whose id is the bank answer |
| T-VER-1 | Untouched packages verify |
| T-VER-2 | **Mutation tests**, each caught with its specific code: swap two options in a displayed question; change one key letter; duplicate a question; drop a question; change a `seq`; alter a master row; move a pinned option |
| T-VIEW-1 | Leakage: `JSON.stringify(view)` contains no qid, oid, `answer`, `key`, `seed`; keys of each object are exactly the `Projector*` fields |
| T-LINT-1 | Lint fails on a deliberate `Math.random` in `lib/` and on a forbidden import from a slide component (checked once by a throwaway fixture, then removed) |

**Exit criteria:** all above pass; coverage for `lib/` ≥ 90 % lines / 85 % branches; v8 export snapshots (P0.6) unchanged; an exam built, finished, and exported shows its seed; rebuilding with the same seed reproduces the identical sets.

---

## PHASE 3: EXAM-DAY RELIABILITY

**Goal:** the exam cannot silently drift, clip, sleep, or run unverified.

| Script | Work |
|---|---|
| P3.1 | `lib/timer.ts` (pure) + tests |
| P3.2 | Store: replace decrementing with deadline timer; beep flags; pause/resume; recovery restores paused (C3, C4) |
| P3.3 | `hooks/useWakeLock.ts`; `navigator.storage.persist()` at startup; result shown in preflight |
| P3.4 | `lib/fit.ts` + `hooks/useFitCheck.ts` (DOM measurement) + tests |
| P3.5 | `lib/preflight.ts` (`evaluatePreflight`) + calibration-screen checklist UI + Start gating (C5) |
| P3.6 | Live `A+` guard (C8); "Test sound" button |
| P3.7 | E2E: full exam flow, throttle test, refresh/recovery, print overlay, preflight gating |

### 3.1 Deadline timer (`lib/timer.ts`)

```ts
interface TimerState { endsAtMono: number | null; remainingMs: number; paused: boolean }   // mono = performance.now()
remainingMs(t, nowMono): number   // running: max(0, endsAtMono - nowMono); paused: t.remainingMs
secondsLeft(ms): number           // Math.ceil(ms / 1000)
```
- `performance.now()` is monotonic (immune to system clock changes). The store refreshes display every 250 ms; the visible value is always recomputed from the deadline, never decremented (v3 pitfall #6).
- Per-slide duration is unchanged: `questionsOnThatSlide × secsPerQ`, including the short last slide. Total elapsed/remaining are derived.
- Beep flags per slide: `warned` (fires once when `secondsLeft ≤ 10`), `transitioned` (fires once at 0, then auto-advance). Flags reset on each new slide and are stored in autosave, so a throttled tab that skips the exact "10" still beeps once and a recovery never replays a beep. Frequencies/durations stay 440 Hz/0.15 s and 660 Hz/0.25 s with a fresh `AudioContext` per beep.
- Pause stores `remainingMs`; resume sets `endsAtMono = now + remainingMs`. Persisted autosave holds `remainingMs` (not the deadline). Recovery loads it as `paused`.
- Tests **T-TIME-1..4**: boundary values (0, 1 ms, exactly 10 s); pause/resume within ±1 ms using an injected clock; last-slide duration = actual count × `secsPerQ`; beep flags fire exactly once. **T-TIME-5 (E2E, fake clock):** advancing the clock by 60 s in one jump yields the right remaining time and exactly one warning.

### 3.2 Fit check (INV-4)

- `useFitCheck()` mounts a hidden container (`position:absolute; visibility:hidden; left:-99999px`) using the **same CSS classes and widths** as `SlideArea`, the same `--qsize`/`--optsize`, and `await document.fonts.ready`.
- For every slide of the **real package**, render all columns, **write all blocks first, then read heights** (one layout pass), and compare to the available slide-area height. Output: `{ok, offenders: [{slide, setLabel, seq, overBy}]}`.
- Pure `lib/fit.ts` holds the comparison and an `autoSizeFont(measure, qsize0)` helper: steps `qsize` down by 2 (keeping the `optsize` ratio from the room preset) until all slides fit, stopping at the minimum 14/12; if still not fitting it returns offenders by name ("Q17 in Set B"), and Start stays blocked.
- A button **"Auto-size font"** applies the helper. It changes only `qsize/optsize` (INV-1).
- Cache measurements by key `${qsize}|${optsize}|${perSlide}|${numSets}|${viewportW}x${viewportH}|${packageHash}`; invalidate on resize (debounce 150 ms).
- Tests: **T-FIT-1** pure decisions with hand-computed height tables; **T-FIT-2 (E2E)** at the five viewports (1024×768, 1280×720, 1920×1080, 2560×1440, 3840×2160) the 12 demo questions have no clipped column and the check's verdict agrees with `scrollHeight ≤ clientHeight`; **T-FIT-3 (E2E)** a long-question fixture (1200-char stem, 300-char options) is reported as an offender, not silently clipped.

### 3.3 Preflight (calibration screen)

`evaluatePreflight(inputs): Check[]` is pure. Blocking checks gate **Start Exam**; warning checks do not.

| Code | Condition | Blocking? |
|---|---|---|
| P-BANK | ≥ 1 valid question; parse warnings acknowledged (Phase 4) | yes |
| P-VERIFY | `verifyPackageContent` ok | yes |
| P-FIT | fit check ok (or offenders list shown) | yes |
| P-FS | fullscreen active (button + shortcut `F`) | warning |
| P-SOUND | teacher pressed "Test sound" and confirmed they heard it | warning |
| P-WAKE | wake lock acquired | warning |
| P-STORE | `navigator.storage.persist()` granted | warning |
| P-BACKUP | a backup copy was saved this session (Phase 5) | warning |
| P-NET | informational: "Online/Offline"; on the hosted site, a note that a refresh needs network | info |

Each failing check shows a one-line cause and fix hint. "Start anyway" for a *blocking* failure requires typing `START` (never for P-VERIFY: a verifier failure cannot be overridden).
Tests: one unit test per code (pass/fail/warn); **T-FLOW-2** Start disabled for each single failing blocking check (parameterized).

### 3.4 Live `A+` guard (C8)

During a real exam, `adjustFont(+)` re-runs the fit check for the **remaining** slides at the proposed size; if any would clip, the change is refused with a toast ("Larger text would cut off Q17 in Set B"). `A−`, `Q±` and everything else keep existing behavior and clamps (`qsize` 14–60, `optsize` 12–48, per-slide 2–5).

**Exit criteria:** all tests pass; INV-1 verified (E2E: font/zoom/fullscreen/print leave sets, keys, hash and timer deadline untouched); manual check on a real projector: beeps audible, fullscreen works, no clipping at the room's resolution; recovery never auto-resumes.

---

## PHASE 4: BETTER INPUT AND CONTENT

**Goal:** fewer bad exams get as far as the projector, and scientific text displays correctly.

| Script | Work |
|---|---|
| P4.1 | `lib/validate.ts`: errors/warnings; Setup warnings panel with acknowledge-to-continue |
| P4.2 | `lib/text.ts`: NFC normalize, control-char strip, tokenizer; renderer components; swap all question/option rendering to tokens |
| P4.3 | Escape audit: every HTML string built in `zip.ts`/`usePrintBackup` escapes text (`& < > " '`); tests with `<script>` and `&` in a question |
| P4.4 | `lib/importJson.ts`, `lib/importCsv.ts`, `lib/exportBank.ts` converters; Setup buttons "Import JSON/CSV" and "Export bank (JSON/CSV)" |
| P4.5 | `pinAllOfAbove` toggle in Setup (persisted via `commitLastSettings`, fully wired per Tech Reference §13) |
| P4.6 | E2E + docs update |

### 4.1 Validation (warnings never block; each is shown and must be acknowledged once per build)

| Code | Severity | Rule |
|---|---|---|
| (existing) | message | Blocks with < 2 options skipped; unmatched answer letters dropped (text preview truncated to 40 chars): unchanged |
| `W_CROSS_REF` | warning | Stem matches `/\b(question|q\.?)\s*\d+\b/i`. **Shuffling breaks "see Question 3"**; this is the most valuable warning |
| `W_ALL_OF_ABOVE` | warning | Pattern matches but pinning is off |
| `W_DUP_OPTION` | warning | Two options identical after case-fold |
| `W_LENGTH_BIAS` | warning | Correct option ≥ 2× average of the others and ≥ 40 chars |
| `W_FEW_QUESTIONS` | warning | Fewer questions than sets (position constraint impossible) |
| `W_NO_ANSWER` | warning | Question has no answer line (key will show "—" for it) |
| `Q_TEXT_TOO_LONG` / `O_TEXT_TOO_LONG` | error | > 4000 / > 1000 characters |
| `Q_COUNT` | error | 0 questions or > 500 |

### 4.2 Text markup (tokens, never HTML strings)

`_{x}` → subscript, `^{x}` → superscript (e.g. `H_{2}O`, `m^{2}`), a line of ```` ``` ```` starts/ends a preformatted block. Unbalanced markup is literal text. `tokenize(text): Token[]` with `{t:'text'|'sub'|'sup'|'pre'|'br', v}`. Renderers map tokens to `<span>/<sub>/<sup>/<pre>/<br/>`; the exported paper HTML and print area use the same tokenizer with an escaping serializer. **`dangerouslySetInnerHTML` is forbidden** (ESLint `react/no-danger`).
Tests: balanced, unbalanced, nested, empty, formula examples, XSS strings.

### 4.3 Converters

JSON (v3 D3.1 shape: `schemaVersion`, `title`, `questions[{id,text,options[{id,text,pin?}],correctOptionId}]`) and CSV (`id,question,option_1..option_8,correct,…`; UTF-8, BOM stripped, RFC 4180; `correct` is `1–8` or `A–H`) are **converted into the existing paste syntax in the textarea**. The textarea stays the single source of truth, so autosave, parsing, warnings, and exports are unchanged. CSV parsing uses a small hand-written RFC 4180 reader (≈ 40 lines) to avoid a new dependency; if it grows beyond that, `papaparse` may be added with a recorded justification.
Tests: round trip JSON → text → parse equals source; CSV edge cases (quotes, commas, newlines, BOM, CRLF, gap between options, letter vs number answer).

**Exit criteria:** every code above has a pass and a fail test; a bank with `<b>` and `&` renders literally on slides, papers and print; formulas render; imports round-trip.

---

## PHASE 5: PACKAGE, EXPORTS, BACKUP

**Goal:** the exact exam that was run can be proven, exported, restored, and audited.

| Script | Work |
|---|---|
| P5.1 | `lib/canonical.ts`, `lib/hash.ts` (v3 D8 `canonicalize` + `sha256Hex` verbatim), `lib/pkg.ts` + tests |
| P5.2 | Store: `pkg` held as the frozen exam source; version counter; rebuild ⇒ version + 1 |
| P5.3 | `lib/exportCsv.ts`: `master_key.csv`, `audit_key.csv`; `package.json` export |
| P5.4 | Extend zip (C7): papers footer, new files; legacy files byte-identical |
| P5.5 | "Save backup copy" button (download) + reminder state feeding P-BACKUP |
| P5.6 | Import package: verify, then restore End screen/keys (or resume) |
| P5.7 | Printable keys view (print stylesheet, header with title/package ID/hash prefix/date) |

### 5.1 Package

```ts
interface ExamPackage {
  meta: { schemaVersion: 1; appId: 'mcq-projector'; packageId: string; version: number;
          title: string; createdAtEpochMs: number; questionCount: number; numSets: number };
  gen: GenParams;                       // seed, algorithmVersion, numSets, pinAllOfAbove
  bank: { questions: Question[] };      // with ids
  mappings: Record<string, SetMapping>; // per set label
  sets: Record<string, SetQuestion[]>;
  keys: Record<string, SetKey>;
  master: MasterRow[];
  constraintReport: ConstraintReport;
  marks: { correct: number; incorrect: number };
  integrityHash: string;                // sha256 of canonicalize(package without hash, with packageId = '')
}
```
Excluded from the package and the hash: display settings (font, per-slide), exam date, session/timer state (INV-1). `packageId = 'EXAM-' + yyyymmddhhmmss(UTC) + '-' + hash.slice(0,8)` is set **after** hashing and blanked again when verifying. `buildPackage` runs validation → generation → keys → verifier and **never returns a package that fails verification**. `crypto.subtle` requires a secure context: GitHub Pages (https) and `http://127.0.0.1` qualify; on `file://` or LAN `http://` the app shows a clear message instead of failing silently.
Recovery and import call `verifyPackage` (hash + content) and refuse to resume on failure.

### 5.2 Exports (zip)

| File | Status |
|---|---|
| `QuestionPaper-Set<X>.html` (one per set) | unchanged + footer line `Package <id> · seed <seed>` (C7) |
| `AllAnswerKeys.csv` | **unchanged** (columns `Key Letter, Question Number, Response/Mapping, Correct Marks, Incorrect Marks, Tags`; `Question Number` = displayed number; `#` header comment; `Tags` empty) |
| `master_key.csv` (new) | `qid,<set>_seq,<set>_letter` for every set |
| `audit_key.csv` (new) | `qid,set,seq,letter,correct_text,option_order` (UTF-8 BOM, CRLF) |
| `<packageId>.package.json` (new) | full package, pretty-printed |

Tests: **T-EXP-1** CSV column specs, BOM, CRLF; **T-EXP-2** legacy files equal P0.6 snapshots; **T-PKG-1** hash stable for same inputs and fixed `now`; **T-PKG-2** any content mutation ⇒ `hashOk=false`; **T-PKG-3** `packageId` change does not affect verification; **T-PKG-4** rebuild increments `version`, old package untouched; **T-EXP-3** export → clear storage → import ⇒ identical hash and keys.

**Exit criteria:** all pass; a package exported from `localhost` imports and verifies on the hosted site (and vice versa), which proves the G5 workaround.

---

## PHASE 6: RELEASE, OFFLINE KIT, HARDWARE QA

**Goal:** a tagged release anyone can run offline, and a signed-off acceptance checklist.

| Script | Work |
|---|---|
| P6.1 | `tools/launch.ps1` (offline static server, below) |
| P6.2 | `.github/workflows/release.yml`: on tag `v*` build with no base path, zip `site/` + `launch.ps1` + README, publish a GitHub Release |
| P6.3 | Optional minimal service worker (see 6.3) |
| P6.4 | Full `verify`, coverage report, E2E on all viewports |
| P6.5 | Performance and soak: fit check for 200 questions < 400 ms; 3-hour simulated exam, memory stable |
| P6.6 | Real-projector rehearsal; Part 9 checklist; tag `v1.0.0` |

### 6.1 `tools/launch.ps1` (adapted from v3 H2)

Serves the `site/` folder on `http://127.0.0.1:47831/`, opens Edge/Chrome in `--app` mode with a **fixed** profile folder `%LOCALAPPDATA%\MCQProjector\profile` (fixed origin = saved sessions persist; changing port or profile makes data look "lost"). Binds to `127.0.0.1` only, blocks path traversal, adds a `/__health` endpoint so a second launch just opens a window. Requires PowerShell 7 and Edge/Chrome; **no Node needed**.

```powershell
#requires -Version 7.0
param([int]$Port = 47831, [switch]$NoBrowser)
$ErrorActionPreference = 'Stop'
$root = Join-Path $PSScriptRoot 'site'
if (-not (Test-Path -LiteralPath (Join-Path $root 'index.html'))) { throw "site\index.html not found next to launch.ps1" }
$rootFull = [IO.Path]::GetFullPath($root)
$profileDir = Join-Path $env:LOCALAPPDATA 'MCQProjector\profile'; New-Item -ItemType Directory -Force -Path $profileDir | Out-Null
$mime = @{ '.html'='text/html; charset=utf-8'; '.js'='text/javascript; charset=utf-8'; '.css'='text/css; charset=utf-8'
  '.json'='application/json; charset=utf-8'; '.svg'='image/svg+xml'; '.png'='image/png'; '.ico'='image/x-icon'
  '.woff2'='font/woff2'; '.woff'='font/woff'; '.txt'='text/plain; charset=utf-8'; '.map'='application/json' }
function Open-App {
  $c = @("${env:ProgramFiles(x86)}\Microsoft\Edge\Application\msedge.exe","$env:ProgramFiles\Microsoft\Edge\Application\msedge.exe",
         "$env:ProgramFiles\Google\Chrome\Application\chrome.exe","${env:ProgramFiles(x86)}\Google\Chrome\Application\chrome.exe")
  $b = $c | Where-Object { Test-Path -LiteralPath $_ } | Select-Object -First 1
  if (-not $b) { Write-Host "No Edge/Chrome found. Open http://127.0.0.1:$Port/ manually." -ForegroundColor Yellow; return }
  Start-Process -FilePath $b -ArgumentList @("--app=http://127.0.0.1:$Port/", "--user-data-dir=$profileDir", '--no-first-run')
}
$listener = [Net.HttpListener]::new(); $listener.Prefixes.Add("http://127.0.0.1:$Port/")
try { $listener.Start() } catch {
  try { if ((Invoke-WebRequest "http://127.0.0.1:$Port/__health" -TimeoutSec 2 -UseBasicParsing).Content -eq 'ok-mcq-projector') { Write-Host 'Already running; opening window.' -ForegroundColor Green; if (-not $NoBrowser) { Open-App }; return } } catch { }
  throw "Port $Port is in use by another program."
}
Write-Host "MCQ Projector running at http://127.0.0.1:$Port/  (leave this window open; Ctrl+C to stop)" -ForegroundColor Green
if (-not $NoBrowser) { Open-App }
try {
  while ($listener.IsListening) {
    $task = $listener.GetContextAsync()
    while (-not $task.AsyncWaitHandle.WaitOne(500)) { if (-not $listener.IsListening) { break } }
    if (-not $task.IsCompleted) { continue }
    $ctx = $task.GetAwaiter().GetResult()
    try {
      $req = $ctx.Request; $res = $ctx.Response
      if ($req.HttpMethod -notin 'GET','HEAD') { $res.StatusCode = 405; $res.Close(); continue }
      $path = [Uri]::UnescapeDataString($req.Url.AbsolutePath)
      if ($path -eq '/__health') { $b = [Text.Encoding]::UTF8.GetBytes('ok-mcq-projector'); $res.ContentType = 'text/plain'; $res.OutputStream.Write($b,0,$b.Length); $res.Close(); continue }
      $rel = $path.TrimStart('/'); if ([string]::IsNullOrEmpty($rel)) { $rel = 'index.html' }
      $full = [IO.Path]::GetFullPath((Join-Path $root $rel))
      if (Test-Path -LiteralPath $full -PathType Container) { $full = Join-Path $full 'index.html' }   # trailingSlash export: /folder/ -> folder/index.html
      if (-not $full.StartsWith($rootFull, [StringComparison]::OrdinalIgnoreCase)) { $res.StatusCode = 403; $res.Close(); continue }
      if (-not (Test-Path -LiteralPath $full -PathType Leaf)) { $res.StatusCode = 404; $res.Close(); continue }
      $ext = [IO.Path]::GetExtension($full).ToLowerInvariant()
      $res.ContentType = $(if ($mime.ContainsKey($ext)) { $mime[$ext] } else { 'application/octet-stream' })
      if ($ext -eq '.html') { $res.Headers.Add('Cache-Control','no-cache') }
      $bytes = [IO.File]::ReadAllBytes($full); $res.ContentLength64 = $bytes.Length
      if ($req.HttpMethod -eq 'GET') { $res.OutputStream.Write($bytes,0,$bytes.Length) }
      $res.Close()
    } catch { try { $ctx.Response.StatusCode = 500; $ctx.Response.Close() } catch { } }
  }
} finally { $listener.Stop(); $listener.Close() }
```

### 6.2 `release.yml` (outline)

Trigger: `push` of tags `v*`. Steps: checkout → setup-node (`lts/*`, cache npm) → `npm ci` → `npm run verify` → `npm run build` (no `PAGES_BASE_PATH`) → assemble `release/` with `site/` (contents of `out/`), `launch.ps1` (from `tools/`), `README.txt` (3-line start guide + exam-day tips) → `Compress-Archive` → `gh release create $TAG mcq-projector-$TAG.zip --generate-notes` using `GITHUB_TOKEN` with `permissions: contents: write` (no third-party action needed). Users unzip, right-click `launch.ps1` → Run with PowerShell 7 (or `pwsh -File launch.ps1`).

### 6.3 Optional service worker (do only if the "refresh while offline on the hosted site" case matters)

A hand-written `public/sw.js`: cache-first for same-origin GET of the exported files, with a versioned cache name = `NEXT_PUBLIC_COMMIT`, old caches deleted on activate; registered only in production; `skipWaiting` **off** so a new version never swaps mid-exam (it activates on next full load). Treat as risky: stale caches are the classic failure. Ship it only after the E2E "go offline → refresh → app loads → previous session recoverable" test (T-NET-2) passes on the hosted site; otherwise rely on the release zip. This is a deliberate substitute for v3's `vite-plugin-pwa`, which does not apply to this stack.

### 6.4 Hardware QA matrix (manual, recorded in the final report)

Windows display scaling 100/125/150/200 %; projector connected as extended display; Edge and Chrome; fullscreen on the projector display; back-row readability check; audio through projector/speakers; laptop on battery and plugged in; sleep/notification settings off; tab throttling (minimize teacher window for 2 minutes mid-exam: remaining time must stay correct); refresh recovery; print backup to a real printer or PDF.

**Exit criteria:** every item in Part 9 checked; no open severity-1 issue; release `v1.0.0` published; the release zip runs on a machine **without Node**.

---

## PHASE 7: STRETCH (separate plan, only after v1.0)

Ordered by value: **(1) Dual window**: teacher control window + stateless projector window over `BroadcastChannel` (v3 E4: envelope, `seq`, `HELLO`/`SNAPSHOT`/`HEARTBEAT`, projector view handed over via its own storage, never over the channel). The Phase 2 `toProjectorView` and import-boundary rules make this a move, not a rewrite, and it removes the one remaining exposure in v1: the End-screen answer key is visible if the class can see the screen. **(2)** Anchor-based paging with auto-density (v3 E2). **(3)** Question groups and pinned questions. **(4)** IndexedDB exam library and File System Access folder backup. **(5)** Per-question time overrides, LMS/QTI export, OMR scoring.

---

# PART 7: TEST STRATEGY (SUMMARY)

| Layer | Tooling | What it covers | Runs |
|---|---|---|---|
| Unit | Vitest (`node`) | Everything in `lib/` (parser, shuffle, prng, generate, keys, verify, timer, fit, preflight, validate, text, importers, pkg, exports) | local `verify`, CI |
| Property | `fast-check` | Generation invariants, key correctness over random banks, no skip/repeat | local, CI |
| Component / hook | Vitest + Testing Library + jsdom | Screens, store actions, recovery wiring, shortcuts, print overlay | local, CI |
| E2E | Playwright (local: installed Edge; CI: Chromium) | Full flow, viewports, throttle/jump clock, refresh recovery, zero external requests, zip contents | local `npm run e2e`, CI |
| Manual | Checklist (Part 9) | Beeps, real projector, print dialog, Windows scaling, hosted site on a clean profile | before each tagged release |

**Rules:** a test that is flaky is fixed or quarantined with a dated TODO, never deleted silently. Coverage thresholds apply to `lib/**` only (90 % lines, 85 % branches), enforced in CI from Phase 2. The count of executed test files/tests is reported in every summary, so "build GREEN" can never again mean "only `lib/` ran".

**Always-on E2E guards (added in Phase 1, kept forever):** T-NET-1 no request leaves the origin; T-DISP-1 font/zoom/fullscreen/print do not change sets, hash or timer deadline; T-LEAK-1 the slideshow DOM contains no answer markers.

---

# PART 8: RISKS AND MITIGATIONS

| Risk | Mitigation |
|---|---|
| Hosted site unavailable at exam time (network, GitHub outage) | Load the page and keep the tab open; or run the release zip locally (Phase 6); keep an exported package + printable papers on a USB drive |
| Saved sessions "disappear" when moving between `localhost`, the hosted URL and the release launcher | Different origins have separate storage (G5). Use package export/restore (Phase 5); keep the launcher's port/profile fixed |
| `basePath` mistakes (blank page, 404 assets) on GitHub Pages | `configure-pages` supplies `base_path`; P1.4 fetches a real `_next` asset after deploy |
| New engine changes behavior unnoticed | P0.6 export snapshots; behavior-change register (1.4); golden vectors |
| Constraint solver unsatisfiable (few questions, many sets) | Bounded attempts, relaxation notes, shown before Start; never an error |
| Fit measurement differs from real layout | Same CSS classes/widths/fonts, `document.fonts.ready`, E2E cross-check against `scrollHeight`, calibration on the real projector |
| Timer drift in throttled/background tabs | Deadline timer, flags for beeps, E2E fake-clock jump test |
| Class can see the answer key on the End screen | Key hidden by default, toggle is explicit; **Phase 7 dual window removes the exposure.** Until then, teacher presses `Esc`/blanks the projector before toggling |
| Public repo leaks exam data | Exam content is git-ignored and never leaves the browser; no secrets in the repo; CI has no secrets |
| Dependency or action version drift | `package-lock.json` committed; `npm ci` in CI; bump action majors only when GitHub warns |
| Hash needs secure context | Clear message on `file://`/LAN-http; hosted (https) and localhost are fine |
| Scope creep | The cut line (Part 4) and the Phase 7 parking lot; changes outside the behavior-change register require a recorded decision |

**Exam-day guidance (goes in README):** seat adjacent students on different sets; run preflight and a back-row readability check beforehand; keep the exported package, keys and printable papers on removable media; disable notifications and sleep on the teacher machine; put the browser window on the projector display before pressing fullscreen; keep the End-screen key hidden while the class can see the screen.

---

# PART 9: FINAL ACCEPTANCE CHECKLIST (v1.0)

**Baseline:** [ ] all test files execute (count reported) [ ] crash recovery restores on refresh [ ] `P` key and button print mid-exam without touching timer/slide [ ] v8 export snapshots unchanged
**Hosting:** [ ] repo on GitHub [ ] CI green on `main` [ ] site live on Pages, verified on a clean profile [ ] footer shows commit hash [ ] rollback documented and tried once [ ] zero external requests (T-NET-1)
**Engine:** [ ] seeded and reproducible (golden vectors) [ ] cross-set position constraint [ ] distinct correct letters where possible [ ] "All of the above" pinned last [ ] relaxations reported [ ] independent verifier with all mutation tests [ ] answers stored as option IDs [ ] no `Math.random` in `lib/` (lint)
**Safety:** [ ] slideshow/print/paper code never receives answers (types + lint + T-VIEW-1) [ ] package hashed, versioned, verified on open/resume [ ] export → restore round trip identical [ ] text rendered via tokenizer, HTML escaped everywhere
**Display:** [ ] fit check names offenders [ ] Auto-size font [ ] Start blocked on clipping [ ] `A+` refuses clipping size [ ] no clipped text at the five viewports [ ] font/zoom/fullscreen/print never change exam state
**Timer:** [ ] deadline-based, correct after backgrounding/jump [ ] one warning beep and one transition beep per slide [ ] pause/resume exact [ ] recovery restores paused [ ] wake lock acquired [ ] "Test sound" works
**Preflight and UX:** [ ] all P-* checks implemented [ ] Start gated [ ] keyboard-only operation works [ ] shortcuts unchanged (`Space ← → + = - [ ] F P Esc`) [ ] "Skip →" still never touches last-used settings
**Release:** [ ] tag `v1.0.0` with release zip [ ] runs on a machine without Node via `launch.ps1` [ ] README with exam-day guidance [ ] known-issues register [ ] real-projector rehearsal recorded (scaling 100/125/150/200 %, audio, fullscreen, readability)

---

# PART 10: IMMEDIATE NEXT ACTION

1. Provide, once: the **project folder path** (e.g. `C:\Projects\mcq-projector`), and your **GitHub username** (and say so if you want a *private* repo; see G1).
2. The AI delivers **P0.1** (baseline snapshot). Run it; paste back the green summary (it is already on your clipboard).
3. The AI confirms which gaps are real, then delivers **P0.2** (safety net) → **P0.3** (all tests running) and continues in order.

# APPENDIX A: GLOSSARY

| Term | Meaning |
|---|---|
| Bank | The validated list of original questions |
| `qid` / `oid` | Stable IDs of a question / of an option within it |
| Set | One scrambled version of the exam (A, B, C…, up to 8) |
| Seq / display number | 1-based position in a set; same index space across sets |
| Letter | Displayed option label A–H, derived from displayed position |
| Key / master key / audit key | Per-set seq→letter table / qid→(seq, letter) for every set / qid-level record with correct text and option order |
| Package | Frozen, hashed, versioned bundle of the final exam (bank, seed, sets, keys) |
| Projector view | Answer-free subset of the package that slide, print and paper code may touch |
| Preflight | Checklist gating Start Exam |
| Origin | Scheme + host + port; browser storage is per origin |

# APPENDIX B: SOURCE MAP (where each idea came from)

| Section here | Source |
|---|---|
| Parity contract, persistence rules, screens, shortcuts | Next.js plan v3 §§2–11, Technical Reference §§4–10 |
| Known gaps and Phase 0 | Technical Reference §§7, 9, 11 |
| PRNG, generation, verifier, package, preflight, launcher, QA | MASTER_PROJECT_PLAN_v3 §§D5–D9, E4, E5, E11, G, H2, K (adapted as described in 1.2) |
| PowerShell standard, summary, log, clipboard | Next.js plan v3 §17 + MASTER_PROJECT_PLAN_v3 Part F + your persistent preferences |
| GitHub/Pages/CI/release, hosting decisions | New in v4 |

# END OF MASTER PLAN v4
