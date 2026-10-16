---
description: "zWork - plan fixes for your bugs or tasks (by ID or by state) one by one in a markdown plan, then fix them after you say go"
argument-hint: "[--bug [ids]] [--task [ids]] [--new|--active] [auto]"
---

# Plan and fix work items

Read `${CLAUDE_PLUGIN_ROOT}/reference.md` first (if `${CLAUDE_PLUGIN_ROOT}` is not expanded, find it with Glob `**/zwork/reference.md` under `~/.claude/plugins/`) and follow it.

Arguments: `$ARGUMENTS`

Usage: `/zwork:plan [--bug [ids]] [--task [ids]] [--new] [--active] [auto]`

| Example | Plans |
| --- | --- |
| `/zwork:plan --bug 18923 12333` | Only those two bugs |
| `/zwork:plan --bug --new` | Every new bug assigned to you |
| `/zwork:plan --bug --new --active` | Every open bug assigned to you |
| `/zwork:plan --task 501` | That task |
| `/zwork:plan` | Your new and active bugs and tasks |
| `/zwork:plan --bug 18923 auto` | Plans, then fixes without waiting for go |

Select items as **Selecting work items for review and plan** in the reference says. `--pr` is not accepted here (use `/zwork:review --pr`). `auto` skips only the wait between plan and fix; it never skips the questions before a commit, push or DevOps update.

## 1. Plan, one item at a time

Create the plan file `.zwork/plans/<YYYY-MM-DD>-<ids or state>.md` at the workspace root (for example `2026-10-16-bug-new.md`). Add `.zwork/` to `.git/info/exclude` of the workspace's git repo if it is not there, so the file never shows up as a change. Write the header first:

```
# zWork plan · <date>
Selected: <how the arguments were understood> · <n> items
| # | ID | Type | Title | State | Pri | Status |
```

The `Status` column starts as `⏳ planning` for every item.

Then, for each item in priority order (keeping items that touch the same files next to each other):

1. Investigate it exactly as the bugs-and-tasks part of `${CLAUDE_PLUGIN_ROOT}/commands/review.md` describes (read that file once), including how to find the code. If it is `Closed`, or a linked PR already fixes it, mark it `⏭ skipped` with the reason and move on.
2. Append its plan to the file and update its row to `📝 planned`:

   ```
   ## <n>. #<id> <title>
   <type> · <state> · P<pri> · Sev <sev> · <link>
   **Problem** the report in one or two plain sentences.
   **Root cause** with `path/file.ext:line` links.
   **Fix** the smallest change that fixes the cause, not the symptom. Per file: `path` and what changes. If the same cause hits other callers, fix it in the shared place and list those callers.
   **Not changing** nearby things that look wrong but are out of scope.
   **Risk** what could break, and who else uses the changed code.
   **Verify** the build/lint/test commands this repo actually has, plus manual steps that reproduce the report and show it fixed.
   **Size** S / M / L · **Confidence** High / Medium / Low
   **Branch** `bugfix/<id>-<short-slug>` (bugs) or `task/<id>-<short-slug>` (tasks)
   ```

3. Post a one-line progress note in chat (`Planned 2/5: #18923 sorting on Region`), then continue with the next item.

When every item is planned, show the whole plan file in chat, give its path as a link, and show the git state: current branch and whether the working tree has uncommitted changes. If it does, say so; no branch is created until the user decides what to do with them.

Stop and wait (unless `auto`). The user can reply **go** (all), **go 18923 12333** (some), **skip 12333**, or ask for changes; update the file, show the changed parts and wait again. Nothing in the code is edited before go.

## 2. Fix, one item at a time

Remember the branch the user was on (the base). For each approved item, in plan order:

1. From the base, create the item's branch (`git switch -c <branch> <base>`). One branch per item keeps every fix reviewable on its own. Never push, rebase, reset or force anything.
2. Make the planned edits in the repo's own style. No new dependencies, no unrelated refactors, no changes to generated files. If reality differs from the plan (the cause is elsewhere, the fix is bigger), stop, update that item's plan in the file, and ask before going on.
3. Run the verify commands. Report the real output. Fix failures your change caused; report the others as pre-existing.
4. Show the item's result: changed files with links, what changed, verify results, manual checks still needed. Set its row to `✅ fixed` (or `❌ blocked` with the reason) and add a **Result** line under its plan.
5. Ask whether to commit with the message `Fix #<id>: <title>` (tasks: `#<id>: <title>`); Azure DevOps links the commit to the item through `#<id>`. On yes, commit, switch back to the base and go to the next item. On no, stop here, since the next item's branch would carry these uncommitted edits, and say how to continue (`/zwork:plan --bug <remaining ids>`).

## 3. Wrap up (each step only on the user's yes)

After the last item, show the final status table and offer:

1. **PRs:** for each committed branch, `/zwork:pr` from that branch, or create them all now: push each branch and call `create_pull_request` to the repo's default branch with `workItemRefs: [<id>]` and a description of root cause, fix and verification. Show the list of PRs to be created before doing it.
2. **DevOps update:** per item, a comment with root cause, fix and branch/PR (`update_work_item` with `System.History` in HTML) and a move to the resolved state (`Resolved` for bugs; for tasks the team's "development done" state, e.g. `Task Ready for Testing`; ask if unsure). Show exactly what will be written. If a state change is rejected, show the error and leave the state alone.
