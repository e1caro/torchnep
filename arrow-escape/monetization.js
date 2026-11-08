/*
 * Monetization + analytics adapters.
 *
 * The game only talks to these three objects. In the browser they run as DEMO mocks
 * (a fake 3 s ad, a fake purchase). In the Android wrapper you swap the provider for
 * AdMob / Google Play Billing without touching game.js - see README.md.
 */
(function (root) {
  'use strict';
  const fast = /[?&]fastads=1/.test(location.search); // used by automated tests

  /* ----- analytics: every product decision should be measured ----- */
  const Metrics = {
    log: [],
    track(name, params) {
      const e = Object.assign({ t: Date.now(), name }, params || {});
      this.log.push(e);
      if (this.log.length > 300) this.log.shift();
      try { localStorage.setItem('ba.events', JSON.stringify(this.log)); } catch (_) { /* private mode */ }
      // Plug Firebase / GameAnalytics here: window.BA_ANALYTICS = { track(name, params) {...} }
      if (root.BA_ANALYTICS && root.BA_ANALYTICS.track) root.BA_ANALYTICS.track(name, params || {});
    },
  };

  /* ----- ads ----- */
  function mockAd(label, rewarded) {
    return new Promise(resolve => {
      const el = document.getElementById('adOverlay');
      const t = I18N.t;
      let left = fast ? 0.3 : 3;
      el.innerHTML = '<div class="adbox"><div class="adlabel">' + t('adDemo') + '</div>' +
        '<div class="adtext">' + label + '</div><div class="adcount"></div>' +
        '<button class="btn small" id="adClose" disabled>' + t('adClose') + '</button></div>';
      el.classList.add('show');
      const count = el.querySelector('.adcount'), btn = el.querySelector('#adClose');
      let done = false;
      const finish = ok => { if (done) return; done = true; clearInterval(iv); el.classList.remove('show'); resolve(ok); };
      const tick = () => {
        if (left <= 0) { count.textContent = ''; btn.disabled = false; btn.onclick = () => finish(true); if (fast) finish(true); return; }
        count.textContent = t('adWait') + ' ' + Math.ceil(left) + 's'; left -= 0.1;
      };
      const iv = setInterval(tick, 100); tick();
    });
  }

  const Ads = {
    provider: null, // { interstitial(): Promise<boolean>, rewarded(placement): Promise<boolean> }
    cfg: { firstInterstitialLevel: 4, every: 3, minSecondsBetween: 75 },
    lastShown: 0,
    noAds() { return !!(root.BA_SAVE && root.BA_SAVE.noAds); },
    setProvider(p) { this.provider = p; },

    /** Rewarded ad: resolves true only if the player watched it to the end. */
    async rewarded(placement) {
      Metrics.track('rewarded_offer', { placement });
      const ok = this.provider ? await this.provider.rewarded(placement) : await mockAd('Rewarded: ' + placement, true);
      Metrics.track(ok ? 'rewarded_done' : 'rewarded_skipped', { placement });
      return ok;
    },

    /** Interstitial between levels: capped by level, frequency and time; never for no-ads buyers. */
    async maybeInterstitial(levelsCleared, level) {
      if (this.noAds() || level < this.cfg.firstInterstitialLevel) return;
      if (levelsCleared % this.cfg.every !== 0) return;
      if (Date.now() - this.lastShown < this.cfg.minSecondsBetween * 1000 && !fast) return;
      this.lastShown = Date.now();
      Metrics.track('interstitial_show', { level });
      if (this.provider) await this.provider.interstitial(); else await mockAd('Interstitial', false);
    },
  };

  /* ----- in-app purchase ----- */
  const Billing = {
    provider: null, // { purchase(sku): Promise<boolean> }
    setProvider(p) { this.provider = p; },
    async purchase(sku) {
      Metrics.track('purchase_start', { sku });
      const ok = this.provider ? await this.provider.purchase(sku) : (alert(I18N.t('buyDemo')), true);
      Metrics.track(ok ? 'purchase_done' : 'purchase_cancel', { sku });
      return ok;
    },
  };

  root.Metrics = Metrics; root.Ads = Ads; root.Billing = Billing;
})(window);
