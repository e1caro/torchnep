#!/usr/bin/env python3
"""Makes the money icons of each interface: icons/gi/cur-<interface>.svg.

Most are game-icons.net icons (CC BY 3.0), downloaded and cleaned like the rest of icons/gi (black background removed).
The yen, yuan, drachma, dollar and casino chip coins are drawn here; the currency signs come from DejaVu Sans Bold
(needs fontTools: pip install fonttools).
"""
import math
import re
import urllib.request
from pathlib import Path

from fontTools.pens.svgPathPen import SVGPathPen
from fontTools.pens.transformPen import TransformPen
from fontTools.ttLib import TTFont

OUT = Path(__file__).resolve().parent.parent / 'icons' / 'gi'
FONT = '/usr/share/fonts/truetype/dejavu/DejaVuSans-Bold.ttf'
GAME_ICONS = {
    'hud': 'lorc/microchip', 'fairy': 'lorc/acorn', 'medieval': 'lorc/crown-coin', 'steampunk': 'lorc/cog',
    'egypt': 'lorc/gold-scarab', 'viking': 'lorc/rune-stone', 'pirate': 'delapouite/coins-pile', 'arcade': 'delapouite/round-star',
    'classical': 'delapouite/coins', 'gothic': 'delapouite/soul', 'baroque': 'delapouite/two-coins', 'mythical': 'lorc/gems',
    'cosmic': 'delapouite/polar-star',
}
SIGNS = {'japanese': '¥', 'greek': 'Δ', 'artdeco': '$'}


def svg(d):
    return f'<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 512 512"><path fill-rule="evenodd" d="{d}"/></svg>\n'


def circle(r, cx=256, cy=256):
    return f'M{cx - r} {cy}a{r} {r} 0 1 0 {2 * r} 0a{r} {r} 0 1 0 {-2 * r} 0z'


def glyph(ch, height):
    """The sign's outline, centred in the coin and `height` tall."""
    f = TTFont(FONT)
    gs, name = f.getGlyphSet(), f.getBestCmap()[ord(ch)]
    g = f['glyf'][name]
    g.recalcBounds(f['glyf'])
    s = height / (g.yMax - g.yMin)
    pen = SVGPathPen(gs)
    # font units grow upwards; the coin's grow downwards
    tx, ty = 256 - (g.xMin + g.xMax) / 2 * s, 256 + (g.yMin + g.yMax) / 2 * s
    gs[name].draw(TransformPen(pen, (s, 0, 0, -s, tx, ty)))
    return pen.getCommands()


def rim():
    """A coin with a groove round its edge."""
    return circle(240) + circle(214) + circle(198)


def chip():
    """A casino chip: notches round the edge and an inner ring."""
    d = circle(240) + circle(150) + circle(132)
    for k in range(6):
        a = k * math.pi / 3
        pts = []
        for r, da in ((240, -.2), (240, .2), (180, .24), (180, -.24)):
            pts.append(f'{256 + r * math.cos(a + da):.1f} {256 + r * math.sin(a + da):.1f}')
        d += 'M' + 'L'.join(pts) + 'z'
    return d


def cash_coin():
    """An old Chinese coin with a square hole."""
    return rim() + 'M196 196h120v120H196z'


def clean(src):
    """A game-icons.net SVG without its black square, as one mask shape."""
    paths = re.findall(r'<path ([^>]*)/>', src)
    ds = [re.search(r'\bd="([^"]+)"', p).group(1) for p in paths if 'fill="#fff"' in p]
    return f'<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 512 512"><path d="{"".join(ds)}"/></svg>\n'


def main():
    for skin, path in GAME_ICONS.items():
        url = f'https://raw.githubusercontent.com/game-icons/icons/master/{path}.svg'
        with urllib.request.urlopen(url, timeout=30) as r:
            (OUT / f'cur-{skin}.svg').write_text(clean(r.read().decode()))
    for skin, ch in SIGNS.items():
        (OUT / f'cur-{skin}.svg').write_text(svg(rim() + glyph(ch, 230)))
    (OUT / 'cur-chinese.svg').write_text(svg(cash_coin()))
    (OUT / 'cur-outrun.svg').write_text(svg(chip()))


if __name__ == '__main__':
    main()
