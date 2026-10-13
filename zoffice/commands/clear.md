---
description: "zOffice - delete every entry on today's zOffice Daily Activities time sheet"
---

# Clear today's zOffice time sheet

**Credentials:** never ask for, accept, store or type the zOffice password, and never run `post-timesheet.mjs` yourself. The user runs it in their own terminal.

1. If `~/.zone-work-log/config.json` is missing or has no `baseUrl`, tell the user to run `/zoffice:log` first to set it up, and stop.
2. If `${CLAUDE_PLUGIN_ROOT}/scripts/node_modules/playwright-core` is missing, run `npm install --no-audit --no-fund` in `${CLAUDE_PLUGIN_ROOT}/scripts` (this needs no credentials). If `${CLAUDE_PLUGIN_ROOT}` is not expanded, find the plugin with Glob `**/zoffice/scripts/post-timesheet.mjs` under `~/.claude/plugins/`.
3. Give the user this command, with the real plugin path filled in, and stop:
   ```bash
   node "<plugin>/scripts/post-timesheet.mjs" --clear --headed
   ```

Say plainly that it deletes **every** entry on today's zOffice page, including ones added by hand, and that this cannot be undone. It deletes straight away, with no prompt, and prints each entry it removes. Today's entries file in `~/.zone-work-log/entries/` is kept, so the same entries can be posted again with `/zoffice:log`. It reads credentials only from the `ZOFFICE_USERNAME` and `ZOFFICE_PASSWORD` environment variables; if the user has not set them, show how with placeholders only (PowerShell: `setx ZOFFICE_USERNAME "<username>"` and `setx ZOFFICE_PASSWORD "<password>"`, then open a new terminal). Never run it yourself.
