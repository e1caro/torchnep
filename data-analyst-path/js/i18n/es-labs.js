/* Spanish (Spain): the four labs (DotSheets, DotPython, DotBI and SQLab): worlds, levels, worked examples and
 * challenges. Formulas and code stay as they are. T.<lab> = { tagline, help, worlds: [[title, about, [[level,
 * example title, example text], ...]], ...], ch: { id: { t: title, k: task, h: hint, c: checklist, o: options,
 * y: why, a: ask, f: finding } } }. Options keep their order, so the right answer does not move. */
(function () {
  'use strict';
  var DA = window.DA, I = DA.i18n;
  var T = (DA.labsEs = DA.labsEs || {});

  function setCh(c, t) {
    if (!c || !t) return;
    if (t.t) { I.learn(c.title, t.t); c.title = t.t; }
    if (t.k) c.task = t.k;
    if (t.h) c.hint = t.h;
    if (t.c && c.checklist && t.c.length === c.checklist.length) c.checklist = t.c;
    if (t.o && c.options && t.o.length === c.options.length) c.options = t.o;
    if (t.y) c.why = t.y;
    if (t.a && c.ask) {
      if (t.a.w) c.ask.who = t.a.w;
      if (t.a.s) c.ask.says = t.a.s;
      if (t.a.q) c.ask.q = t.a.q;
      if (t.a.o && c.ask.options && t.a.o.length === c.ask.options.length) c.ask.options = t.a.o;
      if (t.a.y) c.ask.why = t.a.y;
    }
    if (t.f && c.finding) {
      if (t.f.q) c.finding.q = t.f.q;
      if (t.f.o && c.finding.options && t.f.o.length === c.finding.options.length) c.finding.options = t.f.o;
      if (t.f.y) c.finding.why = t.f.y;
    }
  }
  DA.labsEs.setCh = setCh;

  function overlayLab(L, t) {
    if (!L || !t) return;
    if (t.tagline) L.tagline = t.tagline;
    if (t.help) L.help = t.help;
    (L.worlds || []).forEach(function (w, wi) {
      var tw = t.worlds && t.worlds[wi];
      if (tw) {
        I.learn(w.title, tw[0]); w.title = tw[0];
        if (tw[1]) { I.learn(w.about, tw[1]); w.about = tw[1]; }
      }
      (w.levels || []).forEach(function (lv, li) {
        var tl = tw && tw[2] && tw[2][li];
        if (tl) {
          I.learn(lv.title, tl[0]); lv.title = tl[0];
          if (lv.example && tl[1]) { lv.example.title = tl[1]; if (tl[2]) lv.example.explain = tl[2]; }
        }
        (lv.challenges || []).forEach(function (c) { if (c && t.ch) setCh(c, t.ch[c.id]); });
      });
    });
  }

  I.content(function () {
    overlayLab(DA.labSheets, T.sheets);
    overlayLab(DA.labPython, T.python);
    overlayLab(DA.labBI, T.bi);
    // The first DotSheets challenges also live in their old list.
    (DA.sheetsChallenges || []).forEach(function (c) { if (T.sheets) setCh(c, T.sheets.ch[c.id]); });
  });

  /* ================================================================ DotSheets */
  T.sheets = {
    tagline: 'Una hoja de cálculo de verdad en tu navegador: fórmulas al estilo de Excel, búsquedas y matrices dinámicas, con datos de práctica.',
    help: 'Pulsa una celda o muévete con las flechas. Escribe para sustituir una celda; F2 o doble clic para editarla; Intro guarda y baja, Tab va a la derecha y Escape cancela. Ctrl+C / Ctrl+V copian y pegan, Ctrl+Z deshace. En el móvil, toca una celda para seleccionarla y vuelve a tocarla para escribir. Puedes escribir las funciones en inglés (SUM) o en español (SUMA) y separar los argumentos con , o ;. Columnas: A order_id, B order_date, C store_city, D channel, E customer_id, F product, G category, H qty, I unit_price.',
    worlds: [],
    ch: {},
  };
  var W = T.sheets.worlds, C = T.sheets.ch;

  W.push(['Fórmulas básicas', 'Aritmética, resúmenes, referencias con $ y SI.', [
    ['Primeras fórmulas', 'Ingresos de una línea', 'Una fórmula empieza por =. Hace referencia a otras celdas, así que se actualiza cuando cambian.'],
    ['Resúmenes', 'Total de una columna', 'Un rango como H2:H100 cubre todas las celdas de H2 a H100. SUM (SUMA), AVERAGE (PROMEDIO), MIN y MAX lo convierten en un número.'],
    ['Referencias absolutas', 'Fija una celda con $', '$ fija una columna o una fila, así que la referencia no cambia al copiar la fórmula hacia abajo. F4 pone los $ por ti.'],
    ['Lógica', 'SI', 'IF(prueba, valor si es verdadero, valor si es falso), o SI en español. Las respuestas de texto van entre comillas dobles.'],
  ]]);
  C.s_l1_2_1 = { t: 'Calcula los ingresos de una línea', k: 'En la columna <b>J</b>, calcula los ingresos totales de la línea de la fila 2 multiplicando la cantidad (<b>H2</b>) por el precio unitario (<b>I2</b>).', h: 'Escribe <code>=H2*I2</code> en la celda J2.' };
  C.sx_w1_1 = { t: 'Precio con un 10 % de impuesto', k: 'En <b>K2</b>, muestra el precio unitario de <b>I2</b> con un 10 % de impuesto añadido (multiplica por 1,1).', h: 'Escribe <code>=I2*1.1</code> en K2.' };
  C.sx_w1_2 = { t: 'Redondea los ingresos', k: 'En <b>L2</b>, calcula cantidad × precio unitario de la fila 2, redondeado a 1 decimal.', h: 'Envuelve el producto en ROUND (REDONDEAR): <code>=ROUND(H2*I2, 1)</code>.' };
  C.s_l1_3_1 = { t: 'Calcula la cantidad media por línea', k: 'Calcula la cantidad media de los pedidos de la columna H con <code>=AVERAGE(H2:H100)</code>.', h: 'Escribe <code>=AVERAGE(H2:H100)</code> en una celda vacía.' };
  C.s_l1_3_2 = { t: 'Encuentra la cantidad máxima pedida', k: 'Encuentra la cantidad máxima pedida en la columna H con <code>=MAX(H2:H100)</code>.', h: 'Usa <code>=MAX(H2:H100)</code>.' };
  C.sx_w1_3 = { t: 'Cantidad total', k: 'En <b>L1</b>, suma las cantidades de <b>H2:H100</b>.', h: 'Usa <code>=SUM(H2:H100)</code>.' };
  C.s_l1_7_1 = { t: 'Un multiplicador de impuesto con parámetro', k: 'Pon el tipo 0.21 en la celda <b>M1</b> y calcula el impuesto de los ingresos de la fila 2 en M2 con <code>=J2*$M$1</code> (referencia absoluta).', h: 'Pon <code>0.21</code> en M1 y <code>=J2*$M$1</code> en M2.' };
  C.sx_w1_4 = { t: 'Peso sobre el total', k: 'En <b>K2</b>, muestra la cantidad de la fila 2 como proporción de la cantidad total de <b>H2:H100</b>. Fija el rango del total con $.', h: 'Divide entre un total fijado: <code>=H2/SUM($H$2:$H$100)</code>.' };
  C.sx_w1_5 = { t: 'Total acumulado', k: 'En <b>K3</b>, calcula el total acumulado de la cantidad desde H2 hasta la fila 3. Fija solo el inicio del rango.', h: 'Fija el inicio, no el final: <code>=SUM($H$2:H3)</code>.' };
  C.s_l1_6_2 = { t: 'Etiquetas de texto con una condición', k: 'Clasifica el tamaño del pedido de la fila 2: si la cantidad <b>H2</b> es >= 3, devuelve <code>"Large"</code>; si no, <code>"Standard"</code>.', h: 'Usa <code>=IF(H2>=3, "Large", "Standard")</code>.' };
  C.s_l1_7_2 = { t: 'Fórmula de comprobación de cuadre', k: 'Crea una celda de cuadre automático: si la diferencia entre los ingresos totales y la suma de las partes es menor que 0.01, devuelve <code>"✓ Balanced"</code>; si no, <code>"⚠️ Error"</code>.', h: 'Usa <code>=IF(ABS(SUM(H2:H10)-SUM(H2:H10))<0.01, "✓ Balanced", "⚠️ Error")</code>.' };
  C.s_l1_7_3 = { t: 'Un cálculo compacto con LET', k: 'Usa la función <code>LET</code> para poner nombre a la cantidad y al precio unitario en una sola fórmula: <code>=LET(q, H2, p, I2, q*p)</code>.', h: 'Escribe <code>=LET(q, H2, p, I2, q*p)</code>.' };

  W.push(['Datos limpios', 'Arregla texto desordenado, números guardados como texto, celdas vacías y fechas.', [
    ['Limpieza de texto', 'Quita espacios y arregla mayúsculas', 'TRIM (ESPACIOS) quita los espacios de más; PROPER (NOMPROPIO), UPPER (MAYUSC) y LOWER (MINUSC) arreglan las mayúsculas. Anídalas: la de dentro se ejecuta primero.'],
    ['Números a partir de texto', 'De texto a número', 'SUBSTITUTE (SUSTITUIR) quita un carácter; VALUE (VALOR) convierte el texto que queda en un número de verdad que puedes sumar.'],
    ['Celdas vacías y fechas', 'Cuenta las vacías', 'COUNTBLANK (CONTAR.BLANCO) cuenta las celdas vacías: una comprobación rápida de calidad antes de cualquier análisis.'],
    ['Combinar y separar', 'Une con &', '& pega textos. TEXTJOIN (UNIRCADENAS) hace lo mismo con muchas celdas y un único separador.'],
  ]]);
  C.s_l1_1_1 = { t: 'Quita espacios a los nombres de clientes', k: 'En una columna vacía (por ejemplo, la <b>H</b>), usa <code>=TRIM(C2)</code> o <code>=PROPER(TRIM(C2))</code> para limpiar los nombres de clientes desde la fila 2.', h: 'Escribe <code>=TRIM(C2)</code> en la celda H2 y pulsa Intro.' };
  C.s_l1_1_2 = { t: 'Normaliza las ciudades con PROPER', k: 'En una columna vacía, usa <code>=PROPER(G2)</code> para poner en mayúscula inicial el nombre de la ciudad de la celda G2.', h: 'Escribe <code>=PROPER(G2)</code> en una celda vacía de la fila 2.' };
  C.sx_w2_1 = { t: 'Producto en mayúsculas', k: 'Ahora los datos son el archivo desordenado. Columnas: A Order ID, B Date, C Customer, D Product, E Qty, F Price, G City (escritas a mano: espacios, erratas, texto en columnas numéricas). En <b>H2</b>, muestra el producto de <b>D2</b> sin espacios de más y en mayúsculas.', h: 'Anídalas: <code>=UPPER(TRIM(D2))</code>.' };
  C.s_l1_1_3 = { t: 'Limpia los precios numéricos', k: 'Saca o limpia el precio de la celda F2 como número de verdad con <code>=VALUE(SUBSTITUTE(F2, "$", ""))</code> o algo equivalente.', h: 'Usa <code>=VALUE(SUBSTITUTE(F2, "$", ""))</code> para que se convierta en número.' };
  C.s_l1_5_3 = { t: 'Controla los errores con IFERROR', k: 'Protege de errores la lectura de la cantidad con <code>=IFERROR(VALUE(E2), 1)</code>.', h: 'Escribe <code>=IFERROR(VALUE(E2), 1)</code> en una celda vacía de la fila 2.' };
  C.sx_w2_2 = { t: 'Longitud de un nombre', k: 'En <b>H2</b>, cuenta los caracteres del nombre del cliente de <b>C2</b> después de quitar los espacios de más.', h: 'LEN (LARGO) cuenta caracteres: <code>=LEN(TRIM(C2))</code>.' };
  C.s_l1_5_1 = { t: 'Detecta registros de clientes vacíos', k: 'Averigua si a la celda C2 le falta el nombre con <code>=IF(ISBLANK(C2), "Missing", "Valid")</code>.', h: 'Usa <code>=IF(ISBLANK(C2), "Missing", "Valid")</code>.' };
  C.s_l1_5_2 = { t: 'Saca el año de la fecha del pedido', k: 'Saca el año de cuatro cifras de la fecha de la celda B2 con <code>=YEAR(B2)</code> o <code>=LEFT(B2, 4)</code>.', h: 'Usa <code>=YEAR(B2)</code>.' };
  C.sx_w2_3 = { t: 'Cuenta las cantidades que faltan', k: 'En <b>J1</b>, cuenta cuántas cantidades de <b>E2:E129</b> están vacías.', h: 'Usa <code>=COUNTBLANK(E2:E129)</code>.' };
  C.s_l1_6_1 = { t: 'Combina columnas con TEXTJOIN', k: 'Combina la ciudad y el canal de la fila 2 separados por un guion con <code>=TEXTJOIN(" - ", TRUE, C2, D2)</code>.', h: 'Usa <code>=TEXTJOIN(" - ", TRUE, C2, D2)</code>.' };
  C.sx_w2_4 = { t: 'Etiqueta del pedido', k: 'En <b>K2</b>, construye una etiqueta como <code>1-London</code>: el order_id de A2, un guion y la ciudad de C2.', h: 'Usa &: <code>=A2&"-"&C2</code>.' };
  C.sx_w2_5 = { t: 'Mes del pedido', k: 'En <b>K2</b>, saca el número de mes (1 a 12) de la fecha del pedido de <b>B2</b>.', h: 'Usa <code>=MONTH(B2)</code>.' };

  W.push(['Análisis con condiciones', 'SUMIF, COUNTIFS, AVERAGEIFS y SUMPRODUCT.', [
    ['Contar y sumar con una condición', 'COUNTIF', 'COUNTIF(rango, condición), o CONTAR.SI, cuenta las celdas que cumplen la condición. SUMIF (SUMAR.SI) suma un segundo rango donde el primero cumple.'],
    ['Varias condiciones', 'SUMIFS', 'Las versiones IFS (SI.CONJUNTO) reciben primero el rango que se suma y después parejas de rango y condición. Todas las condiciones tienen que cumplirse.'],
    ['Ingresos', 'SUMPRODUCT', 'SUMPRODUCT (SUMAPRODUCTO) multiplica dos rangos fila a fila y suma los resultados: ingresos sin columna auxiliar.'],
    ['Proporciones', 'Una proporción', 'Una proporción es una parte dividida entre el todo. Dale formato de porcentaje o redondéala.'],
  ]]);
  C.s_l1_2_2 = { t: 'Suma con condición con SUMIF', k: 'Calcula la cantidad total de artículos vendidos de la categoría <code>"Coffee"</code> con <code>=SUMIF(G2:G100, "Coffee", H2:H100)</code>.', h: 'En una celda vacía, escribe <code>=SUMIF(G2:G100, "Coffee", H2:H100)</code>.' };
  C.s_l1_2_3 = { t: 'Varios criterios con COUNTIFS', k: 'Cuenta cuántos pedidos hubo en <code>"Madrid"</code> con una cantidad mayor o igual que <code>2</code> con <code>=COUNTIFS(C2:C100, "Madrid", H2:H100, ">=2")</code>.', h: 'Escribe <code>=COUNTIFS(C2:C100, "Madrid", H2:H100, ">=2")</code>.' };
  C.sx_w3_1 = { t: 'Líneas a domicilio', k: 'En <b>K1</b>, cuenta las filas de <b>D2:D100</b> cuyo canal es <code>delivery</code>.', h: 'Usa <code>=COUNTIF(D2:D100, "delivery")</code>.' };
  C.sx_w3_2 = { t: 'Café en Madrid', k: 'En <b>K1</b>, suma la cantidad de <code>Coffee</code> vendida en <code>Madrid</code> (filas 2 a 100).', h: 'SUMIFS recibe primero el rango que se suma: <code>=SUMIFS(H2:H100, G2:G100, "Coffee", C2:C100, "Madrid")</code>.' };
  C.sx_w3_3 = { t: 'Cantidad media en Londres', k: 'En <b>K1</b>, calcula la cantidad media de las filas de London (filas 2 a 100).', h: 'Usa <code>=AVERAGEIFS(H2:H100, C2:C100, "London")</code>.' };
  C.sx_w3_4 = { t: 'Recogidas de bollería', k: 'En <b>K1</b>, cuenta las filas que son <code>Bakery</code> Y del canal <code>pickup</code> (filas 2 a 100).', h: 'Dos parejas: <code>=COUNTIFS(G2:G100, "Bakery", D2:D100, "pickup")</code>.' };
  C.s_l1_3_3 = { t: 'Ingresos totales con SUMPRODUCT', k: 'Calcula los ingresos totales de la tienda directamente, sin columna auxiliar, con <code>=SUMPRODUCT(H2:H50, I2:I50)</code>.', h: 'Usa <code>=SUMPRODUCT(H2:H50, I2:I50)</code>.' };
  C.sx_w3_5 = { t: 'Precio unitario medio', k: 'En <b>K1</b>, calcula el precio unitario medio de <b>I2:I100</b>.', h: 'Usa <code>=AVERAGE(I2:I100)</code>.' };
  C.sx_w3_6 = { t: 'Ingresos de las 20 primeras líneas', k: 'En <b>K1</b>, calcula los ingresos (cantidad × precio unitario, sumados) de las filas 2 a 21.', h: 'Usa <code>=SUMPRODUCT(H2:H21, I2:I21)</code>.' };
  C.sx_w3_7 = { t: 'Peso del café en la cantidad', k: 'En <b>K1</b>, calcula qué proporción de toda la cantidad (filas 2 a 100) es <code>Coffee</code>.', h: 'Parte entre todo: <code>=SUMIF(G2:G100, "Coffee", H2:H100)/SUM(H2:H100)</code>.' };
  C.sx_w3_8 = { t: 'Peso del reparto, redondeado', k: 'En <b>K1</b>, calcula la proporción de las filas 2 a 100 cuyo canal es <code>delivery</code>, redondeada a 2 decimales.', h: 'Envuelve la proporción en ROUND: <code>=ROUND(COUNTIF(D2:D100, "delivery")/COUNTA(D2:D100), 2)</code>.' };
  C.sx_w3_9 = { t: 'Clientes distintos', k: 'En <b>K1</b>, cuenta cuántos customer_id distintos aparecen en <b>E2:E100</b>.', h: 'UNIQUE y después cuenta: <code>=COUNTA(UNIQUE(E2:E100))</code>.' };

  W.push(['Búsquedas y matrices dinámicas', 'XLOOKUP, INDEX/MATCH, FILTER, SORT, UNIQUE.', [
    ['Búsquedas', 'XLOOKUP', 'XLOOKUP(qué, dónde buscar, qué devolver), o BUSCARX. INDEX/MATCH (INDICE/COINCIDIR) y VLOOKUP (BUSCARV) hacen lo mismo en archivos más antiguos.'],
    ['Matrices dinámicas', 'Desbordar', 'Una fórmula devuelve muchos valores que se desbordan en las celdas de debajo. Deja esas celdas vacías o te saldrá #SPILL! (#¡DESBORDAMIENTO!).'],
    ['Valores más altos', 'LARGE y SMALL', 'LARGE(rango, k), o K.ESIMO.MAYOR, devuelve el k-ésimo valor más grande; SMALL, el k-ésimo más pequeño. TAKE se queda con las primeras filas de una lista.'],
    ['Responde preguntas de negocio', 'FILTER con una condición', 'FILTER (FILTRAR) devuelve solo las filas en las que la condición es TRUE: un extracto vivo que se actualiza solo.'],
  ]]);
  C.s_l1_4_2 = { t: 'Búsqueda moderna con XLOOKUP', k: 'Busca el nombre de producto que corresponde al ID de pedido de A2 con <code>=XLOOKUP(A2, A2:A50, F2:F50)</code>.', h: 'Usa <code>=XLOOKUP(A2, A2:A50, F2:F50)</code>.' };
  C.sx_w4_1 = { t: 'INDEX y MATCH', k: 'En <b>K1</b>, devuelve el producto de la primera fila cuyo order_id es 5, usando INDEX y MATCH.', h: 'MATCH encuentra la fila e INDEX la devuelve: <code>=INDEX(F2:F100, MATCH(5, A2:A100, 0))</code>.' };
  C.sx_w4_2 = { t: 'VLOOKUP', k: 'En <b>K1</b>, usa VLOOKUP para devolver el producto (6.ª columna de A:F) del order_id 10, con coincidencia exacta.', h: 'FALSE significa coincidencia exacta: <code>=VLOOKUP(10, A2:F100, 6, FALSE)</code>.' };
  C.s_l1_4_1 = { t: 'Categorías distintas y ordenadas', k: 'Genera una lista automática y ordenada de categorías únicas con <code>=SORT(UNIQUE(G2:G50))</code>.', h: 'En la celda K2, escribe <code>=SORT(UNIQUE(G2:G50))</code>.' };
  C.s_l1_4_3 = { t: 'Filtrado dinámico con FILTER', k: 'Filtra los pedidos para mostrar solo las ventas de la ciudad <code>"Madrid"</code> con <code>=FILTER(F2:H50, C2:C50="Madrid")</code>.', h: 'En una celda vacía, escribe <code>=FILTER(F2:H50, C2:C50="Madrid")</code>.' };
  C.s_l1_6_3 = { t: 'Catálogo limpio de productos distintos', k: 'Desborda una lista única de productos de la columna F con <code>=UNIQUE(F2:F50)</code>.', h: 'En una celda vacía, escribe <code>=UNIQUE(F2:F50)</code>.' };
  C.sx_w4_3 = { t: 'Segundo precio más alto', k: 'En <b>K1</b>, devuelve el segundo precio unitario más alto de <b>I2:I100</b>.', h: 'Usa <code>=LARGE(I2:I100, 2)</code>.' };
  C.sx_w4_4 = { t: 'El precio más barato', k: 'En <b>K1</b>, devuelve el precio unitario más bajo de <b>I2:I100</b> usando SMALL.', h: 'Usa <code>=SMALL(I2:I100, 1)</code>.' };
  C.sx_w4_5 = { t: 'Las dos primeras ciudades', k: 'En <b>K2</b>, desborda los dos primeros nombres de ciudad en orden alfabético (de C2:C100, sin repetir).', h: 'Ordena la lista única y quédate con 2: <code>=TAKE(SORT(UNIQUE(C2:C100)), 2)</code>.' };
  C.sx_w4_6 = { t: 'Precio de un Muffin', k: 'En <b>K1</b>, busca el precio unitario de <code>Muffin</code> (producto en F, precio en I).', h: 'Usa <code>=XLOOKUP("Muffin", F2:F100, I2:I100)</code>.' };
  C.sx_w4_7 = { t: 'Líneas grandes', k: 'En <b>K2</b>, desborda el order_id de cada fila (2 a 100) con una cantidad de 3 o más.', h: 'Usa <code>=FILTER(A2:A100, H2:H100>=3)</code>.' };
  C.sx_w4_8 = { t: 'Cuántas líneas a domicilio', k: 'En <b>K1</b>, cuenta las filas a domicilio (2 a 100) filtrando los productos con FILTER y contando lo que vuelve.', h: 'Cuenta la lista filtrada: <code>=COUNTA(FILTER(F2:F100, D2:D100="delivery"))</code>.' };

  W.push(['Fechas y periodos', 'Meses, días de la semana, finales de mes y etiquetas, una caza de errores y unas cuantas fechas que predecir.', [
    ['Partes de una fecha', 'Trozos de una fecha', 'Una fecha es un número de días, así que se puede descomponer: YEAR (AÑO), MONTH (MES), DAY (DIA) y WEEKDAY (DIASEM; con 2, el lunes es 1 y el domingo 7).'],
    ['Finales de mes y etiquetas', 'EOMONTH y TEXT', 'EOMONTH(fecha, 0), o FIN.MES, es el último día de ese mes (1 para el siguiente). TEXT (TEXTO) convierte una fecha en la etiqueta que elijas.'],
    ['Caza de errores', 'Lee las referencias', 'La mayoría de los errores de una hoja son una columna equivocada o un rango que se queda corto. Pulsa la fórmula y mira los rangos de colores.'],
    ['Predice la fecha', 'Piensa primero', 'DATE(año, mes, día), o FECHA, construye una fecha; las demás funciones la descomponen.'],
  ]]);
  C.sx_w5_1 = { t: 'Número de mes', k: 'En <b>L2</b>, el número de mes (1 a 12) de la fecha del pedido de <b>B2</b>.', h: 'Usa <code>=MONTH(B2)</code>.' };
  C.sx_w5_2 = { t: 'Día de la semana', k: 'En <b>L2</b>, el día de la semana de <b>B2</b>, con el lunes como 1 y el domingo como 7.', h: 'WEEKDAY admite un segundo argumento: <code>=WEEKDAY(B2, 2)</code>.' };
  C.sx_w5_3 = { t: 'Unidades vendidas en marzo', k: 'En <b>L1</b>, la cantidad total (<b>H</b>) de las filas 2 a 500 con fecha de marzo.', h: 'SUMPRODUCT multiplica una prueba TRUE/FALSE por las cantidades: <code>=SUMPRODUCT((MONTH(B2:B500)=3)*H2:H500)</code>.' };
  C.sx_w5_4 = { t: 'Días del mes', k: 'En <b>L2</b>, cuántos días tiene el mes de <b>B2</b>.', h: 'El número de día del final de mes: <code>=DAY(EOMONTH(B2, 0))</code>.' };
  C.sx_w5_5 = { t: 'Etiqueta del mes', k: 'En <b>L2</b>, una etiqueta como <code>2025-03</code> para la fecha de <b>B2</b>.', h: 'Usa <code>=TEXT(B2, "yyyy-mm")</code>.' };
  C.sx_w5_6 = { t: 'Días hasta fin de mes', k: 'En <b>L2</b>, cuántos días quedan desde <b>B2</b> hasta el final de su mes.', h: 'Las fechas se restan: <code>=EOMONTH(B2, 0)-B2</code>.' };
  C.sx_w5_7 = { t: 'La columna equivocada', k: 'La fórmula de un compañero en <b>L2</b> debería dar el mes del pedido, pero muestra un error. Arréglala.', h: 'La fecha está en la columna B.' };
  C.sx_w5_8 = { t: 'El rango corto', k: '<b>L1</b> debería sumar la cantidad de todas las filas 2 a 500, pero el total es demasiado pequeño. Arréglalo.', h: 'El rango se para en la fila 50.' };
  C.sx_w5_9 = { t: 'El final de mes equivocado', k: '<b>L2</b> debería contar los días hasta el final del propio mes del pedido, pero cuenta demasiados. Arréglalo.', h: 'EOMONTH(fecha, 1) es el final del mes SIGUIENTE.' };
  C.sx_w5_10 = { t: 'Febrero', k: 'Sin escribirla: ¿qué devuelve esta fórmula?', h: 'Ve de dentro hacia fuera.', y: '2025 no es bisiesto, así que febrero termina el día 28.' };
  C.sx_w5_11 = { t: 'Un jueves', k: 'Sin escribirla: ¿qué devuelve esta fórmula?', h: 'Ve de dentro hacia fuera.', y: 'El 13 de noviembre de 2025 es jueves: con el lunes como 1, el jueves es 4.' };
  C.sx_w5_12 = { t: 'Año nuevo', k: 'Sin escribirla: ¿qué devuelve esta fórmula?', h: 'Ve de dentro hacia fuera.', y: 'Un día después del 31 de diciembre es el 1 de enero del año siguiente.' };

  W.push(['El reto de la limpieza', 'Otra vez el archivo desordenado: nombres, ciudades, precios y cantidades, limpiados paso a paso.', [
    ['Texto y mayúsculas', 'Anida los limpiadores', 'La función de dentro se ejecuta primero: TRIM quita los espacios y después PROPER pone en mayúscula cada palabra.'],
    ['Números y celdas vacías', 'Arregla y ten un plan B', 'SUBSTITUTE quita el $, VALUE crea un número e IFERROR da un valor seguro cuando el texto no es un número en absoluto.'],
    ['Predice la limpieza', 'Qué sale', 'TRIM deja un espacio entre palabras y ninguno en los extremos.'],
    ['El reto', 'Un paso por columna', 'Cada paso en su propia columna es fácil de comprobar, y fácil de arreglar cuando cambian los datos.'],
  ]]);
  C.sx_w6_1 = { t: 'Nombre de cliente limpio', k: 'Columnas: A Order ID, B Date, C Customer, D Product, E Qty, F Price, G City (escritas a mano: espacios, erratas, texto en columnas numéricas). En <b>H2</b>, el nombre del cliente de <b>C2</b> sin espacios de más y con mayúscula al principio de cada palabra.', h: 'Usa <code>=PROPER(TRIM(C2))</code>.' };
  C.sx_w6_2 = { t: 'Una sola forma de escribir cada ciudad', k: 'En <b>H2</b>, la ciudad de <b>G2</b> sin espacios de más y en minúsculas.', h: 'Usa <code>=LOWER(TRIM(G2))</code>.' };
  C.sx_w6_3 = { t: 'Cuántos espacios sobran', k: 'En <b>H2</b>, cuántos caracteres quita TRIM del producto de <b>D2</b>.', h: 'Compara las longitudes: <code>=LEN(D2)-LEN(TRIM(D2))</code>.' };
  C.sx_w6_4 = { t: 'Un precio limpio', k: 'En <b>H2</b>, el precio de <b>F2</b> como número, sin el símbolo $, o 0 cuando no se puede leer.', h: 'Anida SUBSTITUTE dentro de VALUE dentro de IFERROR.' };
  C.sx_w6_5 = { t: 'Nombres rellenados', k: 'En <b>J1</b>, cuenta cuántos nombres de cliente de <b>C2:C129</b> están rellenados.', h: 'COUNTA (CONTARA) cuenta las celdas que no están vacías.' };
  C.sx_w6_6 = { t: 'Una cantidad que falta', k: 'En <b>H2</b>, la cantidad de <b>E2</b>, o 1 cuando está vacía.', h: 'Usa <code>=IF(E2="", 1, E2)</code>.' };
  C.sx_w6_7 = { t: 'Sin espacios', k: 'Sin escribirla: ¿qué devuelve esta fórmula?', h: 'Ve de dentro hacia fuera.', y: 'TRIM quita los espacios de los dos extremos.' };
  C.sx_w6_8 = { t: 'Mayúscula inicial', k: 'Sin escribirla: ¿qué devuelve esta fórmula?', h: 'Ve de dentro hacia fuera.', y: 'PROPER pone en mayúscula la primera letra de cada palabra y el resto en minúscula.' };
  C.sx_w6_9 = { t: 'Un precio a partir de texto', k: 'Sin escribirla: ¿qué devuelve esta fórmula?', h: 'Ve de dentro hacia fuera.', y: 'Sin el $, el texto "4.50" se convierte en el número 4,5.' };
  C.sx_w6_10 = { t: 'Nombres de producto limpios', k: 'Tres pasos en la fila 2: <b>H2</b> quita los espacios al producto de D2, <b>I2</b> aplica PROPER a H2 y <b>J2</b> muestra "Unknown" cuando I2 está vacía.', h: 'Una fórmula por celda, cada una usando la celda anterior.', c: ['H2: quita los espacios de más de D2.', 'I2: mayúscula al principio de cada palabra.', 'J2: "Unknown" cuando el resultado está vacío.'] };
  C.sx_w6_11 = { t: 'Precio con impuesto', k: '<b>H2</b> quita el $ de F2, <b>I2</b> lo convierte en número (0 si falla) y <b>J2</b> le suma un 21 % de impuesto, redondeado a 2 decimales.', h: 'SUBSTITUTE, después IFERROR(VALUE()) y después ROUND(...*1.21, 2).', c: ['H2: quita el símbolo $.', 'I2: un número, o 0.', 'J2: suma el 21 % y redondea a 2 decimales.'] };
  C.sx_w6_12 = { t: 'Valor de la línea', k: '<b>H2</b> es el precio limpio, <b>I2</b> la cantidad con 1 cuando está vacía y <b>J2</b> el valor de la línea (precio × cantidad).', h: 'Reutiliza las dos fórmulas de limpieza y después multiplica.', c: ['H2: el precio limpio.', 'I2: la cantidad, 1 cuando está vacía.', 'J2: precio × cantidad.'] };

  W.push(['El embudo de la app', 'Eventos de la app en una hoja: cuenta cada paso, calcula las tasas de conversión, responde al equipo y traduce SQL.', [
    ['Cuenta los pasos', 'COUNTIF y COUNTIFS', 'COUNTIF cuenta las filas que cumplen una condición; COUNTIFS necesita que se cumplan todas.'],
    ['Tasas de conversión', 'Una tasa es un cociente', 'Divide el paso posterior entre el anterior. Redondea solo al final.'],
    ['Peticiones del equipo', 'Personas, no filas', 'UNIQUE deja una copia de cada user_id; COUNTA las cuenta. Los eventos no son personas.'],
    ['Rosetta: de SQL a fórmulas', 'La misma pregunta', 'WHERE se convierte en un criterio, COUNT(*) en COUNTIF y AND en otra pareja dentro de COUNTIFS.'],
  ]]);
  C.sx_w7_1 = { t: 'Aperturas de la app', k: 'Datos: los primeros 499 eventos de la app. Columnas: A event_id, B user_id, C session_id, D event_time, E event_name, F platform. En <b>H1</b>, cuenta los eventos <code>open_app</code>.', h: 'Usa <code>=COUNTIF(E2:E500, "open_app")</code>.' };
  C.sx_w7_2 = { t: 'Compras', k: 'En <b>H2</b>, cuenta los eventos <code>purchase</code>.', h: 'COUNTIF sobre la columna E.' };
  C.sx_w7_3 = { t: 'Compras en la web', k: 'En <b>H3</b>, cuenta las compras hechas en la plataforma <code>web</code>.', h: 'Dos condiciones: COUNTIFS sobre E y F.' };
  C.sx_w7_4 = { t: 'De apertura a compra', k: 'En <b>H4</b>, las compras divididas entre las aperturas de la app, redondeado a 3 decimales.', h: 'Dos COUNTIF, divididos, dentro de ROUND(..., 3).' };
  C.sx_w7_5 = { t: 'De la cesta al pago', k: 'En <b>H5</b>, los pagos iniciados (checkout) divididos entre los eventos de añadir a la cesta, redondeado a 3.', h: 'El mismo patrón con los dos pasos intermedios.' };
  C.sx_w7_6 = { t: 'Conversión en iOS', k: 'En <b>H6</b>, las compras divididas entre las aperturas de la app solo de <code>ios</code>, redondeado a 3.', h: 'Usa COUNTIFS a los dos lados de la división.' };
  C.sx_w7_7 = { t: '¿Cuántas personas?', k: 'En <b>H7</b>, cuenta los usuarios distintos de <b>B2:B500</b>.', h: 'Usa <code>=COUNTA(UNIQUE(B2:B500))</code>.', a: { w: 'Kai (app)', s: '¿Cuántas personas abrieron la app en esta muestra?', q: '¿Qué deberías contar?', o: ['Cada fila de la hoja', 'Los user_id distintos', 'Los eventos open_app', 'Las sesiones'], y: 'Las personas son los usuarios: cuenta cada user_id una vez, no cada evento.' } };
  C.sx_w7_8 = { t: '¿Qué plataforma compra?', k: 'En <b>H8</b>, cuenta las compras en <code>android</code>.', h: 'COUNTIFS sobre E y F.', a: { w: 'Theo (marketing)', s: '¿Qué plataforma compra más?', q: '¿Por dónde empiezas?', o: ['Contar las compras por plataforma', 'Contar todos los eventos por plataforma', 'Mirar solo la primera fila', 'Pedir antes más datos'], y: 'Cuenta primero las compras por plataforma; después compáralas con cuánta gente usa cada una.' } };
  C.sx_w7_9 = { t: 'Eventos por sesión', k: 'En <b>H9</b>, el número de eventos dividido entre el número de sesiones distintas, redondeado a 2.', h: 'COUNTA de los ids dividido entre COUNTA(UNIQUE()) de las sesiones.', a: { w: 'Rosa (operaciones)', s: '¿Son largas las visitas a la app?', q: '¿Qué número lo responde en esta hoja?', o: ['La hora del último evento', 'El número de usuarios', 'Los eventos por sesión', 'El número de compras'], y: 'Sin duraciones, el número de pasos por sesión es una medida razonable de lo larga que es una visita.' } };
  C.sx_w7_10 = { t: 'Vistas del menú', k: 'En <b>H10</b>, escribe la versión en fórmula del SQL que se da.', h: 'COUNT(*) con un WHERE es COUNTIF.' };
  C.sx_w7_11 = { t: 'Compras en iOS', k: 'En <b>H11</b>, escribe la versión en fórmula del SQL que se da.', h: 'Dos condiciones WHERE unidas con AND: COUNTIFS.' };
  C.sx_w7_12 = { t: 'Última sesión', k: 'En <b>H12</b>, escribe la versión en fórmula del SQL que se da.', h: 'MAX funciona igual.' };

  W.push(['Dot Club', 'Socios de la suscripción de café: MRR, bajas, un caso práctico y el cierre de mes.', [
    ['MRR y planes', 'Suma con una condición', 'Una fecha de baja vacía significa que el socio está activo. (E2:E437="") vale 1 o 0, así que SUMPRODUCT solo suma los precios de los socios activos.'],
    ['Bajas', 'La proporción que se fue', 'COUNTA cuenta las fechas de baja rellenadas (los socios que se fueron); divide entre todos los socios.'],
    ['Caso práctico', 'Compara y después concluye', 'Pon los tres planes uno al lado del otro antes de decir cuál tiene un problema.'],
    ['Jefe: cierre de mes', 'Los números del cierre', 'La tasa anual es el ingreso recurrente de este mes por 12: una forma rápida de hablar de escala.'],
  ]]);
  C.sx_w8_1 = { t: 'Ingreso recurrente mensual', k: 'Datos: socios de Dot Club. Columnas: A member_id, B user_id, C plan, D start_date, E cancel_date (vacía mientras está activo), F monthly_price. En <b>H1</b>, el precio mensual de todos los socios activos sumado, redondeado a 2.', h: 'Usa <code>=ROUND(SUMPRODUCT((E2:E437="")*F2:F437), 2)</code>.' };
  C.sx_w8_2 = { t: 'Socios del plan familiar', k: 'En <b>H2</b>, cuenta los socios del plan <code>family</code>.', h: 'COUNTIF sobre la columna C.' };
  C.sx_w8_3 = { t: 'Socios básicos que se fueron', k: 'En <b>H3</b>, cuenta los socios <code>basic</code> con fecha de baja.', h: 'El criterio "&lt;&gt;" significa "no vacío".' };
  C.sx_w8_4 = { t: 'Tasa de bajas', k: 'En <b>H4</b>, la proporción de socios que se dieron de baja, redondeada a 3.', h: 'Las fechas de baja rellenadas divididas entre todos los socios.' };
  C.sx_w8_5 = { t: 'Bajas del plan básico', k: 'En <b>H5</b>, la tasa de bajas del plan <code>basic</code>, redondeada a 3.', h: 'Socios básicos que se fueron divididos entre todos los socios básicos.' };
  C.sx_w8_6 = { t: 'Bajas del plan familiar', k: 'En <b>H6</b>, la tasa de bajas del plan <code>family</code>, redondeada a 3.', h: 'El mismo patrón para family.' };
  C.sx_w8_7 = { t: 'Bajas del plan plus', k: 'En <b>H7</b>, la tasa de bajas del plan <code>plus</code>, redondeada a 3.', h: 'El mismo patrón que basic y family.', f: { q: 'Comparando los tres planes, ¿cuál pierde la mayor proporción de socios?', o: ['basic', 'plus', 'family', 'Todos igual'], y: 'El plan más barato es el que más bajas tiene. Siguiente pregunta: ¿es el precio, o quién elige ese plan?' } };
  C.sx_w8_8 = { t: 'Ingresos que se fueron', k: 'En <b>H8</b>, el precio mensual de todos los socios que se dieron de baja, sumado y redondeado a 2.', h: 'La condición contraria: (E2:E437&lt;&gt;"").' };
  C.sx_w8_9 = { t: 'Altas de noviembre', k: 'En <b>H9</b>, cuenta los socios que empezaron en noviembre de 2025.', h: 'Dos condiciones de fecha: <code>">="&DATE(2025,11,1)</code> y <code>"&lt;"&DATE(2025,12,1)</code>.' };
  C.sx_w8_10 = { t: 'Tasa anual', k: 'En <b>H10</b>, el MRR de los socios activos por 12, redondeado a 2.', h: 'La fórmula del MRR por 12, dentro de ROUND(..., 2).' };
  C.sx_w8_11 = { t: 'Ingreso por socio activo', k: 'En <b>H11</b>, el MRR dividido entre el número de socios activos, redondeado a 2.', h: 'COUNTBLANK cuenta las fechas de baja vacías.' };
  C.sx_w8_12 = { t: 'MRR del plan familiar', k: 'En <b>H12</b>, el precio mensual de los socios activos del plan <code>family</code> sumado, redondeado a 2.', h: 'Multiplica dos condiciones y el precio dentro de SUMPRODUCT.', f: { q: 'El plan familiar tiene menos socios que el básico. ¿Por qué puede ser grande aun así su MRR?', o: ['Los socios del plan familiar nunca se dan de baja', 'Cada socio del plan familiar es el que más paga al mes', 'La fórmula cuenta a los socios dos veces', 'El plan familiar tiene más socios'], y: 'Los ingresos son socios × precio: un grupo más pequeño con un precio más alto puede ganar lo mismo.' } };
})();
