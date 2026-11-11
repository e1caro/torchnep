/* SQL Lab: practise SQL in the browser (SQLite compiled to WebAssembly via sql.js).
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

  /* ---------- view ---------- */

  var LEVELS = { 1: 'Level 1: warm-up', 2: 'Level 2: core analyst skills', 3: 'Level 3: interview level' };
  var drafts = {};     // typed queries, kept while the page is open
  var attempts = {};   // challenge id → number of checks (gates "show solution")

  // Shared with the SQL blocks game, which checks answers by running them.
  DA.sqlEngine = { load: loadEngine, ref: getRef };

  DA.views.lab = function (params) {
    var dsId = params[0] && DA.datasets[params[0]] ? params[0] : ui.defaultDataset();
    var ds = DA.datasets[dsId];
    var list = DA.challenges.filter(function (c) { return c.ds === dsId; });
    var cur = list.filter(function (c) { return c.id === params[1]; })[0] || null;
    var draftKey = dsId + ':' + (cur ? cur.id : 'free');
    var SQL = null, dirty = false, lastError = '', lastRun = null;

    var root = h('div', { class: 'view lab' });
    root.appendChild(h('h1', { id: 'view-title', tabindex: '-1', text: 'SQL Lab' }));
    root.appendChild(h('p', { class: 'lead lab-lead', text: 'Practise real SQL on a real database, in your browser. Nothing is uploaded: the database is created on your computer each time you open this page.' }));

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

    /* editor */
    var editor = h('textarea', {
      class: 'sql-editor', spellcheck: 'false', autocapitalize: 'off', autocomplete: 'off', rows: '9',
      'aria-label': 'SQL query', placeholder: 'Write your SQL here, then press Run (Ctrl/Cmd + Enter).',
    });
    editor.value = drafts[draftKey] !== undefined ? drafts[draftKey] : (cur ? '' : 'SELECT * FROM ' + ds.tables[0].name + ' LIMIT 10;');
    editor.addEventListener('input', function () { drafts[draftKey] = editor.value; });
    editor.addEventListener('keydown', function (e) {
      if ((e.ctrlKey || e.metaKey) && e.key === 'Enter') { e.preventDefault(); run(false); }
      else if (e.key === 'Tab' && !e.shiftKey) {
        e.preventDefault();
        var s = editor.selectionStart, t = editor.selectionEnd;
        editor.value = editor.value.slice(0, s) + '  ' + editor.value.slice(t);
        editor.selectionStart = editor.selectionEnd = s + 2;
        drafts[draftKey] = editor.value;
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
    var resultBox = h('div', { class: 'result' });
    var aiBox = h('div', { class: 'ai-box' });

    /* task panel */
    if (cur) {
      var hintBox = h('div', { class: 'callout tip hidden' }, h('strong', { text: 'Hint. ' }), cur.hint);
      var solBox = h('div', { class: 'hidden' }, h('p', { class: 'muted small', text: 'Reference solution (there are often several valid queries):' }), ui.codeBlock({ lang: 'sql', title: 'Solution', text: cur.solution }));
      var solBtn = h('button', { class: 'btn tiny ghost', type: 'button', onclick: function () {
        if (!attempts[cur.id]) { ui.toast('Try the query and press "Check my answer" at least once first.'); return; }
        solBox.classList.toggle('hidden');
      } }, 'Show solution');
      main.appendChild(h('div', { class: 'task' },
        h('div', { class: 'task-head' },
          h('span', { class: 'badge level' + cur.level, text: 'Level ' + cur.level }),
          h('strong', { text: cur.title }),
          h('span', { class: 'muted small', text: cur.concept }),
          ui.state.sql[cur.id] ? h('span', { class: 'badge ok', text: '✔ solved' }) : null),
        h('p', { html: cur.task }),
        h('div', { class: 'row' },
          h('button', { class: 'btn tiny ghost', type: 'button', onclick: function () { hintBox.classList.toggle('hidden'); } }, 'Show hint'), solBtn),
        hintBox, solBox));
    } else {
      main.appendChild(h('div', { class: 'task' }, h('strong', { text: 'Free exploration' }),
        h('p', { class: 'muted', text: 'Pick a challenge from the list, or explore: look at each table, count rows, find the oldest or newest date, find NULLs. Good analysts always do this first.' })));
    }

    // Typing SQL on a phone is slow: one-tap keywords, table names and symbols (the editor keeps focus, so the keyboard stays open).
    function insert(text, back) {
      var a = editor.selectionStart, b = editor.selectionEnd, v = editor.value, prev = v.charAt(a - 1);
      // keep words apart: "SELECT *" + "FROM" must not become "SELECT *FROM"
      if (a > 0 && !/[\s(.]/.test(prev) && /^[A-Za-z*]/.test(text)) text = ' ' + text;
      editor.value = v.slice(0, a) + text + v.slice(b);
      editor.selectionStart = editor.selectionEnd = a + text.length - (back || 0);
      drafts[draftKey] = editor.value;
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
    main.appendChild(h('div', { class: 'row actions' }, runBtn, checkBtn, resetBtn, aiBtn, schemaBtn));
    main.appendChild(feedback);
    main.appendChild(resultBox);
    main.appendChild(aiBox);

    /* side: schema + challenge list (collapsible on small screens so the editor comes first) */
    var inner = h('div', { class: 'side-inner' });
    var sideBox = h('details', { class: 'side-collapse' }, h('summary', null, '📋 Tables and challenges · ', h('span', { class: 'muted', text: list.filter(function (c) { return ui.state.sql[c.id]; }).length + '/' + list.length + ' solved' })), inner);
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
          editor.value = 'SELECT * FROM ' + t.name + ' LIMIT 10;'; drafts[draftKey] = editor.value; editor.focus();
          if (SQL) run(false);
        } }, 'Preview rows')));
    });
    inner.appendChild(h('h2', { class: 'side-title', text: 'Challenges' }));
    var solved = list.filter(function (c) { return ui.state.sql[c.id]; }).length;
    inner.appendChild(h('p', { class: 'muted small', text: solved + ' of ' + list.length + ' solved' }));
    inner.appendChild(ui.progressBar(100 * solved / list.length, 'Challenges solved'));
    inner.appendChild(h('a', { class: 'chal' + (!cur ? ' active' : ''), href: '#/lab/' + dsId }, h('span', { class: 'mark', text: '·' }), 'Free exploration'));
    [1, 2, 3].forEach(function (lv) {
      var items = list.filter(function (c) { return c.level === lv; });
      if (!items.length) return;
      inner.appendChild(h('div', { class: 'level-label', text: LEVELS[lv] }));
      items.forEach(function (c) {
        inner.appendChild(h('a', { class: 'chal' + (cur && cur.id === c.id ? ' active' : ''), href: '#/lab/' + dsId + '/' + c.id, 'aria-current': cur && cur.id === c.id ? 'page' : null },
          h('span', { class: 'mark', text: ui.state.sql[c.id] ? '✔' : '○' }), c.title));
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

    function run(check) {
      if (!SQL) return;
      var sql = editor.value.trim();
      ui.clear(aiBox);
      lastError = '';
      if (!sql) { setFeedback('warn', 'Write a query first.'); return; }
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
        ui.state.sql[cur.id] = true; ui.save();
        DA.game.award('sql:' + cur.id, ui.XP.sql(cur.level), 'SQL solved');
        DA.game.quest('sql');
        DA.game.sound('done'); DA.game.buzz(30); DA.game.confetti(false);
        var idx = list.indexOf(cur), next = list[idx + 1];
        setFeedback('ok', '✔ ' + cmp.message, h('div', { class: 'row' },
          next ? h('a', { class: 'btn small', href: '#/lab/' + dsId + '/' + next.id }, 'Next challenge →') : h('span', { text: ' You finished every challenge in this dataset. 🎉' }),
          h('button', { class: 'btn small ghost', type: 'button', onclick: function () { showAi(true); } }, '🤖 Ask AI to review my query')));
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

    /* start the engine */
    if (location.protocol === 'file:') {
      status.className = 'callout warn';
      ui.clear(status);
      status.appendChild(h('div', null, h('strong', { text: 'Open this site through a local server to use the SQL Lab. ' }),
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
