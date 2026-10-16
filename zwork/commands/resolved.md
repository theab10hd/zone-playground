---
description: "zWork - list your bugs, tasks and PRs that are finished: resolved work items and completed PRs (closed in the last 7 days included)"
argument-hint: "[--bug] [--task] [--pr] [--days N]"
---

# Your resolved work

Read `${CLAUDE_PLUGIN_ROOT}/reference.md` first (if `${CLAUDE_PLUGIN_ROOT}` is not expanded, find it with Glob `**/zwork/reference.md` under `~/.claude/plugins/`) and follow it.

Arguments: `$ARGUMENTS`

Usage: `/zwork:resolved [--bug] [--task] [--pr] [--days N]`. Run and print only the types whose flags were given; no type flag means all three. `--days` (default 7) only affects closed items and completed PRs.

| Example | Shows |
| --- | --- |
| `/zwork:resolved --task` | Your tasks with development done, plus tasks closed in 7 days |
| `/zwork:resolved --pr --days 14` | Your PRs completed in the last 14 days |
| `/zwork:resolved` | Everything |

1. For `--bug` and `--task`, run the base WIQL from the reference for each type (both in parallel), bucket every item by its state, and keep the **resolved** bucket. Also run it with `[System.State] = 'Closed' AND [System.ChangedDate] >= @Today - <days>` in place of the `NOT IN` line, and add those items with State `Closed`.
2. For `--pr`, resolve the user's identity and list PRs as the reference defines **`--pr --resolved`**.
3. Print the tables as the reference's Output section describes, bugs first, then tasks, then PRs. Read only: change nothing. Under the last table, suggest one next command when it fits, e.g. `/zwork:pr` for a finished branch that still has no PR.
