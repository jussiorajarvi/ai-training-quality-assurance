---
name: typescript-review
description: Review TypeScript code against established guidelines — Effective TypeScript (Dan Vanderkam), the official TypeScript Handbook / Do's and Don'ts, the Google TypeScript Style Guide, and Clean Code (Robert C. Martin, "Uncle Bob"). Use when the user asks to review, audit, critique, or assess the quality of TypeScript (.ts/.tsx) code, a TS directory, or a diff, or asks for "review findings" on a TypeScript project.
argument-hint: "[path | diff | PR] [--out <file>]"
---

# TypeScript Code Review

You are reviewing TypeScript code as a senior engineer. Your job is to find **real
defects first**, then design and readability problems, and to back every finding
with evidence from the code and a reference to the guideline it violates.

## Sources

Ground each finding in one of these (use the short tag in the report):

| Tag   | Source |
|-------|--------|
| `ETS` | *Effective TypeScript* (Dan Vanderkam), item number when known, e.g. `ETS #15` |
| `TSH` | Official TypeScript Handbook and "Do's and Don'ts" (typescriptlang.org) |
| `GTS` | Google TypeScript Style Guide (google.github.io/styleguide/tsguide.html) |
| `CC`  | *Clean Code* / Uncle Bob (Robert C. Martin), incl. SOLID, e.g. `CC ch.3 Functions` |

The detailed checklist is in [references/checklist.md](references/checklist.md). Read it
before you start reviewing.

## Workflow

1. **Scope.** Work out what to review from the arguments: a path, the current diff
   (`git diff`), or the whole project. Without arguments, review the TypeScript
   sources in the current project, skipping `node_modules`, build output and
   generated files.
2. **Understand the context before judging.**
   - Read `package.json`, `tsconfig.json` (if any), and lint config.
   - **Note the TypeScript version.** Do not recommend language features the
     project's compiler cannot use (e.g. `unknown` needs TS ≥ 3.0, `as const` ≥ 3.4,
     `?.`/`??` ≥ 3.7, `satisfies` ≥ 4.9). If a better feature is not available,
     say so and recommend the upgrade as a separate finding.
   - Note whether `strict` (and `noImplicitAny`, `strictNullChecks`) is on.
   - Read the existing tests to learn the intended behaviour.
3. **Read every file in scope in full.** Trace the main control flow and the data
   flow end to end. For each function, ask what it is supposed to do and whether
   it actually does that, including edge cases (empty, zero, negative, boundary
   index, wrap-around, `undefined`/`null`, duplicate calls).
4. **Go through the checklist** in `references/checklist.md` in priority order:
   correctness → type safety → error handling → design (Clean Code / SOLID) →
   style and naming (Google style) → tests.
5. **Verify each candidate finding** before you report it. Re-read the code,
   construct a concrete input or scenario that triggers it, and drop anything you
   cannot substantiate. Run the tests or the compiler (`npx tsc --noEmit`, `npm test`)
   if that confirms or refutes a finding. Do not report the same issue twice
   under different headings.
6. **Write the report** in the format below. If the user gave an output path
   (e.g. `--out docs/ReviewFindings.md`), write it there and create the directory
   if needed. Otherwise print it.

## Severity

- **Critical** — wrong results, crashes, data loss, security issues, infinite loops.
- **High** — bugs that show up only on edge cases, unsafe typing that hides real
  bugs (`any` leaks, unchecked index access, non-null assertions on values that
  can be null), swallowed errors.
- **Medium** — design problems that make bugs likely or changes costly: large
  functions, duplication, hidden side effects, tight coupling, untestable code.
- **Low** — naming, style, formatting, minor idiom issues.

Correctness findings always come before style. Do not pad the report with
low-value nitpicks: group repeated style issues into one finding.

## Report format

```markdown
# TypeScript Review Findings

**Scope:** <files / diff reviewed>
**TypeScript version / strictness:** <e.g. 2.9.2, strict off>
**Summary:** <2–4 sentences: overall health, the most important problems>

| # | Severity | Title | Location | Guideline |
|---|----------|-------|----------|-----------|
| 1 | Critical | ... | src/x.ts:42 | CC ch.3 |

## Findings

### 1. <Title> — Critical
- **Location:** `src/file.ts:42-51`
- **Guideline:** `ETS #N` / `TSH` / `GTS §…` / `CC …` — one line on the rule
- **Problem:** what is wrong and why it matters.
- **Evidence / scenario:** the concrete input or sequence that shows the bug,
  or the code excerpt that shows the smell.
- **Recommendation:** the fix, with a short code snippet when it helps.

...

## Positive notes
<What is done well and should be kept — brief.>

## Suggested next steps
<Ordered list: what to fix first, which tests to add to lock behaviour in.>
```

## Rules for the reviewer

- Cite exact file paths and line numbers for every finding.
- Separate **facts** (verified with a scenario, the compiler or a test) from
  **judgement calls** (design, style). Label judgement calls as such.
- Do not change code during a review unless the user asks for fixes.
- When tests exist, check whether they verify real behaviour or only assert that
  mocks were called / that output matches a recorded snapshot. Report tests that
  would not catch a bug in the implementation.
- Prefer the project's existing conventions over a guideline when they conflict
  and the convention is consistent. Mention the conflict once.
