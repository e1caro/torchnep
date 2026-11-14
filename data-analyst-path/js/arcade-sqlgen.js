/* SQL blocks: endless puzzles for each of the 16 levels (logic only, tested in Node against the real databases).
 * Each level has a few templates; a template picks a table, columns and values with a seeded random generator and
 * returns the tiles of a reference query plus tempting wrong tiles. Some puzzles start as a broken query to fix.
 * Answers are judged by running them, so any equivalent query passes (see A.blockCheck). */
(function () {
  'use strict';
  var DA = (window.DA = window.DA || {});
  var Q = (DA.sqlgen = {});

  function rng(seed) { return DA.gen.util.rng(seed >>> 0); }
  function pick(r, a) { return a[Math.floor(r() * a.length)]; }
  function shuffle(r, a) { a = a.slice(); for (var i = a.length - 1; i > 0; i--) { var j = Math.floor(r() * (i + 1)), t = a[i]; a[i] = a[j]; a[j] = t; } return a; }
  function q(v) { return typeof v === 'number' ? String(v) : "'" + v + "'"; }
  function cap(s) { return s.charAt(0).toUpperCase() + s.slice(1); }

  // Spanish (Spain): every question and explanation is written in both languages; L() picks the one in use. The
  // Spanish words for the tables and columns carry their gender for the articles. Random draws are the same in
  // both languages, so a seed gives the same puzzle.
  function L(en, es) { return DA.L ? DA.L(en, es) : en; }
  var ESW = { products: ['producto', 'productos', 0], stores: ['tienda', 'tiendas', 1], customers: ['cliente', 'clientes', 0], orders: ['pedido', 'pedidos', 0],
    participants: ['participante', 'participantes', 0], users: ['usuario', 'usuarios', 0], members: ['socio', 'socios', 0], agents: ['agente', 'agentes', 0], sessions: ['sesión', 'sesiones', 1] };
  var ESS = { price: ['precio', 0], 'opening year': ['año de apertura', 0], category: ['categoría', 1], city: ['ciudad', 1], segment: ['segmento', 0], channel: ['canal', 0],
    age: ['edad', 1], site: ['centro', 0], group: ['grupo', 0], sex: ['sexo', 0], platform: ['plataforma', 1], 'referral source': ['origen de registro', 0],
    'monthly price': ['precio mensual', 0], plan: ['plan', 0], team: ['equipo', 0], week: ['semana', 1] };
  function eOne(e) { return ESW[e.t][0]; }
  function eMany(e) { return ESW[e.t][1]; }
  function eF(e) { return ESW[e.t][2]; }
  function los(e) { return eF(e) ? 'las' : 'los'; }
  function todos(e) { return eF(e) ? 'todas las' : 'todos los'; }
  function cuantos(e) { return eF(e) ? 'Cuántas' : 'Cuántos'; }
  function sy(x) { return ESS[x.say][0]; }
  function sF(x) { return ESS[x.say][1]; }
  function elx(x) { return sF(x) ? 'la' : 'el'; }
  function unx(x) { return sF(x) ? 'una' : 'un'; }
  function ag(x, m, f) { return sF(x) ? f : m; }
  var MES = { '01': 'enero', '02': 'febrero', '03': 'marzo', '04': 'abril', '05': 'mayo', '06': 'junio', '07': 'julio', '08': 'agosto', '09': 'septiembre', '10': 'octubre', '11': 'noviembre' };

  var CITIES = ['Berlin', 'Lisbon', 'London', 'Madrid', 'Paris'];
  var MONTHS = [['01', 'January'], ['02', 'February'], ['03', 'March'], ['04', 'April'], ['05', 'May'], ['06', 'June'], ['07', 'July'], ['08', 'August'], ['09', 'September'], ['10', 'October'], ['11', 'November']];

  // Tables the simple templates can use: a label column, numeric columns with safe thresholds, category columns.
  var ENT = [
    { ds: 'retail', t: 'products', one: 'product', many: 'products', n: 14, label: 'name', text: true,
      nums: [{ c: 'price', say: 'price', th: [2.5, 3, 3.5, 4] }], cats: [{ c: 'category', say: 'category', vals: ['Coffee', 'Tea', 'Bakery', 'Food'] }],
      letters: ['C', 'S', 'B', 'A', 'M'] },
    { ds: 'retail', t: 'stores', one: 'store', many: 'stores', n: 5, label: 'city', text: true, nums: [{ c: 'opened_year', say: 'opening year', th: [2019, 2020, 2021] }], cats: [], letters: ['L', 'M', 'B', 'P'] },
    { ds: 'retail', t: 'customers', one: 'customer', many: 'customers', n: 400, label: 'customer_id', nums: [],
      cats: [{ c: 'city', say: 'city', vals: CITIES }, { c: 'segment', say: 'segment', vals: ['student', 'professional', 'retired'] }] },
    { ds: 'retail', t: 'orders', one: 'order', many: 'orders', n: 3200, label: 'order_id', nums: [], cats: [{ c: 'channel', say: 'channel', vals: ['in_store', 'pickup', 'delivery'] }] },
    { ds: 'lab', t: 'participants', one: 'participant', many: 'participants', n: 60, label: 'participant_id',
      nums: [{ c: 'age', say: 'age', th: [25, 30, 40, 50] }],
      cats: [{ c: 'site', say: 'site', vals: ['North', 'South'] }, { c: 'group_name', say: 'group', vals: ['control', 'intervention'] }, { c: 'sex', say: 'sex', vals: ['F', 'M'] }] },
    { ds: 'app', t: 'users', one: 'user', many: 'users', n: 1200, label: 'user_id', nums: [],
      cats: [{ c: 'platform', say: 'platform', vals: ['ios', 'android', 'web'] }, { c: 'referral', say: 'referral source', vals: ['organic', 'friend', 'ads'] }, { c: 'city', say: 'city', vals: CITIES }] },
    { ds: 'app', t: 'members', one: 'member', many: 'members', n: 436, label: 'member_id', nums: [{ c: 'monthly_price', say: 'monthly price', th: [4.99, 8.99] }],
      cats: [{ c: 'plan', say: 'plan', vals: ['basic', 'plus', 'family'] }] },
    { ds: 'growth', t: 'agents', one: 'agent', many: 'agents', n: 12, label: 'name', text: true, nums: [], cats: [{ c: 'team', say: 'team', vals: ['Tier 1', 'Tier 2'] }], letters: ['A', 'B', 'C', 'D', 'E', 'F', 'G', 'H', 'I', 'J', 'K', 'L'] },
    { ds: 'lab', t: 'sessions', one: 'session', many: 'sessions', n: 668, label: 'session_id', nums: [{ c: 'week', say: 'week', th: [2, 4, 6, 8] }], cats: [] },
  ];
  function ents(test) { return ENT.filter(test); }
  function withNum(e) { return e.nums.length > 0; }
  function withCat(e) { return e.cats.length > 0; }

  /* ---------------------------------------------------------------- templates per level */
  // A template returns { ds, ask, tiles, extra, why, bug: [index, wrong tile] (optional: the broken version) }.

  var T = {};

  T[1] = [
    function (r) { // sort everything
      var e = pick(r, ents(withNum)), m = pick(r, e.nums), desc = r() < 0.5;
      var tiles = ['SELECT', e.label + ' ,', m.c, 'FROM', e.t, 'ORDER BY', m.c].concat(desc ? ['DESC'] : []);
      return { ds: e.ds, ask: L('List every ' + e.one + ' with its ' + m.say + ', ' + (desc ? 'highest' : 'lowest') + ' first.',
        'Lista ' + todos(e) + ' ' + eMany(e) + ' con su ' + sy(m) + ', ' + (desc ? 'de mayor a menor' : 'de menor a mayor') + '.'), tiles: tiles,
        extra: desc ? ['ASC', 'GROUP BY'] : ['DESC', 'WHERE'], why: L('ORDER BY sorts from low to high; DESC turns it around.', 'ORDER BY ordena de menor a mayor; DESC le da la vuelta.') };
    },
    function (r) { // top N
      var e = pick(r, ents(function (x) { return withNum(x) && x.n >= 10; })), m = pick(r, e.nums), desc = r() < 0.6, n = pick(r, [2, 3, 4]);
      var tiles = ['SELECT', e.label + ' ,', m.c, 'FROM', e.t, 'ORDER BY', m.c, desc ? 'DESC' : 'ASC', 'LIMIT ' + n];
      return { ds: e.ds, ask: L('The ' + n + ' ' + e.many + ' with the ' + (desc ? 'highest' : 'lowest') + ' ' + m.say + ': ' + e.label + ' and ' + m.c + '.',
        cap(los(e)) + ' ' + n + ' ' + eMany(e) + ' con ' + elx(m) + ' ' + sy(m) + ' más ' + (desc ? ag(m, 'alto', 'alta') : ag(m, 'bajo', 'baja')) + ': ' + e.label + ' y ' + m.c + '.'), tiles: tiles,
        extra: ['LIMIT ' + (n + 1), 'GROUP BY'], bug: [7, desc ? 'ASC' : 'DESC'], why: L('Sort first, then LIMIT keeps the first rows of the sorted result.', 'Ordena primero; después LIMIT se queda con las primeras filas del resultado ordenado.') };
    },
    function (r) { // distinct
      var e = pick(r, ents(withCat)), c = pick(r, e.cats);
      return { ds: e.ds, ask: L('Which different ' + c.say + ' values appear in ' + e.t + '?', '¿Qué valores distintos de ' + sy(c) + ' aparecen en ' + e.t + '?'), tiles: ['SELECT', 'DISTINCT', c.c, 'FROM', e.t],
        extra: ['COUNT(*)', 'ORDER BY', 'WHERE'], why: L('DISTINCT removes repeated values from the result.', 'DISTINCT quita los valores repetidos del resultado.') };
    },
    function (r) { // alphabetical
      var e = pick(r, ents(function (x) { return x.text; })), desc = r() < 0.3;
      return { ds: e.ds, ask: L('List the ' + e.label + ' of every ' + e.one + ' in ' + (desc ? 'reverse ' : '') + 'alphabetical order.',
        'Lista la columna ' + e.label + ' de ' + todos(e) + ' ' + eMany(e) + ' en orden alfabético' + (desc ? ' inverso' : '') + '.'),
        tiles: ['SELECT', e.label, 'FROM', e.t, 'ORDER BY', e.label].concat(desc ? ['DESC'] : []), extra: desc ? ['ASC', 'GROUP BY'] : ['DESC', 'GROUP BY'],
        why: L('Text sorts alphabetically: A to Z, or Z to A with DESC.', 'El texto se ordena alfabéticamente: de la A a la Z, o de la Z a la A con DESC.') };
    },
  ];

  T[2] = [
    function (r) { // number compared
      var e = pick(r, ents(withNum)), m = pick(r, e.nums), up = r() < 0.6, v = pick(r, up ? m.th.slice(0, Math.max(1, m.th.length - 1)) : m.th.slice(1));
      var cond = m.c + (up ? ' > ' : ' < ') + v;
      return { ds: e.ds, ask: L('Which ' + e.many + ' have a ' + m.say + (up ? ' above ' : ' below ') + v + '? Show ' + e.label + ' and ' + m.c + '.',
        '¿Qué ' + eMany(e) + ' tienen ' + unx(m) + ' ' + sy(m) + (up ? ' mayor que ' : ' menor que ') + v + '? Muestra ' + e.label + ' y ' + m.c + '.'),
        tiles: ['SELECT', e.label + ' ,', m.c, 'FROM', e.t, 'WHERE', cond], extra: ['HAVING', m.c + (up ? ' < ' : ' > ') + v], bug: [6, m.c + (up ? ' < ' : ' > ') + v],
        why: L('WHERE keeps the rows where the condition is true.', 'WHERE se queda con las filas en las que la condición es verdadera.') };
    },
    function (r) { // text equals
      var e = pick(r, ents(withCat)), c = pick(r, e.cats), v = pick(r, c.vals);
      return { ds: e.ds, ask: L('List the ' + e.label + ' of the ' + e.many + ' whose ' + c.say + ' is ' + v + '.', 'Lista la columna ' + e.label + ' de ' + los(e) + ' ' + eMany(e) + ' ' + ag(c, 'cuyo', 'cuya') + ' ' + sy(c) + ' es ' + v + '.'),
        tiles: ['SELECT', e.label, 'FROM', e.t, 'WHERE', c.c + ' = ' + q(v)], extra: [c.c + ' = ' + v.replace(/ /g, '_'), 'HAVING'], bug: [5, c.c + ' = ' + v.replace(/ /g, '_')],
        why: L('Text values need single quotes; without them the database looks for a column with that name.', 'Los valores de texto necesitan comillas simples; sin ellas, la base de datos busca una columna con ese nombre.') };
    },
    function (r) { // AND
      var e = pick(r, ents(function (x) { return withNum(x) && withCat(x); })), m = pick(r, e.nums), c = pick(r, e.cats), v = pick(r, c.vals), th = m.th[0];
      return { ds: e.ds, ask: L(e.many.charAt(0).toUpperCase() + e.many.slice(1) + ' with ' + c.say + ' ' + v + ' AND a ' + m.say + ' of at least ' + th + ': ' + e.label + '.',
        cap(eMany(e)) + ' con ' + sy(c) + ' ' + v + ' Y ' + unx(m) + ' ' + sy(m) + ' de al menos ' + th + ': ' + e.label + '.'),
        tiles: ['SELECT', e.label, 'FROM', e.t, 'WHERE', c.c + ' = ' + q(v), 'AND', m.c + ' >= ' + th], extra: ['OR', m.c + ' > ' + (th + 0.5)], bug: [6, 'OR'],
        why: L('AND needs both conditions to be true; OR needs only one.', 'AND necesita que se cumplan las dos condiciones; OR, solo una.') };
    },
    function (r) { // IN
      var e = pick(r, ents(function (x) { return x.cats.some(function (c) { return c.vals.length >= 3; }); }));
      var c = pick(r, e.cats.filter(function (x) { return x.vals.length >= 3; })), two = shuffle(r, c.vals).slice(0, 2);
      return { ds: e.ds, ask: L('How many ' + e.many + ' have ' + c.say + ' ' + two[0] + ' or ' + two[1] + '?', '¿' + cuantos(e) + ' ' + eMany(e) + ' tienen ' + sy(c) + ' ' + two[0] + ' o ' + two[1] + '?'),
        tiles: ['SELECT', 'COUNT(*)', 'FROM', e.t, 'WHERE', c.c + ' IN (' + q(two[0]) + ', ' + q(two[1]) + ')'], extra: [c.c + ' = ' + q(two[0]), 'AND'],
        why: L('IN (…) is a short way to write several OR conditions on one column.', 'IN (…) es una forma corta de escribir varias condiciones OR sobre una columna.') };
    },
    function (r) { // LIKE
      var e = pick(r, ents(function (x) { return x.letters; })), L = pick(r, e.letters);
      return { ds: e.ds, ask: DA.L('Which ' + e.many + ' have a ' + e.label + ' starting with ' + L + '?', '¿Qué ' + eMany(e) + ' tienen un valor de ' + e.label + ' que empieza por ' + L + '?'),
        tiles: ['SELECT', e.label, 'FROM', e.t, 'WHERE', e.label + " LIKE '" + L + "%'"], extra: [e.label + " = '" + L + "%'", e.label + " LIKE '%" + L + "'"],
        why: DA.L("In LIKE, % stands for any text: 'C%' means starts with C.", "En LIKE, % equivale a cualquier texto: 'C%' significa que empieza por C.") };
    },
  ];

  T[3] = [
    function (r) { // count with a filter
      var e = pick(r, ents(withCat)), c = pick(r, e.cats), v = pick(r, c.vals);
      return { ds: e.ds, ask: L('How many ' + e.many + ' have ' + c.say + ' ' + v + '?', '¿' + cuantos(e) + ' ' + eMany(e) + ' tienen ' + sy(c) + ' ' + v + '?'), tiles: ['SELECT', 'COUNT(*)', 'FROM', e.t, 'WHERE', c.c + ' = ' + q(v)],
        extra: ['COUNT(DISTINCT ' + c.c + ')', 'GROUP BY'], bug: [1, 'COUNT(DISTINCT ' + c.c + ')'], why: L('COUNT(*) counts the rows left after WHERE.', 'COUNT(*) cuenta las filas que quedan después de WHERE.') };
    },
    function (r) { // an aggregate of a number
      var e = pick(r, ents(withNum)), m = pick(r, e.nums), k = pick(r, [['MAX', 'highest'], ['MIN', 'lowest'], ['AVG', 'average'], ['SUM', 'total']]);
      var kes = { MAX: ag(m, 'más alto', 'más alta'), MIN: ag(m, 'más bajo', 'más baja'), AVG: ag(m, 'medio', 'media'), SUM: 'total' }[k[0]];
      var others = ['MAX', 'MIN', 'AVG', 'SUM'].filter(function (x) { return x !== k[0]; });
      return { ds: e.ds, ask: L('What is the ' + k[1] + ' ' + m.say + ' across all ' + e.many + '?', '¿Cuál es ' + elx(m) + ' ' + sy(m) + ' ' + kes + ' de ' + todos(e) + ' ' + eMany(e) + '?'), tiles: ['SELECT', k[0] + '(' + m.c + ')', 'FROM', e.t],
        extra: shuffle(r, others).slice(0, 2).map(function (f) { return f + '(' + m.c + ')'; }), why: L(k[0] + ' squeezes the whole column into one number.', k[0] + ' reduce toda la columna a un número.') };
    },
    function (r) { // sum or average with a filter
      var e = pick(r, ents(function (x) { return withNum(x) && withCat(x); })), m = pick(r, e.nums), c = pick(r, e.cats), v = pick(r, c.vals), avg = r() < 0.5;
      return { ds: e.ds, ask: L('What is the ' + (avg ? 'average' : 'total') + ' ' + m.say + ' of the ' + e.many + ' with ' + c.say + ' ' + v + '?',
        '¿Cuál es ' + elx(m) + ' ' + sy(m) + ' ' + (avg ? ag(m, 'medio', 'media') : 'total') + ' de ' + los(e) + ' ' + eMany(e) + ' con ' + sy(c) + ' ' + v + '?'),
        tiles: ['SELECT', (avg ? 'AVG(' : 'SUM(') + m.c + ')', 'FROM', e.t, 'WHERE', c.c + ' = ' + q(v)], extra: [(avg ? 'SUM(' : 'AVG(') + m.c + ')', 'HAVING'],
        bug: [1, (avg ? 'SUM(' : 'AVG(') + m.c + ')'], why: L('WHERE runs first, then the aggregate works on the rows that are left.', 'WHERE se ejecuta primero y después el agregado trabaja con las filas que quedan.') };
    },
    function (r) { // distinct count
      var e = pick(r, ents(function (x) { return withCat(x) && x.n >= 50; })), c = pick(r, e.cats);
      return { ds: e.ds, ask: L('How many different ' + c.say + ' values do the ' + e.many + ' have?', '¿Cuántos valores distintos de ' + sy(c) + ' tienen ' + los(e) + ' ' + eMany(e) + '?'), tiles: ['SELECT', 'COUNT(DISTINCT ' + c.c + ')', 'FROM', e.t],
        extra: ['COUNT(' + c.c + ')', 'COUNT(*)'], bug: [1, 'COUNT(' + c.c + ')'], why: L('COUNT(DISTINCT x) counts each value once.', 'COUNT(DISTINCT x) cuenta cada valor una vez.') };
    },
  ];

  T[4] = [
    function (r) { // count per group
      var e = pick(r, ents(withCat)), c = pick(r, e.cats);
      return { ds: e.ds, ask: L('How many ' + e.many + ' are there per ' + c.say + '?', '¿' + cuantos(e) + ' ' + eMany(e) + ' hay por ' + sy(c) + '?'), tiles: ['SELECT', c.c + ' ,', 'COUNT(*)', 'FROM', e.t, 'GROUP BY', c.c],
        extra: ['ORDER BY', 'COUNT(DISTINCT ' + c.c + ')'], why: L('GROUP BY gives one row per value; COUNT(*) counts the rows in each group.', 'GROUP BY da una fila por valor; COUNT(*) cuenta las filas de cada grupo.') };
    },
    function (r) { // average per group
      var e = pick(r, ents(function (x) { return withNum(x) && withCat(x); })), m = pick(r, e.nums), c = pick(r, e.cats), f = pick(r, [['AVG', 'average'], ['MAX', 'highest'], ['SUM', 'total']]);
      return { ds: e.ds, ask: L('The ' + f[1] + ' ' + m.say + ' per ' + c.say + '.', cap(elx(m)) + ' ' + sy(m) + ' ' + { AVG: ag(m, 'medio', 'media'), MAX: ag(m, 'más alto', 'más alta'), SUM: 'total' }[f[0]] + ' por ' + sy(c) + '.'), tiles: ['SELECT', c.c + ' ,', f[0] + '(' + m.c + ')', 'FROM', e.t, 'GROUP BY', c.c],
        extra: [m.c + ' ,', 'WHERE'], why: L('With GROUP BY, every column you select is either grouped or aggregated.', 'Con GROUP BY, cada columna que eliges está agrupada o agregada.') };
    },
    function (r) { // HAVING
      var e = pick(r, ents(function (x) { return withCat(x) && x.n >= 50; })), c = pick(r, e.cats), k = Math.floor(e.n / c.vals.length * pick(r, [0.5, 0.8, 0.9]));
      return { ds: e.ds, ask: L('Which ' + c.say + ' values have more than ' + k + ' ' + e.many + '? Show the value and the count.', '¿Qué valores de ' + sy(c) + ' tienen más de ' + k + ' ' + eMany(e) + '? Muestra el valor y el recuento.'),
        tiles: ['SELECT', c.c + ' ,', 'COUNT(*)', 'FROM', e.t, 'GROUP BY', c.c, 'HAVING', 'COUNT(*) > ' + k], extra: ['WHERE', 'COUNT(*) < ' + k], bug: [7, 'WHERE'],
        why: L('WHERE filters rows before grouping; HAVING filters the groups after counting.', 'WHERE filtra filas antes de agrupar; HAVING filtra los grupos después de contar.') };
    },
    function (r) { // sorted groups
      var e = pick(r, ents(function (x) { return withCat(x) && x.n >= 50; })), c = pick(r, e.cats), desc = r() < 0.7;
      return { ds: e.ds, ask: L(c.say.charAt(0).toUpperCase() + c.say.slice(1) + ' values by number of ' + e.many + ', ' + (desc ? 'most' : 'fewest') + ' first.',
        'Valores de ' + sy(c) + ' por número de ' + eMany(e) + ', ' + (desc ? 'de más a menos' : 'de menos a más') + '.'),
        tiles: ['SELECT', c.c + ' ,', 'COUNT(*) AS n', 'FROM', e.t, 'GROUP BY', c.c, 'ORDER BY', 'n'].concat(desc ? ['DESC'] : []), extra: desc ? ['ASC', 'WHERE'] : ['DESC', 'WHERE'],
        why: L('An alias like n can be used in ORDER BY.', 'Un alias como n se puede usar en ORDER BY.') };
    },
  ];

  var JOINS = [
    { ds: 'retail', ask: 'orders per store city', es: 'los pedidos por ciudad de la tienda', g: 's.city', agg: 'COUNT(*)', from: 'orders o', join: 'stores s', on: 'ON o.store_id = s.store_id', wrong: 'ON o.order_id = s.store_id' },
    { ds: 'retail', ask: 'units sold per product category', es: 'las unidades vendidas por categoría de producto', g: 'p.category', agg: 'SUM(i.qty)', from: 'order_items i', join: 'products p', on: 'ON i.product_id = p.product_id', wrong: 'ON i.item_id = p.product_id' },
    { ds: 'lab', ask: 'sessions per site', es: 'las sesiones por centro', g: 'p.site', agg: 'COUNT(*)', from: 'sessions s', join: 'participants p', on: 'ON s.participant_id = p.participant_id', wrong: 'ON s.session_id = p.participant_id' },
    { ds: 'lab', ask: 'sessions per study group', es: 'las sesiones por grupo del estudio', g: 'p.group_name', agg: 'COUNT(*)', from: 'sessions s', join: 'participants p', on: 'ON s.participant_id = p.participant_id', wrong: 'ON s.session_id = p.participant_id' },
    { ds: 'app', ask: 'members per platform', es: 'los socios por plataforma', g: 'u.platform', agg: 'COUNT(*)', from: 'members m', join: 'users u', on: 'ON m.user_id = u.user_id', wrong: 'ON m.member_id = u.user_id' },
    { ds: 'growth', ask: 'tickets per agent team', es: 'las incidencias por equipo de agentes', g: 'a.team', agg: 'COUNT(*)', from: 'tickets t', join: 'agents a', on: 'ON t.agent_id = a.agent_id', wrong: 'ON t.ticket_id = a.agent_id' },
    { ds: 'growth', ask: 'tickets per agent name', es: 'las incidencias por nombre de agente', g: 'a.name', agg: 'COUNT(*)', from: 'tickets t', join: 'agents a', on: 'ON t.agent_id = a.agent_id', wrong: 'ON t.ticket_id = a.agent_id' },
  ];
  T[5] = [
    function (r) { // join and group
      var j = pick(r, JOINS);
      return { ds: j.ds, ask: L('Count the ' + j.ask + '.', 'Cuenta ' + j.es + '.'), tiles: ['SELECT', j.g + ' ,', j.agg, 'FROM', j.from, 'JOIN', j.join, j.on, 'GROUP BY', j.g],
        extra: [j.wrong, 'WHERE'], bug: [7, j.wrong], why: L('ON says which columns match: usually a key in one table and the same id in the other.', 'ON dice qué columnas coinciden: normalmente una clave en una tabla y el mismo id en la otra.') };
    },
    function (r) { // join with a filter
      var c = pick(r, CITIES), ch = pick(r, ['in_store', 'pickup', 'delivery']);
      return { ds: 'retail', ask: L('How many ' + ch + ' orders did the ' + c + ' store take?', '¿Cuántos pedidos ' + ch + ' atendió la tienda de ' + c + '?'),
        tiles: ['SELECT', 'COUNT(*)', 'FROM', 'orders o', 'JOIN', 'stores s', 'ON o.store_id = s.store_id', 'WHERE', "s.city = '" + c + "'", 'AND', "o.channel = '" + ch + "'"],
        extra: ['OR', 'ON o.order_id = s.store_id'], bug: [9, 'OR'], why: L('After a JOIN you can filter on columns from either table.', 'Después de un JOIN puedes filtrar por columnas de cualquiera de las dos tablas.') };
    },
    function (r) { // three tables
      var cat = pick(r, ['Coffee', 'Tea', 'Bakery', 'Food']), ch = pick(r, ['in_store', 'pickup', 'delivery']);
      return { ds: 'retail', ask: L('Units of ' + cat + ' products sold in ' + ch + ' orders.', 'Unidades de productos ' + cat + ' vendidas en pedidos ' + ch + '.'),
        tiles: ['SELECT', 'SUM(i.qty)', 'FROM', 'order_items i', 'JOIN', 'products p', 'ON i.product_id = p.product_id', 'JOIN', 'orders o', 'ON i.order_id = o.order_id', 'WHERE', "p.category = '" + cat + "'", 'AND', "o.channel = '" + ch + "'"],
        extra: ['COUNT(*)', 'ON i.order_id = o.customer_id'], bug: [1, 'COUNT(*)'], why: L('Each JOIN adds one table; order_items links products and orders.', 'Cada JOIN añade una tabla; order_items enlaza products y orders.') };
    },
    function (r) { // left join keeps rows without a match
      var c = pick(r, CITIES);
      return { ds: 'retail', ask: L('Orders per customer in ' + c + ', including customers with no orders: customer_id and number of orders.', 'Pedidos por cliente en ' + c + ', incluidos los clientes sin pedidos: customer_id y número de pedidos.'),
        tiles: ['SELECT', 'c.customer_id ,', 'COUNT(o.order_id)', 'FROM', 'customers c', 'LEFT JOIN', 'orders o', 'ON o.customer_id = c.customer_id', 'WHERE', "c.city = '" + c + "'", 'GROUP BY', 'c.customer_id'],
        extra: ['JOIN', 'COUNT(*)'], bug: [5, 'JOIN'], why: L('LEFT JOIN keeps every customer; COUNT(o.order_id) gives 0 where there is no order.', 'LEFT JOIN conserva a todos los clientes; COUNT(o.order_id) da 0 donde no hay pedido.') };
    },
  ];

  var DATES = [
    { ds: 'retail', t: 'orders', d: 'order_date', many: 'orders', es: ['pedidos', 0] }, { ds: 'retail', t: 'customers', d: 'signup_date', many: 'customer sign-ups', es: ['altas de clientes', 1] },
    { ds: 'lab', t: 'sessions', d: 'session_date', many: 'sessions', es: ['sesiones', 1] }, { ds: 'app', t: 'users', d: 'signup_date', many: 'user sign-ups', es: ['altas de usuarios', 1] },
  ];
  var BANDS = [
    { ds: 'retail', t: 'products', c: 'price', lo: 'cheap', hi: 'premium', th: [3, 3.5, 4], many: 'products', es: 'los productos' },
    { ds: 'lab', t: 'participants', c: 'age', lo: 'younger', hi: 'older', th: [30, 40, 50], many: 'participants', es: 'los participantes' },
    { ds: 'app', t: 'members', c: 'monthly_price', lo: 'standard', hi: 'premium', th: [5, 9], many: 'members', es: 'los socios' },
  ];
  T[6] = [
    function (r) { // per month
      var d = pick(r, DATES);
      return { ds: d.ds, ask: L('How many ' + d.many + ' per month (YYYY-MM)?', '¿' + (d.es[1] ? 'Cuántas' : 'Cuántos') + ' ' + d.es[0] + ' hay por mes (AAAA-MM)?'), tiles: ['SELECT', "strftime('%Y-%m', " + d.d + ') AS month ,', 'COUNT(*)', 'FROM', d.t, 'GROUP BY', 'month'],
        extra: ["strftime('%m', " + d.d + ') AS month ,', 'ORDER BY'], why: L("strftime('%Y-%m', date) keeps the year and the month, so the same month of two years stays apart.", "strftime('%Y-%m', fecha) conserva el año y el mes, así que el mismo mes de dos años distintos no se mezcla.") };
    },
    function (r) { // one month
      var m = pick(r, MONTHS.slice(0, 11)), next = ('0' + (Number(m[0]) + 1)).slice(-2);
      return { ds: 'retail', ask: L('How many orders were placed in ' + m[1] + ' 2025?', '¿Cuántos pedidos se hicieron en ' + MES[m[0]] + ' de 2025?'),
        tiles: ['SELECT', 'COUNT(*)', 'FROM', 'orders', 'WHERE', "order_date >= '2025-" + m[0] + "-01'", 'AND', "order_date < '2025-" + next + "-01'"],
        extra: ['OR', "order_date > '2025-" + m[0] + "-01'"], bug: [6, 'OR'], why: L('From the first day of the month up to, not including, the first day of the next month.', 'Desde el primer día del mes hasta el primer día del mes siguiente, sin incluirlo.') };
    },
    function (r) { // CASE bands
      var b = pick(r, BANDS), th = pick(r, b.th);
      return { ds: b.ds, ask: L('Label ' + b.many + " as '" + b.lo + "' (" + b.c + ' under ' + th + ") or '" + b.hi + "', and count each label.",
        'Etiqueta ' + b.es + " como '" + b.lo + "' (" + b.c + ' menor que ' + th + ") o '" + b.hi + "', y cuenta cada etiqueta."),
        tiles: ['SELECT', 'CASE WHEN ' + b.c + ' < ' + th + " THEN '" + b.lo + "'", "ELSE '" + b.hi + "' END AS band ,", 'COUNT(*)', 'FROM', b.t, 'GROUP BY', 'band'],
        extra: ['WHERE', 'CASE WHEN ' + b.c + ' > ' + th + " THEN '" + b.lo + "'"], bug: [1, 'CASE WHEN ' + b.c + ' > ' + th + " THEN '" + b.lo + "'"],
        why: L('CASE WHEN turns a number into a label you can group by.', 'CASE WHEN convierte un número en una etiqueta por la que puedes agrupar.') };
    },
    function (r) { // weekday
      var d = pick(r, DATES);
      return { ds: d.ds, ask: L('How many ' + d.many + " per weekday? (strftime('%w') gives 0 for Sunday to 6 for Saturday)", '¿' + (d.es[1] ? 'Cuántas' : 'Cuántos') + ' ' + d.es[0] + " hay por día de la semana? (strftime('%w') da 0 para el domingo y hasta 6 para el sábado)"),
        tiles: ['SELECT', "strftime('%w', " + d.d + ') AS weekday ,', 'COUNT(*)', 'FROM', d.t, 'GROUP BY', 'weekday'], extra: ["strftime('%d', " + d.d + ') AS weekday ,', 'WHERE'],
        bug: [1, "strftime('%d', " + d.d + ') AS weekday ,'], why: L("'%w' is the day of the week; '%d' would be the day of the month.", "'%w' es el día de la semana; '%d' sería el día del mes.") };
    },
    function (r) { // days between two dates
      var pr = pick(r, ['low', 'medium', 'high']);
      return { ds: 'growth', ask: L('Average days from created_at to resolved_at for ' + pr + ' priority tickets, one decimal.', 'Días medios de created_at a resolved_at de las incidencias de prioridad ' + pr + ', con un decimal.'),
        tiles: ['SELECT', 'ROUND(AVG(julianday(resolved_at) - julianday(created_at)), 1)', 'FROM', 'tickets', 'WHERE', "LOWER(priority) = '" + pr + "'"],
        extra: ['ROUND(AVG(julianday(created_at) - julianday(resolved_at)), 1)', 'resolved_at - created_at'], bug: [1, 'ROUND(AVG(julianday(created_at) - julianday(resolved_at)), 1)'],
        why: L('julianday turns a date into a number of days, so subtracting two of them gives the time in between. Open tickets (NULL) are skipped by AVG.', 'julianday convierte una fecha en un número de días, así que restar dos da el tiempo entre ellas. AVG se salta las incidencias abiertas (NULL).') };
    },
  ];

  var PER = [
    { ds: 'retail', t: 'orders', k: 'customer_id', what: 'orders does a customer place', es: ['Cuántos pedidos hace un cliente'] },
    { ds: 'lab', t: 'sessions', k: 'participant_id', what: 'sessions does a participant attend', es: ['A cuántas sesiones asiste un participante'] },
    { ds: 'app', t: 'events', k: 'user_id', what: 'events does a user trigger', es: ['Cuántos eventos genera un usuario'] },
    { ds: 'growth', t: 'tickets', k: 'agent_id', what: 'tickets does an agent handle', es: ['Cuántas incidencias lleva un agente'] },
    { ds: 'app', t: 'invoices', k: 'member_id', what: 'invoices does a member get', es: ['Cuántas facturas recibe un socio'] },
  ];
  var SUBIN = [
    { ds: 'retail', ask: 'Customers who placed at least one delivery order: customer_id and city.', es: 'Clientes que hicieron al menos un pedido a domicilio: customer_id y city.', sel: ['customer_id ,', 'city'], t: 'customers', k: 'customer_id', sub: "(SELECT customer_id FROM orders WHERE channel = 'delivery')" },
    { ds: 'app', ask: 'Users who made at least one purchase: user_id and platform.', es: 'Usuarios que hicieron al menos una compra: user_id y platform.', sel: ['user_id ,', 'platform'], t: 'users', k: 'user_id', sub: "(SELECT user_id FROM events WHERE event_name = 'purchase')" },
    { ds: 'app', ask: 'Users who ever had a failed invoice: user_id and city.', es: 'Usuarios que tuvieron alguna vez una factura fallida: user_id y city.', sel: ['user_id ,', 'city'], t: 'users', k: 'user_id', sub: '(SELECT m.user_id FROM members m JOIN invoices i ON i.member_id = m.member_id WHERE i.paid = 0)' },
    { ds: 'growth', ask: 'Agents who handled at least one ticket with CSAT 1: name and team.', es: 'Agentes que llevaron al menos una incidencia con CSAT 1: name y team.', sel: ['name ,', 'team'], t: 'agents', k: 'agent_id', sub: '(SELECT agent_id FROM tickets WHERE csat = 1)' },
  ];
  T[7] = [
    function (r) { // above the average
      var e = pick(r, ents(function (x) { return withNum(x) && x.n >= 10; })), m = pick(r, e.nums), up = r() < 0.6;
      return { ds: e.ds, ask: L(cap(e.many) + ' with a ' + m.say + (up ? ' above' : ' below') + ' the average: ' + e.label + ' and ' + m.c + '.',
        cap(eMany(e)) + ' con ' + unx(m) + ' ' + sy(m) + (up ? ' por encima de' : ' por debajo de') + ' la media: ' + e.label + ' y ' + m.c + '.'),
        tiles: ['SELECT', e.label + ' ,', m.c, 'FROM', e.t, 'WHERE', m.c + (up ? ' >' : ' <'), '(SELECT AVG(' + m.c + ') FROM ' + e.t + ')'],
        extra: ['AVG(' + m.c + ')', 'HAVING'], why: L('The subquery computes the average once; WHERE compares every row with it.', 'La subconsulta calcula la media una vez; WHERE compara cada fila con ella.') };
    },
    function (r) { // IN (subquery)
      var s = pick(r, SUBIN);
      return { ds: s.ds, ask: L(s.ask, s.es), tiles: ['SELECT'].concat(s.sel, ['FROM', s.t, 'WHERE', s.k + ' IN', s.sub]), extra: [s.k + ' NOT IN', 'JOIN'], bug: [s.sel.length + 4, s.k + ' NOT IN'],
        why: L('IN (SELECT …) tests membership without multiplying rows the way a JOIN can.', 'IN (SELECT …) comprueba la pertenencia sin multiplicar filas como puede hacer un JOIN.') };
    },
    function (r) { // a CTE of counts
      var p = pick(r, PER), f = pick(r, [['AVG', 'On average, how many'], ['MAX', 'At most, how many']]);
      return { ds: p.ds, ask: L(f[1] + ' ' + p.what + '?', '¿' + p.es[0] + (f[0] === 'AVG' ? ' de media' : ' como máximo') + '?'), tiles: ['WITH c AS', '(SELECT ' + p.k + ' , COUNT(*) AS n FROM ' + p.t + ' GROUP BY ' + p.k + ')', 'SELECT', f[0] + '(n)', 'FROM', 'c'],
        extra: ['SUM(n)', 'COUNT(n)'], bug: [3, 'SUM(n)'], why: L('The CTE counts per ' + p.k.replace('_id', '') + ' first; the outer query summarises those counts.', 'La CTE cuenta primero por ' + p.k + '; la consulta exterior resume esos recuentos.') };
    },
  ];

  T[8] = [
    function (r) { // rank
      var e = pick(r, ents(function (x) { return withNum(x) && x.n <= 100; })), m = pick(r, e.nums), dense = r() < 0.4;
      return { ds: e.ds, ask: L((dense ? 'Dense-rank ' : 'Rank ') + e.many + ' by ' + m.say + ', highest first: ' + e.label + ', ' + m.c + ' and rnk.',
        (dense ? 'Ranking denso de ' : 'Ranking de ') + eMany(e) + ' por ' + sy(m) + ', de mayor a menor: ' + e.label + ', ' + m.c + ' y rnk.'),
        tiles: ['SELECT', e.label + ' ,', m.c + ' ,', (dense ? 'DENSE_RANK()' : 'RANK()') + ' OVER', '(ORDER BY ' + m.c + ' DESC) AS rnk', 'FROM', e.t],
        extra: ['GROUP BY', '(ORDER BY ' + m.c + ') AS rnk'], bug: [4, '(ORDER BY ' + m.c + ') AS rnk'], why: L('A window function adds a value to every row without grouping them away.', 'Una función de ventana añade un valor a cada fila sin agruparlas.') };
    },
    function (r) { // partition average
      var e = pick(r, ents(function (x) { return withNum(x) && withCat(x) && x.n <= 100; })), m = pick(r, e.nums), c = pick(r, e.cats);
      return { ds: e.ds, ask: L('Each ' + e.one + "'s " + m.say + ' next to the average ' + m.say + ' of its ' + c.say + ': ' + e.label + ', ' + c.c + ', ' + m.c + ' and grp_avg.',
        cap(elx(m)) + ' ' + sy(m) + ' de cada ' + eOne(e) + ' junto a ' + elx(m) + ' ' + sy(m) + ' ' + ag(m, 'medio', 'media') + ' de su ' + sy(c) + ': ' + e.label + ', ' + c.c + ', ' + m.c + ' y grp_avg.'),
        tiles: ['SELECT', e.label + ' ,', c.c + ' ,', m.c + ' ,', 'AVG(' + m.c + ') OVER (PARTITION BY ' + c.c + ') AS grp_avg', 'FROM', e.t],
        extra: ['GROUP BY', 'AVG(' + m.c + ') AS grp_avg'], why: L('PARTITION BY computes the average per group but keeps every row.', 'PARTITION BY calcula la media por grupo pero conserva todas las filas.') };
    },
    function (r) { // running total or previous month
      var d = pick(r, DATES), lag = r() < 0.5;
      return { ds: d.ds, ask: L(cap(d.many) + ' per month with ' + (lag ? "the previous month's count" : 'a running total') + ': month, n and ' + (lag ? 'prev' : 'running') + '.',
        cap(d.es[0]) + ' por mes con ' + (lag ? 'el recuento del mes anterior' : 'un total acumulado') + ': month, n y ' + (lag ? 'prev' : 'running') + '.'),
        tiles: ['WITH m AS', "(SELECT strftime('%Y-%m', " + d.d + ') AS month , COUNT(*) AS n FROM ' + d.t + ' GROUP BY month)', 'SELECT', 'month ,', 'n ,',
          lag ? 'LAG(n) OVER (ORDER BY month) AS prev' : 'SUM(n) OVER (ORDER BY month) AS running', 'FROM', 'm'],
        extra: lag ? ['LEAD(n) OVER (ORDER BY month) AS prev', 'GROUP BY'] : ['SUM(n) AS running', 'GROUP BY'], bug: [5, lag ? 'LEAD(n) OVER (ORDER BY month) AS prev' : 'SUM(n) AS running'],
        why: lag ? L('LAG looks one row back in the order you give.', 'LAG mira una fila atrás en el orden que le das.') : L('SUM(...) OVER (ORDER BY month) adds up every month so far.', 'SUM(...) OVER (ORDER BY month) suma todos los meses hasta el actual.') };
    },
    function (r) { // NTILE
      var e = pick(r, ents(function (x) { return withNum(x) && x.n <= 100 && x.n >= 10; })), m = pick(r, e.nums), k = pick(r, [2, 3, 4]);
      return { ds: e.ds, ask: L('Split the ' + e.many + ' into ' + k + ' equal groups by ' + m.say + ', lowest first: ' + e.label + ', ' + m.c + ' and grp.',
        'Divide ' + los(e) + ' ' + eMany(e) + ' en ' + k + ' grupos iguales por ' + sy(m) + ', de menor a mayor: ' + e.label + ', ' + m.c + ' y grp.'),
        tiles: ['SELECT', e.label + ' ,', m.c + ' ,', 'NTILE(' + k + ') OVER (ORDER BY ' + m.c + ') AS grp', 'FROM', e.t],
        extra: ['NTILE(' + k + ') OVER (ORDER BY ' + m.c + ' DESC) AS grp', 'GROUP BY'], bug: [3, 'NTILE(' + k + ') OVER (ORDER BY ' + m.c + ' DESC) AS grp'],
        why: L('NTILE(k) deals the sorted rows into k groups of (almost) the same size.', 'NTILE(k) reparte las filas ordenadas en k grupos de (casi) el mismo tamaño.') };
    },
    function (r) { // share of the total with a window over a group
      var e = pick(r, ents(function (x) { return withCat(x) && x.n >= 50; })), c = pick(r, e.cats);
      return { ds: e.ds, ask: L('Each ' + c.say + "'s share of all " + e.many + ' (%), one decimal: ' + c.c + ', n and pct.', 'El peso de cada ' + sy(c) + ' sobre ' + todos(e) + ' ' + eMany(e) + ' (%), con un decimal: ' + c.c + ', n y pct.'),
        tiles: ['SELECT', c.c + ' ,', 'COUNT(*) AS n ,', 'ROUND(100.0 * COUNT(*) / SUM(COUNT(*)) OVER (), 1) AS pct', 'FROM', e.t, 'GROUP BY', c.c],
        extra: ['ROUND(100.0 * COUNT(*) / COUNT(*), 1) AS pct', 'WHERE'], bug: [3, 'ROUND(100.0 * COUNT(*) / COUNT(*), 1) AS pct'],
        why: L('SUM(COUNT(*)) OVER () adds up the group counts across the whole result: the total to divide by.', 'SUM(COUNT(*)) OVER () suma los recuentos de los grupos en todo el resultado: el total entre el que dividir.') };
    },
  ];

  T[9] = [
    function (r) { // IS NULL
      var x = pick(r, [['growth', 'tickets', 'resolved_at', 'tickets are still open (no resolved_at)', '¿Cuántas incidencias siguen abiertas (sin resolved_at)?'], ['app', 'members', 'cancel_date', 'members are still active (no cancel_date)', '¿Cuántos socios siguen activos (sin cancel_date)?'], ['growth', 'tickets', 'category', 'tickets have no category', '¿Cuántas incidencias no tienen categoría?']]);
      return { ds: x[0], ask: L('How many ' + x[3] + '?', x[4]), tiles: ['SELECT', 'COUNT(*)', 'FROM', x[1], 'WHERE', x[2] + ' IS NULL'], extra: [x[2] + ' = NULL', x[2] + ' IS NOT NULL'],
        bug: [5, x[2] + ' = NULL'], why: L('NULL is not equal to anything, not even NULL: use IS NULL.', 'NULL no es igual a nada, ni siquiera a NULL: usa IS NULL.') };
    },
    function (r) { // COUNT(column) skips NULLs
      var x = pick(r, [['csat', 'have a CSAT score', 'tienen una puntuación CSAT'], ['category', 'have a category', 'tienen categoría'], ['resolved_at', 'are resolved', 'están resueltas']]);
      return { ds: 'growth', ask: L('How many tickets ' + x[1] + '? Use one aggregate, no WHERE.', '¿Cuántas incidencias ' + x[2] + '? Usa un solo agregado, sin WHERE.'), tiles: ['SELECT', 'COUNT(' + x[0] + ')', 'FROM', 'tickets'], extra: ['COUNT(*)', 'SUM(' + x[0] + ')'],
        bug: [1, 'COUNT(*)'], why: L('COUNT(column) counts the rows where the column is not NULL; COUNT(*) counts every row.', 'COUNT(columna) cuenta las filas en las que la columna no es NULL; COUNT(*) cuenta todas las filas.') };
    },
    function (r) { // COALESCE label
      var by = pick(r, [['category', 'unknown'], ['category', 'not set']]);
      return { ds: 'growth', ask: L("Tickets per category, with missing categories shown as '" + by[1] + "'.", "Incidencias por categoría, con las categorías que faltan mostradas como '" + by[1] + "'."),
        tiles: ['SELECT', "COALESCE(category, '" + by[1] + "') AS cat ,", 'COUNT(*)', 'FROM', 'tickets', 'GROUP BY', 'cat'], extra: ['category AS cat ,', 'WHERE'],
        why: L('COALESCE returns the first value that is not NULL, so the gaps get a readable label.', 'COALESCE devuelve el primer valor que no es NULL, así que los huecos reciben una etiqueta legible.') };
    },
    function (r) { // AVG with or without the gaps
      var zero = r() < 0.5, pr = pick(r, ['low', 'medium', 'high']);
      var right = zero ? 'AVG(COALESCE(csat, 0))' : 'AVG(csat)', wrong = zero ? 'AVG(csat)' : 'AVG(COALESCE(csat, 0))';
      return { ds: 'growth', ask: L('Average CSAT of ' + pr + ' priority tickets ' + (zero ? 'if a missing score counts as 0.' : 'that have a score.'), 'CSAT medio de las incidencias de prioridad ' + pr + (zero ? ' si una puntuación que falta cuenta como 0.' : ' que tienen puntuación.')),
        tiles: ['SELECT', right, 'FROM', 'tickets', 'WHERE', "LOWER(priority) = '" + pr + "'"], extra: [wrong, 'COUNT(csat)'], bug: [1, wrong],
        why: L('AVG skips NULLs. Replacing them with 0 changes the answer, so decide what a missing score means.', 'AVG se salta los NULL. Sustituirlos por 0 cambia la respuesta, así que decide qué significa una puntuación que falta.') };
    },
  ];

  T[10] = [
    function (r) { // clean then group
      var c = pick(r, [['channel', 'channel', 'canal'], ['priority', 'priority', 'prioridad']]);
      return { ds: 'growth', ask: L('Tickets per ' + c[1] + ', after cleaning the typing: ignore upper/lower case and extra spaces.', 'Incidencias por ' + c[2] + ', después de limpiar la escritura: ignora mayúsculas, minúsculas y espacios de más.'),
        tiles: ['SELECT', 'LOWER(TRIM(' + c[0] + ')) AS v ,', 'COUNT(*)', 'FROM', 'tickets', 'GROUP BY', 'v'], extra: ['TRIM(' + c[0] + ') AS v ,', c[0] + ' AS v ,'], bug: [1, 'TRIM(' + c[0] + ') AS v ,'],
        why: L('TRIM removes the spaces at the ends; LOWER makes "Email" and "EMAIL" the same.', 'TRIM quita los espacios de los extremos; LOWER hace que "Email" y "EMAIL" sean lo mismo.') };
    },
    function (r) { // clean filter
      var v = pick(r, ['email', 'chat', 'phone']);
      return { ds: 'growth', ask: L('How many tickets came by ' + v + ', however it was typed?', '¿Cuántas incidencias llegaron por ' + v + ', se escribiera como se escribiera?'), tiles: ['SELECT', 'COUNT(*)', 'FROM', 'tickets', 'WHERE', "LOWER(TRIM(channel)) = '" + v + "'"],
        extra: ["channel = '" + v + "'", "LOWER(channel) = '" + v + "'"], bug: [5, "LOWER(channel) = '" + v + "'"], why: L("LOWER alone misses '" + v + " ' with a trailing space; TRIM fixes that.", "LOWER solo no detecta '" + v + " ' con un espacio al final; TRIM lo arregla.") };
    },
    function (r) { // contains
      var w = pick(r, [['Tea', 'products', 'name'], ['Latte', 'products', 'name'], ['Tier', 'agents', 'team']]);
      return { ds: w[1] === 'products' ? 'retail' : 'growth', ask: L('Which ' + w[1] + ' have "' + w[0] + '" anywhere in their ' + w[2] + '? Show the ' + w[2] + '.', '¿Qué ' + (w[1] === 'products' ? 'productos' : 'agentes') + ' tienen "' + w[0] + '" en cualquier parte de su ' + w[2] + '? Muestra ' + w[2] + '.'),
        tiles: ['SELECT', w[2], 'FROM', w[1], 'WHERE', w[2] + " LIKE '%" + w[0] + "%'"], extra: [w[2] + " = '" + w[0] + "'", w[2] + " LIKE '" + w[0] + "'"],
        why: L("'%" + w[0] + "%' means: any text, then " + w[0] + ', then any text.', "'%" + w[0] + "%' significa: cualquier texto, después " + w[0] + ' y después cualquier texto.') };
    },
    function (r) { // SUBSTR
      var day = r() < 0.5;
      return { ds: 'app', ask: L('Number of events per ' + (day ? 'day' : 'month') + ', taken from the first ' + (day ? '10' : '7') + ' characters of event_time.', 'Número de eventos por ' + (day ? 'día' : 'mes') + ', sacado de los ' + (day ? '10' : '7') + ' primeros caracteres de event_time.'),
        tiles: ['SELECT', 'SUBSTR(event_time, 1, ' + (day ? 10 : 7) + ') AS d ,', 'COUNT(*)', 'FROM', 'events', 'GROUP BY', 'd'], extra: ['SUBSTR(event_time, 1, ' + (day ? 7 : 4) + ') AS d ,', 'ORDER BY'],
        bug: [1, 'SUBSTR(event_time, 1, ' + (day ? 7 : 4) + ') AS d ,'], why: L('SUBSTR(text, start, length) cuts out part of a text: positions start at 1.', 'SUBSTR(texto, inicio, longitud) recorta una parte de un texto: las posiciones empiezan en 1.') };
    },
    function (r) { // LENGTH
      var more = r() < 0.5, k = pick(r, more ? [3, 4] : [3, 4, 5]);
      return { ds: 'growth', ask: L('Agents whose name has ' + (more ? 'more than ' : 'exactly ') + k + ' letters: name.', 'Agentes cuyo nombre tiene ' + (more ? 'más de ' : 'exactamente ') + k + ' letras: name.'),
        tiles: ['SELECT', 'name', 'FROM', 'agents', 'WHERE', 'LENGTH(name) ' + (more ? '> ' : '= ') + k], extra: ["name LIKE '" + '_'.repeat(k) + "'", 'LENGTH(name) < ' + k],
        why: L('LENGTH counts the characters of a text.', 'LENGTH cuenta los caracteres de un texto.') };
    },
    function (r) { // clean priority filter with a count per agent
      var pr = pick(r, ['low', 'medium', 'high']);
      return { ds: 'growth', ask: L(cap(pr) + ' priority tickets per agent_id, however the priority was typed.', 'Incidencias de prioridad ' + pr + ' por agent_id, se escribiera como se escribiera la prioridad.'),
        tiles: ['SELECT', 'agent_id ,', 'COUNT(*)', 'FROM', 'tickets', 'WHERE', "LOWER(priority) = '" + pr + "'", 'GROUP BY', 'agent_id'],
        extra: ["priority = '" + pr + "'", "UPPER(priority) = '" + pr + "'"], bug: [6, "priority = '" + pr + "'"],
        why: L("Some rows say '" + pr.toUpperCase() + "': compare LOWER(priority) with the lower-case word.", "Algunas filas dicen '" + pr.toUpperCase() + "': compara LOWER(priority) con la palabra en minúsculas.") };
    },
  ];

  T[11] = [
    function (r) { // rounded average
      var x = pick(r, [['retail', 'products', 'category', 'price', 2], ['lab', 'measurements', 'metric', 'value', 1], ['lab', 'participants', 'site', 'age', 1]]);
      return { ds: x[0], ask: L('The average ' + x[3] + ' per ' + x[2] + ', rounded to ' + x[4] + ' decimal' + (x[4] === 1 ? '' : 's') + '.',
        { price: 'El precio medio', value: 'El valor medio', age: 'La edad media' }[x[3]] + ' por ' + { category: 'categoría', metric: 'métrica', site: 'centro' }[x[2]] + ', con ' + x[4] + ' decimal' + (x[4] === 1 ? '' : 'es') + '.'),
        tiles: ['SELECT', x[2] + ' ,', 'ROUND(AVG(' + x[3] + '), ' + x[4] + ')', 'FROM', x[1], 'GROUP BY', x[2]], extra: ['AVG(ROUND(' + x[3] + '))', 'ROUND(' + x[3] + ', ' + x[4] + ')'],
        bug: [2, 'AVG(ROUND(' + x[3] + '))'], why: L('Round at the end: rounding each value first changes the average.', 'Redondea al final: redondear antes cada valor cambia la media.') };
    },
    function (r) { // revenue
      var g = pick(r, [['p.category', 'product category', 'categoría de producto'], ['p.name', 'product', 'producto']]);
      return { ds: 'retail', ask: L('Revenue (qty × price) per ' + g[1] + ', rounded to 2 decimals.', 'Ingresos (qty × price) por ' + g[2] + ', con 2 decimales.'),
        tiles: ['SELECT', g[0] + ' ,', 'ROUND(SUM(i.qty * p.price), 2) AS revenue', 'FROM', 'order_items i', 'JOIN', 'products p', 'ON i.product_id = p.product_id', 'GROUP BY', g[0]],
        extra: ['ROUND(SUM(i.qty + p.price), 2) AS revenue', 'SUM(p.price)'], bug: [2, 'ROUND(SUM(i.qty + p.price), 2) AS revenue'], why: L('Multiply inside the SUM: each line is qty × price, then add the lines up.', 'Multiplica dentro del SUM: cada línea es qty × price, y después suma las líneas.') };
    },
    function (r) { // a percentage
      var x = pick(r, [['retail', 'orders', "channel = 'delivery'", 'orders were delivery orders', 'de los pedidos fueron a domicilio'], ['app', 'invoices', 'paid = 0', 'invoices failed (paid = 0)', 'de las facturas fallaron (paid = 0)'], ['app', 'users', "referral = 'friend'", 'users came from a friend referral', 'de los usuarios vino por recomendación de un amigo'], ['growth', 'tickets', 'resolved_at IS NULL', 'tickets are still open', 'de las incidencias sigue abierto']]);
      return { ds: x[0], ask: L('What percentage of ' + x[3] + '? One decimal.', '¿Qué porcentaje ' + x[4] + '? Con un decimal.'), tiles: ['SELECT', 'ROUND(100.0 *', 'SUM(CASE WHEN ' + x[2] + ' THEN 1 ELSE 0 END)', '/ COUNT(*), 1)', 'FROM', x[1]],
        extra: ['ROUND(100 *', 'COUNT(*)'], bug: [1, 'ROUND(100 *'], why: L('Integer ÷ integer drops the decimals in SQL; 100.0 makes the division a decimal one.', 'Entero ÷ entero pierde los decimales en SQL; 100.0 hace que la división sea decimal.') };
    },
    function (r) { // integer division as a tool: age decades
      var w = pick(r, [10, 20]);
      return { ds: 'lab', ask: L('Participants per age band of ' + w + ' years (18 → ' + (w === 10 ? 10 : 0) + ', 25 → 20): band and count.', 'Participantes por tramo de edad de ' + w + ' años (18 → ' + (w === 10 ? 10 : 0) + ', 25 → 20): band y recuento.'),
        tiles: ['SELECT', '(age / ' + w + ') * ' + w + ' AS band ,', 'COUNT(*)', 'FROM', 'participants', 'GROUP BY', 'band'], extra: ['(age / ' + w + '.0) * ' + w + ' AS band ,', 'ROUND(age, -1) AS band ,'],
        bug: [1, '(age / ' + w + '.0) * ' + w + ' AS band ,'], why: L('Here the integer division is the point: age / ' + w + ' drops the remainder, so every age falls into its band.', 'Aquí la división entera es justo lo que buscamos: age / ' + w + ' quita el resto, así que cada edad cae en su tramo.') };
    },
    function (r) { // money per month
      var paid = r() < 0.6;
      return { ds: 'app', ask: L((paid ? 'Paid' : 'Failed') + ' invoice amounts per month, rounded to 2 decimals.', 'Importes de facturas ' + (paid ? 'pagadas' : 'fallidas') + ' por mes, con 2 decimales.'),
        tiles: ['SELECT', 'month ,', 'ROUND(SUM(amount), 2)', 'FROM', 'invoices', 'WHERE', 'paid = ' + (paid ? 1 : 0), 'GROUP BY', 'month'], extra: ['paid = ' + (paid ? 0 : 1), 'ROUND(amount, 2)'],
        bug: [6, 'paid = ' + (paid ? 0 : 1)], why: L('Filter first, then add up the amounts of each month.', 'Filtra primero y después suma los importes de cada mes.') };
    },
  ];

  T[12] = [
    function (r) { // rows vs distinct
      var x = pick(r, [['retail', 'orders', 'customer_id', 'orders', 'customers placed them'], ['app', 'events', 'user_id', 'events', 'users triggered them'], ['lab', 'sessions', 'participant_id', 'sessions', 'participants attended them'], ['app', 'invoices', 'member_id', 'invoices', 'members received them']]);
      return { ds: x[0], ask: L('How many ' + x[3] + ' are there, and how many different ' + x[4] + '?', { orders: '¿Cuántos pedidos hay, y cuántos clientes distintos los hicieron?', events: '¿Cuántos eventos hay, y cuántos usuarios distintos los generaron?', sessions: '¿Cuántas sesiones hay, y cuántos participantes distintos asistieron?', invoices: '¿Cuántas facturas hay, y cuántos socios distintos las recibieron?' }[x[1]]), tiles: ['SELECT', 'COUNT(*) ,', 'COUNT(DISTINCT ' + x[2] + ')', 'FROM', x[1]],
        extra: ['COUNT(' + x[2] + ')', 'DISTINCT'], bug: [2, 'COUNT(' + x[2] + ')'], why: L('The same customer appears in many rows: COUNT(DISTINCT) counts each one once.', 'El mismo cliente aparece en muchas filas: COUNT(DISTINCT) cuenta cada uno una vez.') };
    },
    function (r) { // repeat customers
      var x = pick(r, [['retail', 'orders', 'customer_id', 'Customers', 'orders', [10, 12]], ['app', 'events', 'user_id', 'Users', 'events', [12, 15, 18]], ['lab', 'sessions', 'participant_id', 'Participants', 'sessions', [10, 11]]]), k = pick(r, x[5]);
      return { ds: x[0], ask: L(x[3] + ' with more than ' + k + ' ' + x[4] + ': ' + x[2] + ' and the count.', { orders: 'Clientes con más de ' + k + ' pedidos', events: 'Usuarios con más de ' + k + ' eventos', sessions: 'Participantes con más de ' + k + ' sesiones' }[x[1]] + ': ' + x[2] + ' y el recuento.'),
        tiles: ['SELECT', x[2] + ' ,', 'COUNT(*)', 'FROM', x[1], 'GROUP BY', x[2], 'HAVING', 'COUNT(*) > ' + k], extra: ['WHERE', 'COUNT(DISTINCT ' + x[2] + ') > ' + k], bug: [7, 'WHERE'],
        why: L('GROUP BY + HAVING COUNT(*) > n finds the keys that repeat more than n times.', 'GROUP BY + HAVING COUNT(*) > n encuentra las claves que se repiten más de n veces.') };
    },
    function (r) { // distinct pairs
      var x = pick(r, [['retail', 'customers', 'city', 'segment'], ['app', 'users', 'platform', 'referral'], ['lab', 'participants', 'site', 'group_name']]);
      return { ds: x[0], ask: L('Which ' + x[2] + ' and ' + x[3] + ' combinations exist among ' + x[1] + '? Each pair once.', '¿Qué combinaciones de ' + x[2] + ' y ' + x[3] + ' existen en ' + x[1] + '? Cada pareja una vez.'), tiles: ['SELECT', 'DISTINCT', x[2] + ' ,', x[3], 'FROM', x[1]],
        extra: ['COUNT(*)', 'ORDER BY'], why: L('DISTINCT works on the whole row: each combination appears once.', 'DISTINCT funciona sobre la fila entera: cada combinación aparece una vez.') };
    },
    function (r) { // keys seen in more than one category
      var x = pick(r, [['retail', 'orders', 'customer_id', 'channel', 'customers ordered through more than one channel'], ['app', 'events', 'session_id', 'event_name', 'sessions had more than one kind of event'], ['retail', 'orders', 'customer_id', 'store_id', 'customers ordered from more than one store']]);
      return { ds: x[0], ask: L('How many ' + x[4] + '?', { channel: '¿Cuántos clientes pidieron por más de un canal?', event_name: '¿Cuántas sesiones tuvieron más de un tipo de evento?', store_id: '¿Cuántos clientes pidieron en más de una tienda?' }[x[3]]),
        tiles: ['SELECT', 'COUNT(*)', 'FROM', '(SELECT ' + x[2] + ' FROM ' + x[1] + ' GROUP BY ' + x[2], 'HAVING', 'COUNT(DISTINCT ' + x[3] + ') > 1)'], extra: ['COUNT(' + x[3] + ') > 1)', 'WHERE'],
        bug: [5, 'COUNT(' + x[3] + ') > 1)'], why: L('COUNT(DISTINCT x) > 1 means at least two different values; COUNT(x) > 1 only means two rows.', 'COUNT(DISTINCT x) > 1 significa al menos dos valores distintos; COUNT(x) > 1 solo significa dos filas.') };
    },
  ];

  T[13] = [
    function (r) { // a conditional count per group
      // [dataset, table, select tile, group by tile, condition, what is counted, what a row is]
      var x = pick(r, [
        ['retail', 'orders', 'store_id ,', 'store_id', "channel = 'delivery'", 'delivery orders', 'store_id', 'orders'],
        ['growth', 'tickets', 'LOWER(priority) AS prio ,', 'prio', 'resolved_at IS NULL', 'open tickets', 'priority (any case)', 'tickets'],
        ['app', 'members', 'plan ,', 'plan', 'cancel_date IS NOT NULL', 'cancelled members', 'plan', 'members'],
        ['app', 'users', 'platform ,', 'platform', "referral = 'friend'", 'friend referrals', 'platform', 'users'],
      ]);
      return { ds: x[0], ask: L('Per ' + x[6] + ': the number of ' + x[7] + ' and the number of ' + x[5] + '.', { orders: 'Por store_id: el número de pedidos y el número de pedidos a domicilio.', tickets: 'Por prioridad (en mayúsculas o minúsculas): el número de incidencias y el número de incidencias abiertas.', members: 'Por plan: el número de socios y el número de socios que se dieron de baja.', users: 'Por plataforma: el número de usuarios y el número de recomendaciones de amigos.' }[x[1]]),
        tiles: ['SELECT', x[2], 'COUNT(*) ,', 'SUM(CASE WHEN ' + x[4] + ' THEN 1 ELSE 0 END)', 'FROM', x[1], 'GROUP BY', x[3]],
        extra: ['SUM(CASE WHEN ' + x[4] + ' THEN 0 ELSE 1 END)', 'WHERE'], bug: [3, 'SUM(CASE WHEN ' + x[4] + ' THEN 0 ELSE 1 END)'],
        why: L('SUM(CASE WHEN … THEN 1 ELSE 0 END) counts the rows that match, next to the total, in one pass.', 'SUM(CASE WHEN … THEN 1 ELSE 0 END) cuenta las filas que cumplen, junto al total, de una sola pasada.') };
    },
    function (r) { // a rate per group
      var x = pick(r, [['app', 'invoices', 'month', 'paid = 1', 'payment success rate per month'], ['growth', 'tickets', 'agent_id', 'csat >= 4', 'share of tickets with CSAT 4 or 5 per agent'], ['retail', 'orders', 'channel', "order_date >= '2025-07-01'", 'share of orders in the second half of 2025 per channel']]);
      return { ds: x[0], ask: L('The ' + x[4] + ', rounded to 3 decimals.', { invoices: 'La tasa de pagos con éxito por mes', tickets: 'La proporción de incidencias con CSAT 4 o 5 por agente', orders: 'La proporción de pedidos del segundo semestre de 2025 por canal' }[x[1]] + ', con 3 decimales.'), tiles: ['SELECT', x[2] + ' ,', 'ROUND(AVG(CASE WHEN ' + x[3] + ' THEN 1.0 ELSE 0 END), 3)', 'FROM', x[1], 'GROUP BY', x[2]],
        extra: ['ROUND(AVG(CASE WHEN ' + x[3] + ' THEN 1 ELSE NULL END), 3)', 'HAVING'], bug: [2, 'ROUND(AVG(CASE WHEN ' + x[3] + ' THEN 1 ELSE NULL END), 3)'],
        why: L('The average of 1s and 0s is the share of 1s. With NULL instead of 0, AVG skips the misses and returns 1.', 'La media de unos y ceros es la proporción de unos. Con NULL en lugar de 0, AVG se salta los fallos y devuelve 1.') };
    },
  ];

  T[14] = [
    function (r) { // LEFT JOIN … IS NULL
      var x = pick(r, [
        ['retail', 'Customers who never placed an order: customer_id and city.', ['c.customer_id ,', 'c.city'], 'customers c', 'orders o', 'ON o.customer_id = c.customer_id', 'o.order_id'],
        ['app', 'Users who never became members: user_id and platform.', ['u.user_id ,', 'u.platform'], 'users u', 'members m', 'ON m.user_id = u.user_id', 'm.member_id'],
      ]);
      return { ds: x[0], ask: L(x[1], { retail: 'Clientes que nunca hicieron un pedido: customer_id y city.', app: 'Usuarios que nunca se hicieron socios: user_id y platform.' }[x[0]]), tiles: ['SELECT'].concat(x[2], ['FROM', x[3], 'LEFT JOIN', x[4], x[5], 'WHERE', x[6] + ' IS NULL']), extra: ['JOIN', x[6] + ' IS NOT NULL'],
        bug: [x[2].length + 3, 'JOIN'], why: L('LEFT JOIN keeps rows with no match and fills the other side with NULL; IS NULL keeps exactly those.', 'LEFT JOIN conserva las filas sin coincidencia y rellena el otro lado con NULL; IS NULL se queda justo con esas.') };
    },
    function (r) { // NOT IN
      var x = pick(r, [['app', 'How many users never became members?', 'users', 'user_id', '(SELECT user_id FROM members)'], ['retail', 'How many customers never ordered?', 'customers', 'customer_id', '(SELECT customer_id FROM orders)'], ['app', 'How many members never had a failed payment?', 'members', 'member_id', '(SELECT member_id FROM invoices WHERE paid = 0)']]);
      return { ds: x[0], ask: L(x[1], { users: '¿Cuántos usuarios nunca se hicieron socios?', customers: '¿Cuántos clientes nunca pidieron?', members: '¿Cuántos socios nunca tuvieron un pago fallido?' }[x[2]]), tiles: ['SELECT', 'COUNT(*)', 'FROM', x[2], 'WHERE', x[3] + ' NOT IN', x[4]], extra: [x[3] + ' IN', 'COUNT(DISTINCT ' + x[3] + ')'], bug: [5, x[3] + ' IN'],
        why: L('NOT IN keeps the keys that are missing from the other list. (Careful: a NULL in that list makes NOT IN return nothing.)', 'NOT IN se queda con las claves que faltan en la otra lista. (Cuidado: un NULL en esa lista hace que NOT IN no devuelva nada.)') };
    },
    function (r) { // anti-join per group
      var c = pick(r, CITIES);
      return { ds: 'retail', ask: L('How many customers in each segment have never ordered? Only ' + c + '.', '¿Cuántos clientes de cada segmento no han pedido nunca? Solo ' + c + '.'),
        tiles: ['SELECT', 'c.segment ,', 'COUNT(*)', 'FROM', 'customers c', 'LEFT JOIN', 'orders o', 'ON o.customer_id = c.customer_id', 'WHERE', 'o.order_id IS NULL', 'AND', "c.city = '" + c + "'", 'GROUP BY', 'c.segment'],
        extra: ['JOIN', 'OR'], bug: [10, 'OR'], why: L('Both conditions must hold: no matching order, and the right city.', 'Tienen que cumplirse las dos condiciones: ningún pedido que coincida y la ciudad correcta.') };
    },
  ];

  var TOPS = [
    { ds: 'retail', t: 'products', g: 'category', l: 'name', v: 'price', what: 'priciest products per category', desc: true, es: ['El producto más caro de cada categoría', 'Los {n} productos más caros de cada categoría'] },
    { ds: 'retail', t: 'products', g: 'category', l: 'name', v: 'price', what: 'cheapest products per category', desc: false, es: ['El producto más barato de cada categoría', 'Los {n} productos más baratos de cada categoría'] },
    { ds: 'lab', t: 'participants', g: 'site', l: 'participant_id', v: 'age', what: 'oldest participants per site', desc: true, es: ['El participante de más edad de cada centro', 'Los {n} participantes de más edad de cada centro'] },
    { ds: 'lab', t: 'participants', g: 'group_name', l: 'participant_id', v: 'age', what: 'youngest participants per group', desc: false, es: ['El participante más joven de cada grupo', 'Los {n} participantes más jóvenes de cada grupo'] },
    { ds: 'app', t: 'users', g: 'platform', l: 'user_id', v: 'signup_date', what: 'newest users per platform', desc: true, es: ['El usuario más reciente de cada plataforma', 'Los {n} usuarios más recientes de cada plataforma'] },
  ];
  T[15] = [
    function (r) {
      var x = pick(r, TOPS), n = pick(r, [1, 2, 3]);
      return { ds: x.ds, ask: L('The ' + (n === 1 ? '' : n + ' ') + x.what.replace(/s per/, n === 1 ? ' per' : 's per') + ': ' + x.g + ', ' + x.l + ' and ' + x.v + '.',
        x.es[n === 1 ? 0 : 1].replace('{n}', n) + ': ' + x.g + ', ' + x.l + ' y ' + x.v + '.'),
        tiles: ['WITH r AS', '(SELECT ' + x.g + ' , ' + x.l + ' , ' + x.v + ' ,', 'ROW_NUMBER() OVER (PARTITION BY ' + x.g + ' ORDER BY ' + x.v + (x.desc ? ' DESC' : '') + ') AS rn', 'FROM ' + x.t + ')',
          'SELECT', x.g + ' ,', x.l + ' ,', x.v, 'FROM', 'r', 'WHERE', 'rn <= ' + n],
        extra: ['ROW_NUMBER() OVER (ORDER BY ' + x.v + (x.desc ? ' DESC' : '') + ') AS rn', 'rn = ' + (n + 1)], bug: [2, 'ROW_NUMBER() OVER (ORDER BY ' + x.v + (x.desc ? ' DESC' : '') + ') AS rn'],
        why: L('PARTITION BY restarts the numbering in every group, so rn <= N keeps the top N of each group.', 'PARTITION BY reinicia la numeración en cada grupo, así que rn <= N se queda con los N primeros de cada grupo.') };
    },
    function (r) { // best per group via aggregates
      var x = pick(r, [['retail', 'orders', 'channel', 'customer_id', 'customer with the most orders per channel']]);
      return { ds: x[0], ask: L('The ' + x[4] + ': channel, customer_id and n (ties may show more than one).', 'El cliente con más pedidos de cada canal: channel, customer_id y n (con empates puede salir más de uno).'),
        tiles: ['WITH c AS', '(SELECT channel , customer_id , COUNT(*) AS n FROM orders GROUP BY channel , customer_id)', ', r AS', '(SELECT * , RANK() OVER (PARTITION BY channel ORDER BY n DESC) AS rk FROM c)',
          'SELECT', 'channel ,', 'customer_id ,', 'n', 'FROM', 'r', 'WHERE', 'rk = 1'],
        extra: ['rk > 1', 'MAX(n)'], bug: [11, 'rk > 1'], why: L('Count per pair first, then rank inside each channel: RANK keeps ties.', 'Cuenta primero por pareja y después ordena dentro de cada canal: RANK conserva los empates.') };
    },
  ];

  var STEPS = ['open_app', 'view_menu', 'add_to_cart', 'checkout', 'purchase'];
  T[16] = [
    function (r) { // a funnel
      var a = Math.floor(r() * 3), b = a + 1 + Math.floor(r() * (4 - a)), s1 = STEPS[a], s2 = STEPS[Math.min(b, 4)];
      return { ds: 'app', ask: L('A funnel step: how many different users did ' + s1 + ', and how many did ' + s2 + '?', 'Un paso del embudo: ¿cuántos usuarios distintos hicieron ' + s1 + ', y cuántos hicieron ' + s2 + '?'),
        tiles: ['SELECT', "COUNT(DISTINCT CASE WHEN event_name = '" + s1 + "' THEN user_id END) AS step1 ,", "COUNT(DISTINCT CASE WHEN event_name = '" + s2 + "' THEN user_id END) AS step2", 'FROM', 'events'],
        extra: ["COUNT(CASE WHEN event_name = '" + s2 + "' THEN user_id END) AS step2", 'GROUP BY'], bug: [2, "COUNT(CASE WHEN event_name = '" + s2 + "' THEN user_id END) AS step2"],
        why: L('A funnel counts people, not events: DISTINCT counts each user once per step.', 'Un embudo cuenta personas, no eventos: DISTINCT cuenta cada usuario una vez por paso.') };
    },
    function (r) { // A/B conversion
      var k = pick(r, [[1, 'the welcome email test', 'el test del correo de bienvenida'], [4, 'the Black Friday subject line test', 'el test del asunto del Black Friday']]);
      return { ds: 'growth', ask: L('Conversion rate (%) per variant in ' + k[1] + ' (campaign ' + k[0] + '), one decimal: variant and rate.', 'Tasa de conversión (%) por variante en ' + k[2] + ' (campaña ' + k[0] + '), con un decimal: variant y rate.'),
        tiles: ['SELECT', 'a.variant ,', 'ROUND(100.0 * COUNT(c.user_id) / COUNT(*), 1) AS rate', 'FROM', 'assignments a', 'LEFT JOIN', 'conversions c', 'ON c.user_id = a.user_id AND c.campaign_id = a.campaign_id',
          'WHERE', 'a.campaign_id = ' + k[0], 'GROUP BY', 'a.variant'],
        extra: ['JOIN', 'ON c.user_id = a.user_id'], bug: [5, 'JOIN'], why: L('LEFT JOIN keeps everyone assigned; COUNT(c.user_id) counts only the ones who converted.', 'LEFT JOIN conserva a todos los asignados; COUNT(c.user_id) solo cuenta a los que convirtieron.') };
    },
    function (r) { // a rate per segment
      var g = pick(r, [['u.platform', 'platform', 'plataforma'], ['u.referral', 'referral source', 'origen de registro'], ['u.city', 'city', 'ciudad']]);
      return { ds: 'app', ask: L('Purchase rate per ' + g[1] + ': the % of users with at least one purchase, one decimal.', 'Tasa de compra por ' + g[2] + ': el % de usuarios con al menos una compra, con un decimal.'),
        tiles: ['SELECT', g[0] + ' ,', "ROUND(100.0 * COUNT(DISTINCT CASE WHEN e.event_name = 'purchase' THEN e.user_id END) / COUNT(DISTINCT u.user_id), 1) AS rate",
          'FROM', 'users u', 'LEFT JOIN', 'events e', 'ON e.user_id = u.user_id', 'GROUP BY', g[0]],
        extra: ["ROUND(100.0 * COUNT(CASE WHEN e.event_name = 'purchase' THEN 1 END) / COUNT(*), 1) AS rate", 'WHERE'], bug: [2, "ROUND(100.0 * COUNT(CASE WHEN e.event_name = 'purchase' THEN 1 END) / COUNT(*), 1) AS rate"],
        why: L('Divide distinct buyers by distinct users: counting events instead mixes up people and clicks.', 'Divide los compradores distintos entre los usuarios distintos: contar eventos mezcla personas y clics.') };
    },
  ];

  Q.LEVELS = 16;
  Q.templates = function (n) { return T[n] || []; };

  // One puzzle for level n from a seed. About one in four starts as a broken query to fix.
  Q.make = function (n, seed) {
    var r = rng(seed * 31 + n * 7919), list = T[n], t = list[Math.floor(r() * list.length)](r), fix = null;
    if (t.bug && r() < 0.28) {
      fix = t.tiles.slice();
      fix[t.bug[0]] = t.bug[1];
      if (fix.join(' ') === t.tiles.join(' ')) fix = null;
    }
    var extra = t.extra.filter(function (x, i, a) { return a.indexOf(x) === i && (!fix || x !== t.bug[1]) && t.tiles.indexOf(x) < 0; });
    return { id: 'g' + n + '-' + seed, gen: true, lv: n, ds: t.ds, ask: (fix ? L('Fix the bug: ', 'Arregla el error: ') : '') + t.ask, tiles: t.tiles, fix: fix, extra: extra, sql: t.tiles.join(' '), why: t.why };
  };
})();
