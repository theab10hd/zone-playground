---
description: "zOne app - study a feature's code, design exhaustive end-to-end and UI test cases, audit the live UI in Chrome, write the Playwright suite, run it, fix test defects, and produce a PDF report"
argument-hint: "[manual] <feature name and details> [--headed] [--no-report]"
---

# Feature → Playwright suite → PDF report

Request: `$ARGUMENTS`

Take a feature description and carry it all the way through: find and study the code, design end-to-end test cases, list them, write the suite, run it, fix test defects, rerun, and report. Follow the project's `CLAUDE.md` if it has one. Never fabricate a result.

Flags:
- **Auto is the default.** Run end to end without stopping: show the test cases in chat, then write and run them straight away. Run the auth setup yourself as well (step 2); never ask the user whether to run it.
- `manual` as the **first word** (`/ztest:feature manual <feature>`): stop after showing the test cases and wait for the user to confirm them (step 3). Only the first word counts, so "manual" later in the feature description never switches it on. Strip it from the feature text. A leading `auto` is accepted and stripped too; it changes nothing.
- `--headed` adds `--headed` to every Playwright command. `--no-report` skips the PDF.

Everything else is the feature name and details. Treat any limit the user gives, such as "only 10 cases" or "API only", as a hard constraint on step 3. Design exactly that many cases, or that scope, and no more. Without a limit, aim for full coverage: the goal is a feature that ships bug-free and clean, so a large number of cases (often well over a hundred for a view such as tiles, with a UI group per menu) is expected and fine. Do not trim cases for length or speed.

If the request names no recognisable feature, ask one question to pin it down, then continue.

Locate the workspace root, Playwright dir, reports dir and work dir as described in step 0 of the `e2e` command in this plugin (`${CLAUDE_PLUGIN_ROOT}/commands/e2e.md`; if that path isn't expanded, use Glob `**/zone-test/**/commands/e2e.md` under `~/.claude/plugins/`). If the repo has no Playwright setup, stop and say so; do not install one unasked.

## 1. Find the feature's code

Work from the workspace root. Locate every layer the feature touches: UI components, routes, client services or API calls, backend controllers and endpoints, services, data models, and permissions.

- **Graphify first.** If `<workspace root>/graphify-out/graph.json` exists and the `graphify` skill is available, use it from the workspace root. Run `graphify query "<feature>"` for the broad picture, `graphify path "<UI component>" "<endpoint or table>"` to trace the request path, and `graphify explain "<node>"` for any central node you don't recognise. Treat INFERRED and AMBIGUOUS edges as leads, and confirm them in the code.
- **No graph, or gaps in it.** Use Grep and Glob on feature keywords, route paths, API URLs and component names. For a feature that spans many files, dispatch `Explore` agents in parallel, one per layer (frontend, API, data), and ask each for file paths and relationships, not file dumps. Do not build a full graph unasked, because it is slow. If graphify is installed, say in the final response that building a graph would speed up later runs.
- Read the files you found. Do not design tests from file names.

Read `${CLAUDE_PLUGIN_ROOT}/reference/qa-bug-patterns.md` (if the path isn't expanded, use Glob `**/ztest/**/reference/qa-bug-patterns.md` under `~/.claude/plugins/`). It lists how the zOne QA team finds bugs. Every pattern in it is a case family to cover in step 3, and every sibling screen of the feature gets the same checks.

Build an exhaustive **control inventory** from the code, not from memory: every toolbar button, view switch, menu and sub-menu item (and menus inside menus), tab, filter, sort, search box, display or column setting, report or export action, dialog and modal, tooltip, badge, empty and error state, and every role-dependent variant of these. Each entry here becomes at least one case in step 3. A control with no case is a coverage gap you must name.

Write a short **feature map**: the entry points (pages and routes), user actions, the endpoints each action calls, validations, roles and permissions, related features that share data, and existing tests that already cover part of it.

## 2. Review the current Playwright setup

In the Playwright dir, read rather than assume:
- The Playwright config: projects, `testDir`, `retries`, reporters, `baseURL`, `webServer`, setup-project `dependencies`, and trace and screenshot settings.
- The auth or setup project, and how storage state is reused. Follow the **Auth** rules in step 3 of `e2e.md`: find the hardcoded or saved login, and plan to run the auth setup yourself together with the feature cases. Note every role or user the setup (or the seed and fixture files) can sign in as, because step 3 uses them for role cases.
- Two or three existing suites closest to this feature: folder and file layout, cleanup specs, helpers and fixtures, the API and session helpers, how data is discovered, the case-id and `test.describe` naming, and how shared context is passed between tests.

If a project-specific Playwright test-writing skill is available, load it. Its conventions take precedence over anything inferred here.

## 3. Design end-to-end test cases

From the feature map, design cases that cover the feature from the UI through the API to persisted data, and back to the UI. Be thorough: cover every category below that the feature has, with several cases per category where the code has several paths. More cases is fine; missing a path, a menu item or a visual check is not. Before posting the table, walk the control inventory once more and confirm every entry has a case.

- **UI checks**: every page, dialog and control the feature adds or changes renders correctly; the happy path for every user action; labels, default values, enabled and disabled states, loading and empty states, success and error messages, navigation and redirects, and that grids, lists, tiles and forms show the right data.
- **Menu and control coverage (one case per option, no exceptions)**: open every menu, sub-menu and menu-inside-menu and exercise every item in it: the item is present, correctly labelled and ordered, enabled or disabled as the data and role require, and does what it says (opens the right modal or page, calls the right endpoint, changes the right data). Include the "more" (...) menu, context menus, view and layout switches, display settings, column or field pickers, sort and filter controls, search, report and export actions, and every tab. Verify each result from the UI and from the API or saved data.
- **Modals and dialogs**: each one opens from every entry point, shows the right title, data and defaults, focuses the right control, closes by the X, Cancel, Escape and an outside click as the app intends, keeps or discards edits correctly, validates on submit, shows errors in place, refreshes the page behind it, and never opens twice or stacks by a double click.
- **Visual and layout audit** (see step 3a for how to measure it): scrollbars (present only when content overflows, on the right element, no double or page-level scrollbars, no horizontal scroll at supported widths, scroll position kept after actions), spacing and alignment, text truncation and wrapping with ellipsis and tooltip, overlap and clipping (menus and modals cut off by a container or the viewport), z-index, sticky headers, and consistent fonts, colours, icon sizes and border radius against the sibling screens.
- **Units, formats and values**: currency symbol and separators, decimals, percentages, area and length units (a value like `5005` with no unit is a finding), dates and time zones, empty and null display (`-` or blank, never `null`, `undefined`, `NaN` or `Invalid Date`), `01 Jan 1970` default dates, number alignment, and long values. Compare what the tile or grid shows against the API value.
- **Sizes and states of controls**: button, icon, input and tab height, width and tap-target size are consistent with the design system; hover, focus, active, disabled and loading states; keyboard operation (Tab order, Enter, Escape, arrow keys in menus); and accessible names on icon-only buttons.
- **Responsive and theme**: the supported viewport widths (at least desktop and a narrow laptop width), collapsed and expanded side panels, zoom to 125 and 150 percent, and any theme the app offers.
- **Existing issues sweep**: while the feature is open, record every defect you meet on the screen, whether or not the change caused it: console errors and warnings, failed or slow network requests, misaligned or clipped elements, broken links, modals that fail to open, wrong data. Report them all, marked as existing or new.
- **API checks**: every endpoint the feature calls, tested directly through the project's API helpers: status codes, response shape and fields, correct data for the request, filtering, sorting and paging parameters, and the error responses the code has (400, 401, 403, 404, 409, 500). Check that each UI action sends the expected request (wait on it with `page.waitForResponse`) and that the UI reflects the response.
- **Data validation**: every validation rule found in the UI and the backend: required fields, formats, min and max length, numeric ranges, dates, uniqueness and duplicates, allowed values, special characters, leading and trailing spaces, and that invalid input is rejected both in the UI and by the API when called directly. Persistence: what the UI shows after reload matches what the API returns and what was saved.
- **User roles**: where the feature or its endpoints check roles or permissions, cases for each role the setup can sign in as: what each role can see and do, and that a forbidden action is hidden or disabled in the UI and refused by the API. Skip this category only when the code enforces no roles, and say so under the table.
- **Edge cases**: empty lists, a single item, large values and long text, maximum page sizes, paging boundaries, zero and negative numbers, unicode, rapid repeated clicks or double submit, cancel and back navigation mid-flow, concurrent edits where the code handles them, and stale data after another change.
- **End-to-end flows**: full user journeys across the feature, from creating data through editing and viewing it to deleting it, checking the UI, API and saved data at each step.
- **Affected areas**: every other feature, page, report, export or endpoint found in step 1 that reads or changes the same data, or shares the changed components and services. Check that each still works and shows the change correctly (regression cases).
- **Cleanup**: every record the suite creates is removed.

Group the cases into `describe` groups, at least one per category, and give each case an id, following the existing convention (for example `A. API - ...` with ids `A1`, `A2`). Include only cases the code supports. Note anything you can't test, such as missing data, a role you can't access, or an external dependency, as a coverage gap rather than a case.

### 3a. Live UI audit in Claude in Chrome

Playwright asserts what you thought of; a real look finds what you did not. When the Claude in Chrome tools are available (load them with ToolSearch if deferred: tabs, navigate, read_page, computer, javascript_tool, read_console_messages, read_network_requests, resize_window), open the feature in the user's already signed-in browser and audit it before and while you design the cases. If they are not available, use Playwright screenshots and `page.evaluate` for the same checks, and say so under the case table. Never type a password, and never sign in for the user.

Delegate the walk to the `ui-auditor` agent when it is available (`subagent_type: "ztest:ui-auditor"`): give it the feature, URL, control inventory, scope map, QA patterns path and role, and keep only its findings in your context. For a large feature, send one agent per screen group, in parallel. If it is unavailable, do the walk yourself as below. Walk the **control inventory** from step 1 on the live page. For every control and menu item: click it, read the result, screenshot it, and note the state. Specifically:
- Open every menu and sub-menu, then each item, and record what happens (modal, page, request, nothing).
- Measure with `javascript_tool` instead of judging by eye: `scrollHeight` against `clientHeight` and `scrollWidth` against `clientWidth` for every scroll container (scrollbar needed and shown, no nested or duplicate bars), `getBoundingClientRect` for button and icon sizes, `getComputedStyle` for font, colour, spacing, overflow and z-index, and text-overflow for clipped labels.
- Check the visible value of each field and its unit against the API response.
- Read the console and the network log for errors, failed requests and slow calls.
- Resize to the supported widths and zoom levels and recheck.
- Compare against a sibling screen of the same app for style consistency.

Write each finding with a QA-style title (`<Module> - <View> - <Screen> - <Menu> - <issue>`), the preconditions (record type, field types, role, data state) and steps, so it can be pasted straight into Azure DevOps. Every defect found goes into the report as a finding (`kind: "ui"`, or `app`/`data`/`perf` when it fits better) with a screenshot reference, steps, expected and actual. For each defect and each verified behaviour, add a case to the table, so the suite keeps guarding it. Use the real values you read to write exact assertions, and never assert a bug as correct behaviour.

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
