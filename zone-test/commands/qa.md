---
description: "zOne app - senior QA review of a feature or files: a team of tester agents reads the code edge to edge, finds functional, data, security and UI bugs without running anything, reports them by severity, then plans and fixes them after you confirm"
argument-hint: "<feature name or file paths> [docs: <PRD / TRD / spec paths>]"
---

# QA review → bug report → fix plan

Request: `$ARGUMENTS`

You are the **senior QA lead** of a team of testers. Your job is to find every real bug in the feature's implementation, and in the existing code it touches, by reading the code, so the feature is clean before anyone writes Playwright tests for it. Do not run the app, Playwright or any test. Do not edit code until the user confirms a fix plan (step 7). Follow the project's `CLAUDE.md` if it has one.

The goal is **bulletproof code, not a list of random bugs**. Cover the feature edge to edge, every file and every path in the map, in one pass, so that fixing this report does not leave the next round of bugs sitting in files nobody read. Report only bugs you can point to in the code. A finding without a file and line, or one you could not confirm, is not a bug.

If the request names no recognisable feature or file, ask one question to pin it down, then continue.

## 0. Parse the request

- **Target**: a feature name and details, or one or more file paths, or both. File paths are entry points, not the whole scope: the feature they belong to is the scope.
- **Reference docs**: any PRD, TRD, spec, design, ticket or other file the user names or attaches (`docs: ...`, a path, a pasted spec). Read every one in full. They define intended behaviour: code that disagrees with them is a bug.
- **Workspace root**: the current working directory. It may hold several repos (for example `frontend/` and `backend/`); search all of them.
- **Reports dir**: `C:\zOne Test Reports\` (on macOS or Linux, `~/zOne Test Reports/`). Create it if missing; always quote the path.

## 1. Read the ground rules

Before reading the feature, read what the team says good code looks like here:

- Every `CLAUDE.md` (root and in sub-repos) and `AGENTS.md`.
- The engineering guide: Glob for `**/*engineering*guide*`, `**/*ENGINEERING*`, `**/CONTRIBUTING*`, `**/docs/**/*{guide,standard,convention}*`, excluding `node_modules`, `bin`, `obj`, `dist`. Read what you find. If nothing turns up, say so in the report and use the conventions of the surrounding code.
- **Previous changes**: `git log --oneline -30 -- <feature paths>` and `git log -p -5 -- <key files>` in each repo, plus `git status` and `git diff` for uncommitted work. Recent changes are where new bugs hide: read each recent diff and ask what it broke, half-finished or forgot to update elsewhere.

Note every rule from these sources that the feature's code must obey (naming, error handling, auth, validation, styling, i18n, accessibility). Breaking a stated rule is a finding when it can cause a real defect.

## 2. Map the feature edge to edge

Find every layer the feature touches, following step 1 of the `feature` command in this plugin (`${CLAUDE_PLUGIN_ROOT}/commands/feature.md`; if that path isn't expanded, use Glob `**/zone-test/**/commands/feature.md` under `~/.claude/plugins/`): graphify first if `graphify-out/graph.json` exists, otherwise Grep, Glob and parallel `Explore` agents per layer. Read the files; do not judge code by file names.

Then widen it to the **blast radius**: for every function, component, endpoint, DTO, model, store, style class and shared helper the feature defines or changes, grep its callers and consumers. Those files are in scope too, because a change that is correct for the feature can break a sibling that shares it.

Write the **scope map**, which every later step works from:

| Area | Files | Why in scope |
| --- | --- | --- |

Areas: pages and routes, components and dialogs, styles, client services and state, API endpoints, backend services and validation, data models and queries, permissions, and affected features (shared data or shared code). List every file. This list is the coverage contract: step 5 checks that every file on it was reviewed.

## 3. Clear up doubts

While mapping, collect every point where the intended behaviour is unclear and the reference docs do not settle it: a rule that could be a bug or a deliberate choice, two code paths that disagree, a missing case with no obvious right answer. Ask the user, batched into one `AskUserQuestion` call (up to four questions, with your best guess as the first option). Do not ask what the code, the docs or the git history can answer. If the user doesn't know, record the assumption and carry on.

## 4. Run the QA team

Dispatch the testers **in parallel, in one message**, as `general-purpose` agents. Give each one: the scope map (every file path), the ground rules from step 1, the reference docs' paths, the user's answers from step 3, and its own lens below. Tell each to read **every file in the scope map** through its lens, not a sample, and to return findings only, in this shape:

`title | lens | file:line (every location) | what goes wrong, for which input or state | how to reproduce or verify | confidence (confirmed / likely)`

Each tester must not run the app or tests, must not edit files, and must list any scope file it could not review and why.

1. **Functional logic**: wrong conditions and operators, inverted or missing branches, off-by-one, wrong defaults, unhandled `null`/`undefined`/empty, wrong async order, missing `await`, unhandled promise rejections, errors swallowed by `catch`, stale closures, effects with wrong dependencies, state not reset between uses, behaviour that contradicts the PRD/TRD.
2. **Data, API and validation**: request and response shape mismatches between client and server, wrong field names or types, missing or wrong status handling, validation present in the UI but not the API (or the reverse), unsafe parsing of numbers and dates, time zones, rounding, paging and sorting bugs, N+1 or unbounded queries, missing transactions, partial saves, records not cleaned up, cache not invalidated after a write.
3. **Security and permissions**: missing authorization on endpoints, role checks only in the UI, IDOR (ids taken from the request without ownership checks), injection (SQL, command, path, HTML/XSS via `innerHTML`/`dangerouslySetInnerHTML`/`[innerHTML]`/`v-html`), secrets or tokens in code or logs, sensitive data in URLs or responses, unsafe file upload or download, missing CSRF or input limits.
4. **UI and style**: overlapping or clipped elements, `position`/`z-index` clashes, overflow and text that breaks or truncates without a tooltip, long and unicode text, fixed widths and heights that break at small or large screens, missing loading, empty and error states, buttons that stay enabled during a request (double submit), focus and keyboard traps, missing labels and accessible names, broken or hard-coded text where i18n is used, wrong theme variables, dark mode, styles leaking to other components, dialogs that don't close or reset.
5. **State, edge cases and concurrency**: race conditions between requests, out-of-order responses, rapid repeated actions, cancel and back mid-flow, reload mid-flow, stale data after another user or tab changes it, memory leaks (subscriptions, listeners, timers not cleaned up), boundaries (zero, negative, max, empty list, single item, huge list).
6. **Regression and Playwright readiness**: every affected feature in the scope map still works with the change (shared helpers, shared DTOs, shared styles); dead or half-migrated code from recent changes; interactive elements with no stable role, accessible name or test id, and flows that depend on timing, so they would make Playwright tests flaky.

Size the team to the feature: for a small feature (a handful of files) merge lenses 5 and 6 into the others; for a large one, split a lens by repo or layer so no tester gets more files than it can read properly. Never drop the UI lens when the feature has a UI, or the security lens when it has an endpoint.

## 5. Verify as the senior QA

Do not pass testers' findings straight to the user. For each finding:

- **Open the code at every cited line and confirm it yourself.** Trace the input or state that triggers it. If the path cannot actually be reached (a guard upstream, a type that rules it out, a caller that never passes that value), drop it. If you are not sure, keep it only as `likely` and say what would settle it.
- **Merge duplicates** across testers into one bug with every location.
- **Find the root cause.** If several findings come from one shared function, report one bug at the shared function and list the affected callers, not one bug per caller.
- **Assign severity** by impact on the user and the data:
  - **Critical**: data loss or corruption, a security hole, a crash or blank page on a main path, a core action that fails for everyone.
  - **High**: a main-path action that gives wrong results or fails for some users, roles or inputs; a broken permission check visible in the UI; an affected feature broken by the change.
  - **Medium**: an edge-case failure, a missing validation the server still catches, a missing loading/empty/error state, a UI defect that blocks or hides content (overlap, clipping, unreadable text).
  - **Low**: a cosmetic issue, a minor inconsistency, a convention breach with a small real risk, a Playwright-readiness gap (missing stable selector, timing dependence).

Then **check coverage**: compare the files the testers reviewed with the scope map. If any file was not reviewed, or a whole area produced no findings and was only skimmed, send a tester back to it before reporting. Bulletproof means nothing in scope went unread.

## 6. Report the bugs

Write the report to `C:\zOne Test Reports\<Feature-Name>-QA-Report.md` and post it in the chat too. Group the bugs by severity, Critical first, and number them within each group (`C1`, `C2`, `H1`, `M1`, `L1`). Show every bug one by one, exactly in this format:

```markdown
## Critical

### C1. <short title>
**Bug -** <what is wrong and what the user or the data experiences>
**Severity -** Critical
**Areas Involved -** <feature area>; `path/to/file.ts:42`, `path/to/other.cs:118`
**How to Reproduce / Verify -**
1. <step, with the exact input or state>
2. <step>
3. Expected: <what should happen>. Actual: <what the code does>.
```

Use a severity heading only when it has bugs. After the bugs, add:

- **Summary**: a count per severity.
- **Scope reviewed**: the scope map from step 2, the reference docs and ground rules used.
- **Assumptions and open questions**: anything the user didn't settle in step 3, and every `likely` bug's open point.
- **Not covered**: anything you could not review, and why.

If no bug survives verification, say so plainly, with the scope reviewed. Do not invent findings to fill the report.

## 7. Ask, plan, then fix

End the report with one question (use `AskUserQuestion`): **fix the bugs now?** Options: fix all; fix Critical and High only; let me pick; no, report only. Stop if the user picks report only.

Once the user picks, write the **fix plan** in the chat and append it to the report file:

| Bug | Fix | Files changed |
| --- | --- | --- |

One row per bug. The fix is the root-cause fix in the shared place every caller goes through, not a patch on the one path the report names. Under the table, list every file the plan will change, and any bug you recommend not fixing (and why). Then ask: *"Reply **go** to apply this plan, or tell me what to change."* Only an explicit go counts. Change the plan and ask again if the user asks for changes.

After go:

1. Apply the fixes, following the ground rules from step 1 and the style of the surrounding code. Change only what the plan names; if a fix needs another file, say so before touching it.
2. Run the project's own non-browser checks if they exist and are quick: typecheck, lint, build, unit tests. Never Playwright. Report their real output.
3. **Re-review the changed files and their callers** through the lenses that found the bugs, to make sure no fix introduced a new bug or broke an affected area.
4. Update the report: mark each bug Fixed, Not fixed (with the reason) or Needs follow-up.

## 8. Final response

Give the report path, the count per severity, what was fixed and in which files, the result of each check that ran, anything left open, and the next step: `/zone-test:feature <feature>` to write and run the Playwright suite on the cleaned feature.
