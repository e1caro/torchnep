(function () {
  'use strict';
  var DA = (window.DA = window.DA || {});
  var S = (DA.sheets = DA.sheets || {});
  var FN = (S.functions = S.functions || {});

  // Math & Trig functions
  FN.SUM = function () {
    var total = 0;
    for (var i = 0; i < arguments.length; i++) {
      var arg = arguments[i];
      if (Array.isArray(arg)) {
        for (var r = 0; r < arg.length; r++) {
          for (var c = 0; c < arg[r].length; c++) {
            var v = arg[r][c];
            if (typeof v === 'number') total += v;
            else if (v instanceof S.Err) return v;
          }
        }
      } else if (typeof arg === 'number') {
        total += arg;
      } else if (arg instanceof S.Err) {
        return arg;
      }
    }
    return total;
  };

  FN.AVERAGE = function () {
    var total = 0, count = 0;
    for (var i = 0; i < arguments.length; i++) {
      var arg = arguments[i];
      if (Array.isArray(arg)) {
        for (var r = 0; r < arg.length; r++) {
          for (var c = 0; c < arg[r].length; c++) {
            var v = arg[r][c];
            if (typeof v === 'number') { total += v; count++; }
            else if (v instanceof S.Err) return v;
          }
        }
      } else if (typeof arg === 'number') {
        total += arg; count++;
      } else if (arg instanceof S.Err) return arg;
    }
    return count > 0 ? total / count : S.E.DIV0;
  };

  FN.COUNT = function () {
    var count = 0;
    for (var i = 0; i < arguments.length; i++) {
      var arg = arguments[i];
      if (Array.isArray(arg)) {
        for (var r = 0; r < arg.length; r++) {
          for (var c = 0; c < arg[r].length; c++) {
            if (typeof arg[r][c] === 'number') count++;
          }
        }
      } else if (typeof arg === 'number') {
        count++;
      }
    }
    return count;
  };

  FN.COUNTA = function () {
    var count = 0;
    for (var i = 0; i < arguments.length; i++) {
      var arg = arguments[i];
      if (Array.isArray(arg)) {
        for (var r = 0; r < arg.length; r++) {
          for (var c = 0; c < arg[r].length; c++) {
            var v = arg[r][c];
            if (v !== null && v !== undefined && v !== '') count++;
          }
        }
      } else if (arg !== null && arg !== undefined && arg !== '') {
        count++;
      }
    }
    return count;
  };

  FN.COUNTBLANK = function (range) {
    if (!Array.isArray(range)) return (range === null || range === undefined || range === '') ? 1 : 0;
    var count = 0;
    for (var r = 0; r < range.length; r++) {
      for (var c = 0; c < range[r].length; c++) {
        var v = range[r][c];
        if (v === null || v === undefined || v === '') count++;
      }
    }
    return count;
  };

  FN.MIN = function () {
    var min = Infinity;
    for (var i = 0; i < arguments.length; i++) {
      var arg = arguments[i];
      if (Array.isArray(arg)) {
        for (var r = 0; r < arg.length; r++) {
          for (var c = 0; c < arg[r].length; c++) {
            var v = arg[r][c];
            if (typeof v === 'number' && v < min) min = v;
            else if (v instanceof S.Err) return v;
          }
        }
      } else if (typeof arg === 'number' && arg < min) {
        min = arg;
      }
    }
    return min === Infinity ? 0 : min;
  };

  FN.MAX = function () {
    var max = -Infinity;
    for (var i = 0; i < arguments.length; i++) {
      var arg = arguments[i];
      if (Array.isArray(arg)) {
        for (var r = 0; r < arg.length; r++) {
          for (var c = 0; c < arg[r].length; c++) {
            var v = arg[r][c];
            if (typeof v === 'number' && v > max) max = v;
            else if (v instanceof S.Err) return v;
          }
        }
      } else if (typeof arg === 'number' && arg > max) {
        max = arg;
      }
    }
    return max === -Infinity ? 0 : max;
  };

  FN.ABS = function (n) { n = S.toNum(n); return n instanceof S.Err ? n : Math.abs(n); };
  FN.ROUND = function (n, d) { n = S.toNum(n); d = d ? S.toNum(d) : 0; if (n instanceof S.Err || d instanceof S.Err) return S.E.VALUE; var k = Math.pow(10, d); return Math.round(n * k) / k; };
  FN.ROUNDUP = function (n, d) { n = S.toNum(n); d = d ? S.toNum(d) : 0; var k = Math.pow(10, d); return (n >= 0 ? Math.ceil(n * k) : Math.floor(n * k)) / k; };
  FN.ROUNDDOWN = function (n, d) { n = S.toNum(n); d = d ? S.toNum(d) : 0; var k = Math.pow(10, d); return (n >= 0 ? Math.floor(n * k) : Math.ceil(n * k)) / k; };
  FN.INT = function (n) { n = S.toNum(n); return n instanceof S.Err ? n : Math.floor(n); };
  FN.SQRT = function (n) { n = S.toNum(n); return (n < 0) ? S.E.NUM : Math.sqrt(n); };
  FN.POWER = function (b, e) { b = S.toNum(b); e = S.toNum(e); return Math.pow(b, e); };
  FN.MOD = function (n, d) { n = S.toNum(n); d = S.toNum(d); if (d === 0) return S.E.DIV0; return n - d * Math.floor(n / d); };
  FN.PRODUCT = function () {
    var p = 1;
    for (var i = 0; i < arguments.length; i++) {
      var arg = arguments[i];
      if (Array.isArray(arg)) {
        for (var r = 0; r < arg.length; r++) {
          for (var c = 0; c < arg[r].length; c++) {
            if (typeof arg[r][c] === 'number') p *= arg[r][c];
          }
        }
      } else if (typeof arg === 'number') p *= arg;
    }
    return p;
  };

  FN.SUMPRODUCT = function () {
    if (!arguments.length) return 0;
    var a1 = arguments[0];
    if (!Array.isArray(a1)) return S.E.VALUE;
    var rows = a1.length, cols = a1[0].length;
    var sum = 0;

    for (var r = 0; r < rows; r++) {
      for (var c = 0; c < cols; c++) {
        var prod = 1;
        for (var i = 0; i < arguments.length; i++) {
          var arr = arguments[i];
          if (!Array.isArray(arr) || arr.length !== rows || arr[0].length !== cols) return S.E.VALUE;
          var v = arr[r][c];
          prod *= (typeof v === 'number' ? v : 0);
        }
        sum += prod;
      }
    }
    return sum;
  };

  FN.SUMIF = function (range, crit, sumRange) {
    sumRange = sumRange || range;
    var filterFn = S.criteria(crit);
    var total = 0;
    if (!Array.isArray(range) || !Array.isArray(sumRange)) return S.E.VALUE;
    var rLen = Math.min(range.length, sumRange.length);
    var cLen = Math.min(range[0].length, sumRange[0].length);
    for (var r = 0; r < rLen; r++) {
      for (var c = 0; c < cLen; c++) {
        if (filterFn(range[r][c])) {
          var v = sumRange[r][c];
          if (typeof v === 'number') total += v;
        }
      }
    }
    return total;
  };

  FN.COUNTIF = function (range, crit) {
    var filterFn = S.criteria(crit);
    var count = 0;
    if (!Array.isArray(range)) return filterFn(range) ? 1 : 0;
    for (var r = 0; r < range.length; r++) {
      for (var c = 0; c < range[r].length; c++) {
        if (filterFn(range[r][c])) count++;
      }
    }
    return count;
  };

  FN.SUMIFS = function (sumRange) {
    if (!Array.isArray(sumRange) || arguments.length < 3) return S.E.VALUE;
    var criteriaPairs = [];
    for (var i = 1; i < arguments.length; i += 2) {
      criteriaPairs.push({ range: arguments[i], match: S.criteria(arguments[i + 1]) });
    }
    var rows = sumRange.length, cols = sumRange[0].length;
    var total = 0;
    for (var r = 0; r < rows; r++) {
      for (var c = 0; c < cols; c++) {
        var matchAll = true;
        for (var p = 0; p < criteriaPairs.length; p++) {
          var cr = criteriaPairs[p].range;
          if (!Array.isArray(cr) || !criteriaPairs[p].match(cr[r][c])) {
            matchAll = false;
            break;
          }
        }
        if (matchAll) {
          var val = sumRange[r][c];
          if (typeof val === 'number') total += val;
        }
      }
    }
    return total;
  };

  FN.COUNTIFS = function () {
    if (arguments.length < 2) return 0;
    var criteriaPairs = [];
    for (var i = 0; i < arguments.length; i += 2) {
      criteriaPairs.push({ range: arguments[i], match: S.criteria(arguments[i + 1]) });
    }
    var r1 = criteriaPairs[0].range;
    if (!Array.isArray(r1)) return S.E.VALUE;
    var rows = r1.length, cols = r1[0].length;
    var count = 0;
    for (var r = 0; r < rows; r++) {
      for (var c = 0; c < cols; c++) {
        var matchAll = true;
        for (var p = 0; p < criteriaPairs.length; p++) {
          var cr = criteriaPairs[p].range;
          if (!Array.isArray(cr) || !criteriaPairs[p].match(cr[r][c])) {
            matchAll = false;
            break;
          }
        }
        if (matchAll) count++;
      }
    }
    return count;
  };

  FN.AVERAGEIF = function (range, crit, avgRange) {
    if (!Array.isArray(range)) return S.E.VALUE;
    return FN.AVERAGEIFS(avgRange || range, range, crit);
  };
  FN.AVERAGEIFS = function (avgRange) {
    if (!Array.isArray(avgRange) || arguments.length < 3) return S.E.VALUE;
    var criteriaPairs = [];
    for (var i = 1; i < arguments.length; i += 2) {
      criteriaPairs.push({ range: arguments[i], match: S.criteria(arguments[i + 1]) });
    }
    var rows = avgRange.length, cols = avgRange[0].length;
    var total = 0, count = 0;
    for (var r = 0; r < rows; r++) {
      for (var c = 0; c < cols; c++) {
        var matchAll = true;
        for (var p = 0; p < criteriaPairs.length; p++) {
          var cr = criteriaPairs[p].range;
          if (!Array.isArray(cr) || !criteriaPairs[p].match(cr[r][c])) {
            matchAll = false;
            break;
          }
        }
        if (matchAll) {
          var val = avgRange[r][c];
          if (typeof val === 'number') { total += val; count++; }
        }
      }
    }
    return count > 0 ? total / count : S.E.DIV0;
  };

  // Text Functions
  FN.TRIM = function (s) { return typeof s === 'string' ? s.trim().replace(/\s+/g, ' ') : s; };
  FN.PROPER = function (s) {
    if (typeof s !== 'string') return s;
    return s.toLowerCase().replace(/\b\w/g, function (l) { return l.toUpperCase(); });
  };
  FN.UPPER = function (s) { return typeof s === 'string' ? s.toUpperCase() : s; };
  FN.LOWER = function (s) { return typeof s === 'string' ? s.toLowerCase() : s; };
  FN.LEN = function (s) { return (s === null || s === undefined) ? 0 : String(s).length; };
  FN.LEFT = function (s, n) { s = String(s || ''); n = (n === undefined) ? 1 : S.toNum(n); return s.slice(0, n); };
  FN.RIGHT = function (s, n) { s = String(s || ''); n = (n === undefined) ? 1 : S.toNum(n); return s.slice(Math.max(0, s.length - n)); };
  FN.MID = function (s, start, len) {
    s = String(s || ''); start = S.toNum(start) - 1; len = S.toNum(len);
    return s.substr(Math.max(0, start), Math.max(0, len));
  };
  FN.SUBSTITUTE = function (text, oldText, newText, instance) {
    text = String(text || ''); oldText = String(oldText || ''); newText = String(newText || '');
    if (!oldText) return text;
    if (instance === undefined) return text.split(oldText).join(newText);
    var parts = text.split(oldText);
    var inst = S.toNum(instance);
    if (inst < 1 || inst >= parts.length) return text;
    return parts.slice(0, inst).join(oldText) + newText + parts.slice(inst).join(oldText);
  };
  FN.TEXTJOIN = function (delimiter, ignoreEmpty) {
    var parts = [];
    var delim = String(delimiter || '');
    var ign = S.toBool(ignoreEmpty);
    for (var i = 2; i < arguments.length; i++) {
      var arg = arguments[i];
      if (Array.isArray(arg)) {
        for (var r = 0; r < arg.length; r++) {
          for (var c = 0; c < arg[r].length; c++) {
            var v = arg[r][c];
            if (!ign || (v !== null && v !== undefined && v !== '')) parts.push(String(v));
          }
        }
      } else if (!ign || (arg !== null && arg !== undefined && arg !== '')) {
        parts.push(String(arg));
      }
    }
    return parts.join(delim);
  };
  FN.CONCATENATE = function () {
    var s = '';
    for (var i = 0; i < arguments.length; i++) s += S.toStr(arguments[i]);
    return s;
  };
  FN.VALUE = function (v) { return S.toNum(v); };
  FN.TEXT = function (v, fmt) { return S.formatValue(v, fmt); };

  // Logical Functions
  FN.IF = function (cond, t, f) {
    var b = S.toBool(cond);
    if (b instanceof S.Err) return b;
    return b ? t : (f === undefined ? false : f);
  };
  FN.IFERROR = function (val, alt) { return (val instanceof S.Err) ? alt : val; };
  FN.AND = function () {
    for (var i = 0; i < arguments.length; i++) {
      var b = S.toBool(arguments[i]);
      if (b instanceof S.Err) return b;
      if (!b) return false;
    }
    return true;
  };
  FN.OR = function () {
    for (var i = 0; i < arguments.length; i++) {
      var b = S.toBool(arguments[i]);
      if (b instanceof S.Err) return b;
      if (b) return true;
    }
    return false;
  };
  FN.NOT = function (v) { var b = S.toBool(v); return b instanceof S.Err ? b : !b; };

  // Lookup & Reference Functions
  FN.XLOOKUP = function (lookupVal, lookupArr, returnArr, ifNotFound, matchMode, searchMode) {
    ifNotFound = (ifNotFound === undefined) ? S.E.NA : ifNotFound;
    matchMode = matchMode || 0; // 0 exact, -1 exact/next smaller, 1 exact/next larger, 2 wildcard
    searchMode = searchMode || 1; // 1 first-to-last, -1 last-to-first

    if (!Array.isArray(lookupArr) || !Array.isArray(returnArr)) return S.E.VALUE;
    var flatLookup = S.flat(lookupArr);
    var flatReturn = S.flat(returnArr);

    var len = flatLookup.length;
    var start = (searchMode === -1) ? len - 1 : 0;
    var end = (searchMode === -1) ? -1 : len;
    var step = (searchMode === -1) ? -1 : 1;

    for (var i = start; i !== end; i += step) {
      if (S.cmp(flatLookup[i], lookupVal) === 0) {
        return flatReturn[i] !== undefined ? flatReturn[i] : null;
      }
    }
    return ifNotFound;
  };

  FN.VLOOKUP = function (lookupVal, table, colIdx, exact) {
    if (!Array.isArray(table) || !table.length) return S.E.NA;
    var col = S.toNum(colIdx) - 1;
    if (col < 0 || col >= table[0].length) return S.E.VALUE;
    var isExact = (exact === undefined) ? true : S.toBool(exact) === false;

    for (var r = 0; r < table.length; r++) {
      if (S.cmp(table[r][0], lookupVal) === 0) {
        return table[r][col];
      }
    }
    return S.E.NA;
  };

  FN.INDEX = function (arr, r, c) {
    if (!Array.isArray(arr)) return arr;
    r = (r === undefined || r === 0) ? null : S.toNum(r) - 1;
    c = (c === undefined || c === 0) ? null : S.toNum(c) - 1;

    if (r !== null && c !== null) {
      if (r < 0 || r >= arr.length || c < 0 || c >= arr[0].length) return S.E.REF;
      return arr[r][c];
    }
    // One column (or one row): the number picks a single cell, as in Excel (INDEX(D2:D9, 3) is D4).
    if (r !== null && arr[0] && arr[0].length === 1) return r < 0 || r >= arr.length ? S.E.REF : arr[r][0];
    if (r !== null && arr.length === 1) return r < 0 || r >= arr[0].length ? S.E.REF : arr[0][r];
    if (r !== null) return r < 0 || r >= arr.length ? S.E.REF : [arr[r]]; // row slice
    if (c !== null) {
      var colSlice = [];
      for (var i = 0; i < arr.length; i++) colSlice.push([arr[i][c]]);
      return colSlice;
    }
    return arr;
  };

  FN.MATCH = function (lookupVal, arr, matchType) {
    if (!Array.isArray(arr)) return S.E.VALUE;
    var flat = S.flat(arr);
    matchType = (matchType === undefined) ? 1 : S.toNum(matchType);

    for (var i = 0; i < flat.length; i++) {
      if (S.cmp(flat[i], lookupVal) === 0) return i + 1;
    }
    return S.E.NA;
  };

  // Modern Dynamic Array Functions (spilling)
  FN.UNIQUE = function (arr) {
    if (!Array.isArray(arr)) return arr;
    var seen = new Set();
    var out = [];
    for (var r = 0; r < arr.length; r++) {
      var key = arr[r].map(function (v) { return String(v); }).join('||');
      if (!seen.has(key)) {
        seen.add(key);
        out.push(arr[r].slice());
      }
    }
    return out;
  };

  FN.SORT = function (arr, sortIndex, sortOrder) {
    if (!Array.isArray(arr)) return arr;
    var idx = (sortIndex ? S.toNum(sortIndex) : 1) - 1;
    var order = (sortOrder !== undefined) ? S.toNum(sortOrder) : 1; // 1 asc, -1 desc
    var copy = arr.slice();
    copy.sort(function (a, b) {
      var diff = S.sortCmp(a[idx], b[idx]);
      return order === -1 ? -diff : diff;
    });
    return copy;
  };

  FN.FILTER = function (arr, include, ifEmpty) {
    if (!Array.isArray(arr) || !Array.isArray(include)) return S.E.VALUE;
    var out = [];
    var incFlat = S.flat(include);
    for (var r = 0; r < arr.length; r++) {
      if (S.toBool(incFlat[r]) === true) {
        out.push(arr[r].slice());
      }
    }
    if (!out.length) return (ifEmpty !== undefined) ? ifEmpty : S.E.CALC;
    return out;
  };

  // Date & Time Functions
  FN.TODAY = function () {
    var now = S.now();
    return S.serial(now.getFullYear(), now.getMonth() + 1, now.getDate());
  };
  FN.NOW = function () { return S.fromJsDate(S.now()); };
  FN.DATE = function (y, m, d) { return S.serial(S.toNum(y), S.toNum(m), S.toNum(d)); };
  FN.YEAR = function (serial) { return S.ymd(S.toNum(serial)).y; };
  FN.MONTH = function (serial) { return S.ymd(S.toNum(serial)).m; };
  FN.DAY = function (serial) { return S.ymd(S.toNum(serial)).d; };

  // Information Functions
  FN.ISNUMBER = function (v) { return typeof v === 'number'; };
  FN.ISTEXT = function (v) { return typeof v === 'string'; };
  FN.ISBLANK = function (v) { return v === null || v === undefined || v === ''; };
  FN.ISERROR = function (v) { return v instanceof S.Err; };
})();
