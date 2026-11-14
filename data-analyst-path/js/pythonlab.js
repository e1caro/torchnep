/* DotPython: the pandas lab view (world map, challenge page with editor, output and checker). */
(function () {
  'use strict';
  var DA = (window.DA = window.DA || {});
  var ui = DA.ui, h = ui.h, L = DA.labgame, P = DA.python;
  DA.views = DA.views || {};
  var drafts = {};
  var MEM = 'data-analyst-path.py-drafts.v1';
  try { drafts = JSON.parse(localStorage.getItem(MEM) || '{}') || {}; } catch (e) { drafts = {}; }
  function saveDrafts() { try { localStorage.setItem(MEM, JSON.stringify(drafts)); } catch (e) { } }

  function getLab() { return L.get('python'); }

  DA.views.python = function (params) {
    var lb = getLab();
    if (params[0] === 'play') {
      var c = lb.byId[params[1]];
      if (!c) return L.mapView(lb);
      return L.isUnlocked(lb, c) ? page(lb, c) : L.lockedView(lb, c);
    }
    return L.mapView(lb);
  };

  function starter(c) { return c && c.starter ? c.starter : '# df, customers, stores and messy are loaded\nresult = '; }

  function page(lb, c) {
    var P2 = L.page(lb, c, { useExample: function (ex) { setCode(ex.code); ui.toast('Example loaded. Press Run (Ctrl+Enter).'); } });
    var work = P2.work;
    var editor = h('textarea', { class: 'sql-editor py-editor', spellcheck: 'false', autocapitalize: 'off', autocomplete: 'off', rows: '9', 'aria-label': 'Python code. Tab indents, Ctrl+Enter runs.' });
    editor.value = drafts[c.id] !== undefined ? drafts[c.id] : starter(c);
    var undo = [editor.value], redo = [];

    function setCode(v) { undo.push(editor.value); editor.value = v; remember(); editor.focus({ preventScroll: true }); }
    function remember() { drafts[c.id] = editor.value; saveDrafts(); grow(); }
    var grow = ui.autogrow(editor);
    function insert(text, back) {
      var a = editor.selectionStart, b = editor.selectionEnd, v = editor.value;
      undo.push(v); redo = [];
      editor.value = v.slice(0, a) + text + v.slice(b);
      var pos = a + text.length - (back || 0);
      editor.selectionStart = editor.selectionEnd = pos;
      editor.focus({ preventScroll: true });
      remember();
    }
    work.appendChild(L.symbolBar('Python symbols', ['[', ']', '(', ')', ['"', '""', 1], ['=', ' = '], '.', [',', ', '], ':', ['&', ' & '], ['|', ' | '], ['>', ' > '], ['<', ' < ']], insert));
    work.appendChild(editor);
    P2.editor({ set: function (v) { undo.push(editor.value); editor.value = v; remember(); }, lock: function () { editor.readOnly = true; } });

    var out = h('div', { class: 'result', 'aria-live': 'polite' });
    var runBtn = h('button', { class: 'btn', type: 'button', onclick: function () { run(false); } }, '▶ Run');
    var checkBtn = h('button', { class: 'btn accent', type: 'button', onclick: function () { run(true); } }, '✓ Check');
    var resetBtn = h('button', { class: 'btn ghost', type: 'button', onclick: function () { setCode(starter(c)); ui.clear(out); } }, 'Reset code');
    work.appendChild(P2.actions(runBtn, checkBtn));
    work.appendChild(h('div', { class: 'row actions-more' }, resetBtn, h('span', { class: 'muted small', text: 'Ctrl+Enter runs' })));
    work.appendChild(h('details', { class: 'schema' }, h('summary', null, h('strong', { text: '📋 Data you can use' })),
      h('ul', { class: 'small' },
        h('li', null, h('code', { text: 'df' }), ' café order lines: order_id, order_date, store_city, channel, customer_id, product, category, qty, unit_price'),
        h('li', null, h('code', { text: 'customers' }), ' customer_id, signup_date, city, segment'),
        h('li', null, h('code', { text: 'stores' }), ' store_id, city, opened_year'),
        h('li', null, h('code', { text: 'messy' }), ' hand-typed orders with gaps and typos: Order ID, Date, Customer, Product, Qty, Price, City'))));
    work.appendChild(out);

    editor.addEventListener('input', function () { remember(); });
    editor.addEventListener('keydown', function (e) {
      var ctrl = e.ctrlKey || e.metaKey;
      if (ctrl && e.key === 'Enter') { e.preventDefault(); run(false); return; }
      if (ctrl && !e.shiftKey && (e.key === 'z' || e.key === 'Z') && undo.length > 1) { e.preventDefault(); redo.push(editor.value); editor.value = undo.pop(); remember(); return; }
      if (ctrl && (e.key === 'y' || e.key === 'Y' || (e.shiftKey && (e.key === 'z' || e.key === 'Z'))) && redo.length) { e.preventDefault(); undo.push(editor.value); editor.value = redo.pop(); remember(); return; }
      var a = editor.selectionStart, b = editor.selectionEnd, v = editor.value;
      if (e.key === 'Tab') {
        e.preventDefault();
        var ls = v.lastIndexOf('\n', a - 1) + 1;
        if (e.shiftKey) {
          var cut = /^ {1,4}/.exec(v.slice(ls)); if (!cut) return;
          undo.push(v); editor.value = v.slice(0, ls) + v.slice(ls + cut[0].length);
          editor.selectionStart = editor.selectionEnd = Math.max(ls, a - cut[0].length);
        } else if (a !== b && v.slice(a, b).indexOf('\n') >= 0) {
          undo.push(v);
          var block = v.slice(ls, b).replace(/^/gm, '    ');
          editor.value = v.slice(0, ls) + block + v.slice(b);
          editor.selectionStart = ls; editor.selectionEnd = ls + block.length;
        } else { insert('    '); }
        remember();
        return;
      }
      if (e.key === 'Enter' && !e.shiftKey && !ctrl) {
        var lineStart = v.lastIndexOf('\n', a - 1) + 1, line = v.slice(lineStart, a), ind = /^\s*/.exec(line)[0];
        if (/:\s*$/.test(line)) ind += '    ';
        if (ind) { e.preventDefault(); insert('\n' + ind); }
      }
    });

    function show(res) {
      ui.clear(out);
      if (res.output) out.appendChild(h('pre', { class: 'py-out', tabindex: '0', 'aria-label': 'Output', text: res.output }));
      if (!res.ok) out.appendChild(h('div', { class: 'callout bad' }, h('strong', { text: (res.line ? 'Line ' + res.line + ': ' : '') }), res.error));
      else if (!res.output) out.appendChild(h('p', { class: 'muted small', text: 'Ran with no output. Print something, or end with an expression (like df.head()) to see it.' }));
    }

    function run(check) {
      var code = editor.value;
      P2.ran();
      if (!check) { show(P.run(code, { echo: true })); return; }
      var res = P.run(code, { echo: true });
      show(res);
      if (!res.ok) { P2.verdict({ ok: false, message: 'Your code stopped with an error. Fix it first: ' + res.error }); return; }
      var want = P.run(c.solution).env.result;
      var got = Object.prototype.hasOwnProperty.call(res.env, 'result') ? res.env.result : undefined;
      if (got === undefined) { P2.verdict({ ok: false, message: 'There is no variable called result. Finish with result = ... (your answer).' }); return; }
      if (got === null && want !== null) { P2.verdict({ ok: false, message: 'result is still empty (None). Put your answer after result = .' }); return; }
      P2.verdict(P.compareResult(got, want, c.ordered));
    }
    return P2.root;
  }
})();
