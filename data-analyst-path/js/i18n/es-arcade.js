/* Spanish (Spain): arcade worlds and levels (js/data/arcade-worlds.js), SQL blocks levels and the handmade SQL
 * puzzles (js/data/puzzles.js). Level keys never change; only the words shown do. */
(function () {
  'use strict';
  var DA = window.DA, I = DA.i18n;

  // game: [name, tool, blurb, worlds: [[name, intro, concepts, levels: [[name, teaches], ...]], ...]]
  var G = {
    blocks: ['Bloques SQL', 'SQL', 'Construye consultas de verdad tocando fichas: sin escribir.', [
      ['Primeras consultas', 'Toda consulta empieza con SELECT y FROM. Después ordenas, filtras, cuentas y agrupas.', ['SELECT y FROM', 'WHERE filtra filas', 'COUNT, SUM, AVG', 'GROUP BY']],
      ['Combina y da forma', 'Las preguntas reales necesitan más de una tabla, fechas, etiquetas y totales acumulados.', ['JOIN', 'Fechas y CASE', 'Subconsultas y CTE', 'Funciones de ventana']],
      ['Datos limpios', 'Las tablas reales tienen huecos, texto desordenado y duplicados. Límpialas dentro de la consulta.', ['NULL y COALESCE', 'LOWER, TRIM, LIKE', 'ROUND y decimales', 'Duplicados']],
      ['Patrones de analista', 'Las consultas que se escriben cada semana: tasas, coincidencias que faltan, top N por grupo y embudos.', ['SUM(CASE WHEN …)', 'Anti-joins', 'Top N por grupo', 'Tasas de conversión']],
    ]],
    xray: ['Rayos X de fórmulas', 'Excel', 'Toca las celdas que de verdad usa una fórmula y después mira qué devuelve.', [
      ['Rangos', 'Un rango es un bloque de celdas, como C2:C5. La mayoría de las fórmulas leen un rango y lo reducen a un número.', ['Rangos como C2:C5', 'SUM y AVERAGE', 'MAX, MIN, LARGE', 'Vacías y texto'],
        [['Suma un rango', 'SUM sobre un rango'], ['Dos rangos y medias', 'SUM de dos rangos, AVERAGE'], ['¿Quién es el mayor?', 'MAX, MIN y LARGE eligen una celda'], ['Contar celdas', 'COUNT, COUNTA y COUNTBLANK']]],
      ['Una condición', 'Añade una condición y la fórmula solo lee las filas que la cumplen.', ['COUNTIF', 'SUMIF y AVERAGEIF', 'Criterios como ">2"', 'Distinto de: "<>"'],
        [['Cuenta por texto', 'COUNTIF con una palabra'], ['Cuenta por número', 'COUNTIF con > y >='], ['Suma las filas que cumplen', 'SUMIF y AVERAGEIF'], ['Todo menos', 'Criterios con <>']]],
      ['Varias condiciones', 'Cada pareja de criterios extra reduce las filas: todas las condiciones tienen que cumplirse.', ['COUNTIFS y SUMIFS', 'Y entre criterios', 'Comodines * y ?', 'Un límite en una celda'],
        [['Dos condiciones', 'COUNTIFS'], ['Suma con dos condiciones', 'SUMIFS con texto y números'], ['Comodines', '"L*" y "*on" en los criterios'], ['El límite vive en una celda', '">="&F1 construye el criterio']]],
      ['Búsquedas y matrices', 'Una búsqueda devuelve una celda y una fórmula matricial muchas. Saber qué celda vuelve es la mitad de la depuración.', ['XLOOKUP: la primera coincidencia', 'VLOOKUP y el número de columna', 'INDEX y MATCH', 'FILTER y SUMPRODUCT'],
        [['XLOOKUP', 'Qué coincidencia vuelve'], ['VLOOKUP', 'El número de columna se cuenta desde la izquierda'], ['INDEX y MATCH', 'MATCH encuentra la fila e INDEX la lee'], ['Matrices', 'FILTER y SUMPRODUCT']]],
    ]],
    pipe: ['Pipeline de pandas', 'Python', 'Encadena cartas de operaciones hasta que tu tabla coincida con el objetivo.', [
      ['Mira la tabla', 'Ordenar, elegir columnas y quedarte con las primeras filas: los movimientos que haces con cada conjunto de datos nuevo.', ['sort_values', 'head y tail', 'Elegir columnas', 'nlargest'],
        [['Ordénala', 'sort_values y después head'], ['Elige columnas', 't[["a", "b"]]'], ['Atajos', 'nlargest y nsmallest'], ['Tres pasos', 'Columnas, orden y head juntos']]],
      ['Filtra filas', 'Una condición dentro de t[...] se queda solo con las filas en las que es True.', ['Máscaras booleanas', '== y >=', 'isin', '& y |'],
        [['Quédate con un valor', 't[t["channel"] == "pickup"]'], ['Números', '>=, < y compañía'], ['Uno de varios', 'isin([...])'], ['Las dos o cualquiera', '& y | con paréntesis']]],
      ['Agrupa y resume', 'groupby separa la tabla y un resumen exprime cada grupo en una fila.', ['groupby', 'sum, mean, count', 'value_counts', 'reset_index'],
        [['Totales por grupo', 'groupby(...).sum()'], ['Otros resúmenes', 'mean, count y max'], ['Filtra y después agrupa', 'El orden de los pasos importa'], ['Recuentos y proporciones', 'value_counts y reset_index']]],
      ['Limpia y da forma', 'Arregla primero los huecos y los duplicados, y después crea columnas nuevas y da forma a la tabla.', ['dropna y fillna', 'drop_duplicates', 'assign', 'pivot_table y merge'],
        [['Valores que faltan', 'dropna y fillna'], ['Duplicados', 'drop_duplicates antes de contar'], ['Columnas nuevas', 'assign de revenue y después agrupa'], ['Da forma', 'pivot_table y merge']]],
    ]],
    safe: ['La caja fuerte de las segmentaciones', 'Power BI', 'Ajusta las segmentaciones para que la tarjeta del KPI muestre el número secreto.', [
      ['Las segmentaciones filtran', 'Una segmentación filtra las filas que ve una medida. Dos segmentaciones filtran a la vez.', ['Segmentaciones', 'Contexto de filtro', 'SUM y DISTINCTCOUNT', 'Combinaciones'],
        [['Una segmentación', 'Una segmentación filtra la suma'], ['Dos segmentaciones', 'Los dos filtros se aplican a la vez'], ['Contar distintos', 'DISTINCTCOUNT de pedidos y clientes'], ['Tres segmentaciones', 'Más segmentaciones, más combinaciones']]],
      ['CALCULATE toma el mando', 'CALCULATE cambia los filtros antes de que se ejecute la medida: algunas segmentaciones dejan de importar.', ['CALCULATE', 'ALL quita un filtro', 'Un argumento de filtro sustituye a la segmentación', 'REMOVEFILTERS'],
        [['ALL ignora una segmentación', 'ALL(columna) dentro de CALCULATE'], ['Filtros fijos', 'Sales[channel] = "delivery" manda'], ['Quita filtros', 'REMOVEFILTERS y ALL'], ['¿Qué segmentaciones importan?', 'Todo lo anterior, tres segmentaciones']]],
      ['Cocientes y medias', 'DIVIDE convierte dos números en una proporción; una media depende de sobre qué se promedia.', ['DIVIDE', 'Peso sobre un total', 'AVERAGE frente a AVERAGEX', 'Ingresos con SUMX'],
        [['Peso sobre todas las ciudades', 'DIVIDE con ALL(city)'], ['Peso dentro de la ciudad', 'DIVIDE con ALL(channel)'], ['Medias', 'AVERAGE del precio, AVERAGEX de los valores de línea'], ['Ingresos y pesos', 'SUMX y DIVIDE, tres segmentaciones']]],
      ['Tiempo y rankings', 'La inteligencia de tiempo mueve las fechas del filtro; RANKX compara un valor con todos los demás.', ['Una segmentación de mes', 'DATEADD: el mes anterior', 'TOTALYTD: lo que va de año', 'RANKX'],
        [['Elige un mes', 'La segmentación de mes'], ['El mes anterior', 'DATEADD(…, -1, MONTH)'], ['Acumulado del año', 'TOTALYTD suma hasta el mes'], ['Ordena las ciudades', 'RANKX(ALL(city), …)']]],
    ]],
    pills: ['Empareja las píldoras', 'Tableau', 'Suelta píldoras azules y verdes en los estantes para reconstruir un gráfico.', [
      ['Azul y verde', 'Las píldoras azules (dimensiones) dividen la vista en barras; las verdes (medidas) dan a cada barra su longitud.', ['Las dimensiones son azules', 'Las medidas son verdes', 'Filas y Columnas', 'Ordenar'],
        [['Primer gráfico', 'Una dimensión, una medida'], ['Más píldoras', 'Cuatro dimensiones para elegir'], ['Ordena las barras', 'De la más grande a la más pequeña, y al revés'], ['Cualquier gráfico', 'Todas las píldoras y todos los órdenes']]],
      ['Agregaciones', 'El mismo campo cuenta una historia distinta con SUM, AVG, MIN, MAX o COUNTD.', ['SUM frente a AVG', 'MIN y MAX', 'COUNT frente a COUNTD', 'El mismo campo, otra historia'],
        [['Suma o media', 'SUM(qty) frente a AVG(qty)'], ['Mínimo y máximo', 'La línea más barata y la más cara'], ['Recuentos distintos', '¿Líneas, pedidos o clientes?'], ['Todas las agregaciones', 'Todas, con orden']]],
      ['Filtros', 'Un filtro quita filas antes de dibujar las barras, incluso un filtro sobre un campo que no está en los estantes.', ['El estante Filtros', 'Filtrar un campo oculto', 'Top N', 'Los filtros cambian todas las barras'],
        [['Un filtro', 'Quédate con un valor de otro campo'], ['Filtra y ordena', 'Un filtro más un orden'], ['Top N', 'Quédate con las 3 barras más altas'], ['Filtro y Top N', 'Las dos cosas a la vez']]],
      ['Cálculos de tabla', 'Un cálculo rápido de tabla trabaja sobre las propias barras: pesos, totales acumulados y rankings.', ['Porcentaje del total', 'Total acumulado', 'Ranking', 'Los cálculos siguen el orden'],
        [['Porcentaje del total', 'Cada barra como proporción de todas'], ['Total acumulado', 'Cada barra suma las anteriores'], ['Ranking', 'La barra más grande recibe el 1'], ['Cualquier cálculo', 'Cálculo, filtro y orden']]],
    ]],
    corr: ['Adivina la correlación', 'Estadística', 'Lee un diagrama de dispersión y estima r.', [
      ['Lee la nube', 'r va de −1 (una recta perfecta que baja) a +1 (una recta perfecta que sube). Cuanto más apretada la nube, mayor es |r|.', ['Dirección: sube o baja', 'Fuerza: lo apretada que está', 'r de −1 a +1'],
        [['¿Fuerte o débil?', 'Primero patrones claros'], ['Cualquier dirección', 'Sube, baja o ninguna de las dos'], ['Más vista', 'Estimaciones más ajustadas para tres estrellas'], ['Menos puntos', '30 puntos por gráfico']]],
      ['Relaciones débiles', 'La mayoría de las relaciones reales son débiles: de 0,2 a 0,5 es lo habitual. Las muestras pequeñas meten ruido en la imagen.', ['Lo débil es lo normal', 'De 0,2 a 0,5', 'Las muestras pequeñas tienen ruido'],
        [['Moderada', 'r entre 0,2 y 0,6, con cualquier signo'], ['Débil', 'r por debajo de 0,4'], ['Por los pelos', 'A menos de 0,07 para tres estrellas'], ['Solo 12 puntos', 'Muestras minúsculas']]],
      ['Valores atípicos', 'Un punto raro puede crear una correlación o esconderla. Los grupos pueden fingir una tendencia.', ['Un punto puede crear r', 'Un punto puede esconder r', 'Grupos'],
        [['Un punto solitario', 'Un atípico lejos de la nube'], ['Contra la tendencia', 'Un atípico que lucha contra la recta'], ['Dos grupos', 'Grupos sin tendencia dentro'], ['Encuentra la trampa', 'Cualquiera de las tres']]],
      ['Formas que engañan a r', 'r solo mide rectas. Las curvas, las formas de U y los rangos estrechos lo confunden.', ['Solo rectas', 'Curvas y formas de U', 'Un rango estrecho encoge r'],
        [['Curvas', 'Se doblan pero siempre suben o bajan'], ['Formas de U', 'Un patrón claro, r cerca de 0'], ['Rango restringido', 'Solo una parte de los datos'], ['Todas las trampas', 'Vale todo']]],
    ]],
  };

  // SQL blocks levels 1-16 (DA.blockLevels): [name, teaches]
  var BL = [['Elige y ordena', 'SELECT, ORDER BY, LIMIT, DISTINCT'], ['Filtra filas', 'WHERE, AND / OR, IN, BETWEEN, LIKE'], ['Cuenta y suma', 'COUNT, SUM, AVG, MIN, MAX'], ['Grupos', 'GROUP BY y HAVING'],
    ['Uniones', 'JOIN, LEFT JOIN, tres tablas'], ['Fechas y CASE', 'strftime, rangos de fechas, CASE WHEN'], ['Subconsultas y CTE', 'IN (SELECT …), WITH … AS'], ['Funciones de ventana', 'RANK, ROW_NUMBER, LAG, totales acumulados'],
    ['Valores que faltan', 'IS NULL, COUNT(columna), COALESCE'], ['Texto desordenado', 'LOWER, TRIM, LIKE, SUBSTR'], ['Números y redondeo', 'ROUND, 100.0 * …, aritmética'], ['Duplicados', 'COUNT(DISTINCT), HAVING COUNT(*) > 1'],
    ['Recuentos con condición', 'SUM(CASE WHEN … THEN 1 ELSE 0 END)'], ['Coincidencias que faltan', 'LEFT JOIN … IS NULL, NOT IN'], ['Top N por grupo', 'ROW_NUMBER() OVER (PARTITION BY …)'], ['Embudos y conversión', 'COUNT(DISTINCT CASE …), tasas por grupo']];

  var P = {};
  DA.arcadeEs = { G: G, BL: BL, P: P };

  I.content(function () {
    var C = DA.arcadeCatalog || {};
    Object.keys(G).forEach(function (k) {
      var g = C[k], t = G[k];
      if (!g) return;
      I.learn(g.name, t[0]); g.name = t[0];
      if (t[1] !== g.tool) { I.learn(g.tool, t[1]); g.tool = t[1]; }
      g.blurb = t[2];
      (g.worlds || []).forEach(function (w, wi) {
        var tw = t[3][wi];
        if (!tw) return;
        I.learn(w.name, tw[0]); w.name = tw[0];
        w.intro = tw[1];
        if (tw[2] && w.concepts && tw[2].length === w.concepts.length) w.concepts = tw[2];
        (w.levels || []).forEach(function (l, li) {
          var tl = tw[3] && tw[3][li];
          if (!tl || typeof l !== 'object') return;
          I.learn(l.name, tl[0]); l.name = tl[0];
          l.teaches = tl[1];
        });
      });
    });
    (DA.blockLevels || []).forEach(function (l, i) { if (BL[i]) { I.learn(l.name, BL[i][0]); l.name = BL[i][0]; l.teaches = BL[i][1]; } });
    (DA.puzzles || []).forEach(function (p) { var t = P[p.id]; if (t) { p.ask = t[0]; p.why = t[1]; } });
  });

  P.b01 = ['Lista todos los productos con su precio, del más barato al más caro.', 'ORDER BY ordena de menor a mayor salvo que añadas DESC.'];
  P.b02 = ['¿Cuántos pedidos hay?', 'COUNT(*) cuenta filas.'];
  P.b03 = ['¿Qué productos cuestan más de 4?', 'WHERE filtra las filas una a una.'];
  P.b04 = ['¿Cuántos pedidos llegaron por cada canal?', 'Una fila de resultado por cada valor de la columna del GROUP BY.'];
  P.b05 = ['Muestra los 3 productos más caros con su precio.', 'Ordena de mayor a menor y quédate con las tres primeras filas.'];
  P.b06 = ['¿Cuántos pedidos fueron a domicilio (delivery)?', 'Los valores de texto necesitan comillas simples. Sin ellas, la base de datos busca una columna llamada delivery.'];
  P.b07 = ['¿Qué canales distintos hay?', 'DISTINCT quita los valores repetidos.'];
  P.b08 = ['¿Cuántos clientes distintos han hecho un pedido?', 'COUNT(DISTINCT …) cuenta cada cliente una vez, haga los pedidos que haga.'];
  P.b09 = ['Cuenta los productos de cada categoría, la categoría más grande primero.', 'Puedes ordenar por un alias, porque ORDER BY se ejecuta después del SELECT.'];
  P.b10 = ['¿Cuál es el precio más barato de cada categoría?', 'MIN, MAX, SUM, AVG y COUNT reducen un grupo a un número.'];
  P.b11 = ['¿Qué categorías tienen más de 3 productos?', 'Una condición sobre un grupo va en HAVING. WHERE se ejecuta antes de que existan los grupos.'];
  P.b12 = ['¿Qué tiendas atendieron más de 700 pedidos? Devuelve el store_id.', 'HAVING filtra los grupos después de contar.'];
  P.b13 = ['¿Cuál es la edad media de cada grupo?', 'AVG funciona por grupo, como todos los agregados.'];
  P.b14 = ['Encuentra a los participantes mayores de 50 del grupo de intervención.', 'AND necesita que se cumplan las dos condiciones. OR devolvería también a todos los demás participantes de intervención.'];
  P.b15 = ['¿Qué participantes asistieron a menos de 12 sesiones? Devuelve cada uno con el número de sesiones.', 'Cuenta por participante y después quédate con los grupos pequeños.'];
  P.b16 = ['Muestra el nombre de cada producto con sus unidades vendidas totales.', 'La cantidad está en order_items y el nombre en products: únelas por la clave común.'];
  P.b17 = ['Ingresos (qty × price) de cada categoría de producto.', 'Multiplica dentro del SUM, fila a fila, y después suma por categoría.'];
  P.b18 = ['¿Cuántos clientes no han hecho nunca un pedido?', 'LEFT JOIN conserva a los clientes sin pedidos; sus columnas de pedido son NULL. "= NULL" no coincide nunca con nada.'];
  P.b19 = ['Cuenta los pedidos de cada mes (como AAAA-MM), en orden de calendario.', 'Recorta la fecha a año y mes y después agrupa por eso.'];
  P.b20 = ['Ordena los productos por precio, con el más caro como número 1.', 'Una función de ventana añade un puesto a cada fila sin colapsarlas.'];
  P.b21 = ['Muestra la ciudad de cada tienda y el año en que abrió.', 'Enumera las columnas que quieres, separadas por comas. * traería todas, también store_id.'];
  P.b22 = ['Lista los nombres de los productos por orden alfabético (de la A a la Z).', 'El texto se ordena alfabéticamente. ASC (de la A a la Z) es lo que se usa por defecto.'];
  P.b23 = ['Muestra el nombre de cada producto y su precio con un 10 % de impuesto añadido, como price_tax.', 'Puedes calcular en el SELECT. AS da nombre a la columna nueva.'];
  P.b24 = ['Muestra los 5 pedidos más recientes (order_id y order_date). El mismo día, primero el order_id más alto.', 'Una segunda columna de orden deshace los empates, así que el top 5 son siempre las mismas cinco filas.'];
  P.b25 = ['Lista cada categoría de producto una vez, de la A a la Z.', 'DISTINCT quita primero los repetidos y después ORDER BY ordena lo que queda.'];
  P.b26 = ['Muestra customer_id y segment de todos los clientes, ordenados por segmento y después por customer_id.', 'ORDER BY a, b ordena por a, y usa b solo cuando a es igual.'];
  P.b27 = ['Arregla el error: esto debería mostrar los 3 productos MÁS BARATOS con su precio.', 'DESC pone primero los más caros. Sin él (o con ASC) salen primero los más baratos.'];
  P.b28 = ['Muestra el id, la edad y el centro de cada participante, del mayor al más joven.', 'DESC invierte el orden: primero los números más grandes.'];
  P.b29 = ['¿Qué productos son de la categoría Tea? Devuelve el nombre.', 'Compara texto con = y comillas simples. Los valores distinguen mayúsculas: \'tea\' no encontraría nada.'];
  P.b30 = ['Productos con un precio de 3 a 5 (ambos incluidos): nombre y precio.', 'BETWEEN incluye los dos extremos. "> 3 OR < 5" es cierto para cualquier precio.'];
  P.b31 = ['Clientes que viven en Madrid o Lisbon: customer_id y city.', 'IN es una forma corta de escribir varios OR. Una ciudad no puede ser Madrid Y Lisbon a la vez.'];
  P.b32 = ['Productos con "Tea" en cualquier parte del nombre.', '% significa "cualquier texto aquí". \'%Tea%\' encuentra Tea al principio, en medio o al final.'];
  P.b33 = ['Productos cuyo nombre empieza por C.', '\'C%\' significa: C y después cualquier cosa. \'%C\' serían los nombres que TERMINAN en C.'];
  P.b34 = ['Todos los pedidos que NO fueron en tienda: order_id y channel.', '<> significa "distinto de" (!= también funciona en SQLite).'];
  P.b35 = ['Estudiantes que se registraron antes de marzo de 2024: customer_id.', 'Las fechas guardadas como texto AAAA-MM-DD se ordenan bien, así que < funciona con ellas.'];
  P.b36 = ['Mujeres del centro North: participant_id y age.', 'Cada AND extra reduce el resultado.'];
  P.b37 = ['Arregla el error: queremos los productos Coffee que cuestan más de 4.', 'OR devuelve las filas en las que se cumple CUALQUIERA de las dos condiciones, así que se cuelan cafés baratos y comida cara.'];
  P.b38 = ['Arregla el error: lecturas de frecuencia cardiaca por debajo de 30 (errores del sensor): measurement_id y value.', 'Sin comillas, resting_hr se lee como nombre de columna, y esa columna no existe.'];
  P.b39 = ['Participantes de 30 a 39 años: participant_id y age.', '">= 30 AND < 40" es una forma limpia de escribir un rango sin huecos ni solapes.'];
  P.b40 = ['El precio medio de los productos, redondeado a 2 decimales.', 'ROUND(valor, 2) deja dos decimales. Envuelve el AVG con él.'];
  P.b41 = ['¿Cuántas unidades se vendieron en total?', 'SUM suma los valores. COUNT contaría las filas, no las unidades.'];
  P.b42 = ['El precio más alto de la carta.', 'MAX devuelve un número: el valor más grande de la columna.'];
  P.b43 = ['¿Cuántos clientes son estudiantes?', 'WHERE filtra primero y después COUNT cuenta lo que queda.'];
  P.b44 = ['La primera y la última fecha de pedido del año.', 'MIN y MAX también funcionan con fechas, porque el texto AAAA-MM-DD se ordena como las fechas.'];
  P.b45 = ['¿Cuántos participantes hay en el estudio y cuál es su edad media?', 'Varios agregados pueden compartir un mismo SELECT.'];
  P.b46 = ['La media de todas las medidas de vo2max.', 'En formato largo, el nombre de la métrica es un VALOR de una columna, no una columna: filtra por él.'];
  P.b47 = ['¿Cuántas líneas de pedido tenían más de una unidad?', 'Filtra las filas y después cuéntalas.'];
  P.b48 = ['Arregla el error: ¿en cuántas ciudades distintas viven los clientes?', 'COUNT(city) cuenta todos los clientes que tienen ciudad. COUNT(DISTINCT city) cuenta cada ciudad una vez.'];
  P.b49 = ['Arregla el error: el precio medio de los productos de Bakery.', 'SUM suma los precios; AVG divide eso entre cuántos hay.'];
  P.b50 = ['¿Cuántos clientes hay en cada segmento?', 'GROUP BY crea una fila por segmento; COUNT(*) cuenta los clientes de cada uno.'];
  P.b51 = ['Pedidos por tienda, la que más trabajo tiene primero.', 'Agrupa, cuenta y después ordena por el recuento.'];
  P.b52 = ['El precio medio por categoría, solo de las categorías con una media de más de 3.', 'HAVING puede usar cualquier agregado, aunque no esté en el SELECT.'];
  P.b53 = ['¿Cuántas sesiones hubo cada semana, en orden de semana?', 'Ver cómo baja el recuento semana a semana es la forma de detectar abandonos.'];
  P.b54 = ['Arregla el error: los segmentos con más de 100 clientes.', 'WHERE se ejecuta antes de que existan los grupos, así que no puede contarlos. Las condiciones sobre grupos van en HAVING, después de GROUP BY.'];
  P.b55 = ['Arregla el error: el número de participantes de cada centro.', 'Sin GROUP BY toda la tabla es un solo grupo: obtienes una fila con el total y un centro al azar.'];
  P.b56 = ['Cada pedido con la ciudad de su tienda: order_id y city.', 'JOIN … ON dice qué columnas coinciden. Los alias (o, s) acortan los nombres.'];
  P.b57 = ['El número de pedidos de cada ciudad de tienda.', 'Primero une y después agrupa por una columna de la otra tabla.'];
  P.b58 = ['El número de pedidos de cada segmento de cliente.', 'El segmento está en customers y los pedidos en orders: customer_id los enlaza.'];
  P.b59 = ['Ingresos (qty × price) de cada canal. ¡Tres tablas!', 'Cada JOIN añade una tabla con su propio ON. Los precios están en products, las cantidades en order_items y los canales en orders.'];
  P.b60 = ['El número de sesiones de cada centro.', 'Las sesiones no saben el centro; los participantes sí. Une para tomar prestada la columna.'];
  P.b61 = ['El vo2max medio de cada grupo (control e intervención).', 'Measurements → sessions → participants: sigue las claves paso a paso.'];
  P.b62 = ['Arregla el error: el número de pedidos de los clientes de cada ciudad.', 'El join se ejecutó, pero con la clave equivocada: los ids de tienda 1 a 5 coincidieron con los clientes 1 a 5. Une siempre una clave con la MISMA clave.'];
  P.b63 = ['Arregla el error: los ids de los clientes que nunca pidieron.', 'NULL es "desconocido", así que "= NULL" nunca es cierto. Usa IS NULL.'];
  P.b64 = ['¿Cuántos pedidos se hicieron en diciembre?', 'strftime recorta un trozo de una fecha: %Y año, %m mes, %d día, %w día de la semana. Devuelve texto, así que compara con \'12\'.'];
  P.b65 = ['Pedidos por día de la semana (0 = domingo … 6 = sábado), en orden de día.', 'Agrupa por un trozo de la fecha para ver patrones semanales.'];
  P.b66 = ['Etiqueta cada producto como \'cheap\' (menos de 3) o \'regular\': nombre y etiqueta.', 'CASE WHEN … THEN … ELSE … END es el si/si no de SQL. Crea una columna nueva.'];
  P.b67 = ['Cuenta los productos en tres tramos de precio: menos de 3, de 3 a 5 y más de 5.', 'CASE revisa los WHEN en orden y se para en el primero que se cumple, así que "<= 5" solo ve precios a partir de 3.'];
  P.b68 = ['La proporción de pedidos a domicilio, como porcentaje con 1 decimal.', 'SUM(CASE … 1 ELSE 0) cuenta las coincidencias. 100.0 (no 100) evita la división entera, que quitaría los decimales.'];
  P.b69 = ['Participantes de menos de 40 y de 40 o más: tramo y recuento.', 'Agrupar por un CASE convierte un número en categorías.'];
  P.b70 = ['¿Cuántas sesiones hubo en enero de 2025?', 'Desde el primer día del mes hasta el primer día del siguiente, sin incluirlo: no hay que acordarse de si tiene 30 o 31.'];
  P.b71 = ['Pedidos a domicilio por mes (AAAA-MM), en orden de calendario.', 'WHERE va antes de GROUP BY: filtra las filas y después agrupa lo que queda.'];
  P.b72 = ['Arregla el error: ¿cuántos pedidos hubo en el primer semestre (de enero a junio)?', '"< 30 de junio" se deja el propio 30 de junio. "< 1 de julio" incluye todos los días de junio.'];
  P.b73 = ['Arregla el error: cuenta los pedidos hechos en fin de semana y entre semana.', 'Un CASE sin ELSE devuelve NULL para todo lo demás: los días laborables acabaron en un grupo NULL.'];
  P.b74 = ['Productos que cuestan más que el producto medio: nombre y precio.', 'Una subconsulta entre paréntesis se ejecuta primero y pasa su único número a la consulta exterior.'];
  P.b75 = ['El nombre del producto más caro.', 'No puedes escribir WHERE price = MAX(price): la subconsulta encuentra antes el máximo.'];
  P.b76 = ['¿Cuántos clientes han pedido al menos una vez a domicilio?', 'IN (SELECT …) comprueba si algo está en una lista. Un JOIN aquí contaría a un cliente una vez por cada pedido a domicilio.'];
  P.b77 = ['Los participantes a los que nunca se les registró el peso.', 'NOT IN encuentra quién falta en una lista. Los datos que faltan son un hallazgo: dilo en tu informe.'];
  P.b78 = ['El número medio de pedidos por cliente (clientes que pidieron al menos una vez).', 'WITH … AS pone nombre a un paso. Cuenta primero por cliente y después promedia esos recuentos.'];
  P.b79 = ['Clientes fieles: los que tienen más de 20 pedidos, con su recuento.', 'Después de la CTE, n es una columna normal, así que un WHERE corriente funciona.'];
  P.b80 = ['El precio de cada producto junto al precio medio de su categoría.', 'Una subconsulta correlacionada se ejecuta una vez por fila y puede usar los valores de esa fila (p.category).'];
  P.b81 = ['Las tiendas con más pedidos que la tienda media: store_id.', 'Una CTE se puede usar más de una vez: aquí en la consulta principal y dentro de la subconsulta.'];
  P.b82 = ['¿Cuántos participantes abandonaron antes de la última semana (semana 11)?', 'Encuentra primero la última semana de cada participante y después cuenta los que se quedan cortos.'];
  P.b83 = ['Arregla el error: productos más baratos que el producto medio.', 'Un agregado no puede ir en WHERE ("misuse of aggregate"). Ponlo en una subconsulta.'];
  P.b84 = ['Arregla el error: ¿cuántos clientes no han pedido nunca?', 'IN contaba los clientes que SÍ pidieron. NOT IN se queda con los que faltan en la lista.'];
  P.b85 = ['Ordena los productos por precio dentro de cada categoría (1 = el más caro): category, name y puesto.', 'PARTITION BY reinicia el ranking en cada categoría, como un GROUP BY que conserva todas las filas.'];
  P.b86 = ['Pedidos por mes y el total acumulado hasta ese momento.', 'SUM … OVER (ORDER BY …) suma todo hasta la fila actual: un total acumulado.'];
  P.b87 = ['Pedidos por mes y la variación respecto al mes anterior.', 'LAG mira una fila atrás y LEAD una hacia delante. El primer mes no tiene anterior, así que su variación es NULL.'];
  P.b88 = ['Numera los pedidos de cada cliente 1, 2, 3… por fecha (y después por order_id): customer_id, order_id, nth.', 'ROW_NUMBER numera las filas de cada partición. nth = 1 es el primer pedido de cada cliente.'];
  P.b89 = ['El peso de cada categoría en los ingresos totales, como porcentaje con 1 decimal.', 'OVER () sin nada dentro significa "sobre todas las filas": el total general, repetido en cada fila.'];
  P.b90 = ['Los 2 productos con más unidades vendidas de cada categoría: categoría y nombre.', 'El clásico "top N por grupo": numera dentro de cada grupo y quédate con los puestos 1 y 2. LIMIT 2 se quedaría con 2 filas en total.'];
  P.b91 = ['Cada producto con el precio medio de su categoría en la misma fila: name, category, cat_avg.', 'GROUP BY aplastaría los productos en una fila por categoría. Una ventana conserva todas las filas.'];
  P.b92 = ['Una media móvil de 3 meses de los pedidos mensuales.', 'ROWS BETWEEN 2 PRECEDING AND CURRENT ROW: este mes y los dos anteriores. Las medias móviles suavizan el ruido.'];
  P.b93 = ['Numera las sesiones de cada participante 1, 2, 3… por semana: participant_id, week, nth.', 'Una numeración por participante, que vuelve a empezar en 1.'];
  P.b94 = ['Arregla el error: pedidos mensuales con un total ACUMULADO.', 'Un OVER () vacío suma TODAS las filas: cada mes muestra el total del año. ORDER BY dentro de OVER lo convierte en una suma acumulada.'];
  P.b95 = ['Arregla el error: ordena los productos por precio DENTRO de cada categoría.', 'Sin PARTITION BY hay un único ranking para toda la carta.'];
  P.b96 = ['Lista todas las ciudades de las tiendas en orden alfabético inverso (de la Z a la A).', 'DESC ordena el texto de la Z a la A.'];
  P.b97 = ['¿En qué ciudades distintas viven los clientes registrados, de la A a la Z?', 'DISTINCT deja una fila por cada ciudad única.'];
  P.b98 = ['Muestra los 5 participantes más jóvenes: participant_id y age (empates por participant_id).', 'El orden ascendente es el de por defecto, así que salen primero las edades más pequeñas.'];
  P.b99 = ['Arregla el error: muestra cada segmento de cliente una vez.', 'Sin DISTINCT, el segmento se repite 400 veces: una por cada fila de cliente.'];
  P.b100 = ['¿Qué tiendas abrieron en 2021 o después? Devuelve city y opened_year.', '>= incluye el propio 2021; > empezaría en 2022.'];
  P.b101 = ['Encuentra los productos de las categorías Bakery o Food: name y category.', 'IN comprueba si un valor coincide con algún elemento de la lista.'];
  P.b102 = ['Hombres del grupo de control del centro South: participant_id.', 'Encadena tres condiciones con AND cuando tienen que cumplirse las tres.'];
  P.b103 = ['Arregla el error: pedidos para recoger hechos en la tienda 1: order_id.', 'OR devuelve todos los pedidos para recoger de todas partes MÁS todos los pedidos de la tienda 1.'];
  P.b104 = ['¿Cuál es el precio más bajo de la carta?', 'MIN devuelve el valor más pequeño de la columna.'];
  P.b105 = ['¿Cuántos pedidos se hicieron para recoger (pickup)?', 'Filtra las filas de pickup con WHERE y después cuéntalas.'];
  P.b106 = ['¿Cuáles son las edades del participante más joven y del mayor?', 'MIN y MAX en un mismo SELECT dan todo el rango de un vistazo.'];
  P.b107 = ['Arregla el error: unidades totales vendidas del product_id 1.', 'COUNT cuenta cuántas líneas de pedido incluían el producto 1, sin fijarse en si alguien compró 2 o 3 unidades.'];
  P.b108 = ['¿Cuántas tiendas abrieron cada año?', 'GROUP BY opened_year crea un grupo por cada año de apertura.'];
  P.b109 = ['Unidades totales vendidas por product_id, solo de los productos con más de 600 unidades vendidas.', 'Filtra el total del grupo con HAVING SUM(qty) > 600.'];
  P.b110 = ['El valor medio de las medidas de cada métrica.', 'Agrupar por métrica resume por separado vo2max, resting_hr y weight_kg.'];
  P.b111 = ['Arregla el error: el precio más alto de cada categoría de producto.', 'MIN da el precio más barato de cada categoría; MAX da el más alto.'];
  P.b112 = ['Unidades totales vendidas de cada categoría de producto: category y units.', 'Une order_items con products por product_id y después suma qty por categoría.'];
  P.b113 = ['¿Cuántos pedidos se hicieron en tiendas abiertas antes de 2021?', 'Une orders con stores para poder filtrar por stores.opened_year.'];
  P.b114 = ['La resting_hr media de cada sexo (F y M).', 'Enlaza measurements → sessions → participants, filtra resting_hr y agrupa por sexo.'];
  P.b115 = ['Arregla el error: muestra session_id y el group_name del participante de cada sesión.', 'Une por la clave foránea común (participant_id), nunca por session_id = participant_id.'];
  P.b116 = ['¿Cuántos clientes se registraron cada mes de 2024 (como AAAA-MM), en orden de calendario?', 'strftime(\'%Y-%m\', signup_date) saca el texto año-mes.'];
  P.b117 = ['Etiqueta las tiendas como \'early\' (abiertas antes de 2021) o \'recent\': city y era.', 'CASE WHEN convierte un umbral de año en una etiqueta limpia de dos valores.'];
  P.b118 = ['Cuenta los participantes por tramo de edad: \'under 30\', \'30 to 49\', \'50 plus\'.', 'Cada WHEN se revisa por turno, así que la segunda rama solo ve edades de 30 en adelante.'];
  P.b119 = ['Participantes mayores que el participante medio: participant_id y age.', 'La subconsulta escalar calcula primero la edad media general.'];
  P.b120 = ['Productos que se han pedido en una línea de 3 unidades (qty = 3): name.', 'IN (SELECT …) comprueba si el producto aparece en alguna línea de 3 unidades sin multiplicar filas.'];
  P.b121 = ['Arregla el error: el número medio de sesiones por participante.', 'SUM(n) vuelve a sumar todas las sesiones; AVG(n) promedia los recuentos por participante.'];
  P.b122 = ['Ranking denso de productos por precio, del más alto al más bajo: name, price, drnk.', 'DENSE_RANK no deja huecos en la numeración cuando dos precios empatan.'];
  P.b123 = ['La edad de cada participante junto a la edad media de su centro: participant_id, site, age, site_avg.', 'AVG(age) OVER (PARTITION BY site) pega la media del centro a cada fila de participante.'];

  I.add({ 'stars': 'estrellas', '🔒 Level {#0} · {1}': '🔒 Nivel {0} · {1}', 'Multi-CTE + NTILE / cumulative share': 'Varias CTE + NTILE / peso acumulado' });

  /* Text the games build while you play (arcade2-core.js, arcade-core.js). */
  I.add({
    // Formula X-ray
    'Tap the cells this formula adds up.': 'Toca las celdas que suma esta fórmula.', 'Tap the cells this formula averages.': 'Toca las celdas que promedia esta fórmula.',
    'Tap every cell in the range that holds the value this formula returns.': 'Toca cada celda del rango que contiene el valor que devuelve esta fórmula.',
    'Tap the cells this formula counts.': 'Toca las celdas que cuenta esta fórmula.', 'Tap the B cells of the rows this formula counts.': 'Toca las celdas B de las filas que cuenta esta fórmula.',
    'Tap the A cells of the rows this formula counts.': 'Toca las celdas A de las filas que cuenta esta fórmula.',
    'Tap the cells this formula counts. F1 holds {0}.': 'Toca las celdas que cuenta esta fórmula. F1 contiene {0}.', 'Tap the cells this formula adds up. F1 holds {0}.': 'Toca las celdas que suma esta fórmula. F1 contiene {0}.',
    'Tap the cell this formula returns.': 'Toca la celda que devuelve esta fórmula.', 'Tap the cells this formula returns (it spills a list).': 'Toca las celdas que devuelve esta fórmula (desborda una lista).',
    // Pandas pipeline
    'The 3 lines with the most qty, most first.': 'Las 3 líneas con más qty, de más a menos.', 'The 2 cheapest lines, cheapest first.': 'Las 2 líneas más baratas, de la más barata a la más cara.',
    'Only the city and qty columns, highest qty first.': 'Solo las columnas city y qty, con la qty más alta primero.',
    'The {#0} lines with the highest {1}.': 'Las {0} líneas con el {1} más alto.', 'The {#0} lines with the lowest {1}.': 'Las {0} líneas con el {1} más bajo.',
    'City and price of the 3 dearest lines, dearest first.': 'city y price de las 3 líneas más caras, de la más cara a la más barata.',
    'Only the {0} lines, most qty first.': 'Solo las líneas {0}, con más qty primero.', 'Lines with qty of {#0} or more, cheapest first.': 'Líneas con qty de {0} o más, de la más barata a la más cara.',
    'Lines with a price below {#0}, most qty first.': 'Líneas con un price menor que {0}, con más qty primero.', 'Only the lines from {0} and {1}, most qty first.': 'Solo las líneas de {0} y {1}, con más qty primero.',
    'Lines with qty of {#0} or more AND channel {1}: city and qty only.': 'Líneas con qty de {0} o más Y channel {1}: solo city y qty.',
    'Lines with qty of {#0} or more OR channel {1}, cheapest first.': 'Líneas con qty de {0} o más O channel {1}, de la más barata a la más cara.',
    'Total qty per city, biggest first.': 'qty total por city, de mayor a menor.', 'Average price per channel, highest first.': 'price medio por channel, de mayor a menor.',
    'Number of lines per city, most first.': 'Número de líneas por city, de más a menos.', 'The highest qty in each channel.': 'La qty más alta de cada channel.',
    'Total qty per city, counting only {0} lines, biggest first.': 'qty total por city, contando solo las líneas {0}, de mayor a menor.',
    'How many lines per channel, most first.': 'Cuántas líneas hay por channel, de más a menos.', 'Each city\'s share of the lines (0 to 1), biggest first.': 'El peso de cada city sobre las líneas (de 0 a 1), de mayor a menor.',
    'Total qty per channel as a table with two columns: channel and qty.': 'qty total por channel como una tabla de dos columnas: channel y qty.',
    'Only the lines with a known qty, most qty first.': 'Solo las líneas con una qty conocida, con más qty primero.',
    'Average qty per city when a missing qty counts as 0.': 'qty media por city cuando una qty que falta cuenta como 0.',
    'Some lines were exported twice. Count the lines per channel, each line once.': 'Algunas líneas se exportaron dos veces. Cuenta las líneas por channel, cada línea una vez.',
    'Revenue (qty × price) per city, biggest first.': 'Ingresos (qty × price) por city, de mayor a menor.',
    'Total qty with a row per city and a column per channel, 0 where there is nothing.': 'qty total con una fila por city y una columna por channel, con 0 donde no hay nada.',
    'Total qty per country. The regions table links each city to its country.': 'qty total por country. La tabla regions enlaza cada city con su país.',
    // Slicer safe
    'City': 'Ciudad', 'Channel': 'Canal', 'Category': 'Categoría', 'Month': 'Mes',
    'Every slicer filters the sum.': 'Cada segmentación filtra la suma.', 'COUNTROWS counts the order lines the slicers leave.': 'COUNTROWS cuenta las líneas de pedido que dejan las segmentaciones.',
    'Every slicer filters the orders it counts, and each order counts once.': 'Cada segmentación filtra los pedidos que cuenta, y cada pedido cuenta una vez.',
    'Each customer counts once, however many lines they bought.': 'Cada cliente cuenta una vez, compre las líneas que compre.',
    'ALL(Sales[channel]) removes the channel filter, so the Channel slicer does nothing here.': 'ALL(Sales[channel]) quita el filtro de canal, así que aquí la segmentación de canal no hace nada.',
    'ALL(Sales[store_city]) removes the city filter, so the City slicer does nothing here.': 'ALL(Sales[store_city]) quita el filtro de ciudad, así que aquí la segmentación de ciudad no hace nada.',
    'The CALCULATE filter on channel replaces the slicer, so the Channel slicer does nothing here.': 'El filtro de canal de CALCULATE sustituye a la segmentación, así que aquí la segmentación de canal no hace nada.',
    'The CALCULATE filter on category replaces the slicer, so the Category slicer does nothing here.': 'El filtro de categoría de CALCULATE sustituye a la segmentación, así que aquí la segmentación de categoría no hace nada.',
    'REMOVEFILTERS(Sales[category]) clears the category filter: the Category slicer is ignored.': 'REMOVEFILTERS(Sales[category]) borra el filtro de categoría: la segmentación de categoría se ignora.',
    'A share of all cities: the City slicer moves the top of the fraction only.': 'Un peso sobre todas las ciudades: la segmentación de ciudad solo mueve el numerador.',
    'A share of all channels: the Channel slicer moves only the top of the fraction, the other slicers move both.': 'Un peso sobre todos los canales: la segmentación de canal solo mueve el numerador; las demás mueven los dos.',
    'An average price changes with the mix of products the slicers leave.': 'Un precio medio cambia con la mezcla de productos que dejan las segmentaciones.',
    'AVERAGEX works out qty × price on every line first, then averages those line values.': 'AVERAGEX calcula primero qty × price en cada línea y después promedia esos valores.',
    'Revenue: every slicer filters the rows SUMX goes through.': 'Ingresos: cada segmentación filtra las filas que recorre SUMX.',
    'The Month slicer filters the order dates like any other column.': 'La segmentación de mes filtra las fechas de pedido como cualquier otra columna.',
    'DATEADD moves the dates back a month: picking March shows February.': 'DATEADD mueve las fechas un mes atrás: si eliges marzo, se ve febrero.',
    'TOTALYTD adds up from January to the month you pick.': 'TOTALYTD suma desde enero hasta el mes que elijas.',
    'RANKX compares the city you pick with every city: 1 is the biggest.': 'RANKX compara la ciudad que eliges con todas las ciudades: 1 es la más grande.',
    // Pill match
    'Put one blue pill on Rows and one green pill on Columns.': 'Pon una píldora azul en Filas y una verde en Columnas.', 'Right bars, wrong order: look at the Sort button.': 'Barras correctas, orden equivocado: mira el botón de ordenar.',
    'The labels down the side are different: try another blue pill.': 'Las etiquetas del lateral son distintas: prueba otra píldora azul.',
    'The target shows fewer bars: is a Top N filter on?': 'El objetivo muestra menos barras: ¿hay un filtro Top N activo?', 'A different number of bars: check the Top N filter.': 'Un número distinto de barras: revisa el filtro Top N.',
    'The labels match but the numbers do not: look at the table calculation.': 'Las etiquetas coinciden pero los números no: mira el cálculo de tabla.',
    'The labels match but the bars are shorter or longer: is the right filter on?': 'Las etiquetas coinciden pero las barras son más cortas o más largas: ¿está puesto el filtro correcto?',
    'The labels match, but the bar lengths do not: try another green pill.': 'Las etiquetas coinciden, pero la longitud de las barras no: prueba otra píldora verde.',
    // Guess the correlation
    'A tight, clear line: |r| is large.': 'Una línea clara y apretada: |r| es grande.', 'Moderate relationships look like a tilted, fuzzy cloud.': 'Las relaciones moderadas parecen una nube inclinada y difusa.',
    'Weak relationships are hard to see: most real ones are like this.': 'Las relaciones débiles cuestan de ver: la mayoría de las reales son así.',
    'With only a few points, chance shapes the picture a lot.': 'Con pocos puntos, el azar decide mucho la forma de la imagen.', 'Most of this correlation comes from one far-away point.': 'Casi toda esta correlación viene de un punto muy alejado.',
    'One point against the trend pulls r towards 0.': 'Un punto contra la tendencia empuja r hacia 0.', 'Two groups with no trend inside each one still give a correlation.': 'Dos grupos sin tendencia dentro de cada uno siguen dando una correlación.',
    'A bend that always rises or always falls still gives a large r, but below 1.': 'Una curva que siempre sube o siempre baja sigue dando una r grande, pero menor que 1.',
    'A clear U-shape, yet r is near 0: r only measures straight lines.': 'Una U clara y, aun así, r está cerca de 0: r solo mide rectas.',
    'Only a narrow slice of x is shown, which shrinks r even though the relationship is strong.': 'Solo se ve una franja estrecha de x, lo que encoge r aunque la relación sea fuerte.',
    'Pandas pipeline': 'Pipeline de pandas',
  });
})();
