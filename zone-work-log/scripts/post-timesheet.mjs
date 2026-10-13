// Signs in to zOffice, opens Time Sheet and adds each entry from a JSON file
// to today's Daily Activities. Run it yourself; credentials never go through Claude.
//
// Usage: node post-timesheet.mjs [entries.json] [--headed]
//        node post-timesheet.mjs --save-options [--headed]
//        node post-timesheet.mjs --clear [--headed]
//   --clear deletes every entry on today's page, printing each one it removes.
//   Without entries.json it posts today's ~/.zone-work-log/entries/<YYYY-MM-DD>.json.
//   Credentials come only from the ZOFFICE_USERNAME / ZOFFICE_PASSWORD environment variables.
//   --save-options records every Project with its Module and Activity labels into the config.
// Config (~/.zone-work-log/config.json, outside the repo): { "baseUrl": "https://<host>/zOffice", ... }
// Entry: { "project": "...", "module": "...", "activity": "...",
//          "start": "9:40 AM", "end": "10:30 AM", "description": "...", "workFromHome": false }
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { chromium } from 'playwright-core';

const CONFIG_PATH = path.join(os.homedir(), '.zone-work-log', 'config.json');
const MIN_DAILY_MINUTES = 6 * 60;
const MIN_WEEKLY_MINUTES = 40 * 60;
const USAGE = 'Usage: node post-timesheet.mjs [entries.json] [--headed]\n' +
  '       node post-timesheet.mjs --save-options [--headed]\n' +
  '       node post-timesheet.mjs --clear [--headed]';

const args = process.argv.slice(2);
const isHeaded = args.includes('--headed');
const isSaveOptions = args.includes('--save-options');
const isClear = args.includes('--clear');
const positional = args.filter(a => !['--headed', '--save-options', '--clear'].includes(a));
const today = new Date();
const todayDate = `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, '0')}-${String(today.getDate()).padStart(2, '0')}`;
const entriesPath = isSaveOptions || isClear ? null
  : positional.shift() || path.join(path.dirname(CONFIG_PATH), 'entries', `${todayDate}.json`);
const { ZOFFICE_USERNAME: username, ZOFFICE_PASSWORD: password } = process.env;

// Extra arguments are rejected so a password typed on the command line never gets used (or kept in history unnoticed).
if ((isSaveOptions && isClear) || positional.length) {
  console.error(USAGE);
  process.exit(1);
}
if (!username || !password) {
  console.error('Set the ZOFFICE_USERNAME and ZOFFICE_PASSWORD environment variables first.');
  process.exit(1);
}
if (!fs.existsSync(CONFIG_PATH)) {
  console.error(`Missing ${CONFIG_PATH}. Create it with { "baseUrl": "https://<host>/zOffice" }.`);
  process.exit(1);
}
const config = JSON.parse(fs.readFileSync(CONFIG_PATH, 'utf8'));
if (!config.baseUrl) {
  console.error(`Set "baseUrl" (for example "https://<host>/zOffice") in ${CONFIG_PATH}.`);
  process.exit(1);
}
const baseUrl = config.baseUrl.replace(/\/+$/, '');

if (entriesPath && !fs.existsSync(entriesPath)) {
  console.error(`No entries file at ${entriesPath}. Run /zone-work-log:log <project> first.`);
  process.exit(1);
}
const entries = entriesPath === null ? [] : JSON.parse(fs.readFileSync(entriesPath, 'utf8'));
const timePattern = /^\d{1,2}:\d{2} (AM|PM)$/;
for (const entry of entries) {
  if (!entry.project || !entry.activity || !timePattern.test(entry.start) || !timePattern.test(entry.end)) {
    throw new Error(`Invalid entry (needs project, activity, start/end like "9:40 AM"): ${JSON.stringify(entry)}`);
  }
}

// Module and Activity options load after Project changes, so wait for the exact label to appear.
async function selectByLabel(page, selectId, label) {
  await page.waitForFunction(
    ([id, text]) => [...document.getElementById(id).options].some(o => o.text.trim() === text),
    [selectId, label], { timeout: 10000 },
  ).catch(() => { throw new Error(`"${label}" is not an option in #${selectId}`); });
  await page.selectOption(`#${selectId}`, { label });
}

async function setTime(page, inputId, time) {
  await page.evaluate(([id, value]) => {
    const $input = window.jQuery(`#${id}`);
    if ($input.timepicker) $input.timepicker('setTime', value);
    $input.val(value).trigger('change');
  }, [inputId, time]);
}

// Resolves with the alert text, or null when the modal closed without an alert.
async function waitForSaveOutcome(page) {
  const deadline = Date.now() + 15000;
  while (Date.now() < deadline) {
    const alert = page.locator('.swal2-popup:visible, .sweet-alert:visible').first();
    if (await alert.count()) {
      const text = (await alert.innerText()).trim();
      await page.locator('.swal2-confirm:visible, .sweet-alert button.confirm:visible').first().click().catch(() => {});
      return text;
    }
    if (!(await page.locator('#btn_addupdatesub').isVisible())) return null;
    await page.waitForTimeout(300);
  }
  throw new Error('No response after clicking Add (a required field may be empty)');
}

const toMinutes = hhmm => {
  const [hours, minutes] = String(hhmm).split(':').map(Number);
  return hours * 60 + minutes;
};
const toHoursText = totalMinutes => `${Math.floor(totalMinutes / 60)}h ${String(totalMinutes % 60).padStart(2, '0')}m`;

// Reads the Time Effort / Weekly Effort totals zOffice computes from every filed
// entry (added by hand or by this script), so the shortfall reflects the real time sheet.
async function printRemainingHours(page) {
  await page.reload();
  await page.waitForLoadState('networkidle');
  const dailyMinutes = toMinutes(await page.inputValue('#timeEffort'));
  const weeklyMinutes = toMinutes(await page.inputValue('#weeklyHours'));
  const report = (name, filed, minimum) => {
    const remaining = minimum - filed;
    console.log(`${name}: ${toHoursText(filed)} filed of ${toHoursText(minimum)} minimum` +
      (remaining > 0 ? ` - ${toHoursText(remaining)} more needed` : ' - minimum met'));
  };
  console.log('');
  report('Today', dailyMinutes, MIN_DAILY_MINUTES);
  report('This week', weeklyMinutes, MIN_WEEKLY_MINUTES);
}

async function closeAddModal(page) {
  await page.locator('#addDailyActivity .close:visible, .modal.show .close:visible').first().click().catch(() => {});
}

// Reads the dropdown labels the logged-in user can pick, so the plugin carries no client list itself.
async function saveOptions(page) {
  const optionLabels = id => page.$$eval(`#${id} option`,
    options => options.map(o => o.text.trim()).filter(text => text && text !== '--Select--'));
  await page.click('#btn_Add');
  await page.locator('#ddlproject').waitFor({ state: 'visible' });
  const options = {};
  for (const project of await optionLabels('ddlproject')) {
    await page.selectOption('#ddlproject', { label: project });
    // The Project change handler loads Module/Activity with jQuery AJAX.
    await page.waitForFunction(() => window.jQuery.active === 0, null, { timeout: 15000 });
    options[project] = { modules: await optionLabels('ddlmodule'), activities: await optionLabels('ddlActivity') };
  }
  await closeAddModal(page);
  fs.writeFileSync(CONFIG_PATH, JSON.stringify({ ...config, options }, null, 2));
  console.log(`Saved ${Object.keys(options).length} projects to ${CONFIG_PATH}`);
}

async function postEntries(page) {
  let failedCount = 0;
  for (const entry of entries) {
    const label = `${entry.start}-${entry.end} ${entry.project} / ${entry.activity}`;
    try {
      await page.click('#btn_Add');
      await page.locator('#ddlproject').waitFor({ state: 'visible' });
      await selectByLabel(page, 'ddlproject', entry.project);
      if (entry.module) await selectByLabel(page, 'ddlmodule', entry.module);
      await selectByLabel(page, 'ddlActivity', entry.activity);
      await setTime(page, 'start_timepicker', entry.start);
      await setTime(page, 'end_timepicker', entry.end);
      await page.fill('#description', entry.description || '');
      await page.setChecked('#isWorkfromhome', Boolean(entry.workFromHome));
      await page.click('#btn_addupdatesub');

      const alertText = await waitForSaveOutcome(page);
      const isSaved = alertText === null || /success|added|saved/i.test(alertText);
      if (!isSaved) throw new Error(alertText);
      console.log(`ADDED   ${label}`);
      await page.waitForLoadState('networkidle');
    } catch (error) {
      failedCount++;
      console.log(`FAILED  ${label}: ${error.message.split('\n')[0]}`);
      await closeAddModal(page);
    }
  }
  console.log(`${entries.length - failedCount} of ${entries.length} entries added.`);
  await printRemainingHours(page);
  return failedCount;
}

// Deletes every entry on today's Daily Activities page, one row at a time (the page's Delete
// works on the selected row).
async function clearTodayEntries(page) {
  const entryRows = page.locator('table.table-hover tbody tr:has(input)');
  const filed = await entryRows.evaluateAll(rows => rows.map(row =>
    [...row.cells].slice(1).map(cell => cell.innerText.trim().replace(/\s+/g, ' '))));
  if (!filed.length) {
    console.log('No entries on today\'s page; nothing to delete.');
    return 0;
  }
  console.log(`Deleting today's entries (${filed.length}):`);
  // Columns after Select: Project, Module, Activity, Start Time, End Time, Total Effort, Description.
  for (const [project, module, activity, start, end, , description] of filed) {
    console.log(`  ${start}-${end}  ${project} / ${module} / ${activity}  ${description}`);
  }

  const alertConfirmButton = page.locator('.sweet-alert:visible button.confirm, .swal2-confirm:visible').first();
  const countEntryRows = () => entryRows.count().catch(() => Number.POSITIVE_INFINITY); // mid-reload
  let failedCount = 0;
  for (let remaining = filed.length; remaining > 0; remaining--) {
    try {
      const rowsBefore = await countEntryRows();
      // The Select radio is transparent and covered by a styled check mark, so click the row's
      // Project cell instead; the row's own click handler ticks the radio and enables Delete.
      await entryRows.first().locator('td').nth(1).click();
      await page.locator('#btn_Delete:enabled').waitFor({ timeout: 5000 });
      await page.click('#btn_Delete');
      // Keep pressing the alert's button until the row is gone: "Yes, Delete !" first, then the
      // OK on "Daily activity deleted", which is what makes the page reload its list.
      const deadline = Date.now() + 20000;
      while ((await countEntryRows()) >= rowsBefore) {
        if (Date.now() > deadline) throw new Error('the row was still listed 20 s after confirming');
        await alertConfirmButton.click({ timeout: 500 }).catch(() => {});
        await page.waitForTimeout(300);
      }
      await alertConfirmButton.click({ timeout: 1000 }).catch(() => {}); // a success alert left open
      console.log(`DELETED ${remaining - 1} left`);
    } catch (error) {
      failedCount++;
      console.log(`FAILED  to delete a row: ${error.message.split('\n')[0]}`);
      break; // the page is in an unknown state; stop rather than click the wrong row
    }
  }
  await printRemainingHours(page);
  return failedCount;
}

const browser = await chromium.launch({ channel: 'chrome', headless: !isHeaded });
const page = await browser.newPage();
let failedCount = 0;
try {
  await page.goto(`${baseUrl}/Account/Login`);
  await page.fill('#UserName', username);
  await page.fill('#Password', password);
  await page.click('input[type="submit"]');
  await page.waitForLoadState('networkidle');
  if (/\/Account\/Login/i.test(page.url())) throw new Error('Login failed: check the username and password');

  await page.getByText('Time Sheet', { exact: true }).first().click();
  await page.waitForURL(/DailyActivity\/ListDailyActivities/i);
  await page.waitForLoadState('networkidle');

  if (isSaveOptions) await saveOptions(page);
  else if (isClear) failedCount = await clearTodayEntries(page);
  else failedCount = await postEntries(page);
} finally {
  await browser.close();
}
process.exit(failedCount ? 1 : 0);
