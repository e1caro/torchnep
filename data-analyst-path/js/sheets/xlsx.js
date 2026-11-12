(function () {
  'use strict';
  var DA = (window.DA = window.DA || {});
  var S = (DA.sheets = DA.sheets || {});

  // XLSX reader & writer using fflate (MIT)

  function getFflate() {
    return window.fflate || (typeof require !== 'undefined' ? require('../../vendor/fflate/fflate.min.js') : null);
  }

  // XML Helpers
  function xmlEscape(s) {
    return String(s || '').replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
  }

  S.exportXlsx = function (workbook) {
    var fflate = getFflate();
    if (!fflate) return Promise.reject(new Error('fflate library not loaded'));

    var files = {};

    // 1. [Content_Types].xml
    files['[Content_Types].xml'] = fflate.strToU8(
      '<?xml version="1.0" encoding="UTF-8" standalone="yes"?>\n' +
      '<Types xmlns="http://schemas.openxmlformats.org/package/2006/content-types">\n' +
      '  <Default Extension="rels" ContentType="application/vnd.openxmlformats-package.relationships+xml"/>\n' +
      '  <Default Extension="xml" ContentType="application/xml"/>\n' +
      '  <Override PartName="/xl/workbook.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.sheet.main+xml"/>\n' +
      workbook.sheets.map(function (sh, i) {
        return '  <Override PartName="/xl/worksheets/sheet' + (i + 1) + '.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.worksheet+xml"/>';
      }).join('\n') +
      '</Types>'
    );

    // 2. _rels/.rels
    files['_rels/.rels'] = fflate.strToU8(
      '<?xml version="1.0" encoding="UTF-8" standalone="yes"?>\n' +
      '<Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships">\n' +
      '  <Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/officeDocument" Target="xl/workbook.xml"/>\n' +
      '</Relationships>'
    );

    // 3. xl/_rels/workbook.xml.rels
    files['xl/_rels/workbook.xml.rels'] = fflate.strToU8(
      '<?xml version="1.0" encoding="UTF-8" standalone="yes"?>\n' +
      '<Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships">\n' +
      workbook.sheets.map(function (sh, i) {
        return '  <Relationship Id="rId' + (i + 1) + '" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/worksheet" Target="worksheets/sheet' + (i + 1) + '.xml"/>';
      }).join('\n') +
      '</Relationships>'
    );

    // 4. xl/workbook.xml
    files['xl/workbook.xml'] = fflate.strToU8(
      '<?xml version="1.0" encoding="UTF-8" standalone="yes"?>\n' +
      '<workbook xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main" xmlns:r="http://schemas.openxmlformats.org/officeDocument/2006/relationships">\n' +
      '  <sheets>\n' +
      workbook.sheets.map(function (sh, i) {
        return '    <sheet name="' + xmlEscape(sh.name) + '" sheetId="' + (i + 1) + '" r:id="rId' + (i + 1) + '"/>';
      }).join('\n') +
      '  </sheets>\n' +
      '</workbook>'
    );

    // 5. xl/worksheets/sheetN.xml
    workbook.sheets.forEach(function (sh, i) {
      var rowsXml = '';
      var cells = sh.cells;
      var rowMap = {};

      Object.keys(cells).forEach(function (k) {
        var p = k.split(',').map(Number);
        rowMap[p[0]] = rowMap[p[0]] || [];
        rowMap[p[0]].push({ c: p[1], cell: cells[k] });
      });

      var rIndices = Object.keys(rowMap).map(Number).sort(function (a, b) { return a - b; });
      for (var ri = 0; ri < rIndices.length; ri++) {
        var r = rIndices[ri];
        var cList = rowMap[r].sort(function (a, b) { return a.c - b.c; });
        rowsXml += '<row r="' + (r + 1) + '">';
        for (var ci = 0; ci < cList.length; ci++) {
          var col = cList[ci].c;
          var cell = cList[ci].cell;
          var addr = S.addr(r, col);
          var v = cell.value;
          var f = cell.formula;

          if (f) {
            var formulaClean = f.startsWith('=') ? f.slice(1) : f;
            rowsXml += '<c r="' + addr + '"><f>' + xmlEscape(formulaClean) + '</f><v>' + (typeof v === 'number' ? v : xmlEscape(v)) + '</v></c>';
          } else if (typeof v === 'number') {
            rowsXml += '<c r="' + addr + '"><v>' + v + '</v></c>';
          } else if (typeof v === 'boolean') {
            rowsXml += '<c r="' + addr + '" t="b"><v>' + (v ? 1 : 0) + '</v></c>';
          } else if (v !== null && v !== undefined && v !== '') {
            rowsXml += '<c r="' + addr + '" t="inlineStr"><is><t>' + xmlEscape(v) + '</t></is></c>';
          }
        }
        rowsXml += '</row>';
      }

      files['xl/worksheets/sheet' + (i + 1) + '.xml'] = fflate.strToU8(
        '<?xml version="1.0" encoding="UTF-8" standalone="yes"?>\n' +
        '<worksheet xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main">\n' +
        '  <sheetData>' + rowsXml + '</sheetData>\n' +
        '</worksheet>'
      );
    });

    return new Promise(function (resolve, reject) {
      fflate.zip(files, function (err, data) {
        if (err) reject(err);
        else resolve(data);
      });
    });
  };

  S.importXlsx = function (bytes) {
    var fflate = getFflate();
    if (!fflate) return Promise.reject(new Error('fflate library not loaded'));

    return new Promise(function (resolve, reject) {
      fflate.unzip(bytes, function (err, unzipped) {
        if (err) return reject(err);

        var wb = new S.Workbook();
        wb.sheets = [];

        // Parse workbook.xml to get sheet names
        var wbXml = fflate.strFromU8(unzipped['xl/workbook.xml'] || new Uint8Array());
        var sheetNames = [];
        var mSheet = /<sheet[^>]*name="([^"]+)"/g, sm;
        while ((sm = mSheet.exec(wbXml))) {
          sheetNames.push(sm[1]);
        }

        if (!sheetNames.length) sheetNames.push('Sheet1');

        sheetNames.forEach(function (name, idx) {
          var sh = wb.addSheet(name);
          var shXml = fflate.strFromU8(unzipped['xl/worksheets/sheet' + (idx + 1) + '.xml'] || new Uint8Array());

          var mCell = /<c\s+r="([A-Z0-9]+)"([^>]*)>(.*?)<\/c>/gs, cm;
          while ((cm = mCell.exec(shXml))) {
            var addr = cm[1];
            var attr = cm[2];
            var inner = cm[3];
            var p = S.parseAddr(addr);
            if (!p) continue;

            var target = sh.ensureCell(p.r, p.c);

            // Check formula
            var mf = /<f>(.*?)<\/f>/.exec(inner);
            if (mf) target.formula = '=' + mf[1];

            // Check value
            var mv = /<v>(.*?)<\/v>/.exec(inner);
            var mt = /<t[^>]*>(.*?)<\/t>/.exec(inner);

            if (attr.indexOf('t="b"') >= 0 && mv) {
              target.raw = mv[1] === '1';
            } else if (mt) {
              target.raw = mt[1];
            } else if (mv) {
              target.raw = isFinite(+mv[1]) ? +mv[1] : mv[1];
            }
            target.value = target.raw;
          }
        });

        wb.recalc();
        resolve(wb);
      });
    });
  };
})();
