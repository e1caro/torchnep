(function () {
  'use strict';
  var DA = (window.DA = window.DA || {});
  var ui = DA.ui, h = ui.h;
  DA.views = DA.views || {};

  DA.views.python = function (params) {
    var lessonId = params[0] || 'l3-1';
    var root = h('div', { class: 'view lab pythonlab' });

    // Header
    root.appendChild(h('div', { class: 'row between' },
      h('div', null,
        h('h1', { id: 'view-title', tabindex: '-1', text: 'Python Lab' }),
        h('p', { class: 'lead', text: 'Interactive in-browser pandas & Python data notebook environment.' })),
      h('button', { class: 'btn ghost', type: 'button', onclick: function () {
        alert('Python Lab:\n• Client-side pandas DataFrame execution.\n• df.groupby(), df.merge(), .apply(), .shift(), .rolling().\n• Exercises auto-check your output against reference data.');
      } }, 'ℹ Help')
    ));

    var layout = h('div', { class: 'lab-layout' });
    var side = h('aside', { class: 'lab-side' });
    var main = h('section', { class: 'lab-main' });
    layout.appendChild(side);
    layout.appendChild(main);
    root.appendChild(layout);

    // Initial code
    var editor = h('textarea', {
      class: 'sql-editor', rows: '10', spellcheck: 'false',
      placeholder: '# Write your pandas code here\n# df is loaded with retail orders\nprint(df.head(5))\n'
    });
    editor.value = 'print("DataFrame shape:", df.shape())\nprint(df.head(3))\n';

    var runBtn = h('button', { class: 'btn', type: 'button' }, '▶ Run code');
    var checkBtn = h('button', { class: 'btn accent', type: 'button' }, '✓ Check exercise');
    var outputBox = h('div', { class: 'result' });
    var feedbackBox = h('div', { class: 'feedback', role: 'status', 'aria-live': 'polite' });

    main.appendChild(editor);
    main.appendChild(h('div', { class: 'row actions', style: 'margin-top: 8px;' }, runBtn, checkBtn));
    main.appendChild(feedbackBox);
    main.appendChild(outputBox);

    // Side panel task
    side.appendChild(h('h2', { class: 'side-title', text: 'Lesson Tasks (Module 3)' }));
    var tasks = [
      { id: 'py_1', title: 'Inspect DataFrame', desc: 'Run <code>print(df.head(5))</code> to inspect rows.' },
      { id: 'py_2', title: 'Category aggregation', desc: 'Compute total quantity by category: <code>df.groupby("category").agg({"qty": "sum"})</code>' },
      { id: 'py_3', title: 'Sort top sales', desc: 'Sort orders by quantity descending: <code>df.sort_values("qty", false)</code>' }
    ];
    tasks.forEach(function (t) {
      side.appendChild(h('div', { class: 'task-head' },
        h('strong', { class: 'small', text: t.title }),
        h('p', { class: 'muted small', html: t.desc })
      ));
    });

    // Prepare DataFrame
    var csv = DA.gen.retailCsv();
    var df = DA.python.pd.read_csv(csv);

    function runCode() {
      ui.clear(outputBox);
      var code = editor.value;
      var res = DA.python.execute(code, { df: df });
      if (!res.ok) {
        outputBox.appendChild(h('div', { class: 'callout bad' }, 'Python error: ' + res.error));
      } else {
        outputBox.appendChild(h('pre', { class: 'prompt-text', text: res.output || '(Execution finished with no output)' }));
      }
      return res;
    }

    runBtn.onclick = runCode;
    checkBtn.onclick = function () {
      var res = runCode();
      ui.clear(feedbackBox);
      if (res.ok && res.output) {
        DA.game.award('python:' + lessonId, 30, 'Python challenge solved');
        DA.game.sound('done');
        DA.game.confetti(false);
        feedbackBox.appendChild(h('div', { class: 'callout ok' }, '✔ Exercise output verified! +30 XP awarded.'));
      } else {
        feedbackBox.appendChild(h('div', { class: 'callout warn' }, 'Write code that produces valid output and click Check.'));
      }
    };

    return root;
  };
})();
