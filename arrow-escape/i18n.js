/* English / Spanish strings. Add a language by adding one object. */
(function (root) {
  'use strict';
  const S = {
    en: {
      title: 'Bounce Arrows',
      tagline: 'Slide every arrow out. Mind the bounces.',
      play: 'Play', level: 'Level', daily: 'Daily puzzle', dailyDone: 'Done today',
      dailyNew: 'New puzzle every day', streak: 'day streak',
      hint: 'Hint', restart: 'Restart', settings: 'Settings',
      sound: 'Sound', language: 'Language', removeAds: 'Remove ads', adsRemoved: 'Ads removed',
      reset: 'Reset progress', resetAsk: 'Erase all progress?', close: 'Close',
      win: 'Cleared!', coins: 'coins', next: 'Next level', double: 'Watch ad: x2 coins',
      combo: 'combo', hearts: 'hearts',
      outTitle: 'Out of hearts', outBody: 'Blocked arrows cost a heart.',
      continueAd: 'Watch ad: +2 hearts', retry: 'Try again',
      tip1: 'Tap an arrow to slide it out. If something is in the way, you lose a heart.',
      tipChain: 'Glowing arrows set off their free neighbours. Chain them for bonus coins!',
      tipBounce: 'Gold arrows bounce off the wall and turn. Hold one to preview its path.',
      share: 'Share result', copied: 'Copied!',
      dailyWin: 'Daily cleared!', bonus: 'Daily bonus',
      noHint: 'No hints left', buyHint: 'Buy a hint (25 coins)', hintAd: 'Watch ad: free hint', cancel: 'Cancel',
      adDemo: 'Ad (demo)', adClose: 'Close ad', adWait: 'Ad ends in',
      buyDemo: 'Demo purchase: the real store dialog appears in the Android app.', ok: 'OK', home: 'Menu',
    },
    es: {
      title: 'Bounce Arrows',
      tagline: 'Saca todas las flechas. Cuidado con los rebotes.',
      play: 'Jugar', level: 'Nivel', daily: 'Reto diario', dailyDone: 'Hecho hoy',
      dailyNew: 'Un puzzle nuevo cada dia', streak: 'dias seguidos',
      hint: 'Pista', restart: 'Reiniciar', settings: 'Ajustes',
      sound: 'Sonido', language: 'Idioma', removeAds: 'Quitar anuncios', adsRemoved: 'Sin anuncios',
      reset: 'Borrar progreso', resetAsk: 'Borrar todo el progreso?', close: 'Cerrar',
      win: 'Superado!', coins: 'monedas', next: 'Siguiente nivel', double: 'Ver anuncio: monedas x2',
      combo: 'combo', hearts: 'vidas',
      outTitle: 'Sin vidas', outBody: 'Una flecha bloqueada cuesta una vida.',
      continueAd: 'Ver anuncio: +2 vidas', retry: 'Reintentar',
      tip1: 'Toca una flecha para sacarla. Si algo la bloquea, pierdes una vida.',
      tipChain: 'Las flechas brillantes activan a sus vecinas libres. Encadena para ganar monedas extra!',
      tipBounce: 'Las flechas doradas rebotan en la pared y giran. Manten pulsada una para ver su camino.',
      share: 'Compartir resultado', copied: 'Copiado!',
      dailyWin: 'Reto diario superado!', bonus: 'Bonus diario',
      noHint: 'Sin pistas', buyHint: 'Comprar pista (25 monedas)', hintAd: 'Ver anuncio: pista gratis', cancel: 'Cancelar',
      adDemo: 'Anuncio (demo)', adClose: 'Cerrar anuncio', adWait: 'El anuncio acaba en',
      buyDemo: 'Compra de prueba: el dialogo real de la tienda sale en la app de Android.', ok: 'OK', home: 'Menu',
    },
  };
  let lang = 'en';
  root.I18N = {
    langs: Object.keys(S),
    detect() { return (navigator.language || 'en').toLowerCase().startsWith('es') ? 'es' : 'en'; },
    set(l) { lang = S[l] ? l : 'en'; document.documentElement.lang = lang; },
    get() { return lang; },
    t(k) { return (S[lang] && S[lang][k]) || S.en[k] || k; },
  };
})(window);
