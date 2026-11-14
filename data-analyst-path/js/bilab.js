/* DotBI: the DAX and Tableau lab view (world map, challenge page with measure box, shelf, matrix, chart and checker). */
(function () {
  'use strict';
  var DA = (window.DA = window.DA || {});
  var ui = DA.ui, h = ui.h, L = DA.labgame, BI = DA.bi;
  DA.views = DA.views || {};
  var models = {}, drafts = {};
  var MEM = 'data-analyst-path.bi-drafts.v1';
  try { drafts = JSON.parse(localStorage.getItem(MEM) || '{}') || {}; } catch (e) { drafts = {}; }

  function getLab() { return L.get('bi'); }
  function getModel(name) { name = name || 'retail'; return models[name] || (models[name] = BI.model(name)); }

  DA.views.bi = function (params) {
    var lb = getLab();
    if (params[0] === 'play') {
      var c = lb.byId[params[1]];
      if (!c) return L.mapView(lb);
      return L.isUnlocked(lb, c) ? page(lb, c) : L.lockedView(lb, c);
    }
    return L.mapView(lb);
  };

  function fmt(v) {
    if (v === null || v === undefined || (typeof v === 'number' && isNaN(v))) return '(blank)';
    if (typeof v === 'boolean') return v ? 'TRUE' : 'FALSE';
    if (typeof v !== 'number') return String(v);
    var a = Math.abs(v);
    return a >= 1000 ? v.toLocaleString('en-US', { maximumFractionDigits: 1 }) : String(Math.round(v * 10000) / 10000);
  }

  function drawChart(canvas, labels, values, type, title) {
    var dpr = window.devicePixelRatio || 1, rect = canvas.getBoundingClientRect(), W = rect.width, H = rect.height;
    if (!W || !H) return;
    canvas.width = Math.floor(W * dpr); canvas.height = Math.floor(H * dpr);
    var ctx = canvas.getContext('2d');
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    var cs = getComputedStyle(document.documentElement), col = function (n, d) { return cs.getPropertyValue(n).trim() || d; };
    var text = col('--text', '#0f172a'), muted = col('--muted', '#64748b'), line = col('--line', '#e2e8f0'), accent = col('--accent', '#2563eb'), bg = col('--surface', '#fff');
    var font = getComputedStyle(document.body).fontFamily;
    ctx.fillStyle = bg; ctx.fillRect(0, 0, W, H);
    ctx.fillStyle = text; ctx.font = '600 13px ' + font; ctx.textAlign = 'left'; ctx.textBaseline = 'alphabetic';
    ctx.fillText(title, 12, 20);
    var nums = values.map(function (v) { return typeof v === 'number' && isFinite(v) ? v : 0; });
    if (!labels.length) { ctx.fillStyle = muted; ctx.font = '12px ' + font; ctx.textAlign = 'center'; ctx.fillText('Choose a field in Rows to split the measure', W / 2, H / 2); return; }
    var max = Math.max.apply(null, nums.map(Math.abs).concat([1e-9]));
    ctx.font = '12px ' + font;
    if (type === 'bar') {
      var top = 32, rowH = Math.min(30, (H - top - 8) / labels.length), lw = Math.min(W * 0.35, Math.max.apply(null, labels.map(function (l) { return ctx.measureText(String(l)).width; })) + 12);
      labels.forEach(function (lab2, i) {
        var y = top + i * rowH, w = (W - lw - 70) * Math.abs(nums[i]) / max;
        ctx.fillStyle = muted; ctx.textAlign = 'right'; ctx.textBaseline = 'middle'; ctx.fillText(String(lab2), lw - 6, y + rowH / 2);
        ctx.fillStyle = accent; ctx.fillRect(lw, y + 4, Math.max(1, w), rowH - 8);
        ctx.fillStyle = text; ctx.textAlign = 'left'; ctx.fillText(fmt(values[i]), lw + w + 6, y + rowH / 2);
      });
      return;
    }
    var padL = 12, padB = 34, padT = 34, plotW = W - padL * 2, plotH = H - padT - padB, step = plotW / labels.length;
    ctx.strokeStyle = line; ctx.beginPath(); ctx.moveTo(padL, padT + plotH + 0.5); ctx.lineTo(W - padL, padT + plotH + 0.5); ctx.stroke();
    var pts = [];
    labels.forEach(function (lab2, i) {
      var x = padL + i * step, hh = plotH * Math.abs(nums[i]) / max, y = padT + plotH - hh;
      if (type === 'line') pts.push([x + step / 2, y]);
      else { ctx.fillStyle = accent; ctx.fillRect(x + step * 0.18, y, step * 0.64, Math.max(1, hh)); }
      ctx.fillStyle = muted; ctx.textAlign = 'center'; ctx.textBaseline = 'top';
      var t = String(lab2); while (ctx.measureText(t).width > step - 4 && t.length > 3) t = t.slice(0, -2) + '…';
      ctx.fillText(t, x + step / 2, padT + plotH + 6);
      if (labels.length <= 8) { ctx.fillStyle = text; ctx.textBaseline = 'bottom'; ctx.fillText(fmt(values[i]), x + step / 2, y - 2); }
    });
    if (type === 'line') {
      ctx.strokeStyle = accent; ctx.lineWidth = 2; ctx.beginPath();
      pts.forEach(function (p, i) { if (i) ctx.lineTo(p[0], p[1]); else ctx.moveTo(p[0], p[1]); }); ctx.stroke();
      ctx.fillStyle = accent; pts.forEach(function (p) { ctx.beginPath(); ctx.arc(p[0], p[1], 3, 0, 7); ctx.fill(); });
      ctx.lineWidth = 1;
    }
  }

  function page(lb, c) {
    var P = L.page(lb, c, { useExample: function (ex) { setText(ex.code.split('   with')[0]); evaluate(); } });
    var work = P.work, m = getModel(c.model), tab = c.mode === 'tableau', club = c.model === 'club';
    var box = h('textarea', { class: 'sql-editor bi-editor', rows: '3', spellcheck: 'false', autocapitalize: 'off', autocomplete: 'off', 'aria-label': (tab ? 'Tableau calculation' : 'DAX measure') + '. Enter evaluates, Shift+Enter adds a line.',
      placeholder: tab ? 'SUM([qty])' : 'SUM(Sales[qty])' });
    box.value = drafts[c.id] || c.starter || '';
    function remember() { drafts[c.id] = box.value; try { localStorage.setItem(MEM, JSON.stringify(drafts)); } catch (e) { } grow(); }
    var grow = ui.autogrow(box);
    function setText(v) { box.value = v; remember(); box.focus({ preventScroll: true }); }
    function insert(text, back) {
      var a = box.selectionStart === null || box.selectionStart === undefined ? box.value.length : box.selectionStart;
      var b = box.selectionEnd === null || box.selectionEnd === undefined ? a : box.selectionEnd, v = box.value;
      box.value = v.slice(0, a) + text + v.slice(b);
      var pos = a + text.length - (back || 0);
      box.focus({ preventScroll: true });
      box.setSelectionRange(pos, pos);
      remember();
    }
    var syms = L.symbolBar(tab ? 'Tableau symbols' : 'DAX symbols', ['(', ')', '[', ']', '{', '}', ['"', '""', 1], [',', ', '], ['=', ' = '], ['>', ' > '], ['<', ' < '], ['*', ' * '], ['/', ' / '], ':'], insert);
    work.appendChild(syms);
    work.appendChild(box);
    P.editor({ set: function (v) { box.value = v; remember(); }, lock: function () { box.readOnly = true; syms.classList.add('hidden'); } });

    var rowsSel = h('select', { 'aria-label': 'Rows: split the measure by' }, h('option', { value: '' }, '(none: total only)'),
      BI.dimsFor(m).map(function (k) { return h('option', { value: k, selected: k === c.by }, k); }));
    var typeSel = h('select', { 'aria-label': 'Chart type' }, [['bar', 'Bars'], ['column', 'Columns'], ['line', 'Line']].map(function (t) { return h('option', { value: t[0] }, t[1]); }));
    var evalBtn = h('button', { class: 'btn', type: 'button', onclick: function () { evaluate(); } }, '▶ Evaluate');
    var checkBtn = h('button', { class: 'btn accent', type: 'button', onclick: check }, '✓ Check');
    work.appendChild(P.actions(evalBtn, checkBtn));
    work.appendChild(h('p', { class: 'muted small actions-more', text: 'Enter evaluates · Shift+Enter new line' }));
    work.appendChild(h('div', { class: 'bi-shelf' },
      h('span', { class: 'badge pill-dim', text: 'Rows' }), rowsSel,
      h('span', { class: 'badge pill-measure', text: 'Values: your ' + (tab ? 'calculation' : 'measure') }),
      h('label', { class: 'muted small' }, 'Chart ', typeSel)));
    var out = h('div', { class: 'result', 'aria-live': 'polite' });
    var chart = h('canvas', { class: 'bi-chart', role: 'img', 'aria-label': 'Chart of the measure' });
    work.appendChild(out);
    work.appendChild(chart);
    work.appendChild(h('details', { class: 'schema' }, h('summary', null, h('strong', { text: '📋 The data model' })),
      h('ul', { class: 'small' },
        h('li', null, h('code', { text: 'Sales' }), ' (one row per order line): order_id, order_date, store_city, channel, customer_id, product, category, qty, unit_price'),
        h('li', null, h('code', { text: 'Customers' }), ': customer_id, signup_date, city, segment'),
        h('li', null, 'Relationship: Customers[customer_id] 1 → * Sales[customer_id]. ' + (tab ? 'In Tableau, write the fields as [qty], [order_date]…' : 'Filters on Customers flow to Sales.')))));
    var last = null;

    function paint(res) {
      ui.clear(out);
      out.appendChild(h('div', { class: 'row' }, h('div', { class: 'stat' }, h('b', { class: 'bi-card', text: fmt(res.total) }), h('span', { text: rowsSel.value ? 'Total' : 'Value' }))));
      if (res.rows.length) {
        var dim = BI.dims[rowsSel.value];
        out.appendChild(h('div', { class: 'table-wrap', tabindex: '0', role: 'region', 'aria-label': 'Matrix' }, h('table', { class: 'result-table' },
          h('thead', null, h('tr', null, h('th', { scope: 'col', text: dim.label }), h('th', { scope: 'col', text: tab ? 'Calculation' : 'Measure' }))),
          h('tbody', null, res.rows.map(function (r) { return h('tr', null, h('td', { text: String(r.member) }), h('td', { class: 'num', text: fmt(r.value) })); }),
            h('tr', { class: 'total-row' }, h('td', null, h('strong', { text: 'Total' })), h('td', { class: 'num' }, h('strong', { text: fmt(res.total) })))))));
      }
      drawChart(chart, res.rows.map(function (r) { return r.member; }), res.rows.map(function (r) { return r.value; }), typeSel.value, (tab ? 'Calculation' : 'Measure') + (rowsSel.value ? ' by ' + BI.dims[rowsSel.value].label : ''));
    }

    function evaluate() {
      var text = box.value.trim();
      P.ran();
      if (!text) { ui.clear(out); out.appendChild(h('p', { class: 'muted', text: 'Type a ' + (tab ? 'calculation' : 'measure') + ' first.' })); return null; }
      try { last = BI.breakdown(m, c.mode, text, rowsSel.value || null); paint(last); return last; }
      catch (e) {
        if (!(e instanceof BI.Error)) throw e;
        ui.clear(out); out.appendChild(h('div', { class: 'callout bad' }, h('strong', { text: 'Error: ' }), e.message));
        drawChart(chart, [], [], typeSel.value, '');
        return null;
      }
    }

    function check() {
      var text = box.value.trim();
      P.ran();
      if (!text) { P.verdict({ ok: false, message: 'Type your ' + (tab ? 'calculation' : 'measure') + ' first.' }); return; }
      var got, want = BI.breakdown(m, c.mode, c.solution, c.by);
      try { got = BI.breakdown(m, c.mode, text, c.by); }
      catch (e) { if (!(e instanceof BI.Error)) throw e; evaluate(); P.verdict({ ok: false, message: 'Your ' + (tab ? 'calculation' : 'measure') + ' has an error: ' + e.message }); return; }
      if (rowsSel.value !== (c.by || '')) { rowsSel.value = c.by || ''; }
      paint(got);
      if (!BI.same(got.total, want.total)) { P.verdict({ ok: false, message: 'The total is ' + fmt(got.total) + ', but the answer is different. Re-read the task: which column, which filter?' }); return; }
      for (var i = 0; i < want.rows.length; i++) {
        if (!BI.same(got.rows[i].value, want.rows[i].value)) {
          P.verdict({ ok: false, message: 'The total is right, but the row "' + want.rows[i].member + '" gives ' + fmt(got.rows[i].value) + ' and should not. A measure must also work when the visual filters it.' });
          return;
        }
      }
      P.verdict({ ok: true, message: 'Correct in total' + (want.rows.length ? ' and in all ' + want.rows.length + ' rows of the matrix' : '') + '.' });
    }

    box.addEventListener('input', remember);
    box.addEventListener('keydown', function (e) {
      if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); if (e.ctrlKey || e.metaKey) check(); else evaluate(); }
    });
    rowsSel.addEventListener('change', function () { evaluate(); });
    typeSel.addEventListener('change', function () { if (last) paint(last); });
    setTimeout(function () { if (!chart.isConnected) return; if (box.value.trim()) evaluate(); else drawChart(chart, [], [], 'bar', ''); }, 0);
    return P.root;
  }
})();
