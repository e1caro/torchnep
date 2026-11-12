(function () {
  'use strict';
  var DA = (window.DA = window.DA || {});
  var S = (DA.sheets = DA.sheets || {});

  // Number format parser & formatter matching Excel
  // e.g. 0, 0.00, #,##0, #,##0.00, 0%, 0.00%, $#,##0.00, YYYY-MM-DD, HH:MM:SS, etc.
  
  function pad(n, len) {
    var s = String(n);
    while (s.length < (len || 2)) s = '0' + s;
    return s;
  }

  S.formatValue = function (val, fmt, sep) {
    sep = sep || { dec: '.', grp: ',' };
    if (val === null || val === undefined) return '';
    if (val instanceof S.Err) return val.code;
    if (typeof val === 'boolean') return val ? 'TRUE' : 'FALSE';
    if (typeof val === 'string') return val;
    if (typeof val !== 'number' || !isFinite(val)) return S.numText(val);

    if (!fmt || fmt === 'General' || fmt === '@') {
      return S.numText(val);
    }

    // Split format into sections: positive; negative; zero; text
    var sections = fmt.split(';');
    var sec = sections[0];
    if (val < 0 && sections.length > 1) {
      sec = sections[1];
      val = -val; // handled by format
    } else if (val === 0 && sections.length > 2) {
      sec = sections[2];
    }

    // Handle date/time formats
    if (/[ymdhs]/i.test(sec) && !/[#0%]/.test(sec)) {
      var d = S.ymd(val);
      var t = S.hms(val);
      var res = sec;
      res = res.replace(/yyyy/gi, String(d.y));
      res = res.replace(/yy/gi, String(d.y).slice(-2));
      res = res.replace(/mmmm/gi, ['January','February','March','April','May','June','July','August','September','October','November','December'][d.m - 1]);
      res = res.replace(/mmm/gi, ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'][d.m - 1]);
      res = res.replace(/mm/gi, pad(d.m, 2));
      res = res.replace(/m/gi, String(d.m));
      res = res.replace(/dddd/gi, ['Sunday','Monday','Tuesday','Wednesday','Thursday','Friday','Saturday'][S.weekday(val) % 7]);
      res = res.replace(/ddd/gi, ['Sun','Mon','Tue','Wed','Thu','Fri','Sat'][S.weekday(val) % 7]);
      res = res.replace(/dd/gi, pad(d.d, 2));
      res = res.replace(/d/gi, String(d.d));
      res = res.replace(/hh/gi, pad(t.h, 2));
      res = res.replace(/h/gi, String(t.h));
      res = res.replace(/ss/gi, pad(t.s, 2));
      res = res.replace(/s/gi, String(t.s));
      return res;
    }

    // Percentage
    var isPct = sec.indexOf('%') >= 0;
    if (isPct) val = val * 100;

    // Currency symbol or text wrappers
    var prefix = '', suffix = '';
    var mPre = /^([^#0.]+)/.exec(sec);
    if (mPre) prefix = mPre[1].replace(/\\/g, '').replace(/"/g, '');
    var mSuf = /([^#0.,]+)$/.exec(sec);
    if (mSuf) suffix = mSuf[1].replace(/\\/g, '').replace(/"/g, '');

    // Decimals
    var decPlaces = 0;
    var decIdx = sec.indexOf('.');
    if (decIdx >= 0) {
      var afterDec = sec.slice(decIdx + 1).replace(/[^0#]/g, '');
      decPlaces = afterDec.length;
    }

    var useGrouping = sec.indexOf(',') >= 0;
    var fixed = val.toFixed(decPlaces);
    var parts = fixed.split('.');
    var intPart = parts[0];
    if (useGrouping) {
      intPart = intPart.replace(/\B(?=(\d{3})+(?!\d))/g, sep.grp);
    }
    var formatted = intPart;
    if (decPlaces > 0) {
      formatted += sep.dec + parts[1];
    }
    return prefix + formatted + suffix;
  };

  S.parseInput = function (text, sep) {
    sep = sep || { dec: '.', grp: ',' };
    if (typeof text !== 'string') return text;
    var s = text.trim();
    if (!s) return null;
    if (s.startsWith('=')) return s; // formula

    var u = s.toUpperCase();
    if (u === 'TRUE' || u === 'VERDADERO') return true;
    if (u === 'FALSE' || u === 'FALSO') return false;
    if (S.ERR_RE.test(u)) return S.errFromCode(u) || s;

    // Currency or percentage cleanup
    var isPct = s.endsWith('%');
    var cleaned = s;
    if (isPct) cleaned = cleaned.slice(0, -1).trim();
    if (cleaned.startsWith('$') || cleaned.startsWith('€') || cleaned.startsWith('£')) {
      cleaned = cleaned.slice(1).trim();
    }

    // Number parsing with comma/dot decimal separator
    var normNum = cleaned;
    if (sep.dec === ',') {
      normNum = normNum.replace(/\./g, '').replace(',', '.');
    } else {
      normNum = normNum.replace(/,/g, '');
    }

    if (normNum !== '' && isFinite(+normNum)) {
      var n = +normNum;
      return isPct ? n / 100 : n;
    }

    // ISO Date parse YYYY-MM-DD
    var mDate = /^(\d{4})-(\d{1,2})-(\d{1,2})$/.exec(s);
    if (mDate) {
      var y = +mDate[1], m = +mDate[2], d = +mDate[3];
      if (m >= 1 && m <= 12 && d >= 1 && d <= 31) {
        return S.serial(y, m, d);
      }
    }

    return s;
  };
})();
