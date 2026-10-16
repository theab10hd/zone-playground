---
description: "zWork - list your bugs, tasks and PRs that are not started yet: new work items and PRs waiting for your review"
argument-hint: "[--bug] [--task] [--pr]"
---

# Your new work

Read `${CLAUDE_PLUGIN_ROOT}/reference.md` first (if `${CLAUDE_PLUGIN_ROOT}` is not expanded, find it with Glob `**/zwork/reference.md` under `~/.claude/plugins/`) and follow it.

Arguments: `$ARGUMENTS`

Usage: `/zwork:new [--bug] [--task] [--pr]`. Run and print only the types whose flags were given; no type flag means all three.

| Example | Shows |
| --- | --- |
| `/zwork:new --bug` | Your bugs not started yet |
| `/zwork:new --pr` | PRs waiting for your vote |
| `/zwork:new --bug --task` | New bugs and tasks |

1. For `--bug` and `--task`, run the base WIQL from the reference for each type (both in parallel), bucket every item by its state, and keep the **new** bucket.
2. For `--pr`, resolve the user's identity and list PRs as the reference defines **`--pr --new`**.
3. Print the tables as the reference's Output section describes, bugs first, then tasks, then PRs. Read only: change nothing. Under the last table, suggest one next command when it fits, e.g. `/zwork:plan --bug --new` or `/zwork:review --pr --new`.
