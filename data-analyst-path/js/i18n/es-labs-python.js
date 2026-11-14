/* Spanish (Spain): DotPython worlds, levels and challenges. Code stays as it is. See es-labs.js for the format. */
(function () {
  'use strict';
  var DA = window.DA;
  var T = (DA.labsEs = DA.labsEs || {});
  T.python = {
    tagline: 'Sintaxis real de pandas en tu navegador: carga, filtra, agrupa, une y limpia datos sin instalar nada.',
    help: 'Escribe Python con pandas (pd) y pulsa Ejecutar (Ctrl+Intro). Tab sangra. Los datos ya están cargados: df (líneas de pedidos de la cafetería), customers, stores y messy (pedidos escritos a mano). pd.read_csv("orders.csv") también funciona, igual que ab_test.csv, tickets.csv, events.csv, users.csv, members.csv e invoices.csv. Guarda tu respuesta en una variable llamada result y pulsa Comprobar. DotPython ejecuta un subconjunto seguro de Python: sin archivos de tu ordenador y sin internet.',
    worlds: [], ch: {},
  };
  var W = T.python.worlds, C = T.python.ch;

  W.push(['Primer vistazo a un DataFrame', 'Tamaño, columnas, elegir columnas, filtrar y ordenar filas.', [
    ['Tamaño y columnas', 'El tamaño de una tabla', 'df.shape es una propiedad (sin paréntesis): una tupla (filas, columnas). head() muestra las 5 primeras filas.'],
    ['Elige columnas', 'Una o varias columnas', 'Un par de corchetes da una Series. Una lista dentro de los corchetes (dos pares) da un DataFrame más pequeño.'],
    ['Filtra filas', 'Una condición entre corchetes', 'La condición crea una columna de True/False; df[...] se queda con las filas True. Combina condiciones con & (y) o | (o), cada una entre paréntesis.'],
    ['Ordena y quédate con los primeros', 'sort_values', 'ascending=False ordena de mayor a menor. head(n) se queda con las n primeras filas.'],
  ]]);
  C.py01 = { t: 'Cuenta las filas', k: '¿Cuántas filas (líneas de pedido) tiene <code>df</code>? Guárdalo en <code>result</code>.', h: 'Usa <code>len(df)</code> o <code>df.shape[0]</code>.' };
  C.py02 = { t: 'Cuenta las columnas', k: '¿Cuántas columnas tiene <code>df</code>? Guárdalo en <code>result</code>.', h: '<code>df.shape</code> es (filas, columnas): coge el elemento 1.' };
  C.py03 = { t: 'Lista las columnas', k: 'Haz una lista de Python con los nombres de las columnas de <code>df</code>. Guárdala en <code>result</code>.', h: 'Envuelve <code>df.columns</code> en <code>list()</code>.' };
  C.py04 = { t: 'Una columna', k: 'Selecciona la columna <code>product</code> de <code>df</code>. Guárdala en <code>result</code>.', h: 'Usa <code>df["product"]</code>.' };
  C.py05 = { t: 'Dos columnas', k: 'Selecciona las columnas <code>store_city</code> y <code>qty</code>, en ese orden. Guárdalo en <code>result</code>.', h: 'Dos pares de corchetes: <code>df[["store_city", "qty"]]</code>.' };
  C.py06 = { t: 'Valores distintos', k: 'Saca las categorías distintas de <code>df["category"]</code>. Guárdalo en <code>result</code>.', h: 'Las Series tienen un método <code>.unique()</code>.' };
  C.py07 = { t: 'Líneas más grandes', k: 'Quédate con las filas de <code>df</code> en las que <code>qty</code> es 2 o más. Guárdalo en <code>result</code>.', h: 'Usa <code>df[df["qty"] >= 2]</code>.' };
  C.py08 = { t: 'Dos condiciones', k: 'Quédate con las filas vendidas en <code>Madrid</code> por el canal <code>delivery</code>. Guárdalo en <code>result</code>.', h: 'Cada condición entre paréntesis, unidas con &: <code>df[(df["store_city"] == "Madrid") & (df["channel"] == "delivery")]</code>.' };
  C.py09 = { t: 'Una lista de valores', k: 'Quédate con las filas cuyo producto es <code>Latte</code> o <code>Espresso</code>, usando <code>isin</code>. Guárdalo en <code>result</code>.', h: 'Usa <code>df[df["product"].isin(["Latte", "Espresso"])]</code>.' };
  C.py10 = { t: 'Las líneas más caras', k: 'Ordena <code>df</code> por <code>unit_price</code> de mayor a menor y quédate con las 5 primeras filas. Guárdalo en <code>result</code>.', h: 'Usa <code>df.sort_values("unit_price", ascending=False).head(5)</code>.' };
  C.py11 = { t: 'Dos claves de orden', k: 'Ordena <code>df</code> por <code>store_city</code> (de la A a la Z) y después por <code>qty</code> (de mayor a menor). Guárdalo en <code>result</code>.', h: 'Pasa listas: <code>sort_values(["store_city", "qty"], ascending=[True, False])</code>.' };
  C.py12 = { t: 'Los 3 primeros, tres columnas', k: 'Muestra <code>order_id</code>, <code>product</code> y <code>qty</code> de las 3 filas con mayor <code>qty</code> (ordena de mayor a menor y coge 3). Guárdalo en <code>result</code>.', h: 'Ordena, coge 3 y después elige las columnas.' };

  W.push(['Resúmenes', 'Un número a partir de una columna, contar valores y columnas nuevas.', [
    ['Un número', 'Estadísticos de una columna', 'sum, mean, median, min, max y count convierten una columna en un número.'],
    ['Contar', 'value_counts', 'value_counts() cuenta cada valor, de mayor a menor. nunique() cuenta cuántos valores distintos hay.'],
    ['Columnas nuevas', 'Aritmética de columnas', 'La aritmética con columnas funciona fila a fila. Asignar a df["nombre"] añade la columna.'],
    ['Responde una pregunta', 'Filtra y después resume', 'La mayoría de las preguntas son un filtro seguido de un resumen.'],
  ]]);
  C.py13 = { t: 'Unidades vendidas', k: 'Calcula el total de la columna <code>qty</code>. Guárdalo en <code>result</code>.', h: 'Usa <code>df["qty"].sum()</code>.' };
  C.py14 = { t: 'Precio medio', k: 'Calcula el <code>unit_price</code> medio. Guárdalo en <code>result</code>.', h: 'Usa <code>.mean()</code>.' };
  C.py15 = { t: 'Precio más alto', k: 'Encuentra el <code>unit_price</code> más alto. Guárdalo en <code>result</code>.', h: 'Usa <code>.max()</code>.' };
  C.py16 = { t: 'Líneas por canal', k: 'Cuenta las filas de cada <code>channel</code>. Guárdalo en <code>result</code>.', h: 'Usa <code>df["channel"].value_counts()</code>.' };
  C.py17 = { t: 'Clientes distintos', k: '¿Cuántos valores distintos de <code>customer_id</code> hay? Guárdalo en <code>result</code>.', h: 'Usa <code>.nunique()</code>.' };
  C.py18 = { t: 'Proporciones por categoría', k: 'Calcula la proporción de filas de cada <code>category</code> (fracciones que suman 1). Guárdalo en <code>result</code>.', h: 'Usa <code>value_counts(normalize=True)</code>.' };
  C.py19 = { t: 'Ingresos totales', k: 'Añade una columna <code>revenue</code> (qty × unit_price) y calcula su total. Guárdalo en <code>result</code>.', h: 'Crea la columna y después <code>df["revenue"].sum()</code>.' };
  C.py20 = { t: 'Precio con impuesto', k: 'Calcula <code>unit_price</code> con un 21 % de impuesto, redondeado a 2 decimales (una Series). Guárdalo en <code>result</code>.', h: 'Multiplica por 1.21 y después <code>.round(2)</code>.' };
  C.py21 = { t: 'Proporción de líneas grandes', k: 'Añade una columna de True/False <code>big</code> (qty de 2 o más) y calcula la proporción de filas True. Guárdalo en <code>result</code>.', h: 'La media de una columna de True/False es la proporción de True.' };
  C.py22 = { t: 'A domicilio en París', k: '¿Cuántas filas son pedidos <code>delivery</code> de <code>Paris</code>? Guárdalo en <code>result</code>.', h: 'Filtra con dos condiciones y después <code>len(...)</code>.' };
  C.py23 = { t: 'Cantidad de café', k: '¿Cuál es la <code>qty</code> media de las filas de <code>Coffee</code>? Guárdalo en <code>result</code>.', h: 'Filtra por categoría y después calcula la media de qty.' };
  C.py24 = { t: 'Ingresos en Berlín', k: '¿Cuáles son los ingresos totales (qty × unit_price) de las filas de <code>Berlin</code>? Guárdalo en <code>result</code>.', h: 'Filtra primero, después multiplica las dos columnas y suma.' };

  W.push(['Agrupa y agrega', 'groupby, varios estadísticos por grupo y ordenar los grupos.', [
    ['groupby por una columna', 'Separar, aplicar, combinar', 'groupby separa las filas por una columna, ["qty"] elige qué resumir y sum() reduce cada grupo a un número.'],
    ['Varios números por grupo', 'Agregación con nombre', 'agg con nombre=("columna", "función") crea una columna con nombre por cada estadístico.'],
    ['Ordena los grupos', 'Los grupos más grandes primero', 'Un resultado agrupado es una Series: ordénala como cualquier otra y después head(n) para un top.'],
    ['De vuelta a una tabla', 'reset_index y pivot_table', 'reset_index devuelve los nombres de los grupos a una columna. pivot_table reparte una segunda clave por las columnas.'],
  ]]);
  C.py25 = { t: 'Cantidad por categoría', k: 'Calcula la <code>qty</code> total de cada <code>category</code>. Guárdalo en <code>result</code>.', h: 'Usa <code>df.groupby("category")["qty"].sum()</code>.' };
  C.py26 = { t: 'Precio medio por ciudad', k: 'Calcula el <code>unit_price</code> medio de cada <code>store_city</code>. Guárdalo en <code>result</code>.', h: 'Usa <code>.mean()</code> después del groupby.' };
  C.py27 = { t: 'Filas por canal', k: 'Cuenta las filas de cada <code>channel</code> con <code>groupby</code> y <code>size()</code>. Guárdalo en <code>result</code>.', h: 'Usa <code>df.groupby("channel").size()</code>.' };
  C.py28 = { t: 'Unidades y clientes', k: 'Para cada <code>store_city</code>, calcula la <code>qty</code> total (columna units) y el número de clientes distintos (columna customers). Guárdalo en <code>result</code>.', h: 'Usa <code>agg(units=("qty", "sum"), customers=("customer_id", "nunique"))</code>.' };
  C.py29 = { t: 'Rango de precios', k: 'Para cada <code>category</code>, calcula el <code>unit_price</code> más bajo (low) y el más alto (high). Guárdalo en <code>result</code>.', h: 'Usa <code>agg(low=("unit_price", "min"), high=("unit_price", "max"))</code>.' };
  C.py30 = { t: 'Dos claves', k: 'Calcula la <code>qty</code> total de cada combinación de <code>store_city</code> y <code>channel</code>. Guárdalo en <code>result</code>.', h: 'Agrupa por una lista: <code>df.groupby(["store_city", "channel"])["qty"].sum()</code>.' };
  C.py31 = { t: 'Los productos más vendidos', k: '<code>qty</code> total por <code>product</code>, ordenada de mayor a menor. Guárdalo en <code>result</code>.', h: 'Agrupa, suma y después <code>sort_values(ascending=False)</code>.' };
  C.py32 = { t: 'Los 3 primeros por ingresos', k: 'Los 3 productos con más ingresos totales (qty × unit_price), de mayor a menor. Guárdalo en <code>result</code>.', h: 'Crea revenue, agrupa por producto, suma, ordena y head(3).' };
  C.py33 = { t: 'Solo las ciudades grandes', k: '<code>qty</code> total por <code>store_city</code>, quedándote solo con las ciudades que pasan de 1.000. Guárdalo en <code>result</code>.', h: 'Guarda la Series agrupada y después fíltrala: <code>s[s > 1000]</code>.' };
  C.py34 = { t: 'Una tabla plana', k: '<code>qty</code> total por <code>category</code> como un DataFrame de dos columnas (usa reset_index). Guárdalo en <code>result</code>.', h: 'Añade <code>.reset_index()</code> al final.' };
  C.py35 = { t: 'Tabla dinámica', k: '<code>qty</code> total con <code>store_city</code> en las filas y <code>channel</code> en las columnas. Guárdalo en <code>result</code>.', h: 'Usa <code>pivot_table(index="store_city", columns="channel", values="qty", aggfunc="sum")</code>.' };
  C.py36 = { t: 'Líneas por pedido', k: 'De media, ¿cuántas filas (líneas) tiene un pedido? Cuenta las filas por <code>order_id</code> y después haz la media. Guárdalo en <code>result</code>.', h: 'Usa <code>df.groupby("order_id").size().mean()</code>.' };

  W.push(['Limpia, une y fechas', 'Valores que faltan, texto desordenado, uniones y fechas.', [
    ['Valores que faltan', 'Encuentra y trata los huecos', 'isna() marca las celdas vacías; .sum() las cuenta por columna. dropna quita las filas con huecos.'],
    ['Arregla texto y números', 'El accesor .str', '.str aplica métodos de texto a cada valor. to_numeric con errors="coerce" convierte en NaN el texto que no sabe leer.'],
    ['Une tablas', 'merge', 'merge empareja filas por una columna clave. how="left" conserva todas las filas de la tabla de la izquierda.'],
    ['Fechas', 'to_datetime y .dt', 'Las fechas en texto pasan a ser fechas de verdad con to_datetime. El accesor .dt da las partes: year, month, day, day_name().'],
  ]]);
  C.py37 = { t: 'Huecos por columna', k: 'Cuenta los valores que faltan en cada columna de <code>messy</code>. Guárdalo en <code>result</code>.', h: 'Usa <code>messy.isna().sum()</code>.' };
  C.py38 = { t: 'Quita las filas incompletas', k: 'Quita las filas de <code>messy</code> en las que falta <code>Customer</code>. Guárdalo en <code>result</code>.', h: 'Usa <code>messy.dropna(subset=["Customer"])</code>.' };
  C.py39 = { t: 'Quita los duplicados', k: '¿Cuántas filas tiene <code>messy</code> después de quitar las filas duplicadas exactas? Guárdalo en <code>result</code>.', h: 'Usa <code>len(messy.drop_duplicates())</code>.' };
  C.py40 = { t: 'Limpia los nombres de ciudad', k: 'Limpia <code>messy["City"]</code>: quita los espacios de los extremos y pon mayúscula inicial. Guárdalo en <code>result</code>.', h: 'Encadena <code>.str.strip().str.title()</code>.' };
  C.py41 = { t: 'Cantidades como números', k: 'Convierte <code>messy["Qty"]</code> en números; palabras como "three" pasan a NaN. Guárdalo en <code>result</code>.', h: 'Usa <code>pd.to_numeric(..., errors="coerce")</code>.' };
  C.py42 = { t: 'Cuántas ciudades hay de verdad', k: 'Después de limpiar <code>City</code> (strip + title), ¿cuántas ciudades distintas hay? Guárdalo en <code>result</code>.', h: 'Limpia y después <code>.nunique()</code>.' };
  C.py43 = { t: 'Tamaño después de un merge', k: 'Une <code>df</code> con <code>customers</code> por <code>customer_id</code> (how="left") y da el tamaño (shape) del resultado. Guárdalo en <code>result</code>.', h: 'Usa <code>.shape</code> (sin paréntesis) sobre el DataFrame unido.' };
  C.py44 = { t: 'Cantidad por segmento', k: '<code>qty</code> total por <code>segment</code> de cliente (une antes con customers). Guárdalo en <code>result</code>.', h: 'Une por customer_id y después agrupa por segment.' };
  C.py45 = { t: 'Tiendas más antiguas', k: '¿Cuántas filas de <code>df</code> vienen de tiendas abiertas antes de 2021? Une <code>stores</code> por la ciudad (<code>store_city</code> = <code>city</code>). Guárdalo en <code>result</code>.', h: 'Usa <code>merge(stores, left_on="store_city", right_on="city")</code> y después filtra <code>opened_year < 2021</code>.' };
  C.py46 = { t: 'Líneas de diciembre', k: '¿Cuántas filas tienen una <code>order_date</code> de diciembre? Guárdalo en <code>result</code>.', h: 'Convierte con to_datetime y después cuenta <code>.dt.month == 12</code> con sum().' };
  C.py47 = { t: 'Cantidad por mes', k: '<code>qty</code> total por número de mes (1 a 12). Guárdalo en <code>result</code>.', h: 'Añade una columna de mes con <code>.dt.month</code> y agrupa por ella.' };
  C.py48 = { t: 'El día de la semana con más movimiento', k: '¿Qué nombre de día de la semana tiene más filas? Guárdalo en <code>result</code>.', h: 'Crea una columna de día con <code>.dt.day_name()</code> y después <code>value_counts().idxmax()</code>.' };

  W.push(['Da forma y combina', 'Tablas dinámicas, apilar y unir tablas, traducir SQL y arreglar código escrito por una IA.', [
    ['Tablas dinámicas', 'pivot_table', 'Una tabla dinámica pone un campo en el lateral (index), otro arriba (columns) y resume un tercero en las celdas.'],
    ['Apila y une', 'concat y merge', 'concat apila tablas con las mismas columnas. merge las une lado a lado por una clave; how="left" conserva todas las filas de la izquierda.'],
    ['Rosetta: de SQL a pandas', 'La misma pregunta dos veces', 'GROUP BY se convierte en groupby, WHERE en un filtro entre corchetes y ORDER BY en sort_values.'],
    ['Caza de errores: el código de la IA', 'Revisa el resumen', 'Un código que se ejecuta puede responder a otra pregunta. Lee cada línea contra la tarea.'],
  ]]);
  C.py49 = { t: 'Unidades por ciudad y canal', k: 'Una tabla dinámica de la <code>qty</code> total con las ciudades en las filas y los canales en las columnas. Guárdalo en <code>result</code>.', h: 'Usa <code>df.pivot_table(index="store_city", columns="channel", values="qty", aggfunc="sum")</code>.' };
  C.py50 = { t: 'Precio medio por categoría', k: 'Una tabla dinámica del <code>unit_price</code> medio por <code>category</code> (sin columnas). Guárdalo en <code>result</code>.', h: 'Deja fuera columns: <code>pivot_table(index="category", values="unit_price", aggfunc="mean")</code>.' };
  C.py51 = { t: 'Pedidos por ciudad', k: 'El número de pedidos distintos por <code>store_city</code>. Guárdalo en <code>result</code>.', h: 'Agrupa por ciudad y después <code>["order_id"].nunique()</code>.' };
  C.py52 = { t: 'Dos ciudades apiladas', k: 'Apila las filas de Paris encima de las de Lisbon de <code>df</code> con <code>pd.concat</code>. Guárdalo en <code>result</code>.', h: 'Filtra dos veces y después <code>pd.concat([paris, lisbon])</code>.' };
  C.py53 = { t: 'Clientes que nunca pidieron', k: 'Las filas de <code>customers</code> cuyo <code>customer_id</code> nunca aparece en <code>df</code>. Guárdalo en <code>result</code>.', h: 'Usa <code>isin(df["customer_id"])</code> y quédate con las filas en las que es False.' };
  C.py54 = { t: 'Pedidos con la antigüedad de la tienda', k: 'Une <code>stores</code> a <code>df</code> por la ciudad (how="left") y quédate con <code>order_id</code>, <code>store_city</code> y <code>opened_year</code>. Guárdalo en <code>result</code>.', h: 'Usa <code>left_on="store_city", right_on="city", how="left"</code> y después elige las tres columnas.' };
  C.py55 = { t: 'Unidades por categoría', k: 'Escribe la versión en pandas del SQL que se da. Guárdalo en <code>result</code>.', h: 'groupby y después <code>sort_values(ascending=False)</code>.' };
  C.py56 = { t: 'Clientes por ciudad', k: 'Escribe la versión en pandas del SQL que se da. Guárdalo en <code>result</code>.', h: 'COUNT(DISTINCT ...) es <code>nunique()</code>.' };
  C.py57 = { t: 'Líneas grandes a domicilio', k: 'Escribe la versión en pandas del SQL que se da. Guárdalo en <code>result</code>.', h: 'Dos condiciones entre paréntesis unidas con &.' };
  C.py58 = { t: 'Unidades por ciudad', k: 'A la IA se le pidieron las unidades totales por ciudad. Arregla su código. Guárdalo en <code>result</code>.', h: 'Un total es una suma, no una media.' };
  C.py59 = { t: 'Filas a domicilio', k: 'La IA quería las filas a domicilio, pero su resultado sale vacío. Arréglalo. Guárdalo en <code>result</code>.', h: 'El texto tiene que coincidir exactamente: el canal está escrito en minúsculas.' };
  C.py60 = { t: 'Las tres líneas más caras', k: 'La IA debería devolver las 3 filas con el precio unitario más alto, de mayor a menor. Arréglalo. Guárdalo en <code>result</code>.', h: 'sort_values ordena de menor a mayor salvo que le digas lo contrario.' };

  W.push(['Series temporales', 'Meses y días de la semana, variación respecto al mes anterior, totales acumulados y medias móviles.', [
    ['Fechas y días de la semana', 'Partes de una fecha', 'Las fechas de verdad te dan meses, trimestres y días de la semana. dayofweek cuenta desde lunes = 0 hasta domingo = 6.'],
    ['Variación respecto al mes anterior', 'shift y pct_change', 'shift(1) baja cada valor una fila, así que cada mes queda junto al anterior.'],
    ['Totales acumulados y medias', 'cumsum y rolling', 'cumsum va sumando sobre la marcha. rolling(3).mean() promedia cada valor con los dos anteriores, lo que suaviza una línea con ruido.'],
    ['Predice el resultado', 'Ejecútalo en tu cabeza', 'Adivina primero y después ejecuta: lo que aprendes está en la diferencia entre las dos cosas.'],
  ]]);
  C.py61 = { t: 'Pedidos por mes', k: 'El número de pedidos distintos por número de mes. Guárdalo en <code>result</code>.', h: 'Añade una columna de mes con <code>.dt.month</code> y después <code>["order_id"].nunique()</code> por mes.' };
  C.py62 = { t: 'Unidades por trimestre', k: '<code>qty</code> total por trimestre (1 a 4). Guárdalo en <code>result</code>.', h: 'Usa <code>.dt.quarter</code>.' };
  C.py63 = { t: 'Proporción de fin de semana', k: 'La proporción de filas en sábado o domingo, redondeada a 3. Guárdalo en <code>result</code>.', h: 'El fin de semana es <code>dt.dayofweek >= 5</code>; la media de True/False es una proporción.' };
  C.py64 = { t: 'Unidades por mes', k: '<code>qty</code> total por mes, usando los 7 primeros caracteres de <code>order_date</code> (AAAA-MM). Guárdalo en <code>result</code>.', h: 'Crea una columna de mes con <code>.str.slice(0, 7)</code> y agrupa por ella.' };
  C.py65 = { t: 'Variación respecto al mes anterior', k: 'Unidades por mes menos las del mes anterior. Guárdalo en <code>result</code>.', h: 'Construye la serie mensual y después <code>units - units.shift(1)</code>.' };
  C.py66 = { t: 'Tasa de crecimiento', k: 'La tasa de crecimiento mes a mes de las unidades, redondeada a 3. Guárdalo en <code>result</code>.', h: 'Usa <code>units.pct_change().round(3)</code>.' };
  C.py67 = { t: 'Total acumulado', k: 'El total acumulado de las unidades mensuales. Guárdalo en <code>result</code>.', h: 'Usa <code>units.cumsum()</code>.' };
  C.py68 = { t: 'Media de tres meses', k: 'La media móvil de 3 meses de las unidades mensuales, redondeada a 1. Guárdalo en <code>result</code>.', h: 'Usa <code>units.rolling(3).mean().round(1)</code>.' };
  C.py69 = { t: 'El mejor mes', k: 'El mes (AAAA-MM) con más unidades. Guárdalo en <code>result</code>.', h: 'Usa <code>units.idxmax()</code>.' };
  C.py70 = { t: 'El mayor total acumulado', k: 'Sin ejecutarlo: ¿cuánto vale <code>result</code> al final? Guárdalo en <code>result</code>.', h: 'Sigue el código línea a línea.', y: 'cumsum da 4, 12 y 18; el mayor es 18.' };
  C.py71 = { t: 'Meses que crecieron', k: 'Sin ejecutarlo: ¿cuánto vale <code>result</code> al final? Guárdalo en <code>result</code>.', h: 'Sigue el código línea a línea.', y: 'diff da NaN, 2 y -3: solo una variación es mayor que cero.' };
  C.py72 = { t: 'Una media móvil', k: 'Sin ejecutarlo: ¿cuánto vale <code>result</code> al final? Guárdalo en <code>result</code>.', h: 'Sigue el código línea a línea.', y: 'La última ventana tiene 6 y 8: su media es 7.' };

  W.push(['El test A/B del correo', 'ab_test.csv: quién vio cada correo, quién compró, la mejora y si es real.', [
    ['Lee el test', 'Una fila por usuario', 'Cada fila es un usuario: su variante (A o B), si compró (1/0) y los ingresos. La media de una columna de 1/0 es una tasa.'],
    ['Mejora y ruido', 'Una z calculada a mano', 'La mejora es cuánto mejor lo hizo B. La z compara esa diferencia con el ruido que cabría esperar por azar; de 2 en adelante es una señal fuerte.'],
    ['Peticiones del equipo', 'Acordad la medida', 'Antes de responder "¿funcionó?", acordad la medida y di lo seguro que puedes estar.'],
    ['Jefe: ¿fue un éxito?', 'De los números a una decisión', 'Un buen veredicto dice el tamaño de la diferencia, lo seguro que estás y qué hacer después.'],
  ]]);
  C.py73 = { t: 'Usuarios por variante', k: 'Cuenta los usuarios de cada variante. Guárdalo en <code>result</code>.', h: 'Usa <code>value_counts()</code> sobre la columna de la variante.' };
  C.py74 = { t: 'Conversión por variante', k: 'La tasa de conversión de cada variante, redondeada a 4. Guárdalo en <code>result</code>.', h: 'Agrupa por variante y calcula la media de <code>converted</code>.' };
  C.py75 = { t: 'Ingresos por usuario', k: 'Los ingresos medios por usuario de cada variante (quien no compró cuenta como 0), redondeados a 3. Guárdalo en <code>result</code>.', h: 'La media de <code>revenue</code> por variante.' };
  C.py76 = { t: 'Mejora relativa de B', k: '¿Cuánto más alta es la conversión de B que la de A, como proporción de A? Redondea a 3. Guárdalo en <code>result</code>.', h: 'Tasas por variante y después <code>(p["B"] - p["A"]) / p["A"]</code>.' };
  C.py77 = { t: 'Tasa conjunta', k: 'La tasa de conversión de todo el mundo junto, redondeada a 4. Guárdalo en <code>result</code>.', h: 'La media de toda la columna <code>converted</code>.' };
  C.py78 = { t: 'La z', k: 'La z de dos proporciones de B menos A, redondeada a 2. Guárdalo en <code>result</code>.', h: 'n y p por variante, la tasa conjunta y después <code>se = (pool * (1 - pool) * (1 / n["A"] + 1 / n["B"])) ** 0.5</code> y <code>(p["B"] - p["A"]) / se</code>.' };
  C.py79 = { t: '¿Funcionó el correo nuevo?', k: 'La diferencia de conversión, B menos A, en puntos porcentuales, redondeada a 2. Guárdalo en <code>result</code>.', h: 'Tasas por variante; la diferencia, por 100.', a: { w: 'Theo (marketing)', s: '¿Funcionó el correo nuevo?', q: '¿Cuál es la primera respuesta más útil?', o: ['El número de compradores en B', 'Los ingresos totales de la campaña', 'La tasa de conversión de B frente a A, con lo seguros que estamos', 'Cuántos correos se abrieron'], y: 'Compara cosas comparables: la tasa de cada grupo, y después di lo seguro que estás.' } };
  C.py80 = { t: '¿Compensa B en dinero?', k: 'Los ingresos por usuario de B menos los de A, redondeados a 3. Guárdalo en <code>result</code>.', h: 'Dos medias filtradas y después resta.', a: { w: 'Ana (finanzas)', s: '¿Compensa B en dinero?', q: '¿Qué medida lo responde?', o: ['Los ingresos por usuario asignado de cada variante', 'Los ingresos del pedido más grande', 'Los ingresos totales, B frente a A', 'El importe medio de pedido solo de quien compró'], y: 'Los ingresos por usuario asignado incluyen a quien no compró, así que son justos con los dos grupos.' } };
  C.py81 = { t: 'Los primeros días', k: 'La conversión por variante de los usuarios asignados hasta el 2025-09-03, redondeada a 4. Guárdalo en <code>result</code>.', h: 'Filtra primero <code>ab["assigned_date"] <= "2025-09-03"</code>.', a: { w: 'Theo (marketing)', s: '¿Ganaba ya B los primeros días?', q: '¿Qué deberías comprobar?', o: ['Solo los usuarios que compraron', 'La conversión por variante de los usuarios asignados los primeros días', 'El día con más correos', 'Nada: los primeros resultados siempre aciertan'], y: 'Mira la misma medida en el grupo de los primeros días, y cuenta con que tenga más ruido al haber menos gente.' } };
  C.py82 = { t: 'El veredicto', k: 'La z de dos proporciones de B menos A, redondeada a 2. Guárdalo en <code>result</code>.', h: 'Los mismos pasos que antes: n, p, tasa conjunta y error estándar.', f: { q: 'B va por delante, pero z está por debajo de 1. ¿Qué le dices a Theo?', o: ['B es mejor: mándalo a todo el mundo', 'Todavía no hay una diferencia fiable: deja correr el test o quédate con A', 'A es mejor', 'El test está roto'], y: 'Una diferencia tan pequeña cabe de sobra en el ruido normal. Dilo, y propón una muestra mayor.' } };
  C.py83 = { t: 'Compradores por variante', k: 'El número de compradores de cada variante. Guárdalo en <code>result</code>.', h: 'La suma de <code>converted</code> por variante.' };
  C.py84 = { t: 'Mejora en ingresos', k: '¿Cuánto más altos son los ingresos por usuario de B que los de A, como proporción de A? Redondea a 3. Guárdalo en <code>result</code>.', h: 'Medias por variante y después <code>(r["B"] - r["A"]) / r["A"]</code>.' };

  W.push(['El servicio de soporte', 'tickets.csv: limpia valores escritos a mano, mide el trabajo pendiente y la satisfacción, y revisa el servicio.', [
    ['El reto de la limpieza', 'Limpia paso a paso', 'Limpia una columna cada vez y comprueba el resultado con value_counts() después de cada paso.'],
    ['Trabajo pendiente y valoraciones', 'Los valores que faltan cuentan una historia', 'Una fecha de resolución vacía significa que la incidencia sigue abierta; una valoración vacía, que nadie respondió a la encuesta.'],
    ['Caso práctico', 'Ordena para ver la respuesta', 'Ordenar un resumen pone en la primera fila la respuesta a "¿cuál es el más bajo?".'],
    ['Jefe: revisión del servicio', 'Una tabla de revisión pequeña', 'agg con un diccionario da varios resúmenes en una tabla: una columna por medida.'],
  ]]);
  C.py85 = { t: 'Limpia los canales', k: 'Limpia <code>channel</code> y cuenta las incidencias por canal. Guárdalo en <code>result</code>.', h: 'strip, después lower y después value_counts.' };
  C.py86 = { t: 'Rellena las categorías que faltan', k: 'Sustituye las categorías que faltan por <code>unknown</code> y cuenta las incidencias por categoría. Guárdalo en <code>result</code>.', h: 'Usa <code>fillna("unknown")</code> y después value_counts.' };
  C.py87 = { t: 'Una sola forma para la prioridad', k: 'Pasa <code>priority</code> a minúsculas y cuenta las incidencias por prioridad. Guárdalo en <code>result</code>.', h: 'Usa <code>.str.lower()</code>.' };
  C.py88 = { t: 'Incidencias abiertas', k: '¿Cuántas incidencias no tienen <code>resolved_at</code>? Guárdalo en <code>result</code>.', h: 'Usa <code>isna().sum()</code>.' };
  C.py89 = { t: 'Proporción valorada', k: 'La proporción de incidencias con una valoración <code>csat</code>, redondeada a 3. Guárdalo en <code>result</code>.', h: 'Usa <code>notna().mean()</code>.' };
  C.py90 = { t: 'Satisfacción por canal', k: 'Limpia <code>channel</code> y después calcula el <code>csat</code> medio por canal, redondeado a 2. Guárdalo en <code>result</code>.', h: 'Primero strip y lower, después groupby.' };
  C.py91 = { t: 'La satisfacción más baja', k: 'Limpia <code>channel</code> y después el <code>csat</code> medio por canal redondeado a 2, del más bajo al más alto. Guárdalo en <code>result</code>.', h: 'groupby, mean, round y después <code>sort_values()</code>.', f: { q: '¿Qué canal tiene a los clientes menos satisfechos?', o: ['chat', 'email', 'phone', 'Todos son iguales'], y: 'Después pregunta por qué: ¿es el canal, o el tipo de problema que la gente lleva a ese canal?' } };
  C.py92 = { t: 'Los agentes con más trabajo', k: 'Los 3 <code>agent_id</code> con más incidencias y sus recuentos. Guárdalo en <code>result</code>.', h: 'Usa <code>value_counts().head(3)</code>.' };
  C.py93 = { t: 'Lo que sigue abierto', k: 'Solo de las incidencias abiertas, cuántas hay por categoría, con las categorías que faltan como <code>unknown</code>. Guárdalo en <code>result</code>.', h: 'Filtra con <code>isna()</code> sobre resolved_at y después fillna y value_counts.' };
  C.py94 = { t: 'Incidencias por mes', k: 'El número de incidencias por mes (los 7 primeros caracteres de <code>created_at</code>). Guárdalo en <code>result</code>.', h: 'Una columna de mes con <code>.str.slice(0, 7)</code> y después cuenta por mes.' };
  C.py95 = { t: 'Urgentes y aún abiertas', k: '¿Cuántas incidencias de prioridad alta siguen abiertas? (Las prioridades se escribieron con mayúsculas y minúsculas mezcladas.) Guárdalo en <code>result</code>.', h: 'Pasa la prioridad a minúsculas y después dos condiciones con &.' };
  C.py96 = { t: 'La tabla de revisión', k: 'Limpia <code>channel</code> y después, por canal, el número de incidencias y el <code>csat</code> medio, redondeado a 2. Guárdalo en <code>result</code>.', h: 'Usa <code>agg({"ticket_id": "count", "csat": "mean"})</code> y después redondea la columna csat.', f: { q: '¿Qué canal trae más incidencias?', o: ['chat', 'email', 'phone', 'Todos los canales igual'], y: 'El volumen y la satisfacción juntos le dicen al servicio dónde poner primero a la gente.' } };
})();
