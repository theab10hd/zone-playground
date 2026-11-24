<h1><img src="zone-test/assets/logo.png" alt="zOne logo" width="40" height="40" align="top"> zOne Playground</h1>

Claude Code plugins for zOne work: plan and build features, plan fixes for your Azure DevOps bugs, add Custom Reports, open clean pull requests, and test it all the way down to labels, units and scrollbars. You describe what you need; the plugins read the real code, do the work and show you the evidence. Both plugins use the bugs QA raised under User Story 20308 (ODOT Feedback) so the same mistakes are prevented while building and caught while testing.

## Plugins

| Plugin | Version | What it does |
| --- | --- | --- |
| **zDev** (`zdev`) | 2.0.0 | Plans a feature with you against the real code (snippets, full DB schema, UI detail spec, edge-to-edge scenarios) and builds it after you approve, in this session or a fresh one; writes TRDs and exports them to DOCX; plans fixes for your active bugs; adds new Custom Reports as SQL migrations (never run); creates and updates pull requests with the right target branch, linked bugs and tasks, and a clean title and description |
| **zTest** (`ztest`) | 2.0.0 | QA code review and Playwright E2E tests with an exhaustive UI audit in Chrome: every menu and sub-menu option, modals, units, tooltips, scrollbars and sizes. Reports every defect, existing or new, as a PDF |

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
/plugin install ztest@zone-playground
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
| `/zdev:plan <feature> [files, screenshots, PDFs, Figma links]` | Plans a feature with you on Opus, read-only, then builds it only after you say go (details below) |
| `/zdev:plan bugs [active \| new \| <ids> \| <parent id>]` | Bug mode: reads your bugs from Azure DevOps (read-only), groups them by root cause, finds each cause in the code, and writes one plan with a root-cause fix snippet, sibling fixes and a regression check per group. Never changes work items |
| `/zdev:new-trd <feature> [PRDs, old TRDs, screenshots, PDFs, DOCX, HTML walkthrough]` | Drafts a FedRAMP-aware, self-contained Technical Requirement Document (short plain-language main body with decisions, scope and acceptance criteria; technical detail in appendices) on Opus from your docs, the code and the HTML walkthrough (opened in Claude in Chrome), revises it with you section by section, asks instead of guessing, and exports the accepted TRD to a styled DOCX |
| `/zdev:pr [PR id or URL] [--target <branch>] [--draft] [--no-link]` | Creates or updates a zOne pull request in Azure DevOps. Reviews the commits and diff, picks the repo's release branch, links the right bugs and tasks to the right frontend, backend or IDM PR, writes a clean title and description with no AI traces, and adds ` [Depended PR]` when another repo's PR must go with it. Also runs when you ask to commit, push and create a PR: clean commit message, push, then the PR |
| `/zdev:new-report <report name> [module, columns, source tables, spec]` | Adds a zOne Custom Report data source on Opus: collects the spec, finds the closest existing report, shows the spec for your go, then writes the three migrations (data set and columns, report procedure, dispatcher branch) and checks the names match. Never runs migrations or touches the database |

Example: `/zdev:plan add a Region filter to the Lease grid, see screenshot.png`

Example: `/zdev:plan active bugs`, or `/zdev:plan bugs 21127 21128`

Example: `/zdev:pr`, `/zdev:pr 9389`, or just ask to "commit, push and create a PR"

**How `/zdev:pr` works**

1. **Reviews the change.** Reads the commits and the diff (or an existing PR from Azure DevOps) and groups the changes by purpose.
2. **Picks the target branch.** The repo's own release branch (UI, API or IDM), taken from your recent completed PRs and the newest `origin/release/*`. It asks when two candidates fit and never guesses `main`.
3. **Links the right work items.** `Frontend...`, `Backend...` and `IDM...` tasks go only to that repo's PR. A bug goes to every PR whose diff contains part of the fix. It shows a mapping with the reason, asks about uncertain ones, and never changes a work item's state.
4. **Adds the dependency tag.** If a PR in another repo must go with this one (a new endpoint, a migration, an IDM seed), the title ends with ` [Depended PR]` and the description gets a Release order section. The sibling PRs are updated to match.
5. **Writes the title and description.** Title: `Customer - Module - Change`. Description: Summary, Changes, Impact, How it was tested (only checks actually run) and, when needed, Release order.
6. **No AI traces.** No "Claude", "generated", `Co-Authored-By`, tool names or emojis in the title, description, comments or commit messages.
7. **Commit and push on request.** It stages only files that belong to the change, writes a clean commit message, pushes without force and then creates the PR. If it cannot write to Azure DevOps, it gives you the title, description and links to paste, with the exact error.

**How `/zdev:plan` works**

1. **Understand and investigate (read-only).** Reads everything you supply, then the code with parallel agents: similar features, frontend (latest V2 components), backend, data, access, tests, and **parity and siblings** (everything the old view offers, every sibling screen, every flow that uses the same entity). Writes an impact table.
2. **Discuss.** Asks only the open decisions that came from real findings, with a recommendation. Asks about every parity gap instead of dropping it silently.
3. **Plan.** Written against the QA-derived rules in `zdev/reference/defect-prevention.md`. The plan has:
   - code snippets for every new or changed piece, each citing the verified reference it copies;
   - the full DB schema (tables, columns, keys, constraints, indexes, seed rows, DDL and EF entity, migration order, rollback);
   - a **UI detail spec** with one row per element: exact label, unit or currency, format, tooltip, placeholder, messages, states, who sees it, placement, size, scrollbar and modal behaviour;
   - an **edge-to-edge scenarios** table covering every menu item, record type, role, flow and sibling screen;
   - a defect-prevention checklist.
4. **Review.** You change anything until it is right. Approving the plan is not approval to code.
5. **Save.** The confirmed plan is saved as a self-contained file in `D:\Claude Implementation Plans\` (the folder is created if missing; earlier plans are never overwritten).
6. **Pick who builds it.** You choose Sonnet, Opus or Not now. If the model differs from this session, or the planning conversation is long, a **fresh session** on the chosen model starts from the plan file only, so the planning context is not billed again.
7. **Build and validate.** Follows the plan step by step, runs the checks after each stage, then walks the finished screen like QA (in Chrome when the app is reachable) and reports each rule as met, not applicable or not verified.

Ways to keep the cost down: plan on Opus and build on Sonnet in a fresh session, split a large plan into independent sessions (backend and frontend), run exploration agents on Sonnet, and use a lower effort level for routine builds.

TRD drafts and DOCX files go to `.zdev/trd/<feature>/` in your workspace. Every DOCX uses the same style (A4, narrow margins, Calibri), set once in `zdev/scripts/trd-style.mjs`.

### zTest

The plugin includes the `ui-auditor` agent (`zone-test/agents/ui-auditor.md`): a read-only QA tester that opens the live app, walks every screen, tab, menu, sub-menu and modal, and returns confirmed UI, style, modal and data defects with measurements. It runs on Sonnet in its own context, so the screenshots and DOM reads never fill your session. It never signs in and never saves or deletes anything.

| Command | What it does |
| --- | --- |
| `/ztest:qa <feature or files> [docs: <spec paths>]` | Agent team reads the feature's code edge to edge, hunts for the QA bug patterns and reports bugs by severity; fixes them after you confirm. Also runs the `ui-auditor` agent in the live app (read-only) to check every screen, menu, modal, value, unit, tooltip, scrollbar and style. Runs no tests |
| `/ztest:feature [manual] <feature and details> [--headed] [--no-report]` | Builds a control inventory, audits the live UI in Claude in Chrome, designs exhaustive E2E and UI cases, writes the Playwright suite, runs it, fixes test defects and makes a PDF report. `manual` waits for your go before writing |
| `/ztest:e2e <feature \| group \| case-id> [--headed] [--no-fix] [--no-report]` | Runs an existing suite, group or case, diagnoses failures, fixes test defects, reruns and makes a PDF report |

Example: `/ztest:qa lease region district filter docs: specs/region-filter-prd.md`

**What `/ztest:feature` covers**

- **One case per option.** Every menu, sub-menu and menu inside a menu, tab, filter, setting, report action and modal gets a case. A control with no case is reported as a coverage gap.
- **UI audit in Chrome.** Scrollbars (measured, not eyeballed), button and icon sizes, computed styles, clipping and z-index, units and formats compared with the API value, tooltips, keyboard use, responsive widths and zoom, console and network errors.
- **QA bug patterns.** Parity with the old view, units and symbols, scrollbars, modals opening blank or behind another popup, rules enforced only in the menu, validation, cascading dropdowns, deleted entities, the same feature in every flow, roles, reports and activity logs. See `zone-test/reference/qa-bug-patterns.md`.
- **Existing bugs too.** Every defect met on the screen is reported, marked existing or new, as a `UI defect`, `App defect`, `Data` or `Performance` finding with a QA-style title, preconditions and steps, ready to paste into Azure DevOps.
- **No trimming.** The aim is a bug-free, clean feature, so a large number of cases is expected.

Reports go to `D:\zOne Test Reports\` (`~/zOne Test Reports/` on macOS and Linux).

## Setup per plugin

| Plugin | Needs |
| --- | --- |
| **zDev** | `plan`, `new-trd`: nothing extra; Figma links need the Figma connector; HTML walkthroughs and the final QA walk-through need Claude in Chrome; the DOCX export installs its two npm packages on first use. `new-report`: the zOne checkout with `backend\`. `plan bugs` and `pr`: Azure DevOps reachable with your Windows sign-in (no token is asked for). Starting a fresh build session needs the desktop app, otherwise the plan gives you the `claude --model` command to run |
| **zTest** | A project with `playwright.config.*`, `npm install` run there, and the app reachable. It finds and runs your existing login setup. The live UI audit (`ui-auditor` agent in `qa` and `feature`) needs Claude in Chrome and a signed-in browser (it falls back to Playwright checks without it). Optional: a [graphify](https://github.com/deadmade/dead-claude-skills) graph for faster discovery |

## Safety

- `zdev:plan` and `ztest:qa` change application code only after you approve. `ztest:feature` and `ztest:e2e` write and fix test files on their own, but never application code.
- `zdev:new-report` writes migration files only after you confirm the spec. It never runs a migration, writes to a database or asks for a database password.
- Commits, pushes and PRs happen only when you ask. `zdev:pr` shows the title, description, target branch and work items before it creates or updates anything, and asks when something is uncertain.
- `zdev:plan bugs` and `zdev:pr` only read work items and add PR links. They never change a work item's state, assignment or comments.
- No plugin asks for, stores or prints your passwords or tokens. Never type them into chat.
- Playwright `test-results/` can contain tokens; do not share it.

## Repository layout

```
.claude-plugin/marketplace.json     marketplace manifest
zdev/                               feature planning, TRDs, Custom Reports, pull requests
  commands/                         plan, new-trd, new-report, pr
  reference/                        defect-prevention.md, custom-report-guide.md
  scripts/                          TRD to DOCX export
zone-test/                          the zTest plugin (installed as ztest)
  commands/                         qa, feature, e2e
  agents/                           ui-auditor.md
  reference/                        qa-bug-patterns.md
  scripts/                          PDF report renderer
```
