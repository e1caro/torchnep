(function (root) {
  'use strict';
  var K = (root.K = root.K || {});
  var A = (K.art = K.art || {});
  A.kaidoVariants = A.kaidoVariants || {};
  A.kaidoVariants['backlit'] = { name: 'Storm', svg: function (opts) { opts = opts || {};
    var g = '';
    for (var y = 0; y <= 560; y += 40) g += '<line x1="0" x2="400" y1="' + y + '" y2="' + y + '" stroke="#f0f" stroke-width="1"/><text x="4" y="' + (y + 12) + '" fill="#fff" font-size="12">' + y + '</text>';
    for (var x = 0; x <= 400; x += 50) g += '<line y1="0" y2="560" x1="' + x + '" x2="' + x + '" stroke="#0ff" stroke-width="1"/>';
    return '<svg xmlns="http://www.w3.org/2000/svg" class="kaido kaido-backlit ' + (opts.cls || '') + '" viewBox="0 0 400 560" role="img" aria-label="Kaido"><rect width="400" height="560" fill="#333"/>' + g + '</svg>'; } };
  if (typeof module !== 'undefined' && module.exports) module.exports = K;
})(typeof window !== 'undefined' ? window : globalThis);
