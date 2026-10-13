---
description: Run Playwright E2E tests for a feature, group or case, diagnose and fix test defects, rerun, and produce a PDF report
argument-hint: <feature | group | case-id> [--headed] [--no-fix] [--no-report]
---

# Playwright E2E run

Target: `$ARGUMENTS`

Run the requested Playwright tests, diagnose every failure from real evidence, fix only genuine test defects, rerun, and write a PDF report. Follow the project's `CLAUDE.md` if it has one. Never fabricate a result: a test that did not run is **Not Run** or **Blocked**, never Passed.

## 0. Locate the project

- **Workspace root**: the current working directory, the folder Claude Code was opened in. It may hold several repos (for example `frontend/` and `backend/`); search all of them. Never write reports inside a single sub-repo unless the workspace root is that repo.
- **Playwright dir**: the folder that holds `playwright.config.{ts,js,mjs,cjs}`. Find it with Glob `**/playwright.config.*`, excluding `node_modules`. If there are several, ask which one to use. If there are none, stop and say that this repo has no Playwright setup.
- **Reports dir**: `C:\zOne Test Reports\` (on macOS or Linux, `~/zOne Test Reports/`). Create it if it is missing. The path contains spaces, so always quote it.

All the commands below run in the Playwright dir.

## 1. Parse the target

From `$ARGUMENTS`:
- `--headed` → add `--headed` to every Playwright command.
- `--no-fix` → diagnose and report only; edit no test.
- `--no-report` → skip the PDF.
- The rest is the target. It may be:
  - **Feature**: a Playwright project or test-folder name, or a plain phrase that you match to one.
  - **Group**: a `test.describe` title or its prefix (`A. API - columns`, `group A`), or a spec file.
  - **Case**: a case id such as `A1` or `F-9`, or part of a test title.

If the target is empty or matches nothing, list the projects and their groups and stop. If it matches more than one project or group, name the matches and ask which one before running.

## 2. Inspect before running

Read, do not assume:
- The Playwright config: projects, `testDir`, `retries`, reporters, `baseURL`, `webServer`, setup-project `dependencies`, and trace and screenshot settings.
- The target folder's specs, helpers, fixtures and any cleanup spec.
- The auth or setup project that the target depends on, if there is one.
- Existing case ids and `test.describe` titles, so the filter is exact.

Build the narrowest command. Playwright matches `--grep` against the full title path, so anchor case ids to the title format the suite uses:

```bash
npx playwright test --project=<project> --grep "(^| )A1 - "
npx playwright test --project=<project> --grep "A\. API"
npx playwright test --project=<project> <path/to/spec>
npx playwright test --project=<project>
```

If the config has no projects, drop `--project`. Before running, confirm with `--list` that the filter selects exactly the intended tests. Report that count as the **planned** total.

## 3. Environment and auth prerequisites

- The app must be reachable at the config's `baseURL`, unless the config's `webServer` starts it. If it is not reachable, stop and report an **environment** blocker. Do not start or alter servers on your own.
- Read the auth setup to learn what it needs: a saved storage-state file, environment variables or a seeded user. **Never type, print or ask for a password.** If a new sign-in is needed, name the variables the setup reads and ask the user to set them in their own shell and rerun.
- Use the project's own API and session helpers (token refresh, headers, shared context) when they exist. Do not open extra browser contexts on one storage state, and do not add retries to projects with `retries: 0`, if the suite's comments or helpers show that this breaks the session.
- Assume a shared database changes during a run. Do not assert exact counts across calls.
- Never run destructive tests against data you were not told is disposable. Never write to the database directly.

## 4. Execute

Run the command from step 2, adding `--headed` if requested. Add `--reporter=list,html,json` and set `PLAYWRIGHT_JSON_OUTPUT_NAME=<reports dir>/<project>-e2e-run.json`. In bash, prefix the command with the variable. In PowerShell, set `$env:PLAYWRIGHT_JSON_OUTPUT_NAME` first. The CLI flag replaces the config's reporters, so `html` must be listed again. The JSON stays outside `test-results/`, which Playwright clears at the start of each run. Long suites can take many minutes, so run them in the background and wait for completion; do not poll with sleeps.

Take status, duration and error from the JSON. Map Playwright statuses as follows: `passed` → Passed, `failed`/`timedOut` → Failed, `skipped` (with its annotation or reason) → Skipped, not started because a dependency failed (for example an auth setup) → Blocked, and not reached → Not Run. Keep this first-run result as **Initial**.

## 5. Diagnose every failure from evidence

For each failed test, read its error and stack. Then read `test-results/<test>/error-context.md`, the failure screenshot (open it with Read), and the trace when one exists. Read the spec code and the application code it exercises, then classify it as exactly one of these:

| Class | Meaning | Action |
| --- | --- | --- |
| Application defect | The app behaves differently from the requirement or code intent | Do **not** change the test to pass. Record evidence, steps, expected and actual results, and impact. |
| Test defect | Wrong selector, assertion, wait, setup or teardown | Fix it (step 6). |
| Test data issue | The data the test needs is missing or changed | Make discovery dynamic, or skip with a stated reason. Never hard-code values to pass. |
| Environment issue | The server is down, auth expired, a timeout comes from infrastructure, or a dependency is missing | Mark the test Blocked and document it. |
| Flaky | The test passes and fails with no change | Find the race and fix it. No arbitrary `waitForTimeout`. |

If the evidence is insufficient, say "unconfirmed". Do not guess a class.

**Security:** `error-context.md` and traces can contain bearer tokens and cookies. Never copy them into chat, the report or a file.

## 6. Fix test defects (unless `--no-fix`)

- Make the smallest change in the spec or helper that fixes the real cause. Reuse the existing helpers and keep the folder's conventions.
- Never weaken an assertion, broaden a tolerance, add `test.skip`/`fixme`, or raise a timeout to hide an application defect.
- Never edit application code from this command. Report application defects instead.
- Record each fix with the file and line, the cause, the change, and why it was needed.

## 7. Rerun

Rerun the fixed tests first, then the rest of their `describe` group and every other case that uses the changed helper. Keep this as **Final**. The report must show both Initial and Final results. A case only counts as passed if it passed in a run you executed in this session.

## 8. PDF report (unless `--no-report`)

Write a self-contained HTML file in your scratchpad: inline CSS, no external fonts or scripts, A4 width, `thead { display: table-header-group }`, and `tr { break-inside: avoid }`. Use green for Passed, amber for Skipped, red for Failed, and grey for Blocked or Not Run. Then render it from the Playwright dir:

```bash
node "${CLAUDE_PLUGIN_ROOT}/scripts/html-to-pdf.mjs" <report.html> "<reports dir>/<Feature-Name>-Test-Report.pdf"
```

If `${CLAUDE_PLUGIN_ROOT}` is not expanded, find the script with Glob `**/zone-playwright-test/**/scripts/html-to-pdf.mjs` under `~/.claude/plugins/`.

Sections:
1. **Executive summary**: the title, feature, date, scope, suite path, project, workers, headed or headless mode, and the measured duration. Show cards for Passed, Skipped, Failed, Blocked and Verified, then a short narrative (initial failures → fixes → reruns → final state), and start the case table (Case | What It Checks | Result | Time).
2. **Grouped case results**: one section per `describe` group. Every case keeps its own row, and each skip reason appears directly beneath its case.
3. **Findings**: confirmed application defects, data inconsistencies and performance problems. Give each one evidence, observed and expected behaviour, impact, and reproduction steps. List test defects separately. Do not include speculation.
4. **Run data**: environment and base URL, user or role (no secrets), the data discovered or created, cleanup, and settings touched or restored.
5. **Test fixes**: each fix from step 6.
6. **Coverage gaps**: skipped scenarios, unavailable data, untested paths and environment limits.
7. **Rerun instructions**: the exact commands you actually ran, the working directory, the auth prerequisites, and the artifact paths (`playwright-report/index.html`, `test-results/`).

Every number must come from the JSON results. If any planned case was not executed, title the report **PRELIMINARY**.

## 9. Final response

Report the target and its groups, the commands you ran, and the Initial and Final counts (planned, passed, failed, skipped, blocked and not run). Then list the fixes made, the application defects, any open blockers, and the paths to the PDF, the HTML report and the results JSON. If the project's `CLAUDE.md` defines a response format, use it. State plainly anything not executed or not verified.
