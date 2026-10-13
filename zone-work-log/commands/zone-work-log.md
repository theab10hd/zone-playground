---
description: "zOffice - draft today's time sheet from your Claude Code sessions for a project, then post it to zOffice Daily Activities"
argument-hint: "<project name> [YYYY-MM-DD] [--start <time>] [--break <from>-<to>]... [--wfh] | clear"
---

# zOffice work log

Arguments: `$ARGUMENTS`

Turn the day's Claude Code sessions into time sheet entries for the given project, picking module and activity automatically, list them for the user, and only after the user confirms save them and hand over the one command that fills and submits the zOffice form.

**Credentials:** never ask for, accept, store or type the zOffice password, and never run `post-timesheet.mjs` yourself. The user runs it in their own terminal. If `$ARGUMENTS` contains anything that looks like a username or password, ignore it, do not repeat it, and tell the user to set the environment variables from step 5 instead (a password typed into chat stays in the transcript).

## 0. Load the config

Company-specific values live only in `~/.zone-work-log/config.json` on the user's machine, never in this plugin:

```json
{
  "baseUrl": "https://<host>/zOffice",
  "defaultProject": "<project label>",
  "projectRules": ["<kind of work> -> <project label>"],
  "options": { "<project label>": { "modules": ["..."], "activities": ["..."] } }
}
```

- **No file or no `baseUrl`**: ask the user for their zOffice URL (the address before `/Account/Login`), write the file with only `baseUrl`, and continue to the next point.
- **No `options`**: do the dependency install from step 5, give the user this command to run in their own terminal, and stop. It signs in and saves every project with its modules and activities into the config:
  ```bash
  node "<plugin>/scripts/post-timesheet.mjs" --save-options
  ```
- `defaultProject` and `projectRules` are optional; they are only used when no project is given (step 1).

## 1. Parse the arguments

- **`clear`** as the only argument: delete today's time sheet instead of drafting one. Skip steps 2 to 4. Do the dependency install from step 5, then give the user this command to run in their own terminal, and stop:
  ```bash
  node "<plugin>/scripts/post-timesheet.mjs" --clear --headed
  ```
  Say plainly that it deletes **every** entry on today's zOffice page, including ones added by hand, and that this cannot be undone. It deletes straight away, with no prompt, and prints each entry it removes. Today's entries file in `~/.zone-work-log/entries/` is kept, so the same entries can be posted again with the normal command. Never run it yourself.

- **Date**: the first `YYYY-MM-DD` in `$ARGUMENTS`, otherwise today.
- **Breaks**: each `--break <from>-<to>` (it may repeat). Accept 12- or 24-hour times with or without a space or minutes: `1:00 PM-1:45 PM`, `1pm-1:45pm`, `13:00-13:45`. A break whose end is not after its start, or that you cannot read, is an error: say which one and stop. Remove each `--break` and its range before reading the project.
- **Start**: `--start <time>` (once), the time the user arrived and started working, in the same formats (`9:15 AM`, `9:15am`, `09:15`). It is an error if it repeats or cannot be read. Remove it before reading the project.
- **Work from home**: `--wfh` marks every entry as Work From Home. Remove it before reading the project.
- **Times without AM/PM** (in `--start` or `--break`): read 7 to 11 as AM and 12 and 1 to 6 as PM (`--break 12:30 - 1:00` is 12:30 PM to 1:00 PM), and say how you read them.
- **Project**: the rest of `$ARGUMENTS`. Match it to a project key in `options`, ignoring case and spacing, and allowing a partial name ("acme" matches "zOne Acme" when it is the only key containing it). An exact match wins over a partial one. If it matches several keys, list them and stop; if it matches none, say so, list the closest keys, and stop.
- **No project given**: pick the project per entry with `projectRules`, then `defaultProject`. If neither exists, ask the user for the project and stop.

Every entry uses the matched project.

## 2. Collect sessions

Run:

```
node "${CLAUDE_PLUGIN_ROOT}/scripts/collect-sessions.mjs" <date>
```

If `${CLAUDE_PLUGIN_ROOT}` is not expanded, find the script with Glob `**/zone-work-log/scripts/collect-sessions.mjs` under `~/.claude/plugins/`.

The output lists each session's title, folder (`cwd`), active `segments` (local 24h time, split on 20+ minute pauses) and the user's prompts with times. If it is empty, say so and stop.

## 3. Draft the entries

Read the prompts and turn the day into entries:

- **Times** come from `segments`. Round to 5 minutes. Entries must not overlap: when sessions ran in parallel, merge them into one slot and describe both pieces of work.
- **No gaps**: the entries run back to back from the first entry's start to the last entry's end. Each entry ends where the next one starts, so a pause between sessions belongs to the entry before it. Fold slots shorter than 10 minutes into a neighbour, preferring the one on the same task, instead of dropping them. The only gaps left are breaks (below).
- **Start** (step 1): the day's first entry starts at the `--start` time, because sessions only show when Claude was in use, not when the user started work. If `--start` is earlier than the first entry, move that entry's start back to it, keeping its task and description (work before the first session counts toward it). If `--start` is later, drop entries that end before it and move the start of the one that spans it forward. Without `--start`, the first entry starts with the first session as before.
- **Breaks** (step 1, applied after Start): no entry may cover any part of a break, even if a session was active then. Cut the break out of every slot: a slot that spans a break becomes two entries, before and after it, each with its own description; a slot left inside a break disappears. Apply the 10-minute rule after cutting. zOffice has no break activity and only filed entries count as working hours, so a break is never an entry of its own.
- **Activity**: choose it yourself from what was done in that slot, using only the project's `activities` labels. For example: fixing a reported bug → a bug-fixing activity; building or changing a feature → coding; writing or running Playwright suites → automation testing; designing test cases → test case preparation; reading code to understand a problem → investigation or exploration; reviewing code or a PR → review; writing a PRD or docs → documentation. When nothing fits, use the closest general label (for example other or misc activities). Never ask the user to pick.
- **Module**: choose it the same way from the screen or feature the work touched, using only the project's `modules` labels. When none fits, use a general module if the list has one; leave it out when the list is empty.
- **Description**: one or two plain sentences of what was done and the outcome (bug numbers, feature, screen). No file paths, no internal tool names. It is posted exactly as written.
- Times use zOffice's format: `9:40 AM`, `2:05 PM`.

## 4. List them and wait for confirmation

Post in chat, before anything is saved:

1. **Entries**: a numbered table (#, Start, End, Module, Activity, Description) with the project and the total hours, and whether the entries are marked Work From Home. Show each break as an unnumbered **Break** row in its time position (it is not posted and does not count toward the total). When `--start` moved the first entry, say so under the table, with the session start it replaced.
2. **Activities**: every label in the project's `activities`, marking the ones the entries use, so the user can swap one by number ("3 → <activity>").

Ask the user to confirm or edit. Apply their edits, post the updated table, and ask again. Do not write the entries file or give the run command until the user clearly confirms. Nothing reaches zOffice without that confirmation, because the posting script only reads the file.

## 5. Save and hand over the command

Write the confirmed entries as a JSON array to `~/.zone-work-log/entries/<date>.json` (create the folder if needed; overwrite an existing file for that date):

```json
[{ "project": "<project>", "module": "<module>", "activity": "<activity>", "start": "9:40 AM", "end": "10:30 AM", "description": "...", "workFromHome": false }]
```

Set `workFromHome` to `true` on every entry when `--wfh` was given, or when the user asked for it while editing; otherwise `false`.

If `${CLAUDE_PLUGIN_ROOT}/scripts/node_modules/playwright-core` is missing, run `npm install --no-audit --no-fund` in `${CLAUDE_PLUGIN_ROOT}/scripts` (this needs no credentials). The script drives the installed Google Chrome; no browser download.

zOffice only adds to today's page, so if the date is not today, say the file was written and that the entries must be posted on that day's page by hand.

Otherwise give the user this command, with the real plugin path filled in, and stop. With no file argument the script posts today's file from `~/.zone-work-log/entries/`, so the command is the same every day:

```bash
node "<plugin>/scripts/post-timesheet.mjs" --headed
```

The script signs in, opens Time Sheet, fills Project, Module, Activity, times, description and Work From Home for each entry, and submits it. It reads credentials only from the `ZOFFICE_USERNAME` and `ZOFFICE_PASSWORD` environment variables. If the user has not set them, show how, with placeholders only (PowerShell: `setx ZOFFICE_USERNAME "<username>"` and `setx ZOFFICE_PASSWORD "<password>"`, then open a new terminal; macOS/Linux: `export` lines in their shell profile). `--headed` shows the browser. It prints `ADDED` or `FAILED` per entry; a failure (for example an overlapping time the server rejects) does not stop the rest. At the end it reloads the page and prints how much is filed today and this week against the minimums (6 hours a day, 40 hours a week) and how much more is needed. These totals come from zOffice's own Time Effort and Weekly Effort, so entries filed by hand count too. If they paste the output back, help fix the failed entries and write a file with only those, passed as the script's first argument to rerun.
