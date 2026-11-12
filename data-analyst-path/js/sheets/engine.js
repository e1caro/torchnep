(function () {
  'use strict';
  var DA = (window.DA = window.DA || {});
  var S = (DA.sheets = DA.sheets || {});

  // Workbook Model, Sheet Data, Evaluator, Spilling & Dependency Graph

  function Cell(val, formula, fmt) {
    this.raw = val;            // entered value or null
    this.formula = formula;    // '=SUM(A1:A5)' or null
    this.fmt = fmt || null;    // format string
    this.value = val;          // computed value (primitive, 2D array, or S.Err)
    this.spillFrom = null;     // {r, c} if covered by a spilled dynamic array
  }

  function Sheet(name) {
    this.name = name;
    this.cells = {};           // 'r,c' -> Cell
    this.rowHeights = {};      // r -> height px
    this.colWidths = {};       // c -> width px
    this.tables = [];          // [{ name, range: Ref, cols: [name] }]
    this.freezeRows = 0;
    this.freezeCols = 0;
    this.maxR = 100;           // dynamically expandable
    this.maxC = 26;
  }

  Sheet.prototype.getCell = function (r, c) {
    return this.cells[r + ',' + c] || null;
  };

  Sheet.prototype.ensureCell = function (r, c) {
    var k = r + ',' + c;
    if (!this.cells[k]) {
      this.cells[k] = new Cell(null, null, null);
    }
    return this.cells[k];
  };

  Sheet.prototype.getVal = function (r, c) {
    var cell = this.getCell(r, c);
    return cell ? cell.value : null;
  };

  function Workbook() {
    this.sheets = [new Sheet('Sheet1')];
    this.activeSheetIdx = 0;
    this.names = {};           // name -> Ref or expr
    this.argSep = ',';         // setting for formula separator
    this.lang = 'en';          // 'en' or 'es'
  }

  Workbook.prototype.activeSheet = function () {
    return this.sheets[this.activeSheetIdx];
  };

  Workbook.prototype.getSheet = function (name) {
    if (!name) return this.activeSheet();
    for (var i = 0; i < this.sheets.length; i++) {
      if (this.sheets[i].name.toLowerCase() === name.toLowerCase()) return this.sheets[i];
    }
    return null;
  };

  Workbook.prototype.addSheet = function (name) {
    name = name || ('Sheet' + (this.sheets.length + 1));
    var sh = new Sheet(name);
    this.sheets.push(sh);
    return sh;
  };

  // Evaluator
  Workbook.prototype.evalNode = function (node, sheet, env, callStack) {
    if (!node) return null;
    callStack = callStack || new Set();

    if (node.type === 'NUM' || node.type === 'STR' || node.type === 'BOOL' || node.type === 'ERR') {
      return node.val;
    }

    if (node.type === 'UNARY') {
      var v = this.evalNode(node.expr, sheet, env, callStack);
      if (v instanceof S.Err) return v;
      if (node.op === '-') return -S.toNum(v);
      if (node.op === '+') return +S.toNum(v);
      return v;
    }

    if (node.type === 'BINARY') {
      var l = this.evalNode(node.left, sheet, env, callStack);
      var r = this.evalNode(node.right, sheet, env, callStack);
      if (l instanceof S.Err) return l;
      if (r instanceof S.Err) return r;

      var op = node.op;
      if (op === '+') return S.toNum(l) + S.toNum(r);
      if (op === '-') return S.toNum(l) - S.toNum(r);
      if (op === '*') return S.toNum(l) * S.toNum(r);
      if (op === '/') {
        var divisor = S.toNum(r);
        return divisor === 0 ? S.E.DIV0 : S.toNum(l) / divisor;
      }
      if (op === '^') return Math.pow(S.toNum(l), S.toNum(r));
      if (op === '&') return S.toStr(l) + S.toStr(r);
      if (op === '=') return S.cmp(l, r) === 0;
      if (op === '<>') return S.cmp(l, r) !== 0;
      if (op === '<') return S.cmp(l, r) < 0;
      if (op === '<=') return S.cmp(l, r) <= 0;
      if (op === '>') return S.cmp(l, r) > 0;
      if (op === '>=') return S.cmp(l, r) >= 0;
    }

    if (node.type === 'RANGE_OP') {
      var lRef = (node.left.type === 'REF') ? node.left.ref : null;
      var rRef = (node.right.type === 'REF') ? node.right.ref : null;
      if (lRef && rRef) {
        var merged = new S.Ref(lRef.sheet || sheet.name,
          Math.min(lRef.r1, rRef.r1), Math.min(lRef.c1, rRef.c1),
          Math.max(lRef.r2, rRef.r2), Math.max(lRef.c2, rRef.c2));
        return this.evalNode({ type: 'REF', ref: merged }, sheet, env, callStack);
      }
      return S.E.REF;
    }

    if (node.type === 'REF') {
      var ref = node.ref;
      var targetSheet = this.getSheet(ref.sheet) || sheet;
      if (ref.isCell()) {
        return targetSheet.getVal(ref.r1, ref.c1);
      }
      // Range: return 2D array
      var out = [];
      for (var row = ref.r1; row <= ref.r2; row++) {
        var rowArr = [];
        for (var col = ref.c1; col <= ref.c2; col++) {
          rowArr.push(targetSheet.getVal(row, col));
        }
        out.push(rowArr);
      }
      return out;
    }

    if (node.type === 'TABLE_REF') {
      // Lookup structured reference in sheet tables
      for (var s = 0; s < this.sheets.length; s++) {
        var sh = this.sheets[s];
        for (var t = 0; t < sh.tables.length; t++) {
          var tbl = sh.tables[t];
          if (tbl.name.toLowerCase() === node.table.toLowerCase()) {
            var colIdx = tbl.cols.indexOf(node.col);
            if (colIdx >= 0) {
              var targetCol = tbl.range.c1 + colIdx;
              var outCol = [];
              for (var row = tbl.range.r1 + 1; row <= tbl.range.r2; row++) {
                outCol.push([sh.getVal(row, targetCol)]);
              }
              return outCol;
            }
          }
        }
      }
      return S.E.REF;
    }

    if (node.type === 'CALL') {
      var fnName = node.fn.toUpperCase();
      var fn = S.functions[fnName];

      // Handle LET(name1, val1, ... calc)
      if (fnName === 'LET') {
        var subEnv = Object.assign({}, env);
        for (var a = 0; a < node.args.length - 1; a += 2) {
          var varName = (node.args[a].val || node.args[a].name || '').toUpperCase();
          var varVal = this.evalNode(node.args[a + 1], sheet, subEnv, callStack);
          subEnv[varName] = varVal;
        }
        return this.evalNode(node.args[node.args.length - 1], sheet, subEnv, callStack);
      }

      if (!fn) return S.E.NAME;

      var evaluatedArgs = [];
      for (var i = 0; i < node.args.length; i++) {
        evaluatedArgs.push(this.evalNode(node.args[i], sheet, env, callStack));
      }
      return fn.apply(null, evaluatedArgs);
    }

    if (node.type === 'NAME') {
      var uName = node.name.toUpperCase();
      if (env && env[uName] !== undefined) return env[uName];
      if (this.names[uName]) return this.evalNode(this.names[uName], sheet, env, callStack);
      return S.E.NAME;
    }

    return null;
  };

  // Recalculate sheet / workbook with spill handling
  Workbook.prototype.recalc = function () {
    for (var s = 0; s < this.sheets.length; s++) {
      var sheet = this.sheets[s];
      // Clear previous spills
      Object.keys(sheet.cells).forEach(function (k) {
        var c = sheet.cells[k];
        if (c.spillFrom) {
          delete sheet.cells[k];
        }
      });

      // Pass 1: compute cell formulas
      var keys = Object.keys(sheet.cells);
      for (var i = 0; i < keys.length; i++) {
        var cell = sheet.cells[keys[i]];
        if (cell.formula) {
          var ast = S.parseFormula(cell.formula, sheet.name, this.argSep);
          var coords = keys[i].split(',').map(Number);
          try {
            cell.value = this.evalNode(ast, sheet, null, new Set());
          } catch (e) {
            cell.value = S.E.VALUE;
          }
        }
      }

      // Pass 2: dynamic arrays spilling
      for (var j = 0; j < keys.length; j++) {
        var cellSpill = sheet.cells[keys[j]];
        if (Array.isArray(cellSpill.value)) {
          var arr = cellSpill.value;
          var origin = keys[j].split(',').map(Number);
          var origR = origin[0], origC = origin[1];

          // Check for collision / spill blocked
          var blocked = false;
          for (var r = 0; r < arr.length; r++) {
            for (var c = 0; c < arr[r].length; c++) {
              if (r === 0 && c === 0) continue;
              var existing = sheet.getCell(origR + r, origC + c);
              if (existing && existing.raw !== null && existing.raw !== '') {
                blocked = true;
                break;
              }
            }
            if (blocked) break;
          }

          if (blocked) {
            cellSpill.value = S.E.SPILL;
          } else {
            // Apply spill values to destination cells
            for (var sr = 0; sr < arr.length; sr++) {
              for (var sc = 0; sc < arr[sr].length; sc++) {
                if (sr === 0 && sc === 0) continue;
                var target = sheet.ensureCell(origR + sr, origC + sc);
                target.value = arr[sr][sc];
                target.spillFrom = { r: origR, c: origC };
              }
            }
          }
        }
      }
    }
  };

  S.Workbook = Workbook;
})();
