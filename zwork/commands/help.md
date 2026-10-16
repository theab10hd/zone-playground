---
description: "zWork - show every zWork command with examples"
argument-hint: ""
---

# zWork help

Print this, exactly, and nothing else:

```
zWork · Azure DevOps (devops.zlinkcorp.com/tfs/zOne) from Claude Code

SET UP
  /zwork:init                              check connection and token, show setup steps

SEE YOUR WORK
  /zwork:status                            dashboard: counts, do next, since yesterday
  /zwork:new      [--bug] [--task] [--pr]  not started; PRs waiting for your review
  /zwork:active   [--bug] [--task] [--pr]  in progress; your open PRs
  /zwork:resolved [--bug] [--task] [--pr] [--days N]
                                           done, plus closed / completed in N days (7)

UNDERSTAND AND FIX
  /zwork:review --bug 18923 12333          root cause of these bugs, from the code
  /zwork:review --bug --new                ... of every new bug of yours
  /zwork:review --pr 8590                  PR review: scope, impact, risks, verdict
  /zwork:review --pr --new                 every PR waiting for your vote
  /zwork:plan   --bug 18923 12333          plan fixes, wait for "go", fix each on its own branch
  /zwork:plan   --bug --new --active       ... for all your open bugs
  /zwork:pr                                open a PR for the current branch, linked to its work items

ARGUMENTS (all commands)
  --bug / --task / --pr [ids]    type, optionally with ids (spaces or commas)
  --new / --active / --resolved  state filter, combine freely
  no type flag = all types · bare ids are looked up by type

Nothing is written to DevOps, committed or pushed without your yes.
```
