# zone-playwright-test

A Claude Code plugin with two commands. `/zone-playwright-test:feature` goes from a feature description to a written, run and reported suite. `/zone-playwright-test:e2e` runs zOne Playwright E2E tests for a feature, group or single case. It diagnoses each failure from real Playwright evidence, fixes only genuine test defects, reruns the affected tests and their regressions, and writes a PDF report to `D:\zOne\reports\`.

Use it alongside the `zone-playwrite-test` skill: the skill **writes** new suites, and this command **runs and reports** them.

## Install

From any Claude Code session:

```
/plugin marketplace add D:/zOne/claude-plugins
/plugin install zone-playwright-test@zone-local
```

Restart Claude Code, or run `/reload-plugins`, to pick up the command.

To try it for one session without installing:

```bash
claude --plugin-dir D:/zOne/claude-plugins/zone-playwright-test
```

## Prerequisites

- The zOne app is running at `https://localhost:3000` (`baseURL` in `frontend/ClientApp/playwright.config.ts`).
- `npm install` has been run in `frontend/ClientApp`, so `@playwright/test` and its Chromium are present. The PDF is rendered with that Chromium, and the plugin adds no dependency.
- Auth: `e2e/.auth/user.json` is fresh, or you have set `E2E_USERNAME` and `E2E_PASSWORD` in your own shell. The command never asks for or types a password.

## Usage

### New feature: study the code, write the suite, run it and report

```
/zone-playwright-test:feature <feature name and details> [--headed] [--no-report]
```

Example: `/zone-playwright-test:feature lease region district filter - users pick region then district, grid and export follow the filter`

1. It finds the feature's code with graphify (when `D:\zOne\graphify-out\graph.json` exists), or with Grep and parallel Explore agents, and maps the UI, API, data and permission layers.
2. It reviews the current Playwright setup: config, auth, and the nearest existing suites and helpers.
3. It designs end-to-end cases (happy path, validation, boundaries, roles, persistence, cross-feature effects and cleanup), shows them as a table, and then continues.
4. It writes the suite in the repo's conventions, adds the project to `playwright.config.ts`, and typechecks.
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

## What it does

1. It resolves the target to a project and an exact `--grep` or file filter, then checks the selection with `--list`.
2. It confirms the app is reachable and auth is ready. If not, it reports the blocker and stops.
3. It runs the tests with list, HTML and JSON reporters. Counts come only from the JSON.
4. It classifies each failure as an application defect, test defect, test data issue, environment issue or flaky test, using the error, `error-context.md`, screenshots and the code under test.
5. It fixes test defects with minimal edits. It never weakens assertions, adds skips or edits application code to hide a defect.
6. It reruns the fixed cases, their group and every case that shares a changed helper, and keeps the Initial and Final results separate.
7. It writes the PDF in the reference structure: executive summary, grouped case results, findings, run data, test fixes, coverage gaps and rerun instructions. If any planned case did not run, the report is titled PRELIMINARY.

## Outputs

- `D:\zOne\reports\<Feature-Name>-Test-Report.pdf`
- `frontend/ClientApp/playwright-report/index.html`
- `D:\zOne\reports\<project>-e2e-run.json`: the raw results that every count in the report comes from
- `frontend/ClientApp/test-results/`: screenshots, traces and error context. These can contain tokens, so do not share them.
