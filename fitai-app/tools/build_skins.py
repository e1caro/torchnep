#!/usr/bin/env python3
"""Builds ../skins.css: the interface skins sold in Rewards > Shop > Interfaces.

Each skin is a whole look (palette, fonts, background, panel frames, buttons, bars, title ornaments
and ambient animation). Ornaments are small hand-written SVGs embedded as data URIs, so the app
ships no image files for them. Run:  python3 tools/build_skins.py
"""
import math
import sys
import re
from pathlib import Path
from urllib.parse import quote

HERE = Path(__file__).resolve().parent
OUT = HERE.parent / 'skins.css'


def svg(body, vb):
    s = f"<svg xmlns='http://www.w3.org/2000/svg' viewBox='{vb}'>{body}</svg>"
    return 'url("data:image/svg+xml,' + quote(s, safe=" =:/'.,-()") + '")'


def corners(body, size, which='tl tr bl br'):
    """One corner drawing (made for the top-left of a 40x40 box), mirrored into the chosen corners."""
    tf = {'tl': '', 'tr': 'translate(40 0) scale(-1 1)', 'bl': 'translate(0 40) scale(1 -1)', 'br': 'translate(40 40) scale(-1 -1)'}
    pos = {'tl': '0 0', 'tr': '100% 0', 'bl': '0 100%', 'br': '100% 100%'}
    out = []
    for c in which.split():
        g = "<g transform='" + tf[c] + "'>" + body + "</g>"
        out.append(f"{svg(g, '0 0 40 40')} {pos[c]}/{size}px {size}px")
    return ','.join(out)


SKINS = []


def skin(key, css):
    SKINS.append(f"\n/* ==========================================================================\n   {key}\n   ========================================================================== */\n{css.strip()}\n")


P = ':is(.card,.quest,.mkt,.hud,.mbox,.opt,.stat)'  # every panel

# ---------------------------------------------------------------- Minimal (the free interface)
# A calm, ordinary app look: soft dark greys, one blue accent, rounded cards, Inter, no ornaments or animations.
MA, MA2 = '#6c8cff', '#9db2ff'
skin('Minimal', f"""
html[data-skin=clean]{{
  --bg:#0e1014;--glow:#161a22;--acc:{MA};--acc2:{MA2};--fg:#eceef3;--mut:#8b92a3;--on:#ffffff;--r:14px;
  --card:#161920;--card2:#1d212a;--line:#262b35;--line2:#343b48;
  --disp:'Inter',system-ui,-apple-system,sans-serif;--body:'Inter',system-ui,-apple-system,sans-serif;--mono:'Inter',system-ui,sans-serif;
  --clip:none;--pshadow:none;--deco:none;--rep:no-repeat;--orn:none;--orn-h:0}}
html[data-skin=clean] body{{background:var(--bg);font-weight:400}}
html[data-skin=clean] body::before,html[data-skin=clean] body::after{{display:none}}
html[data-skin=clean] *{{text-shadow:none!important}}
html[data-skin=clean] :is(h1,h2,h3,.hn,.lbl,.chip,.seg a,.dpill,.btn,.btn.sm,summary,.qt,.xpt,.stat span,.mt){{text-transform:none;letter-spacing:0}}
html[data-skin=clean] h1{{font-weight:700;font-size:28px;line-height:1.15}}
html[data-skin=clean] h3{{font-weight:600;font-size:16px}}
html[data-skin=clean] h2.sec{{font-size:13px;font-weight:600;color:var(--mut);margin:22px 0 8px}}
html[data-skin=clean] h2.sec::before{{display:none}}
html[data-skin=clean] h2.sec::after{{opacity:0}}
html[data-skin=clean] .lbl{{font-size:13px;font-weight:600;color:var(--mut)}}
html[data-skin=clean] {P}{{background:var(--card);border:1px solid var(--line);box-shadow:none;border-radius:var(--r)}}
html[data-skin=clean] {P}::before,html[data-skin=clean] {P}::after{{display:none}}
html[data-skin=clean] .btn{{background:var(--acc);color:var(--on);box-shadow:none;font-weight:600;font-size:15px;border-radius:12px}}
html[data-skin=clean] .btn.sm{{font-size:13px;border-radius:10px}}
html[data-skin=clean] .btn.ghost{{background:var(--card2);color:var(--fg);box-shadow:inset 0 0 0 1px var(--line)}}
html[data-skin=clean] :is(.btn.gold,.btn.chestbtn){{background:#f2c14e;color:#1d1503}}
html[data-skin=clean] .btn::before,html[data-skin=clean] .btn::after{{display:none}}
html[data-skin=clean] .chip{{background:var(--card2);border:1px solid var(--line);color:var(--fg);border-radius:999px;font-weight:500}}
html[data-skin=clean] :is(.seg a.on,.dpill.on,.chip.on){{background:var(--acc);color:var(--on);border-color:var(--acc)}}
html[data-skin=clean] .seg{{background:var(--card2);border:0;border-radius:12px;padding:3px}}
html[data-skin=clean] .seg a{{font-size:13px;font-weight:600;border-radius:10px}}
html[data-skin=clean] :is(.xpbar,.qbar,.prog,.hp){{box-shadow:none;height:6px}}
html[data-skin=clean] .xpbar i,html[data-skin=clean] :is(.qbar,.prog,.rkbar) i{{background:var(--acc)}}
html[data-skin=clean] .hp i{{background:linear-gradient(90deg,#ff6b6b,#ffb86b)}}
html[data-skin=clean] nav#tabs{{background:color-mix(in srgb,var(--bg) 95%,transparent);border-top:1px solid var(--line)}}
html[data-skin=clean] nav#tabs::before,html[data-skin=clean] nav#tabs::after{{display:none}}
html[data-skin=clean] nav#tabs a{{font-weight:500;letter-spacing:0;text-transform:none}}
html[data-skin=clean] nav#tabs a.on{{background:none;box-shadow:none;color:var(--acc)}}
html[data-skin=clean] nav#tabs a.on::before,html[data-skin=clean] nav#tabs a.on::after{{display:none}}
html[data-skin=clean] :is(.qi,.dgi,.mi){{background:var(--card2);border:0;box-shadow:none;border-radius:12px}}
html[data-skin=clean] :is(input,select,textarea){{background:var(--card2);border:1px solid var(--line);border-radius:10px;box-shadow:none}}
html[data-skin=clean] .coins{{background:var(--card2);border:1px solid var(--line);color:var(--fg);border-radius:999px}}
html[data-skin=clean] .orb{{background:var(--card);box-shadow:none}}
html[data-skin=clean] .bub{{animation:none}}
html[data-skin=clean] .orbit{{display:none}}
html[data-skin=clean] .oi .gi{{filter:none;background:var(--acc)}}
html[data-skin=clean] .big .ov{{color:var(--fg)}}
""")

# ---------------------------------------------------------------- Imperial China
GOLD, RED = '#d9ad45', '#e8433a'
cn_corner = (f"<g fill='none' stroke='{GOLD}' stroke-width='2'><path d='M2 38V2h36'/><path d='M7 31V7h24'/><path d='M12 25V12h13v9h-7v-4h3'/></g>"
             f"<rect x='0' y='0' width='6' height='6' fill='{RED}'/>")
cn_cloud = svg(f"<g fill='none' stroke='{GOLD}' stroke-opacity='.10' stroke-width='1.5'><path d='M6 30c0-6 8-6 8 0c0-9 13-9 13 0c0-6 8-6 8 0'/><path d='M38 62c0-6 8-6 8 0c0-9 13-9 13 0'/></g>", '0 0 64 64')
cn_orn = svg(f"<path d='M0 9H92M148 9H240' stroke='{GOLD}' stroke-width='1.5'/><path d='M96 9h8M136 9h8' stroke='{GOLD}' stroke-width='3'/>"
             f"<path d='M120 0l14 9-14 9-14-9z' fill='{RED}' stroke='{GOLD}' stroke-width='1.5'/><circle cx='120' cy='9' r='3' fill='{GOLD}'/>", '0 0 240 18')
lantern = svg(f"<path d='M30 0v14' stroke='{GOLD}'/><rect x='20' y='14' width='20' height='6' rx='2' fill='{GOLD}'/>"
              f"<ellipse cx='30' cy='44' rx='26' ry='24' fill='#c4231b'/><ellipse cx='30' cy='44' rx='26' ry='24' fill='url(#g)'/>"
              f"<defs><radialGradient id='g'><stop offset='0' stop-color='#ffb347' stop-opacity='.8'/><stop offset='1' stop-color='#c4231b' stop-opacity='0'/></radialGradient></defs>"
              f"<g fill='none' stroke='{GOLD}' stroke-opacity='.8'><ellipse cx='30' cy='44' rx='13' ry='24'/><path d='M30 20v48'/></g>"
              f"<rect x='20' y='66' width='20' height='6' rx='2' fill='{GOLD}'/><path d='M26 72v20M30 72v24M34 72v20' stroke='{RED}' stroke-width='2'/>", '0 0 60 100')
skin('Imperial China', f"""
html[data-skin=chinese]{{
  --bg:#13070a;--glow:#5a0f14;--acc:{GOLD};--acc2:{RED};--fg:#f8ead0;--mut:#c2a985;--on:#2a0a06;--r:4px;
  --card:#22090d;--card2:#331015;--line:color-mix(in srgb,{GOLD} 40%,transparent);--line2:{GOLD}aa;
  --disp:'ZCOOL XiaoWei','Lora',serif;--body:'Lora',Georgia,serif;--mono:'ZCOOL XiaoWei','Lora',serif;
  --clip:none;--pshadow:inset 0 0 0 3px var(--card),inset 0 0 0 4px color-mix(in srgb,{GOLD} 45%,transparent),inset 0 0 30px #0006;
  --deco:{corners(cn_corner, 26)},linear-gradient({RED},{RED}) 50% 0/40px 3px;--rep:no-repeat;
  --orn:{cn_orn};--orn-h:18px}}
html[data-skin=chinese] body{{background:radial-gradient(110% 50% at 50% -10%,#7a141a 0,#0000 70%) no-repeat,{cn_cloud} 0 0/64px 64px,var(--bg);background-attachment:fixed}}
html[data-skin=chinese] body::after{{top:-6px;right:14px;width:46px;height:78px;background:{lantern} center/contain no-repeat;transform-origin:50% 0;animation:sway 4s ease-in-out infinite alternate;filter:drop-shadow(0 0 14px #ff6a2a88);opacity:.9}}
html[data-skin=chinese] h2.sec::before{{transform:none;border:0;width:12px;height:12px;background:{RED};box-shadow:inset 0 0 0 2px #f8ead055;border-radius:2px}}
html[data-skin=chinese] .btn{{background:linear-gradient(180deg,{RED},#a91c17);color:#fbe7b0;box-shadow:inset 0 0 0 1px {GOLD},inset 0 0 0 3px #a91c17,inset 0 0 0 4px {GOLD}88}}
html[data-skin=chinese] .btn.ghost{{background:#22090d;color:{GOLD};box-shadow:inset 0 0 0 1px {GOLD}99}}
html[data-skin=chinese] :is(.btn.gold,.btn.chestbtn){{background:linear-gradient(180deg,#f3cf6e,#c08a1f);color:#2a0a06;box-shadow:inset 0 0 0 1px #fff4}}
html[data-skin=chinese] :is(.seg a.on,.dpill.on,.chip.on){{background:#a91c17;color:#fbe7b0;border-color:{GOLD}}}
html[data-skin=chinese] .xpbar i{{background:linear-gradient(90deg,#3fae8a,#9be8c6)}}
""")

# ---------------------------------------------------------------- Zen Japan
VERM, CREAM = '#e5432f', '#f2d8a7'
petal = "<path d='M0 0c4-7 13-7 13 0 0 6-8 10-13 6 4-1 4-5 0-6z' fill='#ffb7c5' fill-opacity='.75'/>"
petals = svg(f"<g transform='translate(20 30) rotate(20)'>{petal}</g><g transform='translate(110 70) rotate(-40)'>{petal}</g>"
             f"<g transform='translate(60 140) rotate(70)'>{petal}</g><g transform='translate(140 170) rotate(10) scale(.7)'>{petal}</g>", '0 0 180 220')
fuji = svg("<path d='M0 120L120 40c10-7 20-9 30-9s20 2 30 9l120 80z' fill='#141f3c'/><path d='M120 40c10-7 20-9 30-9s20 2 30 9l-14 10-8-6-8 8-8-8-8 6z' fill='#2c3d6b'/>", '0 0 300 120')
jp_orn = svg(f"<path d='M4 11C50 3 130 15 236 6' stroke='{VERM}' stroke-width='7' stroke-linecap='round' fill='none'/><path d='M150 10C185 7 215 6 238 5' stroke='{VERM}' stroke-width='3' stroke-linecap='round' fill='none'/>", '0 0 240 16')
seig = "radial-gradient(circle at 50% 100%,#0000 0 8px,#f2d8a714 8px 9px,#0000 9px 13px,#f2d8a714 13px 14px,#0000 14px 18px,#f2d8a714 18px 19px,var(--bg) 19px 20px,#0000 20px)"
skin('Zen Japan', f"""
html[data-skin=japanese]{{
  --bg:#0b1222;--glow:#1d2c52;--acc:{VERM};--acc2:{CREAM};--fg:#f3ecdf;--mut:#a9b2c6;--on:#fff6e6;--r:0;
  --card:#111a30;--card2:#18243f;--line:{CREAM}33;--line2:{CREAM}77;
  --disp:'Shippori Mincho','Zen Kaku Gothic New',serif;--body:'Zen Kaku Gothic New',system-ui,sans-serif;--mono:'Shippori Mincho',serif;
  --clip:none;--pshadow:inset 0 -2px 0 {CREAM}22;--rep:no-repeat;
  --deco:linear-gradient({VERM},{VERM}) 0 0/100% 4px,linear-gradient({VERM},{VERM}) 6px 9px/calc(100% - 12px) 2px,
    linear-gradient({VERM},{VERM}) 14% 0/4px 16px,linear-gradient({VERM},{VERM}) 86% 0/4px 16px,linear-gradient(#1b1b1b,#1b1b1b) 0 0/100% 1px;
  --orn:{jp_orn};--orn-h:16px}}
html[data-skin=japanese] body{{background:radial-gradient(90% 40% at 80% -5%,#2a3d70aa,#0000 70%) no-repeat,
  radial-gradient(circle at 78% 14%,#e5432fcc 0 34px,#e5432f22 40px,#0000 80px) no-repeat,
  linear-gradient(#141f3c,#141f3c) 0 100%/100% 80px no-repeat,{fuji} 50% calc(100% - 78px)/min(560px,140vw) auto no-repeat,{seig} 0 0/40px 20px,{seig} 20px 10px/40px 20px,var(--bg);background-attachment:fixed}}
html[data-skin=japanese] body::after{{inset:0;background:{petals} 0 0/180px 220px;animation:petals 26s linear infinite;opacity:.8}}
html[data-skin=japanese] {P}{{padding-top:20px}}
html[data-skin=japanese] :is(.quest,.mkt,.stat){{padding-top:16px}}
html[data-skin=japanese] h2.sec::before{{transform:none;border:0;width:12px;height:12px;border-radius:50%;background:{VERM}}}
html[data-skin=japanese] .btn{{background:{VERM};color:#fff6e6;box-shadow:inset 0 -3px 0 #0003}}
html[data-skin=japanese] .btn.ghost{{background:transparent;color:{CREAM};box-shadow:inset 0 0 0 1px {CREAM}66}}
html[data-skin=japanese] :is(.btn.gold,.btn.chestbtn){{background:{CREAM};color:#2a1a0a}}
html[data-skin=japanese] :is(.seg a.on,.dpill.on){{background:{VERM};color:#fff6e6}}
html[data-skin=japanese] .xpbar i{{background:linear-gradient(90deg,{VERM},#ff8f6e)}}
""")

# ---------------------------------------------------------------- Fairy Tale Forest
LEAF = '#9be27a'
vine = (f"<path d='M3 38C3 22 10 9 38 3' stroke='#6cbf55' stroke-width='2' fill='none' stroke-linecap='round'/>"
        f"<path d='M9 22c-6-2-9 2-9 6 5 0 8-2 9-6z' fill='{LEAF}'/><path d='M15 12c-1-6 3-9 7-9 0 5-3 8-7 9z' fill='{LEAF}'/>"
        f"<path d='M27 6c3-5 8-5 10-2-3 3-7 4-10 2z' fill='#7fd060'/>"
        "<g transform='translate(5 33)'><circle r='3.2' fill='#ffd1e8'/><circle r='1.3' fill='#ffd86a'/></g>")
trees = svg(''.join(f"<path d='M{x} {120-h}l{w} {h*0.45}h-{w*0.55}l{w*0.9} {h*0.35}h-{w*0.6}l{w*0.9} {h*0.25}H{x-w*1.25}l{w*0.9}-{h*0.25}h-{w*0.6}l{w*0.9}-{h*0.35}h-{w*0.55}z' fill='#0a2414'/>"
                    for x, h, w in [(20, 70, 16), (60, 100, 22), (105, 60, 14), (140, 92, 20), (185, 75, 17), (225, 110, 24), (270, 66, 15)])
            + "<rect y='118' width='300' height='4' fill='#0a2414'/>", '0 0 300 122')
fireflies = svg("<g fill='#ffd86a'><circle cx='20' cy='30' r='1.6'/><circle cx='120' cy='80' r='1.3'/><circle cx='70' cy='150' r='1.8'/><circle cx='160' cy='190' r='1.2'/><circle cx='40' cy='210' r='1.5'/></g>", '0 0 180 230')
fairy_orn = svg("<path d='M2 12C60 2 180 22 238 10' stroke='#6cbf55' stroke-width='2' fill='none'/>"
                + ''.join(f"<path d='M{x} {y}c-6-1-9 2-9 6 5 0 8-2 9-6z' fill='{LEAF}'/>" for x, y in [(40, 7), (90, 11), (150, 13), (200, 10)])
                + "<circle cx='120' cy='12' r='4' fill='#ffd1e8'/><circle cx='120' cy='12' r='1.6' fill='#ffd86a'/>", '0 0 240 24')
skin('Fairy Tale Forest', f"""
html[data-skin=fairy]{{
  --bg:#06130c;--glow:#1d4a2b;--acc:{LEAF};--acc2:#ffd86a;--fg:#f4f1dc;--mut:#aabd9f;--on:#0d2a12;--r:18px;
  --card:#0d2216e6;--card2:#163322;--line:{LEAF}40;--line2:{LEAF}88;
  --disp:'IM Fell English SC','Lora',serif;--body:'Lora',Georgia,serif;--mono:'IM Fell English SC','Lora',serif;
  --clip:none;--pshadow:inset 0 0 22px {LEAF}14,0 6px 18px #0006;--rep:no-repeat;
  --deco:{corners(vine, 40, 'tl br')};--orn:{fairy_orn};--orn-h:24px}}
html[data-skin=fairy] body{{background:radial-gradient(circle at 82% 8%,#fff8d8 0 26px,#fff8d855 30px,#0000 70px) no-repeat,
  linear-gradient(#0a2414,#0a2414) 0 100%/100% 80px no-repeat,{trees} 0 calc(100% - 78px)/300px auto repeat-x,
  linear-gradient(180deg,#0b2a3a 0,var(--bg) 60%);background-attachment:fixed}}
html[data-skin=fairy] body::after{{inset:0;background:{fireflies} 0 0/180px 230px,{fireflies} 70px 110px/240px 300px;animation:fireflies 9s ease-in-out infinite alternate}}
html[data-skin=fairy] h2.sec::before{{transform:rotate(-30deg);border:0;width:10px;height:14px;border-radius:0 100% 0 100%;background:{LEAF}}}
html[data-skin=fairy] .btn{{border-radius:99px;background:linear-gradient(180deg,#a8ea86,#5aa04a);color:#0d2a12;box-shadow:inset 0 -3px 0 #0003,0 0 14px {LEAF}44}}
html[data-skin=fairy] .btn.ghost{{background:#0d2216;color:#c6f0ad;box-shadow:inset 0 0 0 1px {LEAF}66}}
html[data-skin=fairy] :is(.btn.gold,.btn.chestbtn){{background:linear-gradient(180deg,#ffe58f,#e0a83a);color:#3a2306}}
html[data-skin=fairy] :is(.chip,.seg a.on,.dpill){{border-radius:99px}}
html[data-skin=fairy] :is(.seg a.on,.dpill.on){{background:{LEAF};color:#0d2a12}}
html[data-skin=fairy] .xpbar i{{background:linear-gradient(90deg,#5aa04a,{LEAF},#ffd86a)}}
""")

# ---------------------------------------------------------------- Medieval Castle
MG = '#c9a24a'
md_corner = (f"<path d='M1 1h26l-6 6H7v14l-6 6z' fill='#2c2416' stroke='{MG}' stroke-width='1.5'/>"
             f"<circle cx='5' cy='5' r='2.2' fill='#e8c46a'/><circle cx='17' cy='4' r='1.5' fill='#e8c46a'/><circle cx='4' cy='17' r='1.5' fill='#e8c46a'/>"
             f"<path d='M27 1c4 0 6 3 4 6-1-2-3-2-4-1z M1 27c0 4 3 6 6 4-2-1-2-3-1-4z' fill='{MG}'/>")
md_orn = svg(f"<path d='M0 12H100M140 12H240' stroke='{MG}' stroke-width='2'/><path d='M100 12l6-4v8zM140 12l-6-4v8z' fill='{MG}'/>"
             f"<path d='M110 2h20v10c0 7-5 10-10 12-5-2-10-5-10-12z' fill='#8a2a22' stroke='{MG}' stroke-width='1.5'/><path d='M120 5v16M113 11h14' stroke='{MG}' stroke-width='1.5'/>", '0 0 240 26')
skin('Medieval Castle', f"""
html[data-skin=medieval]{{
  --bg:#141210;--glow:#3d2c14;--acc:{MG};--acc2:#b8352b;--fg:#efe3c4;--mut:#a99a7c;--on:#f6e6bf;--r:4px;
  --card:#1f1a13;--card2:#2a2318;--line:{MG}4d;--line2:{MG}99;
  --disp:'MedievalSharp','EB Garamond',serif;--body:'EB Garamond',Georgia,serif;--mono:'MedievalSharp',serif;
  --clip:polygon(6px 0,calc(100% - 6px) 0,100% 6px,100% calc(100% - 6px),calc(100% - 6px) 100%,6px 100%,0 calc(100% - 6px),0 6px);
  --pshadow:inset 0 0 0 3px #1f1a13,inset 0 0 0 4px {MG}66,inset 0 0 30px #0007;--rep:no-repeat;
  --deco:{corners(md_corner, 34)};--orn:{md_orn};--orn-h:26px}}
html[data-skin=medieval] body{{font-size:17px;background:radial-gradient(100% 50% at 50% -10%,#4a3418aa,#0000 70%) no-repeat,
  linear-gradient(#0000 30px,#00000066 30px 32px) 0 0/64px 32px,conic-gradient(from 270deg at 2px 32px,#00000066 0 90deg,#0000 0) 0 0/64px 64px,
  conic-gradient(from 180deg at 2px 32px,#00000066 0 90deg,#0000 0) 32px 0/64px 64px,linear-gradient(135deg,#1b1814,#121010);background-attachment:fixed}}
html[data-skin=medieval] body::after{{inset:0;background:radial-gradient(circle at 0 18%,#ff8a2a40,#0000 32%),radial-gradient(circle at 100% 18%,#ff8a2a40,#0000 32%);animation:torch 2.2s steps(3) infinite alternate}}
html[data-skin=medieval] {P}{{background-image:linear-gradient(180deg,#2a2218,#1a150f)}}
html[data-skin=medieval] h2.sec::before{{transform:none;border:0;width:11px;height:13px;background:#b8352b;clip-path:polygon(0 0,100% 0,100% 60%,50% 100%,0 60%);box-shadow:inset 0 0 0 2px {MG}}}
html[data-skin=medieval] .btn{{background:linear-gradient(180deg,#b8352b,#7a1f18);color:#f6e6bf;box-shadow:inset 0 0 0 1px {MG},inset 0 0 0 3px #7a1f18,inset 0 0 0 4px {MG}88;
  clip-path:polygon(6px 0,calc(100% - 6px) 0,100% 6px,100% calc(100% - 6px),calc(100% - 6px) 100%,6px 100%,0 calc(100% - 6px),0 6px)}}
html[data-skin=medieval] .btn.ghost{{background:#1f1a13;color:#e8c46a;box-shadow:inset 0 0 0 1px {MG}88}}
html[data-skin=medieval] :is(.btn.gold,.btn.chestbtn){{background:linear-gradient(180deg,#f0cf74,#a9822c);color:#2a1d06}}
html[data-skin=medieval] :is(.seg a.on,.dpill.on){{background:#7a1f18;color:#f6e6bf}}
""")

# ---------------------------------------------------------------- Steampunk Works
BR, CU = '#e8c06a', '#d08a3c'
gear_svg = svg(f"<g fill='none' stroke='{BR}'><circle cx='100' cy='100' r='80' stroke-width='22' stroke-dasharray='20 13.5'/><circle cx='100' cy='100' r='64' stroke-width='10'/>"
               f"<circle cx='100' cy='100' r='22' stroke-width='10'/><path d='M100 36v42M100 122v42M36 100h42M122 100h42' stroke-width='10'/></g>", '0 0 200 200')
sp_corner = (f"<path d='M1 1h30L1 31z' fill='#3a2614' stroke='{BR}' stroke-width='1.5'/>"
             f"<circle cx='6' cy='6' r='2.4' fill='{BR}'/><circle cx='20' cy='5' r='1.6' fill='{CU}'/><circle cx='5' cy='20' r='1.6' fill='{CU}'/>"
             f"<circle cx='13' cy='13' r='5' fill='none' stroke='{BR}' stroke-width='3' stroke-dasharray='2.2 1.7'/>")
sp_orn = svg(f"<rect x='0' y='9' width='240' height='6' rx='3' fill='{CU}'/><rect x='0' y='9' width='240' height='2' fill='#ffe2a0' fill-opacity='.5'/>"
             f"<circle cx='120' cy='12' r='11' fill='#1e150c' stroke='{BR}' stroke-width='3'/><path d='M120 12l6-5' stroke='#e8433a' stroke-width='2'/>"
             f"<rect x='60' y='5' width='8' height='14' rx='2' fill='{BR}'/><rect x='172' y='5' width='8' height='14' rx='2' fill='{BR}'/>", '0 0 240 24')
skin('Steampunk Works', f"""
html[data-skin=steampunk]{{
  --bg:#120c07;--glow:#4a2a10;--acc:{CU};--acc2:{BR};--fg:#f2e3c7;--mut:#b49c7c;--on:#2a1606;--r:8px;
  --card:#1e150c;--card2:#2a1d10;--line:{CU}55;--line2:{BR}99;
  --disp:'Rye','Lora',serif;--body:'Lora',Georgia,serif;--mono:'Special Elite','Lora',serif;
  --clip:none;--pshadow:inset 0 0 0 2px {BR}33,inset 0 0 26px #0008;--rep:no-repeat;
  --deco:{corners(sp_corner, 30)},linear-gradient(90deg,#0000,{BR}66,#0000) 50% 0/70% 2px;--orn:{sp_orn};--orn-h:24px}}
html[data-skin=steampunk] body{{background:radial-gradient(100% 50% at 50% -10%,#5a3214aa,#0000 70%) no-repeat,
  linear-gradient(#0000 0 70%,{CU}1a 70% 72%,#0000 72%) 0 0/100% 260px,linear-gradient(90deg,#0000 0 86%,{CU}14 86% 88%,#0000 88%) 0 0/300px 100%,
  linear-gradient(135deg,#1a110a,#0e0905);background-attachment:fixed}}
html[data-skin=steampunk] body::after{{right:-140px;top:26%;width:400px;aspect-ratio:1;opacity:.10;background:{gear_svg} center/contain no-repeat;animation:spin 60s linear infinite}}
html[data-skin=steampunk] h2.sec::before{{content:"⚙";transform:none;border:0;width:auto;height:auto;color:{BR};font-size:18px;line-height:1}}
html[data-skin=steampunk] .btn{{background:linear-gradient(180deg,#f0cd7a,#c4893a 55%,#8a5520);color:#2a1606;box-shadow:inset 0 0 0 1px #ffe2a088,inset 0 -3px 0 #0004}}
html[data-skin=steampunk] .btn.ghost{{background:#1e150c;color:{BR};box-shadow:inset 0 0 0 1px {CU}88}}
html[data-skin=steampunk] :is(.btn.gold,.btn.chestbtn){{background:linear-gradient(180deg,#ffe9a8,#d9a441);color:#2a1606}}
html[data-skin=steampunk] :is(.seg a.on,.dpill.on){{background:linear-gradient(180deg,{BR},#b8792f);color:#2a1606}}
html[data-skin=steampunk] .xpbar{{background:linear-gradient(180deg,#ffffff18,#0000 55%),#140d07;box-shadow:inset 0 0 0 1px {BR}88,inset 0 2px 4px #000a}}
html[data-skin=steampunk] .xpbar i{{background:linear-gradient(180deg,#ffe2a0 0 25%,{CU} 26%,#8a4a18)}}
""")

# ---------------------------------------------------------------- Olympus (Ancient Greece)
OG, MARBLE = '#e3c16f', '#f2efe6'
meander = svg(f"<path d='M0 15H11V3H3V11H7V7' fill='none' stroke='{OG}' stroke-width='1.6'/><path d='M12 15H23V3H15V11H19V7' fill='none' stroke='{OG}' stroke-width='1.6'/>", '0 0 24 18')
laurel = svg(f"<g fill='none' stroke='{OG}' stroke-width='1.6'><path d='M118 22C90 22 60 16 30 4'/><path d='M122 22C150 22 180 16 210 4'/></g><g fill='{OG}'>"
             + ''.join(f"<ellipse cx='{x}' cy='{y}' rx='7' ry='2.6' transform='rotate({r} {x} {y})'/><ellipse cx='{240-x}' cy='{y}' rx='7' ry='2.6' transform='rotate({-r} {240-x} {y})'/>"
                       for x, y, r in [(45, 6, 30), (60, 13, 15), (75, 12, 35), (90, 18, 12), (105, 17, 30)])
             + "<circle cx='120' cy='20' r='3.5'/></g>", '0 0 240 26')
temple = svg("<path d='M10 60L150 10l140 50z' fill='#121d3a'/>" + ''.join(f"<rect x='{x}' y='64' width='14' height='80' fill='#121d3a'/>" for x in range(30, 280, 32))
             + "<rect x='10' y='60' width='280' height='6' fill='#121d3a'/><rect x='0' y='144' width='300' height='12' fill='#121d3a'/>", '0 0 300 156')
skin('Olympus', f"""
html[data-skin=greek]{{
  --bg:#08112a;--glow:#1d2e63;--acc:{OG};--acc2:#7fb2ff;--fg:{MARBLE};--mut:#a7b1c8;--on:#0b1530;--r:2px;
  --card:#0e1937;--card2:#152349;--line:{OG}44;--line2:{OG}99;
  --disp:'Cinzel','Cormorant Garamond',serif;--body:'Cormorant Garamond',Georgia,serif;--mono:'Cinzel',serif;
  --clip:none;--pshadow:inset 0 0 0 1px {OG}22,inset 0 0 34px #0006;
  --deco:{meander} 0 0/24px 18px,{meander} 0 100%/24px 18px;--rep:repeat-x;--orn:{laurel};--orn-h:26px}}
html[data-skin=greek] body{{font-size:18px;font-weight:600;background:radial-gradient(100% 45% at 50% -8%,#2a3f85aa,#0000 70%) no-repeat,
  linear-gradient(#121d3a,#121d3a) 0 100%/100% 80px no-repeat,{temple} 50% calc(100% - 78px)/min(520px,130vw) auto no-repeat,radial-gradient(circle,#fff 0 1px,#0000 1.5px) 0 0/90px 110px,radial-gradient(circle,#fff8 0 .8px,#0000 1.2px) 40px 50px/70px 80px,var(--bg);background-attachment:fixed}}
html[data-skin=greek] {P}{{padding-top:24px;padding-bottom:24px}}
html[data-skin=greek] :is(.quest,.mkt,.stat){{padding-top:20px;padding-bottom:20px}}
html[data-skin=greek] h2.sec::before{{transform:none;border:2px solid {OG};width:10px;height:10px;border-radius:50%;box-shadow:0 0 0 2px var(--bg),0 0 0 3px {OG}}}
html[data-skin=greek] .btn{{background:linear-gradient(180deg,#f5dc92,#c49a3a);color:#0b1530;box-shadow:inset 0 0 0 1px #fff6,inset 0 -3px 0 #0003}}
html[data-skin=greek] .btn.ghost{{background:#0e1937;color:{MARBLE};box-shadow:inset 0 0 0 1px {OG}88}}
html[data-skin=greek] :is(.seg a.on,.dpill.on){{background:{OG};color:#0b1530}}
html[data-skin=greek] .xpbar i{{background:linear-gradient(90deg,#c49a3a,#f5dc92)}}
""")

# ---------------------------------------------------------------- Ancient Egypt
EG, TQ = '#e2b84a', '#2ec4b6'
eg_band = svg(f"<path d='M0 10L5 0 10 10z' fill='{EG}'/><path d='M10 10L15 0 20 10z' fill='{TQ}'/><rect y='10' width='20' height='2' fill='{EG}'/>", '0 0 20 12')
pyr = svg("<path d='M0 120L90 30l90 90z' fill='#2a1a0d'/><path d='M90 30l90 90h-40z' fill='#1c1208'/><path d='M150 120l70-60 70 60z' fill='#24170b'/><path d='M220 60l70 60h-30z' fill='#170f07'/>", '0 0 300 120')
wsun = svg(f"<circle cx='120' cy='14' r='10' fill='{EG}'/><circle cx='120' cy='14' r='10' fill='none' stroke='#b8352b' stroke-width='2'/>"
           + ''.join(f"<path d='M{108-i*14} {8+i*2}H{40+i*10}' stroke='{c}' stroke-width='3'/><path d='M{132+i*14} {8+i*2}H{200-i*10}' stroke='{c}' stroke-width='3'/>" for i, c in enumerate([EG, TQ, EG, TQ])), '0 0 240 28')
ankh = svg(f"<g fill='none' stroke='{EG}' stroke-width='3'><ellipse cx='8' cy='6' rx='4.5' ry='5'/><path d='M8 11v12M2 13h12'/></g>", '0 0 16 24')
skin('Ancient Egypt', f"""
html[data-skin=egypt]{{
  --bg:#0c1634;--glow:#1d2f6b;--acc:{EG};--acc2:{TQ};--fg:#f6ecd2;--mut:#b6b09a;--on:#1a1206;--r:2px;
  --card:#102046;--card2:#172b5c;--line:{EG}44;--line2:{EG}99;
  --disp:'Cinzel Decorative','Lora',serif;--body:'Lora',Georgia,serif;--mono:'Cinzel Decorative',serif;
  --clip:none;--pshadow:inset 0 0 0 1px {EG}33,inset 0 0 30px #0007;
  --deco:{eg_band} 0 0/20px 12px,{eg_band} 0 100%/20px 12px;--rep:repeat-x;--orn:{wsun};--orn-h:28px}}
html[data-skin=egypt] body{{background:radial-gradient(circle at 80% 10%,#fff3c8 0 22px,#fff3c844 28px,#0000 60px) no-repeat,
  linear-gradient(#24170b,#24170b) 0 100%/100% 80px no-repeat,{pyr} 50% calc(100% - 78px)/min(560px,140vw) auto no-repeat,radial-gradient(circle,#fff 0 1px,#0000 1.5px) 0 0/80px 100px,
  linear-gradient(180deg,#0c1634 0,#1c1d3a 60%,#3a2412 100%);background-attachment:fixed}}
html[data-skin=egypt] {P}{{padding-top:22px;padding-bottom:22px}}
html[data-skin=egypt] :is(.quest,.mkt,.stat){{padding-top:18px;padding-bottom:18px}}
html[data-skin=egypt] h2.sec::before{{transform:none;border:0;width:14px;height:20px;background:{ankh} center/contain no-repeat}}
html[data-skin=egypt] .btn{{background:linear-gradient(180deg,#f3d27a,#b98a28);color:#1a1206;box-shadow:inset 0 0 0 1px #fff5,inset 0 -3px 0 #0003}}
html[data-skin=egypt] .btn.ghost{{background:#102046;color:{TQ};box-shadow:inset 0 0 0 1px {TQ}88}}
html[data-skin=egypt] :is(.seg a.on,.dpill.on){{background:{TQ};color:#06201d}}
html[data-skin=egypt] .xpbar i{{background:linear-gradient(90deg,{TQ},{EG})}}
""")

# ---------------------------------------------------------------- Viking Saga
VB, FR = '#c8913e', '#8fd3ff'
knot = (f"<g fill='none' stroke='{VB}' stroke-width='2.4'><circle cx='12' cy='12' r='8'/><circle cx='22' cy='12' r='8'/><circle cx='12' cy='22' r='8'/></g>"
        f"<path d='M2 2h34M2 2v34' stroke='{VB}' stroke-width='2'/>")
mount = svg("<path d='M0 120L40 60l20 18 40-50 40 52 25-28 45 45 40-50 50 40v33z' fill='#1b2a38'/>"
            "<path d='M100 28l-12 15 7-2 5 6 5-7 7 3zM265 37l-10 12 6-2 4 5 4-6 6 3zM40 60l-8 10 5-1 3 4 3-5 5 2z' fill='#d6ecff' fill-opacity='.75'/>"
            "<path d='M0 120L60 85l40 20 50-40 60 45 40-25 50 35z' fill='#0f1922'/>", '0 0 300 120')
runes = svg(f"<g stroke='{VB}' stroke-width='2.4' fill='none'>"
            + ''.join(f"<path transform='translate({x} 2)' d='{d}'/>" for x, d in [(20, 'M2 0v20M2 4l8-4M2 10l8-4'), (50, 'M2 0v20M2 0l8 8-8 8'), (80, 'M5 0v20M0 6l5 6 5-6'),
                                                                              (110, 'M2 0v20M10 0v20M2 6l8 8'), (140, 'M2 0v20M2 0l8 6M10 6v14'), (170, 'M0 10l5-10 5 10-5 10z'), (200, 'M5 0v20M0 4l5 4 5-4')])
            + f"</g><path d='M0 24H240' stroke='{FR}' stroke-opacity='.5'/>", '0 0 240 26')
skin('Viking Saga', f"""
html[data-skin=viking]{{
  --bg:#070c11;--glow:#123a3a;--acc:{VB};--acc2:{FR};--fg:#eef3f6;--mut:#9fb0bd;--on:#140c04;--r:4px;
  --card:#1a140f;--card2:#261d15;--line:{VB}4d;--line2:{VB}99;
  --disp:'Metamorphous','Alegreya',serif;--body:'Alegreya',Georgia,serif;--mono:'Metamorphous',serif;
  --clip:none;--pshadow:inset 0 0 0 1px {FR}22,inset 0 0 30px #0008;--rep:no-repeat;
  --deco:{corners(knot, 32)};--orn:{runes};--orn-h:26px}}
html[data-skin=viking] body{{background:linear-gradient(#0f1922,#0f1922) 0 100%/100% 80px no-repeat,{mount} 50% calc(100% - 78px)/min(560px,140vw) auto no-repeat,radial-gradient(circle,#fff 0 1px,#0000 1.5px) 0 0/90px 120px,linear-gradient(180deg,#05080c,#0b1620 70%);background-attachment:fixed}}
html[data-skin=viking] body::after{{inset:-10% 0 auto 0;height:55%;background:linear-gradient(100deg,#0000 10%,#3dff9a33 30%,#0000 45%,#9b6bff2a 60%,#0000 75%),linear-gradient(80deg,#0000 20%,#2ee6d62e 40%,#0000 60%);
  filter:blur(18px);animation:aurora 14s ease-in-out infinite alternate}}
html[data-skin=viking] {P}{{background-image:repeating-linear-gradient(90deg,#ffffff05 0 2px,#0000 2px 9px),linear-gradient(180deg,#221a12,#15100b)}}
html[data-skin=viking] h2.sec::before{{transform:none;border:0;width:10px;height:14px;background:{FR};clip-path:polygon(50% 0,100% 50%,50% 100%,0 50%)}}
html[data-skin=viking] .btn{{background:linear-gradient(180deg,#e0a85a,#8a5a22);color:#140c04;box-shadow:inset 0 0 0 1px #ffe0a888,inset 0 -3px 0 #0005}}
html[data-skin=viking] .btn.ghost{{background:#1a140f;color:{FR};box-shadow:inset 0 0 0 1px {FR}66}}
html[data-skin=viking] :is(.seg a.on,.dpill.on){{background:{VB};color:#140c04}}
html[data-skin=viking] .xpbar i{{background:linear-gradient(90deg,#5ab8ff,{FR})}}
""")

# ---------------------------------------------------------------- Pirate Seas
PG, SEA = '#e0b55a', '#3fb6a8'
waves = svg(f"<path d='M0 10c10-8 20-8 30 0s20 8 30 0' fill='none' stroke='{SEA}' stroke-opacity='.16' stroke-width='2'/>", '0 0 60 20')
compass = svg(f"<g fill='none' stroke='{PG}'><circle cx='100' cy='100' r='90' stroke-width='3'/><circle cx='100' cy='100' r='70' stroke-dasharray='2 6' stroke-width='3'/></g>"
              f"<path d='M100 10l12 88-12 2-12-2zM100 190l-12-88 12-2 12 2z' fill='{PG}'/><path d='M10 100l88-12 2 12-2 12zM190 100l-88 12-2-12 2-12z' fill='{PG}' fill-opacity='.7'/>"
              f"<circle cx='100' cy='100' r='6' fill='{PG}'/>", '0 0 200 200')
anchor = svg(f"<g fill='none' stroke='{PG}' stroke-width='2.6' stroke-linecap='round'><circle cx='10' cy='4' r='3'/><path d='M10 7v16M4 11h12M2 17c1 5 5 7 8 7s7-2 8-7'/></g>", '0 0 20 26')
rope = 'repeating-linear-gradient(45deg,#c99a55 0 3px,#6e4f26 3px 6px)'
swords = svg(f"<path d='M0 13H90M150 13H240' stroke='{PG}' stroke-width='2'/><g stroke='#d8dde2' stroke-width='3' stroke-linecap='round'><path d='M100 2l40 22M140 2l-40 22'/></g>"
             f"<g stroke='{PG}' stroke-width='3'><path d='M104 20l6-3M136 20l-6-3'/></g><circle cx='120' cy='13' r='4' fill='{PG}'/>", '0 0 240 26')
brass_ring = f"<circle cx='9' cy='9' r='6' fill='none' stroke='{PG}' stroke-width='3'/><circle cx='9' cy='9' r='2' fill='{PG}'/>"
skin('Pirate Seas', f"""
html[data-skin=pirate]{{
  --bg:#04121a;--glow:#0d3a44;--acc:{PG};--acc2:{SEA};--fg:#f5ead2;--mut:#b2a98f;--on:#1e1406;--r:6px;
  --card:#2a2016;--card2:#3a2c1d;--line:{PG}44;--line2:{PG}99;
  --disp:'Pirata One','IM Fell English',serif;--body:'IM Fell English','Lora',serif;--mono:'Pirata One',serif;
  --clip:none;--pshadow:inset 0 0 40px #0009,inset 0 0 0 9px #2a2016,inset 0 0 0 10px {PG}55;
  --deco:{rope} 0 0/100% 6px,{rope} 0 100%/100% 6px,{rope} 0 0/6px 100%,{rope} 100% 0/6px 100%,{corners(brass_ring, 22)};--rep:no-repeat;--orn:{swords};--orn-h:26px}}
html[data-skin=pirate] body{{font-size:17px;background:radial-gradient(circle at 18% 9%,#fff7d8 0 18px,#fff7d844 24px,#0000 60px) no-repeat,{waves} 0 0/60px 20px,linear-gradient(180deg,#071c28,#04121a 70%);background-attachment:fixed}}
html[data-skin=pirate] body::after{{right:-120px;bottom:120px;width:340px;aspect-ratio:1;opacity:.12;background:{compass} center/contain no-repeat;animation:spin 120s linear infinite}}
html[data-skin=pirate] {P}{{background-image:radial-gradient(120% 90% at 50% 40%,#3a2c1d,#241b12)}}
html[data-skin=pirate] h2.sec::before{{transform:none;border:0;width:16px;height:20px;background:{anchor} center/contain no-repeat}}
html[data-skin=pirate] .btn{{background:linear-gradient(180deg,#f0cd7a,#b88a34);color:#1e1406;box-shadow:inset 0 0 0 2px #6e4f26,inset 0 -3px 0 #0004}}
html[data-skin=pirate] .btn.ghost{{background:#2a2016;color:{PG};box-shadow:inset 0 0 0 1px {PG}88}}
html[data-skin=pirate] :is(.seg a.on,.dpill.on){{background:{SEA};color:#04121a}}
html[data-skin=pirate] .xpbar i{{background:linear-gradient(90deg,{SEA},#8ef0e2)}}
""")

# ---------------------------------------------------------------- Outrun 80s
PK, CY = '#ff3cc7', '#00f0ff'
_lines = ''.join(f"<path d='M200 0L{200 + (x - 200) * 6} 200' />" for x in range(-40, 441, 40))
_rows = ''.join(f"<path d='M0 {200 * (1 - 1 / (1 + k * 0.35)) * 1.6:.1f}H400' />" for k in range(1, 14))
floor = svg(f"<g stroke='{PK}' stroke-width='1.6' stroke-opacity='.75' fill='none'>{_lines}{_rows}</g><rect width='400' height='3' fill='{PK}'/>", '0 0 400 200')
skin('Outrun 80s', f"""
html[data-skin=outrun]{{
  --bg:#12002a;--glow:#4a0a6a;--acc:{PK};--acc2:{CY};--fg:#fdf2ff;--mut:#c5a7d8;--on:#1a0020;--r:4px;
  --card:#1a0533e6;--card2:#2a0a4a;--line:{PK}66;--line2:{PK}cc;
  --disp:'Audiowide','Exo 2',sans-serif;--body:'Exo 2',system-ui,sans-serif;--mono:'Audiowide',sans-serif;
  --clip:none;--pshadow:0 0 14px {PK}55,inset 0 0 18px {CY}22;--rep:no-repeat;
  --deco:linear-gradient(90deg,{CY},{PK}) 0 0/100% 2px,linear-gradient(90deg,{PK},{CY}) 0 100%/100% 1px;
  --orn:linear-gradient(90deg,{PK},{CY},#0000);--orn-h:3px}}
html[data-skin=outrun] body{{background:{floor} 50% 100%/max(100%,520px) 34vh no-repeat,radial-gradient(circle,#fff 0 1px,#0000 1.5px) 0 0/70px 90px,linear-gradient(180deg,#0b0020 0,#2a0650 40%,#a0187a 64%,#ff6a3d 66%,#12002a 66.3%);background-attachment:fixed}}
html[data-skin=outrun] body::after{{left:50%;top:calc(66vh - 115px);width:230px;height:115px;transform:translateX(-50%);border-radius:115px 115px 0 0;animation:sunglow 4s ease-in-out infinite alternate;
  background:linear-gradient(180deg,#ffe14d,#ff6a3d 55%,{PK});-webkit-mask:repeating-linear-gradient(180deg,#000 0 12px,#0000 12px 16px);mask:repeating-linear-gradient(180deg,#000 0 12px,#0000 12px 16px);opacity:.55;filter:drop-shadow(0 0 30px #ff3cc7)}}
html[data-skin=outrun] h1{{font-style:italic;background:linear-gradient(180deg,#fff 0,#9ff6ff 46%,#3a0a6a 50%,#ff9ae0 90%);-webkit-background-clip:text;background-clip:text;color:transparent;text-shadow:none;filter:drop-shadow(0 0 8px {PK}aa)}}
html[data-skin=outrun] h1::after{{box-shadow:0 0 10px {PK}}}
html[data-skin=outrun] h2.sec::before{{transform:skewX(-20deg);border:0;width:16px;height:8px;background:linear-gradient(90deg,{PK},{CY})}}
html[data-skin=outrun] .btn{{background:linear-gradient(90deg,{PK},#ff8a3d);color:#1a0020;box-shadow:0 0 16px {PK}88}}
html[data-skin=outrun] .btn.ghost{{background:#1a0533;color:{CY};box-shadow:inset 0 0 0 1px {CY},0 0 10px {CY}55}}
html[data-skin=outrun] :is(.seg a.on,.dpill.on){{background:{CY};color:#12002a}}
html[data-skin=outrun] .xpbar i{{background:linear-gradient(90deg,{PK},{CY});box-shadow:0 0 10px {PK}}}
""")

# ---------------------------------------------------------------- Arcade 8-bit
AC, AY = '#00e4ff', '#ffe14d'
stars8 = svg("<g shape-rendering='crispEdges'><rect x='5' y='9' width='2' height='2' fill='#fff'/><rect x='40' y='30' width='2' height='2' fill='#ffe14d'/><rect x='70' y='60' width='2' height='2' fill='#00e4ff'/><rect x='22' y='72' width='2' height='2' fill='#ff3b5c'/></g>", '0 0 90 90')
hearts = svg("<g shape-rendering='crispEdges' fill='#ff3b5c'>" + ''.join(
    f"<path transform='translate({x} 0)' d='M2 0h4v2h2V0h4v2h2v6h-2v2h-2v2h-2v2H6v-2H4v-2H2V8H0V2h2z'/>" for x in (0, 20, 40)) + "</g>", '0 0 56 14')
step = 'polygon(0 8px,4px 8px,4px 4px,8px 4px,8px 0,calc(100% - 8px) 0,calc(100% - 8px) 4px,calc(100% - 4px) 4px,calc(100% - 4px) 8px,100% 8px,100% calc(100% - 8px),calc(100% - 4px) calc(100% - 8px),calc(100% - 4px) calc(100% - 4px),calc(100% - 8px) calc(100% - 4px),calc(100% - 8px) 100%,8px 100%,8px calc(100% - 4px),4px calc(100% - 4px),4px calc(100% - 8px),0 calc(100% - 8px))'
skin('Arcade 8-bit', f"""
html[data-skin=arcade]{{
  --bg:#05030f;--glow:#1a0a3a;--acc:{AC};--acc2:{AY};--fg:#ffffff;--mut:#9aa3c7;--on:#05030f;--r:0;
  --card:#0d0a24;--card2:#181240;--line:{AC}88;--line2:{AC};
  --disp:'Press Start 2P',monospace;--body:'VT323',ui-monospace,monospace;--mono:'Press Start 2P',monospace;
  --clip:{step};--pshadow:inset 0 0 0 3px {AC}aa,inset 0 0 0 6px #0d0a24,inset 0 0 0 7px {AC}44;--deco:none;--rep:no-repeat;--orn:{hearts};--orn-h:14px}}
html[data-skin=arcade] body{{font-size:21px;line-height:1.15;background:{stars8} 0 0/90px 90px,radial-gradient(100% 60% at 50% -10%,#2a0f6a,#0000 70%) no-repeat,var(--bg);background-attachment:fixed}}
html[data-skin=arcade] body::after{{inset:0;background:repeating-linear-gradient(0deg,#0000 0 2px,#00000040 2px 4px);animation:crt 3s steps(2) infinite}}
html[data-skin=arcade] h1{{font-size:18px;line-height:1.5;text-shadow:3px 3px 0 #ff3b5c}}
html[data-skin=arcade] h2{{font-size:13px;line-height:1.5}}html[data-skin=arcade] h2.sec{{font-size:11px}}
html[data-skin=arcade] :is(h3,.hn,.lbl,.why summary,details summary,.opt b){{font-size:11px;line-height:1.5}}
html[data-skin=arcade] :is(.stat b,.ring b,.wnum b){{font-size:16px}}html[data-skin=arcade] .bignum{{font-size:48px}}html[data-skin=arcade] #rest .t{{font-size:50px}}
html[data-skin=arcade] .mut{{font-size:18px}}
html[data-skin=arcade] {P}{{border:0}}
html[data-skin=arcade] h2.sec::before{{transform:none;border:0;width:10px;height:10px;background:{AY};box-shadow:4px 4px 0 #ff3b5c}}
html[data-skin=arcade] :is(.btn,.btn.sm){{clip-path:{step};font-size:11px;background:{AY};color:#05030f;box-shadow:inset 0 -5px 0 #0006,inset 0 3px 0 #fff8}}
html[data-skin=arcade] .btn.ghost{{background:#0d0a24;color:{AC};box-shadow:inset 0 0 0 3px {AC}}}
html[data-skin=arcade] :is(.chip,.seg a,.dpill,nav a span){{font-size:9px}}
html[data-skin=arcade] :is(.seg a.on,.dpill.on){{background:{AC};color:#05030f}}
html[data-skin=arcade] :is(.xpbar,.qbar,.prog,.hp,.rkbar){{border-radius:0;box-shadow:inset 0 0 0 2px {AC}}}
html[data-skin=arcade] :is(.xpbar i,.qbar i,.prog i,.hp i,.rkbar i){{border-radius:0;background:repeating-linear-gradient(90deg,{AY} 0 8px,#0000 8px 10px)}}
""")

# ---------------------------------------------------------------- Mythical Realm
MV, ME, MGD = '#b07cff', '#3ddc97', '#ffd36e'
my_corner = (f"<path d='M2 38V12Q2 2 12 2h26' fill='none' stroke='{MV}' stroke-width='2'/><path d='M8 30V14q0-6 6-6h16' fill='none' stroke='{ME}' stroke-width='1.2' stroke-opacity='.8'/>"
             f"<path d='M8 8l4-6 4 6-4 6z' fill='{MGD}'/><circle cx='12' cy='8' r='1.6' fill='#fff'/>")
my_orn = svg(f"<path d='M0 12H96M144 12H240' stroke='{MV}' stroke-width='1.5'/><path d='M96 12l8-6v12z' fill='{ME}'/><path d='M144 12l-8-6v12z' fill='{ME}'/>"
             f"<path d='M120 0l9 12-9 12-9-12z' fill='{MV}' stroke='{MGD}' stroke-width='1.5'/><circle cx='120' cy='12' r='3' fill='{MGD}'/>"
             + ''.join(f"<path d='M{x} 6v12M{x - 3} 9l6 0' stroke='{ME}' stroke-width='1.2' stroke-opacity='.8'/>" for x in (40, 64, 176, 200)), '0 0 240 24')
dragon = svg("<path d='M20 150C60 140 80 110 110 105C130 100 150 112 170 100C185 90 190 70 210 62C225 56 240 60 255 52L262 40L268 58C280 60 290 70 292 82C270 76 255 82 240 92C215 108 205 130 180 140C150 152 120 140 95 150C70 160 40 166 20 150Z' fill='#140a26'/>"
             "<path d='M150 104C140 70 120 50 90 40C110 62 118 80 120 102C100 80 80 70 55 70C80 86 92 100 98 112' fill='#1b0f33'/><circle cx='275' cy='66' r='2.5' fill='#3ddc97'/>", '0 0 300 170')
mt = svg("<path d='M0 120L60 40l40 50 50-80 60 70 40-30 50 70z' fill='#120a22'/><path d='M150 10l15 18-12-4-8 10-6-8-10 6z' fill='#2a1a4a'/>", '0 0 300 120')
skin('Mythical Realm', f"""
html[data-skin=mythical]{{
  --bg:#0b0616;--glow:#2a1250;--acc:{MV};--acc2:{ME};--fg:#efe8ff;--mut:#a99cc6;--on:#140826;--r:10px;
  --card:#150b29;--card2:#1e1238;--line:{MV}44;--line2:{MV}aa;
  --disp:'Uncial Antiqua','Alegreya',serif;--body:'Alegreya',Georgia,serif;--mono:'Uncial Antiqua',serif;
  --clip:none;--pshadow:inset 0 0 0 1px {MV}33,inset 0 0 30px #0008,0 0 18px {MV}22;--rep:no-repeat;
  --deco:{corners(my_corner, 34)};--orn:{my_orn};--orn-h:24px}}
html[data-skin=mythical] body{{background:radial-gradient(circle at 78% 12%,#e9dcff 0 20px,#b07cff44 26px,#0000 70px) no-repeat,
  radial-gradient(90% 45% at 30% -5%,#4a1f8aaa,#0000 70%) no-repeat,linear-gradient(#120a22,#120a22) 0 100%/100% 80px no-repeat,
  {dragon} 20% 30%/min(380px,95vw) auto no-repeat,{mt} 50% calc(100% - 78px)/min(560px,140vw) auto no-repeat,
  radial-gradient(circle,#fff 0 1px,#0000 1.5px) 0 0/90px 110px,var(--bg);background-attachment:fixed}}
html[data-skin=mythical] body::after{{inset:0;background:radial-gradient(circle,{ME} 0 1.5px,#0000 3px) 0 0/97px 131px,radial-gradient(circle,{MV} 0 1.5px,#0000 3px) 40px 60px/113px 89px;animation:fireflies 6s ease-in-out infinite alternate}}
html[data-skin=mythical] h2.sec::before{{transform:rotate(45deg);border:0;width:9px;height:9px;background:{ME};box-shadow:0 0 8px {ME}}}
html[data-skin=mythical] .btn{{background:linear-gradient(135deg,#c79bff,#7c4dff 60%,#5a2fd6);color:#fff;box-shadow:inset 0 0 0 1px #fff4,0 0 14px {MV}66;text-shadow:0 1px 2px #0006}}
html[data-skin=mythical] .btn.ghost{{background:#150b29;color:{ME};box-shadow:inset 0 0 0 1px {ME}88}}
html[data-skin=mythical] :is(.btn.gold,.btn.chestbtn){{background:linear-gradient(180deg,#ffe7a1,#d9a43a);color:#1a0d02;text-shadow:none}}
html[data-skin=mythical] :is(.seg a.on,.dpill.on,.chip.on){{background:{MV};color:#140826;border-color:{MV}}}
html[data-skin=mythical] .xpbar i{{background:linear-gradient(90deg,{MV},{ME});box-shadow:0 0 10px {ME}88}}
""")

# ---------------------------------------------------------------- Classical Elegance
CG, IV = '#d9b871', '#f3ecdc'
cl_corner = (f"<path d='M2 38V2h36' fill='none' stroke='{CG}' stroke-width='1.4'/><path d='M7 38V7h31' fill='none' stroke='{CG}' stroke-width='.7'/>"
             f"<path d='M7 7l5 5' stroke='{CG}' stroke-width='.7'/><circle cx='12.5' cy='12.5' r='2' fill='{CG}'/>")
swag = svg(f"<path d='M20 6C50 26 90 26 120 6C150 26 190 26 220 6' fill='none' stroke='{CG}' stroke-width='1.6'/>"
           f"<path d='M28 6C54 20 86 20 112 6M128 6C154 20 186 20 212 6' fill='none' stroke='{CG}' stroke-width='.8' stroke-opacity='.7'/>"
           + ''.join(f"<circle cx='{x}' cy='{y}' r='1.6' fill='{IV}'/>" for x, y in [(45, 16), (70, 20), (95, 16), (145, 16), (170, 20), (195, 16)])
           + f"<path d='M120 6l-7-5v10zM120 6l7-5v10z' fill='{CG}'/><circle cx='120' cy='6' r='2.4' fill='{IV}'/><circle cx='20' cy='6' r='2.6' fill='{CG}'/><circle cx='220' cy='6' r='2.6' fill='{CG}'/>", '0 0 240 26')
marble = svg("<g fill='none' stroke='#f3ecdc' stroke-opacity='.05' stroke-width='1.2'><path d='M0 40C40 30 60 70 110 50S170 10 220 30'/><path d='M0 140C50 120 80 160 120 150S180 110 220 130'/>"
             "<path d='M60 0C70 40 50 80 80 120S90 190 70 220'/><path d='M160 0C150 50 180 90 160 140S150 200 170 220' stroke-opacity='.035'/></g>", '0 0 220 220')
column = svg("<g fill='#16130f'><rect x='6' y='0' width='48' height='10'/><path d='M2 10h56l-4 8H6z'/><rect x='10' y='18' width='40' height='300'/><path d='M6 318h48l4 8H2z'/><rect x='0' y='326' width='60' height='10'/></g>"
             + ''.join(f"<rect x='{x}' y='22' width='3' height='292' fill='#1f1a14'/>" for x in (15, 23, 31, 39)), '0 0 60 336')
glints = svg(f"<g fill='{IV}'><path d='M20 20l1.2 4 4 1.2-4 1.2-1.2 4-1.2-4-4-1.2 4-1.2z'/><path d='M120 90l1 3 3 1-3 1-1 3-1-3-3-1 3-1z' fill-opacity='.7'/>"
             f"<circle cx='70' cy='150' r='1.2'/><circle cx='160' cy='40' r='1'/></g>", '0 0 200 200')
skin('Classical Elegance', f"""
html[data-skin=classical]{{
  --bg:#0e0d0b;--glow:#3a2f1c;--acc:{CG};--acc2:{IV};--fg:{IV};--mut:#b8ad97;--on:#14110a;--r:0;
  --card:#171512;--card2:#211e19;--line:{CG}40;--line2:{CG}99;
  --disp:'Playfair Display','Cormorant Garamond',serif;--body:'Cormorant Garamond',Georgia,serif;--mono:'Playfair Display',serif;
  --clip:none;--pshadow:inset 0 0 0 1px {CG}22,inset 0 0 34px #0008;--rep:no-repeat;
  --deco:{corners(cl_corner, 30)};--orn:{swag};--orn-h:26px}}
html[data-skin=classical] body{{font-size:18px;font-weight:600;background:radial-gradient(50% 32% at 50% -4%,#f6dfa055,#0000 70%) no-repeat,
  {column} -26px 120px/60px auto no-repeat,{column} calc(100% + 26px) 120px/60px auto no-repeat,
  {marble} 0 0/220px 220px,linear-gradient(180deg,#14120f,#0b0a08);background-attachment:fixed}}
html[data-skin=classical] body::after{{inset:0;background:{glints} 0 0/200px 200px,{glints} 90px 120px/260px 260px;animation:fireflies 7s ease-in-out infinite alternate;opacity:.7}}
html[data-skin=classical] h1{{letter-spacing:.1em}}
html[data-skin=classical] h2.sec::before{{transform:rotate(45deg);border:1px solid {CG};width:8px;height:8px;background:none;box-shadow:inset 0 0 0 2px var(--bg),inset 0 0 0 4px {CG}}}
html[data-skin=classical] .btn{{background:linear-gradient(180deg,#f1d99a,{CG} 55%,#a8874a);color:#14110a;letter-spacing:.12em;box-shadow:inset 0 0 0 1px #fff6,inset 0 -2px 0 #0003}}
html[data-skin=classical] .btn.ghost{{background:transparent;color:{IV};box-shadow:inset 0 0 0 1px {CG}99}}
html[data-skin=classical] :is(.btn.gold,.btn.chestbtn){{background:{IV};color:#14110a;box-shadow:inset 0 0 0 1px {CG},inset 0 0 0 3px {IV},inset 0 0 0 4px {CG}88}}
html[data-skin=classical] :is(.seg a.on,.dpill.on,.chip.on){{background:{CG};color:#14110a;border-color:{CG}}}
html[data-skin=classical] .xpbar i{{background:linear-gradient(90deg,#a8874a,#f1d99a)}}
""")

# ---------------------------------------------------------------- Baroque Palace
BG_, VEL = '#e0b44c', '#8e1b2e'
scroll = (f"<path d='M3 37C3 20 8 8 20 4C28 1 36 3 37 9C38 15 30 17 27 12C25 8 30 6 31 9' fill='none' stroke='{BG_}' stroke-width='2.2' stroke-linecap='round'/>"
          f"<path d='M3 37C6 30 12 28 15 31C18 34 14 38 11 36' fill='none' stroke='{BG_}' stroke-width='1.6' stroke-linecap='round'/>"
          f"<path d='M9 22c3-5 8-8 13-8' fill='none' stroke='#fff3c4' stroke-opacity='.6' stroke-width='1'/><circle cx='20' cy='20' r='2' fill='{BG_}'/>")
br_orn = svg(f"<path d='M120 12C100 2 80 2 62 10C50 16 36 18 22 12M120 12C140 2 160 2 178 10C190 16 204 18 218 12' fill='none' stroke='{BG_}' stroke-width='2'/>"
             f"<path d='M62 10C58 4 50 4 48 9C47 13 52 15 54 12M178 10C182 4 190 4 192 9C193 13 188 15 186 12' fill='none' stroke='{BG_}' stroke-width='1.6'/>"
             f"<path d='M120 2c6 4 6 16 0 20c-6-4-6-16 0-20z' fill='{VEL}' stroke='{BG_}' stroke-width='1.5'/><circle cx='120' cy='12' r='2.5' fill='{BG_}'/>", '0 0 240 24')
damask = svg(f"<g fill='{BG_}' fill-opacity='.06'><path d='M40 4C52 16 52 30 40 42C28 30 28 16 40 4z'/><path d='M40 42C52 54 60 56 70 52C60 64 48 66 40 80C32 66 20 64 10 52C20 56 28 54 40 42z'/>"
             f"<circle cx='40' cy='44' r='4'/></g>", '0 0 80 84')
skin('Baroque Palace', f"""
html[data-skin=baroque]{{
  --bg:#16060a;--glow:#4a0d18;--acc:{BG_};--acc2:#e8687a;--fg:#fbefd6;--mut:#c9a99a;--on:#2a0b0a;--r:14px;
  --card:#250a10;--card2:#330e16;--line:{BG_}44;--line2:{BG_}aa;
  --disp:'Cormorant SC','Cormorant Garamond',serif;--body:'Cormorant Garamond',Georgia,serif;--mono:'Cormorant SC',serif;
  --clip:none;--pshadow:inset 0 0 0 2px {BG_}55,inset 0 0 0 5px var(--card),inset 0 0 0 6px {BG_}33,inset 0 0 36px #0009;--rep:no-repeat;
  --deco:{corners(scroll, 38)},linear-gradient({BG_},{BG_}) 50% 0/60px 2px;--orn:{br_orn};--orn-h:24px}}
html[data-skin=baroque] body{{font-size:18px;font-weight:600;background:radial-gradient(70% 40% at 50% -6%,#ffcf7a55,#0000 70%) no-repeat,
  radial-gradient(40% 30% at 0 30%,#ffb04a22,#0000 70%) no-repeat,radial-gradient(40% 30% at 100% 30%,#ffb04a22,#0000 70%) no-repeat,
  {damask} 0 0/80px 84px,linear-gradient(180deg,#2a0a12,#14050a);background-attachment:fixed}}
html[data-skin=baroque] body::after{{inset:0;background:radial-gradient(28% 22% at 4% 30%,#ffb04a33,#0000 70%),radial-gradient(28% 22% at 96% 30%,#ffb04a33,#0000 70%);animation:torch 2.6s ease-in-out infinite alternate}}
html[data-skin=baroque] h2.sec::before{{content:"❦";transform:none;border:0;width:auto;height:auto;color:{BG_};font-size:20px;line-height:1}}
html[data-skin=baroque] .btn{{background:linear-gradient(180deg,#f7da8a,{BG_} 50%,#a87a22);color:#2a0b0a;border-radius:24px;box-shadow:inset 0 0 0 1px #fff6,inset 0 -3px 0 #0004,0 0 12px #e0b44c44}}
html[data-skin=baroque] .btn.ghost{{background:#250a10;color:{BG_};box-shadow:inset 0 0 0 1px {BG_}99}}
html[data-skin=baroque] :is(.btn.gold,.btn.chestbtn){{background:linear-gradient(180deg,#e8687a,{VEL});color:#fbefd6}}
html[data-skin=baroque] :is(.seg a.on,.dpill.on,.chip.on){{background:{VEL};color:#fbefd6;border-color:{BG_}}}
html[data-skin=baroque] .xpbar i{{background:linear-gradient(90deg,#a87a22,#f7da8a,#a87a22)}}
""")

# ---------------------------------------------------------------- Art Deco
DG, DT = '#e6c36a', '#3fb8af'
dc_corner = (f"<g fill='none' stroke='{DG}' stroke-width='1.5'><path d='M2 38V2h36'/><path d='M7 38V7h31'/><path d='M12 38V12h26'/></g>"
             f"<path d='M2 2l10 10' stroke='{DG}' stroke-width='1.5'/>")
dc_orn = svg(f"<path d='M0 14H84M156 14H240M0 18H76M164 18H240' stroke='{DG}' stroke-width='1.2'/>"
             + ''.join(f"<path d='M120 26L{120 + 30 * __import__('math').cos(__import__('math').radians(a)):.1f} {26 - 30 * __import__('math').sin(__import__('math').radians(a)):.1f}' stroke='{DG}' stroke-width='1.4'/>" for a in range(20, 161, 20))
             + f"<path d='M90 26a30 30 0 0 1 60 0z' fill='none' stroke='{DG}' stroke-width='1.4'/>", '0 0 240 28')
fans = svg(''.join(f"<path d='M0 40a40 40 0 0 1 80 0' fill='none' stroke='{DG}' stroke-opacity='.08' stroke-width='1.5' transform='translate(0 {0}) scale({s / 40})' transform-origin='40 40'/>" for s in (40, 30, 20))
           + ''.join(f"<path d='M80 40a40 40 0 0 1 80 0' fill='none' stroke='{DG}' stroke-opacity='.08' stroke-width='1.5' transform='scale({s / 40})' transform-origin='120 40'/>" for s in (40, 30, 20))
           + ''.join(f"<path d='M40 80a40 40 0 0 1 80 0' fill='none' stroke='{DT}' stroke-opacity='.07' stroke-width='1.5' transform='scale({s / 40})' transform-origin='80 80'/>" for s in (40, 30, 20)), '0 0 160 80')
burst = svg(''.join(f"<path d='M200 200L{200 + 200 * __import__('math').cos(__import__('math').radians(a)):.0f} {200 + 200 * __import__('math').sin(__import__('math').radians(a)):.0f}' stroke='{DG}' stroke-width='2'/>" for a in range(0, 360, 10)), '0 0 400 400')
skin('Art Deco', f"""
html[data-skin=artdeco]{{
  --bg:#0a0a0c;--glow:#2a2414;--acc:{DG};--acc2:{DT};--fg:#f5ecd6;--mut:#a9a08a;--on:#0a0a0c;--r:0;
  --card:#121214;--card2:#1a1a1d;--line:{DG}44;--line2:{DG}aa;
  --disp:'Poiret One','Josefin Sans',sans-serif;--body:'Josefin Sans',system-ui,sans-serif;--mono:'Poiret One',sans-serif;
  --clip:polygon(10px 0,calc(100% - 10px) 0,100% 10px,100% calc(100% - 10px),calc(100% - 10px) 100%,10px 100%,0 calc(100% - 10px),0 10px);
  --pshadow:inset 0 0 0 1px {DG}66,inset 0 0 0 4px var(--card),inset 0 0 0 5px {DG}33;--rep:no-repeat;
  --deco:{corners(dc_corner, 30)};--orn:{dc_orn};--orn-h:28px}}
html[data-skin=artdeco] body{{background:radial-gradient(80% 40% at 50% -6%,#e6c36a33,#0000 70%) no-repeat,{fans} 0 0/160px 80px,var(--bg);background-attachment:fixed}}
html[data-skin=artdeco] body::after{{left:50%;top:-260px;width:620px;aspect-ratio:1;margin-left:-310px;opacity:.07;background:{burst} center/contain no-repeat;animation:spin 120s linear infinite}}
html[data-skin=artdeco] h1{{font-weight:400;letter-spacing:.16em}}
html[data-skin=artdeco] :is(h2,h3,.hn){{font-weight:400;letter-spacing:.12em}}
html[data-skin=artdeco] h2.sec::before{{transform:none;border:0;width:14px;height:14px;background:linear-gradient(135deg,#0000 45%,{DG} 45% 55%,#0000 55%),linear-gradient(45deg,#0000 45%,{DG} 45% 55%,#0000 55%)}}
html[data-skin=artdeco] .btn{{background:linear-gradient(180deg,#f3dc9a,{DG} 50%,#b08d3a);color:#0a0a0c;letter-spacing:.14em;box-shadow:inset 0 0 0 1px #fff5,inset 0 0 0 3px #0000,inset 0 0 0 4px #0a0a0c55}}
html[data-skin=artdeco] .btn.ghost{{background:#121214;color:{DG};box-shadow:inset 0 0 0 1px {DG}99,inset 0 0 0 4px #121214,inset 0 0 0 5px {DG}44}}
html[data-skin=artdeco] :is(.btn.gold,.btn.chestbtn){{background:linear-gradient(180deg,#7fe0d8,{DT});color:#0a0a0c}}
html[data-skin=artdeco] :is(.seg a.on,.dpill.on,.chip.on){{background:{DG};color:#0a0a0c;border-color:{DG}}}
html[data-skin=artdeco] .xpbar i{{background:repeating-linear-gradient(90deg,{DG} 0 10px,#b08d3a 10px 12px)}}
""")

# ---------------------------------------------------------------- Gothic Cathedral
GB, GR, GS = '#7aa2ff', '#e0455a', '#c9c3d6'
go_corner = (f"<path d='M2 38V18Q2 4 16 2Q10 10 10 20V38' fill='none' stroke='{GS}' stroke-width='1.6'/>"
             f"<path d='M2 2h14' stroke='{GS}' stroke-width='1.6'/><circle cx='8' cy='26' r='3' fill='{GR}'/><circle cx='8' cy='34' r='2' fill='{GB}'/>")
go_orn = svg(f"<path d='M0 20H90M150 20H240' stroke='{GS}' stroke-width='1.2'/>"
             f"<path d='M100 26V14Q100 2 120 0Q140 2 140 14V26z' fill='#0e0d1a' stroke='{GS}' stroke-width='1.4'/>"
             f"<path d='M110 26V15Q110 6 120 4Q130 6 130 15V26z' fill='{GB}' fill-opacity='.7'/><path d='M120 4V26M110 16H130' stroke='{GS}' stroke-width='1'/>"
             f"<circle cx='120' cy='12' r='3' fill='{GR}'/>", '0 0 240 28')
rose = svg(f"<circle cx='100' cy='100' r='96' fill='#0b0a14' stroke='{GS}' stroke-opacity='.4' stroke-width='3'/>"
           + ''.join(f"<path d='M100 100L{100 + 90 * __import__('math').cos(__import__('math').radians(a)):.1f} {100 + 90 * __import__('math').sin(__import__('math').radians(a)):.1f}A90 90 0 0 1 {100 + 90 * __import__('math').cos(__import__('math').radians(a + 30)):.1f} {100 + 90 * __import__('math').sin(__import__('math').radians(a + 30)):.1f}z' fill='{[GB, GR, '#e8b04a', '#5ec27a'][k % 4]}' fill-opacity='.45' stroke='{GS}' stroke-opacity='.5'/>" for k, a in enumerate(range(0, 360, 30)))
           + f"<circle cx='100' cy='100' r='30' fill='{GR}' fill-opacity='.5' stroke='{GS}' stroke-opacity='.6' stroke-width='2'/><circle cx='100' cy='100' r='10' fill='#e8b04a' fill-opacity='.7'/>", '0 0 200 200')
arches = svg(''.join(f"<path d='M{x} 140V60Q{x} 20 {x + 30} 6Q{x + 60} 20 {x + 60} 60V140z' fill='#0d0c18'/><path d='M{x + 10} 140V64Q{x + 10} 34 {x + 30} 22Q{x + 50} 34 {x + 50} 64V140z' fill='#151428'/>" for x in (0, 80, 160, 240)), '0 0 300 140')
skin('Gothic Cathedral', f"""
html[data-skin=gothic]{{
  --bg:#07060e;--glow:#1a1530;--acc:{GB};--acc2:{GR};--fg:#ece8f4;--mut:#a39fb6;--on:#07060e;--r:0;
  --card:#0f0d1a;--card2:#171425;--line:{GS}33;--line2:{GS}88;
  --disp:'Grenze','EB Garamond',serif;--body:'EB Garamond',Georgia,serif;--mono:'EB Garamond',serif;
  --clip:none;--pshadow:inset 0 0 0 1px {GS}22,inset 0 0 34px #000a;--rep:no-repeat;
  --deco:{corners(go_corner, 34, 'tl tr')},linear-gradient({GS},{GS}) 0 100%/100% 1px;--orn:{go_orn};--orn-h:28px}}
html[data-skin=gothic] body{{font-size:18px;background:radial-gradient(50% 30% at 50% 14%,#7aa2ff22,#0000 70%) no-repeat,
  {rose} 50% 70px/min(260px,62vw) auto no-repeat,linear-gradient(#0d0c18,#0d0c18) 0 100%/100% 80px no-repeat,
  {arches} 50% calc(100% - 78px)/min(560px,140vw) auto no-repeat,linear-gradient(180deg,#0a0914,#07060e);background-attachment:fixed}}
html[data-skin=gothic] body::after{{left:50%;top:70px;width:min(260px,62vw);aspect-ratio:1;transform:translateX(-50%);border-radius:50%;
  background:radial-gradient(circle,#7aa2ff44,#e0455a22 50%,#0000 70%);animation:torch 3.4s ease-in-out infinite alternate}}
html[data-skin=gothic] :is(h1,h2){{letter-spacing:.02em}}
html[data-skin=gothic] :is(h3,.hn,.lbl,.bl,.ov,.on2,.bxv,.btn,.chip,.seg a,.dpill,nav a span,.stat b,.rbig,.rlbl,.wkstats b,.ckdots i,details summary){{font-family:'EB Garamond',Georgia,serif;font-weight:700;letter-spacing:.04em}}
html[data-skin=gothic] h2.sec::before{{content:"✠";transform:none;border:0;width:auto;height:auto;color:{GR};font-size:18px;line-height:1}}
html[data-skin=gothic] .btn{{background:linear-gradient(180deg,#9db9ff,#4a6fd6);color:#07060e;box-shadow:inset 0 0 0 1px #fff4,inset 0 -3px 0 #0005}}
html[data-skin=gothic] .btn.ghost{{background:#0f0d1a;color:{GS};box-shadow:inset 0 0 0 1px {GS}77}}
html[data-skin=gothic] :is(.btn.gold,.btn.chestbtn){{background:linear-gradient(180deg,#ff8a9a,{GR});color:#07060e}}
html[data-skin=gothic] :is(.seg a.on,.dpill.on,.chip.on){{background:{GR};color:#07060e;border-color:{GR}}}
html[data-skin=gothic] .xpbar i{{background:linear-gradient(90deg,{GB},#c08bff,{GR})}}
""")

# ---------------------------------------------------------------- Cosmic Voyage
CV, CC = '#9b7bff', '#22d3ee'
cs_corner = (f"<path d='M2 30A28 28 0 0 1 30 2' fill='none' stroke='{CC}' stroke-width='1.4'/><path d='M2 20A18 18 0 0 1 20 2' fill='none' stroke='{CV}' stroke-width='1' stroke-dasharray='2 3'/>"
             f"<circle cx='10' cy='10' r='3' fill='{CV}'/><circle cx='26' cy='4' r='1.6' fill='#fff'/>")
cs_orn = svg(f"<ellipse cx='120' cy='12' rx='110' ry='5' fill='none' stroke='{CC}' stroke-width='1.2' stroke-opacity='.8'/><circle cx='120' cy='12' r='8' fill='{CV}'/>"
             f"<ellipse cx='120' cy='12' rx='16' ry='3.5' fill='none' stroke='#fff' stroke-width='1.2'/><circle cx='30' cy='9' r='3' fill='{CC}'/><circle cx='205' cy='15' r='2.2' fill='#fff'/>", '0 0 240 24')
planet = svg(f"<circle cx='100' cy='100' r='56' fill='url(#p)'/><ellipse cx='100' cy='100' rx='96' ry='20' fill='none' stroke='{CC}' stroke-opacity='.6' stroke-width='4' transform='rotate(-18 100 100)'/>"
             f"<defs><radialGradient id='p' cx='.35' cy='.35'><stop offset='0' stop-color='#c7b4ff'/><stop offset='.6' stop-color='#5b3fd1'/><stop offset='1' stop-color='#1a0e4a'/></radialGradient></defs>", '0 0 200 200')
stars2 = svg("<g fill='#fff'><circle cx='10' cy='20' r='1'/><circle cx='70' cy='5' r='.8'/><circle cx='130' cy='40' r='1.2'/><circle cx='40' cy='90' r='.7'/><circle cx='100' cy='120' r='1'/><circle cx='150' cy='100' r='.8'/><circle cx='20' cy='150' r='1.1'/><circle cx='120' cy='170' r='.7'/></g>", '0 0 180 180')
skin('Cosmic Voyage', f"""
html[data-skin=cosmic]{{
  --bg:#03020a;--glow:#1b0f45;--acc:{CV};--acc2:{CC};--fg:#eef0ff;--mut:#9aa0c8;--on:#05031a;--r:16px;
  --card:#0b0920;--card2:#120f30;--line:{CV}44;--line2:{CC}88;
  --disp:'Michroma','Space Grotesk',sans-serif;--body:'Space Grotesk',system-ui,sans-serif;--mono:'Michroma',sans-serif;
  --clip:none;--pshadow:inset 0 0 0 1px {CV}33,inset 0 0 30px #000a,0 0 22px {CV}22;--rep:no-repeat;
  --deco:{corners(cs_corner, 32, 'tl br')};--orn:{cs_orn};--orn-h:24px}}
html[data-skin=cosmic] body{{background:radial-gradient(60% 40% at 15% 20%,#6b2fd655,#0000 70%) no-repeat,radial-gradient(50% 35% at 90% 60%,#0e8fb044,#0000 70%) no-repeat,
  radial-gradient(40% 30% at 40% 90%,#c2185b33,#0000 70%) no-repeat,{planet} calc(100% + 60px) 120px/240px 240px no-repeat,{stars2} 0 0/180px 180px,var(--bg);background-attachment:fixed}}
html[data-skin=cosmic] body::after{{inset:0;background:{stars2} 30px 60px/240px 240px,{stars2} 100px 10px/130px 130px;animation:petals 60s linear infinite;opacity:.8}}
html[data-skin=cosmic] h2.sec::before{{transform:none;border:0;width:10px;height:10px;border-radius:50%;background:{CC};box-shadow:0 0 0 3px {CV}55,0 0 10px {CC}}}
html[data-skin=cosmic] .btn{{background:linear-gradient(135deg,{CC},{CV});color:#05031a;border-radius:24px;box-shadow:0 0 16px {CV}66,inset 0 0 0 1px #fff5}}
html[data-skin=cosmic] .btn.ghost{{background:#0b0920;color:{CC};box-shadow:inset 0 0 0 1px {CC}77}}
html[data-skin=cosmic] :is(.btn.gold,.btn.chestbtn){{background:linear-gradient(135deg,#ffd36e,#ff7ab6);color:#05031a}}
html[data-skin=cosmic] :is(.seg a.on,.dpill.on,.chip.on){{background:{CV};color:#05031a;border-color:{CV}}}
html[data-skin=cosmic] .xpbar i{{background:linear-gradient(90deg,{CV},{CC});box-shadow:0 0 10px {CC}}}
""")

ANIM = """
/* ---- ambient animations ---- */
@keyframes sway{from{transform:rotate(-4deg)}to{transform:rotate(4deg)}}
@keyframes petals{from{background-position:0 0}to{background-position:180px 220px}}
@keyframes fireflies{0%{opacity:.35;background-position:0 0,70px 110px}50%{opacity:1}100%{opacity:.5;background-position:12px -18px,58px 128px}}
@keyframes torch{0%{opacity:.6}50%{opacity:.9}100%{opacity:.75}}
@keyframes aurora{from{transform:translateX(-6%) skewY(-3deg);opacity:.7}to{transform:translateX(6%) skewY(2deg);opacity:1}}
@keyframes sunglow{from{filter:drop-shadow(0 0 18px #ff3cc7)}to{filter:drop-shadow(0 0 40px #ff3cc7)}}
@keyframes crt{0%{opacity:.8}100%{opacity:1}}
@media(prefers-reduced-motion:reduce){html[data-skin] body::after,html[data-skin] body::before{animation:none!important}}
/* title ornaments under every page title */
/* the title is as wide as its words, and its ornament runs under exactly those words */
html[data-skin]:not([data-skin=hud]) main h1{width:fit-content;max-width:100%}
html[data-skin]:not([data-skin=hud]) h1::after{content:"";display:block;height:var(--orn-h,0);width:100%;min-width:120px;margin-top:8px;background:var(--orn,none) 0 50%/100% 100% no-repeat}
html[data-skin]:not([data-skin=hud]) :is(.vic,.top) h1{margin-left:auto;margin-right:auto}
html[data-skin]:not([data-skin=hud]) :is(.card,.quest,.mkt,.hud,.mbox,.opt,.stat)::before{background-repeat:var(--rep,no-repeat)}
"""

PREVIEW = """
/* ---- interface previews in the shop ---- */
.skp{width:100%;height:70px;display:flex;align-items:center;justify-content:center;gap:10px;font-size:30px;position:relative;overflow:hidden}
.skp[data-sk=hud]{background:linear-gradient(#22e4ff14 1px,#0000 1px) 0 0/12px 12px,linear-gradient(90deg,#22e4ff14 1px,#0000 1px) 0 0/12px 12px,#03080f;box-shadow:inset 0 0 0 1px #22e4ff88}
.skp[data-sk=chinese]{background:#22090d;box-shadow:inset 0 0 0 2px #d9ad45,inset 0 0 0 5px #22090d,inset 0 0 0 6px #e8433a}
.skp[data-sk=japanese]{background:radial-gradient(circle at 75% 40%,#e5432f 0 14px,#0000 15px),#0b1222;border-top:5px solid #e5432f}
.skp[data-sk=fairy]{background:radial-gradient(circle,#ffd86a 0 1.5px,#0000 3px) 0 0/23px 19px,linear-gradient(#0b2a3a,#06130c);border-radius:14px;box-shadow:inset 0 0 0 2px #9be27a66}
.skp[data-sk=medieval]{background:linear-gradient(#0000 14px,#0007 14px 16px) 0 0/32px 16px,#2a2218;box-shadow:inset 0 0 0 2px #c9a24a}
.skp[data-sk=steampunk]{background:repeating-conic-gradient(from 0deg at 85% 50%,#e8c06a22 0 8deg,#0000 8deg 16deg),linear-gradient(135deg,#2a1d10,#120c07);box-shadow:inset 0 0 0 2px #d08a3c88;border-radius:8px}
.skp[data-sk=greek]{background:linear-gradient(#e3c16f,#e3c16f) 0 6px/100% 2px no-repeat,linear-gradient(#e3c16f,#e3c16f) 0 calc(100% - 6px)/100% 2px no-repeat,#0e1937}
.skp[data-sk=egypt]{background:linear-gradient(180deg,#0c1634,#3a2412);box-shadow:inset 0 4px 0 #e2b84a,inset 0 -4px 0 #2ec4b6}
.skp[data-sk=viking]{background:linear-gradient(100deg,#0000 20%,#3dff9a44 40%,#0000 60%),linear-gradient(180deg,#05080c,#0b1620);box-shadow:inset 0 0 0 2px #c8913e88}
.skp[data-sk=pirate]{background:#2a2016;box-shadow:inset 0 0 0 5px #8a6a38,inset 0 0 0 6px #e0b55a66;border-radius:6px}
.skp[data-sk=outrun]{background:linear-gradient(180deg,#2a0650,#a0187a 70%,#ff6a3d 72%,#12002a 73%);box-shadow:inset 0 0 0 1px #ff3cc7,0 0 12px #ff3cc755}
.skp[data-sk=arcade]{background:#05030f;box-shadow:inset 0 0 0 3px #00e4ff;image-rendering:pixelated}
.skp[data-sk=mythical]{background:radial-gradient(circle at 80% 30%,#e9dcff 0 8px,#0000 9px),radial-gradient(circle,#3ddc97 0 1.5px,#0000 2px) 0 0/19px 17px,linear-gradient(#2a1250,#0b0616);box-shadow:inset 0 0 0 2px #b07cff88;border-radius:10px}
.skp[data-sk=classical]{background:linear-gradient(90deg,#16130f 0 10%,#0000 10% 90%,#16130f 90%),radial-gradient(60% 50% at 50% 0,#f6dfa044,#0000),#0e0d0b;box-shadow:inset 0 0 0 1px #d9b871,inset 0 0 0 4px #0e0d0b,inset 0 0 0 5px #d9b87166}
.skp[data-sk=baroque]{background:radial-gradient(circle,#e0b44c22 0 6px,#0000 7px) 0 0/16px 16px,linear-gradient(#330e16,#16060a);box-shadow:inset 0 0 0 2px #e0b44c,inset 0 0 0 5px #250a10,inset 0 0 0 6px #e0b44c66;border-radius:14px}
.skp[data-sk=artdeco]{background:repeating-conic-gradient(from -90deg at 50% 100%,#e6c36a33 0 6deg,#0000 6deg 12deg),#0a0a0c;box-shadow:inset 0 0 0 1px #e6c36a,inset 0 0 0 4px #0a0a0c,inset 0 0 0 5px #e6c36a66}
.skp[data-sk=gothic]{background:conic-gradient(from 0deg at 50% 40%,#7aa2ff88,#e0455a88,#e8b04a88,#5ec27a88,#7aa2ff88) 50% 40%/40px 40px no-repeat,linear-gradient(#0a0914,#07060e);box-shadow:inset 0 0 0 1px #c9c3d677}
.skp[data-sk=cosmic]{background:radial-gradient(circle at 80% 40%,#9b7bff 0 10px,#0000 11px),radial-gradient(circle,#fff 0 1px,#0000 1.5px) 0 0/17px 13px,radial-gradient(60% 60% at 20% 30%,#6b2fd688,#0000),#03020a;border-radius:16px;box-shadow:inset 0 0 0 1px #22d3ee88}
.emo{font-style:normal;line-height:1}
/* one-minute interface preview bar */
#trybar{position:fixed;left:12px;right:12px;bottom:calc(86px + env(safe-area-inset-bottom));z-index:25;display:flex;align-items:center;justify-content:space-between;gap:10px;
  padding:8px 8px 8px 14px;background:color-mix(in srgb,var(--acc) 12%,var(--bg));border:1px solid var(--acc);border-radius:var(--r,0);box-shadow:0 6px 24px #000a,0 0 18px color-mix(in srgb,var(--acc) 30%,transparent);font-weight:700;font-size:14px;max-width:576px;margin:0 auto}
#trybar span{font-variant-numeric:tabular-nums}
body.focus #trybar{bottom:calc(16px + env(safe-area-inset-bottom))}
/* note under Themes when another interface is on */
.themenote{margin:-2px 0 8px;padding:8px 10px;border-left:2px solid var(--acc);background:color-mix(in srgb,var(--acc) 8%,transparent)}
"""

# ---------------------------------------------------------------- themes recolour interfaces
# With any theme except the default Basic, an interface's accents (frames, ornaments, buttons, tabs, bars, markers)
# take the theme's two colours; its scenery keeps its own. Theme colours are read from game.js so they stay in sync.
THEMES = re.findall(r"\['(\w+)', '[^']+', \d+, '(#[0-9a-fA-F]{6})', '(#[0-9a-fA-F]{6})'\]", (HERE.parent / 'game.js').read_text())
T = 'html[data-tint][data-skin]'
TINT = "\n/* ==========================================================================\n   Themes recolour the interfaces (html[data-tint])\n   ========================================================================== */\n"


# Each theme is fitted to each interface's own colour scheme (worked out in OKLCH, a perceptual colour space):
# the theme's two colours lead, the interface's second colour turns to the theme's hue as the detail colour (so
# gold and red stay a pair, just in the theme's colours), the complement of the main colour marks small details,
# and lighter and darker shades make the gradients. Background and glow take the theme's hue too, kept as dark.
def _lin(c):
    return c / 12.92 if c <= .04045 else ((c + .055) / 1.055) ** 2.4


def _gam(c):
    return 12.92 * c if c <= .0031308 else 1.055 * c ** (1 / 2.4) - .055


def to_lch(h):
    r, g, b = (_lin(int(h[i:i + 2], 16) / 255) for i in (1, 3, 5))
    l_ = (.4122214708 * r + .5363325363 * g + .0514459929 * b) ** (1 / 3)
    m_ = (.2119034982 * r + .6806995451 * g + .1073969566 * b) ** (1 / 3)
    s_ = (.0883024619 * r + .2817188376 * g + .6299787005 * b) ** (1 / 3)
    L = .2104542553 * l_ + .7936177850 * m_ - .0040720468 * s_
    A = 1.9779984951 * l_ - 2.4285922050 * m_ + .4505937099 * s_
    B = .0259040371 * l_ + .7827717662 * m_ - .8086757660 * s_
    return L, math.hypot(A, B), math.degrees(math.atan2(B, A)) % 360


def _rgb(L, C, H):
    A, B = C * math.cos(math.radians(H)), C * math.sin(math.radians(H))
    l_, m_, s_ = L + .3963377774 * A + .2158037573 * B, L - .1055613458 * A - .0638541728 * B, L - .0894841775 * A - 1.2914855480 * B
    l, m, s3 = l_ ** 3, m_ ** 3, s_ ** 3
    return (4.0767416621 * l - 3.3077115913 * m + .2309699292 * s3, -1.2684380046 * l + 2.6097574011 * m - .3413193965 * s3,
            -.0041960863 * l - .7034186147 * m + 1.7076147010 * s3)


def from_lch(L, C, H):
    L = min(1, max(0, L))
    while C > 0 and not all(-1e-4 <= v <= 1 + 1e-4 for v in _rgb(L, C, H)):
        C -= .005  # out of the screen's colours: less saturated until it fits
    return '#' + ''.join(f'{round(min(1, max(0, _gam(max(0, v)))) * 255):02x}' for v in _rgb(L, max(C, 0), H))


def shade(h, dl, dc=0):
    L, C, H = to_lch(h)
    return from_lch(L + dl, max(0, C + dc), H)


SKIN_COL = {k: dict(re.findall(r'--(bg|glow|acc|acc2):(#[0-9a-fA-F]{6})', body)) for k, body in
            re.findall(r'html\[data-skin=(\w+)\]\{([^}]*--acc:#[^}]*)\}', ''.join(SKINS))}


def ink(h):  # text on a coloured button: dark on light colours, light on dark ones
    return '#0b0d12' if to_lch(h)[0] > .62 else '#fff8ee'


def palette(sk, a, b):
    c = SKIN_COL[sk]
    La, Ca, Ha = to_lch(a)
    d = Ha - to_lch(c['acc'])[2]  # how far the theme turns the interface's main colour
    def turn(h, keep=0):
        L, C, H = to_lch(h)
        return from_lch(L, C, H + d) if not keep else from_lch(L, C * .5 + to_lch(a)[1] * .1, H + d)
    L2, C2, _ = to_lch(c['acc2'])
    det = from_lch(max(.55, L2), max(.09, min(C2, .2)), to_lch(c['acc2'])[2] + d)  # the interface's 2nd colour, in the theme's hue
    if abs(((to_lch(det)[2] - Ha + 180) % 360) - 180) < 25 and abs(to_lch(det)[0] - La) < .08:
        det = from_lch(La - .12, max(.08, Ca * .8), Ha + 40)  # too close to the main colour: a neighbouring hue instead
    comp = from_lch(min(.85, max(.62, La)), max(.1, min(Ca, .18)), Ha + 180)
    v = {'acc': a, 'acc2': b, 'acc3': det, 'comp': comp, 'accL': shade(a, .12, -.02), 'accD': shade(a, -.2), 'acc2L': shade(b, .1), 'acc2D': shade(b, -.18),
         'glow': turn(c['glow']), 'bg': from_lch(to_lch(c['bg'])[0], to_lch(c['bg'])[1] * .7 + .012, Ha), 'ink': ink(a), 'ink2': ink(b)}
    return ';'.join(f'--{k}:{x}' for k, x in v.items())
TINT += ''.join(f"html[data-tint][data-skin={sk}][data-theme={k}]{{{palette(sk, a, b)}}}\n" for sk in SKIN_COL for k, a, b in THEMES if k != 'hud')
TINT += f"""{T}{{--line:color-mix(in srgb,var(--acc) 34%,color-mix(in srgb,var(--acc3) 30%,transparent));--line2:color-mix(in srgb,var(--acc) 62%,color-mix(in srgb,var(--acc3) 70%,transparent));
  --card:color-mix(in srgb,var(--glow) 32%,var(--bg));--card2:color-mix(in srgb,var(--glow) 55%,var(--bg));--on:var(--ink);
  --pshadow:inset 0 0 0 3px var(--card),inset 0 0 0 4px var(--line),inset 0 0 30px #0006,inset 0 1px 18px color-mix(in srgb,var(--acc3) 14%,transparent)}}
{T} {P}{{background-image:linear-gradient(160deg,color-mix(in srgb,var(--acc) 7%,transparent),#0000 40%,color-mix(in srgb,var(--acc3) 6%,transparent))}}
{T} {P}::before{{background:linear-gradient(135deg,var(--accL),var(--acc) 28%,var(--acc3) 58%,var(--acc2) 82%,var(--accL));-webkit-mask:var(--deco);mask:var(--deco);-webkit-mask-repeat:var(--rep,no-repeat);mask-repeat:var(--rep,no-repeat)}}
html[data-tint][data-skin=arcade] {P}::before{{display:none}}
/* pirate rope frames keep their own rope colours with any theme */
html[data-tint][data-skin=pirate] {P}::before{{background:var(--deco);-webkit-mask:none;mask:none}}
html[data-tint][data-skin=arcade]{{--pshadow:inset 0 0 0 3px var(--acc),inset 0 0 0 6px var(--card),inset 0 0 0 7px var(--acc3)}}
{T} h1::after{{background:linear-gradient(90deg,var(--acc3),var(--acc) 30%,var(--accL) 50%,var(--acc) 70%,var(--acc3));-webkit-mask:var(--orn) 0 50%/100% 100% no-repeat;mask:var(--orn) 0 50%/100% 100% no-repeat}}
{T} .btn,{T} .btn.sm{{background:linear-gradient(180deg,var(--accL),var(--acc) 48%,var(--accD));color:var(--ink);box-shadow:inset 0 0 0 1px color-mix(in srgb,var(--acc3) 55%,#fff3),inset 0 -3px 0 #0005,0 2px 10px color-mix(in srgb,var(--acc) 25%,transparent)}}
{T} .btn.ghost{{background:linear-gradient(180deg,var(--card2),var(--card));color:var(--accL);box-shadow:inset 0 0 0 1px var(--line2)}}
{T} :is(.btn.gold,.btn.chestbtn){{background:linear-gradient(180deg,var(--acc2L),var(--acc2) 50%,var(--acc2D));color:var(--ink2);box-shadow:inset 0 0 0 1px color-mix(in srgb,var(--acc) 50%,transparent),inset 0 -3px 0 #0005}}
{T} :is(.seg a.on,.dpill.on,.chip.on){{background:linear-gradient(135deg,var(--accL),var(--acc) 55%,color-mix(in oklab,var(--acc) 55%,var(--acc3)));color:var(--ink);border-color:var(--acc3)}}
{T} .chip:not(.on){{border-color:color-mix(in srgb,var(--acc3) 35%,var(--line))}}
{T} .xpbar i{{background:linear-gradient(90deg,var(--acc3),var(--acc) 55%,var(--accL));box-shadow:0 0 8px color-mix(in srgb,var(--acc) 45%,transparent)}}
{T} :is(.qbar,.hp) i{{background:linear-gradient(90deg,var(--acc),var(--acc2))}}
{T} h2.sec::before{{background:var(--comp);color:var(--comp);box-shadow:0 0 6px color-mix(in srgb,var(--comp) 60%,transparent)}}
{T} h2.sec::after{{background:linear-gradient(90deg,var(--acc3),transparent)}}
{T} :is(.lv,.coins b,.odd){{color:var(--accL)}}
{T} .hud .av .lv{{background:linear-gradient(135deg,var(--acc2L),var(--acc2D));color:var(--ink2)}}
{T} .mut b,{T} .stat b{{color:var(--acc2L)}}
html[data-tint]:is([data-skin=egypt],[data-skin=pirate]) h2.sec::before{{width:10px;height:10px;transform:rotate(45deg)}}
html[data-tint][data-skin=chinese] body::after,html[data-tint][data-skin=japanese] body::after{{filter:none}}
"""


# ---------------------------------------------------------------- Today bubbles
# Today is a menu of circles (bubbles.js). Every interface dresses its circles with its own ring ornament (--bring),
# drawn in a 120x120 box around an orb of radius ~47.


def pol(r, a):
    a = math.radians(a - 90)
    return 60 + r * math.cos(a), 60 + r * math.sin(a)


def each(n, f, start=0):
    return ''.join(f(start + i * 360 / n) for i in range(n))


def rot(a, body):
    return f"<g transform='rotate({a:.1f} 60 60)'>{body}</g>"


def gear(teeth, ro, ri, hole, col):
    pts = []
    for i in range(teeth):
        a = i * 360 / teeth
        for da, r in ((-7, ri), (-4, ro), (4, ro), (7, ri)):
            x, y = pol(r, a + da * 16 / teeth)
            pts.append(f'{x:.1f},{y:.1f}')
    c = f"M{60 - hole} 60a{hole} {hole} 0 1 0 {2 * hole} 0a{hole} {hole} 0 1 0 -{2 * hole} 0z"
    return f"<path fill-rule='evenodd' fill='{col}' d='M{' L'.join(pts)}z {c}'/>"


def pixel_ring(r1, r2, cell, col):
    out = []
    for gx in range(0, 120, cell):
        for gy in range(0, 120, cell):
            d = math.hypot(gx + cell / 2 - 60, gy + cell / 2 - 60)
            if r1 <= d <= r2:
                out.append(f'M{gx} {gy}h{cell}v{cell}h-{cell}z')
    return f"<path shape-rendering='crispEdges' fill='{col}' d='{''.join(out)}'/>"


C = "cx='60' cy='60'"
RINGS = {
    'clean': svg(f"<circle {C} r='55' fill='none' stroke='#fff' stroke-width='2.5'/>", '0 0 120 120'),
    'hud': svg(f"<circle {C} r='50' fill='none' stroke='#fff' stroke-opacity='.5' stroke-width='1'/>"
               + each(60, lambda a: rot(a, "<path d='M60 2v5' stroke='#fff' stroke-width='1.4'/>"))
               + each(4, lambda a: rot(a, "<path d='M60 1v11' stroke='#fff' stroke-width='3'/>"))
               + f"<circle {C} r='55' fill='none' stroke='#fff' stroke-width='3' stroke-dasharray='40 132' stroke-linecap='square'/>", '0 0 120 120'),
    'chinese': svg(f"<g fill='none' stroke='{GOLD}' stroke-width='2'><circle {C} r='50'/><circle {C} r='56'/></g>"
                   + each(8, lambda a: rot(a, f"<path d='M60 46l5 7-5 7-5-7z' transform='translate(0 -44)' fill='{RED}' stroke='{GOLD}' stroke-width='1.2'/>"), 22.5)
                   + each(4, lambda a: rot(a, f"<circle cx='60' cy='4' r='4' fill='{GOLD}'/>")), '0 0 120 120'),
    'japanese': svg(f"<circle {C} r='53' fill='none' stroke='{VERM}' stroke-width='7' stroke-linecap='round' stroke-dasharray='300 33' transform='rotate(-70 60 60)'/>"
                    f"<circle {C} r='57.5' fill='none' stroke='{VERM}' stroke-width='2' stroke-linecap='round' stroke-dasharray='90 300' transform='rotate(30 60 60)'/>", '0 0 120 120'),
    'fairy': svg(f"<circle {C} r='53' fill='none' stroke='#5f9a43' stroke-width='3'/>"
                 + each(14, lambda a: rot(a, f"<ellipse cx='66' cy='7' rx='6' ry='2.6' transform='rotate(-30 66 7)' fill='{LEAF}'/>"))
                 + each(5, lambda a: rot(a, "<g transform='translate(60 7)'><circle r='3.4' fill='#ffb7d5'/><circle r='1.5' fill='#ffd86a'/></g>"), 18), '0 0 120 120'),
    'medieval': svg(f"<circle {C} r='53' fill='none' stroke='#5b5244' stroke-width='10'/>"
                    f"<circle {C} r='53' fill='none' stroke='#3a332a' stroke-width='10' stroke-dasharray='1.5 18.5'/>"
                    f"<g fill='none' stroke='{MG}' stroke-width='1.5'><circle {C} r='47.5'/><circle {C} r='58.5'/></g>"
                    + each(8, lambda a: rot(a, f"<circle cx='60' cy='7' r='2.6' fill='{MG}'/>"), 22.5), '0 0 120 120'),
    'steampunk': svg(gear(18, 59.5, 52, 47, CU) + f"<circle {C} r='49.5' fill='none' stroke='{BR}' stroke-width='1.5'/>"
                     + each(6, lambda a: rot(a, f"<circle cx='60' cy='9' r='1.8' fill='{BR}'/>")), '0 0 120 120'),
    'greek': svg(f"<circle {C} r='49' fill='none' stroke='{OG}' stroke-width='1.5'/>"
                 + ''.join(rot(a, f"<ellipse cx='60' cy='6' rx='2.6' ry='6' transform='rotate({t} 60 6)' fill='{OG}'/>")
                           for side in (1, -1) for k in range(9) for a, t in [(side * (24 + k * 16), side * 35)])
                 + f"<circle cx='60' cy='112' r='3.5' fill='{OG}'/><path d='M53 4l7 5 7-5' fill='none' stroke='{OG}' stroke-width='2'/>", '0 0 120 120'),
    'egypt': svg(f"<circle {C} r='53' fill='none' stroke='{TQ}' stroke-width='7' stroke-dasharray='6 3'/>"
                 f"<circle {C} r='53' fill='none' stroke='#2a4fb0' stroke-width='7' stroke-dasharray='3 15' stroke-dashoffset='-6'/>"
                 f"<g fill='none' stroke='{EG}' stroke-width='2.2'><circle {C} r='48.5'/><circle {C} r='57.5'/></g>"
                 + each(4, lambda a: rot(a, f"<path d='M60 0l4 6h-8z' fill='{EG}'/>")), '0 0 120 120'),
    'viking': svg(f"<g fill='none' stroke='{VB}'><circle {C} r='49' stroke-width='1.5'/><circle {C} r='57.5' stroke-width='1.5'/></g>"
                  + each(16, lambda a: rot(a, f"<path d='M57 5l3 4 3-4M60 9v5' fill='none' stroke='{VB}' stroke-width='1.6' stroke-linecap='round'/>"))
                  + each(16, lambda a: rot(a, f"<path d='M60 6v6' stroke='{FR}' stroke-opacity='.7' stroke-width='1'/>"), 11.25), '0 0 120 120'),
    'pirate': svg(f"<circle {C} r='53' fill='none' stroke='#8a6a38' stroke-width='9'/>"
                  + each(40, lambda a: rot(a, "<path d='M57 3.5l6 6' stroke='#5c4422' stroke-width='2.2' stroke-linecap='round'/><path d='M57.5 6l3 3' stroke='#e0b55a' stroke-opacity='.7' stroke-width='1'/>"))
                  + each(4, lambda a: rot(a, f"<path d='M60 0l3 6h-6z' fill='{PG}'/>"), 45), '0 0 120 120'),
    'outrun': svg(f"<circle {C} r='56' fill='none' stroke='{PK}' stroke-width='2.5'/><circle {C} r='50.5' fill='none' stroke='{CY}' stroke-width='1.5' stroke-dasharray='14 6'/>", '0 0 120 120'),
    'arcade': svg(pixel_ring(49, 58, 4, AC) + pixel_ring(53, 55, 4, AY), '0 0 120 120'),
    'mythical': svg(f"<circle {C} r='50' fill='none' stroke='{MV}' stroke-width='2'/><circle {C} r='57' fill='none' stroke='{ME}' stroke-width='1.2' stroke-dasharray='3 4'/>"
                    + each(8, lambda a: rot(a, f"<path d='M60 3l3 4-3 4-3-4z' fill='{MGD}'/>"))
                    + each(8, lambda a: rot(a, f"<path d='M60 46v-5M58 43h4' stroke='{MV}' stroke-width='1.3' transform='translate(0 -40)'/>"), 22.5), '0 0 120 120'),
    'classical': svg(f"<circle {C} r='50' fill='none' stroke='{CG}' stroke-width='1.4'/><circle {C} r='57' fill='none' stroke='{CG}' stroke-width='.8'/>"
                     + each(28, lambda a: rot(a, f"<circle cx='60' cy='6.5' r='2.3' fill='{IV}'/><circle cx='59.3' cy='5.8' r='.8' fill='#fff'/>")), '0 0 120 120'),
    'baroque': svg(f"<circle {C} r='53' fill='none' stroke='{BG_}' stroke-width='6'/><circle {C} r='53' fill='none' stroke='#fff3c4' stroke-opacity='.5' stroke-width='1'/>"
                   + each(12, lambda a: rot(a, f"<circle cx='60' cy='5' r='3.2' fill='{BG_}'/><circle cx='60' cy='5' r='1.2' fill='{VEL}'/>"))
                   + f"<circle {C} r='48' fill='none' stroke='{BG_}' stroke-width='1' stroke-dasharray='1 3'/>", '0 0 120 120'),
    'artdeco': svg(f"<circle {C} r='49' fill='none' stroke='{DG}' stroke-width='1.5'/>" + each(36, lambda a: rot(a, f"<path d='M60 2v{7 if round(a) % 30 == 0 else 4}' stroke='{DG}' stroke-width='1.6'/>"))
                   + f"<circle {C} r='52' fill='none' stroke='{DT}' stroke-width='1'/>", '0 0 120 120'),
    'gothic': svg(f"<circle {C} r='53' fill='none' stroke='{GB}' stroke-width='7' stroke-dasharray='10 4'/><circle {C} r='53' fill='none' stroke='{GR}' stroke-width='7' stroke-dasharray='4 24' stroke-dashoffset='-2'/>"
                  + f"<g fill='none' stroke='{GS}' stroke-width='1.4'><circle {C} r='48.5'/><circle {C} r='57.5'/></g>", '0 0 120 120'),
    'cosmic': svg(f"<circle {C} r='55' fill='none' stroke='{CC}' stroke-width='2' stroke-dasharray='60 12 20 12'/><circle {C} r='50' fill='none' stroke='{CV}' stroke-width='1.5' stroke-dasharray='2 5'/>"
                  + f"<circle cx='112' cy='38' r='4' fill='{CC}'/><circle cx='10' cy='80' r='3' fill='{CV}'/><circle cx='30' cy='14' r='1.6' fill='#fff'/><circle cx='100' cy='108' r='1.4' fill='#fff'/>", '0 0 120 120'),
}
BUB = '\n/* ==========================================================================\n   Today bubbles: each interface dresses the circles with its own ring\n   ========================================================================== */\n'
BUB += ''.join(f"html[data-skin={k}]{{--bring:{v}}}\n" for k, v in RINGS.items())
BUB += """@keyframes bsway{from{rotate:-7deg}to{rotate:7deg}}
@keyframes bglow{0%,100%{filter:drop-shadow(0 0 0 var(--gc,var(--acc)))}50%{filter:drop-shadow(0 0 7px var(--gc,var(--acc)))}}
@keyframes bflick{0%,100%{filter:brightness(1) drop-shadow(0 0 3px var(--gc))}30%{filter:brightness(1.25) drop-shadow(0 0 8px var(--gc))}55%{filter:brightness(.95) drop-shadow(0 0 4px var(--gc))}80%{filter:brightness(1.15) drop-shadow(0 0 7px var(--gc))}}
@keyframes bneon{0%,100%{opacity:1}92%{opacity:1}94%{opacity:.45}96%{opacity:1}97%{opacity:.6}}
html[data-skin=hud] :is(.orb,.bxi)::before{background:conic-gradient(from 0deg,var(--acc),var(--acc2),var(--acc));-webkit-mask:var(--bring) center/100% 100% no-repeat;mask:var(--bring) center/100% 100% no-repeat;animation:bspin 40s linear infinite,bglow 3s ease-in-out infinite}
html[data-skin=clean] :is(.orb,.bxi)::before{background:var(--line2);-webkit-mask:var(--bring) center/100% 100% no-repeat;mask:var(--bring) center/100% 100% no-repeat;animation:none}
html[data-skin=chinese] :is(.orb,.bxi)::before{--gc:#ffcf5a;animation:bspin 60s linear infinite,bglow 3.5s ease-in-out infinite}
html[data-skin=japanese] :is(.orb,.bxi)::before{--gc:#ff6a4f;animation:bspin 40s linear infinite,bglow 4s ease-in-out infinite}
html[data-skin=fairy] :is(.orb,.bxi)::before{--gc:#ffe27a;animation:bsway 4.5s ease-in-out infinite alternate,bglow 2.6s ease-in-out infinite}
html[data-skin=medieval] :is(.orb,.bxi)::before{--gc:#ff9a3c;animation:bflick 2.4s ease-in-out infinite}
html[data-skin=steampunk] :is(.orb,.bxi)::before{--gc:#ffb45a;animation:bspin 24s linear infinite,bglow 3s ease-in-out infinite}
html[data-skin=steampunk] .bub:nth-child(odd) .orb::before{animation-direction:reverse,normal}
html[data-skin=greek] :is(.orb,.bxi)::before{--gc:#fff0b0;animation:bsway 6s ease-in-out infinite alternate,bglow 3s ease-in-out infinite}
html[data-skin=egypt] :is(.orb,.bxi)::before{--gc:#ffd86a;animation:bspin 50s linear infinite,bglow 3s ease-in-out infinite}
html[data-skin=viking] :is(.orb,.bxi)::before{--gc:#8fd3ff;animation:bspin 70s linear infinite reverse,bflick 3s ease-in-out infinite}
html[data-skin=pirate] :is(.orb,.bxi)::before{--gc:#e0b55a;animation:bsway 3.2s ease-in-out infinite alternate}
html[data-skin=outrun] :is(.orb,.bxi)::before{animation:bspin 18s linear infinite,bneon 4s linear infinite}
html[data-skin=arcade] :is(.orb,.bxi)::before{animation:bspin 8s steps(12) infinite}
html[data-skin=mythical] :is(.orb,.bxi)::before{--gc:#3ddc97;animation:bspin 45s linear infinite reverse,bglow 2.4s ease-in-out infinite}
html[data-skin=classical] :is(.orb,.bxi)::before{--gc:#f6dfa0;animation:bspin 90s linear infinite,bglow 3.6s ease-in-out infinite}
html[data-skin=baroque] :is(.orb,.bxi)::before{--gc:#ffcf7a;animation:bspin 80s linear infinite,bflick 2.8s ease-in-out infinite}
html[data-skin=artdeco] :is(.orb,.bxi)::before{--gc:#e6c36a;animation:bspin 30s steps(36) infinite,bglow 3s ease-in-out infinite}
html[data-skin=gothic] :is(.orb,.bxi)::before{--gc:#7aa2ff;animation:bspin 70s linear infinite,bflick 3.4s ease-in-out infinite}
html[data-skin=cosmic] :is(.orb,.bxi)::before{--gc:#22d3ee;animation:bspin 14s linear infinite,bglow 2.6s ease-in-out infinite}
html[data-skin] .bub:nth-child(3n) .orb::before{animation-delay:-1.3s}html[data-skin] .bub:nth-child(3n+1) .orb::before{animation-delay:-2.1s}
"""
BUB += """html[data-skin=outrun] :is(.orb,.bxi)::before{filter:drop-shadow(0 0 4px #ff3cc7) drop-shadow(0 0 8px #00f0ff88)}
html[data-skin=outrun] .orb{background:radial-gradient(circle at 50% 120%,#ff6a3d88,#0000 60%),linear-gradient(#2a0650,#12002a)}
html[data-skin=fairy] .orb{background:radial-gradient(circle at 35% 30%,#2f5a2f,#0b2016)}
html[data-skin=medieval] .orb{background:radial-gradient(circle at 35% 30%,#4a3f30,#1b160f)}
html[data-skin=pirate] .orb{background:radial-gradient(circle at 35% 30%,#4a3a24,#1e160d)}
html[data-skin=arcade] .orb{box-shadow:inset 0 0 0 3px #0d0a24,inset 0 0 0 5px #00e4ff88}
html[data-skin=arcade] :is(.ov,.bl){font-size:10px}html[data-skin=arcade] .bub.big .on2{font-size:9px}
html[data-skin=arcade] .bx{clip-path:none!important;opacity:0;transform:scale(.4);transition:opacity .3s steps(4),transform .3s steps(4)}
html[data-skin=arcade] .bx.open{opacity:1;transform:none}
"""
BUB += f"""{T} .orb::before{{background:conic-gradient(from 200deg,var(--accL),var(--acc),var(--acc3),var(--acc2),color-mix(in oklab,var(--comp) 35%,var(--acc2)),var(--accL));-webkit-mask:var(--bring) center/100% 100% no-repeat;mask:var(--bring) center/100% 100% no-repeat}}
html[data-tint][data-skin=pirate] .orb::before{{background:var(--bring) center/100% 100% no-repeat;-webkit-mask:none;mask:none}}
html[data-tint][data-skin] .orb{{background:radial-gradient(circle at 35% 30%,color-mix(in srgb,var(--glow) 80%,var(--acc) 10%),var(--card) 70%),var(--bg)}}
"""


# ---------------------------------------------------------------- friends podium
# Each interface builds the podium from its own materials: [first, second, third step colours, number colour,
# the emblem over the winner, extra CSS for the steps].
PODIUM = {
    'clean': ('#6c8cff', '#9aa1b2', '#7d8597', '#ffffff', '"🏆"', 'border-radius:12px 12px 0 0;box-shadow:none'),
    'hud': ('#22e4ff', '#7aa7c7', '#3d6a8a', '#021016', '"⬢"', 'border-radius:0;clip-path:polygon(10px 0,calc(100% - 10px) 0,100% 10px,100% 100%,0 100%,0 10px);box-shadow:0 0 18px color-mix(in srgb,var(--pod) 55%,transparent),inset 0 0 0 1px #ffffff55'),
    'chinese': ('#c4231b', '#8f1a14', '#6e140f', '#f3cf6e', '"🏮"', 'border:2px solid #d9ad45;border-bottom:0;border-radius:4px 4px 0 0;box-shadow:inset 0 0 0 3px #00000033,inset 0 0 0 4px #d9ad4588'),
    'japanese': ('#e5432f', '#c23a28', '#9e2f20', '#fff6e6', '"⛩️"', 'border-radius:0;border:0;box-shadow:inset 0 6px 0 #1b1b1b,inset 0 10px 0 #e5432f'),
    'fairy': ('#8a5a33', '#74492a', '#5e3b22', '#ffe9b0', '"🍄"', 'border-radius:40% 40% 6px 6px/22px 22px 6px 6px;border:0;box-shadow:inset 0 8px 0 #5f9a43,inset 0 -6px 12px #0006'),
    'medieval': ('#7d7465', '#6a6255', '#575046', '#e8d9a8', '"🏰"', 'border-radius:0;border:0;clip-path:polygon(0 8px,14% 8px,14% 0,30% 0,30% 8px,44% 8px,44% 0,56% 0,56% 8px,70% 8px,70% 0,86% 0,86% 8px,100% 8px,100% 100%,0 100%);background-image:linear-gradient(#0002 1px,#0000 1px),linear-gradient(90deg,#0002 1px,#0000 1px);background-size:100% 14px,28px 100%'),
    'steampunk': ('#b87333', '#9c5f2a', '#7d4b22', '#2a1a0a', '"⚙️"', 'border-radius:6px 6px 0 0;border:2px solid #d6a25c;border-bottom:0;background-image:radial-gradient(circle,#d6a25c 0 2px,#0000 2.5px);background-size:14px 14px;background-position:3px 3px'),
    'greek': ('#f2ede2', '#ddd6c6', '#c9c0ac', '#3a2f1c', '"🏛️"', 'border-radius:0;border:0;background-image:repeating-linear-gradient(90deg,#0000 0 8px,#0000001a 8px 10px);box-shadow:inset 0 6px 0 #c9b98d'),
    'egypt': ('#d9b45a', '#c4a050', '#a88745', '#2a1b05', '"🏺"', 'border-radius:0;border:0;clip-path:polygon(12% 0,88% 0,100% 100%,0 100%);background-image:linear-gradient(#0000 0 70%,#2bb3a3 70% 78%,#0000 78%)'),
    'viking': ('#6b4a2b', '#5a3e24', '#4a331e', '#e9d7a5', '"🛡️"', 'border-radius:3px 3px 0 0;border:0;background-image:repeating-linear-gradient(0deg,#0000 0 12px,#0003 12px 14px);box-shadow:inset 0 0 0 2px #8b9aa6'),
    'pirate': ('#7a5530', '#664627', '#523920', '#ffd36a', '"🏴‍☠️"', 'border-radius:14px 14px 0 0;border:0;background-image:linear-gradient(90deg,#0000 0 12%,#2a1d10 12% 16%,#0000 16% 84%,#2a1d10 84% 88%,#0000 88%);box-shadow:inset 0 5px 0 #c8a15a'),
    'outrun': ('#ff3cc7', '#9b4dff', '#00c8ff', '#120024', '"🌴"', 'border-radius:4px 4px 0 0;border:0;background-image:linear-gradient(#0000 60%,#0003 60%),repeating-linear-gradient(90deg,#fff3 0 1px,#0000 1px 16px);box-shadow:0 0 18px color-mix(in srgb,var(--pod) 70%,transparent)'),
    'arcade': ('#ffe14a', '#4ad6ff', '#ff5ca8', '#0d0a24', '"👾"', 'border-radius:0;border:0;box-shadow:inset 0 0 0 3px #0d0a24,inset 0 0 0 5px #ffffff88;image-rendering:pixelated'),
    'classical': ('#f3ecdc', '#d9cfb9', '#bfb39b', '#14110a', '"🥂"', 'border-radius:0;border:0;box-shadow:inset 0 0 0 1px #d9b871,inset 0 0 0 4px #f3ecdc,inset 0 0 0 5px #d9b87188'),
    'artdeco': ('#1a1a1a', '#151515', '#101010', '#e6c36a', '"🎷"', 'border-radius:0;border:2px solid #e6c36a;border-bottom:0;background-image:repeating-conic-gradient(from -90deg at 50% 100%,#e6c36a22 0 6deg,#0000 6deg 12deg)'),
    'gothic': ('#4a4f63', '#3d4153', '#303444', '#cfd8ff', '"🕯️"', 'border-radius:50% 50% 0 0/26px 26px 0 0;border:0;background-image:linear-gradient(90deg,#0000 0 46%,#7aa2ff55 46% 54%,#0000 54%)'),
    'baroque': ('#8e1b2e', '#741626', '#5c111e', '#f3cf6e', '"👑"', 'border-radius:16px 16px 0 0;border:2px solid #e0b44c;border-bottom:0;box-shadow:inset 0 0 0 3px #00000033,inset 0 0 0 5px #e0b44c66'),
    'mythical': ('#7c4dff', '#5a2fd6', '#3ddc97', '#ffffff', '"🐉"', 'border-radius:8px 8px 0 0;border:0;clip-path:polygon(50% 0,100% 18%,100% 100%,0 100%,0 18%);box-shadow:0 0 22px color-mix(in srgb,var(--pod) 70%,transparent),inset 0 0 18px #ffffff33'),
    'cosmic': ('#9b7bff', '#5f6bd6', '#22d3ee', '#05031a', '"🪐"', 'border-radius:50% 50% 0 0/14px 14px 0 0;border:0;background-image:radial-gradient(circle,#fff 0 1px,#0000 1.5px);background-size:13px 17px;box-shadow:0 0 18px color-mix(in srgb,var(--pod) 60%,transparent)'),
}
POD = "\n/* friends podium, dressed by each interface */\n" + "".join(
    f"html[data-skin={k}]{{--pod1:{a};--pod2:{b};--pod3:{c};--podink:{ink};--podorn:{orn}}}\nhtml[data-skin={k}] .pod .blk{{{extra}}}\n"
    for k, (a, b, c, ink, orn, extra) in PODIUM.items())


# ---------------------------------------------------------------- prestige crests
# Level-only prestige rings wear a small emblem on top, like game profile borders, drawn by each interface
# (art in crest_art.py: build_min, one emblem each; build keeps the fuller ornaments). Two masks per interface: the
# metal, a fine outline coloured by the ring's metal, and small gems in the ring's gem colour.
sys.path.insert(0, str(Path(__file__).resolve().parent))
from crest_art import build_min as crest_build  # noqa: E402


def crest_metal(shapes, cuts):
    """minimal line art: only a fine outline of each piece (the engraving cuts are left out)"""
    for w in ("3", "4", "4.5"):
        shapes = shapes.replace(f"fill='none' stroke='#fff' stroke-width='{w}'", "fill='none' stroke='#fff' stroke-width='1.4'")
    return f"<g fill='none' stroke='#fff' stroke-width='1.3' stroke-linejoin='round'>{shapes}</g>"


PREST = "\n/* prestige crests: each interface's ornament for level-only rings (metal and gems) */\n" + ''.join(
    f"html[data-skin={k}]{{--pcrest:{svg(crest_metal(sh, cu), '0 0 120 120')};--pgem:{svg(chr(60) + 'g fill=' + chr(39) + '#fff' + chr(39) + '>' + gm + '</g>', '0 0 120 120')}}}\n"
    for k, (sh, cu, gm) in crest_build().items())

OUT.write_text((HERE / 'skins_base.css').read_text() + ANIM + ''.join(SKINS) + TINT + BUB + PREVIEW + PREST + POD)
print('wrote', OUT, OUT.stat().st_size, 'bytes,', len(SKINS), 'skins')
