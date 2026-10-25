'use strict';
// Spanish text for the app screens. Keys are the exact English text; {n} stands for a number.

// ---------- navigation, setup, plan, library ----------
i18nAdd({
  'Today': 'Hoy', 'Plan': 'Plan', 'Dungeons': 'Mazmorras', 'Rewards': 'Premios', 'Stats': 'Progreso', 'Hero': 'Héroe',
  'Language': 'Idioma', 'Step {n} of {n}': 'Paso {n} de {n}', 'About you': 'Sobre ti', 'What should we call you?': '¿Cómo te llamamos?', 'Your name': 'Tu nombre',
  'Gender': 'Género', 'Male': 'Hombre', 'Female': 'Mujer', 'Other': 'Otro', 'Age': 'Edad', 'yrs': 'años', 'years': 'años', 'Height': 'Altura', 'Weight': 'Peso',
  'Profile picture': 'Foto de perfil', 'Continue': 'Continuar', 'Back': 'Atrás', 'Go back': 'Atrás',
  'You can change it any time. Fancier pictures cost coins in the Shop.': 'Puedes cambiarla cuando quieras. Las fotos más chulas cuestan monedas en la Tienda.',
  'Your body data is used for calories, protein and a safe training load. It never leaves this phone.': 'Tus datos corporales se usan para calcular calorías, proteínas y una carga de entrenamiento segura. Nunca salen de este teléfono.',
  'Enter an age between {n} and {n}.': 'Introduce una edad entre {n} y {n}.', 'Enter your height in cm ({n} to {n}).': 'Introduce tu altura en cm (de {n} a {n}).', 'Enter your weight in kg ({n} to {n}).': 'Introduce tu peso en kg (de {n} a {n}).',
  'Your goal': 'Tu objetivo', 'Main objective': 'Objetivo principal', 'Target weight (optional)': 'Peso objetivo (opcional)',
  'Lose fat': 'Perder grasa', 'Burn more, keep your muscle': 'Quema más y conserva tu músculo', 'Build muscle': 'Ganar músculo', 'Size and shape': 'Volumen y definición',
  'Get stronger': 'Ganar fuerza', 'Heavier lifts, lower reps': 'Más peso y menos repeticiones', 'Stay fit': 'Mantenerte en forma', 'Move well, feel good': 'Muévete bien y siéntete bien',
  'Training': 'Entrenamiento', 'Experience': 'Experiencia', 'Beginner': 'Principiante', 'Intermediate': 'Intermedio', 'Expert': 'Experto',
  'beginner': 'principiante', 'intermediate': 'intermedio', 'expert': 'experto',
  'Days per week': 'Días por semana', 'Time per session': 'Duración de la sesión', 'Equipment you can use': 'Material que puedes usar',
  'Bodyweight': 'Peso corporal', 'Dumbbells': 'Mancuernas', 'Barbell': 'Barra', 'Machines': 'Máquinas', 'Cables': 'Poleas', 'Kettlebells': 'Pesas rusas', 'Bands': 'Bandas elásticas', 'Balls & foam roller': 'Balones y rodillo',
  'Focus & limits': 'Enfoque y límites', 'Want extra work on something?': '¿Quieres trabajar algo más?', 'Anything that hurts or limits you?': '¿Algo que te duela o te limite?',
  'Chest': 'Pecho', 'Back muscles': 'Espalda', 'Legs': 'Piernas', 'Glutes': 'Glúteos', 'Arms': 'Brazos', 'Shoulders': 'Hombros', 'Abs': 'Abdominales',
  'Knees': 'Rodillas', 'Lower back': 'Zona lumbar', 'Wrists': 'Muñecas', 'Build my plan': 'Crear mi plan',
  'The coach hides exercises that commonly aggravate those areas. This is not medical advice; ask a professional about injuries.': 'El entrenador oculta los ejercicios que suelen empeorar esas zonas. Esto no es consejo médico; consulta con un profesional si tienes lesiones.',
  'Meals': 'Comidas', 'Your plan': 'Tu plan', 'Why this plan': 'Por qué este plan', 'Start': 'Empezar', 'Browse exercise library': 'Ver la biblioteca de ejercicios', 'Shuffle exercises': 'Cambiar ejercicios', 'Change my answers': 'Cambiar mis respuestas', 'Swap exercise': 'Cambiar ejercicio',
  '{n} days a week': '{n} días a la semana', '{n} × {n} min': '{n} × {n} min', 'Full body': 'Cuerpo completo', 'Upper body': 'Tren superior', 'Lower body': 'Tren inferior', 'Push': 'Empuje', 'Pull': 'Tirón',
  'Underweight': 'Bajo peso', 'Healthy range': 'Peso saludable', 'Overweight': 'Sobrepeso', 'Obese': 'Obesidad', 'underweight': 'bajo peso', 'healthy range': 'peso saludable', 'overweight': 'sobrepeso', 'obese': 'obesidad', 'BMI': 'IMC',
  'Your target weight points the other way from your goal. Check both numbers in your profile.': 'Tu peso objetivo va en dirección contraria a tu meta. Revisa los dos datos en tu perfil.',
  'You are already lean, so the calorie deficit is kept small. Consider "Stay fit" or "Build muscle".': 'Ya estás delgado, así que el déficit de calorías es pequeño. Considera "Mantenerte en forma" o "Ganar músculo".',
  'Six or seven sessions in your first weeks is a lot. If you feel sore all the time, drop to {n} or {n} days.': 'Seis o siete sesiones en las primeras semanas son muchas. Si tienes agujetas todo el tiempo, baja a {n} o {n} días.',
  'Impact exercises are left out and rest is a bit longer, which is kinder to joints.': 'Se dejan fuera los ejercicios de impacto y el descanso es algo más largo, lo que cuida más las articulaciones.',
  'Jumping and high-impact moves are left out to protect joints. Walking on non-training days helps.': 'Se dejan fuera los saltos y los movimientos de alto impacto para proteger las articulaciones. Caminar los días sin entrenar ayuda.',
  'Log your weight on two different days to see the trend.': 'Registra tu peso en dos días distintos para ver la tendencia.',
  'Exercises': 'Ejercicios', 'All muscles': 'Todos los músculos', 'All equipment': 'Todo el material', 'demo loop': 'demo en bucle', 'How to': 'Cómo hacerlo',
  '{n} results': '{n} resultados', 'Search {n} exercises': 'Buscar entre {n} ejercicios', 'Showing the first {n}. Refine your search.': 'Mostrando los primeros {n}. Afina la búsqueda.',
  'Could not load exercises': 'No se pudieron cargar los ejercicios', 'Open the app once with a connection.': 'Abre la app una vez con conexión.',
  // muscles and equipment (lower case, as in the exercise data)
  'abdominals': 'abdominales', 'abductors': 'abductores', 'adductors': 'aductores', 'biceps': 'bíceps', 'calves': 'gemelos', 'chest': 'pecho', 'forearms': 'antebrazos', 'glutes': 'glúteos',
  'hamstrings': 'isquiotibiales', 'lats': 'dorsales', 'lower back': 'zona lumbar', 'middle back': 'espalda media', 'neck': 'cuello', 'quadriceps': 'cuádriceps', 'shoulders': 'hombros', 'traps': 'trapecios', 'triceps': 'tríceps',
  'bands': 'bandas', 'barbell': 'barra', 'body only': 'peso corporal', 'cable': 'polea', 'dumbbell': 'mancuerna', 'e-z curl bar': 'barra Z', 'exercise ball': 'balón', 'foam roll': 'rodillo',
  'kettlebells': 'pesa rusa', 'machine': 'máquina', 'medicine ball': 'balón medicinal', 'none': 'ninguno', 'other': 'otro',
  'strength': 'fuerza', 'stretching': 'estiramientos', 'plyometrics': 'pliometría', 'cardio': 'cardio', 'powerlifting': 'powerlifting', 'olympic weightlifting': 'halterofilia', 'strongman': 'strongman',
});
i18nAdd({ 'Follow the steps below': 'Sigue los pasos de abajo', 'Show more ({n})': 'Ver más ({n})', 'FitQuest version {n}': 'FitQuest versión {n}', 'Rookie ·': 'Novato ·', 'Iron Will ·': 'Voluntad de hierro ·', 'Challenger ·': 'Aspirante ·', 'Warrior ·': 'Guerrero ·', 'Champion ·': 'Campeón ·', 'Legend ·': 'Leyenda ·', 'Titan ·': 'Titán ·', 'Banners · {n}/{n}': 'Banners · {n}/{n}', 'Heavy Metal': 'Heavy metal' });
i18nPat(/^(\d+) \/ (\d+) XP to level (\d+)$/, (a, b, c) => `${a} / ${b} XP para el nivel ${c}`);
i18nPat(/^· ×(\d+) this week$/, a => `· ×${a} esta semana`);
i18nPat(/^(FitQuest is free[\s\S]*?\(public domain\)\.) ([\s\S]+)$/, (a, b) => `${tr(a)} ${tr(b)}`);
i18nPat(/^Extra sets go to: (.+)\.$/, a => `Series extra para: ${a.split(', ').map(x => tr(x[0].toUpperCase() + x.slice(1)).toLowerCase()).join(', ')}.`);
i18nPat(/^BMI ([\d.]+) \((.+)\)\. Estimated maintenance is (\d+) kcal a day\.$/, (a, b, c) => `IMC ${a} (${tr(b)}). Tu mantenimiento estimado es de ${c} kcal al día.`);
i18nPat(/^([\d.]+) kg to (lose|gain)\. A safe pace is about ([\d.]+) kg a week, so roughly (\d+) weeks\.$/, (a, b, c, d) => `${a} kg por ${b === 'lose' ? 'perder' : 'ganar'}. Un ritmo seguro es de unos ${c} kg a la semana, es decir, unas ${d} semanas.`);
i18nPat(/^Exercises that commonly aggravate (.+) are filtered out\.$/, a => `Se filtran los ejercicios que suelen empeorar: ${a.split(' and ').map(x => tr(x[0].toUpperCase() + x.slice(1)).toLowerCase()).join(', ')}.`);
i18nPat(/^Day (\d+) · (.+)$/, (a, b) => `Día ${a} · ${tr(b)}`);

// ---------- workout, rest, victory ----------
i18nAdd({
  'Previous': 'Anterior', 'Next': 'Siguiente', 'Finish': 'Terminar', 'Instructions': 'Instrucciones', 'Quit': 'Salir', 'Set': 'Serie', 'Reps': 'Reps', 'kg': 'kg', 'Add set': 'Añadir serie',
  'Exercise {n} of {n}': 'Ejercicio {n} de {n}', 'Target {n} × {n}{n}': 'Objetivo {n} × {n}{n}', 'Target {n} × {n}': 'Objetivo {n} × {n}', 'last time {n} kg × {n}': 'la última vez {n} kg × {n}',
  'Weight set {n}': 'Peso de la serie {n}', 'Reps set {n}': 'Repeticiones de la serie {n}', 'Complete set {n}': 'Completar la serie {n}',
  'Rest': 'Descanso', 'Skip': 'Saltar', '−15s': '−15 s', '+15s': '+15 s', 'Discard this workout?': '¿Descartar este entrenamiento?', 'Keep going': 'Seguir', 'Discard': 'Descartar',
  'Workout cleared': 'Entrenamiento completado', 'Dungeon cleared': 'Mazmorra superada', 'Total': 'Total', 'Collect': 'Recoger', 'Awesome': '¡Genial!', 'Nice': 'Bien', 'Close': 'Cerrar',
  '{n} sets × {n}': '{n} series × {n}', 'Level perk {n}% XP': 'Mejora de nivel {n}% XP', 'XP booster ×{n}': 'Potenciador de XP ×{n}', 'Dungeon of the day ×{n}': 'Mazmorra del día ×{n}', '{n}-day streak ×{n}': 'Racha de {n} días ×{n}',
  'Badge unlocked · {n} XP': 'Insignia desbloqueada · {n} XP', 'Added to your loot. Open it on Today.': 'Añadido a tu botín. Ábrelo en Hoy.',
  'LEVEL UP': 'SUBES DE NIVEL', 'Unlocked': 'Desbloqueado', 'Milestone chest': 'Cofre de hito', 'Open it on Today': 'Ábrelo en Hoy', '{n} coins': '{n} monedas', 'Level {n}': 'Nivel {n}', 'level {n}': 'nivel {n}', 'Lv {n}': 'Nv. {n}',
  'Meal': 'Comida', 'Workout': 'Entrenamiento', 'Perk': 'Mejora', 'Theme': 'Tema', 'Ring': 'Anillo', 'Banner': 'Banner', 'Title': 'Título',
  '{n}× XP': '{n}× XP', 'Today {n}%': 'Hoy {n}%',
});
i18nPat(/^(\d+) new records? × (\d+)$/, (a, b) => `${a} ${a === '1' ? 'nuevo récord' : 'nuevos récords'} × ${b}`);

// ---------- progress, hero, profile ----------
i18nAdd({
  'Progress': 'Progreso', 'day streak': 'días de racha', 'workouts': 'entrenamientos', 'minutes': 'minutos', 'Body weight': 'Peso corporal', 'Log': 'Registrar', "Today's weight (kg)": 'Peso de hoy (kg)',
  '{n} kg since start': '{n} kg desde el inicio', 'target {n}': 'objetivo {n}', 'Volume per workout': 'Volumen por entrenamiento', 'Finish a workout to see this.': 'Termina un entrenamiento para verlo.',
  'kg lifted (weight × reps), last {n}': 'kg levantados (peso × repeticiones), últimos {n}', 'Personal records': 'Récords personales', 'No records yet.': 'Aún no hay récords.', 'History': 'Historial', 'No workouts yet.': 'Aún no hay entrenamientos.',
  '{n} kg × {n}': '{n} kg × {n}', '{n} exercises': '{n} ejercicios', '{n} exercise': '{n} ejercicio',
  'Remove': 'Quitar', 'Save': 'Guardar', 'Saved': 'Guardado',
  'STR · kg lifted': 'FUE · kg levantados', 'END · minutes': 'RES · minutos', 'DEX · workouts': 'DES · entrenos', 'Edit profile and looks': 'Editar perfil y aspecto', 'Edit profile': 'Editar perfil',
  'Sound effects: on': 'Efectos de sonido: sí', 'Sound effects: off': 'Efectos de sonido: no', 'Body': 'Cuerpo', 'Goal': 'Objetivo', 'Schedule': 'Horario', 'Equipment': 'Material', '{n} days · {n} min': '{n} días · {n} min',
  'Edit body data and training plan': 'Editar datos corporales y plan de entrenamiento', 'Export my data': 'Exportar mis datos', 'Reset everything': 'Borrarlo todo', 'Delete all data?': '¿Borrar todos los datos?', 'Cancel': 'Cancelar', 'Delete': 'Borrar',
  'FitQuest is free, with no ads and no payments. Coins and XP are just for fun. Everything stays on this device; there are no accounts, ads or payments. Estimates are guidance, not medical advice. Exercise photos: free-exercise-db (public domain).':
    'FitQuest es gratis, sin anuncios ni pagos. Las monedas y los XP son solo para divertirse. Todo se queda en este dispositivo; no hay cuentas, anuncios ni pagos. Las estimaciones son orientativas, no consejo médico. Fotos de ejercicios: free-exercise-db (dominio público).',
  'Icons by Lorc, Delapouite, Skoll, Caro Asercion, Darkzaitzev, Sbed and Carl Olsen from game-icons.net, CC BY 3.0.': 'Iconos de Lorc, Delapouite, Skoll, Caro Asercion, Darkzaitzev, Sbed y Carl Olsen, de game-icons.net, CC BY 3.0.',
  'Name': 'Nombre', 'Name saved': 'Nombre guardado', '{n} more in the Shop': '{n} más en la Tienda', 'Body and training': 'Cuerpo y entrenamiento', 'More titles come from badges.': 'Hay más títulos al conseguir insignias.',
  '{n} y · {n} cm · {n} kg': '{n} años · {n} cm · {n} kg', 'by level': 'por nivel', 'Plain ring': 'Anillo liso',
});

// ---------- home, quests, boss ----------
i18nAdd({
  'Daily quests': 'Misiones diarias', '{n}/{n} claimed': '{n}/{n} reclamadas', 'Claim': 'Reclamar', 'Open': 'Abrir', 'Enter': 'Entrar',
  'Finish a workout': 'Terminar un entrenamiento', 'Complete {n} sets': 'Completar {n} series', 'Study {n} exercise guides': 'Estudiar {n} guías de ejercicios', 'Log your weight': 'Registrar tu peso',
  'Train for {n} minutes': 'Entrenar {n} minutos', 'Clear a dungeon': 'Superar una mazmorra', 'Drink {n} glasses of water': 'Beber {n} vasos de agua', 'Sleep {n} hours or more': 'Dormir {n} horas o más',
  'Eat {n} planned meals': 'Comer {n} comidas del plan', 'Clear every quest': 'Completar todas las misiones', 'Bonus chest: {n} XP ·': 'Cofre de bonificación: {n} XP ·',
  'Daily check-in · day {n} · {n} XP ·': 'Check-in diario · día {n} · {n} XP ·', 'Check-in day {n}': 'Check-in del día {n}', 'Check-in day {n}: silver chest!': 'Check-in del día {n}: ¡cofre de plata!',
  'More ways to earn · spin ready': 'Más formas de ganar · giro disponible', 'More ways to earn': 'Más formas de ganar',
  'Weekly boss': 'Jefe semanal', 'Iron Golem': 'Gólem de hierro', 'Sloth Dragon': 'Dragón perezoso', 'Couch Lord': 'Señor del sofá', 'Fatigue Wraith': 'Espectro de la fatiga', 'Gravity Beast': 'Bestia de la gravedad',
  '{n} hits left. Every workout deals damage.': 'Te quedan {n} golpes. Cada entrenamiento hace daño.', '{n} hit left. Every workout deals damage.': 'Te queda {n} golpe. Cada entrenamiento hace daño.', 'Defeated!': '¡Derrotado!',
  'Claim loot · {n} XP ·': 'Reclamar botín · {n} XP ·', 'Next training': 'Próximo entrenamiento', 'Start workout': 'Empezar entrenamiento', '{n} exercises · ~{n} min · {n} XP': '{n} ejercicios · ~{n} min · {n} XP',
  'Meal plan': 'Plan de comidas', 'Set your diet and cooking time to get a week of recipes that hit your calories.': 'Elige tu dieta y el tiempo para cocinar y recibe una semana de recetas que cumplen tus calorías.',
  'Fuel': 'Combustible', 'kcal / day': 'kcal / día', 'protein': 'proteínas', 'carbs': 'hidratos', 'fat': 'grasas',
  'Aim for {n} L of water. Calories are an estimate; adjust after {n} weeks based on the scale.': 'Intenta beber {n} L de agua. Las calorías son una estimación; ajústalas tras {n} semanas según la báscula.',
  'Dungeon of the day · {n}% XP': 'Mazmorra del día · {n}% XP', 'Dungeon of the day': 'Mazmorra del día', 'Meals today': 'Comidas de hoy', '{n}/{n} eaten': '{n}/{n} comidas', 'All meals done. Nice.': 'Todas las comidas hechas. Bien.',
  'Wooden chest': 'Cofre de madera', 'Silver chest': 'Cofre de plata', 'Golden chest': 'Cofre dorado', 'Opening…': 'Abriendo…',
  'New': 'Nuevo', 'Boxer': 'Boxeador',
});
i18nPat(/^Open (wooden|silver|golden) chest(?: \(\+?(\d+) more\))?$/, (a, n) => `Abrir cofre ${{ wooden: 'de madera', silver: 'de plata', golden: 'dorado' }[a]}${n ? ` (+${n} más)` : ''}`);
i18nPat(/^Next: (.+) · (.+) · (\d+) min$/, (a, b, c) => `Siguiente: ${tr(a)} · ${tr(b)} · ${c} min`);

// ---------- avatars, rings, banners, themes, titles ----------
i18nAdd({
  'Sun': 'Sol', 'Moon': 'Luna', 'Leaf': 'Hoja', 'Mountain': 'Montaña', 'Anchor': 'Ancla', 'Compass': 'Brújula', 'Feather': 'Pluma', 'Snowflake': 'Copo de nieve', 'Cactus': 'Cactus', 'Pine': 'Pino', 'Panda': 'Panda', 'Penguin': 'Pingüino',
  'Turtle': 'Tortuga', 'Duck': 'Pato', 'Bee': 'Abeja', 'Wolf': 'Lobo', 'Lion': 'León', 'Tiger': 'Tigre', 'Bear': 'Oso', 'Fox': 'Zorro', 'Eagle': 'Águila', 'Rooster': 'Gallo', 'Shark': 'Tiburón', 'Gorilla': 'Gorila', 'Stallion': 'Semental',
  'Bull': 'Toro', 'Ram': 'Carnero', 'Raven': 'Cuervo', 'Owl': 'Búho', 'Scorpion': 'Escorpión', 'Ninja': 'Ninja', 'Samurai': 'Samurái', 'Viking': 'Vikingo', 'Spartan': 'Espartano', 'Minotaur': 'Minotauro', 'Robot': 'Robot', 'Wyvern': 'Wyvern',
  'Unicorn': 'Unicornio', 'Astronaut': 'Astronauta', 'Dragon': 'Dragón', 'Kraken': 'Kraken', 'Alien': 'Alienígena', 'T-Rex': 'T-Rex', 'Rocket': 'Cohete', 'Crown': 'Corona',
  'Flame ring': 'Anillo de fuego', 'Electric ring': 'Anillo eléctrico', 'Diamond ring': 'Anillo de diamante', 'Rainbow ring': 'Anillo arcoíris', 'Galaxy ring': 'Anillo galáctico', 'Plain banner': 'Banner liso',
  'Blueprint banner': 'Banner de plano', 'Speed lines banner': 'Banner de líneas de velocidad', 'Dotted banner': 'Banner de puntos', 'Ripples banner': 'Banner de ondas', 'Peaks banner': 'Banner de picos', 'Glow banner': 'Banner de brillo', 'Heat banner': 'Banner de calor',
  'Ember': 'Brasa', 'Neon City': 'Ciudad neón', 'Frostbite': 'Escarcha', 'Toxic': 'Tóxico', 'Deep Ocean': 'Océano profundo', 'Royal': 'Real', 'Arcade': 'Recreativa', 'Lava Flow': 'Río de lava', 'Mainframe': 'Mainframe', 'Golden Hour': 'Hora dorada',
  'Rookie': 'Novato', 'Iron Will': 'Voluntad de hierro', 'Challenger': 'Aspirante', 'Warrior': 'Guerrero', 'Champion': 'Campeón', 'Legend': 'Leyenda', 'Titan': 'Titán',
  'Blooded': 'Curtido', 'Early Bird': 'Madrugador', 'Boss Slayer': 'Cazajefes', 'Iron Veteran': 'Veterano de hierro', 'Two Weeks Strong': 'Dos semanas de hierro', 'Dungeon Lord': 'Señor de las mazmorras', 'Double Digits': 'Doble dígito',
  'Treasure Hunter': 'Cazatesoros', 'Questmaster': 'Maestro de misiones',
});

// ---------- rewards: levels, shop, badges ----------
i18nAdd({
  'Levels': 'Niveles', 'Shop': 'Tienda', 'Badges': 'Insignias', 'Levels unlock new': 'Los niveles desbloquean nuevas', 'meals': 'comidas', 'and': 'y', 'perks': 'mejoras',
  '. Coins are spent in the Shop on looks and boosts.': '. Las monedas se gastan en la Tienda en aspectos y potenciadores.', 'Next unlock': 'Siguiente desbloqueo', '{n} XP to go': 'faltan {n} XP',
  'Reward road': 'Camino de recompensas', 'Level {n} · {n} coins': 'Nivel {n} · {n} monedas', 'Active perks': 'Mejoras activas',
  'Coins buy looks and boosts. Earn them from workouts, quests, chests and the daily spin.': 'Las monedas compran aspectos y potenciadores. Consíguelas con entrenamientos, misiones, cofres y la ruleta diaria. ', 'All the ways to earn': 'Todas las formas de ganar',
  'Boosts and chests': 'Potenciadores y cofres', 'XP booster': 'Potenciador de XP', 'Double XP from workouts for {n} hours': 'XP doble en los entrenamientos durante {n} horas', 'active, {n} h left': 'activo, quedan {n} h', 'you have {n}': 'tienes {n}',
  'Extra spin': 'Giro extra', 'One more turn of the daily wheel': 'Un giro más de la ruleta diaria', 'Coins, XP or a small look': 'Monedas, XP o un aspecto pequeño', 'Better odds of a new look': 'Más posibilidades de un aspecto nuevo',
  'The best odds of a rare look': 'Las mejores posibilidades de un aspecto raro', 'Profile pictures': 'Fotos de perfil', 'Rings': 'Anillos', 'Banners': 'Banners', 'App themes': 'Temas de la app',
  'Equip': 'Equipar', 'Equipped': 'Equipado', 'Already yours.': 'Ya es tuyo.', 'Need {n} more coins.': 'Te faltan {n} monedas.',
  '{n}% XP from every workout': '{n}% de XP extra en cada entrenamiento', '{n}% coins from every workout': '{n}% de monedas extra en cada entrenamiento',
  'XP Boost I': 'Impulso de XP I', 'XP Boost II': 'Impulso de XP II', 'XP Boost III': 'Impulso de XP III', 'Coin Boost I': 'Impulso de monedas I', 'Coin Boost II': 'Impulso de monedas II',
  'Fourth quest': 'Cuarta misión', 'A fourth daily quest every day': 'Una cuarta misión diaria cada día', 'Double spin': 'Giro doble', 'Two free daily spins': 'Dos giros gratis al día', 'Rest-day shield': 'Escudo de descanso',
  'Your streak survives one missed day': 'Tu racha sobrevive a un día sin entrenar', 'Boss hunter': 'Cazador de jefes', 'The weekly boss drops a golden chest': 'El jefe semanal suelta un cofre dorado', 'Record breaker': 'Rompe récords',
  'New personal records are worth {n} XP': 'Los nuevos récords personales valen {n} XP', 'Needs kettlebells': 'Requiere pesas rusas', 'Needs bands': 'Requiere bandas elásticas', 'Needs barbell': 'Requiere barra',
  // badges
  'First Blood': 'Primera sangre', 'Warming Up': 'Calentando', 'Gym Rat': 'Rata de gimnasio', 'On Fire': 'En llamas', 'Unstoppable': 'Imparable', 'One Ton Club': 'Club de la tonelada', 'Heavy Metal': 'Heavy Metal', 'Night Owl': 'Búho nocturno',
  'Dungeon Crawler': 'Explorador de mazmorras', 'Dungeon Master': 'Maestro de mazmorras', 'Scale Master': 'Maestro de la báscula', 'Aqua Hero': 'Héroe del agua', 'Lucky Streak': 'Racha de suerte', 'Gourmet': 'Gourmet', 'Perfect Plate': 'Plato perfecto', 'Well Rested': 'Bien descansado',
  'Finish your first workout': 'Terminar tu primer entrenamiento', 'Finish {n} workouts': 'Terminar {n} entrenamientos', 'Train {n} days in a row': 'Entrenar {n} días seguidos', 'Lift {n} kg in total': 'Levantar {n} kg en total',
  'Finish a workout before {n} am': 'Terminar un entrenamiento antes de las {n} h', 'Clear {n} dungeons': 'Superar {n} mazmorras', 'Log your weight {n} times': 'Registrar tu peso {n} veces', 'Defeat a weekly boss': 'Derrotar a un jefe semanal',
  'Reach level {n}': 'Alcanzar el nivel {n}', 'Open {n} chests': 'Abrir {n} cofres', 'Hit your water goal on {n} days': 'Alcanzar tu objetivo de agua durante {n} días', 'Use the daily spin {n} times': 'Usar la ruleta diaria {n} veces',
  'Unlock your first chef recipe': 'Desbloquear tu primera receta de chef', 'Eat every planned meal in one day': 'Comer todas las comidas del plan en un día', 'Log {n}+ hours of sleep on {n} days': 'Registrar {n}+ horas de sueño durante {n} días',
  'Claim {n} daily quests': 'Reclamar {n} misiones diarias',
  // toasts
  'Water goal reached: {n} XP': 'Objetivo de agua cumplido: {n} XP', 'Well rested: {n} XP': 'Bien descansado: {n} XP', 'Logged: {n} XP': 'Registrado: {n} XP', 'Perfect nutrition day: {n} XP': 'Día de nutrición perfecto: {n} XP', 'Weigh-in logged: {n} XP': 'Pesaje registrado: {n} XP',
  '{n} XP': '{n} XP', 'Not enough exercises match your equipment and limits.': 'No hay suficientes ejercicios para tu material y tus límites.',
});
i18nPat(/^Badge unlocked: (.+) \((\+?\d+) XP\)$/, (a, b) => `Insignia desbloqueada: ${tr(a)} (${b} XP)`);
i18nPat(/^Unlocked (.+)$/, a => `Desbloqueado: ${tr(a)}`);
i18nPat(/^(.+) unlocks at level (\d+)\.$/, (a, b) => `${tr(a)} se desbloquea en el nivel ${b}.`);
i18nPat(/^(.+) bought$/, a => `${tr(a)} comprado`);
i18nPat(/^title: (.+)$/, a => `título: ${tr(a)}`);
i18nPat(/^Finish a workout after (\d+) pm$/, a => `Terminar un entrenamiento después de las ${+a + 12} h`);
i18nPat(/^Add (.+) to your equipment in your profile\.$/, a => `Añade ${{ kettlebells: 'pesas rusas', bands: 'bandas elásticas', barbell: 'una barra' }[a] || a} a tu material en el perfil.`);

// ---------- dungeons ----------
i18nAdd({
  'Special workouts built from your equipment and limits. They unlock as you level up. Clearing one earns bonus XP and a chest. {n} of {n} unlocked.': 'Entrenamientos especiales creados con tu material y tus límites. Se desbloquean al subir de nivel. Superar uno da XP extra y un cofre. {n} de {n} desbloqueadas.',
  'Tabata Blitz': 'Tabata Relámpago', 'Core Inferno': 'Infierno del core', 'Push-Up Pyramid': 'Pirámide de flexiones', 'Mobility Monk': 'Monje de la movilidad', 'Glute Forge': 'Forja de glúteos', 'Arm Arena': 'Arena de brazos',
  'Leg Day Dungeon': 'Mazmorra del día de pierna', 'Back Raid': 'Asalto a la espalda', 'Boss Rush': 'Carrera de jefes', 'Titan Trial': 'Prueba del titán', 'Cardio Crusher': 'Machacacardio', 'Shoulder Siege': 'Asedio de hombros',
  'Spine Sanctuary': 'Santuario de la columna', 'Chest Citadel': 'Ciudadela del pecho', 'Boot Camp': 'Campo de entrenamiento', 'Kettlebell Krypt': 'Cripta de las pesas rusas', 'Band Brawl': 'Pelea de bandas',
  'Upper-Body Annihilation': 'Aniquilación del tren superior', 'Lower-Body Apocalypse': 'Apocalipsis del tren inferior', 'Endless Marathon': 'Maratón sin fin', 'Olympian Gauntlet': 'Desafío olímpico',
  'Four bodyweight moves. {n} s on, {n} s off, four rounds each.': 'Cuatro movimientos con tu peso corporal. {n} s de trabajo, {n} s de descanso, cuatro rondas cada uno.',
  'Six abs and back exercises that light up your middle.': 'Seis ejercicios de abdominales y espalda que encienden tu zona media.', 'Five push-up variations, five sets each. No equipment.': 'Cinco variantes de flexiones, cinco series cada una. Sin material.',
  'Eight stretches for recovery days. Easy XP, happy joints.': 'Ocho estiramientos para los días de recuperación. XP fácil y articulaciones contentas.', 'Glutes and hamstrings, four heavy sets each.': 'Glúteos e isquiotibiales, cuatro series pesadas cada uno.',
  'Six fast bodyweight moves, {n} s each. Heart rate up, excuses down.': 'Seis movimientos rápidos con tu peso corporal, {n} s cada uno. Más pulsaciones, menos excusas.', 'Biceps, triceps and forearms until your sleeves complain.': 'Bíceps, tríceps y antebrazos hasta que las mangas protesten.',
  'Boulder delts and traps, hit from every angle.': 'Hombros y trapecios como rocas, trabajados desde todos los ángulos.', 'Slow stretches for back, hips and hamstrings. Recovery XP.': 'Estiramientos lentos para espalda, caderas e isquiotibiales. XP de recuperación.',
  'Quads, hamstrings, glutes and calves. Bring snacks.': 'Cuádriceps, isquiotibiales, glúteos y gemelos. Trae algo de comer.', 'Five chest exercises, four sets each. Storm the walls.': 'Cinco ejercicios de pecho, cuatro series cada uno. Asalta las murallas.',
  'Pull heavy: lats, mid-back, traps and a little biceps.': 'Tira con fuerza: dorsales, espalda media, trapecios y un poco de bíceps.', 'Eight bodyweight exercises, {n} × {n}. Works anywhere.': 'Ocho ejercicios con tu peso corporal, {n} × {n}. Funciona en cualquier sitio.',
  'Swing, press and carry. Needs kettlebells in your equipment.': 'Balancea, empuja y carga. Necesitas pesas rusas en tu material.', 'One exercise for every major muscle, two quick sets each. Double XP.': 'Un ejercicio para cada músculo importante, dos series rápidas cada uno. XP doble.',
  'Constant tension with resistance bands. Needs bands.': 'Tensión constante con bandas elásticas. Requiere bandas.', 'Ten exercises for chest, back, shoulders and arms. Double XP.': 'Diez ejercicios de pecho, espalda, hombros y brazos. XP doble.',
  'Five heavy lifts, {n} × {n}, long rests. Triple XP for the brave.': 'Cinco levantamientos pesados, {n} × {n}, descansos largos. XP triple para los valientes.', 'Quads, hamstrings, glutes and calves, plus abs to finish.': 'Cuádriceps, isquiotibiales, glúteos y gemelos, y abdominales para terminar.',
  'Fourteen exercises, two sets each, almost no rest.': 'Catorce ejercicios, dos series cada uno, casi sin descanso.', 'Heavy barbell work, {n} × {n}, three-minute rests. Needs a barbell.': 'Trabajo pesado con barra, {n} × {n}, descansos de tres minutos. Requiere una barra.',
});

// ---------- earn ----------
i18nAdd({
  'Ways to earn': 'Formas de ganar', 'Spinning…': 'Girando…', 'You won!': '¡Has ganado!', 'JACKPOT!': '¡PREMIO GORDO!', 'Loot chest': 'Cofre', 'Spin again ({n})': 'Girar otra vez ({n})', 'Open it on the Rewards screen.': 'Ábrelo en la pantalla de Recompensas.', 'Daily spin': 'Ruleta diaria', '{n} spins ready': '{n} giros disponibles', '{n} spin ready': '{n} giro disponible', 'Come back tomorrow': 'Vuelve mañana', 'Spin now': 'Girar ya', 'Spun today': 'Ya has girado hoy',
  'Two free spins a day: coins, XP or even a chest. More spins are sold in the Shop.': 'Dos giros gratis al día: monedas, XP o incluso un cofre. En la Tienda se venden más giros.',
  'One free spin a day: coins, XP or even a chest. More spins are sold in the Shop.': 'Un giro gratis al día: monedas, XP o incluso un cofre. En la Tienda se venden más giros.',
  'Water': 'Agua', '{n}/{n} glasses': '{n}/{n} vasos', '{n} XP per glass ({n} ml), {n} XP when you hit your goal.': '{n} XP por vaso ({n} ml), {n} XP al alcanzar tu objetivo.', 'Add a glass': 'Añadir un vaso',
  'Sleep': 'Sueño', '{n} h logged': '{n} h registradas', 'Not logged': 'Sin registrar', 'How long did you sleep last night? {n} hours or more earns {n} XP.': '¿Cuánto dormiste anoche? {n} horas o más dan {n} XP.',
  'Weekly quests': 'Misiones semanales', 'Train {n} times this week': 'Entrenar {n} veces esta semana', 'Log your weight twice': 'Registrar tu peso dos veces', '{n} · chest': '{n} · cofre',
  'Everything that pays': 'Todo lo que da puntos', 'Every set': 'Cada serie', '{n} XP, + chest for dungeons': '{n} XP, + cofre en las mazmorras', 'New personal record': 'Nuevo récord personal',
  '{n} XP each ({n} with a level perk)': '{n} XP cada uno ({n} con una mejora de nivel)', 'Training streak': 'Racha de entrenamiento', 'up to ×{n} XP': 'hasta ×{n} XP',
  '×{n} to ×{n} XP, dungeon of the day ×{n}': 'de ×{n} a ×{n} XP, mazmorra del día ×{n}', '{n} to {n} XP each, bonus chest for all of them': 'de {n} a {n} XP cada una, cofre extra por completarlas todas',
  '{n} to {n} XP + coins': 'de {n} a {n} XP + monedas', '{n} XP + a chest': '{n} XP + un cofre', 'Meals eaten': 'Comidas realizadas', '{n} XP each, perfect day {n} XP': '{n} XP cada una, día perfecto {n} XP',
  '{n} XP a glass, {n} at your goal': '{n} XP por vaso, {n} al llegar a tu objetivo', 'Sleep {n} h+': 'Dormir {n} h+', 'Weigh-in': 'Pesaje', 'Daily check-in': 'Check-in diario',
  'up to {n} XP and {n} coins, silver chest on day {n}': 'hasta {n} XP y {n} monedas, cofre de plata el día {n}', 'coins, XP or a chest': 'monedas, XP o un cofre', '{n} to {n} XP': 'de {n} a {n} XP', 'Level-ups': 'Subidas de nivel',
  'coins, a chest every {n}th level, and new meals, workouts and perks': 'monedas, un cofre cada {n}.º nivel y nuevas comidas, entrenamientos y mejoras',
  'Hit your water goal on {n} days': 'Alcanzar tu objetivo de agua durante {n} días',
});

// ---------- meals ----------
i18nAdd({
  'Meal setup': 'Configurar comidas', 'Your plan targets about {n} kcal and {n} g protein a day.': 'Tu plan apunta a unas {n} kcal y {n} g de proteína al día.',
  'Diet': 'Dieta', 'Eat everything': 'Como de todo', 'Pescatarian': 'Pescetariano', 'Vegetarian': 'Vegetariano', 'Vegan': 'Vegano',
  'Avoid': 'Evitar', 'Gluten': 'Gluten', 'Dairy': 'Lácteos', 'Nuts': 'Frutos secos', 'Eggs': 'Huevos', 'Fish & shellfish': 'Pescado y marisco', 'Soy': 'Soja',
  'Eating style': 'Estilo de alimentación', 'No preference': 'Sin preferencia', 'Anti-inflammatory': 'Antiinflamatorio',
  'Meals are chosen for your calories, macros and cooking time.': 'Las comidas se eligen según tus calorías, macros y tiempo de cocina.',
  'Built around fatty fish, leafy greens, vegetables, berries, nuts, beans and olive oil. Leaves out red meat, refined pasta and added sugar. General guidance, not medical advice.': 'Basado en pescado azul, verduras de hoja verde, hortalizas, frutos rojos, frutos secos, legumbres y aceite de oliva. Excluye la carne roja, la pasta refinada y el azúcar añadido. Orientación general, no consejo médico.',
  'Cuisine': 'Cocina', 'Optional. Leave empty for a mix. One cuisine gives the shortest shopping list; pick two or three for more choice.': 'Opcional. Déjalo vacío para una mezcla. Una sola cocina da la lista de la compra más corta; elige dos o tres para tener más opciones.',
  'Spanish': 'Española', 'Italian': 'Italiana', 'Chinese': 'China', 'Japanese': 'Japonesa', 'Mexican': 'Mexicana', 'Indian': 'India', 'Greek': 'Griega', 'Thai': 'Tailandesa', 'Middle Eastern': 'De Oriente Medio',
  'Variety': 'Variedad', 'Simple': 'Simple', 'Balanced': 'Equilibrada', 'Varied': 'Variada',
  'Fewest ingredients. Meals repeat, so you can prep once and eat twice.': 'Los menos ingredientes. Las comidas se repiten, así que puedes cocinar una vez y comer dos.',
  'A mix of reusing ingredients and trying new meals.': 'Un equilibrio entre reutilizar ingredientes y probar comidas nuevas.', 'Most variety, with a longer shopping list.': 'La mayor variedad, con una lista de la compra más larga.',
  'Meals per day': 'Comidas al día', '{n} + snack': '{n} + tentempié', '{n} + {n} snacks': '{n} + {n} tentempiés', '3 + snack': '3 + tentempié', '3 + 2 snacks': '3 + 2 tentempiés',
  'Time to cook on weekdays': 'Tiempo para cocinar entre semana', 'Time to cook on weekends': 'Tiempo para cocinar en fin de semana', 'Time to cook this day': 'Tiempo para cocinar este día',
  'Quick · {n} min': 'Rápido · {n} min', 'Normal · {n} min': 'Normal · {n} min', 'Chef · {n} min': 'Chef · {n} min', 'Quick': 'Rápido', 'Normal': 'Normal', 'Chef': 'Chef',
  'You can change the cooking time for any single day later.': 'Más tarde puedes cambiar el tiempo de cocina de cada día.', 'Build my meal plan': 'Crear mi plan de comidas', 'Planning your week…': 'Planificando tu semana…', 'New week planned': 'Semana nueva planificada',
  'Breakfast': 'Desayuno', 'Lunch': 'Comida', 'Snack': 'Tentempié', 'Dinner': 'Cena', 'Mon': 'Lun', 'Tue': 'Mar', 'Wed': 'Mié', 'Thu': 'Jue', 'Fri': 'Vie', 'Sat': 'Sáb', 'Sun': 'Dom',
  '{n} kcal planned': '{n} kcal planificadas', '{n} kcal eaten so far': '{n} kcal consumidas hasta ahora', 'Protein': 'Proteínas', 'Carbs': 'Hidratos', 'Fat': 'Grasas',
  'This week averages {n} g protein against a {n} g target. A longer cooking time, "Balanced" variety or a protein snack closes the gap.': 'Esta semana la media es de {n} g de proteína frente a un objetivo de {n} g. Más tiempo de cocina, la variedad "Equilibrada" o un tentempié proteico cierran la diferencia.',
  'Your diet and cuisine choices leave no faster option for some meals, so they take a little longer than this.': 'Tu dieta y tu cocina elegidas no dejan una opción más rápida para algunas comidas, así que tardan un poco más.',
  'change': 'cambiar', '{n} ingredients this week': '{n} ingredientes esta semana', '×{n} this week': '×{n} esta semana', '{n} kcal · P {n} · C {n} · F {n}': '{n} kcal · P {n} · H {n} · G {n}',
  'Shopping list': 'Lista de la compra', 'Shuffle the whole week': 'Cambiar toda la semana', 'See which chef recipes you unlock next': 'Ver qué recetas de chef desbloquearás después', 'Change diet and preferences': 'Cambiar dieta y preferencias',
  'Calories and macros are estimates from typical ingredient values. They are not medical or dietitian advice.': 'Las calorías y los macros son estimaciones basadas en valores típicos de los ingredientes. No son consejo médico ni de un dietista.',
  'No breakfast recipe matches your filters, so breakfast is skipped and the other meals get bigger.': 'Ninguna receta de desayuno cumple tus filtros, así que se omite el desayuno y las otras comidas son más grandes.',
  'No lunch or dinner recipe matches your filters.': 'Ninguna receta de comida o cena cumple tus filtros.', 'No snack matches your filters, so snacks are skipped.': 'Ningún tentempié cumple tus filtros, así que se omiten.',
  'Only {n} lunch/dinner recipes match your filters, so meals will repeat during the week.': 'Solo {n} recetas de comida o cena cumplen tus filtros, así que las comidas se repetirán durante la semana.',
  'Ingredients': 'Ingredientes', 'Plus salt, pepper, herbs and spices to taste.': 'Más sal, pimienta, hierbas y especias al gusto.', 'Steps': 'Pasos', 'I ate this · {n} XP': 'Lo he comido · {n} XP', 'Undo: not eaten': 'Deshacer: no comido',
  'Swap for another recipe': 'Cambiar por otra receta', 'No other recipe fits your filters.': 'Ninguna otra receta cumple tus filtros.', '{n}× portion': 'ración ×{n}', 'kcal': 'kcal',
  'Everything for the {n} days. Amounts are rounded up.': 'Todo lo necesario para los {n} días. Las cantidades están redondeadas hacia arriba.', 'Pantry': 'Despensa', 'Dairy & eggs': 'Lácteos y huevos', 'Produce': 'Frutas y verduras',
  'Meat & fish': 'Carne y pescado', 'Bakery': 'Panadería', 'Copy list': 'Copiar lista', 'List copied': 'Lista copiada', 'Copy is blocked on this device.': 'La copia está bloqueada en este dispositivo.',
  'Only the tracker': 'Solo el seguimiento',
});
const CU_ES = { Spanish: 'Española', Italian: 'Italiana', Chinese: 'China', Japanese: 'Japonesa', Mexican: 'Mexicana', Indian: 'India', Greek: 'Griega', Thai: 'Tailandesa', 'Middle Eastern': 'De Oriente Medio' };
i18nPat(/^([\u{1F1E6}-\u{1F1FF}]{2}|🧆) (.+)$/u, (f, n) => `${f} ${tr(n)}`);
i18nPat(/^Only (\d+) lunch\/dinner recipes? in (.+) fit your diet and allergies, so other cuisines fill in\.$/, (n, c) => `Solo ${n} receta${n === '1' ? '' : 's'} de comida o cena de cocina ${tr(c)} encajan con tu dieta y tus alergias, así que se completan con otras cocinas.`);
i18nPat(/^Few (.+) breakfasts fit your diet, so other breakfasts fill in\.$/, c => `Pocos desayunos de cocina ${tr(c)} encajan con tu dieta, así que se completan con otros desayunos.`);
i18nPat(/^Only (\d+) breakfast recipes? match(?:es)? your filters, so breakfasts will repeat\.$/, n => `Solo ${n} receta${n === '1' ? '' : 's'} de desayuno cumple${n === '1' ? '' : 'n'} tus filtros, así que los desayunos se repetirán.`);
i18nPat(/^Rich in (.+)\. No red meat, refined pasta or added sugar\.$/, a => `Rico en ${a.split(/, (?![^()]*\))/).map(x => tr(x[0].toUpperCase() + x.slice(1)).toLowerCase()).join(', ')}. Sin carne roja, pasta refinada ni azúcar añadido.`);
i18nPat(/^(\d+(?:\.\d+)?) (egg|slice|banana|apple|avocado|tortilla|scoop)(s?)$/, (n, u) => {
  const one = +n === 1, w = { egg: ['huevo', 'huevos'], slice: ['rebanada', 'rebanadas'], banana: ['plátano', 'plátanos'], apple: ['manzana', 'manzanas'], avocado: ['aguacate', 'aguacates'], tortilla: ['tortilla', 'tortillas'], scoop: ['cacito', 'cacitos'] }[u];
  return `${n} ${one ? w[0] : w[1]}`;
});

// ---------- HUD redesign: new looks ----------
i18nAdd({
  Basic: 'Básico', Hologram: 'Holograma', 'Stealth Ops': 'Operación sigilo', 'Red Alert': 'Alerta roja', Synthwave: 'Synthwave', 'Night City': 'Night City',
  'Segment ring': 'Anillo de segmentos', 'Gauge ring': 'Anillo indicador', 'Reticle ring': 'Anillo de mira', 'Gear ring': 'Anillo de engranaje', 'Hex frame': 'Marco hexagonal',
  'Orbit ring': 'Anillo orbital', 'Radar ring': 'Anillo de radar', 'Glitch ring': 'Anillo glitch',
  'Scanlines banner': 'Banner de líneas de escaneo', 'Lattice banner': 'Banner de celosía', 'Circuit board banner': 'Banner de circuito', 'Radar sweep banner': 'Banner de radar',
  'Data stream banner': 'Banner de flujo de datos', 'Hazard banner': 'Banner de peligro',
  'Chamfered panels': 'Paneles biselados', 'Classic panels': 'Paneles clásicos', 'Brackets panels': 'Paneles de corchetes', 'Octagon panels': 'Paneles octogonales', 'Notch panels': 'Paneles con muesca',
  'Double line panels': 'Paneles de doble línea', 'Circuit panels': 'Paneles de circuito', 'Hologram panels': 'Paneles holográficos',
  'Panel styles · {n}/{n}': 'Estilos de panel · {n}/{n}', 'Panel style': 'Estilo de panel', 'New panel style': 'Nuevo estilo de panel',
});
i18nAdd({
  'Interfaces · {n}/{n}': 'Interfaces · {n}/{n}', Interface: 'Interfaz', Try: 'Probar', 'New interface': 'Nueva interfaz',
  'A whole new look for the app: frames, fonts, colours and background. Tap Try to preview one.': 'Un aspecto totalmente nuevo para la app: marcos, letras, colores y fondo. Toca Probar para verlo.',
  'Previewing. Leave the Shop to go back.': 'Vista previa. Sal de la Tienda para volver.',
  'Sci-fi HUD': 'HUD de ciencia ficción', 'Imperial China': 'China imperial', 'Zen Japan': 'Japón zen', 'Fairy Tale Forest': 'Bosque de cuento', 'Medieval Castle': 'Castillo medieval', 'Steampunk Works': 'Taller steampunk',
});
i18nAdd({ 'More info': 'Más info' });
i18nAdd({ Preview: 'Vista previa', End: 'Terminar', 'Preview for one minute. Look around the app!': 'Vista previa durante un minuto. ¡Recorre la app!' });
i18nAdd({ 'Mythical Realm': 'Reino mítico', 'Classical Elegance': 'Elegancia clásica', 'Baroque Palace': 'Palacio barroco', 'Art Deco': 'Art déco', 'Gothic Cathedral': 'Catedral gótica', 'Cosmic Voyage': 'Viaje cósmico',
  Olympus: 'Olimpo', 'Ancient Egypt': 'Antiguo Egipto', 'Viking Saga': 'Saga vikinga', 'Pirate Seas': 'Mares piratas', 'Outrun 80s': 'Outrun años 80', 'Arcade 8-bit': 'Arcade 8 bits' });
i18nAdd({ 'Themes recolour the Sci-fi HUD interface.': 'Los temas cambian los colores de la interfaz HUD de ciencia ficción.', 'uses its own colours.': 'usa sus propios colores.',
  'Theme saved. You will see it with the Sci-fi HUD interface.': 'Tema guardado. Lo verás con la interfaz HUD de ciencia ficción.' });
i18nAdd({ 'Something to claim': 'Hay algo para reclamar' });
i18nAdd({ '1 person': '1 persona', 'light serving': 'ración ligera', 'hearty serving': 'ración abundante', 'standard serving': 'ración normal',
  'One serving per meal falls short of your target.': 'Una ración por comida se queda corta para tu objetivo.', 'Choose {n} meals a day': 'Elige {n} comidas al día', 'to eat enough.': 'para comer suficiente.' });
i18nAdd({ 'How hungry are you?': '¿Cuánta hambre tienes?', 'Not very hungry': 'Poca hambre', 'Normal hunger': 'Normal', Hungry: 'Con hambre', 'Very hungry': 'Mucha hambre',
  '− Less': '− Menos', '+ More': '+ Más', 'Less food': 'Menos comida', 'More food': 'Más comida', 'large serving': 'ración grande' });
i18nAdd({ 'No cardio': 'Sin cardio', 'At the start': 'Al principio', 'At the end': 'Al final', 'Plan without cardio': 'Plan sin cardio', 'Cardio at the start of each workout': 'Cardio al principio de cada entrenamiento', 'Cardio at the end of each workout': 'Cardio al final de cada entrenamiento' });
i18nAdd({ 'Cardio and stretching': 'Cardio y estiramientos', 'Cardio type': 'Tipo de cardio', Type: 'Tipo', 'Cardio minutes': 'Minutos de cardio', 'Stretching minutes': 'Minutos de estiramientos', Any: 'Cualquiera', 'Run / treadmill': 'Correr / cinta', Bike: 'Bici', Rowing: 'Remo', Elliptical: 'Elíptica', Stairs: 'Escaleras', 'Jump rope': 'Comba', Walking: 'Andar', Sprints: 'Sprints', 'Auto ({n})': 'Auto ({n})', '· {n} min · {n} min': '· {n} min · {n} min', 'no cardio': 'sin cardio', '· no cardio · {n} min': '· sin cardio · {n} min', 'Stretches are picked for the muscles each day works.': 'Los estiramientos se eligen según los músculos que trabaja cada día.' });
i18nAdd({ 'Left out': 'Quitado', 'Instead of': 'En vez de', ' · ': ' · ', 'in all your meals': 'en todas tus comidas', 'In all your meals': 'En todas tus comidas', 'Replace with': 'Cambiar por', 'No similar ingredient for your diet': 'No hay un ingrediente parecido para tu dieta', '✕ Leave it out': '✕ Quitarlo', 'Leave it out': 'Quitarlo', 'In all my meals, not just this one': 'En todas mis comidas, no solo en esta', 'Ingredient left out': 'Ingrediente quitado', Undo: 'Deshacer', Change: 'Cambiar' });
i18nAdd({ 'Each workout burns about {n} kcal ({n} min of strength, {n} min of cardio, {n} min of stretching), already counted in your daily calories.': 'Cada entrenamiento quema unas {n} kcal ({n} min de fuerza, {n} min de cardio, {n} min de estiramientos), ya incluidas en tus calorías diarias.', 'Each workout burns about {n} kcal ({n} min of strength, {n} min of stretching), already counted in your daily calories.': 'Cada entrenamiento quema unas {n} kcal ({n} min de fuerza, {n} min de estiramientos), ya incluidas en tus calorías diarias.', 'Training snack': 'Snack de entrenamiento', 'Extra snacks and slightly bigger servings were added so your meals cover the energy your training needs.': 'Se han añadido snacks y raciones algo mayores para que tus comidas cubran la energía que necesita tu entrenamiento.' });
i18nAdd({ 'What can come out?': '¿Qué puede salir?', 'Any look from the shop can drop, interfaces included. The pricier it is, the rarer, and better chests give better odds. You never get something you already own.': 'Puede salir cualquier aspecto de la tienda, interfaces incluidas. Cuanto más caro, más raro, y los mejores cofres dan mejores probabilidades. Nunca te sale algo que ya tienes.', '{n}–{n} coins': '{n}–{n} monedas', '{n}–{n} XP': '{n}–{n} XP', 'A shop item': 'Un objeto de la tienda', 'Rarest:': 'El más raro:', '{n} coins': '{n} monedas', 'Got it': 'Entendido', 'Jackpot! New interface': '¡Premio gordo! Nueva interfaz', 'Worth {n} coins': 'Vale {n} monedas', 'New theme': 'Nuevo tema', 'New ring': 'Nuevo anillo', 'New banner': 'Nuevo banner', 'New profile picture': 'Nueva foto de perfil' });
i18nAdd({ 'Buy this interface?': '¿Comprar esta interfaz?', 'Buy this theme?': '¿Comprar este tema?', 'Buy this ring?': '¿Comprar este anillo?', 'Buy this banner?': '¿Comprar este banner?', 'Buy this profile picture?': '¿Comprar esta foto de perfil?', 'Buy this panel style?': '¿Comprar este estilo de panel?', 'Buy this?': '¿Comprar esto?',
  'Sell this interface?': '¿Vender esta interfaz?', 'Sell this theme?': '¿Vender este tema?', 'Sell this ring?': '¿Vender este anillo?', 'Sell this banner?': '¿Vender este banner?', 'Sell this profile picture?': '¿Vender esta foto de perfil?', 'Sell this panel style?': '¿Vender este estilo de panel?',
  Price: 'Precio', 'You get': 'Recibes', 'Your coins after': 'Tus monedas después', Cancel: 'Cancelar', Buy: 'Comprar', Sell: 'Vender', 'Sell · {n}': 'Vender · {n}', 'Sold for {n} coins': 'Vendido por {n} monedas',
  'Coins buy looks and boosts, and looks you own sell back for 80% of their price. Earn them from workouts, quests, chests and the daily spin.': 'Las monedas compran aspectos y potenciadores, y los aspectos que tienes se venden por el 80% de su precio. Consíguelas con entrenamientos, misiones, cofres y la ruleta diaria. ' });
i18nAdd({ 'Time today': 'Tiempo hoy', 'Back to your usual time': 'Vuelves a tu tiempo habitual', "Today's workout fitted to {n} min": 'Entrenamiento de hoy ajustado a {n} min', "Today's workout fitted to {n} h": 'Entrenamiento de hoy ajustado a {n} h', "Today's workout fitted to {n} h {n}": 'Entrenamiento de hoy ajustado a {n} h {n}',
  'Next workout · ~{n} min': 'Próximo entrenamiento · ~{n} min', 'Training options': 'Opciones de entrenamiento', '· {n} days · {n} min': '· {n} días · {n} min', '· {n} days · {n} h': '· {n} días · {n} h', '· {n} days · {n} h {n}': '· {n} días · {n} h {n}',
  'Extra work on': 'Trabajo extra en', 'Save and rebuild plan': 'Guardar y rehacer el plan', 'Tap any option to change it. Your history, levels and rewards stay.': 'Toca cualquier opción para cambiarla. Tu historial, niveles y recompensas se mantienen.',
  'Plan rebuilt with your new options': 'Plan rehecho con tus nuevas opciones', 'Edit body data': 'Editar datos corporales' });
i18nAdd({ Chamfered: 'Biselado', Classic: 'Clásico', Brackets: 'Corchetes', Octagon: 'Octógono', Notch: 'Muesca', 'Double line': 'Doble línea', Circuit: 'Circuito' });
i18nPat(/^You are using it, so you will switch back to (.+)\.$/, a => `Lo llevas puesto, así que volverás a ${tr(a)}.`);
i18nAdd({ 'Your look': 'Tu aspecto', 'Change · {n}': 'Cambiar · {n}', '{n} owned · tap one to use it': '{n} en propiedad · toca uno para usarlo' });
i18nAdd({ 'New bet': 'Nueva apuesta' });
i18nAdd({ Demigod: 'Semidiós', Immortal: 'Inmortal', Olympian: 'Olímpico', 'Triple spin': 'Triple tirada', 'Three free daily spins': 'Tres tiradas gratis al día', 'Three free spins a day': 'Tres tiradas gratis al día',
  'Coin Boost III': 'Impulso de monedas III', '+{n}% coins from every workout': '+{n}% de monedas en cada entrenamiento', 'XP Boost IV': 'Impulso de XP IV', '+{n}% XP from every workout': '+{n}% de XP en cada entrenamiento',
  'Iron Labyrinth': 'Laberinto de hierro', 'Abyss of Abs': 'Abismo abdominal', 'Valkyrie Sprint': 'Carrera de la valquiria', 'Anvil of Arms': 'Yunque de brazos', 'Hydra Supersets': 'Superseries de la hidra',
  "Dragon's Den": 'Guarida del dragón', 'Colossus Climb': 'Escalada del coloso', Pantheon: 'Panteón',
  'Eight heavy compound lifts around the whole body, {n} × {n}.': 'Ocho ejercicios compuestos pesados para todo el cuerpo, {n} × {n}.',
  'Eight core exercises, {n} × {n}, short rests. The deep end.': 'Ocho ejercicios de core, {n} × {n}, descansos cortos. Lo más profundo.',
  'Ten fast bodyweight moves, {n} s each, three rounds. No equipment.': 'Diez movimientos rápidos con tu peso, {n} s cada uno, tres rondas. Sin material.',
  'Biceps, triceps and forearms, five sets each, forged slowly.': 'Bíceps, tríceps y antebrazos, cinco series cada uno, forjados despacio.',
  'Twelve exercises back to back, {n} × {n}, twenty seconds of rest.': 'Doce ejercicios seguidos, {n} × {n}, veinte segundos de descanso.',
  'Six heavy lifts, {n} × {n}, three-minute rests. Quadruple-ish XP.': 'Seis levantamientos pesados, {n} × {n}, descansos de tres minutos. Casi el cuádruple de XP.',
  'Ten exercises for legs and back, {n} × {n}. The mountain does not move; you do.': 'Diez ejercicios de pierna y espalda, {n} × {n}. La montaña no se mueve; tú sí.',
  'Sixteen exercises, every muscle, {n} × {n}. The last trial. Five times the XP.': 'Dieciséis ejercicios, todos los músculos, {n} × {n}. La última prueba. Cinco veces la XP.' });
i18nAdd({ 'Up to {n} coins on this bet.': 'Hasta {n} monedas en esta apuesta.', 'Level rewards': 'Premios de nivel',
  'Your levels now give a silver chest each and a golden one every 5th. Here are the ones you had earned.': 'Ahora cada nivel da un cofre de plata y cada 5 niveles también uno dorado. Aquí tienes los que ya te habías ganado.',
  '{n} chests added to your loot': '{n} cofres añadidos a tu botín',
  'Odds come from your last four weeks: goals you rarely reach pay more, easy ones pay {n} (you only get your coins back), training once a week or month never pays, and a month pays less than {n} days. Stakes go from {n} coins up to {n} on a {n}-day bet and {n} on a one-month bet, with up to {n} open bets. Only game coins, never real money.': 'Las cuotas salen de tus últimas cuatro semanas: lo que consigues pocas veces paga más, lo fácil paga {n} (solo recuperas tus monedas), entrenar una vez a la semana o al mes nunca paga, y un mes paga menos que {n} días. Se apuesta desde {n} monedas hasta {n} en una apuesta de {n} días y {n} en una de un mes, con hasta {n} apuestas abiertas. Solo monedas del juego, nunca dinero real.' });
i18nAdd({ '{n}–{n} coins': '{n}–{n} monedas', 'Coins to stake': 'Monedas a apostar' });
i18nAdd({ 'Coins or a small look': 'Monedas o un aspecto pequeño' });
i18nAdd({ 'Badge unlocked · {n} coins': 'Insignia desbloqueada · {n} monedas', 'Bonus chest ·': 'Cofre extra ·', 'Daily check-in · day {n} ·': 'Check-in diario · día {n} ·', 'Claim loot ·': 'Reclamar botín ·',
  'Match reward: {n} coins': 'Premio del partido: {n} monedas', 'coins each, bonus chest for all of them': 'monedas cada una, cofre extra por completarlas todas', coins: 'monedas',
  '{n} coins + a chest': '{n} monedas + un cofre', 'coins, silver chest on day {n}': 'monedas, cofre de plata el día {n}', 'coins or a chest': 'monedas o un cofre',
  'coins, a silver chest (golden every {n}th), meals, workouts, perks and level-only looks': 'monedas, un cofre de plata (dorado cada {n}), comidas, entrenamientos, mejoras y aspectos exclusivos de nivel' });
i18nPat(/^Badge unlocked: (.+) \((\+?\d+) coins\)$/, (a, b) => `Insignia desbloqueada: ${tr(a)} (${b} monedas)`);
i18nAdd({ 'Level rewards': 'Premios de nivel', "Only earned by levelling up: they can't be bought or found in chests.": 'Solo se consiguen subiendo de nivel: no se pueden comprar ni salen en cofres.',
  'Bronze laurel': 'Laurel de bronce', "Champion's banner": 'Estandarte del campeón', 'Laurel crown': 'Corona de laurel', 'Silver laurel': 'Laurel de plata', 'Hall of Fame': 'Salón de la fama', Temple: 'Templo',
  'Golden laurel': 'Laurel de oro', Champion: 'Campeón', Constellation: 'Constelación', Treasure: 'Tesoro', 'Platinum halo': 'Halo de platino', Borealis: 'Boreal', Olympus: 'Olimpo',
  'Phoenix ring': 'Anillo de fénix', Infinity: 'Infinito', 'Olympian aura': 'Aura olímpica', '{n} · level {n}': '{n} · nivel {n}' });
i18nPat(/^(.+) · level (\d+)$/, (a, b) => `${tr(a)} · nivel ${b}`);
i18nAdd({ 'level {n}': 'nivel {n}' });
i18nAdd({ '{n} × Silver chest': '{n} × Cofre de plata', '{n} × Golden chest': '{n} × Cofre dorado', 'Open it in Loot': 'Ábrelo en Botín' });
i18nAdd({ 'Ember sparks': 'Chispas de brasa', 'Frost crown': 'Corona de escarcha', 'Arcane runes': 'Runas arcanas', 'Storm caller': 'Invocador de tormentas', 'Void rift': 'Grieta del vacío', 'Celestial halo': 'Halo celestial' });
i18nAdd({ 'Shop opened': 'Tienda abierta', Shop: 'Tienda', 'open in the Shop': 'a la venta en la Tienda', 'Profile pictures': 'Fotos de perfil', Banners: 'Banners', Rings: 'Anillos', 'App themes': 'Temas', 'Panel styles': 'Estilos de panel', Interfaces: 'Interfaces',
  'You can buy these from level {n}. Until then they can still come out of chests.': 'Podrás comprarlos desde el nivel {n}. Mientras tanto pueden salir en los cofres.' });
i18nPat(/^(.+) can be bought from level (\d+)\.$/, (a, b) => `${tr(a)} se pueden comprar desde el nivel ${b}.`);
i18nAdd({ 'End all': 'Terminar todas', 'Try 1 min': 'Probar 1 min', 'Trying · end': 'Probando · terminar' });
i18nAdd({ Try: 'Probar', Trying: 'Probando', 'Tap to try it for a minute': 'Tócalo para probarlo un minuto' });

// settings, hero and the simpler screens
i18nAdd({
  Settings: 'Ajustes', Profile: 'Perfil', 'Body and training plan': 'Cuerpo y plan de entrenamiento', 'Sound effects': 'Efectos de sonido', On: 'Sí', Off: 'No', App: 'App',
  'Your data': 'Tus datos', Export: 'Exportar', 'Delete everything': 'Borrar todo', '{n} years': '{n} años', 'BMI {n}': 'IMC {n}', 'kg lifted': 'kg levantados', Adjust: 'Ajustar',
  'Exercise library': 'Biblioteca de ejercicios', Locked: 'Bloqueadas', 'More options': 'Más opciones', 'How it works': 'Cómo funciona', 'Your first dungeon opens at level 2.': 'Tu primera mazmorra se abre en el nivel 2.',
  'FitQuest version {n}': 'FitQuest versión {n}', 'free, no ads, no accounts: everything stays on this device. Estimates are guidance, not medical advice. Exercise photos: free-exercise-db.': 'gratis, sin anuncios ni cuentas: todo se queda en este dispositivo. Las estimaciones son orientativas, no consejo médico. Fotos de ejercicios: free-exercise-db.',
});
i18nAdd({
  Bronze: 'Bronce', Silver: 'Plata', Gold: 'Oro', Platinum: 'Platino', Exercises: 'Ejercicios', 'Each exercise': 'Cada ejercicio', 'up to {n} XP by its medal (stretches up to {n})': 'hasta {n} XP según su medalla (estiramientos hasta {n})',
  '{n} XP, + chest for dungeons': '{n} XP, + cofre en mazmorras', '{n} XP each ({n} with a level perk)': '{n} XP cada uno ({n} con mejora de nivel)', 'New personal records are worth {n} XP': 'Los nuevos récords personales valen {n} XP',
  'Discard workout': 'Descartar entrenamiento', 'Leave the workout for now': 'Salir del entrenamiento por ahora', 'Finish or discard the workout in progress first': 'Termina o descarta primero el entrenamiento en curso',
  'Timed set done': 'Serie cronometrada hecha', Stop: 'Parar', 'Set {n}': 'Serie {n}',
});
i18nPat(/^(\d+) × (Bronze|Silver|Gold|Platinum)$/, (n, t) => `${n} × ${tr(t)}`);
i18nAdd({ Week: 'Semana', '{n} days': '{n} días' });
i18nAdd({ "Servings are {n}% smaller because you often aren't very hungry.": 'Las raciones son un {n}% más pequeñas porque a menudo no tienes mucha hambre.', 'Servings are {n}% bigger because you are often hungry.': 'Las raciones son un {n}% más grandes porque a menudo tienes hambre.' });
i18nAdd({ '{n} hits left': 'Quedan {n} golpes', '{n} hit left': 'Queda {n} golpe', Shop: 'Tienda', Overview: 'Resumen', Levels: 'Niveles', Badges: 'Insignias', Train: 'Entrenar' });
i18nAdd({ 'Levels {n}–{n}': 'Niveles {n}–{n}' });
i18nAdd({ 'in the Shop': 'en la Tienda' });
i18nAdd({ Update: 'Actualizar', Check: 'Buscar', 'You have the latest version': 'Tienes la última versión', 'No connection': 'Sin conexión', 'App {n}': 'App {n}' });
i18nPat(/^(FitQuest [\d.]+) is ready$/, n => `${n} está lista`);
i18nAdd({ 'a silver chest (golden every {n}th), meals, workouts, perks and level-only looks': 'un cofre de plata (dorado cada {n}), comidas, entrenamientos, mejoras y aspectos exclusivos de nivel', 'titles for your profile': 'títulos para tu perfil', 'Badge unlocked': 'Insignia desbloqueada' });
i18nPat(/^Badge unlocked: (.+)$/, n => `Insignia desbloqueada: ${tr(n)}`);
i18nAdd({ "Today's deals": 'Ofertas de hoy', Boosts: 'Potenciadores', Common: 'Común', Rare: 'Rara', Epic: 'Épica', Legendary: 'Legendaria', 'Opens at level {n}': 'Se abre en el nivel {n}', 'Try any of them for a minute meanwhile.': 'Mientras, puedes probar cualquiera durante un minuto.', '{n}h {n}m': '{n} h {n} min' });
i18nAdd({ '{n} planned': '{n} planificadas', 'New week': 'Nueva semana', Preferences: 'Preferencias', '{n} / {n} kcal': '{n} / {n} kcal' });
i18nAdd({ Chest: 'Pecho', Back: 'Atrás', Shoulders: 'Hombros', Arms: 'Brazos', Legs: 'Piernas', Glutes: 'Glúteos', Core: 'Core', Neck: 'Cuello', Exercises: 'Ejercicios', 'Search {n} exercises': 'Buscar entre {n} ejercicios', 'All equipment': 'Todo el material' });
i18nAdd({ 'Show the move': 'Ver el movimiento' });
i18nAdd({ 'Swap for a similar exercise': 'Cambiar por un ejercicio similar', 'Similar exercises': 'Ejercicios similares' });
i18nAdd({ 'Workout playlist': 'Lista para entrenar', 'Making your playlist…': 'Creando tu lista…', 'New playlist': 'Nueva lista', 'Make a {n} min playlist': 'Crear una lista de {n} min',
  'Spotify did not find enough songs. Try another genre.': 'Spotify no encontró suficientes canciones. Prueba otro género.' });
i18nAdd({ 'Link my Spotify': 'Vincular mi Spotify', 'New list': 'Nueva lista', 'Make a {n} min list': 'Crear una lista de {n} min',
  'Open': 'Abre', 'and sign in.': 'e inicia sesión.', 'Create app: any name, choose Web API, and add this Redirect URI:': 'Crea una app (cualquier nombre), elige Web API y añade esta Redirect URI:',
  'Copy its Client ID and paste it here.': 'Copia su Client ID y pégalo aquí.', 'Spotify asks for Premium for this.': 'Spotify pide Premium para esto.' });
i18nAdd({ 'My equipment': 'Mi material', 'Discard workout': 'Abandonar entrenamiento' });
