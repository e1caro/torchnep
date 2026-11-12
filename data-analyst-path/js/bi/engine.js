(function () {
  'use strict';
  var DA = (window.DA = window.DA || {});
  var BI = (DA.bi = {});

  // Data Model & Relationships (Star Schema)
  function Model() {
    this.tables = {};       // name -> DataFrame
    this.relationships = []; // [{ fromTable, fromCol, toTable, toCol, cardinality }]
    this.measures = {};     // name -> DAX formula string
  }

  Model.prototype.addTable = function (name, df) {
    this.tables[name] = df;
  };

  Model.prototype.addRelationship = function (fromT, fromC, toT, toC) {
    this.relationships.push({ fromTable: fromT, fromCol: fromC, toTable: toT, toCol: toC });
  };

  // DAX Evaluator
  // Supports: SUM, AVERAGE, COUNT, DIVIDE, CALCULATE, FILTER, ALL
  BI.evalDax = function (formula, model, activeFilters) {
    activeFilters = activeFilters || {};
    formula = formula.trim();

    // DIVIDE(num, den)
    var mDiv = /^DIVIDE\((.+),(.+)\)$/i.exec(formula);
    if (mDiv) {
      var num = BI.evalDax(mDiv[1], model, activeFilters);
      var den = BI.evalDax(mDiv[2], model, activeFilters);
      return den === 0 ? 0 : num / den;
    }

    // CALCULATE(Measure, FilterCondition)
    var mCalc = /^CALCULATE\((.+),(.+)\)$/i.exec(formula);
    if (mCalc) {
      var baseMeasure = mCalc[1].trim();
      var filterCond = mCalc[2].trim(); // e.g. Sales[store_city] = "Madrid"
      var mFieldVal = /([A-Za-z0-9_]+)\[([A-Za-z0-9_]+)\]\s*=\s*["']?([^"']+)["']?/i.exec(filterCond);
      var newFilters = Object.assign({}, activeFilters);
      if (mFieldVal) {
        newFilters[mFieldVal[2]] = mFieldVal[3];
      }
      return BI.evalDax(baseMeasure, model, newFilters);
    }

    // Aggregations: SUM(Table[Col]), AVERAGE(Table[Col]), COUNT(Table[Col])
    var mAgg = /^(SUM|AVERAGE|COUNT)\(([A-Za-z0-9_]+)\[([A-Za-z0-9_]+)\]\)$/i.exec(formula);
    if (mAgg) {
      var fn = mAgg[1].toUpperCase();
      var tName = mAgg[2];
      var cName = mAgg[3];
      var df = model.tables[tName];
      if (!df) return 0;

      // apply activeFilters
      var filteredRows = df.rows.filter(function (r) {
        var match = true;
        Object.keys(activeFilters).forEach(function (k) {
          if (r[k] !== undefined && String(r[k]) !== String(activeFilters[k])) match = false;
        });
        return match;
      });

      var vals = filteredRows.map(function (r) { return r[cName]; }).filter(function (v) { return typeof v === 'number'; });
      if (!vals.length) return 0;
      var sum = vals.reduce(function (a, b) { return a + b; }, 0);
      if (fn === 'SUM') return sum;
      if (fn === 'AVERAGE') return sum / vals.length;
      if (fn === 'COUNT') return vals.length;
    }

    return 0;
  };

  // Tableau LOD Evaluator: { FIXED [col] : AGG([measure]) }
  BI.evalLOD = function (lodExpr, df) {
    var mLod = /^\{\s*FIXED\s*\[([A-Za-z0-9_]+)\]\s*:\s*(MIN|MAX|SUM|AVG)\(\[([A-Za-z0-9_]+)\]\)\s*\}$/i.exec(lodExpr.trim());
    if (!mLod) return null;

    var groupCol = mLod[1];
    var agg = mLod[2].toUpperCase();
    var valCol = mLod[3];

    var groups = {};
    for (var i = 0; i < df.rows.length; i++) {
      var g = String(df.rows[i][groupCol]);
      groups[g] = groups[g] || [];
      groups[g].push(df.rows[i][valCol]);
    }

    var lodMap = {};
    Object.keys(groups).forEach(function (gk) {
      var arr = groups[gk];
      if (agg === 'MIN') lodMap[gk] = arr.reduce(function (a, b) { return a < b ? a : b; });
      else if (agg === 'MAX') lodMap[gk] = arr.reduce(function (a, b) { return a > b ? a : b; });
      else if (agg === 'SUM') lodMap[gk] = arr.reduce(function (a, b) { return a + (typeof b === 'number' ? b : 0); }, 0);
      else lodMap[gk] = arr.reduce(function (a, b) { return a + b; }, 0) / arr.length;
    });

    return lodMap;
  };

  BI.Model = Model;
})();
