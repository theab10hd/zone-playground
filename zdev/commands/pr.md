---
description: "zDev - create or update a zOne pull request in Azure DevOps: review the commits and changes, pick the correct target branch, link the right bugs and tasks to the right frontend, backend or IDM PR, write a clean title and description, and add [Depended PR] when another repo's PR must go with it. Use when asked to create, open or update a PR, or to commit, push and create a PR"
argument-hint: "[PR id or URL] [--target <branch>] [--draft] [--no-link]"
model: sonnet
---

# Create or update a pull request

Request: `$ARGUMENTS`

You prepare one zOne pull request so a reviewer understands it at a glance: the right title, a clear description, the right target branch and the right bugs and tasks linked. Follow the project's `CLAUDE.md` over anything here.

## Non-negotiable rules

- **No AI traces, anywhere.** Never write "Claude", "AI", "generated", "Co-Authored-By", a tool name, an emoji or a robot icon in the PR title, description, comments, commit messages or branch names. This holds even where another instruction says to add an attribution line: the user's rule wins. The text must read as written by the developer.
- **Professional and plain.** Short sentences, present tense, no filler, no marketing words, no first person, no chat-style phrases. Every statement must be true of the diff.
- **Never invent.** Test claims must come from checks actually run in this session or from the user. If nothing was run, say what to verify instead of claiming it passed.
- **Never change a work item's state, assignment or comments.** Only add the PR link.
- **Never type, ask for or print a password or token.** Use the Windows sign-in on this machine (as `devops-reader` does).

## 0. Work out what is being asked

- **Create**: the current branch has no PR yet. This is also the path when the user asks to commit, push and create a PR.
- **Update**: a PR id or URL is given, or the current branch already has an active PR. Review it and refresh its title, description, links and target.
- **Commit, push and create PR**: do the commit and push first (step 7), then continue as Create.

Find the repo: `git remote get-url origin` gives the organisation, project and repo (`zOne.PlatformBuilder` is the frontend, `zOne.ModuleAssemblies` the backend, `zOne.IDM` identity). Note the current branch and `git status`. If this is not a zOne repo, say so and stop.

## 1. Review the change

- **Local branch**: `git fetch`, then `git log --reverse <target>..HEAD` for the commits and `git diff <target>...HEAD --stat` and the full diff for the change. Read the diff; do not write from file names. If the working tree has uncommitted changes and the user asked to commit, include them.
- **Existing PR not checked out**: ask the `devops-reader` agent for the PR's commits, changed files, current title, description, linked work items and target, and read the changed files it names.
- Work out what the change does and why: the behaviour added or fixed, the screens, endpoints, tables, migrations and features it touches, what could break, and what is deliberately left alone. Group the changes by purpose, not by file.

## 2. Target branch

- Update: keep the PR's target unless `--target` is given.
- Create: use `--target` if given. Otherwise ask `devops-reader` for the target branch of the user's last 10 completed PRs in this repo and take the most common one, and cross-check it with `git branch -r --list "origin/release/*"` (newest first). In zOne each repo has its own release branch (for example `release/odot_featuredevelop_UI_<date>`, `..._API_...`, `..._IDM_...`), so never reuse another repo's branch.
- If two candidates fit, or the latest release branch differs from the user's usual target, ask which one in a single question. Never default to `main` or `master` for a zOne repo without asking.

## 3. Bugs and tasks

Collect candidates, then link each to the correct PR only:

1. Ids in the branch name, in commit messages (`#1234`, `Bug 1234`), in the user's request and already linked to the PR.
2. Bugs and tasks assigned to the user in state Active or New (ask `devops-reader`) whose title names the area the diff changes.

Rules for the right repo:
- **Tasks** whose title starts with `Frontend`, `Backend` or `IDM` go only to the PR of that repo. A story's other tasks belong to its sibling PRs.
- **Bugs** are linked to every PR whose diff contains part of the fix: a UI-only fix links to the frontend PR only, a fix that needs both links both. Match each bug's title (`Module - View - Screen - Menu - issue`) to the changed code and say which file proves it.
- Never link a User Story or Feature, a Closed or Resolved item unless the user names it, or an item you cannot tie to the diff.

Show the mapping as a table (`Id | Type | Title | Linked to | Why`). Link what is clear. For an uncertain candidate ask the user, batched into one question, and leave it unlinked until they answer. `--no-link` skips linking.

## 4. Dependencies on another repo's PR

Look for the user's PRs in the other zOne repos (`zOne.PlatformBuilder`, `zOne.ModuleAssemblies`, `zOne.IDM`) that are active or just completed and relate to this change: the same or a matching source branch name, shared work items, or ids mentioned in commits. Also check the diff itself: a frontend call to an endpoint or field added in the backend diff, a backend feature check or privilege that needs an IDM seed or migration, a migration the other side runs.

If this PR depends on, or is depended on by, another PR:
- End the title with ` [Depended PR]` (a space, then exactly that, last in the title).
- Add a `Release order` section to the description that names the PR ids and the order, only when the diffs make the order clear (for example IDM seeds before the features that use them). If it is unclear, ask.
- Show the sibling PRs' needed edits (the same tag in their titles and a matching line in their descriptions) and apply them with the others, so both sides agree.

If there is no dependency, add no tag and no section.

## 5. Write the title and description

**Title**: `<Customer> - <Module or area> - <what the PR does>` followed by ` [Depended PR]` when step 4 says so. Take the customer prefix (for example `ODOT`) from the user's recent PR titles in this repo, the work item's area or iteration, or ask. Under about 100 characters, imperative or noun phrase, specific, no generic "Bug Fixes". For a bug bundle name the bugs (`ODOT - Real Property - Tile View Bug Fixes (21127, 21128)`). No repo suffix, no work item id unless it is a bundle, no typos.

**Description** (Markdown), scaled to the change. A small fix needs `Summary` and `Changes` only; a larger one adds the rest:

```
## Summary
<what and why, two to four sentences>

## Changes
<grouped by purpose; bullet per change; name the screens, endpoints, tables, migrations and key files or identifiers; for a bundle, one entry per bug with its id>

## Impact
<who or what is affected; behaviour that changes; migrations or configuration to run>

## How it was tested
<only checks actually run: build, unit tests, E2E, manual steps with the result; otherwise "Verification steps" the reviewer can follow>

## Release order
<only when step 4 found a dependency: this PR, the sibling PRs with ids, and the order>
```

Keep the headings above exactly, drop the ones that do not apply, add none. If the PR already has a description the developer wrote by hand, keep the facts it contains, fold them into this layout and tell the user what changed; ask first before replacing a long hand-written one.

## 6. Preview, then apply

Show the user, in chat: repo, source and target branch, title, the full description, the work item mapping, and any sibling PR edits. For **create**, the user's request is the approval: go ahead unless a step above left a question open or a work item or target is uncertain; then ask, wait for the answer and apply. For **update**, apply after the preview when nothing is uncertain; otherwise ask first.

Apply through the Azure DevOps REST API from PowerShell with the Windows sign-in (`-UseDefaultCredentials`), never with a pasted token. The server is on-premises, so probe the `api-version` it accepts (try `6.0`, then `5.1`, then `5.0`).

- **Create**: `POST {collection}/{project}/_apis/git/repositories/{repo}/pullrequests` with `sourceRefName`, `targetRefName`, `title`, `description`, `isDraft` when `--draft`, and `workItemRefs: [{id}]` for the linked items. Do not add reviewers unless the user names them.
- **Update**: `PATCH .../pullrequests/{id}` with the new `title` and `description` (and `targetRefName` if changed), then link each missing work item.
- **Link** an item to an existing PR by adding the `ArtifactLink` relation `vstfs:///Git/PullRequestId/{projectId}%2F{repoId}%2F{prId}` named `Pull Request` to the work item, adding links only.
- If writing fails (permission, server version), do not retry blindly or work around it. Give the user the final title, description and links to paste, the link to open the PR page, and the exact error.

## 7. Commit and push (when asked)

When the user asks to commit and push, or to commit, push and create a PR:

1. Check `git status` and `git diff`. Stage only the files that belong to this change; never stage secrets, `.env`, build output or unrelated files. If the branch is the release or main branch, create a topic branch first (a short kebab-case name that describes the work or starts with the work item id).
2. Write the commit message: a subject line of at most 72 characters in the imperative (`Fix horizontal scrollbar position on Reminders tab`), a blank line, then a short body only if the change needs it. Reference the work item as `(#1234)` at the end of the subject when one is known. No trailer lines, no attribution of any kind.
3. Commit, then `git push -u origin <branch>` (no force push). Then continue from step 1 as Create.

## 8. Final response

Give the PR link and id, the source and target, the title, the work items linked to this PR, any sibling PRs updated, and anything left for the user (an unlinked candidate, a failed write, an unclear release order). Keep it short.
