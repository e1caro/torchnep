'use strict';
// Icons from game-icons.net, licensed CC BY 3.0. Each icon is a one-colour SVG used as a mask,
// so it takes the colour of the text around it and follows the app theme.
// Authors credited here and in the README: Lorc, Delapouite, Skoll, Caro Asercion, Darkzaitzev, Sbed, Carl Olsen.
const GI_CREDIT = 'Icons by Lorc, Delapouite, Skoll, Caro Asercion, Darkzaitzev, Sbed and Carl Olsen from game-icons.net, CC BY 3.0.';
const gi = (name, cls = '') => `<i class="gi ${cls}" style="--m:url(icons/gi/${name}.svg)" aria-hidden="true"></i>`;
