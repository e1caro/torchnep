(function () {
  'use strict';
  var DA = (window.DA = window.DA || {});
  var P = (DA.python = {});

  // Series implementation
  function Series(data, index, name) {
    this.data = Array.isArray(data) ? data.slice() : [];
    this.index = index || this.data.map(function (_, i) { return i; });
    this.name = name || '';
  }

  Series.prototype.sum = function () {
    return this.data.reduce(function (a, b) { return a + (typeof b === 'number' ? b : 0); }, 0);
  };
  Series.prototype.mean = function () {
    var s = this.sum(), n = this.data.filter(function (x) { return typeof x === 'number'; }).length;
    return n ? s / n : 0;
  };
  Series.prototype.count = function () {
    return this.data.filter(function (x) { return x !== null && x !== undefined && x !== ''; }).length;
  };
  Series.prototype.min = function () {
    var nums = this.data.filter(function (x) { return typeof x === 'number'; });
    return nums.length ? Math.min.apply(null, nums) : null;
  };
  Series.prototype.max = function () {
    var nums = this.data.filter(function (x) { return typeof x === 'number'; });
    return nums.length ? Math.max.apply(null, nums) : null;
  };
  Series.prototype.value_counts = function () {
    var counts = {};
    for (var i = 0; i < this.data.length; i++) {
      var k = String(this.data[i]);
      counts[k] = (counts[k] || 0) + 1;
    }
    var keys = Object.keys(counts).sort(function (a, b) { return counts[b] - counts[a]; });
    var resData = [], resIdx = [];
    keys.forEach(function (k) { resIdx.push(k); resData.push(counts[k]); });
    return new Series(resData, resIdx, 'count');
  };
  Series.prototype.apply = function (fn) {
    return new Series(this.data.map(fn), this.index, this.name);
  };
  Series.prototype.shift = function (periods) {
    periods = periods === undefined ? 1 : periods;
    var out = [];
    for (var i = 0; i < this.data.length; i++) {
      var src = i - periods;
      out.push(src >= 0 && src < this.data.length ? this.data[src] : null);
    }
    return new Series(out, this.index, this.name);
  };

  // DataFrame implementation
  function DataFrame(data, columns) {
    this.columns = columns || [];
    this.rows = []; // array of objects { colName: val }

    if (Array.isArray(data)) {
      if (data.length && typeof data[0] === 'object' && !Array.isArray(data[0])) {
        this.rows = data.map(function (d) { return Object.assign({}, d); });
        if (!this.columns.length) this.columns = Object.keys(data[0]);
      } else if (data.length && Array.isArray(data[0])) {
        this.rows = data.map(function (row) {
          var obj = {};
          for (var c = 0; c < (columns || []).length; c++) obj[columns[c]] = row[c];
          return obj;
        });
      }
    }
  }

  DataFrame.prototype.shape = function () {
    return [this.rows.length, this.columns.length];
  };

  DataFrame.prototype.head = function (n) {
    n = n === undefined ? 5 : n;
    return new DataFrame(this.rows.slice(0, n), this.columns);
  };

  DataFrame.prototype.tail = function (n) {
    n = n === undefined ? 5 : n;
    return new DataFrame(this.rows.slice(Math.max(0, this.rows.length - n)), this.columns);
  };

  DataFrame.prototype.col = function (name) {
    var vals = this.rows.map(function (r) { return r[name]; });
    return new Series(vals, null, name);
  };

  DataFrame.prototype.assign = function (colName, seriesOrArr) {
    var data = seriesOrArr instanceof Series ? seriesOrArr.data : seriesOrArr;
    for (var i = 0; i < this.rows.length; i++) {
      this.rows[i][colName] = data[i];
    }
    if (this.columns.indexOf(colName) < 0) this.columns.push(colName);
    return this;
  };

  DataFrame.prototype.sort_values = function (by, ascending) {
    ascending = ascending === undefined ? true : !!ascending;
    var copy = this.rows.slice();
    copy.sort(function (a, b) {
      var va = a[by], vb = b[by];
      if (va === vb) return 0;
      if (va === null || va === undefined) return 1;
      if (vb === null || vb === undefined) return -1;
      return (va < vb ? -1 : 1) * (ascending ? 1 : -1);
    });
    return new DataFrame(copy, this.columns);
  };

  DataFrame.prototype.groupby = function (byCol) {
    var self = this;
    var groups = {};
    for (var i = 0; i < this.rows.length; i++) {
      var key = String(this.rows[i][byCol]);
      groups[key] = groups[key] || [];
      groups[key].push(this.rows[i]);
    }

    return {
      agg: function (aggMap) {
        var resRows = [];
        var keys = Object.keys(groups).sort();
        for (var k = 0; k < keys.length; k++) {
          var grpRows = groups[keys[k]];
          var rowObj = {};
          rowObj[byCol] = grpRows[0][byCol];

          Object.keys(aggMap).forEach(function (col) {
            var fnName = aggMap[col];
            var vals = grpRows.map(function (r) { return r[col]; });
            var ser = new Series(vals);
            rowObj[col] = (typeof ser[fnName] === 'function') ? ser[fnName]() : ser.sum();
          });
          resRows.push(rowObj);
        }
        var newCols = [byCol].concat(Object.keys(aggMap));
        return new DataFrame(resRows, newCols);
      },
      sum: function () {
        var numCols = self.columns.filter(function (c) {
          return c !== byCol && self.rows.some(function (r) { return typeof r[c] === 'number'; });
        });
        var aggMap = {};
        numCols.forEach(function (c) { aggMap[c] = 'sum'; });
        return this.agg(aggMap);
      }
    };
  };

  DataFrame.prototype.merge = function (otherDf, onKey, how) {
    how = how || 'inner';
    var lookup = {};
    for (var j = 0; j < otherDf.rows.length; j++) {
      var k = String(otherDf.rows[j][onKey]);
      lookup[k] = otherDf.rows[j];
    }

    var merged = [];
    for (var i = 0; i < this.rows.length; i++) {
      var key = String(this.rows[i][onKey]);
      var match = lookup[key];
      if (match) {
        merged.push(Object.assign({}, this.rows[i], match));
      } else if (how === 'left') {
        merged.push(Object.assign({}, this.rows[i]));
      }
    }

    var allCols = this.columns.slice();
    otherDf.columns.forEach(function (c) {
      if (allCols.indexOf(c) < 0) allCols.push(c);
    });
    return new DataFrame(merged, allCols);
  };

  P.Series = Series;
  P.DataFrame = DataFrame;

  // pandas namespace
  P.pd = {
    DataFrame: DataFrame,
    Series: Series,
    read_csv: function (csvText) {
      var lines = csvText.trim().split('\n');
      if (!lines.length) return new DataFrame([]);
      var cols = lines[0].split(',').map(function (c) { return c.replace(/^"|"$/g, '').trim(); });
      var rows = [];
      for (var i = 1; i < lines.length; i++) {
        var vals = lines[i].split(',');
        var obj = {};
        for (var c = 0; c < cols.length; c++) {
          var v = (vals[c] || '').replace(/^"|"$/g, '').trim();
          obj[cols[c]] = isFinite(+v) && v !== '' ? +v : v;
        }
        rows.push(obj);
      }
      return new DataFrame(rows, cols);
    },
    merge: function (left, right, opts) {
      opts = opts || {};
      return left.merge(right, opts.on, opts.how);
    }
  };

  // Safe client-side Python execution environment
  P.execute = function (code, context) {
    context = context || {};
    var pd = P.pd;
    var df = context.df;
    var output = [];
    var print = function () {
      var args = Array.prototype.slice.call(arguments);
      output.push(args.map(function (a) {
        if (a instanceof DataFrame) {
          var sample = a.head(10).rows;
          return JSON.stringify(sample, null, 2);
        }
        return String(a);
      }).join(' '));
    };

    var result = null;
    try {
      // Allow Pythonic JS syntax (let, const, or plain expressions)
      var runner = new Function('pd', 'df', 'print', 'context', code);
      result = runner(pd, df, print, context);
    } catch (e) {
      return { ok: false, error: String(e.message || e), output: output.join('\n') };
    }

    return { ok: true, result: result, output: output.join('\n') };
  };
})();
