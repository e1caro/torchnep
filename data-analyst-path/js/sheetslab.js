/* DotSheets: the spreadsheet lab view (world map, challenge page with grid, formula bar and ribbon). */
(function () {
  'use strict';
  var DA = (window.DA = window.DA || {});
  var ui = DA.ui, h = ui.h, L = DA.labgame;
  DA.views = DA.views || {};
  var S = DA.sheets;
  var books = {};

  function getLab() { return L.get('sheets'); }

  function fromLesson(lessonId) {
    var lb = getLab(), all = [];
    lb.levels.forEach(function (lv) { all = all.concat(lv.challenges); });
    return all.filter(function (c) { return c.lessonId === lessonId; })[0] || null;
  }

  DA.views.sheets = function (params) {
    var lb = getLab();
    if (params[0] === 'play') {
      var c = lb.byId[params[1]];
      if (!c) return L.mapView(lb);
      return L.isUnlocked(lb, c) ? page(lb, c) : L.lockedView(lb, c);
    }
    if (params[1]) {
      var fromOld = fromLesson(params[1]);
      if (fromOld && L.isUnlocked(lb, fromOld)) return page(lb, fromOld);
      if (fromOld) setTimeout(function () { ui.toast('This lesson\'s challenges are in Level ' + fromOld.level.world.n + '.' + fromOld.level.n + ': solve the levels before it to open them.'); }, 50);
    }
    return L.mapView(lb);
  };

  function page(lb, c) {
    var P = L.page(lb, c, { wide: true, useExample: function (ex) { useExample(ex); } });
    var work = P.work;
    var wb = books[c.id] || (books[c.id] = S.datasetWorkbook(c.ds));
    var grid = null, lastField = null;

    var nameBox = h('input', { class: 'sheets-name-box', 'aria-label': 'Cell address. Type an address and press Enter to go there.', value: 'A1' });
    var fx = h('input', { class: 'sheets-fx-input', 'aria-label': 'Formula bar', autocomplete: 'off', autocapitalize: 'off', spellcheck: 'false', placeholder: 'Type a value or a formula like =SUM(H2:H100)' });
    work.appendChild(h('div', { class: 'sheets-fx-bar' }, nameBox, h('span', { class: 'sheets-fx-label', 'aria-hidden': 'true', text: 'fx' }), fx));

    function field() {
      if (grid && grid.editing && document.activeElement === grid.editor) return grid.editor;
      if (document.activeElement === fx || lastField === fx) return fx;
      return grid && grid.editing ? grid.editor : fx;
    }
    function insert(tok, back) {
      var f = field();
      if (f === fx && !grid.editing) grid.beginEdit(S.cellText(wb.activeSheet().getCell(grid.cursor.r, grid.cursor.c)), 'edit', true);
      var a = f.selectionStart === null ? f.value.length : f.selectionStart, b = f.selectionEnd === null ? a : f.selectionEnd, v = f.value;
      if (!v.trim() && /^[A-Z]/.test(tok)) { tok = '=' + tok; }
      f.value = v.slice(0, a) + tok + v.slice(b);
      var pos = a + tok.length - (back || 0);
      f.focus({ preventScroll: true });
      try { f.setSelectionRange(pos, pos); } catch (e) { }
      sync(f);
    }
    function sync(from) {
      if (!grid) return;
      if (from === fx) { if (grid.editing) grid.editor.value = fx.value; }
      else fx.value = grid.editor.value;
    }
    var KEYS = [['=', '='], ['SUM()', 'SUM()', 1], ['AVERAGE()', 'AVERAGE()', 1], ['COUNTIF()', 'COUNTIF()', 1], ['SUMIFS()', 'SUMIFS()', 1], ['IF()', 'IF()', 1],
      ['XLOOKUP()', 'XLOOKUP()', 1], ['FILTER()', 'FILTER()', 1], ['UNIQUE()', 'UNIQUE()', 1], ['SORT()', 'SORT()', 1], ['ROUND()', 'ROUND()', 1],
      [':', ':'], [',', ', '], ['$', '$'], ['"', '""', 1], ['(', '('], [')', ')'], ['+', '+'], ['-', '-'], ['*', '*'], ['/', '/'], ['>=', '>='], ['&', '&']];
    work.appendChild(h('div', { class: 'sql-keys', role: 'toolbar', 'aria-label': 'Formula shortcuts' },
      KEYS.map(function (k) { return h('button', { class: 'key', type: 'button', 'aria-label': 'Insert ' + k[0], onmousedown: function (e) { e.preventDefault(); }, onclick: function () { insert(k[1], k[2]); } }, k[0]); })));

    var ribbonBar = h('div', { class: 'sheets-ribbon-bar row' });
    var tabsRow = h('div', { class: 'tabs sheets-tabs', role: 'tablist', 'aria-label': 'Ribbon' });
    var activeTab = 'Home';
    ['Home', 'Formulas', 'Data', 'Insert'].forEach(function (t) {
      tabsRow.appendChild(h('button', { class: 'tab' + (t === activeTab ? ' active' : ''), type: 'button', role: 'tab', 'aria-selected': t === activeTab ? 'true' : 'false', onclick: function () {
        activeTab = t;
        Array.prototype.forEach.call(tabsRow.children, function (b) { var on = b.textContent === t; b.classList.toggle('active', on); b.setAttribute('aria-selected', on ? 'true' : 'false'); });
        paintRibbon();
      } }, t));
    });
    var ribbon = h('details', { class: 'sheets-ribbon' }, h('summary', null, 'Ribbon: formats, functions, data tools'), tabsRow, ribbonBar);
    if (!(window.matchMedia && window.matchMedia('(max-width: 700px)').matches)) ribbon.open = true;
    work.appendChild(ribbon);

    function rb(label, fn) { return h('button', { class: 'btn tiny ghost', type: 'button', onclick: fn }, label); }
    function selRange() { var s = grid.sel; return { r1: Math.min(s.r1, s.r2), c1: Math.min(s.c1, s.c2), r2: Math.max(s.r1, s.r2), c2: Math.max(s.c1, s.c2) }; }
    function setFmt(fmt, label) {
      var s = selRange(), sh = wb.activeSheet(), changes = [];
      for (var r = s.r1; r <= s.r2; r++) for (var cc = s.c1; cc <= s.c2; cc++) {
        var before = S.snapshot(sh, r, cc);
        if (!before) continue;
        sh.ensureCell(r, cc).fmt = fmt;
        changes.push({ r: r, c: cc, before: before, after: S.snapshot(sh, r, cc) });
      }
      grid.apply(changes); grid.canvas.focus(); ui.toast('Format: ' + label);
    }
    function dataEnd() { return S.usedRange(wb.activeSheet()); }
    function paintRibbon() {
      ui.clear(ribbonBar);
      if (activeTab === 'Home') {
        [['General', null], ['0.00', '0.00'], ['Currency', '$#,##0.00'], ['Percent', '0.0%'], ['Date', 'yyyy-mm-dd']].forEach(function (f) {
          ribbonBar.appendChild(rb(f[0], function () { setFmt(f[1], f[0]); }));
        });
        ribbonBar.appendChild(rb('↶ Undo', function () { grid.undo(); grid.canvas.focus(); }));
        ribbonBar.appendChild(rb('↷ Redo', function () { grid.redo(); grid.canvas.focus(); }));
      } else if (activeTab === 'Formulas') {
        ['SUM', 'AVERAGE', 'COUNTIFS', 'SUMIFS', 'XLOOKUP', 'INDEX', 'MATCH', 'FILTER', 'UNIQUE', 'SORT', 'LET'].forEach(function (f) {
          ribbonBar.appendChild(rb(f, function () { insert(f + '()', 1); }));
        });
      } else if (activeTab === 'Data') {
        ribbonBar.appendChild(rb('Sort A→Z', function () { sortBy(true); }));
        ribbonBar.appendChild(rb('Sort Z→A', function () { sortBy(false); }));
        ribbonBar.appendChild(rb('Remove duplicates', function () {
          var u = dataEnd(), res = S.removeDuplicates(wb.activeSheet(), 1, 0, u.r2, u.c2, [grid.cursor.c]);
          grid.history = new S.History(); wb.recalc(); grid.render(); ui.toast('Removed ' + res.removed + ' rows with a repeated ' + S.colName(grid.cursor.c) + ' value.');
        }));
        ribbonBar.appendChild(rb('Text to columns', function () {
          var u = dataEnd(); S.textToColumns(wb.activeSheet(), 1, grid.cursor.c, u.r2, ',');
          grid.history = new S.History(); wb.recalc(); grid.render(); ui.toast('Column ' + S.colName(grid.cursor.c) + ' split at the commas.');
        }));
      } else if (activeTab === 'Insert') {
        ribbonBar.appendChild(rb('Pivot: quantity by this column', function () {
          var sh = wb.activeSheet(), u = dataEnd();
          var res = S.buildPivot(sh, 0, 0, u.r2, u.c2, { rowCol: grid.cursor.c, valCol: 7, aggFn: 'SUM' });
          var psh = wb.addSheet('Pivot' + wb.sheets.length);
          res.forEach(function (row, r) { row.forEach(function (v, cc) { S.setInput(psh, r, cc, typeof v === 'number' ? String(v) : v); }); });
          showSheet(wb.sheets.length - 1); ui.toast('Pivot table added on a new sheet.');
        }));
        ribbonBar.appendChild(rb('Export .xlsx', function () {
          S.exportXlsx(wb).then(function (bytes) { ui.downloadBinary('dotsheets.xlsx', bytes, 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'); ui.toast('Exported dotsheets.xlsx'); },
            function () { ui.toast('Export failed.'); });
        }));
      }
    }
    function sortBy(asc) {
      var u = dataEnd();
      S.sortRange(wb.activeSheet(), 1, 0, u.r2, u.c2, grid.cursor.c, asc);
      grid.history = new S.History(); wb.recalc(); grid.render(); ui.toast('Rows sorted by column ' + S.colName(grid.cursor.c) + (asc ? ' A→Z' : ' Z→A') + '.');
    }
    paintRibbon();

    var canvas = h('canvas', { class: 'sheets-canvas' });
    var wrap = h('div', { class: 'sheets-canvas-wrap' }, canvas);
    work.appendChild(wrap);

    var tabsBar = h('div', { class: 'sheets-bottom-bar', role: 'tablist', 'aria-label': 'Sheets in this workbook' });
    work.appendChild(tabsBar);
    function paintTabs() {
      ui.clear(tabsBar);
      wb.sheets.forEach(function (sh, i) {
        tabsBar.appendChild(h('button', { class: 'sheets-tab' + (i === wb.activeSheetIdx ? ' active' : ''), type: 'button', role: 'tab', 'aria-selected': i === wb.activeSheetIdx ? 'true' : 'false', onclick: function () { showSheet(i); } }, sh.name));
      });
      tabsBar.appendChild(h('button', { class: 'btn tiny ghost', type: 'button', onclick: function () { wb.addSheet(); showSheet(wb.sheets.length - 1); } }, '+ Sheet'));
    }
    function showSheet(i) {
      if (grid.editing) grid.commit(null);
      wb.activeSheetIdx = i; grid.scrollX = 0; grid.scrollY = 0; grid.history = new S.History();
      paintTabs(); grid.goTo(0, 0); grid.canvas.focus();
    }

    var checkBtn = h('button', { class: 'btn accent', type: 'button', onclick: check }, '✓ Check');
    var armed = false;
    var resetBtn = h('button', { class: 'btn ghost', type: 'button', onclick: function () {
      if (!armed) { armed = true; resetBtn.textContent = 'Press again to reset'; setTimeout(function () { armed = false; resetBtn.textContent = 'Reset sheet'; }, 3000); return; }
      books[c.id] = S.datasetWorkbook(c.ds); DA.render();
      ui.toast('Original data reloaded.');
    } }, 'Reset sheet');
    work.appendChild(P.actions(checkBtn));
    work.appendChild(h('div', { class: 'row actions-more' }, resetBtn, h('span', { class: 'muted small grow', text: c.ds === 'messy' ? 'Data: messy hand-typed orders' : 'Data: café orders (first ' + (S.ROWS_LOADED - 1) + ' lines)' })));

    function check() {
      P.ran();
      if (grid.editing) grid.commit(null);
      wb.recalc(); grid.render();
      var res = c.check(wb);
      P.verdict(res);
    }

    function useExample(ex) {
      var m = /^([A-Z]+\d+):\s*(.*)$/.exec(ex.code);
      if (!m) return;
      var a = S.parseAddr(m[1]);
      if (wb.activeSheetIdx !== 0) showSheet(0);
      grid.goTo(a.r, a.c);
      grid.beginEdit(m[2], 'edit');
      ui.toast('Example typed into ' + m[1] + '. Press Enter to keep it, Escape to cancel.');
    }

    nameBox.addEventListener('keydown', function (e) {
      if (e.key !== 'Enter') return;
      e.preventDefault();
      var a = S.parseAddr(nameBox.value.trim().toUpperCase());
      if (a) { grid.goTo(a.r, a.c); grid.canvas.focus(); } else ui.toast('Type an address like B12.');
    });
    fx.addEventListener('focus', function () { lastField = fx; });
    fx.addEventListener('input', function () {
      if (!grid.editing) grid.beginEdit(fx.value, 'edit', true);
      else grid.editor.value = fx.value;
      grid.render();
    });
    fx.addEventListener('keydown', function (e) {
      if (e.key === 'Enter' || e.key === 'Tab') {
        e.preventDefault();
        var move = e.key === 'Enter' ? (e.shiftKey ? 'up' : 'down') : (e.shiftKey ? 'left' : 'right');
        if (grid.editing) grid.commit(move, fx.value); else grid.enterText(fx.value, move);
        grid.canvas.focus();
      } else if (e.key === 'Escape') {
        e.preventDefault();
        grid.cancel();
        fx.value = S.cellText(wb.activeSheet().getCell(grid.cursor.r, grid.cursor.c));
      } else if (e.key === 'F4') {
        e.preventDefault();
        fx.value = S.toggleF4(fx.value);
        sync(fx);
      }
    });

    setTimeout(function () {
      if (!canvas.isConnected) return;
      grid = new S.Grid(canvas, wb);
      grid.keepEditing = function () { return document.activeElement === fx; };
      grid.onSelect = function (cell, r, cc) {
        nameBox.value = S.addr(r, cc);
        if (document.activeElement !== fx) fx.value = S.cellText(cell);
        lastField = null;
      };
      grid.onEditText = function (text) { fx.value = text; };
      grid.goTo(0, 0);
      paintTabs();
    }, 0);
    return P.root;
  }
})();
