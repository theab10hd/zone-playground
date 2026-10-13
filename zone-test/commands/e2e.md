---
description: "zOne app - run Playwright E2E tests for a feature, group or case, diagnose and fix test defects, rerun, and produce a PDF report"
argument-hint: "<feature | group | case-id> [--headed] [--no-fix] [--no-report]"
---

# Playwright E2E run

Target: `$ARGUMENTS`

Run the requested Playwright tests, diagnose every failure from real evidence, fix only genuine test defects, rerun, and write a PDF report. Follow the project's `CLAUDE.md` if it has one. Never fabricate a result: a test that did not run is **Not Run** or **Blocked**, never Passed.

## 0. Locate the project

- **Workspace root**: the current working directory, the folder Claude Code was opened in. It may hold several repos (for example `frontend/` and `backend/`); search all of them. Never write reports inside a single sub-repo unless the workspace root is that repo.
- **Playwright dir**: the folder that holds `playwright.config.{ts,js,mjs,cjs}`. Find it with Glob `**/playwright.config.*`, excluding `node_modules`. If there are several, ask which one to use. If there are none, stop and say that this repo has no Playwright setup.
- **Reports dir**: `C:\zOne Test Reports\` (on macOS or Linux, `~/zOne Test Reports/`). Create it if it is missing. **Only the final PDF goes here**, never JSON or any other file. The path contains spaces, so always quote it.
- **Work dir**: `<scratchpad>/zone-test/<project>/`, using your scratchpad directory if you have one, and otherwise the system temp folder. Every intermediate file goes here: the Playwright results JSON for each run (Initial, reruns), the report data and anything else you write along the way.

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

### Choose the worker count

Run as many workers as is safe, so the run finishes fast. Decide from the code you read in step 2, not by guessing:

- **Keep 1 worker** if any of these holds for the selected tests:
  - a `test.describe.serial`, `mode: 'serial'`, or tests that depend on an earlier test's result or on shared `let` variables
  - tests that change global state another test reads, such as display settings, user preferences, feature flags, or shared records with fixed names
  - one storage state shared across workers where the session can't survive parallel use. Signs of this are single-use refresh tokens, session-refresh helpers, or comments warning about one run or one context at a time.
  - a cleanup spec that deletes data other files may still be using, or a config that sets `workers: 1` on purpose (read any comment next to it)
  - the user asked for headed mode and wants to watch one browser
- **Otherwise, go parallel.** Use `--workers=N`, where N is the smallest of: the number of spec files that are independent of each other, half the CPU cores (at least 2), and 4. If only some files are unsafe, run those in their own command with `--workers=1`, and run the rest in parallel. Never set `fullyParallel` or change the config file for speed.
- Reruns of one or two fixed tests use `--workers=1`.

State the worker count and the reason in chat before the run, and record it in the report data (`scope.workers`). If a parallel run fails in a way that a serial run would not (session lost, data collisions), classify those failures as environment or test defects caused by parallelism. Rerun them with `--workers=1`, and keep 1 worker for that suite from then on.

### Run

Run the command from step 2, with the chosen `--workers`, adding `--headed` if requested. Add `--reporter=list,html,json` and set `PLAYWRIGHT_JSON_OUTPUT_NAME=<work dir>/<project>-e2e-run.json`. In bash, prefix the command with the variable. In PowerShell, set `$env:PLAYWRIGHT_JSON_OUTPUT_NAME` first. The CLI flag replaces the config's reporters, so `html` must be listed again. The JSON stays outside `test-results/`, which Playwright clears at the start of each run. Long suites can take many minutes, so run them in the background; do not poll with sleeps.

**Live updates.** This applies to every run, including the reruns in step 7. While the tests run, watch the streamed output from the `list` reporter. Use the Monitor tool when it is available, and otherwise read the background output each time it reports progress. Post a short chat line as each test finishes:

- `✓ A1 - <title> (1.2s)` for passed, `↷ A4 - <title> (skipped: <reason>)` for skipped, and `✗ B2 - <title>` plus the first line of the error for failed.
- After every 5 finished tests, and again at the end, add a running tally: `12/40 · 9 passed · 1 skipped · 2 failed`.

The list reporter marks each test `✓` (passed), `✘` (failed) or `-` (skipped), and a test that retries shows up more than once; count only its last attempt. Use the live lines for progress only, because the final counts must still come from the JSON. Never put tokens, cookies or full stack traces in a live line.

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

Never write the report HTML yourself. The plugin's renderer holds the one fixed design, so every report looks the same. Your job is to supply the data.

1. Read `${CLAUDE_PLUGIN_ROOT}/scripts/sample-report.json`. If `${CLAUDE_PLUGIN_ROOT}` is not expanded, find it with Glob `**/zone-test/**/scripts/sample-report.json` under `~/.claude/plugins/`. It is the data format, by example. Use the same keys and no others.
2. Write `<work dir>/<Feature-Name>-report-data.json` in that format:
   - `planned` is the `--list` count. `initial` holds the Initial counts from the first run's JSON.
   - `groups` has one entry per `describe` group, and every executed test is one case row, with its **Final** result (`passed`, `skipped`, `failed`, `blocked` or `notRun`), its time and, for skipped or blocked cases, its `reason`.
   - `narrative`: initial failures → fixes → reruns → final state.
   - `findings`: confirmed items only, with `kind` set to `app`, `data`, `perf` or `test`. Fill in `evidence`, `expected`, `actual`, `impact` and `steps` wherever you have them. No speculation.
   - `runData`: environment and base URL, user or role (no secrets), data discovered or created, cleanup, and settings touched or restored.
   - `fixes`: each fix from step 6. `gaps`: skipped scenarios, unavailable data, untested paths and environment limits. `rerun`: the exact commands you ran, the working directory, auth prerequisites and artifact paths.
   - Use `[]` for an empty list; never leave a key out. Inline `code` in backticks is the only formatting supported.
3. Render it from the Playwright dir:

```bash
node "${CLAUDE_PLUGIN_ROOT}/scripts/render-report.mjs" "<work dir>/<Feature-Name>-report-data.json" "<reports dir>/<Feature-Name>-Test-Report.pdf"
```

The renderer works out the counts from the case rows, adds **PRELIMINARY** by itself when cases are fewer than `planned` or any case is `notRun`, and refuses invalid data with a list of what is wrong. If it refuses, fix the data and rerun it; never work around it by writing HTML.

Every result must come from the Playwright JSON results.

## 9. Final response

Report the target and its groups, the commands you ran, and the Initial and Final counts (planned, passed, failed, skipped, blocked and not run). Then list the fixes made, the application defects, any open blockers, and the paths to the PDF, the HTML report and the results JSON. If the project's `CLAUDE.md` defines a response format, use it. State plainly anything not executed or not verified.
