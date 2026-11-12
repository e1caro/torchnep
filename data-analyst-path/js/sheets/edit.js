/* DotSheets editing logic without the DOM: CSV loading, cell input, keyboard navigation, copy/paste, undo/redo. */
(function () {
  'use strict';
  var DA = (window.DA = window.DA || {});
  var S = (DA.sheets = DA.sheets || {});

  S.ROWS = 10000;
  S.COLS = 702;

  S.parseCsv = function (text) {
    var rows = [], row = [], cell = '', q = false, i = 0, ch;
    text = String(text || '').replace(/^﻿/, '');
    for (; i < text.length; i++) {
      ch = text[i];
      if (q) {
        if (ch === '"') { if (text[i + 1] === '"') { cell += '"'; i++; } else q = false; }
        else cell += ch;
      } else if (ch === '"') q = true;
      else if (ch === ',') { row.push(cell); cell = ''; }
      else if (ch === '\n' || ch === '\r') {
        if (ch === '\r' && text[i + 1] === '\n') i++;
        row.push(cell); rows.push(row); row = []; cell = '';
      } else cell += ch;
    }
    if (cell !== '' || row.length) { row.push(cell); rows.push(row); }
    return rows;
  };

  S.inputValue = function (text) {
    var t = text === null || text === undefined ? '' : String(text);
    if (/^\s*=/.test(t)) return { formula: t.trim(), raw: t.trim(), fmt: null };
    var v = S.parseInput(t);
    var fmt = null;
    if (typeof v === 'number' && /^\s*\d{4}-\d{1,2}-\d{1,2}\s*$/.test(t)) fmt = 'yyyy-mm-dd';
    else if (typeof v === 'number' && /%\s*$/.test(t)) fmt = '0%';
    else if (typeof v === 'number' && /^\s*[$€£]/.test(t)) fmt = '$#,##0.00';
    return { formula: null, raw: v, fmt: fmt };
  };

  S.snapshot = function (sheet, r, c) {
    var cell = sheet.getCell(r, c);
    if (!cell || cell.spillFrom || (cell.raw === null && !cell.formula && !cell.fmt)) return null;
    return { raw: cell.raw, formula: cell.formula, fmt: cell.fmt };
  };

  S.restore = function (sheet, r, c, snap) {
    var k = r + ',' + c;
    if (!snap) { delete sheet.cells[k]; return; }
    var cell = sheet.ensureCell(r, c);
    cell.raw = snap.raw; cell.formula = snap.formula; cell.fmt = snap.fmt; cell.value = snap.formula ? null : snap.raw; cell.spillFrom = null;
  };

  S.setInput = function (sheet, r, c, text, keepFmt) {
    var before = S.snapshot(sheet, r, c);
    var t = text === null || text === undefined ? '' : String(text);
    if (t.trim() === '') { S.restore(sheet, r, c, before && keepFmt && before.fmt ? { raw: null, formula: null, fmt: before.fmt } : null); }
    else {
      var v = S.inputValue(t);
      var fmt = v.fmt || (before && before.fmt) || null;
      S.restore(sheet, r, c, { raw: v.raw, formula: v.formula, fmt: fmt });
    }
    return { r: r, c: c, before: before, after: S.snapshot(sheet, r, c) };
  };

  S.loadCsv = function (sheet, text, maxRows) {
    var rows = S.parseCsv(text);
    for (var r = 0; r < rows.length && r < (maxRows || 2000); r++) {
      for (var c = 0; c < rows[r].length; c++) {
        if (rows[r][c] !== '') S.setInput(sheet, r, c, rows[r][c]);
      }
    }
    return rows.length;
  };

  S.cellText = function (cell) {
    if (!cell) return '';
    if (cell.formula) return cell.formula;
    if (cell.raw === null || cell.raw === undefined) return '';
    if (typeof cell.raw === 'number' && cell.fmt) return S.formatValue(cell.raw, cell.fmt);
    return S.toStr(cell.raw);
  };

  S.displayValue = function (cell) {
    if (!cell) return null;
    var v = cell.value;
    if (Array.isArray(v)) v = v.length && v[0].length ? v[0][0] : null;
    return v;
  };

  S.isFilled = function (sheet, r, c) {
    var cell = sheet.getCell(r, c);
    if (!cell) return false;
    var v = S.displayValue(cell);
    return v !== null && v !== undefined && v !== '';
  };

  S.usedRange = function (sheet) {
    var r2 = 0, c2 = 0;
    Object.keys(sheet.cells).forEach(function (k) {
      var p = k.split(','), r = +p[0], c = +p[1];
      if (S.isFilled(sheet, r, c)) { if (r > r2) r2 = r; if (c > c2) c2 = c; }
    });
    return { r2: r2, c2: c2 };
  };

  S.dataEdge = function (sheet, r, c, dr, dc) {
    var maxR = S.ROWS - 1, maxC = S.COLS - 1;
    function ok(rr, cc) { return rr >= 0 && cc >= 0 && rr <= maxR && cc <= maxC; }
    var nr = r + dr, nc = c + dc;
    if (!ok(nr, nc)) return { r: r, c: c };
    var used = S.usedRange(sheet), limR = Math.min(maxR, used.r2 + 1), limC = Math.min(maxC, used.c2 + 1);
    function beyond(rr, cc) { return (dr > 0 && rr > limR) || (dc > 0 && cc > limC); }
    if (S.isFilled(sheet, r, c) && S.isFilled(sheet, nr, nc)) {
      while (ok(nr + dr, nc + dc) && S.isFilled(sheet, nr + dr, nc + dc)) { nr += dr; nc += dc; }
      return { r: nr, c: nc };
    }
    while (ok(nr, nc) && !S.isFilled(sheet, nr, nc)) {
      if (beyond(nr, nc)) return { r: dr > 0 ? maxR : nr, c: dc > 0 ? maxC : nc };
      nr += dr; nc += dc;
    }
    if (!ok(nr, nc)) return { r: Math.max(0, Math.min(maxR, nr - dr)), c: Math.max(0, Math.min(maxC, nc - dc)) };
    return { r: nr, c: nc };
  };

  function clamp(p) { return { r: Math.max(0, Math.min(S.ROWS - 1, p.r)), c: Math.max(0, Math.min(S.COLS - 1, p.c)) }; }

  S.navKey = function (sheet, state, key, mods, pageRows) {
    mods = mods || {};
    var cur = state.cursor, sel = state.sel;
    var DIR = { ArrowUp: [-1, 0], ArrowDown: [1, 0], ArrowLeft: [0, -1], ArrowRight: [0, 1] };
    var end = { r: sel.r2, c: sel.c2 };
    var from = mods.shift ? end : cur, to = null;
    if (DIR[key]) {
      var d = DIR[key];
      to = mods.ctrl ? S.dataEdge(sheet, from.r, from.c, d[0], d[1]) : { r: from.r + d[0], c: from.c + d[1] };
    } else if (key === 'Home') {
      to = mods.ctrl ? { r: 0, c: 0 } : { r: from.r, c: 0 };
    } else if (key === 'End' && mods.ctrl) {
      var u = S.usedRange(sheet); to = { r: u.r2, c: u.c2 };
    } else if (key === 'PageDown') {
      to = { r: from.r + (pageRows || 20), c: from.c };
    } else if (key === 'PageUp') {
      to = { r: from.r - (pageRows || 20), c: from.c };
    } else return null;
    to = clamp(to);
    if (mods.shift) return { cursor: { r: cur.r, c: cur.c }, sel: { r1: cur.r, c1: cur.c, r2: to.r, c2: to.c } };
    return { cursor: to, sel: { r1: to.r, c1: to.c, r2: to.r, c2: to.c } };
  };

  S.stepInSelection = function (state, dir) {
    var cur = state.cursor, sel = state.sel;
    var r1 = Math.min(sel.r1, sel.r2), r2 = Math.max(sel.r1, sel.r2), c1 = Math.min(sel.c1, sel.c2), c2 = Math.max(sel.c1, sel.c2);
    var multi = r1 !== r2 || c1 !== c2;
    var DIR = { down: [1, 0], up: [-1, 0], right: [0, 1], left: [0, -1] }[dir];
    if (!multi) {
      var to = clamp({ r: cur.r + DIR[0], c: cur.c + DIR[1] });
      return { cursor: to, sel: { r1: to.r, c1: to.c, r2: to.r, c2: to.c } };
    }
    var r = cur.r, c = cur.c;
    if (dir === 'down' || dir === 'up') {
      r += DIR[0];
      if (r > r2) { r = r1; c = c + 1 > c2 ? c1 : c + 1; } else if (r < r1) { r = r2; c = c - 1 < c1 ? c2 : c - 1; }
    } else {
      c += DIR[1];
      if (c > c2) { c = c1; r = r + 1 > r2 ? r1 : r + 1; } else if (c < c1) { c = c2; r = r - 1 < r1 ? r2 : r - 1; }
    }
    return { cursor: { r: r, c: c }, sel: sel };
  };

  S.shiftFormula = function (f, dr, dc) {
    var parts = String(f).split('"');
    for (var i = 0; i < parts.length; i += 2) {
      parts[i] = parts[i].replace(/(^|[^A-Za-z0-9_.!])(\$?)([A-Za-z]{1,3})(\$?)(\d+)(?![A-Za-z0-9_(])/g, function (m, pre, ac, col, ar, row) {
        var c = S.colIndex(col.toUpperCase()), r = +row - 1;
        if (!ac) c += dc;
        if (!ar) r += dr;
        if (c < 0 || r < 0) return pre + '#REF!';
        return pre + ac + S.colName(c) + ar + (r + 1);
      });
    }
    return parts.join('"');
  };

  S.copyRange = function (sheet, sel) {
    var r1 = Math.min(sel.r1, sel.r2), r2 = Math.max(sel.r1, sel.r2), c1 = Math.min(sel.c1, sel.c2), c2 = Math.max(sel.c1, sel.c2);
    var lines = [], cells = [];
    for (var r = r1; r <= r2; r++) {
      var line = [], crow = [];
      for (var c = c1; c <= c2; c++) {
        var cell = sheet.getCell(r, c);
        line.push(cell && cell.spillFrom ? S.toStr(S.displayValue(cell)) : S.cellText(cell));
        crow.push(S.snapshot(sheet, r, c));
      }
      lines.push(line.join('\t')); cells.push(crow);
    }
    return { text: lines.join('\n'), cells: cells, r: r1, c: c1 };
  };

  S.pasteAt = function (sheet, r0, c0, clip) {
    var changes = [], useCells = clip.cells && clip.text !== undefined;
    var grid = useCells ? null : String(clip.text || '').replace(/\r/g, '').replace(/\n$/, '').split('\n').map(function (l) { return l.split('\t'); });
    var rows = useCells ? clip.cells : grid;
    for (var i = 0; i < rows.length; i++) {
      for (var j = 0; j < rows[i].length; j++) {
        var r = r0 + i, c = c0 + j;
        if (useCells) {
          var snap = rows[i][j], before = S.snapshot(sheet, r, c);
          if (snap && snap.formula) snap = { raw: null, formula: S.shiftFormula(snap.formula, r0 - clip.r, c0 - clip.c), fmt: snap.fmt };
          if (snap && snap.formula) snap.raw = snap.formula;
          S.restore(sheet, r, c, snap);
          changes.push({ r: r, c: c, before: before, after: S.snapshot(sheet, r, c) });
        } else changes.push(S.setInput(sheet, r, c, rows[i][j]));
      }
    }
    return changes;
  };

  S.clearRange = function (sheet, sel) {
    var r1 = Math.min(sel.r1, sel.r2), r2 = Math.max(sel.r1, sel.r2), c1 = Math.min(sel.c1, sel.c2), c2 = Math.max(sel.c1, sel.c2), out = [];
    for (var r = r1; r <= r2; r++) for (var c = c1; c <= c2; c++) {
      var before = S.snapshot(sheet, r, c);
      if (before) { S.restore(sheet, r, c, null); out.push({ r: r, c: c, before: before, after: null }); }
    }
    return out;
  };

  function History() { this.undoStack = []; this.redoStack = []; }
  History.prototype.push = function (sheet, changes) {
    changes = (changes || []).filter(function (x) { return JSON.stringify(x.before) !== JSON.stringify(x.after); });
    if (!changes.length) return;
    this.undoStack.push({ sheet: sheet, changes: changes });
    if (this.undoStack.length > 200) this.undoStack.shift();
    this.redoStack = [];
  };
  History.prototype.undo = function () {
    var a = this.undoStack.pop();
    if (!a) return null;
    for (var i = a.changes.length - 1; i >= 0; i--) S.restore(a.sheet, a.changes[i].r, a.changes[i].c, a.changes[i].before);
    this.redoStack.push(a);
    return a;
  };
  History.prototype.redo = function () {
    var a = this.redoStack.pop();
    if (!a) return null;
    a.changes.forEach(function (x) { S.restore(a.sheet, x.r, x.c, x.after); });
    this.undoStack.push(a);
    return a;
  };
  S.History = History;
})();
