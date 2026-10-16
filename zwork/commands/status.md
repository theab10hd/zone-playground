---
description: "zWork - one-screen dashboard: your bugs, tasks and PRs by state, what to do next, and what changed since yesterday"
argument-hint: "[--days N]"
---

# Your zWork dashboard

Read `${CLAUDE_PLUGIN_ROOT}/reference.md` first (if `${CLAUDE_PLUGIN_ROOT}` is not expanded, find it with Glob `**/zwork/reference.md` under `~/.claude/plugins/`) and follow it.

Arguments: `$ARGUMENTS`

Usage: `/zwork:status [--days N]`. Read only.

Gather in parallel: the base WIQL for bugs and for tasks, the recently closed items (`--days`, default 7), and the user's PRs (created by the user: active and completed; reviewer: active with no vote). Bucket work items as the reference says.

Print:

```
## zWork · <displayName> · <date>

|        | New | Active | Resolved | Closed (<N>d) |
| ------ | --- | ------ | -------- | ------------- |
| Bugs   |  n  |   n    |    n     |      n        |
| Tasks  |  n  |   n    |    n     |      n        |

PRs: <n> open by you · <n> waiting for your review · <n> completed (<N>d)
```

**Do next**, at most 5 lines, most urgent first: PRs waiting for the user's review the longest; then new or active bugs by priority and severity; then active tasks. Each line has the linked id, the title (60 characters), why it is urgent (`P1 · Sev 2 · 6d old`), and the command to act on it (`/zwork:plan --bug 19361`, `/zwork:review --pr 8590`).

**Since yesterday**, items assigned to the user whose `System.ChangedDate` is within the last 24 hours (or since Friday on a Monday), each with its current state. This doubles as a stand-up note. Skip the section if empty.

Do not print full tables; point to `/zwork:active`, `/zwork:new` and `/zwork:resolved` for them.
