(function () {
  'use strict';
  var DA = (window.DA = window.DA || {});
  var S = (DA.sheets = DA.sheets || {});

  // High performance Canvas Charts: Column, Bar, Line, Pie, Combo
  // Updates live from spreadsheet ranges

  function Chart(canvas, type, title) {
    this.canvas = canvas;
    this.ctx = canvas.getContext('2d');
    this.type = type || 'column'; // 'column' | 'bar' | 'line' | 'pie' | 'combo'
    this.title = title || 'Chart';
    this.labels = [];
    this.series = []; // [{ name, data: [numbers], type }]
  }

  Chart.prototype.setData = function (labels, series) {
    this.labels = labels || [];
    this.series = series || [];
    this.render();
  };

  Chart.prototype.render = function () {
    var ctx = this.ctx;
    var dpr = window.devicePixelRatio || 1;
    var rect = this.canvas.getBoundingClientRect();
    var W = rect.width, H = rect.height;
    if (!W || !H) return;

    this.canvas.width = Math.floor(W * dpr);
    this.canvas.height = Math.floor(H * dpr);
    ctx.scale(dpr, dpr);

    ctx.clearRect(0, 0, W, H);

    // Title
    ctx.font = 'bold 14px ' + (DA.ui ? 'var(--font)' : 'sans-serif');
    ctx.fillStyle = '#0f172a';
    ctx.textAlign = 'left';
    ctx.fillText(this.title, 16, 24);

    if (!this.labels.length || !this.series.length) {
      ctx.font = '12px sans-serif';
      ctx.fillStyle = '#94a3b8';
      ctx.textAlign = 'center';
      ctx.fillText('No data to display in chart', W / 2, H / 2);
      return;
    }

    var colors = ['#3b82f6', '#10b981', '#f59e0b', '#ec4899', '#8b5cf6', '#06b6d4'];

    if (this.type === 'pie') {
      this.renderPie(W, H, colors);
    } else if (this.type === 'line') {
      this.renderLine(W, H, colors);
    } else {
      this.renderColumn(W, H, colors);
    }
  };

  Chart.prototype.renderColumn = function (W, H, colors) {
    var ctx = this.ctx;
    var padL = 40, padR = 20, padT = 40, padB = 40;
    var plotW = W - padL - padR, plotH = H - padT - padB;

    // find max val
    var maxVal = 0;
    for (var s = 0; s < this.series.length; s++) {
      for (var i = 0; i < this.series[s].data.length; i++) {
        if (this.series[s].data[i] > maxVal) maxVal = this.series[s].data[i];
      }
    }
    maxVal = maxVal * 1.15 || 10;

    // Grid lines
    ctx.strokeStyle = '#e2e8f0';
    ctx.lineWidth = 1;
    for (var gl = 0; gl <= 4; gl++) {
      var gy = padT + (plotH / 4) * gl;
      ctx.beginPath();
      ctx.moveTo(padL, gy);
      ctx.lineTo(W - padR, gy);
      ctx.stroke();

      ctx.fillStyle = '#64748b';
      ctx.font = '10px monospace';
      ctx.textAlign = 'right';
      ctx.fillText(Math.round(maxVal - (maxVal / 4) * gl), padL - 6, gy + 3);
    }

    // Bars
    var numCats = this.labels.length;
    var groupW = plotW / numCats;
    var barW = Math.max(4, (groupW * 0.7) / this.series.length);

    for (var c = 0; c < numCats; c++) {
      for (var si = 0; si < this.series.length; si++) {
        var val = this.series[si].data[c] || 0;
        var barH = (val / maxVal) * plotH;
        var bx = padL + c * groupW + (groupW * 0.15) + si * barW;
        var by = padT + plotH - barH;

        ctx.fillStyle = colors[si % colors.length];
        ctx.fillRect(bx, by, barW - 2, barH);
      }

      // X-axis labels
      ctx.fillStyle = '#334155';
      ctx.font = '11px sans-serif';
      ctx.textAlign = 'center';
      var lbl = String(this.labels[c]).slice(0, 10);
      ctx.fillText(lbl, padL + c * groupW + groupW / 2, H - 16);
    }
  };

  Chart.prototype.renderLine = function (W, H, colors) {
    var ctx = this.ctx;
    var padL = 40, padR = 20, padT = 40, padB = 40;
    var plotW = W - padL - padR, plotH = H - padT - padB;

    var maxVal = 0;
    for (var s = 0; s < this.series.length; s++) {
      for (var i = 0; i < this.series[s].data.length; i++) {
        if (this.series[s].data[i] > maxVal) maxVal = this.series[s].data[i];
      }
    }
    maxVal = maxVal * 1.15 || 10;

    var numPts = this.labels.length;
    var stepX = numPts > 1 ? plotW / (numPts - 1) : plotW;

    for (var si = 0; si < this.series.length; si++) {
      ctx.strokeStyle = colors[si % colors.length];
      ctx.lineWidth = 2.5;
      ctx.beginPath();

      for (var p = 0; p < numPts; p++) {
        var v = this.series[si].data[p] || 0;
        var px = padL + p * stepX;
        var py = padT + plotH - (v / maxVal) * plotH;
        if (p === 0) ctx.moveTo(px, py);
        else ctx.lineTo(px, py);
      }
      ctx.stroke();
    }
  };

  Chart.prototype.renderPie = function (W, H, colors) {
    var ctx = this.ctx;
    var cx = W / 2, cy = H / 2 + 10;
    var radius = Math.min(W, H) / 2 - 30;

    var data = this.series[0] ? this.series[0].data : [];
    var total = data.reduce(function (a, b) { return a + b; }, 0) || 1;

    var startAngle = 0;
    for (var i = 0; i < data.length; i++) {
      var sliceAngle = (data[i] / total) * 2 * Math.PI;
      ctx.fillStyle = colors[i % colors.length];
      ctx.beginPath();
      ctx.moveTo(cx, cy);
      ctx.arc(cx, cy, radius, startAngle, startAngle + sliceAngle);
      ctx.closePath();
      ctx.fill();
      startAngle += sliceAngle;
    }
  };

  S.Chart = Chart;
})();
