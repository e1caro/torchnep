'use strict';
// "I ate something off the plan": the player describes it in their own words, and FitQuest judges it without any server.
// A small food list (Spanish and English) gives each food a health score from -3 to +3 and its calories for a usual portion;
// words like fried, grilled, wholegrain, sugar-free, a lot or a little adjust them. Good food earns XP, junk food costs XP.

// keywords (accent-free stems, | between them), Spanish name, English name, score, kcal per usual portion, kind
const FOODS = [
  // vegetables and salads
  ['ensalad|salad', 'Ensalada', 'Salad', 3, 150, 'veg'], ['brocoli|broccoli', 'Brócoli', 'Broccoli', 3, 50, 'veg'], ['espinac|spinach', 'Espinacas', 'Spinach', 3, 40, 'veg'],
  ['verdura|vegetal|vegetable|veggie|menestra|pisto', 'Verduras', 'Vegetables', 3, 90, 'veg'], ['tomate|tomato', 'Tomate', 'Tomato', 3, 25, 'veg'], ['lechuga|lettuce', 'Lechuga', 'Lettuce', 3, 15, 'veg'],
  ['zanahori|carrot', 'Zanahoria', 'Carrot', 3, 35, 'veg'], ['pepino|cucumber', 'Pepino', 'Cucumber', 3, 15, 'veg'], ['calabacin|zucchini|courgette', 'Calabacín', 'Zucchini', 3, 30, 'veg'],
  ['pimiento|pepper', 'Pimiento', 'Pepper', 3, 30, 'veg'], ['champinon|seta|mushroom', 'Champiñones', 'Mushrooms', 3, 30, 'veg'], ['berenjen|eggplant|aubergine', 'Berenjena', 'Aubergine', 3, 40, 'veg'],
  ['coliflor|cauliflower', 'Coliflor', 'Cauliflower', 3, 40, 'veg'], ['judia verde|green bean', 'Judías verdes', 'Green beans', 3, 40, 'veg'], ['esparrago|asparagus', 'Espárragos', 'Asparagus', 3, 30, 'veg'],
  ['gazpacho|salmorejo', 'Gazpacho', 'Gazpacho', 2, 150, 'veg'], ['crema de verdura|pure de verdura|vegetable soup|sopa de verdura', 'Crema de verduras', 'Vegetable soup', 3, 150, 'veg'],
  ['aguacate|avocado|guacamole', 'Aguacate', 'Avocado', 2, 200, 'fat'], ['cebolla|onion', 'Cebolla', 'Onion', 2, 30, 'veg'], ['kale|col rizada|repollo|cabbage', 'Col', 'Cabbage', 3, 30, 'veg'],
  // fruit
  ['fruta|fruit', 'Fruta', 'Fruit', 3, 80, 'fruit'], ['manzana|apple', 'Manzana', 'Apple', 3, 80, 'fruit'], ['platano|banana|banano', 'Plátano', 'Banana', 3, 105, 'fruit'],
  ['naranja|orange', 'Naranja', 'Orange', 3, 60, 'fruit'], ['fresa|strawberr', 'Fresas', 'Strawberries', 3, 50, 'fruit'], ['pera|pear', 'Pera', 'Pear', 3, 90, 'fruit'],
  ['uva|grape', 'Uvas', 'Grapes', 2, 100, 'fruit'], ['sandia|watermelon', 'Sandía', 'Watermelon', 3, 80, 'fruit'], ['melon', 'Melón', 'Melon', 3, 60, 'fruit'],
  ['pina|pineapple', 'Piña', 'Pineapple', 3, 80, 'fruit'], ['kiwi', 'Kiwi', 'Kiwi', 3, 45, 'fruit'], ['mango', 'Mango', 'Mango', 2, 100, 'fruit'],
  ['arandano|blueberr|frutos rojos|berries|frambues|raspberr', 'Frutos rojos', 'Berries', 3, 60, 'fruit'], ['melocoton|peach|nectarin', 'Melocotón', 'Peach', 3, 60, 'fruit'],
  ['macedonia|fruit salad', 'Macedonia', 'Fruit salad', 3, 120, 'fruit'], ['datil|date', 'Dátiles', 'Dates', 1, 120, 'fruit'], ['pasa|raisin', 'Pasas', 'Raisins', 1, 120, 'fruit'],
  // protein
  ['pollo|chicken', 'Pollo', 'Chicken', 2, 220, 'protein'], ['pavo|turkey', 'Pavo', 'Turkey', 2, 180, 'protein'], ['pechuga|breast', 'Pechuga', 'Chicken breast', 3, 180, 'protein'],
  ['huevo|egg|tortilla francesa|omelet', 'Huevos', 'Eggs', 2, 150, 'protein'], ['tortilla de patata|tortilla espanola|spanish omelet', 'Tortilla de patatas', 'Spanish omelette', 0, 350, 'mixed'],
  ['salmon', 'Salmón', 'Salmon', 3, 280, 'protein'], ['atun|tuna', 'Atún', 'Tuna', 3, 150, 'protein'], ['pescado|fish|merluza|hake|bacalao|cod|dorada|lubina|sea bass', 'Pescado', 'Fish', 3, 200, 'protein'],
  ['sardina|sardine|caballa|mackerel|boqueron|anchov', 'Pescado azul', 'Oily fish', 3, 200, 'protein'], ['gamba|langostino|prawn|shrimp|marisco|seafood|mejillon|mussel|calamar|squid|pulpo|octopus', 'Marisco', 'Seafood', 2, 150, 'protein'],
  ['ternera|beef|filete|steak|solomillo|entrecot', 'Ternera', 'Beef', 1, 300, 'protein'], ['cerdo|pork|lomo|chuleta', 'Cerdo', 'Pork', 1, 280, 'protein'], ['cordero|lamb', 'Cordero', 'Lamb', 0, 320, 'protein'],
  ['tofu|tempeh|seitan', 'Tofu', 'Tofu', 3, 150, 'protein'], ['proteina|protein shake|batido de proteina|whey', 'Batido de proteínas', 'Protein shake', 2, 150, 'protein'],
  ['albondiga|meatball', 'Albóndigas', 'Meatballs', 0, 350, 'mixed'], ['carne picada|minced meat|ground beef', 'Carne picada', 'Minced meat', 0, 300, 'protein'],
  // legumes, grains, starches
  ['lenteja|lentil', 'Lentejas', 'Lentils', 3, 300, 'legume'], ['garbanzo|chickpea|hummus|humus', 'Garbanzos', 'Chickpeas', 3, 280, 'legume'], ['alubia|judion|frijol|bean', 'Alubias', 'Beans', 3, 280, 'legume'],
  ['quinoa', 'Quinoa', 'Quinoa', 3, 220, 'grain'], ['avena|oat|porridge|gachas', 'Avena', 'Oats', 3, 200, 'grain'], ['arroz integral|brown rice', 'Arroz integral', 'Brown rice', 2, 250, 'grain'],
  ['arroz|rice|risotto', 'Arroz', 'Rice', 1, 260, 'grain'], ['paella', 'Paella', 'Paella', 1, 450, 'mixed'], ['pasta|espagueti|spaghetti|macarron|macaroni|tallarin|noodle|fideo|lasana|lasagna', 'Pasta', 'Pasta', 1, 400, 'grain'],
  ['pan integral|wholemeal bread|whole wheat bread|wholegrain bread', 'Pan integral', 'Wholegrain bread', 2, 160, 'grain'], ['pan|bread|baguette|bocadillo|sandwich|bocata|tostada|toast', 'Pan', 'Bread', 0, 200, 'grain'],
  ['patata cocida|patata hervida|boiled potato|patata al horno|baked potato|boniato|sweet potato', 'Patata asada', 'Baked potato', 2, 180, 'grain'], ['patata|potato|pure|mashed', 'Patata', 'Potato', 1, 200, 'grain'],
  ['cuscus|couscous', 'Cuscús', 'Couscous', 1, 250, 'grain'], ['cereales integrales|muesli|granola casera', 'Muesli', 'Muesli', 2, 220, 'grain'], ['cereal|corn flakes|cornflakes', 'Cereales', 'Cereal', -1, 220, 'sweet'],
  ['wrap|burrito|tortilla de trigo', 'Wrap', 'Wrap', 0, 450, 'mixed'], ['poke', 'Poke bowl', 'Poke bowl', 2, 500, 'mixed'], ['sushi|maki|sashimi|nigiri', 'Sushi', 'Sushi', 1, 400, 'mixed'],
  ['sopa|soup|caldo|broth|consome', 'Sopa', 'Soup', 2, 150, 'veg'], ['cocido|estofado|guiso|stew|potaje|fabada', 'Guiso', 'Stew', 1, 450, 'mixed'],
  // dairy, nuts, fats
  ['yogur natural|yogur griego|greek yogurt|plain yogurt|kefir|skyr', 'Yogur natural', 'Plain yogurt', 3, 120, 'dairy'], ['yogur|yogurt|yoghurt', 'Yogur', 'Yogurt', 1, 120, 'dairy'],
  ['leche|milk', 'Leche', 'Milk', 1, 120, 'dairy'], ['queso fresco|requeson|cottage|mozzarella|burrata', 'Queso fresco', 'Fresh cheese', 2, 150, 'dairy'], ['queso|cheese', 'Queso', 'Cheese', 0, 200, 'dairy'],
  ['nuez|nueces|almendra|anacardo|pistacho|avellana|frutos secos|nuts|almond|walnut|cashew|pistachio|hazelnut|cacahuete|peanut', 'Frutos secos', 'Nuts', 2, 180, 'fat'],
  ['crema de cacahuete|peanut butter|mantequilla de cacahuete', 'Crema de cacahuete', 'Peanut butter', 1, 190, 'fat'], ['aceite de oliva|olive oil|aove', 'Aceite de oliva', 'Olive oil', 2, 90, 'fat'],
  ['mantequilla|butter|margarina', 'Mantequilla', 'Butter', -1, 100, 'fat'], ['nata|cream|mayonesa|mayo|alioli|aioli', 'Nata o mayonesa', 'Cream or mayo', -2, 150, 'fat'],
  // drinks
  ['agua|water', 'Agua', 'Water', 2, 0, 'drink'], ['te|tea|infusion|matcha', 'Té', 'Tea', 2, 5, 'drink'], ['cafe|coffee|espresso|cortado|americano', 'Café', 'Coffee', 0, 20, 'drink'],
  ['zumo natural|zumo de naranja natural|fresh juice|smoothie|batido de fruta', 'Zumo natural', 'Fresh juice', 1, 120, 'drink'], ['zumo|juice', 'Zumo', 'Juice', -1, 120, 'sugar'],
  ['refresco|coca|cola|cocacola|coke|pepsi|fanta|sprite|soda|soft drink|gaseosa', 'Refresco', 'Soft drink', -3, 140, 'sugar'], ['bebida energetica|energy drink|red bull|monster', 'Bebida energética', 'Energy drink', -2, 110, 'sugar'],
  ['batido|milkshake|frappe|frappuccino', 'Batido', 'Milkshake', -2, 400, 'sugar'], ['chocolate caliente|cola cao|colacao|nesquik|hot chocolate', 'Cacao con azúcar', 'Hot chocolate', -1, 200, 'sugar'],
  ['cerveza|beer|cana|caña|tercio|birra', 'Cerveza', 'Beer', -2, 150, 'alcohol'], ['vino|wine|cava|champan|champagne|sangria|tinto de verano', 'Vino', 'Wine', -1, 125, 'alcohol'],
  ['cubata|ron|ginebra|gin|vodka|whisky|tequila|chupito|shot|cocktail|coctel|mojito|calimocho|kalimotxo', 'Alcohol', 'Spirits', -3, 220, 'alcohol'],
  // fast food and junk
  ['hamburguesa|burger|whopper|big mac', 'Hamburguesa', 'Burger', -2, 550, 'fast'], ['pizza', 'Pizza', 'Pizza', -2, 700, 'fast'], ['kebab|doner|durum|shawarma', 'Kebab', 'Kebab', -2, 700, 'fast'],
  ['hot dog|perrito', 'Perrito caliente', 'Hot dog', -2, 400, 'fast'], ['nugget|alitas|wings|tiras de pollo|chicken strips|fingers', 'Nuggets', 'Nuggets', -2, 450, 'fast', 1],
  ['patatas fritas|french fries|fries|papas fritas|bravas', 'Patatas fritas', 'Fries', -3, 400, 'fast', 1], ['patatas de bolsa|chips|crisps|doritos|ruffles|lays|snack|gusanitos|cheetos', 'Patatas de bolsa', 'Crisps', -3, 300, 'snack', 1],
  ['taco|nachos|quesadilla', 'Nachos', 'Nachos', -1, 500, 'fast'], ['mcdonald|burger king|kfc|telepizza|dominos|five guys|fast food|comida rapida', 'Comida rápida', 'Fast food', -3, 900, 'fast'],
  ['croqueta|croquette|empanadilla|san jacinto', 'Fritos', 'Fried food', -2, 300, 'fast', 1], ['calamares a la romana|calamares fritos|bocadillo de calamares', 'Calamares fritos', 'Fried squid', -2, 450, 'fast', 1],
  ['salchicha|sausage|pepperoni|chorizo|salchichon|fuet|morcilla|bacon|beicon|panceta|mortadela|lomo embuchado|sobrasada', 'Embutido', 'Processed meat', -2, 300, 'processed'],
  ['jamon serrano|jamon iberico|serrano ham|cured ham', 'Jamón serrano', 'Cured ham', 0, 150, 'processed'], ['jamon york|jamon cocido|ham', 'Jamón cocido', 'Ham', 0, 100, 'processed'],
  // sweets
  ['chocolate negro|dark chocolate|cacao puro', 'Chocolate negro', 'Dark chocolate', 0, 150, 'sweet'], ['chocolate|chocolatina|kinder|nutella|nocilla|snickers|kitkat|twix|mars', 'Chocolate', 'Chocolate', -2, 250, 'sweet'],
  ['galleta|cookie|biscuit|oreo|principe|maria', 'Galletas', 'Cookies', -2, 250, 'sweet'], ['donut|dona|berlina|bolleria|bollo|napolitana|palmera|magdalena|muffin|cupcake', 'Bollería', 'Pastries', -3, 350, 'sweet'],
  ['croissant|cruasan|cruason|ensaimada', 'Cruasán', 'Croissant', -2, 300, 'sweet'], ['tarta|pastel|cake|cheesecake|brownie|bizcocho|flan|natillas|tiramisu|churro|porra', 'Tarta o postre', 'Cake or dessert', -3, 400, 'sweet'],
  ['helado|ice cream|gelato|polo', 'Helado', 'Ice cream', -2, 250, 'sweet'], ['gominola|chuche|golosina|candy|sweets|caramelo|gummies|regaliz', 'Chucherías', 'Candy', -3, 200, 'sweet'],
  ['azucar|sugar|miel|honey|mermelada|jam|sirope|syrup', 'Azúcar o miel', 'Sugar or honey', -1, 60, 'sweet'], ['tostada con|tostadas con', 'Tostada', 'Toast', 0, 200, 'grain'],
  ['barrita|cereal bar|protein bar', 'Barrita', 'Snack bar', -1, 200, 'snack'],
].map(([kw, es, en, s, kcal, kind, fried]) => ({ kws: kw.split('|'), es, en, s, kcal, kind, fried: !!fried }));
// calories of one piece, for foods people count ("3 cookies", "two eggs")
const UNIT = { Galletas: 50, Huevos: 75, Fritos: 60, Nuggets: 50, Bollería: 250, Cruasán: 230, Plátano: 105, Manzana: 80, Naranja: 60, Pera: 90, Kiwi: 45,
  Cerveza: 150, Vino: 125, Alcohol: 200, Refresco: 140, Sushi: 45, Nachos: 180, Chocolate: 120, 'Tarta o postre': 300, Helado: 200, 'Perrito caliente': 300, Hamburguesa: 550, Pizza: 280, Pan: 80, 'Pan integral': 80, Tostada: 80 };

const fnorm = t => String(t).toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '').replace(/ñ/g, 'n');
const MODS = {
  fried: /\b(frit|rebozad|empanad|fried|battered|tempura|crispy|crujient|deep)/,
  light: /\b(plancha|grill|parrilla|vapor|steam|hornead|al horno|baked|crud|raw|hervid|cocid|boiled|asad|roast|poach)/,
  whole: /\b(integral|whole ?grain|wholemeal|whole wheat)/,
  sugar: /\b(azucarad|con azucar|sweetened|con nata|whipped|caramel|con chocolate|glaseado|glazed)/,
  nosugar: /\b(sin azucar|zero|diet|light|sin alcohol|0,0|0\.0|sugar[- ]free|alcohol[- ]free)/,
  home: /\b(casero|casera|homemade|home made)/,
  big: /\b(mucho|mucha|muchos|muchas|grande|doble|xl|enorme|lot|lots|large|big|double|tons|bandeja|bote entero)/,
  small: /\b(poco|poca|pequen|media|medio|mini|small|little|half|bit|un trozo|a piece|bite)/,
};
const QTY = { un: 1, una: 1, uno: 1, a: 1, an: 1, one: 1, dos: 2, two: 2, tres: 3, three: 3, cuatro: 4, four: 4, cinco: 5, five: 5, seis: 6, six: 6 };

// judge a description: which foods, how healthy, about how many calories
function judgeFood(text) {
  const segs = fnorm(text).split(/,|;|\.|\+|\s(?:y|e|con|and|with|plus|mas|tambien|also|luego|then|despues|de postre)\s/).map(x => x.trim()).filter(Boolean);
  const items = [], unknown = [];
  segs.forEach(seg => {
    // every food in the segment, longest keywords first, without overlaps
    const hits = [];
    FOODS.forEach(f => f.kws.forEach(k => {
      // short words must match whole (so "te" is not "ternera"); longer ones are stems ("ensalad" for ensalada, ensaladas)
      const kk = k.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), re = new RegExp(`(^|[^a-z])${kk}${k.length <= 4 ? '(?:s|es)?(?![a-z])' : ''}`, 'g');
      let m; while ((m = re.exec(seg))) hits.push({ f, at: m.index + m[1].length, len: k.length });
    }));
    hits.sort((a, b) => b.len - a.len);
    const used = [], found = [];
    hits.forEach(h => { if (!used.some(([a, b]) => h.at < b && a < h.at + h.len) && !found.includes(h.f)) { used.push([h.at, h.at + h.len]); found.push(h.f); } });
    if (!found.length) { if (/[a-z]{3}/.test(seg)) unknown.push(seg); return; }
    const num = +(seg.match(/\b([2-9])\b/) || [])[1] || QTY[(seg.match(/^(\w+)/) || [])[1]] || 1;
    // a plain food gives way to its better-described version found in the same words (pan / pan integral)
    const kept = found.filter(f => !found.some(o => o !== f && o.kind === f.kind && o.es.startsWith(f.es + ' ')));
    kept.forEach(f => {
      let s = f.s, k = f.kcal, mods = [];
      if (MODS.fried.test(seg) && !f.fried && f.kind !== 'drink') { s -= 2.5; k *= 1.5; mods.push('fried'); }
      else if (MODS.light.test(seg) && f.s > -2) { s += .5; mods.push('light'); }
      if (MODS.whole.test(seg) && f.kind === 'grain') { s += 1; mods.push('whole'); }
      if (MODS.sugar.test(seg)) { s -= 1; k += 80; mods.push('sugar'); }
      if (MODS.nosugar.test(seg) && (f.kind === 'sugar' || f.kind === 'alcohol')) { s = 0; k = f.kind === 'alcohol' ? 40 : 10; mods.push('nosugar'); }
      if (MODS.home.test(seg) && f.s < 2) { s += .5; mods.push('home'); }
      let q = Math.min(4, num);
      if (num > 1 && UNIT[f.es]) { k = UNIT[f.es]; q = Math.min(8, num); } // counted pieces
      if (MODS.big.test(seg)) { q *= 1.6; if (s < 0) s *= 1.3; }
      if (MODS.small.test(seg)) q *= .6;
      items.push({ name: f[LANG === 'es' ? 'es' : 'en'], s: Math.max(-3, Math.min(3, s)), kcal: Math.round(k * q), kind: f.kind, mods });
    });
  });
  if (!items.length) return { items, unknown, ok: false };
  // the verdict leans towards the bigger parts of the meal
  const w = items.map(i => Math.sqrt(Math.max(30, i.kcal)));
  let score = items.reduce((a, i, n) => a + i.s * w[n], 0) / w.reduce((a, b) => a + b, 0);
  const kcal = items.reduce((a, i) => a + i.kcal, 0);
  if (score < 0 && kcal < 250) score *= .7; // a small treat is not a feast
  const tier = score >= 1.8 ? 0 : score >= .8 ? 1 : score > -.4 ? 2 : score > -1.6 ? 3 : 4;
  const xp = [20, 12, 0, -10, -20][tier] - (kcal > 1400 && score < 0 ? 5 : 0);
  return { items, unknown, ok: true, score, kcal, tier, xp };
}
const VERDICT = [['🥇', 'Excellent choice'], ['👍', 'Good choice'], ['😐', 'So-so'], ['⚠️', 'Not very healthy'], ['🚫', 'Junk food']];
function foodTip(j) {
  const worst = [...j.items].sort((a, b) => a.s - b.s)[0], k = worst.kind;
  if (j.tier <= 1) return j.tier === 0 ? 'This is how champions eat.' : 'Nice. Real food fuels real gains.';
  if (worst.mods.includes('fried') || ['fast'].includes(k) && worst.s <= -2) return 'Next time try it grilled or baked: same taste, far less fat.';
  if (k === 'sugar') return 'Swap it for water, sparkling water or a sugar-free drink.';
  if (k === 'alcohol') return 'Alcohol slows down muscle recovery. Water between drinks helps.';
  if (k === 'sweet') return 'Craving something sweet? Fruit or plain yogurt with honey hits the spot.';
  if (k === 'processed') return 'Chicken, turkey or tuna give you the protein without the extra salt and fat.';
  if (k === 'snack') return 'Nuts or fruit are a snack that actually helps you.';
  return 'Add vegetables or a lean protein to balance it out.';
}

// ---------- saving and XP ----------
const FL = (G.food = G.food || {});
const flDay = () => (FL[dayId()] = FL[dayId()] || []);
const FL_CAP = 60; // most XP you can win, or lose, from off-plan food in one day
window.foodJudge = () => {
  const inp = document.querySelector('.foodlog textarea'), text = (inp?.value || '').trim();
  if (text.length < 3) { toast('Describe what you ate.'); return; }
  const j = judgeFood(text);
  if (!j.ok) { FL.last = { text, j }; commit(); flRefresh(); return; }
  const day = flDay(), same = day.some(e => fnorm(e.text) === fnorm(text));
  const won = day.filter(e => e.xp > 0).reduce((a, e) => a + e.xp, 0), lost = day.filter(e => e.xp < 0).reduce((a, e) => a - e.xp, 0);
  let xp = same ? 0 : j.xp > 0 ? Math.min(j.xp, FL_CAP - won) : -Math.min(-j.xp, FL_CAP - lost);
  // losing XP never takes away a level you already reached
  if (xp < 0) xp = -Math.min(-xp, Math.max(0, G.xp - totalXp(lvl())));
  if (xp > 0) award(xp, 0); else if (xp < 0) G.xp += xp;
  const e = { t: Date.now(), text, xp, kcal: j.kcal, tier: j.tier, items: j.items.map(i => [i.name, i.s, i.kcal]) };
  day.unshift(e); FL.last = { text, j, xp, same };
  Object.keys(FL).filter(k => k !== 'last' && k < dayId(Date.now() - 14 * 864e5)).forEach(k => delete FL[k]);
  commit(); sfx(xp >= 0 ? 'claim' : 'tick'); if (xp) toast(`${xp > 0 ? '+' : ''}${xp} XP`);
  flushLevelUp(); flRefresh();
};
window.foodUndo = t => {
  const day = flDay(), i = day.findIndex(e => e.t === t);
  if (i < 0) return;
  const [e] = day.splice(i, 1);
  G.xp -= e.xp; if (FL.last && FL.last.text === e.text) delete FL.last;
  commit(); flRefresh();
};
window.foodClear = () => { delete FL.last; commit(); flRefresh(); };
function flRefresh() { const name = (location.hash || '#/home').split('/')[1] || 'home'; if (name === 'meals') mealsView(); else home(); }

// ---------- on screen ----------
const kindCls = s => (s >= 1 ? 'good' : s <= -1 ? 'bad' : 'meh');
function foodCard() {
  const day = flDay(), L = FL.last, kc = day.reduce((a, e) => a + e.kcal, 0), xp = day.reduce((a, e) => a + e.xp, 0);
  let res = '';
  if (L && !L.j.ok) res = `<div class="flres meh"><div class="mut">I didn't recognise any food there. Try with simple words, for example "a burger with fries and a coke".</div><button class="btn sm ghost" onclick="foodClear()">OK</button></div>`;
  else if (L) {
    const j = L.j, [emo, title] = VERDICT[j.tier];
    res = `<div class="flres t${j.tier}"><div class="row between"><div class="flv"><span class="flemo">${emo}</span><b>${title}</b></div>
      <b class="flxp ${L.xp > 0 ? 'up' : L.xp < 0 ? 'down' : ''}">${L.xp > 0 ? '+' : ''}${L.xp} XP</b></div>
      <div class="flitems">${j.items.map(i => `<span class="flit ${kindCls(i.s)}"><b translate="no">${esc(i.name)}</b><i>${i.kcal} kcal</i></span>`).join('')}</div>
      <div class="mut">About ${fmtK(j.kcal)} kcal.</div>
      ${L.same ? '<div class="mut">You already logged this today, so no XP this time.</div>' : ''}
      ${j.unknown.length ? `<div class="mut">Not recognised: <span translate="no">${esc(j.unknown.slice(0, 3).join(', '))}</span></div>` : ''}
      <div class="fltip">${foodTip(j)}</div><button class="btn sm ghost" onclick="foodClear()">OK</button></div>`;
  }
  return `<section class="card foodlog"><h3>${gi('chef', 'hero')} Ate something off the plan?</h3>
    ${res || `<textarea rows="2" placeholder="Describe it, e.g. grilled chicken with salad, or a burger with fries and a coke"></textarea>
    <button class="btn" onclick="foodJudge()">Judge my food</button>`}
    ${day.length ? `<div class="lbl">Today off the plan · ${fmtK(kc)} kcal · ${xp > 0 ? '+' : ''}${xp} XP</div>
      ${day.map(e => `<div class="row flrow"><span class="fldot t${e.tier}"></span><span class="grow" translate="no">${esc(e.text)}</span><b class="${e.xp > 0 ? 'up' : e.xp < 0 ? 'down' : ''}">${e.xp > 0 ? '+' : ''}${e.xp}</b><button class="icon" aria-label="Remove" onclick="foodUndo(${e.t})">✕</button></div>`).join('')}` : ''}
  </section>`;
}
const fmtK = n => Math.round(n).toLocaleString(LANG === 'es' ? 'es-ES' : 'en-GB');

const _flHome = home;
home = function () {
  _flHome();
  const anchor = view.querySelector(':scope > section.card.mealsnow, :scope > section.card[onclick*="#/meals"]');
  if (anchor) anchor.insertAdjacentHTML('afterend', foodCard());
};
const _flMeals = mealsView;
mealsView = function (arg) { _flMeals(arg); }; // the food log lives on Today's Meals panel only
Object.assign(routes, { home, meals: mealsView });

if (typeof i18nAdd === 'function') i18nAdd({
  'Ate something off the plan?': '¿Comiste algo fuera del plan?', 'Judge my food': 'Juzgar mi comida',
  'Describe it, e.g. grilled chicken with salad, or a burger with fries and a coke': 'Descríbelo, p. ej. pollo a la plancha con ensalada, o una hamburguesa con patatas fritas y una coca-cola',
  'Describe what you ate.': 'Describe lo que comiste.', 'Excellent choice': 'Excelente elección', 'Good choice': 'Buena elección', 'So-so': 'Regular',
  'Not very healthy': 'Poco saludable', 'Junk food': 'Comida basura', 'About {n} kcal.': 'Unos {n} kcal.',
  'You already logged this today, so no XP this time.': 'Ya lo registraste hoy, así que esta vez no da XP.', 'Not recognised:': 'No reconocido:',
  "I didn't recognise any food there. Try with simple words, for example \"a burger with fries and a coke\".": 'No he reconocido ninguna comida. Prueba con palabras sencillas, por ejemplo "una hamburguesa con patatas fritas y una coca-cola".',
  'This is how champions eat.': 'Así comen los campeones.', 'Nice. Real food fuels real gains.': 'Bien. La comida de verdad da resultados de verdad.',
  'Next time try it grilled or baked: same taste, far less fat.': 'La próxima vez pruébalo a la plancha o al horno: mismo sabor, mucha menos grasa.',
  'Swap it for water, sparkling water or a sugar-free drink.': 'Cámbialo por agua, agua con gas o una bebida sin azúcar.',
  'Alcohol slows down muscle recovery. Water between drinks helps.': 'El alcohol frena la recuperación muscular. Beber agua entre copas ayuda.',
  'Craving something sweet? Fruit or plain yogurt with honey hits the spot.': '¿Te apetece algo dulce? Fruta o yogur natural con miel lo arreglan.',
  'Chicken, turkey or tuna give you the protein without the extra salt and fat.': 'Pollo, pavo o atún te dan la proteína sin tanta sal ni grasa.',
  'Nuts or fruit are a snack that actually helps you.': 'Frutos secos o fruta: un picoteo que sí te ayuda.',
  'Add vegetables or a lean protein to balance it out.': 'Añade verduras o una proteína magra para equilibrarlo.',
  'Today off the plan · {n} kcal · {n} XP': 'Hoy fuera del plan · {n} kcal · {n} XP', 'Today off the plan · {n} kcal · +{n} XP': 'Hoy fuera del plan · {n} kcal · +{n} XP',
});
