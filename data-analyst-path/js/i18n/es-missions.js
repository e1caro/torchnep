/* Spanish (Spain): the Dot & Co. story, mission briefs, Try scenarios and chapter bosses (js/data/missions.js).
 * Keyed by id; scenario options keep their order, so the right answer stays the same. */
(function () {
  'use strict';
  var DA = window.DA, I = DA.i18n;

  var ROLES = { lena: 'Fundadora', rosa: 'Operaciones', ana: 'Finanzas', theo: 'Marketing', sam: 'Soporte', kai: 'Producto de la app', dot: 'Tu guía' };

  var CHAPTERS = {
    m0: 'Primera semana en Dot & Co.: conoce al equipo y decide cómo vas a trabajar.',
    m1: 'Las hojas de cálculo atrasadas aterrizan en tu mesa.',
    m2: 'Te dan las llaves de la base de datos de ventas.',
    m3: 'El informe semanal aprende a hacerse solo.',
    m4: 'Cada cual tiene su teoría. Tú averiguas qué funcionó de verdad.',
    m5: 'El consejo quiere un dashboard en el que pueda confiar.',
    m6: 'Un asistente de IA se une al equipo, y alguien tiene que revisar su trabajo.',
    m7: 'Conviertes tu trabajo en un caso práctico propio.',
    m8: 'Día de entrevista y el plan para tus primeros 90 días.',
  };

  var BRIEFS = {
    'l0-1': '¡Te damos la bienvenida a Dot & Co.! Antes de abrir un solo archivo, dedica tu primera mañana a averiguar qué necesita de verdad la gente de aquí de los datos.',
    'l0-2': 'El equipo usa un asistente de IA para casi todo. Configura tu propio tutor de IA para que te haga ir más rápido sin pensar por ti.',
    'l0-3': '¿Dónde quieres estar dentro de seis meses? Apunta tu objetivo y tu punto de partida, para que podamos ver cuánto has avanzado.',
    'l1-1': 'Las encargadas de tienda envían sus pedidos en cinco formatos distintos. ¿Puedes convertir este lío en una tabla limpia en la que pueda confiar?',
    'l1-2': 'Necesito los ingresos por tienda y por producto cada semana. Enséñame a sacarlos de la hoja de pedidos sin copiar números a mano.',
    'l1-3': '¿Qué tienda vendió más el mes pasado, y por qué? Una página, tres números, un gráfico.',
    'l1-4': 'Mis fórmulas de búsqueda se rompen cada vez que alguien añade una columna a la hoja de precios. ¿Puedes hacerlas resistentes?',
    'l1-5': 'Cada lunes limpio a mano la misma exportación. Prepárame una limpieza que pueda actualizar con un clic.',
    'l1-6': 'Nuestro seguimiento de campañas vive en Google Sheets. Quiero una pestaña de resumen que se mantenga al día sola.',
    'l1-7': '¿Qué le pasa a nuestro margen si el café en grano sube un 10 %? Construye un modelo con el que pueda jugar, y que me avise cuando un dato de entrada no tenga buena pinta.',
    'l2-1': 'Ya tienes acceso de lectura a la base de datos de ventas. Empieza por algo sencillo: ¿qué productos cuestan más de 4,00?',
    'l2-2': 'Quiero los totales mensuales por tienda directamente de la base de datos, no de una hoja que alguien me mandó por correo.',
    'l2-3': 'Los pedidos, las tiendas y los productos están en tablas distintas. Júntalos, y asegúrate de que los totales no se dupliquen sin que nadie se dé cuenta.',
    'l2-4': 'Ordena nuestros productos dentro de cada categoría y enséñame el total acumulado de ventas a lo largo del año.',
    'l3-1': 'El informe semanal me lleva una tarde entera. Veamos si Python puede leer los datos y dar los mismos números en segundos.',
    'l3-2': 'Nuestras exportaciones tienen campos vacíos, nombres mal escritos y números guardados como texto. Límpialos con código, para poder repetir la limpieza.',
    'l3-3': 'Combina la lista de tiendas con los datos de ventas y dame los números de cada región uno al lado del otro.',
    'l3-4': 'Necesito los números de cada tienda resumidos por grupo, ordenados y de vuelta en una tabla ordenada que pueda pegar en mi informe.',
    'l3-5': '¿Qué clientes son fieles, cuáles se nos están yendo y cómo se comporta con el tiempo el grupo nuevo de cada mes?',
    'l3-6': 'El consejo se reúne la semana que viene. Convierte tus hallazgos en gráficos que alguien pueda leer en cinco segundos.',
    'l3-7': 'Haz que el informe semanal se construya solo: leer, limpiar, resumir y guardar, sin que nadie lo toque.',
    'l4-1': '¿Un pedido típico es de 8,00 o de 12,00? La media y la mediana cuentan historias distintas. ¿Cuál debería poner en el informe?',
    'l4-2': 'Hemos encuestado a 200 clientes. ¿Hasta qué punto podemos estar seguros de lo que piensan todos nuestros clientes?',
    'l4-3': 'Probamos dos versiones del correo de bienvenida. La versión B parece mejor, pero ¿la diferencia es real o pura suerte?',
    'l4-4': 'Las tiendas con más personal venden más. ¿Deberíamos contratar, o pasa otra cosa?',
    'l5-1': 'Cada equipo envía los gráficos con un estilo distinto. Ayúdanos a elegir el gráfico adecuado para cada pregunta.',
    'l5-2': 'Quiero un único dashboard de ventas, margen y productos estrella que pueda filtrar por tienda.',
    'l5-3': 'Ya tienes los números. Ahora dame la historia: qué pasó, por qué y qué deberíamos hacer.',
    'l5-4': 'Nuestro modelo de BI es una tabla gigante, y es lento y confuso. Diseña algo más limpio.',
    'l5-5': 'Necesito medidas que respeten los filtros de la página, y porcentajes del total que no se rompan al segmentar por tienda.',
    'l5-6': 'Marketing trabaja en Tableau. Enséñame campos calculados en los que pueda confiar y fechas que pueda agrupar como yo quiera.',
    'l5-7': '¿Cuál es el total de cada cliente, haya el filtro que haya? Y déjame pulsar una región para filtrar todo el dashboard.',
    'l6-1': 'Los buenos prompts dan contexto, datos y un formato claro. Construye unos cuantos patrones que puedas reutilizar cada día.',
    'l6-2': 'La IA escribió una consulta que dice que las quejas bajaron un 40 %. Antes de decírselo a nadie, ¿puedes comprobarlo?',
    'l6-3': 'Tenemos 1.200 comentarios de incidencias en texto libre. Usa la IA para agruparlos por temas y después comprueba que lo ha hecho bien.',
    'l7-1': 'Convierte lo que has construido en Dot & Co. en un portfolio. Empieza por proyectos de tu propio sector.',
    'l7-2': 'Elige una pregunta real y llévala de los datos en bruto a una recomendación, documentando cada paso.',
    'l7-3': 'Publica tu proyecto en internet y practica contar su historia en dos minutos.',
    'l8-1': 'Tu experiencia anterior es un activo. Reescríbela con el lenguaje que usan las ofertas de analista.',
    'l8-2': 'Imagina que te estoy entrevistando para este puesto. Practiquemos preguntas de SQL, casos y tu propia historia.',
    'l8-3': 'Planifica tus candidaturas, tus contactos y lo que harás en tus primeros 90 días en el nuevo trabajo.',
    'l0-4': 'Una encargada de tienda escribe: "Últimamente las ventas van flojas, ¿puedes echarle un vistazo?". Antes de abrir ningún archivo, conviértelo en una pregunta que puedas responder.',
    'l0-5': 'Soporte quiere compartir una exportación de incidencias con una agencia externa. Comprueba qué son datos personales y qué tiene que desaparecer antes de que nada salga de la empresa.',
    'l2-5': 'La tabla de incidencias la rellenó gente con prisa: espacios, mayúsculas, categorías que faltan y fechas con hora. Límpiala en SQL antes de que nadie cuente nada.',
    'l2-6': '¿Dónde abandona la gente la app, y se quedan los miembros de Dot Club? Construye el embudo y las tablas de cohortes.',
    'l3-8': 'Antes de informar de nada del servicio de soporte, demuestra que los datos son fiables: claves, huecos, valores raros.',
    'l4-5': 'Marketing quiere probar un asunto de correo nuevo el mes que viene. Planifica el test para que el resultado signifique algo.',
    'l5-8': 'El dashboard del consejo está listo. Publícalo para que cada responsable vea solo su parte, con datos que se actualicen solos.',
    'l5-9': 'El informe tarda una eternidad en cargar y alguien pidió a Copilot una página de "productos estrella". Hazlo rápido y revisa lo que escribió la IA.',
    'l5-10': 'Marketing unió dos tablas en Tableau y los ingresos se duplicaron de la noche a la mañana. Averigua por qué y prepara los datos como es debido.',
    'l6-4': 'La IA ya viene dentro de la hoja de cálculo, del notebook y de la herramienta de BI. Aprende cuándo apoyarte en ella y cómo comprobarla.',
  };

  // [question, options (same order), why, table columns (optional)]
  var SCEN = {
    'l0-1': [
      ['Rosa pregunta: "¿Me puedes hacer un dashboard?". ¿Cuál es tu primer paso?', ['Abrir la herramienta de BI y empezar a construir la primera página', 'Preguntar qué decisión debe apoyar el dashboard', 'Copiar el dashboard del año pasado y actualizar las fechas', 'Pedir acceso a todas las bases de datos de la empresa'], 'Un dashboard sirve a decisiones. Saber cuál es la decisión te dice qué números importan.'],
      ['¿Qué tarea es más típica en la semana de un analista de datos?', ['Limpiar datos y responder preguntas de negocio', 'Entrenar modelos de deep learning con millones de imágenes', 'Construir y diseñar las páginas de la web de la empresa', 'Mantener funcionando los portátiles y las impresoras'], 'Quien analiza datos pasa la mayor parte del tiempo preparándolos y convirtiéndolos en respuestas útiles.'],
    ],
    'l0-2': [
      ['Pides a una IA que te explique un error de SQL. ¿Cuál es la mejor forma de usar la respuesta?', ['Pegar su consulta corregida sin leerla antes', 'Pedirle que termine todo el ejercicio por ti', 'Ignorarla y seguir probando hasta que funcione', 'Leer la explicación y luego corregirlo y ejecutarlo tú'], 'Usa la IA como tutora: entiende el arreglo y hazlo tú, para que la habilidad se quede contigo.'],
      ['¿Qué prompt consigue la ayuda más útil?', ['"Ayúdame ahora mismo con mis deberes de SQL."', '"Arregla mi código y haz que sea lo más rápido posible."', '"Esta es mi tabla, mi consulta y el error. Dame una pista."', '"Mejora esto y no expliques nada, solo hazlo."'], 'Contexto más una petición clara (una pista, no la respuesta) convierten la IA en una buena tutora.'],
    ],
    'l0-3': [
      ['¿Con qué objetivo es más fácil ponerse en marcha?', ['"Mejorar mucho en datos y análisis este año"', '"Terminar el capítulo 2 y 12 retos de SQLab antes del día 30"', '"Aprender absolutamente todo lo que hay sobre SQL"', '"Dominar el análisis de datos lo antes posible"'], 'Un objetivo concreto, medible y con fecha te dice qué hacer esta semana.'],
      ['¿Por qué apuntar tu punto de partida?', ['Para ver el progreso real y ajustar el plan', 'Para compararte con el resto de estudiantes', 'Porque la app lo necesita para poder empezar', 'Porque así el curso dura menos horas'], 'Una referencia convierte "voy despacio" en pruebas de cuánto has avanzado.'],
    ],
    'l0-5': [
      ['Tienes que enviar una tabla de incidencias a una agencia externa. ¿Qué columnas quitas o seudonimizas primero?', ['ticket_id y priority', 'canal, categoría y nivel de prioridad', 'las fechas created_at y resolved_at', 'nombre, correo y teléfono del cliente'], 'Primero van los identificadores directos. Después comprueba si las combinaciones del resto aún podrían señalar a alguien.'],
      ['Solo los usuarios de la app respondieron a una encuesta de satisfacción. ¿Cuál es la salvedad honesta?', ['Ninguna: una respuesta vale lo mismo venga de quien venga', 'Los resultados no valen y hay que borrarlos', 'Describen a usuarios de la app que quisieron responder', 'La satisfacción no se puede medir con una encuesta'], 'Quién está en los datos condiciona la respuesta. Di a quién describen los resultados.'],
    ],
    'l4-1': [
      ['Importes de pedidos: la mayoría están entre 8 y 12, y unos pocos pedidos de oficina superan los 200. ¿Qué número describe mejor un pedido típico?', ['La media', 'La mediana', 'El máximo', 'La suma'], 'Unos pocos pedidos enormes tiran de la media hacia arriba; la mediana se queda con el pedido típico.', ['pedido', 'importe']],
      ['Dos tiendas tienen la misma cesta media, pero una tiene una desviación típica mucho mayor. ¿Qué te dice eso?', ['Sus cestas varían mucho más de un pedido a otro', 'Sus clientes compran más artículos en cada visita', 'Vende más en total que la otra tienda', 'Su media se calculó de forma incorrecta'], 'La dispersión muestra cuánto se alejan de la media los pedidos individuales.'],
    ],
    'l4-2': [
      ['Una encuesta a 200 clientes da un 62 % de satisfechos, con un intervalo del 95 % entre el 55 % y el 69 %. ¿Qué puedes decir?', ['Exactamente el 62 % de todos nuestros clientes está satisfecho hoy', 'El 95 % de los clientes preguntados respondió', 'La encuesta es demasiado pequeña para decirnos nada', 'Es plausible que el porcentaje real esté entre el 55 % y el 69 %'], 'El intervalo muestra la incertidumbre que viene de preguntar a una muestra y no a todo el mundo.'],
      ['¿Cómo haces más estrecho ese intervalo?', ['Redondear el resultado a números enteros', 'Preguntar solo a los clientes contentos', 'Preguntar a una muestra aleatoria mayor', 'Mostrarlo con otro tipo de gráfico'], 'Más personas (elegidas al azar) significa menos incertidumbre de muestreo.'],
    ],
    'l4-4': [
      ['Las tiendas con más personal venden más. ¿Cuál es la conclusión más prudente?', ['Contratar más personal en cualquier tienda subirá sus ventas', 'Van juntas; las tiendas con mucho trabajo pueden necesitar más gente', 'El número de empleados no influye en las ventas', 'Las ventas altas son lo que hace que las tiendas contraten'], 'Correlación no es causalidad: el tamaño y la ubicación de la tienda pueden explicar las dos cosas.'],
      ['Un diagrama de dispersión de temperatura frente a ventas de bebidas frías sube hacia la derecha. ¿Qué valor de r es más probable?', ['Unos -0,8', 'Unos 0', 'Unos 0,8', 'Exactamente 1'], 'Un patrón ascendente con algo de dispersión es una correlación positiva fuerte, por debajo del 1 perfecto.'],
    ],
    'l5-1': [
      ['Quieres mostrar los ingresos mensuales de dos años. ¿Qué gráfico encaja mejor?', ['Un gráfico circular', 'Solo una tabla de 24 números', 'Un gráfico de barras en 3D', 'Un gráfico de líneas'], 'La evolución en el tiempo se lee mejor con una línea.'],
      ['Quieres comparar la cuota de mercado de 12 productos. ¿Qué gráfico es más claro?', ['Un circular con 12 porciones', 'Un gráfico de barras ordenado', 'Un gráfico de líneas', 'Un diagrama de dispersión'], 'Las barras ordenadas hacen fáciles de ver las diferencias pequeñas; 12 porciones, no.'],
    ],
    'l5-10': [
      ['Los pedidos (una fila por pedido, con su total) se unen a las líneas de pedido. ¿Qué le pasa a SUM(total del pedido)?', ['Sigue siendo correcto, porque los totales son por pedido', 'Se repite en cada línea, así que la suma se infla', 'Pasa a ser cero en los pedidos con varias líneas', 'Tableau quita solo las filas duplicadas'], 'Una unión de uno a varios repite la fila del pedido. Usa una relación o agrega al nivel correcto.'],
      ['Tus datos de ventas y tus objetivos están en dos fuentes distintas que no puedes unir. ¿Qué puedes usar?', ['Una combinación por un campo común', 'Un gráfico circular con las dos fuentes', 'Solo dos dashboards separados', 'Copiar los números a mano'], 'Una combinación enlaza dos fuentes por un campo común, al nivel de la vista.'],
    ],
    'l6-1': [
      ['¿Qué patrón de prompt consigue un plan de análisis fiable?', ['"Analiza mis datos y dime qué te parecen."', '"Sé creativa y encuéntrame algo sorprendente."', '"Dime algo interesante de este archivo."', '"Estas son mis columnas y mi pregunta. Planifica pasos y comprobaciones."'], 'El contexto, una tarea clara y una estructura pedida hacen que lo que produce la IA sea útil y comprobable.'],
      ['La IA te da con mucha seguridad un número que no le pediste calcular con tus datos. ¿Qué haces?', ['Usarlo, porque la IA sonaba muy segura', 'Preguntarle otra vez hasta que coincida con tu idea', 'Tratarlo como no verificado y recalcularlo', 'Redondearlo para que parezca menos exacto en el informe'], 'Los números tienen que salir de tus datos y de tu cálculo, no de la memoria del modelo.'],
    ],
    'l6-3': [
      ['Una IA ha agrupado por temas 1.200 comentarios de incidencias. ¿Cómo lo compruebas?', ['Te fías, porque es más rápida y barata que las personas', 'Lees una muestra aleatoria de cada tema y cuentas los que no encajan', 'Pides a la IA que puntúe su propio trabajo sobre diez', 'Lees los diez primeros comentarios y lo dejas ahí'], 'Una muestra aleatoria te dice con qué frecuencia se equivocan los temas, y dónde.'],
      ['¿Qué datos no deberías pegar nunca en una herramienta de IA pública?', ['Nombres de clientes con sus correos', 'Una lista de los nombres de columna de una tabla', 'Una tabla de ejemplo inventada con filas falsas', 'La consulta SQL que intentas arreglar'], 'Los datos personales se quedan en herramientas aprobadas. Usa ejemplos inventados o el esquema.'],
    ],
    'l6-4': [
      ['Copilot redacta una página de informe que dice "Ingresos +12 %". ¿Qué compruebas primero?', ['Si los colores siguen el estilo de la empresa', 'Si la letra del título es lo bastante grande', 'Si la página parece llena y terminada', 'Recalcular el 12 % y revisar el periodo'], 'Comprueba el número y su periodo antes que nada.'],
      ['¿Cuál es el mejor uso diario de la IA dentro de una hoja de cálculo?', ['Inventar cifras para los meses que faltan', 'Decidir ella sola el presupuesto del año que viene', 'Redactar una fórmula que luego pruebas en unas filas', 'Sustituir todas las comprobaciones que hacías a mano'], 'Deja que redacte; tú pruebas y decides.'],
    ],
    'l7-1': [
      ['¿Qué proyecto de portfolio dice más a quien contrata?', ['Una copia de un tutorial famoso con otro título', 'Una pregunta de tu sector, respondida de principio a fin', 'Una lista de todos los cursos que has terminado', 'Una captura de un dashboard publicada sin explicación'], 'Tu propia pregunta demuestra criterio, conocimiento del sector y el flujo completo.'],
      ['¿Cuántos proyectos debería mostrar un primer portfolio?', ['Dos o tres terminados y bien explicados', 'Uno grande, aunque esté sin terminar', 'Veinte ejercicios pequeños copiados de cursos', 'Ninguno, porque basta con un buen CV'], 'Unos pocos proyectos completos con una historia clara ganan a muchos fragmentos.'],
    ],
    'l7-3': [
      ['Tienes dos minutos para presentar tu proyecto. ¿Qué va primero?', ['Los pasos de limpieza de datos, en orden', 'Las herramientas y librerías que usaste', 'Tu biografía y tu formación', 'La pregunta y la respuesta'], 'Empieza por la pregunta y la respuesta; los detalles, si te los piden.'],
      ['¿Dónde debería estar tu proyecto para que otros lo vean?', ['Solo en tu portátil, en su propia carpeta', 'En un borrador de correo que reenvías si te lo piden', 'En un repositorio público con un README corto', 'Impreso en papel y llevado a las entrevistas'], 'Un enlace público con un README claro permite a cualquiera revisar tu trabajo.'],
    ],
    'l8-1': [
      ['¿Qué punto de CV lee mejor una persona que contrata analistas?', ['"Responsable de elaborar diversos informes"', '"Creé un informe semanal en Excel que bajó de 4 h a 30 min"', '"Persona trabajadora, con buen trabajo en equipo y atención al detalle"', '"Se me dan bien los ordenadores y aprendo rápido"'], 'Acción, herramienta y un resultado medido en una línea.'],
      ['Gestionabas el stock de una tienda. ¿Cómo lo describes para un puesto de analista?', ['"Seguí los niveles de stock y reduje mermas con datos de reposición"', '"Trabajé varios años en el comercio, en una tienda con mucho movimiento"', '"Movía cajas y mantenía el almacén ordenado cada día"', 'Lo quito, porque no tiene nada que ver con los datos'], 'Traduce el trabajo anterior a los datos que usaste y las decisiones que mejoraron.'],
    ],
    'l8-3': [
      ['En tus primeros 90 días como analista, ¿qué importa más al principio?', ['Rehacer rápido todos los informes a tu manera', 'Trabajar por tu cuenta para demostrar independencia', 'No hacer preguntas para parecer con experiencia', 'Aprender el negocio, los datos y quién decide'], 'Entender primero el contexto hace más útil cada análisis posterior.'],
      ['Has enviado 20 candidaturas y no te han contestado. ¿Qué siguiente paso es útil?', ['Enviar el mismo CV a otras cien empresas', 'Abandonar los puestos de datos y probar otra cosa', 'Pedir opinión y adaptar cada CV a la oferta', 'Quitar tus proyectos para que el CV ocupe una página'], 'Adaptar el CV y mostrar trabajo hecho cambian la tasa de respuesta más que el volumen.'],
    ],
  };

  var BOSS = {
    m0: ['Encargo de la primera semana', 'Un responsable escribe: "Las ventas van flojas, ¿puedes mirarlo?". Demuestra que sabes convertir una petición vaga en una pregunta clara, una métrica y un plan.'],
    m1: ['Cierre de mes', 'Es el último día del mes y los números se entregan esta noche. Limpia, calcula y comprueba la hoja de cierre.'],
    m2: ['Los números del lunes', 'Cada lunes, el equipo directivo hace las mismas preguntas. Respóndelas directamente desde la base de datos.'],
    m3: ['Revisión del servicio de soporte', 'Soporte quiere saber dónde se atascan las incidencias. Carga, limpia y resume en Python los datos del servicio.'],
    m4: ['¿Fue un éxito?', 'La nueva campaña de correo ha terminado. Decide, con pruebas, si de verdad superó a la anterior.'],
    m5: ['Dashboard del consejo', 'El consejo se reúne el jueves. Construye las medidas de un dashboard en el que pueda confiar.'],
    m6: ['Audita el informe de la IA', 'Un asistente de IA ha redactado el informe de esta semana. Encuentra lo que hizo mal antes de que llegue a nadie.'],
    m7: ['Tu caso práctico', 'Enseña todo el flujo con una sola pregunta: plantéala, consigue los datos, analízalos y presenta la respuesta.'],
    m8: ['Ronda de entrevistas', 'Una ronda completa de entrevistas: una prueba de SQL, un caso y tu propia historia.'],
  };

  DA.missionsEs = { BRIEFS: BRIEFS, SCEN: SCEN };

  I.content(function () {
    Object.keys(ROLES).forEach(function (k) { if (DA.cast && DA.cast[k]) { I.learn(DA.cast[k].role, ROLES[k]); DA.cast[k].role = ROLES[k]; } });
    if (DA.chapters) Object.keys(CHAPTERS).forEach(function (k) { if (DA.chapters[k]) DA.chapters[k] = CHAPTERS[k]; });
    if (DA.missionData) Object.keys(BRIEFS).forEach(function (k) { if (DA.missionData[k]) DA.missionData[k].brief = BRIEFS[k]; });
    if (DA.scenarios) Object.keys(SCEN).forEach(function (k) {
      (DA.scenarios[k] || []).forEach(function (s, i) {
        var t = SCEN[k][i];
        if (!t || t[1].length !== s.options.length) return;
        s.q = t[0]; s.options = t[1]; s.why = t[2];
        if (t[3] && s.table) s.table.cols = t[3];
      });
    });
    if (DA.bossData) Object.keys(BOSS).forEach(function (k) { var b = DA.bossData[k]; if (b) { I.learn(b.title, BOSS[k][0]); b.title = BOSS[k][0]; b.brief = BOSS[k][1]; } });
  });
})();
