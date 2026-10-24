'use strict';
// Anti-inflammatory eating style. A recipe is tagged `ai` when it is built around foods that anti-inflammatory
// (Mediterranean-style) eating emphasises and leaves out the usual things to limit.
//   Emphasised: fatty fish, leafy greens and vegetables, berries, nuts and seeds, beans and lentils, olive oil, whole grains.
//   Left out:   red meat, refined pasta and couscous, added sugar and syrups (more than a teaspoon).
// General nutrition guidance, not medical advice.

Object.assign(ING, {
  sardines: ['Sardines (canned)', 208, 25, 0, 11, 'F', 'Meat & fish'],
  mackerel: ['Mackerel fillet', 205, 19, 0, 14, 'F', 'Meat & fish'],
  kale: ['Kale', 49, 4.3, 9, 0.9, '', 'Produce'],
  beet: ['Beetroot', 43, 1.6, 10, 0.2, '', 'Produce'],
  cauliflower: ['Cauliflower', 25, 1.9, 5, 0.3, '', 'Produce'],
  brownrice: ['Brown rice (dry)', 360, 7.5, 76, 2.7, '', 'Pantry'],
  flax: ['Ground flaxseed', 534, 18, 29, 42, '', 'Pantry'],
});

const AI_GOOD = new Set(('salmon sardines mackerel berries spinach kale broccoli cauliflower tomato passata onion pepper mushroom carrot greens eggplant asparagus beet avocado olives oil ' +
  'walnuts almonds chia flax sesame lentils chickpeas blackbeans whitebeans edamame tofu tempeh quinoa oats brownrice sweetpotato apple mango peas hummus').split(' '));
const AI_AVOID = new Set(['beef', 'lamb', 'pasta', 'couscous']);
const AI_SWEET = new Set(['honey', 'maple']);

const A = (cu, ...a) => ({ ...R(...a), ...(cu ? { cu: [cu] } : {}) });
RECIPES.push(
  // ---- breakfasts ----
  A(null, 'ai-goldenoats', 'Golden turmeric oats', '🌾', 'b', 10, [['oats', 60], ['plantmilk', 200], ['berries', 80], ['walnuts', 15], ['chia', 10], ['flax', 10]], ['Simmer the oats in the plant milk with a pinch of turmeric, cinnamon and black pepper for 5 minutes.', 'Stir in chia and flaxseed.', 'Top with berries and chopped walnuts.']),
  A(null, 'ai-greenbowl', 'Green berry smoothie bowl', '🥬', 'b', 5, [['spinach', 60], ['banana', 80], ['berries', 100], ['plantmilk', 150], ['chia', 15], ['almonds', 15], ['flax', 10]], ['Blend spinach, banana, half the berries and the plant milk until thick.', 'Pour into a bowl.', 'Top with the rest of the berries, chia, almonds and flaxseed.']),
  A('spanish', 'ai-sardinetoast', 'Sardines on toast with tomato', '🐟', 'b', 8, [['bread', 70], ['sardines', 90], ['tomato', 100], ['avocado', 50], ['oil', 5], ['greens', 20]], ['Toast the bread and spread with mashed avocado.', 'Top with sardines and sliced tomato.', 'Finish with a drizzle of oil, pepper and a squeeze of lemon.']),
  A(null, 'ai-turmericomelette', 'Turmeric veggie omelette', '🍳', 'b', 12, [['egg', 200], ['spinach', 50], ['mushroom', 60], ['tomato', 60], ['oil', 8]], ['Sauté mushroom and tomato in the oil with a pinch of turmeric and pepper.', 'Add spinach until wilted.', 'Pour in the beaten eggs and cook until set.']),
  // ---- lunches and dinners ----
  A(null, 'ai-salmonquinoa', 'Baked salmon, quinoa and kale', '🐟', 'm', 30, [['salmon', 150], ['quinoa', 60], ['kale', 100], ['oil', 10], ['tomato', 60]], ['Cook the quinoa for 15 minutes.', 'Bake the salmon at 200 °C for 12 minutes with lemon and pepper.', 'Sauté the kale and tomato in the oil and serve together.']),
  A(null, 'ai-mackerel', 'Mackerel with beetroot and potatoes', '🐟', 'm', 35, [['mackerel', 150], ['beet', 100], ['potato', 150], ['greens', 40], ['oil', 8]], ['Boil the potatoes and beetroot until tender, about 20 minutes.', 'Pan-fry the mackerel in the oil, 3 minutes per side.', 'Serve on greens with lemon.']),
  A('indian', 'ai-turmericlentil', 'Turmeric lentil and vegetable soup', '🍲', 'm', 30, [['lentils', 200], ['carrot', 60], ['onion', 50], ['spinach', 60], ['passata', 80], ['cauliflower', 80], ['oil', 8]], ['Soften onion and carrot in the oil with turmeric, ginger and cumin.', 'Add lentils, cauliflower, passata and 500 ml water and simmer 15 minutes.', 'Stir in spinach and season.']),
  A('indian', 'ai-chickpeastew', 'Turmeric chickpea and cauliflower stew', '🥘', 'm', 30, [['chickpeas', 180], ['cauliflower', 150], ['passata', 120], ['spinach', 60], ['onion', 50], ['oil', 8], ['brownrice', 55]], ['Cook the brown rice, about 25 minutes.', 'Soften onion in the oil with turmeric and cumin, add cauliflower, chickpeas and passata.', 'Simmer 15 minutes and stir in spinach.']),
  A('chinese', 'ai-tofubowl', 'Ginger tofu rainbow bowl', '🥗', 'm', 25, [['tofu', 180], ['brownrice', 60], ['broccoli', 100], ['carrot', 60], ['pepper', 60], ['sesame', 8], ['oil', 8]], ['Cook the brown rice.', 'Fry the cubed tofu in the oil with grated ginger until golden.', 'Steam or stir-fry the vegetables and serve over rice with sesame.']),
  A('spanish', 'ai-shrimpkale', 'Garlic shrimp with kale and quinoa', '🍤', 'm', 20, [['shrimp', 150], ['kale', 100], ['quinoa', 60], ['oil', 10], ['tomato', 80]], ['Cook the quinoa.', 'Sear the shrimp in the oil with garlic for 3 minutes and set aside.', 'Wilt the kale and tomato in the same pan, add the shrimp and serve over quinoa.']),
  A(null, 'ai-herbchicken', 'Herb chicken with roasted vegetables', '🍗', 'm', 35, [['chicken', 170], ['sweetpotato', 150], ['broccoli', 100], ['cauliflower', 100], ['oil', 12]], ['Heat the oven to 210 °C.', 'Toss the vegetables with half the oil on a tray and roast 10 minutes.', 'Add the herb-rubbed chicken and roast 22 more minutes.']),
  A('greek', 'ai-tunasalad', 'Mediterranean tuna salad bowl', '🥗', 'm', 10, [['tuna', 120], ['chickpeas', 100], ['greens', 60], ['olives', 30], ['tomato', 100], ['cucumber', 60], ['oil', 10]], ['Chop the tomato and cucumber.', 'Toss with greens, chickpeas, olives and tuna.', 'Dress with oil, lemon and pepper.']),
  A('mexican', 'ai-beanbowl', 'Black bean and sweet potato bowl', '🍠', 'm', 30, [['blackbeans', 150], ['sweetpotato', 200], ['kale', 60], ['avocado', 50], ['tomato', 60], ['oil', 5]], ['Roast cubed sweet potato with the oil at 210 °C for 22 minutes.', 'Warm the beans with cumin and wilt the kale.', 'Assemble the bowl with tomato and avocado.']),
  A('greek', 'ai-codtray', 'Lemon cod tray bake', '🐟', 'm', 25, [['cod', 180], ['asparagus', 120], ['tomato', 100], ['potato', 150], ['oil', 10]], ['Heat the oven to 210 °C and roast sliced potato with half the oil for 12 minutes.', 'Add cod, asparagus and tomato with lemon and the rest of the oil.', 'Bake 12 more minutes.']),
  A('japanese', 'ai-tempehstirfry', 'Tempeh and broccoli stir-fry', '🥦', 'm', 25, [['tempeh', 150], ['broccoli', 150], ['pepper', 80], ['brownrice', 55], ['sesame', 8], ['oil', 8]], ['Cook the brown rice.', 'Pan-fry sliced tempeh in the oil until golden, 5 minutes.', 'Add broccoli and pepper with a splash of water and stir-fry 6 minutes. Finish with sesame.']),
  // ---- snacks ----
  A(null, 'ai-walnutyogurt', 'Yogurt with berries and walnuts', '🫐', 's', 3, [['gyogurt', 150], ['berries', 100], ['walnuts', 20], ['chia', 5]], ['Spoon the yogurt into a glass.', 'Top with berries, chopped walnuts and chia.']),
  A(null, 'ai-applewalnut', 'Apple, walnuts and chia', '🍎', 's', 3, [['apple', 180], ['walnuts', 25], ['chia', 5]], ['Slice the apple.', 'Serve with the walnuts, sprinkled with chia and cinnamon.']),
  A('middleeast', 'ai-hummuscarrot', 'Hummus, carrot and olives', '🥕', 's', 5, [['hummus', 80], ['carrot', 100], ['cucumber', 80], ['olives', 20]], ['Cut the carrot and cucumber into sticks.', 'Serve with hummus and olives.']),
  A('spanish', 'ai-sardinebites', 'Sardine and tomato bites', '🐟', 's', 5, [['sardines', 80], ['tomato', 80], ['bread', 35], ['greens', 20]], ['Toast the bread and top with greens.', 'Add sardines and sliced tomato with pepper and lemon.']),
  A('mexican', 'ai-avocadocup', 'Avocado and tomato cup', '🥑', 's', 5, [['avocado', 120], ['tomato', 80], ['olives', 20], ['sesame', 5]], ['Halve the avocado.', 'Fill with chopped tomato and olives and sprinkle with sesame.']),
  A(null, 'ai-greensmoothie', 'Green berry smoothie', '🥤', 's', 5, [['spinach', 50], ['berries', 80], ['flax', 10], ['plantmilk', 250]], ['Blend everything with a few ice cubes until smooth.', 'Drink cold.']),
);

// Tag every recipe, new and old.
const aiInfo = r => ({
  good: [...new Set(r.ing.map(g => g[0]).filter(k => AI_GOOD.has(k)))],
  avoid: r.ing.filter(([k, g]) => AI_AVOID.has(k) || (AI_SWEET.has(k) && g > 10)).map(g => g[0]),
});
RECIPES.forEach(r => { const i = aiInfo(r); r.ai = i.avoid.length === 0 && i.good.length >= 3; r.aiGood = i.good; });
