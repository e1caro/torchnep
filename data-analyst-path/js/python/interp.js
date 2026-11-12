/* DotPython interpreter: a small, safe Python subset (no access to the page) that runs pandas-style code. */
(function () {
  'use strict';
  var DA = (window.DA = window.DA || {});
  var P = (DA.python = DA.python || {});
  var PyError = P.PyError, Tuple = P.Tuple, Dict = P.Dict, Series = P.Series, DataFrame = P.DataFrame, GroupBy = P.GroupBy, NdArray = P.NdArray, isNa = P.isNa;
  function err(type, msg) { return new PyError(type, msg); }

  var OPS = ['**=', '//=', '**', '//', '==', '!=', '<=', '>=', '+=', '-=', '*=', '/=', '%=', '->', '(', ')', '[', ']', '{', '}', ',', ':', '.', ';', '+', '-', '*', '/', '%', '<', '>', '=', '&', '|', '~', '^', '@'];
  var KEYWORDS = ['and', 'or', 'not', 'in', 'is', 'if', 'elif', 'else', 'for', 'while', 'def', 'return', 'lambda', 'True', 'False', 'None', 'import', 'from', 'as', 'pass', 'break', 'continue', 'del'];

  function tokenize(src) {
    var toks = [], i = 0, line = 1, depth = 0, indents = [0], atStart = true, n = src.length;
    function push(t, v) { toks.push({ t: t, v: v, line: line }); }
    while (i < n) {
      var ch = src[i];
      if (atStart && depth === 0) {
        var col = 0, j = i;
        while (j < n && (src[j] === ' ' || src[j] === '\t')) { col += src[j] === '\t' ? 4 : 1; j++; }
        if (j >= n) { i = j; break; }
        if (src[j] === '\n' || src[j] === '#' || src[j] === '\r') { i = j; atStart = false; continue; }
        if (col > indents[indents.length - 1]) { indents.push(col); push('INDENT'); }
        while (col < indents[indents.length - 1]) { indents.pop(); push('DEDENT'); }
        if (col !== indents[indents.length - 1]) throw Object.assign(err('IndentationError', 'unindent does not match any outer indentation level'), { line: line });
        i = j; atStart = false; continue;
      }
      if (ch === '\n') { if (depth === 0 && toks.length && toks[toks.length - 1].t !== 'NL') push('NL'); line++; i++; atStart = true; continue; }
      if (ch === ' ' || ch === '\t' || ch === '\r') { i++; continue; }
      if (ch === '\\' && src[i + 1] === '\n') { i += 2; line++; continue; }
      if (ch === '#') { while (i < n && src[i] !== '\n') i++; continue; }
      var m = /^([rRfFbB]{0,2})("""|'''|"|')/.exec(src.slice(i, i + 5));
      if (m && (m[1] || ch === '"' || ch === "'")) {
        var pre = m[1].toLowerCase(), q = m[2], k = i + m[0].length, s = '';
        while (true) {
          if (k >= n) throw Object.assign(err('SyntaxError', 'unterminated string literal'), { line: line });
          if (src.substr(k, q.length) === q) { k += q.length; break; }
          var c = src[k];
          if (c === '\n') { if (q.length === 1) throw Object.assign(err('SyntaxError', 'unterminated string literal'), { line: line }); line++; }
          if (c === '\\' && pre.indexOf('r') < 0) {
            var e2 = src[k + 1], map = { n: '\n', t: '\t', '\\': '\\', "'": "'", '"': '"', '0': '\0' };
            s += map[e2] !== undefined ? map[e2] : '\\' + e2; k += 2; continue;
          }
          s += c; k++;
        }
        push(pre.indexOf('f') >= 0 ? 'FSTR' : 'STR', s);
        i = k; continue;
      }
      m = /^(\d[\d_]*\.?\d*(?:[eE][+-]?\d+)?|\.\d+(?:[eE][+-]?\d+)?)/.exec(src.slice(i));
      if (m) { push('NUM', m[1]); i += m[1].length; continue; }
      m = /^[A-Za-z_]\w*/.exec(src.slice(i));
      if (m) { push(KEYWORDS.indexOf(m[0]) >= 0 ? 'KW' : 'NAME', m[0]); i += m[0].length; continue; }
      var op = null;
      for (var o = 0; o < OPS.length; o++) if (src.substr(i, OPS[o].length) === OPS[o]) { op = OPS[o]; break; }
      if (!op) throw Object.assign(err('SyntaxError', 'invalid character ' + JSON.stringify(ch)), { line: line });
      if ('([{'.indexOf(op) >= 0) depth++;
      if (')]}'.indexOf(op) >= 0) depth = Math.max(0, depth - 1);
      push('OP', op); i += op.length;
    }
    if (toks.length && toks[toks.length - 1].t !== 'NL') push('NL');
    while (indents.length > 1) { indents.pop(); push('DEDENT'); }
    push('EOF');
    return toks;
  }
  P.tokenize = tokenize;

  function Parser(toks) { this.toks = toks; this.i = 0; }
  Parser.prototype.peek = function (o) { return this.toks[this.i + (o || 0)]; };
  Parser.prototype.next = function () { return this.toks[this.i++]; };
  Parser.prototype.is = function (t, v, o) { var k = this.peek(o); return k.t === t && (v === undefined || k.v === v); };
  Parser.prototype.op = function (v) { return this.is('OP', v); };
  Parser.prototype.kw = function (v) { return this.is('KW', v); };
  Parser.prototype.fail = function (msg, tok) { tok = tok || this.peek(); var e = err('SyntaxError', msg || ('invalid syntax near ' + (tok.v === undefined ? tok.t : JSON.stringify(tok.v)))); e.line = tok.line; throw e; };
  Parser.prototype.eat = function (t, v) { if (!this.is(t, v)) this.fail(v ? 'expected "' + v + '"' : null); return this.next(); };

  Parser.prototype.program = function () {
    var body = [];
    while (!this.is('EOF')) { if (this.is('NL')) { this.next(); continue; } body.push(this.stmt()); }
    return body;
  };
  Parser.prototype.block = function () {
    this.eat('OP', ':');
    if (!this.is('NL')) { var s = [this.simple()]; this.eat('NL'); return s; }
    this.eat('NL');
    while (this.is('NL')) this.next();
    if (!this.is('INDENT')) this.fail('expected an indented block');
    this.next();
    var body = [];
    while (!this.is('DEDENT') && !this.is('EOF')) { if (this.is('NL')) { this.next(); continue; } body.push(this.stmt()); }
    if (this.is('DEDENT')) this.next();
    return body;
  };
  Parser.prototype.stmt = function () {
    var tok = this.peek(), s;
    if (this.kw('if')) {
      this.next(); var tests = [[this.expr(), this.block()]], orelse = null;
      while (this.kw('elif')) { this.next(); tests.push([this.expr(), this.block()]); }
      if (this.kw('else')) { this.next(); orelse = this.block(); }
      return { t: 'if', tests: tests, orelse: orelse, line: tok.line };
    }
    if (this.kw('for')) {
      this.next(); var target = this.targetList(); this.eat('KW', 'in'); var it = this.exprList();
      return { t: 'for', target: target, iter: it, body: this.block(), line: tok.line };
    }
    if (this.kw('while')) { this.next(); var c = this.expr(); return { t: 'while', cond: c, body: this.block(), line: tok.line }; }
    if (this.kw('def')) this.fail('def is not supported in DotPython: use a lambda, or write the steps directly');
    s = this.simple();
    if (this.op(';')) this.next();
    if (!this.is('EOF') && !this.is('DEDENT')) this.eat('NL');
    return s;
  };
  Parser.prototype.targetList = function () {
    var first = this.postfix(), items = [first];
    while (this.op(',')) { this.next(); items.push(this.postfix()); }
    return items.length === 1 ? first : { t: 'tuple', items: items };
  };
  Parser.prototype.simple = function () {
    var tok = this.peek();
    if (this.kw('pass')) { this.next(); return { t: 'pass', line: tok.line }; }
    if (this.kw('break') || this.kw('continue')) { var k = this.next().v; return { t: k, line: tok.line }; }
    if (this.kw('import')) {
      this.next(); var name = this.eat('NAME').v; while (this.op('.')) { this.next(); name += '.' + this.eat('NAME').v; }
      var as = name; if (this.kw('as')) { this.next(); as = this.eat('NAME').v; }
      return { t: 'import', name: name, as: as, line: tok.line };
    }
    if (this.kw('from')) this.fail('use "import pandas as pd"');
    var e = this.exprList();
    if (this.op('=')) {
      var targets = [e];
      while (this.op('=')) { this.next(); targets.push(this.exprList()); }
      var value = targets.pop();
      targets.forEach(function (t) { if (['name', 'sub', 'tuple', 'attr'].indexOf(t.t) < 0) throw Object.assign(err('SyntaxError', 'cannot assign to this expression'), { line: tok.line }); });
      return { t: 'assign', targets: targets, value: value, line: tok.line };
    }
    var aug = ['+=', '-=', '*=', '/=', '//=', '%=', '**='];
    for (var i = 0; i < aug.length; i++) if (this.op(aug[i])) { this.next(); return { t: 'aug', target: e, op: aug[i].slice(0, -1), value: this.expr(), line: tok.line }; }
    return { t: 'expr', e: e, line: tok.line };
  };
  Parser.prototype.exprList = function () {
    var e = this.expr();
    if (!this.op(',')) return e;
    var items = [e];
    while (this.op(',')) { this.next(); if (this.is('NL') || this.op('=') || this.op(')') || this.is('EOF')) break; items.push(this.expr()); }
    return { t: 'tuple', items: items };
  };
  Parser.prototype.expr = function () {
    if (this.kw('lambda')) {
      this.next(); var params = [];
      while (!this.op(':')) { params.push(this.eat('NAME').v); if (this.op(',')) this.next(); }
      this.eat('OP', ':');
      return { t: 'lambda', params: params, body: this.expr() };
    }
    var e = this.or();
    if (this.kw('if') ) {
      this.next(); var cond = this.or(); this.eat('KW', 'else');
      return { t: 'ifexp', cond: cond, a: e, b: this.expr() };
    }
    return e;
  };
  Parser.prototype.or = function () { var l = this.and(); while (this.kw('or')) { this.next(); l = { t: 'bool', op: 'or', l: l, r: this.and() }; } return l; };
  Parser.prototype.and = function () { var l = this.not(); while (this.kw('and')) { this.next(); l = { t: 'bool', op: 'and', l: l, r: this.not() }; } return l; };
  Parser.prototype.not = function () { if (this.kw('not')) { this.next(); return { t: 'not', e: this.not() }; } return this.cmp(); };
  Parser.prototype.cmp = function () {
    var l = this.bitor(), ops = [], rest = [];
    while (true) {
      var op = null;
      if (['==', '!=', '<', '>', '<=', '>='].some(function (o) { return this.op(o); }, this)) op = this.next().v;
      else if (this.kw('in')) { this.next(); op = 'in'; }
      else if (this.kw('not') && this.is('KW', 'in', 1)) { this.next(); this.next(); op = 'not in'; }
      else if (this.kw('is')) { this.next(); op = 'is'; if (this.kw('not')) { this.next(); op = 'is not'; } }
      if (!op) break;
      ops.push(op); rest.push(this.bitor());
    }
    return ops.length ? { t: 'cmp', l: l, ops: ops, rest: rest } : l;
  };
  function binLevel(name, ops, nextName) {
    Parser.prototype[name] = function () {
      var l = this[nextName]();
      while (ops.some(function (o) { return this.op(o); }, this)) { var op = this.next().v; l = { t: 'bin', op: op, l: l, r: this[nextName]() }; }
      return l;
    };
  }
  binLevel('bitor', ['|'], 'bitxor');
  binLevel('bitxor', ['^'], 'bitand');
  binLevel('bitand', ['&'], 'arith');
  binLevel('arith', ['+', '-'], 'term');
  binLevel('term', ['*', '/', '//', '%', '@'], 'unary');
  Parser.prototype.unary = function () {
    if (this.op('-') || this.op('+') || this.op('~')) { var op = this.next().v; return { t: 'unary', op: op, e: this.unary() }; }
    return this.power();
  };
  Parser.prototype.power = function () {
    var b = this.postfix();
    if (this.op('**')) { this.next(); return { t: 'bin', op: '**', l: b, r: this.unary() }; }
    return b;
  };
  Parser.prototype.postfix = function () {
    var e = this.atom();
    while (true) {
      if (this.op('.')) { this.next(); e = { t: 'attr', obj: e, name: this.eat('NAME').v, line: this.peek().line }; }
      else if (this.op('(')) { this.next(); var a = this.args(); e = { t: 'call', fn: e, args: a.args, kw: a.kw, line: this.peek().line }; }
      else if (this.op('[')) { this.next(); var idx = this.subscript(); this.eat('OP', ']'); e = { t: 'sub', obj: e, index: idx }; }
      else break;
    }
    return e;
  };
  Parser.prototype.args = function () {
    var args = [], kw = [];
    while (!this.op(')')) {
      if (this.is('NAME') && this.is('OP', '=', 1)) { var k = this.next().v; this.next(); kw.push([k, this.expr()]); }
      else if (this.op('*') || this.op('**')) this.fail('*args and **kwargs are not supported in DotPython');
      else { if (kw.length) this.fail('positional argument follows keyword argument'); args.push(this.expr()); }
      if (this.op(',')) this.next(); else break;
    }
    this.eat('OP', ')');
    return { args: args, kw: kw };
  };
  Parser.prototype.subscript = function () {
    var self = this;
    function part() {
      var lo = null, hi = null, step = null;
      if (!self.op(':')) { lo = self.expr(); if (!self.op(':')) return lo; }
      self.next();
      if (!self.op(']') && !self.op(',') && !self.op(':')) hi = self.expr();
      if (self.op(':')) { self.next(); if (!self.op(']') && !self.op(',')) step = self.expr(); }
      return { t: 'slice', lo: lo, hi: hi, step: step };
    }
    var first = part();
    if (!this.op(',')) return first;
    var items = [first];
    while (this.op(',')) { this.next(); if (this.op(']')) break; items.push(part()); }
    return { t: 'tuple', items: items };
  };
  Parser.prototype.atom = function () {
    var tok = this.next();
    if (tok.t === 'NUM') return { t: 'num', v: Number(tok.v.replace(/_/g, '')), float: /[.eE]/.test(tok.v) };
    if (tok.t === 'STR' || tok.t === 'FSTR') {
      var parts = [tok.t === 'FSTR' ? fparts(tok.v, tok.line) : tok.v];
      while (this.is('STR') || this.is('FSTR')) { var t2 = this.next(); parts.push(t2.t === 'FSTR' ? fparts(t2.v, t2.line) : t2.v); }
      if (parts.every(function (p) { return typeof p === 'string'; })) return { t: 'str', v: parts.join('') };
      return { t: 'fstr', parts: parts.reduce(function (a, p) { return a.concat(typeof p === 'string' ? [p] : p.parts); }, []) };
    }
    if (tok.t === 'NAME') return { t: 'name', v: tok.v, line: tok.line };
    if (tok.t === 'KW') {
      if (tok.v === 'True') return { t: 'const', v: true };
      if (tok.v === 'False') return { t: 'const', v: false };
      if (tok.v === 'None') return { t: 'const', v: null };
      this.i--; this.fail(null, tok);
    }
    if (tok.t === 'OP' && tok.v === '(') {
      if (this.op(')')) { this.next(); return { t: 'tuple', items: [] }; }
      var e = this.expr();
      if (this.op(')')) { this.next(); return { t: 'paren', e: e }; }
      var items = [e];
      while (this.op(',')) { this.next(); if (this.op(')')) break; items.push(this.expr()); }
      this.eat('OP', ')');
      return { t: 'tuple', items: items };
    }
    if (tok.t === 'OP' && tok.v === '[') {
      var list = [];
      if (!this.op(']')) {
        var first = this.expr();
        if (this.kw('for')) {
          this.next(); var target = this.targetList(); this.eat('KW', 'in'); var it = this.or(), cond = null;
          if (this.kw('if')) { this.next(); cond = this.or(); }
          this.eat('OP', ']');
          return { t: 'listcomp', elt: first, target: target, iter: it, cond: cond };
        }
        list.push(first);
        while (this.op(',')) { this.next(); if (this.op(']')) break; list.push(this.expr()); }
      }
      this.eat('OP', ']');
      return { t: 'list', items: list };
    }
    if (tok.t === 'OP' && tok.v === '{') {
      var pairs = [];
      while (!this.op('}')) {
        var k = this.expr(); this.eat('OP', ':'); pairs.push([k, this.expr()]);
        if (this.op(',')) this.next(); else break;
      }
      this.eat('OP', '}');
      return { t: 'dict', pairs: pairs };
    }
    this.i--; this.fail(null, tok);
  };

  function fparts(s, line) {
    var parts = [], buf = '', i = 0;
    while (i < s.length) {
      if (s[i] === '{' && s[i + 1] === '{') { buf += '{'; i += 2; continue; }
      if (s[i] === '}' && s[i + 1] === '}') { buf += '}'; i += 2; continue; }
      if (s[i] === '{') {
        var depth = 1, j = i + 1;
        while (j < s.length && depth) { if (s[j] === '{') depth++; else if (s[j] === '}') depth--; j++; }
        var inner = s.slice(i + 1, j - 1), fmt = null, colon = inner.lastIndexOf(':');
        if (colon > 0 && !/[\]\)'"]/.test(inner.slice(colon))) { fmt = inner.slice(colon + 1); inner = inner.slice(0, colon); }
        if (buf) parts.push(buf); buf = '';
        var p = new Parser(tokenize(inner)); var ex = p.expr();
        parts.push({ t: 'fmt', e: ex, spec: fmt });
        i = j; continue;
      }
      buf += s[i]; i++;
    }
    if (buf) parts.push(buf);
    return { parts: parts, line: line };
  }

  P.parse = function (src) { return new Parser(tokenize(src)).program(); };

  function Builtin(name, fn) { this.name = name; this.fn = fn; }
  function Lambda(params, body, env) { this.params = params; this.body = body; this.env = env; }
  function Module(name, attrs) { this.name = name; this.attrs = attrs; }
  function Bound(obj, name, fn) { this.obj = obj; this.name = name; this.fn = fn; }
  function Accessor(kind, s) { this.kind = kind; this.s = s; }
  function Indexer(kind, df) { this.kind = kind; this.df = df; }
  function Rolling(s, n) { this.s = s; this.n = n; }
  function Index(items, name) { this.items = items; this.name = name; }
  P.Index = Index;

  function typeName(v) {
    if (v === null || v === undefined) return 'NoneType';
    if (typeof v === 'number') return Number.isInteger(v) ? 'int' : 'float';
    if (typeof v === 'string') return 'str';
    if (typeof v === 'boolean') return 'bool';
    if (Array.isArray(v)) return 'list';
    if (v instanceof Tuple) return 'tuple';
    if (v instanceof Dict) return 'dict';
    if (v instanceof DataFrame) return 'DataFrame';
    if (v instanceof Series) return 'Series';
    if (v instanceof GroupBy) return v.single ? 'SeriesGroupBy' : 'DataFrameGroupBy';
    if (v instanceof Index) return 'Index';
    if (v instanceof NdArray) return 'ndarray';
    if (v instanceof Module) return 'module';
    if (v instanceof Date) return 'Timestamp';
    if (v instanceof Builtin || v instanceof Lambda || v instanceof Bound) return 'function';
    return 'object';
  }
  P.typeName = typeName;

  function iso(d) { return d.toISOString().slice(0, 10); }
  function fmtNum(v) {
    if (typeof v === 'boolean') return v ? 'True' : 'False';
    if (isNaN(v)) return 'nan';
    if (!isFinite(v)) return v > 0 ? 'inf' : '-inf';
    if (Number.isInteger(v)) return String(v);
    var s = String(v);
    if (/e/.test(s)) return s.replace('e+', 'e+').replace(/e(-?)(\d)$/, 'e$10$2');
    return s;
  }
  function repr(v) {
    if (v === null || v === undefined) return 'None';
    if (typeof v === 'string') return "'" + v.replace(/\\/g, '\\\\').replace(/'/g, "\\'").replace(/\n/g, '\\n') + "'";
    if (typeof v === 'number' || typeof v === 'boolean') return fmtNum(v);
    if (Array.isArray(v)) return '[' + v.map(repr).join(', ') + ']';
    if (v instanceof Tuple) return '(' + v.items.map(repr).join(', ') + (v.items.length === 1 ? ',' : '') + ')';
    if (v instanceof Dict) return '{' + v.keys.map(function (k, i) { return repr(k) + ': ' + repr(v.vals[i]); }).join(', ') + '}';
    if (v instanceof Date) return "Timestamp('" + iso(v) + " 00:00:00')";
    if (v instanceof Index) return 'Index([' + v.items.map(repr).join(', ') + "], dtype='" + (v.items.every(function (x) { return typeof x === 'number'; }) ? 'int64' : 'object') + "')";
    if (v instanceof NdArray) return 'array([' + v.items.map(repr).join(', ') + ']' + (v.items.some(function (x) { return typeof x === 'string'; }) ? ', dtype=object' : '') + ')';
    if (v instanceof DataFrame) return frameText(v);
    if (v instanceof Series) return seriesText(v);
    if (v instanceof GroupBy) return '<pandas.core.groupby.generic.' + typeName(v) + ' object>';
    if (v instanceof Module) return "<module '" + v.name + "'>";
    if (v instanceof Builtin || v instanceof Bound) return '<built-in function ' + v.name + '>';
    if (v instanceof Lambda) return '<function <lambda>>';
    if (v instanceof Accessor) return '<pandas accessor .' + v.kind + '>';
    return String(v);
  }
  P.repr = repr;
  function str(v) {
    if (typeof v === 'string') return v;
    if (v instanceof Date) return iso(v) + ' 00:00:00';
    return repr(v);
  }
  P.str = str;

  function cellText(v) {
    if (isNa(v)) return 'NaN';
    if (v instanceof Date) return iso(v);
    if (v instanceof Tuple) return repr(v);
    if (typeof v === 'boolean') return v ? 'True' : 'False';
    return String(v);
  }
  function columnText(vals) {
    var floats = vals.some(function (v) { return typeof v === 'number' && !Number.isInteger(v) && !isNaN(v); }) || (vals.some(function (v) { return typeof v === 'number'; }) && vals.some(function (v) { return isNa(v); }) && vals.every(function (v) { return isNa(v) || typeof v === 'number'; }));
    if (!floats) return { text: vals.map(cellText), right: true };
    var dec = 1;
    vals.forEach(function (v) { if (typeof v === 'number' && isFinite(v)) { var s = String(Math.round(v * 1e6) / 1e6), k = s.indexOf('.'); if (k >= 0) dec = Math.max(dec, Math.min(6, s.length - k - 1)); } });
    return { text: vals.map(function (v) { return isNa(v) ? 'NaN' : typeof v === 'number' ? v.toFixed(dec) : cellText(v); }), right: true };
  }
  function layout(headers, columns, idxText, idxHeads) {
    var lines = [], widths = columns.map(function (c, j) { return Math.max(headers[j].length, c.text.reduce(function (a, t) { return Math.max(a, t.length); }, 0)); });
    var iw = Math.max(idxText.reduce(function (a, t) { return Math.max(a, t.length); }, 0), idxHeads ? idxHeads.length : 0);
    function pad(s, w, right) { s = String(s); while (s.length < w) s = right ? ' ' + s : s + ' '; return s; }
    lines.push(pad('', iw) + columns.map(function (c, j) { return '  ' + pad(headers[j], widths[j], true); }).join(''));
    if (idxHeads) lines.push(pad(idxHeads, iw) + columns.map(function (c, j) { return '  ' + pad('', widths[j]); }).join('').replace(/\s+$/, ''));
    for (var i = 0; i < idxText.length; i++) {
      lines.push(pad(idxText[i], iw) + columns.map(function (c, j) { return '  ' + pad(c.text[i], widths[j], c.right); }).join(''));
    }
    return lines.join('\n').replace(/[ \t]+$/gm, '');
  }
  function trimRows(n) { if (n <= 20) return null; var r = []; for (var i = 0; i < 5; i++) r.push(i); r.push(-1); for (var j = n - 5; j < n; j++) r.push(j); return r; }
  function frameText(df) {
    if (!df.cols.length) return 'Empty DataFrame\nColumns: []\nIndex: [' + df.index.map(cellText).join(', ') + ']';
    var n = df.nrows(), rows = trimRows(n) || df.index.map(function (_, i) { return i; });
    var cols = df.cols.map(function (c) { var t = columnText(rows.map(function (i) { return i < 0 ? '' : df.data[c][i]; })); t.text = t.text.map(function (x, k) { return rows[k] < 0 ? '...' : x; }); return t; });
    var idx = rows.map(function (i) { return i < 0 ? '...' : cellText(df.index[i]); });
    var named = df.indexNames.filter(function (x) { return x !== null; });
    var out = layout(df.cols.map(String), cols, idx, named.length ? named.join(', ') : null);
    if (n > 20) out += '\n\n[' + n + ' rows x ' + df.cols.length + ' columns]';
    return out;
  }
  function seriesText(s) {
    var n = s.values.length, rows = trimRows(n) || s.values.map(function (_, i) { return i; });
    var col = columnText(rows.map(function (i) { return i < 0 ? '' : s.values[i]; }));
    col.text = col.text.map(function (x, k) { return rows[k] < 0 ? '...' : x; });
    var idx = rows.map(function (i) { return i < 0 ? '...' : cellText(s.index[i]); });
    var iw = idx.reduce(function (a, t) { return Math.max(a, t.length); }, 0), vw = col.text.reduce(function (a, t) { return Math.max(a, t.length); }, 0);
    var lines = [];
    if (s.indexName) lines.push(s.indexName);
    idx.forEach(function (t, i) { var a = t; while (a.length < iw) a += ' '; var b = col.text[i]; while (b.length < vw) b = ' ' + b; lines.push(a + '    ' + b); });
    var foot = [];
    if (s.name !== null) foot.push('Name: ' + s.name);
    if (n > 20) foot.push('Length: ' + n);
    foot.push('dtype: ' + s.dtype());
    lines.push(foot.join(', '));
    return lines.join('\n');
  }

  function truthy(v) {
    if (v instanceof Series || v instanceof DataFrame) throw err('ValueError', 'The truth value of a ' + typeName(v) + ' is ambiguous. Use a.any() or a.all(), or combine conditions with & and | and put each one in brackets');
    if (v === null || v === undefined || v === false || v === 0 || v === '') return false;
    if (Array.isArray(v)) return v.length > 0;
    if (v instanceof Tuple) return v.items.length > 0;
    if (v instanceof Dict) return v.keys.length > 0;
    if (typeof v === 'number' && isNaN(v)) return true;
    return true;
  }
  function toList(v) {
    if (Array.isArray(v)) return v;
    if (v instanceof Tuple) return v.items;
    if (v instanceof Series) return v.values;
    if (v instanceof NdArray || v instanceof Index) return v.items;
    if (v instanceof Dict) return v.keys;
    if (typeof v === 'string') return v.split('');
    if (v instanceof DataFrame) return v.cols;
    throw err('TypeError', "'" + typeName(v) + "' object is not iterable");
  }
  function pyNum(v, what) {
    if (typeof v === 'number') return v;
    if (typeof v === 'boolean') return v ? 1 : 0;
    if (v === null || v === undefined) return NaN;
    throw err('TypeError', what || ('expected a number, got ' + typeName(v)));
  }

  function scalarOp(op, a, b) {
    if (op === '+' && typeof a === 'string' && typeof b === 'string') return a + b;
    if (op === '+' && Array.isArray(a) && Array.isArray(b)) return a.concat(b);
    if (op === '*' && typeof a === 'string' && typeof b === 'number') return new Array(Math.max(0, b) + 1).join(a);
    if (op === '*' && Array.isArray(a) && typeof b === 'number') { var out = []; for (var r = 0; r < b; r++) out = out.concat(a); return out; }
    if (op === '%' && typeof a === 'string') return a.replace(/%[sd]/, str(b instanceof Tuple ? b.items[0] : b));
    if (op === '&' || op === '|' || op === '^') {
      if (typeof a === 'boolean' && typeof b === 'boolean') return op === '&' ? a && b : op === '|' ? a || b : a !== b;
      return op === '&' ? pyNum(a) & pyNum(b) : op === '|' ? pyNum(a) | pyNum(b) : pyNum(a) ^ pyNum(b);
    }
    if (isNa(a) || isNa(b)) { if (typeof a === 'string' || typeof b === 'string') { } else return NaN; }
    if ((typeof a === 'string') !== (typeof b === 'string')) throw err('TypeError', "unsupported operand type(s) for " + op + ": '" + typeName(a) + "' and '" + typeName(b) + "'");
    if (typeof a === 'string') throw err('TypeError', "unsupported operand type(s) for " + op + ": 'str' and 'str'");
    var x = pyNum(a, "unsupported operand type(s) for " + op + ": '" + typeName(a) + "' and '" + typeName(b) + "'"), y = pyNum(b, "unsupported operand type(s) for " + op + ": '" + typeName(a) + "' and '" + typeName(b) + "'");
    switch (op) {
      case '+': return x + y;
      case '-': return x - y;
      case '*': return x * y;
      case '/': if (y === 0) { if (arguments[3]) return x === 0 ? NaN : x > 0 ? Infinity : -Infinity; throw err('ZeroDivisionError', 'division by zero'); } return x / y;
      case '//': if (y === 0) throw err('ZeroDivisionError', 'integer division or modulo by zero'); return Math.floor(x / y);
      case '%': if (y === 0) throw err('ZeroDivisionError', 'integer division or modulo by zero'); return ((x % y) + y) % y;
      case '**': return Math.pow(x, y);
    }
    throw err('TypeError', 'unsupported operator ' + op);
  }
  function compare(op, a, b) {
    if (op === 'in' || op === 'not in') {
      var has;
      if (typeof b === 'string') has = typeof a === 'string' && b.indexOf(a) >= 0;
      else if (b instanceof Dict) has = b.has(a);
      else if (b instanceof Series) has = b.index.some(function (x) { return P.eq(x, a); });
      else if (b instanceof DataFrame) has = b.cols.indexOf(a) >= 0;
      else has = toList(b).some(function (x) { return P.eq(x, a); });
      return op === 'in' ? has : !has;
    }
    if (op === 'is') return a === b || (a === null && b === undefined);
    if (op === 'is not') return !(a === b || (a === null && b === undefined));
    if (op === '==') return P.eq(a, b) || (a instanceof Date && b instanceof Date && +a === +b);
    if (op === '!=') return !(P.eq(a, b) || (a instanceof Date && b instanceof Date && +a === +b));
    if (isNa(a) || isNa(b)) return false;
    if (typeof a === 'string' && typeof b !== 'string' || typeof b === 'string' && typeof a !== 'string') {
      if (!(a instanceof Date) && !(b instanceof Date)) throw err('TypeError', "'" + op + "' not supported between instances of '" + typeName(a) + "' and '" + typeName(b) + "'");
    }
    var x = a instanceof Date ? +a : a, y = b instanceof Date ? +b : (a instanceof Date && typeof b === 'string' ? +P.parseDate(b) : b);
    if (b instanceof Date && typeof a === 'string') x = +P.parseDate(a);
    switch (op) { case '<': return x < y; case '>': return x > y; case '<=': return x <= y; case '>=': return x >= y; }
  }
  function elementwise(op, a, b, cmp) {
    var A = a instanceof Series ? a : null, B = b instanceof Series ? b : null, base = A || B;
    if (A && B && A.values.length !== B.values.length) throw err('ValueError', 'Can only compare or combine Series of the same length');
    var vals = base.values.map(function (_, i) {
      var x = A ? A.values[i] : a, y = B ? B.values[i] : b;
      if (cmp) { if ((isNa(x) || isNa(y)) && op !== '!=') return false; return compare(op, x, y); }
      if (op === '&' || op === '|') return op === '&' ? x === true && y === true : x === true || y === true;
      if (isNa(x) || isNa(y)) return (typeof x === 'string' || typeof y === 'string') && op === '+' ? NaN : NaN;
      return scalarOp(op, x, y, true);
    });
    var out = base.copy(vals);
    out.name = A && B ? (A.name === B.name ? A.name : null) : base.name;
    return out;
  }
  function binary(op, a, b) {
    if (a instanceof Series || b instanceof Series) return elementwise(op, a, b, false);
    if (a instanceof DataFrame || b instanceof DataFrame) throw err('TypeError', 'Do the arithmetic on columns, e.g. df["qty"] * df["unit_price"]');
    return scalarOp(op, a, b);
  }

  function kwarg(kw, name, def) { if (kw && kw.has(name)) return kw.get(name); return def; }
  function checkKw(fname, kw, allowed) {
    if (!kw) return;
    kw.keys.forEach(function (k) { if (allowed.indexOf(k) < 0) throw err('TypeError', fname + '() got an unexpected keyword argument ' + repr(k)); });
  }
  function arg(args, kw, i, name, def) { if (args.length > i) return args[i]; return kwarg(kw, name, def); }
  function strList(v) { return v === null || v === undefined ? null : Array.isArray(v) ? v : v instanceof Tuple ? v.items : [v]; }

  function call(fn, args, kw, ctx) {
    if (fn instanceof Builtin) return fn.fn(args, kw || new Dict(), ctx);
    if (fn instanceof Bound) return fn.fn(fn.obj, args, kw || new Dict(), ctx);
    if (fn instanceof Lambda) {
      if (args.length !== fn.params.length) throw err('TypeError', '<lambda>() takes ' + fn.params.length + ' positional argument' + (fn.params.length === 1 ? '' : 's') + ' but ' + args.length + ' were given');
      var env = Object.create(fn.env);
      fn.params.forEach(function (p, i) { env[p] = args[i]; });
      return evalExpr(fn.body, env, ctx);
    }
    throw err('TypeError', "'" + typeName(fn) + "' object is not callable");
  }
  P.call = call;

  function seriesNum(s, name) {
    if (s.dtype() === 'object') throw err('TypeError', 'cannot do ' + name + ' on a column of text (dtype object). Convert it first, e.g. pd.to_numeric(df["col"], errors="coerce")');
  }
  function aggSeries(name) {
    return function (s, args, kw) {
      if (['sum', 'mean', 'median', 'std'].indexOf(name) >= 0) seriesNum(s, name);
      return P.AGG[name](s.values);
    };
  }

  var SERIES = {
    sum: aggSeries('sum'), mean: aggSeries('mean'), median: aggSeries('median'), std: aggSeries('std'), min: aggSeries('min'), max: aggSeries('max'),
    count: aggSeries('count'), nunique: aggSeries('nunique'),
    unique: function (s) { var u = []; s.values.forEach(function (v) { if (!u.some(function (x) { return P.eq(x, v) || (isNa(x) && isNa(v)); })) u.push(v); }); return new NdArray(u); },
    value_counts: function (s, args, kw) {
      checkKw('value_counts', kw, ['normalize', 'ascending', 'dropna', 'sort']);
      var labels = [], counts = [];
      s.values.forEach(function (v) { if (isNa(v)) return; var i = -1; for (var k = 0; k < labels.length; k++) if (P.eq(labels[k], v)) { i = k; break; } if (i < 0) { labels.push(v); counts.push(1); } else counts[i]++; });
      var order = labels.map(function (_, i) { return i; }), asc = kwarg(kw, 'ascending', false);
      order.sort(function (a, b) { return (asc ? counts[a] - counts[b] : counts[b] - counts[a]) || a - b; });
      var total = counts.reduce(function (a, b) { return a + b; }, 0), norm = kwarg(kw, 'normalize', false);
      var out = new Series(order.map(function (i) { return norm ? counts[i] / total : counts[i]; }), order.map(function (i) { return labels[i]; }), norm ? 'proportion' : 'count');
      out.indexName = s.name;
      return out;
    },
    sort_values: function (s, args, kw) {
      checkKw('sort_values', kw, ['axis', 'ascending', 'na_position', 'kind']);
      var asc = arg(args, kw, 1, 'ascending', true);
      return s.take(P.sortOrder([s.values], [!!asc]));
    },
    sort_index: function (s, args, kw) { var asc = arg(args, kw, 0, 'ascending', true); return s.take(P.sortOrder([s.index], [!!asc])); },
    head: function (s, args, kw) { var n = arg(args, kw, 0, 'n', 5); return s.take(s.values.map(function (_, i) { return i; }).slice(0, Math.max(0, n))); },
    tail: function (s, args, kw) { var n = arg(args, kw, 0, 'n', 5), all = s.values.map(function (_, i) { return i; }); return s.take(all.slice(Math.max(0, all.length - n))); },
    nlargest: function (s, args, kw) { var n = arg(args, kw, 0, 'n', 5); return s.take(P.sortOrder([s.values], [false]).slice(0, n)); },
    nsmallest: function (s, args, kw) { var n = arg(args, kw, 0, 'n', 5); return s.take(P.sortOrder([s.values], [true]).slice(0, n)); },
    round: function (s, args, kw) { var d = arg(args, kw, 0, 'decimals', 0), k = Math.pow(10, d); return s.copy(s.values.map(function (v) { return typeof v === 'number' && !isNaN(v) ? Math.round(v * k + (v >= 0 ? 1e-9 : -1e-9)) / k : v; })); },
    abs: function (s) { return s.copy(s.values.map(function (v) { return typeof v === 'number' ? Math.abs(v) : v; })); },
    astype: function (s, args) {
      var t = args[0], name = t instanceof Builtin ? t.name : String(t);
      return s.copy(s.values.map(function (v) {
        if (isNa(v)) return name === 'str' ? 'nan' : v;
        if (name === 'int' || name === 'int64') { var n = Number(v); if (isNaN(n)) throw err('ValueError', 'invalid literal for int() with base 10: ' + repr(v)); return Math.trunc(n); }
        if (name === 'float' || name === 'float64') { var f = Number(v); if (isNaN(f)) throw err('ValueError', 'could not convert string to float: ' + repr(v)); return f; }
        if (name === 'str' || name === 'object') return str(v);
        if (name === 'bool') return truthy(v);
        throw err('TypeError', 'data type ' + repr(name) + ' not understood');
      }));
    },
    isna: function (s) { return s.copy(s.values.map(isNa)); },
    isnull: function (s) { return s.copy(s.values.map(isNa)); },
    notna: function (s) { return s.copy(s.values.map(function (v) { return !isNa(v); })); },
    notnull: function (s) { return s.copy(s.values.map(function (v) { return !isNa(v); })); },
    fillna: function (s, args, kw) { var v = arg(args, kw, 0, 'value'); return s.copy(s.values.map(function (x) { return isNa(x) ? v : x; })); },
    dropna: function (s) { var idx = []; s.values.forEach(function (v, i) { if (!isNa(v)) idx.push(i); }); return s.take(idx); },
    between: function (s, args) { return s.copy(s.values.map(function (v) { return !isNa(v) && compare('>=', v, args[0]) && compare('<=', v, args[1]); })); },
    isin: function (s, args) { var list = toList(args[0]); return s.copy(s.values.map(function (v) { return list.some(function (x) { return P.eq(x, v); }); })); },
    apply: function (s, args, kw, ctx) { return s.copy(s.values.map(function (v) { return call(args[0], [v], null, ctx); })); },
    map: function (s, args, kw, ctx) {
      var m = args[0];
      return s.copy(s.values.map(function (v) { if (m instanceof Dict) return m.has(v) ? m.get(v) : NaN; return call(m, [v], null, ctx); }));
    },
    replace: function (s, args) { return s.copy(s.values.map(function (v) { return P.eq(v, args[0]) ? args[1] : v; })); },
    shift: function (s, args, kw) { var n = arg(args, kw, 0, 'periods', 1); return s.copy(s.values.map(function (_, i) { var j = i - n; return j >= 0 && j < s.values.length ? s.values[j] : NaN; })); },
    diff: function (s, args, kw) { var n = arg(args, kw, 0, 'periods', 1); return s.copy(s.values.map(function (v, i) { var j = i - n; return j >= 0 && j < s.values.length ? v - s.values[j] : NaN; })); },
    pct_change: function (s) { return s.copy(s.values.map(function (v, i) { return i ? (v - s.values[i - 1]) / s.values[i - 1] : NaN; })); },
    cumsum: function (s) { var t = 0; return s.copy(s.values.map(function (v) { if (isNa(v)) return NaN; t += v; return t; })); },
    rolling: function (s, args, kw) { return new Rolling(s, arg(args, kw, 0, 'window')); },
    reset_index: function (s, args, kw) {
      var drop = kwarg(kw, 'drop', false);
      if (drop) return new Series(s.values.slice(), null, s.name);
      var nm = kwarg(kw, 'name', s.name === null ? 0 : s.name), data = {}, ix = s.indexName || 'index';
      data[ix] = s.index.slice(); data[nm] = s.values.slice();
      return new DataFrame([ix, nm], data);
    },
    to_frame: function (s, args, kw) { var nm = arg(args, kw, 0, 'name', s.name === null ? 0 : s.name), data = {}; data[nm] = s.values.slice(); var d = new DataFrame([nm], data, s.index.slice()); d.indexNames = [s.indexName]; return d; },
    tolist: function (s) { return s.values.slice(); },
    to_list: function (s) { return s.values.slice(); },
    idxmax: function (s) { var o = P.sortOrder([s.values], [false]); return s.index[o[0]]; },
    idxmin: function (s) { var o = P.sortOrder([s.values], [true]); return s.index[o[0]]; },
    any: function (s) { return s.values.some(function (v) { return v === true || (typeof v === 'number' && v !== 0); }); },
    all: function (s) { return s.values.every(function (v) { return v === true || (typeof v === 'number' && v !== 0); }); },
    rename: function (s, args) { var c = s.copy(); c.name = args[0]; return c; },
    copy: function (s) { return s.copy(); },
    quantile: function (s, args, kw) {
      var q = arg(args, kw, 0, 'q', 0.5), n = s.values.filter(function (v) { return typeof v === 'number' && !isNaN(v); }).sort(function (a, b) { return a - b; });
      if (!n.length) return NaN; var p = (n.length - 1) * q, lo = Math.floor(p), hi = Math.ceil(p); return n[lo] + (n[hi] - n[lo]) * (p - lo);
    },
    describe: function (s) {
      seriesNum(s, 'describe');
      var vals = s.values, q = SERIES.quantile;
      return new Series([P.AGG.count(vals), P.AGG.mean(vals), P.AGG.std(vals), P.AGG.min(vals), q(s, [0.25]), q(s, [0.5]), q(s, [0.75]), P.AGG.max(vals)], ['count', 'mean', 'std', 'min', '25%', '50%', '75%', 'max'], s.name);
    },
  };
  var SERIES_PROPS = {
    values: function (s) { return new NdArray(s.values.slice()); },
    index: function (s) { return new Index(s.index.slice(), s.indexName); },
    name: function (s) { return s.name; },
    dtype: function (s) { return s.dtype(); },
    size: function (s) { return s.values.length; },
    shape: function (s) { return new Tuple([s.values.length]); },
    str: function (s) { return new Accessor('str', s); },
    dt: function (s) { if (s.dtype() !== 'datetime64[ns]') throw err('AttributeError', 'Can only use .dt accessor with datetimelike values. Convert the column first: pd.to_datetime(df["order_date"])'); return new Accessor('dt', s); },
    empty: function (s) { return s.values.length === 0; },
  };

  function strMap(fn) { return function (a, args) { return a.s.copy(a.s.values.map(function (v) { return typeof v === 'string' ? fn(v, args) : isNa(v) ? NaN : fn(str(v), args); })); }; }
  var STR_ACC = {
    lower: strMap(function (v) { return v.toLowerCase(); }), upper: strMap(function (v) { return v.toUpperCase(); }),
    strip: strMap(function (v, a) { return a && a[0] ? trimChars(v, a[0]) : v.trim(); }), title: strMap(titleCase),
    len: strMap(function (v) { return v.length; }),
    contains: function (a, args, kw) {
      var pat = args[0], cs = kwarg(kw, 'case', true), re = kwarg(kw, 'regex', true);
      return a.s.copy(a.s.values.map(function (v) {
        if (isNa(v)) return false;
        var t = str(v);
        if (re) { try { return new RegExp(pat, cs ? '' : 'i').test(t); } catch (e) { throw err('ValueError', 'bad pattern ' + repr(pat)); } }
        return cs ? t.indexOf(pat) >= 0 : t.toLowerCase().indexOf(String(pat).toLowerCase()) >= 0;
      }));
    },
    startswith: function (a, args) { return a.s.copy(a.s.values.map(function (v) { return typeof v === 'string' && v.indexOf(args[0]) === 0; })); },
    endswith: function (a, args) { return a.s.copy(a.s.values.map(function (v) { return typeof v === 'string' && v.slice(-String(args[0]).length) === args[0]; })); },
    replace: strMap(function (v, a) { return v.split(a[0]).join(a[1]); }),
    slice: strMap(function (v, a) { return v.slice(a[0] || 0, a[1] === undefined || a[1] === null ? undefined : a[1]); }),
  };
  function trimChars(v, chars) { var re = new RegExp('^[' + chars.replace(/[\]\\^-]/g, '\\$&') + ']+|[' + chars.replace(/[\]\\^-]/g, '\\$&') + ']+$', 'g'); return v.replace(re, ''); }
  function titleCase(v) { return v.toLowerCase().replace(/(^|[^a-zà-ÿ])([a-zà-ÿ])/g, function (m, a, b) { return a + b.toUpperCase(); }); }
  var DAYS = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday'];
  function dtMap(fn) { return function (a) { return a.s.copy(a.s.values.map(function (d) { return d instanceof Date ? fn(d) : NaN; })); }; }
  var DT_PROPS = {
    year: dtMap(function (d) { return d.getUTCFullYear(); }), month: dtMap(function (d) { return d.getUTCMonth() + 1; }), day: dtMap(function (d) { return d.getUTCDate(); }),
    dayofweek: dtMap(function (d) { return (d.getUTCDay() + 6) % 7; }), quarter: dtMap(function (d) { return Math.floor(d.getUTCMonth() / 3) + 1; }),
  };
  var DT_ACC = {
    day_name: dtMap(function (d) { return DAYS[(d.getUTCDay() + 6) % 7]; }),
    strftime: function (a, args) {
      var f = args[0];
      return a.s.copy(a.s.values.map(function (d) {
        if (!(d instanceof Date)) return NaN;
        return f.replace(/%Y/g, d.getUTCFullYear()).replace(/%m/g, ('0' + (d.getUTCMonth() + 1)).slice(-2)).replace(/%d/g, ('0' + d.getUTCDate()).slice(-2)).replace(/%B/g, ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'][d.getUTCMonth()]).replace(/%A/g, DAYS[(d.getUTCDay() + 6) % 7]);
      }));
    },
    to_period: function (a, args) {
      var p = String(args[0] || 'M');
      return a.s.copy(a.s.values.map(function (d) { return d instanceof Date ? (p === 'Y' ? String(d.getUTCFullYear()) : d.toISOString().slice(0, 7)) : NaN; }));
    },
  };

  function frameAgg(name) {
    return function (df, args, kw) {
      var numeric = kwarg(kw, 'numeric_only', ['sum', 'mean', 'median', 'std'].indexOf(name) >= 0), cols = df.cols;
      if (numeric) cols = cols.filter(function (c) { var t = new Series(df.data[c]).dtype(); return t !== 'object' && t !== 'datetime64[ns]'; });
      return new Series(cols.map(function (c) { return P.AGG[name](df.data[c]); }), cols.slice(), null);
    };
  }
  function byCols(df, by) {
    var list = strList(by);
    if (!list) throw err('TypeError', 'missing the column to use: pass by="column" or a list of columns');
    list.forEach(function (c) { if (df.cols.indexOf(c) < 0) throw err('KeyError', repr(c)); });
    return list;
  }
  var FRAME = {
    head: function (df, args, kw) { var n = arg(args, kw, 0, 'n', 5); return df.take(df.index.map(function (_, i) { return i; }).slice(0, Math.max(0, n))); },
    tail: function (df, args, kw) { var n = arg(args, kw, 0, 'n', 5), all = df.index.map(function (_, i) { return i; }); return df.take(all.slice(Math.max(0, all.length - n))); },
    sort_values: function (df, args, kw) {
      checkKw('sort_values', kw, ['by', 'axis', 'ascending', 'na_position', 'kind', 'ignore_index']);
      var by = byCols(df, arg(args, kw, 0, 'by')), asc = arg(args, kw, 2, 'ascending', true);
      var ascList = Array.isArray(asc) ? asc : by.map(function () { return asc; });
      if (ascList.length !== by.length) throw err('ValueError', 'Length of ascending (' + ascList.length + ') != length of by (' + by.length + ')');
      var out = df.take(P.sortOrder(by.map(function (c) { return df.data[c]; }), ascList.map(Boolean)));
      return kwarg(kw, 'ignore_index', false) ? out.resetIndex(true) : out;
    },
    sort_index: function (df, args, kw) { var asc = kwarg(kw, 'ascending', true); return df.take(P.sortOrder([df.index], [!!asc])); },
    nlargest: function (df, args, kw) { var n = arg(args, kw, 0, 'n'), c = byCols(df, arg(args, kw, 1, 'columns')); return df.take(P.sortOrder(c.map(function (x) { return df.data[x]; }), c.map(function () { return false; })).slice(0, n)); },
    nsmallest: function (df, args, kw) { var n = arg(args, kw, 0, 'n'), c = byCols(df, arg(args, kw, 1, 'columns')); return df.take(P.sortOrder(c.map(function (x) { return df.data[x]; }), c.map(function () { return true; })).slice(0, n)); },
    groupby: function (df, args, kw) {
      checkKw('groupby', kw, ['by', 'as_index', 'sort', 'dropna']);
      var by = arg(args, kw, 0, 'by');
      if (by instanceof Series) {
        if (by.values.length !== df.nrows()) throw err('ValueError', 'Grouper and axis must be same length');
        var nm = by.name === null ? 'key' : by.name;
        df = df.copy(); df.setCol(nm, by); by = nm;
      }
      var g = new GroupBy(df, byCols(df, by));
      g.asIndex = kwarg(kw, 'as_index', true);
      return g;
    },
    merge: function (df, args, kw) { return merge(df, args[0], kw); },
    rename: function (df, args, kw) {
      var m = kwarg(kw, 'columns', args[0]);
      if (!(m instanceof Dict)) throw err('TypeError', 'use rename(columns={"old": "new"})');
      var out = df.copy(), data = {};
      out.cols = out.cols.map(function (c) { var n = m.has(c) ? m.get(c) : c; data[n] = out.data[c]; return n; });
      out.data = data;
      return out;
    },
    drop: function (df, args, kw) {
      var cols = strList(kwarg(kw, 'columns', args[0]));
      if (!cols) throw err('TypeError', 'use drop(columns=["col"])');
      cols.forEach(function (c) { if (df.cols.indexOf(c) < 0) throw err('KeyError', '"[' + repr(c) + '] not found in axis"'); });
      return df.select(df.cols.filter(function (c) { return cols.indexOf(c) < 0; }));
    },
    drop_duplicates: function (df, args, kw) {
      var sub = strList(arg(args, kw, 0, 'subset', null)) || df.cols, seen = [], idx = [];
      for (var i = 0; i < df.nrows(); i++) {
        var key = new Tuple(sub.map(function (c) { return df.data[c][i]; }));
        if (!seen.some(function (k) { return P.eq(k, key); })) { seen.push(key); idx.push(i); }
      }
      return df.take(idx);
    },
    dropna: function (df, args, kw) {
      var sub = strList(kwarg(kw, 'subset', null)) || df.cols, idx = [];
      for (var i = 0; i < df.nrows(); i++) if (sub.every(function (c) { return !isNa(df.data[c][i]); })) idx.push(i);
      return df.take(idx);
    },
    fillna: function (df, args, kw) {
      var v = arg(args, kw, 0, 'value'), out = df.copy();
      out.cols.forEach(function (c) { var fill = v instanceof Dict ? (v.has(c) ? v.get(c) : null) : v; if (fill === null) return; out.data[c] = out.data[c].map(function (x) { return isNa(x) ? fill : x; }); });
      return out;
    },
    isna: function (df) { var out = df.copy(); out.cols.forEach(function (c) { out.data[c] = out.data[c].map(isNa); }); return out; },
    isnull: function (df) { return FRAME.isna(df); },
    notna: function (df) { var out = df.copy(); out.cols.forEach(function (c) { out.data[c] = out.data[c].map(function (v) { return !isNa(v); }); }); return out; },
    sum: frameAgg('sum'), mean: frameAgg('mean'), median: frameAgg('median'), max: frameAgg('max'), min: frameAgg('min'), count: frameAgg('count'), nunique: frameAgg('nunique'), std: frameAgg('std'),
    reset_index: function (df, args, kw) { return df.resetIndex(kwarg(kw, 'drop', false)); },
    set_index: function (df, args) { var c = args[0]; var out = df.select(df.cols.filter(function (x) { return x !== c; })); out.index = df.data[c].slice(); out.indexNames = [c]; return out; },
    copy: function (df) { return df.copy(); },
    assign: function (df, args, kw, ctx) {
      var out = df.copy();
      kw.keys.forEach(function (k, i) { var v = kw.vals[i]; if (v instanceof Lambda || v instanceof Builtin) v = call(v, [out], null, ctx); out.setCol(k, v); });
      return out;
    },
    info: function (df, args, kw, ctx) {
      var lines = ["<class 'pandas.core.frame.DataFrame'>", 'RangeIndex: ' + df.nrows() + ' entries, 0 to ' + (df.nrows() - 1), 'Data columns (total ' + df.cols.length + ' columns):'];
      df.cols.forEach(function (c, i) { lines.push(' ' + i + '  ' + c + '  ' + P.AGG.count(df.data[c]) + ' non-null  ' + new Series(df.data[c]).dtype()); });
      ctx.out.push(lines.join('\n'));
      return null;
    },
    describe: function (df) {
      var cols = df.cols.filter(function (c) { var t = new Series(df.data[c]).dtype(); return t === 'int64' || t === 'float64'; }), data = {};
      cols.forEach(function (c) { data[c] = SERIES.describe(new Series(df.data[c], null, c)).values; });
      return new DataFrame(cols, data, ['count', 'mean', 'std', 'min', '25%', '50%', '75%', 'max']);
    },
    pivot_table: function (df, args, kw) {
      var index = byCols(df, kwarg(kw, 'index')), columns = kwarg(kw, 'columns', null), values = kwarg(kw, 'values'), fn = kwarg(kw, 'aggfunc', 'mean');
      if (typeof values !== 'string') throw err('TypeError', 'use values="column" with pivot_table');
      if (!columns) return new GroupBy(df, index, [values]).agg(fn);
      var g = new GroupBy(df, index.concat([columns]), values);
      g.single = true;
      var s = g.agg(fn), rows = [], colsV = [], data = {};
      s.index.forEach(function (t) { var r = t.items.length > 2 ? new Tuple(t.items.slice(0, -1)) : t.items[0], cv = t.items[t.items.length - 1]; if (!rows.some(function (x) { return P.eq(x, r); })) rows.push(r); if (colsV.indexOf(cv) < 0) colsV.push(cv); });
      colsV.sort(P.cmpVals);
      colsV.forEach(function (cv) { data[cv] = rows.map(function () { return NaN; }); });
      s.index.forEach(function (t, i) { var r = t.items.length > 2 ? new Tuple(t.items.slice(0, -1)) : t.items[0], cv = t.items[t.items.length - 1]; var ri = rows.findIndex(function (x) { return P.eq(x, r); }); data[cv][ri] = s.values[i]; });
      var out = new DataFrame(colsV, data, rows); out.indexNames = index.slice();
      return out;
    },
  };
  var FRAME_PROPS = {
    shape: function (df) { return new Tuple([df.nrows(), df.cols.length]); },
    columns: function (df) { return new Index(df.cols.slice(), null); },
    index: function (df) { return new Index(df.index.slice(), df.indexNames[0]); },
    dtypes: function (df) { return new Series(df.cols.map(function (c) { return new Series(df.data[c]).dtype(); }), df.cols.slice(), null); },
    size: function (df) { return df.nrows() * df.cols.length; },
    empty: function (df) { return df.nrows() === 0; },
    iloc: function (df) { return new Indexer('iloc', df); },
    loc: function (df) { return new Indexer('loc', df); },
    T: function () { throw err('AttributeError', 'transposing is not available in DotPython'); },
  };

  function merge(left, right, kw) {
    if (!(right instanceof DataFrame)) throw err('TypeError', 'merge() needs another DataFrame');
    checkKw('merge', kw, ['on', 'how', 'left_on', 'right_on', 'suffixes']);
    var how = kwarg(kw, 'how', 'inner'), on = strList(kwarg(kw, 'on', null));
    var lo = strList(kwarg(kw, 'left_on', null)) || on, ro = strList(kwarg(kw, 'right_on', null)) || on;
    if (!lo) { lo = left.cols.filter(function (c) { return right.cols.indexOf(c) >= 0; }); ro = lo; }
    if (!lo.length) throw err('MergeError', 'No common columns to perform merge on. Pass on="column"');
    lo.forEach(function (c) { if (left.cols.indexOf(c) < 0) throw err('KeyError', repr(c)); });
    ro.forEach(function (c) { if (right.cols.indexOf(c) < 0) throw err('KeyError', repr(c)); });
    if (['inner', 'left', 'right', 'outer'].indexOf(how) < 0) throw err('ValueError', 'how must be "inner", "left", "right" or "outer"');
    var sharedKeys = on ? on : [];
    var rCols = right.cols.filter(function (c) { return sharedKeys.indexOf(c) < 0; });
    var clash = rCols.filter(function (c) { return left.cols.indexOf(c) >= 0 && lo.indexOf(c) < 0; });
    var lName = function (c) { return clash.indexOf(c) >= 0 ? c + '_x' : c; }, rName = function (c) { return clash.indexOf(c) >= 0 ? c + '_y' : c; };
    var cols = left.cols.map(lName).concat(rCols.map(rName)), data = {};
    cols.forEach(function (c) { data[c] = []; });
    var used = right.index.map(function () { return false; });
    function keyOf(df, ks, i) { return new Tuple(ks.map(function (c) { return df.data[c][i]; })); }
    function pushRow(li, ri) {
      left.cols.forEach(function (c) { data[lName(c)].push(li === null ? (sharedKeys.indexOf(c) >= 0 && ri !== null ? right.data[c][ri] : NaN) : left.data[c][li]); });
      rCols.forEach(function (c) { data[rName(c)].push(ri === null ? NaN : right.data[c][ri]); });
    }
    for (var i = 0; i < left.nrows(); i++) {
      var k = keyOf(left, lo, i), hit = false;
      for (var j = 0; j < right.nrows(); j++) if (P.eq(keyOf(right, ro, j), k)) { pushRow(i, j); used[j] = true; hit = true; }
      if (!hit && (how === 'left' || how === 'outer')) pushRow(i, null);
    }
    if (how === 'right' || how === 'outer') for (var r = 0; r < right.nrows(); r++) if (!used[r]) pushRow(null, r);
    return new DataFrame(cols, data);
  }

  function own(tbl, name) { return Object.prototype.hasOwnProperty.call(tbl, name) ? tbl[name] : null; }
  function getattr(obj, name, ctx) {
    if (/^__/.test(name) || name === 'constructor' || name === 'prototype') throw err('AttributeError', "'" + typeName(obj) + "' object has no attribute '" + name + "'");
    if (obj instanceof Module) { if (own(obj.attrs, name) !== null || Object.prototype.hasOwnProperty.call(obj.attrs, name)) return obj.attrs[name]; throw err('AttributeError', "module '" + obj.name + "' has no attribute '" + name + "'"); }
    if (obj instanceof DataFrame) {
      if (own(FRAME_PROPS, name)) return own(FRAME_PROPS, name)(obj);
      if (own(FRAME, name)) return new Bound(obj, name, own(FRAME, name));
      if (obj.cols.indexOf(name) >= 0) return obj.col(name);
      if (own(SERIES, name) || name === 'str') throw err('AttributeError', "'DataFrame' object has no attribute '" + name + "'. Pick a column first, e.g. df[\"qty\"]." + name);
      throw err('AttributeError', "'DataFrame' object has no attribute '" + name + "'");
    }
    if (obj instanceof Series) {
      if (own(SERIES_PROPS, name)) return own(SERIES_PROPS, name)(obj);
      if (own(SERIES, name)) return new Bound(obj, name, own(SERIES, name));
      throw err('AttributeError', "'Series' object has no attribute '" + name + "'");
    }
    if (obj instanceof GroupBy) {
      if (name === 'agg' || name === 'aggregate') return new Bound(obj, name, function (g, args, kw) { return finishGroup(g, g.agg(args[0], kw)); });
      if (own(P.AGG, name)) return new Bound(obj, name, function (g, args, kw) { return finishGroup(g, g.apply(name, ['sum', 'mean', 'median', 'std'].indexOf(name) >= 0)); });
      if (obj.df.cols.indexOf(name) >= 0) return groupSel(obj, name);
      throw err('AttributeError', "'" + typeName(obj) + "' object has no attribute '" + name + "'");
    }
    if (obj instanceof Accessor) {
      var tbl = obj.kind === 'str' ? STR_ACC : DT_ACC;
      if (obj.kind === 'dt' && own(DT_PROPS, name)) return own(DT_PROPS, name)(obj);
      if (own(tbl, name)) return new Bound(obj, name, own(tbl, name));
      throw err('AttributeError', "'" + (obj.kind === 'str' ? 'StringMethods' : 'DatetimeProperties') + "' object has no attribute '" + name + "'");
    }
    if (obj instanceof Rolling) {
      if (name === 'mean' || name === 'sum') return new Bound(obj, name, function (r) {
        var v = r.s.values;
        return r.s.copy(v.map(function (_, i) { if (i < r.n - 1) return NaN; var w = v.slice(i - r.n + 1, i + 1), t = w.reduce(function (a, b) { return a + b; }, 0); return name === 'mean' ? t / r.n : t; }));
      });
      throw err('AttributeError', "'Rolling' object has no attribute '" + name + "'");
    }
    if (typeof obj === 'string' && own(STR, name)) return new Bound(obj, name, own(STR, name));
    if (Array.isArray(obj) && own(LIST, name)) return new Bound(obj, name, own(LIST, name));
    if (obj instanceof Dict && own(DICT, name)) return new Bound(obj, name, own(DICT, name));
    if ((obj instanceof Index || obj instanceof NdArray) && (name === 'tolist' || name === 'to_list')) return new Bound(obj, name, function (o) { return o.items.slice(); });
    if (obj instanceof NdArray && (name === 'sum' || name === 'mean' || name === 'max' || name === 'min')) return new Bound(obj, name, function (o) { return P.AGG[name](o.items); });
    if (obj instanceof Date && ({ year: 1, month: 1, day: 1 })[name]) return name === 'year' ? obj.getUTCFullYear() : name === 'month' ? obj.getUTCMonth() + 1 : obj.getUTCDate();
    throw err('AttributeError', "'" + typeName(obj) + "' object has no attribute '" + name + "'");
  }
  function groupSel(g, sel) {
    var cols = Array.isArray(sel) ? sel : [sel];
    cols.forEach(function (c) { if (g.df.cols.indexOf(c) < 0) throw err('KeyError', 'Column not found: ' + repr(c)); });
    var out = new GroupBy(g.df, g.keys, sel);
    out.asIndex = g.asIndex;
    return out;
  }
  function finishGroup(g, res) {
    if (g.asIndex === false) { if (res instanceof Series) { var d = res.to_frame ? null : null; return SERIES.reset_index(res, [], new Dict()); } return res.resetIndex(false); }
    return res;
  }

  var STR = {
    lower: function (s) { return s.toLowerCase(); }, upper: function (s) { return s.toUpperCase(); }, title: function (s) { return titleCase(s); },
    strip: function (s, a) { return a[0] ? trimChars(s, a[0]) : s.trim(); }, replace: function (s, a) { return s.split(a[0]).join(a[1]); },
    split: function (s, a) { return a[0] === undefined || a[0] === null ? s.trim().split(/\s+/) : s.split(a[0]); }, startswith: function (s, a) { return s.indexOf(a[0]) === 0; },
    endswith: function (s, a) { return s.slice(-a[0].length) === a[0]; }, join: function (s, a) { return toList(a[0]).map(str).join(s); },
    count: function (s, a) { return s.split(a[0]).length - 1; }, find: function (s, a) { return s.indexOf(a[0]); },
    format: function (s, a) { var i = 0; return s.replace(/\{\}/g, function () { return str(a[i++]); }); },
  };
  var LIST = {
    append: function (l, a) { l.push(a[0]); return null; }, extend: function (l, a) { toList(a[0]).forEach(function (x) { l.push(x); }); return null; },
    pop: function (l, a) { if (!l.length) throw err('IndexError', 'pop from empty list'); return a.length ? l.splice(a[0], 1)[0] : l.pop(); },
    index: function (l, a) { for (var i = 0; i < l.length; i++) if (P.eq(l[i], a[0])) return i; throw err('ValueError', repr(a[0]) + ' is not in list'); },
    count: function (l, a) { return l.filter(function (x) { return P.eq(x, a[0]); }).length; },
    sort: function (l, a, kw) { var rev = kwarg(kw, 'reverse', false); l.sort(P.cmpVals); if (rev) l.reverse(); return null; },
  };
  var DICT = {
    keys: function (d) { return d.keys.slice(); }, values: function (d) { return d.vals.slice(); },
    items: function (d) { return d.keys.map(function (k, i) { return new Tuple([k, d.vals[i]]); }); },
    get: function (d, a) { return d.has(a[0]) ? d.get(a[0]) : (a.length > 1 ? a[1] : null); },
  };

  function index(obj, key) {
    if (obj instanceof DataFrame) {
      if (typeof key === 'string' || typeof key === 'number') return obj.col(key);
      if (Array.isArray(key)) return obj.select(key);
      if (key instanceof Series) return obj.rowsWhere(key);
      if (key instanceof SliceVal) return obj.take(sliceIdx(obj.nrows(), key));
      throw err('KeyError', repr(key));
    }
    if (obj instanceof Series) {
      if (key instanceof Series) { if (key.values.length !== obj.values.length) throw err('ValueError', 'Item wrong length'); var idx = []; key.values.forEach(function (v, i) { if (v === true) idx.push(i); }); return obj.take(idx); }
      if (key instanceof SliceVal) return obj.take(sliceIdx(obj.values.length, key));
      return obj.at(key);
    }
    if (obj instanceof GroupBy) return groupSel(obj, key);
    if (obj instanceof Indexer) return indexer(obj, key);
    if (obj instanceof Dict) return obj.get(key);
    var list = obj instanceof Tuple ? obj.items : obj instanceof NdArray || obj instanceof Index ? obj.items : Array.isArray(obj) || typeof obj === 'string' ? obj : null;
    if (list === null) throw err('TypeError', "'" + typeName(obj) + "' object is not subscriptable");
    if (key instanceof SliceVal) { var ids = sliceIdx(list.length, key), part = ids.map(function (i) { return list[i]; }); return typeof obj === 'string' ? part.join('') : obj instanceof Tuple ? new Tuple(part) : part; }
    if (typeof key !== 'number') throw err('TypeError', 'indices must be integers');
    var k = key < 0 ? list.length + key : key;
    if (k < 0 || k >= list.length) throw err('IndexError', typeName(obj) + ' index out of range');
    return list[k];
  }
  function indexer(ix, key) {
    var df = ix.df;
    if (ix.kind === 'iloc') {
      if (typeof key === 'number') { var i = key < 0 ? df.nrows() + key : key; if (i < 0 || i >= df.nrows()) throw err('IndexError', 'single positional indexer is out-of-bounds'); return new Series(df.cols.map(function (c) { return df.data[c][i]; }), df.cols.slice(), df.index[i]); }
      if (key instanceof SliceVal) return df.take(sliceIdx(df.nrows(), key));
      throw err('TypeError', 'use df.iloc[row] or df.iloc[start:stop]');
    }
    var rows = key, cols = null;
    if (key instanceof Tuple) { rows = key.items[0]; cols = key.items[1]; }
    var part = rows instanceof Series ? df.rowsWhere(rows) : rows instanceof SliceVal && rows.lo === null && rows.hi === null ? df : null;
    if (!part) {
      var at = df.index.findIndex(function (x) { return P.eq(x, rows); });
      if (at < 0) throw err('KeyError', repr(rows));
      part = df.take([at]);
      if (cols === null) return new Series(df.cols.map(function (c) { return df.data[c][at]; }), df.cols.slice(), rows);
    }
    if (cols === null) return part;
    if (typeof cols === 'string') return part.col(cols);
    return part.select(toList(cols));
  }
  function SliceVal(lo, hi, step) { this.lo = lo; this.hi = hi; this.step = step; }
  function sliceIdx(n, s) {
    var step = s.step || 1, lo = s.lo, hi = s.hi;
    if (lo === null) lo = step > 0 ? 0 : n - 1; else if (lo < 0) lo += n;
    if (hi === null) hi = step > 0 ? n : -1; else if (hi < 0) hi += n;
    var out = [];
    if (step > 0) for (var i = Math.max(0, lo); i < Math.min(n, hi); i += step) out.push(i);
    else for (var j = Math.min(n - 1, lo); j > Math.max(-1, hi); j += step) out.push(j);
    return out;
  }

  function setItem(obj, key, value) {
    if (obj instanceof DataFrame) {
      if (typeof key !== 'string') throw err('TypeError', 'use df["new_column"] = ...');
      obj.setCol(key, value);
      return;
    }
    if (Array.isArray(obj)) { var k = key < 0 ? obj.length + key : key; if (k < 0 || k >= obj.length) throw err('IndexError', 'list assignment index out of range'); obj[k] = value; return; }
    if (obj instanceof Dict) { obj.set(key, value); return; }
    if (obj instanceof Series) { for (var i = 0; i < obj.index.length; i++) if (P.eq(obj.index[i], key)) { obj.values[i] = value; return; } throw err('KeyError', repr(key)); }
    throw err('TypeError', "'" + typeName(obj) + "' object does not support item assignment");
  }

  function evalExpr(node, env, ctx) {
    if (++ctx.steps > ctx.maxSteps) throw err('TimeoutError', 'the code ran too long (an endless loop?)');
    switch (node.t) {
      case 'num': return node.v;
      case 'str': return node.v;
      case 'const': return node.v;
      case 'paren': return evalExpr(node.e, env, ctx);
      case 'fstr': return node.parts.map(function (p) {
        if (typeof p === 'string') return p;
        var v = evalExpr(p.e, env, ctx);
        if (p.spec) {
          var m = /^([,_])?\.(\d+)([f%])$/.exec(p.spec) || /^(,)$/.exec(p.spec);
          if (m && m[3] === '%') return (pyNum(v) * 100).toFixed(+m[2]) + '%';
          if (m && m[3] === 'f') { var t = pyNum(v).toFixed(+m[2]); return m[1] === ',' ? t.replace(/\B(?=(\d{3})+(?!\d))/g, ',') : t; }
          if (m && m[1] === ',') return String(pyNum(v)).replace(/\B(?=(\d{3})+(?!\d))/g, ',');
        }
        return str(v);
      }).join('');
      case 'name':
        if (node.v in env) return env[node.v];
        throw err('NameError', "name '" + node.v + "' is not defined");
      case 'list': return node.items.map(function (e) { return evalExpr(e, env, ctx); });
      case 'tuple': return new Tuple(node.items.map(function (e) { return evalExpr(e, env, ctx); }));
      case 'dict': return new Dict(node.pairs.map(function (p) { return [evalExpr(p[0], env, ctx), evalExpr(p[1], env, ctx)]; }));
      case 'listcomp': {
        var out = [], inner = Object.create(env);
        toList(evalExpr(node.iter, env, ctx)).forEach(function (item) {
          assign(node.target, item, inner, ctx);
          if (!node.cond || truthy(evalExpr(node.cond, inner, ctx))) out.push(evalExpr(node.elt, inner, ctx));
        });
        return out;
      }
      case 'unary': {
        var v = evalExpr(node.e, env, ctx);
        if (node.op === '~') {
          if (v instanceof Series) return v.copy(v.values.map(function (x) { return !(x === true); }));
          return ~pyNum(v);
        }
        if (v instanceof Series) return v.copy(v.values.map(function (x) { return node.op === '-' ? -x : +x; }));
        return node.op === '-' ? -pyNum(v, "bad operand type for unary -: '" + typeName(v) + "'") : pyNum(v);
      }
      case 'bin': return binary(node.op, evalExpr(node.l, env, ctx), evalExpr(node.r, env, ctx));
      case 'bool': {
        var l = evalExpr(node.l, env, ctx);
        if (node.op === 'and') return truthy(l) ? evalExpr(node.r, env, ctx) : l;
        return truthy(l) ? l : evalExpr(node.r, env, ctx);
      }
      case 'not': return !truthy(evalExpr(node.e, env, ctx));
      case 'cmp': {
        var left = evalExpr(node.l, env, ctx), result = true;
        for (var i = 0; i < node.ops.length; i++) {
          var right = evalExpr(node.rest[i], env, ctx), op = node.ops[i];
          if (left instanceof Series || right instanceof Series) {
            if (node.ops.length > 1) throw err('ValueError', 'chained comparisons do not work on columns: write (s >= 1) & (s <= 3), or use s.between(1, 3)');
            if (op === 'in' || op === 'not in') throw err('ValueError', 'use s.isin([...]) to test a column against a list');
            return elementwise(op, left, right, true);
          }
          if (!compare(op, left, right)) { result = false; break; }
          left = right;
        }
        return result;
      }
      case 'ifexp': return truthy(evalExpr(node.cond, env, ctx)) ? evalExpr(node.a, env, ctx) : evalExpr(node.b, env, ctx);
      case 'lambda': return new Lambda(node.params, node.body, env);
      case 'attr': return getattr(evalExpr(node.obj, env, ctx), node.name, ctx);
      case 'call': {
        var fn = evalExpr(node.fn, env, ctx);
        var args = node.args.map(function (a) { return evalExpr(a, env, ctx); });
        var kw = new Dict(node.kw.map(function (p) { return [p[0], evalExpr(p[1], env, ctx)]; }));
        if (fn instanceof Series || fn instanceof Tuple || fn instanceof Index || typeof fn === 'number' || typeof fn === 'string') {
          var hint = node.fn.t === 'attr' ? " ('" + node.fn.name + "' is a property: drop the brackets, e.g. df." + node.fn.name + ')' : '';
          throw err('TypeError', "'" + typeName(fn) + "' object is not callable" + hint);
        }
        return call(fn, args, kw, ctx);
      }
      case 'sub': {
        var o = evalExpr(node.obj, env, ctx);
        var key = node.index.t === 'slice' ? new SliceVal(node.index.lo ? evalExpr(node.index.lo, env, ctx) : null, node.index.hi ? evalExpr(node.index.hi, env, ctx) : null, node.index.step ? evalExpr(node.index.step, env, ctx) : null)
          : node.index.t === 'tuple' ? new Tuple(node.index.items.map(function (x) { return x.t === 'slice' ? new SliceVal(x.lo ? evalExpr(x.lo, env, ctx) : null, x.hi ? evalExpr(x.hi, env, ctx) : null, null) : evalExpr(x, env, ctx); }))
          : evalExpr(node.index, env, ctx);
        if (key instanceof Tuple && !(o instanceof Indexer) && !(o instanceof Dict)) throw err('KeyError', 'use a list of columns: df[["a", "b"]] (two pairs of brackets)');
        return index(o, key);
      }
      case 'slice': throw err('SyntaxError', 'a slice only works inside [ ]');
    }
    throw err('SyntaxError', 'unsupported expression');
  }

  function assign(target, value, env, ctx) {
    if (target.t === 'name') { env[target.v] = value; return; }
    if (target.t === 'tuple') {
      var items = toList(value);
      if (items.length !== target.items.length) throw err('ValueError', (items.length > target.items.length ? 'too many' : 'not enough') + ' values to unpack (expected ' + target.items.length + ', got ' + items.length + ')');
      target.items.forEach(function (t, i) { assign(t, items[i], env, ctx); });
      return;
    }
    if (target.t === 'sub') { setItem(evalExpr(target.obj, env, ctx), evalExpr(target.index, env, ctx), value); return; }
    throw err('SyntaxError', 'cannot assign to this expression');
  }

  function BreakSignal() {}
  function ContinueSignal() {}
  function execBlock(stmts, env, ctx) {
    for (var i = 0; i < stmts.length; i++) {
      var s = stmts[i];
      ctx.line = s.line || ctx.line;
      if (++ctx.steps > ctx.maxSteps) throw err('TimeoutError', 'the code ran too long (an endless loop?)');
      switch (s.t) {
        case 'expr': {
          var v = evalExpr(s.e, env, ctx);
          ctx.last = v;
          break;
        }
        case 'assign': { var val = evalExpr(s.value, env, ctx); s.targets.forEach(function (t) { assign(t, val, env, ctx); }); ctx.last = undefined; break; }
        case 'aug': {
          var cur = evalExpr(s.target, env, ctx);
          assign(s.target.t === 'name' ? s.target : s.target, binary(s.op, cur, evalExpr(s.value, env, ctx)), env, ctx);
          ctx.last = undefined; break;
        }
        case 'if': {
          var done = false;
          for (var k = 0; k < s.tests.length; k++) if (truthy(evalExpr(s.tests[k][0], env, ctx))) { execBlock(s.tests[k][1], env, ctx); done = true; break; }
          if (!done && s.orelse) execBlock(s.orelse, env, ctx);
          ctx.last = undefined; break;
        }
        case 'for': {
          var items = toList(evalExpr(s.iter, env, ctx)).slice();
          try {
            for (var j = 0; j < items.length; j++) {
              assign(s.target, items[j], env, ctx);
              try { execBlock(s.body, env, ctx); } catch (e) { if (e instanceof ContinueSignal) continue; throw e; }
            }
          } catch (e2) { if (!(e2 instanceof BreakSignal)) throw e2; }
          ctx.last = undefined; break;
        }
        case 'while': {
          try {
            while (truthy(evalExpr(s.cond, env, ctx))) {
              try { execBlock(s.body, env, ctx); } catch (e3) { if (e3 instanceof ContinueSignal) continue; throw e3; }
            }
          } catch (e4) { if (!(e4 instanceof BreakSignal)) throw e4; }
          ctx.last = undefined; break;
        }
        case 'break': throw new BreakSignal();
        case 'continue': throw new ContinueSignal();
        case 'import': {
          if (s.name === 'pandas') env[s.as] = env.__pandas__;
          else if (s.name === 'numpy') throw err('ModuleNotFoundError', "No module named 'numpy' in DotPython: use pandas (pd) for this course");
          else throw err('ModuleNotFoundError', "No module named '" + s.name + "'");
          ctx.last = undefined; break;
        }
        case 'pass': break;
      }
    }
  }

  function makePandas() {
    return new Module('pandas', {
      read_csv: new Builtin('read_csv', function (args) { return P.readFile(args[0]); }),
      DataFrame: new Builtin('DataFrame', function (args) {
        var d = args[0];
        if (d instanceof Dict) { var data = {}; d.keys.forEach(function (k, i) { data[k] = toList(d.vals[i]).slice(); }); return new DataFrame(d.keys.slice(), data); }
        if (Array.isArray(d) && d.every(function (x) { return x instanceof Dict; })) {
          var cols = []; d.forEach(function (r) { r.keys.forEach(function (k) { if (cols.indexOf(k) < 0) cols.push(k); }); });
          var dd = {}; cols.forEach(function (c) { dd[c] = d.map(function (r) { return r.has(c) ? r.get(c) : NaN; }); });
          return new DataFrame(cols, dd);
        }
        throw err('TypeError', 'pd.DataFrame needs a dict of lists, like {"a": [1, 2]}');
      }),
      Series: new Builtin('Series', function (args, kw) { return new Series(toList(args[0]).slice(), null, kwarg(kw, 'name', null)); }),
      merge: new Builtin('merge', function (args, kw) { return merge(args[0], args[1], kw); }),
      concat: new Builtin('concat', function (args) {
        var parts = toList(args[0]), cols = [];
        parts.forEach(function (p) { p.cols.forEach(function (c) { if (cols.indexOf(c) < 0) cols.push(c); }); });
        var data = {}; cols.forEach(function (c) { data[c] = []; });
        parts.forEach(function (p) { cols.forEach(function (c) { var v = p.cols.indexOf(c) >= 0 ? p.data[c] : p.index.map(function () { return NaN; }); data[c] = data[c].concat(v); }); });
        var idx = []; parts.forEach(function (p) { idx = idx.concat(p.index); });
        return new DataFrame(cols, data, idx);
      }),
      to_datetime: new Builtin('to_datetime', function (args, kw) {
        var x = args[0], coerce = kwarg(kw, 'errors', 'raise') === 'coerce';
        function conv(v) { try { return P.parseDate(v); } catch (e) { if (coerce) return null; throw e; } }
        if (x instanceof Series) return x.copy(x.values.map(conv));
        return conv(x);
      }),
      to_numeric: new Builtin('to_numeric', function (args, kw) {
        var x = args[0], coerce = kwarg(kw, 'errors', 'raise') === 'coerce';
        function conv(v) { if (typeof v === 'number' || isNa(v)) return isNa(v) ? NaN : v; var n = Number(String(v).trim()); if (String(v).trim() !== '' && !isNaN(n)) return n; if (coerce) return NaN; throw err('ValueError', 'Unable to parse string ' + repr(v)); }
        if (x instanceof Series) return x.copy(x.values.map(conv));
        return conv(x);
      }),
      isna: new Builtin('isna', function (args) { return isNa(args[0]); }),
      NA: null,
    });
  }

  function builtins(ctx) {
    var B = {};
    function def(name, fn) { B[name] = new Builtin(name, fn); }
    def('print', function (args, kw) { var sep = kwarg(kw, 'sep', ' '), end = kwarg(kw, 'end', '\n'); ctx.out.push(args.map(str).join(sep) + (end === '\n' ? '' : end)); return null; });
    def('len', function (args) {
      var v = args[0];
      if (v instanceof DataFrame) return v.nrows();
      if (v instanceof Series) return v.values.length;
      if (v instanceof Dict) return v.keys.length;
      return toList(v).length;
    });
    def('round', function (args) {
      var v = args[0], d = args.length > 1 ? args[1] : null;
      if (v instanceof Series) return SERIES.round(v, [d || 0], new Dict());
      var k = Math.pow(10, d || 0), x = pyNum(v), r = Math.round(x * k), diff = Math.abs(x * k - Math.trunc(x * k));
      if (Math.abs(diff - 0.5) < 1e-9) r = 2 * Math.round(x * k / 2);
      return r / k;
    });
    def('sum', function (args) { return toList(args[0]).reduce(function (a, b) { return a + pyNum(b); }, args[1] || 0); });
    def('min', function (args) { var l = args.length > 1 ? args : toList(args[0]); if (!l.length) throw err('ValueError', 'min() arg is an empty sequence'); return l.reduce(function (a, b) { return P.cmpVals(b, a) < 0 ? b : a; }); });
    def('max', function (args) { var l = args.length > 1 ? args : toList(args[0]); if (!l.length) throw err('ValueError', 'max() arg is an empty sequence'); return l.reduce(function (a, b) { return P.cmpVals(b, a) > 0 ? b : a; }); });
    def('abs', function (args) { return Math.abs(pyNum(args[0])); });
    def('sorted', function (args, kw) { var l = toList(args[0]).slice().sort(P.cmpVals); if (kwarg(kw, 'reverse', false)) l.reverse(); return l; });
    def('list', function (args) { return args.length ? toList(args[0]).slice() : []; });
    def('tuple', function (args) { return new Tuple(args.length ? toList(args[0]).slice() : []); });
    def('dict', function (args, kw) { return new Dict(kw.keys.map(function (k, i) { return [k, kw.vals[i]]; })); });
    def('set', function (args) { var out = []; toList(args[0] || []).forEach(function (v) { if (!out.some(function (x) { return P.eq(x, v); })) out.push(v); }); return out; });
    def('str', function (args) { return args.length ? str(args[0]) : ''; });
    def('int', function (args) { var v = args[0]; if (typeof v === 'string') { if (!/^\s*-?\d+\s*$/.test(v)) throw err('ValueError', 'invalid literal for int() with base 10: ' + repr(v)); return parseInt(v, 10); } return Math.trunc(pyNum(v)); });
    def('float', function (args) { var v = args[0]; if (typeof v === 'string') { var n = Number(v.trim()); if (v.trim() === '' || isNaN(n)) { if (/^\s*nan\s*$/i.test(v)) return NaN; throw err('ValueError', 'could not convert string to float: ' + repr(v)); } return n; } return pyNum(v); });
    def('bool', function (args) { return truthy(args[0]); });
    def('range', function (args) {
      var a = args.length > 1 ? args[0] : 0, b = args.length > 1 ? args[1] : args[0], st = args[2] || 1, out = [];
      if (Math.abs((b - a) / st) > 100000) throw err('ValueError', 'range too large for DotPython');
      for (var i = a; st > 0 ? i < b : i > b; i += st) out.push(i);
      return out;
    });
    def('enumerate', function (args) { return toList(args[0]).map(function (v, i) { return new Tuple([i + (args[1] || 0), v]); }); });
    def('zip', function (args) { var ls = args.map(toList), n = Math.min.apply(null, ls.map(function (l) { return l.length; })), out = []; for (var i = 0; i < n; i++) out.push(new Tuple(ls.map(function (l) { return l[i]; }))); return out; });
    def('type', function (args) { return "<class '" + typeName(args[0]) + "'>"; });
    def('isinstance', function () { throw err('NotImplementedError', 'isinstance is not available in DotPython'); });
    return B;
  }

  P.loadData = function () {
    return { df: P.readFile('orders.csv'), customers: P.readFile('customers.csv'), stores: P.readFile('stores.csv'), messy: P.readFile('messy_orders.csv') };
  };

  P.run = function (code, opts) {
    opts = opts || {};
    var ctx = { out: [], steps: 0, maxSteps: opts.maxSteps || 200000, line: 0, last: undefined };
    var pd = makePandas();
    var env = Object.create(null);
    var B = builtins(ctx);
    Object.keys(B).forEach(function (k) { env[k] = B[k]; });
    env.__pandas__ = pd;
    env.pd = pd;
    var data = opts.data || P.loadData();
    Object.keys(data).forEach(function (k) { env[k] = data[k] instanceof DataFrame ? data[k].copy() : data[k]; });
    var tree;
    try { tree = P.parse(String(code).replace(/\r\n?/g, '\n')); }
    catch (e) { if (e instanceof PyError) return { ok: false, error: e.type + ': ' + e.message, line: e.line, output: '', env: env }; throw e; }
    try {
      execBlock(tree, env, ctx);
      if (opts.echo && ctx.last !== undefined && ctx.last !== null) ctx.out.push(repr(ctx.last));
      return { ok: true, output: ctx.out.join('\n'), env: env, last: ctx.last };
    } catch (e) {
      if (e instanceof BreakSignal || e instanceof ContinueSignal) return { ok: false, error: "SyntaxError: 'break' outside loop", line: ctx.line, output: ctx.out.join('\n'), env: env };
      if (e instanceof PyError) return { ok: false, error: e.type + ': ' + e.message, line: ctx.line, output: ctx.out.join('\n'), env: env };
      if (e instanceof RangeError) return { ok: false, error: 'RecursionError: the expression is nested too deeply', line: ctx.line, output: ctx.out.join('\n'), env: env };
      throw e;
    }
  };

  P.execute = function (code) { return P.run(code, { echo: true }); };

  function rowsOf(v) {
    function idxParts(lab) { return lab instanceof Tuple ? lab.items : [lab]; }
    if (v instanceof DataFrame) {
      var keep = !v.defaultIndex();
      return v.index.map(function (lab, i) { return (keep ? idxParts(lab) : []).concat(v.cols.map(function (c) { return v.data[c][i]; })); });
    }
    if (v instanceof Series) { var k2 = !v.defaultIndex(); return v.values.map(function (x, i) { return (k2 ? idxParts(v.index[i]) : []).concat([x]); }); }
    if (Array.isArray(v) || v instanceof NdArray || v instanceof Index) return toList(v).map(function (x) { return [x]; });
    if (v instanceof Tuple) return [v.items.slice()];
    return [[v]];
  }
  function sameCell(a, b) {
    if (isNa(a) && isNa(b)) return true;
    if (a instanceof Date || b instanceof Date) return a instanceof Date && b instanceof Date && +a === +b;
    if (typeof a === 'boolean' || typeof b === 'boolean') return a === b || (typeof a === 'number' && +b === a) || (typeof b === 'number' && +a === b);
    if (typeof a === 'number' && typeof b === 'number') return Math.abs(a - b) <= 1e-6 * Math.max(1, Math.abs(b));
    return a === b;
  }
  function key(row) { return row.map(function (x) { return x instanceof Date ? x.toISOString() : isNa(x) ? 'NaN' : typeof x === 'number' ? String(Math.round(x * 1e6) / 1e6) : String(x); }).join('\u0001'); }
  P.compareResult = function (got, want, ordered) {
    if (got === undefined) return { ok: false, message: 'There is no variable called result. Finish with result = ... (your answer).' };
    var A = rowsOf(got), B = rowsOf(want);
    var kindG = typeName(got), kindW = typeName(want);
    if (A.length !== B.length) return { ok: false, message: 'Your result has ' + A.length + ' row' + (A.length === 1 ? '' : 's') + ' (' + kindG + '); the answer has ' + B.length + '. Check your filter or grouping.' };
    if (A.length && A[0].length !== B[0].length) return { ok: false, message: 'Your result has ' + A[0].length + ' column(s) of values; the answer has ' + B[0].length + '. Check which columns you kept (and whether the group names are the index).' };
    if (!ordered) { A = A.slice().sort(function (x, y) { return key(x) < key(y) ? -1 : key(x) > key(y) ? 1 : 0; }); B = B.slice().sort(function (x, y) { return key(x) < key(y) ? -1 : key(x) > key(y) ? 1 : 0; }); }
    for (var i = 0; i < A.length; i++) for (var j = 0; j < A[i].length; j++) {
      if (!sameCell(A[i][j], B[i][j])) return { ok: false, message: 'The shape is right, but some values differ' + (ordered ? ' (or the order is different: sort as the task asks)' : '') + '. Example: row ' + (i + 1) + ' has ' + repr(A[i][j]) + ', which is not what the task asks for.' };
    }
    return { ok: true, message: 'Correct! Your result matches the answer (' + B.length + ' row' + (B.length === 1 ? '' : 's') + ').' };
  };
})();
