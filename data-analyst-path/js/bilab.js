(function () {
  'use strict';
  var DA = (window.DA = window.DA || {});
  var ui = DA.ui, h = ui.h;
  DA.views = DA.views || {};

  DA.views.bi = function (params) {
    var lessonId = params[0] || 'l5-1';
    var root = h('div', { class: 'view lab bilab' });

    // Header
    root.appendChild(h('div', { class: 'row between' },
      h('div', null,
        h('h1', { id: 'view-title', tabindex: '-1', text: 'BI & Tableau Lab' }),
        h('p', { class: 'lead', text: 'Visual analytics, Power BI DAX measures, and Tableau Level of Detail (LOD) modeling.' })),
      h('button', { class: 'btn ghost', type: 'button', onclick: function () {
        alert('BI Lab:\n• Dimensions (Blue) vs Measures (Green).\n• DAX CALCULATE & DIVIDE evaluation.\n• Tableau { FIXED [dim] : AGG([measure]) } expressions.');
      } }, 'ℹ Help')
    ));

    var layout = h('div', { class: 'lab-layout' });
    var side = h('aside', { class: 'lab-side' });
    var main = h('section', { class: 'lab-main' });
    layout.appendChild(side);
    layout.appendChild(main);
    root.appendChild(layout);

    // Pill shelves (Rows, Columns, Measures)
    var rowShelf = h('div', { class: 'row-shelf', style: 'padding: 8px; background: var(--surface); border: 1px solid var(--line); border-radius: 8px; margin-bottom: 8px;' },
      h('span', { class: 'badge', style: 'background: #3b82f6; color: white;', text: 'Rows: store_city' }), ' ',
      h('span', { class: 'badge', style: 'background: #10b981; color: white;', text: 'Columns: SUM(qty)' })
    );

    // Canvas Chart Area
    var chartCanvas = h('canvas', { style: 'width: 100%; height: 260px; max-height: 38vh; background: var(--surface); border: 1px solid var(--line); border-radius: 8px;' });
    var daxInput = h('input', { class: 'sheets-fx-input', style: 'width: 100%; margin-top: 8px;', placeholder: 'Enter DAX Measure e.g. CALCULATE(SUM(Sales[qty]), Sales[store_city]="Madrid")' });
    daxInput.value = 'CALCULATE(SUM(Sales[qty]), Sales[store_city]="Madrid")';

    function insert(text, back) {
      var a = daxInput.selectionStart || daxInput.value.length, b = daxInput.selectionEnd || daxInput.value.length, v = daxInput.value;
      var nextVal = v.slice(0, a) + text + v.slice(b);
      var pos = a + text.length - (back || 0);
      daxInput.value = nextVal;
      daxInput.selectionStart = daxInput.selectionEnd = pos;
      daxInput.focus({ preventScroll: true });
    }
    var BI_KEYS = [
      ['CALCULATE()', 'CALCULATE()', 1],
      ['SUM()', 'SUM()', 1],
      ['DIVIDE()', 'DIVIDE()', 1],
      ['FILTER()', 'FILTER()', 1],
      ['ALL()', 'ALL()', 1],
      ['{ FIXED : }', '{ FIXED : }', 2],
      ['Sales[qty]', 'Sales[qty]'],
      ['Sales[store_city]', 'Sales[store_city]'],
      ['=', ' = ']
    ];
    var keys = h('div', { class: 'sql-keys', role: 'toolbar', 'aria-label': 'DAX and LOD shortcuts', style: 'margin-top: 6px;' },
      BI_KEYS.map(function (k) {
        return h('button', { class: 'key', type: 'button', 'aria-label': 'Insert ' + k[0], onmousedown: function (e) { e.preventDefault(); }, onclick: function () { insert(k[1], k[2]); } }, k[0]);
      })
    );

    var runDaxBtn = h('button', { class: 'btn', type: 'button', style: 'margin-top: 6px;' }, 'Evaluate DAX');
    var checkBtn = h('button', { class: 'btn accent', type: 'button', style: 'margin-top: 6px;' }, '✓ Check exercise');
    var resultBox = h('div', { class: 'result', style: 'margin-top: 8px;' });
    var feedbackBox = h('div', { class: 'feedback', role: 'status', 'aria-live': 'polite' });

    main.appendChild(rowShelf);
    main.appendChild(chartCanvas);
    main.appendChild(keys);
    main.appendChild(daxInput);
    main.appendChild(h('div', { class: 'row actions' }, runDaxBtn, checkBtn));
    main.appendChild(feedbackBox);
    main.appendChild(resultBox);

    // Side panel tasks
    var taskFold = h('details', { class: 'side-collapse', open: 'true' },
      h('summary', null, h('strong', { text: 'Visual & DAX Challenges' }))
    );
    var tasks = [
      { title: 'Dimensions vs Measures', desc: 'Distinguish discrete categories from continuous numeric measures.' },
      { title: 'Calculate Filter Context', desc: 'Compute revenue for Madrid using <code>CALCULATE(SUM(...))</code>.' },
      { title: 'Tableau LOD Expression', desc: 'Compute cohort minimum order date: <code>{ FIXED [customer_id] : MIN([order_date]) }</code>' }
    ];
    tasks.forEach(function (t) {
      taskFold.appendChild(h('div', { class: 'task-head' },
        h('strong', { class: 'small', text: t.title }),
        h('p', { class: 'muted small', html: t.desc })
      ));
    });
    side.appendChild(taskFold);

    // Model setup
    var csv = DA.gen.retailCsv();
    var df = DA.python.pd.read_csv(csv);
    var model = new DA.bi.Model();
    model.addTable('Sales', df);

    setTimeout(function () {
      var chart = new DA.sheets.Chart(chartCanvas, 'column', 'Sales by City');
      // Aggregate by city for visual preview
      var grp = df.groupby('store_city').sum();
      var labels = grp.rows.map(function (r) { return r.store_city; });
      var data = grp.rows.map(function (r) { return r.qty; });
      chart.setData(labels, [{ name: 'Quantity', data: data }]);
    }, 20);

    function evaluateDax() {
      ui.clear(resultBox);
      var formula = daxInput.value.trim();
      var val = DA.bi.evalDax(formula, model);
      resultBox.appendChild(h('div', { class: 'callout ok' }, 'Result: ' + val));
      return val;
    }

    runDaxBtn.onclick = evaluateDax;
    checkBtn.onclick = function () {
      var val = evaluateDax();
      ui.clear(feedbackBox);
      if (val > 0) {
        DA.game.award('bi:' + lessonId, 30, 'BI & DAX challenge solved');
        DA.game.sound('done');
        DA.game.confetti(false);
        feedbackBox.appendChild(h('div', { class: 'callout ok' }, '✔ Filter Context calculated successfully! +30 XP awarded.'));
      } else {
        feedbackBox.appendChild(h('div', { class: 'callout warn' }, 'Ensure your DAX formula computes a positive measure.'));
      }
    };

    return root;
  };
})();
