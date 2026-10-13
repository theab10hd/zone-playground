// Prints the Claude Code sessions active on one local date as JSON:
// title, folder, active time segments and the user's prompts with times.
// Usage: node collect-sessions.mjs [YYYY-MM-DD]   (default: today)
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import readline from 'node:readline';

const IDLE_GAP_MINUTES = 20; // a longer pause splits a session into separate work segments
const MAX_PROMPTS = 25;

const pad = n => String(n).padStart(2, '0');
const localDate = d => `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
const clock = d => `${pad(d.getHours())}:${pad(d.getMinutes())}`;

const targetDate = process.argv[2] || localDate(new Date());
if (!/^\d{4}-\d{2}-\d{2}$/.test(targetDate)) throw new Error(`Date must be YYYY-MM-DD, got "${targetDate}"`);
const dayStart = new Date(`${targetDate}T00:00:00`);

const projectsDir = path.join(os.homedir(), '.claude', 'projects');
const sessions = new Map();

function promptText(message) {
  const content = typeof message?.content === 'string'
    ? message.content
    : (message?.content || []).filter(b => b.type === 'text').map(b => b.text).join('\n');
  const text = content.replace(/<system-reminder>[\s\S]*?<\/system-reminder>/g, '').trim();
  // Skip tool results, hook output and slash-command wrappers; keep what the user actually typed.
  if (!text || text.startsWith('<') || text.startsWith('[Request interrupted')) return null;
  return text.replace(/\s+/g, ' ').slice(0, 300);
}

for (const dir of fs.readdirSync(projectsDir, { withFileTypes: true })) {
  if (!dir.isDirectory()) continue;
  for (const file of fs.readdirSync(path.join(projectsDir, dir.name))) {
    if (!file.endsWith('.jsonl')) continue;
    const filePath = path.join(projectsDir, dir.name, file);
    if (fs.statSync(filePath).mtime < dayStart) continue; // untouched since before the day

    const lines = readline.createInterface({ input: fs.createReadStream(filePath) });
    for await (const line of lines) {
      let entry;
      try { entry = JSON.parse(line); } catch { continue; } // a partially written last line
      if (!entry.sessionId) continue;
      const session = sessions.get(entry.sessionId) || { sessionId: entry.sessionId, title: null, cwd: null, times: [], prompts: [] };
      sessions.set(entry.sessionId, session);
      if (entry.type === 'custom-title') session.title = entry.customTitle;
      if (entry.type !== 'user' && entry.type !== 'assistant') continue;
      const at = new Date(entry.timestamp);
      if (localDate(at) !== targetDate) continue;
      session.cwd ||= entry.cwd;
      session.times.push(at);
      if (entry.type === 'user' && !entry.isSidechain && !entry.isMeta && session.prompts.length < MAX_PROMPTS) {
        const text = promptText(entry.message);
        if (text) session.prompts.push({ time: clock(at), text });
      }
    }
  }
}

const report = [...sessions.values()]
  .filter(s => s.times.length)
  .map(s => {
    s.times.sort((a, b) => a - b);
    const segments = [];
    for (const t of s.times) {
      const last = segments.at(-1);
      if (last && t - last.end <= IDLE_GAP_MINUTES * 60000) last.end = t;
      else segments.push({ start: t, end: t });
    }
    return {
      sessionId: s.sessionId,
      title: s.title,
      cwd: s.cwd,
      segments: segments.map(g => ({ start: clock(g.start), end: clock(g.end) })),
      prompts: s.prompts,
    };
  })
  .sort((a, b) => a.segments[0].start.localeCompare(b.segments[0].start));

console.log(JSON.stringify({ date: targetDate, sessions: report }, null, 1));
