/* SQLab: practise SQL in the browser (SQLite compiled to WebAssembly via sql.js).
 * Challenges are checked by running a reference query and comparing the two results.
 */
(function () {
  'use strict';
  var DA = (window.DA = window.DA || {});
  var ui = DA.ui, h = ui.h;
  DA.views = DA.views || {};

  /* ---------- engine ---------- */

  var enginePromise = null;
  var userDbs = {}, refDbs = {};

  function loadEngine() {
    if (enginePromise) return enginePromise;
    enginePromise = new Promise(function (resolve, reject) {
      var s = document.createElement('script');
      s.src = 'vendor/sql.js/sql-wasm.js';
      s.onload = function () {
        window.initSqlJs({ locateFile: function (f) { return 'vendor/sql.js/' + f; } }).then(resolve, reject);
      };
      s.onerror = function () { reject(new Error('Could not load vendor/sql.js/sql-wasm.js')); };
      document.head.appendChild(s);
    });
    enginePromise.catch(function () { enginePromise = null; }); // allow a retry
    return enginePromise;
  }
  function getDb(SQL, ds, fresh) {
    if (fresh || !userDbs[ds]) {
      if (userDbs[ds]) userDbs[ds].close();
      userDbs[ds] = DA.buildDb(SQL, ds);
    }
    return userDbs[ds];
  }
  function getRef(SQL, ds) {
    if (!refDbs[ds]) refDbs[ds] = DA.buildDb(SQL, ds); // never exposed to the learner
    return refDbs[ds];
  }
  function lastResult(res) { return res && res.length ? res[res.length - 1] : undefined; }

  // True when any statement in the text starts with a keyword that changes data or structure.
  // (db.getRowsModified() is no use here: SQLite keeps the count of the last INSERT after a SELECT.)
  function changesData(sql) {
    return sql.split(';').some(function (stmt) {
      var s = stmt.replace(/^(\s+|--[^\n]*(\n|$)|\/\*[\s\S]*?\*\/)*/, '');
      return /^(insert|update|delete|drop|alter|create|replace|pragma|vacuum)\b/i.test(s);
    });
  }

  /* ---------- editor memory & undo/redo store ---------- */

  var MEM_KEY = 'data-analyst-path.sql-mem.v1';
  var LEVELS = DA.sqlLevels || {
    1: 'Level 1: Foundations — SELECT, WHERE & ORDER BY',
    2: 'Level 2: Aggregations — COUNT, SUM, AVG & GROUP BY',
    3: 'Level 3: Multi-Table Joins & HAVING',
    4: 'Level 4: Dates, CASE WHEN & Conditional Metrics',
    5: 'Level 5: Subqueries, CTEs (WITH) & Anti-Joins',
    6: 'Level 6: Window Functions — Ranking & Running Totals',
    7: 'Level 7: Time-Series, LAG/LEAD & Repeat Behavior',
    8: 'Level 8: Staff Analyst & Executive Case Studies',
  };
  var drafts = {};     // typed queries, kept in memory & localStorage
  var histories = {};  // draftKey -> { stack: [{v, s, e}], idx: number, lastTs: number }
  var recentQueries = {}; // dsId -> [sql, ...]
  var attempts = {};   // challenge id → number of checks (gates "show solution")

  function loadMem() {
    try {
      var raw = JSON.parse(localStorage.getItem(MEM_KEY) || 'null');
      if (!raw || typeof raw !== 'object') return;
      if (raw.drafts && typeof raw.drafts === 'object') {
        Object.keys(raw.drafts).slice(0, 200).forEach(function (k) {
          if (typeof raw.drafts[k] === 'string') drafts[k] = raw.drafts[k].slice(0, 8000);
        });
      }
      if (raw.histories && typeof raw.histories === 'object') {
        Object.keys(raw.histories).slice(0, 200).forEach(function (k) {
          var hObj = raw.histories[k];
          if (hObj && Array.isArray(hObj.stack) && hObj.stack.length) {
            var clean = hObj.stack.slice(-60).map(function (st) {
              return { v: String(st && st.v || '').slice(0, 8000), s: Number(st && st.s) || 0, e: Number(st && st.e) || 0 };
            });
            histories[k] = { stack: clean, idx: Math.max(0, Math.min(clean.length - 1, Number(hObj.idx) || 0)), lastTs: 0 };
          }
        });
      }
      if (raw.recent && typeof raw.recent === 'object') {
        Object.keys(raw.recent).forEach(function (ds) {
          if (Array.isArray(raw.recent[ds])) {
            recentQueries[ds] = raw.recent[ds].filter(function (q) { return typeof q === 'string' && q.trim(); }).slice(0, 15);
          }
        });
      }
    } catch (e) { /* storage unavailable */ }
  }
  function saveMem() {
    try {
      localStorage.setItem(MEM_KEY, JSON.stringify({ drafts: drafts, histories: histories, recent: recentQueries }));
    } catch (e) { /* storage full or blocked */ }
  }
  loadMem();

  // Shared with the SQL blocks game, which checks answers by running them.
  DA.sqlEngine = { load: loadEngine, ref: getRef };

  var sqlLab = null;
  function getSqlLab() { return sqlLab || (sqlLab = DA.labgame.register(DA.buildSqlLab())); }
  DA.sqlLab = getSqlLab;

  DA.views.lab = function (params) {
    var L = DA.labgame, lab = getSqlLab();
    if (!params[0]) return L.mapView(lab);
    var dsId = params[0] && DA.datasets[params[0]] ? params[0] : ui.defaultDataset();
    var ds = DA.datasets[dsId];
    var list = DA.challenges.filter(function (c) { return c.ds === dsId; });
    var examples = (DA.sqlExamples || []).filter(function (ex) { return ex.ds === dsId; });
    var cur = list.filter(function (c) { return c.id === params[1]; })[0] || null;
    var wcur = cur ? lab.byId[cur.id] : null;
    if (wcur && !L.isUnlocked(lab, wcur)) return L.lockedView(lab, wcur);
    var session = { hinted: false };
    var draftKey = dsId + ':' + (cur ? cur.id : 'free');
    var SQL = null, dirty = false, lastError = '', lastRun = null, activePreviewTable = null;

    var root = h('div', { class: 'view lab' });
    root.appendChild(L.header(lab, wcur ? 'World ' + wcur.level.world.n + ': ' + wcur.level.world.title + ' · Level ' + wcur.level.world.n + '.' + wcur.level.n + ': ' + wcur.level.title : 'Free exploration · ' + ds.title));

    // dataset tabs
    var tabs = h('div', { class: 'tabs', role: 'group', 'aria-label': 'Choose a dataset' },
      Object.keys(DA.datasets).map(function (id) {
        return h('a', { class: 'tab' + (id === dsId ? ' active' : ''), href: '#/lab/' + id, 'aria-current': id === dsId ? 'page' : null, text: DA.datasets[id].short || DA.datasets[id].title });
      }));
    root.appendChild(tabs);
    root.appendChild(h('p', { class: 'muted lab-blurb', text: ds.blurb }));

    var status = h('div', { class: 'callout info compact', role: 'status' }, 'Loading the SQL engine…');
    root.appendChild(status);

    var layout = h('div', { class: 'lab-layout' });
    var side = h('aside', { class: 'lab-side' });
    var main = h('section', { class: 'lab-main', 'aria-label': 'Query editor' });
    layout.appendChild(side);
    layout.appendChild(main);
    root.appendChild(layout);

    /* editor + undo/redo memory */
    var editor = h('textarea', {
      class: 'sql-editor', spellcheck: 'false', autocapitalize: 'off', autocomplete: 'off', rows: '9',
      'aria-label': 'SQL query', placeholder: 'Write your SQL here, then press Run (Ctrl/Cmd + Enter). Undo any time with Ctrl/Cmd + Z or ↶ Undo.',
    });
    var initVal = drafts[draftKey] !== undefined ? drafts[draftKey] : '';
    editor.value = initVal;

    function getHistory() {
      if (!histories[draftKey] || !histories[draftKey].stack || !histories[draftKey].stack.length) {
        histories[draftKey] = { stack: [{ v: editor.value, s: editor.value.length, e: editor.value.length }], idx: 0, lastTs: 0 };
      }
      return histories[draftKey];
    }

    var undoBtn = h('button', { class: 'btn ghost', type: 'button', title: 'Undo (Ctrl/Cmd + Z)', 'aria-label': 'Undo', onclick: function () { undo(); } }, '↶ Undo');
    var redoBtn = h('button', { class: 'btn ghost', type: 'button', title: 'Redo (Ctrl/Cmd + Y)', 'aria-label': 'Redo', onclick: function () { redo(); } }, '↷ Redo');

    function syncUndoButtons() {
      var hist = getHistory();
      undoBtn.disabled = hist.idx <= 0;
      redoBtn.disabled = hist.idx >= hist.stack.length - 1;
    }

    function recordEdit(forceNewStep) {
      var hist = getHistory();
      var curSt = hist.stack[hist.idx];
      var v = editor.value, s = editor.selectionStart || 0, e = editor.selectionEnd || 0;
      drafts[draftKey] = v;
      if (curSt && curSt.v === v) {
        curSt.s = s; curSt.e = e;
        return;
      }
      var now = Date.now();
      var boundary = forceNewStep || (now - (hist.lastTs || 0) > 450) || /[\s;,\n()]$/.test(v);
      hist.stack = hist.stack.slice(0, hist.idx + 1);
      if (!boundary && hist.stack.length > 1) {
        hist.stack[hist.idx] = { v: v, s: s, e: e };
      } else {
        hist.stack.push({ v: v, s: s, e: e });
        if (hist.stack.length > 60) hist.stack.shift();
        hist.idx = hist.stack.length - 1;
      }
      hist.lastTs = now;
      syncUndoButtons();
      saveMem();
    }

    function applyValueWithMemory(newVal, selStart, selEnd) {
      recordEdit(true);
      editor.value = newVal;
      var s = selStart !== undefined ? selStart : newVal.length;
      var e = selEnd !== undefined ? selEnd : s;
      editor.selectionStart = s;
      editor.selectionEnd = e;
      recordEdit(true);
    }

    function undo() {
      var hist = getHistory();
      if (hist.idx <= 0) return;
      hist.idx--;
      var st = hist.stack[hist.idx];
      editor.value = st.v;
      editor.selectionStart = st.s;
      editor.selectionEnd = st.e;
      drafts[draftKey] = st.v;
      hist.lastTs = 0;
      syncUndoButtons();
      saveMem();
      editor.focus({ preventScroll: true });
    }

    function redo() {
      var hist = getHistory();
      if (hist.idx >= hist.stack.length - 1) return;
      hist.idx++;
      var st = hist.stack[hist.idx];
      editor.value = st.v;
      editor.selectionStart = st.s;
      editor.selectionEnd = st.e;
      drafts[draftKey] = st.v;
      hist.lastTs = 0;
      syncUndoButtons();
      saveMem();
      editor.focus({ preventScroll: true });
    }

    syncUndoButtons();

    editor.addEventListener('input', function () { recordEdit(false); });
    editor.addEventListener('keydown', function (e) {
      if ((e.ctrlKey || e.metaKey) && e.key === 'Enter') { e.preventDefault(); run(false); }
      else if ((e.ctrlKey || e.metaKey) && !e.altKey && (e.key === 'z' || e.key === 'Z')) {
        e.preventDefault();
        if (e.shiftKey) redo(); else undo();
      } else if ((e.ctrlKey || e.metaKey) && !e.altKey && (e.key === 'y' || e.key === 'Y')) {
        e.preventDefault();
        redo();
      } else if (e.key === 'Tab' && !e.shiftKey) {
        e.preventDefault();
        var s = editor.selectionStart, t = editor.selectionEnd;
        applyValueWithMemory(editor.value.slice(0, s) + '  ' + editor.value.slice(t), s + 2, s + 2);
      }
    });

    var runBtn = h('button', { class: 'btn', type: 'button', disabled: true, onclick: function () { run(false); } }, '▶ Run');
    var checkBtn = cur ? h('button', { class: 'btn accent', type: 'button', disabled: true, onclick: function () { run(true); } }, '✓ Check my answer') : null;
    var resetBtn = h('button', { class: 'btn ghost', type: 'button', disabled: true, onclick: function () {
      getDb(SQL, dsId, true); dirty = false; showResult(null); ui.toast('Data reset to the original.');
    } }, 'Reset data');
    var schemaBtn = h('button', { class: 'btn ghost', type: 'button', onclick: function () { ui.copy(DA.schemaText(dsId), 'Schema copied: paste it into your AI prompt'); } }, 'Copy schema for AI');
    var aiBtn = h('button', { class: 'btn ghost', type: 'button', onclick: function () { showAi(false); } }, '🤖 Ask AI for help');

    var feedback = h('div', { class: 'feedback', role: 'status', 'aria-live': 'polite' });
    var previewBox = h('div', { class: 'table-preview-box' });
    var resultBox = h('div', { class: 'result' });
    var recentBox = h('div', { class: 'recent-queries-box' });
    var aiBox = h('div', { class: 'ai-box' });

    /* task panel */
    if (cur) {
      var hintBox = h('div', { class: 'callout tip hidden' }, h('strong', { text: 'Hint. ' }), cur.hint);
      var solBox = h('div', { class: 'hidden' }, h('p', { class: 'muted small', text: 'Reference solution (there are often several valid queries):' }), ui.codeBlock({ lang: 'sql', title: 'Solution', text: cur.solution }));
      var solBtn = h('button', { class: 'btn tiny ghost', type: 'button', onclick: function () {
        if (!attempts[cur.id]) { ui.toast('Try the query and press "Check my answer" at least once first.'); return; }
        session.hinted = true;
        solBox.classList.toggle('hidden');
      } }, 'Show solution');
      main.appendChild(h('div', { class: 'task' },
        h('div', { class: 'task-head' },
          h('span', { class: 'badge level' + cur.level, text: 'Level ' + wcur.level.world.n + '.' + wcur.level.n }),
          h('strong', { text: cur.title }),
          h('span', { class: 'muted small', text: cur.concept }),
          L.stars('sql', cur.id) ? h('span', { class: 'lab-stars', 'aria-label': 'Best so far: ' + L.stars('sql', cur.id) + ' of 3 stars', text: L.starText(L.stars('sql', cur.id)) }) : h('span', { class: 'muted small', text: '+' + ui.XP.sql(cur.level) + ' XP' })),
        h('p', { html: cur.task }),
        h('div', { class: 'row' },
          h('button', { class: 'btn tiny ghost', type: 'button', onclick: function () { session.hinted = true; hintBox.classList.toggle('hidden'); } }, 'Show hint'), solBtn),
        hintBox, solBox));
    } else {
      main.appendChild(h('div', { class: 'task' }, h('strong', { text: 'Free exploration' }),
        h('p', { class: 'muted', text: 'Try any query on this database, inspect a table below with one click, or pick a challenge on the levels map (🗺 Levels).' })));
    }

    // Typing SQL on a phone is slow: one-tap keywords, table names and symbols (the editor keeps focus, so the keyboard stays open).
    function insert(text, back) {
      var a = editor.selectionStart, b = editor.selectionEnd, v = editor.value, prev = v.charAt(a - 1);
      // keep words apart: "SELECT *" + "FROM" must not become "SELECT *FROM"
      if (a > 0 && !/[\s(.]/.test(prev) && /^[A-Za-z*]/.test(text)) text = ' ' + text;
      var nextVal = v.slice(0, a) + text + v.slice(b);
      var pos = a + text.length - (back || 0);
      applyValueWithMemory(nextVal, pos, pos);
      editor.focus({ preventScroll: true });
    }
    var KEYS = [['SELECT', 'SELECT '], ['FROM', 'FROM '], ['WHERE', 'WHERE '], ['JOIN', 'JOIN '], ['ON', 'ON '], ['GROUP BY', 'GROUP BY '], ['ORDER BY', 'ORDER BY '], ['HAVING', 'HAVING '],
      ['LIMIT', 'LIMIT '], ['COUNT(*)', 'COUNT(*)'], ['SUM()', 'SUM()', 1], ['AVG()', 'AVG()', 1], ['ROUND()', 'ROUND()', 1], ['AS', ' AS '], ['AND', ' AND '], ['OR', ' OR '], ['DESC', ' DESC'],
      ['*', '*'], [',', ', '], ['( )', '()', 1], ["'", "''", 1], ['=', ' = '], ['>', ' > '], ['<', ' < '], ['.', '.']];
    var keys = h('div', { class: 'sql-keys', role: 'toolbar', 'aria-label': 'SQL shortcuts' },
      ds.tables.map(function (t) { return h('button', { class: 'key table-key', type: 'button', onmousedown: function (e) { e.preventDefault(); }, onclick: function () { insert(t.name + ' '); } }, t.name); }),
      KEYS.map(function (k) { return h('button', { class: 'key', type: 'button', 'aria-label': 'Insert ' + k[0], onmousedown: function (e) { e.preventDefault(); }, onclick: function () { insert(k[1], k[2]); } }, k[0]); }));
    main.appendChild(keys);
    main.appendChild(editor);
    main.appendChild(h('div', { class: 'row actions' }, runBtn, checkBtn, undoBtn, redoBtn, resetBtn, aiBtn, schemaBtn));

    // Quick table viewer bar: shows any table directly without writing anything into the SQL editor
    var tableBtns = {};
    var tableBar = h('div', { class: 'row table-peek-bar', role: 'group', 'aria-label': 'Inspect database tables' },
      h('span', { class: 'muted small', text: '📋 View tables:' }),
      ds.tables.map(function (t) {
        var b = h('button', { class: 'btn tiny ghost', type: 'button', onclick: function () {
          if (activePreviewTable === t.name) showTablePreview(null);
          else showTablePreview(t.name, 15);
        } }, '👁 ' + t.name);
        tableBtns[t.name] = b;
        return b;
      }));
    main.appendChild(tableBar);
    main.appendChild(previewBox);
    main.appendChild(feedback);
    main.appendChild(resultBox);
    main.appendChild(recentBox);
    main.appendChild(aiBox);

    /* Direct table preview without touching editor.value */
    function showTablePreview(tableName, limit) {
      ui.clear(previewBox);
      activePreviewTable = tableName || null;
      Object.keys(tableBtns).forEach(function (k) {
        tableBtns[k].classList.toggle('active', k === activePreviewTable);
      });
      if (!tableName) return;
      var tbl = ds.tables.filter(function (t) { return t.name === tableName; })[0];
      if (!tbl) return;
      var maxRows = limit || 15;
      var cols = tbl.cols.map(function (c) { return c[0]; });
      var allRows = (ds.data() && ds.data()[tableName]) || [];
      if (SQL && dirty) {
        try {
          var live = lastResult(getDb(SQL, dsId, false).exec('SELECT * FROM ' + tableName));
          if (live) { cols = live.columns; allRows = live.values; }
        } catch (e) { /* fallback to dataset rows */ }
      }
      var shown = allRows.slice(0, maxRows);
      var tableEl = h('table', { class: 'result-table' },
        h('thead', null, h('tr', null, cols.map(function (c) { return h('th', { scope: 'col', text: c }); }))),
        h('tbody', null, shown.map(function (row) {
          return h('tr', null, row.map(function (v) {
            return v === null ? h('td', { class: 'null', text: 'NULL' }) : h('td', { class: typeof v === 'number' ? 'num' : '', text: String(v) });
          }));
        })));
      previewBox.appendChild(h('div', { class: 'card preview-card' },
        h('div', { class: 'row between' },
          h('div', null,
            h('strong', { text: '📋 Table: ' + tbl.name }),
            h('span', { class: 'muted small', text: ' · ' + tbl.note + ' (' + allRows.length + ' rows total, showing first ' + shown.length + ')' })),
          h('div', { class: 'row' },
            allRows.length > maxRows ? h('button', { class: 'btn tiny ghost', type: 'button', onclick: function () { showTablePreview(tableName, maxRows + 35); } }, 'Show more rows') : null,
            h('button', { class: 'btn tiny ghost', type: 'button', onclick: function () { showTablePreview(null); } }, '✕ Hide table'))),
        h('div', { class: 'table-wrap', tabindex: '0', role: 'region', 'aria-label': 'Preview of table ' + tbl.name }, tableEl)));
    }

    function showExamplePreview(ex) {
      ui.clear(previewBox);
      activePreviewTable = null;
      Object.keys(tableBtns).forEach(function (k) { tableBtns[k].classList.remove('active'); });
      if (!SQL) { ui.toast('Wait a moment for the SQL engine to finish loading.'); return; }
      var res;
      try { res = lastResult(getRef(SQL, dsId).exec(ex.sql)); } catch (e) { return; }
      if (!res) return;
      var shown = res.values.slice(0, 25);
      var tableEl = h('table', { class: 'result-table' },
        h('thead', null, h('tr', null, res.columns.map(function (c) { return h('th', { scope: 'col', text: c }); }))),
        h('tbody', null, shown.map(function (row) {
          return h('tr', null, row.map(function (v) {
            return v === null ? h('td', { class: 'null', text: 'NULL' }) : h('td', { class: typeof v === 'number' ? 'num' : '', text: String(v) });
          }));
        })));
      previewBox.appendChild(h('div', { class: 'card preview-card' },
        h('div', { class: 'row between' },
          h('div', null,
            h('span', { class: 'badge level' + ex.level, text: 'Level ' + ex.level }), ' ',
            h('strong', { text: 'Example: ' + ex.title }),
            h('span', { class: 'muted small', text: ' · ' + res.values.length + ' rows' })),
          h('button', { class: 'btn tiny ghost', type: 'button', onclick: function () { ui.clear(previewBox); } }, '✕ Close preview')),
        h('p', { class: 'muted small', text: ex.explain }),
        h('div', { class: 'table-wrap', tabindex: '0', role: 'region', 'aria-label': 'Example result' }, tableEl)));
    }

    function paintRecent() {
      ui.clear(recentBox);
      var listRec = recentQueries[dsId] || [];
      if (!listRec.length) return;
      recentBox.appendChild(h('details', { class: 'card fold recent-fold' },
        h('summary', null, h('strong', { text: '🕘 Recent queries memory (' + listRec.length + ')' })),
        h('div', { class: 'recent-list' }, listRec.map(function (qText) {
          return h('div', { class: 'row between recent-item' },
            h('code', { class: 'small', text: qText.replace(/\s+/g, ' ').slice(0, 95) + (qText.length > 95 ? '…' : '') }),
            h('button', { class: 'btn tiny ghost', type: 'button', onclick: function () {
              applyValueWithMemory(qText);
              ui.toast('Query restored to editor (press ↶ Undo to revert)');
            } }, 'Restore'));
        }))));
    }
    paintRecent();

    /* side: schema + worked examples + 8-level challenge list */
    var inner = h('div', { class: 'side-inner' });
    var sideBox = h('details', { class: 'side-collapse' }, h('summary', null, '📋 Tables, examples and challenges'), inner);
    side.appendChild(sideBox);
    var narrow = window.matchMedia ? window.matchMedia('(max-width: 1100px)') : null;
    function syncSide() { sideBox.open = narrow && narrow.matches ? !cur : true; }
    syncSide();
    if (narrow && narrow.addEventListener) narrow.addEventListener('change', function () { if (sideBox.isConnected) syncSide(); });
    inner.appendChild(h('h2', { class: 'side-title', text: 'Tables' }));
    ds.tables.forEach(function (t) {
      inner.appendChild(h('details', { class: 'schema' },
        h('summary', null, h('code', { text: t.name }), h('span', { class: 'muted small', text: ' · ' + t.note })),
        h('ul', null, t.cols.map(function (c) {
          return h('li', null, h('button', { class: 'col-key', type: 'button', title: 'Insert ' + c[0], 'aria-label': 'Insert column ' + c[0], onmousedown: function (e) { e.preventDefault(); }, onclick: function () { insert(c[0]); } }, c[0]), ' ', h('span', { class: 'muted small', text: c[1] + (c[2] ? ' · ' + c[2] : '') }));
        })),
        h('button', { class: 'btn tiny ghost', type: 'button', onclick: function () {
          showTablePreview(t.name, 15);
        } }, 'Preview rows')));
    });

    if (examples.length) {
      var exDetails = h('details', { class: 'schema examples-drawer' },
        h('summary', null, h('strong', { text: '📖 Worked examples (Levels 1–8)' })));
      examples.forEach(function (ex) {
        exDetails.appendChild(h('div', { class: 'example-item' },
          h('div', { class: 'task-head' },
            h('span', { class: 'badge level' + ex.level, text: 'L' + ex.level }),
            h('strong', { class: 'small', text: ex.title })),
          h('p', { class: 'muted small', text: ex.explain }),
          ui.codeBlock({ lang: 'sql', title: ex.concept, text: ex.sql }),
          h('div', { class: 'row' },
            h('button', { class: 'btn tiny ghost', type: 'button', onclick: function () { showExamplePreview(ex); } }, '👁 Preview output'),
            h('button', { class: 'btn tiny ghost', type: 'button', onclick: function () {
              applyValueWithMemory(ex.sql);
              ui.toast('Example loaded into editor (↶ Undo to go back)');
            } }, '📋 Use in editor'))));
      });
      inner.appendChild(exDetails);
    }

    inner.appendChild(h('h2', { class: 'side-title', text: 'Challenges on this database' }));
    inner.appendChild(h('a', { class: 'chal' + (!cur ? ' active' : ''), href: '#/lab/' + dsId }, h('span', { class: 'mark', text: '·' }), 'Free exploration'));
    [1, 2, 3, 4, 5, 6, 7, 8].forEach(function (lv) {
      var items = list.filter(function (c) { return c.level === lv; });
      if (!items.length) return;
      var wl = lab.byId[items[0].id].level, open = L.levelState(lab, wl).unlocked;
      inner.appendChild(h('div', { class: 'level-label', text: (open ? '' : '🔒 ') + 'Level ' + wl.world.n + '.' + wl.n + ' · ' + (LEVELS[lv] || '').replace(/^Level \d+:\s*/, '') }));
      items.forEach(function (c) {
        var k = L.stars('sql', c.id);
        inner.appendChild(h('a', { class: 'chal' + (cur && cur.id === c.id ? ' active' : '') + (open ? '' : ' locked'), href: '#/lab/' + dsId + '/' + c.id, 'aria-current': cur && cur.id === c.id ? 'page' : null },
          h('span', { class: 'mark', text: k ? '✔' : open ? '○' : '🔒' }), h('span', { class: 'grow', text: c.title }), k ? h('span', { class: 'lab-stars small', text: L.starText(k) }) : null));
      });
    });

    /* behaviour */
    function setFeedback(kind, msg, extra) {
      ui.clear(feedback);
      if (!msg) return;
      feedback.appendChild(h('div', { class: 'callout ' + kind }, msg, extra || null));
    }

    function showResult(res, ms) {
      ui.clear(resultBox);
      if (res === null) return;
      if (res === undefined) { resultBox.appendChild(h('p', { class: 'muted', text: 'Query ran. It did not return a table.' })); return; }
      var MAX = 100;
      var shown = res.values.slice(0, MAX);
      resultBox.appendChild(h('p', { class: 'muted small', text: res.values.length + ' row' + (res.values.length === 1 ? '' : 's') + (res.values.length > MAX ? ' (showing the first ' + MAX + ')' : '') + (ms !== undefined ? ' · ' + Math.max(1, Math.round(ms)) + ' ms' : '') }));
      var table = h('table', { class: 'result-table' },
        h('thead', null, h('tr', null, res.columns.map(function (c) { return h('th', { scope: 'col', text: c }); }))),
        h('tbody', null, shown.map(function (row) {
          return h('tr', null, row.map(function (v) {
            return v === null ? h('td', { class: 'null', text: 'NULL' }) : h('td', { class: typeof v === 'number' ? 'num' : '', text: String(v) });
          }));
        })));
      resultBox.appendChild(h('div', { class: 'table-wrap', tabindex: '0', role: 'region', 'aria-label': 'Query result' }, table));
    }

    function rememberQuery(sql) {
      if (!sql) return;
      var arr = (recentQueries[dsId] || []).filter(function (q) { return q !== sql; });
      arr.unshift(sql);
      recentQueries[dsId] = arr.slice(0, 15);
      saveMem();
      paintRecent();
    }

    function run(check) {
      if (!SQL) return;
      var sql = editor.value.trim();
      ui.clear(aiBox);
      lastError = '';
      if (!sql) { setFeedback('warn', 'Write a query first.'); return; }
      rememberQuery(sql);
      var db = getDb(SQL, dsId, false);
      var res, t0 = performance.now();
      ui.state.stats.queries++;
      try {
        res = lastResult(db.exec(sql));
      } catch (e) {
        lastError = String(e.message || e);
        showResult(null);
        setFeedback('bad', 'SQL error: ' + lastError, h('div', { class: 'small' }, 'Read the message: it usually names the problem (a column that does not exist, a missing comma…). The "Ask AI for help" button builds a prompt with your query and this error.'));
        if (check && cur) attempts[cur.id] = (attempts[cur.id] || 0) + 1;
        lastRun = { sql: sql };
        return;
      }
      var ms = performance.now() - t0;
      lastRun = { sql: sql, res: res };
      if (changesData(sql)) dirty = true;
      resetBtn.disabled = !dirty;
      showResult(res, ms);
      if (!check) { setFeedback(dirty ? 'warn' : '', dirty ? 'You changed the data. Use "Reset data" before checking answers.' : ''); return; }
      attempts[cur.id] = (attempts[cur.id] || 0) + 1;
      if (dirty) { setFeedback('warn', 'You changed the data, so the check would be unfair. Press "Reset data" and run your query again.'); return; }
      var want = lastResult(getRef(SQL, dsId).exec(cur.solution));
      var cmp = DA.compareResults(res, want, { decimals: cur.decimals, ordered: /order\s+by/i.test(cur.solution) });
      if (cmp.ok) {
        var firstTime = !ui.state.sql[cur.id];
        var rec = L.record(lab, wcur, { hinted: session.hinted, tries: attempts[cur.id] });
        DA.game.quest('sql');
        DA.game.sound('done'); DA.game.buzz(30); DA.game.confetti(rec.stars === 3);
        var nx = L.next(lab, wcur);
        setFeedback('ok', '✔ ' + cmp.message, h('div', null,
          h('p', { class: 'lab-won' }, h('span', { class: 'lab-stars', 'aria-label': rec.stars + ' of 3 stars', text: L.starText(rec.stars) }),
            rec.best > rec.stars ? h('span', { class: 'muted small', text: ' (best: ' + L.starText(rec.best) + ')' }) : null,
            rec.xp ? h('span', { class: 'small', text: ' +' + rec.xp + ' XP' }) : null),
          rec.unlocked ? h('p', { class: 'small lab-unlocked' }, h('strong', { text: '🔓 Level ' + rec.unlocked.world.n + '.' + rec.unlocked.n + ' unlocked: ' }), rec.unlocked.title) : null,
          h('div', { class: 'row' },
            nx ? h('a', { class: 'btn small accent', href: L.href(lab, nx) }, 'Next challenge →') : null,
            h('a', { class: 'btn small ghost', href: '#/lab' }, 'Levels'),
            h('button', { class: 'btn small ghost', type: 'button', onclick: function () { showAi(true); } }, '🤖 Ask AI to review my query'))));
        if (firstTime) {
          var mark = side.querySelector('a.chal.active .mark');
          if (mark) mark.textContent = '✔';
          ui.refreshChrome();
        }
      } else {
        setFeedback('bad', '✗ ' + cmp.message, h('div', { class: 'small' }, 'Compare your table with the task: columns, filters, ordering and rounding.'));
      }
    }

    function showAi(review) {
      var sql = editor.value.trim();
      var parts = [];
      parts.push("I'm learning SQL (SQLite) with a practice database. My background: " + ui.bgText() + '.');
      if (cur) parts.push('Task: ' + cur.task.replace(/<[^>]+>/g, ''));
      parts.push('Schema:\n' + DA.schemaText(dsId));
      parts.push('My query:\n' + (sql || '(nothing yet)'));
      if (lastError) parts.push('The error I get:\n' + lastError);
      else if (lastRun && lastRun.res) parts.push('It returns ' + lastRun.res.values.length + ' rows with columns: ' + lastRun.res.columns.join(', ') + '.');
      if (review) parts.push('My query is correct. Review it like a senior analyst: readability, naming, an alternative approach, and one edge case I should think about. Keep it short.');
      else parts.push("Don't give me the full solution. 1) Explain in plain words what my query does. 2) Tell me what is wrong or missing and why. 3) Give me one hint for the next step. Then ask me a question to check I understood.");
      var l = ui.langLine();
      if (l) parts.push(l);
      ui.clear(aiBox);
      aiBox.appendChild(h('p', { class: 'muted small', text: 'This prompt contains only the schema and your query (no data). Paste it into your AI tutor:' }));
      aiBox.appendChild(ui.promptCard({ title: review ? 'Review my solution' : 'Help me without spoiling it', text: parts.join('\n\n') }, { prefilled: true }));
    }

    if (!cur) showTablePreview(ds.tables[0].name, 10);

    /* start the engine */
    if (location.protocol === 'file:') {
      status.className = 'callout warn';
      ui.clear(status);
      status.appendChild(h('div', null, h('strong', { text: 'Open this site through a local server to use SQLab. ' }),
        'Browsers block WebAssembly on file:// pages. In the folder that contains index.html run: ',
        h('code', { text: 'python3 -m http.server 8000' }), ' and open ', h('code', { text: 'http://localhost:8000' }), '. Everything else on the site works without it.'));
    } else {
      loadEngine().then(function (mod) {
        SQL = mod;
        getDb(SQL, dsId, false);
        status.className = 'callout ok compact';
        status.textContent = 'Ready: SQLite is running in your browser with the "' + ds.title + '" database.';
        runBtn.disabled = false;
        if (checkBtn) checkBtn.disabled = false;
        resetBtn.disabled = !dirty;
        if (!cur && editor.value.trim()) run(false);
      }).catch(function (err) {
        status.className = 'callout bad';
        ui.clear(status);
        status.appendChild(h('div', null, h('strong', { text: 'The SQL engine could not start. ' }), String(err && err.message || err),
          '. If you opened the site from a file, use a local server (python3 -m http.server).'));
      });
    }
    return root;
  };
})();
