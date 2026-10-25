# ruff: noqa: E731, E702, E741
# Prestige crest art: per interface, a metal layer (shapes with engraved cuts) and a gem layer. viewBox 0 0 120 120.
import math

def f(v): return f'{v:.1f}'
def P(d, extra=''): return f"<path d='{d}' {extra}/>"
def mir(b): return b + f"<g transform='matrix(-1 0 0 1 120 0)'>{b}</g>"
def vmir(b): return b + f"<g transform='matrix(1 0 0 -1 0 120)'>{b}</g>"
def rot(a, b, cx=60, cy=60): return f"<g transform='rotate({a:.1f} {cx} {cy})'>{b}</g>"
def pt(cx, cy, r, a):
    a = math.radians(a); return cx + r * math.cos(a), cy + r * math.sin(a)

def leaf(x, y, ang, ln, w):
    """a leaf/feather from (x,y) pointing at angle ang (deg), length ln, half-width w"""
    tx, ty = pt(x, y, ln, ang)
    mx, my = pt(x, y, ln * .5, ang)
    l1 = pt(mx, my, w, ang - 90); l2 = pt(mx, my, w, ang + 90)
    return f"M{f(x)} {f(y)}Q{f(l1[0])} {f(l1[1])} {f(tx)} {f(ty)}Q{f(l2[0])} {f(l2[1])} {f(x)} {f(y)}Z", f"M{f(x)} {f(y)}L{f(mx + (tx - mx) * .8)} {f(my + (ty - my) * .8)}"

def blade(x1, y1, x2, y2, w):
    a = math.degrees(math.atan2(y2 - y1, x2 - x1))
    p1 = pt(x1, y1, w, a - 90); p2 = pt(x1, y1, w, a + 90); tip = (x2, y2)
    return f"M{f(p1[0])} {f(p1[1])}L{f(tip[0])} {f(tip[1])}L{f(p2[0])} {f(p2[1])}Z"

def gear(cx, cy, teeth, ro, ri):
    pts = []
    for i in range(teeth):
        a = i * 360 / teeth
        for da, r in ((-.32, ri), (-.18, ro), (.18, ro), (.32, ri)):
            x, y = pt(cx, cy, r, a + da * 360 / teeth); pts.append(f'{f(x)},{f(y)}')
    return 'M' + ' L'.join(pts) + 'Z'

def poly(pts): return 'M' + ' L'.join(f'{f(x)},{f(y)}' for x, y in pts) + 'Z'
def circ(cx, cy, r): return f"M{f(cx - r)} {f(cy)}a{r} {r} 0 1 0 {2 * r} 0a{r} {r} 0 1 0 {-2 * r} 0Z"
def diamond(cx, cy, w, h): return poly([(cx, cy - h), (cx + w, cy), (cx, cy + h), (cx - w, cy)])

# each entry: (metal shapes, engraving cut strokes, gem shapes)
def build():
    A = {}
    # ---- Sci-fi HUD: hex core crest, triple chevron blades, data plate
    hexa = lambda cx, cy, r: poly([pt(cx, cy, r, a) for a in range(-90, 270, 60)])
    sides = ''.join(P(poly([(28, y - 4), (6 - k * 2, y - 9 + k * 2), (10 - k, y + 1), (28, y + 4)])) for k, y in enumerate([46, 60, 74]))
    A['hud'] = (P(hexa(60, 11, 11)) + mir(sides) + P(poly([(40, 104), (80, 104), (74, 115), (46, 115)])),
                P(hexa(60, 11, 7.5)) + mir(''.join(P(f'M26 {y}L{10 - k} {y - 4 + k}') for k, y in enumerate([46, 60, 74]))) + P('M46 109.5H74'),
                P(hexa(60, 11, 4.2)) + P(diamond(60, 109.5, 3, 3)))
    # ---- Imperial China: ruyi cloud crest with pearl, cloud-scroll wings, knot with tassel
    def cloud(cx, cy, k, flip=1):
        return (P(circ(cx, cy, 6 * k)) + P(circ(cx + 7 * k * flip, cy + 3 * k, 4.5 * k)) + P(circ(cx - 6 * k * flip, cy + 4 * k, 4 * k))
                + P(f'M{f(cx - 10 * k)} {f(cy + 4 * k)}H{f(cx + 11 * k)}V{f(cy + 8 * k)}H{f(cx - 10 * k)}Z'))
    swirl = lambda cx, cy, k: P(f'M{f(cx - 3 * k)} {f(cy + 1 * k)}a{3 * k} {3 * k} 0 1 1 {3 * k} {3 * k}')
    A['chinese'] = (cloud(60, 9, 1.35) + mir(cloud(13, 46, 1.05, -1) + cloud(11, 72, 1.0, -1) + P('M26 30Q12 26 10 36Q18 32 26 38Z') + P('M26 90Q12 94 10 84Q18 88 26 82Z')) + P(diamond(60, 107, 9, 8)) + P('M58 114h4v6h-4z'),
                    swirl(60, 8, 1.4) + mir(swirl(13, 45, 1.1) + swirl(11, 71, 1)) + P(diamond(60, 107, 5, 4.4)),
                    P(circ(60, 4, 2.6)) + P(circ(60, 107, 2.3)) + mir(P(circ(19, 47, 1.4)) + P(circ(17, 73, 1.3))))
    # ---- Zen Japan: torii with sun, blossom branches, wave crest
    blossom = lambda cx, cy, r: ''.join(P(circ(*pt(cx, cy, r, a), r * .75)) for a in range(-90, 270, 72))
    A['japanese'] = (P('M34 8Q60 2 86 8V12Q60 7 34 12Z') + P('M38 15H82V18H38Z') + P('M43 12h5v14h-5zM72 12h5v14h-5z')
                     + mir(P('M24 30Q12 46 14 64Q16 80 26 92', "fill='none' stroke='#fff' stroke-width='3'") + blossom(16, 38, 3.2) + blossom(11, 60, 3) + blossom(18, 84, 3.2))
                     + P('M36 106Q48 98 60 106Q72 98 84 106V112H36Z'),
                     P('M36 109Q48 103 60 109Q72 103 84 109') + P('M50 9.5H70'),
                     P(circ(60, 3, 3)) + mir(P(circ(16, 38, 1.4)) + P(circ(11, 60, 1.3)) + P(circ(18, 84, 1.4))))
    # ---- Fairy forest: flower crest, leaf wings with dew, leaf pair below
    lv = [leaf(26, 60, a, 22, 6) for a in (200, 180, 160, 222, 140)]
    A['fairy'] = (''.join(P(leaf(60, 22, a, 15, 5)[0]) for a in (-90, -120, -60)) + mir(''.join(P(d) for d, _ in lv)) + P(leaf(60, 102, 120, 14, 4)[0]) + P(leaf(60, 102, 60, 14, 4)[0]),
                  ''.join(P(leaf(60, 22, a, 15, 5)[1]) for a in (-90, -120, -60)) + mir(''.join(P(c) for _, c in lv)),
                  P(circ(60, 17, 3)) + mir(P(circ(9, 55, 1.8)) + P(circ(12, 75, 1.6))) + P(circ(60, 106, 2.4)))
    # ---- Medieval castle: heater shield, crossed swords, banner
    shield = 'M47 1H73V13C73 22 60 28 60 28C60 28 47 22 47 13Z'
    sword = P(blade(31, 33, 4, 4, 3.6)) + P(poly([(22, 35), (35, 22), (38, 25), (25, 38)])) + P('M31 33l7 7-3 3-7-7z') + P(circ(40, 42, 2.6))
    A['medieval'] = (P(shield) + mir(sword) + P('M28 102H92L86 108L92 114H28L34 108Z'),
                     P('M50 4H70V13C70 20 60 24.5 60 24.5C60 24.5 50 20 50 13Z') + P('M60 6V22M53 12H67') + P('M40 105V111M80 105V111'),
                     P(circ(60, 12, 2.4)) + mir(P(circ(33.5, 31.5, 1.8))) + P(diamond(60, 108, 2.6, 2.6)))
    # ---- Steampunk: gear crest, pistons with rivets, small gear
    A['steampunk'] = (P(gear(60, 11, 12, 11, 8.5)) + mir(P('M2 48h14v24H2z') + P('M16 54h12v4H16zM16 62h12v4H16z')) + P(gear(60, 110, 10, 8, 6)),
                      P(circ(60, 11, 5.5)) + ''.join(P(f'M60 11L{f(pt(60, 11, 8, a)[0])} {f(pt(60, 11, 8, a)[1])}') for a in range(0, 360, 60)) + mir(P('M5 52V68M9 52V68M13 52V68')) + P(circ(60, 110, 3.5)),
                      P(circ(60, 11, 2.6)) + mir(P(circ(9, 49.5, 1.3)) + P(circ(9, 70.5, 1.3))) + P(circ(60, 110, 1.8)))
    # ---- Olympus (Greek): laurel wreath, palmette crest, ribbon
    wl = [leaf(*pt(60, 60, 49, a), a + 118, 14, 4.4) for a in range(100, 252, 13)]
    palm = ''.join(P(leaf(60, 20, a, 14, 3.4)[0]) for a in range(-150, -20, 26))
    A['greek'] = (palm + mir(''.join(P(d) for d, _ in wl)) + P('M48 104Q60 112 72 104L76 114L60 109L44 114Z'),
                  ''.join(P(leaf(60, 20, a, 14, 3.4)[1]) for a in range(-150, -20, 26)) + mir(''.join(P(c) for _, c in wl)),
                  P(circ(60, 19, 2.6)) + mir(''.join(P(circ(*pt(60, 60, 45, a), 1.4)) for a in range(122, 250, 32))) + P(circ(60, 107, 2)))
    # ---- Egypt: winged sun disk, scarab
    feathers = [leaf(51, 11, a, ln, w) for a, ln, w in ((172, 46, 5), (162, 44, 5), (152, 40, 4.6), (142, 34, 4.2), (132, 27, 3.8), (-176, 40, 4.4), (-168, 30, 4))]
    A['egypt'] = (P(circ(60, 9, 7)) + mir(''.join(P(d) for d, _ in feathers)) + P('M52 100Q60 94 68 100V112Q60 118 52 112Z') + mir(P('M52 104Q42 100 38 106Q46 108 52 108Z')),
                  mir(''.join(P(c) for _, c in feathers)) + P('M60 98V116') + P(circ(60, 9, 4.6)),
                  P(circ(60, 9, 3.3)) + P(circ(60, 104, 2.2)))
    # ---- Viking: horned helm, crossed axes, knot plate
    axe = P(blade(32, 38, 8, 12, 1.6)) + P('M8 4Q2 14 10 22Q14 14 16 10Z')
    A['viking'] = (P('M48 22Q48 6 60 6Q72 6 72 22Z') + mir(P('M49 16Q36 16 30 2Q40 10 50 10Z')) + mir(axe) + P(diamond(60, 108, 9, 7)),
                   P('M60 7V21M50 19H70') + mir(P('M10 9Q7 14 11 19')) + P(diamond(60, 108, 5, 3.6)),
                   P(circ(53, 14, 1.4)) + P(circ(67, 14, 1.4)) + P(circ(60, 108, 2)))
    # ---- Pirate: skull and crossbones crest, sabers, anchor
    A['pirate'] = (P(circ(60, 10, 8)) + P('M54 15h12v6h-12z') + mir(P(blade(24, 26, 44, 8, 1.6))) + mir(P('M30 44Q14 28 10 10Q20 26 34 40Z') + P('M28 42l8-8 2 2-8 8z')) + P('M58 98h4v14h-4zM48 108q12 10 24 0l-2-2q-10 7-20 0z') + P('M54 99h12v3h-12z'),
                   P('M57 21V17M60 21V17M63 21V17') + mir(P('M14 18Q20 28 30 38')),
                   P(circ(56.5, 9.5, 2)) + P(circ(63.5, 9.5, 2)) + P(circ(60, 97, 1.6)))
    # ---- Outrun: chrome winged star, speed fins, striped sun
    star = lambda cx, cy, r1, r2: poly([pt(cx, cy, r1 if k % 2 == 0 else r2, -90 + k * 36) for k in range(10)])
    A['outrun'] = (P(star(60, 12, 11, 5)) + mir(P('M50 14L10 6L18 12L4 14L20 18L48 20Z')) + mir(P(poly([(26, 50), (4, 46), (10, 54), (26, 56)])) + P(poly([(26, 62), (6, 62), (12, 70), (26, 68)]))) + P('M42 110A18 18 0 0 1 78 110Z'),
                   mir(P('M46 16L16 10M44 18L22 15')) + P('M44 106H76M46 102H74'),
                   P(star(60, 12, 5, 2.4)) + P(circ(60, 104, 1.8)))
    # ---- Arcade: pixel crown, pixel wings, coin
    px = lambda cells: ''.join(f'M{x} {y}h4v4h-4z' for x, y in cells)
    crown = [(48, 4), (60 - 2, 2), (68, 4)] + [(x, y) for x in range(48, 72, 4) for y in (8, 12)]
    wing = [(x, y) for y in range(44, 80, 4) for x in range(28 - (y - 44) // 2 - (8 if 52 <= y <= 68 else 0), 30, 4) if x < 28]
    A['arcade'] = (P(px(crown), "shape-rendering='crispEdges'") + mir(P(px(wing), "shape-rendering='crispEdges'")) + P(px([(x, 106) for x in range(44, 76, 4)]), "shape-rendering='crispEdges'"),
                   '',
                   P(px([(48, 4), (58, 2), (68, 4)]), "shape-rendering='crispEdges'") + P(circ(60, 108, 3)))
    # ---- Classical elegance: rosette crest, volutes, acanthus
    rosette = ''.join(P(leaf(60, 12, a, 9, 3)[0]) for a in range(0, 360, 45))
    vol = P('M22 40C8 40 4 52 12 56C18 59 22 52 17 50', "fill='none' stroke='#fff' stroke-width='4'") + P('M22 80C8 80 4 68 12 64C18 61 22 68 17 70', "fill='none' stroke='#fff' stroke-width='4'") + P('M20 44Q14 60 20 76', "fill='none' stroke='#fff' stroke-width='3'")
    A['classical'] = (rosette + mir(vol) + P(leaf(60, 116, -90, 16, 7)[0]) + mir(P(leaf(60, 114, -120, 12, 4)[0])),
                      P(circ(60, 12, 4.4)) + P(leaf(60, 116, -90, 16, 7)[1]),
                      P(circ(60, 12, 2.6)) + mir(P(circ(13.5, 53.5, 1.4)) + P(circ(13.5, 66.5, 1.4))))
    # ---- Art deco: sunburst fan, stepped fins, chevrons
    fan = ''.join(P(poly([(60, 22), pt(60, 22, 20, a - 5), pt(60, 22, 20, a + 5)])) for a in range(-170, -9, 20))
    A['artdeco'] = (fan + mir(P('M2 44h6v32H2zM10 48h5v24h-5zM17 52h4v16h-4z')) + P('M44 102L60 112L76 102V106L60 116L44 106Z'),
                    P('M44 22A16 16 0 0 1 76 22') + P('M48 99L60 107L72 99'),
                    P('M52 22A8 8 0 0 1 68 22Z') + P(diamond(60, 99, 2.4, 2.4)))
    # ---- Gothic: spire with rose window, bat wings, drop arch, thorns
    bat = 'M27 46C16 32 4 34 1 48C7 45 11 47 11 52C15 48 19 50 19 55C22 51 26 51 28 54Z'
    A['gothic'] = (P('M60 0C54 10 50 16 50 26H70C70 16 66 10 60 0Z') + mir(vmir(P(bat)))
                   + mir(''.join(P(poly([pt(60, 60, 44, a - 3), pt(60, 60, 52, a), pt(60, 60, 44, a + 3)])) for a in (215, 235, 125, 145))) + P('M52 100Q60 104 68 100L60 118Z'),
                   P('M60 6V24') + mir(vmir(P('M5 47Q14 42 23 50'))),
                   P(circ(60, 18, 4)) + P(circ(60, 105, 1.8)))
    # ---- Baroque palace: jewelled crown, acanthus C-scrolls, scallop shell
    crown = 'M44 24L42 8L50 15L55 4L60 13L65 4L70 15L78 8L76 24Z'
    scroll = P('M24 36C6 30 2 48 12 52C20 55 22 44 15 44', "fill='none' stroke='#fff' stroke-width='4.5'") + P('M24 84C6 90 2 72 12 68C20 65 22 76 15 76', "fill='none' stroke='#fff' stroke-width='4.5'") + P(leaf(24, 60, 180, 18, 5)[0])
    shell = ''.join(P(poly([(60, 116), pt(60, 116, 16, a - 7), pt(60, 116, 16, a + 7)])) for a in range(-160, -19, 20))
    A['baroque'] = (P(crown) + mir(scroll) + shell,
                    P('M44 20H76') + P(leaf(24, 60, 180, 18, 5)[1]).replace('M24', 'M24') + mir(P(leaf(24, 60, 180, 18, 5)[1])),
                    P(circ(55, 5, 1.6)) + P(circ(65, 5, 1.6)) + P(circ(60, 18, 2.4)) + mir(P(circ(14, 48, 1.4)) + P(circ(14, 72, 1.4))) + P(circ(60, 104, 1.6)))
    # ---- Mythical realm: dragon wings, horns with eye, flame
    wingd = 'M30 36C22 18 8 12 0 18C6 22 8 26 6 32C12 31 15 35 13 41C19 39 22 43 20 49C25 47 29 50 29 56Z'
    A['mythical'] = (mir(vmir(P(wingd))) + mir(P('M52 16C46 12 44 6 46 0C50 6 54 8 58 10Z')) + P(diamond(60, 12, 6, 6)) + P('M60 120C52 114 52 106 56 100C58 104 60 104 60 100C60 104 62 104 64 100C68 106 68 114 60 120Z'),
                     mir(vmir(P('M28 38L6 22M28 46L8 32M28 54L14 44'))),
                     P(diamond(60, 12, 3, 3.6)) + P(circ(60, 110, 2)))
    # ---- Cosmic voyage: orbit with planets, great star, comet
    A['cosmic'] = (P(star(60, 9, 9, 3)) + P('M60 60m-58 0a58 18 0 1 0 116 0a58 18 0 1 0 -116 0Z M60 60m-54 0a54 14 0 1 1 108 0a54 14 0 1 1 -108 0Z', "fill-rule='evenodd' transform='rotate(-24 60 60)'") + P(star(60, 112, 6, 2)) + mir(P(star(16, 22, 3.5, 1.2))),
                   '',
                   P(circ(*pt(60, 60, 0, 0), 0)) + P(circ(108, 37, 4.5)) + P(circ(13, 83, 3.6)) + P(circ(60, 9, 2)))
    return A


def build_min():
    """The minimal set: a single emblem on top of the ring per interface (and one small gem)."""
    hexa = lambda cx, cy, r: poly([pt(cx, cy, r, a) for a in range(-90, 270, 60)])
    star = lambda cx, cy, r1, r2: poly([pt(cx, cy, r1 if k % 2 == 0 else r2, -90 + k * 36) for k in range(10)])
    A = {}
    A['clean'] = (P(circ(60, 10, 6)), '', P(circ(60, 10, 2.2)))
    A['hud'] = (P(hexa(60, 11, 9)), '', P(hexa(60, 11, 3.2)))
    A['chinese'] = (P(circ(60, 9, 5.5)) + P(circ(53, 12, 4)) + P(circ(67, 12, 4)) + P('M49 13H71V17H49Z'), '', P(circ(60, 4, 2)))
    A['japanese'] = (P('M44 6Q60 2 76 6V9Q60 6 44 9Z') + P('M47 12H73V14.5H47Z') + P('M50 9h3.5v12H50zM66.5 9H70v12h-3.5z'), '', P(circ(60, 2.6, 1.8)))
    A['fairy'] = (''.join(P(leaf(60, 20, a, 12, 4)[0]) for a in (-90, -125, -55)), '', P(circ(60, 16, 2)))
    A['medieval'] = (P('M51 2H69V12C69 19 60 23 60 23C60 23 51 19 51 12Z'), '', P(circ(60, 11, 2)))
    A['steampunk'] = (P(gear(60, 11, 10, 9, 7)) + P(circ(60, 11, 3.5)), '', P(circ(60, 11, 1.8)))
    A['greek'] = (''.join(P(leaf(60, 18, a, 11, 3.2)[0]) for a in (-150, -125, -55, -30)), '', P(circ(60, 16, 2)))
    A['egypt'] = (P(circ(60, 10, 5)) + mir(P('M54 10C46 5 38 6 32 10C38 10 46 11 54 13Z')), '', P(circ(60, 10, 2.2)))
    A['viking'] = (P('M50 20Q50 8 60 8Q70 8 70 20Z') + mir(P('M51 15Q42 15 38 5Q44 11 52 11Z')), '', P(circ(60, 15, 1.6)))
    A['pirate'] = (P(circ(60, 10, 7)) + P('M55 15h10v5H55z'), '', P(circ(57, 9.5, 1.6)) + P(circ(63, 9.5, 1.6)))
    A['outrun'] = (P(star(60, 11, 10, 4.2)), '', P(circ(60, 11, 1.8)))
    px = lambda cells: ''.join(f'M{x} {y}h3v3h-3z' for x, y in cells)
    A['arcade'] = (P(px([(50, 5), (58.5, 3), (67, 5)] + [(x, y) for x in range(50, 70, 3) for y in (8, 11)]), "shape-rendering='crispEdges'"), '', P(px([(58.5, 3)]), "shape-rendering='crispEdges'"))
    A['classical'] = (''.join(P(leaf(60, 11, a, 8, 2.8)[0]) for a in range(0, 360, 45)), '', P(circ(60, 11, 2.2)))
    A['artdeco'] = (''.join(P(poly([(60, 20), pt(60, 20, 15, a - 5), pt(60, 20, 15, a + 5)])) for a in range(-160, -19, 20)), '', P('M54 20A6 6 0 0 1 66 20Z'))
    A['gothic'] = (P('M60 0C55 9 52 14 52 22H68C68 14 65 9 60 0Z'), '', P(circ(60, 15, 2.4)))
    A['baroque'] = (P('M48 20L46 8L53 13L56.5 4L60 11L63.5 4L67 13L74 8L72 20Z'), '', P(circ(60, 15, 1.8)))
    A['mythical'] = (mir(P('M53 16C48 12 46 6 48 1C51 7 55 9 58 11Z')) + P(diamond(60, 13, 4.5, 4.5)), '', P(diamond(60, 13, 2, 2.4)))
    A['cosmic'] = (P(star(60, 10, 9, 3)), '', P(circ(60, 10, 1.4)))
    return A
