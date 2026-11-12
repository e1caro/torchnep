/* DotSheets canvas grid: virtual scrolling, mouse, keyboard and touch selection, in-cell editor, theme colours. */
(function () {
  'use strict';
  var DA = (window.DA = window.DA || {});
  var S = (DA.sheets = DA.sheets || {});

  var ROW_H = 24, COL_W = 92, HEAD_W = 46, HEAD_H = 26;

  function Grid(canvas, workbook, opts) {
    opts = opts || {};
    this.canvas = canvas;
    this.wrap = canvas.parentElement;
    this.ctx = canvas.getContext('2d');
    this.wb = workbook;
    this.scrollX = 0;
    this.scrollY = 0;
    this.cursor = { r: 0, c: 0 };
    this.sel = { r1: 0, c1: 0, r2: 0, c2: 0 };
    this.history = new S.History();
    this.editing = null;
    this.clip = null;
    this.onSelect = null;
    this.onChange = null;
    this.onEditText = null;
    this.readOnly = !!opts.readOnly;
    canvas.setAttribute('tabindex', '0');
    canvas.setAttribute('role', 'grid');
    canvas.setAttribute('aria-label', 'Spreadsheet. Arrow keys move, type to enter a value, F2 edits, Enter saves.');
    this.editor = document.createElement('input');
    this.editor.className = 'sheets-cell-editor';
    this.editor.setAttribute('aria-label', 'Cell editor');
    this.editor.setAttribute('autocomplete', 'off');
    this.editor.setAttribute('autocapitalize', 'off');
    this.editor.setAttribute('spellcheck', 'false');
    this.editor.hidden = true;
    this.wrap.appendChild(this.editor);
    this.live = document.createElement('div');
    this.live.className = 'sr-only';
    this.live.setAttribute('aria-live', 'polite');
    this.wrap.appendChild(this.live);
    this.listeners = [];
    this.initEvents();
    this.resize();
  }

  Grid.prototype.sheet = function () { return this.wb.activeSheet(); };
  Grid.prototype.colW = function (c) { var w = this.sheet().colWidths; return (w && w[c]) || COL_W; };
  Grid.prototype.rowH = function (r) { var hh = this.sheet().rowHeights; return (hh && hh[r]) || ROW_H; };
  Grid.prototype.colX = function (c) { var x = 0; for (var i = 0; i < c; i++) x += this.colW(i); return x; };
  Grid.prototype.rowY = function (r) {
    var hh = this.sheet().rowHeights;
    if (!hh || !Object.keys(hh).length) return r * ROW_H;
    var y = 0; for (var i = 0; i < r; i++) y += this.rowH(i); return y;
  };

  Grid.prototype.theme = function () {
    var cs = getComputedStyle(document.documentElement);
    function v(n, d) { var x = cs.getPropertyValue(n).trim(); return x || d; }
    var font = getComputedStyle(document.body).fontFamily || 'sans-serif';
    return {
      bg: v('--surface', '#ffffff'), head: v('--surface-2', '#f1f5f9'), line: v('--line', '#e2e8f0'), text: v('--text', '#0f172a'),
      muted: v('--muted', '#64748b'), accent: v('--accent', '#2563eb'), soft: v('--accent-soft', 'rgba(37,99,235,.12)'), bad: v('--bad', '#dc2626'), font: font,
    };
  };

  Grid.prototype.resize = function () {
    var dpr = window.devicePixelRatio || 1;
    var rect = this.canvas.getBoundingClientRect();
    this.width = Math.max(120, rect.width || this.wrap.clientWidth || 600);
    this.height = Math.max(120, rect.height || this.wrap.clientHeight || 400);
    this.canvas.width = Math.floor(this.width * dpr);
    this.canvas.height = Math.floor(this.height * dpr);
    this.ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    this.render();
    this.placeEditor();
  };

  Grid.prototype.visible = function () {
    var cols = [], rows = [], x = HEAD_W - this.scrollX, y = HEAD_H - this.scrollY, c, r, w, hh;
    for (c = 0; c < S.COLS; c++) { w = this.colW(c); if (x + w > HEAD_W) cols.push({ c: c, x: x, w: w }); x += w; if (x > this.width) break; }
    var start = Math.max(0, Math.floor(this.scrollY / ROW_H) - 1);
    y = HEAD_H - this.scrollY + this.rowY(start);
    for (r = start; r < S.ROWS; r++) { hh = this.rowH(r); if (y + hh > HEAD_H) rows.push({ r: r, y: y, h: hh }); y += hh; if (y > this.height) break; }
    return { cols: cols, rows: rows };
  };

  Grid.prototype.render = function () {
    var ctx = this.ctx, sh = this.sheet(), W = this.width, H = this.height, t = this.theme(), vis = this.visible();
    var sel = this.sel, rMin = Math.min(sel.r1, sel.r2), rMax = Math.max(sel.r1, sel.r2), cMin = Math.min(sel.c1, sel.c2), cMax = Math.max(sel.c1, sel.c2);
    ctx.fillStyle = t.bg; ctx.fillRect(0, 0, W, H);
    ctx.font = '13px ' + t.font;
    ctx.textBaseline = 'middle';
    ctx.lineWidth = 1;
    var multi = rMin !== rMax || cMin !== cMax;
    for (var i = 0; i < vis.rows.length; i++) {
      var vr = vis.rows[i];
      for (var j = 0; j < vis.cols.length; j++) {
        var vc = vis.cols[j];
        if (multi && vr.r >= rMin && vr.r <= rMax && vc.c >= cMin && vc.c <= cMax) { ctx.fillStyle = t.soft; ctx.fillRect(vc.x, vr.y, vc.w, vr.h); }
        ctx.strokeStyle = t.line; ctx.strokeRect(vc.x + 0.5, vr.y + 0.5, vc.w, vr.h);
        var cell = sh.getCell(vr.r, vc.c);
        var val = S.displayValue(cell);
        if (val === null || val === undefined || val === '') continue;
        if (this.editing && this.editing.r === vr.r && this.editing.c === vc.c) continue;
        var text = S.formatValue(val, cell.fmt), isNum = typeof val === 'number';
        ctx.fillStyle = val instanceof S.Err ? t.bad : t.text;
        ctx.textAlign = isNum ? 'right' : 'left';
        ctx.save(); ctx.beginPath(); ctx.rect(vc.x + 2, vr.y, vc.w - 4, vr.h); ctx.clip();
        ctx.fillText(text, isNum ? vc.x + vc.w - 6 : vc.x + 6, vr.y + vr.h / 2 + 1);
        ctx.restore();
      }
    }
    var box = this.cellRect(this.cursor.r, this.cursor.c);
    if (multi) {
      var a = this.cellRect(rMin, cMin), b = this.cellRect(rMax, cMax);
      ctx.strokeStyle = t.accent; ctx.lineWidth = 1; ctx.strokeRect(a.x + 0.5, a.y + 0.5, b.x + b.w - a.x, b.y + b.h - a.y);
    }
    ctx.strokeStyle = t.accent; ctx.lineWidth = 2; ctx.strokeRect(box.x + 1, box.y + 1, box.w - 1, box.h - 1);
    ctx.lineWidth = 1;
    ctx.fillStyle = t.head; ctx.fillRect(0, 0, W, HEAD_H); ctx.fillRect(0, 0, HEAD_W, H);
    ctx.textAlign = 'center'; ctx.font = '600 12px ' + t.font;
    vis.cols.forEach(function (col) {
      var on = col.c >= cMin && col.c <= cMax;
      ctx.fillStyle = on ? t.soft : t.head; ctx.fillRect(col.x, 0, col.w, HEAD_H);
      ctx.strokeStyle = t.line; ctx.strokeRect(col.x + 0.5, 0.5, col.w, HEAD_H);
      ctx.fillStyle = on ? t.accent : t.muted; ctx.fillText(S.colName(col.c), col.x + col.w / 2, HEAD_H / 2 + 1);
    });
    vis.rows.forEach(function (row) {
      var on = row.r >= rMin && row.r <= rMax;
      ctx.fillStyle = on ? t.soft : t.head; ctx.fillRect(0, row.y, HEAD_W, row.h);
      ctx.strokeStyle = t.line; ctx.strokeRect(0.5, row.y + 0.5, HEAD_W, row.h);
      ctx.fillStyle = on ? t.accent : t.muted; ctx.fillText(String(row.r + 1), HEAD_W / 2, row.y + row.h / 2 + 1);
    });
    ctx.fillStyle = t.head; ctx.fillRect(0, 0, HEAD_W, HEAD_H);
    ctx.strokeStyle = t.line; ctx.strokeRect(0.5, 0.5, HEAD_W, HEAD_H);
  };

  Grid.prototype.cellRect = function (r, c) {
    return { x: HEAD_W - this.scrollX + this.colX(c), y: HEAD_H - this.scrollY + this.rowY(r), w: this.colW(c), h: this.rowH(r) };
  };

  Grid.prototype.cellAt = function (px, py) {
    if (px < HEAD_W || py < HEAD_H) return null;
    var x = HEAD_W - this.scrollX, c = 0, w;
    for (; c < S.COLS; c++) { w = this.colW(c); if (px < x + w) break; x += w; }
    var y = HEAD_H - this.scrollY, r = 0, hh;
    for (; r < S.ROWS; r++) { hh = this.rowH(r); if (py < y + hh) break; y += hh; }
    return { r: r, c: c };
  };

  Grid.prototype.pageRows = function () { return Math.max(1, Math.floor((this.height - HEAD_H) / ROW_H) - 1); };

  Grid.prototype.ensureVisible = function (r, c) {
    var x = this.colX(c), y = this.rowY(r), w = this.colW(c), hh = this.rowH(r);
    var vw = this.width - HEAD_W, vh = this.height - HEAD_H;
    if (x < this.scrollX) this.scrollX = x; else if (x + w > this.scrollX + vw) this.scrollX = Math.max(0, x + w - vw);
    if (y < this.scrollY) this.scrollY = y; else if (y + hh > this.scrollY + vh) this.scrollY = Math.max(0, y + hh - vh);
  };

  Grid.prototype.select = function (state, silent) {
    this.cursor = state.cursor;
    this.sel = state.sel;
    var end = { r: this.sel.r2, c: this.sel.c2 };
    this.ensureVisible(end.r, end.c);
    this.render();
    var cell = this.sheet().getCell(this.cursor.r, this.cursor.c);
    this.live.textContent = S.addr(this.cursor.r, this.cursor.c) + ' ' + S.formatValue(S.displayValue(cell), cell && cell.fmt);
    if (this.onSelect && !silent) this.onSelect(cell, this.cursor.r, this.cursor.c);
  };

  Grid.prototype.goTo = function (r, c) { this.select({ cursor: { r: r, c: c }, sel: { r1: r, c1: c, r2: r, c2: c } }); };

  Grid.prototype.apply = function (changes) {
    this.history.push(this.sheet(), changes);
    this.wb.recalc();
    this.render();
    if (this.onChange) this.onChange();
    if (this.onSelect) this.onSelect(this.sheet().getCell(this.cursor.r, this.cursor.c), this.cursor.r, this.cursor.c);
  };

  Grid.prototype.placeEditor = function () {
    if (!this.editing) { this.editor.hidden = true; return; }
    var b = this.cellRect(this.editing.r, this.editing.c);
    var st = this.editor.style;
    st.left = Math.max(HEAD_W, b.x) + 'px'; st.top = Math.max(HEAD_H, b.y) + 'px';
    st.minWidth = b.w + 'px'; st.height = b.h + 'px';
  };

  Grid.prototype.beginEdit = function (text, mode, noFocus) {
    if (this.readOnly) return;
    var cell = this.sheet().getCell(this.cursor.r, this.cursor.c);
    this.editing = { r: this.cursor.r, c: this.cursor.c, mode: mode || 'edit', original: S.cellText(cell) };
    this.ensureVisible(this.cursor.r, this.cursor.c);
    this.editor.value = text === undefined ? this.editing.original : text;
    this.editor.hidden = false;
    this.placeEditor();
    this.render();
    if (noFocus) return;
    this.editor.focus();
    var n = this.editor.value.length;
    try { this.editor.setSelectionRange(n, n); } catch (e) { }
    if (this.onEditText) this.onEditText(this.editor.value, true);
  };

  Grid.prototype.setEditText = function (text) {
    if (!this.editing) this.beginEdit(text, 'edit');
    else this.editor.value = text;
  };

  Grid.prototype.commit = function (move, text) {
    var ed = this.editing;
    if (!ed) return false;
    var value = text === undefined ? this.editor.value : text;
    this.editing = null;
    this.editor.hidden = true;
    if (value !== ed.original) this.apply([S.setInput(this.sheet(), ed.r, ed.c, value)]);
    this.cursor = { r: ed.r, c: ed.c };
    if (move) this.select(S.stepInSelection({ cursor: this.cursor, sel: this.sel }, move));
    else this.render();
    this.canvas.focus({ preventScroll: true });
    return true;
  };

  Grid.prototype.cancel = function () {
    if (!this.editing) return;
    this.editing = null;
    this.editor.hidden = true;
    this.render();
    if (this.onSelect) this.onSelect(this.sheet().getCell(this.cursor.r, this.cursor.c), this.cursor.r, this.cursor.c);
    this.canvas.focus({ preventScroll: true });
  };

  Grid.prototype.enterText = function (text, move) {
    var changes = [S.setInput(this.sheet(), this.cursor.r, this.cursor.c, text)];
    this.apply(changes);
    if (move) this.select(S.stepInSelection({ cursor: this.cursor, sel: this.sel }, move));
  };

  Grid.prototype.copy = function () {
    this.clip = S.copyRange(this.sheet(), this.sel);
    return this.clip.text;
  };

  Grid.prototype.paste = function (text) {
    if (this.readOnly) return;
    var clip = this.clip && (text === undefined || text === this.clip.text) ? this.clip : { text: text || '' };
    this.apply(S.pasteAt(this.sheet(), this.cursor.r, this.cursor.c, clip));
  };

  Grid.prototype.undo = function () { if (this.history.undo()) { this.wb.recalc(); this.render(); if (this.onChange) this.onChange(); this.select({ cursor: this.cursor, sel: this.sel }); } };
  Grid.prototype.redo = function () { if (this.history.redo()) { this.wb.recalc(); this.render(); if (this.onChange) this.onChange(); this.select({ cursor: this.cursor, sel: this.sel }); } };

  Grid.prototype.handleKey = function (e) {
    var ctrl = e.ctrlKey || e.metaKey, k = e.key;
    if (ctrl && !e.altKey && (k === 'z' || k === 'Z')) { e.preventDefault(); if (e.shiftKey) this.redo(); else this.undo(); return; }
    if (ctrl && !e.altKey && (k === 'y' || k === 'Y')) { e.preventDefault(); this.redo(); return; }
    if (ctrl && (k === 'c' || k === 'C' || k === 'x' || k === 'X')) {
      this.copy(); this.pendingCut = k === 'x' || k === 'X';
      if (!window.ClipboardEvent) e.preventDefault();
      return;
    }
    if (ctrl && (k === 'v' || k === 'V')) {
      var self = this; this.pasteDone = false;
      setTimeout(function () { if (!self.pasteDone && self.clip) self.paste(); }, 60);
      return;
    }
    if (ctrl && (k === 'a' || k === 'A')) { e.preventDefault(); var u = S.usedRange(this.sheet()); this.select({ cursor: { r: 0, c: 0 }, sel: { r1: 0, c1: 0, r2: u.r2, c2: u.c2 } }); return; }
    if (k === 'Enter' || k === 'Tab') {
      e.preventDefault();
      this.select(S.stepInSelection({ cursor: this.cursor, sel: this.sel }, k === 'Enter' ? (e.shiftKey ? 'up' : 'down') : (e.shiftKey ? 'left' : 'right')));
      return;
    }
    if (k === 'F2') { e.preventDefault(); this.beginEdit(undefined, 'edit'); return; }
    if (k === 'Delete' || k === 'Backspace') { e.preventDefault(); if (!this.readOnly) this.apply(S.clearRange(this.sheet(), this.sel)); return; }
    var nav = S.navKey(this.sheet(), { cursor: this.cursor, sel: this.sel }, k, { shift: e.shiftKey, ctrl: ctrl }, this.pageRows());
    if (nav) { e.preventDefault(); this.select(nav); return; }
    if (!ctrl && !e.altKey && k.length === 1) { e.preventDefault(); this.beginEdit(k, 'enter'); }
  };

  Grid.prototype.handleEditorKey = function (e) {
    var k = e.key;
    if (k === 'Enter') { e.preventDefault(); this.commit(e.shiftKey ? 'up' : 'down'); return; }
    if (k === 'Tab') { e.preventDefault(); this.commit(e.shiftKey ? 'left' : 'right'); return; }
    if (k === 'Escape') { e.preventDefault(); this.cancel(); return; }
    if (k === 'F2') { e.preventDefault(); if (this.editing) this.editing.mode = this.editing.mode === 'enter' ? 'edit' : 'enter'; return; }
    if (k === 'F4') { e.preventDefault(); this.editor.value = S.toggleF4 ? S.toggleF4(this.editor.value) : this.editor.value; if (this.onEditText) this.onEditText(this.editor.value); return; }
    var DIR = { ArrowUp: 'up', ArrowDown: 'down', ArrowLeft: 'left', ArrowRight: 'right' };
    if (this.editing && this.editing.mode === 'enter' && DIR[k] && !/[(,:=+\-*/^&<>]$/.test(this.editor.value)) {
      e.preventDefault();
      var dir = DIR[k];
      this.commit(null);
      this.select(S.navKey(this.sheet(), { cursor: this.cursor, sel: this.sel }, k, {}, this.pageRows()));
      return dir;
    }
  };

  Grid.prototype.on = function (target, type, fn, opt) { target.addEventListener(type, fn, opt); this.listeners.push([target, type, fn, opt]); };
  Grid.prototype.destroy = function () {
    this.listeners.forEach(function (l) { l[0].removeEventListener(l[1], l[2], l[3]); });
    this.listeners = [];
    if (this.observer) { this.observer.disconnect(); this.observer = null; }
  };

  Grid.prototype.initEvents = function () {
    var self = this, cv = this.canvas, drag = false, touch = null;
    function pos(e) { var rect = cv.getBoundingClientRect(); return { x: e.clientX - rect.left, y: e.clientY - rect.top }; }
    this.on(cv, 'mousedown', function (e) {
      if (self.editing) self.commit(null);
      var p = pos(e), cell = self.cellAt(p.x, p.y);
      cv.focus({ preventScroll: true });
      if (!cell) return;
      e.preventDefault();
      if (e.shiftKey) self.select({ cursor: self.cursor, sel: { r1: self.cursor.r, c1: self.cursor.c, r2: cell.r, c2: cell.c } });
      else self.select({ cursor: cell, sel: { r1: cell.r, c1: cell.c, r2: cell.r, c2: cell.c } });
      drag = true;
    });
    this.on(window, 'mousemove', function (e) {
      if (!cv.isConnected) { self.destroy(); return; }
      if (!drag) return;
      var p = pos(e), cell = self.cellAt(Math.max(HEAD_W + 1, p.x), Math.max(HEAD_H + 1, p.y));
      if (cell && (cell.r !== self.sel.r2 || cell.c !== self.sel.c2)) self.select({ cursor: self.cursor, sel: { r1: self.cursor.r, c1: self.cursor.c, r2: cell.r, c2: cell.c } }, true);
    });
    this.on(window, 'mouseup', function () { drag = false; });
    this.on(cv, 'dblclick', function (e) {
      var p = pos(e), cell = self.cellAt(p.x, p.y);
      if (!cell) return;
      self.goTo(cell.r, cell.c);
      self.beginEdit(undefined, 'edit');
    });
    this.on(cv, 'wheel', function (e) {
      e.preventDefault();
      self.scrollX = Math.max(0, self.scrollX + (e.shiftKey ? e.deltaY : e.deltaX));
      self.scrollY = Math.max(0, self.scrollY + (e.shiftKey ? 0 : e.deltaY));
      self.render(); self.placeEditor();
    }, { passive: false });
    this.on(cv, 'touchstart', function (e) {
      if (e.touches.length !== 1) return;
      var t = e.touches[0];
      touch = { x: t.clientX, y: t.clientY, sx: self.scrollX, sy: self.scrollY, moved: false };
    }, { passive: true });
    this.on(cv, 'touchmove', function (e) {
      if (!touch || e.touches.length !== 1) return;
      var t = e.touches[0], dx = t.clientX - touch.x, dy = t.clientY - touch.y;
      if (Math.abs(dx) + Math.abs(dy) > 8) touch.moved = true;
      if (!touch.moved) return;
      e.preventDefault();
      self.scrollX = Math.max(0, touch.sx - dx); self.scrollY = Math.max(0, touch.sy - dy);
      self.render(); self.placeEditor();
    }, { passive: false });
    this.on(cv, 'touchend', function (e) {
      if (!touch) return;
      var t = touch; touch = null;
      if (t.moved) return;
      e.preventDefault();
      var rect = cv.getBoundingClientRect(), cell = self.cellAt(t.x - rect.left, t.y - rect.top);
      if (!cell) return;
      if (self.editing) self.commit(null);
      if (cell.r === self.cursor.r && cell.c === self.cursor.c) self.beginEdit(undefined, 'edit');
      else { cv.focus({ preventScroll: true }); self.goTo(cell.r, cell.c); }
    }, { passive: false });
    this.on(cv, 'keydown', function (e) { if (!self.editing) self.handleKey(e); });
    this.on(cv, 'copy', function (e) {
      var text = self.copy();
      if (e.clipboardData) { e.clipboardData.setData('text/plain', text); e.preventDefault(); }
    });
    this.on(cv, 'cut', function (e) {
      var text = self.copy();
      if (e.clipboardData) { e.clipboardData.setData('text/plain', text); e.preventDefault(); }
      self.apply(S.clearRange(self.sheet(), self.sel));
    });
    this.on(cv, 'paste', function (e) {
      var text = e.clipboardData ? e.clipboardData.getData('text/plain') : undefined;
      self.pasteDone = true;
      e.preventDefault();
      self.paste(text);
    });
    this.on(this.editor, 'keydown', function (e) { self.handleEditorKey(e); });
    this.on(this.editor, 'input', function () { if (self.onEditText) self.onEditText(self.editor.value); });
    this.on(this.editor, 'blur', function () {
      setTimeout(function () { if (self.editing && document.activeElement !== self.editor && !(self.keepEditing && self.keepEditing())) self.commit(null); }, 0);
    });
    this.on(window, 'resize', function () { if (!cv.isConnected) { self.destroy(); return; } self.resize(); });
    if (window.ResizeObserver) {
      this.observer = new ResizeObserver(function () { if (cv.isConnected) self.resize(); });
      this.observer.observe(this.wrap);
    }
  };

  S.Grid = Grid;
})();
