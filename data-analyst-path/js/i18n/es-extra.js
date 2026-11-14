/* Spanish (Spain): prompt library, AI toolbox and the learner backgrounds (js/data/prompts.js, js/data/backgrounds.js). */
(function () {
  'use strict';
  var DA = window.DA, I = DA.i18n;

  // Prompt library, in the same order as DA.prompts: [title, text].
  var P = [
    ['Explícamelo en mi mundo', 'Explícame [[CONCEPTO]]. Mi perfil: {{bg}}.\nUsa una analogía de mi perfil, después un ejemplo concreto con números y después el error más común que cometen los principiantes. Menos de 200 palabras.\n{{lang}}'],
    ['Hazme preguntas (una cada vez)', 'Hazme preguntas sobre [[TEMA, p. ej. JOIN de SQL]]. Haz una pregunta cada vez, empezando fácil y subiendo la dificultad. Después de cada respuesta dime si es correcta, explica brevemente el porqué y haz la siguiente. Tras 8 preguntas, resume lo que sé y lo que tengo que repasar.\n{{lang}}'],
    ['Explícalo de vuelta: encuentra los huecos de lo que entiendo', 'Voy a explicar [[TEMA]] con mis palabras. Escucha como un estudiante curioso y un profesor exigente: dime qué he dicho bien, qué es vago o erróneo y qué pregunta podría hacerme alguien de selección que todavía no sabría responder.\n\nMi explicación:\n[[ESCRÍBELA AQUÍ]]\n{{lang}}'],
    ['Plan de estudio de 8 semanas', 'Hazme un plan de estudio de 8 semanas para estar en condiciones de trabajar como analista de datos júnior. Mi perfil: {{bg}}. Puedo estudiar [[HORAS]] horas a la semana. Incluye para cada semana: el tema, la tarea práctica, un miniproyecto y una autoevaluación. Pon primero las habilidades más valiosas (SQL, hojas de cálculo, una herramienta de BI, Python básico y estadística). Que sea realista.\n{{lang}}'],
    ['Revisa mi registro de errores', 'Este es mi registro de errores de las últimas semanas (qué salió mal y la causa):\n\n[[PEGA TU REGISTRO]]\n\nBusca patrones: ¿cuáles son mis 3 tipos de error más frecuentes? Para cada uno, dame un ejercicio corto (3 ejercicios) y un hábito que lo evitaría.\n{{lang}}'],
    ['Resume un artículo o una documentación larga', 'Resume el texto de abajo para alguien que está aprendiendo análisis de datos. Dame: (1) las 5 ideas clave, (2) 3 términos que debería buscar, con una definición de una línea cada uno, (3) una cosa que podría probar hoy mismo.\n\n[[PEGA EL TEXTO]]\n{{lang}}'],
    ['Escribe una fórmula y explícala', 'Uso [[Excel / Google Sheets]]. Mis columnas: [[NOMBRES DE COLUMNA Y QUÉ CONTIENEN]]. Quiero una fórmula que: [[LO QUE QUIERES]].\nDame la fórmula, explica cada parte, enseña cómo se comporta en 2 filas de ejemplo y menciona un caso en el que fallaría.\n{{lang}}'],
    ['Depura mi fórmula', 'Mi fórmula de [[Excel / Google Sheets]] no funciona.\nFórmula: [[FÓRMULA]]\nLo que esperaba: [[ESPERADO]]\nLo que obtengo: [[REAL / ERROR]]\n\nEncuentra la causa, explícala con palabras sencillas, dame la fórmula corregida y dime cómo evitar este error en el futuro.\n{{lang}}'],
    ['Receta ETL con Power Query (Excel / Power BI)', 'Cada semana recibo un archivo [[Excel / CSV]] desordenado con esta estructura: [[DESCRIBE ENCABEZADOS, COLUMNAS ANCHAS, FILAS DE SUBTOTAL]].\nDame paso a paso los clics de Power Query (y el código M) para limpiarlo y anular la dinamización hasta una tabla ordenada, más una comprobación de cuadre para verificar que no se ha perdido ningún ingreso.\n{{lang}}'],
    ['Generador de QUERY() y ARRAYFORMULA para Google Sheets', 'En Google Sheets, mi pestaña [[NOMBRE DE LA PESTAÑA]] tiene las columnas de la A a la [[COL]]: [[NOMBRES DE COLUMNA]].\nEscribe una fórmula =QUERY() y una =ARRAYFORMULA() para calcular [[OBJETIVO]]. Explica cómo tratan las filas vacías y los tipos de datos mezclados.\n{{lang}}'],
    ['De lenguaje natural a SQL (con esquema)', 'Escribe una consulta de [[SQLite / PostgreSQL / MySQL]] para esta pregunta: [[PREGUNTA]]\n\nEsquema (sin datos reales):\n[[ESQUEMA]]\n\nPrimero enumera tus supuestos, después da la consulta repartida en varias líneas, explícala paso a paso y dame una forma de comprobar que el resultado es correcto.\n{{lang}}'],
    ['Explica esta consulta', 'Explica esta consulta SQL línea a línea con un lenguaje sencillo, en el orden en que la ejecuta la base de datos (FROM, WHERE, GROUP BY, ...). Dime qué aporta cada parte y cómo es el resultado.\n\n[[CONSULTA]]\n{{lang}}'],
    ['Entrenamiento de entrevista de SQL', 'Dame 5 preguntas de entrevista de SQL de dificultad creciente sobre este esquema, que cubran joins, GROUP BY / HAVING, una función de ventana y el manejo de NULL:\n[[ESQUEMA]]\nHaz una cada vez y espera mi respuesta. Después de cada respuesta, dime cómo sería una respuesta sólida.\n{{lang}}'],
    ['Explica este error', 'Me sale este error en pandas / Python:\n[[PEGA EL TRACEBACK COMPLETO]]\n\nMi código:\n[[PEGA EL CÓDIGO]]\n\nExplica qué significa el error con un lenguaje sencillo, señala la línea exacta y la causa, dame primero una pista y después el arreglo. Dime cómo reconocer este tipo de error la próxima vez.\n{{lang}}'],
    ['De la lógica de la hoja de cálculo a pandas', 'En Excel hago esto: [[DESCRIBE LOS PASOS O FÓRMULAS]]. Enséñame el equivalente en pandas, paso a paso, con un comentario corto en cada línea. Mi DataFrame tiene estas columnas: [[COLUMNAS]].\n{{lang}}'],
    ['Convierte mi notebook desordenado en pasos limpios', 'Este es el código de mi notebook. Sin cambiar los resultados, propón una estructura más limpia: funciones para cargar, limpiar y analizar, nombres claros y comentarios cortos. Explica cada cambio para que aprenda el patrón.\n\n[[PEGA EL CÓDIGO]]\n{{lang}}'],
    ['Retención por cohortes y segmentación RFM en pandas', 'Mi DataFrame de pedidos tiene las columnas [[customer_id, order_date, revenue]]. Escribe código pandas limpio para construir: (1) una matriz de retención por cohortes mensuales (% de usuarios del mes 0 activos en los meses 1..N) con un mapa de calor de Seaborn, y (2) una segmentación RFM de clientes con pd.qcut. Explica cómo interpretar las dos cosas para un equipo de marketing.\n{{lang}}'],
    ['Automatiza un informe de Excel con varias pestañas desde Python', 'Escribe un script de Python limpio con pandas y pd.ExcelWriter que lea [[ORIGEN]], valide la calidad de los datos (claves que faltan, valores negativos) y exporte un .xlsx con las pestañas Summary, Cleaned_Data y Exceptions.\n{{lang}}'],
    ['¿Qué prueba estadística debería usar?', 'Quiero responder: [[PREGUNTA]]. Datos: [[DESCRIBE LAS VARIABLES, TAMAÑOS DE GRUPO, TIPOS]]. ¿Qué enfoque estadístico encaja y por qué? Enumera sus supuestos y cómo los compruebo, la alternativa si no se cumplen y cómo contar el resultado (tamaño del efecto, intervalo, p-valor) en una frase para un responsable.\n{{lang}}'],
    ['Interpreta este resultado', 'Interprétame este resultado estadístico con un lenguaje sencillo, como si se lo explicaras a un responsable. Di qué es sólido, qué es incierto y qué no debería concluir.\n\n[[PEGA EL RESULTADO]]\n{{lang}}'],
    ['Haz que mi gráfico empiece por el insight', 'Esta es la descripción de mi gráfico y sus datos: [[DESCRÍBELO]]. Sugiere: un título que enuncie el insight, qué resaltar con color, qué quitar, cómo etiquetar directamente y una anotación. Después dame el código en [[matplotlib / seaborn / Plotly]] de la versión mejorada.\n{{lang}}'],
    ['Diseña un esquema de estrella y medidas DAX en Power BI', 'Estoy construyendo un informe de Power BI con estas tablas y columnas de origen: [[DESCRIBE LAS TABLAS]].\n1. Propón un esquema de estrella limpio (granularidad de la tabla de hechos, tablas de dimensiones, claves de las relaciones 1:*).\n2. Escribe las medidas DAX básicas (total, % interanual, % del total general con CALCULATE y DIVIDE) y explica cómo funciona el contexto de filtro en un visual de matriz.\n{{lang}}'],
    ['Escribe una expresión LOD de Tableau y revisa el orden de los filtros', 'En Tableau, mi conjunto de datos tiene una fila por [[GRANULARIDAD DE LA FILA]] y mi vista está agrupada por [[DIMENSIONES DE LA VISTA]].\nQuiero calcular: [[OBJETIVO, p. ej. fecha del primer pedido de cada cliente / peso sobre el total de la región]].\nEscribe la expresión LOD exacta (FIXED, INCLUDE o EXCLUDE), explica cómo funciona y dime qué filtros de mi hoja necesitan "Agregar a contexto".\n{{lang}}'],
    ['Anonimiza mis datos antes de pegarlos', 'Quiero preguntarte por un conjunto de datos con información personal o sensible. Sin que pegue los datos reales, dime: (1) qué columnas debería quitar, enmascarar o generalizar, (2) cómo crear 10 filas de ejemplo falsas pero realistas, (3) qué estructura o esquema compartir en su lugar. Mis columnas: [[NOMBRES DE COLUMNA]].\n{{lang}}'],
    ['Plan de análisis exploratorio para un conjunto de datos nuevo', 'Tengo un conjunto de datos nuevo sobre [[TEMA]] con las columnas [[COLUMNAS]] y unas [[N]] filas. Crea un plan de análisis exploratorio: 10 comprobaciones que hacer primero (tipos, valores que faltan, duplicados, rangos, distribuciones...), 5 preguntas que los datos podrían responder y el código pandas o SQL de las 3 primeras comprobaciones. Explica qué sería "sospechoso" en cada comprobación.\n{{lang}}'],
    ['Encuentra un conjunto de datos para mi pregunta', 'Quiero analizar: [[PREGUNTA]]. Mi perfil: {{bg}}. Sugiere 5 conjuntos de datos o fuentes públicas (portales de datos abiertos, Kaggle, UCI, Our World in Data, APIs) que puedan ayudar: para cada uno, qué contiene, su tamaño, qué tener en cuenta de la licencia y el mayor riesgo de calidad de los datos. Sugiere solo fuentes que estés seguro de que existen, y dime que compruebe los enlaces.\n{{lang}}'],
    ['Explica tu cambio de carrera en 30 segundos', 'Ayúdame a escribir una respuesta de 30 segundos a "¿Por qué te pasas al análisis de datos?". Mi perfil: {{bg}}. Debe: mostrar un motivo real, conectar mi experiencia anterior con habilidades de analista, mencionar un proyecto que he hecho ([[PROYECTO]]) y terminar con lo que quiero hacer a continuación. Dame 2 versiones: una formal y otra más conversacional.\n{{lang}}'],
  ];

  var TOOLS = [
    ['Asistentes de chat con IA', 'Claude, ChatGPT, Gemini', 'Tu tutor y compañero de programación: explica conceptos, escribe y revisa SQL y Python, te hace preguntas y critica tus textos y gráficos.', 'Puede equivocarse con total seguridad. No pegues nunca datos confidenciales ni personales. Comprueba qué permite tu plan (subir archivos, ejecutar código).'],
    ['IA dentro de tu hoja de cálculo', 'Copilot en Excel, Gemini en Google Sheets', 'Genera fórmulas, sugiere tablas dinámicas y limpia columnas sin salir de la hoja.', 'Su disponibilidad depende de tu licencia. Revisa siempre la fórmula que escribe antes de fiarte de los números.'],
    ['Notebooks con ayuda de IA', 'Google Colab, Jupyter + un asistente de IA', 'Ejecuta Python en el navegador y pide código, explicaciones y arreglos junto a tus datos.', 'No subas datos sensibles a un notebook en la nube. Vuelve a ejecutar el notebook de arriba abajo antes de compartirlo.'],
    ['Asistentes de programación con IA', 'GitHub Copilot, Cursor, Claude Code', 'Autocompletan y reorganizan código en tu editor; útiles para el código repetitivo de pandas y gráficos.', 'Pueden esconder huecos en lo que entiendes. Asegúrate de poder explicar cada línea antes de guardarla.'],
    ['Asistentes de documentos e investigación', 'NotebookLM, Perplexity', 'Pregunta sobre ofertas de empleo, artículos o documentación que subas, o investiga un tema con fuentes.', 'Abre las fuentes y compruébalas. Los resúmenes pueden saltarse matices.'],
    ['Herramientas de BI con funciones de IA', 'Power BI, Tableau, Looker Studio', 'Construye dashboards; las nuevas funciones de IA pueden sugerir visuales, escribir medidas y resumir insights.', 'Las funciones y los planes cambian rápido. Aprende antes los fundamentos (modelo de datos, medidas).'],
  ];

  var RULES = [
    ['Inténtalo primero y luego pregunta', 'Dedícale 10 minutos tú solo. Comparte tu intento y el error, no solo la tarea.'],
    ['Pide pistas, no solo respuestas', 'Di "no me des todavía la solución". Te quedas con el aprendizaje y aun así te desatascas.'],
    ['Comparte la estructura, no los datos', 'Da los nombres de tablas y columnas y unas pocas filas anonimizadas. Nunca datos de clientes, pacientes, alumnos ni confidenciales de la empresa.'],
    ['Comprueba todo lo que importa', 'Ejecuta el código. Compara el número de filas. Cuadra los totales con un cálculo independiente.'],
    ['Pide los supuestos y los riesgos', '"¿Qué estás suponiendo? ¿Qué podría estar mal en esto?" es la comprobación de calidad más barata que existe.'],
    ['Explícalo de vuelta', 'Explica la lección con tus palabras y deja que la IA encuentre los huecos. Si no sabes explicarlo, no podrás usarlo en una entrevista.'],
    ['Lleva un registro', 'Apunta los prompts que funcionaron y tus errores. Se convierte en tu manual personal y en tu repaso para las entrevistas.'],
  ];

  I.add({
    'Learning': 'Aprendizaje', 'Spreadsheets': 'Hojas de cálculo', 'Statistics': 'Estadística', 'Visualization': 'Visualización', 'AI workflow': 'Flujo de trabajo con IA', 'Portfolio': 'Portfolio', 'Career': 'Carrera',
    'short interactive SQL lessons': 'lecciones de SQL cortas e interactivas', 'SQL exercises with instant feedback': 'ejercicios de SQL con corrección al instante',
    'harder PostgreSQL practice': 'práctica de PostgreSQL más difícil', 'micro-courses in pandas, SQL, visualisation': 'microcursos de pandas, SQL y visualización',
    'Python notebooks in the browser': 'notebooks de Python en el navegador', 'free dashboards you can publish': 'dashboards gratuitos que puedes publicar',
    'clean public datasets and charts': 'conjuntos de datos públicos limpios y gráficos',
    '· short interactive SQL lessons': '· lecciones de SQL cortas e interactivas', '· SQL exercises with instant feedback': '· ejercicios de SQL con corrección al instante',
    '· harder PostgreSQL practice': '· práctica de PostgreSQL más difícil', '· micro-courses in pandas, SQL, visualisation': '· microcursos de pandas, SQL y visualización',
    '· Python notebooks in the browser': '· notebooks de Python en el navegador', '· free dashboards you can publish': '· dashboards gratuitos que puedes publicar',
    '· clean public datasets and charts': '· conjuntos de datos públicos limpios y gráficos',
  });

  DA.extraEs = { P: P, TOOLS: TOOLS, RULES: RULES };

  I.content(function () {
    (DA.prompts || []).forEach(function (p, i) { if (P[i]) { p.title = P[i][0]; p.text = P[i][1]; } });
    (DA.tools || []).forEach(function (t, i) { var x = TOOLS[i]; if (x) { t.name = x[0]; t.examples = x[1]; t.use = x[2]; t.watch = x[3]; } });
    (DA.aiRules || []).forEach(function (r, i) { if (RULES[i]) { r[0] = RULES[i][0]; r[1] = RULES[i][1]; } });
  });
})();
