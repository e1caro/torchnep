(function () {
  'use strict';
  var DA = (window.DA = window.DA || {});
  var S = (DA.sheets = DA.sheets || {});

  function Err(code, num) { this.code = code; this.num = num; }
  Err.prototype.toString = function () { return this.code; };
  var E = {}, byCode = {};
  [['NULL', '#NULL!', 1], ['DIV0', '#DIV/0!', 2], ['VALUE', '#VALUE!', 3], ['REF', '#REF!', 4], ['NAME', '#NAME?', 5], ['NUM', '#NUM!', 6],
    ['NA', '#N/A', 7], ['DATA', '#GETTING_DATA', 8], ['SPILL', '#SPILL!', 9], ['CALC', '#CALC!', 14]].forEach(function (p) {
    E[p[0]] = new Err(p[1], p[2]);
    byCode[p[1]] = E[p[0]];
  });
  S.Err = Err;
  S.E = E;
  S.isErr = function (v) { return v instanceof Err; };
  S.errFromCode = function (c) { return byCode[String(c).toUpperCase()] || null; };
  S.ERR_RE = /^#(NULL!|DIV\/0!|VALUE!|REF!|NAME\?|NUM!|N\/A|SPILL!|CALC!|GETTING_DATA)/i;

  S.MAXR = 1048576;
  S.MAXC = 16384;

  function Ref(sheet, r1, c1, r2, c2) {
    this.sheet = sheet;
    this.r1 = Math.min(r1, r2); this.r2 = Math.max(r1, r2);
    this.c1 = Math.min(c1, c2); this.c2 = Math.max(c1, c2);
  }
  Ref.prototype.rows = function () { return this.r2 - this.r1 + 1; };
  Ref.prototype.cols = function () { return this.c2 - this.c1 + 1; };
  Ref.prototype.size = function () { return this.rows() * this.cols(); };
  Ref.prototype.isCell = function () { return this.r1 === this.r2 && this.c1 === this.c2; };
  Ref.prototype.contains = function (r, c) { return r >= this.r1 && r <= this.r2 && c >= this.c1 && c <= this.c2; };
  S.Ref = Ref;
  S.isRef = function (v) { return v instanceof Ref; };
  S.isArr = function (v) { return Array.isArray(v); };

  function Lambda(params, body, env) { this.params = params; this.body = body; this.env = env; }
  S.Lambda = Lambda;

  S.colName = function (c) {
    var s = '';
    c += 1;
    while (c > 0) { var m = (c - 1) % 26; s = String.fromCharCode(65 + m) + s; c = (c - m - 1) / 26; }
    return s;
  };
  S.colIndex = function (name) {
    var n = 0, u = name.toUpperCase();
    for (var i = 0; i < u.length; i++) n = n * 26 + (u.charCodeAt(i) - 64);
    return n - 1;
  };
  S.addr = function (r, c, ar, ac) { return (ac ? '$' : '') + S.colName(c) + (ar ? '$' : '') + (r + 1); };
  S.parseAddr = function (s) {
    var m = /^\$?([A-Za-z]{1,3})\$?(\d{1,7})$/.exec(String(s).trim());
    if (!m) return null;
    var c = S.colIndex(m[1]), r = +m[2] - 1;
    if (c >= S.MAXC || r < 0 || r >= S.MAXR) return null;
    return { r: r, c: c };
  };
  S.rangeAddr = function (r1, c1, r2, c2) {
    if (r2 === undefined || (r1 === r2 && c1 === c2)) return S.addr(r1, c1);
    if (r1 === 0 && r2 === S.MAXR - 1) return S.colName(c1) + ':' + S.colName(c2);
    if (c1 === 0 && c2 === S.MAXC - 1) return (r1 + 1) + ':' + (r2 + 1);
    return S.addr(r1, c1) + ':' + S.addr(r2, c2);
  };
  S.parseRange = function (s) {
    s = String(s).trim().replace(/\$/g, '');
    var m;
    if ((m = /^([A-Za-z]{1,3})(\d+)(?::([A-Za-z]{1,3})(\d+))?$/.exec(s))) {
      var a = S.parseAddr(m[1] + m[2]), b = m[3] ? S.parseAddr(m[3] + m[4]) : a;
      if (!a || !b) return null;
      return { r1: Math.min(a.r, b.r), c1: Math.min(a.c, b.c), r2: Math.max(a.r, b.r), c2: Math.max(a.c, b.c) };
    }
    if ((m = /^([A-Za-z]{1,3}):([A-Za-z]{1,3})$/.exec(s))) {
      var x = S.colIndex(m[1]), y = S.colIndex(m[2]);
      if (x >= S.MAXC || y >= S.MAXC) return null;
      return { r1: 0, c1: Math.min(x, y), r2: S.MAXR - 1, c2: Math.max(x, y) };
    }
    if ((m = /^(\d+):(\d+)$/.exec(s))) {
      var p = +m[1] - 1, q = +m[2] - 1;
      if (p < 0 || q < 0 || p >= S.MAXR || q >= S.MAXR) return null;
      return { r1: Math.min(p, q), c1: 0, r2: Math.max(p, q), c2: S.MAXC - 1 };
    }
    return null;
  };
  S.quoteSheet = function (name) {
    if (/^[A-Za-z_\u00C0-\uFFFF][\w.\u00C0-\uFFFF]*$/.test(name) && !/^[A-Za-z]{1,3}\d+$/.test(name) && !/^(TRUE|FALSE)$/i.test(name) && !/^R\d*C\d*$/i.test(name)) return name;
    return "'" + name.replace(/'/g, "''") + "'";
  };

  var DAY = 86400000, EPOCH = Date.UTC(1899, 11, 30);
  function utc(y, m, d) {
    var dt = new Date(Date.UTC(2000, 0, 1));
    dt.setUTCFullYear(y, m - 1, d);
    return dt.getTime();
  }
  S.serial = function (y, m, d) {
    var n = Math.round((utc(y, m, d) - EPOCH) / DAY);
    return n < 61 ? n - 1 : n;
  };
  S.ymd = function (serial) {
    var n = Math.floor(serial);
    if (n === 60) return { y: 1900, m: 2, d: 29 };
    var dt = new Date(EPOCH + (n < 60 ? n + 1 : n) * DAY);
    return { y: dt.getUTCFullYear(), m: dt.getUTCMonth() + 1, d: dt.getUTCDate() };
  };
  S.weekday = function (serial) { var w = ((Math.floor(serial) % 7) + 7) % 7; return w === 0 ? 7 : w; };
  S.hms = function (serial) {
    var ms = Math.round((serial - Math.floor(serial)) * DAY);
    if (ms >= DAY) ms = DAY - 1;
    return { h: Math.floor(ms / 3600000), mi: Math.floor(ms / 60000) % 60, s: Math.floor(ms / 1000) % 60, ms: ms % 1000 };
  };
  S.fromJsDate = function (d) {
    return S.serial(d.getFullYear(), d.getMonth() + 1, d.getDate()) + (d.getHours() * 3600 + d.getMinutes() * 60 + d.getSeconds() + d.getMilliseconds() / 1000) / 86400;
  };
  S.daysInMonth = function (y, m) { return new Date(Date.UTC(2000, 0, 1)).setUTCFullYear(y, m, 0) && new Date(utc(y, m + 1, 0)).getUTCDate(); };
  S.isLeap = function (y) { return (y % 4 === 0 && y % 100 !== 0) || y % 400 === 0; };
  S.now = function () { return new Date(); };

  S.numText = function (n) {
    if (!isFinite(n)) return '#NUM!';
    if (n === 0) return '0';
    var p = parseFloat(n.toPrecision(15)), a = Math.abs(p);
    if (a >= 1e15 || a < 1e-9) {
      var t = p.toExponential(14).split('e'), mant = t[0].replace(/\.?0+$/, ''), ex = +t[1];
      return mant + 'E' + (ex < 0 ? '-' : '+') + (Math.abs(ex) < 10 ? '0' : '') + Math.abs(ex);
    }
    var s = String(p);
    if (/e/.test(s)) s = p.toFixed(Math.min(20, 15 - Math.floor(Math.log10(a)))).replace(/\.?0+$/, '');
    return s;
  };

  S.toNum = function (v) {
    if (typeof v === 'number') return v;
    if (v === null || v === undefined) return 0;
    if (typeof v === 'boolean') return v ? 1 : 0;
    if (v instanceof Err) return v;
    if (typeof v === 'string') { var n = S.parseNumber ? S.parseNumber(v) : (v.trim() !== '' && isFinite(+v) ? +v : null); if (n === null) n = S.textDate(v); return n === null ? E.VALUE : n; }
    return E.VALUE;
  };
  var MON = { jan: 1, feb: 2, mar: 3, apr: 4, may: 5, jun: 6, jul: 7, aug: 8, sep: 9, oct: 10, nov: 11, dec: 12 };
  S.textDate = function (v) {
    var s = String(v).trim(), m, y, mo, d;
    if ((m = /^(\d{4})[-\/](\d{1,2})[-\/](\d{1,2})$/.exec(s))) { y = +m[1]; mo = +m[2]; d = +m[3]; }
    else if ((m = /^(\d{1,2})\/(\d{1,2})\/(\d{4})$/.exec(s))) { d = +m[1]; mo = +m[2]; y = +m[3]; }
    else if ((m = /^([A-Za-z]{3})[a-z]*\.? (\d{1,2}),? (\d{4})$/.exec(s)) && MON[m[1].toLowerCase()]) { mo = MON[m[1].toLowerCase()]; d = +m[2]; y = +m[3]; }
    else return null;
    if (mo < 1 || mo > 12 || d < 1 || d > 31) return null;
    return S.serial(y, mo, d);
  };
  S.toStr = function (v) {
    if (typeof v === 'string') return v;
    if (typeof v === 'number') return S.numText(v);
    if (typeof v === 'boolean') return v ? 'TRUE' : 'FALSE';
    if (v === null || v === undefined) return '';
    if (v instanceof Err) return v;
    return E.VALUE;
  };
  S.toBool = function (v) {
    if (typeof v === 'boolean') return v;
    if (typeof v === 'number') return v !== 0;
    if (v === null || v === undefined) return false;
    if (v instanceof Err) return v;
    if (typeof v === 'string') {
      var u = v.trim().toUpperCase();
      if (u === 'TRUE' || u === 'VERDADERO') return true;
      if (u === 'FALSE' || u === 'FALSO') return false;
      return E.VALUE;
    }
    return E.VALUE;
  };

  function rank(v) { return typeof v === 'number' ? 0 : typeof v === 'string' ? 1 : typeof v === 'boolean' ? 2 : 3; }
  var ASCII = /^[\x00-\x7f]*$/;
  S.strCmp = function (a, b) {
    var x = a.toLowerCase(), y = b.toLowerCase();
    if (x === y) return 0;
    if (ASCII.test(x) && ASCII.test(y)) return x < y ? -1 : 1;
    var r = x.localeCompare(y, undefined, { sensitivity: 'accent' });
    return r < 0 ? -1 : r > 0 ? 1 : 0;
  };
  S.cmp = function (a, b) {
    if (a === null || a === undefined) a = typeof b === 'string' ? '' : typeof b === 'boolean' ? false : 0;
    if (b === null || b === undefined) b = typeof a === 'string' ? '' : typeof a === 'boolean' ? false : 0;
    var ta = rank(a), tb = rank(b);
    if (ta !== tb) return ta < tb ? -1 : 1;
    if (ta === 1) return S.strCmp(a, b);
    if (ta === 2) { a = a ? 1 : 0; b = b ? 1 : 0; }
    return a < b ? -1 : a > b ? 1 : 0;
  };
  S.sortCmp = function (a, b) {
    var ea = a === null || a === undefined || a === '', eb = b === null || b === undefined || b === '';
    if (ea || eb) return ea && eb ? 0 : ea ? 1 : -1;
    var xa = a instanceof Err, xb = b instanceof Err;
    if (xa || xb) return xa && xb ? 0 : xa ? 1 : -1;
    return S.cmp(a, b);
  };

  S.wildRe = function (pat, whole) {
    var out = '', i, ch;
    for (i = 0; i < pat.length; i++) {
      ch = pat.charAt(i);
      if (ch === '~' && i + 1 < pat.length && /[*?~]/.test(pat.charAt(i + 1))) { out += '\\' + pat.charAt(i + 1); i++; }
      else if (ch === '*') out += '[\\s\\S]*';
      else if (ch === '?') out += '[\\s\\S]';
      else out += ch.replace(/[.+^${}()|[\]\\\/-]/g, '\\$&');
    }
    return new RegExp(whole === false ? out : '^' + out + '$', 'i');
  };
  S.hasWild = function (s) { return /(^|[^~])[*?]/.test(s); };

  // A number typed as text in a criterion or a cell ("3", "-2.5", "1e3", "15%"); null when it is not a number.
  S.parseNumber = function (s) {
    var t = String(s).trim(), pct = /%$/.test(t);
    if (pct) t = t.slice(0, -1).trim();
    if (!/^[+-]?(\d+\.?\d*|\.\d+)(e[+-]?\d+)?$/i.test(t)) return null;
    return pct ? +t / 100 : +t;
  };

  S.criteria = function (crit) {
    if (crit instanceof Err) return function (v) { return v === crit; };
    if (crit === null || crit === undefined) return function (v) { return v === ''; };
    if (typeof crit === 'number') {
      return function (v) { return typeof v === 'number' ? v === crit : typeof v === 'string' && S.parseNumber && S.parseNumber(v) === crit; };
    }
    if (typeof crit === 'boolean') return function (v) { return v === crit; };
    var m = /^(<=|>=|<>|=|<|>)?([\s\S]*)$/.exec(String(crit)), op = m[1] || '=', rest = m[2];
    if (rest === '') {
      if (op === '=') return function (v) { return v === null || v === undefined || v === ''; };
      if (op === '<>') return function (v) { return !(v === null || v === undefined || v === ''); };
      return function () { return false; };
    }
    var num = S.parseNumber ? S.parseNumber(rest) : null, err = S.errFromCode(rest.trim()), up = rest.trim().toUpperCase();
    if (err) return op === '<>' ? function (v) { return v !== err; } : op === '=' ? function (v) { return v === err; } : function () { return false; };
    if (up === 'TRUE' || up === 'FALSE') {
      var bv = up === 'TRUE';
      if (op === '=') return function (v) { return v === bv; };
      if (op === '<>') return function (v) { return v !== bv; };
    }
    if (num !== null) {
      var test = {
        '=': function (x) { return x === num; }, '<>': function (x) { return x !== num; },
        '<': function (x) { return x < num; }, '>': function (x) { return x > num; },
        '<=': function (x) { return x <= num; }, '>=': function (x) { return x >= num; },
      }[op];
      return function (v) {
        if (typeof v === 'number') return test(v);
        if (op === '<>') return true;
        if (op === '=' && typeof v === 'string' && S.parseNumber) { var p = S.parseNumber(v); return p !== null && p === num; }
        return false;
      };
    }
    if (op === '=' || op === '<>') {
      var re = S.hasWild(rest) ? S.wildRe(rest) : null, low = rest.replace(/~([*?~])/g, '$1');
      var eq = re ? function (v) { return typeof v === 'string' && re.test(v); } : function (v) { return typeof v === 'string' && S.strCmp(v, low) === 0; };
      return op === '=' ? eq : function (v) { return !eq(v); };
    }
    return function (v) {
      if (typeof v !== 'string') return false;
      var c = S.strCmp(v, rest);
      return op === '<' ? c < 0 : op === '>' ? c > 0 : op === '<=' ? c <= 0 : c >= 0;
    };
  };

  S.dims = function (a) { return [a.length, a.length ? a[0].length : 0]; };
  S.fill2 = function (rows, cols, v) {
    var out = new Array(rows);
    for (var i = 0; i < rows; i++) { out[i] = new Array(cols); for (var j = 0; j < cols; j++) out[i][j] = v; }
    return out;
  };
  S.transpose = function (a) {
    var r = a.length, c = r ? a[0].length : 0, out = S.fill2(c, r, null);
    for (var i = 0; i < r; i++) for (var j = 0; j < c; j++) out[j][i] = a[i][j];
    return out;
  };
  S.flat = function (a) { var out = []; for (var i = 0; i < a.length; i++) for (var j = 0; j < a[i].length; j++) out.push(a[i][j]); return out; };
})();
