# zWork shared rules

Every zWork command follows these rules. Read them once per command run.

## Arguments (same for every command)

```
/zwork:<command> [--bug [ids]] [--task [ids]] [--pr [ids]] [--new] [--active] [--resolved] [--days N]
```

| Part | Meaning |
| --- | --- |
| `--bug`, `--task`, `--pr` | The type. Numbers that follow a type flag are ids of that type: `--bug 18923 12333 --task 501`. Commas work too (`18923,12333`). Plural forms (`--bugs`) and the old `--bugids` / `--taskids` mean the same. |
| `--new`, `--active`, `--resolved` | State filter, as defined in **Work item states** and **Pull requests** below. Several can be combined. Ignored for a type that has ids. |
| `--days N` | How far back `--resolved` looks for closed items and completed PRs. Default 7. |
| bare numbers | Ids with no type flag before them: look each one up with `get_work_item` and use its real type (Bug or Task). If it is not a work item, try it as a PR id. |

Rules:
- No type flag means every type the command supports.
- Flags are case-insensitive and may come in any order; `-bug` with one dash is accepted.
- Reject unknown flags by printing the command's usage line and one example, then stop.
- Echo how the arguments were understood in one line before working, e.g. `Planning: bugs 18923, 12333`. or `Reviewing: your new bugs and PRs waiting for you`.

## Selecting work items for review and plan

1. **Ids given:** use exactly those. Fetch each with `get_work_item`. If an id does not exist, say so and continue with the rest. If its type differs from the flag (a Task under `--bug`), say so and use it anyway. If it is assigned to someone else, say who and continue.
2. **State flags, no ids:** run the base WIQL for each type and keep the requested buckets.
3. **Neither:** default to `--new --active` (open work not finished yet) and say so.
4. If more than 8 items are selected, list them in a table and ask the user to confirm all or pick ids before investigating. Never silently drop items.

## Connection

zWork talks to Azure DevOps Server (TFS) only through the `azure-devops` MCP server (tools named `mcp__azure-devops__*`). The default organization and project come from that server's config (`AZURE_DEVOPS_ORG_URL`, `AZURE_DEVOPS_DEFAULT_PROJECT`); pass `projectId` only when the user names another project.

If those tools are missing, or the first call fails with an auth, network or "not found" error, stop and tell the user to run `/zwork:init`. Never guess data you could not read.

Credentials: never ask for, accept, print or store a Personal Access Token. The user sets it in their own environment.

## Who "me" is

Azure DevOps Server has no profile endpoint (`get_me` fails there), so WIQL `@Me` is the source of truth. When a command needs the user's identity id (PR filters need a UUID):

1. Run `list_work_items` with `SELECT [System.Id] FROM WorkItems WHERE [System.AssignedTo] = @Me ORDER BY [System.ChangedDate] DESC`, `top: 1`, and take `System.AssignedTo.id`, `displayName`, `uniqueName`.
2. If that returns nothing, retry with `[System.CreatedBy] = @Me`, then `[System.ChangedBy] = @Me`, reading that field instead.
3. If all three are empty, say zWork could not resolve the user's identity and stop.

Scope is always the user's own items. There is no team-wide view.

## Work item states

Process templates differ: bugs here use New / Active / Resolved / Closed, but tasks use custom states such as "Task Ready for Testing" or "Task Completed". Never hard-code one list. Fetch the user's items of the requested type that are not `Closed` or `Removed`, then put each item in a bucket by its actual `System.State`:

| Bucket | States |
| --- | --- |
| new | `New`, `To Do`, `Proposed`, or any state that means not started |
| resolved | `Resolved`, `Done`, `Fixed`, any state containing `Completed`, `Ready for Testing`, `Ready for QA` or `Verified`: development finished, waiting to be closed |
| active | every other open state: `Active`, `Re Open`, `To be Fixed`, custom "In Progress" stages |

`resolved` also includes items that moved to `Closed` in the last `--days` days (default 7), so recently finished work shows up. When an unfamiliar state is bucketed by judgment, say so in one line under the table.

Base WIQL (add the type and date filters):

```sql
SELECT [System.Id] FROM WorkItems
WHERE [System.TeamProject] = @project
  AND [System.AssignedTo] = @Me
  AND [System.WorkItemType] = '<Bug|Task>'
  AND [System.State] NOT IN ('Closed', 'Removed')
ORDER BY [Microsoft.VSTS.Common.Priority] ASC, [System.ChangedDate] DESC
```

Request `fields`: `System.WorkItemType`, `Microsoft.VSTS.Common.Priority`, `Microsoft.VSTS.Common.Severity`, `System.IterationPath`, `System.ChangedDate`, `System.Tags`. Use `top: 200`; if 200 come back, say the list may be cut off.

Large results: every item carries a long `System.AssignedTo` block, so about 30 or more items exceed what a tool result can show and the result is saved to a file instead. Do not read that file in chunks. Extract only what is needed with one script, for example:

```bash
node -e "const a=JSON.parse(require('fs').readFileSync(process.argv[1],'utf8'));for(const{id,fields:f}of a)console.log([id,f['System.WorkItemType'],f['System.State'],f['Microsoft.VSTS.Common.Priority'],f['Microsoft.VSTS.Common.Severity'],(f['System.IterationPath']||'').split('\\\\').pop(),f['System.ChangedDate'],f['System.Title']].join('\t'))" "<saved file>"
```

The same applies to large PR lists.

## Pull requests

PR ids are project-scoped on Azure DevOps Server: `get_pull_request` takes `projectId` and `pullRequestId`, with no repository. To list PRs, call `list_repositories` once, skip repositories with `size: 0`, and call `list_pull_requests` for every remaining repository in parallel with `creatorId` or `reviewerId` set to the user's id and `top: 50`.

| Flag | Meaning |
| --- | --- |
| `--pr --active` | PRs the user created with status `active` |
| `--pr --new` | Active PRs where the user is a reviewer and has not voted yet (vote `0`): waiting on the user |
| `--pr --resolved` | PRs the user created with status `completed`, closed within `--days` days (default 7) |

Responses from this server use numbers: `status` 1 active, 2 abandoned, 3 completed; reviewer `vote` 10 approved, 5 approved with suggestions, 0 no vote, -5 waiting for author, -10 rejected. List results carry no web link; build it as `<org url>/<project>/_git/<repo name>/pullrequest/<id>` (URL-encode spaces). `closedDate` may be missing from list results; if so, call `get_pull_request` for the completed PRs to read it. `reviewerId` only matches the user as a direct reviewer, not through a team group; say so under the `--pr --new` table.

## Output

- One markdown table per type, newest priority first. Columns for work items: `ID` (linked to `<org url>/<project>/_workitems/edit/<id>`), `Title` (cut to 80 characters), `State`, `Pri`, `Sev` (bugs only), `Iteration` (last segment), `Updated` (relative, e.g. `3d ago`).
- Columns for PRs: `ID` (linked to the PR web URL), `Title`, `Repo`, `Source → Target`, `Reviewers` (name and vote: ✅ approved, 💬 with suggestions, ⏳ no vote, ↩ waiting for author, ❌ rejected), `Updated`.
- Above each table, a one-line count, e.g. `**Bugs: 6 active** (2 P1)`.
- Empty result: one line saying so, not an empty table.
- End with at most one suggested next command, e.g. ``Next: `/zwork:plan --bug 19361` ``.

## Writing to DevOps

Read freely. Before any write (state change, comment, assignment, PR comment, vote), show exactly what will be written and wait for the user's yes in chat. One yes covers only the writes it was shown. Never change an item that is not assigned to the user without saying so first.
