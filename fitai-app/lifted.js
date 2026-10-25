'use strict';
// After a workout: what the kilos you lifted (weight × reps of every set) add up to, as a thing of about that weight
// from the world of your interface. Weights are rough real-world figures.
// [kg, emoji, English, Spanish]
const LIFTED = {
  clean: [[25, '🧳', 'a full suitcase', 'una maleta llena'], [80, '🛋️', 'an armchair', 'un sillón'], [200, '🎹', 'an upright piano', 'un piano vertical'], [450, '🐄', 'a cow', 'una vaca'],
    [1000, '🚗', 'a small car', 'un coche pequeño'], [2500, '🚐', 'a van', 'una furgoneta'], [5000, '🐘', 'an elephant', 'un elefante'], [12000, '🚌', 'a city bus', 'un autobús'], [40000, '🚛', 'a loaded lorry', 'un camión cargado'], [120000, '🚆', 'a train', 'un tren']],
  hud: [[30, '🤖', 'a service drone', 'un dron de servicio'], [100, '🦾', 'a robot arm', 'un brazo robótico'], [300, '🛰️', 'a satellite', 'un satélite'], [700, '🛸', 'a hover bike', 'una moto flotante'],
    [1500, '🤖', 'a combat mech', 'un mecha de combate'], [4000, '🚀', 'a landing pod', 'una cápsula de aterrizaje'], [10000, '🛩️', 'a star fighter', 'un caza estelar'], [30000, '🛰️', 'a space station module', 'un módulo de estación espacial'], [150000, '🚀', 'a starship', 'una nave estelar']],
  chinese: [[20, '🏮', 'a stone lantern', 'un farol de piedra'], [60, '🫖', 'a bronze tea urn', 'una tetera de bronce'], [150, '🔔', 'a temple bell', 'una campana de templo'], [400, '🦁', 'a guardian lion statue', 'un león guardián de piedra'],
    [1000, '🐉', 'a dragon dance costume and its dancers', 'un dragón de danza con sus bailarines'], [2500, '🛕', 'a pagoda roof', 'un tejado de pagoda'], [6000, '🐘', 'an imperial elephant', 'un elefante imperial'], [15000, '🧱', 'a stretch of the Great Wall', 'un tramo de la Gran Muralla'], [100000, '🚢', 'an imperial treasure ship', 'un barco del tesoro imperial']],
  japanese: [[20, '🪨', 'a garden stone', 'una piedra de jardín zen'], [70, '🥁', 'a taiko drum', 'un tambor taiko'], [150, '🤼', 'a sumo wrestler', 'un luchador de sumo'], [400, '🏮', 'a stone tōrō lantern', 'una linterna tōrō de piedra'],
    [1000, '⛩️', 'a torii gate', 'una puerta torii'], [2500, '🔔', 'a great temple bell', 'una gran campana de templo'], [8000, '🏯', 'a castle gate', 'la puerta de un castillo'], [20000, '🗿', 'a giant Buddha statue', 'un gran Buda de bronce'], [80000, '🏯', 'a castle keep', 'el torreón de un castillo']],
  fairy: [[15, '🍄', 'a giant mushroom', 'una seta gigante'], [50, '🧚', 'a fairy carriage', 'una carroza de hada'], [120, '🪵', 'an enchanted log', 'un tronco encantado'], [300, '🦄', 'a unicorn', 'un unicornio'],
    [700, '🐻', 'a forest bear', 'un oso del bosque'], [1500, '🎃', 'a pumpkin coach', 'una carroza de calabaza'], [4000, '🌳', 'an ancient oak', 'un roble milenario'], [10000, '🏡', 'a gingerbread house', 'una casita de jengibre'], [60000, '🏰', 'a fairy-tale castle', 'un castillo de cuento']],
  medieval: [[25, '🛡️', 'a suit of armour', 'una armadura'], [90, '⚒️', 'a blacksmith anvil', 'un yunque de herrero'], [250, '🍺', 'a barrel of ale', 'un barril de cerveza'], [600, '🐴', 'a war horse', 'un caballo de guerra'],
    [1500, '🏹', 'a siege catapult', 'una catapulta de asedio'], [3500, '🚪', 'a castle drawbridge', 'un puente levadizo'], [8000, '🔔', 'a cathedral bell', 'la campana de una catedral'], [20000, '🏰', 'a castle tower', 'una torre del castillo'], [90000, '🏰', 'a whole keep', 'un torreón entero']],
  steampunk: [[20, '⚙️', 'a brass gear', 'un engranaje de latón'], [80, '🕰️', 'a grandfather clock', 'un reloj de pie'], [200, '🧰', 'a steam boiler', 'una caldera de vapor'], [500, '🚲', 'a steam velocipede', 'un velocípedo de vapor'],
    [1200, '🛠️', 'a printing press', 'una imprenta'], [3000, '🎈', 'an airship gondola', 'la góndola de un dirigible'], [8000, '🚂', 'a steam engine', 'una locomotora de vapor'], [25000, '🏭', 'a factory boiler', 'la caldera de una fábrica'], [120000, '🎈', 'a steam airship', 'un dirigible a vapor']],
  greek: [[20, '🏺', 'an amphora of wine', 'un ánfora de vino'], [75, '🛡️', "a hoplite's armour", 'la armadura de un hoplita'], [200, '🗿', 'a marble bust', 'un busto de mármol'], [500, '🐂', 'a Cretan bull', 'un toro de Creta'],
    [1200, '🏛️', 'a marble column', 'una columna de mármol'], [3000, '⛵', 'a trireme', 'un trirreme'], [8000, '🗿', "a titan's statue", 'la estatua de un titán'], [20000, '🏛️', 'a temple pediment', 'el frontón de un templo'], [90000, '🏛️', 'the Parthenon roof', 'el tejado del Partenón']],
  egypt: [[20, '🏺', 'a canopic jar set', 'unos vasos canopos'], [80, '⚱️', 'a sarcophagus lid', 'la tapa de un sarcófago'], [250, '🐫', 'a loaded camel', 'un camello cargado'], [600, '🐊', 'a Nile crocodile', 'un cocodrilo del Nilo'],
    [1500, '🧱', 'a pyramid block', 'un bloque de la pirámide'], [4000, '⛵', 'a Nile barge', 'una barcaza del Nilo'], [10000, '🗿', 'a pharaoh statue', 'la estatua de un faraón'], [30000, '🗼', 'an obelisk', 'un obelisco'], [100000, '🗿', 'the Sphinx head', 'la cabeza de la Esfinge']],
  viking: [[25, '🪓', 'a pile of battle axes', 'un montón de hachas de guerra'], [90, '🛡️', 'a wall of shields', 'un muro de escudos'], [250, '🍺', 'a mead barrel', 'un barril de hidromiel'], [700, '🐻', 'a cave bear', 'un oso de las cavernas'],
    [1500, '🪨', 'a rune stone', 'una piedra rúnica'], [4000, '⛵', 'a longship', 'un drakkar'], [10000, '🐋', 'a whale', 'una ballena'], [25000, '🏔️', 'a glacier boulder', 'una roca de glaciar'], [80000, '🧊', 'an iceberg', 'un iceberg']],
  pirate: [[25, '💰', 'a treasure chest', 'un cofre del tesoro'], [90, '💣', 'a cannon ball pile', 'una pila de balas de cañón'], [250, '🍺', 'a rum barrel', 'un barril de ron'], [600, '⚓', 'a ship anchor', 'un ancla'],
    [1500, '💥', 'a ship cannon', 'un cañón de barco'], [4000, '🦈', 'a great white shark', 'un tiburón blanco'], [10000, '🐙', 'a kraken', 'un kraken'], [30000, '🏴‍☠️', 'a pirate galleon', 'un galeón pirata'], [150000, '🚢', 'a ship of the line', 'un navío de línea']],
  outrun: [[20, '📻', 'a boombox', 'un radiocasete'], [70, '🕹️', 'an arcade cabinet', 'una máquina recreativa'], [200, '🛵', 'a scooter', 'una vespa'], [450, '🏍️', 'a superbike', 'una superbike'],
    [1300, '🏎️', 'a sports car', 'un deportivo'], [3000, '🚙', 'a muscle truck', 'una pick-up'], [8000, '🚌', 'a tour bus', 'un autobús de gira'], [25000, '🎡', 'a neon Ferris wheel', 'una noria de neón'], [100000, '🚀', 'a space shuttle', 'un transbordador espacial']],
  arcade: [[20, '🍄', 'a power-up mushroom', 'un champiñón de poder'], [80, '👾', 'a space invader', 'un invasor espacial'], [200, '🧱', 'a brick block wall', 'un muro de bloques'], [500, '🦍', 'a barrel-throwing ape', 'un gorila lanzabarriles'],
    [1200, '🕹️', 'a row of arcade cabinets', 'una fila de recreativas'], [3000, '🐉', 'a pixel dragon', 'un dragón pixelado'], [8000, '🏰', 'a final boss castle', 'el castillo del jefe final'], [25000, '🛸', 'a mothership', 'una nave nodriza'], [100000, '🪐', 'a pixel planet', 'un planeta pixelado']],
  classical: [[25, '🎻', 'a cello in its case', 'un violonchelo en su estuche'], [90, '🍷', 'a wine cellar rack', 'un botellero de bodega'], [250, '🎹', 'a grand piano', 'un piano de cola'], [600, '🐎', 'a carriage horse', 'un caballo de carruaje'],
    [1500, '🗽', 'a marble statue', 'una estatua de mármol'], [3500, '🎼', 'a pipe organ', 'un órgano de tubos'], [9000, '🏛️', 'an opera chandelier', 'la lámpara de una ópera'], [25000, '⛲', 'a palace fountain', 'una fuente de palacio'], [100000, '🏛️', 'an opera house dome', 'la cúpula de un teatro de ópera']],
  artdeco: [[25, '🎷', 'a saxophone section', 'una sección de saxofones'], [90, '📞', 'a switchboard', 'una centralita'], [250, '🍸', 'a cocktail bar', 'una barra de cóctel'], [600, '🎬', 'a cinema projector', 'un proyector de cine'],
    [1600, '🚘', 'a 1920s limousine', 'una limusina de los años 20'], [4000, '🚃', 'a tram car', 'un tranvía'], [10000, '✈️', 'a propeller plane', 'un avión de hélices'], [30000, '🏙️', 'a skyscraper spire', 'la aguja de un rascacielos'], [120000, '🚢', 'an ocean liner funnel', 'la chimenea de un trasatlántico']],
  gothic: [[20, '🕯️', 'an iron candelabrum', 'un candelabro de hierro'], [80, '📚', 'a library of grimoires', 'una biblioteca de grimorios'], [250, '⚰️', 'a stone coffin', 'un ataúd de piedra'], [600, '🦇', 'a gargoyle', 'una gárgola'],
    [1500, '🪟', 'a rose window', 'un rosetón'], [4000, '🔔', 'a cathedral bell', 'una campana de catedral'], [10000, '⛪', 'a flying buttress', 'un arbotante'], [30000, '🗼', 'a bell tower', 'un campanario'], [120000, '⛪', 'a cathedral spire', 'la aguja de una catedral']],
  baroque: [[25, '🪞', 'a gilded mirror', 'un espejo dorado'], [90, '🪑', 'a royal throne', 'un trono real'], [250, '💎', 'a crystal chandelier', 'una lámpara de araña'], [600, '🎹', 'a harpsichord orchestra', 'una orquesta de clavecines'],
    [1500, '🐎', 'a royal carriage', 'un carruaje real'], [4000, '⛲', 'a marble fountain', 'una fuente de mármol'], [10000, '🗿', 'an equestrian statue', 'una estatua ecuestre'], [30000, '🏰', 'a palace wing', 'el ala de un palacio'], [100000, '🏰', 'a palace dome', 'la cúpula de un palacio']],
  mythical: [[20, '🥚', 'a dragon egg', 'un huevo de dragón'], [80, '🦅', 'a griffin', 'un grifo'], [250, '🐺', 'a dire wolf', 'un lobo huargo'], [600, '🦄', 'a pegasus', 'un pegaso'],
    [1500, '🗿', 'a stone golem', 'un gólem de piedra'], [4000, '🧌', 'a troll', 'un trol'], [10000, '🐉', 'a dragon', 'un dragón'], [30000, '🐍', 'a sea serpent', 'una serpiente marina'], [120000, '🐉', 'an elder wyrm', 'un dragón ancestral']],
  cosmic: [[20, '☄️', 'a meteorite', 'un meteorito'], [80, '🧑‍🚀', 'an astronaut in a suit', 'un astronauta con traje'], [250, '🛰️', 'a probe', 'una sonda'], [700, '🚙', 'a moon rover', 'un rover lunar'],
    [2000, '🛸', 'a lander', 'un módulo de aterrizaje'], [6000, '🚀', 'a rocket stage', 'una etapa de cohete'], [15000, '🛰️', 'a space telescope', 'un telescopio espacial'], [40000, '🪐', 'a station module', 'un módulo de estación orbital'], [400000, '🛰️', 'a space station', 'una estación espacial']],
};
// the one thing closest in weight (on a ratio scale)
function liftedThing(kg, skin) {
  const list = LIFTED[skin] || LIFTED.clean;
  if (!(kg > 0)) return null;
  let best = list[0];
  for (const it of list) if (Math.abs(Math.log(kg / it[0])) < Math.abs(Math.log(kg / best[0]))) best = it;
  return { emo: best[1], name: LANG === 'es' ? best[3] : best[2], kg: best[0] };
}
// after each workout, and for the week on the profile (week: true)
function liftedCard(kg, week) {
  const t = liftedThing(kg, document.documentElement.dataset.skin || 'clean');
  if (!t) return '';
  return `<div class="card lifted"><span class="lfe">${t.emo}</span><div class="grow"><div class="mut">${week ? tr('This week') + ' · ' : ''}${fmtN(Math.round(kg))} kg lifted</div>
    <b translate="no">${LANG === 'es' ? `Como levantar ${t.name}` : `Like lifting ${t.name}`}</b></div></div>`;
}
if (typeof i18nAdd === 'function') i18nAdd({ '{n} kg lifted': '{n} kg levantados' });
