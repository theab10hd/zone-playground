// Renders a test report PDF from report data in one fixed design, so every report looks the same.
// It uses the Chromium that @playwright/test already installed, so the plugin adds no dependency.
// Run it from the project's Playwright folder so the package resolves.
// Usage: node render-report.mjs <report.json> <report.pdf>
// The data format is documented by example in sample-report.json next to this file.
import { createRequire } from 'node:module';
import { readFileSync, writeFileSync, mkdirSync, rmSync } from 'node:fs';
import { pathToFileURL, fileURLToPath } from 'node:url';
import path from 'node:path';
import os from 'node:os';

const [jsonPath, pdfPath] = process.argv.slice(2);
if (!jsonPath || !pdfPath) {
    console.error('Usage: node render-report.mjs <report.json> <report.pdf>');
    process.exit(1);
}

const r = JSON.parse(readFileSync(jsonPath, 'utf8'));

// Brand mark for the first page; embedded so the temp HTML has no file dependency
const logoDataUri = `data:image/png;base64,${readFileSync(path.join(path.dirname(fileURLToPath(import.meta.url)), '../assets/logo.png')).toString('base64')}`;

// ---- validate: refuse to render a report that would differ in shape ----
const RESULTS = ['passed', 'skipped', 'failed', 'blocked', 'notRun'];
const KINDS = ['app', 'data', 'perf', 'test'];
const errors = [];
const need = (cond, msg) => { if (!cond) errors.push(msg); };
const str = v => typeof v === 'string' && v.trim() !== '';
const arr = v => Array.isArray(v);

need(str(r.title), 'title is required');
need(str(r.feature), 'feature is required');
need(str(r.date), 'date is required');
need(str(r.summary), 'summary is required');
need(str(r.narrative), 'narrative is required');
need(r.scope && str(r.scope.suite) && str(r.scope.project) && str(r.scope.mode) && str(r.scope.duration) && r.scope.workers != null,
    'scope needs suite, project, workers, mode and duration');
need(Number.isInteger(r.planned) && r.planned >= 0, 'planned must be the --list count');
need(arr(r.groups) && r.groups.length > 0, 'groups must list at least one describe group');
for (const [gi, g] of (r.groups ?? []).entries()) {
    need(str(g.title), `groups[${gi}].title is required`);
    need(arr(g.cases) && g.cases.length > 0, `groups[${gi}].cases must not be empty`);
    for (const [ci, c] of (g.cases ?? []).entries()) {
        const at = `groups[${gi}].cases[${ci}]`;
        need(str(c.id) && str(c.checks), `${at} needs id and checks`);
        need(RESULTS.includes(c.result), `${at}.result must be one of ${RESULTS.join(', ')}`);
        need(c.result !== 'skipped' || str(c.reason), `${at} is skipped, so it needs a reason`);
        need(c.result !== 'blocked' || str(c.reason), `${at} is blocked, so it needs a reason`);
    }
}
for (const key of ['findings', 'runData', 'fixes', 'gaps']) need(arr(r[key]), `${key} must be an array (use [] when empty)`);
for (const [i, f] of (r.findings ?? []).entries()) {
    need(KINDS.includes(f.kind), `findings[${i}].kind must be one of ${KINDS.join(', ')}`);
    need(str(f.title) && str(f.body), `findings[${i}] needs title and body`);
}
for (const [i, d] of (r.runData ?? []).entries()) need(str(d.title) && arr(d.rows), `runData[${i}] needs title and rows`);
for (const [i, f] of (r.fixes ?? []).entries()) need(str(f.file) && str(f.cause) && str(f.change), `fixes[${i}] needs file, cause and change`);
need(r.rerun && str(r.rerun.cwd) && arr(r.rerun.commands) && r.rerun.commands.length > 0,
    'rerun needs cwd and at least one command');

if (errors.length) {
    console.error('Report data is invalid:\n- ' + errors.join('\n- '));
    process.exit(1);
}

// ---- derive counts from the case rows, so the tiles always match the tables ----
const cases = r.groups.flatMap(g => g.cases);
const count = Object.fromEntries(RESULTS.map(k => [k, cases.filter(c => c.result === k).length]));
count.notRun += Math.max(0, r.planned - cases.length);
const preliminary = count.notRun > 0;
const title = (preliminary ? 'PRELIMINARY · ' : '') + r.title;

// ---- html ----
const esc = s => String(s ?? '').replace(/[&<>"']/g, ch => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[ch]);
const md = s => esc(s).replace(/`([^`]+)`/g, '<code>$1</code>'); // `code` spans only
const PILL = { passed: ['pass', 'Passed'], skipped: ['skip', 'Skipped'], failed: ['fail', 'Failed'], blocked: ['grey', 'Blocked'], notRun: ['grey', 'Not run'] };
const KIND = { app: 'App defect', data: 'Data', perf: 'Performance', test: 'Test defect' };
const pill = res => `<span class="pill ${PILL[res][0]}">${PILL[res][1]}</span>`;
const list = items => `<ul>${items.map(i => `<li>${md(i)}</li>`).join('')}</ul>`;
const section = (h, body) => `<section><h2>${esc(h)}</h2>${body}</section>`;
const none = text => `<p class="note">${esc(text)}</p>`;

const caseRows = r.groups.map(g =>
    `<tr class="group"><td colspan="4">${md(g.title)}</td></tr>` +
    g.cases.map(c => `<tr><td class="id">${esc(c.id)}</td><td>${md(c.checks)}${c.reason ? `<span class="why">${md(c.reason)}</span>` : ''}</td><td>${pill(c.result)}</td><td class="time">${esc(c.time || '–')}</td></tr>`).join('')
).join('');

const tile = (cls, n, label) => `<div class="tile ${cls}"><span class="n">${n}</span><span class="l">${esc(label)}</span></div>`;
const initial = r.initial
    ? `<p class="note">Initial run: ${RESULTS.filter(k => r.initial[k] != null).map(k => `${r.initial[k]} ${PILL[k][1].toLowerCase()}`).join(' · ')}. Final run: ${RESULTS.map(k => `${count[k]} ${PILL[k][1].toLowerCase()}`).join(' · ')}.</p>`
    : '';

const findingHtml = f => {
    const extra = [
        f.evidence && `<dt>Evidence</dt><dd>${md(f.evidence)}</dd>`,
        f.expected && `<dt>Expected</dt><dd>${md(f.expected)}</dd>`,
        f.actual && `<dt>Actual</dt><dd>${md(f.actual)}</dd>`,
        f.impact && `<dt>Impact</dt><dd>${md(f.impact)}</dd>`,
    ].filter(Boolean).join('');
    return `<article class="finding ${f.kind}"><span class="sev">${esc(KIND[f.kind])}${f.tag ? ' · ' + esc(f.tag) : ''}</span><h3>${md(f.title)}</h3><p>${md(f.body)}</p>` +
        (extra ? `<dl>${extra}</dl>` : '') +
        (arr(f.steps) && f.steps.length ? `<p class="label">Steps to reproduce</p><ol>${f.steps.map(s => `<li>${md(s)}</li>`).join('')}</ol>` : '') +
        (arr(f.items) && f.items.length ? `<p class="label">Affected (${f.items.length})</p><p class="mono">${f.items.map(esc).join(', ')}</p>` : '') +
        `</article>`;
};
const appFindings = r.findings.filter(f => f.kind !== 'test');
const testFindings = r.findings.filter(f => f.kind === 'test');

const featureMap = arr(r.featureMap) && r.featureMap.length
    ? section('Feature map', `${r.featureMapSource ? `<p class="note">Source: ${esc(r.featureMapSource)}</p>` : ''}<div class="cols">${r.featureMap.map(l => `<div class="card"><h3>${md(l.layer)}</h3>${list(l.items ?? [])}</div>`).join('')}</div>`)
    : '';
const designed = arr(r.designedCases) && r.designedCases.length
    ? section('Designed test cases', `<div class="table-wrap"><table><thead><tr><th>Id</th><th>Group</th><th>What it checks</th><th>Layer</th><th>Type</th></tr></thead><tbody>${r.designedCases.map(d => `<tr><td class="id">${esc(d.id)}</td><td>${md(d.group)}</td><td>${md(d.checks)}</td><td>${esc(d.layer)}</td><td>${esc(d.type)}</td></tr>`).join('')}</tbody></table></div>`)
    : '';

const html = `<!doctype html><html lang="en"><head><meta charset="utf-8"><title>${esc(title)}</title><style>
:root { --bg:#ffffff; --surface:#ffffff; --fg:#1b2420; --muted:#5d6b64; --line:#dde3df; --accent:#1f6f5c;
  --pass:#1e7a46; --pass-bg:#e3f3e8; --skip:#8a6a12; --skip-bg:#f7efd6; --fail:#b3261e; --fail-bg:#fbe5e3;
  --grey:#5d6b64; --grey-bg:#eceeed; --code-bg:#eef1ef;
  --display:"Segoe UI Semibold","Segoe UI",system-ui,sans-serif; --body:"Segoe UI",system-ui,sans-serif; --mono:Consolas,ui-monospace,monospace; }
* { box-sizing:border-box; -webkit-print-color-adjust:exact; print-color-adjust:exact; }
body { margin:0; background:var(--bg); color:var(--fg); font:10.5pt/1.55 var(--body); }
.page { display:grid; gap:26px; }
h1,h2 { font-family:var(--display); margin:0; letter-spacing:-0.01em; }
h1 { font-size:22pt; line-height:1.15; } h2 { font-size:14pt; } h3 { font-size:10.5pt; margin:0; font-weight:600; }
h2 { break-after:avoid; }
p { margin:0; }
code,.mono { font-family:var(--mono); font-size:0.88em; }
code { background:var(--code-bg); padding:1px 4px; border-radius:3px; overflow-wrap:anywhere; word-break:break-word; }
.eyebrow { font:600 8pt var(--mono); text-transform:uppercase; letter-spacing:0.08em; color:var(--accent); }
.preliminary { color:var(--fail); }
header { display:grid; gap:10px; position:relative; }
/* First-page badge: only the eyebrow and title share its rows, so only they leave room for it */
header > .eyebrow, header h1 { padding-right:150px; }
.brand { position:absolute; top:0; right:0; display:flex; align-items:center; gap:5px; }
.brand img { width:22px; height:22px; border-radius:4px; }
.brand .made { display:grid; line-height:1.1; color:#2b2f33; }
.brand .made small { font-size:5.5pt; }
.brand .made strong { font:600 7.5pt var(--display); }
.meta { display:flex; flex-wrap:wrap; gap:4px 18px; color:var(--muted); font-size:9pt; }
.verdict { display:grid; grid-template-columns:repeat(5,1fr); gap:10px; }
.tile { border:1px solid var(--line); border-radius:7px; padding:10px 12px; display:grid; gap:2px; break-inside:avoid; }
.tile .n { font:700 20pt/1 var(--display); font-variant-numeric:tabular-nums; }
.tile .l { color:var(--muted); font-size:8.5pt; }
.tile.pass .n { color:var(--pass); } .tile.skip .n { color:var(--skip); } .tile.fail .n { color:var(--fail); } .tile.grey .n { color:var(--grey); }
section { display:grid; gap:12px; }
.note { color:var(--muted); font-size:9.5pt; }
.label { font-weight:600; font-size:9pt; }
.table-wrap { border:1px solid var(--line); border-radius:7px; overflow:hidden; }
table { width:100%; border-collapse:collapse; font-size:9pt; }
thead { display:table-header-group; } tr { break-inside:avoid; }
th,td { text-align:left; padding:6px 10px; border-bottom:1px solid var(--line); vertical-align:top; }
th { font:600 7.5pt var(--mono); text-transform:uppercase; letter-spacing:0.06em; color:var(--muted); background:var(--surface); }
tr:last-child td { border-bottom:0; }
tr.group td { font-weight:600; font-size:8.5pt; color:var(--accent); background:var(--code-bg); }
td.id { font-family:var(--mono); white-space:nowrap; font-weight:600; }
td.time { font-family:var(--mono); white-space:nowrap; color:var(--muted); text-align:right; }
.pill { display:inline-block; font:600 7.5pt var(--mono); text-transform:uppercase; letter-spacing:0.05em; padding:1px 7px; border-radius:999px; white-space:nowrap; }
.pill.pass { color:var(--pass); background:var(--pass-bg); } .pill.skip { color:var(--skip); background:var(--skip-bg); }
.pill.fail { color:var(--fail); background:var(--fail-bg); } .pill.grey { color:var(--grey); background:var(--grey-bg); }
.why { display:block; color:var(--muted); font-size:8.5pt; margin-top:2px; }
.findings { display:grid; gap:10px; }
.finding { border:1px solid var(--line); border-left:4px solid var(--fail); border-radius:7px; padding:10px 14px; display:grid; gap:6px; break-inside:avoid; }
.finding.data { border-left-color:var(--skip); } .finding.perf { border-left-color:var(--accent); } .finding.test { border-left-color:var(--grey); }
.finding .sev { font:600 7.5pt var(--mono); text-transform:uppercase; letter-spacing:0.06em; color:var(--muted); }
ul,ol { margin:0; padding-left:18px; display:grid; gap:3px; }
/* Feature map and run data cards stack full width; side-by-side cards overlapped on long code paths. */
.cols { display:flex; flex-direction:column; gap:10px; }
.card { border:1px solid var(--line); border-radius:7px; padding:10px 14px; min-width:0; overflow-wrap:anywhere; }
.card > * + * { margin-top:6px; } .card h3 { break-after:avoid; } .card li, .card dt, .card dd { break-inside:avoid; }
dl { margin:0; display:grid; grid-template-columns:auto 1fr; gap:3px 12px; font-size:9pt; }
dt { color:var(--muted); } dd { margin:0; min-width:0; overflow-wrap:anywhere; }
pre { margin:0; background:var(--code-bg); border-radius:5px; padding:8px 10px; font:8.5pt/1.5 var(--mono); white-space:pre-wrap; overflow-wrap:anywhere; }
</style></head><body><div class="page">
<header>
  <div class="brand"><img src="${logoDataUri}" alt="zOne logo"><span class="made"><small>Made With</small><strong>zOne Playground.</strong></span></div>
  <span class="eyebrow">Playwright E2E · ${esc(r.feature)} · ${esc(r.date)}</span>
  ${preliminary ? `<span class="eyebrow preliminary">Preliminary: ${count.notRun} of ${r.planned} planned cases were not run</span>` : ''}
  <h1>${esc(title)}</h1>
  <p>${md(r.summary)}</p>
  <div class="meta">
    <span>Suite: <code>${esc(r.scope.suite)}</code></span>
    <span>Project: <code>${esc(r.scope.project)}</code></span>
    <span>${esc(r.scope.workers)} worker${r.scope.workers == 1 ? '' : 's'}, ${esc(r.scope.mode)}</span>
    <span>Duration: ${esc(r.scope.duration)}</span>
  </div>
</header>
<section aria-label="Result summary">
  <div class="verdict">
    ${tile('pass', count.passed, 'passed')}
    ${tile('skip', count.skipped, 'skipped')}
    ${tile('fail', count.failed, 'failed')}
    ${tile('grey', count.blocked + count.notRun, 'blocked or not run')}
    ${tile('', `${count.passed}/${r.planned}`, 'planned cases verified')}
  </div>
  <p class="note">${md(r.narrative)}</p>
  ${initial}
</section>
${featureMap}
${section('Case results', `<div class="table-wrap"><table><thead><tr><th>Case</th><th>What it checks</th><th>Result</th><th style="text-align:right">Time</th></tr></thead><tbody>${caseRows}</tbody></table></div>`)}
${designed}
${section('Findings', appFindings.length ? `<div class="findings">${appFindings.map(findingHtml).join('')}</div>` : none('No application defects, data issues or performance problems were confirmed.'))}
${testFindings.length ? section('Test defects', `<div class="findings">${testFindings.map(findingHtml).join('')}</div>`) : ''}
${section('Run data', r.runData.length ? `<div class="cols">${r.runData.map(d => `<div class="card"><h3>${md(d.title)}</h3><dl>${d.rows.map(([k, v]) => `<dt>${md(k)}</dt><dd>${md(v)}</dd>`).join('')}</dl></div>`).join('')}</div>` : none('No run data recorded.'))}
${section('Test fixes', r.fixes.length ? `<div class="table-wrap"><table><thead><tr><th>File</th><th>Cause</th><th>Change</th><th>Why</th></tr></thead><tbody>${r.fixes.map(f => `<tr><td class="mono">${esc(f.file)}</td><td>${md(f.cause)}</td><td>${md(f.change)}</td><td>${md(f.why)}</td></tr>`).join('')}</tbody></table></div>` : none('No test changes were needed.'))}
${section('Coverage gaps', r.gaps.length ? list(r.gaps) : none('No known gaps.'))}
${section('Rerun instructions', `<p class="note">From <code>${esc(r.rerun.cwd)}</code>${r.rerun.auth ? `. ${md(r.rerun.auth)}` : ''}</p><pre>${r.rerun.commands.map(esc).join('\n')}</pre>${arr(r.rerun.artifacts) && r.rerun.artifacts.length ? `<p class="label">Artifacts</p>${list(r.rerun.artifacts.map(a => '`' + a + '`'))}` : ''}`)}
</div></body></html>`;

// ---- pdf ----
const requireFromProject = createRequire(path.join(process.cwd(), 'package.json'));
let chromium;
for (const pkg of ['@playwright/test', 'playwright']) {
    try { ({ chromium } = requireFromProject(pkg)); break; } catch {}
}
if (!chromium) {
    console.error('Playwright not found. Run this from the folder that has @playwright/test installed.');
    process.exit(1);
}

const htmlPath = path.join(os.tmpdir(), `report-${process.pid}.html`);
writeFileSync(htmlPath, html);
mkdirSync(path.dirname(path.resolve(pdfPath)), { recursive: true });
const browser = await chromium.launch();
try {
    const page = await browser.newPage();
    await page.goto(pathToFileURL(htmlPath).href, { waitUntil: 'load' });
    await page.pdf({
        path: pdfPath,
        format: 'A4',
        printBackground: true,
        margin: { top: '14mm', bottom: '16mm', left: '12mm', right: '12mm' },
        displayHeaderFooter: true,
        headerTemplate: '<span></span>',
        footerTemplate: `<div style="font-size:8px;width:100%;padding:0 12mm;display:flex;justify-content:space-between;color:#888"><span>${esc(title)}</span><span>Page <span class="pageNumber"></span> of <span class="totalPages"></span></span></div>`,
    });
    console.log(`PDF written: ${path.resolve(pdfPath)}${preliminary ? ' (PRELIMINARY)' : ''}`);
} finally {
    await browser.close();
    rmSync(htmlPath, { force: true });
}
