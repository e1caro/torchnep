// Builds the downloadable files from the generated tables: CSV (one file or a ZIP of all), Excel, SQLite and SQL.

import { Zip, ZipDeflate, strToU8 } from 'fflate';
import type { SqlJsStatic } from 'sql.js';
import { exportDefs, tableSource, type RowSource, type SourceOpts, type Value } from '../engine/rows';
import { KEY_TABLES, SQL_TYPE, foreignKeys, primaryKey } from '../engine/schema';
import type { Sim } from '../engine/sim';
import type { TableDef } from '../engine/table';
import type { Lang } from '../engine/types';

export type Format = 'csv' | 'xlsx' | 'sqlite' | 'sql';
export interface ExportOpts { tables: string[]; format: Format; from: number; to: number; dirty: boolean; keys: boolean; lang: Lang; }
export interface ExportFile { name: string; mime: string; parts: Uint8Array[]; }

/** Tables offered for export, in dependency order. Answer keys only when asked for. */
export function exportTables(sim: Sim, dirty: boolean, keys: boolean): string[] {
  return exportDefs(sim, dirty).map(d => d.name).filter(n => keys || !KEY_TABLES.includes(n));
}
const sources = (sim: Sim, o: ExportOpts): RowSource[] => {
  const so: SourceOpts = { from: o.from, to: o.to, dirty: o.dirty, lang: o.lang };
  return exportTables(sim, o.dirty, o.keys).filter(n => o.tables.includes(n)).map(n => tableSource(sim, n, so));
};

// ---- CSV ----
const csvCell = (v: Value) => (v === null ? '' : typeof v === 'number' ? String(v) : /[",\n\r]/.test(v) || v !== v.trim() ? `"${v.replace(/"/g, '""')}"` : v);
export function csvParts(src: RowSource, bom = true): Uint8Array[] {
  const parts: Uint8Array[] = [strToU8((bom ? '﻿' : '') + src.def.cols.map(c => c.name).join(',') + '\n')];
  let buf: string[] = [];
  for (let i = 0; i < src.count; i++) {
    buf.push(src.row(i).map(csvCell).join(','));
    if (buf.length === 4000 || i === src.count - 1) { parts.push(strToU8(buf.join('\n') + '\n')); buf = []; }
  }
  return parts;
}

function zipFiles(files: { name: string; chunks: () => Iterable<Uint8Array> }[]): Uint8Array[] {
  const out: Uint8Array[] = [];
  const zip = new Zip((err, chunk) => { if (err) throw err; out.push(chunk); });
  for (const f of files) {
    const entry = new ZipDeflate(f.name, { level: 6 });
    zip.add(entry);
    for (const c of f.chunks()) entry.push(c, false);
    entry.push(new Uint8Array(0), true);
  }
  zip.end();
  return out;
}

// ---- Excel ----
const xmlEsc = (s: string) => s.replace(/[\u0000-\u0008\u000B\u000C\u000E-\u001F]/g, '').replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
const XLSX_MAX = 1048575; // data rows per sheet
const serial = (iso: string) => {
  const d = Date.UTC(+iso.slice(0, 4), +iso.slice(5, 7) - 1, +iso.slice(8, 10)) / 86400000 + 25569;
  return iso.length > 10 ? d + (+iso.slice(11, 13) * 3600 + +iso.slice(14, 16) * 60 + +iso.slice(17, 19)) / 86400 : d;
};
const ISO = /^\d{4}-\d{2}-\d{2}( \d{2}:\d{2}:\d{2})?$/;
function* sheetXml(src: RowSource, first: number, count: number): Iterable<Uint8Array> {
  const cols = src.def.cols;
  yield strToU8('<?xml version="1.0" encoding="UTF-8" standalone="yes"?><worksheet xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main"><sheetViews><sheetView workbookViewId="0"><pane ySplit="1" topLeftCell="A2" activePane="bottomLeft" state="frozen"/></sheetView></sheetViews><sheetFormatPr defaultRowHeight="15"/>'
    + `<cols>${cols.map((c, i) => `<col min="${i + 1}" max="${i + 1}" width="${Math.min(40, Math.max(10, c.name.length + 4))}" customWidth="1"/>`).join('')}</cols><sheetData>`
    + `<row>${cols.map(c => `<c t="inlineStr" s="1"><is><t>${c.name}</t></is></c>`).join('')}</row>`);
  let buf: string[] = [];
  for (let i = 0; i < count; i++) {
    const row = src.row(first + i); let s = '<row>';
    for (let c = 0; c < row.length; c++) {
      const v = row[c], type = cols[c].type;
      if (v === null) s += '<c/>';
      else if (typeof v === 'number') s += type === 'money' ? `<c s="4"><v>${v}</v></c>` : `<c><v>${v}</v></c>`;
      else if ((type === 'date' || type === 'datetime') && ISO.test(v)) s += `<c s="${type === 'date' ? 2 : 3}"><v>${serial(v)}</v></c>`;
      else s += `<c t="inlineStr"><is><t xml:space="preserve">${xmlEsc(v)}</t></is></c>`;
    }
    buf.push(s + '</row>');
    if (buf.length === 2000) { yield strToU8(buf.join('')); buf = []; }
  }
  yield strToU8(buf.join('') + '</sheetData></worksheet>');
}
export function xlsxParts(srcs: RowSource[]): Uint8Array[] {
  const sheets: { name: string; src: RowSource; first: number; count: number }[] = [];
  for (const src of srcs) {
    const n = Math.max(1, Math.ceil(src.count / XLSX_MAX));
    for (let k = 0; k < n; k++) sheets.push({ name: (n > 1 ? `${src.def.name.slice(0, 27)}_${k + 1}` : src.def.name).slice(0, 31), src, first: k * XLSX_MAX, count: Math.min(XLSX_MAX, src.count - k * XLSX_MAX) });
  }
  const one = (name: string, text: string) => ({ name, chunks: () => [strToU8(text)] });
  const head = '<?xml version="1.0" encoding="UTF-8" standalone="yes"?>';
  return zipFiles([
    one('[Content_Types].xml', `${head}<Types xmlns="http://schemas.openxmlformats.org/package/2006/content-types"><Default Extension="rels" ContentType="application/vnd.openxmlformats-package.relationships+xml"/><Default Extension="xml" ContentType="application/xml"/><Override PartName="/xl/workbook.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.sheet.main+xml"/><Override PartName="/xl/styles.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.styles+xml"/>${sheets.map((_, i) => `<Override PartName="/xl/worksheets/sheet${i + 1}.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.worksheet+xml"/>`).join('')}</Types>`),
    one('_rels/.rels', `${head}<Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships"><Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/officeDocument" Target="xl/workbook.xml"/></Relationships>`),
    one('xl/workbook.xml', `${head}<workbook xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main" xmlns:r="http://schemas.openxmlformats.org/officeDocument/2006/relationships"><sheets>${sheets.map((s, i) => `<sheet name="${s.name}" sheetId="${i + 1}" r:id="rId${i + 1}"/>`).join('')}</sheets></workbook>`),
    one('xl/_rels/workbook.xml.rels', `${head}<Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships">${sheets.map((_, i) => `<Relationship Id="rId${i + 1}" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/worksheet" Target="worksheets/sheet${i + 1}.xml"/>`).join('')}<Relationship Id="rId${sheets.length + 1}" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/styles" Target="styles.xml"/></Relationships>`),
    one('xl/styles.xml', `${head}<styleSheet xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main"><numFmts count="2"><numFmt numFmtId="164" formatCode="yyyy\\-mm\\-dd"/><numFmt numFmtId="165" formatCode="yyyy\\-mm\\-dd\\ hh:mm:ss"/></numFmts><fonts count="2"><font><sz val="11"/><name val="Calibri"/></font><font><b/><sz val="11"/><name val="Calibri"/></font></fonts><fills count="2"><fill><patternFill patternType="none"/></fill><fill><patternFill patternType="gray125"/></fill></fills><borders count="1"><border><left/><right/><top/><bottom/><diagonal/></border></borders><cellStyleXfs count="1"><xf numFmtId="0" fontId="0" fillId="0" borderId="0"/></cellStyleXfs><cellXfs count="5"><xf numFmtId="0" fontId="0" fillId="0" borderId="0" xfId="0"/><xf numFmtId="0" fontId="1" fillId="0" borderId="0" xfId="0" applyFont="1"/><xf numFmtId="164" fontId="0" fillId="0" borderId="0" xfId="0" applyNumberFormat="1"/><xf numFmtId="165" fontId="0" fillId="0" borderId="0" xfId="0" applyNumberFormat="1"/><xf numFmtId="4" fontId="0" fillId="0" borderId="0" xfId="0" applyNumberFormat="1"/></cellXfs></styleSheet>`),
    ...sheets.map((s, i) => ({ name: `xl/worksheets/sheet${i + 1}.xml`, chunks: () => sheetXml(s.src, s.first, s.count) })),
  ]);
}

// ---- SQL ----
/** CREATE TABLE statements. With dirty data the keys are left out, because duplicated and missing values would break them. */
export function ddl(defs: TableDef[], constraints: boolean): string[] {
  return defs.map(d => {
    const pk = primaryKey(d), hasPk = constraints && (d.cols[0].type === 'id' || d.name === 'calendar' || d.name === 'daily_summary');
    const cols = d.cols.map(c => `  "${c.name}" ${SQL_TYPE[c.type]}${hasPk && c.name === pk ? ' PRIMARY KEY' : ''}${constraints && !c.nullable && c.name !== pk && c.type !== 'text' ? ' NOT NULL' : ''}`);
    const fks = constraints ? foreignKeys(d, defs).map(([col, t, ref]) => `  FOREIGN KEY ("${col}") REFERENCES "${t}" ("${ref}")`) : [];
    return `CREATE TABLE "${d.name}" (\n${[...cols, ...fks].join(',\n')}\n);`;
  });
}
const sqlLit = (v: Value) => (v === null ? 'NULL' : typeof v === 'number' ? String(v) : `'${v.replace(/'/g, "''")}'`);
export function sqlParts(srcs: RowSource[], constraints: boolean): Uint8Array[] {
  const parts: Uint8Array[] = [strToU8(`-- BizSim export\nPRAGMA foreign_keys = OFF;\nBEGIN TRANSACTION;\n${ddl(srcs.map(s => s.def), constraints).join('\n')}\n`)];
  for (const src of srcs) {
    const head = `INSERT INTO "${src.def.name}" (${src.def.cols.map(c => `"${c.name}"`).join(', ')}) VALUES\n`;
    let buf: string[] = [];
    for (let i = 0; i < src.count; i++) {
      buf.push(`(${src.row(i).map(sqlLit).join(', ')})`);
      if (buf.length === 500 || i === src.count - 1) { parts.push(strToU8(head + buf.join(',\n') + ';\n')); buf = []; }
    }
  }
  parts.push(strToU8('COMMIT;\nPRAGMA foreign_keys = ON;\n'));
  return parts;
}
export function sqliteBytes(SQL: SqlJsStatic, srcs: RowSource[], constraints: boolean): Uint8Array {
  const db = new SQL.Database();
  try {
    db.run('PRAGMA foreign_keys = OFF; PRAGMA journal_mode = OFF; PRAGMA synchronous = OFF;');
    db.run(ddl(srcs.map(s => s.def), constraints).join('\n'));
    db.run('BEGIN');
    for (const src of srcs) {
      const st = db.prepare(`INSERT INTO "${src.def.name}" VALUES (${src.def.cols.map(() => '?').join(',')})`);
      for (let i = 0; i < src.count; i++) st.run(src.row(i));
      st.free();
    }
    db.run('COMMIT');
    return db.export();
  } finally { db.close(); }
}

const slug = (s: string) => s.normalize('NFD').replace(/[̀-ͯ]/g, '').replace(/[^a-zA-Z0-9]+/g, '_').replace(/^_|_$/g, '').toLowerCase() || 'business';

export function buildExport(sim: Sim, o: ExportOpts, SQL?: SqlJsStatic): ExportFile {
  const srcs = sources(sim, o), base = `bizsim_${slug(sim.big.name)}`;
  if (!srcs.length) throw new Error('no tables selected');
  switch (o.format) {
    case 'csv':
      if (srcs.length === 1) return { name: `${base}_${srcs[0].def.name}.csv`, mime: 'text/csv', parts: csvParts(srcs[0]) };
      return { name: `${base}_csv.zip`, mime: 'application/zip', parts: zipFiles(srcs.map(s => ({ name: `${s.def.name}.csv`, chunks: () => csvParts(s) }))) };
    case 'xlsx': return { name: `${base}.xlsx`, mime: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet', parts: xlsxParts(srcs) };
    case 'sql': return { name: `${base}.sql`, mime: 'application/sql', parts: sqlParts(srcs, !o.dirty) };
    case 'sqlite':
      if (!SQL) throw new Error('SQLite engine not loaded');
      return { name: `${base}.sqlite`, mime: 'application/vnd.sqlite3', parts: [sqliteBytes(SQL, srcs, !o.dirty)] };
  }
}
