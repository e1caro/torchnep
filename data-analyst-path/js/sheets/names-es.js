(function () {
  'use strict';
  var DA = (window.DA = window.DA || {});
  var S = (DA.sheets = DA.sheets || {});

  // Spanish to English Excel function map
  S.ES_TO_EN = {
    'SUMA': 'SUM',
    'PROMEDIO': 'AVERAGE',
    'CONTAR': 'COUNT',
    'CONTARA': 'COUNTA',
    'CONTAR.SI': 'COUNTIF',
    'CONTAR.SI.CONJUNTO': 'COUNTIFS',
    'SUMAR.SI': 'SUMIF',
    'SUMAR.SI.CONJUNTO': 'SUMIFS',
    'PROMEDIO.SI': 'AVERAGEIF',
    'PROMEDIO.SI.CONJUNTO': 'AVERAGEIFS',
    'SI': 'IF',
    'SI.ERROR': 'IFERROR',
    'Y': 'AND',
    'O': 'OR',
    'NO': 'NOT',
    'BUSCARV': 'VLOOKUP',
    'BUSCARH': 'HLOOKUP',
    'BUSCARX': 'XLOOKUP',
    'COINCIDIR': 'MATCH',
    'COINCIDIRX': 'XMATCH',
    'INDICE': 'INDEX',
    'FILTRAR': 'FILTER',
    'ORDENAR': 'SORT',
    'UNICOS': 'UNIQUE',
    'ESPACIOS': 'TRIM',
    'NOMPROPIO': 'PROPER',
    'MAYUSC': 'UPPER',
    'MINUSC': 'LOWER',
    'CONCATENAR': 'CONCATENATE',
    'UNIRCADENAS': 'TEXTJOIN',
    'EXTRAE': 'MID',
    'IZQUIERDA': 'LEFT',
    'DERECHA': 'RIGHT',
    'LARGO': 'LEN',
    'HALLAR': 'SEARCH',
    'ENCONTRAR': 'FIND',
    'SUSTITUIR': 'SUBSTITUTE',
    'REEMPLAZAR': 'REPLACE',
    'VALOR': 'VALUE',
    'TEXTO': 'TEXT',
    'HOY': 'TODAY',
    'AHORA': 'NOW',
    'FECHA': 'DATE',
    'AÑO': 'YEAR',
    'MES': 'MONTH',
    'DIA': 'DAY',
    'DIAS': 'DAYS',
    'SIF': 'IFS',
    'CAMBIAR': 'SWITCH',
    'MAX': 'MAX',
    'MIN': 'MIN',
    'REDONDEAR': 'ROUND',
    'REDONDEAR.MAS': 'ROUNDUP',
    'REDONDEAR.MENOS': 'ROUNDDOWN',
    'ENTERO': 'INT',
    'ABS': 'ABS',
    'POTENCIA': 'POWER',
    'RAIZ': 'SQRT',
    'TRANSPONER': 'TRANSPOSE',
    'SECUENCIA': 'SEQUENCE',
    'MATRIZALEAT': 'RANDARRAY',
    'ALEATORIO': 'RAND',
    'ALEATORIO.ENTRE': 'RANDBETWEEN'
  };

  S.EN_TO_ES = {};
  Object.keys(S.ES_TO_EN).forEach(function (es) {
    S.EN_TO_ES[S.ES_TO_EN[es]] = es;
  });

  S.translateFormula = function (formula, toLang) {
    if (!formula || !formula.startsWith('=')) return formula;
    var dict = (toLang === 'es') ? S.EN_TO_ES : S.ES_TO_EN;
    // Replace identifiers preceding '('
    return formula.replace(/\b([A-Z0-9_.]+)\s*\(/gi, function (m, name) {
      var u = name.toUpperCase();
      return (dict[u] || u) + '(';
    });
  };
})();
