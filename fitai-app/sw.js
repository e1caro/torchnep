const V = 'fitquest-v127';
const SHELL = ['./', 'index.html', 'style.css', 'hud.css', 'skins.css', 'app.js', 'i18n.js', 'es-ui.js', 'es-food.js', 'game.js', 'recipes.js', 'cuisines.js', 'antiinflam.js', 'meals.js', 'earn.js', 'icons.js', 'shop.js', 'ranks.js', 'sport.js', 'ios.js', 'routines.js', 'bets.js', 'foodlog.js', 'spotify.js', 'bubbles.js', 'recap.js', 'sounds.js', 'cloud.js', 'swipe.js', 'manifest.webmanifest', 'data/exercises.json', 'data/videos.json', 'data/es-exercises.json', 'data/songs.txt', 'icons/icon-192.png', 'icons/icon-512.png', 'icons/icon-maskable-512.png', 'icons/apple-touch-icon.png', 'icons/favicon.png', 'icons/gi/abs.svg', 'icons/gi/alien.svg', 'icons/gi/anchor.svg', 'icons/gi/anvil.svg', 'icons/gi/astronaut.svg', 'icons/gi/banner.svg', 'icons/gi/bear.svg', 'icons/gi/bee.svg', 'icons/gi/biceps.svg', 'icons/gi/bolt.svg', 'icons/gi/book.svg', 'icons/gi/boxing.svg', 'icons/gi/bull.svg', 'icons/gi/cactus.svg', 'icons/gi/calendar.svg', 'icons/gi/centurion.svg', 'icons/gi/chef.svg', 'icons/gi/chest-gold.svg', 'icons/gi/chest-silver.svg', 'icons/gi/chestplate.svg', 'icons/gi/coin.svg', 'icons/gi/cur-hud.svg', 'icons/gi/cur-chinese.svg', 'icons/gi/cur-japanese.svg', 'icons/gi/cur-fairy.svg', 'icons/gi/cur-medieval.svg', 'icons/gi/cur-steampunk.svg', 'icons/gi/cur-greek.svg', 'icons/gi/cur-egypt.svg', 'icons/gi/cur-viking.svg', 'icons/gi/cur-pirate.svg', 'icons/gi/cur-outrun.svg', 'icons/gi/cur-arcade.svg', 'icons/gi/cur-classical.svg', 'icons/gi/cur-artdeco.svg', 'icons/gi/cur-gothic.svg', 'icons/gi/cur-baroque.svg', 'icons/gi/cur-mythical.svg', 'icons/gi/cur-cosmic.svg', 'icons/gi/coins.svg', 'icons/gi/compass.svg', 'icons/gi/crate.svg', 'icons/gi/crown.svg', 'icons/gi/cutlery.svg', 'icons/gi/dice.svg', 'icons/gi/dragon.svg', 'icons/gi/duck.svg', 'icons/gi/eagle.svg', 'icons/gi/feather.svg', 'icons/gi/fist.svg', 'icons/gi/flame.svg', 'icons/gi/fox.svg', 'icons/gi/frame.svg', 'icons/gi/gate.svg', 'icons/gi/ghost.svg', 'icons/gi/glove.svg', 'icons/gi/glute.svg', 'icons/gi/golem.svg', 'icons/gi/gorilla.svg', 'icons/gi/horse.svg', 'icons/gi/infinity.svg', 'icons/gi/key.svg', 'icons/gi/kraken.svg', 'icons/gi/laurel.svg', 'icons/gi/leaf.svg', 'icons/gi/leg.svg', 'icons/gi/lifter.svg', 'icons/gi/lion.svg', 'icons/gi/lock.svg', 'icons/gi/lotus.svg', 'icons/gi/medal.svg', 'icons/gi/minotaur.svg', 'icons/gi/moon.svg', 'icons/gi/mountain.svg', 'icons/gi/ninja.svg', 'icons/gi/owl.svg', 'icons/gi/pack.svg', 'icons/gi/palette.svg', 'icons/gi/panda.svg', 'icons/gi/penguin.svg', 'icons/gi/pine.svg', 'icons/gi/pot.svg', 'icons/gi/punch.svg', 'icons/gi/push.svg', 'icons/gi/ram.svg', 'icons/gi/raven.svg', 'icons/gi/robot.svg', 'icons/gi/rocket.svg', 'icons/gi/rooster.svg', 'icons/gi/rope.svg', 'icons/gi/samurai.svg', 'icons/gi/scale.svg', 'icons/gi/scorpion.svg', 'icons/gi/scroll.svg', 'icons/gi/shark.svg', 'icons/gi/shield.svg', 'icons/gi/shoe.svg', 'icons/gi/shoulder.svg', 'icons/gi/sleep.svg', 'icons/gi/slot.svg', 'icons/gi/snowflake.svg', 'icons/gi/sofa.svg', 'icons/gi/sparkles.svg', 'icons/gi/spartan.svg', 'icons/gi/spine.svg', 'icons/gi/sprint.svg', 'icons/gi/stopwatch.svg', 'icons/gi/strong.svg', 'icons/gi/sun.svg', 'icons/gi/sunrise.svg', 'icons/gi/swords.svg', 'icons/gi/target.svg', 'icons/gi/temple.svg', 'icons/gi/ticket.svg', 'icons/gi/tiger.svg', 'icons/gi/torso.svg', 'icons/gi/treasure.svg', 'icons/gi/trex.svg', 'icons/gi/trophy.svg', 'icons/gi/turtle.svg', 'icons/gi/unicorn.svg', 'icons/gi/upgrade.svg', 'icons/gi/user.svg', 'icons/gi/viking.svg', 'icons/gi/water.svg', 'icons/gi/weight.svg', 'icons/gi/wheel.svg', 'icons/gi/wolf.svg', 'icons/gi/wyvern.svg'];

self.addEventListener('install', e => {
  e.waitUntil(caches.open(V).then(c => c.addAll(SHELL.map(u => new Request(u, { cache: 'reload' })))).then(() => self.skipWaiting()));
});

self.addEventListener('activate', e => {
  e.waitUntil(caches.keys().then(ks => Promise.all(ks.filter(k => k !== V).map(k => caches.delete(k)))).then(() => self.clients.claim()));
});

const store = (req, r) => { if (r.ok || r.type === 'opaque') { const copy = r.clone(); caches.open(V).then(c => c.put(req, copy)); } return r; };

self.addEventListener('fetch', e => {
  const req = e.request;
  if (req.method !== 'GET') return;
  // The app's own files: network first so updates arrive, cache when offline.
  if (new URL(req.url).origin === location.origin) {
    e.respondWith(fetch(req, { cache: 'no-cache' }).then(r => store(req, r)).catch(() => caches.match(req)));
    return;
  }
  // Exercise photos and fonts: cache first. Anything else (Spotify and other live services) goes straight to the network.
  if (!/(^|\.)(githubusercontent\.com|gstatic\.com|googleapis\.com)$/.test(new URL(req.url).hostname)) return;
  e.respondWith(caches.match(req).then(hit => hit || fetch(req).then(r => store(req, r))));
});
