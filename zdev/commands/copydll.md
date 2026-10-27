---
description: "zDev - stop the running zOne frontend, build the backend, run CopyDll.bat, copy C:\\zOneDlls\\*.dll into frontend\\bin\\Debug\\net7.0, and notify when done"
argument-hint: "[zOne folder]"
model: haiku
---

# Copy DLLs

Arguments: `$ARGUMENTS`

Usage: `/zdev:copydll [zOne folder]`. With no folder, the script finds the zOne checkout that holds `backend\zLink.References\CopyDll.bat`: up from the current folder, then `D:\zOne`, then every drive.

The script does every step itself: stops every running frontend, builds the backend, runs `CopyDll.bat`, copies `C:\zOneDlls\*.dll` to `frontend\bin\Debug\net7.0`, and shows a Windows notification "Copy Dll Done". Do not run any step yourself, and keep every reply to one short line until the end.

## 1. Start it

Set the task list (`update_plan`): `Stop running frontend`, `Build backend`, `Run CopyDll.bat`, `Copy DLLs to frontend`, first one in progress. In the same message, start the script with the **Monitor** tool, `timeout_ms` 1800000, description `zDev copydll`, adding `-Root "<folder>"` only when one was given. The script is `${CLAUDE_PLUGIN_ROOT}/scripts/copydll.ps1` (if that is not expanded, Glob `**/zdev/scripts/copydll.ps1` under `~/.claude/plugins/`):

```
powershell -NoProfile -File "<script path>" [-Root "<folder>"] 2>&1 | grep --line-buffered -E '^(START|PROGRESS|WARN|ERROR|COPYDLL DONE)|error [A-Z]+[0-9]+'
```

If Monitor is not available, run the same command with the PowerShell tool in the background and report only its last lines.

## 2. Each event

| Line | Do |
| --- | --- |
| `START: root=...; modules=N; stopped=...` | `update_plan` items: stop task done, build task renamed `Build backend 0/N` in progress. No chat text. |
| `PROGRESS: k/N <module>` | `update_plan` items: rename the build task `Build backend k/N · <module> ✓`. No chat text. |
| `WARN: ...` | Keep it for the final reply. No call, no chat text. |
| `error CSxxxx ...` | Show the line. |
| `ERROR: ...` | The script stopped. Show the reason, leave unfinished tasks open, and stop. Do not retry or fix code unless asked. |
| `COPYDLL DONE: ...` | Mark every task done. Reply **Copy Dll done** with the line's figures, the folder, what was stopped and any WARN, in at most four lines, and remind the user to start the frontend again. |

When several lines arrive together, act on the last of each kind in one reply. If the monitor ends without `COPYDLL DONE` or `ERROR:`, read its output file and report the last lines.
