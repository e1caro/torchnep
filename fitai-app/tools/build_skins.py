#!/usr/bin/env python3
"""Builds ../skins.css: the interface skins sold in Rewards > Shop > Interfaces.

Each skin is a whole look (palette, fonts, background, panel frames, buttons, bars, title ornaments
and ambient animation). Ornaments are small hand-written SVGs embedded as data URIs, so the app
ships no image files for them. Run:  python3 tools/build_skins.py
"""
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
fairy_orn = svg(f"<path d='M2 12C60 2 180 22 238 10' stroke='#6cbf55' stroke-width='2' fill='none'/>"
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
html[data-skin]:not([data-skin=hud]) h1::after{content:"";display:block;height:var(--orn-h,0);max-width:260px;margin-top:8px;background:var(--orn,none) 0 50%/100% 100% no-repeat}
html[data-skin]:not([data-skin=hud]) .vic h1::after,html[data-skin]:not([data-skin=hud]) .top h1::after{margin-left:auto;margin-right:auto}
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
.emo{font-style:normal;line-height:1}
/* one-minute interface preview bar */
#trybar{position:fixed;left:12px;right:12px;bottom:calc(86px + env(safe-area-inset-bottom));z-index:25;display:flex;align-items:center;justify-content:space-between;gap:10px;
  padding:8px 8px 8px 14px;background:color-mix(in srgb,var(--acc) 12%,var(--bg));border:1px solid var(--acc);border-radius:var(--r,0);box-shadow:0 6px 24px #000a,0 0 18px color-mix(in srgb,var(--acc) 30%,transparent);font-weight:700;font-size:14px;max-width:576px;margin:0 auto}
#trybar span{font-variant-numeric:tabular-nums}
body.focus #trybar{bottom:calc(16px + env(safe-area-inset-bottom))}
"""

OUT.write_text((HERE / 'skins_base.css').read_text() + ANIM + ''.join(SKINS) + PREVIEW)
print('wrote', OUT, OUT.stat().st_size, 'bytes,', len(SKINS), 'skins')
