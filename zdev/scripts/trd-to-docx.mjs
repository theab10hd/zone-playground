// Convert a TRD Markdown file to DOCX in the house style (trd-style.mjs).
// Usage: node trd-to-docx.mjs <input.md> <output.docx>
import { readFileSync, writeFileSync } from "node:fs";
import { basename } from "node:path";
import { marked } from "marked";
import {
  AlignmentType, BorderStyle, Document, ExternalHyperlink, Footer, Header, HeadingLevel, LevelFormat,
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
      case "image":
        warn(`image "${t.href}" is not embedded; rendered as text`);
        out.push(new TextRun({ ...style, text: `[Image: ${t.text || t.href}]`, italics: true }));
        break;
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
          // Word ignores clicks on header links from the body, so the link is repeated here
          out.push(new Paragraph({ children: [new ExternalHyperlink({ link: S.header.link,
            children: [new TextRun({ text: S.header.text, size: S.size.table, color: S.color.link })] })] }));
        } else {
          // the single H1 is the title, so ## is Heading 1 in Word
          const depth = Math.min(Math.max(t.depth - 2, 0), 3);
          out.push(new Paragraph({ heading: headingLevels[depth], children: runs(t.tokens) }));
        }
        break;
      case "paragraph":
        out.push(new Paragraph({ children: runs(t.tokens) }));
        break;
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
    headers: { default: new Header({ children: [new Paragraph({ alignment: AlignmentType.RIGHT, children: [
      new ExternalHyperlink({ link: S.header.link,
        children: [new TextRun({ text: S.header.text, size: S.size.headerFooter, color: S.color.link })] }),
    ] })] }) },
    footers: { default: new Footer({ children: [small([["Page ", PageNumber.CURRENT, " of ", PageNumber.TOTAL_PAGES]], AlignmentType.CENTER)] }) },
    children: body,
  }],
});

writeFileSync(output, await Packer.toBuffer(doc));
const count = (type) => marked.lexer(readFileSync(input, "utf8")).filter((t) => t.type === type).length;
console.log(`DOCX written: ${output} (${count("heading")} headings, ${count("table")} tables, ${count("code")} code blocks)`);
for (const w of warnings) console.log(`WARN: ${w}`);
