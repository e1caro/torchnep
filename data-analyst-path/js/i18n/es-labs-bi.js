/* Spanish (Spain): DotBI worlds, levels and challenges. Measures stay as they are. See es-labs.js for the format. */
(function () {
  'use strict';
  var DA = window.DA;
  var T = (DA.labsEs = DA.labsEs || {});
  T.bi = {
    tagline: 'Medidas de Power BI (DAX) y cálculos de Tableau sobre un pequeño modelo de datos de la cafetería: ve cada resultado como tarjeta, matriz y gráfico.',
    help: 'Escribe una medida y pulsa Intro (o Evaluar). El modelo de la cafetería tiene dos tablas: Sales (una fila por línea de pedido, con un campo de mes) y Customers, enlazadas por customer_id; el mundo 8 usa el modelo de Dot Club (Members e Invoices). Elige un campo en "Filas" para ver la medida para cada valor, como en una matriz de Power BI: el gráfico la sigue. Comprobar compara tu medida con la respuesta en el total y en cada fila de la matriz, así que tiene que estar bien en todos los contextos de filtro. Los retos de Tableau usan nombres entre corchetes [campo] y { FIXED [dim] : ... }.',
    worlds: [], ch: {},
  };
  var W = T.bi.worlds, C = T.bi.ch;

  W.push(['Medidas DAX', 'Agregaciones, iteradores como SUMX y cocientes seguros con DIVIDE.', [
    ['Agregaciones', 'Una primera medida', 'Una medida agrega una columna. Power BI la vuelve a evaluar en cada celda de un visual, usando esa celda como filtro.'],
    ['Distintos y extremos', 'DISTINCTCOUNT', 'Un pedido tiene varias líneas: DISTINCTCOUNT cuenta cada pedido una sola vez.'],
    ['Fila a fila: SUMX', 'Ingresos', 'SUMX recorre cada fila, calcula la expresión y después suma. SUM no puede multiplicar dos columnas.'],
    ['Cocientes con DIVIDE', 'División segura', 'DIVIDE devuelve un blanco en lugar de un error cuando el denominador es cero.'],
  ]]);
  C.bi01 = { t: 'Unidades vendidas', k: 'Escribe una medida con la cantidad total vendida.', h: 'Usa <code>SUM(Sales[qty])</code>.' };
  C.bi02 = { t: 'Precio medio', k: 'Escribe una medida con el precio unitario medio.', h: 'Usa <code>AVERAGE(Sales[unit_price])</code>.' };
  C.bi03 = { t: 'Líneas de pedido', k: 'Escribe una medida que cuente las filas de la tabla Sales.', h: 'Usa <code>COUNTROWS(Sales)</code>.' };
  C.bi04 = { t: 'Clientes', k: 'Cuenta los clientes distintos que compraron.', h: 'Usa <code>DISTINCTCOUNT(Sales[customer_id])</code>.' };
  C.bi05 = { t: 'Precio más alto', k: 'Escribe una medida con el precio unitario más alto.', h: 'Usa <code>MAX(Sales[unit_price])</code>.' };
  C.bi06 = { t: 'Pedidos', k: 'Cuenta los pedidos (no las líneas).', h: 'Cuenta los order_id distintos: <code>DISTINCTCOUNT(Sales[order_id])</code>.' };
  C.bi07 = { t: 'Ingresos', k: 'Escribe una medida de ingresos: cantidad × precio unitario, sumado.', h: 'Usa <code>SUMX(Sales, Sales[qty] * Sales[unit_price])</code>.' };
  C.bi08 = { t: 'Ingreso medio por línea', k: 'Escribe los ingresos medios (qty × precio unitario) de una línea.', h: 'La versión X de AVERAGE: <code>AVERAGEX(Sales, ...)</code>.' };
  C.bi09 = { t: 'Ingresos con impuesto', k: 'Escribe los ingresos con un 21 % de impuesto incluido.', h: 'Multiplica dentro de SUMX: <code>Sales[qty] * Sales[unit_price] * 1.21</code>.' };
  C.bi10 = { t: 'Unidades por pedido', k: 'Unidades medias por pedido: la cantidad total dividida entre el número de pedidos.', h: 'Usa <code>DIVIDE(SUM(Sales[qty]), DISTINCTCOUNT(Sales[order_id]))</code>.' };
  C.bi11 = { t: 'Importe medio por pedido', k: 'Los ingresos divididos entre el número de pedidos.', h: 'Los ingresos son un SUMX; los pedidos, un DISTINCTCOUNT.' };
  C.bi12 = { t: 'Líneas por cliente', k: 'Las líneas de pedido divididas entre el número de clientes distintos.', h: 'Usa <code>DIVIDE(COUNTROWS(Sales), DISTINCTCOUNT(Sales[customer_id]))</code>.' };

  W.push(['Contexto de filtro y CALCULATE', 'Cambia los filtros que ve una medida: condiciones, FILTER y ALL.', [
    ['Un filtro', 'CALCULATE', 'CALCULATE evalúa una medida con los filtros cambiados. La condición sustituye cualquier filtro sobre esa columna.'],
    ['Varios filtros', 'Y entre filtros', 'Cada argumento de filtro extra reduce las filas (se combinan con Y).'],
    ['Tablas con FILTER', 'FILTER', 'FILTER devuelve las filas de una tabla que cumplen una condición: úsalo cuando la condición necesite un cálculo o varias columnas.'],
    ['Quita filtros: ALL', 'Peso sobre el total', 'ALL quita filtros, así que el denominador siempre es el total general: el clásico "% del total".'],
  ]]);
  C.bi13 = { t: 'Unidades a domicilio', k: 'La cantidad total de los pedidos <code>delivery</code>, sea cual sea el canal que muestre el visual.', h: 'Usa <code>CALCULATE(SUM(Sales[qty]), Sales[channel] = "delivery")</code>.' };
  C.bi14 = { t: 'Líneas de café', k: 'Cuenta las filas de Sales de la categoría <code>Coffee</code>.', h: 'Usa <code>CALCULATE(COUNTROWS(Sales), Sales[category] = "Coffee")</code>.' };
  C.bi15 = { t: 'Unidades en Madrid', k: 'La cantidad total vendida en <code>Madrid</code>, mostrada por canal.', h: 'Filtra store_city dentro de CALCULATE.' };
  C.bi16 = { t: 'Café para recoger', k: 'La cantidad total de <code>Coffee</code> vendida por <code>pickup</code>.', h: 'Dos argumentos de filtro en CALCULATE.' };
  C.bi17 = { t: 'Líneas grandes', k: 'Cuenta las filas de Sales con una cantidad de 2 o más.', h: 'Usa <code>Sales[qty] >= 2</code> como filtro.' };
  C.bi18 = { t: 'Dos ciudades', k: 'La cantidad total vendida en <code>Paris</code> o <code>Lisbon</code>.', h: 'Usa IN: <code>Sales[store_city] IN {"Paris", "Lisbon"}</code>.' };
  C.bi19 = { t: 'Unidades de los artículos más caros', k: 'La cantidad total de las líneas con un precio unitario mayor que 4, usando FILTER.', h: 'Usa <code>CALCULATE(SUM(Sales[qty]), FILTER(Sales, Sales[unit_price] > 4))</code>.' };
  C.bi20 = { t: 'Líneas de más de 10', k: 'Cuenta las líneas cuyos ingresos (qty × precio unitario) pasan de 10.', h: 'COUNTROWS de un FILTER con una condición calculada.' };
  C.bi21 = { t: 'Ingresos a domicilio', k: 'Los ingresos (qty × precio unitario) solo de las líneas <code>delivery</code>.', h: 'Recorre una tabla filtrada: <code>SUMX(FILTER(Sales, ...), ...)</code>.' };
  C.bi22 = { t: 'Peso sobre todas las unidades', k: 'El peso de cada fila sobre la cantidad total general (una fracción entre 0 y 1).', h: 'Divide entre <code>CALCULATE(SUM(Sales[qty]), ALL(Sales))</code>.' };
  C.bi23 = { t: 'Ignora la ciudad', k: 'La cantidad total ignorando cualquier filtro de ciudad (el mismo número en todas las filas).', h: 'Usa <code>ALL(Sales[store_city])</code> dentro de CALCULATE.' };
  C.bi24 = { t: 'Peso del café', k: 'Dentro de cada fila, la proporción de la cantidad que es <code>Coffee</code>.', h: 'La cantidad de café dividida entre toda la cantidad: <code>DIVIDE(CALCULATE(SUM(Sales[qty]), Sales[category] = "Coffee"), SUM(Sales[qty]))</code>.' };

  W.push(['El modelo de datos', 'Relaciones, RELATED, IF y variables.', [
    ['Los filtros siguen las relaciones', 'Segmenta por una dimensión', 'Customers filtra Sales mediante customer_id: una medida sobre Sales se puede dividir por cualquier columna de Customers.'],
    ['RELATED en un contexto de fila', 'RELATED', 'Dentro de SUMX o FILTER sobre Sales, RELATED trae un valor de la fila relacionada de Customers.'],
    ['IF y redondeo', 'IF sobre una medida', 'IF también funciona con medidas: útil para indicadores y umbrales.'],
    ['Variables', 'VAR y RETURN', 'Las variables ponen nombre a los pasos de una medida: se lee mejor y cada una se calcula una sola vez.'],
  ]]);
  C.bi25 = { t: 'Unidades por segmento', k: 'La cantidad total, mostrada por segmento de cliente.', h: 'Basta con <code>SUM(Sales[qty])</code>: la relación hace el trabajo.' };
  C.bi26 = { t: 'Compradores por segmento', k: 'El número de clientes distintos que compraron, por segmento.', h: 'Usa <code>DISTINCTCOUNT(Sales[customer_id])</code>.' };
  C.bi27 = { t: 'Clientes registrados', k: 'El número de filas de la tabla Customers, por segmento.', h: 'Usa <code>COUNTROWS(Customers)</code>.' };
  C.bi28 = { t: 'Unidades de estudiantes', k: 'La cantidad total comprada por clientes <code>student</code>, usando SUMX y RELATED.', h: 'Usa <code>SUMX(Sales, IF(RELATED(Customers[segment]) = "student", Sales[qty], 0))</code>.' };
  C.bi29 = { t: 'Comprar en casa', k: 'Cuenta las líneas en las que la ciudad del cliente coincide con la ciudad de la tienda.', h: 'COUNTROWS(FILTER(Sales, RELATED(Customers[city]) = Sales[store_city])).' };
  C.bi30 = { t: 'Unidades de jubilados', k: 'La cantidad total comprada por clientes <code>retired</code>, usando CALCULATE con un filtro de Customers.', h: 'Usa <code>CALCULATE(SUM(Sales[qty]), Customers[segment] = "retired")</code>.' };
  C.bi31 = { t: 'Indicador de ciudad grande', k: 'Devuelve 1 donde la cantidad total pasa de 1.500 y 0 en el resto.', h: 'Usa <code>IF(SUM(Sales[qty]) > 1500, 1, 0)</code>.' };
  C.bi32 = { t: 'Precio por unidad', k: 'Los ingresos divididos entre las unidades, redondeado a 2 decimales.', h: 'Usa <code>ROUND(DIVIDE(SUMX(...), SUM(Sales[qty])), 2)</code>.' };
  C.bi33 = { t: 'Domicilio o en blanco', k: 'La cantidad total solo para el canal delivery; en blanco para los demás.', h: 'Compara el canal con una agregación, por ejemplo <code>IF(MIN(Sales[channel]) = "delivery", SUM(Sales[qty]))</code>.' };
  C.bi34 = { t: 'Importe por pedido con VAR', k: 'El importe medio por pedido escrito con dos variables (ingresos y pedidos).', h: 'VAR rev = SUMX(...) VAR orders = DISTINCTCOUNT(...) RETURN DIVIDE(rev, orders).' };
  C.bi35 = { t: 'Peso con VAR', k: 'El peso sobre la cantidad total general, con el total en una variable.', h: 'VAR total = CALCULATE(SUM(Sales[qty]), ALL(Sales)) RETURN DIVIDE(SUM(Sales[qty]), total).' };
  C.bi36 = { t: 'Proporción de líneas grandes', k: 'La proporción de líneas con una cantidad de 2 o más.', h: 'VAR big = COUNTROWS(FILTER(Sales, Sales[qty] >= 2)) RETURN DIVIDE(big, COUNTROWS(Sales)).' };

  W.push(['Cálculos de Tableau y LOD', 'Campos calculados, IIF, fechas y nivel de detalle FIXED.', [
    ['Campos calculados', 'Agrega un campo', 'En Tableau, los campos se escriben entre corchetes. La aritmética a nivel de fila va dentro de la agregación.'],
    ['IIF y condiciones', 'Suma con condición', 'IIF(prueba, entonces, si no) funciona fila a fila; después la agregación suma los resultados.'],
    ['Nivel de detalle FIXED', '{ FIXED }', 'FIXED calcula un valor por cliente (o por cualquier dimensión), muestre lo que muestre la vista. Envuélvelo en una agregación para usarlo en la vista.'],
    ['Fechas', 'Partes de una fecha', 'DATEPART(\'month\', fecha) o MONTH(fecha) dan el número de mes; YEAR y DAY funcionan igual.'],
  ]]);
  C.bi37 = { t: 'Unidades (Tableau)', k: 'La cantidad total como cálculo de Tableau.', h: 'Usa <code>SUM([qty])</code>.' };
  C.bi38 = { t: 'Ingresos (Tableau)', k: 'Los ingresos: cantidad × precio unitario, sumado.', h: 'Usa <code>SUM([qty] * [unit_price])</code>.' };
  C.bi39 = { t: 'Clientes distintos', k: 'Cuenta los clientes distintos.', h: 'Tableau usa <code>COUNTD([customer_id])</code>.' };
  C.bi40 = { t: 'Unidades a domicilio', k: 'La cantidad total de las líneas a domicilio.', h: 'Usa <code>SUM(IIF([channel] = "delivery", [qty], 0))</code>.' };
  C.bi41 = { t: 'Cuenta las líneas grandes', k: 'Cuenta las líneas con una cantidad de 2 o más.', h: 'Suma 1 por cada línea grande: <code>SUM(IIF([qty] >= 2, 1, 0))</code>.' };
  C.bi42 = { t: 'Precio del café', k: 'El precio unitario medio solo de las líneas de Coffee.', h: 'AVG ignora los NULL: <code>AVG(IIF([category] = "Coffee", [unit_price], NULL))</code>.' };
  C.bi43 = { t: 'Peso sobre el total general', k: 'La cantidad de cada ciudad como proporción del total general, usando { FIXED : SUM([qty]) } para el total.', h: 'Usa <code>SUM([qty]) / MIN({ FIXED : SUM([qty]) })</code>.' };
  C.bi44 = { t: 'Cohorte de enero', k: 'Cuenta los clientes cuyo PRIMER pedido fue en enero (análisis de cohortes).', h: 'Primer pedido de cada cliente: <code>{ FIXED [customer_id] : MIN([order_date]) }</code>. Después <code>COUNTD(IIF(MONTH(...) = 1, [customer_id], NULL))</code>.' };
  C.bi45 = { t: 'El mayor cliente de cada ciudad', k: 'En cada ciudad, la mayor cantidad que compró un solo cliente en esa ciudad. Fija el nivel de detalle en cliente Y ciudad.', h: 'Dos dimensiones: <code>MAX({ FIXED [customer_id], [store_city] : SUM([qty]) })</code>.' };
  C.bi46 = { t: 'Unidades de diciembre', k: 'La cantidad total vendida en diciembre.', h: 'Usa <code>SUM(IIF(MONTH([order_date]) = 12, [qty], 0))</code>.' };
  C.bi47 = { t: 'Pedidos del primer semestre', k: 'Cuenta los pedidos distintos hechos de enero a junio.', h: 'Usa <code>COUNTD(IIF(DATEPART(\'month\', [order_date]) <= 6, [order_id], NULL))</code>.' };
  C.bi48 = { t: 'Precio medio en el 4.º trimestre', k: 'El precio unitario medio de las líneas de octubre, noviembre y diciembre.', h: 'AVG(IIF(MONTH([order_date]) >= 10, [unit_price], NULL)).' };

  W.push(['Inteligencia de tiempo', 'Acumulado del año, el mes anterior y la variación mes a mes, con Sales[month] en las filas.', [
    ['Acumulado del año', 'TOTALYTD', 'El acumulado del año suma todo desde el 1 de enero hasta la última fecha del filtro actual. En una matriz por meses va creciendo mes a mes.'],
    ['El mes anterior', 'DATEADD', 'DATEADD desplaza las fechas del filtro. Dentro de CALCULATE sustituye el mes de la fila por el mes anterior.'],
    ['Mes a mes', 'VAR para que se entienda', 'Las variables ponen nombre a cada parte de un cálculo, así que la última línea se lee como la pregunta de negocio.'],
    ['Caza de errores', 'Signos y unidades', 'Lee en voz alta las medidas de tiempo: "menos un mes" va hacia atrás; "más", hacia delante.'],
  ]]);
  C.bi49 = { t: 'Unidades acumuladas del año', k: 'La cantidad total desde el 1 de enero hasta el final de cada mes.', h: 'Usa <code>TOTALYTD(SUM(Sales[qty]), Sales[order_date])</code>.' };
  C.bi50 = { t: 'Ingresos acumulados del año', k: 'Los ingresos (cantidad × precio unitario) acumulados del año.', h: 'Pon el SUMX dentro de TOTALYTD.' };
  C.bi51 = { t: 'Pedidos acumulados del año', k: 'El número de pedidos distintos acumulado del año, escrito con CALCULATE y DATESYTD.', h: 'Usa <code>CALCULATE(DISTINCTCOUNT(Sales[order_id]), DATESYTD(Sales[order_date]))</code>.' };
  C.bi52 = { t: 'Unidades del mes anterior', k: 'Para cada mes, la cantidad del mes anterior.', h: 'Usa <code>CALCULATE(SUM(Sales[qty]), DATEADD(Sales[order_date], -1, MONTH))</code>.' };
  C.bi53 = { t: 'Ingresos del mes anterior', k: 'Para cada mes, los ingresos del mes anterior, usando PREVIOUSMONTH.', h: 'Usa <code>CALCULATE(SUMX(Sales, Sales[qty] * Sales[unit_price]), PREVIOUSMONTH(Sales[order_date]))</code>.' };
  C.bi54 = { t: 'Dos meses atrás', k: 'Para cada mes, la cantidad de dos meses antes.', h: 'DATEADD con -2.' };
  C.bi55 = { t: 'Variación de unidades', k: 'La cantidad de este mes menos la del mes anterior.', h: 'Dos VAR (cur, prev) y después <code>RETURN cur - prev</code>.' };
  C.bi56 = { t: 'Variación en %', k: 'La variación mes a mes de la cantidad como cociente sobre el mes anterior (en blanco cuando no hay mes anterior).', h: 'RETURN <code>DIVIDE(cur - prev, prev)</code>.' };
  C.bi57 = { t: 'Peso sobre lo que va de año', k: 'La cantidad de cada mes como proporción de la cantidad acumulada del año.', h: 'Divide (DIVIDE) el mes entre TOTALYTD.' };
  C.bi58 = { t: 'El mes anterior, no el siguiente', k: 'La medida debería mostrar la cantidad del mes anterior, pero muestra la del siguiente. Arréglala.', h: 'El signo del desplazamiento decide la dirección.' };
  C.bi59 = { t: 'Unidades por pedido', k: 'Unidades por pedido por mes. La IA divide entre líneas de pedido en lugar de entre pedidos. Arréglalo.', h: 'Los pedidos son DISTINCTCOUNT(Sales[order_id]).' };
  C.bi60 = { t: 'Ingresos acumulados del año', k: 'Ingresos acumulados del año. La IA suma precios en lugar de ingresos. Arréglalo.', h: 'Los ingresos son cantidad × precio unitario, fila a fila.' };

  W.push(['Rankings y top N', 'RANKX, TOPN y pesos sobre el total, más peticiones del equipo.', [
    ['RANKX', 'Puesto en una matriz', 'ALL(Sales[product]) es la lista de todos los productos. RANKX evalúa la medida para cada uno y le da su posición al producto actual.'],
    ['TOPN y pesos', 'El top 3 como filtro', 'TOPN devuelve las mejores filas de una tabla; dentro de CALCULATE se convierte en un filtro sobre esos productos.'],
    ['Predice el total', 'Lee una medida', 'ALL(columna) es la lista de sus valores distintos, haya los filtros que haya.'],
    ['Peticiones del equipo', 'Elige la medida', 'Las unidades y los ingresos pueden ordenar los productos de forma muy distinta: un bocadillo se vende menos que un espresso, pero deja más.'],
  ]]);
  C.bi61 = { t: 'Ordena productos por unidades', k: 'El puesto de cada producto por cantidad vendida (1 = el más vendido).', h: 'Usa <code>RANKX(ALL(Sales[product]), SUM(Sales[qty]))</code>.' };
  C.bi62 = { t: 'Ordena ciudades por ingresos', k: 'El puesto de cada ciudad por ingresos.', h: 'RANKX sobre ALL(Sales[store_city]) con el SUMX de ingresos.' };
  C.bi63 = { t: 'Ordena categorías por pedidos', k: 'El puesto de cada categoría por su número de pedidos distintos.', h: 'RANKX sobre ALL(Sales[category]) con DISTINCTCOUNT(Sales[order_id]).' };
  C.bi64 = { t: 'Unidades del top 3 de productos', k: 'La cantidad vendida de los 3 productos más vendidos en total, en cada ciudad.', h: 'CALCULATE con <code>TOPN(3, ALL(Sales[product]), SUM(Sales[qty]))</code>.' };
  C.bi65 = { t: 'Peso sobre todos los productos', k: 'La cantidad de cada producto como proporción de todos los productos.', h: 'Divide (DIVIDE) entre <code>CALCULATE(SUM(Sales[qty]), ALL(Sales[product]))</code>.' };
  C.bi66 = { t: 'Peso del top 3', k: 'En cada ciudad, la proporción de la cantidad que viene de los 3 productos más vendidos en total.', h: 'Las unidades del top 3 divididas entre todas las unidades de la ciudad.' };
  C.bi67 = { t: '¿Cuántas filas?', k: 'Sin evaluarla: ¿cuál es el total de esta medida?', h: 'Resuélvela desde dentro.', y: 'TOPN se queda con los 3 mejores productos.' };
  C.bi68 = { t: 'Un puesto en lo más alto', k: 'Sin evaluarla: ¿cuál es el total de esta medida?', h: 'Resuélvela desde dentro.', y: 'Sin filtro de ciudad, el total supera a cada ciudad por separado, así que queda primero.' };
  C.bi69 = { t: 'Categorías distintas', k: 'Sin evaluarla: ¿cuál es el total de esta medida?', h: 'Resuélvela desde dentro.', y: 'Coffee, Tea, Bakery y Food.' };
  C.bi70 = { t: '¿Qué productos importan?', k: 'Ordena los productos por ingresos (1 = el más alto).', h: 'RANKX sobre ALL(Sales[product]) con el SUMX de ingresos.', a: { w: 'Ana (finanzas)', s: '¿Qué productos son los que más nos importan?', q: '¿Qué ranking responde a una pregunta de finanzas?', o: ['Por unidades vendidas', 'Por ingresos', 'Por número de clientes', 'Por orden alfabético'], y: 'A finanzas le importa el dinero: ordena por ingresos, y dilo en el título.' } };
  C.bi71 = { t: 'Nuestro top 5', k: 'La proporción de los ingresos que viene de los 5 productos con más ingresos.', h: 'Los ingresos de TOPN(5, ...) divididos entre todos los ingresos.', a: { w: 'Lena (fundadora)', s: 'Enséñame nuestro top 5.', q: '¿Qué hace útil un "top 5" en una diapositiva para el consejo?', o: ['Una lista de cinco nombres', 'Los cinco productos más baratos', 'El top 5 por ingresos, como proporción de todos los ingresos', 'Los cinco productos más nuevos'], y: 'Nombra la medida y da contexto: qué parte del negocio sostienen esos cinco.' } };
  C.bi72 = { t: '¿Está creciendo el reparto?', k: 'La cantidad a domicilio de este mes menos la del mes anterior.', h: 'Dos CALCULATE con Sales[channel] = "delivery"; el segundo además con DATEADD.', a: { w: 'Theo (marketing)', s: '¿Está creciendo el reparto a domicilio?', q: '¿Qué enseñarías?', o: ['Las unidades a domicilio de cada mes frente al mes anterior', 'Las unidades totales de todos los canales', 'El peso del reparto solo en diciembre', 'El número de clientes de reparto de todos los tiempos'], y: 'Crecer es cambiar en el tiempo: compara cada mes con el anterior, solo para el reparto.' } };

  W.push(['Cálculos de tabla y LOD en Tableau', 'Sumas acumuladas, rankings, INCLUDE y EXCLUDE, traducir DAX y un caso práctico.', [
    ['Cálculos de tabla', 'A lo largo de la vista', 'Un cálculo de tabla trabaja sobre las marcas de la vista (aquí, los meses en orden): sumas acumuladas, medias de ventana y rankings.'],
    ['INCLUDE y EXCLUDE', 'Más fino y más grueso', 'INCLUDE añade una dimensión a la vista (por cliente dentro de cada ciudad); EXCLUDE quita una (todo el total detrás de cada ciudad).'],
    ['Rosetta: DAX y Tableau', 'La misma idea, dos herramientas', 'Las dos herramientas agregan columnas; cambian en la sintaxis y en cómo tratan el contexto.'],
    ['Caso práctico', 'Deja que la vista responda', 'Pon la medida en la dimensión adecuada y la respuesta está a un vistazo.'],
  ]]);
  C.bi73 = { t: 'Unidades acumuladas', k: 'El total acumulado de la cantidad, mes a mes.', h: 'Usa <code>RUNNING_SUM(SUM([qty]))</code>.' };
  C.bi74 = { t: 'El mes medio', k: 'La cantidad mensual media, mostrada en todos los meses.', h: 'Usa <code>WINDOW_AVG(SUM([qty]))</code>.' };
  C.bi75 = { t: 'Ordena las ciudades', k: 'El puesto de cada ciudad por cantidad.', h: 'Usa <code>RANK(SUM([qty]))</code>.' };
  C.bi76 = { t: 'Unidades por cliente', k: 'En cada ciudad, la cantidad media por cliente.', h: 'Usa <code>AVG({ INCLUDE [customer_id] : SUM([qty]) })</code>.' };
  C.bi77 = { t: 'Peso sobre todas las ciudades', k: 'La cantidad de cada ciudad como proporción de todas las ciudades, usando EXCLUDE.', h: 'Usa <code>SUM([qty]) / MIN({ EXCLUDE [store_city] : SUM([qty]) })</code>.' };
  C.bi78 = { t: 'El pedido más grande', k: 'En cada canal, la mayor cantidad en un solo pedido.', h: 'Usa <code>MAX({ INCLUDE [order_id] : SUM([qty]) })</code>.' };
  C.bi79 = { t: 'Peso sobre el total', k: 'Escribe la versión de Tableau de la medida DAX que se da.', h: 'Un cálculo de tabla: <code>SUM([qty]) / TOTAL(SUM([qty]))</code>.' };
  C.bi80 = { t: 'Pedidos', k: 'Escribe la versión DAX del cálculo de Tableau que se da.', h: 'COUNTD pasa a ser DISTINCTCOUNT sobre Sales[order_id].' };
  C.bi81 = { t: 'Ingresos', k: 'Escribe la versión de Tableau de la medida DAX que se da.', h: 'Multiplica dentro de SUM: <code>SUM([qty] * [unit_price])</code>.' };
  C.bi82 = { t: 'El mes punta', k: 'Ordena los meses por cantidad.', h: 'Usa <code>RANK(SUM([qty]))</code> con los meses en las filas.', f: { q: '¿Qué mes queda primero?', o: ['2025-01', '2025-06', '2025-12', '2025-08'], y: 'El mes de más trabajo es por donde empieza la planificación de personal y de stock.' } };
  C.bi83 = { t: 'Clientes fieles', k: 'La proporción de clientes con 15 pedidos o más.', h: 'Pedidos por cliente con FIXED, después un COUNTD de los que pasan, dividido entre todos los clientes.' };
  C.bi84 = { t: 'El punto medio', k: 'La proporción acumulada de la cantidad del año, mes a mes.', h: 'RUNNING_SUM dividido entre TOTAL.', f: { q: '¿En qué mes pasa la proporción acumulada del 50 %?', o: ['2025-06', '2025-07', '2025-05', '2025-09'], y: 'La mitad de las ventas del año llega después de la mitad del año: el segundo semestre tiene más trabajo.' } };

  W.push(['El modelo de Dot Club', 'Un segundo modelo: Members y sus Invoices mensuales. Socios activos, bajas, ingresos y un dashboard para el consejo.', [
    ['Socios y facturas', 'Un modelo nuevo', 'Members tiene una fila por socio; Invoices, una fila por socio y mes, enlazadas por member_id. Un filtro sobre Members llega a las facturas.'],
    ['Ingresos cobrados y bajas', 'Solo lo que se cobró', 'Facturado no es cobrado: los pagos fallidos forman parte de la historia.'],
    ['Ponlas en orden', 'Primero las variables', 'En DAX cada VAR va antes de RETURN, y una variable solo puede usar las que tiene encima.'],
    ['Jefe: el dashboard del consejo', 'Un número por pregunta', 'Un dashboard para el consejo responde unas pocas preguntas fijas, igual todos los meses.'],
  ]]);
  C.bi85 = { t: 'Socios', k: 'Cuenta los socios.', h: 'Usa <code>COUNTROWS(Members)</code>.' };
  C.bi86 = { t: 'Socios activos', k: 'Cuenta los socios sin fecha de baja.', h: 'Filtra (FILTER) Members con <code>ISBLANK(Members[cancel_date])</code> y después COUNTROWS.' };
  C.bi87 = { t: 'Ingresos facturados', k: 'El importe total facturado.', h: 'Usa <code>SUM(Invoices[amount])</code>.' };
  C.bi88 = { t: 'Ingresos cobrados', k: 'El importe total de las facturas pagadas.', h: 'CALCULATE con <code>Invoices[paid] = 1</code>.' };
  C.bi89 = { t: 'Tasa de bajas', k: 'La proporción de socios que se dieron de baja.', h: 'Los que se dieron de baja (NOT ISBLANK) divididos entre todos los socios.' };
  C.bi90 = { t: 'Socios que pagan', k: 'El número de socios distintos con una factura pagada.', h: 'CALCULATE(DISTINCTCOUNT(Invoices[member_id]), Invoices[paid] = 1).' };
  C.bi91 = { t: 'Ingreso por socio que paga', k: 'Toca las líneas para formar una medida que funcione: los ingresos cobrados por socio que paga.', h: 'Primero las dos VAR, RETURN al final.' };
  C.bi92 = { t: 'Tasa de pagos fallidos', k: 'Toca las líneas para formar una medida que funcione: la proporción de facturas que fallaron.', h: 'Cuenta todas las facturas, cuenta las fallidas y después divide.' };
  C.bi93 = { t: 'Precio de un plan activo', k: 'Toca las líneas para formar una medida que funcione: el precio mensual medio de los socios activos.', h: 'Guarda los socios activos en una VAR y después AVERAGEX sobre ella.' };
  C.bi94 = { t: 'MRR de diciembre', k: 'Los ingresos cobrados en diciembre de 2025.', h: 'CALCULATE con dos filtros: paid = 1 y month = "2025-12".' };
  C.bi95 = { t: 'Bajas por mes de alta', k: 'El número de socios que se dieron de baja, por el mes en que empezaron.', h: 'CALCULATE(COUNTROWS(Members), NOT(ISBLANK(Members[cancel_date]))).' };
  C.bi96 = { t: 'Ingreso por socio', k: 'Los ingresos cobrados divididos entre el número de socios distintos que recibieron factura.', h: 'DIVIDE(ingresos cobrados, DISTINCTCOUNT(Invoices[member_id])).', f: { q: '¿Qué plan trae más ingresos por socio?', o: ['basic', 'plus', 'family', 'Todos igual'], y: 'El plan familiar es el que más cuesta cada mes, así que es el que más deja por socio aunque tenga menos socios.' } };
})();
