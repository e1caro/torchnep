/* Added to both apps inside the desktop program: a way from each one to the other and back to the home screen. */
(function () {
  'use strict';
  function el(html) { var d = document.createElement('div'); d.innerHTML = html; return d.firstChild; }
  var menu = document.querySelector('#menu .box'), lobbyBtns = document.querySelector('#setup .head-btns'), tabs = document.querySelector('nav.tabs');
  if (menu && lobbyBtns) {                       // the blackjack table
    menu.appendChild(el('<div class="desk-links"><h3>Also in this program</h3><div class="row">' +
      '<a class="btn ghost" id="deskHilo" href="../hilo/index.html">Hi-Lo trainer</a>' +
      '<a class="btn ghost" id="deskHome" href="../index.html">Home screen</a></div></div>'));
    lobbyBtns.insertBefore(el('<a class="btn ghost small" id="deskLobbyHome" href="../index.html">Home screen</a>'), lobbyBtns.firstChild);
  } else if (tabs) {                             // the trainer: two links at the right of its header
    var top = document.querySelector('header.top');
    top.appendChild(el('<span class="desk-nav"><a id="deskHome" href="../index.html">Home screen</a>' +
      '<a id="deskTable" href="../blackjack/index.html">Blackjack table</a></span>'));
    var brand = document.querySelector('a.brand'); if (brand) brand.setAttribute('href', '../index.html');
  }
})();
