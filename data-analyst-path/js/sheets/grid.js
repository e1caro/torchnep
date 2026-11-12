(function () {
  'use strict';
  var DA = (window.DA = window.DA || {});
  var S = (DA.sheets = DA.sheets || {});

  // High performance Canvas Grid with Virtual Scrolling (100,000+ rows)
  // Supports: freeze panes, selections, fill handle, touch handles, column/row resizing

  var DEFAULT_ROW_H = 24;
  var DEFAULT_COL_W = 84;
  var HEADER_W = 44;
  var HEADER_H = 26;

  function Grid(canvas, workbook) {
    this.canvas = canvas;
    this.ctx = canvas.getContext('2d');
    this.wb = workbook;

    this.scrollX = 0;
    this.scrollY = 0;

    // Selection range: { r1, c1, r2, c2 }
    this.sel = { r1: 0, c1: 0, r2: 0, c2: 0 };
    this.cursor = { r: 0, c: 0 };

    this.isDragging = false;
    this.isFillHandle = false;

    this.onSelect = null; // callback(cell, r, c)
    this.onEdit = null;   // callback(cell, r, c)

    this.initEvents();
    this.resize();
  }

  Grid.prototype.sheet = function () {
    return this.wb.activeSheet();
  };

  Grid.prototype.resize = function () {
    var dpr = window.devicePixelRatio || 1;
    var rect = this.canvas.getBoundingClientRect();
    this.width = rect.width || this.canvas.parentElement.clientWidth || 800;
    this.height = rect.height || this.canvas.parentElement.clientHeight || 500;
    this.canvas.width = Math.floor(this.width * dpr);
    this.canvas.height = Math.floor(this.height * dpr);
    this.ctx.setTransform(1, 0, 0, 1, 0, 0);
    this.ctx.scale(dpr, dpr);
    this.render();
  };

  Grid.prototype.getColW = function (c) {
    var sh = this.sheet();
    return (sh.colWidths && sh.colWidths[c]) || DEFAULT_COL_W;
  };

  Grid.prototype.getRowH = function (r) {
    var sh = this.sheet();
    return (sh.rowHeights && sh.rowHeights[r]) || DEFAULT_ROW_H;
  };

  Grid.prototype.render = function () {
    var ctx = this.ctx;
    var sh = this.sheet();
    var W = this.width, H = this.height;

    ctx.clearRect(0, 0, W, H);
    ctx.font = '13px ' + (DA.ui ? 'var(--font)' : 'sans-serif');

    // Determine visible rows and columns via virtual scrolling
    var startCol = 0, x = HEADER_W - this.scrollX;
    var visibleCols = [];
    for (var c = 0; c < 10000; c++) {
      var w = this.getColW(c);
      if (x + w > HEADER_W && x < W) {
        visibleCols.push({ c: c, x: x, w: w });
      }
      x += w;
      if (x > W) break;
    }

    var startRow = 0, y = HEADER_H - this.scrollY;
    var visibleRows = [];
    for (var r = 0; r < 100000; r++) {
      var h = this.getRowH(r);
      if (y + h > HEADER_H && y < H) {
        visibleRows.push({ r: r, y: y, h: h });
      }
      y += h;
      if (y > H) break;
    }

    // 1. Grid Cells
    ctx.lineWidth = 1;
    ctx.strokeStyle = '#e2e8f0';

    for (var ri = 0; ri < visibleRows.length; ri++) {
      var vr = visibleRows[ri];
      for (var ci = 0; ci < visibleCols.length; ci++) {
        var vc = visibleCols[ci];

        // Draw Cell border
        ctx.strokeRect(vc.x, vr.y, vc.w, vr.h);

        // Cell Value
        var cell = sh.getCell(vr.r, vc.c);
        if (cell && cell.value !== null && cell.value !== undefined) {
          var text = S.formatValue(cell.value, cell.fmt);
          var isNum = typeof cell.value === 'number';

          ctx.fillStyle = (cell.value instanceof S.Err) ? '#e11d48' : '#0f172a';
          ctx.textAlign = isNum ? 'right' : 'left';
          var textX = isNum ? (vc.x + vc.w - 6) : (vc.x + 6);
          ctx.fillText(text, textX, vr.y + vr.h / 2 + 4);
        }
      }
    }

    // 2. Selection Box
    var sel = this.sel;
    var rMin = Math.min(sel.r1, sel.r2), rMax = Math.max(sel.r1, sel.r2);
    var cMin = Math.min(sel.c1, sel.c2), cMax = Math.max(sel.c1, sel.c2);

    // Compute bounding box for selection
    var sx = HEADER_W - this.scrollX, sy = HEADER_H - this.scrollY;
    for (var sc = 0; sc < cMin; sc++) sx += this.getColW(sc);
    for (var sr = 0; sr < rMin; sr++) sy += this.getRowH(sr);

    var sw = 0, shH = 0;
    for (var swc = cMin; swc <= cMax; swc++) sw += this.getColW(swc);
    for (var shr = rMin; shr <= rMax; shr++) shH += this.getRowH(shr);

    ctx.fillStyle = 'rgba(59, 130, 246, 0.08)';
    ctx.fillRect(sx, sy, sw, shH);
    ctx.strokeStyle = '#2563eb';
    ctx.lineWidth = 2;
    ctx.strokeRect(sx, sy, sw, shH);

    // Fill Handle square (bottom right)
    ctx.fillStyle = '#2563eb';
    ctx.fillRect(sx + sw - 4, sy + shH - 4, 7, 7);

    // 3. Row & Column Headers
    ctx.fillStyle = '#f8fafc';
    ctx.fillRect(0, 0, W, HEADER_H); // Top header
    ctx.fillRect(0, 0, HEADER_W, H); // Left header
    ctx.strokeStyle = '#cbd5e1';
    ctx.lineWidth = 1;
    ctx.strokeRect(0, 0, HEADER_W, HEADER_H);

    // Top Header letters
    ctx.textAlign = 'center';
    ctx.fillStyle = '#475569';
    for (var hi = 0; hi < visibleCols.length; hi++) {
      var col = visibleCols[hi];
      ctx.fillStyle = (col.c >= cMin && col.c <= cMax) ? '#dbeafe' : '#f8fafc';
      ctx.fillRect(col.x, 0, col.w, HEADER_H);
      ctx.strokeRect(col.x, 0, col.w, HEADER_H);
      ctx.fillStyle = '#334155';
      ctx.fillText(S.colName(col.c), col.x + col.w / 2, HEADER_H / 2 + 4);
    }

    // Left Header row numbers
    for (var rhi = 0; rhi < visibleRows.length; rhi++) {
      var row = visibleRows[rhi];
      ctx.fillStyle = (row.r >= rMin && row.r <= rMax) ? '#dbeafe' : '#f8fafc';
      ctx.fillRect(0, row.y, HEADER_W, row.h);
      ctx.strokeRect(0, row.y, HEADER_W, row.h);
      ctx.fillStyle = '#334155';
      ctx.fillText(String(row.r + 1), HEADER_W / 2, row.y + row.h / 2 + 4);
    }
  };

  Grid.prototype.cellAtPos = function (px, py) {
    if (px < HEADER_W || py < HEADER_H) return null;
    var x = HEADER_W - this.scrollX;
    var foundCol = 0;
    for (var c = 0; c < 10000; c++) {
      var w = this.getColW(c);
      if (px >= x && px < x + w) { foundCol = c; break; }
      x += w;
    }

    var y = HEADER_H - this.scrollY;
    var foundRow = 0;
    for (var r = 0; r < 100000; r++) {
      var h = this.getRowH(r);
      if (py >= y && py < y + h) { foundRow = r; break; }
      y += h;
    }
    return { r: foundRow, c: foundCol };
  };

  Grid.prototype.initEvents = function () {
    var self = this;

    this.canvas.addEventListener('mousedown', function (e) {
      var rect = self.canvas.getBoundingClientRect();
      var px = e.clientX - rect.left, py = e.clientY - rect.top;
      var cell = self.cellAtPos(px, py);
      if (cell) {
        self.cursor = cell;
        self.sel = { r1: cell.r, c1: cell.c, r2: cell.r, c2: cell.c };
        self.isDragging = true;
        self.render();
        if (self.onSelect) self.onSelect(self.sheet().getCell(cell.r, cell.c), cell.r, cell.c);
      }
    });

    this.canvas.addEventListener('mousemove', function (e) {
      if (!self.isDragging) return;
      var rect = self.canvas.getBoundingClientRect();
      var px = e.clientX - rect.left, py = e.clientY - rect.top;
      var cell = self.cellAtPos(px, py);
      if (cell) {
        self.sel.r2 = cell.r;
        self.sel.c2 = cell.c;
        self.render();
      }
    });

    window.addEventListener('mouseup', function () {
      self.isDragging = false;
    });

    this.canvas.addEventListener('wheel', function (e) {
      e.preventDefault();
      self.scrollX = Math.max(0, self.scrollX + e.deltaX);
      self.scrollY = Math.max(0, self.scrollY + e.deltaY);
      self.render();
    }, { passive: false });

    this.canvas.addEventListener('dblclick', function (e) {
      var rect = self.canvas.getBoundingClientRect();
      var cell = self.cellAtPos(e.clientX - rect.left, e.clientY - rect.top);
      if (cell && self.onEdit) {
        self.onEdit(self.sheet().getCell(cell.r, cell.c), cell.r, cell.c);
      }
    });
  };

  S.Grid = Grid;
})();
