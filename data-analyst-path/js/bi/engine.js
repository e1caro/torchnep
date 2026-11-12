/* DotBI engine: a DAX evaluator with filter context and relationships, and Tableau calculations with FIXED LOD. */
(function () {
  'use strict';
  var DA = (window.DA = window.DA || {});
  var BI = (DA.bi = {});

  function BIError(msg) { this.message = msg; }
  BIError.prototype = Object.create(Error.prototype);
  BIError.prototype.name = 'DotBI error';
  BIError.prototype.constructor = BIError;
  BI.Error = BIError;
  function fail(msg) { throw new BIError(msg); }
  function TableVal(table, rows) { this.table = table; this.rows = rows; }
  BI.TableVal = TableVal;

  function Model() { this.tables = {}; this.rels = []; }
  Model.prototype.addTable = function (name, cols, rows) { this.tables[name] = { name: name, cols: cols, rows: rows }; };
  Model.prototype.addRelationship = function (fact, fk, dim, pk) { this.rels.push({ fact: fact, fk: fk, dim: dim, pk: pk }); };
  Model.prototype.table = function (name) {
    var t = this.tables[name];
    if (!t) { var k = Object.keys(this.tables).filter(function (x) { return x.toLowerCase() === String(name).toLowerCase(); })[0]; t = k && this.tables[k]; }
    if (!t) fail("Cannot find table '" + name + "'. Tables: " + Object.keys(this.tables).join(', '));
    return t;
  };
  Model.prototype.column = function (table, col) {
    var t = this.table(table);
    var c = t.cols.filter(function (x) { return x.toLowerCase() === String(col).toLowerCase(); })[0];
    if (!c) fail("Column '" + col + "' is not in table '" + t.name + "'. Columns: " + t.cols.join(', '));
    return { table: t.name, col: c };
  };
  BI.Model = Model;

  BI.retailModel = function () {
    var m = new Model(), d = DA.gen.retail(), csv = (DA.sheets && DA.sheets.parseCsv ? DA.sheets.parseCsv(DA.gen.retailCsv()) : DA.gen.retailCsv().trim().split('\n').map(function (l) { return l.split(','); }));
    var head = csv[0], rows = csv.slice(1).filter(function (r) { return r.length > 1; }).map(function (r) {
      var o = {};
      head.forEach(function (h, j) { var v = r[j]; o[h] = v !== '' && isFinite(+v) && h !== 'order_date' ? +v : v; });
      return o;
    });
    m.addTable('Sales', head, rows);
    m.addTable('Customers', ['customer_id', 'signup_date', 'city', 'segment'], d.customers.map(function (c) { return { customer_id: c[0], signup_date: c[1], city: c[2], segment: c[3] }; }));
    m.addRelationship('Sales', 'customer_id', 'Customers', 'customer_id');
    return m;
  };

  function tokenize(src, mode) {
    var toks = [], i = 0, n = src.length, m;
    while (i < n) {
      var ch = src[i];
      if (/\s/.test(ch)) { i++; continue; }
      if (src.substr(i, 2) === '//' || src.substr(i, 2) === '--') { while (i < n && src[i] !== '\n') i++; continue; }
      if (ch === '"' || (ch === "'" && false)) {
        var j = i + 1, s = '';
        while (j < n) { if (src[j] === '"') { if (src[j + 1] === '"') { s += '"'; j += 2; continue; } break; } s += src[j]; j++; }
        if (j >= n) fail('A text value is missing its closing "');
        toks.push({ t: 'str', v: s }); i = j + 1; continue;
      }
      if (ch === "'" && mode === 'tableau') {
        var q = src.indexOf("'", i + 1);
        if (q < 0) fail("A text value is missing its closing '");
        toks.push({ t: 'str', v: src.slice(i + 1, q) }); i = q + 1; continue;
      }
      if (ch === "'") {
        var k = src.indexOf("'", i + 1);
        if (k < 0) fail("A quoted name is missing its closing '");
        toks.push({ t: 'qname', v: src.slice(i + 1, k) }); i = k + 1; continue;
      }
      if (ch === '[') {
        var e = src.indexOf(']', i);
        if (e < 0) fail('A column reference is missing its closing ]');
        toks.push({ t: 'col', v: src.slice(i + 1, e).trim() }); i = e + 1; continue;
      }
      if ((m = /^\d+(\.\d+)?/.exec(src.slice(i)))) { toks.push({ t: 'num', v: +m[0] }); i += m[0].length; continue; }
      if ((m = /^[A-Za-z_][A-Za-z0-9_.]*/.exec(src.slice(i)))) { toks.push({ t: 'name', v: m[0] }); i += m[0].length; continue; }
      var two = src.substr(i, 2);
      if (['<>', '<=', '>=', '&&', '||', '=='].indexOf(two) >= 0) { toks.push({ t: 'op', v: two === '==' ? '=' : two }); i += 2; continue; }
      if ('+-*/&=<>(),{}:!'.indexOf(ch) >= 0) { toks.push({ t: 'op', v: ch }); i++; continue; }
      fail('Unexpected character ' + JSON.stringify(ch));
    }
    toks.push({ t: 'eof' });
    return toks;
  }

  function Parser(src, mode) { this.toks = tokenize(src, mode); this.i = 0; this.mode = mode; }
  Parser.prototype.peek = function () { return this.toks[this.i]; };
  Parser.prototype.next = function () { return this.toks[this.i++]; };
  Parser.prototype.isOp = function (v) { var t = this.peek(); return t.t === 'op' && t.v === v; };
  Parser.prototype.isName = function (v) { var t = this.peek(); return t.t === 'name' && t.v.toUpperCase() === v; };
  Parser.prototype.eat = function (v) { if (!this.isOp(v)) fail('Expected "' + v + '"' + (this.peek().t === 'eof' ? ' at the end' : ' before ' + desc(this.peek()))); this.next(); };
  function desc(t) { return t.t === 'eof' ? 'the end' : t.t === 'str' ? '"' + t.v + '"' : t.t === 'col' ? '[' + t.v + ']' : String(t.v); }
  Parser.prototype.parse = function () {
    var e = this.top();
    if (this.peek().t !== 'eof') fail('Unexpected ' + desc(this.peek()) + '. Check the brackets and commas.');
    return e;
  };
  Parser.prototype.top = function () {
    if (this.mode === 'dax' && this.isName('VAR')) {
      var vars = [];
      while (this.isName('VAR')) { this.next(); var nm = this.next(); if (nm.t !== 'name') fail('VAR needs a name'); this.eat('='); vars.push([nm.v, this.expr()]); }
      if (!this.isName('RETURN')) fail('A VAR block must end with RETURN');
      this.next();
      return { t: 'let', vars: vars, body: this.expr() };
    }
    return this.expr();
  };
  Parser.prototype.expr = function () { return this.or(); };
  Parser.prototype.or = function () {
    var l = this.and();
    while (this.isOp('||') || (this.mode === 'tableau' && this.isName('OR'))) { this.next(); l = { t: 'bin', op: '||', l: l, r: this.and() }; }
    return l;
  };
  Parser.prototype.and = function () {
    var l = this.cmp();
    while (this.isOp('&&') || (this.mode === 'tableau' && this.isName('AND'))) { this.next(); l = { t: 'bin', op: '&&', l: l, r: this.cmp() }; }
    return l;
  };
  Parser.prototype.cmp = function () {
    var l = this.concat();
    while (true) {
      var t = this.peek();
      if (t.t === 'op' && ['=', '<>', '<', '>', '<=', '>='].indexOf(t.v) >= 0) { this.next(); l = { t: 'bin', op: t.v, l: l, r: this.concat() }; }
      else if (this.mode === 'tableau' && t.t === 'op' && t.v === '!' && this.toks[this.i + 1].v === '=') { this.next(); this.next(); l = { t: 'bin', op: '<>', l: l, r: this.concat() }; }
      else if (this.isName('IN')) { this.next(); this.eat('{'); var items = []; while (!this.isOp('}')) { items.push(this.expr()); if (this.isOp(',')) this.next(); else break; } this.eat('}'); l = { t: 'in', l: l, items: items }; }
      else break;
    }
    return l;
  };
  Parser.prototype.concat = function () { var l = this.add(); while (this.isOp('&')) { this.next(); l = { t: 'bin', op: '&', l: l, r: this.add() }; } return l; };
  Parser.prototype.add = function () { var l = this.mul(); while (this.isOp('+') || this.isOp('-')) { var op = this.next().v; l = { t: 'bin', op: op, l: l, r: this.mul() }; } return l; };
  Parser.prototype.mul = function () { var l = this.unary(); while (this.isOp('*') || this.isOp('/')) { var op = this.next().v; l = { t: 'bin', op: op, l: l, r: this.unary() }; } return l; };
  Parser.prototype.unary = function () {
    if (this.isOp('-')) { this.next(); return { t: 'neg', e: this.unary() }; }
    if (this.mode === 'tableau' && this.isName('NOT')) { this.next(); return { t: 'not', e: this.unary() }; }
    return this.atom();
  };
  Parser.prototype.atom = function () {
    var t = this.next();
    if (t.t === 'num') return { t: 'num', v: t.v };
    if (t.t === 'str') return { t: 'str', v: t.v };
    if (t.t === 'col') return { t: 'ref', table: null, col: t.v };
    if (t.t === 'op' && t.v === '(') { var e = this.expr(); this.eat(')'); return e; }
    if (t.t === 'op' && t.v === '{' && this.mode === 'tableau') {
      var kind = this.next();
      if (kind.t !== 'name' || ['FIXED', 'INCLUDE', 'EXCLUDE'].indexOf(kind.v.toUpperCase()) < 0) fail('A level of detail expression starts with { FIXED ... : ... }');
      if (kind.v.toUpperCase() !== 'FIXED') fail(kind.v.toUpperCase() + ' is not available in DotBI yet: use { FIXED [dimension] : AGG([field]) }');
      var dims = [];
      while (!this.isOp(':')) { var d = this.next(); if (d.t !== 'col') fail('List the dimensions in brackets, like { FIXED [customer_id] : ... }'); dims.push(d.v); if (this.isOp(',')) this.next(); }
      this.eat(':');
      var inner = this.expr();
      this.eat('}');
      return { t: 'lod', dims: dims, e: inner };
    }
    if (t.t === 'name' || t.t === 'qname') {
      if (this.isOp('(') && t.t === 'name') {
        this.next();
        var args = [];
        if (!this.isOp(')')) { while (true) { args.push(this.expr()); if (this.isOp(',')) { this.next(); continue; } break; } }
        this.eat(')');
        return { t: 'call', fn: t.v.toUpperCase(), args: args };
      }
      if (this.peek().t === 'col') { var c = this.next(); return { t: 'ref', table: t.v, col: c.v }; }
      var up = t.v.toUpperCase();
      if (up === 'TRUE' || up === 'FALSE') return { t: 'bool', v: up === 'TRUE' };
      if (up === 'NULL' && this.mode === 'tableau') return { t: 'null' };
      if (this.mode === 'tableau' && up === 'IF') return this.tableauIf();
      return { t: 'name', v: t.v };
    }
    fail('Unexpected ' + desc(t));
  };
  Parser.prototype.tableauIf = function () {
    var cond = this.expr();
    if (!this.isName('THEN')) fail('IF needs THEN');
    this.next(); var a = this.expr(), b = { t: 'null' };
    if (this.isName('ELSEIF')) { this.next(); b = this.tableauIf(); return { t: 'call', fn: 'IIF', args: [cond, a, b] }; }
    if (this.isName('ELSE')) { this.next(); b = this.expr(); }
    if (!this.isName('END')) fail('IF needs END');
    this.next();
    return { t: 'call', fn: 'IIF', args: [cond, a, b] };
  };
  BI.parse = function (src, mode) { return new Parser(String(src || ''), mode || 'dax').parse(); };

  function blank(v) { return v === null || v === undefined || (typeof v === 'number' && isNaN(v)); }
  function toNum(v) { if (blank(v)) return 0; if (typeof v === 'boolean') return v ? 1 : 0; var n = Number(v); if (isNaN(n)) fail('Cannot convert "' + v + '" to a number'); return n; }
  function cmpv(a, b) { if (blank(a)) a = typeof b === 'string' ? '' : 0; if (blank(b)) b = typeof a === 'string' ? '' : 0; if (typeof a === 'number' && typeof b === 'string' && isFinite(+b)) b = +b; if (typeof b === 'number' && typeof a === 'string' && isFinite(+a)) a = +a; return a < b ? -1 : a > b ? 1 : 0; }
  function binop(op, a, b) {
    switch (op) {
      case '+': return blank(a) && blank(b) ? null : toNum(a) + toNum(b);
      case '-': return blank(a) && blank(b) ? null : toNum(a) - toNum(b);
      case '*': return blank(a) || blank(b) ? null : toNum(a) * toNum(b);
      case '/': if (blank(b) || toNum(b) === 0) { if (blank(a)) return null; fail('Division by zero: use DIVIDE(a, b) to get a blank instead of an error'); } return toNum(a) / toNum(b);
      case '&': return (blank(a) ? '' : String(a)) + (blank(b) ? '' : String(b));
      case '=': return cmpv(a, b) === 0;
      case '<>': return cmpv(a, b) !== 0;
      case '<': return cmpv(a, b) < 0;
      case '>': return cmpv(a, b) > 0;
      case '<=': return cmpv(a, b) <= 0;
      case '>=': return cmpv(a, b) >= 0;
      case '&&': return !!a && !!b;
      case '||': return !!a || !!b;
    }
  }
  function dateParts(v) { var m = /^(\d{4})-(\d{2})-(\d{2})/.exec(String(v || '')); if (!m) fail('"' + v + '" is not a date'); return { y: +m[1], m: +m[2], d: +m[3] }; }
  function agg(fn, vals) {
    var nums = vals.filter(function (v) { return !blank(v); });
    if (fn === 'COUNT') return nums.length || null;
    if (fn === 'DISTINCTCOUNT' || fn === 'COUNTD') { var seen = {}; nums.forEach(function (v) { seen[String(v)] = 1; }); return Object.keys(seen).length || (fn === 'COUNTD' ? 0 : null); }
    if (!nums.length) return null;
    if (fn === 'MIN' || fn === 'MAX') return nums.reduce(function (a, b) { return (cmpv(b, a) < 0) === (fn === 'MIN') ? b : a; });
    var n = nums.map(toNum), s = n.reduce(function (a, b) { return a + b; }, 0);
    if (fn === 'SUM') return s;
    if (fn === 'AVERAGE' || fn === 'AVG') return s / n.length;
    if (fn === 'MEDIAN') { n.sort(function (a, b) { return a - b; }); var k = Math.floor(n.length / 2); return n.length % 2 ? n[k] : (n[k - 1] + n[k]) / 2; }
  }

  function Ctx(model) { this.model = model; this.colF = {}; this.rowF = {}; this.row = null; this.vars = {}; this.steps = 0; }
  Ctx.prototype.clone = function () {
    var c = new Ctx(this.model);
    c.colF = Object.assign({}, this.colF);
    var rf = {}; var self = this; Object.keys(this.rowF).forEach(function (k) { rf[k] = self.rowF[k].slice(); }); c.rowF = rf;
    c.row = this.row; c.vars = Object.assign({}, this.vars); c.steps = this.steps;
    return c;
  };

  function rowsOf(table, ctx) {
    var m = ctx.model, t = m.table(table), colF = ctx.colF, rowF = ctx.rowF[t.name] || [];
    var own = Object.keys(colF).filter(function (k) { return k.split('|')[0] === t.name; });
    var allowed = [];
    m.rels.forEach(function (r) {
      if (r.fact !== t.name) return;
      var dimF = Object.keys(colF).filter(function (k) { return k.split('|')[0] === r.dim; });
      if (!dimF.length && !(ctx.rowF[r.dim] || []).length) return;
      var keys = {};
      rowsOf(r.dim, ctx).forEach(function (row) { keys[String(row[r.pk])] = 1; });
      allowed.push({ fk: r.fk, keys: keys });
    });
    return t.rows.filter(function (row) {
      for (var i = 0; i < own.length; i++) if (!colF[own[i]](row[own[i].split('|')[1]])) return false;
      for (var j = 0; j < rowF.length; j++) if (!rowF[j](row)) return false;
      for (var k = 0; k < allowed.length; k++) if (!allowed[k].keys[String(row[allowed[k].fk])]) return false;
      return true;
    });
  }
  BI.rowsOf = rowsOf;

  function refCol(node, ctx) {
    if (node.table) return ctx.model.column(node.table, node.col);
    if (ctx.row) return ctx.model.column(ctx.row.table, node.col);
    fail('[' + node.col + '] needs a table name, like Sales[' + node.col + ']');
  }
  function colsIn(node, out) {
    out = out || [];
    if (!node || typeof node !== 'object') return out;
    if (node.t === 'ref') out.push(node);
    ['l', 'r', 'e', 'body'].forEach(function (k) { if (node[k]) colsIn(node[k], out); });
    (node.args || []).forEach(function (a) { colsIn(a, out); });
    (node.items || []).forEach(function (a) { colsIn(a, out); });
    return out;
  }

  function tableArg(node, ctx) {
    if (node.t === 'name' || (node.t === 'ref' && false)) return new TableVal(ctx.model.table(node.v).name, rowsOf(node.v, ctx));
    var v = evalD(node, ctx);
    if (v instanceof TableVal) return v;
    fail('Expected a table here (like Sales or FILTER(Sales, ...))');
  }

  function evalD(node, ctx) {
    if (++ctx.steps > 2e7) fail('The measure is too slow to compute here');
    switch (node.t) {
      case 'num': return node.v;
      case 'str': return node.v;
      case 'bool': return node.v;
      case 'neg': { var v = evalD(node.e, ctx); return blank(v) ? null : -toNum(v); }
      case 'let': {
        var c = ctx.clone();
        node.vars.forEach(function (p) { c.vars[p[0].toUpperCase()] = evalD(p[1], c); });
        return evalD(node.body, c);
      }
      case 'name': {
        var nm = node.v.toUpperCase();
        if (nm in ctx.vars) return ctx.vars[nm];
        if (ctx.model.tables[node.v] || Object.keys(ctx.model.tables).some(function (k) { return k.toLowerCase() === node.v.toLowerCase(); })) return new TableVal(ctx.model.table(node.v).name, rowsOf(node.v, ctx));
        fail("Unknown name '" + node.v + "'. Did you mean a column like Sales[" + node.v + '] or a function call like ' + node.v + '(...)?');
      }
      case 'ref': {
        var rc = refCol(node, ctx);
        if (!ctx.row) fail('A column like ' + rc.table + '[' + rc.col + '] needs an aggregation here, like SUM(' + rc.table + '[' + rc.col + '])');
        if (ctx.row.table !== rc.table) fail('In this row context use RELATED(' + rc.table + '[' + rc.col + '])');
        return ctx.row.row[rc.col];
      }
      case 'bin': return binop(node.op, evalD(node.l, ctx), evalD(node.r, ctx));
      case 'in': { var lv = evalD(node.l, ctx); return node.items.some(function (it) { return cmpv(lv, evalD(it, ctx)) === 0; }); }
      case 'call': return callD(node, ctx);
      case 'lod': fail('{ FIXED ... } is Tableau syntax: switch this challenge to Tableau, or use CALCULATE in DAX');
    }
    fail('Unsupported expression');
  }

  var AGGS = { SUM: 1, AVERAGE: 1, MIN: 1, MAX: 1, COUNT: 1, DISTINCTCOUNT: 1, MEDIAN: 1 };
  var XS = { SUMX: 'SUM', AVERAGEX: 'AVERAGE', MINX: 'MIN', MAXX: 'MAX', COUNTX: 'COUNT' };

  function nargs(node, lo, hi) {
    var n = node.args.length;
    if (n < lo || n > hi) fail(node.fn + ' takes ' + (lo === hi ? lo : lo + ' to ' + hi) + ' argument' + (hi === 1 ? '' : 's') + ', you gave ' + n);
  }

  function filterArg(arg, ctx, c) {
    if (arg.t === 'call' && (arg.fn === 'ALL' || arg.fn === 'REMOVEFILTERS')) {
      arg.args.forEach(function (a) {
        if (a.t === 'name') { var tn = ctx.model.table(a.v).name; Object.keys(c.colF).forEach(function (k) { if (k.split('|')[0] === tn) delete c.colF[k]; }); delete c.rowF[tn]; }
        else if (a.t === 'ref') { var rc = ctx.model.column(a.table, a.col); delete c.colF[rc.table + '|' + rc.col]; }
      });
      if (!arg.args.length) { c.colF = {}; c.rowF = {}; }
      return;
    }
    if (arg.t === 'call' && arg.fn === 'FILTER') {
      var tv = evalD(arg, ctx);
      var set = new Set(tv.rows);
      (c.rowF[tv.table] = c.rowF[tv.table] || []).push(function (row) { return set.has(row); });
      return;
    }
    if (arg.t === 'name' || arg.t === 'call' && arg.fn === 'VALUES') fail('Use a condition like Sales[channel] = "delivery", FILTER(...) or ALL(...) as a CALCULATE filter');
    var refs = colsIn(arg), cols = {};
    refs.forEach(function (r) { var rc = ctx.model.column(r.table || (ctx.row && ctx.row.table) || '', r.col); cols[rc.table + '|' + rc.col] = rc; });
    var keys = Object.keys(cols);
    if (!keys.length) fail('A CALCULATE filter must mention a column, like Sales[channel] = "delivery"');
    var tables = {}; keys.forEach(function (k) { tables[k.split('|')[0]] = 1; });
    if (Object.keys(tables).length > 1) fail('A filter condition can use columns of one table only. Use FILTER for more complex conditions.');
    var outer = ctx;
    if (keys.length === 1) {
      var only = cols[keys[0]];
      c.colF[keys[0]] = function (v) { var row = {}; row[only.col] = v; var cc = outer.clone(); cc.row = { table: only.table, row: row }; return !!evalD(arg, cc); };
    } else {
      var tn2 = Object.keys(tables)[0];
      keys.forEach(function (k) { delete c.colF[k]; });
      (c.rowF[tn2] = c.rowF[tn2] || []).push(function (row) { var cc = outer.clone(); cc.row = { table: tn2, row: row }; return !!evalD(arg, cc); });
    }
  }

  function callD(node, ctx) {
    var f = node.fn, a = node.args;
    if (AGGS[f]) {
      nargs(node, 1, 1);
      if (a[0].t !== 'ref') fail(f + ' needs a column, like ' + f + '(Sales[qty]). For an expression, use ' + (f === 'AVERAGE' ? 'AVERAGEX' : f + 'X') + '.');
      var rc = refCol(a[0], ctx);
      var rows = ctx.row && false ? [] : rowsOf(rc.table, ctx.row ? withoutRow(ctx) : ctx);
      return agg(f, rows.map(function (r) { return r[rc.col]; }));
    }
    if (XS[f]) {
      nargs(node, 2, 2);
      var tv = tableArg(a[0], ctx);
      var vals = tv.rows.map(function (row) { var c = ctx.clone(); c.row = { table: tv.table, row: row }; return evalD(a[1], c); });
      return agg(XS[f], vals);
    }
    switch (f) {
      case 'COUNTROWS': { nargs(node, 1, 1); var t = tableArg(a[0], ctx); return t.rows.length || null; }
      case 'DIVIDE': {
        nargs(node, 2, 3);
        var num = evalD(a[0], ctx), den = evalD(a[1], ctx);
        if (blank(den) || toNum(den) === 0) return a[2] ? evalD(a[2], ctx) : null;
        if (blank(num)) return null;
        return toNum(num) / toNum(den);
      }
      case 'CALCULATE': {
        if (!a.length) fail('CALCULATE needs an expression');
        var c = ctx.clone();
        if (ctx.row) { var rt = ctx.row; c.row = null; Object.keys(rt.row).forEach(function (k) { var v = rt.row[k]; c.colF[rt.table + '|' + k] = function (x) { return x === v; }; }); }
        a.slice(1).forEach(function (arg) { filterArg(arg, ctx.row ? c : ctx, c); });
        return evalD(a[0], c);
      }
      case 'FILTER': {
        nargs(node, 2, 2);
        var base = tableArg(a[0], withoutRow(ctx));
        return new TableVal(base.table, base.rows.filter(function (row) { var cc = ctx.clone(); cc.row = { table: base.table, row: row }; return !!evalD(a[1], cc); }));
      }
      case 'ALL': case 'REMOVEFILTERS': {
        if (a.length !== 1) fail(f + ' as a table needs one table, like ALL(Sales)');
        if (a[0].t === 'name') { var tb = ctx.model.table(a[0].v); return new TableVal(tb.name, tb.rows.slice()); }
        fail('Use ALL(Sales[column]) inside CALCULATE to remove a filter');
      }
      case 'VALUES': case 'DISTINCT': {
        nargs(node, 1, 1);
        if (a[0].t !== 'ref') fail(f + ' needs a column');
        var vc = refCol(a[0], ctx), seen = {}, out = [];
        rowsOf(vc.table, ctx).forEach(function (r) { var k = String(r[vc.col]); if (!seen[k]) { seen[k] = 1; var o = {}; o[vc.col] = r[vc.col]; out.push(o); } });
        return new TableVal(vc.table, out);
      }
      case 'RELATED': {
        nargs(node, 1, 1);
        if (!ctx.row) fail('RELATED works inside a row context, like SUMX(Sales, ...) or FILTER(Sales, ...)');
        var target = ctx.model.column(a[0].table, a[0].col);
        var rel = ctx.model.rels.filter(function (r) { return r.fact === ctx.row.table && r.dim === target.table; })[0];
        if (!rel) fail('There is no relationship from ' + ctx.row.table + ' to ' + target.table);
        var key = ctx.row.row[rel.fk], hit = ctx.model.table(target.table).rows.filter(function (r) { return r[rel.pk] === key; })[0];
        return hit ? hit[target.col] : null;
      }
      case 'IF': { nargs(node, 2, 3); return evalD(a[0], ctx) ? evalD(a[1], ctx) : (a[2] ? evalD(a[2], ctx) : null); }
      case 'ROUND': { nargs(node, 2, 2); var x = evalD(a[0], ctx), d = toNum(evalD(a[1], ctx)); if (blank(x)) return null; var p = Math.pow(10, d); return Math.round(toNum(x) * p) / p; }
      case 'ABS': { nargs(node, 1, 1); var y = evalD(a[0], ctx); return blank(y) ? null : Math.abs(toNum(y)); }
      case 'BLANK': return null;
      case 'ISBLANK': { nargs(node, 1, 1); return blank(evalD(a[0], ctx)); }
      case 'NOT': { nargs(node, 1, 1); return !evalD(a[0], ctx); }
      case 'AND': { nargs(node, 2, 2); return !!evalD(a[0], ctx) && !!evalD(a[1], ctx); }
      case 'OR': { nargs(node, 2, 2); return !!evalD(a[0], ctx) || !!evalD(a[1], ctx); }
      case 'YEAR': case 'MONTH': case 'DAY': { nargs(node, 1, 1); var dp = dateParts(evalD(a[0], ctx)); return f === 'YEAR' ? dp.y : f === 'MONTH' ? dp.m : dp.d; }
      case 'TRUE': return true;
      case 'FALSE': return false;
    }
    fail('Unknown function ' + f + '. DotBI knows SUM, AVERAGE, MIN, MAX, COUNT, DISTINCTCOUNT, COUNTROWS, SUMX, AVERAGEX, CALCULATE, FILTER, ALL, DIVIDE, RELATED, IF, ROUND and VAR/RETURN.');
  }
  function withoutRow(ctx) { if (!ctx.row) return ctx; var c = ctx.clone(); c.row = null; return c; }

  BI.evalDax = function (formula, model, filters) {
    var ctx = new Ctx(model);
    Object.keys(filters || {}).forEach(function (k) { ctx.colF[k] = filters[k]; });
    var v = evalD(BI.parse(formula, 'dax'), ctx);
    if (v instanceof TableVal) fail('This returns a table, not a number. Wrap it, e.g. COUNTROWS(...)');
    return v;
  };

  var TAGG = { SUM: 'SUM', AVG: 'AVG', MIN: 'MIN', MAX: 'MAX', COUNT: 'COUNT', COUNTD: 'COUNTD', MEDIAN: 'MEDIAN', ATTR: 'ATTR' };

  function evalT(node, env) {
    switch (node.t) {
      case 'num': return node.v;
      case 'str': return node.v;
      case 'bool': return node.v;
      case 'null': return null;
      case 'neg': { var v = evalT(node.e, env); return blank(v) ? null : -toNum(v); }
      case 'not': return !evalT(node.e, env);
      case 'ref': {
        if (node.table) fail('In Tableau write fields as [' + node.col + '], without a table name');
        if (!env.row) fail('[' + node.col + '] is a row-level field: wrap it in an aggregation like SUM([' + node.col + ']) or use it inside one');
        if (!(node.col in env.row)) fail("Field [" + node.col + "] does not exist. Fields: " + Object.keys(env.row).join(', '));
        return env.row[node.col];
      }
      case 'bin': return binop(node.op, evalT(node.l, env), evalT(node.r, env));
      case 'in': { var lv = evalT(node.l, env); return node.items.some(function (it) { return cmpv(lv, evalT(it, env)) === 0; }); }
      case 'lod': {
        if (!env.row) fail('A FIXED expression returns one value per row: wrap it in an aggregation, like AVG({ FIXED [customer_id] : SUM([qty]) })');
        var key = node.dims.map(function (d) { if (!(d in env.row)) fail('Field [' + d + '] does not exist'); return String(env.row[d]); }).join('|');
        var cache = env.lodCache.get(node);
        if (!cache) {
          cache = {}; var groups = {};
          env.all.forEach(function (r) { var k = node.dims.map(function (d) { return String(r[d]); }).join('|'); (groups[k] = groups[k] || []).push(r); });
          Object.keys(groups).forEach(function (k) { cache[k] = evalT(node.e, { rows: groups[k], row: null, all: env.all, lodCache: env.lodCache }); });
          env.lodCache.set(node, cache);
        }
        return cache[key];
      }
      case 'call': {
        var f = node.fn, a = node.args;
        if (TAGG[f]) {
          if (a.length !== 1) fail(f + ' takes one field');
          if (env.row) fail('You cannot nest aggregations: ' + f + ' inside another aggregation');
          var vals = env.rows.map(function (r) { return evalT(a[0], { rows: env.rows, row: r, all: env.all, lodCache: env.lodCache }); });
          if (f === 'ATTR') { var u = vals.filter(function (x, i) { return vals.indexOf(x) === i; }); return u.length === 1 ? u[0] : '*'; }
          return agg(f, vals);
        }
        switch (f) {
          case 'IIF': if (a.length < 2) fail('IIF(test, then, else)'); return evalT(a[0], env) ? evalT(a[1], env) : (a[2] ? evalT(a[2], env) : null);
          case 'ZN': { var z = evalT(a[0], env); return blank(z) ? 0 : z; }
          case 'ISNULL': return blank(evalT(a[0], env));
          case 'ROUND': { var x = evalT(a[0], env), d = a[1] ? toNum(evalT(a[1], env)) : 0, p = Math.pow(10, d); return blank(x) ? null : Math.round(toNum(x) * p) / p; }
          case 'ABS': { var y = evalT(a[0], env); return blank(y) ? null : Math.abs(toNum(y)); }
          case 'YEAR': case 'MONTH': case 'DAY': { var dp = dateParts(evalT(a[0], env)); return f === 'YEAR' ? dp.y : f === 'MONTH' ? dp.m : dp.d; }
          case 'DATEPART': {
            if (a.length !== 2 || a[0].t !== 'str') fail("DATEPART('month', [order_date])");
            var part = a[0].v.toLowerCase(), q = dateParts(evalT(a[1], env));
            if (part === 'year') return q.y; if (part === 'month') return q.m; if (part === 'day') return q.d; if (part === 'quarter') return Math.floor((q.m - 1) / 3) + 1;
            fail("DATEPART knows 'year', 'quarter', 'month' and 'day'");
          }
          case 'DIV': return Math.floor(toNum(evalT(a[0], env)) / toNum(evalT(a[1], env)));
        }
        fail('Unknown function ' + f + '. DotBI knows SUM, AVG, MIN, MAX, COUNT, COUNTD, MEDIAN, IIF, IF THEN ELSE END, ZN, ROUND, YEAR, MONTH, DATEPART and { FIXED ... }.');
      }
      case 'name': fail("Unknown name '" + node.v + "'. Fields are written in brackets, like [qty]");
      case 'let': fail('VAR / RETURN is DAX syntax');
    }
    fail('Unsupported expression');
  }

  BI.evalTableau = function (formula, rows, allRows) {
    var tree = BI.parse(formula, 'tableau');
    return evalT(tree, { rows: rows, row: null, all: allRows || rows, lodCache: new Map() });
  };

  BI.evalLOD = function (lodExpr, rows) {
    var tree = BI.parse(lodExpr, 'tableau');
    if (tree.t !== 'lod') fail('Expected { FIXED [dimension] : ... }');
    var out = {}, env = { rows: rows, row: null, all: rows, lodCache: new Map() };
    rows.forEach(function (r) { out[tree.dims.map(function (d) { return String(r[d]); }).join('|')] = evalT(tree, { rows: rows, row: r, all: rows, lodCache: env.lodCache }); });
    return out;
  };

  BI.dims = {
    'Sales[store_city]': { table: 'Sales', col: 'store_city', label: 'store_city' },
    'Sales[channel]': { table: 'Sales', col: 'channel', label: 'channel' },
    'Sales[category]': { table: 'Sales', col: 'category', label: 'category' },
    'Sales[product]': { table: 'Sales', col: 'product', label: 'product' },
    'Customers[segment]': { table: 'Customers', col: 'segment', label: 'segment' },
  };

  BI.breakdown = function (model, mode, formula, dimKey) {
    var tree = BI.parse(formula, mode);
    var sales = model.table('Sales').rows;
    var members = [];
    var dim = dimKey ? BI.dims[dimKey] : null;
    if (dim) {
      var seen = {};
      model.table(dim.table).rows.forEach(function (r) { var k = r[dim.col]; if (!seen[k]) { seen[k] = 1; members.push(k); } });
      members.sort(function (a, b) { return cmpv(a, b); });
    }
    function daxAt(member) {
      var ctx = new Ctx(model);
      if (dim && member !== undefined) ctx.colF[dim.table + '|' + dim.col] = function (v) { return v === member; };
      var v = evalD(tree, ctx);
      if (v instanceof TableVal) fail('This returns a table, not a number. Wrap it, e.g. COUNTROWS(...)');
      return v;
    }
    function tabAt(member) {
      var rows = sales;
      if (dim && member !== undefined) {
        if (dim.table === 'Sales') rows = sales.filter(function (r) { return r[dim.col] === member; });
        else { var cust = {}; model.table('Customers').rows.forEach(function (c) { if (c[dim.col] === member) cust[c.customer_id] = 1; }); rows = sales.filter(function (r) { return cust[r.customer_id]; }); }
      }
      var v = evalT(tree, { rows: rows, row: null, all: sales, lodCache: cacheT });
      if (typeof v === 'boolean') v = v ? 1 : 0;
      return v;
    }
    var cacheT = new Map();
    var at = mode === 'tableau' ? tabAt : daxAt;
    return { total: at(undefined), rows: members.map(function (mb) { return { member: mb, value: at(mb) }; }) };
  };

  BI.same = function (a, b) {
    if (blank(a) && blank(b)) return true;
    if (typeof a === 'number' && typeof b === 'number') return Math.abs(a - b) <= 1e-6 * Math.max(1, Math.abs(b));
    return a === b;
  };
})();
