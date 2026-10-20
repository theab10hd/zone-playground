---
description: "zOne app - study a feature's code, design end-to-end test cases, write the Playwright suite, run it, fix test defects, and produce a PDF report"
argument-hint: "[manual] <feature name and details> [--headed] [--no-report]"
---

# Feature → Playwright suite → PDF report

Request: `$ARGUMENTS`

Take a feature description and carry it all the way through: find and study the code, design end-to-end test cases, list them, write the suite, run it, fix test defects, rerun, and report. Follow the project's `CLAUDE.md` if it has one. Never fabricate a result.

Flags:
- **Auto is the default.** Run end to end without stopping: show the test cases in chat, then write and run them straight away. Run the auth setup yourself as well (step 2); never ask the user whether to run it.
- `manual` as the **first word** (`/zone-test:feature manual <feature>`): stop after showing the test cases and wait for the user to confirm them (step 3). Only the first word counts, so "manual" later in the feature description never switches it on. Strip it from the feature text. A leading `auto` is accepted and stripped too; it changes nothing.
- `--headed` adds `--headed` to every Playwright command. `--no-report` skips the PDF.

Everything else is the feature name and details. Treat any limit the user gives, such as "only 10 cases" or "API only", as a hard constraint on step 3. Design exactly that many cases, or that scope, and no more. Without a limit, aim for full coverage; a large number of cases is expected and fine.

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
- The auth or setup project, and how storage state is reused. Follow the **Auth** rules in step 3 of `e2e.md`: find the hardcoded or saved login, and plan to run the auth setup yourself together with the feature cases. Note every role or user the setup (or the seed and fixture files) can sign in as, because step 3 uses them for role cases.
- Two or three existing suites closest to this feature: folder and file layout, cleanup specs, helpers and fixtures, the API and session helpers, how data is discovered, the case-id and `test.describe` naming, and how shared context is passed between tests.

If a project-specific Playwright test-writing skill is available, load it. Its conventions take precedence over anything inferred here.

## 3. Design end-to-end test cases

From the feature map, design cases that cover the feature from the UI through the API to persisted data, and back to the UI. Be thorough: cover every category below that the feature has, with several cases per category where the code has several paths. More cases is fine; missing a path is not.

- **UI checks**: every page, dialog and control the feature adds or changes renders correctly; the happy path for every user action; labels, default values, enabled and disabled states, loading and empty states, success and error messages, navigation and redirects, and that grids, lists and forms show the right data.
- **API checks**: every endpoint the feature calls, tested directly through the project's API helpers: status codes, response shape and fields, correct data for the request, filtering, sorting and paging parameters, and the error responses the code has (400, 401, 403, 404, 409, 500). Check that each UI action sends the expected request (wait on it with `page.waitForResponse`) and that the UI reflects the response.
- **Data validation**: every validation rule found in the UI and the backend: required fields, formats, min and max length, numeric ranges, dates, uniqueness and duplicates, allowed values, special characters, leading and trailing spaces, and that invalid input is rejected both in the UI and by the API when called directly. Persistence: what the UI shows after reload matches what the API returns and what was saved.
- **User roles**: where the feature or its endpoints check roles or permissions, cases for each role the setup can sign in as: what each role can see and do, and that a forbidden action is hidden or disabled in the UI and refused by the API. Skip this category only when the code enforces no roles, and say so under the table.
- **Edge cases**: empty lists, a single item, large values and long text, maximum page sizes, paging boundaries, zero and negative numbers, unicode, rapid repeated clicks or double submit, cancel and back navigation mid-flow, concurrent edits where the code handles them, and stale data after another change.
- **End-to-end flows**: full user journeys across the feature, from creating data through editing and viewing it to deleting it, checking the UI, API and saved data at each step.
- **Affected areas**: every other feature, page, report, export or endpoint found in step 1 that reads or changes the same data, or shares the changed components and services. Check that each still works and shows the change correctly (regression cases).
- **Cleanup**: every record the suite creates is removed.

Group the cases into `describe` groups, at least one per category, and give each case an id, following the existing convention (for example `A. API - ...` with ids `A1`, `A2`). Include only cases the code supports. Note anything you can't test, such as missing data, a role you can't access, or an external dependency, as a coverage gap rather than a case.

### Show the test cases in chat (mandatory, in both modes)

Post the full list as a message in the chat itself. Writing it to a file, the report or your own reasoning does not count. Use one table with a row per case:

| Id | Group | What It Checks | Layer | Type |
| --- | --- | --- | --- | --- |

Under the table, give the case count (and the limit, if the user set one), then the coverage gaps. Do not summarise, merge or leave out rows.

### Confirm before writing any code

- **With `manual`:** end your turn right after the table with this question: *"Reply **go** to write and run these, or tell me what to add, remove or change."* Do not start step 4, create test files, edit the config or run Playwright in this turn.
  - If the user asks for changes (add, remove or reword cases, or change the scope), apply them, post the **whole revised table** again, and ask again. Repeat until they confirm.
  - Only an explicit confirmation counts, such as "go", "yes", "confirmed" or "looks good, run it". Silence, a question or a partial answer is not a confirmation.
  - Once they confirm, continue to step 4 with exactly the confirmed list.
- **Default (auto):** after posting the table, continue straight to step 4 without asking.

## 4. Write the suite

- Pick the project name and folder to match the existing naming. If the feature already has a suite, extend it instead of creating a parallel one, and keep its existing case ids.
- If the config uses projects, add one in the same form as its neighbours, including any setup dependency.
- Reuse the existing helpers. Add a helpers file only for logic this suite needs more than once.
- Discover test data at run time. Never hard-code ids or counts from a shared database. Create the data you need, and delete it in teardown or a cleanup spec.
- Do not use arbitrary `waitForTimeout`. Wait on responses, locators or state.
- Never edit application code.

Typecheck before running: `npx tsc --noEmit -p .` if a tsconfig covers the test folder, and otherwise `npx playwright test --project=<project> --list`. Fix compile errors before continuing.

## 5. Run, diagnose, fix, rerun, report

Follow steps 3 to 9 of `e2e.md` for the new project, using `--project=<project>` as the target. Fixes are allowed (do not apply `--no-fix`). Carry `--headed` and `--no-report` through. Run the auth setup and the feature cases yourself, as step 3 of `e2e.md` describes, without asking.

The rules there apply in full: classify every failure from evidence, fix only test defects, keep the Initial and Final results separate, and take every count from the JSON.

In the report data, also fill in:
- `featureMap` and `featureMapSource`: the layers and files studied, and whether they came from graphify or search.
- `designedCases`: the step 3 table, so the reader can compare designed and executed cases.

## 6. Final response

Give everything step 9 of `e2e.md` lists. Also include the new or changed test files, any config change, and the number of cases designed against the number written and executed.
