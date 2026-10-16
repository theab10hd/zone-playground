---
description: "zWork - list your bugs, tasks and PRs that are in progress: work items in an active state and your open PRs"
argument-hint: "[--bug] [--task] [--pr]"
---

# Your active work

Read `${CLAUDE_PLUGIN_ROOT}/reference.md` first (if `${CLAUDE_PLUGIN_ROOT}` is not expanded, find it with Glob `**/zwork/reference.md` under `~/.claude/plugins/`) and follow it.

Arguments: `$ARGUMENTS`

Usage: `/zwork:active [--bug] [--task] [--pr]`. Run and print only the types whose flags were given; no type flag means all three.

| Example | Shows |
| --- | --- |
| `/zwork:active --bug` | Your bugs in progress |
| `/zwork:active --pr` | Your open PRs |
| `/zwork:active` | Bugs, tasks and PRs |

1. For `--bug` and `--task`, run the base WIQL from the reference for each type (both in parallel), bucket every item by its state, and keep the **active** bucket.
2. For `--pr`, resolve the user's identity and list PRs as the reference defines **`--pr --active`**.
3. Print the tables as the reference's Output section describes, bugs first, then tasks, then PRs. Read only: change nothing. Under the last table, suggest one next command when it fits, e.g. `/zwork:plan --bug --active` or `/zwork:review --pr --active`.
