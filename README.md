<h1><img src="zone-test/assets/logo.png" alt="zOne logo" width="40" height="40" align="top"> zOne Playground</h1>

AI tools for zOne workflows that make your code more powerful.

This is a growing set of Claude Code plugins that take the busywork out of the day: testing, doc preparation, debugging, code refactoring and more. You describe what you need. The tools read the actual code, do the work, and show you the evidence, so you spend your time on decisions instead of chores.

| Plugin | What it does |
| --- | --- |
| **zOne Test (Playwright)** | Designs, writes, runs and fixes Playwright E2E suites, and produces a PDF report |
| **zOffice** | Drafts your zOffice time sheet from the day's Claude Code sessions, posts it, and shows the hours still needed |
| **zWork** | Lists your Azure DevOps bugs, tasks and PRs by state, reviews PRs and work items against the code, and plans and fixes bugs by ID |
| **zDev** | Rebuilds the backend and copies the module DLLs into the local frontend in one command |
| *More coming* | Doc preparation, debugging, refactoring |

---

# zOne Test (Playwright)

A Claude Code plugin with three commands for QA and Playwright E2E testing:

- `/zone-test:qa` takes a feature or files, has a team of tester agents read the code edge to edge, reports functional, data, security and UI bugs by severity, then plans and fixes them after you confirm. It runs nothing.
- `/zone-test:feature` takes a feature description, studies the code, designs end-to-end cases, writes the suite, runs it, fixes test defects and produces a PDF report.
- `/zone-test:e2e` runs an existing suite, group or case, diagnoses every failure from real Playwright evidence, fixes genuine test defects, reruns, and produces a PDF report.

They work in any project that has a `playwright.config.*`. Open Claude Code at the top of the project. If the frontend and backend are separate repos, open the folder that holds both, so the commands can trace the feature across them.

## Install

From any Claude Code session:

```
/plugin marketplace add https://github.com/theab10hd/zone-playground.git
/plugin install zone-test@zone-playground
```

You can also add the marketplace in the desktop app under **Plugins**. Restart Claude Code, or run `/reload-plugins`, to pick up the commands.

To try it for one session without installing, clone the repo and run:

```bash
claude --plugin-dir <path-to-clone>/zone-test
```

## Prerequisites

- The app under test is reachable at the config's `baseURL`, or the config's `webServer` starts it.
- `npm install` has been run in the Playwright folder, so `@playwright/test` and its Chromium are present. The PDF is rendered with that Chromium, and the plugin adds no dependency.
- Auth: the commands find the login your setup project already uses (credentials hardcoded in the setup or fixtures, `.env` files, environment variables, or a saved storage-state file) and run the auth setup themselves before the tests, without asking. They ask only when no login is available anywhere, and never print a password or token.
- Optional: [graphify](https://github.com/deadmade/dead-claude-skills) with a built `graphify-out/graph.json` at the workspace root. It makes the feature-discovery step faster. Without it, the plugin falls back to code search.

## Usage

### QA review: find the bugs before writing tests

```
/zone-test:qa <feature name or file paths> [docs: <PRD / TRD / spec paths>]
```

- `/zone-test:qa lease region district filter docs: specs/region-filter-prd.md`

1. It reads `CLAUDE.md`, the engineering guide, recent git changes to the feature, and any PRD, TRD or spec you give it.
2. It maps the feature edge to edge, plus every caller of the code it changes, into a scope map of files.
3. It asks you about any behaviour the code and docs leave unclear.
4. A team of tester agents reviews every file in scope in parallel, each through one lens: functional logic, data and API, security and permissions, UI and style (overlap, clipping, broken text, states), edge cases and concurrency, and regression and Playwright readiness. Nothing is run.
5. As senior QA it confirms each finding in the code, drops false positives, merges duplicates to their root cause, assigns severity, and sends testers back to any file left unread.
6. It posts the bugs grouped by severity (Bug, Severity, Areas Involved, How to Reproduce / Verify) and saves them to `C:\zOne Test Reports\<Feature-Name>-QA-Report.md`.
7. It asks whether to fix them, posts a plan with each bug, its fix and the files changed, and applies it only after you reply go. It then runs the project's typecheck, lint, build or unit tests, re-reviews the changed files, and marks each bug fixed or not.

### New feature: study the code, write the suite, run it and report

```
/zone-test:feature [manual] <feature name and details> [--headed] [--no-report]
```

Examples:
- `/zone-test:feature lease region district filter - users pick region then district, grid and export follow the filter`: designs the cases, shows them, then runs the auth setup and writes and runs them without stopping.
- `/zone-test:feature manual lease region district filter only 10 cases`: designs 10 cases and waits for your go-ahead.

1. It finds the feature's code with graphify (if a graph exists), or with Grep and parallel Explore agents, and maps the UI, API, data and permission layers.
2. It reviews the current Playwright setup: config, auth, and the nearest existing suites and helpers.
3. It designs thorough end-to-end cases: UI checks, API checks, data validation, user roles (where the feature enforces them), edge cases, full end-to-end flows, other affected areas, and cleanup. Expect many cases; it keeps to any limit you give, such as "only 10 cases". It posts them in chat as a table.
   - **Default (auto):** it shows the table and carries on without asking.
   - **`manual` as the first word:** it stops and waits. Reply **go** to continue, or ask it to add, remove or change cases. It posts the revised table and asks again. Nothing is written or run until you confirm.
4. It writes the suite in the repo's conventions, registers the project in the Playwright config if projects are used, and typechecks.
5. It runs, diagnoses, fixes and reruns the tests, and writes the PDF by following the `e2e` command below. The PDF also contains the feature map and the designed case list.

### Existing suite: run, fix and report

```
/zone-test:e2e <feature | group | case-id> [--headed] [--no-fix] [--no-report]
```

| Example | Runs |
| --- | --- |
| `/zone-test:e2e condition-region-district` | The whole `condition-region-district` project |
| `/zone-test:e2e lease region district --headed` | The matching project, in headed mode |
| `/zone-test:e2e condition-region-district group A` | Only `test.describe('A. ...')` |
| `/zone-test:e2e projects-region-district 03-edit-project-sites` | One spec file |
| `/zone-test:e2e building-advanced-search F-9 --no-fix` | One case, diagnosed but not changed |
| `/zone-test:e2e maphub --no-report` | Run, diagnose and fix, with no PDF |

1. It finds the Playwright config, then resolves the target to a project and an exact `--grep` or file filter, and checks the selection with `--list`.
2. It confirms the app is reachable, finds the hardcoded or saved login, and runs the auth setup itself. It stops only if the app is down or no login is available.
3. It picks the fastest safe worker count (see below), runs the tests with list, HTML and JSON reporters, and posts a live line as each test passes, is skipped or fails, with a running tally. The final counts come only from the JSON.
4. It classifies each failure as an application defect, test defect, test data issue, environment issue or flaky test, using the error, `error-context.md`, screenshots and the code under test.
5. It fixes test defects with minimal edits. It never weakens assertions, adds skips or edits application code to hide a defect.
6. It reruns the fixed cases, their group and every case that shares a changed helper, and keeps the Initial and Final results separate.
7. It writes the report data as JSON, and the plugin's renderer turns it into the PDF: executive summary, grouped case results, findings, run data, test fixes, coverage gaps and rerun instructions. Every report uses the same fixed design. The renderer rejects incomplete data and adds PRELIMINARY to the title by itself if any planned case did not run.

### Workers

Before each run, the command checks whether the selected tests can safely run in parallel. It raises `--workers` only when it finds no side effects: no serial groups, no state shared between tests, and no shared settings or records that one test changes and another reads. It also checks that parallel tests can't sign each other out by sharing one session. When in doubt it uses 1 worker, and the report states the worker count and why it was chosen.

## Outputs

- `C:\zOne Test Reports\<Feature-Name>-Test-Report.pdf` (on macOS or Linux, `~/zOne Test Reports/`)
- Working files (the Playwright results JSON for each run and the report data) stay in Claude's scratchpad or the system temp folder, under `zone-test/<project>/`. Only the PDF goes to `C:\zOne Test Reports\`.
- `<playwright folder>/playwright-report/index.html`
- `<playwright folder>/test-results/`: screenshots, traces and error context. These can contain tokens, so do not share them.

## Report format

Every PDF comes from [`scripts/render-report.mjs`](zone-test/scripts/render-report.mjs), which holds the one design. [`scripts/sample-report.json`](zone-test/scripts/sample-report.json) shows the data format. To change how every report looks, edit the renderer; never edit individual reports.

---

# zOffice

A Claude Code plugin that turns the day's Claude Code sessions into zOffice time sheet entries, posts them to the Daily Activities page, and tells you how many hours you still need.

## Install

```
/plugin marketplace add https://github.com/theab10hd/zone-playground.git
/plugin install zoffice@zone-playground
```

The posting script drives your installed Google Chrome through `playwright-core`. The command installs that package into the plugin's `scripts` folder the first time; no browser is downloaded.

## Setup (once)

Set your zOffice sign-in as environment variables; the posting script reads credentials from nowhere else and rejects extra arguments. In PowerShell, then open a new terminal:

```powershell
setx ZOFFICE_USERNAME "<username>"
setx ZOFFICE_PASSWORD "<password>"
```

On macOS or Linux, add `export ZOFFICE_USERNAME=...` and `export ZOFFICE_PASSWORD=...` to your shell profile.

Company-specific values live only on your machine, in `~/.zone-work-log/config.json`. The plugin itself holds no portal address, project list or client names.

1. Run `/zoffice:log`. It asks for your zOffice URL (the address before `/Account/Login`) and writes the config.
2. In your own terminal, save the dropdown options you can pick in zOffice:
   ```bash
   node "<plugin>/scripts/post-timesheet.mjs" --save-options
   ```
   It signs in and records every project with its modules and activities.
3. Optional: if you run the command without a project name, it asks which kind of work goes to which project, and which project is the default, and saves the answers as rules.

```json
{
  "baseUrl": "https://<host>/zOffice",
  "defaultProject": "<project label>",
  "projectRules": ["<kind of work> -> <project label>"],
  "options": { "<project label>": { "modules": ["..."], "activities": ["..."] } }
}
```

## Usage

```
/zoffice:log <project name> [YYYY-MM-DD]
```

For example `/zoffice:log acme` for a project named "zOne Acme". The project name can be partial, as long as it matches one project in your saved options.

Add `--break <from>-<to>` for each break, for example `/zoffice:log acme --break 1:00 PM-1:45 PM`. 12- and 24-hour times both work (`1pm-1:45pm`, `13:00-13:45`), and the flag can repeat. No entry is filed during a break: work that spans one is split into before and after. zOffice has no break activity and counts only filed entries as hours, so the break is never posted. It shows as its own row in the table for review.

Add `--start <time>` with the time you arrived and started working, for example `/zoffice:log acme --start 9:15 AM --break 12:30 PM-1:00 PM`. Sessions only show when Claude was in use, so without it the day starts at your first session. With it, the first entry starts at that time, and work before the first session counts toward that entry. A start later than your first session trims the entries before it. Times without AM/PM read 7–11 as AM and 12 and 1–6 as PM.

Add `--wfh` to tick **Work From Home** on every entry, for example `/zoffice:log acme --start 9:15 AM --wfh`.

1. It reads that day's sessions from `~/.claude/projects/` (today by default): each session's title, folder, active time blocks (a pause of 20+ minutes starts a new block) and your prompts with their times.
2. It drafts entries from those blocks, with times rounded to 5 minutes and parallel sessions merged into one slot so nothing overlaps. Entries run back to back: a pause between sessions is added to the entry before it, so the only gaps are your `--break` times. It picks each entry's module and activity itself from what you worked on, using only the labels zOffice offers for that project.
3. It lists the entries in chat as a numbered table, with today's and this week's total work time against the 6-hour and 40-hour minimums (the week counts only days logged with this command), plus every activity the project offers, so you can swap one by number ("3 → Review"). It waits for you to confirm or edit.
4. Only after you confirm, it saves the entries to `~/.zone-work-log/entries/<date>.json` and gives you the command to post them. With no file argument the script posts today's file, so the command is the same every day:
   ```bash
   node "<plugin>/scripts/post-timesheet.mjs" --headed
   ```
   `--headed` shows the browser.

The script signs in, opens **Time Sheet**, fills and submits each entry and prints `ADDED` or `FAILED` for it. A failure, such as a time the server rejects as overlapping, does not stop the rest. At the end it prints your filed hours against the minimums, from zOffice's own Time Effort and Weekly Effort, so entries you added by hand count too:

```
Today: 4h 15m filed of 6h 00m minimum - 1h 45m more needed
This week: 9h 00m filed of 40h 00m minimum - 31h 00m more needed
```

## Clear today's time sheet

```
/zoffice:clear
```

It gives you the command to delete every entry on today's zOffice page, including ones you added by hand:

```bash
node "<plugin>/scripts/post-timesheet.mjs" --clear --headed
```

The script signs in and deletes today's entries one by one straight away, with no prompt, printing each one it removes. It stops at the first row that fails. Deleting cannot be undone. Today's entries file is kept, so you can post the same entries again with the normal command.

## Credentials and limits

- You run the posting script yourself, and it reads your sign-in only from `ZOFFICE_USERNAME` and `ZOFFICE_PASSWORD`. Claude never asks for, stores or types your password. `setx` keeps the values in your Windows user environment in plain text, so only use it on your own account. Don't pass credentials to the slash command: anything typed into chat stays in the transcript.
- Entries are posted to today's page only. For another date, the command writes the file, and you add those entries by hand.
- The minimums (6 hours a day, 40 hours a week) are constants at the top of `post-timesheet.mjs`.

---

# zWork

A Claude Code plugin for day-to-day Azure DevOps work on `https://devops.zlinkcorp.com/tfs/zOne`: see what is on your plate, understand a bug from the code, review a PR, and plan and fix bugs and tasks by ID.

## Install

```
/plugin marketplace add https://github.com/theab10hd/zone-playground.git
/plugin install zwork@zone-playground
```

## Setup (once)

Run `/zwork:init`. It checks the MCP server, your token, the network path to the server, your identity and the token's permissions, prints the exact steps to fix anything that fails, and shows how to use every command. The steps are:

1. Create a Personal Access Token at `https://devops.zlinkcorp.com/tfs/zOne/_usersSettings/tokens` with these scopes:

   | Scope | Access | Why |
   | --- | --- | --- |
   | Work Items | Read & write | list, review and plan bugs and tasks; comment and change state when you approve |
   | Code | Read & write | list and review PRs, post review comments, create PRs |
   | Build | Read | show PR build and policy status |
   | Project and Team | Read | find the project and its repositories |

2. Save it in your environment (PowerShell, then reopen the terminal and Claude Code):
   ```powershell
   setx AZURE_DEVOPS_PAT "<your token>"
   ```
3. Add the [`@tiberriver256/mcp-server-azure-devops`](https://github.com/Tiberriver256/mcp-server-azure-devops) server (Node.js 18+; on macOS/Linux end with `-- npx -y @tiberriver256/mcp-server-azure-devops`):
   ```bash
   claude mcp add azure-devops --scope user -e AZURE_DEVOPS_ORG_URL=https://devops.zlinkcorp.com/tfs/zOne -e AZURE_DEVOPS_AUTH_METHOD=pat -e "AZURE_DEVOPS_DEFAULT_PROJECT=zOne v1.1" -- cmd /c npx -y @tiberriver256/mcp-server-azure-devops
   ```
4. Restart Claude Code and run `/zwork:init` again.

## Commands

Every command takes the same arguments:

| Argument | Meaning |
| --- | --- |
| `--bug`, `--task`, `--pr` | Type. Numbers after it are ids of that type: `--bug 18923 12333`. No type flag means all types. |
| `--new`, `--active`, `--resolved` | State filter for `review` and `plan`. Combine freely. |
| `--days N` | How far back "resolved" looks for closed items and completed PRs (default 7). |

| Command | What it does |
| --- | --- |
| `/zwork:init` | Checks the connection and token permissions, and shows the setup steps |
| `/zwork:help` | Every command with examples |
| `/zwork:status` | Dashboard: counts by state, the 5 things to do next, and what changed since yesterday |
| `/zwork:new [--bug] [--task] [--pr]` | Your work not started yet, and PRs waiting for your review |
| `/zwork:active [--bug] [--task] [--pr]` | Your work in progress, and your open PRs |
| `/zwork:resolved [--bug] [--task] [--pr] [--days N]` | Your finished work, plus items closed and PRs completed in the last N days |
| `/zwork:review --bug 18923 12333` | Explains each bug from the code: root cause with file links, impact, confidence and open questions |
| `/zwork:review --bug --new` | The same for every new bug assigned to you |
| `/zwork:review --pr 8590` | Reviews a PR: scope, affected areas, bugs it can produce, issues and a verdict; posts comments only if you say yes |
| `/zwork:review --pr --new` | Reviews every PR waiting for your vote |
| `/zwork:plan --bug 18923 12333` | Plans the fix for only those bugs |
| `/zwork:plan --bug --new` | Plans every new bug assigned to you |
| `/zwork:pr [--target <branch>]` | Opens a PR for the current branch, linked to the work items in its name and commits |

### How `plan` works

1. It investigates the items one by one and writes a plan for each to `.zwork/plans/<date>-<selection>.md` in your workspace (kept out of git through `.git/info/exclude`), posting progress as it goes: problem, root cause with file links, fix, risk, how to verify, size and branch name.
2. It shows the whole plan and waits. Reply **go**, **go 18923**, **skip 12333**, or ask for changes. Add `auto` to the command to skip this wait.
3. It fixes each item on its own branch (`bugfix/<id>-<slug>` or `task/<id>-<slug>`), runs the repo's checks, and asks to commit with `Fix #<id>: <title>` before moving to the next item.
4. At the end it offers to open PRs and to resolve the items in DevOps with a comment, each only after you say yes.

Work item states differ per type: bugs use New / Active / Resolved / Closed, while tasks use custom states such as *Task Ready for Testing*. zWork sorts each item into new, active or resolved by its actual state and tells you when it had to judge an unfamiliar one.

Open Claude Code in the folder that holds the repositories you work on, so `review` and `plan` can read the code.

## Safety

- `init`, `help`, `status`, `new`, `active`, `resolved` and `review` are read-only (`review --pr` posts comments only after your yes). Commits, pushes, PRs, work item comments and state changes each happen only after you see exactly what will be written and say yes.
- zWork never asks for, stores or prints your PAT.

---

# zDev

A Claude Code plugin for running the zOne app locally.

- `/zdev:copydll [zOne folder]` stops every running frontend (`dotnet run`, `dotnet watch` or the built exe, wherever it was started), builds the backend solution, runs `backend\zLink.References\CopyDll.bat`, copies every `.dll` from `C:\zOneDlls` into `frontend\bin\Debug\net7.0`, then tells you it is done and shows a Windows notification "Copy Dll Done".

With no folder it finds the checkout that holds `zLink.References\CopyDll.bat`: up from the current folder, then `D:\zOne`, then every drive.

## Install

```
/plugin marketplace add https://github.com/theab10hd/zone-playground.git
/plugin install zdev@zone-playground
```

## Notes

- Windows only. It needs the .NET SDK on the path.
- Start the frontend again after it finishes.
