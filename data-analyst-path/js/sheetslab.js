(function () {
  'use strict';
  var DA = (window.DA = window.DA || {});
  var ui = DA.ui, h = ui.h;
  DA.views = DA.views || {};
  var S = DA.sheets;

  var attempts = {}; // challengeId -> count of misses

  DA.views.sheets = function (params) {
    var datasetId = params[0] || 'retail';
    var lessonId = params[1] || 'l1-1';

    // Find all challenges for this lesson (or fallback)
    var allChallenges = DA.sheetsChallenges || [];
    var lessonChallenges = allChallenges.filter(function (c) {
      return c.lessonId === lessonId;
    });
    if (!lessonChallenges.length && allChallenges.length) {
      lessonChallenges = allChallenges.slice(0, 3);
    }

    var activeChalIdx = 0;
    var curChal = lessonChallenges[activeChalIdx] || null;

    var root = h('div', { class: 'view sheetslab' });

    // Top Header
    root.appendChild(h('div', { class: 'row between' },
      h('div', null,
        h('h1', { id: 'view-title', tabindex: '-1', text: 'DotSheets' }),
        h('p', { class: 'lead', text: 'Spreadsheet Lab — Excel-compatible formulas, dynamic arrays, lookups and modeling.' })),
      h('div', { class: 'row' },
        h('button', { class: 'btn ghost', type: 'button', onclick: function () {
          alert('DotSheets Help:\n\n• Works offline from vendor/.\n• Features include full dynamic arrays (FILTER, SORT, UNIQUE), XLOOKUP, INDEX/MATCH, SUMIFS, COUNTIFS.\n• Exercises auto-verify results, awarding XP to your progress ledger.');
        } }, 'ℹ Help'))
    ));

    // Ribbon Toolbar
    var activeTab = 'Home';
    var ribbon = h('div', { class: 'sheets-ribbon' });
    var ribbonBar = h('div', { class: 'sheets-ribbon-bar' });
    var tabs = ['Home', 'Insert', 'Formulas', 'Data', 'View'];

    var tabHeader = h('div', { class: 'tabs', role: 'group' },
      tabs.map(function (t) {
        return h('button', {
          class: 'tab' + (t === activeTab ? ' active' : ''),
          type: 'button',
          onclick: function () { activeTab = t; renderRibbon(); }
        }, t);
      })
    );
    ribbon.appendChild(tabHeader);
    ribbon.appendChild(ribbonBar);
    root.appendChild(ribbon);

    // Formula Bar
    var nameBox = h('input', { class: 'sheets-name-box', readonly: true, value: 'A1' });
    var formulaInput = h('input', { class: 'sheets-fx-input', placeholder: 'Enter value or formula (=SUM(...))' });
    var formulaBar = h('div', { class: 'sheets-fx-bar' },
      nameBox,
      h('span', { class: 'sheets-fx-label', text: 'fx' }),
      formulaInput
    );
    root.appendChild(formulaBar);

    // Phone Toolbar (quick formula tokens & symbols like SQLab)
    function insertFormulaToken(tok) {
      formulaInput.value = (formulaInput.value || '') + tok;
      formulaInput.focus();
    }
    var phoneKeys = [
      ['=', '='], ['SUM()', '=SUM()'], ['XLOOKUP()', '=XLOOKUP()'], ['FILTER()', '=FILTER()'],
      ['UNIQUE()', '=UNIQUE()'], ['SORT()', '=SORT()'], ['AVERAGE()', '=AVERAGE()'], ['COUNT()', '=COUNT()'],
      ['IF()', '=IF()'], ['LET()', '=LET()'], ['+', ' + '], ['-', ' - '], ['*', ' * '], ['/', ' / '],
      ['$', '$'], [':', ':'], [',', ', '], ['"', '""'], ['(', '('], [')', ')']
    ];
    var phoneToolbar = h('div', { class: 'sql-keys sheets-phone-toolbar', role: 'toolbar', 'aria-label': 'Formula shortcuts' },
      phoneKeys.map(function (k) {
        return h('button', {
          class: 'key',
          type: 'button',
          onclick: function () { insertFormulaToken(k[1]); }
        }, k[0]);
      })
    );
    root.appendChild(phoneToolbar);

    // Main Workspace Layout
    var workspace = h('div', { class: 'sheets-workspace' });
    var canvasWrap = h('div', { class: 'sheets-canvas-wrap' });
    var canvas = h('canvas', { class: 'sheets-canvas' });
    canvasWrap.appendChild(canvas);
    workspace.appendChild(canvasWrap);

    // Side Task & Exercises Panel
    var taskPanel = h('aside', { class: 'sheets-task-panel' });
    var feedbackBox = h('div', { class: 'feedback', role: 'status', 'aria-live': 'polite' });
    var hintBox = h('div', { class: 'callout tip hidden' });

    function renderTaskPanel() {
      ui.clear(taskPanel);
      if (!curChal) return;

      var isSolved = !!(ui.state.sheets && ui.state.sheets[curChal.id]);

      var chalSelector = h('div', { class: 'row', style: 'margin-bottom: 8px;' },
        lessonChallenges.map(function (c, idx) {
          var solvedMark = (ui.state.sheets && ui.state.sheets[c.id]) ? '✔ ' : '';
          return h('button', {
            class: 'btn tiny ' + (idx === activeChalIdx ? 'accent' : 'ghost'),
            type: 'button',
            onclick: function () {
              activeChalIdx = idx;
              curChal = lessonChallenges[activeChalIdx];
              ui.clear(feedbackBox);
              hintBox.classList.add('hidden');
              renderTaskPanel();
            }
          }, solvedMark + 'Task ' + (idx + 1));
        })
      );

      var checkBtn = h('button', { class: 'btn accent small', type: 'button', onclick: runCheck }, '✓ Check exercise');
      var hintBtn = h('button', { class: 'btn ghost small', type: 'button', onclick: function () {
        hintBox.classList.toggle('hidden');
      } }, 'Show hint');

      var taskBox = h('div', { class: 'task' },
        chalSelector,
        h('div', { class: 'task-head' },
          h('span', { class: 'badge level' + curChal.level, text: 'Level ' + curChal.level }),
          h('strong', { text: curChal.title }),
          isSolved ? h('span', { class: 'badge ok', text: '✔ Solved' }) : null
        ),
        h('p', { html: curChal.task }),
        h('div', { class: 'row', style: 'margin-top: 10px;' }, checkBtn, hintBtn),
        hintBox,
        feedbackBox
      );

      taskPanel.appendChild(taskBox);
      ui.clear(hintBox);
      hintBox.appendChild(h('strong', { text: 'Hint. ' }));
      hintBox.appendChild(document.createTextNode(curChal.hint));
    }

    function runCheck() {
      if (!curChal) return;
      wb.recalc();
      grid.render();

      var res = curChal.check(wb);
      attempts[curChal.id] = (attempts[curChal.id] || 0) + 1;

      ui.clear(feedbackBox);
      if (res.ok) {
        var firstTime = !(ui.state.sheets && ui.state.sheets[curChal.id]);
        ui.state.sheets = ui.state.sheets || {};
        ui.state.sheets[curChal.id] = true;
        ui.save();

        DA.game.award('sheet:' + curChal.id, ui.XP.sheet(curChal.level), 'Spreadsheet solved');
        DA.game.quest('lesson');
        DA.game.sound('done');
        DA.game.buzz(30);
        DA.game.confetti(false);

        feedbackBox.appendChild(h('div', { class: 'callout ok' }, '✔ ' + res.message));
        renderTaskPanel();
      } else {
        feedbackBox.appendChild(h('div', { class: 'callout bad' }, '✗ ' + res.message));
        if (attempts[curChal.id] >= 2) {
          hintBox.classList.remove('hidden');
        }
      }
    }

    workspace.appendChild(taskPanel);
    root.appendChild(workspace);

    // Bottom Sheet Tabs Bar
    var sheetTabs = h('div', { class: 'sheets-bottom-bar' },
      h('button', { class: 'btn tiny ghost', text: '+ New Sheet', onclick: function () {
        wb.addSheet('Sheet' + (wb.sheets.length + 1));
        ui.toast('New sheet created.');
      } }, '+ New Sheet'),
      h('span', { class: 'sheets-tab active', text: 'Sheet1' }),
      h('span', { class: 'grow' }),
      h('span', { class: 'muted small', text: 'Offline ready' })
    );
    root.appendChild(sheetTabs);

    // Model & Grid Setup
    var wb = new S.Workbook();
    var grid = null;

    var csvText = (datasetId === 'messy') ? DA.gen.messyCsv() : DA.gen.retailCsv();
    var lines = csvText.trim().split('\n');
    var sh = wb.activeSheet();
    for (var r = 0; r < lines.length && r < 500; r++) {
      var rowVals = lines[r].split(',');
      for (var c = 0; c < rowVals.length; c++) {
        var val = S.parseInput(rowVals[c].replace(/^"|"$/g, ''));
        sh.ensureCell(r, c).value = val;
        sh.ensureCell(r, c).raw = val;
      }
    }

    function renderRibbon() {
      ui.clear(ribbonBar);
      if (activeTab === 'Home') {
        ribbonBar.appendChild(h('div', { class: 'row' },
          h('button', { class: 'btn tiny ghost', type: 'button' }, 'Bold'),
          h('button', { class: 'btn tiny ghost', type: 'button' }, 'Italic'),
          h('button', { class: 'btn tiny ghost', type: 'button' }, 'Currency $'),
          h('button', { class: 'btn tiny ghost', type: 'button' }, 'Percent %')
        ));
      } else if (activeTab === 'Formulas') {
        ribbonBar.appendChild(h('div', { class: 'row' },
          h('button', { class: 'btn tiny ghost', type: 'button', onclick: function () { formulaInput.value = '=SUM('; formulaInput.focus(); } }, '∑ AutoSum'),
          h('button', { class: 'btn tiny ghost', type: 'button', onclick: function () { formulaInput.value = '=XLOOKUP('; formulaInput.focus(); } }, 'XLOOKUP'),
          h('button', { class: 'btn tiny ghost', type: 'button', onclick: function () { formulaInput.value = '=FILTER('; formulaInput.focus(); } }, 'FILTER'),
          h('button', { class: 'btn tiny ghost', type: 'button', onclick: function () { formulaInput.value = '=UNIQUE('; formulaInput.focus(); } }, 'UNIQUE'),
          h('button', { class: 'btn tiny ghost', type: 'button', onclick: function () { formulaInput.value = '=SORT('; formulaInput.focus(); } }, 'SORT')
        ));
      } else if (activeTab === 'Data') {
        ribbonBar.appendChild(h('div', { class: 'row' },
          h('button', { class: 'btn tiny ghost', type: 'button', onclick: function () {
            S.sortRange(sh, 1, 0, 100, 10, grid.cursor.c, true);
            wb.recalc(); grid.render(); ui.toast('Column sorted ascending.');
          } }, 'Sort A-Z'),
          h('button', { class: 'btn tiny ghost', type: 'button', onclick: function () {
            var res = S.removeDuplicates(sh, 1, 0, 100, 10, [grid.cursor.c]);
            wb.recalc(); grid.render(); ui.toast('Removed ' + res.removed + ' duplicate rows.');
          } }, 'Remove Duplicates'),
          h('button', { class: 'btn tiny ghost', type: 'button', onclick: function () {
            S.textToColumns(sh, 1, grid.cursor.c, 100, ',');
            wb.recalc(); grid.render(); ui.toast('Text split to columns.');
          } }, 'Text to Columns')
        ));
      } else if (activeTab === 'Insert') {
        ribbonBar.appendChild(h('div', { class: 'row' },
          h('button', { class: 'btn tiny ghost', type: 'button', onclick: function () {
            var res = S.buildPivot(sh, 0, 0, 50, 8, { rowCol: 2, valCol: 7, aggFn: 'SUM' });
            var psh = wb.addSheet('Pivot1');
            for (var r = 0; r < res.length; r++) {
              for (var c = 0; c < res[r].length; c++) psh.ensureCell(r, c).value = res[r][c];
            }
            wb.recalc(); grid.render(); ui.toast('Pivot table created on Pivot1 tab.');
          } }, '📊 Pivot Table'),
          h('button', { class: 'btn tiny ghost', type: 'button', onclick: function () {
            // Export workbook to XLSX download
            S.exportXlsx(wb).then(function (bytes) {
              if (ui.downloadBinary) {
                ui.downloadBinary('workbook.xlsx', bytes, 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
              } else {
                var blob = new Blob([bytes], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' });
                var url = URL.createObjectURL(blob);
                var a = document.createElement('a'); a.href = url; a.download = 'workbook.xlsx'; a.click();
              }
              ui.toast('Exported workbook.xlsx');
            });
          } }, '💾 Export .XLSX')
        ));
      }
    }

    renderRibbon();
    renderTaskPanel();

    setTimeout(function () {
      grid = new S.Grid(canvas, wb);
      grid.resize();
      window.addEventListener('resize', function () { if (grid) grid.resize(); });

      grid.onSelect = function (cell, r, c) {
        nameBox.value = S.addr(r, c);
        formulaInput.value = cell ? (cell.formula || S.toStr(cell.raw)) : '';
      };

      formulaInput.addEventListener('keydown', function (e) {
        if (e.key === 'F4') {
          e.preventDefault();
          formulaInput.value = S.toggleF4(formulaInput.value);
        } else if (e.key === 'Enter') {
          var text = formulaInput.value.trim();
          var cur = grid.cursor;
          var cell = sh.ensureCell(cur.r, cur.c);
          if (text.startsWith('=')) {
            cell.formula = text;
            cell.raw = text;
          } else {
            cell.formula = null;
            cell.raw = S.parseInput(text);
          }
          wb.recalc();
          grid.render();
        }
      });
    }, 20);

    return root;
  };
})();
