<h1><img src="zone-test/assets/logo.png" alt="zOne logo" width="40" height="40" align="top"> zOne Playground</h1>

Claude Code plugins for zOne work: plan and build features, test them, handle Azure DevOps work and fill in the time sheet. You describe what you need; the plugins read the real code, do the work and show you the evidence.

## Plugins

| Plugin | Version | What it does |
| --- | --- | --- |
| **zDev** (`zdev`) | 1.2.0 | Plans a feature with you against the real code and builds it after you approve; writes TRDs with you and exports them to DOCX; rebuilds the backend and copies the module DLLs into the local frontend |
| **zOne Test** (`zone-test`) | 3.6.1 | QA code review, then Playwright E2E tests: design, write, run, fix and report as PDF |
| **zWork** (`zwork`) | 1.0.0 | Your Azure DevOps bugs, tasks and PRs: list, review, plan, fix and open PRs |
| **zOffice** (`zoffice`) | 1.7.1 | Turns the day's Claude Code sessions into zOffice time sheet entries and posts them |

## Install

Works the same on Windows, macOS and Linux, in the terminal, the desktop app and the IDE extensions.

**1. Add the marketplace (once)**

```
/plugin marketplace add https://github.com/theab10hd/zone-playground.git
```

In the desktop app you can also add it under **Plugins**.

**2. Install the plugins you want**

```
/plugin install zdev@zone-playground
/plugin install zone-test@zone-playground
/plugin install zwork@zone-playground
/plugin install zoffice@zone-playground
```

**3. Reload** with `/reload-plugins`, or restart Claude Code. Type `/` to see the commands.

**Update** later with `/plugin marketplace update zone-playground`.

**Try without installing** (one session only):

```bash
claude --plugin-dir <path-to-clone>/zdev
```

Open Claude Code in the folder that holds your repositories (for example the one with both `frontend/` and `backend/`), so the commands can read all the code.

## Commands

### zDev

| Command | What it does |
| --- | --- |
| `/zdev:plan <feature> [files, screenshots, PDFs, Figma links]` | Plans a feature with you on Opus, read-only: reads your references and the code, shows the impact, asks the open decisions, writes a plan you review, then builds it on Sonnet or Opus only after you say go |
| `/zdev:new-trd <feature> [PRDs, old TRDs, screenshots, PDFs, DOCX, HTML walkthrough]` | Drafts a FedRAMP-aware, self-contained Technical Requirement Document on Opus from your docs, the code and the HTML walkthrough (opened in Claude in Chrome), revises it with you section by section, asks instead of guessing, and exports the accepted TRD to a styled DOCX |
| `/zdev:copydll [zOne folder]` | Stops the running frontend, builds the backend, runs `CopyDll.bat`, copies `C:\zOneDlls\*.dll` into `frontend\bin\Debug\net7.0` and notifies when done (Windows) |

Example: `/zdev:plan add a Region filter to the Lease grid, see screenshot.png`

TRD drafts and DOCX files go to `.zdev/trd/<feature>/` in your workspace. Every DOCX uses the same style (A4, narrow margins, Calibri), set once in `zdev/scripts/trd-style.mjs`.

### zOne Test

| Command | What it does |
| --- | --- |
| `/zone-test:qa <feature or files> [docs: <spec paths>]` | Agent team reads the feature's code edge to edge and reports bugs by severity; fixes them after you confirm. Runs nothing |
| `/zone-test:feature [manual] <feature and details> [--headed] [--no-report]` | Studies the code, designs E2E cases, writes the Playwright suite, runs it, fixes test defects and makes a PDF report. `manual` waits for your go before writing |
| `/zone-test:e2e <feature \| group \| case-id> [--headed] [--no-fix] [--no-report]` | Runs an existing suite, group or case, diagnoses failures, fixes test defects, reruns and makes a PDF report |

Example: `/zone-test:qa lease region district filter docs: specs/region-filter-prd.md`

Reports go to `C:\zOne Test Reports\` (`~/zOne Test Reports/` on macOS and Linux).

### zWork

| Command | What it does |
| --- | --- |
| `/zwork:init` | Checks the Azure DevOps connection and token permissions, and shows the setup steps |
| `/zwork:help` | Every command with examples |
| `/zwork:status [--days N]` | Dashboard: your work by state, what to do next, what changed since yesterday |
| `/zwork:new [--bug] [--task] [--pr]` | Work not started yet, and PRs waiting for your review |
| `/zwork:active [--bug] [--task] [--pr]` | Work in progress, and your open PRs |
| `/zwork:resolved [--bug] [--task] [--pr] [--days N]` | Finished work, and items and PRs closed in the last N days (default 7) |
| `/zwork:review [--bug [ids]] [--task [ids]] [--pr [ids]] [--new\|--active\|--resolved]` | Explains bugs and tasks from the code (root cause, impact), or reviews PRs |
| `/zwork:plan [--bug [ids]] [--task [ids]] [--new\|--active] [auto]` | Plans fixes one by one, then fixes each on its own branch after you say go |
| `/zwork:pr [--target <branch>] [--bug ids] [--task ids] [--draft] [--reviewer <name or email>]` | Opens a PR for the current branch, linked to its work items |

Example: `/zwork:plan --bug 18923 12333`

### zOffice

| Command | What it does |
| --- | --- |
| `/zoffice:log <project> [YYYY-MM-DD] [--start <time>] [--break <from>-<to>] [--wfh]` | Drafts the day's time sheet from your sessions, lets you edit it, then gives you the command to post it |
| `/zoffice:clear` | Gives you the command that deletes every entry on today's zOffice time sheet |

Example: `/zoffice:log acme --start 9:15 AM --break 1:00 PM-1:45 PM`

## Setup per plugin

| Plugin | Needs |
| --- | --- |
| **zDev** | `plan`, `new-trd`: nothing extra; Figma links need the Figma connector; HTML walkthroughs need Claude in Chrome; the DOCX export installs its two npm packages on first use. `copydll`: Windows and the .NET SDK on the path |
| **zOne Test** | A project with `playwright.config.*`, `npm install` run there, and the app reachable. It finds and runs your existing login setup. Optional: a [graphify](https://github.com/deadmade/dead-claude-skills) graph for faster discovery |
| **zWork** | An Azure DevOps token and the MCP server. Run `/zwork:init`; it prints the exact steps |
| **zOffice** | Your sign-in in environment variables `ZOFFICE_USERNAME` and `ZOFFICE_PASSWORD`. Run `/zoffice:log` once to set the zOffice URL, then `node "<plugin>/scripts/post-timesheet.mjs" --save-options` to save your projects |

Setting the environment variables:

| OS | Command |
| --- | --- |
| Windows (PowerShell) | `setx ZOFFICE_USERNAME "<username>"` and `setx ZOFFICE_PASSWORD "<password>"`, then open a new terminal |
| macOS / Linux | Add `export ZOFFICE_USERNAME=...` and `export ZOFFICE_PASSWORD=...` to your shell profile |

zWork uses the same way to store `AZURE_DEVOPS_PAT`.

## Safety

- `zdev:plan`, `zone-test:qa` and `zwork:plan` change application code only after you approve. `zone-test:feature` and `zone-test:e2e` write and fix test files on their own, but never application code.
- Commits, pushes, PRs and work item updates wait for your yes. You post the time sheet yourself, with the command `zoffice:log` gives you.
- No plugin asks for, stores or prints your passwords or tokens. Never type them into chat.
- Playwright `test-results/` can contain tokens; do not share it.
