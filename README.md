# zOne Playground

AI tools for zOne workflows that make your code more powerful.

This is a growing set of Claude Code plugins that take the busywork out of the day: testing, doc preparation, debugging, code refactoring and more. You describe what you need. The tools read the actual code, do the work, and show you the evidence, so you spend your time on decisions instead of chores.

| Plugin | What it does |
| --- | --- |
| **zOne Playwright Test** | Designs, writes, runs and fixes Playwright E2E suites, and produces a PDF report |
| *More coming* | Doc preparation, debugging, refactoring |

---

# zOne Playwright Test

A Claude Code plugin with two commands for Playwright E2E testing:

- `/zone-playwright-test:feature` takes a feature description, studies the code, designs end-to-end cases, writes the suite, runs it, fixes test defects and produces a PDF report.
- `/zone-playwright-test:e2e` runs an existing suite, group or case, diagnoses every failure from real Playwright evidence, fixes genuine test defects, reruns, and produces a PDF report.

They work in any project that has a `playwright.config.*`. Open Claude Code at the top of the project. If the frontend and backend are separate repos, open the folder that holds both, so the commands can trace the feature across them.

## Install

From any Claude Code session:

```
/plugin marketplace add https://github.com/theab10hd/zone-playground.git
/plugin install zone-playwright-test@zone-playground
```

You can also add the marketplace in the desktop app under **Plugins**. Restart Claude Code, or run `/reload-plugins`, to pick up the commands.

To try it for one session without installing, clone the repo and run:

```bash
claude --plugin-dir <path-to-clone>
```

## Prerequisites

- The app under test is reachable at the config's `baseURL`, or the config's `webServer` starts it.
- `npm install` has been run in the Playwright folder, so `@playwright/test` and its Chromium are present. The PDF is rendered with that Chromium, and the plugin adds no dependency.
- Auth: whatever your setup project needs, such as a fresh storage-state file or credentials in environment variables that you set in your own shell. The commands never ask for or type a password.
- Optional: [graphify](https://github.com/deadmade/dead-claude-skills) with a built `graphify-out/graph.json` at the workspace root. It makes the feature-discovery step faster. Without it, the plugin falls back to code search.

## Usage

### New feature: study the code, write the suite, run it and report

```
/zone-playwright-test:feature [auto] <feature name and details> [--headed] [--no-report]
```

Examples:
- `/zone-playwright-test:feature lease region district filter - users pick region then district, grid and export follow the filter`: designs the cases and waits for your go-ahead.
- `/zone-playwright-test:feature auto lease region district filter only 10 cases`: designs 10 cases, shows them, then writes and runs them without stopping.

1. It finds the feature's code with graphify (if a graph exists), or with Grep and parallel Explore agents, and maps the UI, API, data and permission layers.
2. It reviews the current Playwright setup: config, auth, and the nearest existing suites and helpers.
3. It designs end-to-end cases (happy path, validation, boundaries, roles, persistence, cross-feature effects and cleanup), keeping to any limit you give, such as "only 10 cases". It posts them in chat as a table.
   - **Default:** it stops and waits. Reply **go** to continue, or ask it to add, remove or change cases. It posts the revised table and asks again. Nothing is written or run until you confirm.
   - **`auto` as the first word:** it shows the table and carries on without asking.
4. It writes the suite in the repo's conventions, registers the project in the Playwright config if projects are used, and typechecks.
5. It runs, diagnoses, fixes and reruns the tests, and writes the PDF by following the `e2e` command below. The PDF also contains the feature map and the designed case list.

### Existing suite: run, fix and report

```
/zone-playwright-test:e2e <feature | group | case-id> [--headed] [--no-fix] [--no-report]
```

| Example | Runs |
| --- | --- |
| `/zone-playwright-test:e2e condition-region-district` | The whole `condition-region-district` project |
| `/zone-playwright-test:e2e lease region district --headed` | The matching project, in headed mode |
| `/zone-playwright-test:e2e condition-region-district group A` | Only `test.describe('A. ...')` |
| `/zone-playwright-test:e2e projects-region-district 03-edit-project-sites` | One spec file |
| `/zone-playwright-test:e2e building-advanced-search F-9 --no-fix` | One case, diagnosed but not changed |
| `/zone-playwright-test:e2e maphub --no-report` | Run, diagnose and fix, with no PDF |

1. It finds the Playwright config, then resolves the target to a project and an exact `--grep` or file filter, and checks the selection with `--list`.
2. It confirms the app is reachable and auth is ready. If not, it reports the blocker and stops.
3. It runs the tests with list, HTML and JSON reporters, and posts a live line as each test passes, is skipped or fails, with a running tally. The final counts come only from the JSON.
4. It classifies each failure as an application defect, test defect, test data issue, environment issue or flaky test, using the error, `error-context.md`, screenshots and the code under test.
5. It fixes test defects with minimal edits. It never weakens assertions, adds skips or edits application code to hide a defect.
6. It reruns the fixed cases, their group and every case that shares a changed helper, and keeps the Initial and Final results separate.
7. It writes the report data as JSON, and the plugin's renderer turns it into the PDF: executive summary, grouped case results, findings, run data, test fixes, coverage gaps and rerun instructions. Every report uses the same fixed design. The renderer rejects incomplete data and adds PRELIMINARY to the title by itself if any planned case did not run.

## Outputs

- `C:\zOne Test Reports\<Feature-Name>-Test-Report.pdf` (on macOS or Linux, `~/zOne Test Reports/`)
- Working files (the Playwright results JSON for each run and the report data) stay in Claude's scratchpad or the system temp folder, under `zone-playwright-test/<project>/`. Only the PDF goes to `C:\zOne Test Reports\`.
- `<playwright folder>/playwright-report/index.html`
- `<playwright folder>/test-results/`: screenshots, traces and error context. These can contain tokens, so do not share them.

## Report format

Every PDF comes from [`scripts/render-report.mjs`](scripts/render-report.mjs), which holds the one design. [`scripts/sample-report.json`](scripts/sample-report.json) shows the data format. To change how every report looks, edit the renderer; never edit individual reports.
