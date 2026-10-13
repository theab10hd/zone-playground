---
description: "zOne app - study a feature's code, design end-to-end test cases, write the Playwright suite, run it, fix test defects, and produce a PDF report"
argument-hint: "[auto] <feature name and details> [--headed] [--no-report]"
---

# Feature → Playwright suite → PDF report

Request: `$ARGUMENTS`

Take a feature description and carry it all the way through: find and study the code, design end-to-end test cases, list them, write the suite, run it, fix test defects, rerun, and report. Follow the project's `CLAUDE.md` if it has one. Never fabricate a result.

Flags:
- `auto` as the **first word** (`/zone-test:feature auto <feature>`): run end to end without stopping. Only the first word counts, so "auto" or "auto-fill" later in the feature description never switches it on. Strip it from the feature text. Show the test cases in chat, then write and run them straight away.
- No `auto`: stop after showing the test cases and wait for the user to confirm them (step 3). This is the default.
- `--headed` adds `--headed` to every Playwright command. `--no-report` skips the PDF.

Everything else is the feature name and details. Treat any limit the user gives, such as "only 10 cases" or "API only", as a hard constraint on step 3. Design exactly that many cases, or that scope, and no more.

If the request names no recognisable feature, ask one question to pin it down, then continue.

Locate the workspace root, Playwright dir, reports dir and work dir as described in step 0 of the `e2e` command in this plugin (`${CLAUDE_PLUGIN_ROOT}/commands/e2e.md`; if that path isn't expanded, use Glob `**/zone-test/**/commands/e2e.md` under `~/.claude/plugins/`). If the repo has no Playwright setup, stop and say so; do not install one unasked.

## 1. Find the feature's code

Work from the workspace root. Locate every layer the feature touches: UI components, routes, client services or API calls, backend controllers and endpoints, services, data models, and permissions.

- **Graphify first.** If `<workspace root>/graphify-out/graph.json` exists and the `graphify` skill is available, use it from the workspace root. Run `graphify query "<feature>"` for the broad picture, `graphify path "<UI component>" "<endpoint or table>"` to trace the request path, and `graphify explain "<node>"` for any central node you don't recognise. Treat INFERRED and AMBIGUOUS edges as leads, and confirm them in the code.
- **No graph, or gaps in it.** Use Grep and Glob on feature keywords, route paths, API URLs and component names. For a feature that spans many files, dispatch `Explore` agents in parallel, one per layer (frontend, API, data), and ask each for file paths and relationships, not file dumps. Do not build a full graph unasked, because it is slow. If graphify is installed, say in the final response that building a graph would speed up later runs.
- Read the files you found. Do not design tests from file names.

Write a short **feature map**: the entry points (pages and routes), user actions, the endpoints each action calls, validations, roles and permissions, related features that share data, and existing tests that already cover part of it.

## 2. Review the current Playwright setup

In the Playwright dir, read rather than assume:
- The Playwright config: projects, `testDir`, `retries`, reporters, `baseURL`, `webServer`, setup-project `dependencies`, and trace and screenshot settings.
- The auth or setup project, and how storage state is reused.
- Two or three existing suites closest to this feature: folder and file layout, cleanup specs, helpers and fixtures, the API and session helpers, how data is discovered, the case-id and `test.describe` naming, and how shared context is passed between tests.

If a project-specific Playwright test-writing skill is available, load it. Its conventions take precedence over anything inferred here.

## 3. Design end-to-end test cases

From the feature map, design cases that cover the feature from the UI through the API to persisted data, and back to the UI:
- the happy path for every user action
- validation and error paths (required fields, bad input, server errors the UI must show)
- boundaries (empty lists, large values, paging, sorting, filtering)
- permissions and roles, where the code enforces them
- persistence: what the UI shows after reload matches what the API returns
- cross-feature effects found in step 1 (data used or changed elsewhere)
- cleanup, so that every record the suite creates is removed

Group the cases into `describe` groups and give each case an id, following the existing convention (for example `A. API - ...` with ids `A1`, `A2`). Include only cases the code supports. Note anything you can't test, such as missing data, a role you can't access, or an external dependency, as a coverage gap rather than a case.

### Show the test cases in chat (mandatory, in both modes)

Post the full list as a message in the chat itself. Writing it to a file, the report or your own reasoning does not count. Use one table with a row per case:

| Id | Group | What It Checks | Layer | Type |
| --- | --- | --- | --- | --- |

Under the table, give the case count (and the limit, if the user set one), then the coverage gaps. Do not summarise, merge or leave out rows.

### Confirm before writing any code

- **Without `auto`:** end your turn right after the table with this question: *"Reply **go** to write and run these, or tell me what to add, remove or change."* Do not start step 4, create test files, edit the config or run Playwright in this turn.
  - If the user asks for changes (add, remove or reword cases, or change the scope), apply them, post the **whole revised table** again, and ask again. Repeat until they confirm.
  - Only an explicit confirmation counts, such as "go", "yes", "confirmed" or "looks good, run it". Silence, a question or a partial answer is not a confirmation.
  - Once they confirm, continue to step 4 with exactly the confirmed list.
- **With `auto`:** after posting the table, continue straight to step 4 without asking.

## 4. Write the suite

- Pick the project name and folder to match the existing naming. If the feature already has a suite, extend it instead of creating a parallel one, and keep its existing case ids.
- If the config uses projects, add one in the same form as its neighbours, including any setup dependency.
- Reuse the existing helpers. Add a helpers file only for logic this suite needs more than once.
- Discover test data at run time. Never hard-code ids or counts from a shared database. Create the data you need, and delete it in teardown or a cleanup spec.
- Do not use arbitrary `waitForTimeout`. Wait on responses, locators or state.
- Never edit application code.

Typecheck before running: `npx tsc --noEmit -p .` if a tsconfig covers the test folder, and otherwise `npx playwright test --project=<project> --list`. Fix compile errors before continuing.

## 5. Run, diagnose, fix, rerun, report

Follow steps 3 to 9 of `e2e.md` for the new project, using `--project=<project>` as the target. Fixes are allowed (do not apply `--no-fix`). Carry `--headed` and `--no-report` through.

The rules there apply in full: classify every failure from evidence, fix only test defects, keep the Initial and Final results separate, and take every count from the JSON.

In the report data, also fill in:
- `featureMap` and `featureMapSource`: the layers and files studied, and whether they came from graphify or search.
- `designedCases`: the step 3 table, so the reader can compare designed and executed cases.

## 6. Final response

Give everything step 9 of `e2e.md` lists. Also include the new or changed test files, any config change, and the number of cases designed against the number written and executed.
