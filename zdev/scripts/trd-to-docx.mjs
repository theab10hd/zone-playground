// Convert a TRD Markdown file to DOCX in the house style (trd-style.mjs).
// Usage: node trd-to-docx.mjs <input.md> <output.docx>
import { existsSync, readFileSync, writeFileSync } from "node:fs";
import { basename, dirname, extname, resolve } from "node:path";
import { marked } from "marked";
import {
  AlignmentType, BorderStyle, Document, ExternalHyperlink, Footer, HeadingLevel, ImageRun, LevelFormat,
  Packer, PageNumber, Paragraph, ShadingType, Table, TableCell, TableRow, TextRun, WidthType,
} from "docx";
import * as S from "./trd-style.mjs";

const [input, output] = process.argv.slice(2);
if (!input || !output) {
  console.error("Usage: node trd-to-docx.mjs <input.md> <output.docx>");
  process.exit(1);
}

const warnings = [];
const warn = (msg) => warnings.includes(msg) || warnings.push(msg);
const decode = (s) =>
  s.replace(/&lt;/g, "<").replace(/&gt;/g, ">").replace(/&quot;/g, '"').replace(/&#39;/g, "'").replace(/&amp;/g, "&");
const plain = (tokens = []) => tokens.map((t) => (t.tokens ? plain(t.tokens) : decode(t.text ?? ""))).join("");
const version = JSON.parse(readFileSync(new URL("../.claude-plugin/plugin.json", import.meta.url), "utf8")).version;

// pixel size from the PNG IHDR or the JPEG SOFn header
function imageSize(buf) {
  if (buf.readUInt32BE(0) === 0x89504e47) return { width: buf.readUInt32BE(16), height: buf.readUInt32BE(20) };
  for (let i = 2; i + 9 < buf.length; i += 2 + buf.readUInt16BE(i + 2)) {
    const m = buf[i + 1];
    if (m >= 0xc0 && m <= 0xcf && m !== 0xc4 && m !== 0xc8 && m !== 0xcc)
      return { width: buf.readUInt16BE(i + 7), height: buf.readUInt16BE(i + 5) };
  }
  return null;
}

function image(t, style) {
  const fallback = (why) => {
    warn(`image "${t.href}" ${why}; rendered as text`);
    return new TextRun({ ...style, text: `[Image: ${t.text || t.href}]`, italics: true });
  };
  const type = { ".png": "png", ".jpg": "jpg", ".jpeg": "jpg" }[extname(t.href).toLowerCase()];
  if (!type || /^[a-z]+:/i.test(t.href)) return fallback("is not a local PNG/JPG");
  const file = resolve(dirname(input), decodeURI(t.href));
  if (!existsSync(file)) return fallback("not found");
  const data = readFileSync(file);
  const px = imageSize(data);
  if (!px) return fallback("has an unreadable size");
  const scale = Math.min(1, S.image.maxWidth / px.width, S.image.maxHeight / px.height);
  return new ImageRun({ type, data, altText: { name: t.text, description: t.text, title: t.text },
    transformation: { width: Math.round(px.width * scale), height: Math.round(px.height * scale) } });
}

// ---------- inline ----------
function runs(tokens = [], style = {}) {
  const out = [];
  for (const t of tokens) {
    switch (t.type) {
      case "strong": out.push(...runs(t.tokens, { ...style, bold: true })); break;
      case "em": out.push(...runs(t.tokens, { ...style, italics: true })); break;
      case "del": out.push(...runs(t.tokens, { ...style, strike: true })); break;
      case "codespan":
        out.push(new TextRun({
          ...style, text: decode(t.text), font: S.font.code, size: style.size ? style.size - 2 : S.size.body - 2,
          shading: { type: ShadingType.CLEAR, color: "auto", fill: S.color.codeFill },
        }));
        break;
      case "link":
        out.push(new ExternalHyperlink({
          link: t.href,
          children: runs(t.tokens, { ...style, color: S.color.link, underline: {} }),
        }));
        break;
      case "br": out.push(new TextRun({ ...style, break: 1 })); break;
      case "image": out.push(image(t, style)); break;
      case "html":
        if (/^<br\s*\/?>$/i.test(t.text.trim())) out.push(new TextRun({ ...style, break: 1 }));
        else if (!/^<!--/.test(t.text.trim())) warn(`raw HTML or unfilled <placeholder> dropped: ${t.text.trim().slice(0, 40)}`);
        break;
      default:
        if (t.tokens) out.push(...runs(t.tokens, style));
        else if (t.text) out.push(new TextRun({ ...style, text: decode(t.text) }));
    }
  }
  return out;
}

// ---------- blocks ----------
const headingLevels = [HeadingLevel.HEADING_1, HeadingLevel.HEADING_2, HeadingLevel.HEADING_3, HeadingLevel.HEADING_4];
let listInstance = 0;
let titleDone = false;
let docTitle = basename(input, ".md");

function blocks(tokens, ctx = { level: 0 }) {
  const out = [];
  for (const t of tokens) {
    switch (t.type) {
      case "heading":
        if (t.depth === 1 && !titleDone) {
          titleDone = true;
          docTitle = plain(t.tokens);
          out.push(new Paragraph({ style: "Title", children: runs(t.tokens) }));
        } else {
          // the single H1 is the title, so ## is Heading 1 in Word
          const depth = Math.min(Math.max(t.depth - 2, 0), 3);
          out.push(new Paragraph({ heading: headingLevels[depth], children: runs(t.tokens) }));
        }
        break;
      case "paragraph": {
        // a paragraph holding only images is a figure: centred and kept with its caption
        const figure = t.tokens.some((x) => x.type === "image") && t.tokens.every((x) => x.type === "image" || !x.raw.trim());
        out.push(new Paragraph({ children: runs(t.tokens), ...(figure && { alignment: AlignmentType.CENTER, keepNext: true }) }));
        break;
      }
      case "list":
        out.push(...list(t, ctx.level));
        break;
      case "table":
        out.push(table(t), new Paragraph({ spacing: { after: 60 }, children: [] }));
        break;
      case "code":
        if (t.lang === "mermaid") warn("Mermaid diagram rendered as code; describe the flow in steps instead");
        out.push(code(t.text), new Paragraph({ spacing: { after: 60 }, children: [] }));
        break;
      case "blockquote":
        for (const p of t.tokens) {
          if (p.type !== "paragraph") { out.push(...blocks([p], ctx)); continue; }
          out.push(new Paragraph({
            children: runs(p.tokens, { italics: true }),
            indent: { left: 200 },
            shading: { type: ShadingType.CLEAR, color: "auto", fill: S.color.quoteFill },
            border: { left: { style: BorderStyle.SINGLE, size: 18, color: S.color.quoteBar, space: 8 } },
          }));
        }
        break;
      case "hr":
      case "space":
        break;
      case "html":
        if (!/^<!--/.test(t.text.trim())) warn(`raw HTML or unfilled <placeholder> dropped: ${t.text.trim().slice(0, 40)}`);
        break;
      case "text":
        out.push(new Paragraph({ children: runs(t.tokens ?? [t]) }));
        break;
      default:
        warn(`unsupported Markdown "${t.type}" dropped`);
    }
  }
  return out;
}

function list(t, level) {
  const instance = ++listInstance; // restarts numbering for each list
  const out = [];
  for (const item of t.items) {
    let first = true;
    for (const child of item.tokens) {
      if (child.type === "list") { out.push(...list(child, level + 1)); continue; }
      if (child.type === "checkbox") continue;
      if (child.type !== "text" && child.type !== "paragraph") { out.push(...blocks([child], { level: level + 1 })); continue; }
      const children = runs(child.tokens ?? [child]);
      const indent = { left: S.list.indent * (level + 1), hanging: S.list.hanging };
      if (item.task && first) {
        children.unshift(new TextRun({ text: item.checked ? "☑ " : "☐ ", font: S.font.symbol }));
        out.push(new Paragraph({ style: "ListItem", indent, children }));
      } else if (first) {
        out.push(new Paragraph({
          style: "ListItem", children,
          numbering: { reference: t.ordered ? "numbers" : "bullets", level: Math.min(level, 3), instance },
        }));
      } else {
        out.push(new Paragraph({ style: "ListItem", indent: { left: indent.left }, children }));
      }
      first = false;
    }
  }
  return out;
}

function columnWidths(rows) {
  const cols = rows[0].length;
  const weight = Array.from({ length: cols }, (_, c) =>
    Math.min(Math.max(...rows.map((r) => plain(r[c]?.tokens).length), 6), 60));
  if (cols > 7) warn(`table with ${cols} columns is cramped on A4; split it`);
  const total = weight.reduce((a, b) => a + b, 0);
  const widths = weight.map((w) => Math.max(Math.round((w / total) * S.contentWidth), S.table.minColumn));
  const over = widths.reduce((a, b) => a + b, 0) - S.contentWidth; // min widths can overflow; take it from the widest
  widths[widths.indexOf(Math.max(...widths))] -= over;
  return widths;
}

function cellChildren(tokens, bold) {
  // <br> splits a cell into lines; keep each line its own paragraph
  const lines = [[]];
  for (const t of tokens) {
    if (t.type === "br" || (t.type === "html" && /^<br\s*\/?>$/i.test(t.text.trim()))) lines.push([]);
    else lines.at(-1).push(t);
  }
  return lines.map((l) => new Paragraph({ style: "TableText", children: runs(l, bold ? { bold: true } : {}) }));
}

function table(t) {
  const rows = [t.header, ...t.rows];
  const widths = columnWidths(rows);
  const border = { style: BorderStyle.SINGLE, size: S.table.borderSize, color: S.color.border };
  return new Table({
    width: { size: S.contentWidth, type: WidthType.DXA },
    columnWidths: widths,
    borders: { top: border, bottom: border, left: border, right: border, insideHorizontal: border, insideVertical: border },
    rows: rows.map((r, i) => new TableRow({
      tableHeader: i === 0 || undefined,
      cantSplit: true,
      children: widths.map((w, c) => new TableCell({
        width: { size: w, type: WidthType.DXA },
        margins: S.table.cellMargin,
        shading: i === 0 ? { type: ShadingType.CLEAR, color: "auto", fill: S.color.tableHeaderFill } : undefined,
        children: cellChildren(r[c]?.tokens ?? [], i === 0),
      })),
    })),
  });
}

function code(text) {
  const border = { style: BorderStyle.SINGLE, size: S.table.borderSize, color: S.color.border };
  return new Table({
    width: { size: S.contentWidth, type: WidthType.DXA },
    columnWidths: [S.contentWidth],
    borders: { top: border, bottom: border, left: border, right: border },
    rows: [new TableRow({
      children: [new TableCell({
        width: { size: S.contentWidth, type: WidthType.DXA },
        margins: { top: 80, bottom: 80, left: 140, right: 140 },
        shading: { type: ShadingType.CLEAR, color: "auto", fill: S.color.codeFill },
        children: text.split("\n").map((line) => new Paragraph({ style: "Code", children: [new TextRun(line)] })),
      })],
    })],
  });
}

// ---------- document ----------
const body = blocks(marked.lexer(readFileSync(input, "utf8")));
const muted = { size: S.size.headerFooter, color: S.color.muted };
body.push(
  new Paragraph({ alignment: AlignmentType.CENTER, spacing: { before: 600, after: 0 },
    children: [new TextRun({ ...muted, text: S.credit.text + version })] }),
  new Paragraph({ alignment: AlignmentType.CENTER, children: [new TextRun({ ...muted, text: S.credit.feedback }),
    new ExternalHyperlink({ link: S.credit.link, children: [new TextRun({ ...muted, text: S.credit.link })] })] }),
);

const heading = (sz, clr, spacing) => ({
  run: { font: S.font.body, size: sz, bold: true, color: clr },
  paragraph: { spacing, keepNext: true, keepLines: true },
});
const numberingLevels = (formats, texts) => formats.map((format, level) => ({
  level, format, text: texts[level], alignment: AlignmentType.LEFT,
  style: { paragraph: { indent: { left: S.list.indent * (level + 1), hanging: S.list.hanging } } },
}));
const small = (children, alignment) =>
  new Paragraph({ alignment, children: children.map((c) => new TextRun({ children: [c].flat(), size: S.size.headerFooter, color: S.color.muted })) });

const doc = new Document({
  title: docTitle,
  creator: "zDev new-trd",
  styles: {
    default: {
      document: {
        run: { font: S.font.body, size: S.size.body, color: S.color.text },
        paragraph: { spacing: S.spacing.body },
      },
      // built-in styles are overridden here; redefining them in paragraphStyles duplicates their ids
      title: {
        run: { font: S.font.body, size: S.size.title, bold: true, color: S.color.heading },
        paragraph: { spacing: S.spacing.title,
          border: { bottom: { style: BorderStyle.SINGLE, size: 8, color: S.color.subheading, space: 4 } } },
      },
      heading1: heading(S.size.h1, S.color.heading, S.spacing.h1),
      heading2: heading(S.size.h2, S.color.subheading, S.spacing.h2),
      heading3: heading(S.size.h3, S.color.subheading, S.spacing.h3),
      heading4: heading(S.size.h4, S.color.text, S.spacing.h4),
    },
    paragraphStyles: [
      { id: "ListItem", name: "List Item", basedOn: "Normal", run: {}, paragraph: { spacing: S.spacing.listItem } },
      { id: "TableText", name: "Table Text", basedOn: "Normal", run: { size: S.size.table }, paragraph: { spacing: S.spacing.tableCell } },
      { id: "Code", name: "Code", basedOn: "Normal", run: { font: S.font.code, size: S.size.code }, paragraph: { spacing: S.spacing.code } },
    ],
  },
  numbering: {
    config: [
      { reference: "bullets", levels: numberingLevels(S.list.bullets.map(() => LevelFormat.BULLET), S.list.bullets) },
      { reference: "numbers", levels: numberingLevels(S.list.numberFormats, S.list.numbers) },
    ],
  },
  sections: [{
    properties: {
      page: {
        size: { width: S.page.width, height: S.page.height },
        margin: { top: S.page.margin, right: S.page.margin, bottom: S.page.margin, left: S.page.margin,
          header: S.page.headerFooter, footer: S.page.headerFooter },
      },
    },
    footers: { default: new Footer({ children: [small([["Page ", PageNumber.CURRENT, " of ", PageNumber.TOTAL_PAGES]], AlignmentType.CENTER)] }) },
    children: body,
  }],
});

writeFileSync(output, await Packer.toBuffer(doc));
const count = (type) => marked.lexer(readFileSync(input, "utf8")).filter((t) => t.type === type).length;
console.log(`DOCX written: ${output} (${count("heading")} headings, ${count("table")} tables, ${count("code")} code blocks)`);
for (const w of warnings) console.log(`WARN: ${w}`);
