---
description: "zWork - check the Azure DevOps MCP connection to https://devops.zlinkcorp.com/tfs/zOne, test token permissions, and show the steps to connect"
argument-hint: ""
---

# Check and set up the zWork connection

Read `${CLAUDE_PLUGIN_ROOT}/reference.md` first (if `${CLAUDE_PLUGIN_ROOT}` is not expanded, find it with Glob `**/zwork/reference.md` under `~/.claude/plugins/`).

Never ask for, accept, print or store a token. Never run `claude mcp add`, `setx` or `export` yourself; the user runs them. Never run `claude mcp get` (it can print the token).

## Checks

Run them in order and keep going after a failure where the next check still makes sense, so the user sees everything that is wrong at once.

1. **Token in the environment.** Run `node -e "console.log(!!process.env.AZURE_DEVOPS_PAT)"`. It prints only `true` or `false`. `false` is fine if the token was put in the MCP config instead; note it.
2. **MCP server present.** Look for `mcp__azure-devops__*` tools (ToolSearch `+azure-devops list_projects`). If none exist, run `claude mcp list` and find the `azure-devops` line: missing means not installed; `✗ Failed` means it is installed but did not start (Node.js missing, or a typo in the command).
3. **Reaches the server.** `list_projects`. 401/403 means the token is wrong, expired or revoked. ENOTFOUND, ECONNREFUSED, a timeout or a certificate error means this machine cannot reach `devops.zlinkcorp.com` (check VPN or the office network). Quote the error's first line.
4. **Right organization.** Each project `url` must start with `https://devops.zlinkcorp.com/tfs/zOne`. If not, `AZURE_DEVOPS_ORG_URL` points elsewhere.
5. **Identity.** Resolve the user as the reference says. If it fails, the token works but the user has no work items yet, so PR filters cannot be used.
6. **Token permissions.** Test each read scope with one cheap call, all in parallel:

   | Scope | Test call | Needed by |
   | --- | --- | --- |
   | Work Items (Read) | WIQL count of the user's open bugs and tasks | every command |
   | Code (Read) | `list_repositories` | `--pr` lists, `review --pr`, `pr` |
   | Build (Read) | `list_pipelines` with `top: 1` | PR build status in `review --pr` |
   | Project and Team (Read) | `list_projects` (check 3) | init, default project |

   Write scopes (Work Items: Write, Code: Write) cannot be tested without changing data. Mark them "not tested" and say they are only needed when the user approves an update, comment, commit push or PR.

## Report

Always print the status block, with ✅, ❌ or ⚠ per line:

```
zWork connection
Server         https://devops.zlinkcorp.com/tfs/zOne      ✅
MCP server     azure-devops (connected)                   ✅
Token          set in environment                         ✅
Project        zOne v1.1 (default)                        ✅
Signed in as   <displayName> (<uniqueName>)               ✅
Work Items     read ✅ · write not tested
Code           read ✅ · write not tested
Build          read ✅
Open work      <n> bugs · <n> tasks · <n> repos visible
```

Then, in this order:

1. **Fixes.** If anything is ❌ or ⚠, one line per problem saying what is wrong and which setup step fixes it.
2. **How to use zWork.** Always show this, connected or not, under the heading "How to use zWork": the code block from `${CLAUDE_PLUGIN_ROOT}/commands/help.md`, copied exactly. Under it, add these tips:
   - Open Claude Code in the folder that holds your repositories, so `review` and `plan` can read the code.
   - A typical day: `/zwork:status` → `/zwork:review --pr --new` → `/zwork:plan --bug --new` → `/zwork:pr`.
   - Ids go right after their type (`--bug 18923 12333`). A state flag with no ids (`--bug --new`) means all your items in that state.
   - Nothing is written to DevOps, committed or pushed until you say yes.
   If a check failed, say these commands work once the fixes are done.
3. **Setup steps.** Show the section below: in full if anything failed, ending with "After the fix, restart Claude Code and run `/zwork:init` again."; if all is ✅, under the heading "To reconnect on another machine or renew your token".

## Setup steps

**1. Create a Personal Access Token**

1. Open `https://devops.zlinkcorp.com/tfs/zOne/_usersSettings/tokens` (or your profile picture → **Security** → **Personal access tokens**).
2. **+ New Token**. Name: `Claude zWork`. Organization: `zOne`. Expiration: up to the maximum your admin allows; set a reminder to renew it.
3. Scopes: choose **Custom defined**, then tick (use **Show all scopes** if one is hidden):

   | Scope | Access | Why |
   | --- | --- | --- |
   | Work Items | Read & write | list, review and plan bugs and tasks; comment and change state when you approve |
   | Code | Read & write | list and review PRs, post review comments, create PRs |
   | Build | Read | show PR build and policy status |
   | Project and Team | Read | find the project and its repositories |

4. **Create**, and copy the token now; it is shown only once. Do not paste it into Claude.

**2. Save the token in your environment**

- Windows (PowerShell), then close and reopen the terminal and Claude Code:
  ```powershell
  setx AZURE_DEVOPS_PAT "<your token>"
  ```
- macOS/Linux: add `export AZURE_DEVOPS_PAT="<your token>"` to `~/.zshrc` or `~/.bashrc`, then open a new terminal.

`setx` stores the token in your Windows user profile in plain text, so use it only on your own account.

**3. Add the MCP server** (needs Node.js 18 or newer: check with `node -v`)

Windows:
```bash
claude mcp add azure-devops --scope user -e AZURE_DEVOPS_ORG_URL=https://devops.zlinkcorp.com/tfs/zOne -e AZURE_DEVOPS_AUTH_METHOD=pat -e "AZURE_DEVOPS_DEFAULT_PROJECT=zOne v1.1" -- cmd /c npx -y @tiberriver256/mcp-server-azure-devops
```

macOS/Linux:
```bash
claude mcp add azure-devops --scope user -e AZURE_DEVOPS_ORG_URL=https://devops.zlinkcorp.com/tfs/zOne -e AZURE_DEVOPS_AUTH_METHOD=pat -e "AZURE_DEVOPS_DEFAULT_PROJECT=zOne v1.1" -- npx -y @tiberriver256/mcp-server-azure-devops
```

If a broken `azure-devops` entry already exists, remove it first with `claude mcp remove azure-devops --scope user`.

**4. Restart Claude Code** and run `/zwork:init`. `claude mcp list` should show `azure-devops: ... ✓ Connected`.

**Renewing a token:** regenerate it on the same tokens page (or create a new one with the same scopes), run the `setx` command again with the new value, and restart Claude Code. The MCP server needs no change.
