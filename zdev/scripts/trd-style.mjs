// House style for every TRD exported by /zdev:new-trd. Change it here, never per document.
// Principles: A4 with narrow (0.5") margins, one font family, standard sizes
// (body 11 pt, tables 10 pt, code 9 pt), few colours, full-width tables with a
// repeated shaded header, headings kept with their next paragraph.

const pt = (n) => n * 2; // docx sizes are half-points
const inch = (n) => Math.round(n * 1440); // twips

export const page = {
  width: 11906, // A4
  height: 16838,
  margin: inch(0.5), // Word "Narrow"
  headerFooter: inch(0.3),
};
export const contentWidth = page.width - 2 * page.margin;

// top-right of every page
export const header = {
  text: "zOne Playground",
  link: "https://github.com/theab10hd/zone-playground.git",
};

export const font = {
  body: "Calibri",
  code: "Consolas",
  symbol: "Segoe UI Symbol", // ☐ ☑, which Calibri lacks
};

export const size = {
  title: pt(20),
  h1: pt(16),
  h2: pt(13),
  h3: pt(12),
  h4: pt(11),
  body: pt(11),
  table: pt(10),
  code: pt(9),
  headerFooter: pt(8),
};

export const color = {
  text: "1F1F1F",
  heading: "1F3864",
  subheading: "2F5496",
  muted: "7F7F7F",
  link: "0563C1",
  border: "BFBFBF",
  tableHeaderFill: "D9E2F3",
  codeFill: "F2F2F2",
  quoteBar: "2F5496",
  quoteFill: "EEF3FA",
};

// spacing in twips (20 = 1 pt); line 259 = 1.08 lines, Word's default
export const spacing = {
  body: { before: 0, after: 120, line: 259 },
  title: { before: 0, after: 200 },
  h1: { before: 360, after: 120 },
  h2: { before: 280, after: 100 },
  h3: { before: 220, after: 80 },
  h4: { before: 180, after: 60 },
  listItem: { before: 0, after: 60, line: 259 },
  tableCell: { before: 40, after: 40, line: 240 },
  code: { before: 0, after: 0, line: 240 },
};

export const table = {
  borderSize: 4, // eighths of a point
  cellMargin: { top: 40, bottom: 40, left: 100, right: 100 },
  minColumn: 900, // twips; narrower columns break words
};

export const list = {
  indent: 360, // per level
  hanging: 260,
  bullets: ["•", "◦", "▪", "•"],
  numbers: ["%1.", "%2.", "%3.", "%4."],
  numberFormats: ["decimal", "lowerLetter", "lowerRoman", "decimal"],
};
