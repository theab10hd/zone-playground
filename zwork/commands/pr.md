---
description: "zWork - open an Azure DevOps pull request for the current branch, linked to its bugs and tasks, with a generated title and description"
argument-hint: "[--target <branch>] [--bug ids] [--task ids] [--draft] [--reviewer <name or email>]..."
---

# Open a pull request for this branch

Read `${CLAUDE_PLUGIN_ROOT}/reference.md` first (if `${CLAUDE_PLUGIN_ROOT}` is not expanded, find it with Glob `**/zwork/reference.md` under `~/.claude/plugins/`) and follow it.

Arguments: `$ARGUMENTS`

Usage: `/zwork:pr [--target <branch>] [--bug ids] [--task ids] [--draft] [--reviewer <name or email>]...`

| Example | Does |
| --- | --- |
| `/zwork:pr` | PR from the current branch to the repo's default branch, linked to the ids found in the branch name and commits |
| `/zwork:pr --target release/odot_featuredevelop_API` | Same, into that branch |
| `/zwork:pr --bug 18923 --draft` | Draft PR linked to bug 18923 |

1. **Repository.** In the current folder, `git rev-parse --abbrev-ref HEAD` gives the branch and `git remote get-url origin` the repository; match its name with `list_repositories`. Stop if the branch is the default branch, or the folder is not a git repo on `devops.zlinkcorp.com`.
2. **Target.** `--target`, else the repository's `defaultBranch`. If a remote branch with the same name as the target does not exist, stop and list similar branches (`git branch -r --list "*<word>*"`).
3. **What is in it.** `git fetch origin <target>`, then `git log --oneline origin/<target>..HEAD` and `git diff --stat origin/<target>...HEAD`. If there are no commits, stop. If the working tree has uncommitted changes, say they will not be in the PR.
4. **Work items.** Ids from `--bug` / `--task`, plus any `#<id>` in the commit messages and any number in the branch name that is a real work item (check with `get_work_item`). Show each with its title and state.
5. **Existing PR.** `list_pull_requests` with `sourceRefName: refs/heads/<branch>` and `status: active`. If one exists, give its link and stop.
6. **Draft** the PR:
   - Title: the single item's `Fix #<id>: <title>` (task: `#<id>: <title>`), or a short summary of the commits for several items.
   - Description (markdown): **Summary** (2–3 sentences), **Work items** (linked list), **Changes** (by area, from the diff), **How it was tested** (from the commits or the plan file in `.zwork/plans/` if one mentions these ids; otherwise "Not stated"), **Risk** (one line).
   - Reviewers from `--reviewer`; never guess reviewers.
7. Show the title, source → target, linked items, reviewers and the full description, and ask for a yes.
8. On yes: if the branch has no upstream or is ahead of it, `git push -u origin <branch>` (never force). Then `create_pull_request` with `workItemRefs` and `isDraft` as given. Print the PR link built as the reference describes.
9. Offer, as a separate yes, to move the linked items to the resolved state with a comment linking the PR (same rules as `/zwork:plan` wrap-up).
