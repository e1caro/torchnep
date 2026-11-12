/* DotPython pandas subset: Series, DataFrame, GroupBy and read_csv with the same names and arguments as real pandas. */
(function () {
  'use strict';
  var DA = (window.DA = window.DA || {});
  var P = (DA.python = DA.python || {});

  function PyError(type, msg) { this.type = type; this.message = msg; }
  PyError.prototype.toString = function () { return this.type + ': ' + this.message; };
  P.PyError = PyError;
  function err(type, msg) { return new PyError(type, msg); }

  function Tuple(items) { this.items = items; }
  P.Tuple = Tuple;
  function Dict(pairs) { this.keys = []; this.vals = []; var self = this; (pairs || []).forEach(function (p) { self.set(p[0], p[1]); }); }
  Dict.prototype.find = function (k) { for (var i = 0; i < this.keys.length; i++) if (P.eq(this.keys[i], k)) return i; return -1; };
  Dict.prototype.get = function (k) { var i = this.find(k); if (i < 0) throw err('KeyError', P.repr(k)); return this.vals[i]; };
  Dict.prototype.has = function (k) { return this.find(k) >= 0; };
  Dict.prototype.set = function (k, v) { var i = this.find(k); if (i < 0) { this.keys.push(k); this.vals.push(v); } else this.vals[i] = v; };
  P.Dict = Dict;

  function isNa(v) { return v === null || v === undefined || (typeof v === 'number' && isNaN(v)); }
  P.isNa = isNa;
  P.eq = function (a, b) {
    if (a instanceof Tuple && b instanceof Tuple) return a.items.length === b.items.length && a.items.every(function (x, i) { return P.eq(x, b.items[i]); });
    return a === b;
  };
  function num(v) { return typeof v === 'number' || typeof v === 'boolean'; }
  function isInt(v) { return typeof v === 'number' && isFinite(v) && Math.floor(v) === v; }

  function dtypeOf(vals) {
    var seen = vals.filter(function (v) { return !isNa(v); });
    if (!seen.length) return 'float64';
    if (seen.every(function (v) { return typeof v === 'boolean'; })) return 'bool';
    if (seen.every(function (v) { return v instanceof Date; })) return 'datetime64[ns]';
    if (seen.every(function (v) { return typeof v === 'number'; })) return seen.every(isInt) && seen.length === vals.length ? 'int64' : 'float64';
    return 'object';
  }

  function Series(values, index, name) {
    this.values = values;
    this.index = index || values.map(function (_, i) { return i; });
    this.name = name === undefined ? null : name;
    this.indexName = null;
  }
  P.Series = Series;
  Series.prototype.dtype = function () { return dtypeOf(this.values); };
  Series.prototype.defaultIndex = function () { for (var i = 0; i < this.index.length; i++) if (this.index[i] !== i) return false; return true; };
  Series.prototype.copy = function (values, index) { var s = new Series(values || this.values.slice(), index || this.index.slice(), this.name); s.indexName = this.indexName; return s; };
  Series.prototype.at = function (label) {
    for (var i = 0; i < this.index.length; i++) if (P.eq(this.index[i], label)) return this.values[i];
    throw err('KeyError', P.repr(label));
  };
  Series.prototype.take = function (idx) { var s = this; var out = new Series(idx.map(function (i) { return s.values[i]; }), idx.map(function (i) { return s.index[i]; }), this.name); out.indexName = this.indexName; return out; };

  function nums(vals) { return vals.filter(function (v) { return !isNa(v) && num(v); }).map(Number); }
  function sum(vals) { var t = 0; nums(vals).forEach(function (v) { t += v; }); return t; }
  function mean(vals) { var n = nums(vals); return n.length ? sum(n) / n.length : NaN; }
  function median(vals) { var n = nums(vals).sort(function (a, b) { return a - b; }); if (!n.length) return NaN; var m = Math.floor(n.length / 2); return n.length % 2 ? n[m] : (n[m - 1] + n[m]) / 2; }
  function std(vals) { var n = nums(vals); if (n.length < 2) return NaN; var m = mean(n), t = 0; n.forEach(function (v) { t += (v - m) * (v - m); }); return Math.sqrt(t / (n.length - 1)); }
  function present(vals) { return vals.filter(function (v) { return !isNa(v); }); }
  function cmpVals(a, b) {
    if (isNa(a) && isNa(b)) return 0;
    if (isNa(a)) return 1;
    if (isNa(b)) return -1;
    if (a instanceof Date && b instanceof Date) return a - b;
    if (typeof a === typeof b) return a < b ? -1 : a > b ? 1 : 0;
    return String(a) < String(b) ? -1 : 1;
  }
  P.cmpVals = cmpVals;
  function minv(vals) { var p = present(vals); if (!p.length) return NaN; return p.reduce(function (a, b) { return cmpVals(a, b) <= 0 ? a : b; }); }
  function maxv(vals) { var p = present(vals); if (!p.length) return NaN; return p.reduce(function (a, b) { return cmpVals(a, b) >= 0 ? a : b; }); }
  function uniq(vals) { var out = []; vals.forEach(function (v) { if (!out.some(function (x) { return P.eq(x, v) || (isNa(x) && isNa(v)); })) out.push(v); }); return out; }
  P.AGG = {
    sum: sum, mean: mean, median: median, std: std, min: minv, max: maxv,
    count: function (v) { return present(v).length; }, size: function (v) { return v.length; },
    nunique: function (v) { return uniq(present(v)).length; }, first: function (v) { return v[0]; }, last: function (v) { return v[v.length - 1]; },
  };

  function NdArray(items) { this.items = items; }
  P.NdArray = NdArray;

  P.sortOrder = function (keyCols, asc) {
    var n = keyCols[0].length, idx = [];
    for (var i = 0; i < n; i++) idx.push(i);
    idx.sort(function (a, b) {
      for (var k = 0; k < keyCols.length; k++) {
        var x = keyCols[k][a], y = keyCols[k][b], up = asc[k];
        if (isNa(x) || isNa(y)) { if (isNa(x) && isNa(y)) continue; return isNa(x) ? 1 : -1; }
        var c = cmpVals(x, y);
        if (c) return up ? c : -c;
      }
      return a - b;
    });
    return idx;
  };

  function DataFrame(cols, data, index) {
    this.cols = cols;
    this.data = data;
    var n = cols.length ? data[cols[0]].length : (index ? index.length : 0);
    this.index = index || Array.from({ length: n }, function (_, i) { return i; });
    this.indexNames = [null];
  }
  P.DataFrame = DataFrame;
  DataFrame.prototype.nrows = function () { return this.index.length; };
  DataFrame.prototype.defaultIndex = function () { for (var i = 0; i < this.index.length; i++) if (this.index[i] !== i) return false; return true; };
  DataFrame.prototype.col = function (name) {
    if (this.cols.indexOf(name) < 0) throw err('KeyError', P.repr(name));
    var s = new Series(this.data[name].slice(), this.index.slice(), name);
    s.indexName = this.indexNames.length === 1 ? this.indexNames[0] : null;
    return s;
  };
  DataFrame.prototype.take = function (idx) {
    var self = this, data = {};
    this.cols.forEach(function (c) { data[c] = idx.map(function (i) { return self.data[c][i]; }); });
    var out = new DataFrame(this.cols.slice(), data, idx.map(function (i) { return self.index[i]; }));
    out.indexNames = this.indexNames.slice();
    return out;
  };
  DataFrame.prototype.select = function (names) {
    var self = this, data = {};
    names.forEach(function (c) { if (self.cols.indexOf(c) < 0) throw err('KeyError', '"None of [' + P.repr(c) + '] are in the columns"'); data[c] = self.data[c].slice(); });
    var out = new DataFrame(names.slice(), data, this.index.slice());
    out.indexNames = this.indexNames.slice();
    return out;
  };
  DataFrame.prototype.copy = function () { return this.select(this.cols); };
  DataFrame.prototype.setCol = function (name, value) {
    var n = this.nrows(), vals;
    if (value instanceof Series) {
      if (value.values.length !== n) throw err('ValueError', 'Length of values (' + value.values.length + ') does not match length of index (' + n + ')');
      vals = value.values.slice();
    } else if (Array.isArray(value)) {
      if (value.length !== n) throw err('ValueError', 'Length of values (' + value.length + ') does not match length of index (' + n + ')');
      vals = value.slice();
    } else vals = Array.from({ length: n }, function () { return value; });
    if (this.cols.indexOf(name) < 0) this.cols.push(name);
    this.data[name] = vals;
  };
  DataFrame.prototype.rowsWhere = function (mask) {
    if (!(mask instanceof Series) || mask.values.length !== this.nrows()) throw err('ValueError', 'Item wrong length: use a condition on a column of this DataFrame, like df["qty"] > 2');
    var idx = [];
    mask.values.forEach(function (v, i) { if (v === true) idx.push(i); });
    return this.take(idx);
  };
  DataFrame.prototype.resetIndex = function (drop) {
    if (drop) { var d = this.copy(); d.index = d.index.map(function (_, i) { return i; }); d.indexNames = [null]; return d; }
    var self = this, names = this.indexNames.map(function (n, i) { return n === null ? (self.indexNames.length === 1 ? 'index' : 'level_' + i) : n; });
    var data = {}, cols = names.concat(this.cols);
    names.forEach(function (n, k) { data[n] = self.index.map(function (lab) { return lab instanceof Tuple ? lab.items[k] : lab; }); });
    this.cols.forEach(function (c) { data[c] = self.data[c].slice(); });
    return new DataFrame(cols, data);
  };

  function GroupBy(df, keys, sel) { this.df = df; this.keys = keys; this.sel = sel || null; this.single = !!sel && !Array.isArray(sel); }
  P.GroupBy = GroupBy;
  GroupBy.prototype.groups = function () {
    var df = this.df, keys = this.keys, map = [], labels = [];
    for (var i = 0; i < df.nrows(); i++) {
      var parts = keys.map(function (k) { return df.data[k][i]; });
      if (parts.some(isNa)) continue;
      var label = parts.length === 1 ? parts[0] : new Tuple(parts);
      var at = -1;
      for (var j = 0; j < labels.length; j++) if (P.eq(labels[j], label)) { at = j; break; }
      if (at < 0) { labels.push(label); map.push([i]); } else map[at].push(i);
    }
    var order = labels.map(function (_, i) { return i; }).sort(function (a, b) {
      var A = labels[a] instanceof Tuple ? labels[a].items : [labels[a]], B = labels[b] instanceof Tuple ? labels[b].items : [labels[b]];
      for (var k = 0; k < A.length; k++) { var c = cmpVals(A[k], B[k]); if (c) return c; }
      return 0;
    });
    return order.map(function (i) { return { label: labels[i], rows: map[i] }; });
  };
  GroupBy.prototype.valueCols = function () {
    var self = this;
    if (this.sel) return Array.isArray(this.sel) ? this.sel : [this.sel];
    return this.df.cols.filter(function (c) { return self.keys.indexOf(c) < 0; });
  };
  GroupBy.prototype.apply = function (fnName, numericOnly) {
    var self = this, gs = this.groups(), df = this.df;
    var labels = gs.map(function (g) { return g.label; });
    if (fnName === 'size') {
      var s = new Series(gs.map(function (g) { return g.rows.length; }), labels, null);
      s.indexName = this.keys.length === 1 ? this.keys[0] : null;
      return s;
    }
    var f = P.AGG[fnName];
    var cols = this.valueCols();
    if (numericOnly) cols = cols.filter(function (c) { return dtypeOf(df.data[c]) !== 'object'; });
    var data = {};
    cols.forEach(function (c) { data[c] = gs.map(function (g) { return f(g.rows.map(function (i) { return df.data[c][i]; })); }); });
    if (this.single) {
      var out = new Series(data[this.sel], labels, this.sel);
      out.indexName = this.keys.length === 1 ? this.keys[0] : null;
      return out;
    }
    var res = new DataFrame(cols, data, labels);
    res.indexNames = this.keys.slice();
    return res;
  };
  GroupBy.prototype.agg = function (spec, named) {
    var self = this, df = this.df, gs = this.groups(), labels = gs.map(function (g) { return g.label; });
    function run(col, fn) {
      if (typeof fn !== 'string' || !Object.prototype.hasOwnProperty.call(P.AGG, fn)) throw err('AttributeError', "'" + fn + "' is not a valid function for 'SeriesGroupBy' object");
      if (df.cols.indexOf(col) < 0) throw err('KeyError', P.repr(col));
      return gs.map(function (g) { return P.AGG[fn](g.rows.map(function (i) { return df.data[col][i]; })); });
    }
    var cols = [], data = {};
    if (named && named.keys.length) {
      named.keys.forEach(function (name, i) {
        var t = named.vals[i];
        if (!(t instanceof Tuple) || t.items.length !== 2) throw err('TypeError', 'Use name=("column", "function"), for example total=("qty", "sum")');
        cols.push(name); data[name] = run(t.items[0], t.items[1]);
      });
    } else if (typeof spec === 'string') {
      if (this.single) { var s = new Series(run(this.sel, spec), labels, this.sel); s.indexName = this.keys.length === 1 ? this.keys[0] : null; return s; }
      return this.apply(spec, false);
    } else if (spec instanceof Dict) {
      spec.keys.forEach(function (col, i) { cols.push(col); data[col] = run(col, spec.vals[i]); });
    } else if (Array.isArray(spec) && this.single) {
      spec.forEach(function (fn) { cols.push(fn); data[fn] = run(self.sel, fn); });
    } else throw err('TypeError', 'agg() takes a function name, a dict like {"qty": "sum"} or named aggregations like total=("qty", "sum")');
    var res = new DataFrame(cols, data, labels);
    res.indexNames = this.keys.slice();
    return res;
  };

  function parseCell(v) {
    if (v === '') return null;
    if (/^-?\d+$/.test(v)) return parseInt(v, 10);
    if (/^-?\d*\.\d+$|^-?\d+\.\d*$/.test(v)) return parseFloat(v);
    return v;
  }
  P.readCsvText = function (text) {
    var rows = DA.sheets && DA.sheets.parseCsv ? DA.sheets.parseCsv(text) : String(text).trim().split('\n').map(function (l) { return l.split(','); });
    rows = rows.filter(function (r, i) { return i === 0 || r.some(function (x) { return x !== ''; }) || r.length > 1; });
    var head = rows[0] || [], data = {};
    head.forEach(function (h, j) {
      var col = rows.slice(1).map(function (r) { return parseCell(r[j] === undefined ? '' : r[j]); });
      if (col.some(function (v) { return typeof v === 'string'; })) col = col.map(function (v, i) { var raw = rows[i + 1][j]; return v === null ? null : typeof v === 'string' ? v : raw; });
      data[h] = col;
    });
    return new DataFrame(head.slice(), data);
  };

  P.files = function () {
    var d = DA.gen.retail();
    function tbl(cols, rows) { var data = {}; cols.forEach(function (c, j) { data[c] = rows.map(function (r) { return r[j]; }); }); return new DataFrame(cols, data); }
    return {
      'orders.csv': function () { return P.readCsvText(DA.gen.retailCsv()); },
      'customers.csv': function () { return tbl(['customer_id', 'signup_date', 'city', 'segment'], d.customers); },
      'stores.csv': function () { return tbl(['store_id', 'city', 'opened_year'], d.stores); },
      'products.csv': function () { return tbl(['product_id', 'name', 'category', 'price'], d.products); },
      'messy_orders.csv': function () { return P.readCsvText(DA.gen.messyCsv()); },
    };
  };
  var cache = {};
  P.readFile = function (name) {
    var f = P.files()[name];
    if (!f) throw err('FileNotFoundError', "[Errno 2] No such file or directory: '" + name + "'. Files here: " + Object.keys(P.files()).join(', '));
    if (!cache[name]) cache[name] = f();
    return cache[name].copy();
  };

  P.parseDate = function (v) {
    if (v instanceof Date) return v;
    if (isNa(v)) return null;
    var s = String(v).trim(), m;
    if ((m = /^(\d{4})-(\d{1,2})-(\d{1,2})/.exec(s))) return new Date(Date.UTC(+m[1], +m[2] - 1, +m[3]));
    if ((m = /^(\d{1,2})\/(\d{1,2})\/(\d{4})$/.exec(s))) return new Date(Date.UTC(+m[3], +m[2] - 1, +m[1]));
    if ((m = /^(\d{4})\/(\d{1,2})\/(\d{1,2})$/.exec(s))) return new Date(Date.UTC(+m[1], +m[2] - 1, +m[3]));
    var t = Date.parse(s + ' UTC');
    if (!isNaN(t)) return new Date(t);
    throw err('ValueError', 'time data ' + P.repr(s) + ' does not match a known date format');
  };
})();
