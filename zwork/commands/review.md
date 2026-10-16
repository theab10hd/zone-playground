---
description: "zWork - explain bugs or tasks against the codebase (root cause, where, impact), or review a PR's changes, scope, affected areas, risks and issues"
argument-hint: "[--bug [ids]] [--task [ids]] [--pr [ids]] [--new|--active|--resolved]"
---

# Review work items or a pull request

Read `${CLAUDE_PLUGIN_ROOT}/reference.md` first (if `${CLAUDE_PLUGIN_ROOT}` is not expanded, find it with Glob `**/zwork/reference.md` under `~/.claude/plugins/`) and follow it.

Arguments: `$ARGUMENTS`

Usage: `/zwork:review [--bug [ids]] [--task [ids]] [--pr [ids]] [--new] [--active] [--resolved]`

| Example | Reviews |
| --- | --- |
| `/zwork:review --bug 18923 12333` | Those two bugs |
| `/zwork:review --bug --new` | Every new bug assigned to you |
| `/zwork:review --task --active` | Every active task assigned to you |
| `/zwork:review --pr 8590` | That PR |
| `/zwork:review --pr --new` | Every PR waiting for your vote |
| `/zwork:review 18923 8590` | Each id by its real type |
| `/zwork:review` | Your new and active bugs and tasks |

Select work items as **Selecting work items for review and plan** in the reference says. For PRs: ids if given; otherwise the PRs matching the state flags (`--pr --new` waiting for your vote, `--pr --active` your open PRs); `--pr` alone means `--pr --new`. Several PRs are reviewed one at a time, in id order.

This command reads and explains; it never edits code. To fix, use `/zwork:plan`.

## Finding the code

The code lives in the folder Claude Code was opened in. Map each Azure DevOps repository to a local checkout by running `git remote -v` in the working directory and its immediate subfolders and matching the repository name. If `graphify-out/graph.json` exists at the workspace root, query it first to locate features; otherwise use Grep, and for broad searches send parallel Explore agents. If the relevant repository is not checked out locally, say so, try `search_code`, and mark every conclusion that could not be checked against code as **unverified**.

## Bugs and tasks: what is the issue

For several ids, investigate them in parallel (one Explore agent per item), then write the results in id order.

For each id:

1. `get_work_item` with `expand: "all"` and `get_work_item_comments`. Read title, description, repro steps (`Microsoft.VSTS.TCM.ReproSteps`), acceptance criteria, system info, severity, tags, and comments. If the item is not a Bug or Task as flagged, say so and continue. Note attachments and images by name; their content cannot be read.
2. Read the relations: parent story, related items, and linked commits, branches or PRs (`ArtifactLink`). If a PR is linked, say a fix may already exist and give its id and status.
3. Trace the reported behaviour through the code: UI → API → service → data, as far as the item reaches. Read the actual code; do not guess from names.

Write, per item:

```
### #<id> <title>  ·  <type> · <state> · P<pri>/Sev<sev>
**Reported:** one or two sentences in plain words, with the repro steps condensed.
**Root cause:** what in the code produces it, with `path/file.ext:line` links. For a task: what has to change and where.
**Where:** a short list of files and functions involved, by layer.
**Impact:** other screens, APIs, reports or exports that share this code and are affected the same way.
**Confidence:** High / Medium / Low, and why. List what would raise it (a log, a missing repro detail, data to check).
**Open questions:** anything the item leaves ambiguous, to ask the reporter.
```

After the last item, a summary table (`ID`, `Title`, `Root cause` in one line, `Confidence`), then `Next: /zwork:plan --bug <ids>` (or `--task`).

## Pull requests: review the change

1. `get_pull_request` with `projectId` and the id. From it take repository, source and target branches, author, status, description, reviewers and votes, and linked work items.
2. `get_pull_request_changes` for the diffs and policy status, `get_pull_request_checks` for builds, and `get_pull_request_comments` for open threads.
3. If the repository is checked out locally, read the full changed files and grep for callers of every changed public function, API route, stored procedure, DB column or shared component, so impact outside the diff is real, not guessed. Do not switch the user's branch; use `git fetch` and `git show <remote>/<branch>:<path>` if the source branch is needed.
4. Read each linked work item and check the change actually does what it asks.

Write:

```
## PR #<id> <title>
<repo> · <source> → <target> · by <author> · <status> · <n> files, +<a> −<d>
Build: <pass/fail/none> · Policies: <summary> · Open threads: <n>

**Summary** what the PR does, in 2–3 sentences.
**Scope** the change grouped by area (UI, API, service, data/DB, config), and whether it matches the linked work items. Call out anything in the diff the work items do not ask for.
**Affected areas** features, screens, endpoints, jobs and reports reached by the changed code, including callers outside the diff (with file links).
**Bugs it can produce** concrete failure scenarios, each with input/state → wrong result, and file:line. Cover nulls and empty lists, edge values, error handling, concurrency, permissions, breaking API/DB contract changes, missing migrations, and environment/config differences.
**Issues** security, performance (N+1 queries, unbounded loads), code quality, conventions of this repo, missing or weak tests, leftover debug code, commented-out code, secrets.
**Verdict** Approve / Approve with suggestions / Wait for author / Reject, with the top reasons.
```

Rank findings most severe first and label each 🔴 blocker, 🟠 should fix or 🟡 nit. Only report what the code supports; drop anything you could not confirm, or mark it **unverified**.

Then ask whether to post the findings as PR comments. Only on a yes, post each finding with `add_pull_request_comment` on its file and line (`status: "active"`). Never vote or change the PR's status.
